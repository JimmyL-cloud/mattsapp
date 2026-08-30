// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WatchlistScreen } from './watchlist-screen';

const item = { id: 'watch:1', cardId: 'card:1', marketRecordId: null, notes: 'Original note', isStarred: false, createdAt: '2026-08-12T00:00:00Z' };
const analysis = { id: 'analysis:1', snapshotId: 'snapshot:1', decisionId: 'decision:1', userId: 'owner', cardId: 'card:1', cutoff: '2026-08-12T00:00:00Z', currency: 'USD', purchaseStatus: 'MISSED', createdAt: '2026-08-12T00:00:00Z', input: {}, result: { target: { playerName: 'Test Card', year: 2024, raw: true }, currentOffer: { priceOrBid: { minor: '10000' } }, collectorValue: { differencePercent: 10 }, resaleDeal: { score: 0, signal: 'AMBER' } } };
const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('WatchlistScreen state recovery', () => {
  afterEach(() => cleanup());
  it('offers every decision status and visibly rolls back rejected star and note changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ watchlist: [item] }))
      .mockResolvedValueOnce(response({ analyses: [analysis] }))
      .mockRejectedValueOnce(new Error('Offline star'))
      .mockResolvedValueOnce(response({ error: 'Rejected note' }, false));
    vi.stubGlobal('fetch', fetchMock);
    render(<WatchlistScreen />);
    expect(await screen.findByRole('heading', { name: /Test Card/i })).toBeVisible();
    for (const status of ['Undecided', 'Purchased', 'Passed', 'Missed', 'Cancelled']) expect(screen.getByRole('option', { name: status })).toBeInTheDocument();

    const star = screen.getByRole('button', { name: 'Star card' });
    fireEvent.click(star);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Star card' })).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByText('Offline star')).toBeVisible();

    const notes = screen.getByLabelText('Notes');
    fireEvent.change(notes, { target: { value: 'Unsaved edit' } });
    expect(notes).toHaveValue('Unsaved edit');
    fireEvent.blur(notes);
    await waitFor(() => expect(notes).toHaveValue('Original note'));
    expect(screen.getByText('NOT SAVED · ROLLED BACK')).toBeVisible();
    expect(screen.getByText('Rejected note')).toBeVisible();
  });

  it('shows unavailable rather than empty and retries initial loading', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Offline load'))
      .mockRejectedValueOnce(new Error('Offline load'))
      .mockResolvedValueOnce(response({ watchlist: [] }))
      .mockResolvedValueOnce(response({ analyses: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<WatchlistScreen />);
    expect(await screen.findByRole('heading', { name: 'Watchlist unavailable' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Your watchlist is empty' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Your watchlist is empty' })).toBeVisible();
  });
});
