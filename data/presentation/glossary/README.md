# Russian in-game glossary

Each `<game>.ru.json` file is a JSON array of entries with three fields.

| Field | Value |
| --- | --- |
| `en` | English in-game term |
| `ru` | Official Russian in-game term |
| `kind` | `character`, `bangboo`, `w-engine`, `weapon`, `mode`, `currency`, `item`, or `other` |

Use the spelling shown in the game or its official Russian notices. A missing
file is equivalent to an empty array. Use `needs_research` when a needed term
is missing.
