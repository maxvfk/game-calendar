# Practical Parser & Auto-Labels Plan

**Status:** ACTIVE DIRECTION (adopted by operator on 2026-11-21).
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

## Practical 4-step plan

Goal: **working, resilient parsers + informative daily Timeline auto-labels with minimal development and manual maintenance.** Each step is a small, independent PR.

### PR #0 (this PR) — Freeze heavy queue & run auto-labels daily
- Freeze `C1b.1`, `CTX`, `C1b.2`, `C2`, and `C5.3`; record this plan in `docs/`.
- Switch `.github/workflows/timeline-labels.yml` from `23 4 * * 2,6` (Tue/Sat) to `23 4 * * *` (daily 07:23 Moscow / 04:23 UTC). An empty queue makes zero API calls.

### PR #1 — Revive Timeline auto-labels via parser context
- Populate `recognitionSubjects` (for banners: featured character/weapon names from headings/intro lines) and concise factual `summary` (1–2 source lines describing activity/rewards) in `kqm-ginews.ts`, `wuwa-kuro-atom.ts`, `kqm-hsrnews.ts`, `nte-steamnews.ts`, and `zzz-steam-rss.ts`.
- **Hard invariant:** `eventId`, `startsAt`, `endsAt`, `regionEnds`, `startPrecision`, `endPrecision`, and `regionScoped` remain byte-for-byte identical on all existing fixtures and snapshots, verified by dedicated invariance tests.
- Changing `summary` / `recognitionSubjects` updates `semanticFingerprint()` automatically, allowing `timeline-labels.yml` to re-label existing active events and immediately show character/item names on banners.
- *Risk-gated note:* Operator-authorized scope on `src/ingest/parsers/*` under the explicit invariance contract (zero date/ID changes).

### PR #2 — Generalize repeating parser templates + resolve stale sources
- Replace one-off October hardcodes in `kqm-ginews.ts`, `wuwa-kuro-atom.ts`, and `nte-steamnews.ts` with general structural matchers for repeating templates:
  - Genshin: Phase II `Epitome Invocation` weapon table, Battle Pass `"..." Event Details`, `Stygian Onslaught` + secondary `Disturbance Outbreak` cutoff, and similar repeating structured notices.
  - NTE: unquoted `... Limited-Time Event` headers (`City Logistics`).
- Inspect live behavior of the two currently stale sources (`zzz-zenlessgg-banners` since `2026-11-11`, `endfield-wikigg-echoes` since `2026-11-14`) and either repair, replace, or cleanly retire broken external feeds.

### PR #3 — Minimal liveness (simplified `C4`)
- Move the external dead-man heartbeat ping to the end of `ci.yml`'s `pages` job, gated on `publicationStalled() === false` (from `src/shared/feed.ts`), so one ping verifies refresh + CI + Pages deployment without relying on noisy `contentChangedAt` diffs or false-fresh docs-only deploys.
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
