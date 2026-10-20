import type { DisplayEvent } from "../../shared/custom.ts";
import { dayOnlyEnd, type EventClock } from "../../shared/time.ts";
import { categoryBadge } from "./eventCategories.ts";
import type { TimelineGroup } from "./lanes.ts";

/** M1's ordered subjects, with no inference from the canonical title. */
export function recognitionIdentity(event: Pick<DisplayEvent, "title" | "recognitionSubjects">): string {
  return event.recognitionSubjects?.length ? event.recognitionSubjects.join(" + ") : event.title;
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
  const type = categoryBadge(event.type);
  return [
    game, `Type: ${type}${type.toLowerCase() !== event.type ? ` (${event.type})` : ""}`,
    identity, ...(identity === event.title ? [] : [event.title]), deadline,
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
  ellipsis: number;
  gap: number;
}

export interface ContentFit {
  type: boolean;
  game: number;
  identity: number;
  deadline: "full" | "compact" | null;
}

/** Mode-specific priority, after reserving room for conflict/urgency cues. */
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
  if (size(game, w.identity, w.deadline) <= room) {
    return { type: false, game, identity: w.identity, deadline: "full" };
  }
  // A known date yields before recognition. An unknown end cannot be read
  // from the geometry, so reserve its compact token before truncating names.
  const deadline = unknown && w.compactUnknown <= room ? "compact" : null;
  const namesRoom = Math.max(0, room - (deadline ? w.compactUnknown + w.gap : 0));
  if (mode === "game") {
    return { type: false, game: 0, identity: namesRoom >= w.ellipsis ? Math.min(w.identity, namesRoom) : 0, deadline };
  }
  if (size(game, Math.min(w.identity, w.ellipsis)) <= namesRoom) {
    return { type: false, game, identity: Math.min(w.identity, namesRoom - game - w.gap), deadline };
  }
  return { type: false, game: namesRoom >= w.ellipsis ? Math.min(game, namesRoom) : 0, identity: 0, deadline };
}

/** Readable intersection of a bar's padded interior and the scroll viewport. */
export function visibleBarContent(left: number, width: number, scrollLeft: number, viewportWidth: number, pin = 8) {
  return Math.max(0, Math.min(left + width - pin, scrollLeft + viewportWidth - pin)
    - Math.max(left + pin, scrollLeft + pin));
}
