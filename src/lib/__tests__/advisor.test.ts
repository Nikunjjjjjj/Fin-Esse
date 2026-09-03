import { describe, expect, it } from "vitest";
import { demoProfile, emptyProfile } from "../../store/seed";
import { netPosition, prepayVsInvest, recommendations, riskExposure, stressTest } from "../advisor";
import { cashflow, emergencyRunwayMonths, requiredMonthly, futureValue } from "../budget";
import { allocation, portfolioValue, rebalancePlan, applyRebalance, simulateShock } from "../portfolio";
import type { Profile } from "../../types";

const p = demoProfile();

describe("prepayVsInvest", () => {
  it("prefers prepaying a loan that costs far more than the market returns", () => {
    const r = prepayVsInvest(p, 180_000, 60);
    const card = r.options.find((o) => o.loanId === "loan_card")!;
    expect(card.winner).toBe("prepay");
    expect(card.advantage).toBeGreaterThan(0);
  });

  it("ranks the 38% card above the 8.6% home loan for the same cash", () => {
    const r = prepayVsInvest(p, 300_000, 60);
    expect(r.best!.loanId).toBe("loan_card");
    const home = r.options.find((o) => o.loanId === "loan_home")!;
    expect(r.best!.advantage).toBeGreaterThan(home.advantage);
  });

  it("prefers investing when every loan is cheaper than expected returns", () => {
    const cheap: Profile = {
      ...p,
      expectedPortfolioReturnPct: 14,
      loans: [{ ...p.loans[0], annualRatePct: 5 }],
    };
    const r = prepayVsInvest(cheap, 500_000, 120);
    expect(r.best!.winner).toBe("invest");
  });

  it("treats both paths with identical cash outflow", () => {
    // With loan rate exactly equal to the investment rate the two paths must
    // land within rounding distance of each other.
    const neutral: Profile = {
      ...p,
      expectedPortfolioReturnPct: 9,
      loans: [{ ...p.loans[0], annualRatePct: 9 }],
    };
    const r = prepayVsInvest(neutral, 200_000, 60);
    expect(Math.abs(r.options[0].advantage)).toBeLessThan(200_000 * 0.01);
  });

  it("handles a profile with no loans", () => {
    const r = prepayVsInvest({ ...p, loans: [] }, 100_000, 60);
    expect(r.options).toHaveLength(0);
    expect(r.best).toBeNull();
    expect(r.headline).toContain("invested");
  });
});

describe("riskExposure", () => {
  it("scores the leveraged demo profile as non-trivial and cites a driver", () => {
    const r = riskExposure(p);
    expect(r.overallScore).toBeGreaterThan(0);
    expect(r.factors).toHaveLength(5);
    expect(r.summary).toMatch(/dominant pressure/);
  });

  it("rates a debt-free, cash-rich profile as resilient", () => {
    const safe: Profile = {
      ...emptyProfile(),
      budget: { monthlyIncome: 200_000, cashReserve: 5_000_000, expenses: [{ id: "e", name: "All in", amount: 60_000, essential: true }] },
      holdings: [{ id: "h", symbol: "D", name: "Debt fund", assetClass: "debt", units: 1000, price: 100 }],
    };
    expect(riskExposure(safe).band).toBe("resilient");
  });
});

describe("stressTest", () => {
  it("shows a job loss plus a crash breaking the demo profile", () => {
    const r = stressTest(p, { jobLossMonths: 9, marketShock: "equity_crash" });
    expect(r.netWorthAfter).toBeLessThan(r.netWorthBefore);
    expect(r.findings.length).toBeGreaterThanOrEqual(2);
    expect(r.breaks).toBe(true);
  });

  it("raises EMIs under a rate hike", () => {
    const r = stressTest(p, { rateHikeBps: 200 });
    expect(r.emiAfter).toBeGreaterThan(netPosition(p).monthlyEmi);
  });

  it("is a no-op with an empty scenario", () => {
    const r = stressTest(p, {});
    expect(r.netWorthChange).toBeCloseTo(0, 0);
    expect(r.label).toBe("no stress applied");
  });
});

describe("recommendations", () => {
  it("puts the 38% credit card first for the demo profile", () => {
    const recs = recommendations(p);
    expect(recs[0].id).toBe("kill_expensive_debt");
    expect(recs[0].title).toContain("Credit card");
    expect(recs[0].evidence.length).toBeGreaterThan(0);
  });

  it("always returns at least one item", () => {
    expect(recommendations(emptyProfile()).length).toBeGreaterThan(0);
  });
});

describe("portfolio", () => {
  it("allocation weights sum to 100", () => {
    const sum = allocation(p.holdings).reduce((s, a) => s + a.weightPct, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  it("a rebalance moves the portfolio to the target and preserves total value", () => {
    const plan = rebalancePlan(p.holdings, { equity: 50, debt: 30, gold: 15, crypto: 5 });
    const after = applyRebalance(p.holdings, plan);
    expect(portfolioValue(after)).toBeCloseTo(portfolioValue(p.holdings), -2);
    const equityAfter = allocation(after).find((a) => a.assetClass === "equity")!;
    expect(equityAfter.weightPct).toBeCloseTo(50, 0);
  });

  it("normalises targets that do not sum to 100", () => {
    const plan = rebalancePlan(p.holdings, { equity: 2, debt: 2 });
    const eq = plan.legs.find((l) => l.assetClass === "equity")!;
    expect(eq.targetPct).toBeCloseTo(50, 1);
  });

  it("a crash reduces value and reports per-holding damage", () => {
    const s = simulateShock(p.holdings, "equity_crash");
    expect(s.valueAfter).toBeLessThan(s.valueBefore);
    expect(s.byHolding).toHaveLength(p.holdings.length);
  });
});

describe("budget", () => {
  it("surplus equals income minus expenses minus EMIs", () => {
    const cf = cashflow(p.budget, p.loans);
    expect(cf.surplus).toBeCloseTo(cf.monthlyIncome - cf.totalExpenses - cf.totalEmi, 1);
  });

  it("requiredMonthly and futureValue are inverses", () => {
    const need = requiredMonthly(1_000_000, 100_000, 60, 10);
    expect(futureValue(100_000, need, 60, 10)).toBeCloseTo(1_000_000, -1);
  });

  it("reports emergency runway in months of essentials plus EMIs", () => {
    expect(emergencyRunwayMonths(p)).toBeGreaterThan(0);
    expect(emergencyRunwayMonths(p)).toBeLessThan(12);
  });
});

describe("real assets", () => {
  it("counts a self-occupied home in net worth", () => {
    const np = netPosition(p);
    expect(np.realAssetValue).toBe(9_500_000);
    expect(np.totalAssets).toBeCloseTo(np.portfolioValue + np.realAssetValue + np.cashReserve, 0);
  });

  it("excludes it from portfolio allocation and risk", () => {
    const slices = allocation(p.holdings);
    expect(slices.some((s) => s.assetClass === "real_estate")).toBe(false);
    expect(portfolioValue(p.holdings)).toBeLessThan(netPosition(p).totalAssets);
  });

  it("still marks property down in a broad crash", () => {
    const r = stressTest(p, { marketShock: "equity_crash" });
    expect(r.realAssetAfter).toBeLessThan(9_500_000);
    expect(r.findings.some((f) => f.includes("Property"))).toBe(true);
  });

  it("keeps a profile with no property consistent", () => {
    const r = stressTest({ ...p, realAssets: [] }, {});
    expect(r.netWorthChange).toBeCloseTo(0, 0);
  });
});
