# E1 — WuWa internal event evidence

Implemented 2026-10-26 against main `25ee442bd134e1b6f25a65cc58a547ec0429aa4f`
(PR #100 technical contract plus PR #101 ceilings/requeue clarification).
Baseline [CI/Pages 40365217851](https://github.com/maxvfk/game-calendar/actions/runs/40365217851)
succeeded. This is **E1 only**; E2–E4 remain separate gates.

## Implemented contract

- `wuwaEventSections` shares the parser's identity, dates, article reference and
  candidate construction. Legacy parser behavior/`SourceParser.parse()` is
  preserved. Evidence additionally normalizes soft whitespace and inline markup,
  then verifies that its candidate still exactly matches the original traversal.
- `extractWuwaEvidence` quotes source-local featured lineups, immediately
  associated activity/reward paragraphs and explicit bounded reward conditions.
  It never paraphrases. Banner eligibility, pity/store rules, unrelated headers,
  maintenance, navigation and model-directed instructions are excluded.
  Unknown boundaries, repeated headings, active/malformed markup, ambiguous
  claims and unusable descriptions produce diagnostics, not invented copy.
- `build:feed` supplies exactly the successfully parsed document and ParseContext;
  source adapter filtering remains authoritative. After merge, exact ID +
  game/type/source-reference checks permit parser winners and same-ID reviewed
  winners. Different IDs require an explicit reviewed mapping; no production
  mapping is supplied in E1. Near matches/shared URLs/dates are insufficient.
  Merge date conflicts, duplicate candidates/final IDs and conflicting featured
  claims fail closed. Unattached bounded evidence is diagnostic-only.
- Strict `event-evidence.v1` Zod sidecar: **≤2,000 Unicode code points per event,
  ≤6 distinct excerpts, ≤500 per excerpt, ≤2 source documents**, including combined
  limits. NFC/plain text, independently bounded IDs/HTTPS URLs/diagnostics.
  Oversize facts are omitted whole with diagnostics; there is no character slicing.
  Priority is featured → activity → rewards, deterministic across source ordering.
- Generated `tmp/editorial/event-evidence.v1.json` is untracked and outside
  `public/`. Only `entries` is eligible future-agent evidence; `unattached` and
  `diagnostics` are not. No artifact upload was added; existing Pages upload
  still contains only `public/`. Missing input produces an unavailable diagnostic
  and no eligible evidence, never a synthetic changed/empty evidence hash.
- Each source carries its original `sourceEventId`, `sourceId`, actual article
  `sourceUrl`, real snapshot `contentChangedAt` as `capturedAt`, and available
  `lastConfirmedAt` (metadata/state). Missing metadata stays null. A fixture's
  filename provides `fixtureCaptureDay`; it does **not** invent a midnight fetch.
- `event-evidence-sha256-v1`: SHA256 of fixed-order final association, game,
  source references and normalized ordered kind/text. Capture/refresh/build
  clocks and extractor version are excluded; the extractor version is separate.
  The normalized order is established by the builder. Meaningful source changes
  change the key; cosmetic markup/whitespace/NFC and capture clocks do not.

No AI/API/new source requests, public schema/copy, canonical `summary`,
`recognitionSubjects`, `timelineTitle`, label fingerprint/registry/queue, merge
winner policy, IDs, dates/precision/provenance, UI, Account/Sync, schedule or
kill switch changes.

## Fixed-input observations

Replay clock: **2026-10-26T18:00:00.000Z**. Checked-in source:
`snapshots/wuwa-kuro-mirror.xml`, SHA256
`8e05193e9378afcbc19058efb9a31a08261f595b4dc821bffaba82bab5604a0e`.
Capture `2026-10-21T20:43:03.544Z`; last confirmation in main's metadata
`2026-10-26T11:17:37.934Z`. No source was fetched for this pilot.

| Final WuWa event | Excerpts | Unicode code points | Useful evidence observed |
| --- | ---: | ---: | --- |
| Tomorrow in the Frame | 1 | 116 | Lucilla; Lumi, Danjin, Chixia; boosted rates |
| Undefined Spectrum | 1 | 114 | Lynae; Lumi, Danjin, Chixia; boosted rates |
| Freeze Frame | 1 | 131 | Freeze Frame; Overture, Relativistic Jet, Amity Accord |
| Spectrum Blaster | 1 | 135 | Spectrum Blaster; Overture, Relativistic Jet, Amity Accord |
| Echo Erase | 1 | 112 | Tapping Echo Pieces away |
| Beyond the Waves: Land of Xuanfang | 1 | 163 | Daily tasks → Adventure Logs → Adventure Packages |
| Artisan's Search | 0 | 0 | No substantive activity in the captured event-local blurb |

**Coverage: 6/7 automatic/final WuWa events (85.7%)**, 6 fragments, 771 code
points total. Fragment distribution: min **112**, median **123.5**, max **163**;
mean **128.5**. Each populated event has one document/fragment. **Zero cap hits,
zero truncations, zero unattached/ambiguous associations on this real input.**
The small factual fixture covers all five explicit pilot targets (5/5).
The existing September schedule-only fixture contains no useful descriptive
facts; the extractor does not manufacture them.

Actual extracted examples (canonical `summary` remains null):

```text
Tomorrow in the Frame — featured, article 5668:
During the event, 5-Star Resonator: Lucilla, 4-Star Resonators: Lumi, Danjin, and Chixia receive boosted drop rates!

Echo Erase — activity, article 5571:
The latest flagship offering from Second Coming of Solaris! Come experience the fun of tapping Echo Pieces away!

Beyond the Waves: Land of Xuanfang — rewards, article 5571:
During the event, you can complete event tasks once per day to obtain a set number of Adventure Logs. Each Adventure Log can be exchanged for an Adventure Package.
```

Manual source-span inspection confirmed these six excerpts belong to their
own event; the four simultaneous banners do not exchange featured names.
The short marketing lead-in in Echo Erase is retained with its factual paragraph
rather than creating a paraphrase. No useful fact was lost **because of limits**
in this input. Artisan's Search's “Lisha, apprentice Artisan, reporting for duty!”
is intentionally omitted as insufficient context. Generic eligibility/pity/store
boilerplate is deliberately excluded. Context for notices the existing parser
cannot publish is not a new event/coverage entitlement.

Illustrative input volume at **4 English characters/token**: **~193 tokens** for
excerpt text, **~901 tokens** for eligible JSON entries including references and
hashes. This is a reproducible heuristic, not tokenizer measurement, an API cost
or a complete future prompt estimate. Canonical event inputs, editorial rules
and model output are extra. Limits are unchanged; this sample gives no reason
to raise them.

## Verification and replay

Bun **1.3.14**:

- `bun install --frozen-lockfile`: PASS (lockfile unchanged).
- `bun run typecheck`: PASS.
- `bun test`: **1,266 pass / 3 skip / 0 fail**, 67 files. The three existing
  synthetic encryption/recovery tests skip without local `age`; CI's PG17 job
  installs `age` and exercises its mandatory recovery checks.
- `bun run build`: PASS. Full public asset tree has no evidence/sidecar/excerpts.
- Focused WuWa + evidence suite: **24 pass / 0 fail**. Covers adjacent banners,
  characters/weapons, activity/reward conditions, missing/short/eligibility-only
  text, malformed/active/encoded markup/instructions, unrecognized/repeated
  headings (including undated repeats), Unicode/NFC, exactly-at/over all limits,
  two-source aggregation/third-source omission, hash stability/change/forgery,
  same-ID reviewed winner, different-ID near merge, explicit mapping, duplicate
  IDs/candidates, source/date conflicts, unavailable input and capture metadata.
- Automated offline builder regression pins baseline public-file SHA256 values
  from `25ee442` with the small fixture, empty editorial registry and fixed time.
  Changing only featured context changes evidence but leaves the public event
  feed, Timeline queue and agent-input bytes unchanged. This also verifies
  snapshot and fixture paths and source unavailability without network access.

Separate **whole-repository snapshot replay** before/after implementation used
identical fixed time, snapshots, reviewed data and registry. All four public JSON
files matched **byte-for-byte** (179 events, existing one date conflict):

| File | Baseline and E1 SHA256 |
| --- | --- |
| events.v1.json | `1e10469698f30b9069b6bdb37e86662d2bcd1ab2de2f8f0baf32c98bad408c86` |
| timeline-label-queue.v1.json | `0cc5283b382c5485f34ffa54899be63732b4290d0604a565dfe1f2ef64803ac4` |
| timeline-label-agent-input.v1.json | `4d0ca3303c2a15e5c223814bd8237972552bea59fdbebad86dfad8b4f41ccbc2` |
| review.v1.json | `6f549f080e8d78503f09c1803dec9bfbb00f6001cff1d0ee0d0827080f2620aa` |

Local operational replay (offline, ordinary current build clock):

```bash
bun run build:feed
bun scripts/event-evidence-report.ts
bun test test/event-evidence.test.ts test/wuwa-kuro-atom.test.ts
```

For a fixed clock, the integration test injects Date in a disposable subprocess;
production build-clock semantics are unchanged. The report CLI accepts an optional
sidecar path and reports per-event lengths, cap diagnostics and context volume.

## Remaining limits and next step

This is one source-template pilot, not universal semantic verification. Unknown
layouts and instruction-like prose can cause conservative omissions; the evidence
remains **untrusted external data** for any future model. No additional research,
source lookup, whole-announcement copying or fuzzy mapping is attempted. The
real sample contains no ambiguous reviewed-winner case: those are proven with
controlled merge fixtures, not claimed as production observations. Sidecar
retention and consumption by the editorial workflow are intentionally deferred.

**Next concrete step:** a separately authorized E2 registry/provenance-contract
milestone, using a fresh migration inventory of every automatic registry commit
up to migration. No E2/E3/E4, summary overlay, registry migration or agent expansion
was started in E1. PR/CI/merge delivery record belongs to the implementation PR.
