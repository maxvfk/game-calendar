import {z} from 'zod';
import {CznPolicy,CznMutation,CZN_POLICY,CZN_SUBJECT,CZN_CUTOVER_ENABLED,cznDayKey,mergeCzn} from '../../shared/cznDaily.ts';
import {profileKeys} from '../state/storage.ts';
import {supabase} from './remote.ts';
export type CznStore=Pick<Storage,'getItem'|'setItem'>;
const recoverySchema=z.object({daily:z.string().nullable(),outbox:z.string().nullable(),syncMeta:z.string().nullable()}).strict();
const stateSchema=z.object({version:z.literal(1),profileId:z.string(),policy:CznPolicy.nullable(),
  rows:z.array(CznMutation),pending:z.array(CznMutation),recovery:z.array(recoverySchema),imports:z.array(z.string())}).strict();
export type CznLocal=z.infer<typeof stateSchema>;
export const cznStorageKey=(profile:string)=>`${profileKeys(profile).daily}:czn-policy-v1`;
export function readCzn(store:CznStore,profileId:string):CznLocal{
  const raw=store.getItem(cznStorageKey(profileId));
  const state=raw===null?{version:1 as const,profileId,policy:null,rows:[],pending:[],recovery:[],imports:[]}:stateSchema.parse(JSON.parse(raw));
  if(state.profileId!==profileId)throw new Error('CZN profile mismatch');return state;
}
export function saveCzn(store:CznStore,state:CznLocal):void{
  const valid=stateSchema.parse(state);
  store.setItem(cznStorageKey(valid.profileId),JSON.stringify(valid));
}
/** One atomic extension write, no legacy journal/cache deletion, including malformed raw history. */
export function preserveCznLegacy(store:CznStore,state:CznLocal):CznLocal{
  const keys=profileKeys(state.profileId),entry={daily:store.getItem(keys.daily),outbox:store.getItem(keys.outbox),syncMeta:store.getItem(keys.syncMeta)};
  const baseline=(raw:string|null)=>{try{return JSON.stringify(JSON.parse(raw??'null')?.baseline??null);}catch{return raw;}};
  // Attempt/success timestamps change on every cycle; only new legacy content/versions need another recovery snapshot.
  if(state.recovery.some(r=>r.daily===entry.daily&&r.outbox===entry.outbox&&baseline(r.syncMeta)===baseline(entry.syncMeta)))return state;
  const next={...state,recovery:[...state.recovery,entry]};saveCzn(store,next);return next;
}
export function bindCznPolicy(store:CznStore,state:CznLocal,policy:CznPolicy):CznLocal{
  const parsed=CznPolicy.parse(policy);
  if(state.policy&&JSON.stringify(state.policy)!==JSON.stringify(parsed))throw new Error('CZN epoch changed; export recovery before continuing');
  const preserved=preserveCznLegacy(store,state),next={...preserved,policy:parsed};saveCzn(store,next);return next;
}
export function queueCzn(store:CznStore,state:CznLocal,dayKey:string,completed:boolean,now=Date.now()):CznLocal{
  if(!state.policy)throw new Error('CZN read-only: no confirmed policy');
  if(dayKey<cznDayKey(Date.parse(state.policy.cutoverAt))||dayKey>cznDayKey(now))throw new Error('CZN date outside policy window');
  const earlier=state.pending.filter(r=>r.dayKey===dayKey).map(r=>Date.parse(r.changedAt));
  const row=CznMutation.parse({policyId:CZN_POLICY,subjectId:CZN_SUBJECT,dayKey,completed,
    changedAt:new Date(Math.max(now,...earlier.map(t=>t+1))).toISOString(),mutationId:crypto.randomUUID()});
  const next={...state,rows:mergeCzn(state.rows,[row]),pending:[...state.pending,row]};
  // Persist before showing a completion; quota failure leaves caller's state unchanged.
  saveCzn(store,next);return next;
}
export function buildCznExport(state:CznLocal,personal?:unknown){return {format:'game-calendar-policy-export' as const,formatVersion:1 as const,state:stateSchema.parse(state),...(personal===undefined?{}:{personal})};}
export function importCzn(store:CznStore,state:CznLocal,input:unknown):CznLocal{
  const parsed=z.object({format:z.literal('game-calendar-policy-export'),formatVersion:z.literal(1),state:stateSchema,personal:z.unknown().optional()}).strict().parse(input);
  const raw=JSON.stringify(parsed);
  if(state.imports.includes(raw))return state;
  // Foreign/guest epochs are retained as a recovery source, never accepted as server authority.
  const same=state.profileId===parsed.state.profileId&&state.policy!==null&&JSON.stringify(state.policy)===JSON.stringify(parsed.state.policy);
  const sourceRows=same?parsed.state.rows:[];
  const ids=new Set(state.pending.map(r=>r.mutationId));
  const next={...state,rows:mergeCzn(state.rows,sourceRows),
    pending:[...state.pending,...sourceRows.filter(r=>!ids.has(r.mutationId))],imports:[...state.imports,raw]};
  saveCzn(store,next);return next;
}
const negotiationSchema=z.object({protocol:z.literal(2),enabled:z.boolean(),policy:CznPolicy.nullable()}).strict();
export type CznNegotiation=z.infer<typeof negotiationSchema>;
export type CznTransport={negotiate:(profile:string,cutover:boolean)=>Promise<CznNegotiation>;
  pull:(profile:string)=>Promise<CznMutation[]>;push:(profile:string,epoch:string,rows:CznMutation[])=>Promise<void>};
export const cznRemote:CznTransport={
  negotiate:async(profile,cutover)=>{const {data,error}=await supabase.rpc('czn_daily_negotiate',{p_profile_id:profile,p_cutover:cutover});
    if(error)throw error;return negotiationSchema.parse(data);},
  pull:async(profile)=>{
    const rows:CznMutation[]=[];
    for(let from=0;;from+=500){const {data,error}=await supabase.from('czn_daily_marks').select('*').eq('profile_id',profile).order('day_key').range(from,from+499);
      if(error)throw error;for(const r of data??[])rows.push(CznMutation.parse({policyId:r.policy_id,subjectId:r.subject_id,
        dayKey:r.day_key,completed:r.completed,changedAt:r.changed_at,mutationId:r.mutation_id}));
      if((data??[]).length<500)return rows;}
  },
  push:async(profile,epoch,rows)=>{
    for(let from=0;from<rows.length;from+=100){const batch=rows.slice(from,from+100);
      const {data,error}=await supabase.rpc('czn_daily_apply',{p_profile_id:profile,p_epoch:epoch,p_mutations:batch});
      if(error)throw error;
      if(!Array.isArray(data)||data.length!==batch.length||data.some((r,i)=>r.mutationId!==batch[i]?.mutationId||!['accepted','superseded'].includes(r.outcome)))
        throw new Error('Unrecognized CZN acknowledgement');}
  }
};
/** No automatic cutover: caller first obtains enabled capability and explicitly starts.
 * active() must validate the current Auth/profile binding after each network await. */
export async function syncCzn(store:CznStore,profile:string,active:()=>boolean,
  transport:CznTransport=cznRemote,enabled=CZN_CUTOVER_ENABLED,cutover=false):Promise<{state:CznLocal;readOnly:boolean}>{
  let state=readCzn(store,profile);
  if(!enabled)return {state,readOnly:true};
  const check=()=>{if(!active())throw new Error('CZN account session changed');};check();
  state=preserveCznLegacy(store,state);
  const reply=negotiationSchema.parse(await transport.negotiate(profile,cutover));check();
  if(reply.policy)state=bindCznPolicy(store,readCzn(store,profile),reply.policy);
  if(!reply.policy)return {state,readOnly:true};
  const before=await transport.pull(profile);check();
  state=readCzn(store,profile);const sent=state.pending;
  if(reply.enabled&&sent.length){await transport.push(profile,reply.policy.epoch,sent);check();}
  const remote=reply.enabled&&sent.length?await transport.pull(profile):before;check();
  const latest=readCzn(store,profile);
  const winners=mergeCzn([],remote);
  const pending=latest.pending.filter(row=>!winners.some(w=>w.dayKey===row.dayKey&&
    (Date.parse(w.changedAt)>Date.parse(row.changedAt)||(Date.parse(w.changedAt)===Date.parse(row.changedAt)&&w.mutationId>=row.mutationId))));
  const next={...latest,rows:mergeCzn(winners,pending),pending};saveCzn(store,next);
  return {state:next,readOnly:!reply.enabled};
}
/** A guest epoch never authorizes account writes and is not automatically adopted on login. */
export function startGuestCzn(store:CznStore,state:CznLocal,now=Date.now()):CznLocal{
  if(!state.profileId.startsWith('local:'))throw new Error('Account cutover requires server confirmation');
  return state.policy?state:bindCznPolicy(store,state,{policyId:CZN_POLICY,epoch:crypto.randomUUID(),cutoverAt:new Date(now).toISOString()});
}
export function importLegacyCzn(store:CznStore,state:CznLocal,input:unknown):CznLocal{
  const value=input as {format?:unknown};
  if(!value||value.format!=='gacha-tracker-export')throw new Error('Expected a legacy export');
  const raw=JSON.stringify(input);
  if(state.imports.includes(raw))return state;
  // Preserve the entire source, including incomplete logs; never union into policy registers.
  const next={...state,imports:[...state.imports,raw]};saveCzn(store,next);return next;
}
