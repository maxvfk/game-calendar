import {CZN_POLICY,CZN_SUBJECT,cznDayKey,cznDays,cznNextReset} from '../../shared/cznDaily.ts';
import {CATCH_UP_DAYS} from '../../shared/daily.ts';
import type {CznLocal} from '../account/cznProtocol.ts';

/** Day-log key of CZN's 18:00 UTC policy chip. Distinct from the legacy `dailies:czn` log on purpose. */
export const CZN_POLICY_ITEM_KEY=`${CZN_POLICY}:${CZN_SUBJECT}`;

/**
 * What the strip shows for CZN:
 * - active: a confirmed epoch, ticks like any other chore;
 * - readOnly: a confirmed epoch the server will not take writes for (shown, not tickable);
 * - invite: no epoch yet and the owner can start one (tapping it is the owner confirmation);
 * - inactive: no epoch and nothing to start yet.
 */
export type PolicyMode='active'|'readOnly'|'invite'|'inactive';

/** CZN's standing daily under its own clock: 18:00 UTC, UTC opening-date keys, catch-up only since cutover. */
export interface PolicyDaily {key:string;today:string;resetsIn:number;catchUp:readonly string[];mode:PolicyMode;note:string}

export function cznPolicyDaily(view:{state:CznLocal|null;readOnly:boolean;serverEnabled:boolean;guest:boolean},now:number):PolicyDaily|undefined{
  if(!view.state)return undefined;
  const policy=view.state.policy;
  const mode:PolicyMode=policy?(view.readOnly?'readOnly':'active'):(view.serverEnabled&&!view.guest?'invite':'inactive');
  const note={
    active:'Chaos Zero Nightmare dailies — resets 18:00 UTC',
    readOnly:'CZN is read-only on this device. Update the app or export recovery; other games sync normally.',
    invite:'Start the 18:00 UTC CZN daily for this profile. Earlier CZN history stays preserved separately.',
    inactive:'The 18:00 UTC CZN daily is not active yet. Earlier CZN history stays preserved.',
  }[mode];
  return {key:CZN_POLICY_ITEM_KEY,today:cznDayKey(now),resetsIn:cznNextReset(now)-now,
    catchUp:policy?cznDays(now,policy.cutoverAt,CATCH_UP_DAYS):[],mode,note};
}

/** Completed new-policy days, the policy chip's equivalent of a day log. */
export function cznCompletedDays(state:CznLocal|null):string[]{
  return state?state.rows.filter(row=>row.completed).map(row=>row.dayKey):[];
}
