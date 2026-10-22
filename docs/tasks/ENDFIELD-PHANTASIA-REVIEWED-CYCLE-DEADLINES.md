# Phantasia — official reviewed internal cycle deadlines

**Status:** complete and deployed in PR #58 (2026-10-22), authorized by the
sequential implementation Work. Automatic wiki recovery remains blocked.
**Basis:** `docs/research/endfield-recurring-endgame.md` §17, checked 2026-10-22.
**Scope:** bounded Endfield reviewed data and focused regression/visibility tests.
No parser acceptance, health policy, source disabling, LKG rewrite, schema change,
Daily Reset, Account Sync or Timeline UI changes.

## Problem and decision

The wiki first-cycle opening is contradictory and must remain rejected. The
official cycle infographic independently specifies exact cycle endpoints and
fixed server offsets. Restore the two internal deadline records through the
existing `data/reviewed/endfield.json` path, keeping the season's final deadline.
This restores coverage; **it does not recover the automatic source**.

Before edits, start from CURRENT main, read AGENTS/status, §16–17, reviewed
README/materializer/schema, parser/build-feed/merge and existing Endfield tests.
Re-read the [official announcement](https://x.com/AKEndfield/status/2109871758140711172)
and its [image](https://pbs.twimg.com/media/HUPRW3QbgAAK4sK?format=webp&name=large).
If it has changed or cannot be verified, stop the data change and record the
specific gap; do not substitute a weekly schedule or silently use wiki dates.

## Data contract

Use these exact titles and canonical **day-precision** starts, matching the
existing automatic cycle identity contract. Day starts are calendar row anchors,
not a claim that play opened at UTC midnight or simultaneously in every region.
Do not introduce region-specific exact starts into the current schema.

| Title | startsAt / startPrecision | Stable ID |
| --- | --- | --- |
| Echoes of War: Season of Phantasia — Cycle I | 2026-10-15T00:00:00.000Z / day | `endfield:echoes-of-war-season-of-phantasia-cycle-i:2026-10-15` |
| Echoes of War: Season of Phantasia — Cycle II | 2026-10-22T00:00:00.000Z / day | `endfield:echoes-of-war-season-of-phantasia-cycle-ii:2026-10-22` |

Cycle I already ended. Retain it as the explicitly sourced historical row if
shipping the two-row season contract; do not make it active or extend its end.
If execution happens after Cycle II expires, report that this historical repair
cannot restore an upcoming Phantasia deadline; do not invent a next season.

| Row | endsAt = regionEnds.asia | regionEnds.america = regionEnds.europe |
| --- | --- | --- |
| Cycle I | 2026-10-21T19:59:00.000Z | 2026-10-22T08:59:00.000Z |
| Cycle II | 2026-10-28T19:59:00.000Z | 2026-10-29T08:59:00.000Z |

Both rows: `type: challenge`, `regionScoped: true`, `endPrecision: exact`,
`provenanceStatus: official`, confidence 1 after fresh verification, official
announcement post as `sourceUrl`. Record actual row-specific `reviewedAt`; leave
unrelated batch/row timestamps untouched. Describe the **next cycle's 04:00
opening** in the summary while preserving the explicitly sourced **03:59 end**.
Do not shift ends by a minute. Materializer supplies manual extraction/sourceId.

No separate Cycle III row: existing season event already ends Nov 5 03:59Z Asia /
16:59Z western. Preserve its ID `endfield:season-of-phantasia:2026-10-15`, all
other published IDs, old Illusion IDs and existing data. Do not redate the season
to the western opening date. The current schema has one canonical start; exact
regional start modeling is unnecessary here and belongs to a separate decision.
The actual first-opening minute remains unknown and must not be labeled exact.

## Acceptance and failure cases

- Materialization/schema/calendar validation accepts official records with the
  exact regional endpoints above. No relative-timer conversion, speculative
  +7-day calculation or data from another season enters production.
- At an injected Oct 22 12:00Z, Cycle I is expired; Cycle II is visible under
  Endfield + Endgame and uses Oct 28 19:59Z Asia / Oct 29 08:59Z western for
  sorting/countdowns. At Oct 28 20:00Z it has ended only in Asia; western remains
  visible until its own end. Cover exact end boundary behavior.
- Test `Ending soonest` eligibility/sort through existing selectors. Browser
  smoke uses current Timeline and Event Detail in both region groups, without
  changing UI. Final Android operator smoke remains with the user.
- Cycle III/season end is represented once; unchanged season/Illusion IDs and
  all unrelated records remain. At execution-time expiry, normal feed expiry
  filtering is expected, not a test failure or reason to extend timestamps.
- Contradictory wiki still fails the original regression and retains LKG and
  broken health after refresh failure. Reviewed records must not fabricate wiki
  confirmation, change the threshold or suppress a new broken transition.
- Test later hypothetical consistent automatic recovery with **test-only**
  explicit regional schedule: no duplicate cycle IDs, official/manual record
  retains honest provenance, and exact-end disagreement in any region surfaces
  a conflict (including one minute); no silent replacement of official dates.
  Do not modify live snapshots or manufacture upstream corrections for this test.
- If corrected upstream later changes canonical day/title, stop for an explicit
  identity decision. Do not casually rename these IDs or migrate user marks.

## Delivery

Use a fresh short branch. Run frozen install, typecheck, full tests and full
build. Compare feed semantic diff: only the intended cycle additions/normal
expiry; no new Endfield date conflicts. Record validation and coverage vs
source-health distinction in IMPLEMENTATION-STATUS. PR/CI/merge/deploy, then
verify public feed and both regional deadlines. Do not trigger a broad refresh
merely to imply automatic-source recovery; if Refresh is used to check upstream,
report its actual outcome and retain all safety predicates.

Stop after this bounded data repair; no new endgame systems or future seasons.
