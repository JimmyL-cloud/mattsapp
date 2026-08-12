import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

type Context = { params: Promise<{ id: string }> };
const reversalSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  reason: z.string().trim().min(1).max(1_000),
  source: z.string().trim().min(1).max(200),
  occurredAt: z.string().datetime({ offset: true }),
});

export function createReversalHandler(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies, now: () => Date = () => new Date()) {
  return async (request: NextRequest, context: Context) => {
    const owner = await dependencies.getOwner(request.headers);
    if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
    const parsed = reversalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid reversal record', details: parsed.error.flatten() }, { status: 400 });
    if (Date.parse(parsed.data.occurredAt) > now().getTime() + 5 * 60_000) return NextResponse.json({ error: 'Reversal date cannot be in the future' }, { status: 400 });
    try {
      const result = await dependencies.getRepository().reversePurchase(owner.id, { analysisId: (await context.params).id, ...parsed.data });
      return result ? NextResponse.json({ analysis: result.analysis, replayed: result.replayed }, { status: result.replayed ? 200 : 201 }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Purchase reversal could not be recorded' }, { status: 409 });
    }
  };
}

export const POST = createReversalHandler();
