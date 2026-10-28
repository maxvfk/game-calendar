/** One selected storage contract. No implicit v1 fallback after activation. */
import { CUTOVER_PATH, CutoverManifest } from "./timeline-cutover.ts";
import { z } from "zod";
import { resolve } from "node:path";
import { TimelineRegistry } from "../presentation/timeline-labels.ts";
import { acceptTimelineProposals, registryBytes } from "../presentation/timeline-label-accept.ts";
import { EditorialRegistryV2, editorialRegistryBytes, rollbackToV1 } from "./timeline-decisions-v2.ts";

export const STORAGE_PATH = "data/presentation/timeline-storage.v1.json";
export const V1_PATH = "data/presentation/timeline-labels.v1.json";
export const V2_PATH = "data/presentation/timeline-labels.v2.json";
export const StorageSelection = z.object({
  schemaVersion: z.literal(1), activeVersion: z.union([z.literal(1), z.literal(2)]),
  epoch: z.string().regex(/^timeline-(?:v[12]|rollback)-[a-f0-9]{64}$/),
  admission: z.enum(["frozen", "open"]),
}).strict().refine(s => s.activeVersion === 2 ? s.epoch.startsWith("timeline-v2-") : !s.epoch.startsWith("timeline-v2-"), "epoch/contract mismatch");
export type StorageSelection = z.infer<typeof StorageSelection>;
export const WriterTicket = z.object({ schemaVersion: z.literal(1), activeVersion: z.union([z.literal(1), z.literal(2)]), epoch: z.string(), registryPath: z.enum([V1_PATH, V2_PATH]) }).strict();
export type WriterTicket = z.infer<typeof WriterTicket>;
export const storagePath = (s: StorageSelection) => s.activeVersion === 2 ? V2_PATH : V1_PATH;
export function writerTicket(selection: unknown): WriterTicket {
  const s = StorageSelection.parse(selection);
  if (s.admission !== "open") throw new Error("Timeline writer is frozen");
  return WriterTicket.parse({ schemaVersion: 1, activeVersion: s.activeVersion, epoch: s.epoch, registryPath: storagePath(s) });
}
export function assertWriterTicket(selection: unknown, ticket: unknown, out: string, root = process.cwd()): void {
  const expected = writerTicket(selection), supplied = WriterTicket.parse(ticket);
  if (JSON.stringify(expected) !== JSON.stringify(supplied) || resolve(root, out) !== resolve(root, expected.registryPath)) throw new Error("stale writer ticket or inactive registry output path");
}
export async function loadTimelineStorage(root = process.cwd()) {
  const selection = StorageSelection.parse(await Bun.file(resolve(root, STORAGE_PATH)).json());
  if (selection.activeVersion === 2) {
    const ledger = CutoverManifest.parse(await Bun.file(resolve(root, CUTOVER_PATH)).json());
    if (selection.epoch !== ledger.targetEpoch) throw new Error("storage epoch/cutover manifest mismatch");
  }
  const path = storagePath(selection);
  const raw = await Bun.file(resolve(root, path)).json();
  const registry = selection.activeVersion === 2 ? EditorialRegistryV2.parse(raw) : TimelineRegistry.parse(raw);
  const projection = selection.activeVersion === 2 ? rollbackToV1(registry) : TimelineRegistry.parse(registry);
  return { selection, path, registry, projection };
}

/** Same L1 proposals/guards; origin/evidence fields from a model remain forbidden. */
export function acceptStoredTimelineProposals(proposals: unknown, feed: unknown, input: unknown, vocabulary: readonly string[] = [], asOf?: string) {
  const parsed = EditorialRegistryV2.parse(input);
  const original = rollbackToV1(parsed);
  const result = acceptTimelineProposals(proposals, feed, original, vocabulary, asOf);
  const prior = new Map(parsed.decisions.map(d => [d.eventId, d]));
  const old = new Map(original.decisions.map(d => [d.eventId, d]));
  const decisions = result.registry.decisions.map(d => {
    const p = prior.get(d.eventId), before = old.get(d.eventId);
    if (p && before && registryBytes({ schemaVersion: 1, decisions: [before] }) === registryBytes({ schemaVersion: 1, decisions: [d] })) return p;
    return { ...d, origin: "automated" as const, ...(d.decision === "label" ? {} : { evidenceHashAtDecision: null }) };
  });
  return { ...result, registry: EditorialRegistryV2.parse({ schemaVersion: 2, fingerprintContract: parsed.fingerprintContract, decisions }) };
}
export function storedRegistryBytes(input: unknown): string {
  return (input as { schemaVersion?: unknown })?.schemaVersion === 2 ? editorialRegistryBytes(input) : registryBytes(TimelineRegistry.parse(input));
}
