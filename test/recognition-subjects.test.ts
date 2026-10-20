import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { GachaEvent, eventId } from "../src/shared/schema.ts";
import { EventFeed, SCHEMA_VERSION } from "../src/shared/feed.ts";
import { asDisplayEvent, CustomEvent } from "../src/shared/custom.ts";
import { materializeReviewedBatch, ReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";

const AT = "2026-09-23T00:00:00.000Z";
const row = {
  title: "A Marketing Title", type: "banner", summary: null,
  startsAt: AT, startPrecision: "day", endsAt: null, endPrecision: "unknown",
  regionScoped: false, regionEnds: null,
  sourceUrl: "https://example.test/notice", provenanceStatus: "official", confidence: 1,
};
const batch = { schemaVersion: 1, game: "genshin", reviewedAt: AT,
  reviewedBy: "test", events: [row] };
function materialize(extra: Record<string, unknown> = {}) {
  return materializeReviewedBatch({ ...batch, events: [{ ...row, ...extra }] }).events[0]!;
}
const legacy = materialize();
const wire = (events: GachaEvent[]) => ({ schemaVersion: SCHEMA_VERSION,
  generatedAt: AT, events, sources: [] });

describe("recognition subjects contract", () => {
  test("omitted metadata stays absent; title is required and never parsed for subjects", () => {
    expect(GachaEvent.parse(legacy)).toEqual(legacy);
    expect(legacy).not.toHaveProperty("recognitionSubjects");
    expect(legacy.title).toBe(row.title);
    const { title: _title, ...withoutTitle } = legacy;
    expect(GachaEvent.safeParse({ ...withoutTitle, recognitionSubjects: ["Vesna"] }).success).toBe(false);
  });

  for (const subjects of [["Vesna"], ["Vesna", "Vodyanitsa"], ["Crimson Thirst"],
    ["Beyond the Chrysalis", "Hymn of the Maelstrom"], ["Ёж", "雪"]]) {
    test(`preserves reviewed → canonical → merge → JSON/feed subjects ${JSON.stringify(subjects)}`, () => {
      const reviewed = materialize({ recognitionSubjects: subjects });
      const automatic = { ...legacy, sourceId: "automatic-test", confidence: 0.8 };
      const merged = mergeEvents([[automatic], [reviewed]]);
      expect(merged.conflicts).toEqual([]);
      const parsed = EventFeed.parse(JSON.parse(JSON.stringify(wire(merged.events))));
      expect(parsed.events[0]?.recognitionSubjects).toEqual(subjects);
      expect(parsed.events[0]).toEqual({ ...legacy, recognitionSubjects: subjects });
    });
  }

  for (const invalid of [[], [""], ["   "], ["\t\n"], ["Vesna", ""],
    ["Vesna", "   "], [null], [7], "Vesna", null, {}, ["x".repeat(201)]]) {
    test(`rejects invalid present metadata in both contracts: ${JSON.stringify(invalid)}`, () => {
      expect(ReviewedBatch.safeParse({ ...batch,
        events: [{ ...row, recognitionSubjects: invalid }] }).success).toBe(false);
      expect(GachaEvent.safeParse({ ...legacy, recognitionSubjects: invalid }).success).toBe(false);
    });
  }

  test("old nonempty v1 feed round-trips without adding metadata or changing IDs", () => {
    const old = wire([legacy]);
    const parsed = EventFeed.parse(JSON.parse(JSON.stringify(old)));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.events).toEqual(old.events);
    expect(parsed.events[0]).not.toHaveProperty("recognitionSubjects");
  });

  test("metadata addition, reordering and removal preserve derived and explicit IDs", () => {
    expect(legacy.id).toBe("genshin:a-marketing-title:2026-09-23");
    for (const extra of [{}, { id: "genshin:existing-published-id:2026-09-23" }]) {
      const before = materialize(extra);
      for (const subjects of [["Vesna"], ["Vesna", "Vodyanitsa"], ["Vodyanitsa", "Vesna"]]) {
        expect(materialize({ ...extra, recognitionSubjects: subjects }))
          .toEqual({ ...before, recognitionSubjects: subjects });
      }
      expect(materialize(extra)).toEqual(before);
    }
    expect(eventId(legacy.game, legacy.title, legacy.startsAt)).toBe(legacy.id);
  });

  test("legacy custom events project without metadata or ID migration", () => {
    const custom = CustomEvent.parse({ ...row, id: "myevent:abcdef1234",
      game: "mygame:example", at: AT, updatedAt: AT });
    const display = asDisplayEvent(custom);
    expect(display.id).toBe(custom.id);
    expect(display.title).toBe(custom.title);
    expect(display).not.toHaveProperty("recognitionSubjects");
    expect(display.endsAt).toBeNull();
  });
});

test("current offline feed build retains representative reviewed subjects and all legacy event values", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const directory = mkdtempSync(join(tmpdir(), "recognition-feed-"));
  try {
    for (const path of ["data", "fixtures", "snapshots"]) symlinkSync(join(root, path), join(directory, path));
    mkdirSync(join(directory, "public/data"), { recursive: true });
    const result = Bun.spawnSync([process.execPath, "run", join(root, "scripts/build-feed.ts")], {
      cwd: directory, env: { ...process.env, SNAPSHOT_DIR: join(directory, "snapshots") },
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const feed = EventFeed.parse(await Bun.file(join(directory, "public/data/events.v1.json")).json());
    const input = await Bun.file(join(root, "data/reviewed/genshin.json")).json();
    const before = materializeReviewedBatch({ ...input, events: input.events.map(
      ({ recognitionSubjects: _subjects, ...event }: Record<string, unknown>) => event,
    ) }).events;
    const after = materializeReviewedBatch(input).events;
    expect(after.filter(e => e.recognitionSubjects !== undefined).map(e => [e.title, e.recognitionSubjects]))
      .toEqual([
        ["When Warm Winds Cavort", ["Vesna"]],
        ["Epitome Invocation — Version 7.1 Phase I", ["Beyond the Chrysalis", "Hymn of the Maelstrom"]],
      ]);
    for (const [index, event] of after.entries()) {
      const { recognitionSubjects: subjects, ...rest } = event;
      expect(rest).toEqual(before[index]!);
      const published = feed.events.find(e => e.id === event.id);
      expect(published).toBeDefined();
      expect(published?.recognitionSubjects).toEqual(subjects);
    }
    const ordinary = feed.events.find(e => e.title === "A Rekviem for the Underworld — Limited-Time Archon Quest Rewards");
    expect(ordinary).toBeDefined();
    expect(ordinary).not.toHaveProperty("recognitionSubjects");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
