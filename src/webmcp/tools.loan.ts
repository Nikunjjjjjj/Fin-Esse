import type { Loan, LoanKind } from "../types";
import {
  amortisation,
  compareOffers,
  emiFor,
  simulatePrepay,
  snapshot,
  totalMonthlyEmi,
  totalOutstanding,
} from "../lib/loan";
import { money, months as fmtMonths, round2 } from "../lib/money";
import { addProposal, getProfile, uid, updateProfile } from "../store/store";
import { S, requireNumber, result, type ToolSpec } from "./helpers";

const KINDS: LoanKind[] = ["home", "auto", "education", "personal", "credit_card", "other"];

function findLoan(id: string): Loan {
  const loan = getProfile().loans.find((l) => l.id === id || l.name === id);
  if (!loan) {
    const available = getProfile().loans.map((l) => `${l.id} ("${l.name}")`).join(", ") || "none";
    throw new Error(`No loan matching "${id}". Available loans: ${available}.`);
  }
  return loan;
}

export const loanTools: ToolSpec[] = [
  {
    name: "loan_list",
    effect: "read",
    description:
      "List every loan in the user's profile with its EMI, outstanding balance, months remaining and interest still to be paid. Call this first whenever a question involves debt, and before calling any other loan_* tool, so you know which loan ids exist.",
    inputSchema: S.obj({}),
    execute: () => {
      const p = getProfile();
      if (!p.loans.length) return result("The user has no loans recorded.", { loans: [] });
      const rows = p.loans.map(snapshot);
      const text = rows
        .map(
          (r) =>
            `- ${r.id} "${r.name}" (${r.kind}): ${money(r.outstanding, p.currency)} outstanding at ${r.annualRatePct}%, EMI ${money(r.emi, p.currency)}, ${fmtMonths(r.monthsRemaining)} left, ${money(r.interestRemaining, p.currency)} interest still to pay.`,
        )
        .join("\n");
      return result(
        `${rows.length} loan(s). Total outstanding ${money(totalOutstanding(p.loans), p.currency)}, total EMI ${money(totalMonthlyEmi(p.loans), p.currency)}/month.\n${text}`,
        { loans: rows, totalOutstanding: totalOutstanding(p.loans), totalEmi: totalMonthlyEmi(p.loans) },
      );
    },
  },
  {
    name: "loan_add",
    effect: "write",
    description:
      "Add a new loan to the user's profile. Use this when the user describes a debt they hold. Returns the computed EMI and the new loan's id.",
    inputSchema: S.obj(
      {
        name: S.str('Human label, e.g. "Home loan - Sector 62 flat".'),
        principal: S.num("Original sanctioned principal amount."),
        annualRatePct: S.num("Nominal annual interest rate as a percentage, e.g. 8.6."),
        termMonths: S.num("Original tenure in months."),
        kind: S.enumOf(KINDS, "Category of loan."),
        monthsPaid: S.num("How many EMIs have already been paid. Defaults to 0."),
      },
      ["name", "principal", "annualRatePct", "termMonths"],
    ),
    execute: (i) => {
      const principal = requireNumber(i.principal, "principal");
      const rate = requireNumber(i.annualRatePct, "annualRatePct");
      const term = requireNumber(i.termMonths, "termMonths");
      if (principal <= 0) throw new Error("Principal must be positive.");
      if (term <= 0) throw new Error("Term must be at least one month.");
      const loan: Loan = {
        id: uid("loan"),
        name: String(i.name),
        kind: (KINDS.includes(i.kind) ? i.kind : "other") as LoanKind,
        principal,
        annualRatePct: rate,
        termMonths: Math.round(term),
        monthsPaid: Math.max(0, Math.round(Number(i.monthsPaid ?? 0))),
      };
      updateProfile((p) => ({ ...p, loans: [...p.loans, loan] }));
      const s = snapshot(loan);
      return result(
        `Added "${loan.name}" (id ${loan.id}). EMI ${money(s.emi)}, outstanding ${money(s.outstanding)}, ${fmtMonths(s.monthsRemaining)} remaining.`,
        { loan, snapshot: s },
      );
    },
  },
  {
    name: "loan_remove",
    effect: "write",
    description: "Remove a loan from the profile by its id. Use when a loan was entered by mistake or has been closed.",
    inputSchema: S.obj({ loanId: S.str("The loan's id, from loan_list.") }, ["loanId"]),
    touches: (i) => [String(i.loanId)],
    execute: (i) => {
      const loan = findLoan(String(i.loanId));
      updateProfile((p) => ({ ...p, loans: p.loans.filter((l) => l.id !== loan.id) }));
      return result(`Removed "${loan.name}".`, { removed: loan.id });
    },
  },
  {
    name: "loan_emi_calculator",
    effect: "read",
    description:
      "Compute the EMI, total interest and total repayment for hypothetical loan terms, without touching the user's profile. Use for 'what would the EMI be if...' questions.",
    inputSchema: S.obj(
      {
        principal: S.num("Loan amount."),
        annualRatePct: S.num("Annual interest rate as a percentage."),
        termMonths: S.num("Tenure in months."),
      },
      ["principal", "annualRatePct", "termMonths"],
    ),
    execute: (i) => {
      const principal = requireNumber(i.principal, "principal");
      const rate = requireNumber(i.annualRatePct, "annualRatePct");
      const term = Math.round(requireNumber(i.termMonths, "termMonths"));
      const emi = emiFor(principal, rate, term);
      const total = round2(emi * term);
      return result(
        `${money(principal)} at ${rate}% over ${fmtMonths(term)}: EMI ${money(emi)}, total repayment ${money(total)}, total interest ${money(total - principal)}.`,
        { emi: round2(emi), totalRepayment: total, totalInterest: round2(total - principal) },
      );
    },
  },
  {
    name: "loan_amortisation",
    effect: "read",
    description:
      "Show the month-by-month interest/principal split for a loan already in the profile. Use to explain where the money is actually going.",
    inputSchema: S.obj(
      {
        loanId: S.str("The loan's id, from loan_list."),
        months: S.num("How many months to show. Defaults to 12, maximum 60."),
        fromMonth: S.num("Offset from today in months. Defaults to 0."),
      },
      ["loanId"],
    ),
    touches: (i) => [String(i.loanId)],
    execute: (i) => {
      const loan = findLoan(String(i.loanId));
      const n = Math.min(60, Math.max(1, Math.round(Number(i.months ?? 12))));
      const rows = amortisation(loan, n, Math.max(0, Math.round(Number(i.fromMonth ?? 0))));
      const interest = round2(rows.reduce((s, r) => s + r.interest, 0));
      const principal = round2(rows.reduce((s, r) => s + r.principal, 0));
      const text = rows
        .slice(0, 12)
        .map((r) => `  #${r.month}: interest ${money(r.interest)}, principal ${money(r.principal)}, balance ${money(r.closing)}`)
        .join("\n");
      return result(
        `Next ${rows.length} instalments on "${loan.name}": ${money(interest)} interest vs ${money(principal)} principal (${round2((interest / (interest + principal)) * 100)}% of every payment is interest).\n${text}`,
        { rows, totalInterest: interest, totalPrincipal: principal },
      );
    },
  },
  {
    name: "loan_simulate_prepayment",
    effect: "read",
    description:
      "Simulate paying a lump sum and/or a permanent extra monthly amount into a loan, holding the EMI constant. Returns months saved and interest saved. This only simulates -- it does not change anything. To actually apply it, call loan_propose_prepayment.",
    inputSchema: S.obj(
      {
        loanId: S.str("The loan's id, from loan_list."),
        lumpSum: S.num("One-off amount paid now. Defaults to 0."),
        extraMonthly: S.num("Permanent monthly top-up on top of the EMI. Defaults to 0."),
      },
      ["loanId"],
    ),
    touches: (i) => [String(i.loanId)],
    execute: (i) => {
      const loan = findLoan(String(i.loanId));
      const lump = Math.max(0, Number(i.lumpSum ?? 0));
      const extra = Math.max(0, Number(i.extraMonthly ?? 0));
      if (lump === 0 && extra === 0) throw new Error("Provide a lumpSum, an extraMonthly, or both.");
      const r = simulatePrepay(loan, lump, extra);
      return result(
        `"${loan.name}": paying ${money(r.lumpSum)} now${extra ? ` plus ${money(extra)}/mo extra` : ""} clears the loan in ${fmtMonths(r.monthsAfter)} instead of ${fmtMonths(r.monthsBefore)} -- ${fmtMonths(r.monthsSaved)} sooner -- and saves ${money(r.interestSaved)} of interest. ${r.note}`.trim(),
        r,
      );
    },
  },
  {
    name: "loan_propose_prepayment",
    effect: "propose",
    description:
      "Propose actually applying a prepayment to the user's profile. This does NOT take effect immediately: it creates a proposal card the human must approve or reject in the app. Use this after loan_simulate_prepayment when the user agrees they want to go ahead.",
    inputSchema: S.obj(
      {
        loanId: S.str("The loan's id, from loan_list."),
        lumpSum: S.num("One-off amount to pay against the principal."),
        reason: S.str("One sentence explaining why this is the right move, shown to the human on the approval card."),
      },
      ["loanId", "lumpSum"],
    ),
    touches: (i) => [String(i.loanId)],
    execute: (i) => {
      const loan = findLoan(String(i.loanId));
      const lump = Math.max(0, requireNumber(i.lumpSum, "lumpSum"));
      const sim = simulatePrepay(loan, lump);
      const cash = getProfile().budget.cashReserve;

      addProposal({
        tool: "loan_propose_prepayment",
        title: `Prepay ${money(sim.lumpSum)} into "${loan.name}"`,
        summary: String(i.reason ?? `Reduce the ${loan.annualRatePct}% balance on ${loan.name}.`),
        effects: [
          `Outstanding ${money(sim.balanceBefore)} -> ${money(sim.balanceAfter)}`,
          `Payoff ${fmtMonths(sim.monthsBefore)} -> ${fmtMonths(sim.monthsAfter)} (${fmtMonths(sim.monthsSaved)} sooner)`,
          `Interest saved ${money(sim.interestSaved)}`,
          `Cash reserve ${money(cash)} -> ${money(cash - sim.lumpSum)}`,
        ],
        apply: (p) => ({
          ...p,
          budget: { ...p.budget, cashReserve: round2(p.budget.cashReserve - sim.lumpSum) },
          loans: p.loans.map((l) =>
            l.id === loan.id
              ? {
                  ...l,
                  // Re-express the prepaid loan as a fresh schedule at the reduced
                  // balance, keeping the instalment so the tenure shortens.
                  principal: sim.balanceAfter,
                  termMonths: sim.monthsAfter,
                  monthsPaid: 0,
                }
              : l,
          ),
        }),
      });

      const shortfall = sim.lumpSum - cash;
      return result(
        `Proposed a ${money(sim.lumpSum)} prepayment on "${loan.name}". It is now waiting for the user's approval in the app -- it has NOT been applied yet. If approved it saves ${money(sim.interestSaved)} and ${fmtMonths(sim.monthsSaved)}.${shortfall > 0 ? ` Warning: this exceeds the ${money(cash)} cash reserve by ${money(shortfall)}.` : ""} Tell the user to approve or reject the card.`,
        { proposed: true, simulation: sim, cashReserve: cash, exceedsCash: shortfall > 0 },
      );
    },
  },
  {
    name: "loan_compare_offers",
    effect: "read",
    description:
      "Compare two or more loan offers on total cost including processing fees, and identify the cheapest. Use when the user is shopping for a loan or considering a refinance.",
    inputSchema: S.obj(
      {
        offers: S.arr(
          S.obj(
            {
              label: S.str("Name of the lender or offer."),
              principal: S.num("Loan amount."),
              annualRatePct: S.num("Annual interest rate as a percentage."),
              termMonths: S.num("Tenure in months."),
              processingFee: S.num("One-off fee. Defaults to 0."),
            },
            ["label", "principal", "annualRatePct", "termMonths"],
          ),
          "Two or more offers to compare.",
        ),
      },
      ["offers"],
    ),
    execute: (i) => {
      const offers = Array.isArray(i.offers) ? i.offers : [];
      if (offers.length < 2) throw new Error("Provide at least two offers to compare.");
      const r = compareOffers(offers);
      const text = r.rows
        .map(
          (o) =>
            `- ${o.label}: EMI ${money(o.emi)}, interest ${money(o.totalInterest)}${o.processingFee ? ` + fee ${money(o.processingFee)}` : ""} = total cost ${money(o.totalCost)}`,
        )
        .join("\n");
      return result(
        `"${r.best}" is cheapest, by ${money(r.spread)} over the worst option.\n${text}`,
        r,
      );
    },
  },
];
