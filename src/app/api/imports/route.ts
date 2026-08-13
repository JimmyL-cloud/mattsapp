import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { CsvImportService } from '@/features/imports/import-service';
import { getMarketRecordRepository } from '@/lib/db/repositories/market-runtime';
import { getOwnerSessionFromHeaders } from '@/lib/auth/config';

const requestSchema = z.object({
  csv: z.string().min(1).max(10_000_000),
  sourceKey: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  sourceLabel: z.string().trim().min(1).max(200),
  isDemo: z.boolean(),
});
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(200).default(100) });

export async function GET(request: NextRequest) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid import page', details: parsed.error.flatten() }, { status: 400 });
  const records = await getMarketRecordRepository().list({ scope: 'REAL_ONLY', userId: owner.id, limit: parsed.data.limit + 1, offset: (parsed.data.page - 1) * parsed.data.limit });
  return NextResponse.json({ page: parsed.data.page, hasMore: records.length > parsed.data.limit, records: records.slice(0, parsed.data.limit).map((record) => ({
    id: record.id, sourceKey: record.sourceKey, sourceRecordId: record.sourceRecordId, sourceLabel: record.sourceLabel,
    originalUrl: record.originalUrl, listingTitle: record.listingTitle, status: record.status, saleType: record.saleType,
    occurredAt: record.occurredAt, freshnessAt: record.freshnessAt, timezone: record.timezone, currency: record.currency,
    cardIdentity: record.cardIdentity,
    salePriceMinor: record.salePriceMinor.toString(),
    shippingMinor: record.shippingMinor.toString(),
    buyerPremiumMinor: record.buyerPremiumMinor.toString(),
    taxMinor: record.taxMinor?.toString() ?? null,
  })) });
}

export async function POST(request: NextRequest) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) {
    return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid import request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const report = await new CsvImportService(getMarketRecordRepository()).importCsv({
    ...parsed.data,
    userId: owner.id,
    importedAt: now,
    now,
  });
  return NextResponse.json(report);
}
