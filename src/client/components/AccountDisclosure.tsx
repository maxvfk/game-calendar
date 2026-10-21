import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { SyncStatus } from "../account/syncEngine.ts";

/** A successful session alone is not evidence that its data synced. */
export function accountCue(kind: "guest" | "deferred" | "account", status: SyncStatus | null,
  offline = false, error = false): { tone: string; label: string; cue: string } {
  if (error || status?.clockWarning) return { tone: "warning", label: error ? "Account needs attention" : "Check device clock", cue: "!" };
  if (kind === "guest") return { tone: "guest", label: "Guest — saved on this device; sign in", cue: "+" };
  if (kind === "deferred") return { tone: "waiting", label: "Choose account data — local data remains on this device", cue: "…" };
  if (status && ["auth", "schema", "error"].includes(status.kind)) return {
    tone: "warning", label: status.kind === "auth" ? "Sign in again to sync" : status.kind === "schema" ? "Sync data incompatible — export a backup" : "Sync failed — will retry", cue: "!" };
  if (offline || status?.kind === "offline" || status?.kind === "network") return {
    tone: "waiting", label: `Cloud unavailable — saved on this device${status?.pending ? `; ${status.pending} pending` : ""}`, cue: "…" };
  if (status?.kind === "syncing") return { tone: "busy", label: "Syncing", cue: "↻" };
  if (status?.pending || status?.kind === "pending") return { tone: "waiting", label: `${status.pending} changes pending`, cue: "…" };
  if (status?.kind === "synced") return { tone: "synced", label: "Account synced", cue: "✓" };
  return { tone: "busy", label: "Sync starting", cue: "↻" };
}

export function AccountDisclosure({ cue, children }: {
  cue: ReturnType<typeof accountCue>; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    const focusOutside = (event: FocusEvent) => {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("focusin", focusOutside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("focusin", focusOutside);
    };
  }, [open]);
  return <div className="mobile-account" ref={host}>
    <button type="button" ref={trigger} className="header-icon account-trigger"
      aria-label={`Account: ${cue.label}`} aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(!open)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </svg>
      <span aria-hidden="true" className="account-cue" data-tone={cue.tone}>{cue.cue}</span>
    </button>
    {open && <section id={id} aria-label="Account details" className="account-popover">
      <div className="flex items-center justify-between gap-2">
        <h2 className="eyebrow">Account</h2>
        <button type="button" className="header-icon" aria-label="Close account details"
          onClick={() => { setOpen(false); trigger.current?.focus(); }}>×</button>
      </div>
      {children}
    </section>}
  </div>;
}
