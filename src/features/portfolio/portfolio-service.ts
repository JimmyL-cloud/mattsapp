import type { DemoScope } from '@/lib/demo/policy';
import {
  assertTransition,
  requireReason,
  type DecisionEvent,
  type PredictionSnapshot,
  type UserDecision,
} from './decision-service';
import { assertPositiveTransactionAmount, type PortfolioTransaction } from './transaction-service';
import type { PurchaseStatus } from './purchase-status';

export type PortfolioHolding = Readonly<{
  id: string;
  userId: string;
  decisionId: string;
  snapshotId: string;
  cardId: string;
  cardLabel: string;
  acquiredAt: string;
  costBasisMinor: bigint;
  currentValueMinor: bigint | null;
  unrealizedProfitMinor: bigint | null;
  currency: string;
  recommendedSellWindowDays: number | null;
  staleAt: string | null;
  isDemo: boolean;
  closedAt: string | null;
}>;

type RecordDecisionInput = {
  id: string;
  snapshotId: string;
  userId: string;
  intendedMaximumMinor?: bigint;
  reason?: string;
  decidedAt: string;
};

type RecordPurchaseInput = {
  transactionId: string;
  holdingId: string;
  decisionId: string;
  amountMinor: bigint;
  currency: string;
  source: string;
  occurredAt: string;
  currentValueMinor?: bigint;
  staleAt?: string | null;
};

type SetStatusInput = {
  decisionId: string;
  status: PurchaseStatus;
  reason: string;
  occurredAt: string;
  reversal?: { transactionId: string; amountMinor: bigint; source: string };
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function cloneSnapshot(snapshot: PredictionSnapshot): PredictionSnapshot {
  return deepFreeze(structuredClone(snapshot));
}

function assertTimestamp(value: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error(`Invalid timestamp: ${value}`);
}

function inScope(isDemo: boolean, scope: DemoScope): boolean {
  return scope === 'DEMO_ONLY' ? isDemo : !isDemo;
}

export class PortfolioStore {
  readonly #predictions = new Map<string, PredictionSnapshot>();
  readonly #decisions = new Map<string, UserDecision>();
  readonly #events: DecisionEvent[] = [];
  readonly #transactions: PortfolioTransaction[] = [];
  readonly #holdings = new Map<string, PortfolioHolding>();

  registerPrediction(input: PredictionSnapshot): PredictionSnapshot {
    if (this.#predictions.has(input.id)) throw new Error(`Prediction already exists: ${input.id}`);
    assertTimestamp(input.capturedAt);
    const snapshot = cloneSnapshot(input);
    this.#predictions.set(snapshot.id, snapshot);
    return snapshot;
  }

  getPrediction(id: string): PredictionSnapshot {
    const snapshot = this.#predictions.get(id);
    if (!snapshot) throw new Error(`Unknown prediction: ${id}`);
    return snapshot;
  }

  recordDecision(input: RecordDecisionInput): UserDecision {
    if (this.#decisions.has(input.id)) throw new Error(`Decision already exists: ${input.id}`);
    assertTimestamp(input.decidedAt);
    const snapshot = this.getPrediction(input.snapshotId);
    if (snapshot.userId !== input.userId) throw new Error('Prediction owner does not match decision owner');
    const intendedMaximumMinor = input.intendedMaximumMinor ?? null;
    const decision: UserDecision = deepFreeze({
      id: input.id,
      snapshotId: snapshot.id,
      userId: input.userId,
      purchaseStatus: 'UNDECIDED',
      intendedMaximumMinor,
      varianceFromModelMaximumMinor: intendedMaximumMinor === null ? null : intendedMaximumMinor - snapshot.modelMaximumMinor,
      currency: snapshot.currency,
      reason: input.reason?.trim() || null,
      decidedAt: input.decidedAt,
      updatedAt: input.decidedAt,
      isDemo: snapshot.isDemo,
    });
    this.#decisions.set(decision.id, decision);
    this.#events.push(deepFreeze({
      id: `${decision.id}:1`, decisionId: decision.id, from: null, to: 'UNDECIDED',
      reason: decision.reason ?? 'Decision recorded', occurredAt: input.decidedAt, reversalTransactionId: null,
    }));
    return decision;
  }

  getDecision(id: string): UserDecision {
    const decision = this.#decisions.get(id);
    if (!decision) throw new Error(`Unknown decision: ${id}`);
    return decision;
  }

  recordPurchase(input: RecordPurchaseInput): {
    decision: UserDecision;
    transaction: PortfolioTransaction;
    holding: PortfolioHolding;
  } {
    assertPositiveTransactionAmount(input.amountMinor);
    assertTimestamp(input.occurredAt);
    const previous = this.getDecision(input.decisionId);
    if (previous.purchaseStatus !== 'UNDECIDED') {
      throw new Error(`Invalid purchase-status transition: ${previous.purchaseStatus} → PURCHASED`);
    }
    if (previous.currency !== input.currency) throw new Error('Purchase currency does not match prediction currency');
    if (this.#transactions.some((transaction) => transaction.id === input.transactionId)) throw new Error('Transaction already exists');
    if (this.#holdings.has(input.holdingId)) throw new Error('Holding already exists');
    const snapshot = this.getPrediction(previous.snapshotId);
    const transaction: PortfolioTransaction = deepFreeze({
      id: input.transactionId, userId: previous.userId, decisionId: previous.id, holdingId: input.holdingId,
      type: 'PURCHASE', amountMinor: input.amountMinor, currency: input.currency, source: input.source,
      occurredAt: input.occurredAt, reversesTransactionId: null, isDemo: previous.isDemo,
    });
    const currentValueMinor = input.currentValueMinor ?? null;
    const holding: PortfolioHolding = deepFreeze({
      id: input.holdingId, userId: previous.userId, decisionId: previous.id, snapshotId: snapshot.id,
      cardId: snapshot.cardId, cardLabel: snapshot.cardLabel, acquiredAt: input.occurredAt,
      costBasisMinor: input.amountMinor, currentValueMinor,
      unrealizedProfitMinor: currentValueMinor === null ? null : currentValueMinor - input.amountMinor, currency: input.currency,
      recommendedSellWindowDays: snapshot.recommendedSellWindowDays, staleAt: input.staleAt ?? null,
      isDemo: previous.isDemo, closedAt: null,
    });
    const decision: UserDecision = deepFreeze({ ...previous, purchaseStatus: 'PURCHASED', reason: 'Purchase recorded', updatedAt: input.occurredAt });
    this.#transactions.push(transaction);
    this.#holdings.set(holding.id, holding);
    this.#decisions.set(decision.id, decision);
    this.#appendEvent(decision.id, previous.purchaseStatus, 'PURCHASED', 'Purchase recorded', input.occurredAt, null);
    return { decision, transaction, holding };
  }

  setPurchaseStatus(input: SetStatusInput): UserDecision {
    assertTimestamp(input.occurredAt);
    const reason = requireReason(input.reason);
    const previous = this.getDecision(input.decisionId);
    assertTransition(previous.purchaseStatus, input.status, Boolean(input.reversal));
    let reversalTransactionId: string | null = null;
    if (previous.purchaseStatus === 'PURCHASED') {
      const purchase = this.#transactions.find((transaction) => transaction.decisionId === previous.id && transaction.type === 'PURCHASE');
      const holding = [...this.#holdings.values()].find((candidate) => candidate.decisionId === previous.id && candidate.closedAt === null);
      if (!purchase || !holding || !input.reversal) throw new Error('Cancelling a purchased decision requires a reversal transaction');
      assertPositiveTransactionAmount(input.reversal.amountMinor);
      if (input.reversal.amountMinor !== purchase.amountMinor) throw new Error('Reversal must match the original all-in amount');
      reversalTransactionId = input.reversal.transactionId;
      this.#transactions.push(deepFreeze({
        id: reversalTransactionId, userId: previous.userId, decisionId: previous.id, holdingId: holding.id,
        type: 'REVERSAL', amountMinor: -input.reversal.amountMinor, currency: previous.currency,
        source: input.reversal.source, occurredAt: input.occurredAt, reversesTransactionId: purchase.id, isDemo: previous.isDemo,
      }));
      this.#holdings.set(holding.id, deepFreeze({ ...holding, unrealizedProfitMinor: 0n, closedAt: input.occurredAt }));
    }
    const decision: UserDecision = deepFreeze({ ...previous, purchaseStatus: input.status, reason, updatedAt: input.occurredAt });
    this.#decisions.set(decision.id, decision);
    this.#appendEvent(decision.id, previous.purchaseStatus, input.status, reason, input.occurredAt, reversalTransactionId);
    return decision;
  }

  getDecisionHistory(decisionId: string): readonly DecisionEvent[] {
    return Object.freeze(this.#events.filter((event) => event.decisionId === decisionId));
  }

  getTransactions(userId: string, scope: DemoScope): readonly PortfolioTransaction[] {
    return Object.freeze(this.#transactions.filter((transaction) => transaction.userId === userId && inScope(transaction.isDemo, scope)));
  }

  getHoldings(userId: string, scope: DemoScope): readonly PortfolioHolding[] {
    return Object.freeze([...this.#holdings.values()].filter((holding) => holding.userId === userId && inScope(holding.isDemo, scope) && holding.closedAt === null));
  }

  getPortfolioSummary(userId: string, scope: DemoScope) {
    const holdings = this.getHoldings(userId, scope);
    const currencies = new Set(holdings.map((holding) => holding.currency));
    if (currencies.size > 1) throw new Error('Portfolio totals require one currency');
    const costBasisMinor = holdings.reduce((sum, holding) => sum + holding.costBasisMinor, 0n);
    const valued = holdings.filter((holding) => holding.currentValueMinor !== null);
    const currentValueMinor = valued.length === holdings.length ? valued.reduce((sum, holding) => sum + holding.currentValueMinor!, 0n) : null;
    return deepFreeze({
      holdingCount: holdings.length,
      costBasisMinor,
      currentValueMinor,
      unrealizedProfitMinor: currentValueMinor === null ? null : currentValueMinor - costBasisMinor,
      currency: holdings[0]?.currency ?? 'USD',
    });
  }

  #appendEvent(
    decisionId: string,
    from: PurchaseStatus,
    to: PurchaseStatus,
    reason: string,
    occurredAt: string,
    reversalTransactionId: string | null,
  ): void {
    this.#events.push(deepFreeze({
      id: `${decisionId}:${this.#events.filter((event) => event.decisionId === decisionId).length + 1}`,
      decisionId, from, to, reason, occurredAt, reversalTransactionId,
    }));
  }
}
