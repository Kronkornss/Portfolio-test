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
const backgroundLoads = {};
function loadThemeBackground(name, src) {
  if (backgroundLoads[name]) return backgroundLoads[name];
  backgroundLoads[name] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      console.error('[portfolio] Could not load the ' + name + ' hero background.');
      reject(new Error('Could not load ' + src));
    };
    document.body.appendChild(script);
  });
  return backgroundLoads[name];
}

function setTheme(t) {
  if (t === 'green') t = 'red';
  if (!['dark', 'red', 'light'].includes(t)) t = 'dark';
  document.documentElement.dataset.theme = t;
  $$('.themes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.theme === t));
  const colors = { dark: '#0b0909', red: '#10090b', light: '#eee9dc' };
  $('#theme-color').setAttribute('content', colors[t]);
  store.set('theme', t);
  window.dispatchEvent(new CustomEvent('portfolio-theme-change', { detail: { theme: t } }));
  const backgrounds = {
    dark: ['dark', 'hero-bg.js'],
    red: ['red', 'red-hero.js'],
    light: ['pearl', 'pearl.js']
  };
  const [name, src] = backgrounds[t];
  loadThemeBackground(name, src).catch(() => {});
}
$$('.themes button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
setTheme(store.get('theme', 'dark'));

/* ---------- Music (edit MUSIC to add songs) ---------- */
(() => {
  const MUSIC = [
    { title: 'Glass Shards', src: 'music/song1.mp3' },
    { title: 'Nope youre already too late', src: 'music/song2.mp3' },
    { title: 'Disillusioned', src: 'music/song3.mp3' }
  ];
  const audio = $('#audio');
  const controls = {
    playerTrack: $('#player-track'),
    playerNumber: $('#player-track-number'),
    status: $('#player-status'),
    current: $('#player-current-time'),
    duration: $('#player-duration'),
    seek: $('#seek')
  };
  let i = 0, on = false;
  audio.volume = 0.35;
  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const n = Math.floor(seconds);
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  };
  const paint = () => {
    const icon = on ? 'fa-pause' : 'fa-play';
    const button = $('#player-play');
    button.querySelector('i').className = 'fa-solid ' + icon;
    button.setAttribute('aria-label', on ? 'Pause' : 'Play');
    $('.deck-start-label').textContent = on ? 'pause' : 'play';
    $('.retro-player').classList.toggle('is-playing', on);
    controls.status.textContent = on ? 'PLAYING' : 'READY';
  };
  const paintTrack = () => {
    controls.playerTrack.textContent = MUSIC[i].title;
    controls.playerNumber.textContent = String(i + 1).padStart(2, '0') + '/' + String(MUSIC.length).padStart(2, '0');
  };
  const paintProgress = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    controls.current.textContent = formatTime(audio.currentTime);
    controls.duration.textContent = formatTime(duration);
    controls.seek.value = duration ? String(Math.round(audio.currentTime / duration * 1000)) : '0';
    $('.retro-player').style.setProperty('--p', duration ? (audio.currentTime / duration).toFixed(4) : '0');
    $('#tape-counter').textContent = String(Math.min(999, Math.floor(audio.currentTime || 0))).padStart(3, '0');   // drives the tape spools + seek fill
  };
  const load = (n, go) => {
    i = (n + MUSIC.length) % MUSIC.length;
    audio.src = MUSIC[i].src;
    paintTrack();
    paintProgress();
    controls.status.textContent = go ? 'LOADING' : 'READY';
    if (go) play();
  };
  const play = () => audio.play().catch(() => {
    on = false;
    paint();
    controls.status.textContent = 'PLAYBACK BLOCKED';
  });
  const toggle = () => { if (audio.paused) play(); else audio.pause(); };
  const previous = () => load(i - 1, !audio.paused);
  const next = () => load(i + 1, !audio.paused);
  $('#player-play').addEventListener('click', toggle);
  $('#player-prev').addEventListener('click', previous);
  $('#player-next').addEventListener('click', next);
  controls.seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(controls.seek.value) / 1000 * audio.duration;
  });
  audio.addEventListener('play', () => { on = true; paint(); });
  audio.addEventListener('pause', () => { on = false; paint(); });
  audio.addEventListener('timeupdate', paintProgress);
  audio.addEventListener('loadedmetadata', paintProgress);
  audio.addEventListener('durationchange', paintProgress);
  audio.addEventListener('ended', () => load(i + 1, true));
  audio.addEventListener('error', () => {
    on = false;
    paint();
    controls.status.textContent = 'FILE UNAVAILABLE';
    controls.playerTrack.textContent = MUSIC[i].title + ' (file unavailable)';
  });
  // used by arcade.js: pause() returns true if music was playing; resume() starts it again
  window.pfMusic = {
    pause() { const was = !audio.paused; if (was) audio.pause(); return was; },
    resume() { play(); },
    toggle,
    previous,
    next
  };
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
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
      if (document.documentElement.dataset.theme === 'light') {   // light theme: soft silver with a hint of blue instead of black
        sg.addColorStop(0, 'rgba(226,232,242,.95)'); sg.addColorStop(.35, 'rgba(184,196,216,.85)');
        sg.addColorStop(.7, 'rgba(148,164,192,.4)'); sg.addColorStop(1, 'rgba(130,148,180,0)');
      } else {
        sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(.5, 'rgba(3,3,4,.85)'); sg.addColorStop(1, 'rgba(5,5,5,0)');
      }
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
  const SWORDS = {
    dark: {
      katana: 'images/Katana_1.png', sheath: 'images/Sheath_1.png',
      KN: { w: 65, h: 591 }, SN: { w: 79, h: 558 },
      PIV: { x: 34.5, y: 214 }, GUARD_BOTTOM: 2, MOUTH: { x: 43, y: 3 },
      FIT: { tilt: -4, cut: .04, bm: 24, sink: 0 }
    },
    red: {
      katana: 'images/katana-red.png', sheath: 'images/sheath-red-v2.png',
      KN: { w: 111, h: 748 }, SN: { w: 134, h: 495 },
      PIV: { x: 55, y: 209 }, GUARD_BOTTOM: 33, MOUTH: { x: 67, y: 0 },
      FIT: { tilt: 0, cut: 0, bm: 24, sink: 0, rs: 1, ref: 737 }
    },
    light: {
      katana: 'images/katana-light.png', sheath: 'images/sheath-light-v2.png',
      KN: { w: 237, h: 1484 }, SN: { w: 130, h: 482 },
      PIV: { x: 118, y: 395 }, GUARD_BOTTOM: 117, MOUTH: { x: 65, y: 0 },
      FIT: { tilt: 0, cut: 0, bm: 24, sink: 0, rs: 2, ref: 737 }
    }
  };
  /* FIT (per sword, tune by eye):
       tilt - final lean of the hilt when sheathed (deg). Match it to how much the sheath art itself leans.
       cut  - fraction of the sheath's length trimmed off the bottom (it fades out instead of ending abruptly).
       bm   - px of air kept between the sheath and the bottom of the screen.
       sink - how far (in sheath-image px) the guard seats down into the mouth, so the hilt meets the sheath with no gap.
       rs   - (red + light) the new sheath images are cut from your full sheathed art, so they are drawn at the katana's own scale
              times rs (red art = 1x the katana image, light art = 2x). That keeps sheath length in proportion to the hilt.
       ref  - height (in reference-art px) of the whole sheathed sword. The sword is scaled so its sheathed height equals the gold one's. */
  let swordTheme = document.documentElement.dataset.theme || 'dark';
  let { KN, SN, PIV, GUARD_BOTTOM, MOUTH, FIT } = SWORDS[swordTheme] || SWORDS.dark;

  /* ---- Tuning knobs ---- */
  const GAP     = 100;   // px between nav labels, constant (auto-shrinks on short screens so the last label never hits the sheath/hilt)
  const DRAW_MS = 420;   // how long the quick "draw" takes when you scroll up from the sheathed state
  const REST    = 1;     // gap (px) between the guard and the top of the label text when the katana is planted on it
  const TRAIL_HILT = .3;   // the cut-line ends this fraction of the way up the handle from the guard (0 = at the guard, 1 = top of the handle), so only the path above the sword shows
  const GHOSTS  = 5;     // afterimages that trail behind the katana while it moves
  const KX      = 26;    // px from the left edge of the screen to the centre line of the katana + sheath
  const PEEK_MS = 2600;  // after the intro the nav slides open briefly so visitors discover it
  const KANJI   = { home: '家', about: '己', skills: '技', interests: '趣', arcade: '遊' };   // faint watermark behind each label

  /* ---- Image geometry (pixels inside the PNGs) ---- */
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
  plaque.innerHTML = '<i class="pedge"></i>';   // themed edge ornament (blade teeth for red, ripple scallops for light)
  const trail = document.createElement('div'); trail.id = 'trail'; document.body.appendChild(trail);   // glowing line along the path already cut
  const initialSword = SWORDS[swordTheme] || SWORDS.dark;
  const sheath = mk(initialSword.sheath, 'sheath', document.body);
  const shProbe = document.createElement('div'); shProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;height:var(--sh)'; document.body.appendChild(shProbe);   // reads the resolved --sh in px
  const ghosts = Array.from({ length: GHOSTS }, () => { const g = mk(initialSword.katana, '', clip); g.className = 'ghost'; return g; });
  const kat = mk(initialSword.katana, 'katana', clip);   // added last so it paints on top of its afterimages
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

  let seat = 0, max = 1, A = [], cx = 0, Y0 = 0, h = 27, cOff = 14, cTop = 6, sc = .2, tipD = 80, mouthX = 0, mouthY = 0, gap = 70;
  let o = 0, oGoal = 0, sliding = false;   // o: 0 = katana + sheath parked on the far-left strip, 1 = centred in the open plaque
  let m = 0, goal = 0, looping = false, started = false, introDone = false, seated = false, held = false, draw = null;
  const cutOn = links.map(() => false), hist = [];

  /* ---- Effects: gold for dark, evil crimson for red, soft pearl for light ---- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const kindOf = () => swordTheme === 'red' ? 'red' : swordTheme === 'light' ? 'light' : 'gold';
  let curDx = 0, curPx = 0, curTipY = 0, lastEmit = 0;
  function fx(cls, x, y, vars) {
    const el = document.createElement('i'); el.className = cls; el.style.left = x + 'px'; el.style.top = y + 'px';
    if (vars) for (const k in vars) el.style.setProperty(k, vars[k]);
    document.body.appendChild(el); return el;
  }
  const fly = (el, frames, opts) => { el.animate(frames, opts).onfinish = () => el.remove(); };
  function shine() { kat.classList.remove('shine'); void kat.offsetWidth; kat.classList.add('shine'); }
  kat.addEventListener('animationend', e => { if (e.animationName.indexOf('shine') === 0) kat.classList.remove('shine'); });
  function pulse() { sheath.classList.remove('pulse'); void sheath.offsetWidth; sheath.classList.add('pulse'); }
  sheath.addEventListener('animationend', e => { if (e.animationName.indexOf('sheathpulse') === 0) sheath.classList.remove('pulse'); });

  function ring(x, y, kind, s = 1, delay = 0, inward = false) {   // red: hard shockwave. light: soft ripple, like the pearl hitting water
    const el = fx('fx-ring fx-ring--' + kind, x, y, { '--s': s });
    const f = inward
      ? [{ transform: 'scale(3.2)', opacity: 0 }, { transform: 'scale(2.1)', opacity: .9, offset: .3 }, { transform: 'scale(.35)', opacity: 0 }]
      : [{ transform: 'scale(.2)', opacity: 0 }, { opacity: .9, offset: .2 }, { transform: 'scale(3)', opacity: 0 }];
    fly(el, f, { duration: kind === 'light' ? 1500 : kind === 'gold' ? 850 : 650, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
  }
  function slash(x, y, kind, s = 1, rot) {
    if (kind === 'red') {   // a jagged crimson cut, then a second cross-cut a beat later
      [[rnd(-34, -18), 1, 0], [rnd(24, 40), .7, 70]].forEach(([rot, k, delay]) => {
        const el = fx('fx-slash fx-slash--red', x, y, { '--s': s * k }), t = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
        fly(el, [{ transform: t + ' scaleX(.1)', opacity: 0 }, { transform: t + ' scaleX(1)', opacity: 1, offset: .22 }, { transform: t + ' scaleX(1.25) scaleY(.2)', opacity: 0 }],
          { duration: 480, delay, easing: 'cubic-bezier(.1,.9,.2,1)', fill: 'backwards' });
      });
    } else if (kind === 'gold') {   // one clean, razor-straight cut with a lens flare, then a faint echo line
      const r = rot === undefined ? rnd(-30, -20) : rot;
      [[0, 1, 0], [7, .6, 70]].forEach(([off, k, delay]) => {
        const el = fx('fx-slash fx-slash--gold', x, y + off, { '--s': s * k }), t = 'translate(-50%,-50%) rotate(' + r + 'deg)';
        fly(el, [{ transform: t + ' scaleX(.05)', opacity: 0 }, { transform: t + ' scaleX(1)', opacity: 1, offset: .2 }, { transform: t + ' scaleX(1.12)', opacity: 0 }],
          { duration: 560, delay, easing: 'cubic-bezier(.1,.9,.2,1)', fill: 'backwards' });
      });
    } else {                // two silky crescents that float up and dissolve
      [0, 1].forEach(i => {
        const el = fx('fx-slash fx-slash--light', x, y, { '--s': s * (1 - i * .35) });
        fly(el, [{ transform: 'translate(-50%,-50%) rotate(-18deg) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-62%) rotate(-12deg) scale(1)', opacity: .95, offset: .35 }, { transform: 'translate(-46%,-82%) rotate(-6deg) scale(1.25)', opacity: 0 }],
          { duration: 1100 + i * 250, delay: i * 110, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'backwards' });
      });
    }
  }
  function particles(x, y, kind, s, n, upward) {   // red: embers + shards. light: drifting pearl motes
    for (let i = 0; i < n; i++) {
      const sp = fx('spark spark--' + kind, x, y, { '--z': (kind === 'red' ? rnd(2, 5) : kind === 'gold' ? rnd(3, 6) : rnd(4, 9)) + 'px' });
      const dx = (i % 2 ? 1 : -1) * rnd(6, 40) * s;
      if (kind === 'red') {
        const rise = upward ? -rnd(18, 74) * s : rnd(8, 34) * s, rot = rnd(-200, 200);
        fly(sp, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx * .6 + 'px,' + rise * .55 + 'px) scale(1.1) rotate(' + rot * .5 + 'deg)', opacity: 1, offset: .35 }, { transform: 'translate(' + dx + 'px,' + rise + 'px) scale(.1) rotate(' + rot + 'deg)', opacity: 0 }],
          { duration: rnd(520, 1100), easing: 'cubic-bezier(.15,.7,.3,1)' });
      } else if (kind === 'gold') {   // gold-leaf flecks: thrown out, then tumble down slowly
        const up = rnd(8, 30) * s, fall = rnd(14, 46) * s, rot = rnd(-260, 260);
        fly(sp, [{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx * .7 + 'px,' + -up + 'px) scale(1.15) rotate(' + rot * .4 + 'deg)', opacity: 1, offset: .3 },
          { transform: 'translate(' + dx + 'px,' + fall + 'px) scale(.2) rotate(' + rot + 'deg)', opacity: 0 }], { duration: rnd(650, 1300), easing: 'cubic-bezier(.2,.6,.4,1)' });
      } else {
        const dy = -rnd(24, 70) * s, sway = rnd(-14, 14);
        fly(sp, [{ transform: 'translate(0,0) scale(.4)', opacity: 0 }, { transform: 'translate(' + (dx * .4 + sway) + 'px,' + dy * .4 + 'px) scale(1)', opacity: .95, offset: .3 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)', opacity: 0 }],
          { duration: rnd(900, 1700), easing: 'ease-out' });
      }
    }
  }
  function burst(x, y, s = 1, n = 6) {   // used whenever a label is cut
    if (reduced) return;
    const kind = kindOf(), el = fx('glint glint--' + kind, x, y, { '--s': s });
    el.addEventListener('animationend', () => el.remove());
    slash(x, y, kind, s);
    particles(x, y, kind, s, n + (kind === 'red' ? 4 : 2), true);
  }
  function drawFx() {   // unsheathe: the blade leaves the saya
    shine(); pulse();
    if (reduced) return;
    const x = mouthX + curDx, y = mouthY, kind = kindOf();
    if (kind === 'red') { ring(x, y, 'red', 1.3); ring(x, y, 'red', .8, 120); slash(x, y - 6, 'red', 1.3); particles(x, y, 'red', 1.4, 16, true); }
    else if (kind === 'light') { ring(x, y, 'light', 1.2); ring(x, y, 'light', 1.6, 260); ring(x, y, 'light', 2, 520); particles(x, y, 'light', 1.3, 10, true); }
    else { ring(x, y, 'gold', 1.2); ring(x, y, 'gold', .8, 110); slash(x, y - 4, 'gold', 1.4); particles(x, y, 'gold', 1.3, 14, true); }
  }
  function sheathFx() {   // sheathe: the blade seats home
    pulse();
    if (reduced) return;
    const x = mouthX + curDx, y = mouthY, kind = kindOf();
    if (kind === 'red') { ring(x, y, 'red', 1.1, 0, true); ring(x, y, 'red', 1.6, 90, true); ring(x, y, 'red', .9, 260); particles(x, y, 'red', 1, 10, false); }
    else if (kind === 'light') { ring(x, y, 'light', 1.1, 0, true); ring(x, y, 'light', 1.4, 320); particles(x, y, 'light', 1, 8, true); }
    else { slash(x, y, 'gold', 1.1, 0); ring(x, y, 'gold', 1, 0, true); ring(x, y, 'gold', 1.4, 200); particles(x, y, 'gold', 1, 9, false); }   // a flat flash across the mouth = the "chin" of the blade seating
  }
  function shed(now) {   // while the blade moves it sheds embers (red) or pearl motes (light) from the tip
    if (reduced || !introDone || now - lastEmit < 140) return;
    lastEmit = now;
    particles(curPx, Math.min(curTipY, mouthY), kindOf(), .55, 1, true);
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
    // Size: red + light are scaled so the sheathed sword is exactly as tall as the gold one (hilt + sheath), whatever the screen height.
    if (FIT.ref) {
      const G = SWORDS.dark, shPx = shProbe.offsetHeight;
      const goldTotal = shPx * (1.06 * (G.PIV.y + G.GUARD_BOTTOM) / G.KN.h + (1 - G.FIT.cut));
      const kh = KN.h * (goldTotal / FIT.ref) / FIT.rs + 'px';
      kat.style.height = kh; ghosts.forEach(g => { g.style.height = kh; });
    } else { kat.style.height = ''; ghosts.forEach(g => { g.style.height = ''; }); }
    sc = kat.offsetHeight / KN.h; tipD = (KN.h - PIV.y) * sc;
    const org = PIV.x * sc + 'px ' + PIV.y * sc + 'px'; kat.style.transformOrigin = org; ghosts.forEach(g => { g.style.transformOrigin = org; });
    sheath.style.height = FIT.rs ? (SN.h * FIT.rs * sc) + 'px' : '';         // proportional to the katana, not to --sh
    const ssc = sheath.offsetHeight / SN.h;
    const sLeft = FIT.rs ? KX - MOUTH.x * ssc : KX - sheath.offsetWidth / 2;   // red/light: the mouth sits on the blade lane
    sheath.style.left = sLeft + 'px';              // sheath parked on the far-left katana strip (it slides right when the nav opens)
    const vis = sheath.offsetHeight * (1 - FIT.cut);                          // visible length: the bottom FIT.cut of the sheath is trimmed and faded away
    const sr = { left: sLeft, top: vh - FIT.bm - vis };   // laid out, not measured: unaffected by the slide transform
    sheath.style.top = sr.top + 'px'; sheath.style.bottom = 'auto';
    const edge = (1 - FIT.cut) * 100;
    sheath.style.webkitMaskImage = sheath.style.maskImage = FIT.cut ? 'linear-gradient(to bottom,#000 0,#000 ' + (edge - 12) + '%,transparent ' + edge + '%)' : '';
    mouthX = sr.left + MOUTH.x * ssc; mouthY = sr.top + MOUTH.y * ssc;
    seat = FIT.sink * ssc;                                                  // guard seats this many px below the mouth line
    clip.style.height = Math.max(0, mouthY + seat) + 'px';
    // largest gap that still keeps the last label clear of the hilt that stands out of the sheath
    const hilt = (PIV.y + GUARD_BOTTOM) * sc;
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
    drawFx();
  }
  function render() {
    const k = Math.min(m, N), sf = Math.max(m - N, 0), e = sf * sf * (3 - 2 * sf), g = gap;
    const dx = (cx - KX) * o, x0 = KX + dx + 5 * sc;                  // far-left strip when closed, through the middle of the label text when open
    sheath.style.transform = 'translateX(' + dx + 'px)';
    const y0 = Y0 + k * (h + g) + cTop - REST - GUARD_BOTTOM * sc;    // guard resting on top of label k, blade running down through it
    const x1 = mouthX + dx, y1 = mouthY + seat - GUARD_BOTTOM * sc;               // sheathed: guard rests on the mouth
    const px = x0 + (x1 - x0) * e, py = y0 + (y1 - y0) * e;
    const te = Math.min(1, sf * 2.4), tilt = FIT.tilt * te * te * (3 - 2 * te);   // lean in early so the blade enters the sheath already lined up
    pose(px, py, tilt);
    const tipY = py + tipD;
    curDx = dx; curPx = px; curTipY = tipY;
    kat.style.setProperty('--g', (1 - e).toFixed(3));   // glow fades out as the blade sheathes so the clip line never shows a tinted band
    const top = Y0 + cOff - 8, hh = Math.min(py - PIV.y * sc * TRAIL_HILT, mouthY + seat) - top;     // glowing line from the first label down to the tip
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
      render(); shed(now); requestAnimationFrame(frame); return;
    }
    m += (goal - m) * (reduced ? 1 : .2); if (Math.abs(goal - m) < .002) m = goal;
    const was = seated; seated = m >= N + .98;
    render(); if (m !== goal) shed(now); if (seated && !was && introDone) sheathFx();
    if (m !== goal) requestAnimationFrame(frame); else { looping = false; settle(); }
  }
  links.forEach(a => a.addEventListener('click', shine));   // clicking a label makes the blade flash as it heads there
  addEventListener('scroll', aim, { passive: true });
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);

  let assetRevision = 0, introScheduled = false;
  const assetPreloads = new Map();
  function preloadSwordAsset(src) {
    if (!assetPreloads.has(src)) {
      const image = new Image();
      image.src = src;
      assetPreloads.set(src, image.decode());
    }
    return assetPreloads.get(src);
  }
  function applySwordTheme(theme, force) {
    const nextTheme = SWORDS[theme] ? theme : 'dark';
    if (nextTheme === swordTheme && !force) { assetRevision++; return; }
    const revision = ++assetRevision, set = SWORDS[nextTheme];
    Promise.all([preloadSwordAsset(set.katana), preloadSwordAsset(set.sheath)]).then(() => {
      if (revision !== assetRevision) return;
      swordTheme = nextTheme;
      ({ KN, SN, PIV, GUARD_BOTTOM, MOUTH, FIT } = set);
      kat.style.opacity = sheath.style.opacity = '0';
      sheath.src = set.sheath;
      kat.src = set.katana;
      ghosts.forEach(g => { g.src = set.katana; });
      return Promise.all([kat.decode(), sheath.decode()]);
    }).then(() => {
      if (revision !== assetRevision) return;
      kat.style.opacity = sheath.style.opacity = '1';
      measure();
      if (introScheduled) { render(); return; }
      introScheduled = true;
      m = goal;
      pose(KX + 5 * sc, -(KN.h * sc) - 40, 0);
      settle();
      setTimeout(() => {
        started = true;
        kat.style.transition = reduced ? 'none' : 'transform 1s cubic-bezier(.2,.8,.2,1)';
        render();
        setTimeout(() => {
          kat.style.transition = 'none'; introDone = true; peek(); render(); settle();
          if (oGoal !== o) slide();
        }, 1050);
      }, 1400);
    }).catch(error => {
      if (revision === assetRevision) console.error('[katana] Could not load the ' + nextTheme + ' sword assets.', error);
    });
  }
  window.addEventListener('portfolio-theme-change', e => applySwordTheme(e.detail.theme, false));
  applySwordTheme(swordTheme, true);
})();

/* ---------- Draggable profile card ---------- */
(() => {
  const card = $('.profile-card'), handle = $('.profile-drag-handle');
  if (!card || !handle) return;
  let x = 0, y = 0, pointerId = null, startX = 0, startY = 0, originX = 0, originY = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const paint = () => {
    card.style.setProperty('--drag-x', x + 'px');
    card.style.setProperty('--drag-y', y + 'px');
  };
  function constrain() {
    paint();
    const parent = card.parentElement.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    const left = rect.left - x, top = rect.top - y;
    x = clamp(x, parent.left - left, Math.max(parent.left - left, parent.right - left - rect.width));
    y = clamp(y, parent.top - top, Math.max(parent.top - top, parent.bottom - top - rect.height));
    paint();
  }
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || pointerId !== null) return;
    e.preventDefault();
    pointerId = e.pointerId;
    startX = e.clientX; startY = e.clientY; originX = x; originY = y;
    card.classList.add('is-dragging');
    handle.setPointerCapture(pointerId);
  });
  handle.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId) return;
    x = originX + e.clientX - startX;
    y = originY + e.clientY - startY;
    constrain();
  });
  function endDrag(e) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    card.classList.remove('is-dragging');
  }
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
  handle.addEventListener('lostpointercapture', endDrag);
  handle.addEventListener('keydown', e => {
    const step = e.shiftKey ? 32 : 12;
    if (e.key === 'ArrowLeft') x -= step;
    else if (e.key === 'ArrowRight') x += step;
    else if (e.key === 'ArrowUp') y -= step;
    else if (e.key === 'ArrowDown') y += step;
    else if (e.key === 'Home') { x = 0; y = 0; }
    else return;
    e.preventDefault();
    constrain();
  });
  addEventListener('resize', constrain, { passive: true });
})();

/* ---------- Tape player: drag it, scale it to the screen, minimize it to a little cassette ----------
   Drag anywhere that is not a button; arrow keys when the title (or the cassette) is focused; double-click the title to reset.
   The minus button in the title bar shrinks the deck to a button-less cassette (reels spin while playing); tap the cassette to open it again. */
(() => {
  const deck = $('.retro-player'), grip = $('#deck-grip'), minBtn = $('#deck-min'), tape = $('#mini-tape');
  if (!deck || !grip || !minBtn || !tape) return;
  const FULL_W = 320, FULL_H = 240;                 // full deck size before scaling
  const coarse = matchMedia('(pointer: coarse)');
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  let mini = !!store.get('deck-mini', false);

  const place = (x, y) => {
    const r = deck.getBoundingClientRect();
    x = clamp(x, 6, innerWidth - r.width - 6);
    y = clamp(y, 6, innerHeight - r.height - 6);
    deck.style.left = x + 'px'; deck.style.top = y + 'px';
    deck.style.right = 'auto'; deck.style.bottom = 'auto';
    deck.classList.add('is-placed');
    return { x, y };
  };
  const scaleFor = () => {
    if (mini) return coarse.matches ? 1.15 : 1;
    let k = Math.min(1, (innerWidth - 20) / FULL_W);                                                      // phones: shrink to fit the width
    if (coarse.matches && innerWidth >= 700 && innerHeight >= 600) k = Math.min(1.3, innerWidth / 640);   // tablets: a bit bigger for fingers
    return Math.max(.6, Math.min(k, (innerHeight - 20) / FULL_H));                                        // short landscape screens
  };
  const apply = () => {
    deck.style.setProperty('--k', scaleFor().toFixed(3));
    if (deck.style.left) { const r = deck.getBoundingClientRect(); place(r.left, r.top); }
  };
  const setMini = (v, focus) => {
    mini = v;
    deck.classList.toggle('is-mini', v);
    deck.classList.add('is-pop'); setTimeout(() => deck.classList.remove('is-pop'), 260);
    minBtn.setAttribute('aria-expanded', String(!v));
    store.set('deck-mini', v);
    apply();
    if (focus) (v ? tape : minBtn).focus();
  };

  deck.classList.toggle('is-mini', mini);
  apply();
  const saved = store.get('deck-pos', null);
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) place(saved.x, saved.y);

  minBtn.addEventListener('click', () => setMini(true, true));
  tape.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMini(false, true); }
  });

  // pointer: a drag moves the deck; a plain tap on the cassette opens it
  let drag = null;
  deck.addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('button, input, a')) return;
    const r = deck.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
    deck.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  deck.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
      drag.moved = true; deck.classList.add('is-dragging');
    }
    place(e.clientX - drag.dx, e.clientY - drag.dy);
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const tap = !drag.moved;
    drag = null; deck.classList.remove('is-dragging');
    if (!tap) { const r = deck.getBoundingClientRect(); store.set('deck-pos', { x: r.left, y: r.top }); }
    else if (mini && e.type === 'pointerup') setMini(false, true);
  };
  deck.addEventListener('pointerup', end);
  deck.addEventListener('pointercancel', end);

  const nudge = e => {
    const step = e.shiftKey ? 48 : 12, k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!k) return;
    e.preventDefault();
    const r = deck.getBoundingClientRect(), p = place(r.left + k[0], r.top + k[1]);
    store.set('deck-pos', p);
  };
  grip.addEventListener('keydown', nudge);
  tape.addEventListener('keydown', nudge);
  grip.addEventListener('dblclick', () => {
    deck.style.left = deck.style.top = deck.style.right = deck.style.bottom = '';
    deck.classList.remove('is-placed');
    store.set('deck-pos', null);
    apply();
  });
  addEventListener('resize', apply, { passive: true });
})();
