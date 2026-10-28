# Chaos Zero Nightmare — Source and Event Coverage Audit (2026-10-28)

**Status:** RESEARCH ONLY / NO EVENT IMPLEMENTATION. **Baseline:** current `main` `40fdf885d615`. This completes the **seventh per-game audit** after HSR, Genshin, WuWa, Endfield, ZZZ and NTE.
**Scope:** current Sept 30 / Oct 21 Season 5 and 1st Anniversary notices, currently active/announced banners, limited rewards and seasonal challenge cycles. Historical reviewed events are checked for misleading carryover, but this is not an all-time archive. Independent Daily Reset production cutover is NOT part of this audit.

## Executive conclusion

**FULL EVENT COVERAGE: FAIL. The only scheduled CZN automatic adapter is a HEALTHY BANNER-ONLY third-party source.** Events outside banners are not automatically discovered. Recent official STOVE notices announce numerous expiring gameplay, event, 1st Anniversary and reward windows that are not represented in either the reviewed batch or the banner parser. A narrowly accepted official-event source and/or source-backed reviewed-data restoration is required; not a Prydwen transport fix.

- `czn-prydwen-banners` captured `snapshots/czn-prydwen-banners.html`: **10 current/upcoming** candidate cards, `lastConfirmedAt=2026-10-27T21:23:38.334Z` and `eventCount=10`. Four current cards: Nine, Alcea, Rossweisse, Sig; six upcoming: Tiphera, Tiana, Blazebell, Vivian, Dahlia, Edelyn. Source is secondary and `prydwen-czn.ts` deliberately emits day-precision `estimated` dates.
- `data/reviewed/czn.json`: **21 manual rows**: 15 older/historical, 6 recent officially verified paired characters/partners. Those six are Nine/Alcea (Oct 13–Nov 3 **18:00 UTC**), Tiphera/Tiana (Nov 3–Nov 24 **18:00 UTC**), Rossweisse/Sig (from Oct 21 **05:00 UTC**, ending **Dec 2 day-precision** pending associated specific maintenance). Their IDs, original source provenance and firstSeenAt are already correct after PR #59/#61 and must remain unchanged.
- The current source architecture has NO registered scheduled official STOVE / CZN.gg update/events discovery adapter, and `czn-game8-events` is intentionally disabled due known runner access issues. The official STOVE content is accessible for **manual evidence review**, sometimes via explicitly attributed CZN.gg mirror; its unattended GitHub Actions fetch/terms/robots safety have NOT been tested.
- Endgame `cznMaintenanceBoundary()` effective-dated boundary logic and `greatRiftWeeklyRewards()` (bounded Sundays 18:00 UTC *only inside a known sourced exact active Great Rift phase*) already exist. A missing CURRENT Great Rift phase is **not** proof the weekly generator is defective. Version/season windows are NOT an infinite 21/42-day recurrence.
- **CZN standing daily reset is 18:00 UTC**, using the separately implemented product/Sync policy. This does NOT imply maintenance ends, event claims or anniversary gift mail arrive at 18:00. Do NOT reopen the already completed CZN Daily Reset cutover or migrate marks as part of this audit.

## Authoritative evidence and provenance

Repository paths inspected: `AGENTS.md`; `docs/IMPLEMENTATION-STATUS.md`; `docs/research/czn-recurring-endgame.md`; `docs/tasks/CZN-VERIFIED-BANNER-TIME-PRECISION.md`; `data/reviewed/czn.json`; `src/ingest/adapters/index.ts`; `src/ingest/parsers/prydwen-czn.ts`; `src/ingest/recurring-endgame.ts`; `snapshots/czn-prydwen-banners.html` + meta; `test/prydwen-czn.test.ts`; `test/czn-reviewed-precision.test.ts`. No fresh tests/build/live feed download during this research.

Published first-party authored announcements (some inspected in **CZN.gg reposts explicitly marked Source: STOVE**, not falsely treated as official-domain fetching):
- **Oct 21 version update notice:** https://czn.gg/10-21wed-update-notice/ — publisher-authored schedules for Season 5, Basin, anniversary, Trials, Overdrive and seasonal rewards, with a clickable STOVE source reference.
- **Sept 30 update:** https://czn.gg/09-30-wed-update-notice/ — current Full-Scale Offensive from Sept 30 to Nov 11 and older Sep30–Oct21 Basin; current Great Rift version window requires separate official verification.
- **Oct 21 daily gift announcement:** https://czn.gg/event-1st-anniversary-celebration-daily-login-rewards-event/ — distinct **06:00 UTC** mail issue/claim clocks; item-specific exceptions.
- **Oct 23 surprise gift announcement:** https://czn.gg/event-1st-anniversary-surprise-growth-support-gift-has-arrived/ — claimed through Nov 10 **23:59**, but the mirrored excerpt **does not label a UTC zone**. Do not publish it as exact 23:59Z without an independent first-party timezone confirmation.
- **New Oct 27 patch:** https://czn.gg/notice-10-27-tue-patch-notice-completed/ — corrects a Seasonal Chaos weekly reset *display bug*. This is a reason to recheck actual current timer, **not** evidence for a new permanent recurrence rule.
- **Official Smilegate cross-game release:** https://newsroom.smilegate.com/bbs/board.php?bo_table=eng&wr_id=507 — announces an **Epic Seven** crossover containing CZN characters, running to Oct 29. The reviewed calendar currently treats it as a CZN event; game identity is doubtful (see below).
- Primary STOVE banner notices already used by reviewed: `14555091`, `14593128`, `14592676`, with official URLs in `data/reviewed/czn.json`.

Source timestamps: CZN mirror is a publisher-text *secondary host*. Its STOVE attribution does not prove the CZN.gg website is available or permissible as unattended production scraping in GitHub Actions. No new robots/terms or runner viability probe was conducted.

## Current / upcoming coverage matrix

**COVERED** = existing reviewed or supported automatic candidate; **MISSING** = date/window verified in publisher notice, absent in both checked reviewed data and registered parser's families; **PARTIAL/WATCH** = missing specific/absolute boundary or game scope choice. Do not equate announcement existence with a trustworthy UTC clock.

| Family / event | Verified source window / rule | Current coverage | Priority / gate |
|---|---|---|---|
| **Nine Rate-Up Rescue + Alcea Rate-Up Rescue** | Oct 13–Nov 3 **18:00Z**, STOVE 14555091 | **COVERED**, two exact official reviewed IDs | Keep; no combined identity |
| **Tiphera Rate-Up Rescue + Tiana Rate-Up Rescue** | Nov 3–Nov 24 **18:00Z**, STOVE 14593128 | **COVERED**, two exact official reviewed IDs | Keep |
| **Rossweisse Rate-Up Rescue + Sig Rate-Up Rescue** | Oct 21 maintenance-completed **05:00Z** – Dec 2 *before maintenance* | **COVERED**, two reviewed official IDs; Dec 2 ends still day precision | Keep; no premature exact end without specific maintenance evidence |
| **Blazebell / Vivian / Dahlia / Edelyn** (future) | Future Prydwen cards: Nov 11–Dec 2 and Dec 2–Dec 23; first-party time not independently established | **WATCH / estimated day-only** | No guessed 07:00 start or end clocks; do not label official |
| **Basin of Hyperspace: Dimensional Twilight (Oct 21 phase)** | Oct 21 after maintenance → **Nov 11 before maintenance** | **MISSING** current timed challenge; older Sep 9 phase already expired | **P1**, separate version phase ID, maintenance-end day until specific confirmed |
| **Full-Scale Offensive, new Sept 30 season** | Sept 30 after maintenance → **Nov 11 before maintenance** | **MISSING** new current season; older `Full-Scale Offensive — Season 4` is `endsAt:null` from Aug 19 | **P1**. Need old phase reconciliation without deleting/rekeying previous record; old open-ended row may mislead |
| **Galactic Disaster Season 5: A Promise Upon the Snow** | Oct 21 after maintenance → **Dec 23 before maintenance** | **MISSING** season marker; independent Season 5 preview Sept 30–Oct 21 has ended | **P1**, official season / seasonal reward cutoff, no generic phase cadence |
| **Celestial Bulwark: Viadeus** | Oct 21 after maintenance → Dec 23 before maintenance | **MISSING** seasonal challenge; reward progress | P1/P2, may group with season to avoid redundant cards |
| **Celestial Bulwark: Seraphion** | **Oct 28 02:00Z** unlock → Dec 23 before maintenance | **MISSING** dated challenge unlock | P1/P2, user-visible current arrival; avoid claim this unlock means a separate challenge expiration |
| **Celestial Bulwark: Enforcer Seraphion** | **Nov 4 02:00Z** unlock → Dec 23 before maintenance | **MISSING** future challenge unlock | P1/P2; same season, distinct unlock |
| **Environment Variables Season 5** | Oct 21–Dec 23, expansion Nov 11 / Dec 2 **after maintenance** | **MISSING** time-limited progression; no separate UI deadline required if season cutoff covered | P2 / milestone marker scope; do not synthesize opening hour |
| **Supply Store: season-limited currency purchases** | Oct 21–Dec 23 before maintenance; weekly free `Tear of God` | **MISSING** seasonal shop cutoff | P1/P2 claim/shop scope, beware weekly reward claim semantics |
| **Nightmare Carnival (1st Anniversary)** | Oct 21 after maintenance → **Dec 2 before maintenance** | **MISSING** core 1st Anniversary reward window | **P1**, free 5-star selection cards & rewards |
| **Nightmare Carnival: 70 Free Normal Rescues** | Oct 21–Dec 2 before maintenance, **10 free pulls/day for 7 qualifying days**, accumulated attempts expire at end | **MISSING** main anniversary reward subdeadline | **P1**; separate clear “unused attempts expire” warning, avoid duplicating parent |
| **Nightmare Carnival: Additional Aether** | Oct 21–**Nov 11 before maintenance** | **MISSING** earlier event sub-deadline | P1/P2, separate benefit cutoff |
| **Nightmare Dream Park** | Oct 21–**Dec 23 before maintenance** | **MISSING** separate limited park event | P1/P2 |
| **Nightmare Carnival: Special Unigram** | Oct 21–Dec 2 before maintenance | **MISSING** small free sticker / claim | P2 |
| **Rossweisse Trauma Code: Blade Poised Against the Cycle** | Oct 21–Dec 2 before maintenance | **MISSING** limited achievement/event rewards | **P1** |
| **Virtual Tactical Simulation: Rossweisse** | Oct 21–Dec 2 before maintenance; ★4 Beryl/Rei trials **end before Nov 11 maintenance** | **MISSING** trials, especially shorter 4★ cutoff | P1/P2; distinguish standard trial from 4★ special trial |
| **Virtual Tactical Simulation: Tiphera** | Nov 3–Nov 24 **18:00Z** | **MISSING** trial distinct from banner, if trial rewards tracked | P2 / existing calendar trials policy |
| **Overdrive: Simulation (double growth)** | Oct 21 after maintenance → **Nov 3 18:00Z**, daily eligibility resets 18:00Z | **MISSING** double-drop event; ends soon | **P1 urgent** |
| **1st Anniversary daily-login mailbox gifts** | Mail deliveries Oct 21–Nov 3 **06:00Z**, ordinary 24h claims; last Nov 3 delivery claim **Nov 4 05:59Z**; Oct 21 sticker & Oct 28 background have exception ending **Nov 30 14:59Z** | **MISSING** main timed login + exceptions | **P1** free gift/claim coverage, **different clock from daily reset** |
| **Oct 23 surprise anniversary support gift** | Oct 23–Nov 10 **23:59** per STOVE repost; timezone not specified in captured claim line | **MISSING**, exact timezone UNVERIFIED | P1/P2; add day only or verify exact UTC; do not invent 23:59Z |
| **Season 5 Great Rift** | No independently verified current exact first/second-half interval found during this bounded review | **WATCH**, old reviewed `Great Rift: Season 4 Second Half` is expired | Need official current phase notice or timer; weekly 18:00 rewards generator cannot safely run without a sourced phase |
| **Epic Seven x CZN crossover** | Smilegate 2026-09-18 `wr_id=507`: CZN characters/story appear in **Epic Seven**, runs to Oct 29 | **MISCLASSIFICATION SUSPECTED**: reviewed CZN event Oct 29 end was sourced from Epic Seven announcement | P2 verify product policy, classify correct target game; don't erase history or change ID without explicit migration/decision |
| **Daily Reset 18:00 UTC** | Existing separate dedicated Sync/PWA system | **ALREADY IMPLEMENTED**, not an event from Prydwen | Do not touch cutover, reset marks or User Sync |
| **Optional paid bundles/Card Skin discounts** | Various Oct21–Nov11, Nov11–Dec2, Dec2–Dec23 explicitly sale-only | **MISSING / PRODUCT SCOPE** | Never present permanent item ownership as disappearing; separate commercial reminders only if approved |

### Clock/source rule summary

- **CZN normal standing daily reset:** **18:00 UTC**, fixed worldwide; **Normal Rescue banner** ends Nov 3/24 18:00Z where explicitly published.
- **Mail delivery/claim:** daily anniversary 06:00 UTC with individual exceptions. Does **not** use 18:00 reset. Default ordinary mail claim is delivery + 24h, but exceptions (Oct 21/Oct 28) extend to Nov 30.
- **Regular maintenance:** after the effective July 29 change usually **00:00 UTC start**; some banners independently confirm post-maintenance opening **05:00Z** on Oct 21. A notice saying “before maintenance” on Nov 11/Dec 2/Dec 23 must remain **day precision** until associated specific maintenance schedule is confirmed or a separately approved standing-rule derivation is applied. Do not blindly convert “after maintenance” to 00:00Z or 05:00Z.
- **Nov 3 exact:** Overdrive double-drop ends `2026-11-03T18:00:00Z` and Nine/Alcea banners end at same instant. Season 5 broader period continues independently.
- **Nov 11:** timed separate Basin, additional Aether, Beryl/Rei trials, first Card Skin packs; don't conflate with Dec 2 Carnival and Dec 23 Season 5/Dream Park.
- Region selector is irrelevant to these fixed UTC announcements; no Asia/Europe/America reinterpretation from the user's locale.

## Architecture diagnostic

| Layer | Existing proof | Real missing capability |
|---|---|---|
| Transport | Prydwen banners last confirmed Oct 27, 10 cards | **Healthy** banner-only HTML cannot detect missing official seasonal announcements |
| Discovery | No scheduled official STOVE update/news/announcement index, and disabled Game8 | Entire gameplay/event family is unseen; primary source discovery automation needs access-gate research |
| Extraction | `prydwen-czn.ts` deliberately selects `data-banner-card` only; conservative dates protect against fake machine 07:00/00:01 | Do NOT broaden Prydwen parser to scrape unrelated prose. Need a separate event/notice adapter or reviewed fallback |
| Reviewed | 21 manual; 6 official exact recent banners; 15 historical | Missed active anniversary/endgame/claim events and one probable incorrect-game cross-promo |
| Seasonal endgame | Effective-dated maintenance helper; weekly Great Rift generator conditional on known exact phase | No current dated Great Rift row; no recurrence by +21 days; Full-Scale Offensive old `endsAt:null` stale |
| Alerts | `source-health` sees nonzero 10 current/upcoming banner candidates | No cross-source expected event-family completeness; do not claim green = complete |
| Independent Daily Reset | Clock and Sync cutover managed separately; 18:00 UTC | Do not conflate scheduled events with per-user completion marking |

## Recommended bounded milestones (none implemented here)

**C1 — urgent official reviewed-data repair (P1).** Restore most user-impactful **currently active source-dated** missing records with stable unique event IDs: `Basin Oct21–Nov11`, `Full-Scale Offensive Sep30–Nov11`, `Overdrive until Nov3 18:00Z`, `Nightmare Carnival Dec2` with free-70-rescues expiration, and the independent **daily anniversary gift/claim** family with 06:00Z per-day clocks. If too broad for one PR, prioritize Overdrive and mailbox gifts first, then season/basin. Preserve all existing 21 reviewed rows, source URLs, firstSeenAt, UTC/day semantics and no invented maintenance finish. A distinct test must ensure no new ID collisions or overlapping mislabelled phases; do not pretend a new record fixes an older open-ended record without reconciliation.

**C2 — current Season 5 / dated events rest (separate).** Add `Nightmare Dream Park`, `Galactic Disaster Season 5`, Celestial Bulwark phase/unlock milestones, Rossweisse Trauma Code, Virtual Tactical Simulation, additional Aether subdeadline and Supply Store currency expiration, after controlled category/parent vs sub-event choices. Use STOVE-authored notice evidence with honest extraction provenance; do not generate an extra parent and many duplicate countdowns if one expiry matters.

**C3 — unattended publisher discovery gate.** Research STOVE public update/event feed or documented API, official news search, and compliant mirror index with actual GitHub Actions runner test and robots/terms. No scraping authorization assumed from an article being browser-readable or a mirror being available to search. Index notices → constrained headings/dates → schema/provenance/regression tests; preserve Prydwen for banners. Gate BLOCKED if no compliant runner-verifiable source. No general robots bypass.

**C4 — stale/incorrect identity and endgame checkpoint.** Source-check current Great Rift period; check `Full-Scale Offensive — Season 4` reviewed `endsAt:null` vs newer Sept30 official season, and validate Epic Seven crossover game's true target. Require separate ID compatibility/review; never silently delete/rename published user-completion keys. Preserve official 18:00 UTC Weekly Cumulative Rewards conditional behavior.

**C5 — future Source Recovery R1 contract.** Monitor separate `(czn,official banners)`, `(czn,limited events)`, `(czn,season challenge)`, `(czn,anniversary login/mail)`, `(czn,shop/reward claim)`. Regression: Prydwen HTTP200 / 10 banner cards while **all Season 5 / anniversary** rows absent ⇒ coverage incident, not source broken; Oct28 mail expires after Nov30 and normal daily expires after 24h ⇒ differentiated claim reminders; Great Rift missing date ⇒ watch not synthetic 21-day cycle.

## Limits and handoff

This report inspected current GitHub main code/docs/snapshots and independently available October 2026 publisher-authored schedules via attributed STOVE mirrors. **No new Actions runner official-site probe, live deployed events JSON fetch, local Bun execution or direct player timer capture was performed**. This is **not** a claim that every CZN community mini-event is inventoried. No gameplay data, source adapters, reviews, workflows, auth/Sync, daily-reset records or deployment were changed.

**Next concrete step:** after this seventh research-only audit is merged, create a **separate cross-game severity-ranked remediation backlog** from all seven documented reports. Prioritize confirmed incorrect deadlines (Endfield Maras) and imminent real event/claim expirations (Genshin Oct29, CZN Nov3, HSR Nov2, NTE Nov10, etc.). Do not start any implementation merely because the audits are merged.
