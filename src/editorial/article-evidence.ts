/** C0: complete article inventory + exact source-event attribution inside E1.
 * Full notice text is untrusted replay data, never eligible editorial excerpts.
 * No date detection, coverage status, fuzzy association or model calls here.
 */
import { createHash } from "node:crypto";
import type { ParseContext } from "../ingest/adapters/types.ts";
import { discoverKqmGinArticles } from "../ingest/parsers/kqm-ginews.ts";
import { discoverKqmHsrArticles } from "../ingest/parsers/kqm-hsrnews.ts";
import { discoverZzzSteamPosts } from "../ingest/parsers/zzz-steam-rss.ts";
import { discoverWuwaArticles } from "../ingest/parsers/wuwa-kuro-atom.ts";
import { discoverNteSteamPosts } from "../ingest/parsers/nte-steamnews.ts";
import type { GachaEvent } from "../shared/schema.ts";
import { ArticleNotice, Capture, type Extraction, type ArticleAttribution, type Diagnostic } from "./event-evidence.ts";

export const ARTICLE_SOURCE_GAMES = {
  "wuwa-kuro-mirror": "wuwa", "genshin-kqm-ginews": "genshin", "hsr-kqm-hsrnews": "hsr",
  "zzz-steam-events-official": "zzz", "nte-steamnews-official": "nte",
} as const;
export function isArticleSource(sourceId: string): sourceId is keyof typeof ARTICLE_SOURCE_GAMES {
  return Object.hasOwn(ARTICLE_SOURCE_GAMES, sourceId);
}
export function noticeContentHash(title: string, content: string): string {
  return createHash("sha256").update(JSON.stringify([title, content])).digest("hex");
}
class InventoryError extends Error {
  constructor(readonly code: "article_inventory_incomplete" | "article_inventory_empty") { super(code); }
}

/** Independent heading structure check, deliberately broader than canonical discovery.
 * Every level-one ATX heading is a potential article boundary, even without a
 * link. Archive references in lower headings also require discovery; ordinary
 * lower headings and body links do not. Unknown layouts fail optional evidence.
 */
function checkKqmInventory(raw: string, items: Array<{ id: string; heading: string }>) {
  const boundaries: Array<{ id: string | undefined; heading: string }> = [];
  for (const line of raw.split(/\r?\n/)) {
    const heading = /^ {0,3}(#{1,6})[\t ]+(.+?)[\t ]*$/.exec(line);
    if (!heading) continue;
    const link = /^\[([^\n]+)\]\(([^\n]+)\)(?:[\t ]+#+)?$/.exec(heading[2]!);
    if (heading[1] !== "#" && !/archive\//i.test(heading[2]!)) continue;
    boundaries.push({ id: link ? /^archive\/(\d+)\.md$/.exec(link[2]!)?.[1] : undefined,
      heading: link?.[1] ?? heading[2]! });
  }
  if (!boundaries.length || boundaries.length !== items.length || boundaries.some((b, i) =>
    b.id !== items[i]?.id || b.heading !== items[i]?.heading)) {
    throw new InventoryError(boundaries.length ? "article_inventory_incomplete" : "article_inventory_empty");
  }
}

/** Structural refusal guard for the canonical Atom discovery's supported layout.
 * This discovers no article data. CDATA/comments cannot create entry boundaries.
 * Unknown, unbalanced, nested or noncanonical entry tags must not disappear from
 * an otherwise parseable inventory. Canonical parser acceptance stays unchanged.
 */
function checkWuwaInventory(raw: string, count: number) {
  const markup = raw.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const stack: string[] = [];
  let entries = 0, feeds = 0;
  const fail = () => { throw new InventoryError("article_inventory_incomplete"); };
  for (const token of markup.matchAll(/<[^>]*>|[^<]+|</g)) {
    const tag = token[0];
    if (/^<\?xml\s[^?]*\?>$/.test(tag)) continue;
    if (!tag.startsWith("<")) { if (!stack.length && tag.trim()) fail(); continue; }
    const parsed = /^<(\/?)([\w:.-]+)(?:\s[^<>]*?)?(\/?)>$/.exec(tag);
    if (!parsed) { fail(); continue; }
    const [, closing, name, selfClosing] = parsed;
    if (closing) { if (stack.pop() !== name) fail(); continue; }
    if (!stack.length) { if (name !== "feed" || ++feeds !== 1) fail(); }
    if (stack.length === 1 && !["entry", "title", "link", "id", "updated", "subtitle", "icon", "logo",
      "rights", "generator", "author", "category", "contributor"].includes(name!)) fail();
    if (name!.split(":").at(-1) === "entry") {
      if (tag !== "<entry>" || stack.length !== 1 || stack[0] !== "feed") fail();
      entries++;
    }
    if (!selfClosing) stack.push(name!);
  }
  if (stack.length || feeds !== 1 || entries !== count) fail();
  // Duplicate/missing identity fields within a single entry are ambiguous too.
  for (const entry of markup.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    for (const field of ["id", "title", "link", "content"]) {
      if ([...entry[1]!.matchAll(new RegExp(`<${field}\\b`, "g"))].length !== 1) fail();
    }
  }
}

/** All expected sources stay visible even when no document/evidence survived. */
export function articleSourceReport(sidecar: { notices: ArticleNotice[]; articleAttributions: ArticleAttribution[]; diagnostics: Diagnostic[] }) {
  return Object.keys(ARTICLE_SOURCE_GAMES).sort().map(sourceId => {
    const notices = sidecar.notices.filter(n => n.sourceId === sourceId);
    const rows = sidecar.articleAttributions.filter(a => a.event.sourceId === sourceId);
    const diagnostics = sidecar.diagnostics.filter(d => d.sourceId === sourceId);
    return { sourceId, available: notices.length > 0 && !diagnostics.some(d =>
      ["source_unavailable", "article_extraction_failed", "article_assembly_failed"].includes(d.code)),
      diagnosticCodes: [...new Set(diagnostics.map(d => d.code))].sort(),
      noticeCount: notices.length, emittedEvents: rows.length,
      attributedEvents: rows.filter(a => a.noticeId !== null).length,
      confirmedFinalAssociations: rows.filter(a => a.finalEventId !== null).length,
      notices: notices.map(n => ({ noticeId: n.noticeId, position: n.position, sourceUrl: n.sourceUrl, contentHash: n.contentHash,
        eventIds: rows.filter(a => a.noticePosition === n.position).map(a => a.event.id) })) };
  });
}

/** Events are the actual adapter outputs, not inferred from notice text.
 * Empty outputs still enumerate the entire snapshot, including non-event posts.
 * Historical callers can provide historical emitted events (including zero).
 */
export function extractArticleEvidence(raw: string, ctx: ParseContext, capture: Capture, events: GachaEvent[]): Extraction {
  if (!isArticleSource(ctx.sourceId) || ARTICLE_SOURCE_GAMES[ctx.sourceId] !== ctx.game) throw new Error("Unsupported article source context");
  capture = Capture.parse(capture);
  let items: Array<{ noticeId: string; sourceUrl: string; title: string; content: string; format: ArticleNotice["format"] }>;
  if (ctx.sourceId === "wuwa-kuro-mirror") {
    // Discovery may ignore unsupported tags for canonical compatibility;
    // the structural guard refuses those omissions in the optional inventory.
    let articles: ReturnType<typeof discoverWuwaArticles>;
    try { articles = discoverWuwaArticles(raw); }
    catch { throw new InventoryError("article_inventory_incomplete"); }
    checkWuwaInventory(raw, articles.length);
    items = articles.map(a => ({ noticeId: a.id, sourceUrl: a.sourceUrl,
      title: a.title, content: a.content, format: "html" }));
  } else if (ctx.sourceId === "genshin-kqm-ginews" || ctx.sourceId === "hsr-kqm-hsrnews") {
    const gin = ctx.sourceId === "genshin-kqm-ginews";
    const articles = gin ? discoverKqmGinArticles(raw) : discoverKqmHsrArticles(raw);
    checkKqmInventory(raw, articles);
    items = articles.map(a => ({
      noticeId: a.id, sourceUrl: `https://github.com/KQM-git/${gin ? "GINews" : "HSRNews"}/blob/master/archive/${a.id}.md`,
      title: a.heading, content: a.body, format: "markdown",
    }));
  } else if (ctx.sourceId === "zzz-steam-events-official") {
    items = discoverZzzSteamPosts(raw).map(p => ({ noticeId: p.url.split("/").at(-1)!,
      sourceUrl: p.url, title: p.title, content: p.html, format: "html" }));
  } else {
    items = discoverNteSteamPosts(raw).map(p => ({ noticeId: p.gid,
      sourceUrl: p.url, title: p.title, content: p.contents, format: "bbcode" }));
  }
  if (!items.length) throw new InventoryError("article_inventory_empty");
  const notices = items.map((item, position) => ArticleNotice.parse({ ...item, position,
    sourceId: ctx.sourceId, game: ctx.game, ...capture, contentHash: noticeContentHash(item.title, item.content) }));
  const result: Extraction = { candidates: [], diagnostics: [], notices, articleAttributions: [] };
  const diagnose = (code: string, sourceUrl: string, noticeId: string | null, sourceEventId: string | null = null) =>
    result.diagnostics.push({ code, sourceId: ctx.sourceId, sourceUrl, noticeId, sourceEventId,
      detail: "Article identity or event attribution requires review; no association guessed" });
  for (const notice of notices) {
    if (notices.filter(n => n.noticeId === notice.noticeId).length > 1)
      diagnose("duplicate_notice_identity", notice.sourceUrl, notice.noticeId);
  }
  for (const event of events) {
    const matches = notices.filter(n => n.sourceUrl === event.sourceUrl);
    const notice = matches.length === 1 ? matches[0]! : null;
    let code: string | null = null;
    if (event.sourceId !== ctx.sourceId || event.game !== ctx.game) code = "candidate_reference_conflict";
    else if (!notice) code = matches.length ? "ambiguous_notice_attribution" : "unmatched_notice_attribution";
    else if (notices.filter(n => n.noticeId === notice.noticeId).length !== 1) code = "ambiguous_notice_attribution";
    if (code) diagnose(code, event.sourceUrl, null, event.id);
    result.articleAttributions!.push({ event, noticeId: code ? null : notice!.noticeId,
      noticePosition: code ? null : notice!.position, finalEventId: null });
  }
  return result;
}

/** Optional sidecar failure never changes the successfully validated public feed. */
export function safelyExtractArticleEvidence(raw: string, ctx: ParseContext, capture: Capture, events: GachaEvent[]): Extraction {
  try { return extractArticleEvidence(raw, ctx, capture, events); }
  catch (error) {
    const failure = { sourceId: ctx.sourceId, sourceEventId: null, sourceUrl: ctx.sourceUrl,
      detail: "Optional article extraction failed; inventory and associations are unavailable" };
    return { candidates: [], notices: [], articleAttributions: events.map(event => ({ event,
      noticeId: null, noticePosition: null, finalEventId: null })), diagnostics: [
      { ...failure, code: "article_extraction_failed" },
      ...(error instanceof InventoryError ? [{ ...failure, code: error.code }] : []),
    ] };
  }
}
