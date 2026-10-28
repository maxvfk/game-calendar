# HSR Source & Event Coverage Audit — 2026-10-28

**Status:** READ-ONLY RESEARCH COMPLETE; implementation NOT started.
**Baseline:** `main` `8ec9ef2c3ee487e2f30a86f6169694a7e790879f`, after PR #119 (HSR Lightward parser fix) and #120 (delivery closeout).
**Scope:** HSR Version 4.6 active/upcoming calendar and time-sensitive 4.6 rewards, plus closely related source/monitoring failure modes. Does not claim an exhaustive all-time historical event archive. This is the first per-game audit toward seven-game coverage; no other game changed.

## Executive finding

HSR's fixed Lightward P0 is complete and **four explicitly dated endgame phases are covered**. However, the calendar **is not HSR 4.6-complete**. Current source health can be green while source *coverage* is partial:

1. The sole active HSR automatic source `hsr-kqm-hsrnews` (`src/ingest/adapters/index.ts`) fetches `KQM-git/HSRNews/readme.md`. The currently indexed archive contains **nine** articles, none of the separately published official **Version 4.6 Event Warp Phase I / II** notices or the **October 12 Planar Fissure** notice. This is a **source-index coverage** limitation, not a parser transport error. Game8 remains disabled because GitHub Actions sees CloudFront 202; do not repeat that research.
2. The current 4.6 update notice is already in the checked-in source snapshot (`archive/1437.md`) but the parser supports only a subset of its event/deadline vocabulary. This is a **deterministic parser coverage** limitation.
3. Previously reviewed `Anomaly Arbitration: Return of the Legion` (4.5) remains `endsAt:null` while the official update explicitly announces Version 4.6 **Return to Roots**. This is a **stale reviewed/current-phase representation** issue, not proof of its exact end time.
4. `lastConfirmedAt` can be recent and the output nonzero even when an entire essential family (Warp banners) is missing. R1 Source Recovery should distinguish HTTP health, current indexed notices, and per-family materialized coverage.

## Reproducible repository/source baseline

- `docs/IMPLEMENTATION-STATUS.md` and `docs/evidence/hsr-46-lightward-delivery-2026-10-28.md` confirm PR #119 and #120, PR/main CI + Pages, fixed-clock checked-in-source replay **21 HSR winners = 13 reviewed + 8 parser candidates** with no collisions. This is a **replay/build observation**; a direct independent fetch of deployed `events.v1.json` was unavailable to this audit. Do not claim live JSON validation.
- The current upstream `KQM-git/HSRNews` `master` HEAD has an Oct 25 timestamp; its `readme.md` content and 9 article headings match the checked-in HSR snapshot. Local meta `lastConfirmedAt=2026-10-27T21:23:33.629Z`, `eventCount=6` reflects the previous parser at the last network refresh; #119 build now extracts **8**. No source outage is alleged.
- The eight snapshot parser identities were independently enumerated against `src/ingest/parsers/kqm-hsrnews.ts`:
  **Love, Ghosts & Robots**; **Interastral Peace Gala: One Take**;
  **Wishpower UP! Down with Voracity!**;
  **Memory of Chaos: Crossing the Afterlife**;
  **Apocalyptic Shadow: Dominance of Oblivion**;
  **Pure Fiction: Imagined Words**;
  **Memory of Chaos: Survival of the Fittest**;
  **Version 4.6 Nameless Honor**.
- Reviewed HSR batch still contains 13 legacy rows, including old 4.5 AA with unknown end and `Fate Contract: Renewal` with unknown end. Keeping a reviewed historical ID is correct; treating a version-controlled old phase as indefinitely current is not.
- Official 4.6 update: https://hsr.hoyoverse.com/en-us/news/166468 (also https://hsr.hoyoverse.com/ru-ru/news/166468). KQM extraction mirror: https://github.com/KQM-git/HSRNews/blob/master/archive/1437.md .
- Publisher's separate Phase II Warp notice: https://www.hoyolab.com/article/47142215 ; official account's Phase I post indexed in https://www.hoyolab.com/accountcenter/postList?id=172534910 . These dated notices are available in indexed publisher text, **not** proven unattended fetchable from Actions. This audit did not access an undocumented/private API or attempt a new runner probe.

## Version 4.6 source/coverage matrix

Legend: **covered** = source-driven existing calendar row backed by actual snapshot replay; **MISSING** = official published notice has a calendar-relevant interval/identity but no current reviewed or supported parser row; **partial/decision** = timing/source/product semantics insufficient to assert a precise deadline. `After update` starts have day precision, NEVER a guessed maintenance completion clock.

| Family / published event | Source evidence and official boundary | Calendar finding | Severity / next gate |
|---|---|---|---|
| Treasures Lightward (MoC Crossing the Afterlife; AS Dominance of Oblivion; PF Imagined Words; MoC Survival of the Fittest) | Official 4.6 update, four separate server-local intervals ending Nov 2, 16, 30, Dec 14 at 03:59. | **COVERED** after PR #119. Preserves four separate phases and fixed HSR regional clocks. | No further implementation in this audit. |
| Story event **Love, Ghosts & Robots** | Sep 28 after update → Nov 11 03:59 UTC+8 (global). | **COVERED** from KQM. | Keep. |
| Combat event **Interastral Peace Gala: One Take** | Oct 21 12:00 server → Nov 11 03:59 UTC+8 (global). | **COVERED** from KQM. | Keep mixed server/global precision. |
| **Wishpower UP! Down with Voracity!** | After update → Nov 11 06:00 UTC+8 (global). | **COVERED** from KQM. | Keep. |
| **Version 4.6 Nameless Honor** main duration | After update → Nov 9 03:59 server, `archive/1416.md`. | **COVERED** from KQM. | Optional separate web top-up purchase deadline Nov 8 03:59 UTC+8 is not tracked; product decision. |
| **Pearl — An Ocean in a Pearl** (Character Warp) | From Sep 28 after update → Nov 10 15:00 server (Phase I and II continuous), publisher Warp notices. | **MISSING**; banner source gap. | **P1 / high**; one channel, not two duplicate Phase I/II records. |
| **Colors for Tomorrow — Brilliant Fixation** (Light Cone Warp) | Same continuous window as Pearl, official Warp notices. | **MISSING**, separate Light Cone channel. | **P1 / high**. |
| **Mortenax Blade — Now I Am Become Blade** (Character rerun) | Oct 21 12:00 → Nov 10 15:00 server, official Phase II notice. | **MISSING**. | **P1 / high**. |
| **Reforged in Hellfire — Bygone Reminiscence** (Light Cone rerun) | Same Oct 21 → Nov 10 15:00 server, official Phase II notice. | **MISSING**. | **P1 / high**. |
| **Evanescia** rerun + **Until the Flowers Bloom Again** Light Cone | After Sep 28 update → Oct 21 11:59 server, official Phase I account-indexed notice. | **MISSING historical** two distinct channels, already expired on audit date. | P2: preserve eventual history and verify no ID collision. |
| **Aptitude Showcase trials** | Phase II notice explicitly says Pearl/Qingque/Xueyi/Misha available through Nov 10 15:00 server, Mortenax from Oct 21 12:00 → same end. | **MISSING**; both groups can be tracked as separately scoped trial windows. | **P1/P2**, bounded trial source extraction, preserve scope. |
| **Astral Imagea Park: Astral Trendible** | Official 4.6 update: after update → Nov 11 06:00 UTC+8 (global). | **MISSING** despite dated `Availability` in current snapshot. | **P1** parser gap; not equivalent to permanently accessible Park. |
| **Astral Imagea Park: Park Souvenir** | Official 4.6 update: after update → Nov 11 06:00 UTC+8 (global) claim period. | **MISSING** despite dated `Claim Period` in snapshot; expiring vouchers. | **P1** claim-deadline extraction. |
| **Warm Cotton Skies** and **Lunar Blossoming** discounted outfit offers | Official update: two sale discounts end Nov 11 03:59 UTC+8 (global); permanent outfits continue at full price. | **MISSING** two `shop` limited-time discount windows despite dates in snapshot. | P2 / include if shop offers in calendar scope. Do NOT present outfit itself as disappearing. |
| **Anomaly Arbitration: Return to Roots** | Official 4.6 update names current theme but does NOT specify exact phase end. Independent secondary pages suggest version-linked timing with conflicting generalizations. | **MISSING** new phase; old 4.5 `Return of the Legion` has `endsAt:null` and can look perpetually active. | **P1** stale-current behavior; add phase with unknown end if in scope, only correct/expire old phase with sourced date or explicit reviewed decision. No unsourced end. |
| **Currency Wars: Zero-Sum Game seasonal rewards/reset** | Update plus `archive/1421.md`: rewards and selected progress reset **after Version 4.6 ends**. Official version end Nov 11 06:00 UTC+8. | **MISSING** calendar cutoff/reminder. | **P1/P2**; version-linked end is derived and must be labelled estimated, not directly quoted as independently announced minute for the mode. |
| **Fate Contract: Renewal** login/reward claim | Historical reviewed record starts Jul 24, `endsAt:null`; initial notice says before end of 4.6. 4.6 version end is now explicit. | **PARTIAL / stale deadline**: active indefinite record may hide rewards deadline. | **P1** seek explicit current claim cutoff; if only version-derived, use honest estimated provenance and stable ID. |
| **Gift of Odyssey** 4.6 login | Official update announces login rewards, no explicit dated end in indexed 4.6 main notice. | **MISSING**; can't assert exact end from generic whole-version wording. | P2 pending precise notice; no automatic 42-day duration. |
| **Planar Fissure** | Official HoYoLAB 2026-10-11 dated post: Oct 12 04:00 → Oct 25 03:59 server. Not in 9 KQM index articles. | **MISSING historical**; live occurrence was missed before this audit. | P2; independent timed notices source lane needed. |
| **Garden of Plenty** | Secondary 4.6 event calendar lists Oct 30 opening; this audit did NOT locate an independently verifiable current publisher post specifying start and exact end. | **WATCH / NOT VERIFIED**; no confident date should be published from the unverified secondary schedule. | Verify dated official notice before publishing; no date extrapolation. |
| **Astral Slammers Squad!** | 4.6 update says available after update, no end. Third-party summaries treat it as permanent. | **PARTIAL / product scope**. | If included, `endsAt:null`; do not fabricate version end. |
| **Bug compensation in-game mail** | Official 4.6 update says claim before Oct 28 23:59 UTC+8, i.e. **Oct 28 15:59Z** (deadline today or just passed, depending on audit time). | **MISSING time-sensitive mail claim**. | P1 for calendar-as-deadline product scope, needs standalone reward-cutoff policy. |
| **Version 4.7 special-program livestream** | Official post https://www.hoyolab.com/article/47210911 schedules Oct 30 **19:30 UTC+8** (11:30Z). This is an announced start, not an expiry. | **MISSING from KQM**; unclear whether streams should be tracked. | Product decision; don't imply code redemptions expire at a guessed time. |

### Accurate conversion example — active 4.6 banner endings

All four active banner channels end **2026-11-10 15:00 server local**:
- Asia UTC+8: **2026-11-10 07:00Z**
- Europe UTC+1: **2026-11-10 14:00Z**
- America UTC−5: **2026-11-10 20:00Z**

No DST conversion of fixed game-server clocks. Pearl/LC have Sep 28 day-precision starts; Mortenax/LC start Oct 21 12:00 server-local (existing event schema may encode a server-local opening day with day precision).

### Confirmed external evidence outside current KQM index

- Official Phase II notice: https://www.hoyolab.com/article/47142215 (four current separate banner identities + trial stages, with exact server hours).
- Official Phase I account-indexed notice: https://www.hoyolab.com/accountcenter/postList?id=172534910 (Pearl/LC, Evanescia/LC, Phase I window).
- Official Planar Fissure October 11 post, same publisher-account index, with Oct 12–25 server timing.
- Official Version 4.7 special program announcement: https://www.hoyolab.com/article/47210911 .
- Secondary cross-check only, **not publisher authority**: https://allthings.how/honkai-star-rail-4-6-banners-and-events-full-schedule-and-release-times/ and https://gachatracker.app/games/starrail/events/ . Dates supplied by these sites alone (e.g. future Garden of Plenty) remain unverified.

## Why "all HSR sources healthy" is not the same as complete coverage

| Layer | Current state | Consequence |
|---|---|---|
| Transport | GitHub Contents API working; checked-in source snapshot confirmed Oct 27. | Source Health can be green. |
| Discovery/index | Nine KQM indexed live articles; no separately issued publisher Warp/Planar notices. | Missing families even if parser perfectly processes everything indexed. |
| Extraction | Parser has explicit patterns for generic `Event Period`, 4.6 Lightward and Nameless Honor. | Misses `Availability`, `Claim Period`, `Discount Period`, bare-version promises, and season reset reminders in the same 4.6 text. |
| Merging/review | Reviewed precedence and fixed IDs protect old history. | Version-controlled 4.5 AA and a formerly unknown `Fate Contract` end can remain stale unless independently updated. |
| Health/monitor | Lightward rhythm is an alert heuristic, not a production publisher; there is no family-level guaranteed positive banner coverage. | HTTP 200/nonzero parse doesn't detect missing banners or other user-critical expiries. |

## Priority and bounded follow-up recommendations

**H1 — P1 immediate reviewed-data + precision repair (one narrow implementation PR, if operator authorizes).**
Use exact first-party 4.6 Warp Phase I/II notices for the six unique banner/Light Cone identities (four currently active, two expired), current official 4.6 update for the two claim/availability windows, and optionally bounded trials/critical deadline fixes with strict reviewed-policy and stable IDs. Preserve all 13 previous reviewed rows, 8 parsed candidates, v1 event ID keys and no speculative dates. If this is too broad for a short hotfix, prioritize current four banners then separately dated Park claims. Reconcile before changes; no implementation here.

**H2 — sustainable HSR source discovery / automation gate (separate research/conditional implementation).**
KQM is useful for *in-game version notices*, not a complete publisher dispatch feed. Find at least one **compliant, dynamically discoverable, actual Actions-runner readable** source for dated individual banners, double drops and trials (prefer official publisher announcements, permissible mirrors, then vetted secondary source). Test index+detail/region semantics; no private APIs, shell-only success, robots bypass or static list of URLs. If no viable source, preserve reviewed fallback and document BLOCKED, as in ZZZ B1.

**H3 — KQM existing-notice parser coverage (separate bounded fix).**
Add narrowly classified dated `Availability`, `Claim Period`, `Discount Period` and seasonal deadline extraction from Version 4.6 factual fixtures, with explicit per-category opt-in and no duplicate Park/main event. Mark version-linked derived ends as `estimated`. No generalized arbitrary-prose scan or invented starts.

**H4 — R1 Source Recovery coverage expectations (future separate milestone).**
Monitor `(hsr,banner)`, `(hsr,challenge/Lightward)`, `(hsr,event)`, `(hsr,login/reward)` and scheduled refresh freshness independently. Add a deterministic test: `KQM HTTP 200 + 8 extracted + all six officially dated Warp channels missing` must trigger a coverage incident, while `Garden of Plenty` without an exact official notice must remain `watch`, not P0 or false publication. Do not implement R1/R2/R3 now.

**Next concrete step:** user decides whether to prioritize H1 immediate current-banner/claim patch or first design H2 unattended source-recovery gate. Do not expand the completed Lightward P0, start E2a.1 Timeline v2 cutover (open PR #115), or merge Source Recovery design PR #113 as part of this HSR research.

## Limits and verification honesty

- The audit is a **time-bounded 4.6 coverage survey**, not proof no additional HoYoLAB/community notices exist. No real Actions probe of new hosts has been performed.
- Official source text was cross-checked using indexed publisher excerpts; direct HoYoLAB HTML on web was not consistently retrievable. Explicitly separate publisher fact from its fetchability on CI.
- The local snapshot is KQM's active index, not its entire historical archive. Historic Planar Fissure and Phase I Warp can be absent from current index regardless of retained older archive files.
- A direct independent download of deployed `events.v1.json` could not be obtained through this audit's web/container access. Feed totals, new HSR event IDs and absence in supported data paths are based on reviewed records, parser code, captured snapshot and confirmed fixed-clock replay in PR #119/120; do not conflate with direct deployed JSON observation.
- No code, snapshots, reviewed records, secrets, workflows or live production data changed by this document.
