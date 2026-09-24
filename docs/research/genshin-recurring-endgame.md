# Genshin Impact — recurring endgame calendar research

**Status:** implementation-ready for Spiral Abyss and Imaginarium Theater monthly recurrence; Stygian Onslaught is version-controlled with an exact 10-day Disturbance Outbreak sub-window  
**checkedAt:** 2026-09-24  
**baseline main SHA:** `4a24fe09ffdbe983c7fbbe7615f4d2556dc6e51a`

## Why this exists

The current Genshin calendar already has a reviewed Stygian Onslaught row and an upcoming Imaginarium Theater row, but it does not model the three main recurring combat endgame systems consistently:

- Spiral Abyss — Abyssal Moon Spire;
- Imaginarium Theater;
- Stygian Onslaught.

These three systems use two different scheduling models:

1. **calendar-month recurrence**
   - Imaginarium Theater resets on the **1st day of every month**;
   - Spiral Abyss resets on the **16th day of every month**;
2. **version-controlled recurrence**
   - Stygian Onslaught receives a new phase per game version, with dates published for that version;
   - its Disturbance Outbreak is an exact **10-day sub-window** at the beginning of the Stygian phase.

Do not force all three into one fixed `cadenceDays` implementation.

## Evidence hierarchy

Primary / official:

- Version 4.7 update details established the post-4.7 schedule:
  - Imaginarium Theater automatically resets on the first day of every month;
  - Abyssal Moon Spire resets monthly with a new Lunar Phase on the sixteenth day.
  - https://www.hoyolab.com/article/29513513
- Current Version 7.1 update details confirm the live pattern:
  - a new Spiral Abyss phase becomes available on October 16;
  - a new Imaginarium Theater season becomes available on November 1.
  - canonical update notice: https://genshin.hoyoverse.com/en/news/detail/166383
- Current Version 7.1 event overview / reviewed data:
  - Stygian Onslaught: Sep 30 → Nov 3;
  - Disturbance Outbreak ends Oct 10 at 03:59 server time.
  - https://genshin.hoyoverse.com/en/news/detail/166200
- Official Stygian Onslaught event notice example:
  - full event period;
  - Disturbance Outbreak is the first 10 days from challenge availability.
  - https://www.hoyolab.com/article/44016747

Strong secondary / historical corroboration:

- subsequent Spiral Abyss cycles consistently use 04:00 server-time monthly boundaries;
- subsequent Imaginarium Theater seasons consistently use 04:00 server-time monthly boundaries after the special launch season;
- current community calendars agree with the 1st / 16th monthly schedule.

The monthly day rules themselves are official. The exact recurring **04:00 server-time clock** is strongly corroborated by live/historical season data; if the implementation requires source-level distinction, keep that clock tagged as derived/corroborated until a current first-party rules page explicitly prints the clock.

## 1. Spiral Abyss — Abyssal Moon Spire

### Rule

Starting after Version 4.7, Abyssal Moon Spire resets **once per month**, with a new Lunar Phase on the **16th day of every month**.

This is a **calendar recurrence**, not a fixed number of days.

Recommended rule:

```text
game: genshin
mode: spiral-abyss
recurrence: monthly
dayOfMonth: 16
resetTime: 04:00
timeBasis: server
regionScoped: true
```

Do not implement this as `cadenceDays: 30` or `31`.

### Current cycle

At checkedAt 2026-09-24, the active cycle is:

```text
2026-09-16 04:00 server time
→ 2026-10-16 03:59 server time
```

The next cycle begins:

```text
2026-10-16 04:00 server time
```

This is independently confirmed by the Version 7.1 update notice, which explicitly announces the October 16 Spiral Abyss update.

### Regional ends

Using the existing Genshin server-time mapping:

```text
Asia end:    2026-10-15T19:59:00Z
Europe end:  2026-10-16T02:59:00Z
America end: 2026-10-16T08:59:00Z
```

Use `endPrecision: exact` and `regionScoped: true`.

If the schema still lacks region-specific starts, a day-precision start is acceptable; the deadline is the critical field.

## 2. Imaginarium Theater

### Rule

Official Version 4.7 details state that Imaginarium Theater automatically resets on the **first day of every month**.

Subsequent seasons use the normal daily-reset clock, i.e. **04:00 server time**.

Recommended rule:

```text
game: genshin
mode: imaginarium-theater
recurrence: monthly
dayOfMonth: 1
resetTime: 04:00
timeBasis: server
regionScoped: true
```

Again: calendar recurrence, not `cadenceDays`.

### Special launch exception

The very first Imaginarium Theater season launched on:

```text
2024-07-01 10:00
```

That was a launch exception.

Do not back-propagate the normal 04:00 recurring rule onto the first season.

### Current and next seasons

At checkedAt 2026-09-24:

```text
current:
2026-09-01 04:00
→ 2026-10-01 03:59 server time

next:
2026-10-01 04:00
→ 2026-11-01 03:59 server time
```

The current reviewed data already contains:

`Imaginarium Theater — October 2026 Season`

but with:

```text
startsAt: 2026-10-01T00:00:00Z
startPrecision: day
endsAt: null
```

That row is under-specified.

Recommendation:

- preserve its stable ID/title;
- add exact regional end derived from the monthly reset rule;
- do not leave `endsAt:null` for a mode whose next reset day is deterministic.

For the October season:

```text
Asia end:    2026-10-31T19:59:00Z
Europe end:  2026-11-01T02:59:00Z
America end: 2026-11-01T08:59:00Z
```

The Version 7.1 official update independently confirms that the next season starts on November 1.

## 3. Spiral Abyss + Theater relationship

Together they create a predictable twice-monthly Genshin endgame rhythm:

```text
1st  — Imaginarium Theater reset
16th — Spiral Abyss reset
1st  — Imaginarium Theater reset
16th — Spiral Abyss reset
...
```

Do not encode this as one synthetic 15/16-day alternating recurrence.

Store two independent calendar-month rules.

Reasons:

- month lengths differ;
- leap years exist;
- one mode may be rescheduled without changing the other;
- independent rules are easier to audit.

## 4. Stygian Onslaught

Stygian Onslaught is not a monthly fixed-date recurrence.

Its periods are tied to game versions and official event notices.

Observed live pattern:

- each new version receives a new Stygian phase;
- the phase begins after the version has already launched;
- the phase runs until late in / near the end of that version;
- exact dates are published per phase.

Implementation classification:

```text
Stygian Onslaught:
  version-controlled
  explicit official period required
  no fixed day-of-month rule
  no generic +35/+42 day projection
```

Do not generate future Stygian phases merely because recent ones often start roughly one week after a version update.

### Current Version 7.1 phase

Current reviewed row:

`Stygian Onslaught — Version 7.1`

Official calendar window:

```text
Sep 30 → Nov 3
```

The row already has an exact regional end corresponding to:

```text
Nov 3 03:59 server time
```

Keep that exact regional end.

The start is currently day precision. That is conservative and acceptable until the exact event-specific start clock is captured from the detailed notice.

## 5. Disturbance Outbreak — separate deadline

Disturbance Outbreak is the most important recurring sub-deadline inside Stygian Onslaught.

Official rule:

> During the **first 10 days** from when the challenge becomes available, the Ley Line disturbance is in the Outbreak state.

After it ends:

- Resin can no longer be spent there to claim the selected Domain of Blessing rewards;
- Dire Prestige accumulation from that farming window ends;
- the main Stygian combat challenge remains available.

Therefore the calendar should **not hide this deadline only inside the Stygian summary text**.

Recommended representation:

```text
Stygian Onslaught — Disturbance Outbreak
type: challenge (or future resource-deadline subtype)
parent/context: current Stygian phase
exact regional end
```

Current Version 7.1 Disturbance Outbreak:

```text
ends Oct 10 03:59 server time
```

Region ends:

```text
Asia:    2026-10-09T19:59:00Z
Europe:  2026-10-10T02:59:00Z
America: 2026-10-10T08:59:00Z
```

This is a higher-priority practical deadline than the full Stygian Nov 3 end for players who care about the artifact/Dust farming window.

### Generation rule

The sub-window may be generated from a **sourced current Stygian start** plus the official 10-day rule.

Do not generate a future Outbreak unless the parent Stygian phase itself has a sourced start.

## 6. No fourth core recurring combat endgame identified

Other repeatable systems exist, but they should not be mixed into this implementation:

- `To Temper Thyself and Journey Far` — recurring training/event progression, already tracked separately;
- Battle Pass — version-cycle progression, not core combat endgame;
- Trounce Domains — weekly resource reset/checklist item, not endgame timeline;
- Genius Invokation / Forge Realm content — separate TCG scope;
- temporary combat events — normal events, not recurring endgame system.

For this recurring-endgame milestone, the core set is:

1. Spiral Abyss
2. Imaginarium Theater
3. Stygian Onslaught
4. Disturbance Outbreak as a Stygian sub-deadline

## 7. Recommended schedule model

Genshin needs at least two schedule primitives.

### Calendar-month recurrence

Conceptually:

```ts
interface MonthlyServerReset {
  kind: "monthly-server-reset";
  game: "genshin";
  modeId: string;
  dayOfMonth: 1 | 16;
  resetTime: "04:00";
  timeBasis: "server";
  regionScoped: true;
  effectiveFrom: string;
  sourceUrl: string;
}
```

Use for:

- Imaginarium Theater;
- Spiral Abyss.

### Version-controlled period

Conceptually:

```ts
interface VersionControlledChallenge {
  kind: "version-window";
  game: "genshin";
  modeId: "stygian-onslaught";
  startsAt: sourced boundary;
  endsAt: sourced boundary;
  sourceUrl: string;
}
```

Optional child/sub-deadline:

```text
Disturbance Outbreak:
  first 10 days of sourced Stygian period
```

## 8. Stable IDs

Existing reviewed IDs must be preserved.

Important existing row:

`Imaginarium Theater — October 2026 Season`

Do not remint its ID merely because recurrence logic adds a real end.

For newly generated Spiral Abyss rows, prefer stable period-start identity, for example:

```text
genshin:spiral-abyss:2026-09-16
genshin:spiral-abyss:2026-10-16
```

For Theater:

```text
genshin:imaginarium-theater-october-2026-season:2026-10-01
```

For Disturbance Outbreak, bind identity to the parent Stygian cycle start/version rather than to boss names.

## 9. Safety / override rules

- Explicit newer HoYoverse notice overrides standing recurrence.
- Do not encode monthly modes as 30-day cadence.
- Preserve the July 2024 Theater launch exception.
- Server-time monthly resets are region-scoped.
- Stygian is version-controlled; do not infer future phase dates from prior version length.
- Disturbance Outbreak may be derived only from a sourced Stygian start.
- If a future official schedule moves an Abyss/Theater reset, record an effective-date override rather than rewriting history.
- Generate only a bounded horizon.

## 10. Required implementation tests

At minimum:

1. **Spiral monthly rule:** Sep 16 → Oct 16 → Nov 16 using calendar months, not fixed days.
2. **Theater monthly rule:** Sep 1 → Oct 1 → Nov 1.
3. **February handling:** Theater/Abyss generation remains correct across 28/29-day February.
4. **Theater launch exception:** Jul 1 2024 first season is not rewritten to the normal 04:00 rule.
5. **Exact regional Spiral end:** Oct 16 03:59 server maps correctly to Asia/EU/NA.
6. **Exact regional Theater end:** Nov 1 03:59 server maps correctly to Asia/EU/NA.
7. **ID stability:** enriching the existing October Theater row does not change its published ID/completion state.
8. **Stygian not fixed cadence:** no future phase is generated from +35/+42 days.
9. **Disturbance 10-day rule:** current Version 7.1 outbreak ends Oct 10 03:59 server time.
10. **Parent gate:** no Disturbance row exists without a sourced Stygian parent period.
11. **Bounded generation:** no infinite monthly series enters the feed.

## 11. Immediate handoff to Work

Priority:

1. Add monthly calendar recurrence support for **Spiral Abyss**: 16th, 04:00 server time.
2. Add monthly calendar recurrence support for **Imaginarium Theater**: 1st, 04:00 server time.
3. Publish current + bounded upcoming cycles with exact regional deadlines.
4. Enrich the existing October 2026 Theater row instead of replacing/reminting it.
5. Keep **Stygian Onslaught** version-controlled from official period notices.
6. Add **Disturbance Outbreak** as a separately visible current deadline ending Oct 10 03:59 server time.
7. Do not derive future Stygian phases from version cadence.
8. Run the standard four validation commands from `AGENTS.md`.
9. Smoke-test the daily Timeline around:
   - Oct 1 Theater reset;
   - Oct 10 Disturbance Outbreak end;
   - Oct 16 Spiral Abyss reset.

## Sources

Official:

- Version 4.7 update details — establishment of monthly Theater/Abyss schedule:
  https://www.hoyolab.com/article/29513513
- Version 7.1 update details — current October 16 Abyss / November 1 Theater confirmation:
  https://genshin.hoyoverse.com/en/news/detail/166383
- Version 7.1 event overview:
  https://genshin.hoyoverse.com/en/news/detail/166200
- Official Stygian Onslaught notice example / 10-day Outbreak rule:
  https://www.hoyolab.com/article/44016747

Repository:

- `data/reviewed/genshin.json`
- `docs/research/coverage-genshin.md`
- `snapshots/genshin-kqm-ginews.md`

Historical corroboration:

- Genshin Impact Wiki Spiral Abyss cycle history
- Genshin Impact Wiki Imaginarium Theater change history
