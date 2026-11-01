/** Offline full-build comparison. Requires two disposable checkouts and installed dependencies.
 * bun docs/evidence/wuwa-notice-inventory-c1a0-replay.ts BASE_CHECKOUT HEAD_CHECKOUT RECORD_JSON
 * Writes generated public/ and tmp/editorial/ outputs in both checkouts. Never refreshes.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import assert from "node:assert/strict";

const [baseArg, headArg, recordArg] = process.argv.slice(2);
assert(baseArg && headArg && recordArg, "Supply two checkouts and a result JSON path");
const base = resolve(baseArg), head = resolve(headArg), record = resolve(recordArg);
assert(base !== head, "Use separate checkouts");
const clock = "2026-11-01T00:00:00.000Z";
const settings = { BASE_PATH: "/", SNAPSHOT_DIR: "snapshots", PUBLIC_DIR: "public", INCLUDE_LEAKS: "false", TZ: "UTC" };
const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
async function manifest(root: string, path: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(relative: string) {
    for (const entry of (await readdir(join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(relative, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { assert(entry.isFile(), `Unexpected non-file input: ${file}`); result[file] = sha(await readFile(join(root, file))); }
    }
  }
  await walk(path);
  return result;
}
async function json(root: string, file: string) { return JSON.parse(await readFile(join(root, file), "utf8")); }
function revision(root: string) {
  const run = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: root });
  assert.equal(run.exitCode, 0); return run.stdout.toString().trim();
}
const inputs: Record<string, string> = {};
for (const path of ["snapshots", "fixtures", "data/reviewed", "data/presentation"]) {
  const before = await manifest(base, path), after = await manifest(head, path);
  assert.deepEqual(after, before, `Different replay inputs: ${path}`);
  Object.assign(inputs, before);
}
assert.equal(await Bun.file(join(base, "bun.lock")).text(), await Bun.file(join(head, "bun.lock")).text());
for (const root of [base, head]) {
  await mkdir(join(root, "work/c1a0"), { recursive: true });
  const preload = join(root, "work/c1a0/parity-clock.ts");
  await Bun.write(preload, `const Original = Date; globalThis.Date = class extends Original { constructor(v?: string | number) { super(v ?? ${JSON.stringify(clock)}); } static now() { return Original.parse(${JSON.stringify(clock)}); } } as DateConstructor;`);
  // Both public trees are generated and untracked; start without stale assets.
  await rm(join(root, "public"), { recursive: true, force: true });
  const log = Bun.file(join(root, "work/c1a0/parity-build.log"));
  const run = Bun.spawn([process.execPath, "run", "build"], { cwd: root,
    env: { ...process.env, ...settings, BUN_OPTIONS: `--preload=${preload}` }, stdout: log, stderr: log });
  assert.equal(await run.exited, 0, `Build failed: ${root}/work/c1a0/parity-build.log`);
  assert.equal((await json(root, "public/data/events.v1.json")).generatedAt, clock);
}
const publicBase = await manifest(base, "public"), publicHead = await manifest(head, "public");
assert.deepEqual(publicHead, publicBase, "Recursive public tree/bytes changed");
const baseFeed = await json(base, "public/data/events.v1.json"), headFeed = await json(head, "public/data/events.v1.json");
assert.deepEqual(headFeed.events, baseFeed.events);
assert.deepEqual(headFeed.dateConflicts, baseFeed.dateConflicts);
const before = await json(base, "tmp/editorial/event-evidence.v1.json"), after = await json(head, "tmp/editorial/event-evidence.v1.json");
assert.deepEqual(after.entries, before.entries);
assert.deepEqual(after.unattached, before.unattached);
assert.deepEqual(after.diagnostics, before.diagnostics);
for (const field of ["notices", "articleAttributions"] as const) {
  assert.deepEqual(after[field].filter((row: any) => (row.sourceId ?? row.event.sourceId) !== "wuwa-kuro-mirror"), before[field]);
}
const reportRun = Bun.spawnSync([process.execPath, "scripts/event-evidence-report.ts"], { cwd: head });
assert.equal(reportRun.exitCode, 0);
const report = JSON.parse(reportRun.stdout.toString());
const output = {
  base: revision(base), implementationHead: revision(head), clock, settings, bun: Bun.version,
  inputFiles: Object.keys(inputs).length, inputManifestSha256: sha(JSON.stringify(inputs)), inputManifest: inputs,
  publicFiles: Object.keys(publicBase).length, publicManifestSha256: sha(JSON.stringify(publicBase)),
  publicBase, publicHead, byteIdentical: true,
  events: headFeed.events.length, eventIdsSha256: sha(JSON.stringify(headFeed.events.map((e: any) => e.id))),
  reviewedWinners: headFeed.events.filter((e: any) => e.sourceId.startsWith("reviewed-")).length,
  dateConflicts: headFeed.dateConflicts, e1Entries: after.entries.length, e1Unattached: after.unattached.length,
  e1EntriesSha256: sha(JSON.stringify(after.entries)), e1UnattachedSha256: sha(JSON.stringify(after.unattached)),
  existingDiagnosticsUnchanged: true, existingArticleRowsUnchanged: true,
  articleSources: report.articleSources, diagnostics: report.diagnostics,
};
await mkdir(dirname(record), { recursive: true });
await Bun.write(record, JSON.stringify(output, null, 2) + "\n");
console.log(`PASS: ${output.publicFiles} public files identical; ${output.events} events; ${output.e1Entries} E1 entries. Record: ${record}`);
