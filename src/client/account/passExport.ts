import { z } from "zod";
import { CznLocalSchema, buildCznExport, importCzn, importLegacyCzn, preserveCznLegacy, readCzn } from "./cznProtocol.ts";
import { DAILY_PASSES_ENABLED, PassLocalSchema, mergePulledPasses, passRemote, readPasses, validatePassLocal,
  type PassStore, type PassTransport } from "./passProtocol.ts";
import { applyPassTransfer, PassPlanChanged, planPassTransfer, samePassTransferSnapshot,
  type PassChoices, type PassTransferPlan } from "./passTransfer.ts";

const envelope = z.object({ format: z.literal("game-calendar-policy-export"),
  formatVersion: z.literal(1), state: CznLocalSchema, personal: z.unknown().optional() }).strict();
const v2 = envelope.extend({ formatVersion: z.literal(2), passes: PassLocalSchema }).strict();

/** The disabled branch returns the original envelope object, byte for byte.
 * Empty profiles continue exporting v1. Pending IDs in a file are never ACKs. */
export function addPassExport(store: PassStore, profileId: string, base: ReturnType<typeof buildCznExport>,
  enabled = DAILY_PASSES_ENABLED) {
  if (!enabled) return base;
  if (base.state.profileId !== profileId) throw new Error("Export profile mismatch");
  const passes = readPasses(store, profileId);
  if (!passes.ops.length && !passes.held && !passes.imports.length && !passes.recovery.length) return base;
  return { ...base, formatVersion: 2 as const, passes };
}
export function buildProfileExport(store: PassStore, profileId: string, personal?: unknown,
  enabled = DAILY_PASSES_ENABLED) {
  return addPassExport(store, profileId, buildCznExport(preserveCznLegacy(store, readCzn(store, profileId)), personal), enabled);
}

export type PassImportPlan = {
  czn: z.infer<typeof envelope>; passes: PassTransferPlan | null;
};
/** Validate the WHOLE envelope before any mutation. v1 has no pass meaning. */
export function planPolicyImport(store: PassStore, profileId: string, input: unknown,
  enabled = DAILY_PASSES_ENABLED): PassImportPlan {
  const raw = input as { formatVersion?: unknown } | null;
  if (enabled && raw?.formatVersion === 2) {
    const parsed = v2.parse(input);
    const source = validatePassLocal(parsed.passes, parsed.passes.profileId);
    if (parsed.state.profileId !== source.profileId) throw new Error("Export profile mismatch");
    // Collision recovery is portable, but not an instruction to resolve it implicitly.
    if (source.recovery.length) throw new Error("Pass export contains recovery entries; automatic import refused for the whole file");
    if (source.held) throw new Error("Pass export contains a collision; preserve it for review");
    return { czn: { format: parsed.format, formatVersion: 1, state: parsed.state,
      ...(parsed.personal === undefined ? {} : { personal: parsed.personal }) },
      passes: planPassTransfer(readPasses(store, profileId), { profileId: source.profileId, ops: source.ops, imports: source.imports }) };
  }
  return { czn: envelope.parse(input), passes: null };
}
/** Account caches may be cold. A foreign import must inspect cloud ops before
 * deciding that a target game is empty, just like first login. UI can present
 * this prepared plan and then call applyPolicyImport with explicit choices. */
export async function preparePolicyImport(store: PassStore, profileId: string, input: unknown,
  active: () => boolean, transport: PassTransport = passRemote,
  enabled = DAILY_PASSES_ENABLED): Promise<PassImportPlan> {
  const check = () => { if (!active()) throw new Error("Pass import profile changed"); };
  check();
  const plan = planPolicyImport(store, profileId, input, enabled);
  if (plan.passes && !plan.passes.alreadyApplied && plan.passes.source.ops.length &&
      plan.passes.source.profileId !== profileId && !profileId.startsWith("local:")) {
    const remote = await transport.pull(profileId); check();
    mergePulledPasses(store, profileId, remote);
    return planPolicyImport(store, profileId, input, enabled);
  }
  return plan;
}
/** The pass result is durable before the independent CZN write. On quota/crash a
 * retry unions the same ops or finds its D6 receipt; it cannot double-extend. */
export function applyPolicyImport(store: PassStore, profileId: string, plan: PassImportPlan,
  choices: PassChoices = {}, enabled = DAILY_PASSES_ENABLED, now = Date.now(),
  { rejectAlreadyApplied = false }: { rejectAlreadyApplied?: boolean } = {}): unknown {
  if (plan.passes) {
    if (!enabled) throw new Error("Pass imports are disabled");
    if (plan.passes.targetProfileId !== profileId) throw new Error("Pass import profile changed");
    applyPassTransfer(store, plan.passes, choices, now, { rejectAlreadyApplied });
  }
  importCzn(store, readCzn(store, profileId), plan.czn);
  return plan.czn.personal;
}
/** Browser import adapter; D6 choices are supplied by PASS-2 through plan/apply.
 * Until then a missing choice throws before importing any part of the file. */
export async function importProfileData(store: PassStore, profileId: string, input: unknown,
  choices: PassChoices = {}, enabled = DAILY_PASSES_ENABLED, transport: PassTransport = passRemote,
  active: () => boolean = () => true): Promise<unknown> {
  const raw = input as { format?: unknown } | null;
  if (raw?.format === "game-calendar-policy-export") {
    const plan = await preparePolicyImport(store, profileId, input, active, transport, enabled);
    if (!active()) throw new Error("Pass import profile changed");
    return applyPolicyImport(store, profileId, plan, choices, enabled);
  }
  importLegacyCzn(store, readCzn(store, profileId), input);
  return input;
}

/** Re-pull after confirmation, and ask again if any operation changed. A receipt
 * that wins during confirmation rejects that attempt before importing other data. */
export async function importWithPassChoices(store: PassStore, profileId: string, input: unknown,
  active: () => boolean,
  choose: (transfer: PassTransferPlan, updated: boolean) => Promise<PassChoices | null>,
  transport: PassTransport = passRemote,
): Promise<{ personal: unknown } | null> {
  let plan = await preparePolicyImport(store, profileId, input, active, transport, true);
  let updated = false;
  while (active()) {
    let choices: PassChoices = {};
    let confirmed = false;
    if (plan.passes && !plan.passes.alreadyApplied && (updated || plan.passes.choicesRequired.length)) {
      const selected = await choose(plan.passes, updated);
      if (!selected || !active()) return null;
      const fresh = await preparePolicyImport(store, profileId, input, active, transport, true);
      if (!fresh.passes) throw new Error("Pass import plan unavailable");
      if (fresh.passes.alreadyApplied) throw new PassPlanChanged(fresh.passes);
      const changed = !samePassTransferSnapshot(plan.passes, fresh.passes);
      plan = fresh;
      if (changed) { updated = true; continue; }
      choices = selected;
      confirmed = true;
    }
    if (!active()) return null;
    try {
      return { personal: applyPolicyImport(store, profileId, plan, choices, true, undefined,
        { rejectAlreadyApplied: confirmed }) };
    } catch (error) {
      if (!(error instanceof PassPlanChanged) || error.plan.alreadyApplied) throw error;
      plan = { ...plan, passes: error.plan };
      updated = true;
    }
  }
  return null;
}
