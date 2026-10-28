# Game calendar implementation status

## WuWa 3.7 source/coverage audit — RESEARCH COMPLETE, NO IMPLEMENTATION (2026-10-28)

Report: `docs/research/wuwa-source-coverage-audit-2026-10-28.md`.
Existing `wuwa-kuro-mirror` GitHub Contents Atom source is healthy:
the 20-article checked-in snapshot matches upstream, last confirmed
`2026-10-27T21:23:35.772Z`, **7** events parsed. Twelve reviewed WuWa
entries are all historical 3.6. Kuro patch notice `5571` includes more
official dates than those seven candidates cover.

- **P1 missing:** current Suoming / `Unspoken Rue` new 3.7 Phase II
  banner channels: official 3.7 patch notes name both, but the indexed
  dated Phase II notice `5668` covers only four reruns. Exact first-party
  time verification needed before publishing the two missing channels.
- **P1 parser bugs in already fetched text:** Version 3.7 patch-note
  title is not recognized as maintenance-date anchor, dropping `Cubie Wars`,
  `Dreams in the Capsule`, `Gifts of Waking Moon` and four now-historical
  Phase I reruns. A nested `[Special Events] [Cubie Wars]` heading would
  yield a WRONG `Special Events` ID if only the date-anchor regex were
  fixed. `Gifts of Singing Drizzle` has `✦Duration:`, not handled by
  current extraction. All have explicit deadline in official notice.
- **Covered:** four Phase II rerun banners, `Artisan's Search`,
  `Echo Erase`, `Beyond the Waves`; existing independent `estimated`
  28-day ToA / Whimpering Wastes projections need no duplicated research.
  **Partial:** current Version 3.7 Endstate Matrix phase; existing
  reviewed 3.6 ended Sep 30. Its current exact phase end was not sourced.
- **Product-scope decision:** `Waking Moon Fishing` ends Nov 1
  09:59 UTC+8 and `Back to Solaris` Nov 11 23:59 UTC+8 (global clock),
  both missing, if web reward events are intended for Calendar.
  Separate new source/access proof is needed for absent banner notices.
- No new source probe, independent live Pages JSON retrieval, runtime,
  source changes, fixtures, reviewed rows, secrets or workflows in audit.

**Next concrete step:** separately authorize bounded `W1` repair for the
four current official patch-note events/login windows and scoped `W2`
banner discovery for the missing two active new banners; or continue the
next game's research-only audit. Do NOT modify Timeline v2 PR #115 or
Source Recovery design PR #113 in this scope.


## Genshin 7.1 source/coverage audit — RESEARCH COMPLETE; NO FIX (2026-10-28)

Report: `docs/research/genshin-source-coverage-audit-2026-10-28.md`. Current
`genshin-kqm-ginews` is accessible and recently confirmed; its live `readme.md`
and checked-in snapshot both contain **36 indexed notices** but only **10 parsed
events** at the last source refresh. `data/reviewed/genshin.json` has **19**
reviewed entries; these numbers are not unique published-feed totals.

**Confirmed current missing/partial coverage:** Phase II `Epitome Invocation`
weapon banner (Azurelight + Symphonist of Scents, until Nov 3); `Overflowing
Favor` (Oct 26–Nov 2); `Starlight Voyage: Heart Unbound` (Oct 19–Nov 2)
and its distinct **Oct 29 04:00** quest cutoff; `Carefree Snowball Fight`
exists but has only a day-precision reviewed Nov 2 end despite a more detailed
notice. Additional dated Miliastra/web rewards (`Starlit Gala`, `Raiment
Collection`, `Moonlit Season`), cosmetic odes and sub-deadlines need explicit
scope/precision gates. Existing Spiral Abyss and Imaginarium Theater monthly
recurrence is already implemented and should not be re-opened without a defect.
Version 7.2 is announced; its currently absent exact individual phase notices
are `watch`, not permission to extrapolate future dates.

Source transport success/nonzero extraction must NOT be interpreted as
per-family coverage. The audit made no runtime/source/reviewed/secret/workflow
changes, no runner probe of new hosts and no independent deployed JSON fetch.
**Next concrete step:** operator decides between urgent bounded `G1`
current-deadline repair and next game's research-only audit (**WuWa**).
Keep Editorial v2 PR #115 and Source Recovery design PR #113 independent.


## HSR 4.6 source/coverage audit — RESEARCH COMPLETE; IMPLEMENTATION NOT STARTED (2026-10-28)

Research report: `docs/research/hsr-source-coverage-audit-2026-10-28.md`.
Post-#119 Lightward is correct (**21 HSR rows = 13 reviewed + 8 KQM parser**);
remaining source coverage is **incomplete**, despite healthy `hsr-kqm-hsrnews`
transport and current 4.6 in-game notice.

- KQM current `readme.md` includes **9** notices but excludes separate publisher
  Phase I/II Warp notices and Oct 12 Planar Fissure dispatch. **Four currently
  active, officially timed banner/Light Cone channels** (Pearl + signature,
  Mortenax Blade rerun + signature) are missing, along with two expired Phase I
  rerun channels. Trial notices also not ingested.
- The current captured update includes dated `Astral Trendible` availability,
  `Park Souvenir` claim, two outfit-discount deadlines; parser extracts none.
- The old 4.5 Anomaly Arbitration with `endsAt:null` remains reviewed even
  though current 4.6 `Return to Roots` is announced without a direct exact
  end; `Fate Contract: Renewal` also lacks a version-linked cutoff. Currency
  Wars reset/rewards and Gift of Odyssey need separate evidence/precision policy.
- Distinguish **source index gaps**, **parser coverage gaps**, **stale reviewed
  version phases**, **product-scope decisions** and **unverified future dates**.
  No new runner probe or live JSON download is claimed. Old reviewed/snapshots,
  source adapters, workflows, runtime and published data remain unchanged.

**Next concrete step (operator decision):** narrowly restore the four current
official HSR banner channels and dated claims through reviewed data, then a
separate source-discovery gate for sustainable publisher announcements; or
commission that source gate first. Do NOT merge open Editorial PR #115 or
Source Recovery PR #113 as a side effect. No HSR fix has been implemented by
this research milestone.


## HSR Version 4.6 Treasures Lightward: P0 COMPLETE / DEPLOYED (2026-10-28)

Task: `docs/tasks/HSR-4-6-LIGHTWARD-COVERAGE-P0.md`; baseline main `9d112a6`.
Delivery: [PR #119](https://github.com/maxvfk/game-calendar/pull/119), merged
2026-10-27 23:41:18 UTC as `ece355d346861b552e68d726ff3c6d51492ea1f4`.
[PR CI 40603634593](https://github.com/maxvfk/game-calendar/actions/runs/40603634593)
and [post-merge main CI 40603821063](https://github.com/maxvfk/game-calendar/actions/runs/40603821063)
both passed. Post-merge CI explicitly passed **Deploy to Pages**, site build,
typecheck/test/feed and CZN PG17 recovery/concurrency. Detailed verified delivery
record: `docs/evidence/hsr-46-lightward-delivery-2026-10-28.md`.

- The actual defect is narrower than the initial task diagnosis: AS Dominance of
  Oblivion and PF Imagined Words already parsed through an unscoped mode search.
  Both **Memory of Chaos** phases were missing. The full notice now reads modes
  only under `7. Others → Gameplay → "Treasures Lightward"`, stopping at the next
  section. The older 4.5 factual excerpt remains supported without changing IDs.
- Actual checked-in `snapshots/hsr-kqm-hsrnews.md`, `archive/1437.md`, SHA256
  `0002a2fa60fc8484b6f1000b8870417a9db53dbd4f7fdbe7d2ac76e491855900`,
  confirmed `2026-10-27T21:23:33.629Z`: **6→8 parser candidates**, **four explicit
  Lightward windows**. Snapshot bytes/meta and all 13 reviewed HSR records remain
  untouched. Source ID and extraction URL remain KQM/HSRNews; independent publisher
  verification is the official https://hsr.hoyoverse.com/en-us/news/166468 notice.
  No first-party extraction/provenance claim is fabricated for the mirror.
- First MoC starts **2026-09-28, day precision** (after update, no guessed
  completion clock). Subsequent server-clock starts remain day precision under
  the existing schema. Server/global boundaries are handled independently;
  exact regional ends below are fixed server offsets, independent of viewer DST.

| Phase | Server end, 03:59 | Asia UTC | Europe UTC | America UTC |
|---|---|---|---|---|
| MoC Crossing the Afterlife | Nov 2 | Nov 1 19:59Z | Nov 2 02:59Z | Nov 2 08:59Z |
| AS Dominance of Oblivion | Nov 16 | Nov 15 19:59Z | Nov 16 02:59Z | Nov 16 08:59Z |
| PF Imagined Words | Nov 30 | Nov 29 19:59Z | Nov 30 02:59Z | Nov 30 08:59Z |
| MoC Survival of the Fittest | Dec 14 | Dec 13 19:59Z | Dec 14 02:59Z | Dec 14 08:59Z |

- Fixed-clock actual full-feed replay at **Oct 28 00:00Z: 241→243 total,
  19→21 HSR**; at **Nov 2 12:00Z: 240→242 total, 19→21 HSR**. Exactly **two newly
  published IDs** (the two MoCs); existing AS/PF remain unchanged. Every prior
  winner is byte-equivalent, other source health and the existing single NTE
  date conflict remain unchanged. Four Lightward rows survive merge exactly once.
  Evidence: `docs/evidence/hsr-46-lightward-feed-replay-2026-10-28.json`.
- Seven new regression tests use a bounded factual excerpt of the actual 4.6
  snapshot: exact three-region windows, day-only update start, all region clocks
  immediately before/after MoC expiry, global/server independence, duplicate and
  contradictory schedules, absent/invalid clocks, wrong version, scope decoys,
  and 4.5 reviewed winner/ID preservation. No cadence generator or new workflow.
- Validation: frozen install/typecheck/build PASS with Bun **1.3.14**; **1348 pass / 3 skip / 0 fail** (72 files). Self-review of parser boundaries,
  time semantics, merge identities and the complete diff found no blocker.
  Exact-head PR CI and post-merge CI/Pages **succeeded**; full delivery evidence
  and references are recorded above. Local existing age-dependent
  tests skip when the `age` executable is unavailable; dedicated CI recovery
  validation installs it. No unrelated game/client/Sync/Timeline changes.

**Remaining gaps outside P0:** the snapshot names 4.6 Astral Trendible / Park
Souvenir (Availability/Claim Period), Astral Slammers Squad (no explicit end),
and Anomaly Arbitration: Return to Roots (no explicit phase period). Those 4.6
rows are absent from the current feed. Current Warp/banner coverage and other
reward families are not claimed complete; no new research or generalized audit
was performed here. Historical reviewed AA remains unchanged. These require a
separate coverage audit and source-grounded dates, never inferred version/cadence.

**Operator acceptance:** on 2026-10-28 the user reported that the calendar was
correct in their browser. This is user-reported UI smoke, not independent live
JSON retrieval or a recorded in-game/server timer comparison. GitHub Pages
deployment itself is independently confirmed by the successful Actions job.

**Next concrete step:** HSR P0 is closed; no need to resume the interrupted Work.
Remaining HSR 4.6 coverage gaps are parked as a **separate** future audit.
Next user-selected direction is resolving the two Astra High review findings
in draft [PR #115](https://github.com/maxvfk/game-calendar/pull/115), subject
to a separate follow-up; **NO GO** for any Timeline v2 cutover.
**STOP after this HSR P0 fix.** PR #115, E2a.1 and Source Recovery are untouched.

## ZZZ B1 — unattended banner recovery: IMPLEMENTED, SECONDARY RSS (2026-10-27)

Delivery: [PR #112](https://github.com/maxvfk/game-calendar/pull/112), from main
`3585bbe` after #105/#107/#109/#111; no parallel B1 was present. Per-candidate
permission/content gate, source limitations and sustainable reviewed fallback:
`docs/research/zzz-banner-source-recovery-b1.md`. Raw runner response hashes and
metadata: `docs/evidence/zzz-b1-{gate-a,rss-gate,production-refresh}-2026-10-27.json`.

- **Gate A PASS for Zenless.gg Updates RSS**: advertised native syndication,
  ordinary project UA/robots/terms, actual runner index + dated details + feed.
  Official HoYoLAB HTML is an identical 7,213-byte shell; P0 desktop/mobile
  failures were not rerun. Icy Veins is accessible but has date/countdown
  contradictions; rng.moe/Poly Cal do not establish a complete dated regional
  source contract or a documented usable public data feed/repository.
- Dynamic RSS item discovery, no version/article-ID list. Five notices produce
  separate Agent/W-Engine/new/rerun channels: **3.0 II, 3.1 II, 3.2 I/II, 3.3 I**.
  Selectable rerun channels retain their actual identities and featured subjects.
  Provenance is **estimated (0.8)** with the actual secondary notice URL, never
  official by copying a publisher attribution. Referenced update day is explicit
  in the same feed; starts stay day precision, no maintenance-duration addition.
- Exact fixed Asia +8 / Europe +1 / America −5 ends. Current four #105 banners
  end **2026-11-11 03:59Z / 10:59Z / 16:59Z** (11:59 server). 3.2 II explicitly
  ends 14:59 server, not a customary 03:59. No 3.3 II or trials are inferred.
- **Real unattended Actions refresh** [40512622186](https://github.com/maxvfk/game-calendar/actions/runs/40512622186),
  **2026-10-27T13:30:35.554Z (16:30 Moscow)**: HTTP 200, **20 parsed**, **1/1
  confirmed**, **0 warnings/broken**, no access/force overrides. Native RSS raw
  hash matches the Gate A capture; persistent snapshot is a factual JSON capture
  plus original HTTP hash/length, not a re-hosted article feed. Metadata hashes
  the stored JSON; validators still belong to upstream RSS. Normal scheduler,
  six-hour floor/initial-main bootstrap, conditional requests and LKG remain in use.
- **Coverage:** 8 existing reviewed overlaps; **12 new automatic historical
  winners**, **8→20 ZZZ banner records**, **66→78 ZZZ**, **229→241 total**,
  241 unique IDs. Current coverage stays four Phase I banners; unexpired ZZZ
  stays 26. No artificial future-coverage gain is claimed. All 30 reviewed rows,
  all 229 prior full-feed winners, other source-health rows and the existing NTE
  date conflict are unchanged in the fixed-clock actual replay:
  `docs/evidence/zzz-b1-feed-replay-2026-10-27.json`. Steam's 43 parsed events and
  all 12 Shiyu/Deadly projections survive unchanged; reviewed files untouched.
- Reviewed wins independently of confidence/order; copied notices do not add a
  corroboration bonus. Exact one-minute contradictions remain visible. Malformed,
  zero, missing version anchor, partial channel set, lost live identities (even
  hidden by many historic rows), newer update without channels and expired-only
  200/304 responses fail closed with LKG and visible failed confirmation.
- **Checks:** frozen install/typecheck/build PASS; full tests **1341 pass,
  3 existing age-dependent skips, 0 fail** (71 files). 15 new offline cases
  include real multi-version excerpts, discovery, regions, IDs, mirror/reviewed
  conflicts, retention/304/bootstrap and full-feed isolation. Final totals and
  final-head CI/post-merge CI/Pages/deployed-feed checks are recorded in PR #112.
  Temporary research/validation PR workflows are removed; no new scheduler.

**Limits:** publisher-independent mirror can lag or omit a notice. A successful
HTTP check is not proof of complete publisher coverage. 3.3 II is absent from
notices and deliberately unpublished; audition/trial automation remains outside
this adapter. Official HTML recovery is still blocked, not silently fixed.

**Next concrete step:** verify the first newly published phase notice through the
normal scheduler and compare its four channel identities/regional deadlines with
an official/in-game capture; use the documented reviewed fallback if the mirror
lags. This does not start summaries, Timeline v2, Account/Sync or another milestone.
**STOP after B1.**

## ZZZ Shiyu / Deadly Assault 2026 re-anchoring: IMPLEMENTED (2026-10-27)

Delivery: [PR #111](https://github.com/maxvfk/game-calendar/pull/111).

Bounded implementation from current main `103d746`, after #109/#110; no parallel
re-anchoring PR was present. Task: `docs/tasks/ZZZ-ENDGAME-REANCHORING-2026.md`.
Per-mode gate, dated sources, exceptions and retrieval limits:
`docs/research/zzz-endgame-reanchoring-2026.md`. Fixed-clock full-feed proof:
`docs/evidence/zzz-endgame-feed-replay-2026-10-27.json`.

- **Shiyu PASS:** canonical official 2.4 amendment and 2.5 transitional Phase I
  ending January 9 at 03:59 establish the January 9, 2026 04:00 post-transition
  anchor. Independently dated September/October resets corroborate the current
  October 16–30 cycle. Official bodies were read through their canonical search
  index, not fetched as runnable HTML ingestion. A July 7 secondary changelog
  anomaly remains unexplained; no uninterrupted historical January→October
  schedule is claimed. Production `effectiveFrom` is conservatively October 16.
- **Deadly PASS for estimated recurrence:** January 16 anchor is corroborated
  independently by dated January showcases, August/September observations and
  the explicit current October 23–November 6 window. No official 2026 phase-change
  notice was found. Production `effectiveFrom` is October 23; source is the
  secondary Team Forge page, not an official URL. Neither mode is blocked;
  neither is labelled individually announced/official.
- Existing recurring engine, 14-day cadence and 70-day start horizon; both
  modes publish **estimated projections** (Shiyu 0.9 / Deadly 0.75). Starts retain
  honest server-day precision, ends exact inclusive 03:59 before 04:00 reset.
  Fixed Asia +8 / Europe +1 / America −5 offsets are independent of viewer DST.
  Shiyu October 30 end: **Oct 29 19:59Z / Oct 30 02:59Z / Oct 30 08:59Z**;
  Deadly November 6 end: **Nov 5 19:59Z / Nov 6 02:59Z / Nov 6 08:59Z**.
- Current Shiyu **Oct 16→30**, then Oct 30→Nov 13, Nov 13→27, Nov 27→Dec 11,
  Dec 11→25, Dec 25→Jan 8. Current Deadly **Oct 23→Nov 6**, then Nov 6→20,
  Nov 20→Dec 4, Dec 4→18, Dec 18→Jan 1, Jan 1→15. Ongoing cycles remain
  present through the last regional deadline even when their start is >7 days old.
- At `2026-10-27T11:00Z`: **12 new rotations (2 current + 10 future)**;
  **54→66 ZZZ records**, **217→229 whole feed**; unexpired ZZZ **14→26**
  (10 active + 16 upcoming). All 217 previous winners and all 30 reviewed rows
  remain byte-for-byte equal in the fixed-clock replay, with unchanged source
  health/conflicts and unrelated-game hash. No snapshots/reviewed files edited.
  Existing September IDs and completion keys survive; new IDs follow the same
  `Mode (Mon D)` title/server opening day convention, including year rollover.
- Explicit sourced rows win without a projection confidence bonus. Exact regional
  mismatches, including one minute between estimated rows, remain review conflicts
  and freeze that mode's other projections. A separately verified effective rule
  can release its future cycles without rewriting historical records. Other
  recurring schedules and #109 Steam ingestion are unchanged; source freshness
  is not advanced by calculations.
- **Validation:** frozen install/typecheck/production build PASS; full tests
  **1326 pass, 3 existing age-dependent skips, 0 fail** (70 files).
  15 new regression cases cover anchors, cadence, deadlines, IDs, all reviewed
  rows/order independence, conflicts, effective overrides and feed isolation.
  CI/Pages and deployed-feed verification are recorded in the implementation PR.

**Operator phone smoke still required:** open ZZZ, confirm the two current rows
and next rotations appear once, switch Asia/Europe/America and compare deadlines
with each game's countdown; check completion survives reload and September history
keeps its previous keys. Report any in-game schedule exception for a new effective
rule. This delivery does not claim a new in-game capture or official Deadly anchor.

**Next concrete step:** separate `docs/tasks/ZZZ-BANNER-SOURCE-RECOVERY.md` B1.
No banner, other endgame, Timeline v2, Event Context or Account/Sync work started.
**STOP after this milestone.**

## ZZZ E1 — Steam events-only unattended recovery: COMPLETE (2026-10-27)

Implemented from current main `e32cd62` after #105/#107/#108; no parallel recovery
was present. Source contract, counts, precision and failure behavior:
`docs/evidence/zzz-steam-events-recovery.md`. Delivery: [PR #109](https://github.com/maxvfk/game-calendar/pull/109).

- `zzz-steam-events-official` uses the verified official Steam Community RSS,
  ordinary robots, six-hour floor, conditional requests and existing refresh
  schedule/LKG/zero/drop/source-health guards. Game8 stays disabled; Steam API
  exception is unchanged. Discovery reads feed items, with no per-version IDs.
- Deterministic bounded version-update `New Events` sections; explicit date/year/
  timezone/relative-version anchors only. Server-local starts stay day precision;
  ends retain exact Asia/Europe/America instants. No maintenance-completion,
  banner, trial or recurring-endgame periods inferred.
- **Actual Actions refresh:** [40426199820](https://github.com/maxvfk/game-calendar/actions/runs/40426199820),
  2026-10-27T00:24:39.002Z: **43 events**, **1/1 confirmed**, **0 warnings/broken**.
  Ten publisher posts dynamically discovered; four supported updates (3.0–3.3),
  including **eight 3.3 events**. Raw runner snapshot/metadata and durable proof
  are committed; no fixture-only production claim. Temporary validation workflow
  removed; production uses only the existing refresh workflow/schedule.
  ZZZ-only bootstrap uses the committed capture timestamp if PR-scoped state
  is absent on main, preserving the first six-hour floor without fake freshness.
- **Merge/coverage:** 43 candidates, **19 exact-ID overlaps**, zero new conflicts;
  **54 ZZZ winners = all 30 unchanged reviewed + 24 automatic historical rows**.
  Before/after unexpired coverage is **14 → 14 (8 active + 6 upcoming)**; the
  additional 24 rows have ended. Whole feed **193 → 217**, seven games. All 30
  reviewed IDs/fields/URLs/provenance/timestamps and file bytes preserved; other
  game events and snapshots unchanged. New supported notices can populate the
  automatic feed without a reviewed/code edit.
- **Checks:** frozen install/typecheck/full build PASS; **1311 tests pass,
  3 existing age-dependent skips, 0 fail** (69 files). Fourteen focused regressions
  cover discovery, dates/regions, duplicates/reviewed precedence, malformed/zero/
  drift/outage/robots/interval/304/sharp-drop/LKG and whole-feed isolation. Final
  PR CI/PG17 and post-merge CI/Pages links are recorded in PR #109.

**Partial recovery only:** banners/trials remain reviewed-only. **Next concrete
step:** separate `docs/tasks/ZZZ-BANNER-SOURCE-RECOVERY.md`, ahead of editorial
v2/E2b summaries. No banner task, Timeline cutover, Account/Sync or recurrence
work was started. **STOP after this milestone.**

## ZZZ recovery coordination — source restoration before editorial summaries (2026-10-27)

Operator priority after the blocked full-source Gate A (#107): **finish ZZZ source
recovery before Timeline v2 cutover / Event Context E2b–E4 summaries**. This is
milestone ordering, **not** an implementation claim.

1. First implementation-ready bounded task:
   `docs/tasks/ZZZ-STEAM-EVENTS-ONLY-RECOVERY.md`: official Steam publisher RSS,
   real runner ingestion of limited-time events, no invented banner periods,
   reviewed records/IDs unchanged. Steam event extraction is COMPLETE in #109 (see E1 above).
2. Then separately gated banner task:
   `docs/tasks/ZZZ-BANNER-SOURCE-RECOVERY.md`: find a truly usable compliant
   dynamic dated-phase source in the actual runner, then implement only if the
   gate succeeds; otherwise preserve reviewed updates and document the blocker.
   Banner ingestion is implemented in B1 #112 via secondary RSS; official native HTML remains blocked.
3. Resume editorial v2/E2b planning only after these bounded ZZZ recovery
   steps are assessed; do not misreport events-only as full ZZZ recovery.

Both task specifications were prepared after the #107 evidence; they do not
change the historical #107 full-scope BLOCKED finding. The later E1 section
above records partial events-only implementation.

## ZZZ full source recovery P0 — historical Gate A BLOCKED (2026-10-27)

Current-main baseline `ffe2356` after #105/#106; no concurrent recovery PR
was open. Actual GitHub-hosted Ubuntu 24.04 runner evidence:
[desktop + Steam 40418840773](https://github.com/maxvfk/game-calendar/actions/runs/40418840773),
[mobile 40419057435](https://github.com/maxvfk/game-calendar/actions/runs/40419057435).
Detailed findings, response hashes, scope of the verdict and fallback:
`docs/research/zzz-source-recovery-p0.md`; durable metadata under
`docs/evidence/zzz-p0-*-2026-10-27.json`.

- Official desktop/mobile news index and six sampled detail responses are
  HTTP 200, but all return the same **8,184-byte Nuxt shell**, with identical
  SHA-256 and no news links/article body. Robots is HTTP 404 (not a refusal);
  conditional requests return 304 for the shell, not for news freshness.
- Verified official publisher Steam distribution (`appid=4162040`): allowed
  community HTML/RSS HTTP 200; documented GetNewsForApp v2 HTTP 200, 12 posts.
  Discovery works without per-article IDs. The current 3.3 post has all eight
  event periods, but no current Phase I channel notice/four-banner deadlines;
  neither the rerun pair nor its current period can be recovered from it.
- **Full events + banners Gate A fails on content, not a universal access ban.**
  No production parser/adapter or fixture-only integration is introduced.
  Game8 stays disabled. Existing source health, outage/LKG/parser-zero guards,
  reviewed overrides and recurrence restrictions remain unchanged.
- Coverage before/after: **30 reviewed records, 8 historical/current banner
  rows; 14 unexpired (8 active + 6 upcoming) at the first capture**, including
  #105's 13 current-version rows (8 events, 4 banners, 1 trial). Automatic ZZZ
  sources **0 → 0**. All reviewed bytes, IDs, provenance, dates and snapshots
  are unchanged. No event additions or new coverage are claimed.
- Retained a **manual-only** Actions probe, no schedule. Raw pages stay in
  seven-day artifacts; committed evidence is metadata/hashes, not full notices.
- Local checks: frozen install/typecheck/build PASS; `bun test` **1297 pass /
  3 existing age-dependent skips / 0 fail**, 68 files. Initial PR CI
  [40418841107](https://github.com/maxvfk/game-calendar/actions/runs/40418841107)
  passes including PG17/age checks and site build. Final PR delivery and any
  post-merge checks are recorded on [PR #107](https://github.com/maxvfk/game-calendar/pull/107).

**Next concrete step:** separately scope partial official Steam **events-only**
recovery (eight 3.3 periods are actually available), explicitly retaining
reviewed-only banners; or obtain a supported official feed/HTML surface that
contains dated phase notices before retrying full Gate B. Until then, update
phase notices through the existing reviewed channel with explicit source review.
Do not claim unattended banner recovery. Shiyu/Deadly re-anchoring and Timeline
v2/E2b remain separate and were not started. **STOP after this P0 verdict.**

## ZZZ P0 coverage recovery — official 3.3 reviewed hotfix (2026-10-27)

**Emergency restoration:** the only listed ZZZ automatic source,
`zzz-game8-events`, has `scheduled: false` after Game8 CloudFront HTTP 202
responses from GitHub Actions. At that emergency checkpoint no alternative live ZZZ source was configured.
The previous reviewed batch had 17 historical records, with only
`Angels Support Operation` still current by 2026-10-27; newer
Version 3.3 events and banners were missing.

- [PR #105](https://github.com/maxvfk/game-calendar/pull/105) adds **13**
  officially announced, event-local Version 3.3 records (8 limited events,
  4 Phase I agent/W-Engine banners, 1 audition/trial row), retaining all
  17 prior records and their IDs verbatim. Direct official evidence:
  [Version 3.3 update](https://zenless.hoyoverse.com/en-us/news/166963)
  and [Phase I channels](https://zenless.hoyoverse.com/en-us/news/166926).
- Publication contract: official provenance and fresh per-row verification
  timestamps; day-precision starts rather than inventing a specific
  post-maintenance instant or one global server clock; independently
  verified exact Asia/Europe/America *ends* from stated server-local clocks.
  New version-specific IDs are distinct from earlier identically named
  events. Do not invent Phase II dates or recurring Shiyu/Deadly resets.
- **This is a manual reviewed-data restore, not repaired ingestion.**
  No parser, source access/robots, M4 Timeline, event-ID policy, Account/Sync,
  source-refresh scheduler or E2a migration code changed. Old reviewed
  event history is preserved; the issue remains open until automatic ZZZ
  ingestion works and is observed in CI.

**Next concrete step (P0, independent source-ingestion Work):** validate official
ZZZ news index/detail access and robots in the actual Actions runner. Implement
a narrow official ZZZ adapter only if that evidence allows; otherwise identify
a compliant independently verifiable source and keep reviewed-data updates
as the interim fallback. Prove future unattended event + banner refresh and
stable IDs, with source-health/parser-zero gates. Investigate current
Shiyu/Deadly Assault anchors **separately**, never infer them from stale rules.
This emergency follow-up must not expand into E2b or a Timeline v2 cutover.

## Editorial provenance E2a — PREPARED / REHEARSED, NOT LIVE (2026-10-26)

Bounded E2a after E1 #102 and hardening #103. Detailed inventory, contract,
source commits/counts, offline replay and cutover/rollback gates:
`docs/evidence/editorial-provenance-e2a.md`.

- Strict persisted Timeline decisions v2: explicit `operator_approved`,
  `automated`, `legacy_unknown`; nullable evidenceHashAtDecision required for
  every non-label. Reuses existing decision/copy/fingerprint constraints.
  No summary registry, displaySummary or Event Detail work.
- Versioned **historical** `timeline-origin-migration.v1.json`, anchored to
  main `72def1e`: **50 decisions — 25 operator-approved (#87), 25 automated
  (c0b933f), 0 legacy_unknown**. Audits every registry-changing commit through
  that boundary, including author+committer, subject, full diff, per-record
  eventId/fingerprint/content and replacement lineage. No later registry write
  exists at this audit boundary; the adapter enumerates future writes too.
- Pure migration, exact v1 rollback, unwired evidence-only eligibility policy:
  automated keep/research and operator research may reopen on verified changed
  evidence (null→hash counts); all labels, operator keep and unknowns protected.
  Outage/extraction failures, unmatched canonical input and unverified hashes
  do not requeue. Semantic fingerprint is unchanged.
- Offline read-only inventory/rehearsal CLI requires full Git history and fails
  on any new registry history/content, even same-byte reverts. A failed check
  clears old previews. Temporary v2/rollback/report outputs stay under ignored
  tmp/editorial; **no v2 production snapshot or second writer** is committed.
- **Rehearsal:** repeated inventory/migration deterministic; all **12 labels**
  preserved; **38 non-label evidence keys null**; rollback byte-identical to v1.
  Disposable actual feed builds from v1 → v2 compatibility projection → rollback
  preserve all public JSON bytes. New real/synthetic bot commits, altered
  fingerprints, mixed/unknown edits and replacement history exercised.
- **Checks:** Bun 1.3.14 frozen install/typecheck/full build PASS;
  full suite **1,296 pass / 3 existing age-dependent skip / 0 fail** (68 files);
  new focused suite **26 pass**. Whole-repository fixed-input feed/queue/agent
  input/review are byte-identical to pre-E2a main. Existing M4 files unchanged.
  Historical fixture validation works in shallow CI without blocking healthy
  future v1 writer commits; freshness is a separate rehearsal gate.

**Production remains v1 M4.** No Claude/API call, schedule/kill-switch change,
production evidence requeue, event/source/summary/timelineTitle/UI/Account change.
PR/CI/Pages delivery records belong to the implementation PR.

**Next concrete step:** review this preparation and separately scope/authorize
controlled v2 cutover with fresh inventory, drained/blocked old writers, one
atomic reader/accept/writer switch and rollback. No live migration is claimed.
**STOP AFTER E2a**; E2b/E3/E4 were not started.

## WuWa E1 — optional evidence fail-open hardening (2026-10-26)

**Scope:** focused follow-up to E1 ([PR #103](https://github.com/maxvfk/game-calendar/pull/103));
the canonical WuWa feed remains authoritative. E2–E4 are not started.

- **Confirmed failure mode:** the stricter `sourceExcerpt` traversal normalizes
  soft line breaks differently from the canonical WuWa parser; it can see a
  candidate the canonical parser ignores and throw on its invalid date. Before
  this change, that *auxiliary* exception propagated through `build:feed`.
- **Fix:** `safelyExtractWuwaEvidence` catches only auxiliary extraction
  exceptions, drops **all** WuWa evidence for that failed extraction and
  emits a bounded `source_extraction_failed` diagnostic; no raw exception
  or source text goes into the diagnostic. `safelyBuildEvidenceSidecar`
  similarly handles invalid auxiliary candidates/hash/schema and writes a
  valid empty sidecar with `sidecar_assembly_failed`. Warnings distinguish
  evidence failure from canonical parser success. Canonical parser, source
  health/zero gates, merge, source provenance and public feed errors remain
  **fail-closed** under existing rules.
- **Regression:** a real two-mode Atom parser divergence now has an offline
  `build:feed` replay asserting successful exit, unchanged public feed/queue/
  input bytes and a diagnosed empty evidence sidecar. Additional tests cover
  normal-path identical sidecar, invalid capture metadata, and invalid
  evidence-sidecar assembly.
- **Checks:** GitHub PR
  [CI 40382720062](https://github.com/maxvfk/game-calendar/actions/runs/40382720062)
  green: Bun 1.3.14 frozen install, typecheck, `bun test` **1270 passed /
  3 existing skips / 0 failures** (67 files), `build:feed` and site build;
  PG17 recovery/concurrency job passed. PR Pages deployment correctly skipped.
  No new source fetch, runtime AI call, Timeline registry/fingerprint,
  schedule, kill switch, `summary`/`timelineTitle`, IDs, UI or Account/Sync change.
  Post-merge CI/Pages verification will appear in PR delivery record.

**Next step after hardening (preparation completed above):** E2a provenance
contracts and migration rehearsal. Live cutover and E2b/E3/E4 remain gated.

## Event Context E1 — WuWa internal evidence: COMPLETE (2026-10-26)

Implemented from current `main` `25ee442` after PR #100/#101. Detailed contract,
real source-span examples, fixed-input hashes and measurements:
`docs/evidence/event-context-wuwa-e1.md`.

- Pure event-local WuWa extractor shares existing identity/date traversal;
  normalized evidence candidates must still match the original parser output.
  Public parser interface, event copy/IDs/dates/precision/provenance and merge
  semantics are preserved.
- `build:feed` generates **untracked** `tmp/editorial/event-evidence.v1.json`
  from exactly the feed's successful snapshot/fixture/context. Strict schema,
  original source references and honest capture metadata, deterministic
  `event-evidence-sha256-v1`; no evidence in public/Pages/Timeline input.
- Exact final-winner association, separately attributed same-ID reviewed winners,
  explicit mapping seam (no production mappings); ambiguous IDs/sections/source
  conflicts fail closed with internal diagnostics. No fuzzy title transfer.
- PR #101 bounds enforced: **2,000 Unicode code points/event, 6 excerpts,
  500/excerpt, 2 documents**, combined across sources. Whole facts only;
  no truncation, no limit change.
- Real snapshot: **6/7 WuWa events**, six fragments, **771 code points**;
  fragment min/median/max **112/123.5/163**, **0 cap hits**, **0 ambiguous
  associations**. Artisan's Search lacks substantive captured activity and is
  diagnosed. Approximate context **193 excerpt tokens / 901 eligible-JSON tokens**
  at 4 characters/token; no model call or tokenizer/cost claim.
- **Validation:** Bun 1.3.14 frozen install/typecheck/full build PASS;
  `bun test` **1,266 pass / 3 existing age-dependent skip / 0 fail**;
  focused WuWa/evidence **24 pass**. Fixed-time whole-repository replay:
  `events.v1.json`, Timeline queue, agent input and review JSON **byte-identical**
  to pre-E1 main; automated small-fixture golden replay also passes. Public assets
  exclude evidence. No workflow/schedule/kill-switch, label registry/fingerprint,
  UI, Account/Sync or AI changes.

**Next concrete step:** separately authorize **E2 registry/provenance contracts**
from then-current main; re-inventory all automatic registry writes at migration.
**Stop after E1**; E2–E4 were not started. PR/CI/merge delivery is recorded in
this implementation's PR.

## Event Context / unified Editorial Agent — D0 DESIGN GATE COMPLETE (2026-10-26)

**Scope:** technical design and task scoping only. Runtime, scheduled Timeline
M4 agent, parser output, editorial decisions, `summary`, `timelineTitle`, data
provenance, source access and public feed are **unchanged**. Detailed source-backed
contract: `docs/research/event-context-editorial-technical-design.md`;
supersedes the exploratory choices in
`docs/research/event-context-unified-editorial-design.md`.

- **Service-only event evidence:** deterministic, bounded per-event
  `sourceExcerpt` (pilot hard cap: ≤6 source-local excerpts,
  ≤500 Unicode code points each, **≤2,000 total per event**) extracted
  from the already permitted source snapshot; actual length/cap-hit
  metrics will determine whether later tuning is worthwhile. Generated to a local/untracked editorial sidecar, outside
  `public/` and `GachaEvent`. Event content/captured provenance and
  stable `evidenceHash` are separate from the user's summary.
- **Verified attribution after merge:** exact `sourceEventId` and
  final event ID/source, or explicitly reviewed mapping. No automatic
  transfer based only on similar titles/date or shared source article:
  `mergeEvents` currently merges near matches and discards losing
  record lineage. Ambiguities fail closed and must be diagnosed.
- **Future presentation:** canonical `summary` stays unchanged; a
  separate reviewed editorial registry will supply optional
  `displaySummary` with Event Detail fallback, and reveal
  `Original summary` when present and different. The existing
  `timeline-semantic-sha256-v1` excludes both AI copy and service
  evidence and remains unchanged until a separately approved migration.
- **One model call, independent outputs:** future unified
  read-only `propose` job requests summary and/or Timeline label once
  per union batch; fresh-main `record` job validates each decision
  separately. Claims are checked against attributable canonical/source
  facts, never against AI text. AI summary production stays off
  until shadow evaluation, rehearsal and operator GO.
- **Durable provenance and requeue:** a future versioned label-decision
  contract explicitly distinguishes `operator_approved`,
  `automated`, and protected `legacy_unknown` records.
  Use an audited one-time manifest to classify the original 25
  operator-approved PR #87 decisions and **all** automatic
  registry-only bot commits up to the migration (starting with
  `c0b933f`; the Tue/Sat schedule keeps adding them); never rely on
  git history as the sole runtime origin store. Evidence-only requeue
  (null recorded evidence key counts as changed) covers automatic
  `keep_original` and `needs_research` plus operator-approved
  `needs_research`. Labels, operator-approved `keep_original` and
  unknown-origin decisions are protected.
- **Next bounded task ready:** `docs/tasks/EVENT-CONTEXT-WUWA-PILOT.md`
  rewritten for **E1 evidence-only WuWa extractor**; original direct
  parser→`summary` task is superseded. E2 origin/summary registries,
  E3 one-call shadow and E4 production enablement are **not
  authorized by this gate**.

**Validation:** architecture checked against CURRENT `main` and
existing WuWa parser, merge, feed, label fingerprints/accept, Event
Detail, M4 workflow and tests. Documentation-only; no local Bun
runtime/test claim. GitHub PR/CI evidence will be recorded upon
publication.

**Next step at D0 (completed above):** the bounded E1 WuWa service-only evidence
implementation. E2–E4 remain separately authorized milestones.

## Autonomous Timeline label editor M0–M4 — COMPLETE (2026-10-26)

**Current-state checkpoint:** the sections below documenting L1/L2 and the early editor-input
pilot are *historical*; their "no AI / no scheduler / next pilot" statements described
those earlier milestones, not the current `main`. Canonical operating instructions:
`docs/tasks/TIMELINE-LABEL-AUTONOMOUS.md`; editorial registry contract:
`data/presentation/README.md`.

- **M0/M3, Claude subscription headless:** operator provided
  `CLAUDE_CODE_OAUTH_TOKEN` in GitHub Actions Secrets; the read-only
  `timeline-labels-probe.yml` proved a real, structured Sonnet call, exact
  event IDs/fingerprints and deterministic validation. Probe
  [40336557898](https://github.com/maxvfk/game-calendar/actions/runs/40336557898)
  and post-M2 probe
  [40344178775](https://github.com/maxvfk/game-calendar/actions/runs/40344178775)
  succeeded (25 accepted, 0 guarded/rejected in the latter).
- **M1, [PR #94](https://github.com/maxvfk/game-calendar/pull/94):**
  Event Detail displays an approved `timelineTitle` as the main heading,
  with canonical `Original title` below; custom events, absent labels and
  accessible names retain the established fallbacks. No user-data or date change.
- **M2, [PR #95](https://github.com/maxvfk/game-calendar/pull/95):**
  `acceptTimelineProposals` validates each model decision independently against
  the fresh feed and registry. Unknown/expired/stale/already decided items are
  rejected; name/claim/qualifier/overlap guard failures become
  `needs_research` with `auto-guard:`. Guard evidence comes exclusively from
  canonical source inputs, **never model-written text**. Registry writes are
  deterministic and idempotent.
- **M3.5, [PR #96](https://github.com/maxvfk/game-calendar/pull/96):**
  isolated propose/read-only Claude job and record/write job with no Claude
  token; repeat on fresh `main`, full install/typecheck/tests/build,
  fast-forward-only `main` push (or disposable rehearsal branch), explicit CI
  dispatch and report. Rehearsal
  [40346051669](https://github.com/maxvfk/game-calendar/actions/runs/40346051669)
  recorded 25/25 decisions onto `timeline-labels/rehearsal`; its dispatched
  [CI 40346322560](https://github.com/maxvfk/game-calendar/actions/runs/40346322560)
  passed without Pages deploy.
- **M4, [PR #97](https://github.com/maxvfk/game-calendar/pull/97):**
  production-capable `.github/workflows/timeline-labels.yml` scheduled
  **Tuesday and Saturday, 04:23 UTC (07:23 Moscow)**, using
  `vars.TIMELINE_LABELS_AUTO == 'on'` as the kill switch for scheduled or manual
  `main` recording. Default manual target is rehearsal. Empty queue consumes
  no model call; subscription limits / 429 / 529 skip writing and allow later
  retry. Access token renewal documented before 2027-10-26.
- **First actual automated write to production data (manual workflow_dispatch,
  `target: main`):** [Timeline run 40353294714](https://github.com/maxvfk/game-calendar/actions/runs/40353294714)
  succeeded, producing **registry-only** commit
  [`c0b933f64ccb6bc3e579dc6855ebf7a32022b4ad`](https://github.com/maxvfk/game-calendar/commit/c0b933f64ccb6bc3e579dc6855ebf7a32022b4ad)
  with 25 accepted decisions; dispatched
  [CI/Pages 40353569869](https://github.com/maxvfk/game-calendar/actions/runs/40353569869)
  succeeded. Verified registry at 2026-10-26 checkpoint: **50 decisions:
  12 labels, 30 keep_original, 8 needs_research**. This establishes the
  unattended **write/deploy path**, but is **not evidence that the Tue/Sat
  cron has fired**. The current Actions variable value cannot be read via
  the repository code alone; check GitHub Variables for the live switch state.
- **Follow-up documentation, [PR #98](https://github.com/maxvfk/game-calendar/pull/98):**
  future Event Context enrichment must requeue **automatic**
  `keep_original` **as well as** `needs_research` after a *material*
  change to sourced evidence. Preserve approved `label` decisions and
  explicitly protected human-reviewed choices. `sourceExcerpt` remains
  service-only; this requeue/evidence-key design is **not implemented yet**.
  Post-merge [CI/Pages 40354623379](https://github.com/maxvfk/game-calendar/actions/runs/40354623379)
  passed on `0c5c47a`.

**Next step at that time (done since):** the Event Context technical design
gate. It closed as D0 in PR #100; see the section above for the current next
step. **Operator decision (2026-10-26)** carried into D0: make human-reviewed
vs automatic editorial provenance a durable, explicit part of the future
decision contract, never Git commit authorship/history alone, with a
conservative migration for legacy registry entries.

## Timeline label agent preferences — memory-independent input (2026-10-25)

- The operator accepted all eight AI-generated Timeline labels in PR #87; first batch
  completed: 8 `label`, 15 `keep_original`, 2 `needs_research`. In particular, the
  user explicitly preferred a concrete `Standard Wish 5-Star Character Invitation`
  and a longer `Echoes of War: Season of Phantasia` over the respective originals.
- **Canonical editorial preferences:** `data/presentation/timeline-label-preferences.v1.json`,
  versioned and reviewed in Git. These guide decisions, not source facts, and do not
  depend on account Memory, previous chats, a given Work session or a model.
- **Single-file handoff:** `build:feed` additionally emits
  `public/data/timeline-label-agent-input.v1.json` containing the exact L1 queue
  plus `editorialPreferences`. The original public `timeline-label-queue.v1.json`
  and existing proposal/registry contracts are untouched.
- Strict preference validation and regression tests guard the bundle. No model/API
  integration, scheduled task, automatic Git write, M1/M2 or source change.
  External scheduled access to the published URL still needs verification; a manual
  CI-artifact attachment is an interim option.

**Next concrete step:** verify the published single-file input and run an agent using
only that file; separately validate unattended retrieval and review-only Git handoff
before enabling a schedule.

## Timeline labels L1 — deterministic infrastructure (2026-10-25)

Implemented in [PR #84](https://github.com/maxvfk/game-calendar/pull/84), from current
main `d16c567` after #83 ([baseline CI](https://github.com/maxvfk/game-calendar/actions/runs/40143530301)
successful). Only L1; accepted M1/M2 navigation, geometry and data rules are retained.

- **Registry:** `data/presentation/timeline-labels.v1.json` (initially empty),
  contract/editorial rules in `data/presentation/README.md`. Strict versioned
  `label` / `keep_original` / `needs_research`, unique IDs, bounded plain-text
  copy/reasons. Invalid sidecars fail build/CI; stale/orphaned entries stay in Git
  and are diagnosed. No source/reviewed record is changed.
- **Deterministic processing:** `src/presentation/timeline-labels.ts` owns fixed-order
  semantic SHA256, exact-ID/fingerprint application, repeat suppression, bounded
  queue, conservative expiry/overlap, duplicate ambiguity checks and read-only
  proposal validation. Observation/deadline/rules-version changes do not requeue;
  genuine semantic changes do. Parked research does not loop into routine work.
- **Feed/UI:** `scripts/build-feed.ts` applies approvals after final merge and emits
  `public/data/timeline-label-queue.v1.json` through the unchanged CI/Pages pipeline.
  Optional schema `timelineTitle` is presentation-only. `src/shared/timelineIdentity.ts`
  and `src/client/state/timelineContent.ts` use approved copy → M1 subjects → title;
  full canonical title/original subjects remain accessible. Event Detail, source
  provenance, dates/precision, IDs/completion keys, custom events and old feeds remain
  compatible. Empty registry leaves the app/feed appearance unchanged.
- **Local seams/tests:** `scripts/timeline-labels.ts` generates a queue from a fixed
  feed or validates proposals without writing. `test/timeline-labels.test.ts` includes
  offline builder/replay regressions. `scripts/prepare-timeline-label-browser.ts`
  prepares a disposable real-browser fixture; it is never a deployed asset.
- **Validation:** Bun 1.3.14 frozen install, typecheck, full build pass; full tests
  **1203 pass / 3 existing age-dependent skips / 0 fail**; focused tests **69 pass**.
  CLI replay matches built queue bytes. Real Chromium label matrix at 320/390/1440px,
  both modes/themes, 100%/200% text, long/short copy and truthful ends passed;
  separate M2 navigation rerun **258 checks passed**. Runtime navigation was unchanged.
  Detailed evidence/limits: `docs/evidence/timeline-labels-l1.md`.
- **Queue at local build time:** 179 published source events, 72 eligible, 25 in
  batch + 47 remaining; 107 historical. No production labels were added. Human review
  still determines semantic correctness; deterministic warnings are not proof.
- **Delivery record:** PR #84 carries exact final-head CI, merge SHA, post-merge
  CI/Pages and public queue verification. Optional physical phone/PC smoke stays
  with the operator. Independent audit remains deliberately deferred.

**Next concrete step:** a separately authorized L2 shadow/review-only agent pilot
on representative prepared batches. No AI/API integration, scheduled task, L2,
PR bot or automatic editorial approval was implemented. Draft #68, CZN,
Auth/Sync, Supabase and backup are untouched.

## CZN daily chip in Today's dailies (2026-10-24)

Operator request after GO 3: CZN should look and behave like the other games' dailies. UI
only. Server, schema, protocol, backup, Sync and existing CZN marks (legacy and new-policy)
are unchanged.

- [#80](https://github.com/maxvfk/game-calendar/pull/80) merged
  `5f530fb55067820577cb67732e7afae9b6006191` 2026-10-24T21:18:32Z; post-merge
  [CI 40133639803](https://github.com/maxvfk/game-calendar/actions/runs/40133639803) green incl.
  the PG17 job; **Pages deployed 21:20:27Z**. The published `main.js` contains the new chip and
  details strings, and the old panel text is gone.
- **Strip.** The CZN chip is the usual hue chip in Today's dailies, with its own key
  `czn-daily-utc18-opening-v1:dailies:czn` (the legacy `dailies:czn` log is never read or
  written). It runs on its own clock: 18:00 UTC and UTC opening-date keys in every Region.
  `next:` includes it; Catch up lists CZN days since cutover only.
- **No epoch yet** (account): the invite chip "Enable CZN 18:00 UTC". Tapping it is the
  owner-confirmed negotiation, and it is not counted in `n/m`. Not active / read-only chips
  are disabled.
- **Panel → details.** The separate panel became a folded "CZN resets at 18:00 UTC · details"
  under the strip: status, legacy history, pending count, recovery export, update check.
- **Controller.** One `useCznDaily` hook (replacing `CznDailyFeature`) feeds the chip and
  the details. It is inert when CZN is not shown and offline-first from a cached epoch.
- **Tests.** Policy-item modes; −1/+1 ms around 18:00 UTC in all Regions; legacy key absent;
  CZN as the next reset; `n/m` excludes the invite; read-only chip disabled; CZN catch-up
  equals the policy window. The DOM harness now drives the real strip. Windows local run:
  typecheck/build pass; `bun test` 1143 pass / 13 known host-specific failures (same as
  untouched `main`). Real browser (guest, local build): tick/untick, reload persistence,
  details open, 375 px without overflow.
- The handoff's real-device smoke checklist now describes this UI; the 2026-10-23/24 results stay as recorded.

## CZN GO 3 — controlled production activation: COMPLETE (2026-10-23, accepted 2026-10-24)

**Accepted 2026-10-24:** the operator observed the 18:00 UTC rollover. Smoke steps 1, 2 and
4–7 passed; step 3 is not verified, for the reason recorded below. The CZN Daily Reset at
18:00 UTC is live.

Operator-authorized after GO 1, GO 2 and the operator's GO 2 Auth/Sync smoke (login and
profile load, another game's daily change, Synced and persisted after reload: all OK). Scope:
standing `dailies:czn` only, reset 18:00 UTC, UTC opening-date day keys, separate epoch
namespace. Legacy rows are untouched. Other games, event IDs, Timeline and sources are unchanged.

- **A — final preflight** (operator read-only script, 19:38Z): public `541e46b` (CI 40002213278
  green), private `fcb24d2`; exact v2 `17bcce56…`; `enabled=false`; no epochs or new marks;
  17 effective ACL/RLS/RPC checks; anon PostgREST denied; internal/control schemas not exposed;
  no backup job in flight. Latest complete v2 pair validated, with archives outside retention.
- **B — client release**: [#76](https://github.com/maxvfk/game-calendar/pull/76) merged
  `d163e121e3cc5212f5faba234586950a7c2453b3` 19:50:59Z; post-merge
  [CI 40014645816](https://github.com/maxvfk/game-calendar/actions/runs/40014645816) green (incl. the
  PG17 concurrency/recovery job); **Pages deployed 19:52:24Z**. The published `main.js` contains
  the new client (SW build `a0f29694…`). `CZN_CUTOVER_ENABLED=true` turns on the client
  reviewed in #66/#67/#70.
  - Defect fixed: with no epoch, an updated client was told to "Update the app", and
    "Enable" was offered while the server was off. `syncCzn` now returns `serverEnabled`.
  - Tests: release gate on; explicit disabled path does zero I/O; refresh never requests
    cutover; the epoch binds only after owner confirmation; renegotiation is idempotent;
    a changed epoch refuses.
  - Local evidence (Windows, exact LF bytes): typecheck/build pass; `bun test` 1140 pass /
    13 fail, identical to untouched `main` on this host (2 more fs tests are flaky on `main`).
  - Real browser on the local build (guest): 18:00 UTC countdown and UTC opening date
    correct; true/false persisted across reload; legacy CZN chore hidden.
- **Recovery point before activation**: [run 40014899612](https://github.com/maxvfk/game-calendar-backups/actions/runs/40014899612)
  → `233c098`, SHA256 `abe17e00…1b2f`, real-key validate PASS, archived.
- **C — server activation** (operator `go3-activate`, rehearsed on synthetic PG17): pre-checks
  repeated, explicit `ENABLE CZN`, one transaction with guards (exactly one disabled row
  updated; policy/marks still empty). **COMMIT 19:58:49Z.** Post: `enabled=true`, the switch
  created no epochs/marks, ACL/RLS/RPC unchanged, exact v2 preflight PASS, anon denied.
- **D — hosted acceptance within safe access**: post-activation backup
  [run 40015709343](https://github.com/maxvfk/game-calendar-backups/actions/runs/40015709343) →
  `d16be75`, SHA256 `3bc0ce2b…1304`, real-key validate PASS; snapshot shows `enabled=true`,
  no epochs/new marks, legacy CZN rows retained. Owner-authenticated
  `czn_daily_negotiate`/`czn_daily_apply`, epoch/fence semantics on the hosted DB, owner
  isolation and the old cached PWA against a fenced profile were **not executed** by the
  agent (no synthetic accounts or JWTs). They are the operator smoke.
- **Residual risks**: an old cached PWA with a pending legacy CZN mutation on a fenced
  profile shows a generic Sync error until it updates (no loss; other rows apply
  idempotently); no epoch until an owner presses Enable; 19:52–19:58Z "not active yet" window.
  Emergency disable SQL is documented but needs a separate operator decision.

- **Operator real-device smoke** (Android Chrome tab + PC browser, same account,
  2026-10-23 20:18–21:03Z):
  - **Step 1 PASS.** The phone still ran the cached pre-#76 build. Offline it marked the legacy
    CZN chip and ZZZ (2 pending), then a view preference (3 pending).
  - **Step 2 PASS.** PC pressed Enable (owner-confirmed epoch). Today `2026-10-23` true→false,
    and false persisted after reload, with the correct countdown.
  - **Step 3 NOT VERIFIED.** After airplane mode Chrome kept reporting offline, so the
    old build never sent its batch. Server-side fence enforcement is covered by the PG17 CI job.
  - **Step 4 PASS.** The phone took the waiting update. It joined the same epoch (no Enable
    prompt, PC false kept). ZZZ and the preference synced. The legacy CZN mutation was held
    as `1 pending` ("CZN legacy changes held …") and preserved as 1 labelled legacy day; it
    was not converted into a new-policy completion.
  - **Step 5 PASS.** The updated phone, offline, toggled true/false/true. ✓ and pending survived
    an offline reload. After reconnecting: 0 new-policy pending and ✓ on both devices.
  - **Step 6 PASS.** The operator confirmed other-game changes sync both ways.
  - **Step 7 PASS** (phone, 2026-10-24 20:49Z). UTC opening date `2026-10-24`; a new unchecked
    `2026-10-24` chip appeared next to `2026-10-23 ✓`; the countdown read 21h 10m to 18:00Z on
    10-25; 0 new-policy pending; account Synced. The local midnight at 21:00Z on 10-23 had not
    changed the CZN day label, as intended.
- **Follow-up fix found during the smoke**: [#78](https://github.com/maxvfk/game-calendar/pull/78)
  merged `9a145b1a262f3db7cbcd89d12f9b27e669e49315` 2026-10-23T21:18:00Z. Post-merge
  [CI 40025743497](https://github.com/maxvfk/game-calendar/actions/runs/40025743497) green;
  Pages deployed 21:20:16Z. UI only, no data or protocol change:
  - the CZN panel day toggles are now hue chips and the actions are visible buttons
    (previously unstyled and read as plain text);
  - a held legacy CZN row is reported once as "kept on this device, not sent" instead of an
    endless `1 pending` with "update" wording, and it no longer starts a retry loop.

  The operator saw the deployed result: account Synced plus the held-row note, styled chips.
- **Operator follow-ups (optional, outside GO 3):** keep or remove the temporary operator tooling
  under `%USERPROFILE%\CalendarRecovery\go2`. The age identity and the archived encrypted pairs
  stay. Emergency disable remains a separate operator decision.

**Next concrete step:** none for CZN Daily Reset. Normal scheduled v2 backups continue; start
other milestones only on a new explicit request.

## CZN GO 2 — disabled additive production migration APPLIED (2026-10-23)

Operator-authorized GO 2 only. GO 3 (enablement) is not started: server
`czn_daily_release.enabled=false`, client `CZN_CUTOVER_ENABLED=false`, no profile
epochs, no PWA release, legacy CZN rows untouched, no Auth/user-row change,
no production restore. Overall: **migration and hosted/backup checks PASS. The
owner-authenticated Sync smoke is still a manual check.**

- Inputs: public main `cd619dd11ba2b5904a6d710b8e92c00412766c32` (#74, CI 39989460772
  success); backup pin `b5d46b5fa0b820f9d244302a77c34e7020cde2ee`; private main
  `c00090a` before GO 2; no backup job in flight; the latest v1 pair `8dfb3183…`
  revalidated with the real key and archived outside retention.
- Method: no Supabase connector or stored credential on the agent side. The operator
  ran a reviewed local fail-closed PowerShell script: exact Git bytes of the
  pin, PG17.11 `psql`, Session pooler `aws-1-eu-west-1`, TLS verify-full with the
  pinned CA, passwords typed hidden, URLs never printed, and an explicit `APPLY GO2`
  confirmation. It was rehearsed first against a synthetic local PG17 v1 schema
  (apply + 13 checks; a re-apply fails and rolls back; the guard refuses a v2 DB).
  Note: the desktop app virtualizes `AppData\Local`, so operator tooling lives
  under `%USERPROFILE%\CalendarRecovery\go2`.
- Preflight (read-only): `production.ts preflight` = exact v1 `312a36fa…`
  (contract, functions, RLS/effective ACL, backup role); admin guards: PG17,
  project marker, no CZN tables/internal schema/RPCs, legacy RPC + guard function
  present. Credentials were checked separately beforehand.
- Migration: candidate SHA256 `a5fdb2301b3906d314a9f03afcef41b0de2a0ab8d00e32cd1b97a562172db788`
  in ONE transaction (lock_timeout 10s, statement_timeout 120s, ON_ERROR_STOP),
  **COMMIT 17:51:45Z**. No old migration replayed, no fragments, no synthetic accounts.
- Post-commit (read-only): one release row `enabled=false`; policy and new marks
  empty; implementation in `calendar_sync_internal`, not client-executable,
  schema not client-usable; wrapper executable by `authenticated`; anon cannot run
  CZN RPCs; no direct CZN writes; release hidden from clients. Exact-v2
  preflight `17bcce56…` PASS. Anon PostgREST: CZN objects 404 `PGRST205/202` → 401
  `42501` (schema reloaded after `NOTIFY pgrst`); profiles/daily_marks/legacy RPC
  401 `42501`; internal/control schemas 406 `PGRST106`.
- Backup v2: [run 39998656242](https://github.com/maxvfk/game-calendar-backups/actions/runs/39998656242)
  detected exact v2 but committed only payloads (`b869e21`), because the private
  `.gitignore` re-included only `20*.snapshot.manifest.json`. The next run would
  have refused the unpaired files. Operator-approved private
  [#7](https://github.com/maxvfk/game-calendar-backups/pull/7) (`f96684b`, CI green):
  `.gitignore` re-include, the two deterministic manifests restored (validated) and a
  `git check-ignore` regression check (fails on the old rule). [Run 40000730021](https://github.com/maxvfk/game-calendar-backups/actions/runs/40000730021)
  committed a complete pair (`fcb24d2`): v2, createdAt `2026-10-23T18:08:54.135Z`,
  source `b5d46b5…`, schema `17bcce56…`, operator recipient, ciphertext SHA256
  `d83f30d4d56f6b653c6d892e493910b73b695163757f1ccddd54018a0110b0e1`. v1 pairs,
  v1 monthly and the pre-cutover archive are unchanged.
- Operator verification: real-key `validate` PASS for both v2 pairs; the latest
  snapshot has `enabled=false`, no epochs and legacy CZN rows present. Empty loopback
  PG17.11 `local-drill.ts` on the first v2 pair PASS: all seven base digests +
  `dataSha256` and the CZN extension match, `enabled=false`, nonempty rerun refused,
  cluster deleted. Production `restore --all-profiles --read-only` dry-run PASS
  for the v2 pair and for v1 pair `8dfb3183…` into live v2 (no writes).
- Not verified / residual (no staging): owner login/profile read and other-game
  Sync through Supabase Auth JWTs in the deployed app (no safe user token on the agent
  side); real-device cached-PWA behaviour. The old deployed client's
  `apply_profile_mutations` now goes through the wrapper; with no policy rows it
  delegates per mutation to the moved implementation (same 100/256 KB limits).

**Next concrete step:** operator manual smoke in the deployed app (own account:
profile loads, toggle a non-CZN daily, reach Synced, no CZN reset UI). GO 3
stays a separate, explicit operator decision.

## CZN GO 1 — production backup transition COMPLETE (2026-10-23)

Operator-authorized GO 1 only. GO 2 (disabled additive migration) and GO 3
(enablement) were not started. No production SQL/DDL, Supabase schema, Auth,
user-row, `CZN_CUTOVER_ENABLED` or policy change.

- Preflight: public main `ad699ad146673588e92bf6c1884168971b0b2b74` (#73, CI
  39986520121 success); private main `93128e7fd5ed7e407cee234ba0231a93506f76f2`
  and draft #6 head `c602d3101bc733bf6699a8fb6e3fe559a2b90383` unchanged, #6
  validate CI 39956500529 success; no backup job running. Production schema was
  exact v1 (06:05Z strict-v1 scheduled export; no GO 2 issued), and the new
  exporter re-detected v1 read-only. v1 retention code is unchanged between old
  pin `5b2a2b0` and `b5d46b5` (stdout buffering only). Extracted GO guard tested
  locally: unset/old/short/wrong-project values fail, exact pin+project passes.
- Transition: `CZN_BACKUP_GO_REVISION=b5d46b5fa0b820f9d244302a77c34e7020cde2ee`
  (non-secret variable); #6 marked ready and squash-merged with head match as
  private `ffdd3428b4a08964e1ec466bf328a05ee8da68b5`. Workflow blob `b10a96db…`
  equals the PR head; cron `23 1 * * *`, `personal-data-backup` mutex,
  cancel-in-progress false and v1 retention unchanged.
- Production backup on v1: manual [run 39987601875](https://github.com/maxvfk/game-calendar-backups/actions/runs/39987601875)
  succeeded on every step (GO guard, tool tests, export, encrypted-path allowlist,
  commit); `_source` was `b5d46b5`. Commit `c00090a15a37a0f9a4c44fd3ccc24180850c8be6`
  changed only `snapshots/daily/2026-10-23.snapshot.{age,manifest.json}`
  (same-day rerun); no `snapshots/v2`. Monthly `2026-10` blob and the other
  daily pairs and S6a report are unchanged; earlier pairs remain in Git history.
- Pair metadata: format v1, createdAt `2026-10-23T16:32:59.510Z`, sourceRevision
  `b5d46b5…`, canonical v1 schema `312a36fa…`, operator `recipientSha256`,
  ciphertext SHA256 `8dfb31831b26110d35713324d74bb84fc836131fa48596b841cffce2c215187c`,
  age v1 header; Git blob IDs, size and hash consistent.
- Independent operator validation from exact `b5d46b5` Git bytes: real-key
  `production.ts validate` **PASS**; repeated `local-drill.ts` in a new empty
  loopback PG17.11 `czn_recovery_drill` **PASS**. The independent re-export matched
  all seven table digests + `dataSha256`; release disabled, no policy/epoch;
  nonempty rerun refused; temporary cluster deleted. No plaintext on disk.
- Recovery points: pre-cutover pair `d3001dae…` (private `93128e7`) and the new
  pair are both archived by the operator outside retention; private history
  retains every earlier pair.

**Next concrete step:** separate explicit operator GO 2 — wait for no in-flight
backup, validate the then-latest pair, run read-only `production.ts preflight` at
exact v1, then apply the exact `a5fdb230…` candidate in one transaction with
enabled=false (handoff step 4). GO 3 remains separate.

## CZN operator real-key decrypt + local recovery drill accepted (2026-10-23)

Bounded verification only. No hosted connection, production SQL, private
workflow/pin/variable change, PR #6 merge, Auth change or CZN enablement.

- Tooling: public main `02f3c6c634af2d6c6ef7612148a9a565d8c3b7b5` (#72); private
  main `93128e7fd5ed7e407cee234ba0231a93506f76f2` and draft #6 head
  `c602d3101bc733bf6699a8fb6e3fe559a2b90383` rechecked unchanged.
  Operator Windows host: Bun 1.3.14, age 1.3.2, PostgreSQL **17.11** (official
  EDB binaries, extract-only: no service, no default cluster).
- Pair: latest scheduled v1 `snapshots/daily/2026-10-23` from private
  [run 39909326284](https://github.com/maxvfk/game-calendar-backups/actions/runs/39909326284),
  createdAt `2026-10-23T06:05:10.301Z`, sourceRevision
  `5b2a2b048bae53f32e464b0a91a8f5d9f354b669`, canonical v1 schema hash,
  ciphertext SHA256 `d3001daee2f8a18e20a6fa61ec8df711391fc32a24ca0cc0003b6b833b724ca6`.
  Only this ciphertext+manifest was fetched; Git blob IDs, size and hash match
  the manifest/repository. Manifest `recipientSha256` equals the operator's
  locally derived public recipient. Pair is preserved in operator storage
  outside both repositories and retention.
- `production.ts validate` with the operator's real private identity: **PASS**
  (in-memory decrypt, v1 manifest/payload/integrity). Key contents never shown.
- `local-drill.ts --execute-local` in a new dedicated cluster (127.0.0.1 only,
  scram, database `czn_recovery_drill`, user-only ACL folder): **PASS**.
  Independent read-only re-export of the restored database reproduces every one
  of the seven per-table digests and the total `dataSha256` of the snapshot:
  values, LWW versions, explicit false, tombstone/unset rows, sub-millisecond
  timestamps and frozen legacy CZN daily rows are present and byte-identical.
  Auth stub contains exactly the snapshot owners; `czn_daily_release.enabled`
  is false and `czn_daily_policy`/`czn_daily_marks` are empty (no policy or epoch
  manufactured from v1). A second run on the nonempty database was refused
  (`empty isolated cluster`) and a re-check showed no change.
- After success the drill server was stopped and its cluster (data, log,
  temporary local password) deleted. Encrypted pair and private key retained.
  No counts, IDs or plaintext recorded; private operator record kept locally.
- **Windows line-ending hazard found:** with global `core.autocrlf=true` the
  working-tree candidate SQL is CRLF, SHA256 `d77a597c…`, not the reviewed
  `a5fdb230…`; `production.ts plan` then prints the CRLF hash. The drill used
  exact Git bytes (`git -c core.autocrlf=false archive HEAD`), where plan reports
  `a5fdb230…`. Any operator apply must verify that hash first (see handoff step 4).

**Next concrete step:** explicit operator GO for the backup transition only —
set `CZN_BACKUP_GO_REVISION`, merge private #6, run it on v1 and revalidate/decrypt
that exact pair locally. Disabled migration and enablement remain separate GOs.

## CZN direct-production readiness prepared — awaiting production GO (2026-10-23)

- CURRENT main `b075d8056ffbf6d6ac8876bd6175739de808742d` (#69), post-merge
  [CI 39949829568](https://github.com/maxvfk/game-calendar/actions/runs/39949829568) successful.
  Unrelated draft #68 remains parked. Reused #65–#67 without redoing research.
- Production connector metadata only: `vzzudezdigjwbwfejlsg`, healthy PG17.6.1.166,
  seven existing public tables with RLS, no CZN tables; CLI migration ledger empty.
  No production SQL/user contents/credentials, DDL or write smoke performed.
  Control marker is designed to be non-exposed by schema/table ACLs; new preflight
  explicitly verifies those effective permissions instead of trusting a generic RLS advisory.
- Added fail-closed dual-schema backup/read-only preflight and independent GO
  guards, distinct v2 daily/monthly 30/12 retention, v1 encrypted readability and
  selected-profile v1/v2 dry-run/recovery. Production defaults stay disabled.
  Recovery preserves live epochs/frozen CZN/false tombstones; equivalent timezone
  offsets are normalized by PostgreSQL without losing microseconds. No historical
  dayKey rewrite or deletion is necessary.
- Four AGENTS commands passed (Bun 1.3.14): frozen install, typecheck,
  **1151 pass / 1 existing optional skip / 0 fail**, build 178 events / 7 games /
  1 existing conflict. Actual age and interactive React DOM harness passed.
  Added isolated PostgreSQL 17.6 CI
  with independently observed lock waits for both cutover orders and true/false
  writers. [PR #70](https://github.com/maxvfk/game-calendar/pull/70) merged as
  `0a83bae2cfc35328bcc28132d7f6207d929be3aa`; PR CI 39954344066 and
  post-merge CI/Pages 39954540087 passed, including actual PG17 independent
  lock waits in both cutover orders, ACL/RLS and v1/v2 recovery. Host has no
  local postgres/docker; isolated PG17 service ran in GitHub CI.
- [PR #71](https://github.com/maxvfk/game-calendar/pull/71) merged as
  `b5d46b5fa0b820f9d244302a77c34e7020cde2ee`; final PR CI 39956124419 and
  post-merge CI/Pages 39956392921 passed. Exact encrypted operator local drill
  passed in a second empty PG17 container (false/epoch/microseconds; nonempty
  rerun refused). Preflight rejects drift in legacy client writes/owner policies
  as well as v2/internal/control access. Four AGENTS commands passed again,
  1151 pass / 1 existing optional skip / 0 fail, build 178 / 7 / 1 existing conflict.
- Prepared [private draft #6](https://github.com/maxvfk/game-calendar-backups/pull/6),
  head `c602d3101bc733bf6699a8fb6e3fe559a2b90383`, proposed public pin
  `b5d46b5fa0b820f9d244302a77c34e7020cde2ee`, independent exact-pin GO,
  same 01:23 UTC schedule/mutex and strict v2 encrypted paths. Draft remains
  unmerged; final [synthetic-only CI 39956500529](https://github.com/maxvfk/game-calendar-backups/actions/runs/39956500529)
  passed actual shell/encrypted-only commit allowlist, all four AGENTS commands,
  independent PG17 and exact operator local drill. No secrets/live export used.
  This does not prove actual private workflow execution on production.
- Rechecked active private workflow blob
  `dd8b34866ead83c11d5486365166b8b0bccef192` and main unchanged after draft creation.
- Active private S6a main `93128e7fd5ed7e407cee234ba0231a93506f76f2`, public pin
  `5b2a2b048bae53f32e464b0a91a8f5d9f354b669`; latest export
  [39909326284](https://github.com/maxvfk/game-calendar-backups/actions/runs/39909326284)
  successful. Real operator decrypt/recovery drill not independently proven.
- Added reviewable catalog-only preflight SQL (executes under READ ONLY on v1/v2
  locally), and an operator local-drill CLI. It accepts only a dedicated empty
  loopback PG17 cluster/database, decrypts v1/v2 in memory, recreates only local
  Auth IDs and restores/validates data with feature off. No hosted URL, existing
  data or roles accepted; synthetic age/PG17 CI verifies actual encrypted restore,
  false/epoch/microseconds and second-run refusal. Operator real-key drill still
  pending; sensitive local cluster must be disposed of privately.
- Final proof refinement: the cutover-first race uses a fresh profile with its
  first epoch still uncommitted, so the blocked old RPC must see that new fence
  after lock release. This supplements the old-write-first and true/false races,
  rather than relying on idempotent negotiation of an already fenced profile.
- Exact stop/GO/release/rollback/device smoke: [handoff](CZN-PRODUCTION-CUTOVER.md).
  No production SQL, active private workflow/pin change, deletion or activation.

**Next concrete step:** operator validates/decrypts latest v1 pair and completes
isolated recovery drill locally, then gives explicit scoped GO for the reviewed
backup transition and disabled additive migration. Enablement is separate.

## CZN direct-production readiness — original authorization (2026-10-23)

- Operator prefers **no new Supabase staging project or branch** for this small
  two-person deployment and is willing to forgo legacy CZN completion history
  if that actually simplifies cutover. **No deletion or destructive production
  action has been authorized**, and the preferred approach preserves old rows
  unchanged but does not merge them into the new epoch.
- Task: [CZN-DAILY-RESET-DIRECT-PRODUCTION-CUTOVER.md](tasks/CZN-DAILY-RESET-DIRECT-PRODUCTION-CUTOVER.md).
  Continue from completed #65–#67; finish encrypted v2 S6a backup/retention/pin
  readiness, safe operator preflight, local PostgreSQL/Auth/concurrency checks,
  risk/rollback plan and an explicit server-first GO/NO-GO checklist.
- This is a **preparation milestone only**. Staging-specific hosted confidence is
  knowingly unavailable; document that residual risk. Require a separate
  explicit GO before production DDL, changing the private backup pin/workflow,
  deleting any user rows or activating CZN. Never reset all profiles/Auth by
  implication; old PWA writes must remain fenced after cutover. Approved
  18:00 UTC opening-date and updated-client policies remain unchanged.
- Production CZN daily reset remains on the old rules; no migrations or flags
  have been enabled by this docs-only task.

Historical next step fulfilled by the readiness entry above. Production actions
still require the separate operator GO.

Updated 2026-10-23 (direct CZN production-readiness prepared; awaiting GO; candidate disabled, no production cutover). Follow `docs/tasks/SOL6-IMPLEMENTATION-HANDOFF.md` for the
remaining milestones and `AGENTS.md` for non-negotiable data rules.

## CZN cutover — disabled client and encrypted staging tooling (2026-10-23)

- Server/backup candidate [#65](https://github.com/maxvfk/game-calendar/pull/65)
  merged as `f3cae56cdd6817352d26749f7053a4cd2b0bfcb7`; PR CI 39928334621
  succeeded. Continued from that CURRENT main with no production SQL/data access.
- Client now has a separate atomic policy journal, exact raw legacy/outbox/baseline
  recovery snapshots, strict epoch binding, offline pending/retry/reconciliation,
  true/false LWW, clipped UTC-opening catch-up and separate legacy history UI.
  Mixed old Sync holds CZN false/UUID/version rows without acknowledging them,
  while other games sync; failed capability negotiation holds CZN only and
  does not block other games. It avoids endless fast retries of held-only queues.
- Distinct policy export/import integrates with Export/Export all. Legacy v1
  CZN sources and foreign/guest epochs are preserved as unresolved recovery
  sources, not converted or unioned into a new streak; first-login merge keeps
  source bytes/IDs before excluding fenced CZN from its old-RPC batch.
  Same-epoch imported dates outside the authoritative cutover/current-day window
  stay in the raw recovery source; they cannot fabricate a streak or block a
  server batch. Reload/update keeps queues. The user can export or leave ambiguity unresolved.
- **Implemented but disabled**: compiled `CZN_CUTOVER_ENABLED=false`, server
  enabled=false, candidate SQL still outside deployed migrations. Default client
  makes zero new-policy network calls/writes and renders no new panel. The actual
  production CZN countdown is unchanged and still incorrect until a safe release.
- Staging-only encrypted CLI added (hard production-ref refusal), distinct v2
  ciphertext/manifest and old v1 decrypt path. Real age 1.2.1 X25519 round-trip,
  actual v1/v2 guarded SQL recovery and ciphertext-corruption rejection passed
  locally using temporary synthetic identities. Raw stdout is explicitly wrapped
  in Uint8Array after a real round-trip exposed ArrayBuffer incompatibility.
  Existing production v1 contract, migrations, scheduled workflow/pin are intact.
- Local tests cover clock boundaries/DST/month/year, disabled behavior, quota
  failure, original false/UUID/outbox retention, tombstone replay, in-flight edit,
  foreign profile/guest imports and real client → SQL transport. SSR panel markup
  checked; **no browser/PostgREST/Auth/production or physical-device smoke claimed**.
- Four AGENTS commands passed on Bun 1.3.14: frozen install, typecheck, full
  suite **1147 pass / 1 existing optional skip / 0 fail** (new real-age test ran),
  build **178 events / 7 games / 1 existing NTE conflict**. #65 post-merge
  CI/Pages 39928496105 succeeded. Final client PR/main CI evidence is in its PR.
- Hosted release remains blocked: no isolated staging project/branch, no disposable
  Auth target, no two-connection race test, no hosted v2 preflight/encrypted backup
  and no reviewed private v2 pin/scheduling/retention handoff. Only production
  metadata/role/version was read in Supabase. No real user data was touched.
- Exact server-first steps/rollback and operator phone/PC smoke remain in
  [Gate A checkpoint](tasks/CZN-DAILY-RESET-GATE-A-CHECKPOINT.md) and updated
  [candidate runbook](../supabase/czn-cutover/README.md). Never clear a fence,
  reopen old writers or restore an incompatible old app after cutover.

Historical staging next step superseded by the operator's no-staging decision.
Use the direct-production handoff and explicit GO boundary above.

## CZN cutover — local server/backup implementation (historical 2026-10-23)

- Continued from CURRENT main `7b71154` after #64; the operator explicitly
  superseded the docs-only stop when staging is unavailable. No repeated research.
- Supabase plugin inventory: one active production project `game-calendar`,
  no development branches or separate staging. Organization Free. A read-only
  metadata query confirmed role `postgres`, CREATE privilege, PostgreSQL 17.6.
  No production data/table reads, SQL writes, project/branch creation or migration.
- Additive server candidate in `supabase/czn-cutover/` (CLI-generated filename,
  deliberately OUTSIDE auto-discovered deployed migrations); enabled=false.
  Exact policy/epoch, owner-scoped reads, strict v2 write RPC, irreversible old
  writer fence and shared profile lock. Mixed v1 batches hold CZN and accept
  unrelated games. Disabled capability never creates a cutover; disabling later
  never reopens old CZN writes. Standing subject only; event clocks unchanged.
- Parallel strict v2 logical snapshot/contract includes all extension rows,
  security-critical RPC definitions/ACLs and RLS. Existing v1 contract, migrations,
  backup CLI/private pin remain unchanged. Old preflight fails closed on extension.
  Candidate recovery reads v1 or v2, preserves live fence/new CZN tombstones and
  frozen legacy rows, rejects conflicting epochs, and does not restore release
  enablement. It is not yet wired into hosted age/encryption CLI or private pin.
- Local actual SQL/PGlite tests cover disabled/enabled cutover, stale same/different
  keys, false/replay, malformed epochs/dates/fields, RLS/bypass/roles, rollback
  fence, snapshot corruption and v1/v2 recovery. Hosted migration, two-connection
  race testing and Auth smoke remain unavailable without staging. No production
  reset correction claimed. Client continuation follows in a separate small PR.

**Next concrete step:** finish the disabled client/journal/export path locally,
then provision isolated staging for the hosted server/backup/client release gates.

## CZN safe cutover — Gate A checkpoint, design-only blocked (historical 2026-10-23)

- Baseline CURRENT main `ce5bffa2ba67d2703b14e03012d351a4a2d9eff3`;
  post-merge #63 [CI 39868203557](https://github.com/maxvfk/game-calendar/actions/runs/39868203557)
  passed. No parallel open PRs at start. Both product decisions remain accepted.
- [Protocol/checkpoint](tasks/CZN-DAILY-RESET-GATE-A-CHECKPOINT.md) specifies immutable
  policy/epoch, additive isolated registers, server serialization, old-client ACK,
  held-journal recovery, guest/account and distinct import format, monotonic
  recovery fences, exact release/rollback order and future real-device smoke.
- Disposable PGlite experiment used real current migrations, shared merge,
  import parser, remote adapter, syncProfile and S6a preflight. It confirmed
  current collision/metadata failures, then demonstrated CZN holding/isolation,
  other-game writes, denied direct/helper/other-owner bypass, exact pending
  false/UUID/version preservation and no false success timestamp. Full probe
  is embedded in the report. No deployable migration or application code added.
- **Gate A NOT passed; Gate B not started.** Old bundles preserve their entire
  queue on an unfamiliar ACK and show generic Sync error; targeted read-only/
  update UI and unrelated-row finalization require a compatible client. New
  tables/RPC need a versioned S6a snapshot/contract and a restore path that
  cannot erase the server fence. Those complete proofs do not exist yet.
- Applied the approved task's Gate A item 4: no supported privileged hosted
  migration channel or isolated test account is available. Stop at docs-only
  checkpoint; no production SQL, reset enablement or user-profile access.
  Current CZN countdown remains incorrect; no correction deployment claimed.
- Current backup is healthy: private [run 39909326284](https://github.com/maxvfk/game-calendar-backups/actions/runs/39909326284)
  succeeded Oct 23; workflow pins public `5b2a2b048bae53f32e464b0a91a8f5d9f354b669`.
  Only Actions/workflow metadata read, no snapshots/keys. This does not prove
  new-policy backup/restore compatibility or a local recovery drill.
- Four AGENTS commands passed (Bun 1.3.14); default suite **1126 pass / 1 existing
  optional skip / 0 fail**. Build 178 events, seven games, one existing NTE
  conflict. No clock, Event ID, source-health, Timeline, migration, lockfile or
  backup contract changes. PR/main CI evidence belongs to the delivery PR.
- **Manual prerequisite:** isolated Supabase staging administration and a
  disposable Auth identity via a secure supported channel. There is no reviewed
  production migration to apply from this checkpoint. Do not send secrets in chat.
  No new phone/PC smoke is needed for this docs-only delivery; the report defines
  the exact post-enable two-device test for a future compatible release.

**Next concrete step:** arrange that isolated administrative test target, then
finish Gate A server/S6a compatibility proofs before production migration.

## CZN Daily Reset — product decisions approved, Work queued (historical 2026-10-23)

- The operator completed real phone/PC smoke of the 2026-10-22 Endfield
  Phantasia, six CZN banner and two Genshin Phase II corrections. Regional
  dates, Timeline/Event Detail and existing marks were accepted. Upcoming
  was initially hidden because its setting was off; enabling
  "Show events that haven't started" showed the future records correctly.
  **All three shipped data corrections are operator-accepted; no UI defect.**
- Explicit **product decision 1:** fixed CZN daily reset at 18:00 UTC,
  game-day stored label = **UTC opening date** of the 18:00-to-18:00 period,
  identical across Asia/Europe/America.
- Explicit **product decision 2:** require a compatible updated PWA for
  *new CZN daily writes* after server-confirmed profile cutover.
  Cached old clients must not mutate new-policy daily rows; other games'
  Sync must continue. Protect on the server, preserve old offline outbox and
  legacy histories, avoid silent renaming/retiming.
- Authorized task:
  [CZN-DAILY-RESET-SAFE-CUTOVER-IMPLEMENTATION.md](tasks/CZN-DAILY-RESET-SAFE-CUTOVER-IMPLEMENTATION.md).
  It uses the completed [forward-only investigation](tasks/CZN-DAILY-RESET-FORWARD-ONLY-DESIGN.md),
  with a **prove-first gate** for SQL/RPC, import/export, legacy marks and old
  PWA clients. A separate Work may implement and release only after real
  compatibility/hosted safety proof; otherwise it must stop at a concrete
  docs-only blocker or code-not-enabled checkpoint.
- **Current production reset remains incorrect** until that separate Work
  proves and deploys the new policy. The operator's agreement is not itself
  a database migration, rollout or claim of completed correction. S6a
  backup-contract and hosted migration prerequisites remain explicit.

**Next concrete step:** launch a bounded Work from CURRENT main using the
new task; do not start S6b, Astra, NTE or other independent work automatically.

## Sequential verified corrections — final gated result (2026-10-22)

**Steps 1–3 complete and deployed; step 4 BLOCKED at a documented technical
compatibility gate. No CZN daily clock, stored label, history, import/export,
Account Sync or other runtime change was published. Final operator acceptance
on physical phone/PC was subsequently confirmed on 2026-10-23 (see above).**

| Milestone | Result | Delivery / merge SHA | PR CI / push CI-Pages |
| --- | --- | --- | --- |
| Endfield Phantasia Cycle I/II | Complete | #58 / 9c1b9e3a9f1a0b0f59d7e3c6a3d9446d9c73e4be | 39806589922 / 39806775938 success |
| Six CZN banners | Complete | #59 / 1956c13610d5787eb4bda4e29503b6653a6bfed7 | 39807945889 / 39808092840 success |
| Two Genshin Phase II ends | Complete | #60 / 12d29a7cf40634f4b1bc0a9dc601b1fb9d3c9bae | 39808985859 / 39809203300 success |
| CZN daily 18:00Z | Blocked; design only | This documentation checkpoint | Runtime intentionally unchanged |

- Test durability follow-up [PR #61](https://github.com/maxvfk/game-calendar/pull/61),
  head `b5de7f5200f01ac498648b4df7be79f75104e265`, merge
  `56d4248d2f13273e995b81541ca150279feb1fd1`: PR CI 39810305244 and push
  CI/Pages 39810476226 succeeded. Historical assertions now use factual immutable
  excerpts; separate current rolling merge checks remain. No semantic feed
  change. One local PGlite initialization timeout resolved on complete rerun.
- Frozen install, typecheck and full build pass for this docs-only checkpoint.
  The unmodified default local test runner repeatedly reached the existing
  5000ms PGlite setup timeout (one run also timed out in backup retention).
  A full local `bun test --timeout 15000` run passes: **1126 pass / 1 existing
  optional age skip / 0 fail**. No repository test timeout/skip was changed;
  standard hosted `bun test` remains a mandatory PR/merge gate.
  Final semantic inventory: 178 rows / seven games, exactly two added Endfield
  IDs plus six CZN and two Genshin winners changed from the #57 baseline.
  Only the pre-existing NTE Circle Bounty conflict remains. No src, snapshots
  or Supabase migration changed. Reviewed old values/timestamps are unchanged.
- Live feed checks after each data deployment confirm exact fields and preserved
  firstSeenAt. Chrome guest smoke: Endfield Endgame/Ending soonest and both
  regional groups; CZN exact Nine detail, retained pre-update Done, Rossweisse
  day end, Tiphera/Tiana Upcoming; Genshin all three regional Timeline ends,
  Event Detail and retained pre-update Done. Local runtime localhost is not
  reachable from this cloud browser; no phone-size or real-device claim is made.
- **Step 4 finding:** locally reproduced existing Sync key collision/mismatch
  for mixed clock interpretations and old offline tombstones. Wire/SQL has no
  clock policy; unknown daily metadata is stripped, a new preference is rejected,
  and the old v1 importer ignores version. Constant-only, fake-offset,
  countdown-only or local-marker changes cannot satisfy the safety conditions.
  [CZN-DAILY-RESET-FORWARD-ONLY-DESIGN.md](tasks/CZN-DAILY-RESET-FORWARD-ONLY-DESIGN.md)
  records exact counterexamples, read-only reproduction, all shared consumers,
  preserved-history requirements, proposed versioned forward cutover and its
  unproven old-client/offline/import/rollback obligations.
- Outstanding product/protocol decisions: UTC opening-date versus KST next-date
  stored labels; whether CZN daily writes can require an updated client after
  an account/profile cutover. Either label still needs a server-visible policy,
  legacy import isolation and explicit old-client/outbox treatment. No historical
  completion instants can be reconstructed from changedAt. No production identity
  or user data was accessed for the compatibility probes.
- Known retained limits: Echoes automatic source remains broken/unavailable with
  Illusion LKG; reviewed deadlines restore coverage, not automatic health.
  Rossweisse/Sig Dec 2 exact end is still unconfirmed. Current CZN daily reset
  remains incorrect until its compatibility gate is resolved. No NTE reset,
  S6b, UI polish, Astra audit or other milestone was started.

Operator smoke after updating/reloading the PWA:

1. Endfield + Endgame + Ending soonest: Cycle II precedes the season final;
   Asia Oct 28 19:59Z, Europe/America Oct 29 08:59Z. Cycle I is historical.
2. CZN banners: Nine/Alcea end Nov 3 18:00Z; Upcoming reveals Tiphera/Tiana
   ending Nov 24 18:00Z. Rossweisse/Sig keep a Dec 2 date-only end.
3. Genshin Phase II banners: Nov 3 06:59Z / 13:59Z / 19:59Z for
   Asia / Europe / America. Event Detail and Timeline agree in local display.
4. Confirm existing event completion marks remain attached after reload on both
   phone and PC. Daily reset is intentionally not a delivered correction.

**At 2026-10-22 checkpoint:** phone/PC acceptance and CZN decisions were pending.
Both were subsequently resolved on 2026-10-23, as recorded in the newer section above.
The original sequential Work remains closed.
Release CI/merge/deployment evidence for this documentation checkpoint is on its PR.

## Verified precision regression durability follow-up (2026-10-22)

- Milestone 3 shipped in [PR #60](https://github.com/maxvfk/game-calendar/pull/60),
  head `02893d6cda25f34d4cd2cce8faa735e6d9872ef5`, merge
  `12d29a7cf40634f4b1bc0a9dc601b1fb9d3c9bae`. PR CI 39808985859 and push
  CI/Pages 39809203300 succeeded. Public feed generated 15:55:12.631Z has
  both regional maps, unchanged 178 IDs/firstSeenAt and sole NTE conflict.
  Live Chrome checked Asia/Europe/America Timeline endpoints and exact Event
  Detail; the pre-deployment Void Star's Advent Done mark remains attached.
- Before closing the data milestones, pinned factual test-only excerpts from
  this repository's Oct 22 captures. Historical precision/identity assertions
  must survive normal source removal of expired cards. Separate rolling-source
  checks still enforce reviewed winners and zero game-specific conflicts without
  requiring an expired card to remain upstream. No invented upstream data.
- Test/data isolation follow-up only: no runtime, reviewed data, snapshots,
  storage, health or semantic feed change. All four AGENTS gates pass:
  1126 pass / one existing optional age skip / zero failures.

**Next concrete step:** finish CI/deploy verification for this test-only
checkpoint, then publish the gated CZN daily-reset compatibility decision.

## Sequential verified corrections — milestone 3 (2026-10-22)

- Milestone 2 shipped as [PR #59](https://github.com/maxvfk/game-calendar/pull/59),
  head `b1be0dee34558b02dbb1bc77b752d53676f7d2d9`, merge
  `1956c13610d5787eb4bda4e29503b6653a6bfed7`. PR CI 39807945889 and push
  CI/Pages 39808092840 succeeded. Public feed generated 15:48:01.525Z confirms
  all six exact fields, preserved firstSeenAt and unchanged sole NTE conflict.
  Live Chrome: Nine exact start/end, official source and Done mark survive
  deployment/refresh; Rossweisse retains date-only end and Time unconfirmed.
- Fresh main `1956c13`: only `genshin:void-stars-advent:2026-10-13` and
  `genshin:la-chanson-cerise:2026-10-13` gain official reviewed exact ends:
  Nov 3 06:59Z Asia / 13:59Z Europe / 19:59Z America. Day starts, titles,
  stable IDs and published firstSeenAt `2026-10-22T15:48:01.525Z` preserved.
  All other reviewed rows/timestamps and generic KQM parsing are unchanged.
- Fresh publisher indexed article 47010361 still states Oct 13 18:00–Nov 3
  14:59; matched Skirk publisher article 47031763 explicitly says Server Time.
  Fresh complete KQM archives 21888 and 21889 reproduce both boundaries with
  the same t_lc tag and named banners. This is bounded evidence synthesis,
  not a universal tag/zone contract. Direct HoYoLAB full text remains a JS shell.
- Tests cover same-ID whole-record precedence, exact endpoints at ±1ms in
  every region, regional expiry/order, Timeline and Event Detail rendering,
  unsupported-region canonical fallback, legacy marks/export/import, and minute
  conflicts including western-only changes. Carefree stays day precision;
  no weapon banner, regionStarts, parser, clock or user-data change.
- Frozen install, typecheck, full tests and build passed: 1124 pass, one existing
  optional age skip, zero failures. Semantic feed diff: same 178 IDs, only two
  changed winners, only existing NTE Circle Bounty conflict. Source-health/LKG
  are unchanged. Historical coverage test retains its original 17-row subset.
- This milestone's hosted CI/deploy/browser results are recorded in the next
  checkpoint. Final operator phone/PC smoke remains outstanding by design.

**Next concrete step:** verify this deployment and the three regional browser
ends, then evaluate CZN daily-clock compatibility; stop at documented design
if old-client/offline/history safety cannot be proved.

## Sequential verified corrections — milestone 2 (2026-10-22)

- Milestone 1 shipped as [PR #58](https://github.com/maxvfk/game-calendar/pull/58),
  head `1c64ddfaee083a2dd629289b5cef34de69680214`, merge
  `9c1b9e3a9f1a0b0f59d7e3c6a3d9446d9c73e4be`. PR CI 39806589922 and push
  CI/Pages 39806775938 succeeded. Public feed generated 15:39:28.550Z contains
  178 rows and both exact cycle maps. Live Chrome guest smoke: Endfield focus,
  Endgame, Ending soonest and Event Detail show Cycle II before season final;
  Europe Oct 29 08:59Z and Asia Oct 28 19:59Z display correctly. Cycle I is expired.
- Fresh main `9c1b9e3`; six existing CZN banner IDs are now official reviewed
  winners. Nine/Alcea: Oct 13 18:00Z–Nov 3 18:00Z; Tiphera/Tiana: Nov 3
  18:00Z–Nov 24 18:00Z. Rossweisse/Sig start Oct 21 05:00Z; Dec 2 end remains
  day precision. Published firstSeenAt `2026-10-22T15:39:28.550Z` is preserved
  verbatim for these automatically materialized rows; all other reviewed rows
  and timestamps remain unchanged. Parser, snapshots, health and daily clock unchanged.
- Rechecked STOVE 14555091/14593128 paired normal-rescue UTC schedules,
  14592676 named Rossweisse/Sig maintenance window and 14592548 actual 05:00
  completion using fresh publisher-hosted indexed excerpts. Direct notices are
  JS shells, as in the audit. No specific Dec 2 maintenance timing was located;
  search date-format false positives (February 12) were excluded.
- Focused regressions cover all three regions at exact end ±1ms, openings,
  Upcoming/deadline sorting, Timeline and Event Detail precision, old completion
  export/import, minute and region-only conflicts, and conservative future cards.
  Historical Sep 22 fixture assertions retain their original three banner rows;
  a separate current-snapshot merge asserts all six new winners. A test-only
  two-card factual Oct 20 excerpt demonstrates independently confirmed midnight
  without changing the parser or reviving Sereniel/Peko in production.
- Frozen install, typecheck, full tests and build passed: 1120 pass, one existing
  optional age skip, zero failures. Semantic diff: same 178 IDs; exactly six
  corrected winners; no new conflict (only existing NTE Circle Bounty).
- This milestone's hosted PR/Pages and browser release evidence is recorded
  after merge in the next checkpoint. Physical phone/PC smoke remains with operator.

**Next concrete step:** verify CZN deployment, then correct only the two Genshin
Phase II ends from refreshed main. CZN daily reset remains gated separately.

## Sequential verified corrections — milestone 1 (2026-10-22)

- Baseline `818ec016cb159664422e4af3de557a23edf2da92`; PR #57 push CI
  [39803945073](https://github.com/maxvfk/game-calendar/actions/runs/39803945073)
  succeeded, including Pages. No open PR or parallel correction was present.
- Added exactly two official reviewed Phantasia Cycle I/II rows with pinned
  canonical day IDs, day starts and exact regional ends. Cycle I is historical;
  Cycle II ends Oct 28 19:59Z Asia / Oct 29 08:59Z Americas-Europe. Season final
  remains single and unchanged. Existing reviewed rows/timestamps are unchanged.
- Fresh official X post and original infographic returned HTTP 200. The post
  still embeds `HUPRW3QbgAAK4sK`; visually reconfirmed 03:59 cycle ends, next-cycle
  04:00 starts and fixed +8/−5 server legend. Image SHA-256 remains
  `d9fade5c7075f4e7e7c377f45112e4546b4762a5f89ba4fd2b145f122476e3ae`.
- Full frozen install, typecheck, test and build gates passed: 1114 pass,
  1 existing optional age skip, zero failures. Focused tests cover regional
  end−1ms/end/end+1ms, live Endgame/Ending soonest selection, hypothetical
  consistent recovery deduplication and one-minute regional conflict review.
  Historical Illusion assertions now identify their season explicitly.
- Semantic feed diff: only the two new IDs, no removals or changes to existing
  event values apart from generated parser observation timestamps. Feed 178
  records, seven games, sole existing NTE Circle Bounty conflict. Echoes remains
  unavailable in feed with no fabricated confirmation; parser rejection/LKG and
  broken-health regressions pass. No Refresh was dispatched.
- Hosted PR CI, merge, Pages/feed and browser acceptance are release gates;
  concrete run/SHA results will be recorded in the next milestone checkpoint.
  Local browser cannot reach this runtime's localhost; use deployed Pages for
  browser smoke. Final physical Android/PC acceptance remains with operator.

**Next concrete step:** verify this milestone's CI/deploy and regional browser
behavior, then begin CZN six-row precision from freshly fetched main.

## Urgent Endfield source drift / CI recovery — 2026-10-18

Status: **CI/feed/build/Pages recovered and live; full Refresh acceptance remains
blocked by a proven upstream Phantasia contradiction. Work stopped at that safe
source blocker, not declared fully green.** This section
is independent of Account/User S6 and Timeline M1/M2.

- Baseline CURRENT main verified as `3447f4e0f5222ec62afcfae0397475dcb46cda53`;
  fresh branch `fix/endfield-source-drift-20261018`. Actual logs inspected:
  [Refresh 39062823744](https://github.com/maxvfk/game-calendar/actions/runs/39062823744)
  confirmed 7/8 sources, retained rejected Echoes body, reported six consecutive
  failures / one broken source, then committed snapshots. Echoes last accepted
  confirmation: `2026-10-14T20:47:25.387Z`, still Illusion.
  [CI 39062845198](https://github.com/maxvfk/game-calendar/actions/runs/39062845198)
  checked out that main SHA: 1046 pass / 1 optional skip / 3 fail; feed/build/Pages
  skipped. The same three focused failures reproduced locally before edits.
- **Echoes is an upstream contradiction, not a parser redesign failure.** Live
  Event and Phantasia pages both return 200 and publish Asia Oct 15 12:00 UTC+8
  and Americas/Europe Oct 15 23:00 UTC-5; both end Nov 5 11:59 in their stated
  zones. The three-cycle table instead starts Cycle I Oct 15 12:00 *Server Time*,
  eleven hours before the western season. Cycle I/II ends are explicitly
  Oct 22/29 03:59; Cycle III ends Nov 5 11:59. Full facts, UTC conversions,
  source hashes and interpretation limits are in
  `docs/research/endfield-recurring-endgame.md` section 16.
- The parser's acceptance predicates are unchanged. Its first-cycle mismatch
  error now identifies region and both UTC instants. Existing `rejected` + HTTP
  200 already identifies reachable-but-unusable data; no new healthy state or
  weaker threshold was added. Production snapshots are untouched, Phantasia
  cycles are withheld, and Illusion is not republished as a new season.
- **Shadow Marked was corrected, not retained as a real conflict.** English
  official notice 5208, directly read at 21:56:39Z, explicitly ends at Oct 19
  04:00 server time and agrees with wiki `data-end`. Our reviewed record wrongly
  encoded 03:59. Corrected Asia to Oct 18 20:00Z and Americas/Europe to Oct 19
  09:00Z. Same event ID, day start, exact regional ends, official URL and original
  `firstSeenAt`; only this row's `reviewedAt` advances. One-minute exact conflicts
  still require review, with an explicit regression proving it.
- Historical Illusion/overlap/Snow assertions now read immutable test-only
  excerpts of this repository's own captures, outside production fixture paths.
  Current snapshot merge assertions still require zero Endfield conflicts and
  every unique source ID, accounting for the genuine wiki/reviewed duplicate
  and higher-confidence reviewed winner. A real Phantasia rejection regression
  proves unchanged last-known-good bytes/metadata/confirmation and `broken` at
  the existing third failure. Historical Illusion cycle IDs remain pinned.
- Local Bun 1.3.14: frozen install, typecheck and build pass; focused Endfield/
  recurring-endgame tests **21 pass / 0 fail**; full suite **1054 pass / 1 optional
  age skip / 0 fail** (1055 tests, 51 files). Feed: **172 events / 7 games / 1
  visible conflict**, only the existing NTE Circle Bounty dispute. All 172 IDs
  retained; only Shadow Marked's end fields change semantically (apart from
  normal regenerated parser observation timestamps). Counts: CZN 25, Endfield 8,
  Genshin 25, HSR 20, NTE 47, WuWa 30, ZZZ 17. Phantasia season ID is
  `endfield:season-of-phantasia:2026-10-15`; no cycles were invented. Current
  cycle source is unavailable in the feed (`parsedCount: null`, no false
  confirmation), with the previously verified hosted refresh still **broken**.
- [PR #23](https://github.com/maxvfk/game-calendar/pull/23), implementation
  `ebd48090e3d78482e55c1f66d8eea4fdc2799811`, passed
  [PR CI 39073443428](https://github.com/maxvfk/game-calendar/actions/runs/39073443428)
  and merged to main as `7f641cb5323e0ed8d8cc60e63b7d26b7f129a786`.
  [Push CI/Pages 39073514856](https://github.com/maxvfk/game-calendar/actions/runs/39073514856)
  is **success** in all three jobs: typecheck/test/feed sanity, site build,
  Pages deploy. Hosted tests: **1054 pass / 1 optional skip / 0 fail**. The job
  restored `refresh-state-39062823744-1`; deployment reported success at
  `2026-10-17T22:05:03Z`.
- The normal public URL
  https://maxvfk.github.io/game-calendar/data/events.v1.json returned HTTP 200
  at 22:05:23Z, `generatedAt: 2026-10-17T22:04:29.666Z`, 172 events, all seven
  games and only the NTE `dateConflicts` notice. Its ID set and all event fields
  except regenerated parser observation timestamps match the validated local
  feed. The official Shadow Marked 04:00 regional ends are live; no Phantasia
  cycles or false cycle-source freshness were published.
- **Continuation verified on 2026-10-18 against current main
  `9e74df057649210e3df1cac1f95a623fa06b7b12`.** The scheduled
  [Refresh 39116428884](https://github.com/maxvfk/game-calendar/actions/runs/39116428884)
  ran after the repair, confirmed 7/8 sources and committed two changed source
  bodies (CZN and Endfield Event), plus confirmation metadata. Its actual log
  again rejects Phantasia: Americas/Europe Cycle I starts
  `2026-10-15T17:00:00.000Z`, season starts `2026-10-16T04:00:00.000Z`.
  Echoes remains **broken / seven consecutive failures / HTTP 200**; accepted
  Illusion snapshot and last confirmation `2026-10-14T20:47:25.387Z` are retained.
  The separate **Report source health** step correctly fails. A fresh direct
  Phantasia read also retains the contradictory cycle table; no code relaxation
  or source-health change is warranted.
- That refresh dispatched
  [CI/Pages 39116453813](https://github.com/maxvfk/game-calendar/actions/runs/39116453813)
  on `9e74df0`: **all three jobs succeeded**, including Pages deployment.
  Actual test log: **1054 pass / 1 optional skip / 0 fail**; bookkeeping cache
  `refresh-state-39116428884-1` was restored. Feed: **174 events / 7 games / 1
  conflict**, still only NTE Circle Bounty. The public feed returned HTTP 200,
  `generatedAt: 2026-10-18T09:43:58.236Z`; Endfield now has ten events, with two
  newly sourced ordinary events from the existing Event adapter. Other game
  counts remain CZN 25, Genshin 25, HSR 20, NTE 47, WuWa 30, ZZZ 17. Shadow
  Marked retains its corrected 04:00 regional ends; no Phantasia cycles or false
  confirmation are published (`parsedCount` and `lastConfirmedAt` remain null
  for the current cycle source).
- Local continuation validation on the refreshed snapshots also passed: frozen
  install, typecheck, full suite **1054 pass / 1 optional skip / 0 fail**, and
  complete build. Public/local feed ID sets and event fields match except for
  regenerated `firstSeenAt` / `updatedAt` observation timestamps.
- **Full Refresh remains blocked, not recovered.** The post-repair refresh
  commit's CI/feed/Pages path is now verified green, but source health is not.
  No redundant forced manual Refresh was dispatched after this scheduled run
  reconfirmed the upstream contradiction. This uses the task's explicit safe
  blocker stop condition, not the full-green acceptance path. Final evidence is
  tracked in [PR #24](https://github.com/maxvfk/game-calendar/pull/24).

**Next concrete step for this repair:** obtain an upstream correction or explicit
regional clarification of western Cycle I versus season start. Keep Echoes
scheduled and its broken signal visible; other validated sources can publish
through the recovered CI/Pages path under existing rules. Once the source is
consistent, manually dispatch normal Refresh on current main (force only for the
6h interval if needed), verify acceptance/health and the refresh commit's full
CI/Pages, then close recovery. Work ends here at the source blocker; no other
milestone or private backup pin change is included.

## Completed checkpoints

- Five one-game source/coverage reports were merged as PR #2–#6; their
  `partial` status remains accurate. The reports are in `docs/research/`.
- NTE Steam, BtR, and CZN Prydwen automatic sources are implemented; Prydwen
  fetched five banners from a normal GitHub Actions run 35770466875.
- HSR Overdrive and Minuscule global deadlines were corrected (749ff94).
  ZZZ Potential Hypothesis gained its explicit version end (78b5e56).
  Two WuWa Version 3.6 events were added (8bfa12a).
- `feat: track review time per reviewed event`: optional event-level
  `reviewedAt` and `firstSeenAt` keep existing reviewed timestamps stable
  when a subset of a file is updated; old files remain valid. Validation on
  Bun 1.3.14: frozen install, typecheck, 836 tests, build.
- HSR review 2026-09-23: Realm of the Strange (global Sep 27 19:59Z),
  Memory of Chaos: Stormcleanse (global Sep 27 22:00Z), Fate Contract:
  Renewal (end unknown), and Version 4.5 Nameless Honor (global Sep 27
  19:59Z). Existing eight HSR records are byte-identical in event values.
  Source evidence: `KQM-git/HSRNews` notices 1392, 1333, 1361;
  official HoYoLAB URLs are on the reviewed records when known.
  Validation: frozen install, typecheck, 837 tests, build; feed 120 records
  including ended ones. CI/deploy and live feed verification: pending.
- Endfield review 2026-09-23: official notices add Winter Hunt (Asia Sep 30
  03:59Z; Americas/Europe 16:59Z), Deep Cold Issue (relative end unknown),
  and the official account's Resplendent Spectrum start (Sep 24, day precision
  across server regions). All eight wiki.gg IDs are retained; Snow Over Deep
  Woods remains 11:59 server time. Its proposed 12:00 correction in
  `coverage-endfield.md` contradicts the wiki snapshot and the official
  [Snow notice](https://x.com/AKEndfield/status/2093911591896879277), so it
  was not applied. Remaining October events from update notice 5208 require
  direct date verification: the notice URL is presently unreadable in the
  available web fetch. Regression checks compare the merged eleven events.
- Genshin review 2026-09-23: added the missing fifth To Temper Thyself cycle,
  The Godforsaken Frostlands reward window, and Carefree Snowball Fight using
  published calendar/notice dates at day precision; the in-game notice mirror
  `archive/21879.md` confirms Missive of Grace's 00:00 is `t_lc`, so its
  uncorroborated exact UTC claim was reduced to day precision while retaining
  its published ID and original `firstSeenAt`. Older 12 rows retain their
  original `updatedAt`. Official calendar article 46673425 was verified for
  UTC+8 notation, while event dates were read from the existing reviewed
  source report; the linked article is a JS shell in this environment.
- WuWa/ZZZ gap check 2026-09-23: WuWa 3.7 article 5453 is image-only in
  the public JSON archive, so the proposed Singing Drizzle timestamps have
  not been promoted to reviewed data. Other WuWa 3.7 notices and ZZZ Phase II
  banners still lack direct dated text; no interval was inferred from prior
  phases or the scheduled maintenance. The current 11 WuWa and 15 ZZZ rows
  remain unchanged. Revisit when dated individual notices are published.
- Actions probe prepared for Genshin KQM, HSR KQM, WuWa Kuro mirror, ZZZ
  official and Endfield official. Push to `work/sol6-source-probes` triggers
  `.github/workflows/source-probe.yml`, which records transport headers and
  hashes; official HTML is retained temporarily as an Actions artifact,
  while unlicensed community mirrors yield metadata only. Each website must
  pass robots and crawl-delay checks before a page request. Run 35801130385:
  the three public GitHub Contents API surfaces returned 200; ZZZ returned an
  identical JS shell for index and article; Endfield robots redirected, so no
  content was requested. Exact URLs, headers, SHA-256 hashes, and classifications
  are in `docs/research/source-probes-sol6.md`. A focused follow-up for the
  Endfield robots redirect is blocked: run 35801291192 isolated a same-origin
  307 to `/en-us/robots.txt`; run 35801382417 followed that one safe redirect,
  which returned another 307. No Endfield page was fetched. M2 is complete:
  three usable transport candidates, ZZZ HTML unsuitable, Endfield blocked.
- M3 Genshin KQM implementation (2026-09-23): a narrowly allowlisted public
  GitHub Contents API Markdown adapter, a factual fixture, section parser and
  transport/merge tests extract ten dated notice windows. `t_lc` and `t_gl`
  remain day precision because their clock's UTC mapping is unproven. The
  Version 7.1 maintenance start establishes only the date for "after update".
  The older 7.0 relative start is skipped because this README has no matching
  update schedule; reviewed records cover it. One notice's three Silverwing
  phases yield one event. The mirror record cites its individual archive file
  and has no `official` provenance tag; reviewed HoYoverse URLs win. The raw
  Markdown was checked via GitHub connector (95,694 UTF-8 bytes, SHA-256
  `7f8ce891e5d903e1b402e4741bcdee229b538dae743cf678752a61a4cb1a71a8`),
  and a direct local parse produced ten events, 16 merged Genshin rows, zero
  conflicts and zero lost reviewed IDs. Runner refresh/deploy still needs
  verification after this implementation is published. Validation on Bun
  1.3.14: frozen install, typecheck, 846 tests, build (126 feed rows; one
  pre-existing NTE Circle Bounty conflict). The test command requires the Bun
  directory in `PATH` because the local-server test spawns `bun` by name.
- M3 HSR KQM implementation (2026-09-23): a second exact Contents API
  allowlist and a factual fixture. The section parser extracts six current
  schedules (Overdrive, Minuscule, Realm of the Strange, two endgame cycles,
  Nameless Honor). It treats `(global)` as UTC+8, `(server)` starts as day and
  `(server)` ends with existing Asia/Europe/America server offsets. The
  README's Gift of Odyssey lacks an event period, and 4.6 Warp/event dates
  are absent; these are not invented. Full connector README captured as
  45,115 UTF-8 bytes, SHA-256
  `0a4b4e771489e2d331865c2a51405c42ebf2289d66978eb8c5d2ce26dfe7ef4b`.
  Local parse of that complete document gave six events and merged to the
  existing 12 HSR reviewed rows with zero conflicts and zero lost IDs.
  Individual archive URLs document mirror extraction; reviewed publisher URLs
  remain canonical. Validation on Bun 1.3.14: frozen install, typecheck,
  851 tests, build (126 feed rows, the same pre-existing NTE conflict).
  Normal Actions refresh/deploy awaits verification.
- M3 WuWa Atom implementation (2026-09-23): the runner's previously probed
  `articles_latest.xml` already embeds official article HTML in Atom CDATA;
  no per-article fetch is needed. The full GitHub connector body exactly
  matched Actions run 35801130385 (95,955 bytes, SHA-256
  `5e3a718fe86b2610580d38a256dccbe15dc0d9c5d23fc7222947b712576d00b4`).
  A factual XML fixture and bounded entry/section parser use only dated
  event/convene periods, preserve the original Kuro article URL, and derive
  relative update *day* only from that version's maintenance date. Start
  clocks remain day precision; per-server exact ends preserve the established
  offsets. The complete 20-entry feed yielded 14 events; six are historical
  rows absent from reviewed. Merge: 17 WuWa records, zero conflicts, all 11
  reviewed IDs retained. Image-only 3.7 previews yielded no guessed dates.
  Validation on Bun 1.3.14: frozen install, typecheck, 855 tests, build
  (126 feed rows from compact fixtures, one pre-existing NTE conflict).
  Normal Actions refresh/deploy awaits verification; full XML snapshot would
  also add the six verified historical rows.
- M4 cache integrity checkpoint: refresh now sends validators only when a
  matching body exists. A 304 without that body fails visibly and does not
  advance `lastConfirmedAt`; a 200 repairs the cache. `SnapshotStore.forget`
  removes Markdown and XML bodies as well. Focused tests reproduce both loss
  and recovery paths. Bun 1.3.14 frozen install, typecheck, 858 tests and build
  passed. Abrupt source disappearance remains the next M4 check.
- M4 disappearance checkpoint: a new body that drops more than half the old
  count is now compared to the old snapshot's still-live IDs. Losing the
  majority of those IDs rejects the new body, retains last-known-good and
  increments source failure health. Finished entries can leave normally and
  still produce a visible drop warning. Both paths have focused tests. Bun
  1.3.14 frozen install, typecheck, 860 tests and build passed.
- M4 regional conflict checkpoint: exact ends from reviewed official versus
  an automatic secondary mirror now compare Asia, Europe and America. A
  one-minute regional discrepancy or a global-versus-server discrepancy is
  written to the review report with its region, while the higher-confidence
  reviewed record keeps its ID and source URL. Focused tests cover both
  scenarios and verify current HSR/WuWa merges remain conflict-free. Bun
  1.3.14 frozen install, typecheck, 862 tests and build passed.
- M4 day-boundary checkpoint: reviewed day-only dates now use the same
  region/game-day reset as parsed dates. Reader-created events retain the exact
  instant derived from their own input. Regression tests compare both
  boundaries across three regions. Bun 1.3.14 frozen install, typecheck,
  863 tests and build passed (126 feed rows; known NTE Circle Bounty conflict).
- M5 date-precision UI checkpoint: Next Up, queued deadlines, event rows,
  window captions and details now state the printed date and unknown time
  instead of counting hours to a derived reset for day-only ends. Day-only
  starts are labelled as dates; exact region-specific ends still count down.
  The footer distinguishes exact local times from source dates. Focused render
  checks cover parser, reviewed, reader-entered and regional-exact cases.
  Bun 1.3.14 frozen install, typecheck, 867 tests and build passed (126 feed
  rows; known NTE Circle Bounty conflict).
- M4 fixture freshness checkpoint: the offline builder now reads capture dates
  from `.md` and `.xml` fixture names as well as `.html`/`.json`. The three
  new source health entries have the 2026-09-23 capture day and parsed counts
  (10, 6, 8); `lastConfirmedAt` stays null until a real network confirmation.
  The previous build incorrectly recorded all three capture dates and counts
  as null despite including their events. Bun 1.3.14 frozen install, typecheck,
  868 tests and build passed (126 feed rows; known NTE Circle Bounty conflict).
- M5 conflict visibility checkpoint: the feed now carries compact date-conflict
  notices linked to the retained event ID and both source URLs. The checklist,
  Next Up, timeline and detail sheet warn on the affected event. An older
  service-worker-cached feed without the additive field still validates. The
  current build exposes one notice for NTE Circle Bounty (Asia end differs by
  24 hours) while keeping its Perfect World date and event ID. Bun 1.3.14
  frozen install, typecheck, 871 tests and build passed (126 feed rows).
- M5 available smoke checkpoint: the built site served locally through `serve.ts`
  returned 200 for `/`, JS, CSS, feed, review report, service worker, manifest
  and `/api/health`; a nonexistent `/data/` file returned 404. Focused suites
  for controls, preferences, progress, update handling, views and custom UI
  passed (211 tests). GitHub Actions
  [run 35837870613](https://github.com/maxvfk/game-calendar/actions/runs/35837870613)
  on `36e9374` succeeded in check, build and Pages deploy. The published Pages
  site was also opened in desktop Chrome: onboarding selected Genshin and NTE;
  focus narrowed to Genshin; Checklist and Timeline switched; Europe→Asia
  changed the daily reset countdown and persisted after reload. Circle Bounty
  showed the disputed date and both source links. Marking it done removed it
  from Next Up and persisted after reload; the test mark was then cleared.
  The day-only Fons Rush label and stale-source warning were visible. A phone
  viewport, service worker upgrade and offline reload remain unverified.
- M4 freshness wording checkpoint: a game becomes stale if *any* of its
  sources has no recent event data, even when another source refreshed recently.
  The footer now says that accurately for both all-games and named-game
  warnings. A focused render regression covers fresh and old siblings for
  every selected game. Bun 1.3.14 frozen install, typecheck, 872 tests and build
  passed (126 feed rows, the same Circle Bounty conflict). The first normal
  Actions refresh of Genshin KQM, HSR KQM and WuWa Atom is still pending; the
  latest scheduled run 35779097930 predates those adapters.
- M5 deployed-update checkpoint: CI/Pages run
  [35839190984](https://github.com/maxvfk/game-calendar/actions/runs/35839190984)
  passed for `8aef0df`. On the published desktop site the service worker
  displayed "A new version ... is ready"; pressing Reload loaded the new
  freshness text while the chosen Genshin/NTE lanes and Europe region remained.
  The available cloud browser exposed no viewport or network toggle, so this
  is an upgrade check, not a phone or offline reload check.
- M3 live-refresh checkpoint: manually dispatched Actions
  [run 35844027426](https://github.com/maxvfk/game-calendar/actions/runs/35844027426)
  fetched the three new sources on the runner: Genshin KQM 10, HSR KQM 6,
  WuWa Atom 14 parsed events. Their full snapshots were committed as
  `88b72b2`, with the same SHA-256 bodies checked during implementation.
  [CI/Pages run 35844077127](https://github.com/maxvfk/game-calendar/actions/runs/35844077127)
  passed and the live feed was checked at 132 rows. Compared with the saved
  pre-refresh feed, all 126 IDs and their titles, boundaries, precision,
  source URLs and regional ends remain unchanged. The six additions are
  already-ended WuWa events present in the full Atom feed but absent from the
  compact fixture. The one NTE Circle Bounty conflict is unchanged. The
  refresh workflow itself failed only at its final source-health report: seven
  legacy Game8 sources returned CloudFront HTTP 202 for the third cycle;
  Fandom remained robots-blocked. They supplied no events. The next M4
  checkpoint will retire unreachable legacy fallback polling from the active
  feed without hiding failures of the working sources.
- M4 legacy-source retirement checkpoint: seven Game8 pages that repeatedly
  return CloudFront 202 and Genshin Fandom whose robots gate fails closed were
  removed from the **scheduled** refresh and published source health. Their
  parsers remain addressable for local fixture diagnostics. Seven live adapters
  remain. A targeted regression confirms that three failed cycles of an active
  KQM source still produce a broken-source error. A fresh build retained all
  132 IDs, semantic event fields and the existing Circle Bounty conflict;
  only the eight inactive health entries disappeared. Automatic parser
  `firstSeenAt`/`updatedAt` values are generated at build time and therefore
  move on a local rebuild; this checkpoint did not change that behavior.
  Bun 1.3.14 frozen install, typecheck, 874 tests and build passed; the offline
  refresh dry run listed exactly seven sources. Commit `8ade91c` passed
  [CI/Pages run 35864065837](https://github.com/maxvfk/game-calendar/actions/runs/35864065837):
  check, build (132 events, one conflict), and deploy. After deployment the
  public feed returned 132 events and 14 health entries (seven automatic,
  seven reviewed), with no Game8/Fandom entries. The next scheduled refresh
  remains unverified.
- M5 post-deploy smoke 2026-09-23: the public desktop site opened, Genshin
  and NTE onboarding worked, Checklist listed Beyond the Rails first, Fons
  Rush as date-only and Circle Bounty as disputed; a reload preserved the game
  choices. Immediately after deployment, the browser still held the earlier
  feed for the ordinary URL, while a new URL and a direct HTTP request returned
  the 13:00Z feed. GitHub Pages answered `cache-control: max-age=600`; a short
  delay for an already cached reader is expected. Phone layout, a real offline
  reload and automatic expiry of that browser's cached copy remain unverified.
- M5 real phone check 2026-09-23: on a realme GT 6 with realme UI 7.0 and
  Chrome, steps 1–4 passed. An offline reload stayed on **Loading events…**;
  a later screenshot showed the page and an offline badge, but this did not
  count as a successful reload. The repair precaches the feed during worker
  installation, bounds stalled installation and feed requests to eight seconds,
  and lets the page read the cached feed even before worker control. The
  GitHub Pages subpath navigation fallback is also corrected. Frozen install,
  typecheck, 880 tests and build passed locally; the build retains 132 events,
  seven live automatic sources and the visible Circle Bounty conflict. A fresh
  real phone offline reload after deployment is still required. Published as
  `b697b6a`; [CI/Pages run 35878478363](https://github.com/maxvfk/game-calendar/actions/runs/35878478363)
  passed typecheck/test/feed, build and deploy.
- M5 phone retest reported successful by the reader on 2026-09-23 after the
  offline repair. On the realme GT 6 / Chrome, the online update and offline
  reload now show the saved events instead of remaining on **Loading events…**.
  This confirms the tested device and flow, not every browser or a fresh
  offline installation. At 16:02 UTC the normal public feed URL returned HTTP
  200 and 132 events with 14 source-health entries; all 132 event IDs matched
  the local build. The response reported `max-age=600`. The next scheduled
  refresh at 17:27 UTC had not yet run at this checkpoint.
- M5 UI categories checkpoint: the existing feed `type` maps to six reader
  filters: Banners, Events (`story`/`rerun`/`other`), Endgame / challenge,
  Login / rewards, Shop / exchange and Maintenance. Multiple choices can stay
  on together in both views; every category starts visible for old and new
  readers. Text badges identify types in the list, Next Up, details and narrow
  timeline bars independently of game colour. The choice is saved in prefs,
  leaving event IDs and completion keys unchanged. The daily timeline grid is
  the next separate UI milestone.
- M5 daily Timeline checkpoint: the grid draws every local calendar day at a
  fixed pixel width, defaults new readers to 72px/day, and opens with today
  near the centre of the horizontal pane. The today rule is labelled; zoom
  keeps its central anchor. Exact boundaries take proportional positions in
  their local day, including the 23/25-hour DST day. Date-only source and
  reader dates occupy their stated day cells with dashed edges and precision
  wording, without promoting reset-time interpretations to exact geometry.
  [CI/Pages run 35892354872](https://github.com/maxvfk/game-calendar/actions/runs/35892354872)
  passed on `f0c00c8` and deployed the change. The preceding category-filter
  [run 35889998480](https://github.com/maxvfk/game-calendar/actions/runs/35889998480)
  also passed. The reader reported that the filters work and daily grid is
  visible on the phone. This report does not yet establish that the filter
  selection persists after reload or verify the exact-time position and
  day-only edge on that phone. The public feed checked at 19:08 UTC contains
  the same 132 IDs and semantic boundaries as the local build, seven automatic
  and seven reviewed health entries, and the same Circle Bounty conflict.

## Coverage at the live 2026-09-23 refresh

This is the **132-row published build** following snapshot commit `88b72b2`,
including finished events, not a claim that all seven games are completely
covered. A feed row is counted once after merge; parser counts before merge
can be larger. New Genshin, HSR and WuWa API sources were confirmed by the
Actions runner. Automatic confirmations below are from the last saved snapshot;
reviewed dates are the batch date except for individually
rechecked rows described above. See `public/data/events.v1.json` for each
source's actual `lastConfirmedAt` and `parsedCount`.

| Game | Published rows and categories | Automatic / transport | Reviewed and latest targeted check | Known missing or blocked |
|---|---|---|---|---|
| Genshin | 16: banners 3, login 2, challenge 3, story 2, other 6 | KQM GINews notice Markdown, 10 parsed and runner-confirmed Sep 23 | 16 reviewed; four rows checked Sep 23 | Game8 unavailable; Fandom robots blocked on runner. Some future Wish/cycle deadlines still lack dated evidence. |
| HSR | 12: banners 4, login 1, challenge 5, other 2 | KQM HSRNews notice Markdown, 6 parsed and runner-confirmed Sep 23 | 12 reviewed; four rows checked Sep 23 | Game8 unavailable; Version 4.6 Warp/event periods absent from retrieved notice. |
| WuWa | 17: banners 10, login 1, challenge 2, other 4 | Kuro article Atom mirror, 14 parsed and runner-confirmed Sep 23 from the full 20-entry feed | 11 reviewed; latest batch Sep 21 | Game8 unavailable; image-only 3.7 preview does not establish exact periods. |
| ZZZ | 15: banners 4, login 3, challenge 1, story 1, other 6 | No usable automatic source; official raw HTML probe yielded JS shell | 15 reviewed; latest batch Sep 21 | Game8 unavailable; Phase II banners and challenge cycles lack direct dated notices here. |
| Endfield | 11: banners 3, login 1, challenge 1, other 6 | wiki.gg 8 parsed; last confirmed Sep 22 | 3 reviewed, checked Sep 23 | Game8 unavailable; official 5208 robots redirect unresolved, so October rows remain pending. |
| NTE | 45: banners 12, login 2, challenge 6, maintenance 5, other 20 | Official Steam News 42 parsed and NTEBuild BtR 3, both confirmed Sep 22 | 15 reviewed; latest batch Sep 22 | Game8 unavailable. Official Perfect World and Steam disagree on Circle Bounty by 24 hours. |
| CZN | 16: banners 5, login 2, challenge 4, story 1, other 4 | Prydwen banners 5 parsed, confirmed Sep 22 | 14 reviewed; latest batch Sep 21 with STOVE provenance | Game8 unavailable. Prydwen covers banners only; official STOVE notices remain reviewed. |

## M6 release evidence and limits

- Implementation tip before this release-status update: `fbf4619` on `main`.
  The M5 UI commits are `34d584f` (type filters) and `f0c00c8` (daily
  timeline); their CI/Pages runs are linked above. The final M6 commit SHA is
  reported with the release handoff because a commit cannot record its own SHA.
- Reproducible validation is the four commands in `AGENTS.md`. At this M6
  checkpoint on Bun 1.3.14, frozen install, typecheck, 890 tests
  (zero failures) and build passed. The build produced 132 merged events across
  seven games, one visible Circle Bounty conflict and seven automatic plus
  seven reviewed health entries. `bun run refresh --dry-run` listed exactly
  the seven active automatic adapters without making requests.
- The published feed at 19:08 UTC on September 23 matched the local 132 IDs
  and the compared title, game, type, start/end, precision, regional end and
  provenance URL fields. Its automatic confirmations were at 09:37 UTC; the
  Actions schedule intended for 17:27 UTC was not yet present in the run list
  at the later check. A successful build is not evidence of a newer source
  confirmation. Inspect the next actual refresh before claiming it passed.
- Seven-game coverage is the matrix above, not completeness of all current
  game events. Genshin, HSR, WuWa, NTE, CZN and Endfield have bounded
  automatic extraction; ZZZ is reviewed-only. Game8 and Genshin Fandom are
  retired from polling. The Endfield official robots chain, ZZZ official JS
  shell and image-only WuWa notices still limit automatic coverage. No dates
  were filled in from cadence or previews.
- Remaining reader checks: the phone confirmed working filters and visible
  daily cells; combined filter persistence, proportional exact placement,
  dashed day-only edges and completion persistence specifically after this UI
  update have not been reported. The prior offline reload fix passed on one
  realme GT 6 with Chrome, not on every mobile platform. There is no account
  sync; preferences and completion are local to each browser, with manual
  export/import available in Settings.
- For routine corrections and source failures, use the maintenance path below.
  Do not erase a conflicting lower-priority source or promote reviewed dates
  merely to make the report quiet. The separate Astra audit starts after M6;
  it should use this evidence and record only reproducible findings.
- M6 release-status commit `1426960` passed
  [CI/Pages run 35907937236](https://github.com/maxvfk/game-calendar/actions/runs/35907937236):
  typecheck/test/feed, build and Pages deployment all succeeded. The published
  page and feed returned HTTP 200; the feed generated at 19:14:28 UTC has 132
  events, seven automatic and seven reviewed source-health entries, and the
  one known date conflict. Its automatic `lastConfirmedAt` values still belong
  to the 09:37 UTC manual refresh. The scheduled refresh remains unverified.
- The delayed scheduled [refresh run 35916473856](https://github.com/maxvfk/game-calendar/actions/runs/35916473856)
  started at 20:31 UTC on September 23 and succeeded: all seven active sources
  confirmed, three changed, zero warnings and zero broken. It committed the
  new snapshots as `5668c75`. A local feed build from those snapshots produces
  134 events across seven games and still only the known NTE Circle Bounty
  conflict. Endfield wiki.gg grew from eight to ten parsed events; its two new
  IDs are `endfield:echoing-bell-of-an-old-city:2026-09-24` and
  `endfield:season-of-illusion:2026-09-24`. The previous eight wiki IDs remain.
  The corresponding [CI run 35916518191](https://github.com/maxvfk/game-calendar/actions/runs/35916518191)
  **failed** in `test/endfield-reviewed-banners.test.ts:28`: the test asserts
  exactly eight wiki events. Build and Pages deploy were skipped. The public
  feed checked afterward was still the 19:23 UTC, 132-event version, so the
  134-event publication is **not verified or live**. Update this snapshot-count
  assertion in a separate, narrow implementation milestone after checking the
  new rows and preserving ID/merge assertions; rerun all gates and verify Pages.
  At this documentation checkpoint, frozen install, typecheck and build passed
  locally (134 events); `bun test` reproduced the same one failure (889 pass,
  one fail). No tests or runtime behavior were changed here.
- Refresh publication repair: the Endfield merge test now checks every current
  wiki ID survives the merge and that the merged count follows the snapshot,
  rather than assuming wiki.gg will always list exactly eight events. Snow's
  regional end remains checked while the historical row is still listed.
  No parser or event data changed. Frozen install, typecheck, all 890 tests and
  build passed locally; the feed has 134 events and the one known conflict.
  [CI/Pages run 35929071084](https://github.com/maxvfk/game-calendar/actions/runs/35929071084)
  passed all three jobs. The published feed generated at 22:34:49 UTC contains
  134 events, including both new Endfield IDs, 14 source-health entries and
  only the known NTE Circle Bounty conflict. M6's scheduled-refresh and
  publication checkpoint is operationally complete.
- ZZZ endgame correction: the September 18–October 2 Shiyu Critical Node and
  September 11–25 Deadly Assault rotations were missing from reviewed data.
  Dated player posts on HoYoLAB corroborate the periods shown by the user's
  in-game countdown screenshot. Both rows are `challenge`, `estimated` and
  `day`/`day`; the screenshot gives no absolute clock boundary, and the
  official Version 3.2 notice names the modes without dates. Existing ZZZ
  rows and IDs are unchanged. Commit `d55d413` passed frozen install,
  typecheck, 891 tests and build (136 events; only the known NTE conflict).
  [CI/Pages run 35929750486](https://github.com/maxvfk/game-calendar/actions/runs/35929750486)
  passed Typecheck/test/feed, Build and Deploy. The public feed generated at
  22:42:07 UTC has 136 events and both ZZZ challenge IDs at day precision.

## Pre-Astra recurring endgame correction (2026-09-24)

- Endfield's existing wiki.gg Echoes of War seasons now enter the Endgame
  filter. Reviewed rows add Season of Illusion Cycle I and II deadlines and
  Monumental Etching's limited reward window. Cycle III's final deadline is
  already carried by the existing season row; the permanent stage is not a
  limited event. Existing season IDs and completion keys remain unchanged.
- NTEBuild BtR rows now resolve the documented July 16 / 14-day, 05:00 UTC+8
  cycle to exact boundaries while retaining their day-based published IDs;
  reviewed Perfect World timing wins when available. The cycle is gated by
  its documented anchor rather than a generic duration fallback.
- Genshin's monthly Abyss/Theater and WuWa's 28-day Tower/Respawning Waters
  use bounded, effective-dated reset rules with regional 03:59 ends.
  Reviewed October Theater retains its published ID. Sourced exact conflicts
  freeze future projections for the affected mode pending rule review.
  Genshin Stygian Disturbance Outbreak and WuWa Endstate Matrix remain
  explicitly sourced seasonal deadlines, outside the recurrence generator.
- CZN Great Rift Second Half and Basin Twilight preserve their IDs and now
  close at the standing Sep 30 00:00 UTC maintenance boundary. Great Rift's
  weekly reward deadlines occur only inside its sourced phase (next Sep 27
  18:00 UTC). Full-Scale Offensive Season 4 has its verified Aug 19 start and
  an unknown end. No next half/season is projected.
- HSR Anomaly Arbitration is visible with an unknown end. The expected Sep 28
  Memory of Chaos rotation raises a build review reminder, not a published
  +42-day deadline; Currency Wars also awaits an explicit version end.
- ZZZ current Shiyu and Deadly Assault rows retain their published IDs and
  estimated provenance, with exact regional 03:59 ends from the 04:00 server
  reset. **Research correction:** the cited January 2025 +14-day anchors land
  seven days away from the independently reported September 2026 cycles. The
  handoff's asserted arithmetic is false, so a future generator from those
  anchors would publish wrong rotations. Future ZZZ cycles and Periodic
  Conquest stay source-gated until a current re-anchor/rule change is verified.
- Published implementation commits: `b05a3ce`, `9a2b3d9`, `bf4935e`;
  status `746b729` and Timeline regression `e5041d4`. The original local
  commits have the same file trees and are preserved on
  `work/recurring-endgame-local`. Bun 1.3.14 frozen install,
  typecheck, 902 tests and production build pass. A focused Timeline regression
  verifies four current exact deadline positions within daily cells. Local feed has 158 events
  across seven games, one unchanged NTE Circle Bounty date conflict, no new
  conflicts. Exact current ZZZ, CZN and Endfield deadlines were inspected in
  the generated feed. [CI/Pages run 36018033513](https://github.com/maxvfk/game-calendar/actions/runs/36018033513)
  passed all three jobs on September 24. The published feed generated at
  15:09:32 UTC has 158 events, 14 source-health entries and the same one
  Circle Bounty conflict. Its ID set and the compared game, title, type,
  start/end, precision, regional ends, source URL and provenance fields exactly
  match the local build; five current ZZZ/CZN/Endfield deadline rows were
  checked individually. Phone smoke verification remains pending.

## Focused pre-Astra endgame cleanup (2026-09-24)

- Endfield: the existing wiki.gg Event source still discovers the active Echoes
  season. A second adapter reads that season's own Cycle table and publishes
  Cycle I/II deadlines only when the table and the sourced season window agree.
  The first real Season of Illusion response is stored as
  `snapshots/endfield-wikigg-echoes.html`; local refresh confirmed 2/2 events,
  zero warnings. The parser rejects missing, malformed, duplicated and
  out-of-window cycle data. A stale or unreadable season page causes a build
  review warning and no fabricated cycle rows. Cycle III remains covered by
  the season row. The two reviewed Cycle I/II workaround rows **were removed**
  after automatic output matched both published IDs and all regional ends.
  Starts use day precision because the page gives different regional start
  instants and the schema has no regional-start field. The season page's Cycle
  III end for the west differs from the Event page's west season end; the
  authoritative Event season row supplies that final boundary.
- HSR: the hardcoded Sep 28 check became a non-publishing monitor over sourced
  AS → PF → MoC phase starts. It warns from seven days before the normal
  14-day expected next start until the next matching sourced phase appears.
  Optional effective phase-specific exceptions can change the expectation or
  suppress it without altering published events. The current warning is for
  MoC around Sep 28; no new HSR row or +42-day deadline was produced.
- ZZZ: `docs/research/zzz-recurring-endgame.md` now states the arithmetic
  contradiction: January 2025 anchors are seven days out of phase with the
  sourced September 2026 Shiyu/Deadly rows. Both remain source-gated; no ZZZ
  generator was added.
- Published commits: Endfield `2af2508`, HSR `811e5cc`, ZZZ documentation
  `5eef752`. Local Bun 1.3.14 frozen install, typecheck, 910 tests and build
  passed. The feed retained all 158 prior IDs, 13 HSR rows and the one known
  NTE Circle Bounty conflict; it has 15 source-health entries including the
  new Endfield season page. [CI/Pages run 36023764496](https://github.com/maxvfk/game-calendar/actions/runs/36023764496)
  passed all three jobs. The live feed generated at 15:56:20 UTC matched the
  local ID set and compared semantic fields exactly, including the two
  automatically sourced Echoes rows.
- Remaining operational check: CI built from the checked-in real season
  snapshot; the first GitHub Actions **Refresh sources** request for this new
  adapter has not yet been observed. Confirm its robots/fetch result in the
  next scheduled or targeted run. A new season whose page is absent or changed
  will raise a review warning rather than receive extrapolated cycles.

## Maintenance path

1. For a disputed date, open the event's `sourceUrl` and
   `public/data/review.v1.json`, compare explicit period and region labels,
   and record the exact publication URL. Preserve the existing title/ID, use
   `day` for a date without a supported clock, and keep an unknown end null.
2. Add or correct a row in `data/reviewed/<game>.json` following
   `data/reviewed/README.md`. For a targeted edit, set the row's `reviewedAt`
   to its actual check time and preserve `firstSeenAt` if previously published;
   do not advance the whole batch's `reviewedAt` without checking every row.
3. Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, and
   `bun run build`. Inspect `public/data/events.v1.json` for the same old IDs,
   `public/data/review.v1.json` for new conflicts, and the build's per-source
   parsed counts before committing.
4. For a broken automatic source, inspect the latest **Refresh sources** run's
   per-source outcome, `snapshots/<source-id>.*` and source health in the feed.
   A failed fetch must retain the old body and may report a stale lane. Fix
   transport/schema only from a permitted real response; use
   `bun run refresh --dry-run` to inspect the plan and
   `bun run refresh --only <source-id>` for a bounded local check when access
   permits. Re-run the full gates, then verify CI/Pages and the published feed.

## Next concrete step

Confirm `endfield-wikigg-echoes` from a GitHub Actions refresh run, then perform
a focused phone smoke check of the challenge filter and partial-day deadlines.
Seek a current
official or in-game ZZZ reset anchor before projecting later Shiyu/Deadly
cycles; source the HSR 4.6 Memory of Chaos end before publishing it. Collect
normal-use observations in `docs/IMPROVEMENT-BACKLOG.md`, implement approved
pre-Astra polish in separate commits, smoke-check and freeze the baseline for
the independent Astra audit. Create final `docs/MAINTENANCE.md` after audit
fixes. The official Endfield robots chain and NTE Circle Bounty dispute remain
separate maintenance gaps.

## Account Sync — S1

- Branch: `feature/account-sync-s1`, based on `main` `074cad5` (verified on
  2026-09-25). Published implementation commit: `c986986`. This milestone is pure/local;
  no S2 storage migration or cloud integration is included.
- `src/shared/sync.ts` introduces Zod-backed logical versions and mutations for
  progress, daily marks, ignored state, each top-level preference key, custom
  games and custom events. Event/occurrence IDs remain opaque. Daily rows use
  an injective `(subjectId, dayKey)` tuple key. A newer `changedAt` instant
  wins; equal instants are ordered by the stable `mutationId`. Conflicting
  content reusing the same logical version fails closed.
- Clearing progress and deleting custom objects retain tombstone rows;
  `completed: false` and `ignored: false` are explicit versioned reversals.
  Optional `gameOrder`/`knownGames` resets use `unset: true` with null, distinct
  from the meaningful null for `focusGame`. This is the safe representation of
  the existing v1 reset-to-absence behavior, not a new UI policy. An older
  offline active value cannot revive any of these states.
- The serializable outbox model keeps mutations until an `accepted` or
  `superseded` acknowledgement. Exact replay is accepted idempotently;
  duplicate queued IDs with different content fail. S1 does not persist or
  wire this outbox into current hooks/localStorage.
- `test/sync.test.ts` simulates two independent devices from one snapshot,
  offline edits, reversed and duplicated delivery, and eventual remote pulls.
  It covers progress status/note conflicts and clear, daily untick, unignore,
  per-key preferences with equal-timestamp tie-breaking and optional reset,
  custom event edit/delete, custom game delete, stale snapshots, and outbox
  acknowledgements. All devices converge to the same logical state.
- Bun 1.3.14: `bun install --frozen-lockfile`, typecheck, **926 tests** (16 new),
  and build passed. Local feed: 156 events across seven games, one pre-existing
  NTE Circle Bounty conflict. Diff contains only the pure module, tests and
  this status document. Current production UI, v1 localStorage keys and
  behavior, export/import format, ingestion, public feed and event IDs were
  not changed. PR #7 CI [run 36120821679](https://github.com/maxvfk/game-calendar/actions/runs/36120821679)
  passed on the complete implementation tree (including the opaque-ID fix).
- No product decision blocked S1. The optional-preference reset case above
  was resolved directly from existing v1 behavior. Clock skew detection and
  server receipt diagnostics remain for the future cloud milestones described
  in the approved design.

Next concrete step: S2 — profile-scoped local storage

## Account Sync — S1.1

- Branch `feature/account-sync-s1-1-pref-validation` from current `main` `2f6d835`;
  published implementation commit `9a29b7b` (local equivalent `b3532af`),
  [PR #8](https://github.com/maxvfk/game-calendar/pull/8). S1's broad preference value union allowed
  incompatible key/value pairs such as `theme = 123` or `region = "banana"`.
- `src/shared/sync.ts` now checks each non-unset preference against a keyed
  Zod schema. Its keys must cover every top-level `Prefs` field at typecheck;
  sort, timeline grouping and visible categories reuse the current client
  value lists. Arrays of lane IDs remain strings, including custom and retired
  lanes. `timelineDayWidth` accepts finite numbers; `focusGame: null` remains
  meaningful. Only `knownGames` and `gameOrder` may use `unset: true` with null.
- Focused acceptance/rejection cases in `test/sync.test.ts` cover invalid
  scalar types, enum values, arrays, non-finite widths and reset rules, plus
  valid current settings and custom lane IDs. Existing S1 convergence tests
  remain green. Bun 1.3.14 frozen install, typecheck, 963 tests and build passed;
  feed remains at 156 events with the pre-existing Circle Bounty conflict.
- No S2 work was started. UI, current localStorage, export/import, ingestion,
  feed, mutation ordering and other sync semantics were not changed.
- PR CI [run 36124500135](https://github.com/maxvfk/game-calendar/actions/runs/36124500135)
  passed on the implementation and initial status tree.

Next concrete step: S2 — profile-scoped local storage

## Account Sync — S2

- Branch `feature/account-sync-s2-profile-storage` from `main` `946ed3a`
  (2026-09-25). The synchronous bootstrap creates a stable `local:<id>` guest,
  stores its registry and active ID, and selects it before user-owned hooks
  mount. Signed-out startup reselects the guest if an account cache was left
  active; profile keys are isolated. There is no auth or cloud call.
- All current user stores now use `gacha-tracker:v2:profile:<id>:*` keys.
  Existing v1 progress, daily, ignored, prefs and custom stores are copied
  once into the guest without deleting or writing v1 keys. Legacy completions
  seed progress only when v1 progress has no rows. The migration marker is
  written after copying, retries incomplete copies, and never replaces an
  existing v2 store. An empty v2 progress store stays empty on later loads.
  A failed storage write leaves v1 intact and keeps available data in memory
  for that visit, so the UI does not mount over a partial copy with defaults.
- The pre-paint script reads active scoped preferences; before first bootstrap
  it falls back to v1 prefs to preserve the theme. Existing export/import
  actions operate on the mounted active profile, retaining the version 1 JSON
  backup format and standard-versus-all preference behavior. `syncMeta` and
  `outbox` have reserved scoped key names but no S1 mutation wiring in S2.
- Focused tests cover migration/retry, legacy preservation, profile isolation,
  signed-out activation, hook/export reads and pre-paint theme. Bun 1.3.14:
  frozen install, typecheck, **978 tests**, and build passed. Local feed remains
  156 events across seven games with the existing NTE Circle Bounty conflict.
  [PR #9](https://github.com/maxvfk/game-calendar/pull/9) CI
  [run 36146509029](https://github.com/maxvfk/game-calendar/actions/runs/36146509029)
  passed; merge commit 1b233c7 reached main. Main CI and Pages deploy
  [run 36146620702](https://github.com/maxvfk/game-calendar/actions/runs/36146620702)
  passed, and the published Pages HTML returned 200 with the v2 pre-paint
  script.
- Manual browser smoke on 2026-09-25 confirmed that upgrading/reloading through
  S2 did not reset the existing local state at any observed stage. Backup
  semantics were also exercised: event A was marked done and exported, then A
  was cleared and event B marked done locally; importing the backup resulted in
  both A and B done. This matches the intentionally additive standard-import
  semantics: the backup restores marks it contains without deleting newer
  local marks that are absent from the file.

S2 concluded; S3 is recorded below.

## Account Sync — S3

- Branch `feature/account-sync-s3-supabase-foundation` from current `main`
  `9bbf623` (2026-09-25). `supabase/config.toml` and two versioned migrations
  define `profiles`, progress, daily marks, ignored, per-key preferences,
  custom games/events, profile indexes and cascading ownership. `received_at`
  records server receipt time separately from conflict versions.
- All seven personal tables have RLS. `anon` has no table or RPC grants;
  `authenticated` can read only owned rows. Direct table writes/deletes are
  withheld so a blind upsert cannot bypass conditional ordering. The two
  explicitly granted `SECURITY DEFINER` RPCs use an empty search path and
  check `auth.uid()` ownership: `ensure_default_profile()` is idempotent with
  a unique partial index; `apply_profile_mutations()` validates a bounded
  batch and applies newer `(changed_at, mutation_id)` versions atomically.
  Equal-version exact replay is accepted; stale versions are superseded;
  conflicting replay fails. Tombstones and explicit reversals persist.
- `test/supabase-db.test.ts` executes the migrations in PGlite PostgreSQL 18
  with local Supabase Auth role/UID stubs. It covers owner/other-user/anon
  access, direct-write denial, all six mutation kinds, replay, stale writes,
  validation, cascade cleanup, and default-profile uniqueness. This verifies
  PostgreSQL behavior locally; the hosted Supabase/PostgREST integration is
  not exercised. No hosted project, credentials, browser Auth, UI or cloud
  calls were added. `supabase/README.md` documents the wire contract and the
  later hosted verification boundary.
- Bun 1.3.14: frozen install, typecheck, **989 tests**, and build passed.
  Local feed remains 156 events across seven games with the pre-existing NTE
  Circle Bounty conflict. PR #11 merged as `3db8c24`; PR CI run
  [36151862179](https://github.com/maxvfk/game-calendar/actions/runs/36151862179)
  passed. Main run
  [36151973509](https://github.com/maxvfk/game-calendar/actions/runs/36151973509)
  passed typecheck, tests, feed, site build, and Pages deployment.

Next concrete step: S4 — Google Auth, default-profile resolution and explicit
first-login local migration. Provisioning a hosted Supabase project and Google
OAuth configuration is deferred until that milestone; S3 needs neither.

## Account Sync — S4

- Branch `feature/account-sync-s4-auth` from current `main` `563862c`
  (2026-09-26). The operator created hosted Supabase project
  `vzzudezdigjwbwfejlsg`, applied both S3 migrations in order, and configured
  Google OAuth Testing for the Pages and localhost origins. The browser uses
  only the project URL and publishable key; no secret credentials are shipped.
- PKCE returns to the real GitHub Pages base URL. `getUser()` verifies a session
  and the default profile ownership is checked before cached account state is
  selected. Signed-out use retains the stable guest. The pre-paint script reads
  only guest prefs (or v1 before migration), never a stale remote active ID.
  OAuth callback query codes are removed from history and not cached by the
  service worker.
- First login fetches validated cloud rows and explicitly offers guest import,
  cloud-only, or cancel when appropriate. Merge uses the S3 conditional RPC;
  settings conflict defaults to the account copy. A persisted plan preserves
  mutation IDs across interrupted batches; a failed S2 durable guest copy
  blocks account setup rather than being mistaken for an empty guest. The guest and v1 copies remain
  intact, while the selected account cache records a baseline for S5.
- S4 does **not** wire ordinary local edits/imports to cloud, create an outbox,
  or run foreground/background sync. The Account UI says changes remain on
  this device until S5. Hosted anon PostgREST verified `401 / 42501` on all
  seven personal tables and both RPCs. Hosted OAuth authorize returned a
  Google redirect with the configured Supabase callback. Authenticated
  owner/cross-user and completed Google sign-in/first-login smoke still require
  an authenticated test-user session. The published Pages build was opened in
  a fresh browser session: signed-out guest calendar and Account controls work,
  and Continue with Google reaches the Google sign-in page through the
  configured Supabase callback.
- Bun 1.3.14 frozen install, typecheck, **997 tests**, and build passed locally; the
  feed remains 156 events across seven games with the pre-existing NTE Circle
  Bounty conflict. [PR #13](https://github.com/maxvfk/game-calendar/pull/13)
  merged as `de21351`. PR CI
  [run 36248747931](https://github.com/maxvfk/game-calendar/actions/runs/36248747931)
  passed; main CI
  [run 36248791489](https://github.com/maxvfk/game-calendar/actions/runs/36248791489)
  passed typecheck, tests, feed, build and Pages deployment.

Next concrete step: S5 — production sync engine, including durable outbox,
pull/merge/push, retry/status and two-device convergence. Do not treat S4's
one-time import as continuous sync.

## Account Sync — S4.1

- Branch `fix/account-sync-s4-1-bootstrap` from current `main` `75f5e76`
  (2026-09-26). Auth bootstrap now invalidates an in-flight resolution when
  the auth session/identity changes, including before the initial resolver has
  finished. Its ticket guards both account-cache activation and rendering;
  callback exchange remains one-use across StrictMode remounts and sign-out
  falls back to the guest.
- Custom games retain `at` as creation time and add optional `updatedAt` for
  edits. Each new edit advances it even within one millisecond; first-login
  `changedAt` uses `updatedAt ?? at`. Old stored/exported games remain valid,
  the export format and `mygame:` IDs are unchanged. Historical edits made
  before this field existed cannot be dated retroactively and retain `at` as
  their version until the next edit.
- Focused tests cover the A→B change while the initial resolver is in flight,
  callback/StrictMode and signed-out fallback, legacy game export/import,
  monotonic edits, and a renamed local game's conflict with an older cloud
  copy. Bun 1.3.14 frozen install, typecheck, **1001 tests**, and build passed;
  feed remains 156 events across seven games with the existing NTE Circle
  Bounty conflict.
- Manual authenticated production smoke completed successfully on 2026-09-26
  with a Google test user. It covered first login from an existing guest,
  explicit local-to-account import, callback cleanup, reload persistence,
  sign-out back to the browser's guest state, sign-in restoring account state,
  a second browser profile with different local data merged into the same
  account while keeping account settings, verification that a newer custom-game
  rename/color won correctly, a clean profile reading the cloud account copy,
  and cloud-only selection followed by sign-out/refresh returning to that
  profile's guest state. All requested S4/S4.1 smoke cases passed.

Next concrete step: S5 — production sync engine. S4/S4.1 are now closed.
S4.1 did not add ongoing sync, an ordinary-edit outbox, or status UI.

## Account Sync — S5

Status: **complete**, including the production two-browser smoke and the
S5.1 offline lifecycle follow-up verified below.

- Branch `feature/account-sync-s5-engine` from current `main` `3657cfb`
  (2026-09-26). S4's materialized account baseline upgrades once: edits made
  after S4 first login are compared with that snapshot and placed in a durable,
  profile-scoped outbox before the first cloud pull. Later progress, daily,
  ignored, per-key preference, custom-game and custom-event edits (including
  uncheck, unignore, reset and deletion) journal first, then update the local
  cache. Existing export/import merges go through the same hook write path.
  Signed-out guest state remains local and isolated.
- An authenticated cycle verifies the owner, pulls six versioned cloud tables,
  merges pending mutations, conditionally sends them through the existing S3
  RPC, pulls again and removes only cloud-confirmed or superseded mutations.
  It re-reads the outbox after network requests so concurrent edits remain
  pending, and startup replays interrupted local writes. The controller runs
  on startup, foreground, online, debounced edits and a five-minute foreground
  interval. It retries transient failures with bounded backoff and shows
  pending, offline, retry, auth, schema, last-success and clock-warning status.
  No realtime channel or S6 backup work was added.
- Tests cover migration and interrupted writes, opaque IDs, all mutation
  families and reversals, offline conflicts and two-device convergence,
  acknowledgement retry with the original mutation ID, in-flight edits,
  profile isolation, triggers and auth failure. The production two-browser
  authenticated smoke was an operator release gate after Pages deployment;
  this local test run did not substitute for that hosted check. S5 still
  required online Auth verification on cold start, and treated a fetch failure
  while `navigator.onLine` was true as a generic sync error.
- Bun 1.3.14 frozen install, typecheck, **1012 tests** across 49 files and
  build passed locally. The feed remains 156 events across seven games with
  the pre-existing NTE Circle Bounty conflict.

Production smoke on 2026-09-29 with independent profiles A/B using one
disposable Google test user passed account loading, A→B for progress, daily,
ignored, theme, custom game/event, B→A foreground pull without reload, reload
persistence, a later online B same-row edit winning after A went offline,
guest export → account Import all → outbox/cloud → B, sign-out/guest isolation,
sign-in restoration and absence of repeated first-login prompts. B's edits
appeared on A almost immediately. Two offline lifecycle defects remained:
`Failed to fetch` displayed a generic sync error despite a durable pending
mutation, and cold-offline reload fell back to guest without automatically
restoring the account on reconnect. Flushing the specific mutation across
that cold-reload sequence was not observed in the production smoke.

## Account Sync — S5.1

Status: **complete**. Merged in PR #17 (`f100ff4`); targeted authenticated
production smoke passed on the deployed Pages build on 2026-10-03.

- Branch `fix/account-sync-s5-1-offline` from current `main` `ff10333`
  (2026-09-29). Cold-offline bootstrap may show an already established local
  account only when an unexpired cached Supabase token's project issuer and
  `sub` match its local session user ID and exactly one stored account binding.
  A missing, mismatched or ambiguous identity stays on the guest. Pre-paint
  still uses the guest/default theme. Offline account edits remain in its
  durable outbox; the sync controller cannot send until online account
  verification and profile ownership complete. Explicit sign-out and account
  switch continue to invalidate an in-flight resolver.
- A browser online event, foreground return or 15-second recovery probe
  retries a transport-blocked bootstrap without a page reload or Google login.
  A network failure during that retry keeps a safely matched offline account
  visible; a true auth/ownership failure falls closed. S5 `Failed to fetch`,
  Auth retryable fetch and timeout failures show network-unavailable/local-save
  status with bounded retry even when `navigator.onLine` remains true. Auth,
  schema and other application errors retain separate statuses.
- Deterministic tests cover offline reload with exact outbox replay, reconnect
  verification and cloud propagation to a second device, guest fallback
  recovery, A/B session mismatch, explicit sign-out, ambiguous binding,
  in-flight account switch and transport/error classification. The targeted
  production smoke below closes the remaining manual gate. No realtime or S6
  work was added.
- Bun 1.3.14 frozen install, typecheck, **1019 tests** across 50 files and
  production build passed locally. The refreshed feed on current `main`
  contains 164 events across seven games with the existing NTE Circle Bounty
  conflict.

Targeted production smoke on 2026-10-03 passed with two independent browser
profiles using the same disposable Google test account:

- An offline mutation applied immediately and remained durable in the outbox.
- Cold reload while offline opened the same established account cache; account
  data and the pending mutation stayed visible without guest/start fallback.
- Reconnect automatically re-verified the account and resumed sync without
  reload or Google login. The pending mutation flushed and propagated to B,
  confirming survival across the previously unobserved cold-reload sequence.
- Blocking Supabase requests through DevTools Request conditions while the
  browser still reported online showed the intended network/local-save status
  instead of a generic sync failure. Pending data remained local; removing the
  block automatically recovered sync and convergence.
- Explicit sign-out returned to the browser's guest profile. Cold offline
  reload remained on guest, and reconnect did not reactivate the account.
  Account data returned only after explicit sign-in.

All requested S5.1 production checks passed; no S5/S5.1 manual gate remains.
Changes on A need not appear spontaneously on an untouched B: foreground
return, tab switch or another existing sync trigger pulls them. This is the
expected S5 behavior without realtime, not an outstanding defect.

Documentation closure was prepared from current `main` `e1b70f9` on
2026-10-03. Frozen install, typecheck, **1019 tests** across 50 files and build
passed again. The current feed contains 171 events across seven games with
the existing NTE Circle Bounty conflict; this closure changes documentation
only.

Next planned milestone: S6 — backup and hardening, after several days of real
use and in a separately authorized Work. Its approved scope is a private
GitHub backup strategy, a recovery drill, optional local cache removal,
monitoring/logging sufficient for 2–3 users, and maintenance documentation.
S6 had not started at that closure; realtime and multi-profile UI remain outside it.

## Account Sync — S6a: private backup + recovery

Status: **complete (2026-10-19).** Hosted encrypted backups, real-key
validation, a controlled single-profile production restore and a fresh deployed
app read all passed. See the 2026-10-19 drill entry at the end of this section.
S5/S5.1 remain closed; S6b monitoring/cache-removal work is separate and has not started.

- New short-lived branch `account-sync-s6a-backup` from verified public main
  `c60cba50ba7cd66a7150c33f0a0133f4b8fc72a5` on 2026-10-03. The separate private
  `maxvfk/game-calendar-backups` was verified private with main
  `15f81501a223ef289b15d1bdd954c92107f955aa` (initial README only), and its own
  fresh S6a branch holds the scheduled workflow and operations README.
- Public migration adds a passwordless NOLOGIN `calendar_backup` SQL role,
  SELECT-only access/RLS for all seven personal tables, no memberships,
  BYPASSRLS, Auth reads or sync RPC execute privilege, and a SQL-only project
  identity marker. Operator enables its login/password locally. Backup uses
  verified-TLS Supavisor Session pooler (5432) or direct SQL, one REPEATABLE
  READ/READ ONLY transaction; no service-role API key is needed.
- Canonical version 1 logical snapshots preserve profiles/owners, progress,
  daily_marks, ignored, preferences, custom_games, custom_events, tombstones,
  false/unset, JSON null and original LWW metadata. Format/project/live generated
  schema contract, counts, per-table/total digests and row validity are checked.
  Age X25519 encrypts in memory with a public recipient before writing; GitHub
  never receives the private decryption key. Plain manifests contain safe
  metadata/ciphertext digests only, with no account IDs or row counts.
- Private workflow runs daily at 01:23 UTC, captures first successful monthly
  snapshot, retains latest 30 daily / 12 monthly pairs deterministically in the
  current tree and commits only encrypted pairs. Old ciphertext stays in Git
  history; no history rewrite is implied. Errors/nonempty-payload/integrity
  checks fail Actions visibly. Code/actions are pinned; the read credential is
  scoped to configuration checks and production export and never logged/staged.
- Local administrative restore defaults to a read-only dry run and requires
  explicit selected profile(s) or all snapshot profiles plus `--write` for DML.
  It checks existing Auth UUIDs, unchanged ownership/default uniqueness and
  target project/schema, locks the seven tables, atomically replaces selected
  profile state, verifies every restored row and commits or rolls back. It is
  idempotent and leaves unrelated profiles intact. It never creates/remaps Auth
  identities or uses the browser sync RPC. Quiescent account devices and a
  fresh-browser/cloud-only verification are required for the production drill.
- Local tests execute actual migrations in PostgreSQL 18/PGlite and test
  read-only cross-owner export, owner/anon isolation, corruption/drift, all
  logical state types, ownership/Auth/default refusal, dry-run, rollback,
  exact/idempotent isolated restore, existing app decode/materialization and
  retention. Native Bun.SQL wire tests caught and corrected explicit Postgres
  array parameter encoding. Real age encryption/decrypt/validate/restore passed
  with synthetic rows and the publicly known upstream test identity kept outside
  both repos; no production private key was created.
- Bun 1.3.14 frozen install, typecheck, full tests and build passed locally in
  UTC (CI's timezone); standard suite **1031 pass / 1 optional age test skipped**,
  focused suite with external age test fixture **13 pass**, and the full suite
  with that fixture **1032 pass / 0 skipped / 0 fail**. The initial
  America/Chicago environment exposed an existing date-only custom EventRow
  expectation; UTC passes without any UI/test changes. Feed remains 171 events
  across seven games with the pre-existing NTE Circle Bounty conflict.
- Architecture, exact manual setup, key custody, retention/history tradeoff,
  local commands, exclusions and safe disposable-account production drill are
  in [ACCOUNT-BACKUP.md](ACCOUNT-BACKUP.md); the private README records its
  pending production evidence. Neither repo contains a secret or plaintext
  personal snapshot. No realtime, multi-profile UI, new providers, source work,
  cache-removal UI or full new-project/Auth disaster recovery was added.

- Production TLS follow-up on 2026-10-07 starts from current public main
  `38e93819be1a1c268839ab3bc5230b146aee25af` and private main
  `9457798a2d59c3de52411d8da893bb08ec4147ef`, on fresh `s6a-production-tls`
  branches. Hosted run `37609430936` passed guard/config/setup/tests, then
  failed SQL TLS with `self signed certificate in certificate chain`; no
  snapshot was committed. The exact operator Dashboard CA attachment was
  independently verified and committed at `supabase/certs/prod-ca-2021.crt`.
  Its fingerprint/validity are pinned before connection, with native Bun.SQL
  chain/hostname verification retained. This public CA needs no Secret or
  runner trust-store setup; rotate through reviewed PRs before 2031-04-26.
  Native handshake regression tests prove trusted CA acceptance and rejection
  of untrusted chains, hostname mismatch and refused TLS without fallback.
  Existing backup/restore restrictions and behavior remain intact. Focused
  tests: **15 pass / 1 optional age skipped / 0 fail**; frozen install,
  typecheck and build passed (170 events/seven games, two existing conflicts).
  Full suite: **1033 pass / 1 optional age skipped / 1 fail**. The sole failure
  is the unrelated Endfield reviewed-banner conflict assertion, reproduced on
  untouched current main (**1030 pass / 1 skipped / 1 fail**) and already red
  in its [CI run](https://github.com/maxvfk/game-calendar/actions/runs/37536018586).
  No source-ingestion/data/test bypass was added to this TLS-only follow-up.

- Hosted-schema compatibility follow-up starts from verified public main
  `2b30cece52e1a0ce7d60783cb636f7d5c71ac7fb` and private main
  `0865d9e84d6415349b9e862619951d093be30108`, using fresh
  `s6a-hosted-schema-contract` work. Actual run `37616434328` passes verified
  TLS and focused tests, then fails `Live database schema mismatch`; no snapshot.
  Operator catalog diagnostics confirm **PG17**, the expected project marker,
  exact columns (50), indexes (9) and triggers (6), and exactly 44 expected-only
  PG18 NOT NULL constraints (78 expected / 34 hosted, no other differences).
  NOT NULL is not the sole mismatch: all four function bodies differ, but their
  complete declarations and metadata match and every body matches after CRLF
  conversion. This is stored-body line-ending drift, not a proven deparser change.
- The semantic contract excludes only `contype='n'`, protecting nullability with
  column `notNull`. It normalizes only function-body CRLF outside quoted values;
  declarations, literals and all other schema definitions remain protected.
  Regressions cover PG18/pre-18 shapes, nullability, CHECK/PK/FK/index/function
  drift, literal newlines, malformed definitions and unchanged project/RLS/role
  guards. The canonical file is regenerated from migrations, never a live hash;
  new schema SHA-256 is `312a36fa274c90eba0f72000b81b8de72d25a2d5d54bebb31b955479889f4a3e`.
  Migration hashes and schema/backup format versions stay unchanged.
  Credentials, TLS, encryption, retention, restore writes and app sync are untouched.
  Validation on Bun 1.3.14: frozen install, typecheck and build passed; focused
  backup/TLS tests **26 pass / 1 optional age skip / 0 fail**. Full suite:
  **1044 pass / 1 skip / 1 fail**, solely the existing Endfield reviewed-banner
  assertion, reproduced on untouched current main (**1033 pass / 1 skip / 1 fail**).
  No source changes, test bypass or production execution were added.

- Production-preflight follow-up starts from verified public main
  `9cba9061f08978b19134d842d48672946ad66f09` and private main
  `d8e8ade2b41785ec28bc7339526c7e2b14b72388`, on fresh
  `s6a-event-trigger-preflight` branches. Actual hosted run `37643339951` passes
  operator config, pinned checkout, focused tests (**26 pass / 1 optional skip /
  0 fail**), verified TLS and semantic schema-contract preflight. It then fails
  `assertBackupRole` with `Backup role can execute a public SECURITY DEFINER
  function`; encrypted snapshot commit is skipped.
- Operator catalog diagnostic identifies **only** `public.rls_auto_enable()`,
  owner `postgres`, `calendar_backup_can_execute=true`, grants
  `PUBLIC:EXECUTE, postgres:EXECUTE`. This is the documented Supabase automatic-RLS
  `EVENT_TRIGGER` helper. PUBLIC EXECUTE is a default-privilege/ACL artifact,
  not a directly callable backup RPC. The fix excludes only return type
  `pg_catalog.event_trigger` by catalog identity, without a name allow-list;
  ordinary SECURITY DEFINER and regular `trigger` functions remain guarded.
  No production ACL/platform change is required. All earlier elevated-role,
  membership, public-CREATE and table-privilege guards remain unchanged, as do
  TLS, schema contract, format, encryption, retention and restore behavior.
  Real PGlite event-trigger tests verify ACL/type, non-callability, denied
  non-superuser installation and actual DDL firing. A regular trigger fixture
  demonstrates indirect invocation through a temporary table and guard rejection;
  role/privilege drift and inaccessible application RPCs remain covered.
  Validation (Bun 1.3.14): frozen install/typecheck/build pass; focused backup
  tests **30 pass / 1 optional age skip / 0 fail**. Full suite:
  **1048 pass / 1 skip / 1 fail**, only the existing Endfield banner assertion,
  reproduced on untouched current main (**1044 pass / 1 skip / 1 fail**).
  No source/test bypass or production execution was added.

- Hosted backup acceptance: with the role-guard fix pinned at
  `5b2a2b048bae53f32e464b0a91a8f5d9f354b669`, the private backup passed full
  role/policy/project/schema preflight and committed its first encrypted
  daily+monthly pair on 2026-10-07 (manual run `37650989484`). Scheduled runs
  succeeded on 2026-10-08 and every day 2026-10-10 → 2026-10-19. One isolated
  scheduled failure on 2026-10-09 (`37899103637`, generic sanitized export error,
  no commit, next run green) is left for S6b monitoring.
- Production recovery drill on 2026-10-19 followed
  [S6A-LOCAL-RECOVERY-DRILL.md](tasks/S6A-LOCAL-RECOVERY-DRILL.md) on the
  operator's trusted PC, from public main `9465f63` and private main `a30b324`:
  - The 2026-10-19 production snapshot (run `39208997141`) was decrypted and
    fully validated with the operator's **real** age key in a recovery worktree
    at its manifest `sourceRevision`. No plaintext was written to disk.
  - Disposable-account marker state was captured by a fresh pre-change backup
    (run `39265659289`, private commit `aff3030`), preserved outside the repos
    and validated. The markers were then changed or removed, and a post-change
    safety backup was taken (run `39266225373`, commit `0bb7963`).
  - With the account quiesced, a `--profile` (exactly one disposable default
    profile) `--dry-run` passed every scope check and showed seven-table plan
    counts 1/10/3/1/18/3/2 (profiles/progress/daily_marks/ignored/preferences/
    custom_games/custom_events). After explicit operator approval, a single
    `--write` committed and verified every row, and a post-write dry-run matched.
    The restore credential stayed in local process env only and was removed
    after each run.
  - A fresh browser profile with cloud-only login showed every pre-change
    marker restored (progress/note, daily, ignored, theme, custom game/event).
    The other account was unchanged.
  - Sanitized record: private
    `game-calendar-backups/reports/2026-10-19-s6a-local-recovery-drill.md`.
    The private README Evidence table was reconciled to match.

**S6a is complete.** No code, schema, workflow, credential or pin changed
during the drill. S6b (monitoring, cache removal) is a separate milestone and
has not started. Timeline M1/M2 still need their own explicit start from
CURRENT `main`.


## Pre-public release gate — Google OAuth publishing

Status: **deferred until the main pre-public product work is complete; not a
blocker for current owner/household use or Timeline M1/M2.**

- The existing Google/Supabase users are real production data identities. Do not
  recreate, remap or migrate the owner's or wife's users merely because the
  Google OAuth application's current publishing status was configured for
  testing during setup.
- Keep the current restricted/testing OAuth configuration while the calendar is
  still being developed and used by the existing small trusted set.
- Before the intended public-sharing scenario — **"here is the link; sign in
  with your Google account and use it" without manually pre-authorizing each
  person** — run a fresh Google OAuth production-readiness check against current
  Google/Supabase guidance.
- That check must confirm the requested Google scopes remain identity-only
  (`openid`, email/profile equivalents), review Audience/Branding, authorized
  redirect URIs, Supabase Site URL/redirect allow-list and any then-current
  policy/verification requirements. Do not add broader Google API scopes as part
  of publishing.
- Only after that review should the OAuth app be moved to
  **Publish app / In production**. Publishing is an OAuth-access/configuration
  change, not a migration of Supabase users or calendar data.
- After publishing, perform a fresh-account production smoke with a Google
  account that was not previously part of the controlled test set: sign in from
  the public Pages URL, create the new isolated default profile, sync a small
  disposable change, sign out/in, and verify existing users remain isolated.
- If Google introduces a verification, branding or policy requirement that is
  not satisfied by the identity-only flow, stop and review it rather than
  weakening auth boundaries or broadening scopes.

**Next concrete step for this gate:** none now. Revisit after the planned
pre-public implementation/audit work, immediately before broad link sharing.


## Source-health alert dedup — 2026-10-21

Status: **implemented and locally validated; post-merge hosted Refresh acceptance
is pending the next eligible normal cycle.** Task:
`docs/tasks/SOURCE-HEALTH-ALERT-DEDUP.md`.

- Baseline CURRENT main: `668192994aa6aa9ac397602d3cc2cbf970511e05`;
  branch `fix/source-health-alert-dedup`. Actual latest scheduled
  [Refresh 39494275065](https://github.com/maxvfk/game-calendar/actions/runs/39494275065)
  confirmed **6/8** sources, committed two changed bodies/confirmation metadata
  and dispatched publication. Only `Report source health` failed. Echoes was
  already **broken / 12 failures / HTTP 200**, last confirmed
  `2026-10-14T20:47:25.387Z`, with the same western Phantasia cycle/season
  contradiction. WuWa was also already **broken / 5 failures / HTTP 200**, last
  confirmed `2026-10-18T09:43:11.393Z`: 7/10 still-live identities disappeared
  in the candidate 10 → 3 row response, so the previous snapshot was retained.
  The triggered [CI/Pages 39494325800](https://github.com/maxvfk/game-calendar/actions/runs/39494325800)
  passed all three jobs: **1054 pass / 1 optional skip / 0 fail**, feed
  **181 events / 7 games / 1 existing NTE Circle Bounty conflict**.
- `runRefresh` derives `newlyBroken` from each selected source's persisted
  `SnapshotState.consecutiveFailures` before/after its cycle: below the existing
  **3** threshold before, at/above it after. `broken` remains the full standing
  list, including interval-skipped broken sources. Recovery resets the streak
  normally; another third failure alerts again. A new broken source alerts even
  while another source stays broken. No acknowledgement database or
  source-specific exception was added.
- Outputs expose both `broken` and `newlyBroken`. GitHub's final health gate
  fails only for nonzero `newlyBroken`, after snapshot commit/feed dispatch.
  The retained Gitea workflow uses the same rule to avoid incompatible health
  gates. Existing error annotations remain on **every** broken source, with
  `Newly broken` / `Still broken` context; step summary rows distinguish
  `broken (new)` from `broken (ongoing)` and show both totals.
- **No source-health/LKG acceptance rule was relaxed.** Threshold,
  failure/rejection accounting, robots/interval/override/no-retry rules,
  parser-zero/disappearance/boundary/conflict protections and hard failures are
  unchanged. `SnapshotStore`, parsers, checked-in snapshots and event data are
  untouched. Repeated all-source failure still fails even with no new health
  transition; no Phantasia cycle dates are accepted or invented.
- Local Bun **1.3.14**: `bun install --frozen-lockfile`, `bun run typecheck`,
  `bun test`, `bun run build` all pass. Focused Refresh tests: **90 pass / 0 fail**.
  Full suite: **1057 pass / 1 optional age skip / 0 fail** (1058 tests, 51 files).
  Regression coverage includes failures 1–5, recovery/re-break, a second source,
  interval skip, separate outputs and execution of both workflows' actual Bash
  health gates. Build: **181 events / 7 games / 1 existing conflict**;
  Phantasia cycles remain withheld.
- Hosted Refresh acceptance has **not yet been observed** for the new code.
  The latest source checks at `2026-10-20T20:42Z` were less than six hours old
  during this work. No forced refresh, failure-streak reset or cache edit was
  used for a demonstration. On the next eligible normal cycle, verify that the
  existing broken sources stay visible, newly-broken count is zero unless a
  real new transition occurs, valid sources publish, and triggered CI/Pages
  succeeds. Implementation PR/checks provide the merge/deployment evidence.

**Next concrete step:** Timeline M1 from CURRENT `main` after this alert-dedup
change is merged; do not start it as part of this milestone. The independent
Echoes contradiction and WuWa disappearance review remain source blockers.


## Timeline Readability / Recognition UX

Status: **research, M1 and M2 complete (2026-10-21); PR #34 deployed and operator phone/PC smoke accepted. Account/User S6a completed on 2026-10-19; S6b is separate/non-blocking.**

- A five-step UX research task was completed and reviewed in `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`.
- The selected direction is **Candidate A′ — Sticky semantic bars**:
  - optional semantic `recognitionSubjects?: string[]` with title fallback and no heuristic marketing-title parsing;
  - sticky readable identity + truthful end state rather than deadline text only at the physical event end;
  - exact/day/unknown deadline semantics without invented time;
  - mode-specific degradation for `By game` versus `Ending soonest`;
  - future-biased actual-current-moment anchoring at roughly 20% from the left on phone and 25% on desktop;
  - re-anchor only on initial Timeline open and explicit `Jump to today`, not on filters/group/upcoming/refresh;
  - no event-type category bands in the selected implementation direction.
- One review correction was added to the final spec: the visual `TypeBadge` may disappear first on a narrow bar, but event type must remain in accessible semantics.
- Implementation is split into two bounded tasks:
  1. `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md` — additive semantic data contract only;
  2. `docs/tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md` — Timeline rendering/navigation/accessibility, after merged M1.
- The previous Account/User blocker is cleared by completed S6a. S6b monitoring/cache-removal hardening is separate and does not block M1/M2. Both Timeline milestones still require a fresh CURRENT-main check before implementation.
- The feedback backlog was reconciled on 2026-10-06. Three small UI fixes remain open and unsequenced: mixed reset attribution, explicit Event Detail close/Back dismissal, and `All types` clear-all. Weekly separators remain observed. Event artwork, recognition-first Event Detail redesign, per-game daily passes and any return to type grouping remain larger/deferred work.
- The original featured-subject feedback also mentioned `Next Up`/checklist surfaces. M1/M2 cover the semantic contract + Timeline only, so those additional compact surfaces remain an explicit follow-up and must not be silently considered resolved when M2 lands.

### M1 recognition metadata — 2026-10-21

- Baseline CURRENT main: `929f62881566d8670ae4dd730b47aadbf9635c87` (includes
  merged source-health alert dedup); fresh branch
  `feat/timeline-m1-recognition-metadata`. Task:
  `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`.
- Canonical `GachaEvent` and reviewed ingestion now accept optional
  `recognitionSubjects?: string[]`, sharing one validator. A present array must
  contain at least one subject; strings must contain non-whitespace text and be
  at most 200 characters. Values/order are preserved. No title parsing,
  inferred subjects, schema-version bump or UI consumption was added.
- Reviewed materialization explicitly carries the field. Existing merge winner
  selection, canonical feed validation and JSON serialization preserve it
  without changes. `eventId()`, completion/progress keys, dates/precision,
  provenance/conflicts, custom storage/IDs, exports/preferences and Account/
  Supabase are unchanged. Old nonempty v1 feeds and custom events remain valid
  without the field; the required official title remains the fallback.
- Only two reviewed Genshin records were populated, using the explicit subjects
  already recorded in their reviewed summaries and linked notice `166200`:
  `When Warm Winds Cavort` → `Vesna`; `Epitome Invocation — Version 7.1 Phase I`
  → `Beyond the Chrysalis`, `Hymn of the Maelstrom` in that order. These are
  existing historical feed records, not a claim of new source verification or
  active banner coverage. No new source fetch/research or review timestamp was
  needed; all original reviewed values/timestamps remain unchanged. No safe
  two-character co-headliner example was established, so that shape is tested
  synthetically. Ordinary events retain omitted metadata. Broad catalogue
  population and future structured-parser extraction remain separate work.
- Bun **1.3.14**: frozen install, typecheck, full tests and build pass. Focused
  contract/integration tests: **22 pass / 0 fail**. Full suite: **1079 pass /
  1 optional age skip / 0 fail** (1080 tests, 52 files). Initial full run hit an
  existing PGlite setup hook timeout in `supabase-db.test.ts`; the exact unmodified
  `bun test` rerun passed, without changing timeouts or tests. The local runtime
  needed its `bunx` executable alias restored before the successful build.
- Tests cover omission, one character, ordered characters/items, empty arrays,
  blank/whitespace/mixed-invalid strings, wrong types, old nonempty feed JSON,
  merge/serialization, pinned derived and explicit IDs, custom events, and the
  actual offline feed builder in an isolated output directory. Before/after
  feed comparison retains **all 181 IDs / 7 games / 1 existing NTE Circle Bounty
  conflict**. Event values differ only by the two additive metadata fields and
  normal regenerated parser observation timestamps. No source-health or
  ingestion acceptance rule was changed. PR/hosted validation is recorded in
  the implementation PR.

### M2 sticky semantic Timeline — 2026-10-21

- Baseline CURRENT main: `34ab4bf0aca4eb5cbc944040c44a4be59690aa85`, merged
  M1 PR #30; fresh branch `feat/timeline-m2-sticky-semantic`. Authoritative
  Candidate A′ final UX specification was read; no broad research reopened.
- Sticky content joins declared `recognitionSubjects` with ` + `, preserving
  order, or uses the required title. The full official title remains in the
  tooltip/accessible name when subjects are used. No metadata was populated.
- Known deadlines show a compact end date without an always-on clock. Day-only
  ends print the source date (local input date for custom events), have a dashed
  underline on the sticky date token, and explicitly say `end date only` in
  accessibility. Regional exact ends use the resolved clock, not the fallback
  date. Unknown ends show `end unknown` / `?`, accessible as `End unknown`;
  cross-year dates include the year. No end instant/date is invented.
- Initial M2 fit (superseded by the phone-smoke amendment below): actual DOM
  text/badge metrics and the bar/viewport intersection drive fit.
  `By game` drops visual type, then known deadline, before truncating identity.
  `Ending soonest` keeps game + identity before a known deadline; compact game
  text survives when identity cannot fit. Unknown-end tokens outlast known
  deadline text. At the physical minimum or a nearly scrolled-away tail, text
  may yield completely; the full accessible event name always retains game,
  type, identity/title, truthful deadline/precision, upcoming, conflict,
  completion and urgency. Bars remain 36px high and `MIN_BAR` remains **34px**.
- Edge masks now affect only the decorative wash/boundaries. This preserves
  clipped-start/frayed-end honesty without fading away sticky readable text.
  A directly related existing defect was found on the current feed: drawing an
  unknown end at `start + 14 days` hid old still-live campaigns behind today.
  Unknown bars now continue to the current board edge with the frayed wash and
  explicit unknown semantics; that edge is not presented as an end date. A
  regression covers a months-old live campaign. The board range stays bounded.
  Upcoming start styling/markers, completion dimming and conflict/urgency cues
  remain. No type grouping, row reordering, artwork or Event Detail changes.
- Initial mount and explicit `Jump to today` anchor **actual `x(now)`**, at
  **20% below lg / 25% at lg and above**. Ordinary updates never request a jump;
  the pane stays mounted through empty filters. Native range clamping is still
  permitted. Zoom retains the inspected centre moment. No preferences or
  account data migration, ID/completion key, storage, export/import, ingestion,
  source-health or Supabase changes were made.
- Bun **1.3.14**: `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`
  and `bun run build` pass. Full suite: **1095 pass / 1 optional age skip /
  0 fail** (1096 tests, 54 files). New focused semantic/fit + mounted navigation
  tests: **16 pass**; focused semantic/day/navigation tests also pass with
  `TZ=America/New_York` (**21 pass**) for day printing/DST behavior. The isolated
  mounted React test uses pinned dev-only `happy-dom` and explicit geometry;
  it tests initial empty/nonempty mounting, filter/feed/range replacements,
  group/upcoming/split changes, day/clock ticks, hidden badge accessibility,
  zoom and explicit Jump. It does not claim CSS-layout validation.
- Offline build still produces **181 events / 7 games / 1 existing NTE Circle
  Bounty conflict**, without changing data files or ID logic. Chromium CSS
  verification adds **152 responsive assertions** at 320/390/768/1440px,
  both modes, five zoom values and several scroll offsets: anchor, no re-jump,
  inspected-moment zoom, one-line height, label containment and payload fit.
  Screenshots were visually inspected for narrow/desktop layouts, including
  long off-screen-end bars, minimum bars, exact/day/unknown ends, ordered
  subjects/items, title fallback, upcoming, completion/conflict and dense
  seven-game data. This is browser automation, **not a real-device manual pass**.
- No intentional UX-spec divergence. [PR #31](https://github.com/maxvfk/game-calendar/pull/31)
  merged as `98506fb946d9c6457fc84122251474d89766933f`.
  [Main CI/build/Pages](https://github.com/maxvfk/game-calendar/actions/runs/39507927343)
  succeeded; public index/JS/feed returned HTTP 200 with the M2 implementation.
- **Partial real-phone manual evidence — 2026-10-21:** the operator supplied
  an Android Chrome screenshot of the deployed Timeline in `Ending soonest`.
  The visible current-moment line is near 20% from the left; game/identity text,
  title truncation and width-dependent deadlines are visible. This static image
  alone does not prove initial-mount or Jump behavior.
  The operator then explicitly confirmed that zoom preserves the inspected
  moment, and switching `By game` / `Ending soonest` and filters preserves
  position without returning to today. These phone navigation checks **passed**.
- **Required manual gate remains open.** Upcoming-toggle stability, explicit
  `Jump to today`, the remaining phone semantic/lifecycle/readability cases
  (including off-screen-end stickiness and exact/day/unknown ends), and the
  desktop matrix have not been separately confirmed. Do not infer a full
  section-14 pass or accessibility/text-scaling acceptance from the screenshot
  and the two navigation confirmations.

### M2 phone-smoke follow-up — TypeBadge priority and category colours

- Baseline CURRENT main: `f2136e171e2e37e207e1bc1ee539ad083d3b679d`;
  fresh branch `fix/timeline-type-priority-colors`. This is a bounded M2
  amendment requested after real-phone review, not a new milestone. The updated
  M2 task explicitly supersedes the original research's type-first removal
  rules; the rest of Candidate A′ remains in force.
- Timeline fit retains the complete measured compact badge until that badge
  itself cannot fit in the payload budget (after existing conflict/urgency
  reservations). `By game`: type + identity + date → type + identity → type +
  truncated identity → type → bare. `Ending soonest`: game + type + identity +
  date → game + type + identity → game + type → type → bare. A badge is never
  squeezed or truncated to fit. One-line height and `MIN_BAR=34` are unchanged.
- Unknown-end text still says `end unknown` when the full payload fits. Below
  that, reserve compact `?` beside type before allocating names. At the
  type-only limit, the marker can yield visually; below badge width `?` may
  survive alone. Full accessible type/identity/game/`End unknown` semantics
  remain at every width. No deadline/date/precision or old-campaign geometry
  logic changed; no fabricated endpoint was introduced.
- Shared `TypeBadge` now uses stable theme-aware category tones: Banner violet,
  Event cyan, Challenge orange, Login green, Shop pink, Maintenance slate.
  `story` / `rerun` / `other` remain Event. These tokens are independent of
  game hues and urgency. Full/compact text and `Type: …` accessible labels
  remain; colour is supplementary. The same component supplies Timeline,
  EventRow, NextUp and EventDetail. Degradation outside Timeline is unchanged.
- Bun **1.3.14**: frozen install, typecheck, full test suite and build pass:
  **1098 pass / 1 optional age skip / 0 fail** (1099 tests, 54 files).
  Focused semantic/fit/category/mounted-navigation coverage: **23 pass**.
  The first full run hit the previously observed PGlite hook timeout in
  `supabase-db.test.ts`; an unchanged full rerun passed. No timeout/test bypass
  or account/Supabase change was made. Dependencies/lockfile are unchanged.
- Existing responsive browser sweep was rerun and extended with real measured
  badge-retention assertions: **272 Chromium assertions**, widths
  320/390/768/1440, both modes, five zooms, three scroll offsets, no re-jump,
  inspected-moment zoom, one-line height and containment. Both theme palettes
  were visually inspected. Badge text/background contrast measured **≥7.53:1
  dark / ≥4.82:1 light**; forced-colours testing retained text. Built-app smoke
  passed on the actual offline seven-game feed, including all six live
  unknown-end rows. Feed remains **181 events / 7 games / 1 existing conflict**.
- No navigation, ingestion/source-health, personal data/preferences, IDs,
  Account/Supabase, artwork, type grouping or Event Detail layout change.
  The already-confirmed phone zoom/group/filter results above remain valid.
  Hosted PR/merge/CI/Pages evidence is recorded in the follow-up PR.

### M2 manual smoke regression — viewport changes with filters/Upcoming (2026-10-21)

- After the TypeBadge follow-up, the operator reported that **changing filters
  and toggling Upcoming shifts the inspected Timeline position on both Android
  phone and PC**. This supersedes the earlier provisional filter-stability
  phone pass, including the “already confirmed” language above; do not
  treat filter/upcoming stability as accepted. No other M2 defect was reported
  in this latest operator pass.
- Code-review hypothesis (not yet reproduced in a failing browser test):
  Timeline recomputes its board min/max from the plotted rows, but non-zoom
  rerenders retain numeric scrollLeft rather than the timestamp at the
  viewport anchor. A changed min therefore changes the visible date;
  shrinking max can additionally invoke native scroll clamping. Existing
  happy-dom navigation assertions check fixed scrollLeft, not inspected
  time, and do not model real scroll geometry. The implementation Work must
  verify the actual cause(s), not treat the hypothesis as proven.
- Focused fix task:
  docs/tasks/TIMELINE-READABILITY-M2-VIEWPORT-PRESERVATION-FIX.md.
  This remains **M2 follow-up**, not a new milestone; no runtime fix has
  been made in this documentation-only change.

### M2 viewport-preservation fix — automated validation (2026-10-21)

- Started from CURRENT main `2a5b2b8` (the operator's regression task, PR #33).
  **Confirmed root cause**, rather than accepting the hypothesis: both the
  mounted React regression and actual Chromium regression fail on this base.
  Filtering away the earliest game changes the board origin by 40 days;
  Chromium retains scrollLeft **1984 px**, moving the centre timestamp by
  **40 days**. The correct offset for that moment is **704 px** at 32 px/day
  and a 320 px viewport. No remount or Jump invocation is involved.
- `Timeline.tsx` now snapshots the inspected centre in the old calendar
  coordinates **before DOM mutations** (`getSnapshotBeforeUpdate`). After the
  new range/scale is laid out it restores that moment, clamped to the actual
  native scroll extent. Capturing in an ordinary post-mutation layout effect
  would lose information when a shrinking range has already clamped scrollLeft.
  This also catches a scroll immediately followed by filtering, before its
  scroll event/RAF. A temporarily empty pane retains the last real moment;
  restoration does not re-initialize. After an unavoidable clamp, subsequent
  range expansion preserves the newly inspected centre rather than bouncing
  back to an obsolete moment. Zoom uses this same single restoration path;
  initial and explicit Jump retain their 20%/25% anchors.
- Replaced the happy-dom helper's misleading fixed-pixel assertions with
  timestamp assertions, and added both-mode/multi-scale feasible/clamped range,
  hidden-update/restore and immediate-scroll coverage. Existing type-only,
  unknown-end, accessible-name and initial/Jump/zoom checks remain.
- Added a reproducible **real Chromium/CSS** fixture and runner:
  `test/helpers/timeline-browser.tsx`, `scripts/check-timeline-browser.mjs`.
  The runner's header documents invocation with an external Playwright install;
  `CHROMIUM_EXECUTABLE_PATH` optionally selects an installed Chromium binary.
  No production dependency or lockfile change. **372 checks per run**, with
  both UTC and America/New_York browser timezones: widths 320/390/768/1440,
  both modes, three scales, game/category filtering, Upcoming bounds changes,
  split/group, feed replacement, rerender, capped-origin clock/day/second
  updates, all-hidden/return, rapid scroll/filter, feasible retention, left and
  right native clamping, post-clamp expansion, centre zoom and explicit Jump.
- Bun **1.3.14**: all four required commands passed (frozen install, typecheck,
  `bun test`, build): **1098 pass / 1 optional age skip / 0 fail**, 1099 tests
  across 54 files. Existing responsive/browser sweep also passed **272
  assertions**; its old numeric-scroll check now checks the inspected moment.
  Built-app smoke passed on the current offline feed in both modes at phone
  and desktop widths, all seven games, six live unknown-end bars, no page
  errors. Build: **179 events / 7 games / 1 existing conflict**. Source reminder
  warnings are unchanged; no refresh/ingestion/data work was performed.
- Only runtime change: Timeline viewport navigation. TypeBadge, deadline/day/
  unknown semantics, IDs, preferences, personal data, Account/Supabase and
  other views are unchanged. Delivery: [PR #34](https://github.com/maxvfk/game-calendar/pull/34);
  hosted CI/merge/Pages evidence is recorded in that PR.

### M2 operator acceptance — real phone and PC (2026-10-21)

- After merged [PR #34](https://github.com/maxvfk/game-calendar/pull/34)
  was deployed through successful [main CI/Pages run 39611480568](https://github.com/maxvfk/game-calendar/actions/runs/39611480568),
  the operator re-tested on both Android phone and PC and reported that
  filtering and Upcoming navigation now work correctly, with no other M2
  defect identified. This supersedes the earlier filter failure and pending
  manual-acceptance statements above.
- The operator also observed position shifts under some combinations of
  filters that hide almost all events. Supplied desktop screenshot: only
  Genshin focus (10 live, zero upcoming), with the latest visible dated events
  ending around November 3 and the board's right edge near November 5.
  The TODAY line is no longer at the initial 25% desktop target. That
  observation is **consistent with intentional closest-edge scroll clamping**
  after the available date range contracts, rather than evidence of a new
  re-anchor to today. The screenshot alone cannot establish every preceding
  offset, but the documented contract explicitly permits such clamping,
  and browser regressions cover feasible and infeasible retention.
- Decision: **accept M2 as complete** on the basis of operator phone/PC smoke,
  PR #34's validated temporal restoration and the allowed range-boundary
  behavior. Do not extend the board with invented future dates or empty weeks
  solely to force a 20%/25% TODAY position after narrowing filters. If later
  evidence shows a jump while preservation was geometrically possible, file a
  separate reproducible defect with before/after dates and filter state.

**Next concrete step:** M2 is closed; no further M2 changes are required.
Choose the next independent prioritized project task separately from CURRENT
main. Do not start S6b, source/data research, recognition-population work, or
other milestones automatically.


## Pre-Astra UI polish — compact mobile header and wrapped filters (approved 2026-10-21)

- M2 research/M1/M2 are closed and accepted with operator phone/desktop smoke.
  A separate new mobile usability finding is **not** an M2 regression:
  permanent type filters, Focus and account/sync text consume too much vertical
  room above the Calendar on a real phone.
- The operator reviewed successive mockups and approved a single compact mobile
  header: reduced EVENTCLOCK title (no mobile live/upcoming subtitle), a
  collapsible Filters control, existing view toggle, and an account/status icon
  at the far right. The always-visible mobile account text strip moves behind
  the truthful account/status disclosure. Existing auth/sync behavior stays.
- Filters default collapsed on phone. When expanded they show **all** event
  type and enabled-game Focus choices, wrapping rather than horizontally
  scrolling, plus `Reset filters` and an explicit in-panel collapse button;
  the top Filters control is itself a toggle. An active-filter cue is visible
  even while collapsed. Reset affects **only** types + Focus, not hidden games,
  Upcoming or other preferences. `All types` select-all/clear-all is bundled
  with this same task to avoid duplicate touch points.
- **Implementation task ready:** `docs/tasks/UI-POLISH-MOBILE-HEADER-FILTERS.md`.
  This is a **standalone short UI-polish Work**, not bundled with mixed-reset
  countdown, Detail Close/Back, weekly separators, source research, artwork,
  S6b or the finished M2. No runtime code changed in this documentation step.
- **Next concrete step:** run the compact-mobile-header Work from then-CURRENT
  main; merge/deploy after required checks, then operator phone + desktop smoke.
  The unrelated small UI-fix items can follow separately.


### Compact mobile header / filters implementation — 2026-10-21

- Baseline CURRENT main `56bb3ce1c86268f4c1e9339e86ce3378bf8dc6d3`;
  bounded branch `feat/mobile-header-filters`, implementing only
  `docs/tasks/UI-POLISH-MOBILE-HEADER-FILTERS.md`.
- Below 768 CSS px the persistent account/status, counts, type and Focus rows
  are replaced by one compact header: EVENTCLOCK, Filters, List/Timeline,
  person/status button at the far right. Tabs retain accessible Checklist /
  Timeline names and existing `prefs.view` values. Real measured overflow at
  large text sizes switches tabs to named icons without shrinking their 44px
  targets; no second permanent header row. The existing desktop placements
  remain visible from 768px, with no duplicate accessible mobile controls.
- Filters are session-only component state, initially collapsed. Both the top
  toggle and explicit in-panel collapse close it; Escape restores focus to the
  trigger. The inline panel pushes content down, never auto-closes on selection,
  and wraps all Types and enabled games in the chosen order, including custom
  lanes. Zero/one enabled game gets truthful text instead of an inert chooser.
  Existing single-game Focus toggling and Next progression remain. The active
  cue has a textual accessible equivalent and selected chips use aria-pressed.
- All types clears an all-selected set, otherwise selects all. Reset changes
  only `visibleCategories` and `focusGame`; hidden/known games, order, Upcoming,
  completion/ignored settings, region, zoom, view and personal data are retained.
  Empty-result reset, partial/none/all, focused-game return and shared Checklist /
  Timeline selection are covered. Opening/closing the panel retains the same
  Timeline DOM pane and inspected time; no Jump/key/navigation code changed.
- AuthRoot still owns the same ViewState, SyncStatus and actions. Mobile account
  disclosure reuses its actual email/status/pending/last-sync/warnings and
  sign-in, sign-out, retry, and deferred setup actions. Escape/close restores
  focus; outside pointer/focus dismisses the popover. Guest is neutral with +;
  only actual synced/no-pending state gets a positive cue; syncing, pending,
  offline/network, auth/schema/error and clock warning are distinct. Established
  offline cache mode cannot show green. Account access also remains available
  during feed loading/error and onboarding. Auth bootstrap, sync engine,
  profile keys, pending mutations and first-login contracts are unchanged.
- Bun 1.3.14: frozen install, typecheck, full suite and build pass:
  **1101 pass / 1 existing optional age skip / 0 fail**, 1102 tests in 55 files.
  Focused tests mount real AuthRoot with isolated fake auth/sync transports,
  exercise existing actions and readable warnings, and verify guest profile
  isolation / controller cleanup on sign-out. No real OAuth login is simulated.
- Reproducible `scripts/check-mobile-header-browser.mjs` + its fixture add
  **384 Chromium assertions**: 320/360/390px, desktop 768/1440 fallback,
  all chips/order/custom games, empty results, exact Reset boundary, filter
  persistence, same-pane inspected-time/clamping, disclosures/focus/actions,
  all status cues, dark/light and 100%/200% root text. Production JS + actual
  AuthRoot guest bootstrap are additionally smoked at 320/1440px. Screenshots
  were visually inspected for phone widths and both themes. Existing M2 real
  Chromium regression passes **372 checks in UTC and 372 in America/New_York**.
- **Text-scaling limit, outside this task:** at 200% root text the new header
  and expanded panel fit; the pre-existing bottom game-order/settings controls
  can still widen the page. Reproduced independently on unchanged baseline
  `56bb3ce`: at 320px, `7 of 8 on · your order` extends to x=346.94px and
  `Reset to A–Z` to x=353.77px. Those exact overflows persist in this Work;
  unrelated settings were not redesigned. At ordinary text size all tested
  phone pages have no horizontal page overflow.
- Offline build retains **179 events / 7 games / 1 existing NTE Circle Bounty
  conflict**; data/snapshots/IDs, ingestion/source-health, TypeBadge, Timeline
  navigation, account storage/Supabase and other milestones are unchanged.
- Delivery: [PR #37](https://github.com/maxvfk/game-calendar/pull/37), head
  `d731387499c8458be1d7828f71021ed466bac5b4`, passed
  [PR CI 39631123805](https://github.com/maxvfk/game-calendar/actions/runs/39631123805)
  and merged as `bbff4a1c573a53dc1bbae0f3a2ac68a4ab2e2f16`.
  [Main CI/build/Pages 39631262345](https://github.com/maxvfk/game-calendar/actions/runs/39631262345)
  succeeded in all three jobs. Actual hosted test log: **1101 pass / 1 skip /
  0 fail** on Bun 1.3.14. Public index, main.js, styles.css and feed returned
  HTTP 200. Cache-busted public JS/CSS are byte-identical to the validated local
  build (JS SHA-256 `556cb1d77cb5c6bb72c3ee03b1db3c03717ab39b682b8c8250629a552bad1bf4`).
  Public feed generated `2026-10-21T16:03:56.402Z`: **179 events / 7 games /
  1 existing conflict**. This establishes deployed runtime assets, not a
  real-phone manual pass.
- **Implementation / automated checks / PR / merge / deploy are complete.**
  Final real-phone acceptance remains open and is explicitly reserved for the
  operator. Do not infer a real-device pass from Chromium screenshots.

**Next concrete step:** operator real-phone smoke on the deployed site:
collapsed/expanded filters, All types, Reset, account disclosure/status/actions,
both themes, no sideways pan at normal text, and Timeline inspected-time
preservation including legitimate closest-edge clamping. The documented
pre-existing 200%-text settings overflow remains outside this task. Stop here;
do not start the separate small UI-fix batch or another milestone.


### Mobile phone-smoke visual follow-up — 2026-10-21

- Operator reported the deployed implementation works well, requesting two
  visual refinements against the accepted prototype: a real Filters button
  filling the unused header width, and shorter rows in the expanded panel.
  Baseline CURRENT main: `33a16fe4332db00e9ad8ce2468ea610612c8e023`;
  branch `fix/mobile-filter-density`. This continues only the same UI task.
- Mobile Filters is now a bordered, labelled flex-growing button between the
  wordmark and tabs, using a funnel icon and an expanded-state border/wash.
  At 320px the funnel yields to the visible Filters label; large-text measured
  compact fallback retains its accessible name. Header/tab/account targets
  remain 44px. No extra row or saved preference was added.
- Wrapped filter chips use 32px minimum height rather than 44px, retain 6px
  separation and grow naturally with enlarged text. Horizontal chip padding
  and panel/heading/section spacing are reduced; Next is 28px high. Mobile
  visible copy becomes Login / Shop while existing full accessible names,
  category IDs and desktop labels remain. At 390px the fixture's type chips
  fit two rows; 320px fits three. Timeline bar height and navigation are not
  part of this density change.
- Frozen install, typecheck, full tests and build pass on Bun 1.3.14:
  **1101 pass / 1 existing optional skip / 0 fail**. Extended browser regression:
  **405 Chromium checks**, including bordered flex fill without unused gaps,
  visible normal-size phone label, measured 32px chips, compact-panel height,
  all existing filter/Reset/Auth-state/navigation checks, both themes and
  200% text. Screenshots inspected at 320/360/390px. Existing M2 temporal
  viewport browser regression also passes **372 checks**.
- Hosted CI/merge/Pages delivery evidence is tracked in
  [follow-up PR #39](https://github.com/maxvfk/game-calendar/pull/39).
  Final real-phone smoke of the refined button/spacing remains the operator's
  gate; the previously documented unrelated 200%-text settings limit remains.

**Next concrete step:** operator checks the refined button width and panel
density on the phone after PR #39's deployment. The PR records final hosted
evidence; this document does not claim a refined real-phone pass. No other
UI-fix or milestone is included.


### Mobile header height / aligned frames — 2026-10-21

- Operator accepted the 32px filter panel after PR #39, then supplied another
  phone screenshot requesting a shorter header and equal Filters/view-toggle
  frame heights. Baseline CURRENT main `de4bfa10ca14585d817c05e83ff045fa9cc229b4`;
  branch `fix/mobile-header-height`. This supersedes the earlier fixed 44px
  mobile-header target decision only; the accepted filter panel is retained.
- Mobile header vertical padding is 4px. Filters and the outside frame of
  List/Timeline are both **34px** high at normal text size; the tabs' inner
  buttons are 28px with 2px frame padding and 1px borders. The header is
  **43px** including its bottom border. The person trigger follows the same
  34px row; existing account-popover controls keep their prior sizing.
  Minimum heights allow enlarged text to grow; named icon fallback still fits.
  Desktop rules, filter panel, Auth/Sync and Timeline runtime are unchanged.
- Frozen install, typecheck, full tests and build pass on Bun 1.3.14:
  **1101 pass / 1 existing optional skip / 0 fail**. Browser header/filter
  checks now total **441**: explicit equal 34px frames, header <=44px,
  containment/touch dimensions, prior filters/Reset/account behavior, both
  themes and 100%/200% text. Existing M2 Chromium regression: **372 passed**.
  Actual screenshots inspected at phone widths. Final real-phone visual
  acceptance remains with the operator. Hosted CI/merge/Pages evidence is
  recorded in [PR #40](https://github.com/maxvfk/game-calendar/pull/40).

**Next concrete step:** after PR #40’s Pages deploy, operator checks
header height and equal frames on the phone. No other milestone is included.


### Remaining small UI-fix batch — scoped 2026-10-21

- CURRENT main at scope check: `c5e540c30ae9e6ed6cf5d7b51990b407b85379ac`
  (PR #40 mobile-header frame-height follow-up). `All types` select-all/
  clear-all is **already implemented** by PR #37 in the shared
  `TypeFilters.tsx`, confirmed in code. It is **excluded** from the next Work.
- Three approved open fixes: **attribute mixed daily reset countdown to the
  next-reset game(s)**, **add visible in-sheet Event Detail Close plus
  browser/Android Back-first dismissal**, and **make the Sunday-to-Monday
  Timeline grid boundary visibly stronger than ordinary daily lines**.
  The operator explicitly promoted weekly separators from assessment-only to
  **required implementation** on 2026-10-21. Use local-date/DST-safe placement,
  low visual salience under TODAY, and leave Timeline M2 viewport unaffected.
- Dedicated small Work task: `docs/tasks/UI-POLISH-SMALL-FIXES.md`.
  No runtime changes in this documentation step. Mobile-header PR #40's
  real-phone acceptance status remains separately recorded; do not silently
  infer it from this task.
- **Next concrete step:** implement all three approved fixes from then-CURRENT
  main, run full baseline + real-browser Back/navigation and week-line rendering
  regressions, merge/deploy, then operator phone/desktop smoke.


### Timeline label readability intake — approved 2026-10-21 (implementation below)

- Operator's Android Chrome screenshot in `Ending soonest` shows real event
  bars that display game + TypeBadge + urgency dot, **but no identity text**.
  Code review confirmed the `Ending soonest` fit branch in
  `src/client/state/timelineContent.ts` is all-or-nothing on measured
  `identity`; it drops titles to zero instead of truncating although a
  partial title could fit. Old `test/timeline-content.test.tsx` tests
  explicitly encode this result. No feed disappearance was established.
- New separate task `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md` specifies
  measured-width ellipsis/truncation on phones, retaining high-priority compact
  TypeBadge, truthful deadlines, full accessible names and real M2 viewport
  preservation. The previously accepted M2 all-or-nothing `Ending soonest`
  identity degradation is intentionally superseded **only for this behavior**.
- This is **docs/intake only**, not a runtime fix. Keep the currently active
  three-part `UI-POLISH-SMALL-FIXES.md` Work independent. Start new short Work
  for labels from then-CURRENT main **after** that PR is merged.
- **Next concrete step:** implement focused fit correction, unit and actual
  Chromium phone/desktop width regressions, standard checks, PR/merge/deploy,
  then final operator real-phone smoke. Do not start unrelated milestones.


## Small UI fixes — implementation and browser validation, 2026-10-21

Scope: only `docs/tasks/UI-POLISH-SMALL-FIXES.md`, from CURRENT main
`b3095d350d254bda7bef1155fffcba02c20cb56c`; branch
`fix/ui-polish-small-fixes`. **All three required fixes are implemented.**
`All types` was already complete and was not changed.

- **Daily Reset:** nearest exact computed boundary is attributed to the first
  game in user order, with `+N` for additional distinct games sharing that
  boundary. Multiple items of one game count once. Both timer and attribution
  use the same `DailyItem.resetsIn`/`now`; no rounded-string grouping or new
  reset clock. Shared clocks retain `resets in`. The row stays single-line at
  320px, with tighter heading tracking/gaps, a non-shrinking group count/timer,
  and complete game names in its accessible label/tooltip. Existing daily
  keys, chores, custom-game fallback, ticks, region/reset logic and sync stay.
- **Event Detail:** sticky in-sheet Close has a 44px target, receives initial
  focus and stays reachable after scrolling. Keyboard focus stays inside and
  returns to a connected invoker without scrolling. Backdrop/Escape still
  close. App uses one document-scoped history coordinator across profile
  remounts/StrictMode: one owned entry per open sheet, event switches reuse it,
  Close consumes it, native Back closes first, and queued rapid opens wait for
  consumption. Reload/deletion/profile teardown dismiss rather than resurrect.
  URL, base path, query/hash and foreign history state are preserved; entries
  changed by foreign navigation/OAuth-style URL cleanup are not traversed.
  History never restores an event ID. Browser Forward can visit an inert
  forward slot (the History API cannot delete it); it is neutralized without
  reopening, and subsequent opens prune the old forward tail, avoiding
  accumulating modal entries or automatic back loops.
- **Weekly Timeline lines:** existing `dayBoundaries`/`timelineX` now draw each
  local Monday midnight as a 2px `faint/60` decorative line; ordinary days remain
  1px `hairline/40`. No day widths, date labels, bar geometry or M2 navigation
  changed. Grid lines stay behind bars/labels and TODAY, with no pointer target.
  Both modes, themes, phone/desktop, zoom extremes and local DST are verified.
- **Local checks:** Bun 1.3.14 frozen install, typecheck and complete build
  pass. Final full suite (`TMPDIR=/dev/shm/game-calendar-tests bun test`): **1107 pass / 1 existing optional age skip / 0 fail**,
  1108 tests across 56 files. Focused small-fix suite also passes in
  America/New_York and Europe/Berlin. Offline feed still has **179 events /
  7 games / 1 existing NTE Circle Bounty conflict**. No source refresh, data,
  IDs, storage/auth/sync or mobile-header/filter implementation changed.
- **Real Chromium 153:** new reproducible runner + fixtures verify App history/
  focus/Close and native history edge cases, and per-cell rendering/placement
  across the week-line matrix: **61364 assertions**. Existing runners pass:
  M2 **372 UTC + 372 America/New_York**, mobile header/filter **441**. Initial
  concurrent runs hit existing test/smooth-scroll timing limits; standalone
  browser repeats pass. Plain `bun test` passed once, but later repeats hit
  existing Supabase setup / backup retention timeouts on the container overlay.
  The final full run with RAM-backed temporary files passes without changing
  any timeout, assertion or repository test configuration. This is automated browser
  evidence, not Android hardware acceptance or real OAuth sign-in.
- Visually inspected screenshots and exact matrix/reproduction notes:
  [browser evidence](evidence/ui-polish-small-fixes/README.md).
- Delivery: [PR #44](https://github.com/maxvfk/game-calendar/pull/44).
  [PR CI 39645460126](https://github.com/maxvfk/game-calendar/actions/runs/39645460126)
  passed check/build on implementation head `49044769d754e7dfbc09978a4af3331944a6a1d3`.
  Actual hosted log: ordinary `bun test` **1107 pass / 1 optional skip / 0 fail**;
  feed **179 events / 7 games / 1 existing conflict**. Pages is correctly
  skipped for the PR. The PR description records final merge/main-CI/Pages
  evidence after delivery. Final operator phone/desktop acceptance remains pending. During
  implementation, main's docs-only PR #43 was integrated without changing
  runtime/tests; its separate label-truncation task remains unstarted.

**Next concrete step:** after delivery, operator smoke on Android Chrome and
PC: mixed daily-reset attribution; Close and Back-first dismissal from both
views followed by normal Back; daily vs Monday vs TODAY contrast in both
Timeline modes/themes and min/max zoom. Confirm filtering after closing detail
retains the inspected moment, allowing existing nearest-edge clamps. Stop here;
no other milestone is started.


### Game Daily Reset clock correctness — separate follow-up noted 2026-10-21

- Operator reports that PR #44 correctly attributes the nearest daily reset
  to a game/group but that the **underlying reset times appear inaccurate**.
  This is a potential existing clock/configuration problem, **not proof that
  the new attribution algorithm is wrong**. No per-game true reset instant
  has yet been independently verified against the user's observation.
- `nextDailyReset` uses `msUntilReset` from
  `dayKey`/`nextResetMs`/`resetShiftMs`. Current default is 04:00
  server-local with fixed region offsets; Endfield has a Europe override.
  NTE/CZN retain the regional default in `GAMES`; the actual game-server
  behavior requires source/in-game verification.
- This matters beyond the displayed timer: reset clock assumptions determine
  profile-stored daily day keys, history, streaks and synchronization behavior.
  Do not simply adjust constants before reviewing storage compatibility.
- **Separate research-first task filed:** `docs/tasks/DAILY-RESET-CLOCK-AUDIT.md`.
  Audit the seven currently shipped games with dated authoritative evidence,
  DST/server mappings and migration risk; return a bounded implementation
  proposal. **No reset clock or UI runtime change is included in this entry.**
- **Next concrete step:** collect a concrete observed mismatch
  (game, selected region, displayed time and known in-game reset) and run
  this targeted audit independently of Timeline label readability Work.


## Timeline label truncation fix — 2026-10-21 (Moscow)

Scope: only `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md`. Baseline current
main `769c5f4`; fresh branch `fix/timeline-label-truncation`. Small UI fixes
PR #44 was already merged (`c54ec98`) and its main CI/build/Pages had succeeded
before implementation began. Independent PR #45 reset-clock audit docs remain.

- Confirmed regression on the original source: 160px measured payload yields
  **0 identity**, although **83px** remains after game + compact TypeBadge +
  gaps. New regression first failed on that source, then passed after the fix.
- `Ending soonest` now uses available width for a CSS-ellipsized identity,
  retaining game when it leaves useful title text. Otherwise game yields
  before the identity. Minimum useful text is measured three graphemes plus
  ellipsis (or a shorter complete identity), preserving emoji/combining
  sequences. `By game` keeps its existing truncation path and now uses the
  same useful-prefix floor to avoid an ellipsis alone. Compact TypeBadge
  remains higher priority; unknown `?` reservation and truthful known/day
  deadline rules remain. Full accessible names/tooltips are unchanged.
- Actual 200%-root-text Chromium geometry exposed existing rem inline padding
  disagreeing with the fixed 8px pin/intersection, squeezing sticky tails to
  x=0. Inline bar padding now stays 8px; outer bar dimensions/date coordinates,
  M2 temporal preservation, scrolling, zoom and navigation are unchanged.
- Bun 1.3.14 frozen install, typecheck, ordinary full `bun test` and complete
  build pass: **1110 pass / 1 existing optional age skip / 0 fail**, 1111 tests
  across 56 files. Offline feed remains **179 events / 7 games / 1 existing
  NTE conflict**. No refresh, feed/data/ID, metadata, Account/Sync, filters,
  reset-clock, week-line, Event Detail or unrelated milestone change.
- New real Chromium 153 runner checks measured CSS payload/visible intersection:
  **35014 assertions**, 320/360/390/768/1440px, both modes/themes, 100%/200%
  text, 6/32/72/108px per day, now and known-end tail offsets. Long/short
  fallback and one/multiple subjects, custom game/event, conflict/urgency,
  exact/day/unknown and upcoming cases are covered. It observes 1194 truncated
  identities, 110 game-width reclamations, 372 full deadlines and 2104 tiny
  tails, checking containment, badge priority, useful text and no overlap.
- Existing Chromium suites also pass unchanged: M2 temporal viewport **372
  UTC + 372 America/New_York**; mobile header/filter **441**, including the
  built production bundle and actual AuthRoot guest bootstrap.
- Visually inspected screenshots and reproduction:
  [browser evidence](evidence/timeline-label-truncation/README.md). Automated
  Chromium evidence does not constitute Android hardware/PC operator acceptance.

- Delivery: [PR #46](https://github.com/maxvfk/game-calendar/pull/46); final
  hosted CI/merge/Pages and public-asset verification are recorded in that PR.

**Next concrete step:** after PR #46 delivery, operator Android Chrome/PC smoke: long labels and short
tails at several zooms in both modes, badge/indicator separation, full detail
names, and existing inspected-time behavior. Stop after this scope.


### Timeline label truncation — operator acceptance (2026-10-21)

- Current main implementation: [PR #46](https://github.com/maxvfk/game-calendar/pull/46), merged as `5a4f9a84020513891dd0429e0e0f1a7d5860ed6a`; hosted [main CI/Pages 39662911628](https://github.com/maxvfk/game-calendar/actions/runs/39662911628) succeeded.
- After the Work completed, the operator reported: **“я проверил, все работает нормально”**. Treat this as manual acceptance of the originally reported missing-name/truncation fix. The exact device, zoom and view matrix used for manual acceptance was not specified, so do not claim each was separately tested by the operator. Automated Chromium evidence remains recorded in the prior section.
- `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md` is now **complete / accepted**. No further label work scheduled. The separately tracked per-game Daily Reset **clock accuracy audit** (`docs/tasks/DAILY-RESET-CLOCK-AUDIT.md`) remains open; UI attribution being correct does not validate reset-hour configuration.
- **Next concrete step:** choose the next independent planned milestone (e.g. reset clock audit), starting from CURRENT main. Do not restart finished Timeline label or M2 work without a new reproduced defect.


### Daily Reset clock audit — seven-step research plan (2026-10-22; historical)

**Superseded planning checkpoint.** Execution mode and results are recorded in
“Daily Reset clock audit — seven-stage research completed” below; do not launch
seven ordinary chats or repeat completed research.

- Operator requested splitting the research into **seven focused steps, one
  currently shipped game per step**, instead of searching all seven in one
  chat. This is **ordinary Chat research**, not runtime implementation.
- Source-of-truth task `docs/tasks/DAILY-RESET-CLOCK-AUDIT.md` now defines
  priority order: **Endfield → NTE → CZN → Genshin → HSR → WuWa → ZZZ**.
  Each step checks its own authoritative reset clock, server groups, region
  mapping, UTC/DST, current-code discrepancies, source quality and stored
  `dayKey`/sync compatibility before proposing any change.
- Per-game evidence lives in `docs/research/daily-reset-clocks/<game>.md`;
  `docs/research/daily-reset-clocks.md` becomes the progressive comparison
  index. Each completed step can land in a small docs-only PR; step 7 also
  synthesizes all reports and a safe implementation proposal. Stop after one
  game each time; do not redo completed source research.
- **Current status: 0/7 games researched under this task.** No reset clocks,
  daily keys, user data or runtime source behavior changed by planning.
- **Next concrete step:** start an ordinary Chat with **step 1/7:
  Arknights: Endfield** using the parameterized prompt in the task. Review
  the sourced report, then decide when to start step 2. A game-specific
  screenshot of an incorrect countdown is valuable but not a prerequisite
  for researching supported official reset rules.


### Endfield Echoes of War — Phantasia cycle deadline visibility gap (2026-10-22)

- Operator supplied an in-game screenshot: `Сезон фантазий`
  14.10–05.11.2026, `Цикл фантазий`, countdown **9h08 to next cycle**.
  The upcoming cycle rotation is not visible in Game Calendar. The screenshot
  does not independently establish the exact UTC deadline or selected server
  group, and the account-identifying image was not committed to the public repo.
- Existing `docs/research/endfield-recurring-endgame.md` §16 already confirms
  that the current Phantasia cycle parser rejects the wiki's internally
  contradictory **western Cycle I start** and preserves fail-closed/LKG
  constraints. Endfield's **season end** remains a separate sourced event;
  the internal cycle transitions were intentionally withheld.
- This is a high-relevance **source-coverage/freshness gap**, not the
  Daily Reset daily-task clock audit and not a Timeline rendering regression.
  Do not treat UI changes or assumed 7-day repeats as a fix.
- Focused follow-up filed:
  `docs/tasks/ENDFIELD-ECHOES-PHANTASIA-CYCLE-COVERAGE.md`.
  **Documentation only** in this step; no parser, data, user settings,
  event IDs or source-health changes.
- **Next concrete step:** independently validate current official/in-game
  regional cycle boundaries and wiki source consistency, then specify the
  smallest safe source-driven fix (or explicitly retain the unresolved
  blocker). Do not begin this investigation automatically.


### Daily Reset research — one seven-stage Work approved (2026-10-22; historical)

**Plan executed.** See the completed 7/7 research section below for current
results and the next implementation boundary.

- Operator superseded the previously planned seven manually launched ordinary
  chats with **one Work session that automatically completes all seven
  research stages sequentially**, while preserving one independently sourced
  file/commit per game. Order unchanged: **Endfield → NTE → CZN → Genshin
  → HSR → WuWa → ZZZ**. No per-stage manual consent or new Work launch needed.
- `docs/tasks/DAILY-RESET-CLOCK-AUDIT.md` now defines this execution mode,
  shared evidence requirements, durable per-game checkpoints, cumulative
  `docs/research/daily-reset-clocks.md` and one final docs-only PR/merge.
  A partial PR is an acceptable honest checkpoint if time/context limits
  intervene; never claim missing research is complete.
- **Current research status: 0/7 reports on main at plan update.**
  Existing operator observation of suspect times remains unverified.
  This is scheduling/research only: no clock constant, persisted `dayKey`,
  Account Sync, event feed or Endfield Echoes endgame source has changed.
- **Next concrete step:** launch a single research-only Work from CURRENT
  main using the all-seven execution prompt; after the report PR, review
  supported corrections and authorize any runtime implementation separately.


### Daily Reset clock audit — seven-stage research completed (2026-10-22)

**Research complete: 7/7**, in one sequential Work, with one independent
report/commit per game. NTE's unresolved clock is an explicit evidence gap,
not an unfinished report. Baseline main:
`e05fa8b64262b35607a6296171604f6eb79fedea`.
Consolidated comparison, sources, source-access limits, DST examples and safe
implementation proposal: [daily-reset-clocks.md](research/daily-reset-clocks.md).

| Game | Result | Evidence report |
| --- | --- | --- |
| Endfield | Confirmed correct: Asia 20:00Z previous UTC date; Americas/Europe 09:00Z | [endfield](research/daily-reset-clocks/endfield.md) |
| NTE | Focused follow-up: no specific UTC error proved; Japanese 05:00 can match Asia 20:00Z; SEA 21:00Z is weekly evidence; core offsets/DST unresolved | [nte](research/daily-reset-clocks/nte.md) |
| CZN | **Confirmed error**: published daily 18:00Z versus app's regional 20:00/03:00/09:00Z | [czn](research/daily-reset-clocks/czn.md) |
| Genshin | Confirmed correct fixed regional 04:00 | [genshin](research/daily-reset-clocks/genshin.md) |
| HSR | Confirmed correct by converging sources; publisher-hosted/login and secondary task/regional evidence distinguished | [hsr](research/daily-reset-clocks/hsr.md) |
| WuWa | Supported correct; recent official sign-in clock and secondary regional/DST evidence; old conversion conflicts documented | [wuwa](research/daily-reset-clocks/wuwa.md) |
| ZZZ | Supported correct; official login clock plus independent daily-task/regional evidence; misleading source headings rejected | [zzz](research/daily-reset-clocks/zzz.md) |

- No runtime, reset constant, saved user data, Account Sync, event IDs, source
  ingestion, feed, Timeline or Endfield Echoes changes. Official URLs freshly
  checked; some primary pages only expose indexed text/JS shells, explicitly
  recorded. No authenticated game countdown was observed.
- CZN at Oct 22 12:00Z should next reset Oct 22 18:00Z; actual app nextResetMs
  returns Asia Oct 22 20:00Z, Europe Oct 23 03:00Z, America Oct 23 09:00Z.
  2/9/15h differences refer to that exact probe.
- A reset correction can alter dayKey/summary/streak interpretation without
  rewriting stored strings. Logs lack per-day completion instants/server/policy;
  Sync keys subject/day and edit timestamps cannot reconstruct those facts.
  Preserve historical claims; no bulk-shift/duplicate/delete migration.
  UTC-18:00 and KST-03:00 have the same instant but day labels differ by one:
  choose label/cutover semantics before a CZN runtime fix. Review shared
  dayStartMs/event-date and serverOffsetUtc consumers separately.
- Local checks on Bun 1.3.14: frozen install, typecheck, **1110 pass /
  1 optional age skip / 0 fail**, full build passed. Initial build needed a
  missing local bunx alias; fixed environment only. No source refresh.
  Existing build output: 176 events / 7 games / 1 existing conflict; this is
  validation of unchanged runtime, not new event research.
- All seven research checkpoints are saved in GitHub. One final docs-only PR
  carries hosted-CI/merge evidence in its description; no runtime deploy claim.

**Next concrete step:** prepare a separately authorized CZN-only clock-fix task
that decides game-day labels and a safe forward transition, preserves IDs/history,
and covers legacy import, two-device/offline Sync plus daily helper boundaries.
Keep NTE's permanent-task/server/DST verification as an explicit independent
evidence gap. Do not repeat the five other game reports or start another milestone.


### Event start/end precision audit — research complete (2026-10-22)

- Full bounded audit of the eight active adapters, seven reviewed files,
  recurring paths, precision schema, merge and display/expiry behavior completed.
  [Detailed report](research/event-time-precision-audit.md) includes the
  seven-game matrix, immutable evidence URLs, classifications and UTC mappings.
- Baseline `581d36f`; delivery rebased onto CURRENT main `6afe31b`,
  preserving #55 NTE Daily Reset follow-up. No audited runtime/data differences.
- **CZN Sereniel/Peko historical exact end confirmed:** official event schedule
  plus Oct 21 maintenance establishes **00:00 UTC**, not a generic ISO-midnight
  inference. Historical capture agrees; both cards have left today's feed.
  Generic Prydwen downgrade remains justified by real 07:00/00:01 conflicts.
- **Confirmed current CZN gaps:** Nine/Alcea Oct 13–Nov 3 18:00Z and announced
  Tiphera/Tiana Nov 3–24 18:00Z publish day/day. Rossweisse/Sig's actual Oct 21
  05:00Z opening is day; Dec 2 end remains day pending its maintenance notice.
  Historical Olga trial's Sep 30 end can separately gain verified precision;
  other old rows are not blanket-approved.
- **Genshin:** current Phase II character banners have independently supported
  14:59 server ends (Nov 3 06:59Z Asia / 13:59Z Europe / 19:59Z America), but
  publish day/day. Bounded official/mirror synthesis is recorded explicitly;
  no universal `t_lc/t_gl` contract is claimed.
- HSR/WuWa/ZZZ day starts often represent regional or after-update openings;
  schema lacks regionStarts. NTE server-time periods lack a verified UTC mapping.
  Endfield ordinary exact ends preserved; Phantasia stays separate. No new
  same-ID reviewed override suppression or other-game end defect was established.
- Prepared two unexecuted, separate tasks:
  [CZN verified banners](tasks/CZN-VERIFIED-BANNER-TIME-PRECISION.md) and
  [Genshin Phase II ends](tasks/GENSHIN-PHASE-II-VERIFIED-END-PRECISION.md).
  They use existing reviewed enrichment, stable IDs and official provenance;
  no automatic timestamp-trust or source-health relaxation.
- Local Bun 1.3.14 frozen install/typecheck/build passed; final suite
  **1110 pass / 1 existing optional age skip / 0 fail**, 1111 tests / 56 files.
  Initial eight failures were missing local Gitea baseline files, resolved by
  retrieving them unchanged. Build **176 records / 7 games / 1 existing NTE
  conflict**. Public feed generated 11:30:52Z matches all local IDs and time
  boundaries. No network Refresh, browser smoke or live correction claimed.
- Research task/backlog updated. Delivery is docs-only; hosted CI and merge/main
  evidence recorded in the PR. No runtime, parser, snapshot, reviewed JSON,
  published dates/IDs, completion data, Account Sync or Daily Reset change.

**Next concrete step:** separately execute the CZN reviewed-precision task,
then the independent two-row Genshin end task. Keep uncertain tag/region mappings
as evidence gaps; no implementation or other milestone started here.


### Phantasia cycle coverage — focused research completed (2026-10-22)

Docs-only investigation from CURRENT main `0c33ca534c01d6522300c7c6ba0f716502a70b4f`.
Before delivery, rebased onto `60ab1a5` (concurrent precision-audit planning
PR #53); preserved that separate task/status section in full.
Full evidence, response hashes, UTC conversions, precision limits and alternatives:
[endfield-recurring-endgame.md §17](research/endfield-recurring-endgame.md#17-phantasia-cycle-coverage-investigation--2026-10-22).
Prior general research and §16 historical findings are preserved.

- Latest actual [Refresh 39762240523](https://github.com/maxvfk/game-calendar/actions/runs/39762240523),
  Oct 22 10:19Z: 15 consecutive rejected HTTP-200 cycle responses; 7/8 confirmed,
  1 ongoing broken, 0 newly broken. Workflow success is alert dedup, not recovery.
  Illusion LKG remains unchanged; build-feed withholds it for Phantasia by URL.
  Deployed feed at 10:52:41Z has 176 events / 7 games, season `challenge` row
  present, no Phantasia cycles; cycle source is unavailable, not falsely fresh.
- Fresh current wiki reproduces the precise western start mismatch. Official
  version notes 9560 and the visually read official @AKEndfield infographic
  independently confirm cycle ends Oct 22 / Oct 29 03:59 and season end Nov 5
  11:59, with next cycle starts Oct 22 / Oct 29 04:00, fixed UTC+8 / UTC−5.
- **Cause established:** wiki western header differs by a day from the official
  planned Oct 14 23:00 opening; generic first table start also wrongly asserts
  Oct 15 12:00 server time for the west. Parser correctly rejects its explicit
  inconsistent input. Editorial intent and actual maintenance reopening minute
  remain unverified; no parser clipping or timezone special case is justified.
  Operator 14.10 start agrees with western planned date, but 9h08 lacks capture
  clock/server context and cannot independently establish a UTC deadline.
- **Safe proposal:** existing reviewed channel, official provenance, day-precision
  canonical starts, two sourced internal cycle deadline rows, no duplicate
  Cycle III. Upcoming Cycle II end: Oct 28 19:59Z Asia / Oct 29 08:59Z west;
  following opening one minute later. Leave automatic source broken/LKG intact.
- Separate concrete task prepared:
  [ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md](tasks/ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md).
  Original research task marked complete. **No implementation started:** no
  runtime/parser/source/snapshot/reviewed/feed/ID change, no Daily Reset,
  Account Sync or Timeline UI scope. Future task includes stable identities,
  regional expiry/filter/sort, automatic recovery/dedup and disagreement tests.
- Local Bun 1.3.14 frozen install/typecheck/full build pass; **1110 pass /
  1 existing optional age skip / 0 fail**, 1111 tests across 56 files.
  Build 176 events / 7 games / 1 existing NTE conflict. Fresh live-source parser
  rejection reproduced separately. Hosted CI/merge evidence belongs to the
  docs delivery PR; no live coverage repair is claimed.

**Next concrete step:** separately authorize the reviewed-data task, recheck
its official evidence and publish only the bounded cycle deadlines. Automatic
wiki recovery still requires explicit consistent upstream regional opening data.
Do not repeat this research or begin the repair automatically.


### NTE permanent daily reset — focused follow-up completed (2026-10-22)

Docs-only continuation from CURRENT main `581d36f25e05dcfebc726ca07118492bd2cd9bd5`.
[Full evidence and observation gate](research/daily-reset-clocks/nte.md#focused-follow-up--2026-10-22);
[updated seven-game index](research/daily-reset-clocks.md). The other six reports
were not researched again; concurrent precision/Phantasia documentation is preserved.

- New Japanese sources explicitly concern permanent Exploration Guide tasks,
  not event quests. Local 05:00 JST/KST would equal the app's Asia 20:00Z;
  language/residence does not prove selected server. This narrows the apparent
  04:00/05:00 contradiction without certifying the server's clock offset.
- Original SEA testimony explicitly reports 05:00 UTC+8 (21:00Z), but its
  directly observed system is weekly City Stamina. SEA's distinct server is
  official; a distinct permanent Guide clock remains a hypothesis. No SEA
  selector exists today; neither aliasing it to Asia nor adding a clock is
  justified by the current permanent-task evidence.
- EU 03:00Z and NA 09:00Z provisional player claims agree with current outputs
  for the reported period. No official all-region core clock/DST rule or
  server-verified absolute-UTC Guide rollover capture was found. Publication
  timestamps, relative Reddit ages and event reset rules do not fill that gap.
- Required next evidence: selected-server + UTC-clock + Guide countdown and
  actual rollover on all four servers; compare Asia/SEA 20:00Z versus 21:00Z;
  paired EU/US observations across the first production autumn transitions.
- **Concrete NTE clock error: not confirmed. Clock implementation Work: evidence
  insufficient.** No runtime/reset-hour/dayKey/data/Account Sync changes or
  migration. Historical day strings must remain intact if a future correction
  is independently established; edit timestamps cannot safely retime marks.
- Bun 1.3.14 frozen install/typecheck/build passed; **1110 pass / 1 existing
  optional age skip / 0 fail**. NTE-only current-helper/boundary/Intl probes
  passed. Hosted CI and merge evidence belongs to the docs-only delivery PR.

**Next concrete NTE step:** collect the specifically missing in-game observations
or publisher clarification. Do not implement a universal 05:00 override, infer
DST from summer wall time, or repeat the completed seven-game audit.


### Sequential implementation Work — verified data corrections queued (2026-10-22)

- Operator authorized preparing **one sequential Work** for the independently
  researched repairs rather than manually launching each implementation:
  1. Endfield Phantasia official reviewed Cycle I/II deadlines;
  2. six CZN verified banner time-precision rows;
  3. two Genshin Phase II regional exact-end rows;
  4. CZN fixed **18:00 UTC** daily reset **only if** a complete forward-only
     dayKey/history/import/two-device/offline Sync compatibility design is
     proven, implemented and tested. If not, deliver a design/blocked task,
     with no unsafe CZN clock change.
- Execution contract is `docs/tasks/VERIFIED-DATA-CORRECTIONS-SEQUENTIAL.md`.
  One session, **new short-lived branch and PR per milestone**, full four
  `AGENTS.md` gates and deployed-feed validation, start each independent next
  step from the newly merged CURRENT main. No need for seven-game re-research,
  broad parser rewrites or automatic Astra launch.
- **Planning only at this checkpoint.** No reviewed event data, reset helpers,
  personal data, source-health, CI behavior or sync code changed. Earlier
  research-completed implementation tasks remain the acceptance criteria
  for stages 1–3, not evidence that repairs have shipped.
- **Next concrete step:** launch one Work using this orchestration task;
  review which production corrections actually deployed, the step 4 safety
  decision and the operator's final mobile/PC smoke results.
