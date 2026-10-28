# Zenless Zone Zero — Source and Event Coverage Audit (2026-10-28)

**Status:** RESEARCH-ONLY; NO IMPLEMENTATION. **Baseline:** `main` `6bc769c50f5e`; after ZZZ PRs #105/#107/#109/#111/#112 and previous HSR/Genshin/WuWa/Endfield coverage audits.
**Scope:** official Version 3.3 “Journey to the Sky” (Oct 21–Dec 2), active/upcoming dated Signal Search channels, login/limited events, season reward expiration and recurring endgame. Does NOT re-run already completed ZZZ runner source-gate or recurrence-anchor research. Not a completeness claim for every marketing/store offer, independent promo, web event or eventual 3.4 notice.

## Executive verdict

**Current core gameplay coverage: PASS for explicitly announced Version 3.3 update events and current Phase I banners. Full deadline/source-family coverage: PARTIAL.**

Unlike the previous four game audits, the recent recovery has delivered genuinely working and separately bounded source families:

- **Official publisher Steam RSS** `zzz-steam-events-official`, 10 actual posts / four Version 3.0–3.3 updates; cached `eventCount=43` (twelve 3.0, twelve 3.1, eleven 3.2, **eight 3.3**); last confirmed 2026-10-27T21:23:33.090Z.
- **Zenless.gg Updates RSS** `zzz-zenlessgg-banners`, secondary factual notice reproduction; 20 channel records from historically indexed dated notices including **all four 3.3 Phase I**; last confirmed 2026-10-27T21:23:32.949Z; factual JSON captured from 199,444-byte RSS, not a complete stored publisher article.
- **Thirty reviewed ZZZ rows**, including the eight Version 3.3 events, all four Phase I channels, and the documented The Final Callback Audition Stage, plus earlier history.
- **Shiyu Defense: Critical Node and Deadly Assault** independently re-anchored 14-day `estimated` schedule rules in `src/ingest/recurring-endgame.ts`; start generating from 2026-10-16 / 2026-10-23 respectively (PR #111). Do not relabel future projections `official` or redo this work without observed conflicting dates.

`test/zzz-steam-rss.test.ts` validates 43 source candidates merging with 30 reviewed into 54 unique winners, including eight equal current update rows; `test/zzz-banner-rss.test.ts` validates 20 banner candidates, correct four 3.3 I channels and no reviewed conflicts; `test/zzz-endgame-reanchoring.test.ts` verifies 12 bounded ZZZ cycles for a fixed Oct 27 clock. **78** total merged ZZZ rows were documented in the Oct 27 recovery; this audit did **not** independently download the deployed live JSON or execute a fresh full feed replay. Source candidate counts and materialized winners are NOT interchangeable.

**Confirmed remaining omissions are OUTSIDE the Steam adapter's deliberately narrow `New Events` section:**
1. Version 3.3 **New Eridu City Fund** (battle-pass main reward window and separately **one-hour-earlier paid purchase cutoff**).
2. Version 3.3 **issue-fix compensation** claim ending **Nov 20 23:59 UTC+8**.
3. Version-linked **Limited Spookies** redemption cutoff (and some shop promotions): official announcement names a version-end expiry, but these families need explicit calendar/product-scope decisions.

**3.3 Phase II is a WATCH / upstream publication dependency, not a proven missing event at this date.** Oct 9 HoYoverse press confirms Severian is a Phase II S-Rank; independent calendars list Severian/Norma and W-Engine channels with inferred windows, but no first-party *separately dated 3.3 Phase II channel notice* was established in the verified live 40-item Zenless.gg Updates RSS or captured official Steam RSS as of Oct 28. Do not synthesize exact Nov 11/Dec 1 starts/ends, names or channels from a generic 21-day cadence; wait for the dated official notice. R2/R3 source recovery should not be invoked solely because the publisher has not yet released it.

## Verified baseline and explicit evidence limits

Reviewed CURRENT `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`, earlier `docs/research/coverage-zzz.md`, `docs/research/zzz-source-recovery-p0.md`, `docs/research/zzz-banner-source-recovery-b1.md`, `docs/research/zzz-endgame-reanchoring-2026.md`, `docs/evidence/zzz-steam-events-recovery.md`, actual `data/reviewed/zzz.json`, both production parsers/adapters, meta and stored raw Steam/factual Zenless.gg snapshots, and three targeted regression suites. Cross-checked current official October 2026 publications via indexed publisher/Steam notices.

- `zzz-steam-events-official.meta.json`: `eventCount:43`, `contentChangedAt/lastConfirmedAt:2026-10-27T21:23:33Z`. Ten publication items, including one complete **Version 3.3 Update Announcement** with a `6. New Events` section containing exactly eight dated activities; all are present as reviewed entries and supported by the parser.
- `zzz-zenlessgg-banners.meta.json`: `eventCount:20`, `contentChangedAt:2026-10-27T13:30:35Z`, `lastConfirmedAt:2026-10-27T21:23:32Z`; the only stored 3.3 dated channel notice is Phase I `https://zenless.gg/v3-3-limited-time-channels-phase-i/`. Four channels match all four 3.3 reviewed titles/date windows after materialization; existing regression explicitly checks identical stable IDs and zero conflicts.
- Both sources are already production-validated on GitHub runners. Direct HoYo HoYoLAB pages remain unavailable as machine-readable HTML in prior runner Gate A; official Steam contains update events, NOT separate channel/City Fund notices; Zenless.gg is a secondary feed, NOT official provenance. Do not repeat inaccessible official source research from #107/B1 absent new symptoms or evidence.
- Event end `server time` uses static Asia UTC+8 / Europe UTC+1 / America UTC-5 (three different UTC instants). A version end explicitly labelled `UTC+8` is a single global UTC instant. DO NOT apply user's Amsterdam timezone/DST to game server clocks.
- Latest source meta checks are Oct 27; the scheduled main `refresh.yml` runs at 05:27 and 17:27 UTC. **This audit did not independently confirm an Oct 28 scheduled refresh occurrence**; source metadata freshness and workflow liveness must be assessed separately when needed.
- No fresh Github-hosted source probe, raw HTML access bypass, current deployed `events.v1.json` fetch, in-game timer observation or local tests run *for this audit*. Previously recorded CI/runner tests are cited as previous evidence, not repeated claims.

## Coverage matrix: current 3.3 core

| Family / event | Official period / source | Status in current repo | Priority |
|---|---|---|---|
| **Into the Flames of Life** (Phoenix Agent) | Oct 21 after update → Nov 11 **11:59 server**; official Phase I notice `/166926` | **COVERED reviewed + secondary RSS** | Keep |
| **Plume of Rebirth** (Phoenix W-Engine) | Same Phase I period | **COVERED** | Keep |
| **Graceful Gale** (Velina rerun) | Same Phase I period | **COVERED** | Keep |
| **Joyau Dore** (Velina W-Engine) | Same Phase I period | **COVERED** | Keep |
| **The Final Callback — Audition Stage** | Oct 21 after update → Nov 11 **11:59 server**, official Phase I notice | **COVERED reviewed**; banner RSS correctly does not synthesize it | Keep |
| **All-New Program** | After update → Dec 1 **03:59 server** | **COVERED reviewed/Steam** | Keep |
| **Spooky Funhouse Tales** | Oct 22 10:00 → Nov 30 **03:59 server** | **COVERED** | Keep |
| **Cyber Miracle Healer, on Duty!** | Oct 28 10:00 → Nov 16 **03:59 server** | **COVERED**, starts today | Keep |
| **Advanced Bounty: Area Patrol** | Nov 4 04:00 → Nov 9 **03:59 server** | **COVERED** | Keep |
| **“En-Nah” Into Your Lap** | Nov 11 10:00 → Dec 1 **03:59 server** | **COVERED** | Keep |
| **Trails of the Hobbling Crow** | Nov 11 10:00 → Nov 30 **03:59 server** | **COVERED** | Keep |
| **Repair! Drifting Art** | Nov 16 10:00 → Nov 30 **03:59 server** | **COVERED** | Keep |
| **Data Bounty: Combat Simulation** | Nov 25 04:00 → Nov 30 **03:59 server** | **COVERED** | Keep |
| **Angels Support Operation** (continuing 3.2 → 3.3) | After 3.2 update → Nov 30 **03:59 server**, official `/165980` | **COVERED** legacy reviewed, limited outfit reward | Keep |
| **Shiyu Defense: Critical Node** | independently corroborated Oct 16–30; generated next from Oct 30, 14-day, server 04:00 reset | **COVERED estimated** | Monitor only for new conflicting official evidence |
| **Deadly Assault** | Oct 23–Nov 6; 14-day estimated cadence | **COVERED estimated** | Monitor only |
| **3.3 Phase II character/W-Engine channels** | Publisher preview announces Severian later in version. Actual separate dated Phase II notice not in Oct 27 mirror factual snapshot, and not in Steam update posts | **WATCH, not a confirmed missing officially dated event** | After publisher announces full windows, insist on complete Agent/W-Engine set; no phase-length guessing |

Official complete in-game events: https://zenless.hoyoverse.com/en-us/news/166963 ; official Phase I channels/audition: https://zenless.hoyoverse.com/en-us/news/166926 ; official Angels event: https://zenless.hoyoverse.com/en-us/news/165980 .

## Confirmed missing deadlines outside default event adapter

### Z1: New Eridu City Fund 3.3 (separate first-party publication)

Official: https://zenless.hoyoverse.com/en-us/news/166944 (Oct 20).
- Main pass period: **after Version 3.3 update → Nov 30 03:59 server local**.
- Purchase / upgrade of Growth/Premium plans closes **Nov 30 02:59 server local**, exactly **one hour earlier**.
- A time-limited Great Builder's Certificate also expires in the current City Fund period; avoid inventing a third distinct minute if the notice does not state one.

Exact clock examples (main reward end):
- Asia **2026-11-29T19:59:00Z**
- Europe **2026-11-30T02:59:00Z**
- America **2026-11-30T08:59:00Z**

Purchase cutoff one hour earlier:
- Asia `2026-11-29T18:59:00Z`; Europe `2026-11-30T01:59:00Z`; America `2026-11-30T07:59:00Z`.

The 30 reviewed rows have no current 3.3 City Fund row; `zzz-steam-rss.ts` intentionally parses only the `6. New Events` section and official Steam RSS has no separate City Fund post. The Zenless.gg **Updates RSS does index the City Fund notice**, but the **banner adapter deliberately ignores all non-Channel notices**. This is **source-family extraction/scope**, not source failure. A narrow opt-in separate source lane or reviewed record is needed; don't extend the banner parser into a generic unbounded prose crawler. Mark paid purchase cutoff as a distinct *optional* product decision.

### Z2: fixed-date free issue-fix compensation deadline

Official 3.3 update: https://zenless.hoyoverse.com/en-us/news/166963 , Compensation Details section:
- **Nov 20 23:59 (UTC+8) = 2026-11-20T15:59:00Z** fixed worldwide.
- The 300 Polychrome claim is conditioned on eligibility before the 3.3 maintenance. Separately, mail can expire 30 days after issue; do not fabricate individual mail-delivery/deletion dates from a global statement.
- The *server-update* 300 Polychrome compensation is a different benefit; official text ties its claim to version end **Dec 2 06:00 UTC+8 = 2026-12-01T22:00:00Z**. Avoid combining the two separate compensation deadlines.
- No reviewed entry exists for either claim cutoff; the Steam parser is deliberately bounded to `6. New Events`, so it does not convert the compensation paragraph into a calendar row.
- This is a **P1/P2 free reward reminder**, depending on whether one-off mail/reward expiry is within the project's approved categories.

### Z3: Enigma of the Labyrinth Limited Spookies redemption (version-linked)

Official 3.3 update says limited items in Boojee's Store will be **available only during Version 3.3**. The same update explicitly fixes the version end **2026-12-02 06:00 (UTC+8)**, so a reminder could carry a *derived-from-version-boundary* cutoff `2026-12-01T22:00Z`, clearly distinguishing it from a separately dated exact shop notice. No independently stated per-shop last minute was verified. The "Spooky Trial" content also includes seasonal Safe capacity increases that reset in 3.4; this is another version-scoped state change, not a separately sourced recurring endgame cadence.

Treat as **P2 / product-scope decision**, not proof of an immediate gameplay event missing from `New Events`. No unsupported end for player-owned permanent items or decorations.

### Z4: Store-only discounts and bundle windows

Official https://zenless.hoyoverse.com/en-us/news/166927 states the limited-time Phoenix outfit set, two discounts and some bundles last through **Dec 2 05:59 UTC+8** (`2026-12-01T21:59Z`). The underlying individual outfits remain permanently purchasable at standard price. This is a **P2 or EXCLUDE** operator product decision; a calendar entry must describe the *discount/bundle* expiring, not misrepresent a permanent outfit as disappearing. The source is an independent official notice outside the current Steam update parser; Zenless.gg Updates RSS can discover it but existing banner parser does not process store notices.

## Source completeness diagnosis

| Layer | Proven working | Residual blind spot |
|---|---|---|
| Availability | Steam and Zenless.gg previously passed actual GitHub-hosted robots/normal-UA checks and successful production snapshots; source meta refreshed Oct 27 | Direct HoYo HTML still 200 JS shell on Actions and cannot be treated as automatic current discovery |
| Source index | Steam covers **full version update** prose; Zenless.gg Updates RSS includes separately issued City Fund, store and Phase I channel notices | Steam RSS is not an individual Phase II/City Fund publisher notice feed; Zenless.gg is secondary and may be delayed or truncated |
| Extraction | Steam parses eight official 3.3 `New Events` precisely; banner RSS parses four 3.3 Phase I channels; reviewed trial is correct | Compensation, City Fund, shop, seasonal reward cutoff are **outside deliberately selected families**; do not call them parser regressions |
| Reviewed | 30 reviewed IDs and superior official precedence; current Phase I fully checked | No 3.3 City Fund or mail compensation expiry; don't mutate unrelated old IDs |
| Endgame | Shiyu and Deadly Assault rules reanchored and test protected | Estimated future projections should be checked when official phase changes; no automatic 'official' upgrade |
| Coverage Health | Nonzero 43/20 source parse and ordinary health guardrails | Source-health green can coexist with untracked free reward deadlines; no independent proof that Phase II note has been published |

## Recommended next milestones (separate authorization)

**ZC1 — bounded reward-deadline repair**: first include the **free Nov 20 compensation claim** with correct `UTC+8` fixed global boundary, and **City Fund Nov 30 reward deadline** with exact three-region ends; make the **Nov 30 02:59 paid purchase** subdeadline an explicit small product decision. Preserve new stable IDs and all 30 reviewed existing IDs, source-checked date/precision and distinct compensation eligibility. Prefer reviewed-data hotfix if no supported official unattended source family can publish them reliably. No scope expansion to every promotion.

**ZC2 — 3.3 Phase II conditional coverage gate**: monitor for the first *published separate dated* official Phase II channel notice; verify all named Agent/W-Engine channels, real source URL and per-region times before source publication. Existing Zenless.gg RSS adapter can handle new explicit Phase II pages without code changes if its notice structure is intact. No inferred 21-day windows or premature blocker incident. If the official announcement is released and the secondary RSS omits it, classify as **discovery/index coverage gap**, not generic HTTP outage.

**ZC3 — optional season and shop reminders**: decide whether Limited Spookies/season resets and paid cosmetic/store promos fall inside Calendar. If yes, add purpose-specific dated records with official-vs-derived label; prevent double counting with general version-end record. No automatic assumption of time-limited rewards based solely on permanent-shop language.

**ZC4 — Source Recovery R1 future test**: per-family contracts for `(zzz,official update events)`, `(zzz,Agent phase)`, `(zzz,W-Engine phase)`, `(zzz,trial)`, `(zzz,Shiyu/Deadly cycle)`, `(zzz,approved claim deadlines)`. A fully healthy 43-event Steam update + 20 Zenless.gg banner extract with **missing BP/compensation** should yield a *coverage task for an approved family*, not Source Health outage. An unannounced Phase II must be `watch` and no synthetic event. After independently verified Phase II official notice, missing all four channels may escalate. Also watch workflow schedule itself; do not infer it ran from fresh CI.

## Limits and handoff

- This was an audit of current main + checked source snapshots/parsers and official indexed publisher notices, not code implementation, additional runner access-gate probe or a new live Pages smoke test.
- **Do not claim direct verification of Oct 28 scheduled source refresh:** the latest checked source metadata is Oct 27. GitHub's most recent general Actions entries are CI runs; they are not the refresh workflow log.
- **No new tool access, credentials, workflow/runs, runtime, reviewed data, snapshots or production feed changes.** This report and the associated implementation-status update are docs-only.
- Preserve prior ZZZ #105/#107/#109/#111/#112 decisions, source/merge/test outcomes and separate Source Recovery design PR #113 / Timeline PR #115.

**Next concrete step:** continue the remaining two research-only game audits (NTE and CZN), or independently authorize narrow **ZC1** to restore currently omitted compensation and City Fund deadlines. Do not implement ZC1/ZC2 automatically as a result of this audit.
