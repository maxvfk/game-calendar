import type { Adapter } from "./adapters/types.ts";

export const GINews_URL = "https://api.github.com/repos/KQM-git/GINews/contents/readme.md";
export const HSRNews_URL = "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md";

/** Public, documented Contents API; this is not an exemption for arbitrary GitHub URLs. */
export function usesDocumentedGinNewsApi(adapter: Adapter): boolean {
  return adapter.id === "genshin-kqm-ginews" && adapter.game === "genshin" &&
    adapter.parserId === "kqm-ginews" && adapter.contentKind === "markdown" &&
    adapter.url === GINews_URL;
}

export function usesDocumentedHsrNewsApi(adapter: Adapter): boolean {
  return adapter.id === "hsr-kqm-hsrnews" && adapter.game === "hsr" &&
    adapter.parserId === "kqm-hsrnews" && adapter.contentKind === "markdown" &&
    adapter.url === HSRNews_URL;
}

export function usesDocumentedGithubContentsApi(adapter: Adapter): boolean {
  return usesDocumentedGinNewsApi(adapter) || usesDocumentedHsrNewsApi(adapter);
}
