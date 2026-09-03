export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const COMPACT: Array<[number, string]> = [
  [1e7, "Cr"],
  [1e5, "L"],
  [1e3, "K"],
];

/** Indian-convention compact currency, e.g. ₹65.0L. */
export function money(n: number, currency = "INR"): string {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (currency === "INR") {
    for (const [scale, suffix] of COMPACT) {
      if (abs >= scale) return `${sign}${sym}${(abs / scale).toFixed(abs / scale >= 100 ? 0 : 2)}${suffix}`;
    }
  }
  return `${sign}${sym}${Math.round(abs).toLocaleString("en-IN")}`;
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
