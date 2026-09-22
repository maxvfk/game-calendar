# Genshin Impact — аудит покрытия календаря и источников

**Status:** partial  
**checkedAt:** 2026-09-22T19:09:32Z  
**baseline main SHA:** `39892eddd69d41d5fc55af30ab2a1e6d8ed4a5bf`  
**Регион:** Global; различия Asia / Europe / America сохраняются отдельно.  
**Горизонт:** текущие события на момент аудита и официально объявленные старты до 2026-10-22T19:09:32Z.

Проверены: `AGENTS.md`, `data/reviewed/genshin.json`, Genshin entries в `src/ingest/adapters/index.ts`, Actions refresh run 35714122468 и manual run 35770466875, official Genshin/HoYoLAB notices, публичный архив официальных in-game notices KQM/GINews и два secondary calendar candidates. Опубликованный `events.v1.json` через текущий web-инструмент недоступен, поэтому я **не утверждаю, что проверил live feed**. Последний Actions build-feed log, однако, показывает для Genshin только `reviewed-genshin: 13 events`; оба automatic sources были `unavailable`.

## Краткий вывод

Главный системный пробел — у Genshin сейчас фактически нет работающего unattended automatic source. В scheduled run 35714122468 `genshin-game8-events` получил HTTP 202 от CloudFront, а `genshin-fandom-events` был остановлен на robots gate: `robots.txt returned 403 (an interstitial challenge)`. В main нет independently captured Genshin snapshot/fixture, поэтому текущая линия держится на 13 reviewed records.

По содержанию reviewed 7.1 уже хорош, но не полный: отсутствуют как минимум текущие `To Temper Thyself and Journey Far`, `The Godforsaken Frostlands` и официально объявленный `Carefree Snowball Fight` (старт 21 октября). Кроме того, `Missive of Grace` сейчас записан с exact UTC start, хотя доступное in-game notice зеркало показывает только `2026/09/28 00:00` без явно доказанной в этом аудите timezone semantics.

Рекомендуемый следующий automatic extraction source — **KQM/GINews**: публичный GitHub-архив official in-game notices, обновлявшийся 2026-09-22 несколько раз (последний проверенный push 11:01:22Z). Он уже содержит точные notice sections для wishes, Silverwing, login, selectors, Archon Quest rewards и Battle Pass. Перед интеграцией нужен один bounded Actions probe exact GitHub Contents endpoint и консервативное правило для `t_lc` / `t_gl`: не превращать часы в UTC, пока их timezone semantics не подтверждены.

## Покрытие событий

Обозначения: **covered** — запись есть в reviewed; **missing** — событие подтверждено источником, но отсутствует в текущих Genshin build inputs; **conflicting** — существующая запись утверждает более точную семантику, чем удалось подтвердить; **insufficient evidence** — deadline не подтверждён без вывода по cadence.

| Event | Existing ID | Source boundaries | Timezone / region | Status | Publication / evidence | Action |
|---|---|---|---|---|---|---|
| The Lone Light Knocks at Night (Flins) | not found | 2026/09/01 18:00 → 2026/09/22 14:59 | server time; at checkedAt only America was still live | missing | https://genshin.hoyoverse.com/en/news/detail/165901 | Уже истёк; не backfill. Использовать как regression case для будущего wish parser. |
| Astral Actuation (Ineffa) | not found | 2026/09/01 18:00 → 2026/09/22 14:59 | server time | missing | https://genshin.hoyoverse.com/en/news/detail/165901 | То же; пример того, что Event page/Fandom не заменяет banner source. |
| Epitome Invocation — 7.0 Phase II | not found | 2026/09/01 18:00 → 2026/09/22 14:59 | server time | missing | https://genshin.hoyoverse.com/en/news/detail/165901 | Regression case only. |
| To Temper Thyself and Journey Far — Cycle 5 | not found | official calendar: 08/10 → 11/02; secondary live-data surface: 04:00 → 03:59 | official calendar stamped UTC+8, day-only | missing | https://www.hoyolab.com/article/46673425 ; https://www.genshincodex.com/en/events | Добавить reviewed с day precision, если интегратор подтвердит, что live feed его действительно не содержит. Не брать exact hours из secondary без timezone proof. |
| The Godforsaken Frostlands | not found | After Version 7.0 update → 2026/11/03 14:59 | localized/server display; zone не доказана здесь | missing | https://github.com/KQM-git/GINews/blob/master/archive/21811.md | Добавить reviewed консервативно; end exact только после подтверждения server-time mapping. |
| Tabletop Troupe: A Gathering on Adventurer's Eve | `genshin:tabletop-troupe-a-gathering-on-adventurers-eve:2026-09-23` | After Version 7.1 update → 2026/11/03 14:59 | localized/server display | covered | https://genshin.hoyoverse.com/en/news/detail/166200 ; https://github.com/KQM-git/GINews/blob/master/archive/21924.md | Сохранить ID/title. Notice mirror пишет **Adventure's Eve**, reviewed — **Adventurer's Eve**; не переименовывать без ID migration. |
| Across the Frozen Wilds, Honing One's Edge | `genshin:across-the-frozen-wilds-honing-ones-edge:2026-09-23` | After Version 7.1 update → 2026/11/03 14:59 | localized/server display | covered | https://github.com/KQM-git/GINews/blob/master/archive/21885.md | Без изменения identity. |
| A Rekviem for the Underworld — Limited-Time Archon Quest Rewards | `genshin:a-rekviem-for-the-underworld-limited-time-archon-quest-rewards:2026-09-23` | After Version 7.1 update → 2026/11/03 14:59 | localized/server display | covered | https://github.com/KQM-git/GINews/blob/master/archive/21880.md | Covered; permanent quest и limited reward window не смешивать. |
| When Warm Winds Cavort | `genshin:when-warm-winds-cavort:2026-09-23` | After Version 7.1 update → 2026/10/13 17:59 | server-local end; start explicitly “after update” | covered | https://github.com/KQM-git/GINews/blob/master/archive/21876.md | Текущий day-precision start правильнее, чем подстановка scheduled maintenance end. |
| Surging Ballad | `genshin:surging-ballad:2026-09-23` | After Version 7.1 update → 2026/10/13 17:59 | same | covered | https://github.com/KQM-git/GINews/blob/master/archive/21877.md | Без изменения start precision. |
| Epitome Invocation — Version 7.1 Phase I | `genshin:epitome-invocation-version-7-1-phase-i:2026-09-23` | After Version 7.1 update → 2026/10/13 17:59 | same | covered | https://github.com/KQM-git/GINews/blob/master/archive/21878.md | Без изменения start precision. |
| Silverwing in Pursuit of the Moon | `genshin:silverwing-in-pursuit-of-the-moon:2026-09-24` | Phase I 2026/09/24 10:00 → 2026/10/12 03:59; Phase II 09/26 04:00; Phase III 09/28 04:00 | notice uses localized time tags | covered | https://github.com/KQM-git/GINews/blob/master/archive/21886.md | Reviewed day start безопасен. Exact start можно повысить только после доказанного region/timezone rule. |
| Missive of Grace: A Thank-You Gift | `genshin:missive-of-grace-a-thank-you-gift:2026-09-28` | 2026/09/28 00:00 → end of Version 7.1 | retrieved notice does not expose an explicit zone | conflicting | https://github.com/KQM-git/GINews/blob/master/archive/21879.md | `2026-09-28T00:00:00Z` exact в reviewed требует повторной проверки. До неё безопаснее day precision; end=null правильно. |
| Resplendent Starlight | `genshin:resplendent-starlight:2026-10-01` | 2026/10/01 04:00 → 2026/10/19 03:59 | localized notice | covered | https://github.com/KQM-git/GINews/blob/master/archive/21879.md | Сохранить ID; exact conversion не расширять без timezone evidence. |
| Stygian Onslaught — Version 7.1 | `genshin:stygian-onslaught-version-7-1:2026-09-30` | official calendar 09/30 → 11/03 | UTC+8 calendar, day-only | covered | https://www.hoyolab.com/article/46673425 ; https://genshin.hoyoverse.com/en/news/detail/166200 | Calendar подтверждает dates; exact reviewed regional end не удалось независимо перечитать из JS official page. |
| Imaginarium Theater — October 2026 Season | `genshin:imaginarium-theater-october-2026-season:2026-10-01` | new season 10/01; explicit end не найден | Global cycle; end unknown | covered | https://genshin.hoyoverse.com/en/news/detail/166200 | `endsAt:null` лучше inferred monthly cadence. |
| Predictive Victory Dynamics — Competition Period | `genshin:predictive-victory-dynamics-competition-period:2026-10-12` | official calendar 10/12 → 10/20; announcement/results period extends to 10/23 | calendar UTC+8; reviewed has more precise fixed boundary | covered | https://www.hoyolab.com/article/46673425 ; https://genshin.hoyoverse.com/en/news/detail/166200 | Main competition covered. Не создавать отдельный “results” deadline без подтверждения, что после 10/20 остаётся обязательное claim action. |
| Carefree Snowball Fight | not found | 2026/10/21 → 2026/11/02 | official calendar UTC+8, date-only | missing | https://www.hoyolab.com/article/46673425 | Добавить reviewed day/day до появления event-specific notice; позже automatic source может обогатить precision. |
| Moontrace — Version 7.1 Battle Pass | `genshin:moontrace-version-7-1-battle-pass:2026-09-23` | After 7.1 update → 2026/11/02 03:59; paid BP purchase closes 02:59 | localized/server display | covered | https://github.com/KQM-git/GINews/blob/master/archive/21884.md | Основной end covered. Рассмотреть отдельный actionable purchase cutoff только если продукт хочет показывать покупочные deadline. |
| Spiral Abyss — Sep 16 phase | not found | official update says Phase 2 updated 2026/09/16; explicit end не найден | Global/server-cycle semantics | insufficient evidence | https://github.com/KQM-git/GINews | Не вычислять следующий reset из cadence. Добавлять только при источнике с explicit deadline. |

### Web/community events как отдельный scope question

Официальный 7.1 calendar также показывает **Anniversary Memories Album** (09/28–10/18, Web Event), **Starlit Gala** Phase 1 (10/01–10/22) / Phase 2 (10/22–11/03, Web Event) и **Vesna's Patrol Mission** (09/24–10/04, Community Event). Они не включены в core audit как in-game gameplay deadlines. Если продукт должен отвечать и на “что закончится вне клиента”, это отдельный product-scope decision; не смешивать их молча с in-game rows. `Overflowing Favor` (10/26–11/02) начинается уже за пределами 30-дневного горизонта этого аудита.

## Источники и автоматизация

| Source | Coverage / format | Проверенная доступность | Access / robots / terms | Recommendation |
|---|---|---|---|---|
| HoYoverse Genshin news + HoYoLAB calendar | canonical official provenance; notices + calendar infographic; JS/image-heavy | Official URLs открываются, но body calendar/news в текущем web tool не извлекается; HoYoLAB отдаёт shell/loading | Для automatic parsing в этом аудите не проверялся; calendar фактически image, поэтому нужен manual/image review | Оставить canonical reviewed source. Не делать главным parser surface. |
| Game8 `genshin-game8-events` | broad HTML event list | **Actions run 35714122468: HTTP 202 CloudFront**; snapshot отсутствует | Page request фактически непригоден на runner; direct robots check в web tool также недоступен | Не развивать как primary. Сохранить только legacy/identity role до migration plan. |
| Fandom `genshin-fandom-events` | MediaWiki JSON; Current/Upcoming event tables; day precision | **Actions run 35714122468: skipped_robots, robots.txt 403 interstitial**; snapshot отсутствует | Recorded rules раньше разрешали `/api.php?action=`, но unattended runner не может подтвердить robots сейчас; fail-closed поведение правильно | Хороший semantic fallback/parser, но сейчас не automatic source. Не обходить challenge. |
| **KQM/GINews** | Markdown archive verbatim-ish official in-game notices; banners, login, events, BP, update notices; individual stable `archive/<id>.md` links | GitHub connector 2026-09-22: repo public, `readme.md` readable; repo pushed 11:01:22Z the same day. **Actions availability UNVERIFIED.** | Prefer documented GitHub Contents API: https://docs.github.com/en/rest/repos/contents ; public content can be read unauthenticated; rate limit docs: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api ; Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service . API access is not a robots bypass, but needs its own narrow documented-API policy; do not reuse Steam exception generically. Repo declares no license, so extract factual schedule fields only, do not redistribute prose/assets. | **Primary candidate.** Probe exact API endpoint in Actions, then fixture/parser. Preserve individual archive URL as extraction source; canonical provenance remains HoYoverse/in-game notice where matchable. |
| Genshin Codex `/en/events` | server-rendered HTML, broad active/upcoming list, claims automated official data | Readable in current web tool 2026-09-22 | robots.txt unavailable in current tool → rules unknown; runner UNVERIFIED | **Reject as primary:** current page visibly contains impossible rows (e.g. start=end maintenance, Starlit Gala end before start) and omits much of 7.1. Could be discovery/corroboration only. |

## Integration handoff

Priority 1: repair current coverage before adding sophistication. Add/verify reviewed rows for **To Temper Thyself and Journey Far**, **The Godforsaken Frostlands**, and **Carefree Snowball Fight**; do not invent exact hours where only official calendar dates are established. Re-check `Missive of Grace` start precision: retrieved notice supports the wall-clock `00:00`, but this audit did not establish that it is UTC.

Priority 2: implement a bounded `genshin-kqm-ginews` candidate only after Actions proves the exact documented GitHub API request works. It should parse only schedule-bearing official notices, not the whole prose archive. Treat `t_lc` / `t_gl` as semantic markers requiring an explicit, tested timezone rule; until then use day precision rather than guessing. Do not rename existing reviewed titles/IDs when KQM wording differs.

Priority 3: keep official HoYoverse/HoYoLAB as canonical review layer for future entries that exist only in calendar images before detailed notices are published.

Future tests grounded in observed source data:

1. `archive/21876.md`: “After the Version 7.1 update → 2026/10/13 17:59” must **not** convert scheduled maintenance end into the banner start; existing ID date stays 2026-09-23.
2. `archive/21886.md`: Silverwing phases 09/24 10:00, 09/26 04:00, 09/28 04:00 share one event end 10/12 03:59; parser must not emit three duplicate events.
3. `archive/21879.md`: Missive “until the end of Version 7.1” must yield unknown end; no inferred patch-end timestamp. Resplendent Starlight must remain a distinct login event.
4. `archive/21884.md`: Battle Pass end 03:59 and paid purchase cutoff 02:59 are different deadlines; parser must not substitute one for the other.
5. Official calendar-only `Carefree Snowball Fight` 10/21–11/02 should stay day/day until an event-specific notice supplies supported clock/zone information.

**Needed Actions probe:** one request path for the chosen KQM GitHub Contents API endpoint (plus headers/ETag/rate-limit evidence). Game8/Fandom do not need another generic availability probe: today's scheduled run already demonstrated their current failure modes.

## Remaining

- **Не проверено:** live published `events.v1.json`, потому что GitHub Pages feed недоступен текущему web tool. Current build inputs were checked through Actions logs instead.
- **Не найдено/не доказано:** explicit official end timestamp for the current Spiral Abyss phase; cadence intentionally не использован.
- **Не доказано:** timezone semantics KQM's `t_lc` / `t_gl` markup. Until documented/verified, exact UTC conversion from those tags is unsafe.
- **Source discrepancy / precision issue:** `Missive of Grace` reviewed start asserts exact UTC while retrieved in-game notice mirror exposes `2026/09/28 00:00` without an explicit zone in the archived text.
- **Scope decision needed:** whether Web/Community events (Anniversary Memories Album, Starlit Gala, Vesna's Patrol Mission) belong in the product.
- **Automation gate:** KQM/GINews is the recommended candidate, but runner availability remains **UNVERIFIED** until the integrator performs the allowed Actions probe.

This is source research, not code validation; `typecheck`, tests and build were not run.
