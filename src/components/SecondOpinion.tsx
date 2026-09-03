import { useState } from "react";
import { secondOpinion } from "../lib/stances";
import { money, pct } from "../lib/money";
import { useSelector } from "../store/store";
import { Panel } from "./common";

/**
 * Two advisors, same arithmetic, different assumptions. Rendering both makes
 * it obvious that a recommendation is a judgement call rather than a
 * calculation -- and names the single number the judgement turns on.
 */
export function SecondOpinion() {
  const profile = useSelector((s) => s.profile);
  // A sensible default depends on the currency: 3 lakh and 10 thousand are the
  // same kind of "meaningful but not life-changing" sum in their own contexts.
  const suggested = profile.currency === "USD" ? 10_000 : 300_000;
  const [raw, setAmount] = useState<number | null>(null);
  const amount = raw ?? suggested;
  if (!profile.loans.length && !profile.holdings.length) return null;

  const o = secondOpinion(profile, Math.max(1, amount));

  return (
    <Panel
      title="Second opinion"
      actions={
        <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <label style={{ margin: 0 }}>Spare cash</label>
          <input
            style={{ width: 110 }}
            value={amount}
            inputMode="numeric"
            onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
            aria-label="Spare cash to decide about"
          />
        </div>
      }
    >
      <div className={o.agree ? "verdict ok" : "verdict no"} style={{ marginBottom: 10, fontWeight: 600 }}>
        {o.agree ? "✓ Both advisors agree" : "⚡ The advisors disagree"}
      </div>
      <div className="grid2" style={{ gap: 10 }}>
        {o.verdicts.map((v) => (
          <div className="card" key={v.stance.id} style={{ margin: 0 }}>
            <div className="row">
              <span className="name">{v.stance.label}</span>
              <span className="spacer" />
              <span className="chip">{pct(v.stance.expectedReturnPct)} assumed</span>
            </div>
            <p style={{ marginTop: 7, fontSize: 13, fontWeight: 500 }}>{v.headline}</p>
            <p className="hint" style={{ marginTop: 5 }}>{v.reasoning}</p>
            <p className="hint" style={{ marginTop: 6, fontStyle: "italic", color: "var(--dim)" }}>
              “{v.stance.creed}”
            </p>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 11 }}>
        <b style={{ color: "var(--text)" }}>Where it turns:</b> {o.crux}
      </p>
      {o.swingReturnPct !== null && (
        <div className="bar" style={{ marginTop: 10, height: 22, borderRadius: 6, position: "relative" }}>
          <i style={{ width: `${Math.min(100, (o.swingReturnPct / 20) * 100)}%`, background: "var(--accent-dim)" }} />
          <span
            style={{
              position: "absolute",
              left: `${Math.min(96, (o.swingReturnPct / 20) * 100)}%`,
              top: 2,
              transform: "translateX(-50%)",
              fontSize: 11,
              color: "var(--text)",
              whiteSpace: "nowrap",
            }}
          >
            flips at {pct(o.swingReturnPct)}
          </span>
        </div>
      )}
      <p className="hint" style={{ marginTop: 10 }}>{o.synthesis}</p>
      <p className="hint" style={{ marginTop: 8, color: "var(--dim)" }}>
        Deciding {money(Math.max(1, amount), profile.currency)} of spare cash.
      </p>
    </Panel>
  );
}
