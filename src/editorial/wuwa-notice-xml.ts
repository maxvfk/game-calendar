/** Optional verification only. Canonical discovery/event parsing never uses this.
 * XML events select real Atom entry children; regex-selected data must agree.
 * No DTDs, entity resolution, network access or replacement notice data.
 */
import { SaxesParser, type SaxesTagNS } from "saxes";

const ATOM = "http://www.w3.org/2005/Atom";
const FIELDS = ["id", "title", "link", "content"] as const;
type Field = typeof FIELDS[number];
type NoticeFields = { id: string; title: string; sourceUrl: string; content: string };
type Frame = {
  tag: SaxesTagNS; bodyStart: number; text: string; cdata: number;
  field?: Field; fields: Partial<Record<Field, Frame>>;
};
function fail(): never { throw new Error("WuWa Atom field verification failed"); }

export function verifyWuwaNoticeFields(raw: string, articles: readonly NoticeFields[]): void {
  const parser = new SaxesParser({ xmlns: true });
  const stack: Frame[] = [];
  let rootSeen = false, verified = 0;
  let entry: Frame | undefined;
  parser.on("error", fail);
  parser.on("doctype", fail);
  parser.on("processinginstruction", fail);
  parser.on("xmldecl", decl => { if (decl.version !== "1.0") fail(); });
  parser.on("opentag", tag => {
    const parent = stack.at(-1);
    const frame: Frame = { tag, bodyStart: parser.position, text: "", cdata: 0, fields: {} };
    if (!parent) {
      if (rootSeen || tag.name !== "feed" || tag.uri !== ATOM) fail();
      rootSeen = true;
    } else if (stack.length === 1 && (tag.uri !== ATOM || !["entry", "title", "link", "id", "updated", "subtitle", "icon", "logo",
      "rights", "generator", "author", "category", "contributor"].includes(tag.local))) fail();
    // Scalar fields contain no element children. CDATA is text, never markup.
    if (parent?.field) fail();
    if (tag.local === "entry") {
      if (stack.length !== 1 || tag.name !== "entry" || tag.uri !== ATOM) fail();
      entry = frame;
    } else if (entry && (FIELDS as readonly string[]).includes(tag.local)) {
      if (parent !== entry || tag.name !== tag.local || tag.uri !== ATOM) fail();
      const field = tag.local as Field;
      if (entry.fields[field]) fail();
      entry.fields[field] = frame;
      frame.field = field;
    }
    stack.push(frame);
  });
  parser.on("text", text => {
    const frame = stack.at(-1);
    if (frame?.field) frame.text += text;
  });
  parser.on("cdata", () => {
    const frame = stack.at(-1);
    if (frame?.field) {
      if (frame.field !== "content") fail();
      frame.cdata++;
    }
  });
  parser.on("comment", () => { if (stack.at(-1)?.field) fail(); });
  parser.on("closetag", () => {
    const frame = stack.pop()!;
    if (frame.field === "content") {
      // Saxes positions are original UTF-16 offsets, including CRLF/astral text.
      // Slice original source, since XML parsers normalize CDATA line endings.
      const end = raw.lastIndexOf("</", parser.position - 1);
      const body = frame.tag.isSelfClosing ? "" : raw.slice(frame.bodyStart, end);
      if (frame.cdata !== 1 || frame.text !== "" || !body.startsWith("<![CDATA[") || !body.endsWith("]]>")) fail();
      frame.text = body.slice(9, -3);
    }
    if (frame === entry) {
      const { id, title, link, content } = frame.fields;
      if (!id || !title || !link || !content) fail();
      const articleId = /^urn:article:(\d+)$/.exec(id.text)?.[1];
      if (!articleId || link.text !== "" || content.tag.attributes.type?.value !== "html") fail();
      const actual: NoticeFields = { id: articleId, title: title.text,
        sourceUrl: link.tag.attributes.href?.value ?? "", content: content.text };
      const candidate = articles[verified];
      if (!candidate || (["id", "title", "sourceUrl", "content"] as const).some(field => actual[field] !== candidate[field])) fail();
      verified++;
      entry = undefined;
    }
  });
  parser.write(raw).close();
  if (!rootSeen || stack.length || verified !== articles.length) fail();
}
