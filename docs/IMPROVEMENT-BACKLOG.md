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


- **Title:** Use featured character names as character-banner labels
  - **Observation:** official banner/campaign names are poor recognition cues in the calendar. Readers usually identify a character banner by the featured character, not by the marketing title, and the official title becomes even less useful when the game UI and calendar use different languages.
  - **Desired behavior:** for character banners, use the featured character name (or featured character names when one banner genuinely contains several headline characters) as the primary compact label in Timeline/Next Up/checklist surfaces. Keep the official banner title available as secondary information in event details rather than discarding it.
  - **Area:** UI / data clarity
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** apply this specifically to character banners; weapon/arc/light-cone/W-Engine and other banner classes should keep an appropriate featured-item label rather than being forced into character semantics. Prefer a reliable structured featured-subject value from source/reviewed data when available; do not heuristically extract character names from arbitrary marketing titles if the source does not establish them. Preserve existing event IDs, dates, provenance and completion state.



- **Title:** Bias the Timeline viewport toward future events
  - **Observation:** the daily Timeline currently places today near the center of the visible range. That spends roughly half of the immediately visible space on past days even though the main calendar task is understanding upcoming events and deadlines.
  - **Desired behavior:** position today closer to the left side of the default Timeline viewport so that most of the visible range shows future days. Keep a small amount of recent-past context rather than removing past days entirely.
  - **Area:** UI / data clarity
  - **Priority:** undecided
  - **Status:** refined
  - **Notes / constraints:** preserve the current-day marker and horizontal navigation. The exact offset should be tuned on both phone and desktop rather than hard-coding a desktop-centric ratio; a rough target is for today to occupy the first 15–25% of the visible range. Events that began before the visible range must remain understandable when their bars are clipped at the left edge.

- **Title:** Show event deadlines directly on Timeline bars
  - **Observation:** identifying an event is not enough; the calendar's primary question is what ends first, but users currently have to infer or open details to read the relevant deadline.
  - **Desired behavior:** show the event's end date directly on its Timeline representation when space permits. Prefer an end-focused compact form such as `→ Oct 21`; when there is enough room, a start-to-end range such as `Sep 30 → Oct 21` may be shown.
  - **Area:** UI / data clarity
  - **Priority:** undecided
  - **Status:** refined
  - **Notes / constraints:** respect the existing exact/day precision model and never imply a clock time that the source does not establish. The label should degrade gracefully on short/narrow bars and must not make the dense mobile Timeline unreadable.

- **Title:** Group event types inside game-sorted Timeline views
  - **Observation:** when the Timeline is organized by game, a game's banners, normal events, endgame, login events and other rows can still be difficult to scan as one undifferentiated set.
  - **Desired behavior:** when using the game-oriented ordering, add lightweight grouping or separators by event type within each game. When using date-oriented ordering, keep the Timeline as a pure chronological view without type grouping.
  - **Area:** UI / data clarity
  - **Priority:** undecided
  - **Status:** refined
  - **Notes / constraints:** do not add a separate grouping toggle unless later testing shows it is necessary. The game/date ordering itself should determine whether type grouping is active. Keep grouping visually lightweight so seven games multiplied by several categories does not turn the Timeline into a tall set of large section blocks. NTEBuild's category lanes are a useful recognition reference, but should not be copied literally.


## Separate feature tasks

These are larger product/data features and should not be bundled with the small
pre-Astra interaction and visual polish items above.

- **Title:** Improve event recognition with event artwork
  - **Observation:** event names are often poor recognition cues in actual play. Readers may not remember an event's title, and matching a calendar entry to the in-game event becomes substantially harder when the game and calendar use different languages. Event artwork/banner imagery provides a much stronger visual cue.
  - **Desired behavior:** use optional event artwork primarily as an identity/recognition aid rather than decoration. The first implementation should make the artwork available in event details, where it can help the reader confirm "this is the event I see in the game" without increasing Timeline density. After that is usable on mobile, separately evaluate whether small thumbnails add enough recognition value in Timeline/Next Up surfaces to justify their layout and caching cost.
  - **Area:** new feature / UI / data clarity / ingestion
  - **Priority:** undecided
  - **Status:** refined
  - **Notes / constraints:** treat this as a separate feature milestone, not part of the small UI-polish batch. The governing UX principle is recognition-first presentation: show the visual/subject players actually recognize rather than privileging a source/database title. Artwork must remain optional because some event classes (maintenance, shop resets, recurring endgame phases, etc.) may not have a natural banner image. Before implementation, define an image-source/asset policy: stable source URL versus locally hosted asset, reuse/hotlink permission, provenance/attribution where required, broken-image fallback, and PWA/offline/cache behavior. Do not make an event's date/provenance confidence depend on artwork availability. Preserve existing event IDs and completion state. NTEBuild's event timeline is a useful UX reference for recognition and information hierarchy, not an automatic image/data source for this project.


- **Title:** Rework event details around recognition-first information hierarchy
  - **Observation:** event details currently expose technically correct calendar/source information, but the presentation is not optimized for the user's first questions: what activity this is, how to recognize it in the game, when it ends, and why it matters. Improving only individual fields would leave the overall information hierarchy unchanged.
  - **Desired behavior:** redesign the event detail experience as a dedicated milestone around a recognition-first hierarchy: event identity/featured subject and optional artwork first; current timing/status and deadline next; useful human-facing description and rewards/participation context after that; source, provenance, precision/conflict and other technical metadata remain available but visually secondary.
  - **Area:** new feature / UI / data clarity
  - **Priority:** undecided
  - **Status:** observed
  - **Notes / constraints:** this is a larger product/UX milestone and must not be bundled into the small pre-Astra polish batch or treated as a side effect of adding artwork. Preserve source transparency and precision/conflict information; the goal is hierarchy, not hiding evidence. Define the final field order and mobile behavior from the actual current detail-sheet implementation before coding. It may consume the separate artwork and richer event-metadata work when those are available, but should not block smaller recognition/readability fixes elsewhere.

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
