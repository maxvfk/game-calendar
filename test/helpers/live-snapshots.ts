import { test } from "bun:test";

export const liveSnapshotTest = test.skipIf(process.env.LIVE_SNAPSHOT_CHECKS !== "1");
