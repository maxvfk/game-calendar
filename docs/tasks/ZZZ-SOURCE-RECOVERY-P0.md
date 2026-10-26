# P0 — ZZZ unattended source recovery after Version 3.3 coverage emergency

**Priority: P0 (core-game feed degradation). Status: READY, NOT IMPLEMENTED.**
Start from then-current `main`, `AGENTS.md`, and
`docs/IMPLEMENTATION-STATUS.md`.
Initial verified restore:
[PR #105](https://github.com/maxvfk/game-calendar/pull/105) added
13 official Version 3.3 reviewed events/banners (from 17 → 30 reviewed
records); **do not repeat that hotfix or alter its proven deadlines without
new official evidence**.

Root cause: `zzz-game8-events` in
`src/ingest/adapters/index.ts` is `scheduled: false`, because
the Actions runner received CloudFront HTTP 202 instead of usable Game8
content. No other scheduled ZZZ source exists. The manually reviewed
`data/reviewed/zzz.json` stops advancing automatically. This problem
will recur on a future version unless source ingestion is restored.

## Source-grounded baseline

- Historical coverage/access audit:
  `docs/research/coverage-zzz.md`. The September 3.2 notes are historical,
  **not a current-event list**.
- [Official ZZZ Version 3.3 announcement (2026-10-21)](https://zenless.hoyoverse.com/en-us/news/166963):
  eight limited events and dates (some server-local) and explicit
  version end.
- [Official Version 3.3 Phase I channel notice (2026-10-19)](https://zenless.hoyoverse.com/en-us/news/166926):
  four separately named banners, the associated trial and a Phase I
  deadline.
- [Official event detail](https://zenless.hoyoverse.com/en-us/news/166946)
  and [later event detail](https://zenless.hoyoverse.com/en-us/news/167038)
  are spot-check candidates.
- `docs/research/zzz-recurring-endgame.md`: Shiyu Defense / Deadly Assault
  historical biweekly anchors disagree with observed September 2026
  cycles. **Do not enable cadence-based generation without new evidence**.
- Relevant code:
  `scripts/refresh-sources.ts`, `.github/workflows/refresh.yml`,
  `.github/workflows/source-probe.yml`,
  `src/ingest/robots.ts`, snapshots, parser/adapter and merge/reviewed
  paths, relevant tests. Existing source-health gating applies.

## Milestone goal

Make current and newly announced ZZZ limited-time **events and banners**
update automatically and reliably in the existing feed, without
manual per-version edits and without compromising source permissions
or source/data provenance.

### Gate A — actual runner access and evidence before implementing a parser

1. Inspect current code, refresh health, source histories and latest
   available source outcomes. Do **not** assume browser/web-index
   accessibility means GitHub Actions can fetch HTML.
2. From the actual GitHub Actions runner with the project's declared
   User-Agent, probe `robots.txt` first, then (only if allowed)
   the **official** ZZZ news index and a small bounded sample of
   individual official detail pages. Record actual HTTP statuses,
   content types, body structures, redirects, conditional-header
   behavior and HTML/sample hashes in a concise research artifact.
   Avoid copying entire copyrighted announcement pages into Git.
3. Check whether the canonical stable news index exposes discovery of
   *new* announcement URLs without manual IDs. Individual article
   parsing alone does **not** satisfy the unattended-refresh goal.
4. Evaluate a compliant alternate **primary** surface if direct
   official-site access is denied/unusable (for example official
   publisher news distributed to Steam), but verify the surface,
   robots/access rules and actual GitHub Actions response first.
   Do not treat a fan calendar as automatically official. Game8
   stays disabled on repeated HTTP 202. No captcha/Cloudflare bypass,
   `catchSpider` workaround, disguised UA, undocumented API, or
   incompatible robots override.
5. Record confirmed facts vs hypotheses. If no suitable compliant
   discovery + detail source is runner-accessible, **do not add a
   pretend-working parser**. Publish a clear blocked access report and
   a bounded, evidence-backed fallback plan; leave PR #105 and M4
   unchanged. Do not call a fixture-only result production automation.

### Gate B — only if Gate A passes

1. Implement a **single source family** with verified access:
   deterministic bounded discovery + event-detail fetch/parse,
   with approved request intervals, conditional requests, real
   capture timestamps and source health. Keep the scope to ZZZ
   version/event/channel notices; do not crawl unrelated pages.
2. Parse several separately named banners from one phase notice,
   event durations and rewards from update/detail notices, without
   crossing article/event boundaries. Preserve server-local timing:
   accurate Asia/Europe/America regional end instants, honest start
   precision, no inferred maintenance completion, no invented phase
   clocks or year.
3. Preserve existing `eventId()` and reviewed IDs; compare against
   PR #105's now-published 3.3 records, avoid duplicate winners on
   cross-source merges, and keep official reviewed overrides available
   as last-known-good. Do not rewrite previous reviewed records.
4. Reuse `SourceParser`, `ADAPTERS`, `SnapshotStore`, `RobotsCache`,
   `mergeEvents` and existing refresh/CI guards as appropriate.
   One source outage cannot silently blank ZZZ or mutate an
   unrelated game's feed. Zero or sharp-drop conditions must be
   reported/blocked according to project rules.
5. Prove at least one reproducible **real Actions runner** refresh of
   the newly integrated source with nonempty ZZZ results and
   successful feed/CI; merely passing fixture tests is insufficient.
   Demonstrate discoverability of a *newly announced* event without
   hard-coding its numerical news ID. No second source scheduler.
6. Add offline snapshot/fixture regressions for the actual HTML/JSON
   surface, four banner distinctions, version event boundaries,
   duplicate reviewed→parser merging, source outage/LKG, unchanged
   unrelated feed/event IDs, server-region date mapping and
   source access guard. Keep raw captured sources out of public
   event-feed text.

## Scope exclusions

Do not modify Timeline M4 AI schedule/registry, E2a prepared v2
provenance migration or E2b displaySummary; do not add AI/API.
Do not automatically generate Shiyu Defense, Deadly Assault,
Periodic Conquest or other unresolved recurring clocks from old
anchors. Treat current endgame re-anchoring as a separately scoped
follow-up research/implementation task.
Do not inflate the scope into all-game source discovery.

## Delivery and checks

- Short-lived branch from fresh main, narrow commits and PR, completed
  `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`,
  `bun run build`. Obtain review/CI and merge only when supported
  by real runner access and tests. Verify post-merge CI/Pages.
- Report (a) runner evidence/robots verdict and official source URLs,
  (b) current event/banner coverage before/after and expected update
  mechanism, (c) source failure/recovery behavior, (d) any remaining
  coverage gaps or unsupported conditions, and (e) run/test links.
- Update `docs/IMPLEMENTATION-STATUS.md` with actual results and
  **Next concrete step**. If Gate A fails, report **BLOCKED** and
  retain the manually restored PR #105 coverage; never claim auto
  ingestion is repaired.

**STOP after this bounded ZZZ source-recovery milestone.** Do not
start recurring-endgame re-anchoring, Timeline v2 cutover or E2b.
