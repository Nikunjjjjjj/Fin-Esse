import type { Goal, Holding, Loan, Profile } from "../types";
import { netPosition, riskExposure } from "./advisor";
import { cashflow, emergencyRunwayMonths } from "./budget";
import { snapshot } from "./loan";
import { money, pct, round2 } from "./money";
import { holdingValue, portfolioValue, riskScore } from "./portfolio";

/**
 * Comparing a what-if branch against the position it forked from.
 *
 * The branch is only worth having if you can see what it changed, so this
 * produces a structured diff rather than two independent renderings: every
 * figure carries its before, its after, and whether the movement is an
 * improvement. "Better" is domain knowledge, not arithmetic -- debt falling is
 * good, exposure falling is good, net worth falling is not -- so it is stated
 * per field rather than inferred from the sign.
 */

export type Direction = "up" | "down" | "flat";

export interface FieldDelta {
  label: string;
  before: string;
  after: string;
  direction: Direction;
  /** True when the movement helps the household, false when it hurts. */
  better: boolean | null;
  /** Signed raw change, for sorting and for callers that want their own format. */
  raw: number;
}

export type EntityStatus = "added" | "removed" | "changed" | "unchanged";

export interface EntityDiff {
  id: string;
  name: string;
  status: EntityStatus;
  deltas: FieldDelta[];
}

export interface ProfileDiff {
  /** The figures worth putting side by side at the top of the page. */
  headline: FieldDelta[];
  loans: EntityDiff[];
  holdings: EntityDiff[];
  goals: EntityDiff[];
  budget: FieldDelta[];
  changeCount: number;
  summary: string;
}

function dir(before: number, after: number): Direction {
  if (Math.abs(after - before) < 0.005) return "flat";
  return after > before ? "up" : "down";
}

/** `higherIsBetter` encodes the domain meaning; flat movements score null. */
function field(
  label: string,
  before: number,
  after: number,
  fmt: (n: number) => string,
  higherIsBetter: boolean | null = true,
): FieldDelta {
  const d = dir(before, after);
  return {
    label,
    before: fmt(before),
    after: fmt(after),
    direction: d,
    better: d === "flat" || higherIsBetter === null ? null : (d === "up") === higherIsBetter,
    raw: round2(after - before),
  };
}

const m = (n: number) => money(n);
const p1 = (n: number) => pct(n);
const mo = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)} mo` : "∞");
const sc = (n: number) => `${Math.round(n)}/100`;

function loanFields(l: Loan): FieldDelta[] {
  const s = snapshot(l);
  return [
    field("Outstanding", s.outstanding, s.outstanding, m, false),
    field("EMI", s.emi, s.emi, m, false),
  ];
}

function diffLoans(a: Loan[], b: Loan[]): EntityDiff[] {
  const byId = new Map(a.map((l) => [l.id, l]));
  const out: EntityDiff[] = [];

  for (const after of b) {
    const before = byId.get(after.id);
    if (!before) {
      out.push({ id: after.id, name: after.name, status: "added", deltas: loanFields(after) });
      continue;
    }
    byId.delete(after.id);
    const sb = snapshot(before);
    const sa = snapshot(after);
    const deltas = [
      field("Outstanding", sb.outstanding, sa.outstanding, m, false),
      field("EMI", sb.emi, sa.emi, m, false),
      field("Rate", before.annualRatePct, after.annualRatePct, p1, false),
      field("Months left", sb.monthsRemaining, sa.monthsRemaining, (n) => `${Math.round(n)}`, false),
      field("Interest to come", sb.interestRemaining, sa.interestRemaining, m, false),
    ].filter((d) => d.direction !== "flat");
    out.push({
      id: after.id,
      name: after.name,
      status: deltas.length ? "changed" : "unchanged",
      deltas,
    });
  }

  for (const gone of byId.values()) {
    out.push({ id: gone.id, name: gone.name, status: "removed", deltas: loanFields(gone) });
  }
  return out;
}

function diffHoldings(a: Holding[], b: Holding[]): EntityDiff[] {
  const byId = new Map(a.map((h) => [h.id, h]));
  const out: EntityDiff[] = [];

  for (const after of b) {
    const before = byId.get(after.id);
    if (!before) {
      out.push({
        id: after.id,
        name: `${after.symbol} — ${after.name}`,
        status: "added",
        deltas: [field("Value", 0, holdingValue(after), m)],
      });
      continue;
    }
    byId.delete(after.id);
    const deltas = [
      field("Value", holdingValue(before), holdingValue(after), m),
      field("Units", before.units, after.units, (n) => `${n}`),
      field("Price", before.price, after.price, m),
    ].filter((d) => d.direction !== "flat");
    out.push({
      id: after.id,
      name: `${after.symbol} — ${after.name}`,
      status: deltas.length ? "changed" : "unchanged",
      deltas,
    });
  }

  for (const gone of byId.values()) {
    out.push({
      id: gone.id,
      name: `${gone.symbol} — ${gone.name}`,
      status: "removed",
      deltas: [field("Value", holdingValue(gone), 0, m)],
    });
  }
  return out;
}

function diffGoals(a: Goal[], b: Goal[]): EntityDiff[] {
  const byId = new Map(a.map((g) => [g.id, g]));
  const out: EntityDiff[] = [];
  for (const after of b) {
    const before = byId.get(after.id);
    if (!before) {
      out.push({
        id: after.id,
        name: after.name,
        status: "added",
        deltas: [field("Target", 0, after.targetAmount, m)],
      });
      continue;
    }
    byId.delete(after.id);
    const deltas = [
      field("Target", before.targetAmount, after.targetAmount, m, false),
      field("Saved", before.savedSoFar, after.savedSoFar, m),
      field("Months", before.targetMonths, after.targetMonths, (n) => `${Math.round(n)}`, null),
    ].filter((d) => d.direction !== "flat");
    out.push({
      id: after.id,
      name: after.name,
      status: deltas.length ? "changed" : "unchanged",
      deltas,
    });
  }
  for (const gone of byId.values()) {
    out.push({
      id: gone.id,
      name: gone.name,
      status: "removed",
      deltas: [field("Target", gone.targetAmount, 0, m)],
    });
  }
  return out;
}

export function diffProfiles(baseline: Profile, branch: Profile): ProfileDiff {
  const npA = netPosition(baseline);
  const npB = netPosition(branch);
  const cfA = cashflow(baseline.budget, baseline.loans);
  const cfB = cashflow(branch.budget, branch.loans);

  const headline: FieldDelta[] = [
    field("Net worth", npA.netWorth, npB.netWorth, m),
    field("Total debt", npA.totalDebt, npB.totalDebt, m, false),
    field("Monthly surplus", cfA.surplus, cfB.surplus, m),
    field("Emergency runway", emergencyRunwayMonths(baseline), emergencyRunwayMonths(branch), mo),
    field("Debt service", cfA.emiToIncomePct, cfB.emiToIncomePct, p1, false),
    field("Exposure", riskExposure(baseline).overallScore, riskExposure(branch).overallScore, sc, false),
    field("Portfolio risk", riskScore(baseline.holdings), riskScore(branch.holdings), sc, false),
    field("Portfolio value", portfolioValue(baseline.holdings), portfolioValue(branch.holdings), m),
  ];

  const budget: FieldDelta[] = [
    field("Monthly income", baseline.budget.monthlyIncome, branch.budget.monthlyIncome, m),
    field("Cash reserve", baseline.budget.cashReserve, branch.budget.cashReserve, m),
    field("Total expenses", cfA.totalExpenses, cfB.totalExpenses, m, false),
    field("Total EMIs", cfA.totalEmi, cfB.totalEmi, m, false),
  ].filter((d) => d.direction !== "flat");

  const loans = diffLoans(baseline.loans, branch.loans);
  const holdings = diffHoldings(baseline.holdings, branch.holdings);
  const goals = diffGoals(baseline.goals, branch.goals);

  const moved = headline.filter((d) => d.direction !== "flat");
  const changeCount =
    [...loans, ...holdings, ...goals].filter((e) => e.status !== "unchanged").length + budget.length;

  const netWorth = headline[0];
  let summary: string;
  if (changeCount === 0 && !moved.length) {
    summary = "Nothing has changed in this branch yet.";
  } else {
    const better = moved.filter((d) => d.better === true).length;
    const worse = moved.filter((d) => d.better === false).length;
    summary =
      `${changeCount} change${changeCount === 1 ? "" : "s"} so far. ` +
      `Net worth ${netWorth.before} → ${netWorth.after}. ` +
      `${better} measure${better === 1 ? "" : "s"} improved, ${worse} got worse.`;
  }

  return { headline, loans, holdings, goals, budget, changeCount, summary };
}
