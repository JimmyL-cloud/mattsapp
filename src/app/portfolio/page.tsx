import { TerminalShell } from '@/components/terminal/terminal-shell';
import { PortfolioTerminal } from '@/features/portfolio/portfolio-terminal';
import { requireOwner } from '@/lib/auth/require-owner';
import { databaseIsConfigured, getDatabase } from '@/lib/db/client';
import { PostgresTradingLedger, type PersistedPortfolio } from '@/lib/db/repositories/trading-ledger';
import './portfolio.css';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const owner = await requireOwner();
  let portfolio: PersistedPortfolio = { summary: { holdingCount: 0, costBasisMinor: 0n, currentValueMinor: 0n, unrealizedProfitMinor: 0n, currency: 'USD' }, holdings: [], decisions: [] };
  if (databaseIsConfigured()) portfolio = await new PostgresTradingLedger(getDatabase()).loadPortfolio(owner.id, 'REAL_ONLY');
  return <TerminalShell><PortfolioTerminal {...portfolio} demoMode={false} /></TerminalShell>;
}
