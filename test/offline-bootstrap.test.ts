import { describe, expect, spyOn, test } from "bun:test";
import { applyMutation, emptySyncState, type SyncState } from "../src/shared/sync.ts";
import { resolveAccount } from "../src/client/account/AuthRoot.tsx";
import { startAuthBootstrap, watchAuthReconnect } from "../src/client/account/bootstrap.ts";
import { writeAccountCache } from "../src/client/account/firstLogin.ts";
import { captureAccountWrite, initializeAccountProfile, readOutbox } from "../src/client/account/localSync.ts";
import { localBoundProfile, localSessionOwner } from "../src/client/account/offline.ts";
import { readPersonalState, supabase, SUPABASE_SESSION_KEY, SUPABASE_URL } from "../src/client/account/remote.ts";
import { syncProfile } from "../src/client/account/syncEngine.ts";
import { profileKeys } from "../src/client/state/storage.ts";
import { defaults } from "../src/client/state/usePrefs.ts";

class Store {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const profile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherProfile = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const owner = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherOwner = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const guest = { profileId: "local:offline-test", keys: profileKeys("local:offline-test") };
const blank = () => ({ progress: {}, daily: {}, ignored: {}, prefs: defaults(),
  customGames: {}, customEvents: {} });
function session(id = owner, issuer = `${SUPABASE_URL}/auth/v1`) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ sub: id, iss: issuer, exp }))}.signature`;
  return { access_token: token, expires_at: exp, user: { id, email: `${id}@example.test` } };
}
function established() {
  const store = new Store();
  writeAccountCache(store, profile, owner, blank());
  initializeAccountProfile(store, profile, owner);
  store.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session()));
  return store;
}
async function environment(store: Store, offline: boolean, task: (nav: { onLine: boolean }) => Promise<void>) {
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const nav = { onLine: !offline };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: store });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: nav });
  try { await task(nav); }
  finally {
    if (priorStorage) Object.defineProperty(globalThis, "localStorage", priorStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
    if (priorNavigator) Object.defineProperty(globalThis, "navigator", priorNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe("S5.1 offline account lifecycle", () => {
  test("matching cached identity opens the bound account offline and replays the exact pending mutation", async () => {
    const store = established();
    const keys = profileKeys(profile);
    captureAccountWrite(store, profile, "progress", { "opaque:event": {
      status: "done", at: "2026-09-29T10:00:00.000Z" } });
    const before = readOutbox(store, keys);
    const getSession = spyOn(supabase.auth, "getSession").mockResolvedValue(
      { data: { session: session() }, error: null } as never);
    const getUser = spyOn(supabase.auth, "getUser").mockImplementation(async () => {
      throw new Error("getUser must not be called offline");
    });
    try {
      await environment(store, true, async () => {
        const first = await resolveAccount(guest, () => true);
        const reloaded = await resolveAccount(guest, () => true);
        expect(first).toMatchObject({ kind: "account", profileId: profile, ownerId: owner,
          offline: true });
        expect(reloaded).toMatchObject(first);
        expect(readPersonalState(keys, store).progress["opaque:event"]?.status).toBe("done");
        expect(readOutbox(store, keys)).toEqual(before);
        expect(store.getItem("gacha-tracker:v2:activeProfile")).toBe(profile);
        expect(getUser).not.toHaveBeenCalled();
      });
    } finally { getSession.mockRestore(); getUser.mockRestore(); }
  });

  test("sign-out, another user, missing or ambiguous identity fail closed", async () => {
    const store = established();
    await environment(store, true, async () => {
      const getSession = spyOn(supabase.auth, "getSession");
      try {
        getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
        expect((await resolveAccount(guest, () => true)).kind).toBe("guest");
        writeAccountCache(store, otherProfile, otherOwner, blank());
        store.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session(otherOwner)));
        getSession.mockResolvedValue({ data: { session: session(otherOwner) }, error: null } as never);
        expect(await resolveAccount(guest, () => true)).toMatchObject({
          kind: "account", profileId: otherProfile, ownerId: otherOwner, offline: true });
        getSession.mockResolvedValue({ data: { session: { ...session(), access_token: "broken" } },
          error: null } as never);
        expect((await resolveAccount(guest, () => true)).kind).toBe("guest");
        getSession.mockResolvedValue({ data: { session: session() }, error: null } as never);
        store.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session()));
        writeAccountCache(store, otherProfile, owner, blank());
        expect(localBoundProfile(store, owner)).toBeNull();
        expect((await resolveAccount(guest, () => true)).kind).toBe("guest");
        expect(localSessionOwner(session(owner, "https://foreign.example/auth/v1"))).toBeNull();
      } finally { getSession.mockRestore(); }
    });
  });

  test("fetch failure with navigator online permits only matching cached owner, never an auth rejection", async () => {
    const store = established();
    const getSession = spyOn(supabase.auth, "getSession").mockResolvedValue(
      { data: { session: session() }, error: null } as never);
    const getUser = spyOn(supabase.auth, "getUser");
    try {
      await environment(store, false, async () => {
        getUser.mockResolvedValue({ data: { user: null },
          error: new TypeError("Failed to fetch") } as never);
        expect(await resolveAccount(guest, () => true)).toMatchObject({
          kind: "account", profileId: profile, offline: true });
        getUser.mockResolvedValue({ data: { user: null },
          error: { status: 401, name: "AuthApiError", message: "Invalid JWT" } } as never);
        await expect(resolveAccount(guest, () => true)).rejects.toMatchObject({ status: 401 });
      });
    } finally { getSession.mockRestore(); getUser.mockRestore(); }
  });

  test("online event re-verifies the same owner, then flushes the offline journal to a second device", async () => {
    const store = established();
    const keys = profileKeys(profile);
    captureAccountWrite(store, profile, "progress", { "opaque:event": {
      status: "doing", at: "2026-09-29T10:00:00.000Z" } });
    const pending = readOutbox(store, keys);
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" as const });
    const getSession = spyOn(supabase.auth, "getSession").mockResolvedValue(
      { data: { session: session() }, error: null } as never);
    const getUser = spyOn(supabase.auth, "getUser").mockResolvedValue(
      { data: { user: { id: owner, email: "owner@example.test" } }, error: null } as never);
    const rpc = spyOn(supabase, "rpc").mockResolvedValue({ data: profile, error: null } as never);
    const from = spyOn(supabase, "from").mockReturnValue({ select: () => ({
      eq: () => ({ single: async () => ({ data: { owner_id: owner }, error: null }) }),
    }) } as never);
    try {
      await environment(store, true, async (nav) => {
        const states: Array<{ kind: string; offline?: boolean }> = [];
        let recover = false;
        const bootstrap = startAuthBootstrap({
          prepare: async () => null,
          resolve: (active) => resolveAccount(guest, active),
          loading: () => {},
          publish: (value) => { states.push(value); recover = value.kind === "account" &&
            value.offline === true; },
          fallback: () => { throw new Error("unexpected fallback"); },
          sessionChanged: () => {}, callbackError: () => {},
        });
        const stopReconnect = watchAuthReconnect(bootstrap.retry, () => recover,
          win, doc, () => nav.onLine);
        try {
          bootstrap.onAuth("INITIAL_SESSION", session());
          await flush();
          expect(states.at(-1)).toMatchObject({ kind: "account", offline: true });
          expect(readOutbox(store, keys)).toEqual(pending);
          nav.onLine = true;
          win.dispatchEvent(new Event("online"));
          await flush();
          expect(states.at(-1)).toMatchObject({ kind: "account", profileId: profile });
          expect(states.at(-1)?.offline).toBeUndefined();
          expect(getUser).toHaveBeenCalled();
          let remote: SyncState = emptySyncState();
          const transport = { authenticate: async () => owner,
            pull: async () => remote,
            push: async (_id: string, rows: typeof pending) => {
              for (const row of rows) remote = applyMutation(remote, row).state;
            } };
          await syncProfile(store, profile, owner, () => true, transport);
          expect(readOutbox(store, keys)).toEqual([]);
          expect(remote.progress["opaque:event"]?.payload?.status).toBe("doing");
          expect(remote.progress["opaque:event"]?.mutationId).toBe(pending[0]?.mutationId);
          const second = established();
          await syncProfile(second, profile, owner, () => true, transport);
          expect(readPersonalState(keys, second).progress["opaque:event"]?.status).toBe("doing");
        } finally { stopReconnect(); bootstrap.stop(); }
      });
    } finally { getSession.mockRestore(); getUser.mockRestore(); rpc.mockRestore(); from.mockRestore(); }
  });

  test("guest fallback after unavailable offline identity recovers automatically on reconnect", async () => {
    const store = established();
    let hasSession = false;
    const getSession = spyOn(supabase.auth, "getSession").mockImplementation(async () =>
      ({ data: { session: hasSession ? session() : null }, error: null }) as never);
    const getUser = spyOn(supabase.auth, "getUser").mockResolvedValue(
      { data: { user: { id: owner, email: "owner@example.test" } }, error: null } as never);
    const rpc = spyOn(supabase, "rpc").mockResolvedValue({ data: profile, error: null } as never);
    const from = spyOn(supabase, "from").mockReturnValue({ select: () => ({
      eq: () => ({ single: async () => ({ data: { owner_id: owner }, error: null }) }),
    }) } as never);
    try {
      await environment(store, true, async (nav) => {
        const states: Array<{ kind: string; profileId?: string }> = [];
        let recover = false;
        const bootstrap = startAuthBootstrap({
          prepare: async () => null, resolve: (active) => resolveAccount(guest, active),
          loading: () => {}, publish: (value) => {
            states.push(value.kind === "account" ? { kind: value.kind, profileId: value.profileId } :
              { kind: value.kind });
            recover = value.kind === "guest" && value.retryOnline === true;
          }, fallback: () => { throw new Error("unexpected fallback"); },
          sessionChanged: () => {}, callbackError: () => {},
        });
        const win = new EventTarget();
        const doc = Object.assign(new EventTarget(), { visibilityState: "visible" as const });
        const stopReconnect = watchAuthReconnect(bootstrap.retry, () => recover,
          win, doc, () => nav.onLine);
        try {
          bootstrap.onAuth("INITIAL_SESSION", null);
          await flush();
          expect(states.at(-1)?.kind).toBe("guest");
          hasSession = true;
          nav.onLine = true;
          win.dispatchEvent(new Event("online"));
          await flush();
          expect(states.at(-1)).toEqual({ kind: "account", profileId: profile });
          expect(recover).toBe(false);
        } finally { stopReconnect(); bootstrap.stop(); }
      });
    } finally { getSession.mockRestore(); getUser.mockRestore(); rpc.mockRestore(); from.mockRestore(); }
  });

  test("account switch invalidates offline resolver; explicit sign-out blocks reconnect retry", async () => {
    const store = established();
    writeAccountCache(store, otherProfile, otherOwner, blank());
    let unblock!: () => void;
    const delayed = new Promise<void>((resolve) => { unblock = resolve; });
    const getSession = spyOn(supabase.auth, "getSession")
      .mockImplementationOnce(async () => { await delayed; return { data: { session: session(owner) }, error: null } as never; })
      .mockResolvedValue({ data: { session: session(otherOwner) }, error: null } as never);
    try {
      await environment(store, true, async () => {
        const published: string[] = [];
        let recover = false;
        const bootstrap = startAuthBootstrap({
          prepare: async () => null, resolve: (active) => resolveAccount(guest, active),
          loading: () => {}, publish: (value) => {
            published.push(value.kind === "account" ? value.profileId : value.kind);
            recover = value.kind === "account" && value.offline === true;
          }, fallback: () => { published.push("guest"); recover = false; },
          sessionChanged: () => { recover = false; }, callbackError: () => {},
        });
        bootstrap.onAuth("INITIAL_SESSION", session(owner));
        await flush();
        store.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session(otherOwner)));
        bootstrap.onAuth("SIGNED_IN", session(otherOwner));
        await flush();
        unblock();
        await flush();
        expect(published).toEqual([otherProfile]);
        store.values.delete(SUPABASE_SESSION_KEY);
        getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
        bootstrap.onAuth("SIGNED_OUT", null);
        expect(published.at(-1)).toBe("guest");
        expect(recover).toBe(false);
        const win = new EventTarget();
        const doc = Object.assign(new EventTarget(), { visibilityState: "visible" as const });
        const stopReconnect = watchAuthReconnect(bootstrap.retry, () => recover,
          win, doc, () => true);
        win.dispatchEvent(new Event("online"));
        await flush();
        expect(published.at(-1)).toBe("guest");
        expect(published).toHaveLength(2);
        stopReconnect();
        bootstrap.stop();
      });
    } finally { getSession.mockRestore(); }
  });
});
