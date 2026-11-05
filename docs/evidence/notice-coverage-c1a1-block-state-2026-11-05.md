# C1a.1 — thematic breaks and weak list frames

[Focused coordinator triage](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6645320287)
reviewed `bf0139042fb3c45571e4f830d85c14f6671ca0eb`. CURRENT main was fetched at
`fcd4a3998af0000c04aff68ca82dc3bbbb913659`, then integrated by conflict-free
normal merge `c12fe17d03734218e324690f80a7afea1a684936`. Its 12 snapshot/metadata
changes are inherited unchanged and absent from the PR diff against main. No
upstream source refresh or unrelated UI/data change was performed.

## Three bounded block-state corrections

The prefix probe previously treated spaced thematic rules as nested list items,
retained empty-item padding across blank lines, and accepted paragraph-interrupting
ordered starts other than 1. These phantom/weak frames consumed indentation
belonging to a later code block; link masking silently removed its deadline.

- **Thematic precedence:** after valid parent continuation padding, but before
  any new list marker, recognize a whole relative line containing at least three
  identical `*`, `-` or `_` markers, only spaces/tabs between them and at most
  three relative leading spaces. Tabs use the existing column expansion. Valid
  quote/list parent frames are retained; phantom children are never constructed.
  The rule establishes a completed block boundary, so subsequent indented code
  is read both with and without an intervening blank line.
- **Empty-item lifetime:** an empty marker line uses the correct one-space
  padding convention. It can gain content on the immediate next nonblank line,
  but its frame expires across a blank line. Only that empty frame and its
  descendants are dropped; nonempty parent list/quote scopes remain. Nonempty
  lists continue to retain their legitimate padding across blank lines.
- **Paragraph interruption:** in a known same-container paragraph, an empty item
  or ordered marker whose numeric start is not 1 cannot establish a new list
  frame. Ordinary text remains paragraph text; valid 1-start interruptions and
  lists beginning after a blank or other completed block still work. A possible
  underline/weak block boundary keeps explicit uncertainty where the limited
  probe cannot establish the block semantics.

These are local additions to the existing bounded probe, not a CommonMark block
tree, new dependency or regex copied from a prototype. The 16-prefix/input/quote
limits, UTF-16 source bitmap and fail-closed ambiguous-context policy remain.
Raw date/timezone parsing, P1-A/P1-B/P2-D, matching/status engine, CLI and the
accepted historical CZN test correction are unchanged.

## Discriminative CommonMark controls

The final authored regression file has **86 pass / 18 fail on the reviewed
reader**, **104 pass after correction**. The full focused set is **153 pass /
3087 assertions**. Tests cover all reported thematic forms, blank/no-blank,
nonspaced `---`, relative quote/list scopes, tabs/mixed indentation, empty versus
nonempty items, ordered 1 versus other starts, genuine prose/destinations and
covered exact literals. All previous positive controls remain intact.

The earlier uncertainty-only `---` row now belongs to the explicit thematic/code
controls: a recognized boundary permits a complete read. The negative assertions
for retained dates, unmatched spans, partial coverage and attention remain;
covered exact-date controls additionally require processed/complete/no attention.
No assertion is loosened to conceal an unresolved deadline.

The available **Pandoc 3.1.11.1**, using `-f commonmark -t html`, independently
rendered **32 synthetic semantic controls**. Each matched its separately authored
code-versus-link classification, including empty-item lifetime, quoted/nested
rules, ordered interruption and valid continuations. The command/version/inputs
and rendered output are included in the
[machine-readable evidence](notice-coverage-c1a1-block-state-report-2026-11-05.json).
Pandoc is a local verification tool only; it is not added to dependencies or
required by Bun tests/CI. Expectations are literal synthetic assertions, not
implementation-generated goldens or claims about historical game notices.

Reported end-to-end counterexamples formerly gave **processed / complete /
attention false**, with the missing exact date absent. They now retain the whole
`2026-10-29T04:00Z` date unmatched as **partially processed / complete / attention
true**. Complete evaluation describes a finished read, not complete calendar
coverage. Ambiguous cases explicitly require uncertainty/attention. Every reader
and full-result quote checks `raw.slice(start,end) === quote`, including
supplementary Unicode prefixes.

## Validation, parity and input-versus-code report replay

Frozen install (109 locked packages, no changes), typecheck, full tests, full
build, separate feed build and deterministic report pass. Full suite:
**1653 pass / 3 existing optional age skips / 0 fail** (1656 tests, 97 files,
23811 assertions). [Fresh fixed-clock parity](notice-coverage-c1a1-block-state-parity-2026-11-05.json)
against CURRENT main matches all **10 public files**, 296 canonical events,
153 reviewed winners, conflict/Timeline outputs and the **complete E1/C0/C1a.0
sidecar**: eight E1 entries/hashes, inventories, attributions, diagnostics/refusals.
Both builds use the existing replay clock `2026-11-01T00:00:00.000Z`; public
manifests are rechecked after the separate feed build. No public/feed/schema,
ID/precision/provenance/winner or source inventory/attribution contract change.

All **113 baseline identities and exact bytes** remain intact, including absent
historical notices; SHA-256 remains
`f9495e8f1a09bc45f21773116870b836f65e63b24d471a4bf3c945362f244cb9`.
Current membership rises **76 → 82** because six refreshed ZZZ notice content
hashes again match the preserved baseline. The registry was not regenerated.
No notice IDs were added or removed by this input refresh.

The reviewed/corrected readers produce **byte-identical reports on the same
current-main sidecar/events**. Reader changes have no rolling report delta.
Report hash changes only with refreshed inputs/capture metadata:
`003a4cdbaa589ba0138dab8308268d6001dfde8aaeeaf057559e35c0dfd354cb` →
`f563207a40ff2e05486e6ab6dbf8d0f628f291cdf96b09b973786cf9012c56e7`.
Counts stay **101 notices / 714 spans / 699 unmatched**, status **20 partial /
44 unprocessed / 37 unclassified / 0 processed or ignored**, evaluation **99
uncertain / 2 complete / 0 incomplete**, with 54 stated-offset instant spans.
Repeated new output matches; every actual UTF-16 quote was independently checked.
These are observed results, not a forced distribution or hidden literal invented
in the frozen inventory to demonstrate a synthetic fix.

Final head and exact-head GitHub CI including PG17 concurrency and mandatory
real-age encrypted recovery are recorded in PR161. Remaining limits are explicit:
a bounded prefix/block-state recognizer, not full CommonMark rendering;
uncertain transitions fail closed and excessive depth is incomplete. No native
Windows execution is claimed. No confirmed counterexample remains failing in
these regressions. Passing CI is not independent review approval.

Next: **Sonnet focused closure of this block-state P1-C on the exact new head**,
then Astra final closure after stabilization. Keep PR161 open/unmerged; do not
begin C1b/C2, Daily Passes or another milestone. Historical evidence retains its
original checkpoints.
