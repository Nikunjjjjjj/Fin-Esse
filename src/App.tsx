import { useEffect } from "react";
import { AgentTrail } from "./components/AgentTrail";
import { BudgetGoals } from "./components/BudgetGoals";
import { Loans } from "./components/Loans";
import { NetPosition } from "./components/NetPosition";
import { Portfolio } from "./components/Portfolio";
import { Proposals } from "./components/Proposals";
import { Recommendations } from "./components/Recommendations";
import { Scenarios } from "./components/Scenarios";
import { ToolInspector } from "./components/ToolInspector";
import { Panel } from "./components/common";
import { exitScenario, loadDemoProfile, resetProfile, useSelector } from "./store/store";
import { startWebMcp, watchForToolChanges } from "./webmcp/register";
import { webmcpFlavour } from "./webmcp/shim";

const PROMPTS = [
  "Walk me through my finances — what's the state of things?",
  "I've got ₹3,00,000 spare. Should I prepay a loan or invest it?",
  "What happens to me if I lose my job for 9 months and the market crashes?",
  "Open a what-if branch where I clear the credit card, then compare it to today.",
];

export default function App() {
  const status = useSelector((s) => s.webmcpStatus);
  const scenarioMode = useSelector((s) => s.scenarioMode);
  const hasData = useSelector(
    (s) => s.profile.loans.length + s.profile.holdings.length + s.profile.goals.length > 0,
  );

  useEffect(() => {
    // Judges and first-time visitors should never land on an empty shell, so
    // the sample profile loads by default. ?empty=1 gives the blank slate.
    if (!new URLSearchParams(location.search).has("empty")) loadDemoProfile();
    startWebMcp();
    watchForToolChanges();
  }, []);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1>Fin·Esse</h1>
          <span className="tag">financial planning you and an agent do together</span>
        </div>
        <span className="spacer" />
        <button className="btn sm" onClick={loadDemoProfile}>Load sample profile</button>
        <button className="btn sm ghost" onClick={resetProfile}>Clear</button>
        <span className={status === "ready" ? "status ready" : "status"}>
          <span className="dot" />
          {status === "ready" ? `WebMCP live · ${webmcpFlavour()}.modelContext` : "No agent detected"}
        </span>
      </div>

      {scenarioMode && (
        <div className="scenario-banner">
          <strong>What-if branch: “{scenarioMode.name}”</strong>
          <span>— you are looking at a sandbox. Your real profile is untouched.</span>
          <span className="spacer" />
          <button className="btn sm" onClick={() => exitScenario(false)}>Discard</button>
          <button className="btn sm primary" onClick={() => exitScenario(true)}>Keep changes</button>
        </div>
      )}

      <div className="layout">
        <div className="main">
          <NetPosition />
          {!hasData && (
            <Panel title="Start here">
              <p className="hint" style={{ marginBottom: 12 }}>
                Fin·Esse works as an ordinary financial planner on its own — add your loans, holdings and goals
                below and everything computes live. Opened inside an AI browser, the same capabilities are also
                exposed as WebMCP tools, so an agent can reason across all of it with you.
              </p>
              <button className="btn primary" onClick={loadDemoProfile}>Load a sample profile</button>
            </Panel>
          )}
          <div className="grid2">
            <Loans />
            <Portfolio />
          </div>
          <div className="grid2">
            <BudgetGoals />
            <Recommendations />
          </div>
          <Scenarios />
        </div>

        <div className="side">
          <Proposals />
          <AgentTrail />
          <Panel title="Try asking the agent">
            <div className="prompts">
              {PROMPTS.map((p) => (
                <button
                  className="prompt"
                  key={p}
                  onClick={() => navigator.clipboard?.writeText(p)}
                  title="Copy to clipboard"
                >
                  “{p}”
                </button>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              {status === "ready"
                ? "Ask in the chat panel and watch the cards on the left light up as the agent reads them."
                : "Open this page in ChatGPT's in-app browser, or Chrome 149+ with chrome://flags/#enable-webmcp-testing enabled."}
            </p>
          </Panel>
          <ToolInspector />
        </div>
      </div>

      <footer className="footer">
        Educational planning tool — not licensed financial advice. All data is entered by you or simulated;
        nothing leaves your browser. ·{" "}
        <a href="https://github.com/Nikunjjjjjj/Fin-Esse" target="_blank" rel="noreferrer">Source</a>
      </footer>
    </div>
  );
}
