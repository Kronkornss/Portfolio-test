/* Interests carousels: infinite loop, active card centered, auto-advance that pauses on hover */
(function () {
  const AUTO_MS = 3800;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('#interests .pgrid').forEach(function (car) {
    const cards = Array.from(car.querySelectorAll('.pcard'));
    const n = cards.length;
    if (n < 3) return;
    const half = Math.floor(n / 2);
    let active = Math.floor(n / 2);          // start on the middle card
    let timer = null, hovering = false, dragging = false, inView = true, moved = false;

    car.classList.add('is-car');
    car.tabIndex = 0;
    car.setAttribute('role', 'region');
    car.setAttribute('aria-roledescription', 'carousel');
    const title = car.closest('.pgroup') && car.closest('.pgroup').querySelector('.pgroup__title');
    if (title) car.setAttribute('aria-label', title.childNodes[1] ? title.textContent.replace(/\d+$/, '').trim() : 'Interests');

    function render() {
      cards.forEach(function (c, i) {
        let o = ((i - active + n + half) % n) - half;     // -half .. +half
        const visible = Math.abs(o) <= 1;
        c.style.setProperty('--o', o);
        c.dataset.pos = visible ? String(o) : 'hide';
        c.setAttribute('aria-hidden', visible ? 'false' : 'true');
        c.tabIndex = -1;
      });
    }
    function go(i) { active = ((i % n) + n) % n; render(); }
    const next = () => go(active + 1);
    const prev = () => go(active - 1);

    function stop() { clearInterval(timer); timer = null; }
    function start() {
      if (reduced.matches || timer || hovering || dragging || !inView || document.hidden) return;
      timer = setInterval(next, AUTO_MS);
    }
    function restart() { stop(); start(); }

    car.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') { hovering = true; stop(); } });
    car.addEventListener('pointerleave', function () { hovering = false; start(); });
    car.addEventListener('focusin', stop);
    car.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; inView ? start() : stop(); }, { threshold: .2 }).observe(car);

    /* click a dimmed side card to bring it to the middle */
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        if (moved) return;
        const p = c.dataset.pos;
        if (p === '1') next(); else if (p === '-1') prev();
        restart();
      });
    });

    /* drag / swipe */
    let x0 = 0;
    car.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      dragging = true; moved = false; x0 = e.clientX; stop();
    });
    car.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - x0) > 8) { moved = true; car.classList.add('drag'); }
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false; car.classList.remove('drag');
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
      setTimeout(function () { moved = false; }, 0);
      start();
    }
    car.addEventListener('pointerup', endDrag);
    car.addEventListener('pointercancel', endDrag);

    car.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { next(); restart(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { prev(); restart(); e.preventDefault(); }
    });

    render();
    start();
  });
})();