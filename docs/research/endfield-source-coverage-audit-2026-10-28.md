# Arknights: Endfield — Source and Event Coverage Audit (2026-10-28)

**Status:** RESEARCH-ONLY, IMPLEMENTATION NOT AUTHORIZED. **Baseline:** current `main` `89d4ad917990`, after HSR / Genshin / WuWa audits.
**Focus:** current [Sanctuary of Ink] version (Oct 15 onward), previously reviewed [Dreamscape of Wind and Snow] remnants, urgent expiring rewards and officially announced near-future periods. This is a bounded current-version coverage check, not a complete all-time archive or an endorsement of website-scraping without access review.

## Executive conclusion

**NOT COMPLETE. A concrete incorrect deadline exists as well as missing entire event families.** The existing `endfield-wikigg-events` transport is currently healthy, last confirmed `2026-10-27T21:23:40.157Z`, but the checked-in event-page snapshot holds only **8 automatically parsed event rows**. All **6 reviewed rows** are old Version 1.5 data or two separately repaired Phantasia cycle deadlines; **there are zero current 1.6 banner rows** in reviewed and the live wiki event-page source does not cover headhunting / arsenal banners.

More urgent than missing data: `Monumental Etching: Forest of Maras` has **incorrect wiki-sourced regional end timestamps** compared with the official [Sanctuary of Ink] update notes. The official deadline is **Nov 5, 2026, 04:00 server time**, while the captured wiki timers correspond to **06:00 Asia** and **17:00 Americas/Europe** on Nov 5. This would tell players they have **2 hours (Asia) / 13 hours (Americas/Europe) more than they actually do**, if it is published unchanged. Do not auto-override based on a speculative conversion: these are directly conflicting explicit source statements and must be repaired after source-grounded regression checking.

## Repository/source baseline and verification

Read CURRENT `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/research/coverage-endfield.md` (historical Sept 22), `docs/research/endfield-recurring-endgame.md`, Phantasia tasks and tests, `data/reviewed/endfield.json`, active source adapters and both wiki.gg snapshots/meta, `src/ingest/parsers/wikigg.ts`, `src/ingest/parsers/wikigg-echoes.ts`, and Echoes selector/refresh tests.

- `snapshots/endfield-wikigg-events.html`: 8 current entries, including `Carly's Verdant Anthology`, `Monumental Etching: Forest of Maras`, `Season of Phantasia`, `Spirit's Restoration`, `All the Inky Hues`, `Yuanyuan's Blazing Stoves`, `Arena of Games`, `New Era for the Myriad Souls`. Meta `contentChangedAt=2026-10-26T21:41:23.168Z`, `lastConfirmedAt=2026-10-27T21:23:40.157Z`, `eventCount=8`. This is a successful transport, not coverage assurance.
- `snapshots/endfield-wikigg-echoes.html`: STILL the prior **Season of Illusion** with `lastConfirmedAt=2026-10-14T20:47:25.387Z`, `eventCount=2`. The current season discovered from Event page is Phantasia, but live Phantasia season-page parsing is known **BLOCKED** due to an actual contradictory western first-cycle opening (the wiki season infobox says western 2026-10-15 23:00 UTC-5, while an unqualified “server time” cycle row implies a different first-cycle opening). Do not treat old snapshot as a functioning current cycle feed.
- Official reviewed Phantasia **Cycle I** and **Cycle II** were already repaired and deployed under PR #58, `docs/tasks/ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md`. Their IDs, sourced exact regional ends and manual provenance are correct. No duplicate Cycle III is necessary when the existing sourced **season** event conveys its final Nov 5 end. **Do not rerun** completed Phantasia research or invent a third overlapping deadline.
- `endfield-game8-events` is intentionally disabled (Actions CloudFront 202), not an alternative automatic banner source. Only the Events wiki and selected Echoes wiki adapters are registered for Endfield.
- Newly checked current primary publisher evidence: official [Sanctuary of Ink] patch announcement at https://endfield.gryphline.com/en-us/news/9560 (published Oct 15), [Rejuvenation] at https://endfield.gryphline.com/en-us/news/4489 and current notices/news index at https://endfield.gryphline.com/en-us/news. This was public page inspection, NOT a new GitHub Actions robots/runner probe or a new ingestion adapter.
- This research did not execute Bun tests/build, fetch current deployed Pages JSON, or manually inspect in-game timers. Record counts below refer to *snapshot + reviewed inputs*, not a directly downloaded list of unique feed winners.

## High-priority source discrepancy: Monumental Etching

`Monumental Etching: Forest of Maras`, source row in captured `endfield-wikigg-events.html`:

| Boundary | Captured wiki `data-end` | Display in server clock | Official patch `9560` | Error |
|---|---|---|---|---|
| Asia (UTC+8) | `2026-11-04T22:00:00Z` | Nov 5 **06:00** | Nov 5 **04:00**, i.e. `2026-11-04T20:00:00Z` | Wiki end **2h late** |
| Americas / Europe (UTC-5) | `2026-11-05T22:00:00Z` | Nov 5 **17:00** | Nov 5 **04:00**, i.e. `2026-11-05T09:00:00Z` | Wiki end **13h late** |

For another current Oct 22 camera event, `Carly's Verdant Anthology`, the captured wiki ends `Nov 4 20:00Z` Asia / `Nov 5 09:00Z` west, consistent with the official **Nov 5 04:00 server time**. This makes the Maras discrepancy a **specific source-row conflict** rather than a global timezone bug. Do not change the global `wikigg.ts` server mapping to “fix” Maras.

The event source `wikigg.ts` has no cross-source official-date validation; currently it trusts exact machine timestamps from wiki and marks `confidence=0.95` without an explicit `official` provenance. Repair needs a canonical source-grounded reviewed entry or deterministic official reconciliation preserving the existing published event ID. **Identity and completion-key stability are mandatory**; if a reviewed correction uses a different canonical start/title, resolve merge/ID semantics first. A missing/colliding correction must not be passed off as success.

## Version 1.6 official coverage matrix (as of Oct 28)

**COVERED** = existing supported automatic row or official reviewed cycle, not independently observed in published JSON. **MISSING** = officially dated/announced item with no supported live automatic or reviewed row. **PARTIAL** = existing row with unsupported or contradictory precision, or relative/version end requiring separate evidence. Exact hours below are source's **server-local clocks** unless noted.

| Family / event | Official source/period | Current coverage | Priority / next gate |
|---|---|---|---|
| **Si — Rejuvenation Chartered Headhunting** | After Oct 15 version update → **Nov 5 11:59** (9560, 4489) | **MISSING** banner | **P1** active banner, source verified; day-precision after-update start; region ends exact |
| **Jade Vessel — Seal of Jade Issue** | After update → **after three Chartered banners** (9560) | **MISSING** weapon issue | **P1/P2** open-ended or event-based cutoff only, **never** fabricate exact date |
| **Tangtang — Ancestral Spring Flows Anew (RE-Factor #1)** | **Oct 29 12:00 – Nov 19 11:59** (9560) | **MISSING** upcoming banner | **P1** region-specific end |
| **Brigand's Calling — Tender Sprig Issue (RE-Factor #1)** | **Oct 29 12:00 – Nov 19 11:59** (9560) | **MISSING** upcoming weapon issue | **P1** distinct channel |
| **Argent Flow — The Hearth Fire Beckons the Starry Flow** | **Nov 5 12:00** → next version maintenance (9560) | **MISSING** future banner | **P1/P2** start source known, end `null` without actual next maintenance |
| **Lunar Calling — Moongleam Issue** | From Nov 5 12:00 until after three Chartered banners (9560) | **MISSING** future weapon issue | **P1/P2** no guessed end |
| **Combat Drills (Si, Argent Flow)** | Trials explicitly accompany respective Chartered banner phases | **PARTIAL** separate trial reward cutoff not modeled | Optional independent trial row only if policy and timing confirmed |
| **Spirit's Restoration** | After update → Nov 5 11:59 (9560) | **COVERED** 8-row wiki feed | Preserve; note wiki western start is not independently synchronized with official maintenance |
| **All the Inky Hues** | After update → Nov 5 **12:00** (9560) | **COVERED** | Source clocks consistent on expiry |
| **Carly's Verdant Anthology** | Oct 22 12:00 → Nov 5 **04:00** (9560) | **COVERED**, exact regional wiki ends match | Preserve |
| **Yuanyuan's Blazing Stoves** | After update → **before next version**; Oct 22 content refresh (9560) | **PARTIAL** wiki claims concrete `2026-11-25T22:00Z` as global end, but no independently announced next update boundary was established in audit | Do not claim wiki-projected end as official exact; investigate source provenance |
| **Monumental Etching: Forest of Maras** | Oct 22 12:00 → Nov 5 **04:00** (9560) | **CONFLICTING** captured wiki late by 2h Asia / 13h west | **P1 precision fix first** |
| **Echoes of War: Season of Phantasia** | After update → Nov 5 11:59 (9560) | **COVERED** season in wiki; reviewed Cycle I/II exact, source page for cycle automation BLOCKED | No rework of reviewed fix |
| **Echoes of War: Season of Fervor** | **Nov 5 12:00** → next version (9560) | **MISSING** future season from current 8-event wiki index; related third-party cycle table exists but official end of season not explicit | **P1/P2** future discovery, no synthetic Nov 26 deadline |
| **Contingency Readiness** | Oct 29 04:00 → Nov 5 **04:00** (9560) | **MISSING**, begins tomorrow | **P1** confirmed limited daily rewards |
| **Arena of Games** | Oct 29 12:00 → Nov 19 04:00, content update Nov 11 04:00 (9560) | **COVERED** wiki (event window), **PARTIAL** separate content-update marker | Do not duplicate main event |
| **New Era for the Myriad Souls** | Oct 31 12:00 → Nov 14 04:00 (9560) | **COVERED** wiki | Preserve |
| **Back to the Rustics** (Argent narrative) | Nov 5 12:00 → next version (9560) | **MISSING** timed event page, but story remains playable after it closes | **SCOPE** distinguish temporary reward/event page from permanent mission |
| **The Stars Are With Me** | Nov 5 12:00 → next version (9560) | **MISSING** upcoming login | **P1/P2** limited HH permits, end unknown |
| **Contingency Contract: Indigo Experimental Operation** | Nov 5 12:00 → next maintenance; event update Nov 12 12:00; **Secret Sanctuary exchange ends Dec 3 04:00** (9560) | **MISSING**, including an independent explicit shop/reward deadline | **P1/P2**, separate exchange cutoff from challenge period |
| **Sanity Supply — Nov period** | Asia Nov 19 04:00 → Nov 26 04:00; Americas/Europe Nov 19 04:00 → Nov 25 17:00 (9560) | **MISSING** second recurring notice, exact region boundaries known | **P1/P2** no uniform server end |
| **Umbral Monument: Murmurs of the Deep Forest** | New **permanent** stages Oct 22 (9560) | Not a time-limited entry | **CORRECTLY EXCLUDED**; limited accompanying Maras is tracked |
| **Delver of the Cryptic: Fade Beyond the Painting** | Nov 12 12:00 puzzle set launch; extra spaces Nov 19 04:00 (9560) | **MISSING upcoming** timed update but no separate stated event expiry | P2/SCOPE, no arbitrary end |
| **Protocol Pass: Ink Scroll** | Within version 1.6, no independently exact purchase/claim deadline in checked main notice | **MISSING version-linked** | SCOPE, do not invent maintenance timestamp |
| **Official maintenance compensation mails** | Distribute after update, expire during next update/maintenance (9560) | **MISSING relative claim cutoff** | SCOPE, do not substitute guessed next version date |

### Legacy reviewed rows with no longer-current unbounded end

- `Resplendent Spectrum`: 1.5 RE-Factor banner began Sep 24, currently `endsAt: null`. Prior official 1.5 announcement bound it **before next version update and maintenance** (now version 1.6 started Oct 15). This is no longer a current banner. Correct presentation while retaining the stable ID requires a source-backed (or explicitly marked estimated) boundary decision; don't silently delete reviewed history or fabricate exact hour.
- `Deep Cold Issue`: 1.5 weapon issue `endsAt: null`, but its closing rule is **after three Chartered Headhunting banners**, not simply the 1.5 maintenance. It may still be live; investigate the actual banner sequence / in-game status before expiring. Do not blindly set both legacy rows to Oct 15.

## Region/clock rules — do not use viewer timezone

Endfield has **two** effective game server groups: Asia UTC+8; Americas/Europe UTC-5. E.g. Si banner ending **Nov 5 11:59 server local** translates to Asia **Nov 5 03:59Z**, Americas/Europe **Nov 5 16:59Z**. Tangtang ending **Nov 19 11:59** translates to Asia **Nov 19 03:59Z**, Americas/Europe **Nov 19 16:59Z**.

For Contingency Readiness / Carly / Maras **Nov 5 04:00 server local**, the exact instants are Asia **Nov 4 20:00Z**, Americas/Europe **Nov 5 09:00Z**. The client viewer's locale or DST does not modify source-defined server offsets. Source messages saying “before next update/maintenance” do NOT supply that minute.

## Source architecture and failure classes

| Layer | Current reality | Failure mode |
|---|---|---|
| Transport | `endfield-wikigg-events` checked snapshot current Oct 26, last confirmed Oct 27; parser emits 8; Game8 intentionally disabled | Green Source Health does NOT imply announced events are covered |
| Discovery | Event wiki focuses on limited game events, not current banners/issues and many planned future events | **Complete absence** of current banner family; missing Contingency Readiness and future Fervor/Sanity |
| Source agreement | Wiki timeboxes and official publisher current patch data can disagree | **Concrete Maras incorrect regional deadline**, real false confidence despite successful parsing |
| Echoes cycles | Current season discovered through Events page; distinct source `endfield-wikigg-echoes` has stale Illusion snapshot, current Phantasia page fails semantic regional start consistency checks | Retain reviewed official Cycle I/II and existing season; do not mislabel automatic cycle ingestion as recovered |
| Reviewed | Six manual rows, four legacy events + two Phantasia cycle deadlines | Legacy RE-Factor banner with `endsAt:null` can appear forever if current-version closure not reconciled |
| Publisher official | Version update notice itself includes all six banner/weapon channels and many dated activities | There is **no registered scheduled first-party official news adapter**; compliance/robots and real Actions runner accessibility remain unproven, so no automatic official ingress is claimed |

## Bounded next milestones (NOT authorized by this audit)

**A1 — P1 exact deadline reconciliation.** Correct `Monumental Etching: Forest of Maras` against official `9560` with tight three-region test, original published ID preserved, no other event/source timestamps touched. Also independently assess already reviewed unbounded 1.5 `Resplendent Spectrum`, but don't combine its uncertain boundary with the deterministic Maras correction if it widens scope. Test source-winner merge precedence and no duplicate IDs. A1 is the highest urgency because wiki currently overstates available time.

**A2 — current official notice reviewed-data repair.** Restore Si, Tangtang and their weapon issues with source-exact region deadlines where explicit and `endsAt:null` where relative, plus `Contingency Readiness`; future Argent / login, Contingency Contract and Sanity Supply can be separately batched to keep milestones short. Preserve existing IDs, confidence and official-versus-extraction provenance. No full official HTML scraping experiment required to supply reviewed evidence.

**A3 — unattended official Endfield discovery/ingestion gate.** Probe official Gryphline robots and runner HTML/news index, discover version update notices + individual banners, parse version header/periods and handle two-region clocks including exception Sanity Supply. Prefer constrained official source only after real supported Actions fetch and conditions validation; otherwise keep reviewed fallback and mark BLOCKED. Do not use unsupported APIs, Cloudflare bypass or silently promote wiki times to official.

**A4 — Echoes robust cycle source/reconciliation.** Existing verified reviewed Cycle I/II and wiki conflicting season are a known bounded exception, not an invitation to weaken fail-closed logic. If upstream fixes the western first-cycle contradiction, prove identity and three-region ends against existing reviewed IDs; until then, keep source broken/old LKG and reviewed evidence. Detect the next **Fervor** season on Nov 5 without projecting a specific end or automatically creating Cycle I/II from an unconfirmed third-party table. Independently handle shop/phase-specific deadlines.

**A5 — future R1 Coverage Health.** Monitor `(endfield, character banner)`, `(endfield, weapon issue)`, `(endfield, limited event)`, `(endfield, Echoes seasonal)`, `(endfield, claim deadlines)`, and conflicts with official version notices. Regression: `wiki HTTP 200 + 8 parsed + Si/Tangtang absent` must report missing family; `Maras wiki end later than official` must flag source conflict; `wiki current Echoes cycle page rejected` must not imply no reviewed valid cycle. A relative next-version deadline is a `watch` not an invented exact end.

## Sources and limitations

**Official:** https://endfield.gryphline.com/en-us/news/9560 ([Sanctuary of Ink] update notice, 2026-10-15); https://endfield.gryphline.com/en-us/news/4489 ([Rejuvenation] current Si chartered notice). Publisher's news landing page https://endfield.gryphline.com/en-us/news indexes these in Notices. Official Phantasia cycle announcement and verified reviewed evidence already in `docs/tasks/ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md`; **do not repeat its research**.

**Structured secondary:** https://endfield.wiki.gg/wiki/Event and https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Phantasia ; both must remain secondary extraction, not official publisher provenance.

**Limitations:** No fresh GitHub Actions runner probe of Gryphline/robots, no programmatic live Pages JSON fetch, no local Bun execution, no in-game timer measurement. Captured wiki timers are directly read from repository snapshot; official end from the published update notice. This audit does not assert that changing the report fixes the public feed. No automated changes or new event records.

**Next concrete step:** prepare operator-authorized A1 Maras exact-deadline hotfix followed by A2 narrowly restoring current official banner/event notices. After that continue auditing the remaining games ZZZ, NTE, CZN without repeating already-completed ZZZ source recovery. STOP after research report; no implementation approved.
