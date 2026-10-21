# Small UI fixes — Chromium evidence, 2026-10-21

Automated browser evidence, **not** operator real-device acceptance.
All screenshots below were opened and visually inspected. The deterministic
Timeline fixture is on Tuesday 2026-10-20; its stronger line immediately before
Monday 19 contrasts with ordinary daily lines and the red TODAY marker.
The App fixture uses 2026-11-01 and three games to exercise mixed reset clocks.

| Surface | Screenshot |
| --- | --- |
| Mixed reset group, 320px | [Dailies](dailies-320.png) |
| Close remains visible after scrolling, 320px | [Event Detail](detail-320.png) |
| Phone, dark, By game, 72px/day | [Timeline](week-320-dark-game-72.png) |
| Phone, light, Ending soonest, 72px/day | [Timeline](week-320-light-ending-72.png) |
| Desktop, dark, Ending soonest, 72px/day | [Timeline](week-1440-dark-ending-72.png) |
| Desktop, light, By game, 72px/day | [Timeline](week-1440-light-game-72.png) |
| Phone, minimum zoom, dark | [6px/day](week-320-dark-ending-6.png) |
| Phone, maximum zoom, light | [108px/day](week-320-light-game-108.png) |
| Desktop, minimum zoom, light | [6px/day](week-1440-light-ending-6.png) |
| Desktop, maximum zoom, dark | [108px/day](week-1440-dark-game-108.png) |

Reproduce after `bun run build`, using the external Playwright setup documented
in the existing Timeline/mobile-header runners (no new project dependency):

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium \
UI_POLISH_SCREENSHOTS=/tmp/ui-polish-screenshots \
bun scripts/check-ui-small-fixes-browser.mjs
```

Verified with Chromium 153.0.8010.0: **61364 assertions**, most checking each
daily grid cell across the rendering matrix. Full App checks at 320/390/1440px
cover both opening views, Close/Back/Escape/backdrop, focus, repeated cycles,
stale Forward, reload, deletion, profile remounts, filters/account disclosure
and preserved scroll. Native-history cases additionally cover rapid replacement/
reopening, foreign object/primitive state, query/hash/base path, foreign entries,
and a URL cleanup preserving history.state (the existing OAuth cleanup pattern).
No real OAuth credentials or account data were used.

Grid matrix: 320/1440px, By game/Ending soonest, dark/light, 6/32/72/108px per
day, UTC/America_New_York/Europe_Berlin. Spring/fall DST checks use each zone's
actual transition dates. Placement, width, non-Monday lines, unchanged cell
geometry, pointer-events and decorative stacking below TODAY are asserted.

Existing runners also passed unchanged: Timeline **372** assertions in each of
UTC and America/New_York; mobile header/filter **441** assertions. A first UTC
run missed the existing 600ms smooth-scroll deadline during concurrent load;
the standalone repeat passed. Plain `bun test` passed once (1107 pass / 1
optional skip), but later runs hit existing Supabase setup / backup retention
timeouts. The final complete suite passed with
`TMPDIR=/dev/shm/game-calendar-tests bun test` (RAM-backed temporary files,
1107 pass / 1 optional skip). No test timeout, assertion, configuration or runtime
navigation was changed to accommodate these environment-sensitive timings.

**Remaining operator smoke after Pages deploy:** on Android Chrome and PC,
open details from Checklist/Timeline, use Close and Back then normal Back;
check mixed reset attribution and daily/Monday/TODAY contrast in both modes,
themes and zoom extremes. Retain M2's legitimate nearest-edge clamping.
