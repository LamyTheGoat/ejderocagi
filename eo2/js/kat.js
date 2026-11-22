/* Ejder Ocağı 2.0 · Kat kurucusu (window.EO2_KAT_KUR, oyunda EO2.kat) · 2026-11-22
   Karakteri katalogdan (assets/kat/katalog.js) kurar: gövde (zırh seti) + başa bağlı parçalar (saç, yüz, kulak; sonra başlık, yüz aksesuarı).
   Çıktı eski kurucuyla (js/gorunum.js) aynı biçimdeki 53 karelik karakter sayfasıdır; oyun onu EO2.setEkle ile kaydeder.
   - Parça başına tek dosya, yön başına birkaç hücre. Hücre seçimi: yürüyüş karesi → <yön>_yuru (yoksa <yön>_durus, iz kadar kaydırılmış);
     sevinç karesi → <yön>_sevinc (yoksa duruş); öteki kareler → <yön>_durus.
   - Saç rengi oyunda boyanır: gri ana çizim + rampa satırı (bir kez, parça başına küçük bir tuval). "Özgün" renk: stilin renkli sayfası.
   - Katman sırası ve gizleme katalogdadır (sira, siraYon, gizler). Kodda katman adı sıralanmaz.
   Sayfa bağımsızdır: oyunda da Kat vitrininde de (eo2/tools/kat_vitrini.html) aynı dosya çalışır. Resimler window.EO2_KAT_KOK altından istenir (varsayılan 'assets/').
   Geri alma: localStorage eo2.kat = '0' → js/gorunum.js eski kurucuya döner. */
(function () {
  'use strict';
  const K = window.EO2_KAT, GA = window.EO2_GORUNUS, AT = window.EO2_ATLAS;
  if (!K || !GA || !AT) return;
  const kok = () => window.EO2_KAT_KOK || 'assets/';
  const resimler = new Map();
  const resim = yol => { if (!resimler.has(yol)) resimler.set(yol, new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => { resimler.delete(yol); no(new Error(yol + ' yüklenemedi')); }; i.src = kok() + yol; })); return resimler.get(yol); };
  const tuval = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* ---------- renk rampası: gri ana çizimin her tonu, rampa satırındaki renge çevrilir ---------- */
  let rampaSoz = null;
  const rampa = () => rampaSoz || (rampaSoz = resim(K.rampa.dosya).then(im => { const c = tuval(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height); }));
  const boyali = new Map();
  function boya(dosya, satirAd) {
    const anahtar = dosya + '|' + satirAd; if (boyali.has(anahtar)) return boyali.get(anahtar);
    const satir = K.rampa.satir[satirAd];
    const soz = Promise.all([resim(dosya), rampa()]).then(([im, R]) => { const c = tuval(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0); if (satir == null) return c;
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data, r = R.data, o = satir * R.width * 4;
      for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const j = o + p[i] * 4; p[i] = r[j]; p[i + 1] = r[j + 1]; p[i + 2] = r[j + 2]; }
      x.putImageData(d, 0, 0); return c; });
    boyali.set(anahtar, soz); soz.catch(() => boyali.delete(anahtar)); return soz;
  }

  /* ---------- hücre seçimi ---------- */
  function hucre(key, sab, liste) {
    const p = key.split('_'), yon = p[0], tur = p[1], L = liste || sab.hucre, durus = L.indexOf(yon + '_durus');
    const istenen = tur === 'walk' ? yon + '_yuru' : tur === 'happy' ? yon + '_sevinc' : yon + '_durus', i = L.indexOf(istenen);
    if (i >= 0) return { i, dx: 0, dy: 0 };
    if (durus < 0) return null;
    const iz = tur === 'walk' && K.iz[yon] ? K.iz[yon] : [0, 0]; return { i: durus, dx: iz[0], dy: iz[1] };
  }

  /* ---------- seçilen görünüşün katmanları ---------- */
  function katmanlar(set, g) {
    const L = [], sac = K.sac[g.sac], sr = K.sacRenk[g.sacRenk], goz = K.goz[g.goz], gr = K.gozRenk[g.gozRenk];
    L.push(resim(K.govde.dosya(set)).then(img => ({ katman: 'govde', img, govde: GA.govde[set] })));
    if (sac) { const rAd = sr && sr.rampa, s = rAd ? boya(sac.dosya, rAd) : resim(sac.ozgun || sac.dosya);   /* Özgün renk: stilin kendi renkli sayfası */ sac.parca.forEach((kt, pi) => L.push(s.then(img => ({ katman: kt, img, sab: K.sablon.sac, satir: pi, liste: sac.hucre, gizler: sac.gizler })))); }
    if (goz) L.push(resim(goz.dosya).then(img => ({ katman: 'yuz', img, sab: K.sablon.yuz, satir: gr ? gr.satir : 0, liste: goz.hucre })));
    if (K.kulak) L.push(resim(K.kulak.dosya).then(img => ({ katman: 'kulak', img, sab: K.sablon.kulak, satir: 0 })));
    return Promise.all(L);
  }
  const sirasi = yon => K.siraYon[yon] || K.sira;

  /* ---------- kurucu: { cv, m } (m: oyunun set kaydı biçimi) ---------- */
  function kur(set, g) {
    const B = AT.sets[set]; if (!B || !GA.govde[set]) return Promise.reject(new Error('gövde yok: ' + set));
    return katmanlar(set, g).then(KL => {
      const gizli = new Set(); KL.forEach(k => (k.gizler || []).forEach(x => gizli.add(x)));
      const kutu = k => k.govde || k.sab, ciz = KL.filter(k => !gizli.has(k.katman));
      const sol = Math.ceil(Math.max(...ciz.map(k => kutu(k).ax))), sag = Math.ceil(Math.max(...ciz.map(k => kutu(k).cw - kutu(k).ax)));
      const ust = Math.ceil(Math.max(...ciz.map(k => kutu(k).ay))), alt = Math.ceil(Math.max(...ciz.map(k => kutu(k).ch - kutu(k).ay)));
      const cw = sol + sag, ch = ust + alt, anahtarlar = Object.keys(B.frames), cols = 9, rows = Math.ceil(anahtarlar.length / cols), c = tuval(cols * cw, rows * ch), x = c.getContext('2d'), frames = {};
      x.imageSmoothingQuality = 'high';
      anahtarlar.forEach((key, i) => { const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch, yon = key.split('_')[0]; frames[key] = i;
        const sira = sirasi(yon);
        ciz.slice().sort((a, b) => sira.indexOf(a.katman) - sira.indexOf(b.katman)).forEach(k => {
          if (sira.indexOf(k.katman) < 0) return;   // sırada yeri olmayan katman çizilmez (katalog denetimi bunu yakalar)
          if (k.govde) { const m = k.govde, f = m.frames[key]; if (f == null) return; x.drawImage(k.img, (f % m.cols) * m.cw, Math.floor(f / m.cols) * m.ch, m.cw, m.ch, cx + sol - Math.round(m.ax), cy + ust - Math.round(m.ay), m.cw, m.ch); return; }
          const s = k.sab, h = hucre(key, s, k.liste); if (!h) return;
          const dx = cx + sol - s.ax + h.dx, dy = cy + ust - s.ay + h.dy;
          if (h.dx || h.dy) { x.save(); x.beginPath(); x.rect(cx, cy, cw, ch); x.clip(); }   // kaydırılmış hücre komşu kareye taşmasın
          x.drawImage(k.img, h.i * s.cw, k.satir * s.ch, s.cw, s.ch, dx, dy, s.cw, s.ch);
          if (h.dx || h.dy) x.restore(); }); });
      return { cv: c, m: { cw, ch, cols, rows, ax: sol, ay: ust, tall: B.tall, frames } };
    });
  }
  /* seçenekler (görünüş ekranı): katalogdaki adlar ve renk örnekleri */
  const secenekler = () => { const ad = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.ad])); return { sac: ad(K.sac), sacRenk: ad(K.sacRenk), goz: ad(K.goz), gozRenk: ad(K.gozRenk) }; };
  const ornek = (alan, v) => { const o = K[alan] && K[alan][v]; return o && o.ornek || null; };
  const api = { kur, hucre, secenekler, ornek, katalog: K, boya };
  window.EO2_KAT_KUR = api; if (window.EO2) window.EO2.kat = api;
})();
