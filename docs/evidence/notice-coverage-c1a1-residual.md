# C1a.1 — residual Astra P1 closure evidence

[DeepSeek coordinator triage](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6580700179)
reviewed `a044be733e8b6226665a1d26139521e68fb162c7`. CURRENT main was fetched and
inspected at `dba863d373a3e50c9dce32fc45e2dda178adc460`. A normal conflict-free
merge (`eacaff50d538d2708358ba603366be875bc71612`) preserves reviewed history and
inherits the existing 13-file snapshot refresh. No upstream source was fetched.
The PR diff against new main excludes snapshots and the four already-merged
CI-RECOVERY files. Corrections change only the reader and its regression tests;
P2-D's CLI/path guard and matching/status contracts remain unchanged.

## Counterexamples and discriminative regressions

The final authored reader/notice regression file produces **28 pass / 18 fail**
on the reviewed reader with new main integrated; the same file passes after
correction. An earlier assertion set produced 29 pass / 17 fail. These are
synthetic counterexamples, not historical parser captures or implementation-made
goldens. Every span is checked against `raw.slice(start,end) === quote`, including
supplementary Unicode source prefixes. Negative cases have a represented exact
main period plus another missing or malformed deadline.

- **P1-A, BBCode:** parameterized `color`, `font` and `size` styles join the
  explicitly recognized inline-tag set. Thus `[color=red]2026[/color]-10-29`,
  `[font=Arial]2026[/font]-10-29` and `[size=12]2026[/size]-10-29` expose the actual
  date with original source mapping. Tags/attributes are inert; nothing executes.
  Empty/unfinished style syntax stays diagnosed. `[color options]`, `[font Arial]`,
  `[size 12]` and standalone `[color]` prose labels do not acquire tag semantics.
  Exact main dates within valid styles still yield processed/complete/no attention.
- **P1-A, blocks:** `<p>2026</p><p>-10-29</p>`, its BBCode equivalent and literal
  `2026\n\n-10-29` yield `split_date_fragments` uncertainty/attention without any
  manufactured `2026-10-29` date span. The same policy covers a split after the
  numeric month and Month / day[, year]. Recognition is deliberately narrow:
  only whitespace gaps of 1–8 line boundaries and at most 32 horizontal units per
  boundary, immediately adjacent to recognizable calendar fragments. Numeric
  candidates must pass existing calendar-day validation. This is a diagnostic
  probe, never an emitted assembled date or inferred year/offset. Isolated years,
  separate unrelated numbers, intervening prose and distant blocks are negative
  controls and remain complete when the real main period is covered.
- **P1-B:** an adjacent timezone chunk is inspected through punctuation; only
  trailing sentence punctuation is excluded from zone validation. `UTC+8:30,5`,
  `UTC+8:30;5`, `UTC+8:30!5`, `UTC+8:30)5`, `,5.` and `);5` cannot yield a trusted
  exact instant. Each is tested through full notice status/evaluation/attention.
  Valid UTC/ISO offsets and ordinary terminal punctuation remain supported.
  Punctuation followed by whitespace, or whitespace-separated `5 rewards`, does
  not attach that prose to the zone. Human clock-range, missing-offset and
  regional precision regressions remain green; no offset is invented.
- **P1-C:** a bounded code-context bitmap protects equal backtick runs and HTML
  `code`/`pre` context in Markdown from Markdown link matching. Literal
  `` `[Quest](2026-10-29T04:00Z)` ``, double-backtick equivalents and
  `<code>[Quest](2026-10-29T04:00Z)</code>` retain the visible exact deadline.
  Genuine link destinations outside code and URL metadata remain excluded.
  Positive code examples containing the represented end still match exactly.
  The fully read missing exact deadline yields **partial coverage, complete
  evaluation and required attention**, with the deadline retained unmatched.
  Complete evaluation describes reading, not coverage; fabricating parsing
  uncertainty for a correctly read exact date would weaken that distinction.
- **P2-D:** unchanged lexical separator/case and parent-realpath checks still
  reject public aliases in both CLI write modes; real Linux temporary symlinks,
  valid private aliases and exclusive `wx` creation are exercised by the existing
  CLI tests. No concurrent hostile filesystem-swap redesign was introduced.

## Three-way rolling-input replay

[Observed machine-readable comparison](notice-coverage-c1a1-residual-report-2026-11-02.json)
separates input changes from reader changes. The reviewed reader is run in a
detached integration checkpoint on the **same final events and sidecar** as the
corrected reader. No report distribution is a forced test oracle.

| Observation | Reviewed reader, old inputs | Reviewed reader, new inputs | Corrected reader, new inputs |
| --- | --- | --- | --- |
| Notices | 106 | 122 | 122 |
| Spans / unmatched | 725 / 710 | 776 / 761 | 776 / 761 |
| Stated-offset instants | 54 | 54 | 54 |
| Partial / unprocessed / unclassified | 18 / 50 / 38 | 18 / 64 / 40 | 18 / 64 / 40 |
| Processed / ignored | 0 / 0 | 0 / 0 | 0 / 0 |
| Uncertain / complete / incomplete evaluation | 104 / 2 / 0 | 120 / 2 / 0 | 120 / 2 / 0 |
| Current baseline members | 106 | 100 | 100 |

The refresh inserted 16 Genshin notices; no prior notice identity disappeared.
Six ZZZ notices changed content hashes, correctly losing baseline membership.
All **113 original baseline identities and exact bytes** remain intact, including
seven Genshin identities absent from both rolling inventories; no baseline was
reinitialized. SHA-256 remains
`f9495e8f1a09bc45f21773116870b836f65e63b24d471a4bf3c945362f244cb9`.

The report hash changes solely from refreshed inputs/capture metadata:
`4943adbbadb007e439c802ca6b26e3ebb4d29d6283521c67d88a86f60f8198e1` →
`90c1cc977182567772319012898bbe94715154e98a3edf35467e22e5bdc84f41`.
On identical new inputs, the readers produce **byte-identical** reports, including
quotes, spans, statuses, uncertainty and diagnostics. The fixes are established
by the discriminative synthetic tests, not by inventing rolling examples.
Existing source uncertainty and conservative lexical false positives remain
unresolved; no missing years, exact instants or regional deadlines are added.
Every actual report span was independently verified using UTF-16 source slices.

## Validation and remaining review gate

Frozen install (109 locked packages, no changes), typecheck, full suite,
full build, separate feed build and repeated `coverage:report` pass.
**95 focused tests / 966 assertions** pass. Full suite: **1595 pass / 3 existing
optional age skips / 0 fail** (1598 tests across 97 files; 21663 assertions).

[Fresh identical-input fixed-clock parity](notice-coverage-c1a1-residual-parity-2026-11-02.json)
against new main verifies all **10 recursive public files**, 292 canonical events,
153 reviewed winners, conflict/Timeline outputs and the **complete E1/C0/C1a.0
sidecar** (eight E1 entries/hashes, inventories, attributions, diagnostics and
refusal semantics). The existing replay clock is `2026-11-01T00:00:00.000Z` on
both checkouts; it is not a source-date inference. Full public manifests were
also rechecked after the separate fixed-clock feed build. No public/schema,
canonical ID/date/precision/provenance, reviewed winner or evidence-contract
change. Historical evidence records keep their original checkpoints.

Final pushed head and exact-head CI (including PG17 concurrency/privileges and
mandatory real-age encrypted recovery) are recorded in PR161. Native Windows
execution is not claimed. The reader remains a bounded lexical reader; the
fragment diagnostic is an explicit narrow policy, not general reconstruction
across arbitrary blocks. No confirmed residual counterexample remains failing
in these regressions. CI is not independent review approval.

Next concrete step: **focused independent closure review on the exact new PR
head**, checking the three residual P1 families and preserved P2-D behavior.
Leave PR161 unmerged; do not begin C1b/C2, Daily Passes or another milestone.
