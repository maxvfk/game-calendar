import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GachaEvent, eventId } from "../src/shared/schema.ts";
import { EventFeed } from "../src/shared/feed.ts";
import { asDisplayEvent, CustomEvent } from "../src/shared/custom.ts";
import { originalTimelineIdentity, timelineIdentity } from "../src/shared/timelineIdentity.ts";
import { applyTimelineLabels, buildTimelineQueue, labelDiagnostics, queueBytes, semanticFingerprint,
  TimelineRegistry, validateTimelineProposals, type TimelineDecision } from "../src/presentation/timeline-labels.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { TimelineLabelPreferences, bundleTimelineLabelAgentInput } from "../src/presentation/timeline-label-agent-input.ts";

const AT = "2026-10-25T00:00:00.000Z";
const empty = { schemaVersion: 1 as const, decisions: [] };
const base = GachaEvent.parse({
  id: "hsr:official-phase-ii:2026-10-01", game: "hsr", title: "Official · Phase II",
  recognitionSubjects: ["Alpha", "Beta"], type: "banner", summary: "Two featured characters.",
  startsAt: "2026-10-01T00:00:00Z", startPrecision: "exact",
  endsAt: "2026-10-26T00:00:00Z", endPrecision: "exact", regionScoped: false, regionEnds: null,
  sourceUrl: "https://example.test/event", sourceId: "test", status: "published", confidence: 1,
  extractionMethod: "parser", provenanceStatus: "official", version: 1, firstSeenAt: AT, updatedAt: AT,
});
const feed = (events = [base]) => EventFeed.parse({ schemaVersion: 1, generatedAt: AT, events, sources: [] });
const decision = (kind: TimelineDecision["decision"] = "label", event = base): TimelineDecision => ({
  eventId: event.id, fingerprint: semanticFingerprint(event), rulesVersion: "v1",
  ...(kind === "label" ? { decision: kind, timelineTitle: "Alpha + Beta · Phase II" }
    : kind === "needs_research" ? { decision: kind, reason: "Need sourced phase identity" } : { decision: kind }),
});
const registry = (...decisions: unknown[]) => ({ schemaVersion: 1, decisions });

describe("memory-independent editorial agent bundle", () => {
  test("includes canonical versioned naming preferences without changing the L1 queue", async () => {
    const preferences = TimelineLabelPreferences.parse(
      await Bun.file("data/presentation/timeline-label-preferences.v1.json").json(),
    );
    const queue = buildTimelineQueue(feed(), empty, AT);
    const original = JSON.stringify(queue);
    const agentInput = bundleTimelineLabelAgentInput(queue, preferences);

    expect(agentInput.schemaVersion).toBe(queue.schemaVersion);
    expect(agentInput.rulesVersion).toBe(queue.rulesVersion);
    expect(agentInput.events).toEqual(queue.events);
    expect(agentInput.counts).toEqual(queue.counts);
    expect(JSON.stringify(queue)).toBe(original);
    expect(agentInput.editorialPreferences.preferencesVersion).toBe("v1");
    expect(agentInput.editorialPreferences.operatorApprovedExamples.some(
      ex => ex.approvedLabel === "Standard Wish 5-Star Character Invitation",
    )).toBe(true);
    expect(agentInput.editorialPreferences.operatorApprovedExamples.some(
      ex => ex.approvedLabel === "Echoes of War: Season of Phantasia",
    )).toBe(true);
    expect(JSON.parse(JSON.stringify(agentInput))).toEqual(agentInput);
  });

  test("malformed guidance fails closed before publishing agent input", async () => {
    const preferences = await Bun.file("data/presentation/timeline-label-preferences.v1.json").json();
    const queue = buildTimelineQueue(feed(), empty, AT);
    expect(() => bundleTimelineLabelAgentInput(queue, { ...preferences, schemaVersion: 2 })).toThrow();
    expect(() => bundleTimelineLabelAgentInput(queue, { ...preferences, editorialPreferences: [] })).toThrow();
    expect(() => bundleTimelineLabelAgentInput(queue, { ...preferences, unknown: "from memory" })).toThrow();
  });
});

describe("Git-reviewed strict decision contract", () => {
  test("zero decisions is valid; three decision-specific shapes are valid", () => {
    expect(TimelineRegistry.parse(empty)).toEqual(empty);
    for (const kind of ["label", "keep_original", "needs_research"] as const) {
      expect(TimelineRegistry.parse(registry(decision(kind))).decisions[0]).toEqual(decision(kind));
    }
  });
  const valid = decision();
  for (const bad of [
    { ...valid, timelineTitle: undefined }, { ...valid, timelineTitle: "" },
    { ...valid, timelineTitle: " padded " }, { ...valid, timelineTitle: "a\nb" },
    { ...valid, timelineTitle: "<b>unsafe</b>" }, { ...valid, timelineTitle: "x".repeat(201) },
    { ...valid, timelineTitle: "x\u202ey" }, { ...valid, fingerprint: "sha256:EXAMPLE" },
    { ...valid, rulesVersion: "" }, { ...valid, rulesVersion: " v2" },
    { ...valid, reason: "x".repeat(301) }, { ...valid, eventId: "" },
    { ...valid, approved: true }, { ...valid, title: "forbidden fact change" },
    { ...valid, startsAt: AT }, { ...valid, decision: "unapproved" },
    { ...decision("keep_original"), timelineTitle: "not allowed" },
    { ...decision("needs_research"), timelineTitle: "not allowed" },
    { ...decision("needs_research"), reason: undefined },
  ]) test(`rejects malformed/untrusted decision ${JSON.stringify(bad)}`, () => {
    expect(TimelineRegistry.safeParse(registry(bad)).success).toBe(false);
    expect(() => applyTimelineLabels([base], registry(bad))).toThrow();
  });
  test("duplicate IDs, unknown root fields and incompatible schema fail closed", () => {
    for (const input of [registry(valid, valid), { ...empty, schemaVersion: 2 }, { ...empty, proposals: [] }, null]) {
      expect(TimelineRegistry.safeParse(input).success).toBe(false);
    }
  });
});

describe("semantic SHA256 contract", () => {
  test("pinned canonical bytes and summary whitespace normalization", () => {
    expect(semanticFingerprint(base)).toBe("sha256:9e3a655a404c4f651a12f3d80b174fb37d5d06588e104cdb8a8d03fc1e9a0c38");
    expect(semanticFingerprint({ ...base, summary: "  Two\nfeatured\tcharacters. " })).toBe(semanticFingerprint(base));
    expect(semanticFingerprint({ ...base, summary: "e\u0301" })).toBe(semanticFingerprint({ ...base, summary: "é" }));
    expect(semanticFingerprint({ ...base, summary: " " })).toBe(semanticFingerprint({ ...base, summary: null }));
  });
  test("observation, deadline, provenance and presentation do not invalidate", () => {
    expect(semanticFingerprint({ ...base, endsAt: "2026-11-01T00:00:00Z", startPrecision: "day",
      updatedAt: "2026-11-02T00:00:00Z", firstSeenAt: "2026-01-01T00:00:00Z", version: 9,
      regionScoped: true, regionEnds: { asia: AT }, sourceId: "another", sourceUrl: "https://example.test/other",
      provenanceStatus: "estimated", titleRu: "Локальное название", timelineTitle: "new copy" })).toBe(semanticFingerprint(base));
  });
  for (const patch of [{ id: "hsr:new-season:2026-11-01" }, { game: "zzz" }, { type: "challenge" },
    { title: "Official · Phase III" }, { summary: "Genuine revised description" },
    { recognitionSubjects: ["Beta", "Alpha"] }, { recognitionSubjects: undefined }]) {
    test(`semantic change invalidates: ${JSON.stringify(patch)}`, () => {
      const changed = GachaEvent.parse({ ...base, ...patch });
      expect(semanticFingerprint(changed)).not.toBe(semanticFingerprint(base));
      expect(applyTimelineLabels([changed], registry(decision()))[0]).not.toHaveProperty("timelineTitle");
      expect(buildTimelineQueue(feed([changed]), registry(decision())).events.map(e => e.eventId)).toEqual([changed.id]);
    });
  }
});

describe("final-feed application and repeat suppression", () => {
  test("empty registry keeps every fact byte-identical, including old cached feeds", () => {
    expect(applyTimelineLabels([base], empty)).toEqual([base]);
    expect(EventFeed.parse(JSON.parse(JSON.stringify(feed()))).events).toEqual([base]);
    expect(applyTimelineLabels([{ ...base, timelineTitle: "untrusted upstream suggestion" }], empty)).toEqual([base]);
  });
  test("matching approval adds only timelineTitle; canonical ID and completion association stay stable", () => {
    const [labelled] = applyTimelineLabels([base], registry(decision()));
    expect(labelled).toEqual({ ...base, timelineTitle: "Alpha + Beta · Phase II" });
    expect(eventId(labelled!.game, labelled!.title, labelled!.startsAt)).toBe(eventId(base.game, base.title, base.startsAt));
    const completions = { [base.id]: { done: true, progress: 3 } };
    expect(completions[labelled!.id]).toEqual({ done: true, progress: 3 });
    expect(timelineIdentity(labelled!)).toBe("Alpha + Beta · Phase II");
    expect(originalTimelineIdentity(labelled!)).toBe("Alpha + Beta");
  });
  test("rules version, identical refresh and deadline-only changes do not requeue", () => {
    const d = { ...decision(), rulesVersion: "old-rules" };
    for (const event of [base, { ...base, updatedAt: "2026-10-25T12:00:00Z" },
      { ...base, endsAt: "2026-11-01T00:00:00Z" }]) {
      expect(buildTimelineQueue(feed([event]), registry(d)).events).toEqual([]);
      expect(applyTimelineLabels([event], registry(d))[0]?.timelineTitle).toBeDefined();
    }
  });
  test("keep_original and needs_research add no field and suppress repeated work", () => {
    for (const kind of ["keep_original", "needs_research"] as const) {
      const input = registry(decision(kind));
      expect(applyTimelineLabels([base], input)).toEqual([base]);
      const q = buildTimelineQueue(feed(), input);
      expect(q.events).toEqual([]); expect(q.counts.remaining).toBe(0);
      expect(q.counts.needsResearch).toBe(kind === "needs_research" ? 1 : 0);
      expect(q.unresolved.length).toBe(kind === "needs_research" ? 1 : 0);
      const revised = { ...base, summary: "New reliable information" };
      expect(buildTimelineQueue(feed([revised]), input).events).toHaveLength(1);
    }
  });
  test("stale/orphaned decisions persist in Git and never fuzzy-transfer", () => {
    const stale = { ...decision(), fingerprint: `sha256:${"0".repeat(64)}` };
    const orphan = { ...decision(), eventId: "hsr:orphan:2025-01-01" };
    const input = registry(stale, orphan), before = JSON.stringify(input);
    const q = buildTimelineQueue(feed(), input);
    expect(q.counts.stale).toBe(1); expect(q.counts.orphaned).toBe(1);
    expect(q.events).toHaveLength(1); expect(JSON.stringify(input)).toBe(before);
    expect(applyTimelineLabels([base], input)).toEqual([base]);
  });
  test("application is after merge winner selection, not on near-match source IDs", () => {
    const loser = { ...base, id: "hsr:loser:2026-10-01", sourceId: "secondary", confidence: .8 };
    const winners = mergeEvents([[loser], [base]]).events;
    expect(winners.map(e => e.id)).toEqual([base.id]);
    expect(applyTimelineLabels(winners, registry(decision("label", loser)))).toEqual(winners);
    expect(applyTimelineLabels(winners, registry(decision()))[0]?.timelineTitle).toBeDefined();
  });
  test("custom events remain canonical and cannot inherit an upstream label", () => {
    const custom = asDisplayEvent(CustomEvent.parse({ ...base, id: "myevent:test123456", at: AT, repeat: null }));
    expect(timelineIdentity(custom)).toBe(base.title);
    expect(timelineIdentity({ ...custom, timelineTitle: "ignored" })).toBe(base.title);
    // DisplayEvent's null source URL cannot cross the public EventFeed boundary.
    expect(GachaEvent.safeParse(custom).success).toBe(false);
  });
});

describe("bounded public deterministic queue", () => {
  test("cap, stable order, urgency before future, bounded summary, safe allowlist", () => {
    const events: GachaEvent[] = Array.from({ length: 30 }, (_, i) => ({ ...base, id: `hsr:event-${String(i).padStart(2, "0")}`,
      startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-30T00:00:00Z", summary: "x".repeat(500) }));
    events.push({ ...base, id: "hsr:urgent", summary: "Urgent" });
    const q = buildTimelineQueue(feed(events), empty);
    expect(q.events).toHaveLength(25); expect(q.counts.remaining).toBe(6);
    expect(q.events[0]?.eventId).toBe("hsr:urgent");
    expect(q.events[1]?.summary?.length).toBe(300);
    expect(Object.keys(q.events[0]!)).not.toContain("confidence");
    expect(Object.keys(q.events[0]!)).not.toContain("updatedAt");
    expect(queueBytes(q)).toBe(queueBytes(buildTimelineQueue(feed([...events].reverse()), empty, AT)));
  });
  test("expiry respects exact/day/unknown and complete/partial regional ends", () => {
    const exact = { ...base, id: "hsr:exact", endsAt: AT };
    const day = { ...exact, id: "hsr:day", endPrecision: "day" as const };
    const unknown = { ...base, id: "hsr:unknown", endsAt: null, endPrecision: "unknown" as const };
    const regional = { ...exact, id: "hsr:regional", regionScoped: true,
      regionEnds: { asia: "2026-10-24T00:00:00Z", europe: AT, america: "2026-10-25T05:00:00Z" } };
    const partial = { ...regional, id: "hsr:partial", regionEnds: { asia: AT } };
    const q = buildTimelineQueue(feed([exact, day, unknown, regional, partial]), empty);
    expect(q.counts.historical).toBe(1);
    expect(q.events.map(e => e.eventId).sort()).toEqual([day.id, unknown.id, regional.id, partial.id].sort());
    expect(buildTimelineQueue(feed([day]), empty, "2026-10-26T23:59:59Z").events).toHaveLength(1);
    expect(buildTimelineQueue(feed([day]), empty, "2026-10-27T00:00:00Z").events).toEqual([]);
  });
  test("leak/delisted/private rows never enter queue, even in a diagnostic feed", () => {
    const events = [{ ...base, provenanceStatus: "leak" as const }, { ...base, status: "delisted" as const },
      { ...base, sourceId: "you" }, { ...base, id: "myevent:private" }];
    expect(buildTimelineQueue(feed(events), empty).counts.published).toBe(0);
  });
  test("zero queue is explicit; historical decisions survive and reapply on reintroduction", () => {
    expect(buildTimelineQueue(feed([]), empty).counts.eligible).toBe(0);
    expect(buildTimelineQueue(feed([]), registry(decision())).counts.orphaned).toBe(1);
    const historical = { ...base, endsAt: "2026-10-24T00:00:00Z" };
    const input = registry(decision("label", historical));
    expect(buildTimelineQueue(feed([historical]), input).events).toEqual([]);
    expect(applyTimelineLabels([historical], input)[0]?.timelineTitle).toBeDefined();
    expect(buildTimelineQueue(feed([historical]), empty).events).toEqual([]);
  });
  test("parked list is bounded and sorted, all unresolved counts remain visible", () => {
    const events = Array.from({ length: 30 }, (_, i) => ({ ...base, id: `hsr:parked-${i}` }));
    const q = buildTimelineQueue(feed(events), registry(...events.map(e => decision("needs_research", e))));
    expect(q.events).toEqual([]); expect(q.unresolved).toHaveLength(25);
    expect(q.counts.needsResearch).toBe(30); expect(q.counts.unresolvedRemaining).toBe(5);
  });
  test("bad clock, batch cap and duplicate final IDs fail", () => {
    expect(() => buildTimelineQueue(feed(), empty, "not-a-date")).toThrow();
    expect(() => buildTimelineQueue(feed(), empty, AT, 0)).toThrow();
    expect(() => buildTimelineQueue(feed([base, base]), empty)).toThrow();
  });
});

describe("read-only proposal acceptance seam", () => {
  test("valid label/keep/research accepted without mutating any inputs", () => {
    for (const kind of ["label", "keep_original", "needs_research"] as const) {
      const input = registry(decision(kind)), before = JSON.stringify(input);
      expect(validateTimelineProposals(input, feed(), empty).errors).toEqual([]);
      expect(JSON.stringify(input)).toBe(before);
    }
  });
  test("unknown/unqueued IDs, stale hashes, duplicates and forbidden facts fail", () => {
    for (const input of [registry({ ...decision(), eventId: "hsr:unknown" }),
      registry({ ...decision(), fingerprint: `sha256:${"0".repeat(64)}` }),
      registry(decision(), decision()), registry({ ...decision(), endsAt: AT })]) {
      expect(validateTimelineProposals(input, feed(), empty).errors.length).toBeGreaterThan(0);
    }
    expect(validateTimelineProposals(registry(decision()), feed(), registry(decision("needs_research"))).errors.length).toBeGreaterThan(0);
    const expired = { ...base, endsAt: AT };
    expect(validateTimelineProposals(registry(decision("label", expired)), feed([expired]), empty).errors.length).toBeGreaterThan(0);
  });
  test("ambiguous overlapping same-game identities fail; disjoint reruns/different games pass", () => {
    const other = { ...base, id: "hsr:second", title: "Another banner" };
    const d = { ...decision("label", other), timelineTitle: "Alpha + Beta · Phase II" };
    expect(validateTimelineProposals(registry(decision(), d), feed([base, other]), empty).errors).toHaveLength(1);
    expect(() => applyTimelineLabels([base, other], registry(decision(), d))).toThrow("ambiguous");
    expect(validateTimelineProposals(registry(decision()), feed([base, { ...other, recognitionSubjects: ["Alpha + Beta · Phase II"] }]), empty).errors).toHaveLength(1);
    for (const second of [{ ...other, game: "zzz" as const },
      { ...other, startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-30T00:00:00Z" }]) {
      expect(validateTimelineProposals(registry(decision(), { ...d, fingerprint: semanticFingerprint(second) }), feed([base, second]), empty).errors).toEqual([]);
    }
  });
  test("normalized punctuation/case confusables fail; near-prefix and lost meaning are review warnings", () => {
    const other = { ...base, id: "hsr:second", title: "Other" };
    const d = { ...decision("label", other), timelineTitle: "ALPHA BETA PHASE II" };
    expect(labelDiagnostics([base, other], TimelineRegistry.parse(registry(decision(), d))).errors).toHaveLength(1);
    const warning = validateTimelineProposals(registry({ ...decision(), timelineTitle: "Confirmed Alpha ends 12:00" }), feed(), empty);
    expect(warning.errors).toEqual([]);
    expect(warning.warnings.some(w => w.includes("Phase II"))).toBe(true);
    expect(warning.warnings.some(w => w.includes("Beta"))).toBe(true);
    expect(warning.warnings.some(w => w.includes("certainty"))).toBe(true);
    const prefix = labelDiagnostics([base, other], TimelineRegistry.parse(registry(decision(), { ...d, timelineTitle: "Alpha + Beta · Phase II extended" })));
    expect(prefix.warnings.some(w => w.includes("confusable"))).toBe(true);
  });
});

test("actual offline build includes queue, rejects malformed registry, applies synthetic approval only after final merge", async () => {
  const root = join(import.meta.dir, "..");
  const dir = mkdtempSync(join(tmpdir(), "timeline-l1-"));
  try {
    mkdirSync(join(dir, "data/presentation"), { recursive: true });
    mkdirSync(join(dir, "public/data"), { recursive: true });
    for (const path of ["fixtures", "snapshots", "data/reviewed"]) symlinkSync(join(root, path), join(dir, path));
    const path = join(dir, "data/presentation/timeline-labels.v1.json");
    const build = () => Bun.spawnSync([process.execPath, join(root, "scripts/build-feed.ts")], { cwd: dir });
    await Bun.write(path, JSON.stringify(empty));
    let run = build(); expect(run.exitCode, run.stderr.toString()).toBe(0);
    const original = EventFeed.parse(await Bun.file(join(dir, "public/data/events.v1.json")).json());
    expect(original.events.every(e => e.timelineTitle === undefined)).toBe(true);
    const generated = await Bun.file(join(dir, "public/data/timeline-label-queue.v1.json")).text();
    expect(generated).toBe(queueBytes(buildTimelineQueue(original, empty)));
    // A fixed final feed + registry + time replays to exactly the built bytes.
    for (let n = 0; n < 2; n++) expect(queueBytes(buildTimelineQueue(JSON.parse(JSON.stringify(original)), empty, original.generatedAt))).toBe(generated);
    const target = original.events.find(e => e.provenanceStatus !== "leak")!;
    const input = registry({ ...decision("label", target), timelineTitle: "Synthetic acceptance label" });
    await Bun.write(path, JSON.stringify(input));
    run = build(); expect(run.exitCode, run.stderr.toString()).toBe(0);
    const after = EventFeed.parse(await Bun.file(join(dir, "public/data/events.v1.json")).json());
    expect(after.events.map(e => e.id)).toEqual(original.events.map(e => e.id));
    expect(after.events.find(e => e.id === target.id)?.timelineTitle).toBe("Synthetic acceptance label");
    expect(after.events.find(e => e.id === target.id)?.title).toBe(target.title);
    await Bun.write(path, JSON.stringify({ ...empty, schemaVersion: 2 }));
    expect(build().exitCode).not.toBe(0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
