import { recommendations } from "../lib/advisor";
import { useSelector } from "../store/store";
import { Panel } from "./common";

export function Recommendations() {
  const profile = useSelector((s) => s.profile);
  const recs = recommendations(profile);

  return (
    <Panel title="What to do next" count={recs.length}>
      {recs.map((r) => (
        <div className="card" key={r.id}>
          <div className="row">
            <span className="chip">{r.priority}</span>
            <span className="name">{r.title}</span>
          </div>
          <p className="hint" style={{ marginTop: 6, color: "var(--muted)" }}>{r.action}</p>
          <p className="hint" style={{ marginTop: 5 }}>{r.why}</p>
          <div className="meta" style={{ marginTop: 7 }}>
            <span style={{ color: "var(--dim)", fontSize: 11 }}>
              evidence: {r.evidence.join(", ")}
            </span>
          </div>
        </div>
      ))}
    </Panel>
  );
}
