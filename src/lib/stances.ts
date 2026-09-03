import type { Profile } from "../types";
import { prepayVsInvest, riskExposure } from "./advisor";
import { emergencyRunwayMonths } from "./budget";
import { money, round2 } from "./money";

/**
 * Two defensible advisors, disagreeing on purpose.
 *
 * Most financial "advice" disagreements are not disagreements about
 * arithmetic; they are disagreements about assumptions. A growth-oriented
 * advisor assumes equities compound at 13% and treats cheap debt as leverage.
 * A capital-preservation advisor assumes 7%, and prices the certainty of
 * retiring debt above the expectation of beating it.
 *
 * Running the identical engine under both assumption sets makes that
 * disagreement reproducible and inspectable rather than rhetorical, and lets
 * an agent argue both sides honestly -- then show the user exactly which
 * assumption the recommendation actually turns on.
 */

export type StanceId = "growth" | "preservation";

export interface Stance {
  id: StanceId;
  label: string;
  creed: string;
  expectedReturnPct: number;
  /** Minimum months of runway this stance insists on before deploying cash. */
  runwayFloorMonths: number;
  /** Rate above which this stance treats debt as urgent rather than leverage. */
  urgentDebtRatePct: number;
}

export const STANCES: Record<StanceId, Stance> = {
  growth: {
    id: "growth",
    label: "Growth",
    creed:
      "Time in the market beats certainty. Cheap debt is leverage, not an emergency; the real risk is under-investing for thirty years.",
    expectedReturnPct: 13,
    runwayFloorMonths: 3,
    urgentDebtRatePct: 13,
  },
  preservation: {
    id: "preservation",
    label: "Capital preservation",
    creed:
      "A guaranteed return beats an expected one. Debt repayment is risk-free alpha, and a household that cannot absorb a shock has no business chasing returns.",
    expectedReturnPct: 7,
    runwayFloorMonths: 6,
    urgentDebtRatePct: 8,
  },
};

export interface StanceVerdict {
  stance: Stance;
  action: "build_runway" | "prepay" | "invest";
  headline: string;
  reasoning: string;
  targetLoanId: string | null;
  targetLoanName: string | null;
  advantage: number;
}

export function verdictUnder(profile: Profile, stanceId: StanceId, amount: number, horizonMonths = 60): StanceVerdict {
  const stance = STANCES[stanceId];
  const shaded: Profile = { ...profile, expectedPortfolioReturnPct: stance.expectedReturnPct };
  const runway = emergencyRunwayMonths(profile);
  const analysis = prepayVsInvest(shaded, amount, horizonMonths);
  const best = analysis.best;

  if (Number.isFinite(runway) && runway < stance.runwayFloorMonths) {
    return {
      stance,
      action: "build_runway",
      headline: `Hold the ${money(amount)} as cash.`,
      reasoning: `Runway is ${runway.toFixed(1)} months against a ${stance.runwayFloorMonths}-month floor. ${stance.creed}`,
      targetLoanId: null,
      targetLoanName: null,
      advantage: 0,
    };
  }

  if (best && best.annualRatePct >= stance.urgentDebtRatePct && best.winner === "prepay") {
    return {
      stance,
      action: "prepay",
      headline: `Put the ${money(amount)} into "${best.loanName}".`,
      reasoning: `At ${best.annualRatePct}% this debt clears the ${stance.urgentDebtRatePct}% bar where this stance stops treating borrowing as leverage. Assuming ${stance.expectedReturnPct}% returns, prepaying wins by ${money(Math.abs(best.advantage))} over ${horizonMonths} months.`,
      targetLoanId: best.loanId,
      targetLoanName: best.loanName,
      advantage: best.advantage,
    };
  }

  return {
    stance,
    action: "invest",
    headline: `Invest the ${money(amount)}.`,
    reasoning: best
      ? `The most expensive active debt is ${best.loanName} at ${best.annualRatePct}%, below this stance's ${stance.urgentDebtRatePct}% urgency bar. Assuming ${stance.expectedReturnPct}% returns, investing wins by ${money(Math.abs(best.advantage))} over ${horizonMonths} months.`
      : `There is no active debt, so the assumed ${stance.expectedReturnPct}% return applies to the whole amount.`,
    targetLoanId: null,
    targetLoanName: null,
    advantage: best ? -best.advantage : 0,
  };
}

export interface SecondOpinion {
  amount: number;
  horizonMonths: number;
  verdicts: StanceVerdict[];
  agree: boolean;
  /** The single assumption the disagreement actually turns on. */
  crux: string;
  swingReturnPct: number | null;
  synthesis: string;
}

/** Finds the expected return at which the recommendation flips. */
function findSwingRate(profile: Profile, amount: number, horizonMonths: number): number | null {
  let lo = 0;
  let hi = 30;
  const actionAt = (r: number) => {
    const a = prepayVsInvest({ ...profile, expectedPortfolioReturnPct: r }, amount, horizonMonths);
    return a.best?.winner ?? "invest";
  };
  if (actionAt(lo) === actionAt(hi)) return null;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (actionAt(mid) === actionAt(lo)) lo = mid;
    else hi = mid;
  }
  return round2((lo + hi) / 2);
}

export function secondOpinion(profile: Profile, amount: number, horizonMonths = 60): SecondOpinion {
  const verdicts: StanceVerdict[] = [
    verdictUnder(profile, "growth", amount, horizonMonths),
    verdictUnder(profile, "preservation", amount, horizonMonths),
  ];
  const agree = verdicts[0].action === verdicts[1].action;
  const swing = findSwingRate(profile, amount, horizonMonths);
  const risk = riskExposure(profile);
  const runway = emergencyRunwayMonths(profile);

  let crux: string;
  if (agree) {
    crux = `Both stances land on the same action, which is the strongest signal you can get here: the answer does not depend on which assumptions you accept.`;
  } else if (verdicts.some((v) => v.action === "build_runway")) {
    crux = `The disagreement is about liquidity, not returns. Runway is ${Number.isFinite(runway) ? runway.toFixed(1) : "unlimited"} months; one stance requires ${STANCES.preservation.runwayFloorMonths} before deploying anything, the other accepts ${STANCES.growth.runwayFloorMonths}.`;
  } else if (swing !== null) {
    crux = `The disagreement turns on one number: the assumed long-run return. Below about ${swing}% prepaying wins; above it, investing does. Everything else is agreement.`;
  } else {
    crux = `The stances differ on how urgently debt should be retired, not on the arithmetic.`;
  }

  const synthesis = agree
    ? `${verdicts[0].headline} Both a growth and a capital-preservation advisor reach this independently, so the decision does not hinge on whose assumptions you prefer.`
    : `There is no single right answer here. Given an overall exposure score of ${risk.overallScore}/100 (${risk.band}), the preservation case is ${risk.band === "fragile" ? "the stronger of the two" : risk.band === "adequate" ? "reasonable but not forced" : "the more conservative of two defensible choices"}. Pick the stance whose assumption about returns you actually believe, and the action follows from it.`;

  return { amount, horizonMonths, verdicts, agree, crux, swingReturnPct: swing, synthesis };
}
