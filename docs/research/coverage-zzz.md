# Zenless Zone Zero — аудит покрытия календаря и источников

**Status:** partial  
**checkedAt:** 2026-09-22T20:02:00Z  
**baseline main SHA:** `39892eddd69d41d5fc55af30ab2a1e6d8ed4a5bf`  
**Регион:** Global; различия Asia / Europe / America для `server time` сохраняются явно.  
**Горизонт:** текущие события и официально объявленные будущие события до 2026-10-22T20:02:00Z.

Проверены: `AGENTS.md`, `data/reviewed/zzz.json`, ZZZ entry в `src/ingest/adapters/index.ts`, Actions refresh runs 35714122468 и 35770466875, official ZZZ Version 3.2 update/event/channel notices и current official news index. Опубликованный `events.v1.json` напрямую не проверен; build-feed log показывает `zzz-game8-events unavailable` и `reviewed-zzz: 15 events`.

## Краткий вывод

Core in-game coverage Version 3.2 уже хорошее: все 11 временных игровых/login/double-reward событий из official update notice присутствуют в reviewed. Phase I Agent/W-Engine channels тоже покрыты.

Главный data gap — `Potential Hypothesis: Reforged in Fire`: reviewed хранит `endsAt:null`, хотя тот же официальный update notice прямо говорит, что событие идёт до конца Version 3.2, а Version 3.2 заканчивается **2026/10/21 06:00 (UTC+8)**. Это позволяет без cadence inference задать фиксированный конец **2026-10-20T22:00:00Z**.

Главный automation gap — Game8 не работает unattended: scheduled run 35714122468 получил `HTTP 202 (CloudFront)`; independent snapshot отсутствует. Лучший кандидат — официальный ZZZ news index + individual official news pages как HTML source, если bounded Actions probe подтвердит robots/accessibility. Вторичный fallback для banners — Prydwen; для полного event calendar он недостаточен.

## Покрытие событий

| Event | Existing ID | Source boundaries | Timezone / region | Status | Publication URL | Action |
|---|---|---|---|---|---|---|
| All-New Program | `zzz:all-new-program:2026-09-09` | After Version 3.2 update → `2026/10/20 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | Keep day start; current regional exact ends are appropriate. |
| Angels Support Operation | `zzz:angels-support-operation:2026-09-09` | After update → `2026/11/30 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| Potential Hypothesis: Reforged in Fire | `zzz:potential-hypothesis-reforged-in-fire:2026-09-09` | After update → End of Version 3.2; same notice states version ends `2026/10/21 06:00 (UTC+8)` | fixed UTC+8 version boundary | **conflicting / under-precise** | https://zenless.hoyoverse.com/en-us/news/166000 | Replace null end with `2026-10-20T22:00:00Z`, `endPrecision: exact`, `regionScoped:false`. Start remains day precision. |
| Clink, Clank, Pinball Knight! | `zzz:clink-clank-pinball-knight:2026-09-10` | `2026/09/10 10:00 → 2026/10/19 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| Shadow Chase Showdown | `zzz:shadow-chase-showdown:2026-09-16` | `2026/09/16 10:00 → 2026/10/05 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166073 | No change. |
| Surprise Screening Plan | `zzz:surprise-screening-plan:2026-09-23` | `2026/09/23 10:00 → 2026/10/20 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| Advanced Bounty: Area Patrol | `zzz:advanced-bounty-area-patrol:2026-09-23` | `2026/09/23 04:00 → 2026/09/28 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| Diary of an Orbie Parent | `zzz:diary-of-an-orbie-parent:2026-09-30` | `2026/09/30 10:00 → 2026/10/19 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| "En-Nah" Into Your Lap | `zzz:en-nah-into-your-lap:2026-09-30` | `2026/09/30 10:00 → 2026/10/20 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| Chronicles of the Hobbling Crow | `zzz:chronicles-of-the-hobbling-crow:2026-10-03` | `2026/10/03 10:00 → 2026/10/19 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| Data Bounty: Combat Simulation | `zzz:data-bounty-combat-simulation:2026-10-14` | `2026/10/14 04:00 → 2026/10/19 03:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/166000 | No change. |
| Bloodmoon Rising | `zzz:bloodmoon-rising:2026-09-09` | After Version 3.2 update → `2026/09/30 11:59` | server time | covered | https://zenless.hoyoverse.com/en-us/news/165979 | Keep day start; exact regional ends are correct. |
| Axiom of Captivation | `zzz:axiom-of-captivation:2026-09-09` | same Phase I window | server time | covered | https://zenless.hoyoverse.com/en-us/news/165979 | No change. |
| Crimson Thirst | `zzz:crimson-thirst:2026-09-09` | same Phase I window | server time | covered | https://zenless.hoyoverse.com/en-us/news/165979 | No change. |
| Neon Fantasies | `zzz:neon-fantasies:2026-09-09` | same Phase I window | server time | covered | https://zenless.hoyoverse.com/en-us/news/165979 | No change. |
| Cindernight Respite / Crimson Moon Casket | not found | names officially announced for Version 3.2; exact Phase II period not present in retrieved official notice | unknown from official source | **insufficient evidence** | https://zenless.hoyoverse.com/en-us/news/166000 | Wait for Phase II channel notice. Secondary calendars place them Sep 30 → Oct 20, but do not publish as official exact yet. |
| Promeia rerun / Frostfall Sickle rerun | not found | visible in current secondary banner calendars; matching official Phase II notice not found during audit | server-time window secondary only | **insufficient evidence** | secondary: https://www.prydwen.gg/zenless/banners | Do not add until official Phase II channel notice is available. |
| Shiyu Defense Critical Node phases | not found | Version 3.2 notice publishes Phase I–III buffs but no dates in retrieved text | deadline unknown | **insufficient evidence** | https://zenless.hoyoverse.com/en-us/news/166000 | Do not infer reset cadence. Add only when explicit official/in-game period is captured. |
| Deadly Assault phases | not found | Version 3.2 notice publishes Phase I–III enemy sets but no dates in retrieved text | deadline unknown | **insufficient evidence** | https://zenless.hoyoverse.com/en-us/news/166000 | Same: no cadence inference. |

### Web / external events

`Vyrium Vacation Album` is explicitly a web event, running **September 9 – October 10**; official ZZZ news index lists it and the official social post supplies the period. It is intentionally not counted as a core in-game coverage defect. If the product scope is expanded to web events, add it as a separate category/clearly marked source. Twitch Drops and social prize events should remain outside core unless the product explicitly opts in.

## Источники и автоматизация

| Source | Coverage / format | Проверенная доступность | Access / conditions | Recommendation |
|---|---|---|---|---|
| **ZZZ official news index + article pages** | canonical; update notices, event details, channel notices; HTML/search-rendered content with explicit dates and server semantics | Search/browser tool can read current index and detail pages on 2026-09-22. **Raw Actions availability UNVERIFIED.** | robots.txt could not be retrieved in this tool: rules **unknown**. Probe must check robots first and fail closed. Use normal public page URLs only; do not depend on undocumented query/API parameters. | **Primary candidate.** Probe index + one detail page from Actions; if raw HTML contains article list/content, build narrow parser and keep exact official page as sourceUrl. |
| Game8 `zzz-game8-events` | broad secondary calendar | **Actions: HTTP 202 CloudFront**; no independent snapshot | unusable unattended | Legacy fallback only. |
| Prydwen ZZZ banners | banner-only, server-region selector, current/upcoming dates | Search tool reads it; last updated 2026-09-12. Runner/robots not verified in this audit | secondary, not full event coverage | Banner fallback/corroboration only, especially if official Phase II notice discovery is delayed. Do not use for general event coverage. |
| ZZZBuild events | broad server-rendered event/banner calendar | Search tool readable 2026-09-22 | secondary; runner/robots unverified | Discovery only. It mixes web/core events and normalizes display times, so official notices should outrank it. |

## Integration handoff

1. Fix only the confirmed reviewed precision gap: `Potential Hypothesis: Reforged in Fire` can use the explicit Version 3.2 end `2026-10-20T22:00:00Z`.
2. Do not change the existing 14 other reviewed rows from this audit; their source windows match the official notices checked.
3. Wait for the official Phase II channel notice before adding Roxy/Promeia and their W-Engines with exact boundaries.
4. Probe the official ZZZ news index and one known detail page from GitHub Actions. If robots/access are acceptable and HTML is parser-friendly, prefer official direct ingestion over another mirror.

Future tests grounded in observed sources:
- update notice 166000: “After Version 3.2 update” must remain day precision; scheduled maintenance completion must not become the event start.
- update notice 166000: `Potential Hypothesis` “End of Version 3.2” resolves to the separately explicit version end `2026/10/21 06:00 UTC+8`, not to server-local ends.
- channel notice 165979: four Phase I banners share a single server-time window and must remain four stable IDs.
- update notice 166000: Shiyu/Deadly Assault phases contain no explicit dates; parser must emit no fabricated cycle deadlines.
- event notice 166073: Shadow Chase Showdown explicit `10:00 → 03:59 server time` should preserve region-scoped end conversion.

**Needed Actions probe:** official `https://zenless.hoyoverse.com/robots.txt`, then one GET of the public news index and one known detail page (for example `/en-us/news/166000`) using the project User-Agent. Record status/content-type/body shape/ETag or Last-Modified. Do not use `catchSpider` or undocumented APIs in production without an explicit supported contract.

## Remaining

- Live published `events.v1.json` was not directly verified; Actions build inputs were used.
- Official Phase II channel notice was not found as of checkedAt; resolve when it is published.
- Explicit official deadlines for current Shiyu Defense / Deadly Assault phases were not found; cadence was intentionally not inferred.
- Official news-site robots rules and GitHub Actions raw HTML behavior are **UNVERIFIED**.
- Web-event inclusion remains a product-scope decision; `Vyrium Vacation Album` is the concrete current example.

This is source research, not code validation; `typecheck`, tests and build were not run.

## Integration checkpoint — 2026-09-22T20:11:21Z

Potential Hypothesis now ends at `2026-10-20T22:00:00.000Z`, exact and global.
The event explicitly lasts until the end of Version 3.2, and the same update
notice explicitly states October 21, 06:00 UTC+8 as the version end. This is
not calculated from 42-day cadence. Title, ID, day-precision start and canonical
source URL are unchanged; the other 14 records are unchanged. Batch reviewedAt
is retained because this review was limited to one event.

Verification: the official search-indexed result for article 166000 explicitly
states the version-end timestamp; direct open returned no readable body.
The [Zenless.gg reproduction](https://zenless.gg/version-3-2-their-secret-histories-update-announcement/)
links the original HoYoverse notice and exposes both the compensation section
(version end) and the event section (ends with that version). Both clauses were
re-read, rather than treating the research conclusion alone as evidence.
No automatic parser or undocumented endpoint was added. Runner availability
and the remaining coverage gaps above are still pending.

## Endgame follow-up — 2026-09-23

The historical gap assessment above reflected the official Version 3.2 notice,
which still gives no dated Shiyu/Deadly boundaries. The user's in-game screen
showed both active with relative countdowns. Two independently dated community
posts identify the current windows: [Shiyu Critical Node Sep 18–Oct 2](https://www.hoyolab.com/article/46768065)
and [Deadly Assault Sep 11–25](https://www.hoyolab.com/article/46706496).
The [Icy Veins Critical Node guide](https://www.icy-veins.com/zenless-zone-zero/shiyu-defense-critical-node)
independently says the next Shiyu reset is October 2. HoYoLAB article bodies
are JS gated here; the publication titles exposed by search contain the dated
periods. These are player reports on the official community platform, **not**
official HoYoverse notices. Two reviewed `challenge` records therefore use
`estimated` provenance, 0.75 confidence, and day/day precision. No reset hour
or future rotation is inferred. Replace with official/in-game absolute periods
when available while preserving the now-published event IDs.
