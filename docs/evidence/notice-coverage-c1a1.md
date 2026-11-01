# C1a.1 — deterministic offline notice coverage

Scope: canonical [simple scheme](../tasks/SOURCE-COVERAGE-SIMPLE-SCHEME.md),
C1a.1 only. This code does not run in feed generation, refresh, Timeline or
publishing. No source documents were fetched. C0/C1a.0/E1 remain unchanged.

## Reproduce

```sh
bun run build:feed # optional: create existing offline E1/C0 inputs first
bun run coverage:report > work/notice-coverage.json
bun run coverage:report --sidecar path/to/frozen-evidence.json --events path/to/frozen-feed.json
```

The reporter never builds, refreshes, fixes events or writes state. It consumes
an existing E1 `EvidenceSidecar` and either a feed `{events:[...]}` or a final
`GachaEvent[]`. An invalid/missing evidence input produces explicit
`not evaluated`/diagnostic output; invalid Git-reviewed state fails the CLI.
It has no current-clock dependency. Store its JSON outside `public/`.

One explicit command initialized the Git-reviewed launch baseline from all
113 notices in the unchanged current-main snapshots at base
`bcf1865649ce9a9df2e46766f6bc5c792d2a73c3`:

```sh
bun run coverage:report --create-baseline data/coverage/notification-baseline.v1.json
```

Creation requires all five usable inventories and uses exclusive file creation:
a second invocation refuses to overwrite it. A deliberately new baseline can be
created at a new internal path and reviewed as a Git change. The report reads
`data/coverage/ignored-notices.v1.json` and
`data/coverage/notification-baseline.v1.json` by default; `--ignores`/`--baseline`
can select frozen state. There are no initial ignore decisions. Baseline entries
only annotate membership for eventual launch-notification suppression. This
milestone sends no notifications and introduces no refresh integration.

## Reporting contract v1

`buildNoticeCoverage` exports the TypeScript `NoticeCoverageReport` contract.
Top level: `schemaVersion:1`, `engineVersion:notice-coverage-v1`,
`readerVersion:notice-dates-v1`, exact parsing/report `limits`, `diagnostics`,
`attentionRequired`, five sorted `sources`, explicit `unsupported` families and `unusedIgnoreDecisions`.
Each source has its ID, game, inventory `available`, evaluation, limitations,
diagnostics and notices sorted by occurrence `position`. Availability never
means coverage completeness. Endfield, CZN and unrecognized inventoried source
families explicitly say `not evaluated / notice inventory unsupported`.

Each notice preserves source/notice ID, position, URL, content hash and format;
`status`, `evaluation`, baseline membership, trustworthy event associations,
every extracted `span`, an `unmatchedSpans` index, ignore decisions, diagnostics
and `attention:{required,reasons,unscanned:[{field,reason}]}`. Source attention
also reports the number of notice occurrences needing action. Null status is
never a harmless empty inbox: unreadable/masked/limited fields retain explicit
unscanned attention without fabricating a dated span.
Duplicate IDs remain different occurrences. Source-level inventory failures
cannot create an empty processed inbox.

The four actionable statuses are:

- `processed`: every span matched a represented boundary or was individually
  ignored, at least one span matched, and evaluation has no uncertainty/limits.
- `partially processed`: trustworthy represented events exist, but a span or
  incomplete/uncertain evaluation prevents a complete-coverage claim.
- `unprocessed`: dated/unresolved spans exist and no trustworthy represented
  event association is available; span ignores never hide other gaps.
- `ignored`: an explicit whole-notice decision, or all spans individually ignored
  with no remaining evaluation diagnostic.

`evaluation` is a separate completeness qualifier, not a fifth actionable status:
`complete`, `uncertain` or `incomplete` per notice. `status:null` means there is
no basis for an actionable classification (e.g. undated body or refused oversized
content), never processed. An uncertain/incomplete notice with known spans may
retain an actionable partial/unprocessed status. Ignored content remains visible
with uncertainty/limits if present. Source evaluation additionally uses
`not evaluated` when the inventory is missing/invalid.

Each span has a stable revision-local `ref`, `kind:date|unresolved`, `field`
(`title|content`), UTF-16 `[start,end)` source location, verbatim `quote`, range
`role`/`group`, explicit `region`, and `value` (`date`, `clock`, `offsetMinutes`,
`instant`, `precision`). `precision` is `day|minute|second|unknown`. Missing facts
are null with explicit `uncertainty` codes. Matches expose event ID, actual
boundary field/value, precision and association basis. Unmatched spans retain
quotes and non-match reasons. Unreadable relative expressions and leftover
clock/date markers are unresolved spans, so they can also be individually ignored.

Example excerpt (synthetic missing-event Starlight replay; source body is real):

```json
{
  "sourceId": "genshin-kqm-ginews",
  "noticeId": "21901",
  "position": 0,
  "status": "partially processed",
  "evaluation": "uncertain",
  "baselineMember": false,
  "unmatchedSpans": [
    {
      "field": "content",
      "quote": "2026/10/29 04:00",
      "reason": "unresolved_date"
    }
  ]
}
```

The example omits other fields/spans and ref for readability. The real report
retains all four Starlight clock occurrences, including the November 2 end.
The source's `t_lc` clocks do not state offsets. This engine does not recreate
the parser's regional offset knowledge: even the represented main event's
floating source clock remains unresolved. The earlier cutoff is never concealed.

## Matching and state rules

Only a C0 `ArticleAttribution.finalEventId` that still agrees with the actual
final winner may count, or a final manual `reviewed-GAME` event citing exactly
one unique notice URL in the same source/game. Refused C0 rows cannot be bypassed
by reviewed-URL matching. No title similarity, date-only association, URL alias
inference, cross-source attribution, or resurrection of expired/rejected events.
A final event whose notice has a different URL stays unmatched even if its title
and dates agree. Both endpoints of an explicit range must match the same event.

Day-only source dates within a complete explicit range match day-precision
calendar boundaries by their stated calendar day; isolated same-day dates cannot
certify boundary purpose and remain `isolated_day_requires_boundary_context`.
Day-only dates never become UTC instants. Explicit source offsets produce
instants, and only exact calendar boundaries may match those. A regional end
requires an explicit `Asia:`/`Europe:`/`America:` label immediately preceding
the date and the corresponding `regionEnds` field;
the calendar's chosen `endsAt` is not a global end. Floating clocks, ambiguous
numeric ordering, two-digit/missing years, and unannounced ends remain unresolved.
No offsets or years are borrowed from notice publication metadata or neighboring
expressions, including shorthand range endpoints.

Both state schemas are strict, versioned Zod schemas in `coverage-state.ts`.
Ignore and baseline identity is the stable tuple `sourceId`, `noticeId`,
`sourceUrl`, `contentHash`, `format`. Absolute inventory `position` is only a
report locator, never state identity. Insertion/reorder preserves membership;
URL, body, title or format edits invalidate it. Any duplicate source/notice ID
blocks state application for every occurrence, even with different bodies.
Baseline creation and legacy migration refuse such ambiguous duplicates.
Ignores additionally require `category` and human `reason`, with optional
`span:{field,ref}`. Categories: maintenance, shop, web-event-out-of-scope,
marketing, other-out-of-scope. Unknown fields/versions/duplicate decisions fail.
Unmatched/stale decisions remain in `unusedIgnoreDecisions`. Whole-notice ignores
never remove report spans. Baseline purpose remains
`initial-notification-suppression-only`. Neither file marks a notice reviewed,
changes coverage or suppresses new edited content.

The unmerged v1 state contract was corrected before release; old positional
entries fail strict validation rather than being silently reinterpreted. No
ignore decisions existed to migrate. The committed baseline was migrated
**explicitly**, retaining exactly the original 113 content bindings, not rebuilt
from the current rolling inventory. Reproduce the one-time shape-only migration:

```sh
git show 61c3d66:data/coverage/notification-baseline.v1.json > work/legacy-baseline.json
bun run coverage:report --migrate-baseline work/legacy-baseline.json --output work/stable-baseline.json
```

Migration uses exclusive output creation and never reads the current inventory
for membership. The committed result removes only the 113 positional fields;
all five identity components, content revisions and notification-only purpose
are preserved. See [review corrections and distributions](notice-coverage-c1a1-review.md).

## Bounds and limitations

Reader work is bounded to 250,000 UTF-16 units and 256 spans per field, with
512-unit verbatim quotes. The lexical markup reader does not execute content,
resolve entities externally, construct a DOM or follow URLs. It masks tag
attributes, comments, active content and URL destinations; it decodes a small
entity set with source offsets. Malformed/unclosed markup, unknown entities,
unsupported relative dates and limits prevent `processed`. This is a bounded
source-format reader, not a general natural-language/HTML interpretation engine.
Month/day titles such as the character name March 7th or Tomorrow in the Frame
can create conservative false positives; no semantic auto-ignore is attempted.

Report limits additionally cap inputs, notice/event/attribution counts, total
text, spans, associations, matches and serialized output. A limit is diagnosed
as incomplete/not evaluated. Output exceeding the byte ceiling emits only an
explicit incomplete summary and exits 2, never a falsely complete truncated list.
All input evidence/state and outputs are internal, untrusted analysis data.

Bare signed offsets are accepted only when adjacent to an ISO `YYYY-MM-DDT`
clock. Human `00:00-12:00` ranges remain ambiguous, never a false UTC instant;
explicit `UTC±H[:MM]` and ISO-T offset forms remain supported. BBCode recognizes
only supported syntax and respects backslash escaping; arbitrary bracketed prose
stays readable. Active content and comments remain masked and trigger unscanned
attention. Known precision mismatches intentionally produce gaps. No automatic server-time
table was introduced. A matching report proves only representation of readable
boundaries in these five inventories, not complete announcement-family coverage.

## Acceptance evidence

Fixed literal expectations are authored in `test/date-spans.test.ts` and
`test/notice-coverage.test.ts`; none are regenerated with the engine. Existing
frozen source files and independently frozen historical parser outputs remain
unchanged. The actual pre-#119 HSR parser output is read from C0's
`historical-results.json` with its input SHA verified. It contains five events
and lacks both MoC windows. Pre-#130 Genshin actually threw; the main-event-only
Starlight scenario is explicitly synthetic. #131's three tracked recovery
notices and #139's Park claim windows are separate synthetic missing-event
scenarios over the real frozen source bodies. Factual WuWa/ZZZ excerpts test
additional formats; omissions are not presented as full historical captures.

Full machine-readable [Starlight report example](notice-coverage-c1a1-starlight.json)
labels the synthetic event set explicitly; it is not a golden test oracle.

Historical pre-review validation on code checkpoint `658f76e`: frozen install, typecheck,
**1531 passed / 3 existing optional age skips / 0 failed** (1534 tests, 95 files),
full site build and separate feed build passed. The initial restricted-sandbox
run could not bind localhost sockets (three existing tests); enabling command
network permission resolved all three, without changing tests or configuration.
Bun's install needed task-local TMPDIR/BUN_TMPDIR/BUN_INSTALL_CACHE_DIR under
`work/`; no global configuration or repository lockfile change was made.

The [fixed-clock replay record](notice-coverage-c1a1-parity-2026-11-01.json)
compares the exact starting main to the implementation using 45 identical input
files. All 10 recursive public files, 292 events / 153 reviewed winners / existing
NTE conflict, Timeline public artifacts and the entire E1/C0/C1a.0 sidecar match.
Eight E1 entries and hashes, all notices, attribution rows and diagnostics remain
identical. Two CLI replays produce identical bytes. No generated public file is
committed. Exact final-head hosted CI, including PG17 and encrypted recovery,
is recorded in the delivery PR; local optional age skips are not hosted PG17
validation. Independent review is pending and the PR must remain unmerged.

A final bounded-work refinement indexes baseline membership and refusal IDs;
its report is byte-identical to the pre-indexed result. Delivery is
[PR #161](https://github.com/maxvfk/game-calendar/pull/161), left unmerged.

Current F1–F6 corrections, validation and next review gate are recorded in
[the review handoff](notice-coverage-c1a1-review.md).
