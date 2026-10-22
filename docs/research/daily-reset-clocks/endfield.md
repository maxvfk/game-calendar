# Arknights: Endfield — daily reset audit

Checked **2026-10-22**. Research complete; **current mapping confirmed correct**
for the two international server groups. No runtime/data changes.

## Baseline and scope

Main `e05fa8b64262b35607a6296171604f6eb79fedea`; inspected
`src/shared/{games,time,daily}.ts`, `test/{time,daily}.test.ts`,
`src/client/state/{useDailyLog,export,storage}.ts`,
`src/shared/sync.ts`, and account `localSync.ts`/`remote.ts`.
Daily tasks and login rollover only; no Echoes of War research.

## Evidence (all URLs checked 2026-10-22)

- **Official, historical beta:** [Beta Test Notice, 2025-01-17](https://endfield.gryphline.com/en-us/news/7031),
  lines 39–45: daily reset 04:00; Americas/Europe UTC−5; Asia UTC+8.
  Explicit beta caveat means this alone cannot prove the released service.
- **Official, released service:** [Pristine Monthly Pass Tribute, 2026-04-16](https://endfield.gryphline.com/en-us/news/4493),
  lines 33–48: the same two offsets and daily login refresh at 04:00 server time.
  This proves daily login refresh, rather than merely an event endpoint.
- **Independent corroboration of daily missions:** [GameWith, updated 2026-03-05](https://gamewith.net/akendfield/72426),
  daily-task table explicitly says daily tasks reset at 04:00 server time.
- **Contradictions rejected:** [Endmin timeline](https://endmin.moe/de/timeline)
  displays a separate Europe UTC+1 reset; that contradicts the publisher's combined
  western group. [Dexerto](https://www.dexerto.com/wikis/arknights-endfield/server-status-daily-reset-times/)
  treats the Asia instant as worldwide; that also conflicts with official regional
  clocks. [EndfieldHub](https://endfieldhub.org/guides/reset-time) states 04:00
  server time but its western local conversions are inconsistent with UTC−5.
  None should override the primary group map.
- Game8 reset-page direct read failed (402); no conclusion depends on it.
  No authenticated in-game countdown was observed in this Work.

## Regional comparison

Example is the opening of server-labelled game day **2026-10-23**.

| App Region | Actual selected game server | Stated reset | Expected absolute UTC | Current code | Result |
| --- | --- | --- | --- | --- | --- |
| asia | Asia | 04:00 UTC+8 | 2026-10-22T20:00:00Z | same | confirmed correct |
| america | Americas / Europe | 04:00 UTC−5 | 2026-10-23T09:00:00Z | same | confirmed correct |
| europe | Americas / Europe | 04:00 UTC−5 | 2026-10-23T09:00:00Z | same (`europe: -5`) | confirmed correct |

The selector represents the user's game server through a geographic alias, not
the browser timezone. A European resident playing Asia must select Asia; one
global selector cannot describe a player using different regional servers in
different games. There is no separate European Endfield clock in the verified map.
CN-specific service/account routing is outside this international map.

**DST:** the publisher specifies numeric UTC offsets, not America/New_York or
Europe/Paris. Treat them as fixed; no evidence found for seasonal server changes.
For western day 2026-10-24 and 2026-10-26, reset stays 09:00Z, while Amsterdam
wall time changes from 11:00 CEST to 10:00 CET. On US Nov 1 it likewise remains
09:00Z (New York 05:00 becomes 04:00). These wall-time conversions are calculations,
not additional publisher promises. Asia stays 20:00Z on the previous date.

## Storage and compatibility

No correction or migration is warranted for these verified groups. At
2026-10-23T08:59:59.999Z western `dayKey` is 2026-10-22; at 09:00Z it is
2026-10-23. `nextResetMs` is strictly after its input, so at that boundary it
returns Oct 24 09:00Z. Existing tests pin western 09:00Z, Asia behavior, exact
boundary handling, daily event windows and catch-up.

Changing Europe to the tempting UTC+1 would advance rollover six hours:
03:00–09:00Z ticks would acquire a different key, even though stored strings
are not automatically rewritten. `DailyLog` stores days plus one log-level
`at`, not a timestamp per completed day; retrospective reclassification cannot
be reconstructed reliably. This would change doneToday, dailyDays membership,
remaining/missed counts, catchUpDays and streak interpretation. Export/import
unions day strings; importing an old log would not repair this.

Guest and account profiles have separate storage; Sync identifies marks by
`(subjectId, dayKey)` and has no reset-policy version. Mutation `changedAt`
is an edit/conflict timestamp, not proof of the actual completion instant
(catch-up/import exist). Never rename historical keys, duplicate ticks or
emit account mutations merely to align an unsupported clock. Region changes
already change the active clock without migrating history. A new reader on
the correct server requires no special transition.

**Next concrete step:** retain the current Endfield clocks; if a specific
countdown still looks wrong, reproduce with selected game server, app Region
and an absolute observation time. Continue audit stage 2 (NTE).
