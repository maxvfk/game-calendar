import { publicationStalled, type SourceHealth } from "../../shared/feed.ts";
import { formatRemaining } from "../../shared/time.ts";

/**
 * "Updates have stopped arriving."
 *
 * The footer already names a game whose sources are older than two days. This
 * is the louder, page-wide case: nothing at all has refreshed for
 * `PUBLICATION_STALE_AFTER_MS`, so every deadline on the page is at least that
 * old. A stalled publication otherwise looks exactly like a quiet week.
 *
 * Worded for what the page can know. A reader whose fetch fell back to the
 * cached feed sees the same notice, and "updates have stopped arriving" is true
 * for them too; blaming the publishing pipeline would not be. Not dismissible:
 * it is a statement about the data on screen and leaves when the data is fresh.
 */
export function StaleFeedNotice({
  sources,
  now,
}: {
  sources: readonly SourceHealth[];
  now: number;
}) {
  const stalled = publicationStalled(sources, now);
  if (stalled === null) return null;
  return (
    <p
      role="status"
      className="stale-feed-notice border-b border-hairline px-4 py-2.5 text-xs leading-relaxed text-soon"
    >
      Event data was last refreshed {formatRemaining(stalled.ageMs)} ago and
      updates have stopped arriving. New or changed deadlines may be missing.
    </p>
  );
}
