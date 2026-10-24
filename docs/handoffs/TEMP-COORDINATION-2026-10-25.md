# TEMP — Game Calendar coordination handoff (2026-10-25)

> **Временный контекст для нового координационного чата, не новая спецификация и не разрешение на реализацию.**
> После успешного переноса контекста файл можно удалить отдельным docs-only PR.
> Если содержание противоречит более свежему `main`, `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md` или конкретной задаче, они имеют приоритет.
> **Не начинать новый Work/milestone автоматически.**

## Цель и правила работы

- Репозиторий: `maxvfk/game-calendar` — публичная PWA для игровых событий GI / HSR / WuWa / ZZZ / Endfield / NTE / CZN; главный вопрос: «что заканчивается раньше всего и что нужно успеть сделать?».
- Иерархия истины: текущий `main` и код → `AGENTS.md` → `docs/IMPLEMENTATION-STATUS.md` → relevant specs/tasks/research → commits/merged PRs → прошлые разговоры. Чаты — rationale, не хранилище актуального кода.
- Предпочтения оператора: небольшие bounded milestones, отдельные короткие branches/PRs, явный **Next concrete step**, минимум повторного исследования; реальные телефон/ПК smoke остаются за оператором. Готовые длинные промпты — в fenced CodeBlock.
- Базовые проверки для изменений: `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`, а также соответствующие браузерные/PG17 проверки. Обновлять IMPLEMENTATION-STATUS после существенного milestone.
- Разделять Account/Sync, source ingestion/data quality, recurring endgame, UI/pre-Astra, независимый audit. Не нарушать event IDs, provenance, reset day keys или user outboxes ради «упрощения».
- Никаких секретов, административных database URL, private age identity или plaintext backup в чате/репозитории. Опасные production SQL/переключения — только с отдельным operator GO.

## Снимок текущего состояния (проверено 2026-10-25)

- Public `main`: `a4092197713eb603347af1a7586bf49f10421a06` (до добавления этого handoff). Последний проверенный [CI/Pages run 40134811157](https://github.com/maxvfk/game-calendar/actions/runs/40134811157) — **success**, включая PG17.
- Единственный открытый PR на момент снимка: [draft #68](https://github.com/maxvfk/game-calendar/pull/68), **припаркованный** план DeepSeek AI integration (ingestion + Timeline labels). Не смешивать с текущими задачами.
- `docs/IMPROVEMENT-BACKLOG.md` имеет последний полный coordination review **2026-10-19** и местами устаревшие статусы («queued» у уже слитых задач). Актуальное подтверждение искать в `main` и `docs/IMPLEMENTATION-STATUS.md`.

### Завершённые крупные направления

1. **Account/User Sync S1–S5.1 и S6a encrypted backup/recovery** — реализованы. Резервное копирование живёт в отдельном приватном `maxvfk/game-calendar-backups`, его реализация pin-ится на immutable public revision. S6b — независимый отложенный follow-up.
2. **Timeline recognition M1 и sticky semantic M2** — реализованы; мобильный/desktop smoke принят 2026-10-21. Viewport-preservation при фильтрах/Upcoming исправлен; при очень узком наборе событий допускается нативный clamp диапазона, это не причина вновь открывать M2. TypeBadge, truncation и мобильные фильтры/header тоже завершены.
3. **Мелкие UI fixes** — nearest Daily Reset attribution, Event Detail Close/Back, Monday separators; All types select-all/clear-all; нужные PR слиты, не переимплементировать по старым backlog-строкам.
4. **Verified Data Corrections** 2026-10-22: Endfield Phantasia Cycle I/II #58, шесть CZN banner boundaries #59, Genshin regional Phase II #60 — deployed. Исторический шаг «CZN reset blocked» в этом sequential отчёте **позднее полностью разрешён отдельным CZN GO 1–3**, не трактовать его как текущий blocker.
5. **CZN Daily Reset GO 1–3** полностью выполнены и приняты 2026-10-24. Результат — standing `dailies:czn`, **18:00 UTC / UTC opening-date**, отдельный epoch-policy namespace; старые CZN `daily_marks` сохранены без переинтерпретации; server `enabled=true`, новые клиентские операции активны. Оператор проверил настоящий rollover 18:00 UTC и Sync телефона/ПК. Техническая история: client #76, smoke/UI #78, completion docs #79, стандартный chip в Today's dailies #80, docs #81. На `main` CZN выглядит как обычный daily chip, детали свёрнуты; без epoch владелец видит предложение Enable. Backup v2 работает, scheduled run 2026-10-24 success.
   - Остаточная честная оговорка: шаг phone smoke по **отправке offline outbox со старой версии PWA после airplane mode** не удалось проверить именно на старом клиенте: Chrome оставался offline; server fence проверен PG17 CI. Внедрённая версия сохраняет старые held CZN записи, не превращает их в новые marks; см. подробности в IMPLEMENTATION-STATUS.
   - Не переигрывать GO 1–3, не запускать повторные SQL, не откатывать backup pin или чистить caches/outboxes. Emergency disable только по отдельному разрешению.

## Обсуждение последней координации

После закрытия CZN пользователь попросил вернуться к **общей координации**. Предложено использовать текущую стабильную точку для **отдельного независимого критического audit (Astra/другой независимый Work), а не аудитировать тем же Claude Code, который внедрял GO 1–3**. Цель — реальные failure modes, regression/security/data risks и проверенные дефекты, не массовый refactor. Аудит **ещё не запущен и не является уже принятой implementation-задачей**. По результатам — раздельные bounded fixes, затем freeze baseline / `docs/MAINTENANCE.md` при достижении соответствующего gate. Никакие новые milestone пока не стартовать без отдельной команды.

Пользователь отдельно спросил о **per-game daily paid passes** (например, 30-дневный Welkin) и сложности Sync:
- Продуктовое пожелание из backlog: компактный раздел рядом с Today's dailies, по игре устанавливать/править дни, `+30` с Undo, отсчёт по игровым server-day resets, профильное хранение, import/export/Sync.
- **Это новая сущность без legacy dayKey history**, поэтому не предполагает такой же старо-клиентский epoch/fence cutover, как CZN. Не надо копировать три GO CZN по умолчанию.
- **Технический факт текущего кода:** `src/shared/sync.ts` содержит строгий `PreferenceKey` / `preferenceSchemas`; `public.sync_valid_preference` и SQL CHECK также валидируют допустимые ключи/типы. Просто добавить произвольный JSON в `preferences` нельзя. Backup использует strict schema contract и versioned readers. Новая таблица/сущность с совместимым Sync потенциально потребует отдельного миграционного и backup-version плана; безопасные альтернативы нужно сначала проверить, не предрешать дизайн без небольшой design-задачи.
- Синхронизация конкурентных `+30` на двух устройствах — открытое product/semantics решение (LWW срок или учёт отдельных продлений), не реализовано.
- Рекомендация: отдельный небольшой **design milestone** о хранении/Sync/backup, потом bounded implementation; но **приоритет ещё не утверждён**. «Меньше работы, чем CZN» — оценка сложности, а не гарантия отсутствия production-миграции.

## Остальные направления для приоритизации, не автоматические задачи

- **RecognitionSubjects вне Timeline:** M1 хранит поле; M2 использует его в Timeline; Next Up/Checklist могут потребовать независимую UI/population работу, не маркировать как выполненную.
- **Artwork / event recognition**: отдельное product decision и источник/лицензирование/hotlink/cache/provenance policy, сначала в Event Detail, не добавлять в Timeline без UX-решения.
- **Recognition-first Event Detail**: отдельный redesign, после выбора artwork/metadata; сохранять source/precision/conflict transparency.
- **Daily passes**: см. выше; не привязывать к CZN работе.
- **NTE permanent Daily Reset**: исследование завершено 2026-10-22, но Asia/SEA и UTC/DST evidence недостаточно; не менять clock/dayKey без in-game подтверждения с выбранным сервером и абсолютным UTC.
- **Endfield Echoes auto source**: на момент исследования parser отвергал противоречивые wiki данные, Phantasia Cycle I/II вернули reviewed rows; автоматическое восстановление источника — отдельное направление и требует **fresh** source-health проверки, не повторения завершённого research.
- **Другие data uncertainties**: NTE Circle Bounty conflict и другие known sourced gaps; не делать guessed corrections.
- **Google OAuth Publish app**: отдельный pre-public gate **непосредственно перед свободной раздачей ссылки друзьям**, с проверкой scope/redirect/Supabase и новым аккаунтом, без изменения существующих user identities.
- **S6b backup monitoring/cache cleanup**, DeepSeek plan #68 — припаркованы, без явного приоритета.
- Часть backlog документов историческая и не обязана совпадать с последним статусом; новый чат может предложить отдельное docs backlog reconciliation только если пользователь согласует приоритет.

## Рекомендуемый старт нового координационного чата

1. Начать с CURRENT `main`, `AGENTS.md`, `docs/IMPLEMENTATION-STATUS.md` и текущего backlog; читать этот handoff только как контекст rationale.
2. Кратко подтвердить статус CZN GO 1–3, Timeline M2, Sync/backup и известных необязательных остаточных рисков; не требовать повторного smoke, если нет нового факта.
3. Обсудить, что поставить **следующим одним bounded milestone**: независимый audit (предложенный приоритет) или отдельный дизайн paid passes/другой feature по выбору оператора.
4. **Не запускать Work, не менять код или production автоматически.** После решения сформулировать короткий task и готовый prompt (если попросит), с одним Next concrete step.

## Канонические ссылки

- [AGENTS.md](../../AGENTS.md)
- [IMPLEMENTATION-STATUS](../IMPLEMENTATION-STATUS.md)
- [IMPROVEMENT-BACKLOG](../IMPROVEMENT-BACKLOG.md)
- [CZN production handoff](../CZN-PRODUCTION-CUTOVER.md)
- [Account backup runbook](../ACCOUNT-BACKUP.md)
- [NTE daily reset findings](../research/daily-reset-clocks/nte.md)
- [Event time precision audit](../research/event-time-precision-audit.md)
- [Private backups](https://github.com/maxvfk/game-calendar-backups) (requires proper access)
