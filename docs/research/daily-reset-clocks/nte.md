# Neverness to Everness — daily reset audit

Checked **2026-10-22**. Research complete; **conflicting/unverified core daily
clock**, with a confirmed server-selector coverage gap. No clock change justified
by the conflicting material alone.

## Code baseline

Main `e05fa8b64262b35607a6296171604f6eb79fedea`; `GAMES.nte` has no overrides.
`time.ts` therefore supplies 04:00 on UTC+8/+1/−5. `daily.ts` uses that
same shift for keys, resets and windows. `test/daily.test.ts` verifies generic
regional behavior, not independent NTE facts.

## Evidence, strength and conflicts

All links checked 2026-10-22.

1. **Official:** [Launch FAQ, 2026-04-27](https://nte.perfectworld.com/en/article/news/gamebroad/20260426/261931.html)
   explicitly identifies four independent servers: Asia, America, Europe, SEA.
   It does **not** publish their general daily UTC clocks.
2. **Official but content-specific:** [May 13 maintenance notice, 2026-05-12](https://nte.perfectworld.com/en/article/news/gamebroad/20260512/262144.html)
   says Zero's Companion Daily Quests and Whisker Patrol daily points reset at
   05:00 server time. These are named event systems; treating them as proof
   of the permanent Exploration Guide's reset would exceed the evidence.
   The 06:00–11:00 UTC+8 maintenance window is not a daily reset rule.
3. **Established secondary guide:** [Mobalytics, 2026-05-08](https://mobalytics.gg/neverness-to-everness/guides/daily-weekly-checklist)
   says permanent daily quests reset 05:00, listing EU GMT+2, Asia GMT+8,
   US GMT−5. It gives no winter/DST rule or primary clock attribution.
4. **Conflicting secondary regional table:** [Dexerto](https://www.dexerto.com/wikis/neverness-to-everness/server-status-and-daily-reset-times/)
   lists EU 05:00 BST / 06:00 CEST (=04:00Z) and NA 02:00 PT / 05:00 ET
   (09:00Z if summer, 10:00Z if winter). PT/ET alone cannot settle DST.
5. **Traceable but lower-confidence community synthesis:** [NTE Life](https://ntelife.kr/en)
   distinguishes player evidence: Asia 20:00Z, EU 03:00Z inferred against
   maintenance, NA provisional 09:00Z from 02:00 PDT. It explicitly leaves
   winter behavior unverified. Its response also varies the selected server
   by inferred IP location; repeated reads are not independent corroboration.
6. **Original community observation:** [EU maintenance comparison](https://www.reddit.com/r/NevernessToEverness/comments/1tbgcc3/comment/olhxmzu/)
   is linked by that synthesis. A report comparing a reset with one maintenance
   cannot establish year-round policy. No direct, timestamped in-game countdown
   with verified server was captured in this audit.
7. [Nerd's Chalk, 2026-05-04](https://nerdschalk.com/nte-daily-reset-guide-exact-timings-and-how-to-access-dailies-in-neverness-to-everness/)
   gives Asia/SEA 05:00 UTC+8, an America UTC−4 heading, and EU UTC+1 with
   wall-time entries that do not resolve consistently. This adds disagreement,
   not confidence.

**Conclusion:** do not majority-vote these sources into a global 05:00 override.
Official 05:00 event refresh is confirmed; the corresponding permanent daily
clock and year-round regional offsets remain unresolved.

## Explicit regional matrix

Absolute examples refer to the candidate opening of game day **2026-10-23**.
They are calculations of published claims, not observed resets.

| App Region | Actual NTE server | Code opening UTC | Competing core-daily claims | Status |
| --- | --- | --- | --- | --- |
| asia | Asia | Oct 22 20:00Z | 04:00/+8 → Oct 22 20:00Z; 05:00/+8 → Oct 22 21:00Z | conflicting |
| america | America | Oct 23 09:00Z | 02:00 PDT → 09:00Z; 05:00/−5 → 10:00Z | conflicting |
| europe | Europe | Oct 23 03:00Z | 03:00Z player inference; 05:00 BST → 04:00Z; 05:00/+2 → 03:00Z | conflicting |
| none | SEA | not representable explicitly | guides alias it to Asia; official FAQ says separate server | mapping unverified |

`asia` could be a clock alias for SEA only after its clock equivalence is proven;
it cannot express an independently selected SEA server today. This is a confirmed
model gap, not proof that the current Asia instant is incorrect. The app has one
profile-wide Region and cannot express mixed per-game regions.

## DST and uncertainty

No verified primary declaration of fixed versus seasonal NTE core clocks found.
For Oct 24 → Oct 26, a **fixed** EU 03:00Z clock stays 03:00Z (Amsterdam
05:00 → 04:00); a **05:00 Europe/Berlin wall clock** goes 03:00Z → 04:00Z.
A fixed NA 09:00Z clock stays unchanged across Nov 1; 05:00 New York goes
09:00Z → 10:00Z. The current numeric-offset code cannot express the latter
seasonal policies. Do not implement IANA zones from these hypotheses.

## Compatibility and proposed bounded follow-up

At Asia Oct 22 20:30Z the code labels Oct 23; a 05:00/+8 rule would label
Oct 22. A one-hour change would therefore affect keys in 20:00–21:00Z;
NA 09:00→10:00 affects 09:00–10:00Z; EU 03:00→04:00 affects 03:00–04:00Z.
These are conditional impacts, not approved corrections.

`DailyLog` has day strings and one last-edit `at`, with no original server,
policy version or per-day completion instant. Existing marks cannot be reliably
retimed. Changing the function does not physically rename them, but changes
doneToday, streak anchoring, catchUpDays, dailyDays and dailySummary counts.
Named login/event tasks may have their own clocks, so a single core-clock
correction must not silently assert every event shares it.

Guest/account profiles remain isolated. Sync keys `(subjectId, dayKey)`;
`changedAt` can describe catch-up/import and is not a completion timestamp.
Exports carry day strings; union import cannot infer the policy they came from.
Do not auto-shift/duplicate marks or infer a user's game server from location.
For an empty profile use the verified selected server when available; existing
profiles need an explicit forward-transition policy with old keys preserved.
Region changes already change interpretation without converting logs.

**Next concrete step:** collect permanent Exploration Guide countdowns paired
with selected server and absolute UTC on Asia/SEA/EU/NA, and before/after a DST
transition for western groups, or obtain publisher clarification. Specify any
correction separately. Continue stage 3 (CZN); this evidence gap does not block it.
