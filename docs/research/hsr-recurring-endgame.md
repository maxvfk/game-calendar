# Honkai: Star Rail — recurring endgame calendar research

**Status:** implementation-ready for Treasures Lightward schedule handling; Anomaly Arbitration classified as version-controlled; Currency Wars flagged as seasonal/resettable progression  
**checkedAt:** 2026-09-24  
**baseline main SHA:** `b1f8d50012e6c996d574845033b6a83cb175d572`

## Why this exists

The HSR calendar already contains the current:

- Memory of Chaos — Stormcleanse;
- Apocalyptic Shadow — Celestial Lupine;
- Pure Fiction — Domain Genesis.

However, treating these modes as a simple fixed recurrence would be unsafe.

Historically, the Treasures Lightward schedule follows a clear pattern:

- one of the three modes starts a new phase every **14 days**;
- the modes rotate through Apocalyptic Shadow → Pure Fiction → Memory of Chaos;
- a normal phase lasts **6 weeks / 42 days**.

But Version 4.5 explicitly breaks the normal duration rule:

- current Apocalyptic Shadow is shortened to **5 weeks**;
- current Pure Fiction is shortened to **5 weeks**;
- the current Memory of Chaos ends on a fixed global Version 4.5 boundary rather than a normal server-local 03:59 boundary;
- the next Memory of Chaos becomes available only after the Version 4.6 update.

Therefore, HSR recurring endgame should use the known rhythm as a **coverage expectation / anomaly detector**, not as the primary publisher of future exact deadlines.

## Evidence hierarchy

Primary / official:

- Version 1.6 introduced Pure Fiction rotation with Memory of Chaos and established six-week phases with staggered starts:
  https://www.hoyolab.com/article/23617910
- Version 2.3 introduced Apocalyptic Shadow into the alternating Treasures Lightward schedule:
  https://www.hoyolab.com/article_pre/15243
- Version 4.4 current schedule:
  https://www.hoyolab.com/article/45851903
- Version 4.5 current schedule and explicit five-week exception:
  official in-game notice mirrored at:
  https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md
- Version 4.6 maintenance boundary:
  https://github.com/KQM-git/HSRNews/blob/master/archive/1408.md
- Anomaly Arbitration introduction:
  https://www.hoyolab.com/article/41316670
- Current official Version 4.5 Anomaly Arbitration theme:
  https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md
- Currency Wars Version 4.6 reset warning:
  https://github.com/KQM-git/HSRNews/blob/master/archive/1421.md

Strong secondary corroboration:

- Prydwen Anomaly Arbitration current analytics:
  https://www.prydwen.gg/star-rail/anomaly-arbitration
- Icy Veins current Anomaly Arbitration guide and version-linked duration:
  https://www.icy-veins.com/honkai-star-rail/anomaly-arbitration-best-characters

## 1. Treasures Lightward baseline rhythm

The three recurring combat modes are:

- Forgotten Hall: Memory of Chaos;
- Pure Fiction;
- Apocalyptic Shadow.

Normal baseline behavior:

```text
new Treasures Lightward phase every 14 days

rotation:
Apocalyptic Shadow
→ Pure Fiction
→ Memory of Chaos
→ repeat

normal phase duration:
42 days / 6 weeks
```

This means all three can overlap.

Example from Version 4.4:

```text
AS  starts Jul 20
PF  starts Aug 03
MoC starts Aug 17
AS  starts Aug 31
PF  starts Sep 14
MoC expected around Sep 28
```

The 14-day launch rhythm remains useful as a sanity check.

## 2. Do not publish Treasures Lightward from cadence alone

Version 4.5 proves that the normal 42-day duration is not immutable.

Official Version 4.5 wording:

> Due to the duration adjustment of Version 4.5, the duration of Apocalyptic Shadow and Pure Fiction for this period will be shortened to 5 weeks.

Current exact windows:

### Apocalyptic Shadow — Celestial Lupine

```text
2026-08-31 04:00
→ 2026-10-05 03:59
server time
```

### Pure Fiction — Domain Genesis

```text
2026-09-14 04:00
→ 2026-10-19 03:59
server time
```

### Memory of Chaos — Stormcleanse

```text
2026-08-17 04:00 server time
→ 2026-09-28 06:00 global / UTC+8
```

The current MoC end is a special global version boundary, not the normal server-local 03:59 end.

The same Version 4.5 notice explicitly says:

```text
The new Memory of Chaos phase becomes available after the Version 4.6 update.
```

Therefore:

```text
Treasures Lightward publication:
  source explicit official phase windows

14-day / 42-day rhythm:
  validation + missing-phase detector only
```

Do not generate future exact rows solely from the rhythm.

## 3. Current regional semantics

### Apocalyptic Shadow / Pure Fiction

Both current rows use normal **server time**.

They should remain:

```text
regionScoped: true
endPrecision: exact
```

Current ends:

#### AS Celestial Lupine — Oct 5 03:59 server time

```text
Asia:    2026-10-04T19:59:00Z
Europe:  2026-10-05T02:59:00Z
America: 2026-10-05T08:59:00Z
```

#### PF Domain Genesis — Oct 19 03:59 server time

```text
Asia:    2026-10-18T19:59:00Z
Europe:  2026-10-19T02:59:00Z
America: 2026-10-19T08:59:00Z
```

### Memory of Chaos — Stormcleanse

The end is explicitly global:

```text
2026-09-28 06:00 UTC+8
= 2026-09-27T22:00:00Z
```

Therefore:

```text
regionScoped: false
regionEnds: null
endPrecision: exact
```

The existing reviewed row already models this correctly.

This distinction must survive any recurrence implementation.

## 4. Recommended Treasures Lightward model

Do not create a generic `cadenceDays: 42` event generator.

Use an explicit schedule-window model, backed by automatic official-notice ingestion:

```ts
interface TreasuresLightwardPhase {
  game: "hsr";
  modeId: "memory-of-chaos" | "pure-fiction" | "apocalyptic-shadow";
  title: string;
  startsAt: explicit source boundary;
  endsAt: explicit source boundary;
  timeBasis: "server" | "global";
  sourceUrl: string;
}
```

Optionally store the expected rotation separately:

```text
expectedStartSpacingDays: 14
normalDurationDays: 42
rotationOrder: AS → PF → MoC
```

But this expectation layer must never override explicit source dates.

Use it to raise warnings such as:

- expected next mode has no sourced row;
- a phase duration differs from normal baseline;
- a schedule is missing around an expected rotation point.

Version 4.5 is a valid override, not an error.

## 5. Current upcoming Memory of Chaos

The next Memory of Chaos phase is confirmed to become available after Version 4.6 update.

Version 4.6 maintenance:

```text
begins 2026-09-28 06:00 global / UTC+8
scheduled duration: 5 hours
```

The current pre-release notice does **not yet provide the full new MoC phase window** in the checked snapshot.

Recommendation:

- do not infer its end from +42 days yet;
- do not invent a 04:00 server-time start;
- add/update the row only when the Version 4.6 details notice publishes its explicit boundaries.

The calendar can use the 14-day rhythm to flag that the MoC row is expected, but should not publish an unsourced deadline.

## 6. Anomaly Arbitration

Anomaly Arbitration is a fourth high-difficulty recurring endgame mode and should be included in calendar scope.

Official Version 3.6 wording:

```text
Anomaly Arbitration gameplay will be updated with future versions.
```

Subsequent version notices repeatedly update its theme with the coming version.

Current Version 4.5 theme:

```text
Anomaly Arbitration: Return of the Legion
```

Implementation classification:

```text
Anomaly Arbitration:
  version-controlled
  one challenge phase per game version
  no Treasures Lightward 14-day cadence
```

Historical/current phase tracking corroborates that its phases align with version periods.

### Current coverage gap

`data/reviewed/hsr.json` currently has no Anomaly Arbitration row.

This is a real recurring-endgame coverage gap.

### Current 4.5 phase

Strong evidence:

```text
phase: Return of the Legion
starts with Version 4.5
next phase arrives with Version 4.6
```

Version 4.5 boundary:

```text
Version 4.5 runs until 2026-09-28 06:00 global / UTC+8
```

Recommended publication policy:

- start may remain day precision at the Version 4.5 update day unless an exact in-game availability clock is captured;
- the end may be linked to the Version 4.5 end boundary **only as derived/estimated provenance**, unless an in-game phase countdown or explicit period notice confirms it;
- if the schema cannot distinguish a derived version-linked deadline from direct official timing, keep `endsAt:null` rather than labeling the inferred boundary as official.

The recurring relationship itself is strong; the exact current phase end deserves conservative provenance.

## 7. Currency Wars: Zero-Sum Game

Currency Wars is not part of Treasures Lightward, but it now has meaningful seasonal reset behavior.

The Version 4.6 notice explicitly states that when Version 4.6 ends, some rewards/content will reset and unclaimed rewards become unavailable.

Reset content includes:

- Bond Link rewards;
- Data Bank rewards and collection progress;
- Ascension Level rewards and level;
- Standard Gambit rank rewards;
- Expected Profit rewards;
- Seasonal Advantage nodes/items;
- winning streak state.

Some permanent rewards/progression remain.

Implementation classification:

```text
Currency Wars:
  seasonal/version-controlled progression
  explicit season-end deadline
  not fixed recurrence
```

This belongs in calendar scope if the product intends to answer "what rewards will expire/reset" beyond pure combat score modes.

Do not infer future season length.

For Version 4.6, wait until the official Version 4.6 end boundary is published, then add the seasonal reset deadline.

## 8. Modes that should not be mixed into this milestone

### Divergent Universe / Simulated Universe weekly rewards

These have repeatable weekly progression/checklist behavior, but they are not the same class as rotating high-difficulty endgame.

Treat them as a future weekly-checklist/reminder layer.

### Nameless Honor weekly missions

Weekly Monday 04:00 server reset is official, but this is Battle Pass progression, not combat endgame.

Do not mix it into the recurring endgame implementation.

### Echo of War weekly attempts

Weekly resource reset, not endgame rotation.

Future checklist scope only.

## 9. Current HSR recurring-endgame set

For calendar purposes:

### Core rotating combat endgame

1. Memory of Chaos
2. Pure Fiction
3. Apocalyptic Shadow
4. Anomaly Arbitration

### Seasonal/resettable progression worth tracking separately

5. Currency Wars: Zero-Sum Game

## 10. Safety / override rules

- Explicit current version notice > historical cadence.
- Do not publish MoC/PF/AS future ends from +42 days alone.
- Do not assume every phase uses server-local 03:59; current MoC proves global boundaries can occur.
- A version-duration adjustment may shorten phases without invalidating the base rotation.
- The 14-day rotation rhythm is a monitoring signal, not authoritative date data.
- Anomaly Arbitration follows version updates, not the Treasures Lightward rotation.
- Derived Anomaly Arbitration version-end deadlines must not be presented as direct official timing.
- Currency Wars season reset requires an explicit version/season end.
- Generate no infinite future series.

## 11. Required implementation tests

At minimum:

1. **Normal rhythm validation:** AS → PF → MoC expected starts are 14 days apart under normal schedules.
2. **Version 4.5 exception:** AS/PF 35-day durations are accepted without false conflict.
3. **MoC global boundary:** Stormcleanse remains one fixed global end, not region-scoped.
4. **AS regional boundary:** Celestial Lupine remains server-time region-scoped.
5. **PF regional boundary:** Domain Genesis remains server-time region-scoped.
6. **No +42 blind projection:** missing Version 4.6 MoC end is not invented.
7. **Missing-phase alert:** the expectation layer can flag that a MoC row is due around the Version 4.6 transition.
8. **Anomaly Arbitration classification:** no 14-day/42-day generator applies to it.
9. **AA provenance:** a version-derived end cannot silently become `official`.
10. **Currency Wars:** no reset deadline is created until an explicit Version 4.6 end exists.
11. **Bounded / source-driven feed:** no infinite recurring phase series.

## 12. Immediate handoff to Work

Priority:

1. Keep current MoC / PF / AS rows source-driven from HSRNews/official notices.
2. Add schedule-validation logic for the normal 14-day Treasures Lightward rotation, but do not use it as a future exact-date publisher.
3. Add **Anomaly Arbitration: Return of the Legion** to current endgame coverage with conservative version-linked timing/provenance.
4. When the full Version 4.6 update details land, ingest the new Memory of Chaos phase explicitly rather than deriving its end.
5. Add Currency Wars seasonal reset only after the Version 4.6 end boundary is officially available.
6. Preserve server-vs-global timing semantics independently per phase.
7. Run the standard four validation commands from `AGENTS.md`.
8. Smoke-test Timeline edges around:
   - Sep 28 Version 4.6 / current MoC boundary;
   - Oct 5 Apocalyptic Shadow end;
   - Oct 19 Pure Fiction end.

## Sources

Official / official-notice mirrors:

- Version 1.6 Pure Fiction / MoC rotation:
  https://www.hoyolab.com/article/23617910
- Version 2.3 Apocalyptic Shadow introduction:
  https://www.hoyolab.com/article_pre/15243
- Version 4.4 schedule:
  https://www.hoyolab.com/article/45851903
- Version 4.5 update:
  https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md
- Version 4.6 maintenance:
  https://github.com/KQM-git/HSRNews/blob/master/archive/1408.md
- Anomaly Arbitration introduction:
  https://www.hoyolab.com/article/41316670
- Currency Wars 4.6 reset notice:
  https://github.com/KQM-git/HSRNews/blob/master/archive/1421.md

Secondary corroboration:

- Prydwen Anomaly Arbitration:
  https://www.prydwen.gg/star-rail/anomaly-arbitration
- Icy Veins Anomaly Arbitration:
  https://www.icy-veins.com/honkai-star-rail/anomaly-arbitration-best-characters

Repository:

- `data/reviewed/hsr.json`
- `docs/research/coverage-hsr.md`
- `snapshots/hsr-kqm-hsrnews.md`
- `src/ingest/parsers/kqm-hsrnews.ts`
