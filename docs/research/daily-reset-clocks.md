# Daily reset clock audit — seven-game synthesis

Checked **2026-10-22 (Moscow)**. All **7/7 research stages complete**, in the
approved order, with a separate GitHub commit/report per game.
**Research completion does not mean all clocks are resolved:** NTE remains
conflicting. No runtime code, reset constants, user data, account/sync, event
feed, ingestion or UI was changed.

Baseline: main `e05fa8b64262b35607a6296171604f6eb79fedea`.
Task: [DAILY-RESET-CLOCK-AUDIT](../tasks/DAILY-RESET-CLOCK-AUDIT.md).
Each report is independently readable and records sources, access limits,
absolute examples, DST and compatibility. Do not repeat completed source
research without a new fact.

## Comparison

Times below are **recurring UTC times of day**. For 04:00 UTC+8,
20:00Z is on the **previous UTC date relative to the server-labelled day**.
CZN's corrected day-label convention is intentionally undecided.

| Step / game | Real server mapping to app Region | Sourced daily rule | Current code UTC (Asia / Europe / America) | Assessment and evidence |
| --- | --- | --- | --- | --- |
| 1 [Endfield](daily-reset-clocks/endfield.md) | Asia → asia; Americas/Europe → america or europe | 04:00; fixed +8 / −5 western; 20:00Z / 09:00Z | 20:00 / 09:00 / 09:00 | **Confirmed correct**; official released login clock + historical official reset + task corroboration |
| 2 [NTE](daily-reset-clocks/nte.md) | Asia, America, Europe; separate SEA lacks selector | Core clock conflicting: 04:00 vs 05:00 claims and western conversions; official 05:00 applies to named events | 20:00 / 03:00 / 09:00 | **Conflicting/unverified**; permanent tasks and DST not settled |
| 3 [CZN](daily-reset-clocks/czn.md) | Published service schedule is UTC-based; geographic choices should not invent separate clocks; account topology not certified | **18:00Z daily**; 03:00 KST next date equivalent | 20:00 / 03:00 / 09:00 | **Confirmed discrepancy**; official indexed reset table + independent full-text table/report |
| 4 [Genshin](daily-reset-clocks/genshin.md) | America/Europe/Asia; TW-HK-MO uses asia clock alias | 04:00 fixed −5/+1/+8 | 20:00 / 03:00 / 09:00 | **Confirmed correct**; explicit official commissions clock and offsets + KQM corroboration |
| 5 [HSR](daily-reset-clocks/hsr.md) | America/Europe/Asia; TW-HK-MO uses asia clock alias | 04:00 fixed −5/+1/+8 | 20:00 / 03:00 / 09:00 | **Confirmed correct by converging sources**; publisher-hosted login text, independent Daily Training and regional references; primary-access limits |
| 6 [WuWa](daily-reset-clocks/wuwa.md) | America/Europe; Asia/SEA/HMT share asia clock alias | 04:00 fixed −5/+1/+8 | 20:00 / 03:00 / 09:00 | **Supported correct**; recent official sign-in clock; regional/DST secondary corroboration; historical conversions conflict |
| 7 [ZZZ](daily-reset-clocks/zzz.md) | America/Europe/Asia; TW-HK-MO uses asia clock alias | 04:00 fixed −5/+1/+8 | 20:00 / 03:00 / 09:00 | **Supported correct**; official daily-login clock plus independent Errands/regional corroboration; source typos identified |

“Confirmed correct” means evidence converges on the app's mapping for the
scoped international service; it does not mean this Work observed every
server in game. “Supported correct” explicitly carries weaker all-region
primary evidence. All official URLs were freshly checked, but several return
JS shells; reports distinguish indexed primary excerpts from directly read
full text. HoYoWiki is publisher-hosted and collaborative, not automatically
publisher-authored. No authenticated game countdown was captured.
CN-specific services were not separately certified.

## Confirmed errors versus hypotheses

**Confirmed runtime discrepancy: CZN.** At `2026-10-22T12:00:00Z` the next
published reset is `2026-10-22T18:00:00Z`. Actual app helpers return
Oct 22 20:00Z (Asia), Oct 23 03:00Z (Europe), Oct 23 09:00Z (America):
2/9/15 hours late for that probe. This is not a nearest-reset attribution bug.

**Confirmed representation limits:** the one profile-wide Region has only
america/europe/asia; NTE officially has four independent servers including
SEA. WuWa and HoYo additional regional server names can be clock aliases
where equivalence is sourced, but the current labels do not explain that.
Different servers across different games cannot be expressed by one Region.
These are model/copy limitations; they do not themselves prove wrong UTC
instants for every affected user.

**Not confirmed:** NTE needs a universal 05:00 override; NTE western clocks
follow DST; every daily login/event shares a permanent task clock; a user's
reported countdown issue is caused by a specific selected Region; an old
WuWa conversion table proves a current policy change. No such assumption is
approved for implementation. NTE's **event-specific** official 05:00 rule is
real but cannot establish permanent Exploration Guide rollover.

**No supported clock correction:** Endfield, Genshin, HSR, WuWa or ZZZ in
their scoped mappings. Do not “fix” 05:00 summer wall-time displays by moving
04:00 server clocks. Browser locale, residence, in-game time progression,
maintenance, weekly seasons and web check-in are separate concepts.

## DST examples

| Clock | Before / after local DST change | UTC reset | Local wall display (calculated) |
| --- | --- | --- | --- |
| EU default fixed +1 | 2026-10-24 / 2026-10-26 | 03:00Z both | Amsterdam 05:00 CEST / 04:00 CET |
| Western Endfield fixed −5 | same dates | 09:00Z both | Amsterdam 11:00 / 10:00 |
| America default fixed −5 | 2026-10-31 / 2026-11-02 | 09:00Z both | New York 05:00 EDT / 04:00 EST |
| CZN stated UTC schedule | Oct 24 / Oct 26 | 18:00Z both | Amsterdam 20:00 / 19:00 |
| Asian fixed +8 | any adjacent server days | 20:00Z previous UTC date | No server DST change |

NTE remains outside this confirmed fixed-clock table: reports compare fixed
and seasonal candidates instead. Its winter policy needs evidence; do not
apply a default seasonal assumption.

## Persistence and minimal safe implementation proposal

Observed contracts:
- `dayKey = ISODate(now + resetShiftMs)`; `nextResetMs` is strictly after
  input; `dayStartMs` is the inverse labelled-day boundary.
- `DailyLogMap` stores subject IDs, day strings and one log-level last-edit
  `at`. It does not store each completion instant, original server or clock
  policy. `dailies:<game>` and event IDs must remain stable.
- Export/import retains/merges strings. Sync keys `(subjectId, dayKey)`,
  carries versioned edits and false-completion tombstones, and lacks clock
  versions. `changedAt` is not a completion timestamp: catch-up, first login
  and import can create/edit older days. Guest/account profiles are isolated.
- Changing constants does **not** automatically move existing stored strings;
  it changes what interval/today they are interpreted against. Streaks,
  today's completion, catch-up strips, event daily windows and summary counts
  can change. Region switching already has this effect without migration.

**Recommended order, separate tasks; none implemented here:**

1. **CZN only — establish day labels and a forward transition before changing
   clocks.** UTC 18:00 (`shift=-18h`) and KST 03:00
   (`shift=+6h`) have identical reset instants but label Oct 22 19:00Z as
   Oct 22 versus Oct 23. Choose and document one convention. Prefer preserving
   historical day-string claims verbatim over an impossible automatic retiming.
   Do not shift/duplicate/clear all legacy marks using log `at`.
   An explicit cutover/policy marker may be needed to distinguish new writes
   from legacy labels; design only the metadata needed for the chosen transition,
   not a broad Account Sync redesign. An empty profile has no history to migrate.
2. **Bound the shared-clock impact.** Do not change global
   `RESET_HOUR_LOCAL` or defaults. A CZN-specific fixed daily rule is the
   smallest correction; do not fake a server offset just to preserve 04:00.
   Review `serverOffsetUtc` separately from daily rollover:
   `dayStartMs` also resolves day-precision event dates in `clockFor`;
   `latestBoundaryMs` is used by some parsers and
   `serverOffsetUtc` by recurring-endgame calculations. A daily-only policy
   can avoid unrelated semantic changes. Any wider effect requires explicit
   acceptance, with exact event instants/IDs retained.
3. **Make the transition idempotent across storage/import/Sync.** Back up
   original logs, preserve old exports and profile boundaries, define how
   imported legacy marks remain interpretable, and prevent two devices or an
   offline old client from writing incompatible day labels. If cutover metadata
   is used, specify its account propagation/version compatibility before
   rollout. No destructive historical migration is supported by existing data.
   A forward-only correction preserves claims, but cannot promise to reconstruct
   every historical true streak; state that limit explicitly.
4. **NTE verification only.** Obtain permanent-task countdown + selected server
   + absolute UTC for each server and western before/after DST, or publisher
   clarification. Keep named event clocks separate. No generic 05:00 change.
5. **Optional low-risk server wording/aliases.** Explain selected game server
   versus browser display timezone; explain supported clock aliases without
   renaming IDs or rewriting ticks. A per-game selector is a separate product
   decision, not necessary to correct verified CZN daily instants.

Required future verification matrix:

| Surface | Necessary cases |
| --- | --- |
| nextResetMs / dayKey / dayStartMs | reset−1ms, exact reset, reset+1ms; strict-next rule; label inverse; UTC month/year; each region |
| DST / selected server | fixed UTC across EU/US changes; reader timezone changes; wrong/changed Region; mixed-server limitation |
| dailyDays / dailySummary | exclusive reset endpoint; straddling event windows; doneToday, logged, missed, remaining |
| catchUpDays / streakOf | old marks, 14-day strip and older preserved history; transition-day gaps/collisions; unknown-ended events |
| Import/export / profiles | legacy files, union collisions, repeat import, new reader, guest/account isolation and profile switch |
| Account Sync | two devices, old/offline client, outbox retry/replay, false marks/tombstones, idempotent cutover and rollback |

**Next concrete step:** create a bounded **CZN daily reset correction** task
with selected date-label/cutover semantics and the shared-consumer boundary.
Runtime implementation needs separate authorization. NTE is an explicit open
evidence gap; completed reports for the other games need not be repeated.

## Validation and delivery

- Bun 1.3.14 frozen install passed.
- `bun run typecheck` passed.
- `bun test`: **1110 pass / 1 optional age-encryption skip / 0 fail**,
  1111 tests in 56 files.
- `bun run build` passed after providing the missing local `bunx` executable
  alias; first attempt stopped at that environment lookup. No repo change
  was needed. Build uses existing snapshots; no network source refresh.
- Read-only probe executed current helpers for all 21 game/Region combinations.
- Final PR/hosted CI/merge evidence is recorded in its PR description; source
  research conclusions do not imply runtime fixes were deployed.
