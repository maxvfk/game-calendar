# Source-health alert dedup — transition-based workflow failure

Status: **implemented and validated — hosted Refresh acceptance pending next eligible cycle**

Type: narrowly scoped ingestion/operations maintenance milestone  
Depends on: existing refresh/LKG/source-health behavior on CURRENT `main`  
Next milestone: `TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`

## Start instruction

Continue `maxvfk/game-calendar` from the CURRENT `main`.

This milestone fixes **notification noise only**. The scheduled refresh currently
turns red on every cycle while any source remains `broken`. That correctly
preserves source-health visibility, but GitHub therefore sends repeated failure
mail for one already-known persistent blocker (currently Endfield Echoes /
Season of Phantasia), even though refresh, snapshot commit, feed rebuild and
Pages CI continue to succeed.

Do not special-case Endfield or whitelist any source.

Before changes:

- verify CURRENT `main`;
- read `AGENTS.md`;
- read `docs/IMPLEMENTATION-STATUS.md`;
- inspect `scripts/refresh-sources.ts`;
- inspect `.github/workflows/refresh.yml`;
- inspect `src/ingest/snapshots.ts`;
- inspect the broken-source tests in `test/refresh.test.ts`;
- inspect the latest actual scheduled Refresh and its triggered CI/Pages run.

Use a fresh short-lived branch from CURRENT `main`.

## Required behavior

Keep the existing health semantics intact:

- same `BROKEN_AFTER_FAILURES` threshold;
- same failure/rejection accounting;
- same last-known-good retention;
- same parser-zero / disappearance / boundary/conflict protections;
- same `broken` list in the refresh summary;
- same visible per-source annotations/summary for a source that remains broken;
- working sources must still be committed/published before health reporting.

Change only when the **workflow itself becomes red**.

A source should create a workflow failure when it **transitions into broken**:
its previous persisted `consecutiveFailures` was below
`BROKEN_AFTER_FAILURES`, and after the current cycle it is at or above the
threshold.

Call this state `newlyBroken` (or an equivalently clear name).

A source that was already broken before the current cycle must remain visibly
broken but must not make every subsequent scheduled refresh fail merely because
the same continuous outage/rejection persists.

Required cases:

1. failures 1 and 2: not broken, workflow health gate does not fail;
2. failure 3: source becomes broken, appears in `broken` and `newlyBroken`;
   workflow health gate fails **after** commit/publish;
3. failure 4+: source remains in `broken`, but is not `newlyBroken`; workflow
   may finish green if there is no other failure;
4. recovery resets the streak normally;
5. after recovery, three new failures produce a new transition and a new alert;
6. if source B becomes broken while source A is persistently broken, B must
   still make that run red;
7. interval-skipped already-broken sources remain reported as broken but do not
   manufacture a new transition.

Do not add a source-specific acknowledgement file or a permanent
`endfield-wikigg-echoes` exception.

## Implementation guidance

Prefer deriving the transition from the existing persisted
`SnapshotState.consecutiveFailures` before and after a source cycle. Avoid a
second independent acknowledgement database if the current health state already
contains enough information.

Expose enough refresh output for the workflow to distinguish:

- total currently broken sources; and
- newly broken sources in this run.

The final `Report source health` step should still execute after snapshot
commit and feed publication. It should exit non-zero for newly-broken
transitions, not merely for a nonzero persistent-broken count.

Persistent broken sources should remain obvious in the step summary/log/
annotations even when the workflow conclusion is success.

Hard refresh failures are unchanged and must still fail normally.

## Tests

Add/adjust focused tests proving:

- exact threshold transition;
- persistent fourth/subsequent failure is still `broken` but no longer
  `newlyBroken`;
- recovery followed by re-break alerts again;
- a second source transitioning while another remains broken alerts;
- relevant `outputs()` expose both current-broken and transition state;
- workflow health reporting still occurs after commit/publish and fails on the
  transition output rather than the persistent count.

Do not weaken the existing regression proving a scheduled source becomes broken
after three failed cycles.

Run the project gates:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

## Hosted acceptance

After merge, observe or manually dispatch a normal refresh only if doing so
respects the existing request/override rules.

For the currently persistent Echoes blocker, acceptance is:

- refresh/source summary still reports Echoes as broken;
- no Phantasia dates are invented or accepted;
- valid sources still publish;
- triggered CI/Pages remains green;
- the refresh workflow does **not** fail solely because Echoes was already
  broken before this run.

Do not reset the Echoes failure streak just to demonstrate the first-transition
case. Automated tests cover that transition.

If a genuinely new source becomes broken during acceptance, a red refresh is
correct and must not be suppressed.

## Documentation

Update `docs/IMPLEMENTATION-STATUS.md` with:

- the transition-based notification rule;
- validation results;
- hosted acceptance if observed;
- explicit confirmation that source-health/LKG acceptance rules were not
  relaxed;
- next concrete step: Timeline M1.

## Out of scope

Do not:

- change source coverage or parsers;
- accept the contradictory Phantasia cycle table;
- alter event dates/provenance/conflict rules;
- reduce `BROKEN_AFTER_FAILURES`;
- silence all broken-source annotations;
- change refresh frequency;
- work on Account/S6, Timeline M1/M2, artwork, UI or Astra.

Finish after this alert-dedup milestone is tested, documented and merged.
