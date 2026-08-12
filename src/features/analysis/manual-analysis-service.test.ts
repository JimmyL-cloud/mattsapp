import { describe, expect, it } from 'vitest';
import { InMemoryAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-workflow';
import { ManualAnalysisService, manualAnalysisRequestSchema } from './manual-analysis-service';
import { InMemoryMarketRecordRepository } from '@/lib/db/repositories/market-records';
import { CsvImportService } from '@/features/imports/import-service';

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

  it('uses structured comp identity and excludes a mismatched card instead of inheriting the target', async () => {
    const repository = new InMemoryAnalysisWorkflowRepository();
    const withMismatch = manualAnalysisRequestSchema.parse({
      ...request,
      comps: request.comps.map((comp, index) => index === 0 ? {
        ...comp,
        card: { playerName: 'Jayden Daniels', year: 2024, brand: 'Prizm', setName: 'Prizm', cardNumber: '101', raw: false, gradingCompanyKey: 'psa', grade: 10 },
      } : {
        ...comp,
        card: { playerName: 'Caleb Williams', year: 2024, brand: 'Prizm', setName: 'Prizm', cardNumber: '101', raw: false, gradingCompanyKey: 'psa', grade: 10 },
      }),
    });
    const analysis = await new ManualAnalysisService(repository).create('owner-1', withMismatch, new Date('2026-08-12T00:00:00Z'));
    const rawComps = analysis.result.rawComps as Array<{ included: boolean; exclusionCodes: string[] }>;
    expect(rawComps[0]).toMatchObject({ included: false });
    expect(rawComps[0]?.exclusionCodes).toContain('WRONG_PLAYER');
    expect(rawComps[1]).toMatchObject({ included: true });
  });

  it('requires an explicit review before title-only imported evidence can enter calculations', async () => {
    const repository = new InMemoryAnalysisWorkflowRepository();
    const market = new InMemoryMarketRecordRepository();
    const report = await new CsvImportService(market).importCsv({
      csv: 'source_record_id,title,sale_price,shipping,buyer_premium,tax,currency,sale_type,status,sold_at,timezone\nimport-1,2024 Prizm Caleb Williams 101 Silver PSA 10,125,0,0,,USD,FIXED_PRICE,SOLD,2026-08-01T12:00:00Z,UTC',
      userId: 'owner-1', sourceKey: 'owner-csv', sourceLabel: 'Owner CSV', importedAt: '2026-08-11T12:00:00Z', now: '2026-08-12T00:00:00Z', isDemo: false,
    });
    const recordId = report.rows[0].recordId!;
    const service = new ManualAnalysisService(repository, market);
    const unreviewed = manualAnalysisRequestSchema.parse({ ...request, importedComps: [{ marketRecordId: recordId, identityReviewed: false }] });
    await expect(service.create('owner-1', unreviewed, new Date('2026-08-12T00:00:00Z'))).rejects.toThrow('requires explicit identity review');

    const reviewed = manualAnalysisRequestSchema.parse({ ...request, importedComps: [{ marketRecordId: recordId, identityReviewed: true }] });
    const analysis = await service.create('owner-1', reviewed, new Date('2026-08-12T00:00:00Z'));
    expect(analysis.result.rawComps).toHaveLength(3);
    expect((analysis.result.rawComps as Array<{ record: { id: string } }>).some((comp) => comp.record.id === recordId)).toBe(true);
  });
});
