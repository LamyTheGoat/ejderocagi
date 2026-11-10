/* EO2 dikey dilim · Pazar (Bedesten içi) ve Topçu Arenası avlusunun kodla çizilen yer tutucu sanatı. Nihai sanat değildir. */
(function () {
  'use strict';
  const art = window.EO2.art, P = art.P, C = art.C, OUT = '#3a2530';
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const GOODS = [['#c9773a', '#e39a55'], [C.cini, '#7fc0f0'], [C.goldD, C.gold], [C.turq, '#8fe0d8'], [C.red, '#e0685f'], ['#7a3a8a', '#b07ac0']];

  /* ---------- Pazar ---------- */
  // Dükkân nişi: sivri kemer, içinde raflar ve mallar, önünde saçak. kind: 0 bakır, 1 çini, 2 kumaş, 3 baharat
  function shop(g, cx, kind, seed) {
    const x = g.x, r = rng(seed);
    g.archPath(cx, 0, 2.7, 4.1); g.fs(C.stoneD, 0.05); g.archPath(cx, 0, 2.3, 3.85); g.fs('#2b2030', 0.05);
    x.save(); g.archPath(cx, 0, 2.3, 3.85); x.clip();
    g.lit(xx => { xx.beginPath(); xx.rect(cx - 1.2, 0, 2.4, 2.0); }, '#e39448', '#6a4640');
    const ig = x.createLinearGradient(0, 2.2, 0, 0.6); ig.addColorStop(0, '#2b2030'); ig.addColorStop(1, 'rgba(43,32,48,0)'); x.fillStyle = ig; x.fillRect(cx - 1.2, 0, 2.4, 2.3);
    for (const sy of [1.55, 2.25, 2.95]) { x.fillStyle = '#4a3340'; x.fillRect(cx - 1.1, sy, 2.2, 0.07);
      for (let k = 0; k < 5; k++) { const px = cx - 0.85 + k * 0.42, col = GOODS[(k + kind + Math.floor(sy)) % 6];
        if (kind === 0) { x.beginPath(); x.ellipse(px, sy + 0.24, 0.14, 0.17, 0, 0, 6.3); g.fs(['#c9773a', C.goldD][k % 2], 0.03); g.rect(px - 0.05, sy + 0.38, 0.1, 0.07, '#e39a55', 0.02); }
        else if (kind === 1) { g.poly([[px - 0.15, sy + 0.07], [px + 0.15, sy + 0.07], [px + 0.1, sy + 0.4], [px - 0.1, sy + 0.4]], '#f6efe0', 0.03); x.fillStyle = col[0]; x.fillRect(px - 0.11, sy + 0.2, 0.22, 0.07); }
        else if (kind === 2) { g.rect(px - 0.17, sy + 0.07, 0.34, 0.14 + (k % 3) * 0.06, col[0], 0.03); g.rect(px - 0.17, sy + 0.21 + (k % 3) * 0.06, 0.34, 0.1, col[1], 0.03); }
        else { g.poly([[px - 0.17, sy + 0.07], [px + 0.17, sy + 0.07], [px + 0.13, sy + 0.26], [px - 0.13, sy + 0.26]], '#d9c7a4', 0.03); x.beginPath(); x.ellipse(px, sy + 0.27, 0.13, 0.09, 0, Math.PI, 0, true); x.fillStyle = col[0]; x.fill(); } } }
    g.lantern(cx - 0.55, 3.0); g.lantern(cx + 0.55, 3.15);
    g.rect(cx - 1.15, 0, 2.3, 0.95, C.woodL, 0.045); x.strokeStyle = C.woodD; x.lineWidth = 0.03; for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(cx - 1.15 + k * 0.46, 0); x.lineTo(cx - 1.15 + k * 0.46, 0.95); x.stroke(); }
    g.rect(cx - 1.2, 0.92, 2.4, 0.12, C.wood, 0.04);
    for (let k = 0; k < 4; k++) { const px = cx - 0.75 + k * 0.5 + (r() - 0.5) * 0.08, col = GOODS[(k * 2 + kind) % 6]; if (kind === 3) { g.poly([[px - 0.2, 1.04], [px + 0.2, 1.04], [px + 0.15, 1.3], [px - 0.15, 1.3]], '#d9c7a4', 0.035); x.beginPath(); x.ellipse(px, 1.31, 0.15, 0.13, 0, Math.PI, 0, true); x.fillStyle = col[0]; x.fill(); }
      else if (kind === 2) { x.save(); x.translate(px, 1.04); g.rect(-0.2, 0, 0.4, 0.2, col[0], 0.035); g.circle(-0.2, 0.1, 0.1, col[1], 0.03); x.restore(); } else { x.beginPath(); x.ellipse(px, 1.26, 0.15, 0.2, 0, 0, 6.3); g.fs(col[0], 0.035); g.rect(px - 0.06, 1.42, 0.12, 0.08, col[1], 0.025); } }
    x.restore();
    // saçak: çizgili kumaş, dalgalı etek
    const cols = [[C.red, '#f1e2c4'], [C.navy, '#f1e2c4'], [C.goldD, '#f1e2c4'], [C.turq, '#f1e2c4']][kind];
    for (let k = 0; k < 6; k++) { g.rect(cx - 1.38 + k * 0.46, 3.55, 0.46, 0.42, cols[k % 2], 0.035); x.beginPath(); x.arc(cx - 1.15 + k * 0.46, 3.55, 0.23, Math.PI, 6.2832); x.closePath(); g.fs(cols[k % 2], 0.035); }
    g.rect(cx - 1.42, 3.95, 2.84, 0.1, C.woodD, 0.04);
  }
  art.bazaarSide = function (len, seed) {        // yan duvar: sıra sıra dükkân nişi
    const g = P(len, 7.2, 80), x = g.x, n = Math.floor(len / 3.4), step = len / n;
    g.stone(0, 0, len, 7.2, { seed, base: '#ecdcc2', row: 0.52, bw: 1.15, lw: 0 });
    for (let i = 0; i < n; i++) shop(g, step * (i + 0.5), (i + seed) % 4, seed + i * 5);
    g.cini(0, 4.5, len, 0.5);
    for (let i = 0; i <= n; i++) { const px = Math.min(len - 0.3, Math.max(0.3, step * i)); g.stone(px - 0.3, 0, 0.6, 4.5, { base: C.stoneD, seed: seed + 50 + i, row: 0.5, bw: 0.6 }); x.save(); x.translate(px, 5.75); g.circle(0, 0, 0.42, C.navy, 0.04); x.fillStyle = C.gold; x.fillRect(-0.22, -0.22, 0.44, 0.44); x.rotate(Math.PI / 4); x.fillRect(-0.22, -0.22, 0.44, 0.44); x.restore(); g.circle(px, 5.75, 0.1, C.navy, 0); }
    for (let i = 0; i < n; i++) { const cx = step * (i + 0.5); g.archPath(cx, 5.3, 0.9, 1.3); g.fs(C.stoneD, 0.045); g.archPath(cx, 5.38, 0.7, 1.12); g.fs('#3a4f8a', 0.035); }
    g.shade(0, 6.75, len, 0.45, 0.28); x.fillStyle = 'rgba(74,52,110,.16)'; x.fillRect(0, 0, len, 7.2);
    return g;
  };
  art.bazaarBack = function () {                 // 12.8 × 7.2 m: ilan panolu büyük kemer
    const W = 12.8, g = P(W, 7.2, 80), x = g.x, r = rng(71);
    g.stone(0, 0, W, 7.2, { seed: 701, base: '#ecdcc2', row: 0.52, bw: 1.15, lw: 0 });
    shop(g, 1.9, 0, 11); shop(g, W - 1.9, 2, 12);
    g.archPath(W / 2, 0, 5.2, 5.6); g.fs(C.stoneD, 0.055); g.archPath(W / 2, 0, 4.6, 5.25); g.fs('#efe2c8', 0.05);
    g.cini(W / 2 - 2.3, 4.35, 4.6, 0.42);
    // ilan panosu: ahşap pano, iğnelenmiş kâğıtlar
    g.rect(W / 2 - 1.75, 1.35, 3.5, 2.6, C.wood, 0.055); g.rect(W / 2 - 1.6, 1.5, 3.2, 2.3, '#b98a5a', 0.04);
    for (let i = 0; i < 11; i++) { const px = W / 2 - 1.4 + (i % 4) * 0.74 + r() * 0.14, py = 1.62 + Math.floor(i / 4) * 0.72 + r() * 0.1, w = 0.5 + r() * 0.14, h = 0.46 + r() * 0.16; x.save(); x.translate(px + w / 2, py + h / 2); x.rotate((r() - 0.5) * 0.14); g.rect(-w / 2, -h / 2, w, h, ['#f7efdc', '#f2e3c2', '#fbf6ea'][i % 3], 0.03);
      x.strokeStyle = 'rgba(58,37,48,.45)'; x.lineWidth = 0.025; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(-w / 2 + 0.07, h / 2 - 0.12 - k * 0.11); x.lineTo(w / 2 - 0.07 - (k === 2 ? 0.14 : 0), h / 2 - 0.12 - k * 0.11); x.stroke(); } g.circle(0, h / 2 - 0.04, 0.04, [C.red, C.cini, C.gold][i % 3], 0.02); x.restore(); }
    // terazi arması
    x.save(); x.translate(W / 2, 6.25); g.circle(0, 0, 0.6, C.navy, 0.05); x.strokeStyle = C.gold; x.lineWidth = 0.06; x.beginPath(); x.moveTo(0, -0.35); x.lineTo(0, 0.32); x.moveTo(-0.36, 0.2); x.lineTo(0.36, 0.2); x.stroke(); for (const s of [-1, 1]) { x.beginPath(); x.arc(s * 0.36, -0.02, 0.16, 0, Math.PI); x.stroke(); x.beginPath(); x.moveTo(s * 0.36, 0.2); x.lineTo(s * 0.2, -0.02); x.moveTo(s * 0.36, 0.2); x.lineTo(s * 0.52, -0.02); x.stroke(); } x.restore();
    g.lantern(W / 2 - 2.0, 2.4); g.lantern(W / 2 + 2.0, 2.4);
    g.shade(0, 6.75, W, 0.45, 0.28);
    return g;
  };
  art.vaultTile = function () { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#e9dcc4'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#b8a082'; x.lineWidth = 10; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(0, 0); x.lineTo(256, 256); x.moveTo(256, 0); x.lineTo(0, 256); x.stroke();
    x.save(); x.translate(128, 128); x.fillStyle = '#213270'; x.beginPath(); x.arc(0, 0, 44, 0, 6.3); x.fill(); x.fillStyle = '#39b6ad'; x.fillRect(-24, -24, 48, 48); x.rotate(Math.PI / 4); x.fillRect(-24, -24, 48, 48); x.restore(); x.fillStyle = '#e8b64c'; x.beginPath(); x.arc(128, 128, 10, 0, 6.3); x.fill();
    x.fillStyle = 'rgba(60,40,70,.22)'; x.fillRect(0, 0, 256, 256); return c; };
  art.mosaicLamp = function (col) {              // asılı mozaik cam fener
    const g = P(1.0, 2.9), x = g.x; x.strokeStyle = '#3b3344'; x.lineWidth = 0.04; x.setLineDash([0.08, 0.05]); x.beginPath(); x.moveTo(0.5, 2.9); x.lineTo(0.5, 1.12); x.stroke(); x.setLineDash([]);
    g.poly([[0.36, 1.12], [0.64, 1.12], [0.58, 1.0], [0.42, 1.0]], C.goldD, 0.035);
    g.lit(xx => { xx.beginPath(); xx.ellipse(0.5, 0.62, 0.36, 0.4, 0, 0, 6.3); }, col, col); x.beginPath(); x.ellipse(0.5, 0.62, 0.36, 0.4, 0, 0, 6.3); g.fs(null, 0.045);
    x.save(); x.beginPath(); x.ellipse(0.5, 0.62, 0.36, 0.4, 0, 0, 6.3); x.clip(); x.strokeStyle = 'rgba(40,24,40,.55)'; x.lineWidth = 0.022; for (let k = -4; k <= 4; k++) { x.beginPath(); x.moveTo(0.5 + k * 0.12 - 0.5, 0.2); x.lineTo(0.5 + k * 0.12 + 0.5, 1.05); x.moveTo(0.5 + k * 0.12 + 0.5, 0.2); x.lineTo(0.5 + k * 0.12 - 0.5, 1.05); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.ellipse(0.38, 0.78, 0.07, 0.13, 0.4, 0, 6.3); x.fill(); x.restore();
    g.poly([[0.4, 0.23], [0.6, 0.23], [0.5, 0.06]], C.goldD, 0.035); return g; };
  art.goods = function (kind) {                  // tezgâh önü yığınlar: 0 baharat çuvalları, 1 çömlek, 2 kilim ruloları, 3 bakır
    const g = P(1.9, 1.7), x = g.x;
    if (kind === 0) for (const [px, py, col] of [[0.5, 0, '#c9302a'], [1.3, 0, '#e2a13a'], [0.9, 0.42, '#7a9a3a']]) { g.poly([[px - 0.38, py], [px + 0.38, py], [px + 0.3, py + 0.52], [px - 0.3, py + 0.52]], '#d9c7a4', 0.045); x.beginPath(); x.ellipse(px, py + 0.53, 0.29, 0.2, 0, Math.PI, 0, true); x.fillStyle = col; x.fill(); x.lineWidth = 0.035; x.strokeStyle = OUT; x.stroke(); }
    else if (kind === 1) for (const [px, py, s, col] of [[0.45, 0, 1, C.cini], [1.25, 0, 1.15, C.turq], [0.85, 0.72, 0.8, C.gold]]) { x.beginPath(); x.ellipse(px, py + 0.34 * s, 0.3 * s, 0.34 * s, 0, 0, 6.3); g.fs('#f6efe0', 0.045); x.fillStyle = col; x.fillRect(px - 0.27 * s, py + 0.26 * s, 0.54 * s, 0.1 * s); g.rect(px - 0.12 * s, py + 0.64 * s, 0.24 * s, 0.12 * s, '#f6efe0', 0.035); }
    else if (kind === 2) for (const [px, h, col, c2] of [[0.4, 1.5, C.red, C.gold], [0.85, 1.25, C.navy, '#f1e2c4'], [1.3, 1.6, '#7a3a8a', C.turq], [1.65, 1.1, C.turq, C.red]]) { g.rect(px - 0.17, 0, 0.34, h, col, 0.045); for (let k = 0; k < 4; k++) { x.fillStyle = c2; x.fillRect(px - 0.17, 0.15 + k * h / 4.4, 0.34, 0.07); } x.beginPath(); x.ellipse(px, h, 0.17, 0.07, 0, 0, 6.3); g.fs(c2, 0.035); }
    else { g.rect(0.2, 0, 1.5, 0.12, C.woodD, 0.04); g.rect(0.9, 0.1, 0.1, 1.3, C.woodD, 0.04); for (const [px, py] of [[0.5, 0.2], [1.4, 0.2], [0.55, 0.85], [1.35, 0.85], [0.95, 1.3]]) { x.beginPath(); x.ellipse(px, py + 0.2, 0.24, 0.2, 0, 0, 6.3); g.fs(py > 1 ? C.goldD : '#c9773a', 0.04); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(px - 0.08, py + 0.27, 0.05, 0.08, 0.4, 0, 6.3); x.fill(); } }
    return g; };

  /* ---------- Topçu Arenası ---------- */
  const tiers = (g, x0, x1, y0, n, th, seed) => { for (let i = 0; i < n; i++) { g.stone(x0, y0 + i * th, x1 - x0, th, { seed: seed + i, base: i % 2 ? '#dccbb4' : '#e6d6c0', row: th / 2, bw: 1.3, lw: 0 }); g.rect(x0, y0 + (i + 1) * th - 0.12, x1 - x0, 0.12, '#f1e6d2', 0); g.x.fillStyle = 'rgba(74,52,110,.18)'; g.x.fillRect(x0, y0 + i * th, x1 - x0, 0.14); } };
  function sealDoor(g, cx, kind) {               // mühürlü zindan kapısı: 0 Şahmeran, 1 Komutan, 2 Abra
    const x = g.x, col = [['#2f8a5a', '#8fe0a0'], ['#7a7f8a', '#d9dde6'], ['#2f6fc0', '#9fd4ff']][kind];
    g.archPath(cx, 0, 2.5, 3.5); g.fs(C.stoneDk, 0.055); g.archPath(cx, 0, 2.05, 3.2); g.fs('#3d3340', 0.05);
    x.save(); g.archPath(cx, 0, 2.05, 3.2); x.clip(); x.strokeStyle = '#2a2230'; x.lineWidth = 0.06; for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(cx + k * 0.3, 0); x.lineTo(cx + k * 0.3, 3.2); x.stroke(); } for (const yy of [0.7, 1.5, 2.3]) { x.beginPath(); x.moveTo(cx - 1.1, yy); x.lineTo(cx + 1.1, yy); x.stroke(); } x.restore();
    x.save(); x.translate(cx, 1.75); g.circle(0, 0, 0.56, '#241c2a', 0.05); g.lit(xx => { xx.beginPath(); xx.arc(cx, 1.75, 0.44, 0, 6.3); }, col[0], col[0]); x.strokeStyle = col[1]; x.lineWidth = 0.08; x.lineCap = 'round';
    if (kind === 0) { x.beginPath(); x.moveTo(-0.2, -0.28); x.bezierCurveTo(0.35, -0.2, -0.35, 0.05, 0.1, 0.12); x.bezierCurveTo(0.3, 0.16, 0.26, 0.3, 0.12, 0.3); x.stroke(); }
    else if (kind === 1) { x.beginPath(); x.arc(0, -0.02, 0.24, Math.PI, 0); x.lineTo(0.24, -0.22); x.moveTo(-0.24, -0.02); x.lineTo(-0.24, -0.22); x.moveTo(0, 0.22); x.lineTo(0, 0.32); x.stroke(); }
    else { for (const yy of [-0.14, 0.02, 0.18]) { x.beginPath(); x.moveTo(-0.28, yy); x.quadraticCurveTo(-0.14, yy + 0.14, 0, yy); x.quadraticCurveTo(0.14, yy - 0.14, 0.28, yy); x.stroke(); } }
    x.restore(); g.rect(cx - 1.35, 3.5, 2.7, 0.16, C.stoneDk, 0.045);
  }
  art.arenaBack = function (E) {                 // 25 × 9.4 m: tribün, düello kapısı, zindan kapıları, hakem locası
    const W = 25, g = P(W, 9.4, 80), x = g.x, cx = W / 2;
    g.stone(0, 0, W, 4.3, { seed: 801, base: '#ddcdb6', row: 0.6, bw: 1.25, lw: 0 }); g.rect(0, 4.2, W, 0.2, C.stoneDk, 0.045);
    tiers(g, 0, W, 4.4, 4, 0.72, 810); g.crenels(0.1, W - 0.1, 7.28, { base: '#e6d6c0', mw: 0.7, gap: 0.5, seed: 820 });
    for (const dx of [-9.4, -6.3]) sealDoor(g, cx + dx, dx < -8 ? 0 : 1); sealDoor(g, cx + 6.3, 2);
    // tribün merdiveni
    for (let k = 0; k < 7; k++) g.rect(cx + 8.6 + k * 0.1, k * 0.6, 2.0 - k * 0.1, 0.6, k % 2 ? '#e6d6c0' : '#d9c8b0', 0.035); g.rect(cx + 8.45, 0, 0.16, 4.3, C.stoneDk, 0.04);
    // düello kapısı: iki kule, sivri kemer, yarı kalkık ızgara
    for (const s of [-1, 1]) { g.stone(cx + s * 3.0 - 0.9, 0, 1.8, 8.4, { seed: 830 + s, base: '#e0d0bc', row: 0.6, bw: 0.9 }); g.crenels(cx + s * 3.0 - 0.9, cx + s * 3.0 + 0.9, 8.4, { base: '#e0d0bc', mw: 0.48, gap: 0.2, seed: 833 }); g.banner(cx + s * 3.0, 7.6, 1.05, 3.4, C.red, E.emblem); }
    g.stone(cx - 2.1, 0, 4.2, 6.9, { seed: 840, base: '#e6d7c2', row: 0.6, bw: 1.05 }); g.rect(cx - 2.1, 6.78, 4.2, 0.2, C.stoneDk, 0.045);
    g.archPath(cx, 0, 3.5, 4.5); g.fs(C.stoneDk, 0.055); g.archPath(cx, 0, 3.0, 4.2); g.fs('#241a26', 0.05);
    x.save(); g.archPath(cx, 0, 3.0, 4.2); x.clip(); g.lit(xx => { xx.beginPath(); xx.rect(cx - 1.5, 0, 3.0, 1.9); }, '#d0522e', '#6a3a38');
    const ig = x.createLinearGradient(0, 2.0, 0, 0.3); ig.addColorStop(0, '#241a26'); ig.addColorStop(1, 'rgba(36,26,38,0)'); x.fillStyle = ig; x.fillRect(cx - 1.5, 0, 3.0, 2.1);
    x.strokeStyle = '#3d3440'; x.lineWidth = 0.1; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(cx - 1.26 + k * 0.42, 4.2); x.lineTo(cx - 1.26 + k * 0.42, 2.7); x.stroke(); } for (const yy of [2.85, 3.35, 3.85]) { x.beginPath(); x.moveTo(cx - 1.5, yy); x.lineTo(cx + 1.5, yy); x.stroke(); } x.restore();
    x.save(); x.translate(cx, 5.65); g.circle(0, 0, 0.86, C.navy, 0.055); x.strokeStyle = C.gold; x.lineWidth = 0.05; x.beginPath(); x.arc(0, 0, 0.73, 0, 6.3); x.stroke();
    for (const s of [-1, 1]) { x.save(); x.rotate(s * 0.72); x.beginPath(); x.rect(-0.1, -0.6, 0.2, 1.2); g.fs(C.gold, 0.035); x.beginPath(); x.rect(-0.14, 0.46, 0.28, 0.12); g.fs(C.goldD, 0.03); x.restore(); } g.circle(0, 0, 0.13, C.red, 0.035); x.restore();
    // hakem locası: tentesi kızıl
    g.rect(cx - 9.2, 5.1, 3.4, 1.5, '#3a2a3a', 0.05); g.poly([[cx - 9.5, 6.6], [cx - 5.5, 6.6], [cx - 6.0, 7.4], [cx - 9.0, 7.4]], C.red, 0.05); for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(cx - 9.17 + k * 0.667, 6.6, 0.333, Math.PI, 6.2832); x.closePath(); g.fs(k % 2 ? C.gold : C.red, 0.04); }
    g.shade(0, 0, W, 4.3, 0.06);
    return g;
  };
  art.arenaSide = function (len, seed) {         // yan tribün
    const g = P(len, 8.0, 64), x = g.x; g.stone(0, 0, len, 3.6, { seed, base: '#ddcdb6', row: 0.6, bw: 1.25, lw: 0 }); g.rect(0, 3.5, len, 0.2, C.stoneDk, 0.045); tiers(g, 0, len, 3.7, 4, 0.72, seed + 9); g.crenels(0.1, len - 0.1, 6.58, { base: '#e6d6c0', mw: 0.7, gap: 0.5, seed: seed + 20 });
    for (let p = 2.6; p < len - 1; p += 5.2) { g.archPath(p, 0, 1.9, 2.7); g.fs(C.stoneDk, 0.05); g.archPath(p, 0, 1.5, 2.45); g.fs('#2b2030', 0.045); g.lantern(p + 1.5, 1.9); }
    x.fillStyle = 'rgba(74,52,110,.2)'; x.fillRect(0, 0, len, 8); return g; };
  art.target = function () { const g = P(1.7, 2.3), x = g.x; x.strokeStyle = C.woodD; x.lineWidth = 0.1; for (const [a, b] of [[0.3, 0.85], [1.4, 0.85], [0.85, 0.85]]) { x.beginPath(); x.moveTo(a, 0); x.lineTo(b, 1.3); x.stroke(); }
    for (const [r, col] of [[0.78, '#e9d9a8'], [0.6, C.red], [0.42, '#f6efe0'], [0.25, C.navy], [0.1, C.gold]]) g.circle(0.85, 1.42, r, col, r > 0.7 ? 0.05 : 0.025);
    for (const [px, py] of [[0.55, 1.7], [1.15, 1.2]]) { g.circle(px, py, 0.09, '#2a2026', 0); x.fillStyle = 'rgba(40,24,34,.5)'; x.beginPath(); x.arc(px, py, 0.15, 0, 6.3); x.fill(); } return g; };
  art.cannonRack = function () { const g = P(3.0, 1.9), x = g.x; for (const px of [0.3, 2.7]) g.rect(px - 0.08, 0, 0.16, 1.5, C.woodD, 0.045); g.rect(0.15, 0.55, 2.7, 0.14, C.wood, 0.045); g.rect(0.15, 1.2, 2.7, 0.14, C.wood, 0.045);
    for (const y0 of [0.72, 1.36]) { g.rect(0.5, y0, 1.7, 0.3, '#4a4156', 0.05); g.poly([[2.2, y0 - 0.06], [2.62, y0 - 0.12], [2.62, y0 + 0.42], [2.2, y0 + 0.36]], C.goldD, 0.045); for (const bx of [0.75, 1.3, 1.85]) g.rect(bx, y0 - 0.03, 0.1, 0.36, C.gold, 0.03); g.rect(0.36, y0 + 0.02, 0.2, 0.26, C.wood, 0.04); g.lit(xx => { xx.beginPath(); xx.ellipse(2.62, y0 + 0.15, 0.06, 0.19, 0, 0, 6.3); }, '#ff8a2a', '#3a2530'); } return g; };
})();
