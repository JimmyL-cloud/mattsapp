import type { SourceConnectionStatus, SourceState } from './source-status';

function validTime(value: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error(`Invalid source timestamp: ${value}`);
}

export class SourceRegistry {
  readonly #sources = new Map<string, SourceState>();

  register(input: { key: string; label: string; mode: Exclude<SourceConnectionStatus, 'STALE'> }): SourceState {
    if (this.#sources.has(input.key)) throw new Error(`Source already registered: ${input.key}`);
    const state = Object.freeze({
      key: input.key,
      label: input.label,
      configuredMode: input.mode,
      status: input.mode,
      cachedRecordCount: 0,
      lastAttemptAt: null,
      lastSuccessfulRefreshAt: null,
      message: input.mode === 'AWAITING_CREDENTIALS'
        ? 'Credentials required; no market records requested'
        : input.mode === 'UNAVAILABLE'
          ? 'Source unavailable; no records fabricated'
          : input.mode === 'MANUAL'
            ? 'Manual import source ready'
            : 'Connected source ready',
    } satisfies SourceState);
    this.#sources.set(state.key, state);
    return state;
  }

  reportSuccess(key: string, input: { at: string; recordCount: number }): SourceState {
    validTime(input.at);
    if (!Number.isInteger(input.recordCount) || input.recordCount < 0) throw new Error('recordCount must be non-negative');
    const current = this.get(key);
    const state = Object.freeze({
      ...current,
      status: current.configuredMode === 'MANUAL' ? 'MANUAL' : 'CONNECTED',
      cachedRecordCount: input.recordCount,
      lastAttemptAt: input.at,
      lastSuccessfulRefreshAt: input.at,
      message: `${input.recordCount} records available`,
    } satisfies SourceState);
    this.#sources.set(key, state);
    return state;
  }

  reportFailure(key: string, input: { at: string; message: string }): SourceState {
    validTime(input.at);
    const current = this.get(key);
    const hasCache = current.lastSuccessfulRefreshAt !== null || current.cachedRecordCount > 0;
    const state = Object.freeze({
      ...current,
      status: hasCache ? 'STALE' : current.configuredMode === 'AWAITING_CREDENTIALS' ? 'AWAITING_CREDENTIALS' : 'UNAVAILABLE',
      lastAttemptAt: input.at,
      message: hasCache ? `${input.message}; cached data retained` : `${input.message}; no records fabricated`,
    } satisfies SourceState);
    this.#sources.set(key, state);
    return state;
  }

  get(key: string): SourceState {
    const state = this.#sources.get(key);
    if (!state) throw new Error(`Unknown source: ${key}`);
    return state;
  }

  list(): readonly SourceState[] {
    return Object.freeze([...this.#sources.values()]);
  }
}