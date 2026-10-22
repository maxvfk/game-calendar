# Genshin Impact — daily reset audit

Checked **2026-10-22**. Research complete; **confirmed correct** for America,
Europe and Asia/TW-HK-MO clock aliases. No runtime or data migration proposed.

## Baseline and source evidence

Main `e05fa8b64262b35607a6296171604f6eb79fedea`.
`GAMES.genshin` uses default 04:00 with numeric offsets Asia +8, Europe +1,
America −5. Inspected `time.ts`, `daily.ts` and their tests; executed baseline
`nextResetMs`/`dayKey` with Bun. Tests validate arithmetic, not external rules.

All URLs checked 2026-10-22:
- **Official, directly relevant to permanent commissions:** [Tales of the Youkai notice, 2022-12-21](https://genshin.hoyoverse.com/en/news/detail/28280)
  explicitly identifies 04:00 server time as when Daily Commissions refresh.
  Although the article concerns a web event, that sentence specifically describes
  in-game commissions; the evidence is not merely a web-event boundary.
- **Official offsets:** [Seize the Day, 2020-11-29](https://genshin.hoyoverse.com/en/news/detail/6993)
  publishes America UTC−5, Europe UTC+1, Asia and TW/HK/MO UTC+8.
  Both official facts were retrieved in indexed primary text; direct article
  opening returned an empty shell. They are historical notices freshly checked,
  not new 2026 announcements.
- **Independent specialist corroboration:** [KQM Newbie Guide, version 4.6](https://keqingmains.com/misc/newbie-guide/)
  lists international server groups and independently describes commissions
  refreshing at 04:00. Its physical-host locations are not used to infer zones.
- **Recent secondary consistency/DST check:** [ResetClock, updated 2026-10-06](https://resetclock.org/genshin/daily-reset)
  explicitly gives fixed 09:00Z/03:00Z/20:00Z and no server DST. Its unrelated
  shop/endgame claims were not audited.
- [Genshin Wiki Reset](https://genshin-impact.fandom.com/wiki/Reset) search
  excerpt agrees, but direct fetch failed (402); no need to depend on it.
No live authenticated game countdown was captured. No contrary supported
permanent-commission clock or 2026 clock-change announcement was found.

## Mapping and exact comparison

Opening of server day **2026-10-23**:

| App Region | Game server | Reset local | Expected UTC | Current code | Result |
| --- | --- | --- | --- | --- | --- |
| america | America | 04:00 UTC−5 | 2026-10-23T09:00:00Z | same | confirmed correct |
| europe | Europe | 04:00 UTC+1 | 2026-10-23T03:00:00Z | same | confirmed correct |
| asia | Asia | 04:00 UTC+8 | 2026-10-22T20:00:00Z | same | confirmed correct |
| asia (clock alias) | TW / HK / MO | 04:00 UTC+8 | 2026-10-22T20:00:00Z | same | correct clock; no explicit server label |

CN services are distinct account services, not additional international
selector choices audited here. Region must match the selected game server,
not residence, in-game Teyvat clock, language or browser timezone.
A player using mixed servers across games cannot express that with the
existing single profile-wide Region.

**DST:** fixed offsets retain EU 03:00Z on Oct 24 and Oct 26, and America
09:00Z on Oct 31 and Nov 2. Amsterdam's EU-reset display changes
05:00 CEST→04:00 CET; New York's America-reset display changes
05:00 EDT→04:00 EST. These local conversions are calculations. The server
does not move. Asia remains 20:00Z on the previous date. A 05:00 summer
display therefore is not evidence for changing resetHourLocal to 5.
HoYoLAB web check-in uses a separate schedule and must not define commissions.
Resin regeneration and maintenance are also separate clocks.

## Compatibility, profiles and verification requirements

No clock correction means **no migration**. At EU Oct 23 02:59:59.999Z key
is Oct 22; at 03:00Z it is Oct 23, with the strictly-next reset Oct 24 03:00Z.
Default tests cover rollover/month edges and exclusive dailyDays endpoints.

A hypothetical DST offset change would change today's key for the intervening
hour, hence doneToday, catchUpDays and streak anchoring, even without rewriting
stored marks. dailyDays/dailySummary windows and missed/remaining totals would
also move. Logs store day strings plus one subject-level `at`, not per-day
completion instants; neither that timestamp nor Sync `changedAt` can safely
retime old ticks. Exports/imports preserve and union old strings. Guest/account
profiles are isolated, while Sync keys `(subjectId, dayKey)` have no policy
version: renaming locally risks duplicates/replays. Region changes already
change the clock interpretation without converting history. New readers need
only select their actual server.

If labels/settings are clarified later, retain all existing clocks and keys;
verify that browser DST, region switch, export/import and two-device Sync do
not create mutations solely from display changes. Any future clock-policy
proposal must cover nextResetMs, dayKey, dailyDays, catchUpDays, streakOf and
dailySummary, including reset±1ms and UTC month/year.

**Next concrete step:** keep these defaults; consider explicit “game server”
wording and TW/HK/MO clock-alias help separately. Continue stage 5 (HSR).
