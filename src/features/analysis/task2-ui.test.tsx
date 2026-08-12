// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyzeWorkspace, buildManualAnalysisRequest, type CompForm, type FormState } from './analyze-workspace';
import { AnalysisResultView } from './analysis-result';
import type { AnalysisRecord } from './analysis-record';

const form: FormState = { playerName: 'Target Player', year: '2024', brand: 'Prizm', setName: 'Prizm', cardNumber: '1', parallel: 'Silver', condition: 'RAW', gradingCompanyKey: '', grade: '', askingPrice: '100', shipping: '0', tax: '0', gradingCost: '0', sellingFeePercent: '13', sellingFlatFee: '0.30', returnAllowancePercent: '2', targetRoiPercent: '', holdingDays: '90' };
const comp = (id: number, playerName: string): CompForm => ({ id, sourceLabel: `Source ${id}`, listingTitle: `Sale ${id}`, occurredAt: '2026-08-01', salePrice: '120', shipping: '0', playerName, year: '2024', brand: 'Prizm', setName: 'Prizm', cardNumber: '1', parallel: 'Silver', condition: 'RAW', gradingCompanyKey: '', grade: '', selection: 'AUTO', overrideReason: '' });

function analysis(id: string, playerName: string, rawComps: unknown[] = []): AnalysisRecord {
  return { id, snapshotId: `snapshot:${id}`, decisionId: `decision:${id}`, userId: 'owner', cardId: `card:${id}`, cutoff: '2026-08-12T00:00:00Z', currency: 'USD', purchaseStatus: 'UNDECIDED', createdAt: '2026-08-12T00:00:00Z', input: {}, result: { target: { playerName, year: 2024, raw: true }, currentOffer: { priceOrBid: { minor: '10000' } }, currentAllIn: { minor: '10000', currency: 'USD' }, fairValue: { lowMinor: '11000', centerMinor: '12000', highMinor: '13000' }, collectorValue: { askingPriceMinor: '10000', fairCenterMinor: '12000', differencePercent: 16.7 }, resaleDeal: { score: 1, roiBps: 1900, targetRoiBps: 1500, signal: 'GREEN' }, confidence: { percent: 40 }, scenario: {}, buyTiming: {}, sellTiming: {}, forecasts: [], calculationSteps: [], rawComps } };
}

const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

async function completeRequiredForm() {
  fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'First Player' } });
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });
  fireEvent.change(screen.getByLabelText('Asking price ($)'), { target: { value: '100' } });
  screen.getAllByRole('button', { name: 'Use target identity' }).forEach((button) => fireEvent.click(button));
  screen.getAllByLabelText('Source label').forEach((input, index) => fireEvent.change(input, { target: { value: `Source ${index}` } }));
  screen.getAllByLabelText('Listing / receipt description').forEach((input, index) => fireEvent.change(input, { target: { value: `Listing ${index}` } }));
  screen.getAllByLabelText('Sold price ($)').forEach((input) => fireEvent.change(input, { target: { value: '120' } }));
}

describe('Task 2 analysis UI contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => cleanup());

  it('sends each comp structured identity rather than silently inheriting the target', () => {
    const body = buildManualAnalysisRequest(form, [comp(1, 'Wrong Player'), comp(2, 'Target Player')]);
    expect(body.comps[0].card.playerName).toBe('Wrong Player');
    expect(body.comps[1].card.playerName).toBe('Target Player');
    expect(body.comps[0].card).not.toBe(body.card);
  });

  it('replaces the complete result/action state after a second successful analysis', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ records: [] }))
      .mockResolvedValueOnce(response({ analysis: analysis('analysis:one', 'First Player') }))
      .mockResolvedValueOnce(response({ analysis: analysis('analysis:two', 'Second Player') }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AnalyzeWorkspace />);
    await completeRequiredForm();
    fireEvent.submit(screen.getByRole('button', { name: 'ANALYZE CARD →' }).closest('form')!);
    expect(await screen.findByRole('heading', { name: /First Player.*RAW/i })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Second Player' } });
    screen.getAllByRole('button', { name: 'Use target identity' }).forEach((button) => fireEvent.click(button));
    fireEvent.change(screen.getByLabelText('Asking price ($)'), { target: { value: '101' } });
    fireEvent.submit(screen.getByRole('button', { name: 'ANALYZE CARD →' }).closest('form')!);
    expect(await screen.findByRole('heading', { name: /Second Player.*RAW/i })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /First Player.*RAW/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('recovers from a rejected request without clearing fields or locking retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    render(<AnalyzeWorkspace />);
    await completeRequiredForm();
    fireEvent.submit(screen.getByRole('button', { name: 'ANALYZE CARD →' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    expect(screen.getByLabelText('Player name')).toHaveValue('First Player');
    expect(screen.getByRole('button', { name: 'ANALYZE CARD →' })).toBeEnabled();
  });

  it('blocks an identical duplicate submission after success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ records: [] }))
      .mockResolvedValue(response({ analysis: analysis('analysis:once', 'First Player') }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AnalyzeWorkspace />);
    await completeRequiredForm();
    const formElement = screen.getByRole('button', { name: 'ANALYZE CARD →' }).closest('form')!;
    fireEvent.submit(formElement);
    expect(await screen.findByRole('heading', { name: /First Player.*RAW/i })).toBeVisible();
    fireEvent.submit(formElement);
    expect(await screen.findByRole('alert')).toHaveTextContent('exact analysis was already submitted');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('renders automatic eligibility, forced include/exclude, and both override reasons', () => {
    const rawComps = [
      { record: { id: 'c1', sourceLabel: 'One', listingTitle: 'One', occurredAt: '2026-08-01' }, match: { total: .7 }, observedAllIn: { minor: '10000' }, ageDays: 10, automaticallyIncluded: false, manuallyIncluded: true, included: true, exclusionCodes: ['WRONG_PARALLEL'], overrideReason: 'Trusted visual verification' },
      { record: { id: 'c2', sourceLabel: 'Two', listingTitle: 'Two', occurredAt: '2026-08-01' }, match: { total: 1 }, observedAllIn: { minor: '11000' }, ageDays: 10, automaticallyIncluded: true, manuallyIncluded: false, included: false, exclusionCodes: [], overrideReason: 'Damaged copy' },
    ];
    render(<AnalysisResultView initialAnalysis={analysis('analysis:audit', 'Audit Player', rawComps)} />);
    expect(screen.getByText(/AUTO: EXCLUDED · MANUAL: FORCE INCLUDE/)).toBeVisible();
    expect(screen.getByText('AUTO REASONS: WRONG_PARALLEL')).toBeVisible();
    expect(screen.getByText('OVERRIDE: Trusted visual verification')).toBeVisible();
    expect(screen.getByText(/AUTO: INCLUDED · MANUAL: EXCLUDE/)).toBeVisible();
    expect(screen.getByText('OVERRIDE: Damaged copy')).toBeVisible();
  });
});
