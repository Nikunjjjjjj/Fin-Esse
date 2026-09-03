import type { CurrencyCode } from "../lib/money";
import type { Profile } from "../types";

export function emptyProfile(currency: CurrencyCode = "INR"): Profile {
  return {
    currency,
    isSample: false,
    loans: [],
    holdings: [],
    realAssets: [],
    budget: { monthlyIncome: 0, expenses: [], cashReserve: 0 },
    goals: [],
    expectedPortfolioReturnPct: currency === "USD" ? 8 : 11,
  };
}

export function demoProfile(currency: CurrencyCode = "INR"): Profile {
  return currency === "USD" ? demoProfileUSD() : demoProfileINR();
}

/**
 * A deliberately realistic mid-career profile: leveraged, diversified-ish,
 * and with a genuine prepay-vs-invest tension the advisor tools can chew on.
 *
 * The three loan rates are the point. One sits far above any plausible market
 * return, one far below, and one close enough to the assumed return that the
 * answer genuinely depends on which assumptions you accept. A sample where
 * every loan pointed the same way would make the advisor look clairvoyant
 * while proving nothing.
 */
function demoProfileINR(): Profile {
  return {
    currency: "INR",
    isSample: true,
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

/**
 * The same financial shape in US terms, so the sample reads instantly to
 * someone who does not think in lakhs. Rates are set to preserve the tension:
 * a card far above market returns, a mortgage clearly below, and an auto loan
 * close enough to the 8% assumption to be genuinely arguable.
 */
function demoProfileUSD(): Profile {
  return {
    currency: "USD",
    isSample: true,
    expectedPortfolioReturnPct: 8,
    realAssets: [{ id: "ra_house", name: "Maple Street house (primary residence)", value: 520_000 }],
    loans: [
      {
        id: "loan_home",
        name: "Mortgage — Maple Street",
        kind: "home",
        principal: 380_000,
        annualRatePct: 6.4,
        termMonths: 360,
        monthsPaid: 41,
      },
      {
        id: "loan_car",
        name: "Auto loan — Outback",
        kind: "auto",
        principal: 34_000,
        annualRatePct: 8.2,
        termMonths: 60,
        monthsPaid: 18,
      },
      {
        id: "loan_card",
        name: "Credit card revolve",
        kind: "credit_card",
        principal: 14_500,
        annualRatePct: 24.9,
        termMonths: 24,
        monthsPaid: 3,
      },
    ],
    holdings: [
      { id: "h_vti", symbol: "VTI", name: "Total US market ETF", assetClass: "equity", units: 420, price: 268 },
      { id: "h_vxus", symbol: "VXUS", name: "Total international ETF", assetClass: "equity", units: 300, price: 61 },
      { id: "h_bnd", symbol: "BND", name: "Total bond market ETF", assetClass: "debt", units: 480, price: 73 },
      { id: "h_gld", symbol: "GLD", name: "Gold ETF", assetClass: "gold", units: 90, price: 198 },
      { id: "h_btc", symbol: "BTC", name: "Bitcoin", assetClass: "crypto", units: 0.35, price: 68_000 },
    ],
    budget: {
      monthlyIncome: 11_400,
      cashReserve: 21_000,
      expenses: [
        { id: "e_food", name: "Groceries & household", amount: 1_150, essential: true },
        { id: "e_util", name: "Utilities & insurance", amount: 740, essential: true },
        { id: "e_care", name: "Childcare", amount: 1_480, essential: true },
        { id: "e_health", name: "Health premiums", amount: 520, essential: true },
        { id: "e_life", name: "Dining, travel, subscriptions", amount: 890, essential: false },
      ],
    },
    goals: [
      { id: "g_edu", name: "College fund", targetAmount: 180_000, targetMonths: 144, savedSoFar: 26_000 },
      { id: "g_emg", name: "6-month emergency fund", targetAmount: 42_000, targetMonths: 24, savedSoFar: 21_000 },
    ],
  };
}
