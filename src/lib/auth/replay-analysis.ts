import { runAnalysis, type AnalysisResult, type RunAnalysisInput } from '@/features/analysis/run-analysis';

type Snapshot = Readonly<{
  snapshotId: string;
  capturedAt: string;
  formulaVersion: string;
  evidenceIds: readonly string[];
  input: RunAnalysisInput;
  result: AnalysisResult;
}>;

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function snapshotClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function stable(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map((key) => [key, stable(object[key])]));
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

export class AnalysisSnapshotStore {
  readonly #snapshots = new Map<string, Snapshot>();

  capture(input: { snapshotId: string; capturedAt: string; input: RunAnalysisInput; result: AnalysisResult }): Snapshot {
    if (this.#snapshots.has(input.snapshotId)) throw new Error('Prediction snapshot already exists');
    const snapshot = snapshotClone({
      snapshotId: input.snapshotId,
      capturedAt: input.capturedAt,
      formulaVersion: input.input.formulaVersion,
      evidenceIds: input.input.comps.map((comp) => comp.record.id),
      input: input.input,
      result: input.result,
    });
    this.#snapshots.set(input.snapshotId, snapshot);
    return snapshot;
  }

  replay(snapshotId: string) {
    const snapshot = this.#snapshots.get(snapshotId);
    if (!snapshot) throw new Error(`Prediction snapshot not found: ${snapshotId}`);
    const replayedResult = runAnalysis(structuredClone(snapshot.input));
    return Object.freeze({
      snapshot,
      replayedResult,
      matchesOriginal: stableJson(replayedResult) === stableJson(snapshot.result),
    });
  }
}