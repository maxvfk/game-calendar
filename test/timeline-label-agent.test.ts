import { describe, expect, test } from "bun:test";
import { TimelineDecision, TimelineRegistry } from "../src/presentation/timeline-labels.ts";

const schema = await Bun.file("scripts/timeline-label-agent/decisions.schema.json").json();
const prompt = await Bun.file("scripts/timeline-label-agent/system-prompt.md").text();
const probe = await Bun.file(".github/workflows/timeline-labels-probe.yml").text();
const runner = await Bun.file("scripts/timeline-label-agent/run-model.sh").text();
const registry = TimelineRegistry.parse(await Bun.file("data/presentation/timeline-labels.v1.json").json());

/** Minimal structural check of one decision against the draft-07 model output schema. */
function fitsSchema(decision: Record<string, unknown>): boolean {
  const item = schema.properties.decisions.items;
  const keys = Object.keys(decision);
  if (!keys.every(k => k in item.properties)) return false;
  if (!item.required.every((k: string) => k in decision)) return false;
  if (!item.properties.decision.enum.includes(decision.decision)) return false;
  if (!new RegExp(item.properties.fingerprint.pattern).test(String(decision.fingerprint))) return false;
  for (const [key, rule] of Object.entries(item.properties) as [string, { maxLength?: number; minLength?: number }][]) {
    const value = decision[key];
    if (typeof value !== "string") continue;
    if (rule.maxLength !== undefined && value.length > rule.maxLength) return false;
    if (rule.minLength !== undefined && value.length < rule.minLength) return false;
  }
  return true;
}

describe("timeline label agent probe", () => {
  test("model output schema is draft-07 and matches the L1 decision kinds", () => {
    expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect(schema.properties.schemaVersion.const).toBe(1);
    const kinds = TimelineDecision.options.map(option => option.shape.decision.value).sort();
    expect([...schema.properties.decisions.items.properties.decision.enum].sort()).toEqual(kinds);
  });

  test("every operator-approved registry decision fits the model output schema", () => {
    expect(registry.decisions.length).toBeGreaterThan(0);
    for (const decision of registry.decisions) expect(fitsSchema(decision)).toBe(true);
    expect(fitsSchema({ ...registry.decisions[0]!, approved: true })).toBe(false);
    expect(fitsSchema({ ...registry.decisions[0]!, decision: "approve" })).toBe(false);
  });

  test("system prompt keeps event text as data and the model without tools", () => {
    expect(prompt).toContain("untrusted data");
    expect(prompt).toContain("You have no tools");
    expect(prompt).toContain("Never invent characters, rewards, dates or certainty");
  });

  test("probe workflow stays manual and read-only", () => {
    expect(probe).toContain("workflow_dispatch:");
    expect(probe).not.toContain("schedule:");
    expect(probe).toContain("permissions:\n  contents: read");
    expect(probe).not.toMatch(/contents:\s*write|actions:\s*write|pull-requests:\s*write/);
    expect(probe).not.toMatch(/git (push|commit)|gh (pr|workflow run)/);
    expect(probe).toContain("persist-credentials: false");
    expect(probe).toContain("bash scripts/timeline-label-agent/run-model.sh");
    expect(runner).toContain('--tools ""');
    expect(runner).not.toMatch(/set -x|echo "\$token"|echo "\$raw"/);
    expect(probe.match(/secrets\.CLAUDE_CODE_OAUTH_TOKEN/g)?.length).toBe(1);
    expect(probe).not.toContain("timeline-labels.v1.json");
    expect(probe).toContain("accept probe/proposals.json probe/registry-after.json probe/accept-report.json");
  });
});

const workflow = await Bun.file(".github/workflows/timeline-labels.yml").text();
const record = await Bun.file("scripts/timeline-label-agent/record.sh").text();

describe("timeline labels rehearsal (M3.5)", () => {
  const [, propose = "", recordJob = ""] = workflow.split(/\n  (?:propose|record):\n/);

  test("stays manual and targets only the rehearsal branch", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("schedule:");
    expect(workflow).toContain("TARGET_BRANCH: timeline-labels/rehearsal");
    expect(workflow).not.toMatch(/TARGET_BRANCH: main|--ref main\b|HEAD:main/);
    expect(workflow).toContain("group: timeline-labels");
  });

  test("the model job is read-only and the write job never sees the Claude token", () => {
    expect(workflow.match(/secrets\.CLAUDE_CODE_OAUTH_TOKEN/g)?.length).toBe(1);
    expect(propose).toContain("secrets.CLAUDE_CODE_OAUTH_TOKEN");
    expect(propose).toContain("persist-credentials: false");
    expect(propose).not.toMatch(/contents:\s*write|actions:\s*write|git push/);
    expect(recordJob).not.toContain("secrets.");
    expect(recordJob).not.toContain("claude");
    expect(recordJob).toContain("contents: write");
  });

  test("record pushes main fast-forward only and gives up after three attempts", () => {
    expect(record).toContain("main) push_args=() ;;");
    expect(record).toContain("timeline-labels/rehearsal) push_args=(--force) ;;");
    expect(record).toMatch(/\*\) echo "::error::Unsupported target branch/);
    expect(record).toContain("for attempt in 1 2 3; do");
    expect(record).toContain("git checkout --quiet --detach origin/main");
    for (const check of ["bun run typecheck", "bun test", "bun run build"]) expect(record).toContain(check);
    expect(record).toContain("git add -- \"$registry\"");
  });
});
