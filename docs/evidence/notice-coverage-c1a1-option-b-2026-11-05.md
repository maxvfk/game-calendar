# C1a.1 final bounded closure — Option B (2026-11-05)

[Operator-approved finite contract](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6647933853),
following the [Opus decision memo](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6647707287).
Reviewed head: `b3b0ad36d6f3ff15212cc49164937eafc5e8ae98`.
Starting main: `3b5c8827c2dbd4783dadbcda210937299433bbcc`.
Final current main: `d867114001738817d9da72939b8b9a6045f4555e`.
Normal merge `e1c2e613ed8007bc42e3a25e24104b7f859cf584` completed without conflicts.
Main added frozen-fixture test repairs and the future-milestone workflow policy;
these files are inherited unchanged and excluded from the PR diff. Source inputs
and canonical generation did not change. All mandatory checks and parity were
repeated after integration.
Code checkpoint: `cbfd9974bfc52f4a4f4a1052e5f1b8e1fdee201b`.
PR161 remains open and unmerged. This is the last bounded C1 advisory-reader
correction; no further CommonMark development or later milestone is started.

## Narrow invariant

The existing Markdown link loop now inspects the bounded destination capture
before masking it. An HTTP(S) destination remains ordinary URL metadata. A
non-HTTP(S) destination containing an existing recognized date or unresolved
expression raises `masked_date_like_destination`. The original unresolved
pattern is shared unchanged, including incomplete dates, clocks, TBD/TBA,
missing-year dates and version-relative deadlines. Optional link titles are
excluded from this guard. Arbitrary standalone years/numbers do not qualify.

Metadata remains masked: no synthetic span, exact instant, timezone or attribution
is manufactured. Existing propagation produces `title:` / `content:` diagnostics,
`evaluation=uncertain`, `attention.required=true` and an uncertainty reason.
This also applies when every extracted span matches: an empty unmatched list
cannot erase the diagnostic. A reviewed whole-notice ignore retains its existing
explicit ignore semantics; this patch does not modify reviewed state.

The guard uses non-global reusable patterns and a destination bounded to 2048
UTF-16 units by the existing link recognizer; input/span/quote limits remain.
It adds no recursive reader invocation. Original UTF-16 maps and quoted spans
are unchanged. The container/fence recognizer, parseValue/timezone grammar,
canonical parsers, matching/status engine, CLI/path guard and all state bytes
are unchanged. No dependency or source was added/refreshed.

## Independent expectations and counterexamples

The new test file checks 14 date/deadline destination forms in both title and
content paths: ISO, relative date paths, numeric and month-name dates, invalid
and incomplete dates, clocks, TBD/TBA, tomorrow and version-update expressions.
Full coverage includes a genuinely attributed represented main event.

On the old reader, the final new file is **16 pass / 28 fail**. Direct old/new
full-notice replay confirms **22 processed/complete/no-attention → 22
partial/uncertain/attention**, plus six already-uncertain angle-word cases that
retain uncertainty and gain the specific diagnostic. All 28 now have the
field-qualified diagnostic. Every original span, instant and event match is
identical; the guard deliberately does not turn masked metadata into evidence.
[Recorded observations](notice-coverage-c1a1-option-b-report-2026-11-05.json)
are separate from the fixed test expectations.

Fifteen representative earlier P1-C counterexamples remain safe: inline/HTML
code, four spaces/tab, quote/bullet/ordered/nested containers, star/dash/underscore
thematic boundaries, empty item, invalid ordered interruption, lazy ancestry and
cross-container fence. Their actual literal cutoff is still extracted and
unmatched. All retain attention; closed/read literals have complete evaluation,
and the unclosed fence remains uncertain. Existing broader P1-A/P1-B/P1-C/P2-D
regressions, historical cases, insertion/reorder/duplicate state tests and
exclusive-write/symlink tests pass.

Positive controls retain HTTP(S) links, dated image URLs, ordinary relative links,
standalone years/numbers, optional titles, supported notices and exact covered
code literals. Every extracted quote checks `raw.slice(start,end) === quote`,
including supplementary Unicode. No tests authorize guessing offsets or years.

## Twelve affected existing test expectations, individually reviewed

All original input shapes and span/instant/missing-evidence assertions remain.
Only the newly prohibited certainty is changed; code-only covered positives
elsewhere remain processed/complete/no attention.

| Existing test | Reason and retained assertion |
| --- | --- |
| Genuine Markdown destinations / escapes | Relative `archive/2030-10-31.md` now uncertain; destination still absent, escaped visible date retained. |
| Residual code positives / real destinations | Separate bare quest destination now uncertain; covered inline/HTML exact dates retained. |
| Indented-code blanks / dedents | Dedented/continuation date destinations now uncertain; both literal gaps and exact clocks retained. |
| Ordinary indented continuations / three spaces | Both genuine non-URL date destinations now uncertain; only represented main/end spans retained. |
| Exact indented/backtick/HTML code | Separate bare date link now uncertain; all five visible spans explicitly matched. |
| Genuine paragraph/quote/list destinations | All table rows contain bare date destinations; metadata still excluded, no invented unmatched spans. |
| Blank container / code / dedent contexts | Normal prose date destinations now uncertain; both code deadlines remain unmatched. |
| Genuine prose / reliable list frames | All table rows contain bare date destinations; two original represented spans retained. |
| Prefixed blanks / lazy / real interruptions | Bare date destinations now uncertain; original source projection retained. |
| Valid fence / literal deadline | Separate outside bare date link now uncertain; exact missing code deadline still mandatory. |
| Covered valid fences | Outside bare date link now uncertain; all three visible spans still match. |
| Inline runs / fence exits / metadata | Three rows with outside date destinations now uncertain; four code-only rows remain complete/processed. |

No safety assertion is removed to accommodate the new guard. The initial run
against unchanged existing expectations reproduced exactly these 12 failures.

## Real-source comparison

Replayed `extractArticleEvidence` on historical snapshot bodies from pinned main,
deduplicating `sourceId|contentHash`. The latest **10/5/17/3/1** bodies listed in
Opus's memo reproduce its exact aggregate window: **139 unique revisions**,
Genshin59/HSR13/ZZZ16/NTE31/WuWa20; formats Markdown72/HTML36/BBCode31.
The committed record includes the content-identity/commit manifest. Independently
compared the additional older available history: **195 revisions** total.

For both corpora, title/content reader JSON is compared in full; all source
quotes are verified. Historical coverage comparison uses each first-observed
snapshot's genuine canonical parser outputs, capture fields null and a fixed
clock, without synthetic event removal or historical reviewed-winner claims.
The rolling report separately compares the same actual final winners/sidecar.

| Measurement | Opus window | All available main history |
| --- | ---: | ---: |
| Unique revisions / title+content reads | 139 / 278 | 195 / 390 |
| Changed reader outputs / diagnostics | 0 / 0 | 0 / 0 |
| Changed coverage records / statuses / attention | 0 / 0 / 0 | 0 / 0 / 0 |
| Markdown notices / links | 72 / 110 | 104 / 148 |
| HTTP(S) destinations / non-HTTP(S) destinations | 110 / 0 | 148 / 0 |
| New guard diagnostic notices | 0 | 0 |
| Markdown fences, quotes, indented-code candidates, inline ticks, HTML code/pre | 0 each | 0 each |
| HTML code/quote/comments/script/style; BBCode code/quote/noparse/styles | 0 each | 0 each |
| Existing `unsupported_markup` diagnostic notices | 3 | 5 |
| Existing `active_content_omitted` diagnostic notices (iframe) | 2 | 2 |
| Markdown thematic separators | 70 | 102 |

Existing diagnostic counts aggregate title/content once per notice; none change.
Unresolved-expression diagnostics occur in 70/84 revisions respectively. These
existing markup/active-content diagnostics remain actionable; the zero values
for code/container probes are not a claim that all source markup is understood.
No extraction failures. The broader 195-revision history is additional measured
coverage, not a claim that Opus examined it. Corpus facts do not predict future
syntax; Option B conservatively requires attention when the masking channel is
questionable, without further block-state expansion.

Current report: **101 notices / 714 spans / 699 unmatched / 54 stated-offset
instants**; status **20 partial / 44 unprocessed / 37 unclassified / 0 processed
or ignored**; evaluation **99 uncertain / 2 complete / 0 incomplete**. All 101
need attention; 82 are current baseline members. No status/diagnostic/span/attention
changes on identical inputs. Report bytes remain
`f563207a40ff2e05486e6ab6dbf8d0f628f291cdf96b09b973786cf9012c56e7`;
two corrected CLI runs also agree. Zero new diagnostics is explained by the
absence of non-URL date destinations, not an enforced distribution criterion.

## Starlight — explicitly accepted C1a.1 limitation

The real frozen October29 quest cutoff remains verbatim `2026/10/29 04:00`.
Both main-event-only and both-real-events scenarios remain **partial/uncertain**
with that cutoff unmatched: `t_lc` clocks have no independently verified server
UTC offset in this reader. Thus real-source discrimination is unresolved.
The separately authored **explicit-UTC synthetic analogue** demonstrates missing
quest → partial and represented quest → processed. It is not a timezone rewrite
of the real source. Existing tests verify both facts.

This limitation is accepted **for C1a.1 only**. Real-source discrimination remains
a measured gate for later context-resolution work; C2 needs its own stricter
evidence contract. No server offsets, missing years or version anchors are added
here. None of that later work is started by this patch.

## Validation and review handoff

Frozen install (109 locked packages, no changes), typecheck, full tests, build,
separate feed build and coverage report pass. **214 focused tests / 4322 assertions**;
full suite **1714 pass / 3 existing optional age skips / 0 fail**, 1717 tests in
98 files. [Fresh fixed-clock parity](notice-coverage-c1a1-option-b-parity-2026-11-05.json)
against current main matches **all ten public files**, 296 canonical events,
153 reviewed winners, Timeline/conflicts and **the whole E1/C0/C1a.0 sidecar**,
including eight E1 entries/hashes, notice inventories, attributions and all
diagnostics/refusals. Public hashes rechecked after the separate feed build.
All 714 rolling spans retain UTF-16 quote parity.

All **113 original baseline identities and exact bytes** are unchanged; SHA256
`f9495e8f1a09bc45f21773116870b836f65e63b24d471a4bf3c945362f244cb9`.
Final pushed head and exact-head CI URL/conclusion, including PG17 concurrency
and mandatory encrypted recovery, are recorded in PR161 after push.

Remaining limits: bounded link/markup recognition rather than full rendering;
conservative uncertainty for date-like non-URL destinations; other existing
unsupported markup requires its existing diagnostics. Historical WuWa coverage
in the Opus window is one snapshot (the wider replay adds earlier inputs).
No new universal CommonMark or C2 evidence-validation claim is made.

**Next:** Opus focused Option-B closure → Astra final closure → operator-authorized
merge. Passing CI is not review approval. Leave PR161 unmerged; no next milestone.
