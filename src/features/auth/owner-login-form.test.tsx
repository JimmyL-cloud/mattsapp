// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnerLoginForm } from './owner-login-form';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe('OwnerLoginForm', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it('shows the fixed owner identity and provides an eight-character revealable password field', () => {
    render(<OwnerLoginForm ownerEmail="matt@example.com" />);
    expect(screen.getByText('matt@example.com')).toBeVisible();
    const password = screen.getByLabelText('PASSWORD');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('minlength', '8');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('recovers from a rejected login request and permits retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline login')));
    render(<OwnerLoginForm ownerEmail="matt@example.com" />);
    fireEvent.change(screen.getByLabelText('PASSWORD'), { target: { value: 'password8' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTER TERMINAL' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline login');
    expect(screen.getByRole('button', { name: 'ENTER TERMINAL' })).toBeEnabled();
    expect(screen.getByLabelText('PASSWORD')).toHaveValue('password8');
  });
});
