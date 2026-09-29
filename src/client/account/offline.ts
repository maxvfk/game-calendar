import { profileKeys } from "../state/storage.ts";
import { readAccountBinding } from "./firstLogin.ts";
import { SUPABASE_SESSION_KEY, SUPABASE_URL } from "./remote.ts";

type Store = Pick<Storage, "length" | "key" | "getItem" | "setItem">;
type SessionIdentity = { access_token: string; user: { id: string; email?: string }; expires_at?: number };

/** The cached user object alone is not identity evidence. Match it to the
 * locally available, unexpired access token before selecting any cache. This
 * is only permission to read local data; cloud writes still need getUser(). */
export function localSessionOwner(session: SessionIdentity | null): string | null {
  try {
    if (!session?.access_token || !session.user?.id) return null;
    const parts = session.access_token.split(".");
    if (parts.length !== 3) return null;
    const encoded = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded)) as { sub?: unknown; exp?: unknown; iss?: unknown };
    if (payload.iss !== `${SUPABASE_URL}/auth/v1` ||
        payload.sub !== session.user.id || typeof payload.exp !== "number" ||
        payload.exp * 1000 <= Date.now() ||
        (session.expires_at !== undefined && session.expires_at * 1000 <= Date.now())) return null;
    return session.user.id;
  } catch { return null; }
}

/** A retry may fail after Auth has removed/replaced its stored session.
 * Never keep the old account visible solely because an earlier token matched. */
export function storedSessionOwner(store: Pick<Storage, "getItem">): string | null {
  try {
    const raw = store.getItem(SUPABASE_SESSION_KEY);
    return raw === null ? null : localSessionOwner(JSON.parse(raw) as SessionIdentity);
  } catch { return null; }
}

/** S4 has a single default profile. If multiple bindings claim this owner,
 * there is no safe local default to pick; the online resolver must decide. */
export function localBoundProfile(store: Store, ownerId: string): string | null {
  const matches: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      const match = /^gacha-tracker:v2:profile:([0-9a-f-]{36}):syncMeta:account$/i.exec(key ?? "");
      if (!match) continue;
      const profileId = match[1]!;
      profileKeys(profileId);
      if (readAccountBinding(store, profileId, ownerId)) matches.push(profileId);
      if (matches.length > 1) return null;
    }
  } catch { return null; }
  return matches.length === 1 ? matches[0]! : null;
}
