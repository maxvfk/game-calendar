# ZZZ Shiyu / Deadly Assault re-anchoring — 2026-10-27

Baseline: main `103d746` after #109/#110 and the latest snapshot refresh.
No parallel recovery PR or active ZZZ recurrence rule was present.
Scope is these two rotating modes; no banner/source-ingestion research is included.

## Evidence gate — Shiyu: PASS, official transition plus current corroboration

The canonical [Version 2.4 notice](https://zenless.hoyoverse.com/en-us/news/161086)
changes Phase II's end from 2026-01-02 03:59 to 2025-12-29 14:59 server time.
This is now matched to the official URL, rather than relying on the secondary
Zenless.gg reproduction. The [Version 2.5 notice](https://zenless.hoyoverse.com/en-us/news/161728)
then ends its transitional Critical Node Phase I on 2026-01-09 03:59 server time
and explicitly gives the following two phases normal 14-day durations.
Thus the regular post-transition reset anchor is **2026-01-09 04:00 server time**.
No duration of the shortened transitional cycles is projected.

Retrieval on 2026-10-27: direct web open of the official site returned an empty
JS shell. The canonical first-party pages' search-indexed text was readable,
including the contiguous Critical Node / Phase I date and 14-day clause in 2.5,
and the amendment in 2.4. This is first-party indexed evidence, not a claim of
raw runner HTML access or a new supported ingestion transport. No UA trick,
undocumented API, robots or access-control workaround was used.

The [Icy Veins guide](https://www.icy-veins.com/zenless-zone-zero/shiyu-defense-critical-node)
was directly read. Its dated changelog corroborates January 23 and the September
18, October 2 and October 16 resets; its current FAQ gives October 30 next.
Its January 10 update is an editorial update date, not claimed as a January 10
reset. The exact January 9/23 archive pages were not readable (Fandom access
restriction); indexed category listings provide secondary archive labels only.

Arithmetic from January 9 (all server calendar days): January 23 = +14;
September 18 = +252; October 2 = +266; October 16 = +280; October 30 = +294.
All are integer multiples of 14. The obsolete 2025-01-03 anchor is seven days
out of phase with these 2026 dates.

**Rule decision:** source transition/anchor `2026-01-09`, 14 days, 04:00 reset;
production **effectiveFrom `2026-10-16`**, the currently corroborated cycle.
This conservative publication gate does not claim the official rule changed in
October and avoids backfilling intervening historical exceptions.
The rule basis is official, but generated current/future rows are explicitly
**estimated projections**, confidence 0.9, not individually announced cycles.
They retain the official rule notice as sourceUrl. Current October 16–30
has independent observational corroboration.

## Evidence gate — Deadly Assault: PASS for estimated recurrence only

No first-party notice fixing the new 2026 phase was located. The historical
[1.4 notice](https://www.hoyolab.com/article/35654082) is the previously researched
Friday/04:00/14-day clock, not proof of the active phase. A fresh direct open
returned only Loading; it is not represented as newly read body evidence.

Independent dated evidence read on 2026-10-27:

- [Mobalytics, Lin-0, updated January 26, 2026](https://mobalytics.gg/zzz/teams/linnull-ye-shunguang-dialyn-zhao):
  explicitly labels January 2–16, January 16–30 and January 30–February 13
  showcases. This confirms the January 16 phase without treating wiki labels
  alone as an official anchor.
- [Icy Veins Deadly guide](https://www.icy-veins.com/zenless-zone-zero/deadly-assault):
  dated August 28 update, Friday biweekly rule and August 28–September 10
  availability. Its final playable-day label corresponds to the September 11
  04:00 reset, rather than an extra inferred day.
- Existing September 11–25 reviewed row and the earlier user Europe-server
  countdown are retained as previously documented observations, not relabelled
  official. No new screenshot from the operator is claimed.
- [Team Forge current rotation](https://labz55.com/zzzteamforge/en/deadly-assault):
  explicitly labels October 23–November 6, 2026.
- [Dated community discussion](https://www.reddit.com/r/ZZZ_Discussion/comments/1xcxrld/deadly_assault_331_20261023_discussion/):
  independently identifies the October 23 rotation and contains players' reports.
  A community subreddit, including one named Official, is not a publisher notice.

January 16 → September 11 = 238 days (17 cycles); → October 23 = 280 (20);
→ November 6 = 294 (21). October 23 → November 6 is explicitly corroborated,
not inferred solely from alternating Shiyu weeks. The old 2025-01-10 anchor
projects September 4 / October 16 instead, so it is rejected.

**Rule decision:** observational anchor `2026-01-16`; **effectiveFrom
`2026-10-23`** for production generation. This is the first current cycle
accepted by this gate, not a claim that a publisher changed the schedule that day.
Older inferred history is not generated or rewritten. SourceUrl is the secondary
Team Forge page that actually supplies the accepted current window. All rows
are **estimated**, confidence 0.75, including exact reset-derived regional clocks.
An official 2026 phase-change notice and its causal effective date remain unknown;
this does not justify labelling the observed recurrence official.

## Exceptions and limits checked

Targeted searches checked 2.4/2.5 and newer adjustment wording. The stored
first-party Steam 3.0–3.3 notices were inspected for dated changes in the two
endgame sections; their phase lineups/buffs do not establish new reset dates.
No newer dated contradictory rule was found; absence in these checks is not
proof that no future exception can occur. Icy Veins' July 7 changelog entry
calls that date a reset, which does not align with the January 9 lattice;
June 26 and July 24 entries do align. Whether this is an editorial typo or an
intermediate exception was not established. It is explicitly not used to
assert uninterrupted January→October recurrence. Both production rules start
at their separately corroborated October cycles. Older interrupted cycles
must not be retroactively flattened into uninterrupted 2025→2026 cadence.

HoyoBuild's directly read page exposes static server offsets, but its reset
countdowns rendered as placeholders; unseen countdown values were not evidence.
An indexed LaQoos page labels Shiyu October 15–29 while other sources label
server days October 16–30. This could be UTC-date normalization, but that cause
was not verified; it is excluded from exact Shiyu anchoring. Its Deadly labels
agree with October 23–November 6 but are not needed to pass the gate. Restricted
Fandom article bodies and the unavailable Zenless.gg reproduction were not bypassed.
No new in-game absolute capture was obtained. Operator verification is requested.

## Implementation contract from the evidence

Use existing ResetRule/fixedResetCycles/recurringEndgame, a 70-day **start** horizon
and deadline-aware inclusion of the ongoing cycle. Exclude expired ZZZ rotations
once every region has passed its end; preserve other games' window behavior.
Server-local starts stay day precision. Ends are inclusive 03:59, with fixed
Asia UTC+8 / Europe UTC+1 / America UTC−5, not viewer time or DST.

Use the existing `Mode (Mon D)` title convention, unchanged eventId function and
server opening date, preserving September completion keys. Explicit sourced rows
must beat generated projections without a fabricated corroboration confidence
bonus. Any exact regional mismatch, even for estimated records, must remain a
visible merge conflict and freeze that mode's other projections until a newly
reviewed effective rule is supplied. Other recurring schedules remain unchanged.

**Next concrete step after delivery:** ZZZ Banner Recovery B1, separate Work.
No other endgame mode is authorized by this evidence.
