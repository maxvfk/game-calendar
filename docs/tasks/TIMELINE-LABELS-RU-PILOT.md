# Timeline labels in Russian — EN/RU switch and a ZZZ pilot

**Status:** planned 2026-11-26, nothing implemented. It replaces step 3 of the
[practical plan](PRACTICAL-PARSER-LABELS-PLAN.md#revision-2026-11-24-current-order) (the label
policy for the [#175](https://github.com/maxvfk/game-calendar/pull/175) case). Work starts only
on an explicit operator GO, as one PR (or two: switch, then pilot), each merged on its own GO.

## Why

The labels exist so that the Timeline says what is going on, in words the player recognises.
Official English names often say nothing. The operator plays in Russian, and the Russian
in-game names are not literal translations, so an English name is hard to match to the game.

Today a label cannot do that job:

- **Labels are English only.** `data/presentation/timeline-label-preferences.v1.json` says
  "Do not translate into Russian".
- **The labeller gets thin input.** It sees the English title, type, featured subjects and a
  one- or two-line summary, never the notice itself. "Antivirus Log: Bangboo Repair" (ZZZ,
  #175) is a retelling of that summary. It matches neither the English name nor what the game
  shows in Russian.
- **`titleRu` is never shown.** The schema stores an official Russian name, but only 6 rows
  have one and the client never displays it.

Rejected:

- **Always keep the official name.** It defeats the purpose of labels.
- **Option A of the plan, "the label must contain the English official name".** It ties the
  label to the English name, which is the very text that is not recognisable.
- **Russian news parsers or new Russian sources.** They would double the parser work.

## Decision

Keep the English labels exactly as they are. Add a Russian track next to them, and a switch.

### 1. EN/RU switch (client)

- A small EN/RU control on the Timeline, stored in the reader's prefs (`usePrefs`, local to the
  device, like the region). Default: EN.
- **EN mode is unchanged.** Same labels, same fallback, same output as today; a test pins it.
- **RU mode** shows the first one that exists:
  1. the Russian label;
  2. the official Russian name (`titleRu`);
  3. the English label;
  4. today's identity without a label (featured subjects, else the official English title).

  No event is ever left without a name.
- Event Detail keeps showing the official title. In RU mode it also shows `titleRu` when present.
- Out of scope for the pilot: syncing the choice between devices.

### 2. Russian label ledger

- A second ledger, `data/presentation/timeline-labels.ru.v1.json`, next to the English
  `timeline-labels.v1.json`. It has the same decision format (`label`, `keep_original`,
  `needs_research`), the same fingerprints and the same lifecycle.
- The two ledgers decide independently. An event can be `keep_original` in English and still
  need a Russian label, because its English name says nothing in Russian.
- Its own preferences file (`timeline-label-preferences.ru.v1.json`, language `ru`). The English
  preferences file does not change.
- `build:feed` adds the approved Russian label as a separate feed field (for example
  `timelineTitleRu`), the same way it adds `timelineTitle` today.

### 3. Glossary of in-game Russian terms

- A small hand-edited file per game, for the pilot `zzz` only: English term → the official
  Russian term the game shows. It covers characters, Bangboo, W-Engines, modes and currencies.
  Examples: Bangboo → Банбу, Shiyu Defense → Оборона Шиюй.
- It starts with the terms that the current ZZZ events actually use (a few dozen lines) and
  grows by one or two names a version.
- The labeller takes names only from the glossary and never invents a translation. If a term
  is missing, it returns `needs_research` instead of guessing.

### 4. Anchor check for Russian labels

- A Russian label must contain at least one anchor the player can see in the game: a glossary
  term, the Russian form of a featured subject, or `titleRu`.
- A label without an anchor is **rejected** when decisions are accepted, not only warned about,
  so the daily run cannot record a label like "Antivirus Log" later.

### 5. `titleRu`, only where it is cheap

- For rows entered by hand from official notes (the Endfield, ZZZ and CZN per-version check),
  take the name from the Russian version of the same notice.
- For any event the operator does not recognise, add `titleRu` by hand, once.
- No bulk fill and no new source.

## Pilot scope (ZZZ)

- The switch and the RU-mode fallback (part 1) for all games.
- The Russian ledger, its preferences, the ZZZ glossary and the anchor check (parts 2–4).
- Russian decisions for the currently published ZZZ events, produced once and reviewed by the
  operator in the PR. In RU mode the other games fall back to their English labels.
- **Not in the pilot:** the daily `timeline-labels.yml` run for the Russian ledger, other games,
  changes to English labels or preferences, and new sources.

## Acceptance

- In RU mode, on phone and desktop, the operator can match the current ZZZ events to the game.
- EN mode renders exactly as before.
- Tests cover:
  - the fallback order;
  - the anchor check, with a case like "Antivirus Log: Bangboo Repair" rejected;
  - the ledger and glossary formats.
- CI is green.

**Rollback:** switch back to EN. Removing the RU files restores today's state, because the
event data is not touched.

## After the pilot

Each of these is a separate decision:

- extend the glossary and Russian labels to other games;
- add the Russian ledger to the daily `timeline-labels.yml` run (it uses DeepSeek by default;
  its cost would roughly double);
- close #175 as superseded.
