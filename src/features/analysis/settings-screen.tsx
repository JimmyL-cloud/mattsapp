'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { OwnerLogoutButton } from '@/features/auth/owner-logout-button';

export function SettingsScreen({ ownerEmail }: { ownerEmail: string }) {
  const [targetRoi, setTargetRoi] = useState('15');
  const [showTraderImportTools, setShowTraderImportTools] = useState(false);
  const [loadState, setLoadState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load settings');
      setTargetRoi(String(Number(body.settings.targetRoiBps) / 100));
      setShowTraderImportTools(body.settings.showTraderImportTools === true);
      setLoadState('READY');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Settings are unavailable.');
      setLoadState('ERROR');
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetRoiBps: Math.round(Number(targetRoi) * 100), showTraderImportTools }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not save settings');
      setTargetRoi(String(Number(body.settings.targetRoiBps) / 100));
      setShowTraderImportTools(body.settings.showTraderImportTools === true);
      setMessage('Profile saved');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Network error; settings were not changed.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="settings-screen"><div className="screen-heading"><div><h1>Profile</h1><p>Your account and workflow preferences.</p></div><span className="status green">OWNER ONLY</span></div>
    <div className="settings-grid"><form className="panel settings-form" onSubmit={submit}><h2>Trader preferences</h2><p className="muted">These preferences apply to the Trader workflow. Collector mode will not show manual or CSV evidence tools.</p>
      {loadState === 'ERROR' ? <div className="empty-state compact-empty"><h3>Profile unavailable</h3><p role="alert">{message}</p><button className="secondary-button" type="button" onClick={() => { setLoadState('LOADING'); setMessage(null); void load(); }}>Retry</button></div> : <><label className="field">Target resale ROI (%)<input type="number" min="0" max="1000" step="0.1" inputMode="decimal" value={targetRoi} onChange={(event) => setTargetRoi(event.target.value)} disabled={loadState !== 'READY'} required /></label><label className="preference-check"><input type="checkbox" checked={showTraderImportTools} onChange={(event) => setShowTraderImportTools(event.target.checked)} disabled={loadState !== 'READY'} /><span><strong>Show CSV import tools in Trader mode</strong><small>Off by default. Turning this off only hides the tools; it never deletes imported records.</small></span></label><button className="primary-button" type="submit" disabled={loadState !== 'READY' || busy}>{busy ? 'SAVING…' : 'SAVE PROFILE'}</button>{message ? <p className="notice" role="status">{message}</p> : null}</>}
    </form><section className="panel settings-account"><h2>Owner account</h2><dl><div><dt>Email</dt><dd>{ownerEmail}</dd></div><div><dt>Access</dt><dd className="positive">SINGLE OWNER</dd></div><div><dt>Evidence</dt><dd>MANUAL + OPTIONAL CSV</dd></div><div><dt>Marketplace access</dt><dd>NONE</dd></div></dl><p className="muted">Account identity is fixed by deployment configuration. No additional beta users can be created here.</p><OwnerLogoutButton /></section></div>
  </div>;
}
