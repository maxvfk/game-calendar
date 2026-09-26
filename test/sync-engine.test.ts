import { describe, expect, test } from "bun:test";
import { applyMutation, emptySyncState, type SyncMutation, type SyncState } from "../src/shared/sync.ts";
import { writeAccountCache } from "../src/client/account/firstLogin.ts";
import {
  captureAccountWrite, diffStore, initializeAccountProfile, readOutbox,
  readSyncMeta,
} from "../src/client/account/localSync.ts";
import { readPersonalState, type PersonalState } from "../src/client/account/remote.ts";
import { reconcile, startProfileSync, syncProfile } from "../src/client/account/syncEngine.ts";
import { profileKeys, writeJson } from "../src/client/state/storage.ts";
import { defaults } from "../src/client/state/usePrefs.ts";
import { mergeProgress } from "../src/client/state/useProgress.ts";

class Store {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const profile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const owner = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const keys = profileKeys(profile);
const at = "2026-09-20T12:00:00.000Z";
const blank = (): PersonalState => ({ progress: {}, daily: {}, ignored: {}, prefs: defaults(),
  customGames: {}, customEvents: {} });
function device() {
  const store = new Store();
  writeAccountCache(store, profile, owner, blank());
  initializeAccountProfile(store, profile, owner);
  return store;
}
function server() {
  let state = emptySyncState();
  const sent: SyncMutation[][] = [];
  return {
    sent,
    state: () => state,
    transport: {
      authenticate: async () => owner,
      pull: async () => state,
      push: async (_id: string, rows: SyncMutation[]) => {
        sent.push(rows);
        for (const row of rows) state = applyMutation(state, row).state;
      },
    },
  };
}

describe("S5 durable local-first sync", () => {
  test("all stores produce keyed mutations, explicit reversals and tombstones", () => {
    const store = device();
    const game = { id: "mygame:mine", name: "Mine", hue: "#123456", at };
    const event = { id: "myevent:abcdefghij", game: game.id, title: "Own",
      type: "other", summary: null, startsAt: at, startPrecision: "day",
      endsAt: null, endPrecision: "unknown", repeat: null, at, updatedAt: at };
    captureAccountWrite(store, profile, "progress", { "opaque:event": { status: "done", at } });
    captureAccountWrite(store, profile, "daily", { "dailies:zzz": { days: ["2026-09-20"], at } });
    captureAccountWrite(store, profile, "ignored", { "opaque:ignored": { at } });
    captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
    captureAccountWrite(store, profile, "customGames", { [game.id]: game });
    captureAccountWrite(store, profile, "customEvents", { [event.id]: event });
    const first = readOutbox(store, keys);
    expect(new Set(first.map((row) => row.kind))).toEqual(new Set([
      "progress", "daily", "ignored", "preference", "customGame", "customEvent",
    ]));
    captureAccountWrite(store, profile, "progress", {});
    captureAccountWrite(store, profile, "daily", {});
    captureAccountWrite(store, profile, "ignored", {});
    captureAccountWrite(store, profile, "customGames", {});
    captureAccountWrite(store, profile, "customEvents", {});
    const pending = readOutbox(store, keys);
    expect(pending.find((row) => row.kind === "progress")).toMatchObject({ deleted: true, payload: null });
    expect(pending.find((row) => row.kind === "daily")).toMatchObject({ completed: false });
    expect(pending.find((row) => row.kind === "ignored")).toMatchObject({ ignored: false });
    expect(pending.find((row) => row.kind === "customGame")).toMatchObject({ deleted: true });
    expect(pending.find((row) => row.kind === "customEvent")).toMatchObject({ deleted: true });
    expect(pending.find((row) => row.kind === "progress")?.mutationId)
      .not.toBe(first.find((row) => row.kind === "progress")?.mutationId);
  });

  test("S4 cache changes migrate once, and a crash replays durable outbox", () => {
    const store = new Store();
    writeAccountCache(store, profile, owner, blank());
    store.setItem(keys.customGames, JSON.stringify({ "mygame:old": {
      id: "mygame:old", name: "Renamed", hue: "#abcdef", at,
      updatedAt: "2026-09-21T12:00:00.000Z" } }));
    initializeAccountProfile(store, profile, owner);
    const rows = readOutbox(store, keys);
    expect(readSyncMeta(store, keys).baseline).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "customGame", key: "mygame:old",
      changedAt: "2026-09-21T12:00:00.000Z" });
    initializeAccountProfile(store, profile, owner);
    expect(readOutbox(store, keys)).toEqual(rows);
    // Outbox-first crash: the cache write was lost, but the edit survives.
    store.setItem(keys.customGames, "{}");
    initializeAccountProfile(store, profile, owner);
    expect(readPersonalState(keys, store).customGames["mygame:old"]?.name).toBe("Renamed");
  });

  test("two devices converge after offline conflicts, per-key prefs and an import", async () => {
    const a = device(), b = device(), cloud = server();
    captureAccountWrite(a, profile, "progress", { "opaque:event": { status: "done", at } });
    captureAccountWrite(a, profile, "prefs", { ...defaults(), theme: "light" });
    captureAccountWrite(a, profile, "customGames", { "mygame:smoke": {
      id: "mygame:smoke", name: "Smoke", hue: "#123456", at } });
    // Import all reaches the same write path as any edit, one logical key at a time.
    const imported = { ...defaults(), region: "asia" as const };
    captureAccountWrite(b, profile, "prefs", imported);
    captureAccountWrite(b, profile, "progress", { "opaque:event": { status: "doing", at } });
    await syncProfile(a, profile, owner, () => true, cloud.transport);
    await syncProfile(b, profile, owner, () => true, cloud.transport);
    await syncProfile(a, profile, owner, () => true, cloud.transport);
    await syncProfile(b, profile, owner, () => true, cloud.transport);
    expect(readOutbox(a, keys)).toEqual([]);
    expect(readOutbox(b, keys)).toEqual([]);
    const x = readPersonalState(keys, a), y = readPersonalState(keys, b);
    expect(x).toEqual(y);
    expect(x.prefs.theme).toBe("light");
    expect(x.prefs.region).toBe("asia");
    expect(x.customGames["mygame:smoke"]?.name).toBe("Smoke");
    expect(x.progress["opaque:event"]?.status).toBe(
      cloud.state().progress["opaque:event"]?.payload?.status ?? undefined);
  });

  test("a second device's daily uncheck, unignore and custom deletion converge", async () => {
    const a = device(), b = device(), cloud = server();
    const game = { id: "mygame:mine", name: "Mine", hue: "#abcdef", at };
    captureAccountWrite(a, profile, "daily", { "dailies:zzz": { days: ["2026-09-20"], at } });
    captureAccountWrite(a, profile, "ignored", { "opaque:event": { at } });
    captureAccountWrite(a, profile, "customGames", { [game.id]: game });
    await syncProfile(a, profile, owner, () => true, cloud.transport);
    await syncProfile(b, profile, owner, () => true, cloud.transport);
    expect(readPersonalState(keys, b).customGames[game.id]?.name).toBe("Mine");
    captureAccountWrite(b, profile, "daily", {});
    captureAccountWrite(b, profile, "ignored", {});
    captureAccountWrite(b, profile, "customGames", {});
    await syncProfile(b, profile, owner, () => true, cloud.transport);
    await syncProfile(a, profile, owner, () => true, cloud.transport);
    expect(readPersonalState(keys, a).daily).toEqual({});
    expect(readPersonalState(keys, a).ignored).toEqual({});
    expect(readPersonalState(keys, a).customGames).toEqual({});
    expect(readOutbox(a, keys)).toEqual([]);
    expect(readOutbox(b, keys)).toEqual([]);
    expect(cloud.state().daily[JSON.stringify(["dailies:zzz", "2026-09-20"])]?.completed).toBe(false);
    expect(cloud.state().ignored["opaque:event"]?.ignored).toBe(false);
    expect(cloud.state().customGame[game.id]?.deleted).toBe(true);
  });

  test("existing hook writes, including import merge, enter the same durable outbox", () => {
    const store = device();
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: store });
    Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
    try {
      writeJson(keys.progress, { "imported:opaque": { status: "done", at } });
      expect(readOutbox(store, keys)).toMatchObject([{ kind: "progress",
        key: "imported:opaque", deleted: false }]);
      expect(readPersonalState(keys, store).progress["imported:opaque"]?.status).toBe("done");
    } finally {
      if (previousStorage) Object.defineProperty(globalThis, "localStorage", previousStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });

  test("an imported opaque progress ID stays data through the local sync path", () => {
    const store = device();
    const incoming = JSON.parse('{"__proto__":{"status":"done","at":"2026-09-20T12:00:00.000Z"}}');
    const merged = mergeProgress({}, incoming);
    expect(Object.hasOwn(merged, "__proto__")).toBe(true);
    captureAccountWrite(store, profile, "progress", merged);
    expect(readOutbox(store, keys).find((row) => row.kind === "progress")?.key).toBe("__proto__");
    expect(Object.prototype).not.toHaveProperty("status");
  });

  test("failed acknowledgement keeps exact IDs for replay; a new in-flight edit stays pending", async () => {
    const store = device(), cloud = server();
    captureAccountWrite(store, profile, "ignored", { "opaque:event": { at } });
    const first = readOutbox(store, keys);
    await expect(syncProfile(store, profile, owner, () => true, {
      ...cloud.transport,
      push: async (id, rows) => { await cloud.transport.push(id, rows); throw new Error("connection lost"); },
    })).rejects.toThrow("connection lost");
    expect(readOutbox(store, keys)).toEqual(first);
    await syncProfile(store, profile, owner, () => true, {
      ...cloud.transport,
      push: async (id, rows) => {
        expect(rows).toEqual(first);
        await cloud.transport.push(id, rows);
        captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
      },
    });
    expect(readOutbox(store, keys)).toHaveLength(1);
    expect(readOutbox(store, keys)[0]?.kind).toBe("preference");
    await syncProfile(store, profile, owner, () => true, cloud.transport);
    expect(readOutbox(store, keys)).toEqual([]);
  });

  test("a future cloud clock does not date a fresh local edit in the future", () => {
    const store = device();
    const future = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    const row = { kind: "ignored", key: "opaque:event", ignored: true,
      changedAt: future, mutationId: crypto.randomUUID() } as SyncMutation;
    store.setItem(keys.syncMeta, JSON.stringify({ schemaVersion: 2,
      baseline: applyMutation(emptySyncState(), row).state }));
    store.setItem(keys.ignored, JSON.stringify({ "opaque:event": { at: future } }));
    captureAccountWrite(store, profile, "ignored", {});
    const local = readOutbox(store, keys)[0]!;
    expect(local.kind).toBe("ignored");
    expect(Date.parse(local.changedAt)).toBeLessThan(Date.parse(future));
  });

  test("a profile can never push after owner/session change", async () => {
    const store = device(), cloud = server();
    captureAccountWrite(store, profile, "ignored", { "opaque:event": { at } });
    await expect(syncProfile(store, profile, "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      () => true, cloud.transport)).rejects.toThrow("session changed");
    await expect(syncProfile(store, profile, owner, () => false,
      cloud.transport)).rejects.toThrow("session changed");
    expect(cloud.sent).toEqual([]);
    expect(readOutbox(store, keys)).toHaveLength(1);
  });

  test("offline, online, foreground, local debounce, retry and auth status triggers", async () => {
    const store = device();
    const prior = ["window", "document", "navigator"].map((key) =>
      [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    const nav = { onLine: false };
    for (const [key, value] of [["window", win], ["document", doc], ["navigator", nav]] as const) {
      Object.defineProperty(globalThis, key, { configurable: true, value });
    }
    const statuses: string[] = [];
    let runs = 0;
    let failAuth = false;
    let failNetwork = false;
    const controller = startProfileSync(profile, owner, () => true,
      (status) => statuses.push(status.kind), store,
      async () => {
        runs++;
        if (failAuth) throw new Error("Sign in again to sync");
        if (failNetwork) throw new Error("Network unavailable");
        return { pending: 0, clockWarning: false, at: new Date().toISOString() };
      });
    const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
    try {
      expect(statuses.at(-1)).toBe("offline");
      await settle();
      expect(runs).toBe(0);
      nav.onLine = true;
      win.dispatchEvent(new Event("online"));
      await settle();
      expect(runs).toBe(1);
      expect(statuses.at(-1)).toBe("synced");
      doc.dispatchEvent(new Event("visibilitychange"));
      await settle();
      expect(runs).toBe(2);
      win.dispatchEvent(Object.assign(new Event("account-sync-local-change"), { detail: profile }));
      expect(statuses.at(-1)).toBe("pending");
      await new Promise((resolve) => setTimeout(resolve, 740));
      expect(runs).toBe(3);
      failAuth = true;
      controller.retry();
      await settle();
      expect(statuses.at(-1)).toBe("auth");
      failAuth = false;
      controller.retry();
      await settle();
      expect(statuses.at(-1)).toBe("synced");
      failNetwork = true;
      controller.retry();
      await settle();
      expect(statuses.at(-1)).toBe("error");
      failNetwork = false;
      controller.retry();
      await settle();
      expect(statuses.at(-1)).toBe("synced");
    } finally {
      controller.stop();
      for (const [key, descriptor] of prior) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  });

  test("remote tombstones and false rows win, while newer pending edits stay visible", () => {
    const old = diffStore("ignored", {}, { x: { at } }, null, [], false,
      Date.parse("2026-09-20T12:00:00.000Z"))[0]!;
    let remote: SyncState = applyMutation(emptySyncState(), old).state;
    const newer = { ...old, ignored: false,
      changedAt: "2026-09-21T12:00:00.000Z", mutationId: crypto.randomUUID() };
    remote = applyMutation(remote, newer).state;
    expect(reconcile(remote, [old]).remaining).toEqual([]);
    expect(reconcile(remote, [old]).state.ignored.x?.ignored).toBe(false);
  });
});
