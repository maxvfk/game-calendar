/** Prepare disposable browser validation files; never included by the production build.
 * bun scripts/prepare-timeline-label-browser.ts /absolute/scratch/output
 * Serve that directory and press Run regression in a real browser. */
import { resolve } from "node:path";

const directory = process.argv[2];
if (!directory) throw new Error("explicit disposable output directory required");
for (const [name, entrypoint] of [
  ["labels", "test/helpers/timeline-label-browser.tsx"],
  ["navigation", "test/helpers/timeline-browser.tsx"],
] as const) {
  const build = await Bun.build({ entrypoints: [entrypoint], target: "browser" });
  if (!build.success) throw new Error(String(build.logs));
  await Bun.write(resolve(directory, `${name}.js`), await build.outputs[0]!.text());
  await Bun.write(resolve(directory, `${name}.html`), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><div id="root"></div><script type="module" src="${name}.js"></script>`);
}
await Bun.write(resolve(directory, "styles.css"), Bun.file("public/styles.css"));
await Bun.write(resolve(directory, "checks.js"), Bun.file("test/helpers/timeline-label-browser-checks.mjs"));
await Bun.write(resolve(directory, "index.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Timeline L1 browser validation</title><style>body{font:16px system-ui;margin:12px;background:#eef2f7;color:#172033}button{padding:10px;margin:5px}iframe{display:block;border:1px solid #8995a7;height:900px;background:#0c1220}pre{white-space:pre-wrap}select{padding:10px}</style>
<h1>Timeline L1 browser validation</h1><button id="run">Run regression</button>
<label>Preview width <select id="width"><option>320</option><option>390</option><option>1440</option></select></label>
<button id="preview">Show label fixture</button><pre id="status" role="status">Ready — synthetic approved copy; no production registry edits.</pre>
<iframe id="fixture" title="Responsive Timeline fixture" width="320" src="labels.html"></iframe><script type="module" src="checks.js"></script>`);
console.log(`Prepared disposable browser validation: ${resolve(directory)}`);
