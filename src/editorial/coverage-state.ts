/** Git-reviewed C1 state. Neither file can change event data or attribution. */
import { z } from "zod";
import { ARTICLE_SOURCE_GAMES } from "./article-evidence.ts";
export const CoverageSource = z.enum(Object.keys(ARTICLE_SOURCE_GAMES) as [keyof typeof ARTICLE_SOURCE_GAMES, ...Array<keyof typeof ARTICLE_SOURCE_GAMES>]);
export const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const identity = {
  sourceId: CoverageSource, noticeId: z.string().min(1).max(300),
  sourceUrl: z.string().url().max(2048), contentHash: Hash,
};
export const IgnoreDecision = z.object({
  ...identity,
  // Decisions bind to the reviewed content revision and precise occurrence.
  // A changed body, URL or duplicate occurrence requires another review.
  position: z.number().int().nonnegative(),
  span: z.object({ field: z.enum(["title", "content"]), ref: Hash }).strict().optional(),
  category: z.enum(["maintenance", "shop", "web-event-out-of-scope", "marketing", "other-out-of-scope"]),
  reason: z.string().trim().min(1).max(500),
}).strict();
export type IgnoreDecision = z.infer<typeof IgnoreDecision>;
export const decisionKey = (d: IgnoreDecision) => JSON.stringify([d.sourceId, d.noticeId, d.position, d.sourceUrl, d.contentHash, d.span?.field ?? null, d.span?.ref ?? null]);
export const IgnoreRegistry = z.object({ schemaVersion: z.literal(1), decisions: z.array(IgnoreDecision).max(20_000) }).strict()
  .refine(r => new Set(r.decisions.map(decisionKey)).size === r.decisions.length, "duplicate ignore decision");
export const BaselineEntry = z.object({ ...identity, position: z.number().int().nonnegative(), format: z.enum(["markdown", "html", "bbcode"]) }).strict();
export type BaselineEntry = z.infer<typeof BaselineEntry>;
export const baselineKey = (n: BaselineEntry) => JSON.stringify([n.sourceId, n.noticeId, n.position, n.sourceUrl, n.contentHash, n.format]);
export const Baseline = z.object({
  schemaVersion: z.literal(1), purpose: z.literal("initial-notification-suppression-only"), entries: z.array(BaselineEntry).max(20_000),
}).strict().refine(r => new Set(r.entries.map(baselineKey)).size === r.entries.length, "duplicate baseline entry");
export const emptyIgnores = () => IgnoreRegistry.parse({ schemaVersion: 1, decisions: [] });
export const emptyBaseline = () => Baseline.parse({ schemaVersion: 1, purpose: "initial-notification-suppression-only", entries: [] });
