import Decimal from 'decimal.js';
import { confidenceAdjustedValue } from './confidence-adjustment';
import type { Money } from '@/lib/money/money';

type ForecastEvidence = Readonly<{ id: string; publishedAt: string }>;
type SellHorizon = Readonly<{
  days: 7 | 30 | 90 | 180 | 365 | number;
  rawProjectedNet: Money;
  confidence: number;
  evidence: readonly ForecastEvidence[];
}>;
type SellTimingInput = Readonly<{
  currentEstimatedNet: Money;
  cutoff: string;
  horizons: readonly SellHorizon[];
}>;

export function calculateSellTiming(input: SellTimingInput) {
  if (input.currentEstimatedNet.minor <= 0n) throw new Error('Current estimated net must be positive');
  const cutoff = Date.parse(input.cutoff);
  if (Number.isNaN(cutoff)) throw new Error('Invalid prediction cutoff');

  const horizons = input.horizons.map((horizon) => {
    const validEvidence = horizon.evidence.filter((item) => Date.parse(item.publishedAt) <= cutoff);
    const rejectedLookahead = validEvidence.length !== horizon.evidence.length;
    const supported = validEvidence.length > 0 && horizon.confidence > 0;
    return Object.freeze({
      ...horizon,
      evidence: Object.freeze(validEvidence),
      supported,
      warnings: Object.freeze(rejectedLookahead ? ['LOOKAHEAD_EVIDENCE_REJECTED'] : []),
      adjustedProjectedNet: confidenceAdjustedValue(input.currentEstimatedNet, horizon.rawProjectedNet, horizon.confidence),
    });
  });
  const supported = horizons.filter((horizon) => horizon.supported);
  if (supported.length === 0) {
    return Object.freeze({
      score: 0,
      sellNowAdvantage: 0,
      recommendation: 'NO RELIABLE TIMING SIGNAL' as const,
      bestFutureDays: null,
      confidencePercent: 0,
      horizons: Object.freeze(horizons),
    });
  }

  const best = supported.reduce((highest, horizon) =>
    horizon.adjustedProjectedNet.minor > highest.adjustedProjectedNet.minor ? horizon : highest,
  );
  const advantage = new Decimal(input.currentEstimatedNet.minor.toString())
    .minus(best.adjustedProjectedNet.minor.toString())
    .div(input.currentEstimatedNet.minor.toString());
  const rawScore = advantage.div(0.025).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const score = Math.max(-10, Math.min(10, rawScore));
  const recommendation = score >= 2
    ? 'SELL WITHIN 14 DAYS'
    : score <= -2
      ? `WAIT — BEST SUPPORTED WINDOW ${best.days} DAYS`
      : 'NO RELIABLE TIMING EDGE';
  return Object.freeze({
    score,
    sellNowAdvantage: advantage.toNumber(),
    recommendation,
    bestFutureDays: best.days,
    confidencePercent: Math.round(best.confidence * 100),
    horizons: Object.freeze(horizons),
  });
}