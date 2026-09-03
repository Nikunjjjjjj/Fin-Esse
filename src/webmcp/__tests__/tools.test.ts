import { beforeEach, describe, expect, it } from "vitest";
import { ALL_TOOLS } from "../register";
import { instrument } from "../helpers";
import { getState, loadDemoProfile, resetProfile, resolveProposal, setState } from "../../store/store";
import { emptyProfile } from "../../store/seed";

function tool(name: string) {
  const spec = ALL_TOOLS.find((t) => t.name === name);
  if (!spec) throw new Error(`no tool ${name}`);
  return instrument(spec);
}

async function call(name: string, input: Record<string, unknown> = {}) {
  const r = await tool(name).execute(input);
  return { text: r.content.map((c) => c.text).join("\n"), data: r.structuredContent as any, isError: r.isError };
}

beforeEach(() => {
  resetProfile();
  setState({ profile: emptyProfile(), activity: [], proposals: [], scenarios: [], scenarioMode: null });
});

describe("tool catalogue", () => {
  it("exposes the four documented groups", () => {
    const prefixes = new Set(ALL_TOOLS.map((t) => t.name.split("_")[0]));
    expect(prefixes).toEqual(new Set(["loan", "portfolio", "budget", "advisor"]));
  });

  it("has unique names", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every tool a description and an object input schema", () => {
    for (const t of ALL_TOOLS) {
      expect(t.description.length, t.name).toBeGreaterThan(40);
      expect((t.inputSchema as any).type, t.name).toBe("object");
    }
  });

  it("marks every mutating tool as write or propose", () => {
    for (const t of ALL_TOOLS) {
      expect(["read", "write", "propose"]).toContain(t.effect);
    }
  });
});

describe("loan tools", () => {
  it("adds a loan and reports it back", async () => {
    const add = await call("loan_add", {
      name: "Test home loan",
      principal: 5_000_000,
      annualRatePct: 8.5,
      termMonths: 240,
    });
    expect(add.data.loan.id).toBeTruthy();
    const list = await call("loan_list");
    expect(list.text).toContain("Test home loan");
    expect(list.data.loans).toHaveLength(1);
  });

  it("returns a helpful error naming available loans", async () => {
    const r = await call("loan_simulate_prepayment", { loanId: "nope", lumpSum: 1000 });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("No loan matching");
  });

  it("rejects a prepayment simulation with no amount", async () => {
    loadDemoProfile();
    const r = await call("loan_simulate_prepayment", { loanId: "loan_card" });
    expect(r.isError).toBe(true);
  });
});

describe("human-in-the-loop proposals", () => {
  it("does not mutate state until a human approves", async () => {
    loadDemoProfile();
    const cashBefore = getState().profile.budget.cashReserve;
    const r = await call("loan_propose_prepayment", {
      loanId: "loan_card",
      lumpSum: 180_000,
      reason: "38% is the most expensive money on the balance sheet.",
    });
    expect(r.data.proposed).toBe(true);
    expect(getState().profile.budget.cashReserve).toBe(cashBefore);
    expect(getState().proposals).toHaveLength(1);

    // The card owes less than the requested lump sum, so the engine caps the
    // payment at the outstanding balance rather than overpaying it.
    const applied = r.data.simulation.lumpSum;
    expect(applied).toBeLessThan(180_000);

    resolveProposal(getState().proposals[0].id, "approved");
    expect(getState().profile.budget.cashReserve).toBeCloseTo(cashBefore - applied, 2);
    expect(getState().profile.loans.find((l: any) => l.id === "loan_card")!.principal).toBe(0);
  });

  it("leaves state untouched when a human rejects", async () => {
    loadDemoProfile();
    const before = JSON.stringify(getState().profile);
    await call("loan_propose_prepayment", { loanId: "loan_home", lumpSum: 500_000 });
    resolveProposal(getState().proposals[0].id, "rejected");
    expect(JSON.stringify(getState().profile)).toBe(before);
  });

  it("warns when a proposed prepayment exceeds the cash reserve", async () => {
    loadDemoProfile();
    const r = await call("loan_propose_prepayment", { loanId: "loan_home", lumpSum: 5_000_000 });
    expect(r.data.exceedsCash).toBe(true);
    expect(r.text).toContain("Warning");
  });
});

describe("what-if sandbox", () => {
  it("discards changes made inside a branch", async () => {
    loadDemoProfile();
    const before = JSON.stringify(getState().profile);
    await call("advisor_begin_whatif", { name: "Aggressive payoff" });
    await call("budget_set_cash_reserve", { cashReserve: 1 });
    expect(getState().profile.budget.cashReserve).toBe(1);
    await call("advisor_end_whatif", { keep: false });
    expect(JSON.stringify(getState().profile)).toBe(before);
  });

  it("adopts changes when the user keeps the branch", async () => {
    loadDemoProfile();
    await call("advisor_begin_whatif", { name: "Keep me" });
    await call("budget_set_cash_reserve", { cashReserve: 12_345 });
    await call("advisor_end_whatif", { keep: true });
    expect(getState().profile.budget.cashReserve).toBe(12_345);
  });

  it("refuses to open two branches at once", async () => {
    loadDemoProfile();
    await call("advisor_begin_whatif", { name: "One" });
    const r = await call("advisor_begin_whatif", { name: "Two" });
    expect(r.isError).toBe(true);
  });
});

describe("advisor tools over the demo profile", () => {
  beforeEach(() => loadDemoProfile());

  it("recommends clearing the credit card with spare cash", async () => {
    const r = await call("advisor_prepay_vs_invest", { amount: 300_000, horizonMonths: 60 });
    expect(r.data.best.loanId).toBe("loan_card");
    expect(r.text).toContain("Credit card");
    expect(r.data.caveats.length).toBeGreaterThan(2);
  });

  it("reports a coherent balance sheet", async () => {
    const r = await call("advisor_net_position");
    expect(r.data.netWorth).toBeCloseTo(r.data.totalAssets - r.data.totalDebt, 0);
  });

  it("breaks under a job loss plus a crash", async () => {
    const r = await call("advisor_stress_test", { jobLossMonths: 9, marketShock: "equity_crash" });
    expect(r.data.breaks).toBe(true);
  });

  it("explains a figure it quoted", async () => {
    const r = await call("advisor_explain_number", { figure: "net_worth" });
    expect(r.text).toContain("Net worth =");
  });
});

describe("activity trail", () => {
  it("records every agent call so the human can follow along", async () => {
    loadDemoProfile();
    const before = getState().activity.length;
    await call("loan_list");
    await call("advisor_net_position");
    expect(getState().activity.length).toBe(before + 2);
    expect(getState().activity[0].tool).toBe("advisor_net_position");
  });

  it("records failures too, rather than swallowing them", async () => {
    await call("loan_amortisation", { loanId: "ghost" });
    expect(getState().activity[0].detail).toContain("failed");
  });
});
