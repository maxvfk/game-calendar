import type { GameId } from "./schema.ts";

/**
 * Product scope for maxvfk/game-calendar.
 *
 * Parsers for other games remain available as reusable MIT-licensed code, but
 * only these games participate in ingestion and the published feed.
 */
export const TRACKED_GAMES = [
  "genshin",
  "hsr",
  "wuwa",
  "zzz",
  "endfield",
  "nte",
  "czn",
] as const satisfies readonly GameId[];

export const TRACKED_GAME_SET: ReadonlySet<GameId> = new Set(TRACKED_GAMES);
