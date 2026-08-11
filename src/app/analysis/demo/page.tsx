import { TerminalShell } from '@/components/terminal/terminal-shell';
import { AnalysisTerminal } from '@/features/analysis/analysis-terminal';
import { requireOwner } from '@/lib/auth/require-owner';
import './analysis.css';
export default async function DemoAnalysisPage(){await requireOwner();return <TerminalShell demoMode><AnalysisTerminal /></TerminalShell>}