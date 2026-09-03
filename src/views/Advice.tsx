import { useState } from "react";
import { recommendations, riskExposure } from "../lib/advisor";
import { secondOpinion } from "../lib/stances";
import { money, pct } from "../lib/money";
import { useViewedProfile } from "../store/store";
import { Label, PageHead, Section } from "../components/ui";

export function Advice() {
  const p = useViewedProfile();
  const recs = recommendations(p);
  const risk = riskExposure(p);
  const suggested = p.currency === "USD" ? 10_000 : 300_000;
  const [raw, setRaw] = useState<number | null>(null);
  const amount = Math.max(1, raw ?? suggested);
  const canCompare = p.loans.length > 0 || p.holdings.length > 0;
  const o = canCompare ? secondOpinion(p, amount) : null;

  return (
    <>
      <PageHead eyebrow="Advice" title={`${recs.length} move${recs.length === 1 ? "" : "s"}, in order`}
        sub="Every item names the tools that produced its evidence, so you can check the reasoning rather than take it on trust." />

      <Section title="Prioritised" delay="d3">
        {recs.map((r, i) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0 20px", padding: "22px 0", borderBottom: "1px solid var(--edge)" }}>
            <div className="fig" style={{ fontSize: 34, color: i === 0 ? "var(--coral)" : "var(--faint)", lineHeight: 1 }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <div className="fig" style={{ fontSize: 21, lineHeight: 1.35 }}>{r.title}</div>
              <p style={{ marginTop: 8, maxWidth: "62ch", lineHeight: 1.7 }}>{r.action}</p>
              <p style={{ marginTop: 8, color: "var(--muted)", maxWidth: "62ch", lineHeight: 1.7 }}>{r.why}</p>
              <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 12, fontFamily: "var(--fig)" }}>{r.evidence.join(" · ")}</p>
            </div>
          </div>
        ))}
      </Section>

      {o && (
        <Section title="Second opinion" delay="d6">
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <Label>Spare cash</Label>
            <input style={{ width: 130 }} value={amount} inputMode="numeric" aria-label="Spare cash to decide about"
              onChange={(e) => setRaw(Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </div>

          <div style={{ color: o.agree ? "var(--jade)" : "var(--coral)", fontSize: 14, marginBottom: 20 }}>
            {o.agree ? "Both advisors agree" : "The advisors disagree"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {o.verdicts.map((v) => (
              <div key={v.stance.id}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div className="fig" style={{ fontSize: 18 }}>{v.stance.label}</div>
                  <div style={{ flex: 1 }} />
                  <span className="tag">{pct(v.stance.expectedReturnPct)} assumed</span>
                </div>
                <p style={{ marginTop: 12, lineHeight: 1.6 }}>{v.headline}</p>
                <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>{v.reasoning}</p>
                <p style={{ marginTop: 10, color: "var(--faint)", fontSize: 12.5, fontStyle: "italic", lineHeight: 1.6 }}>
                  “{v.stance.creed}”
                </p>
              </div>
            ))}
          </div>

          <p className="note"><b>Where it turns:</b> {o.crux}</p>
          <p className="note">{o.synthesis}</p>
        </Section>
      )}

      <Section title="How the health score is built" delay="d8">
        {risk.factors.map((f) => (
          <div className="row" key={f.name}>
            <div className="t">
              <span>{f.name}</span>
              <span className={`tag ${f.verdict === "stretched" ? "hot" : f.verdict === "healthy" ? "good" : ""}`}>{f.verdict}</span>
            </div>
            <div className="a">{Math.round(f.score)}</div>
            <div className="m"><span>{f.value}</span><span>{f.comment}</span></div>
          </div>
        ))}
        <p className="note">
          Overall {Math.round(risk.overallScore)} of 100 — {risk.band}. Each factor is weighted;
          {" "}{money(0).slice(0, 0)}the dominant pressure is what the summary names.
        </p>
      </Section>
    </>
  );
}
