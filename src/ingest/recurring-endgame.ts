import { eventId, GachaEvent, Region } from "../shared/schema.ts";
import { serverOffsetUtc } from "../shared/time.ts";

const DAY = 86_400_000;
const HORIZON = 70 * DAY;
const LOOKBACK = 7 * DAY;

export interface ResetRule {
  game: "zzz" | "wuwa" | "genshin";
  mode: string;
  title: (day: string) => string;
  anchorDay: string;
  cadence: { days: 14 | 28 } | { monthDay: 1 | 16 };
  resetHour: number;
  sourceUrl: string;
  provenanceStatus: "official" | "estimated";
  confidence: number;
  /** A newer rule for the same mode supersedes this one from this start day. */
  effectiveFrom: string;
}

const monthName = (day: string) => new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

export const RESET_RULES: ResetRule[] = [
  { game: "wuwa", mode: "tower", title: () => "Tower of Adversity: Hazard Zone", anchorDay: "2025-02-03", cadence: { days: 28 }, resetHour: 4, effectiveFrom: "2025-02-03", sourceUrl: "https://wutheringwaves.kurogames.com/en/main/news/detail/2094", provenanceStatus: "estimated", confidence: 0.75 },
  { game: "wuwa", mode: "wastes", title: () => "Whimpering Wastes: Respawning Waters", anchorDay: "2025-03-17", cadence: { days: 28 }, resetHour: 4, effectiveFrom: "2025-03-17", sourceUrl: "https://wutheringwaves.kurogames.com/en/main/news/detail/2154", provenanceStatus: "estimated", confidence: 0.75 },
  { game: "genshin", mode: "abyss", title: d => `Spiral Abyss — ${monthName(d)} ${d.slice(0, 4)} Season`, anchorDay: "2024-07-16", cadence: { monthDay: 16 }, resetHour: 4, effectiveFrom: "2024-07-16", sourceUrl: "https://www.hoyolab.com/article/29513513", provenanceStatus: "estimated", confidence: 0.9 },
  { game: "genshin", mode: "theater", title: d => `Imaginarium Theater — ${monthName(d)} ${d.slice(0, 4)} Season`, anchorDay: "2024-08-01", cadence: { monthDay: 1 }, resetHour: 4, effectiveFrom: "2024-08-01", sourceUrl: "https://www.hoyolab.com/article/29513513", provenanceStatus: "estimated", confidence: 0.9 },
];

function nextDay(day: string, cadence: ResetRule["cadence"]): string {
  const start = new Date(`${day}T00:00:00.000Z`);
  if ("days" in cadence) start.setUTCDate(start.getUTCDate() + cadence.days);
  else start.setUTCMonth(start.getUTCMonth() + 1);
  return start.toISOString().slice(0, 10);
}

/** Dates are server-calendar labels; the same row ends at different UTC instants by region. */
export function fixedResetCycles(rule: ResetRule, now: string, rules: readonly ResetRule[] = [rule]): GachaEvent[] {
  const windowStart = Date.parse(now) - LOOKBACK;
  const windowEnd = Date.parse(now) + HORIZON;
  const supersededAt = rules.filter(r => r.game === rule.game && r.mode === rule.mode && r.effectiveFrom > rule.effectiveFrom)
    .map(r => r.effectiveFrom).sort()[0];
  const out: GachaEvent[] = [];
  let day = rule.anchorDay;
  // A checked-in anchor and fixed 70-day horizon bound every build, even years later.
  for (let i = 0; i < 2000 && Date.parse(`${day}T00:00:00Z`) <= windowEnd; i++) {
    const next = nextDay(day, rule.cadence);
    if (day >= rule.effectiveFrom && (supersededAt === undefined || day < supersededAt) &&
      Date.parse(`${next}T00:00:00Z`) >= windowStart) {
      const regionEnds = Object.fromEntries(Region.options.map(region => [region,
        new Date(Date.parse(`${next}T00:00:00Z`) + (rule.resetHour - serverOffsetUtc(region, rule.game)) * 3_600_000 - 60_000).toISOString(),
      ])) as Record<typeof Region.options[number], string>;
      const title = rule.title(day);
      out.push(GachaEvent.parse({
        id: eventId(rule.game, title, `${day}T00:00:00.000Z`), game: rule.game, title,
        type: "challenge", summary: `${rule.mode} reset cycle; source date is the server calendar day.`,
        startsAt: `${day}T00:00:00.000Z`, startPrecision: "day",
        endsAt: regionEnds.asia, endPrecision: "exact", regionScoped: true, regionEnds,
        sourceUrl: rule.sourceUrl, sourceId: `recurring-${rule.game}-${rule.mode}`,
        status: "published", confidence: rule.confidence,
        provenanceStatus: rule.provenanceStatus, extractionMethod: "manual", version: 1,
        firstSeenAt: now, updatedAt: now,
      }));
    }
    day = next;
  }
  if (Date.parse(`${day}T00:00:00Z`) <= windowEnd) throw new Error(`Recurring rule exceeded bound: ${rule.mode}`);
  return out;
}

/** A sourced correction freezes this mode until a newly reviewed effective rule is checked in. */
export function recurringEndgame(now: string, rules: readonly ResetRule[] = RESET_RULES, sourced: readonly GachaEvent[] = []): GachaEvent[] {
  const candidates = rules.flatMap(rule => fixedResetCycles(rule, now, rules));
  const frozen = new Set<string>();
  for (const candidate of candidates) {
    const observed = sourced.find(e => e.id === candidate.id && e.game === candidate.game && e.type === "challenge" && e.endPrecision === "exact");
    if (observed && (observed.endsAt !== candidate.endsAt ||
      Region.options.some(region => observed.regionEnds?.[region] !== candidate.regionEnds?.[region]))) {
      frozen.add(candidate.sourceId);
      console.warn(`  ! recurring rule ${candidate.sourceId} conflicts with sourced ${observed.id}; projections frozen`);
    }
  }
  return candidates.filter(e => !frozen.has(e.sourceId) || sourced.some(s => s.id === e.id));
}

/** The regular maintenance clock is an effective-dated rule, never a blanket historical conversion. */
export function cznMaintenanceBoundary(day: string, specific?: string): string | null {
  if (specific !== undefined) return specific;
  return day >= "2026-07-29" ? `${day}T00:00:00.000Z` : null;
}

/** Weekly cumulative rewards exist only inside an explicitly sourced Great Rift phase. */
export function greatRiftWeeklyRewards(phase: GachaEvent, now: string): GachaEvent[] {
  if (phase.game !== "czn" || !phase.title.startsWith("The Great Rift:") ||
      phase.endPrecision !== "exact" || phase.endsAt === null) return [];
  const start = Date.parse(phase.startsAt);
  const end = Date.parse(phase.endsAt);
  const out: GachaEvent[] = [];
  const first = new Date(start);
  first.setUTCHours(18, 0, 0, 0);
  first.setUTCDate(first.getUTCDate() + (7 - first.getUTCDay()) % 7);
  if (first.getTime() <= start) first.setUTCDate(first.getUTCDate() + 7);
  for (let deadline = first.getTime(); deadline < end; deadline += 7 * DAY) {
    if (deadline < Date.parse(now) - LOOKBACK) continue;
    const day = new Date(deadline).toISOString().slice(0, 10);
    const title = `Great Rift — Weekly Cumulative Rewards (${day})`;
    const windowStart = Math.max(start, deadline - 7 * DAY);
    out.push(GachaEvent.parse({
      id: eventId("czn", title, `${day}T00:00:00.000Z`), game: "czn", title,
      type: "challenge", summary: `Weekly cumulative reward deadline within ${phase.title}.`,
      startsAt: new Date(windowStart).toISOString(), startPrecision: "exact",
      endsAt: new Date(deadline).toISOString(), endPrecision: "exact", regionScoped: false, regionEnds: null,
      sourceUrl: "https://czn.gg/chaos-zero-nightmare-patch-notes-12-24-update/",
      sourceId: "recurring-czn-great-rift-weekly", status: "published", confidence: 0.9,
      provenanceStatus: "estimated", extractionMethod: "manual", version: 1,
      firstSeenAt: now, updatedAt: now,
    }));
  }
  return out;
}

/** A review reminder only. Treasures Lightward periods are always sourced separately. */
export function missingLightwardPhase(now: string, sourced: readonly GachaEvent[]): string | null {
  const next = Date.parse("2026-09-28T00:00:00.000Z");
  const at = Date.parse(now);
  if (at < next - 7 * DAY || at > next + 7 * DAY) return null;
  return sourced.some(e => e.game === "hsr" && e.title.startsWith("Memory of Chaos:") &&
    e.startsAt.slice(0, 10) >= "2026-09-28") ? null :
    "HSR Memory of Chaos expected near Sep 28; await sourced Version 4.6 phase dates";
}
