import { expect, test } from "bun:test";
import { findLiveSnapshotFiles, LIVE_SNAPSHOT_PATTERN, LIVE_SNAPSHOT_TAG } from "./helpers/live-snapshot-files.ts";

// The checks against the rolling snapshots only warn in CI, so an empty `test:live`
// would only warn too. This guard is blocking: if discovery breaks or a file of live
// checks disappears, `bun test` turns red.
test("test:live still discovers every file with live snapshot checks", async () => {
  expect(await findLiveSnapshotFiles()).toEqual(expect.arrayContaining([
    "./test/article-evidence.test.ts",
    "./test/czn-anniversary-gifts.test.ts",
    "./test/czn-reviewed-precision.test.ts",
    "./test/endfield-reviewed-banners.test.ts",
    "./test/event-evidence.test.ts",
    "./test/genshin-phase-ii-precision.test.ts",
    "./test/parser-context.test.ts",
  ]));
});

test("test:live selects only tagged checks by name", () => {
  const pattern = new RegExp(LIVE_SNAPSHOT_PATTERN);
  expect(pattern.test(`${LIVE_SNAPSHOT_TAG} WuWa parser and evidence sections agree`)).toBe(true);
  expect(pattern.test("WuWa parser and evidence sections agree")).toBe(false);
  expect(pattern.test("live snapshots")).toBe(false);
});
