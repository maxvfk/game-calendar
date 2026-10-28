# Source Coverage — Current Data Recovery Wave

**Status:** RUNNING — explicitly launched by user 2026-10-28. Current bounded item: SC-P0-CZN-GIFTS / [PR #132](https://github.com/maxvfk/game-calendar/pull/132).
**Prepared:** 2026-10-28. **Baseline:** current main at launch (do not pin this document's preparation SHA).
**Canonical backlog:** [SOURCE-COVERAGE-7GAME-REMEDIATION-BACKLOG.md](SOURCE-COVERAGE-7GAME-REMEDIATION-BACKLOG.md).
**Operating rules:** `AGENTS.md`; `docs/IMPLEMENTATION-STATUS.md`.
**Inputs:** seven linked per-game source coverage audits from the canonical backlog.

## Goal and authorization boundary

A **single user-launched, resumable coordination Work** may process **remaining confirmed, in-scope P0/P1 current-event and deadline repairs**, in deadline/player-impact order. It may proceed from one **fully released, verified, documented small PR** to the next safe P0/P1 item without repeated user permission, **within this wave only**.

**Already COMPLETE:** `SC-P0-GEN-STARLIGHT` via merged [PR #130](https://github.com/maxvfk/game-calendar/pull/130), with verified post-merge CI, Pages and public Genshin event results. **Never redo it** or reopen the existing Starlight source research.

Do not treat a large wave as one massive implementation, test or merge unit. One game / one closely related bounded change / one feature branch and PR, always branched from *CURRENT* main. Prioritize confirmed wrong confident timestamps and imminent free-reward/quest expiry over optional or historical coverage. Re-rank according to **actual date at execution**, not the frozen October 28 table; already passed deadlines must remain historically accurate rather than be relabelled upcoming.

### Priority scope (read source-specific details from backlog, not copied guesses)

1. Remaining P0: CZN anniversary **06:00 UTC gift deliveries and 24-hour claim cutoffs** with the exceptional Nov 30 deadlines; Endfield **Forest of Maras** exact incorrect regional expiry.
2. Near-dated P1: Genshin **Overflowing Favor, Phase II Epitome Invocation** and existing Carefree precision; CZN **Overdrive: Simulation**; Endfield **Contingency Readiness**, Si/Tangtang and relevant issues; other independently evidenced near-end tasks.
3. Other confirmed source-backed P1: HSR 4.6 four live Warp/Light Cone channels and Park rewards; WuWa 3.7 patch-note events with separately gated Suoming/weapon first-party dates; NTE 1.4 skipped launch notice and five live reward deadlines; remaining CZN seasons/anniversary and Endfield future official windows; ZZZ City Fund and fixed free compensation cutoff.

**Excluded:** P2/historical backfill, uncertain `WATCH`, unannounced phase scheduling, unapproved web/store/paid product categories, new broad integrations, Source Recovery R1/R2/R3 and its [design PR #113](https://github.com/maxvfk/game-calendar/pull/113), NO-GO Timeline v2 [PR #115](https://github.com/maxvfk/game-calendar/pull/115), Auth/Sync and CZN Daily Reset. Never guess maintenance completion, exact year, publication timestamps or missing source clock.

When a P1 needs an unverified source, product decision, credential, new permitted-access probe or unsafe identity migration, record **BLOCKED/WATCH** with exact evidence and safely move to the next independent already-confirmed item. Do not turn blocking research into an unapproved coding milestone.

## Per-PR delivery contract

Before changing files, read current main, `AGENTS.md`, the backlog, status, only the relevant game audit, actual source snapshot/notice, parser, reviewed records and tests. Check for recent relevant merged/open PRs; determine the **real current merge/feed winner**.

For each incident record **two independent outcomes** per the backlog's approved Section 7:

- **A — data restored:** correctly source-backed stable-ID event/deadline appears in merged and actually published feed with exact regional UTC and precision/provenance as supported. An urgent reviewed fallback is valid.
- **B — repeat-failure protected:** narrow deterministic source selection/parser/discovery guard plus evidence regression and merged-winner verification, **or** a named `BLOCKED/WATCH` follow-up when unattended access/discovery cannot safely be repaired now. A reviewed-only restoration does *not* imply B complete.

Keep existing IDs/localStorage completion keys, reviewed precedence, provenance and `firstSeenAt`; do not degrade exact clocks, change unrelated game data or create duplicate banner/phase entries.

Each game-specific PR must run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`, and a relevant actual feed replay/comparison; inspect conflicts/removed IDs and region boundaries. Require green PR CI, controlled merge, **post-merge** CI and Pages, plus checked published `events.v1.json`/browser wherever feasible. If a required check cannot run, mark **NOT RUN**, do not mark the task complete. Update canonical backlog and `IMPLEMENTATION-STATUS.md` after each release, with links and a named next step.

## Execution continuity — mandatory; Work quota is not readable

**Do NOT assume ChatGPT Work can access remaining five-hour or weekly allowance, percentage, reset time or remaining runtime.** It cannot reliably read those quota figures. **Never invent a percentage**, never claim “15% left”, and never promise automatic pausing at a quota threshold or resuming after reset. This task's safety mechanism is **short, durable checkpoints**, not a fictitious remaining-usage sensor. The user will start/resume Work **manually**.

At *each meaningful stage* and **within a game**, save durable state to GitHub before a long subsequent step, rather than waiting for a game/PR to finish:

| Checkpoint | Minimum durable state |
|---|---|
| **CP0 — Source/plan** | Checked main SHA, first-party/actual notice evidence, exact scope and intended stable IDs, branch name, evidence uncertainties and next edit. Create/push the task branch early. |
| **CP1 — Implementation** | Commit and push current usable or explicitly **WIP** files to the task branch; note changed paths, current test expectations and known unfinished behavior. **Do not merge WIP.** |
| **CP2 — Validation** | Record exact command results `PASS / FAIL / NOT RUN`, feed diff/UTC checks and any rerun required after subsequent edits. Partial tests are not complete validation. |
| **CP3 — PR/CI** | PR number/URL, head SHA, each CI status/run URL, outstanding review/check/merge blocker; **do not merge unverified code**. |
| **CP4 — Release** | Merge SHA, post-merge CI/Pages status and IDs, publicly verified event/region boundary, both A/B outcomes, backlog/status updated. Only then advance to another game. |

**Persistence location:** For a still-open game branch/PR, keep a short living `docs/handoffs/SOURCE-COVERAGE-WAVE-CHECKPOINT.md` **on that task branch** (create as needed), referenced in the PR description. Checkpoints can be small commits; clean WIP syntax or failing tests are acceptable **on the unmerged task branch only**, clearly labelled and never merged as passing. A PR is optional at CP0/CP1, but the pushed branch and commit SHA are mandatory. For fully released items, the merged PR, canonical backlog and `IMPLEMENTATION-STATUS.md` are the durable record; no separate handoff file is necessary on main. Use one active unmerged implementation branch at a time so the next Work can identify it reliably.

### Interruption / low resources / tool failure

If a usage limit, tool failure, interruption or execution blocker *allows further actions*, **stop starting new work**, commit/push the smallest recoverable snapshot if safe, record the current stage and report `PAUSED` with branch, SHA, PR, `PASS/FAIL/NOT RUN` and exact next command/step. If the interruption is instantaneous and saving is impossible, **do not claim checkpoint success**: any prior pushed commit remains the last reliable state. The assistant cannot guarantee a final save after a hard allowance cutoff.

Never automatically keep working after limit reset, initiate paid credits or schedule a future continuation. If near a costly boundary without reliable allowance visibility, favor a completed checkpoint first. A queued/running CI, partial merge, timed-out command, or attempted deploy is **UNKNOWN until verified**. Do not presume success from the last issued request.

### Manual resume protocol

1. Re-read **CURRENT main** and the canonical task/backlog/status; inspect latest relevant PRs and task branches before changing anything. Locate the most recent `SOURCE-COVERAGE-WAVE-CHECKPOINT.md` in an **unmerged branch**, if any.
2. Compare branch base/head against main; establish which commits actually exist, which PR/CI/Pages actions completed, and whether other actors changed data while paused.
3. Resume from the **earliest still-unverified CP**, not from the agent's remembered narrative. Do not rerun completed research, releases or tests **unless subsequent code/inputs invalidate them**. Do not treat an interrupted command as successful.
4. If already merged, use PR + verified Pages evidence as source of truth, update any stale checkpoint/status, and move only to the next still-open eligible backlog item.
5. If there is a conflict, unsafe rebase or ambiguous publication, stop that item at `BLOCKED` instead of silently discarding source history, overwriting IDs or auto-merging.

**Checkpoint handoff format (copy into PR description or branch file):**

```text
WAVE: SOURCE-COVERAGE-CURRENT-DATA-RECOVERY-WAVE
MILESTONE: <backlog item ID>
STAGE: CP0 | CP1 | CP2 | CP3 | CP4 | PAUSED | BLOCKED
BASE_MAIN_SHA: <verified sha>
BRANCH / HEAD_SHA: <branch> / <sha>
PR: <number/url or NONE>
DONE: <facts, changed paths>
VERIFICATION: <command or gate = PASS / FAIL / NOT RUN; links>
REMAINING: <exact next actions>
BLOCKERS: <factual evidence / NONE>
OUTCOME_A_DATA: DONE | PENDING
OUTCOME_B_PREVENTION: DONE | PENDING | BLOCKED <follow-up>
NEXT_CONCRETE_STEP: <one reproducible action>
```

## Finish condition

A **wave** is complete only if every **in-scope currently confirmed P0/P1** is either (a) delivered through fully verified production release with separately tracked A/B, or (b) explicitly documented **BLOCKED/WATCH** for a concrete evidential reason with no pretence it was fixed; unapproved scope remains excluded. Otherwise report **PARTIAL / PAUSED**, point to the persisted checkpoint and wait for a **manual** user restart.

**STOP after this recovery wave.** Do not automatically start R1–R3, historical P2, Timeline v2, Sync or another milestone.
