# E2a — Editorial decision provenance and migration rehearsal

**Status: PREPARED / REHEARSED, NOT LIVE.** 2026-10-26.
Baseline: main `72def1e0d076b5da9cbf3ecf37ec2d1a0f743ea4`, after E1
[PR #102](https://github.com/maxvfk/game-calendar/pull/102) and hardening
[PR #103](https://github.com/maxvfk/game-calendar/pull/103).
Baseline [CI/Pages 40383372260](https://github.com/maxvfk/game-calendar/actions/runs/40383372260)
passed. Contract: `docs/research/event-context-editorial-technical-design.md`.
No E1 implementation was repeated. No production cutover is authorized by E2a.

## Implemented boundary

- `src/editorial/timeline-decisions-v2.ts`: strict persisted label-decision
  schema v2 with explicit `operator_approved | automated | legacy_unknown` origin;
  every non-label requires `evidenceHashAtDecision: <64 hex> | null`. Labels do
  not accept that field. Existing ID/fingerprint/rules/copy/reason constraints
  are reused; duplicate IDs and unknown fields/contracts/origins are rejected.
  These are **persisted decisions**, not model proposals. A future trusted writer
  must assign origin itself, never accept a model's claim of operator approval.
- `src/editorial/provenance-migration.ts`: deterministic v1→v2 conversion using a
  validated manifest; record content digests protect exact payloads as well as
  eventId/fingerprint. The audit tracks additions, fingerprint replacements,
  same-fingerprint modifications and removals. Latest actual record write wins;
  an earlier human origin does not transfer to a later replacement.
- `data/presentation/timeline-origin-migration.v1.json`: **immutable historical
  inventory**, schemaVersion 1, purpose `timeline-v1-to-v2-rehearsal-only`.
  It records the audit boundary, exact source commits/parents/authors/committers,
  subjects, complete diff path lists, before/after registry hashes/counts,
  changed-record hashes, and final per-eventId/fingerprint/content origin.
  It is **not** a live v2 registry or a promise that main has stopped moving.
- `scripts/editorial-provenance-git.ts`: offline, read-only first-parent main
  history adapter. Resolves a ref once and reads exact Git objects; no shell
  interpolation, network/model calls, Git writes or production use. Full history
  is required. A non-linear/mixed/unrecognized commit cannot claim bot origin;
  its changed records require review and become `legacy_unknown`.
- `scripts/editorial-provenance.ts`: `inventory` prints candidate manifest JSON;
  `rehearse` rejects stale history/content, repeats conversion, checks exact v1
  rollback, labels and queue projection, then writes **only** previews/report
  beneath ignored `tmp/editorial/provenance-e2a/`. A failed fresh check clears
  previous previews so stale successful artifacts cannot be consumed accidentally.
  It has no switch/install/publish/write-to-registry mode.
- A **separate, unwired** evidence eligibility helper validates the E1 sidecar,
  recomputes its hashes and uses eligible entries only, for exact event ID/game
  and matching canonical fingerprint. Outage/extraction/assembly errors,
  unattached material, missing entries and bare/forged hashes never requeue.
  Callers must supply the fresh, trusted E1 builder output, not model data;
  hash/schema validity alone is not proof of the underlying source's truth.

Production still reads/writes `timeline-labels.v1.json`. No v2 registry snapshot
is committed, no second writer/workflow/schedule is installed, and no production
queue or accept path imports these preparation modules. E1 hardening, canonical
IDs/summary/dates/precision/provenance/timelineTitle, semantic fingerprint, Event
Detail, Account/Sync, current M4 schedule and kill switch are unchanged.

## Actual historical classification

All registry-changing commits reachable on main's first-parent path through the
baseline were inspected, not just the first automatic write:

| Commit | Classification | Registry before→after | Added / replaced / modified / removed |
| --- | --- | --- | --- |
| `f319defd9e9e3e8f96ad469a2b4e440c0ad19a77` (#84) | Empty initialization | absent→0 | 0 / 0 / 0 / 0 |
| `f75cfbd04fea7100a88e9373543ebaee6ddde22a` (#87) | Operator-approved original batch | 0→25 | 25 / 0 / 0 / 0 |
| `c0b933f64ccb6bc3e579dc6855ebf7a32022b4ad` | Verified automatic registry-only write | 25→50 | 25 / 0 / 0 / 0 |

The GitHub PR #87 merge SHA was checked against this exact approval anchor.
Operator attribution additionally checks author, committer, subject, the two
expected changed paths, 25 additions from an empty registry and exact approved
registry content hash `6a0ca1f5392c3e8e266aab554b48e0c4f270d544237461393a91e64d57f480a5`.
The current automatic commit has both author and committer `github-actions[bot]`
with `41898282+github-actions[bot]@users.noreply.github.com`, the exact record.sh
subject, only the registry path changed, and 25 valid added records.
**No later registry-changing commits exist at the recorded audit boundary.**
The adapter enumerates every later change on a future invocation; c0b933f is
not a hardcoded endpoint or the only automatic commit it can classify.

| Origin | label | keep_original | needs_research | Total |
| --- | ---: | ---: | ---: | ---: |
| operator_approved | 8 | 15 | 2 | **25** |
| automated | 4 | 15 | 6 | **25** |
| legacy_unknown | 0 | 0 | 0 | **0** |
| Total | **12** | **30** | **8** | **50** |

All **38 non-label records** migrate with a null evidence key: the current M4
never consumes E1 evidence, even though E1 is now available. Labels and payloads
are preserved verbatim. **Nothing remains unclassified in this real inventory.**
Unknown/mixed edits in tests are not invented production incidents; they are
classified conservatively and protected.

Automatic attribution requires the author **and** committer identities, exact
subject, single parent, registry-only diff, and additions/fingerprint-replacements
only. A same-fingerprint copy/reason edit, deletion, other changed file, different
identity/subject or merge-shaped write cannot be inferred automatic. Existing
unchanged records retain their prior origin; changed unrecognized records become
`legacy_unknown`. Content/fingerprint/record-count checks are persisted per commit.

## Evidence-only policy, implemented but not enabled

| Decision origin/kind | New verified non-null evidence differs (including null→hash) |
| --- | --- |
| automated keep_original | Eligible |
| automated needs_research | Eligible |
| operator_approved needs_research | Eligible |
| operator_approved keep_original | Protected |
| Any label, regardless of origin | Protected |
| Any legacy_unknown | Protected |

Same evidence suppresses repetition. Unknown event IDs, canonical fingerprint
changes and absent/failed/unverified evidence do not trigger this helper. Existing
canonical-input-change semantics remain M4's responsibility; future callers still
need normal expiry, batch and queue gates. The helper does not remove/replace any
stored decision, create a queue or call an agent. No evidence-triggered requeue
is active in production.

`timeline-semantic-sha256-v1` remains exactly the existing canonical
`{id,game,type,title,recognitionSubjects,summary}` contract. Neither sourceExcerpt,
AI-generated displaySummary, evidence hashes, origin nor prior labels participate.
No displaySummary schema/registry/UI was created.

## Rehearsal results

At the fixed replay clock **2026-10-26T20:30:00.000Z**:

- Inventory generated twice from the baseline: **byte-identical manifest**.
- v1→v2 run repeatedly: **50 identical decisions**, no append/duplicate behavior.
- All **12 labels** and all original payload fields preserved; all 38 nullable
  evidence keys initialized honestly to null.
- v2→v1 compatibility projection and rollback: **byte-identical** to the original
  v1 file, SHA256 `ced897eb6d99a94736c3c72c5da04eb23f68c05395e53468ffc3e82a6e727c82`.
- Actual `build:feed` in a disposable input tree, first from v1, then the v2 preview
  projected through the v1 compatibility seam, then restored v1: **all four public
  JSON outputs byte-identical**, including labels, queue and agent input.
  This is a compatibility rehearsal, **not a live v2 reader or publisher**.
- New actual Git commits in a disposable repository prove additions and
  same-fingerprint edits are detected; stale-manifest rehearsal exits nonzero,
  leaves the v1 registry unchanged and clears old previews. Synthetic history
  cases also cover replaced fingerprints, unknown/mixed authors/diffs, deletions
  and a new commit followed by a revert to identical registry bytes.
- Whole-repository before/after fixed-clock build independently has identical
  public feed, Timeline queue, agent input and review JSON. The live registry and
  all six M4 reader/accept/writer/workflow files are unchanged.

| Public file | Baseline and E2a SHA256 |
| --- | --- |
| events.v1.json | `98b62fc5b5f0810c63d58e1f448bd322f946f51c25be5ff95aa39656636998a1` |
| timeline-label-queue.v1.json | `cd254826bceb193becf681066a841ecfd19decfe348f0127cc2375f3156da4b0` |
| timeline-label-agent-input.v1.json | `20e420caf552883e0c33d3784074dc39a1f61fec9a05a0bbedb98c8a9d56619c` |
| review.v1.json | `15188f847dfba55ea824d0c99eb4612018c6fe4cbdbb4daa7f1660474acbc586` |

The CLI explicitly reports `productionCutoverAuthorized: false`,
`remoteWriterQuiescenceProven: false`, `v2WriterInstalled: false` and
`status: rehearsal_only_not_live`. Resolving a local Git ref is **not a remote
lock**; fetch current main before a future rehearsal and never infer authorization
or writer quiescence from a passing report.

## Verification and repeatable commands

Bun 1.3.14: frozen install **PASS** (lockfile unchanged), typecheck **PASS**, full
`bun test` **1,296 pass / 3 existing age-dependent skip / 0 fail** (68 files), full
build **PASS**. The focused new suite has **26 pass**. Existing M4 behavioral
and script/workflow tests remain intact. CI's PG17 job separately installs age
and exercises encrypted recovery/concurrency. Final PR/CI/Pages links are recorded
in the implementation PR delivery record.

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build

# Immutable historical reproduction; compare stdout to the committed manifest.
bun scripts/editorial-provenance.ts inventory 72def1e0d076b5da9cbf3ecf37ec2d1a0f743ea4

# Freshness gate on an already refreshed local main ref; no network or Git writes.
bun scripts/editorial-provenance.ts rehearse HEAD
```

`inventory <ref>` is stdout-only; review a candidate before replacing a versioned
manifest. `rehearse <ref>` requires an already built public feed and current v1
working bytes matching the audited ref. It writes only ignored temporary outputs.
A new source commit requires a fresh reviewed inventory, even if its final bytes
later return to the old value. An unrelated main commit is allowed when registry
history/content is identical.

Ordinary shallow-checkout CI validates the **historical** manifest using independent
frozen v1/Git-metadata fixtures, plus a real disposable Git repository. It must
not reject healthy future M4 writes merely because the old audit now needs renewal.
The real CLI's fresh-history gate is deliberately separate and never a runtime
Git dependency. See `test/fixtures/editorial/README.md`.

## Remaining controlled cutover gates — not executed in E2a

1. Obtain separate operator authorization for the cutover window and writer
   admission/freeze procedure. The existing kill switch alone does not cancel
   a propose/record run that already passed its start gate. Drain running/queued
   scheduled/manual M4 jobs and prevent new old-contract writers from entering.
   E2a does not change that switch, workflow or schedule.
2. Fetch then-current main with full history. Inventory **all** registry changes
   since this snapshot, validate additions/replacements/content and classify any
   unrecognized changes explicitly or protect them as legacy_unknown. Review the
   new manifest and rerun migration, fixed-input builds, accept compatibility and
   rollback against that exact registry boundary.
3. Prepare a separate atomic reader/accept/record contract switch with exactly
   one active writer and fail-closed rejection of stale v1 write attempts. A
   future automated writer assigns origin itself. Keep the same M4 schedule,
   concurrency and propose/read-only versus record/no-model separation. Do not
   leave two publishers accepting/writing in parallel.
4. Regenerate the v2 registry under exclusive writer control, not from this stale
   preview. Verify remote main/registry history immediately before publication;
   use an expected-base/fast-forward guard. A new bot write aborts the cutover
   and requires fresh inventory/review. Rehearsal output is not authorization.
5. Verify CI/Pages and source/event/label behavior after the separately approved
   switch. Evidence-triggered production requeue still requires its explicit
   activation gate; E2a did not enable it.
6. Rollback procedure must drain the v2 writer, preserve a full current v2 audit
   backup, then project the **latest** v2 decisions back to v1 and switch the
   sole reader/writer together. Do not restore an old frozen v1 file after new
   decisions have been recorded. The tested projection preserves later-added
   labels too; backing up v2 retains origin/evidence metadata that v1 cannot store.

No serious blocker prevented **preparation**. Production cutover remains gated
on fresh inventory and exclusive writer control; neither is claimed live.

**Next concrete step:** review this prepared contract/manifest and separately
scope/authorize the controlled v2 cutover above. E2b summary contracts/UI, E3
combined agent and E4 activation were not started. **STOP AFTER E2a.**
