/** Separate v2 retention. Never visits or prunes legacy daily/monthly or operator archives. */
import {mkdir,lstat,readdir,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {canonical} from '../account-backup/model.ts';
import {ageEncrypt} from '../account-backup/storage.ts';
import {validateCznSnapshot,type CznSnapshot} from './backup.ts';
import {cznManifest,verifyCznPair} from './encryption.ts';
async function directory(path:string){await mkdir(path,{recursive:true});if(!(await lstat(path)).isDirectory())throw new Error('Managed directory must not be a symlink');}
async function entries(dir:string,kind:'daily'|'monthly',project:string,hash:string){
  await directory(dir);
  const names=await readdir(dir),pattern=kind==='daily'?/^\d{4}-\d\d-\d\d\.czn-v2\.snapshot\.age(?:\.manifest\.json)?$/:/^\d{4}-\d\d\.czn-v2\.snapshot\.age(?:\.manifest\.json)?$/;
  for(const f of names)if(!pattern.test(f)||!(await lstat(join(dir,f))).isFile())throw new Error('Unexpected managed file');
  const payloads=names.filter(f=>f.endsWith('.age')).sort();
  if(payloads.length*2!==names.length)throw new Error('Unpaired snapshot files');
  for(const f of payloads){const m=await verifyCznPair(join(dir,f));if(m.projectRef!==project||m.schemaSha256!==hash)throw new Error('Foreign snapshot contract/project');}
  return payloads;
}
export async function retainCzn(root:string,project:string,hash:string){
  await directory(root);await directory(join(root,'v2'));
  // Validate both complete trees before the first deletion, including corruption/symlinks.
  const daily=await entries(join(root,'v2/daily'),'daily',project,hash),monthly=await entries(join(root,'v2/monthly'),'monthly',project,hash);
  for(const [kind,files,max] of [['daily',daily,30],['monthly',monthly,12]] as const)
    for(const f of files.slice(0,Math.max(0,files.length-max))){await rm(join(root,'v2',kind,f));await rm(join(root,'v2',kind,f+'.manifest.json'));}
}
export async function storeCzn(root:string,s:CznSnapshot,recipient:string){
  validateCznSnapshot(s,s.base.projectRef,s.schemaSha256);
  await directory(root);await directory(join(root,'v2'));
  for(const kind of ['daily','monthly'] as const)await entries(join(root,'v2',kind),kind,s.base.projectRef,s.schemaSha256);
  const bytes=await ageEncrypt(canonical(s),recipient),day=s.base.createdAt.slice(0,10);
  for(const [kind,date] of [['daily',day],['monthly',day.slice(0,7)]] as const){
    const name=date+'.czn-v2.snapshot.age',path=join(root,'v2',kind,name);
    // Daily is refreshed on rerun; monthly is the first verified snapshot of that month.
    if(kind==='monthly'&&await Bun.file(path).exists())continue;
    await writeFile(path+'.tmp',bytes,{flag:'wx',mode:0o600});
    await writeFile(path+'.manifest.json.tmp',canonical(cznManifest(s,bytes,recipient,name))+'\n',{flag:'wx',mode:0o600});
    await rename(path+'.tmp',path);await rename(path+'.manifest.json.tmp',path+'.manifest.json');
    await verifyCznPair(path);
  }
  await retainCzn(root,s.base.projectRef,s.schemaSha256);
  return join(root,'v2/daily',day+'.czn-v2.snapshot.age');
}
