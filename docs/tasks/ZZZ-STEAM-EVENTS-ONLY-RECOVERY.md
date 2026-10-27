# ZZZ E1 — Official Steam events-only unattended recovery

**Priority: P0 continuation. State: COMPLETE — events only (2026-10-27), PR #109.**

Real integrated Actions refresh: [40426199820](https://github.com/maxvfk/game-calendar/actions/runs/40426199820).
43 parsed candidates, 19 reviewed exact-ID overlaps, 54 unique ZZZ feed rows;
all 30 reviewed records unchanged. Source/validation/delivery evidence:
`docs/evidence/zzz-steam-events-recovery.md`. Banners remain a separate task.
The implementation contract below is retained for audit.

**Prerequisites:** merged ZZZ hotfix #105, P0 Gate A blocked-but-partial #107. Read `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/tasks/ZZZ-SOURCE-RECOVERY-P0.md`, `docs/research/zzz-source-recovery-p0.md`, `docs/NTE-STEAM.md`, relevant source health, merge, snapshots and test code on **current** `main`. Check that equivalent work was not merged in parallel.

## Rationale and scope

The full events+banners P0 Gate A failed **because content for dated channels is missing**, not because Steam is inaccessible. Actual GitHub Actions captured allowed Steam Community RSS (`https://steamcommunity.com/games/4162040/rss/`) and published Version 3.3 update content with all **eight independently dated event periods**, discoverable without hard-coded article IDs. Phase channel notices and four banner deadlines are **not** in that publisher distribution. There are presently zero automatic ZZZ sources; `zzz-game8-events` must remain disabled.

Restore unattended **limited-time event** discovery, capture and feed ingestion from this proved official publisher distribution. This is **partial source recovery**, not resolution of dated banner automation. Do not delay this milestone for the banner problem. Banner follow-up is `docs/tasks/ZZZ-BANNER-SOURCE-RECOVERY.md`, which remains prioritized ahead of Timeline v2/E2b summaries.

## Implementation contract

1. Start from fresh `main`, use a short-lived branch. Select a **single compliant documented/public surface**, preferably the already verified Steam Community RSS (normal robots rules), and the project's 6-hour minimum request interval. Do not casually widen the special NTE Steam API allowlist or use undocumented endpoints, browser impersonation or access-control bypass. If the current runner no longer delivers the proved feed, record a real blocker and stop rather than fixture-only success.
2. Integrate with existing `SourceParser`, `ADAPTERS`, `SnapshotStore`, `RobotsCache`, `mergeEvents`, sanitization and source-health conventions. Use normal refresh scheduling; no extra scheduler. Choose a stable source ID distinct from `zzz-game8-events`; Game8 remains disabled.
3. Detect newly published version-update notices by **feed discovery**, not a fixed Version 3.3 ID. Parse bounded event-local sections and period fields. Distinguish headlines from unrelated notices and previews, enforce version/year provenance, explicit start/end precision and server-local region mapping; do not infer maintenance completion or dates/years from historical cadence.
4. Emit only actually grounded event records. **No channel/banner or trial entries** may be generated using patch duration or assumed phase clocks. Parse bounded, independently attributable event sections, not one giant '3.3 event' record.
5. Preserve **all 30 reviewed ZZZ records byte-for-byte**, their IDs, official source URLs, review timestamps and existing winning precedence. Preserve current source snapshots, unrelated games and semantic IDs. Prove that collisions between a Steam event and a reviewed #105 event do not yield duplicate published winners or change existing `localStorage` IDs. If matching is not robust, fail closed/report conflict; do not manufacture matches by title/date guesses.
6. Outage, parser-zero, template drift, unexpected sharp drop and last-known-good must use existing fail-safe behavior. The captured Steam author identity and per-event publication URL must be precise; avoid laundering the Steam URL into an unverified direct HoYoverse article URL.
7. Tests must exercise actual captured RSS/XML or independently captured compliant fixtures (respect copyright), discovery across at least **two different versions** (e.g. 3.2 and 3.3), individual event boundaries, region/date precision, no banners generated, reviewed overlap/priority/IDs, zero/drift/LKG, plus no impact on unrelated feed. A synthetic newly published notice may supplement, not replace, real fixture tests.
8. Prove **one real GitHub Actions runner refresh** of the integrated source with non-empty parsed ZZZ event results, successful full feed/CI, and verifiable dynamic URL discovery. Distinguish parsed candidates from unique newly published rows because reviewed records may supersede them. Do not call CI/build success alone an ingestion proof.

## Delivery and acceptance

- Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`. Inspect any repo-specific integration checks and keep PG17/Pages green.
- Report source/access permissions, discovered articles and event count, raw→normalized→merged coverage, before/after ZZZ calendar winners, IDs/duplicates and exact precision, health/outage behavior and real runner run URL.
- PR → CI → merge → post-merge CI/Pages; update `docs/IMPLEMENTATION-STATUS.md` with actual work and next concrete step.
- **Do not claim full ZZZ P0 complete**: banners remain reviewed-only until the separate evidence-gated banner milestone succeeds.

**Out of scope:** banner discovery/ingestion, speculative Phase II, recurring Shiyu/Deadly anchors, Timeline label M4/v1/v2, E2b–E4 summary, Account/Sync, and other game adapters. STOP after this implementation milestone.
