import { createClient } from "@supabase/supabase-js";
import { CustomEvent, CustomGame } from "../../shared/custom.ts";
import {
  applyMutation, emptySyncState, SyncMutation, type SyncState,
} from "../../shared/sync.ts";
import { profileKeys, type ProfileStorageKeys } from "../state/storage.ts";
import type { DailyLogMap } from "../state/useDailyLog.ts";
import { defaults, restorePrefsValue, type Prefs } from "../state/usePrefs.ts";
import type { ProgressMap } from "../state/useProgress.ts";
import type { Marks } from "../state/useMarkSet.ts";
import type { CustomEvents, CustomGames } from "../../shared/custom.ts";

// These are public browser credentials. Secret/service-role and Google client
// secrets are configured only in Supabase, never in the Pages build.
export const SUPABASE_URL = "https://vzzudezdigjwbwfejlsg.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zPl-zVjUOAoUUVQz4qwSdA_3hrcJOOc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true },
});

export type PersonalState = {
  progress: ProgressMap;
  daily: DailyLogMap;
  ignored: Marks;
  prefs: Prefs;
  customGames: CustomGames;
  customEvents: CustomEvents;
};

const tables = [
  "progress", "daily_marks", "ignored", "preferences", "custom_games", "custom_events",
] as const;
type Table = typeof tables[number];
const order: Record<Table, string[]> = {
  progress: ["event_id"], daily_marks: ["subject_id", "day_key"],
  ignored: ["event_id"], preferences: ["key"],
  custom_games: ["local_id"], custom_events: ["local_id"],
};

/** Supabase/PostgREST caps a response page; never silently drop later rows. */
async function fetchTable(table: Table, profileId: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let start = 0; ; start += 500) {
    let query = supabase.from(table).select("*").eq("profile_id", profileId);
    for (const column of order[table]) query = query.order(column);
    const { data, error } = await query.range(start, start + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
  }
}

/** Turn read-only RLS rows back into the same validated logical registers as S1. */
export function decodeCloudRow(table: Table, row: Record<string, unknown>): SyncMutation {
  const version = {
    changedAt: new Date(String(row.changed_at)).toISOString(),
    mutationId: row.mutation_id,
  };
  let candidate: unknown;
  switch (table) {
    case "progress":
      candidate = { ...version, kind: "progress", key: row.event_id,
        deleted: row.deleted, payload: row.deleted ? null : {
          status: row.status, effort: row.effort, daily: row.daily_override, note: row.note,
        } };
      break;
    case "daily_marks":
      candidate = { ...version, kind: "daily",
        key: { subjectId: row.subject_id, dayKey: row.day_key }, completed: row.completed };
      break;
    case "ignored":
      candidate = { ...version, kind: "ignored", key: row.event_id, ignored: row.ignored };
      break;
    case "preferences":
      candidate = { ...version, kind: "preference", key: row.key,
        value: row.value, unset: row.unset };
      break;
    case "custom_games":
      candidate = { ...version, kind: "customGame", key: row.local_id,
        deleted: row.deleted, payload: row.payload };
      break;
    case "custom_events":
      candidate = { ...version, kind: "customEvent", key: row.local_id,
        deleted: row.deleted, payload: row.payload };
      break;
  }
  return SyncMutation.parse(candidate);
}

export async function pullCloud(profileId: string,
  inspect?: (row: Record<string, unknown>) => void): Promise<SyncState> {
  profileKeys(profileId);
  let state = emptySyncState();
  for (const table of tables) {
    for (const row of await fetchTable(table, profileId)) {
      inspect?.(row);
      state = applyMutation(state, decodeCloudRow(table, row)).state;
    }
  }
  return state;
}

export function hasCloudData(state: SyncState): boolean {
  return Object.values(state).some((bucket) => Object.keys(bucket).length > 0);
}

/** Tombstones stay in the database; the existing v2 UI stores only live rows. */
export function materializeCloud(state: SyncState): PersonalState {
  const progress: ProgressMap = Object.create(null);
  const daily: DailyLogMap = Object.create(null);
  const ignored: Marks = Object.create(null);
  const prefs: Record<string, unknown> = Object.create(null);
  const customGames: CustomGames = Object.create(null);
  const customEvents: CustomEvents = Object.create(null);
  for (const row of Object.values(state.progress)) {
    if (row.deleted || row.payload === null) continue;
    progress[row.key] = { at: row.changedAt,
      ...(row.payload.status !== null ? { status: row.payload.status } : {}),
      ...(row.payload.effort !== null ? { effort: row.payload.effort } : {}),
      ...(row.payload.daily !== null ? { daily: row.payload.daily } : {}),
      ...(row.payload.note !== null ? { note: row.payload.note } : {}),
    };
  }
  for (const row of Object.values(state.daily)) {
    if (!row.completed) continue;
    const entry = daily[row.key.subjectId];
    daily[row.key.subjectId] = {
      days: [...(entry?.days ?? []), row.key.dayKey].sort(),
      at: entry && entry.at > row.changedAt ? entry.at : row.changedAt,
    };
  }
  for (const row of Object.values(state.ignored)) {
    if (row.ignored) ignored[row.key] = { at: row.changedAt };
  }
  for (const row of Object.values(state.preference)) {
    if (!row.unset) prefs[row.key] = row.value;
  }
  for (const row of Object.values(state.customGame)) {
    if (!row.deleted) customGames[row.key] = CustomGame.parse(row.payload);
  }
  for (const row of Object.values(state.customEvent)) {
    if (!row.deleted) customEvents[row.key] = CustomEvent.parse(row.payload);
  }
  return { progress, daily, ignored,
    prefs: Object.keys(prefs).length ? restorePrefsValue(prefs) : defaults(),
    customGames, customEvents };
}

export function readPersonalState(keys: ProfileStorageKeys, storage: Pick<Storage, "getItem">): PersonalState {
  const read = (key: string): unknown => JSON.parse(storage.getItem(key) ?? "null");
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : {};
  const games: CustomGames = Object.create(null);
  const events: CustomEvents = Object.create(null);
  for (const [key, value] of Object.entries(record(read(keys.customGames)))) {
    const parsed = CustomGame.safeParse(value);
    if (!parsed.success || parsed.data.id !== key) throw new Error(`Invalid local custom game: ${key}`);
    games[key] = parsed.data;
  }
  for (const [key, value] of Object.entries(record(read(keys.customEvents)))) {
    const parsed = CustomEvent.safeParse(value);
    if (!parsed.success || parsed.data.id !== key) throw new Error(`Invalid local custom event: ${key}`);
    events[key] = parsed.data;
  }
  return {
    progress: record(read(keys.progress)) as ProgressMap,
    daily: record(read(keys.daily)) as DailyLogMap,
    ignored: record(read(keys.ignored)) as Marks,
    prefs: restorePrefsValue(read(keys.prefs)),
    customGames: games, customEvents: events,
  };
}

export function personalCounts(state: PersonalState) {
  return { progress: Object.keys(state.progress).length,
    daily: Object.values(state.daily).reduce((sum, log) => sum + (log?.days?.length ?? 0), 0),
    ignored: Object.keys(state.ignored).length,
    customGames: Object.keys(state.customGames).length,
    customEvents: Object.keys(state.customEvents).length,
    settings: state.prefs.onboarded ||
      JSON.stringify(state.prefs) !== JSON.stringify(defaults()) ? 1 : 0 };
}

export function hasGuestData(state: PersonalState): boolean {
  return Object.values(personalCounts(state)).some((count) => count > 0);
}

export async function applyCloudMutations(profileId: string, mutations: SyncMutation[]): Promise<void> {
  const encoder = new TextEncoder();
  const batches: SyncMutation[][] = [];
  let batch: SyncMutation[] = [];
  let bytes = 2;
  for (const row of mutations) {
    const rowBytes = encoder.encode(JSON.stringify(row)).length + 1;
    if (rowBytes > 200_000) throw new Error("A local record exceeds the import batch limit");
    if (batch.length === 100 || bytes + rowBytes > 200_000) {
      batches.push(batch);
      batch = [];
      bytes = 2;
    }
    batch.push(row);
    bytes += rowBytes;
  }
  if (batch.length) batches.push(batch);
  for (const rows of batches) {
    const { data, error } = await supabase.rpc("apply_profile_mutations", {
      p_profile_id: profileId, p_mutations: rows,
    });
    if (error) throw error;
    if (!Array.isArray(data) || data.length !== rows.length ||
        data.some((ack, j) => ack.mutationId !== rows[j]?.mutationId ||
          !["accepted", "superseded"].includes(ack.outcome))) {
      throw new Error("Unrecognized mutation acknowledgement");
    }
  }
}
