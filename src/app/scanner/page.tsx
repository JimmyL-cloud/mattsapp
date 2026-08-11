import { TerminalShell } from '@/components/terminal/terminal-shell';
import { demoMarketRows } from '@/features/search/demo-market-rows';
import { MarketScanner } from '@/features/search/market-scanner';
import { requireOwner } from '@/lib/auth/require-owner';
import './scanner.css';

export default async function ScannerPage() {
  await requireOwner();
  return (
    <TerminalShell demoMode>
      <MarketScanner rows={demoMarketRows} />
    </TerminalShell>
  );
}