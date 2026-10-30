# Endfield regression evidence (test-only)

These compact HTML extracts retain the original schedule headers, links, timer
attributes, regional periods and cycle table markup, omitting images and unrelated
page content. Dates/labels are not synthesized. They are outside `fixtures/` and
`snapshots/`: the production feed/refresh cannot use them as a fallback.

Historical captures come from **this repository's** independently acquired
snapshots at commit `2af2508`, not the upstream tracker:

| File | Original URL | Full captured body SHA-256 |
| --- | --- | --- |
| `events-2026-09-24.html` | https://endfield.wiki.gg/wiki/Event | `86c0c521f66a6b068f24a6cb622a12ad0390f3da806f326f332fd7d1a95121cb` |
| `illusion-2026-09-24.html` | https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Illusion | `4987e7605579ea02171b141f1d40f36c25f945fd37ce6c985417788c5021b6dd` |

Live captures on 2026-10-17, using the repository's descriptive User-Agent after
reading https://endfield.wiki.gg/robots.txt (HTTP 200; `User-agent: *` permits `/`):

| File | Original URL | Full captured body SHA-256 |
| --- | --- | --- |
| `events-2026-10-17.html` | https://endfield.wiki.gg/wiki/Event | `6577ac521bc2bcd69b0101518dd6006fa680c654848dc74f15923257ef4d279d` |
| `phantasia-2026-10-17.html` | https://endfield.wiki.gg/wiki/Echoes_of_War%3A_Season_of_Phantasia | `8c4233827fd881ea5a0690873f6b31279d66c1ca772493e81cab6efbb518d137` |

Both live requests returned HTTP 200. The Phantasia response at 21:55:28Z has
`Last-Modified: Sat, 17 Oct 2026 11:18:55 GMT`. It is intentionally **invalid**
input: the west season starts Oct 15 23:00 UTC-5, while Cycle I starts Oct 15
12:00 Server Time. The regression must reject it, not repair its dates.

Attribution: Endfield Talos Wiki contributors, wiki.gg, source page links above;
CC BY-SA 4.0 as stated in the captured wiki footer. These are schedule/markup
excerpts only. Historical tests are pinned so routine production snapshot turnover
cannot replace an Illusion fixture with Phantasia and invalidate its assertions.

Official Shadow Marked verification is documented in
`docs/research/endfield-recurring-endgame.md`, section 16. Official article HTML
is not republished here.

## October recovery and source turnover

`events-2026-10-28.html` pins the eight `mp-event` blocks of this repository's
snapshot at `fc2e7f83abc8f7f1fa7a2f8c276a90cbd2036698`, last confirmed Oct 28.
Full body SHA-256: `95a768868632191ee012b1a5399b7e8db607123e1a37344f2a89cd43a7306b3a`.
Extraction retains each block through its closing timer `</ul>`, removes only
`<img>` tags and closes its outer `<div>`; all names, links and timer attributes
are preserved. Extract SHA-256:
`78f464084cf532aad0a5b8f6401fc0f2ab9d2f574bc21893e80dcd54a5eb898f`.
Historical rescue tests must use this fixed input, not the changing live snapshot.

`contingency-readiness-2026-10-29.html` uses the same extraction for the newly
added Contingency Readiness block at `d4cfba000fe19f2ee74b183ddd463494e578f477`.
Full body SHA-256: `1ddebe941623110fe1e258cf48d5053e08bef9543e4f9f5254197b890a802d37`.
Extract SHA-256: `247a01c2113dc7e625517963cd4c8e06473f02e9fd3d8ad2409d05dfdb0da814`.
Its earliest opening is Oct 28 20:00 UTC, while the existing reviewed identity
uses the Oct 29 server-calendar day. The turnover regression proves these merge
into the existing reviewed ID with unchanged regional ends and other winners.
Same original Event URL and attribution as above; no new request or source edit.
