# Fin·Esse — UI design brief

Everything a designer needs to redesign this app without reading the code.
Written for upload into a design tool as context.

Live app: https://fin-esse-beta.vercel.app/
Source: https://github.com/Nikunjjjjjj/Fin-Esse

---

## 1. What the app is

A personal financial planning workspace — loans, investments, budget, goals —
built for the **OpenAI WebMCP Challenge**.

The twist: it exposes every one of its capabilities as **WebMCP tools**, a new
browser API that lets a web page register JavaScript functions an in-browser AI
agent can discover and call. Open the page normally and it's a financial
planner. Open it inside ChatGPT's browser and the agent can operate every part
of it *alongside you*, on the same live state you're looking at.

**Design consequence:** this is not a dashboard with a chatbot bolted on. Two
parties — a person and an agent — work the same document. The interface has to
make the agent's activity legible without letting it dominate. That tension is
the central design problem.

### Who it's for

Someone in their 30s–40s carrying both debt and investments simultaneously —
a near-universal situation with no good tool. Existing products are either
single-purpose calculators or portfolio trackers, and neither knows about the
other. The question *"should this spare money go against the loan or into the
market?"* spans both, so it falls in the gap.

### Guardrails

- All data is **user-entered or simulated**. No bank integration, no live
  market feed, no server. Nothing leaves the browser.
- Positioned as an **educational planning tool, not licensed financial
  advice**. That disclaimer must be visible but must not dominate.
- **No file upload in the app.** Users upload statements to *ChatGPT*, and the
  agent populates the app by calling tools. Do not design an upload dropzone.

---

## 2. The two things that make it distinctive

Design should protect both. They are the reason the project exists.

### Agents propose, humans decide

**No agent-initiated change to financial data reaches the profile without a
person approving it.** All 17 write tools queue a *proposal* instead of
mutating. The person sees what would change, before and after, and clicks
Approve or Reject. Rejecting leaves the data byte-identical.

The approval queue is therefore not a notification — it is a **blocking
decision surface**, and the most important interactive element in the product.

One exception: inside a what-if branch (below) writes apply immediately,
because the branch is itself discardable.

### The agent's work is visible

Every tool call — read or write — lands on a live **activity trail**, and the
entity it touched **flashes** in the UI. Ask "should I prepay or invest?" and
you watch it read your loans, then your portfolio, then your cashflow, before
it answers. The person sees *which parts of their finances the conclusion was
built from*, not just the conclusion.

---

## 3. Data model

| Entity | Fields |
| --- | --- |
| **Loan** | name, kind (home/auto/education/personal/credit_card/other), principal, annual rate %, term months, months paid → derived: EMI, outstanding, months remaining, interest remaining |
| **Holding** | symbol, name, asset class (equity/debt/gold/cash/crypto/real_estate), units, price → derived: value |
| **Real asset** | name, value. A self-occupied home. Counts toward net worth, **excluded** from allocation, rebalancing and concentration risk. |
| **Expense** | name, amount, essential (bool) |
| **Goal** | name, target amount, target months, saved so far → derived: required monthly, on-track |
| **Budget** | monthly income, cash reserve, expenses[] |
| **Profile** | currency (INR/USD), all of the above, assumed portfolio return % |

Derived figures the UI shows: net worth, total assets, total debt,
debt-to-assets %, monthly surplus, savings rate, debt-service %, emergency
runway (months), exposure score (0–100), portfolio risk score (0–100),
blended expected return and volatility.

---

## 4. The five screens

Currently everything is crammed onto one page. The agreed fix is **one view at
a time** with persistent navigation.

### Overview — "where you stand"
Net worth as the hero figure. Asset composition (property / investable /
cash). Four headline metrics: monthly surplus, emergency runway, debt service
%, exposure score. The single highest-priority recommendation. A short summary
of what is owed.

### Debt
Total outstanding and total monthly EMI. Every loan with rate, EMI, months
remaining, interest still to come, and progress through its term.
**Sorted by cost, not size** — the page's argument is that the smallest
balance can be the most expensive money you hold. Optionally: what happens if
you put a lump sum against each one.

### Investments
Portfolio value. Allocation by asset class. Blended expected return,
volatility, risk score. Every holding with units × price. Property listed
separately with an explanation of why it's excluded from allocation.

### Cashflow
Income, essentials, discretionary, EMIs, resulting surplus and savings rate.
Every recurring expense, with discretionary ones marked (they're the only ones
with give). Goals with required monthly contribution, progress, and whether
they fit inside the surplus.

### Advice
Prioritised recommendations, each with: action, reasoning, and **which tools
produced the evidence**. Plus the *second opinion* — two advisors with
deliberately different assumptions (growth assumes 13% returns, preservation
assumes 7%), what each concludes, and the single assumption the disagreement
turns on.

### What-if — appears only while a branch is open

A **sixth nav entry**, named after the branch, visually set apart from the
five permanent ones. It is the app's most distinctive screen and needs the
most design thought.

A what-if branch forks the entire profile so the agent can explore
destructively — clear a loan, crash the market, reprice everything — and throw
it away. The branch is **a place you visit, not a mode the app enters**: your
five real pages keep showing your real numbers the whole time, one click away,
so comparing costs nothing and there is never doubt about which figures you
are looking at.

The page shows a **side-by-side diff**: your actual position beside the
hypothetical, with every changed figure marked and labelled better or worse.
Two levels:

- **Headline figures** — net worth, total debt, monthly surplus, emergency
  runway, debt service %, exposure score, portfolio risk, portfolio value.
  Each has a before, an after, a direction, and whether that direction helps.
- **Individual entries** — every loan, holding and goal that was added,
  removed or changed, with only the fields that actually moved.

Direction is not the same as good. Debt falling is an improvement; net worth
falling is not. The design must distinguish *changed* from *improved*.

Actions on this page: **Discard** (throw the branch away) and **Keep**
(adopt it into the real profile).

---

## 5. Persistent UI (present on every screen)

### Agent activity trail
Reverse-chronological list of tool calls. Each entry: a kind label
(read / wrote / proposed / approved / rejected), the tool name in monospace,
the arguments, and relative time. Reads vastly outnumber writes, so reads
should be quiet and writes should stand out.

### Approval queue
Pending proposals. Each carries a title, a one-line rationale, an explicit
list of before → after effects, and Approve / Reject. After resolution it
shows its outcome. **This is the one element that should feel weightier than
everything around it.**

### Status
Whether a WebMCP agent is connected, and how many tools are currently
registered. The tool count changes as the profile does (see §7).

### Currency toggle
₹ INR / $ USD. Switches sample data and number formatting
(₹65.00L / ₹1.20Cr vs $380K / $1.25M).

---

## 6. Every state that needs designing

Easy to forget, and all of these really occur:

| State | What it means |
| --- | --- |
| **No agent detected** | Opened in a normal browser. App fully usable; tools simply aren't exposed. Must not feel broken. |
| **Agent connected** | Tools live. |
| **Empty profile** | No loans, holdings or goals. Needs a real first-run path, not a blank page. |
| **Entity flashing** | A card highlights for ~4s when a tool call names it. |
| **Proposal pending / approved / rejected** | Three distinct looks. |
| **What-if branch open** | A sixth nav entry appears, named after the branch. The five real pages are unaffected. Needs to be unmistakable which workspace you are in. |
| **Viewing branch vs viewing reality** | Two workspaces, switchable. The chrome should make the current one obvious at a glance — a screenshot of either must be self-explanatory. |
| **Diff row: improved / worsened / unchanged** | Three treatments. Note that a figure can change and be worse. |
| **Shared position loaded** | The profile came from someone else's handoff link. Shows who shared it and their note. |
| **Goal at risk** vs **fundable** | |
| **Costly debt** | A loan priced far above expected returns. |
| **Runway below floor** | Under 6 months — the most common warning. |
| **Advisors agree / disagree** | Two visually different outcomes on the Advice screen. |

---

## 7. Behaviours a designer should know

- **The tool list changes as the app does.** Prepayment tools don't exist until
  a loan exists; the what-if open/close tools are mutually exclusive. 44 tools
  are defined, ~42 visible with the sample loaded. If you show a tool count, it
  moves.
- **Tool groups:** `loan_*` (8), `portfolio_*` (9), `budget_*` (9),
  `advisor_*` (19), `market_*` (3). 48 defined; ~45 visible at any moment
  because of gating.
- **Market research needs a surface.** The agent researches live news for the
  user's actual exposures and feeds the findings back; the resulting read
  (per asset class: a move, a note, a source) appears on Investments and
  wants a proper design — it is agent-sourced, so provenance matters.
- **While a branch is open the agent always works in the branch**, whichever
  workspace you happen to be viewing. It cannot see your navigation, so tying
  its scope to the current page would give it the wrong context the moment you
  clicked away. Worth conveying in the chrome so nobody is surprised.
- **Handoff links.** A person can package their whole position into a URL and
  send it to someone else, whose agent picks up the same state. Needs an entry
  point and a receiving banner.
- **Approval volume.** Ingesting a statement can generate a dozen proposals at
  once. Currently one card each — a known friction point worth designing for.

---

## 8. Current UI and what's wrong with it

Near-black (#070b11) background, one acid-green accent (#4ade80), default
system fonts, six panels plus a three-panel sidebar all at the same visual
weight on a single scrolling page.

Honest diagnosis:

1. **Cluttered** — everything competes; nothing leads.
2. **No typographic decision was made** — `ui-sans-serif, system-ui` is the
   absence of a choice.
3. **Reads as generated** — near-black plus a lone neon accent is a well-worn
   AI-design cliché.
4. **Card chrome everywhere** — the same border and radius on every block
   flattens hierarchy, so the approval card doesn't stand out despite being the
   most important thing on screen.

---

## 9. Direction settled so far

Warm editorial, minimal. Not locked — treat as a starting point.

```
GROUND   #F4F2ED  bone
RAISED   #FAF9F6  lifted surface
SUNK     #EDEAE3  agent rail
INK      #23211E  warm charcoal
SOFT     #6B665D  secondary text
FAINT    #9C968A  labels
RULE     #DCD7CD  hairlines
ACCENT   #4A5D43  moss — active nav, largest asset, approve
WARN     #A8543A  clay — costly debt, thin runway, disagreement
```

- **Schibsted Grotesk** for text, **IBM Plex Mono** for every figure.
- All numbers `tabular-nums` so columns align.
- Hairlines and whitespace instead of cards. **Only the approval gets card
  chrome**, because it's the only thing asking you to act.
- If it's coloured, something is wrong with it. Colour is signal, not
  decoration.
- Committed to light only; a warm paper world has no natural dark twin.

Existing mockups: `design/*.dc.html` in the repo.

---

## Appendix — real sample data

These are the actual figures the app computes, not placeholders. Use them so
mockups match reality.

### INR profile

**Overview** — Net worth ₹48.19L · assets ₹1.20Cr · debt ₹71.69L ·
investable ₹15.88L · cash ₹9.00L · property ₹95.00L · surplus ₹70.22K/mo ·
savings rate 24.6% · runway 4.9 months · debt service 32.6% ·
exposure 47/100 (adequate)

**Loans** — total ₹71.69L, EMIs ₹92.78K/mo
| Loan | Rate | Outstanding | EMI | Left | Interest to come | Paid |
| --- | --- | --- | --- | --- | --- | --- |
| Home loan — Sector 62 flat | 8.6% | ₹61.07L | ₹56.82K | 17 yr 2 mo | ₹55.98L | 34/240 |
| Car loan — Creta | 9.4% | ₹8.97L | ₹25.14K | 3 yr 6 mo | ₹1.59L | 18/60 |
| Credit card revolve | 38.0% | ₹1.64L | ₹10.82K | 1 yr 9 mo | ₹63.08K | 3/24 |

**Investments** — ₹15.88L · expected 13.6% · volatility 38.9% · risk 85/100
Crypto 44.6% ₹7.08L · Equity 32.7% ₹5.19L · Debt 15.4% ₹2.44L · Gold 7.4% ₹1.17L
BTC 0.12 × ₹59.00L = ₹7.08L · PPFAS 3,200 × ₹82 = ₹2.62L ·
NIFTYBEES 900 × ₹285 = ₹2.56L · GILT10 4,000 × ₹61 = ₹2.44L ·
GOLDBEES 1,500 × ₹78 = ₹1.17L
Property: Sector 62 flat (self-occupied) ₹95.00L

**Cashflow** — income ₹2.85L · outgoings ₹2.15L · EMIs ₹92.78K ·
surplus ₹70.22K · 24.6%
Household & groceries ₹42.00K · School fees ₹26.00K ·
Society maintenance + utilities ₹14.00K · Insurance ₹9.00K ·
Dining, travel, subscriptions ₹31.00K *(discretionary)*
Goals: Daughter's undergrad fund ₹40.00L in 10 yr, needs ₹9.89K/mo,
saved ₹6.20L · 12-month emergency fund ₹18.00L in 2 yr, needs ₹25.45K/mo,
saved ₹9.00L. Both fit inside the surplus, using 50.3% of it.

**Advice**
1. *Clear "Credit card revolve" before anything else.* Direct surplus cash at
   the 38% balance of ₹1.64L. At 38% it costs far more than the 11% the
   portfolio is assumed to earn. — `loan_list · advisor_prepay_vs_invest`
2. *Rebuild the emergency buffer to six months.* Hold ₹2.02L more in liquid
   cash. Only 4.9 months covered. — `budget_summary · loan_list · advisor_stress_test`
3. *Trim concentration.* Bitcoin is 44.6% of the portfolio; risk score 85/100
   with 38.9% volatility. — `portfolio_allocation · advisor_risk_exposure`

**Second opinion on ₹3,00,000** — the advisors **disagree**.
Growth (assumes 13%): *put it into the credit card* — at 38% it clears the 13%
bar; prepaying wins by ₹72.08K over 60 months.
Preservation (assumes 7%): *hold it as cash* — runway is 4.9 months against a
6-month floor.
Where it turns: liquidity, not returns. One stance requires 6 months of runway
before deploying anything, the other accepts 3.

### USD profile

Same financial shape, US denominated. Net worth $346K · investable $208K ·
cash $21.00K · property $520K · surplus $2.78K/mo · runway 2.7 months ·
debt service 33.7% · exposure 54/100
Mortgage — Maple Street 6.4% $364K · Auto loan — Outback 8.2% $25.21K ·
Credit card revolve 24.9% $13.05K
VTI $113K · BTC $23.80K · BND $35.04K · GLD $17.82K · VXUS $18.30K
