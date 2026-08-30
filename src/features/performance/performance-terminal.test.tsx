// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OutcomeEvaluation } from './evaluate-outcome';
import { PerformanceTerminal } from './performance-terminal';

const realOutcome: OutcomeEvaluation = {
  snapshotId: 'snapshot:real-render', decisionId: 'decision:real-render', userId: 'owner', horizonDays: 30,
  maturityAt: '2026-08-12T00:00:00.000Z', evaluatedAt: '2026-08-12T00:00:00.000Z',
  status: 'MATURED', reason: null, purchaseStatus: 'PURCHASED', currency: 'USD', isDemo: false,
  baselineValueMinor: 10_000n, predictedValueMinor: 11_000n, actualValueMinor: 10_500n,
  offerAllInMinor: 9_000n, modelAbsoluteErrorMinor: 500n, modelAbsolutePercentageError: 4.76,
  modelDirectionCorrect: true, modelUpProbability: 0.7, actualDirectionUp: true, confidencePercent: 70,
  realizedProfitMinor: 1_000n, actualAllInMinor: 9_000n, counterfactualProfitMinor: 1_500n,
  counterfactualLabel: 'MARK-TO-MARKET — NOT REALIZED', modelCounterfactualProfitMinor: 1_500n,
  mattCounterfactualProfitMinor: 1_500n, modelValueAddedMinor: 0n, mattPredictedValueMinor: null,
  mattAbsoluteErrorMinor: null,
};

describe('PerformanceTerminal real outcome rendering', () => {
  it('renders a real matured outcome without demo labeling or the empty state', () => {
    render(<PerformanceTerminal userId="owner" evaluations={[realOutcome]} demoMode={false} />);

    expect(screen.getByText(/REAL DATA/)).toBeVisible();
    expect(screen.getByText(/1 ROWS .* 0 INCOMPLETE/)).toBeVisible();
    expect(screen.getByText('$10.00')).toBeVisible();
    expect(screen.queryByText('No matured outcomes yet')).not.toBeInTheDocument();
    expect(screen.queryByText(/DEMO \/ PLACEHOLDER/)).not.toBeInTheDocument();
  });
});
