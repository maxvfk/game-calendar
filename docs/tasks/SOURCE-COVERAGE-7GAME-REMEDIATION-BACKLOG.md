# Seven-game Source Coverage — Ranked Remediation Backlog

**Status:** PLANNED / RESEARCH SYNTHESIS ONLY, **NO IMPLEMENTATION AUTHORIZED**.
**Checked:** 2026-10-28. **Main baseline:** `0f8042d1b86c09210b46573b42058dcc128ddb3b`.
**Owner workflow:** one short-lived branch / one bounded game-specific milestone / real CI / PR / controlled merge / post-merge Pages and player-visible check. Re-read CURRENT main before every milestone.

## 0. Decision and scope

The seven **separate current-version research audits are complete and merged**. They found three operationally distinct failures:

1. **Wrong published deadline** (source conflict / reviewed reconciliation), potentially causing a player to miss rewards.
2. **Source exists, parser misses it** (current release notice skipped, extraction template too narrow).
3. **Whole announcement family absent from active source/index** (healthy banner feed cannot discover seasonal events; a version notice feed cannot discover separately posted wishes).

The calendar's core promise is "what ends soon and what must I finish?" Thus prioritize **real imminent expiring rewards and wrong confident deadlines** over nice-to-have UI, historical completeness, large ingestion redesign, or speculative predictions. A missing event is better than a fabricated timestamp.

**No gameplay data, source adapters, snapshots, workflows, secrets, Account Sync, CZN Daily Reset, editorial Timeline registry or production deployment changes in this milestone.** The backlog itself is NOT approval to implement any item. Existing unrelated **Timeline PR #115 remains NO GO** and **Source Recovery R1–R3 design PR #113 remains pending independent review**; do not merge either by side effect.

This is a frozen, **as-of-2026-10-28** prioritization using prior audits and source snapshots (mostly last confirmed Oct 27). Before each implementation, re-check live official notices, the feed winner, current main and post-audit merges. Do not convert stale research into a later "current event" claim.

## 1. Canonical evidence — seven per-game audits

| Game | Audit | Verified healthy components to preserve | High-impact remaining defect |
|---|---|---|---|
| HSR | [HSR 4.6](../research/hsr-source-coverage-audit-2026-10-28.md) | Lightward/MoC/PF/AS four official windows fixed PR #119/#120 | Four live character/Light Cone channels until Nov 10; Park reward claims; stale Anomaly Arbitration |
| Genshin | [Genshin 7.1](../research/genshin-source-coverage-audit-2026-10-28.md) | Phase II character wishes; Abyss/Theater recurrence | Starlight early Oct 29 quest cutoff; double artifact drops Nov 2; Phase II weapon Nov 3 |
| WuWa | [WuWa 3.7](../research/wuwa-source-coverage-audit-2026-10-28.md) | Four Phase II reruns; ToA/Whimpering Wastes estimated cadence | 3.7 patch title/date anchor drops events; new Suoming/weapon absent from source's dated banner index |
| Endfield | [Endfield 1.6](../research/endfield-source-coverage-audit-2026-10-28.md) | Phantasia season and reviewed Cycle I/II; eight event-page candidates | Maras **wrong wiki deadline**; all Si/Tangtang banner/issue families missing; upcoming Contingency Readiness |
| ZZZ | [ZZZ 3.3](../research/zzz-source-coverage-audit-2026-10-28.md) | Eight official update events; Phase I 4 channels, Audition, 14-day estimated endgame | City Fund and distinct claim/reward deadlines; Phase II conditional watch, not yet confirmed missing |
| NTE | [NTE 1.4](../research/nte-source-coverage-audit-2026-10-28.md) | Official Steam transport, Akane+Arc, current BTR cycles | Entire Sept 29 official 1.4 schedule skipped by title allowlist; five important expiring events |
| CZN | [CZN Season 5](../research/czn-source-coverage-audit-2026-10-28.md) | Six officially timed reviewed banners; 18:00 UTC Daily Reset; conditional Great Rift helper | Prydwen banner-only: missing Oct/Nov endgame, Overdrive, 1st Anniversary rewards/gifts, season |

**Evidence strength:** "confirmed from checked-in source/official notice" is NOT a fresh independent live Pages JSON smoke test. These research audits intentionally did not run new Bun builds or independently download the deployed feed. Implementation must validate actual merged winners and production separately. Do NOT add input counts together as published event counts.

## 2. Triage policy

| Class | Meaning | Implementation order |
|---|---|---|
| **P0** | Confirmed actively wrong published expiry OR near-immediate *free gameplay/claim* deadline absent, where a delay risks real rewards. This is urgency **for remediation**, not an assertion of a production outage. | Smallest scoped, separately reviewed hotfix; do not wait for unattended ingestion |
| **P1** | Confirmed important missing active/near-future banners, events, timed challenges or time-limited rewards with published reliable boundary. | Next in deadline order, each as one bounded game-specific PR |
| **P2** | Historical backfill, optional secondary rewards or precision improvements without near-term player loss; systematic source robustness after urgent data recovery. | Queue after P0/P1 |
| **WATCH / BLOCKED / DECISION** | Official exact date absent, source inaccessible, or scope (web/shop/paid/livestream) undecided. | Research/gate only; **no synthetic dates**, no automatic publication |

Within a class, prioritize **earlier true deadline**, **free/rare reward value**, **false confidence severity**, and **scope/validation effort**. A not-yet-official banner Phase II is WATCH, not a failing source. Do not relabel existing `estimated` recurrence as `official`.

## 3. P0 — first three independent hotfixes

| Order / ID | Bounded scope | Evidence / boundary | Acceptance and stop |
|---|---|---|---|
| **1 · SC-P0-GEN-STArLIGHT** | **Genshin**: restore `Starlight Voyage: Heart Unbound` main event and **distinct early quest cutoff**, using **already checked-in** GINews `archive/21901.md`. | Quest ends **2026-10-29 04:00 game-server clock**; event itself ends Nov 2 03:59 server. **Asia server clock:** early cutoff is **Oct 28 20:00Z**; Europe fixed UTC+1 **Oct 29 03:00Z**; America fixed UTC−5 **Oct 29 09:00Z**. | Publish both (or single event + explicit subdeadline if supported), correct per-region time and start precision; no new event-ID collision. Since deadline is imminent, **first**. Recheck whether it has already elapsed by release; do not knowingly ship an expired reminder as "upcoming". |
| **2 · SC-P0-CZN-GIFTS** | **CZN**: reviewed-source-backed 1st Anniversary **daily mail gifts** and distinguish *ordinary 24-hour claims* vs Oct 21 / Oct 28 long-lived exception items. Do **NOT** change Daily Reset. | Mail delivery **06:00Z**; ordinary claim window 24h, final Nov 3 gift claim ends **Nov 4 05:59Z**; Oct 21 sticker / Oct 28 background claim ends **Nov 30 14:59Z**. | Make each advertised deadline visible without multiplied/duplicate gifts; verify source wording and minutely precise exception; tests must distinguish 06:00Z mail and standing 18:00Z daily reset. Scope stays rewards, not Sync. |
| **3 · SC-P0-END-MARAS** | **Endfield**: reconcile *existing* `Monumental Etching: Forest of Maras` winner with official **Sanctuary of Ink** notice `/9560`; **same stable ID**, no global timezone patch. | Official **2026-11-05 04:00 server** ⇒ Asia **Nov 4 20:00Z**, western (Americas/Europe) **Nov 5 09:00Z**. Wiki snapshot wrongly claims **Nov 4 22:00Z / Nov 5 22:00Z** (+2h / +13h). | Verify wrong wiki row actually wins current feed; fix only impacted source-reconciled reviewed winner; preserve source provenance and exact regionEnds; no new merge conflict/duplicate; 3-region before/at/after cutoff tests and post-merge Pages check. |

If work can proceed in parallel, keep **three separate PRs and game scopes**, each rebased against current main; never hide one game's failed validation inside another's PR. It is acceptable to complete the deterministic Maras fix before CZN gifts if execution capacity or evidence blockers dictate; keep the Genshin Oct 29 deadline first.

## 4. P1 — time-bounded remediation queue

Dates below are in publisher-defined game server clock unless explicitly `Z` / `UTC+8`. Include published exact clocks, not inferred release cadence. All tasks are **OPEN** as of audit; recheck current main before execution.

| ID / nominal order | Game · bounded goal | Known deadline / source basis | Precondition / critical safety |
|---|---|---|---|
| **SC-P1-GEN-EXPIRIES** | Genshin: `Overflowing Favor` double artifact drops, Phase II `Epitome Invocation` weapon channel, and `Carefree Snowball Fight` currently day-only precision. | Overflowing Favor **Nov 2 03:59 server** (`archive/21053.md`); weapon **Nov 3 14:59 server** (`archive/21890.md`); Carefree **Nov 2 03:59** (`archive/21891.md`). | Already in KQM snapshot. Keep existing reviewed IDs and one phase-distinct weapon banner channel; avoid blindly changing day-precision without clock proof. May split drops and weapon if smaller. |
| **SC-P1-END-CURRENT** | Endfield: officially announced **Si** + **Tangtang** character banners, separately their issues `Seal of Jade` and `Tender Sprig`, plus **Contingency Readiness**. | Si end **Nov 5 11:59 server**, Tangtang starts **Oct 29 12:00** and ends Nov 19 11:59; Contingency Readiness **Oct 29 04:00 → Nov 5 04:00** server, official `/9560`. | Use reviewed first-party evidence; `Seal of Jade` ends after three Chartered banners ⇒ **unknown exact end**, not Si's end. Preserve region mapping Asia +8 / West −5, distinct character vs arsenal IDs. Split if needed. |
| **SC-P1-CZN-OVERDRIVE** | CZN: `Overdrive: Simulation` double growth period. | **Nov 3 18:00Z** exact, Oct 21 STOVE 1.5/anniversary patch content. | One small reviewed record; no Daily Reset edit. |
| **SC-P1-WUWA-37-PARSER** | WuWa: deterministic 3.7 patch title/date anchor + decorated `✦Duration` + nested identity; restore `Cubie Wars`, `Dreams in the Capsule`, `Gifts of Waking Moon`, `Gifts of Singing Drizzle`. | Source `Kuro Atom article 5571` already captured; deadlines **Nov 11 03:59/11:59 server**. | Wrong identity `[Special Events] [Cubie Wars]` can create `Special Events` ID if only anchor fixed. Guard scope, preserve after-update day start and three-region ends; regression real snapshot. |
| **SC-P1-WUWA-NEW-BANNERS** | WuWa: new Suoming `Nine Deaths, One Unbent Heart` and `Unspoken Rue` current Phase II, missing despite four reruns working. | Kuro patch `5571` names them; `5668` only lists four reruns, not individually dated new banner windows. | **VERIFY exact first-party announcement/clock** first; if not established, mark BLOCKED and retain expected-family incident, never borrow rerun clocks silently. Separate W2 source discovery gate. |
| **SC-P1-HSR-BANNERS** | HSR: four active Version 4.6 Warp channels: Pearl + `Colors for Tomorrow`, Mortenax Blade + `Reforged in Hellfire`. | All end **Nov 10 15:00 server**; Phase II source official HoYoLAB `article/47142215`. | Two character and two Light Cone channel IDs; Pearl continuous across phases **once**, not duplicate Phase I/II; explicit three-region ends. Restore through reviewed hotfix before broader publisher discovery. |
| **SC-P1-NTE-14-SKIPPED** | NTE: extend *verified release-notice selection*, restore `Circle Gifts`, `Terminal Depths`, `Pukaland Travelogue`, `Coal Lump's Treasure`, **1.4 Circle Bounty**. | Same first-party Steam API `gid 1844751498233952` skipped because title **`Log in`** not `login`; Circle Bounty expires **Nov 10 23:59 UTC+8 (Nov 10 15:59Z)**, others mostly Nov 11 **05:59 UTC+8 (Nov 10 21:59Z)**. | Do not remove fail-closed year requirement from standalone articles; use verified version notice context. Keep 1.3 Circle Bounty prior 24h source conflict and all 15 existing reviewed rows; prove candidates become published winners. |
| **SC-P1-CZN-SEASONS** | CZN: current **Basin of Hyperspace** Oct21–Nov11 and **Full-Scale Offensive** Sept30–Nov11; reconcile stale old `Full-Scale Offensive — Season 4` `endsAt:null`. | Explicit STOVE Oct21/Sept30 version notices; ends **before Nov 11 maintenance**. | No speculative maintenance-completion time, no +21d cadence. Preserve old IDs and source-backed historical boundary; one logical phase per record. |
| **SC-P1-HSR-CLAIMS** | HSR: `Astral Trendible` availability + `Park Souvenir` claim expiration (two distinct mechanics). | Both **Nov 11 06:00 UTC+8**, directly in checked-in KQM 4.6 update under `Availability` / `Claim Period`. | Small extraction/regression or reviewed fallback; do not represent permanently accessible Park as expiring. |
| **SC-P1-CZN-CARNIVAL** | CZN: **Nightmare Carnival** / **70 free Normal Rescues** expiring Dec 2 before maintenance; **Additional Aether** independently ends Nov 11 before maintenance. | STOVE publisher-announced anniversary periods. | Separate parent/subdeadline without double-counting; no guess about exact maintenance instant; favor explicit reminders for expiring free unused attempts. |
| **SC-P1-CZN-SEASON5** | CZN: `Galactic Disaster Season 5: A Promise Upon the Snow`, Nightmare Dream Park, Rossweisse Trauma Code, Celestial Bulwark stage unlocks and season rewards. | Season/Dream Park through **Dec 23 before maintenance**, Trauma Code through Dec 2; **Seraphion Oct 28 02:00Z** and **Enforcer Seraphion Nov 4 02:00Z** unlock. | Pick compact nonduplicated family-level records; do not pretend a stage unlock is an expiry. Official parent vs phase must be precise. |
| **SC-P1-END-UPCOMING** | Endfield: upcoming Fervor, `The Stars Are With Me`, Contingency Contract, Secret Sanctuary shop cutoff, region-exception Nov Sanity Supply. | Fervor starts **Nov 5 12:00 server**, Contract shop ends **Dec 3 04:00 server**; Nov Sanity windows have exceptional West cutoff. | Preserve unknown end for "until next maintenance". **Do not reopen repaired Phantasia Cycle I/II** or force invalid wiki season cycle start. |
| **SC-P1-ZZZ-REWARDS** | ZZZ: issue-fix compensation claim and **New Eridu City Fund** main reward ending. | Compensation **Nov 20 23:59 UTC+8 = Nov 20 15:59Z**; City Fund **Nov 30 03:59 server**, paid purchase cutoff **02:59 server**. | Reward reminder is a gameplay scope candidate; **paid purchase cutoff is a separately approved product decision**. No need to rewrite official Steam+Zenless.gg event/Phase I ingestion. |

**Sequencing:** These are risk-ranked candidates, not automatic source-of-truth for today's date. Some P1 windows end before earlier rows in this table; move them ahead if source re-check shows the clock is nearer. PRs stay **game-specific** and **small**. Free rewards and incorrect expiry notices outrank historical backfill.

## 5. P2 / deferred product gates

| ID | Game / topic | Gate or disposition |
|---|---|---|
| SC-P2-HSR-HISTORY | HSR Phase I Evanescia/LC, Oct 12–25 Planar Fissure, Aptitude Showcase | Source-backed historical backfill after urgent active channels, preserve IDs |
| SC-P2-HSR-STATE | HSR **Anomaly Arbitration 4.6 Return to Roots** vs reviewed old 4.5 `Return of the Legion` `endsAt:null`; `Fate Contract: Renewal` unknown claim end; Currency Wars reward/reset | Do not keep outdated phases current; require independently confirmed boundary or honest `endsAt:null` / `estimated` version derivation |
| SC-P2-GEN-OTHER | Genshin Starlit Gala, Miliastra free rewards, Raiment Collection, Moonlit Season, 7.2 preview | Explicit opt-in for Miliastra/web vs cosmetics; 7.2 future exact phase dates WATCH; no fabricated dates |
| SC-P2-WUWA-OTHER | WuWa historical Hsin and Phase I reruns; web `Waking Moon Fishing` / `Back to Solaris`; 3.7 Endstate Matrix | Require web-event product decision; web UTC+8 **global**, not regional; Matrix explicit source not 28d pattern |
| SC-P2-END-STATE | Endfield 1.5 `Resplendent Spectrum` open-ended vs current 1.6, `Deep Cold Issue` special ending, wiki `Yuanyuan's Blazing Stoves` exact expiry vs official relative wording | Resolve distinct closing conditions; no global "next version" mass inference or ID deletion |
| SC-P2-ZZZ-WATCH | ZZZ 3.3 Phase II Severian/etc | **WATCH** until separately dated official notice. If published later and secondary RSS fails to index, open discovery incident then, not now |
| SC-P2-ZZZ-SHOP | ZZZ Limited Spookies/Enigma shop and Phoenix outfit discount; paid City Fund purchase cutoff | Product choice; permanent items do not vanish when discount ends |
| SC-P2-NTE-HISTORY | NTE Phase I Lacrimosa `Fading Reverie`, `Crime and Punishment`, `The Last Rose`; historical double Fons/pixels | Source already in official Steam launch notice; separate bounded backfill; protect prior 1.3 Bounty source conflict |
| SC-P2-NTE-WEB | NTE Blackbird's Invitation, Porsche boxes, outfit promotions and uncertain individual mail expiration | Product choice; UTC+8 source clock vs ambiguous "server time" distinct |
| SC-P2-CZN-STATE | CZN Great Rift current phase not sourced, Epic Seven × CZN wrong-game **suspected** classification, older open-ended season | Investigate original game target and actual phase before any ID migration/removal; weekly Great Rift only in sourced exact active season |
| SC-P2-CZN-STORE | CZN surprise support gift notice `Nov 10 23:59` **timezone unverified**, season shop & paid bundles | Verify timezone/claim semantics or retain day precision; optional commercial categories |
| SC-P2-CLAIMS-POLICY | Cross-game one-time mail/reward claims, double-drops, temporary free trials vs permanent features | Confirm category/product policy once; don't silently include every store/sale or omit important free claims forever |

**Already solved / keep unchanged:** HSR 4.6 Lightward (#119), ZZZ official Steam + Zenless.gg banner RSS (#109/#112), ZZZ 14d Shiyu/Deadly (#111), WuWa estimated ToA/Wastes, NTE two checked BTR circles, Endfield reviewed Phantasia cycles (#58), CZN verified six banner time repairs (#59/#61), CZN Daily Reset/Sync cutover.

## 6. Sustainable source coverage / R1–R3 dependencies AFTER urgent fixes

| Discovery class | Games, evidence | Independent follow-up |
|---|---|---|
| **Already-fetched notice but skipped parser** | Genshin standalone duration/weapon, WuWa title/metadata and bracket identity, NTE "Log in" main launch, HSR checked-in `Availability` / `Claim Period` | Deterministic narrow parsers and regression against **actual stored source snapshots**; prefer source fixes over perpetual manual patching when safe |
| **Current index missing separate notices** | HSR warp/LC, WuWa new exclusive convenes, future Genshin 7.2 notices | Compliant source discovery (index + detail), actual Actions runner proof, publisher provenance and fail-closed robots; use reviewed interim patches for current real deadlines |
| **Only banner source, not general event notices** | CZN Prydwen; Endfield wiki.gg Event page | Separate official/STOVE/Gryphline notice index and constrained parser after access gate, not broader banner regex |
| **Already good for approved families** | ZZZ current Steam update and Zenless.gg channel RSS; NTE Steam API + BTR | Reuse tested infrastructure. Introduce family coverage assertions, not new source research by default |
| **Official-vs-secondary disagreement** | Endfield Maras; Endfield Echoes western opening; HSR/CZN stale reviewed endgame | Preserve explicit precedence, conflicting-time alarm, reviewed correctness, LKG and stable IDs |
| **R1 Coverage Health future** | All seven: per-family positive expectations, known notice evidence, negative no-announcement guard, cron completion and freshness | Design already in **PR #113**, review before implementation; R1 deterministic GitHub incidents, no AI |
| **R2/R3** | Reviewed/failing source incident after R1; Claude Pro Timeline OAuth infrastructure already proven for no-tools jobs | Separate tool-capable sandbox/security/PR-CI pilot; **PR + notify + STOP** for both, **never auto-merge**; leave design review independent of this data backlog |

**Do NOT use source-health "green" / HTTP 200 / a nonzero eventCount to close an incident if a required family is absent.** Conversely, a not-yet-published notice is WATCH, not confirmed P0.

## 7. Uniform implementation acceptance contract

For each separately authorized item:

1. Fetch **CURRENT main**, `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`, this backlog, *only its game's* research report, actual checked source and affected code/tests. Check recently merged fixes to avoid duplication. Revalidate exact official date and article before publishing.
2. Determine **current actual feed winner** and source/reviewed overlap, not just candidate counts; preserve all existing event IDs/completion keys, original `firstSeenAt`, regional clock mapping, `day` vs `exact`, `official` vs `estimated`, and LKG behavior. No unrelated reviewed updates.
3. Pick smallest repair: (a) reviewed official record for urgent missing family with no reliable unattended extraction; (b) narrowly fixed deterministic existing parser for stored official source, real fixtures; (c) separate source discovery only under a permitted runner/robots gate. No generic regex that extracts arbitrary pages.
4. Test pre-/at-/post-expiry **UTC** cutoffs, selected game-server regions, duplicate winner/ID collisions, reviewed-vs-automatic priority, publication when source returns healthy but incomplete data, and unrelated games. Distinguish **future/upcoming** from historical expiration and do not claim fully live Pages validation from only a local replay.
5. Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`, plus relevant `build:feed` / real runner refresh and source-output equivalence where needed. Do not declare completed if material validation is skipped. PR CI and **post-merge** CI/Pages must pass; inspect actual deployed event(s), and ask operator to check phone/app where appropriate.
6. Update `docs/IMPLEMENTATION-STATUS.md`: done/blocked, source evidence, exact IDs/boundaries, tests, CI/Pages, unverified risks and one **Next concrete step**. Keep the backlog status in sync for each completed item. No broad audit redo.
7. STOP when the bounded game-specific milestone is done. Do not automatically proceed to the next item, Source Recovery, Timeline editorial, Sync or Daily Reset.

## 8. One next concrete step

**Create/authorize only `SC-P0-GEN-STARLIGHT` (Genshin's missing Oct 29 early cutoff) as the first short Work.** Ground it in `archive/21901.md`, preserve 7.1 reviewed precedence/IDs and per-region server clock, and require end-to-end feed/Pages verification. Time is critical: Asia's quest cutoff corresponds to **Oct 28 20:00Z**, less than a day after this synthesis. Do not implement the other P0/P1 items in that Work.

**After that single hotfix**, choose a new short Work for CZN anniversary gift claims or Endfield Maras precision correction based on which verified deadline can still be usefully corrected. This backlog is **planning only**.
