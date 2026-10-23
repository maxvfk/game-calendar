import { z } from 'zod';
import { DAY, HOUR } from './time.ts';
export const CZN_POLICY = 'czn-daily-utc18-opening-v1' as const;
export const CZN_SUBJECT = 'dailies:czn' as const;
// GO 3 client release: compatible policy-aware client on. Server capability is a separate operator switch.
export const CZN_CUTOVER_ENABLED: boolean = true;
export function cznDayKey(ms: number): string { return new Date(ms-18*HOUR).toISOString().slice(0,10); }
export function cznDayStart(day: string): number { return Date.parse(`${day}T00:00:00Z`)+18*HOUR; }
export function cznNextReset(ms: number): number { return Math.floor((ms-18*HOUR)/DAY)*DAY+42*HOUR; }
export const CznPolicy = z.object({policyId:z.literal(CZN_POLICY),epoch:z.string().uuid(),
  cutoverAt:z.string().datetime({offset:true})}).strict();
export type CznPolicy = z.infer<typeof CznPolicy>;
export const CznMutation = z.object({policyId:z.literal(CZN_POLICY),subjectId:z.literal(CZN_SUBJECT),
  dayKey:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s),
  completed:z.boolean(),changedAt:z.string().datetime({offset:true}),mutationId:z.string().uuid()}).strict();
export type CznMutation = z.infer<typeof CznMutation>;
export function cznDays(now:number,cutoverAt:string,span=14):string[] {
  const floor=cznDayKey(Date.parse(cutoverAt)); const out:string[]=[];
  for(let ms=cznDayStart(cznDayKey(now));out.length<span;ms-=DAY){
    const day=cznDayKey(ms);if(day<floor)break;out.unshift(day);
  } return out;
}
export function mergeCzn(rows: CznMutation[], incoming: CznMutation[]): CznMutation[] {
  const byDay=new Map(rows.map(r=>[r.dayKey,CznMutation.parse(r)]));
  const ids=new Map(rows.map(r=>[r.mutationId,JSON.stringify(CznMutation.parse(r))]));
  for(const input of incoming){const row=CznMutation.parse(input),body=JSON.stringify(row);
    if(ids.has(row.mutationId)&&ids.get(row.mutationId)!==body)throw new Error('CZN mutation ID reused');
    ids.set(row.mutationId,body);const old=byDay.get(row.dayKey);
    if(!old||Date.parse(row.changedAt)>Date.parse(old.changedAt)||
      (Date.parse(row.changedAt)===Date.parse(old.changedAt)&&row.mutationId>old.mutationId))byDay.set(row.dayKey,row);
  }return [...byDay.values()].sort((a,b)=>a.dayKey.localeCompare(b.dayKey));
}
