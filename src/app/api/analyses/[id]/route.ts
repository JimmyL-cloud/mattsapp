import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { purchaseStatuses } from '@/features/portfolio/purchase-status';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

type Context = { params: Promise<{ id: string }> };
const decisionSchema = z.object({ status: z.enum(purchaseStatuses), reason: z.string().trim().max(1_000).nullable().optional().default(null) });

export function createAnalysisIdHandlers(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies) {
  return {
    GET: async (request: NextRequest, context: Context) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      const analysis = await dependencies.getRepository().getAnalysis(owner.id, (await context.params).id);
      return analysis ? NextResponse.json({ analysis }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    },

    PATCH: async (request: NextRequest, context: Context) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: 'Invalid decision update', details: parsed.error.flatten() }, { status: 400 });
      if (parsed.data.status === 'PURCHASED') return NextResponse.json({ error: 'Use the purchase endpoint to record amount, source, and date' }, { status: 400 });
      const analysis = await dependencies.getRepository().updateDecision(owner.id, (await context.params).id, parsed.data.status, parsed.data.reason);
      return analysis ? NextResponse.json({ analysis }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    },
  };
}

export const { GET, PATCH } = createAnalysisIdHandlers();
