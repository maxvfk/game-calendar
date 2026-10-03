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

- **Title:** Toggle all event types off from `All types`
  - **Observation:** `All types` selects every event category, but tapping it again while all categories are already selected does not provide a quick way to clear the selection.
  - **Desired behavior:** make `All types` a two-state aggregate toggle: when not all categories are selected, tapping it selects all; when all categories are selected, tapping it clears all categories.
  - **Area:** interaction / UI
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** do not add a separate `None` button. `All types` should appear active only when every category is selected; with a partial or empty selection it should appear inactive.


## Separate feature tasks

These are larger product/data features and should not be bundled with the small
pre-Astra interaction and visual polish items above.

- **Title:** Improve event recognition with event artwork
  - **Observation:** event names are often poor recognition cues in actual play. Readers may not remember an event's title, and matching a calendar entry to the in-game event becomes substantially harder when the game and calendar use different languages. Event artwork/banner imagery provides a much stronger visual cue.
  - **Desired behavior:** allow calendar events to carry optional artwork that helps the reader identify the corresponding in-game event. Start with a low-risk surface such as the event detail sheet rather than making dense Timeline rows image-heavy by default; evaluate thumbnails in other surfaces only after the first implementation is usable on mobile.
  - **Area:** new feature / UI / data clarity / ingestion
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** treat this as a separate feature milestone, not part of the small UI-polish batch. Artwork must remain optional because some event classes (maintenance, shop resets, recurring endgame phases, etc.) may not have a natural banner image. Before implementation, define an image-source/asset policy: stable source URL versus locally hosted asset, reuse/hotlink permission, provenance/attribution where required, broken-image fallback, and PWA/offline/cache behavior. Do not make an event's date/provenance confidence depend on artwork availability. Preserve existing event IDs and completion state. NTEBuild's event timeline is a useful UX reference for visual recognition, not an automatic image/data source for this project.

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
