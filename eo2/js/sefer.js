/* Ejder Ocağı 2.0 · Sefer: bölge seçimi, yol karşılaşmaları ve yaban ejderhası
   Kurallar oyunun kendisidir: seferCost, seferCards, genWild, catchOdds, foodOdds (js/content.js, js/social.js). Akış eski
   startSefer / exCard / exWild / doCatch ile aynı sıradadır: yol karşılaşmaları, sonunda bir yaban ejderhası.
   Sahne düzeni: harita odasında seçilen bölgenin kendi manzarası ekranı kaplar; yol karşılaşmaları hikâye sahnesidir;
   yaban ejderhasıyla karşılaşma arenadaki gibi karşı karşıya bir sahnedir. Düğümlü yeni sefer haritası (hub.js) henüz yok. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, el = G.el, app = document.getElementById('app');
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const locked = R => (R.flag && !S.flags[R.flag]) || (R.unReq && S.un < R.unReq);
  let EX = null, selR = null;

  /* ---------- yaban ejderhası sahnesi ---------- */
  function wild() { if (!EX.wild) EX.wild = genWild(EX.r); const w = EX.wild, e = EX.e, R = REGIONS[EX.r]; let box = document.getElementById('sef'); if (!box) { box = el('div', 'sef2'); box.id = 'sef'; app.appendChild(box); }
    box.style.setProperty('--sahne', 'url("' + G.url('img/bg-' + EX.r + '.webp') + '")');
    const full = freeSlots() < 1, foods = Object.keys(FOODS).filter(k => S.food[k] > 0), gone = EX.res && !EX.caught;
    const taraf = (d, cls, extra) => '<div class="yu-taraf ' + cls + (extra || '') + '" style="--el:' + G.ELC[d.el] + '"><img class="yu-ejder" alt="" src="' + G.img(d) + '"><div class="ar-ad"><span class="ust">' + (cls === 'sol' ? 'Eskortun' : 'Yaban ejderhası') + ' · ' + EL_AD[d.el] + ' ' + (d.sex === 'F' ? '♀' : '♂') + '</span><h2>' + esc(d.name) + '</h2><small>' + STAGE_AD[d.stage] + (cls === 'sag' ? d.traits.map(t => ' · ' + (TRAITS[t] ? TRAITS[t].ad : t)).join('') : '') + '</small></div></div>';
    box.innerHTML = '<header><small>Sefer · ' + R.ad + '</small><b>' + (EX.res ? (EX.caught ? 'Yakalandı!' : 'Yolun sonu') : 'Bir yaban ejderhası') + '</b></header>' + taraf(e, 'sol') + taraf(w, 'sag', gone ? ' kacti' : EX.caught ? ' tamam' : '') +
      (EX.res ? '<div class="sef-son"><p>' + EX.res + '</p><button type="button" class="gbtn altin buyuk" data-end="1">Ocağa dön</button></div>'
        : '<div class="sef-orta"><div class="kiyas tek">' + STATS.map(k => { const s = w.genes.pot[k][0] + w.genes.pot[k][1]; return '<div><em>' + ST_KISA[k] + '</em><b>' + w.st[k] + '</b><i class="harf g' + Math.floor(s / 2) + '">' + potLetter(s) + '</i></div>'; }).join('') + '</div>' + (full ? '<p class="ah-not kotu">İnlerde yer yok. Yakalasan bile götüremezsin; önce bir İn kur.</p>' : '') + '</div>' +
          '<div class="sef-eylem"><div class="kartlar">' + foods.map((k, i) => '<button type="button" class="kartx res" style="--c:#ffb07a;animation-delay:' + (i * 0.04) + 's" data-m="yem" data-f="' + k + '" ' + (full ? 'disabled' : '') + '><img alt="" src="' + G.OLD + 'img/' + (k === 'genclik' ? 'ic-feed' : 'food-' + k) + '.webp"><b>' + FOODS[k].ad + ' bırak</b><strong>%' + foodOdds(w, k) + '</strong><span>elinde ' + S.food[k] + '</span></button>').join('') +
            '<button type="button" class="kartx res" style="--c:#9fdcff" data-m="sakin" ' + (full ? 'disabled' : '') + '><i class="gl mdl"><img alt="" src="assets/ik/mdl-sakin.webp"></i><b>Sakince yaklaş</b><strong>%' + catchOdds(e, w, 'sakin') + '</strong><span>zekâ ve bağ</span></button>' +
            '<button type="button" class="kartx res" style="--c:#ff8a5c" data-m="guc" ' + (full ? 'disabled' : '') + '><i class="gl mdl"><img alt="" src="assets/ik/mdl-gu.webp"></i><b>' + esc(e.name) + ' bastırsın</b><strong>%' + catchOdds(e, w, 'guc') + '</strong><span>eskort yorulur, yaralanabilir</span></button></div><button type="button" class="gbtn" data-m="birak">Bırak gitsin</button></div>');
    on(box, '[data-m]', b => doCatch(b.dataset.m, b.dataset.f)); on(box, '[data-end]', () => { EX = null; box.remove(); afterAction(); }); }
  function doCatch(m, f) { const w = EX.wild, e = EX.e, note = typeof awardChibiStones === 'function' ? ' <b class="iyi">(' + awardChibiStones({ stones: { kor_t1: ri(1, 3) } }).join(', ') + ')</b>' : '';
    if (m === 'birak') { EX.res = esc(w.name) + ' sisin içinde kayboldu.' + note; return wild(); }
    let p; if (m === 'yem') { p = foodOdds(w, f); S.food[f]--; } else p = catchOdds(e, w, m) + (typeof perk === 'function' && perk('selin', 50) ? 10 : 0);
    if (m === 'guc') { e.fat = clamp(e.fat + 20, 0, 100); if (chance(35)) e.inj = Math.max(e.inj, ri(1, 2)); }
    if (chance(p)) { w.id = S.nid++; w.bond = m === 'sakin' ? 25 : m === 'yem' ? 20 : 8; if (m === 'yem' && f === w.fav) { w.favKnown = true; S.st.fav++; }
      S.dragons.push(w); snapAlbum('catch', 'Yaban ejderhası', w.name + ', ' + ek(REGIONS[EX.r].ad, 'loc') + ' yakalandı.', w); S.st.acq++; S.st.catches++; EX.caught = true; addBond(e, 3); chron(w.name + ', ' + ek(REGIONS[EX.r].ad, 'loc') + ' yakalandı.');
      EX.res = '<b class="iyi">' + esc(w.name) + ' artık senin!</b> ' + (m === 'sakin' ? 'Sana güvenerek geldi.' : m === 'yem' ? 'Yemin peşinden heybene kadar geldi.' : 'Boyun eğdi ama sana kırgın.') + (m === 'guc' && e.inj ? ' ' + esc(e.name) + ' hafif yaralandı.' : '') + note; if (EO2.audio) (EO2.audio.win || EO2.audio.chime)(); }
    else { EX.res = '<span class="kotu">' + esc(w.name) + ' kanatlarını açıp kaçtı.</span>' + (m === 'guc' && e.inj ? ' ' + esc(e.name) + ' boğuşmada yaralandı.' : '') + note; if (EO2.audio) EO2.audio.pop(); }
    wild(); if (G.fx) { if (EX.caught) { G.fx.flash('rgba(255,240,180,.35)'); G.fx.stars('#sef .yu-taraf.sag .yu-ejder', 26); G.fx.hearts('#sef .yu-taraf.sag .yu-ejder', 10); G.fx.float('#sef .yu-taraf.sag .yu-ejder', 'Yakalandı!', 'buyuk'); } else G.fx.float('#sef .yu-taraf.sag', 'Kaçtı…', 'kotu'); } }

  /* ---------- yolculuk: karşılaşmalar hikâye sahnesidir ---------- */
  /* Sefer akışı oyunun güncel akışıdır (js/hub.js: startNodeSefer, buildSeferNodes): giriş ve yol seçimi, sarp geçit ya da kamp
     ateşi, bölgenin nadir keşfi, sonunda yaban ejderhası. Meydan mantığı yüklü değilse eski üç karşılaşmalı akış (seferCards) oynanır.
     Aynı bölgeye ikinci seferde ocağın sancağı dikilir. */
  async function start(r, e) { const R = REGIONS[r], dugum = typeof buildSeferNodes === 'function';
    if (dugum && S.coopPartner) { toast('<b>Ortak sefer başladı</b><br>' + esc(S.coopPartner.handle) + ' (' + esc(S.coopPartner.dName) + ') keşifte sana eşlik ediyor (+20 altın keşif payı).'); S.gold += 20; S.coopPartner = null; }
    S.gold -= seferCost(r); S.st.seferler++;
    if (dugum) { S.regionCount = S.regionCount || {}; S.regionCount[r] = (S.regionCount[r] || 0) + 1; if (S.regionCount[r] >= 2) { S.banners = S.banners || {}; S.banners[r] = { owner: S.handle || '@ejder_ocagi', guild: S.guild || 'Kızıl Ocak Birliği', tax: 5, mine: true }; } }
    e.task = { t: 'done', what: R.ad + ' seferine çıktı' }; e.dirt = clamp((e.dirt || 0) + (dugum ? 20 : 25), 0, 100);
    EX = { r, e, cards: seferCards(r), i: 0, wild: null, res: null }; saveGame(); G.close(); const N = EX.cards.length + 1, bg = 'bg-' + r, face = G.img(e);
    if (dugum) { const nodes = buildSeferNodes(r), tr = x => String(x).replace(/class="good"/g, 'class="iyi"').replace(/class="bad"/g, 'class="kotu"'), sahne = o => G.vn(Object.assign({ bg, face, dragon: true }, o));
      const giris = nodes[0], yol = await sahne({ name: giris.title, k: 'Keşif patikası · 1 / 4', text: giris.desc, btns: giris.choices.map(c => ({ t: c.label, sub: c.tag, v: c.next })) });
      const D = nodes[yol] || nodes[1]; await sahne({ name: D.title, k: 'Keşif patikası · 2 / 4', text: D.desc, btns: [{ t: D.kind === 'hazard' ? esc(e.name) + ' ile geçidi aş' : 'Kamp ateşinde soluklan ve erzağı al', cls: 'altin' }] });
      const sonuc = D.Resolve(e); afterAction(true); await sahne({ name: D.title, k: 'Keşif patikası · 2 / 4', text: tr(sonuc.msg), btns: [{ t: 'Patikada ilerle', cls: 'altin' }] });
      const K = nodes[3]; if (K.localOpts && K.localOpts.length) { const v = await sahne({ name: K.title, k: 'Keşif patikası · 3 / 4', text: K.desc, btns: K.localOpts.map((o, i) => ({ t: o.t, v: i })) });
        const res = K.localOpts[v].fx(e, r); afterAction(true); await sahne({ name: K.title, k: 'Keşif patikası · 3 / 4', text: tr(res), btns: [{ t: 'Patikada ilerle', cls: 'altin' }] }); }
      if (S.regionCount[r] === 2) toast('<b>' + R.ad + ' Sancağı</b> artık senin ocağının elinde!');
      return wild(); }
    for (; EX.i < EX.cards.length; EX.i++) { const C = EX.cards[EX.i], k = 'Sefer · karşılaşma ' + (EX.i + 1) + ' / ' + N;
      const v = await G.vn({ bg, face, dragon: true, name: R.ad, k, text: C.t, btns: C.o.map((o, i) => { const why = o.req ? o.req() : null; return { t: o.t, sub: why || '', off: why || null, v: i }; }) });
      const res = C.o[v].fx(EX.e, EX.r); afterAction(true); await G.vn({ bg, face, dragon: true, name: R.ad, k, text: res, btns: [{ t: 'Yola devam', cls: 'altin' }] }); }
    wild(); }
  EO2.sefer = { state: () => EX };

  /* ---------- harita odası: seçilen bölgenin manzarası ekranı kaplar ---------- */
  G.screen('sefer', { k: 'Seferler ve biyomlar', t: 'Harita Odası', cls: 'sf2', bg: 'bg-harita', draw(body) { const scr = document.getElementById('scr');
    if (!S.flags.sefer) { scr.style.setProperty('--sahne', 'url("' + G.url('img/bg-harita.webp') + '")'); body.innerHTML = '<div class="ar-kilit"><i></i><p>Henüz yolu bilmiyorsun. Haritayı getirecek biri kapını çalana kadar seferler kapalı.</p></div>'; return; }
    const keys = Object.keys(REGIONS); if (!keys.includes(selR)) selR = keys.find(r => !locked(REGIONS[r])) || keys[0];
    const R = REGIONS[selR], lk = locked(R), hid = R.flag && !S.flags[R.flag], c = seferCost(selR);
    const escs = S.dragons.filter(d => canAct(d) && d.stage !== 'yavru'); if (UI.seferEsc && !escs.find(d => d.id === UI.seferEsc)) UI.seferEsc = null; if (!UI.seferEsc && escs.length) UI.seferEsc = escs[0].id; const e = byId(UI.seferEsc);
    scr.style.setProperty('--sahne', 'url("' + G.url('img/bg-' + selR + '.webp') + '")'); scr.classList.toggle('gizli-bolge', !!hid);
    body.innerHTML = '<div class="sf-bilgi" style="--el:' + G.ELC[R.el] + '"><span class="ust">' + (hid ? 'Bilinmeyen bölge' : EL_AD[R.el] + ' bölgesi') + '</span><h2>' + (hid ? '???' : R.ad) + '</h2><p>' + (lk ? (hid ? 'Buranın yolunu bilen biri henüz çıkmadı.' : R.unReq + ' ün gerekiyor (sende ' + S.un + ').') : R.d) + '</p>' + (!lk && typeof getRegionBanner === 'function' ? (b => '<span class="etk">Sancak: ' + esc(b.guild) + (b.mine ? ' · senin' : ' · seferin ' + Math.min(2, (S.regionCount && S.regionCount[selR]) || 0) + ' / 2') + '</span>')(getRegionBanner(selR)) : '') +
        '<button type="button" class="gbtn altin buyuk" data-go="' + selR + '" ' + (lk || !e || S.gold < c ? 'disabled' : '') + '>Yola çık<small>' + c + ' altın' + (!e ? ' · eskort yok' : S.gold < c ? ' · yetmiyor' : '') + '</small></button></div>' +
      (e ? '<div class="sf-eskort" style="--el:' + G.ELC[e.el] + '"><img alt="" src="' + G.img(e) + '"><div><span class="ust">Eskort</span><b>' + esc(e.name) + '</b></div></div>' : '<p class="ah-not sf-yok">Boşta bir genç ya da yetişkin ejderha yok.</p>') +
      (escs.length > 1 ? '<div class="sf-kadro">' + escs.map(d => '<button type="button" class="madalyon ejm" data-esc="' + d.id + '" aria-pressed="' + (d.id === UI.seferEsc) + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"></button>').join('') + '</div>' : '') +
      '<div class="kadro sf-bolgeler">' + keys.map(r => { const X = REGIONS[r], h = X.flag && !S.flags[X.flag], l = locked(X); return '<button type="button" class="madalyon bolge-m' + (l ? ' kilitli' : '') + '" data-r="' + r + '" aria-pressed="' + (r === selR) + '"><img alt="" src="' + G.url('img/bg-' + r + '.webp') + '"' + (h ? ' style="filter:brightness(.2) saturate(.2)"' : '') + '>' + (l ? '<b class="uyari">' + (h ? '?' : X.unReq) + '</b>' : '') + '<span>' + (h ? '???' : X.ad) + '</span></button>'; }).join('') + '</div>';
    on(body, '[data-r]', b => { selR = b.dataset.r; render(); }); on(body, '[data-esc]', b => { UI.seferEsc = +b.dataset.esc; render(); }); on(body, '[data-go]', b => { if (e) start(b.dataset.go, e); });
  } });
})();
