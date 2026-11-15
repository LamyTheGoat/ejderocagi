/* Ejder Ocağı fragmanı · sahneler
   Her sahne (lt: sahne içi saniye, k: 0..1, f: film ayarları, t: mutlak saniye) alır; kamerayı kurar ve kareyi çizer.
   Koordinatlar oyunla aynı: X doğu, Y kuzey (kameradan uzağa), Z yukarı; birim metre. */
(function () {
  'use strict';
  const EO2 = window.EO2, FX = EO2.fx, T = EO2.tr, { CUE, B } = T, { clamp, lerp, ss, io, out, outBack, outExpo, v3, rnd } = FX, PI = Math.PI, X = [1, 0, 0], Z = [0, 0, 1];
  T.assets = ['pl-harabe', 'pl-yanardag', 'pl-buzul', 'pl-bulut', 'pl-orman', 'pl-obsidiyen', 'pl-gunbatimi', 'pl-kayalik', 'pl-sahmeran', 'pl-komutan', 'sahmeran', 'yavru-on', 'ates-yavru', 'ates-genc', 'ates-yetiskin',
    'ates-P1', 'ates-P15', 'ates-P7', 'buz-P16', 'buz-P7', 'firtina-P7', 'toprak-P12', 'toprak-P7', 'golge-P9', 'golge-P7'];
  let R, W, tx, F;
  const view = (e, tg, fov, roll) => R.setView(e, tg, fov, roll || 0);
  const orbit = (c, r, deg, z) => [c[0] + Math.sin(deg * PI / 180) * r, c[1] - Math.cos(deg * PI / 180) * r, z];
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const artTex = g => { const t = R.texture(g.c || g); t.wm = g.wm; t.hm = g.hm; return t; };
  const flatQuad = (uv, x, y, z, rx, ry, col, add, tex) => R.quad(tex || FX.tex, [x - rx, y - ry, z], [x + rx, y - ry, z], [x + rx, y + ry, z], [x - rx, y + ry, z], uv[0], uv[1], uv[2], uv[3], col, add, 0);
  function embers(t, c, o = {}) { FX.emit(R, t, { n: o.n || 30, seed: o.seed || 3, life: o.life || 2.6, loop: true, uv: 'ember', s0: o.s || 0.1, s1: 0.03, c0: o.c0 || [1, 0.75, 0.35], c1: o.c1 || [1, 0.3, 0.08], a: o.a || 1, fout: 1.2, wob: o.wob === undefined ? 0.22 : o.wob, wobF: 1.7, tw: 9,
    init: (i, r) => [c[0] + (r(7) - 0.5) * (o.r || 0.5), c[1] + (r(8) - 0.5) * (o.r || 0.5), c[2] + r(9) * (o.rz || 0.3), (r(10) - 0.5) * 0.5 + (o.wx || 0), (r(11) - 0.5) * 0.3 + (o.wy || 0), (o.rise === undefined ? 1.1 : o.rise) + r(12) * 0.9] }); }
  // patlama: halka + kıvılcım
  function burst(t, t0, c, o = {}) { const age = t - t0; if (age < 0 || age > 1.6) return; const col = o.col || [1, 0.8, 0.4];
    if (age < 0.8) { const s = (o.ring || 6) * out(age / 0.8); flatQuad(FX.uv.ring, c[0], c[1], 0.03, s, s * 0.9, [col[0], col[1], col[2], (1 - age / 0.8) * 0.8], true); R.sprite(FX.tex, c, s * 0.9, s * 0.9, FX.uv.soft, [col[0], col[1], col[2], Math.pow(1 - age / 0.8, 2) * 0.9], true, 0); }
    FX.emit(R, t, { n: o.n || 70, seed: o.seed || 5, t0, life: 0.9, uv: 'streak', rot: 'vel', stretch: 2.4, s0: 0.22, s1: 0.05, c0: [1, 0.95, 0.7], c1: col, g: -4, drag: 2.2, fin: 0.02,
      init: (i, r) => { const a = r(7) * 6.283, e = (r(8) - 0.3) * 1.4, sp = (o.sp || 7) * (0.4 + r(9)); return [c[0], c[1], c[2], Math.cos(a) * Math.cos(e) * sp, Math.sin(a) * Math.cos(e) * sp * 0.6, Math.sin(e) * sp + 2]; } }); }

  /* ================= dekor: Ocak (gece, harabe, mangallar, uyuyan Kor, yuva) ================= */
  const KOR = { pos: [0.2, 9.9, 0], h: 3.9, ay: 0.96, right: X, up: Z }, EGG = [0.6, 7.27, 0.62];
  function defOcak() { EO2.sceneDefs.ocak = { L: { id: 'ocak', mapRect: [-40, -24, 80, 110], paved: [], shadows: [[0.2, 10.0, 5.4, 2.0, 0.85], [0.6, 7.4, 1.4, 0.7, 0.7], [-12, 17, 4, 2.4, 0.7], [13, 18, 4, 2.4, 0.7], [1.9, 6.6, 3.2, 1.2, 0.55]],
      braziers: [[-4.4, 6.6], [5.6, 7.4]], lights: [[-4.4, 6.6, 8.5, 1.15], [5.6, 7.4, 8.5, 1.15], [0.6, 7.2, 3.6, 0.5], [0.4, 10, 6, 0.35], [4.7, 5.3, 5, 0.3]] },
    build(h) { const art = h.art, bb = (t, x, y, o) => h.billboard(t, x, y, Object.assign({ occl: false }, o));
      bb(h.tex(art.boundary(9, 73)), -7.8, 13.4); bb(h.tex(art.boundary(6.5, 74)), 8.6, 13.9); bb(h.tex(art.lowWall(4.2, 71)), -6.4, 11.3); bb(h.tex(art.lowWall(3.4, 72)), 6.8, 11.6);
      for (const [x, y] of [[-12.5, 16.5], [13.5, 17.5]]) bb(h.tx.cinar, x, y, { sway: 0.05 }); for (const [x, y] of [[-4.6, 18], [3.4, 18.6], [9.2, 20], [-9.6, 20.5], [17.5, 22], [-18.5, 21], [24, 25], [-25, 26]]) bb(h.tx.selvi, x, y, { sway: 0.03 });
      for (const [x, y, s] of [[-2.9, 8.7, 1], [3.7, 8.9, 2], [-7.6, 7.5, 3], [8.8, 9.7, 4], [-1.6, 5.4, 5]]) bb(h.tex(art.rock(s * 13)), x, y);
      for (const b of this.L.braziers) bb(h.tx.braz, b[0], b[1]); bb(h.tex(art.nest(true)), 0.6, 7.3, { glowK: 0.6 }); } }; }
  const EGGCR = [[[128, 150], [112, 172], [134, 190], [118, 214]], [[128, 150], [150, 138], [160, 160], [184, 156]], [[118, 214], [96, 226], [104, 250], [82, 262]], [[134, 190], [160, 204], [154, 228], [176, 244]], [[128, 150], [120, 120], [138, 100], [126, 74]], [[112, 172], [84, 166], [70, 186], [48, 180]], [[176, 244], [168, 270], [188, 284], [126, 74], [108, 56], [118, 36]]];
  function eggTex(stage) { const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d');
    const egg = () => { x.beginPath(); x.moveTo(128, 14); x.bezierCurveTo(196, 14, 236, 150, 236, 208); x.bezierCurveTo(236, 270, 190, 306, 128, 306); x.bezierCurveTo(66, 306, 20, 270, 20, 208); x.bezierCurveTo(20, 150, 60, 14, 128, 14); x.closePath(); };
    egg(); const g = x.createRadialGradient(100, 120, 10, 128, 190, 190); g.addColorStop(0, '#a04c40'); g.addColorStop(0.5, '#5e2731'); g.addColorStop(1, '#2b1422'); x.fillStyle = g; x.fill(); x.save(); egg(); x.clip();
    x.strokeStyle = 'rgba(255,190,150,.17)'; x.lineWidth = 3; for (let row = 0; row < 11; row++) for (let i = -1; i < 9; i++) { x.beginPath(); x.arc(i * 34 + (row % 2) * 17, 30 + row * 27, 17, 0.15, PI - 0.15); x.stroke(); }
    const a = x.createLinearGradient(0, 0, 0, 320); a.addColorStop(0, 'rgba(125,135,165,.40)'); a.addColorStop(0.6, 'rgba(60,60,90,.1)'); a.addColorStop(1, 'rgba(10,5,20,.45)'); x.fillStyle = a; x.fillRect(0, 0, 256, 320);     // soğuma: üstte kül grisi
    x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.ellipse(92, 96, 24, 44, -0.35, 0, 6.3); x.fill();
    x.lineJoin = 'round'; x.lineCap = 'round'; for (let j = 0; j < stage; j++) for (const [w, col, blur] of [[9, 'rgba(255,130,30,.55)', 18], [4, '#fff3bd', 8]]) { x.shadowColor = '#ff8a20'; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = w; x.beginPath(); EGGCR[j].forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }
    x.restore(); x.shadowBlur = 0; egg(); x.lineWidth = 7; x.strokeStyle = '#1c0d16'; x.stroke(); return R.texture(c); }
  let eggs = [];
  const korItem = (t, n) => ({ key: KOR.pos[1], draw() { const o = Object.assign({ breathe: 0.011, t, col: [lerp(1, 0.95, n), lerp(1, 0.62, n), lerp(1, 0.5, n), 1] }, KOR), tex = tx['ates-P15']; FX.dragon(R, tex, o);
    const fl = FX.dragonPoint(R, tex, o, 0.95, 0.6), no = FX.dragonPoint(R, tex, o, 0.845, 0.7); FX.glow(R, add3(fl, [0, -0.05, 0]), 2.2 + Math.sin(t * 11) * 0.2, [1, 0.5, 0.15], 0.55 + n * 0.25);
    FX.emit(R, t, { n: 5, seed: 41, life: 2.8, loop: true, uv: 'puff', add: false, c0: [0.55, 0.55, 0.6], a: 0.3, s0: 0.2, s1: 0.9, fin: 0.2, init: (i, r) => [no[0], no[1] - 0.05, no[2], 0.3, 0, 0.42 + r(7) * 0.2] }); } });
  function ocak(t, o) { const sc = T.area('ocak'), n = o.night, fog = [lerp(0.95, 0.035, n), lerp(0.80, 0.045, n), lerp(0.68, 0.11, n), 0.94];
    T.drawArea(sc, { night: Math.max(n, 0.3), time: t, amb: [lerp(1.0, 0.27, n), lerp(0.98, 0.30, n), lerp(0.95, 0.52, n)], fog, fogR: [14, 85], far: 99, clear: [fog[0], fog[1], fog[2]], items: [korItem(t, n), ...(o.items || [])],
      pre() { FX.backdrop(R, tx['pl-harabe'], 98, 200, 42.75, [1, 1, 1, 1], 0.22); if (o.dawn > 0) FX.backdrop(R, tx['pl-gunbatimi'], 97.6, 200, 33.75, [1, 1, 1, o.dawn], 0.22); } });
    for (const b of sc.L.braziers) embers(t, [b[0], b[1], 1.3], { n: 22, seed: b[0] + 9 });
    FX.emit(R, t, { n: 26, seed: 77, life: 5, loop: true, uv: 'soft', s0: 0.14, c0: [0.75, 1, 0.4], a: 0.75 * n, tw: 3, wob: 0.6, wobF: 0.8, init: (i, r) => [(r(7) - 0.5) * 36, 9 + r(8) * 14, 0.5 + r(9) * 3, 0, 0, 0.05] }); }      // ateş böcekleri
  const eggItem = (t, stage, heat, shk) => ({ key: EGG[1], draw() { const pulse = 0.5 + 0.5 * Math.pow(Math.abs(Math.sin(t * PI / 1.2)), 6);
    FX.glow(R, add3(EGG, [0, 0.03, 0.05]), 1.6 + heat * 2.6, [1, 0.45, 0.12], (0.12 + 0.2 * pulse) * (1 + heat * 2.5));
    R.sprite(eggs[stage], [EGG[0] + Math.sin(t * 37) * 0.012 * shk, EGG[1], EGG[2]], 0.6, 0.75, [0, 0, 1, 1], [0.9 + heat * 0.4, 0.78 + heat * 0.4, 0.74 + heat * 0.3, 1], false, 0, Math.sin(t * 29) * 0.07 * shk, 0.5, 0.12);
    if (heat > 0.2) FX.glow(R, add3(EGG, [0, -0.03, 0.2]), 0.9 + heat, [1, 0.8, 0.45], heat * 0.5, 'core'); } });

  /* ================= dekor: düello yaylası ================= */
  const DU = { px: -10, ex: 10, Y: 1.2, hit: 8.2, K: 1.7 / 270, G: 14 };
  const hT0 = x => 1.5 + 0.7 * Math.sin(x * 0.25 + 0.4) + 0.4 * Math.sin(x * 0.67 + 1.7) + 1.5 * Math.exp(-Math.pow(x / 3.4, 2));
  const bowl = x => { const d = (x - DU.hit) / 1.8; return d * d < 1 ? 1.05 * Math.sqrt(1 - d * d) : 0; }, hT = (x, after) => hT0(x) - (after ? bowl(x) : 0);
  function duelFace(after) { const PX = 64, x0 = -24, x1 = 24, z0 = -7, z1 = 5.5, c = document.createElement('canvas'); c.width = (x1 - x0) * PX; c.height = (z1 - z0) * PX; const g = c.getContext('2d'), Xp = v => (v - x0) * PX, Zp = z => (z1 - z) * PX;
    const top = () => { for (let v = x0; v <= x1 + 0.01; v += 0.1) v === x0 ? g.moveTo(Xp(v), Zp(hT(v, after))) : g.lineTo(Xp(v), Zp(hT(v, after))); };
    g.beginPath(); top(); g.lineTo(Xp(x1), Zp(z0)); g.lineTo(Xp(x0), Zp(z0)); g.closePath(); const gr = g.createLinearGradient(0, Zp(3.6), 0, Zp(z0)); gr.addColorStop(0, '#cfa987'); gr.addColorStop(0.35, '#a17d70'); gr.addColorStop(1, '#4a3a58'); g.fillStyle = gr; g.fill(); g.save(); g.clip();
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let b = 0; b < 10; b++) { g.beginPath(); const y0 = -6 + b * 1.0; for (let v = x0; v <= x1; v += 0.5) { const yy = y0 + Math.sin(v * 0.4 + b) * 0.3 + Math.sin(v * 1.3 + b * 2) * 0.1; v === x0 ? g.moveTo(Xp(v), Zp(yy)) : g.lineTo(Xp(v), Zp(yy)); } g.lineWidth = PX * (0.16 + (b % 3) * 0.1); g.strokeStyle = b % 2 ? 'rgba(70,40,70,.17)' : 'rgba(255,230,200,.11)'; g.stroke(); }
    g.strokeStyle = 'rgba(58,37,48,.3)'; g.lineWidth = 2.5; for (let i = 0; i < 150; i++) { const bx = x0 + r() * (x1 - x0), by = -6 + r() * 9; g.beginPath(); g.moveTo(Xp(bx), Zp(by)); g.lineTo(Xp(bx + (r() - 0.5) * 0.5), Zp(by - 0.3 - r() * 0.7)); g.lineTo(Xp(bx + (r() - 0.5) * 0.8), Zp(by - 0.9 - r() * 0.6)); g.stroke(); }
    for (const [wx0, wx1, depth, rows] of [[-21, -14.5, 0.9, 3], [-6, 5, 1.1, 4], [13, 20, 1.0, 3], [-12.5, -8, 2.6, 2], [6.5, 11, 3.0, 2]]) for (let row = 0; row < rows; row++) { let bx = wx0 + (row % 2) * 0.45 + r() * 0.2; while (bx < wx1) { const bw = 0.75 + r() * 0.55, by = hT0(bx + bw / 2) - depth - row * 0.52;      // gömülü kesme taş kalıntıları
      g.fillStyle = ['#e9dcc6', '#dccbb2', '#efe4d2'][Math.floor(r() * 3)]; g.beginPath(); g.roundRect(Xp(bx), Zp(by), bw * PX - 4, 0.48 * PX, 5); g.fill(); g.strokeStyle = 'rgba(58,37,48,.55)'; g.lineWidth = 2.5; g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(Xp(bx) + 4, Zp(by) + 3, bw * PX - 12, 4); bx += bw; } }
    if (after) { const sc = g.createRadialGradient(Xp(DU.hit), Zp(hT0(DU.hit) - 0.4), 10, Xp(DU.hit), Zp(hT0(DU.hit) - 0.4), 3.3 * PX); sc.addColorStop(0, 'rgba(18,8,10,.92)'); sc.addColorStop(0.55, 'rgba(30,14,14,.6)'); sc.addColorStop(1, 'rgba(30,14,14,0)'); g.fillStyle = sc; g.fillRect(0, 0, c.width, c.height); }
    g.restore(); g.lineJoin = 'round'; const cap = (xa, xb) => { for (let v = xa; v <= xb + 0.01; v += 0.1) v === xa ? g.moveTo(Xp(v), Zp(hT(v, after))) : g.lineTo(Xp(v), Zp(hT(v, after))); }; for (const [w, col, dy] of [[26, '#3c6b35', 6], [13, '#6fae45', -1], [5, '#a8d868', -5]]) { g.save(); g.translate(0, dy); g.beginPath(); if (after) { cap(x0, DU.hit - 1.75); cap(DU.hit + 1.75, x1); } else cap(x0, x1); g.lineWidth = w; g.strokeStyle = col; g.stroke(); g.restore(); }
    g.globalCompositeOperation = 'destination-out'; const fd = g.createLinearGradient(0, Zp(-2.5), 0, Zp(z0)); fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = fd; g.fillRect(0, Zp(-2.5), c.width, c.height); return R.texture(c); }
  function ridgeTex(seed, c0, c1) { const c = document.createElement('canvas'); c.width = 2048; c.height = 400; const g = c.getContext('2d'); g.beginPath(); g.moveTo(0, 400); for (let i = 0; i <= 128; i++) { const u = i / 128, h = 0.35 + 0.28 * Math.sin(u * 9 + seed) + 0.16 * Math.sin(u * 23 + seed * 2) + 0.1 * Math.abs(Math.sin(u * 51 + seed)) ; g.lineTo(u * 2048, 400 - h * 400 * (0.75 + 0.25 * Math.sin(u * PI))); }
    g.lineTo(2048, 400); g.closePath(); const gr = g.createLinearGradient(0, 60, 0, 400); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fill(); return R.texture(c); }
  let duel = null;
  function buildDuel() { const m = EO2_BATTLE.sets.temel, mz = a => m.muzzle[String(a)], pz = hT0(DU.px), m0 = [DU.px + mz(40)[0] * DU.K, DU.Y - 0.02, pz + mz(40)[1] * DU.K], th = 40 * PI / 180; let lo = 5, hi = 45;
    for (let i = 0; i < 50; i++) { const v = (lo + hi) / 2, tt = (DU.hit - m0[0]) / (v * Math.cos(th)), z = m0[2] + v * Math.sin(th) * tt - 0.5 * DU.G * tt * tt; if (z > hT0(DU.hit)) hi = v; else lo = v; }
    const v = (lo + hi) / 2; duel = { faceA: duelFace(0), faceB: duelFace(1), r1: ridgeTex(1.3, '#5b3760', '#a5625f'), r2: ridgeTex(4.1, '#7a4a6a', '#c98a6c'), rocks: [31, 57, 83].map(s => artTex(EO2.art.rock(s))), v, m0, Tf: (DU.hit - m0[0]) / (v * Math.cos(th)),
      path(s, ang = 40, from) { const a = ang * PI / 180, o = from || m0; return [o[0] + v * Math.cos(a) * s, DU.Y - 0.02, o[2] + v * Math.sin(a) * s - 0.5 * DU.G * s * s]; }, muzzle(ang) { const q = clamp(Math.round(ang / 5) * 5, -10, 70), p = mz(q); return [DU.px + p[0] * DU.K, DU.Y - 0.02, pz + p[1] * DU.K]; } }; }
  function actor(set, x, face, frame, z) { const st = T.bsets[set], m = st.m, i = m.frames[frame], col = i % m.cols, row = Math.floor(i / m.cols), K = DU.K, u0 = (col * m.cw + 0.5) / m.w, u1 = ((col + 1) * m.cw - 0.5) / m.w, v0 = (row * m.ch + 0.5) / m.h, v1 = ((row + 1) * m.ch - 0.5) / m.h;
    const xa = x - face * m.ax * K, xb = xa + face * m.cw * K, zb = z - (m.ch - m.ay) * K, sh = W.T.fxMap.shadow; flatQuad(sh, x, DU.Y, z + 0.03, 1.0, 0.5, [1, 1, 1, 0.55], false, W.T.fx);
    R.quad(st.tex, [xa, DU.Y, zb], [xb, DU.Y, zb], [xb, DU.Y, zb + m.ch * K], [xa, DU.Y, zb + m.ch * K], u0, v0, u1, v1, [1, 0.96, 0.92, 1], false, 0); }
  /* o: after (krater), pf/ef (kareler), ek (düşmanın geri savrulması) */
  function duelDraw(t, o) { const fog = [0.36, 0.20, 0.33], wh = FX.uv.white, D = duel; R.begin(fog); R.setFog([fog[0], fog[1], fog[2], 0.6], [30, 120]);
    FX.backdrop(R, tx['pl-kayalik'], 125, 230, 40, [1, 1, 1, 1], 0.3);
    R.quad(D.r2, [-150, 72, -14], [150, 72, -14], [150, 72, 14], [-150, 72, 14], 0, 0, 1, 1, [0.8, 0.7, 0.8, 1], false, 1); R.quad(D.r1, [-95, 42, -10], [95, 42, -10], [95, 42, 8], [-95, 42, 8], 0, 0, 1, 1, [0.62, 0.5, 0.62, 1], false, 1);
    FX.emit(R, t, { n: 22, seed: 12, life: 9, loop: true, uv: 'puff', add: false, c0: [0.7, 0.45, 0.58], a: 0.1, s0: 14, s1: 20, fin: 0.3, init: (i, r) => [-70 + r(7) * 140, 18 + r(8) * 16, -7 + r(9) * 6, 1.6, 0, 0] });       // vadideki pus
    for (const [ya, yb, kk] of [[2.2, 4.6, 0.8], [0, 2.2, 1]]) for (let x = -24; x < 24; x += 0.5) { const h0 = hT(x, o.after), h1 = hT(x + 0.5, o.after), sl = (h1 - h0) / 0.5, sc = o.after ? clamp(1.25 - Math.abs(x + 0.25 - DU.hit) / 2.2, 0, 1) : 0, s = clamp(0.95 - sl * 0.32, 0.6, 1.2) * kk * (Math.round(x * 2) % 2 ? 0.93 : 1) * (0.94 + 0.12 * rnd(Math.round(x * 2), ya, 5));
      R.quad(FX.tex, [x, ya, h0], [x + 0.5, ya, h1], [x + 0.5, yb, h1], [x, yb, h0], wh[0], wh[1], wh[2], wh[3], [lerp(0.42, 0.24, sc) * s, lerp(0.62, 0.17, sc) * s, lerp(0.27, 0.14, sc) * s, 1], false, 0.4); }
    for (let i = 0; i < 150; i++) { const x = -24 + i * 0.32 + rnd(i, 1, 3) * 0.2, y = i % 3 ? 4.6 : 2.4 + rnd(i, 4, 3), h = hT(x, o.after); if (o.after && Math.abs(x - DU.hit) < 1.9) continue; R.sprite(FX.tex, [x, y, h], 0.2, 0.55 + rnd(i, 2, 3) * 0.3, FX.uv.leaf, [0.34, 0.56, 0.24, 1], false, 0.3, PI / 2 + Math.sin(t * 2 + i) * 0.12 + (rnd(i, 3, 3) - 0.5) * 0.5, 0.5, 0); }
    R.quad(o.after ? D.faceB : D.faceA, [-24, 0, -7], [24, 0, -7], [24, 0, 5.5], [-24, 0, 5.5], 0, 0, 1, 1, [0.84, 0.78, 0.77, 1], false, 0.15);
    for (let i = 0; i < 140; i++) { const x = -24 + i * 0.345 + rnd(i, 5, 3) * 0.2; if (o.after && Math.abs(x - DU.hit) < 1.9) continue; R.sprite(FX.tex, [x, -0.02, hT(x, o.after) - 0.05], 0.18, 0.4 + rnd(i, 6, 3) * 0.3, FX.uv.leaf, [0.45, 0.70, 0.30, 1], false, 0, PI / 2 + Math.sin(t * 2.3 + i) * 0.14 + (rnd(i, 7, 3) - 0.5) * 0.6, 0.5, 0); }
    actor('muhafiz', DU.ex + (o.ek || 0), -1, o.ef || 'idle', hT0(DU.ex)); actor('temel', DU.px, 1, o.pf || 'idle', hT0(DU.px));
    D.rocks.forEach((rk, i) => { const [x, y] = [[-18.5, -3.2], [17, -3.6], [-30, -5]][i], w = rk.wm * 1.7, h = rk.hm * 1.7; R.quad(rk, [x - w / 2, y, -0.6], [x + w / 2, y, -0.6], [x + w / 2, y, h - 0.6], [x - w / 2, y, h - 0.6], 0, 0, 1, 1, [0.42, 0.32, 0.40, 1], false, 0); });
    FX.emit(R, t, { n: 36, seed: 21, life: 1.7, loop: true, uv: 'streak', s0: 1.3, stretch: 2.6, c0: [1, 0.9, 0.85], a: 0.2, init: (i, r) => [-26 + r(7) * 44, -3 + r(8) * 7, 1.5 + r(9) * 9, 10, 0, -0.2] }); }                                  // rüzgâr

  /* ================= elementler ================= */
  const EL = [
    { name: 'ATEŞ', plate: 'pl-yanardag', d: 'ates-P1', h: 5.2, z: 5.4, flap: { amp: 0.05, f: 5.5, pivot: [0.6, 0.62], pow: 1.5 }, grad: ['#fff3c0', '#ffb040', '#e2491c'], glow: [1, 0.42, 0.1], tint: [1.06, 0.97, 0.9],
      cam: k => [[lerp(-6, 1, k), lerp(-18, -14, k), lerp(3.0, 4.4, k)], [2.6, 0, 5.2], 36, 0] },
    { name: 'BUZ', plate: 'pl-buzul', d: 'buz-P16', h: 9, z: 5.2, flap: { amp: 0.035, f: 3.2, pivot: [0.72, 0.55], pow: 1.5 }, grad: ['#ffffff', '#bfe6ff', '#4f9fe0'], glow: [0.5, 0.8, 1], tint: [0.95, 1, 1.06],
      cam: k => [[lerp(6, 3.2, k), lerp(-17, -13, k), lerp(1.2, 1.8, k)], [0, 0, 5.6], 38, 0] },
    { name: 'FIRTINA', plate: 'pl-bulut', d: 'firtina-P7', h: 7, z: 5, flap: { amp: 0.05, f: 4.2, pivot: [0.5, 0.45], pow: 1.4 }, grad: ['#fff8d8', '#f2c94c', '#8a5cf0'], glow: [0.6, 0.4, 1], tint: [0.98, 0.96, 1.06],
      cam: k => [[lerp(0.5, -2.5, k), lerp(-11.5, -16.5, k), lerp(3.6, 5, k)], [0, 0, 5], 38, lerp(0.05, -0.03, k)] },
    { name: 'TOPRAK', plate: 'pl-orman', d: 'toprak-P12', h: 6.2, z: 0, ay: 0.97, flap: { amp: 0.014, f: 2.2, pivot: [0.45, 0.6], pow: 1.2 }, grad: ['#f6ffd8', '#b5d86a', '#5c8a34'], glow: [0.7, 0.9, 0.3], tint: [1.02, 1.02, 0.95],
      cam: k => [orbit([0.5, 0, 0], lerp(15.5, 13, k), lerp(-17, 5, k), 2.0), [0.8, 0, 3.3], 36, 0] },
    { name: 'GÖLGE', plate: 'pl-obsidiyen', d: 'golge-P9', h: 8.5, z: 5.2, flap: { amp: 0.03, f: 3, pivot: [0.45, 0.5], pow: 1.5 }, grad: ['#f3e6ff', '#b98cff', '#5a2aa8'], glow: [0.55, 0.2, 1], tint: [0.96, 0.92, 1.08],
      cam: k => [[lerp(-3.5, -1.4, k), lerp(-18, -12.5, k), lerp(6.2, 5, k)], [0, 0, 5.3], 36, lerp(-0.04, 0.02, k)] }];
  function element(i, lt, k, f, t) { const E = EL[i], c = E.cam(io(k)), tex = tx[E.d], sw = FX.sway(t, 0.12, 1, i);
    R.begin([0.02, 0.02, 0.04]); R.setFog([0, 0, 0, 0], [1e4, 2e4]); view(add3(c[0], sw), c[1], c[2], c[3]);
    const dr = { pos: [0, 0, E.z + (E.ay ? 0 : Math.sin(t * 2.1 + i) * 0.22)], h: E.h, ay: E.ay === undefined ? 0.5 : E.ay, right: X, up: Z, flap: E.flap, breathe: E.ay ? 0.008 : 0, t, nx: 18, ny: 10 };
    let flashK = 0; f.tint = E.tint;
    if (i === 2) for (const ts of [0.25, 0.8, 1.25, 1.85]) { const a = lt - ts; if (a >= 0 && a < 0.3) flashK = Math.max(flashK, (a < 0.05 ? 1 : 1 - (a - 0.05) / 0.25) * (ts === 0.25 || ts === 1.25 ? 1 : 0.5)); }
    const pk = 1 + flashK * 0.7; FX.backdrop(R, tx[E.plate], 84, 158, 12, [pk, pk, pk, 1], 0.3);
    const P = (u, v) => FX.dragonPoint(R, tex, dr, u, v);
    if (i === 0) { embers(t, [0, 3, -4], { n: 130, seed: 31, r: 44, rz: 16, life: 3.6, s: 0.16, wx: 0.8 }); }
    if (i === 1) { FX.emit(R, t, { n: 260, seed: 8, life: 4, loop: true, uv: 'soft', s0: 0.13, c0: [0.9, 0.96, 1], a: 0.75, wob: 0.3, init: (j, r) => [(r(7) - 0.5) * 50 + 6, (r(8) - 0.5) * 22, 4 + r(9) * 20, -2.4, 0, -3.4] }); }
    if (i === 2) { [0.25, 0.8, 1.25, 1.85].forEach((ts, j) => { const a = lt - ts; if (a < 0 || a > 0.3) return; const al = (a < 0.05 ? 1 : 1 - (a - 0.05) / 0.25) * (Math.sin(a * 150) > -0.3 ? 1 : 0.35), bx = [-7, 9, 5, -10][j];
        FX.bolt(R, [bx + 2, 9, 30], [bx, 7, -9], 11 + j * 7 + (a > 0.13 ? 1 : 0), j % 2 ? 0.08 : 0.13, [0.75, 0.6, 1], al); });
      FX.emit(R, t, { n: 30, seed: 9, life: 6, loop: true, uv: 'puff', add: false, c0: [0.25, 0.2, 0.38], a: 0.5, s0: 12, s1: 16, fin: 0.3, init: (j, r) => [-40 + r(7) * 80, 6 + r(8) * 10, 9 + r(9) * 9, 3, 0, 0] }); }
    if (i === 3) flatQuad(FX.uv.soft, 0.3, 0, 0.02, 6.5, 2.4, [0, 0, 0, 0.5], false);
    if (i === 4) { FX.emit(R, t, { n: 16, seed: 14, life: 4.5, loop: true, uv: 'puff', c0: [0.3, 0.1, 0.55], a: 0.3, s0: 9, s1: 13, fin: 0.3, init: (j, r) => [(r(7) - 0.5) * 30, 2 + r(8) * 4, 1 + r(9) * 9, 0.6, 0, 0.3] });
      for (let j = 3; j >= 1; j--) FX.dragon(R, tex, Object.assign({}, dr, { pos: [-1.1 * j * (0.6 + 0.4 * Math.sin(t * 1.3)), 0.3 * j, dr.pos[2] + 0.15 * j], t: t - j * 0.12, scale: [1 + 0.05 * j, 1 + 0.05 * j], col: [0.5, 0.22, 1, 0.26 - 0.06 * j], add: true })); }
    FX.glow(R, [0, 0.4, dr.pos[2] + (E.ay ? E.h * 0.45 : 0)], E.h * 2.6, E.glow, (i === 1 ? 0.1 : 0.22) + flashK * 0.3);
    FX.dragon(R, tex, Object.assign({ col: [pk, pk, pk, 1] }, dr));
    if (i === 0) { const m = P(0.985, 0.665), tf = P(0.03, 0.62), t0 = CUE.el[0] + 0.3, t1 = CUE.el[0] + 2.25; FX.glow(R, tf, 2.4 + Math.sin(t * 13) * 0.3, [1, 0.5, 0.12], 0.8);
      FX.emit(R, t, { n: 210, seed: 2, life: 0.8, loop: true, t0, t1, uv: 'puff', s0: 0.5, s1: 3.4, c0: [1, 0.8, 0.4], c1: [0.9, 0.16, 0.03], a: 0.55, fout: 1.3, drag: 1.1, init: (j, r) => [m[0], m[1], m[2], 13 + r(7) * 8, (r(8) - 0.5) * 2.6, (r(9) - 0.5) * 3.2 - 1.2] });
      FX.emit(R, t, { n: 70, seed: 4, life: 0.5, loop: true, t0, t1, uv: 'soft', s0: 0.5, s1: 1.5, c0: [1, 1, 0.8], c1: [1, 0.7, 0.25], a: 0.75, drag: 1.1, init: (j, r) => [m[0], m[1], m[2], 15 + r(7) * 6, (r(8) - 0.5) * 1.4, (r(9) - 0.5) * 1.6 - 1.2] });
      FX.emit(R, t, { n: 80, seed: 6, life: 0.9, loop: true, t0, t1, uv: 'streak', rot: 'vel', stretch: 2.5, s0: 0.3, s1: 0.08, c0: [1, 0.9, 0.5], c1: [1, 0.4, 0.1], g: -5, drag: 0.8, init: (j, r) => [m[0], m[1], m[2], 12 + r(7) * 10, (r(8) - 0.5) * 5, (r(9) - 0.5) * 7] });
      if (t > t0) FX.glow(R, m, 3 + Math.sin(t * 40) * 0.4, [1, 0.7, 0.3], 0.7); }
    if (i === 1) { const t0 = CUE.el[1] + 0.1;
      FX.emit(R, t, { n: 38, seed: 3, t0, life: 1.9, uv: 'shard', add: false, s0: 0.75, s1: 0.5, spin: 5, g: -7, fout: 0.6, fin: 0.03, init: (j, r) => { const a = r(7) * 6.283, sp = 6 + r(8) * 8; return [0, -0.3, 5.2, Math.cos(a) * sp, -1 - r(9) * 2, Math.sin(a) * sp * 0.8 + 3]; } });
      FX.emit(R, t, { n: 56, seed: 5, life: 3.2, loop: true, uv: 'flake', s0: 0.36, spin: 1.4, c0: [0.9, 0.97, 1], a: 0.7, wob: 0.4, init: (j, r) => [(r(7) - 0.5) * 24 + 4, -3 - r(8) * 6, 3 + r(9) * 12, -2.2, 0, -2.6] });
      FX.emit(R, t, { n: 20, seed: 7, life: 1.0, loop: true, uv: 'star', s0: 1.3, s1: 0.3, c0: [0.8, 0.95, 1], a: 0.9, fin: 0.3, init: (j, r) => { const p = P(0.12 + r(7) * 0.8, 0.1 + r(8) * 0.75); return [p[0], p[1] - 0.1, p[2], 0, 0, 0]; } });
      const hd = P(0.985, 0.27); FX.emit(R, t, { n: 22, seed: 9, life: 2.2, loop: true, uv: 'puff', add: false, c0: [0.86, 0.94, 1], a: 0.26, s0: 0.8, s1: 4.5, fin: 0.2, init: (j, r) => [hd[0], hd[1] - 0.1, hd[2], 3 + r(7) * 2, 0, (r(8) - 0.5) * 1.2] }); }
    if (i === 2) { FX.emit(R, t, { n: 420, seed: 3, life: 0.6, loop: true, uv: 'drop', s0: 1.7, c0: [0.7, 0.75, 1], a: 0.32, rot: -0.14, fin: 0.05, fout: 0.3, init: (j, r) => [(r(7) - 0.5) * 46, -9 + r(8) * 14, 21, -5, 0, -40] });
      const sd = Math.floor(t * 16); for (let j = 0; j < 3; j++) { const a = P(rnd(j, 1, sd), 0.1 + rnd(j, 2, sd) * 0.5), b = P(rnd(j, 3, sd), 0.2 + rnd(j, 4, sd) * 0.6); a[1] -= 0.15; b[1] -= 0.15; FX.bolt(R, a, b, sd + j, 0.03, [0.85, 0.75, 1], 0.55 + flashK * 0.4, 1); }
      if (flashK > 0) { f.expo = 1 + flashK * 0.55; T.dip(f, flashK * 0.22, [0.85, 0.8, 1]); } }
    if (i === 3) { const mo = P(0.955, 0.40);
      FX.emit(R, t, { n: 16, seed: 3, life: 2.2, loop: true, uv: 'puff', add: false, c0: [0.72, 0.64, 0.5], a: 0.3, s0: 1.2, s1: 3.6, fin: 0.2, init: (j, r) => [0.5 + (r(7) - 0.5) * 9, -0.6, 0.3, (r(8) - 0.5) * 2.2, 0, 0.5] });
      FX.emit(R, t, { n: 26, seed: 5, life: 3.4, loop: true, uv: 'rock', add: false, s0: 0.75, s1: 0.6, spin: 1.3, c0: [0.86, 0.8, 0.7], fin: 0.12, fout: 0.7, init: (j, r) => [(r(7) - 0.5) * 18, -1.5 + (r(8) - 0.5) * 6, -0.6, (r(9) - 0.5) * 0.4, 0, 1.5 + r(10) * 1.4] });
      FX.emit(R, t, { n: 120, seed: 7, life: 3, loop: true, uv: 'leaf', add: false, s0: 0.3, spin: 6, c0: [0.5, 0.78, 0.26], c1: [0.85, 0.75, 0.2], a: 0.95, wob: 1.2, wobF: 2.2, init: (j, r) => [(r(7) - 0.5) * 26 - 3, -4 + (r(8) - 0.5) * 9, r(9) * 9, 2.4, 0, 0.5] });
      FX.emit(R, t, { n: 50, seed: 9, life: 3, loop: true, uv: 'soft', s0: 0.14, c0: [1, 0.95, 0.5], a: 0.8, tw: 5, wob: 0.5, init: (j, r) => [(r(7) - 0.5) * 24, -5 + r(8) * 8, r(9) * 8, 0.4, 0, 0.25] });
      for (const ts of [0.35, 0.6, 0.85]) { const a = lt - ts; if (a > 0 && a < 0.9) R.sprite(FX.tex, add3(mo, [a * 5, -0.2, a * 1.5]), 1 + a * 9, 1 + a * 9, FX.uv.ring, [0.9, 1, 0.6, (1 - a / 0.9) * 0.55], true, 0); } }
    if (i === 4) { FX.emit(R, t, { n: 46, seed: 3, life: 2.6, loop: true, uv: 'wisp', add: false, c0: [0.07, 0.02, 0.13], a: 0.75, s0: 2.4, s1: 4.6, spin: 0.7, wob: 1.1, fin: 0.25, init: (j, r) => [(r(7) - 0.5) * 17, -0.6 - r(8) * 2, 0.5 + r(9) * 10, (r(10) - 0.5) * 2.6, 0, 1.3] });
      FX.emit(R, t, { n: 60, seed: 5, life: 2.4, loop: true, uv: 'soft', s0: 0.34, s1: 0.1, c0: [0.75, 0.35, 1], a: 0.9, wob: 0.6, tw: 6, init: (j, r) => [(r(7) - 0.5) * 20, -1 - r(8) * 5, r(9) * 10, 0, 0, 1.6] });
      FX.emit(R, t, { n: 14, seed: 7, life: 1.2, loop: true, uv: 'star', s0: 1.5, s1: 0.4, c0: [0.8, 0.5, 1], a: 0.8, fin: 0.3, init: (j, r) => { const p = P(0.1 + r(7) * 0.8, 0.1 + r(8) * 0.8); return [p[0], p[1] - 0.1, p[2], 0, 0, 0]; } }); f.vig = 0.78; f.sat = 1.16; }
    f.bloom = i === 1 ? 0.3 : 0.62; if (i === 1) { f.thr = 0.86; f.expo = 0.92; f.con = 1.12; } T.flash(f, lt, 0.24, [lerp(1, E.glow[0], 0.4), lerp(1, E.glow[1], 0.4), lerp(1, E.glow[2], 0.4)], 0.95); }

  /* ================= kurulum: yazılar ve sahne listesi ================= */
  T.setup = function () { R = T.R; W = T.W; tx = T.tx; F = T.F; defOcak(); for (let s = 0; s <= 7; s++) eggs.push(eggTex(s)); buildDuel();
    const line = { h: 0.088, y: -0.5, size: 96, weight: 700, track: 0.02, plain: '#f6ecd6', stroke: 'rgba(20,12,10,.6)' }, title = { h: 0.17, y: -0.43, x: -0.9, al: -1, size: 160, track: 0.2 };
    T.say('Dedenden kalan harabe bir ocak.', 0.9, 3.25, line); T.say('Yaşlı bir ateş ejderhası.', 3.75, 6.05, line); T.say('Soğumaya yüz tutmuş bir yumurta.', 6.55, 8.9, line);
    T.say('Yirmi hafta sonra Kızıl Taç başlıyor.', B(4, 2.6), B(6) - 0.2, Object.assign({}, line, { plain: null, h: 0.094 }));
    T.say('BÜYÜT', B(6, 1), B(8) - 0.25, title); EL.forEach((E, i) => T.say(E.name, CUE.el[i] + 0.22, CUE.el[i] + 2.32, { h: 0.2, y: -0.42, x: -0.9, al: -1, size: 170, track: 0.16, grad: E.grad, fin: 0.25, fout: 0.25 }));
    T.say('KEŞFET', B(13, 2), B(15) - 0.2, title); T.say('DÖVÜŞ', B(18, 0.6), B(19) - 0.1, title); T.say('ZİNDANLAR', B(22, 0.8), B(24) - 0.3, title);
    T.say('“Kızıl Taç’ı bir kez de bu ocak alsın isterdim.”', CUE.logo + 1.5, CUE.dur, Object.assign({}, line, { y: -0.46, h: 0.074, fout: 0.01 })); T.say('Deden', CUE.logo + 2.3, CUE.dur, { h: 0.052, y: -0.6, size: 80, weight: 700, track: 0.2, fout: 0.01 });

    /* --- 0–3 · soğuk açılış --- */
    T.shot(0, 3.5, (lt, k, f, t) => { const e = io(clamp(lt / 3.5, 0, 1)); view(v3([-7.5, -15, 7], [-5, -8.6, 3.5], e), v3([-25, 100, 62], [0.4, 9.2, 1.4], io(clamp((lt - 0.15) / 3.2, 0, 1))), 38);
      ocak(t, { night: 1, items: [eggItem(t, 0, 0, 0)] }); T.dip(f, 1 - ss(0.1, 1.6, lt)); f.vig = 0.72; f.sat = 1.02; });
    T.shot(3.5, 6.3, (lt, k, f, t) => { const e = io(k); view(add3(v3([-6.4, 3.2, 1.2], [-3.4, 4.0, 1.5], e), FX.sway(t, 0.02)), v3([-0.8, 9.9, 1.6], [1.3, 9.9, 1.5], e), 30);
      ocak(t, { night: 1, items: [eggItem(t, 0, 0, 0)] }); T.dip(f, 1 - ss(0, 0.35, lt)); f.vig = 0.72; f.tint = [1.04, 0.98, 0.94]; });
    T.shot(6.3, CUE.hatch, (lt, k, f, t) => { const st = CUE.cracks.filter(c => t >= c).length, heat = st / 7, last = st ? t - CUE.cracks[st - 1] : 9, shk = heat + (last < 0.15 ? 1.5 : 0);
      view(add3(v3([3.6, 1.4, 1.6], [1.55, 5.1, 0.98], io(k)), FX.shake(t, 0.006 * shk)), [EGG[0], EGG[1], EGG[2] + 0.33], lerp(34, 25, k));
      ocak(t, { night: 1, items: [eggItem(t, st, heat + (last < 0.12 ? 0.5 : 0), shk)] });
      for (const c of CUE.cracks) burst(t, c, add3(EGG, [0, -0.1, 0.4]), { n: 16, sp: 3, ring: 0.9, seed: c * 10 });
      T.dip(f, 1 - ss(0, 0.35, lt)); T.dip(f, ss(CUE.hatch - 0.22, CUE.hatch, t), [1, 0.95, 0.85]); f.vig = 0.75; f.bloom = 0.5 + heat * 0.5; });
    /* --- 4–5 · yumurta çatlar --- */
    T.shot(CUE.hatch, B(6), (lt, k, f, t) => { const C = [EGG[0], EGG[1], 0];
      view(add3(orbit(C, lerp(4.7, 3.5, io(k)), lerp(-26, 14, io(k)), lerp(1.55, 1.0, k)), FX.shake(t, 0.03 * Math.exp(-lt * 5))), [EGG[0], EGG[1], 0.93], 34);
      const pop = outBack(clamp(lt / 0.55, 0, 1)), jmp = [1.15, 1.42, 3.3].reduce((s, c) => s + (lt > c && lt < c + 0.3 ? Math.sin((lt - c) / 0.3 * PI) * 0.13 : 0), 0), rr = R.right, l = Math.hypot(rr[0], rr[1]) || 1;
      ocak(t, { night: lerp(1, 0.84, k), items: [{ key: EGG[1], draw() { FX.glow(R, add3(EGG, [0, 0.05, 0.3]), 4.5, [1, 0.6, 0.2], 0.5 + 0.9 * Math.exp(-lt * 2));
        FX.dragon(R, tx['yavru-on'], { pos: [EGG[0], EGG[1], 0.5 + jmp], h: 0.98 * pop, ay: 0.985, right: [rr[0] / l, rr[1] / l, 0], up: Z, breathe: 0.025, t: t * 1.6, scale: [1 + jmp * 0.4, 1 - jmp * 0.5], col: [1.04, 0.92, 0.84, 1] }); } }] });
      const c = add3(EGG, [0, -0.15, 0.3]); burst(t, CUE.hatch, c, { n: 150, sp: 9, ring: 7, seed: 3 });
      FX.emit(R, t, { n: 30, seed: 8, t0: CUE.hatch, life: 1.5, uv: 'rock', add: false, s0: 0.2, s1: 0.16, spin: 9, g: -9, c0: [0.62, 0.26, 0.26], fin: 0.02, fout: 0.5, floor: 0.05, init: (i, r) => { const a = r(7) * 6.283, sp = 2.5 + r(8) * 3.5; return [c[0], c[1], c[2], Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 0.6, 3 + r(9) * 3.5]; } });
      if (lt < 1.6) R.sprite(FX.tex, [EGG[0], EGG[1] + 0.05, 0.4], 1.6 + lt * 1.5, 12, FX.uv.beam, [1, 0.85, 0.5, 0.75 * Math.pow(1 - lt / 1.6, 1.5)], true, 0, 0, 0.5, 0);
      embers(t, add3(EGG, [0, 0, 0.5]), { n: 40, seed: 17, r: 1.6, rise: 0.8, life: 2.2, s: 0.07 });
      FX.emit(R, t, { n: 12, seed: 19, life: 1.3, loop: true, t0: CUE.hatch + 0.6, uv: 'star', s0: 0.45, s1: 0.1, c0: [1, 0.9, 0.6], a: 0.9, fin: 0.3, init: (i, r) => [EGG[0] + (r(7) - 0.5) * 1.6, EGG[1] - 0.2, 0.7 + r(8) * 1.2, 0, 0, 0.2] });
      T.flash(f, lt, 0.7, [1, 0.96, 0.86], 1); f.bloom = 0.55 + 0.5 * Math.exp(-lt * 2); f.vig = 0.68; });
    /* --- 6–7 · büyüme: haftalar geçer, gece sabaha döner --- */
    T.shot(B(6), B(8), (lt, k, f, t) => { const st = t < CUE.grow[0] ? 0 : t < CUE.grow[1] ? 1 : 2, ts = [B(6), CUE.grow[0], CUE.grow[1]][st], ls = t - ts, tn = st < 2 ? CUE.grow[st] - t : 9, e = io(k), n = lerp(0.84, 0.04, ss(B(6), B(7, 3), t));
      view(add3(v3([1.6, 1.6, 1.1], [-5.6, -7.4, 2.3], e), FX.sway(t, 0.03)), v3([4.4, 5.6, 0.6], [3.6, 6.2, 2.9], e), 36);
      const H = [1.2, 2.5, 4.5][st] * (st ? 0.72 + 0.28 * outBack(clamp(ls / 0.45, 0, 1)) : 1) * (1 + 0.1 * ss(0.3, 0, tn)), P0 = [4.7, 5.3, 0], gl = ss(0.35, 0, tn) + (st ? Math.exp(-ls * 4) : 0);
      ocak(t, { night: n, dawn: ss(B(6, 0.5), B(7, 1.5), t), items: [{ key: P0[1], draw() { FX.glow(R, [P0[0], P0[1] + 0.1, H * 0.45], H * 2.2, [1, 0.6, 0.2], 0.16 + gl * 0.6);
        const o = { pos: P0, h: H, ay: 0.935, right: X, up: Z, breathe: 0.012, t, col: [lerp(1, 0.98, n) + gl * 0.3, lerp(1, 0.8, n) + gl * 0.25, lerp(1, 0.72, n) + gl * 0.2, 1] }, tex = tx[['ates-yavru', 'ates-genc', 'ates-yetiskin'][st]]; FX.dragon(R, tex, o);
        if (gl > 0.02) FX.dragon(R, tex, Object.assign({}, o, { col: [1, 0.8, 0.5, gl * 0.6], add: true })); } }] });
      for (const [j, c] of CUE.grow.entries()) burst(t, c, [P0[0], P0[1] - 0.2, [1.0, 1.8][j]], { n: 110, sp: 9 + j * 3, ring: 5 + j * 3, seed: 30 + j });
      FX.emit(R, t, { n: 70, seed: 23, life: 1.8, loop: true, uv: 'ember', s0: 0.1, s1: 0.03, c0: [1, 0.85, 0.5], c1: [1, 0.45, 0.1], tw: 8, init: (i, r, born) => { const a = r(7) * 6.283 + born * 2.2, rad = 0.6 + r(8) * H * 0.7; return [P0[0] + Math.cos(a) * rad, P0[1] - 0.3 + Math.sin(a) * rad * 0.4, r(9) * 0.4, -Math.sin(a) * 1.2, 0, 1.2 + r(10) * 1.6]; } });
      if (st) T.flash(f, ls, 0.3, [1, 0.92, 0.75], 0.75); T.flash(f, lt, 0.2, [1, 1, 1], 0.5); f.tint = [lerp(1.05, 1, n), 1, lerp(0.94, 1, n)]; f.bloom = 0.55 + gl * 0.3; f.vig = lerp(0.5, 0.68, n); });
    /* --- 8–12 · beş element --- */
    EL.forEach((E, i) => T.shot(CUE.el[i], CUE.el[i] + T.BAR, (lt, k, f, t) => element(i, lt, k, f, t)));

    /* --- 13–17 · dünya: meydan, han, pazar, bahçe --- */
    const petals = t => FX.emit(R, t, { n: 80, seed: 51, life: 8, loop: true, tex: W.T.fx, uvRect: W.T.fxMap.petal, add: false, s0: 0.11, spin: 2.4, a: 0.95, wob: 0.5, wobF: 1.2, fin: 0.05, fout: 0.3, init: (i, r) => [-18 + r(7) * 34, -2 + r(8) * 30, 4 + r(9) * 5, 0.5 + r(10) * 0.4, 0, -0.55] });
    T.shot(B(13), B(15), (lt, k, f, t) => { const e = io(k), sc = T.area('meydan');
      view(add3(v3([2.6, 2.6, 20], [-4.4, -0.6, 2.5], e), FX.sway(t, 0.04 * e)), v3([2.6, 13.2, 0], [1.2, 13.4, 2.3], e), lerp(44, 37, e));
      const pl = { x: lerp(-1.3, -0.3, k), y: 3.2 + lt * 1.35, dir: 'up', moving: true, ph: lt * 1.9, set: 'temel' };
      T.drawArea(sc, { night: 0, time: t, items: [T.chibiItem(pl), T.petItem({ x: pl.x + 0.95, y: pl.y - 0.6, face: 1, moving: true, hop: lt * 3.4 }), ...T.npcItems(sc.L)] }); petals(t); T.flash(f, lt, 0.3); f.bloom = 0.42; f.vig = 0.42; });
    T.shot(B(15), B(16), (lt, k, f, t) => { const e = io(k), sc = T.area('han'); view(add3(v3([-3.6, 1.0, 2.6], [-1.6, 3.4, 2.25], e), FX.sway(t, 0.02)), v3([1.4, 11, 1.7], [0.2, 12, 1.6], e), 46);
      const pl = { x: 0.6, y: 5.4 + lt * 1.2, dir: 'up', moving: true, ph: lt * 1.9, set: 'temel' };
      T.drawArea(sc, { time: t, items: [T.chibiItem(pl), T.petItem({ x: pl.x + 0.9, y: pl.y - 0.6, face: 1, moving: true, hop: lt * 3.4 }), ...T.npcItems(sc.L)] });
      for (const em of (sc.L.embers || [])) embers(t, [em[0], em[1] - 0.15, 0.5], { n: 16, seed: em[0] * 7 + 3, life: 1.8, r: 0.6 }); T.flash(f, lt, 0.16, [1, 1, 1], 0.6); f.tint = [1.04, 0.99, 0.94]; f.vig = 0.6; });
    T.shot(B(16), B(17), (lt, k, f, t) => { const e = io(k), sc = T.area('pazar'); view(add3(v3([1.7, 1.1, 2.2], [-0.9, 6.6, 2.5], e), FX.sway(t, 0.02)), v3([0, 15, 2.9], [0.2, 18, 2.7], e), 48);
      const pl = { x: -0.4, y: 9.2 + lt * 1.2, dir: 'up', moving: true, ph: lt * 1.9, set: 'temel' };
      T.drawArea(sc, { time: t, items: [T.chibiItem(pl), T.petItem({ x: pl.x + 0.9, y: pl.y - 0.6, face: 1, moving: true, hop: lt * 3.4 }), ...T.npcItems(sc.L)] }); T.flash(f, lt, 0.16, [1, 1, 1], 0.6); f.bloom = 0.6; f.vig = 0.6; });
    T.shot(B(17), B(18), (lt, k, f, t) => { const e = io(k), sc = T.area('bahce'); view(add3(v3([1.6, 5.2, 1.2], [-1.2, 7.4, 1.6], e), FX.sway(t, 0.025)), v3([-5.4, 15.2, 2.4], [-6.0, 15.2, 2.9], e), 42);
      T.drawArea(sc, { night: 0.78, time: t, items: [T.chibiItem({ x: -3.9, y: 12.4, dir: 'up', set: 'temel' }), T.petItem({ x: -2.9, y: 12.1, face: -1, cheer: 1 }), ...T.npcItems(sc.L)] });
      embers(t, [-2.6, 19.8, 0.5], { n: 18, seed: 61, r: 0.8 }); FX.emit(R, t, { n: 34, seed: 63, life: 5, loop: true, uv: 'soft', s0: 0.12, c0: [0.8, 1, 0.45], a: 0.85, tw: 3, wob: 0.7, wobF: 0.8, init: (i, r) => [(r(7) - 0.5) * 26, 6 + r(8) * 16, 0.4 + r(9) * 3.5, 0, 0, 0.05] });
      T.flash(f, lt, 0.16, [1, 1, 1], 0.6); f.vig = 0.6; });

    /* --- 18–21 · Topçu düellosu --- */
    const D = duel, PZ = hT0(DU.px), HIT = [DU.hit, DU.Y - 0.02, hT0(DU.hit)];
    T.shot(B(18), B(19), (lt, k, f, t) => { const e = io(k); view(add3(v3([-7.5, -23, 7.2], [-1, -19.5, 4.6], e), FX.sway(t, 0.06)), [0.8, 1.2, 2.5], 36); duelDraw(t, { pf: 'idle', ef: 'aim_35' }); T.flash(f, lt, 0.3, [1, 0.9, 0.8], 0.9); f.tint = [1.04, 0.98, 0.98]; });
    T.shot(B(19), CUE.fire, (lt, k, f, t) => { const e = io(k), ang = 10 + 30 * ss(0.05, 0.7, k), q = clamp(Math.round(ang / 5) * 5, -10, 70), ch = ss(0.9, 2.4, lt), mz = D.muzzle(q);
      view(add3(v3([-14.6, -5.8, PZ + 1.0], [-12.9, -4.4, PZ + 1.7], e), FX.shake(t, 0.012 * ch)), v3([-9.3, 1.2, PZ + 0.9], [-8.7, 1.2, PZ + 1.3], e), 38); duelDraw(t, { pf: 'aim_' + q, ef: 'idle' });
      for (let j = 1; j < 40; j++) { const p = D.path(j * 0.085, q, mz); if (p[2] < hT0(p[0]) || j > k * 70) break; R.sprite(FX.tex, p, 0.3, 0.3, FX.uv.core, [1, 0.96, 0.82, 1 - j / 46], true, 0); }               // öngörülen yol: oyundaki nişan çizgisi
      FX.glow(R, mz, 0.4 + ch * 2.4, [1, 0.6, 0.2], ch * 0.85); FX.glow(R, mz, 0.2 + ch * 0.5, [1, 0.95, 0.8], ch, 'core');
      FX.emit(R, t, { n: 60, seed: 71, life: 0.55, loop: true, t0: B(19) + 0.9, uv: 'ember', s0: 0.05, s1: 0.13, c0: [1, 0.6, 0.2], c1: [1, 0.9, 0.6], fin: 0.3, fout: 0.2, drag: 0, init: (i, r) => { const a = r(7) * 6.283, b = (r(8) - 0.5) * 2, rad = 1.6 + r(9) * 1.2, dx = Math.cos(a) * rad, dz = Math.sin(a) * rad; return [mz[0] + dx, mz[1] - 0.05 + b * 0.3, mz[2] + dz, -dx / 0.55 / (0.55 + 0.9 * r(0)), 0, -dz / 0.55 / (0.55 + 0.9 * r(0))]; } });
      T.flash(f, lt, 0.14, [1, 1, 1], 0.6); f.bloom = 0.5 + ch * 0.3; });
    const orb = (t, s) => { const p = D.path(s); for (let j = 28; j >= 1; j--) { const sj = s - j * 0.016; if (sj < 0) continue; const q = D.path(sj), kk = 1 - j / 29; R.sprite(FX.tex, q, 0.9 * kk + 0.15, 0.9 * kk + 0.15, FX.uv.soft, [1, lerp(0.25, 0.75, kk), lerp(0.05, 0.3, kk), kk * kk * 0.7], true, 0); }
      FX.emit(R, s, { n: 90, seed: 73, t0: 0, spread: D.Tf, life: 0.7, uv: 'ember', s0: 0.12, s1: 0.03, c0: [1, 0.8, 0.4], c1: [1, 0.3, 0.05], g: -3, init: (i, r) => { const q = D.path(r(1) * D.Tf); return [q[0], q[1], q[2], (r(7) - 0.5) * 1.6 - 2, (r(8) - 0.5) * 1.2, (r(9) - 0.5) * 1.6]; } });
      FX.emit(R, s, { n: 40, seed: 75, t0: 0, spread: D.Tf, life: 1.0, uv: 'puff', add: false, c0: [0.3, 0.24, 0.26], a: 0.35, s0: 0.35, s1: 1.3, fin: 0.2, init: (i, r) => { const q = D.path(r(1) * D.Tf); return [q[0], q[1] + 0.05, q[2], -0.8, 0, 0.5]; } });
      FX.glow(R, p, 2.6 + Math.sin(t * 50) * 0.2, [1, 0.5, 0.12], 0.9); FX.glow(R, p, 0.8, [1, 0.95, 0.75], 1, 'core'); R.sprite(FX.tex, p, 2.6, 2.6, FX.uv.star, [1, 0.8, 0.5, 0.6], true, 0, t * 3); return p; };
    T.shot(CUE.fire, CUE.boom, (lt, k, f, t) => { const s = D.Tf * (k + 0.13 * Math.sin(2 * PI * k)), p = D.path(s), kick = Math.exp(-lt * 9);
      view(add3([p[0] - 4.8 + 2.4 * k, -11.5 + 2.5 * k, p[2] + 1.2 - 0.5 * k], FX.shake(t, 0.08 * kick)), [p[0] + 1.4 - k, 1.2, p[2] - 0.2], 40, 0.02 * Math.sin(k * PI));
      duelDraw(t, { pf: lt < 0.08 ? 'fire0_40' : lt < 0.26 ? 'fire1_40' : 'aim_40', ef: 'idle' });
      FX.emit(R, t, { n: 26, seed: 77, t0: CUE.fire, life: 1.6, uv: 'puff', add: false, c0: [0.82, 0.76, 0.72], a: 0.5, s0: 0.5, s1: 2.6, fin: 0.05, drag: 2.5, init: (i, r) => [D.m0[0], D.m0[1] - 0.05, D.m0[2], 4 + r(7) * 5, (r(8) - 0.5) * 2, 3 + r(9) * 4] });
      burst(t, CUE.fire, D.m0, { n: 90, sp: 11, ring: 0.1, seed: 79 }); if (lt < 0.2) FX.glow(R, D.m0, 6 * (1 - lt / 0.2) + 1, [1, 0.8, 0.5], 1 - lt / 0.2); orb(t, s);
      T.flash(f, lt, 0.22, [1, 0.9, 0.7], 0.95); f.bloom = 0.62; f.ca = 0.045 + 0.2 * kick; });
    T.shot(CUE.boom, B(22), (lt, k, f, t) => { const kick = Math.exp(-lt * 3.2), C = add3(HIT, [0, -0.1, -0.3]);
      view(add3(v3([13.4, -7.4, 3.2], [15.2, -9.6, 4.0], out(k)), FX.shake(t, 0.3 * kick)), [8.9, 1.2, 3.1], 38, 0.03 * kick * Math.sin(t * 40));
      duelDraw(t, { after: 1, pf: 'aim_40', ef: lt < 0.75 ? 'hurt_' + (Math.floor(lt * 11) % 2) : 'idle', ek: 0.35 * out(lt / 0.3) });
      FX.emit(R, t, { n: 34, seed: 81, t0: CUE.boom, life: 2.6, spread: 0.25, uv: 'puff', add: false, c0: [0.2, 0.16, 0.18], c1: [0.5, 0.45, 0.46], a: 0.7, s0: 1.2, s1: 5.2, fin: 0.06, drag: 1.4, init: (i, r) => [C[0] + (r(7) - 0.5) * 1.6, C[1], C[2], (r(8) - 0.5) * 3, 0, 4 + r(9) * 5] });
      FX.emit(R, t, { n: 46, seed: 83, t0: CUE.boom, life: 0.7, uv: 'puff', c0: [1, 0.85, 0.5], c1: [0.9, 0.2, 0.04], a: 0.85, s0: 1.2, s1: 4.6, fin: 0.03, drag: 3, init: (i, r) => { const a = r(7) * PI; return [C[0], C[1] - 0.1, C[2], Math.cos(a) * (4 + r(8) * 9), -r(9) * 2, Math.sin(a) * (4 + r(8) * 9) + 2]; } });
      FX.emit(R, t, { n: 44, seed: 85, t0: CUE.boom, life: 1.9, uv: 'rock', add: false, s0: 0.5, s1: 0.4, spin: 8, g: -13, c0: [0.72, 0.6, 0.52], fin: 0.02, fout: 0.4, init: (i, r) => { const a = 0.25 + r(7) * (PI - 0.5), sp = 6 + r(8) * 9; return [C[0], C[1] - 0.1, C[2], Math.cos(a) * sp, -r(9) * 3.5, Math.sin(a) * sp]; } });
      FX.emit(R, t, { n: 130, seed: 87, t0: CUE.boom, life: 1.1, uv: 'streak', rot: 'vel', stretch: 2.6, s0: 0.32, s1: 0.06, c0: [1, 0.95, 0.7], c1: [1, 0.45, 0.1], g: -9, drag: 1.2, fin: 0.02, init: (i, r) => { const a = r(7) * PI, sp = 6 + r(8) * 14; return [C[0], C[1] - 0.15, C[2], Math.cos(a) * sp, -r(9) * 5, Math.sin(a) * sp]; } });
      if (lt < 0.9) { const s = 9 * out(lt / 0.9); flatQuad(FX.uv.ring, HIT[0], 1.6, HIT[2] - 0.6, s, s * 0.5, [1, 0.8, 0.5, (1 - lt / 0.9) * 0.7], true); R.sprite(FX.tex, C, 5 + s, 5 + s, FX.uv.soft, [1, 0.75, 0.4, Math.pow(1 - lt / 0.9, 2)], true, 0); }
      embers(t, add3(C, [0, 0, 0.2]), { n: 30, seed: 89, r: 2.4, life: 2, rise: 1.6 });
      T.flash(f, lt, 0.4, [1, 0.96, 0.85], 1); f.bloom = 0.55 + 0.4 * kick; f.ca = 0.045 + 0.3 * kick; });

    /* --- 22–23 · zindanlar --- */
    T.shot(B(22), B(23), (lt, k, f, t) => { const e = io(k), lit = ss(0.9, 1.15, lt) * (1 - 0.25 * ss(1.5, 2.2, lt)), fl = Math.max(0, 1 - Math.abs(lt - 1.02) / 0.14); R.begin([0.01, 0.03, 0.03]); R.setFog([0, 0, 0, 0], [1e4, 2e4]);
      view(add3(v3([-4, -40, 0], [1.5, -32, -0.6], e), FX.sway(t, 0.1)), [0.6, 0, 1], 40, lerp(-0.035, 0.02, k)); const pk = 0.5 + 0.35 * lit + fl * 0.6; FX.plate(R, tx['pl-sahmeran'], 0, 30, 1, 116, [pk, pk * 1.03, pk, 1]);
      FX.emit(R, t, { n: 16, seed: 91, life: 6, loop: true, uv: 'puff', c0: [0.1, 0.5, 0.35], a: 0.2, s0: 10, s1: 15, fin: 0.3, init: (i, r) => [-40 + r(7) * 80, 14 + r(8) * 10, -14 + r(9) * 8, 1.4, 0, 0.2] });
      const S = { pos: [5.5, 13, lerp(-21, -8.4, out(clamp(lt / 1.5, 0, 1)))], h: 17.5, ay: 1, right: X, up: Z, breathe: 0.004, t, nx: 6, ny: 6, col: [lerp(0.07, 1, lit) + fl, lerp(0.12, 1, lit) + fl, lerp(0.11, 1, lit) + fl, 1] }; FX.dragon(R, tx.sahmeran, S);
      for (const u of [0.405, 0.585]) { const p = FX.dragonPoint(R, tx.sahmeran, S, u, 0.45); p[1] -= 0.2; R.sprite(FX.tex, p, 5 + fl * 6, 5 + fl * 6, FX.uv.star, [0.3, 1, 0.6, ss(0.25, 0.9, lt) * 0.95], true, 0, t * 0.6); FX.glow(R, p, 2.4, [0.4, 1, 0.65], ss(0.25, 0.9, lt) * 0.9); }
      FX.emit(R, t, { n: 90, seed: 93, life: 3.4, loop: true, uv: 'soft', s0: 0.34, s1: 0.1, c0: [0.35, 1, 0.6], a: 0.8, wob: 0.8, tw: 5, init: (i, r) => [(r(7) - 0.5) * 70, -20 + r(8) * 40, -14 + r(9) * 22, 0, 0, 1.6] });
      T.flash(f, lt, 0.3, [0.6, 1, 0.8], 0.85); f.tint = [0.93, 1.05, 0.98]; f.vig = 0.85; f.sat = 1.15; f.expo = 1 + fl * 0.4; });
    T.shot(B(23), B(24), (lt, k, f, t) => { const e = io(k), rr = Math.sin(clamp((lt - 0.15) / 1.9, 0, 1) * PI); R.begin([0.04, 0.01, 0]); R.setFog([0, 0, 0, 0], [1e4, 2e4]);
      view(add3(v3([0, -42, 1], [0, -22, -1], e), FX.shake(t, 0.22 * rr)), [0, 0, lerp(-1, 2.5, e)], 40, 0.012 * rr * Math.sin(t * 31)); const pk = 0.85 + 0.25 * rr; FX.plate(R, tx['pl-komutan'], 0, 30, 0, 124, [pk, pk, pk, 1]);
      embers(t, [0, -6, -14], { n: 220, seed: 95, r: 64, rz: 30, life: 3, s: 0.34, rise: 3.2, wob: 0.6 });
      FX.emit(R, t, { n: 14, seed: 97, life: 3, loop: true, uv: 'puff', c0: [1, 0.35, 0.05], a: 0.14, s0: 14, s1: 22, fin: 0.3, init: (i, r) => [(r(7) - 0.5) * 70, 10 + r(8) * 10, -18 + r(9) * 10, 0, 0, 2.5] });
      FX.screen(R, FX.tex, FX.uv.soft, [1, 0.4, 0.08, 0.1 + 0.12 * rr], true, -1.6, -2.2, 1.6, 0.6);
      T.flash(f, lt, 0.3, [1, 0.6, 0.3], 0.95); T.dip(f, ss(B(24) - 0.2, B(24), t), [1, 0.9, 0.8]); f.tint = [1.05, 0.97, 0.92]; f.vig = 0.8; f.bloom = 0.65 + 0.25 * rr; f.ca = 0.045 + 0.12 * rr; });

    /* --- 24–25 · final: beş ejder meydanın üstünden geçer --- */
    const FLY = [['buz-P7', -9.5, [0.75, 0.9, 1]], ['toprak-P7', 9.5, [0.85, 1, 0.6]], ['firtina-P7', -4.6, [0.75, 0.6, 1]], ['golge-P7', 4.6, [0.7, 0.4, 1]], ['ates-P7', 0, [1, 0.6, 0.25]]];
    T.shot(B(24), CUE.logo, (lt, k, f, t) => { const e = io(k), sc = T.area('meydan'), eye = v3([0.5, -0.9, 4.4], [0.5, 1.2, 2.4], e);
      view(add3(eye, FX.sway(t, 0.04)), v3([0.5, 17, 7.5], [0.5, 14, 11.5], e), lerp(46, 54, e));
      T.drawArea(sc, { night: 0.74, time: t, items: [T.chibiItem({ x: 0.2, y: 7.6, dir: 'up', set: 'temel' }), T.petItem({ x: 1.15, y: 7.3, face: -1, cheer: 1 }), ...T.npcItems(sc.L)] });
      const sh = W.T.fxMap.shadow, fl = FLY.map(([n, x0, col], i) => { const u = (t - (CUE.wings[i] - 3.4)) / 3.4; return { n, col, i, u, x: lerp(x0 * 2.4, x0 * 0.3, u), y: lerp(105, eye[1] - 1, u), z: lerp(26, eye[2] + 5.2, u) }; }).filter(d => d.u > -0.25 && d.y > eye[1] + 2.5).sort((a, b) => b.y - a.y);
      for (const d of fl) flatQuad(sh, d.x, d.y, 0.02, 5.5, 2.4, [1, 1, 1, 0.5 * clamp(1 - d.y / 60, 0, 1)], false, W.T.fx);
      for (const d of fl) { const tex = tx[d.n], pos = [d.x, d.y, d.z + Math.sin(t * 2 + d.i) * 0.3], o = { pos, h: 7.4, ay: 0.45, right: X, up: Z, flap: { amp: 0.1, f: 7 + d.i * 0.35, pivot: [0.5, 0.42], pow: 1.35, ph: 3 }, t, nx: 18, ny: 8, col: [0.98, 0.84, 0.82, 1], fog: 0.75 };
        FX.glow(R, pos, 22, d.col, 0.16); FX.dragon(R, tex, o);
        FX.emit(R, t, { n: 16, seed: 100 + d.i, life: 1.3, loop: true, uv: 'ember', s0: 0.34, s1: 0.08, c0: d.col, a: 0.9, init: (j, r) => [pos[0] + (r(7) - 0.5) * 9, pos[1] + 1, pos[2] + (r(8) - 0.5) * 2.5, 0, 14, -0.6] }); }
      embers(t, [0, 12, 0], { n: 60, seed: 111, r: 30, rz: 6, life: 4, s: 0.09, rise: 0.5 });
      T.flash(f, lt, 0.35, [1, 0.92, 0.82], 1); T.dip(f, ss(CUE.logo - 0.16, CUE.logo, t), [1, 0.96, 0.88]); f.bloom = 0.6; f.vig = 0.5; f.tint = [1.03, 0.98, 0.98]; });
    /* --- 26–27 · mühür --- */
    T.shot(CUE.logo, CUE.dur, (lt, k, f, t) => { R.begin([0.016, 0.026, 0.07]); R.setFog([0, 0, 0, 0], [1e4, 2e4]); view([0, -14 + lt * 0.25, 0.4], [0, 0, 0.4], 40);
      FX.screen(R, FX.tex, FX.uv.soft, [0.10, 0.20, 0.55, 0.9], true, -1.5, -1.7, 1.5, 1.9); FX.screen(R, FX.tex, FX.uv.soft, [1, 0.62, 0.2, 0.22 + 0.5 * Math.exp(-lt * 3)], true, -0.9, -0.75, 0.9, 1.05);
      for (let i = 0; i < 18; i++) R.sprite(FX.tex, [0, 4, 0.9], 2.6, 17, FX.uv.beam, [1, 0.8, 0.45, 0.055 + 0.03 * Math.sin(t * 1.3 + i * 2.1)], true, 0, i * PI / 9 + t * 0.045, 0.5, 0);
      FX.emit(R, t, { n: 190, seed: 121, life: 5, loop: true, uv: 'ember', s0: 0.1, s1: 0.04, c0: [1, 0.85, 0.5], c1: [1, 0.6, 0.2], tw: 4, wob: 0.3, init: (i, r) => [(r(7) - 0.5) * 30, -8 + r(8) * 14, -6 + r(9) * 12, 0.15, -0.5, 0.45] });
      FX.emit(R, t, { n: 170, seed: 123, t0: CUE.logo, life: 1.5, uv: 'streak', rot: 'vel', stretch: 3, s0: 0.3, s1: 0.05, c0: [1, 0.97, 0.8], c1: [1, 0.6, 0.2], drag: 1.8, g: -1.5, fin: 0.02, init: (i, r) => { const a = r(7) * 6.283, sp = 7 + r(8) * 16; return [0, -1, 0.8, Math.cos(a) * sp, -r(9) * 4, Math.sin(a) * sp * 0.6]; } });
      if (lt < 1) R.sprite(FX.tex, [0, -1, 0.9], 1 + lt * 34, 1 + lt * 34, FX.uv.ring, [1, 0.85, 0.55, Math.pow(1 - lt, 2) * 0.8], true, 0);
      const sc = 1 + 0.5 * (1 - outExpo(lt / 0.55)) + 0.035 * lt / 4.8, hh = 0.5 * sc, ww = hh * 1.5 * (R.h / R.w), cy = 0.14, a = ss(0, 0.1, lt);
      R.quad(tx.logo, [-ww, cy - hh, 0], [ww, cy - hh, 0], [ww, cy + hh, 0], [-ww, cy + hh, 0], 0, 0, 1, 1, [1, 1, 1, a], false, 0, true);
      T.flash(f, lt, 0.55, [1, 0.96, 0.88], 1); f.bloom = 0.5 + 0.5 * Math.exp(-lt * 2.5); f.thr = 0.8; f.vig = 0.7; f.sat = 1.12; });
  };
})();
