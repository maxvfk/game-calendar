# Zenless Zone Zero — daily reset audit

Checked **2026-10-22**. Research complete; **current regional daily clocks
supported as correct**, with primary daily-login evidence and independent
daily-reset corroboration. No confirmed clock correction or migration.

## Baseline

Main `e05fa8b64262b35607a6296171604f6eb79fedea`.
`GAMES.zzz` inherits 04:00/+8,+1,−5 from shared time.ts; daily.ts uses the
same shift for dayKey and reset/window helpers. Inspected relevant tests and
executed baseline helpers with Bun. Passing generic tests alone is not
evidence of ZZZ's real schedule.

## Evidence and limitations

All URLs checked 2026-10-22.

- **Official daily login semantics:** [Version 3.0 New Stock in the Store, 2026-07-06](https://zenless.hoyoverse.com/en-us/news/165145)
  says Skyward Exploration Supply accumulates a login day after 04:00 server
  time each day. This is direct daily-login evidence, not just an event endpoint.
- **Official content-specific daily clock:** [Extensive Patrol: Triple Bounty](https://zenless.hoyoverse.com/m/en-us/news/165611)
  explicitly refreshes daily buffs at 04:00 server time.
  Neither sentence alone certifies every Errands subsystem.
- Official article facts above were read from indexed primary text; direct
  article opening returned an empty JS shell. No live game screen was observed.
- **Independent reporting:** [The Escapist, 2024-07-04](https://www.escapistmagazine.com/what-time-is-daily-reset-in-zenless-zone-zero-zzz/)
  explicitly lists America 04:00 GMT−5, Europe 04:00 GMT+1,
  Asia and TW/HK/MO 04:00 GMT+8. Its blanket advice to assume all HoYo games
  match is rejected; only this ZZZ-specific table is used.
- **Independent recent checklist:** [DailyReset ZZZ checklist, marked version 3.2](https://dailyreset.games/games/zenless-zone-zero/checklist/)
  explicitly associates daily Errands/activity with 04:00 server time.
  Its “verified in-game” label is the site's assertion, not our observation.
- **Secondary fixed-offset/DST corroboration:** [PrimoGuides](https://primoguides.com/reset-timers)
  lists ZZZ's −5/+1/+8 and TW/HK/MO alias, and says server offsets remain
  unchanged through reader DST. No publication date shown.
- **Errors in other references:** [Senpai Life](https://zzz.senpailife.com/schedule/)
  says America UTC+8 in a heading but gives PST/PDT 01:00/02:00,
  which instead implies 09:00Z. It also calls a summer 05:00 EU display “CET”
  rather than CEST. These internal conversion/label errors are not evidence
  for changing America's offset or introducing server DST.
  [Fandom Activity](https://zenless-zone-zero.fandom.com/wiki/Activity)
  states only 04:00 UTC+8 without regional scope; do not extrapolate it globally.
- [Game8 reset page](https://game8.co/games/Zenless-Zone-Zero/archives/460247)
  indexed table agrees on server-local 04:00, but direct fetch failed (402).
  A current publisher table of all regional daily UTC instants was not found.

## Region, UTC and DST comparison

Opening of game day **2026-10-23**:

| App Region | ZZZ server | Local reset | Expected absolute UTC | Code | Result |
| --- | --- | --- | --- | --- | --- |
| america | America | 04:00 UTC−5 | 2026-10-23T09:00:00Z | same | supported correct |
| europe | Europe | 04:00 UTC+1 | 2026-10-23T03:00:00Z | same | supported correct |
| asia | Asia | 04:00 UTC+8 | 2026-10-22T20:00:00Z | same | supported correct |
| asia (clock alias) | TW / HK / MO | 04:00 UTC+8 | 2026-10-22T20:00:00Z | same | supported clock; label absent |

The app's geographic labels alias selected game-server clocks; they do not
identify account databases. CN services were not separately audited.
Location, VPN, language and browser timezone do not prove the selected server.
A single profile-wide Region cannot express different choices across games.

With fixed offsets EU reset remains 03:00Z on Oct 24 and Oct 26
(Amsterdam 05:00 CEST→04:00 CET); America stays 09:00Z Oct 31 and Nov 2
(New York 05:00 EDT→04:00 EST). Asia remains 20:00Z on the preceding date.
These are calculated wall-time examples; primary all-region seasonal testing
was not performed. No supported evidence warrants moving the server clock.
New Eridu's Morning/Afternoon/Evening/Late Night and sleeping/advancing game
time do not reset real-world Errands. Maintenance, web check-in, Battery
regeneration and individual event delivery times remain separate.

## Persistence and safe action

Retain the current policy: **no migration**. Asia at Oct 22
19:59:59.999Z labels Oct 22; at 20:00Z labels Oct 23. nextResetMs at that
boundary returns Oct 23 20:00Z. An incorrect all-world Asia policy would
advance western day keys by many hours, while a summer “+1 hour fix” would
create an hour of disagreement without a real server change.

Historical logs contain `days[]` and one last-edit `at`, not per-tick
completion instants/server/policy. A changed clock alters doneToday,
dailyDays, catchUpDays, streakOf anchoring and dailySummary totals even though
stored strings remain. Exports/import union day strings, so history cannot
be reliably reconstructed from them. Guest/account profiles are isolated;
Sync keys `(subjectId, dayKey)` lack clock versions. Its `changedAt`
describes edits/catch-up/import, not necessarily actual completion.
Never rename or duplicate ticks based on those timestamps. Region changes
already change clock interpretation without converting saved history;
new readers need the actual server selected.

Any real future correction needs tests for reset±1ms, UTC month/year,
exclusive dailyDays ends, catch-up, streaks, summary, legacy import/export,
offline operation and two-device Sync. Display/alias clarification can avoid
all key changes and should emit no account-mark mutations.

**Next concrete step:** retain ZZZ clocks; only investigate a concrete
server-tagged in-game countdown discrepancy if one is reported. Stage 7 is
complete; proceed to the consolidated comparison and bounded proposal.
