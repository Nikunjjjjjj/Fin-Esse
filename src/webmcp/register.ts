import { getState, logActivity, setState } from "../store/store";
import { instrument, type ToolSpec } from "./helpers";
import { isWebMcpAvailable, registerTool, registeredToolNames, webmcpFlavour } from "./shim";
import { advisorTools } from "./tools.advisor";
import { budgetTools } from "./tools.budget";
import { loanTools } from "./tools.loan";
import { portfolioTools } from "./tools.portfolio";
import { handoffTools } from "./tools.handoff";

/**
 * Tools that are always available, versus tools that only make sense once the
 * user actually has the data they operate on.
 *
 * Registering everything up front is the easy path, but it hands the agent a
 * menu of tools that will simply error. Gating means the tool list the agent
 * sees is always a truthful description of what this page can currently do,
 * and it shrinks the surface the model has to reason over. Registration is
 * re-evaluated on every state change and the diff applied via AbortController.
 */
const ALWAYS: ReadonlySet<string> = new Set([
  "loan_list",
  "loan_add",
  "loan_emi_calculator",
  "loan_compare_offers",
  "portfolio_list",
  "portfolio_add_holding",
  "portfolio_add_real_asset",
  "budget_summary",
  "budget_set_income",
  "budget_set_cash_reserve",
  "budget_add_expense",
  "budget_add_goal",
  "budget_set_expected_return",
  "advisor_net_position",
  "advisor_assumptions",
  "advisor_recommendations",
  "advisor_risk_exposure",
  "advisor_load_handoff_link",
  "advisor_list_stances",
  "advisor_shared_position_info",
]);

const ALL_TOOLS: ToolSpec[] = [
  ...loanTools,
  ...portfolioTools,
  ...budgetTools,
  ...advisorTools,
  ...handoffTools,
];

function shouldRegister(name: string): boolean {
  const s = getState();
  const p = s.profile;
  if (ALWAYS.has(name)) return true;

  const hasLoans = p.loans.length > 0;
  const hasHoldings = p.holdings.length > 0;
  const hasGoals = p.goals.length > 0;
  const hasExpenses = p.budget.expenses.length > 0;
  const inScenario = s.scenarioMode !== null;

  switch (name) {
    case "loan_remove":
    case "loan_amortisation":
    case "loan_simulate_prepayment":
    case "loan_propose_prepayment":
      return hasLoans;

    case "portfolio_remove_holding":
    case "portfolio_allocation":
    case "portfolio_plan_rebalance":
    case "portfolio_propose_rebalance":
    case "portfolio_simulate_market_event":
    case "portfolio_update_price":
      return hasHoldings;

    case "budget_remove_expense":
      return hasExpenses;
    case "budget_remove_goal":
    case "budget_goal_feasibility":
      return hasGoals;

    // The headline cross-domain tools need something on both sides of the
    // balance sheet to have anything to say.
    case "advisor_prepay_vs_invest":
    case "advisor_horizon_projection":
      return hasLoans;

    // Sharing an empty profile helps nobody, and a second opinion needs
    // something to actually disagree about.
    case "advisor_create_handoff_link":
      return hasLoans || hasHoldings || hasGoals;
    case "advisor_second_opinion":
    case "advisor_argue_as":
      return hasLoans || hasHoldings;
    case "advisor_stress_test":
      return hasLoans || hasHoldings;
    case "advisor_explain_number":
      return hasLoans || hasHoldings || hasExpenses;

    // Scenario lifecycle: exactly one of begin/end is ever offered, so the
    // agent cannot open two branches or close one that was never opened.
    case "advisor_begin_whatif":
      return !inScenario && (hasLoans || hasHoldings);
    case "advisor_end_whatif":
      return inScenario;
    case "advisor_save_scenario":
      return hasLoans || hasHoldings;
    case "advisor_compare_scenarios":
      return s.scenarios.length > 0;

    default:
      return true;
  }
}

const disposers = new Map<string, () => void>();

/** Applies the difference between what should be registered and what is. */
export function syncTools() {
  let changed = false;

  for (const spec of ALL_TOOLS) {
    const want = shouldRegister(spec.name);
    const have = disposers.has(spec.name);
    if (want && !have) {
      disposers.set(spec.name, registerTool(instrument(spec)));
      changed = true;
    } else if (!want && have) {
      disposers.get(spec.name)!();
      disposers.delete(spec.name);
      changed = true;
    }
  }

  const names = registeredToolNames();
  if (changed || names.length !== getState().toolNames.length) {
    setState({ toolNames: names });
  }
  return changed;
}

let started = false;

export function startWebMcp() {
  if (started) return;
  started = true;

  const available = isWebMcpAvailable();
  setState({ webmcpStatus: available ? "ready" : "unsupported" });

  syncTools();

  logActivity(
    "system",
    "webmcp",
    available
      ? `Registered ${registeredToolNames().length} tools via ${webmcpFlavour()}.modelContext. The agent can now act on this page.`
      : "No WebMCP agent detected in this browser. The app is fully usable on its own; open it in ChatGPT's browser or Chrome 149+ to collaborate with an agent.",
  );
}

/** Re-evaluates gating whenever application state changes. */
export function watchForToolChanges() {
  let last = signature();
  setInterval(() => {
    const now = signature();
    if (now === last) return;
    last = now;
    const changed = syncTools();
    if (changed) {
      logActivity("system", "webmcp", `Tool set updated — ${registeredToolNames().length} tools now available.`);
    }
  }, 400);
}

/** Cheap fingerprint of everything gating depends on. */
function signature(): string {
  const s = getState();
  return [
    s.profile.loans.length,
    s.profile.holdings.length,
    s.profile.goals.length,
    s.profile.budget.expenses.length,
    s.scenarios.length,
    s.scenarioMode ? 1 : 0,
  ].join("|");
}

export { ALL_TOOLS };
