import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PUBLICATION_STALE_AFTER_MS,
  STALE_AFTER_MS,
  publicationStalled,
  type SourceHealth,
} from "../src/shared/feed.ts";
import type { GameId } from "../src/shared/schema.ts";
import { StaleFeedNotice } from "../src/client/components/StaleFeedNotice.tsx";

/**
 * Publication freshness (C4).
 *
 * From 2026-11-03 22:23 to 2026-11-05 01:25 UTC every refresh succeeded but the
 * CI it dispatched failed, so no deploy happened and the live page kept ~36 h
 * old data with nothing on screen to say so: the per-game footer notice only
 * fires after `STALE_AFTER_MS` (48 h). These pin the page-wide notice that
 * closes that gap, and the ways it could lie or cry wolf.
 */

const NOW = Date.parse("2026-11-05T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const at = (ms: number) => new Date(ms).toISOString();

function source(game: GameId, lastSuccessAt: string | null): SourceHealth {
  return {
    sourceId: `${game}-src`, game, url: "https://example.test/events",
    lastSuccessAt, lastConfirmedAt: lastSuccessAt, contentChangedAt: lastSuccessAt,
    eventCount: 3, parsedCount: 3, statesNoEvents: false,
  } as SourceHealth;
}

describe("publicationStalled", () => {
  test("fires below the per-game footer threshold, after a missed refresh cycle", () => {
    expect(PUBLICATION_STALE_AFTER_MS).toBeLessThan(STALE_AFTER_MS);
    // The longest normal gap seen between two refreshes is about 15 hours.
    expect(PUBLICATION_STALE_AFTER_MS).toBeGreaterThan(24 * HOUR);
  });

  test("the 2026-11-03..05 outage (~36 h) is reported", () => {
    const stalled = publicationStalled([source("genshin", at(NOW - 36 * HOUR))], NOW);
    expect(stalled).toEqual({ refreshedAt: at(NOW - 36 * HOUR), ageMs: 36 * HOUR });
  });

  test("a normal late refresh and the exact threshold stay quiet", () => {
    expect(publicationStalled([source("genshin", at(NOW - 15 * HOUR))], NOW)).toBeNull();
    expect(publicationStalled([source("genshin", at(NOW - PUBLICATION_STALE_AFTER_MS))], NOW)).toBeNull();
    expect(publicationStalled([source("genshin", at(NOW - PUBLICATION_STALE_AFTER_MS - 1))], NOW)).not.toBeNull();
  });

  test("one fresh source means publication is alive, even if others are old or never succeeded", () => {
    // Retired pollers keep old dates; per-game staleness is the footer's job.
    const sources = [source("endfield", at(NOW - 10 * 24 * HOUR)), source("czn", null), source("hsr", at(NOW - 2 * HOUR))];
    expect(publicationStalled(sources, NOW)).toBeNull();
  });

  test("no successful source at all is missing information, not a stall", () => {
    expect(publicationStalled([], NOW)).toBeNull();
    expect(publicationStalled([source("genshin", null)], NOW)).toBeNull();
  });
});

describe("StaleFeedNotice", () => {
  test("renders nothing while publication is current", () => {
    expect(renderToStaticMarkup(<StaleFeedNotice sources={[source("genshin", at(NOW - 3 * HOUR))]} now={NOW} />)).toBe("");
  });

  test("states the data age and what may be missing, without blaming a pipeline", () => {
    const html = renderToStaticMarkup(<StaleFeedNotice sources={[source("genshin", at(NOW - 36 * HOUR))]} now={NOW} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Event data was last refreshed 1d 12h ago");
    expect(html).toContain("New or changed deadlines may be missing.");
    expect(html).not.toMatch(/CI|deploy|pipeline/i);
  });
});
