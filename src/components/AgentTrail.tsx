import { useSelector } from "../store/store";
import { Empty, Panel } from "./common";

function ago(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

const LABEL: Record<string, string> = {
  read: "read",
  write: "wrote",
  propose: "proposed",
  approve: "approved",
  reject: "rejected",
  compute: "computed",
  system: "app",
};

/**
 * The live record of what the agent has done. Without this the human only sees
 * the agent's conclusion; with it they can see which parts of their financial
 * picture were actually consulted to reach it.
 */
export function AgentTrail() {
  const activity = useSelector((s) => s.activity);

  return (
    <Panel title="Agent activity" count={activity.length} tight>
      {!activity.length && (
        <div style={{ padding: 12 }}>
          <Empty>Nothing yet. Tool calls appear here the moment an agent makes them.</Empty>
        </div>
      )}
      <div className="trail">
        {activity.map((e) => (
          <div className="evt" key={e.id}>
            <span className={`k ${e.kind}`}>{LABEL[e.kind] ?? e.kind}</span>
            <div>
              <div>
                <span className="tool">{e.tool}</span>
                <span style={{ color: "var(--dim)", fontSize: 11, marginLeft: 6 }}>{ago(e.at)} ago</span>
              </div>
              <div className="detail">{e.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
