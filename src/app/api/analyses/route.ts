import { NextResponse, type NextRequest } from 'next/server';
import { ManualAnalysisService, manualAnalysisRequestSchema } from '@/features/analysis/manual-analysis-service';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

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
        const analysis = await new ManualAnalysisService(dependencies.getRepository()).create(owner.id, parsed.data);
        return NextResponse.json({ analysis }, { status: 201 });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Analysis failed' }, { status: 422 });
      }
    },
  };
}

export const { GET, POST } = createAnalysesHandlers();
