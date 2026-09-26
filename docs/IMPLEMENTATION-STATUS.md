# Game calendar implementation status

Updated 2026-09-25. Follow `docs/tasks/SOL6-IMPLEMENTATION-HANDOFF.md` for the
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
  Bounty conflict. Authenticated production smoke remains manual with a
  disposable Google test account.

Next concrete step: S5, after the separate authenticated S4/S4.1 smoke.
S4.1 did not add ongoing sync, an ordinary-edit outbox, or status UI.
