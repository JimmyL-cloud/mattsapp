import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema';
import { PostgresAnalysisWorkflowRepository, type AnalysisWrite } from './analysis-workflow';

const write: AnalysisWrite = {
  id: 'analysis:one', snapshotId: 'snapshot:one', decisionId: 'decision:one', userId: 'owner:one', cardId: 'card:one',
  cutoff: '2026-08-12T00:00:00.000Z', formulaVersion: 'manual-analysis-v1', currentPriceMinor: 10_000n, currency: 'USD',
  input: { card: { sport: 'football', playerName: 'Test Player' } }, result: { persisted: true },
  evidence: [{ id: 'manual-comp:one', included: false, snapshot: { source: 'manual' } }],
};

describe('PostgresAnalysisWorkflowRepository with the Neon HTTP adapter', () => {
  it('uses the adapter-supported atomic batch instead of unsupported transactions', async () => {
    const database = drizzle.mock({ schema });
    const transaction = database.transaction.bind(database) as unknown as (callback: () => Promise<void>) => Promise<void>;
    await expect(transaction(async () => undefined)).rejects.toThrow('No transactions support in neon-http driver');

    const batch = vi.spyOn(database, 'batch').mockResolvedValue([] as never);
    await new PostgresAnalysisWorkflowRepository(database).createAnalysis(write);

    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0]?.[0]).toHaveLength(6);
  });
});
