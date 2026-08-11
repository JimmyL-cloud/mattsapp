import { subtractMoney, type Money } from '@/lib/money/money';
import { confidenceAdjustedValue } from './confidence-adjustment';

type BuyHorizon = Readonly<{
  days: 7 | 30 | 90 | 180 | 365 | number;
  rawEntryCenter: Money;
  confidence: number;
  supported: boolean;
  evidenceIds: readonly string[];
}>;

type BuyTimingInput = Readonly<{
  currentAllIn: Money;
  currentFairCenter: Money;
  maximumAcquisitionPrice: Money;
  transactionCosts: Money;
  minimumTimingEdge: Money;
  auction: boolean;
  horizons: readonly BuyHorizon[];
  eventRisks: readonly string[];
}>;

export function calculateBuyTiming(input: BuyTimingInput) {
  subtractMoney(input.currentAllIn, input.currentFairCenter);
  subtractMoney(input.currentAllIn, input.maximumAcquisitionPrice);
  subtractMoney(input.currentAllIn, input.transactionCosts);
  subtractMoney(input.currentAllIn, input.minimumTimingEdge);
  const horizons = input.horizons.map((horizon) => Object.freeze({
    ...horizon,
    adjustedEntryCenter: confidenceAdjustedValue(input.currentFairCenter, horizon.rawEntryCenter, horizon.confidence),
  }));
  const supported = horizons.filter((horizon) => horizon.supported && horizon.evidenceIds.length > 0);
  if (supported.length === 0) {
    return Object.freeze({
      action: 'NO RELIABLE BUY-TIMING EDGE' as const,
      bestWindowDays: null,
      expectedSavings: { minor: 0n, currency: input.currentAllIn.currency },
      confidencePercent: 0,
      maximumAcquisitionPrice: input.maximumAcquisitionPrice,
      horizons: Object.freeze(horizons),
      eventRisks: Object.freeze([...input.eventRisks]),
    });
  }

  const best = supported.reduce((lowest, horizon) =>
    horizon.adjustedEntryCenter.minor < lowest.adjustedEntryCenter.minor ? horizon : lowest,
  );
  const expectedSavings = subtractMoney(input.currentAllIn, best.adjustedEntryCenter);
  const requiredEdge = input.transactionCosts.minor + input.minimumTimingEdge.minor;
  const action = input.auction && input.currentAllIn.minor > input.maximumAcquisitionPrice.minor
    ? 'BID ONLY BELOW'
    : expectedSavings.minor > requiredEdge
      ? 'WAIT'
      : 'BUY NOW';
  return Object.freeze({
    action,
    bestWindowDays: best.days,
    expectedSavings,
    confidencePercent: Math.round(best.confidence * 100),
    maximumAcquisitionPrice: input.maximumAcquisitionPrice,
    horizons: Object.freeze(horizons),
    eventRisks: Object.freeze([...input.eventRisks]),
  });
}