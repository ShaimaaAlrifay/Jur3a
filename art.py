# Editorial cover illustrations: ink on paper, halftone dots, hatching and hard offset shadows.
# Colours come from CSS vars (--ink, --art-paper) so the art follows light/dark themes.

DEFS = ('<defs>'
        '<pattern id="dt" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.7" class="k"/></pattern>'
        '<pattern id="dt2" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" class="k"/></pattern>'
        '<pattern id="ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" class="hl"/></pattern>'
        '</defs>')

def el(tag, cls, **a):
    attrs = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in a.items())
    return f'<{tag} class="{cls}" {attrs}/>'

def fill(tag, kind, **a):
    """kind: p (paper), k (ink), dts (dots), hs (hatch) — patterned fills get a paper base + outline."""
    if kind in ("dts", "hs"):
        pat = "dtf" if kind == "dts" else "htf"
        return el(tag, "p", **a) + el(tag, pat, **a) + el(tag, "o", **a)
    return el(tag, kind, **a)

def pop(tag, kind, dx=7, dy=7, **a):
    """Shape with a hard ink offset shadow."""
    return f'<g transform="translate({dx},{dy})">{el(tag, "k", **a)}</g>' + fill(tag, kind, **a)

def poly(pts):
    return " ".join(f"{x},{y}" for x, y in pts)

def box3d(x, y, w, h, d=14, front="p"):
    top = poly([(x, y), (x + d, y - d), (x + w + d, y - d), (x + w, y)])
    side = poly([(x + w, y), (x + w + d, y - d), (x + w + d, y + h - d), (x + w, y + h)])
    return (fill("polygon", "dts", points=top) + fill("polygon", "hs", points=side)
            + fill("rect", front, x=x, y=y, width=w, height=h) + el("rect", "o", x=x, y=y, width=w, height=h))

def cyl(cx, cy, rx, ry, h, top="p"):
    side = f"M{cx-rx} {cy} L{cx-rx} {cy+h} A{rx} {ry} 0 0 0 {cx+rx} {cy+h} L{cx+rx} {cy} Z"
    return fill("path", "hs", d=side) + fill("ellipse", top, cx=cx, cy=cy, rx=rx, ry=ry) + el("ellipse", "o", cx=cx, cy=cy, rx=rx, ry=ry)

def sun(cx, cy, r, fine=False):
    return el("circle", "dt2" if fine else "dt", cx=cx, cy=cy, r=r)

def spark(cx, cy, s=12):
    return el("path", "k", d=f"M{cx} {cy-s} Q{cx} {cy} {cx+s} {cy} Q{cx} {cy} {cx} {cy+s} Q{cx} {cy} {cx-s} {cy} Q{cx} {cy} {cx} {cy-s}Z")

def ground(y=246):
    return el("line", "ln", x1=24, y1=y, x2=576, y2=y)

# ---------------------------------------------------------------- scenes
def engineering():
    s = sun(440, 92, 82) + ground()
    s += pop("rect", "p", x=50, y=196, width=380, height=24, rx=12)
    s += "".join(el("circle", "k", cx=x, cy=208, r=6) for x in range(70, 430, 40))
    s += el("line", "ln", x1=90, y1=220, x2=90, y2=246) + el("line", "ln", x1=390, y1=220, x2=390, y2=246)
    s += box3d(80, 148, 48, 48)
    s += box3d(176, 128, 68, 68, front="k")
    s += el("polyline", "pl", points="200,148 190,162 200,176") + el("polyline", "pl", points="220,148 230,162 220,176")
    s += box3d(300, 160, 38, 36)
    # gear
    g = "".join(f'<rect class="k" x="122" y="40" width="16" height="16" rx="3" transform="rotate({a} 130 76)"/>' for a in range(0, 360, 45))
    s += g + pop("circle", "p", cx=130, cy=76, r=28, dx=5, dy=5) + el("circle", "k", cx=130, cy=76, r=9)
    # robot arm
    s += pop("rect", "k", x=470, y=212, width=80, height=34, rx=8, dx=0, dy=0)
    s += el("line", "arm", x1=510, y1=214, x2=468, y2=126) + el("line", "armi", x1=510, y1=214, x2=468, y2=126)
    s += el("line", "arm", x1=468, y1=126, x2=360, y2=106) + el("line", "armi", x1=468, y1=126, x2=360, y2=106)
    s += pop("circle", "p", cx=510, cy=212, r=15, dx=4, dy=4) + pop("circle", "dts", cx=468, cy=126, r=16, dx=4, dy=4)
    s += el("polyline", "ln", points="346,96 340,126 330,134") + el("polyline", "ln", points="368,100 372,130 364,140")
    s += pop("circle", "k", cx=358, cy=104, r=12, dx=3, dy=3)
    return s

def startup():
    s = sun(150, 88, 76) + ground()
    for i, cy in enumerate([222, 204, 186, 168]):
        s += cyl(150, cy, 50, 12, 18, top="dts" if i == 3 else "p")
    s += el("path", "ln", d="M150 168 C150 140 152 120 150 92")
    s += pop("path", "k", d="M150 132 C122 132 108 112 110 96 C134 96 150 110 150 132Z", dx=4, dy=4)
    s += pop("path", "p", d="M151 112 C152 88 168 70 192 70 C192 94 176 112 151 112Z", dx=4, dy=4)
    for i, h in enumerate([46, 76, 110, 150]):
        x = 300 + i * 62
        s += box3d(x, 246 - h, 40, h, d=12, front="k" if i == 3 else "p")
    s += el("polyline", "thick", points="290,170 340,140 392,152 470,74")
    s += pop("polygon", "k", points="452,66 486,60 478,94", dx=0, dy=0)
    s += spark(540, 120, 14) + spark(250, 60, 10)
    return s

def product():
    s = sun(480, 84, 72) + ground()
    s += pop("rect", "k", x=230, y=22, width=140, height=44, rx=12)
    s += el("line", "pl", x1=252, y1=38, x2=330, y2=38) + el("line", "pl", x1=252, y1=52, x2=300, y2=52)
    s += el("polyline", "ln", points="300,66 300,86") + el("line", "ln", x1=170, y1=86, x2=430, y2=86)
    s += el("line", "ln", x1=170, y1=86, x2=170, y2=100) + el("line", "ln", x1=430, y1=86, x2=430, y2=100)
    s += pop("rect", "p", x=110, y=100, width=120, height=38, rx=10) + pop("rect", "p", x=370, y=100, width=120, height=38, rx=10)
    s += el("line", "ln", x1=132, y1=119, x2=200, y2=119) + el("line", "ln", x1=392, y1=119, x2=460, y2=119)
    for cx0 in (170, 430):
        s += el("polyline", "ln", points=f"{cx0},138 {cx0},156") + el("line", "ln", x1=cx0 - 34, y1=156, x2=cx0 + 34, y2=156)
        s += el("line", "ln", x1=cx0 - 34, y1=156, x2=cx0 - 34, y2=170) + el("line", "ln", x1=cx0 + 34, y1=156, x2=cx0 + 34, y2=170)
    for cx, k in [(136, "k"), (204, "dts"), (396, "p"), (464, "k")]:
        s += pop("circle", k, cx=cx, cy=186, r=16, dx=4, dy=4)
    s += el("line", "handle", x1=330, y1=228, x2=372, y2=258)
    s += pop("circle", "p", cx=300, cy=200, r=40, dx=5, dy=5) + el("circle", "dt2", cx=300, cy=200, r=31) + el("circle", "o", cx=300, cy=200, r=31)
    s += el("path", "pl", d="M282 186 A22 22 0 0 1 300 176")
    return s

def apps():
    s = sun(130, 92, 76) + ground()
    s += pop("rect", "p", x=240, y=14, width=136, height=232, rx=22, dx=9, dy=9)
    s += el("rect", "o", x=252, y=42, width=112, height=186, rx=8)
    s += el("rect", "k", x=286, y=24, width=44, height=9, rx=4)
    kinds = ["k", "dts", "hs", "p", "k", "dts", "hs", "k", "p"]
    for j in range(3):
        for i in range(3):
            s += fill("rect", kinds[j * 3 + i], x=264 + i * 32, y=56 + j * 32, width=24, height=24, rx=7)
            s += el("rect", "o", x=264 + i * 32, y=56 + j * 32, width=24, height=24, rx=7)
    s += el("rect", "k", x=264, y=164, width=88, height=12, rx=6) + fill("rect", "hs", x=264, y=186, width=60, height=12, rx=6)
    s += el("circle", "k", cx=308, cy=214, r=6)
    s += pop("rect", "p", x=404, y=60, width=150, height=58, rx=12)
    s += el("circle", "k", cx=430, cy=89, r=14) + el("line", "ln", x1=454, y1=82, x2=530, y2=82) + el("line", "ln", x1=454, y1=98, x2=505, y2=98)
    s += pop("rect", "k", x=404, y=140, width=120, height=46, rx=12)
    s += el("line", "pl", x1=422, y1=156, x2=500, y2=156) + el("line", "pl", x1=422, y1=170, x2=470, y2=170)
    s += pop("rect", "p", x=96, y=184, width=96, height=40, rx=20) + el("circle", "k", cx=170, cy=204, r=13)
    s += el("path", "ln", d="M192 204 C214 204 220 180 240 176") + el("path", "ln", d="M376 116 C390 116 392 90 404 89")
    s += spark(560, 210, 12)
    return s

def fitness():
    s = sun(470, 84, 74) + ground()
    s += el("rect", "k", x=150, y=132, width=220, height=16, rx=4)
    s += pop("rect", "p", x=102, y=92, width=34, height=96, rx=8) + pop("rect", "dts", x=136, y=106, width=20, height=68, rx=5, dx=4, dy=4)
    s += pop("rect", "dts", x=364, y=106, width=20, height=68, rx=5, dx=4, dy=4) + pop("rect", "p", x=384, y=92, width=34, height=96, rx=8)
    s += el("path", "kb", d="M498 176 C498 132 548 132 548 176")
    s += pop("circle", "k", cx=523, cy=204, r=38)
    s += el("path", "pl", d="M500 196 A26 26 0 0 1 516 178")
    s += el("polyline", "thick", points="24,232 160,232 182,198 204,246 226,214 246,232 476,232")
    s += spark(80, 80, 14) + spark(300, 62, 10)
    return s

def mind():
    s = sun(140, 96, 74) + ground()
    s += pop("path", "p", d="M58 128 C40 128 34 104 52 96 C50 72 80 62 96 76 C104 52 144 52 152 80 C176 76 190 98 178 114 C192 122 184 140 168 140 L70 140 C60 140 56 134 58 128Z")
    s += pop("circle", "p", cx=330, cy=128, r=88, dx=9, dy=9) + el("circle", "dt2", cx=330, cy=128, r=74) + el("circle", "o", cx=330, cy=128, r=74)
    s += el("circle", "p", cx=330, cy=128, r=60) + el("circle", "o", cx=330, cy=128, r=60)
    s += "".join(f'<line class="tick" x1="330" y1="74" x2="330" y2="84" transform="rotate({a} 330 128)"/>' for a in range(0, 360, 30))
    s += el("line", "thick", x1=330, y1=128, x2=330, y2=90) + el("line", "thick", x1=330, y1=128, x2=358, y2=146)
    s += el("circle", "k", cx=330, cy=128, r=8)
    s += pop("polygon", "k", points="478,196 532,196 524,246 486,246")
    s += pop("path", "p", d="M505 196 C488 170 470 160 452 162 C454 184 476 196 505 196Z", dx=4, dy=4)
    s += pop("path", "dts", d="M505 196 C512 160 532 140 556 140 C556 168 534 192 505 196Z", dx=4, dy=4)
    s += el("path", "ln", d="M40 220 c16 -10 32 10 48 0 s32 10 48 0 s32 10 48 0")
    return s

def soft():
    s = sun(480, 70, 66) + ground()
    s += pop("path", "p", d="M88 30 H312 A26 26 0 0 1 338 56 V122 A26 26 0 0 1 312 148 H168 L124 184 V148 H88 A26 26 0 0 1 62 122 V56 A26 26 0 0 1 88 30Z", dx=9, dy=9)
    s += el("circle", "k", cx=150, cy=90, r=11) + el("circle", "k", cx=200, cy=90, r=11) + el("circle", "k", cx=250, cy=90, r=11)
    s += pop("path", "k", d="M312 120 H520 A22 22 0 0 1 542 142 V196 A22 22 0 0 1 520 218 H500 V250 L460 218 H312 A22 22 0 0 1 290 196 V142 A22 22 0 0 1 312 120Z", dx=-8, dy=8)
    s += el("line", "pl", x1=318, y1=152, x2=512, y2=152) + el("line", "pl", x1=318, y1=172, x2=470, y2=172) + el("line", "pl", x1=318, y1=192, x2=420, y2=192)
    s += spark(40, 220, 12) + spark(560, 230, 10)
    return s

def marketing():
    s = sun(420, 96, 84) + ground()
    s += pop("rect", "k", x=78, y=118, width=40, height=66, rx=8)
    s += pop("path", "p", d="M118 118 L300 52 L300 250 L118 184Z", dx=8, dy=8)
    s += fill("path", "hs", d="M160 103 L196 90 L196 214 L160 199Z")
    s += el("path", "o", d="M118 118 L300 52 L300 250 L118 184Z")
    s += pop("ellipse", "dts", cx=300, cy=151, rx=24, ry=99, dx=6, dy=6)
    s += el("path", "thick", d="M346 104 A60 60 0 0 1 346 198") + el("path", "thick", d="M380 78 A96 96 0 0 1 380 224") + el("path", "thick", d="M414 52 A132 132 0 0 1 414 250")
    s += el("path", "ln", d="M150 196 L170 246")
    s += spark(500, 54, 16) + spark(540, 160, 11) + spark(470, 226, 9)
    return s

def digest():
    s = sun(520, 70, 58) + ground()
    s += f'<g transform="rotate(-6 200 140)">{fill("rect", "dts", x=96, y=40, width=220, height=196, rx=8)}</g>'
    s += pop("rect", "p", x=80, y=32, width=224, height=200, rx=8)
    s += el("rect", "k", x=98, y=50, width=188, height=26, rx=4)
    s += "".join(el("line", "ln", x1=98, y1=y, x2=286, y2=y) for y in (96, 112))
    s += "".join(el("line", "ln", x1=196, y1=y, x2=286, y2=y) for y in (138, 154, 170, 186, 202))
    s += fill("rect", "hs", x=98, y=130, width=86, height=80) + el("rect", "o", x=98, y=130, width=86, height=80)
    s += pop("circle", "k", cx=436, cy=150, r=72, dx=9, dy=9)
    s += el("path", "pwr", d="M410 124 A38 38 0 1 0 462 124") + el("line", "pwr", x1=436, y1=104, x2=436, y2=146)
    s += spark(350, 50, 12) + spark(560, 220, 12)
    return s


def literature():
    s = sun(470, 80, 70) + ground()
    # hunter's net
    net = "".join(el("line", "hl2", x1=60 + i * 22, y1=20, x2=40 + i * 22, y2=120) for i in range(9))
    net += "".join(el("line", "hl2", x1=40, y1=30 + j * 22, x2=240, y2=26 + j * 22) for j in range(5))
    s += f'<g opacity=".55">{net}</g>'
    # doves flying with the net
    for (x, y, sc) in [(90, 70, 1), (150, 48, .85), (200, 84, .9)]:
        s += f'<g transform="translate({x} {y}) scale({sc})">' + el("path", "k", d="M0 0 C14 -14 30 -14 40 -4 C48 -16 62 -22 74 -16 C62 -8 56 2 48 8 C36 16 14 16 0 0Z") + el("circle", "pl", cx=58, cy=-12, r=0.1) + '</g>'
    # open book
    s += pop("path", "p", d="M300 206 C260 190 214 190 180 200 L180 120 C214 110 260 110 300 126Z", dx=6, dy=6)
    s += pop("path", "p", d="M300 206 C340 190 386 190 420 200 L420 120 C386 110 340 110 300 126Z", dx=6, dy=6)
    s += "".join(el("path", "ln", d=f"M196 {138+i*14} C228 {130+i*14} 262 {130+i*14} 286 {140+i*14}") for i in range(4))
    s += "".join(el("path", "ln", d=f"M314 {140+i*14} C338 {130+i*14} 372 {130+i*14} 404 {138+i*14}") for i in range(4))
    s += el("line", "o", x1=300, y1=126, x2=300, y2=206)
    # quill
    s += pop("path", "dts", d="M520 120 C560 140 566 190 540 236 C530 200 512 170 520 120Z", dx=5, dy=5)
    s += el("line", "ln", x1=540, y1=236, x2=530, y2=250)
    return s

def heritage():
    s = sun(140, 84, 72) + ground()
    # palm
    s += fill("path", "hs", d="M470 246 C466 190 468 140 476 92 L490 92 C484 140 484 190 488 246Z") + el("path", "o", d="M470 246 C466 190 468 140 476 92 L490 92 C484 140 484 190 488 246Z")
    for d in ["M483 92 C460 70 430 66 404 76 C430 80 452 90 483 96Z", "M483 92 C506 70 536 66 562 76 C536 80 514 90 483 96Z",
              "M483 92 C470 62 452 44 430 38 C446 56 462 76 480 96Z", "M483 92 C496 62 514 44 536 38 C520 56 504 76 486 96Z",
              "M483 92 C478 70 480 44 488 26 C492 48 490 72 486 94Z"]:
        s += el("path", "k", d=d)
    # dallah
    s += pop("path", "p", d="M250 246 C214 246 206 220 222 196 C232 182 236 168 232 150 L292 150 C288 168 292 182 302 196 C318 220 310 246 274 246Z", dx=6, dy=6)
    s += fill("path", "dts", d="M234 150 C238 136 248 126 262 122 C276 126 286 136 290 150Z") + el("path", "o", d="M234 150 C238 136 248 126 262 122 C276 126 286 136 290 150Z")
    s += el("path", "k", d="M254 122 L262 96 L270 122Z")
    s += el("path", "ln", d="M222 196 C196 186 180 168 168 140 L160 132")
    s += el("path", "ln", d="M302 196 C324 200 334 188 336 170 C338 154 326 150 316 160")
    s += el("line", "ln", x1=232, y1=166, x2=292, y2=166) + el("line", "ln", x1=226, y1=214, x2=298, y2=214)
    # finjans
    for x in (350, 400):
        s += pop("path", "p", d=f"M{x} 214 L{x+34} 214 L{x+28} 244 L{x+6} 244Z", dx=4, dy=3)
    s += el("path", "thick", d="M60 236 C90 200 120 190 160 190")
    return s

SCENES = {
    "هندسة البرمجيات": engineering, "ريادة الأعمال": startup, "إدارة المنتجات": product,
    "تطوير التطبيقات": apps, "الصحة البدنية": fitness, "الصحة النفسية": mind,
    "سوفت سكلز": soft, "التسويق": marketing, "خلاصة التقنية": digest,
    "قصص وأدب عربي": literature, "تراث سعودي": heritage,
}

def art(topic):
    scene = SCENES.get(topic, digest)()
    return f'<svg class="art" viewBox="0 0 600 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{DEFS}{scene}</svg>'
