# C1a.1 — final Astra four-case corrections

[Audit triage](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6576548728)
reviewed `475719dfecbc4f07840a67e4cdc1e1a0efedc6db` against CURRENT main
`51bcb01dd50539bcf9351b6a8088ced89ad16028`. Both were fetched/inspected before
implementation. This correction stays on existing PR161 and changes only the
internal reader, shared CLI guard, related regressions and factual documentation.
No matching-engine redesign, source capture/refresh, canonical parser/event/data,
reviewed winner, Timeline, Account Sync, C0/E1/C1a.0 or workflow change.

## Per-finding evidence

Initial real-dependency regression run: **3 pass / 19 fail** before fixes. The
new test file contains independently authored synthetic notices and literal
expectations, not generated goldens or fictional historical captures. Each
notice-level negative case has an explicitly represented main UTC period plus
an additional missing/malformed deadline. Tests require non-processed status,
non-complete evaluation and attention. Positive controls require processed,
complete evaluation and no attention; blanket uncertainty cannot pass them.

- **P1-A — inline dates:** supported inline HTML/BBCode tags and paired inline
  Markdown emphasis/code delimiters are removed through a UTF-16 removal map,
  not substituted with spaces between date parts. All four requested forms and
  additional italic/triple-emphasis/nested cases are covered. Original raw
  offsets/quotes are retained, including supplementary Unicode prefixes. Block
  tags create boundaries; date and range grammar cannot cross newlines/blocks.
  Standard details/summary containers are block boundaries, while unsupported
  inline syntax remains explicit uncertainty. Literal intraword underscores
  cannot be removed to manufacture an ISO date. A large formatted date that
  exceeds the original quote ceiling remains incomplete with attention.
- **P1-B — whole timezone tokens:** a matched clock extends through an adjacent
  token continuation before anchored timezone validation can yield an instant.
  `UTC+5.5`, `UTC+8:3`, `UTC+8:300`, alphabetic/underscore/percent/equality/slash
  suffixes and unsupported Z suffixes produce uncertainty, not trusted prefixes.
  Legitimate UTC/ISO-T offsets and sentence punctuation still match exact event
  boundaries. Existing missing-offset and human clock-range uncertainty remain
  covered by the earlier F1/F3 tests. No offset is inferred or guessed.
- **P1-C — destination masking:** Markdown-only masking requires a supported
  syntactically valid link construct. Visible `[Quest](Claim by October 29, 2026)`
  remains readable in HTML/BBCode and as invalid Markdown link-looking prose.
  Genuine Markdown URL/relative destinations and URL metadata remain excluded;
  escaped link-looking prose stays visible. Reader and complete-notice tests
  cover all three formats and verify every raw slice/quote.
- **P2-D — existing parent symlinks:** both baseline write modes retain the
  lexical Windows/POSIX separator/case guard, then check the existing output
  parent's real filesystem path before `open(...,"wx")`. Real Linux temporary
  aliases into public, including nested public parents, reject without a file in
  the real public directory. Valid private-directory aliases work, remain
  exclusive, and retain bytes after a refused second write. Prior B1 Windows
  simulations and valid internal destinations still pass. Hostile concurrent
  filesystem swaps are outside the task's stated requirement.

## Actual rolling-report changes

[Machine-readable delta](notice-coverage-c1a1-astra-report-delta-2026-11-02.json)
compares both readers on the **same** complete sidecar and final events. The
previous-head CLI is run from a detached checkout with those exact inputs; its
bytes reproduce the earlier report. Report output remains deterministic.

| Item | Before | After |
| --- | --- | --- |
| Notices | 106 | 106 |
| Spans / unmatched spans | 725 / 710 | 725 / 710 |
| Spans with stated-offset instants | 54 | 54 |
| Partial / unprocessed / null attention status | 18 / 50 / 38 | 18 / 50 / 38 |
| Processed / ignored | 0 / 0 | 0 / 0 |
| Uncertain / complete / incomplete evaluation | 104 / 2 / 0 | 104 / 2 / 0 |

These unchanged distributions were observed, not enforced as a test oracle.
The rolling inventory does not gain a new dated span from the authored failure
cases; the discriminative synthetic regressions establish their correction.
There are eight real quote/ref changes in four notices:

- Genshin 21879: three former cross-row fragments such as `1\nSeptember` now
  refer to the within-line month/day text (`September 29`, and the other two
  stage dates). Missing years remain missing; no calendar year/instant is added.
- WuWa 5571 and ZZZ 714537487845820570 / 706649847851123193: five unresolved
  version/fraction/prose quotes stop at the block boundary instead of including
  closing paragraph/BR markup and following content. These lexical false
  positives remain unresolved; they are not certified calendar deadlines.

Parsed values, uncertainties and matching on all eight spans are unchanged.
Genshin 21946 additionally gets `content:unsupported_markup` plus unscanned
attention for its existing unclosed fiction-note Markdown emphasis. This is a
conservative formatting fallback, not a newly confirmed dated deadline. Its
status/evaluation were already uncertain and remain so. No other notice gains
an evaluation diagnostic. The report hash therefore changes legitimately:

- before: `686ef04cf0188aa556d0167a5fb4568680ca3464eac41d67968c5d4184e79a87`
- after: `4943adbbadb007e439c802ca6b26e3ebb4d29d6283521c67d88a86f60f8198e1`

All actual report spans were independently checked against original UTF-16
source slices, in addition to the per-test invariants. The 113 original
baseline identities and exact bytes remain unchanged; the seven absent Genshin
notices were not rebaselined away. Existing ignores remain unchanged.

## Validation and handoff

Required frozen install, typecheck, full build, separate feed build, repeated
coverage report and **74 focused coverage tests** pass. Full suite:
**1574 pass / 3 existing optional age skips / 0 fail** (1577 tests, 97 files).
[Fixed-clock identical-input comparison](notice-coverage-c1a1-astra-parity-2026-11-02.json)
against starting CURRENT main matches **all 10 public files**, 292 events,
153 reviewed winners, existing conflict, Timeline artifacts and the **complete**
E1/C0/C1a.0 sidecar: eight E1 entries/hashes, inventories, attributions, all
diagnostics and refusal semantics. No public files are committed or published.
Historical evidence/parity records retain their original checkpoints.

Final pushed head and exact-head GitHub CI, including PostgreSQL17 concurrency
and mandatory encrypted recovery, are recorded in PR161. No confirmed failure
among these four cases remains reproduced after correction. The reader remains
bounded and conservative on unsupported formatting/expressions; it is not a
complete CommonMark/HTML rendering implementation. Native Windows execution is
not claimed; B1 syntax simulations remain executable on Linux, and P2-D uses real
Linux symlinks. CI does not replace independent review.

Next: cheap focused Sonnet/DeepSeek re-review of **these four cases on the new
exact head**, followed by focused Astra closure after findings are resolved.
Do not repeat a broad full-PR audit absent meaningful new scope. Keep PR161
unmerged; do not start C1b/C2, Daily Passes or another milestone.
