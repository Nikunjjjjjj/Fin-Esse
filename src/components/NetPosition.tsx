import { netPosition, riskExposure } from "../lib/advisor";
import { emergencyRunwayMonths } from "../lib/budget";
import { money, pct } from "../lib/money";
import { useSelector } from "../store/store";
import { Panel } from "./common";

export function NetPosition() {
  const profile = useSelector((s) => s.profile);
  const np = netPosition(profile);
  const risk = riskExposure(profile);
  const runway = emergencyRunwayMonths(profile);
  const c = profile.currency;

  const riskClass = risk.band === "resilient" ? "" : risk.band === "adequate" ? "warn" : "danger";

  return (
    <Panel title="Net position" tight>
      <div className="netgrid">
        <div className="netcell">
          <div className="k">Net worth</div>
          <div className={`v ${np.netWorth >= 0 ? "pos" : "neg"}`}>{money(np.netWorth, c)}</div>
          <div className="s">
            {money(np.totalAssets, c)} assets − {money(np.totalDebt, c)} debt
          </div>
        </div>
        <div className="netcell">
          <div className="k">Investable</div>
          <div className="v">{money(np.portfolioValue, c)}</div>
          <div className="s">
            plus {money(np.cashReserve, c)} cash
            {np.realAssetValue > 0 && ` · ${money(np.realAssetValue, c)} property`}
          </div>
        </div>
        <div className="netcell">
          <div className="k">Monthly surplus</div>
          <div className={`v ${np.monthlySurplus >= 0 ? "pos" : "neg"}`}>
            {money(np.monthlySurplus, c)}
          </div>
          <div className="s">after {money(np.monthlyEmi, c)} of EMIs</div>
        </div>
        <div className="netcell">
          <div className="k">Exposure</div>
          <div className="v">{risk.overallScore}<span style={{ fontSize: 13, color: "var(--dim)" }}>/100</span></div>
          <div className="s">{risk.band}</div>
          <div className="bar">
            <i className={riskClass} style={{ width: `${Math.min(100, risk.overallScore)}%` }} />
          </div>
        </div>
        <div className="netcell">
          <div className="k">Emergency runway</div>
          <div className={`v ${runway >= 6 ? "pos" : "neg"}`}>
            {Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : "∞"}
          </div>
          <div className="s">target 6 months</div>
        </div>
        <div className="netcell">
          <div className="k">Debt service</div>
          <div className={`v ${np.monthlyEmi / Math.max(1, profile.budget.monthlyIncome) > 0.4 ? "neg" : ""}`}>
            {profile.budget.monthlyIncome > 0
              ? pct((np.monthlyEmi / profile.budget.monthlyIncome) * 100)
              : "—"}
          </div>
          <div className="s">of income; 40% is the usual ceiling</div>
        </div>
      </div>
    </Panel>
  );
}
