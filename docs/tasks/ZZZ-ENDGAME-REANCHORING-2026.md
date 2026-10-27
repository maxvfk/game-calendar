# ZZZ P0 follow-up — Shiyu Defense and Deadly Assault current endgame re-anchoring

**Priority: urgent coverage gap (Shiyu 2026-10-30 deadline). State: IMPLEMENTED; delivery verification recorded in the implementation PR.**
**Scope: two rotating endgame modes only.** This is independently bounded from
`docs/tasks/ZZZ-BANNER-SOURCE-RECOVERY.md`, Steam events-only #109, and Editorial E2b.

## Existing confirmed situation

- Current `main` at task creation: `46f1d2e`. ZZZ Steam E1 #109 is merged and
  working for limited-time patch events; it intentionally does not emit endgame rotations.
- `data/reviewed/zzz.json` has 30 reviewed entries, including only **expired**
  `Shiyu Defense: Critical Node (Sep 18)` and `Deadly Assault (Sep 11)`
  with exact Asia/Europe/America ends, estimated provenance, and preexisting stable IDs.
- `docs/research/zzz-recurring-endgame.md` (2026-09-24) proved the **January 2025
  14-day anchors were seven days out of phase** with September 2026. It deliberately
  prohibited projection pending a verified newer effective rule. Do not repeat
  its broad research or activate the obsolete anchors.
- `src/ingest/recurring-endgame.ts` already implements `ResetRule`,
  `fixedResetCycles`, `recurringEndgame`, a bounded horizon and exact region ends.
  Inspect its use in `scripts/build-feed.ts` and existing tests before making
  minimal ZZZ-specific changes.

## Fresh evidence candidates (27 October 2026)

**First-party, directly sourced (strong):**
- HoYoverse Version 2.5 update notice:
  https://zenless.hoyoverse.com/en-us/news/161728
  Explicitly ends transitional **Shiyu Critical Node Phase I at
  2026-01-09 03:59 server time**; subsequent Phase II/III each run 14 days.
- Official Version 1.4 historical rule: https://www.hoyolab.com/article/35654082
  This explains the historic 14-day Friday 04:00 clocks but **not** the active phase.
- Version 2.4 Shiyu correction, currently visible in a reproduced update notice:
  https://zenless.gg/version-2-4-on-the-precipice-of-the-abyss-update-details/
  The Phase II deadline was amended from 2026-01-02 03:59 to 2025-12-29 14:59.
  This is a **secondary-hosted copy** until matched to the direct official notice.

**Independent secondary/archival observations, NOT official reset-rule proof:**
- Shiyu Jan 9–23: https://zenless-zone-zero.fandom.com/wiki/Shiyu_Defense/Critical_Node/2026-01-09
- Shiyu Jan 23–Feb 6:
  https://zenless-zone-zero.fandom.com/wiki/Shiyu_Defense/Critical_Node/2026-01-23
- Shiyu resets Sep 18, Oct 2, Oct 16, next Oct 30:
  https://www.icy-veins.com/zenless-zone-zero/shiyu-defense-critical-node
- Deadly Jan 16–30 (archival, independent of old January 2025 anchor):
  https://zenless-zone-zero.fandom.com/wiki/Deadly_Assault/2026-01-16
- Current live countdown/estimated resets: Shiyu Fri Oct 30, Deadly Fri Nov 6:
  https://hoyobuild.com/en/zzz/tools/timers

**Candidate current cycles requiring Gate A corroboration, server local:**
- Shiyu: 2026-10-16 04:00 → 2026-10-30 03:59.
- Deadly Assault: 2026-10-23 04:00 → 2026-11-06 03:59.
- Subsequent 14-day cycles are **projections**, not individually announced notices.
  Evidence for Deadly's **current effective anchor** is weaker than Shiyu's:
  do not present the observed Jan 16 date as an official first-party anchor.
- ZZZ server-local offsets are Asia UTC+8, Europe UTC+1, America UTC−5 (fixed
  game-server offsets, not viewer time/DST).

## Gate A — corroborate effective rules per mode BEFORE enabling generation

1. From current `main`, read `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`,
   the 2026-09-24 recurring research, reviewed rows and existing
   recurring/feed/merge/region code and tests. Confirm no parallel re-anchoring.
2. Inspect the **specific** 2.4/2.5 change, preferably direct official evidence,
   and determine when the new Shiyu rule took effect; reconstruct Jan→Sep→Oct
   dates with arithmetic and independently dated cycles. Distinguish the
   publisher's stated 14-day duration from verified current anchoring.
3. Independently establish **Deadly Assault's** currently operative phase/anchor
   with dated official/in-game or sufficiently strong corroborated observational
   evidence. Explicitly compare against Sep 11 / Sep 25 and Oct 23 / Nov 6;
   explain why the old Jan 2025 rule is no longer valid. An alternating mode
   assumption by itself is not enough for an `official` provenance claim.
4. Look for newer schedule exceptions since Version 2.5 and contradictions.
   Treat countdown planners, wiki, calendar previews and inferred dates as
   secondary/estimates. No undocumented APIs/access-bypass required.
5. Store concise per-mode evidence, source URLs, check dates, effectiveFrom,
   provenance and unknowns in `docs/research/` or `docs/evidence/`.
   **Gate A is per mode:** if one mode is unproven, continue with the proved mode,
   but do NOT generate the unproved mode. Consider a finite explicitly sourced
   reviewed current row only if its exact dates can truly be corroborated.

## Gate B — bounded implementation ONLY for verified mode(s)

1. Prefer the existing `ResetRule` / `fixedResetCycles` / `recurringEndgame`
   and feed merge path. Add effective-dated **new** ZZZ rules; do not project
   obsolete January 2025 anchors or affect WuWa/Genshin/CZN recurring systems.
   No additional network scheduler and no Steam parser changes.
2. Produce **separate current and near-future rotations** with a bounded
   horizon (existing 70 days unless a concrete product need dictates otherwise).
   The ongoing Oct 16 Shiyu cycle must not disappear merely because its start
   precedes the generator's 7-day lookback; inclusion is deadline-aware.
3. Preserve reset semantics: server time 04:00, **inclusive 03:59** before
   the next Friday reset; explicit Asia/Europe/America `regionEnds` with
   `endPrecision: exact`. Preserve the existing schema's honest day-precision
   representation of server-local starts, never pretend one global start instant.
4. Preserve all original reviewed records, especially September Shiyu/Deadly
   IDs, dates, source URLs, precision and user-completion keys. Use stable,
   cycle-specific titles/IDs for newly generated rows; avoid overlap/double
   publication with reviewed rows, and keep official vs estimated provenance
   explicit. No evidence laundering from a secondary page to an official URL.
5. Keep source conflicts visible and fail closed for materially contradictory
   sourced cycles. Rule change can supersede from a documented effective date
   without retroactively shifting historical rows. Do not let unverified
   recurrence make the unrelated ZZZ source-health status look fresh.
6. Minimum fixed-clock regression cases:
   - 2025 official historical anchors are seven days off the 2026 observed phase;
   - Jan 9/Jan 23 Shiyu transition and Sep 18/Oct 2/Oct 16/Oct 30 chronology;
   - Deadly Jan 16, Sep 11, Oct 23, Nov 6 only if Gate A passes;
   - exact three-region ends (including Oct 30 and Nov 6);
   - current-active + upcoming cycles, 70-day bound and year rollover;
   - no duplicate events or broken completion IDs; all 30 reviewed rows unchanged;
   - effective-date override and contradiction/freeze; no speculative modes;
   - byte-identical unrelated-game feed and preserved ZZZ event/banner winners.
7. Verify real static `build:feed` → site build and published feed content
   after merge. Unlike source ingestion, a deterministic recurring rule needs
   **no new network refresh**; proof is current-main generated feed, CI/Pages,
   and ideally operator phone/desktop smoke of upcoming deadline boundaries.
8. Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`,
   `bun run build`. Use short branch, small commits, PR/CI/merge,
   post-merge CI/Pages. Update `docs/IMPLEMENTATION-STATUS.md` with evidence,
   exact published counts, blocked mode(s) and **Next concrete step**.

## Scope and stop rules

**In scope:** Shiyu Critical Node and Deadly Assault re-anchoring, bounded
verified recurrence, and current-cycle reviewed fallback when source evidence
supports it. Implementation must not be declared complete for an unverified mode.

**Out of scope:** Phase/Frontier enemy lineups, Shiyu score/team recommendations,
Periodic Conquest, Threshold Simulation Hard Mode, Annihilation Simulacrum,
banner source B1, ZZZ Steam source E1, Daily Reset changes, Timeline v2,
Event Context E2b–E4, Account/Sync, and other games' schedules.

**Stop after this milestone.** B1 banner recovery remains the next separate
high-priority ZZZ direction; do not start it automatically.

## Implementation result — 2026-10-27

Delivery: [PR #111](https://github.com/maxvfk/game-calendar/pull/111).

Both per-mode evidence gates passed within their stated provenance limits;
no blocked mode and no finite reviewed fallback was needed. Evidence and unknowns:
`docs/research/zzz-endgame-reanchoring-2026.md`. Shiyu uses the official January 9
post-transition anchor with an October 16 production gate; Deadly uses the
independently corroborated January 16 observational anchor with an October 23 gate.
All generated rows remain estimated projections. The official Deadly phase-change
notice, July secondary Shiyu anomaly and fresh in-game capture remain unavailable.

Existing recurring engine now emits 12 current/future rows, with exact regional
inclusive ends, stable IDs, sourced override/conflict freezes and a 70-day start
horizon. All 30 reviewed rows and 217 previous full-feed winners are unchanged;
ZZZ 54→66, whole feed 217→229. Machine-readable fixed-clock proof:
`docs/evidence/zzz-endgame-feed-replay-2026-10-27.json`. Validation and delivery
are tracked in `docs/IMPLEMENTATION-STATUS.md` and the implementation PR.

Operator phone/in-game smoke is still outstanding. Next concrete step is Banner
Recovery B1 in a separate Work; this task does not authorize starting it.
