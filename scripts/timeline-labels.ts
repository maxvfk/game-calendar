/** Selected-registry accept requires a ticket; preview writes scratch only. */
import { open, rename, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { buildTimelineQueue, queueBytes, validateTimelineProposals } from "../src/presentation/timeline-labels.ts";
import { acceptTimelineProposals } from "../src/presentation/timeline-label-accept.ts";
import { loadTimelineStorage, assertWriterTicket, acceptStoredTimelineProposals, storedRegistryBytes } from "../src/editorial/timeline-storage.ts";
import { TimelineLabelPreferences } from "../src/presentation/timeline-label-agent-input.ts";

const USAGE = "Usage: bun scripts/timeline-labels.ts queue <feed.json> [asOf] | validate <proposals.json> [asOf]" +
  " | accept <proposals.json> <registry-out.json> <report-out.json> <asOf-or-empty> <writer-ticket.json> | preview <proposals.json> <scratch-registry.json> <scratch-report.json> [asOf]";
const [mode, file, ...rest] = process.argv.slice(2);
if (mode !== "queue" && mode !== "validate" && mode !== "accept" && mode !== "preview") throw new Error(USAGE);
if (!file) throw new Error(USAGE);
const storage = await loadTimelineStorage();
const registry = storage.projection;
const feed = () => Bun.file("public/data/events.v1.json").json();
if (mode === "queue") {
  process.stdout.write(queueBytes(buildTimelineQueue(await Bun.file(file).json(), registry, rest[0])));
} else if (mode === "validate") {
  const result = validateTimelineProposals(await Bun.file(file).json(), await feed(), registry, rest[0]);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
} else {
  const [registryOut, reportOut, asOf, ticketFile] = rest;
  if (!registryOut || !reportOut) throw new Error(USAGE);
  const preview = mode === "preview";
  if (preview) {
    for (const path of [registryOut, reportOut]) {
      if (!["probe", "tmp"].some(dir => resolve(path).startsWith(resolve(dir) + sep))) throw new Error("preview outputs must stay beneath probe/ or tmp/");
    }
  }
  if (!preview && !ticketFile) throw new Error("writer ticket required; stale v1 writer is not admitted");
  const ticket = preview ? null : await Bun.file(ticketFile!).json();
  if (!preview) assertWriterTicket(storage.selection, ticket, registryOut);
  const preferences = TimelineLabelPreferences.parse(
    await Bun.file("data/presentation/timeline-label-preferences.v1.json").json());
  const accept = storage.selection.activeVersion === 2 ? acceptStoredTimelineProposals : acceptTimelineProposals;
  const result = accept(await Bun.file(file).json(), await feed(), storage.registry,
    preferences.labelVocabulary ?? [], asOf || undefined);
  const ensureScratch = (path: string) => {
    const full = resolve(path), cwd = resolve(".");
    if (full === cwd || (full.startsWith(cwd + sep) && !["probe", "tmp"].some(dir => full.startsWith(resolve(dir) + sep)))) throw new Error("report/preview must use scratch output paths");
  };
  ensureScratch(reportOut);
  if (preview) await Bun.write(registryOut, storedRegistryBytes(result.registry));
  else {
    const lockPath = registryOut + ".writer-lock";
    const lock = await open(lockPath, "wx"); // Same-checkout concurrent accepts fail closed.
    const temporary = registryOut + ".tmp-writer-" + process.pid;
    try {
      const fresh = await loadTimelineStorage();
      assertWriterTicket(fresh.selection, ticket, registryOut);
      if (storedRegistryBytes(fresh.registry) !== storedRegistryBytes(storage.registry)) throw new Error("registry moved during accept");
      await writeFile(temporary, storedRegistryBytes(result.registry));
      await rename(temporary, registryOut);
    } finally { await lock.close(); await rm(temporary, { force: true }); await rm(lockPath, { force: true }); }
  }
  const { registry: _, ...report } = result;
  await Bun.write(reportOut, `${JSON.stringify(report, null, 2)}\n`);
  const tally = (o: string) => result.outcomes.filter(x => x.outcome === o).length;
  console.log(`accepted ${tally("accepted")}, guarded ${tally("guarded")}, rejected ${tally("rejected")}, ` +
    `warnings ${result.warnings.length}, registry ${result.changed ? "changed" : "unchanged"}`);
}
