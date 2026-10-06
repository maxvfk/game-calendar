# Timeline Readability M1 — Recognition Metadata Contract

Status: **deferred — do not start until Account/User S6 work is complete or explicitly cleared by the coordinating project chat**  
Type: bounded implementation milestone  
Depends on: completed `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`  
Next milestone: `TIMELINE-READABILITY-M2-STICKY-SEMANTIC-TIMELINE.md`

## Start instruction

Continue `maxvfk/game-calendar` from the CURRENT `main`.

This is **Timeline Readability implementation milestone M1 only: Recognition metadata contract**.

Do not start this milestone until the currently active Account/User database and backup/recovery work has been completed or explicitly cleared by the coordinating project chat.

Before making changes:

- verify CURRENT `main`;
- read `AGENTS.md`;
- read `docs/IMPLEMENTATION-STATUS.md`;
- read the completed `docs/tasks/TIMELINE-READABILITY-UX-RESEARCH.md`;
- inspect `src/shared/schema.ts`;
- inspect the current event ingestion/reviewed-data schema and relevant validation/tests;
- inspect event ID generation and any serialization/export paths affected by additive event fields.

Use a fresh short-lived branch from CURRENT `main`.

## Scope

Implement only the semantic recognition metadata contract accepted in the completed Timeline UX specification.

Add optional:

```ts
recognitionSubjects?: string[]
```

to the canonical event data model.

Semantics:

- ordered list of genuine featured subjects used by players to recognize the event;
- character banner → featured character name(s);
- weapon / Light Cone / W-Engine / equivalent banner → featured item name(s);
- genuine co-headliners may contain multiple ordered subjects;
- optional for every event class;
- official `title` remains required and remains the fallback;
- presentation/ingestion code must not heuristically infer subjects from arbitrary marketing titles.

Validation should reject meaningless present values such as an empty array or empty subject strings while preserving compatibility with every existing event that omits the field.

## Compatibility requirements

Do not change:

- `eventId()` behavior;
- existing event IDs;
- completion/progress keys;
- event dates or precision;
- provenance;
- conflict semantics;
- Account Sync schema;
- Supabase personal-data migrations;
- user preferences;
- custom-event IDs.

Prove that old feed objects without `recognitionSubjects` remain valid.

Custom events must continue to work without this metadata.

Do not make the Timeline layout depend on complete metadata coverage.

## Representative data

Add only the **minimum reviewed/structured examples needed to exercise the contract**, if suitable current examples already have reliable evidence.

Useful representative cases are:

- one featured character;
- genuine two-character/co-headliner case;
- one non-character featured item such as a weapon / Light Cone / W-Engine equivalent;
- ordinary event with no recognition metadata and title fallback.

Do not conduct broad source research.

Do not attempt to populate the whole event catalogue.

Do not guess a subject where the current source/reviewed record does not establish it.

If no safe current example exists for one category, cover that shape in tests rather than inventing production metadata.

## Tests

Add focused tests for:

- omitted field;
- one subject;
- multiple ordered subjects;
- invalid empty array;
- invalid empty string;
- old feed compatibility;
- stable IDs before/after metadata addition;
- representative current feed generation.

Run the project-required validation:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

## Documentation

Update `docs/IMPLEMENTATION-STATUS.md` with:

- what was implemented;
- validation results;
- compatibility result;
- any representative records populated;
- remaining metadata-coverage work;
- explicit next concrete step: M2 Sticky semantic Timeline.

If implementation reveals that `recognitionSubjects?: string[]` is insufficient, do not silently redesign the contract. Stop and report the concrete contradiction to the coordinating chat.

## Out of scope

Do not:

- change Timeline rendering;
- change Timeline scrolling/viewport behavior;
- implement sticky deadlines;
- change TypeBadge behavior;
- add category grouping;
- implement artwork;
- redesign Event Details;
- perform broad metadata population;
- modify Account/User database work.

Finish after M1 is tested, documented and ready for review.
