import {
  assumptionSheet,
  netPosition,
  prepayVsInvest,
  recommendations,
  riskExposure,
  stressTest,
} from "../lib/advisor";
import { SHOCKS, type ShockName } from "../lib/portfolio";
import { money, months as fmtMonths, pct } from "../lib/money";
import { diffProfiles } from "../lib/diff";
import {
  enterScenario,
  exitScenario,
  getProfile,
  getState,
  saveScenario,
} from "../store/store";
import { S, requireNumber, result, type ToolSpec } from "./helpers";

const SHOCK_NAMES = Object.keys(SHOCKS) as ShockName[];

export const advisorTools: ToolSpec[] = [
  {
    name: "advisor_net_position",
    effect: "read",
    description:
      "Give the whole balance sheet at once: investable portfolio, non-investable real assets such as a home, cash, total debt, net worth, debt-to-assets, monthly EMI and monthly surplus. The fastest way to orient yourself before answering any cross-domain question.",
    inputSchema: S.obj({}),
    execute: () => {
      const np = netPosition(getProfile());
      return result(
        `Assets ${money(np.totalAssets)} (investable portfolio ${money(np.portfolioValue)}${np.realAssetValue > 0 ? ` + property ${money(np.realAssetValue)}` : ""} + cash ${money(np.cashReserve)}) against debt ${money(np.totalDebt)}, so net worth is ${money(np.netWorth)}. Debt is ${Number.isFinite(np.debtToAssetPct) ? pct(np.debtToAssetPct) : "infinite%"} of assets. EMIs ${money(np.monthlyEmi)}/mo, surplus ${money(np.monthlySurplus)}/mo.`,
        np,
      );
    },
  },
  {
    name: "advisor_prepay_vs_invest",
    effect: "read",
    description:
      "THE cross-domain question: should a given amount of spare cash go towards prepaying a loan or into the portfolio? Compares every active loan against the assumed portfolio return by simulating both paths month by month with identical cash outflow, and ranks them. Call this whenever the user asks what to do with spare money, a bonus, or a windfall.",
    inputSchema: S.obj(
      {
        amount: S.num("The spare cash to deploy."),
        horizonMonths: S.num("How far ahead to compare, in months. Defaults to 60."),
      },
      ["amount"],
    ),
    execute: (i) => {
      const amount = requireNumber(i.amount, "amount");
      if (amount <= 0) throw new Error("Amount must be positive.");
      const horizon = Math.max(1, Math.round(Number(i.horizonMonths ?? 60)));
      const r = prepayVsInvest(getProfile(), amount, horizon);
      const table = r.options
        .map(
          (o) =>
            `- ${o.loanName} (${o.annualRatePct}%): prepay leaves net worth ${money(o.netWorthIfPrepay)} vs invest ${money(o.netWorthIfInvest)} -> ${o.winner.toUpperCase()} by ${money(Math.abs(o.advantage))}.`,
        )
        .join("\n");
      return result(
        `${r.headline}\n${table}\n\nAssumptions and caveats you should state to the user:\n${r.caveats.map((c) => `- ${c}`).join("\n")}`,
        r,
      );
    },
  },
  {
    name: "advisor_risk_exposure",
    effect: "read",
    description:
      "Score the user's overall financial fragility out of 100 by combining debt service burden, leverage, emergency runway, portfolio risk and savings rate. Reads loans, portfolio and budget together. Use when asked 'how exposed am I' or 'is my position safe'.",
    inputSchema: S.obj({}),
    execute: () => {
      const r = riskExposure(getProfile());
      const text = r.factors
        .map((f) => `- ${f.name} [${f.verdict}] ${f.value} (sub-score ${f.score}/100). ${f.comment}`)
        .join("\n");
      return result(`${r.summary}\n${text}`, r);
    },
  },
  {
    name: "advisor_stress_test",
    effect: "read",
    description:
      "Stress-test the entire financial picture against a combined shock: months without income, a named market event, and/or an interest rate rise, all at once. Reports whether the plan breaks and at what point. Use for 'what if I lose my job' or 'what if the market crashes' questions.",
    inputSchema: S.obj({
      jobLossMonths: S.num("Months with no income. Defaults to 0."),
      marketShock: S.enumOf(SHOCK_NAMES, "A simultaneous market event, if any."),
      rateHikeBps: S.num("Interest rate rise in basis points applied to every loan, e.g. 200 for +2%."),
    }),
    execute: (i) => {
      const scenario = {
        jobLossMonths: Math.max(0, Math.round(Number(i.jobLossMonths ?? 0))),
        marketShock: SHOCK_NAMES.includes(i.marketShock) ? (i.marketShock as ShockName) : undefined,
        rateHikeBps: Math.max(0, Number(i.rateHikeBps ?? 0)) || undefined,
      };
      const r = stressTest(getProfile(), scenario);
      return result(
        `Scenario: ${r.label}. Net worth ${money(r.netWorthBefore)} -> ${money(r.netWorthAfter)} (${money(r.netWorthChange)}). Cash lasts ${Number.isFinite(r.monthsSurvivable) ? `${r.monthsSurvivable} months` : "indefinitely"}. ${r.breaks ? "THE PLAN BREAKS: a forced sale is required." : "The plan holds."}\n${r.findings.map((f) => `- ${f}`).join("\n")}`,
        r,
      );
    },
  },
  {
    name: "advisor_recommendations",
    effect: "read",
    description:
      "Generate a prioritised action list synthesised across loans, portfolio and budget, each item citing which tools produced its evidence and what the impact would be. Use to answer 'what should I do' or to close out an advisory conversation.",
    inputSchema: S.obj({}),
    execute: () => {
      const recs = recommendations(getProfile());
      const text = recs
        .map(
          (r) =>
            `${r.priority}. ${r.title}\n   Action: ${r.action}\n   Why: ${r.why}\n   Impact: ${r.impact}\n   Evidence from: ${r.evidence.join(", ")}`,
        )
        .join("\n");
      return result(`${recs.length} prioritised recommendation(s):\n${text}`, { recommendations: recs });
    },
  },
  {
    name: "advisor_assumptions",
    effect: "read",
    description:
      "List every planning assumption the app uses -- expected returns and volatility per asset class, and the user's assumed portfolio return. Call this when the user asks why a number is what it is, or before presenting any recommendation as fact.",
    inputSchema: S.obj({}),
    execute: () => {
      const a = assumptionSheet(getProfile());
      const text = Object.entries(a.assetClassAssumptions)
        .map(([, m]) => `- ${m.label}: ${pct(m.expectedReturnPct)} expected, ${pct(m.volatilityPct)} volatility`)
        .join("\n");
      return result(
        `User's assumed portfolio return: ${pct(a.expectedPortfolioReturnPct)}. The holdings actually imply ${pct(a.portfolioImpliedReturnPct)}.\n${text}\n${a.note}`,
        a,
      );
    },
  },
  {
    name: "advisor_begin_whatif",
    effect: "write",
    description:
      "Open a sandboxed what-if branch. While a branch is open, every write tool changes only the sandbox, never the user's real profile, so you can explore freely -- apply prepayments, rebalance, reprice holdings -- and then discard it. Always pair with advisor_end_whatif. Use this before exploring a hypothetical the user has not committed to.",
    inputSchema: S.obj(
      { name: S.str('What you are exploring, e.g. "Clear the credit card first".') },
      ["name"],
    ),
    execute: (i) => {
      const name = String(i.name ?? "What-if");
      if (!enterScenario(name)) {
        throw new Error(
          `A what-if branch ("${getState().scenarioMode?.name}") is already open. Close it with advisor_end_whatif before starting another.`,
        );
      }
      const np = netPosition(getProfile());
      return result(
        `Opened what-if branch "${name}". The app is now showing a sandbox, clearly marked in the UI. Baseline net worth is ${money(np.netWorth)}. Changes here do not touch the user's real profile until you call advisor_end_whatif with keep=true.`,
        { scenario: name, baselineNetWorth: np.netWorth },
      );
    },
  },
  {
    name: "advisor_whatif_diff",
    effect: "read",
    description:
      "Compare the open what-if branch against the real position it forked from, field by field: net worth, debt, surplus, runway, exposure, plus every loan, holding and goal that changed. Call this after exploring a branch so you can tell the user exactly what the hypothetical did, rather than describing it from memory.",
    inputSchema: S.obj({}),
    execute: () => {
      const mode = getState().scenarioMode;
      if (!mode) throw new Error("No what-if branch is open, so there is nothing to compare.");
      const d = diffProfiles(mode.baseline, getProfile());
      const head = d.headline
        .filter((f) => f.direction !== "flat")
        .map((f) => `- ${f.label}: ${f.before} -> ${f.after}${f.better === null ? "" : f.better ? " (better)" : " (worse)"}`)
        .join("\n");
      const entities = [...d.loans, ...d.holdings, ...d.goals]
        .filter((e) => e.status !== "unchanged")
        .map((e) => `- ${e.name} [${e.status}]${e.deltas.length ? ": " + e.deltas.map((x) => `${x.label} ${x.before} -> ${x.after}`).join(", ") : ""}`)
        .join("\n");
      return result(
        `Branch "${mode.name}" against the real position.\n${d.summary}\n${head || "No headline figure moved."}\n${entities || "No individual entries changed."}`,
        { branch: mode.name, ...d },
      );
    },
  },
  {
    name: "advisor_end_whatif",
    effect: "write",
    description:
      "Close the open what-if branch. Set keep=false to discard everything explored and restore the user's real profile (the usual choice). Set keep=true only if the user has explicitly said they want to adopt the changes.",
    inputSchema: S.obj(
      { keep: S.bool("True to adopt the explored changes, false to discard them. Defaults to false.") },
      [],
    ),
    execute: (i) => {
      const before = netPosition(getProfile()).netWorth;
      const r = exitScenario(i.keep === true);
      if (!r) throw new Error("No what-if branch is currently open.");
      const after = netPosition(getProfile()).netWorth;
      return result(
        r.kept
          ? `Adopted the changes from "${r.name}". Net worth is now ${money(after)}.`
          : `Discarded "${r.name}" and restored the real profile. Net worth is back to ${money(after)} (the branch had reached ${money(before)}).`,
        { scenario: r.name, kept: r.kept, netWorth: after },
      );
    },
  },
  {
    name: "advisor_save_scenario",
    effect: "write",
    description:
      "Snapshot the current financial picture under a name so it can be compared against others later. Use to capture a branch worth remembering before discarding it.",
    inputSchema: S.obj(
      {
        name: S.str("Short label for this snapshot."),
        note: S.str("One line on what makes this scenario different."),
      },
      ["name"],
    ),
    execute: (i) => {
      const s = saveScenario(String(i.name), String(i.note ?? ""));
      const np = netPosition(s.profile);
      return result(
        `Saved scenario "${s.name}" with net worth ${money(np.netWorth)}, debt ${money(np.totalDebt)} and surplus ${money(np.monthlySurplus)}/mo. It now appears in the Scenarios panel.`,
        { scenario: s.name, id: s.id, netPosition: np },
      );
    },
  },
  {
    name: "advisor_compare_scenarios",
    effect: "read",
    description:
      "Compare every saved scenario side by side on net worth, debt, monthly surplus and risk score, against the user's current position. Use after exploring two or more branches.",
    inputSchema: S.obj({}),
    execute: () => {
      const st = getState();
      if (!st.scenarios.length) {
        throw new Error("No scenarios have been saved yet. Use advisor_save_scenario first.");
      }
      const rows = [
        { name: "Current position", ...netPosition(st.profile), risk: riskExposure(st.profile).overallScore },
        ...st.scenarios.map((s) => ({
          name: s.name,
          ...netPosition(s.profile),
          risk: riskExposure(s.profile).overallScore,
        })),
      ];
      const text = rows
        .map(
          (r) =>
            `- ${r.name}: net worth ${money(r.netWorth)}, debt ${money(r.totalDebt)}, surplus ${money(r.monthlySurplus)}/mo, risk ${r.risk}/100`,
        )
        .join("\n");
      const best = [...rows].sort((a, b) => b.netWorth - a.netWorth)[0];
      return result(
        `${rows.length} position(s) compared. "${best.name}" has the highest net worth at ${money(best.netWorth)}.\n${text}`,
        { rows, best: best.name },
      );
    },
  },
  {
    name: "advisor_explain_number",
    effect: "read",
    description:
      "Explain how a specific headline figure was derived, showing the inputs and the formula. Supported figures: net_worth, surplus, emi_burden, risk_score, emergency_runway. Use when the user challenges or asks about a number you quoted.",
    inputSchema: S.obj(
      {
        figure: S.enumOf(
          ["net_worth", "surplus", "emi_burden", "risk_score", "emergency_runway"],
          "Which figure to explain.",
        ),
      },
      ["figure"],
    ),
    execute: (i) => {
      const p = getProfile();
      const np = netPosition(p);
      const risk = riskExposure(p);
      switch (i.figure) {
        case "net_worth":
          return result(
            `Net worth = investable portfolio ${money(np.portfolioValue)} + property ${money(np.realAssetValue)} + cash ${money(np.cashReserve)} - debt ${money(np.totalDebt)} = ${money(np.netWorth)}. Portfolio value is the sum of units x price across ${p.holdings.length} holdings; property covers ${p.realAssets.length} non-investable asset(s) such as a self-occupied home, which count towards net worth but are excluded from allocation and rebalancing; debt is the outstanding balance on ${p.loans.length} loans after the EMIs already paid.`,
            np,
          );
        case "surplus":
          return result(
            `Surplus = income ${money(np.monthlySurplus + np.monthlyEmi + (p.budget.expenses.reduce((s, e) => s + e.amount, 0)))} - expenses ${money(p.budget.expenses.reduce((s, e) => s + e.amount, 0))} - EMIs ${money(np.monthlyEmi)} = ${money(np.monthlySurplus)}/mo, across ${p.budget.expenses.length} recorded expenses and ${p.loans.length} loans.`,
            { surplus: np.monthlySurplus },
          );
        case "emi_burden": {
          const f = risk.factors.find((x) => x.name === "Debt service burden")!;
          return result(`${f.value}. Total EMI ${money(np.monthlyEmi)} divided by monthly income. ${f.comment}`, f);
        }
        case "risk_score":
          return result(
            `Risk score ${risk.overallScore}/100 is a weighted blend: ${risk.factors.map((f) => `${f.name} ${f.score}/100 at weight ${f.weight}`).join("; ")}.`,
            risk,
          );
        case "emergency_runway": {
          const f = risk.factors.find((x) => x.name === "Emergency runway")!;
          return result(`${f.value}. Cash reserve ${money(p.budget.cashReserve)} divided by essential spending plus EMIs. ${f.comment}`, f);
        }
        default:
          throw new Error("Unknown figure.");
      }
    },
  },
  {
    name: "advisor_horizon_projection",
    effect: "read",
    description:
      "Project net worth forward over a horizon, showing how debt runs down and investments compound under current behaviour. Use to make a recommendation concrete.",
    inputSchema: S.obj(
      { horizonMonths: S.num("Months to project forward. Defaults to 60, maximum 360.") },
      [],
    ),
    execute: (i) => {
      const p = getProfile();
      const horizon = Math.min(360, Math.max(1, Math.round(Number(i.horizonMonths ?? 60))));
      const r = prepayVsInvest(p, Math.max(1, p.budget.cashReserve), horizon);
      const np = netPosition(p);
      const points = [12, 36, 60, 120].filter((m) => m <= horizon);
      const projections = points.map((m) => {
        const at = prepayVsInvest(p, Math.max(1, p.budget.cashReserve), m);
        return {
          months: m,
          bestAction: at.best ? `${at.best.winner} (${at.best.loanName})` : "invest",
          netWorthIfInvest: at.best?.netWorthIfInvest ?? 0,
          netWorthIfPrepay: at.best?.netWorthIfPrepay ?? 0,
        };
      });
      return result(
        `From a net worth of ${money(np.netWorth)} today, deploying the ${money(p.budget.cashReserve)} cash reserve over ${fmtMonths(horizon)}: ${r.headline}\n${projections
          .map((x) => `- at ${fmtMonths(x.months)}: best action is ${x.bestAction}`)
          .join("\n")}`,
        { today: np, horizonMonths: horizon, projections, comparison: r },
      );
    },
  },
];
