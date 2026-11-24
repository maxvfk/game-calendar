// Keep one GitHub issue in step with the scheduled sources that have gone more
// than 48 hours without a confirmed fetch. Run by refresh.yml after each refresh;
// `--dry-run` prints the plan without calling GitHub. The rules live in
// src/ingest/liveness.ts, where the tests exercise them.
import { appendFile } from "node:fs/promises";
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import {
  collectConfirmations,
  planStaleIssue,
  STALE_ISSUE_TITLE,
  type OpenIssue,
  type StaleIssueAction,
  unconfirmedSources,
} from "../src/ingest/liveness.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";

function gh(args: string[], input?: string): string {
  const result = Bun.spawnSync(["gh", ...args], {
    stdin: input === undefined ? "ignore" : new TextEncoder().encode(input),
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(`gh ${args[0]} ${args[1]} failed: ${result.stderr.toString().trim()}`);
  }
  return result.stdout.toString();
}

function findOpenIssue(): OpenIssue | null {
  // A plain listing rather than search: the search index can lag behind an issue
  // opened minutes ago. Matched on the exact title.
  const issues = JSON.parse(gh([
    "issue", "list", "--state", "open", "--limit", "200", "--json", "number,title,body",
  ])) as { number: number; title: string; body: string }[];
  const issue = issues.find((candidate) => candidate.title === STALE_ISSUE_TITLE);
  return issue === undefined ? null : { number: issue.number, body: issue.body };
}

function apply(action: StaleIssueAction): string {
  switch (action.kind) {
    case "none":
      return "no stale sources and no open issue";
    case "open":
      return `opened ${gh(["issue", "create", "--title", STALE_ISSUE_TITLE, "--body-file", "-"], action.body).trim()}`;
    case "update":
      gh(["issue", "edit", String(action.number), "--body-file", "-"], action.body);
      if (action.comment !== null) gh(["issue", "comment", String(action.number), "--body-file", "-"], action.comment);
      return `updated #${action.number}${action.comment === null ? "" : " with a comment"}`;
    case "close":
      gh(["issue", "close", String(action.number), "--comment", action.comment]);
      return `closed #${action.number}`;
  }
}

async function main(): Promise<number> {
  const dryRun = process.argv.includes("--dry-run");
  const now = Date.now();
  const confirmations = await collectConfirmations(new SnapshotStore("snapshots"), ADAPTERS.map((a) => a.id));
  const stale = unconfirmedSources(confirmations, now);

  console.log(`${stale.length} of ${confirmations.length} scheduled source(s) unconfirmed for over 48h`);
  for (const s of stale) console.log(`  ${s.sourceId.padEnd(28)} last confirmed ${s.lastConfirmedAt ?? "never"}`);
  if (stale.length > 0) {
    console.log(`::warning::${stale.length} source(s) without a confirmed fetch for over 48h: ${stale.map((s) => s.sourceId).join(", ")}`);
  }
  const outputPath = process.env["GITHUB_OUTPUT"];
  if (outputPath) await appendFile(outputPath, `stale=${stale.length}\n`);

  if (dryRun) {
    console.log(`dry run: would ${planStaleIssue(null, stale, now).kind} (open issue not looked up)`);
    return 0;
  }
  console.log(apply(planStaleIssue(findOpenIssue(), stale, now)));
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
