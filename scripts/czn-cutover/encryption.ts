import {z} from 'zod';
import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {basename,join} from 'node:path';
import {ageEncrypt,ageDecrypt,verifyPair} from '../account-backup/storage.ts';
import {canonical,sha256,validateSnapshot} from '../account-backup/model.ts';
import legacyContract from '../../supabase/backup-contract.v1.json';
import {validateCznSnapshot,type CznSnapshot} from './backup.ts';
const manifestSchema=z.object({format:z.literal('game-calendar-encrypted-czn'),formatVersion:z.literal(2),
  createdAt:z.string().datetime(),projectRef:z.string().regex(/^[a-z]{20}$/),sourceRevision:z.string().regex(/^[a-f0-9]{40}$/),
  schemaSha256:z.string().regex(/^[a-f0-9]{64}$/),recipientSha256:z.string().regex(/^[a-f0-9]{64}$/),
  ciphertextSha256:z.string().regex(/^[a-f0-9]{64}$/),ciphertextBytes:z.number().int().positive(),
  payload:z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}\.czn-v2\.snapshot\.age$/)}).strict();
/** Candidate-only separate output namespace; no plaintext file or old v1 retention rewrite. */
export async function encryptCzn(root:string,s:CznSnapshot,recipient:string){
  validateCznSnapshot(s,s.base.projectRef,s.schemaSha256);
  const bytes=await ageEncrypt(canonical(s),recipient);
  await mkdir(root,{recursive:true});if(!(await lstat(root)).isDirectory())throw new Error('Output must be a directory, not symlink');
  const name=s.base.createdAt.slice(0,10)+'.czn-v2.snapshot.age',path=join(root,name);
  const manifest=manifestSchema.parse({format:'game-calendar-encrypted-czn',formatVersion:2,createdAt:s.base.createdAt,
    projectRef:s.base.projectRef,sourceRevision:s.base.sourceRevision,schemaSha256:s.schemaSha256,
    recipientSha256:sha256(recipient),ciphertextSha256:sha256(bytes),ciphertextBytes:bytes.length,payload:name});
  // Existing pairs are immutable. A partial write fails verification; never accept it as a backup.
  await writeFile(path,bytes,{flag:'wx',mode:0o600});
  await writeFile(path+'.manifest.json',canonical(manifest)+'\n',{flag:'wx',mode:0o600});
  return path;
}
export async function decryptCzn(path:string,identity:string,project:string,hash:string){
  if(!basename(path).includes('.czn-v2.')){
    const m=await verifyPair(path);
    const legacy=validateSnapshot(JSON.parse(await ageDecrypt(path,identity)),project,legacyContract.schemaSha256);
    if(m.projectRef!==project||m.schemaSha256!==legacyContract.schemaSha256||m.createdAt!==legacy.createdAt||m.sourceRevision!==legacy.sourceRevision)throw new Error('Legacy manifest mismatch');
    return legacy;
  }
  const manifest=manifestSchema.parse(JSON.parse(await readFile(path+'.manifest.json','utf8')));
  if(manifest.payload!==basename(path)||manifest.projectRef!==project||manifest.schemaSha256!==hash)throw new Error('CZN manifest mismatch');
  if(!(await lstat(path)).isFile()||!(await lstat(path+'.manifest.json')).isFile())throw new Error('Expected regular snapshot pair');
  const bytes=await readFile(path);
  if(bytes.length!==manifest.ciphertextBytes||sha256(bytes)!==manifest.ciphertextSha256)throw new Error('CZN ciphertext integrity mismatch');
  const snapshot=validateCznSnapshot(JSON.parse(await ageDecrypt(path,identity)),project,hash);
  if(snapshot.base.createdAt!==manifest.createdAt||snapshot.base.sourceRevision!==manifest.sourceRevision)throw new Error('CZN manifest payload mismatch');
  return snapshot;
}
