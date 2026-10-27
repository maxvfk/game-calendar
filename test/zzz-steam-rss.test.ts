import { describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ADAPTERS, adapterById } from "../src/ingest/adapters/index.ts";
import { discoverZzzSteamPosts, parseZzzSteamRss, ZZZ_STEAM_RSS_URL, zzzSteamRssParser } from "../src/ingest/parsers/zzz-steam-rss.ts";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { mergeEvents } from "../src/ingest/merge.ts";
import { RobotsCache } from "../src/ingest/robots.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";
import { DEFAULT_USER_AGENT, runRefresh } from "../scripts/refresh-sources.ts";
import { usesDocumentedSteamApi } from "../src/ingest/steam-api.ts";

const raw = await Bun.file("test/fixtures/zzz/steam-rss-excerpts-2026-10-27.xml").text();
const now = "2026-10-27T00:00:00.000Z";
const ctx = { now, game: "zzz" as const, sourceId: "zzz-steam-events-official", sourceUrl: ZZZ_STEAM_RSS_URL };
const adapter = adapterById(ctx.sourceId)!;
const parse = (xml = raw) => adapter.parse(xml, ctx);
const events = parse();
const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json()).events;
const items = [...raw.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[0]);
const wrap = (posts: string[]) => raw.replace(/<item>[\s\S]*<\/item>/, posts.join("\n"));
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const futureItem = (body = [
  "Below is the updated content and compensation for Version 3.4.",
  "[Update Start Time]", "2026/12/02 06:00 (UTC+8)",
  "Version 3.4 will run for 42 days, ending on 2027/01/13 06:00 (UTC+8).",
  "6. New Events", "• A Newly Published Event", "Event Duration: After the Version 3.4 update – 2027/01/10 03:59 (server time)",
  "7. New Gameplay",
].join("<br>"), id = "999999999999999999") => `<item>
<title>Version 3.4 &quot;Synthetic regression notice&quot; Update Announcement</title>
<description>${escape(body)}</description><link><![CDATA[https://steamcommunity.com/games/4162040/announcements/detail/${id}]]></link>
<pubDate>Tue, 01 Dec 2026 00:00:00 +0000</pubDate><author>Overtimeboo</author>
<guid isPermaLink="true">https://steamcommunity.com/games/4162040/announcements/detail/${id}</guid></item>`;

// Bodies are excerpted factual fields from the real runner capture, not invented period fixtures.
describe("ZZZ official Steam captured RSS", () => {
  test("publisher feed discovery, four distinct version notices and exact attribution", () => {
    const posts = discoverZzzSteamPosts(raw);
    expect(posts).toHaveLength(10);
    expect(posts.filter(p => p.title.endsWith("Update Announcement"))).toHaveLength(4);
    expect(posts[0]).toMatchObject({ author: "Overtimeboo", publishedAt: "2026-10-20T23:00:24.000Z",
      url: "https://steamcommunity.com/games/4162040/announcements/detail/652616887841064662" });
    expect(posts.find(p => p.title.startsWith("Version 3.1"))?.author).toBe("shijie.hong");
    expect(events).toHaveLength(43);
    expect(new Set(events.map(e => e.id)).size).toBe(43);
    expect(events.filter(e => e.startsAt >= "2026-10-21")).toHaveLength(8);
    expect(events.filter(e => e.startsAt >= "2026-09-09" && e.startsAt < "2026-10-21")).toHaveLength(11);
    expect(events.every(e => e.sourceId === ctx.sourceId && e.provenanceStatus === "official" &&
      e.firstSeenAt === now && e.updatedAt === now && posts.some(p => p.url === e.sourceUrl))).toBe(true);
  });

  test("exact current IDs/periods merge to one reviewed winner each; all 30 reviewed rows survive verbatim", () => {
    const overlap = events.filter(e => reviewed.some(r => r.id === e.id));
    expect(overlap).toHaveLength(19);
    for (const e of overlap) {
      const r = reviewed.find(r => r.id === e.id)!;
      for (const key of ["title", "startsAt", "endsAt", "startPrecision", "endPrecision", "regionScoped", "regionEnds"] as const) {
        expect(e[key]).toEqual(r[key]);
      }
    }
    for (const groups of [[reviewed, events], [events, reviewed]]) {
      const merged = mergeEvents(groups);
      expect(merged.conflicts).toEqual([]);
      expect(merged.events).toHaveLength(54);
      expect(merged.events.filter(e => e.sourceId === ctx.sourceId)).toHaveLength(24);
      expect(new Set(merged.events.map(e => e.id)).size).toBe(54);
      for (const r of reviewed) expect(merged.events.find(e => e.id === r.id)).toEqual(r);
      expect(merged.events.filter(e => e.endsAt! > now)).toHaveLength(14);
    }
  });

  test("server clocks remain regional, after-update starts remain day; explicit version end is global", () => {
    expect(events.find(e => e.id === "zzz:spooky-funhouse-tales:2026-10-22")).toMatchObject({
      startsAt: "2026-10-22T00:00:00.000Z", startPrecision: "day", endPrecision: "exact", regionScoped: true,
      regionEnds: { asia: "2026-11-29T19:59:00.000Z", europe: "2026-11-30T02:59:00.000Z", america: "2026-11-30T08:59:00.000Z" },
    });
    expect(events.find(e => e.id === "zzz:all-new-program:2026-10-21")).toMatchObject({
      startsAt: "2026-10-21T00:00:00.000Z", startPrecision: "day",
    });
    expect(events.find(e => e.title === "Potential Hypothesis: Reforged in Fire")).toMatchObject({
      startsAt: "2026-09-09T00:00:00.000Z", startPrecision: "day", endsAt: "2026-10-20T22:00:00.000Z",
      regionScoped: false, regionEnds: null,
    });
    expect(events.some(e => /Return to Ridu|Audition|Shiyu|Deadly|Phase|Into the Flames of Life/.test(e.title))).toBe(false);
    expect(events.some(e => e.type === "banner" || e.type === "maintenance")).toBe(false);
  });

  test("new version discovery has no hard-coded article IDs or date/year from the wall clock", () => {
    const post = futureItem();
    const next = parse(wrap([post, ...items]));
    expect(next).toHaveLength(44);
    expect(next.find(e => e.title === "A Newly Published Event")).toMatchObject({
      id: "zzz:a-newly-published-event:2026-12-02", startsAt: "2026-12-02T00:00:00.000Z", startPrecision: "day",
      endsAt: "2027-01-09T19:59:00.000Z", sourceUrl: "https://steamcommunity.com/games/4162040/announcements/detail/999999999999999999",
    });
    expect(parseZzzSteamRss(wrap([post]), { ...ctx, now: "2030-01-01T00:00:00.000Z" })[0]?.startsAt).toBe("2026-12-02T00:00:00.000Z");
    expect(parse(wrap([...items].reverse()))).toEqual(events);
  });

  test("only version-update New Events sections count; unrelated body periods cannot leak across sections", () => {
    const xml = wrap([futureItem().replace(escape("7. New Gameplay"), escape("7. New Gameplay<br>• Fake Channel<br>Event Duration: 2026/12/02 10:00 (server time) – 2026/12/20 03:59 (server time)"))]);
    expect(parse(xml).map(e => e.title)).toEqual(["A Newly Published Event"]);
    expect(parse(wrap([futureItem().replace(" Update Announcement</title>", " Special Program Announcement</title>")]))).toEqual([]);
    const excluded = futureItem().replace("A Newly Published Event", "The Final Callback - Audition Stage");
    expect(parse(wrap([excluded]))).toEqual([]);
  });
});

describe("ZZZ strict source boundaries", () => {
  test("malformed envelopes, wrong app/language and unrelated publication URLs fail closed", () => {
    for (const broken of ["<html>challenge</html>", raw.slice(0, -30), raw.replaceAll("4162040", "4508340"),
      raw.replace("<language>en-us</language>", "<language>zh-cn</language>"), raw.replace("<rss ", '<!DOCTYPE rss [<!ENTITY x "bad">]><rss '),
      raw.replace("https://steamcommunity.com/games/4162040/announcements/detail/652616887841064662", "https://example.test/notice"),
      wrap([items[0]!, items[0]!]), raw.replace("<item>", '<item attr="unsupported">')]) {
      expect(zzzSteamRssParser.canParse(broken)).toBe(false);
      expect(() => parse(broken)).toThrow();
    }
    expect(zzzSteamRssParser.statesNoEvents).toBeUndefined();
  });

  test("recognized notices cannot silently borrow dates, years or maintenance completion", () => {
    const post = futureItem();
    for (const broken of [
      post.replace("2027/01/10 03:59", "2027/02/30 03:59"), post.replace("2027/01/10 03:59", "2027/01/10 24:00"),
      post.replace("2027/01/10", "01/10"), post.replace("2027/01/10 03:59 (server time)", "TBA"),
      post.replace("After the Version 3.4 update", "After the Version 3.3 update"),
      post.replace("2027/01/10 03:59 (server time)", "2026/01/10 03:59 (server time)"),
      post.replace("2027/01/10 03:59 (server time)", "End of Version 3.4").replace("ending on", "ends around"),
      post.replace("6. New Events", "6. New Event Template"), post.replace("7. New Gameplay", "No closing section"),
      post.replace("Event Duration:", "Expected period:"),
      post.replace("Event Duration:", "Event Duration: a broken duplicate&lt;br&gt;Event Duration:"),
      post.replace("for Version 3.4.", "for Version 3.3."),
      post.replace("for Version 3.4.", "for Version 3.40."),
      post.replace("Version 3.4 &quot;Synthetic", "Zenless Zone Zero Version 3.4 &quot;Synthetic"),
    ]) expect(() => parse(wrap([broken, ...items]))).toThrow();
  });

  test("duplicate official corrections conflict; byte-equivalent repeats are deterministic", () => {
    const post = futureItem();
    const same = post.replaceAll("999999999999999999", "999999999999999998");
    const changed = same.replace("2027/01/10", "2027/01/11");
    expect(parse(wrap([post, same]))).toHaveLength(1);
    expect(parse(wrap([same, post]))).toEqual(parse(wrap([post, same])));
    for (const posts of [[post, changed], [changed, post]]) expect(() => parse(wrap(posts))).toThrow("conflicting official event identity");
  });
});

async function refreshHarness(run: (h: {
  store: SnapshotStore; cycle: (body: string, status?: number, advance?: number) => ReturnType<typeof runRefresh>;
  requests: Array<{ url: string; headers: Headers }>;
}) => Promise<void>, robotsText = "User-agent: *\nDisallow: /actions/\nDisallow: /linkfilter/\n") {
  const root = await mkdtemp(join(tmpdir(), "zzz-steam-refresh-"));
  const store = new SnapshotStore(root);
  const requests: Array<{ url: string; headers: Headers }> = [];
  let time = Date.parse(now), responseBody = raw, responseStatus = 200;
  const fetchImpl = async (url: string, init?: RequestInit) => {
    requests.push({ url, headers: new Headers(init?.headers) });
    if (url.endsWith("/robots.txt")) return new Response(robotsText);
    return new Response(responseStatus === 304 ? null : responseBody, { status: responseStatus, headers: {
      "Content-Type": "text/xml;charset=UTF-8", "Last-Modified": "Tue, 27 Oct 2026 00:00:00 GMT",
    } });
  };
  const robots = new RobotsCache({ userAgent: DEFAULT_USER_AGENT, fetchImpl, now: () => time });
  try {
    await run({ store, requests, cycle(body, status = 200, advance = 7 * 3_600_000) {
      time += advance; responseBody = body; responseStatus = status;
      return runRefresh({ adapters: [adapter], store, robots, fetchImpl, userAgent: DEFAULT_USER_AGENT,
        now: () => new Date(time), sleep: async () => {}, dryRun: false, only: adapter.id, force: false,
        timeoutMs: 1000, log: () => {}, rebuildFeed: null });
    } });
  } finally { await rm(root, { recursive: true, force: true }); }
}

describe("ZZZ real adapter uses existing refresh safeguards", () => {
  test("ordinary robots, six-hour floor, XML accept and conditional 304", async () => {
    expect(ADAPTERS.filter(a => a.game === "zzz").map(a => a.id)).toEqual([ctx.sourceId]);
    expect(ADAPTERS.some(a => a.id === "zzz-game8-events")).toBe(false);
    expect(usesDocumentedSteamApi(adapter)).toBe(false);
    await refreshHarness(async ({ cycle, store, requests }) => {
      const first = await cycle(raw, 200, 0);
      expect(first.outcomes[0]).toMatchObject({ result: "fetched", eventCount: 43, status: 200 });
      expect(requests.map(r => r.url)).toEqual(["https://steamcommunity.com/robots.txt", ZZZ_STEAM_RSS_URL]);
      expect(requests[1]!.headers.get("User-Agent")).toBe(DEFAULT_USER_AGENT);
      expect(requests[1]!.headers.get("Accept")).toContain("application/rss+xml");
      expect((await cycle(raw, 200, 3_600_000)).outcomes[0]?.result).toBe("skipped_interval");
      expect(requests).toHaveLength(2);
      expect((await cycle("", 304)).outcomes[0]?.result).toBe("unchanged");
      expect(requests.at(-1)!.headers.get("If-Modified-Since")).toBe("Tue, 27 Oct 2026 00:00:00 GMT");
      expect((await store.read(adapter.id))?.html).toBe(raw);
    });
  });

  test("outage, zero, recognized partial drift and sharp live drop all retain LKG bytes/IDs", async () => {
    await refreshHarness(async ({ cycle, store }) => {
      await cycle(raw, 200, 0);
      const original = await store.read(adapter.id);
      const pastOnly = items.filter(i => i.includes("Version 3.0") && i.includes("Update Announcement</title>"));
      const zero = wrap(items.filter(i => !i.includes("Update Announcement</title>")));
      for (const [body, status] of [["Unavailable", 503], [zero, 200], ["<rss/>", 200],
        [wrap(pastOnly), 200], [wrap([futureItem().replace("6. New Events", "Unknown section"), ...items]), 200]] as const) {
        const summary = await cycle(body, status);
        expect(["failed", "rejected"]).toContain(summary.outcomes[0]!.result);
        expect((await store.read(adapter.id))?.html).toBe(original!.html);
        expect(parse((await store.read(adapter.id))!.html)).toEqual(events);
      }
      expect((await store.readState(adapter.id)).consecutiveFailures).toBe(5);
      expect((await cycle(raw)).outcomes[0]?.result).toBe("unchanged");
      expect((await store.readState(adapter.id)).consecutiveFailures).toBe(0);
    });
  });

  test("missing PR-scoped state cache cannot cause an early first main refresh", async () => {
    await refreshHarness(async ({ cycle, store, requests }) => {
      await cycle(raw, 200, 0);
      await rm(store.statePath(adapter.id));
      const count = requests.length;
      const skipped = await cycle(raw, 200, 3_600_000);
      expect(skipped.outcomes[0]?.result).toBe("skipped_interval");
      expect(skipped.outcomes[0]?.note).toContain("2026-10-27T06:00:00.000Z");
      expect(requests).toHaveLength(count);
      // The persisted metadata is not relabelled as a fresh network confirmation.
      expect((await store.readMeta(adapter.id))?.lastConfirmedAt).toBe(now);
      expect((await store.readState(adapter.id)).lastCheckedAt).toBeNull();
      expect((await cycle(raw)).outcomes[0]?.result).toBe("unchanged");
    });
  });

  test("cache bootstrap does not mask a missing body or URL change", async () => {
    await refreshHarness(async ({ cycle, store }) => {
      await cycle(raw, 200, 0);
      await rm(store.statePath(adapter.id));
      await rm(store.bodyPath(adapter.id, "xml"));
      expect((await cycle(raw, 200, 3_600_000)).outcomes[0]?.result).toBe("fetched");
      await rm(store.statePath(adapter.id));
      const meta = (await store.readMeta(adapter.id))!;
      await Bun.write(store.metaPath(adapter.id), JSON.stringify({ ...meta, url: "https://example.test/old-source" }));
      expect((await cycle(raw, 200, 3_600_000)).outcomes[0]?.result).toBe("unchanged");
      expect((await store.readState(adapter.id)).lastConfirmedAt).toBe("2026-10-27T02:00:00.000Z");
      expect((await store.readMeta(adapter.id))?.url).toBe(adapter.url);
    });
  });

  test("robots refusal never fetches source or fabricates a snapshot", async () => {
    await refreshHarness(async ({ cycle, requests, store }) => {
      expect((await cycle(raw)).outcomes[0]?.result).toBe("skipped_robots");
      expect(requests.map(r => r.url)).toEqual(["https://steamcommunity.com/robots.txt"]);
      expect(await store.read(adapter.id)).toBeNull();
    }, "User-agent: *\nDisallow: /games/4162040/\n");
  });
});


test("actual offline full feed preserves unrelated events/conflicts and every reviewed winner", async () => {
  const root = join(import.meta.dir, "..");
  const dir = await mkdtemp(join(tmpdir(), "zzz-feed-replay-"));
  try {
    await mkdir(join(dir, "data"));
    for (const path of ["fixtures", "data/reviewed", "data/presentation"]) await symlink(join(root, path), join(dir, path));
    await cp(join(root, "snapshots"), join(dir, "snapshots"), { recursive: true });
    for (const suffix of ["xml", "meta.json", "state.json"]) await rm(join(dir, "snapshots", `${adapter.id}.${suffix}`), { force: true });
    const clock = join(dir, "clock.ts");
    await Bun.write(clock, `const Original=Date; globalThis.Date=class extends Original { constructor(v?:string|number) { super(v??${JSON.stringify(now)}); } static now() { return Original.parse(${JSON.stringify(now)}); } } as DateConstructor;`);
    const build = async () => {
      const r = Bun.spawnSync([process.execPath, "--preload", clock, join(root, "scripts/build-feed.ts")], {
        cwd: dir, env: { ...process.env, SNAPSHOT_DIR: join(dir, "snapshots") },
      });
      expect(r.exitCode, r.stderr.toString()).toBe(0);
      return await Bun.file(join(dir, "public/data/events.v1.json")).json();
    };
    const before = await build();
    const store = new SnapshotStore(join(dir, "snapshots"));
    await store.save(adapter.id, { contentKind: "xml", url: adapter.url, body: raw, at: now,
      eventCount: 43, etag: null, lastModified: null });
    const after = await build();
    type Row = { game: string; id: string; sourceId: string };
    expect(after.events.filter((e: Row) => e.game !== "zzz")).toEqual(before.events.filter((e: Row) => e.game !== "zzz"));
    expect(after.sources.filter((s: Row) => s.sourceId !== adapter.id)).toEqual(before.sources.filter((s: Row) => s.sourceId !== adapter.id));
    expect(after.dateConflicts).toEqual(before.dateConflicts);
    expect(after.events.length).toBe(before.events.length + 24);
    // The independently enabled endgame generator is present in both builds.
    expect(after.events.filter((e: Row) => e.game === "zzz")).toHaveLength(before.events.filter((e: Row) => e.game === "zzz").length + 24);
    expect(after.sources.find((s: Row) => s.sourceId === adapter.id)).toMatchObject({ parsedCount: 43, eventCount: 43 });
    for (const row of before.events.filter((e: Row) => e.game === "zzz")) {
      expect(after.events.find((e: Row) => e.id === row.id)).toEqual(row);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
