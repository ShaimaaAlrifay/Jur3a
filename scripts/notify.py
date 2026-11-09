#!/usr/bin/env python3
"""Send an email about the latest issue of «جرعة» via Resend (https://resend.com).

Env vars:
  RESEND_API_KEY  your Resend API key
  EMAIL_FROM      verified sender, e.g. "جرعة <hello@yourdomain.com>"
  EMAIL_TO        comma-separated recipients
  SITE_URL        public site URL without trailing slash, e.g. https://jur3a.vercel.app
"""
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    data = json.load(open(os.path.join(ROOT, "issues.json"), encoding="utf-8"))
    i = max(data["issues"], key=lambda x: x["number"])
    site = os.environ["SITE_URL"].rstrip("/")
    link = f"{site}/issues/{i['slug']}.html"
    cover = f"{site}/{i['cover']}" if i.get("cover") else ""
    html = f"""<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:600px;margin:auto;color:#111">
  {f'<a href="{link}"><img src="{cover}" alt="" style="width:100%;border-radius:12px;display:block"></a>' if cover else ''}
  <p style="color:#B3261E;font-weight:bold;margin:18px 0 4px">جرعة #{i['number']} · {i['topic']}</p>
  <h1 style="font-size:24px;margin:0 0 8px">{i['title']}</h1>
  <p style="font-size:16px;line-height:1.8;color:#444">{i['subtitle']}</p>
  <p><a href="{link}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">اقرأوا العدد ({i['minutes']} دقائق)</a></p>
  <p style="font-size:12px;color:#888">جرعة · تُرسل كل صباح الساعة 8 · <a href="{site}/" style="color:#888">كل الأعداد</a></p>
</div>"""
    body = json.dumps({
        "from": os.environ["EMAIL_FROM"],
        "to": [e.strip() for e in os.environ["EMAIL_TO"].split(",") if e.strip()],
        "subject": f"جرعة #{i['number']}: {i['title']}",
        "html": html,
    }).encode()
    req = urllib.request.Request("https://api.resend.com/emails", data=body, method="POST", headers={
        "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        print("sent:", r.status, r.read().decode())


if __name__ == "__main__":
    sys.exit(main())
