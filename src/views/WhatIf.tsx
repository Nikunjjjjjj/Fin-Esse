import { diffProfiles } from "../lib/diff";
import { exitScenario, getState, setWorkspace, useSelector } from "../store/store";
import { Empty, PageHead, Section } from "../components/ui";

const VERDICT: Record<string, { text: string; color: string }> = {
  better: { text: "improved", color: "var(--jade)" },
  worse: { text: "worse", color: "var(--coral)" },
  flat: { text: "unchanged", color: "var(--faint)" },
};

function verdictOf(better: boolean | null, direction: string) {
  if (direction === "flat" || better === null) return VERDICT.flat;
  return better ? VERDICT.better : VERDICT.worse;
}

/**
 * The branch is a place you visit, not a mode the app enters: the other five
 * views keep showing the real position the whole time, one switch away.
 */
export function WhatIf() {
  const mode = useSelector((s) => s.scenarioMode);
  const profile = useSelector((s) => s.profile);
  const workspace = useSelector((s) => s.workspace);
  if (!mode) return <PageHead eyebrow="What-if" title="No branch open" sub="Ask the agent to open one." />;

  const d = diffProfiles(mode.baseline, profile);
  const entities = [...d.loans, ...d.holdings, ...d.goals].filter((e) => e.status !== "unchanged");

  return (
    <>
      <div className="r d1" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", border: "1px solid var(--edge)" }}>
          <button className="btn sm" style={{ border: 0, background: workspace === "real" ? "var(--raise)" : "transparent", color: workspace === "real" ? "var(--ink)" : "var(--muted)" }}
            onClick={() => setWorkspace("real")}>Your position</button>
          <button className="btn sm" style={{ border: 0, borderLeft: "1px solid var(--edge)", background: workspace === "branch" ? "var(--raise)" : "transparent", color: workspace === "branch" ? "var(--ink)" : "var(--muted)" }}
            onClick={() => setWorkspace("branch")}>What-if</button>
        </div>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Your five real pages are unchanged and one click away.</span>
      </div>

      <PageHead eyebrow="What-if branch" title={mode.name}
        sub="A throwaway fork of your whole position. Nothing here touches your real numbers unless you keep it." />

      <div className="r d2" style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button className="btn" onClick={() => exitScenario(false)}>Discard</button>
        <button className="btn gold" onClick={() => exitScenario(true)}>Keep these changes</button>
      </div>

      <p className="note r d3">{d.summary}</p>

      <Section title="Headline" delay="d4">
        <div className="diff" style={{ borderBottom: "1px solid var(--edge-2)", paddingBottom: 10 }}>
          <div style={{ fontSize: 13 }}>Measure</div>
          <div className="lbl">Your position</div>
          <div className="lbl">In this branch</div>
          <div />
        </div>
        {d.headline.map((f) => {
          const v = verdictOf(f.better, f.direction);
          return (
            <div className="diff" key={f.label}>
              <div style={{ fontSize: 14 }}>{f.label}</div>
              <div className="b">{f.before}</div>
              <div className="a">{f.after}</div>
              <div className="verdict" style={{ color: v.color }}>{v.text}</div>
            </div>
          );
        })}
      </Section>

      <Section title="What changed" delay="d6">
        {!entities.length && !d.budget.length && <Empty>Nothing has been changed in this branch yet.</Empty>}
        {entities.map((e) => (
          <div className="row" key={e.id}>
            <div className="t">
              <span>{e.name}</span>
              <span className={`tag ${e.status === "removed" ? "hot" : e.status === "added" ? "good" : ""}`}>{e.status}</span>
            </div>
            <div className="a" />
            <div className="m">
              {e.deltas.map((x, i) => <span key={i}>{x.label} <b>{x.before} → {x.after}</b></span>)}
            </div>
          </div>
        ))}
        {d.budget.map((f) => {
          const v = verdictOf(f.better, f.direction);
          return (
            <div className="row" key={f.label}>
              <div className="t"><span>{f.label}</span></div>
              <div className="a">{f.after}</div>
              <div className="m"><span>was <b>{f.before}</b></span><span style={{ color: v.color }}>{v.text}</span></div>
            </div>
          );
        })}
        <p className="note">
          Direction is not the same as good. Debt falling is an improvement; net worth falling is not — so a
          change can improve several measures and set one back.
        </p>
      </Section>
    </>
  );
}

export function branchName(): string | null {
  return getState().scenarioMode?.name ?? null;
}
