# Endfield Echoes of War — Season of Phantasia cycle missing from Timeline

**Status:** research complete 2026-10-22; coverage repair proposed separately, not implemented.
**Result:** see `docs/research/endfield-recurring-endgame.md` §17 and
`docs/tasks/ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md`.
Official cycle endpoints verified; wiki still contradictory/broken. Historical
investigation instructions below are retained, not a request to repeat research.
**Reported:** 2026-10-22, in-game screenshot supplied by operator.
**Separate from:** `docs/tasks/DAILY-RESET-CLOCK-AUDIT.md` (daily task rollover).

## User-visible failure

The operator reports that an **Echoes of War cycle is about to change in
Arknights: Endfield**, yet the calendar has no visible corresponding deadline.

The in-game screenshot (not attached to the public repo, as it also contains
account-identifying UI) shows:

- Echoes of War **Season of Phantasia** (Russian `Сезон фантазий`):
  **14.10.2026–05.11.2026** displayed in the game;
- current **Cycle of Phantasia** (`Цикл фантазий`);
- **"До следующего цикла: 9 ч. 8 мин."** at screenshot time.

These are **different deadline classes**: season end on Nov 5 and
an imminent *cycle rotation* during the season. The visible 9h08 is a relative
timer; do not convert it into a published exact UTC end without reliable
capture clock and game server-region context. The screenshot's season start
date is also **different** from the Oct 15 start stated in the wiki's western
regional header; check display semantics rather than silently reconciling it.

## Existing findings — avoid repeating the full research

`docs/research/endfield-recurring-endgame.md` section 16 already proves
that the current Season of Phantasia cycle source is semantically contradictory:

- seasonal Event source contains Phantasia and its season deadline;
- regional season headers state Asia Oct 15 12:00 UTC+8 and
  Americas/Europe Oct 15 23:00 UTC-5;
- cycle table begins Cycle I Oct 15 **12:00 Server Time** for both,
  11 hours *before* its declared western regional season start;
- later rows state cycle transitions Oct 22 / Oct 29 at 04:00 server time;
- fail-closed cycle parser correctly rejects this source, retaining last
  known good (Illusion) rather than guessing/correcting upstream dates;
- current production does not publish **Phantasia cycle** markers
  (see `docs/IMPLEMENTATION-STATUS.md`, PR #23 recovery).

This is a **known source-coverage gap with new first-hand in-game
confirmation of imminent user impact**, not a justification to relax source
acceptance or synthesize a weekly schedule.

## Next investigation (bounded, do not start automatically)

1. Inspect CURRENT main, `AGENTS.md`, the existing Endfield recurring
   research section 16, current cycle parser/fixture/test, source-health
   reports, the deployed public feed and relevant GitHub Actions. Confirm
   which exact current season/cycle rows are published and filtered.
2. Compare the **current** official game UI or dated official schedule
   (server/region and capture timestamp), and the current wiki season page
   with its machine-readable timestamps and cycle table. Determine whether
   the upstream inconsistency has been corrected or whether the source
   interprets Cycle I start for only one region.
3. Identify independently evidenced *exact* Cycle I→II and Cycle II→III
   deadlines for every supported Endfield server group, and the exact
   final season deadline. Avoid confusing those with **daily reset**,
   banner expiration or version maintenance.
4. Restore bounded source-driven **current-season** cycle markers only
   after input consistency is proven, or propose a separately reviewed
   primary-source channel if the wiki remains contradictory. Never derive
   future seasons from weekly periodicity or weaken `rejected`, `broken`,
   provenance, date precision, event-ID or last-known-good rules.
5. Tests: explicit regional cycle boundaries, source disagreement and
   recovery, immutable old cycle IDs, no duplicate Cycle III deadline,
   `challenge` / Endgame filter and `Ending soonest` visibility, no silent
   source replacement, and no effect on unrelated events. Then normal
   frozen install, typecheck, test, build, PR/merge/Pages plus operator smoke.

**Next concrete step:** once prioritized, conduct a narrow
source-consistency investigation using this in-game observation,
producing a separate implementation task only if a safe verified
repair is identified. Do not combine this with the seven-game
Daily Reset clock audit or reopen completed Timeline UI work.
