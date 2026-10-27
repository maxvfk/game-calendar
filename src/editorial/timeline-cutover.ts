import { z } from "zod";
import { assertInventoryFresh, MigrationManifest, migrateToV2, sha256 } from "./provenance-migration.ts";
import { editorialRegistryBytes, EditorialRegistryV2, rollbackToV1 } from "./timeline-decisions-v2.ts";
import { registryBytes } from "../presentation/timeline-label-accept.ts";

export const CUTOVER_PATH = "data/presentation/timeline-v2-cutover.v1.json";
const sha = z.string().regex(/^[a-f0-9]{40}$/), hash = z.string().regex(/^[a-f0-9]{64}$/);
// Reuse the exact E2a audit validator; the historical E2a manifest file is never changed.
export const CutoverInventory = z.unknown().transform((v, ctx) => {
  if (!v || typeof v !== "object" || (v as { purpose?: unknown }).purpose !== "timeline-cutover-origin-inventory-v1") { ctx.addIssue({ code: "custom", message: "not a cutover inventory" }); return z.NEVER; }
  const r = MigrationManifest.safeParse({ ...v, purpose: "timeline-v1-to-v2-rehearsal-only" });
  if (!r.success) { ctx.addIssue({ code: "custom", message: "invalid cutover origin inventory" }); return z.NEVER; }
  return { ...r.data, purpose: "timeline-cutover-origin-inventory-v1" as const };
});
export const CutoverManifest = z.object({
  schemaVersion: z.literal(1), purpose: z.literal("timeline-v2-controlled-cutover"), status: z.literal("prepared_not_live"),
  sourceMain: sha, sourceRegistryBlob: sha, sourceRegistryHash: hash, targetRegistryHash: hash,
  targetEpoch: z.string().regex(/^timeline-v2-[a-f0-9]{64}$/), inventory: CutoverInventory,
}).strict().superRefine((m, ctx) => {
  if (m.inventory.baselineCommit !== m.sourceMain || m.inventory.registryHash !== m.sourceRegistryHash || m.targetEpoch !== `timeline-v2-${sha256(m.sourceMain + m.sourceRegistryBlob + m.targetRegistryHash)}`)
    ctx.addIssue({ code: "custom", message: "cutover boundary/hash/epoch mismatch" });
});
export type CutoverManifest = z.infer<typeof CutoverManifest>;
export function createCutoverManifest(inventory: MigrationManifest, sourceRegistryBlob: string, registry: unknown) {
  const migrated = migrateToV2(registry, inventory);
  const targetRegistryHash = sha256(editorialRegistryBytes(migrated));
  return CutoverManifest.parse({ schemaVersion: 1, purpose: "timeline-v2-controlled-cutover", status: "prepared_not_live",
    sourceMain: inventory.baselineCommit, sourceRegistryBlob, sourceRegistryHash: inventory.registryHash,
    targetRegistryHash, targetEpoch: `timeline-v2-${sha256(inventory.baselineCommit + sourceRegistryBlob + targetRegistryHash)}`, inventory: { ...inventory, purpose: "timeline-cutover-origin-inventory-v1" } });
}
export function validateCutoverSource(input: unknown, inventory: MigrationManifest, blob: string, registry: unknown) {
  const m = CutoverManifest.parse(input);
  assertInventoryFresh({ ...m.inventory, purpose: "timeline-v1-to-v2-rehearsal-only" }, inventory);
  if (blob !== m.sourceRegistryBlob) throw new Error("cutover registry blob drift");
  const next = migrateToV2(registry, { ...m.inventory, purpose: "timeline-v1-to-v2-rehearsal-only" });
  if (sha256(editorialRegistryBytes(next)) !== m.targetRegistryHash) throw new Error("cutover target hash drift");
  return next;
}
export const FreezeObservation = z.object({
  schemaVersion: z.literal(1), repository: z.literal("maxvfk/game-calendar"), observedAt: z.string().datetime(), remoteMain: sha,
  variable: z.literal("off"), workflowState: z.literal("disabled_manually"), complete: z.literal(true),
  ci: z.object({ id: z.number().int().positive(), headSha: sha, status: z.literal("completed"), conclusion: z.literal("success"), workflowPath: z.literal(".github/workflows/ci.yml") }).strict(),
  runs: z.array(z.object({ id: z.number().int().positive(), status: z.string(), conclusion: z.string().nullable() }).strict()),
}).strict();
export const OperatorGO = z.object({ schemaVersion: z.literal(1), action: z.enum(["cutover", "rollback", "release"]), operator: z.string().min(1).max(200), window: z.string().min(1).max(200), expectedMain: sha, candidate: sha, ciRunId: z.number().int().positive(), admissionHeld: z.literal(true), authorizedAt: z.string().datetime() }).strict();
export function assertFreezeGate(goInput: unknown, observationInput: unknown, expectedMain: string, action: z.infer<typeof OperatorGO>["action"], now: string) {
  const go = OperatorGO.parse(goInput), observation = FreezeObservation.parse(observationInput);
  const age = Date.parse(now) - Date.parse(observation.observedAt);
  if (observation.ci.id !== go.ciRunId || observation.ci.headSha !== go.candidate || go.action !== action || go.expectedMain !== expectedMain || observation.remoteMain !== expectedMain || age < 0 || age > 120_000 ||
    Date.parse(go.authorizedAt) > Date.parse(now) || Date.parse(go.authorizedAt) < Date.parse(now) - 3_600_000 ||
    observation.runs.some(r => r.status !== "completed" || !["success", "failure", "cancelled", "skipped", "timed_out", "neutral", "action_required", "stale", "startup_failure"].includes(r.conclusion ?? ""))) throw new Error("freeze/GO proof missing, stale, or jobs not drained");
  return { go, observation };
}
/** Rollback exports latest state, including new v2 writes; archive keeps metadata v1 cannot store. */
export function prepareRollback(input: unknown, oldEpoch: string) {
  const registry = EditorialRegistryV2.parse(input);
  const archive = editorialRegistryBytes(registry), v1 = registryBytes(rollbackToV1(registry));
  const selection = { schemaVersion: 1 as const, activeVersion: 1 as const, epoch: `timeline-rollback-${sha256(oldEpoch + archive)}`, admission: "frozen" as const };
  return { archive, archiveHash: sha256(archive), v1, selection };
}
