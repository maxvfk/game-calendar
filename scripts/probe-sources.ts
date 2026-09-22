/** Evidence only: no adapter activation, commits, or publication. Run in Actions. */
import { mkdir } from "node:fs/promises";
import { crawlDelayMs, isAllowed, parseRobots, requestTarget } from "../src/ingest/robots.ts";

if (process.env["GITHUB_ACTIONS"] !== "true") throw new Error("Capture must run in GitHub Actions");
const root = "source-probes";
await mkdir(root, { recursive: true });
const ua = "game-calendar/1.0 (+https://github.com/maxvfk/game-calendar)";
for (const [id, url] of [
  ["ntebuild-btr", "https://www.ntebuild.com/events"],
  ["prydwen-czn-banners", "https://www.prydwen.gg/chaos-zero-nightmare/banners"],
] as const) {
  const evidence: Record<string, unknown> = {
    id, url, capturedAt: new Date().toISOString(), userAgent: ua,
    runId: process.env["GITHUB_RUN_ID"], commit: process.env["GITHUB_SHA"],
  };
  try {
    const robotsUrl = new URL("/robots.txt", url).href;
    const response = await fetch(robotsUrl, { headers: { "User-Agent": ua }, redirect: "error", signal: AbortSignal.timeout(30_000) });
    const body = await response.text();
    await Bun.write(`${root}/${id}.robots.txt`, body);
    evidence["robotsStatus"] = response.status;
    if (response.status !== 200 && response.status !== 404) throw new Error(`Robots unavailable: ${response.status}`);
    const rules = parseRobots(response.status === 404 ? "" : body);
    evidence["allowed"] = isAllowed(rules, ua, requestTarget(url));
    if (!evidence["allowed"]) throw new Error("Robots disallows target");
    const delay = Math.max(2000, crawlDelayMs(rules, ua) ?? 0);
    evidence["delayMs"] = delay;
    if (delay > 60_000) throw new Error("Crawl delay exceeds this probe's wait budget");
    await Bun.sleep(delay);
    const page = await fetch(url, { headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml" }, redirect: "error", signal: AbortSignal.timeout(30_000) });
    const bytes = new Uint8Array(await page.arrayBuffer());
    evidence["status"] = page.status;
    evidence["contentType"] = page.headers.get("content-type");
    evidence["bytes"] = bytes.length;
    evidence["sha256"] = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
    await Bun.write(`${root}/${id}.${page.status === 200 ? "html" : "rejected.txt"}`, bytes);
  } catch (error) { evidence["error"] = String(error); }
  await Bun.write(`${root}/${id}.meta.json`, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence));
}
