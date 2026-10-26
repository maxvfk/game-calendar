/** Local seams. Only `accept` writes, and only to the paths it is given. */
import { buildTimelineQueue, queueBytes, validateTimelineProposals } from "../src/presentation/timeline-labels.ts";
import { acceptTimelineProposals, registryBytes } from "../src/presentation/timeline-label-accept.ts";
import { TimelineLabelPreferences } from "../src/presentation/timeline-label-agent-input.ts";

const USAGE = "Usage: bun scripts/timeline-labels.ts queue <feed.json> [asOf] | validate <proposals.json> [asOf]" +
  " | accept <proposals.json> <registry-out.json> <report-out.json> [asOf]";
const [mode, file, ...rest] = process.argv.slice(2);
if (mode !== "queue" && mode !== "validate" && mode !== "accept") throw new Error(USAGE);
if (!file) throw new Error(USAGE);
const registry = await Bun.file("data/presentation/timeline-labels.v1.json").json();
const feed = () => Bun.file("public/data/events.v1.json").json();
if (mode === "queue") {
  process.stdout.write(queueBytes(buildTimelineQueue(await Bun.file(file).json(), registry, rest[0])));
} else if (mode === "validate") {
  const result = validateTimelineProposals(await Bun.file(file).json(), await feed(), registry, rest[0]);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
} else {
  const [registryOut, reportOut, asOf] = rest;
  if (!registryOut || !reportOut) throw new Error(USAGE);
  const preferences = TimelineLabelPreferences.parse(
    await Bun.file("data/presentation/timeline-label-preferences.v1.json").json());
  const result = acceptTimelineProposals(await Bun.file(file).json(), await feed(), registry,
    preferences.labelVocabulary ?? [], asOf);
  await Bun.write(registryOut, registryBytes(result.registry));
  const { registry: _, ...report } = result;
  await Bun.write(reportOut, `${JSON.stringify(report, null, 2)}\n`);
  const tally = (o: string) => result.outcomes.filter(x => x.outcome === o).length;
  console.log(`accepted ${tally("accepted")}, guarded ${tally("guarded")}, rejected ${tally("rejected")}, ` +
    `warnings ${result.warnings.length}, registry ${result.changed ? "changed" : "unchanged"}`);
}
