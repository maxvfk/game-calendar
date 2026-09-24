# Chaos Zero Nightmare — recurring endgame calendar research

**Status:** implementation-ready for current Great Rift/Basin precision fix and Great Rift weekly reward reset; partial for Sortie/core seasonal cadence  
**checkedAt:** 2026-09-24  
**baseline main SHA:** `78177c1c9ac4f5b71d39e717e5876f56fb621c7e`

## Why this exists

CZN has several different kinds of repeatable high-value content:

1. seasonal challenge windows such as The Great Rift, Basin of Hyperspace and Full-Scale Offensive;
2. weekly reward/progress resets inside some of those modes;
3. permanent repeatable modes such as Sortie;
4. seasonal Chaos / Nebula Distortion progression tied to Galactic Disaster.

These must not all be modeled as one generic fixed recurrence.

The current calendar already contains:

- `The Great Rift: Season 4 Second Half`
- `Basin of Hyperspace: Dimensional Twilight`

but both currently end on `2026-09-30` with `endPrecision: day`. This is under-precise: an official maintenance-schedule notice states that, starting with the 2026-07-29 update, content available "until the next maintenance" ends at **00:00 UTC** instead of the prior 01:00 UTC.

The calendar also currently omits the active Season 4 Full-Scale Offensive season, even though official/officially mirrored sources confirm that a new season started with the 2026-08-19 update.

## Evidence hierarchy

Primary / official provenance:

- current reviewed STOVE-backed rows in `data/reviewed/czn.json`;
- STOVE notices mirrored by CZN.gg with `Source: STOVE`;
- Smilegate Newsroom for major season/content launches.

Important source documents:

- Maintenance schedule change effective 2026-07-29:
  https://czn.gg/notice-adjusted-content-end-times-due-to-maintenance-schedule/
- Great Rift / Season 3 update example with explicit phase periods:
  https://czn.gg/czn-patch-notes-may-27/
- Great Rift weekly cumulative reward reset rule:
  https://czn.gg/chaos-zero-nightmare-patch-notes-12-24-update/
  and
  https://czn.gg/03-18-wed-update-added-on-3-18-0954/
- Current Season 4 phase context:
  https://czn.gg/news/
  https://czn.gg/news/updates/
- Official Smilegate Season 4 Chapter 2 announcement:
  https://newsroom.smilegate.com/en/bbs/board.php?bo_table=eng&wr_id=506
- Sortie weekly support reset example:
  https://czn.gg/czn-patch-notes-may-27/

Secondary classification references should not be promoted to official provenance.

## 1. The Great Rift

### Seasonal window

The Great Rift is **season-controlled**, not a safe infinite fixed recurrence.

Observed official pattern:

- Season 2 first half: 2026-02-25 → 2026-03-18
- Season 2 second half: 2026-03-18 → 2026-04-08
- Season 3 first half: 2026-05-27 → 2026-06-17
- Season 3 second half: 2026-06-17 → 2026-07-08
- Season 4 first half began with the 2026-08-19 update
- Season 4 second half began with the 2026-09-09 update and runs until the 2026-09-30 update

The three-week half-season pattern is very stable, but repository rules correctly forbid inferring a missing future maintenance boundary merely from cadence.

Implementation classification:

```text
Great Rift season window:
  version/season controlled
  explicit update/maintenance boundaries
  do not generate future halves from +21 days alone
```

### Current end precision defect

The current reviewed row:

`The Great Rift: Season 4 Second Half`

has:

```text
endsAt: 2026-09-30T00:00:00Z
endPrecision: day
```

The instant happens to equal 00:00 UTC, but the precision flag says the clock is unknown.

Official maintenance policy states:

- before 2026-07-29, regular update maintenance started at 01:00 UTC;
- starting with 2026-07-29, regular update maintenance starts at **00:00 UTC**;
- content that runs "until maintenance" moves to that 00:00 UTC end.

Source:
https://czn.gg/notice-adjusted-content-end-times-due-to-maintenance-schedule/

Recommendation:

- if the Sep 30 content notice says "before maintenance" and no later notice gives a different Sep 30 maintenance start, use:
  - `endsAt: 2026-09-30T00:00:00Z`
  - `endPrecision: exact`
  - `regionScoped: false`
- a later specific maintenance notice overrides this standing maintenance rule.

Do not blindly convert every historical "before maintenance" row to 00:00 UTC; the rule changed on 2026-07-29.

### Weekly cumulative rewards

The Great Rift also has a **separate fixed weekly reward reset**.

Official patch notes state:

- Weekly Cumulative Rewards reset every **Sunday at 18:00 UTC**.
- Record Rewards and Weekly Cumulative Rewards are reset again when the first half ends.

This rule is explicit in multiple STOVE-mirrored notices.

Implementation classification:

```text
Great Rift weekly cumulative rewards:
  fixed recurrence
  weekly
  Sunday 18:00 UTC
  only while a Great Rift phase is active
  official
```

This should not replace the Great Rift season row.

The product has two reasonable UI choices:

1. generate a small weekly deadline row such as `Great Rift — Weekly Cumulative Rewards`; or
2. add a recurring sub-deadline/checklist marker to the active Great Rift row.

Option 2 is less cluttered if the data model can support it. If not, a bounded weekly `challenge` row is acceptable.

Safety rule: do not generate weekly resets outside an explicitly active Great Rift season window.

## 2. Basin of Hyperspace: Dimensional Twilight

`Dimensional Dawn` is one-time progression; it should not be treated as recurring endgame.

`Dimensional Twilight` is the rotating high-difficulty period.

Official schedules show repeated limited windows such as:

- 2026-02-25 → 2026-03-18
- 2026-03-18 → 2026-04-08
- 2026-05-27 → 2026-06-17
- 2026-06-17 → 2026-07-08
- current Season 4 window in the reviewed data: 2026-09-09 → 2026-09-30

Although secondary guides call it monthly/rotating content, the actual schedule is tied to update windows and does not justify an infinite `+21 days` generator.

Implementation classification:

```text
Basin of Hyperspace: Dimensional Twilight
  version/update controlled
  explicit notice period required
  no fixed recurrence projection
```

### Current precision defect

The current reviewed row:

`Basin of Hyperspace: Dimensional Twilight`

also ends `2026-09-30` with day precision.

If its official period is "until the Sep 30 maintenance", the same standing 00:00 UTC maintenance rule applies.

Recommendation:

```text
endsAt: 2026-09-30T00:00:00Z
endPrecision: exact
regionScoped: false
```

provided no Sep 30 maintenance-specific notice contradicts the standard start.

## 3. Full-Scale Offensive

Full-Scale Offensive is recurring endgame, but **season-controlled**, not a fixed weekly/biweekly cycle.

Official examples:

- Season 2: 2026-05-27 after maintenance → 2026-07-08 before maintenance.
- Season 3: 2026-07-08 → 2026-08-19.
- Smilegate's official 2026-08-19 Season 4 Chapter 2 announcement states that a new Full-Scale Offensive season began with that update.

Current repository gap:

`data/reviewed/czn.json` has no active Full-Scale Offensive row.

This is a real endgame coverage gap.

Implementation classification:

```text
Full-Scale Offensive:
  season controlled
  explicit period required
  no future projection from previous season length
```

Recommended immediate action:

1. add the current Season 4 row once its explicit end is verified from the Aug 19 / later STOVE update notice;
2. preserve `endsAt:null` if only the start can be directly verified;
3. do **not** infer Sep 30 merely because Seasons 2/3 each ran for six weeks.

## 4. Sortie

Sortie became permanent content.

The temporary `Sortie Support` event in the 2026-05-27 patch is explicitly weekly:

- rewards for clearing Sortie twice each week;
- rewards/progress reset every **Sunday at 18:00 UTC**;
- the notice enumerates weekly periods.

Later, the separate `Chaos Sortie Operation` event was converted into a permanent one-time mission track, which is not itself a recurring weekly deadline.

Secondary structured references describe Sortie's Dimensional Singularity/configuration as weekly-refreshing, but this research did not locate a first-party source that is strong enough to state that every current permanent Sortie reward/configuration reset should be represented as a weekly calendar deadline.

Implementation classification:

```text
Sortie core:
  permanent
  weekly behavior likely
  exact recurring calendar deadline requires one more primary/in-game rule capture
```

Recommendation:

- do not create an official recurring Sortie deadline from the old Support event alone;
- keep `Sunday 18:00 UTC` as the strongest candidate;
- capture current in-game Help/Rules or a current official notice explicitly stating the permanent weekly reset before promoting it.

This should not block Great Rift/Basin fixes.

## 5. Galactic Disaster seasonal Chaos and weekly progress

Seasonal Chaos maps such as current `Kaleidoscope Hatchery` are repeatable progression content.

Historical patch notes show weekly progress mechanics, and secondary structured references classify current Season 4 Kaleidoscope Hatchery as having weekly progress reset.

However, this research did not establish a current first-party Season 4 rule precise enough to publish an independent recurring calendar deadline.

Implementation classification:

```text
seasonal Chaos weekly progress:
  candidate recurring checklist
  evidence incomplete for current Season 4 exact reset
```

Treat this as a future weekly-checklist research item, not an immediate Timeline generator.

## 6. Nebula Distortion

Nebula Distortion is high-difficulty seasonal content tied to the current Galactic Disaster Chaos.

It is not a safe fixed-cadence generator.

Historical seasons unlock bosses over the season and use explicit seasonal periods. Current Season 4 remains active, but future boss/windows should come from update notices.

Implementation classification:

```text
Nebula Distortion:
  season controlled
  explicit season/boss period
  no +N day projection
```

If a specific active season has a real deadline, it belongs in the calendar as `challenge`, but its end must be sourced from the current season notice.

## 7. Daily/global reset clock

CZN commonly uses **18:00 UTC** as the daily/weekly content reset boundary.

Examples include:

- Great Rift Weekly Cumulative Rewards: Sunday 18:00 UTC;
- Sortie Support weekly reset: Sunday 18:00 UTC;
- many daily-event opportunities and mission unlocks/reset at 18:00 UTC.

Do not turn this into a blanket rule that every event ends at 18:00 UTC.

There are two distinct clocks in CZN:

```text
normal daily/weekly reset:
  18:00 UTC

regular major update maintenance boundary since 2026-07-29:
  00:00 UTC start
```

The calendar must distinguish them.

## 8. Recommended CZN recurrence model

CZN needs both recurrence and season-window records.

Conceptually:

```ts
type CznSchedule =
  | {
      kind: "season-window";
      modeId: "great-rift" | "basin-twilight" | "full-scale-offensive" | "nebula-distortion";
      startsAt: explicit source boundary;
      endsAt: explicit source boundary | null;
      sourceUrl: string;
    }
  | {
      kind: "fixed-recurrence";
      modeId: "great-rift-weekly";
      cadenceDays: 7;
      resetTimeUtc: "18:00";
      activeWithin: "great-rift";
      provenanceStatus: "official";
    };
```

Do not force all CZN endgame into one cadence system.

## 9. Immediate current coverage fixes

### A. Great Rift second half

Current row exists.

Fix only precision if source wording is "before maintenance" and no specific Sep 30 exception exists:

```text
2026-09-30T00:00:00Z
exact
```

### B. Basin of Hyperspace: Dimensional Twilight

Same precision fix as above, under the same evidence condition.

### C. Full-Scale Offensive Season 4

Missing from the current reviewed calendar.

Add after verifying the explicit current Season 4 end. If end cannot be verified:

```text
start: verified Aug 19 update boundary
end: null
type: challenge
```

A missing end is better than an inferred Sep 30 deadline.

### D. Great Rift weekly cumulative rewards

Add a bounded recurring weekly deadline or recurring sub-deadline:

```text
Sunday 18:00 UTC
only during active Great Rift window
```

## 10. Safety / override rules

- Specific maintenance notice > standing regular-maintenance clock.
- Explicit season notice > observed historical cadence.
- Do not generate future Great Rift halves from 21-day cadence.
- Do not generate future Full-Scale Offensive seasons from 42-day cadence.
- Do not generate future Basin seasons from prior patch intervals.
- Weekly Great Rift reward reset may be generated only within an explicitly active phase.
- Do not use the old Sortie Support event alone as proof of the permanent core Sortie cadence.
- If the developer changes weekly reset time, the new rule applies prospectively from its effective date.
- Preserve published event IDs where current reviewed rows are merely gaining exact precision.

## 11. Required implementation tests

At minimum:

1. **Maintenance rule effective date:** pre-2026-07-29 rows are not silently rewritten to 00:00 UTC.
2. **Great Rift current end:** Season 4 Second Half can resolve from "before maintenance" to Sep 30 00:00 UTC only under the post-Jul-29 rule and absent an explicit exception.
3. **Basin current end:** same exact-boundary behavior.
4. **Great Rift weekly recurrence:** Sunday 18:00 UTC boundaries are generated only while Great Rift is active.
5. **Half reset interaction:** weekly rows do not extend beyond the active Great Rift half boundary.
6. **No unsafe Great Rift projection:** no future half is created solely from +21 days.
7. **No unsafe Full-Scale projection:** no new season is created from +42 days.
8. **Full-Scale missing-end behavior:** verified start + unknown end remains valid.
9. **No blanket 18:00 rule:** "before maintenance" uses the maintenance boundary, not the daily/weekly reset.
10. **ID stability:** changing Great Rift/Basin precision does not remint current event IDs or completion state.

## 12. Immediate handoff to Work

Priority:

1. Verify the Sep 30 maintenance boundary against the standing post-Jul-29 rule and any specific Sep 30 notice.
2. Upgrade current Great Rift Second Half and Basin Dimensional Twilight from day precision to exact 00:00 UTC if no exception exists.
3. Restore missing **Full-Scale Offensive Season 4** to endgame coverage; keep end null until directly verified.
4. Implement bounded **Great Rift Weekly Cumulative Rewards** reset at Sunday 18:00 UTC, active only inside a sourced Great Rift phase.
5. Keep Sortie permanent weekly reset as a follow-up verification item rather than assuming the temporary Sortie Support rule is sufficient proof.
6. Do not build generic 21/42-day season generators.
7. Run the standard four validation commands from `AGENTS.md` and verify one weekly reset edge plus the Sep 30 maintenance edge in the daily Timeline.

## Sources

Official / STOVE-backed:

- Great Rift phase and Full-Scale Offensive example:
  https://czn.gg/czn-patch-notes-may-27/
- Great Rift weekly reward reset:
  https://czn.gg/chaos-zero-nightmare-patch-notes-12-24-update/
  https://czn.gg/03-18-wed-update-added-on-3-18-0954/
- Sortie Support weekly reset:
  https://czn.gg/czn-patch-notes-may-27/
- Maintenance boundary change:
  https://czn.gg/notice-adjusted-content-end-times-due-to-maintenance-schedule/
- Current CZN news/update archive:
  https://czn.gg/news/
  https://czn.gg/news/updates/
- Season 4 Chapter 2 / Full-Scale Offensive official launch confirmation:
  https://newsroom.smilegate.com/en/bbs/board.php?bo_table=eng&wr_id=506

Repository:

- `data/reviewed/czn.json`
- `docs/SOURCES.md`
