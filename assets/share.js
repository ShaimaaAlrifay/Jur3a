/* جرعة — select text in an issue → share it as an image (pick a format), or copy a link that opens on that sentence. */
(function () {
  var body = document.querySelector('.body');
  if (!body) return;

  var C = { ink: '#111111', faded: '#BEBAB1', muted: '#6B6A66', accent: '#B3261E', accent2: '#E5604F', mark: 'rgba(179,38,30,.15)', cream: '#F4F1EA' };
  var ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  var BLOCKS = 'p,li,blockquote,h2,h3,h4,dd,dt,figcaption,td,th,pre';
  var FORMATS = {
    sq: { label: 'مربع', hint: '1:1', W: 1080, H: 1080 },
    pt: { label: 'عمودي', hint: '4:5', W: 1080, H: 1350 },
    ls: { label: 'أفقي', hint: '3:2', W: 1620, H: 1080 },
    st: { label: 'ستوري', hint: '9:16', W: 1080, H: 1920 }
  };
  var ORDER = ['sq', 'pt', 'ls', 'st'];

  function clean(s) { return String(s || '').replace(/[\s ]+/g, ' ').trim(); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* visible text of a node or fragment: skips icons/aria-hidden, keeps a space between blocks */
  function textOf(root) {
    var c = root.cloneNode(true);
    if (c.querySelectorAll) {
      c.querySelectorAll('[aria-hidden="true"],.ms,script,style,button').forEach(function (n) { n.remove(); });
      c.querySelectorAll(BLOCKS + ',div,br,h1,h5,h6,ul,ol,tr,small,.k,.chip,.tag').forEach(function (n) {
        if (n.tagName === 'BR') { n.replaceWith(' '); return; }
        n.insertBefore(document.createTextNode(' '), n.firstChild); n.appendChild(document.createTextNode(' '));
      });
    }
    return c.textContent;
  }
  function blockOf(node) {
    var el = node.nodeType === 1 ? node : node.parentNode;
    return (el && el.closest && el.closest(BLOCKS)) || body;
  }

  /* ── selection → {text, full, start} ─────────── */
  function readSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    if (!body.contains(r.startContainer) || !body.contains(r.endContainer)) return null;
    var raw = clean(textOf(r.cloneContents()));
    if (raw.replace(/[\s.,،؛:!?؟«»"'()\-–—…]/g, '').length < 2) return null;

    var sb = blockOf(r.startContainer), eb = blockOf(r.endContainer);
    var pre = document.createRange(); pre.selectNodeContents(sb); pre.setEnd(r.startContainer, r.startOffset);
    var post = document.createRange(); post.selectNodeContents(eb); post.setStart(r.endContainer, r.endOffset);
    var lead = textOf(pre.cloneContents()).replace(/[\s ]+/g, ' ').replace(/^ /, '');
    var tail = textOf(post.cloneContents()).replace(/[\s ]+/g, ' ');
    // snap to whole words so the link and the image never cut a word in half
    var rawEdge = r.toString();
    var headFix = /\S$/.test(lead) && /^\S/.test(rawEdge) && r.startContainer.nodeType === 3 ? lead.match(/\S*$/)[0] : '';
    var tailFix = /^\S/.test(tail) && /\S$/.test(rawEdge) && r.endContainer.nodeType === 3 ? tail.match(/^\S*/)[0] : '';
    var text = clean(headFix + raw + tailFix);

    var out = { text: text, rect: r.getBoundingClientRect(), multi: sb !== eb };
    if (sb === eb && sb !== body) {
      out.full = clean(textOf(sb));
      var a = Math.max(0, lead.length - headFix.length);
      while (out.full[a] === ' ') a++;
      if (out.full.substr(a, text.length) !== text) a = out.full.indexOf(text);
      out.start = a;
      if (a < 0) { out.full = text; out.start = 0; }
    } else { out.full = text; out.start = 0; } // across paragraphs: the whole selection is the quote
    return out;
  }

  /* ── toolbar ─────────────────────────────── */
  var bar = document.createElement('div');
  bar.className = 'sharebar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'مشاركة النص المحدد');
  bar.hidden = true;
  bar.innerHTML =
    '<button type="button" data-act="image" class="pri"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 15.5l-4.8-4.8L6 19.5"/></svg><span>شاركوها كصورة</span></button>' +
    '<button type="button" data-act="link"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg><span>انسخوا رابط الجملة</span></button>' +
    '<span class="sharebar-st" role="status" aria-live="polite"></span>';
  document.body.appendChild(bar);
  var status = bar.querySelector('.sharebar-st');
  var current = null, pressing = 0, modalOpen = false;

  function place() {
    if (modalOpen) return;
    var next = readSelection();
    if (!next) {
      if (Date.now() - pressing < 800) return; // the tap on the bar itself cleared the selection (mobile)
      bar.hidden = true; current = null; return;
    }
    if (!current || next.text !== current.text) status.textContent = '';
    current = next;
    bar.hidden = false;
    var r = current.rect, bw = bar.offsetWidth, bh = bar.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var top = touch ? r.bottom + 16 : r.top - bh - 10;
    if (!touch && top < 72) top = r.bottom + 10;
    var left = r.left + r.width / 2 - bw / 2;
    left = Math.max(8, Math.min(left, vw - bw - 8));
    bar.style.top = Math.max(8, top + window.scrollY) + 'px';
    bar.style.left = (left + window.scrollX) + 'px';
  }
  var t;
  function later() { clearTimeout(t); t = setTimeout(place, 160); }
  document.addEventListener('selectionchange', later);
  document.addEventListener('mouseup', later);
  document.addEventListener('touchend', later);
  window.addEventListener('resize', function () { if (!bar.hidden) place(); });
  ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) {
    bar.addEventListener(ev, function (e) { pressing = Date.now(); if (ev !== 'touchstart') e.preventDefault(); }, { passive: ev === 'touchstart' });
  });
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !current) return;
    if (b.dataset.act === 'link') copyLink(current, status);
    else openModal(current);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bar.hidden && !modalOpen) bar.hidden = true; });

  /* ── link to the sentence (#:~:text=) ───── */
  function enc(s) { return encodeURIComponent(s).replace(/-/g, '%2D').replace(/,/g, '%2C').replace(/&/g, '%26'); }
  var pageText = null;
  function count(hay, needle) { var n = 0, i = 0; while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; } return n; }
  function fragmentUrl(s) {
    if (pageText === null) pageText = clean(textOf(body));
    var w = s.text.split(' '), parts;
    var startT = w.length <= 10 ? s.text : w.slice(0, 4).join(' ');
    parts = w.length <= 10 ? [enc(s.text)] : [enc(startT), enc(w.slice(-4).join(' '))];
    if (count(pageText, startT) > 1 && s.full && s.start > 0) { // ambiguous: anchor with the words just before it
      var before = s.full.slice(0, s.start).trim().split(' ').slice(-3).join(' ');
      if (before) parts.unshift(enc(before) + '-');
    }
    return location.origin + location.pathname + '#:~:text=' + parts.join(',');
  }
  function copyText(v) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) return navigator.clipboard.writeText(v).catch(function () { return legacyCopy(v); });
    return Promise.resolve(legacyCopy(v));
  }
  function legacyCopy(v) {
    var ta = document.createElement('textarea');
    ta.value = v; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove();
    if (!ok) throw new Error('copy');
  }
  function copyLink(s, where) {
    copyText(fragmentUrl(s)).then(function () { where.textContent = 'انتسخ ✓'; }, function () { where.textContent = 'ما قدرنا ننسخ'; });
  }

  /* ── words for the image ────────────────── */
  function tokens(s, maxc) {
    var full = s.full, a = s.start, z = a + s.text.length;
    if (full.substr(a, s.text.length) !== s.text) { full = s.text; a = 0; z = s.text.length; }
    while (a > 0 && full[a - 1] !== ' ') a--;
    while (z < full.length && full[z] !== ' ') z++;
    var before = full.slice(0, a).split(' ').filter(Boolean);
    var mid = full.slice(a, z).split(' ').filter(Boolean);
    var after = full.slice(z).split(' ').filter(Boolean);
    var cutB = false, cutA = false;
    if (before.length > maxc) { before = before.slice(-maxc); cutB = true; }
    for (var k = before.length - 2; k >= 0; k--) if (/[.!؟?:]$/.test(before[k])) { before = before.slice(k + 1); cutB = false; break; }
    if (after.length > maxc) { after = after.slice(0, maxc); cutA = true; }
    for (var j = 0; j < after.length; j++) if (/[.!؟?]$/.test(after[j])) { after = after.slice(0, j + 1); cutA = false; break; }
    if (cutB) before.unshift('…');
    if (cutA) after.push('…');
    var out = [];
    before.forEach(function (w) { out.push({ w: w, s: false }); });
    mid.forEach(function (w) { out.push({ w: w, s: true }); });
    after.forEach(function (w) { out.push({ w: w, s: false }); });
    return out;
  }
  function runs(words) { // keep consecutive LTR words (English terms, numbers) in reading order
    var out = [];
    words.forEach(function (t) {
      var ltr = !ARABIC.test(t.w), last = out[out.length - 1];
      if (last && last.ltr && ltr && last.s === t.s) last.w += ' ' + t.w;
      else out.push({ w: t.w, s: t.s, ltr: ltr });
    });
    return out;
  }
  function qfont(it, fs) { return (it.s ? '700 ' : '400 ') + fs + 'px "Noto Naskh Arabic","Readex Pro",serif'; }
  function layout(ctx, items, fs, maxW) {
    var lines = [[]], x = 0, sp = fs * 0.28;
    items.forEach(function (it) {
      ctx.font = qfont(it, fs);
      it.width = ctx.measureText(it.w).width;
      if (it.width > maxW) { it.width = maxW; } // one giant token (e.g. a URL): squeeze it in
      if (x > 0 && x + sp + it.width > maxW) { lines.push([]); x = 0; }
      lines[lines.length - 1].push(it);
      x += (x > 0 ? sp : 0) + it.width;
    });
    return lines;
  }
  function fitText(ctx, text, font, maxW) {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxW) return text;
    var w = text.split(' ');
    while (w.length > 1 && ctx.measureText(w.join(' ') + '…').width > maxW) w.pop();
    var s = w.join(' ');
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  function pill(ctx, x, y, w, h, stroke, fill) {
    var r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function meta() {
    var chip = document.querySelector('.cover-bot .chip');
    var kw = document.querySelector('.cover .keyword');
    var h1 = document.querySelector('.head h1');
    var d = document.querySelector('.cover-top span:last-child');
    return {
      num: document.body.getAttribute('data-issue') || '',
      topic: chip ? clean(chip.textContent) : '',
      keyword: kw ? kw.textContent.trim() : 'جرعة',
      title: h1 ? clean(h1.textContent) : clean(document.title),
      date: d ? clean(d.textContent) : '',
      host: (location.host || 'jur3a').replace(/^www\./, '')
    };
  }

  /* ── cover block (same look as an issue page) ── */
  function drawCover(ctx, img, R, m, safeTop) {
    var P = R.h < 500 ? 52 : 68, x0 = R.x, y0 = R.y, w = R.w, h = R.h;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.fillStyle = '#111'; ctx.fillRect(x0, y0, w, h);
    if (img && img.naturalWidth) {
      var sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      var dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
      ctx.drawImage(img, x0 + (w - dw) / 2, y0 + (h - dh) / 2, dw, dh);
    }
    var g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, 'rgba(0,0,0,.62)'); g.addColorStop(.38, 'rgba(0,0,0,.25)'); g.addColorStop(.58, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.58)');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);

    var R0 = x0 + w - P, L0 = x0 + P, ty = y0 + safeTop + P + 34;
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.cream; ctx.font = '700 46px "Amiri",serif';
    ctx.fillText('جرعة', R0, ty);
    var lw = ctx.measureText('جرعة').width;
    ctx.fillStyle = C.accent2; ctx.beginPath(); ctx.arc(R0 - lw - 9, ty - 4, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(244,241,234,.82)'; ctx.font = '400 24px "Readex Pro",sans-serif';
    var issueTxt = 'العدد ' + m.num;
    ctx.fillText(issueTxt, R0 - lw - 30, ty - 4);
    var used = lw + 30 + ctx.measureText(issueTxt).width + 30;
    if (m.date) { ctx.textAlign = 'left'; ctx.fillText(fitText(ctx, m.date, ctx.font, w - 2 * P - used), L0, ty - 4); }
    ctx.fillStyle = 'rgba(244,241,234,.45)'; ctx.fillRect(L0, ty + 20, w - 2 * P, 1.5);

    // bottom row: topic chip ........ #N
    var by = y0 + h - P;
    ctx.font = '600 24px "Readex Pro",sans-serif';
    ctx.direction = 'ltr'; ctx.textAlign = 'right'; ctx.font = '600 44px "Readex Pro",sans-serif'; ctx.fillStyle = C.cream;
    ctx.fillText('#' + m.num, R0, by + 14);
    var numW = ctx.measureText('#' + m.num).width;
    if (m.topic) {
      ctx.direction = 'rtl'; ctx.font = '600 24px "Readex Pro",sans-serif';
      var label = fitText(ctx, m.topic, ctx.font, w - 2 * P - numW - 80);
      var cw = ctx.measureText(label).width + 44;
      pill(ctx, L0, by - 22, cw, 46, 'rgba(244,241,234,.8)', 'rgba(0,0,0,.22)');
      ctx.fillStyle = C.cream; ctx.textAlign = 'center'; ctx.fillText(label, L0 + cw / 2, by + 9);
    }

    // giant keyword, fitted between the two rows by its real glyph box
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = C.cream;
    var zoneT = ty + 20 + 22, zoneB = by - 22 - 22, maxW = w - 2 * P;
    var ks = Math.min(200, (zoneB - zoneT) * 1.1), km;
    for (;;) {
      ctx.font = '700 ' + ks + 'px "Amiri",serif';
      km = ctx.measureText(m.keyword);
      var kh = (km.actualBoundingBoxAscent || ks * .9) + (km.actualBoundingBoxDescent || ks * .3);
      if ((km.width <= maxW && kh <= zoneB - zoneT) || ks <= 40) break;
      ks -= 4;
    }
    var kA = km.actualBoundingBoxAscent || ks * .9, kD = km.actualBoundingBoxDescent || ks * .3;
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 3;
    ctx.fillText(m.keyword, R0, zoneT + Math.max(0, (zoneB - zoneT) - (kA + kD)) / 2 + kA);
    ctx.restore();
  }

  /* ── quote block on paper ── */
  function drawPaper(ctx, s, R, m, o) {
    var P = o.pad, x0 = R.x, y0 = R.y, w = R.w, h = R.h - o.safeBottom;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(R.x, R.y, R.w, R.h);
    var qs = o.quoteMark;
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = C.accent;
    ctx.font = '700 ' + qs + 'px "Amiri",serif';
    ctx.fillText('”', x0 + w - P + 6, y0 + P * .4 + qs * .78);

    // footer band
    var bh = 62, fy = y0 + h - P - bh;
    pill(ctx, x0 + P, fy, w - 2 * P, bh, '#E4E2DC', '#F3F2EE');
    ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.fillStyle = C.accent; ctx.font = '600 21px "Readex Pro",sans-serif';
    ctx.fillText(m.host, x0 + P + 28, fy + 39);
    var hostW = ctx.measureText(m.host).width;
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = C.ink;
    var tf = '600 24px "Readex Pro",sans-serif';
    ctx.fillText(fitText(ctx, m.title, tf, w - 2 * P - hostW - 90), x0 + w - P - 28, fy + 40);

    // the quote: selection in ink with a red marker, the rest of the paragraph faded around it.
    // The browser lays the words out (correct Arabic/English order, wrapping), then we paint them.
    var top = y0 + P * .4 + qs * .95, bottom = fy - 36, maxW = w - 2 * P, avail = bottom - top;
    var toks = tokens(s, o.context), fs = o.maxFont, MINF = o.minFont || 34, L;
    for (; fs >= MINF; fs -= 2) { L = domLayout(toks, fs, maxW); if (L.height <= avail) break; }
    fs = Math.max(fs, MINF);
    var guard = 400;
    while (L.height > avail && guard-- > 0) { // still too long: drop far context first, then trim the end
      var firstSel = -1, lastSel = -1;
      toks.forEach(function (x, i) { if (x.s) { if (firstSel < 0) firstSel = i; lastSel = i; } });
      var nb = firstSel, na = toks.length - 1 - lastSel;
      if (na > 0 && (na >= nb || nb === 0)) { toks.pop(); if (toks.length - 1 > lastSel) toks[toks.length - 1] = { w: toks[toks.length - 1].w.replace(/…$/, '') + '…', s: false }; else toks[lastSel].w = toks[lastSel].w; }
      else if (nb > 0) { toks.shift(); if (toks[0] && !toks[0].s) toks[0] = { w: '…', s: false }; }
      else if (toks.length > 1) { toks.pop(); toks[toks.length - 1] = { w: toks[toks.length - 1].w.replace(/…$/, '') + '…', s: true }; }
      else break;
      L = domLayout(toks, fs, maxW);
    }
    var dy = top + Math.max(0, (avail - L.height) / 2);
    L.lines.forEach(function (line) {
      var run = null;
      function flush() {
        if (!run) return;
        ctx.fillStyle = C.mark; ctx.fillRect(x0 + P + run.l - 8, dy + run.base - fs * 1.02, run.r - run.l + 16, fs * 1.45);
        ctx.fillStyle = C.accent; ctx.fillRect(x0 + P + run.l - 8, dy + run.base + fs * 0.4, run.r - run.l + 16, 3);
        run = null;
      }
      line.slice().sort(function (a, b) { return a.l - b.l; }).forEach(function (sp) {
        if (sp.s) { if (!run) run = { l: sp.l, r: sp.r, base: sp.base }; else { run.r = Math.max(run.r, sp.r); run.l = Math.min(run.l, sp.l); } }
        else flush();
      });
      flush();
    });
    L.spans.forEach(function (sp) {
      ctx.font = (sp.s ? '700 ' : '400 ') + fs + 'px "Noto Naskh Arabic","Readex Pro",serif';
      ctx.fillStyle = sp.s ? C.ink : C.faded;
      if (sp.ltr) { ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.fillText(sp.w, x0 + P + sp.l, dy + sp.base, sp.r - sp.l + 2); }
      else { ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillText(sp.w, x0 + P + sp.r, dy + sp.base, sp.r - sp.l + 2); }
    });
  }

  var measurer = null;
  function domLayout(toks, fs, maxW) {
    if (!measurer) {
      measurer = document.createElement('div');
      measurer.setAttribute('aria-hidden', 'true');
      measurer.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;z-index:-1;direction:rtl;text-align:right;white-space:normal;overflow-wrap:break-word;word-break:normal;letter-spacing:0;word-spacing:0;font-kerning:normal;contain:layout paint';
      document.body.appendChild(measurer);
    }
    measurer.style.width = maxW + 'px';
    measurer.style.font = '400 ' + fs + 'px/' + Math.round(fs * 1.75) + 'px "Noto Naskh Arabic","Readex Pro",serif';
    measurer.textContent = '';
    // split every word into single-direction pieces (Arabic / Latin / digits / punctuation)
    function cls(ch) {
      if (/[A-Za-zÀ-ɏ]/.test(ch)) return 'L';
      if (/[0-9٠-٩۰-۹]/.test(ch)) return 'D';
      if (/[ء-يٖ-ٯٱ-ۓە-ۿݐ-ݿﭐ-﷿ﹰ-ﻼً-ٕـ]/.test(ch)) return 'A';
      return 'N';
    }
    var pieces = [];
    toks.forEach(function (tk, ti) {
      var cur = null;
      Array.from(tk.w).forEach(function (ch) {
        var c = cls(ch);
        if (cur && (cur.c === c || (c === 'A' && cur.c === 'A'))) cur.w += ch;
        else { cur = { w: ch, c: c, s: tk.s, ti: ti }; pieces.push(cur); }
      });
    });
    function eff(j) { // numbers take the direction of the last letter before them (bidi rule W7)
      if (pieces[j].c !== 'D') return pieces[j].c;
      for (var k = j - 1; k >= 0; k--) if (pieces[k].c === 'L' || pieces[k].c === 'A') return pieces[k].c === 'L' ? 'L' : 'R';
      return 'R';
    }
    pieces.forEach(function (pc, i) { // resolve neutrals like the bidi algorithm: L only when both sides are L
      if (pc.c !== 'N') { pc.dir = pc.c === 'A' ? 'rtl' : 'ltr'; return; }
      var pv = null, nx = null, j;
      for (j = i - 1; j >= 0; j--) if (pieces[j].c !== 'N') { pv = eff(j); break; }
      for (j = i + 1; j < pieces.length; j++) if (pieces[j].c !== 'N') { nx = eff(j); break; }
      pc.dir = pv === 'L' && nx === 'L' ? 'ltr' : 'rtl';
    });
    var els = [], marks = {};
    pieces.forEach(function (pc, i) {
      if (i && pieces[i - 1].ti !== pc.ti) measurer.appendChild(document.createTextNode(' '));
      var e = document.createElement('span');
      if (pc.s) e.style.fontWeight = '700';
      e.appendChild(document.createTextNode(pc.w));
      measurer.appendChild(e);
      els.push([e, pc]);
      var last = i === pieces.length - 1 || pieces[i + 1].ti !== pc.ti;
      if (last) {
        var mk = document.createElement('i');
        mk.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        e.appendChild(mk); marks[pc.ti] = mk;
      }
    });
    var box = measurer.getBoundingClientRect(), spans = [], byLine = {};
    var rng = document.createRange(), baseOf = {};
    Object.keys(marks).forEach(function (k) { baseOf[k] = marks[k].getBoundingClientRect().bottom - box.top; });
    els.forEach(function (x) {
      rng.selectNodeContents(x[0].firstChild);
      var rs = [].filter.call(rng.getClientRects(), function (q) { return q.width > 0; });
      if (!rs.length) return;
      var l = Math.min.apply(null, rs.map(function (q) { return q.left; })) - box.left;
      var r = Math.max.apply(null, rs.map(function (q) { return q.right; })) - box.left;
      var sp = { w: x[1].w, s: x[1].s, ltr: x[1].dir === 'ltr', l: l, r: r, base: baseOf[x[1].ti] };
      // a word split across lines: use the piece's own line
      if (Math.abs((rs[0].bottom - box.top) - sp.base) > fs * 1.2) sp.base = rs[0].bottom - box.top - fs * 0.45;
      spans.push(sp);
      var k = Math.round(sp.base); (byLine[k] = byLine[k] || []).push(sp);
    });
    var res = { height: box.height, spans: spans, lines: Object.keys(byLine).map(function (k) { return byLine[k]; }) };
    measurer.textContent = '';
    return res;
  }

  function render(s, img, fmt) {
    var F = FORMATS[fmt] || FORMATS.pt, W = F.W, H = F.H, m = meta();
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    if (fmt === 'ls') {
      var cw = 640;
      drawCover(ctx, img, { x: W - cw, y: 0, w: cw, h: H }, m, 0);
      drawPaper(ctx, s, { x: 0, y: 0, w: W - cw, h: H }, m, { pad: 72, safeBottom: 0, quoteMark: 140, maxFont: 56, minFont: 32, context: 16 });
      ctx.fillStyle = C.accent; ctx.fillRect(W - cw - 6, 0, 6, H);
    } else {
      var L = { sq: { ch: 420, safeTop: 0, safeBottom: 0, qm: 110, mf: 52, mn: 32, cx: 9 },
                pt: { ch: 560, safeTop: 0, safeBottom: 0, qm: 150, mf: 60, mn: 34, cx: 14 },
                st: { ch: 800, safeTop: 150, safeBottom: 200, qm: 160, mf: 66, mn: 38, cx: 20 } }[fmt] || {};
      drawCover(ctx, img, { x: 0, y: 0, w: W, h: L.ch }, m, L.safeTop);
      drawPaper(ctx, s, { x: 0, y: L.ch, w: W, h: H - L.ch }, m, { pad: 72, safeBottom: L.safeBottom, quoteMark: L.qm, maxFont: L.mf, minFont: L.mn, context: L.cx });
      ctx.fillStyle = C.accent; ctx.fillRect(0, L.ch, W, 6);
    }
    return cv;
  }

  /* ── assets ── */
  var coverP = null;
  function cover() {
    if (!coverP) coverP = new Promise(function (ok) {
      var el = document.querySelector('.cover-img');
      if (!el || !el.src) return ok(null);
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = el.currentSrc || el.src;
    });
    return coverP;
  }
  var fontsP = null;
  function fontsReady() {
    if (!fontsP) fontsP = (!document.fonts || !document.fonts.load) ? Promise.resolve() : Promise.all([
      '700 40px "Amiri"', '400 40px "Noto Naskh Arabic"', '700 40px "Noto Naskh Arabic"',
      '400 40px "Readex Pro"', '600 40px "Readex Pro"', '700 40px "Readex Pro"'
    ].map(function (f) { return Promise.all([document.fonts.load(f, 'جرعة'), document.fonts.load(f, 'Aa1#')]); })).catch(function () {});
    return Promise.race([fontsP, new Promise(function (ok) { setTimeout(ok, 4000); })]);
  }
  function assets() { return Promise.all([fontsReady(), cover()]).then(function (r) { return r[1]; }); }

  /* ── share modal ── */
  var modal = null, mState = null;
  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'sharemodal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="sm-back" data-close></div>' +
      '<div class="sm-box" role="dialog" aria-modal="true" aria-labelledby="sm-t">' +
        '<div class="sm-head"><h2 id="sm-t">شاركوها كصورة</h2><button type="button" class="sm-x" data-close aria-label="إغلاق">×</button></div>' +
        '<div class="sm-fmts" role="radiogroup" aria-label="مقاس الصورة">' +
          ORDER.map(function (k) { return '<button type="button" role="radio" data-fmt="' + k + '"><i class="sm-ico sm-i-' + k + '" aria-hidden="true"></i><span>' + FORMATS[k].label + '</span><small>' + FORMATS[k].hint + '</small></button>'; }).join('') +
        '</div>' +
        '<div class="sm-prev"><canvas aria-label="معاينة الصورة"></canvas></div>' +
        '<div class="sm-acts"><button type="button" class="sm-share pri">شاركوا</button><button type="button" class="sm-dl">حمّلوا الصورة</button><button type="button" class="sm-link">انسخوا الرابط</button></div>' +
        '<p class="sm-st" role="status" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) return closeModal();
      var f = e.target.closest('[data-fmt]');
      if (f) return setFmt(f.dataset.fmt);
      if (e.target.closest('.sm-share')) return doShare();
      if (e.target.closest('.sm-dl')) return download();
      if (e.target.closest('.sm-link')) return copyLink(mState.s, modal.querySelector('.sm-st'));
    });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      if (e.key === 'Tab') { // keep focus inside
        var f = [].slice.call(modal.querySelectorAll('button:not([hidden]):not(:disabled)'));
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.closest('[data-fmt]')) {
        var i2 = ORDER.indexOf(mState.fmt) + (e.key === 'ArrowLeft' ? 1 : -1); // RTL
        setFmt(ORDER[(i2 + ORDER.length) % ORDER.length]);
        modal.querySelector('[data-fmt="' + mState.fmt + '"]').focus();
      }
    });
  }
  function openModal(s) {
    if (!modal) buildModal();
    modalOpen = true;
    mState = { s: s, fmt: FORMATS[store('jur3a-share-fmt')] ? store('jur3a-share-fmt') : 'pt', cv: null, back: document.activeElement, seq: 0 };
    modal.querySelector('.sm-st').textContent = '';
    modal.hidden = false;
    document.documentElement.classList.add('sm-lock');
    bar.hidden = true;
    setFmt(mState.fmt);
    setTimeout(function () { var b = modal.querySelector('[data-fmt="' + mState.fmt + '"]'); if (b) b.focus(); }, 30);
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true; modalOpen = false;
    document.documentElement.classList.remove('sm-lock');
    if (mState && mState.back && mState.back.focus) try { mState.back.focus(); } catch (e) {}
  }
  function setFmt(fmt) {
    mState.fmt = fmt; store('jur3a-share-fmt', fmt);
    modal.querySelectorAll('[data-fmt]').forEach(function (b) { var on = b.dataset.fmt === fmt; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    var seq = ++mState.seq, prev = modal.querySelector('.sm-prev');
    prev.classList.add('busy');
    modal.querySelector('.sm-share').hidden = !canShareFiles();
    assets().then(function (img) {
      if (seq !== mState.seq) return;
      var cv = render(mState.s, img, fmt);
      mState.cv = cv;
      var view = prev.querySelector('canvas');
      view.width = cv.width; view.height = cv.height;
      view.getContext('2d').drawImage(cv, 0, 0);
      view.style.aspectRatio = cv.width + ' / ' + cv.height;
      prev.classList.remove('busy');
    }).catch(function () { prev.classList.remove('busy'); modal.querySelector('.sm-st').textContent = 'صار خطأ في تجهيز الصورة'; });
  }
  function canShareFiles() {
    try { return !!(navigator.canShare && window.File && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })); } catch (e) { return false; }
  }
  function blob() {
    return new Promise(function (ok, no) {
      if (!mState.cv) return no();
      mState.cv.toBlob(function (b) { b ? ok(b) : no(); }, 'image/png');
    });
  }
  function fileName() { return 'jur3a-' + (meta().num || 'quote') + '-' + mState.fmt + '.png'; }
  function doShare() {
    var st = modal.querySelector('.sm-st');
    blob().then(function (b) {
      var file = new File([b], fileName(), { type: 'image/png' });
      if (!navigator.canShare || !navigator.canShare({ files: [file] })) return download();
      return navigator.share({ files: [file], title: meta().title, text: fragmentUrl(mState.s) }).then(function () { st.textContent = ''; }, function (err) {
        if (err && err.name === 'AbortError') return; // the reader closed the share sheet
        download();
      });
    }, function () { st.textContent = 'صار خطأ في تجهيز الصورة'; });
  }
  function download() {
    var st = modal.querySelector('.sm-st');
    blob().then(function (b) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      st.textContent = 'انحفظت الصورة ✓';
    }, function () { st.textContent = 'صار خطأ في تجهيز الصورة'; });
  }

  // test hooks
  window.jur3aShare = {
    read: readSelection, url: fragmentUrl, tokens: tokens, formats: FORMATS,
    render: function (text, fmt) {
      var block = body;
      [].some.call(body.querySelectorAll(BLOCKS), function (b) { if (clean(textOf(b)).indexOf(clean(text)) >= 0) { block = b; return true; } });
      var full = clean(textOf(block)), st = full.indexOf(clean(text));
      return assets().then(function (img) { return render({ text: clean(text), full: st >= 0 ? full : clean(text), start: Math.max(0, st) }, img, fmt); });
    }
  };
})();
