import { OwnerLoginForm } from '@/features/auth/owner-login-form';
import { configuredOwnerEmail } from '@/lib/auth/config';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const ownerEmail = configuredOwnerEmail();
  return <main className="login-shell"><section className="panel login-panel"><p className="wordmark">mattsapp</p><h1>Private Owner Terminal</h1><p className="muted">Authorized owner access only. This terminal uses manual and CSV evidence; no live marketplace account is connected.</p><OwnerLoginForm ownerEmail={ownerEmail} /></section></main>;
}
