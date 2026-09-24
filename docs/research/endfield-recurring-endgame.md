# Arknights: Endfield — recurring endgame calendar research

**Status:** implementation-ready for Echoes of War classification/cycle handling and current Umbral Monument limited-event coverage; other repeatable systems classified for scope  
**checkedAt:** 2026-09-24  
**baseline main SHA:** `ebcfd2bfd7340330f62b2b53bd0e510fe31e0806`

## Why this exists

Endfield is the last game in the current seven-game recurring-endgame audit.

The main recurring/endgame systems are not one schedule family:

1. **Echoes of War** — permanent seasonal endgame; every season contains 3 limited-time cycles.
2. **Umbral Monument** — permanent endgame stages added over time; temporary `Monumental Etching` reward events accompany some new series.
3. **Contingency Contract** — high-difficulty limited event with internal timed mission updates, but no fixed long-term recurrence has been established.
4. **Trial of Swordmancy** — permanent daily-reward combat facility; useful checklist content, not a seasonal endgame Timeline row.
5. **Etchspace Salvage / Weekly Routine** — weekly progression/checklist systems, not the same class as rotating endgame seasons.

The current automatic wiki.gg source already contains Echoes of War season rows, but the parser currently misclassifies them as `other` instead of `challenge`, which makes them disappear under the Endgame / challenge filter.

## Evidence hierarchy

Primary / official:

- Current Version `Dreamscape of Wind and Snow` update notes:
  https://endfield.gryphline.com/en-us/news/5208
- Current CN official mirror for the same version, including Echoes of War and Umbral Monument update:
  https://endfield.hypergryph.com/news/2653
- Previous `Homecoming` update introducing Echoes of War:
  https://endfield.gryphline.com/en-us/news/5200
- Previous update with Trial of Swordmancy / Contingency Contract / Umbral Monument:
  https://endfield.gryphline.com/en-us/news/0758
- Contingency Contract content-update notice:
  https://endfield.gryphline.com/en-us/news/4484

Strong structured secondary:

- Endfield Talos Wiki Echoes of War:
  https://endfield.wiki.gg/wiki/Echoes_of_War
- Current Season of Illusion:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Illusion
- Season of Virtuality:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Virtuality
- Umbral Monument:
  https://endfield.wiki.gg/wiki/Umbral_Monument
- Trial of Swordmancy:
  https://endfield.wiki.gg/wiki/Trial_of_Swordmancy
- Weekly Routine:
  https://endfield.wiki.gg/wiki/Weekly_Routine
- Etchspace Salvage:
  https://endfield.wiki.gg/wiki/Etchspace

The project already uses the Talos Wiki event page successfully as an unattended automatic source.

## 1. Echoes of War — primary recurring endgame

Echoes of War is a permanent seasonal combat mode.

Official rules:

- the mode remains permanently available;
- each season is split into **3 cycles**;
- each cycle contains **3 stages**;
- stages / cycle rating change when the cycle changes;
- new seasons continue without downtime.

Important reward semantics from the structured wiki:

- one-time Honor rewards for stage ratings do not globally reset each season;
- the **Total Rating resets when a cycle changes**;
- the best cycle rating becomes the season's Final Rating / title;
- stage availability changes per cycle.

Therefore both the **season end** and **cycle boundaries** are meaningful player deadlines.

## 2. Echoes of War is not a blind +7-day recurrence

There is a strong weekly pattern inside a sourced season:

- Cycle II normally begins roughly 7 days after the season starts;
- Cycle III begins roughly 7 days after Cycle II;
- ordinary internal transitions use **04:00 server time**.

However the first and last cycle are often clipped by version/phase boundaries.

Examples:

### Season of Virtuality

```text
Season:
Sep 2 12:00 → Sep 24 11:59 server-context boundary

Cycle I:
Sep 2 12:00 → Sep 9 03:59

Cycle II:
Sep 9 04:00 → Sep 16 03:59

Cycle III:
Sep 16 04:00 → Sep 24 11:59
```

### Season of Illusion

```text
Season:
Sep 24 12:00 / region-adjusted phase start
→ Oct 15 / Oct 14 region-specific season end

Cycle I:
Sep 24 start → Oct 1 03:59 server time

Cycle II:
Oct 1 04:00 → Oct 8 03:59 server time

Cycle III:
Oct 8 04:00 → season end
```

The first cycle is shorter than a full 7×24h block because the season opens at 12:00. The last cycle is clipped by the next version/maintenance boundary.

Implementation classification:

```text
Echoes of War season:
  version/season controlled

Echoes of War cycle:
  source-driven sub-period
  weekly-like internal rhythm
  do not project beyond an explicitly sourced season
```

Use the weekly pattern for validation only.

## 3. Current Echoes of War — Season of Illusion

Current season:

```text
Season of Illusion
3 cycles
```

Structured current boundaries:

### Season

Asia:
```text
2026-09-24 12:00 UTC+8
→ 2026-10-15 11:59 UTC+8
```

Americas / Europe:
```text
2026-09-23 23:00 UTC-5
→ 2026-10-14 11:59 UTC-5
```

This is region-scoped.

### Cycle I deadline

```text
Oct 1 03:59 server time
```

### Cycle II deadline

```text
Oct 8 03:59 server time
```

### Cycle III deadline

The cycle ends with the sourced season boundary, not a synthetic Oct 15 03:59 reset.

For the calendar, the minimum useful output is:

- one season row;
- optionally two cycle-reset markers/rows before the final season boundary.

A cycle marker is preferable to three large overlapping challenge bars if the UI later supports sub-deadlines.

## 4. Current parser bug — Echoes of War classified as `other`

The automatic parser in:

`src/ingest/parsers/wikigg.ts`

calls:

```ts
inferType(`${title} ${typeLabel}`)
```

The source label is:

```text
Echoes of War Event
```

But `inferType()` only recognizes challenge-ish words such as:

```text
challenge
trial
onslaught
abyss
tower
test run
clash
combat
```

Therefore:

```text
Season of Virtuality + Echoes of War Event
→ type: other
```

and likewise for Season of Illusion.

This is a real product bug.

Result:

- the automatic source has the season;
- the Endgame / challenge filter hides it;
- the user can reasonably conclude that Endfield endgame is missing.

Required fix:

- map `Echoes of War Event` explicitly to `challenge`;
- do not globally classify every generic `Event` as challenge;
- add a parser regression test.

## 5. Recommended Echoes of War implementation

Do not replace the existing season event source.

The current wiki.gg automatic event page is useful and healthy for:

- current season discovery;
- exact regional season boundaries.

Add one narrow Echoes-specific layer.

Preferred approach:

1. keep current event-page season row;
2. classify `Echoes of War Event` as `challenge`;
3. extract cycle dates from the current season page / structured cycle table;
4. publish bounded cycle sub-deadlines only for the active/upcoming sourced season.

Conceptually:

```ts
interface EchoesSeason {
  title: string;
  startsAt / region starts: sourced;
  endsAt / region ends: sourced;
  cycles: [
    { index: 1, endsAt: sourced },
    { index: 2, endsAt: sourced },
    { index: 3, endsAt: season end }
  ];
}
```

Do not create an infinite weekly recurrence.

## 6. Umbral Monument

Umbral Monument is permanent endgame.

New stage series are added over time and remain permanently available.

Examples:

- Inorganic Construct;
- Turbidity Manifest;
- Contention of Deathly Silences;
- Howlers of the Crag;
- current/future `Marked by Dark Shadows`.

The stage series themselves do **not** have recurring expiry deadlines.

What does expire is the associated limited `Monumental Etching` reward event.

Examples:

- Corrupting Surge;
- Dirge of Grief;
- Beastly Howl;
- current Version 1.5 `Shadow Marked`.

Implementation classification:

```text
Umbral Monument stage series:
  permanent
  no Timeline end

Monumental Etching:
  explicit limited challenge event
  version/update controlled
  no fixed recurrence
```

## 7. Current Umbral Monument deadline

Current Version 1.5 update announces:

`Marked by Dark Shadows` stage series:

```text
available from 2026-10-05 12:00 server time
permanent thereafter
```

Associated:

`Monumental Etching: Shadow Marked`

```text
2026-10-05 12:00
→ 2026-10-19 04:00
server time
```

This is a concrete current coverage gap identified in the earlier audit.

Add it as:

- `type: challenge`;
- exact regional end;
- explicit official period.

Do not create a recurring `Monumental Etching` cadence from historical gaps; their release spacing is irregular.

## 8. Contingency Contract

`Contingency Contract: Re-Ignition Experimental Operation` is high-difficulty endgame-like content.

Official period:

```text
Jun 19 12:00
→ before version update/maintenance
server time
```

Phase 2 update:

```text
Jun 26 12:00 server time
```

Inside the event:

- a new cycle mission was added every **3 days**;
- updates occurred at **04:00 server time**;
- 7 cycle missions total;
- all stayed available until the event ended.

This is not enough evidence for a permanent recurring Contingency Contract schedule.

Implementation classification:

```text
Contingency Contract:
  explicit limited challenge event
  internal 3-day mission cadence when officially stated
  no long-term recurrence projection
```

If a future CC event appears, ingest its explicit notice independently.

## 9. Trial of Swordmancy

Permanent combat facility.

Recurring reward behavior:

- up to 3 Rewarded Trial attempts per day;
- Reward Doubling attempts are daily;
- Free Trial drop suppression resets at **04:00 server time**;
- Dataplate deck changes every **3 server days**.

This is a recurring resource/checklist loop, but not a seasonal endgame deadline.

The limited `Trial Algorithmics` event was a separate explicit event layered on top.

Recommendation:

- do not create daily Timeline bars;
- reserve this for a future daily/checklist system;
- if another limited Trial event is announced, publish that explicit event normally.

## 10. Etchspace Salvage and Weekly Routine

### Weekly Routine

Official/structured rule:

```text
reset:
Monday 04:00 server time
```

This is account progression/checklist content.

### Etchspace Salvage

Focus Commissions:

- 3 become available each week;
- weekly refresh behavior exists;
- uncompleted commissions can refresh weekly.

Again, this is weekly checklist/resource content, not the rotating endgame Timeline.

Recommendation:

- do not mix these into the current Endgame event rows;
- future checklist/reminder scope may model them.

## 11. Current coverage state

The current automatic wiki source already sees:

- Season of Virtuality;
- Season of Illusion;
- Trial of the Bow;
- ordinary event rows.

Current problems relevant to recurring endgame:

1. **Echoes seasons are typed as `other` rather than `challenge`.**
2. **Echoes internal cycle deadlines are absent.**
3. **Monumental Etching: Shadow Marked is missing from the current snapshot/feed source set.**
4. Umbral Monument permanent stage series should not be represented as expiring events.
5. Daily/weekly routine systems should remain outside this milestone.

## 12. Timing semantics

Endfield official server regions:

```text
Asia:
UTC+8

Americas / Europe:
UTC-5
```

Many ordinary reset boundaries use:

```text
04:00 server time
```

But version/phase launches may use:

```text
12:00 server time
```

or one simultaneous global launch represented differently per region.

Do not normalize every Endfield deadline to 04:00.

For each sourced row, preserve the actual source's regional timestamps.

## 13. Safety / override rules

- Explicit official/version schedule > observed cycle rhythm.
- Echoes season boundaries are source-controlled.
- Do not project Echoes weekly cycles beyond a sourced season.
- First/last Echoes cycles may be shorter/longer because of season boundaries.
- Umbral Monument stages are permanent; only their limited reward events expire.
- Do not derive future Monumental Etching dates from historical spacing.
- Contingency Contract 3-day mission updates apply only to the explicitly announced event.
- Trial of Swordmancy / Weekly Routine / Etchspace weekly behavior belongs to checklist scope.
- Generate only bounded current/upcoming sub-deadlines.

## 14. Required implementation tests

At minimum:

1. **Echoes classification:** `Echoes of War Event` parses as `challenge`, not `other`.
2. **Endgame filter:** Season of Illusion remains visible with only Endgame / challenge enabled.
3. **Season of Illusion boundaries:** preserve exact Asia and Americas/Europe ends.
4. **Cycle I:** deadline Oct 1 03:59 server time.
5. **Cycle II:** deadline Oct 8 03:59 server time.
6. **Cycle III:** uses the sourced season end, not a synthetic +7-day boundary.
7. **No infinite weekly generator:** no Echoes cycle is created outside the sourced season.
8. **Umbral permanent series:** `Marked by Dark Shadows` itself has no fabricated end.
9. **Shadow Marked event:** Oct 5 12:00 → Oct 19 04:00 server time is published as a challenge deadline.
10. **No Monumental cadence:** no future event is generated from historical spacing.
11. **No daily Timeline spam:** Trial of Swordmancy reward attempts do not generate daily event rows.
12. **Stable event IDs:** reclassifying Season of Illusion from `other` to `challenge` does not change its event ID/completion state.

## 15. Immediate handoff to Work

Priority:

1. Fix wiki.gg event classification so **Echoes of War Event → challenge**.
2. Verify deployed/current Season of Illusion is visible under the Endgame filter.
3. Add a narrow Echoes-of-War cycle source/parser for the active/upcoming season page, or equivalent source-driven cycle data.
4. Surface the Oct 1 and Oct 8 cycle boundaries without projecting beyond the season.
5. Add **Monumental Etching: Shadow Marked** from the official Version 1.5 schedule.
6. Keep `Marked by Dark Shadows` itself permanent/non-expiring.
7. Do not add Trial of Swordmancy, Weekly Routine or Etchspace weekly loops to the current endgame Timeline.
8. Run the standard four validation commands from `AGENTS.md`.
9. Smoke-test the Timeline around:
   - Sep 24 Season of Illusion transition;
   - Oct 1 Echoes Cycle I → II;
   - Oct 5 Shadow Marked start;
   - Oct 8 Echoes Cycle II → III;
   - Oct 19 Shadow Marked end.

## Sources

Official:

- Dreamscape of Wind and Snow update:
  https://endfield.gryphline.com/en-us/news/5208
- Current CN official update:
  https://endfield.hypergryph.com/news/2653
- Homecoming / Echoes of War introduction:
  https://endfield.gryphline.com/en-us/news/5200
- Trial of Swordmancy / Umbral Monument / Contingency Contract:
  https://endfield.gryphline.com/en-us/news/0758
- Contingency Contract phase update:
  https://endfield.gryphline.com/en-us/news/4484

Structured Talos Wiki:

- Echoes of War:
  https://endfield.wiki.gg/wiki/Echoes_of_War
- Season of Illusion:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Illusion
- Season of Virtuality:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Virtuality
- Umbral Monument:
  https://endfield.wiki.gg/wiki/Umbral_Monument
- Trial of Swordmancy:
  https://endfield.wiki.gg/wiki/Trial_of_Swordmancy
- Weekly Routine:
  https://endfield.wiki.gg/wiki/Weekly_Routine
- Etchspace Salvage:
  https://endfield.wiki.gg/wiki/Etchspace

Repository:

- `data/reviewed/endfield.json`
- `docs/research/coverage-endfield.md`
- `snapshots/endfield-wikigg-events.html`
- `src/ingest/parsers/wikigg.ts`
- `src/ingest/parsers/game8.ts`
