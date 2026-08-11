export type AuditEvent = Readonly<{
  id: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  metadata: Readonly<Record<string, unknown>>;
  occurredAt: string;
  isDemo: boolean;
}>;

const secretKey = /^(api[-_]?key|authorization|cookie|password|secret|session|token)$/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !secretKey.test(key))
      .map(([key, child]) => [key, sanitize(child)]));
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export class AppendOnlyAuditLog {
  readonly #events: AuditEvent[] = [];

  append(input: AuditEvent): AuditEvent {
    if (this.#events.some((event) => event.id === input.id)) throw new Error(`Audit event already exists: ${input.id}`);
    if (!input.reason.trim()) throw new Error('Audit reason is required');
    if (Number.isNaN(Date.parse(input.occurredAt))) throw new Error('Audit timestamp is invalid');
    const event = deepFreeze({
      ...structuredClone(input),
      reason: input.reason.trim(),
      metadata: sanitize(structuredClone(input.metadata)) as Record<string, unknown>,
    });
    this.#events.push(event);
    return event;
  }

  all(): readonly AuditEvent[] {
    return Object.freeze([...this.#events]);
  }

  listForEntity(entityType: string, entityId: string): readonly AuditEvent[] {
    return Object.freeze(this.#events.filter((event) => event.entityType === entityType && event.entityId === entityId));
  }
}