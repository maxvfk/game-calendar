# Account Sync S6a — encrypted personal-data backup and recovery

Status on 2026-10-07: implementation, pinned-CA TLS and semantic schema-contract
fixes are merged. Latest hosted run `37643339951` passes verified TLS and schema
preflight, then encounters the automatic-RLS event-trigger ACL false positive
in the backup-role guard. This narrowly scoped follow-up corrects that guard;
**successful hosted snapshot and recovery drill remain manual acceptance gates**.
S6a is not complete until the evidence below is recorded. S5/S5.1 remain closed.

## Architecture and access

The private repository [maxvfk/game-calendar-backups](https://github.com/maxvfk/game-calendar-backups)
runs a GitHub Action daily at 01:23 UTC (04:23 Moscow; GitHub scheduling may be
delayed). It checks out an immutable, tested public implementation revision.
Schema, migrations, generated contract and tools live **only in this public
repository**; no frontend imports backup tooling and no backup secret enters
the Pages environment/bundle.

The source is ordinary Postgres SQL through Supavisor **Session pooler**, port
5432, for IPv4 runners. Direct `db.<ref>.supabase.co:5432` is also accepted on
IPv6/IPv4-add-on networks. Transaction pooler port 6543, arbitrary hosts,
connection query options and mismatched project usernames are refused. TLS
requires certificate and hostname verification, a single connection and no
named prepared statements. Copy the actual host from Dashboard → Connect;
never infer the pooler cluster index from region.

Migration `20261003140000_account_backup.sql` adds `calendar_backup`, initially
NOLOGIN and with no password, memberships, BYPASSRLS, elevated role attributes
or Auth access. It has CONNECT, schema USAGE and SELECT only on the seven
personal tables, plus a SQL-only project identity marker. SELECT RLS policies
are restricted to this role; they do not widen `anon`/`authenticated` policies.
No default grants on future tables are added. It cannot execute public
SECURITY DEFINER sync RPCs. Default transactions are read-only, but the actual
security boundary is table/function privileges and role-scoped RLS, not that
default (a client can override a transaction default).

A service-role/secret API key is unnecessarily broad: it bypasses RLS and
allows operations unrelated to backup. A REST export also needs paging and
does not provide a single cross-table snapshot. SQL reads the seven tables in
one **REPEATABLE READ, READ ONLY** transaction, including tombstones and explicit
false/unset registers. Role attributes/memberships/privileges, all seven backup
policies, project marker, live catalog contract and unexpected dependent tables
are checked before reading. No `auth.users` rows, OAuth tokens, emails, providers,
sessions, browser cache or outboxes are exported.

Restore runs **locally** with a separate, temporary `postgres` connection from
the operator's password manager. That credential is never a GitHub Secret.
It reads only the relevant existing Auth UUIDs to check foreign-key ownership;
it neither creates nor remaps identities. The stronger credential is practical
for occasional recovery and table locks; the scheduled job never receives it.

Official references verified on 2026-10-03:

- [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles)
- [Connection methods, IPv4 and custom pooler usernames](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [API key privilege boundaries](https://supabase.com/docs/guides/getting-started/api-keys)
- [age upstream and key custody](https://github.com/FiloSottile/age)
- [Bun SQL/TLS](https://bun.sh/docs/runtime/sql)

## Pinned public TLS trust anchor (2026-10-07 follow-up)

`supabase/certs/prod-ca-2021.crt` is the **public** Server Root Certificate
downloaded by the operator from Supabase Dashboard → Database Settings → SSL
Configuration → Download certificate. It is a trust anchor, not a credential
or private key. The exact attached bytes were independently inspected with
OpenSSL: self-signed CA subject/issuer `Supabase Root 2021 CA`, valid from
2021-04-28 10:56:53 UTC until **2031-04-26 10:56:53 UTC**, SHA-256 fingerprint:

```text
80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
```

Backup and local restore connections load this PEM relative to the public
implementation module, independent of the working directory. Before opening
SQL they require exactly one well-formed, matching, currently valid root CA.
Missing/unreadable/malformed/changed CA fails closed. No runner trust-store
setup, network CA fetch, CA Secret or database URL option is required. Keep
`BACKUP_DATABASE_URL`, `AGE_RECIPIENT` and `SUPABASE_PROJECT_REF` unchanged.

The private workflow pins the reviewed public commit, including this CA.
`tls.ca` supplies the PEM, `tls.rejectUnauthorized=true` enforces verification,
`tls.serverName` is the validated direct/session host, and the client internally
sets `sslmode=verify-full`. Supplied URLs still forbid all query parameters.
There is no retry with reduced verification or a different trust anchor.

Semantics were checked against the **workflow's Bun 1.3.14** implementation,
not assumed from Node/Postgres libraries: [option parsing](https://github.com/oven-sh/bun/blob/bun-v1.3.14/src/js/internal/sql/shared.ts)
parses URL `sslmode` separately from the TLS object; [native handshake](https://github.com/oven-sh/bun/blob/bun-v1.3.14/src/sql_jsc/postgres/PostgresSQLConnection.zig)
checks the chain and SNI hostname with verification enabled. Bun.SQL does not
invoke Node's `checkServerIdentity` callback. Offline native handshake tests
exercise supplied trust, untrusted chains, hostname mismatch and refused TLS.
These tests require Node for the mock Postgres peer and OpenSSL to generate
ephemeral test-only TLS identities outside the repositories; no TLS test
private key is committed.

Rotate **before 2031-04-26**, or earlier if Supabase changes its CA: obtain the
new official Dashboard certificate, independently inspect its fingerprint,
identity and validity, then review a public PR updating certificate, pin, tests
and documentation together. After public CI/merge, review a private PR updating
the immutable implementation pin. Never silently fetch or accept a replacement,
disable TLS verification, add CA material to credentials or change a Secret
to bypass validation. For local administrative `psql`, continue using the
operator's downloaded certificate explicitly with `sslmode=verify-full` and
`sslrootcert=<LOCAL-CERTIFICATE-PATH>` (or the trusted local root.crt).

The [first hosted run](https://github.com/maxvfk/game-calendar-backups/actions/runs/37609430936)
passed repository/config/setup/tests and failed with `self signed certificate
in certificate chain` during SQL export; no snapshot commit occurred. After
both follow-up PRs merge, the operator must rerun **Encrypted personal-data
backup** on `main`. This follow-up does not execute or claim that acceptance run.

## Hosted schema compatibility follow-up (2026-10-07)

[Run 37616434328](https://github.com/maxvfk/game-calendar-backups/actions/runs/37616434328)
passed repository/config/setup and focused tests (15 pass / 1 optional age
skip / 0 fail), connected through verified TLS, then failed with
`Live database schema mismatch`. It committed no snapshot. The operator ran
two catalog-only SQL Editor diagnostics against the existing project; neither
query executes sync functions or reads personal/Auth rows.

The actual hosted server is **PostgreSQL 17**, with the expected project marker
`vzzudezdigjwbwfejlsg`. The initial, unnormalized contract comparison reported:

| Section | Expected / hosted objects | Actual differences |
| --- | --- | --- |
| columns | 50 / 50 | None, including every `notNull` value |
| constraints | 78 / 34 | Exactly 44 expected-only NOT NULL entries; every other constraint matches |
| indexes | 9 / 9 | None |
| triggers | 6 / 6 | None |
| functions | 4 / 4 | All four stored bodies have CRLF/LF differences; declarations and metadata match |

The second diagnostic separately examined `public.apply_profile_mutations`,
`public.ensure_default_profile`, `public.sync_text_array`, and
`public.sync_valid_preference`. For **each** function, `declaration` and
`metadata` match exactly, `differentMetadata` is empty, exact `body`/`definition`
hashes differ, and `bodyMatchesAfterCRLF` is true. Outer-newline trimming alone
is false. Thus NOT NULL was **not** the sole mismatch: stored function-body
line endings are an additional, independently confirmed formatting difference.
There is no evidence of a PostgreSQL-major function-declaration formatting
change. No CHECK, PK, FK, index, trigger, signature or security/configuration
metadata difference was reported.

[PostgreSQL 18 release notes](https://www.postgresql.org/docs/18/release-18.html)
document the new table NOT NULL `pg_constraint` entries;
[PG17's catalog](https://www.postgresql.org/docs/17/catalog-pg-constraint.html)
does not store table NOT NULL that way. The production extraction now excludes
**only** `contype='n'` from table constraints and keeps nullability through
columns' `attnotnull`/`notNull`. CHECK/PK/UNIQUE/FK and other constraint definitions,
all column metadata/defaults, indexes and triggers remain exact.

Function normalization converts **only CRLF to LF in function-body SQL outside
quoted literals/identifiers** (also in comments). Ordinary, escape and nested
dollar-quoted literals retain exact bytes, including meaningful embedded
newlines. The complete declaration, delimiters and other body text remain
unchanged: no trimming, indentation/case rewriting or definition removal.
Unfamiliar/malformed function representations fail closed. The current four
migration bodies contain no embedded literal newlines, verified by the PG17
CRLF/PG18 LF regression; their hosted newline-only differences can therefore
be normalized without changing string values. Actual function logic or quoted
value changes still change the contract and reject preflight. See
[PostgreSQL lexical rules](https://www.postgresql.org/docs/18/sql-syntax-lexical.html)
for why globally replacing newlines inside literals would be unsafe.

The canonical contract is **regenerated from all public migrations** using the
same extraction/normalization as live preflight. It now has 34 constraints and
schema SHA-256 `312a36fa274c90eba0f72000b81b8de72d25a2d5d54bebb31b955479889f4a3e`.
Migration file hashes, schema/backup format version and function definitions in
the canonical file are unchanged. This hash is computed from migrations, not
accepted from the hosted database. Project identity, RLS, restricted-role,
ownership and uncovered-child-table guards are unchanged. Future real schema
changes require a reviewed migration/contract PR and private immutable pin PR.

For safe future investigation,
[`account-backup-schema.sql`](../supabase/diagnostics/account-backup-schema.sql)
compares extracted sections and reports safe names/types/counts and diagnostic
hashes; its raw function-text comparison can still expose the known CRLF
formatting difference. The regenerated query excludes NOT NULL catalog rows
like production extraction. The initial 78/34 report used the earlier diagnostic
in [investigation commit eaf10d9](https://github.com/maxvfk/game-calendar/commit/eaf10d9c52312e4abd32b430d04890675db1ae63).
[`account-backup-functions.sql`](../supabase/diagnostics/account-backup-functions.sql)
compares exact declarations/bodies/catalog metadata and specific newline
candidates, returning no code, values, credentials or personal data. Regenerate
with `bun scripts/account-backup/schema-diagnostics.ts` and
`bun scripts/account-backup/function-diagnostics.ts`. Diagnostic hashes/candidate
comparisons are investigation aids, **never replacements for the canonical hash
or permission to normalize quoted values**.

After the reviewed public fix and private immutable pin update merge, the
operator must manually rerun **Encrypted personal-data backup** on private
`main`. Keep `BACKUP_DATABASE_URL`, `AGE_RECIPIENT` and `SUPABASE_PROJECT_REF`
unchanged. No credential, key, TLS, backup-format, retention or restore-write
behavior changes are needed. **This fix does not run or claim hosted acceptance**;
a real encrypted snapshot and the recovery drill remain unverified gates.

## Hosted backup-role preflight follow-up (2026-10-07)

[Run 37643339951](https://github.com/maxvfk/game-calendar-backups/actions/runs/37643339951)
passes operator config, pinned public checkout and focused tests (**26 pass /
1 optional skip / 0 fail**). Verified TLS and the PG17/PG18 semantic schema
contract now pass. The CLI calls `assertTarget` before `assertBackupRole`; the
failure is later, `Backup role can execute a public SECURITY DEFINER function`.
The encrypted snapshot commit step was skipped; no snapshot was committed.

The operator's read-only catalog diagnostic reports exactly one matching
function: `public.rls_auto_enable()`, owned by `postgres`, with
`calendar_backup_can_execute=true` and `PUBLIC:EXECUTE, postgres:EXECUTE` grants.
It is the [Supabase automatic-RLS event-trigger helper](https://supabase.com/docs/guides/database/postgres/event-triggers#example-trigger-function---auto-enable-row-level-security):
`RETURNS EVENT_TRIGGER`, `SECURITY DEFINER`, `SET search_path=pg_catalog`, invoked
by an event trigger such as `ensure_rls` to enable RLS on new public tables.
This is a platform helper, not an application RPC.

[PostgreSQL default privileges](https://www.postgresql.org/docs/17/ddl-priv.html)
grant function EXECUTE to PUBLIC. That ACL does **not** make an `event_trigger`
function callable in ordinary SQL: direct invocation fails with
`trigger functions can only be called as triggers`. PostgreSQL requires
superuser privileges to [create event triggers](https://www.postgresql.org/docs/17/sql-createeventtrigger.html);
Supabase's documented Supautils exception enables the administrative `postgres`
user to manage them. The restricted `calendar_backup` is neither superuser nor
a member of that administrative role and cannot install/rebind an event trigger.
Installed platform event triggers can still fire on their matching DDL; this
exception changes neither their behavior nor their ACL. Backup export uses
read-only SQL and performs no DDL.

The guard now excludes **only the actual built-in return type**:
`p.prorettype <> 'pg_catalog.event_trigger'::pg_catalog.regtype`.
There is no function-name allow-list: an ordinary executable SECURITY DEFINER
function even named `rls_auto_enable()` still fails. Regular `trigger`-returning
SECURITY DEFINER functions also still fail: a role can invoke one indirectly
through a trigger on its owned temporary table even without public CREATE.
The existing role-identity/elevated-attribute, no-membership, public-CREATE,
seven-table privilege, and backup-RLS-policy checks remain intact. Application
`ensure_default_profile` and `apply_profile_mutations` remain inaccessible.

Local PGlite/PG18 integration creates real event-trigger functions and objects,
checks PUBLIC EXECUTE/type identity, verifies rejected direct invocation and
non-superuser event-trigger creation, and proves actual event-trigger firing on
DDL. It also proves ordinary trigger invocation through a temporary table and
retains rejection of ordinary SECURITY DEFINER RPCs. Real role/privilege drift
regressions cover SUPERUSER, BYPASSRLS, CREATEROLE, CREATEDB, REPLICATION,
memberships, public CREATE, and INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER.
No mock catalog exemption or production query concession is needed.

**No production ACL or platform change is required.** Do not revoke PUBLIC
EXECUTE from the helper, disable/drop its event trigger or change credentials,
TLS, schema contract, backup format, encryption, retention or restore behavior.
After the reviewed public fix and private immutable pin PR merge, manually run
**Encrypted personal-data backup** on private `main` using **Run workflow**.
Keep `BACKUP_DATABASE_URL`, `AGE_RECIPIENT` and `SUPABASE_PROJECT_REF` unchanged.
The remaining backup-role/policy preflight and real encrypted snapshot must pass
on that hosted rerun; this follow-up does not execute or claim production success.

## Snapshot v1, validation and confidentiality

Payload is deterministic UTF-8 JSON with `format=game-calendar-personal`,
`formatVersion=1`, `schemaVersion=1`, UTC creation time, public project ref,
tool/source commit, migration file SHA-256 hashes, live schema fingerprint,
per-table counts/digests and total data SHA-256. It contains exactly:
`profiles`, `progress`, `daily_marks`, `ignored`, `preferences`, `custom_games`,
`custom_events`. All DB columns are preserved, including original profile IDs,
owner UUIDs, client LWW versions/mutation IDs, receipt timestamps and tombstones.
Object keys and rows ordered by logical primary-key tuples use one canonical
serializer; timestamps retain Postgres precision. JSON null preferences remain
JSON null, distinct from SQL NULL in deleted custom payloads.

Strict structural validators and the current shared sync/custom-object schemas
reject unknown/missing columns, orphan/duplicate rows, invalid preferences,
payloads, incompatible format/project/schema and mismatched counts/digests.
`supabase/backup-contract.v1.json` is **generated from migrations** using local
Postgres (PGlite), and its exact reproducibility is tested. The live fingerprint
covers columns/types/defaults, constraints, indexes, non-internal triggers and
the four sync functions. Hosted schema has not yet been inspected with SQL;
the first job MUST pass this catalog preflight. A PostgreSQL-version-specific
catalog formatting mismatch must be investigated against live definitions;
do not bypass the check or blindly copy a hosted hash to make the job green.
Schema changes require a reviewed contract/tool revision; incompatible backups
need explicit future format migration, never best-effort interpretation.

`age` encrypts to one native X25519 recipient. The Action has only the public
recipient. Plaintext is held in process memory and passed to `age` stdin;
it is never written to disk, uploaded as an artifact or staged in Git. The job
validates the complete plaintext snapshot before encryption, then requires
successful age exit, nonempty versioned ciphertext and matching persisted
manifest SHA-256/size. It **cannot decrypt in GitHub** by design; a local decrypt
and full logical validation is a separate production acceptance gate.

Only encrypted `.snapshot.age` and strict `.snapshot.manifest.json` pairs may
be staged. The plaintext manifest exposes **only** format version, timestamp,
safe project ref, source commit, schema hash, hash of the public recipient,
ciphertext hash/size and payload filename. It contains no row counts, profile
IDs, names, preferences, notes, plaintext digests or Auth IDs. Repository
metadata additionally exposes commit/run times, schedule, filenames, ciphertext
size (an approximate data-volume signal) and encryption type. `age` provides
authenticated ciphertext, not sender signatures: a holder of the public key
can encrypt a new file, so use trusted repository history and a known selected
snapshot; hashes are corruption checks, not independent provenance proof.

The role password remains a sensitive **read credential**: a compromised live
runner can read the database before encryption. Restrict repo write/admin
access, use pinned actions/code, keep log errors sanitized and rotate this
credential independently if compromised. GitHub never has the decryption key.

## Layout and retention

Private repository:

```text
.github/workflows/backup.yml
README.md
snapshots/daily/YYYY-MM-DD.snapshot.age
snapshots/daily/YYYY-MM-DD.snapshot.manifest.json
snapshots/monthly/YYYY-MM.snapshot.age
snapshots/monthly/YYYY-MM.snapshot.manifest.json
```

Keep latest **30 daily** and **12 monthly** pairs by UTC filename. Today's daily
pair is replaced on repeated runs; monthly retains the **first successful
snapshot in that month** (an outage on the first does not lose the whole month).
The monthly ciphertext initially equals its day's ciphertext; later daily
updates never replace that monthly capture. Validate both directories and all
existing pairs before retention; unexpected/unpaired/symlink/corrupt files fail
the job. Only matching managed pairs are deleted. Concurrent workflows are
serialized; a concurrent operator push makes normal non-force Git push fail.

Retention applies to the **current Git tree**, not physical history erasure.
Old encrypted blobs remain reachable in earlier commits; storage grows, and a
decryption key can still read those old blobs. S6a deliberately does not rewrite
history. Permanent deletion/history compaction needs a separate reviewed
maintenance operation; key loss renders all snapshots for that key unreadable.

## Minimal operator setup (no secrets in chat)

1. Merge the tested public/private S6a PRs. Verify the private workflow's pinned
   public commit exists. Keep backups repo private. In private repo Settings →
   Actions → General allow the workflow's `contents: write`; if a branch rule
   blocks this bot, permit the scoped backup commit rather than force-pushing.
2. Supabase → the **existing Game Calendar** project → SQL Editor: apply only
   `supabase/migrations/20261003140000_account_backup.sql` once. S3 migrations
   are already deployed; do not replay them or `db reset` against production.
   In that verified project run this non-secret binding once:

   ```sql
   insert into calendar_backup_control.project_identity(project_ref)
   values ('vzzudezdigjwbwfejlsg');
   ```

3. On a trusted local computer install Bun **1.3.14**, `age` (Windows:
   `winget install --id FiloSottile.age`) and PostgreSQL client tools (`psql`).
   Generate the production identity **outside all repositories and outside
   ChatGPT**:

   ```powershell
   New-Item -ItemType Directory -Force "$env:USERPROFILE\CalendarRecovery"
   age-keygen -o "$env:USERPROFILE\CalendarRecovery\age-identity.txt"
   age-keygen -y "$env:USERPROFILE\CalendarRecovery\age-identity.txt"
   ```

   Store the identity in a password manager/encrypted offline storage, with a
   second independently protected copy. Restrict file access to your user.
   Only the printed **public `age1...`** recipient goes to GitHub. Never put the
   private `AGE-SECRET-KEY-...` in GitHub Secrets, app, repo, chat or CI.
   Do not reuse the publicly known upstream test key used in local tests.

4. Supabase → Connect → **Session pooler**: copy actual host, project-qualified
   username and port 5432. Locally use `psql` to connect as
   `postgres.vzzudezdigjwbwfejlsg` (enter the existing admin password at its
   password prompt; never put it in command arguments):

   ```text
   psql "host=<ACTUAL-POOLER-HOST> port=5432 dbname=postgres user=postgres.vzzudezdigjwbwfejlsg sslmode=verify-full"
   \password calendar_backup
   ALTER ROLE calendar_backup LOGIN;
   \q
   ```

   At `\password`, enter a new long random password from your password manager
   twice. `psql` performs password setup without leaving the cleartext in shell
   history or a saved SQL Editor query. This password is distinct from admin.
   `psql` needs a trusted CA bundle: place the correct chain in
   `%APPDATA%\postgresql\root.crt` on Windows, or add
   `sslrootcert=<TRUSTED-CA-BUNDLE-PATH>` to that connection string. Use a
   verified CA bundle / the certificate guidance in Supabase Connect; never
   accept an arbitrary supplied certificate or disable TLS verification.

5. Private backup repo → Settings → Secrets and variables → Actions:

   | Kind | Name | Value |
   | --- | --- | --- |
   | Secret | `BACKUP_DATABASE_URL` | `postgresql://calendar_backup.vzzudezdigjwbwfejlsg:<PERCENT-ENCODED-ROLE-PASSWORD>@<ACTUAL-POOLER-HOST>:5432/postgres` |
   | Variable | `SUPABASE_PROJECT_REF` | `vzzudezdigjwbwfejlsg` |
   | Variable | `AGE_RECIPIENT` | your locally generated public `age1...` key |

   No PAT is needed: repository-scoped `GITHUB_TOKEN` commits encrypted pairs.
   No Supabase service key, admin password, private key, Google secret or Auth
   secret belongs in this repository. Percent-encode only the password portion
   (e.g. locally with `[uri]::EscapeDataString(...)`, without outputting it to
   chat). Preserve the host copied from Connect; do not add URL query options.

6. Actions → **Encrypted personal-data backup** → Run workflow on `main`.
   It must pass role/project/schema/data/encryption/manifest checks and commit a
   nonempty daily pair plus this month's pair. A failed/preflight-mismatched job
   is a blocked gate; record only its run link/sanitized error, never secrets or
   decrypted content. Private runners/branch rules/permissions are verified by
   this first real run, not assumed from the local tests.

## Local validate and restore

Clone/update both repos locally; use the public revision pinned in the selected
snapshot's manifest (which includes the matching contract). Install its frozen
dependencies. Native `age` must be on PATH. Example from public repo root,
replace the filename and test profile UUID; keep paths outside public build:

```powershell
$projectRef = 'vzzudezdigjwbwfejlsg'
$identityPath = "$env:USERPROFILE\CalendarRecovery\age-identity.txt"
$snapshotPath = '..\game-calendar-backups\snapshots\daily\2026-10-03.snapshot.age'
bun scripts/account-backup/cli.ts validate --project-ref $projectRef --snapshot $snapshotPath --identity $identityPath
```

Output is timestamp and seven counts; decrypted data stays in memory. Both
manifest/ciphertext and complete logical payload integrity are checked. For
independent decryption `age -d -i <identity> <snapshot>` is standard age format;
redirect only to a secured local temporary file when needed, never to repo or
shared terminal logs. This is cloud backup recovery, independent of localStorage.

To dry-run, set `RESTORE_DATABASE_URL` **locally** to the same project's port
5432 `postgres`/`postgres.<ref>` URL. Prefer a masked local prompt to keep it out
of command history; in Windows PowerShell or PowerShell 7:

```powershell
$restoreSecret = Read-Host 'Local restore URL (never share)' -AsSecureString
$env:RESTORE_DATABASE_URL = [System.Net.NetworkCredential]::new('', $restoreSecret).Password
Remove-Variable restoreSecret
$testProfileId = '<DISPOSABLE-ACCOUNT-PROFILE-UUID>'
bun scripts/account-backup/cli.ts restore --project-ref $projectRef --snapshot $snapshotPath --identity $identityPath --profile $testProfileId --dry-run
```

Without `--write` restore is always read-only. It reports existing and restored
row counts per table; it is replacement of **all selected profile state**, not
a merge with current production mutations. It does not delete unrelated
profiles or children. `--profile` is repeatable; `--all-profiles` selects only
profiles present in the snapshot, leaving extra target profiles intact. Never
use all-profiles for the test drill. A missing existing Auth UUID, changed owner
for a profile ID or conflicting unselected default profile refuses recovery.
Missing profiles can be re-created only with their unchanged IDs and existing
owners; account/Auth deletion cannot be recovered here.

Before a write, quiesce the selected account on **all devices**, ensure no
pending outboxes, sign it out/close its tabs and take a current encrypted backup.
Do not delete a real account's local data without a separate saved export if
unsent edits remain. Outboxes/caches are not part of this cloud backup; pending
newer mutations can overwrite restored old state when those devices reconnect.
Use a fresh browser profile/cloud-only login to inspect restored cloud data.

After reviewing dry-run counts, an explicit write is:

```powershell
bun scripts/account-backup/cli.ts restore --project-ref $projectRef --snapshot $snapshotPath --identity $identityPath --profile $testProfileId --write
Remove-Item Env:RESTORE_DATABASE_URL
```

Write uses one transaction, a 10-second lock timeout, 120-second statement
timeout and SHARE ROW EXCLUSIVE locks on the seven tables (briefly blocks
writes by all accounts). It rechecks live schema/project/Auth/ownership under
those locks, upserts selected profiles without owner changes, replaces their
child rows, re-reads and compares every restored row before commit. Any failure
rolls back. Repeating the same snapshot/selection is idempotent; versions are
preserved, never advanced or fabricated. If any device is still mutating state,
stop the procedure and quiesce it first.

## Small production recovery drill (required release gate)

Use the existing **disposable Google test account**, never the wife's account.
The app has no multi-profile UI, so a separate test account is the practical
isolated ownership boundary.

1. In the deployed app using that account, set one visible event to doing/done
   with note `S6a recovery drill`, mark today's daily, ignore a second event,
   choose a theme, create a disposable custom game and event. Wait for Synced.
   Identify its default profile UUID using this safe local SQL in SQL Editor:

   ```sql
   select id, owner_id, name, is_default
   from public.profiles where owner_id = '<DISPOSABLE-AUTH-USER-UUID>';
   ```

   Do not publish account UUIDs/content in public documentation.
2. Run the private backup Action. Save its run URL and snapshot path. Pull the
   backups locally, decrypt/validate with the real local identity and confirm
   nonzero expected counts for the seven tables. This proves key custody.
3. On the test account only, remove the note/change the status, unmark the
   daily, unignore, change theme, delete the test custom event/game. Wait for
   Synced. Take a **second current backup** before restore if useful for return
   to the post-change state. Keep the selected pre-change snapshot stable with
   `git show <KNOWN-COMMIT>:<path>` / a separate worktree outside repositories:
   a second run replaces today's daily path, while monthly first capture stays.
   Preserve BOTH age and manifest files together with their original basenames.
4. Sign out/close every session for this disposable account, verify no pending
   outboxes, and run dry-run against the **pre-change** encrypted snapshot with
   `--profile <TEST-ID>` only. Review all seven table counts and scope.
5. Run the identical command with `--write` instead of `--dry-run`. It must
   confirm a committed, database-verified restore. Re-run dry-run (or repeat the
   write to prove idempotence); expected selected counts should match.
6. Open a **fresh browser profile**, sign into the disposable account and choose
   cloud-only if prompted. Confirm restored progress/note, daily, ignore,
   theme and custom game/event. Confirm the wife's/other account was not changed.
   Successful local database tests do not substitute for this hosted app check.
7. Record sanitized run URL, encrypted snapshot path/commit, counts, dry-run and
   restore outcomes, fresh-browser observations and date in the private README;
   summarize passed/failed gates publicly in IMPLEMENTATION-STATUS. Remove the
   local restore credential. Keep or clean the disposable test entries normally.

## Validation evidence and remaining gates

Local S6a tests use the real migrations in PostgreSQL 18 via PGlite, with Auth
UUID stubs. Tests cover restricted cross-owner backup, anon/owner isolation,
seven tables, JSON null/unset, tombstones/false, corrupt/incompatible data,
live drift/project mismatch, default/ownership/Auth refusal, read-only dry-run,
transaction rollback, selected-profile isolation, exact/idempotent restore,
current app decode/materialization and deterministic retention/corrupt pairs.
The native Bun.SQL adapter is also tested over PGlite's real PostgreSQL wire
protocol for parameterized array/JSON handling and sanitized database errors;
PGlite Socket is a dev-only dependency, absent from the browser bundle. Hosted
TLS, credentials and Supavisor still require the production preflight.
An additional real age test uses upstream's **publicly known test identity**,
kept outside both repos; it produces a real encrypted synthetic snapshot,
decrypts/validates, plans/restores and verifies app materialization. No production
private key was created here. Standard tests stay offline and skip this optional
age subprocess test when test identity/recipient env vars are absent.

Run normal project gates plus:

```text
bun test test/account-backup.test.ts
AGE_TEST_IDENTITY=<LOCAL-PUBLIC-TEST-FIXTURE-PATH> AGE_TEST_RECIPIENT=<ITS-PUBLIC-RECIPIENT> bun test test/account-backup.test.ts
```

Actual frozen install/typecheck/full test/build results are recorded in
IMPLEMENTATION-STATUS after execution. Latest hosted run `37643339951` confirms
verified TLS and semantic schema/project preflight, then stops at the
EVENT_TRIGGER ACL role-guard false positive described above. Still pending:
complete hosted backup-role/policy validation, first successful real encrypted
hosted snapshot, real-key decrypt/validation/dry-run, and controlled production
restore → fresh deployed app read. **Do not mark S6a complete until all pass.**

## Exclusions

No full Auth/project disaster recovery: Auth users/identities/provider secrets,
sessions, project settings, encryption key custody, Storage objects, public feed
and browser caches/outboxes are not in snapshots. Public schema/migrations are
recovered from this repository. Recovery assumes the existing project and
original Auth UUIDs still exist. Realtime, multi-profile UI, cache-removal UI,
new providers, source ingestion and broader S6b monitoring are outside S6a.
Failures are visible red Actions; no additional alerting/telemetry is introduced.
