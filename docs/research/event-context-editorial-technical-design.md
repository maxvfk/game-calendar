# Event Context / unified Editorial Agent — technical design gate

**Status: design accepted for bounded implementation planning, NOT implemented.**
**Baseline:** `main` `533be83639b5cc2ca1a7032e9b7f4edcb8438c9e` (2026-10-26).
**Related:** `docs/research/event-context-unified-editorial-design.md`,
`docs/research/event-context-coverage-audit-2026-10-25.md`,
`docs/tasks/TIMELINE-LABEL-AUTONOMOUS.md`,
`docs/tasks/EVENT-CONTEXT-WUWA-PILOT.md`.
This spec resolves the design gate only. It is **not** permission to begin the combined
agent rollout, the NTE/HSR parsers, or any production automation changes.

## 1. Design decisions

1. **Source evidence is not user-facing:** deterministic parser-local extraction
   provides bounded `sourceExcerpt` evidence for an internal/offline editorial
   sidecar. Neither excerpts nor the evidence sidecar go into `GachaEvent`,
   `events.v1.json` or the Pages public assets. The repository, Actions
   artifacts and any committed files are still **publicly accessible**; never
   treat absence from Pages as secrecy.
2. **Canonical copy remains stable:** `summary` stays unchanged. A future
   optional `displaySummary?: string` (max 500) is additive to the feed;
   Event Detail uses `displaySummary ?? summary` and, when both differ and the
   original exists, offers a collapsed **Original summary** block. If
   `summary === null`, do not render a fake original.
3. **One model call per nonempty union batch** is the default future design:
   the agent may decide independently on `displaySummary` and `timelineTitle`.
   Do not make two scheduled processes or duplicate the source context for each
   output. A single structured response is not proof of step order: quality
   must be evaluated in a shadow run.
4. **Separate field decisions:** approval/rejection and requeue for copy and
   labels are independent. Keep the existing live Timeline registry, semantic
   fingerprint, queue and schedule unchanged until an explicit migration gate.
5. **Explicit durable origin:** human-approved, automated, and legacy-unknown
   editorial decisions must be distinguishable inside validated, versioned
   data — never by Git author/history alone. Unknown origin is **protected**,
   never silently interpreted as automated.
6. **Grounding:** canonical source fields and attributable, event-local
   source excerpts may justify copy. AI-written `displaySummary`, any other
   model output, and a prior AI label **never** serve as evidence. The
   current novelty/word guard is necessary but **not sufficient** to prove
   factual correctness of a paraphrase.

## 2. Extracted evidence: proposed `event-evidence.v1` internal contract

Do **not** change the existing `SourceParser.parse(): GachaEvent[]` interface
during the first pilot. Add an optional **parallel, pure extraction helper**
for the given source (WuWa first), sharing its event-boundary/date helpers
rather than reimplementing event identity.

The offline evidence builder consumes exactly the source bytes/snapshot or
allowed fixture that the feed builder used for that source, plus the same
`ParseContext`; it does not make HTTP requests and cannot bypass source
health or parser-zero controls. It produces a local, untracked internal
artifact (e.g. `tmp/editorial/event-evidence.v1.json`) for the model
job and deterministic validators. Never write it under `public/`.
Snapshots stay the source of reproducibility; do not commit duplicates
of entire announcements. CI may retain only **bounded** evidence in an
explicit short-lived artifact, after access/copyright review.

Candidate strict record shape (illustrative, to be validated by Zod
during implementation):

```json
{
  "schemaVersion": 1,
  "entries": [{
    "sourceEventId": "wuwa:tomorrow-in-the-frame:2026-10-22",
    "sourceId": "wuwa-kuro-mirror",
    "game": "wuwa",
    "sourceUrl": "https://wutheringwaves.kurogames.com/en/main/news/detail/5668",
    "capturedAt": null,
    "excerpts": [
      {"kind": "featured", "text": "5-Star Resonator: Lucilla, 4-Star Resonators: Lumi, Danjin, and Chixia receive boosted drop rates!"}
    ]
  }]
}
```

`capturedAt` above is an **illustrative placeholder, not a verified
capture timestamp**. The actual builder must copy real snapshot metadata,
or use `null` when unavailable; never synthesize freshness.

- Strict **pilot ceiling** (operator decision, 2026-10-26):
  **up to six** distinct event-local excerpts,
  **≤500 Unicode code points per excerpt**, **≤2,000 Unicode code
  points total per event**, **≤2 source documents** after verified
  association. Enforce the **combined** text limit across sources and
  excerpts; six excerpts are *not* permission to exceed 2,000.
  Measure by Unicode code points (not JavaScript UTF-16 code units);
  validate hard bounds and edge cases in tests. Source identity/URLs
  and metadata have separately bounded lengths. No raw markup, images,
  navigation, whole maintenance post, or instructions. Prefer concise
  400–800-character context for simple events, **without padding**.
  On overflow, prioritize attributable facts (featured subjects, activity,
  rewards), preserving exact names, numbers and important qualifiers;
  do not blindly take the first N characters or split facts mid-sentence.
  These are initial safety ceilings, **not quality targets**. After the
  first real E1 extraction runs, report per-event lengths, cap hits,
  omitted material, downstream token use and semantic usefulness
  before proposing another limit change.
- Excerpt `kind` is `featured`, `activity` or `rewards`, describing
  *what is quoted/extracted*, not a model classification of the event.
  Keep exact names, numbers, negations and qualifiers; sanitize markup
  and normalize whitespace/NFC without inventing a paraphrase. Omit
  ambiguous material rather than mixing nearby sections. The whole
  record is *untrusted external data* to the model even after cleaning.
- Source URL must identify the actual announcement/article, not only
  the aggregated mirror URL. Source identity is independent from the
  final winning event's provenance.
- Use a stable **`evidenceHash`** (SHA256 over fixed-order canonical JSON
  of verified event association plus normalized ordered `kind`/text and
  source IDs/URLs; include hash-contract version). Deliberately exclude
  `capturedAt`, build clock, refresh timestamps and cosmetic HTML.
  The schema/extractor version is recorded separately; bump the hash
  contract only for intentionally changed hash semantics. No model output
  ever participates in this key.
- Missing excerpt is **absence of evidence**, not proof of the contrary.
  Source outage must not be treated as a material zero/empty update or
  erase last-known-good decisions.

## 3. Exact association after merge — **fail closed**

The existing `mergeEvents` in `src/ingest/merge.ts` matches by exact ID
**or** near-match of title/start for *different sources*; it returns only
winning whole events and date conflicts, **not merge lineage**. This is
the main place where evidence can be misattributed.

Associate an evidence record with a final feed event only if:

- the final winner's own `sourceId` **and** exact `eventId` match the
  extracted source candidate; **or**
- `sourceEventId === finalEvent.id` even if a reviewed record won,
  provided game/type/source reference are validated and there are
  no conflicting candidates; **or**
- an explicit Git-reviewed per-event identity mapping pairs source
  event ID and final event ID with source identity, without fuzzy
  name-only inference.

No automatic evidence transfer on `titleSimilarity`, `titleExtends`,
same start/end clock, approximate merge match, or shared article URL
alone. Those may only **flag a proposed mapping** for separate review.
When duplicates/conflicting sections exist, omit association and
diagnose; do not change merge outcomes, winner provenance, dates or
`eventId()`. Preserve unattached source evidence for internal
diagnostics only, never as an eligible agent input for a different event.

**Cases to prove:** same-ID reviewed winner with parser evidence; different-ID
near-merged source with no mapping (omit); same article containing two
simultaneous banners; an explicit approved mapping; a source conflict;
unavailable source; and unchanged feed + label queue bytes for the
evidence-only pilot. If lineage tracing becomes necessary, add a
*diagnostic-only* trace without altering `MergeResult.events` or
winner selection — separate reviewed implementation.

## 4. Independent editorial registries and origin migration

**Label registry:** keep `data/presentation/timeline-labels.v1.json`,
its `timeline-semantic-sha256-v1` and current `record.sh` in production
until a separate, rehearsed **v2 migration**. The v2 record keeps the
existing `eventId`, `fingerprint`, `rulesVersion`, decision and
approved label plus a validated `origin`:
`operator_approved | automated | legacy_unknown`, and for every
non-label decision a nullable `evidenceHashAtDecision` (null when the
decision was made without source evidence, which is true of every
decision recorded before E1). A `legacy_unknown` entry is
conservatively protected. The original
label fingerprint remains based solely on canonical
`{id,game,type,title,recognitionSubjects,summary}`, **never**
`sourceExcerpt` or `displaySummary`.

**Migration baseline:** PR #87 contains the original **25 operator-reviewed
decisions**. Automatic decisions are **every** registry-only commit by the
scheduled/manual Timeline workflow up to the migration commit, not only
the first one (`c0b933f64ccb6bc3e579dc6855ebf7a32022b4ad`, 25 decisions):
the Tue/Sat schedule keeps adding them until E2 lands. Identify them once
at migration time by author `github-actions[bot]`, subject
`data(timeline): record automatic label decisions`, a diff touching only
`data/presentation/timeline-labels.v1.json`, and only added or
fingerprint-replaced records; each record is attributed to the commit
that last wrote its exact `eventId` **and fingerprint**. Any registry
change in the same window by another author or commit shape needs
explicit operator classification. Materialize the result into a
checked/validated migration manifest keyed by exact `eventId` **and
fingerprint**, with record-count/content checks per source commit; do
not query commit history at runtime. Entries still not unambiguously
classified become `legacy_unknown`. The migration can use Git history once as evidence,
but must persist its result in versioned data. While migrating, never
let v1/v2 publishers both accept/write labels. Test a rehearsal build
and a rollback to v1 before switching the live workflow.

**Summary registry:** separate Git-reviewed
`data/presentation/editorial-summaries.v1.json`, one active record
per `eventId`; state `display | keep_original | needs_research`,
`origin`, immutable base input fingerprint, last reviewed
`evidenceHash` (nullable), optional bounded `displaySummary` only
for `display`, and a short reason. The summary decision must not
change the label fingerprint or canonical reviewed file. A good
human-reviewed canonical `summary` is protected by default;
automated improvements to reviewed content require a separately
approved allowlist/policy, not a broad rewrite. No summary when
there is no attributable source evidence and no sufficiently
specific canonical fact.

**Fallback:** the eventual feed gets optional
`displaySummary?: string` only for matching validated editorial
summary records. Event Detail uses it instead of `summary` and offers
`Original summary` on demand when the latter is non-null and
different. Old cached feeds without `displaySummary` remain valid
under additive schema v1 rules. Custom/user events are excluded.
On changed canonical fingerprint, the overlay is stale and falls
back. On materially changed **verified** evidence, do not continue
publishing a possibly outdated AI summary until it is revalidated
(the canonical `summary` remains available). Source outage alone
does not invent a new evidence hash; expose diagnostics rather than
rewriting editorial history.

## 5. Queue, requeue, and single-call behavior

Future unified queue = deterministic union of **label work** and
**summary work**, bounded once by the same total event cap (initially
25); include per-event `labelRequested` and
`summaryRequested` flags. Reuse canonical fields, v1 label
fingerprints, validated source evidence with explicit provenance,
existing reviewed preferences, and separate summary rules.
The model returns exactly one structured per-event response with
independent field decisions (or `not_requested` for that field);
it must not rewrite a decided protected label merely because summary
is due.

- **Evidence-only requeue** happens when the current verified
  `evidenceHash` is non-null and differs from the recorded
  `evidenceHashAtDecision`. A null recorded key counts as different:
  "no evidence at decision time, evidence now" is the main case, and
  it covers every decision recorded before E1. A source outage that
  yields no evidence never requeues. Eligible decisions:
  - `automated` `keep_original` and `needs_research`;
  - `operator_approved` `needs_research` as well, because that
    decision means "waiting for evidence", not a reviewed choice.

  Protected on evidence-only changes: every `label` regardless of
  origin, `operator_approved` `keep_original`, and every
  `legacy_unknown` decision. A label still changes only when the
  canonical fingerprint changes under existing rules or an operator
  explicitly reopens it.
- Summary `display` applies only when base fingerprint and reviewed
  source-evidence hash still match. `keep_original` suppresses repeat
  work until the base/evidence key meaningfully changes. Do not retry
  unanswerable `needs_research` on every scheduled run. An event
  with a decided label may be queued for summary **without** a new
  label decision.
- Validate label and summary **independently against fresh `main`**
  with a newly extracted evidence sidecar. Check exact event/ID, base
  fingerprint, evidence association/hash, source trust/provenance,
  invariants, duplicates, text bounds and forbidden claims. Never
  validate a label against a newly generated or previously
  AI-written summary. A rejected summary may coexist with an
  independently supported label; if a label depends **only** on
  rejected AI text, reject that label as well.
- A summary's polished text cannot be fully fact-checked by a
  word-list guard: use concrete supported source spans for every
  name/number/reward/time claim, reject unsupported strong claims,
  measure semantic mismatches in shadow samples, and fail closed
  for ambiguous paraphrases. This is not a formal proof of factual
  entailment. No production AI-summary publishing until the
  shadow/rehearsal quality gate explicitly passes.
- Keep the existing `propose` (read-only, the only job with the
  Claude token) versus `record` (write, no Claude secret)
  separation, fresh-main retry, single schedule, audit log,
  rollback and kill switch. Treat editor expansion as a
  versioned replacement/evolution of the existing workflow,
  **not** a second concurrently writing scheduled workflow.
  Migration/rehearsal must prove **no change to M4 behavior**
  before enabling summary output.

## 6. Delivery milestones and test gates

**D0 — this document only.** No code, network, AI, runtime,
registry, schedule or production feature-flag writes.

**E1 — WuWa evidence-only pilot (next separately bounded implementation):**
refine `docs/tasks/EVENT-CONTEXT-WUWA-PILOT.md` and implement one
pure source-local extractor + internal sidecar. Replay checked-in XML
and current snapshots with fixed `now`. Ensure zero diffs to
`events.v1.json`, `timeline-label-queue.v1.json`, label registry,
event IDs, dates, precision, provenance, and PWA UI. Test two adjacent
featured banners, weapons, gameplay event, unknown/short blurb,
missing source, source conflicts, exact-ID reviewed winner, near-match
misassociation, hard length bounds, normalized hash stability and
minimal captured provenance. No AI or scheduled workflow edits.

**E2 — independent editorial data contracts and controlled migration:**
Zod schemas, explicit origin manifest, protected unknowns, v1/v2
coexistence rules, independent summary overlay and fallback; schema
compatibility and old-PWA/browser smoke. Prefer one small milestone
for label-origin migration and a separate one for displaySummary UI
if implementation complexity warrants it. No automatic summary write.

**E3 — unified read-only Sonnet shadow pilot:** one model call per
union batch; paired JSON, per-field accept diagnostics, evidence
checks, source-boundary confusion tests, prompt-injection negative
cases, control input with null summaries, stable reviewed-summary
preservation, no invented claim. Report token use and comparative
quality against the label-only baseline; no write to production.

**E4 — rehearsal and optional production enablement:** explicit
operator approval after passing E1–E3, full dry-run
record/build/CI plus rollback drill, progressive enablement behind
an independent summary-publishing switch (label-only M4 remains
functional). No second schedule or new paid API provider.

**Future:** NTE Steam and HSR evidence adapters, each an independent
milestone justified by post-WuWa quality measurements. Do not
start them in E1.

### Acceptance for this design gate

- All listed decisions and known risks trace to concrete
  current code: `parseWuwaKuroAtom`, `mergeEvents`,
  `GachaEvent`/`EventFeed`, `semanticFingerprint`,
  `acceptTimelineProposals`, `build-feed.ts`,
  Event Detail and existing M4 workflow.
- No runtime/registry/scheduler change in D0.
- Only the **E1** implementation task is made ready.
- Relevant audit evidence and future tests are recorded so a
  new Work can start from GitHub without older chat context.

**Next concrete step:** E1 — implement only
`docs/tasks/EVENT-CONTEXT-WUWA-PILOT.md` from then-current `main`.
Stop after one parser and its internal evidence sidecar; do not
start E2/E3/E4 automatically.
