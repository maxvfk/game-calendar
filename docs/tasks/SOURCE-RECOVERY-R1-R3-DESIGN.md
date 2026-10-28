# Source Recovery R1–R3 — monitoring, assisted and autonomous repair

**State:** DESIGN REVISED AFTER INDEPENDENT NEEDS_CHANGES REVIEW (2026-10-28); implementation NOT authorized.
**Review evidence:** [Claude PR #113 comment](https://github.com/maxvfk/game-calendar/pull/113#issuecomment-6472175155). Mitigations below are proposed gates, **not implemented runtime controls**.
**Owner decision:** operator, 2026-10-27. **Base main:** `1d35a95`.
**Scope:** seven-game source coverage, ingestion recovery and its GitHub orchestration.
**Primary constraint:** missing or confidently wrong deadlines are worse than an empty calendar.

## 0. Intent and explicit operator decisions

Produce a safe way to recognize disappearing event coverage (including a source that
still returns HTTP 200), gather evidence, and eventually let a Claude coding agent
restore confirmed missing or incorrect calendar data with as little operator
involvement as possible. Repairing a parser is not always the right recovery:
a verified one-off event may be restored through reviewed records instead.

- **R1 — deterministic Coverage Health & incidents:** runs unattended, WITHOUT an LLM.
  Classify problems; open/update/close or explicitly resolve deduplicated GitHub
  incidents with evidence, not speculative publication.
- **R2 — manually triggered Claude recovery:** the operator launches a bounded
  coding-agent run for a particular confirmed incident. It researches, tests on
  a real runner where needed, commits to its own branch and opens/updates a PR;
  **then notifies the operator and STOPS**.
- **R3 — autonomous Claude recovery:** only a confirmed high-severity incident
  can start a longer/better-resourced coding agent automatically. Same terminal
  contract: **PR + notification, then STOP**.
- **Neither R2 nor R3 may merge, write to main, enable auto-merge, bypass branch
  protection, publish production data, or deploy.** This is a **target invariant**,
  not an existing permission boundary: Oct 28 GitHub REST reports
  `branches/main.protected=false` and `rulesets=[]`. A deterministic writer and
  operator-approved main-branch policy are required before R2b activation.
  An **independent** ChatGPT Work or Claude review remains separate, with merge
  only after its own explicit authorization.
- Source search, adapter implementation and provenance changes must never be
  interpreted as permission to invent future schedules, bypass robots, or use
  private endpoints.
- Treat **A: restore actual current source-backed events/deadlines** and
  **B: prevent/monitor recurrence** as separate outcomes. A reviewed-only
  hotfix can satisfy A without pretending that automatic discovery is fixed.
- D1 (version audit) and D2 (strategy selection) below are additions to the
  existing D0 design, NOT independent implementation milestones.

This document is a design decision draft, not an instruction to immediately
install Claude/GitHub integrations, store new secrets, or start agent workflows.

## 1. Actual repository baseline — REUSE rather than re-research

Authoritative reference order: current `main`, `AGENTS.md`,
`docs/IMPLEMENTATION-STATUS.md`, relevant tasks/research, then history.

Existing production pieces as of this draft:

- `.github/workflows/refresh.yml` currently schedules 05:27 and 17:27 UTC,
  uses the existing refresh pipeline, state cache and snapshot commits, triggers
  explicit CI after token-authored writes, and reports newly broken sources.
- `scripts/refresh-sources.ts`: robots + UA + per-host spacing, 6-hour floor,
  200/304, rejects/zeros, source failure counters and LKG policy.
- `src/ingest/health.ts`: separates parser zero, expired-only and explicitly
  empty source content; `public/data/events.v1.json` contains source status.
- `docs/tasks/TIMELINE-LABEL-AUTONOMOUS.md` and
  `.github/workflows/timeline-labels.yml`: VERIFIED headless Claude Code CLI
  using the operator's Claude Pro `CLAUDE_CODE_OAUTH_TOKEN`. One bounded
  no-tools model call in a read-only job; a separate secret-free deterministic
  job records the result; explicit CI is dispatched after a `GITHUB_TOKEN` push.
  Measured successful subscription usage is recorded in that task and in runs.
  Reuse this feasibility proof and its secure-token/usage-limit handling.
- Unlike Timeline editorial decisions, **coding agents need tools, source
  access, write-capable sandboxes, dependency testing, and PR creation**.
  Their invocation, privilege boundaries, resource use and ability to run under
  the existing subscription token are NEW scoped validation gates, NOT already
  proven merely by Timeline's one-shot model invocation.
- Recent ZZZ cases make the failure classes concrete: official HTML returned a
  valid shell without articles (#107); Steam RSS filled events but not banners
  (#109); both endgame clocks had stale historical anchors (#111); secondary
  Zenless.gg RSS restored four separately identified channels (#112), but can
  lag while still returning success.
- Other game coverage is documented in `docs/research/coverage-*.md` and may
  require source-specific expectations. Do not re-run completed coverage research
  without a concrete incident.

## 2. R1: Coverage Health distinct from Source Health

A valid HTTP response, nonzero historical parse and `lastConfirmedAt` do NOT
prove present/future coverage. Monitor **(game, event family / mode, region)**
independently of source transport health. Build the smallest versioned
Git-reviewed *coverage contracts*, not a single global cadence guess.

Candidate inputs (inspect actual schema and select only grounded inputs):

- Source outcome and freshness: attempt/confirmed/failure dates, 200 vs 304,
  stored content age, parser zero/partial/drop, scheduled refresh run completion.
- Materialized feed: currently active and upcoming events per game/family,
  reviewed vs automatic origin, `startsAt`, effective `regionEnds`,
  end precision, provenance, merge conflicts and source health.
- Independent **explicit announcement evidence**, only where a compliant
  already-ingested source actually provides it (e.g. a new version's dated event
  or a documented channel announcement). Lack of announcements is NOT proof
  that a new event exists.
- A limited GitHub Actions watchdog for scheduled runs themselves: skipped or
  delayed refreshes must be distinguishable from source freshness failures.
  Do not infer that a scheduled job ran solely from its cron definition.
- R1 must persist independent monitor state (bot-authored incident block or
  committed monitored file); current `snapshots/*.state.json` comes from
  best-effort Actions cache. Cache miss means `unknown`, never `healthy`.
  Base liveness on **last successful completion** with tolerance for multi-hour
  schedule delays, including inactive/disabled schedules and monitor silence.

Suggested contract fields: `schemaVersion`, `game`, `family`, optional
`mode`, region policy, monitored source IDs, evidence basis, explicit known
expected boundary, severity/grace window, and whether automatic escalation is
permitted. `expectedUntil` and future `expectedStart` must be independently
sourced, never silently calculated from patch halves. No generic universal
`next banner must exist N days before expiry` rule.

R1 state machine, with conservative guardrails:

1. `healthy` — transport and grounded coverage are coherent.
2. `watch` — near an observed deadline with no later announcement, missing
   a normal update, or monitor data too old; this is not a confirmed outage.
3. `suspected` — concrete anomaly, but with uncertain corroboration or
   transient failure; retry at the next eligible refresh, respect request floor.
4. `confirmed` — repeated failing transport/parse OR independent grounded
   evidence of missing or contradictory active coverage OR confirmed missing
   scheduled workflow beyond allowed latency.
5. `recovering` — a linked R2/R3 PR is in progress.
6. `resolved` — validated change plus fresh check confirms coverage restored;
   merging alone is insufficient, and no automatic production publication is
   authorized here.
7. `blocked` — access/permissions/evidence unavailable or recovery exhausted;
   keep reviewed/LKG and issue open for human decision.

Severity P0/P1 is based on **confirmed user impact**, upcoming real deadlines
and source evidence; don't automatically label `watch` P0.
R3 activation needs `confirmed` AND explicit reviewed eligibility conditions
(e.g. lost currently active official deadline, repeated unavailable critical
source, known new notice omitted) and a kill switch; NEVER just an old 200 page.

## 2.1. D1 — version-coverage audit for unseen event families

R1's deterministic known-family contracts cannot by themselves identify a
one-off reward or **entirely new event family** absent from all ingested
sources. Seven game-specific audits on October 28 exposed this gap
(`docs/tasks/SOURCE-COVERAGE-7GAME-REMEDIATION-BACKLOG.md`).
Keep the existing R1 monitoring intact; complement it with a bounded
**version-coverage audit**.

1. **Trigger:** initially an explicitly launched read-only audit when a
   genuine publisher version/major-update notice is available. Do not
   invent version dates or infer unannounced Phase II periods. A periodic
   or agent-automated trigger is a later separately authorized, measured
   pilot; D1 does not introduce an LLM into R1 or activate new schedules.
2. **Evidence and comparison:** use permitted official/attributed sources
   plus existing snapshots, current `main`, reviewed records and actual
   **merged published feed winners**. Compare each relevant dated announcement
   to the feed per game × event/claim family × region; check distinct reward
   claim windows, banners, gameplay/endgame and newly introduced modes.
   Record publisher vs host, notice URL, publication/check times, precision,
   source availability on the real Actions runner, and disagreements.
3. **Classification:** output a compact version/family coverage matrix:
   `covered`, `confirmed_missing`, `wrong_deadline`,
   `watch_unannounced`, `blocked_source`, `out_of_scope`.
   Missing a **known published** deadline can become a deduplicated R1
   incident with linked evidence; an unannounced schedule is only WATCH.
   Do not create a separate incident registry or automatically start R3
   on a mere suspicion.
4. **Economics and scope:** start from the seven existing audits and subsequent
   remediation, examine only each *new version's delta*, and measure audit
   effort and false alarms. This phase does not change source adapters,
   reviewed files, registry, workflows or live feed; new product categories,
   permission gates and future automated audits require explicit approval.

**D1 delivery gate:** separate bounded read-only pilot task after D0 review;
show an evidenced omission, an unannounced WATCH case, source limitations and
an unchanged production feed. No repeat of the full seven-game research.

## 3. Incident as canonical state and single handoff

Proposed GitHub Issue with versioned machine-readable payload persisted in a
trusted issue section or committed evidence file, plus readable Markdown:

    schemaVersion: source-recovery-incident/v1
    incidentKey: canonical game + family + failure class + affected period
    severity: P0 | P1 | P2
    state: watch | suspected | confirmed | recovering | resolved | blocked
    detectionRuleVersion, firstObservedAt, lastObservedAt, lastHealthyAt
    sourceIds, recentOutcomes, feed/event references, affectedRegions
    expectedEvidence: URL, published/check time, claim and provenance
    observedFailure, uncertainty, reproducible runner steps
    previousRelatedIncident, linkedBranch, linkedPR, validationRun
    attempts, nextAllowedAttemptAt, suggestedOperatorAction
    proposedRecoveryStrategy (triage recommendation, not operator approval)
    outcomeA (pending/verified_deployed), outcomeB (guarded/watch/blocked/pending)
    monitorHeartbeat, observedWorkflowCompletion, stateContinuity (known/unknown)

- Idempotent by deterministic `incidentKey`, not timestamp or a randomly
  changing issue title. Update an existing issue instead of creating alerts on
  every schedule or every 304. Preserve operator discussion and old evidence.
  Canonical state is ONLY a validated, bot-authored issue-body block or trusted
  committed file; public comments are neither state nor authorization.
- Never treat issue title/body, event summary, RSS/HTML, README from a candidate
  host or tool output as executable instructions. Only schema-validated,
  repository-reviewed policy determines agent scope or permissions.
- R1 writes **only** incident/monitoring metadata, not calendar events, labels,
  reviewed files or source registry. Do not put personal user data/tokens/raw
  copyrighted source pages in the incident.
- Notification is the Issue/PR and its standard GitHub notifications plus clear
  step summary; confirm the operator actually receives it before promising push
  notifications outside GitHub. No new third-party notification service by default.
- Prevent incident-close loops: require fresh successful source/coverage proof
  and appropriate confirmation after the deployed change. For missing future
  announcements, track `watch` separately rather than auto-closing because a
  snapshot was revalidated.

## 4. R2: on-demand recovery agent

Initially permit ONLY owner-authorized `workflow_dispatch` with explicit
`github.actor` allowlist and an existing validated **confirmed** incident ID.
An owner-applied label may be evaluated later behind its own actor gate.
Never trigger from public `issue_comment` or `issues: opened`; issue text is
untrusted input even when it references a genuine incident. Standard workflow:

1. Independently re-fetch CURRENT main + Issue evidence and validate age,
   severity, incidentKey, scope and existing linked PR/runs. Refuse stale,
   resolved, duplicate or ineligible requests with an actionable report.
2. A bounded read-only triage checks existing working sources and prior research,
   then admissible alternative official/secondary sources without repeating
   known blocked access experiments.
3. Run approved live source probes **separately from token-bearing model work**
   on a GitHub runner (normal UA, permissions, robots, rate limits; no challenge
   or hidden API). Record allowed URL, publication/check time, SHA-256,
   publisher/host identity and bounded verbatim date/time evidence spans,
   not bulk republished articles. Treat each span as data, not instruction.
4. If evidence passes, **select the D2 strategy** before editing anything:
   `reviewed_only`, `parser_repair` or `new_family_integration`. Restore an
   urgent verified deadline through reviewed data even if broad parser work
   is not warranted or must follow separately. Preserve IDs/completion,
   official/secondary provenance, exact region precision, reviewed priority,
   LKG and source health. If evidence fails, return `BLOCKED` and an
   operator-reviewed fallback; do not invent dates or claim unattended recovery.
5. Execute frozen install / typecheck / full tests / build; where changed
   ingestion requires it, one real runner refresh and exact feed regression
   proof. No fixture-only production claims. Collect failures accurately.
6. A **separate deterministic write job without Claude credentials** must
   validate model artifacts against captured evidence and approved paths,
   and push ONLY to a sanitized `recovery/<incidentKey>` branch. The token
   must never give the model GitHub write rights. Since `main` is currently
   unprotected, this branch restriction must have explicit negative tests
   and an operator-controlled repository-policy gate before R2b.
7. Notify by GitHub Issue comment + PR body/status. Agent STOPS. No merge or
   deployment; independent operator-selected ChatGPT Work/Claude handles
   review/fixes/merge as a new explicitly authorized task.

Exit statuses: `pr_ready`, `blocked_evidence`, `blocked_permission`,
`limited`, `failed_tests`, `requires_operator`; NEVER claim a ready
repair for a failing real runner or incomplete source coverage. A reviewed-only
PR must explicitly say that future automatic discovery remains unproven.

## 4.1. D2 — choose the cheapest safe recovery, not always a parser fix

For both R2 and R3, inspect the confirmed event, prior related incidents,
publisher evidence, feasibility of stable unattended discovery, expected
recurrence and operator/agent effort. Record one **proposed** strategy:

| Strategy | Select when | Delivery and limits |
|---|---|---|
| `reviewed_only` | Unique anniversary, compensation, special gift/claim, irregular event or inaccessible/uneconomic machine source | Add only verified events/deadlines using the existing reviewed schema, event IDs, provenance and validation. Explicitly mark unresolved automated discovery as `WATCH`/`BLOCKED`. |
| `parser_repair` | Repeat misses for a supported existing family, or a demonstrable deterministic extraction/filtering defect in an accessible source | Small source/parser correction; real-source future-version regression, runner/merge/feed validation. A separate reviewed rescue may go first if a player deadline is imminent. |
| `new_family_integration` | Publisher introduces a **durable new endgame mode** or clearly recurring family not previously supported | Immediately assess a new family contract, source adapter or effective-dated recurrence; do not wait for two misses. If future dates/access are unproven, use verified reviewed periods now and gate automation. |

Decision rules:

- **Fix current player impact first.** Avoid delaying a known urgent deadline
  solely to build an extensive automatic ingestion path.
- **Use history, not a magic threshold.** A first unusual event may be
  `reviewed_only`. Repeated related omissions trigger reassessment of parser
  investment, but even two repeats do not *mandate* a parser rewrite.
- **New durable endgame is different from a one-off.** Propose
  `new_family_integration` at first confirmed appearance. Never infer a
  future cycle or expiry from a familiar pattern without a sourced policy.
- **Stop overfitting.** If the same parser needs changes for nearly every
  patch, consider a reviewed-first contract. Re-evaluate after two or three
  *observed* future patch cycles using measured coverage, manual/agent work,
  lead time, incident recurrence and false positives; set no invented targets.
- **Respect hard gates:** product-scope changes (e.g. paid-shop reminders),
  permissions and source-access decisions become `requires_operator`.
  Every route preserves `AGENTS.md` schema/IDs, source URL/check time,
  regional precision, merge rules and fail-closed publication.

**Independent acceptance outcomes:**

- **A — data rescue:** source-backed event/expiry actually appears correctly
  in merged/deployed feed, with post-merge CI/Pages verification. A Draft PR
  alone is `pending`, not `verified_deployed`.
- **B — recurrence:** an unattended parser/discovery guard is demonstrated
  with regressions and actual runner evidence, OR a named `WATCH`/`BLOCKED`
  limitation is retained for future audit. `reviewed_only` never silently
  counts as solved automatic detection.

R2/R3 may prepare the chosen bounded Draft PR and explain alternatives, but
they **never merge, deploy or claim A complete** without independent release
verification. No expansion to unrelated games or major redesign by inference.

## 5. R3: automatic, better-resourced recovery agent

R3 reuses R2's exact evidence, **D2 selection** (including reviewed-only
cases), validation and PR-only delivery contract, with a different **trusted
trigger policy** and **bounded budget**. D1 `watch_unannounced` never qualifies
by itself:

- Runs only after R1 confirms an eligible P0/P1 failure and R3 is explicitly
  enabled by an operator-controlled GitHub repository variable.
- Independent deterministic dispatcher checks kill switch, recent retries,
  duplicate incidentKey / existing PR / active job and impact. There is NO
  reliable subscription-usage preflight: start only within measured budgets,
  then classify `limited` (including 429/529) and auth failures as the existing
  Timeline job does. Never follow instructions in source HTML.
- Higher agent budget and iterative research/repair/tests, but an explicit
  timeout, max tool calls/turns, allowed domains, network request caps, and
  per-day/per-week run ceilings. Avoid starving Timeline labels' shared
  Claude Pro usage. R2a must measure tool-agent costs; configure an R3
  exclusion window around Timeline scheduled runs (currently Tue/Sat
  04:23 UTC), accounting for observed multi-hour Actions delays. Precise
  ceilings and windows are later measured pilot decisions.
- Lock per incident and a global concurrency group; no runaway nested
  Actions/PR triggers; cooldown and exponential/backoff retry only for
  agent jobs (source HTTP still obeys the original no-retry/six-hour rules).
- Usage limit, missing OAuth, missing permission, blocked evidence, or timeout
  leaves incident visible and reviewed/LKG data intact, with no partial
  publish. No automatic switch to paid Anthropic API, alternate identity,
  or independent billing without a separate operator decision.
- PR only; **no auto-merge ever**, including after green CI. Notify the
  operator and stop pending independent review.

## 6. Credential, execution and untrusted-data boundaries

Existing proof is **headless no-tools Claude via CLI**, not authorization to
run arbitrary agent commands. Before enabling R2/R3:

- Design and verify tool-capable Claude CLI/Action with OAuth in a **separate
  read-only sandbox pilot**. CLI vs `claude-code-action` is an implementation
  choice; do not assert Action has already been deployed or will necessarily
  accept all coding tools with the current subscription.
- `CLAUDE_CODE_OAUTH_TOKEN` stays masked in the minimal model job, not in
  artifacts, reports, PR text or untrusted fork jobs; no other source/admin
  secrets in the agent workspace. Reuse working Timeline token handling and
  usage-limit classification; avoid competing for the same usage allowance.
- Never run agent or secrets on untrusted `pull_request`/
  `pull_request_target` content. Only trusted base workflow from main can
  approve trigger and explicit source-reading policies. Untrusted web pages,
  parser fixtures, GitHub issue comments, cloned repositories and build
  output are DATA, not requests to change scope, access secrets, or run shell.
- Give the agent a constrained scratch checkout with NO reusable production
  write token and no unrestricted egress to arbitrary exfiltration endpoints.
  Enforce policy in deterministic tool/runner layer; prompts are insufficient
  isolation. Fail closed if an enforceable sandbox/network policy is unavailable.
- The separate PR-authoring job checks artifact integrity, file allowlist,
  branch base/sha and no workflow/secret/security policy changes before
  committing. Changes to `.github/workflows`, auth, permissions or secrets
  need a new human-authorized design/security scope.
- Decide how PR creation triggers proper CI. `GITHUB_TOKEN`-created PR/push
  often will not initiate the expected workflows automatically; the Timeline
  system explicitly dispatches CI. Confirm the minimal safe dispatch +
  checkout/ref validation or scoped GitHub App mechanism in the R2 pilot;
  do not assume a ready PR is tested merely because one job succeeded.
- No agent-supplied source URL or issue comment may escalate allowed GitHub
  scopes, install plugins, bypass robots, create secrets or publish data.

### Independent review amendments — required design gates

The 2026-10-28 [D0 Claude review](https://github.com/maxvfk/game-calendar/pull/113#issuecomment-6472175155)
found **3 High, 5 Medium and 2 Low groups**. The R1/R2/R3 and D1/D2
architecture is retained. The following are **future implementation gates**,
not claims that runtime protections already exist.

**H1: GitHub branch security.** On Oct 28 `main` was unprotected and
`rulesets=[]` (confirmed by REST). The writer's `contents: write` token
could in principle push `main`; a prompt-level no-merge policy is NOT
protection. The secret-free writer must compute its target from a trusted
canonical `incidentKey` into `recovery/<incidentKey>`, reject all externally
supplied ref/path overrides and all targets named `main`, and pin the
base/head SHA. Negative tests must prove it cannot request a push to
`main` or another non-recovery ref. A ruleset that blocks force-push and
branch deletion is valuable but **does not block an ordinary fast-forward
push**. Before R2b, the operator must explicitly assess appropriate GitHub
branch-update restrictions and compatibility with current fast-forward
refresh/Timeline bots. No rulesets/permissions are changed in this PR; until
the real enforcement exists, **do not claim main is protected**.

**H2: Claude token exposure in tool-enabled mode.** Existing Timeline
`claude -p --tools ""` proves only a no-tools invocation. R2a must test
whether Bash/WebFetch and child processes inherit/can read
`CLAUDE_CODE_OAUTH_TOKEN`. Prefer a token-bearing Claude job with no
direct source fetch (sources captured by a separate unprivileged probe),
isolated tools, and effective runner/container egress restrictions.
Determine the **actual required** Claude API/auth hosts in a controlled
pilot rather than hardcode an unverified `api.anthropic.com`-only assumption;
block arbitrary outbound domains, network-capable Bash and non-allowlisted
WebFetch at the enforceable runner/tool layer, not only by prompt.
Red-team with a source fixture instructing environment/token exfiltration.
A trusted token-holding step scans every outgoing artifact for secret values
and refuses upload on a match, but a scan is only defense-in-depth and cannot
compensate for a model subprocess able to access secrets or unrestricted
network. **Fail closed / NO GO** if credential isolation or egress cannot
be enforced. The write job NEVER receives the Claude secret.

**H3: `reviewed_only` date integrity.** A probe deterministically pins each
date/time **source claim** to allowed URL, check time, content SHA-256,
publisher/host attribution and bounded verbatim span. The independent writer
must validate every output temporal field through a reviewed deterministic
extraction/conversion contract using those spans, plus explicit contextual
year (where justified), server/region UTC offset, precision and source
provenance. The *resulting UTC ISO timestamp need not appear literally*
in the original publisher text: e.g. `04:00 game-server time` requires
a proven timezone conversion. Conversely, the model's explanation or a
similar unrelated date is NEVER evidence. If the mapping is ambiguous,
return `blocked_evidence`/`requires_operator`, not a guessed date.
Preserve IDs, history, merges and the same `AGENTS.md` sanity checks.
Diff validation also rejects deletion or disabling of tests, introduction
of `.skip`/`.only`, weakened security gates, and unexpected changes to
workflows/auth/permissions. Test-quality semantics still require review.

**M4–M5: durable R1 state and schedule delays.** Current failure streak
bookkeeping comes from ignored `snapshots/*.state.json` restored from
Actions cache, which is not a durable source of truth. R1 stores its own
trusted state and differentiates `unknown` cache loss from a healthy run.
An observed Timeline run started ~5.5 hours late on Oct 27. For the
12-hour refresh cadence, test an initial *over-24-hour last-completed*
threshold as a candidate, not as universal truth. Check liveness of both
refresh and monitor; if both scheduled jobs stop, mutual checks alone
cannot notify anyone. A separate operator-visible/out-of-band liveness
strategy is a gate. Account for GitHub schedule disablement after
repository inactivity.

**M6: usage limits.** Subscription Pro allowance cannot be read before a
run; classify observed limit/auth responses and stop without partial PR.
The reviewed Timeline run used roughly 17k tokens, which is **not**
a valid estimate for tool-enabled R2/R3. Measure real costs at R2a,
set budgets and a blackout window around Tue/Sat Timeline, and avoid
overlapping expensive coding sessions.

**M7: public triggers and incident trust.** Start R2 only from an owner
`workflow_dispatch` initially; authenticated actor, incident state and
branch are checked in deterministic trusted code. Ignore issue comments as
machine-readable state. R3 may originate ONLY from the trusted R1
dispatcher and explicitly enabled kill switch, never public issue activity.

**M8: explicit bot PR CI.** Reuse proven Timeline pattern:
`gh workflow run ci.yml --ref <trusted recovery branch>` following
`GITHUB_TOKEN`-authored push. Match and await the **exact head SHA**,
record checks/results, then Draft PR + notify + STOP; green checks do
not authorize merge. This D0 PR itself also needs CI before merge.

**L9–L10: evidence boundaries and negative tests.** A working no-tools
OAuth call does not establish file edits, tool subprocess safety, WebFetch,
multi-turn coding or `claude-code-action` feasibility. Add scoped negative
tests in the appropriate pilot for malicious source prompts, secret in
artifact, unauthorized network/branch, missing date spans, normalized
timezone mistakes, deleted/skipped tests, lost cache, multi-hour cron
delay/disabled schedule, and concurrent triggers for the same incident.

**Acceptance / operator actions:** this design change does NOT enable
R1/R2/R3, set secrets, install rulesets, run new schedules or alter
production data. After independent re-review, R1a may be separately
authorized. R2a requires isolation and cost proof; R2b requires both
the writer's branch/date/CI guards and an explicit operator decision
on effective main-branch policy. R3 stays OFF until reviewed R2 runs.

## 7. Rollout: separate bounded implementation milestones

**D0 (this document): design + independent critical review, docs-only.**
Review existing patterns with the Claude agent that implemented the Timeline
integration; amend this contract until review findings are resolved. No run,
secret, GitHub variable, permission or runtime change in D0.

**D1 audit pilot — optional, separately authorized.**
Test one read-only new-version delta comparison against existing feed winners;
measure misses, WATCH accuracy, access constraints and agent cost. Do not add
an automatic LLM job or fold it into deterministic R1a without approval.

**R1a — deterministic minimum viable detection/incident flow.**
Start with a real ZZZ banner/events case and 1–2 other contrasting families.
Document coverage contracts grounded in actual current data; wire read-only
monitor + persisted-issue-state dedup/upsert. Replay successful/failed/
HTTP-200-stale, no-notice, expired-only, state-cache-loss-as-unknown,
5+ hour cron delay, disabled schedules, and monitor-heartbeat gaps. No Claude call.

**R1b (only if useful) — extend game/family contracts.**
Bring in remaining supported games from real coverage docs without blanket
recurrences or repeated source research; noisy families remain `watch`.

**R2a — headless coding-agent sandbox pilot.**
Reuse the existing Pro OAuth arrangement only in a hardened read-only job.
Test child-process token inheritance, runner/tool egress enforcement, malicious
source instructions, artifact secret scanning and token-free tools; measure
real usage. Isolation failure is NO GO; no production write credentials.

**R2b — manual Incident → D2 strategy → branch → Draft PR → CI → notification.**
Pilot at least one `reviewed_only` outcome with literal source date spans
and deterministic timezone conversions, plus one parser/family triage.
Test unsupported date, branch-main push attempt, test deletion/skip,
concurrent incident and exact-head CI dispatch. Independent acceptance
and merge must be requested in another session. Update docs/status only with
verified results. No auto-merge or auto-publish.

**R3 — automatic severe-incident escalation**, behind OFF-by-default
kill switch, only after stable incident classifications, proven branch/
credential isolation, measured usage, and two or more reviewed R2 recoveries. Strong agent, measured time/usage budget, incident
dedup, monitored completion; PR-only terminal condition.

Do not start R1/R2/R3 implementation because D0 is approved or merged.

## 8. D0 acceptance & reviewer questions

D0 is done only when its repository draft and this checklist have an
independent technical review, with reviewed issues resolved or explicitly
deferred. Reviewer must examine CURRENT code, not rely only on this prose:

1. Is R1 possible without false P0 alarms when official Phase II isn't announced
   yet? How are source-health vs user-visible coverage and scheduled-job health
   distinguished? Which actual current field/rule carries the evidence?
2. Can the existing subscription OAuth CLI securely support a **tool-capable**
   coding agent? What is and is not proven by Timeline? Is `claude-code-action`
   necessary, optional, or less secure in this repo?
3. Can GitHub issue creation, branch pushes, PR open/update and explicit PR CI
   work with least privileges and without creating loops? What exact permission
   configuration requires manual approval?
4. What is the smallest enforceable sandbox separating an untrusted source page
   from credentials, agent tools and GitHub write access? Is the proposed
   separate-write-job approach genuinely sufficient?
5. Is the incident lifecycle stable across reruns, source changes, historical
   snapshots, accepted corrections and production refreshes?
6. How to handle subscription exhaustion/revocation, action failures, GitHub
   scheduled-run gaps and failures *inside the monitor* itself?
7. Are proposed scopes and sequence minimal, preserving source precedence,
   stable IDs, exact per-region deadlines and fail-closed behavior?
8. Can D1 detect a known missing announcement but classify genuinely
   unannounced schedules as WATCH, without new incidents/LLM in R1? Can a
   cheap read-only version-delta pilot prove usefulness?
9. Does D2 correctly choose a one-off reviewed rescue, a repeat parser repair,
   or new durable endgame integration? Does it keep A (published current data)
   independent from B (prevention or explicitly tracked gap)?
10. Identify confirmed defects, unproven assumptions, missing test cases and
    a concrete narrow R1a next step; DO NOT implement R1a during design review.

**Expected review output:** PASS / NEEDS_CHANGES with findings ranked by
severity, exact code/doc references, minimal amendments and final R1a task scope.
**Operator handoff:** after an R2/R3 PR, the operator separately chooses
ChatGPT Work or Claude to critically review and (only if explicitly asked)
merge. A PR's creation, green CI or agent self-report is not authorization.

**Next concrete step:** independent review of this D0 design by the Claude
agent familiar with the Timeline OAuth integration. STOP after review; do not
bootstrap recovery workflows until R1a is separately authorized.

**D0 review handoff (2026-10-28):** Amendments above are DESIGN ONLY;
[Claude's NEEDS_CHANGES review](https://github.com/maxvfk/game-calendar/pull/113#issuecomment-6472175155)
requires focused re-review before D0 acceptance. This open PR is currently
reported `mergeable_state: dirty` against advancing main; reconcile on a
separate verified step and run exact-head CI before merging. Do not treat
a changed document as evidence that operational risk is fixed.
