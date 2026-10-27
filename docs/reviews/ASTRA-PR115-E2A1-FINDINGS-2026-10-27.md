# Astra High — independent audit findings for PR #115 (E2a.1)

**Audit verdict: `FIXES REQUIRED`. Production GO: `NO GO`.**

> **Provenance / fidelity:** This document is a **faithful structured reconstruction of the two findings from the prior Astra High review**, supplemented with direct verification of the referenced code at PR #115 head `794bda294d3f4e4e31a67b35035d66ace1dbb9d1`. It is **not the complete verbatim Astra transcript**, which was not available for direct export in this coordination chat. Do not quote this file as an exact, full-text Astra response. The original reviewer reported local reproductions; the coordinator has independently checked the referenced source lines but **has not rerun those reproductions**.

- Repository: `maxvfk/game-calendar`.
- Audit target: [PR #115](https://github.com/maxvfk/game-calendar/pull/115), **Draft**, `[NO GO] Prepare controlled Timeline registry v2 cutover (E2a.1)`.
- Reviewed head: `794bda294d3f4e4e31a67b35035d66ace1dbb9d1`.
- Then-current production `main`: `ed773a8d0a324edcbf36914f973ee35fe0091b49`, still registry v1.
- Audit performed: 2026-10-27 (Astra High, independent, read-only).
- This file documents **review findings, not fixes or permission to merge/cut over**.

## Finding A — BLOCKER: cutover tests bind to mutable production storage

**Code:** `test/timeline-cutover.test.ts:17–20, 51–67, 93–106`; masking integration harness at `219–221`.

### Confirmed failure mechanism

At module evaluation, the suite reads production-branch files into fixed test constants:

- `CutoverManifest.parse(Bun.file(CUTOVER_PATH))`;
- `TimelineRegistry.parse(Bun.file(V1_PATH))`;
- `EditorialRegistryV2.parse(Bun.file(V2_PATH))`;
- `StorageSelection.parse(Bun.file(STORAGE_PATH))`.

The tests then treat those **mutable operational files** as an immutable 75-record/frozen baseline:

- Lines 51–67 require exactly 75 records, the recorded last bot commit and the original v1↔v2 equivalence; line 57 requires the initial v2 registry to remain equivalent to the old v1 registry.
- Line 62 requires `frozen.admission === "frozen"`, even though a legitimate operator-approved **release** must change that field to `open`.
- Lines 93–106 use the current selector as a fixture but require `activeVersion === 2` at line 96, which is no longer true after an authorized rollback selecting v1.

These expectations are appropriate for a **frozen historical fixture**, not for mutable committed production state after release and normal recording.

### Reviewer-reported reproductions

1. **Release:** change the storage selection from `frozen` to `open`. The initial-state assertion at line 62 fails.
2. **First new v2 decision:** record a valid 76th decision using `acceptStoredTimelineProposals()`. The assertion comparing the current v2 registry with the historical v1 projection at line 57 fails.
3. **Rollback:** run `prepareRollback()` and select v1. The strict-reader fixture still expects v2 at line 96 and fails.
4. **Masked in the record.sh integration drill:** lines 219–221 prepend a shell stub for `bun` that returns success for `bun test` and `bun run`; therefore that test does not prove the real M4 writer can pass its full test/build checks after a legitimate release and write.

### Consequence

An otherwise valid live release, the next automatically recorded decision, or a legitimate rollback can make project CI fail simply because the tests are coupled to historical counts/state. This compromises the production acceptance/recovery gate and can block normal M4 writes. **Do not interpret green CI on the initial frozen PR as proof that these later states remain green.**

### Minimal correction requested

- Move exact historical inventory expectations and frozen-state assertions to **immutable test fixtures**, pinned to the original audit, not mutable live files.
- Use explicit, synthetic `frozen`, `open`, newly recorded v2 and rolled-back v1 selectors for tests of each lifecycle phase.
- Preserve valid historical migration/provenance invariants without assuming production registry never grows.
- Add a **real, non-stubbed** post-release and post-v2-write test/build gate and a rollback test/build gate, so tests verify the states the workflow will actually encounter.
- Regression: frozen candidate passes; release/open passes; 76th decision passes; rollback to v1 passes; forbidden stale writer and corrupted selector still fail closed.

## Finding B — IMPORTANT: rollback metadata archive may not be committed in the candidate

**Code:** `scripts/timeline-cutover-operator.ts:43–47, 61–70`; especially `45–46, 64–70`.

### Confirmed failure mechanism

`validateCandidate()` validates `HEAD` against `go.candidate`, then calls:

```ts
readGit(root, ["diff", "--exit-code", "HEAD"]);
```

That command **does not detect untracked files**. For rollback, the validator computes the expected archive from the latest v2 registry and compares its content against

```ts
Bun.file(resolve(root, `data/presentation/cutover-archives/${rollback.archiveHash}/registry-v2.json`)).text()
```

This reads a **working-tree file**, not a Git blob in the reviewed candidate commit. The later changed-path check only rejects *unexpected* committed paths; it does not require that the expected archive path exists **in the candidate commit**.

### Reviewer-reported reproduction

Create the expected rollback archive on disk and leave it **untracked** (`?? data/presentation/cutover-archives/...`). Commit only the selector/v1 changes, leaving the archive out. With the working tree still containing the expected archive, `validateCandidate()` can pass, while `go.candidate` **does not contain the archive**.

A clean CI checkout or subsequent clone of that candidate no longer contains the v2 metadata archive.

### Consequence

The rollback can report successful preservation while discarding the durable Git copy of v2-only `origin` / `evidenceHashAtDecision` metadata. This conflicts with the explicit requirement that rollback archive **latest v2 decisions** before switching the active reader/writer.

### Minimal correction requested

- Validate the archive bytes **from the candidate commit's Git object**, e.g. `git show ${go.candidate}:${archivePath}`, not merely from a workspace file.
- Require the exact expected archive path to exist in the candidate commit/diff as appropriate to the state transition, and compare its committed bytes/hash to `prepareRollback(...).archive`.
- Add a negative test for **untracked archive present on disk but omitted from candidate commit**. It must be rejected. Add a positive test proving the committed archive survives a fresh clone/checkout.
- Keep rollback anchored to the **latest** v2 registry; do not replace it with a frozen pre-cutover snapshot.

## Verified scope of the report

Astra's overall assessment was that the baseline implementation preserves the 75 inventoried decisions (25 `operator_approved` / 50 `automated`, 22 labels) and that fixed-input public feed and existing titles remained unchanged in the examined tests. Other cutover/race protections were not identified as proven defects in the recovered review.

**This is not a declaration that all other behavior is formally verified.** The two findings above are enough for `FIXES REQUIRED`.

## Required handling of PR #115

1. Developer: check both failure modes against **current PR head**, reproduce before patch where feasible, apply minimal production-safe corrections, and add the named regressions.
2. Rerun `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build` and exact-head PR CI (including PG17 job as relevant). Do not replace a real gate with a stub.
3. Update the existing **draft PR #115**, review evidence, test counts and truthful `docs/IMPLEMENTATION-STATUS.md` as needed.
4. Request **focused Astra High re-review** of both findings and introduced patch risks; do not claim Astra approved fixes that it has not reviewed.
5. **No merge, no Actions variable change, no production cutover/release, no evidence-only requeue, no E2b/E3/E4.** Separate reviewed operator GO and authenticated freeze/quiescence proof remain mandatory even after clean re-review.
