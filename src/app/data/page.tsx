import { TerminalShell } from '@/components/terminal/terminal-shell';
import { DataConsole } from '@/features/imports/data-console';
import { requireOwner } from '@/lib/auth/require-owner';
import { databaseIsConfigured } from '@/lib/db/client';
import './data-console.css';

export default async function DataPage() {
  await requireOwner();
  return (
    <TerminalShell demoMode>
      <DataConsole durableStorage={databaseIsConfigured()} />
    </TerminalShell>
  );
}