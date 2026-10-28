# Source Recovery R1–R3 — monitoring, assisted and autonomous repair

**State:** DESIGN DRAFT FOR INDEPENDENT REVIEW; implementation NOT authorized.
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
  protection, publish production data, or deploy.** An **independent** ChatGPT
  Work or Claude review is a distinct operator-requested task, which may produce
  corrections and merge only after its own explicit authorization.
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

- Idempotent by deterministic `incidentKey`, not timestamp or a randomly
  changing issue title. Update an existing issue instead of creating alerts on
  every schedule or every 304. Preserve operator discussion and old evidence.
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

Trigger is an explicit manual `workflow_dispatch` or trusted repository Issue
action referencing an existing **confirmed** incident ID; not arbitrary issue
text. Standard workflow:

1. Independently re-fetch CURRENT main + Issue evidence and validate age,
   severity, incidentKey, scope and existing linked PR/runs. Refuse stale,
   resolved, duplicate or ineligible requests with an actionable report.
2. A bounded read-only triage checks existing working sources and prior research,
   then admissible alternative official/secondary sources without repeating
   known blocked access experiments.
3. Run approved live source probes on a GitHub runner (normal UA, permissions,
   robots, rate limits, no challenge or hidden API); preserve hashes, dates,
   method and conflicting evidence, not bulk republished articles.
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
6. A **separate write-capable job without Claude subscription credentials**
   may commit only policy-allowed paths and create/update a DRAFT PR; carry
   changes as reviewed artifacts from sandbox, not by granting the LLM
   direct write access to protected `main`.
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
  duplicate incidentKey / existing PR / active job / subscription availability,
  and event-impact classification. Never follow instructions in source HTML.
- Higher agent budget and iterative research/repair/tests, but an explicit
  timeout, max tool calls/turns, allowed domains, network request caps, and
  per-day/per-week run ceilings. Avoid starving Timeline labels' shared
  Claude Pro usage. Precise budgets are a later measured pilot decision.
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
monitor + dedup/upsert Issues; replay successful/failed/HTTP-200-stale,
no-notice, expired-only and missed-run cases. No Claude call.

**R1b (only if useful) — extend game/family contracts.**
Bring in remaining supported games from real coverage docs without blanket
recurrences or repeated source research; noisy families remain `watch`.

**R2a — headless coding-agent sandbox pilot.**
Reuse the already-proven Pro OAuth secret, test a *tool-capable* session on a
controlled synthetic source outage using an isolated branch and no production
write credentials. Demonstrate scoped network, bounded usage and no exfil.

**R2b — manual Incident → D2 strategy → branch → Draft PR → CI → notification.**
Pilot at least one `reviewed_only` outcome and one justified parser/family
triage (including a valid decision not to rewrite a parser). Independent
acceptance and merge must be requested in another session. Update docs/status only with
verified results. No auto-merge or auto-publish.

**R3 — automatic severe-incident escalation**, behind OFF-by-default
kill switch, only after stable incident classifications and two or more
reviewed R2 recoveries. Strong agent, measured time/usage budget, incident
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
