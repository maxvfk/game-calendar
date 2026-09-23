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

test("missing HSR rewards and challenge use their distinct documented deadlines", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/hsr.json").json());
  const byTitle = (title: string) => events.find(e => e.title === title)!;
  expect(byTitle("Realm of the Strange")).toMatchObject({ endsAt: "2026-09-27T19:59:00.000Z", startPrecision: "day", regionScoped: false });
  expect(byTitle("Memory of Chaos: Stormcleanse")).toMatchObject({ endsAt: "2026-09-27T22:00:00.000Z", regionScoped: false });
  expect(byTitle("Fate Contract: Renewal")).toMatchObject({ endsAt: null, endPrecision: "unknown" });
  expect(byTitle("Version 4.5 Nameless Honor")).toMatchObject({ endsAt: "2026-09-27T19:59:00.000Z", startPrecision: "day" });
  expect(byTitle("Realm of the Strange").updatedAt).toBe("2026-09-23T00:02:06.000Z");
  expect(byTitle("Overdrive: Whirlwind Grand Prix").updatedAt).toBe("2026-09-21T19:39:44.000Z");
});
