# C1a.0 — WuWa notice inventory implementation checkpoint

Implemented from re-fetched current main
`9aabb88a5ac7e4e46c1f782d115802ad4f992e16` on 2026-11-01.
Implementation commits: `b0b82db6afd63f737836f84541dbf221ffb5656b` and
recovery hardening `790943fa8fc80ec897cca4a5a17614adb535bd0c`.
The final documentation head and exact-head hosted CI belong to the implementation
PR delivery record. This checkpoint does not claim independent review or merge.

## Contract

- Export the existing `discoverWuwaArticles` traversal without changing its
  canonical acceptance, event construction, date handling or failure behavior.
  Preserve the validated publisher link alongside the original ID and full HTML.
- Add `wuwa-kuro-mirror` to C0's existing article-source map and `wuwa` to
  `ArticleNotice`. The unchanged builder already calls that map using the
  successfully parsed document, truthful capture metadata and actual adapter
  outputs after sanitization. No additional ingestion parser or transport exists.
- Keep every discovered article independently of event output. Identity is
  `(sourceId, noticeId)` using the numeric component of the existing Atom
  `urn:article:{id}`, with position as a separate occurrence locator. Duplicate
  identities remain separate records, each diagnosed; ambiguous links stay null.
- A structural guard refuses unsupported entry tags, unbalanced/nested entries,
  missing feed closure, missing or duplicate identity fields, and a mismatch
  between entry boundaries and canonical discovery. It extracts no article data.
  `article_inventory_incomplete` / `article_inventory_empty`, together with
  `article_extraction_failed`, report unavailable inventory, never a complete
  empty source. Known canonical parse failures still fail the canonical build.
- Reuse content SHA-256 over compact JSON `[title, content]`, complete HTML,
  actual detail URLs, capture timestamps or null, and fixture day without an
  invented timestamp. Full notice content is untrusted replay material, never
  eligible E1 excerpts. No excerpt ceilings, normalization or hashes changed.
- Reuse exact URL + source/game checks and all C0 final-winner gates: exact ID,
  type, allowed reviewed precedence, source references, merge conflicts, period,
  precision and regional boundaries. Source-article attribution alone never
  confirms a final winner. Missing/ambiguous linkage retains an emitted row with
  null notice reference and a machine-readable diagnostic.
- Extraction failures are independent. Article assembly failure preserves valid
  E1; the added reciprocal recovery preserves valid notices/attributions on E1
  assembly failure (`event_evidence_assembly_failed`). Both lanes remain optional
  and cannot veto an otherwise valid canonical public feed.
- `articleSourceReport` and the offline report now show all five sources and
  explicit availability. No date-span reader or coverage classification exists.

## Offline verification

Bun 1.3.14. Required commands executed:

| Command | Outcome |
| --- | --- |
| `bun install --frozen-lockfile` | PASS; 71 installs checked, no changes |
| `bun run typecheck` | PASS |
| `bun test` | 1464 pass / 3 existing optional age skips / 0 fail (1467 tests, 91 files) |
| `bun run build` | PASS; both full builds and recursive parity below |
| `bun test test/wuwa-article-evidence.test.ts test/wuwa-kuro-atom.test.ts test/wuwa-current-events.test.ts test/event-evidence.test.ts test/article-evidence.test.ts` | 81 pass / 0 fail |
| `bun run build:feed` | PASS |
| `bun scripts/event-evidence-report.ts` | PASS; complete sidecar Zod validation |

Initial restricted-network full test: 1448 pass / 3 existing optional age skips /
3 failures (local PostgreSQL TLS peer, wire peer and HTTP server sockets). Rerun
with local networking permitted passed: 1461 pass / 3 existing optional age skips /
0 fail. Final rerun including the structural refusal and recovery-metadata regressions:
**1464 pass / 3 existing optional age skips / 0 fail**, 1467 tests across 91 files. No application, test assertion, credentials or persistent environment
configuration was changed to resolve the socket restriction. No global tool
configuration changed. Local optional age tests remain skipped; hosted CI must
exercise PostgreSQL 17 and mandatory age recovery on the exact delivered head.

New frozen regressions cover zero-output previews/maintenance/non-calendar
notices, one article's four events, duplicate occurrences with different content,
missing/wrong/ambiguous IDs/URLs, incomplete XML discovery, full HTML beyond E1
limits, truthful/null metadata, hash repeatability, reviewed/final-source/period/
region refusals and strict Zod reference/hash checks. The unchanged starting-main
E1 execution is pinned in a golden including no-winner unattached records and
diagnostics. Existing four C0 source tests retain their original data contracts;
only the report's expected number of visible sources changes from four to five.
The builder regression separately proves both extraction failure directions
without changing public output. Assembly recovery is tested in both directions, including malformed notice URL/ID
metadata that must not poison the recovery diagnostics themselves.
See [fixture provenance](../../test/fixtures/wuwa/README.md).

## Measured replay

[Complete measured record](wuwa-notice-inventory-c1a0-2026-11-01.json) and
[reproduction script](wuwa-notice-inventory-c1a0-replay.ts). From a dependency-ready
checkout, create a disposable base checkout at the SHA above, install the same
lockfile dependencies there (or link the same installed `node_modules`), then:

```sh
bun docs/evidence/wuwa-notice-inventory-c1a0-replay.ts \
  /path/to/base-checkout /path/to/implementation-checkout /path/to/record.json
```

The script compares every file in snapshots (including any source state),
production fixtures, reviewed data and presentation registry/preferences before
building. It fixes Date in every Bun build subprocess at
`2026-11-01T00:00:00.000Z`, with `BASE_PATH=/`, `SNAPSHOT_DIR=snapshots`,
`PUBLIC_DIR=public`, `INCLUDE_LEAKS=false`, `TZ=UTC`. It clears only generated
public trees in the supplied disposable checkouts, runs both complete builds,
then checks the complete recursive file paths and per-file SHA-256 manifests.
No live sources are refreshed. The 45 input files match; no freshness state
files are present in this input. Input manifest hash:
`35d0eaacd7956872a523834c65e7d61e8e8298afb2bab8553fc9f93e17a6aa46`.

**All 10 public files are byte-identical.** Manifest hash (SHA-256 of compact
JSON mapping relative paths including `public/` to file SHA-256):
`f78b822b5f823a3ed1cc3cfbd3705c619bd7a9f36acc5eb59c452606bbebc645`.
All 292 final events/IDs, 153 reviewed winners, the one existing NTE date conflict,
Timeline queue/agent input, eight E1 entries/hashes, zero unattached records,
all existing diagnostics and all four C0 notice/attribution arrays are identical.
Only WuWa notices and emitted-event attributions are added to the internal sidecar;
the report gains WuWa inventory visibility.

| Source | Notices | Emitted / attributed | Confirmed final associations |
| --- | ---: | ---: | ---: |
| GINews | 39 | 13 / 13 | 5 |
| HSRNews | 13 | 11 / 11 | 11 |
| NTE Steam | 31 | 54 / 54 | 40 |
| WuWa Kuro Atom | 20 | 11 / 11 | 11 |
| ZZZ Steam | 10 | 43 / 43 | 24 |

All five inventories are available on this input. WuWa has 18 notices with no
emitted event and two multi-event articles; all 11 emitted events have unique
article associations and confirmed final associations. Zero duplicate identity,
missing-reference or inventory failure diagnostics on this snapshot. These are
measurements, never rolling fixed-count assertions. Existing overall diagnostics:
`no_useful_context=2`, `ambiguous_section_boundary=1`,
`winner_reference_conflict=41`, `winner_type_conflict=4`,
`winner_period_conflict=8`, `merge_source_conflict=1`. No existing diagnostic changed.

## Remaining limits and next step

The guard validates discovery completeness for the supported Atom layout; it is
not a general XML validator. A well-formed feed containing a valid subset with
no external total cannot prove upstream completeness. New serialization/layout
conventions may conservatively report inventory unavailable. A failed extraction
retains emitted rows with null notice links; invalid article assembly keeps C0's
existing conservative omission of the article lane while preserving valid E1.
No semantic classification or proof that every dated paragraph produced an event
is claimed. The available snapshot's HTML is complete for each captured notice;
it is not a claim about uncaptured publisher revisions or missing upstream posts.

Next concrete step: verify exact-head hosted CI, then independent focused review
of discovery refusal, exact attribution and both recovery directions. Leave the
PR unmerged. Stop after C1a.0; C1a.1, C1b and C2–C5 need separate authorization.
