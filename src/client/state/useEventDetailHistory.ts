import { useCallback, useEffect, useState } from "react";

const ENTRY = "__eventclockDetail";
type Entry = { version: 1; token: string; url: string; base: unknown };
function entry(state: unknown): Entry | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as Record<string, unknown>)[ENTRY] as Entry | undefined;
  return value?.version === 1 && typeof value.token === "string" && typeof value.url === "string" && "base" in value ? value : null;
}
type Owner = (id: string | null) => void;

/** One coordinator per document, including profile remounts and StrictMode.
 * The URL is never changed. A modal pushes once; switching events reuses it.
 * Dismissal consumes only our current entry. Forward entries are inert: the
 * History API cannot delete them, but the next open replaces that forward tail
 * rather than accumulating entries. No history state ever reopens a dialog.
 */
class DetailHistory {
  private owner: Owner | null = null;
  private token: string | null = null;
  private pending = false;
  private queued: { owner: Owner; id: string } | null = null;

  constructor(private win: Window) {
    // A reload can retain history.state but must never restore modal UI.
    const reloaded = this.currentEntry() !== null;
    this.clearStaleEntry();
    win.addEventListener("popstate", () => {
      this.token = null;
      this.owner?.(null);
      this.clearStaleEntry();
      this.pending = false;
      const queued = this.queued;
      this.queued = null;
      if (queued && queued.owner === this.owner) this.open(queued.owner, queued.id);
    });
    if (reloaded) {
      this.pending = true;
      win.history.back();
    }
  }

  private currentEntry() {
    const value = entry(this.win.history.state);
    return value?.url === this.win.location.href ? value : null;
  }

  private clearStaleEntry() {
    const stale = this.currentEntry();
    if (stale) this.win.history.replaceState(stale.base, "");
  }

  connect(owner: Owner) {
    this.owner = owner;
    return () => {
      if (this.owner !== owner) return;
      this.close(owner);
      this.owner = null;
    };
  }

  open(owner: Owner, id: string) {
    if (this.owner !== owner) return;
    if (this.pending) {
      this.queued = { owner, id };
      return;
    }
    if (!this.token || this.currentEntry()?.token !== this.token) {
      this.clearStaleEntry();
      const base: unknown = this.win.history.state;
      this.token = crypto.randomUUID();
      const state = base && typeof base === "object" ? base : {};
      this.win.history.pushState({ ...state, [ENTRY]: { version: 1, token: this.token, url: this.win.location.href, base } }, "");
    }
    owner(id);
  }

  close(owner: Owner) {
    if (this.owner !== owner) return;
    owner(null);
    this.queued = null;
    // Never traverse an entry added/replaced by another UI or OAuth cleanup.
    if (!this.pending && this.token && this.currentEntry()?.token === this.token) {
      this.pending = true;
      this.win.history.back();
    }
    this.token = null;
  }
}
const histories = new WeakMap<Window, DetailHistory>();
function historyFor(win: Window) {
  let history = histories.get(win);
  if (!history) { history = new DetailHistory(win); histories.set(win, history); }
  return history;
}

export function useEventDetailHistory() {
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => historyFor(window).connect(setOpenId), []);
  const openDetail = useCallback((id: string) => historyFor(window).open(setOpenId, id), []);
  const closeDetail = useCallback(() => historyFor(window).close(setOpenId), []);
  return { openId, openDetail, closeDetail };
}
