/**
 * v3 logical snapshot: the complete v2 payload (7 base tables + CZN) plus
 * `daily_pass_ops`. Recovery keeps every v2 rule and adds one for ops: they are
 * data, never state, so a restore only UNIONS them in. No snapshot, v1, v2 or v3,
 * ever deletes or rewrites an op that is live in the database.
 */
import { z } from 'zod';
import { makeSnapshot, validateSnapshot, canonical, sha256, type Snapshot } from '../account-backup/model.ts';
import { readRows, selectProfiles, type Query } from '../account-backup/database.ts';
import { CZN_TABLES } from '../czn-cutover/contract.ts';
import { makeCznSnapshot, validateCznRecoveryInput, planValidatedCznRecovery, writeCznRecovery, selectCznProfiles,
  type CznSnapshot, type Extension } from '../czn-cutover/backup.ts';
import { assertPassesTarget } from './contract.ts';
import { isPassDay, isPassGameId, MAX_BASED_ON, MAX_PASS_OP_DAYS } from '../../src/shared/dailyPasses.ts';
import legacyContract from '../../supabase/backup-contract.v1.json';
import v2Contract from '../../supabase/backup-contract.czn-v2.json';

export const PASSES_FORMAT = 'game-calendar-personal-passes' as const;
const uuid = z.string().uuid();
const instant = z.string().datetime({ offset: true });
const day = z.string().refine(isPassDay);
/** Mirrors the table's own constraints, not the RPC wire: a backup must never refuse a row the database holds. */
export const opRowSchema = z.object({
  profile_id: uuid, op_id: uuid, game: z.string().refine(isPassGameId),
  region: z.enum(['america', 'europe', 'asia']), kind: z.enum(['extend', 'set', 'undo', 'resolve']),
  action_day: day, created_at: instant, days: z.number().int().min(1).max(MAX_PASS_OP_DAYS).nullable(),
  last_day: day.nullable(), target_op: uuid.nullable(), based_on: z.array(uuid).max(MAX_BASED_ON).nullable(),
  resolution: z.enum(['include', 'exclude']).nullable(), received_at: instant,
}).strict().superRefine((r, ctx) => {
  const shape = r.kind === 'extend' ? r.days !== null && r.last_day === null && r.target_op === null && r.based_on === null && r.resolution === null
    : r.kind === 'set' ? r.days === null && r.target_op === null && r.based_on !== null && r.resolution === null
    : r.kind === 'undo' ? r.days === null && r.last_day === null && r.target_op !== null && r.target_op !== r.op_id && r.based_on === null && r.resolution === null
    : r.days === null && r.last_day === null && r.target_op !== null && r.target_op !== r.op_id && r.based_on === null && r.resolution !== null;
  if (!shape) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid daily pass op shape' });
});
export type OpRow = z.infer<typeof opRowSchema>;
const passesSchema = z.object({ daily_pass_ops: z.array(opRowSchema) }).strict();
export type Passes = z.infer<typeof passesSchema>;
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const snapshotSchema = z.object({
  format: z.literal(PASSES_FORMAT), formatVersion: z.literal(3), schemaVersion: z.literal(3), schemaSha256: hash,
  base: z.unknown(), extension: z.unknown(), extensionSha256: hash, passes: passesSchema, passesSha256: hash,
}).strict();
export type PassesSnapshot = {
  format: typeof PASSES_FORMAT; formatVersion: 3; schemaVersion: 3; schemaSha256: string;
  base: Snapshot; extension: Extension; extensionSha256: string; passes: Passes; passesSha256: string;
};
const opKey = (r: { profile_id: string; op_id: string }) => canonical([r.profile_id, r.op_id]);

export function makePassesSnapshot(base: Snapshot, extension: Extension, passes: Passes, schemaSha256: string): PassesSnapshot {
  // Reuses v2's validation/sorting of the base and CZN extension byte for byte.
  const czn = makeCznSnapshot(base, extension, schemaSha256);
  const parsed = passesSchema.parse(passes);
  const profiles = new Set(czn.base.data.profiles.map(p => String(p.id))), keys = new Set<string>();
  const ops = [...parsed.daily_pass_ops].sort((a, b) => (opKey(a) < opKey(b) ? -1 : opKey(a) > opKey(b) ? 1 : 0));
  for (const op of ops) {
    if (!profiles.has(op.profile_id) || keys.has(opKey(op))) throw new Error('Orphan/duplicate daily pass op');
    keys.add(opKey(op));
  }
  const sorted = { daily_pass_ops: ops };
  return { format: PASSES_FORMAT, formatVersion: 3, schemaVersion: 3, schemaSha256, base: czn.base,
    extension: czn.extension, extensionSha256: czn.extensionSha256, passes: sorted, passesSha256: sha256(canonical(sorted)) };
}

export function validatePassesSnapshot(input: unknown, project: string, schemaHash: string): PassesSnapshot {
  const s = snapshotSchema.parse(input);
  if (s.schemaSha256 !== schemaHash) throw new Error('Daily pass schema mismatch');
  const base = validateSnapshot(s.base, project, legacyContract.schemaSha256);
  const rebuilt = makePassesSnapshot(base, s.extension as Extension, s.passes, schemaHash);
  if (canonical(rebuilt) !== canonical(s)) throw new Error('Daily pass snapshot order/integrity mismatch');
  return rebuilt;
}

/** Caller owns the REPEATABLE READ READ ONLY transaction. */
export async function readPassesSnapshot(query: Query, meta: Parameters<typeof makeSnapshot>[1], schemaHash: string): Promise<PassesSnapshot> {
  await assertPassesTarget(query, meta.projectRef, schemaHash);
  const base = makeSnapshot(await readRows(query), { ...meta, schemaSha256: legacyContract.schemaSha256 });
  const extension = {} as Record<string, unknown>;
  for (const table of CZN_TABLES) extension[table] = (await query(`select to_jsonb(t) as row from public.${table} t`)).map(r => r.row);
  const ops = (await query('select to_jsonb(t) as row from public.daily_pass_ops t')).map(r => r.row);
  return makePassesSnapshot(base, extension as Extension, { daily_pass_ops: ops as OpRow[] }, schemaHash);
}

export type AnySnapshot = Snapshot | CznSnapshot | PassesSnapshot;
const isV3 = (input: unknown): input is PassesSnapshot => (input as { format?: string })?.format === PASSES_FORMAT;

export function selectPassesProfiles(input: AnySnapshot, selection: string[] | 'all'): AnySnapshot {
  if (!isV3(input)) return selectCznProfiles(input, selection);
  const data = selectProfiles(input.base, selection), ids = new Set(data.profiles.map(p => String(p.id)));
  return makePassesSnapshot(makeSnapshot(data, input.base), {
    ...input.extension,
    czn_daily_policy: input.extension.czn_daily_policy.filter(p => ids.has(p.profile_id)),
    czn_daily_marks: input.extension.czn_daily_marks.filter(p => ids.has(p.profile_id)),
  }, { daily_pass_ops: input.passes.daily_pass_ops.filter(o => ids.has(o.profile_id)) }, input.schemaSha256);
}

/** v1, v2 and v3 inputs all recover INTO the v3 schema; only v3 carries ops. */
function validateRecoveryInput(input: unknown, project: string, schemaHash: string) {
  if (isV3(input)) {
    const s = validatePassesSnapshot(input, project, schemaHash);
    return { base: s.base, extension: s.extension, ops: s.passes.daily_pass_ops };
  }
  return { ...validateCznRecoveryInput(input, project, v2Contract.schemaSha256), ops: [] as OpRow[] };
}

const CONTENT = 'game,region,kind,action_day,created_at,days,last_day,target_op,based_on,resolution';
/** Same op ID with different content anywhere live refuses the whole recovery. */
async function opConflicts(query: Query, ops: OpRow[]) {
  if (!ops.length) return 0;
  const rows = await query(`select count(*)::int as n from jsonb_populate_recordset(null::public.daily_pass_ops,$1::jsonb) s
    join public.daily_pass_ops t using (profile_id,op_id)
    where (${CONTENT.split(',').map(c => 't.' + c).join(',')}) is distinct from (${CONTENT.split(',').map(c => 's.' + c).join(',')})`,
  [canonical(ops)]);
  return Number(rows[0]!.n);
}

/** Identical read-only planning before and inside the locked write transaction. */
export async function planPassesRecovery(query: Query, input: unknown, project: string, schemaHash: string) {
  const s = validateRecoveryInput(input, project, schemaHash);
  await assertPassesTarget(query, project, schemaHash);
  const czn = await planValidatedCznRecovery(query, s);
  if (await opConflicts(query, s.ops)) throw new Error('Conflicting recovery daily pass op ID');
  const ids = s.base.data.profiles.map(p => String(p.id));
  const existing = Number((await query('select count(*)::int as n from public.daily_pass_ops where profile_id=any($1::uuid[])', [ids]))[0]!.n);
  return { ...czn, s, ops: s.ops, opsPlan: { mode: 'union-insert-never-delete' as const, existing, snapshot: s.ops.length } };
}

/** Restore owns its write transaction and locks every covered table, ops included. */
export async function restorePassesSnapshot(query: Query, input: unknown, project: string, schemaHash: string): Promise<void> {
  await query('begin');
  try {
    await query("set local timezone='UTC'"); await query("set local statement_timeout='120s'"); await query("set local lock_timeout='10s'");
    await query(`lock table public.profiles,public.progress,public.daily_marks,public.ignored,
      public.preferences,public.custom_games,public.custom_events,public.czn_daily_policy,public.czn_daily_marks,
      public.daily_pass_ops in share row exclusive mode`);
    const { s, data, ops } = await planPassesRecovery(query, input, project, schemaHash);
    const ids = s.base.data.profiles.map(p => String(p.id));
    const before = await query('select profile_id,op_id from public.daily_pass_ops where profile_id=any($1::uuid[])', [ids]);
    await writeCznRecovery(query, s, data);
    if (ops.length) await query(`insert into public.daily_pass_ops select * from
      jsonb_populate_recordset(null::public.daily_pass_ops,$1::jsonb) on conflict (profile_id,op_id) do nothing`, [canonical(ops)]);
    // Every live op survived, and every snapshot op is present with identical content.
    const after = await query('select profile_id,op_id from public.daily_pass_ops where profile_id=any($1::uuid[])', [ids]);
    const live = new Set(after.map(r => opKey(r as never)));
    if (before.some(r => !live.has(opKey(r as never))) || ops.some(o => !live.has(opKey(o))) || await opConflicts(query, ops))
      throw new Error('Post-restore daily pass verification failed');
    await query('commit');
  } catch (error) { await query('rollback'); throw error; }
}
