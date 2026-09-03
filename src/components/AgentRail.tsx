import { money } from "../lib/money";
import { resolveProposal, useSelector } from "../store/store";
import { Empty, Label } from "./ui";

const KIND: Record<string, string> = {
  read: "read", write: "wrote", propose: "asked",
  approve: "approved", reject: "declined", compute: "ran", system: "app",
};

/**
 * Pinned on every view: approvals and the tool trail are global state, not a
 * page. The approval is the only thing here that gets a border, because it is
 * the only thing asking the person to act.
 */
export function AgentRail() {
  const proposals = useSelector((s) => s.proposals);
  const activity = useSelector((s) => s.activity);
  const pending = proposals.filter((p) => p.status === "pending");
  const recent = proposals.filter((p) => p.status !== "pending").slice(0, 2);

  return (
    <aside className="rail">
      <div className="r d3">
        <Label tone={pending.length ? "var(--coral)" : undefined}>
          {pending.length ? "Awaiting your decision" : "Nothing to decide"}
        </Label>

        {!pending.length && !recent.length && (
          <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 14, lineHeight: 1.7 }}>
            When the agent wants to change something — a prepayment, a rebalance, anything at all — it lands
            here first. Nothing touches your money without your click.
          </p>
        )}

        {pending.map((p) => (
          <div className="card ask lift" key={p.id} style={{ marginTop: 15 }}>
            <div className="fig" style={{ fontSize: 22, lineHeight: 1.35 }}>{p.title}</div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 10, lineHeight: 1.65 }}>{p.summary}</p>
            <div style={{ marginTop: 20 }}>
              {p.effects.map((e, i) => {
                const [k, ...rest] = e.split(/\s(.+)/);
                return (
                  <div className="kv" key={i}>
                    <span>{k}</span>
                    <span>{rest.join(" ") || ""}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button className="btn gold" style={{ flex: 1 }} onClick={() => resolveProposal(p.id, "approved")}>
                Approve
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => resolveProposal(p.id, "rejected")}>
                Decline
              </button>
            </div>
          </div>
        ))}

        {recent.map((p) => (
          <p key={p.id} style={{ fontSize: 12.5, marginTop: 14, color: p.status === "approved" ? "var(--jade)" : "var(--faint)" }}>
            {p.status === "approved" ? "Applied" : "Declined"} — {p.title}
          </p>
        ))}
      </div>

      <MarketRead />

      <div className="r d5">
        <Label>Agent activity</Label>
        {!activity.length && <div style={{ marginTop: 14 }}><Empty>Tool calls appear here as they happen.</Empty></div>}
        <div className="trail" style={{ marginTop: 18 }}>
          {activity.slice(0, 14).map((e) => (
            <div className="evt" key={e.id}>
              <span className={`k ${e.kind}`}>{KIND[e.kind] ?? e.kind}</span>
              <span className="d">
                <code>{e.tool}</code>
                <br />
                {e.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/**
 * A market read is global, not a property of the Investments page — someone
 * who asked "what is happening out there" should see the answer wherever they
 * happen to be standing.
 */
function MarketRead() {
  const read = useSelector((s) => s.marketRead);
  if (!read) return null;
  const age = Math.round((Date.now() - read.at) / 60000);
  return (
    <div className="r d4">
      <Label>Market read · {age === 0 ? "just now" : `${age} min ago`}</Label>
      <div style={{ marginTop: 14 }}>
        {read.conditions.map((c, i) => (
          <div className="kv" key={i}>
            <span title={c.note}>{c.label}</span>
            <span style={{ color: c.changePct < 0 ? "var(--coral)" : "var(--jade)" }}>
              {c.changePct > 0 ? "+" : ""}{c.changePct}%
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.6 }}>
        Portfolio {read.changePct > 0 ? "+" : ""}{read.changePct}% on these readings. Detail on Investments.
      </p>
    </div>
  );
}

export function moneyOr(n: number | undefined, fallback = "—") {
  return n === undefined ? fallback : money(n);
}
