import { expect, test } from "bun:test";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { parseKqmGinNews } from "../src/ingest/parsers/kqm-ginews.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";

const ctx = {
  now: "2026-09-23T12:00:00.000Z", sourceUrl: "https://api.github.com/repos/KQM-git/GINews/contents/readme.md",
  sourceId: "genshin-kqm-ginews", game: "genshin" as const,
};
const raw = await Bun.file("fixtures/genshin/kqm-ginews-2026-09-23.md").text();

test("factual notice fixture yields distinct banners, login windows and gameplay periods", () => {
  const events = parseKqmGinNews(raw, ctx);
  expect(events).toHaveLength(10);
  const get = (title: string) => events.find(e => e.title === title)!;
  expect(get("Silverwing in Pursuit of the Moon")).toMatchObject({
    startsAt: "2026-09-24T00:00:00.000Z", endsAt: "2026-10-12T00:00:00.000Z",
    startPrecision: "day", endPrecision: "day", type: "story",
  });
  expect(get("Missive of Grace: A Thank-You Gift")).toMatchObject({
    startsAt: "2026-09-28T00:00:00.000Z", endsAt: null, endPrecision: "unknown", type: "login",
  });
  expect(get("Resplendent Starlight").endsAt).toBe("2026-10-19T00:00:00.000Z");
  expect(get("Epitome Invocation — Version 7.1 Phase I").type).toBe("banner");
  expect(get("Moontrace — Version 7.1 Battle Pass").endsAt).toBe("2026-11-02T00:00:00.000Z");
  expect(get("When Warm Winds Cavort").sourceUrl).toEndWith("/archive/21876.md");
  expect(events.every(e => e.provenanceStatus === undefined)).toBe(true);
  expect(events.every(e => e.startPrecision === "day" && e.endPrecision !== "exact")).toBe(true);
  expect(events.some(e => e.title.includes("Godforsaken"))).toBe(false); // 7.0 update day absent
});

test("year and after-update date require the same archive's explicit context", () => {
  const withoutSchedule = raw.replace(/^Update maintenance begins.*$/m, "Update maintenance begins after maintenance.");
  const events = parseKqmGinNews(withoutSchedule, ctx);
  expect(events.some(e => e.title === "When Warm Winds Cavort")).toBe(false);
  expect(events.some(e => e.title === "Silverwing in Pursuit of the Moon")).toBe(true);
  const yearless = raw.replace(/2026\/09\/24 10:00/, "09/24 10:00");
  expect(() => parseKqmGinNews(yearless, ctx)).toThrow("malformed gameplay phase dates");
});

test("duplicate notice agrees or fails on conflicting boundaries", () => {
  const article = raw.split("\n-----\n").find(s => s.includes("archive/21886.md"))!;
  expect(parseKqmGinNews(`${raw}\n${article}`, ctx)).toHaveLength(10);
  const conflicting = article.replace("2026/10/12 03:59", "2026/10/13 03:59");
  expect(() => parseKqmGinNews(`${raw}\n${conflicting}`, ctx)).toThrow("conflicting duplicate");
  expect(() => parseKqmGinNews("# empty notice", ctx)).toThrow("headings missing");
});

test("merge retains all published Genshin IDs and reviewed canonical URLs", async () => {
  const { events: reviewed } = materializeReviewedBatch(await Bun.file("data/reviewed/genshin.json").json());
  const automatic = adapterById(ctx.sourceId)!.parse(raw, ctx);
  const merged = mergeEvents([reviewed, automatic]);
  expect(merged.conflicts).toHaveLength(0);
  expect(merged.events).toHaveLength(reviewed.length);
  expect(merged.events.map(e => e.id).sort()).toEqual(reviewed.map(e => e.id).sort());
  for (const event of merged.events) {
    const original = reviewed.find(e => e.id === event.id)!;
    expect(event.sourceUrl).toBe(original.sourceUrl);
  }
});
