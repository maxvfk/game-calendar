# Factual Phase II test-only excerpt

The two headings/duration rows in `phase-ii-2026-10-22.md` are verbatim from
this repository's `snapshots/genshin-kqm-ginews.md` at
`12d29a7cf40634f4b1bc0a9dc601b1fb9d3c9bae`. Full-body SHA-256
`ff09512446e3efce017b1da5654256a73ae39fb4a4c1c55d8872e0462855f7d6`.
Mirror source: https://github.com/KQM-git/GINews/tree/master/archive ,
notices 21888/21889. No artwork/prose is reproduced or source content invented.
These pins keep historical precision regressions independent from the rolling
production snapshot; they are never a production fallback.

`starlight-voyage-2026-10-28.md` is the complete `archive/21901.md` block
from the checked-in `snapshots/genshin-kqm-ginews.md` (source confirmation
2026-10-27T21:23:33.332Z, unchanged). The live KQM archive was re-read
2026-10-28; no new capture/confirmation timestamp is assigned to the snapshot.
It preserves the distinct Event Duration and Quest Completion Period, both
`t_lc` game-server clocks. Genshin uses fixed UTC+8 / UTC+1 / UTC−5
for Asia / Europe / America, including across western civil DST changes.

`expiries-2026-10-28.md` preserves the three complete existing-snapshot notice
blocks21053 (Overflowing Favor),21891 (Carefree Snowball Fight),21890
(Epitome Invocation's Azurelight/Symphonist channel). Re-read KQM archive
blobs on Oct28; reconstructed UTF-8 Git blob hashes match respectively
74dc17f2e4ef69d58dc0e610e93920567be88cba,
f9b1738c1f4e55e285abb5fea2aafeacd52c49db,
3c1e92414c0c2112c8e304545317db4475444123.
No new source/snapshot confirmation timestamp is assigned. These regression
fixtures are not production fallback sources. Only explicit `t_lc` periods
for the named notice contracts are promoted to regional exact deadlines.

`ginews-pre-turnover-2026-11-01.md` is the byte-identical complete tracked
GINews snapshot from PR161 reviewed head
`61c3d662cebb13ab0b1f287d97c2cb5d6502a1cb`, before main `32070cd` removed
seven notices during ordinary index turnover. SHA-256: `496215b2fbca04ecc7ae96b74f0c3d8da489a0922ba2609e39fb9b478f458170`.
No source was fetched. This pins the existing historical parser assertions
(13 events, including Starlight and the three expiry notices) without changing
their expected dates, IDs or fail-closed behavior. It is test-only, never a
production fallback. The four failures also reproduced on unchanged current
main before this fixture pin.

## Offline feed replay at `418d518`

`snapshots-418d518/` pins the source input from this repository's Git history. The matching `.meta.json` files are complete copies from the same commit and keep the recorded capture times and source URLs. SHA-256 below refers to the committed bytes. The production fallback does not use these files.

- `snapshots/genshin-kqm-ginews.md` from https://api.github.com/repos/KQM-git/GINews/contents/readme.md.
  Full-body SHA-256 `62446ca5ddf65d81839ce9ddc1dee2f775673f681902dcbaa52d78663ad05b14`.
  Complete body.
  Metadata SHA-256 `a99db574f5f0d519107a161feaa9c8cc67b3abd6acafc7e29af1a9eb1942c258`.

Attribution: HoYoverse in-game notices via the KQM GINews archive. The mirror declares no licence. See `docs/research/coverage-genshin.md`. Source material remains subject to its original terms as stated in `NOTICE`.
