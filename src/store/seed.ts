import type { Profile } from "../types";

export function emptyProfile(): Profile {
  return {
    currency: "INR",
    loans: [],
    holdings: [],
    realAssets: [],
    budget: { monthlyIncome: 0, expenses: [], cashReserve: 0 },
    goals: [],
    expectedPortfolioReturnPct: 11,
  };
}

/**
 * A deliberately realistic mid-career profile: leveraged, diversified-ish,
 * and with a genuine prepay-vs-invest tension the advisor tools can chew on.
 */
export function demoProfile(): Profile {
  return {
    currency: "INR",
    expectedPortfolioReturnPct: 11,
    loans: [
      {
        id: "loan_home",
        name: "Home loan — Sector 62 flat",
        kind: "home",
        principal: 6_500_000,
        annualRatePct: 8.6,
        termMonths: 240,
        monthsPaid: 34,
      },
      {
        id: "loan_car",
        name: "Car loan — Creta",
        kind: "auto",
        principal: 1_200_000,
        annualRatePct: 9.4,
        termMonths: 60,
        monthsPaid: 18,
      },
      {
        id: "loan_card",
        name: "Credit card revolve",
        kind: "credit_card",
        principal: 180_000,
        annualRatePct: 38,
        termMonths: 24,
        monthsPaid: 3,
      },
    ],
    // The asset the home loan actually bought. Carrying the liability without
    // the asset would make net worth meaningless.
    realAssets: [{ id: "ra_flat", name: "Sector 62 flat (self-occupied)", value: 9_500_000 }],
    holdings: [
      { id: "h_nifty", symbol: "NIFTYBEES", name: "Nifty 50 index ETF", assetClass: "equity", units: 900, price: 285 },
      { id: "h_flexi", symbol: "PPFAS", name: "Parag Parikh Flexi Cap", assetClass: "equity", units: 3200, price: 82 },
      { id: "h_debt", symbol: "GILT10", name: "10Y Gilt fund", assetClass: "debt", units: 4000, price: 61 },
      { id: "h_gold", symbol: "GOLDBEES", name: "Gold ETF", assetClass: "gold", units: 1500, price: 78 },
      { id: "h_btc", symbol: "BTC", name: "Bitcoin", assetClass: "crypto", units: 0.12, price: 5_900_000 },
    ],
    budget: {
      monthlyIncome: 285_000,
      cashReserve: 900_000,
      expenses: [
        { id: "e_emi_note", name: "Household & groceries", amount: 42_000, essential: true },
        { id: "e_rent", name: "Society maintenance + utilities", amount: 14_000, essential: true },
        { id: "e_school", name: "School fees", amount: 26_000, essential: true },
        { id: "e_ins", name: "Insurance premiums", amount: 9_000, essential: true },
        { id: "e_life", name: "Dining, travel, subscriptions", amount: 31_000, essential: false },
      ],
    },
    goals: [
      { id: "g_edu", name: "Daughter's undergrad fund", targetAmount: 4_000_000, targetMonths: 120, savedSoFar: 620_000 },
      { id: "g_emg", name: "12-month emergency fund", targetAmount: 1_800_000, targetMonths: 24, savedSoFar: 900_000 },
    ],
  };
}
