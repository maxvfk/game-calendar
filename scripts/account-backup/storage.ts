import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { canonical, sha256, type Snapshot } from './model.ts';

const ManifestSchema = z.object({ format:z.literal('game-calendar-encrypted'),formatVersion:z.literal(1),
  createdAt:z.string().datetime(),projectRef:z.string().regex(/^[a-z]{20}$/),
  sourceRevision:z.string().regex(/^[a-f0-9]{40}$/),schemaSha256:z.string().regex(/^[a-f0-9]{64}$/),
  recipientSha256:z.string().regex(/^[a-f0-9]{64}$/),ciphertextSha256:z.string().regex(/^[a-f0-9]{64}$/),
  ciphertextBytes:z.number().int().min(1),payload:z.string().regex(/^\d{4}-\d\d(?:-\d\d)?\.snapshot\.age$/),
}).strict();
export type Manifest = z.infer<typeof ManifestSchema>;
export async function ageEncrypt(plaintext: string, recipient: string): Promise<Uint8Array> {
  if (!/^age1[a-z0-9]+$/.test(recipient) || recipient.startsWith('age1pq1')) throw new Error('Expected one native age X25519 public recipient');
  const proc = Bun.spawn(['age','--encrypt','--recipient',recipient],{stdin:new TextEncoder().encode(plaintext),stdout:'pipe',stderr:'pipe'});
  const [bytes,,code] = await Promise.all([new Response(proc.stdout).bytes(),new Response(proc.stderr).text(),proc.exited]);
  if (code!==0 || bytes.length===0 || !new TextDecoder().decode(bytes.slice(0,22)).startsWith('age-encryption.org/v1\n'))
    throw new Error('age encryption failed');
  return bytes;
}
export async function ageDecrypt(path: string, identity: string): Promise<string> {
  // No plaintext file, artifact, output or log: pass decrypted bytes in memory.
  const proc = Bun.spawn(['age','--decrypt','--identity',resolve(identity),resolve(path)],{stdout:'pipe',stderr:'pipe'});
  const [plaintext,,code] = await Promise.all([new Response(proc.stdout).text(),new Response(proc.stderr).text(),proc.exited]);
  if (code!==0 || !plaintext.length) throw new Error('age decryption failed');
  return plaintext;
}
function manifest(s: Snapshot,bytes: Uint8Array,recipient: string,payload: string): Manifest {
  return ManifestSchema.parse({format:'game-calendar-encrypted',formatVersion:1,createdAt:s.createdAt,
    projectRef:s.projectRef,sourceRevision:s.sourceRevision,schemaSha256:s.schemaSha256,
    recipientSha256:sha256(recipient),ciphertextSha256:sha256(bytes),ciphertextBytes:bytes.length,payload});
}
export async function verifyPair(path: string): Promise<Manifest> {
  if (!path.endsWith('.snapshot.age')) throw new Error('Expected encrypted snapshot path');
  const m = ManifestSchema.parse(JSON.parse(await readFile(path.replace(/\.age$/,'.manifest.json'),'utf8')));
  if (m.payload !== path.split(/[\\/]/).at(-1)) throw new Error('Manifest payload mismatch');
  const name=m.payload.replace('.snapshot.age','');
  if (m.createdAt.slice(0,name.length)!==name) throw new Error('Manifest date/filename mismatch');
  const bytes = await readFile(path);
  if (bytes.length!==m.ciphertextBytes || sha256(bytes)!==m.ciphertextSha256 || !bytes.subarray(0,22).toString().startsWith('age-encryption.org/v1\n'))
    throw new Error('Encrypted snapshot integrity mismatch');
  return m;
}
async function writePair(dir: string,name: string,s: Snapshot,bytes: Uint8Array,recipient: string) {
  await mkdir(dir,{recursive:true});
  if (!(await lstat(dir)).isDirectory()) throw new Error('Managed snapshot directory must not be a symlink');
  const path=join(dir,`${name}.snapshot.age`),mp=path.replace(/\.age$/,'.manifest.json');
  const m=manifest(s,bytes,recipient,`${name}.snapshot.age`);
  await writeFile(path+'.tmp',bytes,{mode:0o600});
  await writeFile(mp+'.tmp',canonical(m)+'\n',{mode:0o600});
  await rename(path+'.tmp',path); await rename(mp+'.tmp',mp);
  await verifyPair(path);
}
async function entries(dir: string,kind: 'daily'|'monthly') {
  await mkdir(dir,{recursive:true});
  if (!(await lstat(dir)).isDirectory()) throw new Error('Managed snapshot directory must not be a symlink');
  const names=await readdir(dir),pattern=kind==='daily'?/^\d{4}-\d\d-\d\d\.snapshot\.(age|manifest\.json)$/:/^\d{4}-\d\d\.snapshot\.(age|manifest\.json)$/;
  for (const f of names) {
    if (!pattern.test(f) || !(await lstat(join(dir,f))).isFile()) throw new Error('Unexpected file in managed snapshot directory');
  }
  const payloads=names.filter(f=>f.endsWith('.age')).sort();
  if (names.length!==payloads.length*2) throw new Error('Unpaired snapshot files');
  for (const f of payloads) await verifyPair(join(dir,f));
  return payloads;
}
export async function retain(root: string) {
  // Validate BOTH directories before deleting anything; only managed pairs.
  const daily=await entries(join(root,'daily'),'daily'),monthly=await entries(join(root,'monthly'),'monthly');
  for (const [kind,files,max] of [['daily',daily,30],['monthly',monthly,12]] as const) {
    for (const f of files.slice(0,Math.max(0,files.length-max))) {
      await rm(join(root,kind,f)); await rm(join(root,kind,f.replace(/\.age$/,'.manifest.json')));
    }
  }
}
export async function storeEncrypted(root: string,s: Snapshot,bytes: Uint8Array,recipient: string) {
  const day=s.createdAt.slice(0,10),month=day.slice(0,7);
  // Reject an unexpected tree before replacing today's pair.
  const existing = [
    ...(await entries(join(root,'daily'),'daily')).map(f=>join(root,'daily',f)),
    ...(await entries(join(root,'monthly'),'monthly')).map(f=>join(root,'monthly',f)),
  ];
  for (const path of existing) if ((await verifyPair(path)).projectRef!==s.projectRef)
    throw new Error('Backup directory contains a different project');
  await writePair(join(root,'daily'),day,s,bytes,recipient);
  const monthly=join(root,'monthly',`${month}.snapshot.age`);
  if (!(await Bun.file(monthly).exists())) await writePair(join(root,'monthly'),month,s,bytes,recipient);
  await retain(root);
  return join(root,'daily',`${day}.snapshot.age`);
}
