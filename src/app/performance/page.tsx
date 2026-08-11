import { TerminalShell } from '@/components/terminal/terminal-shell';
import { createDemoPerformance } from '@/features/performance/demo-performance';
import type { OutcomeEvaluation } from '@/features/performance/evaluate-outcome';
import { PerformanceTerminal } from '@/features/performance/performance-terminal';
import { requireOwner } from '@/lib/auth/require-owner';
import { databaseIsConfigured, getDatabase } from '@/lib/db/client';
import { PostgresTradingLedger } from '@/lib/db/repositories/trading-ledger';
import './performance.css';

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const owner = await requireOwner();
  const demoMode = (await searchParams).scope !== 'real';
  let performance: { userId: string; evaluations: readonly OutcomeEvaluation[] } = demoMode
    ? createDemoPerformance()
    : { userId: owner.id, evaluations: [] };
  if (databaseIsConfigured()) {
    const evaluations = await new PostgresTradingLedger(getDatabase()).loadOutcomes(
      owner.id,
      demoMode ? 'DEMO_ONLY' : 'REAL_ONLY',
    );
    if (!demoMode || evaluations.length) performance = { userId: owner.id, evaluations };
  }
  return <TerminalShell demoMode={demoMode}>
    <PerformanceTerminal {...performance} demoMode={demoMode} />
  </TerminalShell>;
}