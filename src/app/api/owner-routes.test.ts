import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createAnalysesHandlers } from '@/app/api/analyses/route';
import { createAnalysisIdHandlers } from '@/app/api/analyses/[id]/route';
import { createPurchaseHandler } from '@/app/api/analyses/[id]/purchase/route';
import { createReversalHandler } from '@/app/api/analyses/[id]/purchase/reversal/route';
import { createSettingsHandlers } from '@/app/api/settings/route';
import { createWatchlistHandlers } from '@/app/api/watchlist/route';
import { createWatchlistIdHandlers } from '@/app/api/watchlist/[id]/route';
import { InMemoryAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-workflow';
import type { OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

const repository = new InMemoryAnalysisWorkflowRepository();
const dependencies: OwnerRouteDependencies = {
  getOwner: async (headers) => {
    const id = headers.get('x-test-owner');
    return id ? { id, email: `${id}@example.test` } : null;
  },
  getRepository: () => repository,
};
const analyses = createAnalysesHandlers(dependencies);
const analysisId = createAnalysisIdHandlers(dependencies);
const purchase = createPurchaseHandler(dependencies);
const reversal = createReversalHandler(dependencies);
const settings = createSettingsHandlers(dependencies);
const watchlist = createWatchlistHandlers(dependencies);
const watchlistId = createWatchlistIdHandlers(dependencies);
const context = (id: string) => ({ params: Promise.resolve({ id }) });
type TestRequestInit = Pick<RequestInit, 'method' | 'body' | 'headers'>;
const request = (url: string, owner?: string, init: TestRequestInit = {}) => new NextRequest(url, {
  ...init,
  headers: { ...(owner ? { 'x-test-owner': owner } : {}), ...(init.headers ?? {}) },
});

describe('authenticated analysis workflow routes', () => {
  it('returns 401 before accessing each protected resource when unauthenticated', async () => {
    await expect(analyses.GET(request('http://test/api/analyses'))).resolves.toMatchObject({ status: 401 });
    await expect(analysisId.GET(request('http://test/api/analyses/a'), context('a'))).resolves.toMatchObject({ status: 401 });
    await expect(settings.GET(request('http://test/api/settings'))).resolves.toMatchObject({ status: 401 });
    await expect(watchlist.GET(request('http://test/api/watchlist'))).resolves.toMatchObject({ status: 401 });
    await expect(watchlistId.PATCH(request('http://test/api/watchlist/a', undefined, { method: 'PATCH', body: JSON.stringify({ notes: null, isStarred: false }), headers: { 'content-type': 'application/json' } }), context('a'))).resolves.toMatchObject({ status: 401 });
  });

  it('does not reveal or mutate another owner analysis, decision, settings, or watchlist', async () => {
    await repository.createAnalysis({
      id: 'analysis:owner-a', snapshotId: 'snapshot:owner-a', decisionId: 'decision:owner-a', userId: 'owner-a', cardId: 'card:owner-a',
      cutoff: '2026-08-12T00:00:00.000Z', formulaVersion: 'test-v1', currentPriceMinor: 1n, currency: 'USD', input: {}, result: {}, evidence: [],
    });
    await repository.updateSettings('owner-a', { targetRoiBps: 2_000, showTraderImportTools: false });
    await repository.saveWatchlist({ id: 'watch:owner-a', userId: 'owner-a', cardId: 'card:owner-a', marketRecordId: null, notes: 'private', isStarred: true, createdAt: '2026-08-12T00:00:00.000Z' });

    expect((await analysisId.GET(request('http://test/api/analyses/analysis:owner-a', 'owner-b'), context('analysis:owner-a'))).status).toBe(404);
    expect((await analysisId.PATCH(request('http://test/api/analyses/analysis:owner-a', 'owner-b', { method: 'PATCH', body: JSON.stringify({ status: 'PASSED', reason: 'Not my card' }), headers: { 'content-type': 'application/json' } }), context('analysis:owner-a'))).status).toBe(404);
    expect((await repository.getAnalysis('owner-a', 'analysis:owner-a'))?.purchaseStatus).toBe('UNDECIDED');

    const ownerBSettings = await (await settings.GET(request('http://test/api/settings', 'owner-b'))).json();
    expect(ownerBSettings.settings.targetRoiBps).toBe(1_500);
    expect((await settings.PATCH(request('http://test/api/settings', 'owner-b', { method: 'PATCH', body: JSON.stringify({ targetRoiBps: 1_800 }), headers: { 'content-type': 'application/json' } }))).status).toBe(200);
    expect((await repository.getSettings('owner-a')).targetRoiBps).toBe(2_000);

    expect((await (await watchlist.GET(request('http://test/api/watchlist', 'owner-b'))).json()).watchlist).toEqual([]);
    expect((await watchlistId.PATCH(request('http://test/api/watchlist/watch:owner-a', 'owner-b', { method: 'PATCH', body: JSON.stringify({ notes: 'intrude', isStarred: false }), headers: { 'content-type': 'application/json' } }), context('watch:owner-a'))).status).toBe(404);
    expect((await watchlistId.DELETE(request('http://test/api/watchlist/watch:owner-a', 'owner-b', { method: 'DELETE' }), context('watch:owner-a'))).status).toBe(404);
    expect((await repository.listWatchlist('owner-a'))).toHaveLength(1);
  });

  it('requires a complete authenticated purchase record and exposes only explicit purchases in Portfolio', async () => {
    await repository.createAnalysis({
      id: 'analysis:purchase', snapshotId: 'snapshot:purchase', decisionId: 'decision:purchase', userId: 'owner-p', cardId: 'card:purchase',
      cutoff: '2026-08-12T00:00:00.000Z', formulaVersion: 'test-v1', currentPriceMinor: 10_000n, currency: 'USD',
      input: { card: { playerName: 'Purchase Player', year: 2024, raw: true } }, result: { scenario: { maximumPurchasePriceForTargetRoi: { minor: '9000' } } }, evidence: [],
    });
    expect((await purchase(request('http://test/api/analyses/analysis:purchase/purchase', undefined, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }), context('analysis:purchase'))).status).toBe(401);
    expect((await analysisId.PATCH(request('http://test/api/analyses/analysis:purchase', 'owner-p', { method: 'PATCH', body: JSON.stringify({ status: 'PURCHASED', reason: 'Bought' }), headers: { 'content-type': 'application/json' } }), context('analysis:purchase'))).status).toBe(400);
    expect((await repository.loadPortfolio('owner-p')).holdings).toHaveLength(0);

    const saved = await purchase(request('http://test/api/analyses/analysis:purchase/purchase', 'owner-p', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'purchase-test-0001', amountMinor: 8_500, currency: 'USD', source: 'Card show receipt', occurredAt: '2026-08-12T12:00:00Z' }),
    }), context('analysis:purchase'));
    expect(saved.status).toBe(201);
    const portfolio = await repository.loadPortfolio('owner-p');
    expect(portfolio.holdings).toHaveLength(1);
    expect(portfolio.holdings[0]).toMatchObject({ costBasisMinor: 8_500n, currentValueMinor: null, isDemo: false });
    expect(portfolio.decisions.map((decision) => decision.purchaseStatus)).toEqual(['PURCHASED']);

    const illegal = await analysisId.PATCH(request('http://test/api/analyses/analysis:purchase', 'owner-p', { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED', reason: 'Changed mind' }), headers: { 'content-type': 'application/json' } }), context('analysis:purchase'));
    expect(illegal.status).toBe(409);
    expect((await repository.loadPortfolio('owner-p')).holdings).toHaveLength(1);

    const backdated = await reversal(request('http://test/api/analyses/analysis:purchase/purchase/reversal', 'owner-p', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idempotencyKey: 'reversal-backdated-0001', reason: 'Invalid chronology', source: 'Seller refund', occurredAt: '2026-08-12T11:00:00Z' }) }), context('analysis:purchase'));
    expect(backdated.status).toBe(400);
    expect(await backdated.json()).toEqual({ error: 'Reversal date cannot precede purchase date' });
    expect((await repository.loadPortfolio('owner-p')).holdings).toHaveLength(1);

    const reversed = await reversal(request('http://test/api/analyses/analysis:purchase/purchase/reversal', 'owner-p', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idempotencyKey: 'reversal-test-0001', reason: 'Seller refunded purchase', source: 'Seller refund', occurredAt: '2026-08-12T13:00:00Z' }) }), context('analysis:purchase'));
    expect(reversed.status).toBe(201);
    expect((await repository.loadPortfolio('owner-p')).holdings).toHaveLength(0);
  });

  it('returns exact purchase retries and rejects key reuse or future dates', async () => {
    await repository.createAnalysis({ id: 'analysis:retry', snapshotId: 'snapshot:retry', decisionId: 'decision:retry', userId: 'owner-r', cardId: 'card:retry', cutoff: '2026-08-12T00:00:00.000Z', formulaVersion: 'test-v1', currentPriceMinor: 10_000n, currency: 'USD', input: {}, result: {}, evidence: [] });
    const fixed = createPurchaseHandler(dependencies, () => new Date('2026-08-12T14:00:00Z'));
    const body = { idempotencyKey: 'purchase-retry-0001', amountMinor: 10_000, currency: 'USD', source: 'Receipt', occurredAt: '2026-08-12T12:00:00Z' };
    const send = (value: object) => fixed(request('http://test/api/analyses/analysis:retry/purchase', 'owner-r', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }), context('analysis:retry'));
    expect((await send(body)).status).toBe(201);
    const replay = await send(body);
    expect(replay.status).toBe(200);
    expect((await replay.json()).replayed).toBe(true);
    expect((await send({ ...body, amountMinor: 11_000 })).status).toBe(409);
    expect((await send({ ...body, idempotencyKey: 'purchase-future-0001', occurredAt: '2026-08-13T12:00:00Z' })).status).toBe(400);
  });

  it('collapses concurrent exact purchase retries to one holding', async () => {
    await repository.createAnalysis({ id: 'analysis:concurrent', snapshotId: 'snapshot:concurrent', decisionId: 'decision:concurrent', userId: 'owner-c', cardId: 'card:concurrent', cutoff: '2026-08-12T00:00:00.000Z', formulaVersion: 'test-v1', currentPriceMinor: 10_000n, currency: 'USD', input: {}, result: {}, evidence: [] });
    const body = { idempotencyKey: 'purchase-concurrent-0001', amountMinor: 10_000, currency: 'USD', source: 'Receipt', occurredAt: '2026-08-12T12:00:00Z' };
    const send = () => purchase(request('http://test/api/analyses/analysis:concurrent/purchase', 'owner-c', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), context('analysis:concurrent'));
    const responses = await Promise.all([send(), send()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    expect((await repository.loadPortfolio('owner-c')).holdings).toHaveLength(1);
  });

  it('groups open portfolio totals by currency without cross-currency addition', async () => {
    for (const [suffix, currency, amount] of [['usd', 'USD', 10_000], ['cad', 'CAD', 20_000]] as const) {
      await repository.createAnalysis({ id: `analysis:${suffix}`, snapshotId: `snapshot:${suffix}`, decisionId: `decision:${suffix}`, userId: 'owner-mixed', cardId: `card:${suffix}`, cutoff: '2026-08-12T00:00:00.000Z', formulaVersion: 'test-v1', currentPriceMinor: BigInt(amount), currency, input: {}, result: {}, evidence: [] });
      await repository.recordPurchase('owner-mixed', { analysisId: `analysis:${suffix}`, idempotencyKey: `purchase-mixed-${suffix}`, amountMinor: BigInt(amount), currency, source: 'Receipt', occurredAt: '2026-08-12T12:00:00Z' });
    }
    expect((await repository.loadPortfolio('owner-mixed')).summaries).toEqual([
      expect.objectContaining({ currency: 'CAD', costBasisMinor: 20_000n, holdingCount: 1 }),
      expect.objectContaining({ currency: 'USD', costBasisMinor: 10_000n, holdingCount: 1 }),
    ]);
  });

  it('does not expose repository or database errors from write routes', async () => {
    const databaseError = new Error('Failed query: update user_decisions set reason = $1; params: private owner reason');
    const failingRepository = Object.create(repository) as InMemoryAnalysisWorkflowRepository;
    failingRepository.updateDecision = async () => { throw databaseError; };
    failingRepository.recordPurchase = async () => { throw databaseError; };
    failingRepository.reversePurchase = async () => { throw databaseError; };
    const failingDependencies: OwnerRouteDependencies = { ...dependencies, getRepository: () => failingRepository };
    const failingDecision = createAnalysisIdHandlers(failingDependencies);
    const failingPurchase = createPurchaseHandler(failingDependencies);
    const failingReversal = createReversalHandler(failingDependencies);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const headers = { 'content-type': 'application/json' };

    const decisionResponse = await failingDecision.PATCH(request('http://test/api/analyses/private', 'owner-private', {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'PASSED', reason: 'Private reason' }),
    }), context('private'));
    const purchaseResponse = await failingPurchase(request('http://test/api/analyses/private/purchase', 'owner-private', {
      method: 'POST', headers, body: JSON.stringify({ idempotencyKey: 'private-purchase-key', amountMinor: 10_000, currency: 'USD', source: 'Private source', occurredAt: '2026-08-12T12:00:00Z' }),
    }), context('private'));
    const reversalResponse = await failingReversal(request('http://test/api/analyses/private/purchase/reversal', 'owner-private', {
      method: 'POST', headers, body: JSON.stringify({ idempotencyKey: 'private-reversal-key', reason: 'Private reversal reason', source: 'Private source', occurredAt: '2026-08-12T12:00:00Z' }),
    }), context('private'));

    expect(decisionResponse.status).toBe(500);
    expect(purchaseResponse.status).toBe(500);
    expect(reversalResponse.status).toBe(500);
    expect(await decisionResponse.json()).toEqual({ error: 'Decision could not be updated' });
    expect(await purchaseResponse.json()).toEqual({ error: 'Purchase could not be recorded' });
    expect(await reversalResponse.json()).toEqual({ error: 'Purchase reversal could not be recorded' });
    expect(error).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(error.mock.calls)).not.toContain('private owner reason');
    error.mockRestore();
  });
});
