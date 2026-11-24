# Practical Parser & Auto-Labels Plan

**Status:** ACTIVE DIRECTION (adopted by operator on 2026-11-21; **revised 2026-11-24**, see
[Revision 2026-11-24](#revision-2026-11-24-current-order) — it sets the current order; the
2026-11-21 step list below is kept as the original record).
**Supersedes / freezes:** the remaining unbuilt stages (`C1b.1`, `CTX`, `C1b.2`, `C2`, `C5.3`) of [`SOURCE-COVERAGE-SIMPLE-SCHEME.md`](SOURCE-COVERAGE-SIMPLE-SCHEME.md). Completed [`C0`](https://github.com/maxvfk/game-calendar/pull/152), [`C1a.0`](https://github.com/maxvfk/game-calendar/pull/159), and [`C1a.1`](https://github.com/maxvfk/game-calendar/pull/161) remain intact as offline diagnostic tooling and are not reopened. Does **not** require Timeline Registry v2 cutover (draft [PR #115](https://github.com/maxvfk/game-calendar/pull/115)).
**Unchanged rules:** `AGENTS.md` data safety (never guess missing year, time, or end date; preserve `eventId` and `localStorage` keys; keep `official` / `estimated` / `datamined` / `leak` separate).

## Why pivot (confirmed findings on 2026-11-21)

An independent strategic review of the Source Coverage roadmap against `main` (`9977f17`) and November snapshots confirmed four concrete issues:

1. **Auto-labels already work in production, but parsers strip the context they need.**
   `timeline-labels.yml` + DeepSeek Flash (`reasoning_effort=max`) are live (e.g. `381e111` recorded 21 decisions), and `semanticFingerprint()` in `src/presentation/timeline-labels.ts` already reads `recognitionSubjects` and `summary` directly from `GachaEvent`. However, `kqm-ginews.ts`, `wuwa-kuro-atom.ts`, `kqm-hsrnews.ts`, `nte-steamnews.ts`, and `zzz-steam-rss.ts` emit `summary: null` without `recognitionSubjects`. As a result, DeepSeek repeatedly falls back to `keep_original` with `"No summary or recognition subjects supplied; no truthful alternative can be built from the input"`, leaving opaque banner titles (`"Chanson of Many Waters"`, `"Emerald Sentence"`) instead of featured characters/items.
2. **Single-patch parser hardcodes decayed on the next version.**
   October recovery fixes hardcoded patch-specific titles (`Azurelight`, `Moontrace`, `Starlight Voyage`, `Cubie Wars`, `Patch Notes for Wuthering Waves Version ...`). By 2026-11-21, repeating families in current snapshots were missed again: Genshin Phase II weapon banner (`21982`), v7.2 Battle Pass (`21974`), exploration mission (`21971`), unquoted `Stygian Onslaught` (`21168`, including its earlier `Disturbance Outbreak` cutoff), dateless `The Grand Defense` (`21969`), HSR `1451` / `1480`, WuWa `5786`, and unquoted NTE `City Logistics Limited-Time Event` (`1849827110423083`).
3. **Real gaps and outages occur outside the 5 article feeds and in liveness.**
   56%+ of the October recovery wave and 100% of November manual data rescues (`#169`, `#170`, `#173`) were outside the 5 article feeds (32 of 35 active `data/reviewed` entries on 2026-11-21 are in ZZZ, CZN, and Endfield). Meanwhile, `zzz-zenlessgg-banners` has had no confirmation since `2026-11-11` and `endfield-wikigg-echoes` since `2026-11-14`, while November also hit CI/Pages deployment stalls (`#168`, `#181`).
4. **The remaining `C1b → CTX → C1b.2 → C2 → C5.3` chain has negative ROI for one operator.**
   - `C1b.1` would fail on Day 1 because ZZZ Steam RSS oscillates image CDN hosts (`akamai` ↔ `fastly`) every 12–24h, invalidating `contentHash` on 6/10 baseline notices and creating ~25–30 marketing/noise triage items per 20 days.
   - `C4`'s raw `contentChangedAt` diff is contradicted by per-fetch Sentry trace (`czn-prydwen-banners`) and RSS generation timestamp (`zzz-steam-events-official`) churn across 39 refresh commits in 20 days.
   - `C1a.1` + `CTX` + `C1b.2` builds a High-Risk reporting-only negative-proof engine (15/714 spans matched on Nov 5; 0 spans detected on `genshin 21969`) that still cannot certify multi-event patch notes without heavy manual span ignoring.
   - `C5.3` autonomous event commits to `main` carry unacceptable risk to deadline accuracy and `localStorage` `eventId` stability for ~3–5 missed notices/week.

## Revision 2026-11-24 (current order)

Review of this plan against `main` `66b0f29`, the committed snapshot metadata, the Timeline
label ledger and November workflow runs. The direction and the freeze stand. What changed:

**Done or no longer true.**
- PR #0 merged as [#185](https://github.com/maxvfk/game-calendar/pull/185) and PR #1 as
  [#186](https://github.com/maxvfk/game-calendar/pull/186) (2026-11-21).
- `zzz-zenlessgg-banners` is healthy again (confirmed 2026-11-24). Only
  `endfield-wikigg-echoes` is stale: last confirmed 2026-11-14, last content change
  2026-11-12.

**Why the order changes.**
1. *Publication liveness is the most frequent observed failure.* A test that pinned the live,
   mutable Endfield snapshot turned CI red and stopped Pages from 2026-11-21 to 2026-11-23
   ([#187](https://github.com/maxvfk/game-calendar/pull/187)); the same failure made the
   2026-11-23 `timeline-labels` run fail to record. Several other tests still assert live
   snapshot content/conflicts (for example `test/genshin-phase-ii-precision.test.ts`). Pages/CI
   stalls also occurred in #168 and #181, and GitHub's scheduler is late: the `23 4 * * *`
   labels job started at 12:41 and 14:56 UTC on 2026-11-22/23. Decoupling `bun test` from
   mutable snapshots plus an external dead-man check is cheaper and higher-impact than PR #2.
2. *A new stale-source alert must start from a clean green baseline.* Launching continuous
   `lastConfirmedAt > 48h` alerting while `endfield-wikigg-echoes` is already 10+ days stale
   would cause immediate alert fatigue, so resolving `endfield-wikigg-echoes` belongs right
   after liveness rather than waiting behind template refactors.
3. *The label policy needs a clear rule before further label work.* The ledger holds 185
   decisions (134 `keep_original`, 39 `label`, 12 `needs_research`). PR #1 grew the eligible
   queue from 5 to 24 events. Open [#175](https://github.com/maxvfk/game-calendar/pull/175)
   records that a label can hide the official name (3 of 28 non-banner labels share no word
   with it, though most recent non-banner labels already use the `Official Name: <what it is>`
   pattern). A deterministic guard fits this better than an open-ended watchlist item.
4. *Most manual rescue work is outside the five article feeds* (finding 3 above: all November
   rescues, 32 of 35 reviewed entries in ZZZ, CZN and Endfield), yet the old PR #2 targets
   those feeds. ZZZ, CZN and Endfield need an explicit routine, while parser template work
   should stay strictly scoped to recurring patch templates.

**Current order** (each step a small PR or an operator action; none starts automatically):

1. **Liveness in this repo (was PR #3, widened).**
   - Dead-man ping at the end of `ci.yml`'s `pages` job, gated on
     `publicationStalled()` returning `null` (it returns `null` while publication is current
     and an object when stalled; evaluated in `build` and passed to `pages` without adding
     checkout/Bun to `pages`; clean up stale Gitea comments in `ci.yml` at the same time).
   - Continuous per-source `lastConfirmedAt > 48h` alerting through a low-noise operator
     channel (for example, a single self-updating GitHub Issue that opens/updates on stale
     sources and auto-closes on recovery, or an external monitor ping — never failing Pages
     deploys and never buried only in build logs). `lastConfirmedAt` lives in the gitignored
     `snapshots/*.state.json`, which GitHub CI only restores from cache; on a cache miss every
     source looks stale. Evaluate the alert where that state is written (`refresh.yml`), or
     treat a cache miss as "unknown", never as "stale".
   - Decouple `bun test` from content/conflict assertions on mutable `snapshots/*`: move those
     assertions to immutable `test/fixtures/` (as in #187), while live `snapshots/*` remain
     checked by `build:feed`, `Feed sanity`, and non-blocking drift reporting. Start with an
     inventory: about 13 test files read `snapshots/*`, and some (for example
     `test/refresh.test.ts`) may read them on purpose; move only assertions on mutable content.
2. **Resolve `endfield-wikigg-echoes` (micro-PR).**
   - Repair, replace, or cleanly retire `endfield-wikigg-echoes` immediately after step 1 so
     the `>48h` stale-source alert starts at zero red sources.
3. **Label policy decision on the [#175](https://github.com/maxvfk/game-calendar/pull/175)
   case (and close/supersede #175).**
   - Primary candidate: featured subject(s) for banners; for non-banners, either
     `keep_original` or preserve the official name, usually as a prefix
     (`Official Name: <what it is>`), checked by a deterministic guard/warning in
     `labelDiagnostics()` (`src/presentation/timeline-labels.ts`). The guard should check that
     the label *contains* the official name, not that it starts with it: accepted labels such
     as `Echoes of War: Season of Scattering` put a category first.
   - Alternative candidate: featured-subject labels for banners only, official names kept
     verbatim for all non-banner events.
4. **Narrowed PR #2 (recurring templates + ZZZ/CZN/Endfield routine).**
   - Generalize **only** the 3–4 templates that repeat every patch (Genshin Phase II
     `Epitome Invocation` weapon table, Genshin Battle Pass `"..." Event Details`, Genshin
     `Stygian Onslaught` + `Disturbance Outbreak`, NTE unquoted `... Limited-Time Event`). Do
     not chase one-off prose notices (`The Grand Defense`, HSR `1451`/`1480`, WuWa `5786`);
     handle those via `data/reviewed/*.json` or optional `C5.1-lite`.
   - Record a per-version/phase check for ZZZ, CZN and Endfield (what to look at and where it
     lands in `data/reviewed/*.json`), or a targeted clean source where one exists.
5. **Optional `C5.1-lite` probe**, unchanged, and use it to measure real missed notices per
   week; the "3–5 per week" figure in finding 4 is an estimate, not a measurement.

**Parallel operator / external-infra actions** (independent workstreams; do not block steps 1–5):
- **Daily Passes production acceptance** (operator, manual) with
  [`DAILY-PASSES-SMOKE.md`](DAILY-PASSES-SMOKE.md), adapting pre-activation flag-on/off steps
  to live production — authenticated sync and one real in-game reset boundary.
- **Private encrypted-backup workflow success ping** (the narrow monitoring part of deferred
  S6b, living outside this public repo's `ci.yml`), so a stopped backup is noticed without
  coupling step 1's PR to private backup infra.

The 2026-10-28 scheme said "summaries come after C4" because a missing event breaks the
calendar's main question and wording does not. PR #1 already shipped; this revision restores
that priority for the remaining steps.

## Practical 4-step plan (original, 2026-11-21)

Goal: **working, resilient parsers + informative daily Timeline auto-labels with minimal development and manual maintenance.** Each step is a small, independent PR.

### PR #0 (merged as #185) — Freeze heavy queue & run auto-labels daily
- Freeze `C1b.1`, `CTX`, `C1b.2`, `C2`, and `C5.3`; record this plan in `docs/`.
- Switch `.github/workflows/timeline-labels.yml` from `23 4 * * 2,6` (Tue/Sat) to `23 4 * * *` (daily 07:23 Moscow / 04:23 UTC). An empty queue makes zero API calls.

### PR #1 (merged as #186) — Revive Timeline auto-labels via parser context
- Populate `recognitionSubjects` (for banners: featured character/weapon names from headings/intro lines) and concise factual `summary` (1–2 source lines describing activity/rewards) in `kqm-ginews.ts`, `wuwa-kuro-atom.ts`, `kqm-hsrnews.ts`, `nte-steamnews.ts`, and `zzz-steam-rss.ts`.
- **Hard invariant:** `eventId`, `startsAt`, `endsAt`, `regionEnds`, `startPrecision`, `endPrecision`, and `regionScoped` remain byte-for-byte identical on all existing fixtures and snapshots, verified by dedicated invariance tests.
- Changing `summary` / `recognitionSubjects` updates `semanticFingerprint()` automatically, allowing `timeline-labels.yml` to re-label existing active events and immediately show character/item names on banners.
- *Risk-gated note:* Operator-authorized scope on `src/ingest/parsers/*` under the explicit invariance contract (zero date/ID changes).

### PR #2 — Generalize repeating parser templates + resolve stale sources (split into steps 2 and 4)
- Replace one-off October hardcodes in `kqm-ginews.ts`, `wuwa-kuro-atom.ts`, and `nte-steamnews.ts` with general structural matchers for repeating templates:
  - Genshin: Phase II `Epitome Invocation` weapon table, Battle Pass `"..." Event Details`, `Stygian Onslaught` + secondary `Disturbance Outbreak` cutoff, and similar repeating structured notices.
  - NTE: unquoted `... Limited-Time Event` headers (`City Logistics`).
- Inspect live behavior of the two currently stale sources (`zzz-zenlessgg-banners` since `2026-11-11`, `endfield-wikigg-echoes` since `2026-11-14`) and either repair, replace, or cleanly retire broken external feeds.

### PR #3 — Minimal liveness (simplified `C4`; widened, now step 1)
- Move the external dead-man heartbeat ping to the end of `ci.yml`'s `pages` job, gated on `publicationStalled()` returning `null` (from `src/shared/feed.ts`), so one ping verifies refresh + CI + Pages deployment without relying on noisy `contentChangedAt` diffs or false-fresh docs-only deploys.
- Surface any individual scheduled source with `lastConfirmedAt > 48h` continuously (not just on the single `newlyBroken` transition).

### Step 4 (optional 1-day read-only probe) — `C5.1-lite`
- Only after PRs #1–#3, optionally test DeepSeek Flash in read-only mode on recent new/edited notices + parser outputs to see whether a compact human-reviewed miss digest is worth posting to an issue. Never auto-commit AI-extracted events to `main`.

## Handling games/families outside the 5 article feeds

For gaps absent from tracked article feeds (CZN non-banners, Endfield official announcements/banners, regular HSR Warps, ZZZ banners if `zenlessgg` is retired):
- **Low-effort default:** a brief periodic check per new version/phase to update `data/reviewed/*.json` directly; or
- **Targeted source additions:** add clean public JSON/RSS/API adapters only where terms and robots compliance are clear.

## Explicitly frozen / not doing

- `C1b.1` (zero-output Coverage Inbox with raw HTML `contentHash` and manual noise ignores)
- `CTX` (High-Risk reporting-only source date semantics engine)
- `C1b.2` (partial-notice notifications via `C1a.1` + `CTX`)
- `C2` (quote-lexer CI check tied to `C1a.1`)
- `C5.3` (autonomous AI event recording to `main`)
- Timeline Registry v2 cutover (`PR #115`)
