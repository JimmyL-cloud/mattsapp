import { describe, expect, it } from 'vitest';
import type { OutcomeEvaluation } from './evaluate-outcome';
import { calculatePerformance } from './metrics';

function evaluation(snapshotId: string, isDemo: boolean): OutcomeEvaluation {
  return {
    snapshotId, decisionId: `decision:${snapshotId}`, userId: 'owner', horizonDays: 30,
    maturityAt: '2026-08-12T00:00:00.000Z', evaluatedAt: '2026-08-12T00:00:00.000Z',
    status: 'MATURED', reason: null, purchaseStatus: 'PURCHASED', currency: 'USD', isDemo,
    baselineValueMinor: 10_000n, predictedValueMinor: 11_000n, actualValueMinor: 10_500n,
    offerAllInMinor: 9_000n, modelAbsoluteErrorMinor: 500n, modelAbsolutePercentageError: 4.76,
    modelDirectionCorrect: true, modelUpProbability: 0.7, actualDirectionUp: true, confidencePercent: 70,
    realizedProfitMinor: null, actualAllInMinor: 9_000n, counterfactualProfitMinor: 1_500n,
    counterfactualLabel: 'MARK-TO-MARKET — NOT REALIZED', modelCounterfactualProfitMinor: 1_500n,
    mattCounterfactualProfitMinor: 1_500n, modelValueAddedMinor: 0n, mattPredictedValueMinor: null,
    mattAbsoluteErrorMinor: null,
  };
}

describe('calculatePerformance data boundary', () => {
  it('keeps real and demo evaluations in separate scopes', () => {
    const rows = [evaluation('real', false), evaluation('demo', true)];
    const real = calculatePerformance(rows, { userId: 'owner', demoScope: 'REAL_ONLY' });
    const demo = calculatePerformance(rows, { userId: 'owner', demoScope: 'DEMO_ONLY' });

    expect(real.evaluationCount).toBe(1);
    expect(real.evaluations.map((row) => row.snapshotId)).toEqual(['real']);
    expect(demo.evaluationCount).toBe(1);
    expect(demo.evaluations.map((row) => row.snapshotId)).toEqual(['demo']);
  });
});
