# Devpost submission draft

Replace `LIVE_URL` and `VIDEO_URL` before submitting.

---

## Tagline

Financial planning that a human and an AI agent do together — on live state,
with the human holding the pen.

---

## Inspiration

Almost everyone who has both debt and investments has asked some version of
the same question: *should this spare money go against the loan, or into the
market?* There is no tool that answers it. There are mortgage calculators and
there are portfolio trackers, and they do not know about each other. The
question spans both, so it falls in the gap between them, and people end up
guessing or paying someone to guess for them.

That gap is not an accident of product design — it is what happens when every
tool is a form. A form takes inputs once and returns an answer once. Financial
planning is not shaped like that. It is a back-and-forth: *what if I lose my
job; what if rates rise; what if I clear the card first instead*. It is shaped
like a conversation with an advisor, which is exactly the shape WebMCP makes
possible on the open web.

## What it does

Fin·Esse is a working personal-finance workspace — loans, portfolio, budget,
goals — that exposes its entire capability surface as WebMCP tools. Used
normally it is a financial planner: add a loan, see the EMI and the
amortisation, watch your net position update. Opened in an AI browser, an
agent can operate every one of those capabilities alongside you.

Ask *"I've got ₹3,00,000 spare — prepay or invest?"* and the agent reads your
loans, reads your portfolio, reads your cashflow, simulates both paths month
by month against every loan you hold, and comes back with a ranked answer and
its assumptions. You watch it happen: each card lights up as the agent reads
it, and every call lands on a visible activity trail. You see which parts of
your finances the conclusion was actually built from.

## What makes it different

**Agents propose; humans decide.** Consequential tools cannot change anything.
When the agent decides you should prepay the credit card, it does not prepay
the credit card — it queues a proposal card showing the full before-and-after,
and waits. The profile changes only when a person clicks Approve. Rejecting
leaves it byte-identical. This is the whole difference between an agent that
can act on your money and one that can ask to, and it is enforced in the
architecture rather than in a prompt.

**The tool surface is gated on state.** `loan_simulate_prepayment` does not
exist until you have a loan. The what-if open and close tools are mutually
exclusive, so the agent physically cannot open two branches or close one that
was never opened. Registration is re-diffed on every state change and applied
through `AbortController`. The tool list an agent sees is always a truthful
description of what the page can currently do — and you can watch it grow and
shrink in the app as you use it.

**A sandbox to be wrong in.** The agent can fork your entire profile, explore
destructively — clear a loan, crash the market, reprice everything — compare
the branch against reality, and throw it away. Your real data is never at
risk while it thinks.

**Two advisors who disagree, on purpose.** Financial disagreements are almost
never about arithmetic; they are about assumptions. Fin·Esse runs the same
engine under a growth stance (13% assumed returns, cheap debt is leverage) and
a preservation stance (7%, certainty beats expectation), then bisects to find
the *exact* return rate at which the recommendation flips. Instead of a
confident answer, you get the honest one: here is the single number this
decision turns on, and here is which side of it you believe.

**Positions that outlive the tab.** A WebMCP tool runs in one browser session,
so an agent's understanding of your finances normally dies when you close it.
`advisor_create_handoff_link` packs your whole position into a gzipped URL
fragment. Send it to your partner, and *their* agent picks up exactly where
yours left off — same state, same tools, their session. Everything after `#`
is never sent to a server, so a position travels peer-to-peer through the link
itself. No backend, no account, no upload.

## Why this use case fits WebMCP

Financial planning is stateful, multi-step and cross-domain — the three things
a single API call is worst at and a tool-calling agent is best at. The
alternative to WebMCP here is a backend integration: you hand a company your
loan balances and brokerage positions and trust them with it. WebMCP inverts
that. The tools run client-side, in the user's own session, over data that
never leaves their browser. The agent gets full access to the user's financial
picture precisely *because* nobody else does.

It also fits because the reasoning genuinely belongs to the agent. We make no
LLM calls of our own — no orchestration layer, no LangChain, no model in our
code. The browser agent reads the tool list and decides what to call and in
what order; our job is to give it arithmetic it can trust and cite. That
division is the point: the model reasons, the page computes, the human
approves.

## What becomes possible that wasn't before

A person can ask a genuinely cross-domain question about their own money and
watch an agent gather evidence from four different parts of their financial
life, model both options against their actual numbers, tell them which
assumption the answer depends on, and then *ask permission* before changing
anything. Then hand the whole live position to someone else's agent for a
second opinion, without either party uploading their finances anywhere.

None of that is a chatbot answering a question about money. It is two parties
— a person and an agent — working the same document.

## How we built it

React 18 and TypeScript on Vite, deployed as a static site. No state library:
a plain `subscribe`/`getSnapshot` store wired into React through
`useSyncExternalStore`, because WebMCP tool callbacks execute outside the
React tree and need direct access to the same live state the UI renders.

42 tools in four groups (`loan_*`, `portfolio_*`, `budget_*`, `advisor_*`)
over a deterministic financial engine — EMI and amortisation, allocation and
rebalancing, cashflow and goal feasibility, and the cross-domain advisor.
68 tests.

A compatibility shim resolves `document.modelContext`, then
`navigator.modelContext` (deprecated in Chromium 150), then the legacy
`provideContext` batch form, so the app works across the whole origin-trial
range rather than only the newest Chrome build.

## Challenges

The subtle bugs were all in the modelling, and all invisible until tested.

Rounding EMI to paise inside the engine compounds across a 240-month schedule
and manufactures a phantom final instalment — money now rounds only at the
display boundary.

Comparing prepayment against investment is easy to get quietly wrong: if you
forget that a loan closing early frees up its EMI, the model biases against
prepayment. Both paths now run through the same walk with identical cash
outflow, and a test pins the neutral case — when the loan rate equals the
assumed return, the two must converge.

And modelling a self-occupied flat as a portfolio holding made it 86% of
"allocation" and produced the wonderfully absurd recommendation to *rebalance
out of the house you live in*. Real assets are now a separate concept: on the
balance sheet, out of allocation, still marked down in a crash.

## What's next

Real rate feeds for offer comparison, richer tax treatment, and a
multi-signatory handoff where two people's agents negotiate a joint household
plan against a shared position.

---

# Demo video script (under 3 minutes)

**0:00–0:20 — The problem.**
Screen: the app, sample profile loaded. "This person has a home loan at 8.6%,
a car loan at 9.4%, a credit card revolving at 38%, and about sixteen lakh
invested. They have three lakh spare. Should it go against a loan, or into the
market? No existing tool answers that, because the question spans two tools
that don't know about each other."

**0:20–0:55 — Agent reads live state.**
In ChatGPT's browser: *"I've got ₹3,00,000 spare. Should I prepay or invest?"*
Point at the cards flashing and the activity trail filling. "It's not
answering from training data. It's reading this person's actual loans,
portfolio and cashflow — you can watch which ones."

**0:55–1:20 — The consent layer.**
Agent proposes the prepayment. Approval card appears. "Here's the part I care
about most. It didn't do it. It can't. Consequential tools in this app return
a proposal, not a mutation — with the full before and after. The agent
proposes. I decide." Click Approve. Watch the loan card update.

**1:20–1:45 — Dynamic tools.**
Point at the tool inspector. "This list isn't static. Prepayment tools don't
exist until there's a loan. Registration is re-diffed on every state change
through AbortController, so what the agent sees is always what the page can
actually do." Remove a loan; watch the list shrink.

**1:45–2:15 — Honest disagreement.**
*"Argue both sides."* "Two advisors, same arithmetic, different assumptions —
and the app bisects to find the exact return rate where the recommendation
flips. It doesn't give you false confidence. It tells you which single number
your decision turns on."

**2:15–2:45 — The handoff.**
*"Package this for my partner's agent."* Copy the link, open it in a second
window. "Their agent picks up the same position, live, with the same tools. It
rides in the URL fragment, so it never touches a server. No backend, no
account, nothing uploaded."

**2:45–3:00 — Close.**
"Fin·Esse. The agent reasons, the page computes, and the human keeps the pen.
Open source, MIT, link below."
