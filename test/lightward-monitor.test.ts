import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { missingLightwardPhase } from "../src/ingest/lightward-monitor.ts";

const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/hsr.json").json()).events;
const shadow = reviewed.find(e => e.title.startsWith("Apocalyptic Shadow:"))!;
const fiction = reviewed.find(e => e.title.startsWith("Pure Fiction:"))!;
const chaos = reviewed.find(e => e.title.startsWith("Memory of Chaos:"))!;

test("sourced AS → PF → MoC starts signal the missing next phase without publishing it", () => {
  const originalCount = reviewed.length;
  expect(missingLightwardPhase("2026-09-20T00:00:00.000Z", reviewed)).toBeNull();
  expect(missingLightwardPhase("2026-09-24T00:00:00.000Z", reviewed))
    .toContain("Memory of Chaos expected around 2026-09-28");
  expect(reviewed).toHaveLength(originalCount);
  const next = { ...chaos, id: "hsr:memory-of-chaos-new:2026-09-29", title: "Memory of Chaos: New Phase",
    startsAt: "2026-09-29T00:00:00.000Z", endsAt: null, endPrecision: "unknown" as const };
  expect(missingLightwardPhase("2026-09-28T12:00:00.000Z", [...reviewed, next])).toBeNull();
});

test("rotation monitor works for subsequent phases and notices a skipped sourced mode", () => {
  const nextMoC = { ...chaos, id: "hsr:memory-of-chaos-next:2026-09-28", startsAt: "2026-09-28T00:00:00.000Z" };
  expect(missingLightwardPhase("2026-10-07T00:00:00.000Z", [...reviewed, nextMoC]))
    .toContain("Apocalyptic Shadow expected around 2026-10-12");
  const nextAS = { ...shadow, id: "hsr:apocalyptic-shadow-next:2026-10-12", startsAt: "2026-10-12T00:00:00.000Z" };
  expect(missingLightwardPhase("2026-10-21T00:00:00.000Z", [...reviewed, nextMoC, nextAS]))
    .toContain("Pure Fiction expected around 2026-10-26");
  // A later MoC cannot masquerade as the missing Pure Fiction.
  const laterMoC = { ...nextMoC, id: "hsr:memory-of-chaos-later:2026-11-09", startsAt: "2026-11-09T00:00:00.000Z" };
  expect(missingLightwardPhase("2026-10-27T00:00:00.000Z", [...reviewed, nextMoC, nextAS, laterMoC]))
    .toContain("Pure Fiction expected");
});

test("version exceptions adjust monitoring without modifying sourced rows or ends", () => {
  const exception = { afterId: fiction.id, expectedDay: "2026-10-05" };
  expect(missingLightwardPhase("2026-09-24T00:00:00.000Z", reviewed, [exception])).toBeNull();
  expect(missingLightwardPhase("2026-09-30T00:00:00.000Z", reviewed, [exception]))
    .toContain("Memory of Chaos expected around 2026-10-05");
  expect(missingLightwardPhase("2026-10-20T00:00:00.000Z", reviewed, [{ afterId: fiction.id, suppress: true }])).toBeNull();
  expect(shadow.regionEnds?.asia).toBe("2026-10-04T19:59:00.000Z");
  expect(chaos.endsAt).toBe("2026-09-27T22:00:00.000Z");
});

test("Anomaly Arbitration and non-HSR events never join the Lightward rotation", () => {
  const other = reviewed.find(e => e.title.startsWith("Anomaly Arbitration:"))!;
  expect(missingLightwardPhase("2026-09-24T00:00:00.000Z", [other])).toBeNull();
  expect(missingLightwardPhase("2026-09-24T00:00:00.000Z", [{ ...fiction, sourceId: "recurring-hsr-fiction" }])).toBeNull();
});
