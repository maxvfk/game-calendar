# Game Calendar

Единый timeline событий для нескольких gacha-игр, отсортированный прежде всего
по ближайшему окончанию события.

## Игры проекта

- Genshin Impact
- Honkai: Star Rail
- Wuthering Waves
- Zenless Zone Zero
- Arknights: Endfield
- Neverness to Everness
- Chaos Zero Nightmare

## Текущий статус

Первый воспроизводимый import готов: PWA-интерфейс, timeline, checklist,
локальные отметки выполнения, offline cache, schema validation, тесты и GitHub
Pages workflow. Event data импортируется только из snapshots, полученных этим
репозиторием независимо. Если источник ещё не получен, lane помечается
недоступным — дата не подставляется предположением.

На первом этапе автоматически доступен источник Endfield wiki.gg. Источники,
закрытые для GitHub Actions или текущего runner, будут подключаться через
отдельный reviewed ingestion channel.

## Локальный запуск

Нужен [Bun](https://bun.sh/) 1.3+.

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
bun run dev
```

Сайт откроется на `http://localhost:3000`.

## Обновление источников

```bash
bun run refresh --dry-run
bun run refresh --only endfield-wikigg-events
```

Scheduled workflow запускается дважды в сутки. Он соблюдает `robots.txt`,
минимальный шестичасовой интервал для каждого источника и не повторяет
неудачный запрос в рамках одного цикла.

## Происхождение кода

Проект основан на MIT-коде
[`StereotypicalCat/gacha-event-tracker`](https://github.com/StereotypicalCat/gacha-event-tracker),
ревизия `9c030ec174d0d390a916b92aa32b76071ec38a91`.

Исходные `fixtures/`, `snapshots/` и собранный event feed upstream-проекта не
переносились. Текущие данные получаются и атрибутируются отдельно. Оригинальные
`LICENSE` и `NOTICE` сохранены.

## Публикация

GitHub Pages собирается workflow `.github/workflows/ci.yml`. Для первого запуска
в настройках репозитория нужно выбрать:

`Settings → Pages → Source → GitHub Actions`.

## Обратная связь

- [Сообщить об ошибке](https://github.com/maxvfk/game-calendar/issues/new?template=bug_report.yml)
- [Предложить функцию](https://github.com/maxvfk/game-calendar/issues/new?template=feature_request.yml)
