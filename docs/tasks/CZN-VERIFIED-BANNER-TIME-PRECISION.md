# CZN verified banner time precision — bounded reviewed correction

**Status:** ready; not implemented by the 2026-10-22 audit.
**Evidence:** [event-time-precision-audit.md](../research/event-time-precision-audit.md),
sections 4–7, S1–S8.
**Scope:** one CZN-only implementation Work from CURRENT main. Use the existing
reviewed channel; keep the conservative Prydwen parser and its estimated provenance.

## Confirmed correction set

Re-read the official notices before editing; a newly published specific exception
wins over this handoff. Preserve the exact existing IDs and titles:

| Existing ID | Proposed start | Proposed end | Source |
|---|---|---|---|
| `czn:nine-rate-up-rescue:2026-10-13` | Oct 13 2026 18:00Z exact | Nov 3 2026 18:00Z exact | STOVE 14555091, explicit paired normal-rescue UTC schedule |
| `czn:alcea-rate-up-rescue:2026-10-13` | same | same | STOVE 14555091 |
| `czn:tiphera-rate-up-rescue:2026-11-03` | Nov 3 2026 18:00Z exact | Nov 24 2026 18:00Z exact | STOVE 14593128, explicit paired normal-rescue UTC schedule |
| `czn:tiana-rate-up-rescue:2026-11-03` | same | same | STOVE 14593128 |
| `czn:rossweisse-rate-up-rescue:2026-10-21` | Oct 21 2026 05:00Z exact | Dec 2 2026 day, pending dated maintenance notice | STOVE 14592676 plus completed maintenance 14592548 |
| `czn:sig-rate-up-rescue:2026-10-21` | same | same | same |

The official announcements refer to pairs, but the already published events are
separate character/partner rows. Preserve them; no combined replacement identity.
Use official source URLs on reviewed records, `provenanceStatus:official`,
confidence 1 and the existing validation/materialization pipeline.

The Dec 2 day field remains a calendar-date placeholder, not an exact UTC claim.
If a specific Dec 2 maintenance notice now exists, verify it independently and
document its event association before changing the end; otherwise leave day.
The standing post-Jul-29 00:00 policy alone is not this task's approval to promote
every future maintenance-linked card.

## Compatibility and negative requirements

- Read CURRENT main, AGENTS, implementation status and the audit before changes.
- Only the six confirmed rows, focused evidence/test additions and documentation.
  No parser, schema, generic merge, clock, snapshot or Account Sync changes.
- Preserve firstSeenAt from each existing published event when introducing its
  reviewed winner; set per-row reviewedAt. Leave all unrelated rows/timestamps
  unchanged. Explicit IDs are acceptable and protect personal completion keys.
- Preserve source-health/LKG: reviewed data cannot refresh Prydwen's confirmation,
  hide a parser failure or resolve unrelated NTE/Endfield conflicts.
- Do not revive retired Sereniel/Peko in production just to fix history.
  Their historical Sep 30 05:00Z → Oct 21 00:00Z is useful test evidence.
- Do not change the daily 18:00 reset policy, day labels, daily logs or user data.
- Future Blazebell/Vivian/Dahlia/Edelyn 07:00-looking starts stay conservative
  unless their own source confirms opening. No duration/cadence projection.
- The historical Olga trial day end is a separate low-priority finding; other
  old Sep 30 rows are not an authorized bulk precision upgrade.

## Focused tests and acceptance

1. Official UTC windows beat current Prydwen day rows with the **same ID set**,
   no duplicate paired-rescue rows, correct official URLs and no new conflicts.
2. Just before / at / just after Nov 3 and Nov 24 18:00Z, Asia/Europe/America
   agree on expiry, remaining-time sorting, Upcoming and Event Detail precision.
   For Ross/Sig validate confirmed 05:00 opening and continued day-only end.
3. The archived Sereniel/Peko case demonstrates that independently verified
   midnight may be exact while generic hidden midnight remains insufficient.
   Use an attributed factual test-only excerpt of this repository's Oct 20
   capture, not a production snapshot replacement.
4. Maintain negative coverage for original Narja/Gaya 07:00/00:01 disagreement,
   open-ended From ranges, malformed dates, mismatched pairs and future
   maintenance placeholders. No global hidden-clock promotion.
5. Update the fixture-specific test in `test/prydwen-czn.test.ts` that currently
   assumes **every** reviewed banner exists in the Sep 22 fixture. Retain its
   historical subset assertions and add a separate current-capture merge check;
   do not broaden a historical fixture or remove official-precedence coverage.
6. A one-minute official exact conflict and region-only exact conflict still
   surface. Existing marks keyed to all six event IDs remain attached after
   feed refresh; no completion/Sync storage migration or rewrite.
7. Diff feed IDs and boundary fields; changes limited to six reviewed winners.
   Compare observation timestamps separately. All four AGENTS commands pass.
8. Update implementation status/backlog, docs/data/tests PR, successful CI,
   merge and verify the public feed's exact fields. Do not start other tasks.

**Next concrete step:** execute this task after separate authorization; audit
delivery does not itself authorize production corrections.
