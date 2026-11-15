/* Ejder Ocağı 2.0 · Gök Yarışı: 2.5D pist
   Yarış meydanla aynı motorda, derinliği olan bir pistte uçulur: ejderhalar yandan görünür, gölgeleri yere düşer, halkaların
   içinden geçilir, pistin iki yanındaki kayalar ve ağaçlar farklı derinliklerde akar, uzakta oyunun kendi pist manzarası durur.
   Yarışın kuralları ve fiziği oyunun kendisidir (js/race.js: raceStep, raceHits, rakiplerin üslubu, rüzgâr koridoru, atılım,
   ezeli rakip, ödüller). Bu dosya yalnız sahneyi ve göstergeleri çizer: race.js'in ekran çizen işlevi (raceDraw) burada
   değiştirilir; kumanda (basılı tut: yüksel, D/Shift: atıl) race.js'in kendi bağlamasıdır. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD, D = EO2.sceneDefs = EO2.sceneDefs || {}, app = document.getElementById('app');
  const LANE = 12, ZH = 5.0, Z0 = 1.1, XS = -82; let K = 3.6, V = 'orman', onceki = 'meydan', kam = 'yakin';
  const X = pos => XS + pos * K, Z = y => Z0 + (1 - y) * ZH;
  const VEN = { orman: { floor: 0, light: { amb: [0.62, 0.74, 0.7], night: 0.62, fog: 0.55 } }, kul: { floor: 'kul', light: { amb: [0.92, 0.66, 0.56], night: 0.55, fog: 0.5 } }, buzul: { floor: 'kar', light: { amb: [0.72, 0.86, 1], night: 0.25, fog: 0.6 } }, kayalik: { floor: 'kaya', light: { amb: [0.56, 0.5, 0.82], night: 0.85, fog: 0.5 } } };
  const ELS = ['ates', 'buz', 'firtina', 'toprak', 'golge'];
  /* pist kenarı çizimleri (Midjourney, 2.5D kamera için yandan çizildi): her pistin kendi dekoru ve boyu (birim) */
  const DEKOR = ['agac0', 'agac1', 'cam0', 'cam1', 'buz0', 'buz1', 'kaya0', 'kaya1', 'lav0', 'lav1', 'tas0', 'tas1', 'bulut0', 'bulut1', 'direk'];
  const SIRA = { orman: [['cam0', 6.4], ['agac0', 5.6], ['cam1', 6.8], ['agac1', 5.2]], kul: [['lav0', 3.4], ['lav1', 2.4], ['kaya1', 3.6]], buzul: [['buz0', 5.6], ['buz1', 5.2]], kayalik: [['kaya0', 4.2], ['kaya1', 4.4]] };
  const yukle = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let hazir = null; const onYukle = () => hazir || (hazir = (async () => { while (!EO2.api || !EO2.ext) await new Promise(r => setTimeout(r, 80));
    await Promise.all([...Object.keys(VEN).map(k => yukle(OLD + 'img/rbg-' + k + '-parkur.webp').then(im => { if (im) EO2.ext['rbg-' + k] = im; })), ...ELS.map(e => yukle(OLD + 'img/pose/' + e + '-P1.webp').then(im => { if (im) EO2.ext['uc-' + e] = im; })),
      ...DEKOR.map(k => yukle('assets/dunya/ys-' + k + '.webp').then(im => { if (im) EO2.ext['ys-' + k] = im; }))]); })());

  const L = { id: 'pist', name: 'Gök Yarışı', sub: 'Pist', gx: 260, gy: LANE + 43.6, flyer: false, petals: false, floor: 0, light: VEN.orman.light,
    bounds: [-88, 88, LANE, LANE], mapRect: [-96, -6, 192, 64], paved: [], start: { x: XS, y: LANE, dir: 'right' }, entry: {}, signs: [], interact: [], lamps: [], braziers: [], trees: [], benches: [], planters: [], stalls: [], rects: [], circles: [], lights: [], embers: [], shadows: [], mini: { paved: [], blocks: [], bg: '#4a6a52' }, npcs: [] };

  function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  const halka = () => cv(128, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#fff6cf'); g.addColorStop(0.45, '#f5c85a'); g.addColorStop(1, '#b97a1e'); x.lineWidth = 18; x.strokeStyle = '#5a3606'; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 14, 0, 0, 7); x.stroke(); x.lineWidth = 12; x.strokeStyle = g; x.stroke(); x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 11, h / 2 - 11, 0, 3.4, 4.9); x.stroke(); });
  const bulut = () => cv(256, 160, (x, w, h) => { const b = (px, py, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }; for (const q of [[70, 96, 46], [128, 78, 60], [190, 98, 44], [100, 112, 40], [160, 114, 42]]) b(q[0], q[1], q[2] + 4, '#2a2540'); for (const q of [[70, 96, 46], [128, 78, 60], [190, 98, 44], [100, 112, 40], [160, 114, 42]]) b(q[0], q[1], q[2], '#5a5380'); for (const q of [[86, 82, 26], [140, 62, 34], [182, 86, 22]]) b(q[0], q[1], q[2], '#8078aa');
    x.fillStyle = '#ffe66a'; x.strokeStyle = '#5a3606'; x.lineWidth = 3; x.beginPath(); x.moveTo(132, 96); x.lineTo(112, 126); x.lineTo(128, 126); x.lineTo(116, 154); x.lineTo(150, 118); x.lineTo(134, 118); x.lineTo(146, 96); x.closePath(); x.fill(); x.stroke(); });
  const pus = () => cv(8, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const PUS = { orman: [0.74, 0.9, 0.8], kul: [1, 0.6, 0.38], buzul: [0.86, 0.94, 1], kayalik: [0.72, 0.68, 0.94] };
  const bitis = () => cv(64, 256, (x, w, h) => { for (let j = 0; j < 16; j++) for (let i = 0; i < 4; i++) { x.fillStyle = (i + j) % 2 ? '#fff6dc' : '#26304a'; x.fillRect(i * 16, j * 16, 16, 16); } });

  D.pist = { L, build(h) { const R = h.R, art = h.art; h.addSky();
    const tHalka = R.texture(halka()), tBulut = R.texture(bulut()), tBitis = R.texture(bitis()), sh = h.uv('shadow'), glow = h.uv('glow'), wv = h.uv('white');
    const tKaya = [3, 7, 11, 15].map(s => h.tex(art.rock(s * 13))), tAgac = [h.tx.selvi, h.tx.bahce[0], h.tx.erguvan[0], h.tx.bahce[1], h.tx.cinar], tPole = h.tex(art.bannerPole(h.E, '#a83a2c'));
    /* uzak plan: oyunun kendi pist manzarası; kamerayla az kayar */
    h.push({ key: 9e4, draw(R, F) { const e = h.ext('rbg-' + V); if (!e) return; const w = 118, hh = w * e.h / e.w, x0 = F.camX * 0.9 - w / 2 - (F.camX / 84) * 9, y = LANE + 44, c = [F.amb[0] * 0.6 + 0.4, F.amb[1] * 0.6 + 0.4, F.amb[2] * 0.6 + 0.4, 1]; R.quad(e.t, [x0, y, -9], [x0 + w, y, -9], [x0 + w, y, hh - 9], [x0, y, hh - 9], 0, 0, 1, 1, c, false, 0); } });
    /* ufuk pusu: yer ile uzak manzara arasındaki keskin çizgiyi yumuşatır, derinlik verir */
    const tPus = R.texture(pus()); h.push({ key: LANE + 41, draw(R, F) { const p = PUS[V], x0 = F.camX - 80, y = LANE + 41; R.quad(tPus, [x0, y, -1], [x0 + 160, y, -1], [x0 + 160, y, 9], [x0, y, 9], 0, 0, 1, 1, [p[0], p[1], p[2], 0.55], false, 0);
      R.quad(tPus, [x0, LANE + 17, 0.02], [x0 + 160, LANE + 17, 0.02], [x0 + 160, y, 0.02], [x0, y, 0.02], 0, 1, 1, 0, [p[0], p[1], p[2], 0.55], false, 0); } });
    /* pist kenarı: üç derinlikte kaya ya da ağaç sıraları; öndeki sıra hızlı, arkadaki yavaş akar */
    let sd = 99; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (const row of [[LANE + 27, 17, 2.1], [LANE + 15, 14, 1.5], [LANE + 7, 13, 1.0], [LANE - 3.3, 34, 0.62]]) for (let x = -100; x < 100; x += row[1] * (0.7 + rn() * 0.6)) { const px = x + rn() * 2, py = row[0] + (rn() - 0.5) * 2.2, ki = Math.floor(rn() * 4), ai = Math.floor(rn() * 5), sc = row[2] * (0.75 + rn() * 0.5);
      h.push({ key: py, draw(R, F) { const a = h.nearFade(F, py); if (a < 0.02 || Math.abs(px - F.camX) > 60) return; const c = h.amb(F, py < LANE ? 0.5 : 0.92); c[3] = a; const ds = SIRA[V], q = ds[(ki + ai) % ds.length], e = h.ext('ys-' + q[0]);
        if (e) { const hh = q[1] * sc * (py < LANE ? 0.8 : 1), w = hh * e.w / e.h, m = ai % 2; R.quad(e.t, [px - w / 2, py, -hh * 0.02], [px + w / 2, py, -hh * 0.02], [px + w / 2, py, hh * 0.98], [px - w / 2, py, hh * 0.98], m, 0, 1 - m, 1, c, false, 1); return; }
        const t = V === 'orman' ? tAgac[ai] : tKaya[ki], w = t.wm * sc * (V === 'orman' ? 1 : 1.6), hh = t.hm * sc * (V === 'orman' ? 1 : 1.6); R.quad(t, [px - w / 2, py, 0], [px + w / 2, py, 0], [px + w / 2, py, hh], [px - w / 2, py, hh], 0, 0, 1, 1, c, false, 1); } }); }
    for (let x = -76; x < 90; x += 21) { const py = LANE + 3.2; h.push({ key: py, draw(R, F) { if (Math.abs(x - F.camX) > 50) return; const e = h.ext('ys-direk'), c = h.amb(F, 1); if (!e) { const w = tPole.wm, hh = tPole.hm; R.quad(tPole, [x - w * 0.2, py, 0], [x + w * 0.8, py, 0], [x + w * 0.8, py, hh], [x - w * 0.2, py, hh], 0, 0, 1, 1, c, false, 1); return; }
      const hh = 4.6, w = hh * e.w / e.h, sw = Math.sin(F.time * 1.7 + x) * 0.07; R.quad(h.T.fx, [x - 0.7, py - 0.2, 0.013], [x + 0.7, py - 0.2, 0.013], [x + 0.7, py + 0.2, 0.013], [x - 0.7, py + 0.2, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.5]); R.quad(e.t, [x - w / 2, py, 0], [x + w / 2, py, 0], [x + w / 2 + sw, py, hh], [x - w / 2 + sw, py, hh], 0, 0, 1, 1, c, false, 1); } }); }
    /* bitiş: yerde damalı şerit, iki yanda sancak direkleri */
    h.push({ key: 897, draw(R, F) { if (!RC) return; const fx = X(RC.L), c = h.amb(F); R.quad(tBitis, [fx - 0.7, LANE - 3, 0.014], [fx + 0.7, LANE - 3, 0.014], [fx + 0.7, LANE + 3, 0.014], [fx - 0.7, LANE + 3, 0.014], 0, 0, 1, 1, c, false, 1);
      const sx = X(0); R.quad(h.T.fx, [sx - 0.12, LANE - 3, 0.014], [sx + 0.12, LANE - 3, 0.014], [sx + 0.12, LANE + 3, 0.014], [sx - 0.12, LANE + 3, 0.014], wv[0], wv[1], wv[2], wv[3], [1, 1, 1, 0.5]); } });
    for (const dy of [3, -3]) h.push({ key: LANE + dy, draw(R, F) { if (!RC) return; const fx = X(RC.L), c = h.amb(F), e = h.ext('ys-direk'); if (e) { const hh = 6.2, w2 = hh * e.w / e.h, sw = Math.sin(F.time * 1.9 + dy) * 0.09; R.quad(e.t, [fx - w2 / 2, LANE + dy, 0], [fx + w2 / 2, LANE + dy, 0], [fx + w2 / 2 + sw, LANE + dy, hh], [fx - w2 / 2 + sw, LANE + dy, hh], 0, 0, 1, 1, c, false, 1); return; } const w = tPole.wm * 1.5, hh = tPole.hm * 1.5; R.quad(tPole, [fx - w * 0.2, LANE + dy, 0], [fx + w * 0.8, LANE + dy, 0], [fx + w * 0.8, LANE + dy, hh], [fx - w * 0.2, LANE + dy, hh], 0, 0, 1, 1, c, false, 1); } });
    /* halkalar: arka yarısı ejderhanın arkasında, ön yayı önünde çizilir; ejderha içinden geçer */
    const halkalar = on => ({ key: LANE + (on ? -0.06 : 0.06), draw(R, F) { if (!RC) return; for (const r of RC.rings) { const dx = r.x - RC.pos; if (dx < -3 || dx > 7) continue; const x = X(r.x), z = Z(r.y), w = 0.55, hh = 0.95, got = r.hit, k = got ? 0.35 : 1, pul = got ? 1 : 1 + Math.sin(F.time * 5 + r.x) * 0.05;
        if (!on) { R.quad(h.T.fx, [x - 0.5, LANE, 0.013], [x + 0.5, LANE, 0.013], [x + 0.5, LANE + 0.3, 0.013], [x - 0.5, LANE + 0.3, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.3]);
          if (!got) R.quad(h.T.fx, [x - 1.5, LANE + 0.05, z - 1.6], [x + 1.5, LANE + 0.05, z - 1.6], [x + 1.5, LANE + 0.05, z + 1.6], [x - 1.5, LANE + 0.05, z + 1.6], glow[0], glow[1], glow[2], glow[3], [0.5, 0.36, 0.1, 1], true, 0);
          R.quad(tHalka, [x - w * pul, LANE + 0.05, z - hh * pul], [x + w * pul, LANE + 0.05, z - hh * pul], [x + w * pul, LANE + 0.05, z + hh * pul], [x - w * pul, LANE + 0.05, z + hh * pul], 0, 0, 1, 1, [0.72 * k, 0.72 * k, 0.72 * k, got ? 0.5 : 1], false, 0); }
        else R.quad(tHalka, [x, LANE - 0.05, z - hh * pul], [x + w * pul, LANE - 0.05, z - hh * pul], [x + w * pul, LANE - 0.05, z + hh * pul], [x, LANE - 0.05, z + hh * pul], 0.5, 0, 1, 1, [k, k, k, got ? 0.5 : 1], false, 0); } } });
    h.push(halkalar(false)); h.push(halkalar(true));
    /* engeller: fırtına bulutu ve kaya */
    h.push({ key: LANE + 0.04, draw(R, F) { if (!RC) return; for (const o of RC.obs) { const dx = o.x - RC.pos; if (dx < -3 || dx > 7) continue; const x = X(o.x), z = Z(o.y), c = h.amb(F, 1.1); c[3] = o.hit ? 0.45 : 1;
        const eb = h.ext(o.k === 'bulut' ? 'ys-bulut' + (Math.floor(o.x * 3) % 2) : 'ys-tas' + (Math.floor(o.x * 7) % 2));
        if (o.k === 'bulut') { const w = 1.5, hh = eb ? w * eb.h / eb.w : 0.95, fl = Math.sin(F.time * 9 + o.x * 3) > 0.86 ? 1 : 0; if (fl) R.quad(h.T.fx, [x - 2, LANE + 0.03, z - 2], [x + 2, LANE + 0.03, z - 2], [x + 2, LANE + 0.03, z + 2], [x - 2, LANE + 0.03, z + 2], glow[0], glow[1], glow[2], glow[3], [0.5, 0.5, 0.9, 1], true, 0); const bz = Math.sin(F.time * 1.6 + o.x) * 0.06; R.quad(eb ? eb.t : tBulut, [x - w, LANE + 0.02, z - hh + bz], [x + w, LANE + 0.02, z - hh + bz], [x + w, LANE + 0.02, z + hh + bz], [x - w, LANE + 0.02, z + hh + bz], 0, 0, 1, 1, c, false, 0); }
        else if (eb) { const w = 0.95, hh = w * eb.h / eb.w, bz = Math.sin(F.time * 1.3 + o.x * 2) * 0.07; R.quad(h.T.fx, [x - 0.8, LANE - 0.25, 0.013], [x + 0.8, LANE - 0.25, 0.013], [x + 0.8, LANE + 0.25, 0.013], [x - 0.8, LANE + 0.25, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.45]); R.quad(eb.t, [x - w, LANE + 0.02, z - hh + bz], [x + w, LANE + 0.02, z - hh + bz], [x + w, LANE + 0.02, z + hh + bz], [x - w, LANE + 0.02, z + hh + bz], 0, 0, 1, 1, c, false, 0); }
        else { const t = tKaya[Math.floor(o.x * 7) % 4], w = 0.9, hh = w * t.hm / t.wm; R.quad(t, [x - w, LANE + 0.02, z - hh], [x + w, LANE + 0.02, z - hh], [x + w, LANE + 0.02, z + hh], [x - w, LANE + 0.02, z + hh], 0, 0, 1, 1, c, false, 0); } } } });
    /* yarışçılar: gölgesi yerde, gövdesi irtifasında; hızlanınca arkasında ışık izi */
    let benSon = null, benT = null; const benDoku = () => { const im = EO2.yaris25.benIm; if (!im) return null; if (im !== benSon) { benSon = im; benT = { t: R.texture(im), w: im.naturalWidth, h: im.naturalHeight }; } return benT; };
    const ucan = (R, F, pos, y, vy, el, ben, hiz, t0) => { const e = (ben && benDoku()) || h.ext('uc-' + el); if (!e) return; const w = ben ? 3.5 : 3.2, hh = w * e.h / e.w * (1 + Math.sin(F.time * 13 + t0) * 0.045), x = X(pos), z = Z(y), ang = Math.max(-0.5, Math.min(0.5, -vy * 0.8)), cs = Math.cos(ang), sn = Math.sin(ang), alt = z / (Z0 + ZH), ly = LANE + (ben ? 0 : 0.02);
      const P = (dx, dz) => [x + dx * cs - dz * sn, ly, z + dx * sn + dz * cs], sw = w * (0.5 - alt * 0.22); R.quad(h.T.fx, [x - sw, ly - 0.25, 0.013], [x + sw, ly - 0.25, 0.013], [x + sw, ly + 0.25, 0.013], [x - sw, ly + 0.25, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.75 - alt * 0.4]);
      if (hiz > 0.05) { const k = Math.min(1, hiz), col = G.ELC[el] || '#ffffff', r = parseInt(col.slice(1, 3), 16) / 255, g = parseInt(col.slice(3, 5), 16) / 255, b = parseInt(col.slice(5, 7), 16) / 255; for (let i = 0; i < 3; i++) { const lx = -w * (0.5 + i * 0.75), lw = w * (0.9 + i * 0.3), dz = (i - 1) * 0.28 + Math.sin(F.time * 20 + i) * 0.05, a = k * (0.55 - i * 0.14);
          R.quad(h.T.fx, P(lx - lw * 1.5, dz - 0.3), P(lx + lw * 0.4, dz - 0.3), P(lx + lw * 0.4, dz + 0.3), P(lx - lw * 1.5, dz + 0.3), glow[0], glow[1], glow[2], glow[3], [r * a * 1.5, g * a * 1.5, b * a * 1.5, 1], true, 0); } }
      const c = F.lit(x, ly, 1); if (!ben) { c[0] *= 0.92; c[1] *= 0.92; c[2] *= 0.92; } R.quad(e.t, P(-w / 2, -hh / 2), P(w / 2, -hh / 2), P(w / 2, hh / 2), P(-w / 2, hh / 2), 0, 0, 1, 1, c, false, 0); };
    h.push({ key: LANE + 0.02, draw(R, F) { if (!RC) return; for (const r of RC.riv) { const dx = r.pos - RC.pos; if (dx < -5 || dx > 8) continue; ucan(R, F, r.pos, r.y, r.vy || 0, r.el, false, Math.max(r.bA || 0, r.slipSurgeT > 0 ? 0.8 : 0), r.i * 2.1); } } });
    h.push({ key: LANE, draw(R, F) { if (!RC) return; ucan(R, F, RC.pos, RC.y, RC.vy || 0, RC.d.el, true, Math.max(RC.dashT > 0 ? 1 : 0, RC.boost > 0.15 ? 0.7 : 0, RC.slipSurgeT > 0 ? 0.8 : 0), 0); } });
    return {};
  } };

  /* ---------- göstergeler ---------- */
  function govde() { const d = RC.d, race = RC.race, solo = !RC.riv.length;
    return '<header class="y-ust"><div class="y-ad"><small>' + (race ? 'Gök yarışı' : 'Antrenman uçuşu') + '</small><b>' + (race ? race.ad : RC.V.ad) + '</b></div>' +
      '<div class="y-pist" id="rtrack"><i class="cizgi"></i>' + RC.riv.map(x => '<span class="rmk riv' + (x.nem ? ' nem' : '') + '" id="rv' + x.i + '" style="--c:' + (G.ELC[x.el] || '#fff') + '"><img alt="" src="' + OLD + 'img/dr-' + x.el + '-yetiskin.webp"></span>').join('') + '<span class="rmk me" id="rme" style="--c:#a6e0ff"><img alt="" src="' + G.img(d) + '"></span><i class="bayrak"></i></div>' +
      (solo ? '' : '<div class="y-sira" id="rrank"><b>' + (RC.riv.length + 1) + '</b><small>/ ' + (RC.riv.length + 1) + '</small></div>') + '<button type="button" class="gbtn kucuk" data-a="race-auto">Otomatik uç</button></header>' +
      (solo ? '' : '<div class="y-fark"><span id="rgapA"></span><span id="rgapB"></span></div>') + '<div class="y-fx" id="rdr"></div>' +
      RC.riv.map(x => '<div class="y-konus' + (x.nem ? ' nem' : '') + '" id="rrv' + x.i + '"><b>' + (x.nem ? '<em>Ezeli rakip</em>' : '') + esc(x.name) + '</b><span class="rsay"></span></div>').join('') +
      '<div class="y-hirs" id="rhirs"><b>Hırs</b><span><i id="rhirsf"></i><s></s></span></div><button type="button" class="y-atil" id="rdash"><b>Atıl</b><small>D · Shift</small></button><button type="button" class="y-cirp" id="rhold"><b>Kanat çırp</b><small>basılı tut · yüksel</small></button>' +
      '<div class="y-yorum" id="rcom"></div><div class="y-say" id="rcount">3</div><p class="y-ipucu" id="rhint">Basılı tut: yüksel · <b>halkalar</b> hırs verir · öndekinin <b>rüzgâr koridoruna</b> gir · hırs dolunca <b>atıl</b></p>'; }
  const Q = id => document.getElementById(id);
  function ciz() { if (!RC) return; const prog = RC.pos / RC.L, tw = x => (Math.max(0, Math.min(1, x)) * 100) + '%', me = Q('rme'); if (!me) return; me.style.left = tw(prog); RC.riv.forEach(x => { const e = Q('rv' + x.i); if (e) e.style.left = tw(x.pos / RC.L); });
    const hf = Q('rhirsf'); if (hf) { hf.style.width = RC.hirs + '%'; Q('rhirs').classList.toggle('ready', RC.hirs >= dashCost()); Q('rdash').classList.toggle('ready', RC.hirs >= dashCost() && RC.dashT <= 0); }
    Q('rhold').classList.toggle('holding', !!RC.hold);
    if (RC.riv.length) { const rk = document.querySelector('#rrank b'); if (rk) rk.textContent = RC.rank || raceRank();
      const ahead = RC.riv.filter(r => r.pos > RC.pos).sort((a, b) => a.pos - b.pos)[0], behind = RC.riv.filter(r => r.pos <= RC.pos).sort((a, b) => b.pos - a.pos)[0], sec = g => (Math.abs(g) / RC.sp).toFixed(1).replace('.', ','), A = Q('rgapA'), B = Q('rgapB');
      const slip = RC.slipSurgeT > 0 ? ' · <b class="iyi">Koridor ivmesi!</b>' : RC.draft ? ' · <b class="iyi">Rüzgâr koridoru %' + Math.round((RC.draftCharge || 0) * 100) + '</b>' : '';
      if (A) { A.innerHTML = (ahead ? 'Önde: <b>' + esc(ahead.name) + '</b> (' + sec(ahead.pos - RC.pos) + ' sn)' : '<b class="iyi">Öndesin!</b>') + slip; A.className = (ahead && ahead.pos - RC.pos < .5) || RC.draft || RC.slipSurgeT > 0 ? 'sicak' : ''; }
      if (B) { B.innerHTML = behind ? 'Geride: <b>' + esc(behind.name) + '</b> (' + sec(RC.pos - behind.pos) + ' sn)' : ''; B.className = behind && RC.pos - behind.pos < .5 ? 'sicak' : ''; } }
    /* rakip adları ve sözleri: ejderhanın üstünde, sahneye izdüşümle */
    const A = EO2.api, R = A.R, kx = app.clientWidth / R.w, ky = app.clientHeight / R.h; for (const r of RC.riv) { const e = Q('rrv' + r.i); if (!e) continue; const p = R.project(X(r.pos), LANE, Z(r.y) + 1.25); if (!p || p[0] < -60 || p[0] > R.w + 60) { e.style.display = 'none'; continue; } e.style.display = ''; e.style.transform = 'translate(' + (p[0] * kx).toFixed(1) + 'px,' + (p[1] * ky).toFixed(1) + 'px) translate(-50%,-100%)'; }
    const fx = Q('rdr'), p = R.project(X(RC.pos), LANE, Z(RC.y) + 1.4); if (fx && p) fx.style.transform = 'translate(' + (p[0] * kx).toFixed(1) + 'px,' + (p[1] * ky).toFixed(1) + 'px)';
    /* kamera yarışçıyı izler */
    A.player.x = Math.max(-84, Math.min(84, X(RC.pos) + 4.6)); A.player.y = LANE; }
  function kur() { let w = Q('racem'); if (w) w.remove(); w = document.createElement('div'); w.id = 'racem'; w.className = 'yr25'; w.innerHTML = govde(); app.appendChild(w);
    w.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && RACE_ACT[el.dataset.a]) { if (EO2.audio) EO2.audio.ui(); RACE_ACT[el.dataset.a](el); } }); }
  function bitir() { const w = Q('racem'); if (w) w.remove(); window.EO2_MODAL = null; window.EO2_MODAL_KAPAT = null; window.__noCuts = 0; app.classList.remove('yarista'); EO2.gizli = false; G.mesgul = false; const A = EO2.api; A.S.camMode = kam; A.go(onceki); setTimeout(() => { G.redraw(); G.open('yaris'); }, 950); }

  /* race.js'in çizim ve ara sahne işlevleri 2.5D sahneye bağlanır */
  const eskiCiz = window.raceDraw, eskiKes = window.raceCut;
  async function basla(f, race, practice) { await onYukle(); EO2.yaris25.benIm = G.gorunusBekle ? await G.gorunusBekle(f, 'P1') : null; const A = EO2.api; onceki = A.scene() === 'pist' ? 'meydan' : A.scene(); kam = A.S.camMode;
    V = race ? race.venue : ['orman', 'kul', 'buzul', 'kayalik'][Math.floor(Math.random() * 4)]; L.floor = VEN[V].floor; L.light = VEN[V].light;
    G.close(); G.mesgul = true; EO2.gizli = true; app.classList.add('yarista'); if (EO2.CAM) { EO2.CAM.yaris = { th: 0.06, H: 4.4, D: 12.5, feet: 0.84 }; A.S.camMode = 'yaris'; }
    A.go('pist'); await new Promise(r => setTimeout(r, 760));
    window.raceDraw = ciz; window.raceCut = (t, a, b, r, then) => { if (typeof then === 'function') then(); }; window.__noCuts = 1;
    window.EO2_MODAL = () => kur(); window.EO2_MODAL_KAPAT = () => { window.raceDraw = eskiCiz; window.raceCut = eskiKes; bitir(); };
    raceStart(f, race, practice); if (RC) { if (!race) V = RC.V.key; L.floor = VEN[V].floor; L.light = VEN[V].light; K = 164 / RC.L; A.player.x = X(0) + 4.6; A.player.y = LANE; A.cam.x = A.player.x; ciz(); } }
  EO2.yaris25 = { basla, X, Z };
})();
