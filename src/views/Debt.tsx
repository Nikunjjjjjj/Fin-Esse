import { snapshot, totalMonthlyEmi, totalOutstanding } from "../lib/loan";
import { prepayVsInvest } from "../lib/advisor";
import { money, months as fmtMonths, pct } from "../lib/money";
import { useViewedProfile } from "../store/store";
import { Empty, Hero, Label, PageHead, Row, Section } from "../components/ui";

export function Debt() {
  const p = useViewedProfile();
  if (!p.loans.length) {
    return (
      <>
        <PageHead eyebrow="Debt" title="Nothing owed" sub="No loans are recorded on this profile." />
        <div style={{ marginTop: 30 }}><Empty>Add a loan, or ask the agent to.</Empty></div>
      </>
    );
  }

  const byCost = [...p.loans].sort((a, b) => b.annualRatePct - a.annualRatePct);
  const dearest = byCost[0];
  const cheapest = byCost[byCost.length - 1];
  const spare = Math.round(Math.max(50_000, p.budget.cashReserve * 0.3));
  const cmp = prepayVsInvest(p, spare, 60);

  return (
    <>
      <div className="r d1"><Label>Debt</Label></div>
      <Hero figure={money(totalOutstanding(p.loans))}
        sub={`across ${p.loans.length} loan${p.loans.length === 1 ? "" : "s"} · ${money(totalMonthlyEmi(p.loans))} a month`} />

      <Section title="Sorted by cost, not by size" delay="d3">
        {byCost.map((l) => {
          const s = snapshot(l);
          return (
            <Row key={l.id} id={l.id} title={l.name} amount={money(s.outstanding)}
              tag={l.annualRatePct > p.expectedPortfolioReturnPct + 3 ? "costly" : undefined} tagTone="hot"
              meta={[
                <>Rate <b>{pct(l.annualRatePct)}</b></>,
                <>EMI <b>{money(s.emi)}</b></>,
                <>Interest still to pay <b>{money(s.interestRemaining)}</b></>,
                `${l.monthsPaid} of ${l.termMonths} paid`,
              ]} />
          );
        })}
        {byCost.length > 1 && (
          <p className="note">
            {cheapest.name} carries <b>{money(snapshot(cheapest).interestRemaining)}</b> of interest still to
            pay — far more in absolute terms than {dearest.name}. But at {pct(cheapest.annualRatePct)} it is
            cheaper than the {pct(p.expectedPortfolioReturnPct)} your investments are assumed to earn, so
            paying it down early costs you money. <b>Size and cost point in opposite directions.</b>
          </p>
        )}
      </Section>

      <Section title={`If you put ${money(spare)} against one of them`} delay="d6">
        {cmp.options.map((o) => (
          <Row key={o.loanId} id={o.loanId} title={o.loanName}
            amount={`${o.advantage >= 0 ? "+" : "−"}${money(Math.abs(o.advantage))}`}
            tag={o.winner === "prepay" ? "prepay wins" : "investing wins"}
            tagTone={o.winner === "prepay" ? "good" : undefined}
            meta={[
              `${pct(o.annualRatePct)} vs ${pct(p.expectedPortfolioReturnPct)} assumed`,
              o.loanClearedAtMonth !== null ? `clears in ${fmtMonths(o.loanClearedAtMonth)}` : "still running at the horizon",
            ]} />
        ))}
        <p className="note">
          The figure is how much better or worse off you are after five years compared with investing the same
          cash, with the freed-up instalment reinvested in both paths.
        </p>
      </Section>
    </>
  );
}
