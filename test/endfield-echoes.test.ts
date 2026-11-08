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
// Historical assertions must not depend on snapshots refreshed by production.
// These independent captures are test-only, never a live-source fallback.
const html = await Bun.file("test/fixtures/endfield/illusion-2026-09-24.html").text();
const eventHtml = await Bun.file("test/fixtures/endfield/events-2026-09-24.html").text();
const phantasiaHtml = await Bun.file("test/fixtures/endfield/phantasia-2026-10-17.html").text();
const phantasiaEventHtml = await Bun.file("test/fixtures/endfield/events-2026-10-17.html").text();
const phantasiaUrl = "https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Phantasia";

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
  expect(reviewed.some(e => e.title.includes("Season of Illusion"))).toBe(false);
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

test("October Event capture discovers Phantasia with its explicit regional season ends", () => {
  const seasons = parseWikiGgEventsPage(phantasiaEventHtml, { ...ctx, sourceId: ECHOES_EVENT_SOURCE_ID,
    sourceUrl: "https://endfield.wiki.gg/wiki/Event" });
  const chosen = selectEchoesSeason(seasons, "2026-10-17T21:55:00.000Z")!;
  expect(chosen).toMatchObject({
    id: "endfield:season-of-phantasia:2026-10-15", title: "Season of Phantasia", type: "challenge",
    startsAt: "2026-10-15T04:00:00.000Z", startPrecision: "exact", endPrecision: "exact",
    regionEnds: { asia: "2026-11-05T03:59:00.000Z",
      america: "2026-11-05T16:59:00.000Z", europe: "2026-11-05T16:59:00.000Z" },
  });
  expect(echoesSeasonUrl(chosen)).toBe(phantasiaUrl);
});

test("real Phantasia page: deadline-only acceptance under the known western header slip", async () => {
  // Header: Asia 2026/10/15 12:00 (UTC+8), Americas/Europe 2026/10/15 23:00 (UTC-5) =
  // the Asia instant one day late. A second, separate error: the table's generic
  // 12:00 server-time Cycle I opening is not the official update-controlled
  // western opening (research §17.3). Neither opening is published: starts are
  // day anchors only, and only the explicit cycle ends become deadlines.
  const cycles = parseWikiGgEchoesSeason(phantasiaHtml, { ...ctx, sourceUrl: phantasiaUrl });
  expect(cycles.every(e => e.startPrecision === "day" && e.startsAt.endsWith("T00:00:00.000Z"))).toBe(true);
  const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/endfield.json").json()).events
    .filter(e => e.title.startsWith("Echoes of War: Season of Phantasia — Cycle"));
  // Same IDs and the same exact regional ends as the official infographic rows.
  expect(cycles.map(e => [e.id, e.regionEnds])).toEqual(reviewed.map(e => [e.id, e.regionEnds]));
});

test("only that exact slip is excused; every other header/table disagreement still fails", () => {
  const phantasia = { ...ctx, sourceUrl: phantasiaUrl };
  const header = "2026/10/15 23:00 – 2026/11/05 11:59 (UTC-5)";
  for (const [label, edited] of [
    ["western header one hour off the slip", phantasiaHtml.replace(header, header.replace("23:00", "22:00"))],
    ["western header two days late", phantasiaHtml.replace(header, header.replace("2026/10/15 23:00", "2026/10/16 23:00"))],
    ["Asia header disagrees with the table", phantasiaHtml.replace("2026/10/15 12:00 – 2026/11/05 11:59 (UTC+8)", "2026/10/15 13:00 – 2026/11/05 11:59 (UTC+8)")],
    ["table opens at another hour", phantasiaHtml.replace("2026/10/15 12:00 – 2026/10/22 03:59 (Server Time)", "2026/10/15 11:00 – 2026/10/22 03:59 (Server Time)")],
    ["western season end earlier than the cycles", phantasiaHtml.replace(header, header.replace("2026/11/05 11:59", "2026/10/29 03:00"))],
    ["Asia season end later than Cycle III", phantasiaHtml.replace("2026/11/05 11:59 (UTC+8)", "2026/11/06 11:59 (UTC+8)")],
    ["Asia season end earlier than Cycle III", phantasiaHtml.replace("2026/11/05 11:59 (UTC+8)", "2026/11/05 10:59 (UTC+8)")],
  ] as const) expect(() => parseWikiGgEchoesSeason(edited, phantasia), label).toThrow();
});

test("the western season end only bounds the cycles; a later one is accepted and unpublished", () => {
  // Illusion's real western header end (Oct 14 11:59 UTC-5) is a day off its table
  // (Oct 15 11:59 server time), so western end equality cannot be required. The
  // season final itself is published from the Event page, not from this parser.
  const header = "2026/10/15 23:00 – 2026/11/05 11:59 (UTC-5)";
  const later = phantasiaHtml.replace(header, header.replace("2026/11/05 11:59", "2026/11/06 11:59"));
  const base = parseWikiGgEchoesSeason(phantasiaHtml, { ...ctx, sourceUrl: phantasiaUrl });
  expect(parseWikiGgEchoesSeason(later, { ...ctx, sourceUrl: phantasiaUrl })).toEqual(base);
  expect(parseWikiGgEchoesSeason(html, ctx)).toHaveLength(2);
});

test("contradictory new season retains last-known-good bytes, metadata and broken-source health", async () => {
  const root = await mkdtemp(join(tmpdir(), "echoes-rejected-"));
  const checkedAt = "2026-10-17T21:55:00.000Z";
  try {
    const store = new SnapshotStore(root);
    await store.save(ECHOES_EVENT_SOURCE_ID, { url: "https://endfield.wiki.gg/wiki/Event",
      body: phantasiaEventHtml, at: checkedAt, etag: null, lastModified: null, eventCount: 5 });
    await store.save(ECHOES_SOURCE_ID, { url, body: html, at: now,
      etag: '"illusion"', lastModified: "Thu, 24 Sep 2026 15:00:00 GMT", eventCount: 2 });
    await store.recordCheck(ECHOES_SOURCE_ID, { at: now, status: 200, ok: true });
    const previous = (await store.read(ECHOES_SOURCE_ID))!;
    // Two preceding semantic failures; the third must still trip the existing threshold.
    for (const at of ["2026-10-16T00:00:00.000Z", "2026-10-16T12:00:00.000Z"]) {
      await store.recordCheck(ECHOES_SOURCE_ID, { at, status: 200, ok: false });
    }
    const requests: Array<{ url: string; headers: Headers }> = [];
    const summary = await runRefresh({
      adapters: [ADAPTERS.find(a => a.id === ECHOES_SOURCE_ID)!], store,
      robots: { allows: async () => ({ allowed: true, reason: "test" }) },
      fetchImpl: async (request, init) => {
        requests.push({ url: String(request), headers: new Headers(init?.headers) });
        // Still contradictory after the narrow header-slip rule: western start one hour off.
        return new Response(phantasiaHtml.replace("2026/10/15 23:00", "2026/10/15 22:00"), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
      },
      userAgent: "test", now: () => new Date(checkedAt), sleep: async () => {},
      dryRun: false, only: ECHOES_SOURCE_ID, force: false,
      timeoutMs: 5000, log: () => {}, rebuildFeed: null,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(phantasiaUrl);
    expect(requests[0]?.headers.get("If-None-Match")).toBeNull();
    expect(requests[0]?.headers.get("If-Modified-Since")).toBeNull();
    expect(summary.outcomes[0]).toMatchObject({ result: "rejected", status: 200 });
    expect(summary.changed).toBe(0);
    expect(summary.confirmed).toBe(0);
    expect(summary.broken).toEqual([{ sourceId: ECHOES_SOURCE_ID, consecutiveFailures: 3,
      lastStatus: 200, lastConfirmedAt: now }]);
    const retained = (await store.read(ECHOES_SOURCE_ID))!;
    expect(retained.html).toBe(previous.html);
    expect(retained.meta).toEqual(previous.meta);
    expect(retained.state.lastConfirmedAt).toBe(now);
    expect(retained.state.consecutiveFailures).toBe(3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
