# Sequential verified data corrections — four bounded milestones

**Status:** ready for one user-authorized sequential implementation Work.
**Approved execution intent:** user requested 2026-10-22 that the confirmed
research follow-ups be carried out in one Work without launching each step.
**Scope:** (1) Endfield Phantasia reviewed cycle deadlines; (2) CZN verified
banner event precision; (3) Genshin Phase II reviewed end precision;
(4) CZN daily reset correction **only if a forward-only, sync-safe rollout
can be demonstrated**. Do not automatically start Astra audit, S6b, NTE
overrides, unrelated source-research or UI redesign.

CURRENT GitHub `main`, actual code and AGENTS.md take precedence over
this coordination document and old SHA references.

## Workflow: one Work session, four independently releasable milestones

1. At the start, inspect CURRENT `main`, `AGENTS.md`,
   `docs/IMPLEMENTATION-STATUS.md`, the four linked research/task files,
   current runtime/data and focused tests. Check whether another Work or PR
   already completed any assigned step. Skip completed milestones; don't
   undo or overwrite changes by other agents.
2. Execute **in order**. For each approved, achievable implementation, create
   a **new short-lived branch from freshly fetched `main`**, make the minimum
   relevant changes and regressions, update IMPLEMENTATION-STATUS for actual
   completed work, and run all required commands:
   `bun install --frozen-lockfile`, `bun run typecheck`,
   `bun test`, `bun run build`.
3. Inspect semantic event-ID and feed boundary diffs and source-health/conflict
   reports (or account-state compatibility for reset milestone). Use a PR per
   milestone, await successful hosted CI, merge, verify `main` and the
   deployed Pages feed/runtime as appropriate, then start the next step
   **automatically** from the updated `main`. Do not combine three games or
   clock/storage work into one large PR. Do not treat a passing unit test as
   evidence that Pages published a change.
4. If a particular milestone cannot be completed safely because a required
   source, CI, credential or compatibility proof is missing, record the exact
   blocker in a docs-only checkpoint and move to later independent steps.
   Never bypass the data contract to get green CI. For an unfinished code
   branch, do not merge a broken or partial production correction. Document
   next action and preserve its branch/PR, if useful.
5. Keep milestones independent and ensure any concurrently merged docs/research
   appear in the relevant branch before merging. Don't restart completed
   general research. Give a final 4-row results table with per-step status,
   PR SHA, tests, deployed verification, blocked questions and one next step.

## Step 1 — Endfield, season Phantasia cycles

Follow **in full**:
`docs/tasks/ENDFIELD-PHANTASIA-REVIEWED-CYCLE-DEADLINES.md`.
Read `docs/research/endfield-recurring-endgame.md` §16–17.
Reconfirm official dates before edits.

Goal: add exactly two official reviewed cycle rows under existing Endfield
IDs, with sourced exact regionEnds for Cycle I/II, canonical day starts.
Retain single season/Cycle III end. Prove Endgame filtering, sorting, regional
expiry and stable old IDs. Preserve wiki parser rejection, broken source
signal and Illusion LKG; reviewed publication is **not automatic-source
recovery**. If official corroboration becomes inaccessible or contradicted,
don't speculate or synthesize weekly cadence. Deploy/verify current feed.

## Step 2 — CZN exact banner starts/ends

Follow **in full**:
`docs/tasks/CZN-VERIFIED-BANNER-TIME-PRECISION.md`.
Read `docs/research/event-time-precision-audit.md`.

Goal: bounded official reviewed precision corrections for six currently
published CZN banner IDs. Verify each evidence URL/notice. Preserve
Rossweisse/Sig's Dec 2 **day-precision** end unless its exact end has a
new separately verified dated notice. Preserve IDs/firstSeenAt, official
provenance and the intentionally conservative Prydwen parser. Do not publish
historical Sereniel/Peko just to increase precision. Focused tests, semantic
feed diff, deployed exact instants.

## Step 3 — Genshin Phase II regional banner ends

Follow **in full**:
`docs/tasks/GENSHIN-PHASE-II-VERIFIED-END-PRECISION.md`.
Read the Genshin findings in the same precision audit.

Goal: only the two known Phase II character banner IDs; reviewed
`endPrecision: exact` with sourced Asia/Europe/America ends; keep
`startPrecision: day`, untouched IDs, no universal `t_lc/t_gl` parser rule,
no weapon-banner addition. Compare same-ID merge precedence, exact regional
countdowns and public feed; do not introduce conflicts by silent override.

## Step 4 — CZN 18:00Z daily reset; gated data-compatibility implementation

Evidence:
`docs/research/daily-reset-clocks/czn.md` and
`docs/research/daily-reset-clocks.md`.
The universal CZN international daily rollover at 18:00 UTC is independently
supported. The current 04:00 regional defaults are wrong for this game.
This is **not** an event banner deadline and must not be solved by editing
source feed or changing the global reset defaults.

Unlike steps 1–3, this step currently has **no fully specified approved
migration design**. First create a small implementation task/technical
decision note covering day-label convention and forward transition. Work
may implement it in this same session only if the contracts and protections
below can be proven; otherwise stop at docs-only plan and mark step 4
`blocked — requires decision/compatibility proof`, while steps 1–3
remain delivered.

Safety conditions for implementing step 4:

- Explicitly choose/document the game-day label convention with a
  *sourced* basis: e.g., fixed 18:00 UTC date versus 03:00 KST *next-date*
  labels are the same instant but **different stored `dayKey` strings**.
  Do not hide the distinction by reusing a region offset as a fake server.
  When ambiguous or meaningfully product-dependent, document alternatives
  and ask the user for that decision **after** finishing earlier milestones.
- Scope to CZN daily/task reset through an explicit daily policy, not
  `RESET_HOUR_LOCAL` or default `REGION_RESET_UTC_OFFSET`. Evaluate every
  `resetShiftMs`, `dayStartMs`, `latestBoundaryMs`, `clockFor`,
  `serverOffsetUtc` consumer, especially day-precision event boundaries,
  ongoing source retention and recurrence; unrelated games and event times
  must be invariant.
- Preserve all historical CZN daily marks **verbatim**, including
  incomplete/tombstone records, `dailies:czn` subject ID, old exports and
  profiles. The available logs do **not** contain reliable original
  per-day completion instants; do not bulk-shift, duplicate, delete, infer
  from `changedAt`, rewrite or claim lossless historical migration.
  Design a forward-only policy for new writes, old labels and cutover
  that avoids quietly fabricating/loss of streaks. Explain unavoidable
  ambiguity honestly.
- Prove correctness under guest/account use, legacy export/import, two
  authenticated devices, offline outbox replay from an older build, Sync
  mutation merging/tombstones, repeated cutover, profile switches, browser
  refresh/update and rollback. If a policy marker is required, specify
  storage/wire versioning and real old-client behavior before deploying.
  Never silently publish incompatible key interpretations.
- Test reset−1 ms / exact reset / reset+1 ms, strict next reset,
  labelled-day inverse, UTC date/month/year, all app Region choices,
  before/after Europe/US DST, `dailyDays`, `dailySummary`,
  `catchUpDays`, `streakOf`, day precision events and
  `latestBoundaryMs`, legacy backups/import and multi-device Sync.
- Minimum full gates + browser smoke (desktop and phone-sized). If a
  temporary test account is required for hosted Sync, do not touch
  production user data without safe isolated test identities and required
  authorization. Leave final real-device smoke to the operator.
- If and only if all these constraints have a validated implementation,
  put **step 4 in its own PR**, merge after green CI and check deployed
  countdown at a known UTC instant. Otherwise retain current production
  behavior, publish research/design findings only, identify the concrete
  unresolved decision, and stop — no risky speculative rollout.

## Hard exclusions / stopping point

- Do not loosen validation, date precision, conflict detection,
  source-health, LKG, provenance, robots/request policy or event-ID stability.
- Do not implement unresolved NTE daily clocks, SEA server selector,
  general `regionStarts`, unrelated precision cases or new recurring events.
- Do not automatically launch the independent Astra audit after these
  changes. Final report must distinguish completed and blocked milestones.
- Stop the Work after these four items (or documented blockers). The
  operator tests on real phone/PC afterwards.
