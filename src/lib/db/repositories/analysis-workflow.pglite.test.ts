import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { afterEach, describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';
import { PostgresAnalysisWorkflowRepository, type PurchaseWrite } from './analysis-workflow';

const clients: PGlite[] = [];

async function repository() {
  const client = new PGlite();
  clients.push(client);
  await client.exec(`
    create table analyses (
      id text primary key, user_id text not null, card_catalog_item_id text,
      formula_version_id text not null, cutoff timestamptz not null,
      current_price_minor bigint not null, currency text not null,
      input_snapshot jsonb not null, result jsonb not null, is_demo boolean not null default false,
      created_at timestamptz not null
    );
    create table prediction_snapshots (
      id text primary key, user_id text not null, analysis_id text not null,
      formula_version_id text not null, prediction_cutoff timestamptz not null,
      evidence_ids jsonb not null, input jsonb not null, result jsonb not null,
      is_demo boolean not null default false, created_at timestamptz not null
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
      notes text, reverses_transaction_id text, is_demo boolean not null default false
    );
    create unique index transactions_user_idempotency_idx on transactions (user_id, idempotency_key);
    create unique index transactions_reversal_once_idx on transactions (reverses_transaction_id);
  `);
  const database = drizzle(client, { schema });
  return new PostgresAnalysisWorkflowRepository(database as unknown as NeonHttpDatabase<typeof schema>);
}

async function seed(client: PGlite, suffix: string) {
  const now = '2026-08-12T12:00:00.000Z';
  await client.query(
    `insert into analyses values ($1, 'owner', $2, 'formula', $3, 10000, 'USD', $4, $5, false, $3)`,
    [`analysis:${suffix}`, `card:${suffix}`, now, JSON.stringify({ card: { playerName: `Player ${suffix}`, year: 2026 } }), JSON.stringify({ scenario: { maximumPurchasePriceForTargetRoi: { minor: '12000' } } })],
  );
  await client.query(
    `insert into prediction_snapshots values ($1, 'owner', $2, 'formula', $3, '[]', '{}', '{}', false, $3)`,
    [`snapshot:${suffix}`, `analysis:${suffix}`, now],
  );
  await client.query(
    `insert into user_decisions values ($1, 'owner', $2, 'UNDECIDED', null, null, null, $3, false)`,
    [`decision:${suffix}`, `snapshot:${suffix}`, now],
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
});
