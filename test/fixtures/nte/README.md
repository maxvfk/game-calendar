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
