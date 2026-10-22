# Honkai: Star Rail — daily reset audit

Checked **2026-10-22**. Research complete; **current regional daily clocks
confirmed correct by converging sources**. Primary evidence directly confirms
daily login clocks; permanent Daily Training is independently corroborated.
No runtime change or migration.

## Baseline

Main `e05fa8b64262b35607a6296171604f6eb79fedea`.
`GAMES.hsr` inherits 04:00/+8,+1,−5. Inspected shared time/daily helpers and
tests; baseline helpers executed with Bun. Existing default-clock tests cover
arithmetic and event-day behavior; they are not independent game evidence.

## Sources and boundaries

All links checked 2026-10-22.

- **Publisher-hosted HoYoWiki:** [Gift of Odyssey](https://wiki.hoyolab.com/pc/hsr/entry/1394?lang=en-us)
  indexed text explicitly says daily rewards refresh 04:00 server time, and
  lists Europe UTC+1, America UTC−5, Asia UTC+8. The page describes the 2.0
  event (ending 2024-03-26). Direct open gives an empty JS shell; use this as
  indexed publisher-hosted evidence, not a newly observed 2026 game screen.
  HoYoWiki is collaborative; its host alone is not proof every line was
  publisher-authored.
- **Independent specialist:** [KQM beginner guide](https://hsr.keqingmains.com/misc/beginner-guide/)
  directly describes Daily Training resetting 04:00. Its “local time” is
  ambiguous alone; regional server references below resolve it. Several other
  gameplay values in that early guide are historical, so this audit uses only
  the reset statement and corroborates it rather than adopting the whole guide.
- **Independent server explanation:** [Pocket Tactics, updated 2023-07-04](https://www.pockettactics.com/honkai-star-rail/server-time)
  explicitly ties daily tasks to 04:00 on Asia +8, Europe +1, America −5.
- **Recent secondary check:** [ResetClock, updated 2026-10-06](https://resetclock.org/honkai-star-rail/daily-reset)
  gives the same mapping, TW/HK/MO +8 alias and fixed clocks without DST.
- **Official support, limited claim:** [unclaimed daily rewards, updated 2025-10-23](https://support.hoyoverse.com/hc/en-us/articles/50913707917209-How-can-I-get-my-daily-rewards-reissued-if-I-forgot-to-claim-them)
  confirms loss at daily reset, but states no hour.
- **Rejected false lead:** [Daily Sign-In at 04:00 UTC+9](https://support.hoyoverse.com/hc/en-us/articles/50902290563865-When-does-my-Daily-Sign-In-reset)
  belongs to **Tears of Themis**, as its related-article section makes clear.
  It is not an HSR rule even though a broad search returns it.

No conflicting supported HSR Daily Training clock, live game observation or
new 2026 clock-change notice found. This is a sourced consistency conclusion,
not a claim to have logged into every server.

## Regional comparison and DST

Opening of server-labelled day **2026-10-23**:

| App Region | HSR server | Local reset | Expected UTC | Current code | Outcome |
| --- | --- | --- | --- | --- | --- |
| asia | Asia | 04:00 UTC+8 | 2026-10-22T20:00:00Z | same | confirmed correct |
| asia (clock alias) | TW / HK / MO | 04:00 UTC+8 | 2026-10-22T20:00:00Z | same | supported alias; label absent |
| europe | Europe | 04:00 UTC+1 | 2026-10-23T03:00:00Z | same | confirmed correct |
| america | America | 04:00 UTC−5 | 2026-10-23T09:00:00Z | same | confirmed correct |

International clocks are the scope; CN account services were not separately
audited. App Region selects a server clock, not the user's residence.
One profile-wide Region cannot describe mixed per-game server choices.

Fixed EU 03:00Z remains 03:00Z on Oct 24 and Oct 26 (Amsterdam 05:00→04:00);
fixed NA 09:00Z remains 09:00Z on Oct 31 and Nov 2 (New York 05:00→04:00).
Asia always 20:00Z on the preceding date. Numeric-offset facts and secondary
DST corroboration support retaining fixed clocks; local-wall-time examples
are calculated. HoYoLAB check-in, Trailblaze Power, assignment timers, Pom-Pom
missions and maintenance are not the Daily Training reset and must not be
substituted for it.

## Day keys, storage and Sync

No correction means no migration. At NA Oct 23 08:59:59.999Z `dayKey` is
Oct 22; at 09:00Z it is Oct 23 and strictly-next reset is Oct 24 09:00Z.
If someone “fixes” summer display by changing America to −4, the key rolls
one hour early; EU +2 would cause the same class of error.

Logs contain day strings plus one last-edit `at`, not per-day completion times.
Such an edit would change doneToday, catchUpDays, streak anchoring, dailyDays
and dailySummary counts, without converting old bytes. Export/import unions
strings and cannot infer old server/policy. Guest/account storage is separate;
Sync keys `(subjectId, dayKey)` contain no policy version, and `changedAt`
can describe catch-up/import rather than the claimed day. Never bulk rename
or duplicate marks. Region changes already change interpretation, not history;
fresh profiles only need the actual game server selected.

Any future clock/label change must verify reset±1ms, UTC month/year,
nextResetMs, dayKey, dailyDays exclusive end, catchUpDays, streakOf,
dailySummary, old import, offline and two-device profile isolation.
A display-only DST clarification should produce no mark mutations.

**Next concrete step:** retain HSR defaults; clarify server versus browser
timezone only in a separately scoped UX task if needed. Continue stage 6 (WuWa).
