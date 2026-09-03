import type { AssetClass, Holding, Profile } from "../types";
import { netPosition, prepayVsInvest } from "./advisor";
import { assessAllGoals, cashflow, emergencyRunwayMonths } from "./budget";
import { money, pct, round2 } from "./money";
import {
  ASSET_META, allocation, expectedReturnPct, holdingValue,
  portfolioValue, riskScore, volatilityPct,
} from "./portfolio";

/**
 * Market conditions, without a market data feed.
 *
 * The page deliberately does not fetch news. A key would put the user's
 * positions behind someone's API, add a live network dependency that can fail
 * mid-conversation, and it would be a worse source than the thing already
 * asking: the agent is connected to the live web and can read today's
 * coverage directly.
 *
 * So the split is: this module tells the agent precisely what to go and read,
 * derived from what the user actually holds, and then turns what the agent
 * found back into arithmetic about these specific holdings. Only asset-class
 * names leave the browser as search terms; positions never do.
 */

export interface ExposureBrief {
  assetClass: AssetClass;
  label: string;
  weightPct: number;
  value: number;
  holdings: string[];
  whatToFind: string[];
}

export interface ResearchBrief {
  totalValue: number;
  exposures: ExposureBrief[];
  /** Ranked instruction for the agent, largest exposure first. */
  instruction: string;
  ignore: string[];
  note: string;
}

const ASK: Record<AssetClass, string[]> = {
  equity: [
    "index level and the move over the past week and month",
    "central bank rate decisions or guidance since the last meeting",
    "earnings season tone and any sector leading the move",
  ],
  debt: [
    "10-year government bond yield now versus a month ago",
    "the latest policy rate decision and the expected direction",
    "inflation print versus expectations",
  ],
  gold: [
    "spot price and the move this month",
    "whether flows are risk-off driven or currency driven",
  ],
  crypto: [
    "price now and drawdown from the recent high",
    "any regulatory decision, ETF flow or liquidation event this week",
  ],
  cash: ["short-term deposit and money-market rates", "current inflation, which sets the real return"],
  real_estate: [
    "residential price index direction in the relevant city or region",
    "mortgage rate direction, which drives affordability",
  ],
};

export function researchBrief(profile: Profile): ResearchBrief {
  const total = portfolioValue(profile.holdings);
  const slices = allocation(profile.holdings);

  const exposures: ExposureBrief[] = slices.map((s) => ({
    assetClass: s.assetClass,
    label: s.label,
    weightPct: s.weightPct,
    value: s.value,
    holdings: profile.holdings.filter((h) => h.assetClass === s.assetClass).map((h) => h.name),
    whatToFind: ASK[s.assetClass],
  }));

  if (profile.realAssets.length) {
    exposures.push({
      assetClass: "real_estate",
      label: "Property",
      weightPct: 0,
      value: round2(profile.realAssets.reduce((s, a) => s + a.value, 0)),
      holdings: profile.realAssets.map((a) => a.name),
      whatToFind: ASK.real_estate,
    });
  }

  const ranked = exposures.filter((e) => e.weightPct > 0);
  const instruction = ranked.length
    ? `Research these in order of how much they matter to this portfolio: ${ranked
        .map((e) => `${e.label} (${pct(e.weightPct)} of ${money(total)})`)
        .join(", ")}. Spend your effort proportionally — a 45% exposure deserves more than a 5% one.`
    : "There are no investable holdings yet, so there is nothing specific to research.";

  const held = new Set(exposures.map((e) => e.assetClass));
  const ignore = (Object.keys(ASSET_META) as AssetClass[])
    .filter((c) => !held.has(c))
    .map((c) => ASSET_META[c].label);

  return {
    totalValue: total,
    exposures,
    instruction,
    ignore,
    note:
      "Use your own web search for this — the page holds no market data and fetches nothing. " +
      "Bring what you find back through market_apply_conditions to see what it means for these holdings.",
  };
}

/* ------------------------------------------------------------------------ */

export interface MarketCondition {
  assetClass: AssetClass;
  /** The move the agent observed or expects, as a percentage. */
  changePct: number;
  note: string;
  source?: string;
}

export interface AspectImpact {
  aspect: string;
  before: string;
  after: string;
  verdict: "better" | "worse" | "unchanged";
  comment: string;
}

export interface MarketImpact {
  conditions: MarketCondition[];
  portfolioBefore: number;
  portfolioAfter: number;
  changeValue: number;
  changePct: number;
  byHolding: Array<{ id: string; name: string; assetClass: string; before: number; after: number; movePct: number }>;
  byClass: Array<{ label: string; before: number; after: number; movePct: number; weightBefore: number; weightAfter: number }>;
  aspects: AspectImpact[];
  adviceFlipped: boolean;
  headline: string;
  caveats: string[];
}

function shift(holdings: Holding[], moves: Map<AssetClass, number>): Holding[] {
  return holdings.map((h) => ({ ...h, price: round2(h.price * (1 + (moves.get(h.assetClass) ?? 0) / 100)) }));
}

function verdict(before: number, after: number, higherIsBetter: boolean): AspectImpact["verdict"] {
  if (Math.abs(after - before) < 0.005) return "unchanged";
  return (after > before) === higherIsBetter ? "better" : "worse";
}

/**
 * Turns what the agent read into what it means here. Deliberately reports the
 * aspects a market move does NOT touch as well: someone reading a crash
 * headline needs to know their debt and their runway are unchanged.
 */
export function applyMarketConditions(profile: Profile, conditions: MarketCondition[]): MarketImpact {
  const moves = new Map<AssetClass, number>();
  for (const c of conditions) moves.set(c.assetClass, c.changePct);

  const after: Profile = {
    ...profile,
    holdings: shift(profile.holdings, moves),
    realAssets: profile.realAssets.map((a) => ({
      ...a,
      value: round2(a.value * (1 + (moves.get("real_estate") ?? 0) / 100)),
    })),
  };

  const pvB = portfolioValue(profile.holdings);
  const pvA = portfolioValue(after.holdings);
  const npB = netPosition(profile);
  const npA = netPosition(after);
  const cf = cashflow(profile.budget, profile.loans);

  const byHolding = profile.holdings.map((h, i) => ({
    id: h.id,
    name: h.name,
    assetClass: ASSET_META[h.assetClass].label,
    before: holdingValue(h),
    after: holdingValue(after.holdings[i]),
    movePct: moves.get(h.assetClass) ?? 0,
  }));

  const allocB = allocation(profile.holdings);
  const allocA = allocation(after.holdings);
  const byClass = allocB.map((b) => {
    const a = allocA.find((x) => x.assetClass === b.assetClass);
    return {
      label: b.label,
      before: b.value,
      after: a?.value ?? 0,
      movePct: moves.get(b.assetClass) ?? 0,
      weightBefore: b.weightPct,
      weightAfter: a?.weightPct ?? 0,
    };
  });

  const spare = Math.max(1, profile.budget.cashReserve);
  const bestB = prepayVsInvest(profile, spare, 60).best;
  const bestA = prepayVsInvest(after, spare, 60).best;
  const adviceFlipped = !!bestB && !!bestA && bestB.winner !== bestA.winner;

  const goalsB = profile.goals.length ? assessAllGoals(profile) : null;
  const goalsA = after.goals.length ? assessAllGoals(after) : null;

  const aspects: AspectImpact[] = [
    {
      aspect: "Investable portfolio",
      before: money(pvB),
      after: money(pvA),
      verdict: verdict(pvB, pvA, true),
      comment: `${pct(pvB > 0 ? ((pvA - pvB) / pvB) * 100 : 0)} across ${profile.holdings.length} holdings.`,
    },
    {
      aspect: "Net worth",
      before: money(npB.netWorth),
      after: money(npA.netWorth),
      verdict: verdict(npB.netWorth, npA.netWorth, true),
      comment: "Debt is unchanged, so the whole move lands on the asset side.",
    },
    {
      aspect: "Portfolio risk",
      before: `${Math.round(riskScore(profile.holdings))}/100`,
      after: `${Math.round(riskScore(after.holdings))}/100`,
      verdict: verdict(riskScore(profile.holdings), riskScore(after.holdings), false),
      comment: "A fall in one asset class changes concentration as well as value.",
    },
    {
      aspect: "Blended volatility",
      before: pct(volatilityPct(profile.holdings)),
      after: pct(volatilityPct(after.holdings)),
      verdict: verdict(volatilityPct(profile.holdings), volatilityPct(after.holdings), false),
      comment: "Weights shifted, so the blended figure moves even though each asset's own volatility did not.",
    },
    {
      aspect: "Expected return",
      before: pct(expectedReturnPct(profile.holdings)),
      after: pct(expectedReturnPct(after.holdings)),
      verdict: verdict(expectedReturnPct(profile.holdings), expectedReturnPct(after.holdings), true),
      comment: "Follows the change in weights, not a change in the assumptions themselves.",
    },
    {
      aspect: "Debt",
      before: money(npB.totalDebt),
      after: money(npA.totalDebt),
      verdict: "unchanged",
      comment: "Markets do not move what you owe. Only a rate change on a floating loan would.",
    },
    {
      aspect: "Monthly surplus",
      before: money(cf.surplus),
      after: money(cf.surplus),
      verdict: "unchanged",
      comment: "Income and instalments are unaffected by prices.",
    },
    {
      aspect: "Emergency runway",
      before: `${emergencyRunwayMonths(profile).toFixed(1)} mo`,
      after: `${emergencyRunwayMonths(after).toFixed(1)} mo`,
      verdict: "unchanged",
      comment: "Runway is cash divided by committed outgoings — a market move does not touch either. This is why it holds when everything else falls.",
    },
  ];

  if (goalsB && goalsA) {
    aspects.push({
      aspect: "Goals still fundable",
      before: goalsB.feasible ? "yes" : "no",
      after: goalsA.feasible ? "yes" : "no",
      verdict: goalsB.feasible === goalsA.feasible ? "unchanged" : goalsA.feasible ? "better" : "worse",
      comment: "Goal funding comes out of surplus, so it survives a price move unless the target itself was riding on the portfolio.",
    });
  }

  if (bestB && bestA) {
    aspects.push({
      aspect: "Prepay-versus-invest",
      before: `${bestB.winner} (${bestB.loanName})`,
      after: `${bestA.winner} (${bestA.loanName})`,
      verdict: adviceFlipped ? "worse" : "unchanged",
      comment: adviceFlipped
        ? "The recommendation flipped — worth telling the user explicitly."
        : "The recommendation holds. Debt rates are contractual; market moves rarely change which side wins.",
    });
  }

  const dir = pvA >= pvB ? "up" : "down";
  const headline =
    conditions.length === 0
      ? "No conditions supplied, so nothing moved."
      : `Applying what you found, the portfolio goes ${dir} from ${money(pvB)} to ${money(pvA)} (${pct(pvB > 0 ? ((pvA - pvB) / pvB) * 100 : 0)}), and net worth from ${money(npB.netWorth)} to ${money(npA.netWorth)}. Debt, surplus and runway are untouched.`;

  return {
    conditions,
    portfolioBefore: pvB,
    portfolioAfter: pvA,
    changeValue: round2(pvA - pvB),
    changePct: pvB > 0 ? round2(((pvA - pvB) / pvB) * 100) : 0,
    byHolding,
    byClass,
    aspects,
    adviceFlipped,
    headline,
    caveats: [
      "This is a what-if on today's holdings, not a forecast. Prices in the app are unchanged unless the user approves an update.",
      "Percentages are whatever you supplied from your research — the arithmetic is only as good as the reading behind it.",
      "Past moves do not predict future ones, and a single week's news is a poor guide to a multi-year position.",
      "Cite your sources to the user so they can judge the input themselves.",
    ],
  };
}
