/** Disposable PG17 only; no Supabase credentials, real accounts, or hosted URL accepted. */
import { SQL } from 'bun';
import { strict as assert } from 'node:assert';
import { migrationHashes } from '../account-backup/generate-contract.ts';
import { safeQuery } from '../account-backup/cli.ts';
import { canonical } from '../account-backup/model.ts';
import { assertTarget } from '../account-backup/database.ts';
import { candidateMigration, assertCznTarget } from '../czn-cutover/contract.ts';
import { readCznSnapshot, restoreCznSnapshot } from '../czn-cutover/backup.ts';
import { detectContract, assertAccess, PRODUCTION_PROJECT as project } from '../czn-cutover/production.ts';
import { passesMigration, assertPassesTarget, assertPassesBackupRole } from './contract.ts';
import { readPassesSnapshot, restorePassesSnapshot } from './backup.ts';
import { passOpFromRow, reducePass } from '../../src/shared/dailyPasses.ts';
import v1 from '../../supabase/backup-contract.v1.json';
import v2 from '../../supabase/backup-contract.czn-v2.json';
import v3 from '../../supabase/backup-contract.passes-v3.json';

const raw = process.env.PASSES_LOCAL_PG17_URL ?? '', url = new URL(raw);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/postgres' || url.username !== 'postgres' || url.search || url.protocol !== 'postgres:')
  throw new Error('Only disposable loopback postgres database accepted');
const config = { url: raw, max: 1, prepare: false, connectionTimeout: 10 };
const admin = new SQL(config), a = new SQL(config), b = new SQL(config), q = safeQuery(admin), qa = safeQuery(a), qb = safeQuery(b);
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const id = (n: number) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12, '0')}`;
const today = new Date().toISOString().slice(0, 10);
const shift = (n: number) => new Date(Date.parse(today + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const extend = (n: number, day = 0, game = 'genshin', days = 30) => ({ opId: id(n), game, region: 'asia', kind: 'extend',
  actionDay: shift(day), createdAt: `${shift(day)}T10:00:00.${String(n).padStart(3, '0')}Z`, days });
const meta = (hash: string, migrationSha256: Record<string, string>) => ({ createdAt: new Date().toISOString(), projectRef: project,
  sourceRevision: 'a'.repeat(40), schemaSha256: hash, migrationSha256 });
async function auth(db: SQL, uid: string, role = 'authenticated') {
  await db.unsafe('reset role'); await db.unsafe("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  if (!['authenticated', 'anon', 'calendar_backup'].includes(role)) throw new Error('Test role');
  await db.unsafe('set role ' + role);
}
async function waiting(pid: number) {
  const end = Date.now() + 6000;
  while (Date.now() < end) {
    if ((await q('select wait_event_type from pg_stat_activity where pid=$1', [pid]))[0]?.wait_event_type === 'Lock') return;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error('Expected independent PostgreSQL lock wait');
}
async function finishesWithin<T>(p: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Unexpected lock wait')), ms); });
  try { return await Promise.race([p, timeout]); } finally { clearTimeout(timer); }
}
const rows = async (query = q) => canonical(await query('select * from public.daily_pass_ops order by profile_id,op_id'));

try {
  assert.match(String((await q('show server_version'))[0]!.server_version), /^17\./);
  assert.equal((await q("select to_regclass('public.profiles') is null as empty"))[0]!.empty, true);
  await admin.unsafe(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;`);
  for (const f of Object.keys(await migrationHashes())) await admin.unsafe(await Bun.file(new URL('../../supabase/migrations/' + f, import.meta.url)).text());
  await q('insert into calendar_backup_control.project_identity(project_ref) values($1)', [project]);
  await admin.begin(async tx => { await tx.unsafe((await candidateMigration()).sql); });
  assert.equal(await detectContract(q, project), 2);
  await q('insert into auth.users values($1),($2)', [owner, other]);
  await auth(a, owner); await auth(b, owner);
  const profile = String((await qa('select public.ensure_default_profile() as id'))[0]!.id);
  await qa('select public.apply_profile_mutations($1,$2::jsonb)', [profile, JSON.stringify([{ kind: 'daily', key: { subjectId: 'dailies:zzz', dayKey: today },
    completed: true, changedAt: new Date().toISOString(), mutationId: id(900) }])]);
  await q("set timezone='UTC'");
  const v2snap = await readCznSnapshot(q, meta(v2.schemaSha256, v2.migrationSha256), v2.schemaSha256);

  // Operator window: the additive candidate in one transaction.
  await admin.begin(async tx => { await tx.unsafe((await passesMigration()).sql); });
  assert.equal(await detectContract(q, project), 3); await assertAccess(q, 3); await assertPassesTarget(q, project, v3.schemaSha256);
  // The pinned v2 tool's checks refuse the new schema instead of silently omitting ops.
  await assert.rejects(assertCznTarget(q, project, v2.schemaSha256), /Uncovered child table/);
  await assert.rejects(readCznSnapshot(q, meta(v2.schemaSha256, v2.migrationSha256), v2.schemaSha256), /Uncovered child table/);
  await assert.rejects(restoreCznSnapshot(q, v2snap, project, v2.schemaSha256), /Uncovered child table/);
  await assert.rejects(assertTarget(q, project, v1.schemaSha256));
  // Full v2 data coverage: the first v3 snapshot holds exactly the v2 base and CZN data.
  const first = await readPassesSnapshot(q, meta(v3.schemaSha256, v3.migrationSha256), v3.schemaSha256);
  assert.equal(canonical(first.base.data), canonical(v2snap.base.data));
  assert.equal(canonical(first.extension), canonical(v2snap.extension));
  assert.equal(first.passes.daily_pass_ops.length, 0);

  const apply = (query: typeof q, ops: unknown[]) => query('select public.daily_pass_apply($1,$2::jsonb) as reply', [profile, JSON.stringify(ops)]);
  const bpid = Number((await qb('select pg_backend_pid() as pid'))[0]!.pid);
  // 1. Two devices' distinct +30 run concurrently: no profile lock, both commit.
  await qa('begin'); await apply(qa, [extend(1)]);
  await finishesWithin(apply(qb, [extend(2)]), 3000); await qa('commit');
  // 2. The same op ID retried on another connection waits for the first, then is accepted once.
  await qa('begin'); await apply(qa, [extend(3)]); const replay = apply(qb, [extend(3)]); await waiting(bpid); await qa('commit');
  assert.deepEqual((await replay)[0]!.reply, [{ opId: id(3), outcome: 'accepted' }]);
  // 3. The same op ID with different content raises after the wait; the first row stands.
  await qa('begin'); await apply(qa, [extend(4)]); const reuse = apply(qb, [extend(4, 0, 'genshin', 31)]); await waiting(bpid); await qa('commit');
  await assert.rejects(reuse, /22023/);
  // 4. If the first writer rolls back, the waiting retry inserts the op itself.
  await qa('begin'); await apply(qa, [extend(5)]); const takeover = apply(qb, [extend(5)]); await waiting(bpid); await qa('rollback');
  assert.deepEqual((await takeover)[0]!.reply, [{ opId: id(5), outcome: 'accepted' }]);
  assert.equal(Number((await q('select count(*)::int as n from public.daily_pass_ops'))[0]!.n), 5);
  assert.equal(Number((await q("select days from public.daily_pass_ops where op_id=$1", [id(4)]))[0]!.days), 30);
  const pull = async () => (await qa('select to_jsonb(t) as row from public.daily_pass_ops t')).map(r => passOpFromRow(r.row as never));
  assert.equal(reducePass(await pull(), 'genshin', 'asia').lastDay, shift(149));

  // Unexpected delivery order: the PASS-0 counterexample arrives B then A, still 69-equivalent.
  await apply(qa, [extend(10, -40, 'hsr')]);
  await apply(qb, [extend(12, -4, 'hsr')]); await apply(qa, [extend(11, -6, 'hsr')]);
  assert.equal(reducePass(await pull(), 'hsr', 'asia').lastDay, shift(53));
  // Undo after ACK and an undo that arrives before its target.
  const undo = (n: number, target: number, game = 'genshin') => ({ opId: id(n), game, region: 'asia', kind: 'undo', actionDay: today,
    createdAt: `${today}T11:00:00.${String(n).padStart(3, '0')}Z`, targetOp: id(target) });
  await apply(qb, [undo(20, 2)]);
  assert.equal(reducePass(await pull(), 'genshin', 'asia').lastDay, shift(119));
  await apply(qa, [undo(21, 22)]); await apply(qb, [extend(22)]);
  assert.equal(reducePass(await pull(), 'genshin', 'asia').lastDay, shift(119));
  // Stale correction: a set that had not seen the hsr extensions keeps them as conflicts.
  await apply(qa, [{ opId: id(30), game: 'hsr', region: 'asia', kind: 'set', actionDay: today, createdAt: `${today}T12:00:00Z`, lastDay: shift(5), basedOn: [] }]);
  const stale = reducePass(await pull(), 'hsr', 'asia');
  assert.equal(stale.lastDay, shift(5)); assert.deepEqual(stale.conflicts, [id(10), id(11), id(12)]);
  // Device clock days in the future, and per-kind validation.
  await assert.rejects(apply(qa, [extend(40, 2)]), /22023/);
  await apply(qa, [extend(41, 1)]);
  for (const bad of [{ ...extend(42), actionDay: '2026-02-30' }, { ...extend(42), days: 181 }, { ...extend(42), game: 'dailies' },
    { ...undo(42, 1), targetOp: undefined }, { opId: id(42), game: 'genshin', region: 'asia', kind: 'set', actionDay: today, createdAt: `${today}T12:00:00Z`,
      lastDay: null, basedOn: Array.from({ length: 501 }, (_, i) => id(2000 + i)) }])
    await assert.rejects(apply(qa, [bad]), /22023/);
  await assert.rejects(apply(qa, Array.from({ length: 101 }, (_, i) => extend(500 + i))), /22023/);

  // Restricted roles and cross-profile access.
  const before = await rows();
  await auth(b, other);
  assert.equal((await qb('select * from public.daily_pass_ops')).length, 0);
  await assert.rejects(apply(qb, [extend(50)]), /42501/);
  await assert.rejects(qb(`insert into public.daily_pass_ops(profile_id,op_id,game,region,kind,action_day,created_at,days)
    values($1,$2,'genshin','asia','extend',$3,now(),30)`, [profile, id(51), today]), /42501/);
  await auth(b, '', 'anon');
  await assert.rejects(qb('select * from public.daily_pass_ops'), /42501/); await assert.rejects(apply(qb, [extend(52)]), /42501/);
  await auth(b, owner);
  await assert.rejects(qb('update public.daily_pass_ops set days=1'), /42501/); await assert.rejects(qb('delete from public.daily_pass_ops'), /42501/);
  await auth(b, '', 'calendar_backup');
  await assertPassesBackupRole(qb);
  assert.equal((await qb('select * from public.daily_pass_ops')).length, (await q('select * from public.daily_pass_ops')).length);
  await assert.rejects(apply(qb, [extend(53)]), /42501/); await assert.rejects(qb('delete from public.daily_pass_ops'));
  await assert.rejects(q('update public.daily_pass_ops set days=1'), /55000/);
  assert.equal(await rows(), before);

  // v3 backup and recovery: v1/v2 snapshots never delete ops; a lost op comes back from v3.
  const snap = await readPassesSnapshot(q, meta(v3.schemaSha256, v3.migrationSha256), v3.schemaSha256);
  await restorePassesSnapshot(q, v2snap, project, v3.schemaSha256);
  await restorePassesSnapshot(q, v2snap.base, project, v3.schemaSha256);
  assert.equal(await rows(), before);
  await q('delete from public.daily_pass_ops where op_id=$1', [id(1)]);
  await restorePassesSnapshot(q, snap, project, v3.schemaSha256);
  assert.equal(await rows(), before);

  // FK cascade on profile deletion.
  await auth(a, other);
  const otherProfile = String((await qa('select public.ensure_default_profile() as id'))[0]!.id);
  await qa('select public.daily_pass_apply($1,$2::jsonb)', [otherProfile, JSON.stringify([extend(60)])]);
  await q('delete from public.profiles where id=$1', [otherProfile]);
  assert.equal(Number((await q('select count(*)::int as n from public.daily_pass_ops where profile_id=$1', [otherProfile]))[0]!.n), 0);
  console.log('PG17 passed: v2→v3 transactional DDL, v2 tool fail-closed, full v2 coverage, concurrent distinct/replayed/reused/rolled-back ops on two connections with observed lock waits, reversed arrival, undo/stale correction, validation, owner/anon/backup boundaries, immutable rows, union-only v1/v2/v3 recovery and FK cascade. Hosted Auth/PostgREST not simulated.');
} finally { await Promise.allSettled([a.close(), b.close(), admin.close()]); }
