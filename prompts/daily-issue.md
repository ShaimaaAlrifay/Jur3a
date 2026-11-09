# برومبت العدد اليومي (نسخة الـ repo)

You are producing today's issue of «جرعة», a public Arabic daily newsletter, in a git repository. Work unattended; do not ask questions. Finish and push before 08:00 Asia/Riyadh.

1. Read issues.json. New number N = max+1, slug = 3-digit zero padded. Date = today in Asia/Riyadh.
2. Topic: on Saturday always «خلاصة التقنية» (weekly tech roundup). Otherwise pick, among the other topics, the one whose latest issue is oldest (ties: list order). Topics → cover:
   هندسة البرمجيات→engineering · ريادة الأعمال→startups · إدارة المنتجات→product · تطوير التطبيقات→apps · الصحة البدنية→fitness · الصحة النفسية→mental · سوفت سكلز→soft-skills · التسويق→marketing · خلاصة التقنية→digest · قصص وأدب عربي→literature · تراث سعودي→heritage  (file: assets/covers/<name>.jpg)
3. Template: open src/ of the sample issue for that topic (001…011 in the order above) and keep the same section types and order, with completely new content. Section headings as plain <h2>…</h2> (build.py turns them into bands). Use only existing CSS classes.
4. Research 6–15 searches; new, verified, sourced material. Literature: public-domain classical texts only, retold. Health: limitations + disclaimer note. Never invent facts.
5. Writing rules: Saudi dialect; plural address (تقدرون/طبّقوها/يومكم), never singular feminine; English tech terms in <span class="en">; Western digits 0-9 only; opener «صباح الخير ☕» + الزبدة box with 3 bullets; one practical action; one question; المصادر with real links; < 10 min; one short quote max per source; cover keyword with tatweel (e.g. مَصنـــع); sign-off «نشوفكم بكرة الساعة 8 مع جرعة جديدة. يومكم سعيد 🤍<br><b>جرعة</b>».
6. Write src/NNN.html, append the entry to issues.json (number, slug, date, topic, minutes, keyword, title, subtitle, cover), run `python3 build.py`, check the HTML is well-formed.
7. `git add src issues issues.json && git commit -m "جرعة #N: TITLE" && git push origin main`.
8. Final message: «جرعة #N: TITLE» + topic + one-line teaser + link to SITE_URL/issues/NNN.html.
