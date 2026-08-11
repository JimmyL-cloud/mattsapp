import Decimal from 'decimal.js';
import { multiplyMoney, type Money } from '@/lib/money/money';
import { buildMonthlySeasonality, type HistoricalNetObservation } from './seasonality';

type ForecastNetInput = Readonly<{
  currentEstimatedNet: Money;
  cutoff: string;
  history: readonly HistoricalNetObservation[];
  horizons: readonly number[];
}>;

export function forecastNetValues(input: ForecastNetInput) {
  const profile = buildMonthlySeasonality(input.history, input.cutoff);
  const cutoffTime = Date.parse(input.cutoff);
  if (Number.isNaN(cutoffTime)) throw new Error('Invalid forecast cutoff');
  const currentMonthNumber = new Date(cutoffTime).getUTCMonth() + 1;
  const currentMonth = profile.months[currentMonthNumber];
  const observations = new Map(input.history.map((item) => [item.id, item]));

  return input.horizons.map((days) => {
    const targetTime = cutoffTime + days * 86_400_000;
    const targetMonthNumber = new Date(targetTime).getUTCMonth() + 1;
    const targetMonth = profile.months[targetMonthNumber];
    const supported = Boolean(
      currentMonth
      && targetMonth
      && currentMonth.sampleCount >= 2
      && targetMonth.sampleCount >= 2
      && currentMonth.distinctYears >= 2
      && targetMonth.distinctYears >= 2,
    );
    if (!supported || !currentMonth || !targetMonth) {
      return Object.freeze({
        days,
        rawProjectedNet: input.currentEstimatedNet,
        confidence: 0,
        evidence: Object.freeze([]),
      });
    }

    const factor = new Decimal(targetMonth.factor).div(currentMonth.factor);
    const sampleStrength = Math.min(currentMonth.sampleCount, targetMonth.sampleCount) / 4;
    const yearStrength = Math.min(currentMonth.distinctYears, targetMonth.distinctYears) / 3;
    const confidence = Number(Math.min(1, sampleStrength, yearStrength).toFixed(4));
    const evidenceIds = [...new Set([...currentMonth.evidenceIds, ...targetMonth.evidenceIds])];
    return Object.freeze({
      days,
      rawProjectedNet: multiplyMoney(input.currentEstimatedNet, factor),
      confidence,
      evidence: Object.freeze(evidenceIds.flatMap((id) => {
        const observation = observations.get(id);
        return observation ? [{ id, publishedAt: observation.publishedAt }] : [];
      })),
    });
  });
}