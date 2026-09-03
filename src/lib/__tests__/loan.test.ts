import { describe, expect, it } from "vitest";
import {
  balanceAfter,
  compareOffers,
  emiFor,
  interestToClear,
  monthsToClear,
  simulatePrepay,
  snapshot,
} from "../loan";
import type { Loan } from "../../types";

const loan: Loan = {
  id: "l1",
  name: "Test",
  kind: "home",
  principal: 1_000_000,
  annualRatePct: 10,
  termMonths: 120,
  monthsPaid: 0,
};

describe("EMI", () => {
  it("matches the standard reducing-balance formula", () => {
    expect(emiFor(1_000_000, 10, 120)).toBeCloseTo(13215.07, 1);
  });

  it("degrades to straight-line at 0%", () => {
    expect(emiFor(120_000, 0, 12)).toBe(10_000);
  });
});

describe("balanceAfter", () => {
  it("is the full principal before any payment", () => {
    expect(balanceAfter(1_000_000, 10, 120, 0)).toBeCloseTo(1_000_000, 0);
  });

  it("is zero once the term is served", () => {
    expect(balanceAfter(1_000_000, 10, 120, 120)).toBe(0);
  });

  it("decreases monotonically", () => {
    let prev = Infinity;
    for (let k = 0; k <= 120; k += 12) {
      const b = balanceAfter(1_000_000, 10, 120, k);
      expect(b).toBeLessThan(prev);
      prev = b;
    }
  });
});

describe("schedule walk", () => {
  it("recovers the closed-form total interest", () => {
    const emi = emiFor(1_000_000, 10, 120);
    expect(interestToClear(1_000_000, 10, emi)).toBeCloseTo(emi * 120 - 1_000_000, 0);
  });

  it("recovers the original tenure", () => {
    expect(monthsToClear(1_000_000, 10, emiFor(1_000_000, 10, 120))).toBe(120);
  });

  it("reports an unpayable EMI as never clearing", () => {
    expect(monthsToClear(1_000_000, 10, 100)).toBe(Infinity);
  });
});

describe("simulatePrepay", () => {
  it("shortens the tenure and saves interest", () => {
    const r = simulatePrepay(loan, 200_000);
    expect(r.balanceAfter).toBeCloseTo(800_000, 0);
    expect(r.monthsSaved).toBeGreaterThan(0);
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.monthsAfter).toBeLessThan(r.monthsBefore);
  });

  it("caps the lump sum at the outstanding balance", () => {
    const r = simulatePrepay(loan, 5_000_000);
    expect(r.lumpSum).toBeCloseTo(snapshot(loan).outstanding, 0);
    expect(r.balanceAfter).toBe(0);
    expect(r.note).toContain("exceeded");
  });

  it("saves more on a higher-rate loan for the same cash", () => {
    const cheap = { ...loan, annualRatePct: 8 };
    const dear = { ...loan, annualRatePct: 20 };
    expect(simulatePrepay(dear, 200_000).interestSaved).toBeGreaterThan(
      simulatePrepay(cheap, 200_000).interestSaved,
    );
  });

  it("accepts a recurring top-up with no lump sum", () => {
    const r = simulatePrepay(loan, 0, 5_000);
    expect(r.monthsSaved).toBeGreaterThan(0);
  });
});

describe("compareOffers", () => {
  it("ranks by total cost including fees", () => {
    const r = compareOffers([
      { label: "A", principal: 1_000_000, annualRatePct: 9, termMonths: 120 },
      { label: "B", principal: 1_000_000, annualRatePct: 10, termMonths: 120 },
      { label: "C", principal: 1_000_000, annualRatePct: 8.9, termMonths: 120, processingFee: 400_000 },
    ]);
    expect(r.best).toBe("A");
    expect(r.spread).toBeGreaterThan(0);
  });
});
