/* Ejder Ocağı 2.0 · Ocak: 2.5D gezilebilir arazi
   Ocak artık bir ekran değil, meydanla aynı motorda bir yerdir: arazi kareleri yerde, yapılar dik durur, ejderhalar gerçek
   boylarında dolaşır, terbiyeci aralarında yürür. Önündeki kareye E ile dokunursun; o karenin tepsisi (çalılık açma, yapı
   kartları, kurulu yapının künyesi) dünyanın üstünde açılır. Ejderhaya yaklaşıp E dersen ahırda onun sayfası açılır.
   Kurallar oyunun kendisidir: clearCost/canClear, BUILD/BUILD_GROUPS fiyatları, kuluckaFree. Arazi 8 × 6 karedir (S.grid). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD, D = EO2.sceneDefs = EO2.sceneDefs || {}, app = document.getElementById('app');
  /* Yerleşim: arazi 8 × 6 karedir (kural aynı) ama dört mahalleye bölünür. Ortadan giriş yolu (GX) ve onu kesen ara yol (GY) geçer;
     kesişimde taş avlu ve ocak kulesi durur, yolun sonunda dedenin evi. Mahalleler öneridir: her yapı her açık kareye kurulabilir. */
  const TS = 3.2, NX = 8, NY = 6, GX = 4.6, GY = 4.6, X0 = -(NX * TS + GX) / 2, Y0 = 5.2, YT = Y0 + NY * TS + GY, YC = Y0 + 3 * TS + GY / 2;
  const cx = i => { const c = i % NX; return X0 + (c + 0.5) * TS + (c >= 4 ? GX : 0); }, cy = i => { const r = NY - 1 - Math.floor(i / NX); return Y0 + (r + 0.5) * TS + (r >= 3 ? GY : 0); };
  const tileAt = (x, y) => { const xr = x - X0, yr = y - Y0, c = xr < 4 * TS ? Math.floor(xr / TS) : xr < 4 * TS + GX ? -1 : 4 + Math.floor((xr - 4 * TS - GX) / TS), r = yr < 3 * TS ? Math.floor(yr / TS) : yr < 3 * TS + GY ? -1 : 3 + Math.floor((yr - 3 * TS - GY) / TS); return c < 0 || c >= NX || r < 0 || r >= NY ? -1 : (NY - 1 - r) * NX + c; };
  /* mahalle: kareye göre önerilen yapı grubu (BUILD_GROUPS sırası: 0 Temel, 1 Antrenman, 2 Süs). Ön sol antrenman, ön sağ bakım, arka iki yan ev ve bahçe */
  const mahalle = i => { const c = i % NX, r = NY - 1 - Math.floor(i / NX); return r < 3 ? (c < 4 ? 1 : 0) : (c < 4 ? 0 : 2); };
  const B_IMG = ['buzc', 'direk', 'fener', 'golgetas', 'heykel', 'in', 'kaynak', 'kiler', 'kulucka', 'lab', 'lav', 'magara', 'mezar', 'parkur', 'sifa', 'talim', 'yosun', 'yuva'];
  /* bu kameraya göre (önden, hafif üstten) yeniden çizilmiş yapılar; listede olmayanlar eski izometrik çizimiyle durur */
  const YENI = ['in', 'kulucka', 'talim', 'agirlik', 'parkur', 'kaynak', 'magara', 'kiler', 'yuva', 'sifa', 'lab', 'fener', 'heykel', 'lav', 'buzc', 'direk', 'yosun', 'golgetas', 'mezar'];
  /* her yapının sahnedeki eni (birim) ve varsa kendi ışığı: çizimler 2.5D kamera için önden çizildi, yere dik durur */
  const GEN = { in: 3.5, kulucka: 3.2, talim: 3.5, agirlik: 3.1, parkur: 2.9, kaynak: 3.4, magara: 3.5, kiler: 3.5, yuva: 3.5, sifa: 3.6, lab: 2.7, fener: 1.6, heykel: 2.3, lav: 2.9, buzc: 2.5, direk: 1.5, yosun: 2.7, golgetas: 2.9, mezar: 2.0 };
  /* çizim dünyasının yapıları (assets/dunya/an/oc-<ad>.webp): tam karşıdan çizildi, tabanı yere oturur */
  const GEN2 = { in: 3.0, kulucka: 2.4, talim: 3.0, agirlik: 2.8, parkur: 2.6, kaynak: 3.0, magara: 3.1, kiler: 2.9, yuva: 3.0, sifa: 2.9, lab: 2.2, fener: 1.1, heykel: 1.6, lav: 2.8, buzc: 2.3, direk: 1.3, yosun: 2.5, golgetas: 1.35, mezar: 1.5 };
  const ISIK = { fener: [1, 0.72, 0.3, 0.8], lav: [1, 0.4, 0.1, 0.35], direk: [0.6, 0.5, 1, 0.8], golgetas: [0.62, 0.3, 1, 0.4], buzc: [0.4, 0.72, 1, 0.4], kulucka: [1, 0.5, 0.15, 0.4], kaynak: [0.4, 0.8, 1, 0.3], magara: [0.35, 0.5, 1, 0.3], mezar: [1, 0.8, 0.4, 0.25] };
  const ELS = ['ates', 'buz', 'firtina', 'toprak', 'golge'], STG = ['yavru', 'genc', 'yetiskin'], BOY = { yavru: 1.7, genc: 2.9, yetiskin: 4.3 };
  /* görseller: oyunun kendi yapı ve ejderha çizimleri; sahne kurulmadan önce yüklenir */
  const yukle = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let hazir = null; const onYukle = () => hazir || (hazir = (async () => { while (!EO2.api || !EO2.ext) await new Promise(r => setTimeout(r, 80));
    await Promise.all([...B_IMG.map(k => yukle(OLD + 'img/b-' + k + '.webp').then(im => { if (im) EO2.ext['b-' + k] = im; })), ...ELS.flatMap(e => STG.map(s => yukle(OLD + 'img/dr-' + e + '-' + s + '.webp').then(im => { if (im) EO2.ext['dr-' + e + '-' + s] = im; }))),
      ...['cali0', 'cali1', 'cali2', 'ev', 'kule', 'erguvan0', 'erguvan1', 'cicek0', 'cicek1', 'ys-agac0', 'ys-agac1', 'ys-cam0', 'ys-cam1', 'ys-direk', ...YENI.map(k => 'yapi-' + k)].map(k => yukle('assets/dunya/' + k + '.webp').then(im => { if (im) EO2.ext['oc-' + k] = im; })),
      ...[...YENI, 'ev', 'kule', 'cali0', 'cali1', 'cali2', 'cit'].map(k => yukle('assets/dunya/an/oc-' + k + '.webp').then(im => { if (im) EO2.ext['on-' + k] = im; }))]); })());
  onYukle();

  /* ---------- sahne tanımı ---------- */
  const cikis = { id: 'cikis', x: 0, y: 0.8, r: 1.5, z: 2.4, label: 'Meydana dön', sub: 'Ocak kapısı', act: 'go:meydan' };
  const kare = { id: 'kare', x: 0, y: -50, r: 0, z: 0.4, label: '', sub: '', act: 'kare:0', i: -1 };
  const ejSlot = Array.from({ length: 14 }, (_, k) => ({ id: 'ej' + k, x: 0, y: -60, r: 0, z: 2, label: 'Yanına git', sub: '', act: 'ejder:0' }));
  /* arazinin çevresi: duvar yok; çiçekli ağaçlar, çamlar ve ulu ağaçlardan bir orman açıklığı. [çizim, x, y, boy, ayna] */
  const AGAC = []; { const XA = -X0 + 3.4, T = ['erguvan0', 'ys-cam1', 'ys-agac1', 'erguvan1', 'ys-cam0', 'ys-agac0']; let k = 0; for (let y = 6.4; y < YT + 1; y += 5.4) { AGAC.push([T[k % 6], -XA - (k % 2) * 0.8, y, 0, 0]); AGAC.push([T[(k + 3) % 6], XA + (k % 2) * 0.7, y + 1.1, 0, 1]); k++; }
    for (const q of [[-XA + 1, YT + 4.2, 'ys-cam0'], [-11.5, YT + 5.0, 'erguvan0'], [-6.6, YT + 4.4, 'ys-agac0'], [6.8, YT + 4.6, 'ys-agac1'], [11.8, YT + 5.2, 'erguvan1'], [XA - 1, YT + 4.0, 'ys-cam1'], [-5.6, 2.6, 'ys-cam1'], [5.6, 2.6, 'ys-cam1']]) AGAC.push([q[2], q[0], q[1], 0, 0]); }
  const UZAK = []; { let sd = 41; const rn2 = () => (sd = (sd * 16807) % 2147483647) / 2147483647, T = ['ys-cam0', 'ys-cam1', 'ys-agac0', 'ys-cam1', 'ys-agac1', 'ys-cam0']; for (const row of [[YT + 9, 5.2, 9.5], [YT + 16, 6.4, 11.5], [YT + 26, 8, 14]]) for (let x = -62; x < 62; x += row[1] * (0.7 + rn2() * 0.6)) UZAK.push([T[Math.floor(rn2() * T.length)], x, row[0] + (rn2() - 0.5) * 2.4, row[2] * (0.8 + rn2() * 0.4), rn2() < 0.5 ? 1 : 0]); }
  const CICEK = [[-14.4, 7.2, 1.7, 0], [-14.7, 12.6, 1.5, 1], [-14.3, 17.4, 1.8, 0], [-14.6, 22.0, 1.5, 1], [14.5, 8.0, 1.6, 1], [14.3, 13.2, 1.8, 0], [14.7, 18.2, 1.5, 0], [14.4, 22.6, 1.7, 1],
    [-7.2, 3.5, 1.5, 0], [7.2, 3.5, 1.5, 1], [-11.0, 3.9, 1.7, 1], [11.0, 3.9, 1.7, 0], [-13.8, 2.6, 1.4, 0], [13.8, 2.6, 1.4, 1], [-4.2, YT + 1.6, 1.6, 0], [1.6, YT + 1.8, 1.5, 1], [5.4, YT + 1.5, 1.7, 0], [-15.2, YT + 1.9, 1.6, 1], [15.2, YT + 2.0, 1.6, 0]];
  const trees = AGAC.map(t => ['bahce', t[1], t[2]]);
  const lamps = [[-4.6, 3.6], [4.6, 3.6]], planters = [];
  const L = { id: 'ocak', name: 'Dedenin Ocağı', sub: 'Senin arazin', zemin: ['tas', 'cim', 3.6, 7], flyer: true, petals: true,
    bounds: [X0 - 0.6, -X0 + 0.6, 0.6, YT + 0.4], mapRect: [-28, -8, 56, 52], paved: [[-1.25, -4, 1.25, YT + 0.9], [X0 + 0.3, YC - 1.05, -X0 - 0.3, YC + 1.05], [-2.9, YC - 2.9, 2.9, YC + 2.9], [-3.6, YT - 0.2, 3.6, YT + 1.0]], start: { x: 0, y: 1.9, dir: 'up' }, entry: {}, signs: [],
    interact: [cikis, kare, ...ejSlot], lamps: [], braziers: [[-11.6, 4.6], [11.6, 4.6]], trees, benches: [], planters, stalls: [], rects: [], circles: [],
    lights: [...lamps.map(l => [l[0], l[1], 5.6, 1]), [-11.6, 4.6, 5, 1.1], [11.6, 4.6, 5, 1.1], [0, YC, 8, 1.3], [0, YT + 1.2, 6, 0.8]], embers: [[-11.6, 4.6, 1.1], [11.6, 4.6, 1.1], [0, YC - 0.4, 1.4]], shadows: [[1.2, YC - 1.4, 3.4, 1.5, 0.7], [1.6, YT + 0.5, 5.2, 1.5, 0.7]],
    mini: { paved: [[-1.25, 0, 1.25, YT], [X0, YC - 1, -X0, YC + 1]], blocks: [], bg: '#6aa85a' }, npcs: [] };
  L.circles.push([0, YC + 0.25, 1.75]);
  /* çarpışma: kapalı kareler ve yapılar geçilmez; arazi değiştikçe yenilenir */
  function carp() { L.rects.length = 0; if (typeof S === 'undefined' || !S || !S.grid) return; S.grid.forEach((t, i) => { const x = cx(i), y = cy(i); if (!t.open) L.rects.push([x - TS / 2, x + TS / 2, y - TS / 2, y + TS / 2]); else if (t.b) L.rects.push([x - TS * 0.3, x + TS * 0.3, y - TS * 0.12, y + TS * 0.3]); });
    L.mini.blocks = S.grid.map((t, i) => t.b ? [cx(i) - 1, cy(i) - 0.6, cx(i) + 1, cy(i) + 0.8] : null).filter(Boolean); }

  /* ---------- dokular ---------- */
  function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  let seed = 7; const rn = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cim = v => cv(128, 128, (x, w, h) => { seed = 11 + v * 97; const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, v ? '#8fd070' : '#86c96a'); g.addColorStop(1, v ? '#74b85c' : '#6fb458'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const px = rn() * w, py = rn() * h, l = 3 + rn() * 5; x.strokeStyle = rn() < 0.5 ? 'rgba(52,110,50,.35)' : 'rgba(190,240,150,.4)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rn() - 0.5) * 3, py - l); x.stroke(); }
    for (let i = 0; i < 5; i++) { const px = 12 + rn() * (w - 24), py = 12 + rn() * (h - 24); x.fillStyle = ['#fff3c4', '#ffd0e0', '#fff'][i % 3]; x.beginPath(); x.arc(px, py, 1.8, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(40,90,44,.5)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3); x.strokeStyle = 'rgba(220,255,190,.35)'; x.lineWidth = 1.5; x.strokeRect(5, 5, w - 10, h - 10); });
  const yabani = () => cv(128, 128, (x, w, h) => { seed = 303; const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#4e7046'); g.addColorStop(1, '#3d5a3a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { x.fillStyle = rn() < 0.5 ? 'rgba(28,52,30,.5)' : 'rgba(96,130,80,.4)'; x.beginPath(); x.arc(rn() * w, rn() * h, 3 + rn() * 7, 0, 7); x.fill(); }
    for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(120,112,100,.75)'; x.beginPath(); x.ellipse(rn() * w, rn() * h, 4 + rn() * 5, 3 + rn() * 3, rn() * 3, 0, 7); x.fill(); } x.strokeStyle = 'rgba(20,40,24,.55)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3); });
  const cali = v => cv(256, 190, (x, w, h) => { seed = 500 + v * 131; const blob = (px, py, r, c) => { x.fillStyle = c; x.beginPath(); for (let a = 0; a < 6.3; a += 0.5) { const rr = r * (0.82 + rn() * 0.32); x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.86); } x.closePath(); x.fill(); x.lineWidth = 3; x.strokeStyle = '#24362a'; x.stroke(); };
    for (let i = 0; i < 6; i++) { x.strokeStyle = '#5a4030'; x.lineWidth = 5; x.beginPath(); const bx = 60 + rn() * 136; x.moveTo(bx, h - 4); x.quadraticCurveTo(bx + (rn() - 0.5) * 80, h - 70 - rn() * 40, bx + (rn() - 0.5) * 130, 36 + rn() * 50); x.stroke(); }
    blob(78, 128, 58, '#3f6a44'); blob(176, 122, 62, '#3a6240'); blob(128, 86, 66, '#4a7a4c'); blob(96, 100, 34, '#5c9058'); blob(160, 76, 30, '#62985c');
    for (let i = 0; i < 16; i++) { const px = 40 + rn() * 176, py = 40 + rn() * 110; x.fillStyle = '#8a3a4a'; x.beginPath(); x.arc(px, py, 3.2, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(px - 1, py - 1, 1, 0, 7); x.fill(); } });
  const yumurta = () => cv(64, 80, (x, w, h) => { const g = x.createRadialGradient(24, 26, 4, 32, 42, 40); g.addColorStop(0, '#fff8e6'); g.addColorStop(0.5, '#ffcf90'); g.addColorStop(1, '#c0683a'); x.fillStyle = g; x.beginPath(); x.ellipse(32, 44, 22, 30, 0, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = '#4a2a1a'; x.stroke(); x.fillStyle = 'rgba(160,70,40,.55)'; for (const q of [[24, 50, 5], [40, 36, 4], [36, 58, 3.5], [22, 34, 3]]) { x.beginPath(); x.arc(q[0], q[1], q[2], 0, 7); x.fill(); } });

  /* ---------- ejderhaların gezinmesi ---------- */
  const gez = {};
  function bosKare() { const o = []; S.grid.forEach((t, i) => { if (t.open && !t.b) o.push(i); }); return o.length ? o[Math.floor(Math.random() * o.length)] : -1; }
  /* emrin yeri: antrenman emri o yeteneğin yapısına (yoksa Talim Meydanı'na), dinlenme ine (yoksa Sıcak Kaynak'a), çift emirleri Yuva Bahçesi'ne götürür.
     Yalnız gösterimdir: emir, verim ve sonuç oyunun kendi kuralıyla hafta sonunda işlenir. */
  const IS_YAPI = { gu: 'agirlik', ce: 'parkur', da: 'kaynak', ze: 'magara' };
  function isYeri(d) { const tk = d.task; if (!tk || !S.grid) return -1; const ks = tk.t === 'train' ? [IS_YAPI[tk.k], 'talim'] : tk.t === 'rest' ? ['in', 'kaynak'] : tk.p != null ? ['yuva'] : [];
    for (const k of ks) { if (!k) continue; const yer = []; S.grid.forEach((t, i) => { if (t.b === k) yer.push(i); }); if (yer.length) return yer[Math.abs(+d.id || 0) % yer.length]; } return -1; }
  function adim(dt) { if (typeof S === 'undefined' || !S || !S.dragons) return; const canli = S.dragons.filter(d => !d.dead).slice(0, ejSlot.length);
    canli.forEach((d, k) => { let g = gez[d.id]; if (!g) { const i = bosKare(); g = gez[d.id] = { x: i < 0 ? 0 : cx(i) + (Math.random() - 0.5), y: i < 0 ? 3 : cy(i), tx: 0, ty: 0, bekle: 1 + Math.random() * 4, yon: 1, t: Math.random() * 9, sevin: 0 }; g.tx = g.x; g.ty = g.y; }
      g.t += dt; if (g.sevin > 0) g.sevin -= dt; const yer = isYeri(d); if (yer >= 0) { g.tx = cx(yer) + ((Math.abs(+d.id || 0) % 3) - 1) * 0.85; g.ty = cy(yer) - TS * 0.46; } g.is = yer >= 0 ? d.task.t : null;
      const dx = g.tx - g.x, dy = g.ty - g.y, m = Math.hypot(dx, dy), uyur = d.task && d.task.t === 'rest' && m <= 0.08;
      if (m > 0.08 && !uyur) { const v = (d.stage === 'yavru' ? 1.1 : 0.7) * dt; g.x += dx / m * Math.min(v, m); g.y += dy / m * Math.min(v, m); if (Math.abs(dx) > 0.05) g.yon = dx > 0 ? 1 : -1; g.yuru = true; }
      else { g.yuru = false; g.bekle -= dt; if (g.bekle <= 0 && !uyur && yer < 0) { const i = bosKare(); if (i >= 0) { g.tx = cx(i) + (Math.random() - 0.5) * 1.2; g.ty = cy(i) + (Math.random() - 0.5) * 0.8; } g.bekle = 3 + Math.random() * 7; } }
      const s = ejSlot[k], w = BOY[d.stage] || 3; s.x = g.x; s.y = g.y - 0.4; s.r = Math.max(1.7, w * 0.5); s.z = w * 0.72; s.sub = d.name; s.act = 'ejder:' + d.id; s.label = uyur ? 'Uyuyor' : g.is === 'train' && !g.yuru ? 'Çalışıyor' : 'Yanına git'; g.uyur = uyur; });
    for (let k = canli.length; k < ejSlot.length; k++) { ejSlot[k].r = 0; ejSlot[k].y = -60; } for (const id in gez) if (!canli.find(d => String(d.id) === id)) delete gez[id]; }
  /* önündeki kare: terbiyecinin bir adım ötesindeki, yoksa üstünde durduğu kare */
  const YON = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] };
  function odak() { const A = EO2.api, p = A.player, v = YON[p.dir] || [0, 1]; const on = tileAt(p.x + v[0] * 1.9, p.y + v[1] * 1.9), alt = tileAt(p.x, p.y); let i = on >= 0 && (!S.grid[on].open || S.grid[on].b) ? on : alt >= 0 ? alt : on;      // önünde çalılık ya da yapı varsa o; yoksa üstünde durduğu kare
    kare.i = i; if (i < 0 || document.getElementById('ocTepsi')) { kare.r = 0; kare.y = -50; return; } const t = S.grid[i]; kare.x = cx(i); kare.y = cy(i) - (t.open && !t.b ? 0 : TS * 0.45); kare.r = TS * 1.5; kare.act = 'kare:' + i; kare.z = t.b ? 2.6 : t.open ? 0.5 : 1.5;
    if (!t.open) { const ok = canClear(i); kare.label = ok ? 'Araziyi aç' : 'Çalılık'; kare.sub = ok ? clearCost() + ' altın' : 'Önce yanındaki araziyi aç'; } else if (t.b) { kare.label = BUILD[t.b].ad; const eg = t.b === 'kulucka' ? (S.eggs || []).filter(q => q.inK).length : 0, B = BUILD[t.b], cs = (B.stat || t.b === 'talim') ? (S.dragons || []).filter(d => !d.dead && d.task && d.task.t === 'train' && (!B.stat || d.task.k === B.stat)).length : 0; kare.sub = eg ? eg + ' yumurta kuluçkada' : cs ? cs + ' ejderha çalışıyor' : 'Yapıya bak'; } else { kare.label = 'Yapı kur'; kare.sub = 'Boş arazi'; } }
  EO2.frameHooks.push(() => { if (!EO2.api || EO2.api.scene() !== 'ocak' || !G.live) return; const F = EO2.api.sceneState(); adim(Math.min(0.05, (performance.now() - (adim.son || performance.now())) / 1000)); adim.son = performance.now(); odak(); });

  D.ocak = { L, build(h) { h.addSky(); const art = h.art, R = h.R, tx = h.tx;
    /* çevre: meydanla aynı gök ve tepeler; çizim dünyasının ağaçları, fenerleri, sancakları; arazinin iki yanında ve önünde tahta çit */
    const agacT = ad => ad.startsWith('erguvan') ? tx.erguvan[ad.endsWith('1') ? 1 : 0] : ad.startsWith('ys-cam') ? tx.selvi : ad === 'ys-agac0' ? tx.cinar : tx.bahce[ad.endsWith('1') ? 1 : 0];
    for (const t of AGAC) h.billboard(agacT(t[0]), t[1], t[2], { sway: 0.05 });
    for (const q of [[-23, YT + 9, 'ys-agac0'], [-12, YT + 10, 'ys-cam0'], [-3, YT + 9.5, 'ys-agac1'], [6, YT + 10.5, 'ys-cam1'], [14, YT + 9, 'ys-agac0'], [23, YT + 10, 'ys-agac1'], [-21, 12, 'ys-agac1'], [21.5, 16, 'ys-agac0'], [-22, 22, 'ys-cam0'], [22, 6, 'ys-cam1']]) h.billboard(agacT(q[2]), q[0], q[1], { sway: 0.04, fade: false });
    for (const l of lamps) h.billboard(tx.lamp, l[0], l[1], { glowK: 1.2 });
    for (const b of L.braziers) h.billboard(tx.braz, b[0], b[1], { glowK: 1.4 });
    const tDir = h.D('direk', () => art.bannerPole(h.E, '#213270')); h.billboard(tDir, -7.4, 4.7, { ax: 0.2, sway: 0.03 }); h.billboard(tDir, 7.4, 4.7, { ax: 0.2, sway: 0.03 });
    const cit = h.ext('on-cit'); if (cit) { const ct = cit.t, cl = 4.2, chh = cl * cit.h / cit.w; ct.wm = cl; ct.hm = chh; const XK = -X0 + 1.5;
      for (let y = Y0 - 1.4; y < YT + 1; y += cl) { h.side(ct, -XK, y, y + cl, 'E', chh); h.side(ct, XK, y, y + cl, 'W', chh); }
      for (let x = -XK; x < XK - 0.1; x += cl) { const m = x + cl / 2; if (Math.abs(m) < 5.4) continue; h.billboard(ct, x, YT + 1.2, { ax: 0, occl: false, fade: false }); } }   // önde çit yok: kamerayı kapatır; girişi fenerler ve sancaklar belirler
    const shdU = h.uv('shadow');
    const dekor = (ad, x, y, w, glow) => { const e = h.ext('on-' + ad) || h.ext('oc-' + ad); if (!e) return; const hh = w * e.h / e.w, shd = h.uv('shadow'), gl = h.uv('glow'); h.push({ key: y, draw(R, F) { const c = F.lit(x, y, 1); R.quad(h.T.fx, [x - w * 0.46, y - 0.7, 0.012], [x + w * 0.46, y - 0.7, 0.012], [x + w * 0.46, y + 0.5, 0.012], [x - w * 0.46, y + 0.5, 0.012], shd[0], shd[1], shd[2], shd[3], [1, 1, 1, 0.7]);
      R.quad(e.t, [x - w / 2, y, 0], [x + w / 2, y, 0], [x + w / 2, y, hh], [x - w / 2, y, hh], 0, 0, 1, 1, c); if (glow) { const k = 0.3 + Math.sin(F.time * 5) * 0.05 + F.night * 0.5; R.quad(h.T.fx, [x - w * 0.7, y - 0.03, -w * 0.25], [x + w * 0.7, y - 0.03, -w * 0.25], [x + w * 0.7, y - 0.03, w * 1.15], [x - w * 0.7, y - 0.03, w * 1.15], gl[0], gl[1], gl[2], gl[3], [0.9 * k, 0.45 * k, 0.12 * k, 1], true, 0); } } }); };
    dekor('ev', 0, YT + 2.2, 9.0); dekor('kule', 0, YC + 0.3, 3.9, true);
    /* kare işaretleri: açık karede ince köşe çizgisi (arazi çim olarak kalır), kapalı karede koyu yabani zemin */
    const tCer = R.texture(cv(128, 128, (x, w, hh2) => { x.strokeStyle = 'rgba(255,248,214,.34)'; x.lineWidth = 3; x.lineCap = 'round'; const k = 26, m = 5; for (const [a, b, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, hh2 - m, 1, -1], [w - m, hh2 - m, -1, -1]]) { x.beginPath(); x.moveTo(a + sx * k, b); x.lineTo(a, b); x.lineTo(a, b + sy * k); x.stroke(); } }));
    const tYab = R.texture(cv(64, 64, (x, w, hh2) => { const g = x.createRadialGradient(32, 32, 6, 32, 32, 46); g.addColorStop(0, 'rgba(18,44,26,.44)'); g.addColorStop(0.62, 'rgba(18,44,26,.3)'); g.addColorStop(0.92, 'rgba(18,44,26,0)'); g.addColorStop(1, 'rgba(18,44,26,0)'); x.fillStyle = g; x.fillRect(0, 0, w, hh2); }));
    const tCali = [0, 1, 2].map(v => { const c = cali(v), t = R.texture(c); return { t, w: TS * 0.98, h: TS * 0.98 * c.height / c.width }; }), tYum = R.texture(yumurta());
    const sh = h.uv('shadow'), wv = h.uv('white'), ring = h.uv('ring'), glow = h.uv('glow');
    h.push({ key: 898, draw(R, F) { const c = h.amb(F); if (!S || !S.grid) return;
      S.grid.forEach((t, i) => { const x = cx(i), y = cy(i), a = TS / 2 - 0.04; R.quad(t.open ? tCer : tYab, [x - a, y - a, 0.012], [x + a, y - a, 0.012], [x + a, y + a, 0.012], [x - a, y + a, 0.012], 0, 0, 1, 1, c, false, 1);
        if (!t.open && canClear(i)) { const k = 0.14 + Math.sin(F.time * 2.4 + i) * 0.05; R.quad(h.T.fx, [x - a, y - a, 0.014], [x + a, y - a, 0.014], [x + a, y + a, 0.014], [x - a, y + a, 0.014], wv[0], wv[1], wv[2], wv[3], [1 * k, 0.86 * k, 0.4 * k, 1], true, 0); } });
      if (kare.i >= 0 && kare.r > 0) { const i = kare.i, x = cx(i), y = cy(i), k = 0.3 + Math.sin(F.time * 4) * 0.06, rr = TS * 0.6; R.quad(h.T.fx, [x - rr, y - rr, 0.017], [x + rr, y - rr, 0.017], [x + rr, y + rr, 0.017], [x - rr, y + rr, 0.017], ring[0], ring[1], ring[2], ring[3], [1 * k, 0.9 * k, 0.6 * k, 1], true, 0); } } });
    /* her kare için dik duran şey: kapalı karede çalı öbeği (alçak, oyuncuyu örtmez), açık karede kurulu yapı; kuluçkadaki yumurtalar yapının önünde durur */
    const yeni = {}; EO2.ocakYeni = i => { yeni[i] = 1; };
    for (let i = 0; i < NX * NY; i++) { const x = cx(i), y = cy(i), it = { key: y - TS * 0.18, x, y: y - TS * 0.18, w: TS, h: 3, tall: false, cover: 1, draw(R, F) { const t = S && S.grid && S.grid[i]; if (!t) return; const a = h.nearFade(F, it.y); if (a < 0.01) return;
        if (!t.open) { const e2 = h.ext('on-cali' + (i % 3)), e3 = h.ext('on-cali' + ((i + 1) % 3)), c = h.amb(F, canClear(i) ? 1 : 0.82); c[3] = a; if (!e2) { const q = tCali[i % 3]; R.quad(q.t, [x - q.w / 2, it.y, 0], [x + q.w / 2, it.y, 0], [x + q.w / 2, it.y, q.h], [x - q.w / 2, it.y, q.h], 0, 0, 1, 1, c, false, 1); return; }
          const ciz = (e, px, py, w, m) => { const hh = w * e.h / e.w; R.quad(h.T.fx, [px - w * 0.44, py - 0.34, 0.013], [px + w * 0.44, py - 0.34, 0.013], [px + w * 0.44, py + 0.3, 0.013], [px - w * 0.44, py + 0.3, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.5 * a]); R.quad(e.t, [px - w / 2, py, 0], [px + w / 2, py, 0], [px + w / 2, py, hh], [px - w / 2, py, hh], m, 0, 1 - m, 1, c, false, 1); };
          if (e3 && i % 3 === 0) ciz(e3, x + ((i * 7) % 5 - 2) * 0.14, y + TS * 0.28, TS * 0.62, i % 2); ciz(e2, x - ((i * 3) % 5 - 2) * 0.12, it.y, TS * (0.7 + (i % 4) * 0.06), (i + 1) % 2); return; }
        if (!t.b) return; const yeniC = h.ext('on-' + t.b), eskiC = !yeniC && h.ext('oc-yapi-' + t.b), e = yeniC || eskiC || h.ext('b-' + t.b); if (!e) return; if (yeni[i] !== undefined) { yeni[i] = Math.max(0, yeni[i] - F.dt * 1.6); if (yeni[i] <= 0) delete yeni[i]; }
        const k = yeni[i] !== undefined ? 1 - yeni[i] : 1, zip = yeni[i] !== undefined ? Math.sin(k * Math.PI) * 0.5 : 0, bw = (yeniC ? GEN2[t.b] || 2.8 : eskiC ? GEN[t.b] || 3.3 : Math.min(TS * 1.28, 4.6 * e.w / e.h)) * (0.6 + 0.4 * k), bh = bw * e.h / e.w, zt = yeniC ? 0 : eskiC ? 0.015 : 0.1; it.w = bw; it.h = bh * 0.9; it.cover += ((F.coverTest(it) ? 0.3 : 1) - it.cover) * Math.min(1, F.dt * 8); const c = F.lit(x, it.y, a * it.cover);
        R.quad(h.T.fx, [x - bw * 0.46, it.y - 0.5, 0.013], [x + bw * 0.46, it.y - 0.5, 0.013], [x + bw * 0.46, it.y + 0.45, 0.013], [x - bw * 0.46, it.y + 0.45, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.6 * a * it.cover]);
        R.quad(e.t, [x - bw / 2, it.y, -bh * zt + zip], [x + bw / 2, it.y, -bh * zt + zip], [x + bw / 2, it.y, bh * (1 - zt) + zip], [x - bw / 2, it.y, bh * (1 - zt) + zip], 0, 0, 1, 1, c);
        const I = ISIK[t.b]; if (I && (yeniC || eskiC)) { const gk = (0.12 + F.night * 0.7 + Math.sin(F.time * 3.1 + i) * 0.04) * a * it.cover, gz = bh * I[3], gr = Math.max(bw, bh) * 0.55; R.quad(h.T.fx, [x - gr, it.y - 0.04, gz - gr], [x + gr, it.y - 0.04, gz - gr], [x + gr, it.y - 0.04, gz + gr], [x - gr, it.y - 0.04, gz + gr], glow[0], glow[1], glow[2], glow[3], [I[0] * gk, I[1] * gk, I[2] * gk, 1], true, 0); }
        if (t.b === 'kulucka') { const eggs = (S.eggs || []).filter(q => q.inK), n = S.grid.filter(q => q.b === 'kulucka').length || 1, ki = S.grid.slice(0, i).filter(q => q.b === 'kulucka').length; eggs.filter((q, j) => j % n === ki).slice(0, 2).forEach((q, j) => { const ex = x + (j ? 0.42 : -0.02), ez = (yeniC ? 0.36 : 0.34) + Math.sin(F.time * 2 + j) * 0.03, g2 = 0.9 + Math.sin(F.time * 3 + j) * 0.25;
            R.quad(h.T.fx, [ex - 0.8, it.y - 0.04, ez - 0.4], [ex + 0.8, it.y - 0.04, ez - 0.4], [ex + 0.8, it.y - 0.04, ez + 1.2], [ex - 0.8, it.y - 0.04, ez + 1.2], glow[0], glow[1], glow[2], glow[3], [0.9 * g2 * a, 0.5 * g2 * a, 0.15 * g2 * a, 1], true, 0);
            R.quad(tYum, [ex - 0.27, it.y - 0.05, ez], [ex + 0.27, it.y - 0.05, ez], [ex + 0.27, it.y - 0.05, ez + 0.68], [ex - 0.27, it.y - 0.05, ez + 0.68], 0, 0, 1, 1, c); }); } } }; h.push(it); }
    /* ejderhalar: gerçek boylarında, nefes alır, yürürken hafifçe sallanır */
    const gorT = new Map();   // gen renkli görünüş resimlerinin dokuları
    for (let k = 0; k < ejSlot.length; k++) { const it = { key: -99, draw(R, F) { const d = S && S.dragons ? S.dragons.filter(q => !q.dead)[k] : null, g = d && gez[d.id]; if (!g) { it.key = -99; return; } it.key = g.y; const gi = G.gorunusIm ? G.gorunusIm(d) : null; let e = null; if (gi) { e = gorT.get(gi); if (!e) { e = { t: R.texture(gi), w: gi.naturalWidth, h: gi.naturalHeight }; gorT.set(gi, e); } } else e = h.ext('dr-' + d.el + '-' + d.stage); if (!e) return;
        const w = BOY[d.stage] || 3, hh = w * e.h / e.w, a = h.nearFade(F, g.y), uyur = !!g.uyur, br = 1 + Math.sin(g.t * (uyur ? 0.8 : 1.4)) * (uyur ? 0.02 : 0.012), hop = g.sevin > 0 ? Math.abs(Math.sin(g.sevin * 9)) * 0.14 * w / 4 : g.yuru ? Math.abs(Math.sin(g.t * 6)) * 0.05 : g.is === 'train' ? Math.abs(Math.sin(g.t * 4.2)) * 0.16 : 0, c = F.lit(g.x, g.y, a), ez = uyur ? 0.62 : 1, x0 = g.x - w / 2 * g.yon, x1 = g.x + w / 2 * g.yon;
        if (a < 0.01) return; R.quad(h.T.fx, [g.x - w * 0.42, g.y - w * 0.09, 0.013], [g.x + w * 0.42, g.y - w * 0.09, 0.013], [g.x + w * 0.42, g.y + w * 0.09, 0.013], [g.x - w * 0.42, g.y + w * 0.09, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.75 * a]);
        R.quad(e.t, [x0, g.y, hop], [x1, g.y, hop], [x1, g.y, hop + hh * br * ez], [x0, g.y, hop + hh * br * ez], 0, 0, 1, 1, c); } }; h.push(it); }
    return {};
  } };

  /* ---------- karenin tepsisi: dünyanın üstünde açılır ---------- */
  const bSrc = k => EO2.ext && EO2.ext['on-' + k] ? 'assets/dunya/an/oc-' + k + '.webp' : YENI.includes(k) ? 'assets/dunya/yapi-' + k + '.webp' : B_IMG.includes(k) ? OLD + 'img/b-' + k + '.webp' : null; let grup = 0;
  /* yapının o haftaki durumu ve kapısı olduğu ekran: [durum cümlesi, ekran, düğme yazısı] */
  function durum(k) { const ds = (S.dragons || []).filter(d => !d.dead), ad = a => a.map(d => esc(d.name)).join(', '), B = BUILD[k];
    if (k === 'in') return ['Ocakta ' + ds.length + ' ejderha yaşıyor.' + (ds.filter(d => d.task && d.task.t === 'rest').length ? ' Bu hafta dinlenen: ' + ad(ds.filter(d => d.task && d.task.t === 'rest')) + '.' : ''), 'ejderhalar', 'Ahıra git'];
    if (k === 'kiler') return ['', 'canta', 'Kileri aç']; if (k === 'yuva') return ['', 'yuva', 'Yuvaya bak'];
    if (B.stat || k === 'talim') { const c = ds.filter(d => d.task && d.task.t === 'train' && (!B.stat || d.task.k === B.stat)); return [c.length ? 'Bu hafta burada çalışan: ' + ad(c) + '.' : 'Bu hafta burada çalışan yok.', 'ejderhalar', 'Emir ver']; }
    return null; }
  function icerik(i) { const t = S.grid[i];
    if (!t.open) { const c = clearCost(), ok = canClear(i); return '<div class="oc-kunye"><i class="oc-ik cali"></i><div><span class="ust">Çalılık</span><h3>' + (ok ? 'Araziyi aç' : 'Henüz ulaşılamıyor') + '</h3><p>' + (ok ? 'Dikenleri söküp taşları kenara yığarsan ocak bir kare büyür. Her yeni kare biraz daha pahalı.' : 'Bu çalılığa ulaşmak için önce yanındaki araziyi açmalısın.') + '</p></div>' + (ok ? '<button type="button" class="gbtn altin buyuk" data-clear="1" ' + (S.gold < c ? 'disabled' : '') + '>Aç<small>' + c + ' altın' + (S.gold < c ? ' · yetmiyor' : '') + '</small></button>' : '') + '</div>'; }
    if (t.b) { const B = BUILD[t.b], src = bSrc(t.b), eggs = t.b === 'kulucka' ? (S.eggs || []) : [], dr = durum(t.b); return '<div class="oc-kunye">' + (src ? '<img class="oc-ik" alt="" src="' + src + '">' : '<i class="oc-ik"></i>') + '<div><span class="ust">Kurulu yapı</span><h3>' + B.ad + '</h3><p>' + B.d + '</p>' +
        (eggs.length ? '<div class="oc-yum">' + eggs.map(e => '<button type="button" class="yum-k' + (e.inK ? ' sicak' : '') + '" data-egg="' + e.id + '" ' + (!e.inK && kuluckaFree() <= 0 ? 'disabled' : '') + '><i></i><b>' + (e.origin || 'Yumurta') + '</b><span>' + (e.inK ? 'Kuluçkada · ' + (e.w || 0) + '. hafta · çıkar' : 'Soğukta · kuluçkaya koy') + '</span></button>').join('') + '</div>' : '') + (dr && dr[0] ? '<p class="oc-durum">' + dr[0] + '</p>' : '') + '</div>' + (dr ? '<button type="button" class="gbtn altin" data-git="' + dr[1] + '">' + dr[2] + '</button>' : '') + '<button type="button" class="gbtn kor" data-demolish="1">Yık<small>' + Math.floor(B.fiyat / 2) + ' altın geri</small></button></div>'; }
    if (grup >= BUILD_GROUPS.length) grup = 0; const ks = BUILD_GROUPS[grup][1];
    return '<div class="oc-gruplar" role="tablist">' + BUILD_GROUPS.map((g, gi) => '<button type="button" role="tab" data-grup="' + gi + '" aria-selected="' + (gi === grup) + '">' + g[0] + '</button>').join('') + '</div><div class="kartlar oc-yapilar">' + ks.map((k, j) => { const B = BUILD[k], src = bSrc(k), poor = S.gold < B.fiyat; return '<button type="button" class="kartx res yapi" style="--c:#9be07a;animation-delay:' + (j * 0.04) + 's" data-build="' + k + '" ' + (poor ? 'disabled' : '') + ' title="' + esc(B.d) + '">' + (src ? '<img alt="" src="' + src + '">' : '<i class="gl arti"></i>') + '<b>' + B.ad + '</b><span>' + B.d + '</span><em class="fiyat' + (poor ? ' pahali' : '') + '">' + B.fiyat + '</em></button>'; }).join('') + '</div>'; }
  function kapat() { const w = document.getElementById('ocTepsi'); if (w) w.remove(); G.mesgul = false; }
  function ac(i) { if (i < 0 || !S.grid[i]) return; kapat(); G.mesgul = true; if (S.grid[i].open && !S.grid[i].b) grup = mahalle(i); const w = document.createElement('div'); w.id = 'ocTepsi'; w.className = 'oc-tepsi dunya'; app.appendChild(w);
    const ciz = () => { w.innerHTML = icerik(i) + '<button type="button" class="gbtn kucuk oc-kapat" data-kapat="1">Kapat</button>'; const on = (sel, fn) => w.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
      const pop = () => { if (EO2.ocakYeni) EO2.ocakYeni(i); if (EO2.audio) EO2.audio.chime(); if (G.fx) { const p = EO2.api.R.project ? EO2.api.R.project(cx(i), cy(i), 1) : null; G.fx.stars(p ? [(p[0] * 0.5 + 0.5) * app.clientWidth, (1 - (p[1] * 0.5 + 0.5)) * app.clientHeight] : null, 16, '#fff3c4'); } };
      on('[data-kapat]', kapat); on('[data-git]', b => { const e = b.dataset.git; kapat(); G.open(e); }); on('[data-grup]', b => { grup = +b.dataset.grup; ciz(); });
      on('[data-clear]', () => { const c = clearCost(); if (S.gold < c) return; S.gold -= c; S.grid[i].open = true; S.cleared++; kapat(); carp(); pop(); afterAction(); });
      on('[data-build]', b => { const k = b.dataset.build, B = BUILD[k]; if (S.gold < B.fiyat) return; S.gold -= B.fiyat; S.grid[i].b = k; chron(B.ad + ' kuruldu.'); if (k === 'kulucka') { for (const e of S.eggs) if (!e.inK && kuluckaFree() > 0) e.inK = true; toast('Bekleyen yumurtalar kuluçkaya yerleştirildi.'); } kapat(); carp(); pop(); afterAction(); });
      on('[data-demolish]', async () => { const t = S.grid[i], B = BUILD[t.b]; const ok = await G.pen({ k: 'Yıkım', t: B.ad + ' yıkılsın mı?', body: '<p>Bedelinin yarısı (' + Math.floor(B.fiyat / 2) + ' altın) geri gelir.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yık', cls: 'kor', v: true }] }); if (!ok) return; S.gold += Math.floor(B.fiyat / 2); t.b = null; kapat(); carp(); afterAction(); });
      on('[data-egg]', b => { const e = S.eggs.find(x => String(x.id) === b.dataset.egg); if (!e) return; if (e.inK) e.inK = false; else if (kuluckaFree() > 0) e.inK = true; afterAction(); ciz(); }); };
    ciz(); }
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('ocTepsi')) { e.stopPropagation(); kapat(); } }, true);

  /* ---------- bağlantılar ---------- */
  async function git() { if (!G.live) return; await onYukle(); carp(); if (EO2.api.scene() === 'ocak') { toast('Ocaktasın. Bir karenin önüne gel ve <b>E</b> ile dokun.'); return; } G.close(); EO2.api.go('ocak'); }
  EO2.ocak = { git, ac, kapat, cx, cy, TS, carp, tileAt, mahalle, YC };
  const eskiPanel = () => EO2.hooks.panel, eskiAct = () => EO2.hooks.act;
  (function bagla() { if (!EO2.hooks.panel || !EO2.hooks.act) return setTimeout(bagla, 80); const p0 = EO2.hooks.panel, a0 = EO2.hooks.act, s0 = EO2.hooks.scene;
    EO2.hooks.panel = id => { if (id === 'ocak') { if (G.live) git(); return true; } return p0(id); };
    EO2.hooks.act = act => { if (!G.live) return true; if (act.startsWith('kare:')) { ac(+act.slice(5)); return true; } if (act.startsWith('ejder:')) { const d = byId(+act.slice(6)); if (d) { UI.sel = d.id; const g = gez[d.id]; if (g) g.sevin = 1.2; if (EO2.audio) EO2.audio.chirp(); G.open('ejderhalar'); } return true; } return a0(act); };
    EO2.hooks.scene = id => { if (s0) s0(id); if (id === 'ocak') carp(); else kapat(); }; })();
})();
