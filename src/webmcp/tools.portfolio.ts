import type { AssetClass, Holding } from "../types";
import {
  ASSET_CLASSES,
  ASSET_META,
  SHOCKS,
  allocation,
  applyRebalance,
  expectedReturnPct,
  holdingValue,
  portfolioValue,
  rebalancePlan,
  riskScore,
  simulateShock,
  volatilityPct,
  type ShockName,
} from "../lib/portfolio";
import { money, pct, round2 } from "../lib/money";
import { addProposal, getProfile, uid, updateProfile } from "../store/store";
import { S, requireNumber, result, type ToolSpec } from "./helpers";

const SHOCK_NAMES = Object.keys(SHOCKS) as ShockName[];

function findHolding(id: string): Holding {
  const h = getProfile().holdings.find(
    (x) => x.id === id || x.symbol.toLowerCase() === id.toLowerCase() || x.name === id,
  );
  if (!h) {
    const available = getProfile().holdings.map((x) => `${x.id} (${x.symbol})`).join(", ") || "none";
    throw new Error(`No holding matching "${id}". Available: ${available}.`);
  }
  return h;
}

export const portfolioTools: ToolSpec[] = [
  {
    name: "portfolio_list",
    effect: "read",
    description:
      "List every investment holding with its units, price, current value and asset class. Call this before any other portfolio_* tool so you know which holding ids exist.",
    inputSchema: S.obj({}),
    execute: () => {
      const p = getProfile();
      if (!p.holdings.length) return result("The user has no holdings recorded.", { holdings: [] });
      const rows = p.holdings.map((h) => ({ ...h, value: holdingValue(h) }));
      const text = rows
        .map((h) => `- ${h.id} ${h.symbol} "${h.name}" (${ASSET_META[h.assetClass].label}): ${h.units} units at ${money(h.price)} = ${money(h.value)}`)
        .join("\n");
      return result(
        `${rows.length} holding(s) worth ${money(portfolioValue(p.holdings))} in total.\n${text}`,
        { holdings: rows, totalValue: portfolioValue(p.holdings) },
      );
    },
  },
  {
    name: "portfolio_add_holding",
    effect: "write",
    description:
      "Add an investment holding to the portfolio. Use when the user tells you about something they own, so allocation and risk maths include it.",
    inputSchema: S.obj(
      {
        symbol: S.str("Ticker or short code."),
        name: S.str("Full name of the instrument."),
        assetClass: S.enumOf(ASSET_CLASSES, "Which asset class this belongs to."),
        units: S.num("Number of units held."),
        price: S.num("Current price per unit."),
      },
      ["symbol", "name", "assetClass", "units", "price"],
    ),
    execute: (i) => {
      const units = requireNumber(i.units, "units");
      const price = requireNumber(i.price, "price");
      if (units <= 0 || price <= 0) throw new Error("Units and price must both be positive.");
      if (!ASSET_CLASSES.includes(i.assetClass)) {
        throw new Error(`assetClass must be one of: ${ASSET_CLASSES.join(", ")}.`);
      }
      const h: Holding = {
        id: uid("h"),
        symbol: String(i.symbol),
        name: String(i.name),
        assetClass: i.assetClass as AssetClass,
        units,
        price,
      };
      updateProfile((p) => ({ ...p, holdings: [...p.holdings, h] }));
      return result(`Added ${h.symbol} "${h.name}" worth ${money(holdingValue(h))} (id ${h.id}).`, {
        holding: h,
        value: holdingValue(h),
      });
    },
  },
  {
    name: "portfolio_remove_holding",
    effect: "write",
    description:
      "Remove a holding from the portfolio by id or ticker symbol. Use when the user has sold a position or entered it in error.",
    inputSchema: S.obj({ holdingId: S.str("Holding id or ticker symbol.") }, ["holdingId"]),
    touches: (i) => [String(i.holdingId)],
    execute: (i) => {
      const h = findHolding(String(i.holdingId));
      updateProfile((p) => ({ ...p, holdings: p.holdings.filter((x) => x.id !== h.id) }));
      return result(`Removed ${h.symbol} "${h.name}".`, { removed: h.id });
    },
  },
  {
    name: "portfolio_allocation",
    effect: "read",
    description:
      "Break the portfolio down by asset class, with the weight of each, the blended expected return, the volatility and a 0-100 risk score. Use this to answer 'how is my portfolio positioned' or before recommending a rebalance.",
    inputSchema: S.obj({}),
    execute: () => {
      const p = getProfile();
      if (!p.holdings.length) return result("The portfolio is empty.", { slices: [] });
      const slices = allocation(p.holdings);
      const text = slices.map((s) => `- ${s.label}: ${pct(s.weightPct)} (${money(s.value)})`).join("\n");
      const risk = riskScore(p.holdings);
      return result(
        `Total ${money(portfolioValue(p.holdings))}. Blended expected return ${pct(expectedReturnPct(p.holdings))}, volatility ${pct(volatilityPct(p.holdings))}, risk score ${risk}/100.\n${text}`,
        {
          slices,
          totalValue: portfolioValue(p.holdings),
          expectedReturnPct: expectedReturnPct(p.holdings),
          volatilityPct: volatilityPct(p.holdings),
          riskScore: risk,
        },
      );
    },
  },
  {
    name: "portfolio_plan_rebalance",
    effect: "read",
    description:
      "Compute the buys and sells needed to move the portfolio to a target allocation by asset class. Targets are normalised, so they need not sum to 100. This only plans -- call portfolio_propose_rebalance to actually apply it.",
    inputSchema: S.obj(
      {
        target: S.obj(
          Object.fromEntries(
            ASSET_CLASSES.map((c) => [c, S.num(`Target percentage for ${ASSET_META[c].label}.`)]),
          ) as Record<string, Record<string, unknown>>,
        ),
      },
      ["target"],
    ),
    execute: (i) => {
      const p = getProfile();
      if (!p.holdings.length) throw new Error("The portfolio is empty, so there is nothing to rebalance.");
      const target = (i.target ?? {}) as Partial<Record<AssetClass, number>>;
      if (!Object.values(target).some((v) => (v ?? 0) > 0)) {
        throw new Error("Provide at least one positive target weight.");
      }
      const plan = rebalancePlan(p.holdings, target);
      const text = plan.legs
        .filter((l) => l.action !== "hold")
        .map((l) => `- ${l.action.toUpperCase()} ${money(Math.abs(l.deltaValue))} of ${l.label} (${pct(l.currentPct)} -> ${pct(l.targetPct)})`)
        .join("\n");
      return result(
        `Drift from target is ${pct(plan.driftPct)}; correcting it moves ${money(plan.turnover)}.\n${text || "Already at target."}`,
        plan,
      );
    },
  },
  {
    name: "portfolio_propose_rebalance",
    effect: "propose",
    description:
      "Propose actually rebalancing the portfolio to a target allocation. This does NOT take effect immediately: it creates a proposal card the human must approve or reject. Use after portfolio_plan_rebalance when the user agrees.",
    inputSchema: S.obj(
      {
        target: S.obj(
          Object.fromEntries(
            ASSET_CLASSES.map((c) => [c, S.num(`Target percentage for ${ASSET_META[c].label}.`)]),
          ) as Record<string, Record<string, unknown>>,
        ),
        reason: S.str("One sentence explaining the rationale, shown to the human on the approval card."),
      },
      ["target"],
    ),
    execute: (i) => {
      const p = getProfile();
      if (!p.holdings.length) throw new Error("The portfolio is empty, so there is nothing to rebalance.");
      const target = (i.target ?? {}) as Partial<Record<AssetClass, number>>;
      const plan = rebalancePlan(p.holdings, target);
      const riskBefore = riskScore(p.holdings);
      const riskAfter = riskScore(applyRebalance(p.holdings, plan));

      addProposal({
        tool: "portfolio_propose_rebalance",
        title: `Rebalance the portfolio (${money(plan.turnover)} of trades)`,
        summary: String(i.reason ?? "Move the portfolio to the requested target allocation."),
        effects: [
          ...plan.legs
            .filter((l) => l.action !== "hold")
            .map((l) => `${l.action === "buy" ? "Buy" : "Sell"} ${money(Math.abs(l.deltaValue))} ${l.label} (${pct(l.currentPct)} -> ${pct(l.targetPct)})`),
          `Risk score ${riskBefore}/100 -> ${riskAfter}/100`,
        ],
        apply: (prof) => ({ ...prof, holdings: applyRebalance(prof.holdings, plan) }),
      });

      return result(
        `Proposed a rebalance moving ${money(plan.turnover)} and taking the risk score from ${riskBefore} to ${riskAfter}. It is waiting for the user's approval in the app -- nothing has changed yet. Tell the user to approve or reject the card.`,
        { proposed: true, plan, riskBefore, riskAfter },
      );
    },
  },
  {
    name: "portfolio_simulate_market_event",
    effect: "read",
    description:
      "Simulate a named market event (equity crash, rate spike, crypto winter, broad risk-off, gold rally) against the portfolio and report the damage per holding. Read-only.",
    inputSchema: S.obj(
      { event: S.enumOf(SHOCK_NAMES, "Which market event to simulate.") },
      ["event"],
    ),
    execute: (i) => {
      const p = getProfile();
      if (!p.holdings.length) throw new Error("The portfolio is empty.");
      if (!SHOCK_NAMES.includes(i.event)) {
        throw new Error(`event must be one of: ${SHOCK_NAMES.join(", ")}.`);
      }
      const s = simulateShock(p.holdings, i.event as ShockName);
      const text = s.byHolding
        .map((h) => `- ${h.name}: ${money(h.before)} -> ${money(h.after)} (${h.changePct >= 0 ? "+" : ""}${h.changePct}%)`)
        .join("\n");
      return result(
        `${s.label}: portfolio ${money(s.valueBefore)} -> ${money(s.valueAfter)}, a change of ${money(s.changeValue)} (${pct(s.changePct)}).\n${text}`,
        s,
      );
    },
  },
  {
    name: "portfolio_add_real_asset",
    effect: "write",
    description:
      "Record a non-investable asset such as a self-occupied home. It counts towards net worth but is deliberately excluded from allocation, rebalancing and concentration risk, because you cannot sell a third of the house you live in. Use this when the user mentions property they own.",
    inputSchema: S.obj(
      { name: S.str("What the asset is."), value: S.num("Current market value.") },
      ["name", "value"],
    ),
    execute: (i) => {
      const value = requireNumber(i.value, "value");
      if (value <= 0) throw new Error("Value must be positive.");
      const asset = { id: uid("ra"), name: String(i.name), value };
      updateProfile((p) => ({ ...p, realAssets: [...p.realAssets, asset] }));
      return result(
        `Recorded "${asset.name}" at ${money(value)}. It now counts towards net worth but is excluded from portfolio allocation and rebalancing.`,
        { realAsset: asset },
      );
    },
  },
  {
    name: "portfolio_update_price",
    effect: "write",
    description: "Update the current price of a holding, for example to reflect a live quote the user gives you.",
    inputSchema: S.obj(
      { holdingId: S.str("Holding id or ticker symbol."), price: S.num("New price per unit.") },
      ["holdingId", "price"],
    ),
    touches: (i) => [String(i.holdingId)],
    execute: (i) => {
      const h = findHolding(String(i.holdingId));
      const price = requireNumber(i.price, "price");
      if (price <= 0) throw new Error("Price must be positive.");
      const before = holdingValue(h);
      updateProfile((p) => ({
        ...p,
        holdings: p.holdings.map((x) => (x.id === h.id ? { ...x, price } : x)),
      }));
      const after = round2(h.units * price);
      return result(
        `${h.symbol} repriced from ${money(h.price)} to ${money(price)}: position ${money(before)} -> ${money(after)}.`,
        { holdingId: h.id, before, after },
      );
    },
  },
];
