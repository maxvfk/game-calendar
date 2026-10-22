# Genshin Phase II character banners — verified regional end precision

**Status:** complete and deployed in PR #60 (2026-10-22); durable factual
capture tests in #61.
**Evidence:** [event-time-precision-audit.md](../research/event-time-precision-audit.md),
S9–S11. Independent from the CZN task and region-start design.

## Confirmed bounded problem

Current KQM parsing discards clock components of both tag types. Two published
Phase II rows have day-only Nov 3 ends despite the dated publisher duration:
Oct 13 2026 18:00 → Nov 3 2026 14:59.

- `genshin:void-stars-advent:2026-10-13`
- `genshin:la-chanson-cerise:2026-10-13`

The official Phase II announcement is
https://www.hoyolab.com/article/47010361 .
The matching publisher Skirk post
https://www.hoyolab.com/article/47031763 explicitly calls its Oct 13 18:00 opening
Server Time. In-game notice mirrors 21888/21889 carry both boundaries as the
same `t_lc` clock. The audit identifies the regional end by that **bounded
synthesis**, not a newly proven universal meaning for every tag.

Re-read those sources on CURRENT main and check for publisher corrections.
Record the zone evidence together with the duration. If the matched schedule or
zone association cannot be reproduced, stop the affected row at an evidence
checkpoint rather than treating this task as authority to guess.

## Minimal implementation

Use two official reviewed rows with existing titles and explicitly pinned IDs.
Keep Oct 13 **day starts**: the current schema cannot give every region its own
18:00 start without a larger change. Set exact ends:

| Boundary | ISO UTC |
|---|---|
| Canonical / Asia | `2026-11-03T06:59:00.000Z` |
| Europe | `2026-11-03T13:59:00.000Z` |
| America | `2026-11-03T19:59:00.000Z` |

Use `regionScoped:true`, all three `regionEnds`, `endPrecision:exact`,
official provenance and canonical publisher URL. Existing fixed server offsets
are UTC+8 / UTC+1 / UTC−5; never use browser-local DST offsets.
Preserve published firstSeenAt and set per-row reviewedAt. Do not rename the
events or use featured-character names as new event identities.

Do not change the KQM parser, schema, generic merge, snapshots, recurring rules,
daily reset, Account Sync or other records. Do not add the missing Phase II
weapon banner under this precision task. Carefree Snowball Fight and other
`t_lc/t_gl` cases remain separate evidence gaps; this is not blanket promotion.

## Required verification

- Focused merged-feed assertions: two IDs retained, official reviewed winners,
  all three exact ends, day starts unchanged and no new conflict/duplicate.
- Existing historical fixture tests may assume reviewed coverage is a closed
  set. Scope historical assertions to their original rows and separately assert
  the new two-row merge; do not manufacture new source content.
- Existing marks remain keyed to both IDs after refresh; no user-state migration.
- Asia/Europe/America immediately before / at / after each regional end:
  effective end, expiry/filter, deadline sorting, Timeline and Event Detail
  precision agree. Unsupported-region fallback uses canonical Asia as before.
- Exact official disagreements, including a one-minute or western-only
  discrepancy, still require review. Do not silently reconcile.
- Unrelated reviewed row values and timestamps byte-stable. Feed ID set stable;
  only the two proposed winner records change semantically.
- Run the four AGENTS commands, update implementation status/backlog, PR/green
  CI/merge and verify current published feed. Preserve source-health/LKG.

**Next concrete step:** final operator phone/PC acceptance; regionStarts and
other precision cases remain separate and are not started by this task.
