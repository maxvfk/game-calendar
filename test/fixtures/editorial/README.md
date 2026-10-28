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

## Frozen E2a.1 audit baseline (not mutable production state)

`cutover-2026-10-27/` freezes the exact v1 registry, initial v2 registry and
cutover ledger from reviewed PR #115 head
`794bda294d3f4e4e31a67b35035d66ace1dbb9d1`, source main `ed773a8`.
SHA256 values are pinned independently in `test/timeline-cutover.test.ts`:

- v1: `90fb14edccf546e96a2403bcb929ece3542259da50d8bfa20350bdd0c9200a3a`;
- v2: `472bc5b2351f202086b70d61b16b68243e2d984493c410e302e571621ffb9b70`;
- ledger: `6b67fc1a298fe085580d4d7a1cf42a30ad9f1fb7b4623e23b8a3bd294f64a423`.

The 75-record / 25 operator / 50 automated / 22-label assertions apply to this
historical audit only. Tests construct frozen/open selectors explicitly. The
production-state regression validates the selected contract and canonical bytes,
without requiring a specific count, initial v1↔v2 equality or frozen admission.
The earlier PR #87 label/model-schema tests also use the immutable E2a fixture.
Neither fixture directory is a runtime input or a production freshness gate.

`test/timeline-cutover-lifecycle.test.ts` copies the current source into a disposable
Git repository with a local bare remote. It executes real typecheck, the entire
suite and full build at frozen, released, post-write and rollback states. The
post-write gates execute inside the actual `record.sh`, before its local-only push.
Bun/bunx are real executable symlinks; no successful test/build stubs remain.
A private `.git/timeline-lifecycle-child` marker skips **only the recursive
orchestrator itself** inside child suites, preventing infinite recursion. It is
never committed, published or used by M4. All other tests run normally in each
child suite. This drill needs no Git history or network, works in shallow CI,
and never touches a production remote, variable, workflow or writer.
