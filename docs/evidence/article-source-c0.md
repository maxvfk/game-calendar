# C0 — article source evidence extraction

Implemented against current main `e2cebbef490178cd615af859168be071104b7edd`
(2026-10-30). Baseline [CI 41072214522](https://github.com/maxvfk/game-calendar/actions/runs/41072214522)
passed, including PostgreSQL 17. Scope and acceptance:
[canonical scheme](../tasks/SOURCE-COVERAGE-SIMPLE-SCHEME.md), C0 only;
[#147 review](https://github.com/maxvfk/game-calendar/pull/147#issuecomment-6493608417).

## Internal contract

The existing `tmp/editorial/event-evidence.v1.json` gains `notices` and
`articleAttributions`, with extractor version `article-notices-v1`. No second
report store or extraction pipeline is introduced. Existing WuWa excerpt/hash
behavior and ceilings remain intact; old E1 sidecars parse with empty new arrays.

- Enumeration shares the canonical parsers' article discovery: KQM archive
  headings, ZZZ publisher RSS discovery, and NTE's validated `newsitems` array.
  It is independent of event production, so previews, shop/maintenance posts,
  undated notices and zero-output items are retained without classifying them.
- Stable item identity is `(sourceId, noticeId)`: KQM archive number, ZZZ
  announcement detail ID, or NTE `gid`. `position` is only a snapshot locator.
  Duplicate items remain separate occurrences with diagnostics; no suffix IDs
  are invented and no first/last duplicate is chosen as evidence.
- Each notice retains its title and complete body in its original Markdown,
  HTML or BBCode representation, format, URL, truthful capture metadata, and
  SHA-256 of JSON `[title, content]`. No body truncation or date-span filtering.
  Missing metadata remains null; fixture capture days never become fetch instants.
- The builder passes the actual successful adapter outputs and the same document
  and context used for the feed. Each emitted event is retained with all its
  date fields and a unique exact source-URL-to-item reference, or a null reference
  plus an explicit diagnostic. No matching by title, nearby dates, array order,
  publication age or guessed IDs. Source/game mismatches also fail closed.
- Final-winner attribution reuses E1's exact ID/game/type/source-reference and
  merge-conflict gate. Article associations additionally require identical date
  fields/precision. Different reviewed URLs, near-merged IDs, duplicate targets,
  changed periods or conflicts leave `finalEventId: null` with diagnostics.
  A valid original notice link is retained even if final-winner confirmation fails.
- Full article content is **untrusted replay data**, not event-local prose or
  confirmed date-field evidence. It is never promoted wholesale into eligible
  `entries`; those bounded excerpts remain the existing WuWa lane. C0 makes no
  semantic claim that every paragraph belongs to every event in a multi-event
  notice. Event-local summary excerpt selection remains outside this milestone.
- Optional extraction/assembly failures cannot veto or mutate the public feed;
  machine-readable diagnostics mark missing inventory/associations. There are
  no stale/synthetic success records. Serialized notice hashes and item references
  are validated. Nothing is copied into public assets or Timeline inputs.

C1 can replay the complete notice body and separately inspect every emitted
window. One emitted event is never interpreted here as proof of a fully handled
notice. No statuses, date reader, ignore list, notification baseline, inbox,
reviewed evidence schema, model extraction, summaries or Actions changes.

## Confirmed replay evidence

Clock: `2026-10-30T12:00:00.000Z`. Inputs are existing checked-in captures only.
[Replay manifest](article-source-c0-replay-2026-10-30.json) records snapshot and
public-file hashes, counts and diagnostics.

| Source | Notices | Zero-output notices | Emitted events | Source-item links | Confirmed final links |
| --- | ---: | ---: | ---: | ---: | ---: |
| GINews | 38 | 27 | 13 | 13 | 5 |
| HSRNews | 11 | 8 | 11 | 11 | 11 |
| ZZZ Steam | 10 | 6 | 43 | 43 | 24 |
| NTE Steam | 30 | 20 | 54 | 54 | 40 |
| Total | 89 | 61 | 121 | 121 | 80 |

All 121 emitted events have an unambiguous source item on these snapshots.
The 41 unconfirmed **final** links all have `winner_reference_conflict`, rather
than borrowing another reviewed source. Existing WuWa diagnostics remain two
`no_useful_context` and one `ambiguous_section_boundary`. These counts are not
coverage statuses and do not certify completeness of any notice's dates.

A disposable `git archive` of baseline main and this branch were installed/built
with the same dependencies, snapshot/reviewed/registry inputs and settings.
The feed builders were then replayed with a subprocess Date preload fixing both
`new Date()` and `Date.now()` to the clock above. Recursive public-file lists
and SHA-256 maps match exactly: **all 10 public files byte-identical**, including
feed, review conflicts, Timeline queue/input, JS/CSS, shell and service worker.
All **290 winners** are identical, with **zero added/removed/changed**; the one
existing NTE conflict is unchanged. Feed SHA-256:
`00b75584f16c82de9ddb22a1e9db234e2e0db61798c0df7276b1a753e9daa2f5`.
No production snapshot, state, reviewed record or presentation registry changed.

## Checks and limitations

Bun 1.3.14: frozen install, typecheck and full build PASS. Full suite:
**1410 pass / 3 existing optional age skips / 0 fail**, 1413 tests in 89 files.
Initial sandboxed run could not bind localhost; rerunning with the supported
network capability passed without test/timeout changes. Hosted PostgreSQL 17
with mandatory age recovery checks remains the additional PR gate; observed
exact-head results belong to the delivery PR, not an assumption of local parity.

Twelve C0 regressions cover independent complete identity enumeration for all
four sources; zero-output inventory; multi-event attribution; #119's four
Lightward windows in real archive1437 and #130's two Starlight periods in real
archive21901; repeated identities/shared URLs, missing references, wrong context,
reviewed source/period mismatch, merge conflicts, duplicate winners, hostile
text, invalid optional input and strict notice hashes. A fixed-input builder
test pins all four public JSON hashes measured with baseline main and existing
historical fixtures, independent of the rolling production snapshots. Existing
WuWa evidence, source parser, reviewed precedence and calendar tests also pass.

The historical tests supply zero/one-event historical output sets to the C0
extractor over real stored text; they do not run old parser revisions. No C1
partial-status detection or unmatched-date semantics is claimed. New upstream
formats still need tests; unsupported/malformed discovery produces unavailable
evidence, not confirmed coverage. There is no live-source freshness, new source
research, UI smoke or model-extraction claim in this offline milestone.

The immutable Timeline provenance-history fixture remains unchanged. Its test
separately pins the authorized C0 builder checksum; all other guarded files and
its existing public-output rollback rehearsal remain checked. No Timeline v2
cutover or PR #115 implementation was changed.

Offline inspection:

```sh
bun run build:feed
bun scripts/event-evidence-report.ts
bun test test/article-evidence.test.ts test/event-evidence.test.ts
```

Self-review is not independent approval. Next concrete step: independent focused
review of C0, especially enumeration completeness and event-to-notice attribution.
Do not merge/deploy or start C1–C5 from this checkpoint.
