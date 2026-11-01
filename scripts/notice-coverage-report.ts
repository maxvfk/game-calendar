/** Offline CLI. Reads existing C0/E1 + final events; never builds or refreshes. */
import { open } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { buildNoticeCoverage, COVERAGE_LIMITS, makeCoverageBaseline } from "../src/editorial/notice-coverage.ts";
import { EvidenceSidecar } from "../src/editorial/event-evidence.ts";
import { Baseline, IgnoreRegistry, migratePositionalBaseline } from "../src/editorial/coverage-state.ts";

const { values } = parseArgs({ args: process.argv.slice(2), strict: true, options: {
  sidecar: { type: "string", default: "tmp/editorial/event-evidence.v1.json" },
  events: { type: "string", default: "public/data/events.v1.json" },
  ignores: { type: "string", default: "data/coverage/ignored-notices.v1.json" },
  baseline: { type: "string", default: "data/coverage/notification-baseline.v1.json" },
  "create-baseline": { type: "string" },
  "migrate-baseline": { type: "string" }, output: { type: "string" },
} });
async function json(path: string) {
  const file = Bun.file(path);
  if (file.size > COVERAGE_LIMITS.inputBytes) throw new Error(`Input exceeds ${COVERAGE_LIMITS.inputBytes} bytes: ${path}`);
  return file.json();
}
// Missing/corrupt evidence becomes an explicit not-evaluated report. Invalid
// reviewed state is a hard CLI error; silently dropping decisions is unsafe.
const sidecar = await json(values.sidecar!).catch(() => null);
if (values["migrate-baseline"]) {
  if (!values.output || values["create-baseline"]) throw new Error("Use --migrate-baseline LEGACY --output NEW_INTERNAL_PATH");
  const output = resolve(values.output);
  if (output.split("/").includes("public")) throw new Error("Coverage state cannot be written under public/");
  const migrated = migratePositionalBaseline(await json(values["migrate-baseline"]));
  const handle = await open(output, "wx");
  try { await handle.writeFile(JSON.stringify(migrated, null, 2) + "\n"); } finally { await handle.close(); }
  console.error(`Migrated notification baseline identity only: ${output}`);
} else if (values["create-baseline"]) {
  const valid = EvidenceSidecar.parse(sidecar);
  const validation = buildNoticeCoverage({ sidecar: valid, finalEvents: [] });
  if (validation.diagnostics.length || validation.sources.some(s => !s.available || s.evaluation !== "evaluated"))
    throw new Error("Baseline requires all five usable inventories; missing/incomplete inventory cannot initialize launch suppression");
  const output = resolve(values["create-baseline"]);
  // Internal Git state only. Exclusive creation prevents silent rebaselining.
  if (output.split("/").includes("public")) throw new Error("Coverage state cannot be written under public/");
  const text = JSON.stringify(makeCoverageBaseline(valid.notices), null, 2) + "\n";
  const handle = await open(output, "wx");
  try { await handle.writeFile(text); } finally { await handle.close(); }
  console.error(`Created notification-only baseline: ${output}`);
} else {
  const ignores = IgnoreRegistry.parse(await json(values.ignores!));
  const baseline = Baseline.parse(await json(values.baseline!));
  const data = await json(values.events!).catch(() => null);
  const report = buildNoticeCoverage({ sidecar, finalEvents: Array.isArray(data) ? data : data?.events, ignores, baseline });
  const output = JSON.stringify(report, null, 2) + "\n";
  if (Buffer.byteLength(output) > COVERAGE_LIMITS.outputBytes) {
    // No truncated records or apparent completeness are emitted.
    console.log(JSON.stringify({ schemaVersion: 1, engineVersion: report.engineVersion, evaluation: "incomplete", attentionRequired: true, diagnostics: ["report_output_limit"], sources: report.sources.map(s => ({ sourceId: s.sourceId, available: s.available, evaluation: "not evaluated" })), unsupported: report.unsupported }, null, 2));
    process.exitCode = 2;
  } else console.log(output);
}
