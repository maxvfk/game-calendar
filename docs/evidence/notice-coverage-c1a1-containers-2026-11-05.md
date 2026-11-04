# C1a.1 — container-prefixed Markdown code closure

[Focused coordinator finding](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6642256602)
reviewed `e60ec30b4432c880db7be1b6d963f656f77451aa`. CURRENT main is still
`9488ecb3f578adb09b748600ac1cb58282724a88`, already integrated in PR161. No merge,
source refresh, data/UI change or later milestone is needed.

## Bounded correction and CommonMark distinctions

The previous scanner counted only physical leading indentation. A literal such
as `>     [Quest](2026-10-29T04:00Z)` therefore reached Markdown link masking
without code context. The reported quote/blank-quote/code sequence falsely gave
processed/complete/no attention, silently removing the deadline.

The line probe now recognizes only quote/list prefixes and relative indentation,
not a full Markdown block tree. It expands tabs into columns for this probe only;
all source maps and code-context bitmap positions remain original UTF-16 indices.
It consumes optional quote whitespace, bullet/ordered marker padding and known
list-continuation padding before testing code indentation. List padding follows
the 1–4 versus 5+ space distinction; indented code cannot interrupt a known
same-item paragraph. Blank container lines, item changes and dedents maintain or
reset the small container context. Prefix depth is bounded at **16**; exceeding
it yields `container_limit`, incomplete evaluation and attention, with the line
kept visible. Ambiguous lazy/container exits retain literals with explicit
`unsupported_code_context` uncertainty rather than a guessed block structure.

Examples of the independently authored distinctions:

| Source/context | Behavior |
| --- | --- |
| `> quote`, `>`, then `>     [Quest](...)` | Literal deadline retained |
| `-     [Quest](...)`, `1.     [Quest](...)` | Literal deadline retained |
| `>    [Quest](...)` | Three relative spaces: genuine prose link |
| `-    [Quest](...)` | Four spaces are marker padding: genuine item link |
| `- item`, blank, six-space code | Four relative spaces: literal retained |
| `- item`, blank, four-space link | Two relative spaces: genuine prose link |
| Same-item paragraph followed by relative indentation, without blank | Paragraph continuation remains a link |
| Nested quote/list, mixed tabs/spaces, blank quote lines | Relative padding/context retained |
| Uncertain container exit or changed context | Visible literal plus uncertainty/attention |

One earlier heuristic test classified `- List item` followed by four physical
spaces as ambiguous. It is now a positive genuine-link control: two spaces belong
to list padding, leaving only two relative spaces. Its expectation is corrected
for CommonMark semantics, not replaced with a weaker code assertion. The negative
code cases, other block-marker uncertainty cases and exact-match controls remain.

The final regression file has **71 pass / 13 fail on the reviewed reader** and
**84 pass after correction**. The complete focused set is **133 pass / 2453
assertions**. Ten clear code contexts, a prose-link matrix, nested dedents,
spaces/tabs, escaped markers, blank transitions, ambiguous exits, depth limits,
inline/fenced/HTML code and covered exact dates are exercised. All reader and
full-notice spans verify `raw.slice(start,end) === quote`, including supplementary
Unicode prefixes. These are authored synthetic expectations, not generated
goldens or claims about historical parser output.

[Observed before/after counterexamples and report](notice-coverage-c1a1-containers-report-2026-11-05.json)
show the reported family changing from processed/complete/no attention to
**partially processed / complete / attention required**, with the exact October29
deadline retained unmatched. Complete evaluation describes a completed read,
not complete calendar coverage. Uncertain cases remain explicitly uncertain;
limit cases are incomplete. Covered exact-date positives still become processed
without attention, preventing blanket suppression of genuine coverage.

P1-A, raw timezone grammar/P1-B, P2-D, CLI behavior and the accepted historical
CZN fixture correction are unchanged. No matching/status-engine or baseline
change; no new dependency or complete CommonMark parser.

## Validation, parity and report behavior

Frozen install (109 locked packages, no changes), typecheck, full suite, full
build, separate feed build and deterministic report pass. Full suite:
**1633 pass / 3 existing optional age skips / 0 fail** (1636 tests, 97 files,
23178 assertions). [Fresh identical-input fixed-clock parity](notice-coverage-c1a1-containers-parity-2026-11-05.json)
against current main matches **all 10 public files**, 296 canonical events,
153 reviewed winners, conflict/Timeline outputs and the **complete E1/C0/C1a.0
sidecar**: eight E1 entries/hashes, inventories, attributions, diagnostics and
refusal semantics. The existing replay clock is `2026-11-01T00:00:00.000Z` on
both checkouts. Public manifests were rechecked after the separate feed build.
All 113 baseline identities and bytes remain unchanged (SHA-256
`f9495e8f1a09bc45f21773116870b836f65e63b24d471a4bf3c945362f244cb9`).

The reviewed and corrected CLI produce **byte-identical rolling reports** on the
same sidecar/events: **101 notices / 714 spans / 699 unmatched**, status **20
partial / 44 unprocessed / 37 unclassified / 0 processed or ignored**, evaluation
**99 uncertain / 2 complete / 0 incomplete**, 54 stated-offset instants and 76
current baseline members. Report SHA-256 remains
`003a4cdbaa589ba0138dab8308268d6001dfde8aaeeaf057559e35c0dfd354cb`.
Repeated new reports match; all actual UTF-16 quotes were independently verified.
These counts are observed, not forced; the rolling input does not contain the
synthetic hidden-literal examples. No dates, offsets or regional ends are inferred.

Final pushed head and exact-head CI including PG17 concurrency and mandatory
real-age encrypted recovery are recorded in PR161. The recognizer is intentionally
limited to bounded container prefixes and indentation, not complete CommonMark
rendering. Uncertain transitions and excessive depth fail closed; native Windows
execution is not claimed. No confirmed counterexample remains failing in these
regressions. CI does not replace independent review.

Next: **one focused independent closure of this container-class P1-C on the
exact new head**. Keep PR161 open/unmerged; do not start C1b/C2, Daily Passes or
another milestone. Historical evidence retains its original checkpoints.
