import type { GachaEvent } from "../shared/schema.ts";

export const ECHOES_SOURCE_ID = "endfield-wikigg-echoes";
export const ECHOES_EVENT_SOURCE_ID = "endfield-wikigg-events";

/** One active season at a time; an upcoming season takes over after the current one ends. */
export function selectEchoesSeason(events: readonly GachaEvent[], now: string): GachaEvent | null {
  const seasons = events.filter(e => e.game === "endfield" && e.sourceId === ECHOES_EVENT_SOURCE_ID &&
    e.summary === "Echoes of War Event" && /^Season of [A-Za-z ]+$/.test(e.title) &&
    e.endsAt !== null && (e.regionEnds === null ? e.endsAt > now :
      Object.values(e.regionEnds).some(end => end > now)));
  // Regional transitions can overlap for hours; the newer season's early
  // cycles are the useful deadlines, while the old season row stays published.
  return seasons.filter(e => e.startsAt <= now).sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0] ??
    seasons.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;
}

/** Only the wiki's public season article on the same origin; no arbitrary link fetching. */
export function echoesSeasonUrl(season: GachaEvent): string {
  return `https://endfield.wiki.gg/wiki/Echoes_of_War%3A_${season.title.replaceAll(" ", "_")}`;
}
