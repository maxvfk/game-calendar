import type { DisplayEvent } from "../../shared/custom.ts";
import { dayOnlyEnd, type EventClock } from "../../shared/time.ts";
import { categoryBadge } from "./eventCategories.ts";
import type { TimelineGroup } from "./lanes.ts";
import { originalTimelineIdentity, timelineIdentity } from "../../shared/timelineIdentity.ts";

/** Approved final-feed copy, then M1 subjects/title. No runtime inference. */
export function recognitionIdentity(event: Pick<DisplayEvent, "title" | "recognitionSubjects" | "timelineTitle" | "sourceId">): string {
  return timelineIdentity(event);
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Minimum useful prefix: three graphemes plus ellipsis, or the whole short name.
 * Measure in the label's real font; don't split emoji/combining sequences. */
export function minimumIdentityText(identity: string): string {
  let prefix = "", count = 0;
  for (const { segment } of graphemes.segment(identity.trimStart())) {
    if (count++ === 3) return prefix + "…";
    prefix += segment;
  }
  return prefix;
}

export function timelineDeadline(event: DisplayEvent, clock: EventClock, now: number) {
  if (clock.endsMs === null) {
    return { text: "end unknown", accessible: "End unknown", unknown: true, dayOnly: false };
  }
  const dayOnly = dayOnlyEnd(event);
  // Source day placeholders are printed dates, never localised instants. Custom
  // dates were entered locally; a regional end is an actual resolved instant.
  const sourceDay = dayOnly && event.sourceId !== "you";
  const date = new Date(sourceDay ? event.endsAt! : clock.endsMs);
  const year = sourceDay ? date.getUTCFullYear() : date.getFullYear();
  const options: Intl.DateTimeFormatOptions = {
    month: "short", day: "numeric",
    ...(year !== new Date(now).getFullYear() ? { year: "numeric" } : {}),
    ...(sourceDay ? { timeZone: "UTC" } : {}),
  };
  const compact = date.toLocaleDateString(undefined, options);
  const full = dayOnly
    ? date.toLocaleDateString(undefined, { ...options, year: "numeric" })
    : date.toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      });
  return {
    text: `→ ${compact}`,
    accessible: `Ends ${full}${dayOnly ? " — end date only" : ""}`,
    unknown: false, dayOnly,
  };
}

export function timelineAccessibleName(
  event: DisplayEvent, clock: EventClock, game: string,
  deadline: string, disputed: boolean, done: boolean,
): string {
  const identity = recognitionIdentity(event);
  const original = originalTimelineIdentity(event);
  const type = categoryBadge(event.type);
  return [
    game, `Type: ${type}${type.toLowerCase() !== event.type ? ` (${event.type})` : ""}`,
    identity, ...(original !== identity && original !== event.title ? [original] : []),
    ...(identity === event.title ? [] : [event.title]), deadline,
    ...(event.startPrecision === "day" ? ["start date only"] : []),
    ...(clock.upcoming ? ["not started yet"] : []),
    ...(disputed ? ["Date disputed"] : []),
    ...(done ? ["Completed"] : []), `Urgency: ${clock.urgency}`,
  ].join(" — ");
}

/** All widths are measured in the actual rendered fonts, including the badge. */
export interface ContentWidths {
  game: number;
  type: number;
  identity: number;
  deadline: number;
  compactUnknown: number;
  minimumIdentity: number;
  gap: number;
}

export interface ContentFit {
  type: boolean;
  game: number;
  identity: number;
  deadline: "full" | "compact" | null;
}

/** Phone-smoke priority: keep compact type until the badge itself cannot fit. */
export function fitTimelineContent(
  available: number, mode: TimelineGroup, unknown: boolean, w: ContentWidths,
): ContentFit {
  const room = Math.max(0, available);
  const game = mode === "ending" ? w.game : 0;
  const size = (...parts: number[]) => {
    const present = parts.filter(n => n > 0);
    return present.reduce((sum, n) => sum + n, 0) + Math.max(0, present.length - 1) * w.gap;
  };
  if (size(game, w.type, w.identity, w.deadline) <= room) {
    return { type: true, game, identity: w.identity, deadline: "full" };
  }
  // Below the badge's own width, unknown can still show '?'. The complete
  // accessible name always retains both type and End unknown, even at zero px.
  if (w.type > room) {
    return { type: false, game: 0, identity: 0,
      deadline: unknown && w.compactUnknown <= room ? "compact" : null };
  }
  // A known deadline yields before identity. Unknown is more important than a
  // known date: reserve '?' beside the badge before allocating names. At the
  // type-only limit the marker yields visually, never in accessibility.
  const deadline = unknown && size(w.type, w.compactUnknown) <= room ? "compact" : null;
  const namesRoom = Math.max(0, room - w.type - (deadline ? w.compactUnknown + w.gap : 0));
  const identityWithin = (budget: number) => budget >= Math.min(w.identity, w.minimumIdentity)
    ? Math.min(w.identity, Math.max(0, budget)) : 0;
  if (mode === "game") {
    return { type: true, game: 0, identity: identityWithin(namesRoom - w.gap), deadline };
  }
  // Keep game alongside a useful title fragment. If it crowds the title out,
  // reclaim its width before giving up event identity. Badge/unknown reservations
  // above stay intact; every actual child-to-child gap is included.
  const withGame = identityWithin(namesRoom - game - (game > 0 ? 2 : 1) * w.gap);
  if (withGame > 0) {
    return { type: true, game, identity: withGame, deadline };
  }
  const identity = identityWithin(namesRoom - w.gap);
  return { type: true, game: identity > 0 ? 0 : game + w.gap <= namesRoom ? game : 0, identity, deadline };
}

/** Readable intersection of a bar's padded interior and the scroll viewport. */
export function visibleBarContent(left: number, width: number, scrollLeft: number, viewportWidth: number, pin = 8) {
  return Math.max(0, Math.min(left + width - pin, scrollLeft + viewportWidth - pin)
    - Math.max(left + pin, scrollLeft + pin));
}
