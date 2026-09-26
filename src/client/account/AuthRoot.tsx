import { useEffect, useRef, useState } from "react";
import { bootstrapLocalProfile, profileKeys } from "../state/storage.ts";
import { App } from "../App.tsx";
import {
  hasCloudData, hasGuestData, materializeCloud, personalCounts, pullCloud,
  readPersonalState, supabase, type PersonalState,
} from "./remote.ts";
import type { SyncState } from "../../shared/sync.ts";
import {
  completeFirstLogin, guestMigrationDurable, pendingPlan, readAccountBinding,
  type SettingsChoice,
} from "./firstLogin.ts";
import { startAuthBootstrap } from "./bootstrap.ts";

type Guest = ReturnType<typeof bootstrapLocalProfile>;
type Choice = { ownerId: string; email: string; profileId: string; guest: Guest;
  local: PersonalState; cloud: SyncState; resumable: boolean };
type ViewState =
  | { kind: "loading"; guest: Guest }
  | { kind: "guest"; guest: Guest; message?: string }
  | { kind: "deferred"; guest: Guest; email: string; message?: string }
  | { kind: "choice"; choice: Choice }
  | { kind: "account"; profileId: string; email: string; guest: Guest };

const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Account unavailable; calendar remains local")), ms);
    void promise.then((value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}

/** A Pages callback is the real app base URL, not a route Pages would 404. */
export function callbackUrl(baseUri: string): string {
  return new URL(".", baseUri).href;
}

async function handleCallback(): Promise<string | null> {
  const url = new URL(location.href);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (code === null && oauthError === null) return null;
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  // Remove the one-use code from history even when exchange fails.
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  if (oauthError !== null) return oauthError;
  const { error } = await supabase.auth.exchangeCodeForSession(code!);
  if (error) return error.message;
  return null;
}

// StrictMode may mount effects twice. Exchange the one-use OAuth code once.
let callbackPromise: Promise<string | null> | undefined;
function processCallback(): Promise<string | null> {
  return callbackPromise ??= handleCallback();
}

async function resolveAccount(guest: Guest, canActivate: () => boolean): Promise<ViewState> {
  const { data: current, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (current.session === null) return { kind: "guest", guest };
  // getSession reads cached tokens; getUser verifies them with Auth before any
  // account cache can be shown or selected. This includes stale sessions.
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || identity.user === null) throw authError ?? new Error("Session expired");
  const ownerId = identity.user.id;
  const email = identity.user.email ?? "Google account";
  const { data: profileId, error: profileError } = await supabase.rpc("ensure_default_profile");
  if (profileError || typeof profileId !== "string") {
    throw profileError ?? new Error("Default profile unavailable");
  }
  profileKeys(profileId);
  const { data: profile, error: ownershipError } = await supabase.from("profiles")
    .select("owner_id").eq("id", profileId).single();
  if (ownershipError || profile?.owner_id !== ownerId) {
    throw ownershipError ?? new Error("Profile does not belong to this session");
  }
  if (!canActivate()) throw new Error("Account session changed during setup");
  if (readAccountBinding(localStorage, profileId, ownerId)) {
    localStorage.setItem("gacha-tracker:v2:activeProfile", profileId);
    return { kind: "account", profileId, email, guest };
  }
  if (!guestMigrationDurable(localStorage, guest.profileId)) {
    throw new Error("Local migration is incomplete; keep using the guest and export a backup before account setup");
  }
  const local = readPersonalState(guest.keys, localStorage);
  const cloud = await pullCloud(profileId);
  if (!canActivate()) throw new Error("Account session changed during setup");
  const resumable = pendingPlan(localStorage, profileId, ownerId, guest.profileId) !== null;
  if (!resumable && !hasGuestData(local)) {
    await completeFirstLogin(localStorage, profileId, ownerId, guest.profileId,
      local, cloud, "cloudOnly", "cloud", canActivate);
    return { kind: "account", profileId, email, guest };
  }
  return { kind: "choice", choice: { ownerId, email, profileId, guest,
    local, cloud, resumable } };
}

function SetupPrompt({ choice, onComplete, onCancel }: {
  choice: Choice;
  onComplete: (mode: "cloudOnly" | "merge", settings?: SettingsChoice) => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"choose" | "settings">("choose");
  const [settings, setSettings] = useState<SettingsChoice>("cloud");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumable, setResumable] = useState(choice.resumable);
  const counts = personalCounts(choice.local);
  const cloudExists = hasCloudData(choice.cloud);
  const settingsDiffer = Object.keys(choice.cloud.preference).length > 0 &&
    JSON.stringify(choice.local.prefs) !== JSON.stringify(materializeCloud(choice.cloud).prefs);

  async function submit(mode: "cloudOnly" | "merge", preference: SettingsChoice = "cloud") {
    setBusy(true);
    setError(null);
    try { await onComplete(mode, preference); }
    catch (cause) {
      setError(errorText(cause));
      try {
        setResumable(pendingPlan(localStorage, choice.profileId, choice.ownerId,
          choice.guest.profileId) !== null);
      } catch { /* The original error remains visible. */ }
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-xl px-5 py-10 text-near">
    <h1 className="font-display text-xl font-bold">Account setup</h1>
    <p className="mt-2 text-sm text-faint">Signed in as {choice.email}.</p>
    <section role="dialog" aria-label="Local data migration" className="mt-6 rounded-xl border border-hairline p-5">
      {resumable ? <>
        <h2 className="font-semibold">Finish importing local data</h2>
        <p className="mt-2 text-sm">An earlier import was interrupted. Retry sends the same mutation IDs; it will not start a second import.</p>
        <button disabled={busy} className="mt-4 rounded-md border border-hairline px-3 py-2" onClick={() => void submit("merge")}>Retry import</button>
      </> : step === "settings" ? <>
        <h2 className="font-semibold">Choose account settings</h2>
        <p className="mt-2 text-sm">The account and this device have different settings.</p>
        <label className="mt-4 block text-sm"><input type="radio" checked={settings === "cloud"} onChange={() => setSettings("cloud")} /> Keep account settings</label>
        <label className="mt-2 block text-sm"><input type="radio" checked={settings === "local"} onChange={() => setSettings("local")} /> Use this device's settings</label>
        <button disabled={busy} className="mt-4 rounded-md border border-hairline px-3 py-2" onClick={() => void submit("merge", settings)}>Merge data</button>
        <button disabled={busy} className="ml-3 text-sm underline" onClick={() => setStep("choose")}>Back</button>
      </> : <>
        <h2 className="font-semibold">Local data found</h2>
        <p className="mt-2 text-sm">{counts.progress} progress records · {counts.daily} daily marks · {counts.ignored} ignored · {counts.customEvents} custom events</p>
        <p className="mt-3 text-sm">{cloudExists
          ? "This account also has cloud data. Choose how to proceed."
          : "Nothing is uploaded until you choose to import it."}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={busy} className="rounded-md border border-hairline px-3 py-2 text-sm" onClick={() => {
            if (cloudExists && settingsDiffer) setStep("settings");
            else void submit("merge");
          }}>{cloudExists ? "Merge local and account data" : "Save local data to my account"}</button>
          {cloudExists && <button disabled={busy} className="rounded-md border border-hairline px-3 py-2 text-sm" onClick={() => void submit("cloudOnly")}>Use account data only</button>}
          <button disabled={busy} className="px-3 py-2 text-sm underline" onClick={onCancel}>{cloudExists ? "Cancel" : "Not now"}</button>
        </div>
      </>}
      {busy && <p role="status" className="mt-3 text-sm">Loading account data…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-soon">{error}</p>}
    </section>
  </main>;
}

export function AuthRoot({ guest }: { guest: Guest }) {
  const [view, setView] = useState<ViewState>({ kind: "loading", guest });
  const [actionError, setActionError] = useState<string | null>(null);
  const authEpoch = useRef(0);
  useEffect(() => {
    const bootstrap = startAuthBootstrap<ViewState>({
      prepare: () => withTimeout(processCallback(), 10_000),
      resolve: (canActivate) => withTimeout(resolveAccount(guest, canActivate), 10_000),
      loading: () => setView({ kind: "loading", guest }),
      publish: setView,
      fallback: (error) => setView({ kind: "guest", guest: bootstrapLocalProfile(),
        ...(error === undefined ? {} : { message: errorText(error) }) }),
      sessionChanged: () => { authEpoch.current++; },
      callbackError: setActionError,
    });
    // Cross-tab sign-out/account switch must hide the old profile immediately.
    const { data: listener } = supabase.auth.onAuthStateChange(bootstrap.onAuth);
    return () => { bootstrap.stop(); listener.subscription.unsubscribe(); };
  }, [guest]);

  async function signIn() {
    setActionError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google",
      options: { redirectTo: callbackUrl(document.baseURI) } });
    if (error) setActionError(error.message);
  }
  async function signOut() {
    setActionError(null);
    authEpoch.current++;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) { setActionError(error.message); return; }
    setView({ kind: "guest", guest: bootstrapLocalProfile() });
  }
  async function finish(mode: "cloudOnly" | "merge", settings?: SettingsChoice) {
    if (view.kind !== "choice") return;
    const { choice } = view;
    const epoch = authEpoch.current;
    await completeFirstLogin(localStorage, choice.profileId, choice.ownerId,
      choice.guest.profileId, choice.local, choice.cloud, mode, settings,
      () => authEpoch.current === epoch);
    const { data, error } = await supabase.auth.getUser();
    if (authEpoch.current !== epoch || error || data.user?.id !== choice.ownerId) {
      setView({ kind: "guest", guest: bootstrapLocalProfile(),
        message: "Account session changed; sign in again" });
      return;
    }
    setView({ kind: "account", profileId: choice.profileId,
      email: choice.email, guest: choice.guest });
  }

  if (view.kind === "loading") return <main role="status" className="mx-auto max-w-xl p-6">Opening calendar…</main>;
  if (view.kind === "choice") return <SetupPrompt choice={view.choice} onComplete={finish}
    onCancel={() => setView({ kind: "deferred", guest: view.choice.guest,
      email: view.choice.email })} />;
  const account = view.kind === "account";
  const active = account ? profileKeys(view.profileId) : view.guest.keys;
  return <>
    <nav aria-label="Account" className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-2 text-xs text-faint">
      {account ? <>
        <span>{view.email} · Changes stay on this device until sync is released</span>
        <button className="underline" onClick={() => void signOut()}>Sign out</button>
      </> : view.kind === "deferred" ? <>
        <span>{view.email} · Local data remains on this device</span>
        <button className="underline" onClick={() => {
          setView({ kind: "loading", guest: view.guest });
          const epoch = authEpoch.current;
          void resolveAccount(view.guest, () => authEpoch.current === epoch).then((next) => {
            if (authEpoch.current === epoch) setView(next);
          }).catch((error) => {
            if (authEpoch.current === epoch) setView({ kind: "deferred", guest: view.guest,
              email: view.email, message: errorText(error) });
          });
        }}>Choose account data</button>
        <button className="underline" onClick={() => void signOut()}>Sign out</button>
      </> : <>
        <span>Saved on this device</span>
        <button className="underline" onClick={() => void signIn()}>Continue with Google</button>
      </>}
    </nav>
    {(actionError || ("message" in view && view.message)) &&
      <p role="alert" className="mx-auto max-w-7xl px-4 text-xs text-soon">{actionError ?? ("message" in view ? view.message : "")}</p>}
    <App key={account ? view.profileId : view.guest.profileId} storageKeys={active} />
  </>;
}
