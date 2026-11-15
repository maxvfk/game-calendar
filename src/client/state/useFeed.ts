import { useEffect, useRef, useState } from "react";
import { fetchFeed, type FeedState } from "../api.ts";
import type { EventFeed } from "../../shared/feed.ts";

/**
 * The published feed, kept current while the page stays open.
 *
 * Fetching only on mount let a long-lived tab show days-old data: a phone
 * browser restores a background tab from memory without reloading it, so on
 * 2026-11-15 a tab opened on Nov 10 still showed that copy, and the page-wide
 * stale notice blamed publication although the server had been refreshed that
 * morning. The feed is now asked for again when the page comes back into view,
 * is restored from the back/forward cache, or the connection returns, and on a
 * slow poll while it stays visible. Automatic asks are throttled; the server
 * publishes at most a few times a day.
 */

/** Minimum gap between automatic refetches (view, restore, poll). */
export const FEED_REFETCH_MIN_INTERVAL_MS = 10 * 60 * 1000;
/** How often a page that stays visible asks again. */
export const FEED_POLL_INTERVAL_MS = 30 * 60 * 1000;

/**
 * What a successful fetch does to what is on screen. A copy that is not newer
 * — for example the service worker's cached fallback when the network failed —
 * never replaces a feed already shown, and an equal one keeps the same object
 * so nothing re-renders.
 */
export function nextFeedState(current: FeedState, next: EventFeed): FeedState {
  if (current.status !== "ready") return { status: "ready", feed: next };
  if (Date.parse(next.generatedAt) <= Date.parse(current.feed.generatedAt)) return current;
  return { status: "ready", feed: next };
}

/**
 * A failed fetch only matters while nothing is shown yet. Once a feed is on
 * screen, a failed refresh keeps it; the stale notices judge its age.
 */
export function failedFeedState(current: FeedState, error: unknown): FeedState {
  if (current.status === "ready") return current;
  return { status: "error", message: error instanceof Error ? error.message : "Could not load events." };
}

export function useFeed(
  load: (signal: AbortSignal) => Promise<EventFeed> = fetchFeed,
  minIntervalMs = FEED_REFETCH_MIN_INTERVAL_MS,
  pollMs = FEED_POLL_INTERVAL_MS,
): FeedState {
  const [state, setState] = useState<FeedState>({ status: "loading" });
  const lastAttemptAt = useRef<number | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    let disposed = false;

    /** `force` skips the throttle: the first load, and the connection coming back. */
    const run = (force: boolean) => {
      if (inFlight.current !== null) return;
      const now = Date.now();
      if (!force && lastAttemptAt.current !== null && now - lastAttemptAt.current < minIntervalMs) return;
      lastAttemptAt.current = now;
      const ac = new AbortController();
      inFlight.current = ac;
      load(ac.signal)
        .then((feed) => {
          if (!disposed) setState((current) => nextFeedState(current, feed));
        })
        .catch((error: unknown) => {
          if (disposed || ac.signal.aborted) return;
          setState((current) => failedFeedState(current, error));
        })
        .finally(() => {
          if (inFlight.current === ac) inFlight.current = null;
        });
    };

    const visible = () => document.visibilityState === "visible";
    const onVisibility = () => { if (visible()) run(false); };
    const onPageShow = (event: Event) => { if ((event as PageTransitionEvent).persisted) run(false); };
    const onOnline = () => run(true);

    run(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onOnline);
    const poll = setInterval(() => { if (visible()) run(false); }, pollMs);

    return () => {
      disposed = true;
      inFlight.current?.abort();
      inFlight.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onOnline);
      clearInterval(poll);
    };
  }, [load, minIntervalMs, pollMs]);

  return state;
}
