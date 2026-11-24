// Run only the opt-in checks against the rolling `snapshots/*`. Their files also
// contain ordinary regressions, so the name pattern selects just the live ones.
// Files are discovered rather than listed, so a new live check cannot be left out.
export {};

const tag = "[live snapshots]";
const files: string[] = [];
for await (const path of new Bun.Glob("test/**/*.test.{ts,tsx}").scan(".")) {
  if ((await Bun.file(path).text()).includes(tag)) files.push(`./${path.replaceAll("\\", "/")}`);
}
files.sort();
if (files.length === 0) {
  console.error(`test:live: no test file contains ${tag}`);
  process.exit(1);
}

const result = Bun.spawnSync([
  process.execPath, "test", "--test-name-pattern=\\[live snapshots\\]", ...files,
], {
  env: { ...process.env, LIVE_SNAPSHOT_CHECKS: "1" },
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(result.exitCode ?? 1);
