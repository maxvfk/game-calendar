# Event time precision audit — exact source instants lost as day/unknown

**Status:** research complete 2026-10-22; no runtime implementation. See
[full report](../research/event-time-precision-audit.md) and its two bounded
reviewed-data handoffs. Hosted CI/merge evidence is recorded in the delivery PR.
**Scope:** audit published game-event start/end precision across the seven shipped
games. No runtime code, production feed, snapshots or reviewed event edits.

## Trigger / verified implementation baseline (2026-10-22)

Real-device feedback: a CZN banner was shown with a day-only deadline although
the in-game countdown and a Prydwen snapshot exposed a candidate exact end.
The backlog cites Sereniel/Peko with an apparent
`data-end-global="2026-10-21T00:00:00.000Z"`. This is **a lead to validate**,
not yet an approved, trustworthy exact end or evidence that every banner
shares that time.

At the checked main `0c33ca534c01d6522300c7c6ba0f716502a70b4f`:
- `src/ingest/parsers/prydwen-czn.ts` explicitly parses visible
  `data-range-global` dates as `startPrecision: "day"` and
  `endPrecision: "day"/"unknown"`, deliberately ignoring machine countdown
  instants because an earlier capture had 07:00/00:01 data contradicting
  STOVE maintenance boundaries. Open-ended "From ..." means
  `endsAt: null`, not a presumed duration.
- `test/prydwen-czn.test.ts` explicitly asserts this conservative behavior.
- `data/reviewed/czn.json`, `src/ingest/merge.ts` and project schema govern
  verified overrides/conflicts. Prior recurring-endgame research in
  `docs/research/czn-recurring-endgame.md` documents other potential
  precision gaps (e.g., maintenance-tied events). Treat older examples as
  dated leads and verify their *current* code/records before labeling defects.
- `docs/research/daily-reset-clocks.md` completed the separate **daily task
  reset** clock study (7/7); this task must not repeat or modify it. Daily
  rollover and event start/end boundaries are different semantics.
- Known Endfield `Season of Phantasia` cycle-source contradiction is handled by
  `docs/tasks/ENDFIELD-ECHOES-PHANTASIA-CYCLE-COVERAGE.md` in a separate Work.
  Do not investigate or repair that active source rejection here.

Source-of-truth priority: CURRENT main > AGENTS.md > IMPLEMENTATION-STATUS.md >
related specs/research > historical reports/PRs. Re-verify the baseline above
because other Work may merge before this task starts.

## Goal

Find *real* cases in which a source specifies an independently supportable
**exact start/end instant** but a published event has
`startPrecision/endPrecision: "day"` or `"unknown"`, or loses a legitimate
regional exact boundary. Also determine where the downgrade is intentionally
**correct** and should remain unchanged.

Do not equate a machine attribute, countdown, timezone offset, 00:00Z
placeholder or source label with an official exact event instant.
"A source has an exact-looking number" is not itself a confirmed defect.

## Research process — one Work, bounded sequential stages

1. **Inventory from code, without premature external research.**
   Examine current production ingestion adapters/parsers, reviewed records,
   schema, normalization/merge and relevant tests. Locate each intentional
   precision downgrade, ignored `data-start/end*` machine timestamp,
   `endsAt:null` despite source period, day-level region fallback, and
   stale reviewed override that may suppress parser precision. Record
   file/line, game/source, affected event IDs (if known), field, downgrade
   reason and whether that path is actually active in today's feed.
   Do not audit deprecated/unreachable upstream parsers as if active.
2. **CZN focused reproduction first.** Recheck Sereniel/Peko and Prydwen's
   current and preserved source captures. Compare the exact-looking attributes
   to the site's visible range, timestamp convention, official STOVE
   banner/maintenance/event notice and (where available) dated in-game
   countdown evidence. Identify whether Oct 21 00:00Z is an end, a placeholder,
   an inclusive/exclusive boundary, a timezone conversion artifact or
   a genuine notice-aligned instant. Distinguish official fixed cutoff,
   update maintenance start, daily rollover, banner phase change and
   in-game countdown. Do **not** hardcode or backfill dates from cadence.
3. **Other active ingestion paths.** Examine only code-inventory candidates
   for Genshin, HSR, WuWa, ZZZ, Endfield, NTE and remaining CZN events.
   Prioritize the cases with concrete source timestamps, parser omissions,
   observable user impact or recorded contradictions; use fresh primary
   notices/in-game evidence and corroboration where accessible.
   Reuse prior coverage and recurring-endgame reports instead of redoing
   seven full source-coverage studies.
4. **Assess precision field by field.** For each candidate:
   source URLs, checkedAt, source evidence type, quoted concise timing rule,
   explicitly stated server/global/regional zone, source start/end, supported
   UTC instant (if any), current code/merged-feed instant and precision,
   provenance/confidence, and one of:
   `confirmed lost exact precision`,
   `correct conservative downgrade`,
   `conflicting sources`,
   `insufficient evidence`,
   `inactive/stale historical example`.
   Separate findings for `startsAt` vs `endsAt`, including true unknowns.
   Remember an ISO midnight may encode only a calendar date.
5. **Prioritize impact.** Evaluate each confirmed finding for what the reader
   wrongly sees in Next Up/Timeline/Event Detail, imminent event deadlines,
   filter and expiry semantics, conflict/source-health/LKG, and backward
   compatibility of stable event IDs, completions and profile/sync records.
   Do not recommend changing IDs to "fix" precision. If corrected boundaries
   would collide with reviewed/automatic exact records, specify review rather
   than silent precedence.
6. **Implementation handoff, not implementation.** Recommend smallest
   source-specific fixes, tests, fixtures, and validation/rollout order.
   A parser rule must explain when *not* to promote precision and fail closed
   on malformed, contradictory, missing or region-ambiguous data. Explicitly
   identify tasks blocked by inaccessible official sources or needing an
   operator screenshot and its required game/server/capture clock details.

## Required durable output

Produce `docs/research/event-time-precision-audit.md` with:
- executive verdict, inventory method and precise audited scope;
- compact matrix of production source/adapter precision treatment across all
  seven games, marking unexamined/blocked surfaces explicitly;
- CZN Sereniel/Peko case study, distinguishing observed machine data from
  independently trustworthy exact instants;
- prioritized evidence table with URLs, checked-at, conflict details,
  current feed IDs/precision and status classifications;
- already-safe day/unknown cases (with rationale), actual coverage limits;
- recommended bounded implementation task(s) **only for supported fixes**;
- clear `Next concrete step`.

Update `docs/IMPLEMENTATION-STATUS.md` with confirmed findings, remaining
unknowns, checks actually executed, and next concrete step. Add a short
cross-reference to this task in `docs/IMPROVEMENT-BACKLOG.md`, without
rewriting unrelated or already-completed backlog items.

Create a short-lived **docs-only** branch off then-CURRENT main, save reports
and status as logical commits, open a single PR, run its normal CI, merge if
all checks pass and verify main contains the report. The GitHub PR must not
contain source snapshots, generated feeds or runtime changes. If access/CI
blocks this, leave a truthful partial checkpoint and explicit next step.
No invented validations, browser smoke, or production deploy claims.

## Explicit exclusions

- No runtime code, parser implementation, reviewed JSON, feed/snapshot,
  event ID, provenance or precision flag edits in this research Work.
- No blanket trust of timestamp attributes or converting day/unknown to exact.
- No broad Daily Reset, Endfield Echoes cycles, source-coverage restart,
  Account Sync, UI redesign, S6b or Astra milestone.
- Finish this research in **one Work** without asking for approval after each
  game/candidate; unknown source evidence is an acceptable recorded finding,
  not a reason to produce speculative exact times.
