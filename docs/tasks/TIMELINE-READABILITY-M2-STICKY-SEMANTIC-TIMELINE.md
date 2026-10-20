# Timeline Readability M2 — Sticky Semantic Timeline

Status: **M2 phone-smoke follow-up implemented and automatically validated 2026-10-21: high-priority compact type + shared category colours. Remaining manual phone/desktop smoke stays open; M2 is not complete. See `docs/IMPLEMENTATION-STATUS.md`.**

Type: bounded implementation milestone  
Depends on:
- completed `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`
- merged `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`

## Start instruction

Continue `maxvfk/game-calendar` from the CURRENT `main`.

This is **Timeline Readability implementation milestone M2: Sticky semantic Timeline**.

Prerequisites:

- Account/User S6a is complete and the coordinating project chat has cleared Timeline work; S6b is separate/non-blocking;
- Timeline Readability M1 — Recognition Metadata Contract has been merged;
- `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md` remains the authoritative UX specification.

Before making changes:

- verify CURRENT `main`;
- read `AGENTS.md`;
- read `docs/IMPLEMENTATION-STATUS.md`;
- read the completed `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`, especially the final Candidate A′ specification;
- inspect current `Timeline.tsx`, `lanes.ts`, `zoom.ts`, `TypeBadge.tsx`, relevant preferences/state and current Timeline tests;
- verify the merged `recognitionSubjects` contract from M1.

Use a fresh short-lived branch from CURRENT `main`.

## Goal

Implement the accepted **Candidate A′ — Sticky semantic bars**.

Do not reopen the broad UX research unless current code exposes a concrete contradiction.

## Sticky bar semantics

Recognition identity and truthful end state must live in readable sticky bar content rather than only at the physical start/end edges.

Use:

`recognitionSubjects -> title fallback`

according to the accepted M1 contract.

Do not heuristically derive recognition subjects.

Preserve existing lifecycle, precision, conflict, completion and urgency semantics.

## Deadline semantics

Implement the accepted rules.

Known end:

```text
→ Oct 21
```

Day-precision end:

- same compact date;
- visible non-colour precision cue;
- accessible `end date only`;
- no invented clock time.

Unknown end:

- `end unknown` when space permits;
- compact `?` when necessary;
- accessible `End unknown`;
- never fabricate a date.

Do not add always-on exact clock time.

Do not add normal start→end text ranges.

## Mode-specific degradation

**Phone-smoke amendment — 2026-10-21:** the operator requires high visual type
priority and category colours. The following rules supersede the type-first
removal rules in the original final UX research specification (sections 2, 7
and 10) and the initial M2 implementation. All other accepted M2 behavior stays
in force. This is a bounded M2 follow-up, not a new milestone.

Do not use one universal content hierarchy.

For `By game`, known end:

```text
[type] identity · deadline
→ [type] identity
→ [type] truncated identity
→ [type]
→ bare bar
```

For `By game`, unknown end, preserve unknown-end semantics longer than a normal known-deadline token.

For `Ending soonest`, known end:

```text
game · [type] identity · deadline
→ game · [type] identity
→ game · [type]
→ [type]
→ bare bar
```

The queue ordering already communicates deadline priority. A known date yields
first; identity and then game yield before the compact type badge.

For unknown ends, prefer type + compact `?` before allocating space to names.
At the type-only limit the visual unknown token may yield, but `End unknown`
must always remain in the accessible name. Below the badge's own measured width,
`?` may remain alone if it fits. Never fabricate a deadline.

Do not reduce the existing `MIN_BAR` merely to fit text.

Keep bars one line high.

Use measured available space or an equivalently robust fit strategy rather than one desktop-centric fixed threshold.

## Type semantics and accessibility

The visual compact `TypeBadge` must survive until its own measured width cannot
fit in the available payload budget. It must never be truncated to fit.

However, event type must remain available in the accessible event name / sr-only semantics.

At the absolute minimum or a nearly scrolled-away tail, a badge may still be
impossible to fit; full event meaning must remain accessible there.

Use the shared `TypeBadge` for stable category colours in Timeline, EventRow,
NextUp and EventDetail. Colour is supplementary to text and accessible labels.

| Category | Stable hue |
| --- | --- |
| Banner | Violet |
| Event | Cyan |
| Challenge | Orange |
| Login | Green |
| Shop | Pink |
| Maintenance | Slate |

Provide readable light/dark variants. Keep game hues and urgency colours
independent. `story` / `rerun` / `other` continue mapping to Event. Do not change
layout/degradation outside Timeline.

Accessible semantics must preserve, where applicable:

- game;
- event type;
- recognition identity or title fallback;
- end date or `End unknown`;
- `end date only`;
- upcoming/not-started state;
- conflict/disputed state.

Visual truncation must not truncate accessible meaning.

Do not rely only on hue, hover, physical edges or a bare `?`.

## Viewport initialization

Change Timeline navigation from centered-today behavior to future-biased current-moment behavior.

Anchor **`x(now)`**, not local-day start.

Targets:

- phone / below `lg`: current moment ~20% from the left;
- desktop / `lg` and above: current moment ~25% from the left.

Apply this anchor only:

- when Timeline is initially opened/mounted;
- when the user explicitly presses `Jump to today`.

Do not re-anchor because of:

- game filter changes;
- event-type filter changes;
- `By game` / `Ending soonest` changes;
- show/hide upcoming;
- feed/source refresh;
- ordinary rerender;
- clock ticks.

Zoom must continue preserving the moment currently being inspected.

If the board range changes and the old scroll offset becomes invalid, ordinary clamping is acceptable; do not treat it as a request to jump to today.

## Grouping

Do not add:

- event-type category bands;
- category subheadings;
- a grouping preference;
- type-based reordering.

Preserve:

- one lane per game in `By game`;
- deadline queue semantics in `Ending soonest`;
- current event-type filter behavior.

Dense same-game lanes should be evaluated during smoke rather than preemptively redesigned.

## Compatibility

Preserve:

- event IDs;
- completion state;
- local profile state;
- export/import;
- Account Sync behavior;
- old cached feeds;
- custom events;
- current Timeline zoom preference;
- source/provenance/conflict semantics.

No user-data/Supabase migration belongs in this milestone.

## Tests and smoke

Add focused automated tests where practical for:

- recognition/title fallback rendering;
- exact/day/unknown deadline semantics;
- mode-specific degradation helpers;
- high-priority compact type through narrow/type-only/bare stages in both modes;
- unknown-end compact/accessibility behavior alongside the high-priority type;
- stable shared category colour mapping and text semantics independent of colour;
- accessible semantics when visual TypeBadge disappears;
- initial future-biased anchor;
- `Jump to today`;
- no unintended re-jump after filters/group/upcoming changes;
- zoom anchor preservation.

Run:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

Then perform the manual phone + desktop smoke matrix defined in the final section of `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`.

Pay particular attention on a real phone to:

- long running event whose physical end is off-screen;
- narrow bars;
- exact/day/unknown ends;
- `By game`;
- `Ending soonest`;
- filter/group/upcoming changes without viewport reset;
- zoom;
- explicit `Jump to today`;
- dense seven-game configuration.

## Documentation

Update `docs/IMPLEMENTATION-STATUS.md` with:

- implementation summary;
- automated validation results;
- manual smoke results;
- any divergence from the UX spec and why;
- unresolved concrete failure modes, if any.

Do not mark the milestone complete if the required phone smoke has not been performed; explicitly record any remaining manual gate.

## Out of scope

Do not:

- add type grouping;
- redesign Event Details;
- implement artwork;
- broaden recognition-metadata research;
- change Account/User database schema;
- add realtime sync;
- refactor unrelated Timeline code merely for cleanliness.

Finish after M2 implementation, validation, documentation and required smoke.
