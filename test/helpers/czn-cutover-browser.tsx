/** Synthetic browser/DOM harness only. Never talks to Supabase or mounts in the app. */
import {useState,useRef} from 'react';
import {Dailies} from '../../src/client/components/Dailies.tsx';
import {CznDailyPanel} from '../../src/client/components/CznDailyPanel.tsx';
import {bindCznPolicy,readCzn,queueCzn,syncCzn,buildCznExport,type CznStore} from '../../src/client/account/cznProtocol.ts';
import {CZN_POLICY,mergeCzn,type CznMutation} from '../../src/shared/cznDaily.ts';
import {CZN_POLICY_ITEM_KEY,cznCompletedDays,cznPolicyDaily} from '../../src/client/state/cznStrip.ts';
const profile='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now=Date.parse('2026-10-23T19:00:00Z');
const policy={policyId:CZN_POLICY,epoch:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',cutoverAt:'2026-10-23T18:00:00Z'};
/** Drives the real dailies strip: CZN's policy chip sits next to another game's chore, as in the app. */
export function CznCutoverHarness({store}:{store:CznStore}){
  const sequence=useRef(0);
  const [state,setState]=useState(()=>bindCznPolicy(store,readCzn(store,profile),policy));
  const [offline,setOffline]=useState(true),[disabled,setDisabled]=useState(false),[status,setStatus]=useState('Synthetic offline'),[exported,setExported]=useState('');
  const [cloud]=useState<{rows:CznMutation[]}>({rows:[]});
  const [other,setOther]=useState<string[]>([]);
  async function sync(){
    try{const r=await syncCzn(store,profile,()=>true,{negotiate:async()=>{if(offline)throw new Error('offline');return{protocol:2,enabled:!disabled,policy};},
      pull:async()=>cloud.rows,push:async(_p,_e,rows)=>{cloud.rows=mergeCzn(cloud.rows,rows);}},true);
      setState(r.state);setStatus('Sync finished');}catch{setStatus('Offline: pending retained');}
  }
  const done=cznCompletedDays(state);
  return <><p>Disposable CZN harness — no network</p>
    <button onClick={()=>setOffline(!offline)}>Network: {offline?'offline':'online'}</button>
    <button onClick={()=>setDisabled(!disabled)}>Server: {disabled?'disabled':'enabled'}</button>
    <button onClick={()=>setState(readCzn(store,profile))}>Reload local journal</button>
    <button onClick={()=>void sync()}>Sync synthetic server</button><p data-testid="sync-status">{status}</p>
    <Dailies games={['czn','zzz']} events={[]} region="europe" now={now} showChores omitCznChore
      cznPolicy={cznPolicyDaily({state,readOnly:disabled,serverEnabled:!disabled,guest:false},now)}
      daysFor={id=>id===CZN_POLICY_ITEM_KEY?done:other}
      onToggleDay={(id,day)=>{if(id===CZN_POLICY_ITEM_KEY)setState(queueCzn(store,state,day,!done.includes(day),now+sequence.current++));
        else setOther(o=>o.includes(day)?o.filter(d=>d!==day):[...o,day]);}}
      footer={<CznDailyPanel state={state} readOnly={disabled}
        onExport={()=>setExported(JSON.stringify(buildCznExport(state)))} onUpdate={()=>{setState(readCzn(store,profile));setStatus('Update simulation; journal retained');}}/>}/>
    <textarea aria-label="Recovery export" readOnly value={exported}/></>;
}
