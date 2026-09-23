# Game calendar implementation status

Updated 2026-09-23. Follow `docs/tasks/SOL6-IMPLEMENTATION-HANDOFF.md` for the
remaining milestones and `AGENTS.md` for non-negotiable data rules.

## Completed checkpoints

- Five one-game source/coverage reports were merged as PR #2–#6; their
  `partial` status remains accurate. The reports are in `docs/research/`.
- NTE Steam, BtR, and CZN Prydwen automatic sources are implemented; Prydwen
  fetched five banners from a normal GitHub Actions run 35770466875.
- HSR Overdrive and Minuscule global deadlines were corrected (749ff94).
  ZZZ Potential Hypothesis gained its explicit version end (78b5e56).
  Two WuWa Version 3.6 events were added (8bfa12a).
- `feat: track review time per reviewed event`: optional event-level
  `reviewedAt` and `firstSeenAt` keep existing reviewed timestamps stable
  when a subset of a file is updated; old files remain valid. Validation on
  Bun 1.3.14: frozen install, typecheck, 836 tests, build.
- HSR review 2026-09-23: Realm of the Strange (global Sep 27 19:59Z),
  Memory of Chaos: Stormcleanse (global Sep 27 22:00Z), Fate Contract:
  Renewal (end unknown), and Version 4.5 Nameless Honor (global Sep 27
  19:59Z). Existing eight HSR records are byte-identical in event values.
  Source evidence: `KQM-git/HSRNews` notices 1392, 1333, 1361;
  official HoYoLAB URLs are on the reviewed records when known.
  Validation: frozen install, typecheck, 837 tests, build; feed 120 records
  including ended ones. CI/deploy and live feed verification: pending.
- Endfield review 2026-09-23: official notices add Winter Hunt (Asia Sep 30
  03:59Z; Americas/Europe 16:59Z), Deep Cold Issue (relative end unknown),
  and the official account's Resplendent Spectrum start (Sep 24, day precision
  across server regions). All eight wiki.gg IDs are retained; Snow Over Deep
  Woods remains 11:59 server time. Its proposed 12:00 correction in
  `coverage-endfield.md` contradicts the wiki snapshot and the official
  [Snow notice](https://x.com/AKEndfield/status/2093911591896879277), so it
  was not applied. Remaining October events from update notice 5208 require
  direct date verification: the notice URL is presently unreadable in the
  available web fetch. Regression checks compare the merged eleven events.
- Genshin review 2026-09-23: added the missing fifth To Temper Thyself cycle,
  The Godforsaken Frostlands reward window, and Carefree Snowball Fight using
  published calendar/notice dates at day precision; the in-game notice mirror
  `archive/21879.md` confirms Missive of Grace's 00:00 is `t_lc`, so its
  uncorroborated exact UTC claim was reduced to day precision while retaining
  its published ID and original `firstSeenAt`. Older 12 rows retain their
  original `updatedAt`. Official calendar article 46673425 was verified for
  UTC+8 notation, while event dates were read from the existing reviewed
  source report; the linked article is a JS shell in this environment.
- WuWa/ZZZ gap check 2026-09-23: WuWa 3.7 article 5453 is image-only in
  the public JSON archive, so the proposed Singing Drizzle timestamps have
  not been promoted to reviewed data. Other WuWa 3.7 notices and ZZZ Phase II
  banners still lack direct dated text; no interval was inferred from prior
  phases or the scheduled maintenance. The current 11 WuWa and 15 ZZZ rows
  remain unchanged. Revisit when dated individual notices are published.
- Actions probe prepared for Genshin KQM, HSR KQM, WuWa Kuro mirror, ZZZ
  official and Endfield official. Push to `work/sol6-source-probes` triggers
  `.github/workflows/source-probe.yml`, which records transport headers and
  hashes; official HTML is retained temporarily as an Actions artifact,
  while unlicensed community mirrors yield metadata only. Each website must
  pass robots and crawl-delay checks before a page request. Run 35801130385:
  the three public GitHub Contents API surfaces returned 200; ZZZ returned an
  identical JS shell for index and article; Endfield robots redirected, so no
  content was requested. Exact URLs, headers, SHA-256 hashes, and classifications
  are in `docs/research/source-probes-sol6.md`. A focused follow-up for the
  Endfield robots redirect is blocked: run 35801291192 isolated a same-origin
  307 to `/en-us/robots.txt`; run 35801382417 followed that one safe redirect,
  which returned another 307. No Endfield page was fetched. M2 is complete:
  three usable transport candidates, ZZZ HTML unsuitable, Endfield blocked.
- M3 Genshin KQM implementation (2026-09-23): a narrowly allowlisted public
  GitHub Contents API Markdown adapter, a factual fixture, section parser and
  transport/merge tests extract ten dated notice windows. `t_lc` and `t_gl`
  remain day precision because their clock's UTC mapping is unproven. The
  Version 7.1 maintenance start establishes only the date for "after update".
  The older 7.0 relative start is skipped because this README has no matching
  update schedule; reviewed records cover it. One notice's three Silverwing
  phases yield one event. The mirror record cites its individual archive file
  and has no `official` provenance tag; reviewed HoYoverse URLs win. The raw
  Markdown was checked via GitHub connector (95,694 UTF-8 bytes, SHA-256
  `7f8ce891e5d903e1b402e4741bcdee229b538dae743cf678752a61a4cb1a71a8`),
  and a direct local parse produced ten events, 16 merged Genshin rows, zero
  conflicts and zero lost reviewed IDs. Runner refresh/deploy still needs
  verification after this implementation is published. Validation on Bun
  1.3.14: frozen install, typecheck, 846 tests, build (126 feed rows; one
  pre-existing NTE Circle Bounty conflict). The test command requires the Bun
  directory in `PATH` because the local-server test spawns `bun` by name.
- M3 HSR KQM implementation (2026-09-23): a second exact Contents API
  allowlist and a factual fixture. The section parser extracts six current
  schedules (Overdrive, Minuscule, Realm of the Strange, two endgame cycles,
  Nameless Honor). It treats `(global)` as UTC+8, `(server)` starts as day and
  `(server)` ends with existing Asia/Europe/America server offsets. The
  README's Gift of Odyssey lacks an event period, and 4.6 Warp/event dates
  are absent; these are not invented. Full connector README captured as
  45,115 UTF-8 bytes, SHA-256
  `0a4b4e771489e2d331865c2a51405c42ebf2289d66978eb8c5d2ce26dfe7ef4b`.
  Local parse of that complete document gave six events and merged to the
  existing 12 HSR reviewed rows with zero conflicts and zero lost IDs.
  Individual archive URLs document mirror extraction; reviewed publisher URLs
  remain canonical. Validation on Bun 1.3.14: frozen install, typecheck,
  851 tests, build (126 feed rows, the same pre-existing NTE conflict).
  Normal Actions refresh/deploy awaits verification.
- M3 WuWa Atom implementation (2026-09-23): the runner's previously probed
  `articles_latest.xml` already embeds official article HTML in Atom CDATA;
  no per-article fetch is needed. The full GitHub connector body exactly
  matched Actions run 35801130385 (95,955 bytes, SHA-256
  `5e3a718fe86b2610580d38a256dccbe15dc0d9c5d23fc7222947b712576d00b4`).
  A factual XML fixture and bounded entry/section parser use only dated
  event/convene periods, preserve the original Kuro article URL, and derive
  relative update *day* only from that version's maintenance date. Start
  clocks remain day precision; per-server exact ends preserve the established
  offsets. The complete 20-entry feed yielded 14 events; six are historical
  rows absent from reviewed. Merge: 17 WuWa records, zero conflicts, all 11
  reviewed IDs retained. Image-only 3.7 previews yielded no guessed dates.
  Validation on Bun 1.3.14: frozen install, typecheck, 855 tests, build
  (126 feed rows from compact fixtures, one pre-existing NTE conflict).
  Normal Actions refresh/deploy awaits verification; full XML snapshot would
  also add the six verified historical rows.
- M4 cache integrity checkpoint: refresh now sends validators only when a
  matching body exists. A 304 without that body fails visibly and does not
  advance `lastConfirmedAt`; a 200 repairs the cache. `SnapshotStore.forget`
  removes Markdown and XML bodies as well. Focused tests reproduce both loss
  and recovery paths. Bun 1.3.14 frozen install, typecheck, 858 tests and build
  passed. Abrupt source disappearance remains the next M4 check.
- M4 disappearance checkpoint: a new body that drops more than half the old
  count is now compared to the old snapshot's still-live IDs. Losing the
  majority of those IDs rejects the new body, retains last-known-good and
  increments source failure health. Finished entries can leave normally and
  still produce a visible drop warning. Both paths have focused tests. Bun
  1.3.14 frozen install, typecheck, 860 tests and build passed.
- M4 regional conflict checkpoint: exact ends from reviewed official versus
  an automatic secondary mirror now compare Asia, Europe and America. A
  one-minute regional discrepancy or a global-versus-server discrepancy is
  written to the review report with its region, while the higher-confidence
  reviewed record keeps its ID and source URL. Focused tests cover both
  scenarios and verify current HSR/WuWa merges remain conflict-free. Bun
  1.3.14 frozen install, typecheck, 862 tests and build passed.

## Next concrete step

Verify all three new API sources in the normal Actions refresh. Then inspect
remaining M4 freshness behavior and M5 UI. Endfield 5208 remains manual-reviewed only
while the official robots chain is unresolved; do not infer its missing
calendar dates. Fix confirmed false freshness or day-boundary behavior before M5.

The new Genshin parser awaits its first normal Actions refresh. Game8 and
Fandom availability remains constrained as recorded in the one-game reports.
The reviewed source disagreement for NTE
Circle Bounty is still open and displayed to users.
