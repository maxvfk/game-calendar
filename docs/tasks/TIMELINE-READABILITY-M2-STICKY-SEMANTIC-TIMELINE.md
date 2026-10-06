# Timeline Readability M2 — Sticky Semantic Timeline

Status: **deferred — do not start until Account/User S6 work is complete or explicitly cleared, and M1 is merged**  
Type: bounded implementation milestone  
Depends on:
- completed `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`
- merged `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`

## Start instruction

Continue `maxvfk/game-calendar` from the CURRENT `main`.

This is **Timeline Readability implementation milestone M2: Sticky semantic Timeline**.

Prerequisites:

- Account/User database work currently ahead of this milestone has been completed or explicitly cleared by the coordinating project chat;
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

Do not use one universal content hierarchy.

For `By game`, known end:

```text
[type] identity · deadline
→ identity · deadline
→ identity
→ truncated identity
→ bare bar
```

For `By game`, unknown end, preserve unknown-end semantics longer than a normal known-deadline token.

For `Ending soonest`, known end:

```text
game · [type] identity · deadline
→ game · identity · deadline
→ game · identity
→ game · truncated identity
→ compact/truncated game
```

The queue ordering already communicates deadline priority, so on narrow bars preserve game + identity before repeating a known date.

Unknown-end semantics must remain explicit for as long as practical.

Do not reduce the existing `MIN_BAR` merely to fit text.

Keep bars one line high.

Use measured available space or an equivalently robust fit strategy rather than one desktop-centric fixed threshold.

## Type semantics and accessibility

The visual `TypeBadge` may disappear first when space is constrained.

However, event type must remain available in the accessible event name / sr-only semantics.

Update the existing `TypeBadge`/Timeline assumptions and tests that currently imply a visible badge on every narrow bar.

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
