/** Pure migration and audit contracts. Git is confined to an offline script adapter. */
import { createHash } from "node:crypto";
import { z } from "zod";
import { FINGERPRINT_CONTRACT, TimelineDecision, TimelineRegistry } from "../presentation/timeline-labels.ts";
import { registryBytes } from "../presentation/timeline-label-accept.ts";
import { DecisionOrigin, EditorialRegistryV2 } from "./timeline-decisions-v2.ts";

export const REGISTRY_PATH = "data/presentation/timeline-labels.v1.json";
export const MANIFEST_PATH = "data/presentation/timeline-origin-migration.v1.json";
export const OPERATOR_COMMIT = "f75cfbd04fea7100a88e9373543ebaee6ddde22a";
export const OPERATOR_REGISTRY_HASH = "6a0ca1f5392c3e8e266aab554b48e0c4f270d544237461393a91e64d57f480a5";
export const BOT_NAME = "github-actions[bot]";
export const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";
export const BOT_SUBJECT = "data(timeline): record automatic label decisions";
export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
export const registryHash = (input: unknown) => sha256(registryBytes(TimelineRegistry.parse(input)));
export const decisionHash = (d: TimelineDecision) => registryHash({ schemaVersion: 1, decisions: [d] });
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().min(1).max(1024).refine(s => !/[\u0000-\u001f]/u.test(s));
const Identity = z.object({ name: text, email: text }).strict();
const Ref = z.object({ eventId: z.string().min(1).max(300), fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/), decisionHash: hash }).strict();
type Ref = z.infer<typeof Ref>;
const Change = z.object({ before: Ref, after: Ref }).strict();
const Changes = z.object({ added: z.array(Ref), replaced: z.array(Change), modified: z.array(Change), removed: z.array(Ref) }).strict();
export const AuditCommit = z.object({
  sha, parents: z.array(sha), author: Identity, committer: Identity, subject: text,
  changedFiles: z.array(text), beforeHash: hash.nullable(), afterHash: hash,
  beforeCount: z.number().int().nonnegative(), afterCount: z.number().int().nonnegative(),
  changes: Changes, classification: z.enum(["empty_initialization", "operator_pr87", "automatic_registry_only", "review_required"]),
}).strict();
export type AuditCommit = z.infer<typeof AuditCommit>;
const RecordOrigin = Ref.extend({ origin: DecisionOrigin, sourceCommit: sha }).strict();
export const MigrationManifest = z.object({
  schemaVersion: z.literal(1), purpose: z.literal("timeline-v1-to-v2-rehearsal-only"),
  fingerprintContract: z.literal(FINGERPRINT_CONTRACT),
  baselineCommit: sha, registryHash: hash, recordCount: z.number().int().nonnegative(),
  commits: z.array(AuditCommit).min(1), records: z.array(RecordOrigin),
}).strict().superRefine((m, ctx) => {
  try { validateManifest(m); } catch (error) { ctx.addIssue({ code: "custom", message: String(error) }); }
});
export type MigrationManifest = z.infer<typeof MigrationManifest>;
export interface HistoryCommit {
  sha: string; parents: string[]; author: { name: string; email: string }; committer: { name: string; email: string };
  subject: string; changedFiles: string[]; before: TimelineRegistry | null; after: TimelineRegistry;
}
const ref = (d: TimelineDecision): Ref => ({ eventId: d.eventId, fingerprint: d.fingerprint, decisionHash: decisionHash(d) });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function changes(before: TimelineRegistry | null, after: TimelineRegistry) {
  const old = new Map(before?.decisions.map(d => [d.eventId, d]) ?? []);
  const next = new Map(after.decisions.map(d => [d.eventId, d]));
  const result: z.infer<typeof Changes> = { added: [], replaced: [], modified: [], removed: [] };
  for (const d of after.decisions) {
    const prev = old.get(d.eventId);
    if (!prev) result.added.push(ref(d));
    else if (decisionHash(prev) !== decisionHash(d)) result[prev.fingerprint === d.fingerprint ? "modified" : "replaced"].push({ before: ref(prev), after: ref(d) });
  }
  for (const d of before?.decisions ?? []) if (!next.has(d.eventId)) result.removed.push(ref(d));
  return result;
}
function classify(c: Omit<AuditCommit, "classification">): AuditCommit["classification"] {
  if (c.beforeHash === null && c.beforeCount === 0 && c.afterCount === 0) return "empty_initialization";
  const diffs = c.changes;
  if (c.sha === OPERATOR_COMMIT && c.author.name === "maxvfk" && c.author.email === "max.vfk@gmail.com" &&
    c.committer.name === "GitHub" && c.committer.email === "noreply@github.com" && c.parents.length === 1 &&
    c.subject === "data(timeline): approve first 25 Timeline label decisions (#87)" &&
    same([...c.changedFiles].sort(), [REGISTRY_PATH, "docs/evidence/timeline-labels-l2-pilot.md"].sort()) &&
    c.beforeCount === 0 && c.afterCount === 25 && diffs.added.length === 25 &&
    !diffs.replaced.length && !diffs.modified.length && !diffs.removed.length && c.afterHash === OPERATOR_REGISTRY_HASH) return "operator_pr87";
  if (c.author.name === BOT_NAME && c.author.email === BOT_EMAIL && c.committer.name === BOT_NAME && c.committer.email === BOT_EMAIL &&
    c.subject === BOT_SUBJECT && c.parents.length === 1 && same(c.changedFiles, [REGISTRY_PATH]) &&
    diffs.added.length + diffs.replaced.length > 0 && !diffs.modified.length && !diffs.removed.length) return "automatic_registry_only";
  return "review_required";
}
function origin(c: AuditCommit): DecisionOrigin {
  return c.classification === "operator_pr87" ? "operator_approved" : c.classification === "automatic_registry_only" ? "automated" : "legacy_unknown";
}
function replay(commits: AuditCommit[]) {
  const records = new Map<string, z.infer<typeof RecordOrigin>>();
  let lastHash: string | null = null;
  const seen = new Set<string>();
  for (const c of commits) {
    if (seen.has(c.sha) || c.classification !== classify(c) || c.beforeHash !== lastHash || c.beforeCount !== records.size) throw new Error("invalid commit audit/classification/chain");
    seen.add(c.sha);
    if (new Set(c.changedFiles).size !== c.changedFiles.length || !c.changedFiles.includes(REGISTRY_PATH)) throw new Error("invalid diff paths");
    const touched = new Set<string>();
    const touch = (id: string) => { if (touched.has(id)) throw new Error("duplicate changed eventId"); touched.add(id); };
    for (const prev of c.changes.removed) {
      touch(prev.eventId);
      const r = records.get(prev.eventId);
      if (!r || r.fingerprint !== prev.fingerprint || r.decisionHash !== prev.decisionHash) throw new Error("invalid deletion lineage");
      records.delete(prev.eventId);
    }
    for (const [kind, entries] of [["replaced", c.changes.replaced], ["modified", c.changes.modified]] as const) for (const { before, after } of entries) {
      touch(before.eventId);
      const r = records.get(before.eventId);
      if (!r || after.eventId !== before.eventId || r.fingerprint !== before.fingerprint || r.decisionHash !== before.decisionHash ||
        before.decisionHash === after.decisionHash || (before.fingerprint === after.fingerprint) !== (kind === "modified")) throw new Error("invalid replacement lineage");
      records.set(after.eventId, { ...after, origin: origin(c), sourceCommit: c.sha });
    }
    for (const added of c.changes.added) {
      touch(added.eventId);
      if (records.has(added.eventId)) throw new Error("duplicate addition");
      records.set(added.eventId, { ...added, origin: origin(c), sourceCommit: c.sha });
    }
    if (c.afterCount !== records.size) throw new Error("invalid commit record count");
    lastHash = c.afterHash;
  }
  return [...records.values()].sort((a, b) => compare(a.eventId, b.eventId));
}
function validateManifest(m: MigrationManifest) {
  const records = replay(m.commits);
  if (m.commits.at(-1)?.afterHash !== m.registryHash || records.length !== m.recordCount || !same(records, m.records)) throw new Error("manifest counts/content/origin lineage mismatch");
}

export function inventoryProvenance(baselineCommit: string, history: HistoryCommit[], currentInput: unknown): MigrationManifest {
  const current = TimelineRegistry.parse(currentInput);
  const commits = history.map(c => {
    const { before, after, ...metadata } = c;
    const audit = { ...metadata, beforeHash: before === null ? null : registryHash(before), afterHash: registryHash(after),
      beforeCount: before?.decisions.length ?? 0, afterCount: after.decisions.length, changes: changes(before, after) };
    return AuditCommit.parse({ ...audit, classification: classify(audit) });
  });
  const manifest = MigrationManifest.parse({ schemaVersion: 1, purpose: "timeline-v1-to-v2-rehearsal-only", fingerprintContract: FINGERPRINT_CONTRACT,
    baselineCommit, registryHash: registryHash(current), recordCount: current.decisions.length, commits, records: replay(commits) });
  assertRecordsMatch(current, manifest);
  return manifest;
}
function assertRecordsMatch(registry: TimelineRegistry, manifest: MigrationManifest) {
  if (registryHash(registry) !== manifest.registryHash || registry.decisions.length !== manifest.recordCount) throw new Error("registry drift: regenerate reviewed manifest");
  const records = new Map(manifest.records.map(r => [r.eventId, r]));
  for (const d of registry.decisions) {
    const r = records.get(d.eventId);
    if (!r || r.fingerprint !== d.fingerprint || r.decisionHash !== decisionHash(d)) throw new Error("unknown/modified fingerprint or decision: regenerate reviewed manifest");
  }
}
/** Even a bot write later reverted to identical bytes invalidates the old inventory. */
export function assertInventoryFresh(manifestInput: unknown, currentInput: unknown): void {
  const manifest = MigrationManifest.parse(manifestInput), current = MigrationManifest.parse(currentInput);
  if (manifest.registryHash !== current.registryHash || !same(manifest.commits, current.commits) || !same(manifest.records, current.records)) throw new Error("inventory drift: registry history moved; re-inventory/review before migration");
}
export function migrateToV2(input: unknown, manifestInput: unknown): EditorialRegistryV2 {
  const registry = TimelineRegistry.parse(input), manifest = MigrationManifest.parse(manifestInput);
  assertRecordsMatch(registry, manifest);
  const records = new Map(manifest.records.map(r => [r.eventId, r]));
  return EditorialRegistryV2.parse({ schemaVersion: 2, fingerprintContract: FINGERPRINT_CONTRACT,
    decisions: registry.decisions.map(d => ({ ...d, origin: records.get(d.eventId)!.origin,
      ...(d.decision === "label" ? {} : { evidenceHashAtDecision: null }),
    })),
  });
}
export const manifestBytes = (input: unknown) => `${JSON.stringify(MigrationManifest.parse(input), null, 2)}\n`;
