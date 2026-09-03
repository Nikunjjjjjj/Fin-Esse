import { describe, expect, it } from "vitest";
import { decodeHandoff, encodeHandoff, sanitizeProfile } from "../handoff";
import { secondOpinion, verdictUnder } from "../stances";
import { demoProfile } from "../../store/seed";
import { netPosition } from "../advisor";

const p = demoProfile();

describe("handoff round trip", () => {
  it("survives encode then decode intact", async () => {
    const encoded = await encodeHandoff(p, "Nikunj", "Am I over-leveraged?");
    const packet = await decodeHandoff(encoded);
    expect(packet.from).toBe("Nikunj");
    expect(packet.note).toBe("Am I over-leveraged?");
    expect(packet.profile.loans).toHaveLength(p.loans.length);
    expect(netPosition(packet.profile).netWorth).toBeCloseTo(netPosition(p).netWorth, 0);
  });

  it("compresses to a URL-safe payload of workable size", async () => {
    const encoded = await encodeHandoff(p, "Nikunj", "");
    expect(encoded).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(encoded.length).toBeLessThan(4000);
  });

  it("rejects a payload from a different version", async () => {
    const encoded = await encodeHandoff(p, "a", "b");
    const packet = await decodeHandoff(encoded);
    expect(packet.v).toBe(1);
  });

  it("rejects garbage rather than throwing something unreadable", async () => {
    await expect(decodeHandoff("not-a-real-packet")).rejects.toThrow();
  });
});

describe("sanitizeProfile treats link content as untrusted", () => {
  it("coerces hostile types into a usable profile", () => {
    const s = sanitizeProfile({
      currency: 12345,
      loans: [{ name: 7, principal: "abc", annualRatePct: 1e30, termMonths: -5 }],
      holdings: [{ assetClass: "unicorns", units: NaN, price: Infinity }],
      budget: { monthlyIncome: "-999", expenses: "not an array" },
      goals: null,
    });
    expect(s.currency).toBe("INR");
    expect(s.loans[0].principal).toBe(0);
    expect(s.loans[0].annualRatePct).toBeLessThanOrEqual(200);
    expect(s.loans[0].termMonths).toBeGreaterThanOrEqual(1);
    expect(s.holdings[0].assetClass).toBe("equity");
    expect(s.holdings[0].units).toBe(0);
    expect(s.budget.monthlyIncome).toBe(0);
    expect(s.budget.expenses).toEqual([]);
    expect(s.goals).toEqual([]);
  });

  it("caps collection sizes so an oversized link cannot hang the app", () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ name: `L${i}`, principal: 1000 }));
    expect(sanitizeProfile({ loans: many }).loans.length).toBeLessThanOrEqual(40);
  });

  it("truncates long strings", () => {
    const s = sanitizeProfile({ loans: [{ name: "x".repeat(5000), principal: 1 }] });
    expect(s.loans[0].name.length).toBeLessThanOrEqual(90);
  });

  it("returns an empty profile for nonsense input", () => {
    expect(sanitizeProfile(null).loans).toEqual([]);
    expect(sanitizeProfile("hello").holdings).toEqual([]);
  });
});

describe("two-stance second opinion", () => {
  it("has both stances agree on a 38% credit card", () => {
    const o = secondOpinion({ ...p, budget: { ...p.budget, cashReserve: 5_000_000 } }, 150_000);
    expect(o.agree).toBe(true);
    expect(o.verdicts.every((v) => v.action === "prepay")).toBe(true);
  });

  it("splits the stances on debt priced between their assumptions", () => {
    // A single 10% loan sits above preservation's 8% bar and below growth's 13%.
    const split = {
      ...p,
      loans: [{ ...p.loans[0], annualRatePct: 10 }],
      budget: { ...p.budget, cashReserve: 5_000_000 },
    };
    const o = secondOpinion(split, 500_000);
    expect(o.agree).toBe(false);
    expect(o.crux).toBeTruthy();
  });

  it("finds the return rate at which the recommendation flips", () => {
    const split = {
      ...p,
      loans: [{ ...p.loans[0], annualRatePct: 10 }],
      budget: { ...p.budget, cashReserve: 5_000_000 },
    };
    const o = secondOpinion(split, 500_000);
    expect(o.swingReturnPct).toBeGreaterThan(5);
    expect(o.swingReturnPct).toBeLessThan(20);
  });

  it("makes both stances hold cash when runway is dangerously thin", () => {
    const thin = { ...p, budget: { ...p.budget, cashReserve: 10_000 } };
    const o = secondOpinion(thin, 100_000);
    expect(o.verdicts.every((v) => v.action === "build_runway")).toBe(true);
    expect(o.agree).toBe(true);
  });

  it("gives each stance its own assumptions", () => {
    const g = verdictUnder(p, "growth", 100_000);
    const c = verdictUnder(p, "preservation", 100_000);
    expect(g.stance.expectedReturnPct).toBeGreaterThan(c.stance.expectedReturnPct);
  });
});
