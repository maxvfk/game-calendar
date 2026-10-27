# Frozen E2a migration input (test-only, not a production registry)

`timeline-labels-v1-2026-10-26.json` is the exact existing **v1** registry at main
`72def1e0d076b5da9cbf3ecf37ec2d1a0f743ea4` (SHA256
`ced897eb6d99a94736c3c72c5da04eb23f68c05395e53468ffc3e82a6e727c82`).
It is not a v2 publication snapshot and never feeds the PWA/M4.

`provenance-history-2026-10-26.json` independently freezes Git metadata, changed
file lists and added-record content hashes for that real history, plus the exact
unchanged M4 reader/accept/writer/workflow files. The three commits are empty
initialization, the operator-approved PR #87, and the automatic c0b933f write.

These fixtures let ordinary shallow-checkout CI validate the immutable manifest
without network/Git-history runtime dependencies and without failing when the
still-live v1 writer adds decisions later. Their classification is replayed and
compared to the versioned audit manifest. The Git adapter is also exercised with
new actual commits in a disposable repository, including drift and rollback.

The **real migration/rehearsal CLI**, unlike ordinary CI, requires complete Git
history and re-inventories every registry commit up to a fresh explicit local ref.
It rejects a stale manifest. Updating an audit boundary later requires reviewed
regeneration of its historical fixtures too; a passing historical test is never
a freshness gate or production-cutover authorization.


`record-v1-before-cutover.sh` is the exact production v1 M4 runner at E2a.1
baseline `ed773a8` (unchanged since the E2a audit). Its SHA256 is independently
checked against the frozen E2a metadata. The local-remote stale-runner drill runs
these actual bytes without requiring historical objects in shallow CI. This is
a test fixture, never an installed writer. Real operator cutover inventory still
requires complete history and fresh remote checks.
