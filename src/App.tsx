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
import { CurrencyToggle } from "./components/CurrencyToggle";
import { HandoffBanner, ShareButton } from "./components/Handoff";
import { SecondOpinion } from "./components/SecondOpinion";
import { Panel } from "./components/common";
import { applyHandoff, exitScenario, loadDemoProfile, logActivity, resetProfile, useSelector } from "./store/store";
import { decodeHandoff, readHandoffFromUrl } from "./lib/handoff";
import { startWebMcp, watchForToolChanges } from "./webmcp/register";
import { webmcpFlavour } from "./webmcp/shim";

/** Example asks, denominated in whichever currency the profile is using. */
function promptsFor(currency: string): string[] {
  const spare = currency === "USD" ? "$10,000" : "₹3,00,000";
  return [
    "Walk me through my finances — what's the state of things?",
    `I've got ${spare} spare. Should I prepay a loan or invest it?`,
    "What happens to me if I lose my job for 9 months and the market crashes?",
    "Open a what-if branch where I clear the credit card, then compare it to today.",
    `Argue both sides: growth advisor vs preservation advisor, on ${spare} spare.`,
    "Package my position into a link I can send my partner's agent.",
  ];
}

export default function App() {
  const status = useSelector((s) => s.webmcpStatus);
  const scenarioMode = useSelector((s) => s.scenarioMode);
  const currency = useSelector((s) => s.profile.currency);
  const hasData = useSelector(
    (s) => s.profile.loans.length + s.profile.holdings.length + s.profile.goals.length > 0,
  );

  useEffect(() => {
    function loadShared(encoded: string) {
      decodeHandoff(encoded)
        .then(applyHandoff)
        .catch((e) => logActivity("system", "handoff", `Could not read that shared position: ${e.message}`));
    }

    // A shared position in the URL fragment wins over everything else: someone
    // followed a handoff link and expects to land on those numbers.
    const shared = readHandoffFromUrl();
    if (shared) {
      loadShared(shared);
    } else if (!new URLSearchParams(location.search).has("empty")) {
      // Judges and first-time visitors should never land on an empty shell.
      loadDemoProfile();
    }

    // Changing only the fragment is a same-document navigation, so pasting a
    // handoff link into an already-open tab never remounts this component.
    // Without this listener that paste would silently do nothing.
    const onHashChange = () => {
      const next = readHandoffFromUrl();
      if (next) loadShared(next);
    };
    addEventListener("hashchange", onHashChange);

    startWebMcp();
    watchForToolChanges();
    return () => removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1>Fin·Esse</h1>
          <span className="tag">financial planning you and an agent do together</span>
        </div>
        <span className="spacer" />
        <CurrencyToggle />
        <ShareButton />
        <button className="btn sm" onClick={() => loadDemoProfile()}>Load sample profile</button>
        <button className="btn sm ghost" onClick={resetProfile}>Clear</button>
        <span className={status === "ready" ? "status ready" : "status"}>
          <span className="dot" />
          {status === "ready" ? `WebMCP live · ${webmcpFlavour()}.modelContext` : "No agent detected"}
        </span>
      </div>

      <HandoffBanner />

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
              <button className="btn primary" onClick={() => loadDemoProfile()}>Load a sample profile</button>
            </Panel>
          )}
          <div className="grid2">
            <Loans />
            <Portfolio />
          </div>
          <SecondOpinion />
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
              {promptsFor(currency).map((p) => (
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
