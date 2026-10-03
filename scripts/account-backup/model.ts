import { createHash } from 'node:crypto';
import { z } from 'zod';
import { SyncMutation } from '../../src/shared/sync.ts';

export const TABLES = ['profiles', 'progress', 'daily_marks', 'ignored',
  'preferences', 'custom_games', 'custom_events'] as const;
export type Table = typeof TABLES[number];
export type Row = Record<string, unknown>;
export type Rows = Record<Table, Row[]>;
export const KEYS: Record<Table, string[]> = {
  profiles: ['id'], progress: ['profile_id','event_id'],
  daily_marks: ['profile_id','subject_id','day_key'], ignored: ['profile_id','event_id'],
  preferences: ['profile_id','key'], custom_games: ['profile_id','local_id'],
  custom_events: ['profile_id','local_id'],
};
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error('Unsupported JSON value');
  return encoded;
}
export const sha256 = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
export function sortRows(table: Table, rows: Row[]): Row[] {
  return [...rows].sort((a,b) => {
    const x = canonical(KEYS[table].map(k=>a[k])), y = canonical(KEYS[table].map(k=>b[k]));
    return x < y ? -1 : x > y ? 1 : 0;
  });
}
const uuid = z.string().uuid();
const time = z.string().refine(v => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v)));
const base = { profile_id: uuid, changed_at: time, mutation_id: uuid, received_at: time };
const opaque = z.string().min(1).max(512);
const schemas = {
  profiles: z.object({ id: uuid, owner_id: uuid, name: z.string().min(1).max(80),
    is_default: z.boolean(), created_at: time, updated_at: time }).strict(),
  progress: z.object({ ...base, event_id: opaque, status: z.enum(['doing','done']).nullable(),
    effort: z.enum(['quick','short','long','grind']).nullable(), daily_override: z.boolean().nullable(),
    note: z.string().max(10000).nullable(), deleted: z.boolean() }).strict(),
  daily_marks: z.object({ ...base, subject_id: opaque, day_key: z.string().regex(/^\d{4}-\d\d-\d\d$/),
    completed: z.boolean() }).strict(),
  ignored: z.object({ ...base, event_id: opaque, ignored: z.boolean() }).strict(),
  preferences: z.object({ ...base, key: z.string(), value: z.unknown(), unset: z.boolean() }).strict(),
  custom_games: z.object({ ...base, local_id: z.string().regex(/^mygame:[a-z0-9-]{1,60}$/),
    payload: z.unknown(), deleted: z.boolean() }).strict(),
  custom_events: z.object({ ...base, local_id: z.string().regex(/^myevent:[a-z0-9]{6,32}$/),
    payload: z.unknown(), deleted: z.boolean() }).strict(),
};
export function logicalMutation(table: Exclude<Table,'profiles'>, row: Row) {
  const version = { changedAt: new Date(String(row.changed_at)).toISOString(), mutationId: row.mutation_id };
  const candidate = table === 'progress' ? { ...version, kind:'progress', key:row.event_id,
    deleted:row.deleted, payload:row.deleted ? null : { status:row.status, effort:row.effort,
      daily:row.daily_override, note:row.note } } :
    table === 'daily_marks' ? { ...version, kind:'daily', key:{subjectId:row.subject_id,dayKey:row.day_key}, completed:row.completed } :
    table === 'ignored' ? { ...version, kind:'ignored', key:row.event_id, ignored:row.ignored } :
    table === 'preferences' ? { ...version, kind:'preference', key:row.key, value:row.value, unset:row.unset } :
    { ...version, kind:table === 'custom_games' ? 'customGame' : 'customEvent', key:row.local_id,
      payload:row.payload, deleted:row.deleted };
  return SyncMutation.parse(candidate);
}
export function validateRows(data: Rows) {
  const profiles = new Set<string>(), defaults = new Set<string>();
  for (const p of data.profiles) {
    schemas.profiles.parse(p); profiles.add(String(p.id));
    if (p.is_default) {
      if (defaults.has(String(p.owner_id))) throw new Error('Duplicate default profile for owner');
      defaults.add(String(p.owner_id));
    }
  }
  for (const table of TABLES) {
    const keys = new Set<string>();
    for (const row of data[table]) {
      schemas[table].parse(row);
      // z.unknown() allows absent values; wire rows must include every column.
      const columns = Object.keys(schemas[table].shape).sort();
      if (canonical(Object.keys(row).sort()) !== canonical(columns)) throw new Error('Missing row column');
      const key = canonical(KEYS[table].map(k=>row[k]));
      if (keys.has(key)) throw new Error(`Duplicate key in ${table}`);
      keys.add(key);
      if (table !== 'profiles') {
        if (!profiles.has(String(row.profile_id))) throw new Error('Orphan profile child');
        if (table === 'progress' && row.deleted && [row.status,row.effort,row.daily_override,row.note].some(v=>v!==null))
          throw new Error('Nonempty progress tombstone');
        logicalMutation(table,row);
      }
    }
  }
}
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const perTable = <T extends z.ZodTypeAny>(v: T) => z.object(Object.fromEntries(TABLES.map(t=>[t,v])) as Record<Table,T>).strict();
const SnapshotSchema = z.object({
  format: z.literal('game-calendar-personal'), formatVersion: z.literal(1), schemaVersion: z.literal(1),
  createdAt: z.string().datetime(), projectRef: z.string().regex(/^[a-z]{20}$/),
  sourceRevision: z.string().regex(/^[a-f0-9]{40}$/), schemaSha256: hash,
  migrationSha256: z.record(hash), counts: perTable(z.number().int().nonnegative()),
  tableSha256: perTable(hash), dataSha256: hash, data: perTable(z.array(z.record(z.unknown()))),
}).strict();
export type Snapshot = z.infer<typeof SnapshotSchema>;
export function makeSnapshot(data: Rows, meta: Pick<Snapshot,'createdAt'|'projectRef'|'sourceRevision'|'schemaSha256'|'migrationSha256'>): Snapshot {
  const sorted = Object.fromEntries(TABLES.map(t=>[t,sortRows(t,data[t])])) as Rows;
  validateRows(sorted);
  return { format:'game-calendar-personal', formatVersion:1, schemaVersion:1, ...meta,
    counts:Object.fromEntries(TABLES.map(t=>[t,sorted[t].length])) as Snapshot['counts'],
    tableSha256:Object.fromEntries(TABLES.map(t=>[t,sha256(canonical(sorted[t]))])) as Snapshot['tableSha256'],
    dataSha256:sha256(canonical(sorted)), data:sorted };
}
export function validateSnapshot(input: unknown, expectedProject: string, expectedSchema: string): Snapshot {
  const s = SnapshotSchema.parse(input);
  if (s.projectRef !== expectedProject) throw new Error('Project mismatch');
  if (s.schemaSha256 !== expectedSchema) throw new Error('Schema mismatch');
  validateRows(s.data);
  for (const table of TABLES) {
    if (s.counts[table] !== s.data[table].length || s.tableSha256[table] !== sha256(canonical(s.data[table])) ||
      canonical(s.data[table]) !== canonical(sortRows(table,s.data[table]))) throw new Error(`Count/order/integrity mismatch: ${table}`);
  }
  if (s.dataSha256 !== sha256(canonical(s.data))) throw new Error('Data integrity mismatch');
  return s;
}
