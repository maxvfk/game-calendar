# Arknights: Endfield — аудит покрытия календаря и источников

**Status:** partial  
**checkedAt:** 2026-09-22T20:18:00Z  
**baseline main SHA:** `39892eddd69d41d5fc55af30ab2a1e6d8ed4a5bf`  
**Регион:** Global; Endfield официально использует Asia = UTC+8, Americas / Europe = UTC-5.  
**Горизонт:** текущие события и официально объявленные старты до 2026-10-22T20:18:00Z.

Проверены: `AGENTS.md`, отсутствие `data/reviewed/endfield.json`, Endfield entries в `src/ingest/adapters/index.ts`, `snapshots/endfield-wikigg-events.*`, Actions refresh runs 35714122468 и 35770466875, официальный `[Dreamscape of Wind and Snow] Version Update Notes` (https://endfield.gryphline.com/en-us/news/5208), `[Winter Hunt] Chartered Headhunting` (https://endfield.gryphline.com/en-us/news/6172), `[Deep Cold Issue] LTO Details` (https://endfield.gryphline.com/en-us/news/4480), version DEV Comm (https://endfield.gryphline.com/en-us/news/4481), current Endfield Talos Wiki Event page и Prydwen banners. Published `events.v1.json` недоступен текущему web tool; фактические build inputs проверены через snapshot и Actions logs.

## Краткий вывод

Endfield — единственная игра из текущей пятёрки, где существующий automatic source **реально работает unattended**: `endfield-wikigg-events` был подтверждён Actions 2026-09-22 через `304 not modified`; snapshot свежий и содержит 8 событий с exact regional timestamps.

Главный пробел — не reliability, а **coverage**. Wiki Event page хорошо покрывает обычные события, но не headhunting / weapon banners и пока не содержит значительную часть второй половины Version 1.5. В feed отсутствуют как минимум активный `Winter Hunt`, `Deep Cold Issue`, будущие `Resplendent Spectrum` / `Tag Artist Issue`, `Echoing Bell of an Old City`, `Season of Illusion`, `Ridgeline Flows of Autumn`, `Runners' Steeplechase`, второй `Sanity Supply` и `Monumental Etching: Shadow Marked`.

Рекомендуемый следующий шаг: **сохранить wiki.gg как основной event source** и добавить узкий официальный Gryphline source для Version Update / banner notices. Официальная страница `/en-us/news/5208` уже server-renders все нужные даты в доступном web-инструменте, но robots + GitHub Actions raw fetch пока **UNVERIFIED**.

## Покрытие событий

| Event | Existing ID | Source boundaries | Timezone / region | Status | Publication URL | Action |
|---|---|---|---|---|---|---|
| Sanity Supply — Sep window | `endfield:sanity-supply:2026-09-16` | Asia: Sep 17 04:00 → Sep 24 04:00; Americas/Europe: Sep 17 04:00 → Sep 24 04:00 | server time | covered | https://endfield.gryphline.com/en-us/news/5208 | Current wiki timers match official window. |
| Season of Virtuality | `endfield:season-of-virtuality:2026-09-02` | After version update → Sep 24 11:59 | server time | covered | https://endfield.gryphline.com/en-us/news/5208 | No change. |
| Snow Over Deep Woods | `endfield:snow-over-deep-woods:2026-09-02` | official: after update → **Sep 30 12:00**; wiki snapshot: **11:59** | server time | **conflicting** | https://endfield.gryphline.com/en-us/news/5208 | Official boundary outranks wiki. Verify in-game display if practical; otherwise use official 12:00 rather than silently preserving 11:59. |
| Fletched Irontip | `endfield:fletched-irontip:2026-09-02` | opens with Winter Hunt; wiki exact end Sep 30 12:00 local | regional | covered, secondary exact | https://endfield.gryphline.com/en-us/news/6172 | Official notice confirms simultaneous opening but does not separately state sign-in end. Keep wiki exact with secondary provenance, not “official exact.” |
| AIC Support: Chubby Lung Attacks | `endfield:aic-support-chubby-lung-attacks:2026-09-16` | Sep 16 12:00 → Sep 30 16:00; exchange → Oct 7 04:00 | server time | covered | https://endfield.gryphline.com/en-us/news/5208 | Main event covered. Consider separate shop deadline only if product wants claim/exchange deadlines. |
| A Winter Dream Fogged Deep in the Woods | `endfield:a-winter-dream-fogged-deep-in-the-woods:2026-09-02` | official: throughout Version 1.5; wiki gives exact next-maintenance boundary | version-relative | covered, secondary exact | https://endfield.gryphline.com/en-us/news/5208 | Keep existing event; do not label wiki-derived version-end timestamp as official until next maintenance is announced. |
| Trial of the Bow | `endfield:trial-of-the-bow:2026-09-09` | Sep 9 12:00 → before version update/maintenance; wiki gives exact version-end boundary | server start; relative end | covered, secondary exact | https://endfield.gryphline.com/en-us/news/5208 | Same provenance caution as above. |
| Purry Big Feline! RAWR! | `endfield:purry-big-feline-rawr:2026-09-24` | Sep 24 12:00 → before version update/maintenance; wiki exact timer ends Oct 14/15 | server start; relative official end | covered, upcoming | https://endfield.gryphline.com/en-us/news/5208 | Existing wiki row is useful; official text only supports relative end. |
| Winter Hunt | not found | After Version 1.5 release → Sep 30 11:59 | server time | **missing** | https://endfield.gryphline.com/en-us/news/6172 | Add banner. Start day precision; exact regional ends. |
| Deep Cold Issue | not found | after Version 1.5 update → after 3 Chartered Headhunting banners starting from Winter Hunt | end not yet concrete | **missing** | https://endfield.gryphline.com/en-us/news/4480 | Add weapon banner with day start and `endsAt:null`; do not calculate end from assumed future banner cadence. |
| Resplendent Spectrum RE-Factor Headhunting #1 | not found | Sep 24 12:00 → before version update/maintenance | server time; unknown exact end | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Add banner with day start / unknown end under current schema, which lacks region-specific starts. |
| Tag Artist Issue RE-Factor Issue #1 | not found | Sep 24 12:00 → before version update/maintenance | server time; unknown exact end | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Same handling. |
| Echoing Bell of an Old City | not found | Sep 24 12:00 → before version update/maintenance | server time; unknown exact end | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Add guide event with day start and null end until maintenance is official. |
| Season of Illusion | not found | Sep 24 12:00 → before version update/maintenance | server time; unknown exact end | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Add challenge season; no inferred Oct 15 end from secondary cadence. |
| Ridgeline Flows of Autumn | not found | Oct 1 12:00 → before version update/maintenance | server time | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Add login event, day start, null end. |
| Runners' Steeplechase | not found | Oct 1 12:00 → before version update/maintenance | server time | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Add in-game Fun & Games event, day start, null end. |
| Sanity Supply — Oct window | not found | Asia: Oct 8 04:00 → Oct 15 04:00; Americas/Europe: Oct 8 04:00 → Oct 14 17:00 | server time | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Add second occurrence with exact regional boundaries. |
| Monumental Etching: Shadow Marked | not found | Oct 5 12:00 → Oct 19 04:00 | server time | **missing** | https://endfield.gryphline.com/en-us/news/5208 | Add challenge event; day start + exact regional ends. |
| OrbiPom! MERGE! | not found | Oct 1 12:00 → before version update/maintenance | web event | scope question | https://endfield.gryphline.com/en-us/news/5208 | Keep outside core until web-event scope is explicitly enabled. |

## Источники и автоматизация

| Source | Coverage / format | Проверенная доступность | Access / conditions | Recommendation |
|---|---|---|---|---|
| **Endfield Talos Wiki Event page** | event/login/challenge rows; machine-readable `data-start` / `data-end`; regional exact timers | **Actions VERIFIED**: snapshot 188,488 bytes, 8 events; 2026-09-22 refresh returned 304 | Existing repo already passed robots gate and fetch. Page is CC BY-SA 4.0. | **Keep as primary event source.** It is healthy; problem is category coverage, not reliability. |
| **Official Gryphline news/detail pages** | canonical update notices, banners, weapon issues, future event schedule; server-rendered HTML in web tool | Official `/en-us/news/5208`, `6172`, `4480`, `4481` readable 2026-09-22. **Actions UNVERIFIED.** | `https://endfield.gryphline.com/robots.txt` was not retrievable in this tool → rules unknown. Must probe robots first; no undocumented API. | **Primary supplement for missing banners/future rows.** One bounded Actions probe of robots + news index + `/en-us/news/5208`. |
| Prydwen Endfield banners | character/weapon banner calendar | readable 2026-09-22, but page says last updated 2026-09-09 and still shows no officially announced Sep 24 Yvonne upcoming row | secondary; runner/robots not checked | Do **not** use as primary now; stale versus official announcement. Could remain manual corroboration. |

Game8 should remain legacy only: scheduled Actions returned `HTTP 202 CloudFront`.

## Integration handoff

1. Fix the one confirmed existing discrepancy: `Snow Over Deep Woods` official end is 12:00 server time, wiki says 11:59.
2. Add the official banner layer: `Winter Hunt`, `Deep Cold Issue`, `Resplendent Spectrum`, `Tag Artist Issue`.
3. Add source-confirmed missing events: `Echoing Bell of an Old City`, `Season of Illusion`, `Ridgeline Flows of Autumn`, `Runners' Steeplechase`, October `Sanity Supply`, `Monumental Etching: Shadow Marked`.
4. Preserve existing wiki event IDs; official source should enrich/override dates, not rename rows.

Future tests:
- official 5208 vs wiki: `Snow Over Deep Woods` 12:00 vs 11:59 must surface as a discrepancy, not silently merge.
- `Deep Cold Issue` “after 3 Chartered banners” must yield unknown end, not a computed calendar date.
- `Resplendent Spectrum` / `Tag Artist Issue`: region-specific 12:00 server starts should not become a single misleading exact UTC start under the current schema.
- October `Sanity Supply` must remain a second occurrence, not dedupe into September's row.
- `Monumental Etching: Shadow Marked` has a concrete event end; permanent `Marked by Dark Shadows` gameplay itself should not be published as a limited event.

**Needed Actions probe:** `https://endfield.gryphline.com/robots.txt`; if allowed, GET official news index and `https://endfield.gryphline.com/en-us/news/5208` with project UA, recording status/content-type/validators/body shape. No new wiki.gg or Game8 probe is needed.

## Remaining

- Published `events.v1.json` was not directly accessible; snapshot + Actions build inputs were checked instead.
- Exact next-version maintenance is not officially announced as of checkedAt, so “before version update/maintenance” remains an unknown end even where secondary sources currently show Oct 14/15.
- Exact official end for `Deep Cold Issue` is not yet a calendar timestamp.
- Gryphline robots and Actions runner behavior are unverified.
- Web-event scope remains unresolved; `OrbiPom! MERGE!` is the concrete current case.

This is source research, not code validation; `typecheck`, tests and build were not run.
