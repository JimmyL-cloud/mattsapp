'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function OwnerLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/owner-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    if (response.ok) {
      router.push('/');
      router.refresh();
    }
    else {
      const body = await response.json().catch(() => ({ error: 'Authentication failed' }));
      setError(typeof body.error === 'string' ? body.error : 'Authentication failed');
      setBusy(false);
    }
  }

  return <form className="login-form" onSubmit={submit}>
    <label>OWNER EMAIL<input name="email" type="email" autoComplete="username" required /></label>
    <label>PASSWORD<input name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
    <button type="submit" disabled={busy}>{busy ? 'AUTHENTICATING…' : 'ENTER TERMINAL'}</button>
    {error ? <p role="alert" className="negative">{error}</p> : null}
  </form>;
}