import { beforeAll, afterAll, test, expect } from 'bun:test';
import type { PGlite } from '@electric-sql/pglite';
import { passesCandidateDatabase, generatedPassesContract, assertPassesTarget, assertPassesBackupRole } from '../scripts/daily-passes/contract.ts';
import { readPassesSnapshot, validatePassesSnapshot, restorePassesSnapshot, makePassesSnapshot, selectPassesProfiles, planPassesRecovery } from '../scripts/daily-passes/backup.ts';
import { candidateDatabase, assertCznTarget } from '../scripts/czn-cutover/contract.ts';
import { readCznSnapshot, restoreCznSnapshot } from '../scripts/czn-cutover/backup.ts';
import { detectContract, assertAccess } from '../scripts/czn-cutover/production.ts';
import { assertTarget, type Query } from '../scripts/account-backup/database.ts';
import { canonical, TABLES } from '../scripts/account-backup/model.ts';
import { passOpFromRow, reducePass } from '../src/shared/dailyPasses.ts';
import v1 from '../supabase/backup-contract.v1.json';
import v2 from '../supabase/backup-contract.czn-v2.json';
import v3 from '../supabase/backup-contract.passes-v3.json';

const project = 'vzzudezdigjwbwfejlsg';
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
const today = new Date().toISOString().slice(0, 10);
const shift = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const meta = (hash: string, migrationSha256: Record<string, string>) => ({ createdAt: new Date().toISOString(), projectRef: project,
  sourceRevision: 'a'.repeat(40), schemaSha256: hash, migrationSha256 });
let db: PGlite, profile: string, otherProfile: string;
const q: Query = async (s, p = []) => (await db.query(s, p)).rows as Record<string, unknown>[];
async function as(uid: string | null, fn: () => Promise<void>, role = 'authenticated') {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid ?? '']); await db.exec(`set role ${role}`);
  try { await fn(); } finally { await db.exec('reset role'); }
}
const extend = (n: number, day = today, days = 30) => ({ opId: id(n), game: 'genshin', region: 'asia', kind: 'extend', actionDay: day,
  createdAt: `${day}T10:00:00.${String(n % 1000).padStart(3, '0')}Z`, days });
const apply = (ops: unknown[], p = profile) => q('select public.daily_pass_apply($1,$2::jsonb) as reply', [p, JSON.stringify(ops)]);
const opCount = async () => Number((await q('select count(*)::int as n from public.daily_pass_ops'))[0]!.n);
const ownOps = async () => (await q('select to_jsonb(t) as row from public.daily_pass_ops t where profile_id=$1', [profile])).map(r => passOpFromRow(r.row as never));

beforeAll(async () => {
  db = await passesCandidateDatabase();
  await q('insert into auth.users values ($1),($2)', [owner, other]);
  await q('insert into calendar_backup_control.project_identity(project_ref) values($1)', [project]);
  await as(owner, async () => { profile = String((await q('select public.ensure_default_profile() as id'))[0]!.id); });
  await as(other, async () => { otherProfile = String((await q('select public.ensure_default_profile() as id'))[0]!.id); });
}, 20000);
afterAll(async () => { await db.close(); });

test('two distinct +30 survive as +60; an exact replay is accepted and adds nothing', async () => {
  await as(owner, async () => {
    expect((await apply([extend(1)]))[0]!.reply).toEqual([{ opId: id(1), outcome: 'accepted' }]);
    expect((await apply([extend(2), extend(1)]))[0]!.reply).toEqual([{ opId: id(2), outcome: 'accepted' }, { opId: id(1), outcome: 'accepted' }]);
    // Same instant, different offset spelling: the same op, not a reuse.
    expect((await apply([{ ...extend(1), createdAt: `${today}T12:00:00.001+02:00` }]))[0]!.reply).toEqual([{ opId: id(1), outcome: 'accepted' }]);
  });
  expect(await opCount()).toBe(2);
  expect(reducePass(await ownOps(), 'genshin', 'asia').lastDay).toBe(shift(today, 59));
});

test('op ID reused with different content fails the whole batch and leaves the row unchanged', async () => {
  const before = canonical(await q('select * from public.daily_pass_ops order by op_id'));
  await as(owner, async () => {
    await expect(apply([extend(3), { ...extend(1), days: 31 }])).rejects.toThrow('reused');
    await expect(apply([{ ...extend(1), region: 'europe' }])).rejects.toThrow('reused');
  });
  expect(canonical(await q('select * from public.daily_pass_ops order by op_id'))).toBe(before);
});

test('per-kind validation, future action day, game format and batch limit', async () => {
  const before = await opCount();
  const common = { opId: id(50), game: 'genshin', region: 'asia', actionDay: today, createdAt: `${today}T10:00:00Z` };
  const bad: unknown[] = [
    { ...extend(50), actionDay: '2026-02-30' }, { ...extend(50), days: 0 }, { ...extend(50), days: 181 }, { ...extend(50), days: 1.5 },
    { ...extend(50), days: '30' }, { ...extend(50), extra: true }, { ...extend(50), kind: 'grant' }, { ...extend(50), region: 'sea' },
    { ...extend(50), game: 'Genshin' }, { ...extend(50), game: 'dailies' }, { ...extend(50), game: 'mygame' }, { ...extend(50), game: 'myevent:abc123' },
    { ...extend(50), game: 'genshin:x' }, { ...extend(50), opId: id(50).toUpperCase() }, { ...extend(50), createdAt: `${today}T10:00:00` },
    { ...extend(50), createdAt: 'infinity' }, { ...extend(50), actionDay: shift(today, 2) },
    { ...common, kind: 'undo' }, { ...common, kind: 'undo', targetOp: id(50) }, { ...common, kind: 'undo', targetOp: id(1), days: 30 },
    { ...common, kind: 'resolve', targetOp: id(1) }, { ...common, kind: 'resolve', targetOp: id(1), resolution: 'maybe' },
    { ...common, kind: 'set', lastDay: null }, { ...common, kind: 'set', lastDay: '2026-02-30', basedOn: [] },
    { ...common, kind: 'set', lastDay: null, basedOn: [id(1), id(1)] },
    { ...common, kind: 'set', lastDay: null, basedOn: Array.from({ length: 501 }, (_, i) => id(1000 + i)) },
  ];
  await as(owner, async () => {
    for (const op of bad) await expect(apply([op])).rejects.toThrow();
    await expect(apply(Array.from({ length: 101 }, (_, i) => extend(200 + i)))).rejects.toThrow('batch');
    await expect(q('select public.daily_pass_apply($1,$2::jsonb)', [profile, '{"not":"array"}'])).rejects.toThrow('batch');
  });
  expect(await opCount()).toBe(before);
  await as(owner, async () => {
    await apply([{ ...extend(51), game: 'mygame:my-lane' }, { ...extend(52), actionDay: shift(today, 1) }, { ...extend(53), game: 'futuregame2' },
      { ...common, opId: id(54), kind: 'set', lastDay: null, basedOn: Array.from({ length: 500 }, (_, i) => id(1500 - i)) },
      { ...common, opId: id(55), kind: 'undo', targetOp: id(999) }, { ...common, opId: id(56), kind: 'resolve', targetOp: id(998), resolution: 'exclude' }]);
  });
  const set = (await q('select based_on::text[] as b from public.daily_pass_ops where op_id=$1', [id(54)]))[0]!.b as string[];
  expect(set).toHaveLength(500);
  expect(set[0]).toBe(id(1001));
  expect(await opCount()).toBe(before + 6);
});

test('review P1/P2: instants and days at both calendar limits round-trip RPC → UTC row → reducer and backup', async () => {
  const at = (n: number, createdAt: string, extra: Record<string, unknown> = {}) =>
    ({ opId: id(n), game: 'zzz', region: 'europe', kind: 'extend', actionDay: today, createdAt, days: 30, ...extra });
  const before = await opCount();
  await as(owner, async () => {
    for (const createdAt of ['9999-12-31T23:59:59-14:00', '9999-12-31T10:00:00-14:00', '0001-01-01T00:00:00+14:00'])
      await expect(apply([at(80, createdAt)])).rejects.toThrow('invalid daily pass op');
  });
  expect(await opCount()).toBe(before);
  await expect(q(`insert into public.daily_pass_ops(profile_id,op_id,game,region,kind,action_day,created_at,days)
    values($1,$2,'zzz','europe','extend',$3,'9999-12-31T23:59:59-14:00',30)`, [profile, id(81), today])).rejects.toThrow();
  await as(owner, async () => {
    await apply([at(82, '9999-12-31T23:59:59.999Z'), at(83, '0001-01-01T10:00:00+10:00', { actionDay: '0001-01-01' }),
      { opId: id(84), game: 'zzz', region: 'europe', kind: 'set', actionDay: today, createdAt: '9999-12-31T09:59:59+14:00', lastDay: '9999-12-31', basedOn: [] }]);
  });
  const rows = (await q("select to_jsonb(t) as row from public.daily_pass_ops t where game='zzz'")).map(r => r.row as Record<string, unknown>);
  expect(rows.map(r => r.created_at).sort()).toEqual(['0001-01-01T00:00:00+00:00', '9999-12-30T19:59:59+00:00', '9999-12-31T23:59:59.999+00:00']);
  const state = reducePass(rows.map(r => passOpFromRow(r)), 'zzz', 'europe');
  expect(state).toMatchObject({ lastDay: '9999-12-31', winningSet: id(84), outOfRange: [id(82)], conflicts: [id(83)] });
  const snap = await readPassesSnapshot(q, meta(v3.schemaSha256, v3.migrationSha256), v3.schemaSha256);
  expect(snap.passes.daily_pass_ops.filter(o => o.game === 'zzz')).toHaveLength(3);
});

test('ownership, RLS and grants: other accounts, anon and the backup role cannot write or see foreign ops', async () => {
  await as(other, async () => {
    expect(await q('select * from public.daily_pass_ops')).toHaveLength(0);
    await expect(apply([extend(60)])).rejects.toThrow('profile unavailable');
    await apply([extend(61)], otherProfile);
    expect(await q('select * from public.daily_pass_ops')).toHaveLength(1);
  });
  await as(null, async () => {
    await expect(apply([extend(62)])).rejects.toThrow();
    await expect(q('select * from public.daily_pass_ops')).rejects.toThrow();
  }, 'anon');
  await as(owner, async () => {
    await expect(q(`insert into public.daily_pass_ops(profile_id,op_id,game,region,kind,action_day,created_at,days)
      values($1,$2,'genshin','asia','extend',$3,now(),30)`, [profile, id(63), today])).rejects.toThrow();
    await expect(q('update public.daily_pass_ops set days=180')).rejects.toThrow();
    await expect(q('delete from public.daily_pass_ops')).rejects.toThrow();
    await expect(q("select public.daily_pass_valid_day('2026-01-01')")).rejects.toThrow();
  });
  const total = await opCount();
  await as(null, async () => {
    await assertPassesBackupRole(q);
    expect(await opCount()).toBe(total);
    await expect(apply([extend(64)])).rejects.toThrow();
    await expect(q('delete from public.daily_pass_ops')).rejects.toThrow();
  }, 'calendar_backup');
  // Even the owner role cannot rewrite an op.
  await expect(q('update public.daily_pass_ops set days=180 where op_id=$1', [id(1)])).rejects.toThrow('immutable');
});

test('v2 tooling fails closed on the v3 schema; v3 detection, access and contract checks pass', async () => {
  await expect(assertCznTarget(q, project, v2.schemaSha256)).rejects.toThrow('Uncovered child table');
  await expect(readCznSnapshot(q, meta(v2.schemaSha256, v2.migrationSha256), v2.schemaSha256)).rejects.toThrow('Uncovered child table');
  await expect(assertTarget(q, project, v1.schemaSha256)).rejects.toThrow();
  expect(await detectContract(q, project)).toBe(3);
  await assertAccess(q, 3);
  await assertPassesTarget(q, project, v3.schemaSha256);
});

test('v3 snapshot covers every v2 table plus ops; restores union ops and never delete them', async () => {
  const snapshot = await readPassesSnapshot(q, meta(v3.schemaSha256, v3.migrationSha256), v3.schemaSha256);
  expect(snapshot.passes.daily_pass_ops).toHaveLength(await opCount());
  expect(Object.keys(snapshot.base.data).sort()).toEqual([...TABLES].sort());
  expect(Object.keys(snapshot.extension).sort()).toEqual(['czn_daily_marks', 'czn_daily_policy', 'czn_daily_release']);
  expect(validatePassesSnapshot(structuredClone(snapshot), project, v3.schemaSha256)).toEqual(snapshot);
  const tampered = structuredClone(snapshot); tampered.passes.daily_pass_ops[0]!.days = 99;
  expect(() => validatePassesSnapshot(tampered, project, v3.schemaSha256)).toThrow();
  expect(() => validatePassesSnapshot(snapshot, project, v2.schemaSha256)).toThrow();
  const all = canonical(await q('select * from public.daily_pass_ops order by profile_id,op_id'));

  // Legacy v1 and v2 snapshots carry no ops; restoring them must leave every op in place.
  await restorePassesSnapshot(q, snapshot.base, project, v3.schemaSha256);
  const v2shaped = { format: 'game-calendar-personal-czn', formatVersion: 2, schemaVersion: 2, schemaSha256: v2.schemaSha256,
    base: snapshot.base, extension: snapshot.extension, extensionSha256: snapshot.extensionSha256 };
  await restorePassesSnapshot(q, v2shaped, project, v3.schemaSha256);
  expect(canonical(await q('select * from public.daily_pass_ops order by profile_id,op_id'))).toBe(all);

  // A lost op comes back; a live op not in the snapshot survives.
  await q('delete from public.daily_pass_ops where op_id=$1', [id(2)]);
  await as(owner, async () => { await apply([extend(70)]); });
  await restorePassesSnapshot(q, snapshot, project, v3.schemaSha256);
  expect(Number((await q('select count(*)::int as n from public.daily_pass_ops where op_id=any($1::uuid[])', [[id(2), id(70)]]))[0]!.n)).toBe(2);
  await restorePassesSnapshot(q, snapshot, project, v3.schemaSha256);

  // Conflicting content under a live op ID refuses the whole recovery.
  const clash = structuredClone(snapshot);
  clash.passes.daily_pass_ops.find(o => o.op_id === id(1))!.days = 7;
  const rebuilt = makePassesSnapshot(clash.base, clash.extension, clash.passes, v3.schemaSha256);
  const before = canonical(await q('select * from public.daily_pass_ops order by profile_id,op_id'));
  await expect(restorePassesSnapshot(q, rebuilt, project, v3.schemaSha256)).rejects.toThrow('Conflicting');
  expect(canonical(await q('select * from public.daily_pass_ops order by profile_id,op_id'))).toBe(before);

  // Selected-profile recovery carries only that profile's ops; v3 input on the v2 reader is refused.
  const one = selectPassesProfiles(snapshot, [otherProfile]);
  expect('passes' in one && one.passes.daily_pass_ops.every(o => o.profile_id === otherProfile)).toBe(true);
  await q('begin read only'); await planPassesRecovery(q, one, project, v3.schemaSha256); await q('rollback');
  await expect(restoreCznSnapshot(q, snapshot, project, v2.schemaSha256)).rejects.toThrow();
}, 30000);

test('profile deletion cascades to its ops', async () => {
  await q('delete from public.profiles where id=$1', [otherProfile]);
  expect(Number((await q('select count(*)::int as n from public.daily_pass_ops where profile_id=$1', [otherProfile]))[0]!.n)).toBe(0);
});

test('v2 restore on a v2 schema is unchanged by the refactor', async () => {
  const v2db = await candidateDatabase();
  const v2q: Query = async (s, p = []) => (await v2db.query(s, p)).rows as Record<string, unknown>[];
  try {
    await v2q('insert into calendar_backup_control.project_identity(project_ref) values($1)', [project]);
    const snap = await readCznSnapshot(v2q, meta(v2.schemaSha256, v2.migrationSha256), v2.schemaSha256);
    await restoreCznSnapshot(v2q, snap, project, v2.schemaSha256);
    expect(await detectContract(v2q, project)).toBe(2);
    // A partially applied daily pass candidate is never accepted as v2.
    await v2db.exec("create function public.daily_pass_apply(uuid,jsonb) returns jsonb language sql as $$select '[]'::jsonb$$");
    await expect(detectContract(v2q, project)).rejects.toThrow('Daily pass schema mismatch');
  } finally { await v2db.close(); }
}, 20000);

test('v3 contract regenerates exactly', async () => {
  expect(await generatedPassesContract()).toEqual(v3);
}, 20000);
