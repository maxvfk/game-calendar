# C1a.1 — quote blanks, lazy ancestry and fenced-code closure

[Accepted coordinator triage](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6646804310)
reviewed `83691de83b1b76550631829d7bc0db315acac308`. CURRENT main remains
`fcd4a3998af0000c04aff68ca82dc3bbbb913659`, already integrated in the existing
PR161 branch. No merge, source refresh, unrelated data/UI change or new milestone
was needed. The prior thematic/container fixes remain in place.

## Three local corrections

1. **Quote blanks:** a blank line now expires quote frames missing from its
   physical prefix, together with their descendants. An unprefixed blank no
   longer keeps a closed quote's nested list padding alive. A shorter quote
   stack ends only missing quote scopes; valid surrounding list scopes remain.
   Prefixed blank lines preserve legitimate same-quote list continuation.
2. **Lazy continuation:** an ordinary lazy paragraph line retains bounded
   container ancestry for the next interruption decision. It consumes no
   imaginary padding on its own physical line and does not become a reliable
   top-level paragraph. Real root paragraphs and valid/invalid list interruptions
   remain distinct, including ordered siblings and marker changes.
3. **Fences versus inline spans:** the line probe recognizes opening fences at
   supported relative indentation. Backtick info strings cannot contain another
   backtick; fence/info lines are metadata. Active fences require the opening
   quote markers/list padding physically, without lazy code continuation. Valid
   closers must have the same marker, at least the opening run length, at most
   three relative leading spaces, and only trailing whitespace. Prose, a shorter
   run, a suffix or another container cannot close the fence.

When a fence's container ends, the current physical line is parsed anew. In the
reported `> ``` / > code / ``` / [Quest](...)` case, the column-zero run opens a
new root fence; it does not close the quoted fence. Its missing closer produces
`unclosed_code_fence` uncertainty while retaining the literal deadline. Supported
implicit container exits restore normal prose/link handling. Inline backtick
spans are scanned separately, may cross soft paragraph lines, and cannot pair
with fence markers or across known block boundaries. Literal backticks/tildes in
known code are not mistaken for unsupported Markdown formatting.

This uses the existing bounded prefix probe, source bitmap and input/depth/quote
ceilings, not a complete CommonMark parser or dependency. Original UTF-16 indices
are used for every code-context mark; source content is never executed. P1-A,
raw timezone grammar/P1-B, P2-D, matching/status engine, CLI, baseline/ignore and
the accepted historical CZN fixture correction remain unchanged.

## Old/new complete-notice evidence and controls

[Machine-readable replays and semantic references](notice-coverage-c1a1-fences-report-2026-11-05.json)
record the following independently authored full-notice cases, each with a
represented main event and an unrepresented explicit quest deadline:

| Case | Reviewed reader | Corrected reader |
| --- | --- | --- |
| Unprefixed blank closes quote/list ancestry | processed / complete / no attention | partial / complete / attention |
| Lazy ordered-list paragraph followed by empty bullet/code | processed / complete / no attention | partial / complete / attention |
| Cross-container backtick pairing | processed / complete / no attention | partial / uncertain / attention |

All corrected cases retain exact `2026-10-29T04:00Z` evidence unmatched. No
instant or offset is inferred: that UTC instant is explicitly present in the
literal source. Complete evaluation means the input was read, not that every
deadline is represented; the unclosed-fence case remains explicitly uncertain.

The final authored file produces **105 pass / 16 fail on the reviewed reader**,
**121 pass after correction**. Full focused set: **170 pass / 3621 assertions**.
Controls include nested quote/list scopes, shorter/unprefixed versus prefixed
blanks, lazy paragraphs and marker/ordered changes, genuine links, top-level
code, valid inline/fenced/HTML code, prose runs, mixed run lengths, longer valid
closers, wrong closing suffixes/containers, spaces/tabs/CRLF and exact covered
deadlines. Every reader/full-result span checks `raw.slice(start,end) === quote`,
including supplementary Unicode prefixes.

The old uncertainty-only closed-fence marker row now belongs to explicit known
code-boundary controls. Missing-date/unmatched/attention assertions remain, and
covered exact-date cases must become processed/complete/no attention. Previous
positive controls remain intact. No assertions are weakened to hide a deadline.

The existing **Pandoc 3.1.11.1 commonmark reader** independently renders **32
synthetic controls** matching separately authored literal/destination expectations.
The command, inputs and observed HTML are in the machine-readable evidence.
Pandoc is verification-only; no project dependency, network fetch or CI tool
requirement is introduced. Bun tests use literal authored expectations rather
than implementation-derived goldens or invented historical parser captures.

## Validation, parity and rolling report

Frozen install (109 locked packages, no changes), typecheck, full suite, full
build, separate feed build and deterministic report pass. Full suite:
**1670 pass / 3 existing optional age skips / 0 fail** (1673 tests, 97 files,
24346 assertions). [Fresh fixed-clock parity](notice-coverage-c1a1-fences-parity-2026-11-05.json)
against CURRENT main matches all **10 public files**, 296 canonical events,
153 reviewed winners, conflict/Timeline artifacts and the **complete E1/C0/C1a.0
sidecar**: eight E1 entries/hashes, inventories, attributions, diagnostics and
refusal semantics. Both builds use the existing `2026-11-01T00:00:00.000Z` replay
clock; public manifests are rechecked after the separate feed build.

All **113 baseline identities and exact bytes** remain unchanged, SHA-256
`f9495e8f1a09bc45f21773116870b836f65e63b24d471a4bf3c945362f244cb9`.
The reviewed and corrected CLI give **byte-identical rolling reports** on the
same current-main inputs: **101 notices / 714 spans / 699 unmatched**, status
**20 partial / 44 unprocessed / 37 unclassified / 0 processed or ignored**,
evaluation **99 uncertain / 2 complete / 0 incomplete**, 54 stated-offset
instants and 82 current baseline members. Report SHA-256 remains
`f563207a40ff2e05486e6ab6dbf8d0f628f291cdf96b09b973786cf9012c56e7`.
Repeated new reports match; every actual UTF-16 quote is independently checked.
These are observed distributions, not forced acceptance criteria. No frozen
rolling example is invented to demonstrate the synthetic corrections.

Final pushed head and exact-head CI including PG17 concurrency and mandatory
real-age encrypted recovery are recorded in PR161. All three confirmed failures
pass their regressions. Remaining limitations are explicit: bounded container
and fence recognition rather than complete rendering; ambiguous/unmatched
inline syntax and unclosed fences require uncertainty, excessive depth is
incomplete. No native Windows execution is claimed. CI is not review approval.

Next: **Opus focused closure of these three P1-C cases on the exact new head**,
then Astra final closure after stabilization. Keep PR161 open/unmerged; do not
begin C1b/C2, Daily Passes or another milestone. Historical evidence retains its
original checkpoints.
