/* جرعة — select text in an issue → share it as an image, or copy a link that opens on that sentence. */
(function () {
  var body = document.querySelector('.body');
  if (!body) return;

  var C = { paper: '#F3F2EE', ink: '#111111', faded: '#BEBAB1', muted: '#6B6A66', accent: '#B3261E', mark: 'rgba(179,38,30,.16)', line: '#DEDBD3' };
  var ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  var BLOCKS = 'p,li,blockquote,h2,h3,h4,dd,dt,figcaption,td';

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
  var current = null; // {text, block, start, end}

  function clean(s) { return s.replace(/\s+/g, ' ').trim(); }

  function readSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    if (!body.contains(r.commonAncestorContainer)) return null;
    var text = clean(sel.toString());
    if (text.length < 3) return null;
    var node = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode;
    var block = node.closest(BLOCKS) || body;
    var pre = document.createRange();
    pre.selectNodeContents(block);
    pre.setEnd(r.startContainer, r.startOffset);
    var full = clean(block.textContent);
    var lead = pre.toString().replace(/\s+/g, ' ').replace(/^ /, '');
    var a = lead.length, z = a + text.length;
    if (full.substr(a, text.length) !== text) { var i = full.indexOf(text); if (i >= 0) { a = i; z = i + text.length; } }
    // snap to whole words so the link and the image never cut a word in half
    while (a > 0 && full[a - 1] !== ' ') a--;
    while (z < full.length && full[z] !== ' ') z++;
    text = full.slice(a, z).trim();
    return { text: text, block: block, full: full, start: a, rect: r.getBoundingClientRect() };
  }

  function place() {
    var prev = current && current.text;
    current = readSelection();
    if (!current) { bar.hidden = true; return; }
    if (current.text !== prev) status.textContent = '';
    bar.hidden = false;
    var r = current.rect, bw = bar.offsetWidth, bh = bar.offsetHeight;
    var touch = window.matchMedia('(pointer: coarse)').matches;
    var top = touch ? r.bottom + 14 : r.top - bh - 10;
    if (!touch && top < 70) top = r.bottom + 10;
    var left = r.left + r.width / 2 - bw / 2;
    left = Math.max(8, Math.min(left, document.documentElement.clientWidth - bw - 8));
    bar.style.top = (top + window.scrollY) + 'px';
    bar.style.left = (left + window.scrollX) + 'px';
  }

  var t;
  function later() { clearTimeout(t); t = setTimeout(place, 180); }
  document.addEventListener('selectionchange', later);
  document.addEventListener('mouseup', later);
  document.addEventListener('touchend', later);
  window.addEventListener('resize', function () { if (!bar.hidden) place(); });
  bar.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep the selection

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !current) return;
    var snap = current;
    if (b.dataset.act === 'link') copyLink(snap);
    else shareImage(snap, b);
  });

  /* ── link to the sentence (#:~:text=) ───── */
  function enc(s) { return encodeURIComponent(s).replace(/-/g, '%2D').replace(/,/g, '%2C').replace(/&/g, '%26'); }
  function fragmentUrl(text) {
    var w = text.split(' ');
    var frag = w.length <= 10 ? enc(text) : enc(w.slice(0, 4).join(' ')) + ',' + enc(w.slice(-4).join(' '));
    return location.origin + location.pathname + '#:~:text=' + frag;
  }
  function copyLink(s) {
    var url = fragmentUrl(s.text);
    var ok = function () { status.textContent = 'انتسخ ✓'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { fallbackCopy(url); ok(); });
    else { fallbackCopy(url); ok(); }
  }
  function fallbackCopy(v) {
    var ta = document.createElement('textarea');
    ta.value = v; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove();
  }

  /* ── image ──────────────────────────────── */
  function tokens(s) {
    // words of the block with a flag for the selected span; trims long context to nearby sentences
    var full = s.full, a = s.start, z = Math.min(full.length, a + s.text.length);
    if (full.substr(a, s.text.length) !== s.text) { // offsets drifted (rare): fall back to search
      var i = full.indexOf(s.text); if (i >= 0) { a = i; z = i + s.text.length; } else { full = s.text; a = 0; z = s.text.length; }
    }
    var before = full.slice(0, a).split(' ').filter(Boolean);
    var mid = full.slice(a, z).split(' ').filter(Boolean);
    var after = full.slice(z).split(' ').filter(Boolean);
    var MAXC = 14, cutB = false, cutA = false;
    if (before.length > MAXC) { before = before.slice(-MAXC); cutB = true; }
    for (var k = 0; k < before.length - 1; k++) if (/[.!؟?:]$/.test(before[k])) { before = before.slice(k + 1); cutB = false; k = -1; if (before.length < 4) break; }
    if (after.length > MAXC) { after = after.slice(0, MAXC); cutA = true; }
    for (var j = 0; j < after.length; j++) if (/[.!؟?]$/.test(after[j])) { after = after.slice(0, j + 1); cutA = false; break; }
    if (cutB) before.unshift('…');
    if (cutA) after.push('…');
    // glue a selection that starts/ends mid-word to its neighbour so the word isn't split
    var out = [];
    before.forEach(function (w) { out.push({ w: w, s: false }); });
    mid.forEach(function (w) { out.push({ w: w, s: true }); });
    after.forEach(function (w) { out.push({ w: w, s: false }); });
    return out;
  }

  function runs(words, ctx) {
    // merge consecutive LTR words (English terms, numbers) so they keep their order
    var out = [];
    words.forEach(function (t) {
      var ltr = !ARABIC.test(t.w);
      var last = out[out.length - 1];
      if (last && last.ltr && ltr && last.s === t.s) { last.w += ' ' + t.w; }
      else out.push({ w: t.w, s: t.s, ltr: ltr });
    });
    return out;
  }

  function layout(ctx, items, fs, maxW) {
    var lines = [[]], x = 0, sp;
    items.forEach(function (it) {
      ctx.font = (it.s ? '700 ' : '400 ') + fs + 'px "Noto Naskh Arabic","Readex Pro",serif';
      it.width = ctx.measureText(it.w).width;
      sp = fs * 0.28;
      if (x > 0 && x + sp + it.width > maxW) { lines.push([]); x = 0; }
      lines[lines.length - 1].push(it);
      x += (x > 0 ? sp : 0) + it.width;
    });
    return lines;
  }

  function wrapPlain(ctx, text, font, maxW, maxLines) {
    ctx.font = font;
    var w = text.split(' '), lines = [''];
    w.forEach(function (x) {
      var cur = lines[lines.length - 1], test = cur ? cur + ' ' + x : x;
      if (ctx.measureText(test).width > maxW && cur) lines.push(x); else lines[lines.length - 1] = test;
    });
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += '…'; }
    return lines;
  }

  function loadImg(src) {
    return new Promise(function (ok) {
      if (!src) return ok(null);
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src;
    });
  }

  function pill(ctx, x, y, w, h, stroke, fill) {
    var r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  // Same look as an issue page: the photo cover with its giant keyword, then the quote on paper.
  function render(s, cover) {
    var W = 1080, H = 1350, P = 72, CH = 560;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var CREAM = '#F4F1EA';
    var num = document.body.getAttribute('data-issue') || '';
    var chip = document.querySelector('.cover-bot .chip');
    var topic = chip ? clean(chip.textContent) : '';
    var kwEl = document.querySelector('.cover .keyword');
    var keyword = kwEl ? kwEl.textContent.trim() : 'جرعة';
    var h1 = document.querySelector('.head h1');
    var title = h1 ? clean(h1.textContent) : document.title;

    // ── cover ──
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, CH);
    if (cover) {
      var sc = Math.max(W / cover.naturalWidth, CH / cover.naturalHeight);
      var dw = cover.naturalWidth * sc, dh = cover.naturalHeight * sc;
      ctx.drawImage(cover, (W - dw) / 2, (CH - dh) / 2, dw, dh);
    }
    var g = ctx.createLinearGradient(0, 0, 0, CH);
    g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(.38, 'rgba(0,0,0,.25)'); g.addColorStop(.58, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, CH);

    // top row: «جرعة.  العدد 12» ............ topic
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = CREAM; ctx.font = '700 46px "Amiri",serif';
    ctx.fillText('جرعة', W - P, P + 34);
    var lw = ctx.measureText('جرعة').width;
    ctx.fillStyle = '#E5604F'; ctx.beginPath(); ctx.arc(W - P - lw - 9, P + 30, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(244,241,234,.8)'; ctx.font = '400 24px "Readex Pro",sans-serif';
    ctx.fillText('العدد ' + num, W - P - lw - 34, P + 30);
    var dEl = document.querySelector('.cover-top span:last-child');
    ctx.textAlign = 'left';
    ctx.fillText(dEl ? clean(dEl.textContent) : '', P, P + 30);
    ctx.fillStyle = 'rgba(244,241,234,.45)'; ctx.fillRect(P, P + 54, W - 2 * P, 1.5);

    // giant keyword (tatweel included), fitted to the width
    ctx.textAlign = 'right'; ctx.fillStyle = CREAM;
    var ks = 196;
    do { ctx.font = '700 ' + ks + 'px "Amiri",serif'; ks -= 6; } while (ctx.measureText(keyword).width > W - 2 * P && ks > 80);
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 3;
    var km = ctx.measureText(keyword), kA = km.actualBoundingBoxAscent || ks * .9, kD = km.actualBoundingBoxDescent || ks * .3;
    var zoneT = P + 54 + 24, zoneB = CH - P - 22 - 24;
    if (kA + kD > zoneB - zoneT) { ctx.font = '700 ' + Math.floor(ks * (zoneB - zoneT) / (kA + kD)) + 'px "Amiri",serif'; km = ctx.measureText(keyword); kA = km.actualBoundingBoxAscent; kD = km.actualBoundingBoxDescent; }
    ctx.fillText(keyword, W - P, zoneT + ((zoneB - zoneT) - (kA + kD)) / 2 + kA);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // bottom row: topic chip ........ #12
    ctx.font = '600 24px "Readex Pro",sans-serif';
    var cw = ctx.measureText(topic).width + 44;
    if (topic) {
      pill(ctx, P, CH - P - 22, cw, 48, 'rgba(244,241,234,.8)', 'rgba(0,0,0,.2)');
      ctx.fillStyle = CREAM; ctx.textAlign = 'center'; ctx.fillText(topic, P + cw / 2, CH - P + 10);
    }
    ctx.direction = 'ltr'; ctx.textAlign = 'right'; ctx.font = '600 44px "Readex Pro",sans-serif'; ctx.fillStyle = CREAM;
    ctx.fillText('#' + num, W - P, CH - P + 16);

    // ── paper ──
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, CH, W, H - CH);
    ctx.fillStyle = C.accent; ctx.fillRect(0, CH, W, 6);

    // red quote mark
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = C.accent;
    ctx.font = '700 150px "Amiri",serif';
    ctx.fillText('”', W - P + 6, CH + 150);

    // quote: the selected words in ink with a red marker, the rest of the paragraph faded around them
    var items = runs(tokens(s));
    var top = CH + 150, bottom = H - 190, maxW = W - 2 * P, fs = 60, lh, lines;
    for (; fs >= 28; fs -= 2) {
      lh = fs * 1.75;
      lines = layout(ctx, items, fs, maxW);
      if (lines.length * lh <= bottom - top) break;
    }
    if (lines.length * lh > bottom - top) { // still too long: keep the lines around the selection
      var max = Math.floor((bottom - top) / lh), first = 0;
      for (var q = 0; q < lines.length; q++) if (lines[q].some(function (it) { return it.s; })) { first = q; break; }
      first = Math.max(0, Math.min(first, lines.length - max));
      lines = lines.slice(first, first + max);
    }
    var y = top + ((bottom - top) - lines.length * lh) / 2 + fs * 1.1;
    lines.forEach(function (line) {
      var x = W - P, sp = fs * 0.28, spanR = null, spanL = null;
      function flush() {
        if (spanR === null) return;
        ctx.fillStyle = C.mark; ctx.fillRect(spanL, y - fs * 1.02, spanR - spanL, fs * 1.45);
        ctx.fillStyle = C.accent; ctx.fillRect(spanL, y + fs * 0.4, spanR - spanL, 3);
        spanR = spanL = null;
      }
      line.forEach(function (it) {
        if (it.s) { if (spanR === null) spanR = x + 8; spanL = x - it.width - 8; } else flush();
        x -= it.width + sp;
      });
      flush();
      x = W - P;
      line.forEach(function (it) {
        ctx.font = (it.s ? '700 ' : '400 ') + fs + 'px "Noto Naskh Arabic","Readex Pro",serif';
        ctx.fillStyle = it.s ? C.ink : C.faded; ctx.direction = it.ltr ? 'ltr' : 'rtl'; ctx.textAlign = 'right';
        ctx.fillText(it.w, x, y);
        x -= it.width + sp;
      });
      y += lh;
    });

    // footer: band like the section dividers
    var by = H - P - 64;
    pill(ctx, P, by, W - 2 * P, 64, '#E4E2DC', '#F3F2EE');
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = C.ink;
    var tl = wrapPlain(ctx, title, '600 25px "Readex Pro",sans-serif', W - 2 * P - 330, 1)[0];
    ctx.fillText(tl, W - P - 30, by + 41);
    ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.fillStyle = C.accent;
    ctx.font = '600 21px "Readex Pro",sans-serif';
    ctx.fillText(location.host.replace(/^www\./, '') || 'jur3a', P + 30, by + 40);
    return cv;
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var ar = 'جرعة عربي', la = 'Aa1';
    return Promise.all([
      document.fonts.load('700 40px "Amiri"', ar),
      document.fonts.load('400 40px "Noto Naskh Arabic"', ar), document.fonts.load('700 40px "Noto Naskh Arabic"', ar),
      document.fonts.load('400 40px "Readex Pro"', ar), document.fonts.load('400 40px "Readex Pro"', la),
      document.fonts.load('600 40px "Readex Pro"', ar), document.fonts.load('600 40px "Readex Pro"', la),
      document.fonts.load('700 40px "Readex Pro"', la)
    ]).catch(function () {});
  }

  function shareImage(s, btn) {
    btn.disabled = true; status.textContent = 'لحظة…';
    Promise.all([fontsReady(), loadImg((document.querySelector('.cover-img') || {}).src)]).then(function (res) {
      var cv = render(s, res[1]);
      cv.toBlob(function (blob) {
        btn.disabled = false;
        if (!blob) { status.textContent = 'ما زبطت'; return; }
        var name = 'jur3a-' + (document.body.getAttribute('data-issue') || 'quote') + '.png';
        var file = window.File ? new File([blob], name, { type: 'image/png' }) : null;
        var link = fragmentUrl(s.text);
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: document.title, text: link }).then(function () { status.textContent = ''; }, function () { status.textContent = ''; });
        } else {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = name;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          status.textContent = 'انحفظت الصورة ✓';
        }
      }, 'image/png');
    });
  }

  // expose for previews/tests
  window.jur3aShareRender = function (text) {
    var i = body.textContent.indexOf(text);
    var block = body;
    body.querySelectorAll(BLOCKS).forEach(function (b) { if (b.textContent.indexOf(text) >= 0 && block === body) block = b; });
    var full = clean(block.textContent);
    return Promise.all([fontsReady(), loadImg((document.querySelector('.cover-img') || {}).src)]).then(function (res) { return render({ text: clean(text), full: full, start: full.indexOf(clean(text)) }, res[1]); });
  };
})();
