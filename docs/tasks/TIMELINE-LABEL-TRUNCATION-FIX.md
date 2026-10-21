# Timeline — retain readable event titles on narrow screens

Status: **complete / operator accepted 2026-10-21**. PR #46 merged, hosted CI/Pages green, and the operator subsequently confirmed the deployed fix works normally. Original finding: Android screenshot 2026-10-21. Exact manual smoke matrix was not provided.

## Verified finding

Baseline main `b3095d350d254bda7bef1155fffcba02c20cb56c`.
On a phone in `Ending soonest`, several visible event bars show game code,
compact TypeBadge and urgency dot **but no event identity**. These rows are
present, not missing from the feed; desktop gives them more room.

Confirmed root in `src/client/state/timelineContent.ts`: the
`fitTimelineContent()` branch for `Ending soonest` requires the **entire**
measured event identity to fit after game+badge. Otherwise it sets
`identity: 0`, even when some measurable space remains. `By game`
already permits truncated identities. `TimelineLabel.tsx` already renders
nonzero identity budgets with CSS text truncation and ellipsis. Current
`test/timeline-content.test.tsx` asserts this old behavior (e.g.
160px -> 0 identity) and must change with new regression evidence.

This user-requested refinement supersedes the earlier `Ending soonest`
all-or-nothing identity degradation in completed M2. Preserve all other M2
contracts and the high-priority compact TypeBadge accepted after phone smoke.

## Behavior

1. In `Ending soonest`, show full identity and truthful deadline if they
   fit. Known deadline yields first. Event identity comes from ordered
   `recognitionSubjects`, falling back to the official title.
2. If full identity cannot fit, show a **truncated, ellipsized identity**
   where measurable width exists, not game + badge + blank space. Use
   actual measured font/element widths and the visible intersection of the
   event bar with the viewport. Never clip off-row or overflow badges.
3. Keep game text alongside the TypeBadge when the remaining width still
   permits useful identity text. When game text would eliminate a meaningful
   identity fragment, degrade game text before removing the entire title.
   Do not display an ellipsis alone as a substitute for identity. Full game
   remains in the accessible name.
4. Retain high-priority compact TypeBadge until its own measured width
   cannot fit; urgency/conflict indicators stay visible when space permits.
   For genuinely tiny or scrolled-away bar tails, type-only/bare bar
   fallback is valid. No invented shortnames/subject inference.
5. Exact/day-only/unknown-end rendering stays truthful, including dashed
   day-only deadline and compact unknown `?`; preserve full accessibility
   title, deadline and original event title in tooltip/aria-label.
6. `By game`, viewport timestamp preservation/clamping, scroll/zoom/Jump,
   categories, Upcoming, grouping and stable event IDs must not regress.

## Tests and acceptance

Add a regression that fails on the old `Ending soonest` code: a measured
width that can display a truncated identity but currently yields zero.
Test long and short names, recognitionSubjects (one/multiple), official-title
fallback, long/custom game names, known/day/unknown deadlines, tight tails,
and both modes. Ensure the calculated content never exceeds its measured
width budget (including gaps, badges and indicators), for all scales.

Use real Chromium to inspect **320/360/390px** phones and **768/1440px**
desktop, varied zoom and horizontal offsets, both themes, enlarged text,
both timeline modes. Capture screenshots or comparable visual evidence:
event names appear truncated where they fit, never disappear needlessly;
no overlap with status dots, TypeBadge or sticky labels. Run the M2 temporal
viewport browser suite and mobile-header checks.

The parallel task `docs/tasks/UI-POLISH-SMALL-FIXES.md` is currently
separate: Daily Reset attribution, Event Detail Close/Back and Monday
week gridlines. Start this task only after that Work completes/merges.
Do not implement or undo any of its changes.

Before coding: refresh CURRENT `main`, read `AGENTS.md`,
`docs/IMPLEMENTATION-STATUS.md`, completed M2 spec and viewport fix,
this task, and relevant code/tests. Use a fresh short-lived branch.

Run:
```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

Update IMPLEMENTATION-STATUS with results and specific browser evidence.
Open PR/merge/deploy and leave the final real Android/desktop smoke to the
operator. Explicitly disclose any unrun checks or blocked delivery.

No feed, metadata, provenance, source health, Account/Sync, artwork,
calendar geometry, other polish items, S6b or new milestones.

## Implementation evidence

- Started from current main `769c5f4`, after small UI fixes PR #44 had merged
  and its main CI/build/Pages succeeded. PR #45's independent reset-clock
  audit documentation is retained without runtime clock changes.
- The new 160px regression fails on the original fit: expected 83px of useful
  event identity, received zero. It passes with measured partial-title fitting.
- Minimum useful prefix is measured in the actual font, respecting Unicode
  grapheme boundaries. Short complete names fit below that prefix threshold.
  Both modes avoid an ellipsis-only title. Type/unknown semantics retain their
  existing reservation; game text is reclaimed before a useful identity is lost.
- Root-text scaling no longer enlarges inline bar padding beyond the existing
  8px geometry pin. No outer bar, viewport, scroll, zoom or navigation change.
- Reproducible browser runner and visually inspected screenshots:
  [evidence](../evidence/timeline-label-truncation/README.md). Final checks and
  hosted delivery are recorded in IMPLEMENTATION-STATUS and the delivery PR.
- Final Android/PC real-device smoke is explicitly reserved for the operator.
  No other milestone is started.
