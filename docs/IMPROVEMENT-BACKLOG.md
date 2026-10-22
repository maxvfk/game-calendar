# Improvement backlog

Last full coordination review: **2026-10-19**. Account/User S6a is complete; S6b remains separate/non-blocking. Timeline M1 is now eligible to start from CURRENT `main`.

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

- **Title:** Endfield Echoes of War — current Phantasia cycle deadline absent
  - **Observation:** operator's in-game screenshot (2026-10-22) shows `Сезон фантазий` 14.10–05.11.2026 and `Цикл фантазий` with **9h08 until the next cycle**, but the upcoming cycle transition is not visible in the calendar. This is not the Nov 5 season-end deadline.
  - **Desired behavior:** current, independently sourced Endfield cycle deadlines visible as Endgame/challenge rows without inventing recurrence or discarding contradicting timestamps.
  - **Area:** source ingestion / event coverage / time-sensitive endgame
  - **Priority:** observed, time-sensitive source-coverage gap; distinct from daily reset clock audit
  - **Status:** open / investigation queued; no runtime fix
  - **Notes / constraints:** existing `docs/research/endfield-recurring-endgame.md` §16 confirms Phantasia's western Cycle I source contradiction and safe `rejected`/LKG behavior. New user screenshot is first-hand evidence of cycle-rotation impact, not proof of an exact UTC boundary; it contains user-identifying account UI and was not uploaded publicly. Focused follow-up: `docs/tasks/ENDFIELD-ECHOES-PHANTASIA-CYCLE-COVERAGE.md`. Do not weaken source-health or synthesize 7-day periods.

- **Title:** Audit real per-game daily reset clocks and regional server mappings
  - **Observation:** after PR #44, the operator confirmed nearest-game attribution works but reports that actual Daily Reset countdown times appear wrong. No particular game's actual timestamp has been verified yet. Current shared reset logic defaults to 04:00 server-local with fixed UTC offsets and sparse exceptions; NTE/CZN have no game-specific reset overrides.
  - **Desired behavior:** verify authoritative per-game daily reset instants for shipped games and relevant regions, compare to calculated app times, distinguish known vs unknown and DST, then propose a separate safe correction.
  - **Area:** reset scheduling / data correctness / personal daily keys
  - **Priority:** operator-observed follow-up; research-first, separate from UI-polish
  - **Status:** observed / investigation task ready; no reset fixes yet
  - **Notes / constraints:** `docs/tasks/DAILY-RESET-CLOCK-AUDIT.md`. `dayKey` feeds persisted daily logs/streaks and account sync: changing clock constants without analyzing existing data can shift historic day keys. Do not guess unverified hours or mix event banner boundaries with daily-task resets.

- **Title:** Timeline Ending soonest hides titles rather than truncating on phone
  - **Observation:** Android Chrome operator screenshot 2026-10-21 has several otherwise visible event bars showing only game, TypeBadge and urgency dot, whereas wider desktop displays identities. `fitTimelineContent()` in `Ending soonest` currently returns `identity: 0` if the complete measured identity cannot fit after game+badge, even when part of it would fit; an old unit test codifies this.
  - **Desired behavior:** show an ellipsized event recognition/title fragment whenever genuinely usable measured width remains, retaining the accepted high-priority compact TypeBadge; game text can yield if it prevents an otherwise useful identity. Keep truthful deadlines and full accessible names.
  - **Area:** Timeline UI / responsive readability
  - **Priority:** resolved in PR #46
  - **Status:** resolved / operator accepted 2026-10-21
  - **Notes / constraints:** `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md`. Implemented in PR #46. The operator confirmed the deployed fix works normally after Work completion; the exact manual device/zoom coverage was not itemized. Preserved M2 temporal viewport, badge priority and accessibility. Narrow scrolled-off event tails may legitimately lack label.

- **Title:** Compact mobile header, account status and wrapped filters
  - **Observation:** after accepted Timeline M2, a phone screenshot showed that the independent account/sync text strip, live/upcoming subtitle, horizontal type-filter strip and Focus strip consume much of the usable viewport.
  - **Desired behavior:** use one compact phone header with small EVENTCLOCK logo, Filters toggle, Checklist/Timeline selector and truthful account/sync-status button at far right. Keep filters collapsed by default; expanded panel shows all type and enabled-game Focus chips with wrapping, a Reset filters control and an explicit collapse button. The header toggle must close it too.
  - **Area:** mobile UI / interaction / auth-status presentation
  - **Priority:** approved pre-Astra UI-polish, separate bounded Work
  - **Status:** approved / task ready
  - **Notes / constraints:** authoritative task: `docs/tasks/UI-POLISH-MOBILE-HEADER-FILTERS.md`. Reset only type categories and single-game focus, never game enablement/order or Upcoming. Include the `All types` select-all/clear-all fix in this task (avoid duplicate implementation in the later small UI-fix batch). Desktop, account/sync mechanics, event IDs, and M2 viewport semantics must remain intact. Layout mockups from coordination were illustrative; code must fit real 320–390px widths.


- **Title:** Audit date/time precision downgrades against exact source timestamps
  - **Observation:** phone smoke exposed a CZN banner case where the calendar intentionally shows a day-only deadline even though the live game countdown and the current Prydwen snapshot both indicate an exact end instant. Sereniel and Peko currently carry `data-end-global="2026-10-21T00:00:00.000Z"`, while the parser deliberately ignores machine timestamps because earlier Prydwen timestamps had disagreed with official STOVE maintenance boundaries.
  - **Desired behavior:** systematically review all similar ingestion paths where a source exposes an exact timestamp/countdown but the calendar intentionally downgrades it to `day` or `unknown`. Promote precision only when the exact boundary is independently trustworthy; otherwise keep the conservative precision and document why.
  - **Area:** data clarity / ingestion / source quality
  - **Priority:** pre-Astra data-quality follow-up; do not fold into Timeline M2
  - **Status:** refined / research task ready
  - **Task:** `docs/tasks/EVENT-TIME-PRECISION-AUDIT.md` — separate research-only Work; CZN first, then bounded scan of other active sources; no runtime changes.
  - **Notes / constraints:** start with CZN banners (Sereniel/Peko as the concrete trigger), then search other parsers/reviewed-data paths for explicit precision downgrades or ignored machine timestamps. Do not globally trust hidden/countdown timestamps merely because they exist. Preserve event IDs, provenance, source-health/LKG rules and fail closed on conflicting evidence. Also consider adding reliable `recognitionSubjects` while touching a reviewed record, but keep recognition metadata separate from timestamp trust.

- **Title:** Stronger weekly separators on the daily Timeline
  - **Observation:** adjacent weeks are not visually distinct enough when scanning the daily Timeline.
  - **Desired behavior:** make the boundary between Sunday and Monday more visible than ordinary day separators, for example with a slightly thicker and/or more contrasting divider.
  - **Area:** UI
  - **Priority:** approved pre-Astra UI fix
  - **Status:** implemented / browser-validated 2026-10-21; operator real-device smoke pending
  - **Notes / constraints:** operator explicitly requested implementation on 2026-10-21. Emphasize the Sunday→Monday local day boundary using a modest stronger grid line, while keeping it subordinate to TODAY and without adding mobile clutter, changing event/calendar geometry or interfering with M2 inspected-time preservation.
  - **Task:** `docs/tasks/UI-POLISH-SMALL-FIXES.md` — implemented with reset attribution and Event Detail dismissal; see IMPLEMENTATION-STATUS and browser evidence.

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
  - **Status:** implemented / browser-validated 2026-10-21; operator real-device smoke pending
  - **Notes / constraints:** avoid adding a full per-game timer row to the collapsed dailies strip; the goal is to remove ambiguity without making the section taller. Per-game server/reset semantics already exist and should remain the source of truth.
  - **Task:** `docs/tasks/UI-POLISH-SMALL-FIXES.md` — implemented; see IMPLEMENTATION-STATUS and browser evidence.

- **Title:** Make event details explicitly dismissible
  - **Observation:** event details currently have no visible close control. On touch devices the reader must tap the backdrop, which can be awkward on a large bottom sheet; the browser/system Back button navigates away instead of dismissing the open details.
  - **Desired behavior:** add a clear close button inside the detail sheet and make browser/system Back dismiss the currently open event detail before normal page navigation resumes.
  - **Area:** interaction / UI
  - **Priority:** undecided
  - **Status:** implemented / browser-validated 2026-10-21; operator real-device smoke pending
  - **Notes / constraints:** preserve backdrop tap and Escape as secondary dismissal paths. The close control needs a comfortable mobile touch target and must remain visible/reachable when the sheet content scrolls. Opening/closing details should integrate with history without creating duplicate or sticky history entries.
  - **Task:** `docs/tasks/UI-POLISH-SMALL-FIXES.md` — implemented; see IMPLEMENTATION-STATUS and browser evidence.

- **Title:** Toggle all event types off from `All types`
  - **Observation:** `All types` selects every event category, but tapping it again while all categories are already selected does not provide a quick way to clear the selection.
  - **Desired behavior:** make `All types` a two-state aggregate toggle: when not all categories are selected, tapping it selects all; when all categories are selected, tapping it clears all categories.
  - **Area:** interaction / UI
  - **Priority:** complete
  - **Status:** resolved (PR #37; verified against current main 2026-10-21)
  - **Notes / constraints:** do not add a separate `None` button. `All types` should appear active only when every category is selected; with a partial or empty selection it should appear inactive. The implementation is assigned to `docs/tasks/UI-POLISH-MOBILE-HEADER-FILTERS.md`, not to the later remaining small-fix Work.

  - **Implementation:** shared `TypeFilters.tsx` aggregates `All types` as select-all/clear-all in desktop and mobile. Do not repeat in the next small UI-fix Work.


- **Title:** Use featured subjects as compact event labels
  - **Observation:** official banner/campaign names are poor recognition cues in the calendar. Readers usually identify a banner by the featured character/item, not by the marketing title, and the official title becomes even less useful when the game UI and calendar use different languages.
  - **Desired behavior:** use reliable featured subject names as the primary compact recognition label where appropriate, with the official title as fallback/secondary information.
  - **Area:** UI / data clarity
  - **Priority:** approved direction; implementation deferred until Account/User S6 is complete/cleared
  - **Status:** approved
  - **Notes / constraints:** the accepted semantic contract is `recognitionSubjects?: string[]`, with ordered co-headliners and item/weapon/Light Cone/W-Engine equivalents supported; never infer subjects heuristically from arbitrary marketing titles. `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md` implements the data contract, and M2 consumes it on Timeline. **Next Up/checklist are not covered by M2 and remain an explicit follow-up after M1; do not mark this backlog item fully resolved when Timeline M2 lands.** Preserve existing event IDs, dates, provenance and completion state.



- **Title:** Bias the Timeline viewport toward future events
  - **Observation:** the daily Timeline currently places today near the center of the visible range. That spends roughly half of the immediately visible space on past days even though the main calendar task is understanding upcoming events and deadlines.
  - **Desired behavior:** position today closer to the left side of the default Timeline viewport so that most of the visible range shows future days. Keep a small amount of recent-past context rather than removing past days entirely.
  - **Area:** UI / data clarity
  - **Priority:** undecided
  - **Status:** approved
  - **Notes / constraints:** resolved by the accepted Candidate A′ spec: anchor the actual current moment at about 20% from the left on phone and 25% on desktop, only on initial Timeline opening and explicit `Jump to today`; filters/group/upcoming/refresh must not re-anchor. Implementation is deferred in `docs/tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md` until Account/User S6 is complete/cleared.

- **Title:** Show event deadlines directly on Timeline bars
  - **Observation:** identifying an event is not enough; the calendar's primary question is what ends first, but users currently have to infer or open details to read the relevant deadline.
  - **Desired behavior:** show the event's end date directly on its Timeline representation when space permits. Prefer an end-focused compact form such as `→ Oct 21`; when there is enough room, a start-to-end range such as `Sep 30 → Oct 21` may be shown.
  - **Area:** UI / data clarity
  - **Priority:** undecided
  - **Status:** approved
  - **Notes / constraints:** accepted Candidate A′ makes deadline/end state part of sticky readable bar content, with exact/day/unknown semantics and mode-specific degradation. Implementation is deferred in `docs/tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md` until Account/User S6 is complete/cleared.

- **Title:** Group event types inside game-sorted Timeline views
  - **Observation:** when the Timeline is organized by game, a game's banners, normal events, endgame, login events and other rows can still be difficult to scan as one undifferentiated set.
  - **Desired behavior:** **deferred rather than implemented by default.** First ship/test the accepted recognition-first sticky bars. Revisit lightweight type grouping only if real dense `By game` smoke still shows a scanning failure.
  - **Area:** UI / data clarity
  - **Priority:** no current implementation priority
  - **Status:** deferred
  - **Notes / constraints:** Steps 3–5 of `TIMELINE-READABILITY-UX-RESEARCH.md` rejected category bands for Candidate A′ because of vertical cost and because grouping conflicts with the semantics of `Ending soonest`. Do not add a grouping toggle or category sub-hierarchy in M2. Candidate C remains a fallback only if post-implementation evidence justifies it.


## Separate feature tasks

These are larger product/data features and should not be bundled with the small
pre-Astra interaction and visual polish items above.

- **Title:** Improve event recognition with event artwork
  - **Observation:** event names are often poor recognition cues in actual play. Readers may not remember an event's title, and matching a calendar entry to the in-game event becomes substantially harder when the game and calendar use different languages. Event artwork/banner imagery provides a much stronger visual cue.
  - **Desired behavior:** use optional event artwork primarily as an identity/recognition aid rather than decoration. The first implementation should make the artwork available in event details, where it can help the reader confirm "this is the event I see in the game" without increasing Timeline density. After that is usable on mobile, separately evaluate whether small thumbnails add enough recognition value in Timeline/Next Up surfaces to justify their layout and caching cost.
  - **Area:** new feature / UI / data clarity / ingestion
  - **Priority:** undecided
  - **Status:** deferred
  - **Notes / constraints:** treat this as a separate feature milestone, not part of the current S6 → Timeline M1/M2 sequence. Revisit after the pre-Astra baseline/audit unless explicitly reprioritized. The governing UX principle is recognition-first presentation: show the visual/subject players actually recognize rather than privileging a source/database title. Artwork must remain optional because some event classes (maintenance, shop resets, recurring endgame phases, etc.) may not have a natural banner image. Before implementation, define an image-source/asset policy: stable source URL versus locally hosted asset, reuse/hotlink permission, provenance/attribution where required, broken-image fallback, and PWA/offline/cache behavior. Do not make an event's date/provenance confidence depend on artwork availability. Preserve existing event IDs and completion state. NTEBuild's event timeline is a useful UX reference for recognition and information hierarchy, not an automatic image/data source for this project.


- **Title:** Rework event details around recognition-first information hierarchy
  - **Observation:** event details currently expose technically correct calendar/source information, but the presentation is not optimized for the user's first questions: what activity this is, how to recognize it in the game, when it ends, and why it matters. Improving only individual fields would leave the overall information hierarchy unchanged.
  - **Desired behavior:** redesign the event detail experience as a dedicated milestone around a recognition-first hierarchy: event identity/featured subject and optional artwork first; current timing/status and deadline next; useful human-facing description and rewards/participation context after that; source, provenance, precision/conflict and other technical metadata remain available but visually secondary.
  - **Area:** new feature / UI / data clarity
  - **Priority:** undecided
  - **Status:** deferred
  - **Notes / constraints:** this is a larger product/UX milestone and must not be bundled into the current S6 → Timeline M1/M2 sequence or treated as a side effect of adding artwork. The earlier feedback point that **rewards can help identify an event** is intentionally folded into this milestone's `description/rewards/participation context` layer rather than tracked as a separate Timeline feature. Preserve source transparency and precision/conflict information; the goal is hierarchy, not hiding evidence. Define the final field order and mobile behavior from the actual current detail-sheet implementation before coding. It may consume the separate artwork and richer event-metadata work when those are available, but should not block smaller recognition/readability fixes elsewhere.



## Coordinating decision — 2026-10-06

The coordinating project chat accepted the eight-point recognition/readability set as the product direction.

Agreed sequencing before the independent Astra audit:

1. complete Account/User **S6**;
2. implement Timeline Readability **M1 — Recognition Metadata Contract**;
3. implement Timeline Readability **M2 — Sticky Semantic Timeline** and perform the required phone/desktop smoke;
4. finish operator smoke of the implemented small UI batch (mixed reset attribution, explicit Event Detail Close/Back dismissal, stronger Monday separators); `All types` was already completed separately;
5. make an explicit product decision on **event artwork**;
6. if artwork is accepted, use that decision as an input to the separate **recognition-first Event Detail redesign**;
7. treat **per-game daily passes** as an independent personal-data feature that may be sequenced separately but is intended before the Astra baseline freeze;
8. freeze the resulting baseline, then run the independent **Astra audit**.

Important scope clarification:

- M1/M2 **do include** the accepted compact-label rule that character banners should prefer featured character names, and equivalent banners should prefer the corresponding featured item names, via trusted `recognitionSubjects` metadata with title fallback.
- The Event Detail redesign is **not** part of M1/M2.
- No implementation should begin automatically from this decision; CURRENT `main` and S6 status must be re-checked first.

## Pre-public release gate — Google OAuth publishing

- **Decision:** keep the current controlled/testing OAuth setup during
  development. Do not recreate the existing owner/wife Supabase users.
- **Trigger:** immediately before the calendar is shared in the intended open
  form — "here is the link; sign in with Google and use it" — without manually
  pre-authorizing each recipient.
- **Required check:** re-read current Google/Supabase OAuth guidance; confirm the
  app still requests only identity scopes; review Audience/Branding, redirect
  URIs and Supabase redirect configuration; determine any current verification
  or policy requirements.
- **Action after the check:** move Google OAuth to **Publish app / In
  production**, then smoke a genuinely new Google account from the public Pages
  URL and verify isolated profile creation, sync and sign-out/in without
  affecting existing users.
- **Scope boundary:** this is a release/configuration gate, not a user-data
  migration and not a blocker for Timeline M1/M2 or current household use.

## Feedback-chat reconciliation — 2026-10-06

The separate feedback chat's original eight recognition/readability observations are all accounted for:

1. **Featured subject over marketing title** → accepted semantic direction; M1 adds `recognitionSubjects`, M2 uses it on Timeline; Next Up/checklist remain a follow-up.
2. **Artwork as recognition aid** → preserved as the separate deferred artwork milestone; first scope remains Event Detail, not Timeline density.
3. **Semantic/type grouping** → researched and deliberately deferred; Candidate A′ ships without category bands.
4. **Deadline visible on the event** → accepted in Timeline M2 as sticky end-state/deadline content.
5. **Current/future context** → accepted in Timeline M2 as future-biased actual-now anchoring (~20% phone / ~25% desktop).
6. **Running vs upcoming state** → already present in current Timeline behavior and explicitly preserved by Candidate A′; no separate implementation task is needed.
7. **Rewards as another recognition cue** → retained inside the deferred recognition-first Event Detail redesign, not added to dense Timeline bars.
8. **Clear Event Detail hierarchy** → preserved as the separate deferred Event Detail redesign milestone.

Small-feedback implementation state updated 2026-10-21:

- mixed daily-reset attribution, sticky Event Detail Close/Back-first dismissal,
  and stronger Monday Timeline lines are implemented and browser-validated;
  final operator Android/PC smoke is pending (see IMPLEMENTATION-STATUS);
- `All types` select-all/clear-all was completed separately in PR #37;
- per-game daily passes remain an unimplemented independent feature.

## Candidates before Astra audit

Approved and now unblocked by completed Account/User S6a:

- **Timeline Readability M1 — Recognition Metadata Contract**  
  `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`
- **Timeline Readability M2 — Sticky Semantic Timeline**  
  `docs/tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md`

The three approved small fixes are implemented/browser-validated; final operator real-device smoke remains. All types was completed separately. Do not restart these fixes or other milestones automatically.

## Deferred until after Astra audit

Larger feature/redesign work unless explicitly reprioritized:

- event artwork / image-source and cache policy;
- recognition-first Event Detail redesign;
- per-game daily pass tracking;
- any return to explicit Timeline type grouping unless M2 smoke produces concrete evidence that it is still needed.

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
