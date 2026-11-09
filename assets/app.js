// جرعة — renders the archive (home) and prev/next + more issues (issue pages) from issues.json.
(function () {
  var body = document.body;
  var base = body.getAttribute('data-base') || '';
  var nf = new Intl.NumberFormat('en-US', { useGrouping: false });
  var df;
  try { df = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (e) { df = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function n(x) { return nf.format(x); }
  function d(s) { var p = s.split('-'); return df.format(new Date(+p[0], +p[1] - 1, +p[2])); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function href(i) { return base + 'issues/' + i.slug + '.html'; }
  function card(i) {
    return '<a class="card" href="' + href(i) + '"><span class="badge"' + (i.cover ? ' style="background-image:url(' + base + i.cover + ')"' : '') + '><span>' + n(i.number) + '</span></span><span class="txt">' +
      '<span class="m"><b>' + esc(i.topic) + '</b><span>' + d(i.date) + '</span><span>' + n(i.minutes) + ' دقائق</span></span>' +
      '<h3>' + esc(i.title) + '</h3><p>' + esc(i.subtitle) + '</p></span></a>';
  }

  fetch(base + 'issues.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (data) {
    var all = data.issues.slice().sort(function (a, b) { return b.number - a.number; });

    var list = document.getElementById('issue-list');
    if (list) {
      var filters = document.getElementById('filters');
      var topics = [];
      all.forEach(function (i) { if (topics.indexOf(i.topic) < 0) topics.push(i.topic); });
      var current = 'الكل';
      function draw() {
        var shown = all.filter(function (i) { return current === 'الكل' || i.topic === current; });
        list.innerHTML = shown.length ? shown.map(card).join('') : '<p class="empty">ما فيه أعداد في هذا الموضوع للحين.</p>';
        var c = document.getElementById('count'); if (c) c.textContent = n(all.length) + ' عدد';
      }
      if (filters) {
        filters.innerHTML = ['الكل'].concat(topics).map(function (t) {
          return '<button type="button" aria-pressed="' + (t === current) + '">' + esc(t) + '</button>';
        }).join('');
        filters.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          current = b.textContent;
          [].forEach.call(filters.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          draw();
        });
      }
      draw();
    }

    var cur = +body.getAttribute('data-issue');
    if (cur) {
      var asc = all.slice().reverse();
      var idx = asc.findIndex(function (i) { return i.number === cur; });
      var prev = asc[idx - 1], next = asc[idx + 1];
      var pager = document.getElementById('pager');
      if (pager) {
        pager.innerHTML =
          (prev ? '<a href="' + href(prev) + '"><small>→ العدد السابق</small>' + esc(prev.title) + '</a>' : '<span><small>→ العدد السابق</small>هذا أول عدد</span>') +
          (next ? '<a class="next" href="' + href(next) + '"><small>العدد التالي ←</small>' + esc(next.title) + '</a>' : '<span class="next"><small>العدد التالي ←</small>بكرة الساعة 8 الصبح</span>');
      }
      var more = document.getElementById('more');
      if (more) {
        var others = all.filter(function (i) { return i.number !== cur; }).slice(0, 4);
        more.innerHTML = others.length ? others.map(card).join('') : '<p class="empty">هذا أول عدد. الأعداد الجاية بتظهر هنا.</p>';
      }
    }
  }).catch(function () {
    var list = document.getElementById('issue-list');
    if (list) list.innerHTML = '<p class="empty">ما قدرت أحمّل قائمة الأعداد. حدّثي الصفحة.</p>';
  });
})();
