import { beforeEach, describe, expect, it } from "vitest";
import { diffProfiles } from "../diff";
import { demoProfile } from "../../store/seed";
import {
  enterScenario, exitScenario, getState, loadDemoProfile,
  setWorkspace, updateProfile, viewedProfile,
} from "../../store/store";
import type { Profile } from "../../types";

const base = () => demoProfile("INR");

describe("diffProfiles", () => {
  it("reports no change against itself", () => {
    const d = diffProfiles(base(), base());
    expect(d.changeCount).toBe(0);
    expect(d.headline.every((f) => f.direction === "flat")).toBe(true);
    expect(d.summary).toContain("Nothing has changed");
  });

  it("knows that debt falling is an improvement and net worth falling is not", () => {
    const p = base();
    const cleared: Profile = { ...p, loans: p.loans.filter((l) => l.id !== "loan_card") };
    const d = diffProfiles(p, cleared);

    const debt = d.headline.find((f) => f.label === "Total debt")!;
    expect(debt.direction).toBe("down");
    expect(debt.better).toBe(true);

    const worth = d.headline.find((f) => f.label === "Net worth")!;
    expect(worth.direction).toBe("up");
    expect(worth.better).toBe(true);
  });

  it("marks a removed loan and does not list it as changed", () => {
    const p = base();
    const cleared: Profile = { ...p, loans: p.loans.filter((l) => l.id !== "loan_card") };
    const d = diffProfiles(p, cleared);
    const card = d.loans.find((l) => l.id === "loan_card")!;
    expect(card.status).toBe("removed");
    expect(d.loans.filter((l) => l.status === "unchanged")).toHaveLength(2);
  });

  it("marks an added holding", () => {
    const p = base();
    const added: Profile = {
      ...p,
      holdings: [...p.holdings, { id: "h_new", symbol: "NEW", name: "New fund", assetClass: "equity", units: 10, price: 100 }],
    };
    const d = diffProfiles(p, added);
    expect(d.holdings.find((h) => h.id === "h_new")!.status).toBe("added");
    expect(d.changeCount).toBe(1);
  });

  it("reports only the fields that actually moved", () => {
    const p = base();
    const repriced: Profile = {
      ...p,
      holdings: p.holdings.map((h) => (h.id === "h_btc" ? { ...h, price: 3_000_000 } : h)),
    };
    const d = diffProfiles(p, repriced);
    const btc = d.holdings.find((h) => h.id === "h_btc")!;
    expect(btc.status).toBe("changed");
    expect(btc.deltas.map((x) => x.label).sort()).toEqual(["Price", "Value"]);
    // Units did not move, so it must not appear.
    expect(btc.deltas.some((x) => x.label === "Units")).toBe(false);
  });

  it("counts a cash drawdown as a budget change", () => {
    const p = base();
    const spent: Profile = { ...p, budget: { ...p.budget, cashReserve: 100_000 } };
    const d = diffProfiles(p, spent);
    const cash = d.budget.find((f) => f.label === "Cash reserve")!;
    expect(cash.direction).toBe("down");
    expect(cash.better).toBe(false);
  });

  it("summarises how many measures improved versus worsened", () => {
    const p = base();
    const cleared: Profile = { ...p, loans: p.loans.filter((l) => l.id !== "loan_card") };
    expect(diffProfiles(p, cleared).summary).toMatch(/improved, \d+ got worse/);
  });
});

describe("branch as a parallel workspace", () => {
  beforeEach(() => loadDemoProfile("INR"));

  it("lands you in the branch when one opens", () => {
    enterScenario("Clear the card");
    expect(getState().workspace).toBe("branch");
  });

  it("keeps your real numbers reachable while the branch is open", () => {
    enterScenario("Clear the card");
    updateProfile((p) => ({ ...p, budget: { ...p.budget, cashReserve: 1 } }));

    // The branch is what tools see and what the branch view shows.
    expect(viewedProfile().budget.cashReserve).toBe(1);
    expect(getState().profile.budget.cashReserve).toBe(1);

    // Switching back shows reality without unwinding anything.
    setWorkspace("real");
    expect(viewedProfile().budget.cashReserve).toBe(900_000);
    expect(getState().profile.budget.cashReserve).toBe(1);

    setWorkspace("branch");
    expect(viewedProfile().budget.cashReserve).toBe(1);
  });

  it("refuses to show a branch that does not exist", () => {
    setWorkspace("branch");
    expect(getState().workspace).toBe("real");
  });

  it("returns you to your real position when the branch closes", () => {
    enterScenario("Explore");
    updateProfile((p) => ({ ...p, budget: { ...p.budget, cashReserve: 1 } }));
    exitScenario(false);
    expect(getState().workspace).toBe("real");
    expect(viewedProfile().budget.cashReserve).toBe(900_000);
  });

  it("keeps adopted changes when the branch closes with keep", () => {
    enterScenario("Adopt me");
    updateProfile((p) => ({ ...p, budget: { ...p.budget, cashReserve: 4_242 } }));
    exitScenario(true);
    expect(getState().workspace).toBe("real");
    expect(viewedProfile().budget.cashReserve).toBe(4_242);
  });
});
