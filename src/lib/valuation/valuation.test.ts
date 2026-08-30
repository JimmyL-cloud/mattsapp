import { describe, expect, it } from 'vitest';
import { calculateCollectorValue, calculateDealScore, calculateFairValue, calculateResaleDealScore } from './valuation';

describe('valuation', () => {
  it('produces a bounded deal score from current price and fair value', () => {
    expect(calculateDealScore(8_000n, 10_000n).score).toBe(5);
    expect(calculateDealScore(1_000n, 10_000n).score).toBe(10);
    expect(calculateDealScore(20_000n, 10_000n).score).toBe(-10);
  });

  it('keeps the weighted fair-value range ordered and auditable', () => {
    const result = calculateFairValue([
      { id: 'a', allInMinor: 8_000n, match: 1, ageDays: 10 },
      { id: 'b', allInMinor: 10_000n, match: 1, ageDays: 20 },
      { id: 'c', allInMinor: 12_000n, match: 1, ageDays: 30 },
    ]);
    expect(result.lowMinor <= result.centerMinor).toBe(true);
    expect(result.centerMinor <= result.highMinor).toBe(true);
    expect(result.tape.steps).toHaveLength(1);
  });

  it('keeps collector value evidence-only and grades resale return against target ROI', () => {
    const collector = calculateCollectorValue(8_000n, 10_000n);
    expect(collector.signal).toBe('EVIDENCE_ONLY');
    expect(collector.differencePercent).toBe(20);

    expect(calculateResaleDealScore(1_500).score).toBe(0);
    expect(calculateResaleDealScore(1_900).score).toBe(1);
    expect(calculateResaleDealScore(-1, 1_500).signal).toBe('RED');
    expect(calculateResaleDealScore(1_000, 1_500).signal).toBe('AMBER');
    expect(calculateResaleDealScore(1_500, 1_500).signal).toBe('GREEN');
    expect(calculateResaleDealScore(100_000, 1_500).score).toBe(10);
  });
});
