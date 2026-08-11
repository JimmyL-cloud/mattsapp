import type { PurchaseStatus } from '@/features/portfolio/purchase-status';
import { assertSingleDemoScope } from '@/lib/demo/policy';

export type OutcomeStatus = 'PENDING' | 'MATURED' | 'INCOMPLETE' | 'INVALIDATED';

export type OutcomeEvaluation = Readonly<{
  snapshotId: string;
  decisionId: string;
  userId: string;
  horizonDays: number;
  maturityAt: string;
  evaluatedAt: string;
  status: OutcomeStatus;
  reason: string | null;
  purchaseStatus: PurchaseStatus;
  currency: string;
  isDemo: boolean;
  baselineValueMinor: bigint;
  predictedValueMinor: bigint;
  actualValueMinor: bigint | null;
  offerAllInMinor: bigint;
  modelAbsoluteErrorMinor: bigint | null;
  modelAbsolutePercentageError: number | null;
  modelDirectionCorrect: boolean | null;
  modelUpProbability: number;
  actualDirectionUp: boolean | null;
  confidencePercent: number;
  realizedProfitMinor: bigint | null;
  actualAllInMinor: bigint | null;
  counterfactualProfitMinor: bigint | null;
  counterfactualLabel: 'MARK-TO-MARKET — NOT REALIZED' | 'HYPOTHETICAL — NOT REALIZED' | null;
  modelCounterfactualProfitMinor: bigint | null;
  mattCounterfactualProfitMinor: bigint | null;
  modelValueAddedMinor: bigint | null;
  mattPredictedValueMinor: bigint | null;
  mattAbsoluteErrorMinor: bigint | null;
}>;

type OutcomeInput = {
  snapshot: {
    id: string;
    userId: string;
    predictionCutoff: string;
    horizonDays: number;
    baselineValueMinor: bigint;
    predictedValueMinor: bigint;
    offerAllInMinor: bigint;
    confidencePercent: number;
    upProbability: number;
    evidencePublishedAt: readonly string[];
    currency: string;
    isDemo: boolean;
  };
  decision: {
    id: string;
    purchaseStatus: PurchaseStatus;
    actualAllInMinor: bigint | null;
    mattPredictedValueMinor: bigint | null;
    mattUpProbability: number | null;
  };
  marketAtHorizon: {
    id: string;
    observedAt: string;
    publishedAt: string;
    valueMinor: bigint;
    currency: string;
    isDemo: boolean;
  } | null;
  saleOutcome?: { netProceedsMinor: bigint; occurredAt: string };
  evaluatedAt: string;
};

function parseTime(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`Invalid ${label}: ${value}`);
  return parsed;
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function emptyResult(input: OutcomeInput, status: OutcomeStatus, reason: string | null, maturityAt: string): OutcomeEvaluation {
  return Object.freeze({
    snapshotId: input.snapshot.id, decisionId: input.decision.id, userId: input.snapshot.userId,
    horizonDays: input.snapshot.horizonDays, maturityAt, evaluatedAt: input.evaluatedAt, status, reason,
    purchaseStatus: input.decision.purchaseStatus, currency: input.snapshot.currency, isDemo: input.snapshot.isDemo,
    baselineValueMinor: input.snapshot.baselineValueMinor, predictedValueMinor: input.snapshot.predictedValueMinor,
    actualValueMinor: null, offerAllInMinor: input.snapshot.offerAllInMinor, modelAbsoluteErrorMinor: null,
    modelAbsolutePercentageError: null, modelDirectionCorrect: null, modelUpProbability: input.snapshot.upProbability,
    actualDirectionUp: null, confidencePercent: input.snapshot.confidencePercent, realizedProfitMinor: null,
    actualAllInMinor: input.decision.actualAllInMinor, counterfactualProfitMinor: null, counterfactualLabel: null,
    modelCounterfactualProfitMinor: null, mattCounterfactualProfitMinor: null, modelValueAddedMinor: null,
    mattPredictedValueMinor: input.decision.mattPredictedValueMinor, mattAbsoluteErrorMinor: null,
  });
}

export function evaluateOutcome(input: OutcomeInput): OutcomeEvaluation {
  const cutoff = parseTime(input.snapshot.predictionCutoff, 'prediction cutoff');
  const evaluatedAt = parseTime(input.evaluatedAt, 'evaluation time');
  if (!Number.isInteger(input.snapshot.horizonDays) || input.snapshot.horizonDays <= 0) throw new Error('horizonDays must be a positive integer');
  if (input.snapshot.confidencePercent < 0 || input.snapshot.confidencePercent > 100) throw new Error('confidencePercent must be between 0 and 100');
  if (input.snapshot.upProbability < 0 || input.snapshot.upProbability > 1) throw new Error('upProbability must be between 0 and 1');
  const maturityTime = cutoff + input.snapshot.horizonDays * 86_400_000;
  const maturityAt = new Date(maturityTime).toISOString();
  if (input.snapshot.evidencePublishedAt.some((timestamp) => parseTime(timestamp, 'evidence publication time') > cutoff)) {
    return emptyResult(input, 'INVALIDATED', 'PREDICTION_LOOKAHEAD', maturityAt);
  }
  if (evaluatedAt < maturityTime) return emptyResult(input, 'PENDING', null, maturityAt);
  if (!input.marketAtHorizon) return emptyResult(input, 'INCOMPLETE', 'NO_HORIZON_MARK', maturityAt);
  assertSingleDemoScope([input.snapshot.isDemo, input.marketAtHorizon.isDemo]);
  if (input.marketAtHorizon.currency !== input.snapshot.currency) throw new Error('Outcome currency does not match prediction currency');
  const markObservedAt = parseTime(input.marketAtHorizon.observedAt, 'mark observation time');
  const markPublishedAt = parseTime(input.marketAtHorizon.publishedAt, 'mark publication time');
  if (markPublishedAt > evaluatedAt) return emptyResult(input, 'INVALIDATED', 'OUTCOME_LOOKAHEAD', maturityAt);
  if (markObservedAt < maturityTime) return emptyResult(input, 'INCOMPLETE', 'NO_POST_MATURITY_MARK', maturityAt);

  const actualValueMinor = input.marketAtHorizon.valueMinor;
  const modelAbsoluteErrorMinor = absolute(input.snapshot.predictedValueMinor - actualValueMinor);
  const modelAbsolutePercentageError = actualValueMinor === 0n
    ? null
    : Number(modelAbsoluteErrorMinor * 1_000_000n / absolute(actualValueMinor)) / 10_000;
  const actualDirectionUp = actualValueMinor > input.snapshot.baselineValueMinor;
  const predictedDirectionUp = input.snapshot.predictedValueMinor > input.snapshot.baselineValueMinor;
  const purchased = input.decision.purchaseStatus === 'PURCHASED';
  const acquisitionMinor = purchased && input.decision.actualAllInMinor !== null
    ? input.decision.actualAllInMinor
    : input.snapshot.offerAllInMinor;
  const counterfactualProfitMinor = actualValueMinor - acquisitionMinor;
  const saleKnown = purchased
    && input.decision.actualAllInMinor !== null
    && input.saleOutcome !== undefined
    && parseTime(input.saleOutcome.occurredAt, 'sale outcome time') <= evaluatedAt;
  const realizedProfitMinor = saleKnown
    ? input.saleOutcome!.netProceedsMinor - input.decision.actualAllInMinor!
    : null;
  const modelWouldBuy = input.snapshot.predictedValueMinor > input.snapshot.offerAllInMinor;
  const modelCounterfactualProfitMinor = modelWouldBuy ? actualValueMinor - input.snapshot.offerAllInMinor : 0n;
  const mattCounterfactualProfitMinor = purchased ? counterfactualProfitMinor : 0n;
  const mattAbsoluteErrorMinor = input.decision.mattPredictedValueMinor === null
    ? null
    : absolute(input.decision.mattPredictedValueMinor - actualValueMinor);

  return Object.freeze({
    snapshotId: input.snapshot.id, decisionId: input.decision.id, userId: input.snapshot.userId,
    horizonDays: input.snapshot.horizonDays, maturityAt, evaluatedAt: input.evaluatedAt,
    status: 'MATURED', reason: null, purchaseStatus: input.decision.purchaseStatus,
    currency: input.snapshot.currency, isDemo: input.snapshot.isDemo, baselineValueMinor: input.snapshot.baselineValueMinor,
    predictedValueMinor: input.snapshot.predictedValueMinor, actualValueMinor, offerAllInMinor: input.snapshot.offerAllInMinor,
    modelAbsoluteErrorMinor, modelAbsolutePercentageError, modelDirectionCorrect: predictedDirectionUp === actualDirectionUp,
    modelUpProbability: input.snapshot.upProbability, actualDirectionUp, confidencePercent: input.snapshot.confidencePercent,
    realizedProfitMinor, actualAllInMinor: input.decision.actualAllInMinor, counterfactualProfitMinor,
    counterfactualLabel: purchased ? 'MARK-TO-MARKET — NOT REALIZED' : 'HYPOTHETICAL — NOT REALIZED',
    modelCounterfactualProfitMinor, mattCounterfactualProfitMinor,
    modelValueAddedMinor: modelCounterfactualProfitMinor - mattCounterfactualProfitMinor,
    mattPredictedValueMinor: input.decision.mattPredictedValueMinor, mattAbsoluteErrorMinor,
  });
}