# Genshin Impact — Source and Event Coverage Audit (2026-10-28)

**Status:** RESEARCH-ONLY AUDIT; NO IMPLEMENTATION. **Baseline:** current `main` `6f0f3647aadf`.
**Game/version:** Genshin Impact Version 7.1, currently active as of Oct 28, with separately classified announced 7.2 preview.
**Scope:** presently active/upcoming game-calendar-relevant expiring content (wishes, limited events/reward windows, monthly endgame, optional new Miliastra systems) plus recent 7.1 omissions that reveal source or parser limitations. Not a retrospective proof of complete archived history and not a mandate to include every cosmetic promotion.

## Executive conclusion

**Incomplete coverage, with a healthy upstream transport.** Confirmed current source snapshot `snapshots/genshin-kqm-ginews.md` contains **36 indexed notices** (upstream `KQM-git/GINews` `master` as of Oct 27, 2026 08:20:42Z); `lastConfirmedAt=2026-10-27T21:23:33.332Z`, `eventCount=10` from that refresh. The supported 7.1 review batch has **19 records**. Those counts are input counts, NOT independently downloaded current `events.v1.json` totals.

The current data contains two Phase II character wishes, but the simultaneously published **Phase II weapon wish** is missing. The KQM notice for that weapon wish is **already present in the captured source**. Equally, the Oct 26–Nov 2 **Overflowing Favor** double-drop, the Oct 19–Nov 2 **Starlight Voyage** event (with an earlier Oct 29 quest cutoff), and several time-limited 7.1 rewards are in that same snapshot but not emitted as event records. Unlike HSR 4.6, these omissions are mostly parser/coverage-policy gaps in an *available* current source, not missing upstream indexed articles.

### Baseline and proof limits

- Read: current `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/research/coverage-genshin.md` (historical Sept 22 audit), `docs/research/genshin-recurring-endgame.md`, `src/ingest/adapters/index.ts`, `src/ingest/parsers/kqm-ginews.ts`, `src/ingest/recurring-endgame.ts`, `test/kqm-ginews.test.ts`, `data/reviewed/genshin.json`, and actual checked-in KQM source/snapshot metadata. Compared current external KQM `master/readme.md` headings with the checked-in snapshot: same 36 indexed archive article IDs.
- Source adapter `genshin-kqm-ginews` remains scheduled; Game8 (`genshin-game8-events`) and Fandom (`genshin-fandom-events`) are intentionally disabled after prior Actions access/robots failures. Do not re-run those blocked access experiments without a new reason.
- KQM is **third-party notice extraction**, not a first-party publisher domain. It preserves in-game factual notices; official Genshin/HoYoLAB publisher posts independently support recent event existence and dates. CI accessibility of any *different* candidate has NOT been probed in this audit.
- `kqm-ginews.ts` generally emits **day-only** starts and ends because the `t_lc` / `t_gl` clock's global/region conversion has not been proven in its parser. Reviewed rows may have exact regional ends from separately verified sources; do not downgrade them or assume all tagged times are global.
- This audit did not run tests/build or fetch live published JSON itself; it inspects current code, reviewed rows, stored snapshot and upstream, with existing CI/build as background only. Do not label `19 + 10` as the count of unique winners; review/automatic may overlap. No files other than these audit/status docs change.

## 7.1 coverage matrix

**COVERED** means a reviewed record or an extant deterministic recurring rule exists. **MISSING** means source-dated activity is not in reviewed or supported parser extraction. **PARTIAL** means a related row exists but one precise deadline/subphase is not modeled. **SCOPE** requires an operator policy choice; a notice mentioning a feature does not necessarily imply a calendar event.

| Family/event | Verified evidence and boundary | Finding | Priority / follow-up |
|---|---|---|---|
| **Character Wish: Void Star's Advent (Skirk)** | `archive/21888.md`; Oct 13 18:00–Nov 3 14:59 (server/localized notice). | **COVERED** reviewed with regional exact ends; parser also discovers it. | Preserve ID. |
| **Character Wish: La Chanson Cerise (Escoffier)** | `archive/21889.md`; same Oct 13–Nov 3 phase. | **COVERED** reviewed. | Preserve ID. |
| **Weapon Wish: Epitome Invocation (Azurelight + Symphonist of Scents)** | **`archive/21890.md` in current snapshot**: Oct 13 18:00–Nov 3 14:59 local, explicit two featured 5-star weapons. | **MISSING** Phase II weapon banner; parser only identifies `Epitome Invocation` if the article itself contains `After Version X update` (normally Phase I). Current reviewed contains only 7.1 Phase I. | **P1**; one weapon-channel row (not two separate 5-star banner rows), stable phase-distinct identity. |
| **Test Run / trials** | Character Wish notices say the trial is available during the same banner period, but do not enumerate one independent fully dated trial notice here. | **PARTIAL/SCOPE**. | Avoid inventing independent trial identity or start; separate dated source gate if desired. |
| **Overflowing Favor (double artifact drops)** | `archive/21053.md`: Oct 26 04:00–Nov 2 03:59; independently posted by official Genshin HoYoLAB account around Oct 26. | **MISSING**. Parser recognises quoted `"…" Event:` title, but candidate scans for `Event Duration:` on the SAME line; here duration is a heading followed by a `<t class="t_lc">` row. | **P1 urgent** (Nov 2 03:59 server); simple deterministic source-fix or reviewed record. |
| **Carefree Snowball Fight** | `archive/21891.md`, independent publisher post Oct 19: Oct 21 10:00–Nov 2 03:59. | **PARTIAL** reviewed `2026-10-21` → `2026-11-02`, *day-precision UTC placeholders*, no region ends. Current parser misses the exact notice for the same headline/duration-heading reason. | **P1** precision improvement only when regional server-clock interpretation verified; do not re-key existing reviewed ID. |
| **Starlight Voyage: Heart Unbound** | `archive/21901.md`: full event Oct 19 10:00–Nov 2 03:59; **quest-completion period ends Oct 29 04:00** in the same notice. | **MISSING** both main event and a materially earlier sub-deadline. Heading `Participate in "…" to obtain …` isn't recognized by `entity()`. | **P1 urgent** (Oct 29); two windows need separate semantics/IDs if product tracks quest cutoff. |
| **Starlit Gala — main Miliastra event** | `archive/21897.md`: after 7.1 update → **Nov 3 04:00** (`t_gl`), with a distinct creator-contest submission deadline **Nov 2 11:59**; features separately phased `Wonderland Selects`. | **MISSING** main event and early submission cutoff despite indexed notice. | **P1/P2** based on whether Miliastra items/rewards are in product scope; never conflate phase and contest. |
| **Starlit Gala — Web Event / Year in Review** | `archive/21908.md`: America starts Oct 21; Asia/Europe Oct 22; global **Nov 3 04:00 UTC+8** end, rewards unavailable afterward. | **MISSING**. Text is prose and region-variable; generic KQM regex cannot parse safely. | **P1/P2** if web reward events are included. Preserve regional starts and one explicit global end, not invented server ends. |
| **Raiment Collection: Warmth of a Sunny Day** | `archive/21899.md`: after 7.1 update → **Nov 4 05:59** `t_gl`; free choice of Manekin cosmetic set. | **MISSING**. | **P1/P2** if claimable free rewards in scope; globally fixed end only after `t_gl` semantics verified. |
| **Moonlit Season** | `archive/21900.md`: Play Phase Sep 24 10:00–Nov 3 03:59; Showcase phase starts Nov 3 04:00, end only `End of Version 7.1`. | **MISSING** gameplay-phase deadline, despite dated notice. | **P2 / Miliastra scope**; don't infer Showcase exact end or reset all rewards without proof. |
| **Cosmetic Event Odes** | `archive/21895.md` and `archive/21896.md`: Osmanthus in the Moonlight and Candlelit Revelry until **Nov 3 14:59** local, plus Oct–Nov limited shop discounts ending Nov 2. | **MISSING** cosmetic wishes and temporary discounts. | **SCOPE**: if game calendar includes Miliastra limited banners, schedule as separate from normal character/weapon wishes. |
| **Moontrace Battle Pass** | `archive/21884.md`: main period through Nov 2 03:59 local; paid purchase cutoff **Nov 2 02:59**, one hour before reward period ends. | **COVERED** main BP via reviewed and parser; **PARTIAL** paid-purchase cutoff. | P2/SCOPE; do not confuse paid purchase deadline with general rewards. |
| **To Temper Thyself and Journey Far Cycle 5** | `archive/21761.md`: Aug 10 04:00–Nov 2 03:59 local, with an explicitly non-carrying character-selection reward. | **COVERED** reviewed but ends at Nov 2 day precision, no per-region end. | **P1** reward selection cutoff precision audit; preserve reviewed ID. |
| **The Godforsaken Frostlands** | `archive/21811.md`: limited exploration reward ends Nov 3, reviewed day precision. | **COVERED**, conservative clock. | Do not silently upgrade precision. |
| **Tabletop Troupe / Across Frozen Wilds / Archon Quest bonus** | `archive/21924.md`, `archive/21885.md`, `archive/21880.md`: dated select/reward windows through Nov 3. | **COVERED** reviewed with exact regional ends; parser handles supported subset. | Preserve published historical title/IDs. |
| **Stygian Onslaught + Disturbance Outbreak** | Current 7.1 sourced challenge ending Nov 3; shorter Outbreak window ended Oct 10. | **COVERED** as separate reviewed rows. | No new version recurrence from cadence alone. |
| **Spiral Abyss / Imaginarium Theater** | `src/ingest/recurring-endgame.ts`: monthly 16th and 1st, respectively, `estimated` projections; reviewed October Theater also present. | **COVERED by existing deterministic model**, subject to ordinary conflict and live-feed verification. | Do NOT re-research or rewrite correct recurrence. |
| **Genius Invokation TCG: Forge Realm's Temper** | `archive/20508.md`: `Available throughout the entirety of Version 7.1` with no standalone exact UTC expiry. | **MISSING, insufficient independent end**. | P2/SCOPE: only estimated/version-linked end with explicit derivation, never direct official exact claim. |
| **Version 7.1 maintenance / mail compensation** | `archive/21946.md`: separate 7.1 eligibility and expiring mail dates. Most historical cutoff dates already past at Oct 28. | **HISTORICAL / out of urgent horizon**. | Reward-mail cutoff tracking needs explicit product rule; no auto-inferred mailbox dates. |

## 7.2 future coverage watch

Publisher announced Version 7.2 **Hour of Ruin** for Nov 4 and an official 7.2 event calendar/preview around Oct 26 (Genshin HoYoLAB account); version-specific named future banners were discussed externally. At Oct 28, the audited *live KQM GINews index* still contains **7.1** notices, not separately dated Version 7.2 wish notices. The fact that a preview exists is a **coverage-watch signal**, not authorization to publish guessed future periods, maintenance completion, banner identities or end times.

Verify exact 7.2 news/wishes against new publisher notice when published; note that an event-calendar graphic is not automatically a machine-readable compliant feed. Do not assume 7.2 starts exactly when 7.1 wishes end or that every previewed character is Phase I.

## Technical root causes and provenance risk

1. **Transport:** current documented GitHub Contents API works, with source snapshot updated Oct 27. Upstream content matches checked-in snapshot. No currently confirmed outage.
2. **Discovery:** 36 notices in KQM index, including numerous dated 7.1 events. This index still cannot be assumed equivalent to all Genshin official social/HoYoLAB events and web events.
3. **Parser:** `entity()` handles only a short headline family (Event Wish, Moontrace, Archon Quest bonus, quoted `"…" Event:`). A date parsed only if `candidate()` finds one of several tightly defined line-prefix formats. This deliberately excludes many event formats and avoids fabricated dates, but silently loses legitimate events.
4. **Phase II weapon identity:** `Epitome Invocation` is intentionally recognized only from notice text with `After Version … update`; no safe phase-specific ID exists for the Phase II raw article yet.
5. **Precision:** source `t_lc` / `t_gl` wrapper semantics should be explicitly verified before using source clock as UTC. `t_lc` may correspond to server-local clock; `t_gl` a fixed global clock. Reviewed exact ends must not be overwritten by day-only automatic candidates or re-keyed. A `day` placeholder is not exact local deadline.
6. **Health:** `eventCount=10` is nonzero while important expiring families/notice articles are unrepresented. Add later family-level completeness expectations to Source Recovery R1, rather than treating 200/304 as sufficient.
7. **Publication safety:** no guess at end for explicitly `version-long` event unless version boundary provenance + estimation treatment is a separate reviewed decision. Separate a timed limited reward from permanently available systems and from purchasable cosmetics.

## Suggested bounded milestones (independent; do not implement in this audit)

**G1 — P1 checked-in-source / reviewed-data restoration.**
Use `archive/21053.md` (Overflowing Favor), `archive/21901.md` (Starlight Voyage + earlier quest cutoff), `archive/21890.md` (Phase II Epitome Invocation), and compare `archive/21891.md` (Carefree Snowball Fight precision). This is the smallest high-value repair to restore deadlines before Oct 29 / Nov 2 / Nov 3. Prefer smallest deterministic source fix where possible; reviewed fallback with evidence if safe. Retain all 19 reviewed rows and previously published stable IDs. Confirm UTC/region semantics before exact publishing.

**G2 — parser's broader source-coverage gates.**
After G1, carefully support more known notice structures: standalone Duration heading+next line, prose `Participate in` headline, phase-distinct weapon identities, rewards/web-event windows, explicit global vs server clocks. Regression fixtures from actual checked-in notices, not arbitrary page scraping; prevent duplicates, false positives, source version collisions, parser zero and sharp-drop. Make tracked category choices explicit.

**G3 — controlled Miliastra & web-event product-scope decision.**
Choose which recurring Miliastra systems/limited cosmetics vs free reward expiries belong in Calendar; ensure the private user sync and existing localStorage keys are not affected. Categories remain independent, no blanket inclusion of every shop notice.

**G4 — future source-coverage surveillance (later Source Recovery R1).**
Expect per-family Genshin wishes (character phase, **weapon phase**), double-drop, main limited events, recurring modes and any approved web rewards. Fixture `KQM 200 + 10 parsed but Overflowing Favor and Phase II weapon missing` must surface coverage incident. An announced 7.2 preview without official exact phase period must only produce `watch`, never estimated published dates.

## External references read for corroboration

- Official HoYoLAB Genshin account index (Oct 2026): https://www.hoyolab.com/accountCenter/postList?id=1015537 — publisher posts for `Overflowing Favor`, `Carefree Snowball Fight`, 7.2 event calendar/overview.
- Official Version 7.1 Phase II event preview (Oct 12): https://genshin.hoyoverse.com/en-us/news/detail/166666
- Official individual `Carefree Snowball Fight` post: https://www.hoyolab.com/article/47130835
- Secondary verbatim Phase II wish announcement reproduction: https://traveler.gg/version-7-1-event-wishes-notice-phase-ii/
- KQM current source root https://github.com/KQM-git/GINews; notice IDs `21053`, `21890`, `21891`, `21901`, `21895`–`21900`, `21908`, `21946`, `21884`, `21761` above.
- Secondary discovery only: https://senseos.gg/wiki/genshin-impact/wishes-and-events/ and https://www.gacha.gg/genshin-impact/news . Secondary dates not promoted to authoritative where the actual notice is absent.

## Validation/next step

This is a research-only source/data audit. **No ingestion code, reviewed records, snapshots, workflow or production feed modified.** New external site/Actions runner viability NOT tested. Live deployed JSON NOT independently downloaded. Claims of existing coverage refer to checked-in reviewed data and deterministic implementation, not an operator in-game timer capture.

**Next concrete step:** operator chooses a separate **G1** minimal urgent recovery or continues the same audit format with **WuWa**. Completing this research PR is not approval to start G1/G2, Source Recovery or Timeline v2.
