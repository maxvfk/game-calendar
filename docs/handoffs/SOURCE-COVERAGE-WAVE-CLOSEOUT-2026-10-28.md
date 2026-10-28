# Current-data recovery wave — verified closeout

**Status: COMPLETE WITH NAMED BLOCKERS.** Checked 2026-10-28 UTC.
All canonical confirmed P0/P1 items are released or explicitly evidence-blocked.
This is not a claim of complete seven-game coverage or unattended discovery.
The authorized wave stops here. No next implementation is authorized by this file.

Canonical [wave task](../tasks/SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE.md)
and [backlog](../tasks/SOURCE-COVERAGE-7GAME-REMEDIATION-BACKLOG.md).
Latest data main: `1cb00dc77afe64d1c1649b0d780ae636d9f39467` (PR148).
Its post-merge [CI/Pages40769622431](https://github.com/maxvfk/game-calendar/actions/runs/40769622431)
completed successfully, including deployment.

## Released scope and independent A/B outcomes

A = source-backed data restored in the actual published feed.
B = narrow repeat protection delivered, or a named discovery/access follow-up.
Every delivery PR below contains exact-head CI, merge, post-merge CI/Pages and
published-event evidence. CP0–CP2 files/evidence are retained in branch history;
final CP3/CP4 PR-body updates supersede historical pending text in merged files.

| Canonical milestone | Delivery / merge | A | B | Successful post-merge CI/Pages |
| --- | --- | --- | --- | --- |
| SC-P0-GEN-STARLIGHT (completed before wave; not repeated) | [130](https://github.com/maxvfk/game-calendar/pull/130) · `f97747e7` | Main + early quest | DONE: two-period notice contract | [40666739803](https://github.com/maxvfk/game-calendar/actions/runs/40666739803) |
| SC-P0-CZN-GIFTS | [132](https://github.com/maxvfk/game-calendar/pull/132) · `473729f7` | 8 claim windows | BLOCKED CZN-OFFICIAL-MAIL-DISCOVERY | [40674871392](https://github.com/maxvfk/game-calendar/actions/runs/40674871392) |
| SC-P0-END-MARAS | [133](https://github.com/maxvfk/game-calendar/pull/133) · `97b407c8` | Same-ID regional correction | DONE: exact known conflict guard; unknown discrepancies still fail | [40676242165](https://github.com/maxvfk/game-calendar/actions/runs/40676242165) |
| SC-P1-GEN-EXPIRIES | [134](https://github.com/maxvfk/game-calendar/pull/134) · `d95e852f` | 2 precision corrections + weapon channel | DONE: scoped duration/table extraction | [40678433259](https://github.com/maxvfk/game-calendar/actions/runs/40678433259) |
| SC-P1-CZN-OVERDRIVE | [135](https://github.com/maxvfk/game-calendar/pull/135) · `21f07733` | Global Nov3 18Z | BLOCKED CZN-OFFICIAL-EVENT-DISCOVERY | [40690620800](https://github.com/maxvfk/game-calendar/actions/runs/40690620800) |
| SC-P1-END-CURRENT | [136](https://github.com/maxvfk/game-calendar/pull/136) · `7550118d` | 5 channels/reward periods | BLOCKED END-OFFICIAL-DISCOVERY | [40691665610](https://github.com/maxvfk/game-calendar/actions/runs/40691665610) |
| SC-P1-HSR-BANNERS | [137](https://github.com/maxvfk/game-calendar/pull/137) · `cc325bf6` | 4 distinct Warp/LC channels | BLOCKED HSR-WARP-DISCOVERY | [40692792892](https://github.com/maxvfk/game-calendar/actions/runs/40692792892) |
| SC-P1-NTE-14-SKIPPED | [138](https://github.com/maxvfk/game-calendar/pull/138) · `ed74b738` | 5 reward families | DONE: narrowly admitted release notice/context and version identity | [40694158519](https://github.com/maxvfk/game-calendar/actions/runs/40694158519) |
| SC-P1-WUWA-37-PARSER | [139](https://github.com/maxvfk/game-calendar/pull/139) · `1e229c66` | 4 patch-note events | DONE: scoped heading/date/duration/nested identity | [40695357581](https://github.com/maxvfk/game-calendar/actions/runs/40695357581) |
| SC-P1-WUWA-NEW-BANNERS | No data published | BLOCKED WUWA-NEW-BANNER-CLOCK | Same evidence gate; no borrowed rerun clocks | See blocker below |
| SC-P1-HSR-CLAIMS | [140](https://github.com/maxvfk/game-calendar/pull/140) · `5bc643ed` | 2 Park reward/claim periods | DONE: Availability/Claim Period extraction | [40696548982](https://github.com/maxvfk/game-calendar/actions/runs/40696548982) |
| SC-P1-CZN-SEASONS | [141](https://github.com/maxvfk/game-calendar/pull/141) · `a97d6459` | Current 2 released; old terminal BLOCKED | BLOCKED CZN-OFFICIAL-EVENT-DISCOVERY | [40705631930](https://github.com/maxvfk/game-calendar/actions/runs/40705631930) |
| SC-P1-CZN-CARNIVAL | [142](https://github.com/maxvfk/game-calendar/pull/142) · `bb365d10` | Parent/free-attempt warning + Aether | BLOCKED CZN-OFFICIAL-EVENT-DISCOVERY | [40706852239](https://github.com/maxvfk/game-calendar/actions/runs/40706852239) |
| SC-P1-ZZZ-REWARDS | [143](https://github.com/maxvfk/game-calendar/pull/143) · `103520f7` | City Fund + issue-fix compensation | BLOCKED ZZZ-REWARD-DISCOVERY | [40709150830](https://github.com/maxvfk/game-calendar/actions/runs/40709150830) |
| SC-P1-END-UPCOMING | [144](https://github.com/maxvfk/game-calendar/pull/144) · `a671d7fb` | 5 future families/independent cutoffs | BLOCKED END-OFFICIAL-DISCOVERY | [40768798302](https://github.com/maxvfk/game-calendar/actions/runs/40768798302) |
| SC-P1-CZN-SEASON5 | [148](https://github.com/maxvfk/game-calendar/pull/148) · `1cb00dc7` | 3 compact seasonal/reward families | BLOCKED CZN-OFFICIAL-EVENT-DISCOVERY | [40769622431](https://github.com/maxvfk/game-calendar/actions/runs/40769622431) |

The wave added 44 IDs (245 after PR130 → 289 after PR148), refined three
existing deadlines (Maras, Overflowing Favor, Carefree), and added an explicit
historical warning to old CZN Season4. No old ID was removed/rekeyed. That warning
does not fully reconcile the old CZN record's unknown-end model status.

## Final verification and historical status

Each data PR passed frozen install, typecheck, full tests, build and an actual
fixed-clock feed comparison, then exact-head CI, controlled merge, post-merge
CI/Pages and published-feed verification. Latest full suite: **1396 pass,
3 existing local age-dependent skips, 0 fail**; CI also passed real PostgreSQL17
and age recovery. An incomplete test run without a final summary was never
accepted; corrected legacy fixture counts and validation reruns are recorded.

The final published feed, generated **2026-10-28T21:10:51.896Z**, has **289**
unique winners. All 289 matched the fixed replay: reviewed records matched in
full; automatic records matched excluding only normal build-time firstSeenAt /
updatedAt. All three final CZN additions matched in full. The pre-existing NTE
Circle Bounty1.3 source conflict remains unchanged. No source/snapshot timestamp
was invented or refreshed by these recovery edits. The intervening scheduled
snapshot refresh and unrelated main PR145/146 were preserved.

Browser checks were performed through PR143. Browser capability became
unavailable on resume; PR144/148 browser rechecks are **NOT RUN**, not falsely
reported as passed. Published JSON and server-rendered detail/Timeline
regressions verify all three regions, exact ±1ms cutoffs and date-only displays.
No account preferences, completion marks, notes or Sync state were changed.
Operator phone/PWA verification is not represented as independently performed.

At **2026-10-28T21:04:39.034Z**, published Starlight quest clocks showed Asia
**ended=true, upcoming=false**, while Europe/America remained live. Source
cutoffs stay AsiaOct28 20Z / EuropeOct29 03Z / AmericaOct29 09Z; the main event
still independently ends Nov2 03:59 server. Passed cutoffs remain historical.

Fresh Endfield9560 corrected stale copied audit dates: Secret Sanctuary ends
**Dec2 04server**, not Dec3; Sanity Supply starts **Nov18 04server**, ends
AsiaNov25 04server / WestNov24 17server (Nov24 20Z /22Z). Three relative
next-maintenance endings remain null. CZN before-maintenance endings remain
**day precision**. No maintenance completion/closing minute was guessed.

Replay artifacts: `docs/evidence/*-feed-replay-2026-10-28.json`; latest
[CZN Season5](../evidence/czn-season5-feed-replay-2026-10-28.json) and
[Endfield upcoming](../evidence/endfield-upcoming-feed-replay-2026-10-28.json).

## Evidence blockers — no speculative publication

| Blocker | Evidence and unchanged limitation | Exact prerequisite for a separately authorized follow-up |
| --- | --- | --- |
| WUWA-NEW-BANNER-CLOCK | Real mirror blob `b409efe121a6a2757101bb1eebaaf093d196b762`:5571 names Suoming/Nine Deaths, One Unbent Heart and Unspoken Rue;5668 dates only four reruns. Bounded official-domain search did not establish an independently dated new-channel period. This is not proof no notice exists. | Obtain a specific publisher notice or in-game period with independently explicit year/date/clock/region semantics; then add distinct channel IDs. Never copy rerun clocks. W2 gate. |
| CZN-OLD-FSO-END | New Sept30 season confirms supersession but not the old Aug19 Season4 terminal. Old ID, source/provenance, firstSeenAt and endsAt:null retained; summary warns historical/superseded. Unknown-end model status remains unresolved. | Establish the old phase's actual closing boundary or explicitly approve a model/presentation decision preserving completion-key identity. Do not fabricate Sep30 midnight. |

## Repeat protection follow-ups — reviewed rescue is not automation

| Named B blocker | Concrete missing capability / bounded next gate |
| --- | --- |
| CZN-OFFICIAL-MAIL-DISCOVERY | Healthy Prydwen banner cards omit anniversary mail. C3 publisher notice discovery/access/terms/real-runner gate must cover06UTC delivery and per-item exceptions independently of18UTC daily reset. |
| CZN-OFFICIAL-EVENT-DISCOVERY | Same banner-only source omits gameplay/season/reward notices. C3 approved event-notice ingress remains absent; attributed manual STOVE mirror evidence is not unattended fetching permission. |
| END-OFFICIAL-DISCOVERY | Event wiki omits official channels and future families. A3 publisher access/discovery/runner gate remains unimplemented. No change to rejected Phantasia cycle ingestion. |
| HSR-WARP-DISCOVERY | The admitted update parser does not discover every separately posted Warp notice. H2 narrow publisher notice discovery is still required; reviewed rescue preserves the four sourced channels. |
| ZZZ-REWARD-DISCOVERY | Steam parser selects New Events; secondary parser selects Channels. Compensation raw text exists outside that family; City Fund is absent from admitted stored facts. ZC1/ZC4 reward-family extraction/discovery remains absent despite healthy transports. |

General renamed-template/all-family monitoring remains outside these narrow
contracts. [Simple coverage scheme](../tasks/SOURCE-COVERAGE-SIMPLE-SCHEME.md)
was added independently in PR146; none of its implementation is started here.
No P2/historical backfill, new broad source integrations, Source RecoveryR1–R3,
Timelinev2, Account Sync or CZN DailyReset work was performed by this wave.

## Durable stopping and recovery point

Data work is complete or named-blocked. **STOP; no next implementation.**
If interrupted while delivering these docs, resume only the unmerged
`docs/wave-close` branch / living
[checkpoint](SOURCE-COVERAGE-WAVE-CHECKPOINT.md), verify its real PR/CI state and
finish its CP2–CP4 release gates. Do not repeat PR130/132–144/148.
After the closeout PR is merged, its body records exact merge/post-CI/Pages/public
results and supersedes pending closeout-delivery text. Any new blocker research
or simple-scheme implementation needs a separate operator-started task.
