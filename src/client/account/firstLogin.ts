import { CustomEvent, CustomGame } from "../../shared/custom.ts";
import { PreferenceKey, SyncMutation, type SyncState } from "../../shared/sync.ts";
import { PROFILE_KEYS, profileKeys } from "../state/storage.ts";
import type { PersonalState } from "./remote.ts";
import { materializeCloud, pullCloud, applyCloudMutations } from "./remote.ts";

type Store = Pick<Storage, "getItem" | "setItem">;
export type SettingsChoice = "cloud" | "local";
export type AccountBinding = { schemaVersion: 1; ownerId: string; profileId: string };
type MigrationPlan = AccountBinding & { guestId: string; mutations: SyncMutation[] };

const accountKey = (profileId: string) => `${profileKeys(profileId).syncMeta}:account`;
const planKey = (profileId: string) => `${profileKeys(profileId).syncMeta}:firstLoginPlan`;

/** S2 may keep v1 data only in memory after a failed storage copy. Never
 * interpret the partially persisted guest as an empty first-login source. */
export function guestMigrationDurable(store: Store, guestId: string): boolean {
  try {
    const registry = JSON.parse(store.getItem(PROFILE_KEYS.profiles) ?? "null") as {
      schemaVersion?: unknown; guestProfileId?: unknown; legacyMigrated?: unknown;
    } | null;
    return registry?.schemaVersion === 2 && registry.guestProfileId === guestId &&
      registry.legacyMigrated === true;
  } catch { return false; }
}

export function readAccountBinding(store: Store, profileId: string, ownerId: string): boolean {
  try {
    const data = JSON.parse(store.getItem(accountKey(profileId)) ?? "null") as AccountBinding | null;
    return data?.schemaVersion === 1 && data.ownerId === ownerId && data.profileId === profileId;
  } catch { return false; }
}

export function pendingPlan(store: Store, profileId: string, ownerId: string, guestId: string): SyncMutation[] | null {
  try {
    const data = JSON.parse(store.getItem(planKey(profileId)) ?? "null") as MigrationPlan | null;
    if (data === null) return null;
    if (data.schemaVersion !== 1 || data.profileId !== profileId ||
        data.ownerId !== ownerId || data.guestId !== guestId || !Array.isArray(data.mutations)) {
      throw new Error("Migration plan belongs to another account or guest");
    }
    return data.mutations.map((row) => SyncMutation.parse(row));
  } catch (error) {
    if (error instanceof Error && error.message.includes("another account")) throw error;
    throw new Error("Stored first-login plan is invalid; export local data before retrying");
  }
}

function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function timestamp(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !Number.isFinite(Date.parse(raw))) {
    throw new Error(`Invalid local timestamp in ${label}; export data before migration`);
  }
  return new Date(raw).toISOString();
}

/** An explicit, one-time import. Existing local hooks are not wired to S5 yet. */
export function guestMutations(guest: PersonalState, settings: SettingsChoice,
  cloud: SyncState, acceptedAt: string): SyncMutation[] {
  const rows: SyncMutation[] = [];
  for (const [key, value] of Object.entries(guest.progress)) {
    if (!value || typeof value !== "object") throw new Error(`Invalid progress: ${key}`);
    rows.push(SyncMutation.parse({ kind: "progress", key, deleted: false,
      payload: { status: value.status ?? null, effort: value.effort ?? null,
        daily: value.daily ?? null, note: value.note ?? null },
      changedAt: timestamp(value.at, key), mutationId: uuid() }));
  }
  for (const [subjectId, log] of Object.entries(guest.daily)) {
    if (!Array.isArray(log?.days)) throw new Error(`Invalid daily log: ${subjectId}`);
    const changedAt = timestamp(log.at, subjectId);
    for (const dayKey of new Set(log.days)) rows.push(SyncMutation.parse({
      kind: "daily", key: { subjectId, dayKey }, completed: true,
      changedAt, mutationId: uuid(),
    }));
  }
  for (const [key, value] of Object.entries(guest.ignored)) {
    rows.push(SyncMutation.parse({ kind: "ignored", key, ignored: true,
      changedAt: timestamp(value?.at, key), mutationId: uuid() }));
  }
  for (const [key, value] of Object.entries(guest.customGames)) {
    const game = CustomGame.parse(value);
    rows.push(SyncMutation.parse({ kind: "customGame", key, deleted: false, payload: game,
      changedAt: timestamp(game.updatedAt ?? game.at, key), mutationId: uuid() }));
  }
  for (const [key, value] of Object.entries(guest.customEvents)) {
    const event = CustomEvent.parse(value);
    rows.push(SyncMutation.parse({ kind: "customEvent", key, deleted: false, payload: event,
      changedAt: timestamp(event.updatedAt, key), mutationId: uuid() }));
  }
  // A v1 prefs blob has no per-key timestamps. Only a conscious choice may
  // replace cloud settings, and that choice is timestamped at confirmation.
  for (const key of PreferenceKey.options) {
    if (settings === "cloud" && cloud.preference[key] !== undefined) continue;
    const value = guest.prefs[key];
    if (value === undefined) continue;
    rows.push(SyncMutation.parse({ kind: "preference", key, value, unset: false,
      changedAt: acceptedAt, mutationId: uuid() }));
  }
  return rows;
}

export function savePlan(store: Store, profileId: string, ownerId: string, guestId: string,
  mutations: SyncMutation[]): void {
  // Persist intent before the first RPC. If a later batch/network request
  // fails, retry sends *the same* versions and IDs, never a newer blind write.
  store.setItem(planKey(profileId), JSON.stringify({ schemaVersion: 1,
    profileId, ownerId, guestId, mutations } satisfies MigrationPlan));
}

export function writeAccountCache(store: Store, profileId: string, ownerId: string,
  state: PersonalState): void {
  const keys = profileKeys(profileId);
  for (const name of ["progress", "daily", "ignored", "prefs", "customGames", "customEvents"] as const) {
    store.setItem(keys[name], JSON.stringify(state[name]));
  }
  // S5 can compare future local edits to this snapshot, including removals.
  // It must never infer an empty cloud from an absent baseline.
  store.setItem(keys.syncMeta, JSON.stringify({ schemaVersion: 1, baseline: state }));
  store.setItem(accountKey(profileId), JSON.stringify({ schemaVersion: 1, profileId,
    ownerId } satisfies AccountBinding));
  store.setItem("gacha-tracker:v2:activeProfile", profileId);
}

export async function completeFirstLogin(store: Store, profileId: string, ownerId: string,
  guestId: string, guest: PersonalState, cloud: SyncState,
  mode: "cloudOnly" | "merge", settings: SettingsChoice = "cloud",
  canActivate: () => boolean = () => true,
): Promise<void> {
  if (mode === "merge") {
    const plan = pendingPlan(store, profileId, ownerId, guestId) ??
      guestMutations(guest, settings, cloud, new Date().toISOString());
    if (pendingPlan(store, profileId, ownerId, guestId) === null) {
      savePlan(store, profileId, ownerId, guestId, plan);
    }
    await applyCloudMutations(profileId, plan);
  }
  // Pull the server's winner after conditional apply. This covers stale guest
  // rows and explicit false/deleted remote rows without local union heuristics.
  const final = await pullCloud(profileId);
  if (!canActivate()) throw new Error("Account session changed during setup; sign in again");
  writeAccountCache(store, profileId, ownerId, materializeCloud(final));
  if (mode === "merge") {
    // The binding was written last and now wins on boot. A failure cleaning up
    // a redundant plan must not turn a confirmed import into an error screen.
    try { store.setItem(planKey(profileId), "null"); } catch { /* inert plan */ }
  }
}
