// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyzeWorkspace } from './analyze-workspace';

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('AnalyzeWorkspace Trader CSV preference', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps CSV evidence hidden and does not load imports when the preference is off', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ settings: { targetRoiBps: 1500, showTraderImportTools: false } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AnalyzeWorkspace />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/settings');
    expect(screen.queryByRole('heading', { name: 'Imported CSV evidence' })).not.toBeInTheDocument();
  });

  it('loads and displays CSV evidence tools when the preference is on', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ settings: { targetRoiBps: 1500, showTraderImportTools: true } }))
      .mockResolvedValueOnce(response({ records: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AnalyzeWorkspace />);

    expect(await screen.findByRole('heading', { name: 'Imported CSV evidence' })).toBeVisible();
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/imports');
    expect(screen.getByRole('link', { name: 'Manage Import Data' })).toHaveAttribute('href', '/data');
  });
});
