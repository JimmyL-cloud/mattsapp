'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

export function OwnerLoginForm({ ownerEmail }: { ownerEmail: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function detectCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/owner-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: ownerEmail, password: form.get('password') }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(typeof body.error === 'string' ? body.error : 'Authentication failed');
      }
      router.push('/');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="login-form" onSubmit={submit}>
    <label>OWNER EMAIL<span className="owner-email">{ownerEmail}</span></label>
    <label>PASSWORD<div className="password-field"><input name="password" type={revealed ? 'text' : 'password'} autoComplete="current-password" minLength={8} maxLength={128} onKeyDown={detectCapsLock} onKeyUp={detectCapsLock} onBlur={() => setCapsLock(false)} aria-describedby="password-requirements caps-lock-warning" required autoFocus /><button className="password-reveal" type="button" onClick={() => setRevealed((value) => !value)} aria-label={revealed ? 'Hide password' : 'Show password'} aria-pressed={revealed}>{revealed ? '◉' : '◎'}</button></div></label>
    <p id="password-requirements" className="muted">Minimum 8 characters.</p>
    {capsLock ? <p id="caps-lock-warning" className="caps-warning" role="status">CAPS LOCK IS ON</p> : <span id="caps-lock-warning" className="sr-only">Caps Lock is off</span>}
    <button type="submit" disabled={busy}>{busy ? 'AUTHENTICATING…' : 'ENTER TERMINAL'}</button>
    {error ? <p role="alert" className="negative">{error}</p> : null}
  </form>;
}
