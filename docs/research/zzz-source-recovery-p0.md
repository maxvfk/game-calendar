# ZZZ P0 — actual runner source gate

**2026-10-27 (Moscow); baseline main `ffe2356`; verdict: BLOCKED for the full
unattended events + banners milestone. Gate B was not started.**

This verdict applies to the tested surfaces and the contract in
`docs/tasks/ZZZ-SOURCE-RECOVERY-P0.md`. It does not assert that every possible
publisher surface is inaccessible. Steam is accessible and useful for events;
it does not currently contain the phase notices needed for complete recovery.
The #105 reviewed hotfix remains the current production coverage.

## Runner evidence

Both captures ran on GitHub-hosted Ubuntu 24.04.5 in Azure eastus with Bun
1.3.14 and the actual refresh User-Agent:
`gacha-event-tracker/1.0 (+https://github.com/maxvfk/game-calendar)`.
No browser identity, catchSpider, undocumented endpoint, captcha/challenge
handling or robots override was used. Requests were bounded and spaced by at
least two seconds per website. Mobile content was a distinct follow-up sample;
the desktop/news/Steam content was not requested again in that follow-up.

| Capture | UTC interval | Run / job | Evidence |
| --- | --- | --- | --- |
| Desktop + Steam | 2026-10-26 23:18:36–23:18:54 | [40418840773](https://github.com/maxvfk/game-calendar/actions/runs/40418840773) / [121907829163](https://github.com/maxvfk/game-calendar/actions/runs/40418840773/job/121907829163) | `docs/evidence/zzz-p0-gate-a-2026-10-27.json` |
| Mobile | 2026-10-26 23:20:29–23:20:38 | [40419057435](https://github.com/maxvfk/game-calendar/actions/runs/40419057435) / [121908574051](https://github.com/maxvfk/game-calendar/actions/runs/40419057435/job/121908574051) | `docs/evidence/zzz-p0-mobile-gate-a-2026-10-27.json` |

Raw HTML/XML/JSON was downloaded and inspected from the first runner artifact,
not substituted with web-search rendering or a locally fetched page. Artifacts
12696271497 and 12696816265 expire after seven days. Their ZIP hashes and all
response hashes remain in the committed evidence, together with the exact URLs,
status, content type, redirect location, bytes, validators and shape metadata.
The first probe's `shape.html` is a markup heuristic: it also returns true for
RSS XML. The recorded MIME type and inspected RSS are XML, not HTML. The retained
probe now distinguishes HTML tags explicitly. This does not change the captures.
No full copyrighted announcement or new production fixture is committed.

## Direct official site: permitted, but no usable discovery/content

Robots URL: <https://zenless.hoyoverse.com/robots.txt>.
Both runners receive **404 application/xml**, nine-byte `Not Found`, no redirect.
Under the existing RobotsCache policy, an absent robots file permits the public
paths; there was no robots refusal to bypass.

Desktop index <https://zenless.hoyoverse.com/en-us/news> and detail IDs
166963 (version update), 166926 (Phase I), 166946 and 167038 (event details)
all return **200 text/html**, no redirect, **8,184 identical bytes**:

- SHA-256 `ad5f5d7f9ae0942fdb68ef458d6d8a12b27eeb5f45a4515d7830d9ad5eab60a1`.
- ETag `W/"a317eb801d178f344fbbef7ad3e3eb86"`;
  Last-Modified `Thu, 15 Oct 2026 11:56:13 GMT`.
- Nuxt loading div, 15 script tags, config-only `window.__NUXT__`;
  no article payload, dated event duration or `/en-us/news/<id>` link.
- The index conditional GET using both offered validators returns **304**.
  This confirms the unchanged SPA shell, not that news announcements are fresh.

Mobile <https://zenless.hoyoverse.com/m/en-us/news> and mobile detail IDs
166963 / 166926 produce exactly the same bytes, hash, ETag, MIME and no redirect;
the mobile conditional index GET is also 304. There is no compliant raw-HTML
news discovery demonstrated on either route. Known IDs were probe samples only,
not proposed discovery seeds. Reverse-engineering the JS API or changing the
User-Agent to trigger a crawler variant was deliberately not attempted.

## Alternative official family: Steam publisher distribution

Identity was checked against the [Steam store listing](https://store.steampowered.com/app/4162040/Zenless_Zone_Zero/)
and the [publisher announcement index](https://steamcommunity.com/app/4162040/announcements/).
The runner then independently fetched the publisher feed, rather than trusting
search snippets as transport evidence.

| Surface | Robots/access | Actual runner response | Discovery/content result |
| --- | --- | --- | --- |
| `steamcommunity.com/app/4162040/announcements/` | robots 200; `*` blocks only `/actions/`, `/linkfilter/`, `/tradeoffer/`, `/trade/`, `/email/` | 200, text/html UTF-8, 173,000 bytes; no redirect or validators | Current publisher announcements rendered; version/event content is present |
| `steamcommunity.com/games/4162040/rss/` | same rules, permitted | 200, text/xml UTF-8, 132,852 bytes, Last-Modified offered; no redirect | RSS carries publication identities and full current patch note; new posts can be found without manual article IDs |
| `api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4162040&count=50&maxlength=0&feeds=steam_community_announcements` | exact documented API contract, not HTML crawling | 200, application/json UTF-8, 116,876 bytes; no redirect or validators | 12 publisher posts, June–October 2026, including version 3.0–3.3 updates |

API robots itself returns 200 and `Disallow: /`. This is **not** treated as a
host-wide scraping permission. The separate explicit
[GetNewsForApp contract](https://partner.steamgames.com/doc/webapi/ISteamNews)
and [Steam Web API terms](https://steamcommunity.com/dev/apiterms), rechecked
on 2026-10-27, permit use of this documented public method; see the established
distinction in `AGENTS.md` and `docs/NTE-STEAM.md`. Production Steam allowlisting
is unchanged and still NTE-only. A future ZZZ implementation could use permitted
community RSS and avoid expanding the API exception altogether.

The returned Version 3.3 publication `1847286114026951` contains **eight**
event-local duration fields and the explicit version start/end. It contains
new-agent/banner names, but **no current Phase I channel notice, no phase
11:59 deadline, and neither current rerun banner (Graceful Gale / Joyau Dore)**.
All 12 returned posts were inspected; their titles are in the metadata.
Historical mentions of those names in Version 3.0 cannot establish a Version
3.3 period. RSS/HTML are alternate renderings of the same publisher posts,
not independent evidence for missing dates. A costume sale start, compensation
expiry, maintenance duration or historical phase cadence cannot fill the gap.
The trial row's current phase period is not supplied either.

**Conclusion:** discovery and eight current event periods are genuinely usable;
unattended complete events + four distinct dated banners is not demonstrated.
Implementing a Steam event parser and declaring P0 recovered would hide this
remaining failure. No production parser was added under this all-or-blocked gate.

## Existing pipeline, health and preservation

- `zzz-game8-events` remains `scheduled: false`; no new Game8 requests. Its
  historical Actions HTTP 202/CloudFront failure is already established in
  `docs/research/coverage-zzz.md`, not reclassified as parser-zero.
- Latest pre-hotfix actual refresh [40406414769](https://github.com/maxvfk/game-calendar/actions/runs/40406414769)
  used the same UA, confirmed 7/8 active sources, and built `reviewed-zzz: 17`;
  there was no ZZZ automatic source outcome. Its standing broken-source warning
  belongs to another existing source, not proof that ZZZ is healthy.
  The current main after #105 builds 30 ZZZ reviewed rows.
- `SourceParser`, `ADAPTERS`, refresh, SnapshotStore, RobotsCache, `mergeEvents`,
  reviewed materialization and their tests were inspected. No production
  code, snapshots, source priority, event IDs or provenance were changed.
  Outage/LKG, template-drift, parser-zero and drop guards retain existing behavior;
  this PR does not claim to have exercised a nonexistent new ZZZ source in refresh.
- Coverage at first capture (`2026-10-26T23:18:35.990Z`) before/after: **30 total
  reviewed rows, 8 banner rows across versions, 14 unexpired (8 active,
  6 upcoming)**. Version 3.3 contributes #105's 13 rows: 8 events, 4 banners,
  1 trial. All 30 row IDs are unique. Automatic ZZZ adapters: **0 → 0**.
  Full local feed: 193 rows across seven games, same existing NTE conflict.
  This build retains historical feed rows; 30 must not be described as 30
  currently active events. Shiyu/Deadly historic rows remain unprojected.
- Main was `ffe2356` (#106), its CI/Pages run 40413220904 passed. The only open
  PR before this Work was the parked AI plan #68; no parallel P0 was present.

## Safe fallback and next concrete step

For the existing production contract, retain #105 and use the existing reviewed
channel for newly announced dated phase notices. Preserve per-row source URL,
verification time, stable IDs and region deadlines; no automatic future phase
or endgame generation is authorized by these observations.

Recommended bounded follow-up: explicitly split recovery into **Steam official
events-only ingestion** plus visibly reviewed-only banners, with the same
LKG/zero guards, deterministic version-local sections, current-ID merge replay
and an actual nonempty Actions refresh. The captured 3.3 post demonstrates that
all eight event periods are available, so this is a concrete partial fallback,
not a claim of restored banners. Do not silently broaden this P0 verdict into
that implementation. Full Gate B instead requires a supported official news
feed/rendered surface that actually includes dated channel notices; once one
is available, repeat a bounded real-runner access gate before implementation.
No automatic source-availability watcher or second scheduler was created.

## Validation and delivery

Local Bun 1.3.14: frozen install, typecheck, full build PASS; **1297 pass,
3 existing age-dependent skips, 0 fail**, 68 test files. Initial PR
[CI 40418841107](https://github.com/maxvfk/game-calendar/actions/runs/40418841107)
passed typecheck, full suite/feed, PG17 concurrency/encrypted-recovery drills
and site build. PR [#107](https://github.com/maxvfk/game-calendar/pull/107)
records final-head CI, review and delivery. A green evidence workflow means
capture succeeded; it does **not** mean Gate A passed or ingestion recovered.
The retained probe workflow is manual-only, read-only and unscheduled. It
requires an actual Actions environment and fails on an invalid probe round;
operators must respect the six-hour interval for repeated content probes.

**STOP:** Timeline M4/v1/v2/E2a, E2b–E4, Account/Sync and unrelated ingestion
remain unchanged. BLOCKED evidence is the P0 deliverable; automatic ZZZ source
recovery remains unresolved.
