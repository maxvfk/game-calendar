# SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE checkpoint

WAVE: SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE
MILESTONE: SC-P0-CZN-GIFTS
STAGE: CP2
BASE_MAIN_SHA: 67144c229b80e58057b9ebfc761498f0f0e9dfdf
BRANCH: fix/czn-gifts
HEAD_SHA: this pushed checkpoint commit (resolve the branch ref)
PR: NONE
LAST_VERIFIED_CP0_SHA: 6ea8a952299572f5c47c5d0656a07dfb8cef6ce0
DONE: Current main/AGENTS/status/wave/backlog/CZN audit, reviewed data, banner-only parser/tests read. PR130 verified merged/released; no duplicate recovery PR found among recent PRs.
VERIFICATION: source notice rechecked in indexed publisher-authored STOVE mirror; current public feed download and fixed-clock baseline build started. CP1 implementation pushed fb036cd8389f5201409600035ab7cb7605bff764. bun install --frozen-lockfile PASS; bun run typecheck PASS; bun test PASS (1356 pass,3 existing age skips,0 fail); bun run build PASS. Fixed-clock actual feed245->253, exactly8 additions, all prior winners and date conflicts unchanged. PR CI/post-merge/Pages/public checks NOT RUN. Initial targeted test used generic dayStartMs incorrectly; fixed assertion to existing dedicated cznDayStart; full suite now passes.
REMAINING: add eight reviewed mail claim windows and source-backed expiry/merge tests, then frozen install/typecheck/full tests/build/feed comparison, PR/CI/merge/Pages/public validation.
BLOCKERS: direct CZN.gg fetch returned403; search index exposes complete announced date table and Source: STOVE attribution. No compliant unattended STOVE adapter is established; no new access probe is authorized.
OUTCOME_A_DATA: PENDING
OUTCOME_B_PREVENTION: BLOCKED CZN-OFFICIAL-MAIL-DISCOVERY (CZN audit C3: publisher index/terms/runner gate; reviewed fallback now)
NEXT_CONCRETE_STEP: create the bounded CZN gift PR, add its URL to status/backlog/checkpoint, require green exact-head CI before merge.

## Source and exact scope

Notice: https://czn.gg/event-1st-anniversary-celebration-daily-login-rewards-event/
Publisher-authored text attributed to STOVE; Updated Oct21,2026. Full table independently re-read via web search Oct28. This is manual secondary-host evidence, not an official-domain fetch or unattended discovery proof. No source publication/confirmation timestamp will be invented.

- Delivery daily06:00 UTC, Oct21-Nov3. Each ordinary claim table ends next day05:59 UTC.
- Oct21 Rossweisse's Celebration sticker and Oct28 Night Palace background: Nov30 14:59 UTC.
- Include two still-claimable exceptions and six dated ordinary windows Oct29-Nov3; no extra parent or duplicate Oct28 ordinary gift.
- Intended IDs: czn:anniversary-mail-gift:2026-10-29 through :2026-11-03; czn:anniversary-sticker-gift:2026-10-21; czn:anniversary-background-gift:2026-10-28.
- All clocks global UTC; standing18:00 UTC Daily Reset and Sync untouched. New firstSeenAt/reviewedAt use actual review time, never delivery dates.
- Earlier ordinary Oct22-Oct27 mail claims already expired at launch and are excluded as historical backfill.
