import type { OutcomeEvaluation } from './evaluate-outcome';

export const hindsightWarning = 'HINDSIGHT — NOT AN ACHIEVABLE FORECAST' as const;

export function calculateBenchmarks(evaluation: OutcomeEvaluation) {
  if (evaluation.status !== 'MATURED' || evaluation.actualValueMinor === null) return null;
  const holdProfitMinor = evaluation.actualValueMinor - evaluation.offerAllInMinor;
  return Object.freeze({
    modelProfitMinor: evaluation.modelCounterfactualProfitMinor,
    mattProfitMinor: evaluation.mattCounterfactualProfitMinor,
    simpleBuyAndHoldProfitMinor: holdProfitMinor,
    hindsightBestMinor: holdProfitMinor > 0n ? holdProfitMinor : 0n,
    hindsightLabel: hindsightWarning,
  });
}