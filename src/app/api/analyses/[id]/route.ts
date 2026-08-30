import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';
import { logRedactedServerError } from '@/lib/api/server-error';
import { AnalysisWorkflowConflictError } from '@/lib/db/repositories/analysis-workflow';

type Context = { params: Promise<{ id: string }> };
const decisionSchema = z.object({ status: z.enum(['PASSED', 'MISSED', 'CANCELLED']), reason: z.string().trim().min(1).max(1_000) });

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
      try {
        const analysis = await dependencies.getRepository().updateDecision(owner.id, (await context.params).id, parsed.data.status, parsed.data.reason);
        return analysis ? NextResponse.json({ analysis }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
      } catch (error) {
        logRedactedServerError('Decision update failed', error);
        return NextResponse.json(
          { error: error instanceof AnalysisWorkflowConflictError ? 'Decision conflicts with the current analysis state' : 'Decision could not be updated' },
          { status: error instanceof AnalysisWorkflowConflictError ? 409 : 500 },
        );
      }
    },
  };
}

export const { GET, PATCH } = createAnalysisIdHandlers();
