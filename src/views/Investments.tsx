import { ASSET_META, allocation, expectedReturnPct, holdingValue, portfolioValue, riskScore, volatilityPct } from "../lib/portfolio";
import { money, pct } from "../lib/money";
import { useSelector, useViewedProfile } from "../store/store";
import { Bar, Empty, Hero, Label, PageHead, Row, Section } from "../components/ui";

const TONE: Record<string, string> = {
  equity: "linear-gradient(90deg,var(--gold-d),var(--gold))",
  crypto: "var(--coral)",
  debt: "#5C6A7C",
  gold: "#B8934A",
  cash: "var(--edge-2)",
  real_estate: "#6E7C8A",
};

export function Investments() {
  const p = useViewedProfile();
  const read = useSelector((s) => s.marketRead);
  if (!p.holdings.length && !p.realAssets.length) {
    return <PageHead eyebrow="Investments" title="Nothing invested yet" sub="Add a holding, or ask the agent to read one off a statement." />;
  }

  const total = portfolioValue(p.holdings);
  const slices = allocation(p.holdings);
  const risk = riskScore(p.holdings);
  const largest = [...p.holdings].sort((a, b) => holdingValue(b) - holdingValue(a))[0];
  const largestPct = largest && total > 0 ? (holdingValue(largest) / total) * 100 : 0;

  return (
    <>
      <div className="r d1"><Label>Investments</Label></div>
      <Hero figure={money(total)}
        sub={p.realAssets.length ? `invested, plus ${money(p.realAssets.reduce((s, a) => s + a.value, 0))} of property held outside the portfolio` : "invested"} />

      {slices.length > 0 && (
        <>
          <Bar parts={slices.map((s) => ({ pct: s.weightPct, color: TONE[s.assetClass] ?? "var(--edge-2)" }))} />
          <div className="legend r d4">
            {slices.map((s) => <span key={s.assetClass}>{s.label} {pct(s.weightPct)}</span>)}
          </div>
        </>
      )}

      <div className="vitals">
        <div className="vital r d4"><Label>Expected return</Label><div className="v">{pct(expectedReturnPct(p.holdings))}</div><div className="n">blended by asset class</div></div>
        <div className="vital r d5"><Label>Volatility</Label><div className="v">{pct(volatilityPct(p.holdings))}</div><div className="n">blended</div></div>
        <div className="vital r d6"><Label>Risk score</Label><div className={`v ${risk > 65 ? "warn" : ""}`}>{Math.round(risk)}</div><div className="n">concentration and volatility</div></div>
        <div className="vital r d7"><Label>Positions</Label><div className="v">{p.holdings.length}</div><div className="n">across {slices.length} asset classes</div></div>
      </div>

      {read && (
        <section className="section r d6">
          <Label>What the agent read</Label>
          <p style={{ marginTop: 14, lineHeight: 1.7 }}>{read.headline}</p>
          <div style={{ marginTop: 18 }}>
            {read.conditions.map((c, i) => (
              <div className="row" key={i}>
                <div className="t"><span>{c.label}</span></div>
                <div className="a" style={{ color: c.changePct < 0 ? "var(--coral)" : "var(--jade)" }}>
                  {c.changePct > 0 ? "+" : ""}{c.changePct}%
                </div>
                <div className="m">
                  <span>{c.note}</span>
                  {c.source && <span style={{ color: "var(--faint)" }}>{c.source}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="note">
            A what-if on today's holdings, not a forecast, and prices in the app are unchanged. The figures
            come from the agent's own research — judge the sources before you act on it.
          </p>
        </section>
      )}

      <Section title="Holdings" delay="d7">
        {!p.holdings.length && <Empty>No investable holdings.</Empty>}
        {[...p.holdings].sort((a, b) => holdingValue(b) - holdingValue(a)).map((h) => (
          <Row key={h.id} id={h.id} title={h.name} amount={money(holdingValue(h))}
            tag={h.id === largest?.id && largestPct > 30 ? `${pct(largestPct)} of portfolio` : undefined}
            tagTone={largestPct > 40 ? "hot" : "gold"}
            meta={[h.symbol, <>{h.units} × <b>{money(h.price)}</b></>, ASSET_META[h.assetClass].label]} />
        ))}
      </Section>

      {p.realAssets.length > 0 && (
        <Section title="Property and other real assets" delay="d8">
          <p className="note" style={{ marginTop: 0, marginBottom: 18 }}>
            Counted in net worth, excluded from allocation, rebalancing and concentration risk — you cannot
            sell a third of the house you live in. A broad market shock still marks it down.
          </p>
          {p.realAssets.map((a) => (
            <Row key={a.id} id={a.id} title={a.name} amount={money(a.value)} meta={["not investable"]} />
          ))}
        </Section>
      )}
    </>
  );
}
