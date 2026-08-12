import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

type Context = { params: Promise<{ id: string }> };
const purchaseSchema = z.object({
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  source: z.string().trim().min(1).max(200),
  occurredAt: z.string().datetime({ offset: true }),
});

export function createPurchaseHandler(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies) {
  return async (request: NextRequest, context: Context) => {
    const owner = await dependencies.getOwner(request.headers);
    if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
    const parsed = purchaseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid purchase record', details: parsed.error.flatten() }, { status: 400 });
    try {
      const analysis = await dependencies.getRepository().recordPurchase(owner.id, { analysisId: (await context.params).id, ...parsed.data, amountMinor: BigInt(parsed.data.amountMinor) });
      return analysis ? NextResponse.json({ analysis }, { status: 201 }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Purchase could not be recorded' }, { status: 409 });
    }
  };
}

export const POST = createPurchaseHandler();
