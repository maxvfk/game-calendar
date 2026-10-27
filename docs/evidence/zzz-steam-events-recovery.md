# ZZZ Steam events-only recovery — E1

**Implemented from main `e32cd62`, after #105/#107/#108.** This restores
unattended limited-time **events**, not dated banner or trial ingestion.
Implementation PR: https://github.com/maxvfk/game-calendar/pull/109 .

## Source, discovery and transport

- Source ID `zzz-steam-events-official`; parser `zzz-steam-rss`; priority 20.
- Stable URL: https://steamcommunity.com/games/4162040/rss/ . It is the official
  app-specific publisher distribution already verified in #107. Each refresh
  reads the RSS items, not a hand-maintained article-ID list. The actual captured
  RSS has ten items, including four Version 3.0–3.3 update announcements.
- Ordinary RobotsCache gate; the path is permitted by the real Steam Community
  robots rules captured in #107. No expanded Steam API allowlist, undocumented
  endpoint, browser identity, `catchSpider`, challenge handling or access override.
- Uses existing `ADAPTERS`, SourceParser, sanitizer, SnapshotStore and normal
  refresh workflow/schedule. Six-hour minimum interval and offered validators
  apply. XML requests now advertise RSS/Atom/XML MIME types; the existing exact
  GitHub Contents transport still takes its previous raw-media branch.
- RSS app/channel/language, publication URL and matching permalink GUID are
  checked. Item URLs must belong to the same app-specific announcement path.
  Authors and publication dates are retained in discovery metadata: `Overtimeboo`
  for 3.0/3.2/3.3, `shijie.hong` for 3.1. Handles are attribution, not an invented
  immutable publisher credential. Events cite the exact Steam announcement URL;
  Steam numerical IDs are never converted into guessed HoYoverse article URLs.

## Parsing and identity contract

Only complete version-update announcements with matching title/body version
are supported. Previews, special programs, account help and store posts do not
become calendar events. Recognisable but unsupported update-title drift throws
instead of being hidden by older parseable updates in the same feed.

Within each update, extraction is bounded by the numbered `New Events` heading
and the next numbered section, then by individual bullet headings. Each event
requires its own unique duration field. Gameplay unlocks, cosmetics, compensation,
channels, auditions and endgame phase descriptions outside that section cannot
lend their clocks to an event. The captured 3.1 external referral/prize campaign
is excluded using its explicit invitation text. No full article text is emitted
into `summary` or other public event fields.

- Explicit server-local starts keep **day precision**: the schema has no
  region-specific starts. After-update starts use the *same article's explicit
  update calendar date*, never a promised maintenance completion instant.
- Explicit server-time ends map to Asia UTC+8 / Europe UTC+1 / America UTC−5;
  `endsAt` is the Asia instant and `regionEnds` contains all three deadlines.
  Fixed server offsets are not replaced with local daylight-saving timezone rules.
- UTC+8 ends are exact and global. `End of Version X` resolves only against the
  literal same-version end clause in that article, never an assumed 42-day cycle.
  Year, valid calendar date, clock and zone must be explicit. Unsupported,
  ambiguous, missing or reversed periods reject the candidate snapshot for review.
- Uses unchanged `eventId("zzz", title, startsAt)`. Confidence 0.9, official
  provenance, parser extraction. Priority-100 reviewed records with confidence 1
  remain the final winners. No special matching aliases or merge rules were added.
- Equivalent same-ID duplicate notices collapse deterministically; changed
  boundaries for a same-ID official duplicate throw. Cross-source official
  disagreements still use the existing merge conflict reporting.

## Actual Actions refresh and counts

[Run 40426199820](https://github.com/maxvfk/game-calendar/actions/runs/40426199820),
[job 121932457530](https://github.com/maxvfk/game-calendar/actions/runs/40426199820/job/121932457530),
UTC **2026-10-27T00:24:39.002Z** (03:24 Moscow), Bun 1.3.14, normal project UA.
It executed `bun run refresh --only zzz-steam-events-official` with **no force
or access override**, then the actual full feed build and winner assertions:

| Stage | Result |
| --- | --- |
| HTTP / snapshot | 200; 132,852-byte RSS/XML; UTF-8; Last-Modified offered |
| Discovery | 10 publisher posts, 4 supported version updates; numerical IDs discovered from item URLs |
| Normalized parser candidates | **43**: 3.0 = 12, 3.1 = 12, 3.2 = 11, 3.3 = 8 |
| Exact-ID reviewed intersections | **19**, all dates/precision/region ends agree, including all eight #105 event rows |
| Published ZZZ winners | **54**: 30 unchanged reviewed + 24 automatic historical records, no duplicate IDs |
| Unexpired ZZZ coverage at capture | **14 → 14** (8 active + 6 upcoming); all existing reviewed winners |
| Whole feed | **193 → 217**; seven games; existing NTE date conflict unchanged |
| Refresh health | **1/1 confirmed**, 1 changed, 0 warnings, 0 broken/newly broken |

This is genuine nonempty automatic parsing even though current reviewed rows
supersede every unexpired Steam event. The 24 additional winners are expired
historical events from 3.0/3.1, not newly discovered current gameplay. Future
supported update notices can enter the feed without reviewed rows or a code/ID
edit. A synthetic new 3.4 post proves that branch offline in addition to the
four actual discovered notices; it is never published as real data.

Durable runner proof: `docs/evidence/zzz-steam-events-refresh-2026-10-27.json`.
Raw snapshot and metadata were downloaded from artifact **12699547969** and
committed unchanged to `snapshots/zzz-steam-events-official.xml` / `.meta.json`.
RSS SHA-256: `d6e0a47c616546449e8e630d1c83fc32e31fe2ca044f5147ea60f22965d18d1c`.
Artifact ZIP SHA-256:
`0f0de6cef81f179e51bffcb98ec13f030f93a39a834e1750976dfca5bcb8bd79`.

The temporary read-only PR validation workflow is removed from the final tree;
there is no second production scheduler. It saved state without changing
unrelated snapshot bytes, but a PR-scoped cache is not available to main
([GitHub cache restrictions](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache)).
A source-specific interval bootstrap therefore uses the committed successful
capture time when ZZZ state is absent and the matching snapshot body exists.
The first main poll cannot occur before 2026-10-27T06:24:39.002Z; no timestamp
is relabelled as a new network confirmation. Wrong-URL or missing bodies do not
activate this fallback; other adapters retain their previous interval behavior.
Future polling belongs to the existing refresh workflow. A final
parser hardening rejects title/version-prefix drift; offline replay of the exact
runner bytes confirms the same 43 candidates with the final code.

## Failure behavior and tests

Uses the existing refresh gates for robots denial, template/parse failure,
zero, disappearance of still-live IDs after a sharp drop, transient HTTP outage,
conditional 304 and health recovery. Bad responses never overwrite LKG bytes;
three consecutive failures become visibly broken under the existing policy.
RSS has no explicit no-events declaration, so empty parsing is never treated as
proof of a quiet calendar. Reviewed rows remain available independently.

Fourteen focused offline tests cover the actual RSS factual excerpt, four versions,
future discovery, year/calendar/zone/section boundaries, global version end,
no banner/trial/recurrence generation, deterministic duplicates, all 19 exact-ID
reviewed matches, all 30 reviewed winners and integrated real-adapter refresh
safety. A full-feed subprocess replay freezes time and proves every unrelated
event, source and conflict unchanged. Factual test excerpts are documented in
`test/fixtures/zzz/README.md`; they do not serve as production fixture fallback.
The WuWa golden feed hash only changes for the newly registered unavailable
ZZZ source-health row in that isolated build. Removing that row reproduces the
original exact golden bytes; its Timeline queue/agent-input hashes stay unchanged.

Local frozen install/typecheck/full tests/build pass: **1311 pass, 3 existing
age-dependent skips, 0 fail**, 69 files. Final-head CI/PG17/Pages delivery is
recorded on PR #109; no runtime registry/editorial/Account change is included.
All 30 reviewed JSON rows, event IDs, review timestamps and official URLs are
byte-for-byte unchanged; existing snapshots for other games are unchanged.

**Next concrete step:** `docs/tasks/ZZZ-BANNER-SOURCE-RECOVERY.md` in a separate
Work. Banners and current trials remain reviewed-only. This milestone does not
resolve all ZZZ source coverage; it does not start banner research, Timeline v2,
Event Context summaries, Account/Sync or Shiyu/Deadly recurrence generation.
