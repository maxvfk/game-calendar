/** Transport outages are retryable; Auth, ownership, schema and RPC errors
 * must retain their distinct status even when navigator.onLine is false. */
export function isRetryableTransportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AuthRetryableFetchError" || error.name === "AbortError") return true;
  if (error.name === "TypeError" && /fetch|network|load/i.test(error.message)) return true;
  if (typeof (error as Error & { status?: unknown }).status === "number" &&
      (error as Error & { status: number }).status === 0) return true;
  return /^(?:TypeError: )?(?:Failed to fetch|fetch failed|Network unavailable|Sync timed out|Account unavailable; calendar remains local)$/i
    .test(error.message) || /(?:net::ERR_|network request failed|request timed out)/i.test(error.message);
}
