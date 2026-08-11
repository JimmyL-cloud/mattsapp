import type { ReactNode } from 'react';
import Link from 'next/link';
import { DemoBanner } from './demo-banner';
import { OwnerLogoutButton } from '@/features/auth/owner-logout-button';

export function TerminalShell({ children, demoMode }: { children: ReactNode; demoMode: boolean }) {
  return (
    <div className="terminal-shell">
      {demoMode ? <DemoBanner /> : null}
      <header className="terminal-header">
        <Link className="wordmark" href="/">mattsapp</Link>
        <nav aria-label="Primary">
          <Link href="/scanner">SCANNER</Link><Link href="/data">DATA</Link>
          <Link href="/portfolio">PORTFOLIO</Link><Link href="/performance">PERFORMANCE</Link>
        </nav>
        <div className="session-controls">
          <span className={demoMode ? 'status amber' : 'status green'}>{demoMode ? 'DEMO' : 'REAL'}</span>
          <OwnerLogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
