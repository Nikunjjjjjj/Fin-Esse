export type AssetClass =
  | "equity"
  | "debt"
  | "gold"
  | "cash"
  | "crypto"
  | "real_estate";

export type LoanKind = "home" | "auto" | "education" | "personal" | "credit_card" | "other";

export interface Loan {
  id: string;
  name: string;
  kind: LoanKind;
  /** Original sanctioned principal. */
  principal: number;
  /** Nominal annual interest rate, percent. e.g. 8.5 */
  annualRatePct: number;
  /** Original tenure in months. */
  termMonths: number;
  /** How many EMIs have already been paid. */
  monthsPaid: number;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  units: number;
  /** Current price per unit. */
  price: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  essential: boolean;
}

export interface Budget {
  monthlyIncome: number;
  expenses: Expense[];
  /** Liquid cash not invested and not committed. */
  cashReserve: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  /** Months from now by which the user wants to hit targetAmount. */
  targetMonths: number;
  savedSoFar: number;
}

/**
 * An asset that counts towards net worth but is not investable -- a
 * self-occupied home being the usual case. Keeping these out of `holdings`
 * stops a house from dominating portfolio allocation and stops the advisor
 * from suggesting you "rebalance" out of the roof over your head.
 */
export interface RealAsset {
  id: string;
  name: string;
  value: number;
}

export interface Profile {
  currency: string;
  /** True while the profile is untouched sample data, not the user's own. */
  isSample: boolean;
  loans: Loan[];
  holdings: Holding[];
  realAssets: RealAsset[];
  budget: Budget;
  goals: Goal[];
  /** Long-run assumed nominal return used by advisor tradeoff math, percent p.a. */
  expectedPortfolioReturnPct: number;
}

/** A mutation an agent has proposed but a human has not yet approved. */
export interface Proposal {
  id: string;
  createdAt: number;
  tool: string;
  title: string;
  summary: string;
  /** Human-readable before/after lines rendered on the approval card. */
  effects: string[];
  status: "pending" | "approved" | "rejected";
  apply: (p: Profile) => Profile;
}

export type ActivityKind =
  | "read"
  | "write"
  | "propose"
  | "approve"
  | "reject"
  | "compute"
  | "system";

export interface ActivityEntry {
  id: string;
  at: number;
  kind: ActivityKind;
  tool: string;
  detail: string;
  /** Entity ids this call touched, used to flash the matching UI cards. */
  touched: string[];
}

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: number;
  profile: Profile;
  note: string;
}

export interface AppState {
  profile: Profile;
  activity: ActivityEntry[];
  proposals: Proposal[];
  scenarios: SavedScenario[];
  /** When non-null, the profile is a sandboxed fork; baseline holds the real one. */
  scenarioMode: { name: string; baseline: Profile } | null;
  /**
   * Which set of numbers the UI is showing while a branch is open. The branch
   * is a place you visit, not a mode the whole app enters, so your real
   * position stays one click away instead of behind an unwind.
   * Agent tools always operate on the branch regardless of this.
   */
  workspace: "real" | "branch";
  highlighted: Record<string, number>;
  toolNames: string[];
  webmcpStatus: "unsupported" | "ready";
  /** Set when the current profile arrived via a shared handoff link. */
  handoff: { from: string; note: string; at: number } | null;
  /** The market read the agent most recently brought back, kept on screen. */
  marketRead: {
    at: number;
    conditions: Array<{ label: string; changePct: number; note: string; source?: string }>;
    headline: string;
    changePct: number;
  } | null;
}
