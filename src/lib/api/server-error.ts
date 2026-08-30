import { randomUUID } from 'node:crypto';

export function logRedactedServerError(context: string, error: unknown): string {
  const requestId = randomUUID();
  console.error(context, { requestId, errorClass: error instanceof Error ? error.name : 'UnknownError' });
  return requestId;
}
