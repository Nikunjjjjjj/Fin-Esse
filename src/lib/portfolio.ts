import type { AssetClass, Holding } from "../types";
import { round2 } from "./money";

/**
 * Planning assumptions. These are deliberately explicit and inspectable rather
 * than hidden inside a model: the app is an educational planning tool, and the
 * agent is expected to quote them when it justifies a recommendation.
 */
export const ASSET_META: Record<
  AssetClass,
  { label: string; expectedReturnPct: number; volatilityPct: number; riskWeight: number }
> = {
  equity: { label: "Equity", expectedReturnPct: 12, volatilityPct: 18, riskWeight: 1.0 },
  debt: { label: "Debt", expectedReturnPct: 7, volatilityPct: 5, riskWeight: 0.3 },
  gold: { label: "Gold", expectedReturnPct: 8, volatilityPct: 14, riskWeight: 0.6 },
  cash: { label: "Cash", expectedReturnPct: 4, volatilityPct: 0, riskWeight: 0.0 },
  crypto: { label: "Crypto", expectedReturnPct: 18, volatilityPct: 70, riskWeight: 2.0 },
  real_estate: { label: "Real estate", expectedReturnPct: 9, volatilityPct: 12, riskWeight: 0.7 },
};

export const ASSET_CLASSES = Object.keys(ASSET_META) as AssetClass[];

export function holdingValue(h: Holding): number {
  return round2(h.units * h.price);
}

export function portfolioValue(holdings: Holding[]): number {
  return round2(holdings.reduce((s, h) => s + h.units * h.price, 0));
}

export interface AllocationSlice {
  assetClass: AssetClass;
  label: string;
  value: number;
  weightPct: number;
}

export function allocation(holdings: Holding[]): AllocationSlice[] {
  const total = portfolioValue(holdings);
  const byClass = new Map<AssetClass, number>();
  for (const h of holdings) {
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + h.units * h.price);
  }
  return [...byClass.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      label: ASSET_META[assetClass].label,
      value: round2(value),
      weightPct: total > 0 ? round2((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Value-weighted expected return, percent p.a. */
export function expectedReturnPct(holdings: Holding[]): number {
  const total = portfolioValue(holdings);
  if (total <= 0) return 0;
  const weighted = holdings.reduce(
    (s, h) => s + h.units * h.price * ASSET_META[h.assetClass].expectedReturnPct,
    0,
  );
  return round2(weighted / total);
}

/** 0-100 concentration/volatility blend. Higher means more exposed. */
export function riskScore(holdings: Holding[]): number {
  const total = portfolioValue(holdings);
  if (total <= 0) return 0;
  const weightedRisk = holdings.reduce(
    (s, h) => s + (h.units * h.price) / total * ASSET_META[h.assetClass].riskWeight,
    0,
  );
  // Herfindahl concentration across individual holdings, 0 (diffuse) to 1 (single asset).
  const hhi = holdings.reduce((s, h) => s + Math.pow((h.units * h.price) / total, 2), 0);
  return round2(Math.min(100, weightedRisk * 55 + hhi * 45));
}

export function volatilityPct(holdings: Holding[]): number {
  const total = portfolioValue(holdings);
  if (total <= 0) return 0;
  const w = holdings.reduce(
    (s, h) => s + ((h.units * h.price) / total) * ASSET_META[h.assetClass].volatilityPct,
    0,
  );
  return round2(w);
}

export interface RebalanceLeg {
  assetClass: AssetClass;
  label: string;
  currentPct: number;
  targetPct: number;
  currentValue: number;
  targetValue: number;
  deltaValue: number;
  action: "buy" | "sell" | "hold";
}

export interface RebalancePlan {
  legs: RebalanceLeg[];
  turnover: number;
  totalValue: number;
  driftPct: number;
}

/**
 * Computes the trades needed to move to `target` (percentages by asset class).
 * Targets are normalised, so partial specifications still produce a valid plan.
 */
export function rebalancePlan(
  holdings: Holding[],
  target: Partial<Record<AssetClass, number>>,
): RebalancePlan {
  const total = portfolioValue(holdings);
  const current = new Map(allocation(holdings).map((a) => [a.assetClass, a]));
  const targetSum = Object.values(target).reduce((s, v) => s + (v ?? 0), 0);
  const classes = new Set<AssetClass>([
    ...current.keys(),
    ...(Object.keys(target) as AssetClass[]),
  ]);

  const legs: RebalanceLeg[] = [...classes].map((assetClass) => {
    const currentValue = current.get(assetClass)?.value ?? 0;
    const currentPct = total > 0 ? round2((currentValue / total) * 100) : 0;
    const rawTarget = target[assetClass] ?? 0;
    const targetPct = targetSum > 0 ? round2((rawTarget / targetSum) * 100) : 0;
    const targetValue = round2((targetPct / 100) * total);
    const deltaValue = round2(targetValue - currentValue);
    return {
      assetClass,
      label: ASSET_META[assetClass].label,
      currentPct,
      targetPct,
      currentValue,
      targetValue,
      deltaValue,
      action: Math.abs(deltaValue) < total * 0.005 ? "hold" : deltaValue > 0 ? "buy" : "sell",
    };
  });

  legs.sort((a, b) => Math.abs(b.deltaValue) - Math.abs(a.deltaValue));
  const turnover = round2(legs.reduce((s, l) => s + Math.max(0, l.deltaValue), 0));
  const driftPct = round2(
    legs.reduce((s, l) => s + Math.abs(l.currentPct - l.targetPct), 0) / 2,
  );
  return { legs, turnover, totalValue: total, driftPct };
}

/** Applies a rebalance by scaling each holding within its asset class. */
export function applyRebalance(holdings: Holding[], plan: RebalancePlan): Holding[] {
  const byClass = new Map(plan.legs.map((l) => [l.assetClass, l]));
  const classTotals = new Map<AssetClass, number>();
  for (const h of holdings) {
    classTotals.set(h.assetClass, (classTotals.get(h.assetClass) ?? 0) + h.units * h.price);
  }
  return holdings.map((h) => {
    const leg = byClass.get(h.assetClass);
    const classTotal = classTotals.get(h.assetClass) ?? 0;
    if (!leg || classTotal <= 0 || h.price <= 0) return h;
    const scale = leg.targetValue / classTotal;
    return { ...h, units: round2(h.units * scale * 10000) / 10000 };
  });
}

export type ShockName = "equity_crash" | "rate_spike" | "crypto_winter" | "broad_selloff" | "gold_rally";

export const SHOCKS: Record<ShockName, { label: string; moves: Partial<Record<AssetClass, number>> }> = {
  equity_crash: {
    label: "Equity crash (-30%)",
    moves: { equity: -30, crypto: -45, gold: 8, debt: 3, real_estate: -10 },
  },
  rate_spike: {
    label: "Rate spike (+200bps)",
    moves: { debt: -9, equity: -12, real_estate: -14, gold: -3 },
  },
  crypto_winter: { label: "Crypto winter (-70%)", moves: { crypto: -70, equity: -5 } },
  broad_selloff: {
    label: "Broad risk-off (-20%)",
    moves: { equity: -20, crypto: -35, real_estate: -12, gold: 5, debt: 2 },
  },
  gold_rally: { label: "Flight to gold (+25%)", moves: { gold: 25, equity: -8, crypto: -15 } },
};

export interface ShockResult {
  shock: string;
  label: string;
  valueBefore: number;
  valueAfter: number;
  changeValue: number;
  changePct: number;
  byHolding: Array<{ id: string; name: string; before: number; after: number; changePct: number }>;
}

export function simulateShock(
  holdings: Holding[],
  shock: ShockName,
  customMoves?: Partial<Record<AssetClass, number>>,
): ShockResult {
  const moves = customMoves ?? SHOCKS[shock].moves;
  const before = portfolioValue(holdings);
  const byHolding = holdings.map((h) => {
    const move = moves[h.assetClass] ?? 0;
    const b = round2(h.units * h.price);
    return {
      id: h.id,
      name: h.name,
      before: b,
      after: round2(b * (1 + move / 100)),
      changePct: move,
    };
  });
  const after = round2(byHolding.reduce((s, x) => s + x.after, 0));
  return {
    shock,
    label: SHOCKS[shock]?.label ?? "Custom shock",
    valueBefore: before,
    valueAfter: after,
    changeValue: round2(after - before),
    changePct: before > 0 ? round2(((after - before) / before) * 100) : 0,
    byHolding,
  };
}

/** Applies a shock destructively to prices (used inside what-if scenarios). */
export function applyShock(
  holdings: Holding[],
  shock: ShockName,
  customMoves?: Partial<Record<AssetClass, number>>,
): Holding[] {
  const moves = customMoves ?? SHOCKS[shock].moves;
  return holdings.map((h) => ({
    ...h,
    price: round2(h.price * (1 + (moves[h.assetClass] ?? 0) / 100)),
  }));
}
