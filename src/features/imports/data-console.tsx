'use client';

import { useState, type FormEvent } from 'react';
import type { ImportReport } from './import-service';

export type DataConsoleSubmission = Readonly<{
  csv: string;
  sourceKey: string;
  sourceLabel: string;
  isDemo: boolean;
}>;

export type SubmitImport = (input: DataConsoleSubmission) => Promise<ImportReport>;

const template = `source_record_id,title,sale_price,shipping,buyer_premium,tax,currency,sale_type,status,sold_at,timezone,source_url
DEMO-001,"DEMO / PLACEHOLDER — 2023 Panini Prizm #339 Silver PSA 10",386.00,14.00,0,,USD,AUCTION,SOLD,2026-07-29T20:15:00-04:00,America/New_York,`;

async function submitImportRequest(input: DataConsoleSubmission): Promise<ImportReport> {
  const response = await fetch('/api/imports', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `Import failed (${response.status})` }));
    throw new Error(typeof body.error === 'string' ? body.error : `Import failed (${response.status})`);
  }
  return response.json() as Promise<ImportReport>;
}

export function DataConsole({
  submitImport = submitImportRequest,
  durableStorage = false,
}: {
  submitImport?: SubmitImport;
  durableStorage?: boolean;
}) {
  const [csv, setCsv] = useState(template);
  const [sourceLabel, setSourceLabel] = useState('Generic sold-listing CSV');
  const [isDemo, setIsDemo] = useState(true);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setReport(await submitImport({ csv, sourceKey: 'generic-sold-csv', sourceLabel, isDemo }));
    } catch (caught) {
      setReport(null);
      setError(caught instanceof Error ? caught.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="data-console analysis-grid">
      <section className="panel wide title-panel">
        <div>
          <h1>DATA CONSOLE / RAW INGESTION</h1>
          <span className="muted">CSV and manual records only; no live or completed-sale access is implied.</span>
        </div>
        <strong className={isDemo ? 'amber' : 'positive'}>
          IMPORT MODE: {isDemo ? 'DEMO / PLACEHOLDER' : 'REAL DATA'}
        </strong>
      </section>

      <form className="panel import-form" onSubmit={onSubmit}>
        <h2>IMPORT PARAMETERS</h2>
        <label>
          Source label
          <input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} required />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isDemo}
            onChange={(event) => setIsDemo(event.target.checked)}
          />
          Import as demo placeholder
        </label>
        <label>
          CSV data
          <textarea value={csv} onChange={(event) => setCsv(event.target.value)} rows={12} required />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'VALIDATING…' : 'IMPORT & VALIDATE'}</button>
        {error ? <p className="negative" role="alert">{error}</p> : null}
      </form>

      <section className="panel source-console">
        <h2>SOURCE STATUS</h2>
        <table>
          <tbody>
            <tr><td>PERSISTENCE</td><td className={durableStorage ? 'positive' : 'amber'}>{durableStorage ? 'POSTGRESQL / PERSISTENT' : 'MEMORY / RESETS ON RESTART'}</td></tr>
            <tr><td>GENERIC CSV</td><td className="positive">MANUAL / READY</td></tr>
            <tr><td>PASTED LINK</td><td className="positive">MANUAL METADATA / READY</td></tr>
            <tr><td>LOCAL / CARD SHOW</td><td className="positive">MANUAL / READY</td></tr>
            <tr><td>eBAY COMPLETED SALES</td><td className="amber">AWAITING LICENSED DATA</td></tr>
            <tr><td>LIVE MARKET ADAPTERS</td><td className="amber">AWAITING CREDENTIALS</td></tr>
          </tbody>
        </table>
      </section>

      {report ? (
        <section className="panel wide" aria-live="polite">
          <div className="title-panel import-summary">
            <h2>BATCH {report.batchId}</h2>
            <div className="status-strip">
              <strong className="positive">ACCEPTED {report.accepted}</strong>
              <strong className="negative">REJECTED {report.rejected}</strong>
              <strong className="amber">DUPLICATES {report.duplicates}</strong>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>ROW</th><th>STATUS</th><th>TITLE / RAW</th><th>ERRORS</th><th>FINGERPRINT</th></tr></thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.fingerprint}`}>
                    <td>{row.rowNumber}</td>
                    <td className={row.status === 'ACCEPTED' ? 'positive' : row.status === 'REJECTED' ? 'negative' : 'amber'}>{row.status}</td>
                    <td>{String(row.raw.title ?? '(untitled)')}</td>
                    <td>{row.errors.length ? row.errors.map((item) => `${item.code} · ${item.message}`).join(' | ') : '—'}</td>
                    <td><small>{row.fingerprint}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}