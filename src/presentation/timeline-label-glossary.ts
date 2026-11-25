import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { GameId } from "../shared/schema.ts";
import { TimelineTitle } from "../shared/timelineIdentity.ts";

export const RussianGlossary = z.array(z.object({
  en: TimelineTitle,
  ru: TimelineTitle,
  kind: z.enum(["character", "bangboo", "w-engine", "weapon", "mode", "currency", "item", "other"]),
}).strict());
export type RussianGlossary = z.infer<typeof RussianGlossary>;
export type RussianGlossaries = Partial<Record<GameId, RussianGlossary>>;

export async function loadRussianGlossary(game: GameId, directory = "data/presentation/glossary"): Promise<RussianGlossary> {
  try {
    return RussianGlossary.parse(JSON.parse(await readFile(`${directory}/${game}.ru.json`, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
