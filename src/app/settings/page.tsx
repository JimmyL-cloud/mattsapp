import { TerminalShell } from '@/components/terminal/terminal-shell';
import { SettingsScreen } from '@/features/analysis/settings-screen';
import { requireOwner } from '@/lib/auth/require-owner';
import './settings.css';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const owner = await requireOwner();
  return <TerminalShell><SettingsScreen ownerEmail={owner.email} /></TerminalShell>;
}
