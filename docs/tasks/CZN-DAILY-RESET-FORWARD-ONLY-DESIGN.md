# CZN 18:00 UTC daily reset — forward-only compatibility gate

> **Decision update — 2026-10-23:** The operator approved
> **UTC opening-date** labels and **requiring an updated compatible PWA for
> new CZN daily writes after server-confirmed cutover**. These choices supersede
> the two unresolved product options recorded in this 2026-10-22 investigation.
> They do **not** remove the SQL/RPC, offline Sync, history, export/import,
> backup and rollout proof obligations below. The separately authorized
> implementation scope is
> [CZN-DAILY-RESET-SAFE-CUTOVER-IMPLEMENTATION.md](CZN-DAILY-RESET-SAFE-CUTOVER-IMPLEMENTATION.md).
> No production clock/policy change has been deployed.

**Status: BLOCKED — no runtime rollout.** Technical evaluation completed
2026-10-22 for step 4 of VERIFIED-DATA-CORRECTIONS-SEQUENTIAL.
Baseline runtime: main `12d29a7cf40634f4b1bc0a9dc601b1fb9d3c9bae`;
the following capture-pin checkpoint changes tests/docs only.

The confirmed reset instant is **18:00 UTC**, independent of the app Region.
This note reuses the completed evidence in
[czn.md](../research/daily-reset-clocks/czn.md) and
[daily-reset-clocks.md](../research/daily-reset-clocks.md); it does not repeat
the seven-game research or conflate banner deadlines with daily rollover.
Official basis: [English UTC table](https://page.onstove.com/chaoszeronightmare/en/view/11135950),
[Korean guide](https://page.onstove.com/chaoszeronightmare/kr/view/11135915).
Those establish a clock, not a canonical date label for this app's stored claims.

## Decision and release boundary

Do **not** change GAMES.czn, RESET_HOUR_LOCAL, regional defaults, server offsets,
resetShiftMs, any daily helper, local profiles/exports, Sync wire or database.
No production user data or authenticated account was accessed for this analysis.
Existing incorrect regional reset countdowns remain a known limitation.

A constant-only or client-marker-only correction cannot meet the required
historical, old-client and offline-Sync contract. Two unresolved choices remain:

1. Product date-label convention: UTC opening-date labels or Korean next-date
   labels. Recommendation for discussion: UTC opening date, because the
   international guide explicitly publishes UTC+0. KST has a sourced clock basis
   too; selecting it is a product decision, not a timezone arithmetic correction.
2. Whether to require an updated client for CZN daily writes after a profile's
   cutover. Current old clients cannot understand policy epochs. A server gate
   and explicit update/read-only behavior need a separate protocol design and
   release acceptance. A date-label choice alone does not unblock rollout.

## Reproduced label and Sync counterexamples

Executed the current Bun helpers, SyncMutation/applyMutation and export/import
locally with synthetic data. No mocks of the merge algorithm were used.

| UTC instant | Current Asia / Europe / America dayKey | UTC 18:00 candidate | KST 03:00 candidate |
| --- | --- | --- | --- |
| 2026-10-22 17:00 | Oct 22 / Oct 22 / Oct 22 | Oct 21 | Oct 22 |
| 2026-10-22 19:00 | Oct 22 / Oct 22 / Oct 22 | Oct 22 | Oct 23 |

Candidate key = ISODate(now + shift), shift −18h for UTC and +6h for KST.
Both candidates give the next boundary Oct 22 18:00Z at a 12:00Z probe.
Their stored strings differ despite identical reset instants.

A legacy log `{days:["2026-10-22"], at:"2026-10-23T12:00:00Z"}` can result
from retrospective ticking/import of either first-column instant. The same
bytes would need two different candidate labels. Neither log `at` nor mutation
`changedAt` identifies the original completion instant or selected Region.
Lossless conversion is therefore underdetermined, including for UTC labels;
choosing UTC does not solve history by itself.

Actual merge probes under stable subject `dailies:czn`:

- KST candidate claim: day Oct 23, completed true, changed Oct 22 19:00Z.
  Old offline retrospective removal: day Oct 22, completed false, changed
  Oct 23 12:00Z. `applyMutation` retains **both** logical registers. The old
  removal does not target the new candidate claim for the same possible
  underlying game day. Changing timestamps cannot repair the key mismatch.
- UTC candidate claim: day Oct 22, true, changed Oct 23 10:00Z. Old-client
  retrospective removal: day Oct 22, false, changed Oct 23 11:00Z. The newer
  tombstone wins. The protocol cannot distinguish a legitimate undo from an
  edit referring to the differently defined legacy interval.
- Supplying `clockPolicy:"czn-kst03-v2"` to an existing daily mutation is
  silently stripped by `SyncMutation.parse`; adding an unknown preference key
  `cznDailyClockPolicy` fails validation. An ad-hoc local marker does not travel.
- `buildExportData` / `parseImportData` preserve the ambiguous day strings.
  `parseImportData` does not check export `version`; unknown policy metadata
  with the same format identifier would be ignored by the old importer.

Minimal read-only reproduction from repository root (Bun; synthetic data only):

```ts
import { dayKey } from "./src/shared/daily.ts";
import { HOUR } from "./src/shared/time.ts";
import { SyncMutation, applyMutation, emptySyncState } from "./src/shared/sync.ts";
for (const t of ["2026-10-22T17:00:00Z", "2026-10-22T19:00:00Z"]) {
  const ms = Date.parse(t);
  console.log(dayKey(ms, "asia", "czn"),
    new Date(ms - 18 * HOUR).toISOString().slice(0, 10),
    new Date(ms + 6 * HOUR).toISOString().slice(0, 10));
}
const make = (done: boolean, hour: string, mutationId: string) => SyncMutation.parse({
  kind: "daily", key: { subjectId: "dailies:czn", dayKey: "2026-10-22" },
  completed: done, changedAt: `2026-10-23T${hour}:00:00.000Z`, mutationId,
});
const first = applyMutation(emptySyncState(), make(true, "10", "new-policy-claim"));
console.log(Object.values(applyMutation(first.state,
  make(false, "11", "legacy-retrospective-edit")).state.daily));
// Keys: 22/21/22, then 22/22/23. The final completed:false row wins;
// neither row records which clock interval its identical key meant.
```

These are compatibility failures, not faults in existing LWW/tombstone ordering.
Do not weaken ordering, infer from edit times, delete false rows, duplicate ticks
or remint subjects to hide the problem. A truly empty guest profile avoids old
history only until it imports legacy data or joins an existing account; that is
not a safe general rollout shortcut.

## Actual consumer and persistence inventory

| Surface | Current consumers / effect of a constant change | Proposed isolation |
| --- | --- | --- |
| Server identity | time.ts serverOffsetUtc/resetHourFor; games.ts metadata | Keep actual server offsets and global defaults unchanged; no fake offset |
| Daily labels/boundaries | daily.ts dayKey/nextResetMs/msUntilReset; dailyDays/dailySummary/catchUpDays/streakOf | Add explicit daily policy argument and labelled-day inverse; no shared event-clock substitution |
| Event day precision | time.ts boundaryMs → dayStartMs → resetShiftMs; clockFor in App.tsx (ordinary/custom/expanded rows) | Keep existing event-date semantics and exact regional timestamps invariant |
| Feed retention | latestBoundaryMs → dayStartMs; active/retired parser paths in bawiki.ts/fandom.ts | Keep event-retention policy unchanged, including future adapter reactivation |
| Recurring endgame | recurring-endgame.ts fixedResetCycles → serverOffsetUtc | No changes to recurrence or rule anchors; Great Rift maintenance clock is separate |
| UI | Dailies.tsx, DailyChecklist.tsx, EventDetail.tsx, EventRow.tsx and App.tsx call daily helpers | Every write/read must carry the same policy/epoch; countdown-only change would contradict the checklist |
| Guest log | useDailyLog.ts stores day strings + one last edit; merge is union | Preserve historical strings; don't reinterpret old claims as known absolute intervals |
| Export/import | state/export.ts v1; old importer ignores version; daily merge unions strings | A distinct, old-client-rejected format and versioned policy-aware import are necessary |
| Sync identity | shared/sync.ts logicalKey JSON tuple; localSync.ts diffStore/compactOutbox/stateFromOutbox | Add negotiated policy namespace without changing subjectId; protect baseline and exact outbox mutations |
| Wire/database | remote.ts decodeCloudRow/materializeCloud; daily_marks PK(profile_id,subject_id,day_key); account_sync RPC LWW | Server-visible policy/cutover, read/write compatibility and preservation of all false rows required |
| Offline/profile/reload | syncEngine.ts replay/reconcile; storage.ts profile isolation; offline.ts and service-worker update | No per-device-only cutover; cached clients and rollback must not silently write old semantics |

`recurrence.ts` has a local variable also called dayStartMs; it is not the
shared reset helper. Existing user-entered recurrence/timezone rules are outside
this correction. The registered CZN Prydwen parser currently has no
latestBoundaryMs call, but changing a shared helper is still wider than a daily fix.

## Candidate forward-only architecture — proposal, not approved implementation

1. Preserve all existing guest logs and account registers **verbatim**, including
   completed false/tombstones and pending outbox mutations. Treat them as legacy
   claims with their original labels. Do not invent per-day Region or completion
   instants. Distinguish legacy history visibly; do not promise a reconstructed
   true historical streak or join two policy sequences silently.
2. Introduce an explicit CZN daily policy with immutable policyId, selected label
   convention and a future cutover boundary. It must affect daily-task operations
   only, not dayStartMs/clockFor/latestBoundaryMs or serverOffsetUtc. The policy
   applies equally to all three Region selections; event-specific daily eligibility
   still requires its own scope rather than assuming every CZN timer is daily.
3. Negotiate and store a profile/account policy epoch atomically on the server
   before any new-policy write. Keep `dailies:czn` and event subjects unchanged;
   add a policy namespace to the logical register identity/storage/wire instead.
   A local storage upgrade and authenticated baseline must preserve legacy rows,
   tombstones and journal IDs. New client must still read legacy claims.
4. Gate CZN daily writes from clients without the negotiated protocol after
   cutover. The old RPC currently has no version/epoch gate; no local flag can
   retrofit it. Unknown or legacy offline edits must remain exportable/pending
   with an explicit resolution path; never silently retime, drop or acknowledge
   them as applied to a new-policy day. Other games' Sync remains operational.
   Old clients cannot display the new policy, so forced update/read-only handling
   is a real product/protocol decision. Server acceptance and client recovery
   must be designed together, including cached PWA builds.
5. New export format must carry policy-labelled claims, epoch, legacy history
   and required false registers. A different format discriminator is needed
   because old import ignores version. Legacy v1 import remains in a legacy
   namespace; never union ambiguous old strings into the new-policy streak.
   Idempotent imports/cutovers and guest-to-account transitions require explicit
   rules. Empty profiles cannot bypass eventual mixed-policy import/sync cases.
6. Rollback must retain a policy-aware reader and protected writes. Serving an
   old bundle again is not a semantic rollback once new-policy claims exist.
   No database migration, gated RPC or client implementation is supplied here;
   these requirements demonstrate why safe rollout is not yet proven.

This is the minimum class of solution suggested by the reproduced failures,
not permission for a general Account Sync redesign or an estimated compatibility
promise. If protocol work exceeds the desired bounded scope, keep the correction
blocked and create a separately authorized milestone.

## Required future proof before implementation approval

| Area | Acceptance cases |
| --- | --- |
| Clock arithmetic | reset−1ms/reset/reset+1ms, strictly next reset, labelled-day inverse; UTC date/month/year; all Regions; both sides of EU/US DST |
| Daily UX | dailyDays exclusive endpoint, dailySummary logged/remaining/missed/doneToday, catchUpDays and streakOf around cutover; legacy history remains visible and honest |
| Event invariants | full feed IDs/boundaries, day-precision clockFor/latestBoundaryMs, exact deadlines, custom recurrence and unrelated games unchanged |
| History/import | guest and account, old v1 export, new format, repeated import, false marks and incomplete records; no invented timestamps or silent union across policies |
| Multi-device | two authenticated devices with different update times; old offline outbox replay before/after cutover; tombstone collisions; profile switching; refresh/SW update; repeated cutover and rollback |
| Validation | meaningful regressions reproducing the failure cases; frozen install/typecheck/full suite/build; isolated local DB and safe hosted test identity if needed; desktop and phone-sized browser smoke |

**Gate outcome:** not implementable under the current compatibility contract.
The local reproduction proves missing information and missing protocol semantics;
passing the existing unit suite cannot prove their absence harmless. No hosted
Sync experiment using production identities is needed to establish this blocker.
Final physical-device acceptance and any product choice remain with the operator.

**Next concrete step:** choose the stored day-label convention and old-client
update policy, then authorize a separate narrowly scoped protocol/cutover design.
Do not publish 18:00 UTC as a functional daily reset correction until its full
history/export/import/offline/multi-device proof is complete.
