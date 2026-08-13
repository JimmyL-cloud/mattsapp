import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { createPurchaseHandler } from '@/app/api/analyses/[id]/purchase/route';
import { createReversalHandler } from '@/app/api/analyses/[id]/purchase/reversal/route';
import { InMemoryAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-workflow';
import type { OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (path: string, owner: string | null, body: object) => new NextRequest(`http://test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(owner ? { 'x-owner': owner } : {}) }, body: JSON.stringify(body) });
const purchaseBody = { idempotencyKey: 'purchase-boundary-1', amountMinor: 10_000, currency: 'USD', source: 'Receipt', occurredAt: '2026-08-12T12:00:00Z' };
const reversalBody = { idempotencyKey: 'reversal-boundary-1', reason: 'Refund', source: 'Seller', occurredAt: '2026-08-12T13:00:00Z' };

describe('financial owner boundaries', () => {
  it('denies unauthenticated and cross-owner purchase/reversal writes and rejects a future reversal', async () => {
    const repository = new InMemoryAnalysisWorkflowRepository();
    await repository.createAnalysis({ id: 'analysis:owner-a', snapshotId: 'snapshot:a', decisionId: 'decision:a', userId: 'owner-a', cardId: 'card:a', cutoff: '2026-08-12T10:00:00Z', formulaVersion: 'test', currentPriceMinor: 10_000n, currency: 'USD', input: {}, result: {}, evidence: [] });
    const dependencies: OwnerRouteDependencies = { getOwner: async (headers) => headers.get('x-owner') ? { id: headers.get('x-owner')!, email: 'owner@test' } : null, getRepository: () => repository };
    const purchase = createPurchaseHandler(dependencies, () => new Date('2026-08-12T14:00:00Z'));
    const reversal = createReversalHandler(dependencies, () => new Date('2026-08-12T14:00:00Z'));
    expect((await purchase(request('/purchase', null, purchaseBody), context('analysis:owner-a'))).status).toBe(401);
    expect((await purchase(request('/purchase', 'owner-b', purchaseBody), context('analysis:owner-a'))).status).toBe(404);
    expect((await reversal(request('/reversal', null, reversalBody), context('analysis:owner-a'))).status).toBe(401);
    expect((await reversal(request('/reversal', 'owner-b', reversalBody), context('analysis:owner-a'))).status).toBe(404);
    expect((await repository.getAnalysis('owner-a', 'analysis:owner-a'))?.purchaseStatus).toBe('UNDECIDED');
    expect((await purchase(request('/purchase', 'owner-a', purchaseBody), context('analysis:owner-a'))).status).toBe(201);
    expect((await reversal(request('/reversal', 'owner-a', { ...reversalBody, occurredAt: '2026-08-13T12:00:00Z' }), context('analysis:owner-a'))).status).toBe(400);
    expect((await repository.getAnalysis('owner-a', 'analysis:owner-a'))?.purchaseStatus).toBe('PURCHASED');
  });
});
