// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppNavigation } from './app-navigation';

const navigation = vi.hoisted(() => ({ pathname: '/settings' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname, useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

describe('AppNavigation accessibility', () => {
  afterEach(() => cleanup());
  it('announces the active desktop destination', () => {
    render(<AppNavigation variant="desktop" />);
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Analyze' })).not.toHaveAttribute('aria-current');
  });

  it('moves focus into More, traps both tab directions, contains background, and restores focus', async () => {
    render(<><main data-testid="background"><button>Background action</button></main><AppNavigation variant="mobile" /></>);
    const trigger = screen.getByRole('button', { name: 'More' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'More navigation' });
    const close = within(dialog).getByRole('button', { name: 'Close More menu' });
    await waitFor(() => expect(close).toHaveFocus());
    expect(screen.getByTestId('background')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('aria-current', 'page');

    const logout = screen.getByRole('button', { name: 'LOG OUT' });
    logout.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(logout).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(screen.getByTestId('background')).not.toHaveAttribute('aria-hidden');
  });
});
