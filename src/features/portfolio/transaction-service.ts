export type PortfolioTransaction = Readonly<{
  id: string;
  userId: string;
  decisionId: string;
  holdingId: string;
  type: 'PURCHASE' | 'SALE' | 'REVERSAL';
  amountMinor: bigint;
  currency: string;
  source: string;
  occurredAt: string;
  reversesTransactionId: string | null;
  isDemo: boolean;
}>;

export function assertPositiveTransactionAmount(amountMinor: bigint): void {
  if (amountMinor <= 0n) throw new Error('Transaction all-in amount must be positive');
}