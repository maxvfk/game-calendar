import { test, expect } from 'bun:test';
import { mkdtemp, rm, readdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { passesCandidateDatabase } from '../scripts/daily-passes/contract.ts';
import { readPassesSnapshot } from '../scripts/daily-passes/backup.ts';
import { encryptPasses, decryptPasses, storePasses, retainPasses, passesManifest, verifyPassesPair } from '../scripts/daily-passes/encryption.ts';
import { decryptCzn } from '../scripts/czn-cutover/encryption.ts';
import { readCznSnapshot } from '../scripts/czn-cutover/backup.ts';
import { encryptCzn } from '../scripts/czn-cutover/encryption.ts';
import { candidateDatabase } from '../scripts/czn-cutover/contract.ts';
import { detectContract, assertAccess, productionMain, PRODUCTION_PROJECT as project } from '../scripts/czn-cutover/production.ts';
import { canonical } from '../scripts/account-backup/model.ts';
import type { Query } from '../scripts/account-backup/database.ts';
import v2 from '../supabase/backup-contract.czn-v2.json';
import v3 from '../supabase/backup-contract.passes-v3.json';

const revision = 'a'.repeat(40), id = '11111111-1111-4111-8111-111111111111';
const meta = (hash: string, migrationSha256: Record<string, string>, createdAt = '2026-11-12T12:00:00.000Z') =>
  ({ createdAt, projectRef: project, sourceRevision: revision, schemaSha256: hash, migrationSha256 });

test('v3 preflight access checks reject widened client privileges on ops and daily pass functions', async () => {
  const db = await passesCandidateDatabase(); const q: Query = async (s, p = []) => (await db.query(s, p)).rows as Record<string, unknown>[];
  try {
    await q('insert into calendar_backup_control.project_identity(project_ref) values($1)', [project]);
    expect(await detectContract(q, project)).toBe(3); await assertAccess(q, 3);
    for (const [grant, revoke] of [
      ['grant insert on public.daily_pass_ops to authenticated', 'revoke insert on public.daily_pass_ops from authenticated'],
      ['grant select on public.daily_pass_ops to anon', 'revoke select on public.daily_pass_ops from anon'],
      ['grant execute on function public.daily_pass_apply(uuid,jsonb) to anon', 'revoke execute on function public.daily_pass_apply(uuid,jsonb) from anon'],
      ['grant execute on function public.daily_pass_valid_day(text) to authenticated', 'revoke execute on function public.daily_pass_valid_day(text) from authenticated'],
      ['alter table public.daily_pass_ops force row level security', 'alter table public.daily_pass_ops no force row level security'],
    ] as const) {
      await db.exec(grant); await expect(assertAccess(q, 3)).rejects.toThrow('daily pass'); await db.exec(revoke);
    }
    await assertAccess(q, 3);
    await db.exec('alter table public.daily_pass_ops add column drift int');
    await expect(detectContract(q, project)).rejects.toThrow('schema mismatch');
  } finally { await db.close(); }
}, 30000);

test('offline plan reports the v3 contract and candidate without opening a connection', async () => {
  const lines: string[] = [], log = console.log;
  console.log = (line: string) => { lines.push(line); };
  try { await productionMain([]); } finally { console.log = log; }
  const plan = JSON.parse(lines.at(-1)!);
  expect(plan).toMatchObject({ v3: v3.schemaSha256, passesMigration: '20261112120000_daily_pass_ops.sql', productionWrites: false });
});

test.skipIf(!Bun.which('age') || !Bun.which('age-keygen'))('v3 encrypted pairs: round trip, separate retention, v2 reader refuses v3, v1/v2 pairs stay readable', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'passes-age-')), db = await passesCandidateDatabase(), v2db = await candidateDatabase();
  const q: Query = async (s, p = []) => (await db.query(s, p)).rows as Record<string, unknown>[];
  const q2: Query = async (s, p = []) => (await v2db.query(s, p)).rows as Record<string, unknown>[];
  try {
    for (const query of [q, q2]) {
      await query('insert into calendar_backup_control.project_identity(project_ref) values($1)', [project]);
      await query('insert into auth.users values($1)', [id]);
      await query("insert into public.profiles(id,owner_id,name,is_default) values($1,$1,'Synthetic',true)", [id]);
    }
    await q(`insert into public.daily_pass_ops(profile_id,op_id,game,region,kind,action_day,created_at,days)
      values($1,$1,'genshin','asia','extend','2026-11-01','2026-11-01T10:00:00Z',30)`, [id]);
    const key = join(dir, 'identity'), gen = Bun.spawn(['age-keygen', '-o', key], { stderr: 'pipe' });
    await new Response(gen.stderr).text(); expect(await gen.exited).toBe(0);
    const pub = Bun.spawn(['age-keygen', '-y', key], { stdout: 'pipe', stderr: 'pipe' }), recipient = (await new Response(pub.stdout).text()).trim();
    expect(await pub.exited).toBe(0);
    const snapshot = await readPassesSnapshot(q, meta(v3.schemaSha256, v3.migrationSha256), v3.schemaSha256);
    const root = join(dir, 'snapshots');
    const path = await storePasses(root, snapshot, recipient); await storePasses(root, snapshot, recipient);
    expect(await decryptPasses(path, key, project, v3.schemaSha256)).toEqual(snapshot);
    expect(await readdir(join(root, 'v3/daily'))).toHaveLength(2);
    const manifest = await readFile(path + '.manifest.json', 'utf8');
    expect(manifest).not.toContain(id); expect(manifest).not.toContain('counts');
    // The pinned v2 reader cannot mistake a v3 pair for a v1 or v2 backup.
    await expect(decryptCzn(path, key, project, v2.schemaSha256)).rejects.toThrow();
    await expect(decryptPasses(path, key, project, v2.schemaSha256)).rejects.toThrow('manifest mismatch');
    // v2 pairs remain readable through the v3 entrypoint.
    const v2snap = await readCznSnapshot(q2, meta(v2.schemaSha256, v2.migrationSha256), v2.schemaSha256);
    const v2path = await encryptCzn(join(dir, 'v2'), v2snap, recipient);
    expect(await decryptPasses(v2path, key, project, v3.schemaSha256)).toEqual(v2snap);
    // Retention 30/12 inside v3 only; corruption fails closed before any pruning.
    const bytes = await Bun.file(path).bytes();
    for (const kind of ['daily', 'monthly'] as const) for (let n = 1; n <= (kind === 'daily' ? 32 : 14); n++) {
      const date = kind === 'daily' ? new Date(Date.UTC(2026, 7, n)).toISOString().slice(0, 10) : new Date(Date.UTC(2024, n, 1)).toISOString().slice(0, 7);
      const name = date + '.passes-v3.snapshot.age', p = join(root, 'v3', kind, name);
      const s = { ...snapshot, base: { ...snapshot.base, createdAt: date + (kind === 'daily' ? '' : '-01') + 'T00:00:00.000Z' } };
      await writeFile(p, bytes); await writeFile(p + '.manifest.json', canonical(passesManifest(s, bytes, recipient, name)));
    }
    await retainPasses(root, project, v3.schemaSha256);
    expect(await readdir(join(root, 'v3/daily'))).toHaveLength(60);
    expect(await readdir(join(root, 'v3/monthly'))).toHaveLength(24);
    const monthly = join(root, 'v3/monthly/2026-11.passes-v3.snapshot.age');
    await writeFile(monthly, 'corrupt');
    await expect(retainPasses(root, project, v3.schemaSha256)).rejects.toThrow('integrity');
    await expect(verifyPassesPair(monthly)).rejects.toThrow();
    const single = await encryptPasses(join(dir, 'single'), snapshot, recipient);
    const raw = await Bun.file(single).bytes(); raw[raw.length - 1] = raw[raw.length - 1]! ^ 1; await Bun.write(single, raw);
    await expect(decryptPasses(single, key, project, v3.schemaSha256)).rejects.toThrow('integrity');
  } finally { await db.close(); await v2db.close(); await rm(dir, { recursive: true, force: true }); }
}, 30000);
