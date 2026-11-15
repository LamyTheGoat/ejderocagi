/* Ejder Ocağı fragmanı · efekt takımı
   Her şey zamanın saf işlevidir: parçacıkların durumu tutulmaz, t verilince konumları kapalı biçimde hesaplanır.
   Böylece fragman istenen saniyeye atlanabilir ve her kare, hangi hızda çizilirse çizilsin aynı çıkar. */
(function () {
  'use strict';
  const EO2 = window.EO2, FX = EO2.fx = {};
  const clamp = FX.clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = FX.lerp = (a, b, k) => a + (b - a) * k;
  FX.ss = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  FX.io = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;          // yumuşak giriş-çıkış
  FX.out = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3); FX.outExpo = k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(k, 0, 1));
  FX.outBack = k => { k = clamp(k, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  FX.v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rnd = FX.rnd = (i, j, seed) => { const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  // el kamerası salınımı: birkaç sinüsün toplamı, kesintisiz ve tekrar etmiyormuş gibi
  FX.sway = (t, amp, f = 1, s = 0) => [(Math.sin(t * 0.83 * f + s) + Math.sin(t * 1.71 * f + s * 2.3) * 0.5) * amp, (Math.sin(t * 0.61 * f + s * 1.7) + Math.sin(t * 1.33 * f + s) * 0.5) * amp * 0.6, (Math.sin(t * 0.97 * f + s * 3.1) + Math.sin(t * 2.13 * f + s) * 0.4) * amp * 0.8];
  FX.shake = (t, amp) => [Math.sin(t * 61.3) * amp, Math.sin(t * 47.9 + 1) * amp * 0.5, Math.sin(t * 73.1 + 2) * amp];

  /* ---------- parçacık dokuları (128 px hücreler) ---------- */
  FX.init = function (R) {
    const S = 128, COLS = 8, names = ['soft', 'core', 'streak', 'star', 'flake', 'shard', 'leaf', 'rock', 'wisp', 'ring', 'puff', 'beam', 'drop', 'white', 'ember', 'fire'], c = document.createElement('canvas'); c.width = S * COLS; c.height = S * 2; const x = c.getContext('2d');
    const rg = (cx, cy, r, stops) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const cell = { soft() { x.fillStyle = rg(64, 64, 62, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.62)'], [0.6, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, S, S); },
      core() { x.fillStyle = rg(64, 64, 40, [[0, '#fff'], [0.35, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, S, S); },
      streak() { x.save(); x.translate(64, 64); x.scale(1, 0.13); x.fillStyle = rg(0, 0, 62, [[0, '#fff'], [0.4, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(-64, -64, S, S); x.restore(); },
      star() { for (const a of [0, Math.PI / 2]) { x.save(); x.translate(64, 64); x.rotate(a); x.scale(1, 0.07); x.fillStyle = rg(0, 0, 62, [[0, '#fff'], [0.3, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(-64, -64, S, S); x.restore(); }
        x.fillStyle = rg(64, 64, 26, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, S, S); },
      flake() { x.strokeStyle = '#fff'; x.lineCap = 'round'; x.translate(64, 64); for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.lineWidth = 5; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -50); x.stroke(); x.lineWidth = 3.5; for (const d of [-22, -36]) { x.beginPath(); x.moveTo(-12, d - 10); x.lineTo(0, d); x.lineTo(12, d - 10); x.stroke(); } }
        x.setTransform(1, 0, 0, 1, 0, 0); },
      shard() { const g = x.createLinearGradient(30, 10, 100, 118); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#cfeaff'); g.addColorStop(1, '#7fb6ea'); x.fillStyle = g; x.beginPath(); x.moveTo(60, 4); x.lineTo(88, 40); x.lineTo(76, 122); x.lineTo(50, 96); x.lineTo(40, 44); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.moveTo(60, 4); x.lineTo(66, 58); x.lineTo(50, 96); x.lineTo(40, 44); x.closePath(); x.fill(); x.strokeStyle = 'rgba(70,120,190,.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(60, 4); x.lineTo(66, 58); x.lineTo(76, 122); x.stroke(); },
      leaf() { x.translate(64, 64); x.rotate(-0.5); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(-52, 0); x.quadraticCurveTo(-8, -40, 52, 0); x.quadraticCurveTo(-8, 40, -52, 0); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-50, 0); x.lineTo(50, 0); x.stroke();
        x.fillStyle = 'rgba(0,0,0,.16)'; x.beginPath(); x.moveTo(-52, 0); x.quadraticCurveTo(-8, 40, 52, 0); x.closePath(); x.fill(); x.setTransform(1, 0, 0, 1, 0, 0); },
      rock() { const g = x.createLinearGradient(20, 14, 100, 116); g.addColorStop(0, '#f2e6d8'); g.addColorStop(0.55, '#a8937f'); g.addColorStop(1, '#55453f'); x.fillStyle = g; x.beginPath(); x.moveTo(34, 18); x.lineTo(82, 8); x.lineTo(116, 46); x.lineTo(104, 98); x.lineTo(54, 120); x.lineTo(12, 84); x.lineTo(14, 44); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(40,26,30,.8)'; x.lineWidth = 4; x.stroke(); x.strokeStyle = 'rgba(40,26,30,.4)'; x.lineWidth = 3; x.beginPath(); x.moveTo(82, 8); x.lineTo(66, 58); x.lineTo(104, 98); x.moveTo(66, 58); x.lineTo(12, 84); x.stroke(); },
      wisp() { for (let i = 0; i < 14; i++) { const k = i / 13, px = 20 + k * 88, py = 64 + Math.sin(k * 5.2) * 26 * (1 - k * 0.4), r = 26 - k * 14; x.fillStyle = rg(px, py, r, [[0, 'rgba(255,255,255,.34)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, S, S); } },
      ring() { x.strokeStyle = '#fff'; x.lineWidth = 5; x.shadowColor = '#fff'; x.shadowBlur = 10; x.beginPath(); x.arc(64, 64, 50, 0, 6.3); x.stroke(); x.shadowBlur = 0; },
      puff() { let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = 0; i < 22; i++) { const a = r() * 6.3, d = r() * 30, px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d * 0.8, rr = 18 + r() * 20; x.fillStyle = rg(px, py, rr, [[0, 'rgba(255,255,255,.30)'], [0.6, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, S, S); } },
      beam() { const g = x.createLinearGradient(0, 0, S, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
        x.globalCompositeOperation = 'destination-in'; const m = x.createLinearGradient(0, 0, 0, S); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.25, '#000'); m.addColorStop(1, '#000'); x.fillStyle = m; x.fillRect(0, 0, S, S); x.globalCompositeOperation = 'source-over'; },
      drop() { const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.9)'); x.fillStyle = g; x.fillRect(61, 4, 6, 120); },
      white() { x.fillStyle = '#fff'; x.fillRect(0, 0, S, S); },
      ember() { x.fillStyle = rg(64, 64, 30, [[0, '#fff'], [0.3, 'rgba(255,240,200,.95)'], [1, 'rgba(255,160,60,0)']]); x.fillRect(0, 0, S, S); x.fillStyle = rg(64, 64, 62, [[0, 'rgba(255,140,40,.35)'], [1, 'rgba(255,90,20,0)']]); x.fillRect(0, 0, S, S); },
      fire() { const g = x.createLinearGradient(0, 120, 0, 8); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.3, '#ffc24a'); g.addColorStop(0.7, '#f0651f'); g.addColorStop(1, 'rgba(190,40,20,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(64, 6); x.bezierCurveTo(96, 44, 112, 76, 92, 108); x.bezierCurveTo(80, 126, 48, 126, 36, 108); x.bezierCurveTo(16, 76, 40, 52, 64, 6); x.fill(); } };
    FX.uv = {}; names.forEach((n, i) => { const cx = (i % COLS) * S, cy = Math.floor(i / COLS) * S; x.save(); x.beginPath(); x.rect(cx, cy, S, S); x.clip(); x.translate(cx, cy); cell[n](); x.restore(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
      FX.uv[n] = [(cx + 1.5) / c.width, (cy + 1.5) / c.height, (cx + S - 1.5) / c.width, (cy + S - 1.5) / c.height]; });
    FX.tex = R.texture(c); FX.R = R;
  };

  /* ---------- durumsuz parçacık yayıcı ----------
     o: n, seed, life, loop (sürekli akış) | t0 + spread (patlama), init(i, r) → [x, y, z, vx, vy, vz], g (z ivmesi), drag,
        wob (yanal salınım genliği), s0/s1 (boy), c0/c1 (renk), a (alfa), fin/fout (belirme, sönme), uv, add, rot: 'vel' | sayı, spin, stretch, tex */
  FX.emit = function (R, t, o) {
    const n = o.n, seed = o.seed || 1, life = o.life || 1, uv = o.uvRect || FX.uv[o.uv || 'soft'], tex = o.tex || FX.tex, g = o.g || 0, drag = o.drag || 0, add = o.add !== false, c0 = o.c0 || [1, 1, 1], c1 = o.c1 || c0, A = o.a === undefined ? 1 : o.a, fin = o.fin || 0.1, fout = o.fout || 1.5, s0 = o.s0 || 0.1, s1 = o.s1 === undefined ? s0 : o.s1, wob = o.wob || 0, st = o.stretch || 1, fogK = o.fog || 0;
    const rv = R.right, uvv = R.up;
    for (let i = 0; i < n; i++) {
      const r = j => rnd(i, j, seed), L = life * (0.55 + 0.9 * r(0)); let age;
      if (o.loop) { age = (((t + r(1) * L) % L) + L) % L; const born = t - age; if (o.t0 !== undefined && born < o.t0) continue; if (o.t1 !== undefined && born > o.t1) continue; }
      else { age = t - (o.t0 || 0) - r(1) * (o.spread || 0); if (age < 0 || age > L) continue; }
      const k = age / L, p = o.init(i, r, t - age), e = drag > 0 ? (1 - Math.exp(-drag * age)) / drag : age;
      let px = p[0] + p[3] * e, py = p[1] + p[4] * e, pz = p[2] + p[5] * e + 0.5 * g * age * age;
      if (wob) { const w = age * (o.wobF || 2) + r(5) * 6.28; px += Math.sin(w) * wob; py += Math.cos(w * 0.8) * wob; pz += Math.sin(w * 1.3 + 1) * wob * 0.5; }
      if (o.floor !== undefined && pz < o.floor) pz = o.floor;
      const al = A * Math.min(1, k / fin) * Math.pow(1 - k, fout) * (o.tw ? 0.6 + 0.4 * Math.sin(age * o.tw + r(6) * 6.28) : 1); if (al < 0.004) continue;
      const s = lerp(s0, s1, k) * (0.6 + 0.8 * r(2)); let rot = 0;
      if (o.rot === 'vel') { const dk = drag > 0 ? Math.exp(-drag * age) : 1, vx = p[3] * dk, vy = p[4] * dk, vz = p[5] * dk + g * age; rot = Math.atan2(vx * uvv[0] + vy * uvv[1] + vz * uvv[2], vx * rv[0] + vy * rv[1] + vz * rv[2]); }
      else if (o.rot !== undefined) rot = o.rot; if (o.spin) rot += r(3) * 6.28 + age * o.spin * (r(4) - 0.5) * 2;
      R.sprite(tex, [px, py, pz], s * st, s, uv, [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k), al], add, fogK, rot);
    }
  };
  FX.glow = (R, pos, s, col, a, uv) => R.sprite(FX.tex, pos, s, s, FX.uv[uv || 'soft'], [col[0], col[1], col[2], a], true, 0);

  /* ---------- şimşek: orta nokta kaydırmalı kırık çizgi, ince çekirdek ve geniş hâle ---------- */
  FX.bolt = function (R, a, b, seed, width, col, alpha, depth = 0) {
    let pts = [a, b]; for (let lv = 0; lv < 5; lv++) { const nx = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) * 0.17;
      nx.push([(p[0] + q[0]) / 2 + (rnd(i, lv, seed) - 0.5) * d * 2, (p[1] + q[1]) / 2 + (rnd(i, lv + 9, seed) - 0.5) * d, (p[2] + q[2]) / 2 + (rnd(i, lv + 17, seed) - 0.5) * d * 2], q); } pts = nx; }
    const f = R.fwd, uv = FX.uv.streak, u = [(uv[0] + uv[2]) / 2 - 0.004, uv[1], (uv[0] + uv[2]) / 2 + 0.004, uv[3]];
    for (const [w, c, al] of [[width * 7, col, alpha * 0.35], [width * 2.2, col, alpha * 0.8], [width, [1, 1, 1], alpha]]) for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
      let nx = dy * f[2] - dz * f[1], ny = dz * f[0] - dx * f[2], nz = dx * f[1] - dy * f[0]; const l = Math.hypot(nx, ny, nz) || 1, ww = w * (1 - 0.5 * i / pts.length) / l; nx *= ww; ny *= ww; nz *= ww;
      R.quad(FX.tex, [p[0] - nx, p[1] - ny, p[2] - nz], [p[0] + nx, p[1] + ny, p[2] + nz], [q[0] + nx, q[1] + ny, q[2] + nz], [q[0] - nx, q[1] - ny, q[2] - nz], u[0], u[1], u[2], u[3], [c[0], c[1], c[2], al], true, 0); }
    if (depth < 1) for (let k = 0; k < 2; k++) { const i = Math.floor(pts.length * (0.3 + 0.3 * k + rnd(k, 3, seed) * 0.15)), p = pts[i], q = pts[pts.length - 1], len = 0.35 + rnd(k, 4, seed) * 0.25;
      FX.bolt(R, p, [p[0] + (q[0] - p[0]) * len + (rnd(k, 5, seed) - 0.5) * 6, p[1], p[2] + (q[2] - p[2]) * len + (rnd(k, 6, seed) - 0.5) * 2], seed + 31 + k, width * 0.55, col, alpha * 0.7, 1); }
  };

  /* ---------- ejder panosu: ızgaraya bölünmüş, kanat ve kuyruk dalgalanır ----------
     o: pos (tutma noktasının dünya konumu), h (dünya boyu), ax/ay (tutma noktası, 0..1), flip, right/up (yön; verilmezse kameraya döner),
        flap: { amp, f, pivot: [u, v], pow, ph } — pivottan uzaklaştıkça artan dikey dalga; breathe; col; t */
  FX.dragon = function (R, tex, o) {
    const NX = o.nx || 14, NY = o.ny || 8, h = o.h, w = h * tex.w / tex.h, ax = o.ax === undefined ? 0.5 : o.ax, ay = o.ay === undefined ? 0.5 : o.ay, rv = o.right || R.right, uvv = o.up || R.up, fl = o.flap, t = o.t || 0, sx = o.flip ? -1 : 1, br = o.breathe || 0, col = o.col || [1, 1, 1, 1], pos = o.pos, sc = o.scale || [1, 1];
    const V = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY; let lx = (u - ax) * w * sc[0], ly = (ay - v) * h * sc[1];
      if (fl) { const du = u - fl.pivot[0], dv = v - fl.pivot[1], d = Math.abs(du), wv = Math.pow(d, fl.pow || 1.6), ph = t * fl.f - d * (fl.ph === undefined ? 4 : fl.ph); ly += Math.sin(ph) * fl.amp * h * wv * (1 - 0.5 * clamp(dv * 2, 0, 1)); lx += Math.cos(ph) * fl.amp * h * wv * 0.25 * Math.sign(du) * -1; }
      if (br) { ly += Math.sin(t * 1.5) * br * h * (1 - v) * 0.5; lx += Math.sin(t * 1.1 + v * 2) * br * h * 0.25 * (1 - v); }
      lx *= sx; V.push([pos[0] + rv[0] * lx + uvv[0] * ly, pos[1] + rv[1] * lx + uvv[1] * ly, pos[2] + rv[2] * lx + uvv[2] * ly]); }
    const u0 = o.uv ? o.uv[0] : 0, v0 = o.uv ? o.uv[1] : 0, du = (o.uv ? o.uv[2] - o.uv[0] : 1) / NX, dv = (o.uv ? o.uv[3] - o.uv[1] : 1) / NY, W1 = NX + 1;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) R.quad(tex, V[(j + 1) * W1 + i], V[(j + 1) * W1 + i + 1], V[j * W1 + i + 1], V[j * W1 + i], u0 + i * du, v0 + j * dv, u0 + (i + 1) * du, v0 + (j + 1) * dv, col, !!o.add, o.fog || 0);
  };
  // görseldeki bir noktanın (u, v) dünya konumu: ağız, kuyruk alevi gibi yayıcılar için
  FX.dragonPoint = function (R, tex, o, u, v) { const h = o.h, w = h * tex.w / tex.h, ax = o.ax === undefined ? 0.5 : o.ax, ay = o.ay === undefined ? 0.5 : o.ay, rv = o.right || R.right, uvv = o.up || R.up, lx = (u - ax) * w * (o.flip ? -1 : 1), ly = (ay - v) * h, p = o.pos;
    return [p[0] + rv[0] * lx + uvv[0] * ly, p[1] + rv[1] * lx + uvv[1] * ly, p[2] + rv[2] * lx + uvv[2] * ly]; };

  /* ---------- uzak plan levhası: −Y'ye bakan büyük pano ---------- */
  FX.plate = function (R, tex, cx, y, cz, w, col, uv) { const h = w * tex.h / tex.w, u = uv || [0, 0, 1, 1]; R.quad(tex, [cx - w / 2, y, cz - h / 2], [cx + w / 2, y, cz - h / 2], [cx + w / 2, y, cz + h / 2], [cx - w / 2, y, cz + h / 2], u[0], u[1], u[2], u[3], col || [1, 1, 1, 1], false, 0); };
  FX.plateFollow = function (R, tex, y, cz, w, col, k = 0.82) { const f = R.fwd, s = f[1] > 0.05 ? (y - R.eye[1]) / f[1] : 0; FX.plate(R, tex, (R.eye[0] + f[0] * s) * k, y, cz + (R.eye[2] + f[2] * s - cz) * k * 0.6, w, col); };
  FX.backdrop = function (R, tex, dist, w, zc, col, pan = 0.25) { const f = R.fwd, psi = Math.atan2(f[0], f[1]), pb = psi * (1 - pan), cx = R.eye[0] + Math.sin(pb) * dist, cy = R.eye[1] + Math.cos(pb) * dist, rx = Math.cos(psi) * w / 2, ry = -Math.sin(psi) * w / 2, h = w * tex.h / tex.w;
    R.quad(tex, [cx - rx, cy - ry, zc - h / 2], [cx + rx, cy + ry, zc - h / 2], [cx + rx, cy + ry, zc + h / 2], [cx - rx, cy - ry, zc + h / 2], 0, 0, 1, 1, col || [1, 1, 1, 1], false, 0); };
  // ekranı kaplayan düz renk ya da doku (NDC)
  FX.screen = function (R, tex, uv, col, add, x0 = -1, y0 = -1, x1 = 1, y1 = 1) { R.quad(tex, [x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], uv[0], uv[1], uv[2], uv[3], col, add, 0, true); };

  /* ---------- yazı: Alegreya SC, altın dolgu; dokuya bir kez çizilir ---------- */
  FX.text = function (R, str, o = {}) {
    const size = o.size || 110, font = (o.weight || 800) + ' ' + size + 'px ' + (o.font || '"Alegreya SC", "Alegreya", Georgia, serif'), c = document.createElement('canvas'), x = c.getContext('2d'), track = (o.track || 0) * size;
    const setup = () => { x.font = font; try { x.letterSpacing = track + 'px'; } catch (e) {} x.textBaseline = 'middle'; x.textAlign = 'left'; };
    setup(); const mw = x.measureText(str).width, pad = Math.round(size * 0.7); c.width = Math.ceil(mw + pad * 2); c.height = Math.ceil(size * 1.3 + pad * 2); setup(); const cy = c.height / 2 + size * 0.03;
    x.shadowColor = o.shadow || 'rgba(4,6,16,.9)'; x.shadowBlur = size * 0.3; x.fillStyle = 'rgba(4,6,16,.9)'; x.fillText(str, pad, cy + size * 0.03); x.fillText(str, pad, cy + size * 0.03); x.shadowColor = 'transparent'; x.shadowBlur = 0;
    if (o.plain) x.fillStyle = o.plain; else { const g = x.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5), cs = o.grad || ['#fff6d6', '#f3cd72', '#c58a34']; g.addColorStop(0, cs[0]); g.addColorStop(0.5, cs[1]); g.addColorStop(1, cs[2]); x.fillStyle = g; }
    x.lineJoin = 'round'; x.lineWidth = size * 0.045; x.strokeStyle = o.stroke || 'rgba(40,20,10,.75)'; x.strokeText(str, pad, cy); x.fillText(str, pad, cy);
    const t = R.texture(c); t.size = size; return t;
  };
  // cx, cy: NDC merkez; hN: yazı boyu (NDC, ekran yüksekliğinin yarısı = 1); a: alfa; sc: ölçek; al: -1 sol, 0 orta, 1 sağ
  FX.label = function (R, t, cx, cy, hN, a, sc = 1, al = 0, col) { if (a <= 0.003) return; const hh = hN * (t.h / t.size) * sc, ww = hh * (t.w / t.h) * (R.h / R.w), x0 = al < 0 ? cx - hN * 0.7 * sc * (R.h / R.w) : al > 0 ? cx - ww + hN * 0.7 * sc * (R.h / R.w) : cx - ww / 2, c = col || [1, 1, 1];
    R.quad(t, [x0, cy - hh / 2, 0], [x0 + ww, cy - hh / 2, 0], [x0 + ww, cy + hh / 2, 0], [x0, cy + hh / 2, 0], 0, 0, 1, 1, [c[0], c[1], c[2], a], false, 0, true); };
})();
