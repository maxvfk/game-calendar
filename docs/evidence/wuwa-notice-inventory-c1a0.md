# C1a.0 — WuWa notice inventory: XML-aware verification checkpoint

PR [#159](https://github.com/maxvfk/game-calendar/pull/159) remains unmerged and
requires focused independent re-review. Original implementation base:
`9aabb88a5ac7e4e46c1f782d115802ad4f992e16`. Most recently reviewed head:
`a12fac35628470ae64b1836cf419032f21f76ad6`.

Current main was re-fetched as `b8ea78d165e37962d70c967ad3b83fe7cc156dce`,
including its snapshot refresh. Merge `aa30d77135b3432f616461e7a03dbbe62cabe51d`
reconciles that refresh into the existing PR branch without overwriting newer
snapshot, metadata, reviewed or registry files. Correction implementation:
`d74d102563cb4ff530df4e640c6e524ed74ac7ad`; subsequent checkpoint documentation
and exact-head CI are recorded in the PR delivery. No merge/re-review approval
is claimed here.

## Remaining P1 and its correction

[Second independent review](https://github.com/maxvfk/game-calendar/pull/159#issuecomment-6558658130)
confirmed that the earlier comment-free regex comparison was still structurally
unaware of CDATA. This exact non-field prefix in entry 9003 could make both sides
select the fake ID/link, while the real direct-child fields remained `9003`:

```xml
<summary type="text"><![CDATA[<id>urn:article:9999</id><link href="https://wutheringwaves.kurogames.com/en/main/news/detail/9999"/>]]></summary>
```

The optional guard now uses `verifyWuwaNoticeFields`, with XML-aware events from
pinned `saxes`, independently of canonical regex discovery. It verifies:

- One real Atom feed; every entry is a real direct child in the Atom namespace.
- Exactly one direct ID, title, link and content field per entry, with no nested
  element children in scalar fields. Missing, duplicate, foreign-namespace or
  nested required fields are refused. Attributes, quoted values, XML comments
  and CDATA are distinguished by the XML parser rather than regex tag scanning.
- Actual ID text, decoded title text, href attribute and full original content
  must equal the discovered candidate, in occurrence order. Candidate data is
  never silently corrected or replaced. Mismatches and unsupported/malformed
  documents fail optional extraction with `article_inventory_incomplete`.
- Genuine HTML content must have one complete CDATA section and `type="html"`.
  Content is sliced from the original string using the XML parser's documented
  UTF-16 source offsets. Parser-normalized CDATA text is not used: CRLF, astral
  Unicode, HTML comments and XML-looking text remain exact replay material.
- DTDs and processing instructions are refused. No entity resolver or external
  request is supplied. Parser errors are converted to static inventory failure
  diagnostics without copying untrusted error text.

No second ingestion path exists: the XML verifier returns no replacement notices
or events. `src/ingest/parsers/wuwa-kuro-atom.ts` is unchanged from reviewed
head `a12fac3`. Public canonical behavior, IDs, periods, provenance, priorities,
reviewed precedence, registry and Timeline behavior are unchanged.

Dependency rationale: there was no existing strict runtime XML parser. The
existing development HTML DOM tooling is not an appropriate XML well-formedness
and namespace verifier. A pinned SAX XML parser avoids growing another bespoke
lexer after two confirmed lexical blind spots. `saxes@6.0.0` and its sole
transitive dependency `xmlchars@2.2.0` are locked with integrity hashes and used
only by internal optional verification. All **107 baseline locked package
records** remain identical. The replay checks them and the rest of package.json /
workspace dependency declarations, allowing exactly those two additions rather
than bypassing lockfile validation. Both checkouts install their own frozen
lockfiles.

## Preserved C1a.0 contracts

- Existing canonical discovery remains the inventory candidate source. Stable
  identity is `(sourceId, noticeId)`, using the numeric component of the existing
  Atom article ID; positions locate duplicate occurrences, never synthetic IDs.
  Every article is retained regardless of event output, including old notices,
  previews, maintenance and non-calendar posts. Full HTML and actual publisher
  detail URLs remain internal untrusted replay data, never eligible E1 excerpts.
- C0's ArticleNotice, ArticleAttribution, sidecar and SHA-256 over compact JSON
  `[title, content]` are reused. Capture timestamps remain truthful or null;
  fixture day does not fabricate a midnight capture timestamp.
- Attribution consumes actual successful adapter outputs and exact source
  references, with existing final-winner checks for source, ID, type, period,
  precision, region, merge conflict and reviewed precedence. Article linkage
  alone is not proof of a final winner. Ambiguous/missing links retain null rows
  and diagnostics. Duplicate occurrences are retained and never arbitrarily
  selected.
- [Earlier XML-comment P1 and diagnostic-isolation P2](https://github.com/maxvfk/game-calendar/pull/159#issuecomment-6551768126)
  remain covered. Malformed diagnostics are independently refused before data
  lane assembly. Diagnostic-only failure preserves valid E1 and inventory;
  invalid E1 + invalid diagnostics preserves inventory without repairing an
  excerpt. The reciprocal article failure preserves E1. The P2 implementation
  in `event-evidence.ts` is unchanged in this correction.
- `available=true` means a usable occurrence inventory, including diagnosed
  duplicates; it proves neither unique identity nor complete source coverage.
  The frozen zero-output duplicate case still has six notices, all five emitted
  events attributed/confirmed, and two duplicate diagnostics. No coverage
  classification, date reader, new source, refresh transport or model call exists.

## Regression and command results

With the reviewed verifier unchanged, the first 20 new XML cases reproduced
**12 pass / 8 fail**. After correction and an added all-field cardinality case:
**21 pass / 0 fail**. Expected IDs/title/URLs/content are literal values and the
existing independently authored fixture oracle, not outputs from discovery.
Cases cover the exact Astra ID/link prefix, CDATA title/content spoofing, nested
non-field CDATA, genuine HTML CDATA with comments/XML-like text/CRLF/Unicode,
quoted attribute boundaries and entities, comments outside CDATA, malformed
attributes, field namespaces, missing/duplicate direct fields, mixed CDATA,
unsupported DTDs, existing frozen fixtures, zero-output posts and four events
from one article.

Bun 1.3.14, correction code above:

| Command | Outcome |
| --- | --- |
| `bun install --frozen-lockfile` | PASS; 73 installed packages checked, no changes |
| `bun run typecheck` | PASS |
| `bun test` | **1500 pass / 3 existing optional age skips / 0 fail**; 1503 tests, 92 files |
| `bun run build` | PASS |
| `bun run build:feed` | PASS |
| `bun scripts/event-evidence-report.ts` | PASS; full sidecar Zod validation |
| `bun test test/wuwa-notice-xml.test.ts` | **21 pass / 0 fail** |
| `bun test test/wuwa-notice-xml.test.ts test/wuwa-article-evidence.test.ts test/article-evidence.test.ts test/event-evidence.test.ts test/wuwa-kuro-atom.test.ts test/wuwa-current-events.test.ts` | **117 pass / 0 fail** |

Local package installation needed a task-local cache because the default cache
was not writable. Scratch baseline/cache files initially fell under Bun's test
discovery; both were moved outside the repository and the unchanged `bun test`
command rerun for the project-only result above. No test exclusions, application
workarounds, global configuration or credential changes were made. Local socket
tests run with networking permitted. Three age-dependent tests remain optional
locally; mandatory PostgreSQL17/encrypted recovery must pass in exact-head CI.

## Fresh current-main replay

[Measured record](wuwa-notice-inventory-c1a0-2026-11-01.json) and
[reproduction script](wuwa-notice-inventory-c1a0-replay.ts). The current record
supersedes historical `9aabb88` parity; the old manifest is not evidence for the
refreshed inputs. Prepare a baseline checkout at **b8ea78d**, install its frozen
lockfile and the implementation's own frozen lockfile, then run:

```sh
bun docs/evidence/wuwa-notice-inventory-c1a0-replay.ts \
  /path/to/b8ea78d-checkout /path/to/implementation-checkout /path/to/record.json
```

Both complete builds start without generated public trees. The script verifies
all **45 identical input files** under snapshots (including any state), production
fixtures, reviewed data and presentation registry/preferences; no state files
are present in this input. It fixes Date in every build subprocess at
`2026-11-01T00:00:00.000Z`, with `BASE_PATH=/`, `SNAPSHOT_DIR=snapshots`,
`PUBLIC_DIR=public`, `INCLUDE_LEAKS=false`, `TZ=UTC`. There is no live refresh.

Input manifest SHA-256:
`8c9c260fc3064f94a1fdb4310cc3dcad9f966a1645d6d4108648f1d429040127`.

**All 10 recursive public files are byte-identical against current main.**
Public manifest SHA-256 (compact JSON mapping paths including `public/` to file
SHA-256):
`86f70a6e6de6908529487224eeee6984f28f76d40b5b1f7a9aea29f1c8894328`.

All **292 final events/IDs**, **153 reviewed winners**, the one existing NTE date
conflict, Timeline queue/agent input, eight E1 entries/hashes, zero unattached
records, all existing diagnostics and all four original C0 arrays match refreshed
main exactly. Historical E1 evidenceHash values also remain equal; truthful
confirmation metadata reflects the refresh. Only WuWa notices/attributions and
inventory reporting are added internally relative to main. The replay is repeated
at the delivered documentation head; exact head/CI links belong to PR #159.

| Source | Notices | Emitted / attributed | Confirmed final associations |
| --- | ---: | ---: | ---: |
| GINews | 39 | 13 / 13 | 5 |
| HSRNews | 13 | 11 / 11 | 11 |
| NTE Steam | 31 | 54 / 54 | 40 |
| WuWa Kuro Atom | 20 | 11 / 11 | 11 |
| ZZZ Steam | 10 | 43 / 43 | 24 |

All five inventories are available on these inputs. WuWa has 18 zero-output
notices and two multi-event articles; no inventory/reference/duplicate diagnostics
on this snapshot. These remain measurements, never rolling fixed-count oracles.
Existing overall diagnostics, unchanged from refreshed main:
`no_useful_context=2`, `ambiguous_section_boundary=1`,
`winner_reference_conflict=41`, `winner_type_conflict=4`,
`winner_period_conflict=8`, `merge_source_conflict=1`.

## Remaining limits and next step

The verifier checks XML well-formedness, namespace/entry structure and the narrow
field contract, not the entire Atom schema or semantic coverage of every dated
span. It may conservatively refuse valid XML outside the supported serialization
or where canonical regex discovery cannot faithfully represent actual fields.
A well-formed feed with a valid subset and no external total cannot prove upstream
completeness. Genuine available HTML is retained; no claim about uncaptured
publisher revisions or missing upstream notices is made.

Next: verify exact-head hosted CI including PostgreSQL17, then obtain independent
focused re-review of the XML field verifier and fresh-input parity. Leave PR #159
unmerged. Stop after C1a.0; C1a.1, C1b and C2 are not started.
