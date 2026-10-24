# Timeline labels L1 — deterministic infrastructure and agent-ready queue

**Status:** approved coordination direction; **implementation not started** (2026-10-25).  
**Type:** one bounded implementation milestone.  
**Repo:** `maxvfk/game-calendar`.  
**Next phase:** L2 scheduled-agent pilot and cadence **only after a separate operator decision**.

## Decision / why this milestone exists

The operator selected Timeline-label quality as the next product milestone. The independent critical audit is **intentionally deferred until the operator considers the product sufficiently ready**; do not treat it as an L1 prerequisite. The draft [DeepSeek AI plan in PR #68](https://github.com/maxvfk/game-calendar/pull/68) remains parked; do not merge, modify or implement it in L1.

Goal: allow a periodic subscribed ChatGPT/Claude agent to **receive a small preassembled batch of only unreviewed or semantically changed events, and propose concise Timeline identities**. All extraction, deduplication, hashing, eligibility, formatting, validation and deployment remain deterministic Bun/TypeScript. No AI call, prompt orchestration or paid provider is needed for L1.

The operator does **not** want a per-event boolean in the source event schema or an agent re-reading the repository at every run. Instead derive the effective review status from a versioned **Git-reviewed decision registry + semantic fingerprint**. Decisions are global editorial data, not per-user preferences.

## Start / authority

Start from **CURRENT `main`**, not a branch or SHA in this task.

Read:
- `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md`;
- `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`, accepted M2 UX and `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md`;
- `src/shared/schema.ts` (`GachaEvent`, `eventId`, `recognitionSubjects`), `src/shared/custom.ts`, `src/shared/feed.ts`;
- `src/client/state/timelineContent.ts`, `src/client/components/Timeline.tsx` and relevant label/accessibility tests;
- `scripts/build-feed.ts`, `src/ingest/merge.ts`, current build/CI workflow and `package.json`;
- `data/reviewed/README.md` and `docs/INGESTION.md` only for existing invariants.

Use one short-lived implementation branch, focused commits, PR, post-merge CI/Pages and a factual `IMPLEMENTATION-STATUS` update. Do **not** reopen M1/M2 or completed CZN work.

## Deliverable A — reviewed editorial decisions (Git, no Supabase)

Create a versioned, schema-validated sidecar, suggested location:

`data/presentation/timeline-labels.v1.json`

This is distinct from `data/reviewed/*.json` (the latter concerns **event facts and source provenance**, not copy-editing). Keep it independently reviewable. Suggested initial shape (illustrative IDs/fingerprints; **not real feed records**):

```json
{
  "schemaVersion": 1,
  "decisions": [
    {
      "eventId": "example-event-id",
      "fingerprint": "sha256:EXAMPLE",
      "decision": "label",
      "timelineTitle": "Example · Phase II",
      "rulesVersion": "v1",
      "reason": "Recognisable phase; decorative prefix removed"
    }
  ]
}
```

An empty initial registry is valid. The required semantics are:

- `label`: an **approved** nonempty `timelineTitle` (max 200 chars and suitably compact). Only approved records from a merged PR affect the feed.
- `keep_original`: agent/human explicitly reviewed this same semantic input and accepted the current M1 identity. Do not generate a `timelineTitle` and **do not enqueue it again** unchanged.
- `needs_research`: insufficient reliable evidence. Do not fabricate a label; park the same fingerprint outside the routine queue until inputs change or explicitly requeued. Surface separately as unresolved with reason; it must not trigger repeated costly attempts.

Decisions must have unique `eventId`, safe type/length constraints, a fingerprint, a nonempty rules-version identifier and a bounded optional reason. Enforce decision-specific shapes (e.g. `timelineTitle` required only for `label`). Reject duplicate IDs, malformed/untrusted records, unapproved/unknown decision kinds and incompatible schema versions. No implicit acceptance of generated AI proposals; a separate PR/review step in L2 supplies approvals.

Do not mutate title, `titleRu`, `recognitionSubjects`, source/reviewed records, dates, IDs, progress/completion or provenance.

## Deliverable B — stable semantic fingerprint

Implement a pure canonical fingerprint function, documented and unit-tested, for a final merged published `GachaEvent`. Proposal:

```text
fingerprint = sha256(stableJson({
  fingerprintVersion: 1,
  id, game, type, title,
  recognitionSubjects: ordered array or [],
  summary: normalized text or null
}))
```

- Use **fixed field order** and explicit normalization; do not hash mutable `updatedAt`, `firstSeenAt`, feed `generatedAt`, source polling timestamps, last-confirmed metadata, ingestion bookkeeping, model timestamp or generated presentation label.
- Changes to semantic content (including genuine summary changes) make the prior decision inapplicable and the event eligible for fresh review. A mere snapshot 304/rebuild or deadline-only change does **not** reprocess the event.
- Do not include `timelineTitle` in its own fingerprint (no self-invalidating loop).
- A new Event ID is a new review identity; never fuzzy-transfer a prior decision across IDs, reruns or seasons.
- Keep `rulesVersion` recorded per decision for audit, but **do not automatically requeue all approved events merely because editorial rules changed**. Future explicit bounded re-review can target them.
- If an old registry decision is stale or no longer has a matching published event, preserve it in Git for traceability, show diagnostic counts, but never apply it to unrelated events or silently delete it.
- Provide a stable fingerprint contract and tests, rather than relying on source `updatedAt` as an input-change signal.

The implementation may refine the exact fingerprint input set **only when a concrete collision or missed semantic change is demonstrated**, documenting the reason; do not enlarge to full event records or introduce a generic hashing framework.

## Deliverable C — final-feed application and truthful fallback

Only after the normal automatic/reviewed/recurring-event merge produces **final winning event IDs**, look up approved matching decisions. Add an optional presentation-only public field `timelineTitle?: string` to `GachaEvent` (or to a strictly validated additive feed-view adapter if the current type boundary requires it). It must never influence `eventId()`, near-match/merge, ingest source selection, reviewed winners or generated recurring IDs.

Timeline identity precedence for **a currently approved, fingerprint-matching** decision:

```text
approved timelineTitle → genuine recognitionSubjects → canonical title
```

No accepted label or stale/invalid fingerprint: M1 `recognitionSubjects` / `title` behavior remains unchanged. Do not present an unreviewed candidate as approved. `keep_original` produces no display override; `needs_research` produces no display override.

Preserve canonical `title` in Event Detail, existing accessible names/tooltips and source links. When a short label differs from `title`, both identities remain discoverable for accessibility; preserve type, urgency, known/day/unknown end semantics, ellipsis, sticky fit, scroll/zoom/Jump/Upcoming/filters and phone/desktop behavior. Custom/user-authored events and older cached feed objects with no `timelineTitle` must continue to work.

The normal offline build must remain keyless, network-free and produce valid data without **any** accepted label or available AI agent. No inference at runtime.

## Deliverable D — zero-model-cost queue generator

Create a small deterministic Bun script/module and integrate it with the existing **post-merge final feed/build**. Suggested output:

`public/data/timeline-label-queue.v1.json`

It is intentionally public; include **only fields already safe and publicly visible**. It may be read directly by a future scheduled agent without checking out or interpreting the source code. The queue must come from the validated final feed, not raw HTML or pre-merge candidates. Do not expose credentials, private Supabase data, user preferences/daily marks, leak-only rows or custom/private events.

Expected machine-readable content:
- queue `schemaVersion`, fingerprint/rules contract identifiers, count(s), a bounded ordered `events` batch (suggested default max **25**), and count of remaining eligible items;
- each candidate: `eventId`, semantic `fingerprint`, game, event type, canonical `title`, current M1 display identity, ordered `recognitionSubjects` if any, a short bounded `summary` if available, current start/end context and precision **for disambiguation only**, and a single existing `sourceUrl` (already public) for **optional** later research;
- deterministic stable ordering, prioritize **current and upcoming** published events, urgent near deadlines, then future. Historical/expired events are not a default agent workload; do not delete any accepted historical decisions;
- no entire feed dumps, no HTML, no source-poll logs, no complete project docs, no broad prompt history in the queue.

Eligibility:
- `label` / `keep_original` matching the current fingerprint: excluded;
- `needs_research` matching the fingerprint: excluded from routine batch but counted/reported separately;
- absent/stale decision: included if eligible for current/future review;
- records after batch cap: remain counted and eligible for later runs;
- use source precision/regional ends conservatively; never invent completion timestamps to determine expiry. An event with unknown end cannot be assumed expired.
- when empty, emit an explicit valid **zero-item queue** and no false “work pending” status.

Provide a pure mode with a fixed explicit evaluation time (for deterministic test snapshots), and ensure identical final feed + registry + as-of time produces byte-identical queue; no volatile random IDs or current-run logs. CI may use the feed's `generatedAt` as the consistent as-of time. Normal build must include the queue in deployed assets. Preserve existing refresh gating and CI/Pages structure; do not add another scheduler.

## Deliverable E — local acceptance/validation seam

Implement a deterministic validator (and test fixtures) capable of validating a future agent's proposed decisions **before they are accepted**:

- exact `eventId` and semantic fingerprint must match a current queued entry; unknown IDs, duplicate IDs, wrong/stale hashes, forbidden field changes and unexpected statuses fail;
- trimmed valid labels, length limit and optional conservative diagnostics for lost phase/cycle/season, relevant co-headliners and false certainty;
- duplicate/confusable approved labels in **overlapping same-game events** are at minimum reported for review; conservative fail-closed for clearly ambiguous duplicates. Disjoint reruns may legitimately reuse an identity. Do not pretend model output alone proves semantic correctness;
- proposal validation must not write to production; only a reviewed sidecar update followed by tests/PR/merge may publish;
- malformed sidecar must fail CI/build rather than silently ignore. A well-formed stale per-event decision is safe to skip and requeue, not a source-health failure;
- harmless `keep_original` must not create a new field in feed; `needs_research` must not loop back into routine queue;
- all existing Event IDs and completion associations stable before/after application; no timestamps/dates/provenance changes;
- coverage of zero decisions, one accepted label, old feed compatibility, later semantic revision, deadline-only change, repeated identical refresh, reintroduced historical event and rule-version-only change;
- browser-responsive regression at 320/390px plus desktop, both grouping modes, long/short labels, accessible full title and preserved M2 navigation/viewport semantics.

Do not build a general prompt-runner, issue bot or PR automation in L1. It is acceptable to keep the validator as a simple importable Bun module/CLI that L2 can reuse.

## Usage and operational constraints

- **No model calls** (ChatGPT/Claude/DeepSeek), LLM keys, image work, external search, Web Fetch, agent orchestration, scheduled task or GitHub mutation bot in L1.
- Keep preprocessing purely deterministic so the **agent need only read one compact prepared file plus short editorial rules** in L2.
- Avoid a public feed-wide rerender due solely to unapproved AI suggestions. No frontend API invocation.
- No SQL, Supabase/Auth/Sync/backup migrations, user data changes, CZN policy changes, new source adapters or unrelated cleanup.
- No self-approval or automatic merge. L2 must separately validate scheduled-agent capabilities, GitHub write permissions, limits, no-work behavior and actual usage. Prefer two runs/week **only as an unapproved starting hypothesis**.
- No global critical audit in this milestone; operator deferred audit until product readiness. No other milestone starts automatically.
- Keep PR #68 in its existing parked/draft state.

## Tests, documentation and finish line

Run the four obligatory checks:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

Also run focused queue/fingerprint/sidecar tests, an offline replay from a fixed feed with stable bytes, and relevant real-browser label smoke. Check that CI produces the queue at the deployed Pages path. If any mandatory check is not run, state it explicitly rather than declaring full acceptance.

Update `docs/IMPLEMENTATION-STATUS.md` **after implementation** with actual file paths, acceptance evidence, PR/CI/Pages, compatibility, and any limits. Distinguish implementation/merge/deploy from final optional physical phone/PC smoke by the operator. No speculative completion entries now.

**L1 accepted when:** default app/feed is unchanged with an empty registry; a synthetic approved matching sidecar label appears in Timeline without changing event facts or IDs; review statuses correctly suppress costly repeats; changed semantics and stale hashes safely return to the queue; a ready-to-consume bounded public queue is built deterministically; tests/CI/Pages succeed.

**Next concrete step after L1:** independent **L2 agent pilot**, initially shadow/review-only on representative real event batches, short editorial rules, no unreviewed auto-merge. Scheduling comes only after verifying provider-specific unattended execution and usage with the operator.
