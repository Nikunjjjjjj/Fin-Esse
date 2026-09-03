import { useSelector } from "../store/store";
import { Panel } from "./common";

const GROUP_COLOR: Record<string, string> = {
  loan: "#fbbf24",
  portfolio: "#4ade80",
  budget: "#7dd3fc",
  advisor: "#c084fc",
};

/**
 * Shows the live tool list exactly as the agent sees it. Because registration
 * is gated on state, this panel visibly grows and shrinks as the user's
 * profile changes -- which is the clearest way to demonstrate that the tool
 * surface is dynamic rather than a static manifest.
 */
export function ToolInspector() {
  const toolNames = useSelector((s) => s.toolNames);
  const status = useSelector((s) => s.webmcpStatus);

  return (
    <Panel title="Registered WebMCP tools" count={toolNames.length} tight>
      <div style={{ padding: "10px 12px 6px" }}>
        <p className="hint">
          {status === "ready"
            ? "Live tool surface, exactly as the agent sees it. It changes as your profile does."
            : "No agent detected here — this is the surface that would be exposed in ChatGPT's browser or Chrome 149+."}
        </p>
      </div>
      <div className="tools">
        {toolNames.map((n) => (
          <div className="toolrow" key={n}>
            <span className="g" style={{ background: GROUP_COLOR[n.split("_")[0]] ?? "#666" }} />
            {n}
          </div>
        ))}
      </div>
    </Panel>
  );
}
