# Account sync: локальные данные, Google Auth и Supabase

**Дата:** 2026-09-25  
**Статус:** proposed / design only  
**Scope:** пользовательские данные и синхронизация. Ingestion игровых событий, GitHub Actions и публичный feed не меняются.

Перед реализацией читать `AGENTS.md`, `docs/ARCHITECTURE.md` и `docs/DATA-MODEL.md`.

---

## 1. Зачем это нужно

Сейчас Event Clock — полностью local-first приложение:

- общий календарь событий приходит из опубликованного feed;
- весь пользовательский state живёт только в `localStorage` конкретного браузера;
- аккаунтов и auth нет;
- progress между браузерами/устройствами автоматически не переносится;
- export/import уже позволяет вручную перенести данные и содержит полезную merge-логику.

Нужна опциональная синхронизация пользовательского state между браузерами и устройствами.

Первый реальный сценарий:

- 2–3 человека;
- каждый человек входит под своим аккаунтом;
- у одного человека может быть несколько устройств/браузеров;
- приложение должно продолжать работать offline;
- отсутствие или временный сбой Supabase не должен ломать сам календарь;
- позднее один человек может иметь несколько игровых profiles, но первый UI этого не показывает.

Главная цель:

> **Один account = один человек; пользовательские данные сохраняются локально мгновенно и синхронизируются через Supabase, когда сеть доступна.**

---

## 2. Ключевые решения

| Вопрос | Решение |
|---|---|
| Где остаются общие игровые события? | GitHub Actions / GitHub Pages / текущий `events.v1.json` |
| Где живёт рабочая копия пользовательских данных? | В браузере, local-first |
| Где живёт cloud copy? | Supabase Postgres |
| Авторизация | Supabase Auth, первоначально только Google |
| Нужен ли собственный backend server? | Нет для первой версии |
| Browser credential | Supabase **publishable key**; secret key в браузер не попадает |
| Авторизация строк БД | Postgres Row Level Security |
| UX аккаунтов | Один Google account = один человек |
| Profiles | В схеме есть с первого дня; UI пока автоматически использует один default profile |
| Sync realtime? | Нет в первой версии |
| Offline | Полностью поддерживается |
| Существующий export/import | Сохраняется |
| Существующие `v1` localStorage keys | Никогда не удаляются миграцией первой версии |
| Конфликты | Детерминированный LWW для одной логической записи + explicit delete/toggle state |
| Источник истины при наличии cloud | Local cache + Supabase convergent copy; UI не блокируется сетью |
| Multiple profiles позже | Добавляются UI-слоем без изменения ownership child tables |

---

## 3. Что специально НЕ входит в первую версию

Не делать вместе с первым cloud-sync milestone:

- публичную регистрацию через email/password;
- magic-link/SMTP;
- совместные/shared profiles;
- realtime subscriptions;
- социальные функции;
- server-side rendering;
- собственный API server;
- перенос общего event feed в Supabase;
- multi-profile selector в UI;
- сложные CRDT;
- бесконечный audit/event log всех действий;
- автоматическое удаление старых local caches;
- полный self-service delete Supabase Auth user через privileged Edge Function.

Если позже появится реальный сценарий для этих функций, схема ниже не должна мешать их добавить.

---

## 4. Архитектура

Общие данные и персональные данные остаются двумя независимыми вертикалями.

```text
                     ОБЩИЕ ДАННЫЕ

official/wiki/KQM/etc
         │
         ▼
   GitHub Actions
         │
         ▼
   events.v1.json
         │
         ▼
    GitHub Pages
         │
         ▼
      browser
```

Персональные данные:

```text
                          ПЕРСОНАЛЬНЫЕ ДАННЫЕ

                         ┌──────────────┐
                         │   browser    │
                         └──────┬───────┘
                                │
                       immediate write/read
                                │
                         ┌──────▼───────┐
                         │ localStorage │
                         └──────┬───────┘
                                │
                          background sync
                                │
                         ┌──────▼───────┐
                         │   Supabase   │
                         │ Auth + PG    │
                         └──────────────┘
```

Если Supabase недоступен:

- feed продолжает работать;
- пользователь может отмечать события;
- daily ticks, notes и custom events сохраняются локально;
- UI показывает offline/pending sync state;
- изменения отправляются позже.

Supabase не входит в ingestion path и не может остановить публикацию игровых событий.

---

## 5. Identity model

### 5.1 Account

`auth.users.id` — идентификатор человека в Supabase.

Первоначально:

```text
Google account
    ↓
Supabase Auth user
```

Мы не храним пароль пользователя и не запрашиваем Google API scopes сверх необходимых для sign-in.

### 5.2 Profile

Даже при UX «один account = один человек» пользовательский state **не должен ссылаться напрямую на `auth.users.id`**.

Вместо этого:

```text
auth.users
    │
    └── profiles
           │
           ├── progress
           ├── daily_marks
           ├── ignored
           ├── preferences
           ├── custom_games
           └── custom_events
```

При создании пользователя автоматически создаётся один profile:

```text
name = "Default"
is_default = true
```

В первой версии UI не показывает profile selector.

Причина: если позже человеку понадобится:

```text
Main
Genshin Asia
HSR Alt
```

мы добавим ещё строки `profiles` и selector, не меняя sync/data ownership остальных таблиц.

---

## 6. Supabase schema

Это design shape, не финальная migration SQL. Реализация должна идти через versioned SQL migrations и тесты RLS.

### 6.1 Profiles

```sql
profiles
--------
id            uuid primary key
owner_id      uuid not null references auth.users(id) on delete cascade
name          text not null
is_default    boolean not null default false
created_at    timestamptz not null
updated_at    timestamptz not null
```

Нужен unique partial constraint/index:

> у одного `owner_id` не более одного `is_default = true`.

Первый profile создаётся автоматически при первом создании Auth user либо idempotent bootstrap-функцией. Решение должно быть race-safe при одновременном первом входе на двух устройствах.

### 6.2 Progress

Одна логическая строка на event occurrence / event ID.

```text
progress
--------
profile_id
event_id
status             nullable: doing | done
effort             nullable
daily_override     nullable boolean
note               nullable text
deleted            boolean
changed_at         timestamptz
mutation_id        uuid
PRIMARY KEY(profile_id, event_id)
```

`deleted = true` означает explicit tombstone: пользователь очистил запись целиком. Простое отсутствие строки не означает удаление.

### 6.3 Daily marks

Нынешний local format хранит массив `days[]` на event. Для cloud sync это неудобно: снятая галочка должна быть отдельной синхронизируемой операцией.

Cloud shape:

```text
daily_marks
-----------
profile_id
subject_id         event id или dailies:<game>
day_key            YYYY-MM-DD в game-day space
completed          boolean
changed_at
mutation_id
PRIMARY KEY(profile_id, subject_id, day_key)
```

`completed = false` — tombstone для снятой галочки. Строка не удаляется сразу.

Это сохраняет существующую семантику game-day keys из `docs/DATA-MODEL.md`.

### 6.4 Ignored

Нынешняя модель «membership = ignored» недостаточна для multi-device sync.

```text
ignored
-------
profile_id
event_id
ignored            boolean
changed_at
mutation_id
PRIMARY KEY(profile_id, event_id)
```

`ignored = false` означает explicit unignore и не может быть воскрешён старым устройством.

### 6.5 Preferences

Не хранить все preferences одной LWW JSON-строкой: изменение theme на одном устройстве не должно стирать более свежее изменение region/gameOrder на другом.

```text
preferences
-----------
profile_id
key
value              jsonb
changed_at
mutation_id
PRIMARY KEY(profile_id, key)
```

Каждое top-level поле `Prefs` — отдельный logical register:

- region
- hiddenGames
- knownGames
- gameOrder
- focusGame
- sort
- view
- visibleCategories
- timelineDayWidth
- timelineGroup
- showUpcoming
- timelineSplitUpcoming
- detectDaily
- showChores
- showCompleted
- showIgnored
- theme
- regionConfirmed
- onboarded

Arrays остаются одной value для соответствующего key. Мы не пытаемся merge'ить элементы `gameOrder` по отдельности.

### 6.6 Custom games / custom events

Можно хранить payload JSONB, потому что клиент уже имеет Zod schema и эти записи не нужны для server-side поиска.

```text
custom_games
------------
profile_id
local_id
payload             jsonb nullable
deleted             boolean
changed_at
mutation_id
PRIMARY KEY(profile_id, local_id)

custom_events
-------------
profile_id
local_id
payload             jsonb nullable
deleted             boolean
changed_at
mutation_id
PRIMARY KEY(profile_id, local_id)
```

При `deleted = true` payload может оставаться для diagnostics/recovery либо быть null. Выбор должен быть единообразным.

---

## 7. Version / conflict semantics

### 7.1 Logical version

Каждая синхронизируемая запись имеет:

```text
changed_at
mutation_id
```

Сравнение версии:

1. более поздний `changed_at` побеждает;
2. при равном времени `mutation_id` используется как стабильный tie-breaker.

Это LWW-register на уровне одной logical row.

### 7.2 Почему не использовать только момент загрузки на сервер

Если телефон изменил запись offline вчера, а ПК изменил её сегодня online, телефон не должен победить только потому, что подключился к сети завтра и загрузил старое изменение позже.

Поэтому сервер должен сравнивать **время пользовательского изменения**, а не только arrival time.

### 7.3 Clock skew

Первая версия принимает практическое допущение: системные часы пользовательских устройств синхронизированы достаточно хорошо для персонального календаря.

Защита:

- хранить также server receipt timestamp для diagnostics;
- при обнаружении очень большого расхождения device/server time показывать sync warning и не делать вид, что conflict order гарантирован;
- не использовать client timestamps для security decisions.

Если реальная эксплуатация покажет проблемы, протокол можно усилить server revisions / conflict UI без изменения таблиц ownership.

### 7.4 Granularity

- progress конфликтует на уровне event record;
- daily — на уровне одного `subject + day`;
- ignored — на уровне event;
- prefs — на уровне top-level key;
- custom game/event — на уровне объекта.

Это сознательный баланс между корректностью и сложностью.

---

## 8. Server-side conditional apply

Обычный blind `upsert` недостаточен: старое offline устройство не должно перезаписать более новую cloud row.

Нужна server-side операция:

> применить incoming row только если incoming version новее stored version.

Рекомендуемый вариант — authenticated Postgres RPC / SQL function, принимающая bounded batch mutations.

Концептуально:

```text
apply_profile_mutations(profile_id, mutations[])
    ├─ verify caller owns profile
    ├─ validate entity kind / payload shape envelope
    ├─ INSERT when row absent
    └─ UPDATE only when incoming (changed_at, mutation_id) > stored version
```

После apply клиент получает accepted/current versions либо делает pull.

Не использовать secret/service credential в браузере.

Если функция реализуется как `SECURITY DEFINER`, она обязана:

- жёстко проверять ownership через `auth.uid()`;
- фиксировать безопасный `search_path`;
- не принимать произвольные table/column names;
- иметь отдельные RLS/permission tests.

Предпочтительнее `SECURITY INVOKER`, если требуемая conditional-upsert логика нормально работает с RLS.

---

## 9. Row Level Security

Все пользовательские таблицы должны:

- иметь RLS enabled;
- не давать `anon` доступ к персональным данным;
- давать `authenticated` только необходимые operations;
- проверять, что profile принадлежит `auth.uid()`.

Логическое правило:

```text
profiles.owner_id == auth.uid()
```

Для child table:

```text
EXISTS (
  profile where
  profile.id = child.profile_id
  AND profile.owner_id = auth.uid()
)
```

RLS тестируется отдельно для каждой таблицы:

- owner может select;
- owner может insert/update разрешённые строки;
- user A не может читать user B;
- user A не может писать в profile user B;
- unauthenticated client не может читать/писать;
- попытка сменить ownership запрещена.

Supabase publishable key допустим в browser bundle только потому, что реальный доступ ограничивают Auth + grants + RLS.

Secret key никогда не хранится:

- в public GitHub repository;
- в GitHub Pages assets;
- в browser localStorage;
- в frontend environment variables, попадающих в bundle.

---

## 10. Google Auth

Первая версия поддерживает только Google.

Flow:

```text
[Continue with Google]
        ↓
Supabase Auth
        ↓
Google consent/sign-in
        ↓
redirect обратно в Event Clock
        ↓
Supabase session
        ↓
resolve default profile
        ↓
bootstrap local cache + sync
```

Для GitHub Pages важно не использовать callback path, который Pages не умеет обслужить напрямую.

Предпочтение:

- redirect к реальному base URL приложения;
- callback query/code обрабатывается клиентом;
- production и localhost URLs явно внесены в allow-list.

На этапе реализации сверить актуальные Supabase Google Auth instructions.

Минимальные Google scopes:

- `openid`
- email
- basic profile

Не сохранять Google provider token: для Event Clock он не нужен.

---

## 11. Local storage v2

### 11.1 Почему нужен profile scope

Сейчас ключи глобальные:

```text
gacha-tracker:v1:progress
gacha-tracker:v1:daily
...
```

После auth это опасно: пользователь B не должен увидеть cached state пользователя A после смены session.

Новая форма:

```text
gacha-tracker:v2:profiles
gacha-tracker:v2:activeProfile

gacha-tracker:v2:profile:<profileId>:progress
gacha-tracker:v2:profile:<profileId>:daily
gacha-tracker:v2:profile:<profileId>:ignored
gacha-tracker:v2:profile:<profileId>:prefs
gacha-tracker:v2:profile:<profileId>:customGames
gacha-tracker:v2:profile:<profileId>:customEvents
gacha-tracker:v2:profile:<profileId>:syncMeta
gacha-tracker:v2:profile:<profileId>:outbox
```

Signed-out use получает отдельный stable local guest profile:

```text
local:<random-id>
```

Remote profiles используют Supabase profile UUID.

### 11.2 Active profile bootstrap

User-owned hooks не должны инициализироваться до того, как определено, какой profile активен.

Boot:

1. загрузить cached Supabase session;
2. если session валидна — выбрать cached/default remote profile;
3. иначе выбрать local guest profile;
4. только после этого читать scoped progress/daily/prefs.

Это предотвращает даже кратковременное отображение чужого cached progress после account switch.

### 11.3 Theme pre-paint

Текущий pre-paint script читает `prefs` до React.

После profile scoping он должен:

1. прочитать `activeProfile`;
2. прочитать scoped prefs;
3. применить theme;
4. при невозможности — использовать default theme.

Это отдельный regression test, потому что иначе миграция profiles может вернуть flash неправильной темы или потерять stored choice.

---

## 12. Миграция существующего v1 localStorage

Это data migration, не cleanup.

Правила:

- старые `gacha-tracker:v1:*` keys не удаляются;
- migration idempotent;
- повторный запуск не дублирует данные;
- если v2 profile уже содержит более свежие данные, v1 не откатывает их;
- legacy `completions` продолжает поддерживаться текущей progress migration logic.

Первый запуск v2:

```text
v1 data found
     ↓
create local guest profile
     ↓
copy/transform into v2 scoped stores
     ↓
mark migration completed
     ↓
leave v1 untouched
```

До sign-in это должно выглядеть для пользователя абсолютно как нынешнее приложение.

---

## 13. Первый Google login на существующем браузере

После sign-in возможны три сценария.

### A. Cloud profile пустой, local guest содержит данные

Показать явный migration prompt:

```text
Найден локальный прогресс

• N событий с progress
• N daily marks
• N ignored
• N custom events

[Сохранить в мой аккаунт]
[Пока не переносить]
```

Ничего не загружать в cloud без явного действия пользователя.

При подтверждении:

- progress/daily/ignored/custom data конвертируются в sync rows;
- prefs также загружаются, потому что cloud profile пуст;
- после успешного sync remote profile становится active;
- guest local copy остаётся backup/inert, не удаляется.

### B. Cloud profile уже содержит данные, local guest пуст

Просто загрузить/активировать cloud profile.

### C. Cloud и local guest оба содержат данные

Не делать blind replacement.

Предлагаемый default:

> Merge local progress into account.

При таком merge:

- progress: newer record wins;
- daily: каждый существующий tick становится `completed=true` mutation;
- ignored: local ignored becomes explicit `true`;
- custom games/events merge by stable local id/version;
- **cloud prefs выигрывают по умолчанию**, потому что старый v1 prefs не имеет надёжного per-field changed_at;
- отдельная кнопка «Import local settings too» может быть добавлена позже либо использовать существующий Export all workflow.

До подтверждения local guest ничего в cloud не пишет.

---

## 14. Обычная работа sync engine

### 14.1 Local-first mutation

Любое действие пользователя:

```text
tap / edit
   ↓
React state
   ↓
profile-scoped localStorage
   ↓
append/update outbox mutation
   ↓
UI завершает действие
```

Сеть не участвует в критическом path UI.

### 14.2 Sync cycle

В первой версии full-profile объём мал, поэтому нет необходимости сразу строить сложный delta cursor protocol.

Один sync cycle:

1. проверить session;
2. pull remote rows активного profile;
3. merge remote → local по logical versions;
4. отправить bounded outbox batch через conditional apply;
5. повторно получить affected/current rows;
6. привести local cache к converged state;
7. удалить из outbox только подтверждённые mutations;
8. записать `lastSuccessfulSyncAt`.

Триггеры:

- после sign-in/bootstrap;
- когда вкладка возвращается в foreground;
- browser `online` event;
- debounce после локального изменения;
- редкий periodic foreground sync.

Точные интервалы — implementation detail; они не должны превращать каждую галочку в обязательный network round-trip.

### 14.3 Realtime

Не нужен в первой версии.

Для одного человека на нескольких устройствах foreground/poll-on-change достаточно. Realtime можно добавить позже поверх той же БД, если появится реальная необходимость.

---

## 15. Local sync metadata

Каждый profile имеет внутренний `syncMeta`:

```text
schemaVersion
lastSuccessfulSyncAt
lastAttemptAt
lastError
serverClockOffset?       optional diagnostic
```

И `outbox`:

```text
mutationId
entityKind
entityKey
changedAt
payload / deleted state
```

Outbox должен переживать refresh/закрытие вкладки.

Mutation удаляется из outbox только после подтверждения сервером, что:

- она принята, либо
- сервер уже содержит более новую version той же logical row.

Повторная отправка одной mutation должна быть idempotent.

---

## 16. Semantics по текущим store

### Progress

Нынешний `mergeProgress` уже использует newer `at` wins.

Cloud sync сохраняет эту идею, но:

- очищенный progress превращается в tombstone;
- server conditional apply не даёт старой offline записи воскресить очищенную.

### Daily

Нынешний import делает union, что правильно для backup, но недостаточно для sync.

Для sync:

```text
(subject, day) -> completed true/false + version
```

Export/import file может продолжать показывать только completed days для совместимости. Внутренняя sync representation не обязана совпадать с export wire format.

### Ignored

Backup import может по-прежнему сохранять текущую additive semantics.

Cloud sync использует explicit true/false register.

Это разные задачи:

- backup обязан не потерять mark случайно;
- sync обязан переносить намеренное unignore на другие устройства.

### Preferences

Cloud sync — LWW per top-level preference key.

Standard Import по-прежнему не импортирует prefs.
Import all импортирует их как пользовательские mutations активного profile.

### Custom games/events

Delete создаёт tombstone.

Renames/edits сохраняют стабильный `local_id`.

Occurrence IDs повторяющихся custom events остаются derived и никогда не становятся отдельными cloud custom-event rows; progress на occurrence синхронизируется как обычный opaque `event_id`.

---

## 17. Sign out / account switching

При sign out:

- не удалять cloud-backed local cache автоматически;
- profile становится inactive;
- UI переключается на local guest profile;
- cached profile A не должен быть прочитан guest/profile B;
- outbox profile A остаётся связан с A и может быть отправлен только после повторной auth как owner A.

Если в будущем разрешим переключение нескольких Google accounts в одном browser, это правило уже предотвращает смешивание данных.

Можно позже добавить явное:

> Remove cached data for this account from this device

Но это не часть первой версии.

---

## 18. Export / import после появления аккаунтов

Export/import остаётся обязательным escape hatch.

### Export

Экспортирует active profile state в текущем человекочитаемом JSON format.

Cloud metadata (`mutation_id`, server receipt timestamps, auth IDs) в обычный export не нужны.

### Import

Импорт в signed-in profile:

1. валидируется как сейчас;
2. преобразуется в local mutations;
3. сразу появляется в UI;
4. попадает в outbox;
5. затем синхронизируется в cloud.

Импорт не пишет напрямую в Supabase в обход local state.

Это сохраняет один mutation path для всех изменений.

---

## 19. Failure states

UI должен различать:

### Synced

```text
☁ Synced
Last sync: just now
```

### Pending/offline

```text
Offline — changes saved on this device
```

Это не error.

### Temporary sync error

```text
Sync failed — will retry
```

Local data остаётся рабочим.

### Auth expired

Приложение не должно стирать/скрывать local cache неожиданно. Показать:

```text
Sign in again to sync
```

Но не отправлять account outbox без валидной session.

### Schema incompatible

Никогда не пытаться «примерно понять» новую cloud schema.

Клиент должен иметь sync schema version и fail closed для cloud sync, продолжая local-only operation.

---

## 20. Security boundaries

### Browser may contain

- Supabase project URL;
- Supabase publishable key;
- current user's Supabase session;
- только data, разрешённые RLS.

### Browser must never contain

- Supabase secret key;
- legacy service-role credential;
- Google OAuth client secret;
- database admin password;
- backup credentials.

### Repository

Public repo может содержать:

- schema migrations;
- RLS policies;
- publishable Supabase config strategy;
- client implementation.

Не коммитить private credentials.

Google client secret хранится в Supabase/Google configuration, не в GitHub Pages bundle.

### OAuth scopes

Не запрашивать Google Drive/Gmail/Calendar и другие scopes. Google используется только для identity.

---

## 21. Backups

Cloud sync и backup — разные функции.

Первая sync release не зависит от автоматического GitHub backup.

После стабилизации можно добавить:

```text
Supabase
   ↓ scheduled export / pg dump
private GitHub backup repository
```

Цели:

- независимая копия user data;
- восстановление после operator mistake;
- компенсация ограничений managed backups на бесплатном плане.

Существующий manual Export all остаётся ещё одним независимым backup path.

---

## 22. Supabase dependency assumptions

На момент проектирования официальная документация Supabase подтверждает:

- Google social login поддерживается;
- browser client должен использовать publishable key;
- secret key предназначен только для trusted backend code;
- Auth token + RLS предназначены для ограничения строк конкретному пользователю;
- RLS policy tests поддерживаются через Supabase tooling.

Перед implementation milestone ещё раз проверить актуальные provider setup и key guidance, потому что SaaS configuration может измениться.

Ссылки:

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth

---

## 23. Testing requirements

### Pure/local tests

- v1 → v2 migration не теряет progress;
- migration idempotent;
- old v1 keys остаются;
- profile A state никогда не читается profile B;
- sign-out активирует guest, не A cache;
- progress tombstone побеждает старую active row;
- daily `false` побеждает старую `true`;
- ignored `false` побеждает старую `true`;
- prefs конфликтуют независимо по key;
- custom event delete не воскресает от старого device snapshot;
- outbox survives reload;
- повторная ack одной mutation idempotent;
- occurrence progress продолжает работать по opaque ID;
- pre-paint theme читает active scoped profile.

### Sync simulation

Два независимых in-memory/local stores:

1. оба начинают с одного snapshot;
2. device A и device B делают изменения offline;
3. синхронизируются в разных порядках;
4. финальный state одинаков.

Минимальные cases:

- A: doing, B: done;
- A меняет note, B меняет ту же progress row;
- tick → un-tick на другом device;
- ignore → unignore;
- custom event edit vs stale copy;
- custom event delete vs stale copy;
- prefs theme + region на разных устройствах;
- повторная доставка mutation;
- sync после долгого offline периода.

### Supabase integration tests

- RLS owner access;
- cross-user denial;
- anon denial;
- conditional mutation apply;
- stale mutation refused/no-op;
- exact replay idempotent;
- profile bootstrap race;
- cascade cleanup of profile child rows where intended.

### UI smoke

- signed-out calendar работает как раньше;
- Google login;
- first-login local migration;
- reload сохраняет session/profile;
- device/browser B получает cloud progress;
- offline edits видны сразу;
- reconnect sends pending;
- sign out скрывает account progress;
- sign in снова восстанавливает тот же profile.

---

## 24. Implementation milestones

### Milestone S1 — sync primitives, без Supabase

Цель: доказать semantics локально.

- shared mutation/version types;
- tombstone semantics;
- normalized daily sync representation;
- per-key prefs merge;
- outbox;
- deterministic two-device simulation tests;
- никаких UI/auth/network changes.

### Milestone S2 — profile-scoped local storage

- local guest profile;
- v2 scoped keys;
- safe v1 migration;
- active-profile bootstrap;
- pre-paint theme adaptation;
- export/import against active profile;
- никаких cloud calls.

После S2 приложение визуально должно вести себя почти идентично текущему.

### Milestone S3 — Supabase foundation

- Supabase project config files/migrations;
- profiles + user-state tables;
- indexes;
- RLS grants/policies;
- conditional apply RPC;
- Supabase DB/RLS tests;
- production UI ещё может не показывать login.

### Milestone S4 — Google Auth + first-login migration

- browser Supabase client;
- Google sign-in/out;
- actual GitHub Pages callback handling;
- default-profile bootstrap;
- local guest → account migration prompt;
- cloud/local merge when оба непустые;
- minimal Account settings UI.

### Milestone S5 — production sync engine

- pull/merge/push;
- durable outbox;
- foreground/online/debounce triggers;
- status UI;
- failure/retry behavior;
- two real browsers/device smoke;
- no realtime yet.

### Milestone S6 — backup and hardening

После нескольких дней реального использования:

- private GitHub backup strategy;
- recovery drill;
- optional cache removal control;
- monitoring/logging достаточное для 2–3 пользователей;
- documentation/maintenance update.

Multi-profile UI — отдельный future milestone и не блокирует S1–S6.

---

## 25. Что потребуется от владельца проекта вручную

На S3/S4:

1. создать Supabase project;
2. создать/configure Google OAuth Web application;
3. внести production GitHub Pages origin;
4. внести localhost development origin;
5. добавить Supabase callback URL в Google;
6. включить Google provider в Supabase;
7. задать Supabase Site URL / redirect allow-list;
8. передать приложению только:
   - project URL;
   - publishable key.

Google client secret остаётся в provider configuration.

Никакой платный сервер для первой версии не требуется.

---

## 26. Release gates

Cloud sync нельзя считать готовым, пока не выполнены все условия:

- existing signed-out/local-only user не потерял ни одной записи;
- все старые event IDs продолжают находить progress;
- два браузера одного account сходятся к одному state;
- снятые галочки и unignore не воскресают;
- cross-user RLS проверен отрицательными тестами;
- service/secret key отсутствует в bundle;
- offline изменения переживают reload;
- auth/network failure не ломает event feed;
- export/import остаётся рабочим;
- sign-out не показывает cached данные другого account;
- production Google OAuth проверен именно на GitHub Pages URL.

---

## 27. Open decisions перед S1

Большая часть архитектуры уже выбрана. Перед кодом нужно окончательно подтвердить только несколько product details:

1. **Signed-out mode остаётся полноценным?**  
   Предлагается: да. Account нужен только для sync.

2. **Первый login переносит local data только после подтверждения?**  
   Предлагается: да.

3. **Если cloud и local guest оба непустые, импортировать local prefs автоматически?**  
   Предлагается: нет; cloud prefs сохранить, progress/content merge.

4. **Оставлять account cache после sign-out?**  
   Предлагается: да, но inert и недоступным другому profile; позже дать отдельную кнопку очистки устройства.

5. **Google — единственный provider первой версии?**  
   Предлагается: да.

6. **Multiple profiles показывать сейчас?**  
   Нет. Схема поддерживает, UI откладывается до реального сценария.

---

## 28. Следующий конкретный шаг

После review этого design document:

> реализовать **S1 — sync primitives** отдельно от Supabase и UI.

Не создавать Supabase project и не менять production auth до того, как two-device conflict tests докажут локальную merge/tombstone semantics.
