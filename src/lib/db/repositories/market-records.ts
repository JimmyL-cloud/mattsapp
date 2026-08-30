import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { BatchItem } from 'drizzle-orm/batch';
import type { NormalizedMarketRecord } from '@/features/market/types';
import {
  marketSources,
  normalizedMarketRecords,
  rawImportBatches,
  rawMarketRecords,
} from '@/lib/db/schema';
import type * as databaseSchema from '@/lib/db/schema';
import type { DemoScope } from '@/lib/demo/policy';
import { recordIsInScope } from '@/lib/demo/policy';
import { createCardIdentity, type CardIdentity } from '@/features/cards/card-identity';

export type ImportPersistenceRow = Readonly<{
  rowNumber: number;
  status: 'ACCEPTED' | 'REJECTED' | 'DUPLICATE';
  recordId: string | null;
  fingerprint: string;
  errors: readonly Readonly<{ code: string }>[];
  raw: Readonly<Record<string, unknown>>;
}>;

export type ImportBatchPersistence = Readonly<{
  batchId: string;
  userId: string;
  sourceKey: string;
  sourceLabel: string;
  importedAt: string;
  isDemo: boolean;
  rows: readonly ImportPersistenceRow[];
  records: readonly NormalizedMarketRecord[];
}>;

export interface MarketRecordRepository {
  insert(record: NormalizedMarketRecord): Promise<NormalizedMarketRecord>;
  persistImportBatch(input: ImportBatchPersistence): Promise<void>;
  list(input: { scope: DemoScope; userId?: string; limit?: number; offset?: number }): Promise<readonly NormalizedMarketRecord[]>;
  getManyByIds(input: { scope: DemoScope; userId: string; ids: readonly string[] }): Promise<readonly NormalizedMarketRecord[]>;
  findDuplicateKeys(input: { scope: DemoScope; userId: string; sourceKey: string; sourceRecordIds: readonly string[]; fingerprints: readonly string[] }): Promise<{ sourceRecordIds: ReadonlySet<string>; fingerprints: ReadonlySet<string> }>;
}

export class MarketRecordDuplicateError extends Error {
  constructor() { super('A concurrent import committed one or more of these records'); this.name = 'MarketRecordDuplicateError'; }
}

export class InMemoryMarketRecordRepository implements MarketRecordRepository {
  readonly #records = new Map<string, NormalizedMarketRecord>();

  async insert(record: NormalizedMarketRecord): Promise<NormalizedMarketRecord> {
    if (this.#records.has(record.id)) {
      throw new Error(`Market record already exists: ${record.id}`);
    }

    const stored = Object.freeze({ ...record, raw: Object.freeze({ ...record.raw }) });
    this.#records.set(record.id, stored);
    return stored;
  }

  async persistImportBatch(input: ImportBatchPersistence): Promise<void> {
    if (input.records.some((record) => this.#records.has(record.id))) throw new MarketRecordDuplicateError();
    for (const record of input.records) await this.insert(record);
  }

  async list(input: { scope: DemoScope; userId?: string; limit?: number; offset?: number }): Promise<readonly NormalizedMarketRecord[]> {
    return [...this.#records.values()].filter((record) =>
      recordIsInScope(record.isDemo, input.scope) && (!input.userId || record.userId === input.userId),
    ).slice(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 200));
  }

  async getManyByIds(input: { scope: DemoScope; userId: string; ids: readonly string[] }): Promise<readonly NormalizedMarketRecord[]> {
    const ids = new Set(input.ids);
    return [...this.#records.values()].filter((record) => ids.has(record.id) && record.userId === input.userId && recordIsInScope(record.isDemo, input.scope));
  }

  async findDuplicateKeys(input: { scope: DemoScope; userId: string; sourceKey: string; sourceRecordIds: readonly string[]; fingerprints: readonly string[] }) {
    const rows = [...this.#records.values()].filter((record) => record.userId === input.userId && recordIsInScope(record.isDemo, input.scope));
    return {
      sourceRecordIds: new Set(rows.filter((record) => record.sourceKey === input.sourceKey && record.sourceRecordId && input.sourceRecordIds.includes(record.sourceRecordId)).map((record) => record.sourceRecordId!)),
      fingerprints: new Set(rows.filter((record) => input.fingerprints.includes(record.fingerprint)).map((record) => record.fingerprint)),
    };
  }
}

function identityFromRaw(raw: Readonly<Record<string, unknown>>): CardIdentity | null {
  const stored = raw.__card_identity;
  if (!stored || typeof stored !== 'object') return null;
  try {
    return createCardIdentity(stored as Parameters<typeof createCardIdentity>[0]);
  } catch {
    return null;
  }
}

function toDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid persisted timestamp: ${value}`);
  return parsed;
}

function toNormalizedRecord(
  row: typeof normalizedMarketRecords.$inferSelect,
): NormalizedMarketRecord {
  return Object.freeze({
    id: row.id,
    userId: row.userId,
    sourceKey: row.sourceKey,
    sourceRecordId: row.sourceRecordId,
    sourceLabel: row.sourceLabel,
    originalUrl: row.originalUrl,
    listingTitle: row.listingTitle,
    status: row.status as NormalizedMarketRecord['status'],
    saleType: row.saleType as NormalizedMarketRecord['saleType'],
    occurredAt: row.occurredAt.toISOString(),
    importedAt: row.importedAt.toISOString(),
    freshnessAt: row.freshnessAt.toISOString(),
    timezone: row.timezone,
    salePriceMinor: row.salePriceMinor,
    shippingMinor: row.shippingMinor,
    buyerPremiumMinor: row.buyerPremiumMinor,
    taxMinor: row.taxMinor,
    currency: row.currency,
    cardIdentity: identityFromRaw(row.raw),
    fingerprint: row.fingerprint,
    raw: Object.freeze({ ...row.raw }),
    isDemo: row.isDemo,
  });
}

export class PostgresMarketRecordRepository implements MarketRecordRepository {
  constructor(private readonly database: NeonHttpDatabase<typeof databaseSchema>) {}

  async insert(record: NormalizedMarketRecord): Promise<NormalizedMarketRecord> {
    await this.ensureSource(record.sourceKey, record.sourceLabel);
    await this.database.insert(normalizedMarketRecords).values(this.recordValues(record));
    return Object.freeze({ ...record, raw: Object.freeze({ ...record.raw }) });
  }

  async persistImportBatch(input: ImportBatchPersistence): Promise<void> {
    const sourceWrite = this.database.insert(marketSources).values({
      key: input.sourceKey, name: input.sourceLabel, connectionStatus: 'MANUAL', adapterVersion: '1',
      statusMessage: 'User-provided import; no live marketplace access implied',
    }).onConflictDoUpdate({ target: marketSources.key, set: { name: input.sourceLabel, connectionStatus: 'MANUAL', statusMessage: 'User-provided import; no live marketplace access implied' } });
    const batchWrite = this.database.insert(rawImportBatches).values({
      id: input.batchId,
      userId: input.userId,
      sourceKey: input.sourceKey,
      importedAt: toDate(input.importedAt),
      acceptedCount: input.rows.filter((row) => row.status === 'ACCEPTED').length,
      rejectedCount: input.rows.filter((row) => row.status === 'REJECTED').length,
      duplicateCount: input.rows.filter((row) => row.status === 'DUPLICATE').length,
      isDemo: input.isDemo,
    });

    const rawIds = new Map<number, string>();
    const writes: [BatchItem<'pg'>, ...BatchItem<'pg'>[]] = [sourceWrite, batchWrite];
    if (input.rows.length) {
      writes.push(this.database.insert(rawMarketRecords).values(input.rows.map((row) => {
        const id = `${input.batchId}:row:${row.rowNumber}`;
        rawIds.set(row.rowNumber, id);
        return {
          id,
          batchId: input.batchId,
          userId: input.userId,
          sourceKey: input.sourceKey,
          sourceRecordId: typeof row.raw.source_record_id === 'string' && row.raw.source_record_id
            ? row.raw.source_record_id
            : null,
          rowNumber: row.rowNumber,
          raw: { ...row.raw },
          contentFingerprint: row.fingerprint,
          accepted: row.status === 'ACCEPTED',
          errorCodes: row.errors.map((error) => error.code),
          importedAt: toDate(input.importedAt),
          isDemo: input.isDemo,
        };
      })));
    }

    if (input.records.length) {
      writes.push(this.database.insert(normalizedMarketRecords).values(input.records.map((record) => {
        const reportRow = input.rows.find((row) => row.recordId === record.id);
        return this.recordValues(record, reportRow ? rawIds.get(reportRow.rowNumber) ?? null : null);
      })));
    }
    try { await this.database.batch(writes); }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') throw new MarketRecordDuplicateError();
      throw error;
    }
  }

  async list(input: { scope: DemoScope; userId?: string; limit?: number; offset?: number }): Promise<readonly NormalizedMarketRecord[]> {
    const conditions = [
      eq(normalizedMarketRecords.isDemo, input.scope === 'DEMO_ONLY'),
      isNull(normalizedMarketRecords.deletedAt),
      ...(input.userId ? [eq(normalizedMarketRecords.userId, input.userId)] : []),
    ];
    const rows = await this.database
      .select()
      .from(normalizedMarketRecords)
      .where(and(...conditions))
      .limit(input.limit ?? 200)
      .offset(input.offset ?? 0);
    return Object.freeze(rows.map(toNormalizedRecord));
  }

  async getManyByIds(input: { scope: DemoScope; userId: string; ids: readonly string[] }): Promise<readonly NormalizedMarketRecord[]> {
    if (!input.ids.length) return [];
    const rows = await this.database.select().from(normalizedMarketRecords).where(and(
      eq(normalizedMarketRecords.userId, input.userId), eq(normalizedMarketRecords.isDemo, input.scope === 'DEMO_ONLY'),
      isNull(normalizedMarketRecords.deletedAt), inArray(normalizedMarketRecords.id, [...input.ids]),
    ));
    return Object.freeze(rows.map(toNormalizedRecord));
  }

  async findDuplicateKeys(input: { scope: DemoScope; userId: string; sourceKey: string; sourceRecordIds: readonly string[]; fingerprints: readonly string[] }) {
    const duplicateCondition = or(
      ...(input.sourceRecordIds.length ? [and(eq(normalizedMarketRecords.sourceKey, input.sourceKey), inArray(normalizedMarketRecords.sourceRecordId, [...input.sourceRecordIds]))] : []),
      ...(input.fingerprints.length ? [inArray(normalizedMarketRecords.fingerprint, [...input.fingerprints])] : []),
    );
    if (!duplicateCondition) return { sourceRecordIds: new Set<string>(), fingerprints: new Set<string>() };
    const rows = await this.database.select({ sourceRecordId: normalizedMarketRecords.sourceRecordId, fingerprint: normalizedMarketRecords.fingerprint }).from(normalizedMarketRecords).where(and(
      eq(normalizedMarketRecords.userId, input.userId), eq(normalizedMarketRecords.isDemo, input.scope === 'DEMO_ONLY'), isNull(normalizedMarketRecords.deletedAt), duplicateCondition,
    ));
    return { sourceRecordIds: new Set(rows.flatMap((row) => row.sourceRecordId ? [row.sourceRecordId] : [])), fingerprints: new Set(rows.map((row) => row.fingerprint)) };
  }

  private async ensureSource(sourceKey: string, sourceLabel: string): Promise<void> {
    await this.database.insert(marketSources).values({
      key: sourceKey,
      name: sourceLabel,
      connectionStatus: 'MANUAL',
      adapterVersion: '1',
      statusMessage: 'User-provided import; no live marketplace access implied',
    }).onConflictDoUpdate({
      target: marketSources.key,
      set: { name: sourceLabel, connectionStatus: 'MANUAL', statusMessage: 'User-provided import; no live marketplace access implied' },
    });
  }

  private recordValues(record: NormalizedMarketRecord, rawMarketRecordId: string | null = null) {
    return {
      id: record.id,
      userId: record.userId,
      rawMarketRecordId,
      sourceKey: record.sourceKey,
      sourceRecordId: record.sourceRecordId,
      sourceLabel: record.sourceLabel,
      originalUrl: record.originalUrl,
      listingTitle: record.listingTitle,
      status: record.status,
      saleType: record.saleType,
      occurredAt: toDate(record.occurredAt),
      importedAt: toDate(record.importedAt),
      freshnessAt: toDate(record.freshnessAt),
      timezone: record.timezone,
      salePriceMinor: record.salePriceMinor,
      shippingMinor: record.shippingMinor,
      buyerPremiumMinor: record.buyerPremiumMinor,
      taxMinor: record.taxMinor,
      currency: record.currency,
      fingerprint: record.fingerprint,
      raw: { ...record.raw },
      isDemo: record.isDemo,
    };
  }
}
