'use client';

import { useState } from 'react';
import type { PurchaseStatus } from '@/features/portfolio/purchase-status';
import { cardLabel, list, money, number, object, text, type AnalysisRecord } from './analysis-record';

function signed(value: number): string { return `${value > 0 ? '+' : ''}${value}`; }
function signalClass(signal: string): string { return signal === 'GREEN' ? 'positive' : signal === 'RED' ? 'negative' : signal === 'AMBER' ? 'amber' : ''; }
function formattedOutput(value: unknown, unit: string, currency: string): string {
  if (unit.includes('minor currency') && (typeof value === 'string' || typeof value === 'number')) return money(value, currency);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function AnalysisResultView({ initialAnalysis, onChange }: { initialAnalysis: AnalysisRecord; onChange?: (analysis: AnalysisRecord) => void }) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [watchSaved, setWatchSaved] = useState(false);
  const result = object(analysis.result);
  const collector = object(result.collectorValue);
  const resale = object(result.resaleDeal);
  const confidence = object(result.confidence);
  const fair = object(result.fairValue);
  const scenario = object(result.scenario);
  const buyTiming = object(result.buyTiming);
  const sellTiming = object(result.sellTiming);
  const currentOffer = object(result.currentOffer);
  const currentAllIn = object(result.currentAllIn);
  const currency = text(currentAllIn.currency, analysis.currency);
  const comps = list(result.rawComps).map(object);
  const forecasts = list(result.forecasts).map(object);
  const calculations = list(result.calculationSteps).map(object);
  const timingHorizons = list(sellTiming.horizons).map(object);

  async function decision(status: PurchaseStatus) {
    setBusyAction(status);
    setMessage(null);
    try {
      const response = await fetch(`/api/analyses/${encodeURIComponent(analysis.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.analysis) throw new Error(typeof body.error === 'string' ? body.error : 'Could not save decision');
      setAnalysis(body.analysis as AnalysisRecord);
      onChange?.(body.analysis as AnalysisRecord);
      setMessage(`Decision saved: ${status}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Network error; decision was not changed.');
    } finally {
      setBusyAction(null);
    }
  }

  async function saveWatchlist() {
    setBusyAction('WATCHLIST');
    setMessage(null);
    try {
      const response = await fetch('/api/watchlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cardId: analysis.cardId, notes: `Analysis ${analysis.id}`, isStarred: false }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not save to watchlist');
      setWatchSaved(true);
      setMessage('Saved to watchlist');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Network error; the card was not saved.');
    } finally {
      setBusyAction(null);
    }
  }

  async function copyAnalysis() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
      setMessage('Analysis JSON copied');
    } catch {
      setMessage('Clipboard access failed.');
    }
  }

  return <div className="analysis-grid result-grid">
    <section className="panel title-panel wide">
      <div><h1>{cardLabel(analysis)}</h1><span className="muted">REAL ANALYSIS · {analysis.id} · CUTOFF {analysis.cutoff}</span></div>
      <div className="result-title-actions"><strong className="purchase">{analysis.purchaseStatus}</strong><button className="icon-button" type="button" onClick={copyAnalysis} aria-label="Copy analysis JSON" title="Copy analysis JSON">⧉</button></div>
    </section>

    <section className="signal intent-result collector-result">
      <h2>Collector Value <span className="intent-badge">EVIDENCE ONLY</span></h2>
      <strong>{number(collector.differencePercent).toFixed(1)}%</strong>
      <span>{money(collector.askingPriceMinor, currency)} ASK vs {money(collector.fairCenterMinor, currency)} FAIR<br />NO BUY RECOMMENDATION</span>
    </section>
    <section className={`signal intent-result ${signalClass(text(resale.signal, ''))}`}>
      <h2>Resale Deal <span className="intent-badge">{text(resale.signal)}</span></h2>
      <strong>{signed(number(resale.score))}</strong>
      <span>{(number(resale.roiBps) / 100).toFixed(1)}% ROI vs {(number(resale.targetRoiBps) / 100).toFixed(1)}% TARGET</span>
    </section>
    <section className="signal wide confidence-result">
      <h2>Evidence Confidence</h2><strong>{number(confidence.percent)}%</strong>
      <span>{comps.filter((comp) => comp.included === true).length} INCLUDED / {comps.length} RAW COMPS</span>
    </section>

    <section className="panel table-scroll"><h2>Price / Return Tape</h2><table><tbody>
      <tr><td>Card-only asking price</td><td>{money(object(currentOffer.priceOrBid).minor, currency)}</td></tr>
      <tr><td>All-in acquisition</td><td>{money(currentAllIn.minor, currency)}</td></tr>
      <tr><td>Evidence fair range</td><td>{money(fair.lowMinor, currency)} – {money(fair.highMinor, currency)}</td></tr>
      <tr><td>Evidence fair center</td><td>{money(fair.centerMinor, currency)}</td></tr>
      <tr><td>Expected net proceeds</td><td>{money(object(scenario.expectedNetProceeds).minor, currency)}</td></tr>
      <tr><td>Maximum buy at target ROI</td><td>{money(object(scenario.maximumPurchasePriceForTargetRoi).minor, currency)}</td></tr>
      <tr><td>Break-even gross sale</td><td>{money(object(scenario.breakEvenSalePrice).minor, currency)}</td></tr>
      <tr><td>Expected profit</td><td>{money(object(scenario.expectedProfit).minor, currency)}</td></tr>
    </tbody></table></section>
    <section className="panel table-scroll"><h2>Timing Outlook</h2><table><tbody>
      <tr><td>Buy timing</td><td>{text(buyTiming.action)}</td></tr><tr><td>Sell timing score</td><td>{signed(number(sellTiming.score))}</td></tr><tr><td>Sell recommendation</td><td>{text(sellTiming.recommendation)}</td></tr>
    </tbody></table><h3>Forecasts</h3>
      {forecasts.length ? <table><thead><tr><th>Horizon</th><th>Raw projected net</th><th>Confidence adjusted</th><th>Confidence</th></tr></thead><tbody>{forecasts.map((forecast, index) => { const adjusted = timingHorizons.find((horizon) => number(horizon.days) === number(forecast.days)); return <tr key={`${forecast.days}-${index}`}><td>{number(forecast.days)} DAYS</td><td>{money(object(forecast.rawProjectedNet).minor, currency)}</td><td>{money(object(adjusted?.adjustedProjectedNet).minor, currency)}</td><td>{Math.round(number(forecast.confidence) * 100)}%</td></tr>; })}</tbody></table> : <p className="muted">No supported forecast movement. Current evidence remains the baseline.</p>}
    </section>

    <section className="panel wide table-scroll" id="raw-comps"><div className="panel-heading"><h2>Evidence Ledger</h2><span>{comps.length} MANUAL RECORDS</span></div><table><thead><tr><th>Source / Listing</th><th>Date</th><th>Observed all-in</th><th>Match</th><th>Age</th><th>Status / Reasons</th></tr></thead><tbody>{comps.map((comp, index) => {
      const record = object(comp.record); const match = object(comp.match); const observed = object(comp.observedAllIn); const reasons = list(comp.exclusionCodes).map(String);
      const wasOverridden = typeof comp.manuallyIncluded === 'boolean';
      const automatic = comp.automaticallyIncluded === true ? 'AUTO: INCLUDED' : 'AUTO: EXCLUDED';
      const manual = wasOverridden ? `MANUAL: ${comp.manuallyIncluded === true ? 'FORCE INCLUDE' : 'EXCLUDE'}` : 'MANUAL: NONE';
      return <tr key={text(record.id, String(index))}><td>{text(record.sourceLabel)}<small>{text(record.listingTitle)}</small></td><td>{text(record.occurredAt).slice(0, 10)}</td><td>{money(observed.minor, currency)}</td><td>{(number(match.total) * 100).toFixed(0)}%</td><td>{number(comp.ageDays)}d</td><td className={comp.included === true ? 'positive' : 'amber'}>{comp.included === true ? 'INCLUDED' : 'EXCLUDED'}<small>{automatic} · {manual}</small><small>AUTO REASONS: {reasons.length ? reasons.join(' · ') : 'NONE'}</small>{wasOverridden ? <small>OVERRIDE: {text(comp.overrideReason, 'REASON MISSING')}</small> : null}</td></tr>;
    })}</tbody></table></section>

    <section className="panel wide table-scroll" id="calculation-tape"><div className="panel-heading"><h2>Calculation Tape</h2><span>FORMULA {text(result.formulaVersion)}</span></div><table><thead><tr><th># / Step</th><th>Formula</th><th>Output</th></tr></thead><tbody>{calculations.map((calculation, index) => <tr key={text(calculation.key, String(index))}><td>{number(calculation.sequence, index + 1)} · {text(calculation.label)}</td><td>{text(calculation.formula)}</td><td>{formattedOutput(calculation.output, text(calculation.unit, ''), currency)}</td></tr>)}</tbody></table></section>

    <section className="panel wide result-actions" aria-label="Save decision and watchlist actions"><button className="primary-button" type="button" disabled={busyAction !== null} onClick={() => decision('PURCHASED')}>Mark Purchased</button><button className="secondary-button" type="button" disabled={busyAction !== null} onClick={() => decision('PASSED')}>Mark Passed</button><button className="secondary-button" type="button" disabled={busyAction !== null || watchSaved} onClick={saveWatchlist}>{watchSaved ? 'Saved to Watchlist' : 'Save to Watchlist'}</button>{message ? <p className="notice" role="status">{message}</p> : null}</section>
  </div>;
}
