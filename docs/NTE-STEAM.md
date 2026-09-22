# NTE official Steam ingestion

Checked 2026-09-22. Perfect World reviewed records remain priority 100;
`nte-steamnews-official` is priority 20; Game8 is legacy priority 0.

## Transport permission

Valve documents the public, unauthenticated
[GetNewsForApp/v2](https://partner.steamgames.com/doc/webapi/ISteamNews) method.
[Steam Web API terms](https://steamcommunity.com/dev/apiterms) permit API integration
and presentation of Steam data, subject to their conditions and request limits.
The API host's robots.txt says `User-Agent: * / Disallow: /`; this prevents treating
the host as a crawlable website, not use of the explicitly documented API.
The runner distinguishes this one exact method/query/source from web crawling.
There is no generic `ignoreRobots` flag or JSON-wide exemption. The six-hour
interval, descriptive User-Agent, conditional requests and failure gates remain.
No API key, private endpoint, account data or user tracking is used. Events retain
the specific Steam publication URL, not the transport URL. The application is
independent of Valve and the publishers; data is provided as-is without warranty.

## Captured evidence

`fixtures/nte/steamnews-official-2026-09-22.json` is the unmodified successful
response fetched in Work on 2026-09-22 with appid 4508340, count 50, maxlength 0,
feeds steam_community_announcements. It contains 20 posts (count is a maximum).
This is not search-rendered content and is not represented as an Actions capture.

The parser reads section headings before period fields, preserves board/Arc
names, rejects schema drift and excludes previews, social posts and permanent
unlocks. A literal publication year is required; yearless standalone guides are
skipped while their dated patch-note sections supply coverage. Scheduled
maintenance end is never a banner launch timestamp. Server time remains day
precision. Duplicate official posts are resolved before merge; conflicting exact
boundaries fail parsing for review.

## Review condition found in the real response

Steam publication `1840944183787941` gives Version 1.3 Circle Bounty an end of
September 30, 23:59 UTC+8 (`2026-09-30T15:59:00.000Z`). The existing Perfect World
reviewed record gives September 29, 23:59 UTC+8 (`2026-09-29T15:59:00.000Z`).
The fixture and parser preserve the source's words. Reviewed remains preferred,
with its original ID, end and Perfect World URL. This is an unresolved source
disagreement, not evidence to silently rewrite reviewed data. The general merge
tolerance is 24 hours and would not flag precisely 24h, so the discrepancy is
explicitly pinned in the source test and recorded here for review.

## Remaining stages

NTEBuild Beyond the Rails and Prydwen CZN banners require their own real GitHub
Actions HTML captures and robots decisions before implementing their parsers.
They are not covered by the Steam API access policy.
