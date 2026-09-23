# Zenless Zone Zero — recurring endgame calendar research

**Status:** implementation-ready for the two fixed biweekly modes; partial for newer/seasonal modes  
**checkedAt:** 2026-09-24  
**baseline main SHA:** `6884bc79de54ea5b71d4e9b11e331756ac181d27`

## Why this exists

The current calendar treated the active ZZZ endgame rotations as ordinary reviewed events with day precision:

- `Shiyu Defense: Critical Node (Sep 18)` → end date 2026-10-02, time unknown.
- `Deadly Assault (Sep 11)` → end date 2026-09-25, time unknown.

That is safe as raw data, but misleading in the daily Timeline. A row ending on September 25 at an early server reset can visually look available through all of September 25, while in practice the player needs to finish it before that reset.

ZZZ has an important class of deadlines that should not be maintained as one-off events: some endgame rotations have an official deterministic recurrence rule. Those can be generated from an anchor + cadence + server reset time without guessing future dates.

This document separates:

1. **fixed recurrence** — safe to generate from a documented rule;
2. **version/season controlled** — recurring content, but future periods must come from explicit notices/current game data;
3. **permanent/no deadline** — should not appear as a limited Timeline row.

## Evidence hierarchy

Primary evidence used here:

- HoYoLAB official Version 1.4 update details:  
  https://www.hoyolab.com/article/35654082
- ZZZ official Version 3.2 update announcement:  
  https://zenless.hoyoverse.com/en-us/news/166000
- Current reviewed ZZZ records in `data/reviewed/zzz.json`.

Secondary evidence is used only where marked:

- current in-game countdown screenshot supplied by the reader on 2026-09-24;
- SEELIE ZZZ planner current countdowns;
- community-maintained ZZZ wiki / guides for historical season classification.

Do not promote secondary cadence observations to `official` provenance.

## 1. Fixed recurrence — safe to generate

### Shiyu Defense: Critical Node

**Official rule:** Version 1.4 states that Critical Node refreshes **every two weeks on Fridays at 04:00 server time**, with the first post-change refresh on **2025-01-03 04:00 server time**.

Source:
https://www.hoyolab.com/article/35654082

Implementation classification: **fixed recurrence / official**.

Recommended recurrence definition:

```text
game: zzz
mode: shiyu-critical-node
cadence: 14 days
anchorReset: 2025-01-03 04:00 server time
resetWeekday: Friday
resetTime: 04:00
timeBasis: server
provenance: official
```

The currently published Sep 18 → Oct 2 rotation is consistent with this rule.

### Deadly Assault

**Official rule:** the same Version 1.4 update states that Deadly Assault is permanently available after **2024-12-20 04:00 server time**, that its first refresh is **2025-01-10 04:00 server time**, and that subsequent refreshes occur **every two weeks on Fridays at 04:00 server time**.

Source:
https://www.hoyolab.com/article/35654082

Implementation classification: **fixed recurrence / official**.

Recommended recurrence definition:

```text
game: zzz
mode: deadly-assault
cadence: 14 days
anchorReset: 2025-01-10 04:00 server time
resetWeekday: Friday
resetTime: 04:00
timeBasis: server
provenance: official
```

This makes Deadly Assault and Critical Node alternate on successive Fridays.

The reader's live Europe-server countdown on 2026-09-24 independently matched the expected **2026-09-25 04:00 server reset** for the active Deadly Assault rotation. This is corroboration, not the basis for the recurrence rule.

## 2. Exact deadline semantics for fixed recurrence

For these two modes, the current reviewed rows should no longer use `endPrecision: day`.

The reset rule itself supplies an exact server-time boundary. Reuse the project's existing ZZZ server-region conversion logic; do not convert through the viewer's local timezone and do not invent one global UTC instant.

A generated rotation should behave as:

```text
rotation starts: reset N at 04:00 server time
rotation ends:   immediately before reset N+1 at 04:00 server time
```

The current schema traditionally represents inclusive event ends as `03:59`, so the implementation may store the end one minute before the next reset if that remains the established project convention. Do not silently mix an exclusive 04:00 boundary with inclusive 03:59 rows.

For example, the active Deadly Assault rotation should visually end at the beginning of the September 25 reset window, not occupy the whole September 25 day cell.

### Regional handling

Use the same ZZZ server-time mapping already used by exact banner/event rows in `data/reviewed/zzz.json`.

Expected behavior:

- Asia gets its exact reset-derived end.
- Europe gets its exact reset-derived end.
- America gets its exact reset-derived end.
- `regionScoped: true`.
- `endPrecision: exact`.

Do not hard-code the reader's Moscow/local time into source data.

## 3. Stable IDs and generated rows

Existing event IDs are localStorage keys and must remain stable.

The currently published rows are:

- `Shiyu Defense: Critical Node (Sep 18)`
- `Deadly Assault (Sep 11)`

When converting them from manual reviewed records to generated recurrence, preserve the existing title/ID semantics for already-published cycles. The project's `eventId` uses the start date, so adding an exact time on the same server-date should not require an ID migration, but tests must prove this before removing/replacing reviewed rows.

Generate only a bounded horizon needed by the app, not an infinite series. A reasonable implementation is current + upcoming cycles covering the product's normal forward window.

Historical rows should not be rewritten merely because a recurrence generator now exists.

## 4. Periodic Conquest — likely weekly, not yet primary-source confirmed

The current in-game countdown supplied by the reader on 2026-09-24 showed roughly **4 days 4 hours** remaining on the Europe server. That lands on the Monday weekly reset at **04:00 server time**. The current SEELIE planner showed the same countdown, and community discussion treats Periodic Conquest as weekly content.

General ZZZ weekly systems are documented as refreshing **Monday 04:00 server time**, but this research did **not** locate a first-party rule explicitly saying that the current Periodic Conquest reward period itself is generated by that exact weekly schedule.

Implementation classification: **candidate fixed recurrence / evidence incomplete**.

Recommendation:

- Do not mark a generated Periodic Conquest cadence as `official` yet.
- Prefer one more primary/in-game evidence capture that explicitly ties Periodic Conquest rewards/progress to the weekly Monday 04:00 reset.
- If Work implements it before that evidence exists, keep it clearly `estimated` and make the recurrence rule independently replaceable.

This is the next ZZZ recurrence fact worth verifying; it should not block fixing Critical Node and Deadly Assault.

## 5. Version/season-controlled endgame — do not project by cadence

### Threshold Simulation: Hard Mode

Threshold Simulation Easy Mode is permanent. Hard Mode is available only for set periods and its rewards reset when a new period is introduced.

Secondary historical evidence shows that Hard Mode seasons can span multiple game versions; for example, `Branching Echoes` was replaced by `Myriad Endgame` in Version 2.6 rather than following a short fixed 14/28-day cadence.

Implementation classification: **version/season controlled**.

Calendar behavior:

- show the active Hard Mode season when an explicit start/end is available;
- do not generate the next season from the previous duration;
- do not place permanent Easy Mode on the limited-event Timeline.

### Simulated / Virtual Battle Trial seasonal variants

The permanent base challenge is not a recurring deadline row. Time-limited variants/seasons can have deadlines, but no stable fixed cadence was established in this research.

Implementation classification: **version/season controlled**.

Calendar behavior:

- ingest/publish only explicit seasonal periods;
- no `+N days` generator.

### Annihilation Simulacrum

This newer endgame content appears to update by game version/patch rather than by the biweekly Friday cadence. This research does not establish a sufficiently strong first-party fixed reset rule for future automatic date generation.

Implementation classification: **version/season controlled pending stronger evidence**.

Calendar behavior:

- publish explicit current period/version boundaries when sourced;
- do not assume a fixed 42-day or patch-length future deadline.

## 6. Implementation model

Do not solve ZZZ endgame by adding every future Critical Node / Deadly Assault rotation manually to reviewed JSON.

Prefer a small recurrence layer with versioned rules, conceptually:

```ts
interface RecurringSchedule {
  game: "zzz";
  modeId: string;
  title: string;
  type: "challenge";
  cadenceDays: number;
  anchorReset: ServerLocalDateTime;
  resetTime: "04:00";
  timeBasis: "server";
  provenanceStatus: "official" | "estimated";
  sourceUrl: string;
  effectiveFrom: string;
}
```

The exact schema can differ; the important behavior is:

1. one documented anchor;
2. one cadence rule;
3. server-local reset semantics;
4. bounded generation horizon;
5. explicit provenance/source;
6. stable IDs;
7. future official schedule changes can supersede the rule from an effective date without rewriting history.

## 7. Override / safety rules

- An explicit newer official notice that changes cadence or reset time overrides the recurrence rule from its effective date.
- A source conflict must remain visible; do not move the recurrence merely to make the report quiet.
- Do not infer a fixed schedule for season-controlled modes.
- Do not generate a deadline if the rule becomes ambiguous.
- Generated fixed-recurrence rows should be reproducible offline from the checked-in rule and should not depend on a network refresh.
- Recurrence generation must not make a game look fresh if its unrelated automatic event sources are stale.

## 8. Required implementation tests

At minimum:

1. **Critical Node cadence:** official anchor 2025-01-03 04:00 server + 14 days produces the known 2026-09-18 → 2026-10-02 cycle.
2. **Deadly Assault cadence:** official anchor 2025-01-10 04:00 server + 14 days produces the known 2026-09-11 → 2026-09-25 cycle.
3. **Alternation:** Critical Node and Deadly Assault reset on alternating Fridays, seven days apart.
4. **Exact regional ends:** generated rows use exact per-region ends and do not render the reset date as an all-day available period.
5. **ID stability:** replacing the current reviewed Sep 11 / Sep 18 rows with generated equivalents retains their published event IDs/completion state.
6. **Bounded generation:** no unbounded/infinite event series enters `events.v1.json`.
7. **Rule override:** a later effective rule can change reset time/cadence without changing historical rows.
8. **No unsafe extrapolation:** Threshold Simulation Hard / seasonal Trial / Annihilation Simulacrum are not generated from prior duration.
9. **Periodic Conquest gate:** it is not promoted to official fixed recurrence until the missing primary/in-game rule is captured.

## 9. Immediate handoff to Work

Priority order:

1. Implement fixed recurrence support for **Shiyu Defense: Critical Node** and **Deadly Assault** from the official Version 1.4 rules.
2. Replace the current day-precision deadline behavior for those active rotations with exact regional reset-derived boundaries while preserving published IDs.
3. Verify the daily Timeline now visually tells the player to finish Deadly Assault before the Sep 25 reset rather than implying the whole Sep 25 day is available.
4. Keep **Periodic Conquest** as a separately tracked verification item; do not block the two official recurrences on it.
5. Keep Threshold Simulation Hard and other seasonal/version-controlled modes out of the fixed recurrence generator.
6. After implementation, run the standard four validation commands from `AGENTS.md` and do one phone smoke check around a partial-day reset edge.

## Sources

- Official Version 1.4 update details — Critical Node and Deadly Assault recurrence rules:  
  https://www.hoyolab.com/article/35654082
- Official Version 3.2 update announcement — current endgame phase context:  
  https://zenless.hoyoverse.com/en-us/news/166000
- Existing ZZZ coverage audit:  
  `docs/research/coverage-zzz.md`
- Current reviewed rows:  
  `data/reviewed/zzz.json`

Secondary references used for classification/corroboration, not promoted to official provenance:

- https://zzz.seelie.me/planner
- https://zenless-zone-zero.fandom.com/wiki/Threshold_Simulation
- https://zenless-zone-zero.fandom.com/wiki/Threshold_Simulation/Hard_Mode
