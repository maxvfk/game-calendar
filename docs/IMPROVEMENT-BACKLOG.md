# Improvement backlog

Last backlog reconciliation: **2026-11-24**, against current `main` `66b0f29` and merged PRs. Earlier observations and the 2026-10-06 sequencing decision are retained as historical rationale, not a current implementation queue.

**Current next planned milestone:** **the label policy decision on the [PR #175](https://github.com/maxvfk/game-calendar/pull/175) case**, after liveness step 1 ([#190](https://github.com/maxvfk/game-calendar/pull/190), [#191](https://github.com/maxvfk/game-calendar/pull/191)) and the `endfield-wikigg-echoes` retirement (2026-11-25), following the [2026-11-24 revision](tasks/PRACTICAL-PARSER-LABELS-PLAN.md#revision-2026-11-24-current-order) of the practical plan. PR #0 ([#185](https://github.com/maxvfk/game-calendar/pull/185)) and PR #1 ([#186](https://github.com/maxvfk/game-calendar/pull/186)) are merged; `C1b.1 / CTX / C1b.2 / C2 / C5.3` stay frozen; completed `C0`, `C1a.0`, and `C1a.1` remain intact offline. Do not start milestones automatically.

**Deferred / non-blocking:** Account/User S6b, Google OAuth publishing before open public sign-in, event artwork, recognition-first Event Detail, independent critical audit and maintenance guide after audit. Timeline v2 cutover [PR #115](https://github.com/maxvfk/game-calendar/pull/115) remains draft/NO GO. The observed official-name/AI-label mismatch is proposed in [PR #175](https://github.com/maxvfk/game-calendar/pull/175); that PR is **open and unmerged**, so this reconciliation does not duplicate or resolve its Watchlist item.

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
  - **Priority:** WATCH: recheck only a newly confirmed missing cycle; do not reopen historical October deadlines
  - **Status:** historical cycle I/II corrected in [PR #58](https://github.com/maxvfk/game-calendar/pull/58); a western recurring Echoes wiki header slip was fixed in [PR #170](https://github.com/maxvfk/game-calendar/pull/170); future recurrence/source coverage remains evidence-gated
  - **Notes / constraints:** existing `docs/research/endfield-recurring-endgame.md` §16 confirms Phantasia's western Cycle I source contradiction and safe `rejected`/LKG behavior. New user screenshot is first-hand evidence of cycle-rotation impact, not proof of an exact UTC boundary; it contains user-identifying account UI and was not uploaded publicly. Focused follow-up: `docs/tasks/ENDFIELD-ECHOES-PHANTASIA-CYCLE-COVERAGE.md`. Do not weaken source-health or synthesize 7-day periods.

- **Title:** Audit real per-game daily reset clocks and regional server mappings
  - **Observation:** Historical 2026-10-21 report of disputed reset countdowns. The subsequent CZN GO 1–3 established and verified its separate 18:00 UTC reset; the seven-game clock research identified remaining game/region evidence gaps, notably NTE. Do not treat the old claim that CZN lacks a reset rule as current.
  - **Desired behavior:** verify authoritative per-game daily reset instants for shipped games and relevant regions, compare to calculated app times, distinguish known vs unknown and DST, then propose a separate safe correction.
  - **Area:** reset scheduling / data correctness / personal daily keys
  - **Priority:** operator-observed follow-up; research-first, separate from UI-polish
  - **Status:** research completed 2026-10-22 and CZN reset corrected/accepted; unverified clocks/regions remain WATCH, with no blanket reset migration approved
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
  - **Priority:** complete
  - **Status:** resolved in [PR #39](https://github.com/maxvfk/game-calendar/pull/39) and [PR #40](https://github.com/maxvfk/game-calendar/pull/40); implemented and browser-validated
  - **Notes / constraints:** Implemented compact mobile header, collapsible wrapped filters and account disclosure. The separate `All types` toggle was already completed in PR #37. Preserve existing behavior; the linked task is historical, not an instruction to reimplement.


- **Title:** Audit date/time precision downgrades against exact source timestamps
  - **Observation:** CZN Sereniel/Peko exposed day-only deadlines despite candidate machine clocks. Historical Oct 21 00:00Z end is now independently confirmed by official banner + maintenance notices; generic Prydwen timestamps still contain real conflicts.
  - **Desired behavior:** enrich only independently verified event boundaries, preserving conservative handling of ambiguous machine/server clocks.
  - **Area:** source ingestion / time precision / data clarity
  - **Priority:** verified individual corrections complete; further changes require fresh dated evidence
  - **Status:** CZN six verified boundaries fixed in [PR #59](https://github.com/maxvfk/game-calendar/pull/59), two Genshin regional Phase II ends in [PR #60](https://github.com/maxvfk/game-calendar/pull/60); unverified source-time cases remain WATCH
  - **Task:** [EVENT-TIME-PRECISION-AUDIT](tasks/EVENT-TIME-PRECISION-AUDIT.md); [full seven-game findings](research/event-time-precision-audit.md).
  - **Implementation handoffs:** [CZN verified banner precision](tasks/CZN-VERIFIED-BANNER-TIME-PRECISION.md), then independent [Genshin Phase II ends](tasks/GENSHIN-PHASE-II-VERIFIED-END-PRECISION.md). Exact Nine/Alcea and Tiphera/Tiana UTC periods, Rossweisse/Sig opening, and two Genshin regional ends confirmed. No blanket hidden-timestamp promotion.
  - **Notes / constraints:** historical Sereniel/Peko have left today's feed; do not resurrect them. Regional starts lack regionStarts representation; NTE server mapping and other Genshin tags remain evidence gaps. Preserve IDs/marks, provenance, per-row review times, source-health/LKG and Account Sync; no Daily Reset or Phantasia changes. Recognition metadata is separate scope.

- **Title:** Stronger weekly separators on the daily Timeline
  - **Observation:** adjacent weeks are not visually distinct enough when scanning the daily Timeline.
  - **Desired behavior:** make the boundary between Sunday and Monday more visible than ordinary day separators, for example with a slightly thicker and/or more contrasting divider.
  - **Area:** UI
  - **Priority:** complete
  - **Status:** implemented and browser-validated in [PR #44](https://github.com/maxvfk/game-calendar/pull/44); no separately documented final per-fix real-device smoke
  - **Notes / constraints:** operator explicitly requested implementation on 2026-10-21. Emphasize the Sunday→Monday local day boundary using a modest stronger grid line, while keeping it subordinate to TODAY and without adding mobile clutter, changing event/calendar geometry or interfering with M2 inspected-time preservation.
  - **Task:** `docs/tasks/UI-POLISH-SMALL-FIXES.md` — implemented with reset attribution and Event Detail dismissal; see IMPLEMENTATION-STATUS and browser evidence.

- **Title:** Per-game daily pass countdowns
  - **Observation:** the app has daily chores but no personal tracking for 30-day login/subscription passes such as Genshin's Blessing of the Welkin Moon.
  - **Desired behavior:** let the reader track remaining days for a daily pass in each enabled game, set or correct the remaining count, and extend an active pass by one standard period with a single action.
  - **Area:** new feature
  - **Priority:** complete; normal-use bug reports only
  - **Status:** PASS-1A [#171](https://github.com/maxvfk/game-calendar/pull/171), PASS-1B [#177](https://github.com/maxvfk/game-calendar/pull/177), PASS-2 [#178](https://github.com/maxvfk/game-calendar/pull/178), production activation [#179](https://github.com/maxvfk/game-calendar/pull/179) and UI polish [#180](https://github.com/maxvfk/game-calendar/pull/180), [#182](https://github.com/maxvfk/game-calendar/pull/182), [#183](https://github.com/maxvfk/game-calendar/pull/183) merged by 2026-11-19
  - **Notes / constraints:** Implemented profile-scoped, region-specific pass operations with +30, Undo, correction, export/import and Account Sync. The displayed countdown was adjusted to match the in-game number excluding today while preserving inclusive internal day semantics. No need to repeat PASS-0/PASS-2; a Timeline expiry visualization is a separate unapproved idea. Live in-game rollover evidence and authenticated production behavior were outside the original flag-on guest preview; investigate concrete issues during use.
  - **Canonical task and phased roadmap:** [DAILY-PASSES.md](tasks/DAILY-PASSES.md) — PASS-0 (read-only independent design gate) → PASS-1A (minimal model/DB/backup) → PASS-1B (offline/Sync/export) → PASS-2 (UI/smoke). Production rollout is separately gated.

- **Title:** Disambiguate mixed daily reset countdowns
  - **Observation:** the `Today's dailies` header currently shows a single `next reset in …` countdown even though enabled games can reset at different times; after one game's reset has already happened, the global-looking timer can imply that all games share the remaining countdown.
  - **Desired behavior:** keep the compact nearest-reset countdown but identify which game or reset group it belongs to, for example `next: Genshin · 4h 25m` or `next: Genshin +2 · 4h 25m` when several games reset together.
  - **Area:** UI / data clarity
  - **Priority:** complete
  - **Status:** implemented/browser-validated in [PR #44](https://github.com/maxvfk/game-calendar/pull/44); dedicated final real-device smoke not separately recorded
  - **Notes / constraints:** avoid adding a full per-game timer row to the collapsed dailies strip; the goal is to remove ambiguity without making the section taller. Per-game server/reset semantics already exist and should remain the source of truth.
  - **Task:** `docs/tasks/UI-POLISH-SMALL-FIXES.md` — implemented; see IMPLEMENTATION-STATUS and browser evidence.

- **Title:** Make event details explicitly dismissible
  - **Observation:** event details currently have no visible close control. On touch devices the reader must tap the backdrop, which can be awkward on a large bottom sheet; the browser/system Back button navigates away instead of dismissing the open details.
  - **Desired behavior:** add a clear close button inside the detail sheet and make browser/system Back dismiss the currently open event detail before normal page navigation resumes.
  - **Area:** interaction / UI
  - **Priority:** complete
  - **Status:** implemented/browser-validated in [PR #44](https://github.com/maxvfk/game-calendar/pull/44); dedicated final real-device smoke not separately recorded
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
  - **Priority:** Timeline portion complete; Next Up/checklist follow-up not prioritized
  - **Status:** M1 `recognitionSubjects` contract and M2 recognition-first Timeline completed and operator-accepted 2026-10-21; Next Up/checklist surface behavior remains an independent deferred decision
  - **Notes / constraints:** M1 adds trusted ordered featured subjects with title fallback; M2 uses them on Timeline. Do not infer subjects from arbitrary marketing text. Additional use in Next Up/checklist requires its own scope; do not restart M1/M2 or change event IDs.



- **Title:** Bias the Timeline viewport toward future events
  - **Observation:** the daily Timeline currently places today near the center of the visible range. That spends roughly half of the immediately visible space on past days even though the main calendar task is understanding upcoming events and deadlines.
  - **Desired behavior:** position today closer to the left side of the default Timeline viewport so that most of the visible range shows future days. Keep a small amount of recent-past context rather than removing past days entirely.
  - **Area:** UI / data clarity
  - **Priority:** complete
  - **Status:** resolved in Timeline M2, with operator Android/PC acceptance 2026-10-21
  - **Notes / constraints:** M2 anchors the actual current moment at about 20% from the left on phone and 25% on desktop on initial opening or explicit Jump to today. Filter/group changes preserve inspected time where geometry allows; no reimplementation.

- **Title:** Show event deadlines directly on Timeline bars
  - **Observation:** identifying an event is not enough; the calendar's primary question is what ends first, but users currently have to infer or open details to read the relevant deadline.
  - **Desired behavior:** show the event's end date directly on its Timeline representation when space permits. Prefer an end-focused compact form such as `→ Oct 21`; when there is enough room, a start-to-end range such as `Sep 30 → Oct 21` may be shown.
  - **Area:** UI / data clarity
  - **Priority:** complete
  - **Status:** resolved in Timeline M2, with operator Android/PC acceptance 2026-10-21
  - **Notes / constraints:** The accepted Candidate A′ sticky bars show exact/day/unknown end semantics when space permits, preserving accessible labels and constrained-width degradation. No new milestone is needed for the already shipped behavior.

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

The coordinating project chat accepted the eight-point recognition/readability set as the product direction. **This is the historical 2026-10-06 decision, not the current queue.** M1/M2, the mobile/small UI batch, and Daily Passes are now implemented. S6a is complete; S6b remains optional. The operator has not authorized the event-artwork redesign or the full independent audit.

Agreed sequencing recorded at that time:

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

Historical snapshot from 2026-10-21, reconciled 2026-11-20:

- mixed daily-reset attribution, Event Detail Close/Back dismissal, Monday separators: implemented in PR #44; final per-fix real-device smoke was not separately recorded;
- `All types` select-all/clear-all: completed in PR #37;
- Daily Passes: complete and activated in PRs #171–#183 (excluding unrelated #181); original pre-client status is obsolete.

## Current source-coverage & parser queue (2026-11-21, revised 2026-11-24)

The earlier pre-Astra Timeline M1/M2 candidate list is closed: both milestones and operator phone/PC acceptance were completed on 2026-10-21. The compact mobile header and small UI batch were implemented in PRs #39/#40/#44.

- **Done:** [C0](https://github.com/maxvfk/game-calendar/pull/152), [C1a.0](https://github.com/maxvfk/game-calendar/pull/159), [C1a.1](https://github.com/maxvfk/game-calendar/pull/161). The previous C1a.1 `Next` entry in `IMPLEMENTATION-STATUS.md` is a historical pre-merge record.
- **Frozen (2026-11-21):** `C1b.1`, `CTX`, `C1b.2`, `C2`, and `C5.3` in [`SOURCE-COVERAGE-SIMPLE-SCHEME.md`](tasks/SOURCE-COVERAGE-SIMPLE-SCHEME.md) are frozen after the 2026-11-21 strategic review (disproportionate negative-proof complexity vs real failure modes: ZZZ CDN hash oscillation, noise ignores, stale feeds, and parser context/template gaps).
- **Active practical plan ([`PRACTICAL-PARSER-LABELS-PLAN.md`](tasks/PRACTICAL-PARSER-LABELS-PLAN.md), order revised 2026-11-24):**
  - **Done:** PR #0 ([#185](https://github.com/maxvfk/game-calendar/pull/185): freeze, daily `timeline-labels.yml`) and PR #1 ([#186](https://github.com/maxvfk/game-calendar/pull/186): `recognitionSubjects` + `summary` in the 5 article parsers, IDs/dates unchanged).
  - **1. Liveness in this repo (former PR #3, widened) — code done** in [#190](https://github.com/maxvfk/game-calendar/pull/190) and [#191](https://github.com/maxvfk/game-calendar/pull/191); the heartbeat starts once the operator adds the `DEADMAN_PING_URL` secret: dead-man ping at the end of `ci.yml`'s `pages` job gated on `publicationStalled()` returning `null` (passed from `build`); continuous `>48h` per-source stale alert (e.g., single self-updating issue or external ping, non-blocking; a `state.json` cache miss counts as unknown, not stale); decouple `bun test` content/conflict assertions from live `snapshots/*` into immutable `test/fixtures/`.
  - **2. Resolve `endfield-wikigg-echoes` (micro-PR) — done 2026-11-25:** retired from the schedule; Echoes cycle deadlines are reviewed rows per season from the version notes (Scattering added, and the Nov 25 maintenance end set on the Fervor-era rows); the three older Endfield banners without an end got official ends, and the current version's Endfield banners were added, the same day.
  - **3. Label policy decision** on the case in open [PR #175](https://github.com/maxvfk/game-calendar/pull/175) (primary candidate: `Official Name: <what it is>` for non-banners + deterministic `labelDiagnostics()` guard; alternative: banners only) and close/supersede #175.
  - **4. Narrowed PR #2:** generalize only the 3–4 templates that repeat every patch (skip one-off prose notices); record a per-version check for ZZZ, CZN and Endfield (for Endfield, including the two Echoes cycle rows per season and "before the next version update" ends).
  - **5. Optional:** 1-day read-only `C5.1-lite` DeepSeek probe, also to measure real missed notices per week; no autonomous event commits to `main`.
  - **Parallel (non-blocking):** operator Daily Passes production acceptance ([`DAILY-PASSES-SMOKE.md`](tasks/DAILY-PASSES-SMOKE.md): authenticated sync + one real reset boundary) and a success ping in the private encrypted-backup workflow.
- **Before the large independent Astra audit:** take an explicit decision about its timing and baseline. That audit is a proposed next quality gate, not an approved automatic run.

## Deferred or awaiting product decision

- **Event artwork:** first define asset provenance, permission, fallback, PWA cache/offline strategy, then decide whether to show it in Event Detail.
- **Recognition-first Event Detail redesign:** separate UX/data milestone; preserve all source/date/provenance transparency.
- **Timeline event-type grouping:** deferred pending a demonstrated remaining usability issue after M2.
- **Daily Passes on Timeline:** discussed as a personal expiry bar or marker; **not approved or scoped for implementation**. Keep separate from completed Daily Passes.
- **Featured-subject recognition in Next Up/checklist:** M1/M2 do not automatically cover these surfaces.
- **Account/User S6b:** backup monitoring and cache-cleanup hardening, separate and non-blocking (narrow private backup-workflow success ping tracked as a parallel infra item alongside the practical plan).
- **Google OAuth publish-app gate:** only before open sign-in by arbitrary users; preserve existing user identities.
- **Timeline v2 editorial registry cutover [PR #115](https://github.com/maxvfk/game-calendar/pull/115):** remains draft/NO GO, not part of automatic coverage or summary rollout.
- **Official-name vs AI Timeline label:** observed problem and proposed Watchlist write-up in **open** [PR #175](https://github.com/maxvfk/game-calendar/pull/175). Keep the product decision open; do not duplicate that text or merge #175 implicitly.

## Implemented / resolved

- **Timeline M1/M2, semantic bars, viewport and label truncation:** completed and accepted 2026-10-21 (M2 [PR #34](https://github.com/maxvfk/game-calendar/pull/34); truncation [PR #46](https://github.com/maxvfk/game-calendar/pull/46)).
- **Compact mobile header/filters:** [PR #39](https://github.com/maxvfk/game-calendar/pull/39), [PR #40](https://github.com/maxvfk/game-calendar/pull/40); `All types` [PR #37](https://github.com/maxvfk/game-calendar/pull/37).
- **Reset-attribution, Event Detail close and weekly separators:** [PR #44](https://github.com/maxvfk/game-calendar/pull/44); browser-validated, dedicated real-device smoke not separately documented.
- **Verified date precision:** CZN [PR #59](https://github.com/maxvfk/game-calendar/pull/59), Genshin [PR #60](https://github.com/maxvfk/game-calendar/pull/60); other unsourced clocks remain WATCH.
- **Daily Passes:** PASS-1A/1B/2, production activation and UI refinements, [PR #171](https://github.com/maxvfk/game-calendar/pull/171), [#177](https://github.com/maxvfk/game-calendar/pull/177)–[#183](https://github.com/maxvfk/game-calendar/pull/183) (with #181 being unrelated Pages CI repair).
- **Source Coverage preliminary stages:** C0/C1a.0/C1a.1, [PR #152](https://github.com/maxvfk/game-calendar/pull/152), [#159](https://github.com/maxvfk/game-calendar/pull/159), [#161](https://github.com/maxvfk/game-calendar/pull/161). Do not repeat the completed seven-game October audit/recovery wave without a new observed gap.

## Sequence

1. Keep this backlog as an intake and priority ledger; use current `main`, `docs/IMPLEMENTATION-STATUS.md`, and `docs/tasks/PRACTICAL-PARSER-LABELS-PLAN.md` for implementation truth. Reconcile individual historical lines when new facts warrant it; don't rerun completed milestones.
2. **Next concrete step:** the label-policy decision on the [PR #175](https://github.com/maxvfk/game-calendar/pull/175) case; `endfield-wikigg-echoes` was retired on 2026-11-25, per the [2026-11-24 revision](tasks/PRACTICAL-PARSER-LABELS-PLAN.md#revision-2026-11-24-current-order).
3. Then the narrowed **PR #2** (recurring templates, per-version check for ZZZ/CZN/Endfield) and the optional `C5.1-lite` probe. Daily Passes production acceptance and the private backup-workflow success ping run in parallel and block none of these steps. Keep `C1b.1 / CTX / C1b.2 / C2 / C5.3` frozen unless reopened by explicit operator decision.
4. Decide when to freeze a baseline for an independent critical Astra audit. Only after audit findings and fixes write the final `docs/MAINTENANCE.md`; keep artwork/Detail redesign and other deferred products as separate decisions.
