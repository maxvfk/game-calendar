# UI-polish small fixes — reset attribution and Event Detail dismissal

Status: **ready — implement after compact mobile header/filters delivery**  
Scope: **two confirmed UI/interaction fixes + one read-only weekly-separator assessment**.  
Timeline M2 and the mobile-header task remain separate and must not be reopened.

## Baseline verified 2026-10-21

At main `c5e540c30ae9e6ed6cf5d7b51990b407b85379ac`:

- `All types` already works as a select-all / clear-all aggregate toggle in
  `src/client/components/TypeFilters.tsx` (mobile-header implementation PR #37).
  **Do not reimplement it.** Keep its existing mobile wrapped + desktop UI behavior.
- `src/client/components/Dailies.tsx` currently computes `soonest` from
  `items[].resetsIn` and prints `next reset in X` for mixed times, but omits
  which game(s) actually reset next.
- `src/client/components/EventDetail.tsx` closes on backdrop and Escape but has
  no visible inside-sheet Close button. Browser/system Back does not dismiss it.
  `App.tsx` currently owns `openId` / `setOpenId` for both Checklist and
  Timeline, without modal history handling.
- A more visible weekly boundary in Timeline is recorded in
  `docs/IMPROVEMENT-BACKLOG.md` as an **observation**, not an approved layout.
  Do not automatically change the grid just because this task mentions it.

Use CURRENT main as actual source of truth if anything has changed by Work start.

## 1. Identify the game of the next daily reset

In `Today's dailies`, replace the ambiguous mixed-game label with one short,
truthful attribution based on the **same reset calculation** as the displayed
countdown. Preserve the existing section height and normal countdown behavior.

- When game reset instants differ, identify the next-reset game/group, e.g.
  `next: Genshin · 4h 25m` or `next: Genshin +2 · 4h 25m`.
- Derive the label from the relevant `DailyGroup` / `DailyItem` game identity,
  not event titles. Do not count multiple items of the *same game* as extra
  games; stable user game order is preferred for the representative label.
- If all displayed groups share a reset boundary, the existing compact
  `resets in X` form is fine (or another equally clear compact form).
- If games have effectively equal next-reset instants, group them using the
  authoritative computed boundaries, not arbitrary display-string or rounded
  countdown equality; avoid incorrect groups near minute/second boundaries.
- Preserve existing server-region / game-specific reset, daily dayKey, ticks,
  streaks, catch-up, chores, custom games, hide/show and export/sync behavior.
  Do not invent an individual reset where it is not supported.

## 2. Explicit Event Detail Close and browser/system Back

The event sheet must be dismissible by:

- a clearly visible, adequately sized **Close** button inside the sheet,
  reachable even after scrolling; accessible name and keyboard focus;
- browser/Android **Back** when the sheet is open, closing it first rather than
  navigating away from the PWA;
- existing backdrop tap and Escape, still functional.

Coordinate the `openId` owner in `App.tsx` and the `EventDetail` component
so history and UI remain consistent. A valid implementation may use a
short-lived, owned history state entry while the dialog is open, but must:

- avoid sticky/duplicate history entries, reopening from a stale forward entry,
  back loops, or unintended navigation after Close/backdrop/Escape;
- handle opening from either view, rapidly switching/opening events, refresh/
  mount boundaries, absent/deleted events, and history entries originating
  outside this UI without corrupting navigation;
- avoid breaking Supabase Google callback cleanup and browser URL/base path;
- preserve currently inspected Timeline moment, filtering, scroll, and view;
- return keyboard focus to an appropriate invoking control where feasible;
- preserve modal state isolation through account/profile switching and sign-out.

Do **not** redesign Event Detail hierarchy/artwork/metadata/progress controls.

## 3. Weekly separators — assessment only

Evaluate current daily grid at narrow + wide widths and multiple zoom levels
against the accepted M2 readability rules. Specifically, ask whether adding a
slightly stronger Sunday/Monday boundary genuinely helps scanning without
competing with TODAY, deadlines, sticky text and dense mobile event bars.

Record the evidence and a concise recommendation in
`docs/IMPLEMENTATION-STATUS.md`. **Do not implement a weekly separator under
this task without new operator approval**; it is not a confirmed defect and is
not essential for closing the two fixes above.

## Checks and acceptance

Start from fresh CURRENT main, read `AGENTS.md`,
`docs/IMPLEMENTATION-STATUS.md`, `docs/IMPROVEMENT-BACKLOG.md`, this task,
relevant code/tests and completed M2 navigation requirements.

Add focused regression tests for:

- a single next-reset game and multiple distinct groups; two+ games sharing
  the earliest boundary; multiple daily items per game; region/time transitions;
- opening details from Checklist and Timeline; visible Close; Escape/backdrop;
  Back-first dismissal and subsequent normal Back navigation; reopening and
  repeated close cycles; no stale history entries or accidental reopens;
- compatibility with mobile account/filter disclosure and M2 inspected-time
  viewport (including filtering after closing detail).

Use a real browser for history/Back behavior, not only simulated happy-dom
events. Run existing mobile-header and Timeline browser checks where
available. Work may rely on the current test harness; do not introduce a large
new browser infrastructure just for polish.

Required baseline:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

After implementation, update `docs/IMPLEMENTATION-STATUS.md` with facts,
checks, weekly-separator recommendation, hosted PR/CI/Pages evidence, remaining
manual phone/desktop smoke. Update backlog states only for independently
verified fixes.

Create a short-lived branch, PR, merge, deploy if possible. The operator
confirms mobile browser Back/Close and mixed dailies after deployment. Never
claim manual acceptance or an unrun browser check.

## Explicit exclusions

- Do not rework the completed mobile header/filters, its auth/sync presentation,
  or `All types` behavior.
- Do not change Timeline M2 navigation or event types, feed/dates/provenance,
  source-health, Supabase/OAuth, Account Sync, stored preferences or event IDs.
- Do not add weekly styling automatically, artwork, daily passes, S6b, or
  source-data precision research.
- Stop at these two fixes and the documented weekly-separator assessment.
