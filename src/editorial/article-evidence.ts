/** C0: complete article inventory + exact source-event attribution inside E1.
 * Full notice text is untrusted replay data, never eligible editorial excerpts.
 * No date detection, coverage status, fuzzy association or model calls here.
 */
import { createHash } from "node:crypto";
import type { ParseContext } from "../ingest/adapters/types.ts";
import { discoverKqmGinArticles } from "../ingest/parsers/kqm-ginews.ts";
import { discoverKqmHsrArticles } from "../ingest/parsers/kqm-hsrnews.ts";
import { discoverZzzSteamPosts } from "../ingest/parsers/zzz-steam-rss.ts";
import { discoverNteSteamPosts } from "../ingest/parsers/nte-steamnews.ts";
import type { GachaEvent } from "../shared/schema.ts";
import { ArticleNotice, Capture, type Extraction } from "./event-evidence.ts";

const games = {
  "genshin-kqm-ginews": "genshin", "hsr-kqm-hsrnews": "hsr",
  "zzz-steam-events-official": "zzz", "nte-steamnews-official": "nte",
} as const;
export function isArticleSource(sourceId: string): sourceId is keyof typeof games {
  return Object.hasOwn(games, sourceId);
}
export function noticeContentHash(title: string, content: string): string {
  return createHash("sha256").update(JSON.stringify([title, content])).digest("hex");
}

/** Events are the actual adapter outputs, not inferred from notice text.
 * Empty outputs still enumerate the entire snapshot, including non-event posts.
 * Historical callers can provide historical emitted events (including zero).
 */
export function extractArticleEvidence(raw: string, ctx: ParseContext, capture: Capture, events: GachaEvent[]): Extraction {
  if (!isArticleSource(ctx.sourceId) || games[ctx.sourceId] !== ctx.game) throw new Error("Unsupported article source context");
  capture = Capture.parse(capture);
  let items: Array<{ noticeId: string; sourceUrl: string; title: string; content: string; format: ArticleNotice["format"] }>;
  if (ctx.sourceId === "genshin-kqm-ginews" || ctx.sourceId === "hsr-kqm-hsrnews") {
    const gin = ctx.sourceId === "genshin-kqm-ginews";
    items = (gin ? discoverKqmGinArticles(raw) : discoverKqmHsrArticles(raw)).map(a => ({
      noticeId: a.id, sourceUrl: `https://github.com/KQM-git/${gin ? "GINews" : "HSRNews"}/blob/master/archive/${a.id}.md`,
      title: a.heading, content: a.body, format: "markdown",
    }));
    if (!items.length) throw new Error("Article boundaries unavailable");
  } else if (ctx.sourceId === "zzz-steam-events-official") {
    items = discoverZzzSteamPosts(raw).map(p => ({ noticeId: p.url.split("/").at(-1)!,
      sourceUrl: p.url, title: p.title, content: p.html, format: "html" }));
  } else {
    items = discoverNteSteamPosts(raw).map(p => ({ noticeId: p.gid,
      sourceUrl: p.url, title: p.title, content: p.contents, format: "bbcode" }));
  }
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
  catch {
    return { candidates: [], notices: [], articleAttributions: events.map(event => ({ event,
      noticeId: null, noticePosition: null, finalEventId: null })), diagnostics: [{
      code: "article_extraction_failed", sourceId: ctx.sourceId, sourceEventId: null, sourceUrl: ctx.sourceUrl,
      detail: "Optional article extraction failed; inventory and associations are unavailable",
    }] };
  }
}
