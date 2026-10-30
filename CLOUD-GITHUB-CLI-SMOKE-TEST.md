# Cloud environment GitHub CLI integration smoke test

Test date: 2026-10-30.

This documentation-only change exercises the published game-calendar Cloud
environment with native Git and the GitHub CLI.

- Both `bash -c` and `bash -lc` resolve Bun 1.3.14 without installation or repair.
- Git and `gh` are available; `gh auth status` and the repository API confirm access.
- The temporary branch starts from current `main`.
- Required validation: `bun install --frozen-lockfile`, `bun run typecheck`,
  `bun test`, and `bun run build`.
- The workflow commits and pushes with native Git, creates a draft PR using
  `gh pr create`, and verifies it using `gh pr view` and `gh api`.

This test does not change production code or source data. The draft PR is intended
to remain open and unmerged after verification.
