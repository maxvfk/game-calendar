import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { applyMutation, emptySyncState } from "../src/shared/sync.ts";
import { PassOp, reducePass } from "../src/shared/dailyPasses.ts";
import { completeFirstLogin, writeAccountCache } from "../src/client/account/firstLogin.ts";
import { initializeAccountProfile, captureAccountWrite, readOutbox } from "../src/client/account/localSync.ts";
import { PassChoicesRequired, type PassTransferPlan } from "../src/client/account/passTransfer.ts";
import { buildProfileExport } from "../src/client/account/passExport.ts";
import { queuePassOps, readPasses, savePasses } from "../src/client/account/passProtocol.ts";
import { startProfileSync, syncProfile, type SyncStatus } from "../src/client/account/syncEngine.ts";
import { KEYS, PROFILE_KEYS, profileKeys } from "../src/client/state/storage.ts";
import { defaults } from "../src/client/state/usePrefs.ts";

const profile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", owner = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const guest = "local:round1", keys = profileKeys(profile);
const op = (n: number, days = 30) => PassOp.parse({ opId: `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, "0")}`,
  game: "genshin", region: "asia", kind: "extend", days, actionDay: "2026-11-17", createdAt: "2026-11-17T12:00:00.000Z" });
const blank = () => ({ progress: {}, daily: {}, ignored: {}, customGames: {}, customEvents: {}, prefs: defaults() });
class Store {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(n: number) { return [...this.values.keys()][n] ?? null; }
  writes: string[] = [];
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes.push(key); this.values.set(key, value); }
}
function device() {
  const store = new Store(); writeAccountCache(store, profile, owner, blank());
  initializeAccountProfile(store, profile, owner); return store;
}
const v1 = { authenticate: async () => owner, pull: async () => emptySyncState(), push: async () => {} };
const settle = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };

// Deterministic timers: inspect actual controller deadlines without waiting minutes.
async function withClock(body: (clock: { advance: (ms: number) => Promise<void>; delays: () => number[] }) => Promise<void>) {
  const names = ["window", "document", "navigator", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] as const;
  const prior = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const values = { window: new EventTarget(), document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
    navigator: { onLine: true }, setTimeout: (callback: () => void, ms = 0) => {
      timers.set(++id, { at: now + ms, callback }); return id;
    }, clearTimeout: (key: number) => timers.delete(key), setInterval: () => ++id, clearInterval: () => {} };
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: values[name] });
  try {
    await body({ delays: () => [...timers.values()].map(t => t.at - now).sort((a, b) => a - b), advance: async ms => {
      const end = now + ms;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at; timers.delete(next[0]); next[1].callback(); await settle();
      }
      now = end; await settle();
    } });
  } finally {
    for (const [name, descriptor] of prior) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  }
}

test("persistent pass collision schedules no extra timer, including subsequent held cycles", async () => {
  await withClock(async clock => {
    const store = device(); queuePassOps(store, profile, [op(1)]);
    let pulls = 0;
    const statuses: SyncStatus[] = [];
    const controller = startProfileSync(profile, owner, () => true, s => statuses.push(s), store,
      (s, p, o, active, _transport, options) => syncProfile(s, p, o, active, v1, { ...options, enabled: true,
        transport: { push: async () => [{ opId: op(1).opId, outcome: "accepted" }],
          pull: async () => { pulls++; return [op(1, 31)]; } } }));
    try {
      await clock.advance(0);
      expect(statuses.at(-1)?.heldPasses).toContain("reused");
      expect(readPasses(store, profile).held).not.toBeNull();
      expect(clock.delays()).toEqual([]);
      controller.retry(); await clock.advance(0);
      expect(pulls).toBe(1); expect(clock.delays()).toEqual([]);
    } finally { controller.stop(); }
  });
});

test("transient pass failures use bounded 2–60s backoff; v1 pending keeps its 1.5s retry", async () => {
  for (const pending of [false, true]) await withClock(async clock => {
    const store = device(); queuePassOps(store, profile, [op(1)]);
    if (pending) captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
    const statuses: SyncStatus[] = [];
    const controller = startProfileSync(profile, owner, () => true, s => statuses.push(s), store,
      (s, p, o, active, _transport, options) => syncProfile(s, p, o, active, v1, { ...options, enabled: true,
        transport: { push: async () => { throw { code: "42501", message: "permission denied" }; }, pull: async () => [] } }));
    try {
      await clock.advance(0);
      for (const delay of [2000, 4000, 8000, 16000, 32000, 60000, 60000]) {
        expect(statuses.at(-1)?.heldPasses).toBe("permission denied");
        expect(clock.delays()).toEqual([pending ? 1500 : delay]);
        await clock.advance(pending ? 1500 : delay);
      }
    } finally { controller.stop(); }
  });
});

test("v1 pending plus persistent pass hold also retries at 1.5s", async () => {
  await withClock(async clock => {
    const store = device(); queuePassOps(store, profile, [op(1)]);
    savePasses(store, { ...readPasses(store, profile), held: { opId: op(1).opId, remote: [op(1, 31)] } });
    captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
    const controller = startProfileSync(profile, owner, () => true, () => {}, store,
      (s, p, o, active, _t, options) => syncProfile(s, p, o, active, v1, { ...options, enabled: true }));
    try { await clock.advance(0); expect(clock.delays()).toEqual([1500]); } finally { controller.stop(); }
  });
});

test("pass hold kind is typed by collision identity, never error-message text", async () => {
  for (const error of [new TypeError("Pass op ID reused"), { code: "42501", message: "rollback" },
    new Error("Pass account session changed")]) {
    const store = device(); queuePassOps(store, profile, [op(1)]);
    const result = await syncProfile(store, profile, owner, () => true, v1, { enabled: true,
      transport: { push: async () => { throw error; }, pull: async () => [] } });
    expect(result.passHoldKind).toBe("transient");
  }
  const store = device(); queuePassOps(store, profile, [op(1)]);
  const result = await syncProfile(store, profile, owner, () => true, v1, { enabled: true,
    transport: { push: async () => [], pull: async () => [] } });
  expect(result.passHoldKind).toBe("transient"); // Malformed ACK.
  savePasses(store, { ...readPasses(store, profile), held: { opId: op(1).opId, remote: [op(1, 31)] } });
  const held = await syncProfile(store, profile, owner, () => true, v1, { enabled: true });
  expect(held.passHoldKind).toBe("persistent");
});

test("simultaneous CZN and pass holds preserve both explanations", async () => {
  await withClock(async clock => {
    const statuses: SyncStatus[] = [];
    const controller = startProfileSync(profile, owner, () => true, s => statuses.push(s), device(),
      async () => ({ pending: 1, heldCzn: 1, heldPasses: "collision", clockWarning: false, at: new Date().toISOString() }));
    try {
      await clock.advance(0);
      expect(statuses.at(-1)).toMatchObject({ kind: "synced", pending: 0, heldCzn: 1, heldPasses: "collision" });
      expect(statuses.at(-1)?.message).toContain("older CZN change");
    } finally { controller.stop(); }
  });
});

test("first-login overlap without D6 choices throws before any v1 migration write; guest bytes unchanged", async () => {
  const store = new Store(); const personal = { ...blank(), progress: { event: { status: "done" as const, at: "2026-11-17T12:00:00Z" } } };
  for (const [name, value] of Object.entries(personal)) {
    store.setItem(profileKeys(guest)[name as keyof typeof personal], JSON.stringify(value));
    store.setItem(KEYS[name as keyof typeof personal], JSON.stringify(value));
  }
  store.setItem(PROFILE_KEYS.activeProfile, guest); queuePassOps(store, guest, [op(1)]);
  const before = new Map(store.values); store.writes = [];
  let pushes = 0;
  await expect(completeFirstLogin(store, profile, owner, guest, personal, emptySyncState(), "merge", "cloud", () => true,
    { enabled: true, transport: { pull: async () => [op(2)], push: async () => { pushes++; return []; } } }))
    .rejects.toBeInstanceOf(PassChoicesRequired);
  expect(store.writes).toEqual([`${keys.passes}:op:${op(2).opId}`, `${keys.passes}:ack:${op(2).opId}`]); // Fresh cloud cache only; no migration plan/cache/binding/activation.
  expect(pushes).toBe(0);
  for (const [key, value] of before) expect(store.getItem(key)).toBe(value);
  expect(store.getItem(`${keys.syncMeta}:firstLoginPlan`)).toBeNull();
});

test("hung pass push/pull gets its own budget after slow successful v1; late replies cannot ACK", async () => {
  for (const phase of ["push", "pull"] as const) await withClock(async clock => {
    const store = device(); queuePassOps(store, profile, [op(1)]);
    captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
    let passPulls = 0;
    let remote = emptySyncState(), resolveLate!: (value: never) => void;
    const never = new Promise<never>(resolve => { resolveLate = resolve; });
    const statuses: SyncStatus[] = [];
    const controller = startProfileSync(profile, owner, () => true, s => statuses.push(s), store,
      (s, p, o, active, _t, options) => syncProfile(s, p, o, active, { ...v1,
        authenticate: async () => { await new Promise(resolve => setTimeout(resolve, 19_500)); return owner; },
        pull: async () => remote,
        push: async (_p, rows) => { const { applyMutation } = await import("../src/shared/sync.ts");
          for (const row of rows) remote = applyMutation(remote, row).state; },
      }, { ...options, enabled: true, transport: {
        push: async () => phase === "push" ? never : [{ opId: op(1).opId, outcome: "accepted" }],
        pull: async () => ++passPulls === 1 ? [] : never,
      } }));
    try {
      await clock.advance(19_500);
      expect(readOutbox(store, keys)).toEqual([]);
      expect(JSON.parse(store.getItem(keys.syncMeta)!).lastSuccessfulSyncAt).toBeDefined();
      await clock.advance(10_000);
      expect(statuses.at(-1)).toMatchObject({ kind: "synced", pending: 0 });
      expect(statuses.at(-1)?.heldPasses).toContain("timed out");
      expect(statuses.some(s => s.kind === "network" || s.kind === "error")).toBe(false);
      expect(clock.delays()).toEqual([2000]);
      const before = new Map(store.values);
      resolveLate((phase === "push" ? [{ opId: op(1).opId, outcome: "accepted" }] : [op(1)]) as never);
      await settle(); expect(store.values).toEqual(before);
    } finally { controller.stop(); }
  });
});

test("v1 still times out at 20 seconds when passes are enabled", async () => {
  await withClock(async clock => {
    const statuses: SyncStatus[] = [];
    const controller = startProfileSync(profile, owner, () => true, s => statuses.push(s), device(),
      (s, p, o, active, _t, options) => syncProfile(s, p, o, active,
        { ...v1, pull: async () => new Promise(() => {}) }, { ...options, enabled: true }));
    try {
      await clock.advance(19_999); expect(statuses.at(-1)?.kind).toBe("syncing");
      await clock.advance(1); expect(statuses.at(-1)?.kind).toBe("network");
      expect(clock.delays()).toEqual([2000]); // Existing v1 timeout classification/backoff.
    } finally { controller.stop(); }
  });
});

// Bundle the real App handler with the flag on, without changing the shipping flag
// or global module mocks. A different profile-key constant detects a hard-coded key.
async function flagOnImport() {
  const result = await Bun.build({ entrypoints: [resolve("src/client/App.tsx")], target: "bun", plugins: [{ name: "flag-on-test", setup(build) {
    build.onLoad({ filter: /(?:App\.tsx|passProtocol\.ts|storage\.ts)$/ }, async ({ path }) => {
      let contents = await readFile(path, "utf8");
      if (path.endsWith("App.tsx")) contents += "\nexport { importProgress };\n";
      if (path.endsWith("passProtocol.ts")) contents = contents.replace("DAILY_PASSES_ENABLED = false", "DAILY_PASSES_ENABLED = true");
      if (path.endsWith("storage.ts")) contents = contents.replace('activeProfile: `${V2}:activeProfile`', 'activeProfile: "test:active-profile"');
      return { contents, loader: path.endsWith(".tsx") ? "tsx" : "ts" };
    });
  } }] });
  expect(result.success).toBe(true);
  // A temp file, not a data: URL: older Bun on CI rejects a module specifier this long.
  const dir = await mkdtemp(join(tmpdir(), "pass-flag-on-"));
  try {
    const file = join(dir, "app-flag-on.js");
    await writeFile(file, await result.outputs[0]!.text());
    return (await import(pathToFileURL(file).href)).importProgress;
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test("flag-on App import preserves unknown-file message and uses PROFILE_KEYS for policy imports", async () => {
  const handler = await flagOnImport(); const store = new Store();
  const names = ["localStorage", "window", "alert"] as const;
  const prior = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const alerts: string[] = [], merged: unknown[] = [];
  const values = { localStorage: store, window: new EventTarget(), alert: (message: string) => alerts.push(message) };
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: values[name] });
  const run = (raw: unknown) => handler({ text: async () => JSON.stringify(raw) },
    (value: unknown) => merged.push(value), () => {}, () => {}, () => {}, undefined, guest);
  try {
    await run({ format: "unrelated-export", version: 1 });
    expect(alerts).toEqual(["That file isn't an Event Clock export."]); expect(merged).toEqual([]);
    expect(store.values.size).toBe(0);
    alerts.length = 0; store.setItem("test:active-profile", guest);
    const { buildCznExport, readCzn, cznStorageKey } = await import("../src/client/account/cznProtocol.ts");
    await run(buildCznExport(readCzn(store, guest)));
    expect(alerts).toEqual([]);
    expect(store.getItem(cznStorageKey(guest))).not.toBeNull();
  } finally {
    for (const [name, descriptor] of prior) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  }
});

test("flag-on App import routes v2 through D6 before importing personal progress", async () => {
  const handler = await flagOnImport();
  const store = new Store(), source = new Store();
  store.setItem("test:active-profile", guest);
  queuePassOps(store, guest, [op(1, 60)]);
  queuePassOps(source, "local:other", [op(2)]);
  const progress = { milestone: { status: "done", at: "2026-11-17T12:00:00.000Z" } };
  const file = buildProfileExport(source, "local:other", { format: "gacha-tracker-export", version: 1, progress }, true);
  const alerts: string[] = [], merged: unknown[] = [];
  const globals = { localStorage: store, window: new EventTarget(), alert: (message: string) => alerts.push(message) };
  const prior = Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
  const run = (cancel: boolean) => handler({ text: async () => JSON.stringify(file) },
    (value: unknown) => merged.push(value), () => {}, () => {}, () => {}, undefined, guest, {
      active: () => store.getItem("test:active-profile") === guest,
      choose: async (plan: PassTransferPlan) => {
        expect(plan.choicesRequired).toEqual(["genshin"]);
        return cancel ? null : { genshin: "imported" };
      },
      finish: () => {},
    });
  try {
    await run(true);
    expect(readPasses(store, guest).ops).toEqual([op(1, 60)]);
    expect(merged).toEqual([]);
    await run(false);
    expect(merged).toEqual([progress]);
    const after = readPasses(store, guest);
    expect(after.ops).toHaveLength(2);
    expect(reducePass(after.ops, "genshin", "asia").lastDay).toBe("2026-12-16");
    await run(false);
    expect(readPasses(store, guest)).toEqual(after);
    expect(alerts).toEqual([]);
  } finally {
    for (const [name, descriptor] of prior) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  }
});

test("F3 corrupt pass facts are persistent without retry timers; v1 still commits", async () => {
  for (const raw of ["{broken", JSON.stringify({ version: 9 })]) await withClock(async clock => {
    const store = device(); store.setItem(`${keys.passes}:op:${op(1).opId}`, raw);
    captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
    let passCalls = 0, remote = emptySyncState();
    const legacy = { ...v1, pull: async () => remote, push: async (_p: string, rows: Parameters<typeof applyMutation>[1][]) => {
      for (const row of rows) remote = applyMutation(remote, row).state;
    } };
    const statuses: SyncStatus[] = [];
    const controller = startProfileSync(profile, owner, () => true, s => statuses.push(s), store,
      (s, p, o, active, _t, options) => syncProfile(s, p, o, active, legacy, { ...options, enabled: true,
        transport: { pull: async () => { passCalls++; return []; }, push: async () => { passCalls++; return []; } } }));
    try {
      await clock.advance(0);
      expect(statuses.at(-1)).toMatchObject({ kind: "synced", pending: 0 });
      expect(statuses.at(-1)?.heldPasses).toContain("unreadable");
      expect(readOutbox(store, keys)).toEqual([]);
      expect(clock.delays()).toEqual([]); expect(passCalls).toBe(0);
      controller.retry(); await clock.advance(0);
      expect(clock.delays()).toEqual([]); expect(passCalls).toBe(0);
    } finally { controller.stop(); }
  });
});

async function flagOnSyncController() {
  const result = await Bun.build({ entrypoints: [resolve("src/client/account/syncEngine.ts")], target: "bun", plugins: [{ name: "flag-on-sync-test", setup(build) {
    build.onLoad({ filter: /passProtocol\.ts$/ }, async ({ path }) => ({
      contents: (await readFile(path, "utf8")).replace("DAILY_PASSES_ENABLED = false", "DAILY_PASSES_ENABLED = true"), loader: "ts",
    }));
  } }] });
  expect(result.success).toBe(true);
  const dir = await mkdtemp(join(tmpdir(), "pass-storage-event-"));
  try {
    const file = join(dir, "sync-flag-on.js"); await writeFile(file, await result.outputs[0]!.text());
    return (await import(pathToFileURL(file).href)).startProfileSync as typeof startProfileSync;
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test("F2 storage events for pass prefix refresh and sync another tab; flag-off remains idle", async () => {
  const flagOn = await flagOnSyncController();
  for (const enabled of [false, true]) await withClock(async clock => {
    const store = device(); let cycles = 0, refreshes = 0;
    const refresh = () => { refreshes++; };
    window.addEventListener("account-sync-remote-change", refresh);
    const controller = (enabled ? flagOn : startProfileSync)(profile, owner, () => true, () => {}, store,
      async () => { cycles++; return { pending: 0, at: new Date().toISOString(), clockWarning: false }; });
    const changed = (key: string) => window.dispatchEvent(Object.assign(new Event("storage"), { key }));
    try {
      await clock.advance(0); expect(cycles).toBe(1);
      changed(`${profileKeys(guest).passes}:op:${op(1).opId}`);
      changed(keys.prefs); expect(clock.delays()).toEqual([]);
      queuePassOps(store, profile, [op(1)]);
      // Test the other tab's storage event independently of this tab's local notification.
      await clock.advance(700); const before = cycles;
      changed(`${keys.passes}:op:${op(1).opId}`);
      expect(clock.delays()).toEqual(enabled ? [700] : []);
      expect(refreshes).toBe(enabled ? 1 : 0);
      await clock.advance(700); expect(cycles).toBe(before + (enabled ? 1 : 0));
      controller.stop(); changed(`${keys.passes}:op:${op(2).opId}`);
      expect(clock.delays()).toEqual([]); expect(refreshes).toBe(enabled ? 1 : 0);
    } finally { controller.stop(); window.removeEventListener("account-sync-remote-change", refresh); }
  });
});
