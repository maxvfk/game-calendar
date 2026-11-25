// Decide whether this build may send the dead-man heartbeat. Writes
// `current=true|false` to $GITHUB_OUTPUT for the `pages` job.
//
// It combines the built feed (`public/data/events.v1.json`) with the raw
// snapshot records read through `collectConfirmations`, and only for the
// scheduled adapters:
//
// - Scheduled only: the feed's `reviewed-<game>` rows carry the date of a manual
//   review, and one fresh review must not keep the ping going while the refresh
//   schedule has stopped. A fixture fallback carries `lastConfirmedAt: null` (and
//   has no snapshot on disk) and counts for nothing.
// - Accepted by this build only: a snapshot merely sitting on disk is not enough
//   — the builder can skip a cycle source (`endfield-wikigg-echoes` with no
//   active/upcoming season) or reject it on a stale URL, parse failure or
//   out-of-window rows, leaving it absent from `feed.sources` or with null
//   `lastSuccessAt` / `parsedCount`. A validly accepted snapshot with zero active
//   events (all ended or `statesNoEvents`) still has non-null `lastSuccessAt`,
//   `lastConfirmedAt` and `parsedCount`, so it stays eligible.
// - Raw records with matching fingerprint: the feed builder folds a source's
//   dates into one "fresh as of" value, where a future `contentChangedAt`
//   displaces a real HTTP 304 confirmation. Reading the raw records discards
//   future dates first; requiring `state.lastConfirmedContentHash === meta.contentHash`
//   ensures cached state from an unpushed refresh (or a legacy cache without a
//   hash) cannot vouch for older published bytes.
// - The same directory as the builder: `--snapshots`, else `SNAPSHOT_DIR`, else
//   `snapshots` — the builder reads `SNAPSHOT_DIR ?? "snapshots"`.
//
// The threshold is `publicationStalled()`'s: a confirmation inside
// [now − 30 h, now] is evidence of life, and no data is not.
//
// Usage: bun scripts/publication-liveness.ts [--snapshots <dir>] [--feed <path>]
import { appendFile } from "node:fs/promises";
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import { collectConfirmations, type ConfirmationStore } from "../src/ingest/liveness.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";
import { PUBLICATION_STALE_AFTER_MS, type SourceHealth } from "../src/shared/feed.ts";

const DEFAULT_FEED = "public/data/events.v1.json";

/** What the heartbeat reads: the confirmation records, and whether the snapshot is on disk. */
export type HeartbeatStore = ConfirmationStore & Pick<SnapshotStore, "read">;

/**
 * Scheduled snapshot sources accepted by this build.
 *
 * Skipped sources are absent from `feedSources`; rejected or unavailable ones
 * have `lastSuccessAt: null` and `parsedCount: null`; fixture fallbacks have
 * `lastConfirmedAt: null`. Every accepted snapshot — including one with zero
 * active events — has all three fields non-null.
 */
export function acceptedSnapshotIds(
  feedSources: readonly SourceHealth[],
  scheduledIds: readonly string[],
): string[] {
  const scheduled = new Set(scheduledIds);
  const accepted = new Set<string>();
  for (const source of feedSources) {
    if (!scheduled.has(source.sourceId)) continue;
    if (source.lastSuccessAt === null || source.lastConfirmedAt === null || source.parsedCount === null) continue;
    accepted.add(source.sourceId);
  }
  return [...accepted];
}

export async function heartbeatVerdict(
  store: HeartbeatStore,
  scheduledIds: readonly string[],
  now: number,
  feedSources: readonly SourceHealth[],
): Promise<{ current: boolean; message: string }> {
  const published: string[] = [];
  for (const id of acceptedSnapshotIds(feedSources, scheduledIds)) {
    if ((await store.read(id)) !== null) published.push(id);
  }
  let newest: string | null = null;
  for (const confirmation of await collectConfirmations(store, published, now, { requireMatchingStateHash: true })) {
    const at = confirmation.lastConfirmedAt;
    if (at !== null && (newest === null || Date.parse(at) > Date.parse(newest))) newest = at;
  }
  if (newest === null) {
    return { current: false, message: "no published scheduled snapshot has a confirmed fetch on record up to now" };
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

function flagValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

if (import.meta.main) {
  const root = flagValue(process.argv, "--snapshots") ?? process.env["SNAPSHOT_DIR"] ?? "snapshots";
  const feedPath = flagValue(process.argv, "--feed") ?? DEFAULT_FEED;
  const feedFile = Bun.file(feedPath);
  let verdict: { current: boolean; message: string };
  if (!(await feedFile.exists())) {
    verdict = { current: false, message: `built feed not found at ${feedPath}` };
  } else {
    const feed = (await feedFile.json()) as { sources?: SourceHealth[] };
    const feedSources = Array.isArray(feed.sources) ? feed.sources : [];
    verdict = await heartbeatVerdict(new SnapshotStore(root), ADAPTERS.map((a) => a.id), Date.now(), feedSources);
  }
  console.log(verdict.current ? verdict.message : `::warning::${verdict.message}; no heartbeat will be sent`);
  const outputPath = process.env["GITHUB_OUTPUT"];
  if (outputPath) await appendFile(outputPath, `current=${verdict.current}\n`);
}
