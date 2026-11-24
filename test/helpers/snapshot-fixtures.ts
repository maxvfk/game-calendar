import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ADAPTERS } from "../../src/ingest/adapters/index.ts";

const PIN = "snapshots-418d518";

/**
 * Copy the pinned snapshot corpus (`test/fixtures/<game>/snapshots-418d518/`) into
 * `destination`. Every scheduled source must have a pinned capture, so a new source
 * fails here instead of silently falling back to `fixtures/` in the build.
 *
 * The four extract bodies keep the full-body `.meta.json`, so their `bytes` and
 * `contentHash` describe the original capture; each game's README records both hashes.
 */
export function stageSnapshotFixtures(destination: string) {
  for (const game of new Set(ADAPTERS.map((adapter) => adapter.game))) {
    cpSync(join(import.meta.dir, "../fixtures", game, PIN), destination, { recursive: true });
  }
  const missing = ADAPTERS.filter((adapter) => !existsSync(join(destination, `${adapter.id}.meta.json`)));
  if (missing.length > 0) {
    throw new Error(`no pinned snapshot fixture for: ${missing.map((adapter) => adapter.id).join(", ")}`);
  }
}
