/* Ejder Ocağı 2.0 · Merkez Meydan: boyalı çizimler
   Meydanın yerleşimi (world.js: yapıların yeri, kapılar, etkileşim noktaları, çarpışma, yürüyen kişiler) aynen kalır.
   Değişen yalnız görünüştür: kodla çizilmiş yer tutucu yapılar yerine K2'ye uygun (Anadolu: cumbalı han, kubbeli bedesten,
   külahlı burçlu kapı) Midjourney çizimleri, uzakta dağ manzarası, erguvanlar, selviler, çınar.
   Çizimler 2.5D kamera için üretildi; yere dik durur, gölgesi yerdedir, yakına gelince ve oyuncunun önüne düşünce saydamlaşır.
   Eski düz çizim silinmedi: Menü → Meydan çizimi ile geri alınır (seçim tarayıcıda saklanır). */
(function () {
  'use strict';
  const EO2 = window.EO2;
  const KENDI = ['han', 'bedesten', 'kapi', 'arena', 'bahce', 'tezgah0', 'tezgah1', 'selvi', 'bank', 'saksi', 'fici', 'heykel', 'ev0', 'ev1',
    'ic-han-arka', 'ic-han-yan', 'ic-pazar-arka', 'ic-pazar-yan', 'ic-arena-duvar', 'kapi-yilan', 'kapi-migfer', 'kapi-dalga', 'masa', 'sayac', 'toprafi', 'hedef', 'tabela', 'cadir'];
  const ORTAK = ['erguvan0', 'erguvan1', 'ys-agac0', 'ys-agac1', 'ys-cam0', 'ys-cam1', 'ys-kaya0', 'ys-kaya1', 'ys-direk', 'yapi-fener', 'yapi-yuva', 'yapi-yosun', 'cicek0', 'cicek1'];
  const yukle = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  /* görünüş seçimi js/doku.js içinde (çizgi ya da çizim). Buradaki 'boyali' deneme kullanıcı tarafından reddedildi (2026-11-11): menüde yok, yalnız EO2.meydanUslup = 'boyali' ile denenir. */
  (async () => { while (!EO2.ext) await new Promise(r => setTimeout(r, 60));
    const sonuc = await Promise.all([...KENDI.map(k => yukle('assets/dunya/my-' + k + '.webp').then(im => { if (im) EO2.ext['my-' + k] = im; return !!im; })),
      ...ORTAK.map(k => yukle('assets/dunya/' + k + '.webp').then(im => { if (im) EO2.ext['my-' + k] = im; return !!im; })), yukle('assets/bg/ocak-ufuk.webp').then(im => { if (im) EO2.ext['my-ufuk'] = im; return !!im; })]);
    EO2.meydanHazir = sonuc.every(Boolean); })();                       // bir çizim bile eksikse düz meydan kalır

  /* o: w (en) ya da h (boy), m ayna, fade, occl, sway, isik [x oranı, z oranı, yarıçap], uzak (yalnız ortam ışığı, gölgesiz) */
  const sprOf = h => { const sh = h.uv('shadow'), gl = h.uv('glow'); return (ad, x, y, o) => { o = o || {}; const e = h.ext('my-' + ad); if (!e) return null; const hh = o.h || o.w * e.h / e.w, w = o.w || hh * e.w / e.h, m = o.m ? 1 : 0;
    const it = { key: o.key === undefined ? y : o.key, x, y, w, h: hh, tall: hh > 2.2 && o.occl !== false, cover: 1, draw(R, F) {
      if (Math.abs(x - F.camX) > 90) return; let a = o.fade === false ? 1 : h.nearFade(F, y); if (it.tall) { it.cover += ((F.coverTest(it) ? 0.28 : 1) - it.cover) * Math.min(1, F.dt * 8); a *= it.cover; } if (a < 0.01) return;
      const c = o.uzak ? h.amb(F, o.uzak) : F.lit(x, y, 1); c[3] = (c[3] === undefined ? 1 : c[3]) * a; const sw = o.sway ? Math.sin(F.time * 0.9 + x * 1.7) * o.sway * hh : 0, z0 = -hh * (o.sink === undefined ? 0.012 : o.sink);
      if (!o.uzak && o.golge !== false) R.quad(h.T.fx, [x - w * 0.44, y - 0.6, 0.012], [x + w * 0.44, y - 0.6, 0.012], [x + w * 0.44, y + 0.3, 0.012], [x - w * 0.44, y + 0.3, 0.012], sh[0], sh[1], sh[2], sh[3], [1, 1, 1, 0.5 * a]);
      R.quad(e.t, [x - w / 2, y, z0], [x + w / 2, y, z0], [x + w / 2 + sw, y, z0 + hh], [x - w / 2 + sw, y, z0 + hh], m, 0, 1 - m, 1, c, false, 1);
      if (o.isik) { const k = (0.1 + F.night * 0.3 + Math.sin(F.time * 3.3 + x) * 0.03) * a * Math.min(1, Math.max(0.35, (y - F.camY) / 9)), gx = x + (o.isik[0] - 0.5) * w * (m ? -1 : 1), gz = o.isik[1] * hh, gr = o.isik[2]; R.quad(h.T.fx, [gx - gr, y - 0.05, gz - gr], [gx + gr, y - 0.05, gz - gr], [gx + gr, y - 0.05, gz + gr], [gx - gr, y - 0.05, gz + gr], gl[0], gl[1], gl[2], gl[3], [1 * k, 0.7 * k, 0.3 * k, 1], true, 0); } } };
    h.push(it); return it; }; };
  /* uzak dağ manzarası: sahnenin arkasına konur; zemin manzaranın başladığı yerde biter */
  const ufuk = (h, L, y, w) => { L.gx = 240; L.gy = y - 0.4; w = w || 330; h.push({ key: 9e4, draw(R, F) { const e = h.ext('my-ufuk'); if (!e) return; const hh = w * e.h / e.w, x0 = F.camX * 0.9 - w / 2, c = [F.amb[0] * 0.75 + 0.25, F.amb[1] * 0.75 + 0.25, F.amb[2] * 0.75 + 0.25, 1]; R.quad(e.t, [x0, y, -hh * 0.21], [x0 + w, y, -hh * 0.21], [x0 + w, y, hh * 0.79], [x0, y, hh * 0.79], 0, 0, 1, 1, c, false, 0); } }); };
  /* yerleşimdeki ağaç türleri: çınar, erguvan, selvi, bahçe ağacı */
  const agaclar = (spr, liste, uzakY) => { let ei = 0, bi = 0; for (const t of liste) { const k = t[0], uz = uzakY !== undefined && t[2] > uzakY; if (k === 'cinar') spr('ys-agac0', t[1], t[2], { h: 7.8, sway: 0.008 }); else if (k === 'erguvan') spr('erguvan' + (ei++ % 2), t[1], t[2], { h: 5.4, sway: 0.012, m: ei % 3 === 0 });
      else if (k === 'bahce') spr('ys-agac1', t[1], t[2], { h: 5.0, sway: 0.01, occl: false, m: bi++ % 2 }); else spr('selvi', t[1], t[2], { h: uz ? 8.4 : 7.0, sway: 0.008, m: Math.round(t[1]) % 2 === 0, uzak: uz ? 0.9 : 0, fade: !uz }); } };
  /* uzak orman: satırlar [y, aralık, boy]; |x| < bosluk olan yer (yol) boş kalır */
  const orman = (spr, satirlar, bosluk, tohum) => { let sd = tohum || 73; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647, T = ['ys-cam0', 'ys-cam1', 'ys-agac0', 'ys-cam1', 'ys-agac1', 'selvi']; for (const row of satirlar) for (let x = -84; x < 84; x += row[1] * (0.7 + rn() * 0.6)) { const px = x + rn() * 2, ad = T[Math.floor(rn() * T.length)], py = row[0] + (rn() - 0.5) * 2.6, hh = row[2] * (0.8 + rn() * 0.4), m = rn() < 0.5; if (Math.abs(px) < (bosluk || 0)) continue; spr(ad, px, py, { h: hh, m, uzak: 0.84, fade: false, occl: false }); } };
  EO2.boyali = { acik: () => EO2.meydanUslup === 'boyali' && !!EO2.meydanHazir, spr: sprOf, ufuk, agaclar, orman };

  EO2.meydanBoyali = function (h, o) { const L = EO2.layout; h.addSky(); ufuk(h, L, 118);
    const spr = sprOf(h);
    /* yapılar: yerleri world.js'teki cephelerle aynı */
    spr('kapi', 0, 29.6, { w: 24, fade: false, occl: false, sink: 0.03 });
    spr('han', -10.5, 19.5, { w: 10.8, fade: false, occl: false, isik: [0.42, 0.3, 2.6] });
    spr('bedesten', 10.4, 21.6, { w: 10.6, fade: false, occl: false, isik: [0.55, 0.22, 2.2] });
    spr('ev0', -12.9, 14.3, { w: 6.0, isik: [0.6, 0.3, 1.6] }); spr('ev1', 12.9, 13.5, { w: 5.6, m: 1, isik: [0.45, 0.25, 1.6] });
    spr('arena', -11.9, 8.7, { w: 8.0, isik: [0.45, 0.2, 2.2] }); spr('bahce', 12.0, 7.9, { w: 6.6 });
    spr('tezgah0', 7.1, 18.6, { w: 3.3, isik: [0.5, 0.5, 1.2] }); spr('tezgah0', 13.4, 18.6, { w: 3.3, m: 1, isik: [0.5, 0.5, 1.2] }); spr('tezgah1', 4.9, 20.4, { w: 2.9, isik: [0.5, 0.35, 1.3] });
    /* ağaçlar: yerleşimdeki türler korunur (çınar, erguvan, selvi, bahçe ağacı) */
    agaclar(spr, L.trees, 31);
    /* sınırlar: duvar yerine selvi, çam ve erguvan dizisi; kapının iki yanı ve ardı orman */
    const SINIR = [['selvi', -16.6, 2.6, 7.4], ['erguvan0', -16.2, 5.6, 5.6], ['selvi', -16.4, 12.9, 7.0], ['ys-cam1', -16.6, 18.7, 7.6], ['selvi', 16.6, 2.4, 7.4], ['erguvan1', 16.3, 5.2, 5.4], ['ys-agac1', 16.6, 12.4, 6.4], ['selvi', 16.5, 17.6, 7.2], ['ys-cam0', 16.8, 20.4, 7.8],
      ['ys-cam0', -14.6, 31.4, 8.6], ['ys-agac0', -19.6, 32.2, 9.2], ['erguvan1', -9.6, 31.2, 6.0], ['ys-cam1', 14.8, 31.6, 8.4], ['ys-agac1', 19.8, 32.4, 8.8], ['erguvan0', 9.8, 31.3, 6.0]];
    SINIR.forEach((t, i) => spr(t[0], t[1], t[2], { h: t[3], sway: 0.01, m: i % 2 }));
    orman(spr, [[36, 5.6, 9.6], [44, 6.6, 11.5]], 5.2, 73); orman(spr, [[56, 8.4, 14], [72, 11, 17]], 0, 91);
    /* eşyalar */
    for (const l of L.lamps) spr('yapi-fener', l[0], l[1], { h: 3.3, occl: false, isik: [0.5, 0.84, 1.5] });
    L.benches.forEach((b, i) => spr('bank', b[0], b[1], { w: 2.0, m: i % 2 })); L.planters.forEach((p, i) => spr('saksi', p[0], p[1], { w: 1.5, m: i % 2 }));
    spr('fici', -5.8, 18.8, { w: 1.9 }); spr('fici', 9.9, 19.9, { w: 1.6, m: 1 }); spr('fici', -14.3, 13.9, { w: 1.4, m: 1 });
    [[-13.9, 1.4, 1.6, 0], [13.6, 1.2, 1.6, 1], [-14.2, 6.4, 1.4, 1], [14.4, 4.6, 1.5, 0], [-7.4, 28.6, 1.5, 0], [7.6, 28.7, 1.5, 1], [-12.6, 28.9, 1.6, 1], [12.8, 28.9, 1.6, 0], [10.4, 9.4, 1.3, 0], [13.8, 9.8, 1.4, 1]].forEach(q => spr('cicek' + q[3], q[0], q[1], { w: q[2], golge: false, occl: false }));
    for (const b of L.braziers) h.billboard(h.tx.braz, b[0], b[1], { glowK: 1.4 });
    h.push(o.fountain);
  };
})();
