import {cznDayKey,cznDays,cznNextReset,type CznMutation} from '../../shared/cznDaily.ts';
import {streakOf} from '../../shared/daily.ts';
import type {CznLocal} from '../account/cznProtocol.ts';
import {formatRemaining} from '../../shared/time.ts';
/** Isolated 18:00 UTC policy view; never overlays legacy event checklists. */
export function CznDailyPanel({state,now,readOnly,canStart=false,onToggle,onExport,onUpdate}:{
  state:CznLocal;now:number;readOnly:boolean;canStart?:boolean;onToggle:(day:string,done:boolean)=>void;
  onExport:()=>void;onUpdate:()=>void;
}){
  const today=cznDayKey(now),days=state.policy?cznDays(now,state.policy.cutoverAt):[];
  const completed=state.rows.filter((r:CznMutation)=>r.completed).map(r=>r.dayKey);
  let legacyDays:string[]=[];
  try { const raw=state.recovery.at(-1)?.daily;
    const log=raw?JSON.parse(raw)?.['dailies:czn']:null;
    if(Array.isArray(log?.days))legacyDays=log.days.filter((day:unknown):day is string=>typeof day==='string');
  } catch { /* Original bytes stay in the recovery export. */ }
  return <section aria-label="CZN daily policy" className="rounded-xl border border-hairline p-3 text-sm">
    <p>CZN · daily reset 18:00 UTC · {formatRemaining(cznNextReset(now)-now)}</p>
    <p>UTC opening date: {today} · Streak since cutover: {streakOf(completed,today)}</p>
    {/* No confirmed epoch is not an outdated app: never tell an updated client to update. */}
    {state.policy===null?<p role="status">{canStart
      ?'The 18:00 UTC CZN daily is available. Enable it for this profile to start a new streak; earlier CZN history stays preserved separately.'
      :'The 18:00 UTC CZN daily is not active yet. Earlier CZN history stays preserved; other games sync normally.'}</p>
      :readOnly&&<p role="status">CZN is read-only. Update the app or export recovery. Other games can sync.</p>}
    <div className="my-2 flex flex-wrap gap-2">{days.map(day=><button key={day} type="button" disabled={readOnly}
      aria-pressed={completed.includes(day)} onClick={()=>onToggle(day,!completed.includes(day))}>{day}{completed.includes(day)?' ✓':''}</button>)}</div>
    <p>Legacy history is preserved separately. Unresolved legacy changes are never new-policy completions.</p>
    <details><summary>Preserved legacy history · {legacyDays.length} labelled days</summary>
      <p>Original labels; Region and completion instants are unknown. This history does not extend the new streak.</p>
      <ul>{legacyDays.map((day,i)=><li key={`${day}:${i}`}>{day}</li>)}</ul>
      <p>{state.recovery.length} recovery snapshots · {state.imports.length} preserved import sources. Export or leave unresolved; no automatic conversion.</p>
    </details>
    <p>{state.pending.length} new-policy changes pending sync</p>
    <button type="button" onClick={onExport}>Export CZN recovery</button>{' '}
    <button type="button" onClick={onUpdate}>Check for app update</button>
  </section>;
}
