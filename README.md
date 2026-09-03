# Fin·Esse

**Financial planning that a human and an AI agent do together, in the browser, on live state.**

**Live: https://fin-esse-beta.vercel.app/**

Built for the OpenAI WebMCP Challenge. Fin·Esse is a working personal-finance
workspace — loans, portfolio, budget, goals — that exposes its entire
capability surface as [WebMCP](https://github.com/webmachinelearning/webmcp)
tools. Open it normally and it is a financial planner. Open it in an AI
browser and an agent can reason across your whole balance sheet with you,
taking real, visible, multi-step actions on the same state you are looking at.

> Educational planning tool. **Not licensed financial advice.** All data is
> entered by you or simulated. Nothing leaves your browser — there is no
> backend, no account and no analytics.

---

## Try it

| Surface | How |
| --- | --- |
| **ChatGPT desktop app** | Open [https://fin-esse-beta.vercel.app/](https://fin-esse-beta.vercel.app/) in the in-app browser. WebMCP is on by default. |
| **Chrome 149+** | Enable `chrome://flags/#enable-webmcp-testing`, restart, then open the URL. |
| **Any browser** | Everything works without an agent — the tools are simply not exposed. |

A sample profile loads automatically so there is something to talk about.
Append `?empty=1` for a blank slate. The **₹ INR / $ USD** toggle switches
between two samples of the same financial shape — the rates are set so that in
both, one loan sits far above any plausible market return, one clearly below,
and one close enough to be genuinely arguable.

### Ask the agent

```
Walk me through my finances — what's the state of things?
I've got ₹3,00,000 spare. Should I prepay a loan or invest it?
What happens to me if I lose my job for 9 months and the market crashes?
Open a what-if branch where I clear the credit card, then compare it to today.
Argue both sides: growth advisor vs preservation advisor.
Package my position into a link I can send my partner's agent.
```

Watch the cards on the left light up as the agent reads them.

---

## What makes this a WebMCP project rather than a chatbot

**There is exactly one agent in this system, and we did not write it.** No
LangChain, no orchestration layer, no LLM calls inside our code. The browser
agent reads the registered tool list and decides what to call, in what order.
Our job is to supply a shared client-side state object and a set of
well-scoped, honestly-described tools over it. Every number the agent quotes
comes from deterministic arithmetic it can cite, not from a model guessing.

Four things push past a proof of concept:

### 1. Agents propose; humans decide

**No agent-initiated change to your financial data can reach the profile
without a person approving it.** Every one of the fourteen write tools — add a
loan, remove a holding, reprice an asset, set income, prepay, rebalance —
routes through a single gate that queues a proposal carrying its own `apply()`
closure and full before/after effects. The profile changes only when a person
clicks **Approve**. Rejection leaves it byte-identical.

This is enforced structurally, not by prompting, and it is tested as a
property of the whole tool set rather than tool by tool, so a write tool added
later cannot quietly opt out.

The one exception is deliberate: **inside a what-if branch, writes apply
immediately**, because the branch is itself the safety mechanism — everything
in it is discarded unless you explicitly keep it. Asking consent for each step
of a throwaway exploration would be ceremony without protection.

Changing a planning *assumption* (`budget_set_expected_return`) is also
ungated: nothing you own or owe moves, only the projection.

This is the difference between an agent that can act on your money and an
agent that can *ask* to.

### 2. The tool surface is gated on state, not static

`loan_simulate_prepayment` does not exist until a loan exists.
`advisor_begin_whatif` and `advisor_end_whatif` are mutually exclusive, so the
agent physically cannot open two branches or close one that was never opened.
Registration is re-diffed on every state change and applied through
`AbortController`, per the current spec.

The result is that the tool list an agent sees is always a truthful
description of what the page can currently do — and the **Registered WebMCP
tools** panel visibly grows and shrinks as you use the app.

### 3. A sandboxed what-if branch

`advisor_begin_whatif` forks the entire profile. Writes inside the branch
touch the fork, never the real data; `advisor_end_whatif` discards or adopts.
The agent gets somewhere safe to be destructive.

### 4. Portable positions — agent-to-agent handoff

A WebMCP tool runs inside one browser session, so an agent's understanding of
your finances normally dies with the tab. `advisor_create_handoff_link` packs
the whole profile into a gzipped URL fragment. Someone else opens it and
**their** agent resumes on exactly the same state, with the same tools, in
their own session.

Everything after `#` is never sent to a server, so positions travel
peer-to-peer through the link itself — no backend, no account, no upload.

Handoff links are treated as hostile input: every decoded field is coerced,
bounded and clamped, and collections are capped, so a malformed or malicious
link degrades into a boring profile rather than a broken app.

---

## Tool reference

45 tools in five groups. Prefixes are organisational — there is one agent.

### `loan_*`
`list` · `add`* · `remove`* · `emi_calculator` · `amortisation` ·
`simulate_prepayment` · `propose_prepayment`* · `compare_offers`

_* requires human approval before it changes anything._

### `portfolio_*`
`list` · `add_holding`* · `remove_holding`* · `add_real_asset`* ·
`allocation` · `plan_rebalance` · `propose_rebalance`* ·
`simulate_market_event` · `update_price`*

### `budget_*`
`summary` · `set_income`* · `set_cash_reserve`* · `add_expense`* ·
`remove_expense`* · `add_goal`* · `remove_goal`* · `goal_feasibility` ·
`set_expected_return`

### `market_*`
`research_brief` · `apply_conditions` · `last_read`

The page holds **no market data and fetches nothing**. `market_research_brief`
reads the user's holdings and tells the agent exactly what to look up, ranked
by how much each exposure actually matters — and what to ignore.
The agent searches the live web itself, then feeds what it found back through
`market_apply_conditions`, which computes the effect on every aspect of this
particular position: value per holding, allocation, risk, volatility, expected
return, net worth, goal funding, and whether the prepay-versus-invest verdict
flips. It deliberately also reports **what did not move** — debt, surplus and
runway are untouched by prices, which is exactly what someone reading a crash
headline needs to hear.

No API key, no rate limit, no live network dependency in the page, and only
asset-class names ever leave the browser as search terms. Positions never do.

### `advisor_*` — cross-domain
`net_position` · `prepay_vs_invest` · `risk_exposure` · `stress_test` ·
`recommendations` · `assumptions` · `explain_number` ·
`horizon_projection` · `begin_whatif` · `end_whatif` · `save_scenario` ·
`compare_scenarios` · `create_handoff_link` · `load_handoff_link` ·
`second_opinion` · `argue_as` · `list_stances` · `shared_position_info`

---

## Notes on the financial engine

The maths is deliberate, and two decisions are worth calling out because
getting them wrong is easy and invisible:

**EMI is never rounded inside the engine.** Rounding to paise at that layer
compounds across a 240-month schedule and manufactures a phantom final
instalment. Money is rounded only at the display boundary. A tenure test
catches the regression.

**Prepay-vs-invest runs both paths through the same month-by-month walk with
identical cash outflow**, redirecting a freed-up EMI into the investment pool
in whichever path the loan closes first. Skipping that quietly biases the
answer against prepayment. A test pins the neutral case: when the loan rate
equals the assumed return, the two paths must converge.

**A self-occupied home is not a portfolio holding.** It counts towards net
worth, stays out of allocation, rebalancing and concentration risk, and is
still marked down by a broad market shock. Modelling it as a holding produced
the memorable recommendation to *rebalance out of the house you live in*.

All planning assumptions — expected returns and volatility per asset class —
are inspectable via `advisor_assumptions`, and the agent is instructed to
quote them rather than present them as fact.

---

## WebMCP compatibility

The API moved during the origin trial. `navigator.modelContext` shipped in
Chrome 146–149 and was **deprecated in Chromium 150** in favour of
`document.modelContext`; older builds only had the batch `provideContext({
tools })` form. `src/webmcp/shim.ts` resolves the richest surface available at
runtime and normalises all three, so the app works across the whole
origin-trial range rather than only the newest build. The status pill in the
header names which one is live.

---

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 119 tests
npm run build
```

Tech: React 18, TypeScript (strict), Vite. No state library — a plain
`subscribe`/`getSnapshot` store wired into React via `useSyncExternalStore`,
because WebMCP tool callbacks execute outside the React tree and need direct
access to the same live state the UI renders.

## Licence

MIT — see [LICENSE](./LICENSE).
