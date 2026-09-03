import { assessAllGoals, cashflow } from "../lib/budget";
import { money, months as fmtMonths, pct } from "../lib/money";
import { logActivity, updateProfile, useSelector } from "../store/store";
import { Card, Empty, Panel } from "./common";

export function BudgetGoals() {
  const profile = useSelector((s) => s.profile);
  const c = profile.currency;
  const cf = cashflow(profile.budget, profile.loans);
  const goals = profile.goals.length ? assessAllGoals(profile) : null;

  return (
    <Panel title="Budget & goals" count={`${profile.budget.expenses.length}e / ${profile.goals.length}g`}>
      <div className="netgrid" style={{ margin: "-14px -14px 12px", borderBottom: "1px solid var(--line-soft)" }}>
        <div className="netcell">
          <div className="k">Income</div>
          <div className="v" style={{ fontSize: 17 }}>{money(cf.monthlyIncome, c)}</div>
        </div>
        <div className="netcell">
          <div className="k">Outgoings</div>
          <div className="v" style={{ fontSize: 17 }}>{money(cf.totalExpenses + cf.totalEmi, c)}</div>
          <div className="s">{money(cf.totalEmi, c)} of it EMIs</div>
        </div>
        <div className="netcell">
          <div className="k">Surplus</div>
          <div className={`v ${cf.surplus >= 0 ? "pos" : "neg"}`} style={{ fontSize: 17 }}>
            {money(cf.surplus, c)}
          </div>
          <div className="s">{pct(cf.savingsRatePct)} savings rate</div>
        </div>
      </div>

      {!profile.budget.expenses.length && <Empty>No expenses recorded.</Empty>}
      {profile.budget.expenses.map((e) => (
        <Card key={e.id} id={e.id}>
          <div className="row">
            <span className="name" style={{ fontWeight: 500 }}>{e.name}</span>
            {!e.essential && <span className="chip">discretionary</span>}
            <span className="spacer" />
            <span className="amt">{money(e.amount, c)}</span>
            <button
              className="btn sm ghost"
              onClick={() => {
                updateProfile((p) => ({
                  ...p,
                  budget: { ...p.budget, expenses: p.budget.expenses.filter((x) => x.id !== e.id) },
                }));
                logActivity("system", "ui", `You removed the expense "${e.name}".`);
              }}
            >
              ✕
            </button>
          </div>
        </Card>
      ))}

      {goals && (
        <>
          <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", margin: "16px 0 8px" }}>
            Goals
          </h3>
          {goals.goals.map((g) => (
            <Card key={g.id} id={g.id}>
              <div className="row">
                <span className="name">{g.name}</span>
                <span className={`chip ${g.onTrack ? "" : "hot"}`}>{g.onTrack ? "fundable" : "at risk"}</span>
                <span className="spacer" />
                <span className="amt">{money(g.targetAmount, c)}</span>
              </div>
              <div className="meta">
                <span>Needs <b>{money(g.requiredMonthly, c)}/mo</b></span>
                <span>in <b>{fmtMonths(g.targetMonths)}</b></span>
                <span>saved <b>{money(g.savedSoFar, c)}</b></span>
              </div>
              <div className="bar">
                <i
                  className={g.onTrack ? "" : "danger"}
                  style={{ width: `${Math.min(100, (g.savedSoFar / g.targetAmount) * 100)}%` }}
                />
              </div>
            </Card>
          ))}
          <p className="hint" style={{ marginTop: 10 }}>{goals.note}</p>
        </>
      )}
    </Panel>
  );
}
