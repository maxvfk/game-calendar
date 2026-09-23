/** Bounded evidence capture in Actions. No adapter activation or publication. */
import { mkdir } from "node:fs/promises";
import { crawlDelayMs, isAllowed, parseRobots, requestTarget } from "../src/ingest/robots.ts";

if (process.env["GITHUB_ACTIONS"] !== "true") throw new Error("Capture must run in GitHub Actions");
const root = "source-probes";
await mkdir(root, { recursive: true });
const ua = "game-calendar/1.0 (+https://github.com/maxvfk/game-calendar)";
const timeout = 30_000;
const candidates = [
  { id: "genshin-kqm", kind: "documented-github-api", url: "https://api.github.com/repos/KQM-git/GINews/contents/readme.md" },
  { id: "hsr-kqm", kind: "documented-github-api", url: "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md" },
  { id: "wuwa-kuro-mirror", kind: "documented-github-api", url: "https://api.github.com/repos/TheLovinator1/wutheringwaves/contents/articles_latest.xml" },
  { id: "zzz-official", kind: "website", url: "https://zenless.hoyoverse.com/en-us/news", detail: "https://zenless.hoyoverse.com/en-us/news/166000" },
  { id: "endfield-official", kind: "website", url: "https://endfield.gryphline.com/en-us/news", detail: "https://endfield.gryphline.com/en-us/news/5208" },
] as const;

for (const target of candidates) {
  const evidence: Record<string, unknown> = {
    id: target.id, url: target.url, kind: target.kind,
    capturedAt: new Date().toISOString(), userAgent: ua,
    runId: process.env["GITHUB_RUN_ID"], commit: process.env["GITHUB_SHA"],
  };
  try {
    let delay = 2_000;
    if (target.kind === "website") {
      const robotsUrl = new URL("/robots.txt", target.url).href;
      const robotsResponse = await fetch(robotsUrl, { headers: { "User-Agent": ua }, redirect: "error", signal: AbortSignal.timeout(timeout) });
      const body = await robotsResponse.text();
      evidence["robotsStatus"] = robotsResponse.status;
      evidence["robotsSha256"] = new Bun.CryptoHasher("sha256").update(body).digest("hex");
      if (robotsResponse.status !== 200 && robotsResponse.status !== 404) throw new Error(`Robots unavailable: ${robotsResponse.status}`);
      const rules = parseRobots(robotsResponse.status === 404 ? "" : body);
      for (const url of [target.url, ...( "detail" in target ? [target.detail] : [] )]) {
        if (!isAllowed(rules, ua, requestTarget(url))) throw new Error(`Robots disallows ${url}`);
      }
      delay = Math.max(2_000, crawlDelayMs(rules, ua) ?? 0);
      if (delay > 60_000) throw new Error("Crawl delay exceeds this probe's wait budget");
      evidence["delayMs"] = delay;
      await Bun.write(`${root}/${target.id}.robots.txt`, body);
    } else {
      // Exact documented API endpoints, rather than HTML requests to GitHub.
      evidence["apiContract"] = "https://docs.github.com/en/rest/repos/contents#get-repository-content";
    }

    const urls = [target.url, ...( "detail" in target ? [target.detail] : [] )];
    for (const [index, url] of urls.entries()) {
      await Bun.sleep(delay);
      const headers = target.kind === "website"
        ? { "User-Agent": ua, Accept: "text/html,application/xhtml+xml" }
        : { "User-Agent": ua, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" };
      const page = await fetch(url, { headers, redirect: "error", signal: AbortSignal.timeout(timeout) });
      const bytes = new Uint8Array(await page.arrayBuffer());
      const name = index === 0 ? "index" : "detail";
      const summary = {
        url, status: page.status, contentType: page.headers.get("content-type"), bytes: bytes.length,
        sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
        etag: page.headers.get("etag"), lastModified: page.headers.get("last-modified"),
        rateLimitRemaining: page.headers.get("x-ratelimit-remaining"),
        rateLimitReset: page.headers.get("x-ratelimit-reset"),
      };
      evidence[name] = summary;
      if (page.status !== 200 || bytes.length === 0 || bytes.length > 2_000_000) continue;
      const content = new TextDecoder().decode(bytes);
      evidence[`${name}Shape`] = {
        hasHtml: /<html\b/i.test(content), hasArticle: /article|news|notice/i.test(content),
        hasDate: /2026[-/]\d\d[-/]\d\d/.test(content),
        hasTarget: target.id === "endfield-official" ? content.includes("Snow Over Deep Woods") :
          target.id === "zzz-official" ? content.includes("Potential Hypothesis") : undefined,
        envelope: content.startsWith("{") ? "json" : content.startsWith("<?xml") ? "xml" : "text",
      };
      if (target.kind === "website") {
        // Publisher HTML is kept as a short-lived artifact for the parser gate.
        await Bun.write(`${root}/${target.id}.${name}.html`, bytes);
      }
      // Community mirrors have no explicit redistribution license: preserve
      // only response metadata and structure, never the full mirrored archive.
    }
  } catch (error) { evidence["error"] = String(error); }
  await Bun.write(`${root}/${target.id}.meta.json`, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence));
}
