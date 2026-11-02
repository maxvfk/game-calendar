# C1a.1 — final P1-B contextual token boundary

[Focused triage](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6589469457)
reviewed `27e3afe05c8763546995cf9f02caa465d88d3aa9`; P1-A, P1-C and P2-D were
independently confirmed fixed. CURRENT main remains
`dba863d373a3e50c9dce32fc45e2dda178adc460`, already integrated in the existing
PR161 branch. No merge, source refresh or later milestone is performed here.

## Minimal correction and counterexamples

The former continuation scan stopped unconditionally at `< > ~ – —`. Each of
`2026-11-02 12:29 UTC+8:30<5` and the four `>5`, `~5`, `–5`, `—5` alternatives
therefore yielded the exact instant `2026-11-02T03:59:00.000Z`. With a trustworthy
association to an event ending at that instant, the complete notice incorrectly
reported **processed / complete / no attention**.

Only the timezone continuation block and one contextual range regex change.
The scan now examines the full adjacent non-whitespace chunk. A separator can
end that chunk only when followed by an existing recognized date expression;
`~5` is not a dated range. Only trailing sentence punctuation is trimmed.
Whitespace, actual projected markup/block boundaries and genuine dated ranges
continue to delimit supported dates. No timezone is inferred, added or guessed.
The markup projection, code-context protection, BBCode/fragment policies,
matching/status engine and CLI containment guard are unchanged.

All five counterexamples now retain the **entire original malformed quote**,
`instant: null`, `unsupported_timezone`, **partially processed / uncertain /
attention required**. [Machine-readable before/after evidence and rolling delta](notice-coverage-c1a1-token-boundary-report-2026-11-03.json)
records observed results, not test goldens.

The nine added tests are independently authored synthetic cases:

- Five direct reader/full-notice regressions require no trusted instant or false
  processed status for the reported strings.
- An 18-case table crosses `< > ~ – — | : / ?` with a following digit or letter.
  Entity-decoded `<x` exercises visible punctuation rather than an unclosed raw
  HTML tag. Each case verifies uncertainty, unmatched evidence and attention.
- Positive controls retain ordinary terminal punctuation, whitespace-separated
  prose, explicit UTC and ISO offsets, six supported range separators in all
  three projected formats, and real inline/block markup boundaries. The ASCII
  hyphen control uses the existing spaced range syntax; no new date grammar is
  introduced. Original P1-A/P1-C/P2-D and clock-range tests remain untouched.
- Every extracted reader/coverage span verifies the original raw UTF-16 slice,
  including supplementary Unicode prefixes and entity/markup source mapping.

On the exact reviewed reader the final regression file has **49 pass / 6 fail**:
all five reported false-completeness tests plus the matrix fail; the positive
controls pass. After correction, **104 focused tests / 1527 assertions pass**.

## Rolling report changes on identical inputs

The previous-head CLI was replayed with the exact same final events and complete
sidecar as the corrected CLI. There is no input refresh in this comparison.
Repeated new reports match. Counts change from **776 to 774 spans** and **761 to
759 unmatched spans**; all other notice-level fields are unchanged.

Only NTE notices `1840944183787941` and `1836506165577421` change. Each formerly
split a dated `06:00` (missing offset) and standalone `11:00` at the en dash. It
now retains the whole `August 19, 2026, 06:00–11:00` or
`July 8, 2026, 06:00–11:00` expression as one uncertain quote. Both clock values
remain visible; neither a UTC offset nor an exact end is invented. These spans
were unmatched before and remain unmatched with `unsupported_timezone`.

Report remains **122 notices**, **54 stated-offset instant spans**, **18 partial /
64 unprocessed / 40 unclassified / 0 processed or ignored**; evaluation **120
uncertain / 2 complete / 0 incomplete**. All 774 actual source quotes were checked
independently with UTF-16 slices. This distribution is observed, not forced.
Report SHA-256 changes legitimately from
`90c1cc977182567772319012898bbe94715154e98a3edf35467e22e5bdc84f41` to
`20fbc663a1240b7c48a0c31ab684af9a41ffe3341fb7cccd00ff9cf0b3f6256c`.

## Validation and handoff

Frozen install (109 packages, no changes), typecheck, full suite, full build,
separate feed build and deterministic coverage report pass. Full suite:
**1604 pass / 3 existing optional age skips / 0 fail**, 1607 tests across 97 files
and 22223 assertions. No existing test was weakened.

[Fresh fixed-clock parity](notice-coverage-c1a1-token-boundary-parity-2026-11-03.json)
against CURRENT main verifies all **10 public files**, **292 canonical events**,
**153 reviewed winners**, conflict/Timeline artifacts and the **complete
E1/C0/C1a.0 sidecar** (eight E1 entries/hashes, inventories, attributions,
diagnostics and refusal semantics). The existing replay clock is
`2026-11-01T00:00:00.000Z` on both checkouts. Public manifests were checked again
after the separate fixed-clock feed build. All **113 original baseline identities
and exact bytes** remain unchanged; 100 current notices remain baseline members.
Baseline SHA-256:
`f9495e8f1a09bc45f21773116870b836f65e63b24d471a4bf3c945362f244cb9`.
No public/feed schema, source snapshot, reviewed data, canonical generation,
ID/date/precision/provenance, winner selection, workflow or Timeline change.

Final pushed head and exact-head CI including PG17 and mandatory real-age
encrypted recovery are recorded in PR161. This remains a bounded lexical reader,
not a complete document renderer or natural-language date parser. Existing
unsupported formats/expressions remain uncertain; no native Windows run is
claimed. No tested P1-B counterexample remains failing. CI is validation, not
independent review approval.

Next concrete step: **one focused independent closure review of P1-B on the
exact new head**, preserving the prior P1-A/P1-C/P2-D approvals. Leave PR161
open/unmerged. Do not begin C1b/C2, Daily Passes or another milestone.
