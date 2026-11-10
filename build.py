#!/usr/bin/env python3
"""Wraps issue body fragments (src/NNN.html) into full issue pages (issues/NNN.html) using issues.json metadata."""
import json, os, datetime, re
from art import art

ROOT = os.path.dirname(os.path.abspath(__file__))
AR = str.maketrans("", "")
MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
DAYS = ["الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت","الأحد"]

def ar(n): return str(n).translate(AR)

def ardate(s):
    d = datetime.date.fromisoformat(s)
    return f"{DAYS[d.weekday()]} {ar(d.day)} {MONTHS[d.month-1]} {ar(d.year)}"

FORMS = open(os.path.join(ROOT, "assets", "forms.html"), encoding="utf-8").read()

TPL = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>جرعة #{num}: {title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body data-base="../" data-issue="{number}">
<header class="topbar"><div class="topbar-in">
  <a class="logo" href="../index.html">جرعة<i>.</i></a>
  <nav class="nav"><a href="../index.html">كل الأعداد</a></nav>
</div></header>

<main class="wrap">
<article class="sheet">
  <div class="cover photo">
    <img class="cover-img" src="../{cover}" alt="" width="1500" height="1000">
    <div class="cover-in">
      <div class="cover-top"><span><b>جرعة</b>العدد {num}</span><span>{date}</span></div>
      <p class="keyword" aria-hidden="true">{keyword}</p>
      <div class="cover-bot"><span class="chip">{topic}</span><span class="n">#{num}</span></div>
    </div>
  </div>
  <header class="head">
    <h1>{title}</h1>
    <p class="sub">{subtitle_html}</p>
    <div class="meta"><span>{date}</span><span>{minutes} دقائق قراءة</span></div>
  </header>
  <div class="body">
{body}
  </div>
</article>
{forms}
<nav class="pager" id="pager" aria-label="التنقل بين الأعداد"></nav>
<h2 class="section-title">أعداد سابقة</h2>
<div class="cards more" id="more"><p class="empty">جاري التحميل…</p></div>
</main>
<footer class="foot"><span>جرعة · تُرسل كل صباح</span><a href="../index.html">كل الأعداد</a></footer>
<script src="../assets/app.js"></script>
<script src="../assets/forms.js"></script>
<script src="../assets/share.js"></script>
</body>
</html>
"""

ICONS = [("المصادر","link"),("سؤال","help"),("رقم","insights"),("الفكرة","lightbulb"),("الحكاية","auto_stories"),
 ("قصة","auto_stories"),("طبّقوها","bolt"),("جربوها","bolt"),("على السريع","electric_bolt"),("أهم الأخبار","newspaper"),
 ("أداة","build"),("مكتبة","extension"),("تحت المجهر","search"),("احسبوها","calculate"),("الإطار","account_tree"),
 ("قالب","content_copy"),("مصطلح","menu_book"),("ليش","info"),("وش صار","info"),("قبل وبعد","compare_arrows"),
 ("قائمة الفحص","checklist"),("خطأ","error"),("خرافة","fact_check"),("العلم","science"),("البحث","science"),
 ("خطت","fitness_center"),("صحن","restaurant"),("تمرين","self_improvement"),("للكتابة","edit_note"),
 ("المهارة","psychology"),("قولي","forum"),("موقف","work"),("تحدي","flag"),("الدرس","school"),("الموسم","calendar_month"),
 ("مقال","article"),("النص","format_quote"),("بيت","format_quote"),("الكاتب","history_edu"),("العبرة","emoji_objects"),("كلمة","translate"),("مفردات","translate"),("اقرأوها","menu_book"),("تاريخ","history"),("التراث","account_balance"),("وين","place")]

def icon_for(t):
    for k, ic in ICONS:
        if k in t: return ic
    return "star"

def transform(body):
    body = re.sub(r'\n\s*<div class="divider" aria-hidden="true">\* \* \*</div>\n', "\n", body)
    def band(m):
        t = m.group(1)
        plain = re.sub("<[^>]+>", "", t)
        return f'<h2 class="band"><span class="band-t">{t}</span><span class="ms" aria-hidden="true">{icon_for(plain)}</span></h2>'
    body = re.sub(r"<h2>(.*?)</h2>", band, body)
    # thin rule before the closing tags/sign-off block
    body = re.sub(r'(\n\s*<div class="block">\s*<div class="tags">)', r'\n    <hr class="rule">\1', body)
    return body

def main():
    data = json.load(open(os.path.join(ROOT, "issues.json"), encoding="utf-8"))
    for i in data["issues"]:
        src = os.path.join(ROOT, "src", f"{i['slug']}.html")
        if not os.path.exists(src):
            continue
        body = open(src, encoding="utf-8").read().rstrip()
        html = TPL.format(num=ar(i["number"]), number=i["number"], title=i["title"], topic=i["topic"],
                          subtitle_html=i.get("subtitle_html", i["subtitle"]), date=ardate(i["date"]),
                          minutes=ar(i["minutes"]), body=transform(body), art=art(i["topic"]), keyword=i.get("keyword", i["topic"]), cover=i["cover"], forms=FORMS)
        open(os.path.join(ROOT, "issues", f"{i['slug']}.html"), "w", encoding="utf-8").write(html)
        print("built", i["slug"])

if __name__ == "__main__":
    main()
