'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OwnerLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/auth/owner-logout', { method: 'POST' });
    }
    finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return <button className="logout-button" type="button" onClick={signOut} disabled={busy}>{busy ? 'EXITING' : 'LOG OUT'}</button>;
}
