# جرعة · نشرة يومية

موقع ثابت (HTML/CSS/JS) بدون أي سيرفر أو قاعدة بيانات. كل عدد صفحة HTML، والأرشيف يقرأ من `issues.json`.

## هيكل المشروع

```
index.html            الصفحة الرئيسية (الأرشيف + الفلاتر)، تقرأ issues.json
issues.json           قائمة الأعداد (رقم، تاريخ، موضوع، عنوان، الكلمة، الغلاف…)
issues/NNN.html       صفحات الأعداد الجاهزة (ناتج build.py)
src/NNN.html          محتوى كل عدد فقط (الجسم)، هذا اللي تعدلون عليه
build.py              يركّب src/ + issues.json داخل القالب ويطلع issues/
art.py                رسومات SVG قديمة (احتياط، ما تُستخدم مع صور الأغلفة)
assets/style.css      الهوية كاملة (ألوان، خطوط، مكونات الأقسام)
assets/app.js         يرسم الأرشيف والتنقل بين الأعداد من issues.json
assets/fonts/         الخطوط (Amiri, Readex Pro, Noto Naskh Arabic) مستضافة محلياً
assets/covers/        صورة هيدر لكل موضوع
scripts/notify.py     يرسل إيميل بآخر عدد عبر Resend
.github/workflows/    يشغّل notify.py تلقائياً عند نزول عدد جديد
prompts/daily-issue.md  البرومبت اللي يكتب العدد اليومي (للأتمتة)
```

## تشغيله محلياً

```bash
python3 build.py               # يبني كل الأعداد من src/
python3 -m http.server 8000    # افتحوا http://localhost:8000
```

> لازم سيرفر محلي (مو فتح الملف مباشرة) لأن الصفحات تقرأ issues.json.

## إضافة عدد يدوياً

1. أنشئوا `src/012.html` (انسخوا عدد من نفس الموضوع وعدلوا المحتوى).
2. أضيفوا سطر في `issues.json` (number, slug, date, topic, minutes, keyword, title, subtitle, cover).
3. `python3 build.py`

عناوين الأقسام اكتبوها `<h2>العنوان</h2>` في src، وbuild.py يحولها لشريط مع أيقونة تلقائياً (قائمة الأيقونات في `ICONS` داخل build.py).

## النشر على دومينكم (Vercel أو Netlify أو GitHub Pages)

**الطريقة المقترحة: GitHub + Vercel**

1. ارفعوا المجلد كـ repo على GitHub (branch اسمه `main`).
2. في [vercel.com](https://vercel.com): Add New Project ← اختاروا الـ repo ← Framework: **Other**، بدون build command، Output: الجذر `.`
3. Settings ← Domains ← أضيفوا مثلاً `jur3a.yourdomain.com`، وحطوا سجل الـ DNS اللي يعطيكم إياه Vercel عند مزود الدومين (غالباً CNAME إلى `cname.vercel-dns.com`).
4. أي push على main ينشر تلقائياً خلال ثواني.

> ملاحظة: issues/ مبنية وموجودة في الـ repo، فما يحتاج Vercel يشغّل Python. شغّلوا build.py قبل كل push.

## الإيميل التلقائي

### الطريقة 1: من إيميلكم في Gmail (الأسهل)
1. فعّلوا التحقق بخطوتين في حساب Google: myaccount.google.com ← Security ← 2-Step Verification.
2. افتحوا myaccount.google.com/apppasswords وأنشئوا App Password باسم «جرعة»، وانسخوا الـ 16 حرف.
3. في GitHub repo ← Settings ← Secrets and variables ← Actions:
   - **Secret:** `SMTP_PASSWORD` = الـ App Password
   - **Variables:** `SMTP_USER` = إيميلكم في Gmail · `EMAIL_TO` = الإيميلات اللي تبون ترسلون لها مفصولة بفاصلة · `SITE_URL` = رابط الموقع
4. جربوه من تبويب Actions ← Email new issue ← Run workflow.

الإيميل يطلع باسم «جرعة» من إيميلكم، والمستلمين في BCC فما أحد يشوف إيميل الثاني. حد Gmail تقريباً 500 مستلم باليوم.

### الطريقة 2: من دومينكم (Resend)
سجلوا في resend.com، وثّقوا الدومين، وحطوا `RESEND_API_KEY` كـ secret و`EMAIL_FROM` = `جرعة <hello@yourdomain.com>` كـ variable، مع `EMAIL_TO` و`SITE_URL`. لو `SMTP_USER` موجود، يستخدم Gmail أولاً.

## أتمتة كتابة العدد اليومي

البرومبت الكامل في `prompts/daily-issue.md`. أي وكيل ذكاء اصطناعي (مثل مهمة مجدولة في Claude) يقدر يشغله كل يوم: يقرأ issues.json، يختار الموضوع، يبحث، يكتب `src/NNN.html`، يحدّث issues.json، يشغّل build.py، ويسوي commit + push على main. والباقي (النشر والإيميل) يصير تلقائياً.

## الهوية

- الألوان: أسود وأبيض ورقي + أحمر `#B3261E` من صور الأغلفة (الداكن `#E5604F`). كلها tokens في أول style.css.
- الخطوط: Amiri Bold (كلمة الغلاف والشعار)، Readex Pro (العناوين والواجهة)، Noto Naskh Arabic (نص المقالات).
- الأرقام دائماً 0-9، والخطاب بصيغة الجمع.
# Jur3a
