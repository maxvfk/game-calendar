// Decide whether this build may send the dead-man heartbeat. Writes
// `current=true|false` to $GITHUB_OUTPUT for the `pages` job.
//
// The heartbeat vouches for the *automatic* pipeline, so it reads only the
// scheduled sources. The feed also carries `reviewed-<game>` rows whose
// `lastSuccessAt` is the date of a manual review; counting them would let one
// fresh review keep the ping going while the refresh schedule has stopped. The
// page's own freshness notice still reads every row, as it should.
//
// It applies the threshold of `publicationStalled()` (30 hours) with one more
// rule: only a time inside [now − 30 h, now] is evidence of life. A timestamp
// from the future would otherwise read as fresh forever, so for each source the
// newest of its recorded times that is not after `now` is used instead.
import { appendFile } from "node:fs/promises";
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import { PUBLICATION_STALE_AFTER_MS, type SourceHealth } from "../src/shared/feed.ts";

const FEED = "public/data/events.v1.json";

/** The newest of a source's recorded times that parses and is not after `now`. */
function lastSuccessUpTo(source: SourceHealth, now: number): string | null {
  let best: string | null = null;
  for (const time of [source.lastSuccessAt, source.lastConfirmedAt, source.contentChangedAt]) {
    if (typeof time !== "string") continue;
    const at = Date.parse(time);
    if (Number.isNaN(at) || at > now) continue;
    if (best === null || at > Date.parse(best)) best = time;
  }
  return best;
}

export function publicationVerdict(
  sources: readonly SourceHealth[],
  now: number,
  scheduledIds: ReadonlySet<string> = new Set(ADAPTERS.map((a) => a.id)),
): { current: boolean; message: string } {
  let newest: string | null = null;
  for (const source of sources) {
    if (!scheduledIds.has(source.sourceId)) continue;
    const at = lastSuccessUpTo(source, now);
    if (at !== null && (newest === null || Date.parse(at) > Date.parse(newest))) newest = at;
  }
  // No data is not proof of life.
  if (newest === null) {
    return { current: false, message: "no scheduled source has a success on record up to now" };
  }
  const ageMs = now - Date.parse(newest);
  if (ageMs <= PUBLICATION_STALE_AFTER_MS) return { current: true, message: "scheduled sources are current" };
  return {
    current: false,
    message: `publication stalled: newest scheduled source success ${newest} (${Math.round(ageMs / 3_600_000)} h ago)`,
  };
}

if (import.meta.main) {
  const feed = (await Bun.file(FEED).json()) as { sources: SourceHealth[] };
  const verdict = publicationVerdict(feed.sources, Date.now());
  console.log(verdict.current ? verdict.message : `::warning::${verdict.message}; no heartbeat will be sent`);
  const outputPath = process.env["GITHUB_OUTPUT"];
  if (outputPath) await appendFile(outputPath, `current=${verdict.current}\n`);
}
