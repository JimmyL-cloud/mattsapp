import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';
import { financialWriteFields } from '@/lib/api/financial-write-schema';
import { isFinancialTimestampInFuture } from '@/lib/api/financial-write-validation';
import { logRedactedServerError } from '@/lib/api/server-error';
import { AnalysisWorkflowConflictError, AnalysisWorkflowValidationError } from '@/lib/db/repositories/analysis-workflow';

type Context = { params: Promise<{ id: string }> };
const reversalSchema = z.object({
  ...financialWriteFields,
  reason: z.string().trim().min(1).max(1_000),
});

export function createReversalHandler(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies, now: () => Date = () => new Date()) {
  return async (request: NextRequest, context: Context) => {
    const owner = await dependencies.getOwner(request.headers);
    if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
    const parsed = reversalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid reversal record', details: parsed.error.flatten() }, { status: 400 });
    if (isFinancialTimestampInFuture(parsed.data.occurredAt, now())) return NextResponse.json({ error: 'Reversal date cannot be in the future' }, { status: 400 });
    try {
      const result = await dependencies.getRepository().reversePurchase(owner.id, { analysisId: (await context.params).id, ...parsed.data });
      return result ? NextResponse.json({ analysis: result.analysis, replayed: result.replayed }, { status: result.replayed ? 200 : 201 }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    } catch (error) {
      logRedactedServerError('Purchase reversal failed', error);
      if (error instanceof AnalysisWorkflowValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(
        { error: error instanceof AnalysisWorkflowConflictError ? 'Reversal conflicts with the current purchase state' : 'Purchase reversal could not be recorded' },
        { status: error instanceof AnalysisWorkflowConflictError ? 409 : 500 },
      );
    }
  };
}

export const POST = createReversalHandler();
