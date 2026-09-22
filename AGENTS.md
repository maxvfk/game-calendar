# AGENTS.md

Рабочие правила `maxvfk/game-calendar`.

## Назначение

Публичная PWA с единым календарём событий для Genshin Impact, Honkai: Star
Rail, Wuthering Waves, Zenless Zone Zero, Arknights: Endfield, Neverness to
Everness и Chaos Zero Nightmare.

Главный пользовательский вопрос: **что заканчивается раньше всего и что нужно
успеть сделать**. Неправильная уверенная дата хуже отсутствующей даты.

## Неподвижные правила данных

- Не угадывать отсутствующий год, время или дату окончания.
- `endsAt: null` означает действительно неизвестное окончание.
- Не смешивать `official`, `estimated`, `datamined` и `leak` provenance.
- Каждый опубликованный event должен иметь source URL и время проверки.
- Автоматические parser results и AI/manual reviewed records проходят одну
  schema validation и одни calendar sanity checks.
- Массовое исчезновение событий, резкое изменение границ и parser zero должны
  останавливать публикацию либо переводить записи в review.
- Event IDs являются ключами `localStorage`; менять схему ID без миграции нельзя.

## Данные upstream

Код импортирован из `StereotypicalCat/gacha-event-tracker` на ревизии
`9c030ec174d0d390a916b92aa32b76071ec38a91` по MIT.

Event fixtures и snapshots upstream не наследуются. Новые snapshots должны быть
получены этим репозиторием самостоятельно с соблюдением `robots.txt`, условий
источника, attribution и request interval.

Для документированных публичных API действует отдельная проверка условий API,
а не разрешение на обход HTML-сайта. Узко ограниченный NTE Steam transport и
основание доступа описаны в `docs/NTE-STEAM.md`; это не общее исключение из robots.

## Pipeline

```text
automatic sources ─┐
                   ├─ normalize → validate → merge → events.v1.json → PWA
reviewed records ──┘
```

Текущее состояние: automatic snapshot ingestion и schema-validated reviewed
channel работают. Reviewed files находятся в `data/reviewed/*.json`; leak rows
по умолчанию исключаются. Отсутствующий source отображается как unavailable, а
не заменяется fixture из другого проекта.

## Команды проверки

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

Перед публикацией изменения должны проходить все четыре команды. Сетевой
refresh не входит в обычный test/build и запускается отдельно.

## Документация upstream

Файлы в `docs/` пока сохраняют подробное описание исходной архитектуры и служат
reference material. Если новая реализация делает их утверждения неверными,
обновляй соответствующий документ или явно помечай отличие проекта.
