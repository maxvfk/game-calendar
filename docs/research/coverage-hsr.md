# Honkai: Star Rail — аудит покрытия календаря и источников

**Status:** partial  
**checkedAt:** 2026-09-22T19:33:21Z  
**baseline main SHA:** `39892eddd69d41d5fc55af30ab2a1e6d8ed4a5bf`  
**Регион:** Global; server-time различия Asia / Europe / America сохраняются явно.  
**Горизонт:** текущие события на момент аудита и официально объявленные старты до 2026-10-22T19:33:21Z.

Проверены: `AGENTS.md`, `data/reviewed/hsr.json`, HSR entry в `src/ingest/adapters/index.ts`, Actions refresh runs 35714122468 и 35770466875, official HoYoverse/HoYoLAB notices, публичный архив official in-game notices `KQM-git/HSRNews`, а также официальный/press материал по Version 4.6. Опубликованный `events.v1.json` напрямую не удалось извлечь текущим web-инструментом, поэтому я **не утверждаю, что проверил live feed**; build-feed log показывает `hsr-game8-events unavailable` и `reviewed-hsr: 8 events`.

## Краткий вывод

Главный инфраструктурный пробел тот же, что у Genshin: единственный зарегистрированный automatic source HSR — Game8 — не работает unattended. Scheduled run 35714122468 получил `HTTP 202 (CloudFront)`, а в run 35770466875 HSR source остался `unavailable (no independently captured snapshot yet)`. Фактически календарь HSR сейчас держится на 8 reviewed rows.

При этом найден **подтверждённый data bug**: `Overdrive: Whirlwind Grand Prix` и `Minuscule Great Adventure` заканчиваются `2026/09/28 03:59 (UTC+8)` / `(global)`, то есть в один фиксированный момент `2026-09-27T19:59:00Z`. Reviewed сейчас ошибочно трактует конец как `03:59 server time` и создаёт разные Europe/America ends. Для `Apocalyptic Shadow`, `Pure Fiction` и текущих Warp'ов источник, наоборот, прямо говорит `server time`, поэтому region-scoped модель там уместна.

Лучший automatic candidate — **KQM/HSRNews**, публичный GitHub-архив in-game notices. Он обновлялся в день аудита (latest checked push `2026-09-22T15:59:58Z`), содержит стабильные `archive/<id>.md`, и различает `(server)` и `(global)`. Перед интеграцией нужен один bounded Actions probe documented GitHub Contents API. Canonical provenance при возможности должен оставаться HoYoverse/HoYoLAB; KQM — extraction mirror.

## Покрытие событий

| Event | Existing ID | Source boundaries | Timezone / region | Status | Publication / extraction URL | Action |
|---|---|---|---|---|---|---|
| Overdrive: Whirlwind Grand Prix | `hsr:overdrive-whirlwind-grand-prix:2026-08-26` | After Version 4.5 update → `2026/09/28 03:59:00` | **end UTC+8/global**, not server time | **conflicting** | https://www.hoyolab.com/article/46449452 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md | Fix end to fixed `2026-09-27T19:59:00Z`; `regionScoped:false`. Keep day-precision start: “after update” is not exact completion time. |
| Minuscule Great Adventure | `hsr:minuscule-great-adventure:2026-09-12` | `2026/09/12 12:00:00 (server)` → `2026/09/28 03:59:00 (UTC+8/global)` | regional start, fixed global end | **conflicting** | https://www.hoyolab.com/article/46449452 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md | Keep start day precision under current schema; fix end to fixed UTC instant, no regionEnds. |
| Over the Gilded Tides | `hsr:over-the-gilded-tides:2026-09-12` | `2026/09/12 12:00 – 2026/09/28 03:59` | server time | covered | https://www.hoyolab.com/article/46634922 | Current regionEnds are consistent with server-time semantics. |
| A Hunt Through Night | `hsr:a-hunt-through-night:2026-09-12` | same phase window | server time | covered | https://www.hoyolab.com/article/46634922 | Preserve current ID/title. |
| Brilliant Fixation: Summer Rides the Surf | `hsr:brilliant-fixation-summer-rides-the-surf:2026-09-12` | same phase window | server time | covered | https://www.hoyolab.com/article/46634922 | No date change. |
| Bygone Reminiscence: Epilogue of Lies | `hsr:bygone-reminiscence-epilogue-of-lies:2026-09-12` | same phase window | server time | covered, naming discrepancy | https://www.hoyolab.com/article/46634922 | Recent official-facing material also uses “The Finale of a Lie”; **do not rename existing row** without an ID migration/alias decision. Dates are covered. |
| Realm of the Strange | not found | `2026/09/19 04:00:00 (server) – 2026/09/28 03:59:00 (global)` | server start; fixed global end | **missing** | https://github.com/KQM-git/HSRNews/blob/master/archive/1392.md | Add reviewed: start day precision; exact fixed end `2026-09-27T19:59:00Z`; double-reward event. |
| Memory of Chaos: Stormcleanse | not found | `2026/08/17 04:00:00 (server) – 2026/09/28 06:00:00 (global)` | server start; fixed global end | **missing** | https://www.hoyolab.com/article/45851903 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1333.md | Add challenge row; start day precision; end `2026-09-27T22:00:00Z`, no regional end. |
| Apocalyptic Shadow: Celestial Lupine | `hsr:apocalyptic-shadow-celestial-lupine:2026-08-31` | `2026/08/31 04:00:00 – 2026/10/05 03:59:00` | server time | covered | https://www.hoyolab.com/article/46449452 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md | Current region-scoped end is appropriate. |
| Pure Fiction: Domain Genesis | `hsr:pure-fiction-domain-genesis:2026-09-14` | `2026/09/14 04:00:00 – 2026/10/19 03:59:00` | server time | covered | https://www.hoyolab.com/article/46449452 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md | Current region-scoped end is appropriate. |
| Fate Contract: Renewal | not found | `2026/07/24 12:00:00 (server) — Before the end of Version 4.6` | server start; exact end not announced here | **missing** | https://www.hoyolab.com/article/45851903 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1333.md | Add active login/reward row with day start and `endsAt:null`; do not infer 4.6 end. |
| Gift of Odyssey — Version 4.5 | not found | official 4.5 update confirms 7-day login event, but retrieved update notice gives no concrete period | not established | insufficient evidence | https://www.hoyolab.com/article/46449452 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1389.md | Do not publish until a dated notice is located; no “whole version” inference. |
| Version 4.5 Nameless Honor | not found | After 4.5 update → `2026/09/28 03:59:00 (global)`; paid purchase closes `02:59`; web top-up closes `2026/09/27 03:59` | fixed global/UTC+8 boundaries | **missing** | https://www.hoyolab.com/article/46328730 ; https://github.com/KQM-git/HSRNews/blob/master/archive/1361.md | If BP deadlines are in product scope, add main BP end; optional separate purchase cutoff requires explicit product decision. |
| Pearl Event Warp / Colors for Tomorrow (4.6) | not found | Version 4.6 launches 2026/09/28; Pearl + LC boosted throughout version; no exact Warp boundaries found | Global announcement; exact clock absent | insufficient evidence | HoYoverse announcement summarized at https://www.gematsu.com/2026/09/honkai-star-rail-version-4-6-update-dance-with-the-beast-before-moonrise-launches-september-28 | Wait for official Warp/update notice; do not infer maintenance completion or version end. |
| Evanescia rerun (4.6 first half) | not found | first half of Version 4.6; exact start/end not yet established | unspecified | insufficient evidence | same HoYoverse announcement via Gematsu above | Wait for Warp notice; do not derive phase length. |
| Mortenax Blade rerun (4.6 second half) | not found | second half of Version 4.6; exact start/end not yet established | unspecified | insufficient evidence | same | Wait for Warp notice. |
| Love, Ghosts & Robots | not found | announced for Version 4.6; exact period not found | unspecified | insufficient evidence | same | Discovery only until dated official notice. |
| Interastral Peace Gala: One Take | not found | announced for Version 4.6; exact period not found | unspecified | insufficient evidence | same | Discovery only until dated official notice. |
| Astral Slammers Squad! | not found | announced for Version 4.6; exact period not found | unspecified | insufficient evidence | same | Discovery only until dated official notice. |
| Memory of Chaos — Version 4.6 phase | not found | official 4.5 notice: new phase becomes available after Version 4.6 update; no concrete deadline found | unspecified | insufficient evidence | https://www.hoyolab.com/article/46449452 | Do not infer cycle end from cadence. |

## Источники и автоматизация

| Source | Coverage / format | Проверенная доступность | Access / conditions | Recommendation |
|---|---|---|---|---|
| HoYoverse / HoYoLAB | canonical official provenance; version notices, Warp notices, events, endgame | URLs resolve, but direct pages are JS shells (`Loading...`) in current web tool | HTML parser viability not established; exact public URLs remain useful for reviewed provenance | Canonical verification/review layer, not chosen as extraction surface. |
| Game8 `hsr-game8-events` | broad secondary HTML event list | **GitHub Actions 35714122468: HTTP 202 CloudFront**; no independent snapshot | current runner cannot use it | Keep legacy fallback only; not primary. |
| **KQM/HSRNews** | Markdown archive of in-game official notices; version events, double rewards, BP, challenge modes, exact server/global labels; stable archive files | GitHub connector read successfully 2026-09-22; repo pushed `2026-09-22T15:59:58Z`. **Actions availability UNVERIFIED.** | Use documented GitHub Contents API, e.g. `GET /repos/KQM-git/HSRNews/contents/readme.md`: https://docs.github.com/en/rest/repos/contents . Rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api . GitHub Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service . This is API access, not robots bypass. Repo exposes no license; extract factual fields only, not prose/assets. | **Primary candidate.** One Actions probe + fixture, then narrow parser. Preserve HoYoverse/HoYoLAB URL as canonical provenance when matchable. |

KQM/HSRNews has one important limitation: current `readme.md` clearly covers active in-game notices, but Phase II Warp names were not found there during this audit. Therefore it should automate broad event/endgame/double-reward coverage, while Warp notices may still require reviewed official HoYoLAB input unless a stable official extraction surface is found. Do not claim it provides complete banner coverage until fixture evidence proves that.

## Integration handoff

1. **Fix the confirmed time-semantics bug first:** Overdrive and Minuscule end at one fixed `2026-09-27T19:59:00Z`; remove region-specific end variants.
2. Add reviewed **Realm of the Strange**, **Memory of Chaos: Stormcleanse**, and **Fate Contract: Renewal** using the conservative precision above. Consider **Nameless Honor** if BP deadlines are intentionally in scope.
3. Probe `KQM-git/HSRNews` through the documented GitHub Contents API from Actions; if successful, capture fixture and build a source-specific parser. Do not parse arbitrary prose globally: recognize explicit notice sections and `(server)` vs `(global)`.
4. Keep current stable IDs/titles even when a source wording differs; especially do not silently rename `Bygone Reminiscence: Epilogue of Lies`.
5. Re-run coverage after Version 4.6 update/Warp notices land; current Sep 20 preview is discovery evidence, not exact boundary evidence.

Source-grounded tests for a future parser:

- `archive/1389.md`: `Minuscule Great Adventure` has **server-time start but global/fixed end**; parser must not apply one timezone mode to both boundaries.
- `archive/1392.md`: `Realm of the Strange` is a double-reward event and ends `2026/09/28 03:59 (global)`; expected fixed UTC end is `2026-09-27T19:59Z`.
- `archive/1333.md`: `Fate Contract: Renewal` says “Before the end of Version 4.6”; parser must emit unknown end rather than derive it from release cadence.
- `archive/1361.md`: Nameless Honor main end `03:59`, paid purchase cutoff `02:59`, and web top-up cutoff one day earlier are three different deadlines; parser must not conflate them.
- `archive/1389.md`: Apocalyptic Shadow / Pure Fiction explicitly use `server` on both boundaries, unlike Overdrive/Minuscule; region-scoped behavior must remain distinct.

**Needed Actions probe:** exactly one narrow GET of the intended KQM/HSRNews GitHub Contents API endpoint, recording status/content-type/rate-limit/ETag and a fixture. No new Game8 probe is needed: today's scheduled run already demonstrated its current failure mode.

## Remaining

- **Не проверено:** live published `events.v1.json`; current build inputs were established from Actions logs instead.
- **Не найдено:** concrete official period for Version 4.5 `Gift of Odyssey`; presence is official, dates are not established by the retrieved notice.
- **Не найдено:** concrete deadline for the Version 4.6 Memory of Chaos phase; cadence intentionally not inferred.
- **Ожидает official notice:** exact 4.6 Warp boundaries and exact periods for `Love, Ghosts & Robots`, `Interastral Peace Gala: One Take`, and `Astral Slammers Squad!`.
- **Automation gate:** KQM/HSRNews is the recommended candidate, but runner availability is **UNVERIFIED** until the integrator performs the bounded Actions probe.
- **Coverage limitation:** KQM/HSRNews may omit social/HoYoLAB-only Warp notices from its active `readme.md`; banner completeness must be measured on the captured fixture, not assumed.

This is source research, not code validation; `typecheck`, tests and build were not run.
