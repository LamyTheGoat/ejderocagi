/* Ejder Ocağı 2.0 · Yuva: gezinti, çiftleştirme ve yumurtalar
   Kurallar oyunun kendisidir: yakınlık (getAff), çiftleşme şartları (breedChecks), şans (breedChance), yavru olasılıkları (offspringOdds).
   Emirler eski arayüzdeki pairTask ile aynıdır: iki ejderhaya karşılıklı "walk" ya da "breed" görevi yazılır; sonuç hafta sonunda çıkar. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const NAV = [['ejderhalar', 'Ahır'], ['yuva', 'Yuva']]; G.navOf = G.navOf || {}; G.navOf.ejderhalar = NAV; G.navOf.yuva = NAV;
  let selB = null;
  function pairTask(A, B, kind) { if (A.task && A.task.p === B.id && A.task.t === kind) { A.task = null; B.task = null; afterAction(); return; }
    clearPartner(A); clearPartner(B); A.task = { t: kind, p: B.id }; B.task = { t: kind, p: A.id };
    toast(kind === 'walk' ? esc(A.name) + ' ve ' + esc(B.name) + ' bu hafta birlikte gezecek.' : esc(A.name) + ' ve ' + esc(B.name) + ' bu hafta yuva kuracak.'); if (EO2.audio) EO2.audio.chirp(); afterAction(); }
  /* KALAN HAFTA (UX denetimi, 2026-11-20): 60 yakınlığa kaç gezinti kaldığını söyler. Kural oyunun kendisidir (js/week.js gezinti:
     12 + uyum + Yuva Bahçesi varsa 6); yalnız okunur, yaklaşık bir tahmindir (aynı inde kalan çiftin haftalık +4'ü sayılmaz). */
  function tahmin(A, B, aff, walking) { const g = 12 + (typeof compat === 'function' ? compat(A, B) : 0) + (hasB('yuva') ? 6 : 0), n = Math.max(1, Math.ceil((60 - aff) / g));
    return (walking ? 'Bu hafta birlikte geziyorlar (+' + g + ').' : 'Her gezinti +' + g + ' yakınlık.') + ' 60\'a yaklaşık <b>' + n + ' hafta</b>.'; }
  const free = (d, p) => !d.inj && (!d.task || d.task.p === p.id);
  function odds(A, B) { const O = offspringOdds(A, B, getAff(A.id, B.id)), els = Object.keys(O.el || {}).sort((x, y) => O.el[y] - O.el[x]);
    return '<h3>Yavru olasılıkları</h3><div class="olas">' + els.map(e => '<span class="etk el-' + e + '">' + EL_AD[e] + ' %' + Math.round(O.el[e]) + '</span>').join('') + '</div><div class="potlar" style="justify-content:flex-start;margin-top:.5em">' + STATS.map(k => '<span>' + ST_KISA[k] + ' <b class="harf g' + Math.floor(O.pot[k].exp / 2) + '">' + potLetter(Math.round(O.pot[k].exp)) + '</b></span>').join('') + '</div>'; }
  /* Yuva sahnesi: iki ejderha karşı karşıya durur, aradaki kalp yakınlığı gösterir. Eşler iki yandaki madalyonlardan seçilir,
     gezinti ve yuva kurma alttaki resimli kartlardır; şartlar kalbin altında mühür olarak dizilir. */
  G.screen('yuva', { k: 'Gezinti ve çiftleştirme', t: 'Yuva', cls: 'yu2', bg: 'bg-yuva', draw(body) {
    const list = S.dragons.filter(d => !d.dead); let A = byId(UI.sel); if (!A || A.dead) { A = list[0]; UI.sel = A ? A.id : null; }
    if (!A) { body.innerHTML = '<p class="ah-not" style="margin:auto">Ocakta ejderha yok.</p>'; return; }
    const others = list.filter(d => d.id !== A.id); let B = others.find(d => d.id === selB) || (A.task && A.task.p ? byId(A.task.p) : null) || others[0] || null; selB = B ? B.id : null;
    const eggs = S.eggs || [], med = (d, attr, sel, extra) => '<button type="button" class="madalyon ejm" ' + attr + '="' + d.id + '" aria-pressed="' + sel + '" title="' + esc(d.name) + '"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)">' + (extra || '') + '<span>' + esc(d.name) + ' ' + (d.sex === 'F' ? '♀' : '♂') + '</span></button>';
    const yum = '<div class="yu-yumurta">' + (eggs.length ? eggs.map(e => '<button type="button" class="yum-k' + (e.inK ? ' sicak' : '') + '" data-egg="' + e.id + '" ' + (!e.inK && kuluckaFree() <= 0 ? 'disabled' : '') + ' title="' + (e.origin || 'Yumurta') + '"><i class="res" style="background-image:url(' + G.yumurtaResim(e) + ')"></i><b>' + (e.origin || 'Yumurta') + '</b><span>' + (e.inK ? 'Kuluçkada · ' + (e.w || 0) + '. hafta' : kuluckaFree() > 0 ? 'Soğukta · kuluçkaya koy' : 'Soğukta · boş kuluçka yok') + '</span></button>').join('') : '') + '</div>';
    const ej = (d, cls) => '<div class="yu-taraf ' + cls + '" style="--el:' + G.ELC[d.el] + '"><img class="yu-ejder" alt="" src="' + G.img(d) + '"><div class="ar-ad"><span class="ust">' + STAGE_AD[d.stage] + ' · ' + EL_AD[d.el] + ' ' + (d.sex === 'F' ? '♀' : '♂') + '</span><h2>' + esc(d.name) + '</h2><small>Moral ' + MOOD[d.mood] + (d.inj ? ' · sakat' : '') + '</small></div></div>';
    let mid = '';
    if (!B) mid = '<div class="ar-kilit bos" style="top:50%"><p>Gezinti ve çiftleştirme için ocakta en az iki ejderha gerek. Pazardan ya da seferden bir ejderha edin.</p></div>';
    else { const aff = getAff(A.id, B.id), checks = breedChecks(A, B), okAll = checks.every(c => c[1]), walking = A.task && A.task.t === 'walk' && A.task.p === B.id, breeding = A.task && A.task.t === 'breed' && A.task.p === B.id, canPair = free(A, B) && free(B, A), ch = Math.round(clamp(breedChance(A, B), 0, 100));
      let olas = ''; if (hasB('lab')) { const O = offspringOdds(A, B, aff), els = Object.keys(O.el || {}).sort((x, y) => O.el[y] - O.el[x]); olas = '<div class="yu-olas"><span class="ust">Yavru olasılıkları</span><div>' + els.map(e => '<span class="etk el-' + e + '">' + EL_AD[e] + ' %' + Math.round(O.el[e]) + '</span>').join('') + '</div><div>' + STATS.map(k => '<span class="etk">' + ST_KISA[k] + ' <b class="harf g' + Math.floor(O.pot[k].exp / 2) + '" style="display:inline-grid;place-items:center;width:1.5em;height:1.5em;border-radius:.3em">' + potLetter(Math.round(O.pot[k].exp)) + '</b></span>').join('') + '</div></div>'; }
      mid = ej(B, 'sag') + '<div class="yu-orta"><div class="yu-kalp2' + (aff >= 60 ? ' dolu' : '') + '" style="--dolu:' + Math.min(100, aff) + '%"><svg viewBox="0 0 100 92"><defs><clipPath id="kalpK"><path d="M50 88S6 60 6 30A23 23 0 0 1 50 20 23 23 0 0 1 94 30c0 30-44 58-44 58z"/></clipPath></defs><path class="bos" d="M50 88S6 60 6 30A23 23 0 0 1 50 20 23 23 0 0 1 94 30c0 30-44 58-44 58z"/><rect class="dol" clip-path="url(#kalpK)" x="0" y="' + (92 - Math.min(100, aff) * 0.92) + '" width="100" height="92"/><path class="kenar" d="M50 88S6 60 6 30A23 23 0 0 1 50 20 23 23 0 0 1 94 30c0 30-44 58-44 58z"/></svg><b>' + Math.round(aff) + '</b><small>yakınlık</small></div>' +
        (aff < 60 ? '<p class="yu-tahmin">' + tahmin(A, B, aff, walking) + '</p>' : '') +
        '<div class="yu-sart">' + checks.map(c => '<span class="' + (c[1] ? 'tamam' : '') + '"><i>' + (c[1] ? '✓' : '✗') + '</i>' + c[0] + '</span>').join('') + '</div>' + olas + '</div>' +
        '<div class="yu-eylem"><button type="button" class="kartx res" style="--c:#9be07a" data-walk="1" aria-pressed="' + !!walking + '" ' + (canPair ? '' : 'disabled') + '><i class="gl mdl"><img alt="" src="assets/ik/mdl-gezdir.webp"></i><b>Birlikte gezdir</b><span>' + (canPair ? 'Bu hafta birlikte gezerler; yakınlık artar.' : 'İkisinden biri görevde ya da sakat.') + '</span></button>' +
        '<button type="button" class="kartx res" style="--c:#ff9ec0" data-breed="1" aria-pressed="' + !!breeding + '" ' + (okAll && canPair ? '' : 'disabled') + '><i class="gl mdl"><img alt="" src="assets/ik/mdl-yuva.webp"></i><b>Yuva kur</b>' + (okAll ? '<strong>%' + ch + '</strong>' : '') + '<span>' + (okAll ? 'Hafta sonunda yumurta bırakabilirler.' : 'Önce şartların hepsi tamamlanmalı.') + '</span></button></div>'; }
    body.innerHTML = '<div class="yu-kadro sol">' + list.map(x => med(x, 'data-id', x.id === A.id, x.task && (x.task.t === 'walk' || x.task.t === 'breed') ? '<b class="tamam">♥</b>' : '')).join('') + '</div>' + ej(A, 'sol') + mid +
      (B ? '<div class="yu-kadro sag">' + others.map(x => med(x, 'data-b', x.id === B.id, '<b>' + Math.round(getAff(A.id, x.id)) + '</b>')).join('') + '</div>' : '') + yum;
    on(body, '[data-id]', b => { UI.sel = +b.dataset.id; selB = null; render(); }); on(body, '[data-b]', b => { selB = +b.dataset.b; render(); });
    const kalp = () => { if (G.fx) { G.fx.hearts('.yu-kalp2', 10); } };
    on(body, '[data-walk]', () => { pairTask(A, B, 'walk'); if (A.task) kalp(); }); on(body, '[data-breed]', () => { pairTask(A, B, 'breed'); if (A.task) kalp(); });
    on(body, '[data-egg]', b => { const e = S.eggs.find(x => String(x.id) === b.dataset.egg); if (!e) return; if (!e.inK && EO2.ocakDefteri && EO2.ocakDefteri.kilitli && EO2.ocakDefteri.kilitli(e)) { toast((e.ilanda === 'takas' ? 'Bu yumurta süren bir takasta' : 'Bu yumurta Bedesten\'de ilanda') + '; kuluçkaya konamaz.', 'kotu'); return; } if (e.inK) e.inK = false; else if (kuluckaFree() > 0) { e.inK = true; if (G.fx) G.fx.stars(b, 10, '#ffd0a0'); } afterAction(); });
  } });
})();
