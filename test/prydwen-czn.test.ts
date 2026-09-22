import { expect, test } from "bun:test";
import { prydwenCznParser } from "../src/ingest/parsers/prydwen-czn.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";

const html = await Bun.file("fixtures/czn/prydwen-banners-2026-09-22.html").text();
const ctx = { game: "czn" as const, sourceId: "czn-prydwen-banners", sourceUrl: "https://www.prydwen.gg/chaos-zero-nightmare/banners", now: "2026-09-22T00:00:00.000Z" };
const parse = (raw = html) => prydwenCznParser.parse(raw, ctx);

test("real Actions HTML emits banners only at day precision", () => {
  expect(prydwenCznParser.canParse(html)).toBe(true);
  const events = parse();
  expect(events).toHaveLength(5);
  expect(events.every((e) => e.type === "banner" && e.startPrecision === "day" && e.provenanceStatus === "estimated")).toBe(true);
  expect(events.find((e) => e.title === "Olga Rate-Up Rescue")).toMatchObject({ startsAt: "2026-09-09T00:00:00.000Z", endsAt: "2026-09-30T00:00:00.000Z", endPrecision: "day" });
  expect(events.find((e) => e.title === "Sereniel Rate-Up Rescue")).toMatchObject({ startsAt: "2026-09-30T00:00:00.000Z", endsAt: null, endPrecision: "unknown" });
  expect(events.find((e) => e.title === "Peko Rate-Up Rescue")?.endsAt).toBeNull();
});
test("official reviewed banners preserve ID, STOVE URL, and exact boundaries", async () => {
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/czn.json").json()).events;
  const parsed = parse();
  const merged = mergeEvents([reviewed, parsed]);
  expect(merged.conflicts).toEqual([]);
  for (const e of reviewed.filter((e) => e.type === "banner")) {
    expect(parsed.some((p) => p.id === e.id)).toBe(true);
    expect(merged.events.find((m) => m.id === e.id)).toEqual(e);
  }
  expect(merged.events.filter((e) => e.type === "banner" && /Narja|Gaya/.test(e.title))).toHaveLength(1);
});
test("unknown templates and malformed or mismatched ranges fail", () => {
  expect(prydwenCznParser.canParse("<html>Loading...</html>")).toBe(false);
  expect(() => parse("<html>Loading...</html>")).toThrow();
  const changeFirstCard = (range: string) => html.replace(/<article\b[^>]*data-banner-card="true"[\s\S]*?<\/article>/,
    (card) => card.replace('data-range-global="Sep 22, 2026 – Oct 13, 2026"', `data-range-global="${range}"`));
  expect(() => parse(changeFirstCard("TBA"))).toThrow();
  expect(() => parse(changeFirstCard("Sep 23, 2026 – Oct 13, 2026"))).toThrow("Narja/Gaya periods disagree");
});
