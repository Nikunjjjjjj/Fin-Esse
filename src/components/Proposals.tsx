import { resolveProposal, useSelector } from "../store/store";
import { Empty, Panel } from "./common";

/**
 * The consent layer. Agents can propose consequential changes but cannot make
 * them: a proposal carries its own apply() closure and is only ever executed
 * by a human clicking approve here.
 */
export function Proposals() {
  const proposals = useSelector((s) => s.proposals);
  const pending = proposals.filter((p) => p.status === "pending");

  return (
    <Panel title="Awaiting your approval" count={pending.length}>
      {!proposals.length && (
        <Empty>
          When the agent wants to change something consequential — a prepayment, a rebalance — it lands here
          first. Nothing is applied without your click.
        </Empty>
      )}
      {proposals.map((p) => (
        <div className={p.status === "pending" ? "prop" : "prop done"} key={p.id}>
          <h4>{p.title}</h4>
          <p className="why">{p.summary}</p>
          <ul>
            {p.effects.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {p.status === "pending" ? (
            <div className="acts">
              <button className="btn primary sm" onClick={() => resolveProposal(p.id, "approved")}>
                Approve
              </button>
              <button className="btn danger sm" onClick={() => resolveProposal(p.id, "rejected")}>
                Reject
              </button>
            </div>
          ) : (
            <div className={`verdict ${p.status === "approved" ? "ok" : "no"}`}>
              {p.status === "approved" ? "✓ You approved this — it has been applied." : "✕ You rejected this — nothing changed."}
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}
