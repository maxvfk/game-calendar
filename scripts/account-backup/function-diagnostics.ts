import { PGlite } from '@electric-sql/pglite';
import { writeFile } from 'node:fs/promises';
import { migrationHashes } from './generate-contract.ts';
import { canonical, type Row } from './model.ts';
import type { Query } from './database.ts';

// Catalog-only investigation. These are diagnostic components, not a new
// production contract: no rendered definition or body is returned to operators.
export const functionCatalogSql = `select 'public.'||p.proname as name,
  pg_catalog.pg_get_functiondef(p.oid) as definition, p.prosrc as body,
  jsonb_build_object(
    'arguments',pg_catalog.pg_get_function_arguments(p.oid),
    'result',pg_catalog.pg_get_function_result(p.oid),
    'argumentNames',p.proargnames,'argumentModes',p.proargmodes,
    'language',l.lanname,'kind',p.prokind,'volatility',p.provolatile,
    'strict',p.proisstrict,'securityDefiner',p.prosecdef,
    'leakproof',p.proleakproof,'parallel',p.proparallel,
    'cost',p.procost,'rows',p.prorows,'returnsSet',p.proretset,
    'configuration',p.proconfig,'binary',p.probin,
    'support',case when p.prosupport=0 then null else p.prosupport::regproc::text end,
    'sqlBody',p.prosqlbody::text
  ) as metadata
  from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
  where p.pronamespace='public'::regnamespace and p.proname in
    ('sync_text_array','sync_valid_preference','ensure_default_profile','apply_profile_mutations')
  order by p.proname,p.oid::regprocedure::text`;

export async function functionDiagnosticRows(query: Query): Promise<Row[]> {
  return query(functionCatalogSql);
}

export function functionDiagnosticSql(expected: Row[]): string {
  const literal=canonical(expected).replaceAll("'","''");
  return `-- Generated from PUBLIC migrations by function-diagnostics.ts.
-- Single read-only SELECT; no function execution, personal/Auth rows or writes.
-- No bodies/definitions/credentials in the result. Hashes are diagnostic only.
with expected as (
  select item->>'name' as name,item->>'definition' as definition,
    item->>'body' as body,item->'metadata' as metadata
  from jsonb_array_elements('${literal}'::jsonb) e(item)
), live as (${functionCatalogSql}), paired as (
  select coalesce(e.name,l.name) as name,e.definition as expected_definition,l.definition as live_definition,
    e.body as expected_body,l.body as live_body,e.metadata as expected_metadata,l.metadata as live_metadata
  from expected e full join live l on e.name=l.name
), components as (
  select name,section,expected,live from paired cross join lateral (values
    ('definition',expected_definition,live_definition),
    ('body',expected_body,live_body),
    ('metadata',expected_metadata::text,live_metadata::text),
    -- Remove the exact catalog body only, leaving the entire declaration and
    -- dollar-quote delimiters intact. No whitespace is normalized here.
    ('declaration',case when length(expected_body)>0 then replace(expected_definition,expected_body,'') end,
      case when length(live_body)>0 then replace(live_definition,live_body,'') end)
  ) c(section,expected,live)
)
select jsonb_build_object(
  'serverMajor',current_setting('server_version_num')::integer / 10000,
  'projectRefs',(select jsonb_agg(project_ref order by project_ref) from calendar_backup_control.project_identity),
  'expectedObjects',(select count(*) from expected),'liveObjects',(select count(*) from live),
  'hashEncoding','SHA-256 of UTF-8 text (metadata uses jsonb::text); diagnostic only',
  'functions',(select jsonb_agg(jsonb_build_object(
    'name',p.name,'type','FUNCTION',
    'sections',(select jsonb_agg(jsonb_build_object('section',c.section,
      'matches',c.expected is not distinct from c.live,
      'expectedSha256',encode(sha256(convert_to(c.expected,'UTF8')),'hex'),
      'liveSha256',encode(sha256(convert_to(c.live,'UTF8')),'hex')) order by c.section)
      from components c where c.name=p.name),
    'differentMetadata',(select coalesce(jsonb_agg(jsonb_build_object(
      'name',coalesce(e.key,l.key),'type','FUNCTION ATTRIBUTE',
      'change',case when e.key is null then 'live-only' when l.key is null then 'expected-only' else 'changed' end)
      order by coalesce(e.key,l.key)),'[]'::jsonb)
      from jsonb_each(p.expected_metadata) e full join jsonb_each(p.live_metadata) l on e.key=l.key
      where e.value is distinct from l.value),
    -- Specific investigation candidates only: these do NOT authorize any
    -- production normalization, including changes inside string literals.
    'bodyMatchesAfterCRLF',replace(p.expected_body,E'\\r\\n',E'\\n')=replace(p.live_body,E'\\r\\n',E'\\n'),
    'bodyMatchesAfterOuterNewlines',btrim(p.expected_body,E'\\r\\n')=btrim(p.live_body,E'\\r\\n'),
    'bodyMatchesAfterCRLFAndOuterNewlines',
      btrim(replace(p.expected_body,E'\\r\\n',E'\\n'),E'\\n')=btrim(replace(p.live_body,E'\\r\\n',E'\\n'),E'\\n')
  ) order by p.name) from paired p)
) as function_diagnostics;
`;
}

export async function generatedFunctionDiagnostics(): Promise<Row[]> {
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    for(const f of Object.keys(await migrationHashes()))
      await db.exec(await Bun.file(new URL(`../../supabase/migrations/${f}`,import.meta.url)).text());
    return await functionDiagnosticRows(async(s,p=[]) => (await db.query(s,p)).rows as Row[]);
  } finally {await db.close();}
}

if(import.meta.main) {
  await writeFile(new URL('../../supabase/diagnostics/account-backup-functions.sql',import.meta.url),
    functionDiagnosticSql(await generatedFunctionDiagnostics()));
  console.log('Generated read-only function diagnostic SQL; production contract unchanged.');
}
