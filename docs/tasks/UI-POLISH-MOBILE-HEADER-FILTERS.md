# UI polish — compact mobile header and wrapped filters

Status: **implemented / merged / deployed — final operator real-phone smoke pending**
Delivery: [PR #37](https://github.com/maxvfk/game-calendar/pull/37);
[main CI/build/Pages](https://github.com/maxvfk/game-calendar/actions/runs/39631262345).
See `docs/IMPLEMENTATION-STATUS.md` for validation, the pre-existing 200%-text
settings overflow limit, and the remaining manual acceptance gate.
Type: **standalone UI-polish task**, not Timeline M2 and not the unrelated small UI-fix batch.

## Context / decision

Real Android Chrome use showed that the existing account/login strip, two-line app
header, horizontally scrolling type filters and Focus row consume too much of a
phone viewport. The operator iterated mobile mockups and accepted the following
direction, including the final expanded-filter mockup with `Reset filters`
and explicit collapse control.

This task should be understandable without access to the original chat or
generated images. Treat the precise CSS geometry in mockups as illustrative:
fit real 320–390 CSS px widths and do not stretch the page horizontally.

Do not bundle mixed daily-reset attribution, Event Detail Close/Back,
weekly separators or unrelated fixes here; those remain a separate small
UI-polish batch.

## Start

Continue `maxvfk/game-calendar` from CURRENT `main`, not an old Work branch.
Read `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`, this task, existing
`src/client/App.tsx`, `src/client/account/AuthRoot.tsx`,
`src/client/components/TypeFilters.tsx`, `GameFocus.tsx`,
`src/client/state/usePrefs.ts`, `eventCategories.ts`, relevant styles and
tests, plus M2's viewport-preservation fix. Use a short-lived branch.

## Accepted mobile design

### Compact header

For phone/narrow layout, one compact horizontal app header rather than
the current account strip + tall two-line header + filter/focus strips:

`EVENTCLOCK   [Filters icon]   [Checklist | Timeline]   [Account status icon]`

- Smaller but recognizable `EVENTCLOCK` wordmark; no mobile `N live · N upcoming`
  subheading. These counts may remain in other appropriate surfaces, and the
  existing desktop presentation may stay as-is.
- Remove the **persistent mobile** `Saved on this device / Continue with Google`
  account strip and the persistent mobile email/sync-status text row. Do **not**
  remove access to their functionality or hide meaningful auth/sync failures.
- Filters affordance lives between the logo and view tabs; on real narrow phones
  it may degrade from icon + label to **icon-only**, retaining an accessible
  `Filters` name and sufficient touch target.
- The existing `Checklist / Timeline` view toggle remains reachable; if visually
  shortening `Checklist` to `List` on narrow widths helps, keep its accessible
  meaning and stored `prefs.view` value unchanged.
- Account/profile button is at far right, using a stable person glyph and a
  small state cue. Account status has **no invented synced/online claim**.
- If all controls cannot fit at 320px, use measured/responsive compact
  presentation rather than an overflow, clipped target or another persistent row.
- Keep Timeline's own `By game / Ending soonest`, zoom and `Jump to today`
  controls **outside** the filters panel and accessible as before.

### Account/login and sync disclosure

Move the mobile entry point for the existing `AuthRoot` account actions/status
into that compact header. A tap opens a small accessible panel/sheet/popover with
the current true state and available actions. Examples to distinguish visually:

- Guest (local device data only): neutral person + sign-in affordance; offer
  `Continue with Google`; **never** show green synced.
- Account successfully synced: person + positive sync indicator.
- Syncing: person + in-progress indicator.
- Offline / transport unavailable / pending local outbox: person + waiting/offline
  indicator; local saves and cloud-pending work must remain distinguishable.
- Auth required, schema incompatibility, unrecoverable/retrying sync issue or
  device-clock warning: appropriate warning/error indicator; preserve readable
  explanatory text and existing retry/re-login/export guidance/actions.

Use the *actual current* `ViewState`, `SyncStatus`, pending count, sync timestamp
and action handlers; do not infer sync success from `navigator.onLine` alone.
Preserve account email, sign-in, sign-out, retry sync, deferred first-login
choice and error information accessible in the disclosure as applicable.
Avoid false green statuses in offline established-account cache mode.

**This is UI re-placement of existing Auth/Sync**, not an OAuth, account,
first-login, Supabase, offline recovery, sync-engine, data migration or
storage-contract milestone. Do not change cross-tab sign-out/profile isolation
or pending-mutation safety.

### Filters collapsed/expanded

- Mobile filters are **collapsed by default** into the header button; there is
  **no persistent extra collapsed-filter summary row** between header and
  Timeline. No new saved preference is needed for disclosure state.
- Both the header `Filters` button (toggle) and a clearly labelled/accessible
  **collapse control inside the expanded panel** close the panel. They may
  reopen without clearing any selection. Do not auto-close after selecting an
  individual filter, so multi-step edits remain convenient.
- A small visual dot/cue on `Filters` indicates a **non-default filter**:
  selected types are not the full set and/or a single game is focused.
  Selected filter state also remains evident inside the expanded panel and to
  screen readers; colour alone does not communicate state.
- Expanded panel appears directly beneath the header, then pushes ordinary
  page content down. It contains two clear sections:
  **Types** and **Games / Focus**. Each section has chips with **flex-wrap**,
  no horizontal chip scroller and no hidden off-screen choices. The natural
  page may scroll vertically on short phones; do not add a nested horizontal
  scrollbar.
- Types: `All types`, Banners, Events, Endgame / challenge, Login, Shop,
  Maintenance. Preserve the existing category semantics and multi-selection.
  The existing separately approved small fix should be handled in this
  component as a direct prerequisite: tapping `All types` while all categories
  selected **clears all**; otherwise selects all. Do not add a `None` button.
- Games: `All` plus all currently enabled games in the user's chosen order,
  including custom games where supported. This is the **existing single-game
  Focus lens**, not a multi-select switch for enabling/disabling games.
  Tapping a focused game returns to All; preserving current `Next` progression
  affordance is preferable where practical. Do not mutate `hiddenGames` or
  `gameOrder` when changing focus. If only one game is enabled, do not show
  an inert chooser; retain a truthful state.
- Panel header: `Filters`, visible **Reset filters** action, explicit
  collapse button (up-chevron with meaningful accessible name).
- `Reset filters` acts only on the two controls inside the panel:
  `visibleCategories = allCategories()` and `focusGame = null`. Leave
  enabled/disabled games, order, Upcoming, completion/ignored settings,
  zoom, view mode, region, account and progress untouched. Reset must be
  usable when all types are cleared or no rows are visible.
- Opening/closing the panel must not silently clear selections, reset account
  state, remount Timeline with a new key, or request a `Jump to today`.
  Filtering must retain M2's **inspected-time restoration with legitimate
  native closest-edge clamping** when the board range becomes too short.

### Desktop/backward compatibility

- On wide/desktop layouts, keep currently available filter and Focus controls,
  the existing account entry and view layout accessible; no wholesale desktop
  redesign or accidental duplicate controls.
- Both `Checklist` and `Timeline` still use the same type/focus state; mobile
  filters remain usable in either view.
- Respect theme light/dark, 200% text scaling as practical, touch target sizing,
  reduced motion, keyboard focus, Escape/outside-click behavior appropriate
  for the chosen disclosure mechanism, accessible names and expanded states.
- No changes to source ingestion, feed dates/precision, event IDs, daily reset,
  Account/Supabase schema, personal data format or offline contracts.

## Tests / acceptance

Add focused tests (unit/mounted/browser where appropriate) for:

1. Mobile header fits 320/360/390px and desktop fallback; no sideways page
   overflow and no permanent mobile filters/account status rows.
2. Filters toggling from header and collapse button; expanded panel wraps **all**
   types and enabled games without horizontal scrolling; open state survives
   individual selection changes; selected state and active-filter cue are correct.
3. `All types` select-all/clear-all; partial, none, focus one/all; Reset only
   categories + focus, preserving hidden games/order/showUpcoming/etc.
4. Switch Checklist/Timeline and open/close panel without unexpected loss of
   filters or a Timeline temporal jump. Include empty results, rapid changes
   and allowed boundary clamp. Reuse/run M2 browser viewport regression.
5. Guest/account/synced/syncing/pending/offline/network/auth/schema/error/clock
   states, truthful indicator and available existing actions; account data
   remains isolated on sign-out. Do not require or simulate real OAuth login
   to test simple visual behavior.
6. Actual device: mobile dark/light, expanded and collapsed, auth disclosure,
   narrow fonts/chips, no horizontal pan, and correct inspected time;
   desktop remains functionally intact.

Run the standard required validation:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

Also run existing Timeline browser/responsive checks where possible. Record
limitations if environment does not permit them. Prefer real-phone + desktop
smoke **after Pages deploy** for final acceptance; agent-only Chromium layout
checks do not replace a user/operator check on a real device.

## Delivery / stop

Update `docs/IMPLEMENTATION-STATUS.md` with the exact implemented behavior,
test results, PR/CI/Pages evidence and remaining real-device smoke gate.
Create PR/merge/deploy only this task's implementation. If PR/hosted/manual
checks cannot be completed, explicitly leave the corresponding gate open.
Do not start the separate small UI-fix batch, source-quality audits, artwork,
S6b or another milestone in the same Work.


## Operator visual refinement after first deployment — 2026-10-21

The operator accepted functional behavior and supplied real-phone + prototype
screenshots, asking for two bounded visual changes: Filters must be a bordered
button filling all spare width between wordmark and view tabs, and expanded
filter rows/spacing must be denser. Use 32px minimum wrapped chip targets with
6px separation (grow with enlarged text), tighter panel spacing, and mobile
Login / Shop labels with existing full accessible meaning. Keep 44px header
controls. At ordinary phone text size retain the Filters label; at 320px its
icon may yield first. The existing measured large-text fallback remains.
This is panel density only; do not change Timeline bar height/navigation,
Auth/Sync, desktop layout, filter semantics or Reset scope. Final refined
real-phone smoke remains with the operator.


## Operator header-height refinement — 2026-10-21

After accepting the compact filter panel, the operator requested a shorter
header and equal visible heights for Filters and the view-toggle frame.
Supersede the preceding 44px-header constraint for mobile: 34px normal-size
outer frames, 28px inner tabs, 4px header vertical padding; controls can grow
for enlarged text. Keep the accepted panel, desktop, Auth/Sync and Timeline
behavior. Final real-phone visual smoke remains the operator's gate.
