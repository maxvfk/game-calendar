/** E2a preparation only. No Git mutation, model, network, production path or publisher. */
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { registryBytes } from "../src/presentation/timeline-label-accept.ts";
import { applyTimelineLabels, buildTimelineQueue, queueBytes } from "../src/presentation/timeline-labels.ts";
import { assertInventoryFresh, MANIFEST_PATH, manifestBytes, migrateToV2, REGISTRY_PATH, sha256 } from "../src/editorial/provenance-migration.ts";
import { editorialRegistryBytes, rollbackToV1 } from "../src/editorial/timeline-decisions-v2.ts";
import { loadProvenanceInventory, resolveAuditRef } from "./editorial-provenance-git.ts";

const [mode, ref = "HEAD", ...extra] = process.argv.slice(2);
if (!["inventory", "rehearse"].includes(mode ?? "") || extra.length) throw new Error("Usage: bun scripts/editorial-provenance.ts inventory|rehearse [local-git-ref]");
const root = process.cwd();
const out = resolve(root, "tmp/editorial/provenance-e2a");
// A failed fresh check must not leave an old successful preview/report to consume.
if (mode === "rehearse") await rm(out, { recursive: true, force: true });
const audit = loadProvenanceInventory(root, ref);
if (mode === "inventory") process.stdout.write(manifestBytes(audit.manifest));
else {
  const manifest = await Bun.file(MANIFEST_PATH).json();
  assertInventoryFresh(manifest, audit.manifest);
  if (await Bun.file(REGISTRY_PATH).text() !== audit.raw) throw new Error("working v1 differs from audited ref; do not rehearse stale input");
  const registry = migrateToV2(audit.registry, manifest);
  const repeated = migrateToV2(audit.registry, manifest);
  const rollback = rollbackToV1(registry);
  const rollbackBytes = registryBytes(rollback);
  if (rollbackBytes !== audit.raw || editorialRegistryBytes(registry) !== editorialRegistryBytes(repeated)) throw new Error("lossless rollback/idempotency gate failed");
  const feed = await Bun.file("public/data/events.v1.json").json();
  if (JSON.stringify(applyTimelineLabels(feed.events, audit.registry)) !== JSON.stringify(applyTimelineLabels(feed.events, rollback)) ||
    queueBytes(buildTimelineQueue(feed, audit.registry)) !== queueBytes(buildTimelineQueue(feed, rollback))) throw new Error("v1 presentation/queue projection changed");
  const report = {
    status: "rehearsal_only_not_live", auditedCommit: audit.cutoff, manifestBaselineCommit: manifest.baselineCommit,
    registryHash: sha256(audit.raw), records: registry.decisions.length,
    byOrigin: Object.fromEntries(["operator_approved", "automated", "legacy_unknown"].map(origin => [origin, registry.decisions.filter(d => d.origin === origin).length])),
    labelsPreserved: registry.decisions.filter(d => d.decision === "label").length,
    idempotent: true, rollbackByteIdentical: true, presentationAndQueueIdentical: true,
    productionWriter: "v1 M4 only (unchanged)", v2WriterInstalled: false,
    // A local ref check is not a remote lock or cutover authorization.
    remoteWriterQuiescenceProven: false, productionCutoverAuthorized: false,
  };
  if (resolveAuditRef(root, ref) !== audit.cutoff) throw new Error("ref moved during rehearsal; repeat on fresh main");
  // Fixed destination; the CLI cannot overwrite registry/public/workflow paths.
  await Bun.write(`${out}/registry-v2.preview.json`, editorialRegistryBytes(registry));
  await Bun.write(`${out}/rollback-v1.json`, rollbackBytes);
  await Bun.write(`${out}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
