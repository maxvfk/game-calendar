# Improvement backlog

Intake for observations from normal use on phone and desktop. Discuss and
refine feedback in ChatGPT before moving an item into an implementation group.
The older `docs/FEEDBACK.md` records a separate first-release review.

For each item, use this compact format:

- **Title:** short, searchable name
  - **Observation:** what happened and how to reproduce it, if known
  - **Desired behavior:** what should happen instead
  - **Area:** UI / interaction / data clarity / new feature / maintenance
  - **Priority:** urgency if known; otherwise undecided
  - **Status:** observed / refined / approved / in progress / resolved / deferred
  - **Notes / constraints:** optional evidence, screenshots, affected device,
    stable IDs or source-date limits

## Observed issues / feedback

- **Title:** Stronger weekly separators on the daily Timeline
  - **Observation:** adjacent weeks are not visually distinct enough when scanning the daily Timeline.
  - **Desired behavior:** make the boundary between Sunday and Monday more visible than ordinary day separators, for example with a slightly thicker and/or more contrasting divider.
  - **Area:** UI
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** keep the weekly separator visually subordinate to the current-day marker and avoid adding clutter to the dense mobile view.

- **Title:** Per-game daily pass countdowns
  - **Observation:** the app has daily chores but no personal tracking for 30-day login/subscription passes such as Genshin's Blessing of the Welkin Moon.
  - **Desired behavior:** let the reader track remaining days for a daily pass in each enabled game, set or correct the remaining count, and extend an active pass by one standard period with a single action.
  - **Area:** new feature
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** prefer a compact `Daily passes` surface adjacent to, but semantically separate from, today's tickable dailies. Show active/expired passes on the main surface; manage all enabled games in a detail panel. A one-tap `+30` should extend from the current expiry (or start a fresh 30-day period when expired) and offer Undo rather than a confirmation dialog. Track against each game's server-day/reset semantics rather than a naive 24-hour timer. Keep pass state profile-scoped and compatible with export/import and future sync. Consider, but do not assume, an optional local-only expiry marker on the main Timeline.

- **Title:** Disambiguate mixed daily reset countdowns
  - **Observation:** the `Today's dailies` header currently shows a single `next reset in …` countdown even though enabled games can reset at different times; after one game's reset has already happened, the global-looking timer can imply that all games share the remaining countdown.
  - **Desired behavior:** keep the compact nearest-reset countdown but identify which game or reset group it belongs to, for example `next: Genshin · 4h 25m` or `next: Genshin +2 · 4h 25m` when several games reset together.
  - **Area:** UI / data clarity
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** avoid adding a full per-game timer row to the collapsed dailies strip; the goal is to remove ambiguity without making the section taller. Per-game server/reset semantics already exist and should remain the source of truth.

- **Title:** Make event details explicitly dismissible
  - **Observation:** event details currently have no visible close control. On touch devices the reader must tap the backdrop, which can be awkward on a large bottom sheet; the browser/system Back button navigates away instead of dismissing the open details.
  - **Desired behavior:** add a clear close button inside the detail sheet and make browser/system Back dismiss the currently open event detail before normal page navigation resumes.
  - **Area:** interaction / UI
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** preserve backdrop tap and Escape as secondary dismissal paths. The close control needs a comfortable mobile touch target and must remain visible/reachable when the sheet content scrolls. Opening/closing details should integrate with history without creating duplicate or sticky history entries.

## Candidates before Astra audit

No items yet. Reserve for approved small UX/UI fixes and corrections to
existing behavior that should be included in the audit baseline.

## Deferred until after Astra audit

No items yet. Reserve for larger features, redesigns, new modes and scope
expansion after the audit and its confirmed fixes.

## Implemented / resolved

No items yet. Link each finished item to its commit and verification result.

## Sequence

1. Collect feedback through normal use; discuss and refine it in ChatGPT.
2. Split agreed items into pre-Astra polish and post-Astra improvements.
3. Work implements approved pre-Astra items as short, separate commits, then
   performs a focused smoke check and freezes the implementation baseline.
4. Astra performs a separate critical audit. Work addresses confirmed findings
   in separate milestones before taking up deferred improvements.
5. After the audit and fixes, create `docs/MAINTENANCE.md` for the verified
   architecture: scheduled refresh, source health, stale/broken sources,
   reviewed data, conflicts, incidents, human intervention and recommended
   Work/Codex maintenance prompts. Do not write that final guide beforehand.
