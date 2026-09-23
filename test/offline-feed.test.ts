import { expect, test } from "bun:test";
import { fetchFeed } from "../src/client/api.ts";

const url = "https://example.test/app/data/events.v1.json";
const saved = JSON.stringify({
  schemaVersion: 1,
  generatedAt: "2026-09-23T10:00:00.000Z",
  events: [],
  sources: [],
});

async function withPageStubs(
  cached: Response | undefined,
  run: () => Promise<void>,
  fetchImpl: () => Promise<Response> = () => new Promise<Response>(() => {}),
) {
  const keys = ["document", "fetch", "caches"] as const;
  const old = keys.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, "document", {
    configurable: true, value: { baseURI: "https://example.test/app/" },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true, value: fetchImpl,
  });
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: { match: async (requested: string) => {
      expect(requested).toBe(url);
      return cached;
    } },
  });
  try {
    await run();
  } finally {
    keys.forEach((key, i) => {
      const descriptor = old[i];
      if (descriptor === undefined) Reflect.deleteProperty(globalThis, key);
      else Object.defineProperty(globalThis, key, descriptor);
    });
  }
}

test("a pending offline fetch reads the service worker's precached feed", async () => {
  await withPageStubs(new Response(saved), async () => {
    const feed = await fetchFeed(undefined, 0);
    expect(feed.generatedAt).toBe("2026-09-23T10:00:00.000Z");
    expect(feed.events).toEqual([]);
  });
});

test("a pending fetch with no saved feed ends in an error rather than endless loading", async () => {
  await withPageStubs(undefined, async () => {
    await expect(fetchFeed(undefined, 0)).rejects.toThrow("Feed request timed out.");
  });
});

test("a response whose body stalls also falls back to the last saved feed", async () => {
  const stalledBody = new Response(new ReadableStream<Uint8Array>({ start() {} }));
  await withPageStubs(new Response(saved), async () => {
    const feed = await fetchFeed(undefined, 0);
    expect(feed.events).toEqual([]);
  }, async () => stalledBody);
});
