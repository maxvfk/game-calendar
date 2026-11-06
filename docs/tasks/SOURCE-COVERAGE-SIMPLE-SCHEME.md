# Source coverage — simple scheme (audit + fixes)

**Status:** DESIGN. Direction chosen by the operator on 2026-10-28. Each step below is built
only when the operator starts it.
**Replaces:** the Source Recovery R1–R3 design in
[PR #113](https://github.com/maxvfk/game-calendar/pull/113), closed unmerged on 2026-10-29;
its review findings are kept where they still apply.
**Design review:** operator comments on
[PR #147](https://github.com/maxvfk/game-calendar/pull/147) (2026-10-29), folded in below.
**Rule that does not change:** a confidently wrong date is worse than a missing one (`AGENTS.md`).
**Current implementation checkpoint (2026-11-01):** C0 is merged via
[PR #152](https://github.com/maxvfk/game-calendar/pull/152). C1 starts with a
bounded WuWa notice-inventory extension, not a reopening of C0.
**Re-order (2026-11-05):** source date context
(CTX) and the read-only C5 stage 1 probe move ahead of C2–C4, and C1b is split into
two phases. See [Re-order 2026-11-05](#re-order-2026-11-05-context-first).

## Why a different scheme

The data gaps found so far had two causes:

1. **A dated notice is already in our snapshot, but no event, or not every event or deadline,
   was made from it.** The Genshin audit of 2026-10-28 found Overflowing Favor, Starlight Voyage
   and the Phase II weapon wish all inside `snapshots/genshin-kqm-ginews.md`; the parser did not
   recognise their layout. HSR 4.6 Lightward (#119) is the same kind: all four windows were in
   the KQM HSRNews snapshot, but the parser skipped the `7. Others → Gameplay` section.
2. **The event is in no source we read.** Example: the four HSR 4.6 Warp and Light Cone channels
   (#137), announced on HoYoLAB but absent from the KQM index.

Fixes #130–#143 (the 2026-10-28 recovery wave) all came from per-game coverage audits, and most
changed only `data/reviewed`. Outages happen too (ZZZ banners, #112), but they already turn the
refresh run red.

The R1–R3 design aimed at outages and at agents that repair code by themselves. Making that
safe needed token isolation for a tool-using agent, a branch policy for `main`, an incident
state machine and family coverage contracts. That is too much for a one-operator calendar, and
it would not have caught most of the gaps above.

## The scheme

| Part | What | AI |
| --- | --- | --- |
| 1 | List of unprocessed notices, updated by every refresh | None |
| 2 | Coverage audit per game, due when a new banner phase starts | An operator-started session |
| 3 | Fix rules and a date-evidence check for reviewed records | None |
| 4 | Liveness check of the refresh schedule | None |
| 5 | Model extraction for part 1 (target stage, introduced in steps) | Like Timeline labels: no tools |

### Part 1 — unprocessed notices

For sources that publish separate articles (KQM GINews and HSRNews, ZZZ and NTE Steam news,
the WuWa Kuro mirror), **every** item in the snapshot is listed with its source and item ID,
including items that produced nothing. C0 currently provides full inventory for the first four
sources only. WuWa's existing E1 extractor supplies evidence for emitted events, **not** an
independent inventory of every Atom entry; C1a.0 must close that gap before C1 statuses are
assigned. Each inventoried item gets one status:

- **processed**: every dated span in the item matches a start or end of an event produced from
  it (in the merged feed, or a reviewed row that cites the item);
- **partially processed**: the item produced events, but at least one dated span matches none
  of them. Example: Starlight Voyage, where the event end was taken but the earlier
  quest-completion cutoff in the same notice was not. Without this status the list would report
  "processed" on exactly our typical misses;
- **ignored**: listed in a Git-reviewed file `data/coverage/ignored-notices.v1.json` with the
  source, item ID and a reason category (maintenance, shop, web event out of scope, and so on);
  an ignore entry may name single dated spans instead of the whole item;
- **unprocessed**: the item contains a dated span, but produced no event and is not ignored.

Date detection is deterministic: month-name and numeric dates, with or without time and offset.
It finds dated spans; it does not try to say what each span means. Each new unprocessed or
partial item needs one decision: ignore it (or the span) or fix the data.

**Baseline.** Items present when the list is switched on are recorded once in a baseline. The
baseline only keeps them out of notifications at launch; it does not mark them as checked. The
report can still be replayed over them, and over historical snapshots.

**Priority.** Items whose dated span falls within the next 7 days are listed first and marked
urgent in the notification, without waiting for the next audit. This is ordering and a marker
only, for manual triage; nothing is started automatically.

Table-like pages (Prydwen, wiki.gg, ntebuild, the ZZZ banner JSON) have no separate items;
part 2 covers them.

**Notification.** One pinned issue, "Coverage inbox". After each refresh a step rewrites its
body with the current list, and adds a comment only when a new item appears, so the operator
gets a GitHub notification. The issue is output only: the state lives in Git (ignore list,
baseline, audit log), never in issue text or comments. This step must not turn the refresh
run red.

**Built on C0**, which provides the item list and the event-to-item mapping.

#### C1 implementation boundaries (2026-11-01)

- **C1a.0 — WuWa notice inventory first (separate PR).** Reuse the existing
  `wuwa-kuro-mirror` Atom article discovery and E1 sidecar. Enumerate every actual
  entry, including zero-output and non-calendar posts; use stable
  `(sourceId, articleId)` identity and truthful source URL/capture metadata. Keep
  each article's source text for later partial-coverage analysis. Attribute each
  emitted WuWa event to exactly one matching article, or report explicit
  fail-closed diagnostics for missing, duplicate or ambiguous links. Preserve
  existing event-local WuWa E1 excerpts/hashes and all public feed/Timeline bytes,
  event IDs and reviewed precedence. Do not implement coverage statuses or new
  ingestion sources here. The acceptance test must replay zero-output, multi-event,
  malformed/duplicate entries and unchanged public output on pinned inputs.
- **C1a.1 — deterministic coverage engine (separate PR).** Build on five
  notice-based sources (C0's four plus WuWa), reuse one bounded date-span reader
  in C1 and later C2, match periods conservatively, retain unmatched spans, and
  implement statuses, ignore-by-notice-or-span and a notification-only baseline.
  A notice with one recognized event and another unmatched deadline must not be
  marked `processed`; Starlight Voyage is the required historical regression.
  A date alone is not proof of an in-scope event, and an ambiguous or unreadable
  span must not become a confident complete-coverage claim.
- **C1b — GitHub Coverage Inbox (separate PR; two phases per the 2026-11-05 re-order).**
  Phase 1 (C1b.1) notifies only on new notices that emitted zero events; the C0/C1a.0
  inventory already supports this. Phase 2 (C1b.2) adds partially-processed notices
  after CTX shows real-text discrimination. Integrate the read-only report
  into refresh as a best-effort side effect; the canonical baseline and ignore
  decisions live in Git, not GitHub Issue text. One pinned issue, idempotent
  updates, notify only on genuinely new items and prioritize upcoming seven-day
  deadlines. Issue failures cannot make refresh red or change published data.
- **Seven-game visibility is not seven-game notice coverage.** Endfield's
  currently scheduled wiki.gg Events/Echoes pages and CZN's Prydwen banners are
  structured/table-like surfaces, not independent first-party notice feeds.
  Until a separate permitted official notice source is integrated, C1 must
  explicitly show them as `notice inventory not supported / not evaluated`
  (or an equivalently explicit source-level limitation), **never** `processed`
  or complete because their notice inbox is empty. C3's source-family audit
  covers all seven games, including missing announcement families and sources
  not ingested. Adding new official transports needs separate scope, access/terms
  review and operator authorization; it is not part of C1a.0.

The recommended execution is one coordination cycle for C1a.0 → C1a.1 → C1b,
but **one short-lived Codex branch/PR and independent review per substep**.
No next substep or C2 starts automatically before the preceding PR is verified
and merged. C2 reuses the bounded C1 date reader but introduces its own reviewed
per-field evidence and CI migration in a separate milestone.

### Part 2 — coverage audit

**When.** An audit for a game is due when either:

- a banner event of that game started after the game's last audit, at least one day ago (by
  then the phase notices are out, while deadlines are still ahead); or
- the game was last audited more than 21 days ago (in case the banner itself was missed).

A daily step computes this from the feed and the audit log and posts it as a comment in the
same issue. With seven games and phases about every three weeks, that is two or three audits a
week.

**How.** One game per session, started by the operator in Claude Code (local or web) or
ChatGPT Work, with the standard prompt `docs/coverage/AUDIT-PROMPT.md` (to be written, about
30 lines). The session:

1. reads the game's current events in the feed, its unprocessed and ignored notices and the
   official announcements for the current phase;
2. writes a short table: event, source link, quote with the date, status (present / missing /
   wrong);
3. fixes urgent gaps by the rules in part 3, in **one PR**;
4. appends one entry to `data/coverage/audit-log.v1.json` (game, date, phase, result, PR);
5. lists open product-scope questions (for example Miliastra, web events, cosmetics) for the
   operator instead of deciding them.

No separate research PR, backlog file or checkpoint protocol: a one-game session is short
enough to finish or redo.

### Part 3 — fix rules and date evidence

- **Urgent gaps go into `data/reviewed` first.** After that, choose the cheaper lasting fix, with
  no fixed threshold:
  - a one-off reward or event: the reviewed row is enough;
  - a proven repeating defect in a family we already parse: a narrow parser or source fix, with
    the notice and the reviewed row as its test fixture;
  - a new permanent mode (for example a new endgame cycle): assess a lasting integration right
    away instead of waiting for it to be missed again;
  - no reliable source or rule for the future: restore only the confirmed windows as reviewed
    rows; do not predict future cycles.

  Part 5, once running, is meant to fill layout misses without a parser change each time.
- All `AGENTS.md` data rules apply: stable IDs, `firstSeenAt`, no guessed year, time or end,
  no mixing of provenance.
- **Evidence on reviewed records.** Add an optional `evidence` to `ReviewedEvent`: one source
  `url` and `checkedAt`, and a short list of `{ fields, quote }`. Each entry names the date
  fields it supports (`startsAt`, `endsAt`, or a `regionEnds` key), because a start, an end and
  per-region ends are often in different lines of one article. Evidence becomes required for
  every row added or changed after the cut-over; rows present at the cut-over are listed once
  as legacy.
- **CI check.** Every dated field of such a row must be covered by one entry. CI reads the date
  in each quote with the same deterministic date reader as parts 1 and 5 and requires it to
  match the named field after time-zone conversion, at the stated precision. A server-time
  quote ("04:00 server time") needs a reviewed, source-scoped server-time rule (from CTX, with
  C2 adding its own stricter acceptance contract); without one the
  field stays at day precision. The reader covers the date formats our sources use, not every
  possible format. An unreadable or ambiguous quote fails CI: the row goes to `unknown` or day
  precision, or the reader is extended. It is never bypassed with a guessed exact time.

### Part 4 — liveness

The refresh already fails on a newly broken source, and GitHub mails the failure. A refresh that
stops running sends nothing. Add a dead man's switch: refresh pings an external check after a
successful run, and the service mails the operator after more than 24 hours of silence (two
missed runs at `27 5,17 * * *`, allowing for multi-hour schedule delays). This also covers
GitHub disabling schedules after 60 days without repository activity. The service account is
the operator's; the ping URL is stored as a secret.

**Publication freshness (added 2026-11-05).** A heartbeat on successful refresh is not
enough. From 2026-11-03 22:23 to 2026-11-05 01:25 UTC every scheduled `Refresh sources` run
succeeded, but the CI it dispatched failed on a test, so `Deploy to Pages` was skipped and the
live site kept the 2026-11-03 12:53 data for about 36 hours without any alert beyond the CI
failure mails. Add a small independent check that compares what was refreshed with what is
live: for example, the newest committed `snapshots/*.meta.json` `contentChangedAt` against the
live feed's `sources[].contentChangedAt` / `generatedAt`, or the newest successful CI/Pages
deployment on `main`. It alerts when newer committed source content has not reached the live
feed within a bounded delay, and stays quiet when sources simply did not change. It is
independent of CTX and C5.1 and can be scheduled on its own.
The in-page half of this check ships first as `StaleFeedNotice`: a page-wide
notice when no source in the published feed has refreshed for
`PUBLICATION_STALE_AFTER_MS` (30 hours, `src/shared/feed.ts`), so the operator
sees a stalled publication where they already look. The repository-side
comparison of committed snapshots against the live feed remains part of C4.

### Part 5 — model extraction for unprocessed notices

This is a target stage of the scheme, not an optional experiment: sources often already
contain an event, its type or a separate deadline that the parser does not recognise, and part 5
is how those gaps get filled without changing a parser each time. The parser stays the primary
path. The model only handles items that part 1 lists as **unprocessed or partially processed**
(for a partial item it also gets the events already made from it), using the same pattern as the
Timeline labels:

- **Input**, built in the job from the snapshot with no network access: the notice text, the
  game's current events and a Git-reviewed scope policy (what counts as an event).
- **Call:** a configurable provider and model with no tools, output constrained by a JSON
  schema. Reuse the existing Timeline label infrastructure where it fits: DeepSeek through
  `scripts/timeline-label-agent/run-deepseek.ts`, or `claude -p --tools ""` through
  `scripts/timeline-label-agent/run-model.sh` (usage-limit and auth handling); other providers
  are optional. No production path depends on a model being available. For each notice the
  model returns either:
  - `event` with a title, type and the **verbatim quote** of each date line;
  - `ignore` with a reason;
  - `unsure`.
- **The model does not compute dates.** Code does all the checks:
  - every quote must occur verbatim in the notice text;
  - the date reader parses it and converts it to UTC;
  - a server-time quote without a supported, source-scoped CTX rule makes the item `unsure`
    (without CTX almost every real notice is `unsure`);
  - an overlap with an existing event (same period, similar title) is not published but
    reported;
  - the result passes the normal schema validation and calendar sanity checks.
  - Anything that fails stays in the inbox for the operator.
- **Remaining risk:** the model can attach the wrong date from the same notice to an event (the
  Starlight Voyage quest cutoff on Oct 29 versus the event end on Nov 2). The quote check cannot
  see that: a verbatim quote proves only that the text is in the notice, not that it belongs to
  the event the model named. The stages below measure it before anything is published
  automatically.

Stages:

1. **Probe** (read-only, like Timeline M3; step C5.1). Run on the notices behind fixes #119 and
   #130–#143, including notices with several deadlines (Starlight Voyage), and compare with the
   reviewed records made by hand. Provider and model are configurable (for example DeepSeek and a
   Claude model side by side). Measure, against that ground truth: detection recall, date-to-event
   attribution (especially the Starlight two-deadline case), duplicates of existing events,
   unsupported or ambiguous outputs, cost and latency. Report two layers separately:
   (a) event and quote discovery, measurable **before** CTX; (b) verified date conversion and
   matching, measurable only **after** CTX. The probe writes only a report; it never changes data.
2. **Proposals.** Runs after refresh. Results go to the inbox issue as proposed reviewed rows,
   with evidence; the operator applies them by hand.
3. **Automatic recording** is the intended end state, enabled only by a separate operator GO on
   measured criteria, not on time without visible errors. On the known misses and on the
   proposals so far:
   - detection: the known gaps are found;
   - attribution: each date is attached to the right event (the quest cutoff versus the event
     end);
   - no duplicates of existing events;
   - regional clocks are correct;
   - ambiguous cases fail closed;
   - rollback is shown to work.

   Even then, only classes shown to be safe are recorded automatically; suspicious or
   ambiguous items stay in the inbox. Behind a kill switch (`vars.COVERAGE_EXTRACT_AUTO`), into
   a separate file, with its own `extractionMethod` value so the records can be told apart and
   reverted. Write job without the Claude secret, fast-forward push and CI dispatch, as in
   `record.sh`. Model output is a proposal, never the source of truth; dates are always
   converted by code.

Usage: an empty inbox makes no call. A notice is roughly 1–3k tokens, so the expected load is
tens of thousands of tokens a week, comparable to Timeline labels; this is an estimate to
confirm in the probe. Run it on the evening refresh, away from the Timeline runs (Tue and Sat
04:23 UTC).

## Order

Work starts after the current recovery wave
(`SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE.md`) is finished; the wave runs under its own
rules and this scheme does not change it. Agreed with the operator on 2026-10-28.

| Step | Scope | Done when |
| --- | --- | --- |
| C0 | Event Context E1 evidence extraction for the article sources: KQM GINews and HSRNews, ZZZ and NTE Steam news | Two checks hold: (a) every item in the current snapshot is listed with its source and item ID, including items with no event; (b) every emitted event maps to its item, or fails closed with a diagnostic. Public feed files stay byte-identical |
| C1a.0 | Extend the existing E1/C0 notice inventory to every WuWa Kuro Atom entry before classification | All WuWa entries, including zero-output, have stable IDs and source text; every emitted event has an unambiguous article link or diagnostic; prior WuWa E1 and public outputs remain unchanged |
| C1a.1 | Part 1 offline coverage engine for five notice sources: bounded date reader, `processed`/`partially processed`/`unprocessed`/`ignored`, span ignores and notification-only baseline | Historical replay flags #119 and #130–#143 where the relevant notice is in a tracked snapshot; Starlight's earlier quest cutoff is `partially processed`, not a false `processed` |
| C1b.1 | Part 1 operational Coverage Inbox, phase 1: one pinned issue listing **new** notices from the C0/C1a.0 inventory that emitted **zero** events; seven-day priority, idempotent best-effort refresh updates; the issue states the five-source limit | Replayed output and actual refresh integration do not change public feed or turn refresh red; new-item notification is bounded; no notification for existing uncertain spans; Endfield/CZN and other unsupported sources are shown as not evaluated, never complete |
| CTX | Source-scoped date semantics for **matching and reporting only** (see below) | The design-review acceptance contract holds on a labeled, source-realistic corpus: per-notice discrimination and an explicit false-`processed` guardrail, with the required real-text cases (see below); the match count is a progress measure only; public files byte-identical |
| C5.1 | Part 5 stage 1: read-only, provider-agnostic model probe | Probe report compared with the reviewed records: detection recall, date-to-event attribution (Starlight), duplicates, unsupported/ambiguous outputs, cost, latency; discovery and verified conversion reported separately |
| C1b.2 | Part 1 inbox, phase 2: add `partially processed` notices; starts only after CTX shows actionable partial-notice discrimination on real source material | Notifications for partial notices on real snapshots are few and actionable, not every notice |
| C2 | Part 3: per-field `evidence`, date reader, CI check, legacy list | Fixes #130–#143 rewritten as test cases pass; a wrong date, or a field without a quote, fails |
| C3 | Part 2: audit prompt, audit log, due computation | One real audit run end to end for one game |
| C4 | Part 4: dead man's switch and publication freshness check | A deliberately skipped ping produces mail; committed source content that does not reach the live feed within the bounded delay produces an alert; unchanged sources produce none |
| C5.2–5.3 | Part 5 stages 2–3, each a separate operator decision | Stage 3: the measured criteria above are met |

C0 to C4 and CTX involve no AI. C5.1 is read-only and publishes nothing. C3 and C4 do
not depend on CTX or C5.1 and can be scheduled whenever convenient; C4's publication
freshness check is worth prioritizing on its own.

### Re-order 2026-11-05: context first

**Status:** introduced by the PR that adds this section; merging it is the operator's
acceptance of the new order. Evidence: the C1a.1 measurements and decision memo on
[PR #161](https://github.com/maxvfk/game-calendar/pull/161#issuecomment-6647707287).

**Why.** On the real snapshots the C1a.1 engine matches 15 of 714 dated spans; all 101
notices need attention and none is `processed`. The reader is not at fault: the
ordinary source date forms are version-anchored starts ("after the Version 7.2 update"),
dates without a year (mostly NTE), `(server time)`/`(global)` clocks and clocks without a zone.
The plan only resolves them in C2, after C1b. Part 5 has the same dependency: the model
returns quotes, code converts them, and a server-time quote without a supported server-time
rule is `unsure`. So C1b.2, C2 and C5 all wait on the same missing piece. Fixing parsers one layout
at a time does not remove that dependency, and model extraction is the intended long-term
answer to layout drift (Part 5), so it should be measured early rather than last.

**CTX scope: source-scoped date semantics, matching and reporting only.**

CTX is not one universal per-game UTC table. Each rule names the source or notice family
it applies to and the exact semantics it supports, and cites its evidence:

- KQM `<t class="t_lc">` (server-local) versus `t_gl` (global) clock tags;
- HSR `(server)` versus `(global)` qualifiers, and the equivalent `(server time)` forms of
  other sources;
- regional boundaries for each such rule (which regions, which offsets, any DST rule);
- year context: from the notice's publication date or explicit title/version context, as the
  NTE parser already does, only where unambiguous;
- version anchors: "after the Version X update" resolved against a reviewed version-start
  source.

Existing parser knowledge is reused only where it is backed by the cited source and an
explicit contract, for example Genshin's fixed UTC+8 / UTC+1 / UTC−5 regional `t_lc` clocks
(`test/fixtures/genshin/README.md`). A daily-reset clock is **not automatically** an
event-time offset: `docs/research/daily-reset-clocks/` documents reset behaviour, and for NTE
its regional server offsets and DST are explicitly unverified
(`docs/research/daily-reset-clocks/nte.md`). Unsupported, unverified or conflicting contexts
stay uncertain and can never certify `processed`. Every CTX-derived match records its
derivation (rule, source, inputs) and stays visible in the report. **CTX never writes
published fields:** published dates still come only from parsers and reviewed rows, under the
`AGENTS.md` data rules. CTX is high-risk work under `docs/DEVELOPMENT-WORKFLOW.md`, so it
starts with a read-only design review. C2 later validates stricter field-level date evidence
independently; CTX matching is not C2's acceptance standard.

**CTX acceptance: correctness before match count.** The current 15 of 714 matched spans is a
progress measure, not a success condition. The design review defines:

- a labeled, source-realistic validation corpus drawn from tracked snapshots and historical
  fixtures;
- precision/recall or equivalent per-notice discrimination measures;
- an explicit **false-`processed` / false-completeness guardrail**.

Required cases: the actual frozen Starlight text in both states (main event only →
`partially processed`; main event plus quest deadline → `processed` only if the evidence
really supports it); #119; conflicting and unknown server clocks; ambiguous years; and a valid
quote attached to the wrong deadline. If the rest of a notice cannot be fully evaluated, it is
not forced to `processed` to improve the metric.

**C5.1 earlier.** Stage 1 is read-only, provider-agnostic and depends only on C0/C1a.0
notice texts, the reviewed records as ground truth and, for date conversion, CTX. Event and
quote discovery can be measured in parallel with CTX; verified conversion and matching follow
once CTX lands. A verbatim quote is not proof of attribution, so attribution is scored against
the reviewed records, not assumed. The probe results decide how much precision
C1b.2 and C2 still need, before effort goes into them.

**Phase boundaries and unchanged parts.** C1a.1 finishes on PR #161 under its own closure
contract, with no reopening or speculative date-reader rewrite here. C1b.1 notifies only on
new zero-output notices, states the five-source limit, and does not notify on existing
uncertain spans or claim completeness for Endfield/CZN. C1b.2 starts only when CTX shows
actionable partial-notice discrimination on real source material. No step starts
automatically. Stages 2–3 of Part 5 keep their separate operator GO and measured criteria.
Sources that no notice feed covers (Endfield, CZN, events absent from tracked sources) still
need Part 2 audits and new sources; neither CTX nor Part 5 can find events the project
does not read.

**Why C0 came first.** WuWa E1 originally associated source text with emitted
winners but did not enumerate all zero-output Atom entries
(`docs/evidence/event-context-wuwa-e1.md`). Merged C0/PR #152 added full
inventory and event-to-notice attribution for KQM GINews/HSRNews and ZZZ/NTE Steam
(`docs/evidence/article-source-c0.md`). C1a.0 completes that inventory contract
for WuWa before C1's shared date reader, statuses and inbox. C1/C2/C5 can then
reuse the item evidence without assuming that tracked notices represent every
in-scope event across all seven games.

**Summaries come after C4.** They improve wording, not correctness: a missing event breaks the
calendar's main question ("what ends first"), a plain description does not. Before Event Context
E2b, review whether `displaySummary` needs the Timeline registry v2 cutover prepared in
[PR #115](https://github.com/maxvfk/game-calendar/pull/115), or can be added in a simpler way. C5
and summaries are both model calls over the same evidence and may later share one call.

## Not doing

- R1 family coverage contracts and the incident state machine.
- R2/R3: tool-using agents in Actions, agent-written code, automatic draft PRs.
- Two-outcome (A/B) tracking per incident and the CP0–CP4 checkpoint protocol for audits.

Still valid from the #113 review: GitHub schedule delays of several hours, and that the
Actions cache holding source-health counters can be evicted (part 1 keeps its own state in
Git for that reason).
