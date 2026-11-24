// Keep one GitHub issue in step with the scheduled sources that have gone more
// than 48 hours without a confirmed fetch. Run by refresh.yml after each refresh
// on the default branch; `--dry-run` prints the plan without calling GitHub. The
// rules live in src/ingest/liveness.ts, where the tests exercise them.
import { appendFile } from "node:fs/promises";
import { ADAPTERS } from "../src/ingest/adapters/index.ts";
import {
  applyStaleIssue,
  collectConfirmations,
  type OpenIssue,
  planStaleIssue,
  STALE_ISSUE_LABEL,
  type StaleIssueClient,
  unconfirmedSources,
  unknownSources,
} from "../src/ingest/liveness.ts";
import { SnapshotStore } from "../src/ingest/snapshots.ts";

/** The login GitHub gives issues created with the workflow's GITHUB_TOKEN. */
const BOT_LOGIN = "github-actions[bot]";

function gh(args: string[], input?: string): string {
  const result = Bun.spawnSync(["gh", ...args], {
    stdin: input === undefined ? "ignore" : new TextEncoder().encode(input),
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${result.stderr.toString().trim()}`);
  }
  return result.stdout.toString();
}

/**
 * The bot's open issue carrying the label. Found by label and author rather than
 * by title, so a person's issue with the same title is never edited or closed,
 * and the REST filter has no page cut-off to hide it behind.
 */
function findOpenIssue(): OpenIssue | null {
  const issues = JSON.parse(gh([
    "api", "--method", "GET", "repos/{owner}/{repo}/issues",
    "-f", "state=open", "-f", `labels=${STALE_ISSUE_LABEL}`, "-f", `creator=${BOT_LOGIN}`, "-f", "per_page=100",
  ])) as { number: number; body: string | null; pull_request?: unknown; user: { login: string } }[];
  const ours = issues
    .filter((issue) => issue.pull_request === undefined && issue.user.login === BOT_LOGIN)
    .sort((a, b) => a.number - b.number);
  if (ours.length > 1) {
    console.log(`::warning::several open stale-source issues (${ours.map((i) => `#${i.number}`).join(", ")}); updating the oldest`);
  }
  const issue = ours[0];
  return issue === undefined ? null : { number: issue.number, body: issue.body ?? "" };
}

const client: StaleIssueClient = {
  create(title, body) {
    gh(["label", "create", STALE_ISSUE_LABEL, "--color", "B60205", "--force",
      "--description", "Managed by refresh.yml: scheduled sources without a confirmed fetch"]);
    return gh(["issue", "create", "--title", title, "--label", STALE_ISSUE_LABEL, "--body-file", "-"], body).trim();
  },
  edit(number, body) {
    gh(["issue", "edit", String(number), "--body-file", "-"], body);
  },
  comment(number, body) {
    gh(["issue", "comment", String(number), "--body-file", "-"], body);
  },
  close(number, comment) {
    gh(["issue", "close", String(number), "--comment", comment]);
  },
};

async function main(): Promise<number> {
  const dryRun = process.argv.includes("--dry-run");
  const now = Date.now();
  const confirmations = await collectConfirmations(new SnapshotStore("snapshots"), ADAPTERS.map((a) => a.id));
  const stale = unconfirmedSources(confirmations, now);
  const unknown = unknownSources(confirmations);

  console.log(`${stale.length} of ${confirmations.length} scheduled source(s) unconfirmed for over 48h`);
  for (const s of stale) console.log(`  ${s.sourceId.padEnd(28)} last confirmed ${s.lastConfirmedAt}`);
  for (const s of unknown) console.log(`  ${s.sourceId.padEnd(28)} no record yet; age unknown`);
  if (stale.length > 0) {
    console.log(`::warning::${stale.length} source(s) without a confirmed fetch for over 48h: ${stale.map((s) => s.sourceId).join(", ")}`);
  }
  const outputPath = process.env["GITHUB_OUTPUT"];
  if (outputPath) await appendFile(outputPath, `stale=${stale.length}\n`);

  if (dryRun) {
    console.log(`dry run: would ${planStaleIssue(null, stale, unknown, now).kind} (open issue not looked up)`);
    return 0;
  }
  console.log(applyStaleIssue(planStaleIssue(findOpenIssue(), stale, unknown, now), client));
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
