# UI-polish small fixes — daily reset, Event Detail and weekly separators

Status: **implemented and browser-validated — hosted delivery tracked in PR; operator real-device smoke pending**
Scope: **three approved small UI fixes**: daily reset attribution, Event Detail dismissal and clearer weekly Timeline separators.  
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
- Weekly separators were previously recorded as an observed possibility.
  On 2026-10-21 the operator explicitly **made this a required UI fix**
  to be implemented with the two fixes above. This supersedes the previous
  assessment-only restriction in this task and backlog.

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

## 3. Implement more visible weekly Timeline separators (required)

The user explicitly approved **implementation**, not merely an assessment.
Make the transition from **Sunday to Monday** easier to see than an ordinary
daily cell boundary in both `By game` and `Ending soonest`.

- Use the **same local calendar date arithmetic** as the existing
  `dayBoundaries` / `timelineX` grid. Detect **Monday's local midnight**
  (`getDay() === 1` on each local day boundary); do not add 7 × 24h steps or
  assume a fixed UTC weekday, which would break in DST/timezones.
- Prefer a modestly stronger vertical line (slightly thicker and/or higher
  contrast). It must read across the plotted Timeline grid, without changing
  column widths, positioning or date-label spacing.
- Keep it visibly subordinate to the TODAY marker and without obscuring
  sticky labels, bars, category badges, deadlines, their frayed edges or
  interaction hit targets. Lines must remain decorative/non-interactive.
- Make it distinguishable in light/dark themes, including narrow mobile widths
  and the smallest/largest existing zoom values; avoid a bright, heavy weekly
  band or any extra row/legend/persistent controls.
- Reuse existing grid/boundary computations and minimally scoped styling.
  Do **not** reopen M2 viewport/history/navigation logic or change date
  precision semantics.

Include visual screenshots and automated rendering/placement checks at phone
and desktop widths; manual acceptance after Pages deploy should include the
contrast between regular daily lines, Monday and TODAY.

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
  viewport (including filtering after closing detail);
- Monday local calendar boundary selection (non-Mondays remain ordinary),
  DST/timezone behavior, daily-cell geometry preserved, both group modes and
  multiple zoom levels, decorative stacking below TODAY and event labels.

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
checks, weekly-separator implementation and browser screenshots, hosted
PR/CI/Pages evidence, remaining manual phone/desktop smoke. Update backlog states only for independently
verified fixes.

Create a short-lived branch, PR, merge, deploy if possible. The operator
confirms mobile browser Back/Close, mixed dailies and new week separators
after deployment. Never
claim manual acceptance or an unrun browser check.

## Explicit exclusions

- Do not rework the completed mobile header/filters, its auth/sync presentation,
  or `All types` behavior.
- Do not change Timeline M2 navigation or event types, feed/dates/provenance,
  source-health, Supabase/OAuth, Account Sync, stored preferences or event IDs.
- Do not add unrelated Timeline redesign/grouping, artwork, daily passes, S6b,
  or source-data precision research.
- Stop after the **three fixes** and their automated/browser validation.
  Weekly separators are approved for implementation in this Work.


## Implementation evidence — 2026-10-21

All three fixes implemented from main `b3095d3`; see the new small-fix section
in `docs/IMPLEMENTATION-STATUS.md` and
[Chromium screenshots/matrix](../evidence/ui-polish-small-fixes/README.md).
Frozen install, typecheck and build pass; full tests pass (1107 / 1 optional
skip) with RAM-backed TMPDIR after intermittent existing backup/Supabase
timeouts on the container overlay (details in status). Also passing:
native browser history checks, weekly-line layout/DST checks, existing M2
UTC/New York and mobile-header regressions. Hosted delivery is recorded with
the delivery PR. **Operator Android/PC smoke remains pending.** All types,
M2 viewport runtime, mobile header and Auth/Sync were not reworked.
