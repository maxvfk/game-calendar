import { cpSync } from "node:fs";
import { join } from "node:path";

const games = ["czn", "endfield", "genshin", "hsr", "nte", "wuwa", "zzz"];

export function stageSnapshotFixtures(destination: string) {
  for (const game of games) {
    const source = join(import.meta.dir, "../fixtures", game, "snapshots-418d518");
    cpSync(source, destination, { recursive: true });
  }
}
