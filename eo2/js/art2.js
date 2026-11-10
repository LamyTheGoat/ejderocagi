/* EO2 dikey dilim · diğer alanların kodla çizilen yer tutucu sanatı (Han içi, Ejder Bahçesi, Kuzey Yolu).
   art.js'teki ressamı (P) ve paleti (C) kullanır. Nihai sanat değildir. */
(function () {
  'use strict';
  const art = window.EO2.art, P = art.P, C = art.C, OUT = '#3a2530';
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const beams = (g, x0, x1, y0, y1, posts) => { for (const p of posts) g.rect(p - 0.11, y0, 0.22, y1 - y0, C.wood, 0.04); g.rect(x0, y1 - 0.26, x1 - x0, 0.26, C.woodD, 0.045); g.rect(x0, y0 - 0.1, x1 - x0, 0.26, C.woodD, 0.045); };
  const kilimOn = (g, x, y, w, h, seed) => { const X = g.x, r = rng(seed), cols = [C.red, C.navy, '#f1e2c4', C.turq, C.gold, '#7a3a8a']; g.rect(x, y, w, h, C.red, 0.045); X.save(); X.beginPath(); X.rect(x, y, w, h); X.clip();
    const bands = 7, bh = h / bands; for (let i = 0; i < bands; i++) { X.fillStyle = cols[Math.floor(r() * cols.length)]; X.fillRect(x, y + i * bh, w, bh); X.fillStyle = cols[Math.floor(r() * cols.length)]; const n = Math.round(w / (bh * 0.9)); for (let k = 0; k < n; k++) { const cx = x + (k + 0.5) * w / n, cy = y + (i + 0.5) * bh, s = bh * 0.32; X.beginPath(); X.moveTo(cx, cy + s); X.lineTo(cx + s, cy); X.lineTo(cx, cy - s); X.lineTo(cx - s, cy); X.closePath(); X.fill(); } }
    X.restore(); X.beginPath(); X.rect(x, y, w, h); g.fs(null, 0.045); X.strokeStyle = '#f1e2c4'; X.lineWidth = 0.03; for (let k = 0; k < w / 0.12; k++) { X.beginPath(); X.moveTo(x + k * 0.12 + 0.05, y); X.lineTo(x + k * 0.12 + 0.05, y - 0.16); X.stroke(); } };

  /* ---------- Han içi ---------- */
  art.hanBack = function () {          // 16 × 7.2 m: ocaklı kuzey duvarı
    const g = P(16, 7.2, 80), x = g.x;
    g.rect(0, 2.6, 16, 4.6, '#f3e6cf', 0); g.stone(0, 0, 16, 2.6, { seed: 401, base: '#e2d0b4', row: 0.5, bw: 1.1, lw: 0 });
    beams(g, 0, 16, 2.6, 7.2, [0.2, 2.9, 5.2, 10.8, 13.1, 15.8]);
    // pencereler: dışarıda akşam
    for (const cx of [1.55, 14.45]) { g.archPath(cx, 4.0, 1.2, 1.9); g.fs(C.woodL, 0.05); g.archPath(cx, 4.1, 0.96, 1.66); g.fs('#2c3f78', 0.04); x.fillStyle = '#ffe9a8'; for (const [dx, dy] of [[-0.2, 1.1], [0.15, 0.7], [0.25, 1.3]]) x.fillRect(cx + dx, 4.1 + dy, 0.04, 0.04); x.strokeStyle = OUT; x.lineWidth = 0.035; x.beginPath(); x.moveTo(cx, 4.1); x.lineTo(cx, 5.7); x.stroke(); }
    // raflar ve bakır kaplar
    for (const [sx, sw] of [[3.15, 1.85], [11.0, 1.9]]) for (const sy of [3.5, 4.6]) { g.rect(sx, sy, sw, 0.1, C.wood, 0.04); for (let k = 0; k < 4; k++) { const px = sx + 0.25 + k * (sw - 0.5) / 3, col = [['#c9773a', '#e39a55'], [C.cini, '#7fc0f0'], [C.goldD, C.gold], [C.turq, '#8fe0d8']][(k + Math.round(sy)) % 4];
      if (k % 2) { x.beginPath(); x.ellipse(px, sy + 0.32, 0.17, 0.22, 0, 0, 6.3); g.fs(col[0], 0.035); g.rect(px - 0.06, sy + 0.5, 0.12, 0.1, col[1], 0.03); } else { g.poly([[px - 0.2, sy + 0.1], [px + 0.2, sy + 0.1], [px + 0.14, sy + 0.44], [px - 0.14, sy + 0.44]], col[0], 0.035); x.fillStyle = col[1]; x.fillRect(px - 0.12, sy + 0.34, 0.24, 0.05); } } }
    // kuru biber dizileri
    x.strokeStyle = '#6b4a2a'; x.lineWidth = 0.03; for (const [a, b] of [[3.2, 5.0], [11.0, 12.9]]) { x.beginPath(); x.moveTo(a, 6.5); x.quadraticCurveTo((a + b) / 2, 5.9, b, 6.5); x.stroke(); for (let k = 1; k < 9; k++) { const t = k / 9, px = a + (b - a) * t, py = 6.5 - Math.sin(t * Math.PI) * 0.3; x.beginPath(); x.ellipse(px, py - 0.12, 0.05, 0.13, 0.2, 0, 6.3); x.fillStyle = k % 3 ? '#c9302a' : '#e0752c'; x.fill(); } }
    // ocak: taş çerçeve, çini kuşak, davlumbaz
    g.stone(5.4, 0, 5.2, 3.5, { seed: 402, base: C.stoneD, row: 0.5, bw: 0.8 }); g.poly([[5.3, 3.5], [10.7, 3.5], [9.5, 6.3], [6.5, 6.3]], '#efe0c6', 0.055); g.rect(6.5, 6.3, 3.0, 0.9, '#efe0c6', 0.055);
    g.cini(5.5, 3.5, 5.0, 0.46); x.save(); x.translate(8, 5.1); g.circle(0, 0, 0.5, C.navy, 0.045); x.fillStyle = C.gold; x.fillRect(-0.27, -0.27, 0.54, 0.54); x.rotate(Math.PI / 4); x.fillRect(-0.27, -0.27, 0.54, 0.54); x.restore(); g.circle(8, 5.1, 0.13, C.navy, 0);
    g.archPath(8, 0, 3.7, 3.0); g.fs(C.stoneDk, 0.055); g.archPath(8, 0, 3.2, 2.72); g.fs('#1b1014', 0.05);
    x.save(); g.archPath(8, 0, 3.2, 2.72); x.clip(); g.lit(xx => { xx.beginPath(); xx.rect(6.4, 0, 3.2, 1.5); }, '#ff8a2a', '#7a3418');
    const ig = x.createLinearGradient(0, 1.6, 0, 0.3); ig.addColorStop(0, '#1b1014'); ig.addColorStop(1, 'rgba(27,16,20,0)'); x.fillStyle = ig; x.fillRect(6.4, 0, 3.2, 1.7);
    for (const [lx, ang] of [[7.3, 0.25], [8.1, -0.15], [8.7, 0.1]]) { x.save(); x.translate(lx, 0.22); x.rotate(ang); g.rect(-0.55, -0.12, 1.1, 0.24, '#5a3524', 0.04); x.restore(); }
    x.strokeStyle = '#2a2026'; x.lineWidth = 0.05; x.beginPath(); x.moveTo(8, 2.7); x.lineTo(8, 1.75); x.stroke(); x.beginPath(); x.ellipse(8, 1.4, 0.55, 0.42, 0, 0, 6.3); g.fs('#2f2a33', 0.05); g.rect(7.4, 1.62, 1.2, 0.12, '#463f4c', 0.04); x.restore();
    g.rect(5.2, 0, 5.6, 0.22, C.stoneDk, 0.05);
    // sağda duvar kilimi, solda kemerli niş
    kilimOn(g, 13.25, 3.0, 2.3, 3.2, 77); g.rect(13.15, 6.2, 2.5, 0.12, C.woodD, 0.04);
    g.archPath(0.95, 3.0, 0.02, 0.02); g.lantern(2.55, 5.2); g.lantern(13.0, 2.0); g.lantern(3.0, 2.0);
    g.shade(0, 6.7, 16, 0.5, 0.3); g.shade(0, 2.3, 16, 0.3, 0.16);
    return g;
  };
  art.hanSide = function (len, seed) { // yan duvar: taş etek, sıva, aplikler, kilim
    const g = P(len, 7.2, 80), x = g.x;
    g.rect(0, 2.6, len, 4.6, '#f3e6cf', 0); g.stone(0, 0, len, 2.6, { seed, base: '#e2d0b4', row: 0.5, bw: 1.1, lw: 0 });
    const posts = []; for (let p = 0.2; p < len; p += 3.1) posts.push(p); beams(g, 0, len, 2.6, 7.2, posts);
    for (let i = 0; i < posts.length - 1; i++) { const cx = (posts[i] + posts[i + 1]) / 2; if ((i + seed) % 2) { kilimOn(g, cx - 0.85, 3.3, 1.7, 2.5, seed + i * 7); g.rect(cx - 0.95, 5.8, 1.9, 0.1, C.woodD, 0.04); } else { g.archPath(cx, 3.4, 1.2, 2.1); g.fs(C.woodL, 0.05); g.archPath(cx, 3.5, 0.96, 1.86); g.fs('#2c3f78', 0.04); x.strokeStyle = OUT; x.lineWidth = 0.035; x.beginPath(); x.moveTo(cx, 3.5); x.lineTo(cx, 5.3); x.stroke(); }
      g.lantern(posts[i + 1] - 0.5, 3.0); }
    g.shade(0, 6.7, len, 0.5, 0.3); x.fillStyle = 'rgba(74,52,110,.2)'; x.fillRect(0, 0, len, 7.2);
    return g;
  };
  art.ceilingTile = function () { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#4a2f24'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#553628' : '#4a2f24'; x.fillRect(i * 32, 0, 32, 256); x.fillStyle = 'rgba(20,10,10,.5)'; x.fillRect(i * 32, 0, 2, 256); }
    x.fillStyle = '#35201a'; x.fillRect(0, 96, 256, 44); x.fillStyle = 'rgba(255,200,150,.12)'; x.fillRect(0, 96, 256, 4); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 138, 256, 8); return c; };
  art.kilim = function (seed, runner) { // yukarıdan görünüş: bantlar, baklavalar, saçak
    const W = runner ? 192 : 384, H = runner ? 768 : 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rng(seed), cols = ['#b8342e', '#213270', '#f1e2c4', '#39b6ad', '#e8b64c', '#7a3a8a'];
    x.fillStyle = '#f1e2c4'; for (let k = 0; k < W; k += 8) { x.fillRect(k + 2, 0, 3, 14); x.fillRect(k + 2, H - 14, 3, 14); }
    x.fillStyle = '#8a2424'; x.fillRect(0, 12, W, H - 24); x.fillStyle = '#213270'; x.fillRect(10, 22, W - 20, H - 44); x.fillStyle = '#b8342e'; x.fillRect(20, 32, W - 40, H - 64);
    const bands = runner ? 9 : 5, bh = (H - 64) / bands; for (let i = 0; i < bands; i++) { const cy = 32 + (i + 0.5) * bh, s = Math.min(bh * 0.42, (W - 40) * 0.36), col = cols[1 + Math.floor(r() * 5)];
      for (const [k, cc] of [[1, '#f1e2c4'], [0.72, col], [0.4, '#e8b64c'], [0.16, '#213270']]) { x.fillStyle = cc; x.beginPath(); x.moveTo(W / 2, cy - s * k); x.lineTo(W / 2 + s * k * 1.25, cy); x.lineTo(W / 2, cy + s * k); x.lineTo(W / 2 - s * k * 1.25, cy); x.closePath(); x.fill(); }
      x.fillStyle = '#f1e2c4'; for (const sx of [34, W - 34]) for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(sx, cy + k * bh * 0.3 - 7); x.lineTo(sx + 7, cy + k * bh * 0.3); x.lineTo(sx, cy + k * bh * 0.3 + 7); x.lineTo(sx - 7, cy + k * bh * 0.3); x.closePath(); x.fill(); } }
    x.strokeStyle = 'rgba(58,37,48,.8)'; x.lineWidth = 3; x.strokeRect(1.5, 13.5, W - 3, H - 27); return c; };
  art.tableSet = function (kind) {     // masa, iki tabure, üstünde tavla ya da fincanlar
    const g = P(3.0, 1.55), x = g.x;
    for (const sx of [0.42, 2.58]) { g.rect(sx - 0.05, 0, 0.1, 0.5, C.woodD, 0.035); x.beginPath(); x.ellipse(sx, 0.52, 0.3, 0.1, 0, 0, 6.3); g.fs(C.woodL, 0.045); x.beginPath(); x.ellipse(sx, 0.56, 0.24, 0.07, 0, 0, 6.3); g.fs(kind ? C.red : C.cini, 0.03); }
    g.rect(1.38, 0, 0.24, 0.82, C.woodD, 0.045); g.poly([[1.05, 0], [1.95, 0], [1.72, 0.14], [1.28, 0.14]], C.woodD, 0.045);
    x.beginPath(); x.ellipse(1.5, 0.88, 0.98, 0.3, 0, 0, 6.3); g.fs(C.wood, 0.05); x.beginPath(); x.ellipse(1.5, 0.94, 0.98, 0.3, 0, 0, 6.3); g.fs(C.woodL, 0.05);
    if (!kind) { g.poly([[0.95, 0.9], [2.05, 0.9], [1.9, 1.08], [1.1, 1.08]], '#5f3a29', 0.04); g.poly([[1.02, 0.93], [1.98, 0.93], [1.85, 1.05], [1.15, 1.05]], '#f1e2c4', 0.025);
      for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(1.08 + k * 0.145, 0.935); x.lineTo(1.15 + k * 0.145, 0.935); x.lineTo(1.13 + k * 0.12 + 0.04, 1.0); x.closePath(); x.fillStyle = k % 2 ? C.red : C.navy; x.fill(); }
      g.circle(1.36, 0.985, 0.035, '#fff', 0.02); g.circle(1.6, 1.0, 0.035, '#2a2026', 0.02); }
    else { for (const [cx, col] of [[1.1, C.cini], [1.5, C.gold], [1.9, C.turq]]) { g.poly([[cx - 0.08, 0.94], [cx + 0.08, 0.94], [cx + 0.06, 1.1], [cx - 0.06, 1.1]], '#f6efe0', 0.03); x.fillStyle = col; x.fillRect(cx - 0.07, 1.0, 0.14, 0.04); } g.rect(1.28, 0.95, 0.2, 0.03, '#fff', 0.02); }
    return g;
  };
  art.counter = function () { const g = P(3.8, 1.75), x = g.x; g.rect(0.1, 0, 3.6, 1.15, C.wood, 0.05); for (let k = 0; k < 4; k++) { g.rect(0.25 + k * 0.87, 0.14, 0.7, 0.84, C.woodL, 0.04); g.cini(0.33 + k * 0.87, 0.46, 0.54, 0.18); }
    g.rect(0, 1.12, 3.8, 0.16, C.woodD, 0.05); for (const [cx, col] of [[0.5, '#c9773a'], [1.0, C.goldD], [2.9, '#c9773a']]) { x.beginPath(); x.ellipse(cx, 1.5, 0.15, 0.2, 0, 0, 6.3); g.fs(col, 0.035); g.rect(cx - 0.05, 1.66, 0.1, 0.07, col, 0.03); x.strokeStyle = OUT; x.lineWidth = 0.03; x.beginPath(); x.moveTo(cx + 0.15, 1.56); x.lineTo(cx + 0.3, 1.62); x.stroke(); }
    for (let k = 0; k < 4; k++) g.poly([[1.6 + k * 0.26, 1.28], [1.76 + k * 0.26, 1.28], [1.74 + k * 0.26, 1.46], [1.62 + k * 0.26, 1.46]], '#f6efe0', 0.03); return g; };
  art.hangLantern = function () { const g = P(0.9, 2.9), x = g.x; x.strokeStyle = '#3b3344'; x.lineWidth = 0.04; x.setLineDash([0.08, 0.05]); x.beginPath(); x.moveTo(0.45, 2.9); x.lineTo(0.45, 0.95); x.stroke(); x.setLineDash([]);
    g.poly([[0.2, 0.95], [0.7, 0.95], [0.45, 1.2]], C.goldD, 0.04); g.lit(xx => { xx.beginPath(); xx.moveTo(0.22, 0.95); xx.lineTo(0.68, 0.95); xx.lineTo(0.6, 0.32); xx.lineTo(0.3, 0.32); xx.closePath(); }, '#ffd88c', '#ffe9b0');
    x.beginPath(); x.moveTo(0.22, 0.95); x.lineTo(0.68, 0.95); x.lineTo(0.6, 0.32); x.lineTo(0.3, 0.32); x.closePath(); g.fs(null, 0.04); x.strokeStyle = OUT; x.lineWidth = 0.03; x.beginPath(); x.moveTo(0.45, 0.95); x.lineTo(0.45, 0.32); x.stroke();
    g.poly([[0.28, 0.32], [0.62, 0.32], [0.45, 0.12]], C.goldD, 0.04); g.circle(0.45, 0.08, 0.05, C.gold, 0.03); return g; };

  /* ---------- Ejder Bahçesi ---------- */
  art.nest = function () { const g = P(2.6, 1.7), x = g.x, r = rng(31);
    x.beginPath(); x.ellipse(1.3, 0.5, 1.15, 0.45, 0, 0, 6.3); g.fs('#8a6a3c', 0.05);
    for (let i = 0; i < 60; i++) { x.strokeStyle = r() > 0.5 ? '#d9b05a' : '#b98a3a'; x.lineWidth = 0.035; const a = r() * 6.3, d = 0.5 + r() * 0.6; x.beginPath(); x.moveTo(1.3 + Math.cos(a) * d, 0.52 + Math.sin(a) * d * 0.36); x.lineTo(1.3 + Math.cos(a + 0.5) * (d + 0.3), 0.52 + Math.sin(a + 0.5) * (d + 0.3) * 0.36); x.stroke(); }
    g.lit(xx => { xx.beginPath(); xx.ellipse(1.3, 0.62, 0.62, 0.2, 0, 0, 6.3); }, '#ff8a3c', '#c9773a');
    for (const [cx, col, sp] of [[0.98, '#d9442f', '#ffb04a'], [1.6, '#3f7fd0', '#bfe6ff']]) { x.beginPath(); x.ellipse(cx, 0.98, 0.3, 0.42, cx < 1.3 ? -0.15 : 0.15, 0, 6.3); g.fs(col, 0.05); x.fillStyle = sp; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(cx + (r() - 0.5) * 0.36, 0.98 + (r() - 0.5) * 0.56, 0.035 + r() * 0.03, 0, 6.3); x.fill(); } x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(cx - 0.1, 1.14, 0.06, 0.12, 0.4, 0, 6.3); x.fill(); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI + 3.14, cx = 1.3 + Math.cos(a) * 1.12, cy = 0.44 + Math.sin(a) * 0.4; x.beginPath(); x.ellipse(cx, cy, 0.2, 0.15, 0, 0, 6.3); g.fs(['#d9cbb6', '#c7b79f', '#e6dac8'][i % 3], 0.04); }
    return g; };
  art.pondRim = function () { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), r = rng(9); for (let i = 0; i < 30; i++) { const a = i / 30 * 6.2832, cx = 256 + Math.cos(a) * 232, cy = 256 + Math.sin(a) * 232; x.save(); x.translate(cx, cy); x.rotate(a); x.beginPath(); x.ellipse(0, 0, 20 + r() * 6, 24 + r() * 5, 0, 0, 6.3); x.fillStyle = ['#e6dac8', '#d3c4ae', '#efe5d6'][i % 3]; x.fill(); x.lineWidth = 3; x.strokeStyle = '#3a2530'; x.stroke(); x.restore(); } return c; };
  art.lily = function (flower) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 54, 0.35, 6.0); x.closePath(); x.fillStyle = '#4f9a4a'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#2f6e3c'; x.stroke();
    x.strokeStyle = 'rgba(160,220,140,.6)'; x.lineWidth = 2; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(1 + k) * 46, 64 + Math.sin(1 + k) * 46); x.stroke(); }
    if (flower) for (let k = 0; k < 8; k++) { x.save(); x.translate(64, 60); x.rotate(k / 8 * 6.2832); x.beginPath(); x.ellipse(0, -16, 8, 16, 0, 0, 6.3); x.fillStyle = k % 2 ? '#fbcbe0' : '#ec93bd'; x.fill(); x.restore(); } if (flower) { x.fillStyle = '#ffd76a'; x.beginPath(); x.arc(64, 60, 7, 0, 6.3); x.fill(); } return c; };

  /* ---------- Kuzey Yolu ---------- */
  art.fence = function (len) { const g = P(len, 1.25, 64); for (const ry of [0.45, 0.85]) g.rect(0, ry, len, 0.13, C.woodL, 0.04); for (let p = 0.25; p < len; p += 2.1) { g.rect(p - 0.09, 0, 0.18, 1.15, C.wood, 0.045); g.poly([[p - 0.09, 1.15], [p + 0.09, 1.15], [p, 1.25]], C.wood, 0.04); } return g; };
  art.signpost = function () { const g = P(2.0, 2.8), x = g.x; g.rect(0.92, 0, 0.16, 2.6, C.wood, 0.045); g.poly([[0.92, 2.6], [1.08, 2.6], [1.0, 2.76]], C.wood, 0.04);
    g.poly([[0.25, 1.75], [1.6, 1.75], [1.9, 2.0], [1.6, 2.25], [0.25, 2.25]], C.woodL, 0.05); g.poly([[1.75, 1.05], [0.4, 1.05], [0.1, 1.3], [0.4, 1.55], [1.75, 1.55]], C.woodL, 0.05);
    x.strokeStyle = C.navy; x.lineWidth = 0.07; x.beginPath(); x.moveTo(0.6, 1.85); x.lineTo(1.2, 2.15); x.moveTo(1.2, 1.85); x.lineTo(0.6, 2.15); x.stroke(); g.poly([[0.85, 1.14], [1.35, 1.14], [1.1, 1.46]], C.red, 0.035); return g; };
  art.tent = function () { const g = P(4.6, 3.6), x = g.x, cols = ['#f1e2c4', C.red, '#f1e2c4', C.navy, '#f1e2c4', C.red, '#f1e2c4'];
    x.strokeStyle = '#6b4a2a'; x.lineWidth = 0.035; for (const [a, b] of [[0.5, 0.02], [4.1, 4.58]]) { x.beginPath(); x.moveTo(a, 1.5); x.lineTo(b, 0); x.stroke(); }
    for (let k = 0; k < 7; k++) g.poly([[0.5 + k * 0.514, 0], [0.5 + (k + 1) * 0.514, 0], [1.5 + (k + 1) * 0.228, 2.0], [1.5 + k * 0.228, 2.0]], cols[k], 0.035);
    g.poly([[1.5, 2.0], [3.1, 2.0], [2.3, 3.1]], C.red, 0.05); x.beginPath(); for (let k = 0; k < 6; k++) x.arc(1.5 + 0.133 + k * 0.267, 2.0, 0.133, Math.PI, 6.2832); g.fs(C.gold, 0.035);
    g.poly([[1.9, 0], [2.7, 0], [2.3, 1.7]], '#2a1c22', 0.045); g.lit(xx => { xx.beginPath(); xx.moveTo(2.0, 0); xx.lineTo(2.6, 0); xx.lineTo(2.3, 0.9); xx.closePath(); }, '#ff9a3c', '#6a3a2c');
    g.rect(2.27, 3.05, 0.06, 0.45, C.woodD, 0.03); g.poly([[2.33, 3.5], [2.9, 3.36], [2.33, 3.2]], C.navy, 0.035); return g; };
  art.rock = function (seed) { const g = P(1.9, 1.3), x = g.x, r = rng(seed), pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI; pts.push([0.95 - Math.cos(a) * (0.75 + r() * 0.15), Math.sin(a) * (0.7 + r() * 0.45)]); }
    g.poly([[0.15, 0], ...pts, [1.75, 0]], '#b9ad9f', 0.055); x.save(); x.beginPath(); x.moveTo(0.15, 0); for (const p of pts) x.lineTo(p[0], p[1]); x.lineTo(1.75, 0); x.closePath(); x.clip();
    x.fillStyle = 'rgba(74,52,110,.28)'; x.fillRect(1.0, 0, 1, 1.3); x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(0.6, 0.85, 0.3, 0.14, -0.3, 0, 6.3); x.fill(); x.restore(); g.ivy(0.5, 0.12, 0.8, 0.26, seed, null); return g; };
  art.flowerPatch = function (seed) { const g = P(1.9, 0.95), x = g.x, r = rng(seed); for (let i = 0; i < 26; i++) { const bx = 0.15 + r() * 1.6, h = 0.25 + r() * 0.45; x.beginPath(); x.moveTo(bx - 0.05, 0); x.lineTo(bx + (r() - 0.5) * 0.2, h); x.lineTo(bx + 0.05, 0); x.closePath(); x.fillStyle = r() > 0.5 ? '#58a44e' : '#8fd064'; x.fill();
      if (r() < 0.45) { g.circle(bx, h + 0.04, 0.085, ['#f7a8cc', '#fff', '#ffd76a', '#c9a0dc', '#ff8a6a'][Math.floor(r() * 5)], 0.02); g.circle(bx, h + 0.04, 0.03, '#fff4c8', 0); } } return g; };
  art.waterStrip = function () { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#2f8fd6'); g.addColorStop(0.5, '#6fcbf2'); g.addColorStop(1, '#2f8fd6'); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    const r = rng(4); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; x.lineCap = 'round'; for (let i = 0; i < 22; i++) { const px = r() * 256, py = 10 + r() * 108, w = 14 + r() * 26; for (const ox of [-256, 0, 256]) { x.beginPath(); x.moveTo(px + ox, py); x.lineTo(px + ox + w, py); x.stroke(); } }
    x.fillStyle = 'rgba(40,60,110,.35)'; x.fillRect(0, 0, 256, 6); x.fillRect(0, 122, 256, 6); return c; };
})();
