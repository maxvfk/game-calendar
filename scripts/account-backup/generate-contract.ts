import { PGlite } from '@electric-sql/pglite';
import { readdir, writeFile } from 'node:fs/promises';
import { schemaContract, type Query } from './database.ts';
import { canonical, sha256 } from './model.ts';
export async function migrationHashes() {
  const dir = new URL('../../supabase/migrations/',import.meta.url);
  const hashes: Record<string,string> = {};
  for (const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort()) hashes[f]=sha256(await Bun.file(new URL(f,dir)).text());
  return hashes;
}
export async function generatedContract() {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    const hashes = await migrationHashes();
    for (const f of Object.keys(hashes)) await db.exec(await Bun.file(new URL(`../../supabase/migrations/${f}`,import.meta.url)).text());
    const query: Query = async (s,p=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
    const contract = await schemaContract(query);
    return {schemaVersion:1,schemaSha256:sha256(canonical(contract)),migrationSha256:hashes,contract};
  } finally { await db.close(); }
}
if (import.meta.main) {
  await writeFile(new URL('../../supabase/backup-contract.v1.json',import.meta.url),canonical(await generatedContract())+'\n');
  console.log('Generated backup contract from current migrations (review before committing).');
}
