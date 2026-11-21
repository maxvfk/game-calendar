import { describe, expect, test } from "bun:test";
import { parseKqmGinNews } from "../src/ingest/parsers/kqm-ginews.ts";
import { parseKqmHsrNews } from "../src/ingest/parsers/kqm-hsrnews.ts";
import { parseNteSteamNews } from "../src/ingest/parsers/nte-steamnews.ts";
import { parseWuwaKuroAtom, wuwaEventSections } from "../src/ingest/parsers/wuwa-kuro-atom.ts";
import { parseZzzSteamRss } from "../src/ingest/parsers/zzz-steam-rss.ts";
import { LIMITS, sanitizeEvents } from "../src/ingest/sanitize.ts";
import type { GachaEvent } from "../src/shared/schema.ts";
import { originalTimelineIdentity } from "../src/shared/timelineIdentity.ts";

const NOW = "2026-11-21T12:00:00.000Z";

function invariantDigest(events: readonly GachaEvent[]): string {
  const shape = events.map(e => ({
    id: e.id,
    title: e.title,
    type: e.type,
    startsAt: e.startsAt,
    startPrecision: e.startPrecision,
    endsAt: e.endsAt,
    endPrecision: e.endPrecision,
    regionScoped: e.regionScoped,
    regionEnds: e.regionEnds,
  }));
  return new Bun.CryptoHasher("sha256").update(JSON.stringify(shape)).digest("hex");
}

function assertCleanContext(events: readonly GachaEvent[], sourceId: string) {
  const { notes, events: sanitized } = sanitizeEvents(events, {
    sourceId,
    fallbackUrl: "https://example.test/source",
    onNote: () => {},
  });
  expect(notes).toEqual([]);
  expect(sanitized.map(e => e.id)).toEqual(events.map(e => e.id));
  for (const e of events) {
    if (e.summary !== null) {
      expect(e.summary.length).toBeGreaterThan(0);
      expect(e.summary.length).toBeLessThanOrEqual(500);
      expect(e.summary).not.toMatch(/<\/?[a-z][^>]*>|\[\/?(?:p|b|i|u|url|img)\b|!\[[^\]]*\]\(/i);
    }
  }
}

describe("PR #1 parser context — baseline ID/date/precision invariance", () => {
  // Pinned SHA-256 digests of `{id, title, type, startsAt, startPrecision, endsAt,
  // endPrecision, regionScoped, regionEnds}` verified byte-for-byte against `main` (`0b48cfa`).
  const baselineCases: Array<{
    file: string;
    count: number;
    sha256: string;
    parse: (raw: string) => GachaEvent[];
    sourceId: string;
    normalizeLf?: boolean;
  }> = [
    {
      file: "fixtures/genshin/kqm-ginews-2026-09-23.md",
      count: 10,
      sha256: "a3a586fa95c2e5dcde93a8bada3bbb81f3e4c7788b722fb22c00615e0340bae4",
      sourceId: "genshin-kqm-ginews",
      normalizeLf: true,
      parse: raw => parseKqmGinNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "genshin-kqm-ginews", game: "genshin" }),
    },
    {
      file: "test/fixtures/genshin/ginews-pre-turnover-2026-11-01.md",
      count: 13,
      sha256: "0b247e1f59334a4934f95155b7b96dedaef0033ccca993f1d0cfcb838131ebb8",
      sourceId: "genshin-kqm-ginews",
      normalizeLf: true,
      parse: raw => parseKqmGinNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "genshin-kqm-ginews", game: "genshin" }),
    },
    {
      file: "test/fixtures/genshin/expiries-2026-10-28.md",
      count: 3,
      sha256: "d0217663f09ba56d9ade5b1629de41e6dd16a980e21816996a9e50f337a9e1df",
      sourceId: "genshin-kqm-ginews",
      normalizeLf: true,
      parse: raw => parseKqmGinNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "genshin-kqm-ginews", game: "genshin" }),
    },
    {
      file: "test/fixtures/genshin/phase-ii-2026-10-22.md",
      count: 2,
      sha256: "6f96603bb67385e725c6b9b62b2941772f357fdcc2e4cfb5d50545416a7679cc",
      sourceId: "genshin-kqm-ginews",
      normalizeLf: true,
      parse: raw => parseKqmGinNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "genshin-kqm-ginews", game: "genshin" }),
    },
    {
      file: "test/fixtures/genshin/starlight-voyage-2026-10-28.md",
      count: 2,
      sha256: "f6eddb87dd5fc0bdfe065c5d4c2adeccf8a0a69035a10aad13e4ee337c27e90a",
      sourceId: "genshin-kqm-ginews",
      normalizeLf: true,
      parse: raw => parseKqmGinNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "genshin-kqm-ginews", game: "genshin" }),
    },
    {
      file: "fixtures/wuwa/kuro-mirror-2026-09-23.xml",
      count: 8,
      sha256: "15f9d6f3854fdfc2cf334109a7f84dfa2caab54b8e54d1f67bb8139c21d620ea",
      sourceId: "wuwa-kuro-mirror",
      normalizeLf: true,
      parse: raw => parseWuwaKuroAtom(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "wuwa-kuro-mirror", game: "wuwa" }),
    },
    {
      file: "test/fixtures/wuwa/evidence-2026-10-21.xml",
      count: 5,
      sha256: "664f93c54798444acf16e2ab3cf4077c572de87dcb299e837ff9897aa1736166",
      sourceId: "wuwa-kuro-mirror",
      normalizeLf: true,
      parse: raw => parseWuwaKuroAtom(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "wuwa-kuro-mirror", game: "wuwa" }),
    },
    {
      file: "test/fixtures/wuwa/kuro-mirror-2026-10-28.xml",
      count: 11,
      sha256: "6e0456b05e2c31f37ecfaa27b69d6a680a801b5b3d1ad04c3836518b08502b55",
      sourceId: "wuwa-kuro-mirror",
      normalizeLf: true,
      parse: raw => parseWuwaKuroAtom(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "wuwa-kuro-mirror", game: "wuwa" }),
    },
    {
      file: "fixtures/hsr/kqm-hsrnews-2026-09-23.md",
      count: 6,
      sha256: "14268f99863da61c17df42ee8889ec55a698728a60cf88996d31c0c3a7a739c5",
      sourceId: "hsr-kqm-hsrnews",
      normalizeLf: true,
      parse: raw => parseKqmHsrNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "hsr-kqm-hsrnews", game: "hsr" }),
    },
    {
      file: "fixtures/hsr/kqm-hsrnews-4.6-lightward-2026-10-27.md",
      count: 4,
      sha256: "7aebefdcdc366dc46ae478162aaee85ccb2d00c3fba4dd45a2ec988d4ea2f8fc",
      sourceId: "hsr-kqm-hsrnews",
      normalizeLf: true,
      parse: raw => parseKqmHsrNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "hsr-kqm-hsrnews", game: "hsr" }),
    },
    {
      file: "test/fixtures/hsr/garden-of-plenty-2026-10-30.md",
      count: 1,
      sha256: "d8fba9c62c565b49cdf1155ecff7eb2c93472b867a4dfcb36fa4b00bffd81079",
      sourceId: "hsr-kqm-hsrnews",
      normalizeLf: true,
      parse: raw => parseKqmHsrNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "hsr-kqm-hsrnews", game: "hsr" }),
    },
    {
      file: "test/fixtures/hsr/recovery-2026-10-28.md",
      count: 10,
      sha256: "5d39f46e15f07044f05467ae90332a1c9ca8c7ef01860379c9da0dd97fce987a",
      sourceId: "hsr-kqm-hsrnews",
      normalizeLf: true,
      parse: raw => parseKqmHsrNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "hsr-kqm-hsrnews", game: "hsr" }),
    },
    {
      file: "test/fixtures/zzz/steam-rss-2026-10-28.xml",
      count: 43,
      sha256: "db0424eca14e6c417b6a97dbf6f72cdd5141084ddfc52bc75c38516af416c9d4",
      sourceId: "zzz-steam-events-official",
      normalizeLf: true,
      parse: raw => parseZzzSteamRss(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "zzz-steam-events-official", game: "zzz" }),
    },
    {
      file: "test/fixtures/zzz/steam-rss-excerpts-2026-10-27.xml",
      count: 43,
      sha256: "db0424eca14e6c417b6a97dbf6f72cdd5141084ddfc52bc75c38516af416c9d4",
      sourceId: "zzz-steam-events-official",
      normalizeLf: true,
      parse: raw => parseZzzSteamRss(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "zzz-steam-events-official", game: "zzz" }),
    },
    {
      file: "fixtures/nte/steamnews-official-2026-09-22.json",
      count: 42,
      sha256: "d944c6db39e076aa6edb926a60c726a8ead7ab081804671dd8e164dc74191c15",
      sourceId: "nte-steamnews-official",
      parse: raw => parseNteSteamNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "nte-steamnews-official", game: "nte" }),
    },
    {
      file: "test/fixtures/nte/steamnews-2026-10-28.json",
      count: 54,
      sha256: "87d51beadae63284fdc24138cc7db1c154cc93b76aebe78ad485cea62bcc00ed",
      sourceId: "nte-steamnews-official",
      parse: raw => parseNteSteamNews(raw, { now: NOW, sourceUrl: "https://example.test", sourceId: "nte-steamnews-official", game: "nte" }),
    },
  ];

  test("all 16 immutable fixtures retain exact pre-PR#1 IDs, dates, precisions, and regionEnds", async () => {
    for (const c of baselineCases) {
      let raw = await Bun.file(c.file).text();
      if (c.normalizeLf) raw = raw.replace(/\r\n/g, "\n");
      const events = c.parse(raw);
      expect(events, c.file).toHaveLength(c.count);
      expect(invariantDigest(events), c.file).toBe(c.sha256);
      assertCleanContext(events, c.sourceId);
    }
  });
});

describe("PR #1 parser context — recognitionSubjects and factual summaries", () => {
  test("Genshin KQM GINews extracts featured subjects and scoped summaries without leaking shared login rewards", async () => {
    const ctx = { now: NOW, sourceUrl: "https://api.github.com/repos/KQM-git/GINews/contents/readme.md", sourceId: "genshin-kqm-ginews", game: "genshin" as const };
    const fixture = (await Bun.file("fixtures/genshin/kqm-ginews-2026-09-23.md").text()).replace(/\r\n/g, "\n");
    const fixEvents = parseKqmGinNews(fixture, ctx);
    assertCleanContext(fixEvents, ctx.sourceId);

    expect(fixEvents.find(e => e.title === "Surging Ballad")?.recognitionSubjects).toEqual(["Vodyanitsa"]);
    expect(fixEvents.find(e => e.title === "When Warm Winds Cavort")?.recognitionSubjects).toEqual(["Vesna"]);
    expect(fixEvents.find(e => e.title === "Epitome Invocation — Version 7.1 Phase I")?.recognitionSubjects)
      .toEqual(["Beyond the Chrysalis", "Hymn of the Maelstrom"]);
    expect(originalTimelineIdentity(fixEvents.find(e => e.title === "Surging Ballad")!)).toBe("Vodyanitsa");
    // Excerpt notice 21879 omits subsection prose; must not fall back to the multi-event article subtitle.
    expect(fixEvents.find(e => e.title === "Missive of Grace: A Thank-You Gift")?.summary).toBeNull();
    expect(fixEvents.find(e => e.title === "Resplendent Starlight")?.summary).toBeNull();

    // Full notice 21879 keeps Missive of Grace mail prose separate from Resplendent Starlight daily login table.
    const full = (await Bun.file("test/fixtures/genshin/ginews-pre-turnover-2026-11-01.md").text()).replace(/\r\n/g, "\n");
    const fullEvents = parseKqmGinNews(full, ctx);
    assertCleanContext(fullEvents, ctx.sourceId);
    const missive = fullEvents.find(e => e.title === "Missive of Grace: A Thank-You Gift")!;
    const starlight = fullEvents.find(e => e.title === "Resplendent Starlight")!;
    expect(missive.summary).toContain("Each mail can be collected");
    expect(missive.summary).not.toContain("Intertwined Fate");
    expect(starlight.summary).toBeNull();

    const snap = (await Bun.file("snapshots/genshin-kqm-ginews.md").text()).replace(/\r\n/g, "\n");
    const snapEvents = parseKqmGinNews(snap, ctx);
    assertCleanContext(snapEvents, ctx.sourceId);
    const furina = snapEvents.find(e => e.title === "Chanson of Many Waters");
    if (furina) expect(furina.recognitionSubjects).toEqual(["Furina"]);
    const weapon = snapEvents.find(e => e.title === "Epitome Invocation — Version 7.2 Phase I");
    if (weapon) expect(weapon.recognitionSubjects).toEqual(["Starsealed Edict", "Splendor of Tranquil Waters"]);
    const chronicled = snapEvents.find(e => e.title === "Names Forged Beneath Blazing Skies");
    if (chronicled) {
      expect(chronicled.recognitionSubjects).toBeUndefined();
      expect(chronicled.summary).toContain("Varesa");
    }
    const archon = snapEvents.find(e => e.title === "Hour of Ruin — Limited-Time Archon Quest Rewards");
    if (archon) expect(archon.summary).toContain("Archon Quest");
  });

  test("WuWa Kuro Atom extracts banner subjects and non-banner summaries identically across canonical/evidence modes", async () => {
    const ctx = { now: NOW, sourceUrl: "https://api.github.com/repos/TheLovinator1/wutheringwaves/contents/articles_latest.xml", sourceId: "wuwa-kuro-mirror", game: "wuwa" as const };
    const evidenceFixture = (await Bun.file("test/fixtures/wuwa/evidence-2026-10-21.xml").text()).replace(/\r\n/g, "\n");
    const evCanonical = parseWuwaKuroAtom(evidenceFixture, ctx);
    assertCleanContext(evCanonical, ctx.sourceId);
    expect(evCanonical.find(e => e.title === "Tomorrow in the Frame")?.recognitionSubjects).toEqual(["Lucilla"]);
    expect(evCanonical.find(e => e.title === "Undefined Spectrum")?.recognitionSubjects).toEqual(["Lynae"]);
    expect(evCanonical.find(e => e.title === "Freeze Frame")?.recognitionSubjects).toEqual(["Freeze Frame"]);
    expect(evCanonical.find(e => e.title === "Spectrum Blaster")?.recognitionSubjects).toEqual(["Spectrum Blaster"]);
    expect(originalTimelineIdentity(evCanonical.find(e => e.title === "Tomorrow in the Frame")!)).toBe("Lucilla");
    expect(evCanonical.find(e => e.title === "Echo Erase")?.summary).toContain("tapping Echo Pieces away");

    const snap = (await Bun.file("snapshots/wuwa-kuro-mirror.xml").text()).replace(/\r\n/g, "\n");
    const canonical = parseWuwaKuroAtom(snap, ctx);
    assertCleanContext(canonical, ctx.sourceId);
    const sections = wuwaEventSections(snap, ctx, true);
    for (const row of canonical) {
      expect(sections.find(s => s.event.id === row.id)?.event).toEqual(row);
    }
  });

  test("HSR KQM HSRNews stops proseSummary at ### headings and extracts standalone Event Details cleanly", async () => {
    const ctx = { now: NOW, sourceUrl: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md", sourceId: "hsr-kqm-hsrnews", game: "hsr" as const };

    // Standalone notice with ### Event Period, ### Participation Requirement, and ### Event Details
    const gardenRaw = (await Bun.file("test/fixtures/hsr/garden-of-plenty-2026-10-30.md").text()).replace(/\r\n/g, "\n");
    const gardenEvents = parseKqmHsrNews(gardenRaw, ctx);
    assertCleanContext(gardenEvents, ctx.sourceId);
    expect(gardenEvents).toHaveLength(1);
    expect(gardenEvents[0]!.summary).toContain("beat Calyx (Golden) and Calyx (Crimson) challenges to receive double rewards");
    expect(gardenEvents[0]!.summary).not.toContain("Adventure Mission");
    expect(gardenEvents[0]!.summary).not.toContain("Bud of Memories");

    // Date-only excerpts must yield null summary instead of swallowing date lines after ### Event Period / ### Start Date.
    const excerptRaw = (await Bun.file("fixtures/hsr/kqm-hsrnews-2026-09-23.md").text()).replace(/\r\n/g, "\n");
    const excerptEvents = parseKqmHsrNews(excerptRaw, ctx);
    assertCleanContext(excerptEvents, ctx.sourceId);
    expect(excerptEvents.find(e => e.title === "Realm of the Strange")?.summary).toBeNull();
    expect(excerptEvents.find(e => e.title === "Version 4.5 Nameless Honor")?.summary).toBeNull();

    const lightwardRaw = (await Bun.file("fixtures/hsr/kqm-hsrnews-4.6-lightward-2026-10-27.md").text()).replace(/\r\n/g, "\n");
    const lwEvents = parseKqmHsrNews(lightwardRaw, ctx);
    assertCleanContext(lwEvents, ctx.sourceId);
    expect(lwEvents.filter(e => e.type === "challenge").every(e => e.summary === null)).toBe(true);

    const snap = (await Bun.file("snapshots/hsr-kqm-hsrnews.md").text()).replace(/\r\n/g, "\n");
    const events = parseKqmHsrNews(snap, ctx);
    assertCleanContext(events, ctx.sourceId);
    const nh = events.find(e => e.title.includes("Nameless Honor"));
    if (nh) {
      expect(nh.summary).toContain("Nameless Honor");
      expect(nh.summary).not.toContain("**");
    }
  });

  test("ZZZ Steam RSS extracts pre-duration event blurbs cleanly", async () => {
    const ctx = { now: NOW, sourceUrl: "https://steamcommunity.com/games/4162040/rss/", sourceId: "zzz-steam-events-official", game: "zzz" as const };
    const fixRaw = (await Bun.file("test/fixtures/zzz/steam-rss-2026-10-28.xml").text()).replace(/\r\n/g, "\n");
    const fixEvents = parseZzzSteamRss(fixRaw, ctx);
    assertCleanContext(fixEvents, ctx.sourceId);
    expect(fixEvents.find(e => e.title === "Trails of the Hobbling Crow")?.summary).toContain("Nightfall, poison");
    expect(fixEvents.find(e => e.title === "The Great En-Nah Giveaway!")?.summary).toContain("Encrypted Master Tape");

    const snap = (await Bun.file("snapshots/zzz-steam-events-official.xml").text()).replace(/\r\n/g, "\n");
    assertCleanContext(parseZzzSteamRss(snap, ctx), ctx.sourceId);
  });

  test("NTE Steam News extracts board character subjects, Arc subjects, and event details", async () => {
    const ctx = { now: NOW, sourceUrl: "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/", sourceId: "nte-steamnews-official", game: "nte" as const };
    const fixRaw = await Bun.file("test/fixtures/nte/steamnews-2026-10-28.json").text();
    const events = parseNteSteamNews(fixRaw, ctx);
    assertCleanContext(events, ctx.sourceId);

    expect(events.find(e => e.title === "The Ichi-daime")?.recognitionSubjects).toEqual(["Nanally"]);
    expect(events.find(e => e.title === "The Lifeline")?.recognitionSubjects).toEqual(["Iroi"]);
    expect(events.find(e => e.title === "The Wrong Gate")?.recognitionSubjects).toEqual(["The Wrong Gate"]);
    expect(events.find(e => e.title === "Voice of the Voyager")?.recognitionSubjects).toEqual(["Voice of the Voyager"]);
    expect(originalTimelineIdentity(events.find(e => e.title === "The Ichi-daime")!)).toBe("Nanally");
    expect(events.find(e => e.title === "Volley Star")?.summary).toContain("Summer Glow");
    expect(events.find(e => e.type === "maintenance")?.summary).toBe("Scheduled maintenance; actual completion may vary.");

    const snap = await Bun.file("snapshots/nte-steamnews-official.json").text();
    assertCleanContext(parseNteSteamNews(snap, ctx), ctx.sourceId);
  });
});

describe("PR #1 review regressions — fail-safe context extraction", () => {
  test("blank or >200-char recognitionSubjects omit context instead of failing GachaEvent.parse()", async () => {
    // Genshin: blank name and 201-char name in Event Wish heading
    const ginCtx = { now: NOW, sourceUrl: "https://example.test", sourceId: "genshin-kqm-ginews", game: "genshin" as const };
    const ginFixture = (await Bun.file("fixtures/genshin/kqm-ginews-2026-09-23.md").text()).replace(/\r\n/g, "\n");
    const ginBlank = ginFixture.replace('"Lingering Siren-Song" Vodyanitsa (Hydro)', '"Lingering Siren-Song"   (Hydro)');
    const ginBlankEvents = parseKqmGinNews(ginBlank, ginCtx);
    expect(ginBlankEvents).toHaveLength(10);
    expect(ginBlankEvents.find(e => e.title === "Surging Ballad")?.recognitionSubjects).toBeUndefined();

    const longName = "X".repeat(LIMITS.title + 1);
    const ginOverlong = ginFixture.replace('"Lingering Siren-Song" Vodyanitsa (Hydro)', `"Lingering Siren-Song" ${longName} (Hydro)`);
    const ginOverlongEvents = parseKqmGinNews(ginOverlong, ginCtx);
    expect(ginOverlongEvents).toHaveLength(10);
    expect(ginOverlongEvents.find(e => e.title === "Surging Ballad")?.recognitionSubjects).toBeUndefined();

    // WuWa: blank and 201-char 5-Star Resonator subject
    const wuwaCtx = { now: NOW, sourceUrl: "https://example.test", sourceId: "wuwa-kuro-mirror", game: "wuwa" as const };
    const wuwaFixture = (await Bun.file("test/fixtures/wuwa/evidence-2026-10-21.xml").text()).replace(/\r\n/g, "\n");
    const wuwaBlank = wuwaFixture.replace("5-Star Resonator: Lucilla,", "5-Star Resonator:    ,");
    const wuwaBlankEvents = parseWuwaKuroAtom(wuwaBlank, wuwaCtx);
    expect(wuwaBlankEvents).toHaveLength(5);
    expect(wuwaBlankEvents.find(e => e.title === "Tomorrow in the Frame")?.recognitionSubjects).toBeUndefined();

    const wuwaOverlong = wuwaFixture.replace("5-Star Resonator: Lucilla,", `5-Star Resonator: ${longName},`);
    const wuwaOverlongEvents = parseWuwaKuroAtom(wuwaOverlong, wuwaCtx);
    expect(wuwaOverlongEvents).toHaveLength(5);
    expect(wuwaOverlongEvents.find(e => e.title === "Tomorrow in the Frame")?.recognitionSubjects).toBeUndefined();

    // NTE: blank and 201-char S-Class character subject
    const nteCtx = { now: NOW, sourceUrl: "https://example.test", sourceId: "nte-steamnews-official", game: "nte" as const };
    const nteFixture = await Bun.file("test/fixtures/nte/steamnews-2026-10-28.json").text();
    const nteBlank = nteFixture.replace(/S-Class character Nanally/g, "S-Class character   ");
    const nteBlankEvents = parseNteSteamNews(nteBlank, nteCtx);
    expect(nteBlankEvents).toHaveLength(54);
    expect(nteBlankEvents.find(e => e.title === "The Ichi-daime")?.recognitionSubjects).toBeUndefined();

    const nteOverlong = nteFixture.replace(/S-Class character Nanally/g, `S-Class character ${longName}`);
    const nteOverlongEvents = parseNteSteamNews(nteOverlong, nteCtx);
    expect(nteOverlongEvents).toHaveLength(54);
    expect(nteOverlongEvents.find(e => e.title === "The Ichi-daime")?.recognitionSubjects).toBeUndefined();
  });

  test("WuWa omits intro context instead of attaching a neighboring banner when heading normalization shifts lines", async () => {
    const ctx = { now: NOW, sourceUrl: "https://example.test", sourceId: "wuwa-kuro-mirror", game: "wuwa" as const };
    const raw = (await Bun.file("test/fixtures/wuwa/evidence-2026-10-21.xml").text()).replace(/\r\n/g, "\n");
    const base = parseWuwaKuroAtom(raw, ctx);
    // Insert a multiline paragraph before the first banner so `candidates` and `evidenceCandidates`
    // indices diverge, and split Tomorrow in the Frame's heading across two lines inside `<p>`.
    const mutated = raw
      .replace(
        "<p>[Tomorrow in the Frame] Featured Resonator Convene</p>",
        "<p>Intro line 1\nIntro line 2\nIntro line 3\nIntro line 4</p><p>[Tomorrow in the Frame] Featured Resonator Convene\n(Phase II)</p>",
      );
    const parsed = parseWuwaKuroAtom(mutated, ctx);
    expect(invariantDigest(parsed)).toBe(invariantDigest(base));
    const tomorrow = parsed.find(e => e.title === "Tomorrow in the Frame")!;
    expect(tomorrow.recognitionSubjects).toBeUndefined();
    expect(tomorrow.summary).toBeNull();
    // Neighboring banners remain intact and accurately attributed.
    expect(parsed.find(e => e.title === "Freeze Frame")?.recognitionSubjects).toEqual(["Freeze Frame"]);
    expect(parsed.find(e => e.title === "Undefined Spectrum")?.recognitionSubjects).toEqual(["Lynae"]);
  });
});
