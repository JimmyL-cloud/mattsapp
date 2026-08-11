import type { PurchaseStatus } from './purchase-status';

export type PredictionSnapshot = Readonly<{
  id: string;
  userId: string;
  cardId: string;
  cardLabel: string;
  capturedAt: string;
  formulaVersion: string;
  modelMaximumMinor: bigint;
  fairValueMinor: bigint;
  recommendedSellWindowDays: number | null;
  currency: string;
  isDemo: boolean;
}>;

export type UserDecision = Readonly<{
  id: string;
  snapshotId: string;
  userId: string;
  purchaseStatus: PurchaseStatus;
  intendedMaximumMinor: bigint | null;
  varianceFromModelMaximumMinor: bigint | null;
  currency: string;
  reason: string | null;
  decidedAt: string;
  updatedAt: string;
  isDemo: boolean;
}>;

export type DecisionEvent = Readonly<{
  id: string;
  decisionId: string;
  from: PurchaseStatus | null;
  to: PurchaseStatus;
  reason: string;
  occurredAt: string;
  reversalTransactionId: string | null;
}>;

const terminalStatuses = new Set<PurchaseStatus>(['PASSED', 'MISSED', 'CANCELLED']);

export function assertTransition(from: PurchaseStatus, to: PurchaseStatus, hasReversal: boolean): void {
  if (to === 'PURCHASED') throw new Error('Use recordPurchase to mark a decision PURCHASED');
  if (terminalStatuses.has(from)) throw new Error(`Invalid purchase-status transition: ${from} → ${to}`);
  if (from === 'PURCHASED' && (to !== 'CANCELLED' || !hasReversal)) {
    throw new Error('Cancelling a purchased decision requires a reversal transaction');
  }
  if (from === 'UNDECIDED' && !terminalStatuses.has(to)) {
    throw new Error(`Invalid purchase-status transition: ${from} → ${to}`);
  }
}

export function requireReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) throw new Error('A reason is required for every decision transition');
  return normalized;
}