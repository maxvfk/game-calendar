import type { GachaEvent } from "../shared/schema.ts";

type Mode = "Apocalyptic Shadow" | "Pure Fiction" | "Memory of Chaos";
const ORDER: readonly Mode[] = ["Apocalyptic Shadow", "Pure Fiction", "Memory of Chaos"];
const DAY = 86_400_000;

export interface LightwardException {
  /** Stable sourced phase ID; exceptions apply only after this published phase. */
  afterId: string;
  /** A version notice can change the next mode or its expectation date. */
  nextMode?: Mode;
  expectedDay?: string;
  /** A special schedule may have no normal follow-up to monitor. */
  suppress?: boolean;
}

function modeOf(event: GachaEvent): Mode | null {
  if (event.game !== "hsr" || event.type !== "challenge") return null;
  return ORDER.find(mode => event.title.startsWith(`${mode}:`) ||
    event.title.startsWith(`Forgotten Hall: ${mode}:`)) ?? null;
}

/** Review-only: the 14-day rhythm never supplies an event start or end. */
export function missingLightwardPhase(
  now: string, sourced: readonly GachaEvent[], exceptions: readonly LightwardException[] = [],
): string | null {
  const unique = new Map<string, { event: GachaEvent; mode: Mode }>();
  for (const event of sourced) {
    const mode = modeOf(event);
    if (mode && !event.sourceId.startsWith("recurring-")) unique.set(event.id, { event, mode });
  }
  const phases = [...unique.values()].sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
  for (const [index, phase] of phases.entries()) {
    const exception = exceptions.find(e => e.afterId === phase.event.id);
    if (exception?.suppress) continue;
    const expectedMode = exception?.nextMode ?? ORDER[(ORDER.indexOf(phase.mode) + 1) % ORDER.length]!;
    const baseline = Date.parse(`${phase.event.startsAt.slice(0, 10)}T00:00:00.000Z`) + 14 * DAY;
    const expectedDay = exception?.expectedDay ?? new Date(baseline).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDay)) throw new Error("invalid Lightward exception day");
    if (Date.parse(now) < Date.parse(`${expectedDay}T00:00:00.000Z`) - 7 * DAY) continue;
    // Explicitly sourced version exceptions can shift the actual start; a
    // matching next phase is sufficient to close this coverage expectation.
    if (phases.slice(index + 1).some(other => other.mode === expectedMode)) continue;
    return `HSR ${expectedMode} expected around ${expectedDay} after sourced ${phase.mode} (${phase.event.startsAt.slice(0, 10)}); await an explicit phase notice`;
  }
  return null;
}
