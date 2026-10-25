# Timeline labels L2 — first editorial batch, operator selection

Date: 2026-10-25. **Status: operator-selected proposals, pending PR CI and merge.**

## Input and decision record

- Source: first published L1 queue obtained from the `site` artifact of main CI run [40150355700](https://github.com/maxvfk/game-calendar/actions/runs/40150355700), frozen at `asOf=2026-10-25T01:23:11.254Z`. 179 source events published; 72 eligible; exact first batch of 25; 47 remaining.
- Queue SHA256: `210a304e40d896fa67e19d6c64ea35974a090033b514f7d65dac94c21fb94415`.
- The agent received only this JSON file with the bounded editor prompt and returned the strict `schemaVersion: 1` proposal.
- Exact agent proposal SHA256: `6a0ca1f5392c3e8e266aab554b48e0c4f270d544237461393a91e64d57f480a5` (UTF-8 JSON, trailing LF).
- The operator **explicitly preferred all eight proposed labels as-is**, including `Standard Wish 5-Star Character Invitation` and `Echoes of War: Season of Phantasia`, over earlier assistant suggestions to retain the M1 identity. These are player-facing editorial judgments, not changes to source facts. No model copy is adjusted.
- Decisions: **8 label**, **15 keep_original**, **2 needs_research**. The two research entries are Genshin banners `La Chanson Cerise` and `Void Star's Advent`; they remain parked without invented featured subjects.

## Checks, safe boundary, review

- Compared all 25 proposal IDs/fingerprints/rules version and ordering against the exact frozen queue: matching; checked unique IDs, status-specific field shapes, title bounds and reason lengths. The registry in main was empty before proposing.
- Verified persisted Git registry bytes match the agent's original proposal **exactly** (same 7494 Unicode codepoints / FNV32 `7db64f69`). No editorial rewrite, extra fields or dropped cases.
- Only the **presentation registry** is changed: canonical event titles, IDs, dates, provenance, subjects, source adapters, Sync and saved completion keys are untouched.
- **Official L1 CLI proposal validation has not been run locally**, because the available container has no Bun or cloned runtime; do not describe the static comparison as an L1 validator pass. PR CI checks the registry via the actual build/test pipeline, including label diagnostics. Inspect any warnings and eventual diff before operator-authorized merge.
- Existing semantic diagnostics are intentionally conservative. Even without hard ambiguity, overlapping season/cycle labels still warrant human judgment; the operator approved the exact proposed wording.
- This PR is **review-only**, not an authorization for scheduled agents, automated merge, research into these banners or unrelated milestones. Final operator approval/merge is separate.

**Next concrete step:** review this editorial PR and its full CI; merge only on explicit authorization, verify post-merge feed/Pages, then decide separately how to deliver future scheduled JSON outputs to the review registry.
