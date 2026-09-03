# -*- coding: utf-8 -*-
import io, json
W, H = 1280, 880
NAV = ["Overview", "Debt", "Investments", "Cashflow", "Advice"]

def doc(body, fonts, css):
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fonts}&amp;display=swap">
  <style>
{css}
  </style>
</helmet>
{body}
</x-dc>
</body>
</html>
"""

# ════════════════════════════════════ A — INSTRUMENT (Swiss precision, light)
class A:
    GROUND="#FCFCFD"; PANEL="#FFFFFF"; INK="#14161A"; MUTED="#666E7A"; FAINT="#98A0AC"
    HAIR="#E4E7EC"; ACCENT="#38566F"; WARN="#A6402C"
    css = f"""    body {{ margin:0; background:{GROUND}; color:{INK};
      font-family:'Archivo','Helvetica Neue',Arial,sans-serif;
      -webkit-font-smoothing:antialiased; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{ACCENT}; text-decoration:none; }} a:hover {{ color:{INK}; }}
    .n {{ font-variant-numeric:tabular-nums; letter-spacing:-.02em; }}
    .lbl {{ font-size:10.5px; letter-spacing:.13em; text-transform:uppercase;
      color:{FAINT}; font-weight:600; }}"""

def a_stat(label, value, note, accent=None):
    return f"""<div style="padding:20px 22px; border-right:1px solid {A.HAIR};">
        <div class="lbl">{label}</div>
        <div class="n" style="font-size:27px; font-weight:600; margin-top:9px; color:{accent or A.INK};">{value}</div>
        <div style="font-size:12px; color:{A.MUTED}; margin-top:5px;">{note}</div>
      </div>"""

a_body = f"""<div style="width:{W}px; min-height:{H}px; background:{A.GROUND}; display:flex; flex-direction:column;">
  <div style="display:flex; align-items:center; gap:30px; padding:0 40px; height:60px; border-bottom:1px solid {A.HAIR}; background:{A.PANEL};">
    <div style="font-size:16px; font-weight:700; letter-spacing:-.02em;">Fin<span style="color:{A.ACCENT};">·</span>Esse</div>
    <div style="display:flex; gap:26px;">
      {"".join(f'<div style="font-size:13.5px; color:{A.INK if n=="Overview" else A.MUTED}; font-weight:{600 if n=="Overview" else 400}; height:60px; line-height:60px; box-shadow:{"inset 0 -2px 0 "+A.ACCENT if n=="Overview" else "none"};">{n}</div>' for n in NAV)}
    </div>
    <div style="flex:1;"></div>
    <div style="display:flex; align-items:center; gap:7px; font-size:12.5px; color:{A.MUTED};">
      <span style="width:6px;height:6px;border-radius:50%;background:{A.ACCENT};"></span>Agent connected
    </div>
  </div>

  <div style="display:grid; grid-template-columns:1fr 380px; flex:1;">
    <div style="padding:40px; border-right:1px solid {A.HAIR};">
      <div class="lbl">Everything you own, minus everything you owe</div>
      <div class="n" style="font-size:64px; font-weight:600; line-height:1; margin-top:14px;">₹48,19,000</div>
      <div style="font-size:14px; color:{A.MUTED}; margin-top:10px;">₹1.20 Cr owned · ₹71.69 L owed</div>

      <div style="display:flex; height:4px; margin-top:32px; gap:2px;">
        <div style="width:79%; background:{A.ACCENT};"></div>
        <div style="width:13%; background:#8FA6B8;"></div>
        <div style="width:8%; background:{A.HAIR};"></div>
      </div>
      <div style="display:flex; gap:26px; margin-top:12px; font-size:12.5px; color:{A.MUTED};">
        <span>Home ₹95 L</span><span>Invested ₹15.9 L</span><span>Cash ₹9 L</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4,1fr); margin:44px -22px 0; border-top:1px solid {A.HAIR}; border-bottom:1px solid {A.HAIR};">
        {a_stat("Free each month","₹70,215","after everything is paid")}
        {a_stat("Safety net","4.9 mo","aim for six", A.WARN)}
        {a_stat("Goes to loans","32.6%","of what you earn")}
        {a_stat("Overall health","47/100","holding up")}
      </div>

      <div style="margin-top:44px;">
        <div class="lbl">Do this first</div>
        <div style="font-size:19px; font-weight:600; margin-top:12px; letter-spacing:-.01em;">Clear the credit card before anything else</div>
        <div style="font-size:14px; color:{A.MUTED}; margin-top:8px; max-width:58ch; line-height:1.6;">It charges 38% a year — more than three times what your investments are assumed to earn. Every rupee against it is a guaranteed 38% return, which no investment can promise.</div>
      </div>
    </div>

    <div style="padding:32px 28px; display:flex; flex-direction:column; gap:30px; background:{A.PANEL};">
      <div>
        <div class="lbl" style="color:{A.WARN};">Needs your approval</div>
        <div style="border:1px solid {A.HAIR}; border-top:2px solid {A.WARN}; padding:18px; margin-top:12px;">
          <div style="font-size:15.5px; font-weight:600;">Pay ₹1.64 L into the credit card</div>
          <div style="font-size:13px; color:{A.MUTED}; margin-top:6px; line-height:1.55;">Saves ₹63,080 in interest and frees ₹10,820 a month.</div>
          <div class="n" style="margin-top:14px; font-size:13px; display:flex; flex-direction:column; gap:7px;">
            <div style="display:flex; justify-content:space-between; padding-bottom:7px; border-bottom:1px solid {A.HAIR};"><span style="color:{A.MUTED};">Card</span><span>₹1.64 L → ₹0</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:{A.MUTED};">Cash</span><span>₹9 L → ₹7.36 L</span></div>
          </div>
          <div style="display:flex; gap:8px; margin-top:18px;">
            <div style="flex:1; text-align:center; background:{A.INK}; color:{A.PANEL}; padding:9px; font-size:13.5px; font-weight:600;">Approve</div>
            <div style="flex:1; text-align:center; border:1px solid {A.HAIR}; padding:9px; font-size:13.5px; font-weight:600;">Decline</div>
          </div>
        </div>
      </div>
      <div>
        <div class="lbl">Agent activity</div>
        <div style="margin-top:12px; display:flex; flex-direction:column;">
          {"".join(f'<div style="display:flex; gap:12px; padding:11px 0; border-bottom:1px solid {A.HAIR}; font-size:13px;"><span style="color:{c}; font-weight:600; min-width:62px; font-size:11px; letter-spacing:.06em; text-transform:uppercase;">{k}</span><span style="color:{A.MUTED};">{t}</span></div>' for k,c,t in [("Asked",A.WARN,"to clear the card"),("Ran",A.ACCENT,"prepay vs invest, ₹3 L"),("Read",A.FAINT,"loans, budget, portfolio")])}
        </div>
      </div>
    </div>
  </div>
</div>"""
io.open("Main.dc.html","w",encoding="utf-8").write(doc(a_body,
  "family=Archivo:wght@400;500;600;700", A.css))
print("A Instrument")

# ═══════════════════════════════════ B — PRIVATE BANK (dark ink, bronze, serif)
class B:
    GROUND="#101317"; PANEL="#161A1F"; EDGE="#252B33"
    INK="#EDE9E1"; MUTED="#8A9099"; FAINT="#5F6771"
    BRONZE="#B58C50"; WARN="#C4664A"
    css = f"""    body {{ margin:0; background:{GROUND}; color:{INK};
      font-family:'Jost','Helvetica Neue',Arial,sans-serif;
      -webkit-font-smoothing:antialiased; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{BRONZE}; text-decoration:none; }} a:hover {{ color:{INK}; }}
    .fig {{ font-family:'Newsreader',Georgia,serif; font-variant-numeric:tabular-nums;
      font-weight:400; letter-spacing:-.01em; }}
    .lbl {{ font-size:10px; letter-spacing:.18em; text-transform:uppercase;
      color:{FAINT}; font-weight:500; }}"""

def b_stat(label, value, note, accent=None):
    return f"""<div>
        <div class="lbl">{label}</div>
        <div class="fig" style="font-size:32px; margin-top:10px; color:{accent or B.INK};">{value}</div>
        <div style="font-size:12px; color:{B.MUTED}; margin-top:6px;">{note}</div>
      </div>"""

b_body = f"""<div style="width:{W}px; min-height:{H}px; background:{B.GROUND}; padding:0;">
  <div style="display:flex; align-items:center; gap:34px; padding:0 46px; height:72px; border-bottom:1px solid {B.EDGE};">
    <div class="fig" style="font-size:21px; letter-spacing:.02em;">Fin<span style="color:{B.BRONZE};">·</span>Esse</div>
    <div style="flex:1;"></div>
    <div style="display:flex; gap:30px;">
      {"".join(f'<div style="font-size:13px; letter-spacing:.03em; color:{B.INK if n=="Overview" else B.MUTED};">{n}</div>' for n in NAV)}
    </div>
    <div style="width:1px; height:20px; background:{B.EDGE};"></div>
    <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:{B.MUTED};">
      <span style="width:5px;height:5px;border-radius:50%;background:{B.BRONZE};"></span>Agent connected
    </div>
  </div>

  <div style="display:grid; grid-template-columns:1fr 370px; gap:0; min-height:{H-72}px;">
    <div style="padding:52px 46px;">
      <div class="lbl">Net position</div>
      <div class="fig" style="font-size:76px; line-height:1; margin-top:16px;">₹48,19,000</div>
      <div style="font-size:14px; color:{B.MUTED}; margin-top:14px; letter-spacing:.01em;">₹1.20 Cr owned, against ₹71.69 L owed</div>

      <div style="display:flex; height:3px; margin-top:38px;">
        <div style="width:79%; background:{B.BRONZE};"></div>
        <div style="width:13%; background:#6E7C8A;"></div>
        <div style="width:8%; background:{B.EDGE};"></div>
      </div>
      <div style="display:flex; gap:30px; margin-top:14px; font-size:12px; color:{B.MUTED}; letter-spacing:.02em;">
        <span>Home ₹95 L</span><span>Invested ₹15.9 L</span><span>Cash ₹9 L</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:34px; margin-top:52px; padding-top:34px; border-top:1px solid {B.EDGE};">
        {b_stat("Free each month","₹70,215","after everything is paid")}
        {b_stat("Safety net","4.9 mo","aim for six", B.WARN)}
        {b_stat("Goes to loans","32.6%","of what you earn")}
        {b_stat("Overall health","47","of a hundred")}
      </div>

      <div style="margin-top:52px; padding-top:34px; border-top:1px solid {B.EDGE};">
        <div class="lbl">Do this first</div>
        <div class="fig" style="font-size:26px; margin-top:14px;">Clear the credit card before anything else</div>
        <div style="font-size:14px; color:{B.MUTED}; margin-top:10px; max-width:56ch; line-height:1.7;">It charges 38% a year — more than three times what your investments are assumed to earn. Every rupee against it returns a guaranteed 38%, which no investment can promise.</div>
      </div>
    </div>

    <div style="padding:52px 40px; border-left:1px solid {B.EDGE}; background:{B.PANEL}; display:flex; flex-direction:column; gap:44px;">
      <div>
        <div class="lbl" style="color:{B.WARN};">Awaiting your decision</div>
        <div class="fig" style="font-size:22px; margin-top:14px; line-height:1.35;">Pay ₹1.64 L into the credit card</div>
        <div style="font-size:13px; color:{B.MUTED}; margin-top:9px; line-height:1.6;">Saves ₹63,080 in interest and frees ₹10,820 a month.</div>
        <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; padding-bottom:10px; border-bottom:1px solid {B.EDGE};"><span style="color:{B.FAINT};">Card</span><span class="fig">₹1.64 L → ₹0</span></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:{B.FAINT};">Cash</span><span class="fig">₹9 L → ₹7.36 L</span></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:24px;">
          <div style="flex:1; text-align:center; background:{B.BRONZE}; color:{B.GROUND}; padding:11px; font-size:13px; font-weight:500; letter-spacing:.04em;">Approve</div>
          <div style="flex:1; text-align:center; border:1px solid {B.EDGE}; color:{B.MUTED}; padding:11px; font-size:13px; letter-spacing:.04em;">Decline</div>
        </div>
      </div>
      <div>
        <div class="lbl">Agent activity</div>
        <div style="margin-top:16px; display:flex; flex-direction:column; gap:14px; font-size:13px;">
          {"".join(f'<div style="display:flex; gap:14px;"><span style="color:{c}; min-width:52px; font-size:10px; letter-spacing:.14em; text-transform:uppercase; padding-top:3px;">{k}</span><span style="color:{B.MUTED};">{t}</span></div>' for k,c,t in [("Asked",B.WARN,"to clear the card"),("Ran",B.BRONZE,"prepay vs invest, ₹3 L"),("Read",B.FAINT,"loans, budget, portfolio")])}
        </div>
      </div>
    </div>
  </div>
</div>"""
io.open("PrivateBank.dc.html","w",encoding="utf-8").write(doc(b_body,
  "family=Newsreader:opsz,wght@6..72,300;6..72,400&amp;family=Jost:wght@300;400;500", B.css))
print("B PrivateBank")

# ═══════════════════════════════════════ C — BROADSHEET (editorial, didone)
class C:
    GROUND="#F7F5F0"; INK="#1A1815"; MUTED="#5E5A52"; FAINT="#948E82"
    RULE="#CFC9BC"; HAIR="#E2DDD2"; ACCENT="#1F3A5F"; WARN="#8C3A2B"
    css = f"""    body {{ margin:0; background:{GROUND}; color:{INK};
      font-family:'Libre Franklin','Helvetica Neue',Arial,sans-serif;
      -webkit-font-smoothing:antialiased; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{ACCENT}; text-decoration:none; }} a:hover {{ color:{INK}; }}
    .fig {{ font-family:'Bodoni Moda',Didot,Georgia,serif; font-variant-numeric:tabular-nums; }}
    .lbl {{ font-size:10px; letter-spacing:.16em; text-transform:uppercase;
      color:{FAINT}; font-weight:600; }}"""

def c_stat(label, value, note, accent=None):
    return f"""<div style="padding-right:26px;">
        <div class="lbl">{label}</div>
        <div class="fig" style="font-size:34px; font-weight:500; margin-top:8px; color:{accent or C.INK};">{value}</div>
        <div style="font-size:12px; color:{C.MUTED}; margin-top:6px;">{note}</div>
      </div>"""

c_body = f"""<div style="width:{W}px; min-height:{H}px; background:{C.GROUND}; padding:34px 48px 48px;">
  <div style="display:flex; align-items:baseline; gap:20px; border-bottom:3px solid {C.INK}; padding-bottom:14px;">
    <div class="fig" style="font-size:30px; font-weight:600; letter-spacing:-.01em;">Fin·Esse</div>
    <div style="font-size:11.5px; color:{C.MUTED}; letter-spacing:.04em;">Your money, examined</div>
    <div style="flex:1;"></div>
    <div style="display:flex; gap:24px;">
      {"".join(f'<div style="font-size:12px; letter-spacing:.09em; text-transform:uppercase; font-weight:{700 if n=="Overview" else 500}; color:{C.INK if n=="Overview" else C.MUTED};">{n}</div>' for n in NAV)}
    </div>
  </div>
  <div style="display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid {C.RULE}; font-size:11px; color:{C.FAINT}; letter-spacing:.05em;">
    <span>Thursday, 3 September 2026</span><span>Agent connected — 42 tools</span>
  </div>

  <div style="display:grid; grid-template-columns:1fr 340px; gap:44px; margin-top:34px;">
    <div>
      <div class="lbl">Everything you own, minus everything you owe</div>
      <div class="fig" style="font-size:82px; font-weight:500; line-height:1; margin-top:12px; letter-spacing:-.02em;">₹48,19,000</div>
      <div style="font-size:14px; color:{C.MUTED}; margin-top:12px;">₹1.20 Cr owned, against ₹71.69 L owed.</div>

      <div style="display:flex; height:5px; margin-top:30px;">
        <div style="width:79%; background:{C.INK};"></div>
        <div style="width:13%; background:{C.ACCENT};"></div>
        <div style="width:8%; background:{C.RULE};"></div>
      </div>
      <div style="display:flex; gap:26px; margin-top:11px; font-size:12px; color:{C.MUTED};">
        <span>Home ₹95 L</span><span style="color:{C.ACCENT};">Invested ₹15.9 L</span><span>Cash ₹9 L</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin-top:40px; padding:26px 0; border-top:1px solid {C.RULE}; border-bottom:1px solid {C.RULE};">
        {c_stat("Free each month","₹70,215","after everything")}
        {c_stat("Safety net","4.9 mo","aim for six", C.WARN)}
        {c_stat("Goes to loans","32.6%","of income")}
        {c_stat("Overall health","47/100","holding up")}
      </div>

      <div style="margin-top:36px; display:grid; grid-template-columns:auto 1fr; gap:22px;">
        <div class="fig" style="font-size:44px; font-weight:500; color:{C.WARN}; line-height:1;">01</div>
        <div>
          <div style="font-size:21px; font-weight:600; letter-spacing:-.01em; line-height:1.3;">Clear the credit card before anything else</div>
          <div style="font-size:14px; color:{C.MUTED}; margin-top:9px; max-width:56ch; line-height:1.65;">It charges 38% a year — more than three times what your investments are assumed to earn. Every rupee against it returns a guaranteed 38%, which no investment can promise.</div>
        </div>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:36px;">
      <div style="border:1px solid {C.INK}; background:{C.GROUND};">
        <div style="background:{C.INK}; color:{C.GROUND}; padding:8px 16px; font-size:10px; letter-spacing:.16em; text-transform:uppercase; font-weight:600;">Needs your approval</div>
        <div style="padding:20px;">
          <div style="font-size:17px; font-weight:600; line-height:1.35;">Pay ₹1.64 L into the credit card</div>
          <div style="font-size:13px; color:{C.MUTED}; margin-top:8px; line-height:1.6;">Saves ₹63,080 in interest and frees ₹10,820 a month.</div>
          <div style="margin-top:18px; font-size:13px; display:flex; flex-direction:column; gap:9px;">
            <div style="display:flex; justify-content:space-between; padding-bottom:9px; border-bottom:1px solid {C.HAIR};"><span style="color:{C.FAINT};">Card</span><span class="fig" style="font-weight:500;">₹1.64 L → ₹0</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:{C.FAINT};">Cash</span><span class="fig" style="font-weight:500;">₹9 L → ₹7.36 L</span></div>
          </div>
          <div style="display:flex; gap:9px; margin-top:20px;">
            <div style="flex:1; text-align:center; background:{C.INK}; color:{C.GROUND}; padding:10px; font-size:13px; font-weight:600;">Approve</div>
            <div style="flex:1; text-align:center; border:1px solid {C.RULE}; padding:10px; font-size:13px; font-weight:600;">Decline</div>
          </div>
        </div>
      </div>
      <div>
        <div class="lbl" style="border-bottom:1px solid {C.RULE}; padding-bottom:9px;">Agent activity</div>
        {"".join(f'<div style="display:flex; gap:14px; padding:12px 0; border-bottom:1px solid {C.HAIR}; font-size:13px;"><span style="min-width:56px; font-size:10px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; color:{c};">{k}</span><span style="color:{C.MUTED};">{t}</span></div>' for k,c,t in [("Asked",C.WARN,"to clear the card"),("Ran",C.ACCENT,"prepay vs invest, ₹3 L"),("Read",C.FAINT,"loans, budget, portfolio")])}
      </div>
    </div>
  </div>
</div>"""
io.open("Broadsheet.dc.html","w",encoding="utf-8").write(doc(c_body,
  "family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600&amp;family=Libre+Franklin:wght@400;500;600;700", C.css))
print("C Broadsheet")

# ═══════════════════════════════════════════ D — ATELIER (soft depth, product)
class D:
    GROUND="#F5F6F4"; CARD="#FFFFFF"; INK="#1B1F1C"; MUTED="#6B7570"; FAINT="#9AA39D"
    HAIR="#E5E8E4"; ACCENT="#3F6F5E"; WARN="#B5563F"
    css = f"""    body {{ margin:0; background:{GROUND}; color:{INK};
      font-family:'Manrope','Helvetica Neue',Arial,sans-serif;
      -webkit-font-smoothing:antialiased; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{ACCENT}; text-decoration:none; }} a:hover {{ color:{INK}; }}
    .card {{ background:{CARD}; border-radius:14px; box-shadow:0 1px 2px rgba(20,30,25,.05),
      0 8px 24px -12px rgba(20,30,25,.14); }}
    .n {{ font-variant-numeric:tabular-nums; letter-spacing:-.025em; }}
    .lbl {{ font-size:11px; letter-spacing:.1em; text-transform:uppercase;
      color:{FAINT}; font-weight:700; }}"""

def d_stat(label, value, note, accent=None):
    return f"""<div class="card" style="padding:20px 22px;">
        <div class="lbl">{label}</div>
        <div class="n" style="font-size:29px; font-weight:800; margin-top:10px; color:{accent or D.INK};">{value}</div>
        <div style="font-size:12.5px; color:{D.MUTED}; margin-top:5px;">{note}</div>
      </div>"""

d_body = f"""<div style="width:{W}px; min-height:{H}px; background:{D.GROUND}; padding:26px 34px 40px;">
  <div class="card" style="display:flex; align-items:center; gap:28px; padding:0 24px; height:60px; margin-bottom:26px;">
    <div style="font-size:16.5px; font-weight:800; letter-spacing:-.03em;">Fin<span style="color:{D.ACCENT};">·</span>Esse</div>
    <div style="display:flex; gap:6px;">
      {"".join(f'<div style="font-size:13.5px; font-weight:{700 if n=="Overview" else 500}; padding:7px 14px; border-radius:8px; color:{D.INK if n=="Overview" else D.MUTED}; background:{D.GROUND if n=="Overview" else "transparent"};">{n}</div>' for n in NAV)}
    </div>
    <div style="flex:1;"></div>
    <div style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:{D.MUTED}; background:{D.GROUND}; padding:6px 12px; border-radius:20px;">
      <span style="width:6px;height:6px;border-radius:50%;background:{D.ACCENT};"></span>Agent connected
    </div>
  </div>

  <div style="display:grid; grid-template-columns:1fr 370px; gap:22px; align-items:start;">
    <div style="display:flex; flex-direction:column; gap:22px;">
      <div class="card" style="padding:32px 34px;">
        <div class="lbl">Everything you own, minus everything you owe</div>
        <div class="n" style="font-size:60px; font-weight:800; line-height:1; margin-top:12px;">₹48,19,000</div>
        <div style="font-size:14px; color:{D.MUTED}; margin-top:10px;">₹1.20 Cr owned · ₹71.69 L owed</div>
        <div style="display:flex; height:10px; margin-top:28px; gap:3px;">
          <div style="width:79%; background:{D.ACCENT}; border-radius:5px;"></div>
          <div style="width:13%; background:#8FB3A4; border-radius:5px;"></div>
          <div style="width:8%; background:{D.HAIR}; border-radius:5px;"></div>
        </div>
        <div style="display:flex; gap:24px; margin-top:13px; font-size:12.5px; color:{D.MUTED};">
          <span>Home ₹95 L</span><span>Invested ₹15.9 L</span><span>Cash ₹9 L</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px;">
        {d_stat("Free each month","₹70,215","after everything")}
        {d_stat("Safety net","4.9 mo","aim for six", D.WARN)}
        {d_stat("Goes to loans","32.6%","of income")}
        {d_stat("Health","47/100","holding up")}
      </div>

      <div class="card" style="padding:26px 30px;">
        <div class="lbl">Do this first</div>
        <div style="font-size:19px; font-weight:800; margin-top:11px; letter-spacing:-.015em;">Clear the credit card before anything else</div>
        <div style="font-size:14px; color:{D.MUTED}; margin-top:8px; max-width:58ch; line-height:1.6;">It charges 38% a year — more than three times what your investments are assumed to earn. Every rupee against it is a guaranteed 38% return.</div>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:22px;">
      <div class="card" style="padding:0; overflow:hidden; box-shadow:0 1px 2px rgba(20,30,25,.05), 0 10px 30px -12px rgba(181,86,63,.4);">
        <div style="background:{D.WARN}; color:#fff; padding:11px 20px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:700;">Needs your approval</div>
        <div style="padding:22px 20px;">
          <div style="font-size:17px; font-weight:800; line-height:1.35;">Pay ₹1.64 L into the credit card</div>
          <div style="font-size:13px; color:{D.MUTED}; margin-top:8px; line-height:1.6;">Saves ₹63,080 in interest and frees ₹10,820 a month.</div>
          <div style="margin-top:18px; background:{D.GROUND}; border-radius:10px; padding:14px 16px; font-size:13px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between;"><span style="color:{D.MUTED};">Card</span><span class="n" style="font-weight:700;">₹1.64 L → ₹0</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:{D.MUTED};">Cash</span><span class="n" style="font-weight:700;">₹9 L → ₹7.36 L</span></div>
          </div>
          <div style="display:flex; gap:10px; margin-top:20px;">
            <div style="flex:1; text-align:center; background:{D.ACCENT}; color:#fff; padding:11px; border-radius:9px; font-size:13.5px; font-weight:700;">Approve</div>
            <div style="flex:1; text-align:center; background:{D.GROUND}; padding:11px; border-radius:9px; font-size:13.5px; font-weight:700; color:{D.MUTED};">Decline</div>
          </div>
        </div>
      </div>
      <div class="card" style="padding:22px 20px;">
        <div class="lbl">Agent activity</div>
        <div style="margin-top:14px; display:flex; flex-direction:column; gap:13px; font-size:13px;">
          {"".join(f'<div style="display:flex; gap:11px; align-items:baseline;"><span style="background:{bg}; color:{c}; font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:800; padding:3px 8px; border-radius:6px;">{k}</span><span style="color:{D.MUTED};">{t}</span></div>' for k,c,bg,t in [("Asked",D.WARN,"#F7E9E5","to clear the card"),("Ran",D.ACCENT,"#E6EFEA","prepay vs invest, ₹3 L"),("Read",D.MUTED,D.GROUND,"loans, budget, portfolio")])}
        </div>
      </div>
    </div>
  </div>
</div>"""
io.open("Atelier.dc.html","w",encoding="utf-8").write(doc(d_body,
  "family=Manrope:wght@400;500;700;800", D.css))
print("D Atelier")

GX = 120
canvas = {
 "artboards":[
  {"file":"Main.dc.html","x":0,"y":0,"w":W,"h":H,"title":"A — Instrument"},
  {"file":"PrivateBank.dc.html","x":W+GX,"y":0,"w":W,"h":H,"title":"B — Private Bank"},
  {"file":"Broadsheet.dc.html","x":2*(W+GX),"y":0,"w":W,"h":H,"title":"C — Broadsheet"},
  {"file":"Atelier.dc.html","x":3*(W+GX),"y":0,"w":W,"h":H,"title":"D — Atelier"},
 ],
 "annotations":[
  {"id":"brief","x":0,"y":-210,"w":720,
   "text":"Four mature directions, same screen. Pick one and I build the remaining five pages in it.\n\nAll four make the same UX cut: the old Overview stacked fifteen blocks at equal weight, these show five — net worth, four vitals, one decision, one agent log. Labels are plain English: 'Free each month', not 'Monthly surplus'."},
  {"id":"a","x":0,"y":H+40,"w":360,
   "text":"A — INSTRUMENT\nSwiss precision. Cool neutrals, hairline rules, one slate-blue accent, tight grid. Archivo throughout, tabular figures.\n\nMost credible, least decorated. Risk: can read as austere."},
  {"id":"b","x":W+GX,"y":H+40,"w":360,
   "text":"B — PRIVATE BANK\nDark ink, warm off-white type, bronze accent, Newsreader serif for every figure. Jost for UI.\n\nThe most expensive-looking. Risk: dark again, and serif numerals are less scannable than tabular sans."},
  {"id":"c","x":2*(W+GX),"y":H+40,"w":360,
   "text":"C — BROADSHEET\nEditorial. Bodoni Moda numerals, heavy top rule, dateline, ranked items. Libre Franklin body.\n\nStrongest personality, and it fits an app that makes arguments. Risk: the didone is fashion-sensitive."},
  {"id":"d","x":3*(W+GX),"y":H+40,"w":360,
   "text":"D — ATELIER\nSoft depth. Rounded cards, gentle shadows, deep green accent, Manrope. Closest to a modern product.\n\nSafest and most familiar. Risk: familiar is also forgettable — closest to generic SaaS."},
 ],
 "launch":{"view":"canvas"},
}
json.dump(canvas, io.open("canvas.json","w",encoding="utf-8"), indent=1, ensure_ascii=False)
print("canvas.json")
