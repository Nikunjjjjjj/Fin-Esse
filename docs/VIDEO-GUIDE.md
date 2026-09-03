# Fin·Esse — video production guide

For the person recording and cutting the demo. **You do not need to understand
finance or code to use this.** Everything you need is below: what to say, what
to type, and what will happen on screen when you do.

**Hard limit: under 3 minutes.** Must be on YouTube, public, with spoken audio.

---

## 1. What this app is, in plain terms

Someone has loans and investments. They have some spare money. Should it go
against a loan, or into the market? No existing tool answers that, because
loan calculators and investment trackers don't know about each other.

Fin·Esse does both — and the interesting part is that an **AI agent can
operate it**. Not "a chatbot that talks about your money." The agent presses
the actual buttons, on your actual numbers, while you watch.

**The one idea the video must land:** *the agent can propose changes, but only
the human can approve them.* If a viewer takes away one thing, it's that.

## 2. What to point the camera at

Three areas of the screen matter. Learn to recognise them:

| Area | Where | Why it matters |
| --- | --- | --- |
| **Agent activity rail** | Right side, lower | Fills up live as the agent works. This is the proof it's really doing something. |
| **Approval card** | Right side, upper | Appears when the agent wants to change something. Has Approve / Decline buttons. **The hero of the video.** |
| **Nav bar** | Top | Overview · Debt · Investments · Cashflow · Advice. A sixth item appears during the what-if section. |

Rows on the left **flash gold** when the agent reads them. Catch that — it's
the most filmable moment in the whole app.

---

## 3. Before you record

- [ ] Open the **ChatGPT desktop app** → its built-in browser → the live URL
- [ ] Model must be **GPT-5.6 Sol or Terra** (Luna won't work)
- [ ] Header must read **"Agent connected · 45 tools"**. If it says *No agent
      detected*, stop — nothing will work
- [ ] Full screen, **1920×1080**, hide bookmarks and notifications
- [ ] Do a full dry run first. Some steps depend on the agent behaving
- [ ] Record chat and app **in one window** — do not film them separately

---

## 4. Shot list

Timings are targets. Narration is written to be read aloud — short sentences,
unhurried.

### SHOT 1 · The problem — 0:00–0:12
**Screen:** App on Overview, still. No cursor movement.
**Narrate:**
> "This person has a home loan at eight point six percent, a car loan, and a
> credit card charging thirty-eight. They also have about sixteen lakh
> invested. They've got three lakh spare. Should it pay down a loan, or go
> into the market?"

**Edit:** Hold still. Let the number ₹48.19L breathe. No music yet.

### SHOT 2 · What it is — 0:12–0:28
**Screen:** Slowly click across the nav: Debt → Investments → back to Overview.
**Narrate:**
> "No tool answers that, because the question spans two tools that don't talk
> to each other. Fin·Esse does both. And every part of it is exposed to an AI
> agent through WebMCP."

**Edit:** Bring music in here, low. Text overlay: **45 WebMCP tools**.

### SHOT 3 · The agent reads live state — 0:28–1:00
**Type into ChatGPT:**
```
I've got ₹3,00,000 spare. Should I prepay a loan or invest it?
```
**Screen:** Loan rows flash gold. The activity rail fills.
**Narrate:**
> "Watch the right-hand side. It's not answering from training data — it's
> reading this person's actual loans, their portfolio, their cashflow. You can
> see exactly which parts it looked at."

**Edit:** **Zoom into the activity rail** as it fills. This is your best shot.
Callout arrow on the flashing loan row.

### SHOT 4 · The consent layer — 1:00–1:32 ⭐ MOST IMPORTANT
**Type:**
```
Go ahead and propose prepaying the credit card.
```
**Screen:** An approval card appears. **Nothing else changes.**
**Narrate:**
> "Here's the part that matters. It didn't do it. It can't. Every tool that
> would touch this person's money returns a proposal — never a change. The
> agent proposes. The human decides."

Now **click Approve**. The card balance drops to zero.
> "And now it happens."

**Edit:** Slow down here. Freeze for a beat on the approval card before
clicking. Text overlay: **The agent proposes. The human decides.** Consider
dimming everything except the card.

### SHOT 5 · Tools appear and disappear — 1:32–1:48
**Screen:** Point at the tool count in the header. Delete a loan from the UI —
the count drops.
**Narrate:**
> "The tool list isn't fixed. Prepayment tools don't exist until there's a
> loan to prepay. What the agent can see is always what the page can actually
> do."

**Edit:** Zoom on the number changing. Fast cut — don't linger.

### SHOT 6 · The what-if sandbox — 1:48–2:14
**Type:**
```
Open a what-if branch called "Clear the card", clear the credit card inside it, then show me how it compares to my real position.
```
**Screen:** A **sixth nav item** appears. The comparison shows before/after.
**Narrate:**
> "It can also fork the entire position and explore somewhere safe. Look at
> the comparison — net worth up, debt down, but the safety net got worse. A
> change can improve five things and set one back. It says so."

**Edit:** Callout box around the row that reads **worse**. That honesty is the
point — don't cut it.

### SHOT 7 · Handoff — 2:14–2:38
**Type:**
```
Package my whole position into a link I can send to my partner's agent.
```
Copy the link. Open it in a **second window**.
**Narrate:**
> "And it can hand the whole position to someone else's agent. Same numbers,
> their session. It travels inside the link — it never touches a server. No
> account, no upload."

**Edit:** **Split screen** — original left, new window right. Strongest visual
in the video.

### SHOT 8 · Close — 2:38–2:52
**Screen:** Back to Overview, still.
**Narrate:**
> "Fin·Esse. The agent reasons, the page does the arithmetic, and the human
> keeps the pen. Open source. Link below."

**Edit:** Music resolves. End card: app name, live URL, GitHub URL, MIT.

---

## 5. If you run over three minutes

Cut in this order. **Never cut Shot 4.**

1. Shot 5 (dynamic tools) — cut entirely, ~16s
2. Shot 2 — trim to one nav click, ~8s
3. Shot 6 — keep the branch appearing, drop the detailed comparison, ~10s
4. Shot 7 — show the link being made, skip the second window, ~10s

## 6. Optional extra shot — market research

Only if you're comfortably under time. Slot between 6 and 7.

**Type:**
```
What's happening in the markets right now that actually affects me?
```
**Screen:** The agent searches the live web, then a **market read** appears in
the right rail with a percentage per asset class.
**Narrate:**
> "It reads today's news — but only for what this person actually holds — and
> works out what it means. Including what it doesn't touch. Their debt and
> their safety net don't care what the market did."

## 7. If the agent misbehaves

It's a live AI. It won't be identical every take.

| Problem | Do this |
| --- | --- |
| Ignores the tools, answers from memory | Say *"Use the tools on this page."* Re-record |
| Picks the wrong loan | Should be the **credit card**. Retry once; if it repeats, tell the developer |
| Changes something without an approval card | **Stop. Tell the developer immediately.** That is a real bug, not a bad take |
| Rail stays empty | Reload the page, check the header still says *Agent connected* |
| Slow response | Cut the dead air. Don't speed up the footage — it reads as fake |

**Retakes are fine.** Record each shot separately and cut them together. Just
never fake a result the app didn't produce.

## 8. Before you upload

- [ ] Under 3:00
- [ ] Spoken narration throughout — no silent captions-only stretches
- [ ] Approval card clearly visible and legible
- [ ] Text is readable at 1080p — zoom in if not
- [ ] Public on YouTube, not unlisted
- [ ] No personal data on screen — the profile is fictional, keep it that way
- [ ] End card shows the live URL and the GitHub link
