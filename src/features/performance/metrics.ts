import type { DemoScope } from '@/lib/demo/policy';
import type { PurchaseStatus } from '@/features/portfolio/purchase-status';
import { calculateCalibration } from './calibration';
import type { OutcomeEvaluation } from './evaluate-outcome';

type PerformanceFilters = {
  userId: string;
  demoScope: DemoScope;
  horizons?: readonly number[];
  purchaseStatuses?: readonly PurchaseStatus[];
};

function average(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function rounded(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(2));
}

function median(values: readonly bigint[]): bigint | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2n;
}

function maximumDrawdown(rows: readonly OutcomeEvaluation[]): bigint {
  let cumulative = 0n;
  let peak = 0n;
  let drawdown = 0n;
  for (const row of [...rows].sort((left, right) => Date.parse(left.maturityAt) - Date.parse(right.maturityAt))) {
    if (row.realizedProfitMinor === null) continue;
    cumulative += row.realizedProfitMinor;
    if (cumulative > peak) peak = cumulative;
    const currentDrawdown = peak - cumulative;
    if (currentDrawdown > drawdown) drawdown = currentDrawdown;
  }
  return drawdown;
}

export function calculatePerformance(evaluations: readonly OutcomeEvaluation[], filters: PerformanceFilters) {
  const scoped = evaluations.filter((row) =>
    row.userId === filters.userId
    && row.isDemo === (filters.demoScope === 'DEMO_ONLY')
    && (!filters.horizons?.length || filters.horizons.includes(row.horizonDays))
    && (!filters.purchaseStatuses?.length || filters.purchaseStatuses.includes(row.purchaseStatus)),
  );
  const matured = scoped.filter((row) => row.status === 'MATURED');
  const realizedRows = matured.filter((row) => row.realizedProfitMinor !== null && row.actualAllInMinor !== null);
  const realizedProfitMinor = realizedRows.reduce((sum, row) => sum + row.realizedProfitMinor!, 0n);
  const realizedCostMinor = realizedRows.reduce((sum, row) => sum + row.actualAllInMinor!, 0n);
  const percentageErrors = matured.flatMap((row) => row.modelAbsolutePercentageError === null ? [] : [row.modelAbsolutePercentageError]);
  const directionRows = matured.filter((row) => row.modelDirectionCorrect !== null);
  const brierRows = matured.filter((row) => row.actualDirectionUp !== null);
  const brierScore = average(brierRows.map((row) => {
    const actual = row.actualDirectionUp ? 1 : 0;
    return (row.modelUpProbability - actual) ** 2;
  }));

  return Object.freeze({
    evaluationCount: scoped.length,
    pendingCount: scoped.filter((row) => row.status === 'PENDING').length,
    incompleteCount: scoped.filter((row) => row.status === 'INCOMPLETE').length,
    invalidatedCount: scoped.filter((row) => row.status === 'INVALIDATED').length,
    maturedCount: matured.length,
    purchasedCount: matured.filter((row) => row.purchaseStatus === 'PURCHASED').length,
    realizedProfitMinor,
    realizedCostMinor,
    realizedRoiBps: realizedCostMinor === 0n ? null : Number(realizedProfitMinor * 10_000n / realizedCostMinor),
    meanAbsolutePercentageError: rounded(average(percentageErrors)),
    medianAbsoluteErrorMinor: median(matured.flatMap((row) => row.modelAbsoluteErrorMinor === null ? [] : [row.modelAbsoluteErrorMinor])),
    directionAccuracyPercent: rounded(directionRows.length ? directionRows.filter((row) => row.modelDirectionCorrect).length / directionRows.length * 100 : null),
    brierScore: brierScore === null ? null : Number(brierScore.toFixed(8)),
    modelValueAddedMinor: matured.reduce((sum, row) => sum + (row.modelValueAddedMinor ?? 0n), 0n),
    maximumDrawdownMinor: maximumDrawdown(matured),
    calibration: calculateCalibration(matured),
    evaluations: Object.freeze(matured),
  });
}