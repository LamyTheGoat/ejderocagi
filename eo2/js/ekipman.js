/* Ejder Ocağı 2.0 · Ekipman: Kuşam ve Dolap, Zırhçı vitrini (EO2.ekipman) · 2026-11-21
   Kullanıcı (Mehmet, 2026-11-21): ekipman beş ayrı slot, her parça ayrı yükseltilir; "karakter görünüşündeki tek satırlık liste yetersiz kalacak.
   Bunları satın alacak bir yer ve görüntüleyebilecek bir dolap sekmesi ekleyelim." Kurallar ve katalog js/ekipman_kural.js'tedir (EO2_EKIPMAN).

   EKRANLAR
   - Kuşam (G.screen 'dolap'): solda ayna ve beş slot kutusu (sol: başlık, yüz, zırh; sağ: pelerin, silah), altında toplam güç.
     Sağda Dolap: slot sekmeleri, sıralama, parça kartları. Seçili kartta: kuşan / çıkar / Örs'e götür. Zırh kartı aynada denenir.
     Portreye dokunmak (ve I tuşu) bu ekranı açar; saç ve göz için "Görünüş" düğmesi js/gorunum.js ekranına gider.
   - Zırhçı (G.screen 'zirhci'): Usta Kerim'in tezgâhındaki vitrin. Slot sekmeleri, fiyat (altın + malzeme), malzemenin nereden düştüğü, "Sende" işareti.
   ÇİZİM: zırh setlerinin meydan ve savaş çizimi var. Başlık, pelerin ve yüz aksesuarının karakter üstü çizimi henüz pişirilmedi
     (chibi rig katmanları, Mehmet'in PC'sinde); kartlarda eşya resmi görünür, karakterin üstünde görünmez. Ekran bunu açıkça yazar.
   KAYIT: S.ekipman (bkz. ekipman_kural.js). S.kusam (giyili set ve sahip olunan setler) buradan eşitlenir: js/gorunum.js çizimi oradan okur.
   BEDESTEN: kademeli satış Faz 2'dir (kademe önce sunucuya taşınmalı; şartname §7). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, EK = window.EO2_EKIPMAN;
  if (!EO2 || !G || !EK) return;
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ses = k => { const a = EO2.audio; try { if (a && a[k]) a[k](); } catch (_) { } };
  const heybe = () => { S.topcu = S.topcu || {}; S.topcu.ganimet = S.topcu.ganimet || {}; return S.topcu.ganimet; };
  const yuzde = x => String(EK.yuzde(x)).replace('.', ',');

  /* ---------- durum ---------- */
  function durum() { const E = EK.duzenle(S); esitle(E); return E; }
  /* js/gorunum.js zırhı S.kusam'dan çizer: sahip olunan setler ve giyili set buradan yazılır */
  function esitle(E) { const sahip = [...new Set(E.parca.filter(p => EK.slotu(p) === 'zirh').map(p => EK.kat(p.id).set))], z = EK.giyiliParca(E, 'zirh');
    S.kusam = { giyili: z ? EK.kat(z.id).set : 'bare', sahip: sahip.includes('bare') ? sahip : ['bare'].concat(sahip) }; }
  const kaydet = () => { esitle(EK.duzenle(S)); if (typeof saveGame === 'function') saveGame(); if (G.hud) G.hud(); };
  const carpanlar = () => (typeof S !== 'undefined' && S ? EK.carpanlar(durum()) : EK.carpanlar(null));
  function giy(uid) { const E = durum(); if (!EK.giy(E, uid)) return false; kaydet(); return true; }
  function cikar(slot) { const E = durum(); if (!EK.cikar(E, slot)) return false; kaydet(); return true; }
  function satinAl(id) { if (EO2.rehber && EO2.rehber.kilitEngel && EO2.rehber.kilitEngel('kusam-al')) return null; const p = EK.satinAl(S, id, heybe()); if (p) kaydet(); return p; }
  const parcaById = id => durum().parca.find(p => p.id === id) || null;

  /* ---------- çizim yardımcıları ---------- */
  const ikonUrl = k => (k && k.ikon ? (/^img\//.test(k.ikon) ? G.url(k.ikon) : k.ikon) : '');
  const SEVIYE = p => (p.kademe >= 12 ? 4 : p.kademe >= 7 ? 3 : p.kademe >= 4 ? 2 : 1);   // kart çerçevesi (mal2 t1–t4)
  /* zırh seti için ayna/kart çizimi: görünüşlü atlas (saç, göz) varsa onu kullanır */
  async function setCiz(cv, set, yon) { const A = EO2.api; if (!A || !cv) return; try { if (EO2.setAl(set) && !EO2.setAl(set).img) { A.drawPortrait(document.createElement('canvas'), set, 0.5); await new Promise(r => setTimeout(r, 500)); } } catch (_) { }
    let ad = set; try { if (EO2.gorunum && EO2.gorunum.kur) ad = (await EO2.gorunum.kur(set, EO2.gorunum.benim())) || set; } catch (_) { }
    const st = EO2.setAl && EO2.setAl(ad); if (!st || !st.img || !cv.isConnected) return; const m = st.m, i = m.frames[(yon || 'down') + '_idle'], x = cv.getContext('2d'), k = Math.min(cv.width / m.cw, cv.height / m.ch);
    x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingQuality = 'high'; x.drawImage(st.img, (i % m.cols) * m.cw, Math.floor(i / m.cols) * m.ch, m.cw, m.ch, (cv.width - m.cw * k) / 2, cv.height - m.ch * k, m.cw * k, m.ch * k); }
  const resimHtml = (k, cls) => (k.slot === 'zirh' ? '<canvas class="' + (cls || '') + '" width="120" height="150" data-set-ciz="' + esc_(k.set) + '" aria-hidden="true"></canvas>' : (k.ikon ? '<img alt="" src="' + esc_(ikonUrl(k)) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' : '<i class="dl-bos-ik' + (cls ? ' ' + cls : '') + '" aria-hidden="true"></i>'));
  const cizimleriKur = kok => kok.querySelectorAll('canvas[data-set-ciz]').forEach(cv => setCiz(cv, cv.dataset.setCiz));
  const etkiYazi = p => { const s = EK.slotu(p), e = EK.ETKI[s]; if (!e) return 'Güç vermez; yalnız görünüş.'; if (p.catlak) return 'Çatlak: artış işlemiyor. Kor Örsü\'nde onarılır.'; return EK.ETKI_AD[e] + ' +%' + yuzde(EK.artis(p)) + (p.kademe < EK.EN_COK ? ' · Örs\'te kademe başına +%' + yuzde(EK.ARTIS) : ' · zirve'); };
  const CIZIMSIZ = { baslik: 1, pelerin: 1, yuz: 1 };   // karakter üstü çizimi henüz olmayan slotlar

  /* ---------- Kuşam ve Dolap ---------- */
  const U = { sekme: 'tumu', sirala: 'kademe', sec: null, dene: null };
  const SEKME = [['tumu', 'Tümü']].concat(EK.SLOT.map(s => [s, EK.SLOT_AD[s]]));
  const SIRA = { kademe: (a, b) => b.kademe - a.kademe || (b.t || 0) - (a.t || 0), yeni: (a, b) => (b.t || 0) - (a.t || 0), ad: (a, b) => EK.kat(a.id).ad.localeCompare(EK.kat(b.id).ad, 'tr') };
  function slotKutu(E, s) { const p = EK.giyiliParca(E, s), k = p && EK.kat(p.id);
    return '<button type="button" class="dl-slot' + (p ? '' : ' bos') + (p && p.catlak ? ' catlak' : '') + '" data-dl-slot="' + s + '"><span class="dl-slot-res">' + (k ? (s === 'zirh' ? '<i class="dl-zirh-ik"></i>' : k.ikon ? '<img alt="" src="' + esc_(ikonUrl(k)) + '">' : '<i class="dl-bos-ik"></i>') : '<i class="dl-bos-ik"></i>') + '</span>' +
      '<span class="dl-slot-ad" title="' + esc_(k ? k.ad : '') + '"><small>' + EK.SLOT_AD[s] + '</small><b>' + (k ? esc_(k.ad) : 'Boş') + '</b></span>' + (p && EK.gucVerir(s) ? '<em>+' + p.kademe + '</em>' : '') + '</button>'; }
  function dolapHtml() { const E = durum(), c = EK.carpanlar(E), L = E.parca.filter(p => U.sekme === 'tumu' || EK.slotu(p) === U.sekme).sort(SIRA[U.sirala] || SIRA.kademe);
    const giyiliMi = p => E.giyili[EK.slotu(p)] === p.uid, secili = E.parca.find(p => p.uid === U.sec) || L[0] || null; U.sec = secili ? secili.uid : null;
    const ust = '<section class="dl-kusam cam"><div class="dl-yan sol">' + ['baslik', 'yuz', 'zirh'].map(s => slotKutu(E, s)).join('') + '</div>' +
      '<div class="dl-ayna"><canvas width="240" height="360" id="dlAyna" aria-label="Terbiyecin"></canvas>' + (U.dene ? '<span class="dl-dene">Deneniyor</span>' : '') + '</div>' +
      '<div class="dl-yan sag">' + ['pelerin', 'silah'].map(s => slotKutu(E, s)).join('') + '<button type="button" class="gbtn kucuk dl-gorunus" data-dl-git="gorunus">Saç ve göz</button></div>' +
      '<ul class="dl-toplam" aria-label="Toplam ekipman gücü"><li><small>Hasar</small><b>+%' + yuzde(c.hasar - 1) + '</b></li><li><small>Can</small><b>+%' + yuzde(c.can - 1) + '</b></li><li><small>Tam isabet</small><b>+%' + yuzde(c.kritik) + '</b></li><li><small>Dayanıklılık</small><b>+%' + yuzde(c.dayaniklilik - 1) + '</b></li><li class="tavan"><small>Toplam</small><b>%' + yuzde(c.toplam) + ' <i>/ %60</i></b></li></ul></section>';
    const kartlar = L.map((p, i) => { const k = EK.kat(p.id), s = EK.slotu(p);
      return '<button type="button" class="mal2 dl-kart t' + SEVIYE(p) + (p.catlak ? ' catlak' : '') + '" title="' + esc_(k.ad) + '" data-dl-kart="' + esc_(p.uid) + '" aria-pressed="' + (secili && p.uid === secili.uid) + '" style="animation-delay:' + Math.min(i * 0.03, 0.3) + 's"><span class="res">' + resimHtml(k) + (giyiliMi(p) ? '<i class="tz-muhur satilir">Giyili</i>' : '') + (p.catlak ? '<i class="dl-catlak">ÇATLAK</i>' : '') + '</span><b>' + esc_(k.ad) + '</b>' + (EK.gucVerir(s) ? '<em class="dl-kademe">+' + p.kademe + '</em>' : '<em class="dl-kademe sus">Süs</em>') + '</button>'; }).join('');
    let kunye = '';
    if (secili) { const k = EK.kat(secili.id), s = EK.slotu(secili), giyili = giyiliMi(secili), guc = EK.gucVerir(s);
      kunye = '<div class="pz-kunye dl-kunye"><div><h3>' + esc_(k.ad) + (guc ? ' <span class="dl-k">+' + secili.kademe + '</span>' : '') + '</h3><p>' + esc_(k.acik) + '</p><p class="dl-etki">' + esc_(etkiYazi(secili)) + '</p>' +
        (CIZIMSIZ[s] ? '<p class="dl-not">Bu parçanın karakter üstündeki çizimi hazırlanıyor; şimdilik yalnız dolapta görünür.</p>' : '') + '</div><div class="dl-eylem">' +
        (giyili ? (EK.BOS_OLUR[s] ? '<button type="button" class="gbtn" data-dl="cikar">Çıkar</button>' : '<span class="dl-giyili">Giyili</span>') : '<button type="button" class="gbtn altin" data-dl="giy">Kuşan</button>') +
        (guc ? '<button type="button" class="gbtn' + (secili.catlak ? ' kor' : '') + '" data-dl="ors">' + (secili.catlak ? 'Örs\'te onar' : 'Örs\'e götür') + '</button>' : '') + '</div></div>'; }
    const alt = '<section class="dl-dolap cam"><div class="dl-bas"><div class="sekme" role="tablist" aria-label="Slot">' + SEKME.map(([k, ad]) => '<button type="button" role="tab" data-dl-sekme="' + k + '" aria-selected="' + (U.sekme === k) + '">' + ad + '</button>').join('') + '</div>' +
      '<label class="dl-sirala">Sırala <select data-dl-sirala="1"><option value="kademe"' + (U.sirala === 'kademe' ? ' selected' : '') + '>Kademe</option><option value="yeni"' + (U.sirala === 'yeni' ? ' selected' : '') + '>En yeni</option><option value="ad"' + (U.sirala === 'ad' ? ' selected' : '') + '>Ad</option></select></label></div>' +
      (L.length ? '<div class="pz-mallar dl-izgara kay">' + kartlar + '</div>' : '<p class="ah-not dl-bosnot">Bu bölmede parçan yok. Usta Kerim\'in Zırhçı vitrininde bulursun.</p>') + kunye +
      '<button type="button" class="gbtn altin dl-zirhci" data-dl-git="zirhci">Zırhçı vitrini<small>Usta Kerim · yeni parça al</small></button></section>';
    return '<div class="dl-kok">' + ust + alt + '</div>'; }
  function aynaCiz(body) { const cv = body.querySelector('#dlAyna'); if (!cv) return; const E = durum(), p = U.dene ? parcaById(U.dene) : null, set = p && EK.slotu(p) === 'zirh' ? EK.kat(p.id).set : EK.kat(EK.giyiliParca(E, 'zirh').id).set; setCiz(cv, set); }
  G.screen('dolap', { k: 'Terbiyeci', t: 'Kuşam ve dolap', cls: 'dl', bg: 'a:kiraathane', enter() { U.dene = null; }, leave() { U.dene = null; }, draw(body) {
    body.innerHTML = dolapHtml(); aynaCiz(body); cizimleriKur(body);
    body.querySelectorAll('[data-dl-sekme]').forEach(b => b.addEventListener('click', () => { ses('ui'); U.sekme = b.dataset.dlSekme; U.sec = null; U.dene = null; G.redraw(); }));
    const sr = body.querySelector('[data-dl-sirala]'); if (sr) sr.addEventListener('change', () => { ses('ui'); U.sirala = sr.value; G.redraw(); });
    body.querySelectorAll('[data-dl-slot]').forEach(b => b.addEventListener('click', () => { ses('ui'); const s = b.dataset.dlSlot, E = durum(); U.sekme = s; U.sec = E.giyili[s] || null; U.dene = null; G.redraw(); }));
    body.querySelectorAll('[data-dl-kart]').forEach(b => b.addEventListener('click', () => { ses('ui'); U.sec = b.dataset.dlKart; const p = durum().parca.find(q => q.uid === U.sec); U.dene = p && EK.slotu(p) === 'zirh' && durum().giyili.zirh !== p.uid ? p.id : null; G.redraw(); }));
    body.querySelectorAll('[data-dl-git]').forEach(b => b.addEventListener('click', () => { ses('ui'); G.open(b.dataset.dlGit); }));
    body.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => { const E = durum(), p = E.parca.find(q => q.uid === U.sec); if (!p) return; const k = EK.kat(p.id), e = b.dataset.dl;
      if (e === 'giy') { if (giy(p.uid)) { ses('chime'); U.dene = null; G.toast('<b>' + esc_(k.ad) + '</b> kuşanıldı.', 'goal'); } }
      else if (e === 'cikar') { ses('ui'); cikar(EK.slotu(p)); }
      else if (e === 'ors') { ses('ui'); if (EO2.ors && EO2.ors.sec) EO2.ors.sec(p.uid); G.open('ors'); return; }
      G.redraw(); }));
  } });

  /* ---------- Zırhçı vitrini (Usta Kerim) ---------- */
  const Z = { sekme: 'zirh', sec: null };
  const VSEKME = ['zirh', 'baslik', 'pelerin', 'yuz'];
  function zirhciHtml() { const E = durum(), h = heybe(), L = EK.KATALOG.filter(k => k.slot === Z.sekme && !k.baslangic), secili = L.find(k => k.id === Z.sec) || L[0]; Z.sec = secili ? secili.id : null;
    const kartlar = L.map((k, i) => { const sende = EK.sahipMi(E, k.id), d = EK.alinabilir(E, k.id, S.gold, h);
      return '<button type="button" class="mal2 zc-kart t' + Math.min(4, 1 + Math.floor(k.fiyat / 160)) + (sende ? ' sende' : '') + '" data-zc-kart="' + k.id + '" aria-pressed="' + (secili && k.id === secili.id) + '" style="animation-delay:' + Math.min(i * 0.04, 0.4) + 's"><span class="res">' + resimHtml(k) + (sende ? '<i class="tz-muhur satilir">Sende</i>' : '') + '</span><b>' + esc_(k.ad) + '</b><small>' + (Object.keys(k.malzeme).length ? 'altın + malzeme' : 'yalnız altın') + '</small><em class="' + (sende ? 'sat' : d.neden === 'altin' ? 'pahali' : '') + '">' + k.fiyat + '</em></button>'; }).join('');
    let kunye = '';
    if (secili) { const sende = EK.sahipMi(E, secili.id), d = EK.alinabilir(E, secili.id, S.gold, h), M = Object.keys(secili.malzeme);
      const malz = M.length ? '<span class="gr-malzler">' + M.map(m => '<i class="gr-malz' + ((h[m] | 0) >= secili.malzeme[m] ? '' : ' eksik') + '">' + esc_(EK.MALZ_AD[m] || m) + ' <b>' + (h[m] | 0) + ' / ' + secili.malzeme[m] + '</b></i>').join('') + '</span><small class="gr-nereden">' + M.map(m => esc_(EK.MALZ_AD[m]) + ': ' + esc_(EK.MALZ_NEREDEN[m] || 'zindan')).join(' · ') + '</small>' : '';
      const etki = EK.gucVerir(secili.slot) ? EK.ETKI_AD[EK.ETKI[secili.slot]] + ' verir: Kor Örsü\'nde kademe başına +%' + yuzde(EK.ARTIS) + ', +12\'de +%15.' : 'Güç vermez; yalnız görünüş.';
      const neden = { altin: 'Yeterli altının yok', malzeme: 'Malzemen eksik', sende: 'Bu parça sende' }[d.neden] || '';
      kunye = '<div class="pz-kunye zc-kunye"><div><h3>' + esc_(secili.ad) + '</h3><p>' + esc_(secili.acik) + '</p><p class="dl-etki">' + esc_(etki) + '</p>' + malz + (CIZIMSIZ[secili.slot] ? '<p class="dl-not">Karakter üstündeki çizimi hazırlanıyor; şimdilik dolapta görünür.</p>' : '') + '</div>' +
        '<button type="button" class="gbtn buyuk altin" data-zc-al="' + secili.id + '" ' + (d.ok ? '' : 'disabled title="' + esc_(neden) + '"') + '>' + (sende ? 'Sende' : M.length ? 'Dövdür' : 'Satın al') + '<small>' + (sende ? 'Dolabında' : secili.fiyat + ' altın' + (d.ok ? '' : ' · ' + neden.toLocaleLowerCase('tr'))) + '</small></button></div>'; }
    return '<div class="pz-satici"><img alt="Usta Kerim" src="' + G.npcImg('kerim') + '"></div><div class="pz-kim"><span class="ust">Demirci ve zırhçı</span><h2>Usta Kerim</h2></div><div class="pz-balon">' + esc_(Z.balon || 'Her parça bir kez dövülür, gerisi örste. Hangisine bakarsın?') + '</div>' +
      '<div class="pz-raf zc-raf"><div class="sekme" role="tablist" aria-label="Slot">' + VSEKME.map(s => '<button type="button" role="tab" data-zc-sekme="' + s + '" aria-selected="' + (Z.sekme === s) + '">' + EK.SLOT_AD[s] + '</button>').join('') + '</div>' +
      '<div class="pz-mallar kay">' + kartlar + '</div>' + kunye + '</div>'; }
  G.screen('zirhci', { k: 'Gece Çarşısı', t: 'Zırhçı', cls: 'pz2 zc', bg: 'bg-pazar', enter() { Z.balon = null; }, draw(body) {
    body.innerHTML = zirhciHtml(); cizimleriKur(body);
    body.querySelectorAll('[data-zc-sekme]').forEach(b => b.addEventListener('click', () => { ses('ui'); Z.sekme = b.dataset.zcSekme; Z.sec = null; G.redraw(); }));
    body.querySelectorAll('[data-zc-kart]').forEach(b => b.addEventListener('click', () => { ses('ui'); Z.sec = b.dataset.zcKart; G.redraw(); }));
    body.querySelectorAll('[data-zc-git]').forEach(b => b.addEventListener('click', () => { ses('ui'); G.open(b.dataset.zcGit); }));
    const al = body.querySelector('[data-zc-al]'); if (al) al.addEventListener('click', () => { const k = EK.kat(al.dataset.zcAl), p = satinAl(k.id);
      if (p) { ses('chime'); if (G.fx) G.fx.coins('#scrGold', 7, al); Z.balon = 'Hayırlı olsun. ' + (EK.gucVerir(k.slot) ? 'Örse getir, birlikte dövelim.' : 'Yakışır sana.'); G.toast('<b>' + esc_(k.ad) + '</b> alındı ve kuşanıldı.', 'goal'); }
      G.redraw(); });
  } });

  /* portreye dokununca (ve I tuşuyla) Kuşam ve dolap açılır (eskiden Görünüş ekranı) */
  { const pr = document.getElementById('profile'); if (pr) { pr.title = 'Kuşam ve dolap'; pr.addEventListener('click', e => { if (!G.live) return; e.stopImmediatePropagation(); e.preventDefault(); if (G.ekran && G.ekran() === 'dolap') G.close(); else G.open('dolap'); }, true); } }

  /* üst şeritte üç sekme: Kuşam ve dolap · Zırhçı · Kor Örsü (aynı demirci zinciri) */
  const ZINCIR = [['dolap', 'Dolap'], ['zirhci', 'Zırhçı'], ['ors', 'Kor Örsü']];
  G.navOf = Object.assign(G.navOf || {}, { dolap: ZINCIR, zirhci: ZINCIR, ors: ZINCIR });
  EO2.ekipman = { durum, carpanlar, giy, cikar, satinAl, parcaById, esitle };
})();
