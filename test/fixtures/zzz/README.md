# ZZZ Steam RSS factual excerpts

`steam-rss-excerpts-2026-10-27.xml` is a reduced test-only excerpt of this
repository's own real Actions RSS capture from 2026-10-26T23:18:53.323Z
(2026-10-27 Moscow):
https://github.com/maxvfk/game-calendar/actions/runs/40418840773
Artifact 12696271497; original RSS SHA-256:
`8943e89750858574343d43fbb94f742aebaf89b3128fa25c1b7d029ac0bff8df`.
Source: https://steamcommunity.com/games/4162040/rss/ .
The normal Steam Community robots rules allow this path; no API exception.

The factual excerpt retains all ten real publication identities, authors,
publication dates, channel metadata, four update-version identity/start/end
clauses, New Events headings and event-local duration fields. Names, dates,
server-time qualifiers and the few action phrases used to classify login/referral
activity are preserved. Non-update descriptions are replaced with an explicit
omission marker. Other narrative/gameplay prose is omitted. XML was reserialized
using Python ElementTree, so whitespace, CDATA and escaping are not byte-identical
to the original. The fixture is not presented as a full/raw capture and is not
used by production `build:feed` fixture fallback.

Authors in the actual publisher distribution: `Overtimeboo` (3.0/3.2/3.3),
`shijie.hong` (3.1). These are attribution metadata, not a guessed identity:
the app-specific publisher feed/link/guid contract supplies the source boundary.
No direct HoYoverse article IDs are inferred from Steam IDs.

B1: `banner-rss-excerpts-2026-10-27.xml` is a factual subset of the actual
Zenless.gg Updates RSS capture in Actions 40509703766 / artifact 12735569765
(SHA-256 `b617a5165c91d4df6293015c2ccdd676c4bbb859931921d35b7417bdcd744ddd`).
Nine original publication envelopes, dated update headings, channel headings,
featured S-rank factual clauses, period and channel declarations were retained;
prose, assets, descriptions and unrelated posts omitted. Selectable rerun lists
are retained as factual list excerpts. All 20 parsed records equal the full
199,444-byte runner RSS output at the same injected clock. Synthetic future
notices/mutations in tests are explicitly test-only, never production coverage.
Persistent production snapshots use the documented factual-capture JSON schema;
its hash/length identify the original raw HTTP response, not a fictional raw feed.

## Rolling-window pins (2026-10-28)

`steam-rss-2026-10-28.xml` and `banner-rss-2026-10-28.json` are byte-identical
copies of this repository's own `snapshots/zzz-steam-events-official.xml` and
`snapshots/zzz-zenlessgg-banners.json` at commit `103520f` (where
`test/zzz-rewards.test.ts` was written). SHA-256 equals each snapshot's
recorded `contentHash`:

| File | Snapshot commit | Confirmed | SHA-256 |
| --- | --- | --- | --- |
| `steam-rss-2026-10-28.xml` | `f92e373` | 2026-10-28T11:26:25.722Z | `6f3e0ceea5e7306a278d0be08536fbe8211ea3ea040015123f258132ed74a6cf` |
| `banner-rss-2026-10-28.json` | `28cb6e7` | 2026-10-28T11:26:25.520Z | `a35f70f44cb9de6ed6cf9785ecf35510842910b724cc42ee960c8d9da1bc37f2` |

No source was fetched. They pin the exact 43 Steam / 20 banner counts asserted
by the reviewed-rescue regression, so ordinary feed turnover in the production
snapshots cannot turn CI red. Test-only; never a production fallback.
