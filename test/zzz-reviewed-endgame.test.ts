import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";

test("reviewed ZZZ endgame preserves IDs while showing regional reset deadlines", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json());
  expect(events).toHaveLength(30);
  expect(events.find(e => e.title === "Shiyu Defense: Critical Node (Sep 18)")).toMatchObject({
    id: "zzz:shiyu-defense-critical-node-sep-18:2026-09-18",
    titleRu: "Оборона Шиюй: критический узел",
    type: "challenge", startsAt: "2026-09-18T00:00:00.000Z",
    endsAt: "2026-10-01T19:59:00.000Z",
    startPrecision: "day", endPrecision: "exact", provenanceStatus: "estimated",
    regionEnds: { asia: "2026-10-01T19:59:00.000Z", europe: "2026-10-02T02:59:00.000Z", america: "2026-10-02T08:59:00.000Z" },
  });
  expect(events.find(e => e.title === "Deadly Assault (Sep 11)")).toMatchObject({
    id: "zzz:deadly-assault-sep-11:2026-09-11",
    titleRu: "Опасный штурм",
    type: "challenge", startsAt: "2026-09-11T00:00:00.000Z",
    endsAt: "2026-09-24T19:59:00.000Z",
    startPrecision: "day", endPrecision: "exact", provenanceStatus: "estimated",
    regionEnds: { asia: "2026-09-24T19:59:00.000Z", europe: "2026-09-25T02:59:00.000Z", america: "2026-09-25T08:59:00.000Z" },
  });
  expect(events.find(e => e.title === "Shadow Chase Showdown")?.id)
    .toBe("zzz:shadow-chase-showdown:2026-09-16");
});

test("ZZZ 3.3 emergency reviewed records use official windows and keep older cycles intact", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json());
  const names = [
    "All-New Program",
    "Spooky Funhouse Tales",
    "Cyber Miracle Healer, on Duty!",
    "Advanced Bounty: Area Patrol",
    '"En-Nah" Into Your Lap',
    "Trails of the Hobbling Crow",
    "Repair! Drifting Art",
    "Data Bounty: Combat Simulation",
    "Into the Flames of Life",
    "Plume of Rebirth",
    "Graceful Gale",
    "Joyau Dore",
    "The Final Callback - Audition Stage",
  ];
  const added = events.filter(e => e.startsAt >= "2026-10-21T00:00:00.000Z");
  expect(added).toHaveLength(13);
  expect(names.sort()).toEqual(added.map(e => e.title).sort());
  expect(added.every(e =>
    e.provenanceStatus === "official" &&
    e.regionScoped === true &&
    e.startPrecision === "day" &&
    e.endPrecision === "exact" &&
    e.regionEnds !== null &&
    e.sourceUrl.startsWith("https://zenless.hoyoverse.com/en-us/news/")
  )).toBe(true);

  const phoenix = added.find(e => e.title === "Into the Flames of Life")!;
  const velina = added.find(e => e.title === "Graceful Gale")!;
  expect(phoenix.recognitionSubjects).toEqual(["Phoenix"]);
  expect(velina.recognitionSubjects).toEqual(["Velina"]);
  expect(phoenix).toMatchObject({
    id: "zzz:into-the-flames-of-life:2026-10-21",
    startsAt: "2026-10-21T00:00:00.000Z",
    endsAt: "2026-11-11T03:59:00.000Z",
    regionEnds: {
      asia: "2026-11-11T03:59:00.000Z",
      europe: "2026-11-11T10:59:00.000Z",
      america: "2026-11-11T16:59:00.000Z",
    },
  });
  expect(added.find(e => e.title === "Spooky Funhouse Tales")).toMatchObject({
    startsAt: "2026-10-22T00:00:00.000Z",
    regionEnds: {
      asia: "2026-11-29T19:59:00.000Z",
      europe: "2026-11-30T02:59:00.000Z",
      america: "2026-11-30T08:59:00.000Z",
    },
  });
  expect(events.filter(e => e.title === "All-New Program")).toHaveLength(2);
  expect(events.filter(e => e.title === "Advanced Bounty: Area Patrol")).toHaveLength(2);
  expect(new Set(events.map(e => e.id)).size).toBe(events.length);
});
