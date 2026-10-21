# Timeline Readability M2 — Preserve temporal viewport through filters / Upcoming

Status: **open — operator-reported manual-smoke regression; implementation and deployed re-smoke pending (2026-10-21).**

Type: bounded M2 bugfix / acceptance follow-up, **not** a new milestone.

References:
- docs/tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md
- docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md (Candidate A′, viewport rules, section 14)
- docs/IMPLEMENTATION-STATUS.md
- AGENTS.md

## Operator observation

The operator manually checked the deployed calendar on both Android phone and PC on 2026-10-21: **changing filters and toggling Upcoming do not preserve the inspected Timeline position.**

This supersedes the earlier provisional phone filter-stability pass recorded in implementation status. The latest operator review reports no other currently identified M2 defects. Do not infer complete acceptance or close M2 before a deployed re-smoke.

## Diagnosis to verify, not assume

CURRENT src/client/components/Timeline.tsx computes boardWindow(starts, ends, now) from plotted rows. Game/category filters and showUpcoming may change the board's min/max. If numeric scrollLeft remains fixed while min changes, the date underneath the viewport shifts although jumpToNow() was not called. A shrinking max may also cause native browser scroll clamping.

test/helpers/timeline-dom.tsx asserts scrollLeft === 900 after data changes; that does not prove temporal stability. Its happy-dom mock cannot model real scroll geometry.

Reproduce and distinguish: changed origin, shortened range, empty/hidden plotted content and other actual causes before selecting the minimal correction.

## Required behavior

- Preserve the **inspected date/time at substantially the same viewport position**, where board geometry permits, on game/category filter changes, Upcoming on/off, By game / Ending soonest changes, split-upcoming changes, feed refreshes and ordinary rerenders.
- If min changes, do not reinterpret unchanged pixel scrollLeft as the same calendar moment. If a shorter range makes the previous anchor impossible, clamp to the nearest feasible position without resetting to today.
- When filtering temporarily hides every row, avoid unintended re-initialization or jumps as content returns.
- Preserve the current initial-open and explicit Jump to today anchors: ~20% phone and ~25% desktop from the left; preserve zoom's inspected centre.
- Avoid effects fighting each other, feedback loops, visible oscillation and clock-tick jumps.

## Acceptance and focused regression tests

1. Add a test that **fails on CURRENT main**: scroll to a date away from today, change filter data so boardWindow.min changes, and assert the timestamp beneath a chosen viewport anchor stays stable. Numeric scrollLeft equality alone is insufficient.
2. Test Upcoming toggling with bounds changes, not only same-min examples; test both modes, game/category filters, multiple zooms, feed replacement, normal rerenders, clock updates, and all rows hidden then restored.
3. Exercise a shrinking max: preserve the inspected date if feasible and assert legitimate native clamping when preservation is impossible.
4. Retain tests for initial mount, explicit Jump to today and zoom anchor; validate viewport behavior in **actual Chromium/CSS layout** as well as mounted React tests, since happy-dom cannot model native scroll clamping.
5. Guard TypeBadge, deadline/unknown semantics, accessibility, IDs, stored preferences, source ingestion and personal data against regressions.

Run all four project checks after implementation:

~~~sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
~~~

## Delivery and manual acceptance

- Start from CURRENT main. Read AGENTS.md, current status, this task and relevant Timeline/navigation code/tests.
- Make one small branch and focused changes, PR/merge, validate hosted CI and Pages delivery.
- Record root cause, changed files, automated tests, deployment and next concrete step in docs/IMPLEMENTATION-STATUS.md.
- After deployment ask the operator to recheck **only** the affected phone + desktop navigation scenarios: scroll away from today, toggle a game filter, event-type filter and Upcoming in both modes; confirm date remains stable whenever representable, and Jump/zoom still work.
- Browser automation is not a real-phone manual pass; **M2 remains open pending explicit operator confirmation**.

Out of scope: new milestones, type grouping, recognition-metadata population, Event Detail/artwork, date precision/source-health/ingestion, Account/Supabase, event IDs, unrelated UI.
