import type { PurchaseStatus } from '@/features/portfolio/purchase-status';

const statusClass: Record<PurchaseStatus, string> = {
  UNDECIDED: 'muted',
  PURCHASED: 'positive',
  PASSED: 'muted',
  MISSED: 'amber',
  CANCELLED: 'negative',
};

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <strong className={`purchase-status ${statusClass[status]}`} aria-label={`Purchase follow-through: ${status}`}>{status}</strong>;
}