# SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE checkpoint

WAVE: SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE
MILESTONE: SC-P0-END-MARAS
STAGE: CP1
BASE_MAIN_SHA: 473729f70ec0d879a1604424676112bdfef92058
BRANCH: fix/end-maras
HEAD_SHA: this pushed checkpoint commit (resolve branch ref)
PR: NONE
DONE: Current main/AGENTS/status/wave/backlog/Endfield audit, actual wiki snapshot/parser, reviewed data and merge/tests read. PR130 and PR132 fully released; PR132 CP4 CI40674871392/public253 events verified. No existing Maras fix PR found.
VERIFICATION: actual published winner has wiki ends Nov4 22:00Z Asia /Nov5 22:00Z West; official9560 re-read Oct28 states Nov5 04:00 server. Implementation committed: same-ID official reviewed winner plus only-the-known-clock-pair reconciliation in merge.ts; regression tests added. Full validation/CI NOT RUN.
REMAINING: add same-ID official reviewed correction; narrowly reconcile only the known wiki disagreement without disabling future conflict detection; test boundaries/IDs/precedence; all local and release gates.
BLOCKERS: NONE for current correction. General official unattended discovery remains separate Endfield audit A3 gate.
OUTCOME_A_DATA: PENDING
OUTCOME_B_PREVENTION: PENDING narrow evidence-specific reconciliation + strict unknown-disagreement regression; no broad official adapter claimed.
CP0_SHA: 449975192715b0e3803bd3de0c6af8b4f17192d5
NEXT_CONCRETE_STEP: run frozen install/typecheck/full tests/build and actual feed comparison; known discrepancy must not add an unresolved conflict, unknown one-minute discrepancies must still conflict.

## Exact evidence and intended identity

Official source https://endfield.gryphline.com/en-us/news/9560, Umbral Monument section: Oct22,2026 12:00 to Nov5,2026 04:00(server time). Source defines Asia UTC+8, Americas/Europe UTC-5.
ID: endfield:monumental-etching-forest-of-maras:2026-10-22
Preserve observed startsAt2026-10-22T04:00:00.000Z/exact and firstSeenAt2026-10-28T10:48:37.273Z from the independently downloaded pre-fix production feed.
Correct regional ends: Asia2026-11-04T20:00:00.000Z; Americas/Europe2026-11-05T09:00:00.000Z.
Known rejected wiki ends: Asia2026-11-04T22:00:00.000Z; Americas/Europe2026-11-05T22:00:00.000Z.
Accept only this reviewed-official/source-ID/URL/identity/clock pair. Any new timestamp discrepancy must remain a conflict; preserve raw wiki bytes and no global timezone patch.

Previous CP4: https://github.com/maxvfk/game-calendar/pull/132
Next eligible after this release: SC-P1-GEN-EXPIRIES, current main/source recheck required.
