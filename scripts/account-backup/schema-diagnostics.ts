import { readFile, writeFile } from 'node:fs/promises';
import { contractSql } from './database.ts';
import { canonical, TABLES } from './model.ts';

// Investigation only: does not alter the production contract or accept a hash.
// The emitted single SELECT reads catalog metadata and the safe project marker,
// never personal tables/Auth rows. Public migration definitions stay embedded
// in the query, but results contain only object names/types and diagnostic hashes.
export function schemaDiagnosticSql(expected: unknown): string {
  const literal = canonical(expected).replaceAll("'", "''");
  const query = contractSql.replaceAll('$1::text[]', `array[${TABLES.map(t=>`'${t}'`).join(',')}]::text[]`);
  return `-- Generated from backup-contract.v1.json by schema-diagnostics.ts.
-- Read-only investigation; no credentials, personal rows or schema writes.
-- Run this whole single SELECT in the EXISTING Game Calendar SQL Editor.
with expected(value) as (values ('${literal}'::jsonb)),
live as (${query}),
sections as (
  select name, e.value->name as expected, l.contract->name as live
  from expected e cross join live l cross join
    (values ('columns'),('constraints'),('indexes'),('triggers'),('functions')) s(name)
),
objects as (
  select s.name as section, side, item,
    case s.name
      when 'columns' then item->>'table'||'.'||(item->>'column')
      when 'constraints' then item->>'table'||'.'||(item->>'name')
      when 'indexes' then item->>'table'||'.'||(item->>'name')
      when 'functions' then substring(split_part(item#>>'{}', E'\\n', 1) from '^CREATE OR REPLACE FUNCTION ([^(]+)')
      when 'triggers' then substring(item#>>'{}' from ' ON ([^ ]+)')||'.'||
        substring(item#>>'{}' from '^CREATE TRIGGER ([^ ]+)')
    end as name,
    case s.name
      when 'columns' then item->>'type'
      when 'constraints' then case when item->>'definition' like 'NOT NULL %' then 'NOT NULL'
        else split_part(item->>'definition',' ',1) end
      when 'indexes' then 'INDEX'
      when 'functions' then 'FUNCTION'
      when 'triggers' then 'TRIGGER'
    end as object_type
  from sections s cross join (values ('expected'),('live')) sides(side)
    cross join lateral jsonb_array_elements(case side when 'expected' then s.expected else s.live end) a(item)
),
differences as (
  select coalesce(e.section,l.section) as section, coalesce(e.name,l.name) as name,
    coalesce(e.object_type,l.object_type) as object_type,
    case when e.item is null then 'live-only' when l.item is null then 'expected-only' else 'changed' end as change
  from (select * from objects where side='expected') e
    full join (select * from objects where side='live') l on e.section=l.section and e.name=l.name
  where e.item is distinct from l.item
),
not_null_hypothesis as (
  select side, coalesce(jsonb_agg(item order by item->>'table',item->>'name')
    filter (where object_type<>'NOT NULL'),'[]'::jsonb) as constraints,
    count(*) filter (where object_type='NOT NULL') as not_null_entries
  from objects where section='constraints' group by side
)
select jsonb_build_object(
  'serverMajor',current_setting('server_version_num')::integer / 10000,
  'projectRefs',(select jsonb_agg(project_ref order by project_ref) from calendar_backup_control.project_identity),
  'rawContractMatches',(select bool_and(expected=live) from sections),
  'onlyNotNullCatalogRowsDiffer',
    (select not bool_and(expected=live) from sections) and
    (select bool_and(expected=live) from sections where name<>'constraints') and
    (select e.constraints=l.constraints from not_null_hypothesis e cross join not_null_hypothesis l
      where e.side='expected' and l.side='live'),
  'notNullCatalogEntries',(select jsonb_object_agg(side,not_null_entries) from not_null_hypothesis),
  'hashEncoding','SHA-256 of PostgreSQL jsonb::text (diagnostic only; not the production canonical hash)',
  'sections',(select jsonb_agg(jsonb_build_object(
    'section',s.name,'matches',s.expected=s.live,
    'expectedObjects',jsonb_array_length(s.expected),'liveObjects',jsonb_array_length(s.live),
    'expectedSha256',encode(sha256(convert_to(s.expected::text,'UTF8')),'hex'),
    'liveSha256',encode(sha256(convert_to(s.live::text,'UTF8')),'hex'),
    'differentObjects',coalesce((select jsonb_agg(jsonb_build_object(
      'name',d.name,'type',d.object_type,'change',d.change) order by d.name)
      from differences d where d.section=s.name),'[]'::jsonb)) order by s.name) from sections s)
) as schema_diagnostics;
`;
}

if (import.meta.main) {
  const expected=JSON.parse(await readFile(new URL('../../supabase/backup-contract.v1.json',import.meta.url),'utf8')) as {contract:unknown};
  await writeFile(new URL('../../supabase/diagnostics/account-backup-schema.sql',import.meta.url),schemaDiagnosticSql(expected.contract));
  console.log('Generated read-only schema diagnostic SQL; production contract unchanged.');
}
