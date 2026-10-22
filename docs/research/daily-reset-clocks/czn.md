# Chaos Zero Nightmare — daily reset audit

Checked **2026-10-22**. Research complete; **confirmed discrepancy** between
the published 18:00 UTC daily schedule and all three current regional defaults.
No runtime constants, saved marks or Sync changed.

## Baseline

Main `e05fa8b64262b35607a6296171604f6eb79fedea`.
`GAMES.czn` has neither `resetOffsets` nor `resetHourLocal`.
`time.ts` supplies 04:00/+8,+1,−5; `daily.ts` consumes that shift.
Generic tests prove those calculations, not their accuracy for CZN.
Actual baseline helpers were executed with Bun during the audit.

## Evidence and access limits

All URLs checked 2026-10-22.

- **Official guide, indexed primary text:** [GM Renoa: Reset Time for Key Content, published 2025-10-22, title notes February amendment](https://page.onstove.com/chaoszeronightmare/en/view/11135950).
  Targeted search returns the explicit UTC+0 table: login/check-in and daily
  mission refresh at 18:00. Direct open returns a JavaScript shell; this Work
  verified the indexed primary excerpt, not a rendered full STOVE page.
- **Official Korean counterpart:** [content reset guide](https://page.onstove.com/chaoszeronightmare/kr/view/11135915)
  and [official guide listing](https://page.onstove.com/chaoszeronightmare/kr/list/142394).
  Indexed listing warns that unfinished daily/season-pass daily claims disappear
  at the next 03:00; the English guide resolves the absolute clock.
- **Independent full-text corroboration:** [GameWith, updated 2026-02-15](https://gamewith.net/chaoszeronightmare/71463)
  reproduces an explicit UTC+0 table with login and daily missions at 18:00,
  as well as daily Arkhianon tasks. Its Policy Office entry is a six-hour
  cycle: do not generalize the daily clock to every production timer.
- **Independent launch-era report:** [Destructoid, 2025-10-24](https://www.destructoid.com/all-chaos-zero-nightmare-daily-reset-times/)
  independently identifies 18:00 UTC and includes an in-game season-pass
  screenshot. Its 13:00 CT wording is seasonal display, not a fixed CST policy.
- **Recent consistency check, event-specific only:** [official Oct 21 update notice](https://page.onstove.com/chaoszeronightmare/en/view/14593128)
  is indexed with daily bonus opportunities at 18:00 UTC. This supports
  continuity but does not replace the permanent-content guide.
- No direct live in-game observation or primary account-routing/server-list
  documentation was obtained. Community prelaunch suggestions that Asia might
  reset earlier are speculation, not an alternative confirmed daily clock.

## Regional comparison

The published English service schedule supplies **one UTC instant**, not
America/Europe daily offsets. This is a clock conclusion; it does not mean all
regional account databases are one physical server. Asia/Global selection and
other service-specific routing should be named explicitly in a later UX task;
separate CN or unverified service clocks are not established here.

At audit probe **2026-10-22T12:00:00Z**:

| App Region | Published next daily reset | Actual current nextResetMs | Error |
| --- | --- | --- | --- |
| asia | 2026-10-22T18:00:00Z | 2026-10-22T20:00:00Z | 2 h late |
| europe | 2026-10-22T18:00:00Z | 2026-10-23T03:00:00Z | 9 h late |
| america | 2026-10-22T18:00:00Z | 2026-10-23T09:00:00Z | 15 h late |

Those are **next-deadline differences at this probe**, not universal signed
differences between adjacent dates. Both 18:00Z and current default schedules
recur every 24 hours; comparisons must state which occurrence/date is meant.
The app's geographic Region cannot represent a different CZN regional account
choice explicitly. For the verified UTC schedule, all three UI choices should
eventually share 18:00Z; changing browser timezone must not change that instant.

**DST:** a stated UTC+0 schedule is fixed, not a named seasonal zone.
Oct 24 and Oct 26 reset at 18:00Z; Amsterdam display changes 20:00→19:00.
Oct 31 and Nov 2 stay 18:00Z; New York display changes 14:00→13:00.
KST equivalent is 03:00 the following date. No server DST correction is indicated.

## Critical day-label distinction

Correcting the instant does not determine how to label its 24-hour interval.
Two representations of the same 18:00Z boundary differ by a day:

- UTC clock 18:00: `shift = -18h`; at Oct 22 19:00Z → key Oct 22.
- KST clock 03:00: `shift = +6h`; at Oct 22 19:00Z → key Oct 23.

Do not invent an offset solely to make default 04:00 hit the right instant.
Prefer an explicit daily-clock policy with documented label convention; a
03:00/+9 representation is a **candidate** if the Korean-date convention is
adopted and its applicability is documented. A UTC 18:00 representation is
another valid instant model but needs its own label decision. Do not change
`serverOffsetUtc` casually: it is a shared semantic API.

For a candidate KST-labelled policy, code at Oct 22 19:00Z currently returns
Oct 22 in all three regions, while the new key would be Oct 23.
Disagreement intervals within a UTC date would be Asia 18:00–20:00Z,
Europe 18:00–24:00Z plus 00:00–03:00Z, America 18:00–24:00Z plus 00:00–09:00Z.
For UTC-date labels these intervals/directions differ; migration cannot be
specified just as “move all days by one”.

## Persistence, streaks and safe plan

`DailyLogMap` stores `days: string[]` and a single last-edit `at` per subject.
It lacks original selected server, reset policy and per-day completion times.
Thus no lossless automatic conversion of historical ticks is possible.
Changing helpers leaves old bytes intact but changes today/doneToday, streak
anchor, catchUpDays, dailyDays event windows and dailySummary logged/remaining/
missed calculations. An event whose endpoint straddles a reset can gain/lose a
claimable day even without an event-ID change.

Exports preserve those strings; import unions them and may reintroduce legacy
interpretations. Guest and authenticated profiles are separate. Account Sync
uses `(subjectId, dayKey)`, versioned edits and completion tombstones, with no
clock version. `changedAt` is an edit time, including retrospective ticks and
imports, not a trustworthy completion instant. One-device key renaming can
produce duplicate marks or resurrection on another device.

Proposed separate implementation:
1. Decide and document CZN day-label semantics and the applicability of the
   published schedule to account groups; preserve IDs.
2. Scope the correction to daily-task clocks or explicitly review all shared
   consumers. `dayStartMs` also resolves day-precision event boundaries and
   `latestBoundaryMs` affects retention; a metadata-only change can alter
   event display/feed filtering despite unchanged source data.
3. New empty profiles can use the verified clock directly. Existing profiles
   need a deliberate forward-only cutover with old marks preserved and
   interpretable; do not bulk-shift, duplicate, clear or backfill history.
   Coordinate policy/cutover across account devices and legacy import before
   enabling it; do not silently operate mixed old/new clients.
4. Test reset−1ms/reset/reset+1ms, both candidate label examples, UTC month/year,
   browser timezone and Region invariance, dailyDays exclusive endpoint,
   catchUpDays, streakOf, dailySummary, old export/import and two-device Sync.
   Prove a fresh profile, guest/account isolation, offline retry and idempotent
   transition before any migration is approved.

**Next concrete step:** prepare one bounded CZN daily-clock correction task
with an explicit day-label/cutover policy; no implementation authorized by
this audit. Continue stage 4 (Genshin).
