/* Arcade: launch panel + fullscreen overlay. Games: Snake, Flip the Coin, Memory.
   Keys, timers and sounds only exist while the overlay is open. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('pf:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pf:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* =====================================================================
     DATA ACCESS: the ONLY place scores are read or written.
     To add a database later, change just these two functions (keep them async).
       getScores(game)                 -> [{ name, score }], best first
       submitScore(game, name, score)  -> { ok: boolean }
     game is 'snake' | 'coin' | 'memory'. Memory is "fewest moves", so lower is better.
     ===================================================================== */
  async function getScores(game) { return []; }
  async function submitScore(game, name, score) { return { ok: false }; }

  const CFG = {
    coin: { heads: 'resources/heads.svg', tails: 'resources/tails.svg' },
    cards: ['milktea:MilkTea', 'cookie:Cookies', 'cake:Cake', 'Icecream:Icecream', 'donut:Donut', 'lolipop:Lolipop', 'chocolate:Chocolate', 'cottoncandy:Cottoncandy', 'pretzel:Pretzel', 'marshmallow:Marshmallow']
      .map(s => { const [f, name] = s.split(':'); return { name, image: 'memitem/' + f + '.jfif' }; })
  };

  /* ---------- 8-bit sound (Web Audio, created on the first click) ---------- */
  const Sound = (() => {
    let ctx = null, on = store.get('arcade-sound', true) !== false;
    const get = () => {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const tone = (f0, f1, dur, type = 'square', vol = .08, delay = 0) => {
      if (!on) return; const c = get(); if (!c) return;
      const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .01);
    };
    return {
      get on() { return on; },
      set(v) { on = !!v; store.set('arcade-sound', on); },
      unlock: get,
      blip: (a = 580, b = 880) => tone(a, b, .05, 'square', .045),
      tick: (p = 1400) => tone(p, p * .45, .022, 'triangle', .05),
      eat: () => { tone(300, 880, .095, 'square', .12); tone(600, 1200, .07, 'triangle', .06); },
      over: () => { [440, 330, 220, 110].forEach((f, i) => tone(f, f * .88, .088, 'square', .09, i * .09)); tone(110, 45, .38, 'sawtooth', .1, .36); },
      flip: () => tone(400, 600, .05, 'square', .09),
      match: () => [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => tone(f, 0, .32, 'triangle', .14, i * .06)),
      miss: () => tone(180, 140, .18, 'sawtooth', .08),
      win: () => { [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => tone(f, 0, .16, i % 2 ? 'triangle' : 'square', .12, i * .055)); [1046.5, 1318.51, 1567.98].forEach(f => tone(f, 0, .65, 'square', .09, .385)); },
      toss: () => { tone(900, 2400, .55, 'sine', .12); tone(1350, 3600, .45, 'triangle', .06); },
      cwin: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0, .22, i === 3 ? 'sine' : 'square', .09, i * .07)),
      lose: () => tone(220, 150, .38, 'triangle', .12),
      click: () => tone(1800, 320, .025, 'square', .08),
      warp: () => { [220, 330, 440, 660, 880, 1320].forEach((f, i) => tone(f, 0, .07, i % 2 ? 'square' : 'triangle', .06, i * .032)); tone(900, 140, .22, 'sawtooth', .05, .06); }
    };
  })();

  /* ---------- helpers ---------- */
  const life = () => {
    const u = [], t = new Set();
    return {
      on(el, ev, f, o) { el.addEventListener(ev, f, o); u.push(() => el.removeEventListener(ev, f, o)); },
      to(f, ms) { const id = setTimeout(() => { t.delete(id); f(); }, ms); t.add(id); return id; },
      clr(id) { clearTimeout(id); t.delete(id); },
      end() { u.forEach(f => f()); u.length = 0; t.forEach(clearTimeout); t.clear(); }
    };
  };
  const say = (ov, h) => { ov.innerHTML = h; ov.classList.toggle('on', !!h); };
  const ic = d => '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="3">' + d + '</svg>';
  const typing = e => !!(e.target.closest && e.target.closest('input,textarea'));
  const onButton = e => !!(e.target.closest && e.target.closest('button'));

  /* ---------- overlay markup (built once, hidden) ---------- */
  const root = document.createElement('div');
  root.id = 'arcade-overlay'; root.hidden = true; root.tabIndex = -1; root.dataset.game = 'snake';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Arcade');
  root.innerHTML =
    '<div class="ao-glow"></div><div class="ao-rip" id="ao-rip"></div>' +
    '<div class="ao-scroll"><div class="ao-wrap">' +
      '<header class="ao-top"><div><div class="ao-brand"><i class="fa-solid fa-gamepad"></i><h1>ARCADE</h1><span class="ao-pill">Active station</span></div>' +
        '<p>Pick a game and the whole room changes with it.</p></div>' +
        '<button class="ao-close" id="ao-close" type="button" aria-label="Close arcade"><i class="fa-solid fa-xmark"></i><span class="t">Close (Esc)</span></button></header>' +
      '<div class="ao-grid">' +
        '<aside class="ao-left ao-col">' +
          '<section class="ao-card"><div class="ao-card-h"><div><h2><i class="fa-solid fa-medal"></i>Leaderboard</h2><p id="ao-board-sub"></p></div><span class="ao-tag">Offline</span></div>' +
            '<ol class="ao-rows" id="ao-rows"></ol>' +
            '<div class="ao-handle"><label class="ao-label" for="ao-nick">Player handle</label><div><input id="ao-nick" maxlength="14" placeholder="ANONYMOUS" autocomplete="off"><button id="ao-set" type="button">SET</button></div></div></section>' +
          '<section class="ao-card soft"><div class="ao-stat"><span>Session runs</span><b id="ao-runs">0</b></div><div class="ao-stat"><span id="ao-best-l">Personal best</span><b class="hl" id="ao-best-v">--</b></div></section>' +
        '</aside>' +
        '<main class="ao-center ao-col">' +
          '<div class="ao-cab"><div class="ao-cab-in">' +
            '<div class="ao-strip"><div class="ao-title"><span id="ao-gname"></span>&nbsp;//&nbsp;<span id="ao-handle"></span></div><div id="ao-hud"></div></div>' +
            '<div class="ao-screen" id="ao-screen"></div>' +
            '<div class="ao-bar"><span>[ 1P READY ]</span><span id="ao-core"></span></div>' +
          '</div></div>' +
          '<section class="ao-card soft"><div class="ao-keys" id="ao-keys"></div></section>' +
          '<section class="ao-card soft"><div class="ao-card-h"><span class="ao-label"><i class="fa-regular fa-circle-question"></i>&nbsp; How to play</span></div><div class="ao-guide" id="ao-guide"></div></section>' +
        '</main>' +
        '<aside class="ao-right ao-col">' +
          '<section class="ao-card"><div class="ao-card-h"><h2><i class="fa-solid fa-layer-group"></i>Cabinets</h2><span class="ao-tag">3 installed</span></div><div class="ao-cabs" id="ao-cabs"></div></section>' +
          '<section class="ao-card soft"><div class="ao-sound-row"><span><i class="fa-solid fa-volume-high" id="ao-sicon"></i><span id="ao-stext">8-bit audio synth</span></span>' +
            '<button class="ao-switch" id="ao-sound" type="button" role="switch" aria-checked="true" aria-label="Game sounds"></button></div>' +
            '<p class="ao-note">Site music is paused while the arcade is open.</p></section>' +
        '</aside>' +
      '</div></div></div>';
  document.body.appendChild(root);

  const screen = $('#ao-screen', root), rip = $('#ao-rip', root), scroller = $('.ao-scroll', root);
  const cssv = v => getComputedStyle(root).getPropertyValue(v).trim();

  /* ---------- state ---------- */
  const bestKey = g => 'arcade-best-' + g;
  const getBest = g => { const v = store.get(bestKey(g), null); return typeof v === 'number' ? v : null; };
  const handle = () => (String(store.get('arcade-nick', '') || '').trim().toUpperCase().slice(0, 14)) || 'ANONYMOUS';
  let cur = null, stop = () => {}, want = null, swap = 0, runs = 0, isOpen = false;

  const hudEl = $('#ao-hud', root);
  const api = {
    hud(pairs) { hudEl.innerHTML = pairs.map(([k, v]) => '<span class="ao-kv"><span>' + k + ':</span><b>' + esc(v) + '</b></span>').join('<i class="ao-sl">/</i>'); },
    best: () => getBest(cur.id),
    end(score) {   // a run finished
      const g = cur.id; runs++;
      if (score > 0) {
        const b = getBest(g);
        if (b == null || (cur.low ? score < b : score > b)) store.set(bestKey(g), score);
        submitScore(g, handle(), score).then(renderBoard, () => {});
      }
      renderStats(); renderCabs();
    }
  };

  /* ---------- games ---------- */
  const GAMES = {
    snake: {
      name: 'Snake', unit: 'Score', low: false, core: 'Neo-Geo raster core',
      icon: ic('<path d="M4 25h9V13h8v12h7" stroke-linejoin="round"/>'), bestTxt: n => n,
      keys: [[['ARROWS', 'WASD', 'SWIPE'], 'Move'], [['SPACE'], 'Pause / start'], [['R'], 'Restart']],
      guide: [['Guide the snake', 'with arrows, WASD or a swipe.'], ['Eat the orbs', 'to grow and score.'], ['Avoid crashing', 'into walls or your own tail.']],
      mount(el, a) {
        const L = life(), N = 20, U = 20;
        el.classList.add('touch');
        el.innerHTML = '<canvas class="ao-snake" width="400" height="400"></canvas><div class="ao-ov"></div>';
        const ctx = el.firstChild.getContext('2d'), ov = el.lastChild;
        let s, d, nd, food, score, state = 'idle', timer;
        const hud = () => a.hud([['SCORE', score], ['BEST', Math.max(score, a.best() || 0)]]);
        const place = () => { do { food = { x: Math.random() * N | 0, y: Math.random() * N | 0 }; } while (s.some(p => p.x === food.x && p.y === food.y)); };
        const reset = () => { L.clr(timer); s = [6, 5, 4, 3, 2].map(x => ({ x, y: 10 })); d = nd = { x: 1, y: 0 }; score = 0; state = 'idle'; place(); draw(); hud(); };
        function draw() {
          const ac = cssv('--ac');
          ctx.fillStyle = '#07090e'; ctx.fillRect(0, 0, 400, 400);
          ctx.strokeStyle = 'rgba(' + cssv('--acrgb') + ',.05)'; ctx.lineWidth = 1;
          for (let i = 0; i <= 400; i += U) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(400, i); ctx.stroke(); }
          ctx.shadowBlur = 12; ctx.shadowColor = '#ff4d6d'; ctx.fillStyle = '#ff4d6d'; ctx.fillRect(food.x * U + 3, food.y * U + 3, U - 6, U - 6);
          ctx.shadowColor = ac; ctx.fillStyle = ac;
          s.forEach((p, i) => { ctx.globalAlpha = i ? .75 : 1; ctx.fillStyle = i ? ac : '#f1ffef'; ctx.fillRect(p.x * U + 1, p.y * U + 1, U - 2, U - 2); });
          ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }
        function tick() {
          d = nd; const h = { x: s[0].x + d.x, y: s[0].y + d.y }, eat = h.x === food.x && h.y === food.y;
          if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || (eat ? s : s.slice(0, -1)).some(p => p.x === h.x && p.y === h.y)) {
            state = 'over'; Sound.over(); a.end(score); hud();
            return say(ov, '<b>Game over</b><span>Score: ' + score + '</span><button class="ao-btn" type="button"><i class="fa-solid fa-rotate-right"></i>Play again</button>');
          }
          s.unshift(h); if (eat) { score++; Sound.eat(); place(); hud(); } else s.pop();
          draw(); timer = L.to(tick, 90);
        }
        const start = () => {
          if (state === 'playing') return; if (state === 'over') reset();
          state = 'playing'; say(ov, ''); L.clr(timer); timer = L.to(tick, 90);
        };
        const pause = () => { if (state !== 'playing') return; L.clr(timer); state = 'paused'; say(ov, '<b>Paused</b><em>Space or tap to resume</em>'); };
        const turn = v => {
          if (state === 'over') reset(); if (state === 'paused') return;
          if (!(v[0] === -d.x && v[1] === -d.y)) { if (state === 'playing' && (v[0] !== nd.x || v[1] !== nd.y)) Sound.tick(); nd = { x: v[0], y: v[1] }; }
          if (state !== 'playing') start();
        };
        const K = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
        L.on(document, 'keydown', e => {
          if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
          const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
          if ((k === ' ' || k === 'Enter') && onButton(e)) return;   // let a focused button handle its own Space/Enter
          if (k === ' ') { e.preventDefault(); return state === 'playing' ? (Sound.tick(900), pause()) : start(); }
          if (k === 'r') { e.preventDefault(); reset(); return start(); }
          const v = K[k]; if (!v) return;
          e.preventDefault(); turn(v);
        });
        // swipe (phones): the screen has touch-action:none, so the page never scrolls under your thumb
        let t0 = null;
        L.on(el, 'touchstart', e => { const t = e.changedTouches[0]; t0 = { x: t.clientX, y: t.clientY }; }, { passive: true });
        L.on(el, 'touchend', e => {
          if (!t0) return; const t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y; t0 = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;   // a tap: the click handler below deals with it
          turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
          e.preventDefault();
        }, { passive: false });
        L.on(el, 'click', () => { if (state === 'paused' || state === 'idle' || state === 'over') start(); });
        L.on(window, 'blur', pause);
        reset(); say(ov, '<b>Snake</b><em>Arrows, WASD or swipe</em><button class="ao-btn" type="button"><i class="fa-solid fa-play"></i>Start run</button>');
        return () => { L.end(); el.classList.remove('touch'); };
      }
    },
    coin: {
      name: 'Flip the Coin', unit: 'Streak', low: false, core: 'Pseudo-RNG core',
      icon: ic('<circle cx="16" cy="16" r="12"/><path d="M12 11v10M20 11v10M12 16h8"/>'), bestTxt: n => n,
      keys: [[['H'], 'Heads'], [['T'], 'Tails'], [['SPACE'], 'Toss'], [['R'], 'Reset streak']],
      guide: [['Call heads or tails', 'with the buttons or H / T.'], ['Toss the coin.', 'A correct call adds to your streak.'], ['One wrong call', 'resets the streak to 0.']],
      mount(el, a) {
        const L = life(); let streak = 0, pick = 'HEADS', busy = false;
        el.innerHTML = '<div class="ao-coin"><div class="ao-pill2">Call it: heads or tails?</div>' +
          '<div class="ao-coinstage"><img src="' + CFG.coin.heads + '" alt="Coin" draggable="false"></div>' +
          '<div class="ao-calls"><button class="ao-call on" type="button" data-s="HEADS"><i class="fa-solid fa-circle-dot"></i>Heads</button><button class="ao-call" type="button" data-s="TAILS"><i class="fa-regular fa-circle"></i>Tails</button></div>' +
          '<button class="ao-btn" type="button" data-toss><i class="fa-solid fa-play"></i>Toss coin</button></div>';
        const img = $('img', el), pill = $('.ao-pill2', el), btns = $$('[data-s]', el);
        const hud = () => a.hud([['STREAK', streak], ['BEST', Math.max(streak, a.best() || 0)]]);
        const status = (t, cls) => { pill.textContent = t; pill.className = 'ao-pill2' + (cls ? ' ' + cls : ''); };
        const setCall = c => { pick = c; btns.forEach(b => b.classList.toggle('on', b.dataset.s === c)); Sound.click(); status('Call set: ' + c); };
        function flip() {
          if (busy) return; busy = true; Sound.toss();
          const res = Math.random() < .5 ? 'HEADS' : 'TAILS'; status('Flipping...', 'spin');
          img.style.transition = 'transform .9s cubic-bezier(.3,.7,.3,1)'; img.style.transform = 'rotateY(1080deg)';
          L.to(() => { img.src = CFG.coin[res.toLowerCase()]; }, 450);
          L.to(() => {
            img.style.transition = 'none'; img.style.transform = 'none';
            if (res === pick) { streak++; Sound.cwin(); status('Result: ' + res + ' - call won! +1 streak', 'win'); }
            else { Sound.lose(); status('Result: ' + res + ' - missed! Streak over', 'lose'); if (streak) a.end(streak); streak = 0; }
            hud(); busy = false;
          }, 900);
        }
        btns.forEach(b => L.on(b, 'click', () => { if (!busy) setCall(b.dataset.s); }));
        L.on($('[data-toss]', el), 'click', flip); L.on($('.ao-coinstage', el), 'click', flip);
        L.on(document, 'keydown', e => {
          if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
          const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
          if ((k === ' ' || k === 'Enter') && onButton(e)) return;
          if (k === 'h' && !busy) setCall('HEADS');
          else if (k === 't' && !busy) setCall('TAILS');
          else if (k === ' ') { e.preventDefault(); flip(); }
          else if (k === 'r' && !busy) { if (streak) a.end(streak); streak = 0; Sound.lose(); status('Streak reset', ''); hud(); }
        });
        hud();
        return () => { L.end(); if (streak) a.end(streak); };
      }
    },
    memory: {
      name: 'Memory', unit: 'Fewest moves', low: true, core: 'Synth deck core',
      icon: ic('<rect x="3" y="6" width="13" height="19" rx="2"/><rect x="17" y="8" width="12" height="19" rx="2" fill="currentColor"/>'), bestTxt: n => n + ' moves',
      keys: [[['CLICK / TAP'], 'Flip card'], [['R'], 'Restart']],
      guide: [['Uncover cards:', 'flip any two to look for a pair.'], ['Match pairs:', 'matching items stay face up.'], ['Use fewer moves', 'to beat your best.']],
      mount(el, a) {
        const L = life(), total = CFG.cards.length;
        el.innerHTML = '<div class="ao-mem"><div class="ao-mgrid"></div><div class="ao-mbar"><span></span><button class="ao-btn ghost" type="button"><i class="fa-solid fa-shuffle"></i>&nbsp;Restart</button></div></div><div class="ao-ov"></div>';
        const grid = $('.ao-mgrid', el), note = $('.ao-mbar span', el), ov = $('.ao-ov', el);
        let deck, first, lock, moves, pairs, done;
        const hud = () => a.hud([['MOVES', moves], ['PAIRS', pairs + '/' + total], ['BEST', a.best() ?? '--']]);
        function deal() {
          L.end(); wire();   // clears any pending flip-back timers, then re-binds
          deck = [...CFG.cards, ...CFG.cards].sort(() => Math.random() - .5);
          first = null; lock = done = false; moves = pairs = 0;
          grid.innerHTML = deck.map((c, i) => '<button class="mc" type="button" data-i="' + i + '" aria-label="Card ' + (i + 1) + '"><span class="f"></span><span class="b"><img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" onerror="this.replaceWith(this.alt)"></span></button>').join('');
          say(ov, ''); note.textContent = 'Find the pairs.'; hud();
        }
        function wire() {
          L.on(grid, 'click', e => {
            const b = e.target.closest('.mc'); if (!b || lock || done || b.classList.contains('ok') || b === first) return;
            b.classList.add('up'); Sound.flip(); if (!first) { first = b; return; }
            const f = first; first = null; moves++;
            if (deck[+f.dataset.i].name === deck[+b.dataset.i].name) {
              f.classList.add('ok'); b.classList.add('ok'); pairs++; note.textContent = 'Match!'; Sound.match();
              if (pairs === total) { done = true; L.to(Sound.win, 250); a.end(moves); say(ov, '<b>Complete</b><span>Moves: ' + moves + '</span><button class="ao-btn" type="button"><i class="fa-solid fa-rotate-right"></i>Play again</button>'); }
            } else { lock = true; note.textContent = 'Not a match.'; L.to(() => { Sound.miss(); f.classList.remove('up'); b.classList.remove('up'); lock = false; }, 800); }
            hud();
          });
          L.on(ov, 'click', deal); L.on($('.ao-mbar .ao-btn', el), 'click', deal);
          L.on(document, 'keydown', e => {
            if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
            if (e.key === 'r' || e.key === 'R') deal();
          });
        }
        deal();
        return () => L.end();
      }
    }
  };
  Object.entries(GAMES).forEach(([id, g]) => g.id = id);

  /* ---------- rendering ---------- */
  const rowsEl = $('#ao-rows', root);
  async function renderBoard() {
    if (!cur) return; const g = cur.id; let list = [];
    try { list = await getScores(g) || []; } catch (e) {}
    if (!cur || cur.id !== g) return;
    rowsEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
      const e = list[i];
      return '<li class="' + (i === 0 ? 'top' : '') + '"><span>#' + String(i + 1).padStart(2, '0') + '</span><span>' + (e ? esc(e.name) : 'N/A') + '</span><span>' + (e ? e.score : 0) + '</span></li>';
    }).join('');
    $('#ao-board-sub', root).textContent = cur.name + ' / ' + cur.unit;
  }
  function renderStats() {
    $('#ao-runs', root).textContent = runs;
    const v = cur ? getBest(cur.id) : null;
    $('#ao-best-v', root).textContent = v == null ? '--' : cur.bestTxt(v);
    $('#ao-best-l', root).textContent = 'Personal best';
  }
  function renderCabs() {
    $('#ao-cabs', root).innerHTML = Object.values(GAMES).map(g => {
      const v = getBest(g.id), on = cur && cur.id === g.id;
      return '<button class="ao-cabinet" type="button" data-g="' + g.id + '" aria-pressed="' + on + '"><span class="cb"><span class="ic">' + g.icon + '</span>' +
        '<span class="nm"><h3>' + g.name + '</h3><small>Best: ' + (v == null ? '--' : g.bestTxt(v)) + ' // ' + (on ? 'Active' : 'Standby') + '</small></span></span><span class="bd">' + (on ? 'Active' : 'Standby') + '</span></button>';
    }).join('');
  }
  function renderInfo() {
    $('#ao-gname', root).textContent = cur.name.toUpperCase();
    $('#ao-handle', root).textContent = handle();
    $('#ao-core', root).textContent = cur.core;
    $('#ao-keys', root).innerHTML = '<span class="lbl">Controls:</span>' + cur.keys.map(([ks, w]) =>
      ks.map(k => '<span class="kc">' + k + '</span>').join('<span class="dot" style="margin:0 2px">/</span>') + '<span class="what">' + w + '</span>').join('<span class="dot">&bull;</span>');
    $('#ao-guide', root).innerHTML = cur.guide.map((g, i) => '<div><i>' + (i + 1) + '</i><p style="margin:0"><strong>' + g[0] + '</strong> ' + g[1] + '</p></div>').join('');
  }
  function renderSound() {
    const on = Sound.on, sw = $('#ao-sound', root);
    sw.setAttribute('aria-checked', on); $('#ao-sicon', root).className = 'fa-solid ' + (on ? 'fa-volume-high' : 'fa-volume-xmark');
    $('#ao-stext', root).textContent = on ? '8-bit audio synth' : 'Synth muted';
  }

  /* ---------- switching games (colour ripple re-themes the whole room) ---------- */
  function retheme(id, e) {
    if (root.dataset.game === id) return;
    const b = e && e.currentTarget ? e.currentTarget.getBoundingClientRect() : null;
    rip.style.setProperty('--x', (b ? b.left + b.width / 2 : innerWidth / 2) + 'px');
    rip.style.setProperty('--y', (b ? b.top + b.height / 2 : innerHeight / 2) + 'px');
    rip.dataset.game = id; rip.classList.remove('go'); void rip.offsetWidth; rip.classList.add('go');
    setTimeout(() => { root.dataset.game = id; rip.classList.remove('go'); }, 700);
  }
  function select(id, e, now) {
    if (want === id) return; want = id; clearTimeout(swap);
    if (now) { root.dataset.game = id; } else retheme(id, e);
    screen.classList.add('out');
    swap = setTimeout(() => {
      stop(); cur = GAMES[id]; screen.innerHTML = ''; screen.className = 'ao-screen out'; api.hud([]);
      renderInfo(); renderCabs(); renderStats(); renderBoard();
      stop = cur.mount(screen, api) || (() => {});
      screen.classList.remove('out');
    }, now ? 0 : 130);
  }

  /* ---------- open / close ---------- */
  let wasPlaying = false, savedY = 0, opener = null, frozen = [];
  function open(id) {
    if (isOpen) return; isOpen = true; opener = document.activeElement;
    savedY = window.scrollY; document.body.style.top = '-' + savedY + 'px'; document.documentElement.classList.add('arcade-open');
    wasPlaying = !!(window.pfMusic && window.pfMusic.pause());            // site music pauses while you play
    frozen = [...document.body.children].filter(n => n !== root); frozen.forEach(n => { n.inert = true; });
    root.hidden = false; root.classList.add('open'); scroller.scrollTop = 0;
    Sound.unlock(); renderSound();
    select(GAMES[id] ? id : (cur ? cur.id : 'snake'), null, true);
    Sound.warp(); root.focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen) return; isOpen = false; clearTimeout(swap);
    stop(); stop = () => {}; screen.innerHTML = ''; want = null; root.classList.remove('open'); root.hidden = true;
    frozen.forEach(n => { n.inert = false; }); frozen = [];
    document.documentElement.classList.remove('arcade-open'); document.body.style.top = '';
    window.scrollTo({ top: savedY, behavior: 'instant' });
    if (wasPlaying && window.pfMusic) window.pfMusic.resume();
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  /* ---------- wiring ---------- */
  $('#enter-arcade').addEventListener('click', () => open());
  $('#ao-close', root).addEventListener('click', close);
  document.addEventListener('keydown', e => { if (isOpen && e.key === 'Escape') { e.preventDefault(); close(); } });
  root.addEventListener('click', e => {          // mouse clicks shouldn't leave a button focused (it would eat Space)
    if (e.detail > 0) { const b = e.target.closest('button'); if (b && b.id !== 'ao-close') b.blur(); }
  });
  $('#ao-cabs', root).addEventListener('click', e => {
    const b = e.target.closest('.ao-cabinet'); if (!b) return;
    if (b.dataset.g !== (cur && cur.id)) { Sound.warp(); select(b.dataset.g, { currentTarget: b }); }
  });
  $('#ao-cabs', root).addEventListener('mouseover', e => { const b = e.target.closest('.ao-cabinet'); if (b && !b.contains(e.relatedTarget)) Sound.blip(b.dataset.g === (cur && cur.id) ? 700 : 500, 900); });
  $('#ao-sound', root).addEventListener('click', () => { Sound.set(!Sound.on); renderSound(); if (Sound.on) Sound.blip(440, 880); });
  const nick = $('#ao-nick', root);
  nick.value = store.get('arcade-nick', '') || '';
  const setNick = () => { store.set('arcade-nick', nick.value.trim().slice(0, 14)); $('#ao-handle', root).textContent = handle(); Sound.blip(700, 1100); };
  $('#ao-set', root).addEventListener('click', setNick);
  nick.addEventListener('keydown', e => { if (e.key === 'Enter') { setNick(); nick.blur(); } });
})();