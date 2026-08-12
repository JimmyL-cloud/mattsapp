// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsScreen } from './settings-screen';

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('SettingsScreen recovery', () => {
  afterEach(() => cleanup());

  it('keeps load failure distinct, retries, saves, and unlocks after a rejected save', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Offline settings'))
      .mockResolvedValueOnce(response({ settings: { targetRoiBps: 1800 } }))
      .mockRejectedValueOnce(new Error('Offline save'));
    vi.stubGlobal('fetch', fetchMock);
    render(<SettingsScreen ownerEmail="matt@example.com" />);
    expect(await screen.findByRole('heading', { name: 'Settings unavailable' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const input = await screen.findByLabelText('Target resale ROI (%)');
    await waitFor(() => expect(input).toHaveValue(18));
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE DEFAULT' }));
    expect(await screen.findByText('Offline save')).toBeVisible();
    expect(screen.getByRole('button', { name: 'SAVE DEFAULT' })).toBeEnabled();
    expect(input).toHaveValue(20);
  });
});
