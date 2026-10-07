import { afterAll, beforeAll, expect, test } from 'bun:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { SQL } from 'bun';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TABLES, canonical, sha256, makeSnapshot, validateSnapshot, logicalMutation, type Rows, type Snapshot } from '../scripts/account-backup/model.ts';
import { assertBackupRole, assertTarget, readRows, restorePlan, schemaContract, selectProfiles, writeRestore, type Query } from '../scripts/account-backup/database.ts';
import { generatedContract, migrationHashes } from '../scripts/account-backup/generate-contract.ts';
import { connectionConfig, safeQuery } from '../scripts/account-backup/cli.ts';
import { ageEncrypt, ageDecrypt, retain, storeEncrypted, verifyPair } from '../scripts/account-backup/storage.ts';
import { decodeCloudRow, materializeCloud } from '../src/client/account/remote.ts';
import { emptySyncState, applyMutation } from '../src/shared/sync.ts';
import { X509Certificate } from 'node:crypto';
import { loadPinnedCA, SUPABASE_CA_FILE, SUPABASE_CA_FINGERPRINT } from '../scripts/account-backup/tls.ts';
import { testCertificate, tlsPostgresServer } from './helpers/account-backup-tls.ts';
import { schemaDiagnosticSql } from '../scripts/account-backup/schema-diagnostics.ts';

const db=new PGlite();
const project='vzzudezdigjwbwfejlsg';
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const query: Query=async (s,p=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
let snapshot: Snapshot;
const contract=await Bun.file(new URL('../supabase/backup-contract.v1.json',import.meta.url)).json();

beforeAll(async()=>{
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;
    insert into auth.users values ('${alice}','private-test@example.invalid'),('${bob}','other@example.invalid');`);
  for (const f of Object.keys(await migrationHashes())) await db.exec(await Bun.file(new URL(`../supabase/migrations/${f}`,import.meta.url)).text());
  await db.exec(`set timezone='UTC'; insert into calendar_backup_control.project_identity(project_ref) values ('${project}');
    insert into public.profiles(id,owner_id,name,is_default) values ('${a}','${alice}','Test A',true),('${b}','${bob}','Test B',true);`);
  const at='2026-10-01T12:00:00.000Z';
  for (const [profile,owner] of [[a,alice],[b,bob]]) {
    const rows=[
      {kind:'progress',key:'opaque:event#2026-10-01',deleted:false,payload:{status:'done',effort:'quick',daily:null,note:'synthetic recovery note'}},
      {kind:'progress',key:'deleted:event',deleted:true,payload:null},
      {kind:'daily',key:{subjectId:'dailies:zzz',dayKey:'2026-10-01'},completed:true},
      {kind:'daily',key:{subjectId:'dailies:zzz',dayKey:'2026-10-02'},completed:false},
      {kind:'ignored',key:'hidden:event',ignored:true},
      {kind:'ignored',key:'unhidden:event',ignored:false},
      {kind:'preference',key:'theme',value:'dark',unset:false},
      {kind:'preference',key:'focusGame',value:null,unset:false},
      {kind:'preference',key:'knownGames',value:null,unset:true},
      {kind:'customGame',key:'mygame:test',deleted:false,payload:{id:'mygame:test',name:'Drill game',hue:'#112233',at}},
      {kind:'customGame',key:'mygame:removed',deleted:true,payload:null},
      {kind:'customEvent',key:'myevent:abcdef',deleted:false,payload:{id:'myevent:abcdef',game:'mygame:test',title:'Drill event',type:'other',summary:null,
        startsAt:at,startPrecision:'exact',endsAt:'2026-10-30T12:00:00.000Z',endPrecision:'exact',repeat:null,at,updatedAt:at}},
      {kind:'customEvent',key:'myevent:deleted',deleted:true,payload:null},
    ].map((r,i)=>({...r,changedAt:at,mutationId:`cccccccc-cccc-4ccc-8ccc-${String(i+(profile===a?1:100)).padStart(12,'0')}`}));
    await query("select set_config('request.jwt.claim.sub',$1,false)",[owner]); await db.exec('set role authenticated');
    await query('select public.apply_profile_mutations($1::uuid,$2::jsonb)',[profile,JSON.stringify(rows)]);
    await db.exec('reset role');
  }
  snapshot=makeSnapshot(await readRows(query),{projectRef:project,createdAt:'2026-10-03T14:00:00.000Z',sourceRevision:'c'.repeat(40),
    schemaSha256:contract.schemaSha256,migrationSha256:contract.migrationSha256});
},20000);
afterAll(async()=>{await db.close();});

test('backup contract is generated from all current migrations',async()=>{
  expect(await generatedContract()).toEqual(contract);
  expect(sha256(canonical(await schemaContract(query)))).toBe(contract.schemaSha256);
},20000);
test('safe schema diagnostic is generated, catalog-only, exact, and usable by the read role',async()=>{
  const sql=schemaDiagnosticSql(contract.contract);
  expect(sql).toBe(await Bun.file(new URL('../supabase/diagnostics/account-backup-schema.sql',import.meta.url)).text());
  const before=await readRows(query);
  await db.exec('set role calendar_backup');
  try {
    const report=(await query(sql))[0]!.schema_diagnostics as Record<string,unknown>;
    expect(report.serverMajor).toBe(18);expect(report.projectRefs).toEqual([project]);
    expect(report.rawContractMatches).toBe(true);
    expect(report.onlyNotNullCatalogRowsDiffer).toBe(false);
    expect(report.notNullCatalogEntries).toEqual({expected:44,live:44});
    expect(report.sections).toHaveLength(5);
    const text=JSON.stringify(report);
    for(const value of [alice,bob,a,b,'synthetic recovery note','@example.invalid','CREATE OR REPLACE FUNCTION','SECURITY DEFINER'])
      expect(text).not.toContain(value);
  } finally {await db.exec('reset role');}
  expect(await readRows(query)).toEqual(before);
});
test('diagnostic distinguishes the NOT NULL catalog hypothesis from semantic drift',async()=>{
  const expected=structuredClone(contract.contract);
  // Synthetic equivalent pre-18 catalog shape, NOT hosted evidence.
  expected.constraints=expected.constraints.filter((c:{definition:string})=>!c.definition.startsWith('NOT NULL '));
  const report=(await query(schemaDiagnosticSql(expected)))[0]!.schema_diagnostics as Record<string,unknown>;
  expect(report.rawContractMatches).toBe(false);expect(report.onlyNotNullCatalogRowsDiffer).toBe(true);
  expect(report.notNullCatalogEntries).toEqual({expected:0,live:44});
  const sections=report.sections as {section:string;matches:boolean;differentObjects:{type:string}[]}[];
  expect(sections.filter(s=>!s.matches).map(s=>s.section)).toEqual(['constraints']);
  expect(sections.find(s=>s.section==='constraints')!.differentObjects.every(o=>o.type==='NOT NULL')).toBe(true);
  expected.columns.find((c:{table:string;column:string})=>c.table==='progress'&&c.column==='note').notNull=true;
  const drift=(await query(schemaDiagnosticSql(expected)))[0]!.schema_diagnostics as Record<string,unknown>;
  expect(drift.rawContractMatches).toBe(false);expect(drift.onlyNotNullCatalogRowsDiffer).toBe(false);
});
test('diagnostic reports CHECK, PK, FK, index and function drift without printing definitions',async()=>{
  for (const kind of ['CHECK','PRIMARY','FOREIGN','index','function']) {
    const expected=structuredClone(contract.contract);
    const section=kind==='index'?'indexes':kind==='function'?'functions':'constraints';
    if(section==='constraints') {
      const item=expected.constraints.find((c:{definition:string})=>c.definition.startsWith(kind));
      item.definition=kind==='CHECK'?'CHECK (false)':kind==='PRIMARY'?'PRIMARY KEY (other_column)':
        'FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT';
    } else if(section==='indexes') expected.indexes[0].definition+=' WHERE false';
    else expected.functions[0]='CREATE OR REPLACE FUNCTION public.apply_profile_mutations(p_profile_id uuid, p_mutations jsonb)\n RETURNS jsonb\n LANGUAGE sql\nAS $function$SELECT null::jsonb$function$\n';
    const report=(await query(schemaDiagnosticSql(expected)))[0]!.schema_diagnostics as Record<string,unknown>;
    expect(report.rawContractMatches).toBe(false);expect(report.onlyNotNullCatalogRowsDiffer).toBe(false);
    const sections=report.sections as {section:string;matches:boolean;differentObjects:unknown[]}[];
    expect(sections.filter(s=>!s.matches).map(s=>s.section)).toEqual([section]);
    expect(sections.find(s=>s.section===section)!.differentObjects.length).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toContain('SELECT null::jsonb');
    expect(JSON.stringify(report)).not.toContain('CHECK (false)');
  }
});
test('backup role reads complete cross-owner data and cannot write, read Auth or call RPC',async()=>{
  await db.exec('set role calendar_backup');
  try {
    await assertBackupRole(query); await assertTarget(query,project,contract.schemaSha256);
    expect(await readRows(query)).toEqual(snapshot.data);
    for (const t of TABLES) {
      await expect(query(`delete from public.${t}`)).rejects.toThrow();
      await expect(query(`update public.${t} set ${t==='profiles'?'name=name':'mutation_id=mutation_id'}`)).rejects.toThrow();
      await expect(query(`insert into public.${t} select * from public.${t} limit 0`)).rejects.toThrow();
    }
    await expect(query('select * from auth.users')).rejects.toThrow();
    await expect(query('select public.ensure_default_profile()')).rejects.toThrow();
    await expect(query('select public.apply_profile_mutations($1::uuid,$2::jsonb)',[a,'[]'])).rejects.toThrow();
  } finally {await db.exec('reset role');}
});
test('backup policies do not widen anon or authenticated owner access',async()=>{
  await db.exec('set role anon');
  try {await expect(query('select * from public.profiles')).rejects.toThrow();}
  finally {await db.exec('reset role');}
  await query("select set_config('request.jwt.claim.sub',$1,false)",[alice]); await db.exec('set role authenticated');
  try {expect((await readRows(query)).profiles.map(p=>p.id)).toEqual([a]);}
  finally {await db.exec('reset role');}
});
test('format is deterministic and covers all seven tables, false rows and tombstones',()=>{
  expect(validateSnapshot(JSON.parse(canonical(snapshot)),project,contract.schemaSha256)).toEqual(snapshot);
  const reversed=Object.fromEntries(TABLES.map(t=>[t,[...snapshot.data[t]].reverse()])) as Rows;
  expect(makeSnapshot(reversed,snapshot)).toEqual(snapshot);
  expect(snapshot.counts.profiles).toBe(2);
  expect(snapshot.data.daily_marks.some(r=>r.completed===false)).toBe(true);
  expect(snapshot.data.custom_events.some(r=>r.deleted)).toBe(true);
  expect(canonical(snapshot)).not.toContain('@example.invalid');
});
test('validation fails closed on corruption, omissions, new versions, project, schema, invalid data and ownership',()=>{
  const mutate=(fn:(s:Snapshot)=>void)=>{const s=structuredClone(snapshot);fn(s);return s;};
  expect(()=>validateSnapshot(snapshot,'x'.repeat(20),contract.schemaSha256)).toThrow('Project');
  expect(()=>validateSnapshot(snapshot,project,'0'.repeat(64))).toThrow('Schema');
  for (const fn of [
    (s:Snapshot)=>{s.formatVersion=2 as 1;},
    (s:Snapshot)=>{s.data.progress.pop();},
    (s:Snapshot)=>{s.counts.daily_marks=0;},
    (s:Snapshot)=>{s.data.profiles.push(s.data.profiles[0]!);},
    (s:Snapshot)=>{s.data.progress[0]!.profile_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';},
    (s:Snapshot)=>{s.data.preferences[0]!.value=123;},
    (s:Snapshot)=>{s.data.profiles[0]!.provider_secret='no';},
  ]) expect(()=>validateSnapshot(mutate(fn),project,contract.schemaSha256)).toThrow();
  expect(()=>selectProfiles(snapshot,[])).toThrow(); expect(()=>selectProfiles(snapshot,[alice])).toThrow();
});
test('project and schema guards reject live drift',async()=>{
  await expect(assertTarget(query,'x'.repeat(20),contract.schemaSha256)).rejects.toThrow('identity');
  await db.exec('alter table public.progress add column unexpected text');
  try {await expect(assertTarget(query,project,contract.schemaSha256)).rejects.toThrow('schema');}
  finally {await db.exec('alter table public.progress drop column unexpected');}
});
test('restore planning rejects missing Auth IDs, owner reassignment and default conflicts',async()=>{
  const data=selectProfiles(snapshot,[a]);
  const changed=structuredClone(data); changed.profiles[0]!.owner_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  await expect(restorePlan(query,changed)).rejects.toThrow('Auth');
  changed.profiles[0]!.owner_id=bob;
  await expect(restorePlan(query,changed)).rejects.toThrow('ownership');
  const newid='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  await db.exec(`update public.profiles set is_default=false where id='${a}';
    insert into public.profiles(id,owner_id,is_default) values ('${newid}','${alice}',true)`);
  try {await expect(restorePlan(query,data)).rejects.toThrow('default');}
  finally {await db.exec(`delete from public.profiles where id='${newid}'; update public.profiles set is_default=true where id='${a}'`);}
});
test('dry run leaves rows unchanged; controlled restore is exact, isolated, idempotent and app-readable',async()=>{
  const selected=selectProfiles(snapshot,[a]);
  await db.exec(`update public.progress set note='damage' where profile_id='${a}' and not deleted;
    delete from public.daily_marks where profile_id='${a}'; delete from public.preferences where profile_id='${a}';
    delete from public.custom_events where profile_id='${a}';`);
  const before=await readRows(query),bobBefore=await readRows(query,[b]);
  await db.transaction(async tx=>{
    await tx.exec('set transaction read only');
    const q:Query=async(s,p=[])=> (await tx.query(s,p)).rows as Record<string,unknown>[];
    const plan=await restorePlan(q,selected);
    expect(plan.tables.daily_marks).toEqual({existing:0,restore:2});
  });
  expect(await readRows(query)).toEqual(before);
  const restore=()=>db.transaction(async tx=>{
    const q:Query=async(s,p=[])=> (await tx.query(s,p)).rows as Record<string,unknown>[];
    await tx.exec(`lock table ${TABLES.map(t=>`public.${t}`).join(',')} in share row exclusive mode`);
    await assertTarget(q,project,contract.schemaSha256); await restorePlan(q,selected); await writeRestore(q,selected);
  });
  await restore(); expect(await readRows(query,[a])).toEqual(selected);
  expect(await readRows(query,[b])).toEqual(bobBefore);
  await restore(); expect(await readRows(query,[a])).toEqual(selected);
  await query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);await db.exec('set role authenticated');
  try {
    const ownerRows=await readRows(query);
    let state=emptySyncState();
    for (const t of TABLES) if(t!=='profiles') for (const row of ownerRows[t]) {
      expect(decodeCloudRow(t,row)).toEqual(logicalMutation(t,row));
      state=applyMutation(state,decodeCloudRow(t,row)).state;
    }
    const visible=materializeCloud(state);
    expect(visible.progress['opaque:event#2026-10-01']?.note).toBe('synthetic recovery note');
    expect(visible.progress['deleted:event']).toBeUndefined();
    expect(visible.daily['dailies:zzz']?.days).toEqual(['2026-10-01']);
    expect(visible.ignored['unhidden:event']).toBeUndefined();
    expect(visible.prefs.theme).toBe('dark');expect(visible.prefs.focusGame).toBeNull();
    expect(visible.customGames['mygame:test']?.name).toBe('Drill game');
    expect(visible.customEvents['myevent:abcdef']?.title).toBe('Drill event');
  } finally {await db.exec('reset role');}
});
test('restore failure rolls back all changes',async()=>{
  const before=await readRows(query),data=selectProfiles(snapshot,[a]);
  await expect(db.transaction(async tx=>{
    const q:Query=async(s,p=[])=> (await tx.query(s,p)).rows as Record<string,unknown>[];
    await writeRestore(q,data); throw new Error('simulate failure before commit');
  })).rejects.toThrow('simulate');
  expect(await readRows(query)).toEqual(before);
});
test('connections enforce project, read/write roles, session/direct port and verified TLS',()=>{
  const host='aws-0-eu-central-1.pooler.supabase.com';
  const config=connectionConfig(`postgresql://calendar_backup.${project}:test@${host}:5432/postgres`,project,true);
  expect(config.tls.rejectUnauthorized).toBe(true);expect(config.max).toBe(1);
  expect(config.tls.serverName).toBe(host);
  expect(new URL(config.url).search).toBe('?sslmode=verify-full');
  expect(config.tls.ca).toBe(loadPinnedCA());
  expect(connectionConfig(`postgresql://calendar_backup:test@db.${project}.supabase.co/postgres`,project,true).tls.serverName).toBe(`db.${project}.supabase.co`);
  expect(connectionConfig(`postgresql://postgres.${project}:test@${host}/postgres`,project,false).tls.rejectUnauthorized).toBe(true);
  for (const url of [
    `postgresql://postgres.${project}:test@${host}:5432/postgres`,
    `postgresql://calendar_backup.${project}:test@${host}:6543/postgres`,
    `postgresql://calendar_backup.${project}:test@${host}:5432/postgres?sslmode=disable`,
    `postgresql://calendar_backup.${project}:test@evil.invalid:5432/postgres`,
    `postgresql://calendar_backup.wrongproject:test@${host}:5432/postgres`,
    `postgresql://calendar_backup.${project}:test@db.wrongproject.supabase.co:5432/postgres`,
    `postgresql://calendar_backup.${project}:test@${host}:5432/postgres?sslrootcert=other.crt`,
  ]) expect(()=>connectionConfig(url,project,true)).toThrow();
  expect(()=>connectionConfig(config.url,'bad',true)).toThrow('project ref');
});
test('reviewed Supabase CA fingerprint, provenance and validity are pinned',async()=>{
  const ca=loadPinnedCA(),cert=new X509Certificate(ca);
  expect(ca).toBe(await Bun.file(SUPABASE_CA_FILE).text());
  expect(cert.fingerprint256).toBe(SUPABASE_CA_FINGERPRINT);
  expect(cert.subject).toContain('CN=Supabase Root 2021 CA');
  expect(cert.issuer).toBe(cert.subject);expect(cert.ca).toBe(true);
  expect(new Date(cert.validFrom).toISOString()).toBe('2021-04-28T10:56:53.000Z');
  expect(new Date(cert.validTo).toISOString()).toBe('2031-04-26T10:56:53.000Z');
});
test('missing, malformed, modified or extra CA trust material fails closed',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'s6a-ca-'));
  try {
    const path=join(dir,'ca.pem');
    expect(()=>loadPinnedCA(path)).toThrow('missing');
    await writeFile(path,'-----BEGIN CERTIFICATE-----\nZm9v\n-----END CERTIFICATE-----\n');
    expect(()=>loadPinnedCA(path)).toThrow('Malformed');
    const ca=loadPinnedCA();
    // Valid DER with a changed signature: still parseable, wrong fingerprint.
    const cert=new X509Certificate(ca),der=Buffer.from(cert.raw);
    der[der.length-1]=der[der.length-1]!^1;
    await writeFile(path,`-----BEGIN CERTIFICATE-----\n${der.toString('base64')}\n-----END CERTIFICATE-----\n`);
    expect(()=>loadPinnedCA(path)).toThrow('fingerprint mismatch');
    await writeFile(path,ca+ca);expect(()=>loadPinnedCA(path)).toThrow('Malformed');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('native Bun.SQL trusts supplied CA and rejects untrusted chain, wrong hostname and refused TLS without fallback',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'s6a-native-tls-'));
  const host='aws-0-eu-central-1.pooler.supabase.com';
  try {
    const identity=testCertificate(dir,host);
    const config=connectionConfig(`postgresql://calendar_backup.${project}:test@${host}/postgres`,project,true);
    // A local wire-protocol peer, keeping the production SNI and verify-full.
    for (const scenario of ['trusted','untrusted','hostname','refused'] as const) {
      const server=await tlsPostgresServer(scenario==='refused'?null:identity);
      const tls=scenario==='untrusted'?config.tls:{...config.tls,ca:identity.cert,
        serverName:scenario==='hostname'?'wrong.pooler.supabase.com':config.tls.serverName};
      const sql=new SQL({...config,url:`postgresql://test:test@127.0.0.1:${server.port}/postgres?sslmode=verify-full`,tls,connectionTimeout:2});
      try {
        if(scenario==='trusted') await sql.connect();
        else await expect(sql.connect()).rejects.toThrow();
        const stats=await server.stats();
        expect(stats.startupMessages).toBe(scenario==='trusted'?1:0);
        expect(stats.connections).toBe(1);
      }finally{await sql.close({timeout:0});await server.close();}
    }
  }finally{await rm(dir,{recursive:true,force:true});}
},15000);
test('retention keeps 30 daily / 12 first-success monthly pairs, preserves history layout and fails closed on corruption',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'s6a-retention-'));
  const bytes=new TextEncoder().encode('age-encryption.org/v1\nsynthetic retention fixture (NOT decryptable)');
  try {
    for(let i=0;i<45;i++) {
      const createdAt=new Date(Date.UTC(2025,0,1+i)).toISOString();
      await storeEncrypted(dir,{...snapshot,createdAt},bytes,'age1test');
    }
    for(let month=1;month<15;month++) await storeEncrypted(dir,{...snapshot,createdAt:new Date(Date.UTC(2025,month,1)).toISOString()},bytes,'age1test');
    const {readdir}=await import('node:fs/promises');
    const daily=(await readdir(join(dir,'daily'))).filter(f=>f.endsWith('.age'));
    const monthly=(await readdir(join(dir,'monthly'))).filter(f=>f.endsWith('.age'));
    expect(daily).toHaveLength(30);expect(monthly).toHaveLength(12);
    const path=join(dir,'monthly','2026-03.snapshot.age');
    const first=await readFile(path.replace(/\.age$/,'.manifest.json'),'utf8');
    await storeEncrypted(dir,{...snapshot,createdAt:'2026-03-02T00:00:00.000Z'},bytes,'age1test');
    expect(await readFile(path.replace(/\.age$/,'.manifest.json'),'utf8')).toBe(first);
    await writeFile(join(dir,'daily','plaintext.json'),'unexpected');
    await expect(retain(dir)).rejects.toThrow('Unexpected');
    expect((await readdir(join(dir,'monthly'))).filter(f=>f.endsWith('.age'))).toHaveLength(12);
    await rm(join(dir,'daily','plaintext.json'));
    const {rename,symlink}=await import('node:fs/promises');
    await rename(join(dir,'daily'),join(dir,'daily-real'));
    await symlink(join(dir,'daily-real'),join(dir,'daily'),'junction');
    await expect(retain(dir)).rejects.toThrow('symlink');
    await rm(join(dir,'daily'));await rename(join(dir,'daily-real'),join(dir,'daily'));
    await writeFile(path,'corrupt');await expect(retain(dir)).rejects.toThrow('integrity');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('native Bun.SQL wire protocol encodes PG arrays/JSON, reads and restores JSON null, sanitizes DB errors',async()=>{
  const server=new PGLiteSocketServer({db,port:0,host:'127.0.0.1',maxConnections:2});
  await server.start();
  const url=`postgresql://postgres@${server.getServerConn()}/postgres`;
  const sql=new SQL(url,{max:1,prepare:false,tls:false});
  try {
    const data=await sql.begin('isolation level repeatable read read only',async tx=>{
      const q=safeQuery(tx);
      await q('set local role calendar_backup');await q("set local timezone='UTC'");
      await assertTarget(q,project,contract.schemaSha256);await assertBackupRole(q);
      return await readRows(q,[a]);
    });
    expect(data).toEqual(selectProfiles(snapshot,[a]));
    await sql.begin('read write',async tx=>{
      const q=safeQuery(tx);await q("set local timezone='UTC'");
      await restorePlan(q,data);await writeRestore(q,data);
    });
    expect(await readRows(query,[a])).toEqual(data);
    const failure=await safeQuery(sql)('select $1::integer',['sensitive-private-value']).catch(e=>e as Error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).not.toContain('sensitive-private-value');
  }finally{await sql.close({timeout:0});await server.stop();}
},20000);
test.skipIf(!process.env.AGE_TEST_IDENTITY || !process.env.AGE_TEST_RECIPIENT)(
  'real age encryption → decrypt → validate → dry run → controlled restore → app read (synthetic data)',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'s6a-age-'));
    try {
      const recipient=process.env.AGE_TEST_RECIPIENT!,identity=process.env.AGE_TEST_IDENTITY!;
      const bytes=await ageEncrypt(canonical(snapshot)+'\n',recipient);
      const path=await storeEncrypted(dir,snapshot,bytes,recipient);
      await verifyPair(path);
      expect(new TextDecoder().decode(bytes)).not.toContain('synthetic recovery note');
      const decrypted=validateSnapshot(JSON.parse(await ageDecrypt(path,identity)),project,contract.schemaSha256);
      const data=selectProfiles(decrypted,[a]);
      await restorePlan(query,data);
      await db.exec(`delete from public.progress where profile_id='${a}'`);
      await db.transaction(async tx=>{
        const q:Query=async(s,p=[])=> (await tx.query(s,p)).rows as Record<string,unknown>[];
        await restorePlan(q,data);await writeRestore(q,data);
      });
      expect(await readRows(query,[a])).toEqual(data);
      let state=emptySyncState();
      for(const t of TABLES) if(t!=='profiles') for(const r of data[t]) state=applyMutation(state,decodeCloudRow(t,r)).state;
      expect(materializeCloud(state).progress['opaque:event#2026-10-01']?.note).toBe('synthetic recovery note');
      await writeFile(path,bytes.slice(0,-10));await expect(verifyPair(path)).rejects.toThrow();
      await expect(ageDecrypt(path,identity)).rejects.toThrow('decryption');
    }finally{await rm(dir,{recursive:true,force:true});}
  });
