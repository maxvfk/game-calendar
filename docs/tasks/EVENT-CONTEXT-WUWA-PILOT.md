# E1 — WuWa service-only source-excerpt extraction pilot

**Status:** READY FOR A SEPARATE bounded implementation Work; **not started**.
**Prerequisite design:** `docs/research/event-context-editorial-technical-design.md`
(D0 technical gate). Research:
`docs/research/event-context-coverage-audit-2026-10-25.md`.
**Source of truth:** then-CURRENT `main`, `AGENTS.md`,
`docs/IMPLEMENTATION-STATUS.md`, `src/ingest/parsers/wuwa-kuro-atom.ts`,
`src/ingest/merge.ts`, `scripts/build-feed.ts`, existing tests and
snapshot/fixture files.

## Goal

From the WuWa Atom `entry.content` already used by the live
`wuwa-kuro-mirror` adapter, deterministically extract **short factual,
event-local source excerpts** for the future unified Editorial Agent.
Store them in a generated **internal editorial evidence sidecar**,
never in `GachaEvent.summary`, `recognitionSubjects`, the public
`events.v1.json`, Timeline input or PWA UI.

This milestone provides trustworthy *input* only. It does **not**
produce `displaySummary` or use AI. The existing autonomous
Timeline agent continues completely unchanged.

## Implementation boundary

1. Add an optional pure WuWa evidence extraction function sharing
   the existing `articles` / `identity` / `period` / event-ID
   logic as appropriate. Preserve the current
   `parseWuwaKuroAtom(raw, ctx): GachaEvent[]` behavior and
   `SourceParser.parse()` interface.
2. From the **same snapshot bytes and ParseContext** used for WuWa
   feed extraction (or the same allowed fixture fallback), generate
   an untracked local sidecar such as
   `tmp/editorial/event-evidence.v1.json`. Do not put it under
   `public/`, commit full article excerpts, or add new fetches.
   Source URL must be the actual article detail URL. Follow the
   strict record/bounds/normalization/hash rules in D0.
3. Extract only an event's own immediately associated section:
   featured 5-star/4-star names, combat/exploration activity or
   reward claim. Never spill from adjacent event headings, a
   different banner, eligibility, banner pity rules or maintenance.
   Omit ambiguous fragments rather than paraphrasing or inventing.
   Pilot ceiling: up to 6 excerpts of at most 500 Unicode
   code points each, with **2,000 Unicode code points total** across
   all excerpts and sources. These are hard caps, not a target size;
   prefer concise clean excerpts, preserve meaning across boundaries,
   and verify both per-excerpt and total limits with tests.
4. Associate evidence with a final winner **only via proven same
   source+ID, same exact event ID, or an explicitly reviewed mapping**.
   Never use title similarity, shared article URL, same end date,
   inferred banner overlap or `mergeEvents` near-match as
   sufficient attribution. Keep unattached rows internal and
   diagnose them instead of delivering them to the agent.
5. Capture actual source/snapshot metadata or null;
   `evidenceHash` must be stable across refresh clocks, cosmetic
   markup and whitespace changes, and change when attributable
   facts genuinely change. No model text in the hash.
6. **Do not** change `summary`, `recognitionSubjects`,
   `timelineTitle`, `timeline-semantic-sha256-v1`,
   `data/presentation/timeline-labels.v1.json`, current schedule,
   kill switch, source access/robots behavior, merge decisions,
   date/precision/provenance, event ID policy, Account/Sync or
   user data. If a strict no-feed-diff guarantee requires
   incompatible changes, stop and report rather than widening scope.

## Evidence cases and tests

Replay the checked-in WuWa Atom snapshot and a small fixed fixture:
**Tomorrow in the Frame** (Lucilla),
**Undefined Spectrum** (Lynae),
**Freeze Frame** and **Spectrum Blaster** (distinct weapons), and
**Echo Erase** (event activity). These are source-evidence targets,
not desired new public labels.

Required offline tests:

- Every excerpt is attributable to exactly one source article,
  one extracted event ID and the correct heading/section. Verify
  adjacent simultaneous banners cannot share character/weapon names.
- Same-ID reviewed winner can receive a separately attributed
  evidence row; near-match of different IDs without an explicit
  mapping stays unassociated. Conflicting or duplicate context
  is diagnosed and safely omitted.
- No description, malformed HTML, misleading instructions,
  repeated headings, maintenance, eligibility-only text and
  long paragraphs fail closed or yield only bounded clean facts.
- Deterministic normalized text + evidence hash and **all hard caps
  (≤6 excerpts, ≤500 Unicode code points each, ≤2,000 combined)**;
  exercise Unicode, near-limit, over-limit and two-source examples.
  No capture/build clock in the content hash. Modified substantive
  evidence changes the evidence hash.
- **Byte-for-byte unchanged** generated `events.v1.json` and
  `timeline-label-queue.v1.json` under identical snapshots and
  fixed time; unchanged event count, all source/provenance and
  region end fields, no label requeue or registry change.
- Sidecar stays outside Pages/public assets and is not
  accidentally included by `bun run build`.
- No new HTTP access and no source-health changes.

## Deliverables and stop

- Small deterministic extractor + internal sidecar builder,
  schema and offline tests, grounded before/after examples,
  ambiguous/unavailable association diagnostics and repeatable
  fixed-input replay. Report measured excerpt lengths by event,
  truncation/cap hits, dropped useful facts (if any), and illustrative
  token-cost estimates. Do not tune limits further within E1 without
  evidence and a separate decision.
- Updated `docs/IMPLEMENTATION-STATUS.md` with actual
  test results and next concrete step.
- Follow `AGENTS.md`: `bun install --frozen-lockfile`,
  `bun run typecheck`, `bun test`, `bun run build`.
  Make a small branch, PR, review, merge and check post-merge CI.
- Stop after **E1**. Do not implement summary overlay,
  label provenance migration, combined AI prompt, NTE/HSR parsers
  or production enablement.

**Next concrete step after E1:** a separate E2 registry/provenance
contract milestone, not automatic continuation.
