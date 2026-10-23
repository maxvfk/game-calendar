import {useEffect,useRef,useState} from 'react';
import {CZN_CUTOVER_ENABLED} from '../../shared/cznDaily.ts';
import {readCzn,startGuestCzn,queueCzn,syncCzn,buildCznExport,preserveCznLegacy,type CznLocal} from '../account/cznProtocol.ts';
import {supabase} from '../account/remote.ts';
import {readAccountBinding} from '../account/firstLogin.ts';
import {triggerDownload} from '../state/export.ts';
import {CznDailyPanel,cznActionClass} from './CznDailyPanel.tsx';
/** Mounted only by the compile-time release gate. No URL/localStorage switch can enable it. */
export function CznDailyFeature({profileId,now}:{profileId:string;now:number}){
  const [state,setState]=useState<CznLocal|null>(null),[readOnly,setReadOnly]=useState(true),[serverEnabled,setServerEnabled]=useState(false);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const live=useRef(true),owner=useRef<string|null>(null),inFlight=useRef(false);
  const guest=profileId.startsWith('local:');
  const active=()=>live.current&&(guest||!!owner.current&&readAccountBinding(localStorage,profileId,owner.current));
  async function refresh(cutover=false){
    if(!CZN_CUTOVER_ENABLED||inFlight.current)return;inFlight.current=true;setBusy(true);
    try{
      if(!guest){const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('Sign in again to sync CZN');
        owner.current=data.user.id;if(!active())throw new Error('Account session changed');}
      if(guest){setState(startGuestCzn(localStorage,readCzn(localStorage,profileId)));setReadOnly(false);}
      else{const result=await syncCzn(localStorage,profileId,active,undefined,true,cutover);
        if(!active())return;setState(result.state);setReadOnly(result.readOnly);setServerEnabled(result.serverEnabled);}
      setMessage('');
    }catch(error){if(live.current){const cached=readCzn(localStorage,profileId);setState(cached);setReadOnly(!cached.policy);setMessage(error instanceof Error?error.message:String(error));}}
    finally{inFlight.current=false;if(live.current)setBusy(false);}
  }
  useEffect(()=>{
    live.current=true;void refresh();
    const online=()=>void refresh();window.addEventListener('online',online);
    const remote=(e:Event)=>{if((e as CustomEvent<string>).detail===profileId)void refresh();};
    window.addEventListener('account-sync-remote-change',remote);
    const local=(e:StorageEvent)=>{if(e.key?.includes(profileId))void refresh();};
    const foreground=()=>{if(document.visibilityState==='visible')void refresh();};
    const timer=setInterval(foreground,5*60_000);document.addEventListener('visibilitychange',foreground);
    window.addEventListener('storage',local);window.addEventListener('czn-policy-import',online);
    return()=>{live.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',foreground);window.removeEventListener('online',online);window.removeEventListener('storage',local);
      window.removeEventListener('account-sync-remote-change',remote);window.removeEventListener('czn-policy-import',online);};
  },[profileId]);
  if(!CZN_CUTOVER_ENABLED)return null;
  return <div>{message&&<p role="status">{message}</p>}{state&&<CznDailyPanel state={state} now={now} readOnly={readOnly} canStart={serverEnabled}
    onToggle={(day,done)=>{if(readOnly||!active())return;try{const next=queueCzn(localStorage,readCzn(localStorage,profileId),day,done);
      setState(next);if(!guest)void refresh();}catch(error){setMessage(String(error));}}}
    onExport={()=>{try{const snapshot=preserveCznLegacy(localStorage,readCzn(localStorage,profileId));
      triggerDownload(buildCznExport(snapshot),'czn-recovery.json');}catch(error){setMessage(String(error));}}}
    onUpdate={()=>{void navigator.serviceWorker?.getRegistration().then(r=>r?.update());}}/>}
    {!guest&&state?.policy===null&&serverEnabled&&<button disabled={busy} type="button" className={`${cznActionClass} mt-2 font-semibold`}
      onClick={()=>void refresh(true)}>Enable CZN 18:00 UTC daily policy</button>}
  </div>;
}
