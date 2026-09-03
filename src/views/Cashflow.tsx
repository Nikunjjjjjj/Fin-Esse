import { assessAllGoals, cashflow } from "../lib/budget";
import { money, months as fmtMonths, pct } from "../lib/money";
import { useViewedProfile } from "../store/store";
import { Empty, Hero, Label, PageHead, Row, Section, Vital } from "../components/ui";

export function Cashflow() {
  const p = useViewedProfile();
  const cf = cashflow(p.budget, p.loans);
  if (!p.budget.monthlyIncome && !p.budget.expenses.length) {
    return <PageHead eyebrow="Cashflow" title="No income or spending recorded" sub="Set your income and expenses, or ask the agent to." />;
  }
  const goals = p.goals.length ? assessAllGoals(p) : null;

  return (
    <>
      <div className="r d1"><Label>Cashflow</Label></div>
      <Hero figure={money(cf.surplus)}
        sub={`free each month, after ${money(cf.totalExpenses + cf.totalEmi)} of outgoings — a ${pct(cf.savingsRatePct)} savings rate`} />

      <div className="vitals" style={{ marginTop: 44 }}>
        <Vital label="Income" value={money(cf.monthlyIncome)} note="monthly take-home" delay="d3" />
        <Vital label="Essentials" value={money(cf.essentialExpenses)} note="cannot be cut" delay="d4" />
        <Vital label="Discretionary" value={money(cf.discretionaryExpenses)} note="could be cut" delay="d5" />
        <Vital label="Loan payments" value={money(cf.totalEmi)} note={`${pct(cf.emiToIncomePct)} of income`}
          tone={cf.emiToIncomePct > 40 ? "warn" : undefined} delay="d6" />
      </div>

      <Section title="Where it goes" delay="d6">
        {!p.budget.expenses.length && <Empty>No expenses recorded.</Empty>}
        {[...p.budget.expenses].sort((a, b) => b.amount - a.amount).map((e) => (
          <Row key={e.id} id={e.id} title={e.name} amount={money(e.amount)}
            tag={e.essential ? undefined : "discretionary"} tagTone="gold"
            meta={[e.essential ? "essential" : "the only lines with give in them"]} />
        ))}
      </Section>

      {goals && (
        <Section title="Goals" delay="d7">
          {goals.goals.map((g) => (
            <Row key={g.id} id={g.id} title={g.name} amount={money(g.targetAmount)}
              tag={g.onTrack ? "fundable" : "at risk"} tagTone={g.onTrack ? "good" : "hot"}
              meta={[<>needs <b>{money(g.requiredMonthly)}</b>/mo</>, `in ${fmtMonths(g.targetMonths)}`, <>saved <b>{money(g.savedSoFar)}</b></>]} />
          ))}
          <p className="note">{goals.note}</p>
        </Section>
      )}
    </>
  );
}
