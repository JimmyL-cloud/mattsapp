import Link from 'next/link';
import { TerminalShell } from '@/components/terminal/terminal-shell';
import { requireOwner } from '@/lib/auth/require-owner';

export default async function Home() {
  await requireOwner();
  return <TerminalShell demoMode><section className="panel"><h1>Market Overview</h1><p>Calculation-first football-card terminal.</p><p><Link className="positive" href="/analysis/demo">OPEN DEMO ANALYSIS →</Link></p></section></TerminalShell>;
}