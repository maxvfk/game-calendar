/** A resolver may complete after Auth has switched users. Its ticket also
 * guards localStorage activation, not just the rendered view. */
export function startAuthBootstrap<State>(options: {
  prepare: () => Promise<string | null>;
  resolve: (canActivate: () => boolean) => Promise<State>;
  loading: () => void;
  publish: (state: State) => void;
  fallback: (error?: unknown) => void;
  sessionChanged: () => void;
  callbackError: (message: string) => void;
}) {
  let alive = true;
  let ready = false;
  let generation = 0;
  let sessionKey: string | null | undefined;

  function start() {
    const ticket = ++generation;
    options.loading();
    if (!ready) return;
    queueMicrotask(() => {
      if (!alive || ticket !== generation) return;
      const canActivate = () => alive && ticket === generation;
      void options.resolve(canActivate).then((state) => {
        if (canActivate()) options.publish(state);
      }).catch((error: unknown) => {
        if (canActivate()) options.fallback(error);
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
