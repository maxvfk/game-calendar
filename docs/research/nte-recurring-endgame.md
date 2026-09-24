# Neverness to Everness — recurring endgame calendar research

**Status:** implementation-ready for Beyond the Rails Special Route recurrence; other repeatable systems classified for scope  
**checkedAt:** 2026-09-24  
**baseline main SHA:** `9ca64efacbd1113489f6391b3c8dfaef8ebe4b2a`

## Why this exists

The NTE calendar currently has a recurring-endgame precision bug similar to the ZZZ issue, but with a different time model.

The checked-in automatic source `nte-ntebuild-btr` already contains three Beyond the Rails rotations:

- Aug 27 → Sep 10
- Sep 10 → Sep 24
- Sep 24 → Oct 8

However, `src/ingest/parsers/ntebuild-btr.ts` intentionally parses the NTEBuild JSON-LD dates as **day precision** and materializes a date such as `2026-09-24` as `2026-09-24T00:00:00Z`.

For the current rotation this is wrong enough to create a visible gap:

- official Whisper Circle ends **2026-09-24 04:59 UTC+8** = `2026-09-23T20:59:00Z`;
- the next 14-day Special Route starts **2026-09-24 05:00 UTC+8** = `2026-09-23T21:00:00Z`;
- the current date-only parser does not consider the Sep 24 row started until `2026-09-24T00:00:00Z`.

So between 21:00Z and 00:00Z the app can incorrectly show no active NTE endgame, even though the new Beyond the Rails cycle is already live.

This is the concrete defect that triggered this research.

## Evidence

### Primary / official

1. NTE Global official Whisper Circle notice:
   - **2026-09-10 05:00 → 2026-09-24 04:59 (UTC+8)**
   - canonical post: https://x.com/NTE_GL/status/2097565675191468435
   - current reviewed row already uses this source.

2. Official Version 1.1 update notes state:
   - Beyond the Rails: Prime Circle ends **2026-06-04 04:59 (UTC+8)**.
   - https://nte.perfectworld.com/en/article/news/gamebroad/20260602/262479.html

3. Official Version 1.4 preview material, mirrored in current event sources, announces:
   - Beyond the Rails: Sunset Circle — **Oct 8 → Oct 22**.
   - Current NTEBuild event list records that named future route.

### Strong secondary / operational evidence

- Prydwen game-modes guide states that the repeating Beyond the Rails rewards reset every **2 weeks**:
  https://www.prydwen.gg/neverness-to-everness/guides/game-modes

- GameWith describes Beyond the Rails Special Routes as updated every **two weeks**:
  https://gamewith.net/nte/74161

- Current NTEBuild event page explicitly describes the mode as a standing **14-day cycle** and contains:
  - Aug 27 → Sep 10
  - Sep 10 → Sep 24
  - Sep 24 → Oct 8
  - Oct 8 → Oct 22 (Sunset Circle)
  https://www.ntebuild.com/events

- Historical route windows also follow the same exact boundary:
  - Blazing Circle: Jul 16 → Jul 30
  - Cresting Circle: Jul 30 05:00 → Aug 13 04:59 UTC+8
  - Waxing Circle: Aug 13 05:00 → Aug 27 04:59 UTC+8
  - Incandescent Circle: Aug 27 05:00 → Sep 10 04:59 UTC+8
  - Whisper Circle: Sep 10 05:00 → Sep 24 04:59 UTC+8

The cadence statement itself is currently supported by strong secondary sources plus repeated official/event windows. Do not relabel the recurrence rule as first-party `official` unless a primary rules page explicitly states the 14-day cadence.

## 1. Beyond the Rails structure

Beyond the Rails contains two conceptually different parts.

### Permanent / one-time route

The permanent All-Day / Fracture route does not have a repeating reward deadline useful to the Timeline.

Do **not** generate repeated calendar events for the permanent route.

### Special Route

The Special Route is the recurring endgame reward cycle.

Observed rule:

```text
cadence: 14 days
boundary clock: 05:00 UTC+8
previous cycle inclusive end: 04:59 UTC+8
time basis: fixed UTC+8
region scoped: false
```

This is not the ZZZ model. Do **not** apply Asia / Europe / America server offsets to Beyond the Rails. The published Global windows use UTC+8 fixed timestamps.

## 2. Recommended recurrence rule

Use a checked-in recurrence rule rather than maintaining each cycle manually.

Conceptually:

```text
game: nte
mode: beyond-the-rails-special-route
cadenceDays: 14
anchorStart: 2026-07-16 05:00 UTC+8
boundaryTime: 05:00
timeBasis: UTC+8
provenanceStatus: estimated
sourceUrl: current recurrence evidence / NTEBuild source
effectiveFrom: 2026-07-16
```

A later official named-route notice should enrich/override the generated record without moving the cycle unless the explicit official dates differ.

The anchor may use another known cycle if implementation prefers. What matters is that the generated sequence reproduces all known windows.

## 3. Current and next cycles

The recurrence should generate at least:

| Cycle | Start | End |
|---|---|---|
| Incandescent Circle | 2026-08-27 05:00 UTC+8 | 2026-09-10 04:59 UTC+8 |
| Whisper Circle | 2026-09-10 05:00 UTC+8 | 2026-09-24 04:59 UTC+8 |
| unnamed / Sep 24 rotation | **2026-09-24 05:00 UTC+8** | **2026-10-08 04:59 UTC+8** |
| Sunset Circle | 2026-10-08 05:00 UTC+8 | 2026-10-22 04:59 UTC+8 |

The Sep 24 cycle is the important current case: the app must show it active immediately after Sep 24 05:00 UTC+8 even if an official route name has not yet been published.

Until a canonical route name exists, a stable fallback title such as the existing:

`Beyond the Rails — Rotation (Sep 24)`

is preferable to omitting the event.

When an official name becomes available, avoid silently reminting completion/localStorage identity. Either preserve the already-published ID/title identity or use an explicit alias/migration strategy.

## 4. Precision and Timeline behavior

Generated Beyond the Rails Special Route rows should use:

- `startPrecision: exact`
- `endPrecision: exact`
- `regionScoped: false`
- exact UTC instants derived from UTC+8
- `type: challenge`

For the Sep 24 cycle:

```text
startsAt = 2026-09-23T21:00:00Z
endsAt   = 2026-10-07T20:59:00Z
```

The daily Timeline should therefore place the start/end proportionally inside the local calendar day, not treat Sep 24 / Oct 8 as whole-day availability.

## 5. Source integration strategy

The existing `nte-ntebuild-btr` source is still useful:

- it discovers current/upcoming cycle dates;
- it can provide an official route name when NTEBuild has one;
- it is runner-confirmed and already part of scheduled refresh.

But its date-only JSON-LD should not be the final timing authority for the known recurring boundary.

Recommended behavior:

1. parse NTEBuild dates as today for discovery;
2. if the row matches the known Beyond the Rails 14-day recurrence, enrich the generated event with the recurrence's exact UTC+8 boundary;
3. preserve source provenance honestly:
   - explicit official named-route dates can be `official` when sourced directly;
   - recurrence-generated unnamed periods should remain `estimated` unless the cadence rule gains first-party documentation;
4. if a future NTEBuild / official date no longer matches the recurrence, surface a conflict and stop blind projection beyond that point.

An alternative implementation is to generate the BTR cycles first and merge NTEBuild naming/details onto them. Either is acceptable if IDs remain stable.

## 6. Other repeatable NTE systems

Not every repeatable activity belongs in the current endgame Timeline.

### 999 Nights

Current classification: **permanent mode / version-expanded**, not a fixed recurring deadline.

New floors/content can be added by version, but this research found no stable reward-reset cadence suitable for automatic Timeline generation.

Action: do not create repeating deadline rows.

### High-Risk Commissions

Current classification: **permanent challenge content**.

They are difficult endgame-like fights, but no recurring season/reset deadline was established here.

Action: do not create repeating Timeline rows unless a specific limited/reward season is explicitly announced.

### Anomaly Pilgrimage

Current classification: **weekly material boss**, not the main rotating endgame.

Guides describe weekly claim/reset behavior. This may belong in a future weekly checklist/reminder layer, but it should not be mixed into the current Endgame event category merely because it is difficult combat content.

Action: outside this implementation milestone.

### Pink Paws Heist income cap

Current classification: **biweekly economy/resource cycle**, not endgame.

Useful recurring deadline, but belongs to a future recurring-resource/checklist scope.

Action: do not bundle with Beyond the Rails implementation.

### Racing Online Battles

Current classification: **season controlled**.

Rank rewards reset by season, but no invariant fixed season length was established.

Action: publish only explicit season windows; do not project future seasons by cadence.

## 7. Why the current automatic row can disappear

The current parser does this:

```ts
return `${raw}T00:00:00.000Z`;
```

for NTEBuild date-only fields.

That is deliberately honest for a generic date-only source, but Beyond the Rails is a special case where independent schedule evidence gives the recurring clock.

For Sep 24:

```text
real start:   Sep 23 21:00Z
parser start: Sep 24 00:00Z
difference:   3 hours
```

During that interval the old cycle has already ended and the new date-only row has not started, so the UI can show no NTE endgame.

Do not solve this by globally interpreting every NTEBuild date as 05:00 UTC+8. That would fabricate times for unrelated events.

Only the documented recurring schedule should receive the exact clock.

## 8. Safety / override rules

- A newer explicit official period overrides recurrence from its effective cycle.
- If an explicit period disagrees with the generated 14-day window, surface a conflict and stop projecting later cycles until reviewed.
- Never infer timing for unrelated NTEBuild rows from the BTR reset clock.
- Generate only a bounded future horizon.
- Recurrence generation must work offline from checked-in rules.
- Automatic route naming is optional; an unnamed but correctly timed rotation is better than a missing deadline.
- Preserve already-published IDs / completion state.

## 9. Required implementation tests

At minimum:

1. **Known sequence:** Jul 16 anchor + 14 days reproduces Jul 30, Aug 13, Aug 27, Sep 10, Sep 24, Oct 8 and Oct 22 boundaries.
2. **Exact current start:** Sep 24 cycle begins at `2026-09-23T21:00:00Z`.
3. **Exact current end:** Whisper Circle ends at `2026-09-23T20:59:00Z`; the next rotation begins one minute later.
4. **No disappearance gap:** at a timestamp such as `2026-09-23T23:30:00Z`, the Sep 24 Beyond the Rails rotation is active.
5. **No regional conversion:** changing reader region must not alter BTR source start/end instants.
6. **Timeline precision:** BTR edges render as exact partial-day boundaries, not full day cells.
7. **Bounded generation:** only the configured current/future window enters the feed.
8. **Conflict gate:** an explicit future source period that differs from cadence stops unsafe projection.
9. **ID stability:** current published BTR cycle IDs/completion state are preserved or explicitly migrated.
10. **No generic time promotion:** unrelated NTEBuild day-only events remain day precision.

## 10. Immediate handoff to Work

Priority:

1. Implement recurring exact timing for **Beyond the Rails Special Route**.
2. Fix the current Sep 24 rotation so it is active from 05:00 UTC+8 rather than midnight UTC.
3. Preserve NTEBuild as discovery/naming evidence, but do not let its generic date-only parser erase the known BTR clock.
4. Keep recurrence provenance honest (`estimated` until the cadence wording is first-party confirmed).
5. Do not add 999 Nights, High-Risk Commissions, Anomaly Pilgrimage, Pink Paws Heist or racing seasons to this fixed-endgame generator.
6. Run the standard four validation commands from `AGENTS.md` and verify the live Timeline around the Sep 24 boundary.

## Sources

Primary / canonical:

- NTE Global Whisper Circle post:
  https://x.com/NTE_GL/status/2097565675191468435
- Official Version 1.1 update notes:
  https://nte.perfectworld.com/en/article/news/gamebroad/20260602/262479.html
- Official September 9 update notice:
  https://nte.perfectworld.com/en/article/news/gamenews/20260908/263947.html

Existing automatic source:

- NTEBuild events:
  https://www.ntebuild.com/events
- Parser:
  `src/ingest/parsers/ntebuild-btr.ts`

Strong secondary cadence/reference sources:

- Prydwen game modes:
  https://www.prydwen.gg/neverness-to-everness/guides/game-modes
- GameWith Beyond the Rails / recurring activities:
  https://gamewith.net/nte/74161
- NTEBuild current schedule:
  https://www.ntebuild.com/events
