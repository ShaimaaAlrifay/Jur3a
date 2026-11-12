#!/usr/bin/env python3
"""Email the latest issue of «جرعة».

Two ways to send (pick one):
  0) Buttondown (all site subscribers) -> set BUTTONDOWN_API_KEY  [preferred: no manual list]
  A) Gmail (from your own address)  -> set SMTP_USER + SMTP_PASSWORD (a Gmail App Password)
  B) Resend (from your domain)      -> set RESEND_API_KEY + EMAIL_FROM

Always set:
  EMAIL_TO  comma-separated recipients (sent as BCC, so they don't see each other)
  SITE_URL  public site URL without trailing slash
"""
import datetime, json, os, smtplib, sys, urllib.request, urllib.error
from email.message import EmailMessage
from email.utils import formataddr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build():
    data = json.load(open(os.path.join(ROOT, "issues.json"), encoding="utf-8"))
    i = max(data["issues"], key=lambda x: x["number"])
    site = os.environ["SITE_URL"].rstrip("/")
    link = f"{site}/issues/{i['slug']}.html"
    cover = f"{site}/{i['cover']}" if i.get("cover") else ""
    img = f'<a href="{link}"><img src="{cover}" alt="" style="width:100%;border-radius:12px;display:block"></a>' if cover else ""
    html = f"""<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:600px;margin:auto;color:#111">
  {img}
  <p style="color:#E5604F;font-weight:bold;margin:18px 0 4px">جرعة #{i['number']} · {i['topic']}</p>
  <h1 style="font-size:24px;margin:0 0 8px">{i['title']}</h1>
  <p style="font-size:16px;line-height:1.8;color:#444">{i['subtitle']}</p>
  <p><a href="{link}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">اقرأوا العدد ({i['minutes']} دقائق)</a></p>
  <p style="font-size:12px;color:#888">جرعة · كل صباح الساعة 8 · <a href="{site}/" style="color:#888">كل الأعداد</a></p>
</div>"""
    text = f"جرعة #{i['number']}: {i['title']}\n{i['subtitle']}\n{link}"
    return f"جرعة #{i['number']}: {i['title']}", html, text


def recipients():
    return [e.strip() for e in os.environ["EMAIL_TO"].split(",") if e.strip()]


def send_gmail(subject, html, text):
    user = os.environ["SMTP_USER"]
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr(("جرعة", user))
    msg["To"] = user
    msg["Bcc"] = ", ".join(recipients())
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    with smtplib.SMTP_SSL(os.environ.get("SMTP_HOST", "smtp.gmail.com"), int(os.environ.get("SMTP_PORT", "465"))) as s:
        s.login(user, os.environ["SMTP_PASSWORD"])
        s.send_message(msg)
    print("sent via SMTP to", len(recipients()), "recipient(s)")


def send_resend(subject, html, text):
    body = json.dumps({"from": os.environ["EMAIL_FROM"], "to": [os.environ.get("EMAIL_FROM_ADDR", recipients()[0])],
                       "bcc": recipients(), "subject": subject, "html": html, "text": text}).encode()
    req = urllib.request.Request("https://api.resend.com/emails", data=body, method="POST", headers={
        "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        print("sent via Resend:", r.status)


def send_buttondown(subject, html, text):
    """Send to every confirmed Buttondown subscriber (they sign up on the site)."""
    import json
    payload = json.dumps({"subject": subject, "body": html, "status": "about_to_send"}).encode()
    def post(confirm):
        h = {"Authorization": f"Token {os.environ['BUTTONDOWN_API_KEY']}", "Content-Type": "application/json"}
        if confirm:
            h["X-Buttondown-Live-Dangerously"] = "true"  # one-time per API key
        req = urllib.request.Request("https://api.buttondown.com/v1/emails", data=payload, method="POST", headers=h)
        with urllib.request.urlopen(req) as r:
            print("sent via Buttondown:", r.status)
    try:
        post(False)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        if e.code == 400 and "sending_requires_confirmation" in detail:
            post(True)
        else:
            sys.exit(f"Buttondown error {e.code}: {detail}")


def main():
    # Only email an issue on the day it is published, so edits to older issues never resend anything.
    try:
        latest = max(json.load(open("issues.json", encoding="utf-8"))["issues"], key=lambda i: i["number"])
        riyadh_today = (datetime.datetime.utcnow() + datetime.timedelta(hours=3)).date().isoformat()
        if latest["date"] != riyadh_today and not os.environ.get("FORCE_SEND"):
            print(f"Latest issue #{latest['number']} is dated {latest['date']}, not today ({riyadh_today}); not emailing.")
            return
    except FileNotFoundError:
        pass
    subject, html, text = build()
    if os.environ.get("BUTTONDOWN_API_KEY"):
        try:
            send_buttondown(subject, html, text)
            return
        except (SystemExit, Exception) as e:
            print("Buttondown failed:", e)
            if not os.environ.get("SMTP_USER"):
                raise
            # never leave the owner without the issue: fall back to Gmail, then mark the run as failed
            if not os.environ.get("EMAIL_TO", "").strip():
                os.environ["EMAIL_TO"] = os.environ["SMTP_USER"]
            send_gmail(subject, html, text)
            sys.exit("Buttondown failed; sent via Gmail fallback instead.")
    if os.environ.get("SMTP_USER"):
        send_gmail(subject, html, text)
    elif os.environ.get("RESEND_API_KEY"):
        send_resend(subject, html, text)
    else:
        sys.exit("Set SMTP_USER/SMTP_PASSWORD (Gmail) or RESEND_API_KEY/EMAIL_FROM.")


if __name__ == "__main__":
    main()
