import type { Budget, Goal, Loan, Profile } from "../types";
import { totalMonthlyEmi } from "./loan";
import { round2 } from "./money";

export interface CashflowSummary {
  monthlyIncome: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  totalExpenses: number;
  totalEmi: number;
  surplus: number;
  savingsRatePct: number;
  /** Share of income already committed to debt service. */
  emiToIncomePct: number;
  discretionaryHeadroom: number;
}

export function cashflow(budget: Budget, loans: Loan[]): CashflowSummary {
  const essential = budget.expenses.filter((e) => e.essential).reduce((s, e) => s + e.amount, 0);
  const discretionary = budget.expenses
    .filter((e) => !e.essential)
    .reduce((s, e) => s + e.amount, 0);
  const totalEmi = totalMonthlyEmi(loans);
  const totalExpenses = essential + discretionary;
  const surplus = round2(budget.monthlyIncome - totalExpenses - totalEmi);
  return {
    monthlyIncome: budget.monthlyIncome,
    essentialExpenses: round2(essential),
    discretionaryExpenses: round2(discretionary),
    totalExpenses: round2(totalExpenses),
    totalEmi,
    surplus,
    savingsRatePct:
      budget.monthlyIncome > 0 ? round2((surplus / budget.monthlyIncome) * 100) : 0,
    emiToIncomePct:
      budget.monthlyIncome > 0 ? round2((totalEmi / budget.monthlyIncome) * 100) : 0,
    discretionaryHeadroom: round2(discretionary),
  };
}

/** Future value of a monthly annuity plus a lump sum, at an annual nominal rate. */
export function futureValue(
  lumpSum: number,
  monthlyContribution: number,
  months: number,
  annualRatePct: number,
): number {
  const r = annualRatePct / 12 / 100;
  if (months <= 0) return round2(lumpSum);
  if (r === 0) return round2(lumpSum + monthlyContribution * months);
  const growth = Math.pow(1 + r, months);
  return round2(lumpSum * growth + monthlyContribution * ((growth - 1) / r));
}

/** Monthly contribution needed to reach `target` from `current` in `months`. */
export function requiredMonthly(
  target: number,
  current: number,
  months: number,
  annualRatePct: number,
): number {
  if (months <= 0) return round2(Math.max(0, target - current));
  const r = annualRatePct / 12 / 100;
  if (r === 0) return round2(Math.max(0, (target - current) / months));
  const growth = Math.pow(1 + r, months);
  const shortfall = target - current * growth;
  if (shortfall <= 0) return 0;
  return round2(shortfall / ((growth - 1) / r));
}

export interface GoalAssessment {
  id: string;
  name: string;
  targetAmount: number;
  targetMonths: number;
  savedSoFar: number;
  requiredMonthly: number;
  projectedValue: number;
  shortfall: number;
  onTrack: boolean;
  /** Share of the available surplus this single goal would consume. */
  surplusSharePct: number;
  verdict: string;
}

export function assessGoal(
  goal: Goal,
  surplus: number,
  annualRatePct: number,
): GoalAssessment {
  const need = requiredMonthly(goal.targetAmount, goal.savedSoFar, goal.targetMonths, annualRatePct);
  const projected = futureValue(goal.savedSoFar, Math.max(0, surplus), goal.targetMonths, annualRatePct);
  const shortfall = round2(Math.max(0, goal.targetAmount - projected));
  const share = surplus > 0 ? round2((need / surplus) * 100) : Infinity;
  let verdict: string;
  if (need <= 0) verdict = "Already funded by existing savings and growth.";
  else if (surplus <= 0) verdict = "No monthly surplus available — this goal cannot be funded from cashflow today.";
  else if (need > surplus) verdict = `Needs ${round2(need)}/mo but only ${round2(surplus)}/mo is free — short by ${round2(need - surplus)}/mo.`;
  else verdict = `Fundable: needs ${round2((need / surplus) * 100)}% of the current monthly surplus.`;

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    targetMonths: goal.targetMonths,
    savedSoFar: goal.savedSoFar,
    requiredMonthly: need,
    projectedValue: projected,
    shortfall,
    onTrack: need > 0 && need <= surplus,
    surplusSharePct: share,
    verdict,
  };
}

export function assessAllGoals(profile: Profile): {
  goals: GoalAssessment[];
  totalRequiredMonthly: number;
  surplus: number;
  feasible: boolean;
  note: string;
} {
  const cf = cashflow(profile.budget, profile.loans);
  const goals = profile.goals.map((g) =>
    assessGoal(g, cf.surplus, profile.expectedPortfolioReturnPct),
  );
  const totalRequired = round2(goals.reduce((s, g) => s + g.requiredMonthly, 0));
  const feasible = totalRequired <= cf.surplus;
  return {
    goals,
    totalRequiredMonthly: totalRequired,
    surplus: cf.surplus,
    feasible,
    note: feasible
      ? `All goals fit inside the ${round2(cf.surplus)}/mo surplus, using ${
          cf.surplus > 0 ? round2((totalRequired / cf.surplus) * 100) : 0
        }% of it.`
      : `Goals collectively need ${totalRequired}/mo against a ${cf.surplus}/mo surplus — a gap of ${round2(
          totalRequired - cf.surplus,
        )}/mo. Something has to give: timeline, target, or spending.`,
  };
}

/** Months of essential spending + EMIs covered by liquid cash. */
export function emergencyRunwayMonths(profile: Profile): number {
  const cf = cashflow(profile.budget, profile.loans);
  const burn = cf.essentialExpenses + cf.totalEmi;
  if (burn <= 0) return Infinity;
  return round2(profile.budget.cashReserve / burn);
}
