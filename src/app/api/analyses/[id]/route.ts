import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getOwnerSessionFromHeaders } from '@/lib/auth/config';
import { purchaseStatuses } from '@/features/portfolio/purchase-status';
import { getAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-runtime';

type Context = { params: Promise<{ id: string }> };
const decisionSchema = z.object({ status: z.enum(purchaseStatuses), reason: z.string().trim().max(1_000).nullable().optional().default(null) });

export async function GET(request: NextRequest, context: Context) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  const analysis = await getAnalysisWorkflowRepository().getAnalysis(owner.id, (await context.params).id);
  return analysis ? NextResponse.json({ analysis }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: Context) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid decision update', details: parsed.error.flatten() }, { status: 400 });
  const analysis = await getAnalysisWorkflowRepository().updateDecision(owner.id, (await context.params).id, parsed.data.status, parsed.data.reason);
  return analysis ? NextResponse.json({ analysis }) : NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
}
