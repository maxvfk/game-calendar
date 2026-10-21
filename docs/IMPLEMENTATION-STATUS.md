# Game calendar implementation status

Updated 2026-10-21 (Moscow; narrow Timeline label truncation implemented/browser-validated; hosted delivery tracked with its PR; final operator real-device smoke pending; M2 remains complete). Follow `docs/tasks/SOL6-IMPLEMENTATION-HANDOFF.md` for the
remaining milestones and `AGENTS.md` for non-negotiable data rules.

## Urgent Endfield source drift / CI recovery — 2026-10-18

Status: **CI/feed/build/Pages recovered and live; full Refresh acceptance remains
blocked by a proven upstream Phantasia contradiction. Work stopped at that safe
source blocker, not declared fully green.** This section
is independent of Account/User S6 and Timeline M1/M2.

- Baseline CURRENT main verified as `3447f4e0f5222ec62afcfae0397475dcb46cda53`;
  fresh branch `fix/endfield-source-drift-20261018`. Actual logs inspected:
  [Refresh 39062823744](https://github.com/maxvfk/game-calendar/actions/runs/39062823744)
  confirmed 7/8 sources, retained rejected Echoes body, reported six consecutive
  failures / one broken source, then committed snapshots. Echoes last accepted
  confirmation: `2026-10-14T20:47:25.387Z`, still Illusion.
  [CI 39062845198](https://github.com/maxvfk/game-calendar/actions/runs/39062845198)
  checked out that main SHA: 1046 pass / 1 optional skip / 3 fail; feed/build/Pages
  skipped. The same three focused failures reproduced locally before edits.
- **Echoes is an upstream contradiction, not a parser redesign failure.** Live
  Event and Phantasia pages both return 200 and publish Asia Oct 15 12:00 UTC+8
  and Americas/Europe Oct 15 23:00 UTC-5; both end Nov 5 11:59 in their stated
  zones. The three-cycle table instead starts Cycle I Oct 15 12:00 *Server Time*,
  eleven hours before the western season. Cycle I/II ends are explicitly
  Oct 22/29 03:59; Cycle III ends Nov 5 11:59. Full facts, UTC conversions,
  source hashes and interpretation limits are in
  `docs/research/endfield-recurring-endgame.md` section 16.
- The parser's acceptance predicates are unchanged. Its first-cycle mismatch
  error now identifies region and both UTC instants. Existing `rejected` + HTTP
  200 already identifies reachable-but-unusable data; no new healthy state or
  weaker threshold was added. Production snapshots are untouched, Phantasia
  cycles are withheld, and Illusion is not republished as a new season.
- **Shadow Marked was corrected, not retained as a real conflict.** English
  official notice 5208, directly read at 21:56:39Z, explicitly ends at Oct 19
  04:00 server time and agrees with wiki `data-end`. Our reviewed record wrongly
  encoded 03:59. Corrected Asia to Oct 18 20:00Z and Americas/Europe to Oct 19
  09:00Z. Same event ID, day start, exact regional ends, official URL and original
  `firstSeenAt`; only this row's `reviewedAt` advances. One-minute exact conflicts
  still require review, with an explicit regression proving it.
- Historical Illusion/overlap/Snow assertions now read immutable test-only
  excerpts of this repository's own captures, outside production fixture paths.
  Current snapshot merge assertions still require zero Endfield conflicts and
  every unique source ID, accounting for the genuine wiki/reviewed duplicate
  and higher-confidence reviewed winner. A real Phantasia rejection regression
  proves unchanged last-known-good bytes/metadata/confirmation and `broken` at
  the existing third failure. Historical Illusion cycle IDs remain pinned.
- Local Bun 1.3.14: frozen install, typecheck and build pass; focused Endfield/
  recurring-endgame tests **21 pass / 0 fail**; full suite **1054 pass / 1 optional
  age skip / 0 fail** (1055 tests, 51 files). Feed: **172 events / 7 games / 1
  visible conflict**, only the existing NTE Circle Bounty dispute. All 172 IDs
  retained; only Shadow Marked's end fields change semantically (apart from
  normal regenerated parser observation timestamps). Counts: CZN 25, Endfield 8,
  Genshin 25, HSR 20, NTE 47, WuWa 30, ZZZ 17. Phantasia season ID is
  `endfield:season-of-phantasia:2026-10-15`; no cycles were invented. Current
  cycle source is unavailable in the feed (`parsedCount: null`, no false
  confirmation), with the previously verified hosted refresh still **broken**.
- [PR #23](https://github.com/maxvfk/game-calendar/pull/23), implementation
  `ebd48090e3d78482e55c1f66d8eea4fdc2799811`, passed
  [PR CI 39073443428](https://github.com/maxvfk/game-calendar/actions/runs/39073443428)
  and merged to main as `7f641cb5323e0ed8d8cc60e63b7d26b7f129a786`.
  [Push CI/Pages 39073514856](https://github.com/maxvfk/game-calendar/actions/runs/39073514856)
  is **success** in all three jobs: typecheck/test/feed sanity, site build,
  Pages deploy. Hosted tests: **1054 pass / 1 optional skip / 0 fail**. The job
  restored `refresh-state-39062823744-1`; deployment reported success at
  `2026-10-17T22:05:03Z`.
- The normal public URL
  https://maxvfk.github.io/game-calendar/data/events.v1.json returned HTTP 200
  at 22:05:23Z, `generatedAt: 2026-10-17T22:04:29.666Z`, 172 events, all seven
  games and only the NTE `dateConflicts` notice. Its ID set and all event fields
  except regenerated parser observation timestamps match the validated local
  feed. The official Shadow Marked 04:00 regional ends are live; no Phantasia
  cycles or false cycle-source freshness were published.
- **Continuation verified on 2026-10-18 against current main
  `9e74df057649210e3df1cac1f95a623fa06b7b12`.** The scheduled
  [Refresh 39116428884](https://github.com/maxvfk/game-calendar/actions/runs/39116428884)
  ran after the repair, confirmed 7/8 sources and committed two changed source
  bodies (CZN and Endfield Event), plus confirmation metadata. Its actual log
  again rejects Phantasia: Americas/Europe Cycle I starts
  `2026-10-15T17:00:00.000Z`, season starts `2026-10-16T04:00:00.000Z`.
  Echoes remains **broken / seven consecutive failures / HTTP 200**; accepted
  Illusion snapshot and last confirmation `2026-10-14T20:47:25.387Z` are retained.
  The separate **Report source health** step correctly fails. A fresh direct
  Phantasia read also retains the contradictory cycle table; no code relaxation
  or source-health change is warranted.
- That refresh dispatched
  [CI/Pages 39116453813](https://github.com/maxvfk/game-calendar/actions/runs/39116453813)
  on `9e74df0`: **all three jobs succeeded**, including Pages deployment.
  Actual test log: **1054 pass / 1 optional skip / 0 fail**; bookkeeping cache
  `refresh-state-39116428884-1` was restored. Feed: **174 events / 7 games / 1
  conflict**, still only NTE Circle Bounty. The public feed returned HTTP 200,
  `generatedAt: 2026-10-18T09:43:58.236Z`; Endfield now has ten events, with two
  newly sourced ordinary events from the existing Event adapter. Other game
  counts remain CZN 25, Genshin 25, HSR 20, NTE 47, WuWa 30, ZZZ 17. Shadow
  Marked retains its corrected 04:00 regional ends; no Phantasia cycles or false
  confirmation are published (`parsedCount` and `lastConfirmedAt` remain null
  for the current cycle source).
- Local continuation validation on the refreshed snapshots also passed: frozen
  install, typecheck, full suite **1054 pass / 1 optional skip / 0 fail**, and
  complete build. Public/local feed ID sets and event fields match except for
  regenerated `firstSeenAt` / `updatedAt` observation timestamps.
- **Full Refresh remains blocked, not recovered.** The post-repair refresh
  commit's CI/feed/Pages path is now verified green, but source health is not.
  No redundant forced manual Refresh was dispatched after this scheduled run
  reconfirmed the upstream contradiction. This uses the task's explicit safe
  blocker stop condition, not the full-green acceptance path. Final evidence is
  tracked in [PR #24](https://github.com/maxvfk/game-calendar/pull/24).

**Next concrete step for this repair:** obtain an upstream correction or explicit
regional clarification of western Cycle I versus season start. Keep Echoes
scheduled and its broken signal visible; other validated sources can publish
through the recovered CI/Pages path under existing rules. Once the source is
consistent, manually dispatch normal Refresh on current main (force only for the
6h interval if needed), verify acceptance/health and the refresh commit's full
CI/Pages, then close recovery. Work ends here at the source blocker; no other
milestone or private backup pin change is included.

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
- M4 day-boundary checkpoint: reviewed day-only dates now use the same
  region/game-day reset as parsed dates. Reader-created events retain the exact
  instant derived from their own input. Regression tests compare both
  boundaries across three regions. Bun 1.3.14 frozen install, typecheck,
  863 tests and build passed (126 feed rows; known NTE Circle Bounty conflict).
- M5 date-precision UI checkpoint: Next Up, queued deadlines, event rows,
  window captions and details now state the printed date and unknown time
  instead of counting hours to a derived reset for day-only ends. Day-only
  starts are labelled as dates; exact region-specific ends still count down.
  The footer distinguishes exact local times from source dates. Focused render
  checks cover parser, reviewed, reader-entered and regional-exact cases.
  Bun 1.3.14 frozen install, typecheck, 867 tests and build passed (126 feed
  rows; known NTE Circle Bounty conflict).
- M4 fixture freshness checkpoint: the offline builder now reads capture dates
  from `.md` and `.xml` fixture names as well as `.html`/`.json`. The three
  new source health entries have the 2026-09-23 capture day and parsed counts
  (10, 6, 8); `lastConfirmedAt` stays null until a real network confirmation.
  The previous build incorrectly recorded all three capture dates and counts
  as null despite including their events. Bun 1.3.14 frozen install, typecheck,
  868 tests and build passed (126 feed rows; known NTE Circle Bounty conflict).
- M5 conflict visibility checkpoint: the feed now carries compact date-conflict
  notices linked to the retained event ID and both source URLs. The checklist,
  Next Up, timeline and detail sheet warn on the affected event. An older
  service-worker-cached feed without the additive field still validates. The
  current build exposes one notice for NTE Circle Bounty (Asia end differs by
  24 hours) while keeping its Perfect World date and event ID. Bun 1.3.14
  frozen install, typecheck, 871 tests and build passed (126 feed rows).
- M5 available smoke checkpoint: the built site served locally through `serve.ts`
  returned 200 for `/`, JS, CSS, feed, review report, service worker, manifest
  and `/api/health`; a nonexistent `/data/` file returned 404. Focused suites
  for controls, preferences, progress, update handling, views and custom UI
  passed (211 tests). GitHub Actions
  [run 35837870613](https://github.com/maxvfk/game-calendar/actions/runs/35837870613)
  on `36e9374` succeeded in check, build and Pages deploy. The published Pages
  site was also opened in desktop Chrome: onboarding selected Genshin and NTE;
  focus narrowed to Genshin; Checklist and Timeline switched; Europe→Asia
  changed the daily reset countdown and persisted after reload. Circle Bounty
  showed the disputed date and both source links. Marking it done removed it
  from Next Up and persisted after reload; the test mark was then cleared.
  The day-only Fons Rush label and stale-source warning were visible. A phone
  viewport, service worker upgrade and offline reload remain unverified.
- M4 freshness wording checkpoint: a game becomes stale if *any* of its
  sources has no recent event data, even when another source refreshed recently.
  The footer now says that accurately for both all-games and named-game
  warnings. A focused render regression covers fresh and old siblings for
  every selected game. Bun 1.3.14 frozen install, typecheck, 872 tests and build
  passed (126 feed rows, the same Circle Bounty conflict). The first normal
  Actions refresh of Genshin KQM, HSR KQM and WuWa Atom is still pending; the
  latest scheduled run 35779097930 predates those adapters.
- M5 deployed-update checkpoint: CI/Pages run
  [35839190984](https://github.com/maxvfk/game-calendar/actions/runs/35839190984)
  passed for `8aef0df`. On the published desktop site the service worker
  displayed "A new version ... is ready"; pressing Reload loaded the new
  freshness text while the chosen Genshin/NTE lanes and Europe region remained.
  The available cloud browser exposed no viewport or network toggle, so this
  is an upgrade check, not a phone or offline reload check.
- M3 live-refresh checkpoint: manually dispatched Actions
  [run 35844027426](https://github.com/maxvfk/game-calendar/actions/runs/35844027426)
  fetched the three new sources on the runner: Genshin KQM 10, HSR KQM 6,
  WuWa Atom 14 parsed events. Their full snapshots were committed as
  `88b72b2`, with the same SHA-256 bodies checked during implementation.
  [CI/Pages run 35844077127](https://github.com/maxvfk/game-calendar/actions/runs/35844077127)
  passed and the live feed was checked at 132 rows. Compared with the saved
  pre-refresh feed, all 126 IDs and their titles, boundaries, precision,
  source URLs and regional ends remain unchanged. The six additions are
  already-ended WuWa events present in the full Atom feed but absent from the
  compact fixture. The one NTE Circle Bounty conflict is unchanged. The
  refresh workflow itself failed only at its final source-health report: seven
  legacy Game8 sources returned CloudFront HTTP 202 for the third cycle;
  Fandom remained robots-blocked. They supplied no events. The next M4
  checkpoint will retire unreachable legacy fallback polling from the active
  feed without hiding failures of the working sources.
- M4 legacy-source retirement checkpoint: seven Game8 pages that repeatedly
  return CloudFront 202 and Genshin Fandom whose robots gate fails closed were
  removed from the **scheduled** refresh and published source health. Their
  parsers remain addressable for local fixture diagnostics. Seven live adapters
  remain. A targeted regression confirms that three failed cycles of an active
  KQM source still produce a broken-source error. A fresh build retained all
  132 IDs, semantic event fields and the existing Circle Bounty conflict;
  only the eight inactive health entries disappeared. Automatic parser
  `firstSeenAt`/`updatedAt` values are generated at build time and therefore
  move on a local rebuild; this checkpoint did not change that behavior.
  Bun 1.3.14 frozen install, typecheck, 874 tests and build passed; the offline
  refresh dry run listed exactly seven sources. Commit `8ade91c` passed
  [CI/Pages run 35864065837](https://github.com/maxvfk/game-calendar/actions/runs/35864065837):
  check, build (132 events, one conflict), and deploy. After deployment the
  public feed returned 132 events and 14 health entries (seven automatic,
  seven reviewed), with no Game8/Fandom entries. The next scheduled refresh
  remains unverified.
- M5 post-deploy smoke 2026-09-23: the public desktop site opened, Genshin
  and NTE onboarding worked, Checklist listed Beyond the Rails first, Fons
  Rush as date-only and Circle Bounty as disputed; a reload preserved the game
  choices. Immediately after deployment, the browser still held the earlier
  feed for the ordinary URL, while a new URL and a direct HTTP request returned
  the 13:00Z feed. GitHub Pages answered `cache-control: max-age=600`; a short
  delay for an already cached reader is expected. Phone layout, a real offline
  reload and automatic expiry of that browser's cached copy remain unverified.
- M5 real phone check 2026-09-23: on a realme GT 6 with realme UI 7.0 and
  Chrome, steps 1–4 passed. An offline reload stayed on **Loading events…**;
  a later screenshot showed the page and an offline badge, but this did not
  count as a successful reload. The repair precaches the feed during worker
  installation, bounds stalled installation and feed requests to eight seconds,
  and lets the page read the cached feed even before worker control. The
  GitHub Pages subpath navigation fallback is also corrected. Frozen install,
  typecheck, 880 tests and build passed locally; the build retains 132 events,
  seven live automatic sources and the visible Circle Bounty conflict. A fresh
  real phone offline reload after deployment is still required. Published as
  `b697b6a`; [CI/Pages run 35878478363](https://github.com/maxvfk/game-calendar/actions/runs/35878478363)
  passed typecheck/test/feed, build and deploy.
- M5 phone retest reported successful by the reader on 2026-09-23 after the
  offline repair. On the realme GT 6 / Chrome, the online update and offline
  reload now show the saved events instead of remaining on **Loading events…**.
  This confirms the tested device and flow, not every browser or a fresh
  offline installation. At 16:02 UTC the normal public feed URL returned HTTP
  200 and 132 events with 14 source-health entries; all 132 event IDs matched
  the local build. The response reported `max-age=600`. The next scheduled
  refresh at 17:27 UTC had not yet run at this checkpoint.
- M5 UI categories checkpoint: the existing feed `type` maps to six reader
  filters: Banners, Events (`story`/`rerun`/`other`), Endgame / challenge,
  Login / rewards, Shop / exchange and Maintenance. Multiple choices can stay
  on together in both views; every category starts visible for old and new
  readers. Text badges identify types in the list, Next Up, details and narrow
  timeline bars independently of game colour. The choice is saved in prefs,
  leaving event IDs and completion keys unchanged. The daily timeline grid is
  the next separate UI milestone.
- M5 daily Timeline checkpoint: the grid draws every local calendar day at a
  fixed pixel width, defaults new readers to 72px/day, and opens with today
  near the centre of the horizontal pane. The today rule is labelled; zoom
  keeps its central anchor. Exact boundaries take proportional positions in
  their local day, including the 23/25-hour DST day. Date-only source and
  reader dates occupy their stated day cells with dashed edges and precision
  wording, without promoting reset-time interpretations to exact geometry.
  [CI/Pages run 35892354872](https://github.com/maxvfk/game-calendar/actions/runs/35892354872)
  passed on `f0c00c8` and deployed the change. The preceding category-filter
  [run 35889998480](https://github.com/maxvfk/game-calendar/actions/runs/35889998480)
  also passed. The reader reported that the filters work and daily grid is
  visible on the phone. This report does not yet establish that the filter
  selection persists after reload or verify the exact-time position and
  day-only edge on that phone. The public feed checked at 19:08 UTC contains
  the same 132 IDs and semantic boundaries as the local build, seven automatic
  and seven reviewed health entries, and the same Circle Bounty conflict.

## Coverage at the live 2026-09-23 refresh

This is the **132-row published build** following snapshot commit `88b72b2`,
including finished events, not a claim that all seven games are completely
covered. A feed row is counted once after merge; parser counts before merge
can be larger. New Genshin, HSR and WuWa API sources were confirmed by the
Actions runner. Automatic confirmations below are from the last saved snapshot;
reviewed dates are the batch date except for individually
rechecked rows described above. See `public/data/events.v1.json` for each
source's actual `lastConfirmedAt` and `parsedCount`.

| Game | Published rows and categories | Automatic / transport | Reviewed and latest targeted check | Known missing or blocked |
|---|---|---|---|---|
| Genshin | 16: banners 3, login 2, challenge 3, story 2, other 6 | KQM GINews notice Markdown, 10 parsed and runner-confirmed Sep 23 | 16 reviewed; four rows checked Sep 23 | Game8 unavailable; Fandom robots blocked on runner. Some future Wish/cycle deadlines still lack dated evidence. |
| HSR | 12: banners 4, login 1, challenge 5, other 2 | KQM HSRNews notice Markdown, 6 parsed and runner-confirmed Sep 23 | 12 reviewed; four rows checked Sep 23 | Game8 unavailable; Version 4.6 Warp/event periods absent from retrieved notice. |
| WuWa | 17: banners 10, login 1, challenge 2, other 4 | Kuro article Atom mirror, 14 parsed and runner-confirmed Sep 23 from the full 20-entry feed | 11 reviewed; latest batch Sep 21 | Game8 unavailable; image-only 3.7 preview does not establish exact periods. |
| ZZZ | 15: banners 4, login 3, challenge 1, story 1, other 6 | No usable automatic source; official raw HTML probe yielded JS shell | 15 reviewed; latest batch Sep 21 | Game8 unavailable; Phase II banners and challenge cycles lack direct dated notices here. |
| Endfield | 11: banners 3, login 1, challenge 1, other 6 | wiki.gg 8 parsed; last confirmed Sep 22 | 3 reviewed, checked Sep 23 | Game8 unavailable; official 5208 robots redirect unresolved, so October rows remain pending. |
| NTE | 45: banners 12, login 2, challenge 6, maintenance 5, other 20 | Official Steam News 42 parsed and NTEBuild BtR 3, both confirmed Sep 22 | 15 reviewed; latest batch Sep 22 | Game8 unavailable. Official Perfect World and Steam disagree on Circle Bounty by 24 hours. |
| CZN | 16: banners 5, login 2, challenge 4, story 1, other 4 | Prydwen banners 5 parsed, confirmed Sep 22 | 14 reviewed; latest batch Sep 21 with STOVE provenance | Game8 unavailable. Prydwen covers banners only; official STOVE notices remain reviewed. |

## M6 release evidence and limits

- Implementation tip before this release-status update: `fbf4619` on `main`.
  The M5 UI commits are `34d584f` (type filters) and `f0c00c8` (daily
  timeline); their CI/Pages runs are linked above. The final M6 commit SHA is
  reported with the release handoff because a commit cannot record its own SHA.
- Reproducible validation is the four commands in `AGENTS.md`. At this M6
  checkpoint on Bun 1.3.14, frozen install, typecheck, 890 tests
  (zero failures) and build passed. The build produced 132 merged events across
  seven games, one visible Circle Bounty conflict and seven automatic plus
  seven reviewed health entries. `bun run refresh --dry-run` listed exactly
  the seven active automatic adapters without making requests.
- The published feed at 19:08 UTC on September 23 matched the local 132 IDs
  and the compared title, game, type, start/end, precision, regional end and
  provenance URL fields. Its automatic confirmations were at 09:37 UTC; the
  Actions schedule intended for 17:27 UTC was not yet present in the run list
  at the later check. A successful build is not evidence of a newer source
  confirmation. Inspect the next actual refresh before claiming it passed.
- Seven-game coverage is the matrix above, not completeness of all current
  game events. Genshin, HSR, WuWa, NTE, CZN and Endfield have bounded
  automatic extraction; ZZZ is reviewed-only. Game8 and Genshin Fandom are
  retired from polling. The Endfield official robots chain, ZZZ official JS
  shell and image-only WuWa notices still limit automatic coverage. No dates
  were filled in from cadence or previews.
- Remaining reader checks: the phone confirmed working filters and visible
  daily cells; combined filter persistence, proportional exact placement,
  dashed day-only edges and completion persistence specifically after this UI
  update have not been reported. The prior offline reload fix passed on one
  realme GT 6 with Chrome, not on every mobile platform. There is no account
  sync; preferences and completion are local to each browser, with manual
  export/import available in Settings.
- For routine corrections and source failures, use the maintenance path below.
  Do not erase a conflicting lower-priority source or promote reviewed dates
  merely to make the report quiet. The separate Astra audit starts after M6;
  it should use this evidence and record only reproducible findings.
- M6 release-status commit `1426960` passed
  [CI/Pages run 35907937236](https://github.com/maxvfk/game-calendar/actions/runs/35907937236):
  typecheck/test/feed, build and Pages deployment all succeeded. The published
  page and feed returned HTTP 200; the feed generated at 19:14:28 UTC has 132
  events, seven automatic and seven reviewed source-health entries, and the
  one known date conflict. Its automatic `lastConfirmedAt` values still belong
  to the 09:37 UTC manual refresh. The scheduled refresh remains unverified.
- The delayed scheduled [refresh run 35916473856](https://github.com/maxvfk/game-calendar/actions/runs/35916473856)
  started at 20:31 UTC on September 23 and succeeded: all seven active sources
  confirmed, three changed, zero warnings and zero broken. It committed the
  new snapshots as `5668c75`. A local feed build from those snapshots produces
  134 events across seven games and still only the known NTE Circle Bounty
  conflict. Endfield wiki.gg grew from eight to ten parsed events; its two new
  IDs are `endfield:echoing-bell-of-an-old-city:2026-09-24` and
  `endfield:season-of-illusion:2026-09-24`. The previous eight wiki IDs remain.
  The corresponding [CI run 35916518191](https://github.com/maxvfk/game-calendar/actions/runs/35916518191)
  **failed** in `test/endfield-reviewed-banners.test.ts:28`: the test asserts
  exactly eight wiki events. Build and Pages deploy were skipped. The public
  feed checked afterward was still the 19:23 UTC, 132-event version, so the
  134-event publication is **not verified or live**. Update this snapshot-count
  assertion in a separate, narrow implementation milestone after checking the
  new rows and preserving ID/merge assertions; rerun all gates and verify Pages.
  At this documentation checkpoint, frozen install, typecheck and build passed
  locally (134 events); `bun test` reproduced the same one failure (889 pass,
  one fail). No tests or runtime behavior were changed here.
- Refresh publication repair: the Endfield merge test now checks every current
  wiki ID survives the merge and that the merged count follows the snapshot,
  rather than assuming wiki.gg will always list exactly eight events. Snow's
  regional end remains checked while the historical row is still listed.
  No parser or event data changed. Frozen install, typecheck, all 890 tests and
  build passed locally; the feed has 134 events and the one known conflict.
  [CI/Pages run 35929071084](https://github.com/maxvfk/game-calendar/actions/runs/35929071084)
  passed all three jobs. The published feed generated at 22:34:49 UTC contains
  134 events, including both new Endfield IDs, 14 source-health entries and
  only the known NTE Circle Bounty conflict. M6's scheduled-refresh and
  publication checkpoint is operationally complete.
- ZZZ endgame correction: the September 18–October 2 Shiyu Critical Node and
  September 11–25 Deadly Assault rotations were missing from reviewed data.
  Dated player posts on HoYoLAB corroborate the periods shown by the user's
  in-game countdown screenshot. Both rows are `challenge`, `estimated` and
  `day`/`day`; the screenshot gives no absolute clock boundary, and the
  official Version 3.2 notice names the modes without dates. Existing ZZZ
  rows and IDs are unchanged. Commit `d55d413` passed frozen install,
  typecheck, 891 tests and build (136 events; only the known NTE conflict).
  [CI/Pages run 35929750486](https://github.com/maxvfk/game-calendar/actions/runs/35929750486)
  passed Typecheck/test/feed, Build and Deploy. The public feed generated at
  22:42:07 UTC has 136 events and both ZZZ challenge IDs at day precision.

## Pre-Astra recurring endgame correction (2026-09-24)

- Endfield's existing wiki.gg Echoes of War seasons now enter the Endgame
  filter. Reviewed rows add Season of Illusion Cycle I and II deadlines and
  Monumental Etching's limited reward window. Cycle III's final deadline is
  already carried by the existing season row; the permanent stage is not a
  limited event. Existing season IDs and completion keys remain unchanged.
- NTEBuild BtR rows now resolve the documented July 16 / 14-day, 05:00 UTC+8
  cycle to exact boundaries while retaining their day-based published IDs;
  reviewed Perfect World timing wins when available. The cycle is gated by
  its documented anchor rather than a generic duration fallback.
- Genshin's monthly Abyss/Theater and WuWa's 28-day Tower/Respawning Waters
  use bounded, effective-dated reset rules with regional 03:59 ends.
  Reviewed October Theater retains its published ID. Sourced exact conflicts
  freeze future projections for the affected mode pending rule review.
  Genshin Stygian Disturbance Outbreak and WuWa Endstate Matrix remain
  explicitly sourced seasonal deadlines, outside the recurrence generator.
- CZN Great Rift Second Half and Basin Twilight preserve their IDs and now
  close at the standing Sep 30 00:00 UTC maintenance boundary. Great Rift's
  weekly reward deadlines occur only inside its sourced phase (next Sep 27
  18:00 UTC). Full-Scale Offensive Season 4 has its verified Aug 19 start and
  an unknown end. No next half/season is projected.
- HSR Anomaly Arbitration is visible with an unknown end. The expected Sep 28
  Memory of Chaos rotation raises a build review reminder, not a published
  +42-day deadline; Currency Wars also awaits an explicit version end.
- ZZZ current Shiyu and Deadly Assault rows retain their published IDs and
  estimated provenance, with exact regional 03:59 ends from the 04:00 server
  reset. **Research correction:** the cited January 2025 +14-day anchors land
  seven days away from the independently reported September 2026 cycles. The
  handoff's asserted arithmetic is false, so a future generator from those
  anchors would publish wrong rotations. Future ZZZ cycles and Periodic
  Conquest stay source-gated until a current re-anchor/rule change is verified.
- Published implementation commits: `b05a3ce`, `9a2b3d9`, `bf4935e`;
  status `746b729` and Timeline regression `e5041d4`. The original local
  commits have the same file trees and are preserved on
  `work/recurring-endgame-local`. Bun 1.3.14 frozen install,
  typecheck, 902 tests and production build pass. A focused Timeline regression
  verifies four current exact deadline positions within daily cells. Local feed has 158 events
  across seven games, one unchanged NTE Circle Bounty date conflict, no new
  conflicts. Exact current ZZZ, CZN and Endfield deadlines were inspected in
  the generated feed. [CI/Pages run 36018033513](https://github.com/maxvfk/game-calendar/actions/runs/36018033513)
  passed all three jobs on September 24. The published feed generated at
  15:09:32 UTC has 158 events, 14 source-health entries and the same one
  Circle Bounty conflict. Its ID set and the compared game, title, type,
  start/end, precision, regional ends, source URL and provenance fields exactly
  match the local build; five current ZZZ/CZN/Endfield deadline rows were
  checked individually. Phone smoke verification remains pending.

## Focused pre-Astra endgame cleanup (2026-09-24)

- Endfield: the existing wiki.gg Event source still discovers the active Echoes
  season. A second adapter reads that season's own Cycle table and publishes
  Cycle I/II deadlines only when the table and the sourced season window agree.
  The first real Season of Illusion response is stored as
  `snapshots/endfield-wikigg-echoes.html`; local refresh confirmed 2/2 events,
  zero warnings. The parser rejects missing, malformed, duplicated and
  out-of-window cycle data. A stale or unreadable season page causes a build
  review warning and no fabricated cycle rows. Cycle III remains covered by
  the season row. The two reviewed Cycle I/II workaround rows **were removed**
  after automatic output matched both published IDs and all regional ends.
  Starts use day precision because the page gives different regional start
  instants and the schema has no regional-start field. The season page's Cycle
  III end for the west differs from the Event page's west season end; the
  authoritative Event season row supplies that final boundary.
- HSR: the hardcoded Sep 28 check became a non-publishing monitor over sourced
  AS → PF → MoC phase starts. It warns from seven days before the normal
  14-day expected next start until the next matching sourced phase appears.
  Optional effective phase-specific exceptions can change the expectation or
  suppress it without altering published events. The current warning is for
  MoC around Sep 28; no new HSR row or +42-day deadline was produced.
- ZZZ: `docs/research/zzz-recurring-endgame.md` now states the arithmetic
  contradiction: January 2025 anchors are seven days out of phase with the
  sourced September 2026 Shiyu/Deadly rows. Both remain source-gated; no ZZZ
  generator was added.
- Published commits: Endfield `2af2508`, HSR `811e5cc`, ZZZ documentation
  `5eef752`. Local Bun 1.3.14 frozen install, typecheck, 910 tests and build
  passed. The feed retained all 158 prior IDs, 13 HSR rows and the one known
  NTE Circle Bounty conflict; it has 15 source-health entries including the
  new Endfield season page. [CI/Pages run 36023764496](https://github.com/maxvfk/game-calendar/actions/runs/36023764496)
  passed all three jobs. The live feed generated at 15:56:20 UTC matched the
  local ID set and compared semantic fields exactly, including the two
  automatically sourced Echoes rows.
- Remaining operational check: CI built from the checked-in real season
  snapshot; the first GitHub Actions **Refresh sources** request for this new
  adapter has not yet been observed. Confirm its robots/fetch result in the
  next scheduled or targeted run. A new season whose page is absent or changed
  will raise a review warning rather than receive extrapolated cycles.

## Maintenance path

1. For a disputed date, open the event's `sourceUrl` and
   `public/data/review.v1.json`, compare explicit period and region labels,
   and record the exact publication URL. Preserve the existing title/ID, use
   `day` for a date without a supported clock, and keep an unknown end null.
2. Add or correct a row in `data/reviewed/<game>.json` following
   `data/reviewed/README.md`. For a targeted edit, set the row's `reviewedAt`
   to its actual check time and preserve `firstSeenAt` if previously published;
   do not advance the whole batch's `reviewedAt` without checking every row.
3. Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, and
   `bun run build`. Inspect `public/data/events.v1.json` for the same old IDs,
   `public/data/review.v1.json` for new conflicts, and the build's per-source
   parsed counts before committing.
4. For a broken automatic source, inspect the latest **Refresh sources** run's
   per-source outcome, `snapshots/<source-id>.*` and source health in the feed.
   A failed fetch must retain the old body and may report a stale lane. Fix
   transport/schema only from a permitted real response; use
   `bun run refresh --dry-run` to inspect the plan and
   `bun run refresh --only <source-id>` for a bounded local check when access
   permits. Re-run the full gates, then verify CI/Pages and the published feed.

## Next concrete step

Confirm `endfield-wikigg-echoes` from a GitHub Actions refresh run, then perform
a focused phone smoke check of the challenge filter and partial-day deadlines.
Seek a current
official or in-game ZZZ reset anchor before projecting later Shiyu/Deadly
cycles; source the HSR 4.6 Memory of Chaos end before publishing it. Collect
normal-use observations in `docs/IMPROVEMENT-BACKLOG.md`, implement approved
pre-Astra polish in separate commits, smoke-check and freeze the baseline for
the independent Astra audit. Create final `docs/MAINTENANCE.md` after audit
fixes. The official Endfield robots chain and NTE Circle Bounty dispute remain
separate maintenance gaps.

## Account Sync — S1

- Branch: `feature/account-sync-s1`, based on `main` `074cad5` (verified on
  2026-09-25). Published implementation commit: `c986986`. This milestone is pure/local;
  no S2 storage migration or cloud integration is included.
- `src/shared/sync.ts` introduces Zod-backed logical versions and mutations for
  progress, daily marks, ignored state, each top-level preference key, custom
  games and custom events. Event/occurrence IDs remain opaque. Daily rows use
  an injective `(subjectId, dayKey)` tuple key. A newer `changedAt` instant
  wins; equal instants are ordered by the stable `mutationId`. Conflicting
  content reusing the same logical version fails closed.
- Clearing progress and deleting custom objects retain tombstone rows;
  `completed: false` and `ignored: false` are explicit versioned reversals.
  Optional `gameOrder`/`knownGames` resets use `unset: true` with null, distinct
  from the meaningful null for `focusGame`. This is the safe representation of
  the existing v1 reset-to-absence behavior, not a new UI policy. An older
  offline active value cannot revive any of these states.
- The serializable outbox model keeps mutations until an `accepted` or
  `superseded` acknowledgement. Exact replay is accepted idempotently;
  duplicate queued IDs with different content fail. S1 does not persist or
  wire this outbox into current hooks/localStorage.
- `test/sync.test.ts` simulates two independent devices from one snapshot,
  offline edits, reversed and duplicated delivery, and eventual remote pulls.
  It covers progress status/note conflicts and clear, daily untick, unignore,
  per-key preferences with equal-timestamp tie-breaking and optional reset,
  custom event edit/delete, custom game delete, stale snapshots, and outbox
  acknowledgements. All devices converge to the same logical state.
- Bun 1.3.14: `bun install --frozen-lockfile`, typecheck, **926 tests** (16 new),
  and build passed. Local feed: 156 events across seven games, one pre-existing
  NTE Circle Bounty conflict. Diff contains only the pure module, tests and
  this status document. Current production UI, v1 localStorage keys and
  behavior, export/import format, ingestion, public feed and event IDs were
  not changed. PR #7 CI [run 36120821679](https://github.com/maxvfk/game-calendar/actions/runs/36120821679)
  passed on the complete implementation tree (including the opaque-ID fix).
- No product decision blocked S1. The optional-preference reset case above
  was resolved directly from existing v1 behavior. Clock skew detection and
  server receipt diagnostics remain for the future cloud milestones described
  in the approved design.

Next concrete step: S2 — profile-scoped local storage

## Account Sync — S1.1

- Branch `feature/account-sync-s1-1-pref-validation` from current `main` `2f6d835`;
  published implementation commit `9a29b7b` (local equivalent `b3532af`),
  [PR #8](https://github.com/maxvfk/game-calendar/pull/8). S1's broad preference value union allowed
  incompatible key/value pairs such as `theme = 123` or `region = "banana"`.
- `src/shared/sync.ts` now checks each non-unset preference against a keyed
  Zod schema. Its keys must cover every top-level `Prefs` field at typecheck;
  sort, timeline grouping and visible categories reuse the current client
  value lists. Arrays of lane IDs remain strings, including custom and retired
  lanes. `timelineDayWidth` accepts finite numbers; `focusGame: null` remains
  meaningful. Only `knownGames` and `gameOrder` may use `unset: true` with null.
- Focused acceptance/rejection cases in `test/sync.test.ts` cover invalid
  scalar types, enum values, arrays, non-finite widths and reset rules, plus
  valid current settings and custom lane IDs. Existing S1 convergence tests
  remain green. Bun 1.3.14 frozen install, typecheck, 963 tests and build passed;
  feed remains at 156 events with the pre-existing Circle Bounty conflict.
- No S2 work was started. UI, current localStorage, export/import, ingestion,
  feed, mutation ordering and other sync semantics were not changed.
- PR CI [run 36124500135](https://github.com/maxvfk/game-calendar/actions/runs/36124500135)
  passed on the implementation and initial status tree.

Next concrete step: S2 — profile-scoped local storage

## Account Sync — S2

- Branch `feature/account-sync-s2-profile-storage` from `main` `946ed3a`
  (2026-09-25). The synchronous bootstrap creates a stable `local:<id>` guest,
  stores its registry and active ID, and selects it before user-owned hooks
  mount. Signed-out startup reselects the guest if an account cache was left
  active; profile keys are isolated. There is no auth or cloud call.
- All current user stores now use `gacha-tracker:v2:profile:<id>:*` keys.
  Existing v1 progress, daily, ignored, prefs and custom stores are copied
  once into the guest without deleting or writing v1 keys. Legacy completions
  seed progress only when v1 progress has no rows. The migration marker is
  written after copying, retries incomplete copies, and never replaces an
  existing v2 store. An empty v2 progress store stays empty on later loads.
  A failed storage write leaves v1 intact and keeps available data in memory
  for that visit, so the UI does not mount over a partial copy with defaults.
- The pre-paint script reads active scoped preferences; before first bootstrap
  it falls back to v1 prefs to preserve the theme. Existing export/import
  actions operate on the mounted active profile, retaining the version 1 JSON
  backup format and standard-versus-all preference behavior. `syncMeta` and
  `outbox` have reserved scoped key names but no S1 mutation wiring in S2.
- Focused tests cover migration/retry, legacy preservation, profile isolation,
  signed-out activation, hook/export reads and pre-paint theme. Bun 1.3.14:
  frozen install, typecheck, **978 tests**, and build passed. Local feed remains
  156 events across seven games with the existing NTE Circle Bounty conflict.
  [PR #9](https://github.com/maxvfk/game-calendar/pull/9) CI
  [run 36146509029](https://github.com/maxvfk/game-calendar/actions/runs/36146509029)
  passed; merge commit 1b233c7 reached main. Main CI and Pages deploy
  [run 36146620702](https://github.com/maxvfk/game-calendar/actions/runs/36146620702)
  passed, and the published Pages HTML returned 200 with the v2 pre-paint
  script.
- Manual browser smoke on 2026-09-25 confirmed that upgrading/reloading through
  S2 did not reset the existing local state at any observed stage. Backup
  semantics were also exercised: event A was marked done and exported, then A
  was cleared and event B marked done locally; importing the backup resulted in
  both A and B done. This matches the intentionally additive standard-import
  semantics: the backup restores marks it contains without deleting newer
  local marks that are absent from the file.

S2 concluded; S3 is recorded below.

## Account Sync — S3

- Branch `feature/account-sync-s3-supabase-foundation` from current `main`
  `9bbf623` (2026-09-25). `supabase/config.toml` and two versioned migrations
  define `profiles`, progress, daily marks, ignored, per-key preferences,
  custom games/events, profile indexes and cascading ownership. `received_at`
  records server receipt time separately from conflict versions.
- All seven personal tables have RLS. `anon` has no table or RPC grants;
  `authenticated` can read only owned rows. Direct table writes/deletes are
  withheld so a blind upsert cannot bypass conditional ordering. The two
  explicitly granted `SECURITY DEFINER` RPCs use an empty search path and
  check `auth.uid()` ownership: `ensure_default_profile()` is idempotent with
  a unique partial index; `apply_profile_mutations()` validates a bounded
  batch and applies newer `(changed_at, mutation_id)` versions atomically.
  Equal-version exact replay is accepted; stale versions are superseded;
  conflicting replay fails. Tombstones and explicit reversals persist.
- `test/supabase-db.test.ts` executes the migrations in PGlite PostgreSQL 18
  with local Supabase Auth role/UID stubs. It covers owner/other-user/anon
  access, direct-write denial, all six mutation kinds, replay, stale writes,
  validation, cascade cleanup, and default-profile uniqueness. This verifies
  PostgreSQL behavior locally; the hosted Supabase/PostgREST integration is
  not exercised. No hosted project, credentials, browser Auth, UI or cloud
  calls were added. `supabase/README.md` documents the wire contract and the
  later hosted verification boundary.
- Bun 1.3.14: frozen install, typecheck, **989 tests**, and build passed.
  Local feed remains 156 events across seven games with the pre-existing NTE
  Circle Bounty conflict. PR #11 merged as `3db8c24`; PR CI run
  [36151862179](https://github.com/maxvfk/game-calendar/actions/runs/36151862179)
  passed. Main run
  [36151973509](https://github.com/maxvfk/game-calendar/actions/runs/36151973509)
  passed typecheck, tests, feed, site build, and Pages deployment.

Next concrete step: S4 — Google Auth, default-profile resolution and explicit
first-login local migration. Provisioning a hosted Supabase project and Google
OAuth configuration is deferred until that milestone; S3 needs neither.

## Account Sync — S4

- Branch `feature/account-sync-s4-auth` from current `main` `563862c`
  (2026-09-26). The operator created hosted Supabase project
  `vzzudezdigjwbwfejlsg`, applied both S3 migrations in order, and configured
  Google OAuth Testing for the Pages and localhost origins. The browser uses
  only the project URL and publishable key; no secret credentials are shipped.
- PKCE returns to the real GitHub Pages base URL. `getUser()` verifies a session
  and the default profile ownership is checked before cached account state is
  selected. Signed-out use retains the stable guest. The pre-paint script reads
  only guest prefs (or v1 before migration), never a stale remote active ID.
  OAuth callback query codes are removed from history and not cached by the
  service worker.
- First login fetches validated cloud rows and explicitly offers guest import,
  cloud-only, or cancel when appropriate. Merge uses the S3 conditional RPC;
  settings conflict defaults to the account copy. A persisted plan preserves
  mutation IDs across interrupted batches; a failed S2 durable guest copy
  blocks account setup rather than being mistaken for an empty guest. The guest and v1 copies remain
  intact, while the selected account cache records a baseline for S5.
- S4 does **not** wire ordinary local edits/imports to cloud, create an outbox,
  or run foreground/background sync. The Account UI says changes remain on
  this device until S5. Hosted anon PostgREST verified `401 / 42501` on all
  seven personal tables and both RPCs. Hosted OAuth authorize returned a
  Google redirect with the configured Supabase callback. Authenticated
  owner/cross-user and completed Google sign-in/first-login smoke still require
  an authenticated test-user session. The published Pages build was opened in
  a fresh browser session: signed-out guest calendar and Account controls work,
  and Continue with Google reaches the Google sign-in page through the
  configured Supabase callback.
- Bun 1.3.14 frozen install, typecheck, **997 tests**, and build passed locally; the
  feed remains 156 events across seven games with the pre-existing NTE Circle
  Bounty conflict. [PR #13](https://github.com/maxvfk/game-calendar/pull/13)
  merged as `de21351`. PR CI
  [run 36248747931](https://github.com/maxvfk/game-calendar/actions/runs/36248747931)
  passed; main CI
  [run 36248791489](https://github.com/maxvfk/game-calendar/actions/runs/36248791489)
  passed typecheck, tests, feed, build and Pages deployment.

Next concrete step: S5 — production sync engine, including durable outbox,
pull/merge/push, retry/status and two-device convergence. Do not treat S4's
one-time import as continuous sync.

## Account Sync — S4.1

- Branch `fix/account-sync-s4-1-bootstrap` from current `main` `75f5e76`
  (2026-09-26). Auth bootstrap now invalidates an in-flight resolution when
  the auth session/identity changes, including before the initial resolver has
  finished. Its ticket guards both account-cache activation and rendering;
  callback exchange remains one-use across StrictMode remounts and sign-out
  falls back to the guest.
- Custom games retain `at` as creation time and add optional `updatedAt` for
  edits. Each new edit advances it even within one millisecond; first-login
  `changedAt` uses `updatedAt ?? at`. Old stored/exported games remain valid,
  the export format and `mygame:` IDs are unchanged. Historical edits made
  before this field existed cannot be dated retroactively and retain `at` as
  their version until the next edit.
- Focused tests cover the A→B change while the initial resolver is in flight,
  callback/StrictMode and signed-out fallback, legacy game export/import,
  monotonic edits, and a renamed local game's conflict with an older cloud
  copy. Bun 1.3.14 frozen install, typecheck, **1001 tests**, and build passed;
  feed remains 156 events across seven games with the existing NTE Circle
  Bounty conflict.
- Manual authenticated production smoke completed successfully on 2026-09-26
  with a Google test user. It covered first login from an existing guest,
  explicit local-to-account import, callback cleanup, reload persistence,
  sign-out back to the browser's guest state, sign-in restoring account state,
  a second browser profile with different local data merged into the same
  account while keeping account settings, verification that a newer custom-game
  rename/color won correctly, a clean profile reading the cloud account copy,
  and cloud-only selection followed by sign-out/refresh returning to that
  profile's guest state. All requested S4/S4.1 smoke cases passed.

Next concrete step: S5 — production sync engine. S4/S4.1 are now closed.
S4.1 did not add ongoing sync, an ordinary-edit outbox, or status UI.

## Account Sync — S5

Status: **complete**, including the production two-browser smoke and the
S5.1 offline lifecycle follow-up verified below.

- Branch `feature/account-sync-s5-engine` from current `main` `3657cfb`
  (2026-09-26). S4's materialized account baseline upgrades once: edits made
  after S4 first login are compared with that snapshot and placed in a durable,
  profile-scoped outbox before the first cloud pull. Later progress, daily,
  ignored, per-key preference, custom-game and custom-event edits (including
  uncheck, unignore, reset and deletion) journal first, then update the local
  cache. Existing export/import merges go through the same hook write path.
  Signed-out guest state remains local and isolated.
- An authenticated cycle verifies the owner, pulls six versioned cloud tables,
  merges pending mutations, conditionally sends them through the existing S3
  RPC, pulls again and removes only cloud-confirmed or superseded mutations.
  It re-reads the outbox after network requests so concurrent edits remain
  pending, and startup replays interrupted local writes. The controller runs
  on startup, foreground, online, debounced edits and a five-minute foreground
  interval. It retries transient failures with bounded backoff and shows
  pending, offline, retry, auth, schema, last-success and clock-warning status.
  No realtime channel or S6 backup work was added.
- Tests cover migration and interrupted writes, opaque IDs, all mutation
  families and reversals, offline conflicts and two-device convergence,
  acknowledgement retry with the original mutation ID, in-flight edits,
  profile isolation, triggers and auth failure. The production two-browser
  authenticated smoke was an operator release gate after Pages deployment;
  this local test run did not substitute for that hosted check. S5 still
  required online Auth verification on cold start, and treated a fetch failure
  while `navigator.onLine` was true as a generic sync error.
- Bun 1.3.14 frozen install, typecheck, **1012 tests** across 49 files and
  build passed locally. The feed remains 156 events across seven games with
  the pre-existing NTE Circle Bounty conflict.

Production smoke on 2026-09-29 with independent profiles A/B using one
disposable Google test user passed account loading, A→B for progress, daily,
ignored, theme, custom game/event, B→A foreground pull without reload, reload
persistence, a later online B same-row edit winning after A went offline,
guest export → account Import all → outbox/cloud → B, sign-out/guest isolation,
sign-in restoration and absence of repeated first-login prompts. B's edits
appeared on A almost immediately. Two offline lifecycle defects remained:
`Failed to fetch` displayed a generic sync error despite a durable pending
mutation, and cold-offline reload fell back to guest without automatically
restoring the account on reconnect. Flushing the specific mutation across
that cold-reload sequence was not observed in the production smoke.

## Account Sync — S5.1

Status: **complete**. Merged in PR #17 (`f100ff4`); targeted authenticated
production smoke passed on the deployed Pages build on 2026-10-03.

- Branch `fix/account-sync-s5-1-offline` from current `main` `ff10333`
  (2026-09-29). Cold-offline bootstrap may show an already established local
  account only when an unexpired cached Supabase token's project issuer and
  `sub` match its local session user ID and exactly one stored account binding.
  A missing, mismatched or ambiguous identity stays on the guest. Pre-paint
  still uses the guest/default theme. Offline account edits remain in its
  durable outbox; the sync controller cannot send until online account
  verification and profile ownership complete. Explicit sign-out and account
  switch continue to invalidate an in-flight resolver.
- A browser online event, foreground return or 15-second recovery probe
  retries a transport-blocked bootstrap without a page reload or Google login.
  A network failure during that retry keeps a safely matched offline account
  visible; a true auth/ownership failure falls closed. S5 `Failed to fetch`,
  Auth retryable fetch and timeout failures show network-unavailable/local-save
  status with bounded retry even when `navigator.onLine` remains true. Auth,
  schema and other application errors retain separate statuses.
- Deterministic tests cover offline reload with exact outbox replay, reconnect
  verification and cloud propagation to a second device, guest fallback
  recovery, A/B session mismatch, explicit sign-out, ambiguous binding,
  in-flight account switch and transport/error classification. The targeted
  production smoke below closes the remaining manual gate. No realtime or S6
  work was added.
- Bun 1.3.14 frozen install, typecheck, **1019 tests** across 50 files and
  production build passed locally. The refreshed feed on current `main`
  contains 164 events across seven games with the existing NTE Circle Bounty
  conflict.

Targeted production smoke on 2026-10-03 passed with two independent browser
profiles using the same disposable Google test account:

- An offline mutation applied immediately and remained durable in the outbox.
- Cold reload while offline opened the same established account cache; account
  data and the pending mutation stayed visible without guest/start fallback.
- Reconnect automatically re-verified the account and resumed sync without
  reload or Google login. The pending mutation flushed and propagated to B,
  confirming survival across the previously unobserved cold-reload sequence.
- Blocking Supabase requests through DevTools Request conditions while the
  browser still reported online showed the intended network/local-save status
  instead of a generic sync failure. Pending data remained local; removing the
  block automatically recovered sync and convergence.
- Explicit sign-out returned to the browser's guest profile. Cold offline
  reload remained on guest, and reconnect did not reactivate the account.
  Account data returned only after explicit sign-in.

All requested S5.1 production checks passed; no S5/S5.1 manual gate remains.
Changes on A need not appear spontaneously on an untouched B: foreground
return, tab switch or another existing sync trigger pulls them. This is the
expected S5 behavior without realtime, not an outstanding defect.

Documentation closure was prepared from current `main` `e1b70f9` on
2026-10-03. Frozen install, typecheck, **1019 tests** across 50 files and build
passed again. The current feed contains 171 events across seven games with
the existing NTE Circle Bounty conflict; this closure changes documentation
only.

Next planned milestone: S6 — backup and hardening, after several days of real
use and in a separately authorized Work. Its approved scope is a private
GitHub backup strategy, a recovery drill, optional local cache removal,
monitoring/logging sufficient for 2–3 users, and maintenance documentation.
S6 had not started at that closure; realtime and multi-profile UI remain outside it.

## Account Sync — S6a: private backup + recovery

Status: **complete (2026-10-19).** Hosted encrypted backups, real-key
validation, a controlled single-profile production restore and a fresh deployed
app read all passed. See the 2026-10-19 drill entry at the end of this section.
S5/S5.1 remain closed; S6b monitoring/cache-removal work is separate and has not started.

- New short-lived branch `account-sync-s6a-backup` from verified public main
  `c60cba50ba7cd66a7150c33f0a0133f4b8fc72a5` on 2026-10-03. The separate private
  `maxvfk/game-calendar-backups` was verified private with main
  `15f81501a223ef289b15d1bdd954c92107f955aa` (initial README only), and its own
  fresh S6a branch holds the scheduled workflow and operations README.
- Public migration adds a passwordless NOLOGIN `calendar_backup` SQL role,
  SELECT-only access/RLS for all seven personal tables, no memberships,
  BYPASSRLS, Auth reads or sync RPC execute privilege, and a SQL-only project
  identity marker. Operator enables its login/password locally. Backup uses
  verified-TLS Supavisor Session pooler (5432) or direct SQL, one REPEATABLE
  READ/READ ONLY transaction; no service-role API key is needed.
- Canonical version 1 logical snapshots preserve profiles/owners, progress,
  daily_marks, ignored, preferences, custom_games, custom_events, tombstones,
  false/unset, JSON null and original LWW metadata. Format/project/live generated
  schema contract, counts, per-table/total digests and row validity are checked.
  Age X25519 encrypts in memory with a public recipient before writing; GitHub
  never receives the private decryption key. Plain manifests contain safe
  metadata/ciphertext digests only, with no account IDs or row counts.
- Private workflow runs daily at 01:23 UTC, captures first successful monthly
  snapshot, retains latest 30 daily / 12 monthly pairs deterministically in the
  current tree and commits only encrypted pairs. Old ciphertext stays in Git
  history; no history rewrite is implied. Errors/nonempty-payload/integrity
  checks fail Actions visibly. Code/actions are pinned; the read credential is
  scoped to configuration checks and production export and never logged/staged.
- Local administrative restore defaults to a read-only dry run and requires
  explicit selected profile(s) or all snapshot profiles plus `--write` for DML.
  It checks existing Auth UUIDs, unchanged ownership/default uniqueness and
  target project/schema, locks the seven tables, atomically replaces selected
  profile state, verifies every restored row and commits or rolls back. It is
  idempotent and leaves unrelated profiles intact. It never creates/remaps Auth
  identities or uses the browser sync RPC. Quiescent account devices and a
  fresh-browser/cloud-only verification are required for the production drill.
- Local tests execute actual migrations in PostgreSQL 18/PGlite and test
  read-only cross-owner export, owner/anon isolation, corruption/drift, all
  logical state types, ownership/Auth/default refusal, dry-run, rollback,
  exact/idempotent isolated restore, existing app decode/materialization and
  retention. Native Bun.SQL wire tests caught and corrected explicit Postgres
  array parameter encoding. Real age encryption/decrypt/validate/restore passed
  with synthetic rows and the publicly known upstream test identity kept outside
  both repos; no production private key was created.
- Bun 1.3.14 frozen install, typecheck, full tests and build passed locally in
  UTC (CI's timezone); standard suite **1031 pass / 1 optional age test skipped**,
  focused suite with external age test fixture **13 pass**, and the full suite
  with that fixture **1032 pass / 0 skipped / 0 fail**. The initial
  America/Chicago environment exposed an existing date-only custom EventRow
  expectation; UTC passes without any UI/test changes. Feed remains 171 events
  across seven games with the pre-existing NTE Circle Bounty conflict.
- Architecture, exact manual setup, key custody, retention/history tradeoff,
  local commands, exclusions and safe disposable-account production drill are
  in [ACCOUNT-BACKUP.md](ACCOUNT-BACKUP.md); the private README records its
  pending production evidence. Neither repo contains a secret or plaintext
  personal snapshot. No realtime, multi-profile UI, new providers, source work,
  cache-removal UI or full new-project/Auth disaster recovery was added.

- Production TLS follow-up on 2026-10-07 starts from current public main
  `38e93819be1a1c268839ab3bc5230b146aee25af` and private main
  `9457798a2d59c3de52411d8da893bb08ec4147ef`, on fresh `s6a-production-tls`
  branches. Hosted run `37609430936` passed guard/config/setup/tests, then
  failed SQL TLS with `self signed certificate in certificate chain`; no
  snapshot was committed. The exact operator Dashboard CA attachment was
  independently verified and committed at `supabase/certs/prod-ca-2021.crt`.
  Its fingerprint/validity are pinned before connection, with native Bun.SQL
  chain/hostname verification retained. This public CA needs no Secret or
  runner trust-store setup; rotate through reviewed PRs before 2031-04-26.
  Native handshake regression tests prove trusted CA acceptance and rejection
  of untrusted chains, hostname mismatch and refused TLS without fallback.
  Existing backup/restore restrictions and behavior remain intact. Focused
  tests: **15 pass / 1 optional age skipped / 0 fail**; frozen install,
  typecheck and build passed (170 events/seven games, two existing conflicts).
  Full suite: **1033 pass / 1 optional age skipped / 1 fail**. The sole failure
  is the unrelated Endfield reviewed-banner conflict assertion, reproduced on
  untouched current main (**1030 pass / 1 skipped / 1 fail**) and already red
  in its [CI run](https://github.com/maxvfk/game-calendar/actions/runs/37536018586).
  No source-ingestion/data/test bypass was added to this TLS-only follow-up.

- Hosted-schema compatibility follow-up starts from verified public main
  `2b30cece52e1a0ce7d60783cb636f7d5c71ac7fb` and private main
  `0865d9e84d6415349b9e862619951d093be30108`, using fresh
  `s6a-hosted-schema-contract` work. Actual run `37616434328` passes verified
  TLS and focused tests, then fails `Live database schema mismatch`; no snapshot.
  Operator catalog diagnostics confirm **PG17**, the expected project marker,
  exact columns (50), indexes (9) and triggers (6), and exactly 44 expected-only
  PG18 NOT NULL constraints (78 expected / 34 hosted, no other differences).
  NOT NULL is not the sole mismatch: all four function bodies differ, but their
  complete declarations and metadata match and every body matches after CRLF
  conversion. This is stored-body line-ending drift, not a proven deparser change.
- The semantic contract excludes only `contype='n'`, protecting nullability with
  column `notNull`. It normalizes only function-body CRLF outside quoted values;
  declarations, literals and all other schema definitions remain protected.
  Regressions cover PG18/pre-18 shapes, nullability, CHECK/PK/FK/index/function
  drift, literal newlines, malformed definitions and unchanged project/RLS/role
  guards. The canonical file is regenerated from migrations, never a live hash;
  new schema SHA-256 is `312a36fa274c90eba0f72000b81b8de72d25a2d5d54bebb31b955479889f4a3e`.
  Migration hashes and schema/backup format versions stay unchanged.
  Credentials, TLS, encryption, retention, restore writes and app sync are untouched.
  Validation on Bun 1.3.14: frozen install, typecheck and build passed; focused
  backup/TLS tests **26 pass / 1 optional age skip / 0 fail**. Full suite:
  **1044 pass / 1 skip / 1 fail**, solely the existing Endfield reviewed-banner
  assertion, reproduced on untouched current main (**1033 pass / 1 skip / 1 fail**).
  No source changes, test bypass or production execution were added.

- Production-preflight follow-up starts from verified public main
  `9cba9061f08978b19134d842d48672946ad66f09` and private main
  `d8e8ade2b41785ec28bc7339526c7e2b14b72388`, on fresh
  `s6a-event-trigger-preflight` branches. Actual hosted run `37643339951` passes
  operator config, pinned checkout, focused tests (**26 pass / 1 optional skip /
  0 fail**), verified TLS and semantic schema-contract preflight. It then fails
  `assertBackupRole` with `Backup role can execute a public SECURITY DEFINER
  function`; encrypted snapshot commit is skipped.
- Operator catalog diagnostic identifies **only** `public.rls_auto_enable()`,
  owner `postgres`, `calendar_backup_can_execute=true`, grants
  `PUBLIC:EXECUTE, postgres:EXECUTE`. This is the documented Supabase automatic-RLS
  `EVENT_TRIGGER` helper. PUBLIC EXECUTE is a default-privilege/ACL artifact,
  not a directly callable backup RPC. The fix excludes only return type
  `pg_catalog.event_trigger` by catalog identity, without a name allow-list;
  ordinary SECURITY DEFINER and regular `trigger` functions remain guarded.
  No production ACL/platform change is required. All earlier elevated-role,
  membership, public-CREATE and table-privilege guards remain unchanged, as do
  TLS, schema contract, format, encryption, retention and restore behavior.
  Real PGlite event-trigger tests verify ACL/type, non-callability, denied
  non-superuser installation and actual DDL firing. A regular trigger fixture
  demonstrates indirect invocation through a temporary table and guard rejection;
  role/privilege drift and inaccessible application RPCs remain covered.
  Validation (Bun 1.3.14): frozen install/typecheck/build pass; focused backup
  tests **30 pass / 1 optional age skip / 0 fail**. Full suite:
  **1048 pass / 1 skip / 1 fail**, only the existing Endfield banner assertion,
  reproduced on untouched current main (**1044 pass / 1 skip / 1 fail**).
  No source/test bypass or production execution was added.

- Hosted backup acceptance: with the role-guard fix pinned at
  `5b2a2b048bae53f32e464b0a91a8f5d9f354b669`, the private backup passed full
  role/policy/project/schema preflight and committed its first encrypted
  daily+monthly pair on 2026-10-07 (manual run `37650989484`). Scheduled runs
  succeeded on 2026-10-08 and every day 2026-10-10 → 2026-10-19. One isolated
  scheduled failure on 2026-10-09 (`37899103637`, generic sanitized export error,
  no commit, next run green) is left for S6b monitoring.
- Production recovery drill on 2026-10-19 followed
  [S6A-LOCAL-RECOVERY-DRILL.md](tasks/S6A-LOCAL-RECOVERY-DRILL.md) on the
  operator's trusted PC, from public main `9465f63` and private main `a30b324`:
  - The 2026-10-19 production snapshot (run `39208997141`) was decrypted and
    fully validated with the operator's **real** age key in a recovery worktree
    at its manifest `sourceRevision`. No plaintext was written to disk.
  - Disposable-account marker state was captured by a fresh pre-change backup
    (run `39265659289`, private commit `aff3030`), preserved outside the repos
    and validated. The markers were then changed or removed, and a post-change
    safety backup was taken (run `39266225373`, commit `0bb7963`).
  - With the account quiesced, a `--profile` (exactly one disposable default
    profile) `--dry-run` passed every scope check and showed seven-table plan
    counts 1/10/3/1/18/3/2 (profiles/progress/daily_marks/ignored/preferences/
    custom_games/custom_events). After explicit operator approval, a single
    `--write` committed and verified every row, and a post-write dry-run matched.
    The restore credential stayed in local process env only and was removed
    after each run.
  - A fresh browser profile with cloud-only login showed every pre-change
    marker restored (progress/note, daily, ignored, theme, custom game/event).
    The other account was unchanged.
  - Sanitized record: private
    `game-calendar-backups/reports/2026-10-19-s6a-local-recovery-drill.md`.
    The private README Evidence table was reconciled to match.

**S6a is complete.** No code, schema, workflow, credential or pin changed
during the drill. S6b (monitoring, cache removal) is a separate milestone and
has not started. Timeline M1/M2 still need their own explicit start from
CURRENT `main`.


## Pre-public release gate — Google OAuth publishing

Status: **deferred until the main pre-public product work is complete; not a
blocker for current owner/household use or Timeline M1/M2.**

- The existing Google/Supabase users are real production data identities. Do not
  recreate, remap or migrate the owner's or wife's users merely because the
  Google OAuth application's current publishing status was configured for
  testing during setup.
- Keep the current restricted/testing OAuth configuration while the calendar is
  still being developed and used by the existing small trusted set.
- Before the intended public-sharing scenario — **"here is the link; sign in
  with your Google account and use it" without manually pre-authorizing each
  person** — run a fresh Google OAuth production-readiness check against current
  Google/Supabase guidance.
- That check must confirm the requested Google scopes remain identity-only
  (`openid`, email/profile equivalents), review Audience/Branding, authorized
  redirect URIs, Supabase Site URL/redirect allow-list and any then-current
  policy/verification requirements. Do not add broader Google API scopes as part
  of publishing.
- Only after that review should the OAuth app be moved to
  **Publish app / In production**. Publishing is an OAuth-access/configuration
  change, not a migration of Supabase users or calendar data.
- After publishing, perform a fresh-account production smoke with a Google
  account that was not previously part of the controlled test set: sign in from
  the public Pages URL, create the new isolated default profile, sync a small
  disposable change, sign out/in, and verify existing users remain isolated.
- If Google introduces a verification, branding or policy requirement that is
  not satisfied by the identity-only flow, stop and review it rather than
  weakening auth boundaries or broadening scopes.

**Next concrete step for this gate:** none now. Revisit after the planned
pre-public implementation/audit work, immediately before broad link sharing.


## Source-health alert dedup — 2026-10-21

Status: **implemented and locally validated; post-merge hosted Refresh acceptance
is pending the next eligible normal cycle.** Task:
`docs/tasks/SOURCE-HEALTH-ALERT-DEDUP.md`.

- Baseline CURRENT main: `668192994aa6aa9ac397602d3cc2cbf970511e05`;
  branch `fix/source-health-alert-dedup`. Actual latest scheduled
  [Refresh 39494275065](https://github.com/maxvfk/game-calendar/actions/runs/39494275065)
  confirmed **6/8** sources, committed two changed bodies/confirmation metadata
  and dispatched publication. Only `Report source health` failed. Echoes was
  already **broken / 12 failures / HTTP 200**, last confirmed
  `2026-10-14T20:47:25.387Z`, with the same western Phantasia cycle/season
  contradiction. WuWa was also already **broken / 5 failures / HTTP 200**, last
  confirmed `2026-10-18T09:43:11.393Z`: 7/10 still-live identities disappeared
  in the candidate 10 → 3 row response, so the previous snapshot was retained.
  The triggered [CI/Pages 39494325800](https://github.com/maxvfk/game-calendar/actions/runs/39494325800)
  passed all three jobs: **1054 pass / 1 optional skip / 0 fail**, feed
  **181 events / 7 games / 1 existing NTE Circle Bounty conflict**.
- `runRefresh` derives `newlyBroken` from each selected source's persisted
  `SnapshotState.consecutiveFailures` before/after its cycle: below the existing
  **3** threshold before, at/above it after. `broken` remains the full standing
  list, including interval-skipped broken sources. Recovery resets the streak
  normally; another third failure alerts again. A new broken source alerts even
  while another source stays broken. No acknowledgement database or
  source-specific exception was added.
- Outputs expose both `broken` and `newlyBroken`. GitHub's final health gate
  fails only for nonzero `newlyBroken`, after snapshot commit/feed dispatch.
  The retained Gitea workflow uses the same rule to avoid incompatible health
  gates. Existing error annotations remain on **every** broken source, with
  `Newly broken` / `Still broken` context; step summary rows distinguish
  `broken (new)` from `broken (ongoing)` and show both totals.
- **No source-health/LKG acceptance rule was relaxed.** Threshold,
  failure/rejection accounting, robots/interval/override/no-retry rules,
  parser-zero/disappearance/boundary/conflict protections and hard failures are
  unchanged. `SnapshotStore`, parsers, checked-in snapshots and event data are
  untouched. Repeated all-source failure still fails even with no new health
  transition; no Phantasia cycle dates are accepted or invented.
- Local Bun **1.3.14**: `bun install --frozen-lockfile`, `bun run typecheck`,
  `bun test`, `bun run build` all pass. Focused Refresh tests: **90 pass / 0 fail**.
  Full suite: **1057 pass / 1 optional age skip / 0 fail** (1058 tests, 51 files).
  Regression coverage includes failures 1–5, recovery/re-break, a second source,
  interval skip, separate outputs and execution of both workflows' actual Bash
  health gates. Build: **181 events / 7 games / 1 existing conflict**;
  Phantasia cycles remain withheld.
- Hosted Refresh acceptance has **not yet been observed** for the new code.
  The latest source checks at `2026-10-20T20:42Z` were less than six hours old
  during this work. No forced refresh, failure-streak reset or cache edit was
  used for a demonstration. On the next eligible normal cycle, verify that the
  existing broken sources stay visible, newly-broken count is zero unless a
  real new transition occurs, valid sources publish, and triggered CI/Pages
  succeeds. Implementation PR/checks provide the merge/deployment evidence.

**Next concrete step:** Timeline M1 from CURRENT `main` after this alert-dedup
change is merged; do not start it as part of this milestone. The independent
Echoes contradiction and WuWa disappearance review remain source blockers.


## Timeline Readability / Recognition UX

Status: **research, M1 and M2 complete (2026-10-21); PR #34 deployed and operator phone/PC smoke accepted. Account/User S6a completed on 2026-10-19; S6b is separate/non-blocking.**

- A five-step UX research task was completed and reviewed in `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`.
- The selected direction is **Candidate A′ — Sticky semantic bars**:
  - optional semantic `recognitionSubjects?: string[]` with title fallback and no heuristic marketing-title parsing;
  - sticky readable identity + truthful end state rather than deadline text only at the physical event end;
  - exact/day/unknown deadline semantics without invented time;
  - mode-specific degradation for `By game` versus `Ending soonest`;
  - future-biased actual-current-moment anchoring at roughly 20% from the left on phone and 25% on desktop;
  - re-anchor only on initial Timeline open and explicit `Jump to today`, not on filters/group/upcoming/refresh;
  - no event-type category bands in the selected implementation direction.
- One review correction was added to the final spec: the visual `TypeBadge` may disappear first on a narrow bar, but event type must remain in accessible semantics.
- Implementation is split into two bounded tasks:
  1. `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md` — additive semantic data contract only;
  2. `docs/tasks/TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md` — Timeline rendering/navigation/accessibility, after merged M1.
- The previous Account/User blocker is cleared by completed S6a. S6b monitoring/cache-removal hardening is separate and does not block M1/M2. Both Timeline milestones still require a fresh CURRENT-main check before implementation.
- The feedback backlog was reconciled on 2026-10-06. Three small UI fixes remain open and unsequenced: mixed reset attribution, explicit Event Detail close/Back dismissal, and `All types` clear-all. Weekly separators remain observed. Event artwork, recognition-first Event Detail redesign, per-game daily passes and any return to type grouping remain larger/deferred work.
- The original featured-subject feedback also mentioned `Next Up`/checklist surfaces. M1/M2 cover the semantic contract + Timeline only, so those additional compact surfaces remain an explicit follow-up and must not be silently considered resolved when M2 lands.

### M1 recognition metadata — 2026-10-21

- Baseline CURRENT main: `929f62881566d8670ae4dd730b47aadbf9635c87` (includes
  merged source-health alert dedup); fresh branch
  `feat/timeline-m1-recognition-metadata`. Task:
  `docs/tasks/TIMELINE-READABILITY-M1-RECOGNITION-METADATA.md`.
- Canonical `GachaEvent` and reviewed ingestion now accept optional
  `recognitionSubjects?: string[]`, sharing one validator. A present array must
  contain at least one subject; strings must contain non-whitespace text and be
  at most 200 characters. Values/order are preserved. No title parsing,
  inferred subjects, schema-version bump or UI consumption was added.
- Reviewed materialization explicitly carries the field. Existing merge winner
  selection, canonical feed validation and JSON serialization preserve it
  without changes. `eventId()`, completion/progress keys, dates/precision,
  provenance/conflicts, custom storage/IDs, exports/preferences and Account/
  Supabase are unchanged. Old nonempty v1 feeds and custom events remain valid
  without the field; the required official title remains the fallback.
- Only two reviewed Genshin records were populated, using the explicit subjects
  already recorded in their reviewed summaries and linked notice `166200`:
  `When Warm Winds Cavort` → `Vesna`; `Epitome Invocation — Version 7.1 Phase I`
  → `Beyond the Chrysalis`, `Hymn of the Maelstrom` in that order. These are
  existing historical feed records, not a claim of new source verification or
  active banner coverage. No new source fetch/research or review timestamp was
  needed; all original reviewed values/timestamps remain unchanged. No safe
  two-character co-headliner example was established, so that shape is tested
  synthetically. Ordinary events retain omitted metadata. Broad catalogue
  population and future structured-parser extraction remain separate work.
- Bun **1.3.14**: frozen install, typecheck, full tests and build pass. Focused
  contract/integration tests: **22 pass / 0 fail**. Full suite: **1079 pass /
  1 optional age skip / 0 fail** (1080 tests, 52 files). Initial full run hit an
  existing PGlite setup hook timeout in `supabase-db.test.ts`; the exact unmodified
  `bun test` rerun passed, without changing timeouts or tests. The local runtime
  needed its `bunx` executable alias restored before the successful build.
- Tests cover omission, one character, ordered characters/items, empty arrays,
  blank/whitespace/mixed-invalid strings, wrong types, old nonempty feed JSON,
  merge/serialization, pinned derived and explicit IDs, custom events, and the
  actual offline feed builder in an isolated output directory. Before/after
  feed comparison retains **all 181 IDs / 7 games / 1 existing NTE Circle Bounty
  conflict**. Event values differ only by the two additive metadata fields and
  normal regenerated parser observation timestamps. No source-health or
  ingestion acceptance rule was changed. PR/hosted validation is recorded in
  the implementation PR.

### M2 sticky semantic Timeline — 2026-10-21

- Baseline CURRENT main: `34ab4bf0aca4eb5cbc944040c44a4be59690aa85`, merged
  M1 PR #30; fresh branch `feat/timeline-m2-sticky-semantic`. Authoritative
  Candidate A′ final UX specification was read; no broad research reopened.
- Sticky content joins declared `recognitionSubjects` with ` + `, preserving
  order, or uses the required title. The full official title remains in the
  tooltip/accessible name when subjects are used. No metadata was populated.
- Known deadlines show a compact end date without an always-on clock. Day-only
  ends print the source date (local input date for custom events), have a dashed
  underline on the sticky date token, and explicitly say `end date only` in
  accessibility. Regional exact ends use the resolved clock, not the fallback
  date. Unknown ends show `end unknown` / `?`, accessible as `End unknown`;
  cross-year dates include the year. No end instant/date is invented.
- Initial M2 fit (superseded by the phone-smoke amendment below): actual DOM
  text/badge metrics and the bar/viewport intersection drive fit.
  `By game` drops visual type, then known deadline, before truncating identity.
  `Ending soonest` keeps game + identity before a known deadline; compact game
  text survives when identity cannot fit. Unknown-end tokens outlast known
  deadline text. At the physical minimum or a nearly scrolled-away tail, text
  may yield completely; the full accessible event name always retains game,
  type, identity/title, truthful deadline/precision, upcoming, conflict,
  completion and urgency. Bars remain 36px high and `MIN_BAR` remains **34px**.
- Edge masks now affect only the decorative wash/boundaries. This preserves
  clipped-start/frayed-end honesty without fading away sticky readable text.
  A directly related existing defect was found on the current feed: drawing an
  unknown end at `start + 14 days` hid old still-live campaigns behind today.
  Unknown bars now continue to the current board edge with the frayed wash and
  explicit unknown semantics; that edge is not presented as an end date. A
  regression covers a months-old live campaign. The board range stays bounded.
  Upcoming start styling/markers, completion dimming and conflict/urgency cues
  remain. No type grouping, row reordering, artwork or Event Detail changes.
- Initial mount and explicit `Jump to today` anchor **actual `x(now)`**, at
  **20% below lg / 25% at lg and above**. Ordinary updates never request a jump;
  the pane stays mounted through empty filters. Native range clamping is still
  permitted. Zoom retains the inspected centre moment. No preferences or
  account data migration, ID/completion key, storage, export/import, ingestion,
  source-health or Supabase changes were made.
- Bun **1.3.14**: `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`
  and `bun run build` pass. Full suite: **1095 pass / 1 optional age skip /
  0 fail** (1096 tests, 54 files). New focused semantic/fit + mounted navigation
  tests: **16 pass**; focused semantic/day/navigation tests also pass with
  `TZ=America/New_York` (**21 pass**) for day printing/DST behavior. The isolated
  mounted React test uses pinned dev-only `happy-dom` and explicit geometry;
  it tests initial empty/nonempty mounting, filter/feed/range replacements,
  group/upcoming/split changes, day/clock ticks, hidden badge accessibility,
  zoom and explicit Jump. It does not claim CSS-layout validation.
- Offline build still produces **181 events / 7 games / 1 existing NTE Circle
  Bounty conflict**, without changing data files or ID logic. Chromium CSS
  verification adds **152 responsive assertions** at 320/390/768/1440px,
  both modes, five zoom values and several scroll offsets: anchor, no re-jump,
  inspected-moment zoom, one-line height, label containment and payload fit.
  Screenshots were visually inspected for narrow/desktop layouts, including
  long off-screen-end bars, minimum bars, exact/day/unknown ends, ordered
  subjects/items, title fallback, upcoming, completion/conflict and dense
  seven-game data. This is browser automation, **not a real-device manual pass**.
- No intentional UX-spec divergence. [PR #31](https://github.com/maxvfk/game-calendar/pull/31)
  merged as `98506fb946d9c6457fc84122251474d89766933f`.
  [Main CI/build/Pages](https://github.com/maxvfk/game-calendar/actions/runs/39507927343)
  succeeded; public index/JS/feed returned HTTP 200 with the M2 implementation.
- **Partial real-phone manual evidence — 2026-10-21:** the operator supplied
  an Android Chrome screenshot of the deployed Timeline in `Ending soonest`.
  The visible current-moment line is near 20% from the left; game/identity text,
  title truncation and width-dependent deadlines are visible. This static image
  alone does not prove initial-mount or Jump behavior.
  The operator then explicitly confirmed that zoom preserves the inspected
  moment, and switching `By game` / `Ending soonest` and filters preserves
  position without returning to today. These phone navigation checks **passed**.
- **Required manual gate remains open.** Upcoming-toggle stability, explicit
  `Jump to today`, the remaining phone semantic/lifecycle/readability cases
  (including off-screen-end stickiness and exact/day/unknown ends), and the
  desktop matrix have not been separately confirmed. Do not infer a full
  section-14 pass or accessibility/text-scaling acceptance from the screenshot
  and the two navigation confirmations.

### M2 phone-smoke follow-up — TypeBadge priority and category colours

- Baseline CURRENT main: `f2136e171e2e37e207e1bc1ee539ad083d3b679d`;
  fresh branch `fix/timeline-type-priority-colors`. This is a bounded M2
  amendment requested after real-phone review, not a new milestone. The updated
  M2 task explicitly supersedes the original research's type-first removal
  rules; the rest of Candidate A′ remains in force.
- Timeline fit retains the complete measured compact badge until that badge
  itself cannot fit in the payload budget (after existing conflict/urgency
  reservations). `By game`: type + identity + date → type + identity → type +
  truncated identity → type → bare. `Ending soonest`: game + type + identity +
  date → game + type + identity → game + type → type → bare. A badge is never
  squeezed or truncated to fit. One-line height and `MIN_BAR=34` are unchanged.
- Unknown-end text still says `end unknown` when the full payload fits. Below
  that, reserve compact `?` beside type before allocating names. At the
  type-only limit, the marker can yield visually; below badge width `?` may
  survive alone. Full accessible type/identity/game/`End unknown` semantics
  remain at every width. No deadline/date/precision or old-campaign geometry
  logic changed; no fabricated endpoint was introduced.
- Shared `TypeBadge` now uses stable theme-aware category tones: Banner violet,
  Event cyan, Challenge orange, Login green, Shop pink, Maintenance slate.
  `story` / `rerun` / `other` remain Event. These tokens are independent of
  game hues and urgency. Full/compact text and `Type: …` accessible labels
  remain; colour is supplementary. The same component supplies Timeline,
  EventRow, NextUp and EventDetail. Degradation outside Timeline is unchanged.
- Bun **1.3.14**: frozen install, typecheck, full test suite and build pass:
  **1098 pass / 1 optional age skip / 0 fail** (1099 tests, 54 files).
  Focused semantic/fit/category/mounted-navigation coverage: **23 pass**.
  The first full run hit the previously observed PGlite hook timeout in
  `supabase-db.test.ts`; an unchanged full rerun passed. No timeout/test bypass
  or account/Supabase change was made. Dependencies/lockfile are unchanged.
- Existing responsive browser sweep was rerun and extended with real measured
  badge-retention assertions: **272 Chromium assertions**, widths
  320/390/768/1440, both modes, five zooms, three scroll offsets, no re-jump,
  inspected-moment zoom, one-line height and containment. Both theme palettes
  were visually inspected. Badge text/background contrast measured **≥7.53:1
  dark / ≥4.82:1 light**; forced-colours testing retained text. Built-app smoke
  passed on the actual offline seven-game feed, including all six live
  unknown-end rows. Feed remains **181 events / 7 games / 1 existing conflict**.
- No navigation, ingestion/source-health, personal data/preferences, IDs,
  Account/Supabase, artwork, type grouping or Event Detail layout change.
  The already-confirmed phone zoom/group/filter results above remain valid.
  Hosted PR/merge/CI/Pages evidence is recorded in the follow-up PR.

### M2 manual smoke regression — viewport changes with filters/Upcoming (2026-10-21)

- After the TypeBadge follow-up, the operator reported that **changing filters
  and toggling Upcoming shifts the inspected Timeline position on both Android
  phone and PC**. This supersedes the earlier provisional filter-stability
  phone pass, including the “already confirmed” language above; do not
  treat filter/upcoming stability as accepted. No other M2 defect was reported
  in this latest operator pass.
- Code-review hypothesis (not yet reproduced in a failing browser test):
  Timeline recomputes its board min/max from the plotted rows, but non-zoom
  rerenders retain numeric scrollLeft rather than the timestamp at the
  viewport anchor. A changed min therefore changes the visible date;
  shrinking max can additionally invoke native scroll clamping. Existing
  happy-dom navigation assertions check fixed scrollLeft, not inspected
  time, and do not model real scroll geometry. The implementation Work must
  verify the actual cause(s), not treat the hypothesis as proven.
- Focused fix task:
  docs/tasks/TIMELINE-READABILITY-M2-VIEWPORT-PRESERVATION-FIX.md.
  This remains **M2 follow-up**, not a new milestone; no runtime fix has
  been made in this documentation-only change.

### M2 viewport-preservation fix — automated validation (2026-10-21)

- Started from CURRENT main `2a5b2b8` (the operator's regression task, PR #33).
  **Confirmed root cause**, rather than accepting the hypothesis: both the
  mounted React regression and actual Chromium regression fail on this base.
  Filtering away the earliest game changes the board origin by 40 days;
  Chromium retains scrollLeft **1984 px**, moving the centre timestamp by
  **40 days**. The correct offset for that moment is **704 px** at 32 px/day
  and a 320 px viewport. No remount or Jump invocation is involved.
- `Timeline.tsx` now snapshots the inspected centre in the old calendar
  coordinates **before DOM mutations** (`getSnapshotBeforeUpdate`). After the
  new range/scale is laid out it restores that moment, clamped to the actual
  native scroll extent. Capturing in an ordinary post-mutation layout effect
  would lose information when a shrinking range has already clamped scrollLeft.
  This also catches a scroll immediately followed by filtering, before its
  scroll event/RAF. A temporarily empty pane retains the last real moment;
  restoration does not re-initialize. After an unavoidable clamp, subsequent
  range expansion preserves the newly inspected centre rather than bouncing
  back to an obsolete moment. Zoom uses this same single restoration path;
  initial and explicit Jump retain their 20%/25% anchors.
- Replaced the happy-dom helper's misleading fixed-pixel assertions with
  timestamp assertions, and added both-mode/multi-scale feasible/clamped range,
  hidden-update/restore and immediate-scroll coverage. Existing type-only,
  unknown-end, accessible-name and initial/Jump/zoom checks remain.
- Added a reproducible **real Chromium/CSS** fixture and runner:
  `test/helpers/timeline-browser.tsx`, `scripts/check-timeline-browser.mjs`.
  The runner's header documents invocation with an external Playwright install;
  `CHROMIUM_EXECUTABLE_PATH` optionally selects an installed Chromium binary.
  No production dependency or lockfile change. **372 checks per run**, with
  both UTC and America/New_York browser timezones: widths 320/390/768/1440,
  both modes, three scales, game/category filtering, Upcoming bounds changes,
  split/group, feed replacement, rerender, capped-origin clock/day/second
  updates, all-hidden/return, rapid scroll/filter, feasible retention, left and
  right native clamping, post-clamp expansion, centre zoom and explicit Jump.
- Bun **1.3.14**: all four required commands passed (frozen install, typecheck,
  `bun test`, build): **1098 pass / 1 optional age skip / 0 fail**, 1099 tests
  across 54 files. Existing responsive/browser sweep also passed **272
  assertions**; its old numeric-scroll check now checks the inspected moment.
  Built-app smoke passed on the current offline feed in both modes at phone
  and desktop widths, all seven games, six live unknown-end bars, no page
  errors. Build: **179 events / 7 games / 1 existing conflict**. Source reminder
  warnings are unchanged; no refresh/ingestion/data work was performed.
- Only runtime change: Timeline viewport navigation. TypeBadge, deadline/day/
  unknown semantics, IDs, preferences, personal data, Account/Supabase and
  other views are unchanged. Delivery: [PR #34](https://github.com/maxvfk/game-calendar/pull/34);
  hosted CI/merge/Pages evidence is recorded in that PR.

### M2 operator acceptance — real phone and PC (2026-10-21)

- After merged [PR #34](https://github.com/maxvfk/game-calendar/pull/34)
  was deployed through successful [main CI/Pages run 39611480568](https://github.com/maxvfk/game-calendar/actions/runs/39611480568),
  the operator re-tested on both Android phone and PC and reported that
  filtering and Upcoming navigation now work correctly, with no other M2
  defect identified. This supersedes the earlier filter failure and pending
  manual-acceptance statements above.
- The operator also observed position shifts under some combinations of
  filters that hide almost all events. Supplied desktop screenshot: only
  Genshin focus (10 live, zero upcoming), with the latest visible dated events
  ending around November 3 and the board's right edge near November 5.
  The TODAY line is no longer at the initial 25% desktop target. That
  observation is **consistent with intentional closest-edge scroll clamping**
  after the available date range contracts, rather than evidence of a new
  re-anchor to today. The screenshot alone cannot establish every preceding
  offset, but the documented contract explicitly permits such clamping,
  and browser regressions cover feasible and infeasible retention.
- Decision: **accept M2 as complete** on the basis of operator phone/PC smoke,
  PR #34's validated temporal restoration and the allowed range-boundary
  behavior. Do not extend the board with invented future dates or empty weeks
  solely to force a 20%/25% TODAY position after narrowing filters. If later
  evidence shows a jump while preservation was geometrically possible, file a
  separate reproducible defect with before/after dates and filter state.

**Next concrete step:** M2 is closed; no further M2 changes are required.
Choose the next independent prioritized project task separately from CURRENT
main. Do not start S6b, source/data research, recognition-population work, or
other milestones automatically.


## Pre-Astra UI polish — compact mobile header and wrapped filters (approved 2026-10-21)

- M2 research/M1/M2 are closed and accepted with operator phone/desktop smoke.
  A separate new mobile usability finding is **not** an M2 regression:
  permanent type filters, Focus and account/sync text consume too much vertical
  room above the Calendar on a real phone.
- The operator reviewed successive mockups and approved a single compact mobile
  header: reduced EVENTCLOCK title (no mobile live/upcoming subtitle), a
  collapsible Filters control, existing view toggle, and an account/status icon
  at the far right. The always-visible mobile account text strip moves behind
  the truthful account/status disclosure. Existing auth/sync behavior stays.
- Filters default collapsed on phone. When expanded they show **all** event
  type and enabled-game Focus choices, wrapping rather than horizontally
  scrolling, plus `Reset filters` and an explicit in-panel collapse button;
  the top Filters control is itself a toggle. An active-filter cue is visible
  even while collapsed. Reset affects **only** types + Focus, not hidden games,
  Upcoming or other preferences. `All types` select-all/clear-all is bundled
  with this same task to avoid duplicate touch points.
- **Implementation task ready:** `docs/tasks/UI-POLISH-MOBILE-HEADER-FILTERS.md`.
  This is a **standalone short UI-polish Work**, not bundled with mixed-reset
  countdown, Detail Close/Back, weekly separators, source research, artwork,
  S6b or the finished M2. No runtime code changed in this documentation step.
- **Next concrete step:** run the compact-mobile-header Work from then-CURRENT
  main; merge/deploy after required checks, then operator phone + desktop smoke.
  The unrelated small UI-fix items can follow separately.


### Compact mobile header / filters implementation — 2026-10-21

- Baseline CURRENT main `56bb3ce1c86268f4c1e9339e86ce3378bf8dc6d3`;
  bounded branch `feat/mobile-header-filters`, implementing only
  `docs/tasks/UI-POLISH-MOBILE-HEADER-FILTERS.md`.
- Below 768 CSS px the persistent account/status, counts, type and Focus rows
  are replaced by one compact header: EVENTCLOCK, Filters, List/Timeline,
  person/status button at the far right. Tabs retain accessible Checklist /
  Timeline names and existing `prefs.view` values. Real measured overflow at
  large text sizes switches tabs to named icons without shrinking their 44px
  targets; no second permanent header row. The existing desktop placements
  remain visible from 768px, with no duplicate accessible mobile controls.
- Filters are session-only component state, initially collapsed. Both the top
  toggle and explicit in-panel collapse close it; Escape restores focus to the
  trigger. The inline panel pushes content down, never auto-closes on selection,
  and wraps all Types and enabled games in the chosen order, including custom
  lanes. Zero/one enabled game gets truthful text instead of an inert chooser.
  Existing single-game Focus toggling and Next progression remain. The active
  cue has a textual accessible equivalent and selected chips use aria-pressed.
- All types clears an all-selected set, otherwise selects all. Reset changes
  only `visibleCategories` and `focusGame`; hidden/known games, order, Upcoming,
  completion/ignored settings, region, zoom, view and personal data are retained.
  Empty-result reset, partial/none/all, focused-game return and shared Checklist /
  Timeline selection are covered. Opening/closing the panel retains the same
  Timeline DOM pane and inspected time; no Jump/key/navigation code changed.
- AuthRoot still owns the same ViewState, SyncStatus and actions. Mobile account
  disclosure reuses its actual email/status/pending/last-sync/warnings and
  sign-in, sign-out, retry, and deferred setup actions. Escape/close restores
  focus; outside pointer/focus dismisses the popover. Guest is neutral with +;
  only actual synced/no-pending state gets a positive cue; syncing, pending,
  offline/network, auth/schema/error and clock warning are distinct. Established
  offline cache mode cannot show green. Account access also remains available
  during feed loading/error and onboarding. Auth bootstrap, sync engine,
  profile keys, pending mutations and first-login contracts are unchanged.
- Bun 1.3.14: frozen install, typecheck, full suite and build pass:
  **1101 pass / 1 existing optional age skip / 0 fail**, 1102 tests in 55 files.
  Focused tests mount real AuthRoot with isolated fake auth/sync transports,
  exercise existing actions and readable warnings, and verify guest profile
  isolation / controller cleanup on sign-out. No real OAuth login is simulated.
- Reproducible `scripts/check-mobile-header-browser.mjs` + its fixture add
  **384 Chromium assertions**: 320/360/390px, desktop 768/1440 fallback,
  all chips/order/custom games, empty results, exact Reset boundary, filter
  persistence, same-pane inspected-time/clamping, disclosures/focus/actions,
  all status cues, dark/light and 100%/200% root text. Production JS + actual
  AuthRoot guest bootstrap are additionally smoked at 320/1440px. Screenshots
  were visually inspected for phone widths and both themes. Existing M2 real
  Chromium regression passes **372 checks in UTC and 372 in America/New_York**.
- **Text-scaling limit, outside this task:** at 200% root text the new header
  and expanded panel fit; the pre-existing bottom game-order/settings controls
  can still widen the page. Reproduced independently on unchanged baseline
  `56bb3ce`: at 320px, `7 of 8 on · your order` extends to x=346.94px and
  `Reset to A–Z` to x=353.77px. Those exact overflows persist in this Work;
  unrelated settings were not redesigned. At ordinary text size all tested
  phone pages have no horizontal page overflow.
- Offline build retains **179 events / 7 games / 1 existing NTE Circle Bounty
  conflict**; data/snapshots/IDs, ingestion/source-health, TypeBadge, Timeline
  navigation, account storage/Supabase and other milestones are unchanged.
- Delivery: [PR #37](https://github.com/maxvfk/game-calendar/pull/37), head
  `d731387499c8458be1d7828f71021ed466bac5b4`, passed
  [PR CI 39631123805](https://github.com/maxvfk/game-calendar/actions/runs/39631123805)
  and merged as `bbff4a1c573a53dc1bbae0f3a2ac68a4ab2e2f16`.
  [Main CI/build/Pages 39631262345](https://github.com/maxvfk/game-calendar/actions/runs/39631262345)
  succeeded in all three jobs. Actual hosted test log: **1101 pass / 1 skip /
  0 fail** on Bun 1.3.14. Public index, main.js, styles.css and feed returned
  HTTP 200. Cache-busted public JS/CSS are byte-identical to the validated local
  build (JS SHA-256 `556cb1d77cb5c6bb72c3ee03b1db3c03717ab39b682b8c8250629a552bad1bf4`).
  Public feed generated `2026-10-21T16:03:56.402Z`: **179 events / 7 games /
  1 existing conflict**. This establishes deployed runtime assets, not a
  real-phone manual pass.
- **Implementation / automated checks / PR / merge / deploy are complete.**
  Final real-phone acceptance remains open and is explicitly reserved for the
  operator. Do not infer a real-device pass from Chromium screenshots.

**Next concrete step:** operator real-phone smoke on the deployed site:
collapsed/expanded filters, All types, Reset, account disclosure/status/actions,
both themes, no sideways pan at normal text, and Timeline inspected-time
preservation including legitimate closest-edge clamping. The documented
pre-existing 200%-text settings overflow remains outside this task. Stop here;
do not start the separate small UI-fix batch or another milestone.


### Mobile phone-smoke visual follow-up — 2026-10-21

- Operator reported the deployed implementation works well, requesting two
  visual refinements against the accepted prototype: a real Filters button
  filling the unused header width, and shorter rows in the expanded panel.
  Baseline CURRENT main: `33a16fe4332db00e9ad8ce2468ea610612c8e023`;
  branch `fix/mobile-filter-density`. This continues only the same UI task.
- Mobile Filters is now a bordered, labelled flex-growing button between the
  wordmark and tabs, using a funnel icon and an expanded-state border/wash.
  At 320px the funnel yields to the visible Filters label; large-text measured
  compact fallback retains its accessible name. Header/tab/account targets
  remain 44px. No extra row or saved preference was added.
- Wrapped filter chips use 32px minimum height rather than 44px, retain 6px
  separation and grow naturally with enlarged text. Horizontal chip padding
  and panel/heading/section spacing are reduced; Next is 28px high. Mobile
  visible copy becomes Login / Shop while existing full accessible names,
  category IDs and desktop labels remain. At 390px the fixture's type chips
  fit two rows; 320px fits three. Timeline bar height and navigation are not
  part of this density change.
- Frozen install, typecheck, full tests and build pass on Bun 1.3.14:
  **1101 pass / 1 existing optional skip / 0 fail**. Extended browser regression:
  **405 Chromium checks**, including bordered flex fill without unused gaps,
  visible normal-size phone label, measured 32px chips, compact-panel height,
  all existing filter/Reset/Auth-state/navigation checks, both themes and
  200% text. Screenshots inspected at 320/360/390px. Existing M2 temporal
  viewport browser regression also passes **372 checks**.
- Hosted CI/merge/Pages delivery evidence is tracked in
  [follow-up PR #39](https://github.com/maxvfk/game-calendar/pull/39).
  Final real-phone smoke of the refined button/spacing remains the operator's
  gate; the previously documented unrelated 200%-text settings limit remains.

**Next concrete step:** operator checks the refined button width and panel
density on the phone after PR #39's deployment. The PR records final hosted
evidence; this document does not claim a refined real-phone pass. No other
UI-fix or milestone is included.


### Mobile header height / aligned frames — 2026-10-21

- Operator accepted the 32px filter panel after PR #39, then supplied another
  phone screenshot requesting a shorter header and equal Filters/view-toggle
  frame heights. Baseline CURRENT main `de4bfa10ca14585d817c05e83ff045fa9cc229b4`;
  branch `fix/mobile-header-height`. This supersedes the earlier fixed 44px
  mobile-header target decision only; the accepted filter panel is retained.
- Mobile header vertical padding is 4px. Filters and the outside frame of
  List/Timeline are both **34px** high at normal text size; the tabs' inner
  buttons are 28px with 2px frame padding and 1px borders. The header is
  **43px** including its bottom border. The person trigger follows the same
  34px row; existing account-popover controls keep their prior sizing.
  Minimum heights allow enlarged text to grow; named icon fallback still fits.
  Desktop rules, filter panel, Auth/Sync and Timeline runtime are unchanged.
- Frozen install, typecheck, full tests and build pass on Bun 1.3.14:
  **1101 pass / 1 existing optional skip / 0 fail**. Browser header/filter
  checks now total **441**: explicit equal 34px frames, header <=44px,
  containment/touch dimensions, prior filters/Reset/account behavior, both
  themes and 100%/200% text. Existing M2 Chromium regression: **372 passed**.
  Actual screenshots inspected at phone widths. Final real-phone visual
  acceptance remains with the operator. Hosted CI/merge/Pages evidence is
  recorded in [PR #40](https://github.com/maxvfk/game-calendar/pull/40).

**Next concrete step:** after PR #40’s Pages deploy, operator checks
header height and equal frames on the phone. No other milestone is included.


### Remaining small UI-fix batch — scoped 2026-10-21

- CURRENT main at scope check: `c5e540c30ae9e6ed6cf5d7b51990b407b85379ac`
  (PR #40 mobile-header frame-height follow-up). `All types` select-all/
  clear-all is **already implemented** by PR #37 in the shared
  `TypeFilters.tsx`, confirmed in code. It is **excluded** from the next Work.
- Three approved open fixes: **attribute mixed daily reset countdown to the
  next-reset game(s)**, **add visible in-sheet Event Detail Close plus
  browser/Android Back-first dismissal**, and **make the Sunday-to-Monday
  Timeline grid boundary visibly stronger than ordinary daily lines**.
  The operator explicitly promoted weekly separators from assessment-only to
  **required implementation** on 2026-10-21. Use local-date/DST-safe placement,
  low visual salience under TODAY, and leave Timeline M2 viewport unaffected.
- Dedicated small Work task: `docs/tasks/UI-POLISH-SMALL-FIXES.md`.
  No runtime changes in this documentation step. Mobile-header PR #40's
  real-phone acceptance status remains separately recorded; do not silently
  infer it from this task.
- **Next concrete step:** implement all three approved fixes from then-CURRENT
  main, run full baseline + real-browser Back/navigation and week-line rendering
  regressions, merge/deploy, then operator phone/desktop smoke.


### Timeline label readability intake — approved 2026-10-21 (implementation below)

- Operator's Android Chrome screenshot in `Ending soonest` shows real event
  bars that display game + TypeBadge + urgency dot, **but no identity text**.
  Code review confirmed the `Ending soonest` fit branch in
  `src/client/state/timelineContent.ts` is all-or-nothing on measured
  `identity`; it drops titles to zero instead of truncating although a
  partial title could fit. Old `test/timeline-content.test.tsx` tests
  explicitly encode this result. No feed disappearance was established.
- New separate task `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md` specifies
  measured-width ellipsis/truncation on phones, retaining high-priority compact
  TypeBadge, truthful deadlines, full accessible names and real M2 viewport
  preservation. The previously accepted M2 all-or-nothing `Ending soonest`
  identity degradation is intentionally superseded **only for this behavior**.
- This is **docs/intake only**, not a runtime fix. Keep the currently active
  three-part `UI-POLISH-SMALL-FIXES.md` Work independent. Start new short Work
  for labels from then-CURRENT main **after** that PR is merged.
- **Next concrete step:** implement focused fit correction, unit and actual
  Chromium phone/desktop width regressions, standard checks, PR/merge/deploy,
  then final operator real-phone smoke. Do not start unrelated milestones.


## Small UI fixes — implementation and browser validation, 2026-10-21

Scope: only `docs/tasks/UI-POLISH-SMALL-FIXES.md`, from CURRENT main
`b3095d350d254bda7bef1155fffcba02c20cb56c`; branch
`fix/ui-polish-small-fixes`. **All three required fixes are implemented.**
`All types` was already complete and was not changed.

- **Daily Reset:** nearest exact computed boundary is attributed to the first
  game in user order, with `+N` for additional distinct games sharing that
  boundary. Multiple items of one game count once. Both timer and attribution
  use the same `DailyItem.resetsIn`/`now`; no rounded-string grouping or new
  reset clock. Shared clocks retain `resets in`. The row stays single-line at
  320px, with tighter heading tracking/gaps, a non-shrinking group count/timer,
  and complete game names in its accessible label/tooltip. Existing daily
  keys, chores, custom-game fallback, ticks, region/reset logic and sync stay.
- **Event Detail:** sticky in-sheet Close has a 44px target, receives initial
  focus and stays reachable after scrolling. Keyboard focus stays inside and
  returns to a connected invoker without scrolling. Backdrop/Escape still
  close. App uses one document-scoped history coordinator across profile
  remounts/StrictMode: one owned entry per open sheet, event switches reuse it,
  Close consumes it, native Back closes first, and queued rapid opens wait for
  consumption. Reload/deletion/profile teardown dismiss rather than resurrect.
  URL, base path, query/hash and foreign history state are preserved; entries
  changed by foreign navigation/OAuth-style URL cleanup are not traversed.
  History never restores an event ID. Browser Forward can visit an inert
  forward slot (the History API cannot delete it); it is neutralized without
  reopening, and subsequent opens prune the old forward tail, avoiding
  accumulating modal entries or automatic back loops.
- **Weekly Timeline lines:** existing `dayBoundaries`/`timelineX` now draw each
  local Monday midnight as a 2px `faint/60` decorative line; ordinary days remain
  1px `hairline/40`. No day widths, date labels, bar geometry or M2 navigation
  changed. Grid lines stay behind bars/labels and TODAY, with no pointer target.
  Both modes, themes, phone/desktop, zoom extremes and local DST are verified.
- **Local checks:** Bun 1.3.14 frozen install, typecheck and complete build
  pass. Final full suite (`TMPDIR=/dev/shm/game-calendar-tests bun test`): **1107 pass / 1 existing optional age skip / 0 fail**,
  1108 tests across 56 files. Focused small-fix suite also passes in
  America/New_York and Europe/Berlin. Offline feed still has **179 events /
  7 games / 1 existing NTE Circle Bounty conflict**. No source refresh, data,
  IDs, storage/auth/sync or mobile-header/filter implementation changed.
- **Real Chromium 153:** new reproducible runner + fixtures verify App history/
  focus/Close and native history edge cases, and per-cell rendering/placement
  across the week-line matrix: **61364 assertions**. Existing runners pass:
  M2 **372 UTC + 372 America/New_York**, mobile header/filter **441**. Initial
  concurrent runs hit existing test/smooth-scroll timing limits; standalone
  browser repeats pass. Plain `bun test` passed once, but later repeats hit
  existing Supabase setup / backup retention timeouts on the container overlay.
  The final full run with RAM-backed temporary files passes without changing
  any timeout, assertion or repository test configuration. This is automated browser
  evidence, not Android hardware acceptance or real OAuth sign-in.
- Visually inspected screenshots and exact matrix/reproduction notes:
  [browser evidence](evidence/ui-polish-small-fixes/README.md).
- Delivery: [PR #44](https://github.com/maxvfk/game-calendar/pull/44).
  [PR CI 39645460126](https://github.com/maxvfk/game-calendar/actions/runs/39645460126)
  passed check/build on implementation head `49044769d754e7dfbc09978a4af3331944a6a1d3`.
  Actual hosted log: ordinary `bun test` **1107 pass / 1 optional skip / 0 fail**;
  feed **179 events / 7 games / 1 existing conflict**. Pages is correctly
  skipped for the PR. The PR description records final merge/main-CI/Pages
  evidence after delivery. Final operator phone/desktop acceptance remains pending. During
  implementation, main's docs-only PR #43 was integrated without changing
  runtime/tests; its separate label-truncation task remains unstarted.

**Next concrete step:** after delivery, operator smoke on Android Chrome and
PC: mixed daily-reset attribution; Close and Back-first dismissal from both
views followed by normal Back; daily vs Monday vs TODAY contrast in both
Timeline modes/themes and min/max zoom. Confirm filtering after closing detail
retains the inspected moment, allowing existing nearest-edge clamps. Stop here;
no other milestone is started.


### Game Daily Reset clock correctness — separate follow-up noted 2026-10-21

- Operator reports that PR #44 correctly attributes the nearest daily reset
  to a game/group but that the **underlying reset times appear inaccurate**.
  This is a potential existing clock/configuration problem, **not proof that
  the new attribution algorithm is wrong**. No per-game true reset instant
  has yet been independently verified against the user's observation.
- `nextDailyReset` uses `msUntilReset` from
  `dayKey`/`nextResetMs`/`resetShiftMs`. Current default is 04:00
  server-local with fixed region offsets; Endfield has a Europe override.
  NTE/CZN retain the regional default in `GAMES`; the actual game-server
  behavior requires source/in-game verification.
- This matters beyond the displayed timer: reset clock assumptions determine
  profile-stored daily day keys, history, streaks and synchronization behavior.
  Do not simply adjust constants before reviewing storage compatibility.
- **Separate research-first task filed:** `docs/tasks/DAILY-RESET-CLOCK-AUDIT.md`.
  Audit the seven currently shipped games with dated authoritative evidence,
  DST/server mappings and migration risk; return a bounded implementation
  proposal. **No reset clock or UI runtime change is included in this entry.**
- **Next concrete step:** collect a concrete observed mismatch
  (game, selected region, displayed time and known in-game reset) and run
  this targeted audit independently of Timeline label readability Work.


## Timeline label truncation fix — 2026-10-21 (Moscow)

Scope: only `docs/tasks/TIMELINE-LABEL-TRUNCATION-FIX.md`. Baseline current
main `769c5f4`; fresh branch `fix/timeline-label-truncation`. Small UI fixes
PR #44 was already merged (`c54ec98`) and its main CI/build/Pages had succeeded
before implementation began. Independent PR #45 reset-clock audit docs remain.

- Confirmed regression on the original source: 160px measured payload yields
  **0 identity**, although **83px** remains after game + compact TypeBadge +
  gaps. New regression first failed on that source, then passed after the fix.
- `Ending soonest` now uses available width for a CSS-ellipsized identity,
  retaining game when it leaves useful title text. Otherwise game yields
  before the identity. Minimum useful text is measured three graphemes plus
  ellipsis (or a shorter complete identity), preserving emoji/combining
  sequences. `By game` keeps its existing truncation path and now uses the
  same useful-prefix floor to avoid an ellipsis alone. Compact TypeBadge
  remains higher priority; unknown `?` reservation and truthful known/day
  deadline rules remain. Full accessible names/tooltips are unchanged.
- Actual 200%-root-text Chromium geometry exposed existing rem inline padding
  disagreeing with the fixed 8px pin/intersection, squeezing sticky tails to
  x=0. Inline bar padding now stays 8px; outer bar dimensions/date coordinates,
  M2 temporal preservation, scrolling, zoom and navigation are unchanged.
- Bun 1.3.14 frozen install, typecheck, ordinary full `bun test` and complete
  build pass: **1110 pass / 1 existing optional age skip / 0 fail**, 1111 tests
  across 56 files. Offline feed remains **179 events / 7 games / 1 existing
  NTE conflict**. No refresh, feed/data/ID, metadata, Account/Sync, filters,
  reset-clock, week-line, Event Detail or unrelated milestone change.
- New real Chromium 153 runner checks measured CSS payload/visible intersection:
  **35014 assertions**, 320/360/390/768/1440px, both modes/themes, 100%/200%
  text, 6/32/72/108px per day, now and known-end tail offsets. Long/short
  fallback and one/multiple subjects, custom game/event, conflict/urgency,
  exact/day/unknown and upcoming cases are covered. It observes 1194 truncated
  identities, 110 game-width reclamations, 372 full deadlines and 2104 tiny
  tails, checking containment, badge priority, useful text and no overlap.
- Existing Chromium suites also pass unchanged: M2 temporal viewport **372
  UTC + 372 America/New_York**; mobile header/filter **441**, including the
  built production bundle and actual AuthRoot guest bootstrap.
- Visually inspected screenshots and reproduction:
  [browser evidence](evidence/timeline-label-truncation/README.md). Automated
  Chromium evidence does not constitute Android hardware/PC operator acceptance.

- Delivery: [PR #46](https://github.com/maxvfk/game-calendar/pull/46); final
  hosted CI/merge/Pages and public-asset verification are recorded in that PR.

**Next concrete step:** after PR #46 delivery, operator Android Chrome/PC smoke: long labels and short
tails at several zooms in both modes, badge/indicator separation, full detail
names, and existing inspected-time behavior. Stop after this scope.
