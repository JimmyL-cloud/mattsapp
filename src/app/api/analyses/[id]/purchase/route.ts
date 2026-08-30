import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';
import { financialWriteFields } from '@/lib/api/financial-write-schema';
import { isFinancialTimestampInFuture } from '@/lib/api/financial-write-validation';
import { logRedactedServerError } from '@/lib/api/server-error';
import { AnalysisWorkflowConflictError } from '@/lib/db/repositories/analysis-workflow';

type Context = { params: Promise<{ id: string }> };
const purchaseSchema = z.object({
  ...financialWriteFields,
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
});

export function createPurchaseHandler(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies, now: () => Date = () => new Date()) {
  return async (request: NextRequest, context: Context) => {
    const owner = await dependencies.getOwner(request.headers);
    if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
    const parsed = purchaseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid purchase record', details: parsed.error.flatten() }, { status: 400 });
    if (isFinancialTimestampInFuture(parsed.data.occurredAt, now())) return NextResponse.json({ error: 'Purchase date cannot be in the future' }, { status: 400 });
    try {
      const result = await dependencies.getRepository().recordPurchase(owner.id, { analysisId: (await context.params).id, ...parsed.data, amountMinor: BigInt(parsed.data.amountMinor) });
      return result ? NextResponse.json({ analysis: result.analysis, replayed: result.replayed }, { status: result.replayed ? 200 : 201 }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    } catch (error) {
      logRedactedServerError('Purchase recording failed', error);
      return NextResponse.json(
        { error: error instanceof AnalysisWorkflowConflictError ? 'Purchase conflicts with the current analysis state' : 'Purchase could not be recorded' },
        { status: error instanceof AnalysisWorkflowConflictError ? 409 : 500 },
      );
    }
  };
}

export const POST = createPurchaseHandler();
