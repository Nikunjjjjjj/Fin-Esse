import { netPosition, riskExposure } from "../lib/advisor";
import { money } from "../lib/money";
import { useSelector } from "../store/store";
import { Empty, Panel } from "./common";

export function Scenarios() {
  const scenarios = useSelector((s) => s.scenarios);
  const profile = useSelector((s) => s.profile);
  if (!scenarios.length) return null;

  const rows = [
    { name: "Current position", profile, current: true },
    ...scenarios.map((s) => ({ name: s.name, profile: s.profile, current: false })),
  ];

  return (
    <Panel title="Saved scenarios" count={scenarios.length}>
      {!rows.length && <Empty>None saved.</Empty>}
      {rows.map((r, i) => {
        const np = netPosition(r.profile);
        const risk = riskExposure(r.profile);
        return (
          <div className="card" key={i} style={r.current ? { borderColor: "var(--agent-dim)" } : undefined}>
            <div className="row">
              <span className="name">{r.name}</span>
              {r.current && <span className="chip">live</span>}
              <span className="spacer" />
              <span className={`amt ${np.netWorth >= 0 ? "" : ""}`}>{money(np.netWorth, profile.currency)}</span>
            </div>
            <div className="meta">
              <span>Debt <b>{money(np.totalDebt, profile.currency)}</b></span>
              <span>Surplus <b>{money(np.monthlySurplus, profile.currency)}/mo</b></span>
              <span>Risk <b>{risk.overallScore}/100</b></span>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
