# C0 — article source evidence extraction

Implemented against current main `e2cebbef490178cd615af859168be071104b7edd`
(2026-10-30). Baseline [CI 41072214522](https://github.com/maxvfk/game-calendar/actions/runs/41072214522)
passed, including PostgreSQL 17. Scope and acceptance:
[canonical scheme](../tasks/SOURCE-COVERAGE-SIMPLE-SCHEME.md), C0 only;
[#147 review](https://github.com/maxvfk/game-calendar/pull/147#issuecomment-6493608417).

## Review corrections (2026-10-30)

The following corrections supersede the original reviewed head `11d0869`.
All three [review1](https://github.com/maxvfk/game-calendar/pull/152#issuecomment-6531357114),
[review2](https://github.com/maxvfk/game-calendar/pull/152#issuecomment-6531494029),
and [review3](https://github.com/maxvfk/game-calendar/pull/152#issuecomment-6531598928)
findings were checked before changes. Main remains `e2cebbe`; the existing PR
branch continues, without recreating C0.

- **A / inventory guard:** optional extraction checks the raw Markdown heading
  structure independently of strict canonical discovery. Archive references in
  headings at any ATX level, plus linked top-level headings whose destination
  changed, must match discovered identities and order. A partially changed
  heading cannot silently become another notice's evidence. Ordinary body
  links, including standalone archive cross-references, are not boundaries.
  Discrepancies emit `article_inventory_incomplete` plus
  `article_extraction_failed`; the source inventory and all associations fail
  closed. Canonical parser behavior is unchanged. Both KQM regressions change
  an event-producing heading and a zero-output heading among valid neighbors.
- **B / availability:** report inventory derives from the four static expected
  identities, with explicit `available: false` on missing/failed evidence.
  Unexpected empty ZZZ/NTE inventories emit `article_inventory_empty` plus
  extraction failure. Missing-source diagnostics include `sourceId`; extraction
  failures log concise source-specific warnings, without article/error text.
  A subprocess regression verifies unchanged public bytes after an optional
  article failure, and an unavailable source remains visible in the report.
- **C / stable oracles:** explicit frozen IDs, zero-output IDs and per-event
  notice/final/refusal expectations replace rolling-snapshot-derived oracles.
  Final winners come from a separately executed baseline-main feed, not the
  candidates under test. Nothing parses rolling snapshots at module import.
  The builder's labeling policy is frozen too. Current89/121/80/41 counts remain
  measurements, not universal source invariants.
- **D / history:** C0 uses the complete frozen HSR archive1437 article. It retains
  all20 clock occurrences /12 distinct clocks, including November11 version,
  event, availability, claim and discount boundaries and October28 mail cutoff.
  Its nine current parser outputs include four Lightward windows. A separately
  executed pre-#119 parser-function replay emits five records, only two of those
  four Lightward windows. The pre-#130 isolated Starlight replay throws. Synthetic
  zero/one-event retention tests are labeled accordingly; they are not historical
  successful parser outputs. Starlight assertions pin November2 event end versus
  October29 quest cutoff and their separate regional UTC endpoints.
- **Small confirmed defects:** final-reference refusal no longer hides independent
  type/period/merge conflicts. Diagnostics include the same-ID final source URL/ID;
  `articleRefusals` exposes a per-event audit. `regionEnds` compares named regions,
  independent of key order. Wrong-source diagnostics are not duplicated as an
  unrelated unmatched-notice error. Invalid article assembly retries the independent
  WuWa E1 lane; its eligible entries/hashes survive intact. Existing exact-winner
  matching is unchanged. The builder checksum is repinned exactly to its new bytes;
  the historical fixture and all other guarded checksums stay unchanged.

See [fresh hashed replay and all41 refusal cases](article-source-c0-review-corrections-2026-10-30.json)
and [frozen fixture provenance / actual historical replay](../../test/fixtures/editorial/c0/README.md).

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
- Each notice retains its title and complete body in its stored Markdown,
  HTML or BBCode representation, format, URL, truthful capture metadata, and
  SHA-256 of JSON `[title, content]`. No body truncation or date-span filtering.
  For KQM this is the mirror's Markdown rendering, not publisher-original bytes.
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
The 41 unconfirmed **final** links all have `winner_reference_conflict`.
The corrected audit independently reproduces29 URL-only refusals,4 with type
differences,8 with period/precision/regional differences;1 also has the existing
NTE Circle Bounty merge conflict. No refused link was relaxed or confirmed. Existing WuWa diagnostics remain two
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

Bun1.3.14: frozen install, typecheck and full build PASS. Full suite:
**1418 pass /3 existing optional age skips /0 fail**,1421tests in89files.
Focused article/E1/provenance: **71pass/0fail**. Full tests used the supported
network capability for localhost socket checks; no test/timeout was weakened.
Both main and correction full builds ran; fixed-clock feed replay then compared
all10 public files and all290 winners byte-for-byte. A new comment initially
triggered an unused Tailwind utility; wording was corrected and full build/parity
rerun. The final corrected CSS and service worker match main exactly too.
Hosted PostgreSQL17 plus mandatory age recovery remains an exact-head GitHub
CI gate. Code-checkpoint [CI41125822872](https://github.com/maxvfk/game-calendar/actions/runs/41125822872)
at `f16dea1` is SUCCESS for all three jobs (Pages skipped). Final run
URL/SHA/results are recorded in the PR delivery comment.
Local success does not substitute for that hosted result.

The complete HSR1437 capture replaces C0's use of the old trimmed Lightward
excerpt. That narrow fixture remains labeled and used only by its existing parser
regressions. New cases preserve representative dated spans beyond Lightward,
without equating every span with a required event. The historical output record
and exact parser revisions are documented alongside the frozen fixtures.

Intentionally deferred limitations:

- C0 does not classify dated spans, mark coverage, or prove semantic attribution
  of every paragraph to every event. `finalEventId: null` is a refusal to confirm,
  not a coverage status. Date/coverage classification remains C1 work.
- NTE intra-parser deduplication supersedes maintenance candidates for
  `surfing-all-channels:2026-09-09` (notice1842846814455151) and
  `dazzling-star:2026-10-21` (notice1846651706693892) with standalone announcements.
  Both full maintenance notices and emitted provenance remain retained; discarded
  intermediate candidates are not emitted-event attributions. This is reproduced
  by a fixed-input regression, not repaired through a parser redesign.
- The structural guard covers the known archive-heading surface and tested
  drift. Completely new serialization/heading conventions still need maintenance;
  no general Markdown boundary or arbitrary-layout completeness proof is claimed.
- Invalid article assembly conservatively omits all article evidence for the run
  while preserving valid WuWa E1. A failure in the remaining sidecar lane still
  invokes the existing global fail-closed fallback. Future Timeline v2 handling
  of article `source_unavailable` is deferred; no PR115 changes were made.
- `extractorVersion` describes the attempted C0 schema/capability, not source
  success. Consumers must inspect per-source availability/diagnostics.
- The notice hash validates `[title, content]` self-consistency, not authenticity.
  The replay manifest pins source snapshot hashes independently; no new per-notice
  cryptographic provenance system is introduced.
- No network source refresh, UI smoke, model calls, C1–C5, merge or deployment.

The immutable Timeline provenance-history fixture remains unchanged. Its test
keeps one strict exact builder checksum pin plus all other historical checks;
no broad allowlist replaces that guard. Public-output rollback tests still pass.

Offline inspection:

```sh
bun run build:feed
bun scripts/event-evidence-report.ts
bun test test/article-evidence.test.ts test/event-evidence.test.ts
```

Next concrete step: focused independent re-review of these C0 corrections,
especially inventory completeness, unavailable reporting and frozen historical inputs.
Do not merge/deploy or start C1–C5 from this checkpoint.
