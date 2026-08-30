import { TerminalShell } from '@/components/terminal/terminal-shell';
import { PerformanceTerminal } from '@/features/performance/performance-terminal';
import { requireOwner } from '@/lib/auth/require-owner';
import { databaseIsConfigured, getDatabase } from '@/lib/db/client';
import { PostgresTradingLedger } from '@/lib/db/repositories/trading-ledger';
import './performance.css';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const owner = await requireOwner();
  const evaluations = databaseIsConfigured() ? await new PostgresTradingLedger(getDatabase()).loadOutcomes(owner.id, 'REAL_ONLY') : [];
  return <TerminalShell><PerformanceTerminal userId={owner.id} evaluations={evaluations} demoMode={false} /></TerminalShell>;
}
