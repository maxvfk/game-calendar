import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { parseWikiGgEventsPage } from "../src/ingest/parsers/wikigg.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";

const batch = await Bun.file("data/reviewed/endfield.json").json();
const reviewed = materializeReviewedBatch(batch).events;
const ids = ["rejuvenation:2026-10-15", "seal-of-jade-issue:2026-10-15",
  "ancestral-spring-flows-anew:2026-10-29", "tender-sprig-issue:2026-10-29", "contingency-readiness:2026-10-29"].map(s => `endfield:${s}`);
const current = reviewed.filter(e => ids.includes(e.id));
const find = (slug: string) => current.find(e => e.id.startsWith(`endfield:${slug}:`))!;

test("official channels remain distinct, with day openings and no synthetic maintenance or issue expiry", () => {
  expect(current.map(e => e.id)).toEqual(ids);
  for (const e of current) {
    expect(e).toMatchObject({ startPrecision: "day", sourceId: "reviewed-endfield",
      extractionMethod: "manual", provenanceStatus: "official", confidence: 1 });
    expect(e.firstSeenAt).toBe(e.updatedAt);
    expect(e.updatedAt > batch.reviewedAt).toBe(true);
  }
  expect(find("rejuvenation").recognitionSubjects).toEqual(["Si"]);
  expect(find("ancestral-spring-flows-anew").recognitionSubjects).toEqual(["Tangtang"]);
  expect(find("tender-sprig-issue").recognitionSubjects).toEqual(["Brigand's Calling"]);
  const issue = find("seal-of-jade-issue");
  expect(issue).toMatchObject({ endsAt: null, endPrecision: "unknown", regionEnds: null, regionScoped: false,
    recognitionSubjects: ["Jade Vessel"] });
  for (const region of Region.options) expect(clockFor(issue, region, Date.parse("2026-11-05T18:00:00Z")).ended).toBe(false);
});

test("Endfield western server clocks stay UTC-5 across DST; exact expiry is historical at every cutoff", () => {
  for (const [slug, asia, west] of [
    ["rejuvenation", "2026-11-05T03:59:00.000Z", "2026-11-05T16:59:00.000Z"],
    ["ancestral-spring-flows-anew", "2026-11-19T03:59:00.000Z", "2026-11-19T16:59:00.000Z"],
    ["tender-sprig-issue", "2026-11-19T03:59:00.000Z", "2026-11-19T16:59:00.000Z"],
    ["contingency-readiness", "2026-11-04T20:00:00.000Z", "2026-11-05T09:00:00.000Z"],
  ] as const) {
    const e = find(slug);
    expect(e.regionEnds).toEqual({ asia, europe: west, america: west });
    for (const region of Region.options) assertExactBoundary(e, region, region === "asia" ? asia! : west!);
    const now = Date.parse(asia!) + 1;
    expect(clockFor(e, "asia", now).ended).toBe(true);
    expect(clockFor(e, "asia", now).upcoming).toBe(false);
    expect(clockFor(e, "europe", now).live).toBe(true);
  }
});

test("healthy event-only wiki cannot discover banners; reviewed rescue preserves all existing winners and priority", async () => {
  const wiki = parseWikiGgEventsPage(await Bun.file("snapshots/endfield-wikigg-events.html").text(), {
    game: "endfield", sourceId: "endfield-wikigg-events", sourceUrl: "https://endfield.wiki.gg/wiki/Event", now: "2026-10-28T12:00:00.000Z" });
  expect(wiki).toHaveLength(8);
  expect(wiki.some(e => ids.includes(e.id))).toBe(false);
  const baseline = mergeEvents([wiki, reviewed.filter(e => !ids.includes(e.id))]);
  for (const groups of [[wiki, reviewed], [reviewed, wiki], [wiki, reviewed, current]]) {
    const result = mergeEvents(groups);
    expect(result.events.filter(e => ids.includes(e.id))).toHaveLength(5);
    for (const e of current) expect(result.events.find(m => m.id === e.id)).toEqual(e);
    expect(result.events.filter(e => !ids.includes(e.id))).toEqual(baseline.events);
    expect(result.conflicts).toEqual(baseline.conflicts);
  }
});
