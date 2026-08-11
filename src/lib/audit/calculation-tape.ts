export type JsonValue = string | number | boolean | null | bigint | JsonValue[] | { [key: string]: JsonValue };
export type CalculationStep = Readonly<{
  key: string; label: string; formula: string; inputs: Record<string, JsonValue>;
  output: JsonValue; unit: string; sequence: number;
}>;
type NewStep = Omit<CalculationStep, 'sequence'>;

function stable(value: JsonValue): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

export class CalculationTape {
  readonly steps: readonly CalculationStep[];
  constructor(steps: readonly CalculationStep[] = []) { this.steps = Object.freeze([...steps]); }
  append(step: NewStep): CalculationTape {
    return new CalculationTape([...this.steps, Object.freeze({ ...step, sequence: this.steps.length + 1 })]);
  }
  toJSON(): string { return JSON.stringify(this.steps.map(step => stable(step as unknown as JsonValue))); }
}