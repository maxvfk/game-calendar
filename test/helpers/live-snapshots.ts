import { test } from "bun:test";
import { LIVE_SNAPSHOT_TAG } from "./live-snapshot-files.ts";

const gated = test.skipIf(process.env.LIVE_SNAPSHOT_CHECKS !== "1");

/**
 * A check against the rolling `snapshots/*`: skipped by `bun test`, run by `bun run test:live`.
 * The tag is added here, so the launcher's name filter cannot miss a check.
 */
export function liveSnapshotTest(...[label, ...rest]: Parameters<typeof gated>) {
  gated(`${LIVE_SNAPSHOT_TAG} ${label}`, ...rest);
}
