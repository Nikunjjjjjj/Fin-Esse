# Fin·Esse — feature test script

Open **https://fin-esse-beta.vercel.app/** in ChatGPT's in-app browser.
Model must be **GPT-5.6 Sol or Terra** — Luna has WebMCP disabled.

Copy each query verbatim. Run tiers in order; if tier 1 fails, stop and tell me.

---

## TIER 1 — does WebMCP work at all

**Before typing anything:** the header must read **“Agent connected · 42 tools”**.
If it says “No agent detected”, switch model to Sol/Terra, reload, and try once
more. Still failing → stop, that's the whole submission.

### 1.1
```
What tools does this page give you? Just list their names.
```
✅ Names ~42 tools starting `loan_`, `portfolio_`, `budget_`, `advisor_`.
❌ Describes the page's text instead → it cannot see the tools.

### 1.2
```
Walk me through my finances. What's the state of things?
```
✅ Calls `advisor_net_position`, probably `loan_list` and `budget_summary`.
Says net worth **₹48.19L**, debt **₹71.69L**, runway **4.9 months**.
Watch: the **agent activity rail** fills, and loan rows **flash gold**.
❌ Answers with no rail entries → it read the page, it did not call tools.

---

## TIER 2 — the differentiators

### 2.1 The cross-domain question
```
I've got ₹3,00,000 spare. Should I prepay a loan or invest it?
```
✅ Calls `advisor_prepay_vs_invest`. Answer is the **credit card**, better by
about **₹72,081** over 60 months. Should also mention the 38% rate and state
its assumptions.
❌ Any other loan is wrong.

### 2.2 The consent layer — the single most important test
```
Go ahead and propose prepaying the credit card.
```
✅ Calls `loan_propose_prepayment`. An approval card appears in the right rail
showing `₹1.64L → ₹0`, interest saved `₹63,080`, cash `₹9.00L → ₹7.36L`.
**Nothing on the page changes.** The agent should say it is waiting for you.
❌ If the loan disappears without you clicking, the consent model is broken —
tell me immediately.

### 2.3 Decline
Click **Decline**. Then:
```
What's my current debt?
```
✅ Still **₹71.69L**, card still there, untouched.

### 2.4 Approve
```
Propose it again.
```
Click **Approve**.
✅ Card balance goes to zero, cash drops to ₹7.36L, total debt ~₹70.05L,
Overview and Debt both update.

### 2.5 Honest disagreement
```
Give me the counter-argument. Argue both sides on ₹3,00,000.
```
✅ Calls `advisor_second_opinion`. The two advisors **disagree**: growth says
put it in the card, preservation says hold it as cash. The crux is
**liquidity, not returns** — runway is 4.9 months against a 6-month floor.

### 2.6 Stress test
```
What happens to me if I lose my job for 9 months and the market crashes?
```
✅ Calls `advisor_stress_test`. Reports **the plan breaks** — cash runs out
and a forced sale is needed while the portfolio is down.

### 2.7 What-if branch
```
Open a what-if branch called "Clear the card", clear the credit card inside
it, then show me how it compares to my real position.
```
✅ `advisor_begin_whatif` → a **sixth nav entry** appears named “Clear the
card”. Writes inside apply immediately (no approval — the branch is itself
disposable). `advisor_whatif_diff` shows net worth up, debt down, and
**runway worse** — several measures improve, one gets worse.

### 2.8 Discard
```
Discard that branch.
```
✅ Sixth nav entry disappears, real numbers unchanged.

---

## TIER 3 — ingestion and handoff

### 3.1 Agent as data entry
Attach **portfolio-statement-sept-2026.pdf** to the ChatGPT message, then:
```
Here's my latest brokerage statement. Replace the holdings in the app with
these, and tell me what changed about my risk.
```
✅ Reads the PDF, calls `portfolio_list`, then `portfolio_add_holding` ×7 and
`portfolio_remove_holding` ×5. Each queues an approval.

> **Expect a dozen approval cards.** That is the known friction point. To see
> it flow smoothly instead, prefix with *“open a what-if branch first”*.

After approving: portfolio **₹27.17L**, equity **78%**, crypto **gone**,
risk score up, and “trim concentration” should now name an equity holding
rather than Bitcoin.

### 3.2 Handoff
```
Package my whole position into a link I can send to my partner's agent.
```
✅ Calls `advisor_create_handoff_link`, returns a URL containing `#pos=`.
Open it in a **separate browser window**.
✅ A banner names the sender, and their numbers load.

---

## TIER 4 — robustness

| # | Do this | Expect |
|---|---------|--------|
| 4.1 | Reload the page | Sample profile returns; no crash |
| 4.2 | Click **$ USD** | Everything re-denominates; **no ₹ anywhere** in content |
| 4.3 | Open `…/?empty=1` | Empty state, no crash, tool count *drops* |
| 4.4 | With `?empty=1`, ask: `What are my loans?` | Says there are none — does not invent any |
| 4.5 | Narrow the window to phone width | Rail moves below; no sideways scroll |
| 4.6 | Click every nav item | All six render |

---

## Reporting back

For each failure, three things — that's all I need to locate it:

1. **What you asked** (verbatim)
2. **What the agent activity rail showed** (tool names, or nothing)
3. **What happened** vs what's expected above

The rail is the diagnostic. Tools listed but a wrong answer = my engine.
No tools listed = the agent didn't call them, a different bug entirely.
