import type {CznLocal} from '../account/cznProtocol.ts';
/** Secondary actions: visibly buttons, unlike the preflight-reset default of plain text. */
export const cznActionClass='rounded-md border border-hairline px-2.5 py-1 text-xs text-muted transition-colors duration-150 hover:text-ink disabled:opacity-50';
/**
 * CZN 18:00 UTC policy details, folded under the dailies strip. The day itself is ticked on
 * the strip's CZN chip like every other game's; this only carries what the other games do not
 * have: the preserved legacy history, recovery export and the honest read-only/not-active state.
 */
export function CznDailyPanel({state,readOnly,canStart=false,message='',onExport,onUpdate}:{
  state:CznLocal;readOnly:boolean;canStart?:boolean;message?:string;onExport:()=>void;onUpdate:()=>void;
}){
  let legacyDays:string[]=[];
  try { const raw=state.recovery.at(-1)?.daily;
    const log=raw?JSON.parse(raw)?.['dailies:czn']:null;
    if(Array.isArray(log?.days))legacyDays=log.days.filter((day:unknown):day is string=>typeof day==='string');
  } catch { /* Original bytes stay in the recovery export. */ }
  // No confirmed epoch is not an outdated app: never tell an updated client to update.
  const status=state.policy===null
    ?(canStart?'The 18:00 UTC CZN daily is available: tap "Enable CZN 18:00 UTC" above to start a new streak. Earlier CZN history stays preserved separately.'
      :'The 18:00 UTC CZN daily is not active yet. Earlier CZN history stays preserved; other games sync normally.')
    :readOnly?'CZN is read-only. Update the app or export recovery. Other games can sync.':'';
  return <div className="relative mt-2 text-[0.6875rem] leading-relaxed text-faint">
    {message&&<p role="status" className="text-muted">{message}</p>}
    {status&&<p role="status" className="text-muted">{status}</p>}
    <details aria-label="CZN daily policy">
      <summary className="cursor-pointer select-none transition-colors hover:text-muted">CZN resets at 18:00 UTC · details</summary>
      <div className="mt-1.5 flex flex-col gap-1.5">
        <p>The CZN chip uses the UTC date the game day opened on. Legacy history is preserved separately; unresolved legacy changes are never new-policy completions.</p>
        <p>Preserved legacy history · {legacyDays.length} labelled days{legacyDays.length?`: ${legacyDays.join(', ')}`:''}. Region and completion instants are unknown; it does not extend the new streak.</p>
        <p>{state.recovery.length} recovery snapshots · {state.imports.length} preserved import sources · {state.pending.length} new-policy changes pending sync</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={cznActionClass} onClick={onExport}>Export CZN recovery</button>
          <button type="button" className={cznActionClass} onClick={onUpdate}>Check for app update</button>
        </div>
      </div>
    </details>
  </div>;
}
