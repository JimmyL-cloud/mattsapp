import type { CardIdentity } from '@/features/cards/card-identity';
import type { PurchaseStatus } from '@/features/portfolio/purchase-status';
import type { NormalizedMarketRecord } from '@/features/market/types';
import type { HistoricalNetObservation } from '@/lib/forecasting/seasonality';
import { forecastNetValues } from '@/lib/forecasting/project-net';
import { calculateBuyTiming } from '@/lib/forecasting/buy-timing';
import { calculateSellTiming } from '@/lib/forecasting/sell-timing';
import type { CalculationStep, JsonValue } from '@/lib/audit/calculation-tape';
import { addMoney, multiplyMoney, type Money } from '@/lib/money/money';
import { assertSingleDemoScope } from '@/lib/demo/policy';
import { calculateConfidence } from '@/lib/valuation/confidence';
import { matchComp, type CompCandidate } from '@/lib/valuation/match-comp';
import { calculateCollectorValue, calculateFairValue, calculateResaleDealScore } from '@/lib/valuation/valuation';
import { calculateScenario, type CostLine } from '@/lib/valuation/scenario';
import type { FeeSchedule } from '@/lib/valuation/fees';
import { projectAuctionClose } from '@/lib/valuation/auction';

export type AnalysisCompInput = {
  record: NormalizedMarketRecord;
  candidate: CompCandidate;
  manualIncluded?: boolean;
  overrideReason?: string;
};

export type CurrentOffer = {
  kind: 'FIXED_PRICE' | 'LOCAL_OFFER' | 'AUCTION';
  priceOrBid: Money;
  shipping: Money;
  buyerPremiumBps: number;
  bidIncrement?: Money;
  historicalCloseMultipliers?: readonly number[];
};

export type RunAnalysisInput = {
  analysisId: string;
  userId: string;
  target: CardIdentity;
  cutoff: string;
  formulaVersion: string;
  isDemo: boolean;
  purchaseStatus: PurchaseStatus;
  currentOffer: CurrentOffer;
  comps: AnalysisCompInput[];
  feeSchedule: FeeSchedule;
  acquisitionCosts: CostLine[];
  fixedSellingCosts: CostLine[];
  returnAllowanceBps: number;
  targetRoiBps?: number;
  holdingDays: number;
  sellHistory: HistoricalNetObservation[];
  forecastHorizons: number[];
  transactionCosts: Money;
  minimumTimingEdge: Money;
};

function daysBetween(older: string, newer: string): number {
  return Math.max(0, Math.floor((Date.parse(newer) - Date.parse(older)) / 86_400_000));
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function observedAllIn(record: NormalizedMarketRecord): Money {
  return {
    minor: record.salePriceMinor + record.shippingMinor + record.buyerPremiumMinor,
    currency: record.currency,
  };
}

function resequence(steps: readonly Omit<CalculationStep, 'sequence'>[]): readonly CalculationStep[] {
  return Object.freeze(steps.map((step, index) => Object.freeze({ ...step, sequence: index + 1 })));
}

function step(
  key: string,
  label: string,
  formula: string,
  inputs: Record<string, JsonValue>,
  output: JsonValue,
  unit: string,
): Omit<CalculationStep, 'sequence'> {
  return { key, label, formula, inputs, output, unit };
}

export type AnalysisResult = ReturnType<typeof runAnalysis>;

export function runAnalysis(input: RunAnalysisInput) {
  const cutoffTime = Date.parse(input.cutoff);
  if (Number.isNaN(cutoffTime)) throw new Error('Invalid analysis cutoff');
  if (input.comps.length === 0) throw new Error('At least one raw comp is required');
  const scope = assertSingleDemoScope(input.comps.map((comp) => comp.record.isDemo));
  if ((scope === 'DEMO_ONLY') !== input.isDemo) throw new Error('Analysis demo scope does not match its evidence');

  const premium = multiplyMoney(input.currentOffer.priceOrBid, input.currentOffer.buyerPremiumBps / 10_000);
  const currentAllIn = addMoney(addMoney(input.currentOffer.priceOrBid, input.currentOffer.shipping), premium);
  const rawComps = input.comps.map((comp) => {
    const match = matchComp(input.target, comp.candidate, { version: 'match-v1' });
    const postCutoff = Date.parse(comp.record.occurredAt) > cutoffTime;
    const exclusionCodes: string[] = [...match.exclusionCodes];
    if (postCutoff) exclusionCodes.push('POST_CUTOFF_RECORD');
    const automaticallyIncluded = match.eligibility === 'ELIGIBLE' && !postCutoff;
    const manuallyIncluded = comp.manualIncluded;
    if (comp.manualIncluded !== undefined && !comp.overrideReason?.trim()) {
      throw new Error(`Override reason is required for ${comp.record.id}`);
    }
    return Object.freeze({
      record: comp.record,
      candidate: comp.candidate,
      match,
      ageDays: daysBetween(comp.record.occurredAt, input.cutoff),
      observedAllIn: observedAllIn(comp.record),
      automaticallyIncluded,
      manuallyIncluded,
      // A deliberate exclusion is authoritative even if the matching rule
      // would include the comp. Explicit inclusions still cannot bypass a
      // post-cutoff record because that would introduce lookahead evidence.
      included: manuallyIncluded === undefined
        ? automaticallyIncluded
        : manuallyIncluded && !postCutoff,
      exclusionCodes: Object.freeze(exclusionCodes),
      overrideReason: comp.overrideReason ?? null,
    });
  });
  const includedComps = rawComps.filter((comp) => comp.included);
  const excludedComps = rawComps.filter((comp) => !comp.included);
  if (includedComps.length === 0) throw new Error('No eligible comparison sales');
  if (includedComps.some((comp) => comp.observedAllIn.currency !== currentAllIn.currency)) {
    throw new Error('Currency mismatch between offer and comparison sales');
  }

  const fairValue = calculateFairValue(includedComps.map((comp) => ({
    id: comp.record.id,
    allInMinor: comp.observedAllIn.minor,
    match: comp.match.total,
    ageDays: comp.ageDays,
  })));
  const collectorValue = calculateCollectorValue(input.currentOffer.priceOrBid.minor, fairValue.centerMinor);
  const totalWeight = fairValue.comps.reduce((sum, comp) => sum + comp.weight, 0);
  const effectiveSampleSize = totalWeight ** 2 / fairValue.comps.reduce((sum, comp) => sum + comp.weight ** 2, 0);
  const weightByCompId = new Map(fairValue.comps.map((comp) => [comp.id, comp.weight]));
  const weightedMeanMatch = Math.min(1, Math.max(0, includedComps.reduce(
    (sum, comp) => sum + comp.match.total * (weightByCompId.get(comp.record.id) ?? 0),
    0,
  ) / totalWeight));
  const prices = includedComps.map((comp) => Number(comp.observedAllIn.minor));
  const priceMedian = median(prices);
  const normalizedMad = priceMedian === 0 ? 1 : median(prices.map((price) => Math.abs(price - priceMedian))) / priceMedian;
  const sourceKeys = new Set(includedComps.map((comp) => comp.record.sourceKey));
  const confidence = calculateConfidence({
    effectiveSampleSize,
    weightedMeanMatch,
    recentEvidenceShare: Math.min(1, Math.max(0, includedComps
      .filter((comp) => comp.ageDays <= 180)
      .reduce((sum, comp) => sum + (weightByCompId.get(comp.record.id) ?? 0), 0) / totalWeight)),
    normalizedMedianAbsoluteDeviation: normalizedMad,
    matchedSalesPer90Days: includedComps.filter((comp) => comp.ageDays <= 90).length,
    distinctReliableSources: sourceKeys.size,
    exactOrNearExactCount: includedComps.filter((comp) => comp.match.total >= 0.9).length,
    includedCount: includedComps.length,
    allEvidenceManualUnverified: sourceKeys.size === 1 && includedComps.every((comp) => comp.record.sourceKey.toLocaleLowerCase('en-US').includes('manual')),
    newestIncludedAgeDays: Math.min(...includedComps.map((comp) => comp.ageDays)),
  });
  const scenario = calculateScenario({
    purchasePrice: currentAllIn,
    acquisitionCosts: input.acquisitionCosts,
    expectedGrossSalePrice: { minor: fairValue.centerMinor, currency: currentAllIn.currency },
    fixedSellingCosts: input.fixedSellingCosts,
    returnAllowanceBps: input.returnAllowanceBps,
    feeSchedule: input.feeSchedule,
    targetRoiBps: input.targetRoiBps ?? 1_500,
    holdingDays: input.holdingDays,
  });
  const forecasts = forecastNetValues({
    currentEstimatedNet: scenario.expectedNetProceeds,
    cutoff: input.cutoff,
    history: input.sellHistory,
    horizons: input.forecastHorizons,
  });
  const sellTiming = calculateSellTiming({
    currentEstimatedNet: scenario.expectedNetProceeds,
    cutoff: input.cutoff,
    horizons: forecasts,
  });
  const buyTiming = calculateBuyTiming({
    currentAllIn,
    currentFairCenter: { minor: fairValue.centerMinor, currency: currentAllIn.currency },
    maximumAcquisitionPrice: scenario.maximumPurchasePriceForTargetRoi,
    transactionCosts: input.transactionCosts,
    minimumTimingEdge: input.minimumTimingEdge,
    auction: input.currentOffer.kind === 'AUCTION',
    horizons: forecasts.map((forecast) => ({
      days: forecast.days,
      rawEntryCenter: forecast.rawProjectedNet,
      confidence: forecast.confidence,
      supported: forecast.evidence.length > 0,
      evidenceIds: forecast.evidence.map((evidence) => evidence.id),
    })),
    eventRisks: [],
  });
  const auction = input.currentOffer.kind === 'AUCTION'
    ? projectAuctionClose({
      currentBid: input.currentOffer.priceOrBid,
      shipping: input.currentOffer.shipping,
      buyerPremiumBps: input.currentOffer.buyerPremiumBps,
      bidIncrement: input.currentOffer.bidIncrement ?? { minor: 100n, currency: currentAllIn.currency },
      fairCenter: { minor: fairValue.centerMinor, currency: currentAllIn.currency },
      historicalCloseMultipliers: input.currentOffer.historicalCloseMultipliers ?? [],
    })
    : null;
  const resaleDeal = calculateResaleDealScore(scenario.roiBps, input.targetRoiBps ?? 1_500);
  // Retained for callers during the Task 1 -> Task 2 transition. New callers
  // should use resaleDeal and collectorValue explicitly.
  const dealScore = Object.freeze({
    ...resaleDeal,
    discountPercent: collectorValue.differencePercent,
  });

  const steps: Array<Omit<CalculationStep, 'sequence'>> = [
    ...fairValue.tape.steps.map(({ sequence, ...calculation }) => {
      void sequence;
      return calculation;
    }),
    step('collector_value', 'Collector value (evidence only)', collectorValue.formula, { cardOnlyAskingPrice: collectorValue.askingPriceMinor, fairCenter: collectorValue.fairCenterMinor }, { differenceMinor: collectorValue.differenceMinor, differencePercent: collectorValue.differencePercent, signal: collectorValue.signal }, 'comparison'),
    step('confidence', 'Evidence confidence', confidence.formula, { components: confidence.components, weights: confidence.weights, caps: [...confidence.caps] }, confidence.percent, 'percent'),
    ...scenario.steps.map(({ sequence, ...calculation }) => {
      void sequence;
      return calculation;
    }),
    step('resale_deal', 'Resale deal score', resaleDeal.formula, { roiBps: resaleDeal.roiBps, targetRoiBps: resaleDeal.targetRoiBps }, { score: resaleDeal.score, signal: resaleDeal.signal }, 'signed score'),
    step('buy_timing', 'Buy Timing Outlook', 'minimum confidence-adjusted future entry versus current all-in and timing costs', { horizons: buyTiming.horizons.map((horizon) => ({ days: horizon.days, adjustedMinor: horizon.adjustedEntryCenter.minor, confidence: horizon.confidence })) }, buyTiming.action, 'recommendation'),
    step('sell_timing', 'Signed Sell Timing Score', 'clamp(round(((current_net-best_future_net)/current_net)/0.025), -10, 10)', { currentNet: scenario.expectedNetProceeds.minor, horizons: sellTiming.horizons.map((horizon) => ({ days: horizon.days, adjustedMinor: horizon.adjustedProjectedNet.minor, supported: horizon.supported })) }, sellTiming.score, 'signed score'),
  ];

  return Object.freeze({
    analysisId: input.analysisId,
    userId: input.userId,
    target: input.target,
    cutoff: input.cutoff,
    formulaVersion: input.formulaVersion,
    isDemo: input.isDemo,
    purchaseStatus: input.purchaseStatus,
    currentOffer: input.currentOffer,
    currentAllIn,
    fairValue: Object.freeze({ lowMinor: fairValue.lowMinor, centerMinor: fairValue.centerMinor, highMinor: fairValue.highMinor, currency: currentAllIn.currency }),
    collectorValue,
    resaleDeal,
    dealScore,
    confidence,
    scenario,
    forecasts: Object.freeze(forecasts),
    buyTiming,
    sellTiming,
    auction,
    rawComps: Object.freeze(rawComps),
    includedComps: Object.freeze(includedComps),
    excludedComps: Object.freeze(excludedComps),
    calculationSteps: resequence(steps),
  });
}
