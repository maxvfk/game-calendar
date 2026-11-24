// Run only the opt-in checks against the rolling `snapshots/*`. Their files also
// contain ordinary regressions, so the name pattern selects just the live ones.
// `liveSnapshotTest` adds the tag to every name; files are discovered by that call,
// so a new live check cannot be left out.
import { findLiveSnapshotFiles, LIVE_SNAPSHOT_PATTERN } from "../test/helpers/live-snapshot-files.ts";

const files = await findLiveSnapshotFiles();
if (files.length === 0) {
  console.error("test:live: no test file calls liveSnapshotTest");
  process.exit(1);
}

const result = Bun.spawnSync([process.execPath, "test", `--test-name-pattern=${LIVE_SNAPSHOT_PATTERN}`, ...files], {
  env: { ...process.env, LIVE_SNAPSHOT_CHECKS: "1" },
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(result.exitCode ?? 1);
