import { expect, test } from "bun:test";
import { materializeReviewedBatch } from "../src/ingest/reviewed.ts";
import { RESET_RULES, fixedResetCycles } from "../src/ingest/recurring-endgame.ts";
import { loadRussianGlossary } from "../src/presentation/timeline-label-glossary.ts";
import { TimelineRegistry, russianLabelAnchorError, semanticFingerprint } from "../src/presentation/timeline-labels.ts";
import { eventId } from "../src/shared/schema.ts";

/**
 * ZZZ pilot of Russian Timeline labels (docs/tasks/TIMELINE-LABELS-RU-PILOT.md). Russian names
 * come from the Russian versions of the same official notices: the Steam 3.3 announcement
 * (?l=russian), site news 166000 / 166926 / 166944 (ru-ru) and HoYoLAB post 47375931 (ru-ru).
 */

const reviewed = materializeReviewedBatch(await Bun.file("data/reviewed/zzz.json").json()).events;
const glossary = await loadRussianGlossary("zzz");
const registry = TimelineRegistry.parse(await Bun.file("data/presentation/timeline-labels.ru.v1.json").json());

test("every Russian ZZZ label applies to its current event and has an in-game anchor", () => {
  const zzz = registry.decisions.filter(d => d.eventId.startsWith("zzz:"));
  expect(zzz.length).toBeGreaterThan(0);
  for (const d of zzz) {
    const event = reviewed.find(e => e.id === d.eventId);
    expect(event, d.eventId).toBeDefined();
    expect(d.fingerprint, d.eventId).toBe(semanticFingerprint(event!));
    if (d.decision === "label") expect(russianLabelAnchorError(event!, d.timelineTitle, { zzz: glossary }), d.eventId).toBeNull();
  }
});

test("the case from #175 now has its in-game name, and an anchorless label is still refused", () => {
  const healer = reviewed.find(e => e.title === "Cyber Miracle Healer, on Duty!")!;
  expect(healer.titleRu).toBe("Будни киберлекаря");
  const { titleRu: _, ...withoutName } = healer;
  expect(russianLabelAnchorError(withoutName, "Antivirus Log: Bangboo Repair", { zzz: glossary })).not.toBeNull();
});

test("recurring Shiyu Defense and Deadly Assault rows carry the mode's Russian name; IDs stay English", () => {
  for (const [mode, ru] of [["shiyu-critical-node", "Оборона Шиюй: критический узел"], ["deadly-assault", "Опасный штурм"]] as const) {
    const rule = RESET_RULES.find(r => r.game === "zzz" && r.mode === mode)!;
    const rows = fixedResetCycles(rule, "2026-11-26T00:00:00.000Z");
    expect(rows.length).toBeGreaterThan(0);
    for (const e of rows) {
      expect(e.titleRu).toBe(ru);
      expect(e.id).toBe(eventId(e.game, e.title, e.startsAt));
    }
  }
});

test("the ZZZ glossary maps each term once in each direction", () => {
  expect(new Set(glossary.map(e => e.en)).size).toBe(glossary.length);
  expect(new Set(glossary.map(e => e.ru)).size).toBe(glossary.length);
});
