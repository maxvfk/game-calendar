import { eventId, GachaEvent } from "../../shared/schema.ts";
import type { ParseContext } from "../adapters/types.ts";
import type { SourceParser } from "./types.ts";

type JsonObject = Record<string, unknown>;
type BtREvent = { name: string; startDate: string; endDate?: string; description?: string };

const SCRIPT = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TITLE_PREFIX = "Beyond the Rails";

function object(value: unknown, label: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`NTEBuild BTR malformed ${label}`);
  }
  return value as JsonObject;
}

function graphLists(html: string): JsonObject[] {
  const scripts = [...html.matchAll(SCRIPT)];
  if (scripts.length === 0) throw new Error("NTEBuild BTR JSON-LD missing");
  const lists: JsonObject[] = [];
  for (const match of scripts) {
    let parsed: unknown;
    try { parsed = JSON.parse(match[1]!); } catch { throw new Error("NTEBuild BTR malformed JSON-LD"); }
    const root = object(parsed, "JSON-LD");
    if (root["@graph"] === undefined) continue;
    if (!Array.isArray(root["@graph"])) throw new Error("NTEBuild BTR malformed @graph");
    for (const nodeValue of root["@graph"]) {
      const node = object(nodeValue, "graph node");
      if (node["@type"] === "ItemList") lists.push(node);
    }
  }
  if (lists.length === 0) throw new Error("NTEBuild BTR ItemList missing");
  return lists;
}

function items(html: string): BtREvent[] {
  const lists = graphLists(html);
  const result: BtREvent[] = [];
  for (const list of lists) {
    if (!Array.isArray(list.itemListElement)) throw new Error("NTEBuild BTR malformed ItemList");
    for (const listItemValue of list.itemListElement) {
      const listItem = object(listItemValue, "ItemList item");
      const item = object(listItem.item, "ItemList event");
      if (item["@type"] !== "Event") continue;
      if (typeof item.name !== "string") throw new Error("NTEBuild BTR event name missing");
      if (!item.name.startsWith(TITLE_PREFIX)) continue;
      if (typeof item.startDate !== "string") throw new Error(`NTEBuild BTR startDate missing: ${item.name}`);
      if (item.endDate !== undefined && typeof item.endDate !== "string") {
        throw new Error(`NTEBuild BTR endDate malformed: ${item.name}`);
      }
      if (item.description !== undefined && typeof item.description !== "string") {
        throw new Error(`NTEBuild BTR description malformed: ${item.name}`);
      }
      const event: BtREvent = { name: item.name, startDate: item.startDate };
      if (item.endDate !== undefined) event.endDate = item.endDate;
      if (item.description !== undefined) event.description = item.description;
      result.push(event);
    }
  }
  if (result.length === 0) throw new Error("NTEBuild BTR event missing");
  return result;
}

function day(raw: string, field: string, title: string): string {
  const match = DAY.exec(raw);
  if (!match) throw new Error(`NTEBuild BTR invalid ${field}: ${title}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, date));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== date) {
    throw new Error(`NTEBuild BTR invalid ${field}: ${title}`);
  }
  return `${raw}T00:00:00.000Z`;
}

function parseBtr(html: string, ctx: ParseContext): GachaEvent[] {
  const seen = new Map<string, GachaEvent>();
  for (const source of items(html)) {
    const startsAt = day(source.startDate, "startDate", source.name);
    const endsAt = source.endDate === undefined ? null : day(source.endDate, "endDate", source.name);
    const event = GachaEvent.parse({
      id: eventId("nte", source.name, startsAt), game: "nte", title: source.name, type: "challenge",
      summary: source.description ?? null, startsAt, startPrecision: "day", endsAt,
      endPrecision: endsAt === null ? "unknown" : "day", regionScoped: false, regionEnds: null,
      sourceUrl: ctx.sourceUrl, sourceId: ctx.sourceId, status: "published", confidence: 0.7,
      extractionMethod: "parser", provenanceStatus: "estimated", version: 1,
      firstSeenAt: ctx.now, updatedAt: ctx.now,
    });
    const previous = seen.get(event.id);
    if (previous) {
      if (previous.startsAt !== event.startsAt || previous.endsAt !== event.endsAt) {
        throw new Error(`NTEBuild BTR conflicting duplicate: ${event.id}`);
      }
      continue;
    }
    seen.set(event.id, event);
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export const nteBuildBtrParser: SourceParser = {
  id: "ntebuild-btr",
  label: "NTEBuild Beyond the Rails",
  canParse(html) {
    try { return items(html).length > 0; } catch { return false; }
  },
  parse: parseBtr,
};
