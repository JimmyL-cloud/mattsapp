import { TerminalShell } from '@/components/terminal/terminal-shell';
import { AnalyzeWorkspace } from '@/features/analysis/analyze-workspace';
import { requireOwner } from '@/lib/auth/require-owner';
import './analyze.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await requireOwner();
  return <TerminalShell><AnalyzeWorkspace /></TerminalShell>;
}
