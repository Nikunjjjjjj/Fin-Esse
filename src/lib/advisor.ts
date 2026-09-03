import type { Loan, Profile } from "../types";
import { monthlyRate, snapshot, totalOutstanding } from "./loan";
import { round2 } from "./money";
import {
  ASSET_META,
  expectedReturnPct,
  portfolioValue,
  riskScore,
  simulateShock,
  volatilityPct,
  type ShockName,
} from "./portfolio";
import { cashflow, emergencyRunwayMonths } from "./budget";

/**
 * Walks a single loan and an investment pool forward month by month.
 *
 * Both the prepay and the invest path are run through this same function with
 * identical total cash outflow, so the comparison is apples-to-apples: once a
 * loan closes, the freed-up EMI is redirected into the investment pool in
 * whichever path it closes first. Without that, prepaying looks artificially
 * bad because the model would quietly throw the freed cashflow away.
 */
function walk(
  outstanding: number,
  annualRatePct: number,
  emi: number,
  months: number,
  investPool: number,
  investAnnualPct: number,
): { balance: number; pool: number; loanClearedAtMonth: number | null } {
  const rl = monthlyRate(annualRatePct);
  const ri = monthlyRate(investAnnualPct);
  let balance = Math.max(0, outstanding);
  let pool = investPool;
  let cleared: number | null = balance <= 0 ? 0 : null;

  for (let m = 1; m <= months; m += 1) {
    pool *= 1 + ri;
    if (balance > 0) {
      const interest = balance * rl;
      const payment = Math.min(emi, balance + interest);
      balance = balance + interest - payment;
      // Any part of the instalment not needed this month is still cash the
      // household has, so it flows into the pool rather than vanishing.
      pool += emi - payment;
      if (balance <= 0.5) {
        balance = 0;
        if (cleared === null) cleared = m;
      }
    } else {
      pool += emi;
    }
  }
  return { balance: round2(balance), pool: round2(pool), loanClearedAtMonth: cleared };
}

export interface PrepayVsInvestOption {
  loanId: string;
  loanName: string;
  annualRatePct: number;
  outstanding: number;
  /** Net worth at the horizon if the cash is used to prepay this loan. */
  netWorthIfPrepay: number;
  /** Net worth at the horizon if the cash is invested instead. */
  netWorthIfInvest: number;
  advantage: number;
  winner: "prepay" | "invest";
  loanClearedAtMonth: number | null;
  rationale: string;
}

export interface PrepayVsInvestResult {
  amount: number;
  horizonMonths: number;
  expectedReturnPct: number;
  options: PrepayVsInvestOption[];
  best: PrepayVsInvestOption | null;
  headline: string;
  caveats: string[];
}

/**
 * The core cross-domain question: deploy spare cash against debt, or into the
 * portfolio? Reads loans, portfolio and budget together.
 */
export function prepayVsInvest(
  profile: Profile,
  amount: number,
  horizonMonths = 60,
): PrepayVsInvestResult {
  const investPct = profile.expectedPortfolioReturnPct;
  const active = profile.loans.filter((l) => snapshot(l).outstanding > 0);

  const options: PrepayVsInvestOption[] = active.map((loan) => {
    const s = snapshot(loan);
    const applied = Math.min(amount, s.outstanding);
    const leftover = amount - applied;

    const prepayPath = walk(
      s.outstanding - applied,
      loan.annualRatePct,
      s.emi,
      horizonMonths,
      leftover,
      investPct,
    );
    const investPath = walk(
      s.outstanding,
      loan.annualRatePct,
      s.emi,
      horizonMonths,
      amount,
      investPct,
    );

    const netPrepay = round2(prepayPath.pool - prepayPath.balance);
    const netInvest = round2(investPath.pool - investPath.balance);
    const advantage = round2(netPrepay - netInvest);
    const winner = advantage >= 0 ? "prepay" : "invest";

    return {
      loanId: loan.id,
      loanName: loan.name,
      annualRatePct: loan.annualRatePct,
      outstanding: s.outstanding,
      netWorthIfPrepay: netPrepay,
      netWorthIfInvest: netInvest,
      advantage,
      winner,
      loanClearedAtMonth: prepayPath.loanClearedAtMonth,
      rationale:
        winner === "prepay"
          ? `Retiring debt at ${loan.annualRatePct}% beats an assumed ${investPct}% market return over ${horizonMonths} months, and the saving is certain rather than expected.`
          : `At ${loan.annualRatePct}% this debt is cheaper than the ${investPct}% the portfolio is assumed to earn, so the cash compounds harder invested.`,
    };
  });

  options.sort((a, b) => b.advantage - a.advantage);
  const best = options[0] ?? null;

  let headline: string;
  if (!best) {
    headline = `No active loans, so the full ${amount} is best invested at an assumed ${investPct}%.`;
  } else if (best.winner === "prepay") {
    headline = `Put the ${amount} into "${best.loanName}" (${best.annualRatePct}%). Over ${horizonMonths} months that leaves you about ${best.advantage} better off than investing the same cash.`;
  } else {
    headline = `Invest the ${amount} rather than prepaying. Even your most expensive active loan (${best.loanName} at ${best.annualRatePct}%) is cheaper than the assumed ${investPct}% return, by about ${Math.abs(best.advantage)} over ${horizonMonths} months.`;
  }

  return {
    amount,
    horizonMonths,
    expectedReturnPct: investPct,
    options,
    best,
    headline,
    caveats: [
      `Assumes a steady ${investPct}% nominal annual portfolio return; real returns are volatile and can be negative over this horizon.`,
      "Prepayment savings are contractually certain; investment returns are not. A rational plan usually accepts a lower certain return over a higher uncertain one.",
      "Ignores tax treatment, prepayment penalties, and the liquidity you give up by locking cash into a loan.",
      "Assumes the freed-up EMI is actually invested once a loan closes.",
    ],
  };
}

export interface NetPosition {
  portfolioValue: number;
  cashReserve: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  debtToAssetPct: number;
  monthlyEmi: number;
  monthlySurplus: number;
}

export function netPosition(profile: Profile): NetPosition {
  const pv = portfolioValue(profile.holdings);
  const cash = profile.budget.cashReserve;
  const debt = totalOutstanding(profile.loans);
  const assets = round2(pv + cash);
  const cf = cashflow(profile.budget, profile.loans);
  return {
    portfolioValue: pv,
    cashReserve: cash,
    totalAssets: assets,
    totalDebt: debt,
    netWorth: round2(assets - debt),
    debtToAssetPct: assets > 0 ? round2((debt / assets) * 100) : debt > 0 ? Infinity : 0,
    monthlyEmi: cf.totalEmi,
    monthlySurplus: cf.surplus,
  };
}

export interface RiskFactor {
  name: string;
  value: string;
  score: number;
  weight: number;
  verdict: "healthy" | "watch" | "stretched";
  comment: string;
}

export interface RiskAssessment {
  overallScore: number;
  band: "resilient" | "adequate" | "fragile";
  factors: RiskFactor[];
  summary: string;
}

function band(score: number): RiskAssessment["band"] {
  if (score < 35) return "resilient";
  if (score < 65) return "adequate";
  return "fragile";
}

function verdictFor(score: number): RiskFactor["verdict"] {
  if (score < 35) return "healthy";
  if (score < 65) return "watch";
  return "stretched";
}

/** Combines debt burden, portfolio risk and liquidity into one exposure read. */
export function riskExposure(profile: Profile): RiskAssessment {
  const cf = cashflow(profile.budget, profile.loans);
  const np = netPosition(profile);
  const runway = emergencyRunwayMonths(profile);
  const pRisk = riskScore(profile.holdings);

  // Each sub-score is 0 (safe) to 100 (dangerous).
  const emiScore = Math.min(100, (cf.emiToIncomePct / 45) * 100);
  const leverageScore = Number.isFinite(np.debtToAssetPct)
    ? Math.min(100, (np.debtToAssetPct / 120) * 100)
    : 100;
  const runwayScore = Number.isFinite(runway) ? Math.min(100, Math.max(0, (6 - runway) / 6) * 100) : 0;
  const savingsScore = Math.min(100, Math.max(0, (20 - cf.savingsRatePct) / 20) * 100);

  const factors: RiskFactor[] = [
    {
      name: "Debt service burden",
      value: `${cf.emiToIncomePct}% of income to EMIs`,
      score: round2(emiScore),
      weight: 0.3,
      verdict: verdictFor(emiScore),
      comment:
        cf.emiToIncomePct > 40
          ? "Above the ~40% level most lenders treat as the outer limit of comfortable serviceability."
          : "Within the range most lenders consider serviceable.",
    },
    {
      name: "Leverage",
      value: Number.isFinite(np.debtToAssetPct) ? `${np.debtToAssetPct}% debt-to-assets` : "Debt with no assets",
      score: round2(leverageScore),
      weight: 0.25,
      verdict: verdictFor(leverageScore),
      comment:
        np.debtToAssetPct > 100
          ? "Debt exceeds liquid and invested assets — net worth is negative on this measure."
          : "Assets cover outstanding debt.",
    },
    {
      name: "Emergency runway",
      value: Number.isFinite(runway) ? `${runway} months of essentials + EMIs` : "No committed outgo",
      score: round2(runwayScore),
      weight: 0.25,
      verdict: verdictFor(runwayScore),
      comment:
        runway < 6
          ? "Below the 6-month buffer normally recommended when carrying debt."
          : "A comfortable buffer against income interruption.",
    },
    {
      name: "Portfolio risk",
      value: `risk score ${pRisk}/100, ${volatilityPct(profile.holdings)}% volatility`,
      score: pRisk,
      weight: 0.1,
      verdict: verdictFor(pRisk),
      comment:
        pRisk > 65
          ? "Concentrated or high-volatility mix; drawdowns will be severe."
          : "Reasonably diversified across asset classes.",
    },
    {
      name: "Savings rate",
      value: `${cf.savingsRatePct}% of income`,
      score: round2(savingsScore),
      weight: 0.1,
      verdict: verdictFor(savingsScore),
      comment:
        cf.savingsRatePct < 10
          ? "Little free cashflow, so any shock has to be absorbed by borrowing or selling."
          : "Healthy free cashflow each month.",
    },
  ];

  const overall = round2(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const worst = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  return {
    overallScore: overall,
    band: band(overall),
    factors,
    summary: `Overall exposure ${overall}/100 (${band(overall)}). The dominant pressure is ${worst.name.toLowerCase()} — ${worst.value}.`,
  };
}

export interface StressScenario {
  jobLossMonths?: number;
  marketShock?: ShockName;
  rateHikeBps?: number;
}

export interface StressResult {
  scenario: StressScenario;
  label: string;
  netWorthBefore: number;
  netWorthAfter: number;
  netWorthChange: number;
  portfolioAfter: number;
  cashAfter: number;
  monthsSurvivable: number;
  emiAfter: number;
  breaks: boolean;
  findings: string[];
}

/** Stress-tests the whole picture at once: income, markets and rates together. */
export function stressTest(profile: Profile, scenario: StressScenario): StressResult {
  const cf = cashflow(profile.budget, profile.loans);
  const before = netPosition(profile);
  const findings: string[] = [];

  let portfolioAfter = before.portfolioValue;
  if (scenario.marketShock) {
    const s = simulateShock(profile.holdings, scenario.marketShock);
    portfolioAfter = s.valueAfter;
    findings.push(
      `${s.label} takes the portfolio from ${s.valueBefore} to ${s.valueAfter} (${s.changePct}%).`,
    );
  }

  let emiAfter = cf.totalEmi;
  if (scenario.rateHikeBps) {
    const bumped = profile.loans.map((l) => ({
      ...l,
      annualRatePct: l.annualRatePct + scenario.rateHikeBps! / 100,
    }));
    emiAfter = round2(
      bumped.reduce((s, l) => (l.monthsPaid < l.termMonths ? s + snapshot(l).emi : s), 0),
    );
    findings.push(
      `A ${scenario.rateHikeBps}bps rate rise lifts total EMIs from ${cf.totalEmi} to ${emiAfter} (+${round2(emiAfter - cf.totalEmi)}/mo).`,
    );
  }

  const burn = cf.essentialExpenses + emiAfter;
  let cashAfter = profile.budget.cashReserve;
  const jobLoss = scenario.jobLossMonths ?? 0;
  if (jobLoss > 0) {
    cashAfter = round2(profile.budget.cashReserve - burn * jobLoss);
    findings.push(
      `${jobLoss} months without income burns ${round2(burn * jobLoss)} of the ${profile.budget.cashReserve} cash reserve.`,
    );
  }

  const monthsSurvivable = burn > 0 ? round2(profile.budget.cashReserve / burn) : Infinity;
  const forcedSale = cashAfter < 0;
  if (forcedSale) {
    findings.push(
      `Cash runs out after ${monthsSurvivable} months — covering the remainder means selling ${round2(-cashAfter)} of a portfolio that is simultaneously down.`,
    );
  }

  const assetsAfter = round2(portfolioAfter + Math.max(0, cashAfter));
  const netAfter = round2(assetsAfter - before.totalDebt + Math.min(0, cashAfter));

  return {
    scenario,
    label: [
      jobLoss ? `${jobLoss}mo income loss` : null,
      scenario.marketShock ? scenario.marketShock.replace(/_/g, " ") : null,
      scenario.rateHikeBps ? `+${scenario.rateHikeBps}bps` : null,
    ]
      .filter(Boolean)
      .join(" + ") || "no stress applied",
    netWorthBefore: before.netWorth,
    netWorthAfter: netAfter,
    netWorthChange: round2(netAfter - before.netWorth),
    portfolioAfter,
    cashAfter,
    monthsSurvivable,
    emiAfter,
    breaks: forcedSale,
    findings,
  };
}

export interface Recommendation {
  id: string;
  priority: number;
  title: string;
  action: string;
  why: string;
  /** Which tool groups produced the evidence, so the agent can cite its work. */
  evidence: string[];
  impact: string;
}

/** Prioritised, evidence-linked recommendations synthesised across all domains. */
export function recommendations(profile: Profile): Recommendation[] {
  const cf = cashflow(profile.budget, profile.loans);
  const risk = riskExposure(profile);
  const runway = emergencyRunwayMonths(profile);
  const out: Recommendation[] = [];

  const expensive = [...profile.loans]
    .filter((l) => snapshot(l).outstanding > 0)
    .sort((a, b) => b.annualRatePct - a.annualRatePct)[0] as Loan | undefined;

  if (expensive && expensive.annualRatePct > profile.expectedPortfolioReturnPct + 3) {
    const s = snapshot(expensive);
    out.push({
      id: "kill_expensive_debt",
      priority: 1,
      title: `Clear "${expensive.name}" before anything else`,
      action: `Direct surplus cash at the ${expensive.annualRatePct}% balance of ${s.outstanding}.`,
      why: `At ${expensive.annualRatePct}% this debt costs far more than the ${profile.expectedPortfolioReturnPct}% the portfolio is assumed to earn. Every rupee against it is a guaranteed ${expensive.annualRatePct}% return.`,
      evidence: ["loan_list", "advisor_prepay_vs_invest"],
      impact: `Removes ${s.interestRemaining} of scheduled interest and ${round2(s.emi)}/mo of committed outflow.`,
    });
  }

  if (Number.isFinite(runway) && runway < 6) {
    out.push({
      id: "build_runway",
      priority: expensive && expensive.annualRatePct > 25 ? 2 : 1,
      title: "Rebuild the emergency buffer to six months",
      action: `Hold ${round2((6 - runway) * (cf.essentialExpenses + cf.totalEmi))} more in liquid cash.`,
      why: `Only ${runway} months of essentials and EMIs are covered. With ${cf.emiToIncomePct}% of income already committed to debt service, a job gap forces selling investments at the worst moment.`,
      evidence: ["budget_cashflow", "loan_list", "advisor_stress_test"],
      impact: "Converts a forced-sale scenario into a survivable one.",
    });
  }

  if (cf.emiToIncomePct > 40) {
    out.push({
      id: "reduce_emi_burden",
      priority: 2,
      title: "Bring debt service below 40% of income",
      action: "Refinance the longest-dated loan or prepay to shorten tenure.",
      why: `${cf.emiToIncomePct}% of income currently goes to EMIs, above the level lenders treat as comfortably serviceable.`,
      evidence: ["budget_cashflow", "loan_list"],
      impact: "Restores borrowing headroom and cashflow flexibility.",
    });
  }

  const pRisk = riskScore(profile.holdings);
  if (pRisk > 60) {
    const alloc = profile.holdings.length
      ? [...profile.holdings].sort((a, b) => b.units * b.price - a.units * a.price)[0]
      : null;
    out.push({
      id: "derisk_portfolio",
      priority: 3,
      title: "Trim concentration in the portfolio",
      action: alloc
        ? `"${alloc.name}" is the largest single position; consider capping it and rotating into debt.`
        : "Diversify across asset classes.",
      why: `Portfolio risk score is ${pRisk}/100 with ${volatilityPct(profile.holdings)}% blended volatility. Carrying that alongside ${cf.emiToIncomePct}% debt service stacks two risks on the same balance sheet.`,
      evidence: ["portfolio_allocation", "advisor_risk_exposure"],
      impact: "Reduces the drawdown that would coincide with an income shock.",
    });
  }

  if (cf.surplus > 0 && cf.savingsRatePct < 15) {
    out.push({
      id: "raise_savings",
      priority: 4,
      title: "Lift the savings rate above 15%",
      action: `Discretionary spending is ${cf.discretionaryExpenses}/mo; redirecting a third of it adds ${round2(cf.discretionaryExpenses / 3)}/mo.`,
      why: `Current savings rate is ${cf.savingsRatePct}%, which leaves little room to fund goals and absorb shocks simultaneously.`,
      evidence: ["budget_cashflow", "budget_goal_feasibility"],
      impact: "Directly increases the cash available for both debt and goals.",
    });
  }

  if (!out.length) {
    out.push({
      id: "steady",
      priority: 1,
      title: "The plan is on track",
      action: "Keep contributions steady and revisit after any income or rate change.",
      why: `Exposure score is ${risk.overallScore}/100 (${risk.band}) with no factor in the stretched band.`,
      evidence: ["advisor_risk_exposure"],
      impact: "No corrective action indicated.",
    });
  }

  return out.sort((a, b) => a.priority - b.priority).map((r, i) => ({ ...r, priority: i + 1 }));
}

export function assumptionSheet(profile: Profile) {
  return {
    expectedPortfolioReturnPct: profile.expectedPortfolioReturnPct,
    portfolioImpliedReturnPct: expectedReturnPct(profile.holdings),
    assetClassAssumptions: ASSET_META,
    note: "All figures are user-entered or simulated. This is an educational planning tool, not licensed financial advice.",
  };
}
