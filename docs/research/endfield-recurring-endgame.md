# Arknights: Endfield — recurring endgame calendar research

**Status:** historical baseline retained; Phantasia investigation complete in §17 (2026-10-22), official reviewed-deadline follow-up ready; automatic wiki still blocked

**checkedAt:** 2026-10-22 (original general audit: 2026-09-24)

**baseline main SHA:** `ebcfd2bfd7340330f62b2b53bd0e510fe31e0806`

## Why this exists

Endfield is the last game in the current seven-game recurring-endgame audit.

The main recurring/endgame systems are not one schedule family:

1. **Echoes of War** — permanent seasonal endgame; every season contains 3 limited-time cycles.
2. **Umbral Monument** — permanent endgame stages added over time; temporary `Monumental Etching` reward events accompany some new series.
3. **Contingency Contract** — high-difficulty limited event with internal timed mission updates, but no fixed long-term recurrence has been established.
4. **Trial of Swordmancy** — permanent daily-reward combat facility; useful checklist content, not a seasonal endgame Timeline row.
5. **Etchspace Salvage / Weekly Routine** — weekly progression/checklist systems, not the same class as rotating endgame seasons.

The current automatic wiki.gg source already contains Echoes of War season rows, but the parser currently misclassifies them as `other` instead of `challenge`, which makes them disappear under the Endgame / challenge filter.

## Evidence hierarchy

Primary / official:

- Current Version `Dreamscape of Wind and Snow` update notes:
  https://endfield.gryphline.com/en-us/news/5208
- Current CN official mirror for the same version, including Echoes of War and Umbral Monument update:
  https://endfield.hypergryph.com/news/2653
- Previous `Homecoming` update introducing Echoes of War:
  https://endfield.gryphline.com/en-us/news/5200
- Previous update with Trial of Swordmancy / Contingency Contract / Umbral Monument:
  https://endfield.gryphline.com/en-us/news/0758
- Contingency Contract content-update notice:
  https://endfield.gryphline.com/en-us/news/4484

Strong structured secondary:

- Endfield Talos Wiki Echoes of War:
  https://endfield.wiki.gg/wiki/Echoes_of_War
- Current Season of Illusion:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Illusion
- Season of Virtuality:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Virtuality
- Umbral Monument:
  https://endfield.wiki.gg/wiki/Umbral_Monument
- Trial of Swordmancy:
  https://endfield.wiki.gg/wiki/Trial_of_Swordmancy
- Weekly Routine:
  https://endfield.wiki.gg/wiki/Weekly_Routine
- Etchspace Salvage:
  https://endfield.wiki.gg/wiki/Etchspace

The project already uses the Talos Wiki event page successfully as an unattended automatic source.

## 1. Echoes of War — primary recurring endgame

Echoes of War is a permanent seasonal combat mode.

Official rules:

- the mode remains permanently available;
- each season is split into **3 cycles**;
- each cycle contains **3 stages**;
- stages / cycle rating change when the cycle changes;
- new seasons continue without downtime.

Important reward semantics from the structured wiki:

- one-time Honor rewards for stage ratings do not globally reset each season;
- the **Total Rating resets when a cycle changes**;
- the best cycle rating becomes the season's Final Rating / title;
- stage availability changes per cycle.

Therefore both the **season end** and **cycle boundaries** are meaningful player deadlines.

## 2. Echoes of War is not a blind +7-day recurrence

There is a strong weekly pattern inside a sourced season:

- Cycle II normally begins roughly 7 days after the season starts;
- Cycle III begins roughly 7 days after Cycle II;
- ordinary internal transitions use **04:00 server time**.

However the first and last cycle are often clipped by version/phase boundaries.

Examples:

### Season of Virtuality

```text
Season:
Sep 2 12:00 → Sep 24 11:59 server-context boundary

Cycle I:
Sep 2 12:00 → Sep 9 03:59

Cycle II:
Sep 9 04:00 → Sep 16 03:59

Cycle III:
Sep 16 04:00 → Sep 24 11:59
```

### Season of Illusion

```text
Season:
Sep 24 12:00 / region-adjusted phase start
→ Oct 15 / Oct 14 region-specific season end

Cycle I:
Sep 24 start → Oct 1 03:59 server time

Cycle II:
Oct 1 04:00 → Oct 8 03:59 server time

Cycle III:
Oct 8 04:00 → season end
```

The first cycle is shorter than a full 7×24h block because the season opens at 12:00. The last cycle is clipped by the next version/maintenance boundary.

Implementation classification:

```text
Echoes of War season:
  version/season controlled

Echoes of War cycle:
  source-driven sub-period
  weekly-like internal rhythm
  do not project beyond an explicitly sourced season
```

Use the weekly pattern for validation only.

## 3. Current Echoes of War — Season of Illusion

Current season:

```text
Season of Illusion
3 cycles
```

Structured current boundaries:

### Season

Asia:
```text
2026-09-24 12:00 UTC+8
→ 2026-10-15 11:59 UTC+8
```

Americas / Europe:
```text
2026-09-23 23:00 UTC-5
→ 2026-10-14 11:59 UTC-5
```

This is region-scoped.

### Cycle I deadline

```text
Oct 1 03:59 server time
```

### Cycle II deadline

```text
Oct 8 03:59 server time
```

### Cycle III deadline

The cycle ends with the sourced season boundary, not a synthetic Oct 15 03:59 reset.

For the calendar, the minimum useful output is:

- one season row;
- optionally two cycle-reset markers/rows before the final season boundary.

A cycle marker is preferable to three large overlapping challenge bars if the UI later supports sub-deadlines.

## 4. Current parser bug — Echoes of War classified as `other`

The automatic parser in:

`src/ingest/parsers/wikigg.ts`

calls:

```ts
inferType(`${title} ${typeLabel}`)
```

The source label is:

```text
Echoes of War Event
```

But `inferType()` only recognizes challenge-ish words such as:

```text
challenge
trial
onslaught
abyss
tower
test run
clash
combat
```

Therefore:

```text
Season of Virtuality + Echoes of War Event
→ type: other
```

and likewise for Season of Illusion.

This is a real product bug.

Result:

- the automatic source has the season;
- the Endgame / challenge filter hides it;
- the user can reasonably conclude that Endfield endgame is missing.

Required fix:

- map `Echoes of War Event` explicitly to `challenge`;
- do not globally classify every generic `Event` as challenge;
- add a parser regression test.

## 5. Recommended Echoes of War implementation

Do not replace the existing season event source.

The current wiki.gg automatic event page is useful and healthy for:

- current season discovery;
- exact regional season boundaries.

Add one narrow Echoes-specific layer.

Preferred approach:

1. keep current event-page season row;
2. classify `Echoes of War Event` as `challenge`;
3. extract cycle dates from the current season page / structured cycle table;
4. publish bounded cycle sub-deadlines only for the active/upcoming sourced season.

Conceptually:

```ts
interface EchoesSeason {
  title: string;
  startsAt / region starts: sourced;
  endsAt / region ends: sourced;
  cycles: [
    { index: 1, endsAt: sourced },
    { index: 2, endsAt: sourced },
    { index: 3, endsAt: season end }
  ];
}
```

Do not create an infinite weekly recurrence.

## 6. Umbral Monument

Umbral Monument is permanent endgame.

New stage series are added over time and remain permanently available.

Examples:

- Inorganic Construct;
- Turbidity Manifest;
- Contention of Deathly Silences;
- Howlers of the Crag;
- current/future `Marked by Dark Shadows`.

The stage series themselves do **not** have recurring expiry deadlines.

What does expire is the associated limited `Monumental Etching` reward event.

Examples:

- Corrupting Surge;
- Dirge of Grief;
- Beastly Howl;
- current Version 1.5 `Shadow Marked`.

Implementation classification:

```text
Umbral Monument stage series:
  permanent
  no Timeline end

Monumental Etching:
  explicit limited challenge event
  version/update controlled
  no fixed recurrence
```

## 7. Current Umbral Monument deadline

Current Version 1.5 update announces:

`Marked by Dark Shadows` stage series:

```text
available from 2026-10-05 12:00 server time
permanent thereafter
```

Associated:

`Monumental Etching: Shadow Marked`

```text
2026-10-05 12:00
→ 2026-10-19 04:00
server time
```

This is a concrete current coverage gap identified in the earlier audit.

Add it as:

- `type: challenge`;
- exact regional end;
- explicit official period.

Do not create a recurring `Monumental Etching` cadence from historical gaps; their release spacing is irregular.

## 8. Contingency Contract

`Contingency Contract: Re-Ignition Experimental Operation` is high-difficulty endgame-like content.

Official period:

```text
Jun 19 12:00
→ before version update/maintenance
server time
```

Phase 2 update:

```text
Jun 26 12:00 server time
```

Inside the event:

- a new cycle mission was added every **3 days**;
- updates occurred at **04:00 server time**;
- 7 cycle missions total;
- all stayed available until the event ended.

This is not enough evidence for a permanent recurring Contingency Contract schedule.

Implementation classification:

```text
Contingency Contract:
  explicit limited challenge event
  internal 3-day mission cadence when officially stated
  no long-term recurrence projection
```

If a future CC event appears, ingest its explicit notice independently.

## 9. Trial of Swordmancy

Permanent combat facility.

Recurring reward behavior:

- up to 3 Rewarded Trial attempts per day;
- Reward Doubling attempts are daily;
- Free Trial drop suppression resets at **04:00 server time**;
- Dataplate deck changes every **3 server days**.

This is a recurring resource/checklist loop, but not a seasonal endgame deadline.

The limited `Trial Algorithmics` event was a separate explicit event layered on top.

Recommendation:

- do not create daily Timeline bars;
- reserve this for a future daily/checklist system;
- if another limited Trial event is announced, publish that explicit event normally.

## 10. Etchspace Salvage and Weekly Routine

### Weekly Routine

Official/structured rule:

```text
reset:
Monday 04:00 server time
```

This is account progression/checklist content.

### Etchspace Salvage

Focus Commissions:

- 3 become available each week;
- weekly refresh behavior exists;
- uncompleted commissions can refresh weekly.

Again, this is weekly checklist/resource content, not the rotating endgame Timeline.

Recommendation:

- do not mix these into the current Endgame event rows;
- future checklist/reminder scope may model them.

## 11. Current coverage state

The current automatic wiki source already sees:

- Season of Virtuality;
- Season of Illusion;
- Trial of the Bow;
- ordinary event rows.

Current problems relevant to recurring endgame:

1. **Echoes seasons are typed as `other` rather than `challenge`.**
2. **Echoes internal cycle deadlines are absent.**
3. **Monumental Etching: Shadow Marked is missing from the current snapshot/feed source set.**
4. Umbral Monument permanent stage series should not be represented as expiring events.
5. Daily/weekly routine systems should remain outside this milestone.

## 12. Timing semantics

Endfield official server regions:

```text
Asia:
UTC+8

Americas / Europe:
UTC-5
```

Many ordinary reset boundaries use:

```text
04:00 server time
```

But version/phase launches may use:

```text
12:00 server time
```

or one simultaneous global launch represented differently per region.

Do not normalize every Endfield deadline to 04:00.

For each sourced row, preserve the actual source's regional timestamps.

## 13. Safety / override rules

- Explicit official/version schedule > observed cycle rhythm.
- Echoes season boundaries are source-controlled.
- Do not project Echoes weekly cycles beyond a sourced season.
- First/last Echoes cycles may be shorter/longer because of season boundaries.
- Umbral Monument stages are permanent; only their limited reward events expire.
- Do not derive future Monumental Etching dates from historical spacing.
- Contingency Contract 3-day mission updates apply only to the explicitly announced event.
- Trial of Swordmancy / Weekly Routine / Etchspace weekly behavior belongs to checklist scope.
- Generate only bounded current/upcoming sub-deadlines.

## 14. Required implementation tests

At minimum:

1. **Echoes classification:** `Echoes of War Event` parses as `challenge`, not `other`.
2. **Endgame filter:** Season of Illusion remains visible with only Endgame / challenge enabled.
3. **Season of Illusion boundaries:** preserve exact Asia and Americas/Europe ends.
4. **Cycle I:** deadline Oct 1 03:59 server time.
5. **Cycle II:** deadline Oct 8 03:59 server time.
6. **Cycle III:** uses the sourced season end, not a synthetic +7-day boundary.
7. **No infinite weekly generator:** no Echoes cycle is created outside the sourced season.
8. **Umbral permanent series:** `Marked by Dark Shadows` itself has no fabricated end.
9. **Shadow Marked event:** Oct 5 12:00 → Oct 19 04:00 server time is published as a challenge deadline.
10. **No Monumental cadence:** no future event is generated from historical spacing.
11. **No daily Timeline spam:** Trial of Swordmancy reward attempts do not generate daily event rows.
12. **Stable event IDs:** reclassifying Season of Illusion from `other` to `challenge` does not change its event ID/completion state.

## 15. Immediate handoff to Work

Priority:

1. Fix wiki.gg event classification so **Echoes of War Event → challenge**.
2. Verify deployed/current Season of Illusion is visible under the Endgame filter.
3. Add a narrow Echoes-of-War cycle source/parser for the active/upcoming season page, or equivalent source-driven cycle data.
4. Surface the Oct 1 and Oct 8 cycle boundaries without projecting beyond the season.
5. Add **Monumental Etching: Shadow Marked** from the official Version 1.5 schedule.
6. Keep `Marked by Dark Shadows` itself permanent/non-expiring.
7. Do not add Trial of Swordmancy, Weekly Routine or Etchspace weekly loops to the current endgame Timeline.
8. Run the standard four validation commands from `AGENTS.md`.
9. Smoke-test the Timeline around:
   - Sep 24 Season of Illusion transition;
   - Oct 1 Echoes Cycle I → II;
   - Oct 5 Shadow Marked start;
   - Oct 8 Echoes Cycle II → III;
   - Oct 19 Shadow Marked end.

## Sources

Official:

- Dreamscape of Wind and Snow update:
  https://endfield.gryphline.com/en-us/news/5208
- Current CN official update:
  https://endfield.hypergryph.com/news/2653
- Homecoming / Echoes of War introduction:
  https://endfield.gryphline.com/en-us/news/5200
- Trial of Swordmancy / Umbral Monument / Contingency Contract:
  https://endfield.gryphline.com/en-us/news/0758
- Contingency Contract phase update:
  https://endfield.gryphline.com/en-us/news/4484

Structured Talos Wiki:

- Echoes of War:
  https://endfield.wiki.gg/wiki/Echoes_of_War
- Season of Illusion:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Illusion
- Season of Virtuality:
  https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Virtuality
- Umbral Monument:
  https://endfield.wiki.gg/wiki/Umbral_Monument
- Trial of Swordmancy:
  https://endfield.wiki.gg/wiki/Trial_of_Swordmancy
- Weekly Routine:
  https://endfield.wiki.gg/wiki/Weekly_Routine
- Etchspace Salvage:
  https://endfield.wiki.gg/wiki/Etchspace

Repository:

- `data/reviewed/endfield.json`
- `docs/research/coverage-endfield.md`
- `snapshots/endfield-wikigg-events.html`
- `src/ingest/parsers/wikigg.ts`
- `src/ingest/parsers/game8.ts`

## 16. Source drift investigation — 2026-10-17 (2026-10-18 Moscow)

This dated finding supersedes the historical "current season" references above.
The accepted source-driven architecture and validation contract are unchanged.

### Confirmed source facts

Both live wiki requests returned HTTP 200 after the robots gate was checked.
The Event page discovers **Season of Phantasia**, and its machine-readable timers
agree with that season page's regional header:

| Season region | Published start | Published end | UTC start / end |
| --- | --- | --- | --- |
| Asia | 2026-10-15 12:00 UTC+8 | 2026-11-05 11:59 UTC+8 | Oct 15 04:00Z / Nov 5 03:59Z |
| Americas / Europe | 2026-10-15 23:00 UTC-5 | 2026-11-05 11:59 UTC-5 | Oct 16 04:00Z / Nov 5 16:59Z |

The actual season table explicitly states all three rows as **Server Time**:

| Cycle | Published start | Published end |
| --- | --- | --- |
| I | 2026-10-15 12:00 | 2026-10-22 03:59 |
| II | 2026-10-22 04:00 | 2026-10-29 03:59 |
| III | 2026-10-29 04:00 | 2026-11-05 11:59 |

The table is ordered and contiguous under its existing last-minute/next-minute
notation. The cycle ends fit the regional season ends. The **western Cycle I
start does not**: 12:00 UTC-5 = Oct 15 17:00Z, eleven hours before the same page's
season start at Oct 16 04:00Z. Asia matches. This is an upstream internal
contradiction, not an unrecognized table, timezone format or changed end-minute
convention. No source statement permits treating that first table timestamp as
Asia-only, silently clipping it, or moving either published timestamp.

The parser assumes that explicit Server Time applies in each stated region and
that Cycle I begins with its season. Its rejection is correct under that contract.
The intended correction upstream is **not established** by these contradictory
wiki facts. The last-known-good Illusion snapshot must remain intact; it must not
be relabelled or published as current Phantasia cycles. The separate Event season
row still carries the sourced final deadline; no redundant Cycle III is added.

Sources and reproducible test-only excerpts:

- https://endfield.wiki.gg/wiki/Event
- https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Phantasia
- `test/fixtures/endfield/README.md` records capture provenance and full-body hashes.

### Shadow Marked: reviewed encoding error, not a source disagreement

Direct HTTP 200 capture of the **English official article** on 2026-10-17 at
21:56:39Z, after its robots.txt returned 200 / Allow `/`:
https://endfield.gryphline.com/en-us/news/5208
(full-body SHA-256 `21e81fa09610af3f6982e0afe22683668e517956af23be901c7503cec5141c1b`).

It explicitly gives the Shadow Marked event from Oct 5 12:00 to Oct 19 **04:00
server time**. The article identifies Asia as UTC+8 and Americas/Europe as UTC-5.
The official CN notice https://endfield.hypergryph.com/news/2653 also states
Oct 19 04:00. The current wiki timer `data-end` and tooltip agree with 04:00.
The wiki's static Asia placeholder has a misleading UTC clock/local-zone label;
the parser correctly reads `data-end`, not that placeholder.

The repository introduced 03:59 in reviewed commit `bf4935e`, despite the research
recording 04:00. There is no sourced basis to subtract a minute from this event.
This is not a generic inclusive/exclusive conversion and does not affect banners
whose sources explicitly say 11:59 or cycles whose sources say 03:59.

Correction for `endfield:monumental-etching-shadow-marked:2026-10-05`:

| Field / region | Incorrect reviewed instant | Correct official instant |
| --- | --- | --- |
| `endsAt` / Asia | 2026-10-18T19:59:00Z | 2026-10-18T20:00:00Z |
| Americas / Europe | 2026-10-19T08:59:00Z | 2026-10-19T09:00:00Z |

The actual merge conflict was `endsAt`, first detected in Asia, delta 1/60 hour:
`reviewed-endfield` was retained over `endfield-wikigg-events`. Both records had
the same event ID. The correction preserves that ID, day start, exact ends,
official URL/provenance and original `firstSeenAt`; only this row is re-reviewed.
The current Endfield merge now has zero conflicts. The independent NTE Circle
Bounty conflict remains visible. A regression still requires review for a real
one-minute official/wiki discrepancy.

### Minimal safe operational handling

Keep the source enabled and the existing failure threshold. The existing
`rejected` outcome with HTTP 200 already distinguishes a semantically unusable
body from transport failure. The parser now includes the region and both UTC
starts in the error, without changing any acceptance predicate. No new healthy
or degraded-success state is justified: this source still cannot publish cycles.

Restore offline CI/Pages by correcting the reviewed record and separating
historical regression captures from rolling production snapshots. Keep a current
snapshot merge check, including its zero-conflict assertion, rather than hiding
live conflicts. Publish other validated sources and the season row under the
existing pipeline while Echoes remains unavailable/broken; do not manufacture a
fully green Refresh. Resume Echoes acceptance only when upstream supplies a
consistent explicit regional schedule, then run normal Refresh and verify its
commit's CI/Pages. No new coverage, projected dates or fallback fixture is needed.

## 17. Phantasia cycle coverage investigation — 2026-10-22

**Result:** publication failure reproduced; independent official cycle deadlines
verified. Recommend a bounded reviewed-data follow-up, **not a parser relaxation**.
No runtime, parser, source configuration, snapshot, reviewed record, feed or ID
was changed in this investigation. Sections 1–16 retain their historical findings;
this section supersedes their unresolved primary-evidence status for Phantasia.
Baseline CURRENT main: `0c33ca534c01d6522300c7c6ba0f716502a70b4f`.

### 17.1 Evidence and reproducibility

Fresh direct HTTP reads on Oct 22 (UTC; Moscow = UTC+3):

| Evidence | Retrieved | Result / SHA-256 of full response bytes |
| --- | --- | --- |
| [Current season wiki](https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Phantasia) | 11:06:29Z | 200; revision 66316; `dfcd6151179092c8784fe698bb15063f0a51fbce6c176dd276c0c8c9cadab58d` |
| [Official version notes 9560](https://endfield.gryphline.com/en-us/news/9560) | 11:06:29Z | 200; `ec286972651a16074d995b9ae700851c094ab92bdd6b5917c8dacb0c3dc6b21c` |
| [Official @AKEndfield cycle announcement](https://x.com/AKEndfield/status/2109871758140711172) | 11:08:00Z | 200; rendered text and media URL present; `6052b37659d7ea0b0ee555bf784e278bc62fb0fd3e71c8ff892230ea139a81a2` |
| [Official post's cycle infographic](https://pbs.twimg.com/media/HUPRW3QbgAAK4sK?format=webp&name=large) | 11:08:33Z | 200; visually read; `d9fade5c7075f4e7e7c377f45112e4546b4762a5f89ba4fd2b145f122476e3ae` |
| [Deployed feed](https://maxvfk.github.io/game-calendar/data/events.v1.json) | 11:06:28Z | 200; `b84c99575c943e9aaaae6a7712df180dd1da1a8ff4cc249776dcdbf1af5ffa8d` |

Read wiki/official robots before direct article requests: both 200, wildcard
allows `/`; wiki declares reference use and prohibits training. Research only,
no scheduled source scrape or production Refresh was run. No official artwork
or account screenshot is republished in this public repository. The wiki file
page separately identifies the infographic as Hypergryph promotional artwork;
its original/thumbnail image endpoints returned 403 in this environment. A
Reddit repost was visually checked for discovery, then superseded by the actual
media URL embedded in the official X post. It is **not** the provenance authority.
Web-search opening of wiki/X returned 403 even though direct HTTP succeeded;
the conclusions above come from the successful direct responses, not snippets.

The official image was manually inspected, including all three duration blocks
and its bottom timezone legend. Exact short labels: `Asia Server Time Zone:
UTC+8` and `Americas / Europe Server Time Zone: UTC−5`. Its first cycle opens
with the version update, rather than an independently specified wall-clock hour.
Official notes independently specify the season's final 11:59 server-time end.

### 17.2 Exact regional schedule and precision limits

These are **published schedules**, not a newly observed live game-server trace.
The official image supplies all cycle endpoints; the version notice supplies
maintenance and season context. Both server offsets are fixed numeric offsets.
Europe in the app maps to the **Americas/Europe UTC−5 game group**, not CET/CEST;
no DST shift on Oct 25 or Nov 1 applies to these server instants. Only display
conversion to a user's civil timezone may change.

| Cycle | Asia, UTC+8 | Americas/Europe, UTC−5 | UTC instants: Asia / Americas-Europe |
| --- | --- | --- | --- |
| I start | After version update; planned Oct 15 12:00 | After version update; planned Oct 14 23:00 | Planned Oct 15 04:00Z for both; **actual reopening minute unverified** |
| I end | Oct 22 03:59 | Oct 22 03:59 | Oct 21 19:59Z / Oct 22 08:59Z |
| II start | Oct 22 04:00 | Oct 22 04:00 | Oct 21 20:00Z / Oct 22 09:00Z |
| II end | Oct 29 03:59 | Oct 29 03:59 | Oct 28 19:59Z / Oct 29 08:59Z |
| III start | Oct 29 04:00 | Oct 29 04:00 | Oct 28 20:00Z / Oct 29 09:00Z |
| III end / season end | Nov 5 11:59 | Nov 5 11:59 | Nov 5 03:59Z / Nov 5 16:59Z |

All dates are **2026**. Do not turn the planned first opening into an exact
observed timestamp: official notice 9560 explicitly allows maintenance to end
earlier/later. The exact first playable instant remains unknown here; it is
unnecessary for publishing the two internal deadlines. Likewise keep sourced
03:59 ends and 04:00 next starts as distinct fields: the existing calendar
contract preserves the published last-minute notation. There is no evidence
for a second-level 03:59:59 cutoff, nor permission to shift `endsAt` to 04:00.

At retrieval time 11:06Z on Oct 22, Cycle II had begun in **both** server groups.
The next internal deadline is therefore Cycle II's end on Oct 28 19:59Z (Asia)
or Oct 29 08:59Z (Americas/Europe), followed one minute later by Cycle III.
In Moscow those next openings are Oct 28 23:00 and Oct 29 12:00 respectively.
These conversions are derived from explicit source timestamps, not recurrence.

**In-game observation:** operator reports season date range 14.10–05.11 and
9h08 remaining to a cycle. The Oct 14 start date agrees with the official western
planned opening date; it conflicts with the wiki western Oct 15 header. This
is corroboration, **not independent proof of server selection or actual opening**.
Capture clock, server group and UI timezone semantics were not supplied; no
exact UTC boundary can be reconstructed from 9h08. Do not reverse-engineer a
region from that timer. To verify game execution rather than announcement,
obtain a redacted server-group screen plus synchronized UTC capture immediately
before/after a cycle transition. The research does not require that evidence to
use the explicitly published future deadline through reviewed ingestion.

### 17.3 What is proven about Cycle I

The fresh wiki still repeats §16 unchanged:

- header: Asia Oct 15 12:00 UTC+8; western Oct 15 23:00 UTC−5;
- table and Cycle I prose: Oct 15 12:00 **Server Time**, without a regional
  exception; later endpoints agree with the official image;
- current season page has no `data-start` timer attributes. Its parser reads
  explicit regional header text. The separate Event snapshot supplies season
  timers; do not confuse static placeholders with its machine-readable dates.

Current parser on these freshly downloaded bytes throws exactly:

```text
Echoes cycles conflict with the sourced season window: Americas/Europe Cycle I starts 2026-10-15T17:00:00.000Z, season starts 2026-10-16T04:00:00.000Z
```

This establishes the **mechanical cause** of missing cycle publication. With
the official evidence, two source problems can now be distinguished:

1. The wiki western header places the start one calendar day after the official
   planned Oct 14 23:00 opening. A timezone/DST interpretation cannot reconcile
   these dates; actual reopening remains qualified as above.
2. The generic Cycle I start substitutes Oct 15 12:00 server time for an
   update-controlled simultaneous opening. Applied literally to the western
   group this is Oct 15 17:00Z, **13 hours after** the official planned opening.
   It is also 11 hours before its own faulty western header. These are different
   comparisons; do not describe the official discrepancy as 11 hours.

**Conclusion:** the supplied wiki representation is internally contradictory
and conflicts with the official update-opening semantics. No timezone parsing
bug was found; the rejection is correct for its current explicit-input contract.
An Asia-only meaning for the first table start is plausible editorial intent,
but **not stated by the wiki** and not a safe generic parser rule. Fixing just
the western header would still leave the first table start mismatched. Actual
wiki editor intent and actual maintenance completion minute are not proven.
There is no basis for clipping dates or special-casing Phantasia in the parser.

### 17.4 Production chain, LKG and health

Reviewed current parser/season selection, refresh and SnapshotStore, build-feed,
reviewed ingestion/schema/merge, pinned Endfield tests, production snapshots,
deployed feed and actual latest Refresh job logs.

- [Refresh 39762240523](https://github.com/maxvfk/game-calendar/actions/runs/39762240523),
  Oct 22 10:19Z, job `119768988780`: Phantasia rejected after HTTP 200 with the
  exact error above; **15 consecutive failures**, last accepted confirmation
  `2026-10-14T20:47:25.387Z`; 7/8 confirmed, 1 broken, **0 newly broken**.
  Workflow success does not imply Echoes recovery. Existing alert dedup leaves
  an ongoing failure annotated and does not repeat the transition failure.
- `snapshots/endfield-wikigg-echoes.meta.json` still identifies **Illusion**, two
  events, hash `563cecf363e9568fa615df35b753718c81b56f0d34189ba47005d67693519a89`.
  Refresh rejection preserves those bytes/metadata. No state-cache file was
  fabricated for this research; actual failure count comes from hosted logs.
- `scripts/build-feed.ts` dynamically selects Phantasia from the Event source,
  then detects that the LKG document URL is Illusion. It withholds cycle rows
  instead of relabelling old cycles or treating them as current. This is the
  second, expected stage of the fail-closed chain.
- Deployed feed `generatedAt: 2026-10-22T10:52:41.123Z`: **176 events**, 7 games.
  Phantasia season row remains `endfield:season-of-phantasia:2026-10-15`,
  `challenge`, with Asia Nov 5 03:59Z and western Nov 5 16:59Z ends. No Phantasia
  cycles are present. Echoes health in the feed is **unavailable**: eventCount 0,
  parsedCount null and all success/confirmation timestamps null. Hosted broken
  health and feed unavailable metadata are separate representations, not a
  healthy current-season LKG claim.
- `test/endfield-echoes.test.ts` pins old Illusion IDs, rejects the captured
  contradictory Phantasia page, and verifies unchanged LKG/confirmation plus
  broken threshold on semantic rejection. That regression must remain valid.
- `challenge` classification is already fixed. The season is eligible for
  Endgame; nonexistent cycle records cannot be restored with a filter/UI fix.
  Existing regional ends and exact deadlines are sufficient for `Ending soonest`.

### 17.5 Minimal safe recovery options

| Option | Benefit | Limitation / decision |
| --- | --- | --- |
| Interpret or clip wiki Cycle I in the parser | Could resume automatic source | Rejected: upstream does not state an exception; relaxing equality conceals real contradictions; one header correction alone is insufficient |
| Wait for explicit consistent upstream regional first-cycle dates | Clean automatic recovery with existing acceptance checks | Safe but no guaranteed response time; recheck season and Event pages together, then normal Refresh/CI/Pages; no invented replacement snapshot |
| Reviewed records from official cycle announcement | Existing schema/merge path; restores current deadlines without trusting faulty opening metadata | **Recommended bounded next task**; automatic wiki stays broken until its own recovery; preserve official provenance and stable identities |
| New official automatic image/OCR parser | Potential future automation | Disproportionate and fragile for this one-season gap; not needed now |

Official cycle endpoint evidence is now sufficient for the reviewed path.
Use the announcement post as the record `sourceUrl`, with the linked official
media URL/hash and timezone conversions documented here. `provenanceStatus:
"official"`, extractionMethod `manual` (set by reviewed materializer), actual
row-specific `reviewedAt`, no batch-wide false recheck. It must **not** claim
that the wiki became healthy, overwrite its LKG or change its sourceId.

Concrete separately authorized task:
[ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md](../tasks/ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md).
Publish only the two sourced internal cycle deadline rows using existing day
start semantics; Cycle I is already expired, while Cycle II is the useful
upcoming row. No new Cycle III row: the season already supplies its final end.
No infinite recurrence, new source, schema/UI change or exact-opening invention.

**Residual blockers:** automatic source acceptance still requires consistent
explicit regional opening data upstream. The precise actual Cycle I opening
requires a completion notice or dated in-game evidence; it does **not** block
day-precision reviewed cycle deadline rows. The operator's precise 9h08 UTC
mapping remains unverifiable without capture context. These are separate from
the now independently confirmed cycle deadlines.

### 17.6 Validation and delivery scope

Bun 1.3.14: frozen install, typecheck, full `bun test` (**1110 pass / 1 existing
optional age skip / 0 fail**, 1111 tests across 56 files) and full build passed.
Offline feed remains 176 events / 7 games / 1 existing NTE Circle Bounty conflict.
Fresh live wiki rejection also reproduced with the unmodified parser. No network
Refresh, data write or browser runtime acceptance is claimed. Only documentation
is delivered; hosted PR CI and merge evidence are recorded on the delivery PR.

**Next concrete step:** separately authorize the bounded reviewed-data task,
recheck the official announcement, then add current-season cycle deadlines with
unchanged safety rules. Do not implement it as part of this research Work.
