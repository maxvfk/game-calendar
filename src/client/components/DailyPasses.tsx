import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  addDays, dayDiff, DEFAULT_PASS_DAYS, isPassDay, MAX_PASS_DAY, MIN_PASS_DAY, passClockBasis, passDay, passKey,
  passView, reducePass, reducePasses, type PassOp, type PassState, type PassView,
} from "../../shared/dailyPasses.ts";
import { GAMES } from "../../shared/games.ts";
import { Region, type GameId } from "../../shared/schema.ts";
import { REGION_LABEL } from "../../shared/time.ts";
import { LOCAL_CHANGE, REMOTE_CHANGE } from "../account/localSync.ts";
import {
  assertPassWritable, createPassSet, extendPass, passErrorMessage, passPrefix, queuePassOps,
  readPasses, resolvePass, undoPass, type PassLocal, type PassStore,
} from "../account/passProtocol.ts";
import type { SyncStatus } from "../account/syncEngine.ts";

const controlStyle = "rounded-md border border-hairline px-2.5 py-1.5 text-sm disabled:opacity-50";
const control = `min-h-10 ${controlStyle}`;
const input = `${control} w-full min-w-0 bg-ground`;
const TAP_WINDOW = 1000;
const WELKIN_CAP = 180;
const extensionWarning = `Adding 30 days may exceed Welkin’s ${WELKIN_CAP}-day in-game limit.`;

function displayedDays(view: PassView): number {
  return view.status === "active" ? Math.max(0, view.remainingDays - 1) : 0;
}

function warnsOnExtension(game: GameId, view: PassView): boolean {
  return game === "genshin" && view.status === "active" && view.remainingDays + DEFAULT_PASS_DAYS > WELKIN_CAP;
}

function PassSummary({ view, game, region }: { view: PassView; game: GameId; region: Region }) {
  if (view.status === "none") return <span className="text-faint">Not configured</span>;
  const days = displayedDays(view);
  const expires = new Date(view.expiresAtMs).toISOString();
  const [date, time] = expires.split("T") as [string, string];
  const estimated = passClockBasis(game, region) === "regional-default";
  return <>
    <span>{view.status === "expired" ? "Expired" : "Active"} · {days} game-{days === 1 ? "day" : "days"} left</span>
    <span className="block text-faint">
      {estimated ? "Estimated expiry " : "Expiry "}
      <time dateTime={expires}>{date} {time.slice(0, 5)} UTC</time>
    </span>
  </>;
}

function readLocal(store: PassStore, profileId: string) {
  try { return { local: readPasses(store, profileId), error: null }; }
  catch (error) { return { local: null, error: passErrorMessage(error) }; }
}

function deliveryMessage(local: PassLocal | null, online: boolean, sync: SyncStatus | null, guest: boolean) {
  const pending = local?.pending.length ?? 0;
  if (local?.recovery.length || local?.held || sync?.passHoldKind === "persistent") return null;
  if (guest) return pending ? "Saved on this device." : null;
  if (!online || sync?.kind === "offline") return pending ?
    "Offline. Pass changes are saved on this device and pending sync." : "Offline. Passes shown from this device.";
  if (sync?.kind === "network" || sync?.passHoldKind === "transient") return pending ?
    "Pass sync unavailable. Changes are saved on this device and will retry." : "Pass sync unavailable. Will retry.";
  if (sync?.kind === "auth") return "Sign in again to sync passes.";
  if (sync?.kind === "schema" || sync?.kind === "error") return "Pass sync is blocked by an account sync error.";
  if (pending) return `Saved on this device · ${pending} pass ${pending === 1 ? "change" : "changes"} pending sync.`;
  return local?.ops.length ? "Pass operations acknowledged by the server." : null;
}

/** An action can still be in the journal after a set absorbs it, or a later
 * extension makes its removal immaterial. Only offer an Undo with an effect. */
function canUndo(ops: readonly PassOp[], state: PassState, op: PassOp): boolean {
  if (state.undone.includes(op.opId)) return false;
  if (op.kind === "extend" && !state.applied.includes(op.opId)) return false;
  if (op.kind === "set" && state.winningSet !== op.opId) return false;
  const prior = reducePass(ops.filter(candidate => candidate.opId !== op.opId), state.game, state.region);
  return prior.lastDay !== state.lastDay || prior.conflicts.join() !== state.conflicts.join();
}

type PassAction = { op: PassOp; label: string; fromSummary: boolean };

export function DailyPasses({ profileId, games, focus, region, now, online, sync, active, store = localStorage }: {
  profileId: string;
  games: readonly GameId[];
  focus: GameId | null;
  region: Region;
  now: number;
  online: boolean;
  sync: SyncStatus | null;
  active: () => boolean;
  store?: PassStore;
}) {
  const [snapshot, setSnapshot] = useState(() => readLocal(store, profileId));
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<{ game: GameId; region: Region } | null>(null);
  const [actions, setActions] = useState<PassAction[]>([]);
  const tapAt = useRef(new Map<string, number>());
  const [error, setError] = useState<{ message: string; fromSummary: boolean } | null>(null);
  const viewId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const refresh = () => setSnapshot(readLocal(store, profileId));
    const changed = (event: Event) => { if ((event as CustomEvent).detail === profileId) refresh(); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(passPrefix(profileId))) refresh();
    };
    refresh();
    window.addEventListener(LOCAL_CHANGE, changed);
    window.addEventListener(REMOTE_CHANGE, changed);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(LOCAL_CHANGE, changed);
      window.removeEventListener(REMOTE_CHANGE, changed);
      window.removeEventListener("storage", storage);
    };
  }, [profileId, store]);
  // A pass pull can retain a collision or new facts before a later RPC fails.
  useEffect(() => { setSnapshot(readLocal(store, profileId)); }, [profileId, store, sync]);

  const local = snapshot.local;
  const states = useMemo(() => reducePasses(local?.ops ?? []), [local]);
  const selectedGame = selection && games.includes(selection.game) ? selection.game : focus ?? games[0];
  const selectedRegion = selection?.region ?? region;
  const lane = selectedGame ? passKey(selectedGame, selectedRegion) : undefined;
  const state = selectedGame && lane ? states.get(lane) ?? reducePass([], selectedGame, selectedRegion) : null;
  const view = state ? passView(state, now) : null;
  const relevant = [...states.values()].filter(state => games.some(game => game === state.game));
  const hasConflicts = relevant.some(state => state.conflicts.length || state.concurrentSets.length || state.outOfRange.length);
  const summaryGames = focus ? [focus] : games.filter(game => {
    const pass = states.get(passKey(game, region));
    return pass && pass.lastDay !== null;
  });
  const persistent = snapshot.error ? "Pass storage cannot be read." :
    local?.recovery.length ? "Some pass data is unreadable. Export a backup for recovery." :
    local?.held ? "Pass operation IDs conflict. Export a backup for recovery." :
    sync?.passHoldKind === "persistent" ? sync.heldPasses : null;
  const writeDisabled = !!persistent || !local;
  const status = deliveryMessage(local, online, sync, profileId.startsWith("local:"));
  const managementWarning = selectedGame && view && warnsOnExtension(selectedGame, view);

  function change(game: GameId, region: Region,
    apply: (latest: PassLocal, state: PassState, at: number) => PassOp,
    { label, fromSummary = false }: { label?: string; fromSummary?: boolean } = {},
  ) {
    setError(null);
    try {
      if (!active()) throw new Error("The active profile changed. Reopen Daily passes to edit.");
      const latest = readPasses(store, profileId);
      assertPassWritable(latest);
      const fresh = reducePass(latest.ops, game, region);
      const op = apply(latest, fresh, Date.now());
      if (label) setActions(previous => [...previous, { op, label, fromSummary }]);
    } catch (cause) { setError({ message: passErrorMessage(cause), fromSummary }); }
    finally { setSnapshot(readLocal(store, profileId)); }
  }

  function extend(game: GameId, region: Region, fromSummary: boolean) {
    if (writeDisabled) return;
    const key = passKey(game, region);
    const at = performance.now();
    if (at - (tapAt.current.get(key) ?? -Infinity) < TAP_WINDOW) return;
    tapAt.current.set(key, at);
    change(game, region, (_, fresh, now) =>
      extendPass(store, profileId, fresh.game, fresh.region, DEFAULT_PASS_DAYS, now),
    { label: "adding 30 days", fromSummary });
  }

  function undoButtons(game: GameId, passRegion: Region, state: PassState, surface: "summary" | "management") {
    if (!local) return null;
    const inSummary = passRegion === region && summaryGames.includes(game);
    return actions.filter(({ op, fromSummary }) => op.game === game && op.region === passRegion &&
      (fromSummary && inSummary ? "summary" : "management") === surface && canUndo(local.ops, state, op))
      .reverse().map(({ op, label }) =>
      <button key={op.opId} type="button" disabled={writeDisabled} className="mt-2 block min-h-10 text-left text-xs underline"
        aria-label={`Undo ${label} for ${GAMES[game].name}, ${REGION_LABEL[passRegion]}, ${op.createdAt.slice(11, 19)} UTC`}
        onClick={() => change(game, passRegion, (latest, fresh, at) => {
          if (!canUndo(latest.ops, fresh, op)) throw new Error("This action no longer changes the pass.");
          return undoPass(store, profileId, op.opId, at);
        }, { fromSummary: surface === "summary" })}>
        Undo {label} · <time dateTime={op.createdAt}>{op.createdAt.slice(11, 19)} UTC</time>
      </button>);
  }

  if (!games.length) return null;
  return <section aria-label="Daily passes" className="border-b border-hairline px-4 py-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
      <h2 className="eyebrow">Daily passes · {REGION_LABEL[region]}</h2>
      <button type="button" ref={buttonRef} aria-expanded={open} aria-controls={viewId}
        className="min-h-10 text-xs text-muted underline" onClick={() => {
          setError(null);
          if (!open) setSelection(null);
          setOpen(!open);
        }}>{open ? "Done managing" : "Manage daily passes"}</button>
    </div>
    {local && (summaryGames.length ? <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {summaryGames.map(game => {
        const pass = states.get(passKey(game, region));
        const summaryView = passView(pass ?? { game, region, lastDay: null }, now);
        const warningId = warnsOnExtension(game, summaryView) ? `${viewId}-${game}-cap` : undefined;
        return <li key={game} className="max-w-full">
          <div className="flex items-center gap-2">
            <button type="button" disabled={writeDisabled} className={`${controlStyle} min-h-11 min-w-11 shrink-0`}
              aria-label={`Add 30 days to ${GAMES[game].name}, ${REGION_LABEL[region]}`}
              aria-describedby={warningId} onClick={() => extend(game, region, true)}>+30</button>
            <div className="min-w-0">
              <span className="font-semibold">{GAMES[game].short} · </span>
              <PassSummary view={summaryView} game={game} region={region} />
            </div>
          </div>
          {warningId && <p id={warningId} className="mt-1 text-soon">{extensionWarning}</p>}
          {pass && undoButtons(game, region, pass, "summary")}
        </li>;
      })}
    </ul> : <p className="text-xs text-faint">No passes configured in this region.</p>)}
    {persistent && <p role="alert" className="mt-2 text-xs text-soon">{persistent}
      {local?.pending.length ? ` ${local.pending.length} unsent pass ${local.pending.length === 1 ? "change is" : "changes are"} saved on this device.` : ""}
    </p>}
    <p role="status" className="text-xs text-faint empty:hidden">{status}</p>
    {hasConflicts && <p className="mt-2 text-xs text-soon">Pass changes need review.</p>}
    {error && (!open || error.fromSummary) && <p role="alert" className="mt-2 text-xs text-soon">{error.message}</p>}

    <div id={viewId} hidden={!open} onKeyDown={event => {
      if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    }}>
      {open && selectedGame && lane && state && view && <>
        <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <label className="min-w-0 text-xs text-muted">Game
            <select value={selectedGame} className={input} onChange={event => {
              setSelection({ game: event.target.value as GameId, region: selectedRegion });
              setError(null);
            }}>{games.map(game => <option key={game} value={game}>{GAMES[game].name}</option>)}</select>
          </label>
          <label className="min-w-0 text-xs text-muted">Pass region
            <select value={selectedRegion} className={input} onChange={event => {
              setSelection({ game: selectedGame, region: Region.parse(event.target.value) });
              setError(null);
            }}>{Region.options.map(option => <option key={option} value={option}>{REGION_LABEL[option]}</option>)}</select>
          </label>
        </div>
        {local && <ul aria-label="Passes by region" className="mt-3 space-y-2 text-xs">
          {Region.options.map(option => {
            const pass = states.get(passKey(selectedGame, option)) ?? { game: selectedGame, region: option, lastDay: null };
            return <li key={option}>
              <span className="font-semibold">{REGION_LABEL[option]} · </span>
              <PassSummary view={passView(pass, now)} game={selectedGame} region={option} />
              {"conflicts" in pass && (pass.conflicts.length > 0 || pass.concurrentSets.length > 0 || pass.outOfRange.length > 0) &&
                <span className="block text-soon">Needs review</span>}
            </li>;
          })}
        </ul>}
        {view.status !== "none" && <p className="mt-3 text-xs text-faint">Last active game-day · {view.lastDay}</p>}
        <p className="mt-1 text-xs text-faint">Days left exclude today. The pass stays active through its final game-day.</p>
        {managementWarning && <p id={`${viewId}-managed-cap`} className="mt-2 text-xs text-soon">{extensionWarning}</p>}
        <button type="button" disabled={writeDisabled} className={`${control} mt-3`}
          aria-describedby={managementWarning ? `${viewId}-managed-cap` : undefined}
          onClick={() => extend(selectedGame, selectedRegion, false)}>+30 days</button>
        {local && state.conflicts.map(id => {
          const extension = local.ops.find(op => op.opId === id);
          if (extension?.kind !== "extend") return null;
          return <div key={id} className="mt-3 rounded-lg border border-hairline p-2 text-xs">
            <p>Conflicting +{extension.days}-day extension from {extension.actionDay}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["include", "exclude"] as const).map(resolution =>
                <button key={resolution} type="button" className={control} disabled={!!persistent} onClick={() =>
                  change(selectedGame, selectedRegion, (_, fresh, at) => {
                    if (!fresh.conflicts.includes(id)) throw new Error("This conflict changed. Review the updated pass.");
                    return resolvePass(store, profileId, id, resolution, at);
                  }, { label: resolution === "include" ? "including the extension" : "dismissing the extension" })}>
                  {resolution === "include" ? "Include extension" : "Dismiss extension"}
                </button>)}
            </div>
          </div>;
        })}
        {state.concurrentSets.length > 0 && <p className="mt-2 text-xs text-soon">Concurrent correction found. Review the displayed date and save the correct value.</p>}
        {state.outOfRange.length > 0 && <p className="mt-2 text-xs text-soon">An extension exceeds the supported calendar. Set the correct date to resolve it.</p>}
        {state.conflicts.length > 0 && <p className="mt-2 text-xs text-faint">Resolve the conflicting extensions before correcting this pass.</p>}
        <PassCorrection key={lane} game={selectedGame} view={view} disabled={writeDisabled || !!state.conflicts.length}
          save={getDay => change(selectedGame, selectedRegion, (latest, fresh, at) => {
            if (fresh.conflicts.length) throw new Error("Resolve the conflicting extensions before correcting this pass.");
            const op = createPassSet(latest.ops, fresh.game, fresh.region, getDay(passDay(at, fresh.game, fresh.region)), at);
            if (reducePass([...latest.ops, op], fresh.game, fresh.region).winningSet !== op.opId) {
              throw new Error("The correction could not take effect. Check the device clock.");
            }
            queuePassOps(store, profileId, [op]);
            return op;
          }, { label: "correcting the pass" })} />
        {undoButtons(selectedGame, selectedRegion, state, "management")}
        {error && !error.fromSummary && <p role="alert" className="mt-2 text-xs text-soon">{error.message}</p>}
      </>}
    </div>
  </section>;
}

function PassCorrection({ game, view, disabled, save }: {
  game: GameId;
  view: PassView;
  disabled: boolean;
  save: (getDay: (today: string) => string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(true);
  const [value, setValue] = useState("");
  const id = useId();
  const days = value.trim() ? Number(value) : NaN;
  const validDays = Number.isSafeInteger(days) && days >= 0;
  const inclusiveCount = duration ? (validDays ? days + 1 : 0) : isPassDay(value) ? dayDiff(view.today, value) + 1 : 0;
  const prefillDays = view.status === "active" ? String(displayedDays(view)) : "";
  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    save(today => {
      if (!duration) return value;
      if (!validDays) throw new Error("Enter a whole number of game-days left (0 or more).");
      if (days > dayDiff(today, MAX_PASS_DAY)) throw new Error(`The last active game-day must be on or before ${MAX_PASS_DAY}.`);
      return addDays(today, days);
    });
  }
  return <div className="mt-1">
    <button type="button" className="min-h-10 text-xs underline" aria-controls={id}
      aria-expanded={open} onClick={() => {
        if (!open) { setDuration(true); setValue(prefillDays); }
        setOpen(!open);
      }}>Correct expiration</button>
    <form id={id} hidden={!open} onSubmit={submit} className="rounded-lg border border-hairline p-2">
      <fieldset disabled={disabled} className="grid gap-2">
        <label className="text-xs text-muted">Correction method
          <select className={input} value={duration ? "duration" : "date"} onChange={event => {
            const useDuration = event.target.value === "duration";
            setDuration(useDuration);
            setValue(useDuration ? prefillDays : view.status === "none" ? "" : view.lastDay);
          }}>
            <option value="duration">Remaining game-days</option>
            <option value="date">Last active game-day</option>
          </select>
        </label>
        <label className="text-xs text-muted">{duration ? "Game-days left as shown in game (excluding today)" : "Last active game-day (expires at the next reset)"}
          <input className={input} required type={duration ? "number" : "date"} value={value}
            {...(duration ? { min: 0, step: 1, inputMode: "numeric" as const } : { min: MIN_PASS_DAY, max: MAX_PASS_DAY })}
            onChange={event => setValue(event.target.value)} />
        </label>
        {duration && <p className="text-xs text-faint">Enter 0 if today is the final active game-day.</p>}
        {game === "genshin" && inclusiveCount > WELKIN_CAP &&
          <p className="text-xs text-soon">This correction may exceed Welkin’s {WELKIN_CAP}-day in-game limit.</p>}
        <button type="submit" className={control}>Save correction</button>
      </fieldset>
    </form>
  </div>;
}
