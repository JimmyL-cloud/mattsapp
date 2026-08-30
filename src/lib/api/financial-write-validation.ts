export const financialTimestampClockSkewMs = 5 * 60_000;

export function isFinancialTimestampInFuture(value: string, now: Date): boolean {
  return Date.parse(value) > now.getTime() + financialTimestampClockSkewMs;
}

export function localDateInputValue(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function financialOccurredAtForDate(dateInput: string, now: Date): string {
  if (dateInput === localDateInputValue(now)) return now.toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) throw new Error('Invalid financial date');
  const value = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (Number.isNaN(value.getTime()) || localDateInputValue(value) !== dateInput) throw new Error('Invalid financial date');
  return value.toISOString();
}
