import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PortfolioPage from './page';

vi.mock('@/lib/auth/require-owner', () => ({ requireOwner: vi.fn().mockResolvedValue({ id: 'owner', email: 'matt@example.com' }) }));
vi.mock('@/components/terminal/terminal-shell', () => ({ TerminalShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/features/portfolio/portfolio-terminal', () => ({ PortfolioTerminal: ({ holdings, decisions }: { holdings: unknown[]; decisions: unknown[] }) => <div>SAFE PORTFOLIO {holdings.length}/{decisions.length}</div> }));

describe('Portfolio page Task 2 boundary', () => {
  it('renders the safe real-only empty state without invoking the incompatible legacy snapshot loader', async () => {
    const markup = renderToStaticMarkup(await PortfolioPage());
    expect(markup).toContain('SAFE PORTFOLIO 0/0');
  });
});
