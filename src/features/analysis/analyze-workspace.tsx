'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnalysisResultView } from './analysis-result';
import type { AnalysisRecord } from './analysis-record';

export type CompForm = {
  id: number; sourceLabel: string; listingTitle: string; occurredAt: string; salePrice: string; shipping: string;
  playerName: string; year: string; brand: string; setName: string; cardNumber: string; parallel: string;
  condition: 'RAW' | 'GRADED'; gradingCompanyKey: string; grade: string;
  selection: 'AUTO' | 'INCLUDE' | 'EXCLUDE'; overrideReason: string;
};
export type FormState = {
  playerName: string; year: string; brand: string; setName: string; cardNumber: string; parallel: string;
  condition: 'RAW' | 'GRADED'; gradingCompanyKey: string; grade: string;
  askingPrice: string; shipping: string; tax: string; gradingCost: string; sellingFeePercent: string; sellingFlatFee: string;
  returnAllowancePercent: string; targetRoiPercent: string; holdingDays: string;
};
type ImportedEvidence = {
  id: string; sourceLabel: string; listingTitle: string; occurredAt: string;
  salePriceMinor: string; shippingMinor: string; currency: string; cardIdentity: Record<string, unknown> | null;
};

let nextCompId = 1;
const todayInput = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); };
const blankComp = (): CompForm => ({ id: nextCompId++, sourceLabel: '', listingTitle: '', occurredAt: todayInput(), salePrice: '', shipping: '0', playerName: '', year: '', brand: '', setName: '', cardNumber: '', parallel: '', condition: 'RAW', gradingCompanyKey: '', grade: '', selection: 'AUTO', overrideReason: '' });
const initial: FormState = { playerName: '', year: '', brand: '', setName: '', cardNumber: '', parallel: '', condition: 'RAW', gradingCompanyKey: '', grade: '', askingPrice: '', shipping: '0', tax: '0', gradingCost: '0', sellingFeePercent: '13', sellingFlatFee: '0.30', returnAllowancePercent: '2', targetRoiPercent: '', holdingDays: '90' };
const dollars = (value: string) => Math.round(Number(value || '0') * 100);
const percentBps = (value: string) => Math.round(Number(value || '0') * 100);

export function buildManualAnalysisRequest(
  form: FormState,
  comps: CompForm[],
  importedComps: readonly { marketRecordId: string; identityReviewed: boolean }[] = [],
  idempotencyKey = 'analysis-request-test',
) {
  const costs = [
    { key: 'tax', label: 'Sales tax / acquisition costs', amountMinor: dollars(form.tax) },
    { key: 'grading', label: 'Grading cost', amountMinor: dollars(form.gradingCost) },
  ].filter((cost) => cost.amountMinor > 0);
  return {
    idempotencyKey,
    card: { sport: 'football', playerName: form.playerName, year: Number(form.year), brand: form.brand || null, setName: form.setName || null, cardNumber: form.cardNumber || null, parallel: form.parallel || null, raw: form.condition === 'RAW', gradingCompanyKey: form.condition === 'GRADED' ? form.gradingCompanyKey : null, grade: form.condition === 'GRADED' ? Number(form.grade) : null },
    currency: 'USD', offer: { kind: 'FIXED_PRICE', priceMinor: dollars(form.askingPrice), shippingMinor: dollars(form.shipping), buyerPremiumBps: 0 },
    comps: comps.map((comp) => ({
      sourceLabel: comp.sourceLabel, listingTitle: comp.listingTitle, occurredAt: new Date(`${comp.occurredAt}T00:00:00Z`).toISOString(), salePriceMinor: dollars(comp.salePrice), shippingMinor: dollars(comp.shipping),
      card: { sport: 'football', playerName: comp.playerName, year: Number(comp.year), brand: comp.brand || null, setName: comp.setName || null, cardNumber: comp.cardNumber || null, parallel: comp.parallel || null, raw: comp.condition === 'RAW', gradingCompanyKey: comp.condition === 'GRADED' ? comp.gradingCompanyKey : null, grade: comp.condition === 'GRADED' ? Number(comp.grade) : null },
      ...(comp.selection === 'AUTO' ? {} : { included: comp.selection === 'INCLUDE', overrideReason: comp.overrideReason }),
    })),
    importedComps,
    acquisitionCosts: costs, fixedSellingCosts: [], sellingFeeBps: percentBps(form.sellingFeePercent), sellingFlatFeeMinor: dollars(form.sellingFlatFee), returnAllowanceBps: percentBps(form.returnAllowancePercent), ...(form.targetRoiPercent ? { targetRoiBps: percentBps(form.targetRoiPercent) } : {}), holdingDays: Number(form.holdingDays),
  };
}

export function AnalyzeWorkspace() {
  const [form, setForm] = useState(initial);
  const [comps, setComps] = useState<CompForm[]>([blankComp(), blankComp()]);
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTraderImportTools, setShowTraderImportTools] = useState(false);
  const [importedEvidence, setImportedEvidence] = useState<ImportedEvidence[]>([]);
  const [selectedImported, setSelectedImported] = useState<Record<string, boolean>>({});
  const [reviewedImported, setReviewedImported] = useState<Record<string, boolean>>({});
  const lastSubmitted = useRef<string | null>(null);
  const operation = useRef<{ signature: string; idempotencyKey: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.settings?.showTraderImportTools !== true) return;
      setShowTraderImportTools(true);
      const importsResponse = await fetch('/api/imports');
      const importsBody = await importsResponse.json().catch(() => ({}));
      if (!importsResponse.ok) throw new Error(typeof importsBody.error === 'string' ? importsBody.error : 'Imported evidence could not be loaded');
      setImportedEvidence(Array.isArray(importsBody.records) ? importsBody.records : []);
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Imported evidence could not be loaded'));
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateComp = (id: number, patch: Partial<CompForm>) => setComps((current) => current.map((comp) => comp.id === id ? { ...comp, ...patch } : comp));
  const removeComp = (id: number) => setComps((current) => current.length > 1 ? current.filter((comp) => comp.id !== id) : current);
  const duplicateComp = (source: CompForm) => setComps((current) => [...current, { ...source, id: nextCompId++ }]);
  const copyTargetIdentity = (id: number) => updateComp(id, { playerName: form.playerName, year: form.year, brand: form.brand, setName: form.setName, cardNumber: form.cardNumber, parallel: form.parallel, condition: form.condition, gradingCompanyKey: form.gradingCompanyKey, grade: form.grade });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (comps.some((comp) => comp.selection !== 'AUTO' && !comp.overrideReason.trim())) { setError('Every manual include or exclude override needs a reason. Your form values are preserved.'); return; }
    const selected = importedEvidence.filter((record) => selectedImported[record.id]);
    const unreviewed = selected.find((record) => !record.cardIdentity && !reviewedImported[record.id]);
    if (unreviewed) { setError(`Review the title-only imported row before calculating: ${unreviewed.listingTitle}`); return; }
    const importedComps = selected.map((record) => ({ marketRecordId: record.id, identityReviewed: Boolean(reviewedImported[record.id]) }));
    const unsignedBody = buildManualAnalysisRequest(form, comps, importedComps, 'signature');
    const signature = JSON.stringify({ ...unsignedBody, idempotencyKey: undefined });
    if (signature === lastSubmitted.current) { setError('This exact analysis was already submitted. Change an input before running it again.'); return; }
    if (operation.current?.signature !== signature) operation.current = { signature, idempotencyKey: crypto.randomUUID() };
    const body = buildManualAnalysisRequest(form, comps, importedComps, operation.current.idempotencyKey);
    setBusy(true);
    try {
      const response = await fetch('/api/analyses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.analysis) throw new Error(typeof payload.error === 'string' ? payload.error : 'Analysis could not be completed. Your form values are preserved.');
      lastSubmitted.current = signature;
      setAnalysis(payload.analysis as AnalysisRecord);
      window.setTimeout(() => document.getElementById('analysis-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Your form values are preserved; retry when connected.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="analyze-workspace">
    <div className="screen-heading"><div><h1>Analyze a Card</h1><p>Decide whether this one card makes sense for your collection, resale, both, or neither.</p></div><span className="muted">MANUAL EVIDENCE · NO LIVE MARKETPLACE DATA</span></div>
    <form className="analysis-form" onSubmit={submit}>
      <section className="panel form-section"><div className="section-number">01</div><div><h2>Card identity</h2><p className="muted">Describe the exact card. Raw means no future grade is assumed.</p></div>
        <div className="form-grid">
          <label className="field field-span-2">Player name<input value={form.playerName} onChange={(event) => update('playerName', event.target.value)} autoComplete="off" required /></label>
          <label className="field">Year<input type="number" min="1800" max="2200" inputMode="numeric" value={form.year} onChange={(event) => update('year', event.target.value)} required /></label>
          <label className="field">Brand<input value={form.brand} onChange={(event) => update('brand', event.target.value)} placeholder="Prizm" /></label>
          <label className="field">Set<input value={form.setName} onChange={(event) => update('setName', event.target.value)} /></label>
          <label className="field">Card #<input value={form.cardNumber} onChange={(event) => update('cardNumber', event.target.value)} /></label>
          <label className="field">Parallel / variation<input value={form.parallel} onChange={(event) => update('parallel', event.target.value)} /></label>
          <label className="field">Condition<select value={form.condition} onChange={(event) => update('condition', event.target.value as FormState['condition'])}><option value="RAW">Raw</option><option value="GRADED">Graded</option></select></label>
          {form.condition === 'GRADED' ? <><label className="field">Grader<input value={form.gradingCompanyKey} onChange={(event) => update('gradingCompanyKey', event.target.value)} placeholder="PSA" required /></label><label className="field">Grade<input type="number" min="0" max="100" step="0.5" value={form.grade} onChange={(event) => update('grade', event.target.value)} required /></label></> : <p className="raw-note">RAW CARD · no future grade prediction will be made.</p>}
        </div>
      </section>

      <section className="panel form-section"><div className="section-number">02</div><div><h2>Offer & costs</h2><p className="muted">Collector Value uses asking price only. Resale Deal includes every entered cost.</p></div>
        <div className="form-grid">
          <label className="field">Asking price ($)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.askingPrice} onChange={(event) => update('askingPrice', event.target.value)} required /></label>
          <label className="field">Shipping to you ($)<input type="number" min="0" step="0.01" inputMode="decimal" value={form.shipping} onChange={(event) => update('shipping', event.target.value)} required /></label>
          <label className="field">Tax / acquisition costs ($)<input type="number" min="0" step="0.01" inputMode="decimal" value={form.tax} onChange={(event) => update('tax', event.target.value)} required /></label>
          <label className="field">Grading cost ($)<input type="number" min="0" step="0.01" inputMode="decimal" value={form.gradingCost} onChange={(event) => update('gradingCost', event.target.value)} required /></label>
          <label className="field">Selling fee (%)<input type="number" min="0" max="99.99" step="0.01" inputMode="decimal" value={form.sellingFeePercent} onChange={(event) => update('sellingFeePercent', event.target.value)} required /></label>
          <label className="field">Selling flat fee ($)<input type="number" min="0" step="0.01" inputMode="decimal" value={form.sellingFlatFee} onChange={(event) => update('sellingFlatFee', event.target.value)} required /></label>
          <label className="field">Return allowance (%)<input type="number" min="0" max="99.99" step="0.01" inputMode="decimal" value={form.returnAllowancePercent} onChange={(event) => update('returnAllowancePercent', event.target.value)} required /></label>
          <label className="field">Target ROI (%)<input type="number" min="0" step="0.1" inputMode="decimal" value={form.targetRoiPercent} onChange={(event) => update('targetRoiPercent', event.target.value)} placeholder="Settings default (15%)" /></label>
          <label className="field">Holding period (days)<input type="number" min="0" max="3650" inputMode="numeric" value={form.holdingDays} onChange={(event) => update('holdingDays', event.target.value)} required /></label>
        </div>
      </section>

      <section className="panel form-section comps-section"><div className="section-number">03</div><div className="comps-heading"><div><h2>Manual comparison sales</h2><p className="muted">Enter each sold card&apos;s structured identity. Automatic matching uses these fields, not the listing title.</p></div><button className="secondary-button" type="button" onClick={() => setComps((current) => [...current, blankComp()])}>+ Add comp</button></div>
        <div className="comp-list">{comps.map((comp, index) => <fieldset className="comp-card" key={comp.id}><legend>COMP {String(index + 1).padStart(2, '0')}</legend><div className="comp-actions"><button className="icon-button" type="button" onClick={() => duplicateComp(comp)} aria-label={`Duplicate comp ${index + 1}`} title="Duplicate comp">⧉</button><button className="icon-button" type="button" onClick={() => removeComp(comp.id)} aria-label={`Remove comp ${index + 1}`} disabled={comps.length === 1}>×</button></div>
          <div className="comp-identity-heading"><h3>Sold card identity</h3><button className="secondary-button" type="button" onClick={() => copyTargetIdentity(comp.id)}>Use target identity</button></div>
          <div className="form-grid">
            <label className="field">Source label<input value={comp.sourceLabel} onChange={(event) => updateComp(comp.id, { sourceLabel: event.target.value })} placeholder="Card show receipt" required /></label><label className="field field-span-2">Listing / receipt description<input value={comp.listingTitle} onChange={(event) => updateComp(comp.id, { listingTitle: event.target.value })} required /></label><label className="field">Sale date<input type="date" max={todayInput()} value={comp.occurredAt} onChange={(event) => updateComp(comp.id, { occurredAt: event.target.value })} required /></label><label className="field">Sold price ($)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={comp.salePrice} onChange={(event) => updateComp(comp.id, { salePrice: event.target.value })} required /></label><label className="field">Buyer shipping ($)<input type="number" min="0" step="0.01" inputMode="decimal" value={comp.shipping} onChange={(event) => updateComp(comp.id, { shipping: event.target.value })} required /></label>
            <label className="field">Comp player name<input aria-label={`Comp ${index + 1} player name`} value={comp.playerName} onChange={(event) => updateComp(comp.id, { playerName: event.target.value })} required /></label><label className="field">Comp year<input aria-label={`Comp ${index + 1} year`} type="number" min="1800" max="2200" value={comp.year} onChange={(event) => updateComp(comp.id, { year: event.target.value })} required /></label><label className="field">Comp brand<input aria-label={`Comp ${index + 1} brand`} value={comp.brand} onChange={(event) => updateComp(comp.id, { brand: event.target.value })} /></label><label className="field">Comp set<input aria-label={`Comp ${index + 1} set`} value={comp.setName} onChange={(event) => updateComp(comp.id, { setName: event.target.value })} /></label><label className="field">Comp card #<input aria-label={`Comp ${index + 1} card number`} value={comp.cardNumber} onChange={(event) => updateComp(comp.id, { cardNumber: event.target.value })} /></label><label className="field">Comp parallel<input aria-label={`Comp ${index + 1} parallel`} value={comp.parallel} onChange={(event) => updateComp(comp.id, { parallel: event.target.value })} /></label><label className="field">Comp condition<select aria-label={`Comp ${index + 1} condition`} value={comp.condition} onChange={(event) => updateComp(comp.id, { condition: event.target.value as CompForm['condition'] })}><option value="RAW">Raw</option><option value="GRADED">Graded</option></select></label>{comp.condition === 'GRADED' ? <><label className="field">Comp grader<input aria-label={`Comp ${index + 1} grader`} value={comp.gradingCompanyKey} onChange={(event) => updateComp(comp.id, { gradingCompanyKey: event.target.value })} required /></label><label className="field">Comp grade<input aria-label={`Comp ${index + 1} grade`} type="number" min="0" max="100" step="0.5" value={comp.grade} onChange={(event) => updateComp(comp.id, { grade: event.target.value })} required /></label></> : null}
            <label className="field">Evidence selection<select value={comp.selection} onChange={(event) => updateComp(comp.id, { selection: event.target.value as CompForm['selection'] })}><option value="AUTO">Use structured matching rules</option><option value="INCLUDE">Force include</option><option value="EXCLUDE">Exclude</option></select></label>{comp.selection !== 'AUTO' ? <label className="field field-span-2">Override reason<input value={comp.overrideReason} onChange={(event) => updateComp(comp.id, { overrideReason: event.target.value })} required /></label> : null}
          </div>
        </fieldset>)}</div>
      </section>

      {showTraderImportTools ? <section className="panel form-section comps-section"><div className="section-number">04</div><div><h2>Imported CSV evidence</h2><p className="muted">Select persisted sold records to add to this calculation. Rows without structured identity must be reviewed before they can be used.</p></div>
        {importedEvidence.length === 0 ? <p className="muted">No imported real evidence yet. <Link className="positive" href="/data">Open Import Data</Link> to add sold records.</p> : <div className="comp-list">{importedEvidence.map((record) => {
          const selected = Boolean(selectedImported[record.id]);
          return <fieldset className="comp-card" key={record.id}><legend>{record.cardIdentity ? 'STRUCTURED CSV' : 'TITLE-ONLY CSV'}</legend>
            <label className="field imported-evidence-choice"><span><input type="checkbox" checked={selected} onChange={(event) => setSelectedImported((current) => ({ ...current, [record.id]: event.target.checked }))} /> Use in this analysis</span></label>
            <p><strong>{record.listingTitle}</strong><br /><span className="muted">{record.sourceLabel} · {record.occurredAt.slice(0, 10)} · {(Number(record.salePriceMinor) / 100).toLocaleString('en-US', { style: 'currency', currency: record.currency })}</span></p>
            {record.cardIdentity ? <p className="positive">STRUCTURED IDENTITY AVAILABLE</p> : <label className="field imported-evidence-choice"><span><input type="checkbox" checked={Boolean(reviewedImported[record.id])} disabled={!selected} onChange={(event) => setReviewedImported((current) => ({ ...current, [record.id]: event.target.checked }))} /> I reviewed this listing title and confirm it identifies the target card.</span></label>}
          </fieldset>;
        })}</div>}
        <Link className="secondary-button import-data-link" href="/data">Manage Import Data</Link>
      </section> : null}

      <section className="submit-bar"><div><strong>Ready to run the evidence tape?</strong><span>Your inputs stay in place if validation or analysis fails.</span></div><button className="primary-button" type="submit" disabled={busy}>{busy ? 'ANALYZING…' : 'ANALYZE CARD →'}</button></section>
      {error ? <p className="notice error-box" role="alert">{error}</p> : null}
    </form>
    {analysis ? <section id="analysis-result" className="analysis-result"><AnalysisResultView key={analysis.id} initialAnalysis={analysis} /></section> : null}
  </div>;
}
