import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EditorialDecisionV2, EditorialRegistryV2, editorialRegistryBytes, evidenceRequeueEligibility, rollbackToV1 } from "../src/editorial/timeline-decisions-v2.ts";
import { assertInventoryFresh, BOT_EMAIL, BOT_NAME, BOT_SUBJECT, decisionHash, inventoryProvenance, MANIFEST_PATH, manifestBytes, MigrationManifest, migrateToV2, REGISTRY_PATH, sha256, type HistoryCommit } from "../src/editorial/provenance-migration.ts";
import { applyTimelineLabels, buildTimelineQueue, FINGERPRINT_CONTRACT, semanticFingerprint, TimelineRegistry, type TimelineDecision } from "../src/presentation/timeline-labels.ts";
import { acceptTimelineProposals, registryBytes } from "../src/presentation/timeline-label-accept.ts";
import { EventFeed } from "../src/shared/feed.ts";
import { loadProvenanceInventory } from "../scripts/editorial-provenance-git.ts";
import { buildEvidenceSidecar } from "../src/editorial/event-evidence.ts";
import { extractWuwaEvidence } from "../src/editorial/wuwa-evidence.ts";

const root = join(import.meta.dir, "..");
const manifest = MigrationManifest.parse(await Bun.file(MANIFEST_PATH).json());
// An immutable historical inventory, NOT a CI freshness gate on a still-live v1 writer.
const frozen = TimelineRegistry.parse(await Bun.file("test/fixtures/editorial/timeline-labels-v1-2026-10-26.json").json());
const byHash = new Map(frozen.decisions.map(d => [decisionHash(d), d]));
let before: TimelineRegistry | null = null;
const historyFixture = await Bun.file("test/fixtures/editorial/provenance-history-2026-10-26.json").json() as {
  baselineCommit: string; history: Array<Omit<HistoryCommit, "before" | "after"> & { addedDecisionHashes: string[] }>;
  m4Files: Array<{ path: string; sha256: string }>;
};
const frozenHistory: HistoryCommit[] = historyFixture.history.map(({ addedDecisionHashes, ...meta }) => {
  const after: TimelineRegistry = { schemaVersion: 1, decisions: [...(before?.decisions ?? []), ...addedDecisionHashes.map(h => byHash.get(h)!)] };
  const h = { ...meta, before, after };
  before = after; return h;
});
const audit = { cutoff: manifest.baselineCommit, registry: frozen, history: frozenHistory, raw: registryBytes(frozen),
  manifest: inventoryProvenance(manifest.baselineCommit, frozenHistory, frozen) };
const ctx = { now: "2026-10-26T20:30:00.000Z", sourceId: "wuwa-kuro-mirror", sourceUrl: "https://example.test/mirror", game: "wuwa" as const };
const raw = await Bun.file("test/fixtures/wuwa/evidence-2026-10-21.xml").text();
const extracted = extractWuwaEvidence(raw, ctx, { capturedAt: null, lastConfirmedAt: null, fixtureCaptureDay: "2026-10-21" });
const event = extracted.candidates[0]!.event;
const evidence = buildEvidenceSidecar(extracted, extracted.candidates.map(r => r.event));
const verified = evidence.entries.find(e => e.eventId === event.id)!.evidenceHash;
const fp = { eventId: event.id, fingerprint: semanticFingerprint(event), rulesVersion: "v1" };
const clone = <T>(v: T): T => structuredClone(v);
let serial = 100;
function append(after: TimelineRegistry, override: Partial<HistoryCommit> = {}, history = audit.history): HistoryCommit[] {
  return [...history, { sha: (++serial).toString(16).padStart(40, "0"), parents: [audit.cutoff],
    author: { name: BOT_NAME, email: BOT_EMAIL }, committer: { name: BOT_NAME, email: BOT_EMAIL },
    subject: BOT_SUBJECT, changedFiles: [REGISTRY_PATH], before: history.at(-1)!.after, after, ...override }];
}
const extra: TimelineDecision = { eventId: "wuwa:future:2026-11-01", fingerprint: `sha256:${"a".repeat(64)}`, rulesVersion: "v1", decision: "keep_original" };
const withExtra = () => TimelineRegistry.parse({ schemaVersion: 1, decisions: [...audit.registry.decisions, extra] });
const inventory = (history: HistoryCommit[]) => inventoryProvenance(history.at(-1)!.sha, history, history.at(-1)!.after);

function v2Decision(origin: "operator_approved" | "automated" | "legacy_unknown", kind: "label" | "keep_original" | "needs_research", priorHash: string | null = null) {
  return EditorialDecisionV2.parse({ ...fp, origin, decision: kind,
    ...(kind === "label" ? { timelineTitle: "Approved label" } : { evidenceHashAtDecision: priorHash }),
    ...(kind === "needs_research" ? { reason: "Need sourced featured names" } : {}),
  });
}

describe("strict independent v2 contract", () => {
  test("requires explicit recognized origin and non-label evidence key, never summary/sourceExcerpt", () => {
    for (const origin of ["operator_approved", "automated", "legacy_unknown"] as const) for (const kind of ["label", "keep_original", "needs_research"] as const) {
      const d = v2Decision(origin, kind);
      expect(EditorialDecisionV2.safeParse(d).success).toBe(true);
      const { origin: _origin, ...noOrigin } = d;
      expect(EditorialDecisionV2.safeParse(noOrigin).success).toBe(false);
      for (const field of ["displaySummary", "sourceExcerpt", "approved", "modelOrigin"]) expect(EditorialDecisionV2.safeParse({ ...d, [field]: "untrusted" }).success).toBe(false);
      expect(EditorialDecisionV2.safeParse({ ...d, origin: "human" }).success).toBe(false);
      if (d.decision !== "label") {
        const { evidenceHashAtDecision: _key, ...missing } = d;
        expect(EditorialDecisionV2.safeParse(missing).success).toBe(false);
        expect(EditorialDecisionV2.safeParse({ ...d, evidenceHashAtDecision: "unknown" }).success).toBe(false);
      } else expect(EditorialDecisionV2.safeParse({ ...d, evidenceHashAtDecision: null }).success).toBe(false);
    }
    const d = v2Decision("automated", "keep_original");
    expect(EditorialRegistryV2.safeParse({ schemaVersion: 2, fingerprintContract: FINGERPRINT_CONTRACT, decisions: [d, d] }).success).toBe(false);
    expect(EditorialRegistryV2.safeParse({ schemaVersion: 2, fingerprintContract: "changed", decisions: [d] }).success).toBe(false);
  });

  test("displaySummary, labels and excerpts remain excluded from semantic fingerprint", () => {
    expect(semanticFingerprint(Object.assign({}, event, { displaySummary: "AI text", sourceExcerpt: "external fact", timelineTitle: "AI label", evidenceHash: verified }))).toBe(semanticFingerprint(event));
    expect(semanticFingerprint({ ...event, summary: "Different canonical fact" })).not.toBe(fp.fingerprint);
  });
});

describe("offline evidence eligibility only (not production queue)", () => {
  for (const origin of ["operator_approved", "automated", "legacy_unknown"] as const) for (const kind of ["label", "keep_original", "needs_research"] as const) {
    test(`${origin} ${kind}: null → verified evidence`, () => {
      const expected = origin !== "legacy_unknown" && kind !== "label" && (origin === "automated" || kind === "needs_research");
      expect(evidenceRequeueEligibility(v2Decision(origin, kind), event, evidence).eligible).toBe(expected);
    });
  }
  test("same evidence suppresses repeat, changed verified key reopens eligible decisions", () => {
    expect(evidenceRequeueEligibility(v2Decision("automated", "keep_original", verified), event, evidence).eligible).toBe(false);
    expect(evidenceRequeueEligibility(v2Decision("automated", "needs_research", "0".repeat(64)), event, evidence).eligible).toBe(true);
  });
  test("source outage, extraction/assembly failure, bare or forged hashes never reopen", () => {
    const d = v2Decision("automated", "needs_research");
    for (const unavailable of [null, undefined, verified, { evidenceHash: verified }, { ...evidence, entries: [] },
      { ...evidence, entries: evidence.entries.map(e => ({ ...e, evidenceHash: "0".repeat(64) })) }]) {
      expect(evidenceRequeueEligibility(d, event, unavailable).eligible).toBe(false);
    }
    for (const code of ["source_unavailable", "source_extraction_failed", "sidecar_assembly_failed"]) {
      expect(evidenceRequeueEligibility(d, event, { ...evidence, diagnostics: [{ code, sourceEventId: null, sourceUrl: null, detail: "Unavailable input" }] }).eligible).toBe(false);
    }
    expect(evidenceRequeueEligibility(d, event, { ...evidence, entries: [], unattached: evidence.entries.flatMap(e => e.sources) }).eligible).toBe(false);
  });
  test("unknown IDs, changed fingerprints and unrelated evidence cannot transfer eligibility", () => {
    const d = v2Decision("automated", "keep_original");
    expect(evidenceRequeueEligibility({ ...d, eventId: "wuwa:missing" }, event, evidence).eligible).toBe(false);
    expect(evidenceRequeueEligibility({ ...d, fingerprint: `sha256:${"0".repeat(64)}` }, event, evidence).eligible).toBe(false);
    expect(evidenceRequeueEligibility(d, event, { ...evidence, entries: evidence.entries.filter(e => e.eventId !== event.id) }).eligible).toBe(false);
    expect(evidenceRequeueEligibility(d, { ...event, sourceId: "you" }, evidence).eligible).toBe(false);
  });
});

describe("origin manifest and exact migration", () => {
  test("committed historical manifest reproduces all source commits/counts/content", () => {
    expect(manifestBytes(audit.manifest)).toBe(manifestBytes(manifest));
    expect(manifest.records).toHaveLength(50);
    expect(manifest.records.filter(r => r.origin === "operator_approved")).toHaveLength(25);
    expect(manifest.records.filter(r => r.origin === "automated")).toHaveLength(25);
    expect(manifest.records.filter(r => r.origin === "legacy_unknown")).toHaveLength(0);
    expect(manifest.commits.map(c => [c.classification, c.changes.added.length])).toEqual([["empty_initialization", 0], ["operator_pr87", 25], ["automatic_registry_only", 25]]);
    for (const d of audit.registry.decisions) expect(manifest.records.find(r => r.eventId === d.eventId)?.decisionHash).toBe(decisionHash(d));
  });
  test("deterministic repeated migration and byte-identical lossless v1 rollback preserve all 12 labels", () => {
    const migrated = migrateToV2(audit.registry, manifest);
    expect(migrated.decisions).toHaveLength(50);
    expect(migrated.decisions.filter(d => d.decision === "label")).toHaveLength(12);
    for (const d of migrated.decisions) if (d.decision !== "label") expect(d.evidenceHashAtDecision).toBeNull();
    expect(editorialRegistryBytes(migrateToV2(audit.registry, manifest))).toBe(editorialRegistryBytes(migrated));
    expect(registryBytes(rollbackToV1(migrated))).toBe(audit.raw);
    const roundtrip = migrateToV2(rollbackToV1(migrated), manifest);
    expect(editorialRegistryBytes(roundtrip)).toBe(editorialRegistryBytes(migrated));
  });
  test("manifest cannot be reused for unknown/changed fingerprints, edited reasons or missing decisions", () => {
    for (const input of [withExtra(), { ...audit.registry, decisions: audit.registry.decisions.slice(1) },
      { ...audit.registry, decisions: audit.registry.decisions.map((d, i) => i ? d : { ...d, fingerprint: `sha256:${"0".repeat(64)}` }) },
      { ...audit.registry, decisions: audit.registry.decisions.map((d, i) => i ? d : { ...d, reason: "Edited decision" }) }]) {
      expect(() => migrateToV2(input, manifest)).toThrow(/drift|modified/);
    }
    const bad = clone(manifest); bad.records[0]!.origin = "automated";
    expect(MigrationManifest.safeParse(bad).success).toBe(false);
    expect(MigrationManifest.safeParse({ ...manifest, records: [...manifest.records, manifest.records[0]] }).success).toBe(false);
  });
  test("all later bot additions count; stale inventory stops rehearsal until regenerated", () => {
    const next = inventory(append(withExtra()));
    expect(next.records.filter(r => r.origin === "automated")).toHaveLength(26);
    expect(next.commits).toHaveLength(4);
    expect(() => assertInventoryFresh(manifest, next)).toThrow("inventory drift");
    expect(() => assertInventoryFresh(next, next)).not.toThrow();
    expect(migrateToV2(withExtra(), next).decisions.at(-1)?.origin).toBe("automated");
    // Normal CI intentionally validates the historical manifest, not a false live freshness guarantee.
    expect(manifestBytes(inventoryProvenance(audit.cutoff, audit.history, audit.registry))).toBe(manifestBytes(manifest));
  });
  test("a different fingerprint is attributed to its last writer, never inherited from the original operator", () => {
    const previous = audit.registry.decisions.find(d => manifest.records.find(r => r.eventId === d.eventId)?.origin === "operator_approved")!;
    const replaced = TimelineRegistry.parse({ schemaVersion: 1, decisions: audit.registry.decisions.map(d => d.eventId === previous.eventId ? { ...d, fingerprint: `sha256:${"d".repeat(64)}` } : d) });
    const history = append(replaced);
    const next = inventory(history);
    const r = next.records.find(r => r.eventId === previous.eventId)!;
    expect(r.origin).toBe("automated"); expect(r.sourceCommit).toBe(history.at(-1)!.sha);
    expect(next.commits.at(-1)!.changes.replaced).toHaveLength(1);
  });
  test("author alone, incorrect email/subject/paths or a same-fingerprint edit cannot claim automated origin", () => {
    const variations: Partial<HistoryCommit>[] = [
      { author: { name: BOT_NAME, email: "somebody@example.test" } },
      { subject: "Not the approved bot subject" },
      { changedFiles: [REGISTRY_PATH, "docs/other.md"] },
      { committer: { name: "Other", email: BOT_EMAIL } },
      { parents: [audit.cutoff, "f".repeat(40)] },
      { author: { name: "Operator", email: "operator@example.test" } },
    ];
    for (const variation of variations) {
      const next = inventory(append(withExtra(), variation));
      expect(next.records.find(r => r.eventId === extra.eventId)?.origin).toBe("legacy_unknown");
      const migrated = migrateToV2(withExtra(), next).decisions.at(-1)!;
      expect(evidenceRequeueEligibility(migrated, event, evidence).eligible).toBe(false);
    }
    const previous = audit.registry.decisions[0]!;
    const edited = TimelineRegistry.parse({ schemaVersion: 1, decisions: audit.registry.decisions.map(d => d.eventId === previous.eventId ? { ...d, reason: "Unverified edit with same fingerprint" } : d) });
    const next = inventory(append(edited));
    expect(next.records.find(r => r.eventId === previous.eventId)?.origin).toBe("legacy_unknown");
    expect(next.commits.at(-1)!.changes.modified).toHaveLength(1);
  });
  test("bot deletions and same-bytes revert still invalidate old history inventories", () => {
    const fewer = TimelineRegistry.parse({ ...audit.registry, decisions: audit.registry.decisions.slice(1) });
    const deleted = inventory(append(fewer));
    expect(deleted.commits.at(-1)!.classification).toBe("review_required");
    expect(deleted.commits.at(-1)!.changes.removed).toHaveLength(1);
    const addedHistory = append(withExtra());
    const reverted = inventory(append(audit.registry, {}, addedHistory));
    expect(reverted.registryHash).toBe(manifest.registryHash);
    expect(() => assertInventoryFresh(manifest, reverted)).toThrow("inventory drift");
  });
  test("operator approval anchor requires exact PR87 identity, metadata, files and count/content hash", () => {
    for (const mutate of [(h: HistoryCommit) => { h.subject = "Different subject"; },
      (h: HistoryCommit) => { h.author.email = "wrong@example.test"; },
      (h: HistoryCommit) => { h.changedFiles.push("other-file"); }]) {
      const history = clone(audit.history); mutate(history[1]!);
      const next = inventoryProvenance(audit.cutoff, history, audit.registry);
      expect(next.records.filter(r => r.origin === "operator_approved")).toHaveLength(0);
      expect(next.records.filter(r => r.origin === "legacy_unknown")).toHaveLength(25);
    }
  });
});

test("existing M4 still queues/accepts v1 only; v2 rollback leaves presentation and queue unchanged", async () => {
  // C0 adds only internal article evidence to the builder. Keep the historical
  // inventory immutable and pin this authorized builder revision separately.
  // article-evidence.test.ts checks four public-data goldens from pre-C0 main.
  // The rehearsal below compares before/after v2 rollback, not against main.
  const c0BuilderHash = "e2ffd5da20e4479b738ae0047e354e31523a19541c15d8ef56adee5c2cc886ce";
  for (const f of historyFixture.m4Files) expect(sha256(await Bun.file(f.path).text()), f.path)
    .toBe(f.path === "scripts/build-feed.ts" ? c0BuilderHash : f.sha256);
  const v2 = migrateToV2(audit.registry, manifest);
  const feed = EventFeed.parse({ schemaVersion: 1, generatedAt: ctx.now, events: extracted.candidates.map(r => r.event), sources: [] });
  const rollback = rollbackToV1(v2);
  expect(applyTimelineLabels(feed.events, rollback)).toEqual(applyTimelineLabels(feed.events, audit.registry));
  expect(buildTimelineQueue(feed, rollback)).toEqual(buildTimelineQueue(feed, audit.registry));
  expect(() => buildTimelineQueue(feed, v2)).toThrow();
  const empty = { schemaVersion: 1, decisions: [] };
  const accepted = acceptTimelineProposals({ schemaVersion: 1, decisions: [{ ...fp, decision: "keep_original" }] }, feed, empty);
  expect(accepted.registry.schemaVersion).toBe(1);
  expect(accepted.registry.decisions[0]).not.toHaveProperty("origin");
  expect(accepted.registry.decisions[0]).not.toHaveProperty("evidenceHashAtDecision");
  expect(buildTimelineQueue(feed, accepted.registry).events.some(e => e.eventId === event.id)).toBe(false);
  expect(evidenceRequeueEligibility(v2Decision("automated", "keep_original"), event, evidence).eligible).toBe(true);
  // The helper has no effect on the legacy queue's already-decided suppression.
  expect(buildTimelineQueue(feed, accepted.registry).events.some(e => e.eventId === event.id)).toBe(false);
});

test("offline Git adapter audits new actual bot commits and exact same-fingerprint changes in a disposable repo", async () => {
  const dir = mkdtempSync(join(tmpdir(), "editorial-origin-git-"));
  const git = (args: string[], name = BOT_NAME, email = BOT_EMAIL) => {
    const r = Bun.spawnSync(["git", ...args], { cwd: dir, env: { ...process.env, GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email } });
    expect(r.exitCode, r.stderr.toString()).toBe(0); return r.stdout.toString().trim();
  };
  try {
    git(["init", "--quiet"]); mkdirSync(join(dir, "data/presentation"), { recursive: true });
    await Bun.write(join(dir, REGISTRY_PATH), registryBytes({ schemaVersion: 1, decisions: [] }));
    git(["add", "."]); git(["commit", "--quiet", "-m", "Empty initialization"]);
    const empty = loadProvenanceInventory(dir);
    await Bun.write(join(dir, REGISTRY_PATH), registryBytes({ schemaVersion: 1, decisions: [extra] }));
    git(["add", "."]); git(["commit", "--quiet", "-m", BOT_SUBJECT]);
    const added = loadProvenanceInventory(dir);
    expect(added.manifest.records[0]!.origin).toBe("automated");
    expect(() => assertInventoryFresh(empty.manifest, added.manifest)).toThrow("inventory drift");
    await Bun.write(join(dir, MANIFEST_PATH), manifestBytes(added.manifest));
    const feed = EventFeed.parse({ schemaVersion: 1, generatedAt: ctx.now, events: [event], sources: [] });
    await Bun.write(join(dir, "public/data/events.v1.json"), JSON.stringify(feed));
    const runCLI = (mode: string) => Bun.spawnSync([process.execPath, join(root, "scripts/editorial-provenance.ts"), mode], { cwd: dir });
    const beforeV1 = await Bun.file(join(dir, REGISTRY_PATH)).text();
    const firstRun = runCLI("rehearse"); expect(firstRun.exitCode, firstRun.stderr.toString()).toBe(0);
    const preview = await Bun.file(join(dir, "tmp/editorial/provenance-e2a/registry-v2.preview.json")).text();
    const repeated = runCLI("rehearse"); expect(repeated.exitCode, repeated.stderr.toString()).toBe(0);
    expect(repeated.stdout.toString()).toBe(firstRun.stdout.toString());
    expect(await Bun.file(join(dir, "tmp/editorial/provenance-e2a/registry-v2.preview.json")).text()).toBe(preview);
    expect(await Bun.file(join(dir, "tmp/editorial/provenance-e2a/rollback-v1.json")).text()).toBe(beforeV1);
    expect(await Bun.file(join(dir, REGISTRY_PATH)).text()).toBe(beforeV1);
    expect(await Bun.file(join(dir, "public/data/events.v1.json")).text()).toBe(JSON.stringify(feed));
    expect(await Bun.file(join(dir, "data/presentation/timeline-labels.v2.json")).exists()).toBe(false);
    const inventoryRun = runCLI("inventory"); expect(inventoryRun.exitCode).toBe(0);
    expect(inventoryRun.stdout.toString()).toBe(manifestBytes(added.manifest));
    await Bun.write(join(dir, REGISTRY_PATH), registryBytes({ schemaVersion: 1, decisions: [{ ...extra, reason: "Same fingerprint changed content" }] }));
    git(["add", REGISTRY_PATH]); git(["commit", "--quiet", "-m", BOT_SUBJECT]);
    const modified = loadProvenanceInventory(dir);
    expect(modified.manifest.records[0]!.origin).toBe("legacy_unknown");
    expect(() => assertInventoryFresh(added.manifest, modified.manifest)).toThrow("inventory drift");
    const stale = runCLI("rehearse"); expect(stale.exitCode).not.toBe(0);
    expect(stale.stderr.toString()).toContain("inventory drift");
    expect(await Bun.file(join(dir, "tmp/editorial/provenance-e2a/report.json")).exists()).toBe(false);
    expect(await Bun.file(join(dir, REGISTRY_PATH)).text()).toBe(registryBytes(modified.registry));
    // Invalid refs/options and shallow histories fail closed.
    expect(() => loadProvenanceInventory(dir, "--all")).toThrow();
    const head = git(["rev-parse", "HEAD"]);
    await Bun.write(join(dir, ".git/shallow"), head + "\n");
    expect(() => loadProvenanceInventory(dir)).toThrow("full history");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("actual offline feed build and rollback rehearsal preserve every public JSON byte in a disposable checkout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "editorial-migration-build-"));
  try {
    for (const p of ["data/presentation", "public/data"]) mkdirSync(join(dir, p), { recursive: true });
    for (const p of ["fixtures", "snapshots", "data/reviewed"]) symlinkSync(join(root, p), join(dir, p));
    symlinkSync(join(root, "data/presentation/timeline-label-preferences.v1.json"), join(dir, "data/presentation/timeline-label-preferences.v1.json"));
    await Bun.write(join(dir, REGISTRY_PATH), audit.raw);
    const clock = join(dir, "clock.ts");
    await Bun.write(clock, `const Original=Date; globalThis.Date=class extends Original { constructor(v?:string|number) { super(v??${JSON.stringify(ctx.now)}); } static now() { return Original.parse(${JSON.stringify(ctx.now)}); } } as DateConstructor;`);
    const build = async () => {
      const r = Bun.spawnSync([process.execPath, "--preload", clock, join(root, "scripts/build-feed.ts")], { cwd: dir });
      expect(r.exitCode, r.stderr.toString()).toBe(0);
      return await Promise.all(["events.v1.json", "timeline-label-queue.v1.json", "timeline-label-agent-input.v1.json", "review.v1.json"].map(p => Bun.file(join(dir, "public/data", p)).text()));
    };
    const original = await build();
    const migrated = migrateToV2(audit.registry, manifest);
    await Bun.write(join(dir, "tmp/editorial/registry-v2.preview.json"), editorialRegistryBytes(migrated));
    // Explicit compatibility projection, confined to disposable input; no production reader switch.
    await Bun.write(join(dir, REGISTRY_PATH), registryBytes(rollbackToV1(migrated)));
    expect(await build()).toEqual(original);
    await Bun.write(join(dir, REGISTRY_PATH), audit.raw);
    expect(await build()).toEqual(original);
    const paths = [...new Bun.Glob("public/**/*").scanSync({ cwd: dir, onlyFiles: true })];
    expect(paths.some(p => /registry|origin|migration|provenance/.test(p))).toBe(false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("latest v2 rollback projection also preserves decisions added after a preview and protected unknown labels", () => {
  const v2 = migrateToV2(audit.registry, manifest);
  const added = { ...extra, decision: "label" as const, timelineTitle: "Newly approved label", origin: "legacy_unknown" as const };
  const withLater = EditorialRegistryV2.parse({ ...v2, decisions: [...v2.decisions, added] });
  const rolled = rollbackToV1(withLater);
  expect(rolled.decisions.at(-1)).toEqual({ ...extra, decision: "label", timelineTitle: "Newly approved label" });
  expect(rolled.decisions).toHaveLength(51);
  expect(rolled.decisions.filter(d => d.decision === "label")).toHaveLength(13);
});
