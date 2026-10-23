# AI integration plan — DeepSeek-assisted Game Calendar

**Status:** proposal / parking lot — **not an approved implementation milestone**  
**Recorded:** 2026-10-23  
**Project:** `maxvfk/game-calendar`  
**Provider for automated API calls:** DeepSeek **V4.1 Flash 1017**, currently `deepseek-flash`  
**Scope:** future optional work; no runtime, feed, database, workflow or deployed behavior changes are authorized by this document.

## 0. Coordination and isolation

This document records a discussion and preserves the design direction for later coordination. **Do not queue, implement, enable, merge, schedule, or deploy this plan automatically.** Decide when to start via a separate coordinating conversation / explicit instruction.

- Current milestones and `docs/IMPLEMENTATION-STATUS.md` take precedence. In particular, the CZN Daily Reset safe cutover is an **independent** production-safety effort; its server/client protocol, staging prerequisites, backup/restore, rollout and gates are out of scope.
- Keep `AGENTS.md`, existing M1 recognition contract, accepted M2 Timeline behavior, Event IDs, User/Account Sync, Supabase, import/export, source-health alerts, CI and release procedure unchanged until a separately approved bounded implementation task.
- The proposal is intentionally outside `docs/tasks/`: its numbered steps below are **research/pilot candidates, not active milestones or commitments**.
- Production fetching/publishing must continue to work **without** AI, without a DeepSeek key, and offline for ordinary `bun run build`.

## 1. Product goals and economic decision

Two independent features may share one tiny, optional DeepSeek API integration:

1. **Assisted ingestion/review:** classify already-fetched source changes, identify possible omitted events or conflicting dates, prepare evidence-backed review candidates.
2. **AI presentation / Timeline labels:** generate short, comprehensible event names from source/reviewed metadata and human-readable presentation rules, **without repeatedly editing parsers**.

**One API provider only:** DeepSeek Flash 1017. No generic router, Decisions API, OpenAI/Anthropic/Gemini production API integrations, fallback chain or additional monthly subscription.

Why DeepSeek:
- Current `maxvfk/ai-workflow/AI_MODEL_CURRENT_STATE.md` (2026-10-20 addendum) recommends `deepseek-flash` for low-cost classification, transformations and technical second opinions.
- The owner already has **prepaid DeepSeek API credits**. Billing is separate from ChatGPT Plus and Claude Pro; credits are not unlimited. Set a per-project budget, request/token caps and usage logging before enabling scheduled runs.
- Use **low thinking** for simple classifications/rewrites and bounded **high** for ambiguous cases. The model currently defaults to high thinking, so specify effort explicitly. Do not hardcode model benchmark scores, API availability or prices as permanent promises; reverify before implementation.

Strong-agent escalation is **not** a paid background API tier:
- Routine scheduled processing: existing GitHub Actions + bounded DeepSeek calls.
- Ambiguous cases: durable **GitHub review queue** with evidence and impact, readable by a separate periodic **read-only** subscribed ChatGPT task/Work **where supported by actual account/product permissions and usage**.
- Difficult research, parser repair, disputed official dates, structural redesign and PR/CI: a separately started, explicitly scoped **ChatGPT Work** (or other subscribed agent) after review. Any scheduled task's abilities and consumption must be verified; **do not assume scheduling a task automatically launches a full Work implementation run**.
- Never let a scheduled AI review task autonomously authorize production changes, resolve data conflicts without evidence, or merge a PR.
- No reminder/scheduled Work task is created by this plan.

## 2. Current repository seams (verified 2026-10-23)

- `scripts/refresh-sources.ts`: source polling and snapshots, robots/API terms, conditional 304, six-hour minimum interval, last-known-good, broken-source handling.
- `scripts/build-feed.ts`: deterministic cached snapshot parsing, reviewed `data/reviewed/*.json`, merge, schema validation and `public/data/events.v1.json`.
- `src/shared/schema.ts`: immutable canonical `title`/Event ID relationship, optional `titleRu` and `recognitionSubjects`.
- `src/client/state/timelineContent.ts`: `recognitionIdentity()` currently displays `recognitionSubjects.join(" + ")` if present, otherwise `title`.
- `src/client/components/TimelineLabel.tsx`: existing compact TypeBadge, measured truncation, priorities, deadline/unknown/accessibility contracts.
- `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`: recognitionSubjects must be genuine, source/review-backed featured subjects, **never inferred from arbitrary marketing titles**.
- `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md`: preserve useful partial labels on narrow screens.
- `docs/INGESTION.md` describes a deliberate **no-LLM deterministic ingestion** contract; a later implementation must explicitly revise that documentation **only after** choosing an opt-in, fail-safe architecture. This plan itself does not supersede it.

## 3. Shared AI infrastructure — minimal, isolated

The design should be **simple, not a framework**:

- A server-side-only Bun/TypeScript adapter using `https://api.deepseek.com`, model `deepseek-flash`, configured timeout, token/output budget, effort, retry policy and usage accounting. Verify the exact request schema and current checkpoint at implementation time.
- `DEEPSEEK_API_KEY` in GitHub Actions Secrets only; no key, raw credentials, user profiles or private Supabase data in the PWA, tracked artifacts, AI prompt or logs.
- Validate model JSON strictly (e.g., Zod); bound response sizes and candidate counts; record model version/alias as observed, rules revision, input fingerprint, cost/token use and diagnostics where available.
- Accept **only already permitted, attributed and cached source content**. No bypass of robots, crawl intervals, access controls or site terms. Never send the entire feed merely to classify one event.
- GitHub Actions may run the AI phase when a source snapshot changes; **normal feed-build, tests and replay stay offline and deterministic**.
- Network failure, timeout, invalid JSON or missing key must never silently validate suspect dates, break unrelated-source refresh, remove last-known-good events, or create a publication bypass. Treat AI output as untrusted external input.
- Persist outputs as separate versioned review/presentation artifacts; no mutable model responses during browser rendering.
- Start with **one provider, two independent modules**, and a shared caller only where it genuinely reduces duplication.

## 4. Track A — Assisted ingestion and review triage

**Purpose:** prioritise source/document issues, not replace deterministic parsers or adjudicate official dates.

Inputs (minimal relevant slices):
- source URL, source/check timestamp, snapshot/change fingerprint;
- old and new candidate event fields, event ID, source provenance and parsed-count health;
- short, attributable excerpts supporting the candidate (or a compact diff).

Possible structured outputs:
- `category`: `routine` | `new_event` | `deadline_change` | `possible_parser_omission` | `source_conflict` | `source_health` | `uncertain`;
- candidate event ID/source references and **verbatim evidence quote / source URL**;
- review reason and proposed next action; model uncertainty is diagnostic only.

Safety:
- Deterministic rules still detect deadline discrepancies, parser zero, mass deletion, stale/failed sources and invalid precision.
- AI must **not** drop/approve events, invent years/times, promote `estimated`/`datamined`/`leak` to `official`, resolve conflicts silently, rewrite authoritative dates or override release gates.
- An AI `routine` classification never suppresses an existing deterministic review warning.
- Review results can become deduplicated GitHub Actions summaries and a separate queue artifact; no automatic issue-spam or unbounded repeated alerts.
- Known examples for offline evaluation: disputed CZN banner timestamps against STOVE, Endfield Echoes cycle source failures, NTE/Beyond the Rails naming/coverage. Use **historical fixtures/reviewed evidence**, not invented dates.

## 5. Track B — Human-language rules for Timeline titles

**Goal:** show concise, recognisable names without changing source parsers or semantic identities.

Store editable natural-language rules in a proposed file such as `data/presentation/timeline-rules.md`:
- Prefer the most recognisable event/mode/featured subject. Drop repetitive marketing copy, source-page prefixes, duplicate type labels and date phrases already displayed by Timeline.
- Keep meaningful distinctions: game mode, real phase/cycle/season numbers, rotation names, co-headliners, item/character identifiers and distinctions between simultaneous banners.
- Avoid gratuitous translations, invented abbreviations, new facts and hidden ambiguity. A shorter title is **not** better if it makes two different events indistinguishable.
- Example expectations for tests (illustrative, not authoritative existing feed records):
  - `Beyond the Rails — Rotation 4 — Whisper Circle (Sep 10)` → `Beyond the Rails · Whisper Circle` **only if rotation number isn't needed to disambiguate**;
  - `Stygian Onslaught — Season 12 (2026)` → `Stygian Onslaught · S12`;
  - `Echoes of War: Season of Phantasia — Cycle II` → `Echoes of War · Cycle II` **only if the season stays understandable in context**;
  - generic `Limited-Time Character Event Convene: Character A` → `Character A` **only with unambiguous, verified recognition**.
- Rule edits may request a **separate explicit regeneration** of old labels, showing an auditable diff rather than silently changing all Timeline labels.

**Important separation of meaning:**
- `title` is the canonical source title and is an ID input: **never change it for this feature**.
- `recognitionSubjects` is M1-reviewed factual metadata: **never generate/overwrite it heuristically via DeepSeek**.
- `titleRu` means localisation, not generic shortening.
- Evaluate an additive, optional **`timelineTitle?: string`** on feed events **or** a sidecar `eventId -> approved label` mapping. Choose after testing backward compatibility; avoid unnecessary schema churn.
- Candidate precedence for Timeline only: an **accepted** `timelineTitle` → verified `recognitionSubjects` → canonical `title`. Do not replace a verified, clearer recognition identity with an unreviewed AI guess.
- Keep canonical full title and meaning in Event Detail, accessible name/tooltip, source trace, and non-Timeline surfaces unless separately authorised.
- Existing M2 TypeBadge, date precision/unknown symbol, ellipsis, useful minimum identity, bar geometry, mobile widths, filters, viewport/zoom/Jump and browser back must not regress.
- AI output is computed **server-side on changed events only**, with input/rules/model fingerprint, stable deterministic cache and human-review path. Never call DeepSeek on each user page load. Invalid/uncertain outputs fall back to existing title logic.

## 6. Possible phased experiments — not scheduled milestones

**Pilot B first (safer): Timeline labels, shadow-only**
1. Take representative existing events from all seven games (including challenges, banners, phases, multi-subject cases) plus tricky fixtures.
2. Draft the natural-language rules and run Flash with low/high effort on the *same frozen inputs*.
3. Compare against current `recognitionIdentity()` and reviewed human expectations. Flag ambiguity/collisions, invented subjects, omitted season/cycle/phase and instability.
4. Save a report showing suggestions, before/after, rejected examples, cost, latency, prompt/version, input hashes. **No changes to feed or UI.**
5. Only after explicit approval, create a bounded implementation task/PR for approved label storage, deterministic build and UI integration; browser smoke on real phone/PC.

**Pilot A second: source-review classification, shadow-only**
1. Assemble a labeled dataset of real historical source changes, including negative/no-change cases.
2. Compare Flash at low/high against deterministic baseline with the same evidence and budget.
3. Measure critical misses (especially official deadline changes), false positives, review volume, failure behavior, time and dollars per useful review.
4. Add queue/reporting only if the model provides verified incremental value; **no automatic data approval/publishing**.

**Separately, if later wanted:** periodic subscribed read-only review of the queue, with user-authorised manual implementation Work for hard cases. This is an orchestration/product-choice decision, not part of either pilot.

## 7. Acceptance gates / evidence

- Prove old `events.v1.json` and cached client feeds without optional label metadata still work. No `eventId` change, progress/done loss, Supabase migration, sync/export regression or clock/provenance change.
- Identical approved snapshot + rules + saved AI artifact gives **byte-identical offline build**; keyless build passes.
- Zero silently accepted AI-only dates, zero loss of existing fail-closed release gates, zero AI authority over official provenance.
- Golden label cases retain semantic identity; **duplicate short labels must be detected** for concurrent/distinct events.
- Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build` on any implementation PR. Add real Chromium phone/desktop visual checks for labels; reserve final physical-device acceptance to operator.
- Write down false-positive/false-negative rates, baseline comparison, API spend, output/reasoning-token volume, per-category errors and model/effort; **do not set artificial numeric pass criteria without a measured baseline**.
- Review source-data rights, data sent to DeepSeek, caching/retention and secrets before enabling production calls.
- No unreviewed autonomous merge, production rollout, cron trigger or user notifications.

## 8. Decisions already recorded / deferred

**Accepted planning direction:**
- DeepSeek V4.1 Flash 1017 only as automated API model; use existing prepaid balance with explicit cap.
- Prefer simple classification and presentation assistance to autonomous date rewriting.
- Keep heavy investigation, code fixes and independent source research for separately authorised subscribed Work; periodic read-only review may be considered.
- Natural-language rules for Timeline titles; source title, IDs and M1/M2 semantics stay intact.
- Keep the work independent from all active project milestones, especially CZN.

**Still to decide before implementation:**
- `timelineTitle` in additive feed metadata vs versioned sidecar mapping;
- automatic approval rules (if any) for cosmetic label rewrites vs initial manual approval;
- precise rule precedence and ambiguity checks for `recognitionSubjects` and regional/multi-banner labels;
- persistent review queue format, ownership, deduplication and retention;
- API daily/monthly caps, retry behavior, data-redaction policy and GitHub Actions trigger;
- whether and how a subscribed periodic task can read the review artifact with the user's available permissions.

## References

- [Repository rules](../../AGENTS.md)
- [Current implementation status](../IMPLEMENTATION-STATUS.md)
- [M1 recognition contract](../tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md)
- [M2 accepted Timeline contract](../tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md)
- [Timeline label truncation acceptance](../tasks/TIMELINE-LABEL-TRUNCATION-FIX.md)
- [Existing ingestion documentation](../INGESTION.md)
- [Model-routing state in `maxvfk/ai-workflow`](https://github.com/maxvfk/ai-workflow/blob/main/AI_MODEL_CURRENT_STATE.md)
- [Official DeepSeek API docs](https://api-docs.deepseek.com/)
