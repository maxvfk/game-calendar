import { expect, test } from "bun:test";
import { parseKqmGinNews } from "../src/ingest/parsers/kqm-ginews.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { Region } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { assertExactBoundary } from "./helpers/verified-records.tsx";
const ctx = { now: "2026-10-28T12:00:00.000Z", game: "genshin" as const,
  sourceId: "genshin-kqm-ginews", sourceUrl: "https://api.github.com/repos/KQM-git/GINews/contents/readme.md" };
const raw = await Bun.file("test/fixtures/genshin/expiries-2026-10-28.md").text();
const parsed = parseKqmGinNews(raw, ctx);
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/genshin.json").json()).events;
const weaponId = "genshin:epitome-invocation-azurelight-and-symphonist-of-scents:2026-10-13";
const ids = [weaponId, "genshin:overflowing-favor:2026-10-26", "genshin:carefree-snowball-fight:2026-10-21"];
const ends = { asia: "2026-11-01T19:59:00.000Z", europe: "2026-11-02T02:59:00.000Z", america: "2026-11-02T08:59:00.000Z" };
const weaponEnds = { asia: "2026-11-03T06:59:00.000Z", europe: "2026-11-03T13:59:00.000Z", america: "2026-11-03T19:59:00.000Z" };

test("real stored notices yield two exact regional expiries and one separately identified weapon channel", async () => {
  expect(parsed.map(e => e.id).sort()).toEqual([...ids].sort());
  const snapshot = parseKqmGinNews(await Bun.file("snapshots/genshin-kqm-ginews.md").text(), ctx);
  expect(snapshot.filter(e => ids.includes(e.id))).toEqual(parsed);
  for (const e of parsed) {
    expect(e.startPrecision).toBe("day");
    expect(e.regionEnds).toEqual(e.id === weaponId ? weaponEnds : ends);
    expect(e.endPrecision).toBe("exact");
    expect(e.provenanceStatus).toBeUndefined();
  }
  const weapon = parsed.find(e => e.id === weaponId)!;
  expect(weapon.recognitionSubjects).toEqual(["Azurelight", "Symphonist of Scents"]);
  expect(weapon.type).toBe("banner");
  expect(weapon.title).not.toContain("Version"); // source does not state a standalone version/phase identity
  expect(reviewed.filter(e => e.id === "genshin:epitome-invocation-version-7-1-phase-i:2026-09-23")).toHaveLength(1);
});

test("reviewed winners retain old completion IDs/discovery and survive incomplete source or rolling notice removal", async () => {
  const full = parseKqmGinNews(await Bun.file("snapshots/genshin-kqm-ginews.md").text(), ctx);
  const selected = reviewed.filter(e => ids.includes(e.id));
  expect(selected).toHaveLength(3);
  for (const groups of [[reviewed, full], [full, reviewed], [reviewed, full, parsed]]) {
    const result = mergeEvents(groups);
    expect(result.conflicts).toEqual([]);
    for (const e of selected) expect(result.events.find(p => p.id === e.id)).toEqual(e);
    expect(result.events.filter(e => e.id === weaponId)).toHaveLength(1);
  }
  const final = mergeEvents([reviewed, full]);
  expect(mergeEvents([reviewed, full.filter(e => !ids.includes(e.id))]).events).toEqual(final.events);
  expect(selected.find(e => e.id.includes("carefree"))!.firstSeenAt).toBe("2026-09-23T00:08:13.000Z");
  expect(selected.find(e => e.id.includes("overflowing"))!.firstSeenAt).toBe("2026-10-28T10:59:09.977Z");
  for (const e of selected) expect(e).toMatchObject({ provenanceStatus: "official", extractionMethod: "manual", confidence: 1 });
});

test("all three source deadlines expire precisely per region and never become upcoming after expiry", () => {
  for (const e of reviewed.filter(e => ids.includes(e.id))) for (const region of Region.options) {
    assertExactBoundary(e, region, (e.id === weaponId ? weaponEnds : ends)[region]);
    const clock = clockFor(e, region, Date.parse(e.regionEnds![region]!) + 1);
    expect(clock.ended).toBe(true); expect(clock.upcoming).toBe(false);
  }
});

test("known duration/table contracts reject partial/global/invalid periods and unapproved weapon fields", () => {
  for (const malformed of [raw.replace("2026/11/02 03:59", "11/02 03:59"),
    raw.replaceAll('class="t_lc"', 'class="t_gl"'), raw.replace("2026/11/02 03:59", "2026/11/32 03:59"),
    raw.replace("2026/11/02 03:59", "2026/10/01 03:59"), raw.replace("〓Event Duration〓", "〓Unknown Duration〓"),
    raw.replace("| Azurelight (Sword)  Symphonist of Scents (Polearm)", "| Other (Sword)  Symphonist of Scents (Polearm)")]) {
    expect(() => parseKqmGinNews(malformed, ctx)).toThrow();
  }
  const future = parseKqmGinNews(raw.replaceAll("2026/", "2027/").replaceAll("21890", "99990"), ctx);
  expect(future).toHaveLength(3);
  expect(future.every(e => e.id.endsWith(e.startsAt.slice(0, 10)) && e.startsAt.startsWith("2027-"))).toBe(true);
  expect(future.find(e => e.type === "banner")!.sourceUrl).toEndWith("/99990.md");
  expect(() => parseKqmGinNews(`${raw}\n${raw.replaceAll("2026/11/02 03:59", "2026/11/02 04:00")}`, ctx)).toThrow("conflicting duplicate");
});
