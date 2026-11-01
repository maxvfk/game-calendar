/** Offline full-build parity against a detached CURRENT-main checkout.
 * bun scripts/verify-notice-coverage-parity.ts BASE_CHECKOUT HEAD_CHECKOUT RECORD_JSON
 * Both disposable public/ trees are rebuilt. No source refresh, API or state writes.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import assert from "node:assert/strict";
const [baseArg, headArg, recordArg] = process.argv.slice(2);
assert(baseArg && headArg && recordArg, "Supply base/head checkouts and a JSON evidence path");
const base = resolve(baseArg), head = resolve(headArg), record = resolve(recordArg);
assert(base !== head);
const clock = "2026-11-01T00:00:00.000Z";
const settings = { BASE_PATH: "/", SNAPSHOT_DIR: "snapshots", PUBLIC_DIR: "public", INCLUDE_LEAKS: "false", TZ: "UTC" };
const sha = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
async function manifest(root: string, path: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(relative: string) {
    for (const entry of (await readdir(join(root, relative), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const file = join(relative, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { assert(entry.isFile(), `Unexpected non-file: ${file}`); result[file] = sha(await readFile(join(root, file))); }
    }
  }
  await walk(path); return result;
}
async function json(root: string, file: string) { return JSON.parse(await readFile(join(root, file), "utf8")); }
function revision(root: string) {
  const run = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: root });
  assert.equal(run.exitCode, 0); return run.stdout.toString().trim();
}
const inputs: Record<string, string> = {};
for (const path of ["snapshots", "fixtures", "data/reviewed", "data/presentation"]) {
  const before = await manifest(base, path), after = await manifest(head, path);
  assert.deepEqual(after, before, `Different identical-input replay: ${path}`); Object.assign(inputs, before);
}
assert.equal(await Bun.file(join(head, "bun.lock")).text(), await Bun.file(join(base, "bun.lock")).text(), "Dependencies changed");
for (const root of [base, head]) {
  await mkdir(join(root, "work/c1a1"), { recursive: true });
  const preload = join(root, "work/c1a1/parity-clock.ts");
  await Bun.write(preload, `const Original = Date; globalThis.Date = class extends Original { constructor(v?: string | number) { super(v ?? ${JSON.stringify(clock)}); } static now() { return Original.parse(${JSON.stringify(clock)}); } } as DateConstructor;`);
  await rm(join(root, "public"), { recursive: true, force: true });
  const log = Bun.file(join(root, "work/c1a1/parity-build.log"));
  const run = Bun.spawn([process.execPath, "run", "build"], { cwd: root, env: { ...process.env, ...settings, BUN_OPTIONS: `--preload=${preload}` }, stdout: log, stderr: log });
  assert.equal(await run.exited, 0, `Build failed: ${root}/work/c1a1/parity-build.log`);
  assert.equal((await json(root, "public/data/events.v1.json")).generatedAt, clock);
}
const publicBase = await manifest(base, "public"), publicHead = await manifest(head, "public");
assert.deepEqual(publicHead, publicBase, "Recursive public files differ");
const before = await json(base, "tmp/editorial/event-evidence.v1.json"), after = await json(head, "tmp/editorial/event-evidence.v1.json");
assert.deepEqual(after, before, "E1/C0/C1a.0 evidence changed");
const baseFeed = await json(base, "public/data/events.v1.json"), headFeed = await json(head, "public/data/events.v1.json");
assert.deepEqual(headFeed.events, baseFeed.events, "Canonical winners changed");
assert.deepEqual(headFeed.dateConflicts, baseFeed.dateConflicts);
const cli = Bun.spawnSync([process.execPath, "scripts/notice-coverage-report.ts"], { cwd: head });
assert.equal(cli.exitCode, 0);
const report = JSON.parse(cli.stdout.toString());
const again = Bun.spawnSync([process.execPath, "scripts/notice-coverage-report.ts"], { cwd: head });
assert.equal(again.exitCode, 0); assert.equal(again.stdout.toString(), cli.stdout.toString(), "Non-deterministic report");
const output = {
  base: revision(base), implementationHead: revision(head), clock, settings, bun: Bun.version,
  inputFiles: Object.keys(inputs).length, inputManifestSha256: sha(JSON.stringify(inputs)), inputManifest: inputs,
  publicFiles: Object.keys(publicBase).length, publicManifestSha256: sha(JSON.stringify(publicBase)), publicBase, publicHead,
  byteIdentical: true, events: headFeed.events.length, eventIdsSha256: sha(JSON.stringify(headFeed.events.map((e: { id: string }) => e.id))),
  reviewedWinners: headFeed.events.filter((e: { sourceId: string }) => e.sourceId.startsWith("reviewed-")).length,
  canonicalEventsSha256: sha(JSON.stringify(headFeed.events)), dateConflicts: headFeed.dateConflicts,
  completeSidecarIdentical: true, sidecarSha256: sha(JSON.stringify(after)), e1Entries: after.entries.length,
  e1EntriesSha256: sha(JSON.stringify(after.entries)), e1UnattachedSha256: sha(JSON.stringify(after.unattached)),
  articleNoticesSha256: sha(JSON.stringify(after.notices)), articleAttributionsSha256: sha(JSON.stringify(after.articleAttributions)),
  diagnosticsSha256: sha(JSON.stringify(after.diagnostics)), reportDeterministic: true, reportSha256: sha(cli.stdout),
  sources: report.sources.map((s: { sourceId: string; available: boolean; notices: Array<{ status: string | null; evaluation: string; baselineMember: boolean }> }) => ({
    sourceId: s.sourceId, available: s.available, notices: s.notices.length,
    statusCounts: Object.fromEntries(["processed", "partially processed", "unprocessed", "ignored", null].map(status => [status ?? "unclassified", s.notices.filter(n => n.status === status).length])),
    evaluationCounts: Object.fromEntries(["complete", "uncertain", "incomplete"].map(v => [v, s.notices.filter(n => n.evaluation === v).length])),
    baselineMembers: s.notices.filter(n => n.baselineMember).length,
  })),
};
await mkdir(dirname(record), { recursive: true });
await Bun.write(record, JSON.stringify(output, null, 2) + "\n");
console.log(`PASS: ${output.publicFiles} public files, ${output.events} events and entire E1/C0/C1a.0 sidecar identical; report deterministic. Record: ${record}`);
