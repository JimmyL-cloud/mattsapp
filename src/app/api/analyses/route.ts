import { NextResponse, type NextRequest } from 'next/server';
import { ManualAnalysisService, manualAnalysisRequestSchema } from '@/features/analysis/manual-analysis-service';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';
import { getMarketRecordRepository } from '@/lib/db/repositories/market-runtime';
import { AnalysisWorkflowConflictError, AnalysisWorkflowValidationError } from '@/lib/db/repositories/analysis-workflow';
import { logRedactedServerError } from '@/lib/api/server-error';

export function createAnalysesHandlers(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies) {
  return {
    GET: async (request: NextRequest) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      return NextResponse.json({ analyses: await dependencies.getRepository().listAnalyses(owner.id) });
    },

    POST: async (request: NextRequest) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      const parsed = manualAnalysisRequestSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: 'Invalid analysis request', details: parsed.error.flatten() }, { status: 400 });
      try {
        const analysis = await new ManualAnalysisService(dependencies.getRepository(), getMarketRecordRepository()).create(owner.id, parsed.data);
        return NextResponse.json({ analysis }, { status: 201 });
      } catch (error) {
        if (error instanceof AnalysisWorkflowValidationError) return NextResponse.json({ error: error.message }, { status: 422 });
        if (error instanceof AnalysisWorkflowConflictError) return NextResponse.json({ error: 'Analysis request conflicts with an existing operation' }, { status: 409 });
        logRedactedServerError('Analysis creation failed', error);
        return NextResponse.json({ error: 'Analysis could not be completed' }, { status: 500 });
      }
    },
  };
}

export const { GET, POST } = createAnalysesHandlers();
