/* Portfolio — Luigi A. Lising. Sections: boot, themes, music, skills, scroll FX. The arcade lives in arcade.js. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('pf:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pf:' + k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Boot screen ---------- */
requestAnimationFrame(() => { $('#boot .bar i').style.width = '100%'; });
const endBoot = () => { $('#boot').classList.add('done'); document.body.classList.remove('loading'); };
addEventListener('load', () => setTimeout(endBoot, 600));
setTimeout(endBoot, 2000);

/* ---------- Themes ---------- */
function setTheme(t) {
  document.body.classList.remove('theme-light', 'theme-green');
  if (t !== 'dark') document.body.classList.add('theme-' + t);
  $$('.themes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.theme === t));
  store.set('theme', t);
}
$$('.themes button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
setTheme(store.get('theme', 'dark'));
const dock = $('.dock');
addEventListener('scroll', () => { dock.open = false; }, { passive: true });
document.addEventListener('pointerdown', e => { if (dock.open && !dock.contains(e.target)) dock.open = false; });

/* ---------- Music (edit MUSIC to add songs) ---------- */
(() => {
  const MUSIC = [
    { title: 'Glass Shards', src: 'music/song1.mp3' },
    { title: 'Nope youre already too late', src: 'music/song2.mp3' },
    { title: 'Disillusioned', src: 'music/song3.mp3' }
  ];
  const audio = $('#audio'), icon = $('#play i'), name = $('#track');
  let i = 0, on = false;
  audio.volume = 0.35;
  const paint = () => { icon.className = 'fa-solid ' + (on ? 'fa-pause' : 'fa-play'); $('#play').setAttribute('aria-label', on ? 'Pause' : 'Play'); };
  const load = (n, go) => {
    i = (n + MUSIC.length) % MUSIC.length;
    audio.src = MUSIC[i].src; name.textContent = MUSIC[i].title;
    if (go) play();
  };
  const play = () => audio.play().then(() => { on = true; paint(); }).catch(() => { on = false; paint(); });
  $('#play').onclick = () => { if (on) { audio.pause(); on = false; paint(); } else play(); };
  $('#prev').onclick = () => load(i - 1, on);
  $('#next').onclick = () => load(i + 1, on);
  audio.onended = () => load(i + 1, true);
  audio.onerror = () => { name.textContent = MUSIC[i].title + ' (file not found)'; on = false; paint(); };
  // used by arcade.js: pause() returns true if music was playing; resume() starts it again
  window.pfMusic = { pause() { const was = on; if (on) { audio.pause(); on = false; paint(); } return was; }, resume() { play(); } };
  load(0, false);
})();

/* ---------- Skills (rendered from data) ---------- */
(() => {
  const esc = s => s.replace(/&/g, '&amp;');
  // card: [title, count unit, chips, footer left, footer right, wide?]   chip: [icon, label, brand?, icon colour]
  const S = [
    ['Frontend & Web', 'techs', [['html5', 'HTML', 1, '#e44d26'], ['css3-alt', 'CSS', 1, '#3d7bf7'], ['js', 'JavaScript', 1, '#f7df1e'], ['bootstrap', 'Bootstrap', 1, '#8a63d2'], ['wordpress', 'WordPress', 1, '#3b9ad9']], 'Modern Responsive UI', 'Active'],
    ['Programming', 'techs', [['c', 'C', 0, '#5c8dff'], ['code', 'C++', 0, '#22d3ee'], ['java', 'Java', 1, '#e8833a']], 'Core Logic & Algorithms', 'OOP / DSA'],
    ['Game Dev & 3D', 'techs', [['cubes', 'Roblox Studio', 0, '#f4f1ee'], ['cube', 'Blender', 0, '#f5792a']], 'Spatial & Modeling', '3D Assets'],
    ['Creative / Design', 'skills', [['pen-ruler', 'UI Design', 0, '#ec4899'], ['wand-magic-sparkles', 'Animation', 0, '#2dd4bf'], ['image', 'Image Editing', 0, '#fbbf24'], ['figma', 'Figma', 1, '#a78bfa']], 'Visual Systems', 'Prototyping'],
    ['AI Tools', 'platforms', [['asterisk', 'Claude', 0, '#d97757'], ['openai', 'ChatGPT', 1, '#10a37f'], ['google', 'Gemini', 1, '#4285f4']], 'Augmented Engineering', 'LLM Prompting'],
    ['Tools', 'envs', [['laptop-code', 'VS Code', 0, '#3b9cff'], ['github', 'Git / GitHub', 1, '#f4f1ee']], 'DevOps & Workflow', 'Version Control'],
    ['Currently Exploring', 'Learning path', [['php', 'PHP', 1, '#8892bf'], ['database', 'SQL', 0, '#38bdf8'], ['server', 'Backend', 0, '#60a5fa'], ['plug', 'APIs', 0, '#fbbf24']], 'Expanding full-stack architecture & data persistency', 'In Progress \u2192', true]
  ];
  $('#skill-grid').innerHTML = S.map(([t, unit, chips, fl, fr, wide]) =>
    '<article class="cat' + (wide ? ' wide' : '') + '"><div class="cat-head"><h3>' + esc(t) + '</h3>' +
    (wide ? '<span class="cat-n tag">' + unit + '</span>' : '<span class="cat-n">' + chips.length + ' ' + unit + '</span>') + '</div>' +
    '<div class="chips">' + chips.map(([ic, n, b, c]) => '<span><i class="fa-' + (b ? 'brands' : 'solid') + ' fa-' + ic + '" style="color:' + c + '"></i>' + esc(n) + '</span>').join('') + '</div>' +
    '<div class="cat-foot"><span>' + esc(fl) + '</span><b>' + esc(fr) + '</b></div></article>').join('');
  $('#domain-count').textContent = String(S.length).padStart(2, '0');   // "07" = number of cards above
})();

/* ---------- Scroll FX: progress bar, rail, hero spotlight, particles ---------- */
(() => {
  const bar = $('#progress');
  addEventListener('scroll', () => {
    bar.style.width = (scrollY / (document.documentElement.scrollHeight - innerHeight) * 100) + '%';
  }, { passive: true });
  const links = $$('.rail a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.dataset.t === e.target.id));
  }), { rootMargin: '-50% 0px -50% 0px' });
  $$('.sec').forEach(s => io.observe(s));
  const hero = $('.hero-text');
  addEventListener('pointermove', e => { hero.style.setProperty('--mx', e.clientX + 'px'); hero.style.setProperty('--my', e.clientY + 'px'); });

  const cv = $('#fx');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = cv.getContext('2d');
  let w, h, ps;
  const init = () => {
    w = cv.width = innerWidth; h = cv.height = innerHeight;
    ps = Array.from({ length: Math.min(46, w * h / 34000 | 0) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + .4, v: Math.random() * .12 + .03, o: Math.random() * .5 + .2 }));
  };
  init(); addEventListener('resize', init);
  (function tick() {
    c.clearRect(0, 0, w, h);
    const rgb = getComputedStyle(document.body).getPropertyValue('--tint').trim() || '255,255,255';
    ps.forEach(p => {
      p.y -= p.v; if (p.y < -5) p.y = h + 5;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.3);
      c.fillStyle = 'rgba(' + rgb + ',' + p.o * .35 + ')'; c.fill();
    });
    requestAnimationFrame(tick);
  })();
})();

/* ---------- Gravity particles behind About, Skills and Interests ---------- */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ptr = { x: 0, y: 0, on: false };
  addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = e.pointerType !== 'touch' || e.buttons > 0 || true; }, { passive: true });
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') ptr.on = false; });
  document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; });
  const all = [];

  function gravity(sec) {
    const cv = document.createElement('canvas');
    cv.className = 'grav'; cv.setAttribute('aria-hidden', 'true'); sec.prepend(cv);
    const ctx = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
    const g = { vis: false }, ps = [], lm = { x: -1000, y: -1000 };
    let w = 0, h = 0;

    function init() {
      w = sec.clientWidth; h = sec.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ps.length = 0;
      const maxD = Math.max(w, h) * .7, n = Math.min(2200, w * h / 600 | 0);
      const bands = [[60, 80, .1], [100, 130, .15], [140, 180, .25], [200, 215, .05], [230, 280, .25], [310, 380, .15], [410, maxD, .05]];
      for (let i = 0; i < n; i++) {
        let r = Math.random(), c = 0, b = bands[2];
        for (const x of bands) { c += x[2]; if (r <= c) { b = x; break; } }
        const rad = b[0] + Math.random() * (b[1] - b[0]), a = Math.random() * 6.2832, q = Math.random();
        ps.push({ x: w / 2 + Math.cos(a) * rad, y: h / 2 + Math.sin(a) * rad, vx: 0, vy: 0, rad, a,
          sp: (.001 + 3.5 / rad) * (.85 + Math.random() * .3) * (Math.random() > .04 ? 1 : -1),
          s: Math.random() > .85 ? (Math.random() > .95 ? 2 : 1.2) : .6 + Math.random() * .4,
          col: q < .45 ? 'rgba(148,163,184,.65)' : q < .75 ? 'rgba(71,85,105,.4)' : q < .92 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.95)' });
      }
      if (reduced) g.draw();
    }

    g.draw = () => {
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
      sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(.5, 'rgba(3,3,4,.85)'); sg.addColorStop(1, 'rgba(5,5,5,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, 140, 0, 6.2832); ctx.fill();

      const r = cv.getBoundingClientRect(), mx = ptr.x - r.left, my = ptr.y - r.top;
      if (ptr.on && mx >= 0 && my >= 0 && mx <= w && my <= h) {
        if (lm.x === -1000) { lm.x = mx; lm.y = my; } else { lm.x += (mx - lm.x) * .12; lm.y += (my - lm.y) * .12; }
      } else { lm.x = lm.y = -1000; }

      for (const p of ps) {
        if (!reduced) p.a += p.sp;
        const tx = cx + Math.cos(p.a) * p.rad, ty = cy + Math.sin(p.a) * p.rad;
        if (lm.x !== -1000) {
          const dx = lm.x - p.x, dy = lm.y - p.y, d = Math.hypot(dx, dy);
          if (d < 300 && d > 1) { const f = (300 - d) / 300, pw = f * f * 1.6; p.vx += dx / d * pw; p.vy += dy / d * pw; }
        }
        p.vx = (p.vx + (tx - p.x) * .025) * .93; p.vy = (p.vy + (ty - p.y) * .025) * .93;
        const v = Math.hypot(p.vx, p.vy); if (v > 14) { p.vx *= 14 / v; p.vy *= 14 / v; }
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.s, p.s);
      }
      if (lm.x !== -1000) {
        const mg = ctx.createRadialGradient(lm.x, lm.y, 0, lm.x, lm.y, 160);
        mg.addColorStop(0, 'rgba(255,255,255,.05)'); mg.addColorStop(.5, 'rgba(200,210,230,.01)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(lm.x, lm.y, 160, 0, 6.2832); ctx.fill();
      }
    };

    new IntersectionObserver(([e]) => { g.vis = e.isIntersecting; }, { rootMargin: '100px' }).observe(sec);
    new ResizeObserver(init).observe(sec);
    init(); all.push(g);
  }

  ['about', 'skills', 'interests'].forEach(id => gravity(document.getElementById(id)));
  if (!reduced) (function loop() { requestAnimationFrame(loop); all.forEach(g => g.vis && g.draw()); })();
})();

/* ---------- Katana navbar: scroll-driven. The katana descends as you scroll, cutting each label as its tip
   passes (glint + sparks + a glowing cut line left behind it); at the end of the page the blade slides into the sheath,
   and scrolling back up draws it again. ---------- */
(() => {
  const KATANA_SRC = 'images/Katana_1.png', SHEATH_SRC = 'images/Sheath_1.png';

  /* ---- Tuning knobs ---- */
  const GAP     = 100;   // px between nav labels, constant (auto-shrinks on short screens so the last label never hits the sheath/hilt)
  const DRAW_MS = 420;   // how long the quick "draw" takes when you scroll up from the sheathed state
  const REST    = 1;     // gap (px) between the guard and the top of the label text when the katana is planted on it
  const TILT    = -4;    // final lean of the hilt when sheathed (deg, negative = leans left, like the sheath)
  const GHOSTS  = 5;     // afterimages that trail behind the katana while it moves
  const KX      = 26;    // px from the left edge of the screen to the centre line of the katana + sheath
  const PEEK_MS = 2600;  // after the intro the nav slides open briefly so visitors discover it
  const KANJI   = { home: '家', about: '己', skills: '技', interests: '趣', arcade: '遊' };   // faint watermark behind each label

  /* ---- Image geometry (pixels inside the PNGs) ---- */
  const KN = { w: 65, h: 591 }, SN = { w: 79, h: 558 };
  const PIV = { x: 34.5, y: 214 };   // katana: centre of the guard (tsuba). Everything is positioned by this point.
  const GUARD_BOTTOM = 2;            // katana: guard's lower edge, below PIV
  const MOUTH = { x: 43, y: 3 };     // sheath: centre of the opening

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rail = $('.rail'), links = $$('.rail a'), secs = links.map(a => document.getElementById(a.dataset.t));
  const N = links.length - 1;        // index of the last label (the sheath phase starts there)

  links.forEach(a => {   // original label stays the source: base text + two clipped halves
    const t = a.textContent.trim(); a.setAttribute('aria-label', t); a.dataset.k = KANJI[a.dataset.t] || '';
    a.innerHTML = '<span class="lbl"><span class="base">' + t + '</span><span class="p up" aria-hidden="true">' + t + '</span><span class="p lo" aria-hidden="true">' + t + '</span></span>';
  });
  const mk = (src, id, parent) => { const i = new Image(); i.src = src; if (id) i.id = id; i.alt = ''; i.draggable = false; i.setAttribute('aria-hidden', 'true'); parent.appendChild(i); return i; };
  // The katana lives in a clip box that ends at the sheath's mouth: anything below that line is "inside the sheath" and hidden,
  // so a curved blade can never poke out of the side no matter how it is tilted.
  const clip = document.createElement('div'); clip.id = 'katclip'; document.body.appendChild(clip);
  const plaque = document.createElement('div'); plaque.id = 'plaque'; document.body.appendChild(plaque);   // full-height lacquer banner behind the nav + sheath
  const trail = document.createElement('div'); trail.id = 'trail'; document.body.appendChild(trail);   // glowing line along the path already cut
  const sheath = mk(SHEATH_SRC, 'sheath', document.body);
  const ghosts = Array.from({ length: GHOSTS }, () => { const g = mk(KATANA_SRC, '', clip); g.className = 'ghost'; return g; });
  const kat = mk(KATANA_SRC, 'katana', clip);   // added last so it paints on top of its afterimages
  sheath.onerror = () => sheath.remove();
  links.forEach((a, i) => a.style.setProperty('--i', i));

  /* ---- Hover reveal: the plaque + labels stay hidden; only the katana and sheath show on the far-left strip ---- */
  const spine = document.createElement('div'); spine.id = 'spine'; spine.setAttribute('aria-hidden', 'true'); document.body.appendChild(spine);
  const bodyEl = document.body; let closeT = 0;
  const setOpen = on => { clearTimeout(closeT); bodyEl.classList.toggle('nav-open', on); oGoal = on ? 1 : 0; if (introDone) slide(); };   // open: katana + sheath glide to the middle of the plaque; closed: back to the far-left strip
  const overNav = () => [spine, plaque, rail].some(el => el.matches(':hover'));
  const closeSoon = (ms = 260) => { clearTimeout(closeT); closeT = setTimeout(() => { if (!overNav()) setOpen(false); }, ms); };   // never closes while the cursor is still on it
  [spine, plaque, rail].forEach(el => {
    el.addEventListener('pointerenter', () => setOpen(true));
    el.addEventListener('pointermove', e => { if (e.pointerType !== 'touch' && !bodyEl.classList.contains('nav-open')) setOpen(true); });   // cursor was already resting here when it closed
    el.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') closeSoon(); });   // touch "leaves" on lift-off, so it closes by tapping elsewhere instead
  });
  rail.addEventListener('focusin', () => setOpen(true));                                         // keyboard users
  rail.addEventListener('focusout', e => { if (!rail.contains(e.relatedTarget)) closeSoon(); });
  addEventListener('pointerdown', e => { if (!e.target.closest('#spine,#plaque,.rail')) setOpen(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  links.forEach(a => a.addEventListener('click', () => { if (matchMedia('(hover: none)').matches) closeSoon(400); }));
  const peek = () => { if (reduced) return; setOpen(true); closeSoon(PEEK_MS); };

  let max = 1, A = [], cx = 0, Y0 = 0, h = 27, cOff = 14, cTop = 6, sc = .2, tipD = 80, mouthX = 0, mouthY = 0, gap = 70;
  let o = 0, oGoal = 0, sliding = false;   // o: 0 = katana + sheath parked on the far-left strip, 1 = centred in the open plaque
  let m = 0, goal = 0, looping = false, started = false, introDone = false, seated = false, held = false, draw = null;
  const cutOn = links.map(() => false), hist = [];

  /* ---- Effects ---- */
  function shine() { kat.classList.remove('shine'); void kat.offsetWidth; kat.classList.add('shine'); }
  function burst(x, y, s = 1, n = 6) {   // gold glint with a diagonal streak, plus a few sparks
    if (reduced) return;
    const el = document.createElement('div'); el.className = 'glint'; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--s', s);
    el.addEventListener('animationend', () => el.remove()); document.body.appendChild(el);
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('i'); sp.className = 'spark'; sp.style.left = x + 'px'; sp.style.top = y + 'px'; document.body.appendChild(sp);
      const dx = (i % 2 ? 1 : -1) * (10 + Math.random() * 34) * s, dy = (Math.random() - .35) * 38 * s;
      sp.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.15)', opacity: 0 }],
        { duration: 380 + Math.random() * 320, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => sp.remove();
    }
  }
  function track(px, py, t) {   // afterimages: older poses, visible only in proportion to how far the katana has moved since
    hist.push({ x: px, y: py, t }); if (hist.length > GHOSTS * 2 + 4) hist.shift();
    ghosts.forEach((g, j) => {
      const p = hist[hist.length - 1 - (j + 1) * 2];
      if (!p) { g.style.opacity = 0; return; }
      g.style.transform = p.t; g.style.opacity = Math.min(1, Math.hypot(p.x - px, p.y - py) / 14) * .34 * (1 - j / GHOSTS);
    });
  }
  function settle() { hist.length = 0; ghosts.forEach(g => { g.style.opacity = 0; }); }

  function pose(px, py, deg) {   // put the guard centre at screen (px,py), tilted by deg around it
    const t = 'translate(' + (px - PIV.x * sc) + 'px,' + (py - PIV.y * sc) + 'px) rotate(' + deg + 'deg)';
    kat.style.transform = t; track(px, py, t);
  }

  function measure() {   // layout + scroll anchors; re-run on resize / content size change
    const vw = document.documentElement.clientWidth, vh = innerHeight;   // clientWidth excludes the scrollbar, like position:fixed does
    const rr = rail.getBoundingClientRect();
    cx = rr.left + rr.width / 2; Y0 = rr.top; h = links[0].offsetHeight;
    const ar = links[0].getBoundingClientRect(), lr = links[0].firstChild.getBoundingClientRect();
    cTop = lr.top - ar.top; cOff = cTop + lr.height / 2;                  // top and centre of the label text inside its link box
    sc = kat.offsetHeight / KN.h; tipD = (KN.h - PIV.y) * sc;
    const org = PIV.x * sc + 'px ' + PIV.y * sc + 'px'; kat.style.transformOrigin = org; ghosts.forEach(g => { g.style.transformOrigin = org; });
    const ssc = sheath.offsetHeight / SN.h;
    sheath.style.left = (KX - sheath.offsetWidth / 2) + 'px';              // sheath parked on the far-left katana strip (it slides right when the nav opens)
    const sr = { left: KX - sheath.offsetWidth / 2, top: vh - 14 - sheath.offsetHeight };   // laid out, not measured: unaffected by the slide transform
    mouthX = sr.left + MOUTH.x * ssc; mouthY = sr.top + MOUTH.y * ssc;
    clip.style.height = Math.max(0, mouthY) + 'px';
    // largest gap that still keeps the last label clear of the hilt that stands out of the sheath
    const hilt = PIV.y * sc;
    const room = (sr.top - hilt - 16 - h - Y0) / N - h;
    gap = Math.max(6, Math.min(GAP, room)); rail.style.gap = gap + 'px';
    max = document.documentElement.scrollHeight - vh;
    // Label i is reached when section i is aligned with the top of the screen, which is exactly where a nav click scrolls to.
    A = secs.map(s => Math.max(0, s.getBoundingClientRect().top + scrollY));
    // The last section only plants the katana if there is scroll left after it for the sheathing; otherwise start earlier.
    if (max - A[N] < vh * .3) A[N] = Math.max(A[N - 1] + 1, A[N] - vh * .5);
    aim();
  }
  // scroll position -> m: 0..N = katana at label m, N..N+1 = sliding into the sheath
  function aim() {
    const y = scrollY; let v = N;
    for (let i = 0; i < N; i++) if (y < A[i + 1]) { v = i + Math.max(0, (y - A[i]) / Math.max(1, A[i + 1] - A[i])); break; }
    if (v >= N) v = N + (max - A[N] > 1 ? Math.min(1, Math.max(0, (y - A[N]) / (max - A[N]))) : (y >= A[N] ? 1 : 0));
    if (seated && v < N + .98 && !reduced) startDraw();              // leaving the end of the page: draw the blade
    if (held) { if (v >= N + .98 || v < N) held = false; else v = N; }   // stay drawn until you reach the very bottom again
    goal = v; if (started && !looping) { looping = true; requestAnimationFrame(frame); }
  }
  function startDraw() {
    seated = false; held = true; draw = { t0: performance.now(), from: m };
    shine(); burst(mouthX, mouthY, 1.2, 8);
  }
  function render() {
    const k = Math.min(m, N), sf = Math.max(m - N, 0), e = sf * sf * (3 - 2 * sf), g = gap;
    const dx = (cx - KX) * o, x0 = KX + dx + 5 * sc;                  // far-left strip when closed, through the middle of the label text when open
    sheath.style.transform = 'translateX(' + dx + 'px)';
    const y0 = Y0 + k * (h + g) + cTop - REST - GUARD_BOTTOM * sc;    // guard resting on top of label k, blade running down through it
    const x1 = mouthX + dx, y1 = mouthY - GUARD_BOTTOM * sc;               // sheathed: guard rests on the mouth
    const px = x0 + (x1 - x0) * e, py = y0 + (y1 - y0) * e;
    pose(px, py, TILT * e);
    const tipY = py + tipD;
    const top = Y0 + cOff - 8, hh = Math.min(tipY, mouthY) - top;     // glowing line from the first label down to the tip
    trail.style.left = (KX + dx) + 'px'; trail.style.top = top + 'px'; trail.style.height = Math.max(0, hh) + 'px';
    trail.style.opacity = introDone && hh > 6 ? (1 - e) : 0;
    if (!introDone) return;
    links.forEach((a, i) => {                                         // text splits the moment the tip crosses its centre
      const ly = Y0 + i * (h + g) + cOff, c = tipY >= ly;
      if (c === cutOn[i]) return;
      cutOn[i] = c; a.classList.toggle('cut', c);
      if (c) {
        if (o > .5) burst(cx, ly, 1, 7);      // nav open: glint on the label as it splits
        else burst(x0, ly, .8, 5);            // nav closed: just sparks at the tip on the far-left strip
        shine();
      }
    });
  }
  function slide() { if (!sliding) { sliding = true; requestAnimationFrame(step); } }
  function step() {   // ease the katana + sheath between the far-left strip and the middle of the plaque
    o += (oGoal - o) * (reduced ? 1 : .15); if (Math.abs(oGoal - o) < .003) o = oGoal;
    render();
    if (o !== oGoal) requestAnimationFrame(step); else { sliding = false; if (!looping) settle(); }
  }
  function frame(now) {
    if (draw) {                                                       // time-based quick draw, ignores scroll speed
      const t = Math.min(1, (now - draw.t0) / DRAW_MS), e = 1 - Math.pow(1 - t, 3);
      m = draw.from + (N - draw.from) * e; if (t >= 1) draw = null;
      render(); requestAnimationFrame(frame); return;
    }
    m += (goal - m) * (reduced ? 1 : .2); if (Math.abs(goal - m) < .002) m = goal;
    seated = m >= N + .98;
    render(); if (m !== goal) requestAnimationFrame(frame); else { looping = false; settle(); }
  }
  links.forEach(a => a.addEventListener('click', shine));   // clicking a label makes the blade flash as it heads there
  addEventListener('scroll', aim, { passive: true });
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);

  Promise.all([kat.decode(), sheath.decode()]).catch(() => {}).then(() => {
    measure(); m = goal;
    pose(KX + 5 * sc, -(KN.h * sc) - 40, 0); settle();   // intro: katana drops in from above
    setTimeout(() => {
      started = true; kat.style.transition = reduced ? 'none' : 'transform 1s cubic-bezier(.2,.8,.2,1)';
      render(); setTimeout(() => { kat.style.transition = 'none'; introDone = true; peek(); render(); settle(); if (oGoal !== o) slide(); }, 1050);
    }, 1400);
  });
})();