import { NextResponse, type NextRequest } from 'next/server';
import { getOwnerSessionFromHeaders } from '@/lib/auth/config';
import { ManualAnalysisService, manualAnalysisRequestSchema } from '@/features/analysis/manual-analysis-service';
import { getAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-runtime';

export async function GET(request: NextRequest) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  return NextResponse.json({ analyses: await getAnalysisWorkflowRepository().listAnalyses(owner.id) });
}

export async function POST(request: NextRequest) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  const parsed = manualAnalysisRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid analysis request', details: parsed.error.flatten() }, { status: 400 });
  try {
    const analysis = await new ManualAnalysisService(getAnalysisWorkflowRepository()).create(owner.id, parsed.data);
    return NextResponse.json({ analysis }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Analysis failed' }, { status: 422 });
  }
}
