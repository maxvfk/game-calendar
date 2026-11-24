// Shared by the `liveSnapshotTest` wrapper, the `test:live` launcher and the blocking
// guard in test/live-snapshots.test.ts. It must not import `bun:test`: the launcher
// runs outside the test runner.
import { join } from "node:path";

export const LIVE_SNAPSHOT_TAG = "[live snapshots]";
/** `--test-name-pattern` value selecting exactly the tagged checks. */
export const LIVE_SNAPSHOT_PATTERN = LIVE_SNAPSHOT_TAG.replace(/[[\]]/g, "\\$&");

/** Test files that declare live checks, found by the wrapper call rather than the tag. */
export async function findLiveSnapshotFiles(root = "."): Promise<string[]> {
  const files: string[] = [];
  for await (const path of new Bun.Glob("test/**/*.test.{ts,tsx}").scan(root)) {
    if ((await Bun.file(join(root, path)).text()).includes("liveSnapshotTest(")) {
      files.push(`./${path.replaceAll("\\", "/")}`);
    }
  }
  return files.sort();
}
