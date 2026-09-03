import { ASSET_META, allocation, expectedReturnPct, holdingValue, portfolioValue, riskScore, volatilityPct } from "../lib/portfolio";
import { money, pct } from "../lib/money";
import { logActivity, updateProfile, useSelector } from "../store/store";
import type { AssetClass } from "../types";
import { Card, Empty, Panel } from "./common";

const COLORS: Record<AssetClass, string> = {
  equity: "#4ade80",
  debt: "#7dd3fc",
  gold: "#fbbf24",
  cash: "#94a3b8",
  crypto: "#c084fc",
  real_estate: "#fb923c",
};

export function Portfolio() {
  const profile = useSelector((s) => s.profile);
  const c = profile.currency;
  const slices = allocation(profile.holdings);
  const total = portfolioValue(profile.holdings);
  const risk = riskScore(profile.holdings);

  return (
    <Panel title="Portfolio" count={profile.holdings.length}>
      {!profile.holdings.length && <Empty>No holdings yet.</Empty>}
      {profile.holdings.length > 0 && (
        <>
          <div className="alloc-bar">
            {slices.map((s) => (
              <i
                key={s.assetClass}
                title={`${s.label} ${pct(s.weightPct)}`}
                style={{ width: `${s.weightPct}%`, background: COLORS[s.assetClass] }}
              />
            ))}
          </div>
          <div className="alloc-legend">
            {slices.map((s) => (
              <div className="li" key={s.assetClass}>
                <span className="sw" style={{ background: COLORS[s.assetClass] }} />
                <span>{s.label}</span>
                <span className="spacer" />
                <b>{pct(s.weightPct)}</b>
              </div>
            ))}
          </div>
          <div className="meta" style={{ marginTop: 12, marginBottom: 12, color: "var(--muted)", fontSize: 12, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>Value <b style={{ color: "var(--text)" }}>{money(total, c)}</b></span>
            <span>Expected <b style={{ color: "var(--text)" }}>{pct(expectedReturnPct(profile.holdings))}</b></span>
            <span>Volatility <b style={{ color: "var(--text)" }}>{pct(volatilityPct(profile.holdings))}</b></span>
            <span>Risk <b style={{ color: risk > 60 ? "var(--danger)" : "var(--text)" }}>{risk}/100</b></span>
          </div>
          {profile.holdings.map((h) => (
            <Card key={h.id} id={h.id}>
              <div className="row">
                <span className="sw" style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[h.assetClass], display: "inline-block" }} />
                <span className="name">{h.symbol}</span>
                <span className="chip">{ASSET_META[h.assetClass].label}</span>
                <span className="spacer" />
                <span className="amt">{money(holdingValue(h), c)}</span>
              </div>
              <div className="meta">
                <span>{h.name}</span>
                <span className="spacer" />
                <span>{h.units} × {money(h.price, c)}</span>
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    updateProfile((p) => ({ ...p, holdings: p.holdings.filter((x) => x.id !== h.id) }));
                    logActivity("system", "ui", `You removed the holding ${h.symbol}.`);
                  }}
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </>
      )}
      {profile.realAssets.length > 0 && (
        <>
          <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", margin: "16px 0 8px" }}>
            Property &amp; other real assets
          </h3>
          <p className="hint" style={{ marginBottom: 8 }}>
            Counted in net worth, excluded from allocation and rebalancing — you cannot sell a third of the
            house you live in.
          </p>
          {profile.realAssets.map((a) => (
            <Card key={a.id} id={a.id}>
              <div className="row">
                <span className="name">{a.name}</span>
                <span className="spacer" />
                <span className="amt">{money(a.value, c)}</span>
              </div>
            </Card>
          ))}
        </>
      )}
    </Panel>
  );
}
