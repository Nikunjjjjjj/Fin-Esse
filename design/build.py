# -*- coding: utf-8 -*-
import json, io, os

BONE="#F4F2ED"; SUNK="#EDEAE3"; LIFT="#FAF9F6"
INK="#23211E"; SOFT="#6B665D"; FAINT="#9C968A"
RULE="#DCD7CD"; RULE_S="#E6E2DA"
MOSS="#4A5D43"; MOSS_S="#7C8F73"; CLAY="#A8543A"; CLAY_S="#C98A72"
SAND="#C9C3B4"

SANS = "'Schibsted Grotesk', 'Helvetica Neue', Arial, sans-serif"
MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace"

NAV = [("Overview","Main"),("Debt","Debt"),("Investments","Investments"),
       ("Cashflow","Cashflow"),("Advice","Advice")]

def helmet():
    return f"""<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap">
  <style>
    body {{ margin: 0; background: {BONE}; font-family: {SANS}; color: {INK}; }}
    a {{ color: {MOSS}; text-decoration: none; }}
    a:hover {{ color: {INK}; }}
    * {{ box-sizing: border-box; }}
  </style>
</helmet>"""

def eyebrow(t):
    return (f'<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.13em; '
            f'color: {FAINT}; font-weight: 500;">{t}</div>')

def num(t, size=47, color=INK, weight="500"):
    return (f'<div style="font-family: {MONO}; font-size: {size}px; font-weight: {weight}; '
            f'color: {color}; letter-spacing: -0.035em; line-height: 1.05;">{t}</div>')

def sidebar(active):
    items = []
    for label, stem in NAV:
        on = stem == active
        items.append(
            f'<div style="padding: 8px 22px; font-size: 14.5px; '
            f'color: {INK if on else SOFT}; font-weight: {600 if on else 400}; '
            f'border-left: 2px solid {MOSS if on else "transparent"};">{label}</div>')
    nav = "\n        ".join(items)
    return f"""<aside style="width: 216px; flex: none; border-right: 1px solid {RULE}; padding: 26px 0 20px; display: flex; flex-direction: column; gap: 30px;">
      <div style="padding: 0 22px;">
        <div style="font-size: 19px; font-weight: 700; letter-spacing: -0.03em;">Fin·Esse</div>
        <div style="font-size: 12px; color: {FAINT};">planning, with an agent</div>
      </div>
      <div style="display: flex; flex-direction: column;">
        {nav}
      </div>
      <div style="margin-top: auto; padding: 0 22px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: inline-flex; border: 1px solid {RULE}; border-radius: 3px; overflow: hidden; width: fit-content;">
          <div style="padding: 3px 9px; font-size: 12px; background: {MOSS}; color: {LIFT};">₹ INR</div>
          <div style="padding: 3px 9px; font-size: 12px; color: {SOFT}; border-left: 1px solid {RULE};">$ USD</div>
        </div>
        <div style="display: flex; align-items: center; gap: 7px; font-size: 12px; color: {SOFT};">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: {MOSS}; flex: none;"></div>
          WebMCP live · 42 tools
        </div>
      </div>
    </aside>"""

EVENTS = [("Proposed", CLAY, "loan_propose_prepayment", "loanId=loan_card, lumpSum=164147"),
          ("Read", FAINT, "advisor_prepay_vs_invest", "amount=300000, horizonMonths=60"),
          ("Read", FAINT, "budget_summary", "called"),
          ("Read", FAINT, "loan_list", "called")]

def agent_rail():
    evs = []
    for i,(k,c,tool,detail) in enumerate(EVENTS):
        border = "none" if i == len(EVENTS)-1 else f"1px solid {RULE_S}"
        evs.append(
            f"""<div style="padding: 10px 0; border-bottom: {border};">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: {c}; font-weight: 600;">{k}</div>
          <div style="font-family: {MONO}; font-size: 12px; margin-top: 2px;">{tool}</div>
          <div style="color: {SOFT}; font-size: 12px; margin-top: 1px;">{detail}</div>
        </div>""")
    trail = "\n        ".join(evs)
    return f"""<aside style="width: 296px; flex: none; border-left: 1px solid {RULE}; padding: 26px 22px; background: {SUNK}; display: flex; flex-direction: column; gap: 26px;">
      <div>
        {eyebrow("Waiting on you")}
        <div style="background: {LIFT}; border: 1px solid {CLAY_S}; border-radius: 4px; padding: 14px; margin-top: 10px;">
          <div style="font-size: 14px; font-weight: 600;">Prepay ₹1.64L into the credit card</div>
          <div style="font-size: 12.5px; color: {SOFT}; margin-top: 5px;">38% is the most expensive money on your balance sheet.</div>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 10px; font-family: {MONO}; font-size: 12px; color: {SOFT};">
            <div style="display: flex; justify-content: space-between; gap: 10px;"><span style="color: {INK};">Outstanding</span><span>₹1.64L → ₹0</span></div>
            <div style="display: flex; justify-content: space-between; gap: 10px;"><span style="color: {INK};">Interest saved</span><span>₹63.08K</span></div>
            <div style="display: flex; justify-content: space-between; gap: 10px;"><span style="color: {INK};">Cash</span><span>₹9.00L → ₹7.36L</span></div>
          </div>
          <div style="display: flex; gap: 7px; margin-top: 13px;">
            <div style="background: {MOSS}; border: 1px solid {MOSS}; color: {LIFT}; border-radius: 3px; padding: 5px 11px; font-size: 12.5px; font-weight: 500;">Approve</div>
            <div style="border: 1px solid {RULE}; border-radius: 3px; padding: 5px 11px; font-size: 12.5px; color: {SOFT};">Reject</div>
          </div>
        </div>
      </div>
      <div>
        {eyebrow("Agent activity")}
        <div style="display: flex; flex-direction: column; margin-top: 4px;">
        {trail}
        </div>
      </div>
    </aside>"""

def page_head(eb, h1, sub):
    return f"""<div style="margin-bottom: 34px;">
        {eyebrow(eb)}
        <h1 style="font-size: 27px; font-weight: 600; letter-spacing: -0.015em; margin: 3px 0 0; text-wrap: balance;">{h1}</h1>
        <p style="color: {SOFT}; font-size: 14px; margin: 5px 0 0; max-width: 62ch;">{sub}</p>
      </div>"""

def hero(figure, sub):
    return f"""<div style="margin-bottom: 6px;">
        {num(figure)}
        <p style="color: {SOFT}; font-size: 14px; margin: 7px 0 0;">{sub}</p>
      </div>"""

def metric(label, value, note, color=INK):
    return f"""<div style="padding: 15px 18px 15px 0; border-bottom: 1px solid {RULE_S};">
          {eyebrow(label)}
          <div style="font-family: {MONO}; font-size: 21px; font-weight: 500; margin-top: 5px; letter-spacing: -0.02em; color: {color};">{value}</div>
          <div style="font-size: 12px; color: {FAINT}; margin-top: 2px;">{note}</div>
        </div>"""

def strip(metrics):
    return (f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); '
            f'margin: 36px 0; border-top: 1px solid {RULE};">\n        '
            + "\n        ".join(metrics) + "\n      </div>")

def sec_head(title, link=None):
    right = f'<div style="font-size: 12.5px; color: {MOSS};">{link}</div>' if link else ""
    return f"""<div style="display: flex; align-items: baseline; gap: 12px; padding-bottom: 9px; border-bottom: 1px solid {RULE}; margin-bottom: 4px;">
          <h2 style="font-size: 15px; font-weight: 600; margin: 0;">{title}</h2>
          <div style="flex: 1;"></div>
          {right}
        </div>"""

def row(title, amount, metas, flag=None):
    f = (f'<span style="color: {CLAY}; font-size: 11px; text-transform: uppercase; '
         f'letter-spacing: 0.09em; font-weight: 600;">{flag}</span>') if flag else ""
    m = "".join(f'<span>{x}</span>' for x in metas)
    return f"""<div style="display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; padding: 13px 0; border-bottom: 1px solid {RULE_S}; align-items: baseline;">
          <div style="font-weight: 500; font-size: 14.5px; display: flex; align-items: baseline; gap: 8px;"><span>{title}</span>{f}</div>
          <div style="font-family: {MONO}; font-size: 15px;">{amount}</div>
          <div style="grid-column: 1 / -1; display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; color: {SOFT}; margin-top: 1px;">{m}</div>
        </div>"""

def b(x):
    return f'<b style="font-family: {MONO}; font-weight: 500; color: {INK}; font-size: 12px;">{x}</b>'

def note(html):
    return f'<p style="color: {SOFT}; font-size: 13.5px; margin: 14px 0 0; max-width: 62ch;">{html}</p>'

def shell(active, main_html, height=1100):
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
{helmet()}
<div style="display: flex; width: 1440px; min-height: {height}px; background: {BONE};">
    {sidebar(active)}
    <main style="flex: 1; padding: 34px 52px 60px; min-width: 0;">
      {main_html}
    </main>
    {agent_rail()}
</div>
</x-dc>
</body>
</html>
"""

def write(stem, html, height=1100):
    with io.open(f"{stem}.dc.html", "w", encoding="utf-8") as f:
        f.write(shell(stem, html, height))
    print("wrote", stem)

# ---------------------------------------------------------------- Overview
overview = f"""{page_head("Net position", "Where you stand",
  "Everything you own, everything you owe, and what next month looks like.")}
      {hero("₹48.19L", f'<b style="font-weight:500;color:{INK}">₹1.20Cr</b> in assets against <b style="font-weight:500;color:{INK}">₹71.69L</b> of debt')}

      <div style="display: flex; height: 7px; margin: 22px 0 9px; border-radius: 2px; overflow: hidden; background: {SUNK};">
        <div style="width: 79.2%; background: {MOSS};"></div>
        <div style="width: 13.3%; background: {MOSS_S};"></div>
        <div style="width: 7.5%; background: {SAND};"></div>
      </div>
      <div style="display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: {SOFT};">
        <span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width:7px;height:7px;border-radius:1px;background:{MOSS};"></span>Property ₹95.00L</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width:7px;height:7px;border-radius:1px;background:{MOSS_S};"></span>Investable ₹15.88L</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width:7px;height:7px;border-radius:1px;background:{SAND};"></span>Cash ₹9.00L</span>
      </div>

      {strip([metric("Monthly surplus","₹70.22K","24.6% of income"),
              metric("Runway","4.9 mo","six is the usual floor", CLAY),
              metric("Debt service","32.6%","of income to EMIs"),
              metric("Exposure",'47<span style="font-size:13px;color:'+FAINT+'">/100</span>',"adequate")])}

      <section>
        {sec_head("Do this first", "All advice →")}
        <div style="border-left: 2px solid {CLAY}; padding: 2px 0 2px 16px; margin-top: 6px;">
          <h3 style="font-size: 15.5px; font-weight: 600; margin: 0;">Clear the credit card before anything else</h3>
          <p style="color: {SOFT}; font-size: 13.5px; margin: 5px 0 0; max-width: 60ch;">At 38% this debt costs more than three times what the portfolio is assumed to earn. Every unit put against it earns a guaranteed 38%, which no investment can promise. Clearing it removes ₹63.08K of scheduled interest.</p>
          <p style="font-size: 11.5px; color: {FAINT}; margin: 8px 0 0; font-family: {MONO};">loan_list · advisor_prepay_vs_invest</p>
        </div>
      </section>

      <section style="margin-top: 40px;">
        {sec_head("What you owe", "Detail →")}
        {row("Home loan — Sector 62 flat","₹61.07L",["8.6%", f"EMI {b('₹56.82K')}", "17 yr 2 mo left"])}
        {row("Car loan — Creta","₹8.97L",["9.4%", f"EMI {b('₹25.14K')}", "3 yr 6 mo left"])}
        {row("Credit card revolve","₹1.64L",["38.0%", f"EMI {b('₹10.82K')}", "1 yr 9 mo left"], flag="costly")}
      </section>"""
write("Main", overview)

# -------------------------------------------------------------------- Debt
debt = f"""{page_head("Debt", "Three loans, one that matters",
  "Rates decide priority here, not balances. The smallest balance is the most expensive money you hold.")}
      {hero("₹71.69L", f'outstanding across three loans · <b style="font-weight:500;color:{INK}">₹92.78K</b> a month in EMIs')}

      <section style="margin-top: 34px;">
        {sec_head("By cost, not by size")}
        {row("Credit card revolve","₹1.64L",[f"Rate {b('38.0%')}", f"EMI {b('₹10.82K')}", f"Interest to come {b('₹63.08K')}", "3 of 24 paid"], flag="costly")}
        {row("Car loan — Creta","₹8.97L",[f"Rate {b('9.4%')}", f"EMI {b('₹25.14K')}", f"Interest to come {b('₹1.59L')}", "18 of 60 paid"])}
        {row("Home loan — Sector 62 flat","₹61.07L",[f"Rate {b('8.6%')}", f"EMI {b('₹56.82K')}", f"Interest to come {b('₹55.98L')}", "34 of 240 paid"])}
        {note(f'The home loan carries <b style="font-weight:500;color:{INK}">₹55.98L</b> of interest still to pay — far more than the card in absolute terms. But at 8.6% it is cheaper than the 11% the portfolio is assumed to earn, so paying it down early costs you money. <b style="font-weight:500;color:{INK}">Size and cost point in opposite directions.</b>')}
      </section>

      <section style="margin-top: 40px;">
        {sec_head("If you put ₹3,00,000 against one of them")}
        {row("Credit card revolve","+₹72.08K",["clears it outright", "frees ₹10.82K/mo", "38% beats the 11% assumed return"], flag="prepay wins")}
        {row("Car loan — Creta","−₹23.13K",["9.4% vs 11% assumed", "closes in 27 months either way", "investing wins, narrowly"])}
        {row("Home loan — Sector 62 flat","−₹58.20K",["8.6% vs 11% assumed", "investing wins clearly"])}
        {note("Figures are the net-worth difference after 60 months versus investing the same cash, with the freed-up EMI reinvested in both paths.")}
      </section>"""
write("Debt", debt)

# ------------------------------------------------------------- Investments
invest = f"""{page_head("Investments", "Concentrated in one position",
  "Bitcoin is 44.6% of the investable portfolio. Everything else about this page is downstream of that.")}
      {hero("₹15.88L", "investable, plus ₹95.00L of property held outside the portfolio")}

      <div style="display: flex; height: 10px; margin: 22px 0 11px; border-radius: 3px; overflow: hidden; background: {SUNK};">
        <div style="width: 44.6%; background: {CLAY};"></div>
        <div style="width: 32.7%; background: {MOSS};"></div>
        <div style="width: 15.4%; background: {MOSS_S};"></div>
        <div style="width: 7.4%; background: {SAND};"></div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; font-size: 12.5px; color: {SOFT};">
        <span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width:7px;height:7px;border-radius:1px;background:{CLAY};"></span>Crypto 44.6%</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width:7px;height:7px;border-radius:1px;background:{MOSS};"></span>Equity 32.7%</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width:7px;height:7px;border-radius:1px;background:{MOSS_S};"></span>Debt 15.4%</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width:7px;height:7px;border-radius:1px;background:{SAND};"></span>Gold 7.4%</span>
      </div>

      {strip([metric("Expected return","13.6%","blended, per asset class"),
              metric("Volatility","38.9%","blended"),
              metric("Risk score",'85<span style="font-size:13px;color:'+FAINT+'">/100</span>',"concentration + volatility", CLAY),
              metric("Positions","5","across four asset classes")])}

      <section>
        {sec_head("Holdings")}
        {row("Bitcoin","₹7.08L",["BTC", f"0.12 × {b('₹59.00L')}", "Crypto"], flag="44.6% of portfolio")}
        {row("Parag Parikh Flexi Cap","₹2.62L",["PPFAS", f"3,200 × {b('₹82')}", "Equity"])}
        {row("Nifty 50 index ETF","₹2.56L",["NIFTYBEES", f"900 × {b('₹285')}", "Equity"])}
        {row("10Y Gilt fund","₹2.44L",["GILT10", f"4,000 × {b('₹61')}", "Debt"])}
        {row("Gold ETF","₹1.17L",["GOLDBEES", f"1,500 × {b('₹78')}", "Gold"])}
      </section>

      <section style="margin-top: 40px;">
        {sec_head("Property and other real assets")}
        {note("Counted in net worth, excluded from allocation, rebalancing and concentration risk — you cannot sell a third of the house you live in. A broad market shock still marks it down.")}
        {row("Sector 62 flat","₹95.00L",["self-occupied", "secures the ₹61.07L home loan"])}
      </section>"""
write("Investments", invest)

# ---------------------------------------------------------------- Cashflow
cash = f"""{page_head("Cashflow", "₹70.22K free each month",
  "What comes in, what is already committed, and whether the goals fit in what is left.")}
      {hero("₹70.22K", "a month, after ₹2.15L of outgoings — a 24.6% savings rate")}

      {strip([metric("Income","₹2.85L","monthly take-home"),
              metric("Essentials","₹91.00K","cannot be cut"),
              metric("Discretionary","₹31.00K","could be cut"),
              metric("EMIs","₹92.78K","32.6% of income", CLAY)])}

      <section>
        {sec_head("Where it goes")}
        {row("Household &amp; groceries","₹42.00K",["essential"])}
        {row("School fees","₹26.00K",["essential"])}
        {row("Society maintenance + utilities","₹14.00K",["essential"])}
        {row("Insurance premiums","₹9.00K",["essential"])}
        {row("Dining, travel, subscriptions","₹31.00K",["discretionary", "the only line with give in it"], flag="discretionary")}
      </section>

      <section style="margin-top: 40px;">
        {sec_head("Goals")}
        {row("Daughter's undergrad fund","₹40.00L",[f"needs {b('₹9.89K')}/mo", "in 10 yr", f"saved {b('₹6.20L')}"], flag="fundable")}
        <div style="height: 5px; border-radius: 3px; background: {SUNK}; margin: -6px 0 8px;"><div style="width: 15.5%; height: 100%; background: {MOSS}; border-radius: 3px;"></div></div>
        {row("12-month emergency fund","₹18.00L",[f"needs {b('₹25.45K')}/mo", "in 2 yr", f"saved {b('₹9.00L')}"], flag="fundable")}
        <div style="height: 5px; border-radius: 3px; background: {SUNK}; margin: -6px 0 8px;"><div style="width: 50%; height: 100%; background: {MOSS}; border-radius: 3px;"></div></div>
        {note(f'Both goals fit inside the ₹70.22K monthly surplus, using <b style="font-weight:500;color:{INK}">50.3%</b> of it. The emergency fund is the binding one — at 4.9 months of runway today, it is also the thing standing between a job gap and a forced sale.')}
      </section>"""
write("Cashflow", cash)

# ------------------------------------------------------------------ Advice
def rec(n, title, action, why, evidence):
    return f"""<div style="display: grid; grid-template-columns: auto 1fr; gap: 0 14px; padding: 18px 0; border-bottom: 1px solid {RULE_S};">
          <div style="font-family: {MONO}; font-size: 12px; color: {FAINT}; padding-top: 3px;">{n}</div>
          <div>
            <h3 style="font-size: 15.5px; font-weight: 600; margin: 0;">{title}</h3>
            <p style="font-size: 13.5px; margin: 5px 0 0; max-width: 62ch;">{action}</p>
            <p style="color: {SOFT}; font-size: 13.5px; margin: 5px 0 0; max-width: 62ch;">{why}</p>
            <p style="font-size: 11.5px; color: {FAINT}; margin: 8px 0 0; font-family: {MONO};">{evidence}</p>
          </div>
        </div>"""

def stance(name, assumed, headline, why, creed):
    return f"""<div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: baseline; gap: 10px;">
              <h3 style="font-size: 14.5px; font-weight: 600; margin: 0;">{name}</h3>
              <div style="flex: 1;"></div>
              <span style="font-family: {MONO}; font-size: 11px; color: {FAINT};">{assumed} assumed</span>
            </div>
            <p style="font-size: 13.5px; font-weight: 500; margin: 8px 0 0;">{headline}</p>
            <p style="color: {SOFT}; font-size: 13px; margin: 6px 0 0;">{why}</p>
            <p style="color: {FAINT}; font-size: 12.5px; margin: 8px 0 0; font-style: italic;">“{creed}”</p>
          </div>"""

advice = f"""{page_head("Advice", "Three moves, in order",
  "Every item names the tools that produced its evidence, so you can check the reasoning rather than take it on trust.")}

      <section>
        {sec_head("Prioritised")}
        {rec("01","Clear “Credit card revolve” before anything else",
             "Direct surplus cash at the 38% balance of ₹1.64L.",
             "At 38% this debt costs far more than the 11% the portfolio is assumed to earn. Every unit of currency put against it earns a guaranteed 38%, which no investment can promise.",
             "loan_list · advisor_prepay_vs_invest")}
        {rec("02","Rebuild the emergency buffer to six months",
             "Hold ₹2.02L more in liquid cash.",
             "Only 4.9 months of essentials and EMIs are covered. With 32.6% of income already committed to debt service, a job gap forces selling investments at the worst moment.",
             "budget_summary · loan_list · advisor_stress_test")}
        {rec("03","Trim concentration in the portfolio",
             "Bitcoin is the largest single position at 44.6%; consider capping it and rotating into debt.",
             "Portfolio risk score is 85/100 with 38.9% blended volatility. Carrying that alongside 32.6% debt service stacks two risks on the same balance sheet.",
             "portfolio_allocation · advisor_risk_exposure")}
      </section>

      <section style="margin-top: 40px;">
        {sec_head("Second opinion on ₹3,00,000")}
        <div style="color: {CLAY}; font-weight: 600; font-size: 13.5px; margin: 12px 0 14px;">The advisors disagree</div>
        <div style="display: flex; gap: 28px;">
          {stance("Growth","13.0%","Put the ₹3.00L into the credit card.",
                  "At 38% this debt clears the 13% bar where this stance stops treating borrowing as leverage. Prepaying wins by ₹72.08K over 60 months.",
                  "Time in the market beats certainty. Cheap debt is leverage, not an emergency.")}
          {stance("Capital preservation","7.0%","Hold the ₹3.00L as cash.",
                  "Runway is 4.9 months against a 6-month floor. A household that cannot absorb a shock has no business deploying cash anywhere.",
                  "A guaranteed return beats an expected one. Debt repayment is risk-free alpha.")}
        </div>
        {note(f'<b style="font-weight:500;color:{INK}">Where it turns:</b> the disagreement is about liquidity, not returns. Runway is 4.9 months; one stance requires 6 before deploying anything, the other accepts 3. Neither is wrong — pick the floor you actually believe in and the action follows.')}
      </section>"""
write("Advice", advice)

# ------------------------------------------------------------- canvas.json
W, H, GX, GY = 1440, 1100, 110, 150
boards = [("Main",0,0),("Debt",1,0),("Investments",2,0),("Cashflow",0,1),("Advice",1,1)]
canvas = {
  "artboards": [{"file": f"{n}.dc.html", "x": c*(W+GX), "y": r*(H+GY), "w": W, "h": H}
                for n,c,r in boards],
  "annotations": [
    {"id": "brief", "x": 0, "y": -190, "w": 620,
     "text": "Fin·Esse — page-wise layout, warm editorial.\nBone ground, warm charcoal ink, moss accent, clay for anything wrong.\nSchibsted Grotesk for text, IBM Plex Mono for every figure.\nAll numbers are real output from the app's engine, not placeholders."},
    {"id": "rail-note", "x": 3210, "y": 0, "w": 300,
     "text": "The agent rail is pinned on every page — approvals and the live tool trail are global state, not a page.\n\nOnly the approval gets card chrome: it is the one thing asking you to act."},
  ],
  "launch": {"view": "canvas"},
}
with io.open("canvas.json","w",encoding="utf-8") as f:
    json.dump(canvas, f, indent=1, ensure_ascii=False)
print("wrote canvas.json")

# ------------------------------------------------------------------ What-if
def diff_row(label, before, after, verdict):
    col = {"better": MOSS, "worse": CLAY, "flat": FAINT}[verdict]
    mark = {"better": "improved", "worse": "worse", "flat": "unchanged"}[verdict]
    return f"""<div style="display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 20px; padding: 12px 0; border-bottom: 1px solid {RULE_S}; align-items: baseline;">
          <div style="font-size: 14px;">{label}</div>
          <div style="font-family: {MONO}; font-size: 14px; color: {FAINT};">{before}</div>
          <div style="font-family: {MONO}; font-size: 14px; color: {INK}; font-weight: 500;">{after}</div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.09em; font-weight: 600; color: {col};">{mark}</div>
        </div>"""

def entity_row(name, status, detail):
    col = {"added": MOSS, "removed": CLAY, "changed": SOFT}[status]
    return f"""<div style="display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; padding: 12px 0; border-bottom: 1px solid {RULE_S}; align-items: baseline;">
          <div style="font-weight: 500; font-size: 14.5px;">{name}</div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.09em; font-weight: 600; color: {col};">{status}</div>
          <div style="grid-column: 1 / -1; font-family: {MONO}; font-size: 12px; color: {SOFT};">{detail}</div>
        </div>"""

whatif = f"""<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 22px;">
        <div style="display: inline-flex; border: 1px solid {RULE}; border-radius: 3px; overflow: hidden;">
          <div style="padding: 6px 14px; font-size: 13px; color: {SOFT};">Your position</div>
          <div style="padding: 6px 14px; font-size: 13px; background: {INK}; color: {BONE}; font-weight: 500; border-left: 1px solid {RULE};">What-if</div>
        </div>
        <div style="font-size: 12.5px; color: {SOFT};">Your five real pages are unchanged and one click away.</div>
      </div>

      {page_head("What-if branch", "Clear the card",
        "A throwaway fork of your whole position. Nothing here touches your real numbers unless you keep it.")}

      <div style="display: flex; gap: 8px; margin: -18px 0 30px;">
        <div style="border: 1px solid {RULE}; border-radius: 3px; padding: 6px 14px; font-size: 13px; color: {SOFT};">Discard</div>
        <div style="background: {MOSS}; border: 1px solid {MOSS}; color: {LIFT}; border-radius: 3px; padding: 6px 14px; font-size: 13px; font-weight: 500;">Keep these changes</div>
      </div>

      <p style="font-size: 13.5px; color: {SOFT}; margin: 0 0 26px; max-width: 62ch;">3 changes so far. Net worth ₹48.19L → ₹49.83L. 5 measures improved, 1 got worse.</p>

      <section>
        <div style="display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 20px; padding-bottom: 9px; border-bottom: 1px solid {RULE};">
          <div style="font-size: 15px; font-weight: 600;">Headline</div>
          {eyebrow("Your position")}
          {eyebrow("In this branch")}
          <div></div>
        </div>
        {diff_row("Net worth","₹48.19L","₹49.83L","better")}
        {diff_row("Total debt","₹71.69L","₹70.05L","better")}
        {diff_row("Monthly surplus","₹70.22K","₹81.04K","better")}
        {diff_row("Emergency runway","4.9 mo","4.4 mo","worse")}
        {diff_row("Debt service","32.6%","28.8%","better")}
        {diff_row("Exposure","47/100","43/100","better")}
        {diff_row("Portfolio risk","85/100","85/100","flat")}
      </section>

      <section style="margin-top: 40px;">
        {sec_head("What changed")}
        {entity_row("Credit card revolve","removed","Outstanding ₹1.64L → ₹0 · EMI ₹10.82K → ₹0")}
        {entity_row("Cash reserve","changed","₹9.00L → ₹7.36L")}
        {entity_row("Home loan — Sector 62 flat","changed","Months left 206 → 206")}
        {note(f'Runway fell because the prepayment came out of cash. That is the trade this branch exists to make visible: <b style="font-weight:500;color:{INK}">a change can be an improvement on five measures and a step backwards on a sixth</b>. Direction is not the same as good.')}
      </section>"""
write("Whatif", whatif)

canvas["artboards"].append({"file": "Whatif.dc.html", "x": 2*(W+GX), "y": 1*(H+GY), "w": W, "h": H})
canvas["annotations"].append({
  "id": "whatif-note", "x": 3210, "y": 1250, "w": 300,
  "text": "The sixth screen — only exists while a branch is open.\n\nIt is a place you visit, not a mode the app enters: the five real pages keep showing real numbers the whole time.\n\nThe hard part: a figure can change and be WORSE. Changed and improved need different treatments."})
with io.open("canvas.json","w",encoding="utf-8") as f:
    json.dump(canvas, f, indent=1, ensure_ascii=False)
print("re-wrote canvas.json with 6 artboards")
