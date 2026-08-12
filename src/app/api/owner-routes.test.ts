import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { createAnalysesHandlers } from '@/app/api/analyses/route';
import { createAnalysisIdHandlers } from '@/app/api/analyses/[id]/route';
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
    await repository.updateSettings('owner-a', 2_000);
    await repository.saveWatchlist({ id: 'watch:owner-a', userId: 'owner-a', cardId: 'card:owner-a', marketRecordId: null, notes: 'private', isStarred: true, createdAt: '2026-08-12T00:00:00.000Z' });

    expect((await analysisId.GET(request('http://test/api/analyses/analysis:owner-a', 'owner-b'), context('analysis:owner-a'))).status).toBe(404);
    expect((await analysisId.PATCH(request('http://test/api/analyses/analysis:owner-a', 'owner-b', { method: 'PATCH', body: JSON.stringify({ status: 'PASSED' }), headers: { 'content-type': 'application/json' } }), context('analysis:owner-a'))).status).toBe(404);
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
});
