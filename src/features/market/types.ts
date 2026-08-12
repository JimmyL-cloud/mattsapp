export type MarketRecordStatus =
  | 'ACTIVE'
  | 'SOLD'
  | 'ENDED_UNSOLD'
  | 'CANCELLED'
  | 'LOCAL_OFFER';

export type MarketSaleType =
  | 'AUCTION'
  | 'FIXED_PRICE'
  | 'ACCEPTED_OFFER'
  | 'LOCAL'
  | 'TRADE';

export type SourceConnectionStatus =
  | 'CONNECTED'
  | 'MANUAL'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'AWAITING_CREDENTIALS';

export type NormalizedMarketRecord = Readonly<{
  id: string;
  userId: string;
  sourceKey: string;
  sourceRecordId: string | null;
  sourceLabel: string;
  originalUrl: string | null;
  listingTitle: string;
  status: MarketRecordStatus;
  saleType: MarketSaleType;
  occurredAt: string;
  importedAt: string;
  freshnessAt: string;
  timezone: string;
  salePriceMinor: bigint;
  shippingMinor: bigint;
  buyerPremiumMinor: bigint;
  taxMinor: bigint | null;
  currency: string;
  /** Structured CSV identity. Null means the row is title-only and requires owner review before analysis. */
  cardIdentity: import('@/features/cards/card-identity').CardIdentity | null;
  fingerprint: string;
  raw: Readonly<Record<string, unknown>>;
  isDemo: boolean;
}>;

export type SourceStatus = Readonly<{
  sourceKey: string;
  status: SourceConnectionStatus;
  lastAttemptAt: string | null;
  lastSuccessfulRefreshAt: string | null;
  message: string;
}>;
