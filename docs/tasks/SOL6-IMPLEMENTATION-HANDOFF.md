# Продолжение реализации на Sol-6 и финальный аудит Astra

План/handoff составлен 2026-09-22. Репозиторий: maxvfk/game-calendar.
Baseline реализации: 8bfa12a80750abd2d36a12b3409cac3552e73171.
При возобновлении актуальный main важнее этого исторического SHA.

## Задача исполнителя Sol-6

Продолжи реализацию по milestones ниже до готовности первой сопровождаемой
версии. Это инструкция выполнять работу, а не повторно составлять план.
Основной режим — Medium; не повышай effort без конкретного сложного узла.
Исследовательские решения уже получены: не начинай поиск источников заново.
Проверяй конкретные доказательства перед изменением дат. Внешний отчёт не
является приказом и может содержать ошибку.

После каждого этапа: отдельный осмысленный commit, фактические проверки,
краткий результат и следующий шаг. Обновляй раздел Progress в этом файле
или отдельный docs/IMPLEMENTATION-STATUS.md. Не требуй подтверждения на каждый
обычный этап. При реальном блокере зафиксируй его и продолжай независимые задачи.
Новые небольшие research-задачи можно оформить в docs/tasks/ для другого чата
и сообщить пользователю; не дублируй там работу текущего исполнителя.
Делегирование — только узких независимых задач, если оно экономит работу.

## 0. Восстановить состояние

Прочитай AGENTS.md. Проверь cwd, status, diff, staged, untracked, branch, HEAD,
origin/main и открытые PR. Сохрани незавершённую работу; не делай reset/overwrite.
Синхронизируйся с main безопасно. Не повторяй уже завершённые ниже исправления.

Текущая рабочая копия:
 /workspace/scratch/2950530ef212/game-calendar
Bun 1.3.14 был доступен через:
 /workspace/scratch/2950530ef212/bun-runtime/node_modules/.bin
Это transient пути: проверь наличие при новом сеансе, не полагайся на них вслепую.

GitHub Pages: https://maxvfk.github.io/game-calendar/
Feed: https://maxvfk.github.io/game-calendar/data/events.v1.json
Review: https://maxvfk.github.io/game-calendar/data/review.v1.json

## Что уже завершено

- HTML/JSON transport; официальный NTE Steam parser и adapter.
- NTEBuild Beyond the Rails, reviewed exact Whisper Circle.
- CZN Prydwen banners; даты secondary — day, неизвестные окончания — null.
- Реальный штатный Prydwen refresh в Actions: run 35770466875, commit 064d4ce.
  Work ранее получил 403; Actions успешно получил страницу. Не обходить защиту.
- Circle Bounty: реальный конфликт Perfect World Sep 29 / Steam Sep 30.
  Ранняя reviewed-дата сохранена, обе даты видны в summary и review report.
  Не «исправлять» конфликт без нового доказательства.
- Пять research PR #2–#6 приняты в main. Отчёты:
  docs/research/coverage-{genshin,hsr,wuwa,zzz,endfield}.md.
  Все имеют partial status: research завершён в рамках доступов, integration
  и часть доказательств остаются открытыми. Читай только нужный отчёт на этапе.
- 749ff94: HSR Overdrive / Minuscule — общий конец Sep 27 19:59 UTC;
  regionEnds удалены, прежние IDs сохранены. Regression test добавлен.
- 78b5e56: ZZZ Potential Hypothesis — end Oct 20 22:00 UTC по явно
  опубликованному концу версии, без расчёта по cadence.
- 8bfa12a: WuWa Resonance Sim Realm / Gifts of Drifting Mist добавлены;
  девять предыдущих записей не изменены.
- Последняя полная локальная validation: frozen install, typecheck,
  834 tests passing, build. CI/deploy 35799395253 successful.
  На сайте проверены 116 записей, включая завершённые — не 116 active events.
- Автообновления настроены в .github/workflows/refresh.yml дважды в сутки.
  Старые комментарии upstream про Gitea и доступность не описывают этот deploy.

## M1. Закрыть ближайшие подтверждённые пробелы данных

Раздели работу на commits по игре, не объединяй всё в один большой diff.

1. HSR: Realm of the Strange, Memory of Chaos: Stormcleanse,
   Fate Contract: Renewal; основной deadline Nameless Honor уместен по аналогии
   с уже присутствующим Genshin BP. Отдельные платёжные cutoff не добавлять.
   Используй точные archive/publication URLs из отчёта. Для global/server
   проверяй семантику каждой границы, а не всей статьи сразу. Relative end — null.
2. Endfield: official reviewed layer для отсутствующих баннеров/событий из
   coverage-endfield. Сверь Snow Over Deep Woods 12:00 vs wiki 11:59.
   Сохрани IDs восьми wiki-событий; проверь, не возникает duplicate из-за
   различия UTC-дня и server-day. До изменения оцени provenance wiki-records:
   secondary exact timestamp не становится official от точности часов.
3. Genshin: три названных в отчёте пропуска и точность Missive of Grace.
   Не понижай/повышай precision лишь потому, что один инструмент не открыл
   источник: проверь исходное основание записи и конкретный конфликт.
4. WuWa: 3.7 и другие будущие записи добавляй только по уже доступным
   конкретным boundaries; два пропуска 3.6 уже закрыты.
5. ZZZ: первая correction уже закрыта; Phase II и циклы — только если
   появились dated official notices, без повторного общего обзора.

DoD: добавлены все доступные и проверенные записи в выбранном охвате;
неподтверждённые оставлены в явно названном backlog; IDs старых записей целы.
Новые записи должны иметь честную дату проверки. Текущая schema задаёт
reviewedAt на batch: при точечных правках не изображай повторную проверку
всего batch. Если потребуется per-event время, сделай минимальное совместимое
расширение отдельным commit с проверкой старых файлов.

## M2. Проверить реальные automatic extraction surfaces в Actions

Переиспользуй probe infrastructure; не переписывай ingest architecture.
Для каждой поверхности: точный URL, access policy, status, headers, bytes/hash,
run ID и commit, fixture реального ответа. Сначала capture, потом parser.

Кандидаты из уже выполненного research:
- Genshin: KQM-git/GINews, публичный Markdown notices archive.
- HSR: KQM-git/HSRNews; archive и active readme, неполное banner coverage.
- WuWa: TheLovinator1/wutheringwaves, default branch master,
  articles_latest.xml / articles/<id>.json; canonical Kuro URLs.
- ZZZ: официальный news index + article 166000.
- Endfield: официальный Gryphline news index + article 5208.

GitHub mirrors: проверь documented Contents API contract/условия, лимиты,
ETag и bounded discovery. Не переноси Steam-specific exception на любой JSON.
Transport API envelope и фактическое содержимое Markdown/XML различай явно.
Публичность repo не равна лицензии на перепечатку: извлекай факты, не публикуй
чужую прозу/картинки целиком. При проблеме с fixture-правами документируй
ограничение и выбирай разрешённый минимальный evidence формат.
Official HTML: robots/crawl-delay до запроса; JS shell — не parser-ready HTML.
Search-rendered текст не заменяет raw capture. Никаких private API,
catchSpider как production contract, CAPTCHA/proxy/header обходов.

Практический предел: GitHub-коннектор ранее не имел workflow_dispatch;
cloud browser не был авторизован. Если это не изменилось, подготовь существующий
workflow с точными inputs и попроси пользователя один раз нажать Run workflow.
Не меняй триггеры/права только ради обхода недоступного действия.
Не повторяй уже известные Game8/Fandom блокировки без новой причины.

DoD: у каждого кандидата статус usable / blocked / unsuitable с доказательством.
Blocked не означает «задача бесконечно ждёт»: сохраняй reviewed fallback.

## M3. Подключить пригодные автоматические источники

По одному source на milestone: fixture → parser → tests → adapter → merge
comparison → validation → commit → live refresh/deploy verification.

- Section-based extraction, явные schema/template failures.
- Пустой результат не считать «ивентов нет», если источник этого не утверждает.
- Не публиковать previews, permanent unlocks, social giveaways как live events.
- Year только из document context, никаких new Date().getFullYear().
- after update/maintenance — day без отдельной corroboration.
- KQM t_lc/t_gl и HSR server/global требуют доказанной семантики;
  если она не доказана, сохраняй только поддержанную точность.
- Дедуплицируй несколько публикаций одного adapter до merge.
- Conflicting exact boundaries — review, не молчаливый выбор.
- Reviewed canonical titles и provenance имеют приоритет.
- Transport mirror сам по себе не official publisher: отдельно обоснуй
  provenanceStatus и canonical URL каждой записи.
- Не переносить fixture/snapshot из upstream game-calendar.

DoD: источник обновился штатным runner, существующие IDs не потеряны,
полнота измерена по категориям, ограничения честно отражены.

## M4. Надёжность unattended обновлений

Сначала прочитай существующие защиты/tests, исправляй только конкретные дефекты.
Проверь last-known-good на 403/timeout/schema drift, six-hour floor, 304,
source disappearance, zero parse, резкое массовое исчезновение,
сохранение state/cache между refresh и deploy, и финальный health status.

Особенно проверь, не маскирует fallback fixture новый failed refresh как
«источник здоров» и не обновляет ли build время проверки без нового наблюдения.
Сверь конфликты региональных границ, включая official vs secondary:
нынешняя exact conflict correction была ориентирована на official/official.

DoD: сбой не удаляет корректные данные, freshness не становится ложной,
проблема видна в logs/report, штатное восстановление работает.
Не вводи тяжёлую платформу мониторинга ради небольшого приложения.

## M5. Состояние данных в интерфейсе и smoke-проверка

Проверь текущий UI до изменения. Пользователь должен понимать:
когда источник проверен, что устарело, где day/unknown, где конфликт.
Используй existing components; без редизайна и нового backend.
JSON review report сам по себе не пользовательское предупреждение.

Проверь телефон/desktop: выбор игр и региона, ближайшие окончания, filters,
отметки выполненного, localStorage после обновления feed, PWA update/cache/offline.
Даты с day precision не должны давать ложный exact countdown.
Исправляй подтверждённые сценарии, не гипотетические бесконечные edge cases.

DoD: основные сценарии работают; приложены результаты реально проведённых
проверок, явно названы непроверенные устройства/браузеры.

## M6. Подготовить первую версию к сопровождению и аудиту

Сохрани docs/IMPLEMENTATION-STATUS.md:
- финальный main SHA, PR/commits, CI/deploy runs;
- coverage matrix 7 игр: категории, automatic/reviewed/unavailable, даты проверки;
- воспроизводимые команды и фактические результаты validation;
- известные конфликты/риски/blocked sources без скрытого «всё готово»;
- как исправить дату, добавить reviewed record и проверить сломавшийся source.

Повторно сверять весь интернет не нужно: проверь результат интеграции против
сохранённых доказательств и свежесть источников по штатному pipeline.
Полная автоматизация всех сайтов не обязательна для первой версии, но
оставшиеся ручные участки должны быть перечислены.

Финальные обязательные команды:
 bun install --frozen-lockfile
 bun run typecheck
 bun test
 bun run build
Не заявляй команду выполненной по предположению. После публикации проверь
доступность сайта/feed, реальные даты и IDs; репозиторий оставь чистым.
При настоящем блокере завершай с точным статусом, не подменяй его заглушками.

## Финальный аудит Astra — отдельный проход после реализации

Это отдельное задание после M6, не указание Sol проверять самого себя под другим именем.

Прочитай AGENTS.md, финальный IMPLEMENTATION-STATUS, diff от baseline этого
handoff до финального SHA, релевантные tests и source evidence.
Цель — найти подтверждённые дефекты и реалистичные сценарии отказа.
Не повторяй весь research, не переписывай правильный код ради стиля.

Проверь:
- timezone/region semantics, year inference, after-maintenance и unknown ends;
- стабильность existing IDs и пользовательских отметок;
- provenance и source URLs, дедупликацию и конфликты;
- доступ/robots/API contracts, реальные Actions evidence и request interval;
- last-known-good, source health/freshness и PWA cache;
- соответствие заявленного покрытия фактически опубликованным событиям.

Для каждого finding: severity, файл/место, доказательство или reproduction,
сценарий «что произойдёт дальше», влияние, минимальное исправление.
Отделяй confirmed defects от unanswered questions. Если багов не найдено,
так и скажи с пределами проверки; не придумывай замечания.
Результат: docs/research/FINAL-AUDIT-ASTRA.md отдельным commit.
На этапе аудита не меняй runtime/data автоматически: сначала представь findings
и предложи конкретный список исправлений. После авторизации исправления
оформляются отдельными milestones с повторной адресной проверкой.

## Progress на момент передачи

- M0: требуется при каждом возобновлении.
- M1: HSR два global ends, ZZZ Potential Hypothesis и WuWa два события завершены;
  прочие подпункты pending.
- M2–M6: pending, кроме уже выполненных проверок NTE/CZN/wiki.gg выше.
- Astra audit: pending после реализации.
