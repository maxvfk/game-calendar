import { compareVersions, logicalKey, mergeSyncState, type SyncMutation, type SyncState } from "../../shared/sync.ts";
import { flushSync } from "react-dom";
import { profileKeys } from "../state/storage.ts";
import { readAccountBinding } from "./firstLogin.ts";
import {
  initializeAccountProfile, LOCAL_CHANGE, readOutbox, readSyncMeta, REMOTE_CHANGE,
  stateFromOutbox, writeSnapshot, type SyncMeta,
} from "./localSync.ts";
import { applyCloudMutations, materializeCloud, pullCloud, supabase } from "./remote.ts";

type Store = Pick<Storage, "getItem" | "setItem">;
export type SyncStatus = { kind: "syncing" | "synced" | "pending" | "offline" |
  "error" | "auth" | "schema"; pending: number; lastSuccessfulSyncAt?: string;
  message?: string; clockWarning?: boolean };

function confirmed(remote: SyncState, row: SyncMutation): boolean {
  const winner = remote[row.kind][logicalKey(row)];
  return winner !== undefined && compareVersions(winner, row) >= 0;
}

/** Pure finalization rule: a newer remote version beats an offline old edit;
 * an unconfirmed edit stays in the outbox and visible local view. */
export function reconcile(remote: SyncState, pending: SyncMutation[]) {
  const remaining = pending.filter((row) => !confirmed(remote, row));
  return { remaining, state: mergeSyncState(remote, stateFromOutbox(remaining)) };
}

export async function syncProfile(store: Store, profileId: string, ownerId: string,
  active: () => boolean, transport: {
    authenticate: () => Promise<string>;
    pull: (id: string, inspect?: (row: Record<string, unknown>) => void) => Promise<SyncState>;
    push: (id: string, rows: SyncMutation[]) => Promise<void>;
  } = {
    authenticate: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (error.status === 401 || error.status === 403 ||
            error.name === "AuthSessionMissingError") throw new Error("Sign in again to sync");
        throw error; // A network/Auth outage is retried, not mislabeled expiry.
      }
      if (!data.user) throw new Error("Sign in again to sync");
      return data.user.id;
    },
    pull: pullCloud, push: applyCloudMutations,
  }): Promise<{ pending: number; clockWarning: boolean; at: string }> {
  const ensureActive = () => {
    if (!active() || !readAccountBinding(store, profileId, ownerId)) {
      throw new Error("Account session changed during sync");
    }
  };
  const keys = profileKeys(profileId);
  ensureActive();
  // The controller replays a v2 journal once before mounting the UI. Direct
  // cycle callers still upgrade S4 metadata, without resetting a live view on
  // each foreground pull.
  let rawMeta: { schemaVersion?: number } | null;
  try { rawMeta = JSON.parse(store.getItem(keys.syncMeta) ?? "null") as typeof rawMeta; }
  catch { throw new Error("Sync metadata is incompatible; export a backup"); }
  if (rawMeta?.schemaVersion === 1) initializeAccountProfile(store, profileId, ownerId);
  const meta = readSyncMeta(store, keys);
  let clockWarning = false;
  const inspectClock = (row: Record<string, unknown>) => {
    const changed = Date.parse(String(row.changed_at));
    const received = Date.parse(String(row.received_at));
    if (Number.isFinite(changed) &&
        (changed > Date.now() + 5 * 60_000 ||
          (Number.isFinite(received) && changed > received + 5 * 60_000))) {
      clockWarning = true;
    }
  };
  store.setItem(keys.syncMeta, JSON.stringify({ ...meta,
    lastAttemptAt: new Date().toISOString() } satisfies SyncMeta));
  const userId = await transport.authenticate();
  ensureActive();
  if (userId !== ownerId) throw new Error("Account session changed during sync");
  const before = await transport.pull(profileId, inspectClock);
  ensureActive();
  // Commit a click queued by React before reading the journal or replacing
  // the cached snapshot. Hook layout effects write its outbox first.
  if (typeof window !== "undefined") flushSync(() => {});
  const pulledPending = readOutbox(store, keys);
  const prePushState = mergeSyncState(before, stateFromOutbox(pulledPending));
  store.setItem(keys.syncMeta, JSON.stringify({ ...meta, baseline: before,
    lastAttemptAt: new Date().toISOString() } satisfies SyncMeta));
  if (writeSnapshot(store, keys, materializeCloud(prePushState)) && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REMOTE_CHANGE, { detail: profileId }));
  }
  const sent = readOutbox(store, keys);
  if (sent.length) await transport.push(profileId, sent);
  ensureActive();
  const remote = sent.length ? await transport.pull(profileId, inspectClock) : before;
  ensureActive();
  if (typeof window !== "undefined") flushSync(() => {});
  // A user may have edited while the network request was in flight. Include
  // those newer mutations even if they were not in the sent batch.
  const latest = readOutbox(store, keys);
  const { remaining, state } = reconcile(remote, latest);
  const at = new Date().toISOString();
  const nextMeta: SyncMeta = { ...meta, schemaVersion: 2, baseline: remote,
    lastAttemptAt: at, lastSuccessfulSyncAt: at };
  delete nextMeta.lastError;
  // Journal baseline first. A crash before cache/outbox updates is repaired
  // by startup replay; it cannot turn an unconfirmed mutation into a loss.
  store.setItem(keys.syncMeta, JSON.stringify(nextMeta));
  store.setItem(keys.outbox, JSON.stringify(remaining));
  const changed = writeSnapshot(store, keys, materializeCloud(state));
  if (changed && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REMOTE_CHANGE, { detail: profileId }));
  }
  clockWarning ||= Object.values(remote).some((bucket) =>
    Object.values(bucket).some((row) => Date.parse(row.changedAt) > Date.now() + 5 * 60_000));
  return { pending: remaining.length, clockWarning, at };
}

/** One controller per active, verified profile. No network work survives an
 * account switch; offline edits continue to persist in that profile's outbox. */
export function startProfileSync(profileId: string, ownerId: string,
  active: () => boolean, publish: (status: SyncStatus) => void,
  store: Store = localStorage,
  cycle: typeof syncProfile = syncProfile) {
  const keys = profileKeys(profileId);
  let stopped = false;
  let running = false;
  let again = false;
  let failures = 0;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let status: SyncStatus = { kind: "pending", pending: 0 };
  const count = () => { try { return readOutbox(store, keys).length; } catch { return 0; } };
  const emit = (next: SyncStatus) => { status = next; if (!stopped) publish(next); };
  const schedule = (ms: number) => {
    if (stopped) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; void run(); }, ms);
  };
  async function run() {
    if (stopped || !active()) return;
    if (running) { again = true; return; }
    if (navigator.onLine === false) {
      emit({ ...status, kind: "offline", pending: count() });
      return;
    }
    running = true;
    emit({ ...status, kind: "syncing", pending: count() });
    const ticket = ++attempt;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        cycle(store, profileId, ownerId, () => !stopped && active() && ticket === attempt),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => {
          attempt++; reject(new Error("Sync timed out"));
        }, 20_000); }),
      ]);
      if (stopped || !active()) return;
      failures = 0;
      emit({ kind: result.pending ? "pending" : "synced", pending: result.pending,
        lastSuccessfulSyncAt: result.at, clockWarning: result.clockWarning });
      if (result.pending) schedule(1500);
    } catch (error) {
      if (stopped || !active()) return;
      const message = error instanceof Error ? error.message : String(error);
      const kind = /sign in again|session changed/i.test(message) ? "auth" :
        /metadata|baseline|schema|invalid sync/i.test(message) ? "schema" : "error";
      emit({ ...status, kind, message, pending: count() });
      try {
        const meta = readSyncMeta(store, keys);
        store.setItem(keys.syncMeta, JSON.stringify({ ...meta,
          lastAttemptAt: new Date().toISOString(), lastError: message } satisfies SyncMeta));
      } catch { /* Incompatible metadata stays untouched. */ }
      if (kind === "error") schedule(Math.min(60_000, 2000 * 2 ** Math.min(failures++, 5)));
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      running = false;
      if (again && !stopped) { again = false; schedule(0); }
    }
  }
  const onLocal = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (detail !== profileId &&
        !(typeof detail === "object" && detail !== null &&
          (detail as { profileId?: string }).profileId === profileId)) return;
    if (typeof detail === "object") {
      emit({ ...status, kind: "error", pending: count(),
        message: (detail as { error: string }).error });
      return;
    }
    emit({ ...status, kind: navigator.onLine === false ? "offline" : "pending",
      pending: count() });
    schedule(700);
  };
  const onForeground = () => { if (document.visibilityState === "visible") schedule(0); };
  const onOnline = () => schedule(0);
  window.addEventListener(LOCAL_CHANGE, onLocal);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onForeground);
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") schedule(0);
  }, 5 * 60_000);
  try {
    initializeAccountProfile(store, profileId, ownerId);
    const last = readSyncMeta(store, keys).lastSuccessfulSyncAt;
    emit({ kind: navigator.onLine === false ? "offline" : "pending", pending: count(),
      ...(last === undefined ? {} : { lastSuccessfulSyncAt: last }) });
    schedule(0);
  } catch (error) {
    emit({ kind: "schema", pending: 0,
      message: error instanceof Error ? error.message : String(error) });
  }
  return {
    retry: () => schedule(0),
    stop: () => {
      stopped = true;
      attempt++;
      if (timer !== undefined) clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener(LOCAL_CHANGE, onLocal);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onForeground);
    },
  };
}
