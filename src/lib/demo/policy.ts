export type DemoScope = 'REAL_ONLY' | 'DEMO_ONLY';

export function recordIsInScope(isDemo: boolean, scope: DemoScope): boolean {
  return scope === 'DEMO_ONLY' ? isDemo : !isDemo;
}

export function assertSingleDemoScope(flags: readonly boolean[]): DemoScope {
  if (flags.length === 0) {
    throw new Error('At least one record is required to determine demo scope');
  }

  const containsDemo = flags.some(Boolean);
  const containsReal = flags.some((flag) => !flag);
  if (containsDemo && containsReal) {
    throw new Error('Real and demo records cannot be mixed');
  }

  return containsDemo ? 'DEMO_ONLY' : 'REAL_ONLY';
}