'use client';

import { useEffect, useState, type FormEvent } from 'react';

export function SettingsScreen({ ownerEmail }: { ownerEmail: string }) {
  const [targetRoi, setTargetRoi] = useState('15');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load settings');
      setTargetRoi(String(Number(body.settings.targetRoiBps) / 100));
    }).catch((caught: unknown) => setMessage(caught instanceof Error ? caught.message : 'Could not load settings')).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetRoiBps: Math.round(Number(targetRoi) * 100) }) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) { setTargetRoi(String(Number(body.settings.targetRoiBps) / 100)); setMessage('Settings saved'); }
    else setMessage(typeof body.error === 'string' ? body.error : 'Could not save settings');
    setBusy(false);
  }

  return <div className="settings-screen"><div className="screen-heading"><div><h1>Settings</h1><p>Defaults for Matt’s private decision workflow.</p></div><span className="status green">OWNER ONLY</span></div>
    <div className="settings-grid"><form className="panel settings-form" onSubmit={submit}><h2>Decision default</h2><p className="muted">Used when an analysis does not provide its own target. Resale Deal score is zero at this return.</p><label className="field">Target resale ROI (%)<input type="number" min="0" max="1000" step="0.1" inputMode="decimal" value={targetRoi} onChange={(event) => setTargetRoi(event.target.value)} disabled={loading} required /></label><button className="primary-button" type="submit" disabled={loading || busy}>{busy ? 'SAVING…' : 'SAVE DEFAULT'}</button>{message ? <p className="notice" role="status">{message}</p> : null}</form>
      <section className="panel settings-account"><h2>Owner account</h2><dl><div><dt>Email</dt><dd>{ownerEmail}</dd></div><div><dt>Access</dt><dd className="positive">SINGLE OWNER</dd></div><div><dt>Evidence</dt><dd>MANUAL + CSV ONLY</dd></div><div><dt>Marketplace access</dt><dd>NONE</dd></div></dl><p className="muted">Account identity is fixed by deployment configuration. No additional beta users can be created here.</p></section></div>
  </div>;
}
