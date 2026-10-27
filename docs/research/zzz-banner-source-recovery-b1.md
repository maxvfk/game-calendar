# ZZZ B1 banner source gate — 2026-10-27

Baseline main `3585bbe` (#111), no parallel B1 PR; only parked draft #68 open.
#105/#107/#109/#111 and their source/merge/health/refresh tests were inspected.
**Gate A: PASS for Zenless.gg Updates RSS, secondary reproduction only.**
Gate B is limited to directly dated channels in this feed. No speculative 3.3
Phase II, no inferred trials, patch-half dates or changes to Steam/endgame.

## Actual runner evidence and access

Project UA throughout: `gacha-event-tracker/1.0 (+https://github.com/maxvfk/game-calendar)`.
GitHub-hosted Ubuntu, ordinary HTTP, >=2 seconds per host, no browser identity,
challenge/captcha handling, robots overrides, private APIs or login. The old P0
HoYoverse desktop/mobile URLs were not requested again. Native HoYoLAB is a new
surface. Captures are finite research, not a new scheduler.

- [Candidate probe 40508820070](https://github.com/maxvfk/game-calendar/actions/runs/40508820070),
  artifact 12735359947, ZIP SHA-256
  `52f250487f141039174242ab4351be71073cf43300cee150c8b406b0bf249b5d`.
  Metadata: `docs/evidence/zzz-b1-gate-a-2026-10-27.json`.
- [Discovered RSS probe 40509703766](https://github.com/maxvfk/game-calendar/actions/runs/40509703766),
  artifact 12735569765, ZIP SHA-256
  `b617a5165c91d4df6293015c2ccdd676c4bbb859931921d35b7417bdcd744ddd`.
  Metadata: `docs/evidence/zzz-b1-rss-gate-2026-10-27.json`.
  This followed only new URLs linked by the first index. Same-UA robots was cached
  for six hours from the first capture, not assumed after a refusal. Raw bodies
  were downloaded from both runner ZIPs and inspected offline; seven-day artifacts
  retain them, permanent evidence retains response hashes and structural facts.

All captured content responses were HTTP 200, with no redirects. A successful
probe workflow means capture succeeded, not that every candidate passed.

| Candidate | Runner result / discovery | Content/permission verdict |
| --- | --- | --- |
| Official HoYoLAB `/official/8/notices` + `/article/47131668` | robots 200, permits these paths; each HTML 7,213 identical bytes / same SHA; Nuxt shell, no article links/body | BLOCKED native HTML; search indexing does not establish runner ingestion. No undocumented bbs API used. Prior official desktop/mobile P0 verdict retained. |
| Zenless.gg `/news/` + current notice | robots 200; index 419,626 bytes; detail 365,679 bytes; index links both 3.3 I and 3.2 II, plus native RSS | PASS for project RSS access and factual secondary notice extraction, subject to access/reuse limits below. |
| Icy Veins `current-banner` | robots 200 allows path; HTML 464,559 bytes; tables separate Agent/W-Engine, new/rerun, I/II and history | Reachable but rejected as canonical: 3.3 server-labelled start Oct 20 disagrees with official update day Oct 21; Europe/Americas countdowns both say Nov 11 12:00 UTC, inconsistent with distinct regional 11:59 ends. Phase II Dec 1 03:59 also differs from Poly's 14:59. No independent current 3.3 II notice located. |
| rng.moe `/en/timeline`, credits/privacy | robots 200, no operative restrictions/content-signal values; HTML 72,461 bytes, obfuscated display text, pixel widths/countdowns; no structured event dates or documented feed/repository link | Does display separate four channels, but raw SSR has no stable dated notice payload. Svelte data is `[null,null,null]`; no build chunks/private APIs reverse engineered. Cached default view is Asia and includes old events. Region selector alone is not three-region evidence. |
| Poly Cal `/calendar` + home | robots 200 allows HTML/static, disallows `/api/` (not requested); SSR HTML 136,090 / 130,798 bytes, Next rendering payload | Paired Agent phase cards, no distinct four W-Engine/Agent identities; 3.3 II is not independently sourced and regional clocks are absent. Generic 42-day/21-day FAQ cannot prove dates. No linked public feed/repository/license was found. |

Public-repository discovery used GitHub repository search for `zzz-poly-cal`,
`rng.moe`, `rng-moe`, `zzz timeline`, `zzz polychrome`, `zenless calendar`,
plus site credits/footer and targeted web searches. No repository was established
as the source of either operator-proposed site. `Grabrun/MoeRNG` is an unrelated
random-image service; `Kaioru/polychrome-engine` is daily check-in automation;
`JumpSteve2008/zzz-timeline` is an unrelated static calendar last pushed July 2,
without a demonstrated relationship or feed/license contract. None was imported.
This is a bounded negative finding, not proof that private/unindexed repos do not exist.

## Selected source and permission boundary

<https://zenless.gg/news/updates/feed/> is explicitly advertised as RSS on the
linked Updates category. Actual runner: **200 application/rss+xml UTF-8, 199,444
bytes, 40 items**, Last-Modified and ETag offered. Five dated channel notices:
3.3 I, 3.2 II, 3.2 I, 3.1 II, 3.0 II. Native full `content:encoded` contains
channel sections and periods; 3.2/3.3 update notices contain explicit update days.
The broader News RSS also works (40 posts / 150,902 bytes) but has shorter
channel retention; it is not needed as a second production source.

Robots wildcard rules allow the selected RSS and notice URLs for the project
product token; they separately disallow named AI/search agents. No identity
change to evade a challenge is involved: the deterministic project fetcher uses
its long-standing declared UA, not a browser/search crawler identity. Re-read
robots every normal refresh; a new refusal must fail closed. Do not reuse this
finding as permission for an AI crawler, other paths or private APIs.

The current [Terms](https://zenless.gg/terms/) (dated February 25, 2024) reserve
original-content/IP rights and do not grant a blanket republication license.
They do not prohibit ordinary consumption of this explicitly syndicated RSS by
this project token. Older indexed item pages exposed additional restrictive
content-use modal wording; it was absent from the actual current Terms/notice
captures. This is not treated as permission to mirror their articles or databases.
Production persists **only extracted factual schedule records and original
response hash/length**, not entire article prose/assets. Raw captures remain
short-lived diagnostics. Attribution stays Zenless.gg/secondary; no content is
relabelled official merely because it links HoYoverse. If terms/robots withdraw
this factual-feed use, stop refresh and retain reviewed/LKG coverage.
Icy Veins' [Terms](https://www.icy-veins.com/terms) were also read on the runner;
access is not its main blocker here, data contradictions are.

## Date and identity contract

- Each notice is discovered dynamically from RSS title/link, not numeric IDs or
  a hard-coded version list. Distinct named Signal Search channels remain distinct.
  3.1 selectable rerun channel sections must not be lost or mistaken for one new
  Agent; retain their actual channel identities/explicit featured subjects.
- First-phase `After Version X Update` uses only the corresponding version's
  explicit `[Update Start Time]` calendar date in the same feed. Start is day
  precision: do not add the stated maintenance estimate to invent completion.
  Missing update reference rejects the capture, rather than borrowing another
  version or the wall clock. Explicit second-phase starts retain the existing
  schema's server-day precision (three separate start instants do not fit one row).
- Example current 3.3 I: start day October 21; end November 11 **11:59 server**.
  Asia `2026-11-11T03:59Z`, Europe `10:59Z`, America `16:59Z`. Matches all four
  #105 reviewed IDs/boundaries; exact ends use fixed UTC+8/+1/−5, never viewer DST.
- 3.2 II explicitly says September 30 **12:00** → October 20 **14:59** server;
  do not replace 14:59 with a customary 03:59. Its period matches the separately
  captured detail, independent of the current phase notice. 3.0/3.1 II likewise
  supply their own complete year/date/clock, not calculated patch ends.
- The current notice's canonical link is official `.../166926`, but the adapter
  cites the actual Zenless.gg notice and uses **estimated**, confidence <=0.8,
  with explicit secondary summary. All superior official reviewed rows win,
  without artificial confidence inflation from a copied notice.
- No 3.3 II channel notice is present. Icy/Poly projections do not authorize it.
  Trials are excluded from this adapter even though some notices have a separate
  audition section; no trial is synthesized from a banner window.

## Operational limits / fallback

The publisher-independent mirror can be late, incomplete or wrong. Detect
malformed/zero/partial channel sets, missing dates/update anchors, duplicate or
contradictory notices, stale unexpired coverage and disappearing still-live IDs.
Retain the existing refresh six-hour floor, conditional requests, sharp-drop,
outage/LKG and source-health warnings. Source-health confirmation is not a claim
that a mirror has published every new announcement. New patch/phase without
matching current supported channels must fail visibly rather than borrowing
historical periods. Source corrections conflicting with reviewed dates go to review.

Sustainable fallback: operator checks the official in-game/HoYoLAB phase notice
before each transition; independently verifies all four names and each server
end; adds/updates the existing reviewed channel with exact source/check times
and stable opening-day IDs. Preserve valid old rows and never project Phase II.
Use feed health/expired coverage warnings to trigger that review; no new alert
scheduler or message to a third party is authorized by this milestone.

Gate B production refresh, counts, tests and delivery are recorded below after
validation. **STOP after B1; no summaries or other milestone.**
