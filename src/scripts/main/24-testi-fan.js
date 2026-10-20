/* ═══════════════════════════════════════
   REVIEW FAN STACK (draft 2026-10-20)
   Shows the eleven reviews as a fanned deck: one card in front, the
   neighbours tilted behind it. Built from copies of the rail's real cards
   before the rail script clones them; the rail stays in the DOM (hidden)
   so its project buttons keep their modal listeners; the copies keep the
   button class for styling and simply click the matching original.
═══════════════════════════════════════ */
(function () {
  var stack = document.getElementById('fanStack');
  var rail = document.getElementById('testiRail');
  if (!stack || !rail || !document.documentElement.classList.contains('dk')) return;
  var src = [].slice.call(rail.querySelectorAll('.tq'));
  if (!src.length) return;
  var box = document.getElementById('fanCards');
  var count = document.getElementById('fanCount');
  var n = src.length, cur = 0;

  var cards = src.map(function (fig, i) {
    var c = fig.cloneNode(true);
    c.classList.add('fan-card');
    c.removeAttribute('id');
    c.querySelectorAll('.btn-modal-open').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var orig = document.querySelector('.btn-modal-open[data-modal="' + b.dataset.modal + '"]');
        if (orig) orig.click();
      });
    });
    c.addEventListener('click', function () { if (i !== cur) go(i); });
    box.appendChild(c);
    return c;
  });

  function go(i) {
    cur = (i + n) % n;
    cards.forEach(function (c, k) {
      var d = k - cur;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      var a = Math.abs(d);
      c.style.setProperty('--d', d);
      c.style.zIndex = 20 - a;
      c.classList.toggle('is-front', d === 0);
      c.classList.toggle('is-far', a > 2);
      c.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      c.inert = d !== 0;
    });
    count.textContent = (cur + 1) + ' / ' + n;
  }

  document.getElementById('fanPrev').addEventListener('click', function () { go(cur - 1); });
  document.getElementById('fanNext').addEventListener('click', function () { go(cur + 1); });
  stack.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
  });

  rail.closest('.testi-shell').hidden = true;
  stack.hidden = false;
  go(0);
})();
