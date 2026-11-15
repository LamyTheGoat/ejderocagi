/* Ejder Ocağı 2.0 · Saray Zarafet Merasimi
   Savaş gücü değil; soy asilliği, nadir renkler, süs ve temizlik yarışır. İlan sahnesi 2.0'dır: adayın solda, haftanın fermanı
   üstte, rakip adaylar kaidelerinde sağda. Podyum gösterisi oyunun kendi üç aşamalı küçük oyunudur (js/pageant.js:
   yürüyüş ritmi, yıldız küreleri ve poz, final nefesi, jüri) ve eski çizim katmanı barındırıcısında çalışır.
   Puanlama (fullEleganceCalc), ferman, rakipler, çiçek ödülü ve birincilik ödülü pageant.js'ten gelir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  G.screen('saray', { k: 'Zarafet merasimi', t: 'Saray', cls: 'sy', bg: 'bg-saray', draw(body) { const P = ensurePageant(), dec = currentDecree();
    const elig = S.dragons.filter(d => !d.dead); if (UI.arenaSel && !elig.find(d => d.id === UI.arenaSel)) UI.arenaSel = null; if (!UI.arenaSel && elig.length) UI.arenaSel = (elig.find(d => canAct(d)) || elig[0]).id; const f = byId(UI.arenaSel), C = f ? fullEleganceCalc(f) : null, canEnter = f && !P.entered && canAct(f);
    body.innerHTML = '<div class="sy-ferman"><span class="ust">Kraliyet fermanı</span><b>' + esc(dec.ad) + '</b><p>' + esc(dec.d) + '</p>' + (typeof ensureDivan === 'function' ? '<button type="button" class="gbtn kucuk" data-divan="1">Kraliyet Divanı</button>' : '') + '</div>' +
      (f ? '<div class="sy-aday" style="--el:' + G.ELC[f.el] + '"><img alt="" src="' + G.img(f) + '"><div class="ar-ad"><span class="ust">Adayın · ' + EL_AD[f.el] + '</span><h2>' + esc(f.name) + '</h2><small>' + (typeof phenoTitle === 'function' ? phenoTitle(f) : STAGE_AD[f.stage]) + '</small></div>' +
          '<div class="sy-puan">' + [['Soy', C.gen], ['Zekâ', C.mind], ['Süs', C.cos], ['Ferman', C.decree]].map(x => '<span><b>+' + x[1] + '</b>' + x[0] + '</span>').join('') + '</div>' +
          '<div class="sy-ayrinti">' + (C.details.length ? C.details.slice(0, 4).map(x => '<span class="etk iyi">' + esc(x[0]) + ' +' + x[1] + '</span>').join('') : '<span class="etk">Ahırda süsleyip yıkayarak puanını artırabilirsin</span>') + '</div></div>'
        : '<div class="ar-kilit bos" style="left:26%"><p>Merasime çıkacak bir ejderhan yok.</p></div>') +
      (elig.length > 1 ? '<div class="ar-kadro">' + elig.map(d => '<button type="button" class="madalyon ejm" data-sel="' + d.id + '" aria-pressed="' + (d.id === UI.arenaSel) + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '') +
      '<div class="sy-rakipler">' + P.rivals.slice(0, 2).map((r, i) => '<div class="sy-rakip" style="--el:' + G.ELC[r.d.el] + ';animation-delay:' + (i * 0.1) + 's"><img alt="" src="' + OLD + 'img/dr-' + r.d.el + '-' + r.d.stage + '.webp"><span class="kaide"><em>' + (i + 1) + '. aday · ' + esc(r.owner) + '</em><b>' + esc(r.d.name) + '</b><small>' + esc(r.trainer) + '</small><small>Zarafet <strong>' + r.score + '</strong> · ' + r.votes + ' beğeni</small></span>' +
        '<button type="button" class="gbtn kucuk" data-oy="' + i + '" ' + (P.votedFor != null ? 'disabled' : '') + '>' + (P.votedFor === i ? 'Çiçek verildi' : 'Çiçek at · +15 altın') + '</button></div>').join('') + '</div>' +
      '<div class="sy-alt"><div class="ar-odul"><span>Birinciye <b class="au">240 altın</b></span><span>+6 ün · Saray İncisi</span></div><button type="button" class="gbtn altin buyuk" data-cik="1" ' + (canEnter ? '' : 'disabled') + '>' + (P.entered ? 'Bu hafta podyuma çıktın' : !f ? 'Ejderha seç' : !canAct(f) ? 'Ejderha meşgul' : 'Podyum gösterisine çık') + (P.entered && P.myRank ? '<small>' + P.myRank + '. oldun</small>' : '<small>üç aşamalı gösteri</small>') + '</button></div>';
    on(body, '[data-divan]', () => G.open('divan'));
    on(body, '[data-sel]', b => { UI.arenaSel = +b.dataset.sel; render(); });
    on(body, '[data-oy]', b => { const i = +b.dataset.oy; if (P.votedFor != null || !P.rivals[i]) return; P.votedFor = i; P.rivals[i].votes++; S.gold += 15; toast('<b>' + esc(P.rivals[i].d.name) + '</b> adlı adaya çiçek attın! Zarafet teşviki olarak <b>+15 altın</b> kazandın.'); if (G.fx) { G.fx.hearts(b, 8); G.fx.coins(b, 5); } saveGame(); render(); });
    on(body, '[data-cik]', () => { if (!f || !canAct(f) || P.entered) return; EO2_ESKI.open(PAGEANT_ACT, () => G.redraw()); G.close(); startSarayShow(f); });
  } });
  const NAV = [['arena', 'Arena'], ['yaris', 'Gök Yarışı'], ['saray', 'Saray']]; G.navOf = Object.assign(G.navOf || {}, { arena: NAV, yaris: NAV, saray: NAV });
})();
