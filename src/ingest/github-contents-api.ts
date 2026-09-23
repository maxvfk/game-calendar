import type { Adapter } from "./adapters/types.ts";

export const GINews_URL = "https://api.github.com/repos/KQM-git/GINews/contents/readme.md";
export const HSRNews_URL = "https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md";
export const WUWA_XML_URL = "https://api.github.com/repos/TheLovinator1/wutheringwaves/contents/articles_latest.xml";

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

export function usesDocumentedWuwaXmlApi(adapter: Adapter): boolean {
  return adapter.id === "wuwa-kuro-mirror" && adapter.game === "wuwa" &&
    adapter.parserId === "wuwa-kuro-atom" && adapter.contentKind === "xml" &&
    adapter.url === WUWA_XML_URL;
}

export function usesDocumentedGithubContentsApi(adapter: Adapter): boolean {
  return usesDocumentedGinNewsApi(adapter) || usesDocumentedHsrNewsApi(adapter) ||
    usesDocumentedWuwaXmlApi(adapter);
}
