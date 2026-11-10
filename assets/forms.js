/* جرعة — subscribe + suggestion boxes. Config lives in site.json; an empty value hides its box. */
(function () {
  var base = document.body.getAttribute('data-base') || '';
  function done(form, msg, ok) {
    var p = form.parentNode.querySelector('.join-msg');
    p.textContent = msg; p.className = 'join-msg ' + (ok ? 'ok' : 'err');
  }
  fetch(base + 'site.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (cfg) {
    var bd = (cfg.buttondown_username || '').trim();
    var fs = (cfg.suggest_formsubmit || '').trim();

    if (bd) {
      var sub = document.getElementById('subscribe');
      var f = sub.querySelector('form');
      f.action = 'https://buttondown.com/api/emails/embed-subscribe/' + encodeURIComponent(bd);
      sub.hidden = false;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = new URLSearchParams();
        d.append('email', f.email.value.trim());
        d.append('embed', '1');
        var picks = [].map.call(f.querySelectorAll('input[name="metadata__interests"]:checked'), function (x) { return x.value; });
        if (picks.length) d.append('metadata__interests', picks.join(','));
        var b = f.querySelector('button'); b.disabled = true;
        fetch(f.action, { method: 'POST', mode: 'no-cors', body: d }).then(function () {
          f.reset(); done(f, 'تم! راجع بريدك وأكّد الاشتراك، وأول جرعة توصلك الساعة 8 الصبح.', true);
        }).catch(function () {
          done(f, 'صار خطأ في الاتصال، جرّب مرة ثانية.', false);
        }).then(function () { b.disabled = false; });
      });
    }

    if (fs) {
      var sg = document.getElementById('suggest');
      var g = sg.querySelector('form');
      sg.hidden = false;
      g.addEventListener('submit', function (e) {
        e.preventDefault();
        if (g._honey.value) return;
        var b = g.querySelector('button'); b.disabled = true;
        fetch('https://formsubmit.co/ajax/' + encodeURIComponent(fs), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            _subject: 'جرعة — اقتراح موضوع: ' + g.topic.value.trim().slice(0, 60),
            _template: 'table', _captcha: 'false',
            'الموضوع': g.topic.value.trim(), 'السبب': g.why.value.trim(),
            email: g.email.value.trim() || '—', 'الصفحة': location.pathname
          })
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (String(j.success) !== 'true') throw 0;
          g.reset(); done(g, 'وصلنا اقتراحكم، شكراً لكم 🌱', true);
        }).catch(function () {
          done(g, 'ما قدرنا نرسل الاقتراح الحين، جربوا بعد شوي.', false);
        }).then(function () { b.disabled = false; });
      });
    }
  }).catch(function () {});
})();
