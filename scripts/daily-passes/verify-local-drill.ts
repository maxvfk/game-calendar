/** CI-only synthetic encrypted v3 input for the exact operator drill CLI (separate empty PG17 cluster). */
import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { passesCandidateDatabase } from './contract.ts';
import { readPassesSnapshot } from './backup.ts';
import { encryptPasses } from './encryption.ts';
import { localDrill } from '../czn-cutover/local-drill.ts';
import { PRODUCTION_PROJECT as project } from '../czn-cutover/production.ts';
import type { Query } from '../account-backup/database.ts';
import v3 from '../../supabase/backup-contract.passes-v3.json';

const dir = await mkdtemp(join(tmpdir(), 'passes-local-drill-')), db = await passesCandidateDatabase();
const q: Query = async (s, p = []) => (await db.query(s, p)).rows as Record<string, unknown>[];
try {
  const id = '11111111-1111-4111-8111-111111111111', op = (n: number) => `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, '0')}`;
  await q('insert into calendar_backup_control.project_identity(project_ref) values($1)', [project]);
  await q('insert into auth.users values($1)', [id]);
  await q("insert into public.profiles(id,owner_id,name,is_default) values($1,$1,'Synthetic drill',true)", [id]);
  // Microsecond timestamps and every op kind, including a based_on array, survive the round trip.
  await q(`insert into public.daily_pass_ops(profile_id,op_id,game,region,kind,action_day,created_at,days,last_day,target_op,based_on,resolution,received_at) values
    ($1,$2,'genshin','asia','extend','2026-11-01','2026-11-01T10:00:00.123456Z',30,null,null,null,null,'2026-11-01T10:00:01.654321Z'),
    ($1,$3,'genshin','asia','set','2026-11-02','2026-11-02T10:00:00Z',null,'2026-11-20',null,array[$2::uuid],null,'2026-11-02T10:00:01Z'),
    ($1,$4,'mygame:demo','europe','undo','2026-11-03','2026-11-03T10:00:00Z',null,null,$2,null,null,'2026-11-03T10:00:01Z'),
    ($1,$5,'czn','america','resolve','2026-11-04','2026-11-04T10:00:00Z',null,null,$2,null,'include','2026-11-04T10:00:01Z')`,
  [id, op(1), op(2), op(3), op(4)]);
  const snapshot = await readPassesSnapshot(q, { createdAt: new Date().toISOString(), projectRef: project, sourceRevision: 'a'.repeat(40),
    schemaSha256: v3.schemaSha256, migrationSha256: v3.migrationSha256 }, v3.schemaSha256);
  assert.equal(snapshot.passes.daily_pass_ops.length, 4);
  const key = join(dir, 'identity'), gen = Bun.spawn(['age-keygen', '-o', key], { stderr: 'pipe' });
  await new Response(gen.stderr).text(); assert.equal(await gen.exited, 0);
  const pub = Bun.spawn(['age-keygen', '-y', key], { stdout: 'pipe', stderr: 'pipe' }), recipient = (await new Response(pub.stdout).text()).trim();
  assert.equal(await pub.exited, 0);
  const path = await encryptPasses(dir, snapshot, recipient), args = ['--execute-local', '--project-ref', project, '--snapshot', path, '--identity', key];
  await localDrill(args); await assert.rejects(localDrill(args), /empty isolated cluster/);
  console.log('Synthetic v3 operator drill passed: real age decrypt, empty PG17 v3 recovery, every op kind and microseconds verified; second run refused without writes.');
} finally { await db.close(); await rm(dir, { recursive: true, force: true }); }
