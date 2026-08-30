import Decimal from 'decimal.js';
import { CalculationTape } from '@/lib/audit/calculation-tape';

export type ValuationComp = {
  id: string;
  allInMinor: bigint;
  match: number;
  ageDays: number;
  sourceQuality?: number;
  verification?: number;
};

type WeightedComp = ValuationComp & {
  recencyWeight: number;
  matchWeight: number;
  sourceQualityWeight: number;
  verificationWeight: number;
  weight: number;
};

function assertUnitFactor(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1`);
}

function weightedPercentile(comps: readonly WeightedComp[], percentile: number, totalWeight: number): bigint {
  const threshold = totalWeight * percentile;
  let cumulative = 0;
  for (const comp of comps) {
    cumulative += comp.weight;
    if (cumulative >= threshold) return comp.allInMinor;
  }
  return comps.at(-1)!.allInMinor;
}

export function calculateDealScore(currentAllIn: bigint, fairCenter: bigint) {
  if (fairCenter <= 0n) throw new Error('Fair value must be positive');
  const discount = new Decimal(fairCenter.toString()).minus(currentAllIn.toString()).div(fairCenter.toString());
  const raw = discount.div('.04').toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  return { score: Math.max(-10, Math.min(10, raw)), discountPercent: discount.mul(100).toNumber(), formula:'clamp(round(((fair-current)/fair)/0.04), -10, 10)' };
}

export function calculateFairValue(input: ValuationComp[]) {
  if (!input.length) throw new Error('At least one comp is required');
  const comps = input.map((comp): WeightedComp => {
    const sourceQualityWeight = comp.sourceQuality ?? 1;
    const verificationWeight = comp.verification ?? 1;
    assertUnitFactor('match', comp.match);
    assertUnitFactor('sourceQuality', sourceQualityWeight);
    assertUnitFactor('verification', verificationWeight);
    if (!Number.isFinite(comp.ageDays) || comp.ageDays < 0) throw new Error('ageDays must be non-negative');
    const recencyWeight = Math.exp(-comp.ageDays / 180);
    const matchWeight = comp.match ** 2;
    return {
      ...comp,
      recencyWeight,
      matchWeight,
      sourceQualityWeight,
      verificationWeight,
      weight: recencyWeight * matchWeight * sourceQualityWeight * verificationWeight,
    };
  }).sort((a,b) => a.allInMinor < b.allInMinor ? -1 : a.allInMinor > b.allInMinor ? 1 : a.id.localeCompare(b.id));
  const total = comps.reduce((sum, comp) => sum + comp.weight, 0);
  if (total <= 0) throw new Error('At least one comp must have positive weight');
  const lowMinor = weightedPercentile(comps, .25, total);
  const centerMinor = weightedPercentile(comps, .5, total);
  const highMinor = weightedPercentile(comps, .75, total);
  const tape = new CalculationTape().append({
    key:'fair_value', label:'Weighted fair-value range', formula:'weightedPercentile(allIn, exp(-ageDays/180) × match² × sourceQuality × verification)',
    inputs:{ comps:comps.map(c => ({
      id:c.id,
      allInMinor:c.allInMinor,
      match:c.match,
      ageDays:c.ageDays,
      recencyWeight:Number(c.recencyWeight.toFixed(8)),
      matchWeight:Number(c.matchWeight.toFixed(8)),
      sourceQualityWeight:c.sourceQualityWeight,
      verificationWeight:c.verificationWeight,
      weight:Number(c.weight.toFixed(8)),
    })) },
    output:{ lowMinor, centerMinor, highMinor }, unit:'minor currency units'
  });
  return { lowMinor, centerMinor, highMinor, comps, totalWeight: total, tape };
}

export type ResaleDealSignal = 'RED' | 'AMBER' | 'GREEN';

/**
 * Scores the resale proposition, not the card's market value. A four point
 * return difference is one score point, so the target return is always zero.
 */
export function calculateResaleDealScore(roiBps: number, targetRoiBps = 1_500) {
  if (!Number.isFinite(roiBps)) throw new Error('ROI must be finite');
  if (!Number.isFinite(targetRoiBps) || targetRoiBps < 0) throw new Error('Target ROI must be non-negative');
  const rawScore = new Decimal(roiBps - targetRoiBps).div(400).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const score = Math.max(-10, Math.min(10, rawScore));
  const signal: ResaleDealSignal = roiBps < 0 ? 'RED' : roiBps < targetRoiBps ? 'AMBER' : 'GREEN';
  return Object.freeze({
    score,
    roiBps,
    targetRoiBps,
    signal,
    formula: 'clamp(round((roi_bps-target_roi_bps)/400), -10, 10)',
  });
}

/**
 * Collector value is a factual comparison only. It deliberately has no
 * recommendation or red/green signal because it excludes transaction costs.
 */
export function calculateCollectorValue(askingPriceMinor: bigint, fairCenterMinor: bigint) {
  if (fairCenterMinor <= 0n) throw new Error('Fair value must be positive');
  const differenceMinor = fairCenterMinor - askingPriceMinor;
  const differencePercent = new Decimal(differenceMinor.toString()).div(fairCenterMinor.toString()).mul(100).toNumber();
  return Object.freeze({
    askingPriceMinor,
    fairCenterMinor,
    differenceMinor,
    differencePercent,
    signal: 'EVIDENCE_ONLY' as const,
    formula: '(fair_center-card_only_asking_price)/fair_center',
  });
}
