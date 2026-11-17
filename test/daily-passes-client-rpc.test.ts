import { beforeAll, afterAll, expect, test } from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import { passesCandidateDatabase } from "../scripts/daily-passes/contract.ts";
import { PassOp, addDays, passDay } from "../src/shared/dailyPasses.ts";
import { defaults } from "../src/client/state/usePrefs.ts";
import { writeAccountCache } from "../src/client/account/firstLogin.ts";
import { initializeAccountProfile, captureAccountWrite, readOutbox } from "../src/client/account/localSync.ts";
import { profileKeys } from "../src/client/state/storage.ts";
import { applyMutation, emptySyncState, type SyncMutation } from "../src/shared/sync.ts";
import { syncProfile } from "../src/client/account/syncEngine.ts";
import {
  createPassTransport, extendPass, passBatchBytes, queuePassOps, readPasses, readPassViews,
  syncPasses, type PassTransport,
} from "../src/client/account/passProtocol.ts";

class Store {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
let db: PGlite, profile: string, otherProfile: string;
const now = Date.parse("2026-10-01T12:00:00Z"), day = passDay(now, "genshin", "asia");
const id = (n: number) => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;
async function as<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
function device() {
  const store = new Store(); writeAccountCache(store, profile, owner, {
    progress: {}, daily: {}, ignored: {}, prefs: defaults(), customGames: {}, customEvents: {},
  }); initializeAccountProfile(store, profile, owner); return store;
}
/** PostgREST-shaped adapter only translates transport calls to real SQL. The
 * production createPassTransport performs the RPC args, paging and row decoding;
 * every DB call runs as authenticated with auth.uid(), never as postgres. */
function transport(uid = owner) {
  const requests: { profileId: string; count: number; bytes: number }[] = [];
  const pages: { profileId: string; after: string | null }[] = [];
  const client = {
    rpc: async (name: string, args: { p_profile_id: string; p_ops: PassOp[] }) => {
      expect(name).toBe("daily_pass_apply");
      const profileId = args.p_profile_id;
      const ops = JSON.stringify(args.p_ops);
      requests.push({ profileId, count: args.p_ops.length,
        bytes: Number((await db.query<{ n: number }>("select pg_column_size($1::jsonb) as n", [ops])).rows[0]!.n) });
      try {
        const data = await as(uid, async () => (await db.query<{ reply: unknown }>(
          "select public.daily_pass_apply($1,$2::jsonb) as reply", [profileId, ops])).rows[0]!.reply);
        return { data, error: null };
      } catch (error) { return { data: null, error }; }
    },
    from: (name: string) => {
      expect(name).toBe("daily_pass_ops");
      let profileId = "", after: string | null = null, limit = 0;
      const query = {
        select: (s: string) => { expect(s).toBe("*"); return query; },
        eq: (key: string, value: string) => { expect(key).toBe("profile_id"); profileId = value; return query; },
        order: (key: string) => { expect(key).toBe("op_id"); return query; },
        limit: (value: number) => { limit = value; return query; },
        gt: (key: string, value: string) => { expect(key).toBe("op_id"); after = value; return query; },
        then: async (resolve: (result: { data: Record<string, unknown>[] | null; error: unknown }) => unknown) => {
          pages.push({ profileId, after });
          try {
            const data = await as(uid, async () => (await db.query<{ row: Record<string, unknown> }>(
              `select to_jsonb(t) as row from public.daily_pass_ops t
               where profile_id=$1 and ($2::uuid is null or op_id>$2::uuid) order by op_id limit $3`,
              [profileId, after, limit])).rows.map(r => r.row));
            return resolve({ data, error: null });
          } catch (error) { return resolve({ data: null, error }); }
        },
      };
      return query;
    },
  };
  return { requests, pages, api: createPassTransport(client as unknown as Parameters<typeof createPassTransport>[0]) };
}
function legacy() {
  let state = emptySyncState(); let pushes = 0;
  return { pushes: () => pushes, api: { authenticate: async () => owner, pull: async () => state,
    push: async (_p: string, rows: SyncMutation[]) => {
      pushes++; for (const row of rows) state = applyMutation(state, row).state;
    } } };
}
beforeAll(async () => {
  db = await passesCandidateDatabase();
  await db.query("insert into auth.users values($1),($2)", [owner, other]);
  profile = await as(owner, async () => String((await db.query<{ id: string }>("select public.ensure_default_profile() as id")).rows[0]!.id));
  otherProfile = await as(other, async () => String((await db.query<{ id: string }>("select public.ensure_default_profile() as id")).rows[0]!.id));
}, 20000);
afterAll(async () => { await db.close(); });

test("PASS-1B real RPC/RLS: two offline devices +30/+30, lost ACK replay, union and convergence (1,2,3,7)", async () => {
  const a = device(), b = device(), remote = transport(), v1 = legacy();
  const x = extendPass(a, profile, "genshin", "asia", undefined, now);
  extendPass(b, profile, "genshin", "asia", undefined, now);
  let dropped = false;
  const crash: PassTransport = { ...remote.api, push: async (p, rows) => {
    await remote.api.push(p, rows); dropped = true; throw new TypeError("reply lost after SQL commit");
  } };
  const failed = await syncProfile(a, profile, owner, () => true, v1.api, { enabled: true, transport: crash });
  expect(dropped).toBe(true); expect(failed.heldPasses).toBeDefined();
  expect(readPasses(a, profile).pending).toEqual([x.opId]);
  const refreshed = new Store(); refreshed.values = new Map(a.values);
  await syncProfile(refreshed, profile, owner, () => true, v1.api, { enabled: true, transport: remote.api });
  await syncProfile(b, profile, owner, () => true, v1.api, { enabled: true, transport: remote.api });
  await syncPasses(refreshed, profile, () => true, remote.api, true);
  expect(readPasses(refreshed, profile).ops).toEqual(readPasses(b, profile).ops);
  expect(readPassViews(refreshed, profile, now)[0]?.view).toMatchObject({ remainingDays: 60, lastDay: addDays(day, 59) });
  expect(readPasses(refreshed, profile).pending).toEqual([]);
  expect((await db.query<{ n: number }>("select count(*)::int as n from public.daily_pass_ops where profile_id=$1", [profile])).rows[0]!.n).toBe(2);
  // Row decoding passed through to_jsonb timestamp rendering and passOpFromRow.
  expect(readPasses(refreshed, profile).ops.every(o => o.createdAt === new Date(now).toISOString())).toBe(true);
});

test("PASS-1B real RPC/RLS: cross-account SELECT empty and RPC denied, no pending loss (7)", async () => {
  const foreign = transport(other), store = device();
  expect(await foreign.api.pull(profile)).toEqual([]);
  queuePassOps(store, profile, [PassOp.parse({ opId: id(1), game: "zzz", region: "asia", kind: "extend",
    actionDay: day, createdAt: new Date(now).toISOString(), days: 30 })]);
  await expect(syncPasses(store, profile, () => true, foreign.api, true)).rejects.toMatchObject({ code: "42501" });
  expect(readPasses(store, profile).pending).toEqual([id(1)]);
  expect(await transport().api.pull(otherProfile)).toEqual([]);
});

test("PASS-1B real rollback revoke EXECUTE: 42501 holds passes while v1 succeeds, reads survive; grant permits retry (3,9)", async () => {
  const store = device(), remote = transport(), v1 = legacy();
  const op = extendPass(store, profile, "zzz", "europe", undefined, now);
  captureAccountWrite(store, profile, "prefs", { ...defaults(), theme: "light" });
  await db.exec("revoke execute on function public.daily_pass_apply(uuid,jsonb) from authenticated");
  try {
    const result = await syncProfile(store, profile, owner, () => true, v1.api, { enabled: true, transport: remote.api });
    expect(result.heldPasses).toContain("permission denied"); expect(result.pending).toBe(0);
    expect(v1.pushes()).toBe(1); expect(readOutbox(store, profileKeys(profile))).toEqual([]);
    expect(readPasses(store, profile).pending).toEqual([op.opId]);
    expect((await remote.api.pull(profile)).length).toBeGreaterThan(0);
  } finally { await db.exec("grant execute on function public.daily_pass_apply(uuid,jsonb) to authenticated"); }
  await syncPasses(store, profile, () => true, remote.api, true);
  expect(readPasses(store, profile).pending).toEqual([]);
});

test("PASS-1B real batches: >500 paged rows, >100 writes and wide basedOn fit server pg_column_size (1,2,3)", async () => {
  const store = new Store(), remote = transport();
  const many = Array.from({ length: 510 }, (_, i) => PassOp.parse({ opId: id(i + 1000), game: "hsr", region: "asia",
    kind: "extend", actionDay: day, createdAt: new Date(now).toISOString(), days: 1 }));
  const wide = Array.from({ length: 30 }, (_, i) => PassOp.parse({ opId: id(i + 2000), game: "hsr", region: "europe",
    kind: "set", actionDay: day, createdAt: new Date(now).toISOString(), lastDay: null,
    basedOn: many.slice(0, 500).map(o => o.opId) }));
  queuePassOps(store, otherProfile, [...many, ...wide]);
  const ownRemote = transport(other);
  await syncPasses(store, otherProfile, () => true, ownRemote.api, true);
  expect(readPasses(store, otherProfile).ops).toHaveLength(540);
  expect(readPasses(store, otherProfile).pending).toEqual([]);
  expect(ownRemote.requests.length).toBeGreaterThan(6);
  expect(ownRemote.requests.every(r => r.count <= 100 && r.bytes <= 262144)).toBe(true);
  expect(ownRemote.pages.length).toBe(3); // 500 + 40 + terminal empty page
  for (const batch of [many.slice(0, 100), wide.slice(0, 2)]) {
    const size = Number((await db.query<{ n: number }>("select pg_column_size($1::jsonb) as n", [JSON.stringify(batch)])).rows[0]!.n);
    expect(passBatchBytes(batch)).toBeGreaterThanOrEqual(size);
  }
  const sentCount = ownRemote.requests.length;
  await syncPasses(store, otherProfile, () => true, ownRemote.api, true);
  expect(ownRemote.requests.length).toBe(sentCount);
  expect(readPasses(store, otherProfile).ops).toHaveLength(540);
  expect(remote.requests).toHaveLength(0);
}, 20000);
