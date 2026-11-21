import { describe, expect, test } from "bun:test";
import { parseKqmGinNews } from "../src/ingest/parsers/kqm-ginews.ts";
import { parseKqmHsrNews } from "../src/ingest/parsers/kqm-hsrnews.ts";
import { parseNteSteamNews } from "../src/ingest/parsers/nte-steamnews.ts";
import { parseWuwaKuroAtom, wuwaEventSections } from "../src/ingest/parsers/wuwa-kuro-atom.ts";
import { parseZzzSteamRss } from "../src/ingest/parsers/zzz-steam-rss.ts";
import { sanitizeEvents } from "../src/ingest/sanitize.ts";
import { originalTimelineIdentity } from "../src/shared/timelineIdentity.ts";

const NOW = "2026-11-21T12:00:00.000Z";

function assertCleanContext(events: ReturnType<typeof parseKqmGinNews>, sourceId: string) {
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

describe("PR #1 parser context — recognitionSubjects and factual summaries", () => {
  test("Genshin KQM GINews extracts featured subjects, summaries, and preserves exact IDs/dates", async () => {
    const fixture = (await Bun.file("fixtures/genshin/kqm-ginews-2026-09-23.md").text()).replace(/\r\n/g, "\n");
    const ctx = { now: NOW, sourceUrl: "https://api.github.com/repos/KQM-git/GINews/contents/readme.md", sourceId: "genshin-kqm-ginews", game: "genshin" as const };
    const fixEvents = parseKqmGinNews(fixture, ctx);
    assertCleanContext(fixEvents, ctx.sourceId);

    expect(fixEvents.find(e => e.title === "Surging Ballad")?.recognitionSubjects).toEqual(["Vodyanitsa"]);
    expect(fixEvents.find(e => e.title === "When Warm Winds Cavort")?.recognitionSubjects).toEqual(["Vesna"]);
    expect(fixEvents.find(e => e.title === "Epitome Invocation — Version 7.1 Phase I")?.recognitionSubjects)
      .toEqual(["Beyond the Chrysalis", "Hymn of the Maelstrom"]);
    expect(originalTimelineIdentity(fixEvents.find(e => e.title === "Surging Ballad")!)).toBe("Vodyanitsa");
    expect(fixEvents.find(e => e.title === "Resplendent Starlight")?.summary).toContain("Primogems");

    const snap = (await Bun.file("snapshots/genshin-kqm-ginews.md").text()).replace(/\r\n/g, "\n");
    const snapEvents = parseKqmGinNews(snap, ctx);
    assertCleanContext(snapEvents, ctx.sourceId);
    expect(snapEvents.find(e => e.title === "Chanson of Many Waters")?.recognitionSubjects).toEqual(["Furina"]);
    expect(snapEvents.find(e => e.title === "Harmonious Abundance")?.recognitionSubjects).toEqual(["Zibai"]);
    expect(snapEvents.find(e => e.title === "Myriad Patterns Unfold")?.recognitionSubjects).toEqual(["Mitya"]);
    expect(snapEvents.find(e => e.title === "Ya-hoho! Compendium")?.recognitionSubjects).toEqual(["Linnea"]);
    expect(snapEvents.find(e => e.title === "Epitome Invocation — Version 7.2 Phase I")?.recognitionSubjects)
      .toEqual(["Starsealed Edict", "Splendor of Tranquil Waters"]);
    expect(snapEvents.find(e => e.title === "Names Forged Beneath Blazing Skies")?.recognitionSubjects).toBeUndefined();
    expect(snapEvents.find(e => e.title === "Names Forged Beneath Blazing Skies")?.summary).toContain("Varesa");
    expect(snapEvents.find(e => e.title === "Stress Block Smashing Project")?.summary).toContain("Diggytron");
    expect(snapEvents.find(e => e.title === "Hour of Ruin — Limited-Time Archon Quest Rewards")?.summary).toContain("Archon Quest");
  });

  test("WuWa Kuro Atom extracts banner subjects and non-banner summaries identically across canonical/evidence modes", async () => {
    const snap = (await Bun.file("snapshots/wuwa-kuro-mirror.xml").text()).replace(/\r\n/g, "\n");
    const ctx = { now: NOW, sourceUrl: "https://api.github.com/repos/TheLovinator1/wutheringwaves/contents/articles_latest.xml", sourceId: "wuwa-kuro-mirror", game: "wuwa" as const };
    const canonical = parseWuwaKuroAtom(snap, ctx);
    assertCleanContext(canonical, ctx.sourceId);

    const sections = wuwaEventSections(snap, ctx, true);
    for (const row of canonical) {
      expect(sections.find(s => s.event.id === row.id)?.event).toEqual(row);
    }

    expect(canonical.find(e => e.title === "When the Runes Glitter")?.recognitionSubjects).toEqual(["Sigrika"]);
    expect(canonical.find(e => e.title === "Wanderer Knows No Far and Near")?.recognitionSubjects).toEqual(["Qiuyuan"]);
    expect(canonical.find(e => e.title === "Tomorrow in the Frame")?.recognitionSubjects).toEqual(["Lucilla"]);
    expect(canonical.find(e => e.title === "Undefined Spectrum")?.recognitionSubjects).toEqual(["Lynae"]);
    expect(canonical.find(e => e.title === "Solsworn Ciphers")?.recognitionSubjects).toEqual(["Solsworn Ciphers"]);
    expect(canonical.find(e => e.title === "Emerald Sentence")?.recognitionSubjects).toEqual(["Emerald Sentence"]);
    expect(originalTimelineIdentity(canonical.find(e => e.title === "When the Runes Glitter")!)).toBe("Sigrika");
    expect(canonical.find(e => e.title === "Lahai-Roi Blocks: Turnabout")?.summary).toContain("rotate feature");
    expect(canonical.find(e => e.title === "Dreamfield Odyssey")?.summary).toContain("Desolate Dreamfield");
  });

  test("HSR KQM HSRNews extracts factual summaries for events/Nameless Honor and preserves Lightward/Park", async () => {
    const snap = (await Bun.file("snapshots/hsr-kqm-hsrnews.md").text()).replace(/\r\n/g, "\n");
    const ctx = { now: NOW, sourceUrl: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md", sourceId: "hsr-kqm-hsrnews", game: "hsr" as const };
    const events = parseKqmHsrNews(snap, ctx);
    assertCleanContext(events, ctx.sourceId);

    const nh = events.find(e => e.title.includes("Nameless Honor"))!;
    expect(nh.summary).toContain("Nameless Honor");
    expect(nh.summary).not.toContain("**");
    expect(events.find(e => e.title === "Relic Recon")?.summary).toContain("collection vault");

    const lightwardRaw = (await Bun.file("fixtures/hsr/kqm-hsrnews-4.6-lightward-2026-10-27.md").text()).replace(/\r\n/g, "\n");
    const lwEvents = parseKqmHsrNews(lightwardRaw, ctx);
    assertCleanContext(lwEvents, ctx.sourceId);
    expect(lwEvents.filter(e => e.type === "challenge").every(e => e.summary === null)).toBe(true);
  });

  test("ZZZ Steam RSS extracts pre-duration event blurbs cleanly", async () => {
    const snap = (await Bun.file("snapshots/zzz-steam-events-official.xml").text()).replace(/\r\n/g, "\n");
    const ctx = { now: NOW, sourceUrl: "https://steamcommunity.com/games/4162040/rss/", sourceId: "zzz-steam-events-official", game: "zzz" as const };
    const events = parseZzzSteamRss(snap, ctx);
    assertCleanContext(events, ctx.sourceId);
    expect(events.find(e => e.title === "Trails of the Hobbling Crow")?.summary).toContain("Nightfall, poison");
    expect(events.find(e => e.title === "The Great En-Nah Giveaway!")?.summary).toContain("Encrypted Master Tape");
  });

  test("NTE Steam News extracts board character subjects, Arc subjects, and event details", async () => {
    const snap = await Bun.file("snapshots/nte-steamnews-official.json").text();
    const ctx = { now: NOW, sourceUrl: "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/", sourceId: "nte-steamnews-official", game: "nte" as const };
    const events = parseNteSteamNews(snap, ctx);
    assertCleanContext(events, ctx.sourceId);

    expect(events.find(e => e.title === "The Ichi-daime")?.recognitionSubjects).toEqual(["Nanally"]);
    expect(events.find(e => e.title === "The Lifeline")?.recognitionSubjects).toEqual(["Iroi"]);
    expect(events.find(e => e.title === "The Wrong Gate")?.recognitionSubjects).toEqual(["The Wrong Gate"]);
    expect(events.find(e => e.title === "Voice of the Voyager")?.recognitionSubjects).toEqual(["Voice of the Voyager"]);
    expect(originalTimelineIdentity(events.find(e => e.title === "The Ichi-daime")!)).toBe("Nanally");
    expect(events.find(e => e.title === "Volley Star")?.summary).toContain("Summer Glow");
    expect(events.find(e => e.type === "maintenance")?.summary).toBe("Scheduled maintenance; actual completion may vary.");
  });
});
