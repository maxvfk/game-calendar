/** Offline measurements; no model/tokenizer/API calls. */
import { codePoints, EvidenceSidecar } from "../src/editorial/event-evidence.ts";

const sidecar = EvidenceSidecar.parse(await Bun.file(process.argv[2] ?? "tmp/editorial/event-evidence.v1.json").json());
const events = sidecar.entries.map(e => ({
  eventId: e.eventId,
  fragmentLengths: e.sources.flatMap(s => s.excerpts.map(x => codePoints(x.text))),
  codePoints: e.sources.flatMap(s => s.excerpts).reduce((n, x) => n + codePoints(x.text), 0),
}));
const lengths = events.flatMap(e => e.fragmentLengths).sort((a, b) => a - b);
const total = events.reduce((n, e) => n + e.codePoints, 0);
console.log(JSON.stringify({
  // Inventory/attribution only: these counts are NOT coverage statuses.
  articleSources: [...new Set(sidecar.notices.map(n => n.sourceId))].sort().map(sourceId => {
    const notices = sidecar.notices.filter(n => n.sourceId === sourceId);
    const rows = sidecar.articleAttributions.filter(a => a.event.sourceId === sourceId);
    return { sourceId, noticeCount: notices.length, emittedEvents: rows.length,
      attributedEvents: rows.filter(a => a.noticeId !== null).length,
      confirmedFinalAssociations: rows.filter(a => a.finalEventId !== null).length,
      notices: notices.map(n => ({ noticeId: n.noticeId, position: n.position, sourceUrl: n.sourceUrl, contentHash: n.contentHash,
        eventIds: rows.filter(a => a.noticePosition === n.position).map(a => a.event.id) })) };
  }),
  eventsWithEvidence: events.length, fragments: lengths.length, events,
  fragmentLengths: { min: lengths[0] ?? 0, median: lengths.length ? (lengths[Math.floor((lengths.length - 1) / 2)]! + lengths[Math.floor(lengths.length / 2)]!) / 2 : 0, max: lengths.at(-1) ?? 0 },
  totalCodePoints: total,
  approximateExcerptTokensAt4CharactersPerToken: Math.ceil(total / 4),
  approximateEligibleJsonTokensAt4CharactersPerToken: Math.ceil(JSON.stringify(sidecar.entries).length / 4),
  // Illustrative English-text heuristic, excludes canonical inputs/prompt/output; no billing claim.
  capDiagnostics: sidecar.diagnostics.filter(d => /limit$/.test(d.code)).length,
  diagnostics: sidecar.diagnostics.reduce<Record<string, number>>((a, d) => { a[d.code] = (a[d.code] ?? 0) + 1; return a; }, {}),
  unattached: sidecar.unattached.length,
}, null, 2));
