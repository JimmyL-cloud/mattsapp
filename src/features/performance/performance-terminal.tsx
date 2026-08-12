'use client';

import { useMemo, useState } from 'react';
import { hindsightWarning } from './benchmarks';
import type { OutcomeEvaluation } from './evaluate-outcome';
import { calculatePerformance } from './metrics';
import { PerformanceTable } from './performance-table';

function money(minor: bigint | null, currency = 'USD'): string {
  return minor === null ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
}

function metric(value: number | null, suffix = ''): string {
  return value === null ? 'N/A' : `${value.toFixed(2)}${suffix}`;
}

export function PerformanceTerminal({
  userId,
  evaluations,
  demoMode = true,
}: {
  userId: string;
  evaluations: readonly OutcomeEvaluation[];
  demoMode?: boolean;
}) {
  const [horizon, setHorizon] = useState('ALL');
  const [followThrough, setFollowThrough] = useState('ALL');
  const filtered = useMemo(() => evaluations.filter((row) =>
    (horizon === 'ALL' || row.horizonDays === Number(horizon))
    && (followThrough === 'ALL' || row.purchaseStatus === followThrough),
  ), [evaluations, horizon, followThrough]);
  const summary = useMemo(() => calculatePerformance(filtered, {
    userId,
    demoScope: demoMode ? 'DEMO_ONLY' : 'REAL_ONLY',
  }), [demoMode, filtered, userId]);
  const currency = filtered[0]?.currency ?? 'USD';

  if (evaluations.length === 0) return <div className="performance-grid"><section className="panel performance-heading wide"><div><h1>Matt vs Model</h1><span className="muted">REAL DATA · OUT-OF-SAMPLE OUTCOME LEDGER</span></div></section><section className="panel empty-state wide"><h2>No matured outcomes yet</h2><p>Performance appears only after real decisions reach an evaluation horizon. No synthetic benchmarks or placeholder scores are shown.</p><a className="primary-button" href="/history">Review analysis history</a></section></div>;

  return <div className="performance-grid">
    <section className="panel performance-heading wide">
      <div><h1>Matt vs Model</h1><span className="muted">{demoMode ? 'DEMO / PLACEHOLDER' : 'REAL DATA'} · OUT-OF-SAMPLE OUTCOME LEDGER</span></div>
      <div className="performance-filters"><label>Horizon<select aria-label="Horizon" value={horizon} onChange={(event) => setHorizon(event.target.value)}><option>ALL</option>{[7, 30, 90, 180, 365].map((days) => <option key={days} value={days}>{days} DAYS</option>)}</select></label><label>Follow-through<select aria-label="Follow-through" value={followThrough} onChange={(event) => setFollowThrough(event.target.value)}><option>ALL</option>{['UNDECIDED', 'PURCHASED', 'PASSED', 'MISSED', 'CANCELLED'].map((status) => <option key={status}>{status}</option>)}</select></label></div>
    </section>
    <section className="performance-summary wide">
      <article className="signal"><h2>REALIZED P/L — PURCHASED ONLY</h2><strong className={summary.realizedProfitMinor >= 0n ? 'positive' : 'negative'}>{money(summary.realizedProfitMinor, currency)}</strong><span>{summary.purchasedCount} PURCHASED · {summary.realizedRoiBps === null ? 'N/A' : `${(summary.realizedRoiBps / 100).toFixed(2)}% ROI`}</span></article>
      <article className="signal"><h2>COUNTERFACTUAL — NOT REALIZED</h2><strong>{money(summary.modelValueAddedMinor, currency)}</strong><span>MODEL VALUE ADDED VS MATT</span></article>
      <article className="signal"><h2>FORECAST ERROR</h2><strong>{metric(summary.meanAbsolutePercentageError, '%')}</strong><span>MAPE · MEDIAN {money(summary.medianAbsoluteErrorMinor, currency)}</span></article>
    </section>
    <section className="panel metric-strip wide"><div><span>DIRECTION ACCURACY</span><strong>{metric(summary.directionAccuracyPercent, '%')}</strong></div><div><span>BRIER SCORE</span><strong>{metric(summary.brierScore)}</strong></div><div><span>MAX DRAWDOWN</span><strong>{money(summary.maximumDrawdownMinor, currency)}</strong></div><div><span>MATURED / PENDING</span><strong>{summary.maturedCount} / {summary.pendingCount}</strong></div></section>
    <section className="panel wide"><div className="panel-heading"><h2>IMMUTABLE PERFORMANCE LEDGER</h2><span>{filtered.length} ROWS · {summary.incompleteCount} INCOMPLETE</span></div><PerformanceTable rows={filtered} /></section>
    <section className="panel calibration-panel"><h2>Confidence Calibration</h2><div className="calibration-chart" role="img" aria-label="Predicted probability compared with observed up rate by confidence band">{summary.calibration.map((band) => <div key={band.label}><span>{band.label}</span><i style={{ width: `${band.meanPredictedPercent ?? 0}%` }} /><b style={{ width: `${band.observedUpPercent ?? 0}%` }} /></div>)}</div></section>
    <section className="panel table-scroll"><h2>CALIBRATION TABLE VIEW</h2><table><thead><tr><th>BAND</th><th>N</th><th>PREDICTED</th><th>OBSERVED UP</th><th>GAP</th></tr></thead><tbody>{summary.calibration.map((band) => <tr key={band.label}><td>{band.label}</td><td>{band.count}</td><td>{metric(band.meanPredictedPercent, '%')}</td><td>{metric(band.observedUpPercent, '%')}</td><td>{band.meanPredictedPercent === null || band.observedUpPercent === null ? 'N/A' : metric(band.observedUpPercent - band.meanPredictedPercent, ' PP')}</td></tr>)}</tbody></table></section>
    <section className="panel wide hindsight-warning"><strong>{hindsightWarning}</strong><span>Shown only as a retrospective upper bound; it is never scored as a forecast.</span></section>
  </div>;
}
