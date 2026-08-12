'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cardLabel, money, object, type AnalysisRecord } from './analysis-record';

type WatchItem = { id: string; cardId: string | null; marketRecordId: string | null; notes: string | null; isStarred: boolean; createdAt: string };

export function WatchlistScreen() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('STARRED');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/watchlist'), fetch('/api/analyses')]).then(async ([watchResponse, analysesResponse]) => {
      const watchBody = await watchResponse.json().catch(() => ({})); const analysesBody = await analysesResponse.json().catch(() => ({}));
      if (!watchResponse.ok || !analysesResponse.ok) throw new Error('Could not load watchlist');
      setItems(watchBody.watchlist as WatchItem[]); setAnalyses(analysesBody.analyses as AnalysisRecord[]);
    }).catch((caught: unknown) => setMessage(caught instanceof Error ? caught.message : 'Could not load watchlist')).finally(() => setLoading(false));
  }, []);

  const analysisFor = useCallback((item: WatchItem) => analyses.find((analysis) => analysis.cardId === item.cardId), [analyses]);
  const visible = useMemo(() => items.filter((item) => filter === 'ALL' || (filter === 'STARRED' ? item.isStarred : analysisFor(item)?.purchaseStatus === filter)).sort((left, right) => {
    if (sort === 'STARRED') return Number(right.isStarred) - Number(left.isStarred) || right.createdAt.localeCompare(left.createdAt);
    if (sort === 'OLDEST') return left.createdAt.localeCompare(right.createdAt);
    if (sort === 'CARD') return (analysisFor(left) ? cardLabel(analysisFor(left)!) : left.cardId ?? '').localeCompare(analysisFor(right) ? cardLabel(analysisFor(right)!) : right.cardId ?? '');
    return right.createdAt.localeCompare(left.createdAt);
  }), [analysisFor, filter, items, sort]);

  async function updateItem(item: WatchItem, patch: Partial<Pick<WatchItem, 'notes' | 'isStarred'>>) {
    const next = { ...item, ...patch };
    setItems((current) => current.map((value) => value.id === item.id ? next : value));
    const response = await fetch(`/api/watchlist/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ notes: next.notes, isStarred: next.isStarred }) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setItems((current) => current.map((value) => value.id === item.id ? body.item as WatchItem : value));
    else { setItems((current) => current.map((value) => value.id === item.id ? item : value)); setMessage(typeof body.error === 'string' ? body.error : 'Watchlist update failed'); }
  }

  async function remove(item: WatchItem) {
    const response = await fetch(`/api/watchlist/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    if (response.ok) { setItems((current) => current.filter((value) => value.id !== item.id)); setMessage('Removed from watchlist'); }
    else setMessage('Could not remove watchlist item');
  }

  return <div className="watchlist-screen"><div className="screen-heading"><div><h1>Watchlist</h1><p>Cards you are still considering, tied back to real analysis snapshots.</p></div><div className="toolbar"><label className="field">Filter<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All cards</option><option value="STARRED">Starred only</option><option value="UNDECIDED">Undecided</option><option value="PURCHASED">Purchased</option><option value="PASSED">Passed</option></select></label><label className="field">Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="STARRED">Starred, then newest</option><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="CARD">Card A–Z</option></select></label></div></div>
    {message ? <p className="notice" role="status">{message}</p> : null}
    {loading ? <section className="panel empty-state"><h2>Loading watchlist…</h2></section> : items.length === 0 ? <section className="panel empty-state"><h2>Your watchlist is empty</h2><p>Analyze a card, then save it here while you decide. Star the deals you want at the top.</p><Link className="primary-button" href="/">Analyze a card</Link></section> : visible.length === 0 ? <section className="panel empty-state"><h2>No cards match this filter</h2><button className="secondary-button" type="button" onClick={() => setFilter('ALL')}>Show all cards</button></section> : <section className="watch-grid">{visible.map((item) => {
      const analysis = analysisFor(item); const result = object(analysis?.result); const resale = object(result.resaleDeal); const collector = object(result.collectorValue);
      return <article className="panel watch-card" key={item.id}><div className="watch-card-heading"><button type="button" className={`star-button ${item.isStarred ? 'active-star' : ''}`} aria-label={item.isStarred ? 'Remove star' : 'Star card'} aria-pressed={item.isStarred} onClick={() => updateItem(item, { isStarred: !item.isStarred })}>{item.isStarred ? '★' : '☆'}</button><div><h2>{analysis ? cardLabel(analysis) : 'Card record unavailable'}</h2><small>{item.cardId}</small></div><strong>{analysis?.purchaseStatus ?? 'UNLINKED'}</strong></div>{analysis ? <div className="watch-metrics"><div><span>ASKING</span><strong>{money(object(object(result.currentOffer).priceOrBid).minor, analysis.currency)}</strong></div><div><span>COLLECTOR VALUE</span><strong>{Number(collector.differencePercent ?? 0).toFixed(1)}%</strong></div><div><span>RESALE DEAL</span><strong className={resale.signal === 'GREEN' ? 'positive' : resale.signal === 'RED' ? 'negative' : 'amber'}>{Number(resale.score ?? 0) > 0 ? '+' : ''}{String(resale.score ?? 0)}</strong></div></div> : <p className="muted">The linked analysis is not available.</p>}<label className="field">Notes<textarea rows={2} defaultValue={item.notes ?? ''} onBlur={(event) => updateItem(item, { notes: event.target.value.trim() || null })} /></label><div className="watch-actions">{analysis ? <Link className="secondary-button" href={`/history?analysis=${encodeURIComponent(analysis.id)}`}>View history</Link> : null}<button className="danger-button" type="button" onClick={() => remove(item)}>Remove</button></div></article>;
    })}</section>}
  </div>;
}
