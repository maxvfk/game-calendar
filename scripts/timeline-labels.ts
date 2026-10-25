/** Read-only local seams; never changes the reviewed registry or source events. */
import { buildTimelineQueue, queueBytes, validateTimelineProposals } from "../src/presentation/timeline-labels.ts";

const [mode, file, asOf] = process.argv.slice(2);
if (mode !== "queue" && mode !== "validate") throw new Error(
  "Usage: bun scripts/timeline-labels.ts queue <feed.json> [asOf] | validate <proposals.json> [asOf]",
);
const registry = await Bun.file("data/presentation/timeline-labels.v1.json").json();
if (mode === "queue") {
  if (!file) throw new Error("feed path required");
  process.stdout.write(queueBytes(buildTimelineQueue(await Bun.file(file).json(), registry, asOf)));
} else {
  if (!file) throw new Error("proposal path required");
  const result = validateTimelineProposals(await Bun.file(file).json(),
    await Bun.file("public/data/events.v1.json").json(), registry, asOf);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
