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
