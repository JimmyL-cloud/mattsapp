export type JsonMap = Record<string, unknown>;

export type AnalysisRecord = Readonly<{
  id: string;
  snapshotId: string;
  decisionId: string;
  userId: string;
  cardId: string;
  cutoff: string;
  currency: string;
  input: JsonMap;
  result: JsonMap;
  purchaseStatus: 'UNDECIDED' | 'PURCHASED' | 'PASSED' | 'MISSED' | 'CANCELLED';
  createdAt: string;
}>;

export function object(value: unknown): JsonMap {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonMap : {};
}

export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function text(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function minor(value: unknown): number {
  return Math.round(number(value));
}

export function money(value: unknown, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor(value) / 100);
}

export function cardLabel(analysis: AnalysisRecord): string {
  const target = object(analysis.result.target);
  const inputCard = object(analysis.input.card);
  const card = Object.keys(target).length ? target : inputCard;
  const parts = [card.year, card.brand ?? card.manufacturer, card.playerName, card.cardNumber ? `#${card.cardNumber}` : null, card.parallel].filter(Boolean);
  const grading = card.raw === true ? 'RAW' : [text(card.gradingCompanyKey, ''), card.grade].filter(Boolean).join(' ').toUpperCase();
  return `${parts.join(' ')}${grading ? ` · ${grading}` : ''}` || 'Untitled card';
}
