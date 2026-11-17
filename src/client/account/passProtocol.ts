import { z } from "zod";
import {
  DEFAULT_PASS_DAYS, PassOp, PassOpId, PassOpIdReused, passDay, passOpFromRow,
  reducePasses, passView, unionPassOps,
} from "../../shared/dailyPasses.ts";
import type { Region } from "../../shared/schema.ts";
import { profileKeys } from "../state/storage.ts";
import { supabase } from "./remote.ts";

/** Operator activation is a separate release decision. No pass network/export/import when off. */
export const DAILY_PASSES_ENABLED = false;
export function passErrorMessage(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error ? String(error.message) : String(error);
}
export type PassStore = Pick<Storage, "getItem" | "setItem">;
const localSchema = z.object({
  version: z.literal(1), profileId: z.string(), ops: z.array(PassOp), pending: z.array(PassOpId),
  // A collision is not LWW. Retain the pulled copy alongside the untouched local copy.
  held: z.object({ opId: PassOpId, remote: z.array(PassOp) }).strict().nullable(),
  // Durable D6 receipts include the source ops, so a retry never creates another set.
  imports: z.array(z.string()),
}).strict();
export type PassLocal = z.infer<typeof localSchema>;
export const PassLocalSchema = localSchema;

export function validatePassLocal(input: unknown, profileId: string): PassLocal {
  const state = localSchema.parse(input);
  profileKeys(profileId);
  if (state.profileId !== profileId) throw new Error("Pass profile mismatch");
  const ops = unionPassOps([], state.ops);
  if (new Set(state.pending).size !== state.pending.length ||
      state.pending.some(id => !ops.some(op => op.opId === id))) throw new Error("Invalid pass pending IDs");
  return { ...state, ops };
}
export function readPasses(store: PassStore, profileId: string): PassLocal {
  const raw = store.getItem(profileKeys(profileId).passes);
  return validatePassLocal(raw === null ? {
    version: 1, profileId, ops: [], pending: [], held: null, imports: [],
  } : JSON.parse(raw), profileId);
}
export function savePasses(store: PassStore, state: PassLocal): void {
  const valid = validatePassLocal(state, state.profileId);
  // One atomic localStorage write: never show an action whose pending intent was not persisted.
  store.setItem(profileKeys(valid.profileId).passes, JSON.stringify(valid));
}
export function queuePassOps(store: PassStore, profileId: string, incoming: readonly PassOp[]): PassLocal {
  const state = readPasses(store, profileId);
  const ops = unionPassOps(state.ops, incoming);
  const added = ops.filter(op => !state.ops.some(old => old.opId === op.opId));
  const next = { ...state, ops, pending: [...state.pending, ...added.map(op => op.opId)] };
  savePasses(store, next);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("account-sync-local-change", { detail: profileId }));
  return next;
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
  for (const op of unionPassOps([], ops)) {
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
  const latest = readPasses(store, profileId);
  if (latest.held) throw new PassOpIdReused(latest.held.opId);
  let ops: PassOp[];
  try { ops = unionPassOps(latest.ops, remote); }
  catch (error) {
    if (error instanceof PassOpIdReused) savePasses(store, { ...latest, held: { opId: error.opId, remote } });
    throw error;
  }
  const next = { ...latest, ops, pending: latest.pending.filter(id => !accepted.has(id)) };
  savePasses(store, next); return next;
}
/** Re-read after every await. No ACK is committed until the complete pull/union succeeds.
 * A lost reply/session/storage write safely replays the identical IDs next time. */
export async function syncPasses(store: PassStore, profileId: string, active: () => boolean,
  transport: PassTransport = passRemote, enabled = DAILY_PASSES_ENABLED): Promise<void> {
  if (!enabled) return;
  if (profileId.startsWith("local:")) throw new Error("Guest passes cannot sync directly");
  const check = () => { if (!active()) throw new Error("Pass account session changed"); };
  check();
  const state = readPasses(store, profileId);
  if (state.held) throw new PassOpIdReused(state.held.opId);
  const accepted = new Set<string>();
  for (const batch of passBatches(state.ops.filter(op => state.pending.includes(op.opId)))) {
    const reply = await transport.push(profileId, batch); check();
    for (const id of acceptedPassIds(reply, batch)) accepted.add(id);
  }
  const remote = unionPassOps([], await transport.pull(profileId)); check();
  mergePulledPasses(store, profileId, remote, accepted);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("account-sync-remote-change", { detail: profileId }));
}
