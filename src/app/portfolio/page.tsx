import { TerminalShell } from '@/components/terminal/terminal-shell';
import { createDemoPortfolio } from '@/features/portfolio/demo-portfolio';
import { PortfolioTerminal } from '@/features/portfolio/portfolio-terminal';
import { requireOwner } from '@/lib/auth/require-owner';
import { databaseIsConfigured, getDatabase } from '@/lib/db/client';
import { PostgresTradingLedger } from '@/lib/db/repositories/trading-ledger';
import './portfolio.css';

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const owner = await requireOwner();
  const demoMode = (await searchParams).scope !== 'real';
  let portfolio = demoMode ? createDemoPortfolio() : {
    summary: { holdingCount: 0, costBasisMinor: 0n, currentValueMinor: 0n, unrealizedProfitMinor: 0n, currency: 'USD' },
    holdings: [],
    decisions: [],
  };
  if (databaseIsConfigured()) {
    const persisted = await new PostgresTradingLedger(getDatabase()).loadPortfolio(
      owner.id,
      demoMode ? 'DEMO_ONLY' : 'REAL_ONLY',
    );
    if (!demoMode || persisted.holdings.length || persisted.decisions.length) portfolio = persisted;
  }
  return <TerminalShell demoMode={demoMode}>
    <PortfolioTerminal {...portfolio} demoMode={demoMode} />
  </TerminalShell>;
}