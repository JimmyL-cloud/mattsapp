import { TerminalShell } from '@/components/terminal/terminal-shell';
import { WatchlistScreen } from '@/features/analysis/watchlist-screen';
import { requireOwner } from '@/lib/auth/require-owner';
import './watchlist.css';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  await requireOwner();
  return <TerminalShell><WatchlistScreen /></TerminalShell>;
}
