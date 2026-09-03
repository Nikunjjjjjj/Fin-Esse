import { encodeHandoff, decodeHandoff, handoffUrl } from "../lib/handoff";
import { secondOpinion, STANCES, verdictUnder, type StanceId } from "../lib/stances";
import { netPosition } from "../lib/advisor";
import { money, pct } from "../lib/money";
import { applyHandoff, getProfile, getState } from "../store/store";
import { S, requireNumber, result, type ToolSpec } from "./helpers";

export const handoffTools: ToolSpec[] = [
  {
    name: "advisor_create_handoff_link",
    effect: "read",
    description:
      "Package the user's entire financial position into a shareable link so another person's AI agent can pick it up and continue the analysis in their own browser session. Use when the user wants a second opinion from a partner, a friend or a financial advisor. The position travels inside the URL fragment, so it is never sent to any server. Give the user the returned URL verbatim.",
    inputSchema: S.obj(
      {
        from: S.str('Who is sharing, e.g. "Nikunj". Shown to whoever opens the link.'),
        note: S.str("A short message to the receiving agent explaining what you want them to look at."),
      },
      ["from"],
    ),
    execute: async (i) => {
      const profile = getProfile();
      const encoded = await encodeHandoff(profile, String(i.from), String(i.note ?? ""));
      const url = handoffUrl(encoded);
      const np = netPosition(profile);
      return result(
        `Handoff link created. Give the user this URL exactly as written:\n\n${url}\n\nWhoever opens it gets the full position -- ${profile.loans.length} loans, ${profile.holdings.length} holdings, ${profile.goals.length} goals, net worth ${money(np.netWorth)} -- loaded live into their own copy of the app, where their own agent can act on it with the same tools. The data rides in the URL fragment, so it never reaches a server.`,
        { url, sizeChars: url.length, netWorth: np.netWorth },
      );
    },
  },
  {
    name: "advisor_load_handoff_link",
    effect: "write",
    description:
      "Load a financial position that someone else shared with you as a handoff link. Paste the whole URL. This replaces the profile currently on screen with theirs, so you can analyse their numbers instead of your own.",
    inputSchema: S.obj({ url: S.str("The full handoff URL that was shared with you.") }, ["url"]),
    execute: async (i) => {
      const raw = String(i.url ?? "");
      const match = raw.match(/[#&]pos=([A-Za-z0-9\-_]+)/);
      if (!match) throw new Error("That does not look like a handoff link — it should contain '#pos='.");
      const packet = await decodeHandoff(match[1]);
      applyHandoff(packet);
      const np = netPosition(getProfile());
      return result(
        `Loaded ${packet.from}'s position${packet.note ? `. Their note: "${packet.note}"` : ""}. Net worth ${money(np.netWorth)}, debt ${money(np.totalDebt)}, surplus ${money(np.monthlySurplus)}/mo. Every tool now operates on their numbers — you are picking up where their agent left off.`,
        { from: packet.from, note: packet.note, netPosition: np },
      );
    },
  },
  {
    name: "advisor_second_opinion",
    effect: "read",
    description:
      "Run the same decision through two deliberately different advisors -- a growth stance assuming 13% returns and a capital-preservation stance assuming 7% -- and report where they agree, where they diverge, and the exact assumption the disagreement turns on. Use when the user asks what the counter-argument is, wants a second opinion, or when you want to be honest that a recommendation depends on assumptions rather than arithmetic.",
    inputSchema: S.obj(
      {
        amount: S.num("The spare cash the decision is about."),
        horizonMonths: S.num("Comparison horizon in months. Defaults to 60."),
      },
      ["amount"],
    ),
    execute: (i) => {
      const amount = requireNumber(i.amount, "amount");
      if (amount <= 0) throw new Error("Amount must be positive.");
      const horizon = Math.max(1, Math.round(Number(i.horizonMonths ?? 60)));
      const o = secondOpinion(getProfile(), amount, horizon);
      const text = o.verdicts
        .map((v) => `${v.stance.label} advisor — ${v.headline}\n   ${v.reasoning}\n   Creed: ${v.stance.creed}`)
        .join("\n\n");
      return result(
        `${o.agree ? "The two stances AGREE." : "The two stances DISAGREE."}\n\n${text}\n\nWhere it turns: ${o.crux}\n\n${o.synthesis}`,
        o,
      );
    },
  },
  {
    name: "advisor_argue_as",
    effect: "read",
    description:
      "Get the strongest honest case one specific stance would make, so you can voice that side of a debate. Stances are 'growth' (assumes 13% returns, treats cheap debt as leverage) and 'preservation' (assumes 7%, prices certainty above expectation). Use to role-play a disagreement between two advisors, or to steelman the option the user is leaning against.",
    inputSchema: S.obj(
      {
        stance: S.enumOf(["growth", "preservation"], "Which stance to argue from."),
        amount: S.num("The spare cash the decision is about."),
        horizonMonths: S.num("Comparison horizon in months. Defaults to 60."),
      },
      ["stance", "amount"],
    ),
    execute: (i) => {
      const stanceId = (i.stance === "preservation" ? "preservation" : "growth") as StanceId;
      const amount = requireNumber(i.amount, "amount");
      if (amount <= 0) throw new Error("Amount must be positive.");
      const horizon = Math.max(1, Math.round(Number(i.horizonMonths ?? 60)));
      const v = verdictUnder(getProfile(), stanceId, amount, horizon);
      return result(
        `Arguing as the ${v.stance.label} advisor.\n\nPosition: ${v.headline}\nCase: ${v.reasoning}\nUnderlying belief: ${v.stance.creed}\nThis stance assumes ${pct(v.stance.expectedReturnPct)} long-run returns and insists on ${v.stance.runwayFloorMonths} months of runway before deploying cash.`,
        v,
      );
    },
  },
  {
    name: "advisor_list_stances",
    effect: "read",
    description:
      "List the advisor stances available for a second opinion and the assumptions each one holds. Call this if you need to know what positions can be argued before staging a debate.",
    inputSchema: S.obj({}),
    execute: () =>
      result(
        Object.values(STANCES)
          .map(
            (s) =>
              `- ${s.id} (${s.label}): assumes ${pct(s.expectedReturnPct)} returns, requires ${s.runwayFloorMonths} months runway, treats debt above ${pct(s.urgentDebtRatePct)} as urgent. "${s.creed}"`,
          )
          .join("\n"),
        { stances: STANCES },
      ),
  },
  {
    name: "advisor_shared_position_info",
    effect: "read",
    description:
      "Report whether the position currently loaded came from someone else's handoff link, who shared it and what note they attached. Call this at the start of a session so you know whose finances you are actually looking at.",
    inputSchema: S.obj({}),
    execute: () => {
      const h = getState().handoff;
      if (!h) {
        return result("This is the user's own position — it did not arrive from a shared link.", {
          shared: false,
        });
      }
      return result(
        `This position was shared by ${h.from}${h.note ? `, with the note: "${h.note}"` : ""}. You are analysing their finances, not the current user's. Any changes stay local to this browser and do not reach them.`,
        { shared: true, ...h },
      );
    },
  },
];
