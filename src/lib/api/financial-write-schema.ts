import { z } from 'zod';

export const financialWriteFields = {
  idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  source: z.string().trim().min(1).max(200),
  occurredAt: z.string().datetime({ offset: true }),
};
