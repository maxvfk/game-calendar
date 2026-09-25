import { z } from "zod";
import { EVENT_CATEGORIES, type EventCategory } from "../client/state/eventCategories.ts";
import { TIMELINE_GROUPS, type TimelineGroup } from "../client/state/lanes.ts";
import { SORT_MODES, type SortMode } from "../client/state/sort.ts";
import type { Prefs } from "../client/state/usePrefs.ts";
import { CustomEvent, CustomGame } from "./custom.ts";
import { Region } from "./schema.ts";

/** S1's wire-independent model. Nothing in the current v1 stores imports it. */
export const LogicalVersion = z.object({
  changedAt: z.string().datetime({ offset: true }),
  mutationId: z.string().min(1),
});
export type LogicalVersion = z.infer<typeof LogicalVersion>;

// Each top-level Prefs field must have a matching validator. The client lists
// for sort, grouping and categories are pure data, shared without importing UI.
const preferenceSchemas = {
  region: Region,
  hiddenGames: z.array(z.string()),
  knownGames: z.array(z.string()),
  gameOrder: z.array(z.string()),
  focusGame: z.string().nullable(),
  sort: z.enum(SORT_MODES.map(({ id }) => id) as [SortMode, ...SortMode[]]),
  view: z.enum(["soon", "timeline"]),
  visibleCategories: z.array(z.enum(
    EVENT_CATEGORIES.map(({ id }) => id) as [EventCategory, ...EventCategory[]],
  )),
  timelineDayWidth: z.number().finite(),
  timelineGroup: z.enum(TIMELINE_GROUPS.map(({ id }) => id) as [TimelineGroup, ...TimelineGroup[]]),
  showUpcoming: z.boolean(),
  timelineSplitUpcoming: z.boolean(),
  detectDaily: z.boolean(),
  showChores: z.boolean(),
  showCompleted: z.boolean(),
  showIgnored: z.boolean(),
  theme: z.enum(["dark", "light", "system"]),
  regionConfirmed: z.boolean(),
  onboarded: z.boolean(),
} satisfies { [K in keyof Prefs]-?: z.ZodType<Exclude<Prefs[K], undefined>> };

export const PreferenceKey = z.enum(Object.keys(preferenceSchemas) as [keyof Prefs, ...Array<keyof Prefs>]);
export type PreferenceKey = z.infer<typeof PreferenceKey>;

// Envelope type; the key-specific schema below decides whether a value is valid.
export const PreferenceValue = z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(z.string()),
]);

export const ProgressValue = z.object({
  status: z.enum(["doing", "done"]).nullable(),
  effort: z.enum(["quick", "short", "long", "grind"]).nullable(),
  daily: z.boolean().nullable(),
  note: z.string().nullable(),
});

const version = LogicalVersion.shape;
const opaqueKey = z.string().min(1);
export const SyncMutation = z.discriminatedUnion("kind", [
  z.object({ ...version, kind: z.literal("progress"), key: opaqueKey,
    deleted: z.boolean(), payload: ProgressValue.nullable() }),
  z.object({ ...version, kind: z.literal("daily"),
    key: z.object({ subjectId: opaqueKey, dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    completed: z.boolean() }),
  z.object({ ...version, kind: z.literal("ignored"), key: opaqueKey, ignored: z.boolean() }),
  z.object({ ...version, kind: z.literal("preference"), key: PreferenceKey,
    unset: z.boolean(), value: PreferenceValue }),
  z.object({ ...version, kind: z.literal("customGame"), key: opaqueKey,
    deleted: z.boolean(), payload: CustomGame.nullable() }),
  z.object({ ...version, kind: z.literal("customEvent"), key: opaqueKey,
    deleted: z.boolean(), payload: CustomEvent.nullable() }),
]).superRefine((row, ctx) => {
  if (row.kind === "progress" && row.deleted !== (row.payload === null)) {
    ctx.addIssue({ code: "custom", message: "progress tombstone requires null payload" });
  }
  if ((row.kind === "customGame" || row.kind === "customEvent") &&
      (row.deleted ? row.payload !== null : row.payload?.id !== row.key)) {
    ctx.addIssue({ code: "custom", message: "custom object tombstone or payload ID mismatch" });
  }
  // knownGames/gameOrder are optional in v1. A reset must propagate as an
  // explicit versioned absence, distinct from focusGame's meaningful null.
  if (row.kind === "preference" && row.unset &&
      (row.value !== null || (row.key !== "knownGames" && row.key !== "gameOrder"))) {
    ctx.addIssue({ code: "custom", message: "only optional preferences may be unset with null value" });
  }
  if (row.kind === "preference" && !row.unset && row.value === null &&
      (row.key === "knownGames" || row.key === "gameOrder")) {
    ctx.addIssue({ code: "custom", message: "optional array reset requires explicit unset" });
  }
  if (row.kind === "preference" && !row.unset &&
      !preferenceSchemas[row.key].safeParse(row.value).success) {
    ctx.addIssue({ code: "custom", message: `invalid value for preference ${row.key}` });
  }
});
export type SyncMutation = z.infer<typeof SyncMutation>;
export type EntityKind = SyncMutation["kind"];

export type SyncState = { [K in EntityKind]: Record<string, Extract<SyncMutation, { kind: K }>> };
export const emptySyncState = (): SyncState => ({
  progress: {}, daily: {}, ignored: {}, preference: {}, customGame: {}, customEvent: {},
});

/** Lexical order is safe for validated ISO instants after parsing to milliseconds. */
export function compareVersions(a: LogicalVersion, b: LogicalVersion): number {
  const time = Date.parse(a.changedAt) - Date.parse(b.changedAt);
  if (time !== 0) return Math.sign(time);
  return a.mutationId < b.mutationId ? -1 : a.mutationId > b.mutationId ? 1 : 0;
}

export function logicalKey(mutation: SyncMutation): string {
  // JSON tuple encoding is injective even when subject IDs contain separators.
  return mutation.kind === "daily"
    ? JSON.stringify([mutation.key.subjectId, mutation.key.dayKey])
    : mutation.key;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Accepted includes an exact replay; superseded means a newer row already won. */
export type MutationAck = { mutationId: string; outcome: "accepted" | "superseded" };

export function applyMutation(state: SyncState, input: SyncMutation): {
  state: SyncState; ack: MutationAck;
} {
  const mutation = SyncMutation.parse(input);
  // Mutation IDs are globally stable, not reusable for a different entity.
  for (const rows of Object.values(state)) {
    for (const row of Object.values(rows)) {
      if (row.mutationId === mutation.mutationId && canonical(row) !== canonical(mutation)) {
        throw new Error(`mutationId reused with different content: ${mutation.mutationId}`);
      }
    }
  }
  const kind = mutation.kind;
  const key = logicalKey(mutation);
  // Keys are opaque user/source IDs; inherited Object keys must not masquerade
  // as rows (e.g. an ID literally equal to "__proto__").
  const current = Object.hasOwn(state[kind], key)
    ? state[kind][key] as SyncMutation
    : undefined;
  if (current) {
    const order = compareVersions(mutation, current);
    if (order === 0 && canonical(mutation) !== canonical(current)) {
      throw new Error(`conflicting payload for logical version: ${mutation.mutationId}`);
    }
    if (order <= 0) {
      return { state, ack: { mutationId: mutation.mutationId,
        outcome: order === 0 ? "accepted" : "superseded" } };
    }
  }
  // A new object and bucket, leaving both arguments and other buckets untouched.
  return {
    state: { ...state, [kind]: { ...state[kind], [key]: mutation } } as SyncState,
    ack: { mutationId: mutation.mutationId, outcome: "accepted" },
  };
}

export function mergeSyncState(local: SyncState, remote: SyncState): SyncState {
  let state = local;
  for (const rows of Object.values(remote)) {
    for (const mutation of Object.values(rows)) state = applyMutation(state, mutation).state;
  }
  return state;
}

/** Serializable durable outbox model; persistence/wiring starts in later milestones. */
export const SyncOutbox = z.array(SyncMutation);
export type SyncOutbox = z.infer<typeof SyncOutbox>;

export function queueMutation(outbox: SyncOutbox, input: SyncMutation): SyncOutbox {
  const mutation = SyncMutation.parse(input);
  const previous = outbox.find((entry) => entry.mutationId === mutation.mutationId);
  if (previous) {
    if (canonical(previous) !== canonical(mutation)) throw new Error("mutationId reused in outbox");
    return outbox;
  }
  return [...outbox, mutation];
}

export function acknowledgeMutation(outbox: SyncOutbox, ack: MutationAck): SyncOutbox {
  if (ack.outcome !== "accepted" && ack.outcome !== "superseded") {
    throw new Error("unrecognized acknowledgement");
  }
  return outbox.filter((entry) => entry.mutationId !== ack.mutationId);
}
