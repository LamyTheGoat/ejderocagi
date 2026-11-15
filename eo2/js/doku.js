/* Ejder Ocağı 2.0 · çizim dünyası: çizgi dünyanın dokuları yerine aynı yere oturan çizilmiş (anime) dokular
   Kural: yerleşim, ölçü ve perspektif çizgi dünyayla aynıdır; motor cepheyi ve yan duvarı gerçek geometriye giydirir.
   Bu yüzden her çizim TAM KARŞIDAN (ortografik) çizilir; 3/4 açılı ya da kendi ışığı ve gölgesi olan çizim kullanılmaz
   (2026-11-11'de reddedilen "boyalı dünya" denemesinin dersi). Dosyalar: assets/dunya/an/<ad>.webp, canlı düz zeminde çizilir,
   tools/anahtar.mjs ile kesilir (yarı saydam piksel oranı %6'nın altında olmalı).
   Çizimi olmayan parça çizgi haliyle kalır. Menü → Dünya çizimi ile çizgi dünyaya dönülür. */
(function () {
  'use strict';
  const EO2 = window.EO2;
  /* ad → en (birim, yoksa çizgi dokunun eni), dx (yatay kayma), kat: katmanlı cephe [saçak, kat çizgisi (üstten oran), çıkma (m), çatı derinliği (m)], cam: pencere ışığı gece yansın mı, isik: [x oranı, y oranı (üstten), yarıçap oranı] elle ışık */
  const OLCU = {
    han: { w: 11.4, dx: -0.72, cam: 1, kab: 1, relK: 0.45, kat: [0.115, 0.56, 0.32, 2.6] }, 'han-yan': { h: 9.0, cam: 1, kab: 1, relK: 0.6 }, bedesten: { w: 10, isik: [[0.21, 0.6, 0.17], [0.5, 0.6, 0.17], [0.79, 0.6, 0.17]], gk: 0.7 }, 'bedesten-yan': { h: 5.9, cam: 1 },
    kapi: { w: 31, kab: 1 }, arena: { w: 7, cam: 1 }, 'arena-yan': { h: 7.3 },
    'ev-a': { w: 5.9, dx: -0.25, cam: 1, kab: 1, relK: 0.5, kat: [0.2, 0.5, 0.3, 2.2] }, 'ev-a-yan': { h: 7.5, cam: 1 }, 'ev-b': { w: 5.9, dx: -0.25, cam: 1, kat: [0.19, 0.52, 0.3, 2.2] }, 'ev-b-yan': { h: 7.8, cam: 1 },
    bahce: { w: 6.4 }, alcak: { h: 1.6 }, 'sur-b': { h: 4.6, kab: 1 }, 'sur-d': { h: 4.6, kab: 1 },
    cinar: { w: 7.6 }, erguvan0: { w: 4.8 }, erguvan1: { w: 4.8 }, erguvan2: { w: 4.8 }, erguvan3: { w: 4.6 }, erguvan4: { w: 4.8 }, selvi: { w: 2.2 }, 'bahce-agac0': { w: 4.2 }, 'bahce-agac1': { w: 4.2 },
    fener: { w: 0.64, isik: [[0.5, 0.115, 0.9]], gk: 1.2 }, bank: { w: 2.1 }, saksi0: { w: 1.9 }, saksi1: { w: 1.9 }, saksi2: { w: 1.9 }, saksi3: { w: 1.9 },
    tezgah0: { w: 3.0, isik: [[0.1, 0.4, 0.2], [0.9, 0.4, 0.2]] }, tezgah1: { w: 3.0, isik: [[0.18, 0.33, 0.2], [0.84, 0.33, 0.2]] }, tezgah2: { w: 3.0, isik: [[0.1, 0.42, 0.2], [0.92, 0.42, 0.2]] },
    fici: { w: 0.85 }, sandik: { w: 1.5 }, direk: { w: 1.15, dx: -0.345 }, mangal: { w: 0.95, isik: [[0.5, 0.18, 1.1]] },
    /* iç mekânlar: duvarlar çizgi duvarın ölçüsünde; eşyalar */
    'ic-han-arka': { h: 7.2, isik: [[0.5, 0.72, 0.1]], kab: 1, relK: 0.9, lp: [0.5, 0.74, 0.62, 1], derin: 0.3 }, 'ic-han-yan': { h: 7.2, kab: 1, relK: 0.9, derin: 0.22 }, 'ic-pazar-arka': { h: 7.2, kab: 1, relK: 0.7, derin: 0.34 }, 'ic-pazar-yan': { h: 7.2, kab: 1, relK: 0.7, derin: 0.34 }, 'ic-arena-arka': { kab: 1 }, 'ic-arena-yan': { h: 8, kab: 1 },
    /* Pilot Meydan (js/pilot.js): han seçenekleri (sundurma önde: çıkma eksi), çeşme, tarh, basamak */
    'pl-han-b': { w: 11.8, kab: 1, relK: 0.5, derin: 0.2, kat: [0.36, 0.66, -0.75, 2.4], lp: [0.5, 0.82, 0.5, 0.6] }, 'pl-han-c': { w: 11.4, kab: 1, relK: 0.35, derin: 0.16, kat: [0.44, 0.72, -0.6, 2.2], lp: [0.5, 0.84, 0.5, 0.6] }, 'pl-cesme': { w: 5.0 }, 'pl-tarh': { w: 3.2 }, 'pl-onplan0': { w: 3.0 }, 'pl-onplan1': { w: 3.4 }, 'pl-sancak': { w: 1.5, dx: -0.45 }, 'pl-cesme2': { w: 5.6, heykel: [0.3, 0, 0.7, 0.55], hw: 2.3 }, 'pl-masa-ust': {}, 'pl-tabure-ust': {}, 'pl-cicek-ust': {},
    'pl-han-d': { w: 11.9, kab: 1, relK: 0.45, derin: 0.2, kat: [0.34, 0.66, -0.7, 2.4], lp: [0.5, 0.84, 0.5, 0.6] }, 'pl-han-d-yan': { w: 6.1, kab: 1, relK: 0.45 }, 'pl-tabela': { w: 2.1 }, 'pl-kenar': {}, 'pl-cicek-a': {}, 'pl-cicek-b': {}, 'pl-cicek-c': {}, 'pl-ortanca0': { w: 1.9 }, 'pl-ortanca1': { w: 1.7 }, 'pl-ortanca2': { w: 1.8 }, 'pl-saksilar2': { w: 2.0 }, 'pl-saksilar3': { w: 1.9 }, 'pl-su': {}, 'pa-han': {}, 'pa-kapi': {}, 'pa-sur': {}, 'pa-tez0': {}, 'pa-tez1': {}, 'pa-ev': {}, 'pa-fener': {}, 'pa-sancak': {}, 'pa-bank': {}, 'pa-masa': {}, 'pa-erguvan': {}, 'pa-agac': {}, 'pa-fici': {}, 'pa-tarh': {}, 'pa-kutu': {}, 'pa-korkuluk': {}, 'pa-uzak': {}, 'pa-kapi2': {}, 'pl3-cesme-c': {}, 'pl3-cesme-d': {}, 'pl-sancak2': { w: 1.05 }, 'pl3-cesme': {}, 'pl3-cesme-b': {}, 'pl3-masa0': {}, 'pl3-masa1': {}, 'pl3-bank': {}, 'pl3-tarh0': {}, 'pl3-tarh1': {}, 'pl3-saksi0': {}, 'pl3-saksi1': {}, 'pl3-saksi2': {}, 'pl-havuz-duvar': {}, 'pl-araba': { w: 3.3 }, 'pl-kuyu': { w: 2.3 }, 'pl-bayrak': { w: 7 }, 'pl-aski': { w: 0.95 }, 'pl-saksilar': { w: 1.9 }, 'pl-sepet0': { w: 1.9 }, 'pl-sepet1': { w: 2.0 }, 'pl-basamak': { w: 5.6, kab: 1 },
    'hali-yolluk': {}, 'hali-kilim': {},   /* yere serilen halılar (üstten çizim) */
    'ic-masa': { w: 3.0 }, 'ic-sayac': { w: 3.8 }, 'ic-sergi0': { w: 1.9 }, 'ic-sergi1': { w: 1.9 }, 'ic-sergi2': { w: 1.9 }, 'ic-sergi3': { w: 1.9 }, 'ic-hedef': { w: 1.7 }, 'ic-toprafi': { w: 3.0 },
  };
  const yukle = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  /* gece ışığı: pencere camı (koyu lacivert) sıcak sarı yanar; elle verilen noktalar yuvarlak ışık olur */
  function isikOf(im, o) {
    if (!o.cam && !o.isik) return null; const k = Math.min(1, 512 / im.naturalWidth), c = document.createElement('canvas'); c.width = Math.max(8, Math.round(im.naturalWidth * k)); c.height = Math.max(8, Math.round(im.naturalHeight * k));
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, c.width, c.height); const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], cam = o.cam && d[i + 3] > 200 && b > r + 10 && b >= g - 4 && Math.max(r, g, b) < 130 && Math.max(r, g, b) > 34; if (cam) { d[i] = 255; d[i + 1] = 196; d[i + 2] = 104; d[i + 3] = 150; } else d[i + 3] = 0; }
    x.putImageData(id, 0, 0);
    for (const [ux, uy, ur] of o.isik || []) { const r = ur * c.width, g = x.createRadialGradient(ux * c.width, uy * c.height, 0, ux * c.width, uy * c.height, r); g.addColorStop(0, 'rgba(255,214,130,.95)'); g.addColorStop(0.35, 'rgba(255,180,90,.5)'); g.addColorStop(1, 'rgba(255,160,70,0)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); }
    return c;
  }
  /* kabartma haritası: resmin aydınlığından yükseklik (koyu çizgi ve derz çukur, açık yüzey tümsek), yükseklikten eğim.
     R, G = eğim (x, y), B = yükseklik. Çizim değişmez; harita yalnız ışık ve derinlik kayması için kullanılır. */
  function kabartmaOf(im) { const k = Math.min(1, 1024 / im.naturalWidth), W = Math.max(8, Math.round(im.naturalWidth * k)), H = Math.max(8, Math.round(im.naturalHeight * k)), c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, W, H); const id = x.getImageData(0, 0, W, H), d = id.data, N = W * H, lum = new Float32Array(N), a = new Float32Array(N), b = new Float32Array(N);
    for (let i = 0; i < N; i++) lum[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
    /* kutu bulanıklığı (ayrık, r yarıçap) */
    const bulan = (src, dst, r) => { const t = new Float32Array(N); for (let y = 0; y < H; y++) { let sum = 0, n = 0; for (let X = -r; X <= r; X++) if (X >= 0 && X < W) { sum += src[y * W + X]; n++; } for (let X = 0; X < W; X++) { t[y * W + X] = sum / n; const o = X - r, e = X + r + 1; if (o >= 0) { sum -= src[y * W + o]; n--; } if (e < W) { sum += src[y * W + e]; n++; } } }
      for (let X = 0; X < W; X++) { let sum = 0, n = 0; for (let y = -r; y <= r; y++) if (y >= 0 && y < H) { sum += t[y * W + X]; n++; } for (let y = 0; y < H; y++) { dst[y * W + X] = sum / n; const o = y - r, e = y + r + 1; if (o >= 0) { sum -= t[o * W + X]; n--; } if (e < H) { sum += t[e * W + X]; n++; } } } };
    /* yükseklik: çevresinden belirgin koyu olan yer (kenar çizgisi, derz) çukurdur; geniş koyu bölgeler (raf içi, pencere camı, kapı boşluğu) hafif girintidir.
       Düz renkli yüzey, parlak pencere ya da desen rengi kabartma üretmez: v1'de aydınlıktan türetilen harita sıvayı ve kilimi de kabartıyordu. */
    bulan(lum, a, 7); for (let i = 0; i < N; i++) b[i] = Math.min(1, Math.max(0, (a[i] - lum[i] - 0.05) * 3.6) + Math.max(0, 0.26 - a[i]) * 1.5);
    bulan(b, a, 1); bulan(a, b, 1); for (let i = 0; i < N; i++) a[i] = 1 - Math.min(1, b[i]);
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const i = y * W + X, l = a[y * W + Math.max(0, X - 1)], r = a[y * W + Math.min(W - 1, X + 1)], u = a[Math.max(0, y - 1) * W + X], dn = a[Math.min(H - 1, y + 1) * W + X];
      const nx = Math.max(-1, Math.min(1, (l - r) * 2.6)), ny = Math.max(-1, Math.min(1, (dn - u) * 2.6)); d[i * 4] = Math.round((nx * 0.5 + 0.5) * 255); d[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255); d[i * 4 + 2] = Math.round(a[i] * 255); d[i * 4 + 3] = 255; }
    x.putImageData(id, 0, 0); return c; }
  const K = EO2.doku = { im: {}, isik: {}, kab: {}, kabT: {}, olcu: OLCU, hazir: false, tam: false };
  let secim = null; try { secim = localStorage.getItem('eo2.meydan3'); } catch (e) { /* gizli pencere */ }
  /* zemin dokuları: assets/zemin/<ad>.webp (üstten, kenardan kenara çizilmiş; motor aynalı döşer) */
  K.zemin = {}; for (const ad of ['tas', 'tas2', 'tas3', 'tas4', 'tas5', 'cim', 'ahsap', 'kum', 'toprak']) yukle('assets/zemin/' + ad + '.webp').then(im => { if (im) K.zemin[ad] = im; });
  /* bölüm çizimleri: bölüm motoru (js/bolum.js) kendi çizimlerini adlarıyla ister; yüklü olan yeniden yüklenmez */
  K.ekle = (adlar, klasor) => Promise.all((adlar || []).filter(ad => ad && !K.im[ad]).map(ad => yukle((klasor || 'assets/dunya/an/') + ad + '.webp').then(im => { if (im) K.im[ad] = im; return [ad, !!im]; })));
  K.yuklendi = Promise.all(Object.keys(OLCU).map(ad => yukle('assets/dunya/an/' + ad + '.webp').then(im => { if (im) { K.im[ad] = im; const g = isikOf(im, OLCU[ad]); if (g) K.isik[ad] = g; if (OLCU[ad].kab) K.kab[ad] = kabartmaOf(im); } return !!im; }))).then(r => {
    K.hazir = r.some(Boolean); K.tam = r.every(Boolean); K.eksik = Object.keys(OLCU).filter((ad, i) => !r[i]);
    if (!secim) EO2.meydanUslup = K.hazir ? 'cizim' : 'duz';
    /* renk süzgeci: sahnenin üstünde, arayüzün altında; ortası sıcak altın, kenarı mor gölge (referanstaki akşamüstü ışığı) */
    const cv = document.getElementById('world'); if (cv && EO2.meydanUslup === 'cizim' && !document.getElementById('isikSuzgeci')) { const d = document.createElement('div'); d.id = 'isikSuzgeci'; d.setAttribute('aria-hidden', 'true'); cv.insertAdjacentElement('afterend', d); } });
  if (secim) EO2.meydanUslup = secim;
  EO2.meydanSec = u => { EO2.meydanUslup = u; try { localStorage.setItem('eo2.meydan3', u); } catch (e) { /* gizli pencere */ } };
})();
