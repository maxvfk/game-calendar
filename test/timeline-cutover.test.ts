import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTimelineStorage, StorageSelection, writerTicket, assertWriterTicket, acceptStoredTimelineProposals, storedRegistryBytes, STORAGE_PATH, V1_PATH, V2_PATH } from "../src/editorial/timeline-storage.ts";
import { CUTOVER_PATH, CutoverManifest, createCutoverManifest, assertFreezeGate, prepareRollback, validateCutoverSource } from "../src/editorial/timeline-cutover.ts";
import { migrateToV2, sha256 } from "../src/editorial/provenance-migration.ts";
import { rollbackToV1, editorialRegistryBytes, EditorialRegistryV2 } from "../src/editorial/timeline-decisions-v2.ts";
import { TimelineRegistry, applyTimelineLabels, buildTimelineQueue, semanticFingerprint } from "../src/presentation/timeline-labels.ts";
import { registryBytes, acceptTimelineProposals } from "../src/presentation/timeline-label-accept.ts";
import { GachaEvent } from "../src/shared/schema.ts";
import { EventFeed } from "../src/shared/feed.ts";
import { loadProvenanceInventory } from "../scripts/editorial-provenance-git.ts";
import { guardedPush, validateCandidate } from "../scripts/timeline-cutover-operator.ts";

const root = join(import.meta.dir, "..");
const manifest = CutoverManifest.parse(await Bun.file(CUTOVER_PATH).json());
const original = TimelineRegistry.parse(await Bun.file(V1_PATH).json());
const initial = EditorialRegistryV2.parse(await Bun.file(V2_PATH).json());
const frozen = StorageSelection.parse(await Bun.file(STORAGE_PATH).json());
const opened = { ...frozen, admission: "open" as const };
const NOW = "2026-10-27T20:00:00.000Z";
const event = GachaEvent.parse({ id: "wuwa:new-cutover-event:2026-10-27", game: "wuwa", type: "other", title: "New test event", summary: null,
 startsAt: "2026-10-27T00:00:00Z", startPrecision: "day", endsAt: "2026-11-30T00:00:00Z", endPrecision: "exact", regionScoped: false, regionEnds: null,
 sourceId: "test", sourceUrl: "https://example.test/event", status: "published", confidence: 1, extractionMethod: "parser", version: 1, firstSeenAt: NOW, updatedAt: NOW });
const feed = EventFeed.parse({ schemaVersion: 1, generatedAt: NOW, events: [event], sources: [] });
const proposal = { schemaVersion: 1, decisions: [{ eventId: event.id, fingerprint: semanticFingerprint(event), rulesVersion: "v1", decision: "keep_original" }] };
const clone = <T>(v: T): T => structuredClone(v);
async function storage(dir: string, config: StorageSelection = opened, data: unknown = initial) {
 await Bun.write(join(dir, STORAGE_PATH), JSON.stringify(config));
 await Bun.write(join(dir, CUTOVER_PATH), JSON.stringify(manifest));
 await Bun.write(join(dir, V2_PATH), JSON.stringify(data));
 await Bun.write(join(dir, V1_PATH), registryBytes(original));
 await Bun.write(join(dir, "public/data/events.v1.json"), JSON.stringify(feed));
 if (!await Bun.file(join(dir, "data/presentation/timeline-label-preferences.v1.json")).exists()) await Bun.write(join(dir, "data/presentation/timeline-label-preferences.v1.json"), Bun.file(join(root, "data/presentation/timeline-label-preferences.v1.json")));
}
function temp(prefix: string) { return mkdtempSync(join(tmpdir(), prefix)); }
function go(main: string, candidate: string, action: "cutover" | "rollback" | "release" = "cutover") {
 return { schemaVersion: 1, action, operator: "synthetic operator", window: "test-only-no-production-GO", expectedMain: main, candidate, ciRunId: 1, admissionHeld: true, authorizedAt: NOW };
}
function observation(main: string, candidate: string) {
 return { schemaVersion: 1, repository: "maxvfk/game-calendar", observedAt: NOW, remoteMain: main, variable: "off", workflowState: "disabled_manually", complete: true,
  ci: { id: 1, headSha: candidate, status: "completed", conclusion: "success", workflowPath: ".github/workflows/ci.yml" }, runs: [{ id: 1, status: "completed", conclusion: "success" }] };
}
function git(dir: string, args: string[], ok = true) {
 const r = Bun.spawnSync(["git", ...args], { cwd: dir, env: { ...process.env, GIT_AUTHOR_NAME: "test", GIT_AUTHOR_EMAIL: "test@example.test", GIT_COMMITTER_NAME: "test", GIT_COMMITTER_EMAIL: "test@example.test" } });
 if (ok) expect(r.exitCode, r.stderr.toString()).toBe(0); return r.stdout.toString().trim();
}
function commit(dir: string, subject: string) { git(dir, ["add", "."]); git(dir, ["commit", "--quiet", "-m", subject]); return git(dir, ["rev-parse", "HEAD"]); }

test("fresh cutover ledger is distinct from immutable E2a and preserves all 75 payloads/origins/22 labels", () => {
 expect(manifest.inventory.recordCount).toBe(75);
 expect(manifest.inventory.records.filter(r => r.origin === "operator_approved")).toHaveLength(25);
 expect(manifest.inventory.records.filter(r => r.origin === "automated")).toHaveLength(50);
 expect(manifest.inventory.records.filter(r => r.origin === "legacy_unknown")).toHaveLength(0);
 expect(manifest.inventory.commits.at(-1)!.sha).toBe("46f1d2e2550e57c9370f6cdde7f3a1c9f3ea9d92");
 expect(registryBytes(rollbackToV1(initial))).toBe(registryBytes(original));
 expect(initial.decisions.filter(d => d.decision === "label")).toHaveLength(22);
 const migrated = migrateToV2(original, { ...manifest.inventory, purpose: "timeline-v1-to-v2-rehearsal-only" });
 expect(editorialRegistryBytes(migrated)).toBe(editorialRegistryBytes(initial));
 expect(sha256(editorialRegistryBytes(initial))).toBe(manifest.targetRegistryHash);
 expect(frozen.admission).toBe("frozen");
 const sameDataNewBoundary = createCutoverManifest({ ...manifest.inventory, purpose: "timeline-v1-to-v2-rehearsal-only", baselineCommit: "f".repeat(40) }, manifest.sourceRegistryBlob, original);
 expect(sameDataNewBoundary.targetRegistryHash).toBe(manifest.targetRegistryHash);
 expect(sameDataNewBoundary.targetEpoch).not.toBe(manifest.targetEpoch);
 const inventory = { ...manifest.inventory, purpose: "timeline-v1-to-v2-rehearsal-only" as const };
 expect(editorialRegistryBytes(validateCutoverSource(manifest, inventory, manifest.sourceRegistryBlob, original))).toBe(editorialRegistryBytes(initial));
 expect(() => validateCutoverSource(manifest, inventory, "0".repeat(40), original)).toThrow("blob drift");
 const forged = clone(manifest); forged.inventory.records[0]!.origin = "operator_approved";
 if (manifest.inventory.records[0]!.origin !== "operator_approved") expect(CutoverManifest.safeParse(forged).success).toBe(false);
 expect(CutoverManifest.safeParse({ ...manifest, targetRegistryHash: "0".repeat(64) }).success).toBe(false);
 const historic = Bun.file("data/presentation/timeline-origin-migration.v1.json");
 expect(historic.size).toBeGreaterThan(0);
});

test("same queue/presentation and old public feed schema; no evidence-only work or origin in model contract", () => {
 expect(buildTimelineQueue(feed, rollbackToV1(initial))).toEqual(buildTimelineQueue(feed, original));
 expect(applyTimelineLabels(feed.events, rollbackToV1(initial))).toEqual(applyTimelineLabels(feed.events, original));
 expect(EventFeed.parse(feed)).toEqual(feed);
 const next = acceptStoredTimelineProposals(proposal, feed, initial);
 expect(next.changed).toBe(true);
 expect(next.registry.decisions.at(-1)).toMatchObject({ decision: "keep_original", origin: "automated", evidenceHashAtDecision: null });
 expect(next.registry.decisions.slice(0, initial.decisions.length)).toEqual(initial.decisions);
 expect(acceptStoredTimelineProposals(proposal, feed, next.registry).changed).toBe(false);
 expect(storedRegistryBytes(acceptStoredTimelineProposals(proposal, feed, next.registry).registry)).toBe(storedRegistryBytes(next.registry));
 const forged = { ...proposal, decisions: proposal.decisions.map(d => ({ ...d, origin: "operator_approved", evidenceHashAtDecision: "0".repeat(64) })) };
 expect(acceptStoredTimelineProposals(forged, feed, initial).changed).toBe(false);
 expect(acceptStoredTimelineProposals(forged, feed, initial).registry.decisions).toEqual(initial.decisions);
 expect(acceptTimelineProposals(proposal, feed, original).outcomes).toEqual(next.outcomes);
 expect(buildTimelineQueue(feed, rollbackToV1(next.registry)).events).toEqual([]);
});

test("strict reader fails closed on missing/broken v2/ledger/selector despite a valid old v1", async () => {
 const dir = temp("timeline-storage-");
 try {
  await storage(dir); expect((await loadTimelineStorage(dir)).selection.activeVersion).toBe(2);
  await Bun.write(join(dir, V2_PATH), JSON.stringify({ schemaVersion: 2, decisions: [] }));
  expect(loadTimelineStorage(dir)).rejects.toThrow();
  await storage(dir); rmSync(join(dir, V2_PATH)); expect(loadTimelineStorage(dir)).rejects.toThrow();
  await storage(dir); await Bun.write(join(dir, STORAGE_PATH), JSON.stringify({ ...opened, epoch: "timeline-v2-" + "0".repeat(64) })); expect(loadTimelineStorage(dir)).rejects.toThrow();
  await storage(dir); await Bun.write(join(dir, CUTOVER_PATH), JSON.stringify({ ...manifest, sourceRegistryHash: "0".repeat(64) })); expect(loadTimelineStorage(dir)).rejects.toThrow();
  await storage(dir); const invalidOrigin = clone(initial); (invalidOrigin.decisions[0] as { origin: string }).origin = "human";
  await Bun.write(join(dir, V2_PATH), JSON.stringify(invalidOrigin)); expect(loadTimelineStorage(dir)).rejects.toThrow();
  await storage(dir); const invalidHash = clone(initial); const d = invalidHash.decisions.find(d => d.decision !== "label")!; (d as { evidenceHashAtDecision: string }).evidenceHashAtDecision = "invalid";
  await Bun.write(join(dir, V2_PATH), JSON.stringify(invalidHash)); expect(loadTimelineStorage(dir)).rejects.toThrow();
  rmSync(join(dir, STORAGE_PATH)); expect(loadTimelineStorage(dir)).rejects.toThrow();
 } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("ticket enforces one active path, freeze, epoch, strict metadata and rollback invalidation", () => {
 const ticket = writerTicket(opened);
 expect(() => writerTicket(frozen)).toThrow("frozen");
 expect(() => assertWriterTicket(opened, ticket, V1_PATH)).toThrow();
 expect(() => assertWriterTicket(opened, { ...ticket, origin: "operator_approved" }, V2_PATH)).toThrow();
 expect(() => assertWriterTicket({ ...opened, epoch: "timeline-v2-" + "a".repeat(64) }, ticket, V2_PATH)).toThrow();
 const rollback = prepareRollback(initial, opened.epoch);
 expect(() => assertWriterTicket({ ...rollback.selection, admission: "open" }, ticket, V1_PATH)).toThrow();
 expect(() => assertWriterTicket(opened, undefined, V2_PATH)).toThrow();
});

test("GO/freeze gates reject queued/running/waiting, stale/incomplete reads, missing control access, failed candidate CI", () => {
 const main = "a".repeat(40), candidate = "b".repeat(40), g = go(main, candidate), o = observation(main, candidate);
 expect(() => assertFreezeGate(g, o, main, "cutover", NOW)).not.toThrow();
 for (const conclusion of ["failure", "cancelled", "timed_out"]) expect(() => assertFreezeGate(g, { ...o, runs: [{ id: 2, status: "completed", conclusion }] }, main, "cutover", NOW)).not.toThrow();
 for (const status of ["queued", "in_progress", "waiting", "pending", "requested", "unknown"]) expect(() => assertFreezeGate(g, { ...o, runs: [{ id: 2, status, conclusion: null }] }, main, "cutover", NOW)).toThrow();
 for (const bad of [{ ...o, variable: "on" }, { ...o, workflowState: "active" }, { ...o, complete: false }, { ...o, observedAt: "2026-10-27T19:50:00.000Z" },
   { ...o, ci: { ...o.ci, conclusion: "failure" } }, { ...o, ci: { ...o.ci, headSha: main } }, null]) expect(() => assertFreezeGate(g, bad, main, "cutover", NOW)).toThrow();
 expect(() => assertFreezeGate({ ...g, admissionHeld: false }, o, main, "cutover", NOW)).toThrow();
 expect(() => assertFreezeGate(g, o, main, "rollback", NOW)).toThrow();
});

test("actual CLI blocks old v1 writer, frozen/mismatched ticket and same-checkout lock; preview stays scratch", async () => {
 const dir = temp("timeline-cli-");
 const run = (args: string[]) => Bun.spawnSync([process.execPath, join(root, "scripts/timeline-labels.ts"), ...args], { cwd: dir });
 try {
  await storage(dir); await Bun.write(join(dir, "tmp/p.json"), JSON.stringify(proposal)); await Bun.write(join(dir, "tmp/ticket.json"), JSON.stringify(writerTicket(opened)));
  let r = run(["accept", "tmp/p.json", V1_PATH, "tmp/report.json"]); expect(r.exitCode).not.toBe(0);
  expect(await Bun.file(join(dir, V1_PATH)).text()).toBe(registryBytes(original));
  await Bun.write(join(dir, STORAGE_PATH), JSON.stringify(frozen));
  r = run(["accept", "tmp/p.json", V2_PATH, "tmp/report.json", "", "tmp/ticket.json"]); expect(r.exitCode).not.toBe(0);
  await storage(dir); await Bun.write(join(dir, V2_PATH + ".writer-lock"), "held");
  r = run(["accept", "tmp/p.json", V2_PATH, "tmp/report.json", "", "tmp/ticket.json"]); expect(r.exitCode).not.toBe(0); rmSync(join(dir, V2_PATH + ".writer-lock"));
  r = run(["preview", "tmp/p.json", "probe/registry.json", "probe/report.json"]); expect(r.exitCode, r.stderr.toString()).toBe(0);
  expect((await loadTimelineStorage(dir)).registry.decisions).toEqual(initial.decisions);
  r = run(["accept", "tmp/p.json", V2_PATH, "tmp/report.json", "", "tmp/ticket.json"]); expect(r.exitCode, r.stderr.toString()).toBe(0);
  expect((await loadTimelineStorage(dir)).registry.decisions).toHaveLength(76);
 } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("real bare remote races: post-inventory update, post-check push race, concurrent v2 writers and no rewinds", async () => {
 const dir = temp("timeline-remote-"); const bare = join(dir, "remote.git"), a = join(dir, "a"), b = join(dir, "b");
 try {
  git(dir, ["init", "--bare", "--quiet", bare]); git(dir, ["clone", "--quiet", bare, a]);
  await Bun.write(join(a, "state"), "base"); const base = commit(a, "base"); git(a, ["push", "origin", "HEAD:main"]); git(dir, ["clone", "--quiet", "--branch", "main", bare, b]);
  await Bun.write(join(a, "state"), "writer-a"); const first = commit(a, "v2 writer a");
  await Bun.write(join(b, "state"), "writer-b"); const second = commit(b, "v2 writer b");
  guardedPush(a, go(base, first), observation(base, first), NOW);
  expect(() => guardedPush(b, go(base, second), observation(base, second), NOW)).toThrow("remote main moved");
  expect(git(dir, ["--git-dir", bare, "rev-parse", "main"])).toBe(first);
  // Inject another real push between remote check and guarded send using pre-push hook.
  git(b, ["fetch", "origin", "main"]); git(b, ["reset", "--hard", "origin/main"]);
  await Bun.write(join(b, "state"), "intervening-bot"); const intervening = commit(b, "bot update");
  await Bun.write(join(a, "state"), "candidate-after-check"); const candidate = commit(a, "candidate");
  await Bun.write(join(a, ".git/hooks/pre-push"), `#!/bin/sh\ngit -C '${b}' push origin HEAD:main >/dev/null 2>&1\n`); chmodSync(join(a, ".git/hooks/pre-push"), 0o755);
  expect(() => guardedPush(a, go(first, candidate), observation(first, candidate), NOW)).toThrow("compare-and-swap");
  expect(git(dir, ["--git-dir", bare, "rev-parse", "main"])).toBe(intervening);
  rmSync(join(a, ".git/hooks/pre-push")); git(a, ["fetch", "origin", "main"]);
  expect(() => guardedPush(a, go(intervening, base), observation(intervening, base), NOW)).toThrow();
 } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rollback after a new v2 recording preserves latest data AND archives origin/evidence; validates candidate", async () => {
 const dir = temp("timeline-rollback-");
 try {
  git(dir, ["init", "--quiet"]);
  const next = acceptStoredTimelineProposals(proposal, feed, initial).registry;
  const recorded = clone(next); const nonlabel = recorded.decisions.find(d => d.decision !== "label")!;
  nonlabel.evidenceHashAtDecision = "b".repeat(64);
  await storage(dir, opened, recorded); const before = commit(dir, "latest v2 record");
  const rollback = prepareRollback(recorded, opened.epoch);
  await Bun.write(join(dir, `data/presentation/cutover-archives/${rollback.archiveHash}/registry-v2.json`), rollback.archive);
  await Bun.write(join(dir, V1_PATH), rollback.v1); await Bun.write(join(dir, STORAGE_PATH), JSON.stringify(rollback.selection));
  const after = commit(dir, "rollback latest v2");
  await validateCandidate(dir, go(before, after, "rollback"));
  expect((await loadTimelineStorage(dir)).projection.decisions).toHaveLength(76);
  expect(rollbackToV1(recorded).decisions.at(-1)).toMatchObject({ eventId: event.id, decision: "keep_original" });
  expect(JSON.parse(rollback.archive).decisions.find((d: { evidenceHashAtDecision?: string }) => d.evidenceHashAtDecision === "b".repeat(64))).toBeDefined();
  expect(sha256(rollback.archive)).toBe(rollback.archiveHash);
 } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("full fixed-clock builder parity under v1 and v2, including all titles, summaries, regions and queue bytes", async () => {
 const dir = temp("timeline-parity-");
 try {
  mkdirSync(join(dir, "data/presentation"), { recursive: true });
  for (const p of ["snapshots", "fixtures", "data/reviewed"]) symlinkSync(join(root, p), join(dir, p));
  symlinkSync(join(root, "data/presentation/timeline-label-preferences.v1.json"), join(dir, "data/presentation/timeline-label-preferences.v1.json"));
  await storage(dir);
  await Bun.write(join(dir, "clock.ts"), `const Original=Date;globalThis.Date=class extends Original{constructor(v?:string|number){super(v??${JSON.stringify(NOW)});}static now(){return Original.parse(${JSON.stringify(NOW)});}} as DateConstructor;`);
  const build = async () => { const r = Bun.spawnSync([process.execPath, "--preload", join(dir, "clock.ts"), join(root, "scripts/build-feed.ts")], { cwd: dir }); expect(r.exitCode, r.stderr.toString()).toBe(0);
   return await Promise.all(["events.v1.json", "timeline-label-queue.v1.json", "timeline-label-agent-input.v1.json", "review.v1.json"].map(p => Bun.file(join(dir, "public/data", p)).text())); };
  await Bun.write(join(dir, STORAGE_PATH), JSON.stringify({ schemaVersion: 1, activeVersion: 1, epoch: "timeline-v1-" + "0".repeat(64), admission: "frozen" }));
  const before = await build(); await Bun.write(join(dir, STORAGE_PATH), JSON.stringify(frozen)); expect(await build()).toEqual(before);
 } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("actual old record.sh cannot write, new runner obeys freeze and records v2 idempotently (local remote only)", async () => {
 const dir = temp("timeline-record-"); const work = join(dir, "work"), bare = join(dir, "remote.git"), bin = join(dir, "bin");
 try {
  git(dir, ["init", "--quiet", "--bare", bare]); git(dir, ["clone", "--quiet", bare, work]);
  await storage(work, frozen);
  mkdirSync(join(work, "scripts"), { recursive: true });
  symlinkSync(join(root, "src"), join(work, "src"));
  for (const p of ["timeline-labels.ts", "timeline-storage.ts"]) await Bun.write(join(work, "scripts", p), Bun.file(join(root, "scripts", p)));
  await Bun.write(join(work, ".gitignore"), "public/\ntmp/\n*.writer-lock\n*.tmp-writer-*\n");
  const base = commit(work, "frozen fixture"); git(work, ["push", "origin", "HEAD:main"]);
  const p = join(dir, "proposals.json"), ticket = join(dir, "ticket.json"), reports = join(dir, "reports");
  await Bun.write(p, JSON.stringify(proposal)); await Bun.write(ticket, JSON.stringify(writerTicket(opened))); mkdirSync(bin);
  // Only heavyweight check commands are stubbed. Ticket/reader/accept and Git run for real.
  const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
  await Bun.write(join(bin, "bun"), `#!/bin/sh\nif [ "$1" = run ] || [ "$1" = test ]; then exit 0; fi\nexec ${quote(process.execPath)} "$@"\n`); chmodSync(join(bin, "bun"), 0o755);
  // Ordinary CI is shallow. Freeze the actual old runner and verify its independent E2a hash.
  const beforeScript = await Bun.file(join(root, "test/fixtures/editorial/record-v1-before-cutover.sh")).text();
  const frozenHistory = await Bun.file(join(root, "test/fixtures/editorial/provenance-history-2026-10-26.json")).json();
  expect(sha256(beforeScript)).toBe(frozenHistory.m4Files.find((f: { path: string }) => f.path === "scripts/timeline-label-agent/record.sh").sha256);
  const old = join(dir, "old-record.sh"); await Bun.write(old, beforeScript);
  const run = (script: string, ticketArg: boolean) => Bun.spawnSync(["bash", script, p, "main", reports, ...(ticketArg ? [ticket] : [])], { cwd: work, env: { ...process.env, PATH: bin + ":" + process.env.PATH } });
  let r = run(old, false); expect(r.exitCode).not.toBe(0); expect(git(dir, ["--git-dir", bare, "rev-parse", "main"])).toBe(base);
  r = run(join(root, "scripts/timeline-label-agent/record.sh"), true); expect(r.exitCode).not.toBe(0);
  expect(git(dir, ["--git-dir", bare, "rev-parse", "main"])).toBe(base);
  await Bun.write(join(work, STORAGE_PATH), JSON.stringify(opened)); const release = commit(work, "synthetic release only in local test"); git(work, ["push", "origin", "HEAD:main"]);
  r = run(join(root, "scripts/timeline-label-agent/record.sh"), true); expect(r.exitCode, r.stderr.toString() + r.stdout.toString()).toBe(0);
  const recorded = git(dir, ["--git-dir", bare, "rev-parse", "main"]); expect(recorded).not.toBe(release);
  expect(git(work, ["diff-tree", "--no-commit-id", "--name-only", "-r", recorded])).toBe(V2_PATH);
  expect((await loadTimelineStorage(work)).registry.decisions.at(-1)).toMatchObject({ eventId: event.id, origin: "automated", evidenceHashAtDecision: null });
  r = run(join(root, "scripts/timeline-label-agent/record.sh"), true); expect(r.exitCode, r.stderr.toString()).toBe(0);
  expect(git(dir, ["--git-dir", bare, "rev-parse", "main"])).toBe(recorded);
 } finally { rmSync(dir, { recursive: true, force: true }); }
}, 20_000);

test("cutover candidate validates fresh full-history boundary; release is a separate one-file transition", async () => {
 const dir = temp("timeline-candidate-");
 try {
  git(dir, ["init", "--quiet"]); await Bun.write(join(dir, V1_PATH), registryBytes(original)); const base = commit(dir, "unclassified synthetic v1 source");
  const audit = loadProvenanceInventory(dir); const blob = git(dir, ["rev-parse", `${base}:${V1_PATH}`]);
  const m = createCutoverManifest(audit.manifest, blob, original);
  const v2 = migrateToV2(original, audit.manifest);
  await Bun.write(join(dir, CUTOVER_PATH), JSON.stringify(m)); await Bun.write(join(dir, V2_PATH), editorialRegistryBytes(v2));
  const selection = { schemaVersion: 1 as const, activeVersion: 2 as const, epoch: m.targetEpoch, admission: "frozen" as const };
  await Bun.write(join(dir, STORAGE_PATH), JSON.stringify(selection)); const candidate = commit(dir, "prepared frozen cutover");
  await validateCandidate(dir, go(base, candidate));
  expect(v2.decisions.every(d => d.origin === "legacy_unknown")).toBe(true);
  // Rollback before any v2 write also works: v1 bytes already match, so no artificial v1 diff.
  const zeroWriteRollback = prepareRollback(v2, selection.epoch);
  await Bun.write(join(dir, `data/presentation/cutover-archives/${zeroWriteRollback.archiveHash}/registry-v2.json`), zeroWriteRollback.archive);
  await Bun.write(join(dir, V1_PATH), zeroWriteRollback.v1); await Bun.write(join(dir, STORAGE_PATH), JSON.stringify(zeroWriteRollback.selection));
  const rolled = commit(dir, "rollback without new v2 writes");
  await validateCandidate(dir, go(candidate, rolled, "rollback"));
  git(dir, ["checkout", "--detach", candidate]);
  await Bun.write(join(dir, STORAGE_PATH), JSON.stringify({ ...selection, admission: "open" })); const release = commit(dir, "separate release");
  await validateCandidate(dir, go(candidate, release, "release"));
  expect(validateCandidate(dir, go(base, release))).rejects.toThrow();
  await Bun.write(join(dir, "other"), "unrelated edit"); const extra = commit(dir, "release with extra changes");
  expect(validateCandidate(dir, go(candidate, extra, "release"))).rejects.toThrow();
  // A bot write between inventory and planned migration requires refreshing boundary, not old snapshot reuse.
  git(dir, ["checkout", "--detach", base]); await Bun.write(join(dir, V1_PATH), registryBytes({ ...original, decisions: original.decisions.slice(1) })); const newBase = commit(dir, "new v1 write");
  git(dir, ["checkout", "--detach", candidate]);
  expect(validateCandidate(dir, go(newBase, candidate))).rejects.toThrow();
 } finally { rmSync(dir, { recursive: true, force: true }); }
});
