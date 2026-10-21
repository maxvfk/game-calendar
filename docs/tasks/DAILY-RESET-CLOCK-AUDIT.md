# Audit game daily reset schedules — source-backed follow-up

Status: **ready for seven sequential, per-game Chat research steps — no runtime changes**, created from operator phone observation 2026-10-21; seven-step plan approved 2026-10-22.
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


## Execution mode — seven focused research steps

**Operator decision 2026-10-22:** research **one game at a time**, with
one independently reviewable report and optional docs-only PR per game.
Use an ordinary ChatGPT chat, **not Work**. Separate short chats per game
are fine and help keep scope focused. Each chat begins with CURRENT main
and the task, reads the earlier reports only for relevant mapping or migration
constraints, and does not repeat other games' source research. Stop after
the assigned game; do not automatically advance to the next one.

Order prioritizes uncertain or exceptional clocks first:

| Step | Game | Detailed evidence file |
| --- | --- | --- |
| 1 | Arknights: Endfield | `docs/research/daily-reset-clocks/endfield.md` |
| 2 | Neverness to Everness | `docs/research/daily-reset-clocks/nte.md` |
| 3 | Chaos Zero Nightmare | `docs/research/daily-reset-clocks/czn.md` |
| 4 | Genshin Impact | `docs/research/daily-reset-clocks/genshin.md` |
| 5 | Honkai: Star Rail | `docs/research/daily-reset-clocks/hsr.md` |
| 6 | Wuthering Waves | `docs/research/daily-reset-clocks/wuwa.md` |
| 7 | Zenless Zone Zero | `docs/research/daily-reset-clocks/zzz.md` |

For **each** game, complete the same high-quality evidence contract:

1. Inspect current `AGENTS.md`, this task, the clock mapping in
   `src/shared/time.ts`/`daily.ts`/`games.ts`, pertinent tests, and
   relevant `IMPLEMENTATION-STATUS.md` details.
2. Research this game's actual **daily-task/day-key rollover**, not banner
   launch/end, shop, season, patch, maintenance or battle-pass intervals.
   Prefer dated official service/server documentation and directly observable
   in-game countdowns; independent secondary sources may corroborate.
3. Resolve its real regional server groups and map them explicitly to the
   app's `america`, `europe`, `asia` selector. Note if the selector
   cannot express the real game's region model.
4. Record stated local reset hour, *absolute UTC example* for each
   supported group, DST/timezone behavior (with before/after examples where
   relevant), code-calculated UTC instant, and result:
   **confirmed correct / confirmed discrepancy / unverified / conflicting**.
   Cite URLs and checked date for each finding. Do not pass off an
   assumed 04:00 local clock as a confirmed game fact.
5. If a correction appears warranted, describe exact impact on
   `dayKey`, old daily ticks, streaks, catch-up, export/import and
   Account Sync. No migration or runtime edits yet; distinguish a true
   error from user Region or browser timezone mismatch.
6. Create/update **only the assigned game's** detailed report path above.
   The report must be self-sufficient, distinguish fact/inference/unknown,
   list source timestamps, and end with one concrete next step. If the
   GitHub connector cannot write, return full Markdown in chat and state
   publication did not occur. Do not claim success without verifying the file.
7. Add a short entry to the cumulative index
   `docs/research/daily-reset-clocks.md` with status, evidence link and
   one-line diagnosis. Do **not** repeat the other game's research or
   overwrite their verified content. Update `IMPLEMENTATION-STATUS.md`
   with step N/7 completion and next game. A small docs-only PR/merge per
   game is acceptable and makes the next chat independent.

**Step 7 additionally closes the research series**: only after all seven
evidence files exist, reconcile the index into a cross-game comparison,
identify any contradictory reset/region semantics, and propose an ordered
bounded implementation plan with storage compatibility risks. Do not invent
missing evidence just to call the matrix complete. If any step remains
unverified, index it as an open gap rather than broadening step 7 into
another game's new research.

No code changes, no preference/data migrations, no app build changes, no
feed/source refresh, no unrelated research. Keep this research separate
from the completed Timeline and mobile UI milestones. A future Work may
implement approved corrections in small independently testable changes.

### Reusable one-game chat prompt

```text
Continue the DAILY-RESET-CLOCK-AUDIT research for maxvfk/game-calendar
from CURRENT main. Perform ONLY step <N>/7: <GAME>, as ordered in
docs/tasks/DAILY-RESET-CLOCK-AUDIT.md.

Research the actual daily reset for this game, regional server mapping,
UTC and DST behavior, and compare against the app's code. Use fresh,
attributed sources; distinguish confirmed facts, in-game evidence,
inferences, disagreements and unknowns. Include migration/sync risks
of changing dayKey. Do not change code or the clock constants.

Save the game-specific detailed report to the exact path in the task;
update docs/research/daily-reset-clocks.md and the implementation status,
and create a docs-only PR/merge when available. Verify GitHub writes.
If source evidence or GitHub access is incomplete, report it plainly.

Stop after this game's findings; do not research the next game.
On step 7, also synthesize all seven prior reports into the final index,
without redoing previous investigations.
```

### Research completion criterion

Seven source-backed per-game reports (including honest unknowns), one
consolidated index, and a safe concrete implementation recommendation.
Merely filling seven rows without evidence is **not** completion.
