# C1a.1 — F1–F6 corrections for focused Sonnet re-review

Reviewed head: `61c3d662cebb13ab0b1f287d97c2cb5d6502a1cb`.
[Triage](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6562545868).
Current main fetched and merged into the existing branch:
`32070cdf2ee131a15b4191bd91be16440c550710` (snapshot changes only).
No new source fetch, automatic fix, Issue, notification delivery, C1b/C2,
canonical parser/data/schema, E1/C0/C1a.0 or publishing change is introduced.

## Reproduction and fixes

The first independent literal-expectation regression run used the real frozen
Bun dependencies, including saxes: **2 pass / 8 fail**, before corrections.
The two passing tests are the new discriminative explicit-UTC F1 examples:
that finding was an acceptance weakness, not a reason to relax precision.
All F2–F6 failure paths reproduced. Additional edge cases brought the review
suite to 16 tests; combined with prior coverage tests, **47 focused tests pass**.

- **F1:** the original real Starlight body still contains the October 29 quest
  cutoff and November 2 end. Both main-only and both-event scenarios now assert
  the same four unresolved floating clocks. They cannot prove repaired exact
  coverage without absent source offsets. A separate, explicitly synthetic
  Starlight analogue states UTC clocks and trustworthy exact notice/event
  references: missing quest yields partial coverage and two unmatched quest
  boundaries; restoring the quest yields processed/complete and no gaps. Quotes
  and refs stay constant between these scenarios. Negative cases forbid matching
  clocks to approximate day fields and forbid inferring a region from one equal
  regional instant. Only an explicit adjacent `Asia:`/`Europe:`/`America:` label
  scopes a date; arbitrary earlier prose about a region supplies no scope.
- **F2:** ignore/baseline keys are `sourceId + noticeId + sourceUrl + contentHash
  + format`; position is just a report locator. Insertion and reorder preserve
  state, edits/URL/format changes invalidate it, and any duplicate source/notice
  ID blocks state application for every occurrence, including distinct content
  revisions. Creation and migration refuse ambiguous duplicate identities.
  The explicit migration CLI removed only the 113 committed positional fields;
  all 113 original content identities remain unchanged. It did not rebaseline
  today's inventory or grant suppression to new content. Existing ignores were
  empty; positional ignore entries fail strict validation and require review.
- **F3:** actual frozen NTE notice `1843481262703497` reproduces human
  `September 16, 2026, 00:00-12:00`, previously misreported as 12:00Z. It now
  retains an ambiguous clock-range/offset diagnostic with null offset/instant.
  Bare numeric offsets require adjacent ISO date-T-time syntax. Explicit UTC
  prefixes, ISO-T ±HH:MM/±HHMM and Z remain supported. Separated ISO clocks,
  positive/negative human clock forms, invalid timezone delimiters and the
  separately stated NTE UTC+8 eligibility instant are tested.
- **F4:** an isolated day date cannot certify a represented boundary solely by
  coinciding with its calendar day. It stays unmatched/uncertain with
  `isolated_day_requires_boundary_context`. Complete explicit ranges retain
  day-level matching only when both boundaries belong to the same event. No
  title similarity, guessed meaning, approximate exact match or fuzzy rule.
- **F5:** notices expose `attention:{required,reasons,unscanned:[{field,reason}]}`;
  sources count attention notices, and the report exposes `attentionRequired`.
  Oversized fields, span/quote/report ceilings, malformed tags, masked active
  content/comments and unreadable content remain actionable even with zero
  dated spans or no unmatched extracted span. `status:null` never means harmless.
  No fabricated date is created for unscanned content. Whole-notice reviewed
  ignores can resolve attention while preserving the diagnostic evidence.
- **F6:** supported BBCode formatting/attribute syntax is recognized explicitly;
  escaping is respected, unknown bracketed prose stays readable, and actual NTE
  FAQ `1841579228661424` no longer treats `\[User Center]` as an opening tag.
  `[Deadline October 29, 2026]` retains its date. Paired attributed Steam images,
  dynamic links, unfinished attributes and active HTML masking are covered.

## Report distribution and uncertainty

The [machine-readable before/after record](notice-coverage-c1a1-review-distribution-2026-11-02.json)
uses the **same current-main inventories** for both sides. Current main removed
seven Genshin notices; the inventory is now 106, versus 113 at the original
implementation checkpoint. Removed notices remain available in historical tests
and retain their original baseline bindings.

| Source | Notices | Partial | Unprocessed | Null status, attention required | Complete evaluation | Uncertain evaluation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Genshin | 32 | 2 | 20 | 10 | 0 | 32 |
| HSR | 13 | 3 | 5 | 5 | 0 | 13 |
| NTE | 31 | 9 | 15 | 7 | 0 | 31 |
| WuWa | 20 | 2 | 4 | 14 | 2 | 18 |
| ZZZ | 10 | 2 | 6 | 2 | 0 | 10 |
| **Total** | **106** | **18** | **50** | **38** | **2** | **104** |

Processed/ignored/incomplete counts are zero on this inventory. All 106 notices
have actionable attention and retain baseline membership. The 38 null rows have
no extracted dates; two complete evaluations are readable, unprocessed WuWa
notices, not processed notices. Baseline membership does not change any status.

Avoidable defects were reproduced and removed: malformed-markup notices fell
**8 → 0**, the NTE false UTC instant is gone, and Genshin baseline membership
recovered **5 → 32** under unchanged current input after eliminating position
binding. Status counts happen to remain unchanged; that is not the acceptance
proof. The discriminative and negative tests are the proof of these repairs.

Remaining uncertainty is intentionally separated from those defects:
86 span occurrences lack offsets; 133 use unsupported named server/global
qualifiers; 209 lack years; eight have ambiguous numeric ordering and one a
short year. These counts are nonexclusive lexical diagnostics, not certified
calendar deadlines. The 251 unresolved expressions include after-update/relative
phrases and known lexical false positives such as character/marketing names.
Those remain a reader limitation, not evidence that an offset/year exists.
Eighteen notices have isolated day boundaries with insufficient purpose context.
Final-winner reference/type/period refusals remain authoritative. One ZZZ notice
has masked active content and explicit unscanned attention. No remaining current
notice has `malformed_markup`. Zero processed is not itself a defect; no certainty
was manufactured to increase that count.

## Validation and handoff

Frozen install, typecheck, **1547 pass / 3 existing optional age skips / 0 fail**
(1550 tests, 96 files), full site build, separate feed build and deterministic
coverage report pass. The first full run encountered four inherited Genshin
rolling-input failures. All four reproduced on unchanged main (5 pass / 4 fail
across the two relevant test files). Historical tests now read the byte-identical
pre-turnover Git snapshot; all original counts, IDs, dates, merge and refusal
expectations are retained. No canonical parser behavior was changed.

[Identical-input fixed-clock parity](notice-coverage-c1a1-review-parity-2026-11-02.json)
against CURRENT main covers all 10 recursive public files, 292 canonical events,
153 reviewed winners, the existing NTE conflict, all Timeline outputs and the
complete E1/C0/C1a.0 sidecar, including eight E1 entries/hashes. All are identical.
No generated public files are committed. Two CLI replays are byte-identical.
Final exact-head hosted CI including PG17 and mandatory encrypted recovery is
recorded in PR161 after the final push; old-head green CI is not substituted.

Next step: focused **Sonnet re-review** of F1–F6 at the new exact head. Leave PR161
unmerged; independent Astra review follows a stabilized head. Do not start C1b/C2.
