import { describe, expect, it } from 'vitest';
import type { OutcomeEvaluation } from './evaluate-outcome';
import { calculatePerformance } from './metrics';

function row(horizonDays: number, currency = 'USD'): OutcomeEvaluation {
  return { snapshotId: `snapshot:${horizonDays}`, decisionId: 'decision:one', userId: 'owner', horizonDays,
    maturityAt: `2026-08-${String(10 + horizonDays / 30).padStart(2, '0')}T00:00:00.000Z`, evaluatedAt: `2026-08-${String(10 + horizonDays / 30).padStart(2, '0')}T00:00:00.000Z`,
    status: 'MATURED', reason: null, purchaseStatus: 'PURCHASED', currency, isDemo: false,
    baselineValueMinor: 10_000n, predictedValueMinor: 11_000n, actualValueMinor: 12_000n, offerAllInMinor: 9_000n,
    modelAbsoluteErrorMinor: 1_000n, modelAbsolutePercentageError: 8.33, modelDirectionCorrect: true,
    modelUpProbability: 0.7, actualDirectionUp: true, confidencePercent: 70, realizedProfitMinor: 2_000n,
    actualAllInMinor: 9_000n, counterfactualProfitMinor: 3_000n, counterfactualLabel: null,
    modelCounterfactualProfitMinor: 3_000n, mattCounterfactualProfitMinor: 3_000n, modelValueAddedMinor: 500n,
    mattPredictedValueMinor: null, mattAbsoluteErrorMinor: null };
}

describe('Performance Task 3 financial boundaries', () => {
  it('counts one realized decision once across several horizons', () => {
    const summary = calculatePerformance([row(30), row(90)], { userId: 'owner', demoScope: 'REAL_ONLY' });
    expect(summary.maturedCount).toBe(2);
    expect(summary.purchasedCount).toBe(1);
    expect(summary.realizedProfitMinor).toBe(2_000n);
    expect(summary.realizedCostMinor).toBe(9_000n);
    expect(summary.modelValueAddedMinor).toBe(500n);
  });

  it('rejects mixed-currency monetary aggregation without a filter', () => {
    expect(() => calculatePerformance([row(30), { ...row(90), decisionId: 'decision:two', currency: 'CAD' }], { userId: 'owner', demoScope: 'REAL_ONLY' })).toThrow('single currency');
  });
});
