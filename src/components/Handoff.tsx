import { useState } from "react";
import { encodeHandoff, handoffUrl } from "../lib/handoff";
import { dismissHandoff, getProfile, logActivity, useSelector } from "../store/store";

/** Creates a shareable position link so another person's agent can pick it up. */
export function ShareButton() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const profile = useSelector((s) => s.profile);
  const empty = !profile.loans.length && !profile.holdings.length && !profile.goals.length;

  async function share() {
    try {
      const encoded = await encodeHandoff(profile, "a Fin·Esse user", "Shared for a second opinion.");
      const url = handoffUrl(encoded);
      await navigator.clipboard.writeText(url);
      setState("copied");
      logActivity("system", "handoff", `You created a shareable position link (${url.length} characters).`);
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("failed");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  if (empty) return null;
  return (
    <button className="btn sm" onClick={share} title="Copy a link that carries this whole position">
      {state === "copied" ? "✓ Link copied" : state === "failed" ? "Copy failed" : "Share position"}
    </button>
  );
}

export function HandoffBanner() {
  const handoff = useSelector((s) => s.handoff);
  if (!handoff) return null;
  return (
    <div className="scenario-banner" style={{ background: "linear-gradient(90deg, #0d2b3a, #0a1f2b)", borderColor: "#155b7a", color: "#cbeeff" }}>
      <strong>Shared position from {handoff.from}</strong>
      {handoff.note && <span>— “{handoff.note}”</span>}
      <span style={{ color: "#7fb8d0" }}>
        You are reasoning on their numbers. Nothing you do here reaches them.
      </span>
      <span className="spacer" />
      <button className="btn sm" onClick={dismissHandoff}>Dismiss</button>
    </div>
  );
}

export function handoffSummary(): string {
  const p = getProfile();
  return `${p.loans.length} loans, ${p.holdings.length} holdings, ${p.goals.length} goals`;
}
