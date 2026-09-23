import { expect, test } from "bun:test";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { parseKqmHsrNews } from "../src/ingest/parsers/kqm-hsrnews.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";

const ctx = {
  now: "2026-09-23T12:00:00.000Z", sourceUrl: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md",
  sourceId: "hsr-kqm-hsrnews", game: "hsr" as const,
};
const raw = await Bun.file("fixtures/hsr/kqm-hsrnews-2026-09-23.md").text();

test("HSR source respects each global/server boundary independently", () => {
  const events = parseKqmHsrNews(raw, ctx);
  expect(events).toHaveLength(6);
  const get = (name: string) => events.find(e => e.title === name)!;
  expect(get("Minuscule Great Adventure")).toMatchObject({
    startsAt: "2026-09-12T00:00:00.000Z", startPrecision: "day",
    endsAt: "2026-09-27T19:59:00.000Z", endPrecision: "exact", regionScoped: false,
  });
  expect(get("Overdrive: Whirlwind Grand Prix").startsAt).toBe("2026-08-26T00:00:00.000Z");
  expect(get("Realm of the Strange").sourceUrl).toEndWith("/archive/1392.md");
  expect(get("Apocalyptic Shadow: Celestial Lupine").regionEnds).toEqual({
    asia: "2026-10-04T19:59:00.000Z", europe: "2026-10-05T02:59:00.000Z",
    america: "2026-10-05T08:59:00.000Z",
  });
  expect(get("Pure Fiction: Domain Genesis").regionScoped).toBe(true);
  expect(get("Version 4.5 Nameless Honor").endsAt).toBe("2026-09-27T19:59:00.000Z");
  expect(events.every(e => e.provenanceStatus === undefined)).toBe(true);
  expect(events.some(e => /Gift of Odyssey|4\.6/.test(e.title))).toBe(false);
});

test("missing update schedule cannot turn after-update into a guessed time", () => {
  const changed = raw.replace(/^Begins at 2026\/08\/26.*$/m, "Update takes approximately five hours.");
  const events = parseKqmHsrNews(changed, ctx);
  expect(events.some(e => e.title === "Overdrive: Whirlwind Grand Prix")).toBe(false);
  expect(events.some(e => e.title === "Minuscule Great Adventure")).toBe(true);
  expect(() => parseKqmHsrNews("# [No dated item](archive/42.md)", ctx)).toThrow("no dated calendar notices");
});

test("duplicate conflicting exact ends halt extraction", () => {
  const article = raw.split("\n-----\n").find(s => s.includes("archive/1392.md"))!;
  expect(parseKqmHsrNews(`${raw}\n${article}`, ctx)).toHaveLength(6);
  expect(() => parseKqmHsrNews(`${raw}\n${article.replace("2026/09/28 03:59:00", "2026/09/28 04:00:00")}`, ctx))
    .toThrow("conflicting duplicate");
});

test("reviewed HSR canonical identity and source remain in merged feed", async () => {
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/hsr.json").json()).events;
  const auto = adapterById(ctx.sourceId)!.parse(raw, ctx);
  const merged = mergeEvents([reviewed, auto]);
  expect(merged.conflicts).toHaveLength(0);
  expect(merged.events.map(e => e.id).sort()).toEqual(reviewed.map(e => e.id).sort());
  for (const event of merged.events) {
    expect(event.sourceUrl).toBe(reviewed.find(e => e.id === event.id)!.sourceUrl);
  }
});
