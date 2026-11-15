/* Ejder Ocağı 2.0 · Mermer Salon Müzayedesi
   Kurallar ve canlı artırma akışı oyunun kendisidir (js/auction.js): haftalık üç nadir lot, rakip alıcılar ve üst sınırları,
   tokmakçının "Bir… İki…" sayımı, satışta %10 komisyon. Bu dosya yalnız salonu çizer: auction.js'in ekran çizen işlevi
   (aucRender) burada salon sahnesiyle değiştirilir; teklif, sayım ve sonuç auction.js'te çalışır. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, app = document.getElementById('app');
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const PIG = { a: 'grayscale(.8) brightness(1.4) ', m: 'brightness(.5) saturate(.85) contrast(1.2) ', am: 'saturate(.45) brightness(.82) ' };
  const pigF = d => (typeof pigOf === 'function' && PIG[pigOf(d)]) || '';
  const TAG = { dragon: 'Nadir ejderha', egg: 'Nadir yumurta', item: 'Usta işi' };
  const lotImg = (L, sellD) => sellD ? '<img alt="" style="filter:' + pigF(sellD) + 'drop-shadow(0 1em 1.2em rgba(4,6,20,.6))" src="' + G.img(sellD) + '">' : L.kind === 'dragon' ? '<img alt="" style="filter:' + pigF(L.d) + 'drop-shadow(0 1em 1.2em rgba(4,6,20,.6))" src="' + G.img(L.d) + '">' : L.kind === 'egg' ? '<img class="yumurta-l" alt="" src="' + G.OLD + 'img/ic-yuva.webp">' : '<img class="esya-l" alt="" src="' + G.OLD + 'img/item-' + L.item + '.webp">';
  let sel = 0;

  /* ---------- canlı artırma salonu ---------- */
  function salon() { const A = AUC; let w = document.getElementById('muz'); if (!A) { if (w) w.remove(); return; } if (!w) { w = document.createElement('div'); w.className = 'muz'; w.id = 'muz'; w.style.setProperty('--sahne', 'url("' + G.bgUrl('a:muzayede') + '")'); app.appendChild(w); }
    const L = A.L, title = A.sellD ? esc(A.sellD.name) + ' · senin ejderhan' : lotTitle(L), next = A.price + A.step, canBid = !A.sellD && !A.over && A.leader !== 'me' && S.gold >= next, lead = A.leader === 'me' ? 'Sen öndesin' : A.leader ? A.bidders.find(b => b.id === A.leader).ad + ' önde' : 'Açılış';
    w.innerHTML = '<header><small>' + (A.sellD ? 'Senin lotun' : 'Açık artırma') + '</small><b>' + title + '</b></header>' +
      '<div class="muz-lot"><i class="isik"></i>' + lotImg(L, A.sellD) + '</div>' +
      '<div class="muz-fiyat' + (A.leader === 'me' ? ' ben' : '') + '"><small>Güncel teklif</small><b id="aucp">' + A.price + '</b><span>' + lead + '</span><div class="gavel' + (A.over ? ' hit' : '') + '" id="gavel">' + (A.over ? (A.leader === 'me' ? 'SATILDI · SANA!' : A.leader ? 'SATILDI!' : 'ALICI ÇIKMADI') : '') + '</div>' + (A.over && A.result ? '<p class="aucres">' + A.result + '</p>' : '') + '</div>' +
      '<div class="muz-alicilar">' + A.bidders.map(B => '<div class="alici' + (B.out ? ' cekildi' : '') + (A.leader === B.id ? ' onde' : '') + '" id="bd-' + B.id + '"><span class="bsay" id="bs-' + B.id + '"></span><img alt="" src="' + G.npcImg(B.npc) + '"><b>' + B.ad + '</b><small>' + (B.out ? 'çekildi' : A.leader === B.id ? 'önde' : B.last ? B.last + ' altın' : 'bekliyor') + '</small></div>').join('') + '</div>' +
      '<div class="muz-alt"><span class="muz-not">Tahmini değer ' + Math.round(A.v) + ' altın' + (A.sellD ? ' · teklifler kendiliğinden yükselir' : ' · kesende ' + S.gold + ' altın') + '</span>' +
        (A.over ? '<button type="button" class="gbtn altin buyuk" data-auc="done">Devam</button>' : A.sellD ? '' : '<button type="button" class="gbtn altin buyuk" data-auc="bid" ' + (canBid ? '' : 'disabled') + '>' + (A.leader === 'me' ? 'Öndesin…' : S.gold < next ? 'Kese yetmiyor' : 'Artır<small>' + next + ' altın</small>') + '</button><button type="button" class="gbtn" data-auc="leave" ' + (A.leader === 'me' ? 'disabled' : '') + '>Çekil</button>') + '</div>';
    on(w, '[data-auc]', b => { const k = b.dataset.auc; if (k === 'bid') { AUC_ACT['auc-bid'](); if (G.fx) G.fx.coins('.muz-alt .gbtn', 5, document.querySelector('.muz-fiyat b')); } else if (k === 'leave') AUC_ACT['auc-leave'](); else { const won = AUC && AUC.over && AUC.leader === 'me' && !AUC.sellD; AUC_ACT['auc-done'](); salon(); G.redraw(); } });
    if (A.over && !w.dataset.bitti) { w.dataset.bitti = '1'; if (G.fx) { G.fx.shake(w, true); if (A.leader === 'me' || (A.sellD && A.leader)) { G.fx.flash('rgba(255,240,180,.4)'); G.fx.stars('.muz-lot', 30); } } if (EO2.audio) (A.leader === 'me' ? EO2.audio.chime : EO2.audio.pop)(); } }
  /* auction.js'in çizim işlevi salon sahnesine bağlanır; tokmak sayımı (#gavel) ve alıcı sözleri (#bs-…) aynı kimliklerle çalışır */
  window.aucRender = salon;
  const eskiSay = window.aucSay; window.aucSay = function (id, t) { eskiSay(id, t); if (EO2.audio) EO2.audio.pop(); };

  /* ---------- salonun ön odası: üç lot kaidede ---------- */
  G.screen('muzayede', { k: 'Her hafta üç nadir lot', t: 'Mermer Salon', cls: 'mz', bg: 'a:muzayede', draw(body) { const A = auction(); if (!(sel >= 0 && sel < A.lots.length)) sel = 0; const L = A.lots[sel];
    const mine = S.dragons.filter(d => canAct(d) || d.stage === 'yavru'), full = L.kind === 'dragon' && freeSlots() < 1;
    body.innerHTML = '<div class="mz-lotlar">' + A.lots.map((x, i) => '<button type="button" class="mz-lot' + (x.done ? ' bitti' : '') + '" data-lot="' + i + '" aria-pressed="' + (i === sel) + '" style="animation-delay:' + (i * 0.1) + 's"><i class="isik"></i>' + lotImg(x) + '<span class="kaide"><em>' + TAG[x.kind] + '</em><b>' + (x.kind === 'dragon' ? esc(x.d.name) : x.kind === 'egg' ? 'Mühürlü yumurta' : ITEMS[x.item].ad) + '</b><small>' + (x.done ? (x.done === 'me' ? 'Senin oldu' : esc(x.done) + ' aldı') : 'tahmini ' + x.v + ' altın') + '</small></span></button>').join('') + '</div>' +
      '<div class="mz-kunye"><div><span class="ust">' + TAG[L.kind] + '</span><h3>' + lotTitle(L) + '</h3><p>' + lotDesc(L) + '</p></div>' + (L.done ? '<span class="mz-sonuc">' + (L.done === 'me' ? 'Senin oldu' : esc(L.done) + ' aldı') + '</span>' : '<button type="button" class="gbtn altin buyuk" data-gir="' + sel + '" ' + (full ? 'disabled' : '') + '>Salona gir<small>' + (full ? 'inlerde yer yok' : 'açılış ' + (Math.round(L.v * 0.5 / 5) * 5) + ' altın') + '</small></button>') + '</div>' +
      '<div class="mz-sat"><span class="ust">Ejderhanı açık artırmaya çıkar</span>' + (A.sold ? '<p>Bu hafta bir ejderhanı zaten çıkardın.</p>' : mine.length > 1 ? '<div class="kadro">' + mine.map(d => '<button type="button" class="madalyon ejm" data-sat="' + d.id + '" title="Tahmini ' + Math.round(value(d)) + ' altın"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><b>' + Math.round(value(d)) + '</b><span>' + esc(d.name) + '</span></button>').join('') + '</div><p>Teklifler toplanır, %10 komisyon kesilir.</p>' : '<p>Satmak için en az iki ejderhan olmalı.</p>') + '</div>';
    on(body, '[data-lot]', b => { sel = +b.dataset.lot; render(); });
    on(body, '[data-gir]', b => { const x = auction().lots[+b.dataset.gir]; if (!x || x.done) return; aucOpen(x, null); });
    on(body, '[data-sat]', async b => { const d = byId(+b.dataset.sat); if (!d || auction().sold) return; const ok = await G.pen({ k: 'Müzayede', t: esc(d.name) + ' salona çıksın mı?', face: G.img(d), body: '<p>Alıcılar teklif verirse ' + esc(d.name) + ' satılır ve ocaktan ayrılır; bu geri alınmaz. Satıştan %10 komisyon kesilir. Tahmini değeri ' + Math.round(value(d)) + ' altın.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Salona çıkar', cls: 'kor', v: true }] }); if (ok) aucOpen(null, d); });
  } });
  const NAV = [['pazar', 'Gece Çarşısı'], ['muzayede', 'Mermer Salon']]; G.navOf = Object.assign(G.navOf || {}, { pazar: NAV, muzayede: NAV });
})();
