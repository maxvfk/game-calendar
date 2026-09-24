import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { ECHOES_EVENT_SOURCE_ID, ECHOES_SOURCE_ID, echoesSeasonUrl, selectEchoesSeason } from "../src/ingest/echoes-season.ts";
import { parseWikiGgEventsPage } from "../src/ingest/parsers/wikigg.ts";
import { parseWikiGgEchoesSeason } from "../src/ingest/parsers/wikigg-echoes.ts";
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";
import { runRefresh } from "../scripts/refresh-sources.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const now = "2026-09-24T15:00:00.000Z";
const url = "https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Illusion";
const ctx = { now, game: "endfield" as const, sourceId: ECHOES_SOURCE_ID, sourceUrl: url };
const html = await Bun.file("snapshots/endfield-wikigg-echoes.html").text();
const eventHtml = await Bun.file("snapshots/endfield-wikigg-events.html").text();

test("Event page discovers the newer active Echoes season during a regional overlap", () => {
  const seasons = parseWikiGgEventsPage(eventHtml, { ...ctx, sourceId: ECHOES_EVENT_SOURCE_ID,
    sourceUrl: "https://endfield.wiki.gg/wiki/Event" });
  const chosen = selectEchoesSeason(seasons, now)!;
  expect(chosen.title).toBe("Season of Illusion");
  expect(chosen.type).toBe("challenge");
  expect(chosen.id).toBe("endfield:season-of-illusion:2026-09-24");
  expect(echoesSeasonUrl(chosen)).toBe(url);
  expect(selectEchoesSeason(seasons, "2026-12-01T00:00:00.000Z")).toBeNull();
});

test("real season snapshot yields the old IDs and explicit regional cycle deadlines", async () => {
  const cycles = parseWikiGgEchoesSeason(html, ctx);
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events;
  expect(reviewed.some(e => e.title.includes("Cycle I") || e.title.includes("Cycle II"))).toBe(false);
  expect(cycles.map(e => e.id)).toEqual([
    "endfield:echoes-of-war-season-of-illusion-cycle-i:2026-09-24",
    "endfield:echoes-of-war-season-of-illusion-cycle-ii:2026-10-01",
  ]);
  expect(cycles.map(e => e.regionEnds)).toEqual([
    { asia: "2026-09-30T19:59:00.000Z", america: "2026-10-01T08:59:00.000Z", europe: "2026-10-01T08:59:00.000Z" },
    { asia: "2026-10-07T19:59:00.000Z", america: "2026-10-08T08:59:00.000Z", europe: "2026-10-08T08:59:00.000Z" },
  ]);
  expect(cycles.every(e => e.type === "challenge" && e.startPrecision === "day" && e.endPrecision === "exact" && e.sourceUrl === url)).toBe(true);
  expect(cycles.some(e => e.title.endsWith("Cycle III"))).toBe(false);
});

test("missing, malformed, duplicate and out-of-season tables fail without projected dates", () => {
  expect(() => parseWikiGgEchoesSeason(html.replace('id="Season_Cycles">Season Cycles</span></h2>', 'id="Other">Other</span></h2>'), ctx)).toThrow();
  expect(() => parseWikiGgEchoesSeason(html.replace("2026/10/01 03:59 (Server Time)", "unknown"), ctx)).toThrow();
  expect(() => parseWikiGgEchoesSeason(html.replace("Cycle of Illusion II", "Cycle of Illusion I"), ctx)).toThrow();
  expect(() => parseWikiGgEchoesSeason(html.replace("2026/10/08 03:59 (Server Time)", "2026/11/08 03:59 (Server Time)"), ctx)).toThrow();
  expect(() => parseWikiGgEchoesSeason(html, { ...ctx, sourceUrl: "https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Virtuality" })).toThrow();
});

test("refresh follows the discovered season and does not reuse another season’s validators", async () => {
  const root = await mkdtemp(join(tmpdir(), "echoes-refresh-"));
  try {
    const store = new SnapshotStore(root);
    await store.save(ECHOES_EVENT_SOURCE_ID, { url: "https://endfield.wiki.gg/wiki/Event", body: eventHtml,
      at: now, etag: null, lastModified: null, eventCount: 10 });
    await store.save(ECHOES_SOURCE_ID, { url: "https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Virtuality",
      body: "old season", at: now, etag: '"old"', lastModified: null, eventCount: 2 });
    await store.recordCheck(ECHOES_SOURCE_ID, { at: now, status: 200, ok: true });
    const requests: Array<{ url: string; headers: Headers }> = [];
    const summary = await runRefresh({
      adapters: [ADAPTERS.find(a => a.id === ECHOES_SOURCE_ID)!], store,
      robots: { allows: async () => ({ allowed: true, reason: "test" }) },
      fetchImpl: async (request, init) => {
        requests.push({ url: String(request), headers: new Headers(init?.headers) });
        return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
      },
      userAgent: "test", now: () => new Date(now), sleep: async () => {},
      dryRun: false, only: ECHOES_SOURCE_ID, force: false,
      timeoutMs: 5000, log: () => {}, rebuildFeed: null,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(url);
    expect(requests[0]?.headers.get("If-None-Match")).toBeNull();
    expect(summary.outcomes[0]?.result).toBe("fetched");
    expect((await store.read(ECHOES_SOURCE_ID))?.meta.url).toBe(url);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
