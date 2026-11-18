import { z } from "zod";
import {
  DEFAULT_PASS_DAYS, PassOp, PassOpId, PassOpIdReused, passDay, passOpFromRow,
  reducePasses, passView, samePassOp, unionPassOps,
} from "../../shared/dailyPasses.ts";
import type { Region } from "../../shared/schema.ts";
import { profileKeys } from "../state/storage.ts";
import { supabase } from "./remote.ts";

/** Operator activation is a separate release decision. No pass network/export/import when off. */
export const DAILY_PASSES_ENABLED = true;
export function passErrorMessage(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error ? String(error.message) : String(error);
}
export type PassStore = Pick<Storage, "getItem" | "setItem" | "key" | "length">;
const heldSchema = z.object({ opId: PassOpId, remote: z.array(PassOp) }).strict();
const recoverySchema = z.array(z.object({ key: z.string(), raw: z.string() }).strict());
const localSchema = z.object({
  version: z.literal(1), profileId: z.string(), ops: z.array(PassOp), pending: z.array(PassOpId),
  held: heldSchema.nullable(), imports: z.array(z.string()), recovery: recoverySchema.default([]),
}).strict();
export type PassLocal = z.infer<typeof localSchema>;
export const PassLocalSchema = localSchema;
const intentSchema = z.object({ receipt: z.string().nullable(), ops: z.array(PassOp), imports: z.array(z.string()) }).strict();
export const passPrefix = (profileId: string) => `${profileKeys(profileId).passes}:`;
export class PassDataUnreadable extends Error {
  override name = "PassDataUnreadable";
  constructor(readonly recovery: PassLocal["recovery"]) { super("Pass data is unreadable; export recovery before review"); }
}
export function assertPassWritable(state: PassLocal): void {
  if (state.recovery.length) throw new PassDataUnreadable(state.recovery);
  if (state.held) throw new PassOpIdReused(state.held.opId);
}
export function validatePassLocal(input: unknown, profileId: string): PassLocal {
  const state = localSchema.parse(input);
  profileKeys(profileId);
  if (state.profileId !== profileId) throw new Error("Pass profile mismatch");
  const ops = unionPassOps([], state.ops);
  if (new Set(state.pending).size !== state.pending.length ||
      state.pending.some(id => !ops.some(op => op.opId === id))) throw new Error("Invalid pass pending IDs");
  return { ...state, ops };
}
function writeFact(store: PassStore, key: string, raw: string): void {
  const old = store.getItem(key);
  if (old === raw) return;
  if (old !== null) throw new PassDataUnreadable([{ key, raw: old }]);
  store.setItem(key, raw);
}
/** FNV-1a 64 over UTF-8: bounded synchronous fact identity in browsers/Bun.
 * Hashes select keys only; writeFact still compares the complete stored value. */
function factHash(raw: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(raw)) {
    hash = ((hash ^ BigInt(byte)) * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}
function holdCollision(store: PassStore, profileId: string, op: PassOp): void {
  const held = { opId: op.opId, remote: [op] };
  const raw = JSON.stringify(held);
  writeFact(store, `${passPrefix(profileId)}hold:${factHash(raw)}`, raw);
}
function writeOp(store: PassStore, profileId: string, op: PassOp): void {
  const key = `${passPrefix(profileId)}op:${op.opId}`, old = store.getItem(key);
  if (old !== null) {
    let prior: PassOp;
    try { prior = PassOp.parse(JSON.parse(old)); }
    catch { throw new PassDataUnreadable([{ key, raw: old }]); }
    if (samePassOp(prior, op)) return;
    holdCollision(store, profileId, op);
    throw new PassOpIdReused(op.opId);
  }
  store.setItem(key, JSON.stringify(op));
}
/** Enumerated immutable facts, never a shared read/modify/write snapshot.
 * Intents contain the exact generated IDs and ops and roll forward on read.
 * Invalid facts remain untouched and are exported verbatim as recovery. */
export function readPasses(store: PassStore, profileId: string): PassLocal {
  const prefix = passPrefix(profileId), state: PassLocal = {
    version: 1, profileId, ops: [], pending: [], held: null, imports: [], recovery: [],
  };
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  const acked = new Set<string>(), intents: z.infer<typeof intentSchema>[] = [];
  for (const key of keys.sort()) {
    const raw = store.getItem(key);
    if (raw === null) continue;
    const suffix = key.slice(prefix.length);
    try {
      if (suffix.startsWith("op:")) {
        const op = PassOp.parse(JSON.parse(raw));
        if (suffix !== `op:${op.opId}`) throw new Error("Op key mismatch");
        state.ops.push(op);
      } else if (suffix.startsWith("ack:")) {
        const id = PassOpId.parse(suffix.slice(4));
        if (raw !== "accepted") throw new Error("Invalid ACK fact");
        acked.add(id);
      } else if (suffix.startsWith("intent:")) {
        const intent = intentSchema.parse(JSON.parse(raw));
        if (suffix !== `intent:${factHash(raw)}`) throw new Error("Receipt key mismatch");
        unionPassOps([], intent.ops);
        intents.push(intent);
        if (intent.receipt !== null) state.imports.push(intent.receipt);
        state.imports.push(...intent.imports);
      } else if (suffix.startsWith("hold:")) {
        const held = heldSchema.parse(JSON.parse(raw));
        if (suffix !== `hold:${factHash(raw)}`) throw new Error("Hold key mismatch");
        state.held = { opId: state.held?.opId ?? held.opId, remote: [...(state.held?.remote ?? []), ...held.remote] };
      } else throw new Error("Unknown pass fact");
    } catch { state.recovery.push({ key, raw }); }
  }
  // Include unmaterialized intent ops in recovery exports even when another
  // corrupt fact/hold prevents roll-forward writes. The intent itself is durable.
  const byId = new Map(state.ops.map(op => [op.opId, op]));
  for (const intent of intents) for (const op of intent.ops) {
    const prior = byId.get(op.opId);
    if (prior && !samePassOp(prior, op)) {
      state.held = { opId: state.held?.opId ?? op.opId, remote: [...(state.held?.remote ?? []), op] };
    } else if (!prior) byId.set(op.opId, op);
  }
  state.ops = [...byId.values()];
  if (!state.recovery.length && !state.held) {
    replay: for (const intent of intents) for (const op of intent.ops) {
      try { writeOp(store, profileId, op); }
      catch (error) {
        if (error instanceof PassOpIdReused) return readPasses(store, profileId); // Durable collision, no further replay.
        if (error instanceof PassDataUnreadable) throw error; // Content failure, not a failed storage write.
        // Best effort only: the durable intent already supplies every op above.
        // Quota/storage failure must leave reads and recovery exports available.
        break replay;
      }
    }
  }
  state.ops = unionPassOps([], state.ops);
  state.imports = [...new Set(state.imports)];
  state.pending = state.ops.filter(op => !acked.has(op.opId)).map(op => op.opId);
  return state;
}
/** Intent first, then exact op keys. Retry/read completes partial writes. */
export function persistPassIntent(store: PassStore, profileId: string, receipt: string | null, ops: PassOp[], imports: string[] = []): void {
  const intent = intentSchema.parse({ receipt, ops: unionPassOps([], ops), imports: [...new Set(imports)].sort() });
  const raw = JSON.stringify(intent);
  writeFact(store, `${passPrefix(profileId)}intent:${factHash(raw)}`, raw);
  for (const op of intent.ops) writeOp(store, profileId, op);
}
/** Additive helper; absence in a snapshot never deletes or acknowledges a fact. */
export function savePasses(store: PassStore, input: PassLocal): void {
  const state = validatePassLocal(input, input.profileId);
  for (const op of state.ops) writeOp(store, state.profileId, op);
  if (state.held) for (const op of state.held.remote) holdCollision(store, state.profileId, op);
  const existing = readPasses(store, state.profileId).imports;
  for (const receipt of state.imports) {
    if (!existing.includes(receipt)) persistPassIntent(store, state.profileId, receipt, []);
  }
}
export function queuePassOps(store: PassStore, profileId: string, incoming: readonly PassOp[]): PassLocal {
  const state = readPasses(store, profileId); assertPassWritable(state);
  const valid = unionPassOps([], incoming);
  try { unionPassOps(state.ops, valid); }
  catch (error) {
    if (error instanceof PassOpIdReused) {
      for (const op of valid) {
        const prior = state.ops.find(o => o.opId === op.opId);
        if (prior && !samePassOp(prior, op)) holdCollision(store, profileId, op);
      }
    }
    throw error;
  }
  const added = valid.filter(op => !state.ops.some(old => old.opId === op.opId));
  if (added.length > 1) persistPassIntent(store, profileId, null, added);
  else for (const op of added) writeOp(store, profileId, op);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("account-sync-local-change", { detail: profileId }));
  return readPasses(store, profileId);
}

function common(game: string, region: Region, now: number) {
  return { opId: crypto.randomUUID(), game, region, actionDay: passDay(now, game, region),
    createdAt: new Date(now).toISOString() };
}
export function extendPass(store: PassStore, profileId: string, game: string, region: Region,
  days = DEFAULT_PASS_DAYS, now = Date.now()): PassOp {
  const op = PassOp.parse({ ...common(game, region, now), kind: "extend", days });
  queuePassOps(store, profileId, [op]); return op;
}
/** All seen IDs for this lane, including undo/resolve. >500 fails visibly; never truncate. */
export function createPassSet(ops: readonly PassOp[], game: string, region: Region,
  lastDay: string | null, now: number): PassOp {
  return PassOp.parse({ ...common(game, region, now), kind: "set", lastDay,
    basedOn: ops.filter(op => op.game === game && op.region === region).map(op => op.opId) });
}
export function setPass(store: PassStore, profileId: string, game: string, region: Region,
  lastDay: string | null, now = Date.now()): PassOp {
  const op = createPassSet(readPasses(store, profileId).ops, game, region, lastDay, now);
  queuePassOps(store, profileId, [op]); return op;
}
export function undoPass(store: PassStore, profileId: string, targetOp: string, now = Date.now()): PassOp {
  const target = readPasses(store, profileId).ops.find(op => op.opId === targetOp);
  if (!target || target.kind === "undo") throw new Error("Invalid pass undo target");
  const op = PassOp.parse({ ...common(target.game, target.region, now), kind: "undo", targetOp });
  queuePassOps(store, profileId, [op]); return op;
}
export function resolvePass(store: PassStore, profileId: string, targetOp: string,
  resolution: "include" | "exclude", now = Date.now()): PassOp {
  const target = readPasses(store, profileId).ops.find(op => op.opId === targetOp);
  if (!target || target.kind !== "extend") throw new Error("Invalid pass resolve target");
  const op = PassOp.parse({ ...common(target.game, target.region, now), kind: "resolve", targetOp, resolution });
  queuePassOps(store, profileId, [op]); return op;
}
export function readPassViews(store: PassStore, profileId: string, now = Date.now()) {
  return [...reducePasses(readPasses(store, profileId).ops)].map(([key, state]) =>
    ({ key, state, view: passView(state, now) }));
}

export type PassTransport = {
  push: (profileId: string, ops: PassOp[]) => Promise<unknown>;
  pull: (profileId: string) => Promise<PassOp[]>;
};
/** A conservative upper bound on jsonb storage, including container/JEntry overhead.
 * JSON UTF-8 alone is insufficient: the server checks pg_column_size(jsonb). */
export function passBatchBytes(ops: readonly PassOp[]): number {
  const nodes = (v: unknown): number => Array.isArray(v) ? 1 + v.reduce((n, x) => n + nodes(x), 0) :
    v !== null && typeof v === "object" ? 1 + Object.values(v).reduce<number>((n, x) => n + 1 + nodes(x), 0) : 1;
  return new TextEncoder().encode(JSON.stringify(ops)).length + 32 * nodes(ops);
}
export function passBatches(ops: readonly PassOp[]): PassOp[][] {
  const batches: PassOp[][] = [];
  let batch: PassOp[] = [];
  const priority = (op: PassOp) => op.kind === "set" ? 0 : op.kind === "extend" ? 2 : 1;
  // unionPassOps sorts by ID. Stable grouping protects partial multi-RPC pushes:
  // sets apply before basedOn arrives; undo/resolve await missing targets.
  const ordered = unionPassOps([], ops).sort((a, b) => priority(a) - priority(b));
  for (const op of ordered) {
    if (batch.length === 100 || passBatchBytes([...batch, op]) > 256 * 1024) {
      if (batch.length) batches.push(batch);
      batch = [];
    }
    if (passBatchBytes([op]) > 256 * 1024) throw new Error("Pass op exceeds batch limit");
    batch.push(op);
  }
  if (batch.length) batches.push(batch);
  return batches;
}
export function createPassTransport(client: Pick<typeof supabase, "rpc" | "from">): PassTransport { return {
  push: async (profileId, ops) => {
    const { data, error } = await client.rpc("daily_pass_apply", { p_profile_id: profileId, p_ops: ops });
    if (error) throw error;
    return data;
  },
  pull: async profileId => {
    const ops: PassOp[] = [];
    let after: string | undefined;
    for (;;) {
      let query = client.from("daily_pass_ops").select("*").eq("profile_id", profileId).order("op_id").limit(500);
      if (after !== undefined) query = query.gt("op_id", after);
      const { data, error } = await query;
      if (error) throw error;
      for (const row of data ?? []) {
        if (row.profile_id !== profileId) throw new Error("Pass remote profile mismatch");
        ops.push(passOpFromRow(row));
      }
      if (!data?.length) return ops;
      const next = ops.at(-1)!.opId;
      if (after !== undefined && next <= after) throw new Error("Invalid pass pagination");
      after = next;
    }
  },
}; }
export const passRemote = createPassTransport(supabase);
const ackSchema = z.array(z.object({ opId: PassOpId, outcome: z.literal("accepted") }).strict());
export function acceptedPassIds(reply: unknown, sent: readonly PassOp[]): string[] {
  const acks = ackSchema.parse(reply);
  const ids = acks.map(ack => ack.opId);
  if (ids.length !== sent.length || new Set(ids).size !== ids.length ||
      ids.some(id => !sent.some(op => op.opId === id))) throw new Error("Unrecognized pass acknowledgement");
  return ids;
}
export function mergePulledPasses(store: PassStore, profileId: string, remote: PassOp[],
  accepted: ReadonlySet<string> = new Set()): PassLocal {
  const latest = readPasses(store, profileId); assertPassWritable(latest);
  const incoming = unionPassOps([], remote);
  try { unionPassOps(latest.ops, incoming); }
  catch (error) {
    if (error instanceof PassOpIdReused) {
      for (const op of incoming) {
        const local = latest.ops.find(o => o.opId === op.opId);
        if (local && !samePassOp(local, op)) holdCollision(store, profileId, op);
      }
    }
    throw error;
  }
  for (const op of incoming) {
    const existed = latest.ops.some(old => old.opId === op.opId);
    writeOp(store, profileId, op);
    // Existing pending ops require an explicit accepted reply, even if pulled.
    if (!existed || accepted.has(op.opId)) writeFact(store, `${passPrefix(profileId)}ack:${op.opId}`, "accepted");
  }
  for (const id of accepted) {
    if (latest.ops.some(op => op.opId === id)) writeFact(store, `${passPrefix(profileId)}ack:${id}`, "accepted");
  }
  return readPasses(store, profileId);
}
/** Re-read after every await. No ACK is committed until the complete pull/union succeeds.
 * A lost reply/session/storage write safely replays the identical IDs next time. */
export async function syncPasses(store: PassStore, profileId: string, active: () => boolean,
  transport: PassTransport = passRemote, enabled = DAILY_PASSES_ENABLED): Promise<void> {
  if (!enabled) return;
  if (profileId.startsWith("local:")) throw new Error("Guest passes cannot sync directly");
  const check = () => { if (!active()) throw new Error("Pass account session changed"); };
  check();
  assertPassWritable(readPasses(store, profileId));
  const before = unionPassOps([], await transport.pull(profileId)); check();
  const state = mergePulledPasses(store, profileId, before);
  const accepted = new Set<string>();
  for (const batch of passBatches(state.ops.filter(op => state.pending.includes(op.opId)))) {
    const reply = await transport.push(profileId, batch); check();
    for (const id of acceptedPassIds(reply, batch)) accepted.add(id);
  }
  const remote = unionPassOps([], await transport.pull(profileId)); check();
  mergePulledPasses(store, profileId, remote, accepted);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("account-sync-remote-change", { detail: profileId }));
}
