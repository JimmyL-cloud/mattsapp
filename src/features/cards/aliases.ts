export function normalizeIdentityText(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return normalized || null;
}

export function identityTextEqual(left: string | null, right: string | null): boolean {
  return normalizeIdentityText(left) === normalizeIdentityText(right);
}