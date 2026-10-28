import { expect, test } from "bun:test";
import { closeSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventFeed } from "../src/shared/feed.ts";
import { semanticFingerprint, endBound } from "../src/presentation/timeline-labels.ts";
import { loadTimelineStorage, writerTicket, STORAGE_PATH, V1_PATH, V2_PATH } from "../src/editorial/timeline-storage.ts";
import { CUTOVER_PATH, CutoverManifest, prepareRollback } from "../src/editorial/timeline-cutover.ts";
import { sha256 } from "../src/editorial/provenance-migration.ts";
import { validateCandidate } from "../scripts/timeline-cutover-operator.ts";

const root = join(import.meta.dir, "..");
// The child runs the ENTIRE suite, excluding only this recursive orchestrator.
// A private .git marker never enters a candidate commit or production workflow.
const child = existsSync(join(root, ".git/timeline-lifecycle-child"));

test.skipIf(child)("real test/build gates through frozen → release → record.sh v2 write → rollback (local remote only)", async () => {
 const dir = mkdtempSync(join(tmpdir(), "timeline-real-gates-"));
 const work = join(dir, "work"), bare = join(dir, "remote.git"), bin = join(dir, "bin");
 const env = { ...process.env, PATH: bin + ":" + process.env.PATH,
  GIT_AUTHOR_NAME: "test", GIT_AUTHOR_EMAIL: "test@example.test", GIT_COMMITTER_NAME: "test", GIT_COMMITTER_EMAIL: "test@example.test" };
 function git(cwd: string, args: string[]) {
  const r = Bun.spawnSync(["git", ...args], { cwd, env });
  expect(r.exitCode, r.stderr.toString()).toBe(0); return r.stdout.toString().trim();
 }
 async function run(label: string, args: string[], ok = true) {
  const log = join(dir, `${label}.log`), fd = openSync(log, "w");
  try {
   const proc = Bun.spawn(args, { cwd: work, env, stdout: fd, stderr: fd });
   const code = await proc.exited;
   const output = await Bun.file(log).text();
   if (ok) expect(code, `${label}:\n${output}`).toBe(0); else expect(code, output).not.toBe(0);
   return output;
  } finally { closeSync(fd); }
 }
 async function gates(state: string) {
  await run(`${state}-typecheck`, ["bun", "run", "typecheck"]);
  const tests = await run(`${state}-test`, ["bun", "test"]);
  expect(tests).toContain("0 fail");
  await run(`${state}-build`, ["bun", "run", "build"]);
  console.info(`[timeline lifecycle] ${state}: real typecheck/test/build passed`);
 }
 function commit(subject: string) {
  git(work, ["add", "."]); git(work, ["commit", "--quiet", "-m", subject]); return git(work, ["rev-parse", "HEAD"]);
 }
 const remoteHead = () => git(dir, ["--git-dir", bare, "rev-parse", "main"]);
 try {
  mkdirSync(work); mkdirSync(bin);
  // Real Bun executables, never success stubs for any test/build command.
  symlinkSync(process.execPath, join(bin, "bun")); symlinkSync(process.execPath, join(bin, "bunx"));
  const paths = git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
  for (const path of paths) {
   mkdirSync(join(work, path, ".."), { recursive: true }); cpSync(join(root, path), join(work, path));
  }
  symlinkSync(join(root, "node_modules"), join(work, "node_modules"));
  git(dir, ["init", "--quiet", "--bare", bare]); git(work, ["init", "--quiet"]);
  git(work, ["remote", "add", "origin", bare]);
  await Bun.write(join(work, ".git/timeline-lifecycle-child"), "skip only recursive gate orchestrator\n");
  const fixtures = join(root, "test/fixtures/editorial/cutover-2026-10-27");
  for (const path of [V1_PATH, V2_PATH, CUTOVER_PATH]) await Bun.write(join(work, path), Bun.file(join(fixtures, path.split("/").at(-1)!)));
  const manifest = CutoverManifest.parse(await Bun.file(join(work, CUTOVER_PATH)).json());
  const frozen = { schemaVersion: 1 as const, activeVersion: 2 as const, epoch: manifest.targetEpoch, admission: "frozen" as const };
  const opened = { ...frozen, admission: "open" as const };
  await Bun.write(join(work, STORAGE_PATH), JSON.stringify(frozen, null, 2) + "\n");
  const initial = await loadTimelineStorage(work);
  const base = commit("isolated frozen historical cutover"); git(work, ["push", "origin", "HEAD:main"]);
  await gates("frozen");

  const ticket = join(dir, "ticket.json"), proposal = join(dir, "proposal.json"), reports = join(dir, "reports");
  await Bun.write(ticket, JSON.stringify(writerTicket(opened)));
  // Propose deterministically from the actual offline feed; no AI/network/source edit.
  const feed = EventFeed.parse(await Bun.file(join(work, "public/data/events.v1.json")).json());
  const ids = new Set(initial.registry.decisions.map(d => d.eventId));
  const event = feed.events.find(e => e.status === "published" && !ids.has(e.id) && endBound(e) > Date.now());
  expect(event).toBeDefined();
  await Bun.write(proposal, JSON.stringify({ schemaVersion: 1, decisions: [{ eventId: event!.id, fingerprint: semanticFingerprint(event!), rulesVersion: "v1", decision: "keep_original" }] }));
  const history = await Bun.file(join(root, "test/fixtures/editorial/provenance-history-2026-10-26.json")).json();
  const legacy = await Bun.file(join(root, "test/fixtures/editorial/record-v1-before-cutover.sh")).text();
  expect(sha256(legacy)).toBe(history.m4Files.find((f: { path: string }) => f.path === "scripts/timeline-label-agent/record.sh").sha256);
  const old = join(dir, "record-v1.sh"); await Bun.write(old, legacy);
  await run("stale-v1-refused", ["bash", old, proposal, "main", reports], false);
  expect(remoteHead()).toBe(base);
  await run("frozen-refused", ["bash", "scripts/timeline-label-agent/record.sh", proposal, "main", reports, ticket], false);
  expect(remoteHead()).toBe(base);

  await Bun.write(join(work, STORAGE_PATH), JSON.stringify(opened, null, 2) + "\n");
  const release = commit("isolated release"); git(work, ["push", "origin", "HEAD:main"]);
  await gates("released");
  const recordedLog = await run("post-write-record", ["bash", "scripts/timeline-label-agent/record.sh", proposal, "main", reports, ticket]);
  // Real record.sh must reach AND pass these gates before its local-remote push.
  expect(recordedLog).toContain("$ tsc --noEmit"); expect(recordedLog).toContain("0 fail");
  expect(recordedLog).toContain("$ bun run build:feed && bun run build:css && bun run build:js && bun run build:static");
  console.info("[timeline lifecycle] post-write: real record.sh typecheck/test/build and local push passed");
  const recordedHead = remoteHead(); expect(recordedHead).not.toBe(release);
  expect(git(work, ["diff-tree", "--no-commit-id", "--name-only", "-r", recordedHead])).toBe(V2_PATH);
  const recorded = await loadTimelineStorage(work);
  expect(recorded.registry.decisions).toHaveLength(76);
  expect(recorded.registry.decisions.slice(0, 75)).toEqual(initial.registry.decisions);
  expect(recorded.registry.decisions.at(-1)).toMatchObject({ eventId: event!.id, fingerprint: semanticFingerprint(event!), origin: "automated", evidenceHashAtDecision: null });
  await run("record-idempotent", ["bash", "scripts/timeline-label-agent/record.sh", proposal, "main", reports, ticket]);
  expect(remoteHead()).toBe(recordedHead);

  const rollback = prepareRollback(recorded.registry, opened.epoch);
  const archivePath = `data/presentation/cutover-archives/${rollback.archiveHash}/registry-v2.json`;
  await Bun.write(join(work, archivePath), rollback.archive); await Bun.write(join(work, V1_PATH), rollback.v1);
  await Bun.write(join(work, STORAGE_PATH), JSON.stringify(rollback.selection, null, 2) + "\n");
  const rolled = commit("isolated latest-state rollback");
  await validateCandidate(work, { schemaVersion: 1, action: "rollback", operator: "synthetic test", window: "local-only-no-GO", expectedMain: recordedHead, candidate: rolled, ciRunId: 1, admissionHeld: true, authorizedAt: new Date().toISOString() });
  expect(await Bun.file(join(work, archivePath)).text()).toBe(rollback.archive);
  const restored = await loadTimelineStorage(work);
  expect(restored.projection).toEqual(recorded.projection);
  expect(restored.registry.decisions).toHaveLength(76);
  await gates("rollback");
  await run("stale-v2-after-rollback", ["bun", "scripts/timeline-storage.ts", "check-ticket", ticket], false);
  expect(remoteHead()).toBe(recordedHead);
  expect(git(work, ["status", "--porcelain"])).toBe("");
 } finally { rmSync(dir, { recursive: true, force: true }); }
}, 600_000);
