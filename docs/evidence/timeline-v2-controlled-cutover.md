# E2a.1 — Controlled Timeline registry v2 cutover preparation

**ASTRA FINDINGS FIXED / AWAITING FOCUSED RE-REVIEW (2026-10-28). NO GO.**
The original preparation below is historical evidence, not approval. The
[verbatim Astra report](../reviews/ASTRA-PR115-E2A1-VERBATIM-2026-10-27.md)
is authoritative; the reconstruction is supporting guidance only. Both confirmed
findings were reproduced and corrected in the existing Draft PR #115. See the
2026-10-28 addendum below. No production action or operator GO occurred.

**Original 2026-10-27 preparation: PREPARED / NOT LIVE.**
Production GO and live freeze gate remain **BLOCKED / not satisfied**.
Prepared draft [PR #115](https://github.com/maxvfk/game-calendar/pull/115).
Implementation-head [CI 40574284618](https://github.com/maxvfk/game-calendar/actions/runs/40574284618)
passed on `f2d34a5`: check, full build and PG17 recovery/concurrency all passed;
PR Pages was correctly skipped. The final PR delivery record tracks later
exact-head documentation CI too; a GO must cite the actual current candidate run.
The initial shallow-checkout test failure was fixed with a frozen, independently
hashed real legacy runner fixture and retested in an actual depth-1 checkout.

No production merge, writer activation, Actions variable or workflow-state
change was performed. The implementation PR must remain unmerged without a
separate explicit operator GO for a specific window.

Task: `docs/tasks/EDITORIAL-TIMELINE-V2-CONTROLLED-CUTOVER.md`.
Baseline main: `ed773a8d0a324edcbf36914f973ee35fe0091b49`, after #102/#103,
#104 and the independent ZZZ recovery. ZZZ/parsers/recurrence/Account/Sync/
Daily Reset are untouched. Historical E2a manifest is unchanged.

## Live-state observation and fresh inventory

`docs/evidence/timeline-v2-gate0-2026-10-27.json` records the read-only observation.
All **520 repository Actions runs**, six pages, were read completely at
`2026-10-27T19:46:47.352Z`. All three M4 Timeline runs were completed/successful;
no queued/running M4 job was observed. Most recent was the real scheduled run
[40484407063](https://github.com/maxvfk/game-calendar/actions/runs/40484407063).
That is a dated observation, **not a future quiescence guarantee**.

The connector rejected the repository Actions-variable endpoint with HTTP 400
`INVALID_ARGUMENT`; `TIMELINE_LABELS_AUTO` is therefore **unknown** to this Work.
The workflow-specific collection URL was also rejected; the supported repository
runs collection was paginated instead. No session/credential workaround or
variable change was attempted. Workflow admission/disable state and a fresh
operator-controlled freeze must be verified with authenticated operator access.
No parallel cutover PR or existing v2 production reader was present.

The new reviewed candidate ledger is
`data/presentation/timeline-v2-cutover.v1.json`, purpose
`timeline-v2-controlled-cutover`, status `prepared_not_live`. It embeds a fresh,
strictly validated cutover-specific origin inventory and exact source main,
registry Git blob, source hash, initial target hash and writer epoch. It does not
relabel the historical `timeline-origin-migration.v1.json` as live authority.

All four registry-mutating commits were audited with complete first-parent history:

| Source commit | Change | Origin classification |
| --- | --- | --- |
| `f319defd9e9e3e8f96ad469a2b4e440c0ad19a77` | Empty initialization | No records |
| `f75cfbd04fea7100a88e9373543ebaee6ddde22a` (#87) | 0→25, 25 additions | operator_approved |
| `c0b933f64ccb6bc3e579dc6855ebf7a32022b4ad` | 25→50, 25 additions | automated |
| `46f1d2e2550e57c9370f6cdde7f3a1c9f3ea9d92` (after E2a) | 50→75, 25 additions | automated |

Author+committer identities, exact subject, complete changed-file list, source
content hashes, eventId/fingerprint and replacement lineage were checked. Both
bot writes changed only v1 registry and only added valid records. There are no
replacements, removals or ambiguous changes at this boundary.

| Origin | label | keep_original | needs_research | Total |
| --- | ---: | ---: | ---: | ---: |
| operator_approved | 8 | 15 | 2 | **25** |
| automated | 14 | 28 | 8 | **50** |
| legacy_unknown | 0 | 0 | 0 | **0** |
| Total | **22** | **43** | **10** | **75** |

All **53 non-label evidence keys are null**, because the live v1 writer never
used E1 evidence. Initial v2 registry preserves every payload, label, reason,
fingerprint and order; unknown origins remain protected by the existing E2a
contract. No evidence-triggered requeue is wired.

- Source Git blob: `b71935b83c9a653ff2f9463920058479dae60642`.
- Source v1 SHA256: `90fb14edccf546e96a2403bcb929ece3542259da50d8bfa20350bdd0c9200a3a`.
- Initial target v2 SHA256: `472bc5b2351f202086b70d61b16b68243e2d984493c410e302e571621ffb9b70`.
- Epoch includes the source main, source blob and initial target hash; repeating
  cutover after rollback to identical data still creates a new epoch. It is not
  the semantic fingerprint or an authentication secret.

## Prepared reader and sole writer

`timeline-storage.v1.json` explicitly selects one schema/path/epoch and writer
admission. This **PR branch** selects v2 but has admission **frozen**; live main
remains v1. A separate release must open the writer after authorized cutover and
post-merge checks. Missing selector, bad v2 schema/hash metadata, missing/mismatched
ledger or wrong epoch fail closed; the old v1 file is never an implicit fallback.
V1 remains available only for an explicit controlled rollback selection.

The read facade projects validated v2 decisions into the unchanged v1 semantic
reader/queue/guard functions. This is a presentation compatibility view, not a
second stored registry or writer. Existing L1 input/proposal schema, 25-item cap,
preferences, fingerprints and model instructions remain unchanged. Model-provided
origin/evidence fields are rejected by the existing per-decision schema. Only
trusted deterministic acceptance assigns automated origin and null evidence key
to genuinely new/replaced decisions; existing matching decisions retain metadata.

The existing M4 workflow, cadence, model aliases, CLI version, kill switch and
propose-read-only/record-no-Claude-secret separation remain. A storage admission
check occurs before the model step: frozen storage sets the job's event output
to zero and consumes no model call. A writer ticket is retained outside public
agent input and supplied to the deterministic record step. The manual read-only
probe uses an explicit scratch-only preview mode and cannot overwrite storage.

Writer protections:

- Ticket binds selected contract/path/epoch; stale/missing tickets and writes to
  inactive v1 are rejected before recording. Freeze is checked on each retry.
- Same-checkout accepts use an exclusive lock, reread storage/content and atomically
  rename the validated result. Leftover locks fail closed; remove only after
  establishing that no process owns that checkout.
- Main M4 pushes stay fast-forward-only with the existing fresh-main retry loop.
  Competing main changes force a retry/refusal, never a metadata-dropping overwrite.
  Rehearsal-branch replacement now uses a lease rather than unconditional force.
- A pre-cutover old record.sh that fetches new main calls the new CLI with its old
  v1 destination/no ticket and fails. If it already finished on old main, its push
  is non-fast-forward after cutover. A legacy queued artifact lacks the epoch ticket.
- These are **not remote cancellation controls**. A running old workflow need not
  re-read a start-time variable. Operator admission control and fully drained jobs
  remain mandatory; local guards do not justify skipping that gate.

## Rehearsal and verification

Bun 1.3.14: frozen install/typecheck/full build PASS; full suite **1,352 pass /
3 existing age-dependent skips / 0 failures**, 72 files. New cutover suite:
**11 pass**. CI must also pass PG17/encrypted recovery; final-head CI links belong
to the PR delivery record. No post-merge/Pages deployment is claimed for this
unmerged preparation PR.

Offline evidence includes:

- Fresh 75-record conversion, stable replay, all 22 labels and all metadata retained;
  v2→v1 projection is byte-identical. The 50-record historical manifest is unchanged.
- Full actual fixed-clock feed builds under explicit v1 and v2 selections, plus
  rollback: public feed/queue/agent-input/review bytes match. No evidence-only
  candidate is added simply because its evidence key is null.
- Actual old record.sh and new record.sh against a local bare remote: old writer
  rejected, frozen writer rejected, then a synthetic release permits a real v2-only
  commit; repeated proposals produce no further commit. This original harness
  stubbed heavyweight checks; Astra correctly identified that limitation. It was
  replaced by the real full-gate lifecycle drill described in the addendum.
- Real bare-remote conflicts: bot update after inventory; two competing writers;
  update injected by a pre-push hook **between remote check and push**; compare-and-swap
  rejects the stale candidate and preserves the intervening commit. Rewinds fail.
- Queued/running/waiting/pending/unknown jobs, incomplete/stale observations,
  inaccessible controls, absent GO, changed candidate/CI, wrong paths/epoch/manifest,
  forged origin and invalid evidence hash fail closed. Completed failed/cancelled
  jobs count as drained, not as candidate approval; their registry effects still
  require the fresh inventory check.
- Rollback **after a new v2 decision**, retaining all 76 payloads and an archive
  containing origin and a non-null test evidence key. Tests validate cutover,
  separate one-file release, unknown-origin protection and stale-base rejection.
- Real Chromium **153.0.8010.0**, 320/390/1440 px, **15 smoke checks**: Timeline rows,
  approved title + canonical Original title, canonical heading fallback, no page
  errors. A 390 px result was visually inspected. Client code/assets are unchanged.
  Browser tooling was isolated from project dependencies; no lockfile change.

At fixed clock `2026-10-27T20:00:00.000Z`, all **241 events** and existing conflict
are unchanged, including all ZZZ rows and source-health data:

| Public output | Identical v1 baseline / prepared v2 SHA256 |
| --- | --- |
| events.v1.json | `d42ae896cca227187605518c029191e4b9274662b698959b7717bc196d63bab2` |
| timeline-label-queue.v1.json | `e90e7899b3982f9961067874499ea12d62dd228837b3231349c04804d533b14a` |
| timeline-label-agent-input.v1.json | `45c705e95ef1a733e20bfceb16aebf958257da7be1d24c0965ad75d053e9ab05` |
| review.v1.json | `aa82c8d2ffb609f66c7800c66533e144b0eb4de05d0ca7b7a8aa06b63257dfbe` |

## Operator runbook — not executed in this Work

**No GO exists. Do not merge/publish this PR or execute freeze/release commands
until an operator separately authorizes the exact window and reviewed candidate.**

### 1. Refresh and review preparation

Read-only/local preparation, never a production switch:

```bash
git fetch origin main
bun scripts/timeline-cutover-operator.ts inventory origin/main
bun scripts/timeline-cutover-operator.ts bundle origin/main
```

`bundle` writes only `tmp/editorial/cutover-candidate/`. If main/history/blob differs
from this ledger, update the PR from fresh main and review/commit the new ledger,
v2 registry and frozen selector together. Keep the historical E2a manifest intact.
Rerun all checks and fixed-input parity. Do not copy the original 75-record snapshot
over newer records. Unrecognized records remain legacy_unknown unless separately
reviewed; never infer operator approval from authorship alone.

### 2. Separate GO, real admission freeze and quiescence

Operator needs authenticated `gh`/Git access able to read repository Actions
variables, workflow state, all runs and exact candidate CI, and to publish the
reviewed descendant commit. Missing access is BLOCKED; do not substitute YAML.

After the **separate** operator GO, the operator may stop new M4 admissions, for
example with the existing controls (these commands were **not run** here):

```bash
gh variable set TIMELINE_LABELS_AUTO --repo maxvfk/game-calendar --body off
gh workflow disable timeline-labels.yml --repo maxvfk/game-calendar
```

Drain/cancel **all** queued/in-flight scheduled and manual M4 propose/record jobs,
wait until they are terminal, and review failed/cancelled runs for partial writes.
Prevent new manual/legacy admissions throughout the exclusive window. Refresh
main, full inventory and candidate again after draining. An off variable alone
is insufficient. Unrelated source refreshes must not be changed by this milestone;
if any writer moves main, abort the stale publish and rebase/review afresh.

Record the actual authorization outside the candidate tree, for example in ignored
`tmp/editorial/operator-go.json`. Replace placeholders only after real approval;
this is a **format example**, not a granted GO:

```json
{
  "schemaVersion": 1,
  "action": "cutover",
  "operator": "<actual operator>",
  "window": "<authorized window/reference>",
  "expectedMain": "<exact fresh 40-hex remote main>",
  "candidate": "<exact reviewed 40-hex PR head>",
  "ciRunId": 0,
  "admissionHeld": true,
  "authorizedAt": "<actual ISO authorization time>"
}
```

The real CI run ID must be positive, completed/successful, the project's `ci.yml`,
and match candidate SHA. GO is bounded to one action/main/candidate/window;
changing any of them requires renewed review/authorization. The example fails
schema checks intentionally until filled with real evidence.

### 3. Guarded atomic switch, still frozen

Only after GO, review and green exact-head CI:

```bash
bun scripts/timeline-cutover-operator.ts check tmp/editorial/operator-go.json
bun scripts/timeline-cutover-operator.ts publish tmp/editorial/operator-go.json
```

`check`/`publish` perform fresh **read-only** GitHub control/run/CI observations;
they never set variables or enable/disable workflows. They require an off variable,
manually disabled workflow, complete paginated run history, no active jobs, a
fresh (≤120 seconds) observation and a matching explicit GO (≤1 hour). They re-read
controls and compare remote main. Cutover validation replays full source history,
blob and target contents; selection must be v2/frozen and match the ledger.

Publish requires candidate ancestry and a compare-and-swap lease on exact remote
main. The explicit lease cannot rewind main because ancestry is verified first;
it is not an unconditional force push. A concurrent push fails and requires
fresh inventory/review, never a blind retry. This publishes the reviewed candidate
atomically and can mark its PR merged by reachability. Do not bypass with a blind
GitHub UI merge after base drift. The tool writes observation receipts to ignored
scratch; preserve the actual GO/receipt, hashes and run IDs in the final reviewed
cutover evidence. No receipt was fabricated for this preparation.

### 4. Verify cutover and separately release

Keep M4 disabled/off and storage frozen. Verify the exact published commit's
CI/Pages, deployed feed, all current decisions/labels and the v2-only record path.
If token-trigger suppression prevents CI, explicitly dispatch existing `ci.yml`
and verify exact SHA before release; do not add a new workflow.

Prepare a **separate reviewed release commit** changing only selector admission
from frozen to open, retaining version/path/epoch/data. Give a separate GO receipt
with `action: release`, fresh main, candidate and green CI. The same check/publish
tools reject any extra changed file. After release CI/Pages succeeds, restore the
normal workflow and previous operator-approved variable state **only on explicit
release approval**. Cadence/model remain unchanged. A bounded synthetic preview
may validate recording; do not rewrite an already approved label as a smoke test.

### 5. Failure and controlled rollback

On any failed invariant, keep admissions stopped; do not auto-reset data. Obtain
separate rollback GO and drain v2 jobs. Fetch latest main, including every new v2
write, and prepare a rollback bundle:

```bash
bun scripts/timeline-cutover-operator.ts rollback-bundle origin/main
```

It exports to ignored `tmp/editorial/cutover-rollback/`: latest v1 projection,
latest full v2 archive and a new frozen v1 epoch. In a reviewed rollback candidate,
copy the archive to
`data/presentation/cutover-archives/<archiveHash>/registry-v2.json`, install the
latest v1 projection at the v1 path and the explicit frozen v1 selector. Keep v2
history/ledger; **never restore a frozen old v1 file over newly recorded decisions**.

Use a fresh receipt with `action: rollback`, actual latest main/candidate/CI/window,
then the same check/publish protocol. Rollback validation permits only those
three paths and requires exact bytes derived from the **remote latest v2**, including
archive metadata. Already-identical v1 bytes or a pre-existing identical archive
need no artificial diff; the selector must change. Any intervening record invalidates the old bundle. Check CI/Pages,
labels and payload parity; separately release v1 through the same one-file admission
transition. Stale v2 tickets cannot write through the new rollback epoch.

## Stop and remaining gates

Gate 1 preparation is ready, but real variable access, operator GO, exclusive
window and live freeze verification are **not passed**. No production cutover,
merge, release, variable mutation, post-cutover CI/Pages or live v2 write is claimed.
The authenticated live observation/publish path has not been exercised against
production; local/bare-remote tests do not prove those credentials are available.

**Next concrete step:** operator reviews the green PR and supplies a separate GO
for a specific freeze/cutover window; verify controls and refresh inventory before
publishing. Stop after E2a.1. No displaySummary/E2b, evidence-triggered requeue, E3
or E4 work was started.


## 2026-10-28 — fixes for independent Astra High review

**Status: fixes implemented and locally validated; focused independent re-review
still required. PR #115 remains Draft / NO GO.** There was no merge, live
cutover/release, Actions-variable/workflow-state change or AI call. No operator
GO has been granted. Evidence-triggered requeue remains unwired.

Baseline: original reviewed head `794bda294d3f4e4e31a67b35035d66ace1dbb9d1`,
updated with current main `06102a76c602d86e924432bcd612e1a0967cb467`.
Only the status introduction needed merge reconciliation; independent HSR,
snapshot and research changes are retained from main without editing their code.
No parallel fixes were present. A fresh read-only full-history inventory at this
main still reports **75 = 25 operator_approved + 50 automated + 0 legacy_unknown**,
22 labels, the same source blob/hash and four registry-changing commits as above.
The live cutover ledger remains a prepared boundary, not a renewed production
GO; it must still be refreshed against the actual exclusive cutover window.

### BLOCKER — immutable history versus mutable operational state

Reproduced before correction in an isolated copy of the reviewed code: changing
only admission to open failed 4 cutover tests; an accepted 76th decision failed
5; projecting latest v2 to rollback v1 failed 6. These are local test failures,
not production incidents. The cause was module-level loading of production
registry/selector files as historical constants, followed by exact initial-state
assertions. The original writer drill additionally substituted success for real
`bun test`/`bun run` execution.

Minimum correction:

- `test/fixtures/editorial/cutover-2026-10-27/` stores exact reviewed v1/v2/ledger
  bytes, with independently pinned SHA256 values and documented source head.
  All historical 75-record/origin/label/migration assertions remain intact.
  Frozen/open selectors are constructed explicitly, independently of live state.
- `test/timeline-cutover.test.ts` validates the current selected storage schema,
  projection and canonical bytes without pinning its count/admission/version.
  PR #87 historical guard/model assertions in `timeline-label-accept.test.ts`
  and `timeline-label-agent.test.ts` use the existing frozen E2a fixture too.
- `test/timeline-cutover-lifecycle.test.ts` replaces the stubbed writer drill.
  It copies actual current source into a disposable repository and local bare
  remote, runs **real typecheck + entire suite + full build** in frozen/released/
  post-write/rollback states. The post-write gates execute inside actual
  `record.sh` before the local-only push. Bun/bunx are real executable symlinks.
  Child suites skip only this recursive orchestrator through a private, uncommitted
  `.git` marker; all other tests and build commands execute normally. No check
  command is replaced or bypassed. Ordinary CI runs the orchestrator too.

The real lifecycle proves release → new v2 write → rollback succeeds with all
75 prior decisions/origins/fingerprints retained, a trusted automated/null 76th
record, a registry-only write, idempotence, latest-state rollback and committed
full metadata archive. Old v1 writer, frozen writer and stale v2 ticket after
rollback are refused. The existing concurrent-write/CAS race tests remain intact.
The drill runs without full history, network, model calls or production controls.

### IMPORTANT — archive must be in the reviewed Git tree

Reproduced before correction: committing only rollback selector/v1 while leaving
the exact archive untracked allowed `validateCandidate()` to succeed. A new
negative regression initially failed because the validator resolved successfully.
`git diff HEAD` excludes untracked files; reading the archive via `Bun.file()`
therefore did not prove it belonged to the candidate being published.

`scripts/timeline-cutover-operator.ts` now reads the expected archive as a blob
from `${candidate}:${archivePath}` with `git cat-file blob`, and compares **exact
bytes** against `prepareRollback()` from latest v2 at expected main. Missing or
mismatched blobs fail closed. A pre-existing identical committed archive need
not have an artificial diff. No other operator/publication guard changed.

Regressions reject untracked-only and committed whitespace-altered archives;
the exact committed archive passes validation both in the original test repo
and a clean clone. The archive includes post-write origin and a non-null test
evidence hash. Risk assessment remains Astra's: this violated the separate
archival guarantee; it did **not** immediately delete metadata from the previous
v2 file or Git history.

### Verification and parity

Bun **1.3.14**: frozen install, typecheck, full test suite and full build pass.
Final local full suite: **1,360 pass / 3 existing age-dependent skips / 0 fail**,
74 files. Each child full-suite gate runs all non-recursive tests (1,359 pass;
the extra child-only skip is the orchestrator). Exact-head PR CI, including PG17
concurrency/encrypted recovery and Build site, is recorded in PR #115's delivery
record/Checks; Pages is intentionally skipped for the unmerged PR.

The regression now builds fixed-input v1, frozen v2, open v2, post-write v2 and
rollback v1 views. Public events/labels remain identical; latest v2/rollback queue,
agent-input and review bytes match. An additional actual full-feed replay with
current main's snapshots at **2026-10-28T00:00:00.000Z** produces **243 events**,
with byte-identical v1/frozen-v2/released-v2 outputs:

| Public output | SHA256, identical across the three selections |
| --- | --- |
| events.v1.json | `f1592570dc3fd56840b220baafe506f4ee2633a3d9e312e22ce1cd7728038518` |
| timeline-label-queue.v1.json | `88dc687dcef45f06b388b20577bb9722fda0752ce5e1f919a361eeeb2db80eeb` |
| timeline-label-agent-input.v1.json | `4c3206bfbc6fd25f11462688a4e0506a6a023830715a24f83a23c7af91be0a6a` |
| review.v1.json | `f90f4c9dcbf584f590669dac2a719219acaa7d5fdfd466b38e0e8d2c545f422d` |

The event-count/hash difference from the original 241-event report comes from
independent current-main data/HSR changes and the replay clock, not this fix.
No fingerprint, label guard, proposal, queue, workflow, writer or client logic
was modified by this follow-up; the sole runtime correction is archive validation.
Earlier browser smoke is historical, not repeated or claimed as new evidence.

**Next concrete step:** focused independent Astra High re-review of these two
fixes and their regressions. Only after that review may the operator separately
consider GO with fresh main/inventory, authenticated controls and writer
quiescence. Missing variable access remains a live gate blocker; no freeze is
inferred from a dated run listing. **STOP: no E2b/E3/E4.**
