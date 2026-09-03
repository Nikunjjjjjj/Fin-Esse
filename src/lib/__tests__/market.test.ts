import { describe, expect, it } from "vitest";
import { applyMarketConditions, researchBrief } from "../market";
import { demoProfile, emptyProfile } from "../../store/seed";
import { portfolioValue } from "../portfolio";

const p = demoProfile("INR");

describe("researchBrief", () => {
  it("ranks what to research by how much it actually matters", () => {
    const b = researchBrief(p);
    const weights = b.exposures.filter((e) => e.weightPct > 0).map((e) => e.weightPct);
    expect(weights).toEqual([...weights].sort((a, x) => x - a));
    expect(b.exposures[0].assetClass).toBe("crypto"); // 44.6% of this portfolio
  });

  it("names the actual holdings behind each exposure", () => {
    const crypto = researchBrief(p).exposures.find((e) => e.assetClass === "crypto")!;
    expect(crypto.holdings).toContain("Bitcoin");
    expect(crypto.whatToFind.length).toBeGreaterThan(1);
  });

  it("tells the agent what NOT to waste search effort on", () => {
    expect(researchBrief(p).ignore).toContain("Cash");
  });

  it("includes property even though it carries no portfolio weight", () => {
    const b = researchBrief(p);
    expect(b.exposures.some((e) => e.label === "Property")).toBe(true);
  });

  it("says so plainly when there is nothing to research", () => {
    expect(researchBrief(emptyProfile()).exposures).toHaveLength(0);
  });
});

describe("applyMarketConditions", () => {
  it("moves only the asset classes it was told about", () => {
    const r = applyMarketConditions(p, [{ assetClass: "crypto", changePct: -40, note: "sell-off" }]);
    const btc = r.byHolding.find((h) => h.name === "Bitcoin")!;
    const gold = r.byHolding.find((h) => h.name === "Gold ETF")!;
    expect(btc.after).toBeCloseTo(btc.before * 0.6, 0);
    expect(gold.after).toBe(gold.before);
    expect(r.portfolioAfter).toBeLessThan(r.portfolioBefore);
  });

  it("reports the things a market move does not touch", () => {
    const r = applyMarketConditions(p, [{ assetClass: "equity", changePct: -25, note: "crash" }]);
    const untouched = r.aspects.filter((a) => a.verdict === "unchanged").map((a) => a.aspect);
    expect(untouched).toContain("Debt");
    expect(untouched).toContain("Monthly surplus");
    expect(untouched).toContain("Emergency runway");
  });

  it("scores a fall in net worth as worse and a rise as better", () => {
    const down = applyMarketConditions(p, [{ assetClass: "crypto", changePct: -50, note: "" }]);
    const up = applyMarketConditions(p, [{ assetClass: "crypto", changePct: 50, note: "" }]);
    expect(down.aspects.find((a) => a.aspect === "Net worth")!.verdict).toBe("worse");
    expect(up.aspects.find((a) => a.aspect === "Net worth")!.verdict).toBe("better");
  });

  it("notices when concentration falls because the big position dropped", () => {
    const r = applyMarketConditions(p, [{ assetClass: "crypto", changePct: -60, note: "" }]);
    // Bitcoin was 44.6%; halving it reduces concentration, so risk improves.
    expect(r.aspects.find((a) => a.aspect === "Portfolio risk")!.verdict).toBe("better");
  });

  it("marks property down when the move covers real estate", () => {
    const r = applyMarketConditions(p, [{ assetClass: "real_estate", changePct: -10, note: "" }]);
    const nw = r.aspects.find((a) => a.aspect === "Net worth")!;
    expect(nw.verdict).toBe("worse");
  });

  it("leaves the real profile untouched — it is a what-if", () => {
    const before = portfolioValue(p.holdings);
    applyMarketConditions(p, [{ assetClass: "equity", changePct: -30, note: "" }]);
    expect(portfolioValue(p.holdings)).toBe(before);
  });

  it("always hands the agent caveats to repeat", () => {
    const r = applyMarketConditions(p, [{ assetClass: "gold", changePct: 4, note: "" }]);
    expect(r.caveats.length).toBeGreaterThan(2);
    expect(r.caveats.join(" ")).toMatch(/not a forecast/i);
  });

  it("handles an empty condition list without pretending something moved", () => {
    const r = applyMarketConditions(p, []);
    expect(r.changeValue).toBe(0);
    expect(r.headline).toContain("nothing moved");
  });
});
