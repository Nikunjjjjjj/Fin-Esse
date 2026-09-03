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

let state: AppState = {
  profile: emptyProfile(),
  activity: [],
  proposals: [],
  scenarios: [],
  scenarioMode: null,
  highlighted: {},
  toolNames: [],
  webmcpStatus: "unsupported",
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
  setState({ profile: fn(state.profile) });
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
    setState({ profile: proposal.apply(state.profile) });
  }
  setState({
    proposals: state.proposals.map((p) => (p.id === id ? { ...p, status: decision } : p)),
  });
  logActivity(decision === "approved" ? "approve" : "reject", proposal.tool, proposal.title);
  return proposal;
}

export function loadDemoProfile() {
  setState({ profile: demoProfile(), proposals: [], scenarios: [], scenarioMode: null });
  logActivity("system", "app", "Loaded the sample financial profile.");
}

export function resetProfile() {
  setState({ profile: emptyProfile(), proposals: [], scenarios: [], scenarioMode: null });
  logActivity("system", "app", "Cleared the profile.");
}

export function enterScenario(name: string) {
  if (state.scenarioMode) return false;
  setState({ scenarioMode: { name, baseline: state.profile } });
  return true;
}

export function exitScenario(keep: boolean) {
  const mode = state.scenarioMode;
  if (!mode) return null;
  const explored = state.profile;
  setState({ profile: keep ? explored : mode.baseline, scenarioMode: null });
  return { name: mode.name, kept: keep };
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
