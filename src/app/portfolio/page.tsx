import { TerminalShell } from '@/components/terminal/terminal-shell';
import { PortfolioTerminal } from '@/features/portfolio/portfolio-terminal';
import { requireOwner } from '@/lib/auth/require-owner';
import { getAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-runtime';
import './portfolio.css';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const owner = await requireOwner();
  const portfolio = await getAnalysisWorkflowRepository().loadPortfolio(owner.id);
  return <TerminalShell><PortfolioTerminal {...portfolio} demoMode={false} /></TerminalShell>;
}
