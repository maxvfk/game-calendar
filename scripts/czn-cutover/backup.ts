/** Additive logical snapshot/recovery candidate. Not wired to the hosted v1 age CLI. */
import { z } from 'zod';
import { makeSnapshot, validateSnapshot, canonical, sha256, sortRows, TABLES, type Snapshot, type Rows } from '../account-backup/model.ts';
import legacyContract from '../../supabase/backup-contract.v1.json';
import { readRows, restorePlan, selectProfiles, writeRestore, type Query } from '../account-backup/database.ts';
import { CZN_TABLES, assertCznTarget } from './contract.ts';
import { CZN_POLICY, CZN_SUBJECT } from '../../src/shared/cznDaily.ts';
const instant=z.string().datetime({offset:true});
const policySchema=z.object({profile_id:z.string().uuid(),policy_id:z.literal(CZN_POLICY),epoch:z.string().uuid(),cutover_at:instant}).strict();
const markSchema=z.object({...policySchema.omit({cutover_at:true}).shape,subject_id:z.literal(CZN_SUBJECT),
  day_key:z.string().regex(/^\d{4}-\d\d-\d\d$/).refine(s=>Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s),
  completed:z.boolean(),changed_at:instant,mutation_id:z.string().uuid(),received_at:instant}).strict();
const extensionSchema=z.object({czn_daily_release:z.array(z.object({singleton:z.literal(true),enabled:z.boolean()}).strict()).length(1),
  czn_daily_policy:z.array(policySchema),czn_daily_marks:z.array(markSchema)}).strict();
export type Extension=z.infer<typeof extensionSchema>;
const snapshotSchema=z.object({format:z.literal('game-calendar-personal-czn'),formatVersion:z.literal(2),
  schemaVersion:z.literal(2),schemaSha256:z.string().regex(/^[a-f0-9]{64}$/),
  base:z.unknown(),extension:extensionSchema,extensionSha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export type CznSnapshot=Omit<z.infer<typeof snapshotSchema>,'base'> & {base:Snapshot};
function validateExtension(base:Rows,extension:Extension){
  const profiles=new Set(base.profiles.map(p=>p.id));const policies=new Map<string,z.infer<typeof policySchema>>();
  for(const p of extension.czn_daily_policy){
    if(!profiles.has(p.profile_id)||policies.has(p.profile_id))throw new Error('Orphan/duplicate policy');
    policies.set(p.profile_id,p);
  }
  const keys=new Set<string>();
  for(const row of extension.czn_daily_marks){
    const p=policies.get(row.profile_id),key=canonical([row.profile_id,row.policy_id,row.subject_id,row.day_key]);
    if(!p||p.epoch!==row.epoch||keys.has(key))throw new Error('Orphan/duplicate mark');
    keys.add(key);
  }
}
export function makeCznSnapshot(base:Snapshot,extension:Extension,schemaSha256:string):CznSnapshot{
  validateSnapshot(base,base.projectRef,legacyContract.schemaSha256);
  const parsed=extensionSchema.parse(extension);
  const sorted={...parsed,czn_daily_policy:[...parsed.czn_daily_policy].sort((a,b)=>a.profile_id.localeCompare(b.profile_id)),
    czn_daily_marks:[...parsed.czn_daily_marks].sort((a,b)=>canonical([a.profile_id,a.day_key]).localeCompare(canonical([b.profile_id,b.day_key])))};
  validateExtension(base.data,sorted);
  return {format:'game-calendar-personal-czn',formatVersion:2,schemaVersion:2,schemaSha256,
    base,extension:sorted,extensionSha256:sha256(canonical(sorted))};
}
export function validateCznSnapshot(input:unknown,project:string,hash:string):CznSnapshot{
  const s=snapshotSchema.parse(input);if(s.schemaSha256!==hash)throw new Error('CZN schema mismatch');
  const base=validateSnapshot(s.base,project,legacyContract.schemaSha256);
  const rebuilt=makeCznSnapshot(base,s.extension,hash);
  if(canonical(rebuilt)!==canonical(s))throw new Error('CZN snapshot order/integrity mismatch');
  return rebuilt;
}
export async function readCznSnapshot(query:Query,meta:Parameters<typeof makeSnapshot>[1],hash:string):Promise<CznSnapshot>{
  await assertCznTarget(query,meta.projectRef,hash);
  const base=makeSnapshot(await readRows(query),{...meta,schemaSha256:legacyContract.schemaSha256});
  const extension={} as Record<string,unknown>;
  for(const table of CZN_TABLES)extension[table]=(await query(`select to_jsonb(t) as row from public.${table} t`)).map(r=>r.row);
  return makeCznSnapshot(base,extensionSchema.parse(extension),hash);
}
export function selectCznProfiles(input:Snapshot|CznSnapshot,selection:string[]|'all'){
  const isV2='base' in input,base=isV2?input.base:input;
  const data=selectProfiles(base,selection),ids=new Set(data.profiles.map(p=>p.id));
  const selected=makeSnapshot(data,base);
  return isV2?makeCznSnapshot(selected,{...input.extension,
    czn_daily_policy:input.extension.czn_daily_policy.filter(p=>ids.has(p.profile_id)),
    czn_daily_marks:input.extension.czn_daily_marks.filter(p=>ids.has(p.profile_id))},input.schemaSha256):selected;
}
/** Identical read-only planning rules are used before and inside the locked write transaction. */
export async function planCznRecovery(query:Query,input:unknown,project:string,hash:string){
  // Legacy v1 snapshots stay readable; this never manufactures a policy from old labels.
  const isV1=(input as {format?:string})?.format==='game-calendar-personal';
  const s=isV1?{base:validateSnapshot(input,project,legacyContract.schemaSha256),extension:null}:
    validateCznSnapshot(input,project,hash);
    await assertCznTarget(query,project,hash);
    const plan=await restorePlan(query,s.base.data);
    // PostgreSQL normalizes timezone representation at microsecond precision. Do not
    // use JS Date (millisecond truncation), or compare equivalent offsets as conflicts.
    const normalized={} as Rows;
    for(const table of TABLES)normalized[table]=sortRows(table,(await query(`select to_jsonb(r) as row from jsonb_populate_recordset(null::public.${table},$1::jsonb) r`,[canonical(s.base.data[table])])).map(r=>r.row as Record<string,unknown>));
    if(s.extension){
      for(const table of CZN_TABLES)s.extension[table]=(await query(`select to_jsonb(r) as row from jsonb_populate_recordset(null::public.${table},$1::jsonb) r`,[canonical(s.extension[table])])).map(r=>r.row) as never;
    }
    const ids=s.base.data.profiles.map(r=>String(r.id));
    const currentPolicies=(await query('select to_jsonb(t) as row from public.czn_daily_policy t where profile_id=any($1::uuid[])',[ids])).map(r=>r.row as Record<string,unknown>);
    for(const p of s.extension?.czn_daily_policy??[]){
      const current=currentPolicies.find(r=>r.profile_id===p.profile_id);
      if(current&&canonical(current)!==canonical(p))throw new Error('Live cutover fence differs; explicit recovery review required');
    }
    const frozenIds=currentPolicies.map(p=>String(p.profile_id));
    const live=await readRows(query,ids);
    const data={...normalized,daily_marks:sortRows('daily_marks',[
      ...normalized.daily_marks.filter(r=>r.subject_id!==CZN_SUBJECT||!frozenIds.includes(String(r.profile_id))),
      ...live.daily_marks.filter(r=>r.subject_id===CZN_SUBJECT&&frozenIds.includes(String(r.profile_id)))
    ])};
    for(const row of s.extension?.czn_daily_marks??[]){
      const current=(await query('select to_jsonb(t) as row from public.czn_daily_marks t where profile_id=$1 and day_key=$2',[row.profile_id,row.day_key]))[0]?.row;
      if(current&&typeof current==='object'&&(current as Record<string,unknown>).mutation_id===row.mutation_id&&canonical(current)!==canonical(row))
        throw new Error('Conflicting recovery mutation ID');
    }
    return {s,data,plan};
}
/** Caller owns transaction/locks for export. Restore owns its write transaction.
 * Old snapshots recover legacy state only; live fences/new marks always survive.
 * Conflicting epochs refuse rather than choosing one from an edit timestamp. */
export async function restoreCznSnapshot(query:Query,input:unknown,project:string,hash:string):Promise<void>{
  await query('begin');try{
    await query("set local timezone='UTC'");await query("set local statement_timeout='120s'");await query("set local lock_timeout='10s'");
    await query(`lock table public.profiles,public.progress,public.daily_marks,public.ignored,
      public.preferences,public.custom_games,public.custom_events,public.czn_daily_policy,public.czn_daily_marks
      in share row exclusive mode`);
    const {s,data}=await planCznRecovery(query,input,project,hash);
    await writeRestore(query,data);
    for(const p of s.extension?.czn_daily_policy??[])await query(`insert into public.czn_daily_policy
      select * from jsonb_populate_record(null::public.czn_daily_policy,$1::jsonb) on conflict do nothing`,[canonical(p)]);
    for(const row of s.extension?.czn_daily_marks??[]){
      const current=(await query(`select to_jsonb(t) as row from public.czn_daily_marks t where profile_id=$1 and day_key=$2`,[row.profile_id,row.day_key]))[0]?.row as Record<string,unknown>|undefined;
      if(current&&current.mutation_id===row.mutation_id&&canonical(current)!==canonical(row))
        throw new Error('Conflicting recovery mutation ID');
      await query(`insert into public.czn_daily_marks select * from jsonb_populate_record(null::public.czn_daily_marks,$1::jsonb)
        on conflict(profile_id,policy_id,subject_id,day_key) do update set completed=excluded.completed,
        changed_at=excluded.changed_at,mutation_id=excluded.mutation_id,received_at=excluded.received_at
        where (excluded.changed_at,excluded.mutation_id)>(czn_daily_marks.changed_at,czn_daily_marks.mutation_id)`,[canonical(row)]);
    }
    // The release switch is operational authority, not restored from an old backup.
    await query('commit');
  }catch(error){await query('rollback');throw error;}
}
