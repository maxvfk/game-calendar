/** Read-only Git adapter, used ONLY by offline inventory/rehearsal; never production. */
import { TimelineRegistry } from "../src/presentation/timeline-labels.ts";
import { inventoryProvenance, REGISTRY_PATH, type HistoryCommit } from "../src/editorial/provenance-migration.ts";

export function readGit(root: string, args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], { cwd: root, env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" } });
  if (result.exitCode !== 0) throw new Error(`read-only Git command failed: ${args[0]}`);
  return result.stdout.toString();
}
export function resolveAuditRef(root: string, ref: string) {
  const sha = readGit(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("unsupported Git object format");
  return sha;
}
export function loadProvenanceInventory(root: string, ref = "HEAD") {
  if (readGit(root, ["rev-parse", "--is-shallow-repository"]).trim() !== "false") throw new Error("migration requires full history (fetch-depth: 0)");
  const cutoff = resolveAuditRef(root, ref);
  const pathAt = (sha: string) => {
    const exists = Bun.spawnSync(["git", "cat-file", "-e", `${sha}:${REGISTRY_PATH}`], { cwd: root, env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" } });
    return exists.exitCode === 0 ? TimelineRegistry.parse(JSON.parse(readGit(root, ["show", `${sha}:${REGISTRY_PATH}`]))) : null;
  };
  const commits = readGit(root, ["rev-list", "--first-parent", "--reverse", "--full-history", cutoff, "--", REGISTRY_PATH]).trim().split("\n").filter(Boolean);
  const history: HistoryCommit[] = commits.map(sha => {
    const [actual, parentsText, authorName, authorEmail, committerName, committerEmail, subject] = readGit(root,
      ["show", "-s", "--format=%H%x00%P%x00%an%x00%ae%x00%cn%x00%ce%x00%s", sha]).trimEnd().split("\0");
    const parents = parentsText!.split(" ").filter(Boolean);
    const changedFiles = readGit(root, parents.length
      ? ["diff", "--name-only", "-z", parents[0]!, sha, "--"]
      : ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", sha]).split("\0").filter(Boolean).sort();
    const after = pathAt(sha);
    if (!after) throw new Error("registry removed from history; review required before migration");
    return { sha: actual!, parents, author: { name: authorName!, email: authorEmail! }, committer: { name: committerName!, email: committerEmail! },
      subject: subject!, changedFiles, before: parents.length ? pathAt(parents[0]!) : null, after };
  });
  const raw = readGit(root, ["show", `${cutoff}:${REGISTRY_PATH}`]);
  const registry = TimelineRegistry.parse(JSON.parse(raw));
  return { cutoff, raw, registry, history, manifest: inventoryProvenance(cutoff, history, registry) };
}
