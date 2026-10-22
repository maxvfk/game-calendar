# Event time precision audit — 2026-10-22

**Status: research complete; implementation not started.** Audit baseline:
`581d36f25e05dcfebc726ca07118492bd2cd9bd5`; delivery branch starts at CURRENT
main `6afe31b6bc7a7ec3040512c4e0863ea054bdc9d0`. The intervening #55 merge
changes only Daily Reset research/status; audited runtime and data are identical.
Evidence checked on **2026-10-22, 11:28–11:42 UTC (14:28–14:42 Moscow)**.

## 1. Verdict and scope

There are confirmed, bounded precision gaps, but no justification for globally
trusting machine countdowns or replacing every day date with midnight.

- **CZN Sereniel/Peko:** their historical end is independently supported as
  **2026-10-21 00:00 UTC**. The official event period ends before that day's
  maintenance; its separate notice explicitly schedules maintenance at 00:00.
  The archived Prydwen attributes agree for these two cards. They are absent
  from today's source/feed, so this is a confirmed historical loss, not a
  still-live banner or a reason to republish expired records.
- **Current CZN:** Nine/Alcea and announced Tiphera/Tiana have explicit UTC
  windows in STOVE, but the feed has day/day. Rossweisse/Sig have a confirmed
  05:00 UTC opening on Oct 21, while the feed still has day starts. Their
  future Dec 2 maintenance-linked end needs a dated maintenance notice before
  this audit recommends exact promotion.
- **Genshin:** the two current Phase II character banners lose the published
  14:59 server-time end. The bounded primary/mirror evidence supports a reviewed
  correction for those two ends; it does not establish a universal contract for
  every `t_lc`/`t_gl` tag.
- **HSR, WuWa, ZZZ and recurring paths:** many day starts represent regional
  openings or “after update”, rather than a single known global start.
  The current schema has `regionEnds` but no `regionStarts`. Retaining day
  starts is preferable to passing Asia's opening to all readers.
- **NTE:** server-time-only periods are intentionally day/day. The audited
  source does not specify their region-to-UTC mapping. Explicit UTC+8 periods
  remain exact. This is a source/representation limit, not proof of lost,
  independently established UTC instants.
- **Endfield:** the active ordinary-event parser preserves all timer instants
  and regional ends. Reviewed relative unknowns remain justified. Echoes /
  Phantasia recovery is excluded and stays with its separate completed research.

Two separate implementation tasks accompany this report:
[CZN reviewed precision](../tasks/CZN-VERIFIED-BANNER-TIME-PRECISION.md) and
[Genshin Phase II ends](../tasks/GENSHIN-PHASE-II-VERIFIED-END-PRECISION.md).
Neither task is executed here.

## 2. Method, production boundary and publication check

Read `AGENTS.md`, implementation status, the audit task, all active adapters,
their parsers/tests, all seven reviewed files, schema/reviewed materialization,
merge/sanitization, recurring generation, build-feed, shared time helpers and
Event Detail rendering. Then selected external checks from that inventory.
This is not a repeated source-coverage or Daily Reset investigation.

Production selection is `ADAPTERS`, not every parser exported in
`src/ingest/parsers/index.ts`: tracked game plus `scheduled !== false`.
Eight automatic adapters are registered for the seven games. ZZZ has no active
automatic adapter. Game8 for all seven and Genshin Fandom are retired diagnostics;
other inherited-game parsers are outside the shipped-game set.

Parsed each of the seven non-Echoes current snapshots offline and compared the
merged results with reviewed records. No current same-ID automatic exact boundary
was suppressed by a day/unknown reviewed winner. Merge chooses a whole
higher-confidence record, so that remains a future hazard, not a newly proven
current defect. Seven direct parses: Genshin 10, HSR 7, WuWa 7, CZN 10,
NTEBuild 3, NTE Steam 49, Endfield ordinary Event 6. Only the already documented
NTE Circle Bounty dispute appears in this comparison.

The public [feed](https://maxvfk.github.io/game-calendar/data/events.v1.json)
was downloaded directly during this audit: `generatedAt:
2026-10-22T11:30:52.212Z`, **176 records / seven games**.
All IDs and start/end/precision/regional boundary fields match the local
unchanged build (`generatedAt: 2026-10-22T11:36:38.849Z`).
These totals include retained historical reviewed records; they are not counts
of currently running events. No browser smoke or production repair is claimed.

Current snapshot confirmations are Oct 22 10:19:41–48 UTC for the seven
non-Echoes sources. All eight local snapshot body hashes were checked against
their metadata. The Echoes confirmation remains Oct 14; it was not re-researched.

### Seven-game matrix

Counts below are **start exact/day/unknown; end exact/day/unknown**, over the
176 published records, including historical ones. Precision is not provenance:
an exact estimated boundary is still estimated.

| Game | Active production paths | Published counts | Intentional treatment / assessment |
|---|---|---:|---|
| CZN | Prydwen + reviewed; bounded Great Rift weekly generator | 25; start 13/12/0; end 7/17/1 | All ten current Prydwen cards are day/day; empty source ends can be unknown. Confirmed source-specific gaps; blanket downgrade still protects against false clocks. |
| Genshin | KQM GINews + reviewed + Abyss/Theater rules | 25; start 1/24/0; end 19/5/1 | Tagged clocks discarded by parser. Reviewed exact regional ends already recover most notices; two current Phase II banners remain day/day. Other tag mappings unresolved. |
| HSR | KQM HSRNews + reviewed | 20; start 0/20/0; end 18/0/2 | Explicit global boundaries supported as UTC+8; server starts become day, server ends retain regional exactness. No current lost exact end found. |
| WuWa | Kuro Atom mirror + reviewed + Tower/Wastes rules | 26; start 0/26/0; end 26/0/0 | Server clocks retained for regional ends; fixed-clock/after-update starts become day. Regional start information is omitted; no end downgrade found. |
| ZZZ | Reviewed only | 17; start 0/17/0; end 17/0/0 | All starts day, all ends exact, including the previously repaired Potential Hypothesis version end. No active automatic downgrade. Fresh primary full text partly inaccessible. |
| Endfield | wiki.gg Event + reviewed; Echoes adapter withheld separately | 10; start 6/4/0; end 8/0/2 | Ordinary timers exact; reviewed after-update starts and relative banner ends conservative. No ordinary-event end loss found. |
| NTE | Official Steam + NTEBuild BtR + reviewed | 53; start 14/39/0; end 41/12/0 | UTC+8 clocks exact, server-time-only clocks day, after-update starts day; BtR dates expand under an existing estimated rule. Mapping uncertainty prevents safe universal promotion. |

## 3. Code-based candidate inventory

Line anchors refer to the audited runtime commit above; linked files are
authoritative for complete predicates. “Active” means registered in production,
not that every historical fixture row is still live.

| Candidate / game | Code anchor | Field and reason | Actual current effect |
|---|---|---|---|
| C1 — CZN hidden countdowns | [prydwen-czn.ts L32–45](../../src/ingest/parsers/prydwen-czn.ts#L32) | Ignores machine start/end attributes; visible dates become day; missing end becomes null/unknown. | Active: ten cards; confirmed and uncertain cases separated below. |
| G1 — Genshin tagged clocks | [kqm-ginews.ts L8, L30–31, L103–119](../../src/ingest/parsers/kqm-ginews.ts#L8) | Regex deliberately captures only calendar date from both tag types; all generated boundaries day/unknown. | Active: two Phase II character banners reach feed as day/day. Many older candidates overridden by reviewed exact ends. |
| G2 — Genshin reviewed calendar dates | `data/reviewed/genshin.json` | To Temper Cycle 5, Godforsaken Frostlands, Carefree Snowball Fight retain day ends; Missive remains unknown. | Active retained rows; missing UTC contract or relative version end, not automatically exact. |
| H1 — HSR server starts | [kqm-hsrnews.ts L51–65](../../src/ingest/parsers/kqm-hsrnews.ts#L51) | Global start exact, server start day; after-update start uses update date only. | Active: Planar Fissure, Interastral Peace Gala and endgame phase starts. All current parsed ends exact. |
| W1 — WuWa server starts | [wuwa-kuro-atom.ts L75–93](../../src/ingest/parsers/wuwa-kuro-atom.ts#L75) | Discards start clock; preserves exact regional end. Relative update gives date only. | Active: Echo Erase (10:00), Artisan's Search (04:00), Beyond the Waves (04:00). No schema for regional starts. |
| Z1 — ZZZ reviewed starts | `data/reviewed/zzz.json` | After-update / server-calendar starts day. | Only published path; no day/unknown ends left. Potential Hypothesis historical null already fixed. |
| E1 — Endfield ordinary timers | [wikigg.ts L79–116](../../src/ingest/parsers/wikigg.ts#L79) | No downgrade: exact earliest canonical start/end with explicit regional ends. | Six current automatic records retain exactness. Earliest start is not a region-specific opening guarantee. |
| E2 — Endfield reviewed relative ends | `data/reviewed/endfield.json` | Deep Cold Issue ends after three chartered banners; Resplendent Spectrum has no verified absolute end in reviewed evidence. | Two unknown ends. Do not manufacture a season-length or cadence deadline. |
| N1 — NTE ambiguous clock | [nte-steamnews.ts L30–63](../../src/ingest/parsers/nte-steamnews.ts#L30) | Only explicitly UTC+8, non-server-time clocks become exact; after-update start stays day. | Gold Clash and Puka Lucky Flip remain day/day despite printed HH:MM. |
| N2 — NTEBuild missing end | [ntebuild-btr.ts](../../src/ingest/parsers/ntebuild-btr.ts) | Date-only JSON-LD checked against existing anchored rule; absent end stays unknown. | All three current captured BtR rows have exact estimated ends. Missing-end branch not exercised by current capture. Not precision loss. |
| R1 — recurring regional starts | [recurring-endgame.ts L46–59](../../src/ingest/recurring-endgame.ts#L46) | Genshin/WuWa rule start is a server-calendar date; ends explicit per region. | Active day/exact records; do not replace start with a universal Asia instant or change established rules in this audit. |
| M1 — reviewed whole-record precedence | [merge.ts L86–108](../../src/ingest/merge.ts#L86), [reviewed.ts L105–128](../../src/ingest/reviewed.ts#L105) | Higher confidence wins, not greater precision; no fieldwise precision merge. | No newly confirmed current same-ID suppression in probe. Future promotions must recheck reviewed overrides and near matches. |

Sanitization does not normally turn validated exact boundaries into day dates.
Reviewed materialization copies the supplied precision flags. The schema pairs
`endsAt:null` with unknown and has no region-specific start map. The main
observed losses originate in source extraction/manual records, not rendering.

## 4. CZN Sereniel/Peko: preserved data versus official evidence

### Capture comparison

| Capture | Sereniel/Peko machine start | Machine end | Visible period / parser result |
|---|---|---|---|
| Repository's own Sep 22 fixture | Sep 30 07:00Z | empty | “From Sep 30, 2026”; day start and true unknown end. Correct at that capture's evidence level. |
| [Oct 20 snapshot at 6681929](https://github.com/maxvfk/game-calendar/blob/668192994aa6aa9ac397602d3cc2cbf970511e05/snapshots/czn-prydwen-banners.html) | Sep 30 05:00Z | Oct 21 00:00Z | Sep 30–Oct 21; parser emits both boundaries as day. |
| Current Oct 22 snapshot, confirmed 10:19:45.992Z | cards removed | cards removed | Ten other cards. Neither banner is in today's source or published feed. |

Historical capture metadata: 190,062 bytes, SHA-256
`a8a3ad09a1e9a6788821f083de4d158abcf96b7697c6256125a4a17a120b39d8`,
confirmed Oct 20 20:42:43.605Z. Current capture: 179,561 bytes, SHA-256
`206ef748464eaeeca38a6ab143b7e9664dce25df53e4c6baafb299a31347eb6c`.
Use the immutable historical GitHub URL to reproduce the case; do not replace
a production snapshot with it.

Historical IDs are `czn:sereniel-rate-up-rescue:2026-09-30` and
`czn:peko-rate-up-rescue:2026-09-30`. The current reviewed file does not retain
these records. The current source's visible web extraction was also opened:
it identifies GLOBAL countdowns and an Oct 21 update date, but omits card
attributes in the extracted text. This report's machine-level current evidence
is the runner's accepted Oct 22 capture, not an invented live DOM observation.
No redundant raw source crawl within the configured six-hour refresh floor.

### Independent resolution

Evidence register entries S1–S4 below give separate official notices:

1. Publisher announcement S1 identifies both agents and the Sep 30 after-
   maintenance through Oct 21 before-maintenance window.
2. S2 confirms Sep 30 maintenance actually completed at **05:00 UTC**.
3. S3 specifies Oct 21 maintenance **00:00–05:00 UTC**, and completed at 05:00.
4. Therefore the supported banner end is **Oct 21 00:00Z**, a maintenance
   entry cutoff, not daily reset, not the new banner's 05:00 opening, and not
   23:59 or the end of the UTC calendar day. There is no basis to subtract
   one minute or second from that cutoff.

The specific Oct 21 00:00Z attribute is thus **notice-aligned**, not merely
accepted because it is ISO midnight. This does not prove the editor's internal
timestamp-generation convention. In-game countdown feedback lacks an absolute
capture clock/server in the supplied audit material and is corroborative only;
no authenticated game timer was observed by this Work.

### Why the parser is still justified

The Sep 22 Narja/Gaya card says Sep 22 07:00Z to Oct 13 00:01Z; reviewed STOVE
records say Sep 22 **18:00Z** to Oct 13 **18:00Z**. The same fixture's Olga/
Emilie 07:00/00:01 values disagree with the maintained official boundaries.
Even the Oct 20 capture gives upcoming Rossweisse/Sig **07:00Z** starts,
whereas actual Oct 21 completion was **05:00Z**. The Oct 22 capture corrects
them to 05:00Z while unstarted later maintenance-linked banners still show
07:00Z. Machine data is mutable and mixes confirmed openings with schedules.

`test/prydwen-czn.test.ts` intentionally pins day/unknown behavior and reviewed
official precedence. Those safeguards should remain. The defect is incomplete
verified enrichment, not “all hidden timestamps should be trusted”.

## 5. Evidence and prioritized findings

**Classification:** P1 = live/upcoming deadline consequence; P2 = opening/status
or historical correctness; P3 = uncertainty/representation follow-up.
Confidence describes this finding, not a proposed blanket source confidence.

| Finding / IDs | Supported source time and UTC | Actual publication | Classification; priority / confidence |
|---|---|---|---|
| CZN Nine / Alcea, `czn:{nine,alcea}-rate-up-rescue:2026-10-13` | S5 explicitly gives paired normal rescue: Oct 13 18:00 UTC → Nov 3 18:00 UTC. | Both Oct 13 00:00Z day → Nov 3 00:00Z day, global; estimated 0.7 Prydwen. | **confirmed lost exact precision**, both fields; P1 / high. |
| CZN Tiphera / Tiana, `czn:{tiphera,tiana}-rate-up-rescue:2026-11-03` | S6 identifies the pair and Nov 3 18:00 UTC → Nov 24 18:00 UTC. Future announced schedule, not observed gameplay. | Both Nov 3 00:00Z day → Nov 24 00:00Z day. | **confirmed lost exact precision**, both fields; P1 / high. |
| CZN Rossweisse / Sig, `czn:{rossweisse,sig}-rate-up-rescue:2026-10-21` | S7 after maintenance Oct 21; S3 actual completion 05:00 UTC. | Both start Oct 21 00:00Z day; end Dec 2 00:00Z day. | Start **confirmed lost exact precision**, P2 / high. End **insufficient evidence for audit-approved exact instant**: future maintenance date only; retain day pending dated notice. |
| CZN Sereniel / Peko (IDs above) | S1–S3: Sep 30 05:00Z → Oct 21 00:00Z. | Historical parser day/day; absent current feed. | **confirmed lost exact precision**, historical; P2 / high. No production backfill required. |
| CZN Virtual Tactical Simulation: Olga, `czn:virtual-tactical-simulation-olga:2026-09-09` | S8 indexed trial subsection ends before Sep 30 maintenance; S2 fixes cutoff at Sep 30 00:00Z. | Existing official reviewed end Sep 30 00:00Z, flagged day. | **confirmed lost exact precision**, retained historical end; P2 / high. Can be a separate, low-priority one-row re-review, not a reason to promote every S8 row. |
| Other CZN Sep 30 day ends: Olga/Emilie, Third Supply, SE-4, Diary, Beach Café | Common notice S8 and Sep 30 maintenance are leads; complete section-specific timing text not obtained for all six. | Six retained day-end rows plus trial above. | **insufficient evidence** field by field; no blanket correction task. Maintenance date alone does not prove each event's association. |
| CZN Great Rift / Basin, IDs in reviewed file | Existing reviewed exact Sep 30 00:00Z. | Both already exact. | **inactive/stale historical example of a defect**; resolved before audit. |
| Genshin Phase II `genshin:void-stars-advent:2026-10-13`, `genshin:la-chanson-cerise:2026-10-13` | S9 duration Oct 13 18:00 → Nov 3 14:59; S10 explicitly calls matched Skirk opening Server Time; S11 carries both endpoints as the same server-clock tag. Bounded synthesis yields Nov 3 **06:59Z Asia / 13:59Z Europe / 19:59Z America** with existing UTC+8/+1/−5 mapping. | Day/day, no regional ends, KQM parser; reviewed file has no Phase II character rows. | End **confirmed lost exact precision**, P1 / high for wall clock, medium-high for bounded regional synthesis. Start information also omitted but a single universal exact start is unsafe. |
| Genshin Carefree `genshin:carefree-snowball-fight:2026-10-21` | S12 confirms Oct 21 10:00 → Nov 2 03:59; S11 has `t_lc`. If server time is separately established: ends Nov 1 19:59Z / Nov 2 02:59Z / 08:59Z. | Reviewed day/day; old calendar URL still canonical. | **insufficient evidence** for this audit to assert zone from accessible primary excerpt alone; primary wall clock confirmed. Do not generalize S10 to every tag/event. |
| Genshin other tagged periods and Missive | Full clock tags exist; Missive ends with version rather than an absolute deadline. Global-looking `t_gl` naming alone insufficient. | Reviewed day/unknown or parser day/day; many other ends already exact. | **correct conservative downgrade / insufficient evidence**, P3. Need exact tag/zone contract or specific dated publisher notice. |
| HSR Planar Fissure, `hsr:planar-fissure:2026-10-12` | S13 mirror: Oct 12 04:00 server → Oct 25 03:59 server. Supported start conversions under existing map: Oct 11 20:00Z / Oct 12 03:00Z / 09:00Z. | Start Oct 12 day; ends Oct 24 19:59Z / Oct 25 02:59Z / 08:59Z exact. | **correct conservative downgrade under present schema** for regional start; confirmed omission of source wall-clock detail, no lost exact end. P3. |
| HSR Fate Contract / Anomaly Arbitration | Existing sources link to version/theme or repeatability without an independently verified absolute cutoff in checked material. | Two unknown ends, retained reviewed rows. | **insufficient evidence**; do not reuse a version maintenance as automatic theme/reward end. |
| WuWa Echo Erase, `wuwa:echo-erase:2026-10-22` | S14 publisher indexed text and mirror agree: Oct 22 10:00 → Nov 9 03:59 server. Starts 02:00Z / 09:00Z / 15:00Z under current map. | Oct 22 day start; ends Nov 8 19:59Z / Nov 9 02:59Z / 08:59Z exact. | **correct conservative downgrade under present schema** for start; no end loss. Current dayStartMs resolves a 10:00 opening six hours too early; representation issue is real, not proof the end is wrong. P2 / high. |
| ZZZ Angels Support Operation; remaining reviewed rows | S15 opens as a shell. Existing reviewed source evidence uses after-update or regional dates and exact ends. | All 17 ends exact; current long-running Angels ends Nov 29 19:59Z fallback with existing regional map. | **insufficient evidence for new start promotion**; no current end downgrade. Earlier Potential Hypothesis null fixed. P3. |
| Endfield Winter Hunt / Deep Cold Issue | S16: after version release → Sep 30 11:59 server, zones explicitly +8 and −5. S17: relative three-banner end, no absolute instant. | Winter start day, ends Sep 30 03:59Z Asia / 16:59Z west exact; Deep Cold end unknown. | **correct conservative downgrade**, high. Ordinary wiki exact ends preserved. |
| NTE Gold Clash Oct 26 / Puka Lucky Flip Oct 29 | S18 official capture: Oct 26 05:00 → Nov 9 04:59 server; Oct 29 05:00 → Nov 11 05:59 server. | Both day/day, global fallback. | **correct conservative downgrade pending region mapping / insufficient UTC evidence**, P3 / high on code, incomplete on actual server clocks. No assumption that BtR or daily reset rules apply. |
| NTE Dazzling Star / BtR | S18 standalone Dazzling start after update, end Nov 11 05:59 UTC+8 = Nov 10 21:59Z. BtR source dates are rule-validated, estimated. | Dazzling day/exact; current BtR exact/exact estimated. | **correct conservative downgrade / no precision loss**. Existing Circle Bounty exact conflict remains distinct. |

Brace notation above abbreviates two literal IDs, not a new ID format.
All UTC conversions are arithmetic on the named fixed server offsets; none use
the reader's Europe/Moscow, browser timezone or current DST offset. No NTE
regional offset is assumed from the generic Asia/Europe/America names.

## 6. Evidence register and access limits

All links checked Oct 22 in the audit window. STOVE and HoYoLAB direct opens
mostly returned JavaScript shells; their fresh indexed primary excerpts supplied
the stated clauses. These are **publisher-hosted indexed evidence**, not a claim
to have read every full notice. No undocumented API, login or access bypass.
CZN.gg attempted article opens returned 403 and were not used as confirmation.

| Ref | URL / evidence type | What was actually available |
|---|---|---|
| S1 | [Official Sereniel/Anika/Peko announcement](https://page.onstove.com/chaoszeronightmare/en/view/14554254) | Indexed publisher text: named pair, after Sep 30 maintenance to before Oct 21 maintenance. |
| S2 | [Official Sep 30 maintenance](https://page.onstove.com/chaoszeronightmare/en/view/14554026) | Indexed publisher schedule 00:00–05:00 UTC and completed at 05:00 UTC. |
| S3 | [Official Oct 21 maintenance](https://page.onstove.com/chaoszeronightmare/en/view/14592548) | Indexed publisher schedule 00:00–05:00 UTC and actual 05:00 completion. |
| S4 | [Standing July 29 content-end change](https://page.onstove.com/chaoszeronightmare/en/view/13882273) | Indexed policy changing maintenance-linked cutoffs from 01:00 to 00:00 UTC; corroboration only, not a universal event cutoff. |
| S5 | [Official Sep 30 update](https://page.onstove.com/chaoszeronightmare/en/view/14555091) | Indexed paired Nine/Alcea normal rescue and explicit Oct 13 / Nov 3 18:00 UTC schedule. Other unrelated sections not presumed verified. |
| S6 | [Official Oct 21 update](https://page.onstove.com/chaoszeronightmare/en/view/14593128) | Indexed paired Tiphera/Tiana and Nov 3 / Nov 24 18:00 UTC period. Search metadata oddly repeats Sep 30 publication date; event text, not metadata date, supports timing. |
| S7 | [Official Rossweisse/Sig announcement](https://page.onstove.com/chaoszeronightmare/en/view/14592676) | Indexed Oct 21 after maintenance to Dec 2 before maintenance. No Dec 2 maintenance notice located/claimed. |
| S8 | [Official Sep 9 update](https://page.onstove.com/chaoszeronightmare/en/view/14502236) | Indexed Olga trial schedule and older rescue context; full text blocked. |
| S9 | [Official Version 7.1 Phase II wishes](https://www.hoyolab.com/article/47010361) | Indexed Oct 13 18:00 to Nov 3 14:59 duration; direct open Loading shell. |
| S10 | [Official Skirk post](https://www.hoyolab.com/article/47031763) | Indexed publisher attribution and explicit Oct 13 18:00 Server Time opening. |
| S11 | [KQM 21888](https://github.com/KQM-git/GINews/blob/master/archive/21888.md), [21889](https://github.com/KQM-git/GINews/blob/master/archive/21889.md), [21891](https://github.com/KQM-git/GINews/blob/master/archive/21891.md) | First two complete archive files freshly read; Oct 22 repo snapshot has all three. Mirror is an extraction surface, not official provenance. Tags alone do not specify offset. |
| S12 | [Official Carefree notice](https://www.hoyolab.com/article/47130835) | Indexed full wall-clock duration; accessible excerpt lacks explicit zone. |
| S13 | [HSR Planar notice mirror](https://github.com/KQM-git/HSRNews/blob/master/archive/1423.md) | Full current snapshot; server labels on both boundaries. Publisher general version page opens only Loading shell. |
| S14 | [Official WuWa 3.7 notes](https://wutheringwaves.kurogames.com/en/main/news/detail/5571) | Fresh indexed Echo Erase server-time duration agrees with captured Atom body; direct page extraction empty. |
| S15 | [Official ZZZ 3.2 notice](https://zenless.hoyoverse.com/en-us/news/166000) | Empty extracted shell; relied on existing reviewed records and earlier research for retained values, not fresh full-text validation. |
| S16 | [Official Winter Hunt](https://endfield.gryphline.com/en-us/news/6172) | Full text: relative opening, explicit Sep 30 11:59 end, +8/−5 zones. |
| S17 | [Official Deep Cold Issue](https://endfield.gryphline.com/en-us/news/4480) | Full text: after version update; ends after three chartered banners beginning with Winter Hunt. |
| S18 | [Official Steam announcement ID 1846651706693892](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1846651706693892), [captured body](../../snapshots/nte-steamnews-official.json) | Oct 22 official API snapshot contains literal server-time windows; web tool could not open externalpost URL. No claim of fresh full page. Standalone Dazzling Star is ID 1847286114027833 in same captured body. |

Immutable baseline snapshots are available at
[581d36f / snapshots](https://github.com/maxvfk/game-calendar/tree/581d36f25e05dcfebc726ca07118492bd2cd9bd5/snapshots).
Reuse these checked-in captures and hashes for repeatable tests; no production
captures were replaced or committed by this Work. Secondary search hits were
leads only and did not establish technical timestamp promotion.

## 7. User impact and safety constraints

The loss is functional as well as cosmetic. Event Detail intentionally prints
a date and “Time unconfirmed” for a day end. Timeline/Next Up sorting, Upcoming
and expiry still use `clockFor`: day dates resolve through `dayStartMs`, not
literal ISO midnight. Thus changing only `endPrecision` may change the
effective deadline even when the stored ISO string remains the same.

For Nine/Alcea's Nov 3 day-only end, current app resolution is Nov 2 20:00Z
Asia / Nov 3 03:00Z Europe / 09:00Z America. The official end is Nov 3 18:00Z
globally: **22 / 15 / 9 hours later**, respectively. This calculation describes
unchanged current event-date behavior; it is not a request to alter the separately
audited Daily Reset clock. For the two Genshin banners' Nov 3 day-only end,
the exact regional 14:59 clock is **10h59 later** than the app's 04:00
server-day boundary in every region.

| Concern | Required handling for a future bounded fix |
|---|---|
| Event IDs and personal marks | `eventId` uses game/title/start UTC date, not end. Exact start conversion can cross a UTC date; explicitly pin published IDs and preserve titles. The proposed CZN 18:00/05:00 starts stay on their existing date, but still assert the whole ID set. Do not remint Genshin IDs. |
| Reviewed timestamps | Keep original `firstSeenAt` for records moving from automatic to reviewed, set per-row `reviewedAt`; retain untouched rows' timestamps. Historical archived auto first-seen is observation data, not proof of opening time. |
| Provenance | Official URLs and confidence belong to verified reviewed rows. Keep Prydwen at estimated 0.7 and mirrors without invented official provenance. Exactness does not confer official status. |
| Merge and conflicts | Keep whole-record confidence policy; do not splice dates from incompatible sources. Recheck same-ID and near-title matches, especially paired CZN normal rescue naming. Any official exact disagreement, even one minute or only a western region, must surface for review. |
| Source-health / LKG | Reviewed enrichment must not mark the automatic source freshly confirmed. Do not edit captures, rebaseline LKG, suppress parser errors or change broken/alert rules. New automatic trust would require a separate validated source contract. |
| Normalization / expiry | Validate per-region starts/ends, day-to-exact rendering, effective expiry and sorting immediately before/at/after each corrected end. Unknown remains null; no duration projection. |
| Account Sync / completions | Marks reference event IDs. Same IDs keep them attached across refreshed feeds; no rewrite of profiles, completion keys, tombstones, daily logs or Sync configuration. Test with preexisting mark state; do not fabricate a migration. |
| Region start gap | An additive `regionStarts` design would affect schema/client/old-feed compatibility and several games. It is outside these reviewed end fixes; do not fill canonical exact start with an Asia-only timestamp to avoid that design work. |

## 8. Minimal recommendations and remaining gaps

1. Execute the **CZN-only reviewed task** first: explicit Nine/Alcea and
   Tiphera/Tiana UTC periods, Rossweisse/Sig confirmed start, unchanged day
   Dec 2 end pending its specific notice. Preserve the historical Sereniel/
   Peko example as a test-only regression, without resurrecting it in production.
2. Execute the **two-row Genshin reviewed-end task** independently. Preserve
   day starts and validate the bounded regional evidence again at implementation.
   Do not modify the generic tag parser on this evidence alone.
3. Historical Olga trial can be re-reviewed later at low priority using its
   verified event-to-maintenance link. Other old CZN records require their
   own complete period clauses; no broad cleanup is implied.
4. For Carefree/other Genshin tags, obtain the relevant publisher notice with
   explicit server/global zone or an authenticated in-game notice identifying
   server and timezone. For regional-start modeling, prepare a separate design
   only if the product needs exact openings. These are evidence/design gaps,
   **not additional implementation tasks** generated from assumptions.
5. NTE server-time windows need an event-specific region mapping; do not import
   the unresolved daily-clock or a BtR rule. For an in-game countdown, retain
   game/version, event identity, selected server, capture UTC clock (and device
   offset), displayed remaining duration, timer rounding and adjacent
   before/after-boundary observations. An isolated countdown screenshot cannot
   establish an absolute UTC cutoff.

No new source transport, generic timestamp promotion, runtime patch, reviewed
record edit, Phantasia work or other milestone is part of this delivery.

## 9. Validation and delivery

Local Bun 1.3.14: frozen install, typecheck, full build passed; final full suite
**1110 pass / 1 existing optional age skip / 0 fail**, 1111 tests across 56 files.
An initial incomplete local materialization lacked two Gitea workflow files and
failed eight file-reading assertions; retrieving the unchanged baseline files
resolved that environment issue. No project code was altered to pass checks.

Build: 176 events / seven games / one existing NTE Circle Bounty conflict.
Direct parser/merge probes and live/local boundary comparison described above
passed. No network Refresh, source data publication or browser smoke was run.
Hosted CI, merge commit and final main verification belong to this report's
docs-only PR, so their SHA/status cannot become self-referential claims here.

**Next concrete step:** separately authorize
`docs/tasks/CZN-VERIFIED-BANNER-TIME-PRECISION.md`; it addresses the nearest
confirmed CZN deadlines without weakening the conservative Prydwen parser.
