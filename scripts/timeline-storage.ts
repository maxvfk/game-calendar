import { loadTimelineStorage, writerTicket, assertWriterTicket } from "../src/editorial/timeline-storage.ts";
const [mode, out] = process.argv.slice(2);
const storage = await loadTimelineStorage();
if (mode === "check-ticket" && out) {
  assertWriterTicket(storage.selection, await Bun.file(out).json(), storage.path);
  console.log(storage.path);
} else if (mode === "path") console.log(storage.path);
else if (mode === "ticket" && out) {
  if (storage.selection.admission === "frozen") { console.log("frozen"); process.exit(0); }
  await Bun.write(out, JSON.stringify(writerTicket(storage.selection), null, 2) + "\n");
  console.log("open");
} else throw new Error("Usage: bun scripts/timeline-storage.ts path | ticket <out>");
