import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { dailyGroups, nextDailyReset, Dailies } from "../src/client/components/Dailies.tsx";
import { Timeline, dayBoundaries, timelineX } from "../src/client/components/Timeline.tsx";
import { metaFor } from "../src/shared/games.ts";
import { nextResetMs } from "../src/shared/daily.ts";
import { GameMetaProvider } from "../src/client/state/gameMeta.tsx";
import type { LaneId, DisplayEvent } from "../src/shared/custom.ts";
import type { Region } from "../src/shared/schema.ts";
const meta = (id: LaneId) => metaFor(id, {});
const start = (event: DisplayEvent) => Date.parse(event.startsAt);
const now = Date.parse("2026-10-21T00:00:00Z");
const groups = (games: LaneId[], time = now, region: Region = "europe") => dailyGroups(games, [], time, region, meta, start);

describe("nearest daily reset attribution", () => {
  test("one game and all-shared boundaries keep the compact reset form", () => {
    for (const games of [["genshin"], ["hsr", "genshin", "zzz"]] as LaneId[][]) {
      const result = nextDailyReset(groups(games), now)!;
      expect(result.mixed).toBe(false);
      expect(result.games.map(g => g.game)).toEqual(games);
    }
    expect(nextDailyReset([], now)).toBeNull();
  });
  test("distinct clocks identify one next game or the shared earliest group in user order", () => {
    const single = nextDailyReset(groups(["endfield", "genshin"]), now)!;
    expect(single.mixed).toBe(true);
    expect(single.games.map(g => g.game)).toEqual(["genshin"]);
    const many = nextDailyReset(groups(["endfield", "hsr", "genshin", "zzz"]), now)!;
    expect(many.games.map(g => g.game)).toEqual(["hsr", "genshin", "zzz"]);
    expect(many.resetsIn).toBe(nextResetMs(now, "europe", "hsr") - now);
    const markup = renderToStaticMarkup(<GameMetaProvider value={meta}><Dailies
      games={["endfield", "hsr", "genshin", "zzz"]} events={[]} region="europe" now={now}
      daysFor={() => []} onToggleDay={() => {}} showChores /></GameMetaProvider>);
    expect(markup).toContain(`>${meta("hsr").short}</span>`);
    expect(markup).toContain('>+2</span>');
    expect(markup).toContain('title="Next reset: Honkai: Star Rail, Genshin Impact, Zenless Zone Zero"');
  });
  test("multiple items and repeated groups never count a game twice", () => {
    const base = groups(["hsr", "genshin", "endfield"]);
    base[0]!.items.push({ ...base[0]!.items[0]!, key: "repeating-item" });
    const result = nextDailyReset([...base, base[0]!], now)!;
    expect(result.games.map(g => g.game)).toEqual(["hsr", "genshin"]);
  });
  test("region and exact second/day transitions use the same authoritative boundaries", () => {
    for (const region of ["asia", "europe", "america"] as const) {
      const boundary = nextResetMs(now, region, "genshin");
      for (const time of [boundary - 1001, boundary - 1, boundary, boundary + 1]) {
        const result = nextDailyReset(groups(["endfield", "genshin", "hsr", "czn"], time, region), time)!;
        const earliest = Math.min(...["endfield", "genshin", "hsr", "czn"].map(game => nextResetMs(time, region, game)));
        expect(result.resetsIn + time).toBe(earliest);
        expect(result.games.map(g => g.game)).toEqual(["endfield", "genshin", "hsr", "czn"].filter(game => nextResetMs(time, region, game) === earliest));
      }
    }
  });
  test("near-equal rounded countdowns do not group different boundaries; custom games retain regional fallback", () => {
    const base = groups(["hsr", "genshin"]);
    base[1]!.items[0]!.resetsIn += 1;
    expect(nextDailyReset(base, now)!.games.map(g => g.game)).toEqual(["hsr"]);
    const custom = dailyGroups(["mygame:test"], [{ id: "myevent:test", game: "mygame:test", title: "Custom", startsAt: "2026-10-20T00:00:00Z" } as DisplayEvent], now, "europe", meta, start, false);
    expect(custom[0]!.items).toHaveLength(1);
    expect(nextDailyReset(custom, now)!.resetsIn).toBe(nextResetMs(now, "europe", "mygame:test") - now);
  });
});

test("weekly lines select only local Monday midnight with unchanged daily geometry across DST", () => {
  for (const [month, day] of [[2, 6], [9, 30]]) {
    const min = new Date(2026, month!, day!).getTime();
    const max = new Date(2026, month!, day! + 12).getTime();
    const days = dayBoundaries(min, max);
    for (const group of ["game", "ending"] as const) for (const dayWidth of [6, 72, 108]) {
      const html = renderToStaticMarkup(<Timeline rows={[]} now={min} dayWidth={dayWidth} group={group}
        showUpcoming splitUpcoming onZoom={() => {}} onGroup={() => {}} onOpen={() => {}} isDone={() => false} />);
      // Empty Timeline retains its grid and decorative week marks.
      const lines = [...html.matchAll(/data-day-boundary="(\d+)"([^>]+)/g)];
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        const date = new Date(Number(line[1]));
        expect(line[2]!.includes('data-week-start="true"')).toBe(date.getDay() === 1);
        expect(date.getHours()).toBe(0);
      }
    }
    for (const width of [6, 72, 108]) days.forEach((ms, i) => expect(timelineX(ms, min, width)).toBe(i * width));
    expect(days.filter(ms => new Date(ms).getDay() === 1)).toHaveLength(2);
  }
});
