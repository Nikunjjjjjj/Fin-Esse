# -*- coding: utf-8 -*-
import io, json

W, H = 1280, 880

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

# pixel-art marks, drawn as rect grids so they scale and recolour
def pix(kind, c, size=16):
    grids = {
        "coin":  ["..####..", ".#....#.", "#..##..#", "#.#..#.#",
                  "#.#..#.#", "#..##..#", ".#....#.", "..####.."],
        "house": ["...##...", "..####..", ".######.", "########",
                  "##....##", "##.##.##", "##.##.##", "##.##.##"],
        "chart": ["........", "......##", "....####", "..######",
                  "..######", "########", "########", "########"],
        "warn":  ["...##...", "...##...", "..####..", "..####..",
                  ".######.", ".##..##.", "########", "..####.."],
        "spark": ["....#...", "...##...", "..###...", "#######.",
                  ".#####..", "...###..", "..##....", ".#......"],
    }
    g = grids[kind]
    r = []
    for y, row in enumerate(g):
        for x, ch in enumerate(row):
            if ch == "#":
                r.append(f'<rect x="{x}" y="{y}" width="1" height="1"/>')
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 8 8" fill="{c}" '
            f'shape-rendering="crispEdges" style="flex:none;">{"".join(r)}</svg>')

NAV = ["Overview", "Debt", "Investments", "Cashflow", "Advice"]

# ══════════════════════════════════════════════ A — COZY SAVE FILE (leading)
CREAM="#FBF4E6"; CARD="#FFFDF7"; INK="#3B3328"; SOFT="#7A6E5D"; FAINT="#A99B85"
SAGE="#6E9B5A"; CLAY="#C4614B"; SKY="#5B8FC7"; GOLD="#D9A441"; LINE="#3B3328"

cozy_css = f"""    body {{ margin:0; background:{CREAM}; color:{INK};
      font-family:'Figtree','Helvetica Neue',Arial,sans-serif; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{SAGE}; text-decoration:none; }} a:hover {{ color:{INK}; }}
    .px {{ font-family:'Pixelify Sans','Courier New',monospace;
      -webkit-font-smoothing:none; -moz-osx-font-smoothing:grayscale; }}
    .box {{ background:{CARD}; border:3px solid {LINE}; box-shadow:5px 5px 0 {LINE}; }}
    .tab {{ border:3px solid {LINE}; background:{CARD}; padding:9px 16px; font-size:15px;
      box-shadow:3px 3px 0 {LINE}; }}
    .tab.on {{ background:{INK}; color:{CREAM}; box-shadow:3px 3px 0 {SAGE}; }}"""

def cozy_stat(icon, ic, label, value, note):
    return f"""<div class="box" style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          {pix(icon, ic, 16)}
          <span style="font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:{SOFT}; font-weight:600;">{label}</span>
        </div>
        <div class="px" style="font-size:30px; line-height:1;">{value}</div>
        <div style="font-size:12.5px; color:{FAINT};">{note}</div>
      </div>"""

cozy_body = f"""<div style="width:{W}px; min-height:{H}px; background:{CREAM}; padding:30px 36px; display:flex; flex-direction:column; gap:24px;">

  <div style="display:flex; align-items:center; gap:16px;">
    <div class="px" style="font-size:30px; letter-spacing:.02em;">Fin<span style="color:{SAGE};">·</span>Esse</div>
    <div style="flex:1;"></div>
    <div style="display:flex; align-items:center; gap:8px; border:3px solid {LINE}; background:{CARD}; padding:6px 12px; box-shadow:3px 3px 0 {LINE};">
      {pix("spark", SAGE, 14)}<span style="font-size:13px; font-weight:600;">Agent connected</span>
    </div>
  </div>

  <div style="display:flex; gap:10px;">
    {"".join(f'<div class="tab{" on" if n=="Overview" else ""}">{n}</div>' for n in NAV)}
  </div>

  <div style="display:grid; grid-template-columns:1.35fr 1fr; gap:24px; align-items:start;">
    <div style="display:flex; flex-direction:column; gap:22px;">

      <div class="box" style="padding:26px 28px;">
        <div style="font-size:13px; letter-spacing:.09em; text-transform:uppercase; color:{SOFT}; font-weight:600;">Everything you own, minus everything you owe</div>
        <div class="px" style="font-size:62px; line-height:1.05; margin-top:10px;">₹48.19L</div>
        <div style="display:flex; height:16px; margin-top:18px; border:3px solid {LINE};">
          <div style="width:79%; background:{SAGE};"></div>
          <div style="width:13%; background:{SKY};"></div>
          <div style="width:8%; background:{GOLD};"></div>
        </div>
        <div style="display:flex; gap:18px; margin-top:10px; font-size:13px; color:{SOFT};">
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:11px;height:11px;background:{SAGE};border:2px solid {LINE};"></span>Home ₹95L</span>
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:11px;height:11px;background:{SKY};border:2px solid {LINE};"></span>Invested ₹15.9L</span>
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:11px;height:11px;background:{GOLD};border:2px solid {LINE};"></span>Cash ₹9L</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px;">
        {cozy_stat("coin", SAGE, "Free each month", "₹70.2K", "after everything is paid")}
        {cozy_stat("warn", CLAY, "Safety net", "4.9 mo", "aim for 6 months")}
        {cozy_stat("house", SKY, "Goes to loans", "32.6%", "of what you earn")}
        {cozy_stat("chart", GOLD, "Overall health", "47/100", "holding up")}
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:22px;">

      <div class="box" style="padding:0; box-shadow:5px 5px 0 {CLAY}; border-color:{LINE};">
        <div style="background:{CLAY}; color:{CREAM}; padding:10px 18px; display:flex; align-items:center; gap:9px; border-bottom:3px solid {LINE};">
          {pix("warn", CREAM, 14)}<span class="px" style="font-size:17px;">Your call</span>
        </div>
        <div style="padding:18px;">
          <div style="font-size:17px; font-weight:700; line-height:1.35;">Pay off the credit card?</div>
          <div style="font-size:13.5px; color:{SOFT}; margin-top:7px; line-height:1.5;">It charges 38% a year — more than three times what your investments earn. Clearing it saves ₹63,080 in interest.</div>
          <div style="margin-top:14px; border:3px solid {LINE}; background:{CREAM};">
            <div style="display:flex; justify-content:space-between; padding:8px 12px; font-size:13px; border-bottom:2px solid {LINE};"><span>Card balance</span><span class="px">₹1.64L → ₹0</span></div>
            <div style="display:flex; justify-content:space-between; padding:8px 12px; font-size:13px;"><span>Your cash</span><span class="px">₹9L → ₹7.36L</span></div>
          </div>
          <div style="display:flex; gap:10px; margin-top:16px;">
            <div style="flex:1; text-align:center; background:{SAGE}; color:{CREAM}; border:3px solid {LINE}; box-shadow:3px 3px 0 {LINE}; padding:10px; font-size:15px; font-weight:700;">Do it</div>
            <div style="flex:1; text-align:center; background:{CARD}; border:3px solid {LINE}; box-shadow:3px 3px 0 {LINE}; padding:10px; font-size:15px; font-weight:700;">Not now</div>
          </div>
        </div>
      </div>

      <div class="box" style="padding:16px 18px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          {pix("spark", SKY, 14)}<span class="px" style="font-size:16px;">What the agent did</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:9px; font-size:13px;">
          <div style="display:flex; gap:9px;"><span style="color:{CLAY}; font-weight:700; min-width:64px;">asked you</span><span style="color:{SOFT};">to clear the card</span></div>
          <div style="display:flex; gap:9px;"><span style="color:{SKY}; font-weight:700; min-width:64px;">worked out</span><span style="color:{SOFT};">prepay vs invest, ₹3L</span></div>
          <div style="display:flex; gap:9px;"><span style="color:{FAINT}; font-weight:700; min-width:64px;">read</span><span style="color:{SOFT};">your loans and budget</span></div>
        </div>
      </div>
    </div>
  </div>
</div>"""

io.open("Main.dc.html","w",encoding="utf-8").write(doc(
  cozy_body, "family=Pixelify+Sans:wght@400;600&amp;family=Figtree:wght@400;500;600;700", cozy_css))
print("wrote Main (Cozy Save File)")

# ═════════════════════════════════════════════════════ B — TERMINAL QUEST
NIGHT="#12101F"; PANEL="#1B1830"; EDGE="#332C55"
PALE="#E9E5F7"; DIM="#8B83AD"
MINT="#6EE7A8"; AMBER="#FFB347"; ROSE="#FF7A7A"

term_css = f"""    body {{ margin:0; background:{NIGHT}; color:{PALE};
      font-family:'Manrope','Helvetica Neue',Arial,sans-serif; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{MINT}; text-decoration:none; }} a:hover {{ color:{PALE}; }}
    .px {{ font-family:'VT323','Courier New',monospace;
      -webkit-font-smoothing:none; -moz-osx-font-smoothing:grayscale; }}
    .panel {{ background:{PANEL}; border:1px solid {EDGE}; position:relative; }}
    .panel::before, .panel::after {{ content:''; position:absolute; width:7px; height:7px;
      border:2px solid {MINT}; }}
    .panel::before {{ top:-1px; left:-1px; border-right:0; border-bottom:0; }}
    .panel::after {{ bottom:-1px; right:-1px; border-left:0; border-top:0; }}
    .scan {{ background-image:repeating-linear-gradient(to bottom,
      rgba(255,255,255,.030) 0 1px, transparent 1px 3px); }}"""

def seg(filled, total, color, w=9):
    cells = "".join(
        f'<span style="width:{w}px;height:15px;background:{color if i < filled else EDGE};"></span>'
        for i in range(total))
    return f'<span style="display:flex; gap:3px;">{cells}</span>'

def term_stat(label, value, note, bar, color):
    return f"""<div class="panel" style="padding:15px 17px;">
        <div class="px" style="font-size:18px; color:{DIM}; letter-spacing:.06em;">{label}</div>
        <div class="px" style="font-size:38px; line-height:1; color:{color}; margin:4px 0 10px;">{value}</div>
        {bar}
        <div style="font-size:11.5px; color:{DIM}; margin-top:9px;">{note}</div>
      </div>"""

term_body = f"""<div class="scan" style="width:{W}px; min-height:{H}px; background:{NIGHT}; padding:28px 34px; display:flex; flex-direction:column; gap:22px;">

  <div style="display:flex; align-items:center; gap:14px; border-bottom:1px solid {EDGE}; padding-bottom:16px;">
    <div class="px" style="font-size:34px; color:{MINT}; letter-spacing:.04em;">FIN·ESSE</div>
    <div class="px" style="font-size:19px; color:{DIM};">// personal finance terminal</div>
    <div style="flex:1;"></div>
    <div class="px" style="font-size:19px; color:{MINT};">● AGENT ONLINE — 42 TOOLS</div>
  </div>

  <div style="display:flex; gap:26px;">
    {"".join(f'<div class="px" style="font-size:21px; letter-spacing:.05em; color:{MINT if n=="Overview" else DIM}; border-bottom:2px solid {MINT if n=="Overview" else "transparent"}; padding-bottom:4px;">{n.upper()}</div>' for n in NAV)}
  </div>

  <div style="display:grid; grid-template-columns:1.3fr 1fr; gap:22px; align-items:start;">
    <div style="display:flex; flex-direction:column; gap:20px;">

      <div class="panel" style="padding:24px 26px;">
        <div class="px" style="font-size:19px; color:{DIM}; letter-spacing:.07em;">NET WORTH</div>
        <div class="px" style="font-size:72px; line-height:1; color:{PALE}; margin-top:2px;">₹48.19L</div>
        <div style="font-size:13px; color:{DIM}; margin-top:8px;">₹1.20Cr owned · ₹71.69L owed</div>
        <div style="display:flex; height:14px; margin-top:18px; gap:2px;">
          <div style="width:79%; background:{MINT};"></div>
          <div style="width:13%; background:{AMBER};"></div>
          <div style="width:8%; background:{EDGE};"></div>
        </div>
        <div class="px" style="display:flex; gap:20px; margin-top:9px; font-size:18px; color:{DIM};">
          <span style="color:{MINT};">HOME ₹95L</span><span style="color:{AMBER};">INVESTED ₹15.9L</span><span>CASH ₹9L</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px;">
        {term_stat("SPARE / MONTH","₹70.2K","24.6% of income kept", seg(5,10,MINT), MINT)}
        {term_stat("SAFETY NET","4.9 MO","target 6 months", seg(5,10,ROSE), ROSE)}
        {term_stat("DEBT LOAD","32.6%","ceiling is 40%", seg(8,10,AMBER), AMBER)}
        {term_stat("EXPOSURE","47","of 100 — holding", seg(5,10,AMBER), AMBER)}
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:20px;">

      <div class="panel" style="padding:0; border-color:{ROSE};">
        <div style="padding:9px 16px; border-bottom:1px solid {ROSE};">
          <span class="px" style="font-size:21px; color:{ROSE}; letter-spacing:.06em;">▶ AWAITING YOUR CALL</span>
        </div>
        <div style="padding:17px;">
          <div style="font-size:16.5px; font-weight:700;">Clear the credit card</div>
          <div style="font-size:13px; color:{DIM}; margin-top:7px; line-height:1.55;">38% a year — over three times what the portfolio earns. Clearing it saves ₹63,080 of interest.</div>
          <div class="px" style="margin-top:14px; font-size:19px; display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; justify-content:space-between;"><span style="color:{DIM};">CARD</span><span>₹1.64L → ₹0</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:{DIM};">CASH</span><span>₹9L → ₹7.36L</span></div>
          </div>
          <div style="display:flex; gap:9px; margin-top:16px;">
            <div class="px" style="flex:1; text-align:center; background:{MINT}; color:{NIGHT}; padding:7px; font-size:21px; letter-spacing:.05em;">APPROVE</div>
            <div class="px" style="flex:1; text-align:center; border:1px solid {EDGE}; color:{DIM}; padding:7px; font-size:21px; letter-spacing:.05em;">REJECT</div>
          </div>
        </div>
      </div>

      <div class="panel" style="padding:15px 17px;">
        <div class="px" style="font-size:20px; color:{DIM}; letter-spacing:.06em; margin-bottom:11px;">AGENT LOG</div>
        <div class="px" style="font-size:18px; display:flex; flex-direction:column; gap:7px;">
          <div><span style="color:{ROSE};">ASK</span> <span style="color:{DIM};">prepay the card?</span></div>
          <div><span style="color:{AMBER};">CALC</span> <span style="color:{DIM};">prepay vs invest ₹3L</span></div>
          <div><span style="color:{MINT};">READ</span> <span style="color:{DIM};">loans, budget, portfolio</span></div>
        </div>
      </div>
    </div>
  </div>
</div>"""

io.open("Terminal.dc.html","w",encoding="utf-8").write(doc(
  term_body, "family=VT323&amp;family=Manrope:wght@400;500;700", term_css))
print("wrote Terminal (Terminal Quest)")

# ═════════════════════════════════════════════════════ C — ARCADE LEDGER
PAPER="#F1EFE9"; BLACK="#14140F"; GREY="#6E6C63"; HAIR="#CFCCC3"
RED="#E8442B"; BLUE="#2F4FE0"

arc_css = f"""    body {{ margin:0; background:{PAPER}; color:{BLACK};
      font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{BLUE}; text-decoration:none; }} a:hover {{ color:{BLACK}; }}
    .px {{ font-family:'Silkscreen','Courier New',monospace;
      -webkit-font-smoothing:none; -moz-osx-font-smoothing:grayscale; }}
    .hard {{ border:3px solid {BLACK}; }}"""

def arc_stat(label, value, note, accent=None):
    col = accent or BLACK
    return f"""<div style="padding:0 22px 0 0; border-right:3px solid {BLACK};">
        <div class="px" style="font-size:11px; letter-spacing:.05em; color:{GREY};">{label}</div>
        <div class="px" style="font-size:34px; line-height:1.1; margin-top:9px; color:{col};">{value}</div>
        <div style="font-size:12.5px; color:{GREY}; margin-top:7px;">{note}</div>
      </div>"""

def blocks(filled, total, color):
    return "".join(
      f'<span style="width:13px;height:13px;background:{color if i < filled else "transparent"};border:2px solid {BLACK};"></span>'
      for i in range(total))

arc_body = f"""<div style="width:{W}px; min-height:{H}px; background:{PAPER}; padding:34px 44px; display:flex; flex-direction:column; gap:30px;">

  <div style="display:flex; align-items:flex-end; gap:18px; border-bottom:5px solid {BLACK}; padding-bottom:18px;">
    <div class="px" style="font-size:27px; letter-spacing:-.02em;">FIN<span style="color:{RED};">-</span>ESSE</div>
    <div style="flex:1;"></div>
    {"".join(f'<div class="px" style="font-size:13px; letter-spacing:.04em; color:{BLACK if n=="Overview" else GREY}; {"background:"+BLACK+";color:"+PAPER+";padding:6px 10px;" if n=="Overview" else "padding:6px 10px;"}">{n.upper()}</div>' for n in NAV)}
  </div>

  <div style="display:grid; grid-template-columns:1.45fr 1fr; gap:44px; align-items:start;">
    <div>
      <div class="px" style="font-size:12px; letter-spacing:.06em; color:{GREY};">WHAT YOU ARE WORTH</div>
      <div class="px" style="font-size:88px; line-height:1; margin-top:8px; letter-spacing:-.03em;">₹48.19L</div>
      <div style="font-size:14.5px; color:{GREY}; margin-top:12px;">₹1.20Cr owned, ₹71.69L owed.</div>

      <div style="display:flex; margin-top:26px; border:3px solid {BLACK}; height:26px;">
        <div style="width:79%; background:{BLACK};"></div>
        <div style="width:13%; background:{RED};"></div>
        <div style="width:8%; background:{PAPER}; border-left:3px solid {BLACK};"></div>
      </div>
      <div class="px" style="display:flex; gap:22px; margin-top:11px; font-size:11px; color:{GREY};">
        <span>HOME ₹95L</span><span style="color:{RED};">INVESTED ₹15.9L</span><span>CASH ₹9L</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:22px; margin-top:38px; border-top:3px solid {BLACK}; padding-top:22px;">
        {arc_stat("FREE / MONTH","₹70.2K","after everything")}
        {arc_stat("SAFETY NET","4.9MO","short of 6", RED)}
        {arc_stat("TO LOANS","32.6%","of income")}
        <div style="padding:0;">
          <div class="px" style="font-size:11px; letter-spacing:.05em; color:{GREY};">HEALTH</div>
          <div style="display:flex; gap:4px; margin-top:12px;">{blocks(5, 8, RED)}</div>
          <div style="font-size:12.5px; color:{GREY}; margin-top:9px;">47 of 100</div>
        </div>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:26px;">
      <div class="hard" style="background:{PAPER};">
        <div class="px" style="background:{BLACK}; color:{PAPER}; padding:9px 16px; font-size:13px; letter-spacing:.05em;">NEEDS YOUR OK</div>
        <div style="padding:20px;">
          <div style="font-size:19px; font-weight:800; line-height:1.3;">Pay off the credit card</div>
          <div style="font-size:13.5px; color:{GREY}; margin-top:9px; line-height:1.55;">38% a year. Three times what your investments make. Saves ₹63,080.</div>
          <div class="px" style="margin-top:16px; font-size:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; border-bottom:2px solid {HAIR}; padding-bottom:7px;"><span style="color:{GREY};">CARD</span><span>₹1.64L → ₹0</span></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:{GREY};">CASH</span><span>₹9L → ₹7.36L</span></div>
          </div>
          <div style="display:flex; gap:10px; margin-top:20px;">
            <div class="px" style="flex:1; text-align:center; background:{BLACK}; color:{PAPER}; padding:11px; font-size:13px; letter-spacing:.05em;">YES</div>
            <div class="px hard" style="flex:1; text-align:center; padding:11px; font-size:13px; letter-spacing:.05em;">NO</div>
          </div>
        </div>
      </div>

      <div>
        <div class="px" style="font-size:12px; letter-spacing:.05em; color:{GREY}; border-bottom:3px solid {BLACK}; padding-bottom:9px;">AGENT ACTIVITY</div>
        <div style="display:flex; flex-direction:column;">
          <div style="display:flex; gap:12px; padding:11px 0; border-bottom:2px solid {HAIR}; font-size:13.5px;"><span class="px" style="font-size:11px; color:{RED}; min-width:58px;">ASKED</span><span style="color:{GREY};">to clear the card</span></div>
          <div style="display:flex; gap:12px; padding:11px 0; border-bottom:2px solid {HAIR}; font-size:13.5px;"><span class="px" style="font-size:11px; color:{BLACK}; min-width:58px;">RAN</span><span style="color:{GREY};">prepay vs invest, ₹3L</span></div>
          <div style="display:flex; gap:12px; padding:11px 0; font-size:13.5px;"><span class="px" style="font-size:11px; color:{GREY}; min-width:58px;">READ</span><span style="color:{GREY};">loans, budget, portfolio</span></div>
        </div>
      </div>
    </div>
  </div>
</div>"""

io.open("Arcade.dc.html","w",encoding="utf-8").write(doc(
  arc_body, "family=Silkscreen:wght@400;700&amp;family=Plus+Jakarta+Sans:wght@400;500;700;800", arc_css))
print("wrote Arcade (Arcade Ledger)")

GX, GY = 130, 0
canvas = {
 "artboards": [
   {"file":"Main.dc.html","x":0,"y":0,"w":W,"h":H,"title":"A — Cozy Save File"},
   {"file":"Terminal.dc.html","x":W+GX,"y":0,"w":W,"h":H,"title":"B — Terminal Quest"},
   {"file":"Arcade.dc.html","x":2*(W+GX),"y":0,"w":W,"h":H,"title":"C — Arcade Ledger"},
 ],
 "annotations":[
  {"id":"brief","x":0,"y":-230,"w":700,
   "text":"Three pixel worlds, same screen. Pick one and I build the other five pages in it.\n\nAll three cut the old Overview from 15 competing blocks to five: net worth, four vitals, one decision, one agent log. Wording is plain — 'Free each month', not 'Monthly surplus'."},
  {"id":"a","x":0,"y":H+50,"w":380,
   "text":"A — COZY SAVE FILE\nChunky borders, hard offset shadows, warm cream. Pixelify Sans + Figtree.\n\nFriendliest, and best fit for 'refreshes the user'. Risk: cosy can read as unserious for money."},
  {"id":"b","x":W+GX,"y":H+50,"w":380,
   "text":"B — TERMINAL QUEST\nDark CRT with scanlines, corner brackets, segmented bars. VT323 + Manrope.\n\nMost obviously a game, and the agent log feels native here. Risk: dark + neon is close to what you already rejected."},
  {"id":"c","x":2*(W+GX),"y":H+50,"w":380,
   "text":"C — ARCADE LEDGER\nHigh contrast, 3px black rules, huge blocky numerals, one red accent. Silkscreen + Plus Jakarta Sans.\n\nSleekest and most legible. Risk: the most restrained — least 'game', most poster."},
 ],
 "launch":{"view":"canvas"},
}
json.dump(canvas, io.open("canvas.json","w",encoding="utf-8"), indent=1, ensure_ascii=False)
print("wrote canvas.json")
