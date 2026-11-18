import { describe, expect, spyOn, test } from "bun:test";
import { addDays, PassOp, PassOpIdReused, passDay, reducePass, unionPassOps } from "../src/shared/dailyPasses.ts";
import { emptySyncState, applyMutation, type SyncMutation } from "../src/shared/sync.ts";
import { profileKeys } from "../src/client/state/storage.ts";
import { defaults } from "../src/client/state/usePrefs.ts";
import { completeFirstLogin, pendingPlan, readAccountBinding, writeAccountCache } from "../src/client/account/firstLogin.ts";
import { supabase } from "../src/client/account/remote.ts";
import { captureAccountWrite, initializeAccountProfile, readOutbox } from "../src/client/account/localSync.ts";
import { syncProfile } from "../src/client/account/syncEngine.ts";
import {
  DAILY_PASSES_ENABLED, acceptedPassIds, extendPass, mergePulledPasses, passBatchBytes, passBatches,
  queuePassOps, readPasses, readPassViews, resolvePass, setPass, syncPasses, undoPass,
  type PassTransport,
} from "../src/client/account/passProtocol.ts";
import { applyPassTransfer, PassChoicesRequired, PassPlanChanged, planFirstLoginPasses, planPassTransfer } from "../src/client/account/passTransfer.ts";
import { addPassExport, applyPolicyImport, buildProfileExport, importProfileData, importWithPassChoices, planPolicyImport, preparePolicyImport } from "../src/client/account/passExport.ts";
import { buildCznExport, cznRemote, importCzn, readCzn, preserveCznLegacy } from "../src/client/account/cznProtocol.ts";
import { buildExportData } from "../src/client/state/export.ts";

class Store {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(n: number) { return [...this.values.keys()][n] ?? null; }
  writes = 0;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes++; this.values.set(key, value); }
}
const profile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherProfile = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const owner = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const guest = "local:pass-guest";
const now = Date.parse("2026-10-01T12:00:00.000Z");
const day = passDay(now, "genshin", "asia");
const id = (n: number) => `dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12, "0")}`;
const op = (n: number, extra: object = {}): PassOp => PassOp.parse({ opId: id(n), game: "genshin", region: "asia",
  kind: "extend", actionDay: day, createdAt: new Date(now).toISOString(), days: 30, ...extra });
const blank = () => ({ progress: {}, daily: {}, ignored: {}, customGames: {}, customEvents: {}, prefs: defaults() });
function device() {
  const store = new Store(); writeAccountCache(store, profile, owner, blank());
  initializeAccountProfile(store, profile, owner); return store;
}
function cloud() {
  let ops: PassOp[] = [];
  const sent: PassOp[][] = [];
  const transport: PassTransport = {
    push: async (_p, batch) => { sent.push(batch); ops = unionPassOps(ops, batch);
      return batch.map(o => ({ opId: o.opId, outcome: "accepted" })); },
    pull: async () => ops,
  };
  return { sent, transport, ops: () => ops };
}
function v1() {
  let state = emptySyncState(); const sent: SyncMutation[][] = [];
  return { sent, transport: { authenticate: async () => owner, pull: async () => state,
    push: async (_p: string, rows: SyncMutation[]) => { sent.push(rows); for (const row of rows) state = applyMutation(state, row).state; } } };
}
function stubFirstLoginLegacy() {
  const query = { select: () => query, eq: () => query, order: () => query, range: async () => ({ data: [], error: null }) };
  const from = spyOn(supabase, "from").mockReturnValue(query as never);
  const rpc = spyOn(supabase, "rpc").mockImplementation(((_name: string, args: { p_mutations: SyncMutation[] }) =>
    Promise.resolve({ data: args.p_mutations.map(row => ({ mutationId: row.mutationId, outcome: "accepted" })), error: null })) as never);
  const negotiate = spyOn(cznRemote, "negotiate").mockResolvedValue({ protocol: 2, enabled: false, policy: null });
  return { rpc, negotiate, restore: () => { from.mockRestore(); rpc.mockRestore(); negotiate.mockRestore(); } };
}
const raw = (s: Store, p = profile) => JSON.stringify([...s.values].filter(([k]) => k.startsWith(`${profileKeys(p).passes}:`)).sort());

describe("PASS-1B offline journal / ACK / isolated sync", () => {
  test("two distinct offline +30 on two devices converge to +60; replay adds zero (1,2,3)", async () => {
    const a = device(), b = device(), server = cloud(), legacy = v1();
    const x = extendPass(a, profile, "genshin", "asia", undefined, now);
    const y = extendPass(b, profile, "genshin", "asia", undefined, now);
    expect(x.opId).not.toBe(y.opId);
    expect(readOutbox(a, profileKeys(profile))).toHaveLength(0);
    await syncProfile(a, profile, owner, () => true, legacy.transport, { enabled: true, transport: server.transport });
    await syncProfile(b, profile, owner, () => true, legacy.transport, { enabled: true, transport: server.transport });
    await syncPasses(a, profile, () => true, server.transport, true);
    expect(readPasses(a, profile).ops).toEqual(readPasses(b, profile).ops);
    expect(readPassViews(a, profile, now)[0]?.view).toMatchObject({ remainingDays: 60, lastDay: addDays(day, 59) });
    queuePassOps(a, profile, [x]);
    await syncPasses(a, profile, () => true, server.transport, true);
    expect(server.ops()).toHaveLength(2);
    expect(readPasses(a, profile).pending).toEqual([]);
  });

  test("unknown ACK, incomplete ACK, duplicate ACK or wrong op ID never acknowledges (3)", async () => {
    for (const reply of [null, [], [{ opId: id(1), outcome: "superseded" }],
      [{ opId: id(1), outcome: "unknown" }], [{ opId: id(2), outcome: "accepted" }],
      [{ opId: id(1), outcome: "accepted" }, { opId: id(1), outcome: "accepted" }]]) {
      const store = device(); queuePassOps(store, profile, [op(1)]); const before = raw(store);
      await expect(syncPasses(store, profile, () => true, {
        push: async () => reply, pull: async () => [op(1)],
      }, true)).rejects.toThrow();
      expect(raw(store)).toBe(before);
    }
    expect(acceptedPassIds([{ opId: id(2), outcome: "accepted" }, { opId: id(1), outcome: "accepted" }], [op(1), op(2)]))
      .toEqual([id(2), id(1)]);
  });

  test("crash after server commit and before ACK, refresh and retry retain exact ID (1,3)", async () => {
    const store = device(), server = cloud(); queuePassOps(store, profile, [op(1)]);
    await expect(syncPasses(store, profile, () => true, { ...server.transport, push: async (p, ops) => {
      await server.transport.push(p, ops); throw new TypeError("reply lost");
    } }, true)).rejects.toThrow();
    const refreshed = new Store(); refreshed.values = new Map(store.values);
    initializeAccountProfile(refreshed, profile, owner);
    expect(readPasses(refreshed, profile).pending).toEqual([id(1)]);
    await syncPasses(refreshed, profile, () => true, server.transport, true);
    expect(server.ops()).toHaveLength(1); expect(server.sent[0]).toEqual(server.sent[1]);
    expect(readPasses(refreshed, profile).pending).toEqual([]);
    expect(readPassViews(refreshed, profile, now)[0]?.view).toMatchObject({ remainingDays: 30 });
  });

  test("ACK followed by failed pull or failed local write retains pending for replay (3)", async () => {
    const store = device(), server = cloud(); queuePassOps(store, profile, [op(1)]);
    const before = raw(store); let pulls = 0;
    await expect(syncPasses(store, profile, () => true, { ...server.transport,
      pull: async () => { if (++pulls === 1) return []; throw new TypeError("network"); } }, true)).rejects.toThrow();
    expect(raw(store)).toBe(before);
    const failing = { get length() { return store.length; }, key: (n: number) => store.key(n), getItem: (key: string) => store.getItem(key), setItem: () => { throw new Error("quota"); } };
    await expect(syncPasses(failing, profile, () => true, server.transport, true)).rejects.toThrow("quota");
    expect(raw(store)).toBe(before);
    await syncPasses(store, profile, () => true, server.transport, true);
    expect(server.ops()).toHaveLength(1);
  });

  test("sign-out/profile switch during push or pull cannot ACK or write a foreign profile (3,7)", async () => {
    for (const phase of ["push", "pull"]) {
      const store = device(), server = cloud(); let active = true;
      queuePassOps(store, profile, [op(1)]); queuePassOps(store, otherProfile, [op(2)]); queuePassOps(store, guest, [op(3)]);
      const before = raw(store), other = raw(store, otherProfile), local = raw(store, guest);
      await expect(syncPasses(store, profile, () => active, {
        push: async (p, ops) => { const reply = await server.transport.push(p, ops); if (phase === "push") active = false; return reply; },
        pull: async p => { if (phase === "pull") active = false; return server.transport.pull(p); },
      }, true)).rejects.toThrow("session changed");
      expect(raw(store)).toBe(before); expect(raw(store, otherProfile)).toBe(other); expect(raw(store, guest)).toBe(local);
      await syncPasses(store, profile, () => true, server.transport, true);
      expect(readPasses(store, profile).pending).toEqual([]);
      expect(readPasses(store, otherProfile).pending).toEqual([id(2)]);
      expect(readPasses(store, guest).pending).toEqual([id(3)]);
    }
  });

  test("v1 succeeds before pass RPC network / 42501 rollback failure; only passes held (9)", async () => {
    for (const error of [new TypeError("offline"), { code: "42501", message: "permission denied for function daily_pass_apply" }]) {
      const store = device(), legacy = v1(); queuePassOps(store, profile, [op(1)]);
      captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
      const before = raw(store);
      const result = await syncProfile(store, profile, owner, () => true, legacy.transport,
        { enabled: true, transport: { push: async () => { throw error; }, pull: async () => [] } });
      expect(result.pending).toBe(0); expect(result.heldPasses).toBeDefined();
      expect(legacy.sent).toHaveLength(1); expect(readOutbox(store, profileKeys(profile))).toEqual([]);
      expect(raw(store)).toBe(before);
    }
  });

  test("v1 failure never touches passes, including queued edits (9)", async () => {
    const store = device(), server = cloud(); queuePassOps(store, profile, [op(1)]); const before = raw(store);
    let calls = 0;
    await expect(syncProfile(store, profile, owner, () => true, { ...v1().transport,
      pull: async () => { throw new Error("v1 unavailable"); } }, { enabled: true, transport: {
      push: async () => { calls++; }, pull: async () => { calls++; return []; },
    } })).rejects.toThrow("v1 unavailable");
    expect(calls).toBe(0); expect(raw(store)).toBe(before);
    await syncPasses(store, profile, () => true, server.transport, true);
    expect(server.ops()).toHaveLength(1);
  });

  test("content mismatch on pull holds this profile persistently and preserves BOTH copies (7,9)", async () => {
    const store = device(); queuePassOps(store, profile, [op(1)]);
    const remote = op(1, { days: 31 }); let calls = 0;
    const transport: PassTransport = { push: async (_p, rows) => rows.map(o => ({ opId: o.opId, outcome: "accepted" })),
      pull: async () => { calls++; return [remote]; } };
    const result = await syncProfile(store, profile, owner, () => true, v1().transport, { enabled: true, transport });
    expect(result.heldPasses).toContain("reused");
    expect(readPasses(store, profile)).toMatchObject({ ops: [op(1)], pending: [id(1)], held: { opId: id(1), remote: [remote] } });
    await expect(syncPasses(store, profile, () => true, transport, true)).rejects.toBeInstanceOf(PassOpIdReused);
    expect(calls).toBe(1);
    const base = buildCznExport(readCzn(store, profile));
    const exported = addPassExport(store, profile, base, true);
    expect(exported).toHaveProperty("passes.held.remote", [remote]);
    const snapshot = new Map(store.values);
    expect(() => planPolicyImport(store, profile, exported, true)).toThrow("collision");
    expect(store.values).toEqual(snapshot);
    queuePassOps(store, otherProfile, [op(2)]);
    await syncPasses(store, otherProfile, () => true, cloud().transport, true);
    expect(readPasses(store, otherProfile).pending).toEqual([]);
  });

  test("edits made during push/pull survive; pull alone never ACKs a pending op (3)", async () => {
    const store = device(), server = cloud(); queuePassOps(store, profile, [op(1)]);
    let pulls = 0;
    await syncPasses(store, profile, () => true, { ...server.transport, push: async (p, rows) => {
      queuePassOps(store, profile, [op(2)]); return server.transport.push(p, rows);
    }, pull: async p => { if (++pulls === 2) queuePassOps(store, profile, [op(3)]); return server.transport.pull(p); } }, true);
    expect(readPasses(store, profile).pending).toEqual([id(2), id(3)]);
    mergePulledPasses(store, profile, [op(2), op(3)]);
    expect(readPasses(store, profile).pending).toEqual([id(2), id(3)]);
  });

  test("corrupt stores, profile mismatch and guest transport fail closed (6,7)", async () => {
    const store = new Store(), server = cloud();
    queuePassOps(store, guest, [op(1)]);
    await expect(syncPasses(store, guest, () => true, server.transport, true)).rejects.toThrow("Guest");
    expect(server.sent).toHaveLength(0);
    // An op copied under another op ID is a typed data hold; raw bytes survive.
    const badKey = `${profileKeys(profile).passes}:op:${id(9)}`;
    store.setItem(badKey, JSON.stringify(op(1)));
    expect(readPasses(store, profile).recovery).toEqual([{ key: badKey, raw: JSON.stringify(op(1)) }]);
    const corrupt = device(); corrupt.setItem(badKey, "{");
    const result = await syncProfile(corrupt, profile, owner, () => true, v1().transport, { enabled: true, transport: server.transport });
    expect(result.passHoldKind).toBe("persistent"); expect(server.sent).toHaveLength(0);
  });

  test("flag off: no pass storage reads or network; all v1 bytes/behaviour retained (6,8,9)", async () => {
    expect(DAILY_PASSES_ENABLED).toBe(false);
    const store = device(), legacy = v1(); queuePassOps(store, profile, [op(1)]);
    const before = raw(store);
    let calls = 0;
    const transport: PassTransport = { push: async () => { calls++; throw new Error("unexpected"); }, pull: async () => { calls++; return []; } };
    await syncProfile(store, profile, owner, () => true, legacy.transport, { transport });
    const inaccessible = { get length(): number { throw new Error("pass enumeration while disabled"); }, key: (_n: number): string | null => { throw new Error("pass key while disabled"); }, getItem: () => { throw new Error("pass read while disabled"); }, setItem: () => { throw new Error("write"); } };
    await syncPasses(inaccessible, profile, () => true, transport);
    expect(await planFirstLoginPasses(inaccessible, profile, guest, () => true, transport)).toBeNull();
    expect(calls).toBe(0); expect(raw(store)).toBe(before);
    const personal = buildExportData({}, {}, {}, { games: {}, events: {} });
    const old = buildCznExport(preserveCznLegacy(store, readCzn(store, profile)), personal);
    expect(JSON.stringify(buildProfileExport(store, profile, personal))).toBe(JSON.stringify(old));
    expect(addPassExport(inaccessible, profile, old)).toBe(old);
    const v2 = addPassExport(store, profile, old, true);
    const snapshot = new Map(store.values);
    await expect(importProfileData(store, profile, v2)).rejects.toThrow();
    expect(store.values).toEqual(snapshot);
  });

  test("batches split at 100 ops AND jsonb upper bound, without compaction (1,3)", async () => {
    const store = device(), server = cloud(); const ops = Array.from({ length: 205 }, (_, i) => op(i + 1));
    queuePassOps(store, profile, ops);
    await syncPasses(store, profile, () => true, server.transport, true);
    expect(server.sent.map(b => b.length)).toEqual([100, 100, 5]); expect(server.ops()).toHaveLength(205);
    const large = Array.from({ length: 30 }, (_, i) => PassOp.parse({ opId: id(i + 1000), game: "genshin", region: "asia",
      actionDay: day, createdAt: new Date(now).toISOString(), kind: "set",
      lastDay: null, basedOn: Array.from({ length: 500 }, (_, j) => id(j + 2000)) }));
    expect(large).toHaveLength(30);
    const batches = passBatches(large);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every(b => b.length <= 100 && passBatchBytes(b) <= 256 * 1024)).toBe(true);
    expect(batches.flat()).toHaveLength(30);
  });
});

describe("PASS-1B action API and D6 transfer", () => {
  test("set sees only its lane; undo/resolve target the original op; clocks incl. CZN (4,5,6)", () => {
    const store = new Store();
    const a = extendPass(store, guest, "genshin", "asia", undefined, now);
    extendPass(store, guest, "genshin", "europe", undefined, now);
    const set = setPass(store, guest, "genshin", "asia", addDays(day, 9), now + 1);
    expect(set).toMatchObject({ basedOn: [a.opId], actionDay: day, createdAt: new Date(now + 1).toISOString() });
    const b = extendPass(store, guest, "genshin", "asia", undefined, now + 2);
    const undo = undoPass(store, guest, b.opId, now + 3);
    expect(undo).toMatchObject({ targetOp: b.opId });
    expect(reducePass(readPasses(store, guest).ops, "genshin", "asia").lastDay).toBe(addDays(day, 9));
    const unseen = op(10, { createdAt: new Date(now - 1).toISOString() }); queuePassOps(store, guest, [unseen]);
    expect(reducePass(readPasses(store, guest).ops, "genshin", "asia").conflicts).toEqual([id(10)]);
    resolvePass(store, guest, unseen.opId, "include", now + 4);
    expect(reducePass(readPasses(store, guest).ops, "genshin", "asia").lastDay).toBe(addDays(day, 39));
    const before = raw(store, guest);
    expect(() => undoPass(store, guest, undo.opId)).toThrow();
    expect(() => resolvePass(store, guest, set.opId, "exclude")).toThrow();
    expect(raw(store, guest)).toBe(before);
    const czn = extendPass(store, guest, "czn", "america", undefined, Date.parse("2026-10-01T17:59:59Z"));
    expect(czn.actionDay).toBe("2026-09-30");
    expect(store.getItem(profileKeys(guest).daily)).toBeNull();
    expect(store.getItem(profileKeys(guest).prefs)).toBeNull();
  });

  test("set with >500 seen ops refuses instead of truncating basedOn (5)", () => {
    const store = new Store(); queuePassOps(store, guest, Array.from({ length: 501 }, (_, i) => op(i + 1)));
    const before = raw(store, guest);
    expect(() => setPass(store, guest, "genshin", "asia", null, now)).toThrow();
    expect(raw(store, guest)).toBe(before);
  });

  test("quota prevents publishing an action or partial D6 intent; retry stores it once (3,D6)", () => {
    const store = new Store(); queuePassOps(store, guest, [op(1)]); queuePassOps(store, profile, [op(2)]);
    const denied = { get length() { return store.length; }, key: (n: number) => store.key(n), getItem: (key: string) => store.getItem(key), setItem: () => { throw new Error("quota"); } };
    const before = new Map(store.values);
    expect(() => extendPass(denied, guest, "genshin", "asia", undefined, now)).toThrow("quota");
    const plan = planPassTransfer(readPasses(store, profile), { profileId: guest, ops: readPasses(store, guest).ops });
    expect(() => applyPassTransfer(denied, plan, { genshin: "imported" }, now + 1)).toThrow("quota");
    expect(store.values).toEqual(before);
    applyPassTransfer(store, plan, { genshin: "imported" }, now + 1);
    expect(readPasses(store, profile).ops).toHaveLength(2);
    const accepted = raw(store);
    applyPassTransfer(store, plan, { genshin: "imported" }, now + 2);
    expect(raw(store)).toBe(accepted);
  });

  test("first login fresh cloud empty: guest ops upload only after explicit apply (D6,7)", async () => {
    const store = device(), server = cloud(); queuePassOps(store, guest, [op(1)]);
    const before = raw(store, guest);
    const plan = await planFirstLoginPasses(store, profile, guest, () => true, server.transport, true);
    expect(plan?.choicesRequired).toEqual([]); expect(server.sent).toHaveLength(0);
    expect(readPasses(store, profile).ops).toEqual([]);
    applyPassTransfer(store, plan!, {}, now);
    await syncPasses(store, profile, () => true, server.transport, true);
    expect(server.ops()).toContainEqual(op(1)); expect(server.ops().filter(o => o.kind === "set")).toHaveLength(1); expect(raw(store, guest)).toBe(before);
  });

  test("first login D6 both choices: fresh cloud is checked per game, never sum (D6,7)", async () => {
    for (const choice of ["current", "imported"] as const) {
      const store = device(), server = cloud();
      queuePassOps(store, guest, [op(1), op(3, { region: "europe" })]);
      await server.transport.push(profile, [op(2, { days: 60 })]);
      const before = raw(store, guest);
      const plan = await planFirstLoginPasses(store, profile, guest, () => true, server.transport, true);
      expect(plan?.choicesRequired).toEqual(["genshin"]);
      expect(() => applyPassTransfer(store, plan!, {}, now + 1)).toThrow(PassChoicesRequired);
      expect(readPasses(store, profile).ops).toHaveLength(1);
      applyPassTransfer(store, plan!, { genshin: choice }, now + 1);
      await syncPasses(store, profile, () => true, server.transport, true);
      expect(reducePass(server.ops(), "genshin", "asia").lastDay).toBe(addDays(day, choice === "current" ? 59 : 29));
      expect(server.ops().some(o => o.opId === id(1) || o.opId === id(3))).toBe(false);
      if (choice === "imported") {
        const sets = server.ops().filter(o => o.kind === "set"); expect(sets).toHaveLength(2);
        expect(sets.find(o => o.region === "asia")).toMatchObject({ basedOn: [id(2)] });
        expect(sets.find(o => o.region === "europe")).toMatchObject({ basedOn: [] });
      }
      expect(raw(store, guest)).toBe(before);
      const accepted = raw(store); applyPassTransfer(store, plan!, { genshin: choice }, now + 2);
      expect(raw(store)).toBe(accepted);
    }
  });

  test("stale D6 plan and sign-out while planning cannot change guest/target", async () => {
    const store = new Store(); queuePassOps(store, guest, [op(1)]);
    const plan = planPassTransfer(readPasses(store, profile), { profileId: guest, ops: readPasses(store, guest).ops });
    queuePassOps(store, profile, [op(2)]); const before = raw(store);
    expect(() => applyPassTransfer(store, plan, {}, now)).toThrow("stale"); expect(raw(store)).toBe(before);
    let active = true;
    await expect(planFirstLoginPasses(store, profile, guest, () => active, { push: async () => [],
      pull: async () => { active = false; return [op(3)]; } }, true)).rejects.toThrow("session changed");
    expect(raw(store)).toBe(before);
  });

  test("D6 cannot hide a future winning set; all choices validated before atomic write", () => {
    const store = new Store(); queuePassOps(store, guest, [op(1)]);
    queuePassOps(store, profile, [PassOp.parse({ opId: id(2), kind: "set", game: "genshin", region: "asia",
      actionDay: addDays(day, 1), createdAt: new Date(now + 86400000).toISOString(), lastDay: null, basedOn: [] })]);
    const plan = planPassTransfer(readPasses(store, profile), { profileId: guest, ops: readPasses(store, guest).ops }), before = raw(store);
    expect(() => applyPassTransfer(store, plan, { genshin: "imported" }, now)).toThrow("cannot win");
    expect(raw(store)).toBe(before);
  });
});

describe("PASS-1B versioned export / import", () => {
  test("cold account cross-profile import pulls cloud BEFORE D6; both choices never sum (D6,7,8)", async () => {
    for (const choice of ["current", "imported"] as const) {
      const source = new Store(), target = new Store(), server = cloud();
      queuePassOps(source, guest, [op(1)]);
      await server.transport.push(profile, [op(2, { days: 60 })]);
      const file = buildProfileExport(source, guest, undefined, true);
      expect(readPasses(target, profile).ops).toHaveLength(0);
      const plan = await preparePolicyImport(target, profile, file, () => true, server.transport, true);
      expect(plan.passes?.choicesRequired).toEqual(["genshin"]);
      expect(() => applyPolicyImport(target, profile, plan, {}, true, now + 1)).toThrow(PassChoicesRequired);
      applyPolicyImport(target, profile, plan, { genshin: choice }, true, now + 1);
      await syncPasses(target, profile, () => true, server.transport, true);
      expect(readPassViews(target, profile, now)[0]?.view).toMatchObject({ remainingDays: choice === "current" ? 60 : 30 });
      expect(server.ops().some(o => o.opId === id(1))).toBe(false);
    }
  });

  test("foreign account import network failure/session change holds source before apply (3,7,8)", async () => {
    const source = new Store(), target = new Store(); queuePassOps(source, guest, [op(1)]);
    const file = buildProfileExport(source, guest, undefined, true), before = new Map(target.values);
    await expect(importProfileData(target, profile, file, {}, true, { push: async () => [],
      pull: async () => { throw new Error("offline: cannot establish empty cloud"); } })).rejects.toThrow("offline");
    expect(target.values).toEqual(before);
    let active = true;
    await expect(importProfileData(target, profile, file, {}, true, { push: async () => [],
      pull: async () => { active = false; return [op(2)]; } }, () => active)).rejects.toThrow("profile changed");
    expect(target.values).toEqual(before);
    // Guest-to-guest imports need no cloud, and still use D6.
    await importProfileData(target, "local:other-guest", file, {}, true, {
      push: async () => { throw new Error("unexpected network"); }, pull: async () => { throw new Error("unexpected network"); },
    });
    expect(readPasses(target, "local:other-guest").ops).toContainEqual(op(1));
    expect(readPassViews(target, "local:other-guest", now)[0]?.view).toMatchObject({ remainingDays: 30 });
  });

  test("v2 top-level passes is refused WHOLE by main's current importCzn (8)", () => {
    const store = new Store(); queuePassOps(store, profile, [op(1)]);
    const base = buildCznExport(readCzn(store, profile), { format: "gacha-tracker-export", version: 1 });
    const exported = addPassExport(store, profile, base, true);
    expect(exported).toHaveProperty("formatVersion", 2); expect(exported).toHaveProperty("passes.ops", [op(1)]);
    expect(exported.personal).not.toHaveProperty("passes");
    const before = new Map(store.values);
    expect(() => importCzn(store, readCzn(store, profile), exported)).toThrow();
    expect(store.values).toEqual(before);
  });

  test("no pass ops exports v1; new v1 importer leaves pass bytes unchanged (8)", async () => {
    const store = new Store(); const base = buildCznExport(readCzn(store, profile));
    expect(addPassExport(store, profile, base, true)).toBe(base);
    queuePassOps(store, profile, [op(1)]); const before = raw(store);
    applyPolicyImport(store, profile, planPolicyImport(store, profile, base, true), {}, true);
    expect(raw(store)).toBe(before);
    await importProfileData(store, profile, { format: "gacha-tracker-export", version: 1 }, {}, true);
    expect(raw(store)).toBe(before);
  });

  test("same-profile union queues only new IDs, preserves pending and repeated file is no-op (1,3,8)", async () => {
    const source = new Store(), target = new Store();
    queuePassOps(source, profile, [op(1), op(2)]);
    queuePassOps(target, profile, [op(1), op(3)]);
    await syncPasses(target, profile, () => true, cloud().transport, true);
    const file = buildProfileExport(source, profile, undefined, true);
    const plan = planPolicyImport(target, profile, file, true);
    expect(plan.passes?.choicesRequired).toEqual([]);
    applyPolicyImport(target, profile, plan, {}, true);
    expect(readPasses(target, profile).ops).toEqual([op(1), op(2), op(3)]);
    expect(readPasses(target, profile).pending).toEqual([id(2)]);
    const before = new Map(target.values), writes = target.writes;
    await importProfileData(target, profile, file, {}, true);
    expect(target.values).toEqual(before); expect(target.writes).toBe(writes);
  });

  test("cross-profile import D6 both choices are idempotent; target-only region stays (D6,8)", async () => {
    for (const choice of ["current", "imported"] as const) {
      const source = new Store(), target = new Store();
      queuePassOps(source, guest, [op(1), op(4, { game: "zzz" })]);
      queuePassOps(target, profile, [op(2, { days: 60 }), op(3, { region: "europe" })]);
      const file = buildProfileExport(source, guest, undefined, true);
      const plan = planPolicyImport(target, profile, file, true);
      const before = new Map(target.values);
      expect(() => applyPolicyImport(target, profile, plan, {}, true, now + 1)).toThrow(PassChoicesRequired);
      expect(target.values).toEqual(before); // No partial CZN/personal import either.
      applyPolicyImport(target, profile, plan, { genshin: choice }, true, now + 1);
      const state = readPasses(target, profile);
      expect(reducePass(state.ops, "genshin", "asia").lastDay).toBe(addDays(day, choice === "current" ? 59 : 29));
      expect(reducePass(state.ops, "genshin", "europe").lastDay).toBe(addDays(day, 29));
      expect(state.ops.some(o => o.opId === id(1))).toBe(false);
      expect(state.ops.some(o => o.opId === id(4))).toBe(true);
      const applied = new Map(target.values), writes = target.writes;
      applyPolicyImport(target, profile, planPolicyImport(target, profile, file, true), {}, true, now + 2);
      expect(target.values).toEqual(applied); expect(target.writes).toBe(writes);
      // Export/restore the target retains its D6 receipt and source recovery ops.
      const restored = new Store(); const targetFile = buildProfileExport(target, profile, undefined, true);
      await importProfileData(restored, profile, targetFile, {}, true);
      const restoredBefore = raw(restored);
      await importProfileData(restored, profile, file, {}, true);
      expect(raw(restored)).toBe(restoredBefore);
    }
  });

  test("malformed v2 / inconsistent profile / ID collision is refused before any write (7,8)", async () => {
    const store = new Store(); queuePassOps(store, profile, [op(1)]);
    const file = buildProfileExport(store, profile, undefined, true);
    for (const input of [{ ...file, extra: true }, { ...file, formatVersion: 3 },
      { ...file, passes: { ...readPasses(store, profile), profileId: guest } },
      { ...file, passes: { ...readPasses(store, profile), pending: [id(9)] } }]) {
      const before = new Map(store.values);
      await expect(importProfileData(store, profile, input, {}, true)).rejects.toThrow();
      expect(store.values).toEqual(before);
    }
    const clash = buildProfileExport(store, profile, undefined, true);
    // Seed another device with the conflicting immutable op.
    store.values.clear(); queuePassOps(store, profile, [op(1, { days: 31 })]);
    const before = new Map(store.values);
    await expect(importProfileData(store, profile, clash, {}, true)).rejects.toThrow("reused");
    expect(store.values).toEqual(before);
  });

  test("crash between pass import and CZN write retries without another set or +30 (3,8,D6)", () => {
    const source = new Store(), target = new Store();
    queuePassOps(source, guest, [op(1)]); queuePassOps(target, profile, [op(2, { days: 60 })]);
    const file = buildProfileExport(source, guest, undefined, true);
    const plan = planPolicyImport(target, profile, file, true);
    const failing = { get length() { return target.length; }, key: (n: number) => target.key(n), getItem: (key: string) => target.getItem(key), setItem: (key: string, value: string) => {
      if (!key.startsWith(`${profileKeys(profile).passes}:`)) throw new Error("CZN quota");
      target.setItem(key, value);
    } };
    expect(() => applyPolicyImport(failing, profile, plan, { genshin: "imported" }, true, now + 1)).toThrow("CZN quota");
    const durable = raw(target);
    applyPolicyImport(target, profile, plan, { genshin: "imported" }, true, now + 2);
    expect(raw(target)).toBe(durable);
    expect(readPassViews(target, profile, now)[0]?.view).toMatchObject({ remainingDays: 30 });
  });
});

describe("PASS-2 D6 confirmation", () => {
  test("foreign import re-pulls after confirmation, clears stale decisions and honors a repeat receipt", async () => {
    const source = new Store(), target = new Store(), server = cloud();
    queuePassOps(source, guest, [op(1), op(2, { game: "czn", region: "europe" })]);
    await server.transport.push(profile, [op(3, { days: 60 }), op(4, { game: "czn", region: "europe", days: 60 })]);
    const personal = buildExportData({}, {}, {}, { games: {}, events: {} });
    const file = buildProfileExport(source, guest, personal, true);
    const requests: boolean[] = [];
    const result = await importWithPassChoices(target, profile, file, () => true, async (plan, updated) => {
      expect(plan.choicesRequired).toEqual(["czn", "genshin"]);
      requests.push(updated);
      if (!updated) {
        await server.transport.push(profile, [op(5)]);
        return { genshin: "imported", czn: "current" };
      }
      return { genshin: "current", czn: "imported" };
    }, server.transport);
    expect(result).toEqual({ personal });
    expect(requests).toEqual([false, true]);
    const applied = readPasses(target, profile);
    expect(reducePass(applied.ops, "genshin", "asia").lastDay).toBe(addDays(day, 89));
    expect(reducePass(applied.ops, "czn", "europe").lastDay).toBe(addDays(day, 29));
    expect(applied.ops.some(row => row.opId === id(1) || row.opId === id(2))).toBe(false);
    expect(applied.imports).toHaveLength(1);
    const repeat = await importWithPassChoices(target, profile, file, () => true, async () => {
      throw new Error("A replay must not ask for a fresh decision");
    }, { ...server.transport, pull: async () => { throw new Error("A replay must not need a cloud pull"); } });
    expect(repeat).toEqual({ personal });
    expect(readPasses(target, profile)).toEqual(applied);
    expect(readPasses(source, guest).ops).toEqual([op(1), op(2, { game: "czn", region: "europe" })]);
  });

  test("cancel, offline revalidation, and a session switch during import leave no transfer or personal import", async () => {
    const source = new Store(); queuePassOps(source, guest, [op(1)]);
    const file = buildProfileExport(source, guest, { version: 1 }, true);
    for (const outcome of ["cancel", "offline", "switch"] as const) {
      const target = new Store(), server = cloud(); let active = true;
      await server.transport.push(profile, [op(2)]);
      let pullCount = 0;
      const transport = { ...server.transport, pull: async () => {
        if (++pullCount === 2) {
          if (outcome === "offline") throw new Error("Network unavailable");
          active = false;
          return [op(2), op(3)];
        }
        return server.ops();
      } };
      const imported = importWithPassChoices(target, profile, file, () => active, async () =>
        outcome === "cancel" ? null : { genshin: "imported" }, transport);
      if (outcome === "cancel") expect(await imported).toBeNull();
      else await expect(imported).rejects.toThrow(outcome === "offline" ? "Network unavailable" : "profile changed");
      const result = readPasses(target, profile);
      expect(result.ops).toEqual([op(2)]);
      expect(result.pending).toEqual([]);
      expect(result.imports).toEqual([]);
      expect(readCzn(target, profile).imports).toEqual([]);
    }
  });

  test("first login rejects stale target and guest choices before durable writes; refreshed choices apply exactly once", async () => {
    const legacy = stubFirstLoginLegacy();
    try {
      for (const selection of ["current", "imported"] as const) {
        const store = new Store(), server = cloud(); queuePassOps(store, guest, [op(1)]);
        await server.transport.push(profile, [op(2, { days: 60 })]);
        let active = true;
        const finish = (plan?: NonNullable<Awaited<ReturnType<typeof planFirstLoginPasses>>>, transport = server.transport) =>
          completeFirstLogin(store, profile, owner, guest, blank(), emptySyncState(), "merge", "cloud",
            () => active, { enabled: true, transport, ...(plan ? { plan, choices: { genshin: selection } } : {}) });
        await expect(finish()).rejects.toBeInstanceOf(PassChoicesRequired);
        const original = (await planFirstLoginPasses(store, profile, guest, () => true, server.transport, true))!;
        await server.transport.push(profile, [op(3)]);
        await expect(finish(original)).rejects.toBeInstanceOf(PassPlanChanged);
        const revised = (await planFirstLoginPasses(store, profile, guest, () => true, server.transport, true))!;
        queuePassOps(store, guest, [op(4, { days: 10 })]);
        await expect(finish(revised)).rejects.toBeInstanceOf(PassPlanChanged);
        const guestBefore = raw(store, guest);
        const confirmed = (await planFirstLoginPasses(store, profile, guest, () => true, server.transport, true))!;
        await expect(finish(confirmed, { ...server.transport, pull: async () => {
          active = false; return [...server.ops(), op(5)];
        } })).rejects.toThrow("session changed");
        expect(readAccountBinding(store, profile, owner)).toBe(false);
        expect(readPasses(store, profile).imports).toEqual([]);
        expect(readPasses(store, profile).ops.map(row => row.opId)).toEqual([id(2), id(3)]);
        expect(readCzn(store, profile).imports).toEqual([]);
        active = true;
        await finish(confirmed);
        expect(readAccountBinding(store, profile, owner)).toBe(true);
        expect(reducePass(readPasses(store, profile).ops, "genshin", "asia").lastDay)
          .toBe(addDays(day, selection === "current" ? 89 : 39));
        expect(raw(store, guest)).toBe(guestBefore);
      }
    } finally { legacy.restore(); }
  });

  test("first login sees a competing receipt at apply and waits for a no-choice resume", async () => {
    const store = new Store(), server = cloud(), legacy = stubFirstLoginLegacy();
    const cloudOp = op(2, { days: 60 });
    try {
      queuePassOps(store, guest, [op(1)]);
      await server.transport.push(profile, [cloudOp]);
      const active = () => true;
      const displayed = (await planFirstLoginPasses(store, profile, guest, active, server.transport, true))!;
      expect(displayed.choicesRequired).toEqual(["genshin"]);
      const guestBefore = raw(store, guest);
      const concurrentTransport: PassTransport = { ...server.transport, pull: async () => {
        // The planner reads the target first. The other confirmation writes its
        // receipt before completeFirstLogin resumes with the returned snapshot.
        queueMicrotask(() => queueMicrotask(() => { applyPassTransfer(store, displayed, { genshin: "current" }, now); }));
        return server.ops();
      } };
      const confirmation = completeFirstLogin(store, profile, owner, guest, blank(), emptySyncState(), "merge", "cloud", active,
        { enabled: true, transport: concurrentTransport, plan: displayed, choices: { genshin: "imported" } });
      await expect(confirmation).rejects.toBeInstanceOf(PassPlanChanged);
      await expect(confirmation).rejects.toMatchObject({ plan: { alreadyApplied: true, choicesRequired: [] } });
      expect(readAccountBinding(store, profile, owner)).toBe(false);
      expect(pendingPlan(store, profile, owner, guest)).toBeNull();
      expect(legacy.negotiate).not.toHaveBeenCalled();
      expect(legacy.rpc).not.toHaveBeenCalled();
      const saved = readPasses(store, profile);
      expect(saved.ops).toEqual([cloudOp]);
      expect(saved.imports).toHaveLength(1);
      const savedFacts = raw(store);

      await completeFirstLogin(store, profile, owner, guest, blank(), emptySyncState(), "merge", "cloud", active,
        { enabled: true, transport: server.transport, plan: displayed, choices: {} });
      expect(readAccountBinding(store, profile, owner)).toBe(true);
      expect(raw(store)).toBe(savedFacts);
      expect(raw(store, guest)).toBe(guestBefore);
    } finally { legacy.restore(); }
  });
});
