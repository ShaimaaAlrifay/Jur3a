#!/usr/bin/env python3
"""Wraps issue body fragments (src/NNN.html) into full issue pages (issues/NNN.html) using issues.json metadata."""
import html as html_mod
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

SITE = json.load(open(os.path.join(ROOT, "site.json"), encoding="utf-8")).get("site_url", "").rstrip("/")

def esc(s):
    return html_mod.escape(re.sub(r"<[^>]+>", "", str(s)), quote=True)

FORMS = open(os.path.join(ROOT, "assets", "forms.html"), encoding="utf-8").read()

TPL = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>جرعة #{num}: {title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="جرعة">
<meta property="og:locale" content="ar_SA">
<meta property="og:title" content="جرعة #{num}: {title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta property="og:image:width" content="1500">
<meta property="og:image:height" content="1000">
<meta property="article:published_time" content="{iso}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#111111">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
<link rel="apple-touch-icon" href="../assets/icon-180.png">
<link rel="alternate" type="application/rss+xml" title="جرعة" href="../feed.xml">
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
                          minutes=ar(i["minutes"]), body=transform(body), art=art(i["topic"]), keyword=i.get("keyword", i["topic"]), cover=i["cover"], forms=FORMS, desc=esc(i["subtitle"]), url=f'{SITE}/issues/{i["slug"]}.html', og=f'{SITE}/{i["cover"]}', iso=i["date"])
        open(os.path.join(ROOT, "issues", f"{i['slug']}.html"), "w", encoding="utf-8").write(html)
        print("built", i["slug"])
    write_extras(data)


def write_extras(data):
    """sitemap.xml, robots.txt and an RSS feed, so the site is findable and followable."""
    if not SITE:
        return
    items = sorted(data["issues"], key=lambda x: x["number"], reverse=True)
    urls = [f"  <url><loc>{SITE}/</loc><changefreq>daily</changefreq></url>"]
    urls += [f"  <url><loc>{SITE}/issues/{i['slug']}.html</loc><lastmod>{i['date']}</lastmod></url>" for i in items]
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n")
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")
    def rfc(d):
        dt = datetime.datetime.combine(datetime.date.fromisoformat(d), datetime.time(5, 0))  # 08:00 Riyadh
        return dt.strftime("%a, %d %b %Y %H:%M:%S +0000")
    entries = []
    for i in items[:30]:
        link = f"{SITE}/issues/{i['slug']}.html"
        entries.append(f"""  <item>
    <title>{esc(f"جرعة #{i['number']}: {i['title']}")}</title>
    <link>{link}</link>
    <guid isPermaLink="true">{link}</guid>
    <pubDate>{rfc(i['date'])}</pubDate>
    <category>{esc(i['topic'])}</category>
    <description>{esc(i['subtitle'])}</description>
    <enclosure url="{SITE}/{i['cover']}" type="image/jpeg" length="0"/>
  </item>""")
    open(os.path.join(ROOT, "feed.xml"), "w", encoding="utf-8").write(f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>جرعة</title>
  <link>{SITE}/</link>
  <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>نشرة يومية تصلكم الساعة 8 الصبح: فكرة وحدة مركّزة تطبقونها نفس اليوم.</description>
  <language>ar</language>
{chr(10).join(entries)}
</channel>
</rss>
""")

if __name__ == "__main__":
    main()
