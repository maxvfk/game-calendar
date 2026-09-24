# Wuthering Waves — recurring endgame calendar research

**Status:** implementation-ready for Tower of Adversity and Whimpering Wastes recurrence; Endstate Matrix is version-linked and implementation-ready as a separate schedule class  
**checkedAt:** 2026-09-24  
**baseline main SHA:** `fdfadbe71c5f2e52f3f8db0cb02cde8a7d7df9cd`

## Why this exists

The current WuWa calendar does not publish the three recurring endgame modes that matter most for deadline planning:

- Tower of Adversity — Hazard Zone;
- Whimpering Wastes — Respawning Waters;
- Endstate Matrix.

The earlier coverage audit intentionally left them out because it had current-cycle observations but not enough evidence to distinguish a real recurrence rule from an inferred cadence.

This follow-up establishes that these modes are **not one schedule family**:

1. Tower of Adversity Hazard Zone — fixed 28-day recurrence at 04:00 server time.
2. Whimpering Wastes Respawning Waters — fixed 28-day recurrence at 04:00 server time, offset 14 days from Tower of Adversity.
3. Endstate Matrix — Challenge Cycles span multiple versions; Challenge Phases reset with version updates. It must be driven by version/update boundaries rather than a fixed number of days.

The first two can therefore be generated from checked-in recurrence rules. Endstate Matrix needs a separate version-linked schedule model.

## Evidence hierarchy and caveat

Primary / official evidence available in the Kuro article archive:

- Version 2.1 introduces Whimpering Wastes as permanent challenge gameplay:
  https://wutheringwaves.kurogames.com/en/main/news/detail/2094
- Version 2.1 content details preserve the permanent Whimpering Wastes introduction:
  https://wutheringwaves.kurogames.com/en/main/news/detail/2154
- Endstate Matrix official introduction:
  https://wutheringwaves.kurogames.com/en/main/news/detail/4386
- First Endstate Matrix cycle end is explicitly stated in Version 3.4 notes:
  https://wutheringwaves.kurogames.com/en/main/news/detail/4819
- Second Endstate Matrix cycle / Adversity Vanguard:
  https://wutheringwaves.kurogames.com/en/main/news/detail/5150
- Version 3.6 update maintenance:
  https://wutheringwaves.kurogames.com/en/main/news/detail/5281
- Version 3.7 update maintenance:
  https://wutheringwaves.kurogames.com/en/main/news/detail/5476

The original schedule-adjustment wording that changed Tower of Adversity and Whimpering Wastes to four-week cycles was distributed through official/in-game/social announcement surfaces that are not currently available as clean text in the Kuro article archive. Multiple archived copies of the announcement and the complete subsequent sequence agree on the rule.

Therefore:

- treat the **recurrence mechanics for ToA/Whimpering Wastes as strongly corroborated but `estimated` provenance** until a canonical first-party text capture is added;
- individual explicitly announced/current cycle boundaries can be upgraded when a first-party notice/in-game capture supplies them;
- do not weaken Endstate Matrix evidence to the same level: its version/cycle structure is directly present in current official Kuro material.

## 1. Tower of Adversity — Hazard Zone

### Current schedule model

The old two-week Tower cadence is obsolete for Hazard Zone.

The schedule adjustment introduced a four-week season beginning with the Hazard Zone reset on:

```text
2025-02-03 04:00 server time
```

From this anchor, Hazard Zone resets every **28 days** at **04:00 server time**.

Recommended rule:

```text
game: wuwa
mode: tower-of-adversity-hazard-zone
cadenceDays: 28
anchorReset: 2025-02-03 04:00 server time
resetTime: 04:00
timeBasis: server
provenanceStatus: estimated
```

### Current cycle

The recurrence produces:

```text
2026-09-14 04:00 server time
→ 2026-10-12 04:00 server time
```

Using the project's inclusive-end convention, the displayed active interval is:

```text
Sep 14 04:00 → Oct 12 03:59 server time
```

This matches current independent calendar observations.

The next cycle begins Oct 12 04:00 server time.

### Regional semantics

Tower uses **server time**, so it must use the same WuWa Asia / Europe / America conversion already used by exact region-scoped events.

For the Oct 12 reset:

```text
Asia:    2026-10-11T20:00:00Z reset
Europe:  2026-10-12T03:00:00Z reset
America: 2026-10-12T09:00:00Z reset
```

If storing inclusive ends one minute before reset:

```text
Asia:    2026-10-11T19:59:00Z
Europe:  2026-10-12T02:59:00Z
America: 2026-10-12T08:59:00Z
```

Do not use the viewer's local timezone to derive the source boundary.

## 2. Whimpering Wastes — Respawning Waters

Whimpering Wastes itself is permanent. Only the rotating **Respawning Waters** portion should become a recurring deadline row.

The mode also contains **Forbidden Waters**, which is one-time progression and must not be generated every cycle.

### Current schedule model

The first cycle ended on 2025-03-17 03:59 server time. Starting with the second challenge cycle:

```text
2025-03-17 04:00 server time
```

each challenge cycle lasts **4 weeks / 28 days**.

Recommended rule:

```text
game: wuwa
mode: whimpering-wastes-respawning-waters
cadenceDays: 28
anchorReset: 2025-03-17 04:00 server time
resetTime: 04:00
timeBasis: server
provenanceStatus: estimated
```

### Current and next cycles

The recurrence produces:

```text
current:
2026-08-31 04:00
→ 2026-09-28 03:59 server time

next:
2026-09-28 04:00
→ 2026-10-26 03:59 server time
```

This matches the current observed Sep 28 Whimpering Wastes reset.

### What exactly resets

Respawning Waters contains Chasm / Torrents progress that resets with the challenge cycle. The calendar should normally represent this as **one Whimpering Wastes — Respawning Waters deadline**, not duplicate rows for every internal lane.

Forbidden Waters is explicitly excluded from recurrence generation.

## 3. Tower + Whimpering Wastes relationship

The two modes both use 28-day cycles but their anchors are offset by 14 days.

Current sequence:

```text
Aug 31 — Whimpering Wastes reset
Sep 14 — Tower of Adversity reset
Sep 28 — Whimpering Wastes reset
Oct 12 — Tower of Adversity reset
Oct 26 — Whimpering Wastes reset
```

This means a major WuWa endgame deadline occurs every two weeks, but implementation should **not** encode one synthetic alternating schedule.

Store two independent 28-day recurrence rules. That is easier to audit and remains correct if Kuro later changes only one mode.

## 4. Endstate Matrix

Endstate Matrix must not use the same recurrence generator.

Official Kuro wording states:

- Endstate Matrix progresses through **Challenge Cycles**;
- each Challenge Cycle spans multiple **Challenge Phases**;
- current/live game data states that Challenge Phases reset with **version updates**;
- the first cycle was **Doomsday Cycle**;
- the second cycle is **Adversity Vanguard**;
- official Version 3.5 material states that the second cycle runs from **Version 3.5 through Version 3.8**.

Implementation classification:

```text
Endstate Matrix Challenge Cycle:
  multi-version / season controlled

Endstate Matrix Challenge Phase:
  version-linked
  resets at version-update boundary
```

### Why fixed-day projection is unsafe

The first Doomsday Cycle is explicitly documented as ending:

```text
2026-07-10 03:59 UTC+8
```

Source:
https://wutheringwaves.kurogames.com/en/main/news/detail/4819

That explicit cycle end should outrank any duration inferred from the number of versions.

The current Adversity Vanguard cycle is documented as spanning Versions 3.5–3.8, but this does **not** justify calculating its final timestamp from an assumed patch length.

Wait for the explicit Version 3.8 / next-cycle boundary.

## 5. Current Endstate Matrix phase

The active Challenge Cycle is:

```text
Adversity Vanguard
cycle 2
Version 3.5 → Version 3.8
```

Version 3.6 maintenance was:

```text
2026-08-20 04:00 - 11:00 UTC+8
```

Version 3.7 maintenance is:

```text
2026-09-30 04:00 - 11:00 UTC+8
```

Because Endstate Matrix Challenge Phases reset with version updates, the current Version 3.6 phase ends at the Version 3.7 update boundary.

For calendar deadline semantics, represent the boundary consistently with Kuro's explicit historical Endstate wording:

```text
inclusive end:
2026-09-30 03:59 UTC+8
= 2026-09-29T19:59:00Z

next version/update boundary:
2026-09-30 04:00 UTC+8
= 2026-09-29T20:00:00Z
```

This is a **global fixed UTC+8 update boundary**, not Asia/Europe/America server time.

Therefore:

```text
regionScoped: false
endPrecision: exact
```

### Phase start semantics

A Challenge Phase becomes available after the corresponding version update.

For Version 3.6, maintenance completed at:

```text
2026-08-20 11:00 UTC+8
= 2026-08-20T03:00:00Z
```

If the implementation resolves "after Version update" using the official maintenance completion, that is the correct exact start candidate.

If the project chooses not to equate scheduled maintenance completion with actual availability without explicit wording, preserve start precision conservatively. The end deadline is more important to the product's primary "what must I finish" question.

## 6. Proposed calendar representation

### Fixed recurrence rules

```text
Tower of Adversity — Hazard Zone
28 days
anchor: 2025-02-03 04:00 server time
region scoped

Whimpering Wastes — Respawning Waters
28 days
anchor: 2025-03-17 04:00 server time
region scoped
```

Generate only a bounded horizon: current plus enough upcoming cycles to cover the normal product window.

### Version-linked schedule

```text
Endstate Matrix
Challenge Cycle: explicit multi-version season record
Challenge Phase: one row per version/update phase
boundary: version update / maintenance
global UTC+8
```

Do not create `cadenceDays` for Endstate Matrix.

A practical event title can be:

```text
Endstate Matrix — Adversity Vanguard (Version 3.6 Phase)
```

or another stable naming convention chosen by Work.

## 7. Provenance and merge behavior

### Tower / Whimpering Wastes

Until the original first-party four-week schedule announcement is captured in canonical text:

- recurrence-generated rows should use `provenanceStatus: estimated`;
- source notes should explain the anchor/rule;
- an explicit official/in-game cycle period may raise confidence for that individual cycle;
- a future explicit Kuro period that disagrees with the rule must trigger review and stop blind projection.

### Endstate Matrix

Use official Kuro provenance for:

- cycle identity;
- version span;
- maintenance boundaries;
- explicit cycle ends.

The version-linked derived phase end should remain clearly distinguishable from a directly printed Endstate timestamp if the schema/reporting supports that distinction.

## 8. Stable IDs

All three modes are currently absent from the published reviewed WuWa data, so the first implementation establishes their ID convention.

Choose a convention that remains stable when a generated period later gains an official subtitle.

For example:

```text
wuwa:tower-of-adversity-hazard-zone:2026-09-14
wuwa:whimpering-wastes-respawning-waters:2026-08-31
wuwa:endstate-matrix-adversity-vanguard-v3-6:2026-08-20
```

Do not include volatile boss names or temporary buff names in IDs unless they are guaranteed identity fields.

## 9. Safety / override rules

- Explicit newer Kuro schedule > recurrence rule.
- Tower and Whimpering Wastes must be independent rules despite alternating every 14 days.
- Do not interpret "4 weeks" as calendar month.
- Do not generate Forbidden Waters.
- Do not infer Endstate Matrix cycle duration from patch count or historical version length.
- Endstate Matrix phase boundary uses version/update semantics, not regional server reset semantics.
- A delayed/extended maintenance should be able to override a scheduled Endstate phase transition.
- Generate only a bounded future horizon.
- If a fixed-rule cycle conflicts with a newly sourced explicit boundary, stop future projection beyond the conflict until reviewed.

## 10. Required implementation tests

At minimum:

1. **Tower anchor:** 2025-02-03 04:00 server + repeated 28-day periods produces 2026-09-14 and 2026-10-12 resets.
2. **Whimpering anchor:** 2025-03-17 04:00 server + repeated 28-day periods produces 2026-08-31, 2026-09-28 and 2026-10-26 resets.
3. **Alternation:** the two independent rules are 14 days apart for the current horizon.
4. **Exact regional Tower ends:** Oct 12 03:59 server converts correctly for Asia / Europe / America.
5. **Exact regional Whimpering ends:** Sep 28 03:59 server converts correctly for Asia / Europe / America.
6. **No Forbidden Waters recurrence.**
7. **Endstate is not fixed cadence:** no `+28`, `+42`, or patch-length projection creates future phases/cycles.
8. **Current Endstate phase:** Version 3.6 phase deadline resolves to the Version 3.7 update boundary around 2026-09-30 04:00 UTC+8, represented consistently as exclusive boundary or inclusive 03:59.
9. **Endstate global semantics:** region selection does not shift its update-boundary timestamp.
10. **Maintenance override:** a changed/extended maintenance can supersede the planned Endstate transition without rewriting older phases.
11. **Bounded generation:** recurrence rules do not produce an infinite feed.

## 11. Immediate handoff to Work

Priority:

1. Add recurrence support for **Tower of Adversity — Hazard Zone** using the 28-day / 04:00 server-time rule.
2. Add recurrence support for **Whimpering Wastes — Respawning Waters** using its independent 28-day / 04:00 server-time rule.
3. Publish the current and bounded upcoming cycles with exact regional deadlines.
4. Do not generate Forbidden Waters.
5. Add the current **Endstate Matrix — Adversity Vanguard** phase as a version-linked challenge with the Version 3.7 maintenance boundary as its current deadline.
6. Model Endstate Matrix separately from the fixed recurrence generator.
7. Preserve conservative provenance for the two four-week recurrence rules until the canonical original announcement text is captured.
8. Run the four standard validation commands from `AGENTS.md`.
9. Smoke-test the daily Timeline around Sep 28 (Whimpering Wastes), Sep 30 update boundary (Endstate Matrix), and Oct 12 (Tower of Adversity).

## Sources

Official Kuro:

- Whimpering Wastes introduction:
  https://wutheringwaves.kurogames.com/en/main/news/detail/2094
- Version 2.1 content details:
  https://wutheringwaves.kurogames.com/en/main/news/detail/2154
- Endstate Matrix introduction:
  https://wutheringwaves.kurogames.com/en/main/news/detail/4386
- Version 3.4 / first Endstate cycle end:
  https://wutheringwaves.kurogames.com/en/main/news/detail/4819
- Endstate Matrix Cycle 2 / Adversity Vanguard:
  https://wutheringwaves.kurogames.com/en/main/news/detail/5150
- Version 3.6 maintenance:
  https://wutheringwaves.kurogames.com/en/main/news/detail/5281
- Version 3.7 maintenance:
  https://wutheringwaves.kurogames.com/en/main/news/detail/5476

Repository references:

- `docs/research/coverage-wuwa.md`
- `data/reviewed/wuwa.json`
- `src/ingest/parsers/wuwa-kuro-atom.ts`

Kuro archive used to recover text from official articles where the live site is image/JS-heavy:

- https://github.com/TheLovinator1/wutheringwaves
