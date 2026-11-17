import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PassOp, PassOpIdReused, passView, reducePass, unionPassOps } from "../src/shared/dailyPasses.ts";
import { PROFILE_KEYS, profileKeys } from "../src/client/state/storage.ts";
import { PassDataUnreadable, passBatches, passPrefix, persistPassIntent, queuePassOps, readPasses,
  savePasses, syncPasses, type PassTransport } from "../src/client/account/passProtocol.ts";
import { applyPassTransfer, planPassTransfer } from "../src/client/account/passTransfer.ts";
import { buildProfileExport } from "../src/client/account/passExport.ts";
import type { resolveAccount } from "../src/client/account/AuthRoot.tsx";
import type { supabase } from "../src/client/account/remote.ts";

const profile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", owner = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const now = Date.parse("2026-11-17T12:00:00Z");
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const op = (n: number, extra = {}) => {
  const candidate = { opId: id(n), kind: "extend", days: 30, game: "genshin", region: "asia",
    actionDay: "2026-11-17", createdAt: "2026-11-17T11:00:00Z", ...extra };
  if (candidate.kind !== "extend") Reflect.deleteProperty(candidate, "days");
  return PassOp.parse(candidate);
};
class Store {
  values = new Map<string, string>();
  quota = false;
  get length() { return this.values.size; }
  key(n: number) { return [...this.values.keys()][n] ?? null; }
  getItem(k: string) { return this.values.get(k) ?? null; }
  setItem(k: string, v: string) {
    if (this.quota && k.includes(":op:")) throw new DOMException("full", "QuotaExceededError");
    this.values.set(k, v);
  }
}

test("R1 multi-batch transfer stays at the source value after accepted batch then failure; retry converges", async () => {
  for (const lastDay of ["2026-12-01", null]) {
    const sourceOps = Array.from({ length: 105 }, (_, i) => op(i + 1));
    sourceOps.push(op(200, { opId: "ffffffff-ffff-4fff-8fff-ffffffffffff", kind: "set", days: undefined,
      lastDay, basedOn: sourceOps.slice(1).map(o => o.opId), createdAt: "2026-11-17T11:30:00Z" }));
    const source = { profileId: "local:source", ops: sourceOps }, a = new Store(), b = new Store();
    const applied = applyPassTransfer(a, planPassTransfer(readPasses(a, profile), source), {}, now);
    expect(applied.ops).toHaveLength(107); // Source set, 105 extends and the protective set.
    expect(applied.ops.filter(o => o.kind === "set")).toHaveLength(2);
    let server: PassOp[] = [], pushes = 0, fail = true;
    const accepted: PassOp[][] = [];
    const transport: PassTransport = { pull: async () => server, push: async (_p, batch) => {
      if (++pushes === 2 && fail) throw new Error("second transaction failed");
      accepted.push(batch); server = unionPassOps(server, batch);
      return batch.map(o => ({ opId: o.opId, outcome: "accepted" }));
    } };
    await expect(syncPasses(a, profile, () => true, transport, true)).rejects.toThrow("second transaction failed");
    expect(accepted).toHaveLength(1); expect(accepted[0]).toHaveLength(100);
    await syncPasses(b, profile, () => true, transport, true);
    const partial = reducePass(readPasses(b, profile).ops, "genshin", "asia");
    expect(partial.lastDay).toBe(lastDay);
    expect(partial.applied).toEqual([]); expect(partial.conflicts).toEqual([id(1)]);
    expect(passView(partial, now).status).toBe(lastDay === null ? "none" : "active");
    expect(server.filter(o => o.kind === "set")).toHaveLength(2);
    expect(readPasses(a, profile).pending).toHaveLength(107);
    fail = false;
    await syncPasses(a, profile, () => true, transport, true);
    await syncPasses(b, profile, () => true, transport, true);
    expect(server).toEqual(applied.ops);
    for (const store of [a, b]) {
      expect(readPasses(store, profile).ops).toEqual(server);
      expect(readPasses(store, profile).pending).toEqual([]);
      expect(reducePass(server, "genshin", "asia")).toEqual(partial);
    }
  }
});

test("R1 push groups are set, undo/resolve, extend, ordered by ID within each group", () => {
  const ops = [op(1), op(2, { kind: "resolve", days: undefined, targetOp: id(1), resolution: "exclude" }),
    op(3, { kind: "undo", days: undefined, targetOp: id(1) }),
    op(4, { kind: "set", days: undefined, lastDay: null, basedOn: [id(1)] }),
    op(5, { kind: "set", days: undefined, lastDay: null, basedOn: [] }), op(6)];
  expect(passBatches([...ops].reverse()).flat().map(o => o.opId)).toEqual([4, 5, 2, 3, 1, 6].map(id));
});

test("R2 quota during intent roll-forward leaves reads and recovery export complete; later read materializes", () => {
  const store = new Store(), ops = [op(1), op(2), op(3)];
  buildProfileExport(store, profile); // Preserve the independent CZN recovery snapshot before quota is exhausted.
  store.quota = true;
  expect(() => persistPassIntent(store, profile, "source-receipt", ops)).toThrow("full");
  expect([...store.values.keys()].filter(k => k.startsWith(passPrefix(profile)))).toHaveLength(1);
  const setItem = store.setItem.bind(store);
  store.setItem = (k, v) => { if (store.quota) throw new DOMException("full", "QuotaExceededError"); setItem(k, v); };
  const state = readPasses(store, profile);
  expect(state.ops).toEqual(ops); expect(state.pending).toEqual(ops.map(o => o.opId));
  expect(state.imports).toEqual(["source-receipt"]); expect(state.recovery).toEqual([]);
  const exported = buildProfileExport(store, profile, { note: "recovery" }, true);
  expect(exported).toMatchObject({ formatVersion: 2, personal: { note: "recovery" }, passes: state });
  expect([...store.values.keys()].filter(k => k.startsWith(passPrefix(profile)))).toHaveLength(1);
  store.quota = false;
  expect(readPasses(store, profile)).toEqual(state);
  for (const o of ops) expect(JSON.parse(store.getItem(`${passPrefix(profile)}op:${o.opId}`)!)).toEqual(o);
});

// Isolated real AuthRoot bundles, with no global module mocks or data: URLs.
async function authBundle(enabled: boolean) {
  const result = await Bun.build({ entrypoints: [resolve("src/client/account/AuthRoot.tsx")], target: "bun",
    plugins: [{ name: "auth-pass-flag", setup(build) {
      build.onLoad({ filter: /(?:AuthRoot\.tsx|passProtocol\.ts)$/ }, async ({ path }) => {
        let contents = await readFile(path, "utf8");
        if (path.endsWith("AuthRoot.tsx")) contents += "\nexport { supabase };\n";
        else if (enabled) contents = contents.replace("DAILY_PASSES_ENABLED = false", "DAILY_PASSES_ENABLED = true");
        return { contents, loader: path.endsWith(".tsx") ? "tsx" : "ts" };
      });
    } }] });
  expect(result.success).toBe(true);
  const dir = await mkdtemp(join(tmpdir(), "pass-round3-auth-"));
  try {
    const file = join(dir, "auth.js"); await writeFile(file, await result.outputs[0]!.text());
    return await import(pathToFileURL(file).href) as { resolveAccount: typeof resolveAccount; supabase: typeof supabase };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test("R3 first login treats recovery-only, held-only and imports-only guest as nonempty only with flag on", async () => {
  const names = ["localStorage", "navigator"] as const;
  const prior = names.map(n => [n, Object.getOwnPropertyDescriptor(globalThis, n)] as const);
  try {
    for (const enabled of [true, false]) {
      const auth = await authBundle(enabled);
      auth.supabase.auth.getSession = async () => ({ data: { session: { user: { id: owner } } }, error: null }) as never;
      auth.supabase.auth.getUser = async () => ({ data: { user: { id: owner } }, error: null }) as never;
      auth.supabase.rpc = (async (name: string) => {
        if (name !== "ensure_default_profile") throw new Error(`Unexpected RPC ${name}`);
        return { data: profile, error: null };
      }) as never;
      auth.supabase.from = (() => {
        const query = { select: () => query, eq: () => query, order: () => query,
          range: async () => ({ data: [], error: null }), single: async () => ({ data: { owner_id: owner }, error: null }) };
        return query;
      }) as never;
      for (const kind of ["recovery", "held", "imports", "ops", "empty"]) {
        const store = new Store(), guest = { profileId: "local:round3", keys: profileKeys("local:round3") };
        store.setItem(PROFILE_KEYS.profiles, JSON.stringify({ schemaVersion: 2, guestProfileId: guest.profileId, legacyMigrated: true }));
        if (kind === "recovery") store.setItem(`${passPrefix(guest.profileId)}op:${id(1)}`, "{broken");
        if (kind === "held") savePasses(store, { ...readPasses(store, guest.profileId), held: { opId: id(1), remote: [op(1)] } });
        if (kind === "imports") persistPassIntent(store, guest.profileId, "import-receipt", []);
        if (kind === "ops") queuePassOps(store, guest.profileId, [op(1)]);
        expect(readPasses(store, guest.profileId).ops.length).toBe(kind === "ops" ? 1 : 0);
        const guestFacts = [...store.values].filter(([k]) => k.startsWith(passPrefix(guest.profileId)));
        let passReads = 0;
        const getItem = store.getItem.bind(store);
        store.getItem = k => { if (k.startsWith(passPrefix(guest.profileId))) passReads++; return getItem(k); };
        Object.defineProperty(globalThis, "localStorage", { configurable: true, value: store });
        Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
        const result = await auth.resolveAccount(guest, () => true);
        expect(result.kind).toBe(enabled && kind !== "empty" ? "choice" : "account");
        if (enabled && kind !== "empty") expect(store.getItem(`${profileKeys(profile).syncMeta}:account`)).toBeNull();
        if (!enabled) expect(passReads).toBe(0);
        expect([...store.values].filter(([k]) => k.startsWith(passPrefix(guest.profileId)))).toEqual(guestFacts);
      }
    }
  } finally {
    for (const [name, descriptor] of prior) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  }
});

test("R4 fact keys stay bounded for large Unicode intents and holds; identical facts replay without extra keys", () => {
  const store = new Store(), prefix = passPrefix(profile);
  for (const size of [1, 100_000]) {
    const receipt = "источник 🌟".repeat(size);
    persistPassIntent(store, profile, receipt, []);
    const keys = [...store.values.keys()].filter(k => k.startsWith(`${prefix}intent:`));
    const key = keys.at(-1)!;
    expect(key.length).toBe(prefix.length + "intent:".length + 16);
    expect(JSON.parse(store.getItem(key)!).receipt).toBe(receipt);
    const before = new Map(store.values); persistPassIntent(store, profile, receipt, []);
    expect(store.values).toEqual(before);
  }
  queuePassOps(store, profile, [op(1)]);
  expect(() => queuePassOps(store, profile, [op(1, { days: 31 })])).toThrow(PassOpIdReused);
  const holdKey = [...store.values.keys()].find(k => k.startsWith(`${prefix}hold:`))!;
  expect(holdKey.length).toBe(prefix.length + "hold:".length + 16);
  expect(readPasses(store, profile).held?.remote).toEqual([op(1, { days: 31 })]);
});

test("R4 hash/content mismatches are recovery facts and writes refuse to overwrite different content", () => {
  for (const kind of ["intent", "hold"]) {
    const store = new Store();
    if (kind === "intent") persistPassIntent(store, profile, "original", []);
    else savePasses(store, { ...readPasses(store, profile), held: { opId: id(1), remote: [op(1)] } });
    const key = [...store.values.keys()].find(k => k.startsWith(`${passPrefix(profile)}${kind}:`))!;
    const raw = JSON.stringify(kind === "intent" ? { receipt: "different", ops: [op(2)], imports: [] } :
      { opId: id(1), remote: [op(1, { days: 31 })] });
    store.values.set(key, raw); // Still schema-valid JSON, but not the fact named by this key.
    const state = readPasses(store, profile);
    expect(state.recovery).toEqual([{ key, raw }]);
    expect(state.ops).toEqual([]); expect(state.imports).toEqual([]); expect(state.held).toBeNull();
    expect(buildProfileExport(store, profile, undefined, true)).toMatchObject({ passes: { recovery: [{ key, raw }] } });
    const before = new Map(store.values);
    expect(() => kind === "intent" ? persistPassIntent(store, profile, "original", []) :
      savePasses(store, { ...state, held: { opId: id(1), remote: [op(1)] } })).toThrow(PassDataUnreadable);
    expect(store.values).toEqual(before);
  }
});
