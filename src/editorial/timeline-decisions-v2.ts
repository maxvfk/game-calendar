/** Prepared E2a contracts. NOT a production registry reader/writer or queue. */
import { z } from "zod";
import { FINGERPRINT_CONTRACT, TimelineDecision, TimelineRegistry, semanticFingerprint, publicEvent } from "../presentation/timeline-labels.ts";
import { registryBytes } from "../presentation/timeline-label-accept.ts";
import type { GachaEvent } from "../shared/schema.ts";
import { EvidenceSidecar } from "./event-evidence.ts";

export const DecisionOrigin = z.enum(["operator_approved", "automated", "legacy_unknown"]);
export type DecisionOrigin = z.infer<typeof DecisionOrigin>;
export const EvidenceHash = z.string().regex(/^[a-f0-9]{64}$/);
const [label, keep, research] = TimelineDecision.options;
export const EditorialDecisionV2 = z.discriminatedUnion("decision", [
  label.extend({ origin: DecisionOrigin }).strict(),
  keep.extend({ origin: DecisionOrigin, evidenceHashAtDecision: EvidenceHash.nullable() }).strict(),
  research.extend({ origin: DecisionOrigin, evidenceHashAtDecision: EvidenceHash.nullable() }).strict(),
]);
export type EditorialDecisionV2 = z.infer<typeof EditorialDecisionV2>;
export const EditorialRegistryV2 = z.object({
  schemaVersion: z.literal(2), fingerprintContract: z.literal(FINGERPRINT_CONTRACT),
  decisions: z.array(EditorialDecisionV2).max(100_000),
}).strict().superRefine((r, ctx) => {
  if (new Set(r.decisions.map(d => d.eventId)).size !== r.decisions.length)
    ctx.addIssue({ code: "custom", message: "duplicate eventId" });
});
export type EditorialRegistryV2 = z.infer<typeof EditorialRegistryV2>;

/** Lossless v1 projection, for rehearsal/rollback. Not wired to build:feed. */
export function rollbackToV1(input: unknown): TimelineRegistry {
  const registry = EditorialRegistryV2.parse(input);
  return TimelineRegistry.parse({ schemaVersion: 1, decisions: registry.decisions.map(d => {
    const { origin: _origin, ...rest } = d;
    if (rest.decision === "label") return rest;
    const { evidenceHashAtDecision: _hash, ...original } = rest;
    return original;
  }) });
}
export function editorialRegistryBytes(input: unknown): string {
  const r = EditorialRegistryV2.parse(input);
  const originals = rollbackToV1(r).decisions;
  // Reuse the exact v1 field ordering, append only the new contract fields.
  const ordered = JSON.parse(registryBytes({ schemaVersion: 1, decisions: originals })).decisions as TimelineDecision[];
  return `${JSON.stringify({ schemaVersion: 2, fingerprintContract: FINGERPRINT_CONTRACT,
    decisions: ordered.map((d, i) => {
      const v2 = r.decisions[i]!;
      return { ...d, origin: v2.origin, ...(v2.decision === "label" ? {} : { evidenceHashAtDecision: v2.evidenceHashAtDecision }) };
    }),
  }, null, 2)}\n`;
}

/** Evidence-only eligibility, deliberately separate from the live M4 queue/accept.
 * Future callers still apply normal expiry/batch gates and use a freshly built,
 * trusted E1 sidecar, never model-provided evidence or origin claims.
 */
export function evidenceRequeueEligibility(decisionInput: unknown, event: GachaEvent, evidenceInput: unknown): { eligible: boolean; reason: string } {
  const d = EditorialDecisionV2.parse(decisionInput);
  const no = (reason: string) => ({ eligible: false, reason });
  if (d.origin === "legacy_unknown") return no("protected_unknown_origin");
  if (d.decision === "label") return no("protected_label");
  if (d.origin === "operator_approved" && d.decision === "keep_original") return no("protected_operator_keep");
  if (!publicEvent(event) || d.eventId !== event.id || d.fingerprint !== semanticFingerprint(event)) return no("canonical_input_mismatch");
  const evidence = EvidenceSidecar.safeParse(evidenceInput);
  if (!evidence.success || evidence.data.diagnostics.some(x => ["source_unavailable", "source_extraction_failed", "sidecar_assembly_failed"].includes(x.code))) return no("evidence_unavailable");
  // Only verified eligible entries; unattached/diagnostics and bare hash strings are never evidence.
  const entry = evidence.data.entries.find(e => e.eventId === event.id && e.game === event.game);
  if (!entry) return no("evidence_unavailable");
  return entry.evidenceHash !== d.evidenceHashAtDecision
    ? { eligible: true, reason: "verified_evidence_changed" } : no("evidence_unchanged");
}
