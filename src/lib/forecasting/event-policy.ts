export type ForecastEvent = Readonly<{
  id: string;
  label: string;
  knownAt: string;
  occursAt: string | null;
  speculative: boolean;
  sourceId: string;
}>;

export function classifyForecastEvents(events: readonly ForecastEvent[], cutoff: string) {
  const cutoffTime = Date.parse(cutoff);
  if (Number.isNaN(cutoffTime)) throw new Error('Invalid event cutoff');
  const known: ForecastEvent[] = [];
  const speculative: ForecastEvent[] = [];
  const rejectedLookaheadIds: string[] = [];
  for (const event of events) {
    const knownAt = Date.parse(event.knownAt);
    if (Number.isNaN(knownAt)) throw new Error(`Invalid event timestamp: ${event.id}`);
    if (knownAt > cutoffTime) {
      rejectedLookaheadIds.push(event.id);
    } else if (event.speculative) {
      speculative.push(event);
    } else {
      known.push(event);
    }
  }
  return Object.freeze({
    known: Object.freeze(known),
    speculative: Object.freeze(speculative),
    rejectedLookaheadIds: Object.freeze(rejectedLookaheadIds),
  });
}