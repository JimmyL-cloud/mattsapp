import { describe, expect, it } from 'vitest';
import { InMemoryMarketRecordRepository } from '@/lib/db/repositories/market-records';
import { CsvImportService } from './import-service';

const csv = `source_record_id,title,source_url,sale_price,shipping,buyer_premium,tax,currency,sale_type,status,sold_at,timezone
sale-1,2023 Prizm Silver PSA 10,https://example.test/sale-1,100.00,5.00,0.00,,USD,AUCTION,SOLD,2026-08-01T12:00:00-04:00,America/New_York`;

describe('CSV import', () => {
  it('persists a real row once and rejects the duplicate on replay', async () => {
    const repository = new InMemoryMarketRecordRepository();
    const service = new CsvImportService(repository);
    const input = {
      csv,
      userId: 'owner',
      sourceKey: 'manual-csv',
      sourceLabel: 'Manual CSV',
      importedAt: '2026-08-11T12:00:00-04:00',
      now: '2026-08-11T12:00:00-04:00',
      isDemo: false,
    } as const;
    expect((await service.importCsv(input)).accepted).toBe(1);
    expect((await service.importCsv({ ...input, importedAt: '2026-08-11T12:01:00-04:00' })).duplicates).toBe(1);
    expect(await repository.list({ scope: 'REAL_ONLY' })).toHaveLength(1);
    expect(await repository.list({ scope: 'DEMO_ONLY' })).toHaveLength(0);
  });

  it('normalizes and persists a manually entered card record', async () => {
    const repository = new InMemoryMarketRecordRepository();
    const report = await new CsvImportService(repository).importManual({
      userId: 'owner',
      sourceKey: 'manual-entry',
      sourceLabel: 'Local card show',
      sourceRecordId: 'manual-1',
      listingTitle: '2023 Prizm Silver PSA 10',
      originalUrl: null,
      salePrice: '100.00',
      shipping: '0.00',
      buyerPremium: '0.00',
      tax: null,
      currency: 'USD',
      saleType: 'LOCAL',
      status: 'SOLD',
      occurredAt: '2026-08-01T12:00:00-04:00',
      timezone: 'America/New_York',
      importedAt: '2026-08-11T12:00:00-04:00',
      now: '2026-08-11T12:00:00-04:00',
      fields: { note: 'manual verification' },
      isDemo: true,
    });

    expect(report.accepted).toBe(1);
    expect(await repository.list({ scope: 'DEMO_ONLY' })).toHaveLength(1);
    expect(await repository.list({ scope: 'REAL_ONLY' })).toHaveLength(0);
  });
});
