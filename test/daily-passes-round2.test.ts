import { expect, test } from "bun:test";
import { PassOp, PassOpIdReused, reducePass, unionPassOps } from "../src/shared/dailyPasses.ts";
import { profileKeys } from "../src/client/state/storage.ts";
import { extendPass, mergePulledPasses, queuePassOps, readPasses, syncPasses, type PassTransport } from "../src/client/account/passProtocol.ts";
import { applyPassTransfer, planFirstLoginPasses, planPassTransfer } from "../src/client/account/passTransfer.ts";
import { buildProfileExport, planPolicyImport } from "../src/client/account/passExport.ts";

const profile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = Date.parse("2026-11-17T12:00:00Z");
const id = (n: number) => `dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12, "0")}`;
const op = (n: number, extra = {}) => PassOp.parse({ opId: id(n), kind: "extend", days: 30,
  game: "genshin", region: "asia", actionDay: "2026-11-17", createdAt: "2026-11-17T11:00:00Z", ...extra });
class Store {
  values = new Map<string, string>();
  writes: [string, string][] = [];
  get length() { return this.values.size; }
  key(n: number) { return [...this.values.keys()][n] ?? null; }
  getItem(k: string) { return this.values.get(k) ?? null; }
  setItem(k: string, v: string) { this.values.set(k, v); this.writes.push([k, v]); }
  removeItem(k: string) { this.values.delete(k); }
}
function cloud(initial: PassOp[] = []) {
  let ops = initial; const pushed: PassOp[][] = [];
  const transport: PassTransport = { pull: async () => ops, push: async (_p, batch) => {
    pushed.push(batch); ops = unionPassOps(ops, batch); return batch.map(o => ({ opId: o.opId, outcome: "accepted" }));
  } };
  return { transport, pushed, ops: () => ops };
}

test("F1 concurrent empty imports and first logins never sum; losing source extends conflict", async () => {
  for (const login of [false, true]) {
    const stores = [new Store(), new Store()];
    for (const [i, store] of stores.entries()) {
      const source = { profileId: `local:source${i}`, ops: [op(i + 1)] };
      queuePassOps(store, source.profileId, source.ops);
      const plan = login ? await planFirstLoginPasses(store, profile, source.profileId, () => true, cloud().transport, true) :
        planPassTransfer(readPasses(store, profile), source);
      const applied = applyPassTransfer(store, plan!, {}, now + i);
      expect(reducePass(applied.ops, "genshin", "asia").lastDay).toBe("2026-12-16");
    }
    const server = cloud();
    for (const store of stores) await syncPasses(store, profile, () => true, server.transport, true);
    const result = reducePass(server.ops(), "genshin", "asia");
    expect(result.lastDay).toBe("2026-12-16");
    expect(result.conflicts).toEqual([id(1)]);
  }
});

test("F1 source conflicts remain visible after empty-target transfer", () => {
  const source = { profileId: "local:source", ops: [op(1), PassOp.parse({ opId: id(2), game: "genshin", region: "asia", actionDay: "2026-11-17", kind: "set",
    lastDay: "2026-12-01", basedOn: [], createdAt: "2026-11-17T11:30:00Z" })] };
  const store = new Store();
  const result = applyPassTransfer(store, planPassTransfer(readPasses(store, profile), source), {}, now);
  expect(reducePass(result.ops, "genshin", "asia")).toMatchObject({ lastDay: "2026-12-01", conflicts: [id(1)] });
  expect(result.ops.filter(o => o.kind === "set")).toHaveLength(2);
});

test("F2 delayed tab propagation in either order preserves every op and eventually pushes it", async () => {
  for (const reverse of [false, true]) {
    const a = new Store(), b = new Store(), server = cloud();
    const x = extendPass(a, profile, "genshin", "asia", 30, now);
    // B starts sync with a stale empty view, while A's +30 has not propagated.
    await syncPasses(b, profile, () => true, server.transport, true);
    const y = extendPass(b, profile, "genshin", "asia", 30, now);
    const writes = reverse ? [...b.writes, ...a.writes] : [...a.writes, ...b.writes];
    for (const [k, v] of writes) { a.values.set(k, v); b.values.set(k, v); }
    for (const s of [a, b]) {
      expect(readPasses(s, profile).ops.map(o => o.opId).sort()).toEqual([x.opId, y.opId].sort());
      await syncPasses(s, profile, () => true, server.transport, true);
    }
    expect(server.ops().map(o => o.opId).sort()).toEqual([x.opId, y.opId].sort());
  }
});

test("F2 transfer intent rolls forward after each interrupted write without re-planning or new IDs", () => {
  for (const cut of [1, 2]) {
    const store = new Store(), source = { profileId: "local:source", ops: [op(1)] };
    const plan = planPassTransfer(readPasses(store, profile), source);
    let writes = 0;
    const failing = Object.create(store) as Store;
    failing.setItem = (k, v) => { if (writes++ === cut) throw new Error("crash"); store.setItem(k, v); };
    expect(() => applyPassTransfer(failing, plan, {}, now)).toThrow("crash");
    const durable = [...store.values.values()].join("\n");
    const recovered = readPasses(store, profile);
    expect(recovered.ops).toHaveLength(2);
    for (const o of recovered.ops) expect(durable).toContain(o.opId);
    const before = new Map(store.values);
    applyPassTransfer(store, plan, {}, now + 1000);
    expect(store.values).toEqual(before);
    expect(reducePass(recovered.ops, "genshin", "asia").lastDay).toBe("2026-12-16");
  }
});

test("F2 only an accepted reply ACKs a preexisting pending op; stale pull cannot ACK it", async () => {
  const store = new Store(); queuePassOps(store, profile, [op(1)]);
  const prefix = `${profileKeys(profile).passes}:`;
  expect(store.writes).toHaveLength(1);
  expect(store.getItem(`${prefix}op:${id(1)}`)).not.toBeNull();
  await expect(syncPasses(store, profile, () => true, {
    pull: async () => [op(1)], push: async () => [],
  }, true)).rejects.toThrow();
  expect(store.getItem(`${prefix}ack:${id(1)}`)).toBeNull();
  const server = cloud([op(1)]);
  await syncPasses(store, profile, () => true, server.transport, true);
  expect(store.getItem(`${prefix}ack:${id(1)}`)).not.toBeNull();
});

test("F3 corrupt facts export verbatim with v1/CZN and refuse the WHOLE automatic import", async () => {
  for (const raw of ["{broken", JSON.stringify({ opId: id(9), days: -1 })]) {
    const store = new Store(), key = `${profileKeys(profile).passes}:op:${id(9)}`;
    store.setItem(key, raw); queuePassOps(store, "local:other", [op(2)]);
    const personal = { progress: { keep: true } };
    const file = buildProfileExport(store, profile, personal, true);
    expect(file).toHaveProperty("personal", personal);
    expect(file).toHaveProperty("passes.recovery", [{ key, raw }]);
    expect(store.getItem(key)).toBe(raw);
    const target = new Store(); const before = new Map(target.values);
    expect(() => planPolicyImport(target, "local:target", file, true)).toThrow("recovery");
    expect(target.values).toEqual(before);
    let calls = 0;
    await expect(syncPasses(store, profile, () => true, { pull: async () => { calls++; return []; },
      push: async () => { calls++; return []; } }, true)).rejects.toMatchObject({ name: "PassDataUnreadable" });
    expect(calls).toBe(0);
  }
});

test("F3 server ID collision is caught before push and retains both copies persistently", async () => {
  const store = new Store(); queuePassOps(store, profile, [op(1), op(2)]);
  const server = cloud([op(1, { days: 31 })]);
  await expect(syncPasses(store, profile, () => true, server.transport, true)).rejects.toBeInstanceOf(PassOpIdReused);
  expect(server.pushed).toEqual([]);
  expect(readPasses(store, profile)).toMatchObject({ ops: [op(1), op(2)], held: { opId: id(1), remote: [op(1, { days: 31 })] } });
  await expect(syncPasses(store, profile, () => true, server.transport, true)).rejects.toBeInstanceOf(PassOpIdReused);
  expect(server.pushed).toEqual([]);
  expect(readPasses(store, profile).pending).toEqual([id(1), id(2)]);
});


test("F2 same-profile multi-op restore rolls forward the original intent and inherited D6 receipts", () => {
  const store = new Store(), source = { profileId: profile, ops: [op(1), op(2)], imports: ["prior-D6-receipt"] };
  const plan = planPassTransfer(readPasses(store, profile), source);
  let writes = 0;
  const failing = Object.create(store) as Store;
  failing.setItem = (k, v) => { if (++writes === 2) throw new Error("crash"); store.setItem(k, v); };
  expect(() => applyPassTransfer(failing, plan, {}, now)).toThrow("crash");
  const recovered = readPasses(store, profile);
  expect(recovered.ops).toEqual(source.ops); expect(recovered.imports).toContain("prior-D6-receipt");
  const before = new Map(store.values);
  applyPassTransfer(store, plan, {}, now + 1000);
  expect(store.values).toEqual(before);
});

test("F2 crash between remote op and ACK leaves a harmless pending replay", async () => {
  const store = new Store(), failing = Object.create(store) as Store;
  failing.setItem = (k, v) => { if (k.includes(":ack:")) throw new Error("crash"); store.setItem(k, v); };
  expect(() => mergePulledPasses(failing, profile, [op(1)])).toThrow("crash");
  expect(readPasses(store, profile).pending).toEqual([id(1)]);
  const server = cloud([op(1)]);
  await syncPasses(store, profile, () => true, server.transport, true);
  expect(server.pushed).toEqual([[op(1)]]); expect(readPasses(store, profile).pending).toEqual([]);
});

test("F3 corrupt neighbour cannot hide unmaterialized intent ops from the recovery export", () => {
  const store = new Store(), plan = planPassTransfer(readPasses(store, profile), { profileId: "local:source", ops: [op(1)] });
  const failing = Object.create(store) as Store;
  failing.setItem = (k, v) => { if (k.includes(":op:")) throw new Error("crash"); store.setItem(k, v); };
  expect(() => applyPassTransfer(failing, plan, {}, now)).toThrow("crash");
  store.setItem(`${profileKeys(profile).passes}:op:${id(9)}`, "broken");
  const file = buildProfileExport(store, profile, undefined, true);
  expect(file).toHaveProperty("passes.ops", readPasses(store, profile).ops);
  expect(readPasses(store, profile).ops).toHaveLength(2);
  expect(file).toHaveProperty("passes.recovery", [{ key: `${profileKeys(profile).passes}:op:${id(9)}`, raw: "broken" }]);
});


test("F2 batch queue rolls forward, single-op replay is immutable, collision keeps both", () => {
  const store = new Store(), failing = Object.create(store) as Store;
  failing.setItem = (k, v) => { if (k.endsWith(id(2))) throw new Error("crash"); store.setItem(k, v); };
  expect(() => queuePassOps(failing, profile, [op(1), op(2)])).toThrow("crash");
  expect(readPasses(store, profile).ops).toEqual([op(1), op(2)]);
  const before = new Map(store.values), writes = store.writes.length;
  queuePassOps(store, profile, [op(1)]);
  expect(store.values).toEqual(before); expect(store.writes).toHaveLength(writes);
  expect(() => queuePassOps(store, profile, [op(1, { days: 31 })])).toThrow(PassOpIdReused);
  expect(store.getItem(`${profileKeys(profile).passes}:op:${id(1)}`)).toBe(before.get(`${profileKeys(profile).passes}:op:${id(1)}`)!);
  expect(readPasses(store, profile).held).toMatchObject({ opId: id(1), remote: [op(1, { days: 31 })] });
});
