/** A resolver may complete after Auth has switched users. Its ticket also
 * guards localStorage activation, not just the rendered view. */
export function startAuthBootstrap<State>(options: {
  prepare: () => Promise<string | null>;
  resolve: (canActivate: () => boolean) => Promise<State>;
  loading: (retry: boolean) => void;
  publish: (state: State) => void;
  fallback: (error?: unknown) => void;
  sessionChanged: () => void;
  callbackError: (message: string) => void;
}) {
  let alive = true;
  let ready = false;
  let generation = 0;
  let sessionKey: string | null | undefined;
  let resolving = false;

  function start(retry = false) {
    const ticket = ++generation;
    options.loading(retry);
    if (!ready) return;
    resolving = true;
    queueMicrotask(() => {
      if (!alive || ticket !== generation) return;
      const canActivate = () => alive && ticket === generation;
      void options.resolve(canActivate).then((state) => {
        if (canActivate()) options.publish(state);
      }).catch((error: unknown) => {
        if (canActivate()) options.fallback(error);
      }).finally(() => {
        if (ticket === generation) resolving = false;
      });
    });
  }

  void options.prepare().then((error) => {
    if (!alive) return;
    ready = true;
    if (error) options.callbackError(error);
    start();
  }).catch((error: unknown) => {
    if (!alive) return;
    ready = true;
    ++generation;
    options.fallback(error);
  });

  return {
    retry() { if (alive && ready && !resolving) start(true); },
    onAuth(event: string, session: { user: { id: string }; access_token: string } | null) {
      if (!alive) return;
      const key = session === null ? null : `${session.user.id}:${session.access_token}`;
      if (event === "SIGNED_OUT") {
        sessionKey = null;
        ++generation;
        options.sessionChanged();
        options.fallback();
      } else if (key !== sessionKey) {
        // INITIAL_SESSION normally seeds the key, but a differing event while
        // resolution runs must also invalidate its ticket.
        sessionKey = key;
        if (event !== "INITIAL_SESSION" || generation > 0) {
          options.sessionChanged();
          start();
        }
      }
    },
    stop() { alive = false; ++generation; },
  };
}

/** A browser may still report online while fetches fail. An online event,
 * returning to the foreground, or a bounded periodic probe retries only a
 * bootstrap that is waiting on a transport outage. */
export function watchAuthReconnect(retry: () => void, shouldRetry: () => boolean,
  win: Pick<Window, "addEventListener" | "removeEventListener"> = window,
  doc: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState"> = document,
  isOnline: () => boolean = () => navigator.onLine !== false,
): () => void {
  const recover = () => { if (shouldRetry() && isOnline()) retry(); };
  const foreground = () => { if (doc.visibilityState === "visible") recover(); };
  win.addEventListener("online", recover);
  doc.addEventListener("visibilitychange", foreground);
  const interval = setInterval(recover, 15_000);
  return () => {
    win.removeEventListener("online", recover);
    doc.removeEventListener("visibilitychange", foreground);
    clearInterval(interval);
  };
}
