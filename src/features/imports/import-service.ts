import { createHash, randomUUID } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import type { NormalizedMarketRecord } from '@/features/market/types';
import { MarketRecordDuplicateError, type MarketRecordRepository } from '@/lib/db/repositories/market-records';
import type { DemoScope } from '@/lib/demo/policy';
import {
  type ImportRowError,
  type RawImportRow,
  validateImportRow,
} from './csv-schema';

export type ImportRowResult = Readonly<{
  rowNumber: number;
  status: 'ACCEPTED' | 'REJECTED' | 'DUPLICATE';
  recordId: string | null;
  fingerprint: string;
  errors: readonly ImportRowError[];
  raw: RawImportRow;
}>;

export type ImportReport = Readonly<{
  batchId: string;
  accepted: number;
  rejected: number;
  duplicates: number;
  rows: readonly ImportRowResult[];
}>;

export type CsvImportInput = Readonly<{
  csv: string;
  userId: string;
  sourceKey: string;
  sourceLabel: string;
  importedAt: string;
  now: string;
  isDemo: boolean;
}>;

export type ManualImportInput = Readonly<{
  userId: string;
  sourceKey: string;
  sourceLabel: string;
  sourceRecordId: string | null;
  listingTitle: string;
  originalUrl: string | null;
  salePrice: string;
  shipping: string;
  buyerPremium: string;
  tax: string | null;
  currency: string;
  saleType: string;
  status: string;
  occurredAt: string;
  timezone: string;
  importedAt: string;
  now: string;
  fields: Readonly<Record<string, unknown>>;
  isDemo: boolean;
}>;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stableValue(record[key])]));
  }
  return value;
}

function fingerprint(row: RawImportRow): string {
  return createHash('sha256').update(JSON.stringify(stableValue(row))).digest('hex');
}

function batchId(input: string): string {
  return `import-${createHash('sha256').update(input).digest('hex').slice(0, 16)}`;
}

function recordId(input: { userId: string; isDemo: boolean; sourceKey: string; sourceIdentity: string }): string {
  return `market-${createHash('sha256').update(`${input.userId}:${input.isDemo ? 'demo' : 'real'}:${input.sourceKey}:${input.sourceIdentity}`).digest('hex').slice(0, 32)}`;
}

function labeledSource(sourceLabel: string, isDemo: boolean): string {
  if (!isDemo || sourceLabel.includes('DEMO / PLACEHOLDER')) return sourceLabel;
  return `DEMO / PLACEHOLDER — ${sourceLabel}`;
}

function duplicateError(code: 'DUPLICATE_SOURCE_ID' | 'DUPLICATE_FINGERPRINT'): ImportRowError {
  return {
    code,
    field: code === 'DUPLICATE_SOURCE_ID' ? 'source_record_id' : '*',
    message: code === 'DUPLICATE_SOURCE_ID'
      ? 'This source record ID was already imported'
      : 'This exact row content was already imported',
  };
}

export class CsvImportService {
  constructor(private readonly repository: MarketRecordRepository) {}

  async importCsv(input: CsvImportInput): Promise<ImportReport> {
    const attemptId = randomUUID();
    let rows: RawImportRow[];
    try {
      rows = parse(input.csv, {
        bom: true,
        columns: (headers: string[]) => headers.map((header) => header.trim()),
        skip_empty_lines: true,
        trim: true,
      }) as RawImportRow[];
    } catch (error) {
      const raw = { csv: input.csv };
      const report = {
        batchId: batchId(`${input.sourceKey}:${input.importedAt}:${input.csv}:${attemptId}`),
        accepted: 0,
        rejected: 1,
        duplicates: 0,
        rows: [{
          rowNumber: 1,
          status: 'REJECTED',
          recordId: null,
          fingerprint: fingerprint(raw),
          errors: [{ code: 'CSV_PARSE_ERROR', field: '*', message: error instanceof Error ? error.message : 'CSV could not be parsed' }],
          raw,
        }],
      } as const;
      await this.repository.persistImportBatch({
        ...report,
        userId: input.userId,
        sourceKey: input.sourceKey,
        sourceLabel: labeledSource(input.sourceLabel, input.isDemo),
        importedAt: input.importedAt,
        isDemo: input.isDemo,
        records: [],
      });
      return report;
    }

    return this.importRows(rows, input, attemptId);
  }

  async importManual(input: ManualImportInput): Promise<ImportReport> {
    const row: RawImportRow = {
      ...input.fields,
      source_record_id: input.sourceRecordId ?? '',
      title: input.listingTitle,
      source_url: input.originalUrl ?? '',
      sale_price: input.salePrice,
      shipping: input.shipping,
      buyer_premium: input.buyerPremium,
      tax: input.tax ?? '',
      currency: input.currency,
      sale_type: input.saleType,
      status: input.status,
      sold_at: input.occurredAt,
      timezone: input.timezone,
    };

    return this.importRows([row], { ...input, csv: JSON.stringify(row) }, randomUUID());
  }

  private async importRows(
    rows: readonly RawImportRow[],
    input: Omit<CsvImportInput, 'csv'> & { csv: string },
    attemptId: string,
    concurrentRetry = false,
  ): Promise<ImportReport> {
    const scope: DemoScope = input.isDemo ? 'DEMO_ONLY' : 'REAL_ONLY';
    const candidates = rows.map((raw) => ({ sourceRecordId: typeof raw.source_record_id === 'string' ? raw.source_record_id.trim() : '', fingerprint: fingerprint(raw) }));
    const existing = await this.repository.findDuplicateKeys({
      scope, userId: input.userId, sourceKey: input.sourceKey,
      sourceRecordIds: candidates.flatMap((candidate) => candidate.sourceRecordId ? [candidate.sourceRecordId] : []),
      fingerprints: candidates.map((candidate) => candidate.fingerprint),
    });
    const sourceIds = new Set(existing.sourceRecordIds);
    const fingerprints = new Set(existing.fingerprints);
    const results: ImportRowResult[] = [];
    const acceptedRecords: NormalizedMarketRecord[] = [];

    for (const [index, raw] of rows.entries()) {
      const rowFingerprint = fingerprint(raw);
      const validation = validateImportRow(raw, input.now);
      if (!validation.value) {
        results.push({
          rowNumber: index + 2,
          status: 'REJECTED',
          recordId: null,
          fingerprint: rowFingerprint,
          errors: validation.errors,
          raw,
        });
        continue;
      }

      const normalized = validation.value;
      const duplicateById = normalized.sourceRecordId !== null && sourceIds.has(normalized.sourceRecordId);
      const duplicateByFingerprint = fingerprints.has(rowFingerprint);
      if (duplicateById || duplicateByFingerprint) {
        results.push({
          rowNumber: index + 2,
          status: 'DUPLICATE',
          recordId: null,
          fingerprint: rowFingerprint,
          errors: [duplicateError(duplicateById ? 'DUPLICATE_SOURCE_ID' : 'DUPLICATE_FINGERPRINT')],
          raw,
        });
        continue;
      }

      const normalizedRecordId = recordId({
        userId: input.userId, isDemo: input.isDemo, sourceKey: input.sourceKey,
        sourceIdentity: normalized.sourceRecordId ?? rowFingerprint,
      });
      const record: NormalizedMarketRecord = {
        id: normalizedRecordId,
        userId: input.userId,
        sourceKey: input.sourceKey,
        sourceRecordId: normalized.sourceRecordId,
        sourceLabel: labeledSource(input.sourceLabel, input.isDemo),
        originalUrl: normalized.originalUrl,
        listingTitle: normalized.listingTitle,
        status: normalized.status,
        saleType: normalized.saleType,
        occurredAt: normalized.occurredAt,
        importedAt: input.importedAt,
        freshnessAt: normalized.occurredAt,
        timezone: normalized.timezone,
        salePriceMinor: normalized.salePriceMinor,
        shippingMinor: normalized.shippingMinor,
        buyerPremiumMinor: normalized.buyerPremiumMinor,
        taxMinor: normalized.taxMinor,
        currency: normalized.currency,
        cardIdentity: normalized.cardIdentity,
        fingerprint: rowFingerprint,
        raw: normalized.cardIdentity ? { ...raw, __card_identity: normalized.cardIdentity } : raw,
        isDemo: input.isDemo,
      };

      acceptedRecords.push(record);
      if (normalized.sourceRecordId) sourceIds.add(normalized.sourceRecordId);
      fingerprints.add(rowFingerprint);
      results.push({
        rowNumber: index + 2,
        status: 'ACCEPTED',
        recordId: normalizedRecordId,
        fingerprint: rowFingerprint,
        errors: [],
        raw,
      });
    }

    const report = {
      batchId: batchId(`${input.sourceKey}:${input.importedAt}:${input.csv}:${attemptId}`),
      accepted: results.filter((row) => row.status === 'ACCEPTED').length,
      rejected: results.filter((row) => row.status === 'REJECTED').length,
      duplicates: results.filter((row) => row.status === 'DUPLICATE').length,
      rows: results,
    };
    try {
      await this.repository.persistImportBatch({
        ...report,
        userId: input.userId,
        sourceKey: input.sourceKey,
        sourceLabel: labeledSource(input.sourceLabel, input.isDemo),
        importedAt: input.importedAt,
        isDemo: input.isDemo,
        records: acceptedRecords,
      });
    } catch (error) {
      if (error instanceof MarketRecordDuplicateError && !concurrentRetry) return this.importRows(rows, input, attemptId, true);
      throw error;
    }
    return report;
  }
}
