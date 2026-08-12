import { TerminalShell } from '@/components/terminal/terminal-shell';
import { PortfolioTerminal } from '@/features/portfolio/portfolio-terminal';
import { requireOwner } from '@/lib/auth/require-owner';
import './portfolio.css';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  await requireOwner();
  // Task 1 analysis snapshots use the canonical manual-analysis result shape.
  // Portfolio persistence is Task 3, so do not pass those snapshots through the
  // incompatible legacy trading-ledger read model in this beta UI.
  const portfolio = { summary: { holdingCount: 0, costBasisMinor: 0n, currentValueMinor: 0n, unrealizedProfitMinor: 0n, currency: 'USD' }, holdings: [], decisions: [] };
  return <TerminalShell><PortfolioTerminal {...portfolio} demoMode={false} /></TerminalShell>;
}
