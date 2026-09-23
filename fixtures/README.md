# Fixtures

This repository does not inherit event-page fixtures from its upstream codebase.

Regression fixtures are added only after `maxvfk/game-calendar` captures a source
independently, records its provenance, and verifies that the source permits the
request. Until then, the build uses current snapshots when available and marks
missing source lanes as unavailable instead of inventing calendar data.

`genshin/kqm-ginews-2026-09-23.md` is a **curated factual schedule fixture**
from the independently fetched GINews README; it is not a verbatim snapshot.
Its heading lists, date tags and update schedule retain the facts needed by
the parser, while prose and images from the unlicensed mirror are omitted.
The live runner stores the actual response as an untracked `.md` snapshot.
`hsr/kqm-hsrnews-2026-09-23.md` follows the same factual extraction policy.
`wuwa/kuro-mirror-2026-09-23.xml` has selected Atom entry metadata and factual
schedule lines; article prose and images are omitted.
