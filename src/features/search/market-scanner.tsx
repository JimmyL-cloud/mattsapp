'use client';

import { useMemo, useState } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { DealScoreCell, SellTimingCell } from '@/components/terminal/score-cell';
import { parseSearchFilters } from './filter-schema';
import { compileSearch, type MarketSearchRow } from './query-compiler';
import { exportMarketRowsCsv } from '@/features/analysis/export-service';

const features = tableFeatures({});
const column = createColumnHelper<typeof features, MarketSearchRow>();

function money(minor: bigint, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
}

function statusClass(status: MarketSearchRow['purchaseStatus']): string {
  if (status === 'PURCHASED') return 'positive';
  if (status === 'MISSED') return 'amber';
  if (status === 'CANCELLED') return 'negative';
  return status === 'PASSED' ? 'muted' : '';
}

function exportCsv(rows: readonly MarketSearchRow[]) {
  const body = exportMarketRowsCsv({ ownerId: 'DEMO-OWNER', requestingUserId: 'DEMO-OWNER', scope: 'DEMO_ONLY', rows });
  const blob = new Blob([body], { type: 'text/csv' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = 'mattsapp-filtered-market.csv';
  anchor.click();
  URL.revokeObjectURL(href);
}

export function MarketScanner({ rows }: { rows: readonly MarketSearchRow[] }) {
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState('');
  const [year, setYear] = useState('');
  const [grader, setGrader] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('');
  const [minimumDealScore, setMinimumDealScore] = useState('');
  const [minimumConfidence, setMinimumConfidence] = useState('');
  const [rookieOnly, setRookieOnly] = useState(false);
  const [autographOnly, setAutographOnly] = useState(false);

  const filtered = useMemo(() => {
    const filters = parseSearchFilters({
      query,
      demoScope: 'DEMO_ONLY',
      positions: position ? [position] : [],
      years: year ? [Number(year)] : [],
      graders: grader ? [grader] : [],
      purchaseStatuses: purchaseStatus ? [purchaseStatus] : [],
      dealScore: minimumDealScore ? { min: Number(minimumDealScore) } : undefined,
      confidence: minimumConfidence ? { min: Number(minimumConfidence) } : undefined,
      rookie: rookieOnly ? true : undefined,
      autograph: autographOnly ? true : undefined,
      sort: [{ field: 'dealScore', direction: 'desc' }],
    });
    return compileSearch(filters).filter(rows);
  }, [rows, query, position, year, grader, purchaseStatus, minimumDealScore, minimumConfidence, rookieOnly, autographOnly]);

  const positions = [...new Set(rows.map((row) => row.position).filter(Boolean))].sort();
  const years = [...new Set(rows.map((row) => row.year).filter((value): value is number => value !== null))].sort((left, right) => right - left);
  const graders = [...new Set(rows.map((row) => row.gradingCompanyKey).filter(Boolean))].sort();
  const columns = useMemo(() => column.columns([
    column.display({ id: 'demo', header: 'MODE', cell: () => <strong className="amber">DEMO</strong> }),
    column.accessor('playerName', { header: 'PLAYER', cell: (info) => <><strong>{info.getValue()}</strong><small>{info.row.original.position} · {info.row.original.teamShown}</small></> }),
    column.display({ id: 'card', header: 'CARD', cell: (info) => <>{info.row.original.year} {info.row.original.setName} #{info.row.original.cardNumber}<small>{info.row.original.parallel ?? 'BASE'}</small></> }),
    column.display({ id: 'grade', header: 'GRADE', cell: (info) => info.row.original.raw ? 'RAW' : `${info.row.original.gradingCompanyKey?.toUpperCase()} ${info.row.original.grade}` }),
    column.display({ id: 'allIn', header: 'ALL-IN', cell: (info) => money(info.row.original.allInMinor, info.row.original.currency) }),
    column.accessor('dealScore', { header: 'DEAL', cell: (info) => <DealScoreCell score={info.getValue()} /> }),
    column.accessor('sellTimingScore', { header: 'SELL', cell: (info) => <SellTimingCell score={info.getValue()} /> }),
    column.accessor('confidence', { header: 'CONF', cell: (info) => `${info.getValue() ?? 0}%` }),
    column.accessor('matchScore', { header: 'MATCH', cell: (info) => info.getValue()?.toFixed(2) ?? 'N/A' }),
    column.accessor('sourceKey', { header: 'SOURCE', cell: (info) => <small>{info.getValue()}</small> }),
    column.accessor('purchaseStatus', { header: 'FOLLOW-THROUGH', cell: (info) => <strong className={statusClass(info.getValue())}>{info.getValue()}</strong> }),
  ]), []);
  const table = useTable({ data: filtered, columns, features, getRowId: (row) => row.id });

  return (
    <div className="scanner-grid">
      <section className="panel filter-bank">
        <div className="scanner-title"><h1>MARKET SCANNER</h1><strong>{filtered.length} RESULTS</strong></div>
        <label>Search all card fields<input aria-label="Search all card fields" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label>Position<select aria-label="Position" value={position} onChange={(event) => setPosition(event.target.value)}><option value="">ALL</option>{positions.map((item) => <option key={item} value={item ?? ''}>{item}</option>)}</select></label>
        <label>Year<select aria-label="Year" value={year} onChange={(event) => setYear(event.target.value)}><option value="">ALL</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Grader<select aria-label="Grader" value={grader} onChange={(event) => setGrader(event.target.value)}><option value="">ALL</option>{graders.map((item) => <option key={item} value={item ?? ''}>{item?.toUpperCase()}</option>)}</select></label>
        <label>Purchase status<select aria-label="Purchase status" value={purchaseStatus} onChange={(event) => setPurchaseStatus(event.target.value)}><option value="">ALL</option>{['UNDECIDED', 'PURCHASED', 'PASSED', 'MISSED', 'CANCELLED'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Minimum Deal Score<input aria-label="Minimum Deal Score" type="number" min="-10" max="10" value={minimumDealScore} onChange={(event) => setMinimumDealScore(event.target.value)} /></label>
        <label>Minimum Confidence<input aria-label="Minimum Confidence" type="number" min="0" max="100" value={minimumConfidence} onChange={(event) => setMinimumConfidence(event.target.value)} /></label>
        <label className="inline-check"><input aria-label="Rookie only" type="checkbox" checked={rookieOnly} onChange={(event) => setRookieOnly(event.target.checked)} />ROOKIE ONLY</label>
        <label className="inline-check"><input aria-label="Autograph only" type="checkbox" checked={autographOnly} onChange={(event) => setAutographOnly(event.target.checked)} />AUTOGRAPH ONLY</label>
        <button type="button" onClick={() => exportCsv(filtered)}>EXPORT FILTERED CSV</button>
      </section>

      <section className="panel scanner-table table-scroll">
        <table>
          <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getAllCells().map((cell) => <td key={cell.id}><table.FlexRender cell={cell} /></td>)}</tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}