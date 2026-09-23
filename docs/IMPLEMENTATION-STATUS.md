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
  Endfield robots redirect is pending. Run 35801291192 isolated a same-origin
  307 to `/en-us/robots.txt`; a final bounded follow-up will check its rules.

## Next concrete step

Collect and classify the five Actions probe results, including official
Endfield notice 5208, under the robots/API policy. Integrate its missing events
only from verified boundaries; then implement usable automatic sources one at a
time. Fix any confirmed false freshness or day-boundary behavior before M5.

No additional automatic source beyond NTE/CZN/wiki.gg has passed the new
Actions probe yet. Game8 and Fandom availability remains constrained as
recorded in the one-game reports. The reviewed source disagreement for NTE
Circle Bounty is still open and displayed to users.
