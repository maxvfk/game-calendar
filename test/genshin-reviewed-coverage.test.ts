import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";

test("Genshin 7.1 coverage uses calendar dates without inventing server instants", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/genshin.json").json());
  expect(events).toHaveLength(16);
  for (const [title, start, end] of [
    ["To Temper Thyself and Journey Far — Cycle 5", "2026-08-10", "2026-11-02"],
    ["The Godforsaken Frostlands", "2026-08-12", "2026-11-03"],
    ["Carefree Snowball Fight", "2026-10-21", "2026-11-02"],
  ] as const) {
    const event = events.find(e => e.title === title)!;
    expect(event).toMatchObject({ startPrecision: "day", endPrecision: "day", provenanceStatus: "official" });
    expect(event.startsAt.slice(0, 10)).toBe(start);
    expect(event.endsAt?.slice(0, 10)).toBe(end);
    expect(event.updatedAt).toBe("2026-09-23T00:08:13.000Z");
  }
  const missive = events.find(e => e.title === "Missive of Grace: A Thank-You Gift")!;
  expect(missive).toMatchObject({
    id: "genshin:missive-of-grace-a-thank-you-gift:2026-09-28",
    startPrecision: "day", endsAt: null, endPrecision: "unknown",
    firstSeenAt: "2026-09-21T19:31:13.000Z", updatedAt: "2026-09-23T00:08:13.000Z",
  });
  expect(events.find(e => e.title === "Resplendent Starlight")?.updatedAt).toBe("2026-09-21T19:31:13.000Z");
});
