'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { purchaseStatuses } from '@/features/portfolio/purchase-status';
import { cardLabel, money, object, type AnalysisRecord } from './analysis-record';

export type WatchItem = { id: string; cardId: string | null; marketRecordId: string | null; notes: string | null; isStarred: boolean; createdAt: string };
type SaveState = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';

export function WatchlistScreen() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('STARRED');
  const [loadState, setLoadState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [watchResponse, analysesResponse] = await Promise.all([fetch('/api/watchlist'), fetch('/api/analyses')]);
      const watchBody = await watchResponse.json().catch(() => ({}));
      const analysesBody = await analysesResponse.json().catch(() => ({}));
      if (!watchResponse.ok || !analysesResponse.ok) throw new Error('Could not load watchlist');
      const loadedItems = watchBody.watchlist as WatchItem[];
      setItems(loadedItems);
      setAnalyses(analysesBody.analyses as AnalysisRecord[]);
      setDrafts(Object.fromEntries(loadedItems.map((item) => [item.id, item.notes ?? ''])));
      setSaveStates({});
      setLoadState('READY');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Watchlist is unavailable.');
      setLoadState('ERROR');
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const analysisFor = useCallback((item: WatchItem) => analyses.find((analysis) => analysis.cardId === item.cardId), [analyses]);
  const visible = useMemo(() => items.filter((item) => filter === 'ALL' || (filter === 'STARRED' ? item.isStarred : analysisFor(item)?.purchaseStatus === filter)).sort((left, right) => {
    if (sort === 'STARRED') return Number(right.isStarred) - Number(left.isStarred) || right.createdAt.localeCompare(left.createdAt);
    if (sort === 'OLDEST') return left.createdAt.localeCompare(right.createdAt);
    if (sort === 'CARD') return (analysisFor(left) ? cardLabel(analysisFor(left)!) : left.cardId ?? '').localeCompare(analysisFor(right) ? cardLabel(analysisFor(right)!) : right.cardId ?? '');
    return right.createdAt.localeCompare(left.createdAt);
  }), [analysisFor, filter, items, sort]);

  async function updateItem(item: WatchItem, patch: Partial<Pick<WatchItem, 'notes' | 'isStarred'>>, kind: 'STAR' | 'NOTES') {
    const next = { ...item, ...patch };
    if (kind === 'STAR') setItems((current) => current.map((value) => value.id === item.id ? next : value));
    setSaveStates((current) => ({ ...current, [item.id]: 'SAVING' }));
    setMessage(null);
    try {
      const response = await fetch(`/api/watchlist/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ notes: next.notes, isStarred: next.isStarred }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item) throw new Error(typeof body.error === 'string' ? body.error : 'Watchlist update failed');
      const saved = body.item as WatchItem;
      setItems((current) => current.map((value) => value.id === item.id ? saved : value));
      setDrafts((current) => ({ ...current, [item.id]: saved.notes ?? '' }));
      setSaveStates((current) => ({ ...current, [item.id]: 'SAVED' }));
    } catch (caught) {
      setItems((current) => current.map((value) => value.id === item.id ? item : value));
      if (kind === 'NOTES') setDrafts((current) => ({ ...current, [item.id]: item.notes ?? '' }));
      setSaveStates((current) => ({ ...current, [item.id]: 'ERROR' }));
      setMessage(caught instanceof Error ? caught.message : 'Network error; watchlist change was rolled back.');
    }
  }

  async function remove(item: WatchItem) {
    setMessage(null);
    try {
      const response = await fetch(`/api/watchlist/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove watchlist item');
      setItems((current) => current.filter((value) => value.id !== item.id));
      setMessage('Removed from watchlist');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Network error; the card was not removed.');
    }
  }

  return <div className="watchlist-screen"><div className="screen-heading"><div><h1>Watchlist</h1><p>Cards you are still considering, tied back to real analysis snapshots.</p></div><div className="toolbar"><label className="field">Filter<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All cards</option><option value="STARRED">Starred only</option>{purchaseStatuses.map((status) => <option key={status} value={status}>{status[0]}{status.slice(1).toLowerCase()}</option>)}</select></label><label className="field">Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="STARRED">Starred, then newest</option><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="CARD">Card A–Z</option></select></label></div></div>
    {message && loadState !== 'ERROR' ? <p className={`notice ${Object.values(saveStates).includes('ERROR') ? 'error-box' : ''}`} role="status">{message}</p> : null}
    {loadState === 'LOADING' ? <section className="panel empty-state"><h2>Loading watchlist…</h2></section> : loadState === 'ERROR' ? <section className="panel empty-state"><h2>Watchlist unavailable</h2><p role="alert" className="negative">{message}</p><button className="secondary-button" type="button" onClick={() => { setLoadState('LOADING'); setMessage(null); void load(); }}>Retry</button></section> : items.length === 0 ? <section className="panel empty-state"><h2>Your watchlist is empty</h2><p>Analyze a card, then save it here while you decide. Star the deals you want at the top.</p><Link className="primary-button" href="/">Analyze a card</Link></section> : visible.length === 0 ? <section className="panel empty-state"><h2>No cards match this filter</h2><button className="secondary-button" type="button" onClick={() => setFilter('ALL')}>Show all cards</button></section> : <section className="watch-grid">{visible.map((item) => {
      const analysis = analysisFor(item); const result = object(analysis?.result); const resale = object(result.resaleDeal); const collector = object(result.collectorValue); const saveState = saveStates[item.id] ?? 'IDLE';
      return <article className="panel watch-card" key={item.id}><div className="watch-card-heading"><button type="button" className={`star-button ${item.isStarred ? 'active-star' : ''}`} aria-label={item.isStarred ? 'Remove star' : 'Star card'} aria-pressed={item.isStarred} disabled={saveState === 'SAVING'} onClick={() => updateItem(item, { isStarred: !item.isStarred }, 'STAR')}>{item.isStarred ? '★' : '☆'}</button><div><h2>{analysis ? cardLabel(analysis) : 'Card record unavailable'}</h2><small>{item.cardId}</small></div><strong>{analysis?.purchaseStatus ?? 'UNLINKED'}</strong></div>{analysis ? <div className="watch-metrics"><div><span>ASKING</span><strong>{money(object(object(result.currentOffer).priceOrBid).minor, analysis.currency)}</strong></div><div><span>COLLECTOR VALUE</span><strong>{Number(collector.differencePercent ?? 0).toFixed(1)}%</strong></div><div><span>RESALE DEAL</span><strong className={resale.signal === 'GREEN' ? 'positive' : resale.signal === 'RED' ? 'negative' : 'amber'}>{Number(resale.score ?? 0) > 0 ? '+' : ''}{String(resale.score ?? 0)}</strong></div></div> : <p className="muted">The linked analysis is not available.</p>}
        <label className="field">Notes<textarea rows={2} value={drafts[item.id] ?? ''} onChange={(event) => { setDrafts((current) => ({ ...current, [item.id]: event.target.value })); setSaveStates((current) => ({ ...current, [item.id]: 'IDLE' })); }} onBlur={() => { const notes = (drafts[item.id] ?? '').trim() || null; if (notes !== item.notes) void updateItem(item, { notes }, 'NOTES'); }} /></label><span className={`save-state ${saveState === 'ERROR' ? 'negative' : 'muted'}`} role="status">{saveState === 'SAVING' ? 'SAVING…' : saveState === 'SAVED' ? 'SAVED' : saveState === 'ERROR' ? 'NOT SAVED · ROLLED BACK' : 'SAVES ON BLUR'}</span>
        <div className="watch-actions">{analysis ? <Link className="secondary-button" href={`/history?analysis=${encodeURIComponent(analysis.id)}`}>View history</Link> : null}<button className="danger-button" type="button" onClick={() => remove(item)}>Remove</button></div></article>;
    })}</section>}
  </div>;
}
