import { expect, test } from "bun:test";
import { adapterById } from "../src/ingest/adapters/index.ts";
import { parseWuwaKuroAtom } from "../src/ingest/parsers/wuwa-kuro-atom.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";

const ctx = { now: "2026-09-23T12:00:00.000Z", sourceUrl: "https://api.github.com/repos/TheLovinator1/wutheringwaves/contents/articles_latest.xml",
  sourceId: "wuwa-kuro-mirror", game: "wuwa" as const };
const raw = await Bun.file("fixtures/wuwa/kuro-mirror-2026-09-23.xml").text();

test("WuWa factual Atom fixture separates event windows and server end clocks", () => {
  const events = parseWuwaKuroAtom(raw, ctx);
  expect(events).toHaveLength(8);
  const get = (title: string) => events.find(e => e.title === title)!;
  expect(get("Resonance Sim Realm")).toMatchObject({
    startsAt: "2026-08-22T00:00:00.000Z", endsAt: "2026-09-29T03:59:00.000Z",
    regionEnds: { asia: "2026-09-29T03:59:00.000Z", europe: "2026-09-29T10:59:00.000Z", america: "2026-09-29T16:59:00.000Z" },
  });
  expect(get("If Dreams Still Reverberate").endsAt).toBe("2026-09-28T19:59:00.000Z");
  expect(get("Gifts of Drifting Mist")).toMatchObject({
    startsAt: "2026-08-20T00:00:00.000Z", startPrecision: "day", type: "login",
    endsAt: "2026-09-28T19:59:00.000Z",
  });
  expect(get("Thousand Futures Mirrored in Snow").type).toBe("banner");
  expect(get("Frostburn").sourceUrl).toBe("https://wutheringwaves.kurogames.com/en/main/news/detail/5431");
  expect(events.every(e => e.provenanceStatus === undefined)).toBe(true);
  expect(events.some(e => /Maintenance|3\.7/.test(e.title))).toBe(false);
});

test("relative start needs the update's date; duplicate correction needs review", () => {
  const noUpdate = raw.replace("Maintenance Time: 2026-08-20 04:00 - 2026-08-20 11:00 (UTC+8)", "Maintenance completion unknown");
  expect(parseWuwaKuroAtom(noUpdate, ctx).some(e => e.title === "Gifts of Drifting Mist")).toBe(false);
  const duplicate = raw.replace("2026-09-29 11:59 (server time)</li>", "2026-09-30 11:59 (server time)</li>");
  expect(() => parseWuwaKuroAtom(duplicate, ctx)).toThrow("conflicting duplicate");
  expect(() => parseWuwaKuroAtom("<feed/>", ctx)).toThrow("namespace missing");
});

test("WuWa reviewed IDs and source URLs survive merge", async () => {
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/wuwa.json").json()).events;
  const auto = adapterById(ctx.sourceId)!.parse(raw, ctx);
  const merged = mergeEvents([reviewed, auto]);
  expect(merged.conflicts).toHaveLength(0);
  expect(merged.events.map(e => e.id).sort()).toEqual(reviewed.map(e => e.id).sort());
  for (const event of merged.events) {
    expect(event.sourceUrl).toBe(reviewed.find(e => e.id === event.id)!.sourceUrl);
  }
});
