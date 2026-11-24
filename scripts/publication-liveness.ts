// Decide whether this build may send the dead-man heartbeat. Writes
// `current=true|false` to $GITHUB_OUTPUT for the `pages` job.
//
// It reads the same records as the stale-source issue — the committed snapshot
// metadata plus the refresh state restored from the Actions cache — through
// `collectConfirmations`, and only for the scheduled adapters:
//
// - Scheduled only: the feed's `reviewed-<game>` rows carry the date of a manual
//   review, and one fresh review must not keep the ping going while the refresh
//   schedule has stopped. A fixture fallback has no snapshot and counts for nothing.
// - Records, not the published rows: the feed builder folds a source's dates into
//   one "fresh as of" value, and a content-change date in the future displaces a
//   real HTTP 304 confirmation there. Here a future date is discarded before the
//   newest is chosen, so the real confirmation survives and the future one never
//   counts.
//
// The threshold is `publicationStalled()`'s: a confirmation inside
// [now − 30 h, now] is evidence of life, and no data is not.
//
// Usage: bun scripts/publication-liveness.ts [--snapshots <dir>]
import { appendFile } from "node:fs/promises";
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import { collectConfirmations, type ConfirmationStore } from "../src/ingest/liveness.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";
import { PUBLICATION_STALE_AFTER_MS } from "../src/shared/feed.ts";

export async function heartbeatVerdict(
  store: ConfirmationStore,
  scheduledIds: readonly string[],
  now: number,
): Promise<{ current: boolean; message: string }> {
  let newest: string | null = null;
  for (const confirmation of await collectConfirmations(store, scheduledIds, now)) {
    const at = confirmation.lastConfirmedAt;
    if (at !== null && (newest === null || Date.parse(at) > Date.parse(newest))) newest = at;
  }
  if (newest === null) {
    return { current: false, message: "no scheduled source has a confirmed fetch on record up to now" };
  }
  const ageMs = now - Date.parse(newest);
  if (ageMs <= PUBLICATION_STALE_AFTER_MS) {
    return { current: true, message: `scheduled sources are current (newest confirmation ${newest})` };
  }
  return {
    current: false,
    message: `publication stalled: newest scheduled confirmation ${newest} (${Math.round(ageMs / 3_600_000)} h ago)`,
  };
}

if (import.meta.main) {
  const flag = process.argv.indexOf("--snapshots");
  const root = flag === -1 ? "snapshots" : process.argv[flag + 1]!;
  const verdict = await heartbeatVerdict(new SnapshotStore(root), ADAPTERS.map((a) => a.id), Date.now());
  console.log(verdict.current ? verdict.message : `::warning::${verdict.message}; no heartbeat will be sent`);
  const outputPath = process.env["GITHUB_OUTPUT"];
  if (outputPath) await appendFile(outputPath, `current=${verdict.current}\n`);
}
