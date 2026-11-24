# CZN factual test-only excerpt

`sereniel-peko-2026-10-20.html` contains only the two banner card articles
from this repository's own Prydwen capture at commit
`668192994aa6aa9ac397602d3cc2cbf970511e05`, path
`snapshots/czn-prydwen-banners.html` (190062 bytes; full-body SHA-256
`a8a3ad09a1e9a6788821f083de4d158abcf96b7697c6256125a4a17a120b39d8`).
Source: https://www.prydwen.gg/chaos-zero-nightmare/banners .
Captured/confirmed 2026-10-20T20:42:43.605Z. Not a production fallback.
No new crawl, artwork, descriptions or future-card expansion is included.

The machine 05:00/00:00 values agree in this historical case with independent
official notices STOVE 14554254 (named event), 14554026 (Sep 30 completed
maintenance at 05:00 UTC) and 14592548 (Oct 21 maintenance begins at 00:00
UTC). This agreement does not establish a universal hidden-timestamp contract.
See docs/research/event-time-precision-audit.md §§4–6 for full source links.

`verified-banners-2026-10-22.html` pins the ten banner cards (six corrected and four conservative future cards) from
this repository at `12d29a7cf40634f4b1bc0a9dc601b1fb9d3c9bae`,
`snapshots/czn-prydwen-banners.html`, full-body SHA-256
`206ef748464eaeeca38a6ab143b7e9664dce25df53e4c6baafb299a31347eb6c`. Historical identity/precision assertions
must not require cards to remain in rolling production snapshots after expiry.

## Offline feed replay at `418d518`

`snapshots-418d518/` pins the source input from this repository's Git history. The matching `.meta.json` files are complete copies from the same commit and keep the recorded capture times and source URLs. SHA-256 below refers to the committed bytes. The production fallback does not use these files.

- `snapshots/czn-prydwen-banners.html` from https://www.prydwen.gg/chaos-zero-nightmare/banners.
  Full-body SHA-256 `0a076103a240f4dabd14ea2fe41bf1e480d63c788e34ea7f01c4ab2bd71c832b`.
  All eight complete <code>article[data-banner-card="true"]</code> blocks, in source order. Only intervening or surrounding bytes were omitted. Extract SHA-256 `fee5ead165dd5d9a907d0ba0181523d8a15b274227f8c222113b1510f8f8b5a2`.
  Metadata SHA-256 `ece103a7bb817141f2ca93a06a0e7007723656a849b39365796635ce58c048d5`.

Attribution: Prydwen, with game content attributed to its publisher as in `NOTICE`. Source material remains subject to its original terms as stated in `NOTICE`.
