import { createCardIdentity } from '@/features/cards/card-identity';
import type { CompCandidate } from '@/lib/valuation/match-comp';
import type { NormalizedMarketRecord } from '@/features/market/types';
import type { Money } from '@/lib/money/money';
import { runAnalysis, type RunAnalysisInput } from './run-analysis';

const usd = (minor: bigint): Money => ({ minor, currency: 'USD' });
const target = createCardIdentity({
  sport: 'football', playerName: 'DEMO / PLACEHOLDER ROOKIE', canonicalPlayerId: 'demo-player', teamShown: 'Washington',
  year: 2023, manufacturer: 'Panini', brand: 'Prizm', setName: 'Prizm', cardNumber: '339', rookie: true,
  parallel: 'Silver', serialDenominator: null, autographType: 'NONE', memorabiliaType: 'NONE', raw: false,
  gradingCompanyKey: 'psa', grade: 10,
});

function record(id: string, price: bigint, shipping: bigint, date: string, source: string): NormalizedMarketRecord {
  return {
    id, userId: 'DEMO-OWNER', sourceKey: source, sourceRecordId: id,
    sourceLabel: `DEMO / PLACEHOLDER — ${source}`, originalUrl: null,
    listingTitle: 'DEMO / PLACEHOLDER — 2023 Panini Prizm #339 Silver PSA 10', status: 'SOLD', saleType: 'AUCTION',
    occurredAt: date, importedAt: '2026-08-10T14:00:00-04:00', freshnessAt: date, timezone: 'America/New_York',
    salePriceMinor: price, shippingMinor: shipping, buyerPremiumMinor: 0n, taxMinor: null, currency: 'USD',
    cardIdentity: target, fingerprint: `demo-${id}`, raw: { synthetic: true, id }, isDemo: true,
  };
}

function candidate(parallel = 'Silver'): CompCandidate {
  return {
    identity: createCardIdentity({ ...target, parallel }),
    listing: { title: `DEMO / PLACEHOLDER — 2023 Prizm ${parallel}`, status: 'SOLD', saleType: 'AUCTION', acceptedPriceKnown: true, duplicate: false },
  };
}

export function createDemoAnalysisInput(): RunAnalysisInput {
  return {
    analysisId: 'demo', userId: 'DEMO-OWNER', target, cutoff: '2026-08-10T15:00:00-04:00', formulaVersion: 'valuation-v1',
    isDemo: true, purchaseStatus: 'PURCHASED',
    currentOffer: { kind: 'FIXED_PRICE', priceOrBid: usd(34_250n), shipping: usd(0n), buyerPremiumBps: 0 },
    comps: [
      { record: record('DEMO-001', 38_600n, 1_400n, '2026-07-29T20:15:00-04:00', 'sold-listing CSV'), candidate: candidate() },
      { record: record('DEMO-002', 40_200n, 0n, '2026-07-18T19:00:00-04:00', 'auction CSV'), candidate: candidate() },
      { record: record('DEMO-003', 37_500n, 499n, '2026-06-30T12:00:00-04:00', 'COMC manual'), candidate: candidate() },
      { record: record('DEMO-004', 29_900n, 0n, '2026-07-22T12:00:00-04:00', 'local deal'), candidate: candidate('Gold') },
    ],
    feeSchedule: {
      id: 'DEMO-FEES-v1', sourceKey: 'demo-market', effectiveFrom: '2026-01-01T00:00:00Z', effectiveTo: null,
      rules: [{ key: 'commission', label: 'DEMO marketplace commission', basis: 'GROSS_SALE', bps: 1_300, flatMinor: 30n }],
    },
    acquisitionCosts: [{ key: 'tax', label: 'Known purchase tax', amount: usd(1_250n) }],
    fixedSellingCosts: [{ key: 'shipping', label: 'Shipping to buyer', amount: usd(800n) }],
    returnAllowanceBps: 200, targetRoiBps: 1_500, holdingDays: 90,
    sellHistory: [2023, 2024, 2025].flatMap((year) => [
      { id: `DEMO-JAN-${year}`, occurredAt: `${year}-01-15T12:00:00Z`, publishedAt: `${year}-01-16T12:00:00Z`, net: usd(36_000n) },
      { id: `DEMO-AUG-${year}`, occurredAt: `${year}-08-15T12:00:00Z`, publishedAt: `${year}-08-16T12:00:00Z`, net: usd(41_000n) },
    ]),
    forecastHorizons: [7, 30, 90, 180, 365], transactionCosts: usd(500n), minimumTimingEdge: usd(1_000n),
  };
}

export function createDemoAnalysis() {
  return runAnalysis(createDemoAnalysisInput());
}
