# HSR P0 — recover explicit Version 4.6 Treasures Lightward windows

**State:** bounded implementation task, NOT YET IMPLEMENTED.
**Urgency:** current Memory of Chaos expires 2026-11-02 03:59 **server time**.
**Baseline when drafted:** current `main` 47873f6a5ac0 (2026-10-28).
**Scope:** the four officially dated HSR 4.6 Memory of Chaos / Apocalyptic Shadow / Pure Fiction windows only, plus guard against this exact omission. Other HSR missing event families should be listed for follow-up but not implemented here.

## Confirmed defect and evidence

- In live `data/reviewed/hsr.json` there are 13 records but the only MoC is already expired `Stormcleanse` (Sep 27); existing reviewed PF/AS are also expired.
- The independently captured and freshly confirmed `snapshots/hsr-kqm-hsrnews.md` ALREADY includes the canonical first-party Version 4.6 update notice reproduced as `archive/1437.md`, including all four dated cycles. Snapshot meta: `hsr-kqm-hsrnews.meta.json` last confirmed 2026-10-27 21:23Z, `eventCount: 6`.
- The existing `src/ingest/parsers/kqm-hsrnews.ts` only parses explicitly dated items within `6. New Events`. It toggles `inEvents=false` on `7. Others`. Version 4.6 `Treasures Lightward` is in `7. Others → Gameplay`, and the parser's mode regexp excludes **Memory of Chaos**. This is a confirmed parser coverage bug despite HTTP success; do NOT re-research Game8/Steam or invent a new source.
- Canonical first-party evidence: https://hsr.hoyoverse.com/en-us/news/166468 (same official Version 4.6 notice, also Russian https://hsr.hoyoverse.com/ru-ru/news/166468 ). Capture/extraction mirror: https://github.com/KQM-git/HSRNews/blob/master/archive/1437.md . Keep true extraction origin and independently verified publisher provenance distinct.

## Exact official windows (server-local)

| Mode | Sourced start | Sourced end |
|---|---|---|
| Memory of Chaos: Crossing the Afterlife | After the Version 4.6 update (2026-09-28; **day precision**, do not invent post-maintenance completion) | 2026-11-02 03:59 |
| Apocalyptic Shadow: Dominance of Oblivion | 2026-10-05 04:00 | 2026-11-16 03:59 |
| Pure Fiction: Imagined Words | 2026-10-19 04:00 | 2026-11-30 03:59 |
| Memory of Chaos: Survival of the Fittest | 2026-11-02 04:00 | 2026-12-14 03:59 |

All endings are **server time**, NOT globally fixed UTC+8. Exact UTC values:

| End | Asia UTC+8 | Europe UTC+1 | America UTC−5 |
|---|---|---|---|
| 2026-11-02 03:59 | 2026-11-01T19:59Z | 2026-11-02T02:59Z | 2026-11-02T08:59Z |
| 2026-11-16 03:59 | 2026-11-15T19:59Z | 2026-11-16T02:59Z | 2026-11-16T08:59Z |
| 2026-11-30 03:59 | 2026-11-29T19:59Z | 2026-11-30T02:59Z | 2026-11-30T08:59Z |
| 2026-12-14 03:59 | 2026-12-13T19:59Z | 2026-12-14T02:59Z | 2026-12-14T08:59Z |

## Implementation contract

1. Check CURRENT `main`, `AGENTS.md`, `IMPLEMENTATION-STATUS.md`, `docs/research/coverage-hsr.md`, `docs/research/hsr-recurring-endgame.md`, parser, Lightward monitor, adapter and tests. Confirm not already fixed by concurrent PR.
2. Prefer **minimal deterministic fix** to `kqm-hsrnews.ts`: parse the explicit `Treasures Lightward` section in the actual 4.6 update-notice snapshot, including both MoC phases, without crawling arbitrary `Others` prose or inferring phase durations. Generalize carefully across future version notices only where source structure is supported; fail closed on template changes or missing/contradictory clocks.
3. Preserve independently correct per-boundary server/global semantics, exact per-region `regionEnds`, source URLs, source ID and existing stable event-ID algorithm. `After the Version 4.6 update` is known day only; no guessed start clock. No invented cadence (+42 days), no generic recurrence.
4. Preserve ALL 13 `data/reviewed/hsr.json` records byte-for-byte, including expired MoC/PF/AS historical IDs; new canonical titles/IDs must not duplicate or collide with already published rows. Preserve all other games and unrelated HSR categories/snapshots. No changes to Timeline v1/v2 cutover PR #115 or Source Recovery design PR #113.
5. Regression tests from **actual checked-in 4.6 snapshot** (or bounded factual excerpt with exact article heading and periods), together with prior 4.5 fixture:
   - four 4.6 challenge rows with individual IDs and server-local ends; initial MoC start day precision;
   - true Asia/Europe/America ends, and no 4.5 global end regression;
   - KQM 4.5 parser fixtures and historical reviewed collisions remain unchanged;
   - no duplicate keys; both back-to-back MoC phases distinct; no fabricated additional future phases;
   - fail closed on missing/changed period; consider making a 200-with-old-content coverage warning explicit without causing speculative auto-publication.
6. Prove `bun run build:feed` and `bun run build` from CURRENT checked-in source snapshot produce all four entries and preserve existing feed winners. Fixed-clock check around 2026-10-28 and 2026-11-02. Distinguish parsed candidates, merged winners, and genuinely newly published rows.
7. Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`. New branch → PR → CI → merge → post-merge CI/Pages, and verify live published feed when accessible.
8. Update `docs/IMPLEMENTATION-STATUS.md` with actual counts, source evidence, tests, exact 3-region deadlines, deployment and next concrete step. Report any **other** active Version 4.6 HSR gaps separately for a later coverage audit; DO NOT silently broaden this hotfix to banners, rewards, paid BP or all events.

## Acceptance / operator check

- By region, at minimum the currently active `Memory of Chaos: Crossing the Afterlife` must show the **Nov 2 03:59 server** deadline; AS, PF and next MoC must appear once, with exact source-grounded dates.
- Existing completion keys remain, current/expired phases do not collide, and the existing KQM refresh workflow remains unchanged.
- Operator checks phone/desktop ZZZ/HSR filters and compares HSR MoC deadline with in-game timer when available.
- PR CI success alone != verified production Pages; avoid declaring success until post-merge checks.

**STOP after this HSR P0 fix.** Next separate direction is **HSR 4.6 remaining coverage audit**, then return to Editorial/Source Recovery planning without expanding PR #115 scope.
