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

export async function GET(request: NextRequest) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  const records = await getMarketRecordRepository().list({ scope: 'REAL_ONLY', userId: owner.id });
  return NextResponse.json({ records: records.map((record) => ({
    ...record,
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
