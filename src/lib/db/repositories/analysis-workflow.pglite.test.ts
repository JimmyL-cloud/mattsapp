import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { afterEach, describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';
import { PostgresAnalysisWorkflowRepository, type AnalysisWrite, type PurchaseWrite, type ReversalWrite } from './analysis-workflow';

const clients: PGlite[] = [];

async function repository() {
  const client = new PGlite();
  clients.push(client);
  await client.exec(`
    create table formula_versions (
      id text primary key, name text not null, definition jsonb not null,
      created_at timestamptz not null default now()
    );
    create table card_catalog_items (
      id text primary key, sport text not null default 'football', player_id text, team_shown_id text,
      year integer, manufacturer text, brand text, set_name text, subset text, card_number text,
      parallel text, serial_denominator integer, rookie boolean not null default false,
      autograph boolean not null default false, memorabilia boolean not null default false,
      identity jsonb not null, created_at timestamptz not null default now(), deleted_at timestamptz
    );
    create table analyses (
      id text primary key, user_id text not null, card_catalog_item_id text,
      formula_version_id text not null, cutoff timestamptz not null,
      current_price_minor bigint not null, currency text not null,
      input_snapshot jsonb not null, result jsonb not null, idempotency_key text, request_hash text, is_demo boolean not null default false,
      created_at timestamptz not null
    );
    create unique index analyses_user_idempotency_idx on analyses (user_id, idempotency_key);
    create table prediction_snapshots (
      id text primary key, user_id text not null, analysis_id text not null,
      formula_version_id text not null, prediction_cutoff timestamptz not null,
      evidence_ids jsonb not null, input jsonb not null, result jsonb not null,
      is_demo boolean not null default false, created_at timestamptz not null
    );
    create table analysis_evidence (
      id text primary key, analysis_id text not null, source_kind text not null,
      evidence_snapshot jsonb not null, included boolean not null,
      created_at timestamptz not null default now()
    );
    create table user_decisions (
      id text primary key, user_id text not null, prediction_snapshot_id text not null,
      purchase_status text not null, intended_maximum_minor bigint, currency text,
      reason text, decided_at timestamptz not null, is_demo boolean not null default false
    );
    create table portfolio_holdings (
      id text primary key, user_id text not null, card_catalog_item_id text not null,
      prediction_snapshot_id text, acquired_at timestamptz not null,
      cost_basis_minor bigint not null, currency text not null, quantity integer not null default 1,
      is_demo boolean not null default false, closed_at timestamptz
    );
    create table transactions (
      id text primary key, user_id text not null, holding_id text, decision_id text,
      transaction_type text not null, amount_minor bigint not null, currency text not null,
      occurred_at timestamptz not null, source text not null, idempotency_key text,
      notes text, reverses_transaction_id text, is_demo boolean not null default false,
      check (transaction_type <> 'REVERSAL' or source <> 'reject-me')
    );
    create unique index transactions_user_idempotency_idx on transactions (user_id, idempotency_key);
    create unique index transactions_reversal_once_idx on transactions (reverses_transaction_id);
  `);
  const database = drizzle(client, { schema });
  Object.assign(database, {
    batch: async (queries: readonly PromiseLike<unknown>[]) => {
      const results: unknown[] = [];
      for (const query of queries) results.push(await query);
      return results;
    },
  });
  return new PostgresAnalysisWorkflowRepository(database as unknown as NeonHttpDatabase<typeof schema>);
}

async function seed(client: PGlite, suffix: string, options: { userId?: string; currency?: string; isDemo?: boolean } = {}) {
  const now = '2026-08-12T12:00:00.000Z';
  const userId = options.userId ?? 'owner';
  const currency = options.currency ?? 'USD';
  const isDemo = options.isDemo ?? false;
  await client.query(
    `insert into analyses (id, user_id, card_catalog_item_id, formula_version_id, cutoff, current_price_minor, currency, input_snapshot, result, is_demo, created_at) values ($1, $2, $3, 'formula', $4, 10000, $5, $6, $7, $8, $4)`,
    [`analysis:${suffix}`, userId, `card:${suffix}`, now, currency, JSON.stringify({ card: { playerName: `Player ${suffix}`, year: 2026 } }), JSON.stringify({ scenario: { maximumPurchasePriceForTargetRoi: { minor: '12000' } } }), isDemo],
  );
  await client.query(
    `insert into prediction_snapshots values ($1, $2, $3, 'formula', $4, '[]', '{}', '{}', $5, $4)`,
    [`snapshot:${suffix}`, userId, `analysis:${suffix}`, now, isDemo],
  );
  await client.query(
    `insert into user_decisions values ($1, $2, $3, 'UNDECIDED', null, null, null, $4, $5)`,
    [`decision:${suffix}`, userId, `snapshot:${suffix}`, now, isDemo],
  );
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

describe('PostgresAnalysisWorkflowRepository purchase persistence', () => {
  it('persists one purchase across sequential exact retries and loads the real holding', async () => {
    const repo = await repository();
    const client = clients.at(-1)!;
    await seed(client, 'sequential');
    const purchase: PurchaseWrite = {
      analysisId: 'analysis:sequential', idempotencyKey: 'stable-sequential-key',
      amountMinor: 9_500n, currency: 'USD', source: 'owner-entry', occurredAt: '2026-08-12T12:05:00.000Z',
    };

    expect((await repo.recordPurchase('owner', purchase))?.replayed).toBe(false);
    expect((await repo.recordPurchase('owner', purchase))?.replayed).toBe(true);
    expect((await client.query<{ count: number }>('select count(*)::int as count from transactions')).rows[0]?.count).toBe(1);
    expect((await client.query<{ count: number }>('select count(*)::int as count from portfolio_holdings')).rows[0]?.count).toBe(1);
    const portfolio = await repo.loadPortfolio('owner');
    expect(portfolio.holdings).toHaveLength(1);
    expect(portfolio.summaries).toEqual([{ holdingCount: 1, costBasisMinor: 9_500n, currentValueMinor: null, unrealizedProfitMinor: null, currency: 'USD' }]);
  });

  it('collapses concurrent exact retries into one transaction and one holding', async () => {
    const repo = await repository();
    const client = clients.at(-1)!;
    await seed(client, 'concurrent');
    const purchase: PurchaseWrite = {
      analysisId: 'analysis:concurrent', idempotencyKey: 'stable-concurrent-key',
      amountMinor: 9_750n, currency: 'USD', source: 'owner-entry', occurredAt: '2026-08-12T12:10:00.000Z',
    };

    const results = await Promise.all([repo.recordPurchase('owner', purchase), repo.recordPurchase('owner', purchase)]);
    expect(results.map((result) => result?.replayed).sort()).toEqual([false, true]);
    expect((await client.query<{ count: number }>('select count(*)::int as count from transactions')).rows[0]?.count).toBe(1);
    expect((await client.query<{ count: number }>('select count(*)::int as count from portfolio_holdings')).rows[0]?.count).toBe(1);
  });

  it('atomically reverses a purchase, exactly replays retries, and blocks generic transitions', async () => {
    const repo = await repository();
    const client = clients.at(-1)!;
    await seed(client, 'reversal');
    await repo.recordPurchase('owner', {
      analysisId: 'analysis:reversal', idempotencyKey: 'stable-purchase-reversal',
      amountMinor: 9_250n, currency: 'USD', source: 'owner-entry', occurredAt: '2026-08-12T12:05:00.000Z',
    });
    await expect(repo.updateDecision('owner', 'analysis:reversal', 'CANCELLED', 'Bypass reversal'))
      .rejects.toThrow('requires a reversal transaction');

    await expect(repo.reversePurchase('owner', {
      analysisId: 'analysis:reversal', idempotencyKey: 'backdated-reversal-key',
      reason: 'Invalid chronology', source: 'seller-refund', occurredAt: '2026-08-12T12:04:00.000Z',
    })).rejects.toThrow('cannot precede purchase date');
    expect((await client.query<{ purchase_status: string }>('select purchase_status from user_decisions')).rows[0]?.purchase_status).toBe('PURCHASED');
    expect((await client.query<{ closed: boolean }>('select closed_at is not null as closed from portfolio_holdings')).rows[0]?.closed).toBe(false);
    expect((await client.query<{ count: number }>('select count(*)::int as count from transactions')).rows[0]?.count).toBe(1);

    const reversal: ReversalWrite = {
      analysisId: 'analysis:reversal', idempotencyKey: 'stable-reversal-key',
      reason: 'Seller refunded purchase', source: 'seller-refund', occurredAt: '2026-08-12T13:00:00.000Z',
    };
    const results = await Promise.all([repo.reversePurchase('owner', reversal), repo.reversePurchase('owner', reversal)]);
    expect(results.map((result) => result?.replayed).sort()).toEqual([false, true]);
    await expect(repo.reversePurchase('owner', { ...reversal, reason: 'Different reason' }))
      .rejects.toThrow('different reversal');

    const transactionRows = (await client.query<{ transaction_type: string; amount_minor: string; reverses_transaction_id: string | null }>(
      'select transaction_type, amount_minor::text, reverses_transaction_id from transactions order by transaction_type',
    )).rows;
    expect(transactionRows).toEqual([
      { transaction_type: 'PURCHASE', amount_minor: '9250', reverses_transaction_id: null },
      { transaction_type: 'REVERSAL', amount_minor: '-9250', reverses_transaction_id: expect.stringMatching(/^purchase:/) },
    ]);
    expect((await client.query<{ purchase_status: string }>('select purchase_status from user_decisions')).rows[0]?.purchase_status).toBe('CANCELLED');
    expect((await client.query<{ closed: boolean }>('select closed_at is not null as closed from portfolio_holdings')).rows[0]?.closed).toBe(true);
    expect((await repo.loadPortfolio('owner')).holdings).toHaveLength(0);
  });

  it('rolls back decision and holding changes when reversal transaction persistence fails', async () => {
    const repo = await repository();
    const client = clients.at(-1)!;
    await seed(client, 'rollback');
    await repo.recordPurchase('owner', {
      analysisId: 'analysis:rollback', idempotencyKey: 'stable-purchase-rollback',
      amountMinor: 9_000n, currency: 'USD', source: 'owner-entry', occurredAt: '2026-08-12T12:05:00.000Z',
    });

    await expect(repo.reversePurchase('owner', {
      analysisId: 'analysis:rollback', idempotencyKey: 'stable-reversal-rollback',
      reason: 'Exercise rollback', source: 'reject-me', occurredAt: '2026-08-12T13:00:00.000Z',
    })).rejects.toThrow();
    expect((await client.query<{ purchase_status: string }>('select purchase_status from user_decisions')).rows[0]?.purchase_status).toBe('PURCHASED');
    expect((await client.query<{ closed: boolean }>('select closed_at is not null as closed from portfolio_holdings')).rows[0]?.closed).toBe(false);
    expect((await client.query<{ count: number }>('select count(*)::int as count from transactions')).rows[0]?.count).toBe(1);
  });

  it('persists immutable provenance for manual, structured CSV, and reviewed-title evidence', async () => {
    const repo = await repository();
    const client = clients.at(-1)!;
    const write: AnalysisWrite = {
      id: 'analysis:provenance', snapshotId: 'snapshot:provenance', decisionId: 'decision:provenance',
      userId: 'owner', cardId: 'card:provenance', cutoff: '2026-08-12T12:00:00.000Z',
      formulaVersion: 'formula', currentPriceMinor: 10_000n, currency: 'USD',
      input: { card: { sport: 'football', playerName: 'Provenance Player' } }, result: { persisted: true },
      evidence: [
        { id: 'evidence:manual', sourceKind: 'MANUAL', identitySource: 'STRUCTURED_MANUAL', reviewAttestation: null, included: true, snapshot: { record: 'manual' } },
        { id: 'evidence:csv', sourceKind: 'CSV', identitySource: 'STRUCTURED_CSV', reviewAttestation: null, included: true, snapshot: { record: 'csv' } },
        { id: 'evidence:reviewed', sourceKind: 'CSV', identitySource: 'OWNER_REVIEWED_TITLE', reviewAttestation: { reviewerUserId: 'owner', reviewedAt: '2026-08-12T12:00:00.000Z' }, included: false, snapshot: { record: 'reviewed' } },
      ],
    };
    await repo.createAnalysis(write);

    const rows = (await client.query<{ id: string; source_kind: string; evidence_snapshot: { provenance: unknown } }>(
      'select id, source_kind, evidence_snapshot from analysis_evidence order by id',
    )).rows;
    expect(rows).toEqual([
      expect.objectContaining({ id: 'evidence:csv', source_kind: 'CSV', evidence_snapshot: expect.objectContaining({ provenance: { origin: 'CSV', identitySource: 'STRUCTURED_CSV', reviewAttestation: null } }) }),
      expect.objectContaining({ id: 'evidence:manual', source_kind: 'MANUAL', evidence_snapshot: expect.objectContaining({ provenance: { origin: 'MANUAL', identitySource: 'STRUCTURED_MANUAL', reviewAttestation: null } }) }),
      expect.objectContaining({ id: 'evidence:reviewed', source_kind: 'CSV', evidence_snapshot: expect.objectContaining({ provenance: { origin: 'CSV', identitySource: 'OWNER_REVIEWED_TITLE', reviewAttestation: { reviewerUserId: 'owner', reviewedAt: '2026-08-12T12:00:00.000Z' } } }) }),
    ]);
  });

  it('loads only real open owner holdings, grouped by currency, and rejects ledger mismatches', async () => {
    const repo = await repository();
    const client = clients.at(-1)!;
    await seed(client, 'usd');
    await seed(client, 'cad', { currency: 'CAD' });
    await seed(client, 'other', { userId: 'other-owner' });
    await seed(client, 'demo', { isDemo: true });
    await repo.recordPurchase('owner', { analysisId: 'analysis:usd', idempotencyKey: 'portfolio-owner-usd', amountMinor: 10_000n, currency: 'USD', source: 'receipt', occurredAt: '2026-08-12T12:05:00.000Z' });
    await repo.recordPurchase('owner', { analysisId: 'analysis:cad', idempotencyKey: 'portfolio-owner-cad', amountMinor: 20_000n, currency: 'CAD', source: 'receipt', occurredAt: '2026-08-12T12:06:00.000Z' });
    await repo.recordPurchase('other-owner', { analysisId: 'analysis:other', idempotencyKey: 'portfolio-other-usd', amountMinor: 30_000n, currency: 'USD', source: 'receipt', occurredAt: '2026-08-12T12:07:00.000Z' });
    await client.query("insert into portfolio_holdings values ('holding:demo', 'owner', 'card:demo', 'snapshot:demo', '2026-08-12T12:08:00Z', 40000, 'USD', 1, true, null)");

    const portfolio = await repo.loadPortfolio('owner');
    expect(portfolio.holdings.map((holding) => holding.id).sort()).toEqual(['holding:analysis:cad', 'holding:analysis:usd']);
    expect(portfolio.summaries).toEqual([
      expect.objectContaining({ currency: 'CAD', costBasisMinor: 20_000n, holdingCount: 1 }),
      expect.objectContaining({ currency: 'USD', costBasisMinor: 10_000n, holdingCount: 1 }),
    ]);

    await client.query("update portfolio_holdings set cost_basis_minor = 99999 where id = 'holding:analysis:usd'");
    await expect(repo.loadPortfolio('owner')).rejects.toThrow('does not match its purchase transaction');
  });
});
