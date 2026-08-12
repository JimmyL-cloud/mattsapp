import { describe, expect, it } from 'vitest';
import { InMemoryAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-workflow';
import { ManualAnalysisService, manualAnalysisRequestSchema } from './manual-analysis-service';

const request = manualAnalysisRequestSchema.parse({
  card: { playerName: 'Caleb Williams', year: 2024, brand: 'Prizm', setName: 'Prizm', cardNumber: '101', raw: false, gradingCompanyKey: 'psa', grade: 10 },
  currency: 'USD',
  offer: { priceMinor: 8_000, shippingMinor: 500 },
  comps: [
    { sourceLabel: 'Card show receipt', listingTitle: '2024 Prizm Caleb Williams #101 PSA 10', occurredAt: '2026-08-01T12:00:00Z', salePriceMinor: 12_000, shippingMinor: 0 },
    { sourceLabel: 'Auction invoice', listingTitle: '2024 Prizm Caleb Williams #101 PSA 10', occurredAt: '2026-07-20T12:00:00Z', salePriceMinor: 13_000, shippingMinor: 0 },
  ],
  acquisitionCosts: [{ key: 'tax', label: 'Known tax', amountMinor: 500 }],
  fixedSellingCosts: [{ key: 'shipping', label: 'Ship to buyer', amountMinor: 500 }],
  sellingFeeBps: 1_000,
});

describe('ManualAnalysisService', () => {
  it('persists immutable real-analysis snapshots and starts undecided at the 15% default ROI', async () => {
    const repository = new InMemoryAnalysisWorkflowRepository();
    const analysis = await new ManualAnalysisService(repository).create('owner-1', request, new Date('2026-08-12T00:00:00Z'));

    expect(analysis.purchaseStatus).toBe('UNDECIDED');
    expect(analysis.input.targetRoiBps).toBe(1_500);
    expect((analysis.result.collectorValue as { signal: string }).signal).toBe('EVIDENCE_ONLY');
    expect((analysis.result.resaleDeal as { targetRoiBps: number }).targetRoiBps).toBe(1_500);
    expect((await repository.listAnalyses('owner-1'))).toHaveLength(1);

    const changed = await repository.updateDecision('owner-1', analysis.id, 'PASSED', 'Price moved');
    expect(changed?.purchaseStatus).toBe('PASSED');
    expect(changed?.result).toEqual(analysis.result);
  });

  it('uses the owner setting when the request omits the target ROI', async () => {
    const repository = new InMemoryAnalysisWorkflowRepository();
    await repository.updateSettings('owner-1', 2_000);
    const analysis = await new ManualAnalysisService(repository).create('owner-1', request, new Date('2026-08-12T00:00:00Z'));
    expect(analysis.input.targetRoiBps).toBe(2_000);
  });

  it('honors an explicit false comp selection and requires its override reason', async () => {
    const repository = new InMemoryAnalysisWorkflowRepository();
    const excluded = manualAnalysisRequestSchema.parse({
      ...request,
      comps: request.comps.map((comp, index) => index === 0 ? { ...comp, included: false, overrideReason: 'Different eye appeal' } : comp),
    });
    const analysis = await new ManualAnalysisService(repository).create('owner-1', excluded, new Date('2026-08-12T00:00:00Z'));
    const rawComps = analysis.result.rawComps as Array<{ included: boolean }>;
    expect(rawComps[0]?.included).toBe(false);
    expect((analysis.result.fairValue as { centerMinor: string }).centerMinor).toBe('13000');

    const missingReason = manualAnalysisRequestSchema.parse({
      ...request,
      comps: request.comps.map((comp, index) => index === 0 ? { ...comp, included: false } : comp),
    });
    await expect(new ManualAnalysisService(repository).create('owner-1', missingReason)).rejects.toThrow('Override reason is required');
  });
});
