import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";

test("reviewed ZZZ endgame cycles retain dated, secondary day precision", async () => {
  const { events } = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json());
  expect(events).toHaveLength(17);
  expect(events.find(e => e.title === "Shiyu Defense: Critical Node (Sep 18)")).toMatchObject({
    id: "zzz:shiyu-defense-critical-node-sep-18:2026-09-18",
    titleRu: "Оборона Шиюй: критический узел",
    type: "challenge", startsAt: "2026-09-18T00:00:00.000Z",
    endsAt: "2026-10-02T00:00:00.000Z",
    startPrecision: "day", endPrecision: "day", provenanceStatus: "estimated",
  });
  expect(events.find(e => e.title === "Deadly Assault (Sep 11)")).toMatchObject({
    id: "zzz:deadly-assault-sep-11:2026-09-11",
    titleRu: "Опасный штурм",
    type: "challenge", startsAt: "2026-09-11T00:00:00.000Z",
    endsAt: "2026-09-25T00:00:00.000Z",
    startPrecision: "day", endPrecision: "day", provenanceStatus: "estimated",
  });
  expect(events.find(e => e.title === "Shadow Chase Showdown")?.id)
    .toBe("zzz:shadow-chase-showdown:2026-09-16");
});
