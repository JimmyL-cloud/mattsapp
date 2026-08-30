import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { productionOwnerRouteDependencies, type OwnerRouteDependencies } from '@/lib/api/owner-route-dependencies';

const createSchema = z.object({ cardId: z.string().trim().min(1).nullable().optional().default(null), marketRecordId: z.string().trim().min(1).nullable().optional().default(null), notes: z.string().trim().max(2_000).nullable().optional().default(null), isStarred: z.boolean().default(false) }).refine((value) => value.cardId || value.marketRecordId, 'cardId or marketRecordId is required');

export function createWatchlistHandlers(dependencies: OwnerRouteDependencies = productionOwnerRouteDependencies) {
  return {
    GET: async (request: NextRequest) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      return NextResponse.json({ watchlist: await dependencies.getRepository().listWatchlist(owner.id) });
    },

    POST: async (request: NextRequest) => {
      const owner = await dependencies.getOwner(request.headers);
      if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
      const parsed = createSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: 'Invalid watchlist item', details: parsed.error.flatten() }, { status: 400 });
      const item = await dependencies.getRepository().saveWatchlist({ id: `watch:${randomUUID()}`, userId: owner.id, ...parsed.data, createdAt: new Date().toISOString() });
      return NextResponse.json({ item }, { status: 201 });
    },
  };
}

export const { GET, POST } = createWatchlistHandlers();
