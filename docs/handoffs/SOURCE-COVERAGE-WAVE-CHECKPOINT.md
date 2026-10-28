# SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE checkpoint

WAVE: SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE
MILESTONE: SC-P1-CZN-OVERDRIVE
STAGE: CP3 (manually resumed; refreshed baseline validation pending)
BASE_MAIN_SHA: d95e852f3cd9c79739dfd1a41192a2270a9a9a04
BRANCH: fix/czn-overdrive
HEAD_SHA: this PAUSED checkpoint commit (resolve fix/czn-overdrive); prior validated implementation/checkpoint head9945b6c7fffb7579ffcdf0749e28ff560a729fb8
PR: https://github.com/maxvfk/game-calendar/pull/135
DONE: Current main/AGENTS/status/backlog/CZN audit, actual banner-only parser/reviewed data/tests read. PR134 CP4 CI/Pages40678433259 SUCCESS; public254 exact3 winners and browser verified. No existing Overdrive fix PR found.
VERIFICATION: fresh indexed publisher-authored10/21 notice confirms Overdrive Simulation: afterOct21 maintenance toNov3 18:00 UTC, six doubled simulation rewards/day, opportunity reset18:00 UTC. Current public feed has no matching event. One source-backed reviewed Overdrive record and UTC/merge regression tests implemented. Frozen Bun1.3.14 install PASS; typecheck PASS; full tests PASS1366/3existing age skips/0fail; build PASS; feed254->255, one new Overdrive only, no removed/changed old winners or date conflicts. PR/post-merge/Pages/public gates NOT RUN.
REMAINING: validate refreshed baseline, final-head CI, merge and post-merge CI/Pages/public verification.
BLOCKERS: unattended official-event discovery absent (existing source Prydwen is banner-only); do not add a new broad integration/runner probe in this fix.
OUTCOME_A_DATA: PENDING
OUTCOME_B_PREVENTION: BLOCKED CZN-OFFICIAL-EVENT-DISCOVERY (CZN audit C3 access/terms/runner gate; reviewed fallback now)
CP0_SHA: 476e76e30fb19bde9ca30e3eb25a5415309d3d6c
CP1_SHA: 302ebc6bdb96ccb78d667eb5a524098403e6ccab
CP2_HEAD_SHA: a20de97a722158b89c9bb183f10966c4ff83806a
NEXT_CONCRETE_STEP: manually resume by fetching CURRENT main and PR135 head; inspect CI for the final PAUSED checkpoint head (supersedes prior40679410185 if replaced). Merge only after exact-head CI is SUCCESS and main/source baseline remains valid; then require post-merge CI/Pages/public Overdrive255th winner and record CP4. Only afterward start SC-P1-END-CURRENT.

Evidence: https://czn.gg/10-21wed-update-notice/ (STOVE-authored publisher text, attributed secondary host; manual indexed recheck Oct28). Exact source schedule: 10/21/2026 after the maintenance – 11/03/2026 18:00 (UTC). Do not guess an exact maintenance completion timestamp or equate mail06:00 UTC with this18:00 cutoff/reset.
StartsAt2026-10-21T00:00:00.000Z/day, endsAt2026-11-03T18:00:00.000Z/exact, global (regionScopedfalse). Real new discovery/review time only. Preserve all29 existing CZN reviewed rows, gifts and Daily Reset/Sync.
Previous released: PR130 Starlight;132 CZN gifts;133 Maras;134 Genshin expiries. Next after CP4: SC-P1-END-CURRENT.

## Manual resume 2026-10-28

User explicitly resumed the wave. CURRENT main f92e3733c434b99e544f636df39548f759f15a51 contains only automated snapshot refresh since d95. All refreshed files retained. Prior final-head CI40679572945 SUCCESS (all required jobs). New combined-head validation/CI required after baseline refresh; CP4 NOT RUN. Prior local CP2 remains evidence for original inputs, not a claim for refreshed inputs. Next: validate combined tree, exact-head CI, merge and verify Pages/public Overdrive.

Refreshed-baseline CP2 PASS: frozen install, typecheck, full1366pass/3skip/0fail, build; fixed-clock feed254->255 only Overdrive addition, every old winner and dateConflict identical. Final combined-head CI pending.
