/* Ejder Ocağı 2.0 · efekt katmanı: parçacık, uçan yazı, keseye uçan altın, sarsıntı.
   Yalnız his içindir; hiçbir oyun değerini değiştirmez. Hareket azaltma tercihi açıksa parçacıklar çizilmez. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, app = document.getElementById('app');
  const cv = document.createElement('canvas'); cv.id = 'efekt'; cv.setAttribute('aria-hidden', 'true'); app.appendChild(cv);
  const cx = cv.getContext('2d'), calm = matchMedia('(prefers-reduced-motion: reduce)').matches; let P = [], raf = 0, last = 0, W = 0, H = 0, dpr = 1;
  function size() { const r = app.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  addEventListener('resize', size); size();
  const pos = t => { if (!t) return [W / 2, H / 2]; if (Array.isArray(t)) return t; const a = app.getBoundingClientRect(), r = (t.getBoundingClientRect ? t : document.querySelector(t)).getBoundingClientRect(); return [r.left - a.left + r.width / 2, r.top - a.top + r.height / 2]; };
  function shape(p) { const s = p.s * (p.grow ? 1 + (1 - p.life / p.max) * p.grow : 1); cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.life / (p.max * 0.45)); cx.fillStyle = p.c;
    if (p.k === 'kalp') { cx.beginPath(); cx.moveTo(0, s * 0.9); cx.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.7, -s * 1.2, 0, -s * 0.35); cx.bezierCurveTo(s * 0.7, -s * 1.2, s * 1.5, -s * 0.2, 0, s * 0.9); cx.fill(); }
    else if (p.k === 'yildiz') { cx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? s * 0.35 : s; cx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } cx.closePath(); cx.shadowColor = p.c; cx.shadowBlur = s * 2; cx.fill(); }
    else if (p.k === 'altin') { cx.beginPath(); cx.ellipse(0, 0, s, s * Math.abs(Math.cos(p.r * 3)) + 0.6, 0, 0, 7); cx.fillStyle = '#ffd24a'; cx.fill(); cx.lineWidth = 1; cx.strokeStyle = '#a86a10'; cx.stroke(); }
    else if (p.k === 'kopuk') { cx.beginPath(); cx.arc(0, 0, s, 0, 7); cx.fillStyle = 'rgba(210,240,255,.35)'; cx.fill(); cx.lineWidth = 1.2; cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.stroke(); }
    else { cx.beginPath(); cx.arc(0, 0, s, 0, 7); cx.shadowColor = p.c; cx.shadowBlur = s * 2.5; cx.fill(); }
    cx.restore(); }
  function tick(t) { const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t; cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    for (const p of P) { p.life -= dt; if (p.to) { const k = 1 - p.life / p.max, e = k * k; p.x = p.x0 + (p.to[0] - p.x0) * e + Math.sin(k * Math.PI) * p.bow; p.y = p.y0 + (p.to[1] - p.y0) * e - Math.sin(k * Math.PI) * p.arc; } else { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; } p.r += p.vr * dt; if (p.life > 0) shape(p); else if (p.done) p.done(); }
    P = P.filter(p => p.life > 0); raf = P.length ? requestAnimationFrame(tick) : 0; }
  const go = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const add = o => { if (calm && !o.done) return; P.push(Object.assign({ vx: 0, vy: 0, g: 0, r: 0, vr: 0, s: 4, max: o.life }, o)); go(); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FX = G.fx = {
    burst(t, c, n, k) { const [x, y] = pos(t); for (let i = 0; i < (n || 14); i++) { const a = rnd(0, 6.28), v = rnd(80, 360); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 420, s: rnd(2, 5), c: c || '#ffe9a8', life: rnd(0.5, 1.0), k: k || 'nokta', vr: rnd(-6, 6) }); } },
    hearts(t, n) { const [x, y] = pos(t); for (let i = 0; i < (n || 7); i++) add({ x: x + rnd(-50, 50), y: y + rnd(-20, 30), vx: rnd(-30, 30), vy: rnd(-150, -80), g: -30, s: rnd(7, 13), c: i % 2 ? '#ff7aa8' : '#ffb3cc', life: rnd(0.9, 1.5), k: 'kalp', r: rnd(-0.3, 0.3) }); },
    stars(t, n, c) { const [x, y] = pos(t); for (let i = 0; i < (n || 10); i++) { const a = rnd(0, 6.28), v = rnd(60, 240); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 160, s: rnd(4, 9), c: c || '#ffe9a8', life: rnd(0.6, 1.2), k: 'yildiz', vr: rnd(-4, 4) }); } },
    bubbles(t, n) { const [x, y] = pos(t); for (let i = 0; i < (n || 5); i++) add({ x: x + rnd(-18, 18), y: y + rnd(-18, 18), vx: rnd(-40, 40), vy: rnd(-110, -40), g: -40, s: rnd(4, 11), c: '#fff', life: rnd(0.6, 1.1), k: 'kopuk' }); },
    /* kazanılan altın keseye uçar; vardığında kese göstergesi bir kez zıplar */
    coins(from, n, to) { const a = pos(from), tgt = to || document.querySelector('#scr.acik #scrGold') || document.querySelector('#hud .tc .chip'), b = pos(tgt); n = Math.max(3, Math.min(14, n || 6));
      for (let i = 0; i < n; i++) add({ x: a[0], y: a[1], x0: a[0] + rnd(-30, 30), y0: a[1] + rnd(-20, 20), to: b, arc: rnd(40, 140), bow: rnd(-60, 60), s: rnd(5, 7), life: 0.6 + i * 0.06, k: 'altin', vr: rnd(3, 8), done: i === n - 1 ? () => { const e = tgt && (tgt.closest('.res2, .chip') || tgt); if (e) { e.classList.remove('zipla'); void e.offsetWidth; e.classList.add('zipla'); } if (EO2.audio) EO2.audio.chime(); } : null }); },
    /* uçan yazı: "+14 GÜÇ" gibi; DOM öğesidir, kendi kendine silinir */
    float(t, html, cls) { const [x, y] = pos(t), e = document.createElement('div'); e.className = 'ucan ' + (cls || ''); e.innerHTML = html; e.style.left = x + 'px'; e.style.top = y + 'px'; app.appendChild(e); setTimeout(() => e.remove(), 1500); },
    shake(el, k) { el = el || app; el.classList.remove('sars', 'sars2'); void el.offsetWidth; el.classList.add(k ? 'sars2' : 'sars'); setTimeout(() => el.classList.remove('sars', 'sars2'), 500); },
    flash(c) { const e = document.createElement('div'); e.className = 'parla'; if (c) e.style.background = c; app.appendChild(e); setTimeout(() => e.remove(), 450); },
    /* sayı sayarak yükselir */
    count(el, from, to, ms, fmt) { const t0 = performance.now(), f = t => { const k = Math.min(1, (t - t0) / (ms || 600)), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = fmt ? fmt(v) : v; if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); },
  };
  window.FXN = FX;
})();
