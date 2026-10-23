import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {CZN_POLICY,CZN_CUTOVER_ENABLED,CZN_SUBJECT,cznDayKey,cznDayStart,cznNextReset,cznDays,mergeCzn,type CznPolicy} from '../src/shared/cznDaily.ts';
import {readCzn,bindCznPolicy,queueCzn,buildCznExport,importCzn,importLegacyCzn,preserveCznLegacy,syncCzn,startGuestCzn,type CznTransport} from '../src/client/account/cznProtocol.ts';
import {parseImportData} from '../src/client/state/export.ts';
import {writeAccountCache} from '../src/client/account/firstLogin.ts';
import {initializeAccountProfile} from '../src/client/account/localSync.ts';
import {profileKeys} from '../src/client/state/storage.ts';
import {syncProfile} from '../src/client/account/syncEngine.ts';
import {defaults} from '../src/client/state/usePrefs.ts';
import {applyMutation,emptySyncState,SyncMutation} from '../src/shared/sync.ts';
import {CznDailyPanel} from '../src/client/components/CznDailyPanel.tsx';
import {CznDailyFeature} from '../src/client/components/CznDailyFeature.tsx';
import {dailyGroups} from '../src/client/components/Dailies.tsx';
import {metaFor} from '../src/shared/games.ts';
import {dayKey,nextResetMs} from '../src/shared/daily.ts';
import {dayStartMs} from '../src/shared/time.ts';
class Store {v=new Map<string,string>();getItem(k:string){return this.v.get(k)??null;}setItem(k:string,v:string){this.v.set(k,v);}}
const profile='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',owner='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const at=Date.parse('2026-10-22T18:00:00Z');
const policy:CznPolicy={policyId:CZN_POLICY,epoch:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',cutoverAt:new Date(at).toISOString()};
function ready(){const store=new Store();return{store,state:bindCznPolicy(store,readCzn(store,profile),policy)};}
test('UTC opening arithmetic at -1/exact/+1ms, next reset inverse, month/year and DST probe dates',()=>{
  for(const date of ['2026-10-22','2026-12-31','2027-01-01','2026-03-08','2026-03-29','2026-10-25','2026-11-01']){
    const boundary=Date.parse(`${date}T18:00:00Z`);
    for(const delta of [-1,0,1]){const now=boundary+delta,key=cznDayKey(now);
      expect(cznDayStart(key)).toBeLessThanOrEqual(now);expect(cznNextReset(now)).toBeGreaterThan(now);
      expect(cznNextReset(now)-cznDayStart(key)).toBe(86400000);expect(cznDayKey(cznDayStart(key))).toBe(key);
      expect(key).toBe(delta<0?new Date(Date.parse(date)-86400000).toISOString().slice(0,10):date);
    }
  }
  expect(cznDays(at+86400000,policy.cutoverAt)).toEqual(['2026-10-22','2026-10-23']);
});
test('disabled release performs zero network/storage changes and renders no feature',async()=>{
  const store=new Store();let calls=0;const bad=async()=>{calls++;throw new Error('network should be unused');};
  await syncCzn(store,profile,()=>true,{negotiate:bad,pull:bad,push:bad});
  expect(CZN_CUTOVER_ENABLED).toBe(false);expect(calls).toBe(0);expect(store.v.size).toBe(0);
  expect(renderToStaticMarkup(<CznDailyFeature profileId={profile} now={at}/>)).toBe('');
});
test('atomic journal preserves malformed/incomplete legacy raw and original false outbox; old-tab edits retained',()=>{
  const store=new Store(),keys=profileKeys(profile);
  store.setItem(keys.daily,'{"dailies:czn":{"incomplete":true}}');store.setItem(keys.outbox,'[original false UUID bytes]');
  let state=bindCznPolicy(store,readCzn(store,profile),policy);
  state=queueCzn(store,state,'2026-10-22',false,at);
  expect(store.getItem(keys.outbox)).toBe('[original false UUID bytes]');
  expect(state.pending[0]!.completed).toBe(false);
  expect(()=>queueCzn(store,state,'2026-10-21',true,at)).toThrow();
  store.setItem(keys.daily,'old-tab-update');state=preserveCznLegacy(store,state);
  expect(state.recovery.map(r=>r.daily)).toContain('old-tab-update');expect(state.recovery).toHaveLength(2);
  expect(readCzn(store,profile)).toEqual(state);
  expect(readCzn(store,'local:other').policy).toBeNull();
  const before=JSON.stringify(state);const failing={getItem:store.getItem.bind(store),setItem(){throw new Error('quota');}};
  expect(()=>queueCzn(failing,state,'2026-10-22',true,at)).toThrow('quota');expect(JSON.stringify(state)).toBe(before);
});
test('distinct import format, idempotent import, old v1 held and foreign guest epoch never authorizes account',()=>{
  const {store,state}=ready();const source=queueCzn(store,state,'2026-10-22',false,at);const exported=buildCznExport(source);
  expect(parseImportData(exported)).toBeNull();let imported=importCzn(store,state,exported);
  expect(importCzn(store,imported,exported)).toEqual(imported);
  const v1={format:'gacha-tracker-export',version:1,daily:{'dailies:czn':{days:['2026-10-22']}}};
  imported=importLegacyCzn(store,imported,v1);expect(imported.rows[0]!.completed).toBe(false);
  expect(importLegacyCzn(store,imported,v1)).toEqual(imported);
  const guest=startGuestCzn(store,readCzn(store,'local:guest'),at);const foreign=importCzn(store,imported,buildCznExport(guest));
  expect(foreign.policy).toEqual(policy);expect(foreign.rows).toEqual(imported.rows);
  expect(()=>startGuestCzn(store,state)).toThrow('server confirmation');
});
test('remote false beats imported older true; no stale resurrection; conflicting ID refused',()=>{
  const {store,state}=ready();const a=queueCzn(store,state,'2026-10-22',true,at);const b=queueCzn(store,a,'2026-10-22',false,at+1);
  expect(mergeCzn(b.rows,a.rows)[0]!.completed).toBe(false);
  expect(()=>mergeCzn(a.rows,[{...a.rows[0]!,completed:false}])).toThrow();
});
test('offline/failed push retains exact pending ID/version; retry pulls and acknowledges; in-flight new edit survives',async()=>{
  const {store,state}=ready();let local=queueCzn(store,state,'2026-10-22',true,at),cloud=local.rows.slice(0,0);
  const original=JSON.stringify(local.pending);let fail=true;
  const transport:CznTransport={negotiate:async()=>({protocol:2,enabled:true,policy}),pull:async()=>cloud,
    push:async(_p,_e,rows)=>{if(fail)throw new Error('offline');cloud=mergeCzn(cloud,rows);
      local=queueCzn(store,readCzn(store,profile),'2026-10-22',false,at+5);}};
  await expect(syncCzn(store,profile,()=>true,transport,true)).rejects.toThrow('offline');
  expect(JSON.stringify(readCzn(store,profile).pending)).toBe(original);
  fail=false;const result=await syncCzn(store,profile,()=>true,transport,true);
  expect(result.state.pending).toHaveLength(1);expect(result.state.pending[0]!.completed).toBe(false);
  expect(result.state.rows[0]!.completed).toBe(false);
  const snapshot=JSON.stringify(readCzn(store,profile));
  await expect(syncCzn(store,profile,()=>false,transport,true)).rejects.toThrow('session changed');
  expect(JSON.stringify(readCzn(store,profile))).toBe(snapshot);
});
test('real legacy sync engine holds CZN false despite newer cloud same-label true, syncs another game',async()=>{
  const store=new Store(),keys=profileKeys(profile);
  writeAccountCache(store,profile,owner,{progress:{},daily:{},ignored:{},prefs:defaults(),customGames:{},customEvents:{}});
  initializeAccountProfile(store,profile,owner);
  const held=SyncMutation.parse({kind:'daily',key:{subjectId:CZN_SUBJECT,dayKey:'2026-10-22'},completed:false,
    changedAt:'2026-10-23T10:00:00Z',mutationId:'11111111-1111-4111-8111-111111111111'});
  if(held.kind!=='daily')throw new Error('daily fixture');
  const other=SyncMutation.parse({...held,key:{subjectId:'dailies:zzz',dayKey:'2026-10-22'},mutationId:'22222222-2222-4222-8222-222222222222'});
  store.setItem(keys.outbox,JSON.stringify([held,other]));
  let cloud=applyMutation(emptySyncState(),{...held,completed:true,changedAt:'2026-10-23T12:00:00Z',mutationId:'33333333-3333-4333-8333-333333333333'}).state;
  const result=await syncProfile(store,profile,owner,()=>true,{authenticate:async()=>owner,negotiateCzn:async()=>true,pull:async()=>cloud,
    push:async(_p,rows)=>{expect(rows).toEqual([other]);cloud=applyMutation(cloud,other).state;}});
  expect(JSON.parse(store.getItem(keys.outbox)!)).toEqual([held]);expect(result.heldCzn).toBe(1);expect(result.pending).toBe(1);
  expect(readCzn(store,profile).recovery[0]!.outbox).toBe(JSON.stringify([held,other]));
});
test('new panel keeps legacy separate/read-only and shared event/other-game clocks stay unchanged',()=>{
  const {state}=ready();const html=renderToStaticMarkup(<CznDailyPanel state={state} now={at} readOnly onToggle={()=>{}} onExport={()=>{}} onUpdate={()=>{}}/>);
  expect(html).toContain('18:00 UTC');expect(html).toContain('disabled');expect(html).toContain('Legacy history');expect(html).toContain('Other games can sync');
  for(const region of ['asia','europe','america'] as const){expect(dayKey(at,region,'czn')).not.toBe('');
    expect(nextResetMs(at,region,'genshin')).toBe(dayStartMs(dayKey(at,region,'genshin'),region,'genshin')+86400000);
    const original=dailyGroups(['czn','zzz'],[],at,region,id=>metaFor(id,{}),()=>at);
    const gated=dailyGroups(['czn','zzz'],[],at,region,id=>metaFor(id,{}),()=>at,true,true);
    expect(original[0]!.items[0]!.key).toBe('dailies:czn');expect(gated).toHaveLength(1);expect(gated[0]!.game).toBe('zzz');
  }
});
test('routine sync timestamps do not grow recovery snapshots, baseline tombstone change does',()=>{
  const {store,state}=ready(),keys=profileKeys(profile);
  store.setItem(keys.syncMeta,JSON.stringify({baseline:{daily:{falseRow:false}},lastAttemptAt:'first'}));
  let next=preserveCznLegacy(store,state),count=next.recovery.length;
  store.setItem(keys.syncMeta,JSON.stringify({baseline:{daily:{falseRow:false}},lastAttemptAt:'second'}));
  next=preserveCznLegacy(store,next);expect(next.recovery).toHaveLength(count);
  store.setItem(keys.syncMeta,JSON.stringify({baseline:{daily:{falseRow:true}},lastAttemptAt:'third'}));
  expect(preserveCznLegacy(store,next).recovery).toHaveLength(count+1);
});

test('failed capability negotiation holds only CZN while real legacy engine syncs another game',async()=>{
  const store=new Store(),keys=profileKeys(profile);
  writeAccountCache(store,profile,owner,{progress:{},daily:{},ignored:{},prefs:defaults(),customGames:{},customEvents:{}});
  initializeAccountProfile(store,profile,owner);
  const held=SyncMutation.parse({kind:'daily',key:{subjectId:CZN_SUBJECT,dayKey:'2026-10-22'},completed:false,
    changedAt:'2026-10-23T10:00:00Z',mutationId:'11111111-1111-4111-8111-111111111111'});
  const other=SyncMutation.parse({kind:'ignored',key:'other:event',ignored:true,changedAt:'2026-10-23T10:00:00Z',mutationId:'22222222-2222-4222-8222-222222222222'});
  store.setItem(keys.outbox,JSON.stringify([held,other]));let cloud=emptySyncState();
  const result=await syncProfile(store,profile,owner,()=>true,{authenticate:async()=>owner,
    negotiateCzn:async()=>{throw new Error('capability offline');},pull:async()=>cloud,
    push:async(_p,rows)=>{expect(rows).toEqual([other]);cloud=applyMutation(cloud,other).state;}});
  expect(result.heldCzn).toBe(1);expect(JSON.parse(store.getItem(keys.outbox)!)).toEqual([held]);
});
