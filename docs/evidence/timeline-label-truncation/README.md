# Timeline label truncation — Chromium evidence

Automated Chromium 153.0.8010.0 evidence, 2026-10-21 Moscow.
This is not the operator's Android/PC real-device acceptance.

The new regression on unchanged main `769c5f4` fails with identity width
**0 instead of 83 px** at a measured 160 px payload budget. The old fit requires
all 100 px of identity after game 45, badge 20 and two 6 px gaps. The fix uses
the remaining 83 px with CSS ellipsis. A measured three-grapheme prefix plus
ellipsis defines a useful minimum; a shorter complete name can fit below it.
Game text yields when necessary, while type and compact unknown retain priority.
Full game, ordered subjects, original title and exact/day/unknown deadline
remain in the event's accessible name and tooltip.

`check-timeline-label-browser.mjs` verifies production Timeline/TimelineLabel
with real DOM text/badge measurements, real CSS and native horizontal scroll.
Matrix: 320/360/390/768/1440 px; light/dark; 100%/200% root text; both modes;
6/32/72/108 px/day; offsets at now and near/past known ends. Cases include long
official fallback, short Si, single/multiple subjects, day-only and unknown
ends, conflict + urgency, a genuine custom game/event, and an upcoming row.
Checks cover minimum useful identity, game retention/reclamation, badge
priority, every gap/indicator, ellipsis style, child overlap, bar/viewport
containment and complete accessible deadlines. Unknown tails may show only a
badge or marker; truly invisible tails have no visual payload.

A 200%-text check also caught rem-based bar padding disagreeing with the
existing fixed 8px pin/intersection. Bar inline padding now stays 8px, including
with enlarged root text. Outer bar dimensions, date geometry and navigation
are unchanged.

The screenshots below were opened and visually inspected:

| Surface | Evidence |
| --- | --- |
| 320px, dark, Ending soonest | [phone](320-dark-ending-100.png) |
| 360px, light, Ending soonest | [phone](360-light-ending-100.png) |
| 390px, light, By game | [phone](390-light-game-100.png) |
| 320px, light, Ending soonest, 200% text | [enlarged text](320-light-ending-200.png) |
| 768px, light, By game | [desktop](768-light-game-100.png) |
| 1440px, dark, Ending soonest | [desktop](1440-dark-ending-100.png) |
| 320px, minimum zoom, near known ends | [6px/day tails](320-dark-ending-6-tail.png) |
| 320px, maximum zoom, near known ends | [108px/day tails](320-dark-ending-108-tail.png) |

Reproduce after the normal frozen install and build, using externally installed
Playwright/Chromium, without new project dependencies:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium \
LABEL_SCREENSHOTS=/tmp/label-screenshots \
bun scripts/check-timeline-label-browser.mjs
```

Run the existing `check-timeline-browser.mjs` in UTC and America/New_York, then
`check-mobile-header-browser.mjs`, using the same external browser environment.
Final counts and delivery are recorded in IMPLEMENTATION-STATUS and the PR.

**Remaining operator smoke after Pages deploy:** Android Chrome and PC,
both modes, long names at several zooms, horizontal scroll to a short tail,
TypeBadge/indicators and accessible detail titles. Check zoom, filters and
Upcoming still preserve the inspected time subject to existing edge clamping.
