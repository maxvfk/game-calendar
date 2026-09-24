# Zenless Zone Zero — recurring endgame calendar research

**Status:** historical biweekly rule documented; current anchor unresolved, so recurrence generation is gated
**checkedAt:** 2026-09-24  
**baseline main SHA:** `6884bc79de54ea5b71d4e9b11e331756ac181d27`

## Why this exists

The calendar initially treated the September 2026 ZZZ endgame rotations as reviewed events with day precision:

- `Shiyu Defense: Critical Node (Sep 18)` → end date 2026-10-02, time unknown.
- `Deadly Assault (Sep 11)` → end date 2026-09-25, time unknown.

The reviewed rows now have exact regional ends from the 04:00 server reset, while their current cycle dates remain estimated and source-gated.

The historical official notice states a deterministic two-week rule. Its January 2025 anchors do **not** reproduce the independently sourced September 2026 cycles. A later schedule change or current anchor must be verified before future rows can be generated safely.

This document separates:

1. **historical fixed recurrence** — documented, but current projection unsafe until re-anchored;
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

## 1. Historical fixed recurrence — current projection gated

### Shiyu Defense: Critical Node

**Official rule:** Version 1.4 states that Critical Node refreshes **every two weeks on Fridays at 04:00 server time**, with the first post-change refresh on **2025-01-03 04:00 server time**.

Source:
https://www.hoyolab.com/article/35654082

Implementation classification: **official historical rule; current effective anchor unverified**.

Historical recurrence definition (not active in the generator):

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

Arithmetic check: 2025-01-03 + 14-day increments reaches **2026-09-11** and **2026-09-25**, not the sourced September 18 Critical Node start. The historical anchor is seven days out of phase.

### Deadly Assault

**Official rule:** the same Version 1.4 update states that Deadly Assault is permanently available after **2024-12-20 04:00 server time**, that its first refresh is **2025-01-10 04:00 server time**, and that subsequent refreshes occur **every two weeks on Fridays at 04:00 server time**.

Source:
https://www.hoyolab.com/article/35654082

Implementation classification: **official historical rule; current effective anchor unverified**.

Historical recurrence definition (not active in the generator):

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

The two historical rules alternate on successive Fridays, but their assignment to the current modes is seven days out of phase: 2025-01-10 + 14-day increments reaches **2026-09-04** and **2026-09-18**, not the sourced September 11 Deadly Assault start.

The reader's Europe-server countdown on 2026-09-24 supported the **2026-09-25 04:00 server reset** for the current Deadly Assault rotation. It corroborates this reviewed cycle, not continuity of the January 2025 anchor.

## 2. Exact deadline semantics for sourced current cycles

The two current reviewed rows use `endPrecision: exact` and `provenanceStatus: estimated`.

The 04:00 server reset supplies the clock for the currently corroborated cycle dates. Reuse the project's existing ZZZ server-region conversion logic; do not convert through the viewer's local timezone and do not invent one global UTC instant.

A future generated rotation, after re-anchoring, should behave as:

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

Keep these manual reviewed records until a verified current anchor or documented schedule change supports automation. Preserve their existing title/ID semantics if a future generator replaces them; the IDs are completion keys.

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

Review new Critical Node / Deadly Assault rotations against current evidence until the schedule is re-anchored. Do not turn the contradictory January 2025 anchors into an automatic publisher.

Once the current anchor is verified, a small effective-dated recurrence layer could use:

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

1. one documented **current** anchor and its effective date;
2. one cadence rule;
3. server-local reset semantics;
4. bounded generation horizon;
5. explicit provenance/source;
6. stable IDs;
7. future official schedule changes can supersede the rule from an effective date without rewriting history.

## 7. Override / safety rules

- A verified current anchor or explicit newer official notice is required before enabling recurrence; the January 2025 rule alone is insufficient.
- An explicit newer official notice that changes cadence or reset time overrides the historical rule from its effective date.
- A source conflict must remain visible; do not move the recurrence merely to make the report quiet.
- Do not infer a fixed schedule for season-controlled modes.
- Do not generate a deadline if the rule becomes ambiguous.
- Generated fixed-recurrence rows should be reproducible offline from the checked-in rule and should not depend on a network refresh.
- Recurrence generation must not make a game look fresh if its unrelated automatic event sources are stale.

## 8. Required implementation tests

At minimum:

1. **Anchor contradiction:** January 2025 +14-day rules are seven days out of phase with both September 2026 reviewed rows.
2. **Exact regional ends:** current reviewed rows end at the corroborated 04:00 server reset, represented as inclusive 03:59 per region.
3. **ID stability:** Sep 11 / Sep 18 reviewed IDs remain unchanged.
4. **No unsafe projection:** no future ZZZ cycle is generated from the historical anchors.
5. **Future rule override:** only a verified effective-dated rule may start new generation without changing historical rows.
6. **Seasonal gate:** Threshold Simulation Hard / seasonal Trial / Annihilation Simulacrum are not generated from prior duration.
7. **Periodic Conquest gate:** it is not promoted to official fixed recurrence until the missing primary/in-game rule is captured.

## 9. Immediate handoff to Work

Priority order:

1. Current Sep 11 / Sep 18 rows already have exact regional ends and stable IDs.
2. Verify a current official or in-game Shiyu/Deadly reset anchor or find the documented change after January 2025 before generating future cycles.
3. Keep **Periodic Conquest** as a separate verification item.
4. Keep Threshold Simulation Hard and other seasonal/version-controlled modes out of the fixed recurrence generator.
5. Smoke-check the partial-day reset edge on the phone and revalidate source dates when the next cycles appear.

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
