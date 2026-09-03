import type { Loan } from "../types";
import { round2 } from "./money";

export interface LoanSnapshot {
  id: string;
  name: string;
  kind: string;
  annualRatePct: number;
  emi: number;
  outstanding: number;
  monthsRemaining: number;
  monthsPaid: number;
  termMonths: number;
  interestRemaining: number;
  interestPaidSoFar: number;
  totalInterestOriginal: number;
}

export function monthlyRate(annualRatePct: number): number {
  return annualRatePct / 12 / 100;
}

/**
 * Standard reducing-balance EMI, deliberately NOT rounded to currency units.
 * Rounding here compounds across a 120-360 month schedule and manufactures a
 * phantom final instalment, so rounding happens only at the display boundary.
 */
export function emiFor(principal: number, annualRatePct: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  const r = monthlyRate(annualRatePct);
  if (r === 0) return principal / termMonths;
  const f = Math.pow(1 + r, termMonths);
  return (principal * r * f) / (f - 1);
}

/** Outstanding principal after `paid` EMIs of the original schedule. */
export function balanceAfter(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  paid: number,
): number {
  if (paid >= termMonths) return 0;
  const r = monthlyRate(annualRatePct);
  if (r === 0) return round2(principal * (1 - paid / termMonths));
  const f = Math.pow(1 + r, termMonths);
  const g = Math.pow(1 + r, paid);
  return round2((principal * (f - g)) / (f - 1));
}

/**
 * Months needed to clear `balance` paying `emi` monthly.
 * Returns Infinity when the EMI cannot even cover the monthly interest.
 */
export function monthsToClear(balance: number, annualRatePct: number, emi: number): number {
  if (balance <= 0) return 0;
  const r = monthlyRate(annualRatePct);
  if (r === 0) return Math.ceil(balance / emi);
  if (emi <= balance * r) return Infinity;
  const n = -Math.log(1 - (balance * r) / emi) / Math.log(1 + r);
  // Nudge before ceiling so floating-point noise cannot invent an extra
  // instalment on a schedule that lands exactly on a whole month.
  return Math.ceil(n - 1e-7);
}

/** Total interest paid clearing `balance` at `emi`, using an exact schedule walk. */
export function interestToClear(balance: number, annualRatePct: number, emi: number): number {
  const r = monthlyRate(annualRatePct);
  let bal = balance;
  let interest = 0;
  let guard = 0;
  while (bal > 0.5 && guard < 1200) {
    const i = bal * r;
    interest += i;
    bal = bal + i - emi;
    guard += 1;
    if (bal > balance * 1.5) return Infinity; // negative amortisation
  }
  // Final instalment overshoots; give back the overpayment.
  if (bal < 0) interest += bal;
  return round2(interest);
}

export function snapshot(loan: Loan): LoanSnapshot {
  const emi = emiFor(loan.principal, loan.annualRatePct, loan.termMonths);
  const outstanding = balanceAfter(
    loan.principal,
    loan.annualRatePct,
    loan.termMonths,
    loan.monthsPaid,
  );
  const monthsRemaining = Math.max(0, loan.termMonths - loan.monthsPaid);
  const interestRemaining = round2(emi * monthsRemaining - outstanding);
  const totalInterestOriginal = round2(emi * loan.termMonths - loan.principal);
  return {
    id: loan.id,
    name: loan.name,
    kind: loan.kind,
    annualRatePct: loan.annualRatePct,
    emi,
    outstanding,
    monthsRemaining,
    monthsPaid: loan.monthsPaid,
    termMonths: loan.termMonths,
    interestRemaining,
    interestPaidSoFar: round2(emi * loan.monthsPaid - (loan.principal - outstanding)),
    totalInterestOriginal,
  };
}

export interface AmortisationRow {
  month: number;
  opening: number;
  interest: number;
  principal: number;
  closing: number;
}

export function amortisation(loan: Loan, limit = 12, fromMonth = 0): AmortisationRow[] {
  const emi = emiFor(loan.principal, loan.annualRatePct, loan.termMonths);
  const r = monthlyRate(loan.annualRatePct);
  const start = loan.monthsPaid + fromMonth;
  let bal = balanceAfter(loan.principal, loan.annualRatePct, loan.termMonths, start);
  const rows: AmortisationRow[] = [];
  for (let k = 0; k < limit && bal > 0.5; k += 1) {
    const interest = round2(bal * r);
    const principal = round2(Math.min(emi - interest, bal));
    const closing = round2(Math.max(0, bal - principal));
    rows.push({ month: start + k + 1, opening: round2(bal), interest, principal, closing });
    bal = closing;
  }
  return rows;
}

export interface PrepayResult {
  loanId: string;
  loanName: string;
  lumpSum: number;
  extraMonthly: number;
  emi: number;
  balanceBefore: number;
  balanceAfter: number;
  monthsBefore: number;
  monthsAfter: number;
  monthsSaved: number;
  interestBefore: number;
  interestAfter: number;
  interestSaved: number;
  /** Interest saved per unit of cash deployed — the comparable efficiency number. */
  savedPerRupee: number;
  feasible: boolean;
  note: string;
}

/**
 * Simulates a one-off lump sum and/or a permanent EMI top-up, holding the
 * instalment constant so the benefit shows up as a shorter tenure.
 */
export function simulatePrepay(loan: Loan, lumpSum: number, extraMonthly = 0): PrepayResult {
  const s = snapshot(loan);
  const applied = Math.min(Math.max(0, lumpSum), s.outstanding);
  const newBalance = round2(s.outstanding - applied);
  const newEmi = s.emi + Math.max(0, extraMonthly);

  const monthsAfter = monthsToClear(newBalance, loan.annualRatePct, newEmi);
  const interestAfter = newBalance <= 0 ? 0 : interestToClear(newBalance, loan.annualRatePct, newEmi);
  const interestSaved = round2(s.interestRemaining - interestAfter);
  const cashDeployed = applied + Math.max(0, extraMonthly) * Math.min(monthsAfter, s.monthsRemaining);

  return {
    loanId: loan.id,
    loanName: loan.name,
    lumpSum: applied,
    extraMonthly: Math.max(0, extraMonthly),
    emi: newEmi,
    balanceBefore: s.outstanding,
    balanceAfter: newBalance,
    monthsBefore: s.monthsRemaining,
    monthsAfter: Number.isFinite(monthsAfter) ? monthsAfter : s.monthsRemaining,
    monthsSaved: Number.isFinite(monthsAfter) ? Math.max(0, s.monthsRemaining - monthsAfter) : 0,
    interestBefore: s.interestRemaining,
    interestAfter: round2(interestAfter),
    interestSaved,
    savedPerRupee: cashDeployed > 0 ? round2((interestSaved / cashDeployed) * 100) / 100 : 0,
    feasible: applied <= s.outstanding,
    note:
      applied < lumpSum
        ? `Lump sum exceeded the outstanding balance; only ${applied} was needed to close the loan.`
        : "",
  };
}

export interface LoanOffer {
  label: string;
  principal: number;
  annualRatePct: number;
  termMonths: number;
  processingFee?: number;
}

export interface OfferComparison {
  label: string;
  emi: number;
  totalPaid: number;
  totalInterest: number;
  processingFee: number;
  totalCost: number;
}

export function compareOffers(offers: LoanOffer[]): {
  rows: OfferComparison[];
  best: string;
  spread: number;
} {
  const rows = offers.map((o) => {
    const emi = emiFor(o.principal, o.annualRatePct, o.termMonths);
    const totalPaid = round2(emi * o.termMonths);
    const fee = o.processingFee ?? 0;
    return {
      label: o.label,
      emi,
      totalPaid,
      totalInterest: round2(totalPaid - o.principal),
      processingFee: fee,
      totalCost: round2(totalPaid - o.principal + fee),
    };
  });
  const sorted = [...rows].sort((a, b) => a.totalCost - b.totalCost);
  return {
    rows,
    best: sorted[0]?.label ?? "",
    spread: sorted.length > 1 ? round2(sorted[sorted.length - 1].totalCost - sorted[0].totalCost) : 0,
  };
}

export function totalMonthlyEmi(loans: Loan[]): number {
  return round2(
    loans.reduce((sum, l) => (l.monthsPaid < l.termMonths ? sum + snapshot(l).emi : sum), 0),
  );
}

export function totalOutstanding(loans: Loan[]): number {
  return round2(loans.reduce((sum, l) => sum + snapshot(l).outstanding, 0));
}
