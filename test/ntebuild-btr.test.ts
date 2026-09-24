import { describe, expect, test } from "bun:test";
import { nteBuildBtrParser } from "../src/ingest/parsers/ntebuild-btr.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";

const raw = await Bun.file("fixtures/nte/ntebuild-btr-2026-09-22.html").text();
const ctx = { game: "nte" as const, sourceId: "nte-ntebuild-btr", sourceUrl: "https://www.ntebuild.com/events", now: "2026-09-22T00:00:00.000Z" };
const parse = (html = raw) => nteBuildBtrParser.parse(html, ctx);

describe("NTEBuild Beyond the Rails parser", () => {
  test("official exact Whisper Circle replaces the same secondary cycle without duplicates", async () => {
    const official = materializeReviewedBatch(await Bun.file("data/reviewed/nte.json").json()).events.filter((e) => e.title.startsWith("Beyond the Rails"));
    const merged = mergeEvents([official, parse()]);
    expect(merged.events).toHaveLength(3);
    expect(merged.events.find((e) => e.title.includes("Whisper Circle"))).toEqual(official[0]!);
    expect(merged.events.filter((e) => e.provenanceStatus === "estimated")).toHaveLength(2);
    expect(merged.conflicts).toEqual([]);
  });
  test("reads sourced cycles with the documented 05:00 UTC+8 boundaries", () => {
    expect(nteBuildBtrParser.canParse(raw)).toBe(true);
    expect(parse()).toMatchObject([
      { id: "nte:beyond-the-rails-rotation-sep-10:2026-09-10", title: "Beyond the Rails — Rotation (Sep 10)", startsAt: "2026-09-09T21:00:00.000Z", endsAt: "2026-09-23T20:59:00.000Z", startPrecision: "exact", endPrecision: "exact" },
      { id: "nte:beyond-the-rails-rotation-sep-24:2026-09-24", title: "Beyond the Rails — Rotation (Sep 24)", startsAt: "2026-09-23T21:00:00.000Z", endsAt: "2026-10-07T20:59:00.000Z", startPrecision: "exact", endPrecision: "exact" },
      { id: "nte:beyond-the-rails-sunset-circle:2026-10-08", title: "Beyond the Rails: Sunset Circle", startsAt: "2026-10-07T21:00:00.000Z", endsAt: "2026-10-21T20:59:00.000Z", startPrecision: "exact", endPrecision: "exact" },
    ]);
    expect(parse().every((event) => event.type === "challenge" && event.confidence === 0.7 && event.provenanceStatus === "estimated")).toBe(true);
    expect(parse().every((event) => event.sourceUrl === ctx.sourceUrl && event.regionScoped === false)).toBe(true);
    expect(parse().some((event) => event.startsAt <= "2026-09-23T23:30:00.000Z" && event.endsAt! > "2026-09-23T23:30:00.000Z")).toBe(true);
  });

  test("does not parse other NTE events", () => {
    expect(parse().every((event) => event.title.startsWith("Beyond the Rails"))).toBe(true);
    expect(parse()).toHaveLength(3);
  });

  test("rejects malformed structure and BtR dates", () => {
    expect(nteBuildBtrParser.canParse("<html></html>")).toBe(false);
    expect(() => parse(raw.replace("2026-09-10", "2026-02-30"))).toThrow();
    expect(() => parse(raw.replace('"@type":"ItemList"', '"@type":"Thing"'))).toThrow();
    expect(() => parse(raw.replace('"startDate":"2026-09-10"', '"startDate":"2026-09-10T04:00:00Z"'))).toThrow();
    expect(() => parse(raw.replace('"endDate":"2026-10-08"', '"endDate":"2026-10-09"'))).toThrow("conflicts with recurrence");
  });

  test("keeps an actually missing end unknown", () => {
    const missing = raw.replace(',"endDate":"2026-09-24"', "");
    const event = parse(missing).find((candidate) => candidate.title === "Beyond the Rails — Rotation (Sep 10)")!;
    expect(event).toMatchObject({ endsAt: null, endPrecision: "unknown" });
  });

  test("deduplicates identical IDs and rejects conflicting duplicate dates", () => {
    const graph = [...raw.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)][1]![1]!;
    const parsed = JSON.parse(graph);
    const list = parsed["@graph"].find((node: { [key: string]: unknown }) => node["@type"] === "ItemList");
    const first = list.itemListElement.find((entry: { item: { name: string } }) => entry.item.name === "Beyond the Rails — Rotation (Sep 10)");
    list.itemListElement.push(JSON.parse(JSON.stringify(first)));
    const duplicate = raw.replace(graph, JSON.stringify(parsed));
    expect(parse(duplicate)).toHaveLength(3);
    first.item.endDate = "2026-09-25";
    expect(() => parse(raw.replace(graph, JSON.stringify(parsed)))).toThrow("conflicts with recurrence");
  });
});
