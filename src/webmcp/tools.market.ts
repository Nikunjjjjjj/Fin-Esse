import { applyMarketConditions, researchBrief, type MarketCondition } from "../lib/market";
import { ASSET_CLASSES, ASSET_META } from "../lib/portfolio";
import { money, pct } from "../lib/money";
import { getProfile, getState, logActivity, setState } from "../store/store";
import type { AssetClass } from "../types";
import { S, requireNumber, result, type ToolSpec } from "./helpers";

export const marketTools: ToolSpec[] = [
  {
    name: "market_research_brief",
    effect: "read",
    description:
      "Get a research brief telling you exactly what market news to go and look up for THIS user's holdings, ranked by how much each exposure actually matters to them. The page holds no market data and fetches nothing — use your own web search to find the news, then bring what you found back through market_apply_conditions. Call this first whenever the user asks about market conditions, the news, or how current events affect them.",
    inputSchema: S.obj({}),
    execute: () => {
      const b = researchBrief(getProfile());
      if (!b.exposures.length) {
        return result("There are no holdings recorded, so there is nothing specific to research yet.", b);
      }
      const lines = b.exposures
        .map(
          (e) =>
            `- ${e.label}${e.weightPct ? ` — ${pct(e.weightPct)} of the portfolio (${money(e.value)})` : ` — ${money(e.value)}, held outside the portfolio`}\n  Holdings: ${e.holdings.join(", ")}\n  Find: ${e.whatToFind.join("; ")}`,
        )
        .join("\n");
      return result(
        `${b.instruction}\n\n${lines}\n\nNot held, so do not spend time on it: ${b.ignore.join(", ") || "nothing"}.\n\n${b.note}`,
        b,
      );
    },
  },
  {
    name: "market_apply_conditions",
    effect: "read",
    description:
      "Take what you found in your research and work out what it means for this specific person — every aspect of it. Give one entry per asset class with the percentage move you observed and a short note on why. Returns the impact on portfolio value, each holding, allocation, risk, volatility, expected return, net worth, goals, and whether the prepay-versus-invest recommendation flips. It deliberately also reports what did NOT move. This is a what-if: it changes nothing in the app.",
    inputSchema: S.obj(
      {
        conditions: S.arr(
          S.obj(
            {
              assetClass: S.enumOf(ASSET_CLASSES, "Which asset class this observation is about."),
              changePct: S.num("The move you observed, as a percentage. Negative for a fall, e.g. -12.5."),
              note: S.str("One line on what you read and why it moved."),
              source: S.str("Where you read it."),
            },
            ["assetClass", "changePct", "note"],
          ),
          "One entry per asset class you researched.",
        ),
      },
      ["conditions"],
    ),
    execute: (i) => {
      const raw = Array.isArray(i.conditions) ? i.conditions : [];
      if (!raw.length) throw new Error("Provide at least one condition, with an asset class and a percentage move.");

      const conditions: MarketCondition[] = raw.map((c: any) => {
        if (!ASSET_CLASSES.includes(c?.assetClass)) {
          throw new Error(`assetClass must be one of: ${ASSET_CLASSES.join(", ")}.`);
        }
        const changePct = requireNumber(c.changePct, "changePct");
        if (Math.abs(changePct) > 95) {
          throw new Error("A move beyond ±95% is almost certainly a mistake — check the figure you read.");
        }
        return {
          assetClass: c.assetClass as AssetClass,
          changePct,
          note: String(c.note ?? "").slice(0, 400),
          source: c.source ? String(c.source).slice(0, 200) : undefined,
        };
      });

      const profile = getProfile();
      const impact = applyMarketConditions(profile, conditions);

      // Keep the read on screen so the person sees what the agent found.
      setState({
        marketRead: {
          at: Date.now(),
          conditions: conditions.map((c) => ({
            label: ASSET_META[c.assetClass].label,
            changePct: c.changePct,
            note: c.note,
            source: c.source,
          })),
          headline: impact.headline,
          changePct: impact.changePct,
        },
      });
      logActivity(
        "compute",
        "market_apply_conditions",
        `Applied ${conditions.length} market observation(s): ${conditions.map((c) => `${ASSET_META[c.assetClass].label} ${c.changePct > 0 ? "+" : ""}${c.changePct}%`).join(", ")}`,
        profile.holdings.map((h) => h.id),
      );

      const aspects = impact.aspects
        .map((a) => `- ${a.aspect}: ${a.before} -> ${a.after} [${a.verdict}]. ${a.comment}`)
        .join("\n");
      const holdings = impact.byHolding
        .map((h) => `- ${h.name} (${h.assetClass}): ${money(h.before)} -> ${money(h.after)} (${h.movePct > 0 ? "+" : ""}${h.movePct}%)`)
        .join("\n");

      return result(
        `${impact.headline}\n\nBy holding:\n${holdings}\n\nAspect by aspect:\n${aspects}\n\n${impact.adviceFlipped ? "NOTE: the prepay-versus-invest recommendation FLIPPED — say so plainly.\n\n" : ""}Tell the user these caveats:\n${impact.caveats.map((c) => `- ${c}`).join("\n")}`,
        impact,
      );
    },
  },
  {
    name: "market_last_read",
    effect: "read",
    description:
      "Report the market conditions most recently applied in this session, if any — what was observed, when, and the resulting move. Use it to avoid re-researching something you already looked up a few minutes ago.",
    inputSchema: S.obj({}),
    execute: () => {
      const read = getState().marketRead;
      if (!read) {
        return result("No market conditions have been applied in this session yet.", { applied: false });
      }
      const age = Math.round((Date.now() - read.at) / 60000);
      const when = age === 0 ? "just now" : `${age} minute(s) ago`;
      const what = read.conditions
        .map((c) => `${c.label} ${c.changePct > 0 ? "+" : ""}${c.changePct}% (${c.note})`)
        .join("; ");
      return result(`Applied ${when}: ${what}. ${read.headline}`, { applied: true, ...read });
    },
  },
];
