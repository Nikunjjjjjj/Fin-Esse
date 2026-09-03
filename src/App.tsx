import { useEffect, useState } from "react";
import { AgentRail } from "./components/AgentRail";
import { CurrencyToggle } from "./components/CurrencyToggle";
import { HandoffBanner, ShareButton } from "./components/Handoff";
import { Logo } from "./components/Logo";
import { Advice } from "./views/Advice";
import { Cashflow } from "./views/Cashflow";
import { Debt } from "./views/Debt";
import { Investments } from "./views/Investments";
import { Overview } from "./views/Overview";
import { WhatIf } from "./views/WhatIf";
import { decodeHandoff, readHandoffFromUrl } from "./lib/handoff";
import { applyHandoff, loadDemoProfile, logActivity, setWorkspace, useSelector } from "./store/store";
import { startWebMcp, watchForToolChanges } from "./webmcp/register";
import { webmcpFlavour } from "./webmcp/shim";

type View = "overview" | "debt" | "investments" | "cashflow" | "advice" | "whatif";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "debt", label: "Debt" },
  { id: "investments", label: "Investments" },
  { id: "cashflow", label: "Cashflow" },
  { id: "advice", label: "Advice" },
];

export default function App() {
  const status = useSelector((s) => s.webmcpStatus);
  const toolCount = useSelector((s) => s.toolNames.length);
  const branch = useSelector((s) => s.scenarioMode);
  const [view, setView] = useState<View>("overview");

  useEffect(() => {
    function loadShared(encoded: string) {
      decodeHandoff(encoded)
        .then(applyHandoff)
        .catch((e) => logActivity("system", "handoff", `Could not read that shared position: ${e.message}`));
    }
    const shared = readHandoffFromUrl();
    if (shared) loadShared(shared);
    else if (!new URLSearchParams(location.search).has("empty")) loadDemoProfile();

    // Changing only the fragment is a same-document navigation, so a pasted
    // handoff link would otherwise do nothing at all.
    const onHash = () => { const n = readHandoffFromUrl(); if (n) loadShared(n); };
    addEventListener("hashchange", onHash);
    startWebMcp();
    watchForToolChanges();
    return () => removeEventListener("hashchange", onHash);
  }, []);

  // A branch that closes while you are looking at it must not strand you.
  useEffect(() => {
    if (!branch && view === "whatif") setView("overview");
  }, [branch, view]);

  function go(next: string) {
    const v = next as View;
    setView(v);
    setWorkspace(v === "whatif" ? "branch" : "real");
    scrollTo({ top: 0 });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">
          <Logo size={36} />
          <span className="name fig">Fin<i>·</i>Esse</span>
        </div>
        <div style={{ flex: 1 }} />
        <nav className="nav">
          {VIEWS.map((v) => (
            <button key={v.id} className={`navi ${view === v.id ? "on" : ""}`} onClick={() => go(v.id)}>
              {v.label}
            </button>
          ))}
          {branch && (
            <button className={`navi branch ${view === "whatif" ? "on" : ""}`} onClick={() => go("whatif")}>
              ⌥ {branch.name}
            </button>
          )}
        </nav>
        <div className="sep" />
        <CurrencyToggle />
        <ShareButton />
        <div className={status === "ready" ? "status ready" : "status"} title={status === "ready" ? `${webmcpFlavour()}.modelContext` : undefined}>
          <span className="dot" />
          {status === "ready" ? `Agent connected · ${toolCount} tools` : "No agent detected"}
        </div>
      </header>

      <HandoffBanner />

      <div className="body">
        <main key={view}>
          {view === "overview" && <Overview go={go} />}
          {view === "debt" && <Debt />}
          {view === "investments" && <Investments />}
          {view === "cashflow" && <Cashflow />}
          {view === "advice" && <Advice />}
          {view === "whatif" && <WhatIf />}
        </main>
        <AgentRail />
      </div>

      <footer className="footer">
        Educational planning tool — not licensed financial advice. Everything here is entered by you or
        simulated, and nothing leaves your browser. ·{" "}
        <a href="https://github.com/Nikunjjjjjj/Fin-Esse" target="_blank" rel="noreferrer">Source</a>
      </footer>
    </div>
  );
}
