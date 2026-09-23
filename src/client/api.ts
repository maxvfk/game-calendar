import { EventFeed, SCHEMA_VERSION } from "../shared/feed.ts";

export type FeedState =
  | { status: "loading" }
  | { status: "ready"; feed: EventFeed }
  | { status: "error"; message: string };

const FEED_NETWORK_TIMEOUT_MS = 8_000;

function validatedFeed(json: unknown): EventFeed {
  const version = (json as { schemaVersion?: number }).schemaVersion;
  if (version !== SCHEMA_VERSION) {
    throw new Error(
      `This page expects feed v${SCHEMA_VERSION} but the server sent v${String(version)}. Reload to get the current app.`,
    );
  }

  const parsed = EventFeed.safeParse(json);
  if (!parsed.success) {
    throw new Error("The feed did not match the expected shape.");
  }
  return parsed.data;
}

/**
 * Fetch the published feed.
 *
 * A `schemaVersion` we do not recognise is refused rather than rendered — the
 * client would be guessing at unfamiliar fields, and a calendar that guesses is
 * worse than one that asks you to reload.
 */
export async function fetchFeed(signal?: AbortSignal, timeoutMs = FEED_NETWORK_TIMEOUT_MS): Promise<EventFeed> {
  // Resolved against <base>, so this is correct at a domain root, under a
  // GitHub Pages subpath, and on a deep link alike.
  const feedUrl = new URL("data/events.v1.json", document.baseURI);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", onAbort, { once: true });
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let json: unknown;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error("Feed request timed out."));
      }, timeoutMs);
    });
    const response = await Promise.race([
      fetch(feedUrl, { signal: controller.signal, cache: "reload" }),
      deadline,
    ]);
    if (!response.ok) throw new Error(`Feed request failed (${response.status}).`);
    // A mobile connection can deliver headers and then stall the body. The
    // same deadline covers both steps so the loading screen cannot hang there.
    json = await Promise.race([response.json(), deadline]);
  } catch (error) {
    if (signal?.aborted) throw error;
    // The first visit can finish installing the service worker after the
    // initial feed request. Its precache is still readable by this page even
    // when the worker has not taken control of the tab yet.
    const cached = typeof caches === "undefined"
      ? undefined
      : await caches.match(feedUrl.href).catch(() => undefined);
    if (cached === undefined) throw error;
    json = await cached.json();
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
  return validatedFeed(json);
}
