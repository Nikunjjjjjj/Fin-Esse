import { useState } from "react";
import { snapshot } from "../lib/loan";
import { money, months as fmtMonths, pct } from "../lib/money";
import { getProfile, logActivity, uid, updateProfile, useSelector } from "../store/store";
import type { Loan, LoanKind } from "../types";
import { Card, Empty, Panel } from "./common";

const KINDS: LoanKind[] = ["home", "auto", "education", "personal", "credit_card", "other"];

function AddLoan({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", principal: "", annualRatePct: "", termMonths: "", kind: "home" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      className="form"
      style={{ marginBottom: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        const loan: Loan = {
          id: uid("loan"),
          name: f.name || "New loan",
          kind: f.kind as LoanKind,
          principal: Number(f.principal) || 0,
          annualRatePct: Number(f.annualRatePct) || 0,
          termMonths: Number(f.termMonths) || 12,
          monthsPaid: 0,
        };
        if (loan.principal <= 0) return;
        updateProfile((p) => ({ ...p, loans: [...p.loans, loan] }));
        logActivity("system", "ui", `You added the loan "${loan.name}".`, [loan.id]);
        onDone();
      }}
    >
      <div className="field">
        <label>Name</label>
        <input value={f.name} onChange={set("name")} placeholder="Home loan" />
      </div>
      <div className="field">
        <label>Principal</label>
        <input value={f.principal} onChange={set("principal")} inputMode="numeric" placeholder="5000000" />
      </div>
      <div className="field">
        <label>Rate %</label>
        <input value={f.annualRatePct} onChange={set("annualRatePct")} inputMode="decimal" placeholder="8.5" />
      </div>
      <div className="field">
        <label>Months</label>
        <input value={f.termMonths} onChange={set("termMonths")} inputMode="numeric" placeholder="240" />
      </div>
      <div className="field">
        <label>Kind</label>
        <select value={f.kind} onChange={set("kind")}>
          {KINDS.map((k) => (
            <option key={k} value={k}>{k.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <button className="btn primary" type="submit">Add</button>
    </form>
  );
}

export function Loans() {
  const profile = useSelector((s) => s.profile);
  const [adding, setAdding] = useState(false);
  const c = profile.currency;
  const expected = profile.expectedPortfolioReturnPct;

  return (
    <Panel
      title="Loans"
      count={profile.loans.length}
      actions={
        <button className="btn sm ghost" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add"}
        </button>
      }
    >
      {adding && <AddLoan onDone={() => setAdding(false)} />}
      {!profile.loans.length && !adding && <Empty>No loans yet. Add one, or ask the agent to.</Empty>}
      {profile.loans.map((loan) => {
        const s = snapshot(loan);
        const paidPct = (loan.monthsPaid / loan.termMonths) * 100;
        const expensive = loan.annualRatePct > expected + 3;
        return (
          <Card key={loan.id} id={loan.id}>
            <div className="row">
              <span className="name">{loan.name}</span>
              {expensive && <span className="chip hot">costly debt</span>}
              <span className="spacer" />
              <span className="amt">{money(s.outstanding, c)}</span>
            </div>
            <div className="meta">
              <span>Rate <b>{pct(loan.annualRatePct)}</b></span>
              <span>EMI <b>{money(s.emi, c)}</b></span>
              <span>Left <b>{fmtMonths(s.monthsRemaining)}</b></span>
              <span>Interest to come <b>{money(s.interestRemaining, c)}</b></span>
            </div>
            <div className="bar">
              <i className={expensive ? "danger" : ""} style={{ width: `${Math.min(100, paidPct)}%` }} />
            </div>
            <div className="meta" style={{ marginTop: 5 }}>
              <span style={{ color: "var(--dim)" }}>
                {loan.monthsPaid} of {loan.termMonths} instalments paid
              </span>
              <span className="spacer" />
              <button
                className="btn sm ghost"
                onClick={() => {
                  updateProfile((p) => ({ ...p, loans: p.loans.filter((l) => l.id !== loan.id) }));
                  logActivity("system", "ui", `You removed the loan "${loan.name}".`);
                }}
              >
                Remove
              </button>
            </div>
          </Card>
        );
      })}
      {profile.loans.length > 1 && (
        <p className="hint" style={{ marginTop: 10 }}>
          Most expensive debt:{" "}
          <b style={{ color: "var(--danger)" }}>
            {[...profile.loans].sort((a, b) => b.annualRatePct - a.annualRatePct)[0].name}
          </b>{" "}
          at {pct([...profile.loans].sort((a, b) => b.annualRatePct - a.annualRatePct)[0].annualRatePct)}, against an
          assumed {pct(getProfile().expectedPortfolioReturnPct)} portfolio return.
        </p>
      )}
    </Panel>
  );
}
