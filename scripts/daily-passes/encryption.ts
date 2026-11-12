/** v3 encrypted pairs in their own namespace; v1/v2 pairs stay readable through the v2 reader. */
import { z } from 'zod';
import { readFile, writeFile, mkdir, lstat, readdir, rename, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ageEncrypt, ageDecrypt } from '../account-backup/storage.ts';
import { canonical, sha256 } from '../account-backup/model.ts';
import { decryptCzn } from '../czn-cutover/encryption.ts';
import { validatePassesSnapshot, type PassesSnapshot } from './backup.ts';
import v2Contract from '../../supabase/backup-contract.czn-v2.json';

const TAG = '.passes-v3.';
export const passesManifestSchema = z.object({ format: z.literal('game-calendar-encrypted-passes'), formatVersion: z.literal(3),
  createdAt: z.string().datetime(), projectRef: z.string().regex(/^[a-z]{20}$/), sourceRevision: z.string().regex(/^[a-f0-9]{40}$/),
  schemaSha256: z.string().regex(/^[a-f0-9]{64}$/), recipientSha256: z.string().regex(/^[a-f0-9]{64}$/),
  ciphertextSha256: z.string().regex(/^[a-f0-9]{64}$/), ciphertextBytes: z.number().int().positive(),
  payload: z.string().regex(/^[0-9]{4}-[0-9]{2}(?:-[0-9]{2})?\.passes-v3\.snapshot\.age$/) }).strict();

export function passesManifest(s: PassesSnapshot, bytes: Uint8Array, recipient: string, name: string) {
  return passesManifestSchema.parse({ format: 'game-calendar-encrypted-passes', formatVersion: 3, createdAt: s.base.createdAt,
    projectRef: s.base.projectRef, sourceRevision: s.base.sourceRevision, schemaSha256: s.schemaSha256,
    recipientSha256: sha256(recipient), ciphertextSha256: sha256(bytes), ciphertextBytes: bytes.length, payload: name });
}
export const isPassesPair = (path: string) => basename(path).includes(TAG);

export async function verifyPassesPair(path: string) {
  if (!(await lstat(path)).isFile() || !(await lstat(path + '.manifest.json')).isFile()) throw new Error('Expected regular snapshot pair');
  const manifest = passesManifestSchema.parse(JSON.parse(await readFile(path + '.manifest.json', 'utf8')));
  const date = manifest.payload.split(TAG)[0]!;
  if (manifest.payload !== basename(path) || manifest.createdAt.slice(0, date.length) !== date) throw new Error('Daily pass manifest date/name mismatch');
  const bytes = await readFile(path);
  if (bytes.length !== manifest.ciphertextBytes || sha256(bytes) !== manifest.ciphertextSha256 ||
    !new TextDecoder().decode(bytes.slice(0, 22)).startsWith('age-encryption.org/v1\n')) throw new Error('Daily pass ciphertext integrity mismatch');
  return manifest;
}

/** Reads v3 pairs; anything else goes to the unchanged v1/v2 reader with the v2 contract. */
export async function decryptPasses(path: string, identity: string, project: string, schemaHash: string) {
  if (!isPassesPair(path)) return decryptCzn(path, identity, project, v2Contract.schemaSha256);
  const manifest = await verifyPassesPair(path);
  if (manifest.projectRef !== project || manifest.schemaSha256 !== schemaHash) throw new Error('Daily pass manifest mismatch');
  const snapshot = validatePassesSnapshot(JSON.parse(await ageDecrypt(path, identity)), project, schemaHash);
  if (snapshot.base.createdAt !== manifest.createdAt || snapshot.base.sourceRevision !== manifest.sourceRevision)
    throw new Error('Daily pass manifest payload mismatch');
  return snapshot;
}

/** One immutable pair (local drills/tests). */
export async function encryptPasses(root: string, s: PassesSnapshot, recipient: string) {
  validatePassesSnapshot(s, s.base.projectRef, s.schemaSha256);
  const bytes = await ageEncrypt(canonical(s), recipient);
  await directory(root);
  const name = s.base.createdAt.slice(0, 10) + TAG + 'snapshot.age', path = join(root, name);
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
  await writeFile(path + '.manifest.json', canonical(passesManifest(s, bytes, recipient, name)) + '\n', { flag: 'wx', mode: 0o600 });
  return path;
}

async function directory(path: string) {
  await mkdir(path, { recursive: true });
  if (!(await lstat(path)).isDirectory()) throw new Error('Managed directory must not be a symlink');
}
async function entries(dir: string, kind: 'daily' | 'monthly', project: string, schemaHash: string) {
  await directory(dir);
  const names = await readdir(dir);
  const pattern = kind === 'daily' ? /^\d{4}-\d\d-\d\d\.passes-v3\.snapshot\.age(?:\.manifest\.json)?$/ : /^\d{4}-\d\d\.passes-v3\.snapshot\.age(?:\.manifest\.json)?$/;
  for (const f of names) if (!pattern.test(f) || !(await lstat(join(dir, f))).isFile()) throw new Error('Unexpected managed file');
  const payloads = names.filter(f => f.endsWith('.age')).sort();
  if (payloads.length * 2 !== names.length) throw new Error('Unpaired snapshot files');
  for (const f of payloads) {
    const m = await verifyPassesPair(join(dir, f));
    if (m.projectRef !== project || m.schemaSha256 !== schemaHash) throw new Error('Foreign snapshot contract/project');
  }
  return payloads;
}

/** v3 retention 30 daily / 12 monthly under `v3/`. Never visits v1 or v2 trees or operator archives. */
export async function retainPasses(root: string, project: string, schemaHash: string) {
  await directory(root); await directory(join(root, 'v3'));
  const daily = await entries(join(root, 'v3/daily'), 'daily', project, schemaHash);
  const monthly = await entries(join(root, 'v3/monthly'), 'monthly', project, schemaHash);
  for (const [kind, files, max] of [['daily', daily, 30], ['monthly', monthly, 12]] as const)
    for (const f of files.slice(0, Math.max(0, files.length - max))) {
      await rm(join(root, 'v3', kind, f)); await rm(join(root, 'v3', kind, f + '.manifest.json'));
    }
}

export async function storePasses(root: string, s: PassesSnapshot, recipient: string) {
  validatePassesSnapshot(s, s.base.projectRef, s.schemaSha256);
  await directory(root); await directory(join(root, 'v3'));
  for (const kind of ['daily', 'monthly'] as const) await entries(join(root, 'v3', kind), kind, s.base.projectRef, s.schemaSha256);
  const bytes = await ageEncrypt(canonical(s), recipient), day = s.base.createdAt.slice(0, 10);
  for (const [kind, date] of [['daily', day], ['monthly', day.slice(0, 7)]] as const) {
    const name = date + TAG + 'snapshot.age', path = join(root, 'v3', kind, name);
    // Daily is refreshed on rerun; monthly keeps the first verified snapshot of the month.
    if (kind === 'monthly' && await Bun.file(path).exists()) continue;
    await writeFile(path + '.tmp', bytes, { flag: 'wx', mode: 0o600 });
    await writeFile(path + '.manifest.json.tmp', canonical(passesManifest(s, bytes, recipient, name)) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(path + '.tmp', path); await rename(path + '.manifest.json.tmp', path + '.manifest.json');
    await verifyPassesPair(path);
  }
  await retainPasses(root, s.base.projectRef, s.schemaSha256);
  return join(root, 'v3/daily', day + TAG + 'snapshot.age');
}
