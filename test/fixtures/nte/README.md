# NTE Steam News rolling-window pin (test-only)

`steamnews-2026-10-28.json` is a byte-identical copy of this repository's own
`snapshots/nte-steamnews-official.json` at commit `ed74b73` (where
`test/nte-current-rewards.test.ts` was written; content last changed in
`28cb6e7`, content changed 2026-10-23T10:14:29.735Z, confirmed
2026-10-28T11:26:32.923Z). SHA-256 equals the snapshot's recorded
`contentHash`: `c1ad7e34110b66b7c48e843a1e5b51a691ef7fda47057f73b2f53caac16be740`.

Source: https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4508340&count=50&maxlength=0&feeds=steam_community_announcements
(access basis: `docs/NTE-STEAM.md`). No source was fetched.

The API returns a rolling 50-post window. This pins reward post
`1844751498233952`, the two yearless posts and the 49 / 54 parsed counts so
that newer announcements pushing them out of the live window cannot turn CI
red. Test-only; never a production fallback.

## Offline feed replay at `418d518`

`snapshots-418d518/` pins the source input from this repository's Git history. The matching `.meta.json` files are complete copies from the same commit and keep the recorded capture times and source URLs. SHA-256 below refers to the committed bytes. The production fallback does not use these files.

- `snapshots/nte-ntebuild-btr.html` from https://www.ntebuild.com/events.
  Full-body SHA-256 `0cd721cf7f95bee19d5d1061884e8f8aacb4b5ae11cd5e00f127728725dfa7c5`.
  Both complete `application/ld+json` script elements, in source order. Only intervening or surrounding bytes were omitted. Extract SHA-256 `d9a7cc9d1f1e259fcfc6a0a7e0a94ef552c1fb565205374782771116202c98f6`.
  Metadata SHA-256 `f192a91162bdf090d3eb4b3b947e417ac91bb0c0b40f4d06cdf78cdbd45cb981`.
- `snapshots/nte-steamnews-official.json` from https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4508340&count=50&maxlength=0&feeds=steam_community_announcements.
  Full-body SHA-256 `65c24047f451f560455e4f224c0a8df30b69906187fd9e3d51834919c229de93`.
  Complete body.
  Metadata SHA-256 `da261497e78bb22f662e5282c2a6f58882450edc66194ee34baa85db1d5d922d`.

Attribution: NTEBuild for the Beyond the Rails calendar and the publisher for the Steam announcements. The Steam access basis is documented in `docs/NTE-STEAM.md`. Source material remains subject to its original terms as stated in `NOTICE`.
