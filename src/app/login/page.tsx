import { OwnerLoginForm } from '@/features/auth/owner-login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="panel login-panel">
        <p className="wordmark">mattsapp</p>
        <h1>Private Test Terminal</h1>
        <p className="muted">Authorized tester access only. Demo records are always marked and kept separate from real imports.</p>
        <OwnerLoginForm />
      </section>
    </main>
  );
}
