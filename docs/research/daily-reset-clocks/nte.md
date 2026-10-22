# Neverness to Everness — daily reset audit

Checked **2026-10-22**. Research complete; **conflicting/unverified core daily
clock**, with a confirmed server-selector coverage gap. No clock change justified
by the conflicting material alone.

Latest: [focused NTE follow-up](#focused-follow-up--2026-10-22) from CURRENT main
`581d36f25e05dcfebc726ca07118492bd2cd9bd5`. Earlier evidence below is retained
as the original audit, not a second research pass over the other six games.

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
correction separately. All seven original stages are already complete; only the
NTE evidence gap is continued below.


## Focused follow-up — 2026-10-22

**Outcome:** no specific wrong NTE permanent-task UTC boundary is proved.
New material weakens the inference that every “05:00” means the app is one hour
early. Asia **20:00Z** has additional contextual support; **SEA 21:00Z** is a
separate candidate supported by weekly-reset testimony, not a verified permanent
Exploration Guide rule. Exact server-clock offsets and western DST remain open.
No NTE clock implementation Work is justified yet.

### New evidence capable of distinguishing the claims

All URLs below were read on **2026-10-22 UTC**. Dates in this table are source
publication/display dates, not independently captured reset instants.

| Evidence / date | What was actually found | Strength and limit |
| --- | --- | --- |
| [GameWith date-change guide](https://gamewith.jp/nte/559197), updated May 4 13:07 | Explicitly associates daily 05:00 with permanent Exploration Guide quests; separately lists Monday 05:00 weekly refresh | Established secondary source, directly relevant system; selected server and timezone are not stated in that rule |
| [Game8 JP daily checklist](https://game8.jp/nte/783229), updated June 13 15:39; [Kamigame](https://kamigame.jp/nte/page/420083953597195154.html), updated Oct 21 09:33 | Both explicitly name the permanent Guide's daily missions and 05:00 | Secondary corroboration of the system/hour, not independent proof of server offset. Game8's Guide screenshot was visually inspected: it has a remaining-time counter but no paired UTC capture clock or selected server |
| [Personal playing/time diary](https://sibafu.hatenablog.com/entry/social-clock1), June 20 | Author describes NTE daily renewal at 05:00 within an explicitly Japanese-standard-time account of their own routine | First-person contextual testimony; no server selection, dated boundary observation or countdown pair |
| [Archived original Futaba discussion](https://tsumanne.net/si/data/2026/06/08/10682231/), June 8 | Post No.1438077079, displayed 23:32:24, distinguishes 05:00 game-day rollover from a 06:00 event start; surrounding posts explicitly discuss JST event notices | A dated original community statement, useful against conflating event and day clocks. Anonymous, server unspecified; displayed post timestamp has no UTC offset and is not the observed reset time |
| [Inven original reset post](https://www.inven.co.kr/board/nte/6518/52), Minno, April 30 11:11 | Gives 05:00 reset and Monday 05:00 City Stamina rule | Original Korean community guide; reading this as KST is contextual inference, not an explicit timezone/server declaration. Later Korean summaries citing it are not new independent observations |
| [Original SEA Fons discussion](https://www.reddit.com/r/NevernessToEverness/comments/1tzt32w/late_double_fons_event/) | SEA player reports using refreshed City Stamina at 05:00 UTC+8; Fluffypecker explicitly calls that SEA reset time; discussion distinguishes delayed event start at 06:00 UTC+8 | Primary player testimony with explicit region/offset, hence **21:00Z candidate**. The observed reset is weekly City Stamina; permanent Guide rollover is not separately demonstrated |
| [Original NA daily-reset question](https://www.reddit.com/r/NevernessToEverness/comments/1syqt8n/when_does_daily_server_reset_for_na/) | brainrotter1993 answers 02:00 PDT, equivalent to 09:00Z | Traceback of the original audit's provisional NA claim, not new independent confirmation. No captured rollover; other replies explicitly speculate from another game/CN or an AI guess and are excluded |

The [English Game8 guide](https://game8.co/games/Neverness-to-Everness/archives/598313)
claims 05:00 server time with Asia UTC+8 (21:00Z), while the Japanese permanent-task
guides say 05:00 without a zone. Their page count does not settle the contradiction.
**Inference only:** 05:00 **JST/KST (UTC+9)** equals 20:00Z on the preceding
UTC date, exactly the app's 04:00 UTC+8 boundary. A local Japanese “05:00” is
therefore not evidence for changing `resetHourLocal` to 5. Conversely, the
explicit SEA “05:00 UTC+8” cannot be silently translated to 20:00Z.

A weaker [SEA heist discussion](https://www.reddit.com/r/NevernessToEverness/comments/1v15377/cant_enter_pink_paws_heist/)
reports “3AM IST” (21:30Z previous date). It concerns a biweekly heist reopening
problem, not a measured Guide reset. Do not round it into 21:00Z or infer an
actual half-hour daily policy. Relative-countdown comparisons between comments
also lack synchronized capture timestamps and cannot certify regional differences.

### Official boundary of what is known

The freshly read [Japanese launch FAQ](https://nte.perfectworld.com/jp/article/news/gamebroad/20260427/261937.html)
confirms **four independent servers with no shared game progress**, not four
physical data-centre locations or UTC offsets. It gives production launch as
April 29 12:00 JST. It does not map Japanese language or residence to a mandatory
Asia server. Asia and SEA must remain separate pending clock evidence.

The [Japanese May 13 notice](https://nte.perfectworld.com/jp/article/news/gamebroad/20260512/262141.html)
expressly calls the event refresh **05:00 server time**, while other event dates
are labelled JST. That is not a statement of 05:00 JST, does not define server
UTC offsets, and still scopes the rule to Zero's Companion / Whisker Patrol.
No new official permanent-Guide reset or fixed-versus-seasonal policy was found
in the targeted English/Japanese/Korean searches. Failure to find one is an
access/evidence limit, not proof that no such publisher statement exists.

The rendered Reddit sources expose relative ages, not absolute UTC creation or
capture timestamps. JSON retrieval was unavailable/forbidden; no raw UTC metadata
was recovered. The archived forum and diary add calendar-dated testimony, but
**no new source closes the complete chain: selected server + permanent Guide
transition + absolute UTC observation**. No game session was observed directly.

### Refined regional assessment against CURRENT main

No runtime clocks changed since the original baseline. Read-only execution of
`src/shared/daily.ts` / `time.ts` at **2026-10-22T12:00:00Z** gives:

| Actual server | App Region / next reset from probe | Best permanent-daily UTC evidence now | Exact server offset / DST verdict |
| --- | --- | --- | --- |
| Asia | `asia` → Oct 22 20:00Z | Japanese permanent-task guides and personal local-time testimony are compatible with **20:00Z** if JST/Asia; English 21:00Z claim remains | Not certified; 04:00/+8 and 05:00/+9 imply the same instant, so offset/hour cannot be recovered independently from that instant |
| SEA | No selector; choosing `asia` would give Oct 22 20:00Z | **21:00Z candidate** from explicit SEA weekly reset; ordinary Guide reset still unmeasured | Separate official server; neither clock alias to Asia nor a one-hour permanent-task error is proved |
| Europe | `europe` → Oct 23 03:00Z | Original maintenance-linked player inference remains **03:00Z**, compatible with code for the reported period | Fixed +1/04:00 versus seasonal +2/05:00 remains unresolved; secondary alternatives do not decide it |
| America | `america` → Oct 23 09:00Z | Original 02:00 PDT answer supports **09:00Z** for the reported period | Fixed −5/04:00 versus seasonal −4/05:00 remains unresolved; no winter observation |

For each of those three app boundaries the executed `dayKey` returns Oct 22 at
reset−1ms and Oct 23 at reset and reset+1ms. These are verified **code outputs**,
not game facts. Browser display timezone does not change those fixed instants.
A distinct SEA option is a confirmed coverage gap already identified in the
original audit; its correct permanent-task clock is not yet specified.

Production launched after the northern spring transitions; as of this audit,
its first production EU/US autumn transitions are still ahead. Summer-only
reports cannot establish winter policy. Calculations with runtime `Intl` confirm
the discriminating observations already proposed: EU Oct 24 / Oct 26, and NA
Oct 31 / Nov 2. Fixed 03:00Z EU displays 05:00 CEST then 04:00 CET; a constant
05:00 Berlin wall rule would instead move to 04:00Z. Fixed 09:00Z NA displays
05:00 EDT then 04:00 EST; a constant 05:00 New York rule would move to 10:00Z.
These are hypotheses to distinguish, not evidence NTE uses either IANA zone.

### Exact remaining observations and implementation gate

1. For **each of Asia, SEA, Europe, America**, record the actual selected server
   and permanent Exploration Guide daily panel, on an ordinary non-maintenance
   day. Pair a synchronized `YYYY-MM-DDTHH:mm:ssZ` capture clock with the remaining
   timer; repeat several minutes later. Record timer precision and uncertainty.
2. Capture the same panel immediately before and after its predicted rollover:
   daily activity/rewards/tasks must actually renew. For Asia and SEA, cover both
   **20:00Z and 21:00Z** on the same UTC date; do not substitute event availability
   or weekly stamina. Mask account identifiers in any evidence published later.
3. Repeat EU and America measurements on both sides of the autumn changes above,
   or obtain an explicit publisher policy for every named server. A publication
   timestamp alone, “server time” without an offset, or unlabelled phone 05:00
   cannot distinguish fixed UTC from seasonal time.
4. Verify related systems (pass missions, pond, fortune, gifts) separately before
   claiming a shared boundary. Ask any future publisher clarification to name
   permanent Guide refresh, all four UTC instants, server-clock offsets and DST.
   No support message was sent by this Work.

**Migration consequence unchanged:** no correction or migration is currently
supported. A later verified SEA 20→21 or western +1h change would alter the
conditional dayKey intervals documented above and affect today's marks/streaks,
catch-up, event day windows and Sync subject/day identities. Neither log `at`
nor Sync `changedAt` reconstructs original completion instants or selected server.
Preserve stored day strings, exports and account isolation; design a separately
reviewed forward transition before implementing any clock/selector policy.
A reset instant alone also does not establish the game's displayed date label.

**Delivery checks:** frozen Bun 1.3.14 install, typecheck, full tests (**1110 pass,
1 existing optional age skip, 0 fail**) and build passed; NTE-only read-only
helper/`Intl` probe passed. Changes are confined to this report, its synthesis
index and implementation status. Other six game reports and all runtime/data/
Account Sync surfaces remain untouched. Hosted checks and merge are recorded
in the delivery PR.
