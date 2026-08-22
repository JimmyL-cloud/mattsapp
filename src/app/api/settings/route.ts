import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

const settingsSchema = z.object({
  targetRoiBps: z.number().int().min(0).max(100_000),
  showTraderImportTools: z.boolean(),
});

export function createSettingsHandlers(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies) {
  return {
    GET: async (request: NextRequest) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      return NextResponse.json({ settings: await dependencies.getRepository().getSettings(owner.id) });
    },

    PATCH: async (request: NextRequest) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: 'Invalid settings update', details: parsed.error.flatten() }, { status: 400 });
      return NextResponse.json({ settings: await dependencies.getRepository().updateSettings(owner.id, parsed.data) });
    },
  };
}

export const { GET, PATCH } = createSettingsHandlers();
