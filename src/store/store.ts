import { useSyncExternalStore } from "react";
import type {
  ActivityEntry,
  ActivityKind,
  AppState,
  Profile,
  Proposal,
  SavedScenario,
} from "../types";
import { demoProfile, emptyProfile } from "./seed";
import { setDisplayCurrency, type CurrencyCode } from "../lib/money";
import { sanitizeProfile, type HandoffPacket } from "../lib/handoff";

let state: AppState = {
  profile: emptyProfile(),
  activity: [],
  proposals: [],
  scenarios: [],
  scenarioMode: null,
  workspace: "real",
  highlighted: {},
  toolNames: [],
  webmcpStatus: "unsupported",
  handoff: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
}

/** Read-only hook for components. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useSelector<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state),
  );
}

export function getProfile(): Profile {
  return state.profile;
}

export function updateProfile(fn: (p: Profile) => Profile) {
  // Any edit means this is no longer pristine sample data, so a later currency
  // switch must not silently discard it.
  const next = { ...fn(state.profile), isSample: false };
  setDisplayCurrency(next.currency === "USD" ? "USD" : "INR");
  setState({ profile: next });
}

/**
 * The single gate every change to the user's financial facts passes through.
 *
 * Outside a what-if branch this queues a proposal and changes nothing: the
 * agent describes what it wants to do and a person decides. Inside a branch it
 * applies immediately, because the branch is itself the safety mechanism --
 * everything in it is discarded unless the user explicitly keeps it, so
 * asking for approval on each step of an exploration would be ceremony
 * without protection.
 */
export function proposeOrApply(p: {
  tool: string;
  title: string;
  summary: string;
  effects: string[];
  apply: (profile: Profile) => Profile;
}): { applied: boolean; proposalId?: string } {
  if (state.scenarioMode) {
    updateProfile(p.apply);
    return { applied: true };
  }
  const proposal = addProposal(p);
  return { applied: false, proposalId: proposal.id };
}

export function setCurrency(code: CurrencyCode) {
  setDisplayCurrency(code);
  // Swapping the symbol on sample data would leave nonsense figures -- a
  // 65-lakh home loan does not become a 65-lakh-dollar one -- so untouched
  // sample data is replaced with the equivalent sample for that currency.
  // A profile the user has actually edited is never rewritten.
  if (state.profile.isSample) {
    setState({ profile: demoProfile(code), proposals: [], scenarios: [], scenarioMode: null });
    logActivity("system", "app", `Switched to the ${code} sample profile.`);
    return;
  }
  setState({ profile: { ...state.profile, currency: code } });
  logActivity("system", "app", `Display currency set to ${code}.`);
}

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

const HIGHLIGHT_MS = 4000;

/** Records a tool call on the visible agent trail and flashes the entities it touched. */
export function logActivity(
  kind: ActivityKind,
  tool: string,
  detail: string,
  touched: string[] = [],
) {
  const entry: ActivityEntry = { id: uid("act"), at: Date.now(), kind, tool, detail, touched };
  const highlighted = { ...state.highlighted };
  const until = Date.now() + HIGHLIGHT_MS;
  for (const id of touched) highlighted[id] = until;
  setState({ activity: [entry, ...state.activity].slice(0, 200), highlighted });
  if (touched.length) {
    setTimeout(() => {
      const now = Date.now();
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(state.highlighted)) if (v > now) cleaned[k] = v;
      setState({ highlighted: cleaned });
    }, HIGHLIGHT_MS + 50);
  }
}

export function addProposal(p: Omit<Proposal, "id" | "createdAt" | "status">): Proposal {
  const proposal: Proposal = { ...p, id: uid("prop"), createdAt: Date.now(), status: "pending" };
  setState({ proposals: [proposal, ...state.proposals] });
  return proposal;
}

export function resolveProposal(id: string, decision: "approved" | "rejected") {
  const proposal = state.proposals.find((p) => p.id === id);
  if (!proposal || proposal.status !== "pending") return null;
  if (decision === "approved") {
    setState({ profile: { ...proposal.apply(state.profile), isSample: false } });
  }
  setState({
    proposals: state.proposals.map((p) => (p.id === id ? { ...p, status: decision } : p)),
  });
  logActivity(decision === "approved" ? "approve" : "reject", proposal.tool, proposal.title);
  return proposal;
}

export function loadDemoProfile(code?: CurrencyCode) {
  const currency = code ?? (state.profile.currency === "USD" ? "USD" : "INR");
  setDisplayCurrency(currency);
  setState({
    profile: demoProfile(currency),
    proposals: [],
    scenarios: [],
    scenarioMode: null,
    workspace: "real",
    handoff: null,
  });
  logActivity("system", "app", "Loaded the sample financial profile.");
}

export function resetProfile() {
  const currency = state.profile.currency === "USD" ? "USD" : "INR";
  setState({
    profile: emptyProfile(currency),
    proposals: [],
    scenarios: [],
    scenarioMode: null,
    workspace: "real",
    handoff: null,
  });
  logActivity("system", "app", "Cleared the profile.");
}

export function enterScenario(name: string) {
  if (state.scenarioMode) return false;
  // Land the viewer in the branch they just opened; the real pages stay
  // available and unchanged behind the workspace switch.
  setState({ scenarioMode: { name, baseline: state.profile }, workspace: "branch" });
  return true;
}

export function setWorkspace(workspace: "real" | "branch") {
  if (!state.scenarioMode && workspace === "branch") return;
  setState({ workspace });
}

/**
 * The profile the UI should render. Tools always act on `profile` (the branch
 * while one is open); this is purely about what the person is looking at.
 */
export function viewedProfile(): Profile {
  const s = state;
  return s.scenarioMode && s.workspace === "real" ? s.scenarioMode.baseline : s.profile;
}

export function useViewedProfile(): Profile {
  return useSelector((st) =>
    st.scenarioMode && st.workspace === "real" ? st.scenarioMode.baseline : st.profile,
  );
}

export function exitScenario(keep: boolean) {
  const mode = state.scenarioMode;
  if (!mode) return null;
  const explored = state.profile;
  setState({ profile: keep ? explored : mode.baseline, scenarioMode: null, workspace: "real" });
  return { name: mode.name, kept: keep };
}

export function applyHandoff(packet: HandoffPacket) {
  const profile = sanitizeProfile(packet.profile);
  setDisplayCurrency(profile.currency === "USD" ? "USD" : "INR");
  setState({
    profile,
    proposals: [],
    scenarios: [],
    scenarioMode: null,
    handoff: { from: packet.from, note: packet.note, at: packet.at },
  });
  logActivity(
    "system",
    "handoff",
    `Loaded a shared position from ${packet.from}${packet.note ? `: "${packet.note}"` : ""}. You are now reasoning on their numbers.`,
  );
}

export function dismissHandoff() {
  setState({ handoff: null });
}

export function saveScenario(name: string, note: string): SavedScenario {
  const s: SavedScenario = {
    id: uid("scn"),
    name,
    note,
    createdAt: Date.now(),
    profile: structuredClone(state.profile),
  };
  setState({ scenarios: [s, ...state.scenarios] });
  return s;
}
