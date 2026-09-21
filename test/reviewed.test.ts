import { describe, expect, test } from "bun:test";
import {
  ReviewedBatch,
  materializeReviewedBatch,
} from "../src/ingest/reviewed.ts";

const BASE = {
  schemaVersion: 1 as const,
  game: "hsr" as const,
  reviewedAt: "2026-09-21T12:00:00.000Z",
  reviewedBy: "reviewer@example.test",
  statesNoEvents: false,
  events: [
    {
      title: "A Long Dream",
      titleRu: "Долгий сон",
      type: "story" as const,
      summary: null,
      startsAt: "2026-09-22T00:00:00.000Z",
      startPrecision: "day" as const,
      endsAt: null,
      endPrecision: "unknown" as const,
      regionScoped: false,
      regionEnds: null,
      sourceUrl: "https://example.test/announcement/1",
      provenanceStatus: "official" as const,
      confidence: 1,
    },
  ],
};

describe("reviewed event ingestion", () => {
  test("materializes a reviewed record into the public schema", () => {
    const result = materializeReviewedBatch(BASE);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      id: "hsr:a-long-dream:2026-09-22",
      game: "hsr",
      titleRu: "Долгий сон",
      sourceId: "reviewed-hsr",
      extractionMethod: "manual",
      provenanceStatus: "official",
      firstSeenAt: BASE.reviewedAt,
      updatedAt: BASE.reviewedAt,
    });
  });

  test("rejects inconsistent dates through the shared event invariants", () => {
    const input = {
      ...BASE,
      events: [
        {
          ...BASE.events[0]!,
          endsAt: "2026-09-20T00:00:00.000Z",
          endPrecision: "day" as const,
        },
      ],
    };
    expect(() => materializeReviewedBatch(input)).toThrow();
  });

  test("does not publish leaks unless explicitly enabled", () => {
    const input = {
      ...BASE,
      events: [
        { ...BASE.events[0]!, provenanceStatus: "leak" as const },
      ],
    };
    expect(materializeReviewedBatch(input).events).toEqual([]);
    expect(materializeReviewedBatch(input, { includeLeaks: true }).events).toHaveLength(1);
  });

  test("requires empty batches to say that the source itself reports no events", () => {
    expect(
      ReviewedBatch.parse({ ...BASE, statesNoEvents: true, events: [] }).statesNoEvents,
    ).toBe(true);
    expect(() =>
      ReviewedBatch.parse({ ...BASE, statesNoEvents: true }),
    ).toThrow();
  });

  test("rejects duplicate or cross-game stable IDs", () => {
    const event = BASE.events[0]!;
    expect(() =>
      ReviewedBatch.parse({
        ...BASE,
        events: [{ ...event, id: "genshin:wrong:2026-09-22" }],
      }),
    ).toThrow();
    expect(() =>
      ReviewedBatch.parse({
        ...BASE,
        events: [
          { ...event, id: "hsr:stable:2026-09-22" },
          { ...event, id: "hsr:stable:2026-09-22" },
        ],
      }),
    ).toThrow();
  });
});
