import type { Adapter } from "./adapters/types.ts";

export const NTE_STEAM_NEWS_URL = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4508340&count=50&maxlength=0&feeds=steam_community_announcements";

/**
 * API access, not web crawling. Valve explicitly documents this unauthenticated
 * method: https://partner.steamgames.com/doc/webapi/ISteamNews
 * Terms: https://steamcommunity.com/dev/apiterms (checked 2026-09-22).
 * Never a host-wide bypass: different methods, parameters and adapters still
 * use the ordinary robots gate. Rate limits/conditional requests still apply.
 */
export function usesDocumentedSteamApi(adapter: Adapter): boolean {
  return adapter.id === "nte-steamnews-official" && adapter.game === "nte" &&
    adapter.parserId === "nte-steamnews" && adapter.contentKind === "json" &&
    adapter.url === NTE_STEAM_NEWS_URL;
}
