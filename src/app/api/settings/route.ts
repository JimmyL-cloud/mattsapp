import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getOwnerSessionFromHeaders } from '@/lib/auth/config';
import { getAnalysisWorkflowRepository } from '@/lib/db/repositories/analysis-runtime';

const settingsSchema = z.object({ targetRoiBps: z.number().int().min(0).max(100_000) });

export async function GET(request: NextRequest) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  return NextResponse.json({ settings: await getAnalysisWorkflowRepository().getSettings(owner.id) });
}

export async function PATCH(request: NextRequest) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings update', details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ settings: await getAnalysisWorkflowRepository().updateSettings(owner.id, parsed.data.targetRoiBps) });
}
