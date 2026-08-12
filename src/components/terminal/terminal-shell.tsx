import type { ReactNode } from 'react';
import Link from 'next/link';
import { AppNavigation } from './app-navigation';
import { OwnerLogoutButton } from '@/features/auth/owner-logout-button';

export function TerminalShell({ children }: { children: ReactNode; demoMode?: boolean }) {
  return (
    <div className="terminal-shell">
      <header className="terminal-header">
        <Link className="wordmark" href="/">mattsapp</Link>
        <AppNavigation variant="desktop" />
        <div className="session-controls"><span className="status green">PRIVATE</span><OwnerLogoutButton /></div>
      </header>
      <main>{children}</main>
      <AppNavigation variant="mobile" />
    </div>
  );
}
