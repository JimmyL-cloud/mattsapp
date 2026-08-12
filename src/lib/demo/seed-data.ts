import type { NormalizedMarketRecord } from '@/features/market/types';
import type { MarketRecordRepository } from '@/lib/db/repositories/market-records';

const demoRecords: readonly NormalizedMarketRecord[] = [
  {
    id: 'DEMO-MARKET-001',
    userId: 'DEMO-OWNER',
    sourceKey: 'demo-ebay-csv',
    sourceRecordId: 'DEMO-SALE-001',
    sourceLabel: 'DEMO / PLACEHOLDER — sold-listing CSV',
    originalUrl: null,
    listingTitle: 'DEMO / PLACEHOLDER — 2023 Panini Prizm #339 Silver PSA 10',
    status: 'SOLD',
    saleType: 'AUCTION',
    occurredAt: '2026-07-29T20:15:00-04:00',
    importedAt: '2026-08-10T15:00:00-04:00',
    freshnessAt: '2026-07-29T20:15:00-04:00',
    timezone: 'America/New_York',
    salePriceMinor: 38_600n,
    shippingMinor: 1_400n,
    buyerPremiumMinor: 0n,
    taxMinor: null,
    currency: 'USD',
    cardIdentity: null,
    fingerprint: 'demo-placeholder-fingerprint-001',
    raw: { synthetic: true, source: 'DEMO / PLACEHOLDER' },
    isDemo: true,
  },
  {
    id: 'DEMO-MARKET-002',
    userId: 'DEMO-OWNER',
    sourceKey: 'demo-local',
    sourceRecordId: null,
    sourceLabel: 'DEMO / PLACEHOLDER — local cash offer',
    originalUrl: null,
    listingTitle: 'DEMO / PLACEHOLDER — 2020 Donruss Optic Rated Rookie BGS 9.5',
    status: 'LOCAL_OFFER',
    saleType: 'LOCAL',
    occurredAt: '2026-08-08T11:00:00-04:00',
    importedAt: '2026-08-10T15:00:00-04:00',
    freshnessAt: '2026-08-08T11:00:00-04:00',
    timezone: 'America/Detroit',
    salePriceMinor: 29_900n,
    shippingMinor: 0n,
    buyerPremiumMinor: 0n,
    taxMinor: null,
    currency: 'USD',
    cardIdentity: null,
    fingerprint: 'demo-placeholder-fingerprint-002',
    raw: { synthetic: true, source: 'DEMO / PLACEHOLDER' },
    isDemo: true,
  },
];

export async function seedDemoMarketRecords(
  repository: MarketRecordRepository,
): Promise<readonly NormalizedMarketRecord[]> {
  const inserted: NormalizedMarketRecord[] = [];
  for (const record of demoRecords) {
    inserted.push(await repository.insert(record));
  }
  return inserted;
}
