import { CustomEvent as OwnEvent, CustomGame } from "../../shared/custom.ts";
import {
  applyMutation, emptySyncState, logicalKey, mergeSyncState,
  PreferenceKey, SyncMutation, SyncOutbox, type SyncState,
} from "../../shared/sync.ts";
import {
  profileKeys, registerAccountWriter, type ProfileStorageKeys,
} from "../state/storage.ts";
import { materializeCloud, readPersonalState, type PersonalState } from "./remote.ts";
import { restorePrefsValue } from "../state/usePrefs.ts";
import { readAccountBinding } from "./firstLogin.ts";

type Store = Pick<Storage, "getItem" | "setItem">;
type Name = "progress" | "daily" | "ignored" | "prefs" | "customGames" | "customEvents";
const names: Name[] = ["progress", "daily", "ignored", "prefs", "customGames", "customEvents"];
export const LOCAL_CHANGE = "account-sync-local-change";
export const REMOTE_CHANGE = "account-sync-remote-change";

export type SyncMeta = { schemaVersion: 2; baseline: SyncState | null;
  lastAttemptAt?: string; lastSuccessfulSyncAt?: string; lastError?: string };

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid local sync store; export a backup before syncing");
  }
  return value as Record<string, unknown>;
}
function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const parsed = (store: Store, key: string, fallback: unknown) => {
  const raw = store.getItem(key);
  return raw === null ? fallback : JSON.parse(raw) as unknown;
};

export function readOutbox(store: Store, keys: ProfileStorageKeys): SyncOutbox {
  try { return SyncOutbox.parse(parsed(store, keys.outbox, [])); }
  catch { throw new Error("Invalid sync outbox; export a backup before retrying"); }
}
export function readSyncMeta(store: Store, keys: ProfileStorageKeys): SyncMeta {
  let data: Record<string, unknown>;
  try { data = record(parsed(store, keys.syncMeta, null)); }
  catch { throw new Error("Sync metadata is incompatible; export a backup"); }
  if (data.schemaVersion !== 2) throw new Error("Sync metadata is incompatible; export a backup");
  const baseline = data.baseline === null ? null : validateState(data.baseline);
  return { schemaVersion: 2, baseline,
    ...(typeof data.lastAttemptAt === "string" ? { lastAttemptAt: data.lastAttemptAt } : {}),
    ...(typeof data.lastSuccessfulSyncAt === "string" ? { lastSuccessfulSyncAt: data.lastSuccessfulSyncAt } : {}),
    ...(typeof data.lastError === "string" ? { lastError: data.lastError } : {}) };
}
function validateState(raw: unknown): SyncState {
  const buckets = record(raw);
  let state = emptySyncState();
  for (const kind of Object.keys(state) as Array<keyof SyncState>) {
    for (const [key, value] of Object.entries(record(buckets[kind]))) {
      const row = SyncMutation.parse(value);
      if (row.kind !== kind || logicalKey(row) !== key) throw new Error("Invalid sync baseline");
      state = applyMutation(state, row).state;
    }
  }
  return state;
}

function rowVersion(kind: SyncMutation["kind"], key: string,
  baseline: SyncState | null, outbox: SyncOutbox, now: number): number {
  const prior = [...outbox].reverse().find((row) => row.kind === kind && logicalKey(row) === key);
  const base = baseline?.[kind][key];
  // A remote device's future clock must not move this device's edit timestamp
  // into the future. Only advance past a baseline that is already due here.
  const baselineAt = Date.parse(base?.changedAt ?? "") || 0;
  return Math.max(Date.parse(prior?.changedAt ?? "") || 0,
    baselineAt <= now ? baselineAt : 0);
}

/** One storage write produces one version per changed logical row. */
export function diffStore(name: Name, before: unknown, after: unknown,
  baseline: SyncState | null, pending: SyncOutbox, historic = false,
  now = Date.now()): SyncMutation[] {
  const old = record(before);
  const next = record(after);
  const changes: SyncMutation[] = [];
  const emit = (kind: SyncMutation["kind"], key: string, value: object,
    sourceAt?: unknown) => {
    const source = historic && typeof sourceAt === "string" ? Date.parse(sourceAt) : NaN;
    const millis = Math.max(Number.isFinite(source) ? source : now,
      rowVersion(kind, key, baseline, pending, now) + 1);
    const row = SyncMutation.parse({ ...value, kind,
      changedAt: new Date(millis).toISOString(), mutationId: uuid() });
    changes.push(row);
  };
  if (name === "daily") {
    for (const subjectId of new Set([...Object.keys(old), ...Object.keys(next)])) {
      const previous = old[subjectId] as { days?: unknown } | undefined;
      const current = next[subjectId] as { days?: unknown; at?: unknown } | undefined;
      const priorDays = previous?.days === undefined ? [] : previous.days;
      const days = current?.days === undefined ? [] : current.days;
      if (!Array.isArray(priorDays) || !Array.isArray(days)) throw new Error("Invalid daily log");
      const a = new Set(priorDays);
      const b = new Set(days);
      for (const dayKey of new Set([...a, ...b])) {
        if (a.has(dayKey) === b.has(dayKey)) continue;
        const key = JSON.stringify([subjectId, dayKey]);
        emit("daily", key, { key: { subjectId, dayKey }, completed: b.has(dayKey) }, current?.at);
      }
    }
  } else {
    for (const key of new Set([...Object.keys(old), ...Object.keys(next)])) {
      if (equal(old[key], next[key])) continue;
      const value = next[key];
      switch (name) {
        case "progress": {
          const p = value === undefined ? null : record(value);
          emit("progress", key, { key, deleted: p === null,
            payload: p === null ? null : { status: p.status ?? null, effort: p.effort ?? null,
              daily: p.daily ?? null, note: p.note ?? null } }, p?.at);
          break;
        }
        case "ignored":
          emit("ignored", key, { key, ignored: value !== undefined },
            (value as { at?: unknown } | undefined)?.at);
          break;
        case "prefs": {
          const pref = PreferenceKey.parse(key);
          emit("preference", key, { key: pref, unset: value === undefined,
            value: value === undefined ? null : value });
          break;
        }
        case "customGames": {
          const game = value === undefined ? null : CustomGame.parse(value);
          emit("customGame", key, { key, deleted: game === null, payload: game },
            game?.updatedAt ?? game?.at);
          break;
        }
        case "customEvents": {
          const event = value === undefined ? null : OwnEvent.parse(value);
          emit("customEvent", key, { key, deleted: event === null, payload: event }, event?.updatedAt);
          break;
        }
      }
    }
  }
  return changes;
}

export function compactOutbox(outbox: SyncOutbox, changes: SyncMutation[]): SyncOutbox {
  const replaced = new Set(changes.map((row) => `${row.kind}:${logicalKey(row)}`));
  return SyncOutbox.parse([
    ...outbox.filter((row) => !replaced.has(`${row.kind}:${logicalKey(row)}`)), ...changes,
  ]);
}

/** Migrate edits made during S4 before enabling cloud pull. Never assume an
 * absent or malformed S4 baseline means an empty account. */
export function initializeAccountProfile(store: Store, profileId: string, ownerId: string): void {
  if (!readAccountBinding(store, profileId, ownerId)) throw new Error("Account binding mismatch");
  const keys = profileKeys(profileId);
  const raw = record(parsed(store, keys.syncMeta, null));
  if (raw.schemaVersion === 1) {
    const old = record(raw.baseline) as PersonalState;
    const current = readPersonalState(keys, store);
    let pending = readOutbox(store, keys);
    for (const name of names) {
      const existing = new Set(pending.map((row) => `${row.kind}:${logicalKey(row)}`));
      const changes = diffStore(name, old[name] ?? {}, current[name], null, pending, true)
        .filter((row) => !existing.has(`${row.kind}:${logicalKey(row)}`));
      pending = compactOutbox(pending, changes);
    }
    store.setItem(keys.outbox, JSON.stringify(pending));
    store.setItem(keys.syncMeta, JSON.stringify({ schemaVersion: 2, baseline: null } satisfies SyncMeta));
  } else {
    const meta = readSyncMeta(store, keys);
    const pending = readOutbox(store, keys);
    if (meta.baseline !== null) {
      writeSnapshot(store, keys, materializeCloud(
        mergeSyncState(meta.baseline, stateFromOutbox(pending))));
    } else if (pending.length) {
      // S4 had only a materialized baseline. Reapply journaled edits to its
      // existing cache after a crash between the outbox and state writes.
      writeSnapshot(store, keys, overlayPending(readPersonalState(keys, store), pending));
    }
  }
}

export function overlayPending(cache: PersonalState, pending: SyncMutation[]): PersonalState {
  const progress = Object.assign(Object.create(null), cache.progress) as PersonalState["progress"];
  const daily = Object.assign(Object.create(null), cache.daily) as PersonalState["daily"];
  const ignored = Object.assign(Object.create(null), cache.ignored) as PersonalState["ignored"];
  const prefs: Record<string, unknown> = { ...cache.prefs };
  const customGames = Object.assign(Object.create(null), cache.customGames) as PersonalState["customGames"];
  const customEvents = Object.assign(Object.create(null), cache.customEvents) as PersonalState["customEvents"];
  for (const row of pending) {
    switch (row.kind) {
      case "progress":
        if (row.deleted || row.payload === null) delete progress[row.key];
        else progress[row.key] = materializeCloud(
          applyMutation(emptySyncState(), row).state).progress[row.key]!;
        break;
      case "daily": {
        const { subjectId, dayKey } = row.key;
        const days = new Set(daily[subjectId]?.days ?? []);
        if (row.completed) days.add(dayKey); else days.delete(dayKey);
        if (days.size) daily[subjectId] = { days: [...days].sort(), at: row.changedAt };
        else delete daily[subjectId];
        break;
      }
      case "ignored":
        if (row.ignored) ignored[row.key] = { at: row.changedAt };
        else delete ignored[row.key];
        break;
      case "preference":
        if (row.unset) delete prefs[row.key]; else prefs[row.key] = row.value;
        break;
      case "customGame":
        if (row.deleted || row.payload === null) delete customGames[row.key];
        else customGames[row.key] = row.payload;
        break;
      case "customEvent":
        if (row.deleted || row.payload === null) delete customEvents[row.key];
        else customEvents[row.key] = row.payload;
        break;
    }
  }
  return { progress, daily, ignored, prefs: restorePrefsValue(prefs), customGames, customEvents };
}

export function stateFromOutbox(outbox: SyncOutbox): SyncState {
  let state = emptySyncState();
  for (const row of outbox) state = applyMutation(state, row).state;
  return state;
}

export function writeSnapshot(store: Store, keys: ProfileStorageKeys, state: PersonalState): boolean {
  let changed = false;
  for (const name of names) {
    if (store.getItem(keys[name]) === JSON.stringify(state[name])) continue;
    store.setItem(keys[name], JSON.stringify(state[name]));
    changed = true;
  }
  return changed;
}

export function captureAccountWrite(store: Store, profileId: string, name: Name,
  value: unknown): number {
  const keys = profileKeys(profileId);
  const meta = readSyncMeta(store, keys);
  const old = parsed(store, keys[name], {});
  const outbox = readOutbox(store, keys);
  const changes = diffStore(name, old, value, meta.baseline, outbox);
  if (changes.length) store.setItem(keys.outbox, JSON.stringify(compactOutbox(outbox, changes)));
  store.setItem(keys[name], JSON.stringify(value));
  return changes.length;
}

/** This sits under every existing hook, including export/import's merge path. */
registerAccountWriter((key, value) => {
  const match = /^gacha-tracker:v2:profile:([0-9a-f-]{36}):(progress|daily|ignored|prefs|customGames|customEvents)$/i.exec(key);
  if (!match) return false;
  const profileId = match[1]!;
  const name = match[2]! as Name;
  const store = localStorage;
  try {
    const binding = parsed(store, `${profileKeys(profileId).syncMeta}:account`, null);
    if (binding === null) return false;
    if (record(binding).profileId !== profileId || typeof record(binding).ownerId !== "string") {
      throw new Error("Account binding mismatch");
    }
    if (record(parsed(store, profileKeys(profileId).syncMeta, null)).schemaVersion === 1) {
      initializeAccountProfile(store, profileId, record(binding).ownerId as string);
    }
    const count = captureAccountWrite(store, profileId, name, value);
    if (count) window.dispatchEvent(new CustomEvent(LOCAL_CHANGE, { detail: profileId }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE, { detail: { profileId,
      error: error instanceof Error ? error.message : String(error) } }));
    // The React state remains usable, but no unjournaled account write may be
    // silently persisted and later mistaken for a cloud-confirmed snapshot.
  }
  return true;
});
