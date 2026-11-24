// Decide whether this build may send the dead-man heartbeat: only when the
// published data is current by `publicationStalled()`, which reads the newest
// `lastSuccessAt`, not the build time. A docs-only deploy of stalled data must not
// look alive. Writes `current=true|false` to $GITHUB_OUTPUT for the `pages` job.
import { appendFile } from "node:fs/promises";
import { freshness, publicationStalled, type SourceHealth } from "../src/shared/feed.ts";

const FEED = "public/data/events.v1.json";

export function publicationVerdict(sources: readonly SourceHealth[], now: number): { current: boolean; message: string } {
  // `publicationStalled` stays quiet on missing information, which is right for a
  // notice on the page and wrong for a heartbeat: no data is not proof of life.
  if (freshness(sources, now).refreshedAt === null) {
    return { current: false, message: "no source has ever succeeded" };
  }
  const stalled = publicationStalled(sources, now);
  if (stalled === null) return { current: true, message: "publication is current" };
  const hours = Math.round(stalled.ageMs / 3_600_000);
  return { current: false, message: `publication stalled: newest source success ${stalled.refreshedAt} (${hours} h ago)` };
}

if (import.meta.main) {
  const feed = (await Bun.file(FEED).json()) as { sources: SourceHealth[] };
  const verdict = publicationVerdict(feed.sources, Date.now());
  console.log(verdict.current ? verdict.message : `::warning::${verdict.message}; no heartbeat will be sent`);
  const outputPath = process.env["GITHUB_OUTPUT"];
  if (outputPath) await appendFile(outputPath, `current=${verdict.current}\n`);
}
