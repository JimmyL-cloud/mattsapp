'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnalysisResultView } from './analysis-result';
import { cardLabel, money, object, type AnalysisRecord } from './analysis-record';

export function HistoryScreen({ initialAnalysisId }: { initialAnalysisId?: string }) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [selected, setSelected] = useState<AnalysisRecord | null>(null);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetch('/api/analyses').then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load analysis history');
      const loaded = body.analyses as AnalysisRecord[];
      setAnalyses(loaded);
      if (initialAnalysisId) setSelected(loaded.find((analysis) => analysis.id === initialAnalysisId) ?? null);
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load analysis history')).finally(() => setLoading(false));
  }, [initialAnalysisId, reload]);

  const filtered = useMemo(() => analyses.filter((analysis) => status === 'ALL' || analysis.purchaseStatus === status), [analyses, status]);
  const update = (changed: AnalysisRecord) => {
    setAnalyses((current) => current.map((analysis) => analysis.id === changed.id ? changed : analysis));
    setSelected(changed);
  };

  return <div className="history-screen">
    <div className="screen-heading"><div><h1>Analysis History</h1><p>Immutable inputs and calculation snapshots, newest first.</p></div><label className="field compact-field">Decision<select value={status} onChange={(event) => setStatus(event.target.value)}><option>ALL</option><option>UNDECIDED</option><option>PURCHASED</option><option>PASSED</option><option>MISSED</option><option>CANCELLED</option></select></label></div>
    {loading ? <section className="panel empty-state"><h2>Loading history…</h2></section> : error ? <section className="panel empty-state"><h2>History unavailable</h2><p role="alert" className="negative">{error}</p><button className="secondary-button" type="button" onClick={() => { setLoading(true); setError(null); setReload((value) => value + 1); }}>Retry</button></section> : analyses.length === 0 ? <section className="panel empty-state"><h2>No analyses yet</h2><p>Run your first card through the manual evidence workflow. The immutable snapshot will appear here.</p><Link className="primary-button" href="/">Analyze a card</Link></section> : <>
      <section className="panel table-scroll"><table><thead><tr><th>Card / Snapshot</th><th>Created</th><th>Asking</th><th>Collector Value</th><th>Resale Deal</th><th>Decision</th><th></th></tr></thead><tbody>{filtered.map((analysis) => {
        const result = object(analysis.result); const collector = object(result.collectorValue); const resale = object(result.resaleDeal); const offer = object(object(result.currentOffer).priceOrBid);
        return <tr key={analysis.id}><td>{cardLabel(analysis)}<small>{analysis.id}</small></td><td>{new Date(analysis.createdAt).toLocaleDateString()}</td><td>{money(offer.minor, analysis.currency)}</td><td>{Number(collector.differencePercent ?? 0).toFixed(1)}% VS FAIR</td><td className={resale.signal === 'GREEN' ? 'positive' : resale.signal === 'RED' ? 'negative' : 'amber'}>{Number(resale.score ?? 0) > 0 ? '+' : ''}{String(resale.score ?? 0)} · {String(resale.signal ?? '—')}</td><td>{analysis.purchaseStatus}</td><td><button className="secondary-button row-button" type="button" onClick={() => setSelected(analysis)}>View</button></td></tr>;
      })}</tbody></table>{filtered.length === 0 ? <p className="muted filtered-empty">No analyses match this decision filter.</p> : null}</section>
      {selected ? <section className="history-detail"><div className="detail-heading"><h2>Analysis Detail</h2><button className="secondary-button" type="button" onClick={() => setSelected(null)}>Close detail</button></div><AnalysisResultView key={selected.id} initialAnalysis={selected} onChange={update} /></section> : null}
    </>}
  </div>;
}
