# Development workflow — risk-gated pilot

**Status:** pilot, 2026-11-02. Applies to *future* milestones, not retroactively to C1a.1 PR #161. This policy is self-contained for Codex, Claude Code and other coding agents; choose actual models and effort separately. No cross-repository access required.

## Goal and proportional gates

Recent C1a.0/C1a.1 audits exposed defects at boundaries between structural parsing, markup, date evidence, matching, and filesystem paths. The hypothesis is that an *adversarial design review before high-risk coding* can expose missing invariants and discriminative tests earlier. Savings are not yet proven.

- **Low:** documentation, isolated UI polish, small regression on an unchanged contract. Implement + relevant tests/CI; do not require an expensive review.
- **Medium:** bounded feature with known state and reversible behavior. Record risk assumptions and negative tests; use focused independent code review when useful.
- **High:** source parsing/normalization, date extraction, trusted evidence/provenance, event IDs/migrations, server-day semantics, offline/cloud synchronization, auth/RLS, backups, irreversible changes, or public-data publication. Require an independent **read-only design review before implementation**, a preliminary code review and a separate independent final merge-safety review. The coordinator may authorize a documented exception.

Classify by consequence of an unnoticed error and uncertainty, not code size. Existing accepted architecture stays in force unless a confirmed defect changes its assumptions. **An Implementer must not self-launch paid model reviews or broaden a milestone.**

## High-risk design gate

Start from CURRENT main, AGENTS.md, relevant code, tests and the milestone's canonical task/spec. The Design Reviewer challenges the *contract*, not the implementer's coding style. Its output must contain:

1. **Invariants / negative guarantees** — for example no confidently wrong deadline, no hidden unmatched date certified as processed, no loss of reviewed identity or provenance.
2. **Failure-mode matrix** — realistic malformed/ambiguous input, markup boundaries, timezone precision, state reorder, stale sync, filesystem indirection, and interactions relevant to the milestone. Show impact and evidence strength.
3. **Discriminative acceptance tests** — end-to-end positive/negative counterexamples as well as unit tests; ensure a flawed implementation fails.
4. **Open decisions** — only real product/architecture choices to bring to the coordinator. Distinguish reproduced facts, code-derived risks and hypotheses.

The coordinator accepts the bounded invariant/test contract and records it in the relevant docs/tasks/ spec or PR discussion **before coding**. Reviewers do not impose speculative rewrites or resolve product decisions silently.

## Implementation and review

- **Implementer** (Codex, Claude Code, etc.): use an authorized short-lived branch/PR, minimal scope, existing project architecture, compatibility and AGENTS.md data rules.
- Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`. Add domain-specific tests, feed/report, fixed-clock public byte parity, E1/C0 sidecar parity, exact-head CI and PG17/encrypted recovery where relevant. Never misrepresent skipped checks.
- **Preliminary Reviewer:** independently check code and tests for concrete defects; provide file/line, actual vs expected, severity and smallest correction. Favor cost-effective targeted review.
- **Final Reviewer:** independently inspect the *stabilized exact head* and challenge false-confidence paths beyond the preliminary findings. CI success is not review approval.
- For confirmed defects, implement minimal changes, then **focused** re-review of those fixes and interactions. Repeat the entire audit only if architecture/risk assumptions substantially change.
- Merge only after confirmed blockers are resolved, mandatory exact-head checks succeed, and coordinator/operator authorizes merge. Update docs/IMPLEMENTATION-STATUS.md on substantial milestone closure; do not begin C1b, Daily Passes or another milestone automatically.

An unavailable reviewer/test is a documented limitation, not assumed approval. Keep the status of existing PRs unchanged until their own reviews finish.

## First pilot and metrics

Use on the next separately authorized high-risk milestone (candidate: Daily Passes PASS-1, owing to server-day, offline sync, undo and backup interaction). Over several milestones compare confirmed defects found before vs after implementation, re-review cycles, false positives and observed usage, without inventing cost data. Simplify the gates if overhead outweighs the benefit.

Generic optional reference: maxvfk/ai-workflow/skills/risk-gated-development/SKILL.md. This document remains the authoritative local policy for game-calendar.