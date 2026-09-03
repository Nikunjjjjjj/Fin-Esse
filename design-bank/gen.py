# -*- coding: utf-8 -*-
import io, json
W, H = 1280, 900
NAV = ["Overview", "Debt", "Investments", "Cashflow", "Advice"]

# ── palette ────────────────────────────────────────────────────────────────
# Cooler and deeper than the sketch: the old ground was a flat slate and the
# bronze read muddy. This runs near-black with a blue undertone, three levels
# of elevation, and one luminous champagne that stays gold at small sizes.
VOID   = "#08090C"   # page
SURF   = "#101319"   # panels
RAISE  = "#171B23"   # inputs, chips
EDGE   = "#242A34"
EDGE_2 = "#323945"
INK    = "#F1EFEA"
MUTED  = "#8D94A2"
FAINT  = "#565E6C"
GOLD   = "#E8C56A"   # the one accent
GOLD_D = "#8A7238"
JADE   = "#5FBF95"   # positive
CORAL  = "#E0705C"   # attention

EASE = "cubic-bezier(.22,1,.36,1)"

def logo(size=34, gold=GOLD, ink=INK, sw=1.6):
    """Two halves of one circle — one solid, one drawn. The human and the
    agent, weighing the same position. Reads at 16px."""
    r = size / 2
    return f"""<svg width="{size}" height="{size}" viewBox="0 0 32 32" fill="none" style="flex:none; display:block;">
      <path d="M16 3 A13 13 0 0 0 16 29 Z" fill="{gold}"/>
      <path d="M16 3 A13 13 0 0 1 16 29" stroke="{ink}" stroke-width="{sw}" fill="none"/>
      <circle cx="16" cy="16" r="2.4" fill="{VOID}"/>
    </svg>"""

CSS = f"""    body {{ margin:0; background:{VOID}; color:{INK};
      font-family:'Jost','Helvetica Neue',Arial,sans-serif;
      -webkit-font-smoothing:antialiased; }}
    * {{ box-sizing:border-box; }}
    a {{ color:{GOLD}; text-decoration:none; }} a:hover {{ color:{INK}; }}

    .fig {{ font-family:'Newsreader',Georgia,serif; font-variant-numeric:tabular-nums;
      font-weight:400; letter-spacing:-.012em; }}
    .lbl {{ font-size:10px; letter-spacing:.2em; text-transform:uppercase;
      color:{FAINT}; font-weight:500; }}

    /* Staggered entrance. Expo-out over a long-ish duration is what makes
       motion read as considered rather than bouncy. */
    @keyframes rise {{ from {{ opacity:0; transform:translateY(14px); }}
                       to   {{ opacity:1; transform:none; }} }}
    .r {{ animation:rise .72s {EASE} both; }}
    .d1{{animation-delay:.05s}} .d2{{animation-delay:.12s}} .d3{{animation-delay:.19s}}
    .d4{{animation-delay:.26s}} .d5{{animation-delay:.33s}} .d6{{animation-delay:.40s}}
    .d7{{animation-delay:.47s}} .d8{{animation-delay:.54s}}

    /* One slow sheen across the headline figure, then never again.
       The gradient is three times the element and ink at both ends, so some
       part of it always covers the text -- clipping to transparent text with a
       gradient that can sweep off the element makes the figure disappear. */
    @keyframes sheen {{ 0%,45% {{ background-position:100% 0; }}
                        100%   {{ background-position:0% 0; }} }}
    .sheen {{ background-image:linear-gradient(100deg,
        {INK} 0%, {INK} 40%, {GOLD} 50%, {INK} 60%, {INK} 100%);
      background-size:300% 100%; background-position:0% 0;
      -webkit-background-clip:text; background-clip:text; color:transparent;
      animation:sheen 2.4s {EASE} .5s 1 both; }}

    /* Bars draw themselves out from the left. */
    @keyframes grow {{ from {{ transform:scaleX(0); }} to {{ transform:scaleX(1); }} }}
    .bar > i {{ display:block; height:100%; transform-origin:left center;
      animation:grow .95s {EASE} .5s both; }}

    /* The one thing asking for a decision breathes, very slightly. */
    @keyframes halo {{ 0%,100% {{ box-shadow:0 0 0 0 rgba(224,112,92,.00); }}
                       50%     {{ box-shadow:0 0 0 5px rgba(224,112,92,.07); }} }}
    .ask {{ animation:halo 3.6s ease-in-out 1.4s infinite; }}

    /* Hover: lift and warm the edge. Cheap, and it makes the page feel alive. */
    .lift {{ transition:transform .45s {EASE}, border-color .45s {EASE},
      background .45s {EASE}; }}
    .lift:hover {{ transform:translateY(-3px); border-color:{EDGE_2}; }}

    .navi {{ position:relative; transition:color .35s {EASE}; }}
    .navi::after {{ content:''; position:absolute; left:0; right:0; bottom:-21px; height:1px;
      background:{GOLD}; transform:scaleX(0); transform-origin:left;
      transition:transform .5s {EASE}; }}
    .navi:hover {{ color:{INK}; }} .navi:hover::after {{ transform:scaleX(1); }}
    .navi.on {{ color:{INK}; }} .navi.on::after {{ transform:scaleX(1); }}

    .btn {{ transition:transform .35s {EASE}, filter .35s {EASE}; }}
    .btn:hover {{ transform:translateY(-1px); filter:brightness(1.08); }}

    @media (prefers-reduced-motion:reduce) {{
      .r,.bar > i,.sheen,.ask {{ animation:none; opacity:1; transform:none; }}
      .sheen {{ color:{INK}; background-image:none; }}
    }}"""

def stat(label, value, note, delay, accent=None):
    return f"""<div class="r {delay}">
        <div class="lbl">{label}</div>
        <div class="fig" style="font-size:33px; margin-top:11px; color:{accent or INK};">{value}</div>
        <div style="font-size:12px; color:{MUTED}; margin-top:7px;">{note}</div>
      </div>"""

body = f"""<div style="width:{W}px; min-height:{H}px; background:{VOID}; display:flex; flex-direction:column;">

  <div class="r d1" style="display:flex; align-items:center; gap:38px; padding:0 48px; height:84px; border-bottom:1px solid {EDGE};">
    <div style="display:flex; align-items:center; gap:13px;">
      {logo(36)}
      <div class="fig" style="font-size:31px; letter-spacing:.005em; line-height:1;">Fin<span style="color:{GOLD};">·</span>Esse</div>
    </div>
    <div style="flex:1;"></div>
    <div style="display:flex; gap:32px;">
      {"".join(f'<div class="navi{" on" if n=="Overview" else ""}" style="font-size:13px; letter-spacing:.04em; color:{MUTED};">{n}</div>' for n in NAV)}
    </div>
    <div style="width:1px; height:22px; background:{EDGE};"></div>
    <div style="display:flex; align-items:center; gap:9px; font-size:12px; color:{MUTED};">
      <span style="width:5px;height:5px;border-radius:50%;background:{JADE};box-shadow:0 0 8px {JADE};"></span>Agent connected
    </div>
  </div>

  <div style="display:grid; grid-template-columns:1fr 382px; min-height:{H-84}px;">
    <div style="padding:54px 48px;">
      <div class="r d2 lbl">Net position</div>
      <div class="fig sheen r d2" style="font-size:78px; line-height:1; margin-top:16px;">₹48,19,000</div>
      <div class="r d3" style="font-size:14px; color:{MUTED}; margin-top:15px;">₹1.20 Cr owned, against ₹71.69 L owed</div>

      <div class="bar r d3" style="display:flex; height:3px; margin-top:40px; background:{EDGE};">
        <i style="width:79%; background:linear-gradient(90deg,{GOLD_D},{GOLD});"></i>
        <i style="width:13%; background:#5C6A7C; animation-delay:.62s;"></i>
        <i style="width:8%; background:{EDGE_2}; animation-delay:.74s;"></i>
      </div>
      <div class="r d4" style="display:flex; gap:32px; margin-top:15px; font-size:12px; color:{MUTED}; letter-spacing:.02em;">
        <span>Home ₹95 L</span><span>Invested ₹15.9 L</span><span>Cash ₹9 L</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:34px; margin-top:54px; padding-top:36px; border-top:1px solid {EDGE};">
        {stat("Free each month","₹70,215","after everything is paid","d4")}
        {stat("Safety net","4.9 mo","aim for six","d5", CORAL)}
        {stat("Goes to loans","32.6%","of what you earn","d6")}
        {stat("Overall health","47","of a hundred","d7")}
      </div>

      <div class="r d7" style="margin-top:54px; padding-top:36px; border-top:1px solid {EDGE};">
        <div class="lbl">Do this first</div>
        <div class="fig" style="font-size:27px; margin-top:15px;">Clear the credit card before anything else</div>
        <div style="font-size:14px; color:{MUTED}; margin-top:11px; max-width:56ch; line-height:1.75;">It charges 38% a year — more than three times what your investments are assumed to earn. Every rupee against it returns a guaranteed 38%, which no investment can promise.</div>
      </div>
    </div>

    <div style="padding:54px 40px; border-left:1px solid {EDGE}; background:{SURF}; display:flex; flex-direction:column; gap:46px;">
      <div class="r d3 ask lift" style="border:1px solid {EDGE}; padding:24px 22px; background:{VOID};">
        <div class="lbl" style="color:{CORAL};">Awaiting your decision</div>
        <div class="fig" style="font-size:23px; margin-top:15px; line-height:1.35;">Pay ₹1.64 L into the credit card</div>
        <div style="font-size:13px; color:{MUTED}; margin-top:10px; line-height:1.65;">Saves ₹63,080 in interest and frees ₹10,820 a month.</div>
        <div style="margin-top:22px; display:flex; flex-direction:column; gap:11px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; padding-bottom:11px; border-bottom:1px solid {EDGE};"><span style="color:{FAINT};">Card</span><span class="fig">₹1.64 L → ₹0</span></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:{FAINT};">Cash</span><span class="fig">₹9 L → ₹7.36 L</span></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:26px;">
          <div class="btn" style="flex:1; text-align:center; background:linear-gradient(180deg,{GOLD},#D4AF54); color:{VOID}; padding:12px; font-size:13px; font-weight:500; letter-spacing:.05em;">Approve</div>
          <div class="btn" style="flex:1; text-align:center; border:1px solid {EDGE_2}; color:{MUTED}; padding:12px; font-size:13px; letter-spacing:.05em;">Decline</div>
        </div>
      </div>

      <div class="r d5">
        <div class="lbl">Agent activity</div>
        <div style="margin-top:18px; display:flex; flex-direction:column; gap:16px; font-size:13px;">
          {"".join(f'<div class="r {d}" style="display:flex; gap:15px;"><span style="color:{c}; min-width:50px; font-size:10px; letter-spacing:.15em; text-transform:uppercase; padding-top:3px;">{k}</span><span style="color:{MUTED};">{t}</span></div>' for k,c,t,d in [("Asked",CORAL,"to clear the card","d6"),("Ran",GOLD,"prepay vs invest, ₹3 L","d7"),("Read",FAINT,"loans, budget, portfolio","d8")])}
        </div>
      </div>
    </div>
  </div>
</div>"""

def doc(b, fonts, css):
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
{b}
</x-dc>
</body>
</html>
"""

FONTS = "family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&amp;family=Jost:wght@300;400;500"
io.open("Main.dc.html","w",encoding="utf-8").write(doc(body, FONTS, CSS))
print("Main")

# ── logo studies ───────────────────────────────────────────────────────────
def mark_split(s=64):
    return f"""<svg width="{s}" height="{s}" viewBox="0 0 32 32" fill="none">
      <path d="M16 3 A13 13 0 0 0 16 29 Z" fill="{GOLD}"/>
      <path d="M16 3 A13 13 0 0 1 16 29" stroke="{INK}" stroke-width="1.6" fill="none"/>
      <circle cx="16" cy="16" r="2.4" fill="{VOID}"/>
    </svg>"""

def mark_scale(s=64):
    return f"""<svg width="{s}" height="{s}" viewBox="0 0 32 32" fill="none">
      <path d="M16 5 V27" stroke="{INK}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M6 11 H26" stroke="{INK}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M6 11 L2.5 18 A3.9 3.9 0 0 0 9.5 18 Z" fill="{GOLD}"/>
      <path d="M26 11 L22.5 18 A3.9 3.9 0 0 0 29.5 18 Z" stroke="{INK}" stroke-width="1.4" fill="none"/>
      <circle cx="16" cy="5" r="1.9" fill="{GOLD}"/>
    </svg>"""

def mark_steps(s=64):
    bars = "".join(
      f'<rect x="{5+i*6.4}" y="{25-h}" width="4.4" height="{h}" rx="1" fill="{GOLD if i==3 else INK}" opacity="{1 if i==3 else .45+i*.12}"/>'
      for i, h in enumerate([6, 10, 14, 20]))
    return f"""<svg width="{s}" height="{s}" viewBox="0 0 32 32" fill="none">
      {bars}
      <circle cx="27" cy="6" r="2.3" fill="{GOLD}"/>
    </svg>"""

def mark_fe(s=64):
    return f"""<svg width="{s}" height="{s}" viewBox="0 0 32 32" fill="none">
      <rect x="3.5" y="3.5" width="25" height="25" rx="7.5" stroke="{EDGE_2}" stroke-width="1.4"/>
      <path d="M11 22 V10 H21" stroke="{INK}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M11 16 H18" stroke="{GOLD}" stroke-width="2.1" stroke-linecap="round"/>
    </svg>"""

def study(n, name, svg, rationale, delay):
    return f"""<div class="r {delay} lift" style="border:1px solid {EDGE}; background:{SURF}; padding:26px;">
        <div style="display:flex; align-items:center; gap:18px; height:72px;">{svg}
          <div style="display:flex; flex-direction:column; gap:9px;">
            <div style="display:flex; align-items:center; gap:9px;">{svg.replace('width="64" height="64"','width="26" height="26"')}
              <span class="fig" style="font-size:22px;">Fin<span style="color:{GOLD};">·</span>Esse</span></div>
            <div style="display:flex; align-items:center; gap:7px; opacity:.75;">{svg.replace('width="64" height="64"','width="16" height="16"')}
              <span class="fig" style="font-size:13px;">Fin<span style="color:{GOLD};">·</span>Esse</span></div>
          </div>
        </div>
        <div class="lbl" style="margin-top:20px;">{n} — {name}</div>
        <div style="font-size:12.5px; color:{MUTED}; margin-top:9px; line-height:1.6;">{rationale}</div>
      </div>"""

def swatch(name, hexv, note):
    return f"""<div style="display:flex; align-items:center; gap:13px;">
        <div style="width:38px;height:38px;background:{hexv};border:1px solid {EDGE_2};flex:none;"></div>
        <div><div style="font-size:12.5px;">{name}</div>
        <div class="fig" style="font-size:12px; color:{MUTED};">{hexv}</div>
        <div style="font-size:11px; color:{FAINT}; margin-top:2px;">{note}</div></div>
      </div>"""

studies = f"""<div style="width:{W}px; min-height:{H}px; background:{VOID}; padding:48px;">
  <div class="r d1" style="display:flex; align-items:center; gap:13px;">
    {logo(36)}<div class="fig" style="font-size:31px;">Fin<span style="color:{GOLD};">·</span>Esse</div>
  </div>
  <div class="r d2" style="font-size:14px; color:{MUTED}; margin-top:14px; max-width:64ch; line-height:1.7;">Four marks, each shown at 64, 26 and 16 pixels — a logo that only works large is not a logo. Mark 01 is the one placed in the app.</div>

  <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:22px; margin-top:34px;">
    {study("01","Two halves", mark_split(), "One circle, split. Half solid, half drawn — the human and the agent weighing the same position. The gap at the centre is the interpunct in the name.", "d3")}
    {study("02","Balance", mark_scale(), "A scale with one pan full and one empty: debt against investment, the question the app exists to answer. Most literal, and the busiest at 16px.", "d4")}
    {study("03","Ascent", mark_steps(), "Four rising bars with the last one lit. Clear at any size, but it is the most generic finance mark of the four.", "d5")}
    {study("04","Monogram", mark_fe(), "An F drawn inside a rounded frame, its middle stroke gold. Safest and most app-icon-like; says least about what the product does.", "d6")}
  </div>

  <div class="r d7" style="margin-top:44px; padding-top:32px; border-top:1px solid {EDGE};">
    <div class="lbl">Palette</div>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:22px 30px; margin-top:22px;">
      {swatch("Void", VOID, "page ground")}
      {swatch("Surface", SURF, "panels, the agent rail")}
      {swatch("Raised", RAISE, "inputs and chips")}
      {swatch("Edge", EDGE, "hairlines")}
      {swatch("Ink", INK, "primary type")}
      {swatch("Muted", MUTED, "secondary type")}
      {swatch("Champagne", GOLD, "the one accent — sparingly")}
      {swatch("Coral", CORAL, "needs your attention")}
    </div>
    <div style="font-size:12.5px; color:{MUTED}; margin-top:24px; max-width:70ch; line-height:1.7;">Cooler and deeper than the first sketch. The old ground was a flat slate and the bronze went muddy under the serif; this runs near-black with a blue undertone, three levels of elevation, and a champagne that stays gold at 12px. Jade is reserved for the connection dot.</div>
  </div>
</div>"""
io.open("Identity.dc.html","w",encoding="utf-8").write(doc(studies, FONTS, CSS))
print("Identity")

canvas = {
 "artboards":[
  {"file":"Main.dc.html","x":0,"y":0,"w":W,"h":H,"title":"Overview — Private Bank v2"},
  {"file":"Identity.dc.html","x":W+130,"y":0,"w":W,"h":H,"title":"Logo & palette"},
 ],
 "annotations":[
  {"id":"motion","x":0,"y":-250,"w":700,
   "text":"Reload the canvas to watch the entrance — it runs once.\n\nMotion, in order: header, then the figure with a single gold sheen across it, then the bars drawing out from the left, then the four vitals staggered 70ms apart, then the agent log. Expo-out easing over 0.7s is what makes it read considered rather than bouncy.\n\nOngoing: the approval card breathes very slightly, cards lift on hover, nav underlines slide. All of it switches off under prefers-reduced-motion."},
  {"id":"logo","x":W+130,"y":-250,"w":560,
   "text":"Four marks at three sizes each. 01 is placed in the app — tell me if you want a different one and it is a one-line swap.\n\nThe wordmark is now 31px against the old 21px, with the mark at 36px beside it."},
 ],
 "launch":{"view":"canvas"},
}
json.dump(canvas, io.open("canvas.json","w",encoding="utf-8"), indent=1, ensure_ascii=False)
print("canvas.json")
