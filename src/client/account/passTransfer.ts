import { z } from "zod";
import { PassOp, reducePass, reducePasses, unionPassOps } from "../../shared/dailyPasses.ts";
import {
  DAILY_PASSES_ENABLED, createPassSet, mergePulledPasses, passRemote, readPasses, persistPassIntent, assertPassWritable,
  type PassLocal, type PassStore, type PassTransport,
} from "./passProtocol.ts";
import { profileKeys } from "../state/storage.ts";

export type PassChoice = "current" | "imported";
export type PassChoices = Record<string, PassChoice>;
const sourceSchema = z.object({ profileId: z.string(), ops: z.array(PassOp), imports: z.array(z.string()).optional() }).strict();
export type PassSource = z.infer<typeof sourceSchema>;
const canonicalOps = (ops: readonly PassOp[]) => JSON.stringify(unionPassOps([], ops)
  .map(op => ({ ...op, createdAt: new Date(op.createdAt).toISOString() })));
const receipt = (source: PassSource) => JSON.stringify({ profileId: source.profileId, ops: JSON.parse(canonicalOps(source.ops)) });

export type PassTransferPlan = {
  targetProfileId: string; targetOps: string; source: PassSource;
  /** D6 decides per GAME, even if the existing ops belong to another region. */
  choicesRequired: string[]; alreadyApplied: boolean;
};
/** Pure planning: no writes, clock reads, IDs or network. Same-profile means exact
 * equality of the stable profile IDs, never a name, email or current Auth session. */
export function planPassTransfer(target: PassLocal, input: PassSource): PassTransferPlan {
  assertPassWritable(target);
  const source = sourceSchema.parse(input); profileKeys(source.profileId);
  source.ops = unionPassOps([], source.ops);
  const same = target.profileId === source.profileId;
  const alreadyApplied = target.imports.includes(receipt(source)) &&
    (!same || (source.imports ?? []).every(r => target.imports.includes(r)));
  return { targetProfileId: target.profileId, targetOps: canonicalOps(target.ops), source, alreadyApplied,
    choicesRequired: same || alreadyApplied ? [] : [...new Set(source.ops.map(op => op.game))]
      .filter(game => target.ops.some(op => op.game === game)).sort() };
}
export class PassChoicesRequired extends Error {
  constructor(readonly plan: PassTransferPlan) { super("Pass import requires a choice for each existing game"); }
}
/** Persist an exact D6 intent before any op keys or transport; reads roll forward.
 * A stale plan is rejected; retries of an applied source return without minting IDs.
 * Target-only regions remain intact. Source regions become explicit values, never sums. */
export function applyPassTransfer(store: PassStore, plan: PassTransferPlan, choices: PassChoices,
  now = Date.now()): PassLocal {
  const target = readPasses(store, plan.targetProfileId);
  const fresh = planPassTransfer(target, plan.source);
  if (fresh.alreadyApplied) return target;
  if (canonicalOps(target.ops) !== plan.targetOps) throw new Error("Pass import plan is stale; plan again");
  if (target.held) throw new Error("Pass profile is held; export recovery before importing");
  if (fresh.choicesRequired.some(game => choices[game] !== "current" && choices[game] !== "imported")) {
    throw new PassChoicesRequired(fresh);
  }
  let added: PassOp[];
  if (target.profileId === fresh.source.profileId) {
    const merged = unionPassOps(target.ops, fresh.source.ops);
    added = merged.filter(op => !target.ops.some(old => old.opId === op.opId));
  } else {
    added = [];
    const games = [...new Set(fresh.source.ops.map(op => op.game))].sort();
    for (const game of games) {
      const sourceOps = fresh.source.ops.filter(op => op.game === game);
      if (!target.ops.some(op => op.game === game)) {
        added.push(...sourceOps);
        for (const state of reducePasses(sourceOps).values()) {
          const seen = sourceOps.filter(op => !state.conflicts.includes(op.opId));
          const op = createPassSet(seen, game, state.region, state.lastDay, now);
          const result = reducePass([...sourceOps, op], game, state.region);
          if (result.winningSet !== op.opId || result.lastDay !== state.lastDay ||
              result.conflicts.join() !== state.conflicts.join()) {
            throw new Error("Pass correction cannot win at this clock; review the source ops");
          }
          added.push(op);
        }
      }
      else if (choices[game] === "imported") {
        for (const state of reducePasses(sourceOps).values()) {
          const op = createPassSet(target.ops, game, state.region, state.lastDay, now);
          // Skewed/future corrections must not silently defeat an explicit choice.
          const result = reducePass([...target.ops, op], game, state.region);
          if (result.winningSet !== op.opId || result.lastDay !== state.lastDay) {
            throw new Error("Pass correction cannot win at this clock; review the target ops");
          }
          added.push(op);
        }
      }
    }
  }
  unionPassOps(target.ops, added); // Fail before writing an intent on an ID collision.
  const imports = target.profileId === fresh.source.profileId ? fresh.source.imports ?? [] : [];
  if (added.length || imports.some(r => !target.imports.includes(r)) ||
      (target.profileId !== fresh.source.profileId && fresh.source.ops.length)) {
    persistPassIntent(store, target.profileId, receipt(fresh.source), added, imports);
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("account-sync-local-change", { detail: target.profileId }));
  return readPasses(store, target.profileId);
}

/** First login uses a fresh cloud pull before testing D6's "no ops for this game".
 * No guest operation is uploaded here. The ordinary pass cycle sends only the
 * account's durable pending result after applyPassTransfer has recorded the choice. */
export async function planFirstLoginPasses(store: PassStore, profileId: string, guestId: string,
  active: () => boolean, transport: PassTransport = passRemote,
  enabled = DAILY_PASSES_ENABLED): Promise<PassTransferPlan | null> {
  if (!enabled) return null;
  if (!guestId.startsWith("local:") || profileId.startsWith("local:")) throw new Error("Invalid pass first-login profiles");
  if (!active()) throw new Error("Pass account session changed");
  const remote = unionPassOps([], await transport.pull(profileId));
  if (!active()) throw new Error("Pass account session changed");
  const target = mergePulledPasses(store, profileId, remote);
  const source = readPasses(store, guestId);
  assertPassWritable(source);
  return planPassTransfer(target, { profileId: guestId, ops: source.ops });
}
