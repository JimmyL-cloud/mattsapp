import type { OutcomeEvaluation } from './evaluate-outcome';

export type CalibrationBand = Readonly<{
  label: string;
  minimum: number;
  maximum: number;
  count: number;
  meanPredictedPercent: number | null;
  observedUpPercent: number | null;
}>;

const definitions = [
  { label: '0–19', minimum: 0, maximum: 19 },
  { label: '20–39', minimum: 20, maximum: 39 },
  { label: '40–59', minimum: 40, maximum: 59 },
  { label: '60–79', minimum: 60, maximum: 79 },
  { label: '80–100', minimum: 80, maximum: 100 },
] as const;

function rounded(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateCalibration(evaluations: readonly OutcomeEvaluation[]): readonly CalibrationBand[] {
  return Object.freeze(definitions.map((definition) => {
    const rows = evaluations.filter((row) => row.confidencePercent >= definition.minimum && row.confidencePercent <= definition.maximum && row.actualDirectionUp !== null);
    return Object.freeze({
      ...definition,
      count: rows.length,
      meanPredictedPercent: rows.length ? rounded(rows.reduce((sum, row) => sum + row.modelUpProbability * 100, 0) / rows.length) : null,
      observedUpPercent: rows.length ? rounded(rows.filter((row) => row.actualDirectionUp).length / rows.length * 100) : null,
    });
  }));
}