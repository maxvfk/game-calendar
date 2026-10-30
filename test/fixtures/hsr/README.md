# HSR recovery and snapshot-turnover evidence (test-only)

These inputs come from this repository's independently acquired KQM HSRNews
snapshots, not upstream tracker fixtures. They are outside production `fixtures/`
and `snapshots/` and cannot become feed fallbacks. No new network refresh was run.

- `recovery-2026-10-28.md`: unchanged full HSR snapshot at commit
  `fc2e7f83abc8f7f1fa7a2f8c276a90cbd2036698`, last confirmed Oct 28.
  SHA-256 `0002a2fa60fc8484b6f1000b8870417a9db53dbd4f7fdbe7d2ac76e491855900`.
  This pins the ten-candidate historical recovery input (eight before the
  temporary Park claim extraction), rather than freezing today's discovery.
- `garden-of-plenty-2026-10-30.md`: only the complete `archive/1424.md`
  article, trimmed at the archive separators, from `snapshots/hsr-kqm-hsrnews.md`
  at `d4cfba000fe19f2ee74b183ddd463494e578f477`. Article SHA-256
  `58aad0cc58488885d883ad1310880a5cf0192b6141046958f4e18cfa886b843a`.
  The explicit server-local opening and global closing remain unchanged.

Original transport: https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md
and attributed dated archive links within the captures. The turnover test proves
that this new announcement adds one event without changing historical winners.
