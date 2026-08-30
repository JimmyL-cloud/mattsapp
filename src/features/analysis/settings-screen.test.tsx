// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsScreen } from './settings-screen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('SettingsScreen recovery', () => {
  afterEach(() => cleanup());

  it('keeps load failure distinct, retries, saves, and unlocks after a rejected save', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Offline settings'))
      .mockResolvedValueOnce(response({ settings: { targetRoiBps: 1800, showTraderImportTools: false } }))
      .mockRejectedValueOnce(new Error('Offline save'));
    vi.stubGlobal('fetch', fetchMock);
    render(<SettingsScreen ownerEmail="matt@example.com" />);
    expect(await screen.findByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const input = await screen.findByLabelText('Target resale ROI (%)');
    await waitFor(() => expect(input).toHaveValue(18));
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE PROFILE' }));
    expect(await screen.findByText('Offline save')).toBeVisible();
    expect(screen.getByRole('button', { name: 'SAVE PROFILE' })).toBeEnabled();
    expect(input).toHaveValue(20);
  });

  it('loads the CSV preference and sends it with the profile update', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ settings: { targetRoiBps: 1500, showTraderImportTools: true } }))
      .mockResolvedValueOnce(response({ settings: { targetRoiBps: 1500, showTraderImportTools: false } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<SettingsScreen ownerEmail="matt@example.com" />);
    const toggle = await screen.findByRole('checkbox', { name: /Show CSV import tools/ });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'SAVE PROFILE' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ targetRoiBps: 1500, showTraderImportTools: false });
  });
});
