// Decide whether this build may send the dead-man heartbeat. Writes
// `current=true|false` to $GITHUB_OUTPUT for the `pages` job.
//
// The heartbeat vouches for the *automatic* pipeline, so it reads only the
// scheduled sources. The feed also carries `reviewed-<game>` rows whose
// `lastSuccessAt` is the date of a manual review; counting them would let one
// fresh review keep the ping going while the refresh schedule has stopped. The
// page's own freshness notice still reads every row, as it should.
import { appendFile } from "node:fs/promises";
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import { freshness, publicationStalled, type SourceHealth } from "../src/shared/feed.ts";

const FEED = "public/data/events.v1.json";

export function publicationVerdict(
  sources: readonly SourceHealth[],
  now: number,
  scheduledIds: ReadonlySet<string> = new Set(ADAPTERS.map((a) => a.id)),
): { current: boolean; message: string } {
  const scheduled = sources.filter((s) => scheduledIds.has(s.sourceId));
  // `publicationStalled` stays quiet on missing information, which is right for a
  // notice on the page and wrong for a heartbeat: no data is not proof of life.
  if (freshness(scheduled, now).refreshedAt === null) {
    return { current: false, message: "no scheduled source has ever succeeded" };
  }
  const stalled = publicationStalled(scheduled, now);
  if (stalled === null) return { current: true, message: "scheduled sources are current" };
  const hours = Math.round(stalled.ageMs / 3_600_000);
  return {
    current: false,
    message: `publication stalled: newest scheduled source success ${stalled.refreshedAt} (${hours} h ago)`,
  };
}

if (import.meta.main) {
  const feed = (await Bun.file(FEED).json()) as { sources: SourceHealth[] };
  const verdict = publicationVerdict(feed.sources, Date.now());
  console.log(verdict.current ? verdict.message : `::warning::${verdict.message}; no heartbeat will be sent`);
  const outputPath = process.env["GITHUB_OUTPUT"];
  if (outputPath) await appendFile(outputPath, `current=${verdict.current}\n`);
}
