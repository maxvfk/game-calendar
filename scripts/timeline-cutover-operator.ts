/** Explicit operator-only tools. No variables/workflow mutation; never called by M4/CI. */
import { resolve } from "node:path";
import { readGit, loadProvenanceInventory, resolveAuditRef } from "./editorial-provenance-git.ts";
import { CUTOVER_PATH, CutoverManifest, createCutoverManifest, validateCutoverSource, prepareRollback, OperatorGO, assertFreezeGate, FreezeObservation } from "../src/editorial/timeline-cutover.ts";
import { STORAGE_PATH, V1_PATH, V2_PATH, StorageSelection, loadTimelineStorage } from "../src/editorial/timeline-storage.ts";
import { editorialRegistryBytes } from "../src/editorial/timeline-decisions-v2.ts";

function gh(path: string, paginate = false): unknown {
  const r = Bun.spawnSync(["gh", "api", ...(paginate ? ["--paginate", "--slurp"] : []), path]);
  if (r.exitCode !== 0) throw new Error("BLOCKED: authenticated read-only GitHub observation unavailable");
  return JSON.parse(r.stdout.toString());
}
export function remoteMain(root: string) {
  const sha = readGit(root, ["ls-remote", "--exit-code", "origin", "refs/heads/main"]).split(/\s/)[0]!;
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("remote main unavailable");
  return sha;
}
/** No hand-edited proof is accepted by the publish CLI; it observes live APIs itself. */
export function observeFreeze(root: string, goInput: unknown, now = new Date().toISOString()) {
  const go = OperatorGO.parse(goInput), repo = "repos/maxvfk/game-calendar";
  const variable = gh(`${repo}/actions/variables/TIMELINE_LABELS_AUTO`) as { name: string; value: string };
  const workflow = gh(`${repo}/actions/workflows/timeline-labels.yml`) as { id: number; state: string };
  const pages = gh(`${repo}/actions/workflows/${workflow.id}/runs?per_page=100`, true) as Array<{ total_count: number; workflow_runs: Array<{ id: number; status: string; conclusion: string | null }> }>;
  const runs = pages.flatMap(p => p.workflow_runs).map(({ id, status, conclusion }) => ({ id, status, conclusion }));
  const ci = gh(`${repo}/actions/runs/${go.ciRunId}`) as { id: number; head_sha: string; status: string; conclusion: string; path: string };
  const lastVariable = gh(`${repo}/actions/variables/TIMELINE_LABELS_AUTO`) as { name: string; value: string };
  const lastWorkflow = gh(`${repo}/actions/workflows/timeline-labels.yml`) as { id: number; state: string };
  if (variable.name !== "TIMELINE_LABELS_AUTO" || lastVariable.value !== variable.value || workflow.id !== lastWorkflow.id || workflow.state !== lastWorkflow.state ||
    !pages.length || pages.some(p => p.total_count !== runs.length) || new Set(runs.map(r => r.id)).size !== runs.length) throw new Error("BLOCKED: inconsistent/incomplete live observation");
  const observation = FreezeObservation.parse({ schemaVersion: 1, repository: "maxvfk/game-calendar", observedAt: now,
    remoteMain: remoteMain(root), variable: variable.value, workflowState: workflow.state, complete: true, runs,
    ci: { id: ci.id, headSha: ci.head_sha, status: ci.status, conclusion: ci.conclusion, workflowPath: ci.path } });
  assertFreezeGate(go, observation, go.expectedMain, go.action, now);
  return observation;
}
export async function validateCandidate(root: string, goInput: unknown) {
  const go = OperatorGO.parse(goInput);
  if (readGit(root, ["rev-parse", "HEAD"]).trim() !== go.candidate) throw new Error("candidate moved after GO/CI");
  readGit(root, ["diff", "--exit-code", "HEAD"]);
  readGit(root, ["merge-base", "--is-ancestor", go.expectedMain, go.candidate]);
  const s = await loadTimelineStorage(root);
  if (go.action === "cutover") {
    const m = CutoverManifest.parse(await Bun.file(resolve(root, CUTOVER_PATH)).json());
    if (m.sourceMain !== go.expectedMain || s.selection.activeVersion !== 2 || s.selection.admission !== "frozen" || s.selection.epoch !== m.targetEpoch) throw new Error("cutover selection/base not frozen or mismatched");
    const audit = loadProvenanceInventory(root, go.expectedMain);
    const blob = readGit(root, ["rev-parse", `${go.expectedMain}:${V1_PATH}`]).trim();
    const initial = validateCutoverSource(m, audit.manifest, blob, audit.registry);
    if (editorialRegistryBytes(initial) !== editorialRegistryBytes(s.registry)) throw new Error("prepared registry drift: refresh/review candidate");
  } else if (go.action === "release") {
    const prior = StorageSelection.parse(JSON.parse(readGit(root, ["show", `${go.expectedMain}:${STORAGE_PATH}`])));
    const changed = readGit(root, ["diff", "--name-only", go.expectedMain, go.candidate]).trim().split("\n");
    if (changed.length !== 1 || changed[0] !== STORAGE_PATH || prior.admission !== "frozen" || s.selection.admission !== "open" || prior.epoch !== s.selection.epoch || prior.activeVersion !== s.selection.activeVersion) throw new Error("release must only open the existing frozen writer epoch");
  } else {
    const prior = StorageSelection.parse(JSON.parse(readGit(root, ["show", `${go.expectedMain}:${STORAGE_PATH}`])));
    if (prior.activeVersion !== 2) throw new Error("rollback source is not v2");
    const latest = JSON.parse(readGit(root, ["show", `${go.expectedMain}:${V2_PATH}`]));
    const rollback = prepareRollback(latest, prior.epoch);
    if (JSON.stringify(rollback.selection) !== JSON.stringify(s.selection) || await Bun.file(resolve(root, V1_PATH)).text() !== rollback.v1 ||
      await Bun.file(resolve(root, `data/presentation/cutover-archives/${rollback.archiveHash}/registry-v2.json`)).text() !== rollback.archive) throw new Error("rollback does not preserve the latest v2 data/archive");
    const changed = readGit(root, ["diff", "--name-only", go.expectedMain, go.candidate]).trim().split("\n").sort();
    const permitted = [STORAGE_PATH, V1_PATH, `data/presentation/cutover-archives/${rollback.archiveHash}/registry-v2.json`].sort();
    if (!changed.includes(STORAGE_PATH) || changed.some(p => !permitted.includes(p))) throw new Error("rollback must only project/archive latest data and freeze storage");
  }
}
/** CAS lease plus ancestry check: never a rewind, including if remote moves during push. */
export function guardedPush(root: string, goInput: unknown, observation: unknown, now: string) {
  const go = OperatorGO.parse(goInput);
  assertFreezeGate(go, observation, go.expectedMain, go.action, now);
  if (remoteMain(root) !== go.expectedMain) throw new Error("remote main moved: do not publish stale migration/rollback");
  readGit(root, ["merge-base", "--is-ancestor", go.expectedMain, go.candidate]);
  const pushed = Bun.spawnSync(["git", "push", `--force-with-lease=refs/heads/main:${go.expectedMain}`, "origin", `${go.candidate}:refs/heads/main`], { cwd: root });
  if (pushed.exitCode !== 0) throw new Error("compare-and-swap push rejected; refresh/review the changed remote before retrying");
}
async function main() {
  const [mode, file = "HEAD"] = process.argv.slice(2), root = process.cwd();
  if (mode === "inventory" || mode === "bundle") {
    const a = loadProvenanceInventory(root, file);
    const blob = readGit(root, ["rev-parse", `${a.cutoff}:${V1_PATH}`]).trim();
    const m = createCutoverManifest(a.manifest, blob, a.registry);
    if (mode === "inventory") console.log(JSON.stringify(m, null, 2));
    else {
      const out = resolve(root, "tmp/editorial/cutover-candidate");
      const registry = validateCutoverSource(m, a.manifest, blob, a.registry);
      await Bun.write(`${out}/timeline-v2-cutover.v1.json`, JSON.stringify(m, null, 2) + "\n");
      await Bun.write(`${out}/timeline-labels.v2.json`, editorialRegistryBytes(registry));
      await Bun.write(`${out}/timeline-storage.v1.json`, JSON.stringify({ schemaVersion: 1, activeVersion: 2, epoch: m.targetEpoch, admission: "frozen" }, null, 2) + "\n");
      console.log(JSON.stringify({ status: "prepared_not_live", sourceMain: a.cutoff, records: registry.decisions.length, out }));
    }
  } else if (mode === "rollback-bundle") {
    const source = resolveAuditRef(root, file);
    const prior = StorageSelection.parse(JSON.parse(readGit(root, ["show", `${source}:${STORAGE_PATH}`])));
    if (prior.activeVersion !== 2) throw new Error("rollback bundle requires selected v2, not an obsolete inactive file");
    const bundle = prepareRollback(JSON.parse(readGit(root, ["show", `${source}:${V2_PATH}`])), prior.epoch);
    const out = resolve(root, "tmp/editorial/cutover-rollback");
    await Bun.write(`${out}/registry-v2.archive.json`, bundle.archive);
    await Bun.write(`${out}/registry-v1.json`, bundle.v1);
    await Bun.write(`${out}/storage.json`, JSON.stringify(bundle.selection, null, 2) + "\n");
    console.log(JSON.stringify({ status: "prepared_not_live", archiveHash: bundle.archiveHash, source, out }));
  } else if (["check", "publish"].includes(mode ?? "")) {
    // File must contain separate explicit operator GO for this exact main/candidate/CI/window.
    const go = OperatorGO.parse(await Bun.file(file).json());
    await validateCandidate(root, go);
    const observation = observeFreeze(root, go);
    const receipt = { go, observation, status: "checked_not_published" };
    if (mode === "publish") {
      try { guardedPush(root, go, observation, new Date().toISOString()); receipt.status = "published_frozen_verify_CI"; }
      catch (error) { receipt.status = "publish_refused"; await Bun.write("tmp/editorial/cutover-live-observation.json", JSON.stringify(receipt, null, 2) + "\n"); throw error; }
    }
    await Bun.write("tmp/editorial/cutover-live-observation.json", JSON.stringify(receipt, null, 2) + "\n");
    console.log(JSON.stringify({ status: mode === "publish" ? "published_frozen_verify_CI_before_release" : "verified_frozen_candidate_only", action: go.action, candidate: go.candidate }));
  } else throw new Error("Usage: bun scripts/timeline-cutover-operator.ts inventory|bundle [ref] | rollback-bundle <ref> | check|publish <separate-operator-go.json>");
}
if (import.meta.main) await main();
