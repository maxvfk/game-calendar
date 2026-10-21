# Audit game daily reset schedules — source-backed follow-up

Status: **ready for standalone Chat research — no Work or code changes**, created from operator phone observation 2026-10-21.
Independent of completed UI small fixes (PR #44) and Timeline label polish.

## Trigger and evidence boundaries

The operator confirms that the new `Today's dailies` header correctly identifies
the game/group whose reset is nearest, but suspects **the underlying game reset
times are wrong**. No game, region, displayed timestamp or authoritative actual
reset has yet been independently verified in this task. Do not claim a specific
configuration error from this observation alone.

Checked against main `c54ec98c14df2eb8d78a7202c8e5cdd7d30f260c`:
- `src/client/components/Dailies.tsx` `nextDailyReset()` finds the earliest
  existing per-item `now + resetsIn` and deduplicates groups by game.
- `src/shared/daily.ts` `dayKey()`, `nextResetMs()`, `msUntilReset()`,
  `dayStartMs()` all depend on `resetShiftMs()`.
- `src/shared/time.ts` assumes daily rollover at 04:00 of server-local time,
  with fixed region offsets (`asia: +8`, `europe: +1`, `america: -5`)
  unless overridden by `src/shared/games.ts`.
- Among the currently shipped games, `endfield` overrides `europe: -5`;
  other shipped games (Genshin, HSR, WuWa, ZZZ, NTE, CZN) have no reset
  overrides in their GameMeta. **This is implementation evidence, not
  independent verification of the actual reset clocks.**
- Some game-specific sources are silent or ambiguous about resets (especially
  NTE/CZN), which is why assuming the regional default may be unsafe.

## Research objective (first milestone: no code changes)

Confirm each shipped game's current **daily-task reset instant**, scoped to
the actual server group and the reader's configured region:
Genshin, HSR, WuWa, ZZZ, Endfield, NTE and CZN. Check which use fixed UTC
offsets versus time zones with DST, and whether the user's region selection
maps to those server groups. Separate maintenance/event/battle-pass resets
from the **daily login/task reset**, which need not coincide.

Produce a compact evidence matrix with, for every game and relevant region:
- server group and semantics of the UI `Region` selection;
- independently sourced exact reset hour and UTC conversion, with date and
  daylight-saving treatment, or an explicit **unknown/unverified**;
- source URLs, evidence type (official schedule or in-game observation;
  secondary sources only where appropriate), checked-at date, conflicts;
- current code's corresponding expectation and a concrete discrepancy if
  confirmed, including an example absolute UTC timestamp.

Where evidence is insufficient, preserve the uncertainty rather than invent
a default as if it were confirmed. The audit may recommend clarifying copy or
an explicit unsupported status, but do not change semantics silently.

## Storage/safety implications before a code-fix milestone

The reset instant feeds `dayKey()`, daily checkboxes, catch-up, streaks,
import/export, account sync and profile-stored day-key records. A change to
`resetOffsets`, `RESET_HOUR_LOCAL`, `resetHourLocal` or regional mappings
can relabel historical daily ticks. Document exact compatibility/migration
implications **before** approving an implementation.

Explicitly evaluate daylight-saving crossings, region changes, account
profiles and existing saved logs, new-reader behavior, and tests for
`nextResetMs`, `dayKey`, `dailyDays`, `catchUpDays`, `streakOf` and
`dailySummary`. Distinguish genuine reset-rule errors from a user-selected
wrong region, browser timezone display and server maintenance windows.

## Delivery and scope

Start from CURRENT main. Read `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`,
this task, relevant clock/game/daily code and focused tests. Consult fresh
primary sources or in-game evidence **for reset clocks**, not broad event
coverage research already completed.

For this audit milestone, commit **only research findings, evidence and a
proposed separate bounded implementation plan**. Update
`docs/IMPLEMENTATION-STATUS.md` with concrete verified facts and next step;
open a short PR. Do **not** modify clock logic, day-key storage, account/sync,
event IDs, canonical feed, UI polish, source ingestion or other milestones
without a separate implementation task/approval.

When the operator provides a specific game + selected region + shown countdown
and in-game reset time, use that as a high-priority reproducible test case.


## Execution mode: ordinary Chat research

This audit is deliberately suitable for a **new ordinary ChatGPT chat**, not a
coding Work session. The chat can inspect current GitHub code and external
sources, build an evidence matrix, and commit an auditable research report.
Do not treat this chat as the source of truth; persist the outcome in GitHub.

- Start from CURRENT `main`; the baseline above documents the original
  hypothesis, not permanent repo state. Do not revisit unrelated source
  coverage research.
- Create the focused report
  `docs/research/daily-reset-clocks.md` with the evidence matrix, source
  dates/URLs, per-game per-region actual and code-calculated UTC clocks,
  unknowns/conflicts, and a clear diagnosis of confirmed errors vs assumptions.
- For each claim, distinguish **official**, **in-game/firsthand**,
  **independent secondary**, and **inference**. When in-game data is needed,
  identify exactly the missing screenshot/game/region, but finish the remaining
  report without blocking on it.
- Include DST examples for applicable server clocks, and a dependency/risk
  section on persisted daily keys and sync. Prefer one actionable, small,
  separately scoped implementation follow-up **only if** confirmed evidence
  justifies a clock change.
- Update `docs/IMPLEMENTATION-STATUS.md` with the audit outcome and
  `Next concrete step`, then open a docs-only PR. No production constants,
  migrations, tests, feed snapshots or application code in this research PR.
- If repo writes, PR or other connectors are unavailable in the chat,
  produce the complete Markdown report in the answer and explicitly mark
  GitHub publication as uncompleted rather than claiming it was saved.

Completion criterion: evidence-backed report and a concrete recommendation,
**not** a speculative change to reset hours. Afterwards use a separate Work
only for an approved, bounded implementation milestone.
