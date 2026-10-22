# Wuthering Waves — daily reset audit

Checked **2026-10-22**. Research complete; **current clocks supported as correct**
by official daily-login evidence plus regional secondary corroboration.
No confirmed daily-clock bug; old guide conversions conflict and are recorded.

## Baseline

Main `e05fa8b64262b35607a6296171604f6eb79fedea`.
`GAMES.wuwa` inherits 04:00 on fixed +8/+1/−5. Inspected shared time/daily
code and tests; baseline helpers executed with Bun. Existing tests specifically
use WuWa day-precision event boundaries, so changing its clock also affects
event display/retention and cannot be treated as an isolated countdown edit.

## Evidence (checked 2026-10-22)

- **Official, recent:** [3.7 Prism's Illusion, Heart's Illumination, 2026-09-30](https://wutheringwaves.kurogames.com/en/main/news/detail/5571)
  indexed primary text explicitly says sign-in records refresh daily at
  04:00 server time. This proves daily sign-in, not a maintenance-time inference.
- **Official, content-specific:** [Wuthering Exploration: Whisperwind Haven](https://wutheringwaves.kurogames.com/en/main/news/detail/2432)
  explicitly says daily Survey Tasks refresh at 04:00 server time; it is an
  event clock and alone would not prove permanent Daily Activity.
- **Official server coverage:** [PS5 FAQ](https://wutheringwaves.kurogames.com/en/main/news/detail/1858)
  lists Asia, SEA, Europe, America and HMT; PSN region determines access.
  Search metadata renders its date incorrectly (“Jan 25, 2006”); do not use
  that as a publication date. The [community reproduction](https://wutheringwaves.gg/faq-playstation5/)
  describes the Jan 2025 release context. Primary direct opens were empty JS
  shells, so official facts here are attributed to indexed primary text.
- **Independent regional guide:** [WutheringWaves.gg server selection](https://wutheringwaves.gg/server)
  indexed page lists daily America 09:00Z, Europe 03:00Z,
  Asia/SEA/HMT 20:00Z. Its weekly EU summary cell disagrees with its own EU
  detail; that weekly typo does not establish a competing daily schedule.
  Direct fetch returned 403.
- **Recent independent daily-activity/DST corroboration:** [ResetClock, 2026-10-06](https://resetclock.org/wuthering-waves/daily-reset)
  explicitly maps Guidebook activity to 04:00 on −5/+1/+8, includes SEA/HMT,
  and distinguishes server-fixed offsets from reader DST. Other gameplay
  timers on that page were not validated.
- **Historical contradiction:** [The Escapist, launch-era reset guide](https://www.escapistmagazine.com/what-time-is-daily-reset-in-wuthering-waves/)
  gives Europe 11:00 CEST/10:00 BST (=09:00Z), conflicting with regional
  daily 03:00Z. It claims Discord attribution without exposing verified
  present-day clock evidence. [Prima's launch-era guide](https://primagames.com/gaming/wuthering-waves-daily-and-weekly-reset-times-explained)
  also has inconsistent regional conversions. Do not substitute those local
  tables for current regional corroboration. A historical policy-change date
  was **not** established.
- No live in-game countdown was captured; a current publisher page giving all
  regional daily UTC offsets together was not found. Thus regional confidence
  is corroborated secondary evidence, not an all-regions primary certification.

## Mapping and comparison

Opening of labelled server day **2026-10-23**:

| App Region | WuWa server | Local daily reset | Expected UTC | Code UTC | Assessment |
| --- | --- | --- | --- | --- | --- |
| america | America | 04:00 UTC−5 | Oct 23 09:00Z | same | supported correct |
| europe | Europe | 04:00 UTC+1 | Oct 23 03:00Z | same | supported correct; old guide conflict |
| asia | Asia | 04:00 UTC+8 | Oct 22 20:00Z | same | supported correct |
| asia (clock alias) | SEA | 04:00 UTC+8 | Oct 22 20:00Z | same | supported clock alias; label absent |
| asia (clock alias) | HMT | 04:00 UTC+8 | Oct 22 20:00Z | same | supported clock alias; label absent |

These clock aliases do not combine account progress or change the actual game
server. CN service routing was not separately verified. A resident playing a
different server must select that server's clock; auto-guessed location and
browser timezone are not proof of the selected game account.

**DST:** with the corroborated fixed map, EU Oct 24/26 remain 03:00Z
(Amsterdam 05:00→04:00); America Oct 31/Nov 2 remain 09:00Z
(New York 05:00→04:00). Asia/SEA/HMT remain 20:00Z on the preceding date.
These local examples are calculations. No evidence warrants a seasonal
`resetOffsets` change. Waveplate regeneration, maintenance, banner launches,
weekly/endgame cycles and in-world time are separate from daily activity.

## Day keys and migration implications

No proposed clock edit, hence **no migration**. At EU Oct 23
02:59:59.999Z key is Oct 22; at 03:00Z key is Oct 23, and nextResetMs
at the boundary is Oct 24 03:00Z. Moving EU to the old-guide 09:00Z
would change interpretation in 03:00–09:00Z and discard no stored bytes,
yet today/checkmark and streak anchoring could visibly change.

`dailyDays`, `catchUpDays`, `streakOf` and `dailySummary` consume keys/
windows and would require regression coverage, including exclusive end and
month/year boundaries. `dayStartMs` also resolves day-only source dates, and
`latestBoundaryMs` affects whether events are retained; preserve those semantics
unless separately reviewed.

Local logs store day strings and a last-edit `at`, not each completion instant.
Exports/import union strings. Guest/account profiles are isolated; Account Sync
keys `(subjectId, dayKey)` have no policy version. An edit timestamp cannot
reconstruct retrospectively recorded/imported days. Do not bulk rename or
duplicate historical marks; a future real change needs a forward cutover,
legacy import handling and two-device/offline verification. Changing Region
already changes interpretation without migrating logs. A new reader needs only
the actual server clock; label help can clarify SEA/HMT without changing keys.

**Next concrete step:** retain current WuWa clocks; if a regional countdown is
disputed, capture current Daily Activity timer + selected server + absolute UTC
to resolve it. Continue stage 7 (ZZZ), then synthesize the seven reports.
