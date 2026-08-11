export const purchaseStatuses = [
  'UNDECIDED',
  'PURCHASED',
  'PASSED',
  'MISSED',
  'CANCELLED',
] as const;

export type PurchaseStatus = (typeof purchaseStatuses)[number];

export function parsePurchaseStatus(value: string): PurchaseStatus {
  if ((purchaseStatuses as readonly string[]).includes(value)) {
    return value as PurchaseStatus;
  }

  throw new Error(`Unknown purchase status: ${value}`);
}