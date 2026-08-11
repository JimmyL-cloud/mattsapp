import { evaluateOutcome, type OutcomeEvaluation } from './evaluate-outcome';

function matureRow({
  id,
  horizonDays,
  purchaseStatus,
  predictedValueMinor,
  actualValueMinor,
  offerAllInMinor,
  actualAllInMinor,
  confidencePercent,
  upProbability,
  saleNetMinor,
}: {
  id: string;
  horizonDays: number;
  purchaseStatus: 'PURCHASED' | 'PASSED' | 'MISSED' | 'CANCELLED';
  predictedValueMinor: bigint;
  actualValueMinor: bigint;
  offerAllInMinor: bigint;
  actualAllInMinor: bigint | null;
  confidencePercent: number;
  upProbability: number;
  saleNetMinor?: bigint;
}): OutcomeEvaluation {
  const cutoff = '2025-01-01T12:00:00Z';
  const maturity = new Date(Date.parse(cutoff) + horizonDays * 86_400_000);
  const markTime = new Date(maturity.getTime() + 3_600_000).toISOString();
  return evaluateOutcome({
    snapshot: {
      id: `DEMO-${id}`, userId: 'DEMO-OWNER', predictionCutoff: cutoff, horizonDays,
      baselineValueMinor: 10_000n, predictedValueMinor, offerAllInMinor, confidencePercent,
      upProbability, evidencePublishedAt: ['2024-12-31T12:00:00Z'], currency: 'USD', isDemo: true,
    },
    decision: {
      id: `DEMO-DECISION-${id}`, purchaseStatus, actualAllInMinor,
      mattPredictedValueMinor: predictedValueMinor - 500n, mattUpProbability: Math.max(0, upProbability - .1),
    },
    marketAtHorizon: {
      id: `DEMO-MARK-${id}`, observedAt: markTime, publishedAt: markTime,
      valueMinor: actualValueMinor, currency: 'USD', isDemo: true,
    },
    saleOutcome: saleNetMinor === undefined ? undefined : { netProceedsMinor: saleNetMinor, occurredAt: markTime },
    evaluatedAt: new Date(maturity.getTime() + 86_400_000).toISOString(),
  });
}

export function createDemoPerformance() {
  const rows: OutcomeEvaluation[] = [
    matureRow({ id: 'PERF-001', horizonDays: 7, purchaseStatus: 'PURCHASED', predictedValueMinor: 12_000n, actualValueMinor: 12_500n, offerAllInMinor: 9_000n, actualAllInMinor: 9_200n, confidencePercent: 84, upProbability: .82, saleNetMinor: 11_800n }),
    matureRow({ id: 'PERF-002', horizonDays: 30, purchaseStatus: 'PURCHASED', predictedValueMinor: 11_000n, actualValueMinor: 9_800n, offerAllInMinor: 8_800n, actualAllInMinor: 9_000n, confidencePercent: 72, upProbability: .68, saleNetMinor: 9_400n }),
    matureRow({ id: 'PERF-003', horizonDays: 30, purchaseStatus: 'PASSED', predictedValueMinor: 9_500n, actualValueMinor: 8_600n, offerAllInMinor: 9_000n, actualAllInMinor: null, confidencePercent: 61, upProbability: .35 }),
    matureRow({ id: 'PERF-004', horizonDays: 90, purchaseStatus: 'MISSED', predictedValueMinor: 13_000n, actualValueMinor: 14_500n, offerAllInMinor: 9_500n, actualAllInMinor: null, confidencePercent: 77, upProbability: .79 }),
    matureRow({ id: 'PERF-005', horizonDays: 180, purchaseStatus: 'CANCELLED', predictedValueMinor: 10_500n, actualValueMinor: 10_100n, offerAllInMinor: 10_000n, actualAllInMinor: null, confidencePercent: 48, upProbability: .55 }),
  ];
  rows.push(evaluateOutcome({
    snapshot: {
      id: 'DEMO-PERF-PENDING', userId: 'DEMO-OWNER', predictionCutoff: '2026-08-01T12:00:00Z', horizonDays: 365,
      baselineValueMinor: 10_000n, predictedValueMinor: 12_000n, offerAllInMinor: 9_000n, confidencePercent: 58,
      upProbability: .65, evidencePublishedAt: ['2026-08-01T11:00:00Z'], currency: 'USD', isDemo: true,
    },
    decision: { id: 'DEMO-DECISION-PENDING', purchaseStatus: 'UNDECIDED', actualAllInMinor: null, mattPredictedValueMinor: null, mattUpProbability: null },
    marketAtHorizon: null,
    evaluatedAt: '2026-08-10T12:00:00Z',
  }));
  rows.push(evaluateOutcome({
    snapshot: {
      id: 'DEMO-PERF-INCOMPLETE', userId: 'DEMO-OWNER', predictionCutoff: '2025-01-01T12:00:00Z', horizonDays: 30,
      baselineValueMinor: 10_000n, predictedValueMinor: 11_000n, offerAllInMinor: 9_500n, confidencePercent: 43,
      upProbability: .58, evidencePublishedAt: ['2024-12-31T12:00:00Z'], currency: 'USD', isDemo: true,
    },
    decision: { id: 'DEMO-DECISION-INCOMPLETE', purchaseStatus: 'PASSED', actualAllInMinor: null, mattPredictedValueMinor: null, mattUpProbability: null },
    marketAtHorizon: null,
    evaluatedAt: '2026-08-10T12:00:00Z',
  }));
  return Object.freeze({ userId: 'DEMO-OWNER', evaluations: Object.freeze(rows) });
}