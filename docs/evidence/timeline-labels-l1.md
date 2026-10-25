# Timeline labels L1 — local acceptance evidence, 2026-10-25 Moscow

Implementation: [PR #84](https://github.com/maxvfk/game-calendar/pull/84).
Baseline `d16c5676871a07f6801ca26c9cb2e25a23ec69f2`, PR #83; its
[main CI 40143530301](https://github.com/maxvfk/game-calendar/actions/runs/40143530301)
was successful. No new source research or refresh was run.

## Deterministic acceptance

- Bun 1.3.14 frozen install, typecheck and full production build pass.
- `bun test`: **1203 pass / 3 skip / 0 fail**, 1206 tests across 64 files.
  The three existing real-age encryption tests skip on this host because `age`
  is absent. Hosted CI installs it and runs the existing PG17 recovery job.
- Focused label/fingerprint/registry/Timeline semantic/navigation suites:
  **69 pass / 0 fail**. A pinned SHA256 vector fixes canonical bytes.
- Current offline build: **179 events / 7 games**, the pre-existing single NTE
  date conflict retained. Empty registry means no `timelineTitle` in the feed.
  Queue: **72 eligible**, **25 in batch**, **47 remaining**, 107 historical,
  no applied/kept/parked/stale/orphaned decisions. Counts are evaluation-time
  dependent, not a freshness claim about old source observations.
- CLI queue output was generated twice from the same final feed and as-of time;
  both files were byte-identical to the queue emitted by `build:feed`.
- Isolated offline builder test accepts one synthetic matching approval and
  emits its label after merge without moving any event ID. Malformed registry
  fails the build. Synthetic copy is **not** in the production registry.
- Tests cover semantic revision, summary whitespace/NFC, deadlines/304-like
  observation changes, rule-version-only changes, old feeds/custom events,
  winner IDs, completion-key stability, bounded/empty batches, leak/private
  exclusion, conservative day/regional/unknown expiry, historical reintroduction,
  parked/stale/orphaned decisions, proposal rejection and overlapping ambiguity.

## Real Chromium CSS and navigation

The disposable browser fixture uses the production components and built CSS,
rendered in real same-origin iframe viewports at **320/390/1440 px**. It uses
no added browser package, production debug hook or network API. It is not a
physical Android/PC operator pass.

Label matrix passed both modes/themes, 100%/200% root text, 6/32/72/108 px/day,
and now/near-end tail offsets. Cases include approved long/short copy, old M1
subject/title fallback, ordered co-headliners, custom game/event, exact/day/unknown
ends, urgency/conflict and upcoming. Assertions cover badge priority, useful
ellipsis, child gaps/overlap, bar/viewport containment, full canonical accessible
name/tooltip, precision cue, unknown-end honesty and restored deadlines. Label
matrix finished before the navigation portion of the first combined run.

Navigation rerun: **258 checks passed**, both modes and 32/72/108 px/day at all
three widths: initial 20%/25% anchor, game/category filter range changes,
Upcoming, group/split, feed replacement, clock ticks, empty/restore, zoom centre,
closest-edge clamp/re-expansion and explicit Jump. The first runner's fixed
650 ms wait checked smooth-scroll too early in a throttled iframe. Waiting for
the actual target fixed the test; **no runtime navigation change** was needed.
CSS checks likewise wait for scroll/ResizeObserver layout to settle, with a
finite retry bound; no assertion was removed.

Screenshots were visually inspected for approved long-copy ellipsis, short `Si`,
M1 subjects and badge separation on 390px in both modes. Accessible DOM exposes
short and canonical titles, original subjects where different, full type and end
state. Registry application is separately proven by the builder integration test.

Reproduce after the ordinary production build:

```sh
bun scripts/prepare-timeline-label-browser.ts /absolute/disposable/output
```

Serve that output as static files, open its `index.html` in Chromium and press
**Run regression**. `?navigationOnly` runs just the M2 checks. The output is a
test surface only; never add it to production `public/` or the repository.

Final merge SHA, final-head CI and post-merge CI/Pages/public queue verification
are recorded in PR #84's delivery record. Optional final hardware smoke remains
with the operator; no real labels have been approved in L1.
