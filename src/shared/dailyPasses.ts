/**
 * Paid daily passes (Genshin Welkin and its equivalents): the PASS-1A domain.
 *
 * Accepted contract: docs/tasks/DAILY-PASSES.md § "Accepted PASS-0 contract".
 * A pass is never stored as state. Each profile owns an immutable SET of
 * operations (`public.daily_pass_ops`), and every device derives the same pass
 * from the same set with the pure reducer below, whatever order the operations
 * arrived in. Nothing here touches daily marks, preferences, CZN rows, event IDs
 * or existing day keys.
 *
 * Day arithmetic is calendar arithmetic on `YYYY-MM-DD` game-day keys, never on
 * millisecond durations: a pass ends on a server-day boundary, which moves with
 * the game's reset clock and the reader's region.
 */
import { z } from "zod";
import { Region } from "./schema.ts";
import { dayKey } from "./daily.ts";
import { dayStartMs, DAY } from "./time.ts";
import { cznDayKey, cznDayStart } from "./cznDaily.ts";
import { CustomGameId, RESERVED_ID_SEGMENTS, isCustomGameId } from "./custom.ts";
import { GAMES } from "./games.ts";
import type { GameId } from "./schema.ts";

/** D2: one `+N` tap is 30 days unless the game's standard period says otherwise. */
export const DEFAULT_PASS_DAYS = 30;
export const MAX_PASS_OP_DAYS = 180;
export const MAX_BASED_ON = 500;

// ---------------------------------------------------------------------------
// Wire validation. Mirrors the SQL candidate's checks exactly; a value one side
// accepts and the other refuses would strand an op in a device's pending queue.
// ---------------------------------------------------------------------------

/** Canonical lowercase UUID: the RPC replies with this spelling, so ACKs match. */
export const PassOpId = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

/** A built-in game ID by FORMAT (D7), so a new built-in game needs no SQL change. */
const BUILTIN_GAME_FORMAT = /^[a-z][a-z0-9]{0,31}$/;

export function isPassGameId(id: string): boolean {
  if (BUILTIN_GAME_FORMAT.test(id)) {
    return !(RESERVED_ID_SEGMENTS as readonly string[]).includes(id);
  }
  return CustomGameId.safeParse(id).success;
}
export const PassGameId = z.string().refine(isPassGameId, { message: "invalid pass game id" });

/** A real calendar day `YYYY-MM-DD`, year 0001–9999 (PostgreSQL `make_date`). */
export function isPassDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day.startsWith("0000")) return false;
  const ms = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === day;
}
export const PassDay = z.string().refine(isPassDay, { message: "invalid game day" });

/**
 * Client clock at the click, millisecond precision with an explicit offset.
 * Used only as a tie-break and for diagnostics, never for day arithmetic.
 */
export function isPassInstant(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,3})?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/.test(value) &&
    isPassDay(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}
export const PassInstant = z.string().refine(isPassInstant, { message: "invalid instant" });

const common = {
  opId: PassOpId,
  game: PassGameId,
  region: Region,
  actionDay: PassDay,
  createdAt: PassInstant,
};

export const PassExtend = z
  .object({ ...common, kind: z.literal("extend"), days: z.number().int().min(1).max(MAX_PASS_OP_DAYS) })
  .strict();
export const PassSet = z
  .object({
    ...common,
    kind: z.literal("set"),
    /** Inclusive last active game-day, or null for "no pass". */
    lastDay: PassDay.nullable(),
    /** Op IDs this device had seen for this pass when the user corrected it. */
    basedOn: z.array(PassOpId).max(MAX_BASED_ON),
  })
  .strict();
export const PassUndo = z.object({ ...common, kind: z.literal("undo"), targetOp: PassOpId }).strict();
export const PassResolve = z
  .object({
    ...common,
    kind: z.literal("resolve"),
    targetOp: PassOpId,
    resolution: z.enum(["include", "exclude"]),
  })
  .strict();

export const PassOp = z
  .discriminatedUnion("kind", [PassExtend, PassSet, PassUndo, PassResolve])
  .superRefine((op, ctx) => {
    if ((op.kind === "undo" || op.kind === "resolve") && op.targetOp === op.opId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "an op cannot target itself" });
    }
    if (op.kind === "set" && new Set(op.basedOn).size !== op.basedOn.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "basedOn must be distinct" });
    }
  })
  // The server stores basedOn sorted; normalize here so content comparison and
  // re-serialization agree with what a pull returns.
  .transform((op) => (op.kind === "set" ? { ...op, basedOn: [...op.basedOn].sort() } : op));
export type PassOp = z.infer<typeof PassOp>;
export type PassExtend = z.infer<typeof PassExtend>;
export type PassSet = z.infer<typeof PassSet>;

/**
 * Same op content, compared semantically: `createdAt` as an instant (a pull
 * returns PostgreSQL's spelling of the offset) and `basedOn` as a set.
 */
export function samePassOp(a: PassOp, b: PassOp): boolean {
  const norm = (op: PassOp) => {
    const fields: Record<string, unknown> = { ...op, createdAt: Date.parse(op.createdAt) };
    if (op.kind === "set") fields.basedOn = [...op.basedOn].sort();
    return JSON.stringify(Object.keys(fields).sort().map((k) => [k, fields[k]]));
  };
  return norm(a) === norm(b);
}

/** A `daily_pass_ops` row (`to_jsonb`/PostgREST column names) as a wire op. */
export function passOpFromRow(row: Record<string, unknown>): PassOp {
  const common = {
    opId: row.op_id, game: row.game, region: row.region, kind: row.kind, actionDay: row.action_day,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
  switch (row.kind) {
    case "extend": return PassOp.parse({ ...common, days: row.days });
    case "set": return PassOp.parse({ ...common, lastDay: row.last_day, basedOn: row.based_on });
    case "undo": return PassOp.parse({ ...common, targetOp: row.target_op });
    default: return PassOp.parse({ ...common, targetOp: row.target_op, resolution: row.resolution });
  }
}

export class PassOpIdReused extends Error {
  constructor(readonly opId: string) {
    super("daily pass op ID reused with different content");
  }
}

/**
 * Set union by `opId`. An exact replay adds nothing; the same ID with different
 * content is refused whole (never "last one wins"), as the RPC refuses it.
 */
export function unionPassOps(existing: readonly PassOp[], incoming: readonly unknown[]): PassOp[] {
  const byId = new Map<string, PassOp>();
  for (const raw of [...existing, ...incoming]) {
    const op = PassOp.parse(raw);
    const old = byId.get(op.opId);
    if (old && !samePassOp(old, op)) throw new PassOpIdReused(op.opId);
    if (!old) byId.set(op.opId, op);
  }
  return [...byId.values()].sort((a, b) => (a.opId < b.opId ? -1 : a.opId > b.opId ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Game-day arithmetic.
// ---------------------------------------------------------------------------

/** `day + n` in UTC calendar days. No DST, no millisecond durations. */
export function addDays(day: string, n: number): string {
  if (!isPassDay(day) || !Number.isInteger(n)) throw new Error("invalid day arithmetic");
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY).toISOString().slice(0, 10);
}

/** Whole calendar days from `a` to `b` (`b − a`). */
export function dayDiff(a: string, b: string): number {
  if (!isPassDay(a) || !isPassDay(b)) throw new Error("invalid day arithmetic");
  return Math.round((Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / DAY);
}

/**
 * The game-day an instant falls in, for a pass. CZN reuses its own 18:00 UTC
 * daily policy (D8); every other lane, custom ones included (D7), uses the
 * existing regional clock with that game's overrides.
 */
export function passDay(ms: number, game: string, region: Region): string {
  return game === "czn" ? cznDayKey(ms) : dayKey(ms, region, game);
}

/** The instant the game-day `day` opens on; inverse of `passDay`. */
export function passDayStart(day: string, game: string, region: Region): number {
  return game === "czn" ? cznDayStart(day) : dayStartMs(day, region, game);
}

/**
 * Where a pass's clock comes from. `regional-default` is the 04:00 server-local
 * fallback: for custom lanes and for games without their own reset evidence it
 * is an assumption, and must not be shown as independently confirmed.
 */
export type PassClockBasis = "czn-utc18" | "game-override" | "regional-default";
export function passClockBasis(game: string, region: Region): PassClockBasis {
  if (game === "czn") return "czn-utc18";
  if (isCustomGameId(game)) return "regional-default";
  const meta = GAMES[game as GameId];
  return meta && (meta.resetOffsets?.[region] !== undefined || meta.resetHourLocal !== undefined)
    ? "game-override"
    : "regional-default";
}

// ---------------------------------------------------------------------------
// Reducer.
// ---------------------------------------------------------------------------

export type PassKey = string;
/** A pass is identified by `(game, region)`: a region change never reinterprets one. */
export function passKey(game: string, region: Region): PassKey {
  return `${game}|${region}`;
}

export interface PassState {
  game: string;
  region: Region;
  /** Inclusive last active game-day; null when there is no pass. */
  lastDay: string | null;
  /** The latest live `set`, the base of the computation. */
  winningSet: string | null;
  /** Extends that contributed, in application order. */
  applied: string[];
  /** Earlier unseen extends the winning set may have erased (D3): shown, not applied. */
  conflicts: string[];
  /** Earlier unseen extends the user dismissed with `resolve(exclude)`. */
  dismissed: string[];
  /** Live sets the winning set had not seen: a concurrent correction to report. */
  concurrentSets: string[];
  /** Ops removed by a live `undo`. */
  undone: string[];
  /** Undo/resolve ops that can never apply (cross-pass or wrong target kind). */
  ignored: string[];
}

type SortKey = { actionDay: string; createdAt: string; opId: string };
/** Action order: game-day of the click, then client clock, then op ID. Never arrival. */
export function comparePassOps(a: SortKey, b: SortKey): number {
  if (a.actionDay !== b.actionDay) return a.actionDay < b.actionDay ? -1 : 1;
  const ta = Date.parse(a.createdAt), tb = Date.parse(b.createdAt);
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.opId < b.opId ? -1 : a.opId > b.opId ? 1 : 0;
}

/**
 * Reduce one pass from the profile's WHOLE op set (other passes' ops are needed
 * only to tell a cross-pass undo/resolve from one whose target has not arrived).
 */
export function reducePass(allOps: readonly PassOp[], game: string, region: Region): PassState {
  const ops = unionPassOps([], allOps);
  const byId = new Map(ops.map((o) => [o.opId, o]));
  const mine = (o: PassOp) => o.game === game && o.region === region;
  const pass = ops.filter(mine);
  const ignored = new Set<string>();

  // 1. Undo. An undo never targets another undo: there is no redo chain, so
  // liveness cannot depend on arrival order or form a cycle. A target that has
  // not arrived yet stays pending and is dropped the moment it does.
  const undone = new Set<string>();
  for (const u of pass) {
    if (u.kind !== "undo") continue;
    const target = byId.get(u.targetOp);
    if (!target) continue;
    if (!mine(target) || target.kind === "undo") ignored.add(u.opId);
    else undone.add(target.opId);
  }
  const live = (o: PassOp) => !undone.has(o.opId);

  // Effective resolution of each extend: its latest live resolve in action order.
  const resolution = new Map<string, { by: PassOp; value: "include" | "exclude" }>();
  for (const r of pass) {
    if (r.kind !== "resolve" || !live(r)) continue;
    const target = byId.get(r.targetOp);
    if (!target) continue;
    if (!mine(target) || target.kind !== "extend") {
      ignored.add(r.opId);
      continue;
    }
    const prior = resolution.get(target.opId);
    if (!prior || comparePassOps(prior.by, r) < 0) resolution.set(target.opId, { by: r, value: r.resolution });
  }

  // 2–3. Latest live set is the base.
  const sorted = pass.filter((o) => (o.kind === "extend" || o.kind === "set") && live(o)).sort(comparePassOps);
  const sets = sorted.filter((o): o is Extract<PassOp, { kind: "set" }> => o.kind === "set");
  const winner = sets.at(-1) ?? null;
  const seen = new Set(winner?.basedOn ?? []);
  let last: string | null = winner ? winner.lastDay : null;

  // 4–5. Extends after the set apply; earlier unseen ones are conflicts unless resolved.
  const applied: string[] = [], conflicts: string[] = [], dismissed: string[] = [];
  for (const op of sorted) {
    if (op.kind !== "extend" || seen.has(op.opId)) continue;
    if (winner && comparePassOps(op, winner) < 0) {
      const r = resolution.get(op.opId)?.value;
      if (r === "exclude") { dismissed.push(op.opId); continue; }
      if (r !== "include") { conflicts.push(op.opId); continue; }
    }
    const before = addDays(op.actionDay, -1);
    last = addDays(last === null || last < before ? before : last, op.days);
    applied.push(op.opId);
  }

  return {
    game,
    region,
    lastDay: last,
    winningSet: winner?.opId ?? null,
    applied,
    conflicts,
    dismissed,
    concurrentSets: sets.filter((s) => s !== winner && !seen.has(s.opId)).map((s) => s.opId),
    undone: [...undone].sort(),
    ignored: [...ignored].sort(),
  };
}

/** Every pass any op names, keyed by `passKey`. */
export function reducePasses(allOps: readonly PassOp[]): Map<PassKey, PassState> {
  const ops = unionPassOps([], allOps);
  const keys = new Map<PassKey, { game: string; region: Region }>();
  for (const op of ops) keys.set(passKey(op.game, op.region), { game: op.game, region: op.region });
  return new Map(
    [...keys].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, { game, region }]) => [k, reducePass(ops, game, region)]),
  );
}

/**
 * D7: a deleted custom game's ops stay in the set (and in backups); only the
 * display hides them, so the same ID coming back shows the same pass again.
 */
export function displayablePasses(
  states: Map<PassKey, PassState>,
  isKnownLane: (game: string) => boolean,
): PassState[] {
  return [...states.values()].filter((s) => isKnownLane(s.game));
}

export type PassView =
  | { status: "none"; today: string }
  | { status: "active" | "expired"; today: string; lastDay: string; remainingDays: number; expiresAtMs: number };

/**
 * D1, inclusive: the action day is day 1, and the remaining count includes
 * today. Active while `today ≤ lastDay`; it expires when `lastDay + 1` opens.
 */
export function passView(state: Pick<PassState, "game" | "region" | "lastDay">, nowMs: number): PassView {
  const today = passDay(nowMs, state.game, state.region);
  if (state.lastDay === null) return { status: "none", today };
  const remaining = dayDiff(today, state.lastDay) + 1;
  return {
    status: remaining > 0 ? "active" : "expired",
    today,
    lastDay: state.lastDay,
    remainingDays: Math.max(0, remaining),
    expiresAtMs: passDayStart(addDays(state.lastDay, 1), state.game, state.region),
  };
}
