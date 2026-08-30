import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PgQueryResultHKT } from 'drizzle-orm/pg-core/session';
import { afterEach, describe, expect, it } from 'vitest';
import type { OutcomeEvaluation } from '@/features/performance/evaluate-outcome';
import * as schema from '@/lib/db/schema';
import { PostgresTradingLedger } from './trading-ledger';

const clients: PGlite[] = [];

function evaluation(snapshotId: string, userId: string, isDemo: boolean): OutcomeEvaluation {
  return {
    snapshotId, decisionId: `decision:${snapshotId}`, userId, horizonDays: 30,
    maturityAt: '2026-08-12T00:00:00.000Z', evaluatedAt: '2026-08-12T00:00:00.000Z',
    status: 'MATURED', reason: null, purchaseStatus: 'PURCHASED', currency: 'USD', isDemo,
    baselineValueMinor: 10_000n, predictedValueMinor: 11_000n, actualValueMinor: 10_500n,
    offerAllInMinor: 9_000n, modelAbsoluteErrorMinor: 500n, modelAbsolutePercentageError: 4.76,
    modelDirectionCorrect: true, modelUpProbability: 0.7, actualDirectionUp: true, confidencePercent: 70,
    realizedProfitMinor: 1_000n, actualAllInMinor: 9_000n, counterfactualProfitMinor: 1_500n,
    counterfactualLabel: 'MARK-TO-MARKET — NOT REALIZED', modelCounterfactualProfitMinor: 1_500n,
    mattCounterfactualProfitMinor: 1_500n, modelValueAddedMinor: 0n, mattPredictedValueMinor: null,
    mattAbsoluteErrorMinor: null,
  };
}

async function ledger() {
  const client = new PGlite();
  clients.push(client);
  await client.exec(`
    create table prediction_snapshots (
      id text primary key, user_id text not null, analysis_id text not null,
      formula_version_id text not null, prediction_cutoff timestamptz not null,
      evidence_ids jsonb not null, input jsonb not null, result jsonb not null,
      is_demo boolean not null default false, created_at timestamptz not null
    );
    create table outcome_evaluations (
      id text primary key, prediction_snapshot_id text not null, decision_id text,
      horizon_days integer not null, status text not null, evaluated_at timestamptz not null,
      actual_market_value_minor bigint, realized_profit_minor bigint,
      counterfactual_profit_minor bigint, currency text, metrics jsonb not null,
      is_demo boolean not null default false
    );
    create unique index outcomes_snapshot_horizon_idx on outcome_evaluations (prediction_snapshot_id, horizon_days);
  `);
  const database = drizzle(client, { schema });
  return new PostgresTradingLedger(database as unknown as PgDatabase<PgQueryResultHKT, typeof schema>);
}

async function seedSnapshot(client: PGlite, id: string, userId: string, isDemo: boolean) {
  await client.query(
    `insert into prediction_snapshots values ($1, $2, $3, 'formula', '2026-07-12T00:00:00Z', '[]', '{}', '{}', $4, '2026-07-12T00:00:00Z')`,
    [id, userId, `analysis:${id}`, isDemo],
  );
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

describe('PostgresTradingLedger performance boundary', () => {
  it('loads only real persisted outcomes for the authenticated owner', async () => {
    const repository = await ledger();
    const client = clients.at(-1)!;
    await seedSnapshot(client, 'snapshot:owner-real', 'owner', false);
    await seedSnapshot(client, 'snapshot:owner-demo', 'owner', true);
    await seedSnapshot(client, 'snapshot:other-real', 'other-owner', false);
    await repository.saveOutcome(evaluation('snapshot:owner-real', 'owner', false));
    await repository.saveOutcome(evaluation('snapshot:owner-demo', 'owner', true));
    await repository.saveOutcome(evaluation('snapshot:other-real', 'other-owner', false));

    const rows = await repository.loadOutcomes('owner', 'REAL_ONLY');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ snapshotId: 'snapshot:owner-real', userId: 'owner', isDemo: false, status: 'MATURED' });
    expect(rows[0]?.actualValueMinor).toBe(10_500n);
    expect((await repository.loadOutcomes('owner', 'DEMO_ONLY')).map((row) => row.snapshotId)).toEqual(['snapshot:owner-demo']);
    expect(await repository.loadOutcomes('missing-owner', 'REAL_ONLY')).toEqual([]);
  });
});
