import type { Adapter } from "./adapters/types.ts";

export const GINews_URL = "https://api.github.com/repos/KQM-git/GINews/contents/readme.md";

/** Public, documented Contents API; this is not an exemption for arbitrary GitHub URLs. */
export function usesDocumentedGinNewsApi(adapter: Adapter): boolean {
  return adapter.id === "genshin-kqm-ginews" && adapter.game === "genshin" &&
    adapter.parserId === "kqm-ginews" && adapter.contentKind === "markdown" &&
    adapter.url === GINews_URL;
}
