/* Ejder Ocağı 2.0 · Diyar: Dünya Boss'u (Kül Yutan), Damızlık ve Kervan Yolu
   Üçü de oyunun kervansaray meydanı mantığından gelir (js/hub.js) ve tek oyuncuda komşu ocaklarla (hazır akranlar) oynanır.
   Kül Yutan: haftada bir akın. Hasar, ödül ve katkı sıralaması HUB_ACT['hub-boss-atk'] ile aynıdır; haftanın dünya olayı
   (currentWorldEvent) ödülü çarpar.
   Damızlık: komşu ocakların damızlık ejderhasıyla ortak yumurta. Bedel, yakınlık indirimi, gen ve huy mirası
   HUB_ACT['hub-breed-do'] ile aynıdır.
   Kervan Yolu: kendi kervanını pusudan koruma döngüsü; eski bölge sancakları rota sancağına dönüştü (2026-11-22). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  if (typeof ensureHub !== 'function') return;                           // meydan mantığı yüklenmediyse bu ekranlar da yok
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const ben = () => S.handle || '@ejder_ocagi', sayi = n => n.toLocaleString('tr-TR'), cins = s => s === 'F' ? '♀' : '♂';
  const olay = () => typeof currentWorldEvent === 'function' ? currentWorldEvent() : null;

  /* ---------- Kül Yutan ---------- */
  G.screen('boss', { k: 'Yedi volkanın felaketi', t: 'Kül Yutan', cls: 'ar2 by', bg: 'bg-raid', draw(body) { const H = ensureHub(), B = ensureWorldBoss(), star = byId(S.star) || S.dragons.find(d => !d.dead) || null, ev = olay();
    const yuzde = Math.round(B.hp / B.maxHp * 100), kat = Object.values(B.contributors || {}).sort((a, b) => b.dmg - a.dmg), carpan = ev && ev.bossMult ? ev.bossMult : 1;
    body.innerHTML = (star ? '<div class="ar-ben" style="--el:' + G.ELC[star.el] + '"><img class="ar-ej" alt="" src="' + G.img(star) + '"><div class="ar-ad"><span class="ust">Ocağın yıldızı · ' + EL_AD[star.el] + '</span><h2>' + esc(star.name) + '</h2><small>Güç ' + star.st.gu + ' · Çeviklik ' + star.st.ce + ' · Dayanıklılık ' + star.st.da + ' · Zekâ ' + star.st.ze + '</small></div></div>' : '') +
      '<div class="by-boss"><span class="ust">Dünya boss\'u · ' + (B.phase || 1) + '. safha</span><h2>' + esc(B.name) + '</h2><small>' + esc(B.title || '') + '</small>' +
        '<div class="by-can"><i style="width:' + yuzde + '%"></i><b>' + sayi(B.hp) + ' / ' + sayi(B.maxHp) + '</b></div>' +
        '<p>Diyardaki bütün ocaklar ortaklaşa karşı koyar. Her ocak haftada bir akın eder; akın altın, 4 ün ve bir Ejder Ziyafeti kazandırır.' + (carpan > 1 ? ' <b>' + esc(ev.ad) + '</b> haftası: altın ödülü ' + Math.round((carpan - 1) * 100) + '% fazla.' : '') + '</p></div>' +
      '<div class="by-liste"><span class="ust">En çok hasar vuran ocaklar</span>' + kat.slice(0, 5).map((c, i) => '<span' + (c.handle === ben() ? ' class="ben"' : '') + '><b>' + (i + 1) + '.</b> ' + esc(c.handle) + ' · ' + esc(c.dName) + ' <em>' + sayi(c.dmg) + '</em></span>').join('') + '</div>' +
      '<div class="ar-alt"><button type="button" class="gbtn altin buyuk" data-akin="1" ' + (star && !H.bossHit && B.hp > 0 ? '' : 'disabled') + '>' + (B.hp <= 0 ? 'Kül Yutan devrildi' : H.bossHit ? 'Bu hafta akın ettin' : star ? esc(star.name) + ' ile akın et' : 'Ejderha yok') + '<small>' + (H.bossHit ? 'yeni hafta yeniden' : 'haftada bir') + '</small></button></div>';
    on(body, '[data-akin]', async () => { if (!star || H.bossHit) return; H.bossHit = true;                                                    // HUB_ACT['hub-boss-atk'] ile aynı sıra
      const dmg = Math.round((star.st.gu * 4.2 + star.st.ce * 2.5 + star.st.da * 2.2 + star.st.ze * 2.8) * (star.hybrid ? 1.35 : 1) + ri(80, 180)); B.hp = Math.max(0, B.hp - dmg);
      const h = ben(); B.contributors[h] = B.contributors[h] || { handle: h, guild: S.guild || 'Kızıl Ocak Birliği', dName: star.name, dmg: 0 }; B.contributors[h].dmg += dmg;
      const odul = Math.round(Math.min(320, dmg * 0.14) * carpan); S.gold += odul; S.un += 4; S.food.ziyafet = (S.food.ziyafet || 0) + 1;
      const tas = typeof awardChibiStones === 'function' ? awardChibiStones(Object.assign({ kor_t3: ri(2, 3) }, chance(35) ? { kiyamet_ozu: 1 } : {})) : '';
      chron(star.name + ', Kadim Felaket Kül Yutan\'a ' + dmg + ' hasar vurdu! (+' + odul + ' altın, +4 ün, +1 Ejder Ziyafeti' + (tas ? ', ' + tas : '') + ')'); saveGame(); G.hud(); if (EO2.audio) EO2.audio.chime();
      if (G.fx) { G.fx.shake && G.fx.shake(); G.fx.flash && G.fx.flash('#ff7a3a'); }
      await G.vn({ bg: 'bg-raid', face: G.poz(star, star.stage === 'yetiskin' ? 'P2' : null), dragon: true, name: esc(star.name), k: 'Kül Yutan taarruzu', text: esc(star.name) + ' Kül Yutan\'a ' + sayi(dmg) + ' hasar indirdi. Felaketin canı %' + Math.round(B.hp / B.maxHp * 100) + '.',
        after: '<span class="etk iyi">+' + odul + ' altın</span><span class="etk">+4 ün</span><span class="etk">+1 Ejder Ziyafeti</span>' + (tas ? '<span class="etk">' + tas + '</span>' : '') });
      afterAction(); }); } });

  /* ---------- Damızlık ---------- */
  G.screen('damizlik', { k: 'Komşu ocaklarla ortak kuluçka', t: 'Damızlık', cls: 'ar2 dm', bg: 'bg-yuva', draw(body) { const H = ensureHub(), P = H.peers || []; if (!(H.selPeer >= 0 && H.selPeer < P.length)) H.selPeer = 0; const p = P[H.selPeer];
    if (!p) { body.innerHTML = '<div class="ar-kilit bos"><p>Bu hafta meydanda damızlık ejderha yok.</p></div>'; return; }
    const aday = S.dragons.filter(d => !d.dead && d.stage !== 'yavru' && d.sex !== p.d.sex), my = aday.find(d => d.id === UI.sel) || aday[0] || null;
    const yakin = getPeerAff(p.handle), bedel = Math.round((p.studFee || 95) * (yakin >= 30 ? 0.65 : 1)), O = my ? offspringOdds(my, p.d, 75) : null;
    body.innerHTML = (my ? '<div class="ar-ben" style="--el:' + G.ELC[my.el] + '"><img class="ar-ej" alt="" src="' + G.img(my) + '"><div class="ar-ad"><span class="ust">Senin adayın · ' + EL_AD[my.el] + ' ' + cins(my.sex) + '</span><h2>' + esc(my.name) + '</h2><small>' + (typeof phenoTitle === 'function' ? phenoTitle(my) : '') + '</small></div></div>'
        : '<div class="ar-kilit bos" style="left:26%"><p>Eşleşme için ' + (p.d.sex === 'M' ? 'dişi' : 'erkek') + ' bir genç ya da yetişkin ejderhan olmalı.</p></div>') +
      '<div class="ar-rakip" style="--el:' + G.ELC[p.d.el] + '"><img class="ar-ej" alt="" src="' + G.img(p.d) + '"><div class="ar-ad"><span class="ust">' + esc(p.handle) + ' · ' + esc(p.guild || '') + '</span><h2>' + esc(p.d.name) + ' ' + cins(p.d.sex) + '</h2><small>' + (typeof phenoTitle === 'function' ? phenoTitle(p.d) : EL_AD[p.d.el]) + '</small></div></div>' +
      '<div class="ar-orta"><svg class="yu-kalp2" viewBox="0 0 32 30" aria-hidden="true"><path d="M16 28 C4 19 1 13 1 8.500 A7 7 0 0 1 16 6 A7 7 0 0 1 31 8.500 C31 13 28 19 16 28Z" fill="#ff7a9c" stroke="#5a1024" stroke-width="1.5"/></svg>' +
        (O ? '<div class="kiyas dm-olasi"><span class="ust">Yavru olasılıkları</span>' + Object.entries(O.el).map(x => '<span><b>' + EL_AD[x[0]] + '</b> %' + x[1] + '</span>').join('') + '<span><b>Parıltı</b> %' + ((O.par && O.par.P) || 0) + '</span></div>' : '') +
        '<span class="etk">Yakınlık ' + yakin + (yakin >= 30 ? ' · dost indirimi' : '') + '</span></div>' +
      (aday.length > 1 ? '<div class="ar-kadro">' + aday.map(d => '<button type="button" class="madalyon ejm" data-sel="' + d.id + '" aria-pressed="' + (my && d.id === my.id) + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '') +
      '<div class="ar-alt"><button type="button" class="gbtn altin buyuk" data-esle="1" ' + (my && S.gold >= bedel ? '' : 'disabled') + '>Damızlık eşleştir<small>' + bedel + ' altın' + (my && S.gold < bedel ? ' · yetmiyor' : ' · yumurta ocağına gelir') + '</small></button>' +
        '<div class="kadro">' + P.map((x, i) => '<button type="button" class="madalyon ejm" data-akran="' + i + '" aria-pressed="' + (i === H.selPeer) + '" title="' + esc(x.handle) + '"><img alt="" src="' + G.img(x.d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[x.d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(x.d.name) + ' ' + cins(x.d.sex) + ' · ' + (x.studFee || 95) + '</span></button>').join('') + '</div></div>';
    on(body, '[data-sel]', b => { UI.sel = +b.dataset.sel; render(); }); on(body, '[data-akran]', b => { H.selPeer = +b.dataset.akran; render(); });
    on(body, '[data-esle]', () => { if (!my || S.gold < bedel) return; S.gold -= bedel; if (typeof linReg === 'function') linReg(p.d);                    // HUB_ACT['hub-breed-do'] ile aynı sıra
      const g = inheritGenes(my, p.d), t = inheritTraits(my, p.d, 80), egg = { id: 'e' + S.uid++, genes: g.genes, sex: pick(['F', 'M']), traits: t.traits, traitMut: t.mut, muts: g.muts, w: 0, inK: kuluckaFree() > 0, gen: Math.max(my.gen || 1, p.d.gen || 1) + 1, parents: [my.name, p.d.name + ' (' + p.handle + ')'], pids: [my.id, p.d.id], origin: p.handle + ' ile ortak damızlık yumurtası' };
      S.eggs.push(egg); S.st.bred++; chron(my.name + ' ile ' + p.handle + '\'in ' + p.d.name + ' ejderhası eşleşti; yeni bir asil yumurta alındı!'); toast('<b>Ortak yumurta alındı!</b> ' + (egg.inK ? 'Kuluçka Ocağı\'na yerleştirildi.' : 'Yuva sepetine kondu.'));
      if (EO2.audio) EO2.audio.chime(); if (G.fx) G.fx.hearts('.yu-kalp2', 12); saveGame(); afterAction(); G.open('yuva'); }); } });

  /* ---------- Kervan Yolu ----------
     Tek döngü (Mehmet, 2026-11-22): eski "kervanı yola çıkar" düğmesi, "kervan baskını" ve bölge sancakları birleşti.
     Rota seçilir, kervan yola çıkar, yoldaki pusu Topçu savaşıdır (eo2/js/topcu.js kervan). Hak, ödül ve rota sancağı
     kuralları topcu.js'tedir (EO2.topcu.kervanDurum); bu ekran yalnız gösterir ve başlatır. Kapı şartı Topçu ile aynıdır (omuz ejderi). */
  const ROTA_BG = { kizil_vadi: 'kul', buzul_gecidi: 'buzul', mercan_kiyisi: 'mercan', firtina_bogazi: 'kayalik' };
  let secRota = null;
  G.screen('kervan', { k: 'Kuzey Yolu · Kervan Kampı', t: 'Kervan Yolu', cls: 'ar2 kv', bg: 'a:kervan', draw(body) { const T = EO2.topcu, star = byId(S.star) || S.dragons.find(d => !d.dead) || null;
    if (!T || !T.kervanDurum) { body.innerHTML = '<div class="ar-kilit bos"><p>Kervan yolu hazırlanıyor.</p></div>'; return; }
    const D = T.kervanDurum(), kil = T.kilitli(), rotalar = Object.values(CARAVAN_ROUTES); if (!CARAVAN_ROUTES[secRota]) secRota = rotalar[0].id;
    const rt = CARAVAN_ROUTES[secRota], z = D.zafer[rt.id] || 0, sancak = D.sancak(rt.id);
    body.innerHTML = (star ? '<div class="ar-ben" style="--el:' + G.ELC[star.el] + '"><img class="ar-ej" alt="" src="' + G.img(star) + '"><div class="ar-ad"><span class="ust">Kervan başı · ' + EL_AD[star.el] + '</span><h2>' + esc(star.name) + '</h2><small>Ocağın yıldızı konvoya önderlik eder</small></div></div>' : '') +
      '<div class="kv-bilgi"><span class="ust">' + EL_AD[rt.el] + ' rotası</span><h2>' + rt.ad + '</h2><p>' + rt.desc + ' Yolda üç haydut pusu kurar; topunla kervanını korursun.</p>' +
        '<div class="kv-yuvalar"><div class="kv-yuva"><span class="ust">Bu hafta</span><b>' + D.kalan + ' kervan hakkın kaldı</b><small>Her hafta ' + D.hak + ' kervan hakkı gelir</small></div>' +
          '<div class="kv-yuva' + (sancak ? ' sancakli' : '') + '"><span class="ust">Rota sancağı</span><b>' + (sancak ? 'Senin' : Math.min(z, D.usta) + ' / ' + D.usta + ' zafer') + '</b><small>' + (sancak ? 'Bu rotada altın %10 fazla' : D.usta + ' zaferde sancak senin, altın %10 fazla') + '</small></div></div>' +
        '<div class="yr-odul"><span>Zaferde <b class="au">' + D.altin(rt.id) + ' altın</b></span><span>8 ün</span><span>' + esc(rt.oreAd || 'Cevher') + '</span><span>Harlı Kor Taşı</span></div>' +
        (kil ? '<p class="kv-kilit">Kervan yoluna yalnız omuz ejderi olan bir topçu çıkabilir.</p>' : '') +
        '<button type="button" class="gbtn altin buyuk" data-yola="1" ' + (!kil && D.kalan > 0 ? '' : 'disabled') + '>' + (D.kalan > 0 ? 'Kervanı yola çıkar' : 'Bu haftanın kervanları yola çıktı') + '<small>' + (D.kalan > 0 ? 'Topçu savaşı · tek aşama' : 'yeni hafta yeni kervan') + '</small></button>' +
        (kil ? '<button type="button" class="gbtn" data-kilit="1">Omuz ejderi nasıl edinilir?</button>' : '') + '</div>' +
      '<div class="ar-alt"><div class="kadro">' + rotalar.map(x => '<button type="button" class="madalyon bolge-m' + (D.sancak(x.id) ? ' sancakli' : '') + '" data-rota="' + x.id + '" aria-pressed="' + (x.id === rt.id) + '"' + (D.sancak(x.id) ? ' title="Sancak senin"' : '') + '><img alt="" src="' + G.url('img/bg-' + (ROTA_BG[x.id] || 'kul') + '.webp') + '"><span>' + x.ad.replace(' Rotası', '') + '</span></button>').join('') + '</div></div>';
    on(body, '[data-rota]', b => { secRota = b.dataset.rota; render(); });
    on(body, '[data-kilit]', () => T.kilitPen());
    on(body, '[data-yola]', () => { if (kil || D.kalan <= 0) return; T.baslat('kervan', { rota: rt.id }); }); } });

  /* ---------- Kıraathane ---------- */
  /* Üç masa oyunu (Kor 21, Kervan Tavlası, Ejder Pokeri) oyunun kendi dosyasıdır (js/kiraathane.js): kurallar, rakibin oyunu ve
     bahis hesabı oradadır. Çizimi de oyunun kendi çizimidir ve eski çizim katmanında (eski.js) açılır.
     Cevher ve kor taşı bahisleri Kor Örsü malzemesidir; o sistem kurulmadığı için masada yalnız çayına ve altınına oynanır. */
  if (typeof kiraathaneView === 'function') {
    if (typeof ensureChibi !== 'function') { const bos = { ores: {}, stones: {} }; window.ensureChibi = () => bos; delete KIR_BETS.ore; delete KIR_BETS.stone; }
    let eskiCiz = null, eskiGor = null;
    const goster = () => { if (window.EO2_ESKI && EO2_ESKI.show) EO2_ESKI.show('<div class="kir-eo2"><button class="btn ghost sm" data-a="kir-kapat">‹ Han\'a dön</button></div>' + kiraathaneView(), 'kirwrap'); };
    const kapat = () => { if (typeof kirGameIdle === 'function' && !kirGameIdle()) { toast('Önce oynadığın eli bitir.'); return; } EO2_ESKI.close(); };
    G.kiraathane = () => { const H = ensureHub(), acts = { 'kir-kapat': kapat }; for (const k of Object.keys(ACT)) if (k.indexOf('kir-') === 0) acts[k] = ACT[k];
      eskiGor = UI.view; UI.view = 'meydan'; H.tab = 'kiraathane'; eskiCiz = EO2_BUS.render; EO2_BUS.render = goster; G.close();
      EO2_ESKI.open(acts, () => { EO2_BUS.render = eskiCiz; UI.view = eskiGor; H.tab = 'avlu'; if (typeof kirClearTimers === 'function') kirClearTimers(); saveGame(); G.hud(); G.open('han'); }); goster(); };
    G.screen('kiraathane', { k: 'Kervansaray kıraathanesi', t: 'Kıraathane', cls: 'kr', bg: 'bg-sofra', draw(body) { body.innerHTML = '<div class="ar-kilit bos"><p>Masalar hazırlanıyor.</p></div>'; setTimeout(() => { if (!EO2_ESKI.active()) G.kiraathane(); }, 0); } });
    const HAN = [['han', 'Han'], ['siralama', 'Ün Tablosu'], ['kiraathane', 'Kıraathane']]; G.navOf = Object.assign(G.navOf || {}, { han: HAN, siralama: HAN, kiraathane: HAN });
  }

  const SEF = [['sefer', 'Harita Odası'], ['boss', 'Kül Yutan'], ['kervan', 'Kervan Yolu']], YUVA = [['ejderhalar', 'Ahır'], ['yuva', 'Yuva'], ['damizlik', 'Damızlık'], ['sus', 'Süs Dolabı']];
  G.navOf = Object.assign(G.navOf || {}, { sefer: SEF, boss: SEF, kervan: SEF, ejderhalar: YUVA, yuva: YUVA, damizlik: YUVA, sus: YUVA });
  /* haftanın dünya olayı: görev defterinde ve HUD ipucunda görünsün diye dışarı verilir */
  G.dunyaOlayi = olay;
})();
