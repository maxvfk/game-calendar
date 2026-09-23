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

PWA включает timeline, checklist, локальные отметки, offline cache и проверку
схемы событий. GitHub Pages собирает автоматические snapshots и проверенные
вручную записи для семи игр. Работающие automatic sources: официальный Steam
News для NTE, NTEBuild для Beyond the Rails, Prydwen для баннеров CZN и
Endfield wiki.gg. Парсеры KQM Genshin/HSR и Kuro Atom для WuWa добавлены;
первый штатный refresh этих трёх источников ещё проверяется. Охват остаётся
частичным: если источник недоступен или дата не подтверждена, она не
подставляется предположением.

Записи в `data/reviewed/*.json` требуют source URL, времени проверки и явного
provenance-статуса. `leak` по умолчанию не публикуется. Точные counts, дата
проверки, пробелы и следующий шаг — в
[`docs/IMPLEMENTATION-STATUS.md`](docs/IMPLEMENTATION-STATUS.md).

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

Проверенные вручную записи описаны в `data/reviewed/README.md`. Они проходят
общую schema validation во время `build:feed` и объединяются с автоматическими
источниками только после успешной проверки.

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

Для scheduled refresh также включите:

`Settings → Actions → General → Workflow permissions → Read and write permissions`.

## Обратная связь

- [Сообщить об ошибке](https://github.com/maxvfk/game-calendar/issues/new?template=bug_report.yml)
- [Предложить функцию](https://github.com/maxvfk/game-calendar/issues/new?template=feature_request.yml)
