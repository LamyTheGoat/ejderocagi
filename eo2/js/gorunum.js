/* Ejder Ocağı 2.0 · Karakter görünüşü (EO2.gorunum) · 2026-11-17
   Oyuncu saç stilini, saç rengini, göz biçimini ve göz rengini seçer. Çizim katmanları chibi katman sisteminden pişirilir
   (tools/bake_gorunus.mjs → assets/gorunus/, assets/gorunus_atlas.js): gövde, yüz, saç ve kulak ayrı atlaslardır.
   Bu dosya seçilen görünüşün katmanlarını üst üste çizip tek bir karakter atlası kurar ve oyuna kaydeder (EO2.setEkle).
   - Görünüş kayıtta durur (S.gorunus) ve meydandaki öteki oyunculara iletilir (js/meydan_ag.js, alan "g": sac.sacRenk.goz.gozRenk).
   - Her şey özgünse hiçbir şey kurulmaz: oyun eski atlası kullanır (ek yük yok).
   - Yalnız görüntü: ekipman, set ve kural değişmez. Seçeneklerin hepsi serbesttir, ücret yok.
   Ekran: Menü → Görünüş. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, GA = window.EO2_GORUNUS, AT = window.EO2_ATLAS;
  if (!EO2 || !G || !GA || !AT || !GA.govde) return;
  const OZGUN = { sac: 'orig', sacRenk: 'orig', goz: 'orig', gozRenk: 'orig' }, ALAN = ['sac', 'sacRenk', 'goz', 'gozRenk'];
  const BOYA = { sacRenk: { orig: '#9a3b2a', black: '#262433', blond: '#f0cc60', white: '#dcdcea', blue: '#4a8ae8', orange: '#ee7428', green: '#3aa858', pink: '#ec7ab4' },
    gozRenk: { orig: '#d8303a', blue: '#3f8fe6', green: '#3fb85a', gold: '#e6b83c', purple: '#9a55d8', grey: '#9aa0a8' } };
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const temiz = g => { const o = {}; for (const k of ALAN) o[k] = g && GA.ad[k] && GA.ad[k][g[k]] ? g[k] : 'orig'; return o; };
  const kod = g => ALAN.map(k => g[k]).join('.'), coz = s => { const p = String(s || '').split('.'); return p.length === 4 ? temiz({ sac: p[0], sacRenk: p[1], goz: p[2], gozRenk: p[3] }) : null; };
  const ozgunMu = g => kod(g) === kod(OZGUN);
  const resimler = new Map(), yukle = ad => { if (!resimler.has(ad)) resimler.set(ad, new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => { resimler.delete(ad); no(new Error(ad)); }; i.src = 'assets/gorunus/' + ad + '.webp'; })); return resimler.get(ad); };
  const kurulan = new Map();   // anahtar → Promise<anahtar>
  /* seçilen görünüşün atlasını kurar; dönen ad oyunun set kaydındaki addır (özgün görünüşte null) */
  function kur(set, g) { g = temiz(g); if (ozgunMu(g) || !GA.govde[set] || !AT.sets[set]) return Promise.resolve(null);
    const ad = 'g_' + set + '_' + kod(g).replace(/\./g, '_'); if (kurulan.has(ad)) return kurulan.get(ad);
    const sb = g.sac === 'orig' ? 'a' : 'b', sac = g.sac + '_' + g.sacRenk;
    const K = [['sac', sac + '_a'], ['govde', set], ['yuz', g.goz + '_' + g.gozRenk + '_' + sb], ['sac', sac + '_o'], ['kulak', sb]].filter(([grup, k]) => GA[grup][k]);
    const soz = Promise.all(K.map(([grup, k]) => yukle(grup + '_' + k))).then(R => { const M = K.map(([grup, k]) => GA[grup][k]), B = AT.sets[set];
      const sol = Math.ceil(Math.max(...M.map(m => m.ax))), sag = Math.ceil(Math.max(...M.map(m => m.cw - m.ax))), ust = Math.ceil(Math.max(...M.map(m => m.ay))), alt = Math.ceil(Math.max(...M.map(m => m.ch - m.ay)));
      const cw = sol + sag, ch = ust + alt, anahtarlar = Object.keys(B.frames), cols = 9, rows = Math.ceil(anahtarlar.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch; const x = c.getContext('2d'), frames = {};
      anahtarlar.forEach((key, i) => { const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch; frames[key] = i;
        M.forEach((m, j) => { const f = m.frames[key]; if (f == null) return; x.drawImage(R[j], (f % m.cols) * m.cw, Math.floor(f / m.cols) * m.ch, m.cw, m.ch, cx + sol - Math.round(m.ax), cy + ust - Math.round(m.ay), m.cw, m.ch); }); });
      EO2.setEkle(ad, c, { cw, ch, cols, rows, ax: sol, ay: ust, tall: B.tall, frames }); return ad; });
    kurulan.set(ad, soz); soz.catch(() => kurulan.delete(ad)); return soz; }

  /* savaş ekranı: aynı görünüş Topçu savaş karelerine de giydirilir (tools/bake_savas_gorunus.mjs). Gövde sayfaları olduğu gibi üst üste çizilir;
     baş parçaları (yüz, saç, kulak) az hücrelidir ve her kareye o karenin dönüşümüyle çizilir. Dönen: { ad, cv } (özgün görünüşte ya da çizimi olmayan sette null). Kare ölçüleri window.EO2_BATTLE.sets[ad] olarak kaydedilir. */
  const SG = window.EO2_SAVAS_GORUNUS, savasKurulan = new Map(), savasResim = ad => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(ad)); i.src = 'assets/gorunus_savas/' + ad + '.webp'; });
  function savas(set, g) { g = typeof g === 'string' ? coz(g) : temiz(g); const BT = window.EO2_BATTLE; if (!g || ozgunMu(g) || !SG || !SG.kutu || !SG.set[set] || !BT) return Promise.resolve(null);
    const ad = 'g_' + set + '_' + kod(g).replace(/\./g, '_'); if (savasKurulan.has(ad)) return savasKurulan.get(ad);
    const sb = g.sac === 'orig' ? 'a' : 'b', sac = 'sac_' + g.sac + '_' + g.sacRenk, K = SG.kutu;
    const L = ['govde_' + set + '_1', sac + '_a', 'govde_' + set + '_2', sac + '_m', 'govde_' + set + '_3', 'yuz_' + g.goz + '_' + g.gozRenk + '_' + sb, sac + '_o', 'kulak_' + sb].filter(k => SG.var[k]);
    const soz = Promise.all(L.map(savasResim)).then(R => { const cv = document.createElement('canvas'); cv.width = K.cols * K.cw; cv.height = K.rows * K.ch; const x = cv.getContext('2d'), n = Object.keys(K.frames).length, DON = SG.set[set].don; x.imageSmoothingQuality = 'high';
      R.forEach((im, j) => { const ad = L[j], tur = /^yuz_/.test(ad) ? 'yuz' : /^kulak_/.test(ad) ? 'kulak' : /^sac_.*_o$/.test(ad) ? 'sacOn' : /^sac_.*_m$/.test(ad) ? 'sacOrta' : /^sac_.*_a$/.test(ad) ? 'sacArka' : '';
        if (!tur) { x.drawImage(im, 0, 0); return; } const D = DON[tur], H = K.hucre[tur]; if (!D || !H) return;   /* baş parçası az hücrelidir: her kareye o karenin hücresi, o karenin dönüşümüyle çizilir */
        for (let i = 0; i < n; i++) { const cx = (i % K.cols) * K.cw, cy = Math.floor(i / K.cols) * K.ch, m = D[i]; x.save(); x.beginPath(); x.rect(cx, cy, K.cw, K.ch); x.clip(); x.setTransform(m[0], m[1], m[2], m[3], m[4] + cx, m[5] + cy); x.drawImage(im, H[i] * K.cw, 0, K.cw, K.ch, 0, 0, K.cw, K.ch); x.restore(); } });
      BT.sets[ad] = { cw: K.cw, ch: K.ch, cols: K.cols, rows: K.rows, ax: K.ax, ay: K.ay, tall: K.tall, frames: K.frames, muzzle: SG.set[set].muzzle || BT.sets[set].muzzle }; return { ad, cv }; });
    savasKurulan.set(ad, soz); soz.catch(() => savasKurulan.delete(ad)); return soz; }
  /* meydanda görünen bir oyuncunun görünüş kodu (yoldaş ve rakip savaşta böyle giydirilir) */
  const kodOf = h => { const c = EO2.meydanAg && h ? [...EO2.meydanAg.kisiler.values()].find(x => x.handle === h) : null; return c && c.gorKod ? c.gorKod.split('|')[1] || '' : ''; };

  /* ---------- oyuncunun kendi görünüşü ---------- */
  const benim = () => temiz(typeof S !== 'undefined' && S && S.gorunus);
  let sonImza = '';
  async function uygula() { const p = EO2.api && EO2.api.player; if (!p || !G.live) return; const g = benim(), imza = p.set + '|' + kod(g); if (imza === sonImza) return; sonImza = imza;
    try { const ad = await kur(p.set, g); if (sonImza === imza) { p.gor = ad; if (EO2.api.portreTazele) EO2.api.portreTazele(); } } catch (_) { sonImza = ''; } }
  setInterval(uygula, 400);
  function sec(alan, v) { if (!ALAN.includes(alan) || !GA.ad[alan][v]) return; S.gorunus = Object.assign(benim(), { [alan]: v }); if (typeof saveGame === 'function') saveGame(); uygula(); }
  /* meydandaki öteki oyuncu: görünüş kodu gelince atlası kurulur, hazır olunca giydirilir */
  function uzak(c, s) { const g = coz(s); if (!g || ozgunMu(g)) { c.gor = null; c.gorKod = ''; return; } const imza = c.set + '|' + kod(g); if (c.gorKod === imza) return; c.gorKod = imza; kur(c.set, g).then(ad => { if (c.gorKod === imza) c.gor = ad; }).catch(() => { c.gorKod = ''; }); }

  /* ---------- ekran ---------- */
  function onizle(cv, ad, yon) { const st = EO2.setAl && EO2.setAl(ad); if (!st || !st.img) return; const m = st.m, i = m.frames[yon + '_idle'], x = cv.getContext('2d'), k = Math.min(cv.width / m.cw, cv.height / m.ch);
    x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingQuality = 'high'; x.drawImage(st.img, (i % m.cols) * m.cw, Math.floor(i / m.cols) * m.ch, m.cw, m.ch, (cv.width - m.cw * k) / 2, cv.height - m.ch * k, m.cw * k, m.ch * k); }
  const SATIR = [['sac', 'Saç'], ['sacRenk', 'Saç rengi'], ['goz', 'Göz'], ['gozRenk', 'Göz rengi']];
  G.screen('gorunus', { k: 'Terbiyeci', t: 'Görünüş', cls: 'gr', bg: 'a:kiraathane', draw(body) { const g = benim(), p = EO2.api.player;
    body.innerHTML = '<div class="gr-kok"><div class="gr-ayna"><canvas width="300" height="460" data-yon="down" aria-label="Önden"></canvas><canvas width="210" height="330" data-yon="right" aria-label="Yandan"></canvas><canvas width="210" height="330" data-yon="up" aria-label="Arkadan"></canvas></div>' +
      '<div class="gr-secenek">' + SATIR.map(([alan, ad]) => '<section><h3>' + ad + '</h3><div class="gr-sira' + (BOYA[alan] ? ' renk' : '') + '" role="radiogroup" aria-label="' + ad + '">' + Object.keys(GA.ad[alan]).map(v => '<button type="button" role="radio" class="' + (BOYA[alan] ? 'gr-boya' : 'gbtn kucuk') + '" data-alan="' + alan + '" data-v="' + v + '" aria-checked="' + (g[alan] === v) + '" title="' + esc_(GA.ad[alan][v]) + '"' + (BOYA[alan] ? ' style="--c:' + BOYA[alan][v] + '"><span>' + esc_(GA.ad[alan][v]) + '</span>' : '>' + esc_(GA.ad[alan][v])) + '</button>').join('') + '</div></section>').join('') +
        '<p class="soluk">Görünüş yalnız görüntüdür: setin ve ekipmanın aynı kalır. Meydandaki öteki terbiyeciler de seni böyle görür.</p><button type="button" class="gbtn" data-gr-ozgun="1" ' + (ozgunMu(g) ? 'disabled' : '') + '>Özgün görünüşe dön</button></div></div>';
    const ciz = async () => { const ad = (await kur(p.set, benim()).catch(() => null)) || p.set; body.querySelectorAll('.gr-ayna canvas').forEach(cv => onizle(cv, ad, cv.dataset.yon)); }; ciz();
    body.querySelectorAll('[data-alan]').forEach(b => b.addEventListener('click', () => { if (EO2.audio && EO2.audio.ui) EO2.audio.ui(); sec(b.dataset.alan, b.dataset.v); G.redraw(); }));
    const oz = body.querySelector('[data-gr-ozgun]'); if (oz) oz.addEventListener('click', () => { S.gorunus = Object.assign({}, OZGUN); if (typeof saveGame === 'function') saveGame(); uygula(); G.redraw(); });
  } });
  EO2.gorunum = { kur, savas, kodOf, uzak, sec, kod: () => kod(benim()), benim, secenekler: () => GA.ad };
})();
