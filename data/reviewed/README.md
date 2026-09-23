# Reviewed event records

Этот каталог — проверяемый fallback для источников, которые нельзя надёжно
получить из GitHub Actions. Каждый `*.json` проходит ту же итоговую Zod-схему,
что и автоматически разобранные события.

Правила:

- одна игра на файл;
- каждая дата имеет прямую `sourceUrl`;
- `reviewedAt` — фактическое время последней проверки источников;
- При точечном добавлении или повторной проверке у конкретной записи можно
  указать собственное `reviewedAt`. Тогда её `firstSeenAt` / `updatedAt` берутся
  из него, остальные строки сохраняют дату batch. Общий `reviewedAt` не
  обновляйте, если все записи файла не были проверены повторно.
- При повторной проверке уже опубликованной записи с отдельным `reviewedAt`
  сохраните её исходное `firstSeenAt` тем же полем в записи.
- неизвестное окончание записывается как `endsAt: null` вместе с
  `endPrecision: "unknown"`;
- `official`, `estimated`, `datamined` и `leak` не смешиваются;
- `leak` хранится для review, но не публикуется без `INCLUDE_LEAKS=true`;
- пустой список считается подтверждённым только при `statesNoEvents: true`.

Минимальный пример:

```json
{
  "schemaVersion": 1,
  "game": "hsr",
  "reviewedAt": "2026-09-21T12:00:00.000Z",
  "reviewedBy": "chatgpt",
  "statesNoEvents": false,
  "events": [
    {
      "title": "Example event",
      "titleRu": "Пример события",
      "type": "other",
      "summary": null,
      "startsAt": "2026-09-22T00:00:00.000Z",
      "startPrecision": "day",
      "endsAt": null,
      "endPrecision": "unknown",
      "regionScoped": false,
      "regionEnds": null,
      "sourceUrl": "https://example.com/official-announcement",
      "provenanceStatus": "official",
      "confidence": 1
    }
  ]
}
```

Не добавляйте пример как реальное событие. Перед commit запускайте:

```bash
bun run typecheck
bun test
bun run build:feed
```
