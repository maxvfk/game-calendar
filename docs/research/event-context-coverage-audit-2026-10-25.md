# Event context coverage audit — 2026-10-25

**Scope:** read-only audit of event descriptions/recognition context for the seven tracked games. No parser, feed, Timeline, automation, source access or runtime changes. Baseline GitHub `main`: `79937b24337c667a134e5ccdf325b3e6035e7077`.

**Decision:** improve deterministic extraction from **already captured, permitted source documents** before considering a second AI pass. Schedule source-by-source implementation separately from the ongoing autonomous Timeline-label milestones.

## Evidence and measurement scope

Code inspected: `AGENTS.md`, `src/shared/schema.ts`, `src/ingest/{adapters/index.ts,merge.ts,reviewed.ts,parsers/*}`, `scripts/build-feed.ts`, `src/presentation/timeline-labels.ts` and the current source snapshots/reviewed batches.

For an event-level sample, a locally retained **published Pages build artifact** generated **2026-10-25T09:18:18.353Z** was inspected (`data/events.v1.json` and `data/timeline-label-agent-input.v1.json`). The values below are **capture-time baselines**, not claims about a newer live deployment. The current `main` was checked separately; this audit did not run Bun or fetch/parse fresh websites.

| Captured output | Count |
| --- | ---: |
| Published source events | 179 |
| Non-null `summary` | 135 |
| Null `summary` | **44** |
| Events with `recognitionSubjects` | **2** |
| Prepared editor batch | 25 |
| Batch events with `summary` | 12 |
| Batch events without `summary` | **13** |
| Existing `data/reviewed` event records | 103 |
| Reviewed records with non-null `summary` | 103 |

**These are presence counts, not semantic-quality scores.** A source may put only a generic event type or timing caveat in a non-null `summary`; some reviewed descriptions are primarily date/provenance explanations.

### Missing summaries by selected final-source ID (published feed sample)

| Final source | Published events | Null `summary` | Queue examples |
| --- | ---: | ---: | --- |
| `nte-steamnews-official` | 35 | **29** | Dazzling Star; Far Side of the Moon; Snap! Golden Crackshot |
| `hsr-kqm-hsrnews` | 7 | **7** | Interastral Peace Gala: One Take; Love, Ghosts & Robots; Pure Fiction: Imagined Words |
| `wuwa-kuro-mirror` | 7 | **7** | Tomorrow in the Frame; Freeze Frame; Spectrum Blaster; Echo Erase |
| `genshin-kqm-ginews` | 1 | **1** | No missing Genshin item in this 25-event batch |
| **Total** | **50** | **44** | 13 of the batch's 25 items |

Other final-source groups had non-null `summary` in this sample. Examples: `reviewed-*` (103/103), `endfield-wikigg-events` (7/7, often merely an event-type label), `czn-prydwen-banners` (4/4, scheduling caveat rather than mechanics), `nte-ntebuild-btr` (2/2, source JSON-LD description), recurring generated rows (13/13, often reset-cycle boilerplate). ZZZ has reviewed coverage but **no currently scheduled ZZZ parser**; improving an inactive Game8 adapter would not affect the feed.

## Confirmed loss points

1. **HSR:** `kqm-hsrnews.ts` parses full KQM/Hoyo notice sections, but emitted events use `summary: null`. The checked-in `snapshots/hsr-kqm-hsrnews.md` includes relevant per-event lines, e.g. Interastral Peace Gala's combat audition; Wishpower UP's combat objective/rewards; endgame cycle effects. Each event must use only its own section, not a neighboring event.
2. **WuWa:** `wuwa-kuro-atom.ts` already splits the full article into lines and finds an event heading + duration, but `candidate` takes only title/type/duration and emits `summary: null`. `snapshots/wuwa-kuro-mirror.xml` contains explicit per-event evidence: Tomorrow in the Frame features **Lucilla** (5-star Resonator); Undefined Spectrum features **Lynae**; weapon convenes explicitly name their 5-star weapon; Echo Erase is about tapping away Echo Pieces. Preserve boundaries between adjacent banners in one article.
3. **NTE:** `nte-steamnews.ts` separates Steam announcements into headings/sections and parses duration, then emits `summary: null` except fixed maintenance boilerplate. `snapshots/nte-steamnews-official.json` explicitly identifies **Akane Rin** for Dazzling Star, Arc Research details for **Far Side of the Moon**, and event currency/reward exchange for **Snap! Golden Crackshot**. Avoid bleeding whole maintenance/patch-note text into one event.
4. **Genshin:** `kqm-ginews.ts` reads full notice article content but emits `summary: null`. The snapshot's headlines contain some immediately useful featured/reward subjects. There is only one null-summary published parser winner in the measured sample, although reviewed titles can also lack useful character specificity.
5. **Endfield:** `wikigg.ts` uses the listing page's `mp-event-type` as `summary`, not an event description. More informative detail may require **separate event pages**, outside this bounded no-new-fetch audit. Do not treat index-wide `meta description` as per-event content.
6. **CZN:** `prydwen-czn.ts` derives banner identity from structured banner names but its `summary` is a date-confidence notice, not a gameplay description. No evidence here justifies a broader new data source or changing known date-confidence rules.

### Reviewed and merge caveat

`build-feed.ts` combines 103 reviewed records with parser rows, then `mergeEvents` keeps the winning **whole event object** rather than filling missing semantic context from a losing source. This is correct for fact/provenance safety, but richer parser text can be lost in a winner. **Concrete information gap:** the reviewed `La Chanson Cerise` description is a Phase-II/date note and does not name the featured character; the independently captured GINews notice headline explicitly names **Escoffier**. This event is one of two current `needs_research` decisions caused by a missing featured character. Do not silently merge lower-trust text into reviewed records; resolve by explicit reviewed evidence or carefully designed separate provenance-carrying editor context after a follow-up design decision.

## Constraints for improvement

- Source parsers remain **pure, deterministic, offline, source-template-specific**. Extract only text present in the matched event's already captured page/section; no external AI or network in a parser.
- Use bounded, sanitized, relevant text (`summary` max 500 characters; editor currently passes up to 300). Prefer what players **do**, what they **earn**, who/what is featured; omit marketing padding, navigation, unrelated event details, generic scheduling claims and unsupported certainty. `summary` is public in Event Detail, not merely agent scratch text.
- `recognitionSubjects` is optional, ordered, for explicit, structured/reviewed featured names **only**, not guessed from arbitrary headlines. Do not confuse banner names with featured subjects; preserve genuine co-headliners.
- Preserve exactly: event IDs, original titles, source attribution/provenance, dates/precision, parser zero safety, source conflict handling, Account/Sync, custom events, and the existing Timeline contract.
- **Fingerprint impact:** `summary` and `recognitionSubjects` participate in `timeline-semantic-sha256-v1`. Enrichment changes fingerprints, safely invalidating previously accepted copy and re-queueing events. Stage changes by source and ensure the autonomous label workflow/review state tolerates this; do not casually modify the fingerprint algorithm to suppress it.
- On disputed or unattributable text, keep `summary: null` or the prior safe value. No invented summary is better than a confidently wrong one.
- Honor existing robots/API/source-access agreements; this audit does **not** authorize fetching additional event-detail URLs or adding new transports.

## Recommended small milestones

1. **WuWa contextual extraction pilot** — scoped to `wuwa-kuro-atom.ts` and its existing XML snapshot: event-local factual `summary`, plus explicitly identified featured 5-star subjects only where provable. Add tests for adjacent concurrent banners, weapons, events, missing description, old IDs/dates and stable source boundaries. Compare before/after feed, label queue and fingerprints. No AI call; no scheduled-workflow changes.
2. **NTE Steam sections** — event-local descriptions from existing official Steam contents, with patch-note boundary/repeat handling. This has the largest missing-summary count (29), but needs more careful segmentation.
3. **HSR notice sections** — event-local objectives/rewards and endgame rules; verify no article-wide context spill.
4. **Genshin + semantic reviewed gap assessment** — fill safe deterministic fields in GINews; separately decide how reviewed winners consume newer corroborated character context without changing provenance.
5. **Quality reassessment** — replay a representative Timeline-label queue, measure null/generic/actionable summaries and `needs_research`; only then consider AI enrichment or new sources.

**Next concrete step:** implement **only milestone 1** using `docs/tasks/EVENT-CONTEXT-WUWA-PILOT.md`. Do not combine with autonomous Timeline publication, AI extraction, network-source expansion or bulk reviewed-data rewriting.

## Replay guide

From current `main`, `bun run build:feed` produces `public/data/events.v1.json` and `public/data/timeline-label-agent-input.v1.json`; compare baseline vs new outputs using event IDs and `sourceId`, not display names. Use a fixed clock/fixture when asserting fingerprints and queue membership. Required checks for implementation: `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`.
