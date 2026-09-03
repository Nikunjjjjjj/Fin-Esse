import { netPosition, recommendations, riskExposure } from "../lib/advisor";
import { cashflow, emergencyRunwayMonths } from "../lib/budget";
import { money, pct } from "../lib/money";
import { snapshot } from "../lib/loan";
import { useViewedProfile } from "../store/store";
import { Bar, Empty, Hero, Label, Row, Section, Vital } from "../components/ui";

export function Overview({ go }: { go: (v: string) => void }) {
  const p = useViewedProfile();
  const np = netPosition(p);
  const cf = cashflow(p.budget, p.loans);
  const runway = emergencyRunwayMonths(p);
  const risk = riskExposure(p);
  const top = recommendations(p)[0];
  const assets = Math.max(1, np.totalAssets);
  const share = (n: number) => (n / assets) * 100;

  return (
    <>
      <div className="r d1"><Label>Everything you own, minus everything you owe</Label></div>
      <Hero
        figure={money(np.netWorth)}
        sub={`${money(np.totalAssets)} owned, against ${money(np.totalDebt)} owed`}
      />

      <Bar parts={[
        { pct: share(np.realAssetValue), color: "linear-gradient(90deg,var(--gold-d),var(--gold))" },
        { pct: share(np.portfolioValue), color: "#5C6A7C" },
        { pct: share(np.cashReserve), color: "var(--edge-2)" },
      ]} />
      <div className="legend r d4">
        {np.realAssetValue > 0 && <span>Home {money(np.realAssetValue)}</span>}
        <span>Invested {money(np.portfolioValue)}</span>
        <span>Cash {money(np.cashReserve)}</span>
      </div>

      <div className="vitals">
        <Vital label="Free each month" value={money(cf.surplus)} note="after everything is paid"
          tone={cf.surplus > 0 ? undefined : "warn"} delay="d4" />
        <Vital label="Safety net" value={Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : "∞"}
          note="aim for six" tone={runway < 6 ? "warn" : "good"} delay="d5" />
        <Vital label="Goes to loans" value={p.budget.monthlyIncome > 0 ? pct(cf.emiToIncomePct) : "—"}
          note="of what you earn" tone={cf.emiToIncomePct > 40 ? "warn" : undefined} delay="d6" />
        <Vital label="Overall health" value={Math.round(risk.overallScore)} note="of a hundred" delay="d7" />
      </div>

      {top && (
        <section className="section r d7">
          <Label>Do this first</Label>
          <h2 className="fig">{top.title}</h2>
          <p className="note">{top.why}</p>
          <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 14, fontFamily: "var(--fig)" }}>
            {top.evidence.join(" · ")}
          </p>
          <button className="btn sm" style={{ marginTop: 20 }} onClick={() => go("advice")}>
            See all advice
          </button>
        </section>
      )}

      <Section title="What you owe" delay="d8">
        {!p.loans.length && <Empty>No loans recorded.</Empty>}
        {p.loans.map((l) => {
          const s = snapshot(l);
          return (
            <Row key={l.id} id={l.id} title={l.name} amount={money(s.outstanding)}
              tag={l.annualRatePct > p.expectedPortfolioReturnPct + 3 ? "costly" : undefined} tagTone="hot"
              meta={[pct(l.annualRatePct), <>EMI <b>{money(s.emi)}</b></>, `${Math.round(s.monthsRemaining / 12)} yr left`]} />
          );
        })}
      </Section>
    </>
  );
}
