# Neverness to Everness — Source and Event Coverage Audit (2026-10-28)

**Status:** RESEARCH-ONLY, NO IMPLEMENTATION. **Baseline:** current `main` `9bb8369ba85a`.
**Scope:** NTE Global Version 1.4 *For Whom the Verses Mourn*, Sept 30–Nov 11 official schedule, current Phase II and near-future reward deadlines; adjacent Beyond the Rails cycle and official source completeness. Not a comprehensive historical sweep or commitment to cover paid/cosmetic offers.
**Previously completed research:** `docs/NTE-STEAM.md`, `docs/research/nte-recurring-endgame.md`, the documented September 1.3 Circle Bounty conflict, actual NTEBuild source tests. Do not repeat those investigations or relabel their findings.

## Executive verdict

**CORE EVENT COVERAGE: FAIL. Transport and automatic parser are healthy but the largest 1.4 publisher update/schedule is silently SKIPPED.** This is a deterministic source-coverage defect rather than lack of accessible official news.

- `nte-steamnews-official`: the exact approved public Steam GetNewsForApp/v2 API has a real stored current snapshot of **29 news posts** (through Oct 23), `lastConfirmedAt=2026-10-27T21:23:39.788Z`, `contentChangedAt=2026-10-23T10:14:29.735Z`, **49 parsed candidates** across old and current notices. These are NOT 49 currently active events or unique published feed winners.
- `nte-ntebuild-btr`: a different, secondary HTML JSON-LD source, latest snapshot `contentChangedAt=2026-10-24T09:38:04.926Z`, confirmed 2026-10-27T21:23:38.681Z, **2 current/upcoming BTR cycles**. See below.
- `data/reviewed/nte.json` has **15** official reviewed rows. They cover old Version 1.3 and September events; NONE of these rows starts in 1.4 on or after September 30. Reviewed is not a fallback for current 1.4 missing periods.
- The Steam API snapshot ALREADY includes publisher announcement `gid=1844751498233952`, title **`Log in to NTE's new version for Solid Dice x20, a limited frame, and more!`**, published September 29, with an 18,000-byte 1.4 release notice containing Circle Gifts, Phase I four banner/Arc channels, Pukaland Travelogue, Terminal Depths, Coal Lump, Circle Bounty, web invite and more. **`src/ingest/parsers/nte-steamnews.ts` drops the entire publication** because `candidates()` only admits a title matching `maintenance notice|patch notes|update|limited board|limited arc|arc research|limited-time event|login|check-in|gameplay guide`; `Log in` (two words) is NOT `login` and the actual title contains no other accepted keyword.
- Current **Oct 21** Steam maintenance notice `gid=1846651706693892` DOES pass the gate and includes dated Akane `Dazzling Star` / `Far Side of the Moon`, plus `Snap! Golden Crackshot`, `Puka Lucky Flip`, `Gold Clash`. Separate `Dazzling Star` announcement `1847286114027833` is also supported. This partial success is exactly why Source Health eventCount 49 can mask missing current 1.4 families.
- Two independent standalone event articles `Coal Lump's Treasure` (`1846018067935498`) and `Pukaland Travelogue` (`1845383656388326`) have *yearless* standalone `October 8 – November 11` / `September 30 – November 11` periods. Current parser intentionally refuses yearless exact extraction rather than inventing 2026; the suppressed full 1.4 launch post contains independently dated 2026 version context. Don't remove the year guard globally. Support version-scoped evidence, not current clock guesses.
- An official first-party published **Version 1.4 patch** contains the same schedule (https://nte.perfectworld.com/en/article/news/gamenews/20260929/264409.html). Official **Oct 21 update** https://nte.perfectworld.com/en/article/news/gamenews/20261019/264675.html explicitly confirms second-half details. These URLs are corroboration; Steam remains the actual registered extraction source, not a source falsely claimed to have Actions runner HTML access.

## Source-vs-output matrix

**COVERED BY IMPLEMENTATION** is based on checked-in source content/parser and code/tests, NOT directly downloaded live `events.v1.json`. **MISSING** means no matching reviewed row and no supported parser candidate after actual title/section/date gating. **PARTIAL/SCOPE** identifies uncertain exact clock/product inclusion. A snapshot `eventCount` is not an independent assertion of a specific winner.

| Family or event | First-party 1.4 window (UTC+8 unless marked otherwise) | Audit status / evidence | Priority |
|---|---|---|---|
| **Dazzling Star — Akane Rin** (Phase II character) | Oct 21 after update → Nov 11 **05:59 UTC+8** | **COVERED BY PARSER**; dated standalone `1847286114027833`, maintenance `1846651706693892` | Keep title, exact global end |
| **Far Side of the Moon — Celestial Special Arc Research** | Oct 21 after update → Nov 11 **05:59 UTC+8** | **COVERED BY PARSER** Oct 21 article | Keep distinct Arc channel |
| **Snap! Golden Crackshot** | Oct 21 after update → Nov 11 **05:59 UTC+8** | **COVERED BY PARSER** Oct 21 | Keep |
| **Puka Lucky Flip** | Oct 29 **05:00 server time** → Nov 11 **05:59 server time** | **COVERED AT DAY PRECISION** by current parser; time-zone deliberately unresolved | P2 clock review; DON'T force UTC+8 on `server time` |
| **Gold Clash** (double Fons) | Oct 26 **05:00 server time** → Nov 9 **04:59 server time** | **COVERED AT DAY PRECISION** by current parser | P2 precision/region gate |
| **Circle Gifts 1.4** (7-day login, 10 Solid Dice) | Sept 30 after update → Nov 11 **05:59 UTC+8** | **MISSING**; skipped Sept 29 publisher release post | **P1** free login deadline |
| **Terminal Depths** | Sept 30 after update → Nov 11 **05:59 UTC+8** | **MISSING**; same skipped official post | **P1** reward-limited challenge |
| **Pukaland Travelogue** | Sept 30 after update → Nov 11 **05:59 UTC+8** | **MISSING**; standalone publication lacks year, full 1.4 update skipped | **P1** current rewards |
| **Coal Lump's Treasure** | Oct 8 **10:00** → Nov 11 **05:59 UTC+8** | **MISSING**; current standalone has no literal year, 1.4 main notice skipped | **P1** event/shop deadline |
| **Circle Bounty 1.4** (rank/pass rewards) | Sept 30 after update → **Nov 10 23:59 UTC+8** | **MISSING**; heading `Version 1.4 "Circle Bounty" Guide` within skipped full notice | **P1** distinct earlier deadline; 6 hours before common Nov 11 05:59 end |
| **Blackbird's Invitation** (web reward / referral) | Sept 30 11:00 → Nov 11 **05:59 UTC+8**, notice says rewards cannot be claimed afterward | **MISSING / WEB SCOPE**; skipped full notice | P1/P2 with explicit approval of web rewards |
| **Born to Race / Everdriving** (Porsche limited Mystery Boxes) | Sept 30 after update → Nov 11 **05:59 UTC+8** | **MISSING / COLLAb SCOPE**, both have known expiration | P2/choice: limited paid/RNG cosmetic; no false disappearance of permanent Porsche Club perks |
| **Stamina Recharge** (double city stamina) | Oct 5 05:00 → Oct 19 04:59 **server time** | **MISSING HISTORICAL**; skipped full notice | P2 for backfill; no fabricated precise UTC |
| **Pixel Surge** (double character pixels) | Oct 19 05:00 → Oct 26 04:59 **server time** | **MISSING HISTORICAL**; skipped full notice | P2 |
| **Foretold Finale — Blackbird** (Phase I) | Sept 30 after update → Oct 21 **05:59 UTC+8** | **COVERED BY PARSER** from independently indexed standalone `1845383656380024` | Preserve historical ID |
| **Fading Reverie — Lacrimosa rerun** | Sept 30 after update → Oct 21 **05:59 UTC+8** | **MISSING HISTORICAL**, only in skipped full post | P2 historical banner fix |
| **Crime and Punishment / The Last Rose** (two Phase I Arcs) | Sept 30 after update → Oct 21 **05:59 UTC+8** | **MISSING HISTORICAL**, only in skipped full post | P2 archive and distinct Arc IDs |
| **Beyond the Rails: Lucent Circle** | Oct 22 05:00 → Nov 5 04:59 **UTC+8** | **COVERED** by current `nte-ntebuild-btr` JSON-LD (Oct 22–Nov 5) with project’s reviewed 14-day exact conversion | Preserve stable cycle ID/provenance estimated |
| **Beyond the Rails: Glinting Circle** | Nov 5 05:00 → Nov 19 04:59 **UTC+8** | **COVERED** by current NTEBuild JSON-LD, unlike a generic end-of-version extrapolation | Preserve and watch future source disagreement |
| **Pukaland Fest Special Gift Pack** Oct 21 mail | After Oct 21 maintenance: Akane `House Special` + Fons 2M; eligibility before version end | **MISSING / CLAIM UNKNOWN**; no distinct verified per-mail expiration instant | P2/operator scope, do not invent mail lifetime |
| **Blackbird `Wandering Stars`, Akane `Cozy Velvet` / `Full Metal Rock` outfit discounts** | published discount periods end Nov 11 **05:59 UTC+8** | **MISSING / SHOP SCOPE**; outfits remain purchasable after discounts (where indicated) | P2 optional; track discount only |
| **NTE Version 1.5 preview special program** | Scheduled Oct 28 **19:30 UTC+8** (11:30Z), explicit preview announcement in current Steam snapshot `1847286114035705` | **EXCLUDED INTENTIONALLY** by teaser/preview filter, not loss of a limited gameplay deadline | SCOPE: only if livestreams are explicitly a Calendar family |
| **Version 1.5 future banners** | No confirmed version release date or exact channels in current first-party material checked as of Oct 28 | **WATCH, NOT A MISSING PUBLISHED SCHEDULE** | No extrapolation from Oct 21/Nov 11 |

**Fixed-UTC conversion (no client timezone):**
- Common NTE 1.4 cutoff **2026-11-11 05:59 UTC+8** = **2026-11-10T21:59:00Z**.
- **Circle Bounty 2026-11-10 23:59 UTC+8** = **2026-11-10T15:59:00Z**, six hours earlier.
- **Beyond the Rails Lucent → Glinting boundary** Nov 5 **05:00 UTC+8** = **Nov 4 21:00Z**; previous cycle ends **Nov 4 20:59Z**.
- Where the official notice says `server time` and not `UTC+8`, current parser correctly retains date-only precision pending evidence. Do NOT substitute Asia/Europe/America offsets from a different game.

## Root causes and failure modes

| Layer | Confirmed reality | Impact |
|---|---|---|
| Steam transport | Exact, documented, permitted GetNewsForApp/v2 API; 29 current stored posts; last confirmed Oct 27 | SUCCESS. Do not repeat API authorization or old P0 Game8/robots research |
| Steam discovery | Current Version 1.4 full launch notice `1844751498233952` IS in stored response | Discovery works; parser **title allowlist** excludes key release content without failing |
| Year/period gating | Standalone Pukaland and Coal Lump notices lack literal year, legitimate fail-closed date rule | Must use version context from correctly selected Sept 29 release, never current clock |
| Parser event identity | Known sections parse `S-Class Character`, `Arc`, `Limited-Time Event`; `Circle Gifts` login, `Circle Bounty`, Porsche and phase I need checked dedicated tests | Widen only source-verified contexts, avoid generic global date-scan and change of stable IDs |
| NTEBuild recurrence | Exactly **2 current/upcoming** Beyond the Rails rotations, 14-day cadence, 05:00 UTC+8 anchored | Existing implementation already gives current cycles; don't repeat recurring research |
| Reviewed | 15 records, all old (before Sept 30) | No official 1.4 fallback for parser selection failure |
| Source Health | Steam nonzero 49 even when a current version's `Circle Gifts`, `Terminal Depths`, multiple Phase I channels vanish | Missing per-version/notice coverage check; fail-closed cannot rely only on total event count |
| Unresolved older source conflict | Version 1.3 `Circle Bounty` official Perfect World vs Steam disagree by 24 hours; documented in `docs/NTE-STEAM.md` | Preserve higher-priority reviewed value, old ID and visible conflict; do not conflate with 1.4 Bounty |

## Recommended separate bounded milestones (NOT implemented here)

**N1 — P1 current 1.4 events + Circle Bounty deadline (urgent).**
Scope the parser to a verified publisher **Version 1.4 release notice with actual Sept 29 title**, by explicit title/payload corroboration (not broad `log in` regex alone). Extract **Circle Gifts**, **Terminal Depths**, **Pukaland Travelogue**, **Coal Lump's Treasure**, and **1.4 Circle Bounty** with exact UTC+8 source ends and proper after-update day starts. Handle Oct 8 standalone yearless only with explicit version context from same verified notice, not ambient current year. Confirm identity and absence of duplicate already published Foretold Finale. If source parser fix unsafe, a narrowly reviewed official fallback for the same five items is acceptable, but don't claim unattended coverage repaired. Preserve all 15 existing reviewed records, including the 1.3 Circle Bounty conflict. Run frozen Bun install, typecheck, full tests, build, fixed-clock feed merge and actual Actions runner after separate operator approval.

**N2 — historic banner/Arc + dated drop-event coverage.**
Once N1 is green, restore the skipped Version 1.4 Phase I `Fading Reverie` / `Crime and Punishment` / `The Last Rose` windows, and optional historical `Stamina Recharge` + `Pixel Surge`, without changing current Akane/Far Side or BTR. The first-party source is already checked in; no source discovery repeat needed.

**N3 — optional expired rewards/web/collab/store deadlines** as explicit product decision. Separate `Blackbird's Invitation` web quest, limited Porsche boxes, time-limited outfit discounts (not permanent items) and unknown mail-claim expiry. Preserve UTC+8 vs server-day precision and do not turn permanent Puka Membership/locations/story into expiring deadlines.

**N4 — Source Recovery R1 future per-family coverage gate**.
Test that `Steam GetNewsForApp 200 + 29 posts / eventCount49 + actual 1.4 release notice skipped` yields an actionable missing-official-version coverage incident, distinct from transport failure. Watch upcoming first-party 1.5 notices without inferring dates. Ensure confirmed Beyond the Rails current rotations stay separate from `Version end` heuristics. Do not implement R1/R2/R3 in this game audit.

## Sources / limitations

**Official primary:** Perfect World Version 1.4 patch release: https://nte.perfectworld.com/en/article/news/gamenews/20260929/264409.html ; October 21 maintenance/update: https://nte.perfectworld.com/en/article/news/gamenews/20261019/264675.html . All factual 1.4 windows above were separately inspected in **the stored official Steam API source** `snapshots/nte-steamnews-official.json`; this is the supported production ingestion path.

**Secondary, for corroboration and BTR discovery, NOT official provenance:** https://www.ntebuild.com/events , https://senseos.gg/wiki/neverness-to-everness/banners/ , https://nteatlas.com/events and https://www.prydwen.gg/neverness-to-everness/guides/game-modes . Exact reader/server clocks may differ on other pages; don't override direct official UTC+8 notices without evidence.

**Verification limits:** no local Bun build/tests or new Actions runner fetch, no current published Pages JSON download, no in-game timer capture. Candidate existence/nonexistence follows from inspected current parser title allowlist and snapshot contents, absence in reviewed plus known NTEBuild BTR-only parser. The source meta `eventCount=49` is an existing Oct 27 result, not an independently rerun output count. No production data or code changed.

**Next concrete step:** separately authorize N1 as urgent time-bounded fix from a verified already-ingested official post, or finish the seven-game research series with CZN, then produce one comparative severity-ranked remediation backlog. Do not expand Timeline PR #115, Source Recovery design PR #113, or recurring-endgame into this research-only scope.
