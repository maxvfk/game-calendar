**PR #115 пока не готов к operator GO: обнаружены один BLOCKER и один IMPORTANT. Оба воспроизведены локально.**

Проверены текущий `main` **`ed773a8`**, head PR **`794bda2`**, полный diff, task/design/evidence, migration, reader/accept/writer, workflows и тесты. PR остаётся открытым draft. Репозиторий и настройки GitHub не изменялись.

### BLOCKER — тесты блокируют штатные release, новые записи и rollback

**Место:** [test/timeline-cutover.test.ts:17–20](https://github.com/maxvfk/game-calendar/blob/794bda294d3f4e4e31a67b35035d66ace1dbb9d1/test/timeline-cutover.test.ts#L17-L20), [51–67](https://github.com/maxvfk/game-calendar/blob/794bda294d3f4e4e31a67b35035d66ace1dbb9d1/test/timeline-cutover.test.ts#L51-L67), [93–106](https://github.com/maxvfk/game-calendar/blob/794bda294d3f4e4e31a67b35035d66ace1dbb9d1/test/timeline-cutover.test.ts#L93-L106).

Тесты загружают изменяемые production-файлы как неизменные исходные fixtures. Затем требуют исходные 75 решений, совпадение v2 с историческим v1 и `admission: frozen`.

**Воспроизведение в изолированных копиях:**

| Штатное действие | Результат |
|---|---|
| Изменить только `admission: frozen → open` | Падение на строке 62: ожидалось `frozen`, получено `open` |
| Добавить 76-е решение через настоящий `acceptStoredTimelineProposals()` | Accept успешен; тест падает на строке 57 из-за несовпадения с историческим v1 |
| Применить результат `prepareRollback()` | Reader-тест падает на строке 96: ожидалась версия 2, выбрана 1 |

**Последствие:** предусмотренный runbook release не получает обязательный зелёный CI. Даже при обходе этого препятствия следующая запись M4 остановится на `bun test` перед commit/push. Документированный rollback также не проходит существующий suite.

Проблему скрывает интеграционный тест writer: [строки 219–221](https://github.com/maxvfk/game-calendar/blob/794bda294d3f4e4e31a67b35035d66ace1dbb9d1/test/timeline-cutover.test.ts#L219-L221) заменяют `bun test` и `bun run …` успешными заглушками.

**Минимальное исправление:** вынести исторический baseline в неизменные fixtures; создавать тестовые frozen/open selectors явно. Проверки текущих production-файлов должны допускать легитимные записи и rollback. Проверить настоящий suite на состояниях release, post-write и rollback — без подмены тестового шага.

### IMPORTANT — rollback validator принимает незакоммиченный архив

**Место:** [scripts/timeline-cutover-operator.ts:45–46](https://github.com/maxvfk/game-calendar/blob/794bda294d3f4e4e31a67b35035d66ace1dbb9d1/scripts/timeline-cutover-operator.ts#L45-L46), [64–70](https://github.com/maxvfk/game-calendar/blob/794bda294d3f4e4e31a67b35035d66ace1dbb9d1/scripts/timeline-cutover-operator.ts#L64-L70).

Архив проверяется через `Bun.file()` в рабочем каталоге. `git diff HEAD` не учитывает untracked-файлы, а проверка изменённых путей не требует присутствия архива именно в candidate commit.

**Воспроизведение:** в существующем disposable rollback-тесте исключила архив из staging перед тестовым commit, сохранив файл на диске. Результат:

- в Git tree candidate архив отсутствует;
- `git status` показывает `?? data/presentation/cutover-archives/`;
- `validateCandidate()` и тест завершаются успешно.

**Последствие:** оператор может забыть добавить архив и получить положительную проверку candidate, который опубликуется без обещанного отдельного архива origin/evidence. Немедленной потери metadata здесь нет: прежний v2-файл и Git history сохраняются. Однако гарантия архивирования при rollback не обеспечена.

**Минимальное исправление:** проверять архив из Git object `${candidate}:${archivePath}`, сравнивая его точные байты с ожидаемыми. Добавить отрицательный тест для архива, существующего только в рабочем каталоге.

### Что подтверждено

- Свежий inventory из полного history совпадает с committed manifest.
- Все **75 решений**, fingerprints, labels и исходные поля сохранены; происхождение: **25 operator_approved / 50 automated / 0 legacy_unknown**.
- Evidence-triggered requeue остаётся отключённым; действующие fingerprint/decision guards сохраняются.
- Fixed-input parity четырёх публичных JSON проходит.
- Проверки устаревшего writer, ticket/epoch, fresh-main и CAS-гонки проходят в локальных сценариях.
- Разделение read-only propose / write record сохранено; расширения permissions в PR нет. Подтверждённого нового пути случайной публикации через artifacts не обнаружено.
- Независимо выполнены frozen install, typecheck, build и полный suite: **1352 pass / 3 skip / 0 fail** на исходном состоянии PR.
- [Exact-head CI](https://github.com/maxvfk/game-calendar/actions/runs/40574693954) успешен, включая PG17; Pages корректно skipped.

**Live gate остаётся неподтверждённым:** просмотрены все 524 Actions runs; активных M4 не обнаружено. Чтение Actions variable и workflow state отклонено connector’ом. Это не доказывает freeze будущего окна и не заменяет проверку оператора. Browser smoke самостоятельно не повторяла.

Дополнительных подтверждённых MINOR-дефектов не выделяю. После двух исправлений нужны повторное независимое ревью и отдельная проверка live freeze/GO.

**Вердикт: FIXES REQUIRED.**