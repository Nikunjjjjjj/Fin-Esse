import type { Expense, Goal } from "../types";
import { assessAllGoals, cashflow, emergencyRunwayMonths, requiredMonthly } from "../lib/budget";
import { money, months as fmtMonths, pct, round2 } from "../lib/money";
import { getProfile, uid, updateProfile } from "../store/store";
import { S, requireNumber, result, type ToolSpec } from "./helpers";

export const budgetTools: ToolSpec[] = [
  {
    name: "budget_summary",
    effect: "read",
    description:
      "Show monthly income, essential and discretionary spending, total EMI outflow, the resulting surplus, the savings rate and how many months of emergency runway the cash reserve buys. Call this for any question about affordability, spare cash or monthly capacity.",
    inputSchema: S.obj({}),
    execute: () => {
      const p = getProfile();
      const cf = cashflow(p.budget, p.loans);
      const runway = emergencyRunwayMonths(p);
      return result(
        [
          `Income ${money(cf.monthlyIncome)}/mo.`,
          `Essentials ${money(cf.essentialExpenses)}, discretionary ${money(cf.discretionaryExpenses)}, EMIs ${money(cf.totalEmi)}.`,
          `Surplus ${money(cf.surplus)}/mo (savings rate ${pct(cf.savingsRatePct)}).`,
          `Debt service is ${pct(cf.emiToIncomePct)} of income.`,
          `Cash reserve ${money(p.budget.cashReserve)} = ${Number.isFinite(runway) ? `${runway} months` : "unlimited"} of essentials plus EMIs.`,
        ].join(" "),
        { ...cf, cashReserve: p.budget.cashReserve, emergencyRunwayMonths: runway },
      );
    },
  },
  {
    name: "budget_set_income",
    effect: "write",
    description:
      "Set the user's monthly take-home income. Everything downstream -- surplus, savings rate, debt-service ratio and goal feasibility -- is derived from this, so set it before giving cashflow advice.",
    inputSchema: S.obj({ monthlyIncome: S.num("Monthly take-home income.") }, ["monthlyIncome"]),
    execute: (i) => {
      const v = requireNumber(i.monthlyIncome, "monthlyIncome");
      if (v < 0) throw new Error("Income cannot be negative.");
      updateProfile((p) => ({ ...p, budget: { ...p.budget, monthlyIncome: v } }));
      const cf = cashflow(getProfile().budget, getProfile().loans);
      return result(`Income set to ${money(v)}/mo. Surplus is now ${money(cf.surplus)}/mo.`, cf);
    },
  },
  {
    name: "budget_set_cash_reserve",
    effect: "write",
    description: "Set the liquid cash the user holds outside their investments. This is what funds prepayments and emergencies.",
    inputSchema: S.obj({ cashReserve: S.num("Liquid cash available.") }, ["cashReserve"]),
    execute: (i) => {
      const v = requireNumber(i.cashReserve, "cashReserve");
      if (v < 0) throw new Error("Cash reserve cannot be negative.");
      updateProfile((p) => ({ ...p, budget: { ...p.budget, cashReserve: v } }));
      const runway = emergencyRunwayMonths(getProfile());
      return result(
        `Cash reserve set to ${money(v)}, which is ${Number.isFinite(runway) ? `${runway} months` : "unlimited"} of runway.`,
        { cashReserve: v, emergencyRunwayMonths: runway },
      );
    },
  },
  {
    name: "budget_add_expense",
    effect: "write",
    description: "Add a recurring monthly expense. Mark it essential if it cannot be cut in a crisis.",
    inputSchema: S.obj(
      {
        name: S.str("What the expense is."),
        amount: S.num("Monthly amount."),
        essential: S.bool("True if this cannot be cut during an income shock. Defaults to true."),
      },
      ["name", "amount"],
    ),
    execute: (i) => {
      const amount = requireNumber(i.amount, "amount");
      if (amount < 0) throw new Error("Expense amount cannot be negative.");
      const e: Expense = {
        id: uid("e"),
        name: String(i.name),
        amount,
        essential: i.essential !== false,
      };
      updateProfile((p) => ({ ...p, budget: { ...p.budget, expenses: [...p.budget.expenses, e] } }));
      const cf = cashflow(getProfile().budget, getProfile().loans);
      return result(
        `Added ${e.essential ? "essential" : "discretionary"} expense "${e.name}" at ${money(e.amount)}/mo. Surplus is now ${money(cf.surplus)}/mo.`,
        { expense: e, surplus: cf.surplus },
      );
    },
  },
  {
    name: "budget_remove_expense",
    effect: "write",
    description:
      "Remove a recurring expense by id or name. Use when the user stops paying for something, which frees up monthly surplus.",
    inputSchema: S.obj({ expenseId: S.str("Expense id or exact name.") }, ["expenseId"]),
    touches: (i) => [String(i.expenseId)],
    execute: (i) => {
      const key = String(i.expenseId);
      const e = getProfile().budget.expenses.find((x) => x.id === key || x.name === key);
      if (!e) throw new Error(`No expense matching "${key}".`);
      updateProfile((p) => ({
        ...p,
        budget: { ...p.budget, expenses: p.budget.expenses.filter((x) => x.id !== e.id) },
      }));
      return result(`Removed "${e.name}" (${money(e.amount)}/mo).`, { removed: e.id });
    },
  },
  {
    name: "budget_add_goal",
    effect: "write",
    description: "Add a savings goal with a target amount and a deadline in months.",
    inputSchema: S.obj(
      {
        name: S.str("What the goal is for."),
        targetAmount: S.num("Amount needed."),
        targetMonths: S.num("Months from now by which it is needed."),
        savedSoFar: S.num("Already set aside for this goal. Defaults to 0."),
      },
      ["name", "targetAmount", "targetMonths"],
    ),
    execute: (i) => {
      const target = requireNumber(i.targetAmount, "targetAmount");
      const monthsN = Math.round(requireNumber(i.targetMonths, "targetMonths"));
      if (target <= 0) throw new Error("Target amount must be positive.");
      if (monthsN <= 0) throw new Error("Target must be at least one month away.");
      const g: Goal = {
        id: uid("g"),
        name: String(i.name),
        targetAmount: target,
        targetMonths: monthsN,
        savedSoFar: Math.max(0, Number(i.savedSoFar ?? 0)),
      };
      updateProfile((p) => ({ ...p, goals: [...p.goals, g] }));
      const p = getProfile();
      const need = requiredMonthly(g.targetAmount, g.savedSoFar, g.targetMonths, p.expectedPortfolioReturnPct);
      return result(
        `Added goal "${g.name}": ${money(g.targetAmount)} in ${fmtMonths(g.targetMonths)}, needing ${money(need)}/mo at an assumed ${p.expectedPortfolioReturnPct}% return.`,
        { goal: g, requiredMonthly: need },
      );
    },
  },
  {
    name: "budget_remove_goal",
    effect: "write",
    description:
      "Remove a savings goal by id or name. Use when a goal has been met, abandoned, or was entered in error.",
    inputSchema: S.obj({ goalId: S.str("Goal id or exact name.") }, ["goalId"]),
    touches: (i) => [String(i.goalId)],
    execute: (i) => {
      const key = String(i.goalId);
      const g = getProfile().goals.find((x) => x.id === key || x.name === key);
      if (!g) throw new Error(`No goal matching "${key}".`);
      updateProfile((p) => ({ ...p, goals: p.goals.filter((x) => x.id !== g.id) }));
      return result(`Removed goal "${g.name}".`, { removed: g.id });
    },
  },
  {
    name: "budget_goal_feasibility",
    effect: "read",
    description:
      "Assess whether the user's savings goals are actually reachable given their current monthly surplus, and flag which ones collide. Use when the user asks whether they can afford a goal, or before recommending they commit spare cash elsewhere.",
    inputSchema: S.obj({}),
    execute: () => {
      const p = getProfile();
      if (!p.goals.length) return result("No goals recorded.", { goals: [] });
      const a = assessAllGoals(p);
      const text = a.goals
        .map((g) => `- "${g.name}": needs ${money(g.requiredMonthly)}/mo for ${fmtMonths(g.targetMonths)}. ${g.verdict}`)
        .join("\n");
      return result(`${a.note}\n${text}`, a);
    },
  },
  {
    name: "budget_set_expected_return",
    effect: "write",
    description:
      "Set the assumed long-run annual portfolio return used by goal and prepay-vs-invest maths. Use when the user wants to test a more or less optimistic assumption.",
    inputSchema: S.obj(
      { expectedReturnPct: S.num("Assumed nominal annual return as a percentage, e.g. 11.") },
      ["expectedReturnPct"],
    ),
    execute: (i) => {
      const v = requireNumber(i.expectedReturnPct, "expectedReturnPct");
      if (v < -20 || v > 40) throw new Error("Expected return must be between -20% and 40%.");
      updateProfile((p) => ({ ...p, expectedPortfolioReturnPct: round2(v) }));
      return result(
        `Expected portfolio return set to ${pct(v)}. All goal and prepay-vs-invest maths now uses this assumption.`,
        { expectedPortfolioReturnPct: round2(v) },
      );
    },
  },
];
