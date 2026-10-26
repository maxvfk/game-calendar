# Event context + unified editorial agent — design draft (2026-10-25)

> **D0 technical design gate closed (2026-10-26).** The implementation-ready
> contract and next bounded task now live in
> `docs/research/event-context-editorial-technical-design.md` and
> `docs/tasks/EVENT-CONTEXT-WUWA-PILOT.md`. This document is the retained
> rationale and review discussion; superseded suggestions below must not be
> treated as current implementation instructions.

**Status: design only. No runtime implementation, changed workflows, new AI calls, or approved storage contract.** Complements `docs/research/event-context-coverage-audit-2026-10-25.md`. Current autonomous Timeline-label milestone is independent; do not interrupt its ongoing work or silently expand it.

## Product decisions already agreed

1. `summary` is **stable and user-facing** (Event Detail). Event-local source text is **service-only** and never included in the public `events.v1.json` feed.
2. The preferred end state is **one scheduled AI request per nonempty batch**, producing (where justified) an improved `summary` first, then a coherent `timelineTitle` based on the same evidence. Do not create a second scheduled AI process without demonstrating a need.
3. The existing canonical `title`, event IDs, dates, precision, source URLs/provenance, reviewed records and Account/Sync must not be rewritten by the editorial agent.
4. Input text is untrusted evidence, not instructions. Automatically writing unverifiable game facts is not acceptable; `null`/unchanged/fallback are valid outcomes.

## Current implementation facts and obstacle

- `src/shared/schema.ts` already has `summary: string | null` (max 500), `recognitionSubjects?` and optional `timelineTitle`; `EventDetail` displays `summary` directly.
- `src/presentation/timeline-labels.ts` computes `timeline-semantic-sha256-v1` from `{id,game,type,title,recognitionSubjects,summary}`. `buildTimelineQueue` and `applyTimelineLabels` rely on the *same* hash matching the published feed event.
- Current model schema and `data/presentation/timeline-labels.v1.json` accept only label/keep_original/needs_research. `build-feed.ts` merges parser and reviewed candidates before applying the label registry. Existing reviewed rows can win while containing less contextual prose than losing parser rows.

**Critical cycle:** if the agent's new summary is applied to the public feed before/after computing the label fingerprint, the next build can invalidate the freshly accepted label. A `sourceExcerpt` added to the same fingerprint creates an additional churn source. The editorial output must never be part of its own matching/review key.

## Recommended design to test, not yet final schema

### 1. Evidence extraction

Each source parser extracts a **short, sanitized, event-local factual excerpt** from its already permitted/captured document, retaining source identity/URL and a normalized evidence-content hash. No new fetch and no AI call in a parser. Include only relevant objectives/rewards/featured subjects; never spill adjacent events into one excerpt.

Store in a **separate auxiliary editor-input/evidence artifact**, not `GachaEvent` or `events.v1.json`. This is not a secret: files committed to a *public GitHub repository* are public even if omitted from Pages. Store only short necessary facts, not whole copyrighted articles; respect existing source/access conditions.

Determine the least invasive implementation seam in a bounded design task: parser-local extraction function + build pipeline sidecar, or another tested approach. Keep parsers pure/deterministic and preserve backward compatibility. Record origin even when the richer evidence belongs to a parser row that loses the final reviewed merge. **Do not automatically attach losing-source context to the winner by fuzzy title; require a provable identity link or explicit review mapping.**

### 2. Stable output and explicit editorial decisions

Keep canonical/reviewed `summary` untouched. Persist optional **editorial summary** separately, analogous to `timeline-labels.v1.json`, with a fallback to existing `summary`.

Two display implementations need comparison:
- additive `displaySummary?` on published feed, with `EventDetail` using `displaySummary ?? summary`; canonical `summary` and its existing fingerprint remain unchanged; or
- apply a reviewed editorial summary overlay to published `summary` after all label matching and input fingerprint checks, while still retaining a stable pre-overlay canonical event in the build pipeline.

Prefer the first if it demonstrably yields simpler independent validation/rollback. Do **not** assume the final field name until tests/compatibility review.

Never automatically replace a human-reviewed `summary` without an explicit override policy. In the first version propose to improve absent, generic, or clearly insufficient summaries; keep good summaries unchanged.

### 3. One AI invocation, separate validation

Provide event ID, base semantic identity, current summary, event-local source excerpt(s) with source provenance, recognized subjects and editorial preferences. In the same structured model response return independent decisions for (a) display summary and (b) timeline label. A missing/insufficient excerpt may produce `keep_summary`/unresolved without blocking a perfectly valid title decision; the reverse is also possible.

Validate both parts **independently**. Summary needs stronger evidence grounding (characters, numbers, rewards, timing, eligibility, certainty, misleading cross-event claims) than copy-only Timeline labels. Keep source excerpt available to validator but not as a fact invented by the model. If a proposed label relies on a rejected new summary, only accept it if *independently supported* by trusted canonical input/excerpt; otherwise fallback. No mandatory manual review for ordinary valid output, but stage rollout behind shadow tests.

The agent may be instructed to compose the summary then the title, but a **single model response does not guarantee procedural execution order**. Measure paired accuracy against a real sample; only consider two model calls if a controlled evaluation demonstrates a material quality advantage.

### 4. Keys, invalidation, idempotency

Retain existing Timeline fingerprint semantics until a versioned migration is accepted. Introduce an independent **source-evidence version/hash for review triggers** (normalized event-specific excerpt). Keep the model-written summary and title out of the matching fingerprint. Source formatting-only changes should not cause endless reprocessing.

Propose separate per-field states/review keys so that:
- a missing/changed summary can be considered **even after timelineTitle was decided**;
- a valid label need not be re-run just because `sourceExcerpt` changed cosmetically;
- `needs_research` can be revisited when materially new evidence appears;
- a correction/rollback of one field does not overwrite the other;
- empty-queue detection handles the **union** of outstanding summary and label work;
- summary and label can commit within one validated, auditable batch and deploy together.

The exact strategy for base fingerprint vs evidence-change trigger is an **open technical design decision**. Do not change the stable `eventId()` or overwrite `data/reviewed/*.json`.

### 5. Risks to test before turning on unattended summaries

- Evidence provenance loss when `mergeEvents` chooses another source (especially reviewed records).
- Character/item mix-ups across simultaneous banners or multi-event announcement sections.
- Hallucinated claim passing a superficial novel-word check; require explicit structured evidence when possible.
- Current legitimate summaries that explain uncertainty/provenance being replaced with overconfident language.
- Long source excerpts expanding Claude Pro usage; bound event context per item and report actual token usage.
- Repo-public vs feed-private storage and copyright/attribution considerations.
- Failed candidate summary and accepted title leaving an incoherent combination; document partial accept behavior.
- Compatibility with cached old PWA clients and the current `EventFeed` schema.

## Recommended bounded sequence

1. **Design gate (next):** resolve sidecar/association, independent review keys and public editorial-summary overlay; write a focused technical spec/tests plan with representative source/winner/label cases. This is not an implementation.
2. **WuWa evidence pilot:** change **only** WuWa extraction to an auxiliary sourceExcerpt with strict same-event boundaries and a fixed snapshot test; no AI summaries, no change to `summary`/existing fingerprints. Update `docs/tasks/EVENT-CONTEXT-WUWA-PILOT.md` after the gate.
3. **Unattended dual-output shadow pilot:** reuse the same headless Claude runner (one call) on a bounded batch, structured paired JSON, sidecar validators and before/after quality report; no auto-publishing of summaries yet.
4. **Production enablement:** conditional on an actual green end-to-end rehearsal, stable keys, rollback and source-provenance protections; explicit operator approval. Label-only scheduling may proceed independently under its existing gates.
5. Add NTE Steam and HSR evidence extractors in **separate** later milestones based on measured gains.

**Next concrete step:** technical design gate in a fresh short-lived Work, while the existing Claude Code Timeline automation continues its original scope. No need to stop or restart that work merely to share these approved product principles.

## Review notes (2026-10-26) and operator sequencing

**Sequencing (operator decision):** finish the autonomous Timeline-label milestones first
(`docs/tasks/TIMELINE-LABEL-AUTONOMOUS.md`: token fix and probe, M1, M2, M3.5 rehearsal, M4). Start
the summary work (design gate, WuWa evidence pilot) only after that. The Timeline work keeps its
own scope and does not wait for this design.

Evidence for the motivation: a Sonnet quality check of the 2026-10-25 queue (25 events, the
probe's system prompt and agent input) found 15 of 25 events without `summary`; 11 of 25 went to
`needs_research` for lack of evidence, and none had invented content. The bottleneck is input
evidence, not the model.

1. **Pick the additive display field.** Prefer `displaySummary` (Event Detail shows
   `displaySummary ?? summary`) over overlaying `summary` after matching. The canonical `summary`
   and the label fingerprint then never change, and rolling back one summary means removing one
   record. The overlay variant hides the same fingerprint cycle inside the build and is easier to
   get wrong.
2. **Guards check model output only against untrusted *source* input, never against other model
   output.** The novel-word and claim guards for both labels and summaries must use canonical
   event fields plus `sourceExcerpt`, and must never use `displaySummary` or any text the model
   wrote in the same or an earlier run. Otherwise one response can invent a fact in the summary
   and "ground" the label on it. This rule also applies to the Timeline `accept` step now (M2).
3. **Requeue `needs_research` when evidence appears.** If label automation goes live first, events
   without evidence are recorded as `needs_research` and stay decided while their fingerprint is
   unchanged. Revisiting them needs the independent evidence key from section 4. The label registry
   schema is strict, so add an optional `evidenceHash` (or equivalent) only through a versioned
   migration in the summary work. Do not change the registry schema in the Timeline milestones.
   Not recording `needs_research` at all is worse: those events would spend tokens on every run.

   **Addendum (2026-10-26, label automation going live first):** the requeue covers
   `keep_original` too, not only `needs_research`. For an opaque event without a summary the model
   flips between the two across runs (both probes showed it), so either record can mean "not
   enough evidence". When an event gains new evidence (its evidence key changes), requeue it if
   its decision is `keep_original` or `needs_research`. An approved `label` stays put unless the
   operator asks otherwise. Automatic records are identifiable from the bot's registry-only commits
   (`data(timeline): record automatic label decisions`), which the migration can use if it should
   treat them differently from operator-reviewed ones. Cost is small: about 500 tokens per event.
   **Operator decision (2026-10-26, after Timeline M4):** the future
   editorial decision contract must explicitly and durably distinguish
   **human-reviewed/approved** from **automatically accepted** decisions.
   Use a validated, versioned origin field or a corresponding typed sidecar,
   **not** Git authorship/commit history as the sole lasting provenance.
   The existing `timeline-labels.v1.json` has no per-decision origin field:
   prepare a conservative and reviewable migration of legacy entries;
   unknown origin must not be silently presumed automatic. On material
   evidence changes, automatically reopen automatic `keep_original` and
   `needs_research` only. Protect explicitly human-reviewed choices unless
   the operator requests a re-review; keep approved `label` untouched.
   This is a **future design constraint**, not authorization to edit the
   running Timeline workflow or registry now.
   *Refined after D0 review (2026-10-26):* operator-approved
   `needs_research` is reopened too, since it means "waiting for evidence";
   a null evidence key at decision time counts as changed; and the
   migration counts every automatic bot commit, not only `c0b933f`. See
   `event-context-editorial-technical-design.md` sections 4–5.
4. **Keep the original summary visible.** Like the title (Event Detail shows the AI title with
   "Original title"), an AI summary needs the canonical `summary` reachable in Event Detail, for
   example "Original summary" in a collapsible block. The Timeline M1 layout should leave room for
   this pair.
5. **Bound excerpt length with a test.** Files in the public repository are public even when not
   deployed to Pages. Set a hard per-event `sourceExcerpt` length limit with a test. It protects
   Claude Pro usage and keeps excerpts short and factual for copyright reasons.
