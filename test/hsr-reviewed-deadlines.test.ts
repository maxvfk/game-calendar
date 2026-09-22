import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { effectiveEnd } from "../src/shared/time.ts";

test("HSR 4.5 global event ends do not grant extra time to Europe or America", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/hsr.json").json());
  for (const id of ["hsr:overdrive-whirlwind-grand-prix:2026-08-26", "hsr:minuscule-great-adventure:2026-09-12"]) {
    const event = events.find(e => e.id === id)!;
    expect(event).toBeDefined();
    for (const region of ["asia", "europe", "america"] as const) {
      expect(effectiveEnd(event, region)).toBe("2026-09-27T19:59:00.000Z");
    }
  }
  // A real server-time event must retain its regional deadline.
  const regional = events.find(e => e.id === "hsr:pure-fiction-domain-genesis:2026-09-14")!;
  expect(effectiveEnd(regional, "asia")).toBe("2026-10-18T19:59:00.000Z");
  expect(effectiveEnd(regional, "america")).toBe("2026-10-19T08:59:00.000Z");
});
