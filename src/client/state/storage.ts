/**
 * localStorage access.
 *
 * S2 keeps user state on this device, scoped to a stable guest profile. The
 * original v1 keys are retained as an inert backup after migration.
 */

const NS = "gacha-tracker:v1";

export const KEYS = {
  /**
   * Superseded by `progress`, which carries a status rather than using
   * membership to mean "done". Read once to migrate; never written, never
   * deleted — see useProgress.
   */
  completions: `${NS}:completions`,
  progress: `${NS}:progress`,
  /**
   * Which game-days of a repeating event the reader has ticked off. Separate
   * from `progress` because it is a growing list per event, not one record.
   */
  daily: `${NS}:daily`,
  ignored: `${NS}:ignored`,
  prefs: `${NS}:prefs`,
  /**
   * Games and events the reader entered themselves (PRD F13).
   *
   * Two keys rather than one because they have different lifetimes: a game
   * outlives the events in it, and deleting one is refused while the other
   * still references it. After S2 migration these legacy values are backups.
   */
  customGames: `${NS}:customGames`,
  customEvents: `${NS}:customEvents`,
} as const;

const V2 = "gacha-tracker:v2";
export const PROFILE_KEYS = {
  profiles: `${V2}:profiles`,
  activeProfile: `${V2}:activeProfile`,
} as const;

export type ProfileStorageKeys = ReturnType<typeof profileKeys>;

export function profileKeys(profileId: string) {
  if (!/^(local:[a-zA-Z0-9-]+|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(profileId)) {
    throw new Error("invalid profile ID");
  }
  const prefix = `${V2}:profile:${profileId}`;
  return {
    progress: `${prefix}:progress`,
    daily: `${prefix}:daily`,
    ignored: `${prefix}:ignored`,
    prefs: `${prefix}:prefs`,
    customGames: `${prefix}:customGames`,
    customEvents: `${prefix}:customEvents`,
    syncMeta: `${prefix}:syncMeta`,
    outbox: `${prefix}:outbox`,
  } as const;
}

interface ProfileRegistry {
  schemaVersion: 2;
  guestProfileId: string;
  legacyMigrated: boolean;
}

type LocalStore = Pick<Storage, "getItem" | "setItem">;
const volatileValues = new Map<string, string>();

function readRegistry(storage: LocalStore): ProfileRegistry | null {
  try {
    const data: unknown = JSON.parse(storage.getItem(PROFILE_KEYS.profiles) ?? "null");
    if (typeof data !== "object" || data === null) return null;
    const row = data as Partial<ProfileRegistry>;
    if (row.schemaVersion !== 2 || typeof row.guestProfileId !== "string" ||
        !row.guestProfileId.startsWith("local:")) return null;
    profileKeys(row.guestProfileId);
    // A damaged/incomplete marker must not discard an existing guest cache.
    return { ...row, legacyMigrated: row.legacyMigrated === true } as ProfileRegistry;
  } catch {
    return null;
  }
}

function recoverGuestId(storage: LocalStore): string | null {
  try {
    const active = storage.getItem(PROFILE_KEYS.activeProfile);
    if (active?.startsWith("local:")) {
      profileKeys(active);
      return active;
    }
  } catch {
    // Storage access may be disabled.
  }
  return null;
}

function guestId(): string {
  // crypto.randomUUID is unavailable on some insecure local origins.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local:${crypto.randomUUID()}`;
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return `local:${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return `local:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Preserve the old completions fallback only at the one-time migration boundary. */
function legacyProgress(storage: LocalStore): string | null {
  const raw = storage.getItem(KEYS.progress);
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (typeof value === "object" && value !== null && !Array.isArray(value) &&
        Object.keys(value).length > 0) return raw;
  } catch {
    // The v1 hook would fall back to completions for unreadable progress.
  }
  const completions = storage.getItem(KEYS.completions);
  try {
    const value: unknown = JSON.parse(completions ?? "null");
    if (typeof value !== "object" || value === null || Array.isArray(value)) return raw;
    const progress = Object.fromEntries(Object.entries(value).flatMap(([id, mark]) =>
      typeof mark === "object" && mark !== null && typeof (mark as { at?: unknown }).at === "string"
        ? [[id, { status: "done", at: (mark as { at: string }).at }]] : []));
    return Object.keys(progress).length > 0 ? JSON.stringify(progress) : raw;
  } catch {
    return raw;
  }
}

/** Copy only missing v2 stores. A partial/retried migration never overwrites v2 edits. */
function migrateLegacy(storage: LocalStore, keys: ProfileStorageKeys): boolean {
  for (const name of ["progress", "daily", "ignored", "prefs", "customGames", "customEvents"] as const) {
    if (storage.getItem(keys[name]) !== null) continue;
    const legacy = name === "progress" ? legacyProgress(storage) : storage.getItem(KEYS[name]);
    if (legacy !== null) storage.setItem(keys[name], legacy);
  }
  return true;
}

/** Synchronous boot, before any user-owned React hook reads or writes storage. */
export function bootstrapLocalProfile(storage: LocalStore = localStorage): {
  profileId: string; keys: ProfileStorageKeys;
} {
  const existing = readRegistry(storage);
  const registry = existing ?? {
    schemaVersion: 2 as const, guestProfileId: recoverGuestId(storage) ?? guestId(), legacyMigrated: false,
  };
  const keys = profileKeys(registry.guestProfileId);
  try {
    // Persist identity before copying: a failed migration retries into the same
    // profile rather than minting a new one and hiding partially copied data.
    if (existing === null) storage.setItem(PROFILE_KEYS.profiles, JSON.stringify(registry));
    if (!registry.legacyMigrated && migrateLegacy(storage, keys)) {
      storage.setItem(PROFILE_KEYS.profiles,
        JSON.stringify({ ...registry, legacyMigrated: true } satisfies ProfileRegistry));
    }
    // S2 has no auth/session. A cached account profile must stay inactive in
    // signed-out mode; S4 will resolve a session before activating one.
    if (storage.getItem(PROFILE_KEYS.activeProfile) !== registry.guestProfileId) {
      storage.setItem(PROFILE_KEYS.activeProfile, registry.guestProfileId);
    }
    for (const name of ["progress", "daily", "ignored", "prefs", "customGames", "customEvents"] as const) {
      volatileValues.delete(keys[name]);
    }
  } catch {
    // If a write failed halfway through migration, keep *all* stores readable
    // in memory. React must not mount with empty defaults and overwrite a
    // partially copied v2 store. The original v1 keys remain the durable copy.
    for (const name of ["progress", "daily", "ignored", "prefs", "customGames", "customEvents"] as const) {
      try {
        const value = storage.getItem(keys[name]) ??
          (name === "progress" ? legacyProgress(storage) : storage.getItem(KEYS[name]));
        if (value !== null) volatileValues.set(keys[name], value);
      } catch {
        // Storage completely unavailable; the affected store uses defaults.
      }
    }
  }
  return { profileId: registry.guestProfileId, keys };
}

/**
 * Reads never throw. A corrupt or foreign value falls back to the default
 * rather than taking the app down — losing a preference is recoverable, a blank
 * screen is not.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = volatileValues.get(key) ?? localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

let accountWriter: ((key: string, value: unknown) => boolean) | undefined;
/** Installed by the account module; guest and legacy writes keep their path. */
export function registerAccountWriter(writer: (key: string, value: unknown) => boolean): void {
  accountWriter = writer;
}

/** Cloud convergence updates the scoped stores without feeding them back into
 * the ordinary local mutation path. Existing hooks refresh from those stores. */
export function subscribeRemote(key: string, refresh: () => void): () => void {
  const listener = (event: Event) => {
    const profileId = (event as CustomEvent<string>).detail;
    if (key.startsWith(`gacha-tracker:v2:profile:${profileId}:`)) refresh();
  };
  window.addEventListener("account-sync-remote-change", listener);
  return () => window.removeEventListener("account-sync-remote-change", listener);
}

export function writeJson(key: string, value: unknown): void {
  try {
    if (accountWriter?.(key, value)) return;
    if (volatileValues.has(key)) {
      volatileValues.set(key, JSON.stringify(value));
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled (private mode). The UI keeps working
    // from in-memory state; only persistence is lost.
  }
}
