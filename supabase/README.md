# Account Sync S3 database foundation

The SQL in `migrations/` is versioned and does not require a hosted Supabase
project to develop or test. `config.toml` contains no project reference,
publishable key, password, or OAuth secret. This milestone does not link or
deploy migrations to a hosted database and does not add browser Auth/UI.

Run `bun test test/supabase-db.test.ts` to execute both migrations in PGlite
(PostgreSQL 18) with local `auth.users`, `auth.uid()`, `anon`, and
`authenticated` test roles. The tests exercise grants, RLS, ownership,
conditional mutations, replay, tombstones, preference validation, default
profile creation, and cascade deletion. The regular `bun test` runs them too.
This is a PostgreSQL integration test with a local Auth stub, not a test of a
hosted Supabase service or PostgREST. When a real project is provisioned,
verify the same policies and RPC through authenticated Supabase clients before
enabling S4/S5 in production.

On a machine with Docker and the Supabase CLI, `supabase start` and
`supabase db reset` can additionally replay the migrations against the local
Supabase stack. Do not use `supabase link` or `supabase db push` until the
hosted project and its database version are explicitly chosen. At that point,
set `db.major_version` in `config.toml` to the project's actual PostgreSQL
major version and test the migration on a fresh local stack first.

## Security and wire contract

- Personal tables are readable only by the owning authenticated user. `anon`
  has no table privileges. Direct browser writes and deletes are not granted;
  writes go through `apply_profile_mutations`, which checks profile ownership
  and applies a bounded batch only when `(changed_at, mutation_id)` advances.
  This makes plain client upserts unable to bypass conflict ordering.
- `ensure_default_profile()` is idempotent; the unique partial index on
  `(owner_id) where is_default` protects simultaneous first-use attempts.
- RPC functions are `SECURITY DEFINER` with an empty search path, explicit
  ownership checks, and `EXECUTE` granted only to `authenticated`.
- The S3 wire requires canonical UUID mutation IDs and ISO timestamps with at
  most millisecond precision (including an explicit offset). The S1 pure model
  remains wire-independent; S4/S5 must mint UUIDs and use this wire contract.
  `focusGame` JSON null is a value; `knownGames`/`gameOrder` reset via
  `unset=true` and JSON null. A deleted progress/custom row stores a tombstone;
  daily/ignored reversals retain explicit `false` rows.
- The server validates the mutation envelope and preference key/value pairs.
  Custom JSON payloads receive basic envelope checks; the existing client
  Zod schemas remain the source for full custom-object validation. Cloud pull
  in S5 must validate before materializing local state.
- `received_at` is diagnostic server time. Client `changed_at` controls LWW,
  so S5 still needs clock-skew diagnostics before describing sync as reliable
  when device clocks are badly wrong.

No secrets or hosted configuration are needed for S3. Creating the hosted
project, configuring Google OAuth, and supplying the public project URL/key
belong to the later Auth milestone and require explicit operator setup.
