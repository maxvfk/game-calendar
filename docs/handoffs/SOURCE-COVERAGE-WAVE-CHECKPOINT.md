# SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE checkpoint

WAVE: SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE
MILESTONE: SC-P1-GEN-EXPIRIES
STAGE: CP3
BASE_MAIN_SHA: 97b407c838e8c2cbaf9ec14199f3814835cd978d
BRANCH: fix/gen-expiries
HEAD_SHA: this pushed commit (resolve branch ref)
PR: https://github.com/maxvfk/game-calendar/pull/134
DONE: current main/AGENTS/status/backlog/Genshin audit, parser, reviewed data/tests and source21901 completed work verified; no Starlight reimplementation. PR132/133 CP4 complete. Source21053/21890/21891 freshly fetched via KQM GitHub connector and agrees with actual stored notices.
VERIFICATION: frozen Bun1.3.14 install PASS; typecheck PASS; final full suite PASS(1363pass/3existing age skips/0fail); build PASS. Actual fixed-clock feed253->254, exactly1 new weapon ID, only2 existing precision updates, no removed IDs/changed other winners/date conflicts. Source3 blob SHAs match live. PR/post-merge/Pages/public checks NOT RUN.
REMAINING: narrowly extract exact server ends for two named duration-heading notices and one explicit dated weapon table; preserve existing2 IDs and reviewed precedence; add one distinct weapon-channel ID, no version/phase inference from cadence; reviewed fallback; full validation/release gates.
BLOCKERS: NONE for checked notices. Broad new weapon-name/version/phase discovery remains outside this bounded fix.
OUTCOME_A_DATA: PENDING
OUTCOME_B_PREVENTION: PENDING known duration/table deterministic parser + real-source regressions
CP0_SHA: 2132111381501cd691f929757d497ba28cfb0d62
CP1_SHA: 1d368b8b10ad23e152a7e29c46b0f5568cb4566f
VALIDATION_HISTORY: intermediate CP2 15082ca946556048511e176407a859c91a80d26a recorded full-suite failures; recognition expected subjects updated for new channel; isolated recognition/model-runner rerun50PASS and final full suite1363PASS. No Timeline code changed.
CP2_HEAD_SHA: bcc29efe2ffe6a76f56a2ee1ed8f570a484c01e0
NEXT_CONCRETE_STEP: inspect final-head PR134 CI; require green before expected-head squash merge, then post-merge CI/Pages/public3 winners. Continue CZN-OVERDRIVE only after CP4.

## Exact scope

- genshin:overflowing-favor:2026-10-26 and genshin:carefree-snowball-fight:2026-10-21: Nov2 03:59 server -> AsiaNov1 19:59Z /EuropeNov2 02:59Z /AmericaNov2 08:59Z. Preserve day starts and firstSeenAt (Overflowing from actual public winner2026-10-28T10:59:09.977Z; Carefree2026-09-23T00:08:13.000Z).
- New single weapon title/ID derives from explicitly named featured weapons, not an absent article version/phase field: Epitome Invocation — Azurelight and Symphonist of Scents; startsOct13 day; endsNov3 14:59 server -> Asia06:59Z /Europe13:59Z /America19:59Z. Preserve existing PhaseI ID/title/record.
- SourceURLs https://github.com/KQM-git/GINews/blob/master/archive/{21053,21890,21891}.md. Live blobs74dc17f2e4ef69d58dc0e610e93920567be88cba /3c1e92414c0c2112c8e304545317db4475444123 /f9b1738c1f4e55e285abb5fea2aafeacd52c49db respectively.
- No snapshot/source timestamps changed, no arbitrary tag promotion, no maintenance time guessed. Retain all Starlight and character-wish winners.
- Previous CP4: PR133 merge97b407c, CI/Pages40676242165 SUCCESS; public253 exactMaras and UIWest/Asia verified.
