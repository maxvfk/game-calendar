# Wuthering Waves — Source and Event Coverage Audit (2026-10-28)

**Status:** RESEARCH ONLY / NO IMPLEMENTATION. **Baseline main:** `06102a76c602d86e924432bcd612e1a0967cb467`.
**Scope:** WuWa Global Version 3.7, active or upcoming expiring event coverage; historical 3.7 Phase I as regression evidence; source discovery/ingestion, banners, challenges and optional web deadlines. This is a bounded current-version coverage check, not an exhaustive audit of the game's historical notices or all future 3.8 schedules.

## Executive findings

**INCOMPLETE event coverage with SUCCESSFUL source transport.**
The registered live source `wuwa-kuro-mirror` is a documented GitHub Contents API mirror of the official Kuro announcement Atom (`TheLovinator1/wutheringwaves/articles_latest.xml`); `snapshots/wuwa-kuro-mirror.xml` matches upstream **20 latest articles**, through article **5668** updated 2026-10-20, with meta `lastConfirmedAt=2026-10-27T21:23:35.772Z` and `eventCount=7`. This is **not** a broken HTTP/source access incident. Seven parsed rows do NOT mean completeness, nor do they establish the count of unique current published feed winners (other reviewed/recurring rows merge separately).

The current parser supports **four Phase II rerun channels** (Lucilla, Freeze Frame, Lynae, Spectrum Blaster), plus three 3.7 dated events (Artisan's Search, Echo Erase, Beyond the Waves). Critical missing groups:

1. **Banner discovery:** official Version 3.7 patch notes explicitly identify the **Suoming** character convene `Nine Deaths, One Unbent Heart` and weapon convene `Unspoken Rue`; the indexed Phase II article `5668` includes only four *rerun* convenes. The publisher's September 30 press release and independent 3.7 calendars associate the new channels with Phase II October 22–November 11. **Their exact phase-specific event windows are not present in the 20-entry mirror; do not pretend KQM-like parser fixes can extract them from missing text.** Verify a first-party dated announcement/in-game banner timer before publication as `official`; record exact extraction URL and server semantics. The older Phase I new Hsin + Blooming Jadehaven are likewise absent, along with their four separate source-indexed reruns not parsed.
2. **Deterministic parser bug:** `updateDays()` in `src/ingest/parsers/wuwa-kuro-atom.ts` recognizes titles matching `Version N Update Maintenance Notice`, `Version N Patch Notes` or `Patch Notes for Version N` but **NOT** the actual indexed `Patch Notes for Wuthering Waves Version 3.7: ...` (article `5571`). It cannot resolve `Version 3.7 Update - end` lines, even though `5571` itself explicitly states `✦Maintenance Time: 2026-09-30 04:00 ... (UTC+8)`. This silently drops `Cubie Wars`, `Dreams in the Capsule`, `Gifts of Waking Moon`, and Phase I rerun banners from article `5546`.
3. **Notice-layout parser bug:** `candidate()` scans `near` for lines with `(server time)` and `^Duration:` / date / `^Version ... Update`, but `Gifts of Singing Drizzle` (article `5571`) states `✦Duration: ...`, so the P1 free-pull login event is missing despite an explicit clock. Web events `Waking Moon Fishing` and `Back to Solaris` have **(UTC+8)** fixed/global times, not the parser's mandatory `(server time)`; they need separate opt-in and correct boundary semantics.
4. **Parser identity trap:** article `5571` labels the event as `[Special Events] [Cubie Wars] Leisure Event`. `identity()` currently takes the **first** bracket group (`Special Events`) rather than `Cubie Wars`. Merely fixing `updateDays()` could publish a bad title / stable ID. Fix extraction scope and identity together when implementing, keeping historical IDs stable.
5. **Recurring endgame:** `src/ingest/recurring-endgame.ts` ALREADY implements independent `estimated` 28-day schedules for Tower of Adversity: Hazard Zone and Whimpering Wastes: Respawning Waters, anchored in existing `docs/research/wuwa-recurring-endgame.md`. Do **not** revisit or overwrite these without an observed discrepancy. `Endstate Matrix — Adversity Vanguard (Version 3.6 Phase)` in reviewed ended Sep 30; no Version 3.7 phase row was found in reviewed/automatic output. Endstate Matrix is **version-linked, not a 28-day clock**. Current exact 3.7 deadline not established by checked official notices — separate source confirmation, not cadence projection.

## Baseline and verification levels

Read current `AGENTS.md`, `IMPLEMENTATION-STATUS.md`, `docs/research/coverage-wuwa.md` and `wuwa-recurring-endgame.md`, actual `data/reviewed/wuwa.json` (**12 reviewed rows, all 3.6 historical**), source snapshot/meta, `src/ingest/adapters/index.ts`, `src/ingest/parsers/wuwa-kuro-atom.ts`, `src/ingest/recurring-endgame.ts`, `test/wuwa-kuro-atom.test.ts`, and current `TheLovinator1/wutheringwaves` master Atom/commit (Oct 21).

- Confirmed mirror article IDs: **5668 Phase II**, **5653 upcoming (image-only/empty textual content)**, **5571 3.7 patch notes**, **5546 Phase I**, plus articles with character profiles, art, community announcements.
- Source meta: `contentChangedAt=2026-10-21T20:43:03.544Z`, `lastConfirmedAt=2026-10-27T21:23:35.772Z`, `eventCount=7`. Upstream file unchanged at time of review. Do not confuse a fresh successful HTTP 304 with new schedule evidence.
- Source `wuwa-game8-events` is intentionally unscheduled because of previously verified CloudFront 202; do not rerun blocked-source research.
- The older Sept 22 coverage audit is historical: it described a time when Kuro Atom was not yet integrated and 3.7 notices were still unreleased. This audit supersedes its currentness claims while retaining its evidence/decisions.
- Source attribution: Kuro original article: `https://wutheringwaves.kurogames.com/en/main/news/detail/<articleId>`; extraction mirror: `https://github.com/TheLovinator1/wutheringwaves`. No claim of independently accessing a current *new* site from Actions here.
- The official patch notes article `5571` was independently visible as text via the Kuro website, and exact 5668/5546 content was read in the actual stored Atom. Externally indexed secondary sources are discovery/corroboration only and may contradict one another on regional clocks; avoid promoting a conflicting community countdown to canonical exact time.
- No live Pages JSON download or new CI runner refresh was performed by this audit. Event set absences follow from parser implementation, reviewed rows, source snapshot and source-metadata count, NOT a direct browser inspection of `events.v1.json`.
- Endfield Echoes, ZZZ cycles, CZN reset and editorial Timeline have unrelated scopes.

## Current Version 3.7 coverage matrix

Legend: **COVERED (parser/reviewed/recurring)** = a supported source-driven row/rule, NOT independently seen live JSON. **MISSING** = relevant published period with no supported parsed/reviewed output. **PARTIAL** = insufficient/variant current timing or source detail. **SCOPE** = operator may decide that optional activities belong in calendar.

| Item | Official evidence / end | Assessment | Gate |
|---|---|---|---|
| `Tomorrow in the Frame` — Lucilla rerun | Article **5668**, Oct 22 10:00 – Nov 11 **11:59 server** | **COVERED** (Phase II parser) | Preserve exact three-region ends and stable ID |
| `Freeze Frame` — weapon rerun | 5668, same end | **COVERED** | Preserve |
| `Undefined Spectrum` — Lynae rerun | 5668, same end | **COVERED** | Preserve |
| `Spectrum Blaster` — weapon rerun | 5668, same end | **COVERED** | Preserve |
| `Nine Deaths, One Unbent Heart` — Suoming new | Official **5571** identifies banner but not its exact period; Phase II membership/window corroborated by publisher launch press and secondary event schedules | **MISSING** currently active | **P1** corroborate exact first-party dates/clock; reviewed fallback if compliant extraction unavailable |
| `Unspoken Rue` — Suoming signature | Official **5571** identifies weapon convene, not its exact period | **MISSING** currently active | **P1** same gate, separate weapon channel |
| Phase I Hsin `As Full as Tonight, Forever` / `Blooming Jadehaven` | Official 5571 names; no dated standalone mirror notice | **MISSING HISTORICAL** after Oct 22 | P2 archive history and ID stability |
| Phase I Chisa `Horizon of Dawnbreak`, `Kumokiri`, Iuno `Across Time's Waxes and Wanes`, `Moongazer's Sigil` | **5546**, Sep 30 after update – Oct 22 **09:59 server** | **MISSING HISTORICAL** due failed 3.7 update-day anchor | P2 parser regression / safely backfill; no guessed after-maintenance clock |
| `Artisan's Search` | Official **5571**, Oct 8–26 **03:59 server**, already expired | **COVERED** parser | Keep historical source |
| `Echo Erase` | **5571**, Oct 22 10:00 – Nov 9 **03:59 server** | **COVERED** parser | Keep |
| `Beyond the Waves: Land of Xuanfang` | **5571**, Oct 29 04:00 – Nov 11 **03:59 server** | **COVERED** parser, upcoming | Keep |
| `Cubie Wars` | **5571**, after 3.7 update – Nov 11 **11:59 server** | **MISSING** | **P1** date-anchor + correct nested bracket `Cubie Wars` identity |
| `Dreams in the Capsule` | **5571**, after update – Nov 11 **03:59 server** | **MISSING** | **P1** update anchor; preserve day start |
| `Gifts of Waking Moon` | **5571**, after update – Nov 11 **03:59 server** | **MISSING** | **P1** free-pull login |
| `Gifts of Singing Drizzle` | **5571**, Oct 22 10:00 – Nov 11 **03:59 server** | **MISSING** | **P1** `✦Duration` prefix and 10 Radiant Tide rewards |
| `Past Dreams, Traced Seals` | **5571** says permanently available after version update | **CORRECTLY EXCLUDED** | Not an expiring event; don't invent end |
| `Waking Moon Fishing` — web | **5571**, Oct 15 10:00 – Nov 1 **09:59 UTC+8**; fixed instant **2026-11-01T01:59Z** | **MISSING / SCOPE** | Web rewards: opt-in; never region-shift UTC+8 |
| `Back to Solaris` — web | **5571**, after update – Nov 11 **23:59 UTC+8** = **2026-11-11T15:59Z** | **MISSING / SCOPE** | Opt-in, fixed global end, day start |
| `Chord Cleansing` upcoming double-drop | Independent secondary 3.7 calendar cites Nov 4–11. No current independently captured dated first-party 3.7 announcement in the **20-article Atom** or 5571 notice. | **WATCH, NOT VERIFIED** | Don't publish proposed clock until official notice/in-game capture |
| `Gifts` / `Moonlit Path` unspecified rewards | 5571 mentions Moonlit Rings and cosmetics but supplies no independent earning window beyond those tracked above | **PARTIAL / SCOPE** | No guessed cutoff |
| ToA Hazard Zone / Whimpering Wastes Respawning Waters | Already generated by `RESET_RULES`, independent 28-day anchors and **estimated** provenance | **COVERED BY EXISTING RECURRENCE** | Watch future evidence; no new research or rewrite |
| Endstate Matrix — current 3.7 version-linked phase | Old 3.6 reviewed `Adversity Vanguard` ended Sep 30; current 3.7 phase period not in active Atom/reviewed | **MISSING / EXACT END UNVERIFIED** | **P1/P2** independent source/phase timer, never 28-day recurrence |
| Trials / Ascendant Aces | **5668** says character trial during convene; specific rewards and exact separate trial identity not established | **PARTIAL / SCOPE** | May be subordinate window; don't invent independent start |

### Regional precision for verified server-clock events

WuWa event clocks are **fixed game server clocks**, not reader time zones. For Nov 11 **11:59 server** (current Phase II reruns and Cubie Wars):

- Asia UTC+8: **2026-11-11T03:59Z**
- Europe UTC+1: **2026-11-11T10:59Z**
- America UTC−5: **2026-11-11T16:59Z**

For Nov 11 **03:59 server** (Dreams, Waking Moon, Singing Drizzle, Beyond the Waves):

- Asia: **2026-11-10T19:59Z**
- Europe: **2026-11-11T02:59Z**
- America: **2026-11-11T08:59Z**

For the web notice UTC+8 clock, use **one fixed UTC instant** regardless of selected game region. Avoid shifting deadlines according to Dutch DST or local viewer time.

### Source vs parser vs reviewed vs monitor

| Layer | What works | Confirmed failure / blind spot |
|---|---|---|
| Transport | GitHub Contents API source works; Oct 27 confirmation; nonzero 7 events | This does NOT assert publication completeness |
| Discovery | 20 latest official Kuro mirror articles, current Phase II reruns and 3.7 patch notes | New Suoming/Unspoken Rue distinct dated convene notices not indexed; `Upcoming Events` article is image-only |
| Parsing | 4 Phase II reruns; Artisan, Echo Erase, Beyond | Can't resolve actual patch heading to version date; nested bracket mis-IDs Cubie; misses decorated `✦Duration`; no UTC+8 web clock handling |
| Reviewed fallback | 12 stable 3.6 historical entries | No new 3.7 fallback for missing channels/periods |
| Recurring | ToA / Wastes projected as estimated, bounded 70d horizon | Endstate Matrix needs independent phase-based scheduling, not recurrence |
| Monitoring | parser rejects zero, conflicting duplicates and schema | 7 healthy events can coexist with entire missed 3.7 event families and new featured banners |

## Recommended separate bounded milestones

**W1 — urgent P1 source-confirmed 3.7 current events** (do not start without separate authorization).
Minimal deterministic parser bug repair from the existing captured **5571/5668** data: reliably identify `Patch Notes for Wuthering Waves Version 3.7` update day, parse `Cubie Wars`, `Dreams in the Capsule`, `Gifts of Waking Moon`, `Gifts of Singing Drizzle` with correct titles and three-region endings. A narrow reviewed-data fallback is acceptable if implementation risks or parsing boundaries warrant. Source-grounded test must prove **no `Special Events` false row**, no guessed exact update-completion start and no changed 3.6 IDs. Suoming/Unspoken Rue separately require exact first-party notice/phase verification, not inferred 5668 dates silently applied.

**W2 — banner discovery/publisher completeness** (separate gate).
Investigate *why* the latest 20 Atom index includes reruns, but omits Hsin/Suoming new exclusive convene announcements and their signatures. Can a compliant source discover all 6 separate channels per phase, across old+new? Compare Kuro site/news/official press, dynamic mirror/article JSON and publisher social/ingame; verify one real GitHub runner index+detail and robots/terms. Preserve distinct source URLs/provenance. Don't change source merely because an individual fan site disagrees with official clock.

**W3 — optional web + 3.7 endgame** (separate scoped milestone).
If operator approves web reward deadlines, parse `(UTC+8)` as global and distinguish `Waking Moon Fishing` from `Back to Solaris`; handle Endstate Matrix only after independent current-phase timing evidence. Leave permanent `Past Dreams` out, preserve ToA/Wastes estimated recurrence.

**W4 — Coverage Health future R1**.
For WuWa monitor `(banner, new vs rerun, resonator vs weapon)`, version events and login; explicit coverage from patch notes, Atom index count/window and endgame mode families. Regression: source `HTTP 200 + seven correct parsed events + four main patch events absent` must raise a coverage incident. Any unconfirmed next version or web scope remains `watch`, not auto-publication.

## Sources and limitations

**First-party:**
- Kuro 3.7 patch notes and exact official event periods: https://wutheringwaves.kurogames.com/en/main/news/detail/5571
- Kuro Phase II reruns (source already captured in official-article Atom, article 5668): https://wutheringwaves.kurogames.com/en/main/news/detail/5668
- Kuro Phase I reruns (article 5546): https://wutheringwaves.kurogames.com/en/main/news/detail/5546
- Kuro former 3.6 version phase and independent Endstate Matrix background are recorded in `docs/research/wuwa-recurring-endgame.md`.

**Extraction/documentation:** https://github.com/TheLovinator1/wutheringwaves (the actual checked Atom snapshot), plus local `snapshots/wuwa-kuro-mirror.xml`, `.meta.json`, `src/ingest/parsers/wuwa-kuro-atom.ts` and `src/ingest/recurring-endgame.ts`.

**Independent corroboration, not official extraction:**
- Version 3.7 new+reruns phase assignment in publisher launch press: https://labs.invenglobal.com/articles/26669/wuthering-waves-version-37-goes-live-with-new-resonator-hsin
- Source-reproducing Nov 11 Phase II window: https://wutheringwaves.gg/version-3-7-featured-resonator-weapon-convene-phase-%E2%85%B1/
- Current secondary schedules differ on some dates/UTC conventions; no unsupported alternate clock is accepted.

**Verification limits:** No fresh external host Actions probe; no programmatic deployed Pages JSON retrieval; no manual in-game comparison. Kuro Atom meta `eventCount=7` is last refresh and source replay is reasoned from checked source and pure parser code, not separately executed tests in this audit. This report does not implement any W1–W4 change.

**Next concrete step:** separately authorize **W1** to restore four missing source-explicit patch event/login deadlines with regression tests, and **W2** for the two missing active new 3.7 banner channels. Otherwise continue per-game research-only audits with **ZZZ**, noting ZZZ B1 recovery and endgame reanchoring are already complete and must not be repeated.
