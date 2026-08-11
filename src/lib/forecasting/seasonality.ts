import Decimal from 'decimal.js';
import type { Money } from '@/lib/money/money';

export type HistoricalNetObservation = Readonly<{
  id: string;
  occurredAt: string;
  publishedAt: string;
  net: Money;
}>;

export type SeasonalityMonth = Readonly<{
  month: number;
  factor: number;
  sampleCount: number;
  distinctYears: number;
  evidenceIds: readonly string[];
}>;

function median(values: readonly Decimal[]): Decimal {
  if (values.length === 0) throw new Error('Median requires observations');
  const sorted = [...values].sort((left, right) => left.comparedTo(right));
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : sorted[middle - 1].plus(sorted[middle]).div(2);
}

export function buildMonthlySeasonality(
  history: readonly HistoricalNetObservation[],
  cutoff: string,
): { months: Readonly<Record<number, SeasonalityMonth>>; rejectedLookaheadIds: readonly string[] } {
  const cutoffTime = Date.parse(cutoff);
  if (Number.isNaN(cutoffTime)) throw new Error('Invalid seasonality cutoff');
  const rejectedLookaheadIds: string[] = [];
  const valid = history.filter((observation) => {
    const occurred = Date.parse(observation.occurredAt);
    const published = Date.parse(observation.publishedAt);
    if (Number.isNaN(occurred) || Number.isNaN(published)) throw new Error(`Invalid observation timestamp: ${observation.id}`);
    const allowed = occurred <= cutoffTime && published <= cutoffTime;
    if (!allowed) rejectedLookaheadIds.push(observation.id);
    return allowed;
  });
  if (valid.length === 0) return { months: Object.freeze({}), rejectedLookaheadIds: Object.freeze(rejectedLookaheadIds) };

  const currency = valid[0].net.currency;
  if (valid.some((observation) => observation.net.currency !== currency)) throw new Error('Currency mismatch in seasonality history');
  const byYear = new Map<number, HistoricalNetObservation[]>();
  for (const observation of valid) {
    const year = new Date(observation.occurredAt).getUTCFullYear();
    byYear.set(year, [...(byYear.get(year) ?? []), observation]);
  }
  const yearMedians = new Map<number, Decimal>();
  for (const [year, observations] of byYear) {
    yearMedians.set(year, median(observations.map((item) => new Decimal(item.net.minor.toString()))));
  }

  const byMonth = new Map<number, Array<{ observation: HistoricalNetObservation; normalized: Decimal; year: number }>>();
  for (const observation of valid) {
    const date = new Date(observation.occurredAt);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const yearMedian = yearMedians.get(year);
    if (!yearMedian || yearMedian.isZero()) continue;
    const item = { observation, normalized: new Decimal(observation.net.minor.toString()).div(yearMedian), year };
    byMonth.set(month, [...(byMonth.get(month) ?? []), item]);
  }

  const months: Record<number, SeasonalityMonth> = {};
  for (const [month, observations] of byMonth) {
    months[month] = Object.freeze({
      month,
      factor: median(observations.map((item) => item.normalized)).toNumber(),
      sampleCount: observations.length,
      distinctYears: new Set(observations.map((item) => item.year)).size,
      evidenceIds: Object.freeze(observations.map((item) => item.observation.id)),
    });
  }
  return { months: Object.freeze(months), rejectedLookaheadIds: Object.freeze(rejectedLookaheadIds) };
}