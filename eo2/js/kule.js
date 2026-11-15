/* Ejder Ocağı 2.0 · Kadim Gök Kulesi, Ata Yadigârı ve Kraliyet Divanı
   Kule: bulutların üstündeki kule sahnesi; dövüşçün solda, tırmanacağın kat ve o katın tılsımı sağda. Her kat oyunun kendi
   dövüş motoruyla oynanır (arena.js sahnesi), zaferden sonra sunakta bir lütuf seçilir.
   Divan: üç ferman parşömeni; haftada bir mühür basılır, en çok mühür alan ferman yürürlüğe girer.
   Kurallar oyunun kendisidir (js/endgame.js): kat tılsımları (TOWER_MUTATORS), lütuflar (TOWER_BOONS), kat muhafızı (genTowerOpp),
   ödül ve sıfırlama (finishKuleFight), yadigâr dövme koşulu ve gelişimi (canForgeHeirloom, forgeHeirloom, addHeirloomXp),
   fermanlar ve oy (DIVAN_LAWS, ensureDivan). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  if (typeof ensureTowerState !== 'function') return;                    // oyunun kule mantığı yüklenmediyse ekran da yok
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const cikar = d => d && !d.dead && d.stage !== 'yavru' && !d.old;
  const yadigar = d => { if (!d || !d.equip || !d.equip.tilsim || !S.heirlooms) return null; const it = S.inv.find(i => i.uid === d.equip.tilsim); return it && it.heirloomId ? S.heirlooms.find(x => x.id === it.heirloomId) || null : null; };

  G.screen('kule', { k: 'Bulutların üstünde', t: 'Gök Kulesi', cls: 'yr kl', bg: 'a:kule', draw(body) { registerAllHeirlooms(); const scr = document.getElementById('scr'); scr.style.setProperty('--sahne', 'url("' + G.bgUrl('a:kule') + '")');
    const T = ensureTowerState(), kat = T.curFloor || 1, mut = TOWER_MUTATORS[(kat - 1) % TOWER_MUTATORS.length], opp = genTowerOpp(kat);
    const aday = S.dragons.filter(cikar); if (UI.arenaSel && !aday.find(d => d.id === UI.arenaSel)) UI.arenaSel = null; if (!UI.arenaSel && aday.length) UI.arenaSel = aday[0].id; const f = aday.find(d => d.id === UI.arenaSel) || null;
    const odul = Math.round((35 + kat * 18) * (ensureDivan().active === 'gladyator' ? 1.35 : 1)), lutuf = (T.boons || []).map(k => TOWER_BOONS.find(b => b.k === k)).filter(Boolean), h = yadigar(f);
    body.innerHTML = (f ? '<div class="yr-ben" style="--el:' + G.ELC[f.el] + '"><img alt="" src="' + G.img(f) + '"><div class="ar-ad"><span class="ust">' + STAGE_AD[f.stage] + ' · ' + EL_AD[f.el] + '</span><h2>' + esc(f.name) + '</h2><small>' + f.w + ' galibiyet' + (h ? ' · Ata Yadigârı ' + h.lv + '. seviye' : '') + '</small>' +
          (!h && canForgeHeirloom(f) ? '<button type="button" class="gbtn kucuk kl-yadigar" data-yadigar="' + f.id + '">Ata Yadigârı döv<small>kendi pullarından bir tılsım</small></button>' : '') + '</div></div>'
        : '<div class="ar-kilit bos" style="left:28%"><p>Kuleye genç ya da yetişkin, yaşlanmamış bir ejderha çıkar.</p></div>') +
      (aday.length > 1 ? '<div class="ar-kadro">' + aday.map(d => '<button type="button" class="madalyon ejm" data-sel="' + d.id + '" aria-pressed="' + (d.id === UI.arenaSel) + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '') +
      '<div class="yr-bilgi"><span class="ust">Kadim Gök Kulesi · rekorun ' + (T.bestFloor || 1) + '. kat</span><h2>' + kat + '. Kat</h2><span class="damga2 denk">' + esc(mut.ad) + '</span><p class="yr-nasil">' + esc(mut.d) + '</p>' +
        '<div class="yr-rakipler"><div class="yr-rakip"><img alt="" src="' + G.img(opp) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[opp.el] + ' 55%, #151a2c), #151a2c 80%)"><div><b>' + esc(opp.name) + '</b><small>' + EL_AD[opp.el] + ' · Kadim Kule</small></div></div></div>' +
        (lutuf.length ? '<div class="kl-lutuf">' + lutuf.map(b => '<span class="etk iyi" title="' + esc(b.d) + '">' + esc(b.ad) + '</span>').join('') + '</div>' : '') +
        '<p class="yr-nasil">Zaferde canının bir kısmı yenilenir ve sunakta bir lütuf seçersin. Yenilirsen tırmanış 1. kata döner, lütuflar silinir.</p>' +
        '<div class="yr-odul"><span>Kat ödülü <b class="au">' + odul + ' altın</b></span><span>+2 ün</span></div>' +
        '<button type="button" class="gbtn altin buyuk" data-kat="1" ' + (f ? '' : 'disabled') + '>' + (f ? kat + '. kata çık' : 'Dövüşçü yok') + '<small>yorgunluk +8</small></button></div>' +
      '<div class="yr-alt"><div class="kl-liste"><span class="ust">En yüksek katlar</span>' + [...T.leaderboard].sort((a, b) => b.floor - a.floor).slice(0, 4).map((r, i) => '<span' + (r.handle === (S.handle || '@ejder_ocagi') ? ' class="ben"' : '') + '><b>' + (i + 1) + '.</b> ' + esc(r.handle) + ' · ' + esc(r.dName) + ' <em>' + r.floor + '. kat</em></span>').join('') + '</div>' +
        (kat > 1 ? '<button type="button" class="gbtn" data-sifirla="1">1. kattan yeniden başla<small>lütuflar silinir</small></button>' : '') + '</div>';
    on(body, '[data-sel]', b => { UI.arenaSel = +b.dataset.sel; render(); });
    on(body, '[data-kat]', () => { if (cikar(f)) G.kuleBasla(f); });
    on(body, '[data-sifirla]', async () => { const ok = await G.pen({ k: 'Gök Kulesi', t: '1. kattan yeniden başlansın mı?', body: '<p>Tırmanış 1. kata döner; topladığın lütuflar silinir. Kazandığın ödüller sende kalır.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yeniden başla', cls: 'kor', v: true }] }); if (!ok) return; T.curFloor = 1; T.boons = []; T.curHp = null; saveGame(); render(); });
    on(body, '[data-yadigar]', b => { const d = byId(+b.dataset.yadigar); if (!d || !canForgeHeirloom(d)) return; const res = forgeHeirloom(d); if (!res) return; if (EO2.audio) EO2.audio.chime(); toast('<b>Ata Yadigârı dövüldü!</b><br><b>' + esc(ITEMS[res.itemId].ad) + '</b> kuşanıldı. Kule ve arena zaferleriyle 5. seviyeye kadar gelişir.'); saveGame(); render(); setTimeout(() => { if (G.fx) G.fx.stars('.yr-ben img', 18, '#ffe9a8'); }, 30); });
  } });

  /* Kraliyet Divanı: LINEAGE değil ENDGAME_ACT['divan-vote'] ile aynı sıra (mühür +3, oy bir kez, en çok mühür alan yürürlükte) */
  G.screen('divan', { k: 'Ocak beyleri meclisi', t: 'Kraliyet Divanı', cls: 'dv', bg: 'bg-saray', draw(body) { const D = ensureDivan(), aktif = D.laws.find(x => x.k === D.active) || D.laws[0];
    body.innerHTML = '<div class="dv-bas"><span class="ust">Bu haftanın oylaması</span><h2>Yürürlükteki ferman: ' + esc(aktif.ad) + '</h2><p>Ocakların mühürleriyle haftanın fermanı belirlenir. ' + (D.voted ? 'Bu hafta mührünü bastın.' : 'Haftada bir mühür basabilirsin; mührün üç oy sayılır.') + '</p></div>' +
      '<div class="dv-fermanlar">' + D.laws.map((l, i) => '<article class="dv-ferman' + (l.k === D.active ? ' aktif' : '') + (D.voted === l.k ? ' benim' : '') + '" style="animation-delay:' + (i * 0.08) + 's">' + (l.k === D.active ? '<em>Yürürlükte</em>' : '') + '<h3>' + esc(l.ad) + '</h3><p>' + esc(l.d) + '</p><span class="muhur"><b>' + l.votes + '</b> mühür</span>' +
        '<button type="button" class="gbtn ' + (D.voted === l.k ? '' : 'altin') + '" data-oy="' + l.k + '" ' + (D.voted ? 'disabled' : '') + '>' + (D.voted === l.k ? 'Mühür vuruldu' : 'Mühür bas') + '</button></article>').join('') + '</div>';
    on(body, '[data-oy]', b => { if (D.voted) return; const law = D.laws.find(x => x.k === b.dataset.oy); if (!law) return; law.votes += 3; D.voted = law.k; const ilk = [...D.laws].sort((x, y) => y.votes - x.votes)[0]; D.active = ilk.k; if (EO2.audio) EO2.audio.chime();
      toast('<b>Oyun Kraliyet Divanı\'na işlendi</b><br>Yürürlükteki ferman: <b>' + esc(ilk.ad) + '</b>'); saveGame(); render(); });
  } });
  const NAV = [['arena', 'Arena'], ['yaris', 'Gök Yarışı'], ['kule', 'Gök Kulesi'], ['saray', 'Saray']]; G.navOf = Object.assign(G.navOf || {}, { arena: NAV, yaris: NAV, saray: NAV, kule: NAV, divan: NAV });
})();
