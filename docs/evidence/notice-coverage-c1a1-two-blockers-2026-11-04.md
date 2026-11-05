# C1a.1 — two final Astra blockers

[Coordinator triage](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6591342430)
reviewed `dc2e49eef6d739dedbed056a1d97fc624fa8e4cc`. CURRENT main was fetched at
`9488ecb3f578adb09b748600ac1cb58282724a88` and integrated by a conflict-free normal
merge `f45564df08dbe2f1e4eb67351de24b01341ec8ee`. Its snapshot refreshes and
Timeline-label decisions are inherited unchanged and excluded from the PR diff
against main. No upstream source refresh was performed.

## Corrections and independent regressions

**P1-B:** raw timezone structure is validated before normalization. Only a
supported, balanced whole outer wrapper is removed. Embedded/stray parentheses
cannot be deleted into a valid offset. Continuation trimming preserves openers,
embedded parentheses and extra wrapper closers. A closing parenthesis outside a
bare date token needs its corresponding opener before the date; surrounding
sentence punctuation cannot repair a malformed timezone. Existing offset bounds,
ISO-T requirements, dated-range context and clock-range uncertainty remain.

All four `UTC+8(30)`, `UTC+8:3(0)`, `UTC+8(3)0`, `UTC+8)3(0` examples formerly
produced a trusted +08:30 instant and processed/complete/no-attention coverage.
Now their full quotes remain unmatched with null instant/offset,
`invalid_timezone_delimiter`, partial coverage, uncertain evaluation and required
attention. Nested/empty/stray wrappers and unmatched ISO closers are negative
controls. `(UTC+8)`, `(UTC+8:30)`, spaced valid wrappers, bare UTC offsets, ISO-T
offsets and balanced surrounding sentence punctuation remain exact positives.

**P1-C:** before Markdown link masking, a bounded line scan recognizes indented
code at document/blank-line boundaries and through continuing code lines.
Four columns, tabs and mixed space/tab indentation retain literal dates through
the existing UTF-16 code-context bitmap. A dedented content line restores normal
paragraph/link handling; ordinary indented paragraph continuations do not become
code. Ambiguous indentation after block/container markers gets explicit
`unsupported_code_context` uncertainty and keeps the literal visible rather than
guessing a full Markdown block tree. Backtick scanning respects established code
contexts. Genuine links outside code and URL metadata remain excluded.

Four-space/tab code examples formerly hid the missing exact quest deadline,
reporting processed/complete/no attention. They now retain it unmatched, with
**partially processed / complete / attention required**. Complete evaluation
correctly describes a finished read, not complete event coverage. Blank-line
transitions, dedents, ordinary continuations, three-space genuine links, exact
covered code, backtick/HTML code and metadata have positive/negative controls.

The final authored regression file has **56 pass / 12 fail** on the reviewed
reader, **68 pass** after correction. All **117 focused tests / 1951 assertions**
pass. These are independently authored synthetic cases with literal expectations,
not generated goldens or historical captures. Every extracted reader/coverage
span checks `raw.slice(start,end) === quote`, including supplementary Unicode.
P1-A and P2-D implementation/tests remain unchanged. No CLI, matching/status,
source identity, ignore/baseline or canonical parser redesign.

## Inherited validation blocker: minimal CZN fixture recovery

Unmodified current main reproduces one unrelated full-suite failure in
`test/czn-season5.test.ts`: its October 28 historical replay expects ten banners
but the rolling snapshot now has eight. Existing implementation instructions
permit the smallest justified repair of a concrete validation blocker.

Only that test's input path and explanatory comment change. It now uses the
**already-existing** `test/fixtures/czn/verified-banners-2026-10-22.html`.
All parsed fields of its ten events were independently deep-compared with the
original snapshot at test-authoring commit
`1cb00dc77afe64d1c1649b0d780ae636d9f39467`: **identical**. All original count,
winner, merge-order and conflict assertions remain. No fixture duplication,
new capture, assertion weakening, parser/data or production behavior change.
The three CZN tests pass; this recovery is a separate logical commit.

## Report/input separation, parity and validation

[Three-way observed replay and counterexamples](notice-coverage-c1a1-two-blockers-report-2026-11-04.json)
runs the reviewed and corrected readers on the exact same current-main sidecar
and final events: **byte-identical reports**. The fixes change synthetic
counterexamples; no rolling example is invented to demonstrate them.

Main's inputs add four Genshin notices and remove 24 Genshin notices plus one
HSR notice; no surviving notice changes content hash. Compared with reviewed
inputs: notices **122 → 101**, spans **774 → 714**, unmatched **759 → 699**.
Current status: **20 partial / 44 unprocessed / 37 unclassified / 0 processed or
ignored**; evaluation **99 uncertain / 2 complete / 0 incomplete**. There remain
54 stated-offset instant spans. All **113 baseline identities and exact bytes**
are unchanged, including historical notices absent from rolling inventories;
current membership changes 100 → 76 solely through input turnover. No regeneration.
Baseline SHA-256: `f9495e8f1a09bc45f21773116870b836f65e63b24d471a4bf3c945362f244cb9`.
Report SHA changes solely with inputs/capture metadata:
`20fbc663a1240b7c48a0c31ab684af9a41ffe3341fb7cccd00ff9cf0b3f6256c` →
`003a4cdbaa589ba0138dab8308268d6001dfde8aaeeaf057559e35c0dfd354cb`.
Repeated new output matches; every actual span was independently verified using
UTF-16 slices. These distributions are observations, not test oracles.

Frozen install (109 locked packages, no changes), typecheck, full tests, full
build, separate feed build and report pass. Full suite: **1617 pass / 3 existing
optional age skips / 0 fail**, 1620 tests across 97 files, 22676 assertions.
[Fresh fixed-clock public/complete-sidecar parity](notice-coverage-c1a1-two-blockers-parity-2026-11-04.json)
against current main matches all **10 public files**, **296 canonical events**,
**153 reviewed winners**, conflict/Timeline outputs and the **entire E1/C0/C1a.0
sidecar**: eight E1 entries/hashes, inventories, attributions, diagnostics/refusals.
Both builds use the existing replay clock `2026-11-01T00:00:00.000Z`; this is not a
source-date inference. Public manifests also match after the separate feed build.

Final head and exact-head CI including PostgreSQL17 concurrency and mandatory
real-age encrypted recovery are recorded in PR161. The reader remains bounded
and lexical, not a complete Markdown/HTML renderer. Ambiguous block contexts
remain explicit uncertainty. No native Windows run is claimed. No confirmed
counterexample remains failing in these regressions; CI is not review approval.

Next: focused independent closure of **these two findings on the exact new
head**. Keep PR161 open/unmerged; do not begin C1b/C2, Daily Passes or another
milestone. Historical evidence keeps its original checkpoints.
