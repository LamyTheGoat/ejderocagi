/* Ejder Ocağı 2.0 · Ocak: 2.5D gezilebilir arazi
   Ocak artık bir ekran değil, meydanla aynı motorda bir yerdir: arazi kareleri yerde, yapılar dik durur, ejderhalar gerçek
   boylarında dolaşır, terbiyeci aralarında yürür. Önündeki kareye E ile dokunursun; o karenin panosu (çalılık açma, yapı
   vitrini, kurulu yapının künyesi) dünyanın üstünde açılır. Ejderhaya yaklaşıp E dersen ahırda onun sayfası açılır.
   Kurallar oyunun kendisidir: clearCost/canClear, BUILD/BUILD_GROUPS fiyatları, kuluckaFree. Arazi 8 × 6 karedir (S.grid).
   Görünüş (2026-11-15 cilası): zemin lekelerle çeşitlenir (toprak, çayır, patika taşı, taş avlu), her eşya bir öbeğe ve
   toprağa bağlıdır, uzak plan çizilmiş ufuktur. Stil: css/ocak.css. */
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
  /* öbeklerin eşyaları: çizim dünyasının (düz cepheden, gündüz ışığında çizilmiş) parçaları */
  const ESYA = ['pl-kuyu', 'pl-araba', 'pl-cicek-a', 'pl-cicek-b', 'pl-cicek-c', 'pl-saksilar', 'pl-saksilar2', 'pl-sepet0', 'pl-sepet1', 'pl-ortanca0', 'pl-ortanca1', 'pl-kenar', 'mm-h-odun', 'mm-h-kova', 'fici', 'sandik', 'bank', 'saksi0', 'saksi2'];
  /* görseller: oyunun kendi yapı ve ejderha çizimleri; sahne kurulmadan önce yüklenir */
  const yukle = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let hazir = null; const onYukle = () => hazir || (hazir = (async () => { while (!EO2.api || !EO2.ext) await new Promise(r => setTimeout(r, 80));
    await Promise.all([...B_IMG.map(k => yukle(OLD + 'img/b-' + k + '.webp').then(im => { if (im) EO2.ext['b-' + k] = im; })), ...ELS.flatMap(e => STG.map(s => yukle(OLD + 'img/dr-' + e + '-' + s + '.webp').then(im => { if (im) EO2.ext['dr-' + e + '-' + s] = im; }))),
      ...['cali0', 'cali1', 'cali2', 'ev', 'kule', 'erguvan0', 'erguvan1', 'cicek0', 'cicek1', 'ys-agac0', 'ys-agac1', 'ys-cam0', 'ys-cam1', 'ys-direk', ...YENI.map(k => 'yapi-' + k)].map(k => yukle('assets/dunya/' + k + '.webp').then(im => { if (im) EO2.ext['oc-' + k] = im; })),
      ...[...YENI, 'ev', 'kule', 'cali0', 'cali1', 'cali2', 'cit'].map(k => yukle('assets/dunya/an/oc-' + k + '.webp').then(im => { if (im) EO2.ext['on-' + k] = im; })),
      ...ESYA.map(k => yukle('assets/dunya/an/' + k + '.webp').then(im => { if (im) EO2.ext['on-' + k] = im; })),
      ...['cim', 'toprak', 'tas'].map(k => yukle('assets/zemin/' + k + '.webp').then(im => { if (im) EO2.ext['zm-' + k] = im; })), yukle('assets/dunya/an/ky-cim.webp').then(im => { if (im) EO2.ext['zm-cayir'] = im; }),
      yukle('assets/bg/ocak-ufuk.webp').then(im => { if (im) EO2.ext['oc-ufuk'] = im; }),
      ...[...ELS, 'soy'].map(k => yukle('assets/ik/yum-' + k + '.webp?v=2').then(im => { if (im) EO2.ext['yum-' + k] = im; }))]);
    /* yol dokusu: toprağın karşıtlığı azaltılmış kopyası. Motor zemin kabartmasını döşeme dokusundan çıkarıp bütün zemine uygular; ham dokuda taş izleri çime de çıkıyordu. */
    const tp = EO2.ext['zm-toprak']; if (tp && EO2.doku && EO2.doku.zemin) { EO2.doku.zemin['oc-yol'] = cv(1024, 1024, (x, w) => { x.drawImage(tp, 0, 0, w, w); x.fillStyle = 'rgba(206,172,122,.62)'; x.fillRect(0, 0, w, w); }); L.zemin = ['oc-yol', 'cim', 5.2, 9.5]; } })());
  (EO2.sahneOnce = EO2.sahneOnce || {}).ocak = onYukle;   // çizimler açılışta değil, Ocak'a girilirken yüklenir (game.js goScene bekler)

  /* ---------- sahne tanımı ---------- */
  const YB = YT + 4.7;   // arka çit dedenin evinin arkasındadır; evin önü (tarh, odunluk, oturma köşesi) arazinin devamıdır
  const cikis = { id: 'cikis', x: 0, y: 0.8, r: 1.5, z: 2.4, label: 'Meydana dön', sub: 'Ocak kapısı', act: 'go:meydan' };
  const kare = { id: 'kare', x: 0, y: -50, r: 0, z: 0.4, label: '', sub: '', act: 'kare:0', i: -1 };
  const ejSlot = Array.from({ length: 14 }, (_, k) => ({ id: 'ej' + k, x: 0, y: -60, r: 0, z: 2, label: 'Yanına git', sub: '', act: 'ejder:0' }));
  /* arazinin çevresi: duvar yok; çiçekli ağaçlar, çamlar ve ulu ağaçlardan bir orman açıklığı. [çizim, x, y] */
  const AGAC = []; { const XA = -X0 + 3.4, T = ['erguvan0', 'ys-cam1', 'ys-agac1', 'erguvan1', 'ys-cam0', 'ys-agac0']; let k = 0; for (let y = 6.4; y < YB + 1; y += 5.4) { AGAC.push([T[k % 6], -XA - (k % 2) * 0.8, y]); AGAC.push([T[(k + 3) % 6], XA + (k % 2) * 0.7, y + 1.1]); k++; }
    for (const q of [[-XA + 1, YB + 1.6, 'ys-cam0'], [-11.5, YB + 2.2, 'erguvan0'], [-6.6, YB + 1.4, 'ys-agac0'], [6.8, YB + 1.6, 'ys-agac1'], [11.8, YB + 2.4, 'erguvan1'], [XA - 1, YB + 1.4, 'ys-cam1'], [-5.6, 2.6, 'ys-cam1'], [5.6, 2.6, 'ys-cam1']]) AGAC.push([q[2], q[0], q[1]]); }
  /* koru: çitin ötesinde sıra sıra ağaç; çizilmiş ufukla araziyi birbirine bağlar */
  const KORU = []; { let sd = 41; const rn2 = () => (sd = (sd * 16807) % 2147483647) / 2147483647, T = ['ys-cam0', 'ys-agac0', 'ys-cam1', 'ys-agac1', 'erguvan0', 'ys-cam0', 'ys-agac1', 'erguvan1'], sec = () => T[Math.floor(rn2() * T.length)];
    for (const row of [[YB + 5.5, 4.6], [YB + 11, 5.6], [YB + 19, 7]]) for (let x = -46; x < 46; x += row[1] * (0.75 + rn2() * 0.5)) KORU.push([sec(), x, row[0] + (rn2() - 0.5) * 2.2]);
    for (const sx of [-1, 1]) for (let y = 3; y < YB + 4; y += 4.4 + rn2() * 2) KORU.push([sec(), sx * (25 + rn2() * 4), y], [sec(), sx * (33 + rn2() * 6), y + 2]); }
  const trees = AGAC.map(t => ['bahce', t[1], t[2]]);
  /* fenerler: giriş, patika boyu, taş avlu. Her fenerin dibinde bir tutam çiçek durur */
  const lamps = [[-4.6, 3.6], [4.6, 3.6], [-1.95, 9.2], [1.95, 12.4], [-1.95, 22.6], [1.95, 25.8], [-2.1, YC + 2.1], [2.1, YC + 2.1]];
  /* öbekler: [çizim, x, y, en, ayna, çarpışma yarıçapı]. Her öbek bir işe bağlıdır ve toprağa basar: giriş solunda çiçek arabası ve
     sepetler, sağında kuyu ve kova; avluda saksılar; ara yolun uçlarında odun ve erzak; evin önünde tarh, yanında odunluk ve oturma köşesi */
  const ESYALAR = [
    ['pl-araba', -8.7, 3.5, 3.0, 0, 0.95], ['pl-sepet0', -6.2, 2.9, 1.25, 0, 0.4], ['pl-ortanca0', -13.3, 3.3, 1.35, 0, 0.4], ['pl-ortanca1', -14.6, 4.3, 1.2, 1, 0],
    ['pl-kuyu', 8.3, 3.9, 2.0, 0, 0.85], ['mm-h-kova', 6.7, 3.2, 0.85, 0, 0.3], ['pl-saksilar', 10.0, 3.2, 1.3, 0, 0.4], ['pl-ortanca1', 13.3, 3.4, 1.35, 0, 0.4], ['pl-ortanca0', 14.6, 4.4, 1.2, 1, 0],
    ['bank', -3.3, 4.75, 1.9, 0, 0], ['fici', 3.0, 4.7, 0.8, 0, 0.36], ['sandik', 3.95, 4.55, 1.05, 0, 0.45],
    ['saksi0', -2.2, YC - 2.15, 1.3, 0, 0.3], ['saksi2', 2.2, YC - 2.15, 1.3, 1, 0.3],
    ['mm-h-odun', -14.2, YC + 1.75, 1.35, 0, 0.5], ['fici', -13.05, YC + 1.7, 0.75, 0, 0.34], ['sandik', 14.1, YC + 1.75, 1.05, 0, 0.45], ['pl-sepet1', 12.8, YC + 1.65, 1.2, 0, 0.4],
    ['pl-kenar', -3.05, YT + 1.28, 3.0, 0, 0], ['pl-cicek-c', -3.05, YT + 1.4, 3.0, 0, 0], ['pl-cicek-b', -3.05, YT + 1.66, 3.0, 0, 0], ['pl-cicek-a', -3.05, YT + 1.92, 3.0, 0, 0],
    ['pl-kenar', 3.05, YT + 1.28, 3.0, 1, 0], ['pl-cicek-c', 3.05, YT + 1.4, 3.0, 1, 0], ['pl-cicek-b', 3.05, YT + 1.66, 3.0, 1, 0], ['pl-cicek-a', 3.05, YT + 1.92, 3.0, 1, 0],
    ['mm-h-odun', -6.3, YT + 2.0, 1.45, 0, 0], ['mm-h-odun', -7.65, YT + 2.05, 1.45, 1, 0], ['fici', -8.9, YT + 1.7, 0.8, 0, 0], ['mm-h-kova', -9.9, YT + 1.5, 0.8, 1, 0], ['sandik', -11.2, YT + 1.9, 1.1, 0, 0],
    ['pl-saksilar2', 6.2, YT + 1.7, 1.5, 0, 0], ['bank', 8.5, YT + 2.0, 1.9, 0, 0], ['pl-sepet1', 10.5, YT + 1.6, 1.2, 0, 0], ['pl-ortanca0', 12.2, YT + 2.0, 1.4, 0, 0], ['pl-ortanca1', -13.0, YT + 2.2, 1.4, 0, 0]];
  /* çit dipleri: ortanca ve lale tutamları (çitin iç yüzünde, yürünen alanın dışında) */
  for (let y = 6.6, k = 0; y < YB - 1; y += 2.9, k++) for (const sx of [-1, 1]) { const yy = y + (sx > 0 ? 0.9 : 0); ESYALAR.push(k % 3 === 1 ? ['pl-cicek-b', sx * (-X0 + 1.05), yy, 1.7, k % 2, 0] : ['pl-ortanca' + ((k + (sx > 0 ? 1 : 0)) % 2), sx * (-X0 + 1.0), yy, 1.25, sx > 0 ? 1 : 0, 0]); }
  const YOLLAR = [[-1.2, -4, 1.2, YT + 0.9], [X0 + 0.3, YC - 1.0, -X0 - 0.3, YC + 1.0], [-2.3, YC - 2.3, 2.3, YC + 2.3], [-5.2, YT + 0.5, 5.2, YT + 1.9]];
  const L = { id: 'ocak', name: 'Dedenin Ocağı', sub: 'Senin arazin', zemin: ['toprak', 'cim', 5.2, 9.5], flyer: true, petals: true,
    bounds: [X0 - 0.6, -X0 + 0.6, 0.6, YT + 0.4], mapRect: [-28, -8, 56, 52], paved: YOLLAR, start: { x: 0, y: 3.6, dir: 'down' }, entry: {}, signs: [],
    interact: [cikis, kare, ...ejSlot], lamps: [], braziers: [[-11.6, 4.6], [11.6, 4.6]], trees, benches: [], planters: [], stalls: [], rects: [], circles: [],
    lights: [...lamps.map(l => [l[0], l[1], 5.6, 1]), [-11.6, 4.6, 5, 1.1], [11.6, 4.6, 5, 1.1], [0, YC, 8, 1.3], [0, YT + 1.2, 6, 0.8]], embers: [[-11.6, 4.6, 1.1], [11.6, 4.6, 1.1], [0, YC - 0.4, 1.4]],
    shadows: [[1.2, YC - 1.4, 3.4, 1.5, 0.7], [1.6, YT + 2.4, 5.2, 1.5, 0.7], ...lamps.map(l => [l[0], l[1], 0.5, 0.3, 0.6]), ...ESYALAR.filter(e => e[3] > 1 && !/cicek|kenar/.test(e[0])).map(e => [e[1] + 0.25, e[2] + 0.05, e[3] * 0.62, 0.5, 0.55])],
    mini: { paved: [], blocks: [], green: [], rings: [[0, YC, 2.9]], water: [[8.3, 3.9, 0.75]], floor: '#d8bd90', bg: '#4f8848' }, npcs: [] };
  const SABIT_DAIRE = [[0, YC + 0.25, 1.75], ...lamps.map(l => [l[0], l[1], 0.2]), ...ESYALAR.filter(e => e[5] && e[2] < YT + 0.4).map(e => [e[1], e[2], e[5]])];
  L.circles.push(...SABIT_DAIRE);
  /* çarpışma: kapalı kareler ve yapılar geçilmez; arazi değiştikçe yenilenir. Mini harita aynı veriden çizilir:
     koyu zemin çalılık, açık yeşil açılmış kare, krem blok yapı, toprak rengi yollar, halka taş avlu, mavi nokta kuyu */
  function carp() { L.rects.length = 0; const S = W(); if (!S || !S.grid) return; S.grid.forEach((t, i) => { const x = cx(i), y = cy(i); if (!t.open) L.rects.push([x - TS / 2, x + TS / 2, y - TS / 2, y + TS / 2]); else if (t.b) L.rects.push([x - TS * 0.3, x + TS * 0.3, y - TS * 0.12, y + TS * 0.3]); });
    const a = TS / 2 - 0.22; L.mini.green = S.grid.map((t, i) => t.open ? [cx(i) - a, cy(i) - a, cx(i) + a, cy(i) + a] : null).filter(Boolean);
    L.mini.paved = [[-1.2, 0, 1.2, YT + 0.9], [X0, YC - 1, -X0, YC + 1], [-2.3, YC - 2.3, 2.3, YC + 2.3], [-5.2, YT + 0.5, 5.2, YT + 1.9]];
    L.mini.blocks = [...S.grid.map((t, i) => t.b ? [cx(i) - 0.95, cy(i) - 0.75, cx(i) + 0.95, cy(i) + 0.75] : null).filter(Boolean), [-0.9, YC - 0.5, 0.9, YC + 1.1], [-4.4, YT + 2.2, 4.4, YT + 4.4]]; }

  /* ---------- dokular ---------- */
  function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  let seed = 7; const rn = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cali = v => cv(256, 190, (x, w, h) => { seed = 500 + v * 131; const blob = (px, py, r, c) => { x.fillStyle = c; x.beginPath(); for (let a = 0; a < 6.3; a += 0.5) { const rr = r * (0.82 + rn() * 0.32); x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.86); } x.closePath(); x.fill(); x.lineWidth = 3; x.strokeStyle = '#24362a'; x.stroke(); };
    for (let i = 0; i < 6; i++) { x.strokeStyle = '#5a4030'; x.lineWidth = 5; x.beginPath(); const bx = 60 + rn() * 136; x.moveTo(bx, h - 4); x.quadraticCurveTo(bx + (rn() - 0.5) * 80, h - 70 - rn() * 40, bx + (rn() - 0.5) * 130, 36 + rn() * 50); x.stroke(); }
    blob(78, 128, 58, '#3f6a44'); blob(176, 122, 62, '#3a6240'); blob(128, 86, 66, '#4a7a4c'); blob(96, 100, 34, '#5c9058'); blob(160, 76, 30, '#62985c');
    for (let i = 0; i < 16; i++) { const px = 40 + rn() * 176, py = 40 + rn() * 110; x.fillStyle = '#8a3a4a'; x.beginPath(); x.arc(px, py, 3.2, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(px - 1, py - 1, 1, 0, 7); x.fill(); } });
  const yumurta = () => cv(64, 80, (x, w, h) => { const g = x.createRadialGradient(24, 26, 4, 32, 42, 40); g.addColorStop(0, '#fff8e6'); g.addColorStop(0.5, '#ffcf90'); g.addColorStop(1, '#c0683a'); x.fillStyle = g; x.beginPath(); x.ellipse(32, 44, 22, 30, 0, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = '#4a2a1a'; x.stroke(); x.fillStyle = 'rgba(160,70,40,.55)'; for (const q of [[24, 50, 5], [40, 36, 4], [36, 58, 3.5], [22, 34, 3]]) { x.beginPath(); x.arc(q[0], q[1], q[2], 0, 7); x.fill(); } });
  /* zemin lekeleri: çizilmiş zemin dokusundan (çim, toprak, çayır, taş) kesilen, kenarı elle çizilmiş gibi eğri büğrü parçalar.
     Düz kenar ve yumuşak püskürtme yok: çizim dünyasının dili keskin kenarlı boyadır. */
  function sekil(x, S, kare, k) { const P = [], n = 18; for (let i = 0; i < n; i++) { const a = i / n * 6.2832, c = Math.cos(a), s = Math.sin(a), sq = kare ? 1 / Math.pow(Math.pow(Math.abs(c), 5) + Math.pow(Math.abs(s), 5), 0.2) : 1, r = S * k * sq * (0.86 + rn() * 0.2); P.push([S / 2 + c * r, S / 2 + s * r]); }
    x.beginPath(); x.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2); for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; x.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } x.closePath(); }
  const leke = (im, S, sd, olcek, o = {}) => cv(S, S, x => { seed = sd; x.fillStyle = '#000'; sekil(x, S, o.kare, o.k || 0.42); x.fill(); if (!im) return; x.globalCompositeOperation = 'source-in'; const kp = Math.min(im.naturalWidth - 2, S * olcek), ox = rn() * (im.naturalWidth - kp), oy = rn() * (im.naturalHeight - kp); x.globalAlpha = o.a || 1; x.drawImage(im, ox, oy, kp, kp, 0, 0, S, S); x.globalAlpha = 1;
    if (o.ton) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = o.ton; x.fillRect(0, 0, S, S); } x.globalCompositeOperation = 'source-over'; if (o.ek) o.ek(x, S); });
  const puf = (renk) => cv(96, 96, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); g.addColorStop(0, renk.replace('A', '1')); g.addColorStop(0.55, renk.replace('A', '.6')); g.addColorStop(1, renk.replace('A', '0')); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  /* taş: üstten görünen yassı kaya; güney kenarında kalınlığı görünür (kamera güneyden bakar), erik rengi kenar çizgisi */
  function tas(x, px, py, rx, ry, renk) { const P = [], n = 9; for (let i = 0; i < n; i++) { const a = i / n * 6.2832 + rn() * 0.3, r = 0.8 + rn() * 0.3; P.push([px + Math.cos(a) * rx * r, py + Math.sin(a) * ry * r]); }
    const yol = dy => { x.beginPath(); x.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2 + dy); for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; x.quadraticCurveTo(p[0], p[1] + dy, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + dy); } x.closePath(); }; x.lineJoin = 'round'; x.lineWidth = Math.max(1.5, rx * 0.075); x.strokeStyle = '#4a3340';
    yol(ry * 0.22); x.fillStyle = renk[1]; x.fill(); x.stroke(); yol(0); x.fillStyle = renk[0]; x.fill(); x.stroke();
    x.save(); yol(0); x.clip(); x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(px - rx * 0.25, py - ry * 0.3, rx * 0.5, ry * 0.36, -0.3, 0, 7); x.fill(); x.restore(); }
  const TAS_RENK = [['#ddd0c0', '#a8958e'], ['#cfc4ba', '#9a8a8a'], ['#e6d8c2', '#b09a8c']];

  /* ---------- ejderhaların gezinmesi ---------- */
  const gez = {};
  /* arazinin verisi: başka bir ocakta misafirken ev sahibinin tablosu (js/ziyaret.js), değilse oyuncunun kendi kaydı.
     Misafir yalnız bakar: kare panosu açılmaz, ejderhaya dokununca eşleşme teklifi çıkar. */
  const ziy = () => !!(EO2.ziyaret && EO2.ziyaret.tablo()), W = () => (EO2.ziyaret && EO2.ziyaret.tablo()) || (typeof S === 'undefined' ? null : S);
  function bosKare() { const S = W(), o = []; S.grid.forEach((t, i) => { if (t.open && !t.b) o.push(i); }); return o.length ? o[Math.floor(Math.random() * o.length)] : -1; }
  /* ilk adım (UX denetimi, 2026-11-20): Kuluçka Ocağı yokken boş açık kareler altın köşelerle ışıldar; şeritteki "Yolu göster" terbiyeciyi en yakınına yürütür */
  const kuluckaYok = () => { const S = W(); return !ziy() && !!S && !!S.grid && !S.grid.some(t => t.b === 'kulucka') && S.grid.some(t => t.open && !t.b); };
  function yakinBos() { const S = W(), p = EO2.api && EO2.api.player; if (!S || !S.grid || !p) return -1; let en = -1, m = 1e9; S.grid.forEach((t, i) => { if (!t.open || t.b) return; const d = Math.hypot(cx(i) - p.x, cy(i) - p.y); if (d < m) { m = d; en = i; } }); return en; }
  const dokunmatik = () => matchMedia('(pointer: coarse)').matches;
  /* yol: çalılıklar ve eşyalar düz yürümeyi keser; yarım metrelik ızgarada en kısa yol aranır, görüş hattıyla birkaç ara noktaya indirilir */
  function yolBul(hx, hy) { const p = EO2.api.player, h = 0.5, r = 0.5, x0 = L.bounds[0], y0 = L.bounds[2], nx = Math.ceil((L.bounds[1] - x0) / h) + 1, ny = Math.ceil((L.bounds[3] - y0) / h) + 1;
    const serbest = (x, y) => !L.rects.some(q => x > q[0] - r && x < q[1] + r && y > q[2] - r && y < q[3] + r) && !L.circles.some(c => Math.hypot(x - c[0], y - c[1]) < c[2] + r);
    const gorur = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2); for (let s = 1; s < n; s++) if (!serbest(a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n)) return false; return true; };
    const hc = (x, y) => Math.max(0, Math.min(ny - 1, Math.round((y - y0) / h))) * nx + Math.max(0, Math.min(nx - 1, Math.round((x - x0) / h))), nok = c => [x0 + (c % nx) * h, y0 + Math.floor(c / nx) * h];
    const bas = hc(p.x, p.y), son = hc(hx, hy), onc = new Int32Array(nx * ny).fill(-1), K = [bas]; onc[bas] = bas;
    for (let q = 0; q < K.length && onc[son] < 0; q++) { const c = K[q], i = c % nx, j = (c - i) / nx; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const n = b * nx + a; if (onc[n] >= 0) continue; const [x, y] = nok(n); if (n !== son && !serbest(x, y)) continue; onc[n] = c; K.push(n); } }
    if (onc[son] < 0) return null; const P = []; for (let c = son; c !== bas; c = onc[c]) P.push(nok(c)); P.reverse(); if (!P.length) return [[hx, hy]]; P[P.length - 1] = [hx, hy];
    const Y = []; let cur = [p.x, p.y], k = -1; while (k < P.length - 1) { let en = k + 1; for (let m = P.length - 1; m > k + 1; m--) if (gorur(cur, P[m])) { en = m; break; } Y.push(P[en]); cur = P[en]; k = en; } return Y; }
  let yol = null;   // { P: ara noktalar, k: sıradaki, t: son ilerleme }
  function yolIzle() { if (!yol) return; const A = EO2.api, p = A.player, q = yol.P[yol.k], now = performance.now(), d = Math.hypot(q[0] - p.x, q[1] - p.y);
    if (d < yol.en - 0.05) { yol.en = d; yol.t = now; } if (A.scene() !== 'ocak' || now - yol.t > 2500) { yol = null; return; }      // oyuncu başka yöne yürürse ya da takılırsa rehber bırakır
    if (d < 0.35) { yol.k++; yol.t = now; if (yol.k >= yol.P.length) { yol = null; return; } yol.en = 1e9; A.walkTo(yol.P[yol.k][0], yol.P[yol.k][1]); } }
  function yolGoster() { const i = yakinBos(); if (i < 0 || !EO2.api.walkTo) return false; const P = yolBul(cx(i), cy(i)); if (!P) return false; yol = { P, k: 0, t: performance.now(), en: 1e9 }; EO2.api.walkTo(P[0][0], P[0][1]); toast(dokunmatik() ? 'Işıklı boş kareye gidiyorsun. Varınca <b>Yapı kur</b> düğmesine dokun.' : 'Işıklı boş kareye gidiyorsun. Varınca <b>E</b> ile yapı kur.'); return true; }
  /* emrin yeri: antrenman emri o yeteneğin yapısına (yoksa Talim Meydanı'na), dinlenme ine (yoksa Sıcak Kaynak'a), çift emirleri Yuva Bahçesi'ne götürür.
     Yalnız gösterimdir: emir, verim ve sonuç oyunun kendi kuralıyla hafta sonunda işlenir. */
  const IS_YAPI = { gu: 'agirlik', ce: 'parkur', da: 'kaynak', ze: 'magara' };
  function isYeri(d) { const S = W(), tk = d.task; if (!tk || !S || !S.grid) return -1; const ks = tk.t === 'train' ? [IS_YAPI[tk.k], 'talim'] : tk.t === 'rest' ? ['in', 'kaynak'] : tk.p != null ? ['yuva'] : [];
    for (const k of ks) { if (!k) continue; const yer = []; S.grid.forEach((t, i) => { if (t.b === k) yer.push(i); }); if (yer.length) return yer[Math.abs(+d.id || 0) % yer.length]; } return -1; }
  function adim(dt) { const S = W(); if (!S || !S.dragons) return; const canli = S.dragons.filter(d => !d.dead).slice(0, ejSlot.length);
    canli.forEach((d, k) => { let g = gez[d.id]; if (!g) { const i = bosKare(); g = gez[d.id] = { x: i < 0 ? 0 : cx(i) + (Math.random() - 0.5), y: i < 0 ? 3 : cy(i), tx: 0, ty: 0, bekle: 1 + Math.random() * 4, yon: 1, t: Math.random() * 9, sevin: 0 }; g.tx = g.x; g.ty = g.y; }
      g.t += dt; if (g.sevin > 0) g.sevin -= dt; const yer = isYeri(d); if (yer >= 0) { g.tx = cx(yer) + ((Math.abs(+d.id || 0) % 3) - 1) * 0.85; g.ty = cy(yer) - TS * 0.46; } g.is = yer >= 0 ? d.task.t : null;
      const dx = g.tx - g.x, dy = g.ty - g.y, m = Math.hypot(dx, dy), uyur = d.task && d.task.t === 'rest' && m <= 0.08;
      if (m > 0.08 && !uyur) { const v = (d.stage === 'yavru' ? 1.1 : 0.7) * dt; g.x += dx / m * Math.min(v, m); g.y += dy / m * Math.min(v, m); if (Math.abs(dx) > 0.05) g.yon = dx > 0 ? 1 : -1; g.yuru = true; }
      else { g.yuru = false; g.bekle -= dt; if (g.bekle <= 0 && !uyur && yer < 0) { const i = bosKare(); if (i >= 0) { g.tx = cx(i) + (Math.random() - 0.5) * 1.2; g.ty = cy(i) + (Math.random() - 0.5) * 0.8; } g.bekle = 3 + Math.random() * 7; } }
      const s = ejSlot[k], w = BOY[d.stage] || 3; s.x = g.x; s.y = g.y - 0.4; s.r = Math.max(1.7, w * 0.5); s.z = w * 0.72; s.sub = d.name; s.act = 'ejder:' + d.id; s.label = uyur ? 'Uyuyor' : g.is === 'train' && !g.yuru ? 'Çalışıyor' : 'Yanına git'; g.uyur = uyur; });
    for (let k = canli.length; k < ejSlot.length; k++) { ejSlot[k].r = 0; ejSlot[k].y = -60; } for (const id in gez) if (!canli.find(d => String(d.id) === id)) delete gez[id]; }
  /* önündeki kare: terbiyecinin bir adım ötesindeki, yoksa üstünde durduğu kare */
  const YON = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] };
  function odak() { if (ziy()) { kare.i = -1; kare.r = 0; kare.y = -50; return; } const A = EO2.api, p = A.player, v = YON[p.dir] || [0, 1]; const on = tileAt(p.x + v[0] * 1.9, p.y + v[1] * 1.9), alt = tileAt(p.x, p.y); let i = on >= 0 && (!S.grid[on].open || S.grid[on].b) ? on : alt >= 0 ? alt : on;      // önünde çalılık ya da yapı varsa o; yoksa üstünde durduğu kare
    kare.i = i; if (i < 0 || document.getElementById('ocTepsi')) { kare.r = 0; kare.y = -50; return; } const t = S.grid[i]; kare.x = cx(i); kare.y = cy(i) - (t.open && !t.b ? 0 : TS * 0.45); kare.r = TS * 1.5; kare.act = 'kare:' + i; kare.z = t.b ? 2.6 : t.open ? 0.5 : 1.5;
    if (!t.open) { const ok = canClear(i); kare.label = ok ? 'Araziyi aç' : 'Çalılık'; kare.sub = ok ? clearCost() + ' altın' : 'Önce yanındaki araziyi aç'; } else if (t.b) { kare.label = BUILD[t.b].ad; const eg = t.b === 'kulucka' ? (S.eggs || []).filter(q => q.inK).length : 0, B = BUILD[t.b], cs = (B.stat || t.b === 'talim') ? (S.dragons || []).filter(d => !d.dead && d.task && d.task.t === 'train' && (!B.stat || d.task.k === B.stat)).length : 0; kare.sub = eg ? eg + ' yumurta kuluçkada' : cs ? cs + ' ejderha çalışıyor' : 'Yapıya bak'; } else { kare.label = 'Yapı kur'; kare.sub = 'Boş arazi'; } }
  EO2.frameHooks.push(() => { if (!EO2.api || EO2.api.scene() !== 'ocak' || !G.live) return; adim(Math.min(0.05, (performance.now() - (adim.son || performance.now())) / 1000)); adim.son = performance.now(); odak(); yolIzle(); });

  let onizle = null;   // panoda seçili yapı: { i: kare, k: yapı }; karede yarı saydam durur
  D.ocak = { L, build(h) { h.addSky(); const art = h.art, R = h.R, tx = h.tx, sh = h.uv('shadow'), wv = h.uv('white'), ring = h.uv('ring'), glow = h.uv('glow');
    /* uzak plan: çizilmiş ufuk (dağlar, kule, çayır); üst kenarı göğe karışır. Motorun çizgi tepelerini örter. */
    const ufIm = (EO2.ext || {})['oc-ufuk']; if (ufIm) { const tU = R.texture(cv(ufIm.naturalWidth, ufIm.naturalHeight, (x, w, hh) => { x.drawImage(ufIm, 0, 0); x.globalCompositeOperation = 'destination-in'; const g = x.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, '#000'); x.fillStyle = g; x.fillRect(0, 0, w, hh); }), { mips: false }), UW = 330, UH = UW * ufIm.naturalHeight / ufIm.naturalWidth, uz = 3.6 - UH * 0.3;
      h.push({ key: 99990, draw(R, F) { const c = h.amb(F), mx = F.camX * 0.94; R.quad(tU, [mx - UW / 2, 148, uz], [mx + UW / 2, 148, uz], [mx + UW / 2, 148, uz + UH], [mx - UW / 2, 148, uz + UH], 0, 0, 1, 1, c, false, 0); } }); }
    /* çevre: çizim dünyasının ağaçları, fenerleri, sancakları; arazinin iki yanında ve arkasında çit, ötesinde koru */
    const agacT = ad => ad.startsWith('erguvan') ? tx.erguvan[ad.endsWith('1') ? 1 : 0] : ad.startsWith('ys-cam') ? tx.selvi : ad === 'ys-agac0' ? tx.cinar : tx.bahce[ad.endsWith('1') ? 1 : 0];
    for (const t of AGAC) h.billboard(agacT(t[0]), t[1], t[2], { sway: 0.05 });
    for (const t of KORU) h.billboard(agacT(t[0]), t[1], t[2], { sway: 0.035, fade: false, occl: false });
    for (const l of lamps) h.billboard(tx.lamp, l[0], l[1], { glowK: 1.2 });
    for (const b of L.braziers) h.billboard(tx.braz, b[0], b[1], { glowK: 1.4 });
    const tDir = h.D('direk', () => art.bannerPole(h.E, '#213270')); h.billboard(tDir, -7.4, 4.7, { ax: 0.2, sway: 0.03 }); h.billboard(tDir, 7.4, 4.7, { ax: 0.2, sway: 0.03 });
    const cit = h.ext('on-cit'); if (cit) { const ct = cit.t, cl = 4.2, chh = cl * cit.h / cit.w; ct.wm = cl; ct.hm = chh; const XK = -X0 + 1.5;
      for (let y = Y0 - 1.4; y < YB - 0.1; y += cl) { h.side(ct, -XK, y, Math.min(YB, y + cl), 'E', chh); h.side(ct, XK, y, Math.min(YB, y + cl), 'W', chh); }
      for (let x = -XK; x < XK - 0.1; x += cl) h.billboard(ct, x, YB, { ax: 0, occl: false, fade: false }); }   // önde çit yok: kamerayı kapatır; girişi fenerler ve sancaklar belirler

    /* zemin lekeleri: bir kez kurulur, her karede tek geçişte çizilir. [doku, x, y, en, boy, dönüş, alfa] */
    const E = EO2.ext || {}, zCim = E['zm-cim'], zTop = E['zm-toprak'], zCay = E['zm-cayir'], zTas = E['zm-tas'], tex = c => R.texture(c);
    const tTop = [0, 1, 2].map(v => tex(leke(zTop, 384, 900 + v * 77, 1.74, { ek(x, S) { for (let i = 0; i < 3; i++) tas(x, S * (0.3 + rn() * 0.4), S * (0.3 + rn() * 0.4), 7 + rn() * 5, 5 + rn() * 3, TAS_RENK[i % 3]); } })));
    const tCay = [0, 1, 2].map(v => tex(leke(zCay, 384, 1300 + v * 53, 1.5, { a: 0.62, ton: 'rgba(96,158,74,.4)' })));
    const tTut = [0, 1, 2].map(v => tex(leke(zCim, 192, 1700 + v * 31, 0.9, { ton: 'rgba(160,210,100,.26)' })));
    const tAcik = tex(puf('rgba(214,240,140,A)')), tKoyu = tex(puf('rgba(24,74,44,A)'));
    const tBas = [0, 1, 2].map(v => tex(cv(160, 128, x => { seed = 2100 + v * 19; tas(x, 80, 54, 58, 36, TAS_RENK[v]); x.strokeStyle = 'rgba(74,51,64,.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(60 + rn() * 30, 34); x.lineTo(70 + rn() * 30, 58 + rn() * 14); x.stroke(); x.fillStyle = 'rgba(96,150,70,.8)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(34 + rn() * 90, 76 + rn() * 12, 7 + rn() * 5, 4, 0, 0, 7); x.fill(); } })));
    /* taş avlu: çizilmiş taş döşemeden daire, çevresinde kesme taş bilezik */
    const tAvlu = tex(cv(768, 768, (x, S) => { seed = 2500; x.save(); x.beginPath(); x.arc(S / 2, S / 2, S * 0.445, 0, 7); x.clip(); if (zTas) x.drawImage(zTas, 60, 60, 860, 860, 0, 0, S, S); x.fillStyle = 'rgba(176,160,160,.22)'; x.fillRect(0, 0, S, S); x.restore();
      const n = 30, r0 = S * 0.43, r1 = S * 0.485; x.lineWidth = 3.5; x.strokeStyle = '#4a3340'; x.lineJoin = 'round'; for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832 + 0.012, a1 = (i + 1) / n * 6.2832 - 0.012; x.beginPath(); x.arc(S / 2, S / 2, r1, a0, a1); x.arc(S / 2, S / 2, r0, a1, a0, true); x.closePath(); x.fillStyle = ['#ebdfcd', '#dfd0bd', '#e6d6c6'][Math.floor(rn() * 3)]; x.fill(); x.stroke(); } }));
    const DEC = [], dk = (t, x, y, w, hh, rot, a, z) => { const c = Math.cos(rot || 0), s = Math.sin(rot || 0), q = (dx, dy) => [x + dx * c - dy * s, y + dx * s + dy * c, z || 0.0112]; DEC.push({ t, x, y, a: a === undefined ? 1 : a, p: [q(-w / 2, -hh / 2), q(w / 2, -hh / 2), q(w / 2, hh / 2), q(-w / 2, hh / 2)] }); };
    { seed = 4242; const yolda = (x, y, m = 0) => YOLLAR.some(r => x > r[0] - m && x < r[2] + m && y > r[1] - m && y < r[3] + m);
      /* 1) ton oynaması: iri açık ve koyu yeşil lekeler döşeme tekrarını kırar */
      for (let i = 0; i < 46; i++) { const x = (rn() - 0.5) * 50, y = -2 + rn() * (YB + 8), w = 4 + rn() * 6; dk(i % 2 ? tAcik : tKoyu, x, y, w, w * (0.6 + rn() * 0.4), rn() * 3, i % 2 ? 0.2 : 0.26, 0.0111); }
      /* 2) çayır: çiçekli yabani ot adaları; yolların ve karelerin dışında (giriş düzlüğü, yol kenarları, çit dışı) */
      for (let i = 0, n = 0; i < 400 && n < 30; i++) { const x = (rn() - 0.5) * 46, y = -1 + rn() * (YB + 6), ic = tileAt(x, y) >= 0; if (ic || yolda(x, y, 1.2)) continue; const w = 2.2 + rn() * 2.4; dk(tCay[n % 3], x, y, w, w * (0.7 + rn() * 0.3), rn() * 6.3, 1); n++; }
      /* 3) yol kenarı: çim tutamları patikanın düz kenarını yer yer örter; toprak yer yer çime taşar */
      const kenar = (x0, y0, x1, y1) => { const u = Math.hypot(x1 - x0, y1 - y0); for (let d = 0.6 + rn(); d < u; d += 1.1 + rn() * 1.5) { const x = x0 + (x1 - x0) * d / u + (rn() - 0.5) * 0.3, y = y0 + (y1 - y0) * d / u + (rn() - 0.5) * 0.3, w = 1.0 + rn() * 1.1; if (Math.hypot(x, y - YC) < 3.3) continue; dk(rn() < 0.72 ? tTut[Math.floor(rn() * 3)] : tTop[Math.floor(rn() * 3)], x, y, w, w * (0.6 + rn() * 0.3), rn() * 6.3, 1); } };
      kenar(-1.2, 0.2, -1.2, YT + 0.5); kenar(1.2, 0.2, 1.2, YT + 0.5); kenar(X0 + 0.3, YC - 1, -X0 - 0.3, YC - 1); kenar(X0 + 0.3, YC + 1, -X0 - 0.3, YC + 1); kenar(-5.2, YT + 0.5, -1.4, YT + 0.5); kenar(1.4, YT + 0.5, 5.2, YT + 0.5);
      /* 4) öbeklerin toprağı: araba, kuyu, odun, oturma köşesi çiğnenmiş toprağa basar */
      for (const q of [[-8.4, 3.3, 5.4, 2.6], [8.3, 3.6, 5.0, 2.6], [-3.3, 4.6, 2.8, 1.5], [3.5, 4.5, 2.6, 1.5], [-13.6, YC + 1.6, 3.2, 1.5], [13.5, YC + 1.6, 3.2, 1.5], [-8.4, YT + 1.9, 7.4, 2.4], [8.4, YT + 1.9, 6.4, 2.2], [-11.6, 4.4, 2.2, 1.5], [11.6, 4.4, 2.2, 1.5]]) dk(tTop[Math.floor(rn() * 3)], q[0], q[1], q[2], q[3], (rn() - 0.5) * 0.3, 1);
      /* 5) taş avlu ve patika taşları */
      dk(tAvlu, 0, YC, 6.1, 6.1, 0, 1, 0.0114);
      for (let y = 1.1, k = 0; y < YT + 0.7; y += 1.12, k++) { if (Math.abs(y - YC) < 3.5) continue; dk(tBas[k % 3], (k % 2 ? 0.3 : -0.3) + (rn() - 0.5) * 0.16, y, 0.74, 0.59, (rn() - 0.5) * 0.5, 1, 0.0116); }
      for (let x = X0 + 0.9, k = 0; x < -X0 - 0.6; x += 1.22, k++) { if (Math.abs(x) < 3.5) continue; dk(tBas[(k + 1) % 3], x, YC + (k % 2 ? 0.26 : -0.26) + (rn() - 0.5) * 0.14, 0.74, 0.59, (rn() - 0.5) * 0.5, 1, 0.0116); }
      for (const l of lamps) dk(tTut[Math.floor(rn() * 3)], l[0], l[1] - 0.05, 1.3, 0.8, rn() * 3, 1); }
    DEC.forEach((d, i) => { d.n = i; if (!d.t.sn) d.t.sn = i + 1; }); DEC.sort((a, b) => (a.p[0][2] - b.p[0][2]) || (a.t.sn - b.t.sn) || (a.n - b.n));   // aynı katmanda aynı doku art arda: az çizim çağrısı
    const GOLGE = [];   // sabit eşyaların temas gölgeleri: zemin geçişinde tek seferde çizilir
    h.push({ key: 899.5, draw(R, F) { const y0 = F.camY - 2, y1 = F.camY + 75; for (const d of DEC) { if (d.y < y0 || d.y > y1) continue; R.quad(d.t, d.p[0], d.p[1], d.p[2], d.p[3], 0, 0, 1, 1, F.lit(d.x, d.y, d.a), false, 1); } } });
    h.push({ key: 897, draw(R, F) { const S = W(), y0 = F.camY - 1, y1 = F.camY + 60; for (const g of GOLGE) { if (g[1] < y0 || g[1] > y1) continue; R.quad(h.T.fx, [g[0] - g[2], g[1] - g[3], 0.0135], [g[0] + g[2], g[1] - g[3], 0.0135], [g[0] + g[2], g[1] + g[3] * 0.7, 0.0135], [g[0] - g[2], g[1] + g[3] * 0.7, 0.0135], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, g[4]]); }
      if (S && S.grid) S.grid.forEach((t, i) => { if (t.open) return; const x = cx(i), y = cy(i), j = (i * 7) % 5 - 2; for (const q of [[x - 0.62 + j * 0.06, y + TS * 0.3, TS * 0.56], [x + 0.66 - j * 0.05, y + TS * 0.24, TS * 0.52], [x - ((i * 3) % 5 - 2) * 0.1, y - TS * 0.18, TS * (0.74 + (i % 4) * 0.05)]]) R.quad(h.T.fx, [q[0] - q[2] * 0.46, q[1] - 0.34, 0.0135], [q[0] + q[2] * 0.46, q[1] - 0.34, 0.0135], [q[0] + q[2] * 0.46, q[1] + 0.3, 0.0135], [q[0] - q[2] * 0.46, q[1] + 0.3, 0.0135], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.55]); }); } });

    /* dik duran öbek eşyası: dibinde temas gölgesi, kameraya yaklaşınca solar */
    const dekor = (ad, x, y, w, glowK, ayna) => { const e = h.ext('on-' + ad) || h.ext('oc-' + ad); if (!e) return; const hh = w * e.h / e.w, u0 = ayna ? 1 : 0, u1 = ayna ? 0 : 1, gd = Math.min(0.6, 0.16 + w * 0.12);
      GOLGE.push([x, y, w * 0.47, gd, 0.62]);
      h.push({ key: y, draw(R, F) { const a = h.nearFade(F, y); if (a < 0.01) return; const c = F.lit(x, y, a);
        R.quad(e.t, [x - w / 2, y, 0], [x + w / 2, y, 0], [x + w / 2, y, hh], [x - w / 2, y, hh], u0, 0, u1, 1, c); if (glowK) { const k = 0.3 + Math.sin(F.time * 5) * 0.05 + F.night * 0.5; R.quad(h.T.fx, [x - w * 0.7, y - 0.03, -w * 0.25], [x + w * 0.7, y - 0.03, -w * 0.25], [x + w * 0.7, y - 0.03, w * 1.15], [x - w * 0.7, y - 0.03, w * 1.15], glow[0], glow[1], glow[2], glow[3], [0.9 * k, 0.45 * k, 0.12 * k, 1], true, 0); } } }); };
    dekor('ev', 0, YT + 2.2, 9.0); dekor('kule', 0, YC + 0.3, 3.9, true);
    for (const e of ESYALAR) dekor(e[0], e[1], e[2], e[3], 0, e[4]);
    for (let i = 0; i < lamps.length; i++) dekor('pl-cicek-c', lamps[i][0] + (i % 2 ? 0.1 : -0.1), lamps[i][1] - 0.1, 1.15, 0, i % 2);

    /* kare zeminleri. Açık boş kare: biçilmiş, hafif açık çim ve dört köşesinde sınır taşı. Yapılı kare: çiğnenmiş toprak.
       Kapalı kare: koyu, sık yabani örtü. Kareler arasında doğal çim kalır; damalı görünmez. */
    const tBos = [0, 1].map(v => tex(cv(256, 256, (x, S) => { seed = 3100 + v * 41; sekil(x, S, true, 0.385); x.fillStyle = 'rgba(222,244,150,.17)'; x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(40,92,50,.26)'; x.stroke();
      for (const [a, b] of [[30, 34], [226, 32], [32, 226], [224, 224]]) tas(x, a + (rn() - 0.5) * 8, b + (rn() - 0.5) * 8, 10 + rn() * 4, 7 + rn() * 2, TAS_RENK[Math.floor(rn() * 3)]); })));
    const tYab = [0, 1].map(v => tex(leke(zCim, 256, 3300 + v * 67, 1.2, { kare: true, k: 0.4, ton: 'rgba(12,40,30,.56)', ek(x, S) { for (let i = 0; i < 70; i++) { const px = S * (0.12 + rn() * 0.76), py = S * (0.12 + rn() * 0.76), a = rn() * 6.3; x.fillStyle = ['#2c5636', '#3b6a42', '#234a30', '#4c7a48'][i % 4]; x.beginPath(); x.ellipse(px, py, 5 + rn() * 5, 2.4 + rn() * 1.6, a, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(84,60,44,.8)'; x.lineWidth = 2.2; x.lineCap = 'round'; for (let i = 0; i < 9; i++) { const px = S * (0.15 + rn() * 0.7), py = S * (0.15 + rn() * 0.7); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (rn() - 0.5) * 30, py + (rn() - 0.5) * 30, px + (rn() - 0.5) * 46, py + (rn() - 0.5) * 46); x.stroke(); }
      for (let i = 0; i < 4; i++) tas(x, S * (0.18 + rn() * 0.64), S * (0.18 + rn() * 0.64), 8 + rn() * 6, 6 + rn() * 3, ['#8f8a86', '#6a6a6c']); } })));
    const tPed = [0, 1, 2].map(v => tex(leke(zTop, 256, 3600 + v * 29, 2.4, { kare: true, k: 0.375, ek(x, S) { for (const [a, b] of [[40, 214], [214, 216], [128, 232]]) tas(x, a + (rn() - 0.5) * 20, b - rn() * 8, 9 + rn() * 4, 6 + rn() * 2, TAS_RENK[Math.floor(rn() * 3)]); } })));
    const tKose = tex(cv(128, 128, (x, w, hh2) => { x.strokeStyle = '#ffe9a8'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round'; const k = 24, m = 7; for (const [a, b, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, hh2 - m, 1, -1], [w - m, hh2 - m, -1, -1]]) { x.beginPath(); x.moveTo(a + sx * k, b); x.lineTo(a, b); x.lineTo(a, b + sy * k); x.stroke(); } }));
    const tCali = [0, 1, 2].map(v => { const c = cali(v), t = R.texture(c); return { t, w: TS * 0.98, h: TS * 0.98 * c.height / c.width }; }), tYum = R.texture(yumurta()), tYumE = {}; [...ELS, 'soy'].forEach(k => { const im = (EO2.ext || {})['yum-' + k]; if (im) tYumE[k] = R.texture(cv(im.naturalWidth, im.naturalHeight, x => x.drawImage(im, 0, 0))); });
    const yumDoku = q => { const m = /yum-(\w+)\.webp/.exec(G.yumurtaResim(q) || ''); return (m && tYumE[m[1]]) || tYum; };
    const KT = [...tYab, ...tPed, ...tBos];
    h.push({ key: 898, draw(R, F) { const S = W(); if (!S || !S.grid) return;
      const a = TS / 2 - 0.02; for (const tt of KT) S.grid.forEach((t, i) => { if ((!t.open ? tYab[i % 2] : t.b ? tPed[i % 3] : tBos[i % 2]) !== tt) return; const x = cx(i), y = cy(i), f = i % 2, g = (i >> 1) % 2;
        R.quad(tt, [x - a, y - a, 0.012], [x + a, y - a, 0.012], [x + a, y + a, 0.012], [x - a, y + a, 0.012], f, g, 1 - f, 1 - g, F.lit(x, y, 1), false, 1); });
      const vurgu = kuluckaYok(); S.grid.forEach((t, i) => { const x = cx(i), y = cy(i);
        if (vurgu && t.open && !t.b) { const k = 0.6 + Math.sin(F.time * 3.2 + i) * 0.3, b = a - 0.04, rr = TS * 0.62; R.quad(h.T.fx, [x - rr, y - rr, 0.0138], [x + rr, y - rr, 0.0138], [x + rr, y + rr, 0.0138], [x - rr, y + rr, 0.0138], glow[0], glow[1], glow[2], glow[3], [0.95 * k, 0.78 * k, 0.3 * k, 1], true, 0); R.quad(tKose, [x - b, y - b, 0.014], [x + b, y - b, 0.014], [x + b, y + b, 0.014], [x - b, y + b, 0.014], 0, 0, 1, 1, [1, 0.92, 0.55, k], false, 1); }
        if (!t.open && !ziy() && canClear(i)) { const k = 0.34 + Math.sin(F.time * 2.4 + i) * 0.14, b = a - 0.1; R.quad(tKose, [x - b, y - b, 0.014], [x + b, y - b, 0.014], [x + b, y + b, 0.014], [x - b, y + b, 0.014], 0, 0, 1, 1, [1, 1, 1, k], false, 1); } });
      const oi = onizle ? onizle.i : kare.i >= 0 && kare.r > 0 ? kare.i : -1; if (oi >= 0) { const x = cx(oi), y = cy(oi), k = (onizle ? 0.62 : 0.3) + Math.sin(F.time * 4) * 0.06, rr = TS * 0.6; R.quad(h.T.fx, [x - rr, y - rr, 0.017], [x + rr, y - rr, 0.017], [x + rr, y + rr, 0.017], [x - rr, y + rr, 0.017], ring[0], ring[1], ring[2], ring[3], onizle ? [0.62 * k, 0.86 * k, 1 * k, 1] : [1 * k, 0.9 * k, 0.6 * k, 1], true, 0); } } });
    /* her kare için dik duran şey: kapalı karede sık çalı öbeği (alçak, oyuncuyu örtmez), açık karede kurulu yapı; kuluçkadaki yumurtalar yapının önünde durur */
    const yeni = {}; EO2.ocakYeni = i => { yeni[i] = 1; };
    const yapiE = k => { const yeniC = h.ext('on-' + k), eskiC = !yeniC && h.ext('oc-yapi-' + k), e = yeniC || eskiC || h.ext('b-' + k); return e ? { e, yeniC, eskiC } : null; };
    for (let i = 0; i < NX * NY; i++) { const x = cx(i), y = cy(i), it = { key: y - TS * 0.18, x, y: y - TS * 0.18, w: TS, h: 3, tall: false, cover: 1, draw(R, F) { const S = W(), t = S && S.grid && S.grid[i]; if (!t) return; const a = h.nearFade(F, it.y); if (a < 0.01) return;
        if (!t.open) { const e2 = h.ext('on-cali' + (i % 3)), e3 = h.ext('on-cali' + ((i + 1) % 3)), e4 = h.ext('on-cali' + ((i + 2) % 3)), c = h.amb(F, ziy() || canClear(i) ? 1 : 0.84); c[3] = a; if (!e2) { const q = tCali[i % 3]; R.quad(q.t, [x - q.w / 2, it.y, 0], [x + q.w / 2, it.y, 0], [x + q.w / 2, it.y, q.h], [x - q.w / 2, it.y, q.h], 0, 0, 1, 1, c, false, 1); return; }
          const ciz = (e, px, py, w, m) => { const hh = w * e.h / e.w; R.quad(e.t, [px - w / 2, py, 0], [px + w / 2, py, 0], [px + w / 2, py, hh], [px - w / 2, py, hh], m, 0, 1 - m, 1, c, false, 1); };
          const j = (i * 7) % 5 - 2; if (e3) ciz(e3, x - 0.62 + j * 0.06, y + TS * 0.3, TS * 0.56, i % 2); if (e4) ciz(e4, x + 0.66 - j * 0.05, y + TS * 0.24, TS * 0.52, (i + 1) % 2); ciz(e2, x - ((i * 3) % 5 - 2) * 0.1, it.y, TS * (0.74 + (i % 4) * 0.05), (i + 1) % 2); return; }
        if (!t.b) { if (onizle && onizle.i === i && onizle.k) { const q = yapiE(onizle.k); if (q) { const e = q.e, bw = q.yeniC ? GEN2[onizle.k] || 2.8 : q.eskiC ? GEN[onizle.k] || 3.3 : Math.min(TS * 1.28, 4.6 * e.w / e.h), bh = bw * e.h / e.w, zt = q.yeniC ? 0 : q.eskiC ? 0.015 : 0.1, zz = 0.06 + Math.sin(F.time * 2.6) * 0.05, al = (0.8 + Math.sin(F.time * 2.6) * 0.08) * a, c = F.lit(x, it.y, al);
            R.quad(h.T.fx, [x - bw * 0.46, it.y - 0.5, 0.013], [x + bw * 0.46, it.y - 0.5, 0.013], [x + bw * 0.46, it.y + 0.45, 0.013], [x - bw * 0.46, it.y + 0.45, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.4 * a]);
            R.quad(e.t, [x - bw / 2, it.y, -bh * zt + zz], [x + bw / 2, it.y, -bh * zt + zz], [x + bw / 2, it.y, bh * (1 - zt) + zz], [x - bw / 2, it.y, bh * (1 - zt) + zz], 0, 0, 1, 1, [c[0] * 0.92, c[1] * 0.98, c[2] * 1.06, al]); } } return; }
        const q = yapiE(t.b); if (!q) return; const e = q.e, yeniC = q.yeniC, eskiC = q.eskiC; if (yeni[i] !== undefined) { yeni[i] = Math.max(0, yeni[i] - F.dt * 1.6); if (yeni[i] <= 0) delete yeni[i]; }
        const k = yeni[i] !== undefined ? 1 - yeni[i] : 1, zip = yeni[i] !== undefined ? Math.sin(k * Math.PI) * 0.5 : 0, bw = (yeniC ? GEN2[t.b] || 2.8 : eskiC ? GEN[t.b] || 3.3 : Math.min(TS * 1.28, 4.6 * e.w / e.h)) * (0.6 + 0.4 * k), bh = bw * e.h / e.w, zt = yeniC ? 0 : eskiC ? 0.015 : 0.1; it.w = bw; it.h = bh * 0.9; it.cover += ((F.coverTest(it) ? 0.3 : 1) - it.cover) * Math.min(1, F.dt * 8); const c = F.lit(x, it.y, a * it.cover);
        R.quad(h.T.fx, [x - bw * 0.46, it.y - 0.5, 0.013], [x + bw * 0.46, it.y - 0.5, 0.013], [x + bw * 0.46, it.y + 0.45, 0.013], [x - bw * 0.46, it.y + 0.45, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.6 * a * it.cover]);
        R.quad(e.t, [x - bw / 2, it.y, -bh * zt + zip], [x + bw / 2, it.y, -bh * zt + zip], [x + bw / 2, it.y, bh * (1 - zt) + zip], [x - bw / 2, it.y, bh * (1 - zt) + zip], 0, 0, 1, 1, c);
        const I = ISIK[t.b]; if (I && (yeniC || eskiC)) { const gk = (0.12 + F.night * 0.7 + Math.sin(F.time * 3.1 + i) * 0.04) * a * it.cover, gz = bh * I[3], gr = Math.max(bw, bh) * 0.55; R.quad(h.T.fx, [x - gr, it.y - 0.04, gz - gr], [x + gr, it.y - 0.04, gz - gr], [x + gr, it.y - 0.04, gz + gr], [x - gr, it.y - 0.04, gz + gr], glow[0], glow[1], glow[2], glow[3], [I[0] * gk, I[1] * gk, I[2] * gk, 1], true, 0); }
        if (t.b === 'kulucka') { const eggs = (S.eggs || []).filter(q => q.inK), n = S.grid.filter(q => q.b === 'kulucka').length || 1, ki = S.grid.slice(0, i).filter(q => q.b === 'kulucka').length; eggs.filter((q, j) => j % n === ki).slice(0, 2).forEach((q, j) => { const ex = x + (j ? 0.42 : -0.02), ez = (yeniC ? 0.36 : 0.34) + Math.sin(F.time * 2 + j) * 0.03, g2 = 0.9 + Math.sin(F.time * 3 + j) * 0.25;
            R.quad(h.T.fx, [ex - 0.8, it.y - 0.04, ez - 0.4], [ex + 0.8, it.y - 0.04, ez - 0.4], [ex + 0.8, it.y - 0.04, ez + 1.2], [ex - 0.8, it.y - 0.04, ez + 1.2], glow[0], glow[1], glow[2], glow[3], [0.9 * g2 * a, 0.5 * g2 * a, 0.15 * g2 * a, 1], true, 0);
            R.quad(yumDoku(q), [ex - 0.26, it.y - 0.05, ez], [ex + 0.26, it.y - 0.05, ez], [ex + 0.26, it.y - 0.05, ez + 0.69], [ex - 0.26, it.y - 0.05, ez + 0.69], 0, 0, 1, 1, c); }); } } }; h.push(it); }
    /* ejderhalar: gerçek boylarında, nefes alır, yürürken hafifçe sallanır */
    const gorT = new Map();   // gen renkli görünüş resimlerinin dokuları
    for (let k = 0; k < ejSlot.length; k++) { const it = { key: -99, draw(R, F) { const S = W(), d = S && S.dragons ? S.dragons.filter(q => !q.dead)[k] : null, g = d && gez[d.id]; if (!g) { it.key = -99; return; } it.key = g.y; const gi = G.gorunusIm && d.genes ? G.gorunusIm(d) : null; let e = null; if (gi) { e = gorT.get(gi); if (!e) { e = { t: R.texture(gi), w: gi.naturalWidth, h: gi.naturalHeight }; gorT.set(gi, e); } } else e = h.ext('dr-' + d.el + '-' + d.stage); if (!e) return;
        const w = BOY[d.stage] || 3, hh = w * e.h / e.w, a = h.nearFade(F, g.y), uyur = !!g.uyur, br = 1 + Math.sin(g.t * (uyur ? 0.8 : 1.4)) * (uyur ? 0.02 : 0.012), hop = g.sevin > 0 ? Math.abs(Math.sin(g.sevin * 9)) * 0.14 * w / 4 : g.yuru ? Math.abs(Math.sin(g.t * 6)) * 0.05 : g.is === 'train' ? Math.abs(Math.sin(g.t * 4.2)) * 0.16 : 0, c = F.lit(g.x, g.y, a), ez = uyur ? 0.62 : 1, x0 = g.x - w / 2 * g.yon, x1 = g.x + w / 2 * g.yon;
        if (a < 0.01) return; R.quad(h.T.fx, [g.x - w * 0.42, g.y - w * 0.09, 0.013], [g.x + w * 0.42, g.y - w * 0.09, 0.013], [g.x + w * 0.42, g.y + w * 0.09, 0.013], [g.x - w * 0.42, g.y + w * 0.09, 0.013], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.75 * a]);
        R.quad(e.t, [x0, g.y, hop], [x1, g.y, hop], [x1, g.y, hop + hh * br * ez], [x0, g.y, hop + hh * br * ez], 0, 0, 1, 1, c); } }; h.push(it); }
    return {};
  } };

  /* ---------- karenin panosu: dünyanın üstünde yüzer ----------
     Çalılık: açma bedeli ve şartı. Boş kare: yapı vitrini (yapılar çizimleriyle yan yana durur; seçilen yapı karede yarı saydam
     önizlenir). Kurulu yapı: künye, o haftaki durum, yumurtalar, yıkım. Fare: üstüne gel = seç, tıkla = kur. Dokunma: ilk dokunuş
     seçer, ikinci dokunuş ya da Kur düğmesi kurar. Klavye: ok tuşları seçer, Enter kurar, Esc kapatır. */
  const bSrc = k => EO2.ext && EO2.ext['on-' + k] ? 'assets/dunya/an/oc-' + k + '.webp' : YENI.includes(k) ? 'assets/dunya/yapi-' + k + '.webp' : B_IMG.includes(k) ? OLD + 'img/b-' + k + '.webp' : null; let grup = 0, secili = null;
  const MAH = ['Bakım köşesi', 'Antrenman köşesi', 'Bahçe köşesi'];
  /* yapının o haftaki durumu ve kapısı olduğu ekran: [durum cümlesi, ekran, düğme yazısı] */
  function durum(k) { const ds = (S.dragons || []).filter(d => !d.dead), ad = a => a.map(d => esc(d.name)).join(', '), B = BUILD[k];
    if (k === 'in') return ['Ocakta ' + ds.length + ' ejderha yaşıyor.' + (ds.filter(d => d.task && d.task.t === 'rest').length ? ' Bu hafta dinlenen: ' + ad(ds.filter(d => d.task && d.task.t === 'rest')) + '.' : ''), 'ejderhalar', 'Ahıra git'];
    if (k === 'kiler') return ['', 'canta', 'Kileri aç']; if (k === 'yuva') return ['', 'yuva', 'Yuvaya bak'];
    if (B.stat || k === 'talim') { const c = ds.filter(d => d.task && d.task.t === 'train' && (!B.stat || d.task.k === B.stat)); return [c.length ? 'Bu hafta burada çalışan: ' + ad(c) + '.' : 'Bu hafta burada çalışan yok.', 'ejderhalar', 'Emir ver']; }
    return null; }
  const resim = (src, cls) => '<span class="ocp-res' + (cls ? ' ' + cls : '') + '">' + (src ? '<img alt="" draggable="false" src="' + src + '">' : '') + '</span>';
  const bas = (ust, baslik, ek) => '<header class="ocp-bas"><span class="ocp-ust">' + ust + '</span><h3>' + baslik + '</h3>' + (ek || '') + '</header>';
  function icerik(i) { const t = S.grid[i];
    if (!t.open) { const c = clearCost(), ok = canClear(i), eksik = c - S.gold;
      return bas('Çalılık', ok ? 'Araziyi aç' : 'Henüz ulaşılamıyor') + '<div class="ocp-kunye">' + resim('assets/dunya/an/oc-cali' + (i % 3) + '.webp', 'yuvarlak') + '<div class="ocp-yazi"><p>' + (ok ? 'Dikenleri söküp taşları kenara yığarsan ocak bir kare büyür. Her yeni kare bir öncekinden biraz pahalıdır.' : 'Bu çalılığa yol yok. Önce ona bitişik bir kareyi aç; arazi açık karelerden dışa doğru büyür.') + '</p>' +
        (ok && eksik > 0 ? '<p class="ocp-neden">Altının yetmiyor: ' + eksik + ' altın eksik.</p>' : '') + '</div><div class="ocp-eylem">' + (ok ? '<button type="button" class="gbtn altin" data-clear="1" ' + (eksik > 0 ? 'disabled' : '') + '>Aç<small>' + c + ' altın</small></button>' : '') + '</div></div>'; }
    if (t.b) { const B = BUILD[t.b], eggs = t.b === 'kulucka' ? (S.eggs || []) : [], dr = durum(t.b), bosYer = t.b === 'kulucka' ? kuluckaFree() : 0;
      return bas('Kurulu yapı', B.ad) + '<div class="ocp-kunye">' + resim(bSrc(t.b)) + '<div class="ocp-yazi"><p>' + B.d + '</p>' + (dr && dr[0] ? '<p class="ocp-durum">' + dr[0] + '</p>' : '') +
        (t.b === 'kulucka' ? (eggs.length ? '<div class="ocp-yum">' + eggs.map(e => '<button type="button" class="ocp-yumurta' + (e.inK ? ' sicak' : '') + '" data-egg="' + e.id + '" ' + (!e.inK && bosYer <= 0 ? 'disabled' : '') + '><i class="res" style="background-image:url(' + G.yumurtaResim(e) + ')"></i><span><b>' + esc(e.origin || 'Yumurta') + '</b><small>' + (e.inK ? 'Kuluçkada · ' + (e.w || 0) + '. hafta' : 'Soğukta bekliyor') + '</small></span><em>' + (e.inK ? 'Çıkar' : bosYer > 0 ? 'Kuluçkaya koy' : 'Kuluçka dolu') + '</em></button>').join('') + '</div>' : '<p class="ocp-durum">Bekleyen yumurta yok. Yumurta gelince burada görünür.</p>') : '') + '</div>' +
        '<div class="ocp-eylem">' + (dr ? '<button type="button" class="gbtn altin" data-git="' + dr[1] + '">' + dr[2] + '</button>' : '') + '<button type="button" class="gbtn kor" data-demolish="1">Yık<small>' + Math.floor(B.fiyat / 2) + ' altın geri</small></button></div></div>'; }
    if (grup >= BUILD_GROUPS.length) grup = 0; const ks = BUILD_GROUPS[grup][1];
    return bas('Boş arazi · ' + MAH[mahalle(i)], 'Yapı kur', '<div class="ocp-grup" role="tablist" aria-label="Yapı türü">' + BUILD_GROUPS.map((g, gi) => '<button type="button" role="tab" data-grup="' + gi + '" aria-selected="' + (gi === grup) + '">' + g[0] + '</button>').join('') + '</div>') +
      '<div class="ocp-sahne"><button type="button" class="ocp-ok sol" data-kay="-1" aria-label="Önceki yapılar"></button><div class="ocp-vitrin" role="listbox" aria-label="Yapılar">' + ks.map((k, j) => { const B = BUILD[k], yok = S.gold < B.fiyat; return '<button type="button" role="option" class="ocp-yapi' + (yok ? ' yok' : '') + '" style="animation-delay:' + (j * 0.035) + 's" data-build="' + k + '"' + (yok ? ' aria-disabled="true"' : '') + '>' + resim(bSrc(k)) + '<b>' + B.ad + '</b><em class="ocp-fiyat">' + B.fiyat + '</em></button>'; }).join('') + '</div><button type="button" class="ocp-ok sag" data-kay="1" aria-label="Sonraki yapılar"></button></div>' +
      '<div class="ocp-bilgi"><div class="ocp-yazi"><b class="ocp-ad"></b><p class="ocp-acik"></p><p class="ocp-neden" hidden></p></div><button type="button" class="gbtn altin" data-kur="1">Kur<small></small></button></div>'; }
  /* ilk hafta kilidi (rehber.js): kl() kilit adımının adı ya da null; klRed(ad) kapalıysa oyuncuya söyler ve true döner */
  const kl = () => (EO2.rehber && EO2.rehber.kilit && EO2.rehber.kilit()) || null, klRed = ad => !!(EO2.rehber && EO2.rehber.kilitEngel && EO2.rehber.kilitEngel(ad));
  function kapat() { const w = document.getElementById('ocTepsi'); if (w) w.remove(); onizle = null; G.mesgul = false; }
  function ac(i) { if (i < 0 || !S.grid[i]) return; kapat(); G.mesgul = true; const bos = S.grid[i].open && !S.grid[i].b; if (bos) grup = mahalle(i); if (bos && kl() === 'a-kulucka') { const g = BUILD_GROUPS.findIndex(q => q[1].includes('kulucka')); if (g >= 0) grup = g; } const w = document.createElement('div'); w.id = 'ocTepsi'; w.className = 'ocp'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Arazi karesi'); app.appendChild(w); let sonTur = 'mouse', basta = null;
    const ciz = () => { const t = S.grid[i], yapiSec = t.open && !t.b; w.dataset.tur = !t.open ? 'cali' : t.b ? 'kunye' : 'yapi'; w.innerHTML = '<div class="ocp-perde"></div><div class="ocp-pano">' + icerik(i) + '<button type="button" class="ocp-x" data-kapat="1" aria-label="Kapat"></button></div>';
      const on = (sel, fn) => w.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
      const pop = () => { if (EO2.ocakYeni) EO2.ocakYeni(i); if (EO2.audio) EO2.audio.chime(); if (G.fx) { const p = EO2.api.R.project ? EO2.api.R.project(cx(i), cy(i), 1) : null; G.fx.stars(p ? [(p[0] * 0.5 + 0.5) * app.clientWidth, (1 - (p[1] * 0.5 + 0.5)) * app.clientHeight] : null, 16, '#fff3c4'); } };
      on('[data-kapat]', kapat); on('.ocp-perde', kapat); on('[data-git]', b => { const e = b.dataset.git; kapat(); G.open(e); }); on('[data-grup]', b => { grup = +b.dataset.grup; secili = null; ciz(); });
      on('[data-clear]', () => { if (kl() && !(kl() === 'a-kulucka' && !S.grid.some(q => q.open && !q.b)) && klRed('arazi')) return; const c = clearCost(); if (S.gold < c) return; S.gold -= c; S.grid[i].open = true; S.cleared++; kapat(); carp(); pop(); afterAction(); });
      on('[data-demolish]', async () => { if (klRed('yik')) return; const t = S.grid[i], B = BUILD[t.b]; const ok = await G.pen({ k: 'Yıkım', t: B.ad + ' yıkılsın mı?', body: '<p>Bedelinin yarısı (' + Math.floor(B.fiyat / 2) + ' altın) geri gelir.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yık', cls: 'kor', v: true }] }); if (!ok) return; S.gold += Math.floor(B.fiyat / 2); t.b = null; kapat(); carp(); afterAction(); });
      on('[data-egg]', b => { const e = S.eggs.find(x => String(x.id) === b.dataset.egg); if (!e) return; if (!e.inK && EO2.ocakDefteri && EO2.ocakDefteri.kilitli && EO2.ocakDefteri.kilitli(e)) { toast((e.ilanda === 'takas' ? 'Bu yumurta süren bir takasta' : 'Bu yumurta Bedesten\'de ilanda') + '; kuluçkaya konamaz.', 'kotu'); return; } if (e.inK && klRed('yumurta-cikar')) return; if (e.inK) e.inK = false; else if (kuluckaFree() > 0) e.inK = true; afterAction(); ciz(); });
      if (!yapiSec) { onizle = null; return; }
      /* yapı vitrini */
      const vit = w.querySelector('.ocp-vitrin'), kalem = [...vit.querySelectorAll('.ocp-yapi')], ks = kalem.map(b => b.dataset.build), kurB = w.querySelector('[data-kur]'), nd = w.querySelector('.ocp-neden');
      const sec = (k, kaydir) => { if (kl() === 'a-kulucka' && ks.includes('kulucka')) k = 'kulucka';   /* kilitte seçim hep kurulabilen yapıda kalır */ secili = k; onizle = { i, k }; const B = BUILD[k], eksik = B.fiyat - S.gold; kalem.forEach(b => { const s = b.dataset.build === k; b.classList.toggle('sec', s); b.setAttribute('aria-selected', s); if (s && kaydir) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
        w.querySelector('.ocp-ad').textContent = B.ad; w.querySelector('.ocp-acik').textContent = B.d; nd.hidden = eksik <= 0; nd.textContent = eksik > 0 ? 'Altının yetmiyor: ' + eksik + ' altın eksik.' : ''; kurB.disabled = eksik > 0; kurB.querySelector('small').textContent = B.fiyat + ' altın'; };
      const kur = k => { const B = BUILD[k]; if (!B) return; if (klRed('kur:' + k)) return; if (S.gold < B.fiyat) { sec(k, true); nd.classList.remove('salla'); void nd.offsetWidth; nd.classList.add('salla'); return; } S.gold -= B.fiyat; S.grid[i].b = k; chron(B.ad + ' kuruldu.'); if (k === 'kulucka') { for (const e of S.eggs) if (!e.inK && kuluckaFree() > 0) e.inK = true; toast('Bekleyen yumurtalar kuluçkaya yerleştirildi.'); } kapat(); carp(); pop(); afterAction(); };
      kalem.forEach(b => { const k = b.dataset.build; b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') sec(k); }); b.addEventListener('pointerdown', e => { sonTur = e.pointerType || 'mouse'; basta = secili; }); b.addEventListener('focus', () => { if (secili !== k) sec(k); });
        b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); if (sonTur !== 'mouse' && sonTur !== 'key' && basta !== k) { sec(k, true); return; } kur(k); }); });
      kurB.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); kur(secili); });
      const oklar = () => { const tas = vit.scrollWidth > vit.clientWidth + 4; w.querySelectorAll('.ocp-ok').forEach(o => { o.hidden = !tas; o.disabled = +o.dataset.kay < 0 ? vit.scrollLeft < 4 : vit.scrollLeft > vit.scrollWidth - vit.clientWidth - 4; }); };
      on('[data-kay]', b => vit.scrollBy({ left: +b.dataset.kay * vit.clientWidth * 0.7, behavior: 'smooth' })); vit.addEventListener('scroll', oklar, { passive: true }); vit.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { vit.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false }); setTimeout(oklar, 60);
      w.onkeydown = e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { if (e.key === 'Enter') sonTur = 'key'; return; } e.preventDefault(); e.stopPropagation(); const j = Math.max(0, Math.min(ks.length - 1, ks.indexOf(secili) + (e.key === 'ArrowRight' ? 1 : -1))); sonTur = 'key'; kalem[j].focus({ preventScroll: true }); sec(ks[j], true); };
      if (kl()) kalem.forEach(b => b.classList.toggle('kilitli', !(kl() === 'a-kulucka' && b.dataset.build === 'kulucka')));
      sec(kl() === 'a-kulucka' && ks.includes('kulucka') ? 'kulucka' : ks.includes(secili) ? secili : ks.find(k => S.gold >= BUILD[k].fiyat) || ks[0], kl() === 'a-kulucka'); };
    secili = null; ciz(); }
  addEventListener('keydown', e => { const w = document.getElementById('ocTepsi'); if (!w) return; if (e.key === 'Escape') { e.stopPropagation(); kapat(); } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') && w.dataset.tur === 'yapi' && !w.contains(document.activeElement)) { const b = w.querySelector('.ocp-yapi.sec'); if (b) { e.stopPropagation(); e.preventDefault(); b.focus({ preventScroll: true }); if (e.key !== 'Enter') w.onkeydown(e); } } }, true);

  /* ---------- bağlantılar ---------- */
  async function git() { if (!G.live) return; if (ziy()) { toast('Başka bir ocakta misafirsin. Kapıdan çıkınca kendi ocağına dönebilirsin.'); return; } await onYukle(); carp(); if (EO2.api.scene() === 'ocak') { toast(dokunmatik() ? 'Ocaktasın. Bir karenin önüne gel, beliren düğmeye dokun.' : 'Ocaktasın. Bir karenin önüne gel ve <b>E</b> ile dokun.'); return; } G.close(); EO2.api.go('ocak'); }
  /* öğretici şeridindeki "Yolu göster": ocaktaysa terbiyeciyi en yakın boş kareye yürütür, değilse ocağa götürüp sonra yürütür */
  async function yolaCik() { if (!G.live) return; if (ziy() || !kuluckaYok()) return git(); await onYukle(); carp(); if (EO2.api.scene() === 'ocak') { G.close(); if (!yolGoster()) git(); return; } yolIste = true; G.close(); EO2.api.go('ocak'); }
  let yolIste = false;   // ocağa başka yerden gelindiyse sahne kurulunca yol gösterilir
  EO2.ocak = { git, yolaCik, ac, kapat, cx, cy, TS, carp, tileAt, mahalle, YC, L };
  (function bagla() { if (!EO2.hooks.panel || !EO2.hooks.act) return setTimeout(bagla, 80); const p0 = EO2.hooks.panel, a0 = EO2.hooks.act, s0 = EO2.hooks.scene;
    EO2.hooks.panel = id => { if (id === 'ocak') { if (G.live) git(); return true; } return p0(id); };
    EO2.hooks.act = act => { if (!G.live) return true; if (ziy() && (act.startsWith('kare:') || act.startsWith('ejder:'))) { if (act.startsWith('ejder:')) EO2.ziyaret.ejder(act.slice(6)); return true; } if (act.startsWith('kare:')) { ac(+act.slice(5)); return true; } if (act.startsWith('ejder:')) { const d = byId(+act.slice(6)); if (d) { UI.sel = d.id; const g = gez[d.id]; if (g) g.sevin = 1.2; if (EO2.audio) EO2.audio.chirp(); G.open('ejderhalar'); } return true; } return a0(act); };
    EO2.hooks.scene = id => { if (s0) s0(id); if (id === 'ocak') { carp(); if (yolIste) { yolIste = false; setTimeout(() => { if (EO2.api.scene() === 'ocak' && kuluckaYok()) yolGoster(); }, 700); } } else { yolIste = false; kapat(); } }; })();
})();
