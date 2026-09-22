# Snapshots

Raw source pages captured by `scripts/refresh-sources.ts` for this repository.
No event snapshots are inherited from the upstream project.

Files named `<source-id>.html` or `<source-id>.json` contain the response bytes.
An adapter's optional `contentKind` selects the request's Accept header and body
extension; omitted values retain HTML behavior. JSON snapshot metadata records
`contentKind: "json"`; legacy metadata without the field remains readable as HTML.
The parser interface stays string-based (JSON parsers validate and decode JSON).
Fixtures use the same extension and a capture-date suffix, for example
`fixtures/nte/steamnews-official-2026-09-22.json` (naming example, not a captured fixture).
Matching
`<source-id>.meta.json` files record freshness and attribution metadata.
Transient `*.state.json` bookkeeping stays gitignored.
