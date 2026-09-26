import { expect, test } from "bun:test";
import { startAuthBootstrap } from "../src/client/account/bootstrap.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const session = (id: string) => ({ user: { id }, access_token: `token-${id}` });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test("initial account resolver cannot activate A after Auth changes to B", async () => {
  const old = deferred<string>();
  const ready = deferred<string | null>();
  const published: string[] = [];
  const activated: string[] = [];
  let started = 0;
  const bootstrap = startAuthBootstrap({
    prepare: () => ready.promise,
    resolve: async (canActivate) => {
      const identity = ++started === 1 ? await old.promise : "B";
      if (canActivate()) activated.push(identity); // The cache-binding write.
      return identity;
    },
    loading: () => {}, publish: (value) => published.push(value),
    fallback: () => published.push("guest"), sessionChanged: () => {},
    callbackError: () => {},
  });
  bootstrap.onAuth("INITIAL_SESSION", session("A"));
  ready.resolve(null);
  await flush();
  expect(started).toBe(1);
  bootstrap.onAuth("SIGNED_IN", session("B"));
  await flush();
  old.resolve("A");
  await flush();
  expect(activated).toEqual(["B"]);
  expect(published).toEqual(["B"]);
  bootstrap.stop();
});

test("a sign-in during callback preparation and StrictMode cleanup resolve only the live identity", async () => {
  const ready = deferred<string | null>();
  const published: string[] = [];
  let runs = 0;
  const options = {
    prepare: () => ready.promise,
    resolve: async () => { runs++; return "B"; },
    loading: () => {}, publish: (value: string) => published.push(value),
    fallback: () => published.push("guest"), sessionChanged: () => {},
    callbackError: () => {},
  };
  const stale = startAuthBootstrap(options);
  stale.stop();
  const live = startAuthBootstrap(options);
  live.onAuth("INITIAL_SESSION", session("A"));
  live.onAuth("SIGNED_IN", session("B"));
  ready.resolve(null);
  await flush();
  expect(runs).toBe(1);
  expect(published).toEqual(["B"]);
  live.onAuth("SIGNED_OUT", null);
  expect(published).toEqual(["B", "guest"]);
  live.stop();
});
