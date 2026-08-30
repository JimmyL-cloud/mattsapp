import { TerminalShell } from '@/components/terminal/terminal-shell';
import { HistoryScreen } from '@/features/analysis/history-screen';
import { requireOwner } from '@/lib/auth/require-owner';
import '../analyze.css';
import './history.css';

export const dynamic = 'force-dynamic';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ analysis?: string }> }) {
  await requireOwner();
  return <TerminalShell><HistoryScreen initialAnalysisId={(await searchParams).analysis} /></TerminalShell>;
}
