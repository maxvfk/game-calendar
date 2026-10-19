# S6a Local Recovery Drill — terminal-agent task

## Scope

Finish only the remaining **Account Sync S6a backup/recovery acceptance gates**.

This task is for an agent running on the operator's trusted Windows PC with
terminal access. It is intentionally operational: perform the local validation,
prepare and execute the narrowly scoped disposable-account recovery drill, and
publish a sanitized GitHub report.

Do **not** start S6b, Timeline M1/M2, UI work, source ingestion/data-quality
work, artwork, Astra work, or unrelated cleanup.

## Sources of truth

Before doing anything, refresh and read:

1. current `maxvfk/game-calendar` `main`;
2. `AGENTS.md`;
3. `docs/IMPLEMENTATION-STATUS.md`;
4. `docs/ACCOUNT-BACKUP.md`;
5. current `maxvfk/game-calendar-backups` `main`, especially
   `.github/workflows/backup.yml`, `README.md`, and the newest snapshot
   manifests;
6. actual recent backup Action results.

Current facts at task creation time (2026-10-19) are only a bootstrap; re-check
them rather than trusting them blindly:

- public `game-calendar/main`:
  `9238f42b12b2e2374c4c9cef15b8f333b9b72d48`;
- private `game-calendar-backups/main`:
  `a30b3246c617716e0f6a49163c9f992f81d69750`;
- latest scheduled backup run observed:
  `39208997141`, successful on 2026-10-19;
- daily backups have been succeeding repeatedly since the first accepted hosted
  backup; do not treat the older pending lines in documentation as current
  production evidence without checking GitHub;
- the 2026-10-19 daily manifest points to backup implementation revision
  `5b2a2b048bae53f32e464b0a91a8f5d9f354b669`.
  Always use the selected manifest's actual `sourceRevision`, not this
  hard-coded example.

## Expected local machine state

The operator already installed/verified:

- Git `2.55.0.windows.3`;
- Bun `1.3.14`, revision `1.3.14+0d9b296af`;
- age `1.3.2`.

The operator has already cloned:

- `C:\Users\Maxim\Projects\game-calendar`
- `C:\Users\Maxim\Projects\game-calendar-backups`

The production age identity is expected at:

- `C:\Users\Maxim\CalendarRecovery\age-identity.txt`

Treat this path as local-only. **Never print, cat, copy into a repository,
upload, or include the identity contents in any report.**

Do not assume any other local setup exists. Verify before using it.

---

## Phase 0 — safe local preflight

Work in PowerShell.

1. Verify the two repository directories exist.
2. Verify `git`, `bun`, and `age` versions.
3. Verify the age identity file exists using metadata / `Test-Path` only.
   Never read its contents.
4. In both repositories:
   - inspect `git status --short`;
   - if there are operator changes, **stop** and report them instead of
     resetting, stashing, deleting, or overwriting anything;
   - fetch remotes;
   - switch to `main`;
   - update only with `git pull --ff-only`.
5. Record the resulting public/private main SHAs for the final report.

Do not modify Supabase in this phase.

## Phase 1 — validate a real production snapshot with the real key

This phase is read-only.

1. In `game-calendar-backups`, choose the newest successful daily snapshot
   that exists as a complete `.snapshot.age` + `.snapshot.manifest.json`
   pair on current private main.
2. Read the **manifest only** and record safe metadata:
   - snapshot path;
   - `createdAt`;
   - `sourceRevision`;
   - `schemaSha256`;
   - ciphertext byte length/hash if useful.
3. Confirm the corresponding backup Action run/commit succeeded.
4. In the public repository, verify that the manifest's exact
   `sourceRevision` exists.
5. Do **not** switch the normal public checkout away from current main.
   Instead create a detached recovery worktree outside the repository, for
   example under:

   `C:\Users\Maxim\CalendarRecovery\worktrees\game-calendar-<short-sha>`

   at the manifest's exact `sourceRevision`.
6. In that worktree run:

   `bun install --frozen-lockfile`

7. Run the canonical validator from that worktree against the selected
   production ciphertext, using:

   - project ref `vzzudezdigjwbwfejlsg`;
   - local identity
     `C:\Users\Maxim\CalendarRecovery\age-identity.txt`.

8. The validator may print timestamp/counts. Record only safe summary data.
   **Do not independently decrypt plaintext to console or disk** unless a
   concrete failure makes that unavoidable, and stop for operator approval
   before doing so.

Acceptance for Phase 1:

- the real production ciphertext decrypts with the operator's real age key;
- manifest, project, schema, logical rows, digests and counts all validate;
- no plaintext snapshot is left on disk.

If validation fails, stop. Do not attempt restore.

---

## Phase 2 — create a controlled pre-change recovery point

Use only the existing **disposable Google test account**. Never use the wife's
account or another real account for the drill.

Some browser actions necessarily require the operator. Ask for them only at the
explicit checkpoints below; do not request passwords, OAuth tokens, cookies, DB
passwords, private keys, or other secrets in chat/output.

### Manual checkpoint A — operator creates marker state

Ask the operator to open the deployed app with the disposable test account and
create recognizable disposable state:

- one visible event doing/done;
- note exactly `S6a recovery drill`;
- today's daily mark;
- a second ignored event;
- a clearly changed theme/preference;
- one disposable custom game;
- one disposable custom event.

The operator must wait until the app says the state is synced.

Do not continue until the operator confirms sync.

### Capture pre-change backup

Trigger a fresh manual `Encrypted personal-data backup` on private `main`.

- If an already-authenticated GitHub CLI is available, it may be used.
- Do not install/configure a new long-lived token merely for this task.
- Otherwise ask the operator to press **Run workflow** in GitHub.

Wait for the Action to finish and require **success**.

Then:

1. update the local private repository with `git pull --ff-only`;
2. identify the exact backup commit and daily age+manifest pair created by that
   run;
3. preserve **both files together**, outside both repositories, under a
   recovery directory such as:

   `C:\Users\Maxim\CalendarRecovery\drill\<timestamp>\pre-change\`

   Keep their original basenames.
4. record the exact backup commit and Action run URL/id;
5. validate this preserved pre-change snapshot with the same exact public
   `sourceRevision` recorded in its manifest.

This preserved pair is the recovery source for the drill. Do not rely on the
working-tree daily path remaining unchanged: another same-day backup can replace
it.

## Phase 3 — mutate the disposable account and capture current state

### Manual checkpoint B — operator changes/removes marker state

Ask the operator, on the disposable account only, to:

- change/remove the progress/note marker;
- unmark the daily;
- unignore the second event;
- change the theme/preference again;
- delete the disposable custom event and custom game;
- wait until the app reports synced.

Then take a **second fresh backup before any restore write** and require success.
Preserve its age+manifest pair outside the repositories under:

`C:\Users\Maxim\CalendarRecovery\drill\<timestamp>\post-change\`

This second snapshot is a safety/current-state recovery point. Record its run
and commit, but the drill restore must use the **pre-change** snapshot.

## Phase 4 — identify only the disposable profile and quiesce it

The restore selection must contain exactly the disposable account's default
profile. Never use `--all-profiles`.

If the profile UUID is not already known locally, ask the operator to obtain the
disposable account's Auth user/profile UUID using the documented Supabase
Dashboard/SQL Editor procedure in `docs/ACCOUNT-BACKUP.md`.

A profile/Auth UUID is not a credential, but do not publish it in the report.

### Manual checkpoint C — quiescence

Before any dry-run/write:

- confirm the disposable account shows no pending mutations;
- sign it out / close its tabs on **all devices**;
- keep the wife's/other accounts untouched.

If quiescence is uncertain, stop.

## Phase 5 — local restore dry-run

The stronger restore database credential must remain local.

Use the existing canonical mechanism from `docs/ACCOUNT-BACKUP.md`:

- `RESTORE_DATABASE_URL` only in the local process environment;
- masked PowerShell input (`Read-Host -AsSecureString`) where practical;
- same existing Supabase project;
- verified TLS via the pinned public CA/tooling;
- port 5432 session/direct connection accepted by the CLI;
- no URL printed to terminal output, logs, shell transcript, Git, or report.

If the operator must enter the credential, pause and let them type it locally.
Never ask them to paste it into chat.

Run restore with:

- the **pre-change** preserved snapshot;
- `--profile <DISPOSABLE-PROFILE-ID>`;
- `--dry-run`;
- no `--all-profiles`;
- no `--write`.

Review and record only the safe plan/count summary.

Stop if:

- project/schema/Auth/ownership/default-profile checks fail;
- the selected profile is not exactly the disposable profile;
- any plan suggests unrelated profiles would be changed;
- any table count/result is unexpected enough that scope is unclear.

### Explicit approval gate

After a successful dry-run, show the operator the concise safe summary and ask
for explicit approval before performing the real `--write`.

Do not infer approval from the existence of this task.

## Phase 6 — controlled write and idempotence check

Only after explicit operator approval:

1. run the same restore command against the same pre-change snapshot and same
   single disposable profile, replacing `--dry-run` with `--write`;
2. require the CLI's successful commit/post-write verification;
3. immediately remove `RESTORE_DATABASE_URL` from the environment;
4. re-run a read-only dry-run (re-entering the credential locally if required)
   to confirm the selected restored counts/state remain consistent.

Do not repeat `--write` merely for demonstration; the post-write dry-run is
sufficient for this production drill unless a specific discrepancy requires
further investigation.

## Phase 7 — fresh-app verification

### Manual checkpoint D — operator verifies restored cloud state

Ask the operator to use a **fresh browser profile** and sign into the disposable
Google account. If a first-login choice appears, use the documented cloud-only
path.

Verify that the pre-change state returned:

- progress/status;
- note `S6a recovery drill`;
- daily mark;
- ignored event;
- chosen preference/theme;
- disposable custom game;
- disposable custom event.

Also confirm that the wife's/other account was not changed.

This user-visible check is required. A successful SQL/CLI restore alone does not
close S6a.

After verification, the disposable data may be cleaned up normally in the app;
do not broaden the drill into other maintenance.

---

## GitHub report — REQUIRED

Regardless of success or failure, publish a **sanitized report to GitHub** so a
later agent/chat can reconstruct exactly what happened without relying on this
terminal session.

Preferred report location:

`maxvfk/game-calendar-backups/reports/YYYY-MM-DD-s6a-local-recovery-drill.md`

The report must include:

- date/time and OS/tool versions;
- starting public/private main SHAs;
- selected initial production snapshot path, snapshot commit/run, and manifest
  `sourceRevision`;
- Phase 1 real-key validation outcome;
- pre-change backup run/commit/path and validation outcome;
- post-change safety backup run/commit/path;
- dry-run outcome and seven-table plan/count summary;
- explicit operator approval obtained before `--write`;
- write outcome and post-write verification;
- fresh-browser verification outcome;
- confirmation that another account was not changed;
- any failure/stop condition and the exact next concrete step;
- whether S6a can now be considered complete.

The report must **not** contain:

- age private identity contents;
- database URLs/passwords;
- GitHub tokens;
- OAuth/session material;
- decrypted snapshot JSON;
- email addresses;
- Auth/profile UUIDs;
- notes/preferences or other real personal row contents beyond the fixed
  disposable marker phrase.

Use a fresh short-lived report branch from current private `main`. Commit and
push the report. Prefer opening/merging a reviewed PR if the available GitHub
tooling supports it. Never force-push or rewrite encrypted backup history.

Also reconcile the stale **Evidence** section in the private README with the
actual hosted backup and drill results.

If and only if all S6a acceptance gates pass, update public
`docs/IMPLEMENTATION-STATUS.md` from a separate fresh branch to record:

- successful hosted backup preflight + encrypted snapshots;
- successful real production-key decrypt/validation;
- successful selected-profile dry-run/write;
- successful fresh deployed app read;
- S6a complete;
- S6b remains separate/not started.

Do not start S6b or Timeline work.

If the drill fails or is stopped, record the failure and next concrete step,
but do **not** mark S6a complete.

## Final response to operator

Return a compact summary containing:

- what was completed;
- which manual checkpoints remain, if any;
- exact report repository/path/branch or merged PR;
- whether S6a is complete;
- the single next concrete step.

Do not include secrets or personal identifiers.
