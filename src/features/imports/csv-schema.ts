import Decimal from 'decimal.js';
import { z } from 'zod';
import type { MarketRecordStatus, MarketSaleType } from '@/features/market/types';

export type ImportErrorCode =
  | 'MISSING_FIELD'
  | 'INVALID_MONEY'
  | 'INVALID_CURRENCY'
  | 'INVALID_DATE'
  | 'MISSING_TIMEZONE_OFFSET'
  | 'INVALID_TIMEZONE'
  | 'FUTURE_SALE'
  | 'INVALID_SALE_TYPE'
  | 'INVALID_STATUS'
  | 'DUPLICATE_SOURCE_ID'
  | 'DUPLICATE_FINGERPRINT'
  | 'CSV_PARSE_ERROR';

export type ImportRowError = Readonly<{
  code: ImportErrorCode;
  field: string;
  message: string;
}>;

export type RawImportRow = Readonly<Record<string, unknown>>;

export type ValidatedImportRow = Readonly<{
  sourceRecordId: string | null;
  listingTitle: string;
  originalUrl: string | null;
  salePriceMinor: bigint;
  shippingMinor: bigint;
  buyerPremiumMinor: bigint;
  taxMinor: bigint | null;
  currency: string;
  saleType: MarketSaleType;
  status: MarketRecordStatus;
  occurredAt: string;
  timezone: string;
}>;

const saleTypes = ['AUCTION', 'FIXED_PRICE', 'ACCEPTED_OFFER', 'LOCAL', 'TRADE'] as const;
const recordStatuses = ['ACTIVE', 'SOLD', 'ENDED_UNSOLD', 'CANCELLED', 'LOCAL_OFFER'] as const;
const currencySchema = z.string().regex(/^[A-Z]{3}$/);

function value(row: RawImportRow, field: string): string {
  const raw = row[field];
  return raw === null || raw === undefined ? '' : String(raw).trim();
}

function optionalValue(row: RawImportRow, field: string): string | null {
  const parsed = value(row, field);
  return parsed === '' ? null : parsed;
}

function moneyMinor(
  row: RawImportRow,
  field: string,
  required: boolean,
  errors: ImportRowError[],
): bigint | null {
  const raw = value(row, field);
  if (raw === '') {
    if (required) {
      errors.push({ code: 'MISSING_FIELD', field, message: `${field} is required` });
    }
    return null;
  }

  const normalized = raw.replace(/[$£€¥,\s]/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    errors.push({ code: 'INVALID_MONEY', field, message: `${field} is not a non-negative money amount` });
    return null;
  }

  try {
    return BigInt(
      new Decimal(normalized)
        .mul(100)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toFixed(0),
    );
  } catch {
    errors.push({ code: 'INVALID_MONEY', field, message: `${field} is outside the supported money range` });
    return null;
  }
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function validateImportRow(
  row: RawImportRow,
  now: string,
): { value: ValidatedImportRow | null; errors: readonly ImportRowError[] } {
  const errors: ImportRowError[] = [];
  const listingTitle = value(row, 'title');
  if (!listingTitle) {
    errors.push({ code: 'MISSING_FIELD', field: 'title', message: 'title is required' });
  }

  const currency = value(row, 'currency').toUpperCase();
  if (!currencySchema.safeParse(currency).success) {
    errors.push({ code: 'INVALID_CURRENCY', field: 'currency', message: 'currency must be a three-letter ISO code' });
  }

  const salePriceMinor = moneyMinor(row, 'sale_price', true, errors);
  const shippingMinor = moneyMinor(row, 'shipping', false, errors) ?? 0n;
  const buyerPremiumMinor = moneyMinor(row, 'buyer_premium', false, errors) ?? 0n;
  const taxMinor = moneyMinor(row, 'tax', false, errors);

  const saleTypeRaw = value(row, 'sale_type').toUpperCase();
  if (!(saleTypes as readonly string[]).includes(saleTypeRaw)) {
    errors.push({ code: 'INVALID_SALE_TYPE', field: 'sale_type', message: `Unsupported sale type: ${saleTypeRaw || '(blank)'}` });
  }

  const statusRaw = value(row, 'status').toUpperCase();
  if (!(recordStatuses as readonly string[]).includes(statusRaw)) {
    errors.push({ code: 'INVALID_STATUS', field: 'status', message: `Unsupported market status: ${statusRaw || '(blank)'}` });
  }

  const occurredAt = value(row, 'sold_at');
  const parsedOccurredAt = Date.parse(occurredAt);
  if (!occurredAt || Number.isNaN(parsedOccurredAt)) {
    errors.push({ code: 'INVALID_DATE', field: 'sold_at', message: 'sold_at must be a valid ISO timestamp' });
  } else {
    if (!/(?:z|[+-]\d{2}:\d{2})$/i.test(occurredAt)) {
      errors.push({ code: 'MISSING_TIMEZONE_OFFSET', field: 'sold_at', message: 'sold_at must retain its UTC offset' });
    }
    if (parsedOccurredAt > Date.parse(now)) {
      errors.push({ code: 'FUTURE_SALE', field: 'sold_at', message: 'Future-dated records cannot enter historical calculations' });
    }
  }

  const timezone = value(row, 'timezone');
  if (!timezone || !validTimezone(timezone)) {
    errors.push({ code: 'INVALID_TIMEZONE', field: 'timezone', message: 'timezone must be a valid IANA timezone' });
  }

  if (errors.length > 0 || salePriceMinor === null) return { value: null, errors };

  return {
    value: {
      sourceRecordId: optionalValue(row, 'source_record_id'),
      listingTitle,
      originalUrl: optionalValue(row, 'source_url'),
      salePriceMinor,
      shippingMinor,
      buyerPremiumMinor,
      taxMinor,
      currency,
      saleType: saleTypeRaw as MarketSaleType,
      status: statusRaw as MarketRecordStatus,
      occurredAt,
      timezone,
    },
    errors,
  };
}