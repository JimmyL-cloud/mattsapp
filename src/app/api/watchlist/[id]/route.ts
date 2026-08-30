import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

type Context = { params: Promise<{ id: string }> };
const patchSchema = z.object({ notes: z.string().trim().max(2_000).nullable(), isStarred: z.boolean() });

export function createWatchlistIdHandlers(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies) {
  return {
    PATCH: async (request: NextRequest, context: Context) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      const parsed = patchSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: 'Invalid watchlist update', details: parsed.error.flatten() }, { status: 400 });
      const item = await dependencies.getRepository().updateWatchlist(owner.id, (await context.params).id, parsed.data);
      return item ? NextResponse.json({ item }) : NextResponse.json({ error: 'Watchlist item not found' }, { status: 404 });
    },

    DELETE: async (request: NextRequest, context: Context) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      const deleted = await dependencies.getRepository().deleteWatchlist(owner.id, (await context.params).id);
      return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'Watchlist item not found' }, { status: 404 });
    },
  };
}

export const { PATCH, DELETE } = createWatchlistIdHandlers();
