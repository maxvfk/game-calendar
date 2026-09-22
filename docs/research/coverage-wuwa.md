# Wuthering Waves — аудит покрытия календаря и источников

**Status:** partial  
**checkedAt:** 2026-09-22T19:45:00Z  
**baseline main SHA:** `39892eddd69d41d5fc55af30ab2a1e6d8ed4a5bf`  
**Регион:** Global; server-time различия Asia / Europe / America сохраняются явно.  
**Горизонт:** текущие события и официально объявленные старты до 2026-10-22T19:45:00Z.

Проверены: `AGENTS.md`, `data/reviewed/wuwa.json`, WuWa entry в `src/ingest/adapters/index.ts`, Actions refresh runs 35714122468 и 35770466875, официальные Kuro notices (через точные article URLs и публичный архив их содержимого), Version 3.7 maintenance/preview, а также несколько secondary calendar surfaces только для поиска пробелов. Опубликованный `events.v1.json` напрямую не проверен: build-feed log показывает `wuwa-game8-events unavailable` и `reviewed-wuwa: 9 events`.

## Краткий вывод

Текущий unattended source для WuWa фактически отсутствует: Game8 в scheduled Actions run 35714122468 получил `HTTP 202 (CloudFront)`, independent snapshot не создан. Календарь держится на 9 reviewed rows.

Reviewed 3.6 в основном корректен, включая regionEnds: source пишет local **server time**, а сохранённые UTC ends соответствуют 03:59/11:59 на каждом сервере. Но пропущены два крупных актуальных события: **Resonance Sim Realm** и **Gifts of Drifting Mist**.

Для автоматизации лучший найденный кандидат — публичный GitHub-архив `TheLovinator1/wutheringwaves`, который сохраняет официальные Kuro Games notices в per-article JSON и Atom feed, обновился в день аудита и сохраняет original Kuro article ID/URL. Рекомендуемый transport — documented GitHub Contents API для `articles_latest.xml` (или per-article JSON после discovery), с сохранением official Kuro URL как provenance. Нужен один Actions probe; runner availability пока **UNVERIFIED**.

## Покрытие событий

| Event | Existing ID | Source boundaries | Timezone / region | Status | Publication | Action |
|---|---|---|---|---|---|---|
| Resonance Sim Realm | not found | `2026-08-22 10:00 - 2026-09-29 11:59` | server time | **missing** | https://wutheringwaves.kurogames.com/en/main/news/detail/5357 | Add reviewed; start day precision under current schema; exact regional end using established WuWa server mapping. |
| Gifts of Drifting Mist | not found | `Version 3.6 Update - 2026-09-29 03:59` | server time | **missing** | https://wutheringwaves.kurogames.com/en/main/news/detail/5357 | Add login row; start day precision, exact regional end. Do not replace “Version Update” with scheduled maintenance end. |
| If Dreams Still Reverberate | `wuwa:if-dreams-still-reverberate:2026-09-10` | `2026-09-10 10:00 - 2026-09-29 03:59` | server time | covered | https://wutheringwaves.kurogames.com/en/main/news/detail/5357 | Current end mapping is correct. Keep start day precision because schema has no region-specific starts. |
| Wuthering Exploration: Fogveil Pagoda | `wuwa:wuthering-exploration-fogveil-pagoda:2026-09-17` | `2026-09-17 04:00 - 2026-09-29 03:59` | server time | covered | https://wutheringwaves.kurogames.com/en/main/news/detail/5357 | No change. |
| Chord Cleansing | `wuwa:chord-cleansing:2026-09-22` | `2026-09-22 04:00 - 2026-09-29 03:59` | server time | covered | https://wutheringwaves.kurogames.com/en/main/news/detail/5428 | Keep; exact text is also present in official social notice. |
| Thousand Futures Mirrored in Snow | `wuwa:thousand-futures-mirrored-in-snow:2026-09-10` | `2026-09-10 10:00 - 2026-09-29 11:59` | server time | covered | https://wutheringwaves.kurogames.com/en/main/news/detail/5431 | Current regionEnds already correspond to 11:59 server time; no correction needed. |
| Distant May the Starlights Be | `wuwa:distant-may-the-starlights-be:2026-09-10` | same | server time | covered | https://wutheringwaves.kurogames.com/en/main/news/detail/5431 | No change. |
| Frostburn | `wuwa:frostburn:2026-09-10` | same | server time | covered | https://wutheringwaves.kurogames.com/en/main/news/detail/5431 | No change. |
| Starfield Calibrator | `wuwa:starfield-calibrator:2026-09-10` | same | server time | covered | https://wutheringwaves.kurogames.com/en/main/news/detail/5431 | No change. |
| Where Santu Beckons | `wuwa:where-santu-beckons:2026-09-10` | official social notice: `2026-09-10 10:00 - 2026-09-29 11:59` | server time | covered | official Wuthering Waves social post; version source: https://wutheringwaves.kurogames.com/en/main/news/detail/5357 | Existing reviewed end is consistent. Exact standalone Kuro site article was not located; do not change identity. |
| Thousandfold Deliverance | `wuwa:thousandfold-deliverance:2026-09-10` | official social notice: `2026-09-10 10:00 - 2026-09-29 11:59` | server time | covered | official Wuthering Waves social post; version source: https://wutheringwaves.kurogames.com/en/main/news/detail/5357 | Existing reviewed end is consistent. |
| Version 3.7 Featured Convenes | not found | Hsin: `As Full as Tonight, Forever`; Suoming: `Nine Deaths, One Unbent Heart`; weapons `Blooming Jadehaven`, `Unspoken Rue`; no exact Convene periods in accessible official text | not established | **insufficient evidence** | https://wutheringwaves.kurogames.com/en/main/news/detail/5476 | Wait for exact Featured Convene notices. Do not infer banner start from maintenance completion or phase length from cadence. |
| Gifts of Singing Drizzle | not found | `2026-10-22 10:00 - 2026-11-11 03:59` | server time | **missing (future)** | official 3.7 preview: https://wutheringwaves.kurogames.com/en/main/news/detail/5453 ; exact text also in Kuro-provided press overview | Add once integrator accepts image/press corroboration; start/end are explicit server time. |
| Gifts of Waking Moon | not found | 7-day login event; exact period not stated in accessible official text | unknown | **insufficient evidence** | https://wutheringwaves.kurogames.com/en/main/news/detail/5476 | Wait for event-specific notice. |
| Cubie Wars / Dreams in the Capsule / Past Dreams, Traced Seals / Echo Erase / Artisan's Search / Beyond the Waves: Land of Xuanfang | not found | announced for 3.7; exact periods not stated in accessible official text | unknown | **insufficient evidence** | https://wutheringwaves.kurogames.com/en/main/news/detail/5476 | Discovery only; do not invent boundaries. |
| Tower of Adversity current cycle | not found | secondary calendar says 2026-09-14 → 2026-10-12 | server semantics not verified from official notice | **insufficient evidence** | secondary only: https://playaware.gg/events/wuthering-waves | Do not publish until an official/in-game source with explicit deadline is captured. |
| Whimpering Wastes current cycle | not found | secondary sources indicate a reset around 2026-09-28 | exact official boundary not located | **insufficient evidence** | secondary only | Do not infer monthly cadence. |
| Endstate Matrix — Adversity Vanguard | not found | official notice confirms challenge cycle, but accessible text does not expose current phase deadline | exact deadline unavailable | **insufficient evidence** | https://wutheringwaves.kurogames.com/en/main/news/detail/5150 | Do not infer “ends with version” without explicit source boundary. |

### Web events as scope question

Version 3.7 officially names **Waking Moon Fishing** and **Back to Solaris** web events. Exact periods were not found in accessible text. Keep them outside the core in-game calendar unless product scope explicitly includes web events.

## Источники и автоматизация

| Source | Coverage / format | Проверенная доступность | Access / conditions | Recommendation |
|---|---|---|---|---|
| Kuro Games official news | canonical provenance; patch notes, events, Convenes, maintenance | Exact articles confirmed; format is mixed HTML + image-only notices | Parser suitability varies; some important previews are images. Runner availability not tested here. | Canonical verification/sourceUrl; not the sole extraction surface. |
| Game8 `wuwa-game8-events` | broad secondary HTML list | **Actions: HTTP 202 CloudFront**; no independent snapshot | inaccessible to unattended runner | Legacy fallback only. |
| **TheLovinator1/wutheringwaves** | per-article JSON + `articles_latest.xml` Atom feed mirroring official Kuro notices; original articleId/title/content preserved | GitHub connector readable 2026-09-22; repo pushed `2026-09-22T18:27:05Z` | Use documented GitHub Contents API: https://docs.github.com/en/rest/repos/contents with raw media type where appropriate; rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api ; Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service . Repo has no license: extract factual schedule fields only; do not redistribute prose/images. Runner **UNVERIFIED**. | **Primary automatic candidate.** One Actions probe; parse only schedule-bearing entries and preserve `https://wutheringwaves.kurogames.com/en/main/news/detail/<articleId>` as sourceUrl. |
| WutheringWaves.gg | server-rendered mirror/news index, explicitly links Kuro source | Readable in web search on 2026-09-22 | robots/runners not checked; secondary site | Fallback discovery/corroboration only if GitHub archive fails. |

## Integration handoff

1. Add reviewed **Resonance Sim Realm** and **Gifts of Drifting Mist** first.
2. Do **not** “fix” current 3.6 banner UTC values: the reviewed `regionEnds` correctly represent the source's `11:59 server time`.
3. Add **Gifts of Singing Drizzle** only with explicit server-time semantics; leave the other 3.7 events/banners pending event-specific notices.
4. Probe `TheLovinator1/wutheringwaves` via GitHub Contents API, ideally one request to `articles_latest.xml`; if viable, capture fixture and implement a narrow source-specific parser.

Future tests grounded in source data:
- article 5357: `Resonance Sim Realm` ends **11:59 server**, while `If Dreams Still Reverberate` ends **03:59 server** — parser must not normalize both to one patch-end time.
- article 5357: `Gifts of Drifting Mist` begins “Version 3.6 Update”; start must stay day precision, not scheduled maintenance end.
- article 5431: four separate banner rows share `2026-09-10 10:00 - 2026-09-29 11:59 (server time)`; keep separate stable IDs.
- article 5476: maintenance is `2026-09-30 04:00 - 11:00 UTC+8`, but this must **not** be used as an inferred Convene start.
- 3.7 preview: named events without dates must produce no invented boundaries.

**Needed Actions probe:** one narrow documented GitHub Contents API request for `TheLovinator1/wutheringwaves/articles_latest.xml`, recording status/content-type/ETag/rate-limit and saving a fixture if successful. No further Game8 probe is needed.

## Remaining

- Live published `events.v1.json` was not directly verified; Actions build inputs were used.
- Exact 3.7 Featured Convene periods and most 3.7 event periods are **not yet available in accessible official text**; resolve when event-specific notices land.
- Exact official current deadlines for Tower of Adversity, Whimpering Wastes and the current Endstate Matrix phase were not found; secondary cadence was not promoted to calendar data.
- Exact standalone official site publication for Jingran/Thousandfold Phase II was not located, although official social text confirms the same `10:00 → 11:59 server time` window.
- Runner availability of the recommended GitHub archive remains **UNVERIFIED** until the bounded Actions probe.

This is source research, not code validation; `typecheck`, tests and build were not run.

## Integration checkpoint — 2026-09-22

Added Resonance Sim Realm and Gifts of Drifting Mist. The integrator re-read
[article 5357 JSON](https://github.com/TheLovinator1/wutheringwaves/blob/master/articles/5357.json):
articleId 5357, gameId G152-en, Version 3.6 patch-note title. The direct Kuro
article returned no readable body in the web tool, so the archive is the
extraction evidence, with the original Kuro URL retained as provenance.

The combat event runs August 22, 10:00 through September 29, 11:59 server time.
The login event starts after the Version 3.6 update and ends September 29,
03:59 server time. The same document identifies the update date as August 20;
its scheduled completion time is not used as the event start. Both starts are
day precision. End conversions use the existing Asia +08, Europe +01,
America -05 mapping. No cadence-derived boundaries are introduced.

All nine previous event records are preserved verbatim. The batch reviewedAt
is retained because those older records were not all freshly reverified;
this checkpoint records the targeted additions. The GitHub mirror is not yet
an automatic adapter, and Actions transport verification is still pending.
