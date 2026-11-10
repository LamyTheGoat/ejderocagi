/* EO2 dikey dilim · kodla çizilen yer tutucu sanat
   Buradaki her şey Canvas 2D ile üretilir ve dokuya çevrilir. Nihai sanat DEĞİLDİR: 03/04 hattından gelecek
   çizimlerin yerini tutar. Amaç K1 (gündüz tonu + akşam ışığı) ve K2 (Anadolu mimarisi) kararlarını sahnede göstermek.
   Karakter ve ejder bu dosyadan gelmez; onlar chibi hattının gerçek çizimleridir (assets/). */
(function () {
  'use strict';
  const EO2 = window.EO2 = window.EO2 || {};
  const PPM = 96;                                   // cephe dokusu: metre başına piksel
  const OUT = '#3a2530';
  const C = { stone: '#ead9bd', stoneD: '#d2bc98', stoneDk: '#aa927c', plaster: '#f8f0e2', wood: '#8f5c3b', woodD: '#5f3a29', woodL: '#b98253',
    tile: '#d25d40', tileD: '#a9422f', tileL: '#ee8c64', navy: '#213270', cini: '#2f7fc8', turq: '#3cbab0', gold: '#eab94f', goldD: '#a8772b',
    lead: '#93a8c8', leadD: '#6b7fa3', glass: '#28304f', lit: '#ffd88c', red: '#bb362f', redD: '#8a2424', leaf: '#4f9a4a', leafD: '#2f6e3c', leafL: '#86c95e',
    pink: '#ec93bd', pinkD: '#c9689b', pinkL: '#fbcbe0', dark: '#2a2036' };

  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const tint = (h, d) => { const c = hex(h); return `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v * (1 + d))))).join(',')})`; };

  /* Ressam: metre birimli, y yukarı. lit(): gündüz dolgusunu yapar, aynı şekli akşam ışık dokusuna da yazar. */
  function P(wm, hm, ppm = PPM) {
    const c = document.createElement('canvas'); c.width = Math.ceil(wm * ppm); c.height = Math.ceil(hm * ppm);
    const x = c.getContext('2d'); x.translate(0, c.height); x.scale(ppm, -ppm); x.lineJoin = 'round'; x.lineCap = 'round';
    const g = { c, x, wm, hm, ppm, lits: [] };
    g.fs = (fill, lw = 0.05, stroke = OUT) => { if (fill) { x.fillStyle = fill; x.fill(); } if (lw) { x.lineWidth = lw; x.strokeStyle = stroke; x.stroke(); } };
    g.rect = (px, py, w, h, fill, lw) => { x.beginPath(); x.rect(px, py, w, h); g.fs(fill, lw); };
    g.poly = (pts, fill, lw, stroke) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); g.fs(fill, lw, stroke); };
    g.circle = (cx, cy, r, fill, lw) => { x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); g.fs(fill, lw); };
    g.shade = (px, py, w, h, a = 0.22) => { x.fillStyle = `rgba(74,52,110,${a})`; x.fillRect(px, py, w, h); };
    g.archPath = (cx, y0, w, h) => { const hw = w / 2, ys = Math.max(y0, y0 + h - w * 0.74); x.beginPath(); x.moveTo(cx - hw, y0); x.lineTo(cx - hw, ys);
      x.quadraticCurveTo(cx - hw, y0 + h - w * 0.10, cx, y0 + h); x.quadraticCurveTo(cx + hw, y0 + h - w * 0.10, cx + hw, ys); x.lineTo(cx + hw, y0); x.closePath(); };
    g.lit = (pathFn, col = C.lit, day) => { pathFn(x); x.fillStyle = day || col; x.fill(); g.lits.push(pathFn); };
    // Kesme taş duvar: şaşırtmalı sıralar, taş taş hafif ton farkı.
    g.stone = (px, py, w, h, o = {}) => { const { base = C.stone, row = 0.44, bw = 1.0, seed = 1, lw = 0.05, ja = 0.30 } = o, r = rng(seed);
      x.save(); x.beginPath(); x.rect(px, py, w, h); x.clip(); x.fillStyle = base; x.fillRect(px, py, w, h);
      for (let yy = py, i = 0; yy < py + h; yy += row, i++) { let xx = px - (i % 2) * bw * 0.5 - r() * 0.25;
        while (xx < px + w) { const ww = bw * (0.7 + r() * 0.6); x.fillStyle = tint(base, (r() - 0.5) * 0.11); x.fillRect(xx, yy, ww, row);
          x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(xx, yy + row - 0.05, ww, 0.05);
          x.strokeStyle = `rgba(96,62,74,${ja})`; x.lineWidth = 0.028; x.strokeRect(xx, yy, ww, row); xx += ww; } }
      x.restore(); if (lw) { x.beginPath(); x.rect(px, py, w, h); g.fs(null, lw); } };
    // Kiremit çatı (cepheden): yamuk, balık pulu sıraları.
    g.roof = (x0, x1, y, h, inset, o = {}) => { const { col = C.tile, colD = C.tileD, colL = C.tileL } = o;
      const pts = [[x0, y], [x1, y], [x1 - inset, y + h], [x0 + inset, y + h]];
      x.save(); x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.clip();
      x.fillStyle = col; x.fillRect(x0, y, x1 - x0, h);
      const rh = 0.30, rr = 0.21;
      for (let yy = y + h, i = 0; yy > y - rh; yy -= rh, i++) { x.fillStyle = i % 2 ? col : tint(col, -0.06); x.fillRect(x0, yy - rh, x1 - x0, rh);
        for (let xx = x0 - (i % 2) * rr; xx < x1 + rr; xx += rr * 2) { x.beginPath(); x.arc(xx, yy, rr, Math.PI, 6.2832); x.fillStyle = i % 2 ? tint(col, 0.05) : col; x.fill();
          x.strokeStyle = colD; x.lineWidth = 0.032; x.stroke(); } }
      const sh = x.createLinearGradient(0, y + h, 0, y); sh.addColorStop(0, 'rgba(255,220,170,.25)'); sh.addColorStop(0.5, 'rgba(255,220,170,0)'); sh.addColorStop(1, 'rgba(80,30,60,.22)');
      x.fillStyle = sh; x.fillRect(x0, y, x1 - x0, h); x.restore();
      g.poly(pts, null, 0.055); g.rect(x0 - 0.05, y - 0.16, x1 - x0 + 0.1, 0.2, colD, 0.05); g.rect(x0 + inset - 0.1, y + h - 0.06, x1 - x0 - 2 * inset + 0.2, 0.16, colL, 0.045); };
    // Sivri kemerli pencere; istenirse kepenkli. Camın alt yarısı içeriden ışık alır (akşam dokusuna da yazılır).
    g.window = (cx, y, w, h, o = {}) => { const { shutter = null, frame = C.stoneD, arch = true } = o;
      if (shutter) { for (const s of [-1, 1]) { const sx = cx + s * (w / 2 + w * 0.26); g.rect(sx - w * 0.24, y, w * 0.48, h * (arch ? 0.86 : 1), shutter, 0.045);
        x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 0.025; for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(sx - w * 0.2, y + h * 0.14 * k); x.lineTo(sx + w * 0.2, y + h * 0.14 * k); x.stroke(); } } }
      const path = (xx, pad) => { if (arch) { const hw = (w + pad * 2) / 2, yb = y - pad, hh = h + pad * 2, ys = Math.max(yb, yb + hh - (w + pad * 2) * 0.74); xx.beginPath(); xx.moveTo(cx - hw, yb); xx.lineTo(cx - hw, ys);
          xx.quadraticCurveTo(cx - hw, yb + hh - (w + pad * 2) * 0.10, cx, yb + hh); xx.quadraticCurveTo(cx + hw, yb + hh - (w + pad * 2) * 0.10, cx + hw, ys); xx.lineTo(cx + hw, yb); xx.closePath(); }
        else { xx.beginPath(); xx.rect(cx - w / 2 - pad, y - pad, w + pad * 2, h + pad * 2); } };
      path(x, 0.10); g.fs(frame, 0.05); path(x, 0); g.fs(C.glass, 0.04);
      x.save(); path(x, 0); x.clip(); g.lit(xx => path(xx, 0), '#f2b866', '#7f95c4');
      x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.moveTo(cx - w * 0.38, y + h * 0.08); x.lineTo(cx - w * 0.12, y + h * 0.08); x.lineTo(cx - w * 0.34, y + h * 0.5); x.lineTo(cx - w * 0.5, y + h * 0.5); x.closePath(); x.fill();
      const gr = x.createLinearGradient(0, y + h * 0.62, 0, y + h * 0.3); gr.addColorStop(0, C.glass); gr.addColorStop(1, 'rgba(40,48,79,0)'); x.fillStyle = gr; x.fillRect(cx - w / 2, y, w, h);
      x.restore();
      x.strokeStyle = OUT; x.lineWidth = 0.035; x.beginPath(); x.moveTo(cx, y); x.lineTo(cx, y + h * 0.92); x.moveTo(cx - w / 2, y + h * 0.5); x.lineTo(cx + w / 2, y + h * 0.5); x.stroke();
      g.rect(cx - w / 2 - 0.16, y - 0.16, w + 0.32, 0.12, frame, 0.04); };
    // Çini kuşağı: lacivert zemin, firuze sekiz köşeli yıldızlar, altın çerçeve.
    g.cini = (px, py, w, h) => { g.rect(px, py, w, h, C.navy, 0.045); const n = Math.max(1, Math.round(w / h)), tw = w / n;
      for (let i = 0; i < n; i++) { const cx = px + tw * (i + 0.5), cy = py + h / 2, s = h * 0.30;
        x.save(); x.translate(cx, cy); x.fillStyle = i % 2 ? C.turq : C.cini; x.fillRect(-s, -s, 2 * s, 2 * s); x.rotate(Math.PI / 4); x.fillRect(-s, -s, 2 * s, 2 * s); x.restore();
        g.circle(cx, cy, h * 0.11, '#f7f1e2', 0); }
      x.strokeStyle = C.gold; x.lineWidth = 0.035; x.strokeRect(px + 0.05, py + 0.05, w - 0.1, h - 0.1); };
    // Sancak: yukarıdan sarkar, çatal uçlu; ortasında altın ejder başı arması.
    g.banner = (cx, yTop, w, h, col = C.navy, emb = null) => { const hw = w / 2, yb = yTop - h;
      g.poly([[cx - hw, yTop], [cx + hw, yTop], [cx + hw, yb], [cx, yb + w * 0.42], [cx - hw, yb]], col, 0.05);
      x.strokeStyle = C.gold; x.lineWidth = 0.05; x.beginPath(); x.moveTo(cx - hw + 0.09, yTop - 0.06); x.lineTo(cx - hw + 0.09, yb + 0.14); x.lineTo(cx, yb + w * 0.42 + 0.12); x.lineTo(cx + hw - 0.09, yb + 0.14); x.lineTo(cx + hw - 0.09, yTop - 0.06); x.stroke();
      g.rect(cx - hw - 0.08, yTop - 0.03, w + 0.16, 0.12, C.goldD, 0.04);
      if (emb) { const s = w * 0.74, eh = s * emb.height / emb.width; x.save(); x.translate(cx, yTop - h * 0.42); x.scale(1, -1); x.drawImage(emb, -s / 2, -eh / 2, s, eh); x.restore(); } };
    g.crenels = (x0, x1, y, o = {}) => { const { mw = 0.62, mh = 0.55, gap = 0.42, base = C.stone, seed = 5 } = o; const n = Math.max(1, Math.floor((x1 - x0 + gap) / (mw + gap))), step = (x1 - x0 - mw) / Math.max(1, n - 1);
      for (let i = 0; i < n; i++) { const mx = x0 + i * step; g.stone(mx, y, mw, mh, { base, seed: seed + i, row: 0.3, bw: 0.5 }); g.rect(mx - 0.04, y + mh - 0.02, mw + 0.08, 0.1, tint(base, -0.1), 0.04); } };
    // Sarmaşık ve çiçek kümesi.
    g.ivy = (cx, cy, w, h, seed = 1, flowers = null) => { const r = rng(seed), pts = []; for (let i = 0; i < Math.round(w * h * 22); i++) pts.push([cx + (r() - 0.5) * w * (0.5 + r() * 0.5), cy + (r() - 0.5) * h, 0.09 + r() * 0.11, r()]);
      for (const p of pts) g.circle(p[0], p[1] - 0.03, p[2] + 0.02, C.leafD, 0); for (const p of pts) g.circle(p[0], p[1], p[2] * 0.8, p[3] > 0.6 ? C.leafL : C.leaf, 0);
      if (flowers) for (const p of pts) if (p[3] < 0.22) { g.circle(p[0], p[1], 0.075, flowers, 0); g.circle(p[0], p[1], 0.03, '#fff4c8', 0); } };
    g.lantern = (cx, y) => { x.strokeStyle = OUT; x.lineWidth = 0.05; x.beginPath(); x.moveTo(cx, y + 0.55); x.lineTo(cx, y + 0.36); x.stroke();
      g.poly([[cx - 0.07, y + 0.36], [cx + 0.07, y + 0.36], [cx + 0.15, y + 0.28], [cx - 0.15, y + 0.28]], C.goldD, 0.04);
      g.lit(xx => { xx.beginPath(); xx.rect(cx - 0.12, y, 0.24, 0.28); }, C.lit, '#fbeec4'); x.beginPath(); x.rect(cx - 0.12, y, 0.24, 0.28); g.fs(null, 0.04);
      g.rect(cx - 0.15, y - 0.06, 0.3, 0.07, C.goldD, 0.04); };
    return g;
  }
  /* Akşam ışık dokusu: lit() ile işaretlenen şekiller, yumuşak hale ile. Toplamalı çizilir. */
  function glowOf(g) {
    const c = document.createElement('canvas'); c.width = g.c.width; c.height = g.c.height; const x = c.getContext('2d');
    x.translate(0, c.height); x.scale(g.ppm, -g.ppm);
    for (const pass of [[g.ppm * 0.5, 'rgba(255,160,60,.6)', 'rgba(255,170,80,.26)'], [g.ppm * 0.12, 'rgba(255,205,130,.8)', 'rgba(255,200,125,.5)']]) {
      x.shadowBlur = pass[0]; x.shadowColor = pass[1]; x.fillStyle = pass[2]; for (const fn of g.lits) { fn(x); x.fill(); } }
    return c;
  }

  /* ---------- Yapılar ---------- */
  function timber(g, x0, x1, y0, y1, posts, diag) { const x = g.x;
    for (const p of posts) g.rect(p - 0.09, y0, 0.18, y1 - y0, C.wood, 0.04);
    x.strokeStyle = C.wood; x.lineWidth = 0.15; for (const d of diag || []) { x.beginPath(); x.moveTo(d[0], y0 + 0.1); x.lineTo(d[1], y1 - 0.1); x.stroke(); }
    g.rect(x0, y1 - 0.2, x1 - x0, 0.2, C.woodD, 0.04); g.rect(x0 - 0.08, y0 - 0.06, x1 - x0 + 0.16, 0.26, C.woodD, 0.045); }

  function han(E) {            // 10.4 × 9.3 m; duvar 0.4..10.0
    const g = P(10.4, 9.3), x = g.x;
    g.rect(7.55, 7.4, 0.75, 1.45, C.stoneD, 0.05); g.rect(7.45, 8.8, 0.95, 0.2, C.stoneDk, 0.045);
    g.roof(0, 10.4, 6.5, 2.3, 1.9);
    g.rect(0.4, 3.4, 9.6, 3.1, C.plaster, 0.05);
    g.shade(0.4, 6.1, 9.6, 0.4, 0.25);
    timber(g, 0.4, 10.0, 3.4, 6.5, [0.5, 2.05, 3.3, 7.1, 8.35, 9.9], [[0.6, 1.95], [9.8, 8.45]]);
    g.window(2.68, 4.25, 0.8, 1.35, { shutter: C.cini, frame: C.woodL }); g.window(7.72, 4.25, 0.8, 1.35, { shutter: C.cini, frame: C.woodL });
    g.window(1.28, 4.25, 0.62, 1.25, { frame: C.woodL }); g.window(9.12, 4.25, 0.62, 1.25, { frame: C.woodL });
    g.stone(0.4, 0, 9.6, 3.4, { seed: 3 });
    g.shade(0.4, 3.0, 9.6, 0.4, 0.2);
    // taç kapı
    g.stone(3.45, 0, 3.5, 3.15, { base: C.stoneD, seed: 9, row: 0.5, bw: 0.8 }); g.cini(3.6, 2.62, 3.2, 0.4);
    g.archPath(5.2, 0, 2.5, 2.52); g.fs(C.stoneDk, 0.05);
    g.archPath(5.2, 0, 2.05, 2.28); g.fs('#2a1c22', 0.05);
    x.save(); g.archPath(5.2, 0, 2.05, 2.28); x.clip();
    g.lit(xx => { xx.beginPath(); xx.rect(4.1, 0, 2.2, 1.25); }, '#e9954a', '#8a5a40');
    const ig = x.createLinearGradient(0, 1.25, 0, 0.2); ig.addColorStop(0, '#2a1c22'); ig.addColorStop(1, 'rgba(42,28,34,0)'); x.fillStyle = ig; x.fillRect(4.1, 0, 2.2, 1.3);
    g.rect(4.55, 0, 0.5, 0.62, C.woodD, 0.04); g.rect(5.35, 0, 0.62, 0.5, C.woodD, 0.04); g.lantern(5.2, 1.55); x.restore();
    g.window(1.9, 1.15, 0.95, 1.45); g.window(8.5, 1.15, 0.95, 1.45);
    g.lantern(3.1, 1.75); g.lantern(7.3, 1.75);
    // cumba
    g.poly([[3.5, 2.95], [3.72, 3.2], [3.5, 3.2]], C.woodD, 0.04); g.poly([[6.9, 2.95], [6.68, 3.2], [6.9, 3.2]], C.woodD, 0.04);
    g.rect(3.42, 3.2, 3.56, 3.42, C.plaster, 0.055); g.rect(3.34, 3.2, 3.72, 0.24, C.woodD, 0.045); g.rect(3.34, 6.42, 3.72, 0.2, C.woodD, 0.045);
    for (const px of [3.5, 4.62, 5.78, 6.9]) g.rect(px - 0.08, 3.44, 0.16, 2.98, C.wood, 0.04);
    for (const cx of [4.06, 5.2, 6.34]) g.window(cx, 4.2, 0.66, 1.5, { frame: C.woodL });
    g.rect(3.58, 3.6, 3.24, 0.36, C.cini, 0.04); x.strokeStyle = '#f7f1e2'; x.lineWidth = 0.04; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(3.76 + k * 0.36, 3.66); x.lineTo(3.94 + k * 0.36, 3.9); x.lineTo(4.12 + k * 0.36, 3.66); x.stroke(); }
    g.ivy(0.75, 2.2, 0.9, 2.6, 4); g.ivy(9.75, 1.6, 0.7, 1.8, 6, C.pinkL);
    return g;
  }
  function sideWall(len, o = {}) {       // yan cephe: alt kat taş, üst kat sıva, kiremit bandı
    const { stoneH = 3.4, wallH = 6.5, roofH = 2.0, seed = 21, plaster = true, base = C.stone, wins = 2, cren = false, shutter = C.cini } = o;
    const g = P(len, wallH + roofH + (cren ? 0.6 : 0.1));
    if (roofH) g.roof(-0.3, len + 0.3, wallH, roofH, Math.min(len * 0.32, 1.9));
    if (plaster) { g.rect(0, stoneH, len, wallH - stoneH, C.plaster, 0.05); timber(g, 0, len, stoneH, wallH, [0.1, len / 2, len - 0.1], [[0.2, len / 2 - 0.15]]);
      for (let i = 0; i < wins; i++) g.window(len * (i + 0.5) / wins + (i ? 0.25 : -0.25), stoneH + 0.9, 0.7, 1.25, { shutter, frame: C.woodL }); }
    g.stone(0, 0, len, plaster ? stoneH : wallH, { seed, base }); g.shade(0, (plaster ? stoneH : wallH) - 0.35, len, 0.35, 0.2);
    if (!plaster) { for (let i = 0; i < wins; i++) g.window(len * (i + 0.5) / wins, wallH * 0.52, 0.6, 1.1); }
    else g.window(len * 0.5, 1.2, 0.8, 1.3);
    if (cren) g.crenels(0, len, wallH, { base });
    g.x.fillStyle = 'rgba(74,52,110,.16)'; g.x.fillRect(0, 0, len, wallH + roofH + 1);      // yan yüz gölgede
    return g;
  }
  function house(seed, shutter, door = 1.3) {   // konak: 5.4 × 7.9 m
    const g = P(5.4, 7.9), x = g.x;
    g.roof(0, 5.4, 5.6, 2.0, 1.5);
    g.rect(0.3, 2.9, 4.8, 2.7, C.plaster, 0.05); g.shade(0.3, 5.25, 4.8, 0.35, 0.25);
    timber(g, 0.3, 5.1, 2.9, 5.6, [0.4, 1.5, 3.9, 5.0], seed % 2 ? [[0.5, 1.4]] : [[5.0, 4.0]]);
    g.window(0.95, 3.7, 0.56, 1.15, { frame: C.woodL }); g.window(4.45, 3.7, 0.56, 1.15, { frame: C.woodL });
    g.stone(0.3, 0, 4.8, 2.9, { seed, base: seed % 2 ? C.stone : '#e3d3c0' }); g.shade(0.3, 2.55, 4.8, 0.35, 0.2);
    g.archPath(door, 0, 1.25, 2.2); g.fs(C.stoneDk, 0.05); g.archPath(door, 0, 1.0, 2.02); g.fs(C.wood, 0.05);
    x.strokeStyle = C.woodD; x.lineWidth = 0.035; for (const dx of [-0.25, 0, 0.25]) { x.beginPath(); x.moveTo(door + dx, 0); x.lineTo(door + dx, 1.8); x.stroke(); }
    g.circle(door + 0.3, 1.0, 0.07, C.gold, 0.03);
    g.window(door < 2.5 ? 3.7 : 1.5, 1.0, 0.85, 1.25); g.lantern(door < 2.5 ? 2.4 : 2.9, 1.5);
    g.rect(1.52, 2.7, 2.36, 3.1, C.plaster, 0.055); g.rect(1.44, 2.7, 2.52, 0.22, C.woodD, 0.045); g.rect(1.44, 5.62, 2.52, 0.18, C.woodD, 0.045);
    g.poly([[1.56, 2.46], [1.76, 2.7], [1.56, 2.7]], C.woodD, 0.04); g.poly([[3.84, 2.46], [3.64, 2.7], [3.84, 2.7]], C.woodD, 0.04);
    g.window(2.2, 3.55, 0.6, 1.35, { frame: C.woodL, shutter: null }); g.window(3.2, 3.55, 0.6, 1.35, { frame: C.woodL });
    g.rect(1.66, 3.02, 2.08, 0.3, shutter, 0.04);
    g.ivy(seed % 2 ? 4.95 : 0.5, 1.4, 0.7, 2.2, seed + 3, seed % 2 ? C.pinkL : '#fff');
    return g;
  }
  function bedesten() {        // 10 × 8.4 m; üç kemerli çarşı, kurşun kubbeler
    const g = P(10, 8.4), x = g.x;
    for (const cx of [2.0, 5.0, 8.0]) { g.rect(cx - 1.25, 4.9, 2.5, 0.6, C.stoneD, 0.05);
      x.beginPath(); x.ellipse(cx, 5.5, 1.35, 1.75, 0, 0, Math.PI); x.closePath(); g.fs(C.lead, 0.055);
      x.save(); x.beginPath(); x.ellipse(cx, 5.5, 1.35, 1.75, 0, 0, Math.PI); x.clip(); x.fillStyle = 'rgba(60,70,120,.28)'; x.beginPath(); x.ellipse(cx + 0.55, 5.4, 1.2, 1.9, 0, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(cx - 0.55, 6.5, 0.22, 0.5, 0.5, 0, 6.3); x.fill();
      x.strokeStyle = C.leadD; x.lineWidth = 0.03; for (const k of [-0.7, 0, 0.7]) { x.beginPath(); x.moveTo(cx + k, 5.5); x.quadraticCurveTo(cx + k * 0.8, 6.6, cx, 7.25); x.stroke(); } x.restore();
      g.rect(cx - 0.05, 7.2, 0.1, 0.42, C.goldD, 0.03); g.circle(cx, 7.72, 0.13, C.gold, 0.035); }
    g.stone(0.2, 0, 9.6, 4.9, { seed: 31, base: '#eddcc2' });
    g.rect(0.1, 4.82, 9.8, 0.22, C.stoneDk, 0.05); g.cini(0.5, 4.18, 9.0, 0.46); g.shade(0.2, 3.9, 9.6, 0.28, 0.16);
    for (const [i, cx] of [2.0, 5.0, 8.0].entries()) { g.archPath(cx, 0, 2.55, 3.75); g.fs(C.stoneD, 0.05); g.archPath(cx, 0, 2.1, 3.5); g.fs('#2b2030', 0.05);
      x.save(); g.archPath(cx, 0, 2.1, 3.5); x.clip();
      g.lit(xx => { xx.beginPath(); xx.rect(cx - 1.1, 0, 2.2, 1.5); }, '#d88a4a', '#7a5348');
      const ig = x.createLinearGradient(0, 1.5, 0, 0.3); ig.addColorStop(0, '#2b2030'); ig.addColorStop(1, 'rgba(43,32,48,0)'); x.fillStyle = ig; x.fillRect(cx - 1.1, 0, 2.2, 1.6);
      // raflar ve asılı kandiller
      for (const sy of [1.9, 2.5]) { x.fillStyle = '#4a3340'; x.fillRect(cx - 1.0, sy, 2.0, 0.06); for (let k = 0; k < 5; k++) g.circle(cx - 0.8 + k * 0.4, sy + 0.17, 0.11, [C.turq, C.gold, C.red, C.cini, '#c9a0dc'][(k + i) % 5], 0.025); }
      g.lantern(cx - 0.45, 2.75); g.lantern(cx + 0.45, 2.95);
      g.rect(cx - 0.9, 0, 0.7, 0.55, C.woodD, 0.04); g.rect(cx + 0.15, 0, 0.8, 0.42, C.wood, 0.04); x.restore(); }
    for (const px of [0.2, 3.3, 6.3, 9.4]) g.stone(px, 0, 0.42, 4.2, { base: C.stoneD, seed: 40 + px, row: 0.5, bw: 0.42 });
    return g;
  }
  function northGate(E) {      // 31 × 12 m: sur, kapı kulesi, iki kümbet külahlı burç
    const W = 31, g = P(W, 12, 80), x = g.x, cx = W / 2;
    g.stone(0, 0, W, 5.2, { seed: 51, base: '#e2d2ba', row: 0.52, bw: 1.2 }); g.crenels(0.1, W - 0.1, 5.2, { base: '#e2d2ba', mw: 0.7, gap: 0.5, seed: 60 });
    g.shade(0, 0, W, 5.2, 0.10); g.rect(0, 4.55, W, 0.2, C.stoneDk, 0.045);
    for (const s of [-1, 1]) { const tx = cx + s * 5.85;       // burç
      g.stone(tx - 1.35, 0, 2.7, 8.4, { seed: 70 + s, base: C.stone, row: 0.5, bw: 0.9 }); g.shade(tx + 0.5, 0, 0.85, 8.4, 0.16);
      g.rect(tx - 1.5, 8.3, 3.0, 0.3, C.stoneDk, 0.05); g.cini(tx - 1.2, 7.55, 2.4, 0.4);
      g.poly([[tx - 1.6, 8.6], [tx + 1.6, 8.6], [tx, 11.5]], C.cini, 0.055);
      x.strokeStyle = 'rgba(20,40,90,.45)'; x.lineWidth = 0.035; for (const k of [-0.9, -0.3, 0.3, 0.9]) { x.beginPath(); x.moveTo(tx + k * 1.6 / 1.0 * 0.92, 8.6); x.lineTo(tx, 11.5); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.moveTo(tx - 1.5, 8.62); x.lineTo(tx - 0.9, 8.62); x.lineTo(tx - 0.05, 11.3); x.closePath(); x.fill();
      g.circle(tx, 11.62, 0.14, C.gold, 0.035);
      g.window(tx, 5.6, 0.5, 1.1); g.rect(tx - 0.07, 2.2, 0.14, 0.9, '#2b2030', 0.03); }
    g.stone(cx - 4.4, 0, 8.8, 8.8, { seed: 80, base: C.stone, row: 0.5, bw: 1.05 }); g.crenels(cx - 4.4, cx + 4.4, 8.8, { seed: 90 });
    g.rect(cx - 4.55, 8.62, 9.1, 0.24, C.stoneDk, 0.05); g.cini(cx - 3.9, 7.5, 7.8, 0.5);
    g.archPath(cx, 0, 5.3, 6.5); g.fs(C.stoneD, 0.055);
    // sekiz köşeli yıldız madalyon
    x.save(); x.translate(cx, 6.92); g.circle(0, 0, 0.5, C.navy, 0.045); x.fillStyle = C.gold; x.fillRect(-0.27, -0.27, 0.54, 0.54); x.rotate(Math.PI / 4); x.fillRect(-0.27, -0.27, 0.54, 0.54); x.restore(); g.circle(cx, 6.92, 0.13, C.navy, 0);
    g.banner(cx - 3.45, 6.9, 1.15, 3.5, C.navy, E.emblem); g.banner(cx + 3.45, 6.9, 1.15, 3.5, C.navy, E.emblem);
    g.lantern(cx - 2.85, 1.8); g.lantern(cx + 2.85, 1.8);
    // kemer boşluğu: içi şeffaf, iç yüzü koyu
    g.archPath(cx, 0, 4.6, 6.05); g.fs('#8f7a70', 0.05);
    x.save(); x.globalCompositeOperation = 'destination-out'; g.archPath(cx, 0, 4.0, 5.72); x.fillStyle = '#000'; x.fill(); x.restore();
    g.archPath(cx, 0, 4.0, 5.72); g.fs(null, 0.05);
    g.ivy(3.2, 2.6, 2.2, 3.8, 11); g.ivy(W - 3.6, 2.2, 2.6, 3.2, 12, C.pinkL); g.ivy(cx - 7.6, 1.2, 1.2, 2.0, 13); g.ivy(cx + 7.9, 3.9, 1.6, 1.6, 14);
    return g;
  }
  function arenaGate(E) {      // 7 × 8.8 m: iri taş, çapraz toplar, kızıl sancaklar
    const g = P(7, 8.8), x = g.x, B = '#d9c8b4';
    for (const tx of [0.95, 6.05]) { g.stone(tx - 0.95, 0, 1.9, 7.6, { seed: 100 + tx, base: B, row: 0.62, bw: 0.95 }); g.crenels(tx - 0.95, tx + 0.95, 7.6, { base: B, mw: 0.5, gap: 0.2, seed: 110 }); g.rect(tx - 1.0, 7.45, 2.0, 0.22, C.stoneDk, 0.05); }
    g.stone(1.7, 0, 3.6, 6.4, { seed: 120, base: '#e0d0bc', row: 0.62, bw: 1.1 }); g.crenels(1.8, 5.2, 6.4, { base: '#e0d0bc', mw: 0.55, gap: 0.3, seed: 125 }); g.rect(1.7, 6.25, 3.6, 0.22, C.stoneDk, 0.05);
    g.shade(5.1, 0, 1.9, 7.6, 0.14);
    g.archPath(3.5, 0, 3.3, 4.3); g.fs(C.stoneDk, 0.055); g.archPath(3.5, 0, 2.8, 4.0); g.fs('#241a26', 0.05);
    x.save(); g.archPath(3.5, 0, 2.8, 4.0); x.clip();
    g.lit(xx => { xx.beginPath(); xx.rect(2.1, 0, 2.8, 1.6); }, '#c9502e', '#6a3a38');
    const ig = x.createLinearGradient(0, 1.7, 0, 0.2); ig.addColorStop(0, '#241a26'); ig.addColorStop(1, 'rgba(36,26,38,0)'); x.fillStyle = ig; x.fillRect(2.1, 0, 2.8, 1.8);
    x.strokeStyle = '#3d3440'; x.lineWidth = 0.09; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(2.35 + k * 0.46, 4.0); x.lineTo(2.35 + k * 0.46, 2.5); x.stroke(); }
    for (const yy of [2.6, 3.1, 3.6]) { x.beginPath(); x.moveTo(2.1, yy); x.lineTo(4.9, yy); x.stroke(); }
    for (let k = 0; k < 6; k++) g.poly([[2.25 + k * 0.46, 2.5], [2.45 + k * 0.46, 2.5], [2.35 + k * 0.46, 2.26]], '#3d3440', 0.02); x.restore();
    // arma: lacivert kalkan üstünde çapraz toplar
    x.save(); x.translate(3.5, 5.25); g.circle(0, 0, 0.82, C.navy, 0.055); g.circle(0, 0, 0.7, null, 0); x.strokeStyle = C.gold; x.lineWidth = 0.05; x.beginPath(); x.arc(0, 0, 0.7, 0, 6.3); x.stroke();
    for (const s of [-1, 1]) { x.save(); x.rotate(s * 0.72); x.beginPath(); x.rect(-0.1, -0.58, 0.2, 1.16); g.fs(C.gold, 0.035); x.beginPath(); x.rect(-0.14, 0.44, 0.28, 0.12); g.fs(C.goldD, 0.03); x.beginPath(); x.rect(-0.13, -0.2, 0.26, 0.08); g.fs(C.goldD, 0.03); x.restore(); }
    g.circle(0, 0, 0.13, C.red, 0.035); x.restore();
    g.banner(0.95, 6.7, 1.0, 3.3, C.red, E.emblem); g.banner(6.05, 6.7, 1.0, 3.3, C.red, E.emblem);
    g.window(0.95, 2.0, 0.34, 0.9); g.window(6.05, 2.0, 0.34, 0.9);
    return g;
  }
  function gardenGate() {      // 6.4 × 5.4 m: alçak duvar, çiçekli kemer; boşluklar şeffaf
    const g = P(6.4, 5.4), x = g.x;
    for (const [a, b] of [[0, 2.0], [4.4, 6.4]]) { g.stone(a, 0, b - a, 1.35, { seed: 140 + a, base: '#e6d8c4', row: 0.45, bw: 0.8 }); g.rect(a - 0.04, 1.3, b - a + 0.08, 0.16, C.stoneDk, 0.045);
      x.strokeStyle = '#3d4a66'; x.lineWidth = 0.06; for (let k = a + 0.25; k < b - 0.1; k += 0.3) { x.beginPath(); x.moveTo(k, 1.46); x.lineTo(k, 2.15); x.stroke(); g.poly([[k - 0.07, 2.12], [k + 0.07, 2.12], [k, 2.32]], C.gold, 0.02); }
      x.beginPath(); x.moveTo(a + 0.1, 1.95); x.lineTo(b - 0.1, 1.95); x.stroke(); }
    for (const px of [2.0, 4.4]) { g.stone(px - 0.3, 0, 0.6, 3.1, { seed: 150 + px, base: C.stone, row: 0.42, bw: 0.6 }); g.rect(px - 0.38, 3.05, 0.76, 0.2, C.stoneDk, 0.045); g.circle(px, 3.5, 0.22, C.cini, 0.045); g.lit(xx => { xx.beginPath(); xx.arc(px, 3.5, 0.12, 0, 6.3); }, '#bfe6ff'); }
    x.strokeStyle = C.wood; x.lineWidth = 0.2; x.beginPath(); x.moveTo(2.0, 3.2); x.quadraticCurveTo(3.2, 5.0, 4.4, 3.2); x.stroke();
    x.strokeStyle = OUT; x.lineWidth = 0.04; x.beginPath(); x.moveTo(1.9, 3.26); x.quadraticCurveTo(3.2, 5.14, 4.5, 3.26); x.stroke();
    for (let k = 0; k <= 10; k++) { const t = k / 10, px = 2.0 + t * 2.4, py = 3.2 + Math.sin(t * Math.PI) * 0.92; g.ivy(px, py, 0.7, 0.62, 160 + k, k % 2 ? C.pink : '#fff'); }
    g.ivy(2.0, 2.2, 0.75, 1.9, 171, C.pinkL); g.ivy(4.4, 2.0, 0.75, 2.2, 172, '#fff'); g.ivy(0.7, 1.35, 1.3, 0.6, 173, C.pink); g.ivy(5.6, 1.35, 1.4, 0.6, 174, C.pinkL);
    return g;
  }
  function lowWall(len, seed) { const g = P(len, 1.6); g.stone(0, 0, len, 1.35, { seed, base: '#dfd0bc', row: 0.45, bw: 0.8 }); g.rect(-0.02, 1.3, len + 0.04, 0.16, C.stoneDk, 0.045); g.ivy(len * 0.3, 1.2, len * 0.4, 0.6, seed, C.pinkL); g.x.fillStyle = 'rgba(74,52,110,.16)'; g.x.fillRect(0, 0, len, 1.6); return g; }
  function boundary(len, seed) { const g = P(len, 4.6, 64); g.stone(0, 0, len, 3.9, { seed, base: '#dccdb8', row: 0.55, bw: 1.3 }); g.crenels(0, len, 3.9, { base: '#dccdb8', mw: 0.7, gap: 0.5, seed });
    for (let k = 0; k < len / 5; k++) g.ivy(2 + k * 5 + (k % 2), 1.6 + (k % 3) * 0.5, 2.4, 2.6, seed + k, k % 2 ? C.pinkL : null); g.x.fillStyle = 'rgba(74,52,110,.18)'; g.x.fillRect(0, 0, len, 4.6); return g; }

  /* ---------- Tezgâhlar, eşyalar, ağaçlar ---------- */
  function stall(kind) {        // 2.9 × 3.1 m
    const g = P(2.9, 3.1), x = g.x, col = [['#c9412f', '#f7ecd6'], ['#2f6fc0', '#f7ecd6'], ['#d99a2b', '#f7ecd6']][kind];
    for (const px of [0.28, 2.62]) g.rect(px - 0.06, 0, 0.12, 2.5, C.wood, 0.04);
    g.rect(0.2, 0, 2.5, 0.95, C.woodL, 0.05); x.strokeStyle = C.woodD; x.lineWidth = 0.03; for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(0.2 + k * 0.5, 0); x.lineTo(0.2 + k * 0.5, 0.95); x.stroke(); }
    g.rect(0.12, 0.92, 2.66, 0.14, C.wood, 0.045);
    if (kind === 0) { for (let k = 0; k < 4; k++) { const px = 0.55 + k * 0.6; g.poly([[px - 0.2, 1.06], [px + 0.2, 1.06], [px + 0.14, 1.42], [px - 0.14, 1.42]], ['#c96a3a', '#b7532f', '#d7a04a', '#8f5c3b'][k], 0.04); g.circle(px, 1.44, 0.15, [C.red, '#e2a13a', '#7a9a3a', '#a04a7a'][k], 0.035); } }
    else if (kind === 1) { for (let k = 0; k < 5; k++) { const px = 0.5 + k * 0.48; g.rect(px - 0.09, 1.06, 0.18, 0.3, [C.turq, '#c9a0dc', C.gold, C.cini, '#e58f8f'][k], 0.035); g.rect(px - 0.04, 1.36, 0.08, 0.13, '#eadfce', 0.03); g.lit(xx => { xx.beginPath(); xx.arc(px, 1.2, 0.05, 0, 6.3); }, '#ffffff'); } }
    else { for (let k = 0; k < 3; k++) { const px = 0.6 + k * 0.85; x.save(); x.translate(px, 1.06); g.rect(-0.34, 0, 0.68, 0.24, [C.red, C.navy, '#7a3a8a'][k], 0.04); x.fillStyle = C.gold; for (let j = 0; j < 4; j++) x.fillRect(-0.28 + j * 0.16, 0.08, 0.09, 0.08); g.circle(-0.34, 0.12, 0.12, [C.redD, '#16224f', '#5a2a66'][k], 0.035); x.restore(); } }
    const y0 = 2.25, y1 = 2.95; g.poly([[0, y0], [2.9, y0], [2.62, y1], [0.28, y1]], col[1], 0.05);
    x.save(); x.beginPath(); x.moveTo(0, y0); x.lineTo(2.9, y0); x.lineTo(2.62, y1); x.lineTo(0.28, y1); x.closePath(); x.clip(); x.fillStyle = col[0];
    for (let k = 0; k < 7; k += 2) { x.beginPath(); x.moveTo(k * 0.415, y0); x.lineTo((k + 1) * 0.415, y0); x.lineTo(0.28 + (k + 1) * 0.3343, y1); x.lineTo(0.28 + k * 0.3343, y1); x.closePath(); x.fill(); } x.restore();
    g.poly([[0, y0], [2.9, y0], [2.62, y1], [0.28, y1]], null, 0.05);
    for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(0.2075 + k * 0.415, y0, 0.2075, Math.PI, 6.2832); x.closePath(); g.fs(k % 2 ? col[1] : col[0], 0.045); }
    return g;
  }
  function lampPost() { const g = P(1.0, 3.5), x = g.x; g.rect(0.36, 0, 0.28, 0.22, '#3b3344', 0.04); g.rect(0.44, 0.2, 0.12, 2.5, '#4a4156', 0.04); g.rect(0.38, 1.2, 0.24, 0.08, '#3b3344', 0.03);
    g.poly([[0.3, 2.7], [0.7, 2.7], [0.62, 2.78], [0.38, 2.78]], C.goldD, 0.04);
    g.lit(xx => { xx.beginPath(); xx.moveTo(0.34, 2.78); xx.lineTo(0.66, 2.78); xx.lineTo(0.72, 3.16); xx.lineTo(0.28, 3.16); xx.closePath(); }, '#ffe1a0', '#fbf0cf');
    x.beginPath(); x.moveTo(0.34, 2.78); x.lineTo(0.66, 2.78); x.lineTo(0.72, 3.16); x.lineTo(0.28, 3.16); x.closePath(); g.fs(null, 0.04);
    x.strokeStyle = OUT; x.lineWidth = 0.03; x.beginPath(); x.moveTo(0.5, 2.78); x.lineTo(0.5, 3.16); x.stroke();
    g.poly([[0.22, 3.16], [0.78, 3.16], [0.5, 3.42]], C.goldD, 0.04); g.circle(0.5, 3.44, 0.045, C.gold, 0.025); return g; }
  function bench() { const g = P(2.1, 1.05); for (const px of [0.25, 1.85]) { g.rect(px - 0.06, 0, 0.12, 0.95, C.woodD, 0.04); } g.rect(0.1, 0.42, 1.9, 0.13, C.woodL, 0.045); g.rect(0.14, 0.62, 1.82, 0.12, C.wood, 0.04); g.rect(0.14, 0.8, 1.82, 0.12, C.wood, 0.04); g.rect(0.2, 0, 0.1, 0.42, C.woodD, 0.035); g.rect(1.8, 0, 0.1, 0.42, C.woodD, 0.035); return g; }
  function planter(seed) { const g = P(1.7, 1.25); g.stone(0.15, 0, 1.4, 0.5, { seed, base: '#e3d5c2', row: 0.26, bw: 0.5 }); g.rect(0.1, 0.46, 1.5, 0.1, C.stoneDk, 0.04);
    g.ivy(0.85, 0.72, 1.5, 0.5, seed, [C.pink, '#fff', '#f2c14a', '#c9a0dc'][seed % 4]); g.ivy(0.85, 0.95, 1.1, 0.4, seed + 9, [C.pinkL, C.pink, '#fff', '#fff'][seed % 4]); return g; }
  function barrel() { const g = P(0.9, 1.1), x = g.x; x.beginPath(); x.moveTo(0.14, 0.02); x.quadraticCurveTo(0.0, 0.5, 0.14, 0.98); x.lineTo(0.76, 0.98); x.quadraticCurveTo(0.9, 0.5, 0.76, 0.02); x.closePath(); g.fs(C.woodL, 0.05);
    x.strokeStyle = C.woodD; x.lineWidth = 0.03; for (const k of [0.3, 0.45, 0.6]) { x.beginPath(); x.moveTo(k, 0.04); x.lineTo(k, 0.96); x.stroke(); }
    for (const yy of [0.2, 0.74]) g.rect(0.06, yy, 0.78, 0.09, '#5b5466', 0.035); x.beginPath(); x.ellipse(0.45, 0.98, 0.31, 0.07, 0, 0, 6.3); g.fs(C.wood, 0.04); return g; }
  function crates() { const g = P(1.5, 1.4); for (const [px, py, s] of [[0.05, 0, 0.7], [0.8, 0, 0.62], [0.42, 0.68, 0.6]]) { g.rect(px, py, s, s, C.woodL, 0.05); g.x.strokeStyle = C.woodD; g.x.lineWidth = 0.05; g.x.beginPath(); g.x.moveTo(px + 0.06, py + 0.06); g.x.lineTo(px + s - 0.06, py + s - 0.06); g.x.moveTo(px + s - 0.06, py + 0.06); g.x.lineTo(px + 0.06, py + s - 0.06); g.x.stroke(); g.rect(px, py, s, s, null, 0.05); } return g; }
  function bannerPole(E, col) { const g = P(1.7, 4.6); g.rect(0.2, 0, 0.3, 0.2, '#3b3344', 0.04); g.rect(0.29, 0.18, 0.12, 4.1, '#4a4156', 0.04); g.circle(0.35, 4.36, 0.1, C.gold, 0.035); g.rect(0.35, 3.98, 1.2, 0.09, C.goldD, 0.035); g.banner(0.98, 3.98, 1.0, 2.5, col, E.emblem); return g; }
  function brazier() { const g = P(1.0, 1.2), x = g.x; for (const s of [-1, 1]) { x.strokeStyle = '#3b3344'; x.lineWidth = 0.09; x.beginPath(); x.moveTo(0.5 + s * 0.12, 0.7); x.lineTo(0.5 + s * 0.34, 0); x.stroke(); }
    g.poly([[0.12, 1.0], [0.88, 1.0], [0.72, 0.66], [0.28, 0.66]], '#4a4156', 0.05); g.lit(xx => { xx.beginPath(); xx.ellipse(0.5, 1.0, 0.34, 0.08, 0, 0, 6.3); }, '#ff9a3c'); return g; }
  function canopy(g, cx, cy, w, h, cols, seed, n = 26) { const r = rng(seed), x = g.x, blobs = [];
    for (let i = 0; i < n; i++) { const a = r() * 6.2832, d = Math.sqrt(r()); blobs.push([cx + Math.cos(a) * d * w * 0.42, cy + Math.sin(a) * d * h * 0.40, (0.16 + r() * 0.14) * Math.min(w, h)]); }
    x.lineWidth = 0.11; x.strokeStyle = OUT; for (const b of blobs) { x.beginPath(); x.arc(b[0], b[1], b[2], 0, 6.3); x.stroke(); }
    for (const b of blobs) g.circle(b[0], b[1], b[2], cols[0], 0);
    for (const b of blobs) g.circle(b[0] + b[2] * 0.22, b[1] - b[2] * 0.3, b[2] * 0.72, cols[1], 0);        // alt sağ: gölge tonu
    for (const b of blobs) g.circle(b[0], b[1], b[2] * 0.72, cols[0], 0);
    for (const b of blobs) if (b[1] > cy - h * 0.05) g.circle(b[0] - b[2] * 0.25, b[1] + b[2] * 0.28, b[2] * 0.45, cols[2], 0);   // üst sol: ışık
    for (let i = 0; i < n * 2; i++) { const b = blobs[i % n]; g.circle(b[0] + (r() - 0.5) * b[2] * 1.4, b[1] + (r() - 0.5) * b[2] * 1.4, 0.05 + r() * 0.05, r() > 0.5 ? cols[2] : cols[1], 0); } }
  function cinar() { const g = P(7.0, 7.6), x = g.x;     // çınar: alacalı gövde, geniş taç
    x.beginPath(); x.moveTo(3.05, 0); x.quadraticCurveTo(3.25, 1.6, 3.0, 3.2); x.lineTo(4.0, 3.2); x.quadraticCurveTo(3.75, 1.6, 3.95, 0); x.closePath(); g.fs('#b9ab93', 0.06);
    const r = rng(7); for (let i = 0; i < 16; i++) { x.beginPath(); x.ellipse(3.2 + r() * 0.6, 0.2 + r() * 2.8, 0.1 + r() * 0.1, 0.16 + r() * 0.16, r(), 0, 6.3); x.fillStyle = r() > 0.5 ? '#8f8f72' : '#d8ccb4'; x.fill(); }
    x.fillStyle = 'rgba(74,52,110,.25)'; x.fillRect(3.6, 0, 0.4, 3.2);
    x.strokeStyle = '#b9ab93'; x.lineWidth = 0.3; for (const [a, b] of [[2.2, 4.2], [4.9, 4.4]]) { x.beginPath(); x.moveTo(3.5, 3.0); x.lineTo(a, b); x.stroke(); }
    canopy(g, 3.5, 5.15, 6.6, 4.6, [C.leaf, C.leafD, C.leafL], 17, 34); return g; }
  function erguvan(seed) { const g = P(4.4, 4.9), x = g.x;
    x.strokeStyle = OUT; x.lineWidth = 0.34; x.beginPath(); x.moveTo(2.2, 0); x.quadraticCurveTo(2.05, 1.2, 2.25, 2.3); x.stroke();
    x.strokeStyle = '#5a3a3c'; x.lineWidth = 0.24; x.beginPath(); x.moveTo(2.2, 0); x.quadraticCurveTo(2.05, 1.2, 2.25, 2.3); x.stroke();
    x.lineWidth = 0.13; for (const [a, b] of [[1.3, 2.7], [3.1, 2.9], [2.3, 3.2]]) { x.beginPath(); x.moveTo(2.2, 1.7); x.lineTo(a, b); x.stroke(); }
    canopy(g, 2.2, 3.25, 4.1, 3.0, [C.pink, C.pinkD, C.pinkL], seed, 24); return g; }
  function selvi() { const g = P(1.7, 6.2), x = g.x; g.rect(0.75, 0, 0.2, 0.7, '#5a3a3c', 0.04);
    x.beginPath(); x.moveTo(0.85, 6.1); x.bezierCurveTo(1.7, 4.0, 1.6, 1.4, 0.85, 0.45); x.bezierCurveTo(0.1, 1.4, 0.0, 4.0, 0.85, 6.1); g.fs('#2f6b4c', 0.06);
    x.save(); x.clip(); x.fillStyle = 'rgba(20,40,60,.3)'; x.beginPath(); x.ellipse(1.35, 3, 0.55, 3, 0, 0, 6.3); x.fill(); x.fillStyle = 'rgba(160,220,140,.3)'; x.beginPath(); x.ellipse(0.5, 3.6, 0.22, 1.8, 0, 0, 6.3); x.fill(); x.restore(); return g; }
  function gardenTree(seed) { const g = P(4.0, 4.6), x = g.x; x.strokeStyle = '#6b4a3a'; x.lineWidth = 0.26; x.beginPath(); x.moveTo(2, 0); x.lineTo(2, 2.3); x.stroke(); canopy(g, 2, 3.0, 3.7, 2.9, ['#5aa850', '#39804a', '#9ad468'], seed, 22); return g; }

  /* ---------- Çeşme ---------- */
  function basinStrip() { const g = P(4.0, 0.72, 128); g.stone(0, 0, 4.0, 0.56, { base: '#eadcc6', seed: 200, row: 0.28, bw: 0.5, lw: 0 }); g.cini(0, 0.2, 4.0, 0.2); g.rect(0, 0.56, 4.0, 0.16, '#f4ead8', 0); g.x.fillStyle = 'rgba(74,52,110,.18)'; g.x.fillRect(0, 0, 4.0, 0.08); return g; }
  function waterDisc() { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 10, 128, 128, 126);
    g.addColorStop(0, '#bff0ff'); g.addColorStop(0.5, '#59c2ee'); g.addColorStop(1, '#2b86cf'); x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, 6.3); x.fill();
    const r = rng(5); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2.5; x.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const a = r() * 6.3, d = 20 + r() * 96, px = 128 + Math.cos(a) * d, py = 128 + Math.sin(a) * d; x.beginPath(); x.arc(128, 128, d, a, a + 0.12 + r() * 0.22); x.stroke(); }
    return c; }
  function pedestal() { const g = P(1.6, 1.5, 128); g.stone(0.25, 0, 1.1, 1.2, { base: '#e6d8c4', seed: 210, row: 0.3, bw: 0.55 }); g.rect(0.1, 1.15, 1.4, 0.22, '#f1e6d2', 0.045); g.cini(0.3, 0.55, 1.0, 0.24); return g; }

  /* Ejder: chibi hattının gerçek parçalarından kurulur (rig_data.js bağlantı noktaları). */
  function composeDragon(img, A, pose = {}) {
    const D = A.dragon, c = document.createElement('canvas'); c.width = 520; c.height = 420; const x = c.getContext('2d'), ox = 250, oy = 380;
    const part = (name, at, rot = 0) => { const r = D.rects[name], d = D[name], s = d.scale; x.save(); x.translate(ox + at[0], oy + at[1]); x.rotate(rot); x.scale(s, s); x.drawImage(img, r[0], r[1], r[2], r[3], -d.pivot[0], -d.pivot[1], r[2], r[3]); x.restore(); };
    const b = D.body, bs = b.scale, an = k => [(b[k][0] - b.pivot[0]) * bs, (b[k][1] - b.pivot[1]) * bs];
    part('tail', an('tail'), pose.tail || 0); part('wing', an('wing'), (pose.wing === undefined ? D.wing.rest : pose.wing) * Math.PI / 180);
    part('body', [0, 0]); part('head', an('neck'), pose.head || 0);
    return { c, ox, oy };
  }
  function statue(img, A) {     // mavi taş ejder heykeli: aynı parçalar, tek renge çekilmiş
    const { c } = composeDragon(img, A, { wing: 52, head: -0.12, tail: 0.1 }), x = c.getContext('2d');
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 1;
    x.globalCompositeOperation = 'color'; const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height; const t = tmp.getContext('2d');
    t.drawImage(c, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#4f8fe0'; t.fillRect(0, 0, c.width, c.height);
    x.drawImage(tmp, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(190,225,255,.20)'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over'; return c;
  }
  function emblem(img, A) {     // altın ejder başı silüeti (sancak ve mühür)
    const r = A.dragon.rects.head, c = document.createElement('canvas'); c.width = r[2]; c.height = r[3]; const x = c.getContext('2d');
    x.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); x.globalCompositeOperation = 'source-in';
    const g = x.createLinearGradient(0, 0, 0, r[3]); g.addColorStop(0, '#ffe59a'); g.addColorStop(1, '#d99a2e'); x.fillStyle = g; x.fillRect(0, 0, r[2], r[3]); return c;
  }

  /* ---------- Efekt atlası (128 px hücreler) ---------- */
  function fxAtlas() {
    const S = 128, c = document.createElement('canvas'); c.width = S * 4; c.height = S * 4; const x = c.getContext('2d'), map = {}; let i = 0;
    const cell = (name, fn) => { const cx = (i % 4) * S, cy = Math.floor(i / 4) * S; x.save(); x.translate(cx, cy); x.beginPath(); x.rect(1, 1, S - 2, S - 2); x.clip(); fn(); x.restore();
      map[name] = [(cx + 1) / c.width, (cy + 1) / c.height, (cx + S - 1) / c.width, (cy + S - 1) / c.height]; i++; };
    const radial = (stops) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 62); stops.forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, S, S); };
    cell('glow', () => radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]));
    cell('dot', () => radial([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]));
    cell('shadow', () => radial([[0, 'rgba(30,18,50,.55)'], [0.6, 'rgba(30,18,50,.35)'], [1, 'rgba(30,18,50,0)']]));
    cell('petal', () => { x.translate(64, 64); x.rotate(0.6); x.beginPath(); x.ellipse(0, 0, 44, 24, 0, 0, 6.3); x.fillStyle = '#f7a8cc'; x.fill(); x.beginPath(); x.ellipse(-8, -4, 26, 11, 0, 0, 6.3); x.fillStyle = '#ffd9ea'; x.fill(); });
    cell('ring', () => { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 54, 0, 6.3); x.stroke(); });
    cell('smoke', () => radial([[0, 'rgba(250,244,236,.75)'], [0.6, 'rgba(240,232,224,.35)'], [1, 'rgba(240,232,224,0)']]));
    for (let k = 0; k < 3; k++) cell('flame' + k, () => { const g = x.createLinearGradient(0, 120, 0, 8); g.addColorStop(0, '#ffe9a0'); g.addColorStop(0.45, '#ff9a3c'); g.addColorStop(1, 'rgba(230,60,30,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(64, 122); x.bezierCurveTo(8 + k * 8, 100, 30 - k * 6, 60, 54 + k * 9, 8); x.bezierCurveTo(70 + k * 4, 50, 118 - k * 9, 96, 64, 122); x.fill();
      x.fillStyle = 'rgba(255,250,220,.9)'; x.beginPath(); x.ellipse(64, 104, 16, 14, 0, 0, 6.3); x.fill(); });
    cell('drop', () => { x.fillStyle = 'rgba(210,244,255,.95)'; x.beginPath(); x.ellipse(64, 64, 30, 46, 0, 0, 6.3); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(54, 50, 9, 16, 0, 0, 6.3); x.fill(); });
    cell('white', () => { x.fillStyle = '#fff'; x.fillRect(0, 0, S, S); });
    cell('chev', () => { x.strokeStyle = '#fff'; x.lineWidth = 16; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(26, 46); x.lineTo(64, 84); x.lineTo(102, 46); x.stroke(); x.globalAlpha = 0.5; x.beginPath(); x.moveTo(26, 78); x.lineTo(64, 116); x.lineTo(102, 78); x.stroke(); });
    cell('note', () => { x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 9; x.beginPath(); x.ellipse(44, 92, 20, 15, -0.3, 0, 6.3); x.fill(); x.beginPath(); x.moveTo(61, 90); x.lineTo(61, 26); x.lineTo(98, 40); x.stroke(); });
    return { c, map };
  }
  function skyTextures() {
    const mk = (stops, stars) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); stops.forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
      if (stars) { const r = rng(99); for (let i = 0; i < 150; i++) { const py = r() * 170, a = (1 - py / 190) * (0.35 + r() * 0.65); x.fillStyle = `rgba(255,246,225,${a})`; const s = r() > 0.92 ? 2 : 1; x.fillRect(r() * 512, py, s, s); } } return c; };
    return { day: mk([[0, '#3f8fe6'], [0.55, '#86c4f4'], [0.9, '#d7eefa'], [1, '#f1f7f4']]), dusk: mk([[0, '#10163a'], [0.45, '#2c2a66'], [0.75, '#8b4a80'], [0.92, '#e0795e'], [1, '#f6b267']], true) };
  }
  function clouds() { const c = document.createElement('canvas'); c.width = 768; c.height = 256; const x = c.getContext('2d'), r = rng(3);
    for (let k = 0; k < 3; k++) { const ox = 128 + k * 256, puffs = []; for (let i = 0; i < 9; i++) puffs.push([ox + (r() - 0.5) * 130, 150 + (r() - 0.5) * 36, 24 + r() * 26]);
      x.fillStyle = 'rgba(170,196,232,.9)'; for (const p of puffs) { x.beginPath(); x.arc(p[0], p[1] + 12, p[2], 0, 6.3); x.fill(); }
      x.fillStyle = '#ffffff'; for (const p of puffs) { x.beginPath(); x.arc(p[0], p[1], p[2], 0, 6.3); x.fill(); }
      x.clearRect(ox - 128, 190, 256, 66); }
    return c; }
  function backdrop() {        // uzak tepeler ve kale: 2048 × 512, üstü şeffaf
    const W = 2048, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const ridge = (base, amp, col, sd, f) => { x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 8) { const t = px / W * f; x.lineTo(px, base - amp * (Math.sin(t * 3.1 + sd) * 0.5 + Math.sin(t * 7.3 + sd * 2) * 0.3 + Math.sin(t * 15.7 + sd * 3) * 0.12 + 0.5)); } x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill(); };
    ridge(300, 150, '#b3cdea', 1.3, 6); ridge(360, 110, '#9cc0de', 4.7, 9);
    // kale tepesi
    x.beginPath(); x.moveTo(700, H); x.quadraticCurveTo(900, 250, 1040, 236); x.quadraticCurveTo(1200, 250, 1400, H); x.closePath(); x.fillStyle = '#8fbf9a'; x.fill();
    const wall = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py - h, w, h); for (let k = 0; k < w; k += 12) x.fillRect(px + k, py - h - 6, 7, 6); };
    const tower = (px, py, w, h, cap) => { x.fillStyle = '#e6dccc'; x.fillRect(px - w / 2, py - h, w, h); x.fillStyle = 'rgba(90,100,150,.25)'; x.fillRect(px, py - h, w / 2, h); x.fillStyle = cap; x.beginPath(); x.moveTo(px - w / 2 - 4, py - h); x.lineTo(px + w / 2 + 4, py - h); x.lineTo(px, py - h - w * 1.25); x.closePath(); x.fill(); };
    wall(900, 262, 290, 46, '#ddd2c2'); tower(915, 262, 30, 86, '#4f86c6'); tower(1180, 262, 30, 78, '#4f86c6'); tower(1000, 258, 26, 118, '#c9603f');
    x.fillStyle = '#e9dfcf'; x.fillRect(1040, 150, 96, 108); x.fillStyle = '#7f9cc8'; x.beginPath(); x.ellipse(1088, 150, 50, 44, 0, Math.PI, 0); x.fill(); x.fillStyle = '#e2b24a'; x.fillRect(1086, 96, 4, 14);
    x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(1296, 300, 12, 190); x.fillRect(1312, 320, 6, 170);
    ridge(430, 70, '#7fb98a', 2.2, 13); ridge(470, 44, '#69a878', 7.9, 21);
    const r = rng(8); for (let i = 0; i < 90; i++) { const px = r() * W, py = 430 + r() * 70; x.fillStyle = r() > 0.8 ? '#e79dc0' : '#4f9367'; x.beginPath(); x.arc(px, py, 9 + r() * 12, 0, 6.3); x.fill(); }
    const haze = x.createLinearGradient(0, 200, 0, H); haze.addColorStop(0, 'rgba(226,240,250,0)'); haze.addColorStop(1, 'rgba(226,240,250,.55)'); x.globalCompositeOperation = 'source-atop'; x.fillStyle = haze; x.fillRect(0, 0, W, H);
    return c;
  }

  /* Zemin boyaması: r = çim, g = leke, b = gölge. Tuvalin üst satırı dünyanın güney kenarıdır. */
  function groundMap(L) {
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), [mx, my, mw, mh] = L.mapRect;
    const px = X => (X - mx) / mw * S, py = Y => (Y - my) / mh * S, k = S / mw;
    x.fillStyle = '#f00'; x.fillRect(0, 0, S, S);                                   // her yer çim
    x.globalCompositeOperation = 'source-over'; x.shadowColor = '#000'; x.shadowBlur = 14; x.fillStyle = '#000';
    for (const p of L.paved) x.fillRect(px(p[0]), py(p[1]), (p[2] - p[0]) * k, (p[3] - p[1]) * S / mh);
    x.shadowBlur = 0;
    const blob = (X, Y, rx, ry, col, a) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, col.replace('A', a)); g.addColorStop(0.55, col.replace('A', a * 0.7)); g.addColorStop(1, col.replace('A', 0));
      x.save(); x.translate(px(X), py(Y)); x.scale(rx * k, ry * S / mh); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 6.3); x.fill(); x.restore(); };
    x.globalCompositeOperation = 'lighter';
    const r = rng(77); for (let i = 0; i < 46; i++) blob(mx + r() * mw, my + r() * mh, 0.8 + r() * 2.2, 0.6 + r() * 1.6, 'rgba(0,255,0,A)', 0.25 + r() * 0.35);
    for (const s of L.shadows) blob(s[0], s[1], s[2], s[3], 'rgba(0,0,255,A)', s[4] || 0.8);
    return c;
  }

  EO2.art = { P, glowOf, han, sideWall, house, bedesten, northGate, arenaGate, gardenGate, lowWall, boundary, stall, lampPost, bench, planter, barrel, crates, bannerPole, brazier,
    cinar, erguvan, selvi, gardenTree, basinStrip, waterDisc, pedestal, composeDragon, statue, emblem, fxAtlas, skyTextures, clouds, backdrop, groundMap, C };
})();
