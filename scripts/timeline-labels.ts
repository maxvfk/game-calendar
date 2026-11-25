/** Local seams. Only `accept` writes, and only to the paths it is given. */
import { buildTimelineQueue, queueBytes, validateTimelineProposals } from "../src/presentation/timeline-labels.ts";
import { acceptTimelineProposals, registryBytes } from "../src/presentation/timeline-label-accept.ts";
import { TimelineLabelPreferences } from "../src/presentation/timeline-label-agent-input.ts";
import { loadRussianGlossary, type RussianGlossaries } from "../src/presentation/timeline-label-glossary.ts";
import { GameId } from "../src/shared/schema.ts";
import { TimelineLabelLanguage } from "../src/shared/timelineIdentity.ts";

const USAGE = "Usage: bun scripts/timeline-labels.ts queue <feed.json> [asOf] | validate <proposals.json> [asOf]" +
  " | accept <proposals.json> <registry-out.json> <report-out.json> [asOf] (optional: --lang en|ru)";
const args = process.argv.slice(2);
const option = args.indexOf("--lang");
const language = option === -1 ? "en" : TimelineLabelLanguage.safeParse(args.splice(option, 2)[1]).data;
const [mode, file, ...rest] = args;
if (mode !== "queue" && mode !== "validate" && mode !== "accept") throw new Error(USAGE);
if (!file || !language || rest.includes("--lang")) throw new Error(USAGE);
const suffix = language === "ru" ? ".ru.v1.json" : ".v1.json";
const presentation = "data/presentation";
const registry = await Bun.file(`${presentation}/timeline-labels${suffix}`).json();
const feed = () => Bun.file("public/data/events.v1.json").json();
const readPreferences = async () => {
  const preferences = TimelineLabelPreferences.parse(
    await Bun.file(`${presentation}/timeline-label-preferences${suffix}`).json());
  if (preferences.language !== language) throw new Error(`Expected ${language} timeline label preferences`);
  return preferences;
};
const russianPreferences = language === "ru" ? await readPreferences() : undefined;
const glossaries: RussianGlossaries | undefined = language === "ru" && mode !== "queue"
  ? Object.fromEntries(await Promise.all(GameId.options.map(async game => [game, await loadRussianGlossary(game)])))
  : undefined;
if (mode === "queue") {
  process.stdout.write(queueBytes(buildTimelineQueue(await Bun.file(file).json(), registry, rest[0], undefined, language)));
} else if (mode === "validate") {
  const result = validateTimelineProposals(await Bun.file(file).json(), await feed(), registry, rest[0], glossaries);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
} else {
  const [registryOut, reportOut, asOf] = rest;
  if (!registryOut || !reportOut) throw new Error(USAGE);
  const preferences = russianPreferences ?? await readPreferences();
  const result = acceptTimelineProposals(await Bun.file(file).json(), await feed(), registry,
    preferences.labelVocabulary ?? [], asOf, glossaries);
  await Bun.write(registryOut, registryBytes(result.registry));
  const { registry: _, ...report } = result;
  await Bun.write(reportOut, `${JSON.stringify(report, null, 2)}\n`);
  const tally = (o: string) => result.outcomes.filter(x => x.outcome === o).length;
  console.log(`accepted ${tally("accepted")}, guarded ${tally("guarded")}, rejected ${tally("rejected")}, ` +
    `warnings ${result.warnings.length}, registry ${result.changed ? "changed" : "unchanged"}`);
}
