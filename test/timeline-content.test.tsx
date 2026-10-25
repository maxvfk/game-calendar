import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Timeline } from "../src/client/components/Timeline.tsx";
import { recognitionIdentity, minimumIdentityText, timelineDeadline, timelineAccessibleName, fitTimelineContent, visibleBarContent, type ContentWidths } from "../src/client/state/timelineContent.ts";
import { GachaEvent } from "../src/shared/schema.ts";
import { clockFor } from "../src/shared/time.ts";
import { asDisplayEvent, CustomEvent } from "../src/shared/custom.ts";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const base = GachaEvent.parse({
  id: "genshin:test:2026-10-01", game: "genshin", title: "Official marketing title",
  type: "banner", summary: null, startsAt: "2026-10-01T00:00:00Z", startPrecision: "day",
  endsAt: "2026-10-25T12:34:00Z", endPrecision: "exact", regionScoped: false, regionEnds: null,
  sourceUrl: "https://example.test/event", sourceId: "test", status: "published", confidence: 1,
  extractionMethod: "parser", version: 1, firstSeenAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
});

describe("Timeline semantic payload", () => {
  test("approved short copy overrides M1 visually while full canonical identity stays accessible", () => {
    const event = { ...base, recognitionSubjects: ["Subject A", "Subject B"], timelineTitle: "Short · Phase II" };
    expect(recognitionIdentity(event)).toBe("Short · Phase II");
    const clock = clockFor(event, "europe", NOW);
    const name = timelineAccessibleName(event, clock, "Genshin Impact", "End unknown", false, false);
    expect(name).toContain("Short · Phase II");
    expect(name).toContain("Subject A + Subject B");
    expect(name).toContain(base.title);
    for (const group of ["game", "ending"] as const) {
      const html = renderToStaticMarkup(<Timeline rows={[{ event, clock }]} now={NOW} dayWidth={72}
        onZoom={() => {}} group={group} onGroup={() => {}} showUpcoming splitUpcoming onOpen={() => {}} isDone={() => false} />);
      expect(html).toContain("Short · Phase II");
      expect(html).toContain(base.title);
    }
  });
  test("legacy title fallback never parses marketing names; subjects preserve order", () => {
    expect(recognitionIdentity(base)).toBe(base.title);
    expect(recognitionIdentity({ ...base, recognitionSubjects: ["Vesna"] })).toBe("Vesna");
    expect(recognitionIdentity({ ...base, recognitionSubjects: ["Weapon B", "Weapon A"] })).toBe("Weapon B + Weapon A");
  });

  test("useful prefix measurement retains short names and whole Unicode graphemes", () => {
    expect(minimumIdentityText("Si")).toBe("Si");
    expect(minimumIdentityText("Vesna")).toBe("Ves…");
    expect(minimumIdentityText("  e\u0301🎮👩‍🔬 banner")).toBe("e\u0301🎮👩‍🔬…");
    expect(minimumIdentityText("中文标题")).toBe("中文标…");
  });

  test("exact token omits clock time; accessible deadline keeps the resolved instant", () => {
    const deadline = timelineDeadline(base, clockFor(base, "europe", NOW), NOW);
    expect(deadline.text).toContain("25");
    expect(deadline.text).toStartWith("→ ");
    expect(deadline.text).not.toMatch(/\d:\d/);
    expect(deadline.accessible).toContain("34");
    expect(deadline.dayOnly).toBe(false);
  });

  test("day-only prints the source date without a clock or next-day reset", () => {
    const event = { ...base, endsAt: "2026-10-25T00:00:00Z", endPrecision: "day" as const };
    const clock = clockFor(event, "america", NOW);
    const deadline = timelineDeadline(event, clock, NOW);
    expect(deadline.text).toContain("25");
    expect(deadline.text).not.toMatch(/\d:\d/);
    expect(deadline.accessible).toContain("end date only");
    expect(deadline.accessible).not.toMatch(/\d:\d/);
    expect(deadline.dayOnly).toBe(true);
  });

  test("a region-resolved exact deadline overrides the day-only fallback", () => {
    const event = { ...base, endsAt: "2026-10-25T00:00:00Z", endPrecision: "day" as const,
      regionScoped: true, regionEnds: { asia: "2026-10-24T10:34:00Z", europe: "2026-10-26T10:34:00Z", america: "2026-10-27T10:34:00Z" } };
    const deadline = timelineDeadline(event, clockFor(event, "europe", NOW), NOW);
    expect(deadline.text).toContain("26");
    expect(deadline.dayOnly).toBe(false);
    expect(deadline.accessible).not.toContain("date only");
  });

  test("unknown ends never receive a synthetic date", () => {
    const event = { ...base, endsAt: null, endPrecision: "unknown" as const };
    expect(timelineDeadline(event, clockFor(event, "europe", NOW), NOW)).toEqual({
      text: "end unknown", accessible: "End unknown", unknown: true, dayOnly: false,
    });
  });

  test("an old unknown-end live campaign reaches the current board window", () => {
    const event = { ...base, startsAt: "2026-06-01T00:00:00Z", endsAt: null, endPrecision: "unknown" as const };
    const clock = clockFor(event, "europe", NOW);
    expect(clock.live).toBe(true);
    const html = renderToStaticMarkup(<Timeline rows={[{ event, clock }]} now={NOW} dayWidth={72} onZoom={() => {}} group="game" onGroup={() => {}} showUpcoming={false} splitUpcoming onOpen={() => {}} isDone={() => false} />);
    const boardWidth = Number(/style="width:([\d.]+)px;min-width:100%"/.exec(html)?.[1]);
    const bar = /data-timeline-event="[^"]+"[^>]*style="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(boardWidth).toBeGreaterThan(0);
    expect(Number(/width:([\d.]+)px/.exec(bar)?.[1])).toBe(boardWidth);
    expect(html).toContain("End unknown");
    expect(html).toContain("mask-image:linear-gradient");
  });

  test("cross-year dates include the year", () => {
    const event = { ...base, endsAt: "2027-01-05T00:00:00Z" };
    expect(timelineDeadline(event, clockFor(event, "europe", NOW), NOW).text).toContain("2027");
  });

  test("complete accessible semantics do not depend on visual fit", () => {
    const event = { ...base, recognitionSubjects: ["Subject B", "Subject A"], endsAt: null, endPrecision: "unknown" as const };
    const clock = { ...clockFor(event, "europe", NOW), upcoming: true };
    const name = timelineAccessibleName(event, clock, "Genshin Impact", "End unknown", true, true);
    for (const text of ["Genshin Impact", "Type: Banner", "Subject B + Subject A", base.title, "End unknown", "start date only", "not started yet", "Date disputed", "Completed"]) expect(name).toContain(text);
    const html = renderToStaticMarkup(<Timeline rows={[{ event, clock }]} now={NOW} dayWidth={6} onZoom={() => {}} group="ending" onGroup={() => {}} showUpcoming splitUpcoming onOpen={() => {}} isDone={() => true} />);
    expect(html).toContain('aria-label="Genshin Impact — Type: Banner — Subject B + Subject A');
    expect(html).toContain("End unknown");
    expect(html).toContain("opacity-35");
    expect(html).toContain("dashed");
  });

  test("custom events without recognition metadata retain their title and local day", () => {
    const event = asDisplayEvent(CustomEvent.parse({
      id: "myevent:12345678", game: "genshin", title: "My custom event", type: "story",
      startsAt: "2026-10-01T00:00:00Z", startPrecision: "day", endsAt: "2026-10-25T00:00:00Z", endPrecision: "day",
      summary: null, repeat: null, at: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
    }));
    expect(recognitionIdentity(event)).toBe("My custom event");
    expect(timelineDeadline(event, clockFor(event, "europe", NOW), NOW).accessible).toContain("end date only");
  });
});

describe("mode-specific measured fit", () => {
  const widths: ContentWidths = { game: 45, type: 20, identity: 100, deadline: 65, compactUnknown: 7, minimumIdentity: 27, gap: 6 };
  test("Ending soonest retains a useful ellipsized title instead of game + badge + blank space", () => {
    const fit = fitTimelineContent(160, "ending", false, widths);
    expect(fit.type).toBe(true);
    expect(fit.game).toBe(45);
    expect(fit.identity).toBe(83);
    expect(fit.deadline).toBe(null);
  });
  test("By game drops known date, truncates identity, then keeps type alone", () => {
    expect(fitTimelineContent(197, "game", false, widths)).toEqual({ type: true, game: 0, identity: 100, deadline: "full" });
    expect(fitTimelineContent(180, "game", false, widths)).toEqual({ type: true, game: 0, identity: 100, deadline: null });
    expect(fitTimelineContent(126, "game", false, widths)).toEqual({ type: true, game: 0, identity: 100, deadline: null });
    expect(fitTimelineContent(50, "game", false, widths)).toEqual({ type: true, game: 0, identity: 0, deadline: null });
    expect(fitTimelineContent(60, "game", false, widths)).toEqual({ type: true, game: 0, identity: 34, deadline: null });
    expect(fitTimelineContent(20, "game", false, widths)).toEqual({ type: true, game: 0, identity: 0, deadline: null });
    expect(fitTimelineContent(19, "game", false, widths)).toEqual({ type: false, game: 0, identity: 0, deadline: null });
  });
  test("Ending soonest drops known date, truncates identity, then yields game before title and type", () => {
    expect(fitTimelineContent(250, "ending", false, widths).type).toBe(true);
    expect(fitTimelineContent(230, "ending", false, widths)).toEqual({ type: true, game: 45, identity: 100, deadline: null });
    expect(fitTimelineContent(177, "ending", false, widths)).toEqual({ type: true, game: 45, identity: 100, deadline: null });
    expect(fitTimelineContent(160, "ending", false, widths)).toEqual({ type: true, game: 45, identity: 83, deadline: null });
    expect(fitTimelineContent(71, "ending", false, widths)).toEqual({ type: true, game: 0, identity: 45, deadline: null });
    expect(fitTimelineContent(30, "ending", false, widths)).toEqual({ type: true, game: 0, identity: 0, deadline: null });
    expect(fitTimelineContent(19, "ending", false, widths)).toEqual({ type: false, game: 0, identity: 0, deadline: null });
  });
  test("unknown uses '?' alongside high-priority type; accessibility never loses it", () => {
    expect(fitTimelineContent(50, "game", true, widths)).toEqual({ type: true, game: 0, identity: 0, deadline: "compact" });
    expect(fitTimelineContent(8, "game", true, widths)).toEqual({ type: false, game: 0, identity: 0, deadline: "compact" });
    expect(fitTimelineContent(90, "ending", true, widths)).toEqual({ type: true, game: 0, identity: 51, deadline: "compact" });
    expect(fitTimelineContent(33, "ending", true, widths)).toEqual({ type: true, game: 0, identity: 0, deadline: "compact" });
    for (const mode of ["game", "ending"] as const) {
      expect(fitTimelineContent(20, mode, true, widths)).toEqual({ type: true, game: 0, identity: 0, deadline: null });
      expect(fitTimelineContent(7, mode, true, widths).deadline).toBe("compact");
      expect(fitTimelineContent(0, mode, true, widths).deadline).toBe(null);
    }
  });
  test("fit scales with actual text metrics, not a desktop threshold", () => {
    for (const scale of [0.8, 1, 1.5, 2]) {
      const scaled = Object.fromEntries(Object.entries(widths).map(([key, value]) => [key, value * scale])) as unknown as ContentWidths;
      const fit = fitTimelineContent(190 * scale, "ending", true, scaled);
      expect(fit.game).toBeCloseTo(45 * scale);
      expect(fit.identity).toBeCloseTo(100 * scale);
      expect(fit.type).toBe(true);
      expect(fit.deadline).toBe("compact");
    }
  });
  test("long custom game text yields to event identity; short identity is kept whole", () => {
    expect(fitTimelineContent(160, "ending", false, { ...widths, game: 900 })).toEqual({
      type: true, game: 0, identity: 100, deadline: null,
    });
    expect(fitTimelineContent(44, "ending", false, { ...widths, identity: 18 })).toEqual({
      type: true, game: 0, identity: 18, deadline: null,
    });
    // At the useful-prefix boundary keep both; one pixel less reclaims game.
    expect(fitTimelineContent(104, "ending", false, widths).game).toBe(45);
    expect(fitTimelineContent(104, "ending", false, widths).identity).toBe(27);
    expect(fitTimelineContent(103, "ending", false, widths).game).toBe(0);
    expect(fitTimelineContent(103, "ending", false, widths).identity).toBe(77);
  });
  test("both modes retain the whole compact badge whenever its measured width fits", () => {
    for (const mode of ["game", "ending"] as const) for (const unknown of [false, true]) {
      for (let room = 0; room < 300; room++) {
        expect(fitTimelineContent(room, mode, unknown, widths).type).toBe(room >= widths.type);
      }
    }
  });
  test("no mode/width combination overruns its measured budget", () => {
    for (const mode of ["game", "ending"] as const) for (const unknown of [false, true]) for (const scale of [.8, 1, 1.5, 2]) for (let room = 0; room < 300; room++) {
      const w = Object.fromEntries(Object.entries(widths).map(([key, n]) => [key, n * scale])) as unknown as ContentWidths;
      const fit = fitTimelineContent(room, mode, unknown, w);
      const parts = [fit.game, fit.identity, fit.type ? w.type : 0,
        fit.deadline === "full" ? w.deadline : fit.deadline === "compact" ? w.compactUnknown : 0].filter(n => n > 0);
      expect(parts.reduce((sum, n) => sum + n, 0) + Math.max(0, parts.length - 1) * w.gap).toBeLessThanOrEqual(room + 1e-8);
      if (fit.identity > 0) expect(fit.identity).toBeGreaterThanOrEqual(Math.min(w.identity, w.minimumIdentity));
    }
  });
});

test("sticky fit uses the visible intersection and stays inside its bar", () => {
  expect(visibleBarContent(0, 2000, 1000, 360)).toBe(344);
  expect(visibleBarContent(0, 1100, 1000, 360)).toBe(84);
  expect(visibleBarContent(1200, 34, 1000, 360)).toBe(18);
  expect(visibleBarContent(1500, 34, 1000, 360)).toBe(0);
  expect(visibleBarContent(0, 100, 1000, 360)).toBe(0);
});
