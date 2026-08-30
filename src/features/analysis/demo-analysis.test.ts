import { describe, expect, it } from 'vitest';
import { createDemoAnalysis } from './demo-analysis';

describe('demo analysis', () => {
  it('returns separate deal, timing, confidence, comp, and audit outputs', () => {
    const result = createDemoAnalysis();
    expect(result.isDemo).toBe(true);
    expect(result.dealScore.score).toBeGreaterThanOrEqual(-10);
    expect(result.dealScore.score).toBeLessThanOrEqual(10);
    expect(result.confidence.percent).toBeGreaterThanOrEqual(0);
    expect(result.confidence.percent).toBeLessThanOrEqual(100);
    expect(result.includedComps.length).toBeGreaterThan(0);
    expect(result.excludedComps.length).toBeGreaterThan(0);
    expect(result.calculationSteps.length).toBeGreaterThan(5);
  });
});
