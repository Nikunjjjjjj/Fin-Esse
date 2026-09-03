export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export type CurrencyCode = "INR" | "USD";

/**
 * The currency every unqualified money() call formats in.
 *
 * Tool result strings are assembled in a dozen modules that have no reason to
 * thread the profile through just to render a number, and a default parameter
 * meant every one of those call sites silently rendered rupees regardless of
 * the profile. Keeping the active currency here is the one place that cannot
 * drift out of sync with the profile.
 */
let active: CurrencyCode = "INR";

export function setDisplayCurrency(code: CurrencyCode) {
  active = code;
}

export function displayCurrency(): CurrencyCode {
  return active;
}

export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string; locale: string }> = {
  INR: { symbol: "₹", label: "Indian rupee", locale: "en-IN" },
  USD: { symbol: "$", label: "US dollar", locale: "en-US" },
};

/** Indian convention: thousand, lakh (1e5), crore (1e7). */
const INR_SCALES: Array<[number, string]> = [
  [1e7, "Cr"],
  [1e5, "L"],
  [1e3, "K"],
];

/** Western convention: thousand, million, billion. */
const USD_SCALES: Array<[number, string]> = [
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
];

export function money(n: number, currency: CurrencyCode | string = active): string {
  const code: CurrencyCode = currency === "USD" ? "USD" : "INR";
  const { symbol, locale } = CURRENCIES[code];
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const scales = code === "INR" ? INR_SCALES : USD_SCALES;

  for (const [scale, suffix] of scales) {
    if (abs >= scale) {
      const value = abs / scale;
      return `${sign}${symbol}${value.toFixed(value >= 100 ? 0 : 2)}${suffix}`;
    }
  }
  return `${sign}${symbol}${Math.round(abs).toLocaleString(locale)}`;
}

/** Full precision, for inputs and places where a rounded figure would mislead. */
export function moneyExact(n: number, currency: CurrencyCode | string = active): string {
  const code: CurrencyCode = currency === "USD" ? "USD" : "INR";
  const { symbol, locale } = CURRENCIES[code];
  return `${n < 0 ? "-" : ""}${symbol}${Math.abs(Math.round(n)).toLocaleString(locale)}`;
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function months(n: number): string {
  const y = Math.floor(n / 12);
  const m = Math.round(n % 12);
  if (y <= 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}
