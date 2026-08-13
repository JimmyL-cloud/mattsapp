import { describe, expect, it } from 'vitest';
import { AnalysisWorkflowConflictError, InMemoryAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-workflow';
import { ManualAnalysisService, manualAnalysisRequestSchema } from './manual-analysis-service';

const base = { idempotencyKey: 'analysis-operation-1', card: { playerName: 'Test Player', year: 2024, raw: true }, currency: 'USD',
  offer: { priceMinor: 10_000 }, comps: [{ sourceLabel: 'Receipt', listingTitle: 'Test Player sold', occurredAt: '2026-08-11T12:00:00Z', salePriceMinor: 12_000 }] };

describe('analysis creation boundaries', () => {
  it('returns the original immutable analysis on exact retry and conflicts on key reuse', async () => {
    const repository = new InMemoryAnalysisWorkflowRepository();
    const service = new ManualAnalysisService(repository);
    const request = manualAnalysisRequestSchema.parse(base);
    const first = await service.create('owner', request, new Date('2026-08-12T12:00:00Z'));
    const replay = await service.create('owner', request, new Date('2026-08-12T13:00:00Z'));
    expect(replay.id).toBe(first.id);
    await expect(service.create('owner', manualAnalysisRequestSchema.parse({ ...base, offer: { priceMinor: 11_000 } }), new Date('2026-08-12T13:00:00Z'))).rejects.toBeInstanceOf(AnalysisWorkflowConflictError);
  });

  it('rejects future cutoffs, future manual sales, and duplicate imported evidence IDs', async () => {
    const service = new ManualAnalysisService(new InMemoryAnalysisWorkflowRepository());
    await expect(service.create('owner', manualAnalysisRequestSchema.parse({ ...base, idempotencyKey: 'future-cutoff-1', cutoff: '2026-08-13T12:00:00Z' }), new Date('2026-08-12T12:00:00Z'))).rejects.toThrow('cutoff cannot be in the future');
    await expect(service.create('owner', manualAnalysisRequestSchema.parse({ ...base, idempotencyKey: 'future-comp-1', comps: [{ ...base.comps[0], occurredAt: '2026-08-13T12:00:00Z' }] }), new Date('2026-08-12T12:00:00Z'))).rejects.toThrow('evidence date cannot be in the future');
    expect(manualAnalysisRequestSchema.safeParse({ ...base, importedComps: [{ marketRecordId: 'same', identityReviewed: true }, { marketRecordId: 'same', identityReviewed: true }] }).success).toBe(false);
  });
});
