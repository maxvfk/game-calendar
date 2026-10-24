import {useEffect,useRef,useState} from 'react';
import {CZN_CUTOVER_ENABLED} from '../../shared/cznDaily.ts';
import {readCzn,startGuestCzn,queueCzn,syncCzn,buildCznExport,preserveCznLegacy,type CznLocal} from './cznProtocol.ts';
import {supabase} from './remote.ts';
import {readAccountBinding} from './firstLogin.ts';
import {triggerDownload} from '../state/export.ts';

export interface CznDaily {
  state:CznLocal|null;readOnly:boolean;serverEnabled:boolean;busy:boolean;message:string;guest:boolean;
  toggle:(day:string,done:boolean)=>void;enable:()=>void;exportRecovery:()=>void;checkUpdate:()=>void;
}
function cached(profileId:string):CznLocal|null{try{return readCzn(localStorage,profileId);}catch{return null;}}
/**
 * One CZN policy controller per active profile. The dailies strip chip and the details
 * disclosure read the same state, so there is exactly one sync loop and one writer.
 * profileId undefined (feature off, chores hidden, CZN not shown) is inert: no I/O at all.
 */
export function useCznDaily(profileId:string|undefined):CznDaily{
  const [state,setState]=useState<CznLocal|null>(()=>profileId?cached(profileId):null);
  // Offline-first: a cached confirmed epoch is writable at once; sync may still mark it read-only.
  const [readOnly,setReadOnly]=useState(()=>!(profileId&&cached(profileId)?.policy));
  const [serverEnabled,setServerEnabled]=useState(false);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const live=useRef(true),owner=useRef<string|null>(null),inFlight=useRef(false);
  const guest=!!profileId?.startsWith('local:');
  const active=()=>!!profileId&&live.current&&(guest||!!owner.current&&readAccountBinding(localStorage,profileId,owner.current));
  async function refresh(cutover=false){
    if(!CZN_CUTOVER_ENABLED||!profileId||inFlight.current)return;inFlight.current=true;setBusy(true);
    try{
      if(!guest){const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('Sign in again to sync CZN');
        owner.current=data.user.id;if(!active())throw new Error('Account session changed');}
      if(guest){setState(startGuestCzn(localStorage,readCzn(localStorage,profileId)));setReadOnly(false);}
      else{const result=await syncCzn(localStorage,profileId,active,undefined,true,cutover);
        if(!active())return;setState(result.state);setReadOnly(result.readOnly);setServerEnabled(result.serverEnabled);}
      setMessage('');
    }catch(error){if(live.current){const local=cached(profileId);setState(local);setReadOnly(!local?.policy);setMessage(error instanceof Error?error.message:String(error));}}
    finally{inFlight.current=false;if(live.current)setBusy(false);}
  }
  useEffect(()=>{
    if(!CZN_CUTOVER_ENABLED||!profileId){setState(null);return;}
    live.current=true;const local=cached(profileId);setState(local);setReadOnly(!local?.policy);setServerEnabled(false);setMessage('');
    void refresh();
    const online=()=>void refresh();window.addEventListener('online',online);
    const remote=(e:Event)=>{if((e as CustomEvent<string>).detail===profileId)void refresh();};
    window.addEventListener('account-sync-remote-change',remote);
    const storage=(e:StorageEvent)=>{if(e.key?.includes(profileId))void refresh();};
    const foreground=()=>{if(document.visibilityState==='visible')void refresh();};
    const timer=setInterval(foreground,5*60_000);document.addEventListener('visibilitychange',foreground);
    window.addEventListener('storage',storage);window.addEventListener('czn-policy-import',online);
    return()=>{live.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',foreground);window.removeEventListener('online',online);window.removeEventListener('storage',storage);
      window.removeEventListener('account-sync-remote-change',remote);window.removeEventListener('czn-policy-import',online);};
    // The profile owns the controller lifetime; refresh reads refs and setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[profileId]);
  return {state,readOnly,serverEnabled,busy,message,guest,
    toggle:(day,done)=>{if(!profileId||readOnly||!active())return;
      try{const next=queueCzn(localStorage,readCzn(localStorage,profileId),day,done);setState(next);if(!guest)void refresh();}
      catch(error){setMessage(error instanceof Error?error.message:String(error));}},
    enable:()=>{if(!guest&&!busy)void refresh(true);},
    exportRecovery:()=>{if(!profileId)return;try{triggerDownload(buildCznExport(preserveCznLegacy(localStorage,readCzn(localStorage,profileId))),'czn-recovery.json');}
      catch(error){setMessage(error instanceof Error?error.message:String(error));}},
    checkUpdate:()=>{void navigator.serviceWorker?.getRegistration().then(r=>r?.update());},
  };
}
