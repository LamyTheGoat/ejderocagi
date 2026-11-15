/* Ejder Ocağı 2.0 · Kraliyet Soy Kütüğü
   Arşiv salonundaki açık kütük: sol sayfada nadir soyların ilk keşif kayıtları (kimin ocağında, hangi hafta), sağ sayfada
   ocağındaki çift kanlı ejderhalar ve içlerindeki ikinci elementin uyandırılması.
   Kurallar oyunun kendisidir (js/lineage.js): hangi görünüşün kütüğe girdiği (codexCheck, nadirlik eşiği), ilk keşif ünü,
   çift kan eşleşmeleri (HYBRID_MAP), uyanış koşulu (canAwakenHybrid: yetişkin; bağ 50 ya da Gen Laboratuvarı), bedeli
   (awakenCost) ve kazandırdıkları (awakenHybrid: yeni yetenek, bütün niteliklere +5, ün +4). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  let sayfa = 0; const N = 4;
  const cift = d => d.genes && d.genes.el ? d.genes.el.map(e => EL_AD[e]).join(' + ') : EL_AD[d.el];
  /* LINEAGE_ACT['awaken-hybrid'] ile aynı sıra: bedel, uyanış, kütük denetimi, kayıt */
  async function uyandir(d) { if (!d || !canAwakenHybrid(d)) return; const cost = awakenCost(d); if (S.gold < cost) { toast('Hibrit uyanışı için altın yetersiz.'); return; }
    S.gold -= cost; const H = awakenHybrid(d); codexCheck(d); if (EO2.audio) EO2.audio.chime(); G.hud();
    await G.vn({ bg: 'a:arsiv', dragon: true, face: G.img(d), name: esc(d.name), k: 'Çift kan uyanışı · ' + H.ad, text: esc(d.name) + ' içindeki ikinci elementi uyandırdı. ' + H.d,
      after: '<span class="etk iyi">Yeni yetenek: ' + H.cardAd + '</span><span class="etk">Bütün nitelikler +5</span><span class="etk">Ün +4</span>' });
    toast('<b>' + esc(d.name) + '</b> içindeki ikinci elementi uyandırdı: <b>' + H.ad + '</b>! Yeni yetenek: <b>' + H.cardAd + '</b>.'); afterAction(); }
  G.screen('kutuk', { k: 'Kraliyet arşivi', t: 'Soy Kütüğü', cls: 'sk', bg: 'a:arsiv', enter() { sayfa = 0; }, draw(body) {
    const C = ensureCodex(); S.dragons.forEach(d => codexCheck(d, true)); const ben = S.handle || '@ejder_ocagi';
    const list = Object.values(C).sort((a, b) => b.rarity - a.rarity), benim = list.filter(x => x.by === ben).length, top = Math.max(1, Math.ceil(list.length / N)); sayfa = Math.max(0, Math.min(top - 1, sayfa));
    const kayit = x => { const el = String(x.hash || '').split(':')[0], bn = x.by === ben; return '<li class="sk-kayit' + (bn ? ' benim' : '') + '"><span class="res" style="--el:' + (G.ELC[el] || '#c9a96a') + '">' + (x.snap ? '<img alt="" src="' + G.img(x.snap) + '">' : '<img class="golge" alt="" src="' + OLD + 'img/dr-' + (EL_AD[el] ? el : 'ates') + '-yetiskin.webp">') + '</span>' +
      '<div><em>' + (bn ? 'Senin keşfin' : 'Soy kaydı') + ' · nadirlik ' + x.rarity + '</em><b>' + esc(x.title) + '</b><small>İlk yetiştiren: ' + esc(x.by) + (x.dName ? ' (' + esc(x.dName) + ')' : '') + ' · ' + x.w + '. hafta</small></div></li>'; };
    const sol = '<div class="sayfa sol"><h2>İlk Keşifler</h2><p class="alt">Senin keşiflerin: ' + benim + ' / ' + list.length + '</p><ul class="sk-liste">' + list.slice(sayfa * N, sayfa * N + N).map(kayit).join('') + '</ul>' +
      '<div class="sk-sayfa"><button type="button" data-git="-1" ' + (sayfa > 0 ? '' : 'disabled') + ' aria-label="Önceki sayfa">‹</button><span>' + (sayfa + 1) + ' / ' + top + '</span><button type="button" data-git="1" ' + (sayfa < top - 1 ? '' : 'disabled') + ' aria-label="Sonraki sayfa">›</button></div>' +
      '<p class="dip">Diyarda daha önce görülmemiş nadir soy ve renk bileşimlerini ilk kez yetiştiren ocaklar buraya kaydedilir.</p></div>';
    const kanli = S.dragons.filter(d => !d.dead && (d.hybrid || hybridKeyOf(d)));
    const kan = d => { const H = hybridInfo(d), cost = awakenCost(d), ok = canAwakenHybrid(d);
      const durum = d.hybrid ? '<span class="sk-muhur">Uyandı</span>' : ok ? '<button type="button" class="gbtn altin kucuk" data-uyan="' + d.id + '" ' + (S.gold >= cost ? '' : 'disabled') + '>Uyandır<small>' + cost + ' altın' + (S.gold < cost ? ' · yetmiyor' : '') + '</small></button>'
        : '<span class="sk-sart">' + (d.stage !== 'yetiskin' ? 'Yetişkin olunca uyandırılabilir' : 'Bağ 50 olmalı ya da Gen Laboratuvarı kurulmalı (bağ ' + d.bond + ')') + '</span>';
      return '<li class="sk-kan' + (d.hybrid ? ' uyandi' : '') + '"><span class="res" style="--el:' + G.ELC[d.el] + '"><img alt="" src="' + G.img(d) + '"></span><div><em>' + cift(d) + '</em><b>' + esc(d.name) + ' · ' + H.ad + '</b><small>' + H.d + '</small><small class="yet">Yetenek: ' + H.cardAd + ' (' + H.cardK + ')' + (H.bonus ? ' · ' + H.bonus : '') + '</small>' + durum + '</div></li>'; };
    const sag = '<div class="sayfa sag sk-sag"><h2>Çift Kan</h2><p class="alt">İki elementin kanını taşıyanlar</p>' + (kanli.length ? '<ul class="sk-liste">' + kanli.map(kan).join('') + '</ul>'
        : '<p class="bos">Ocağında çift kanlı ejderha yok. Farklı elementten iki ejderhanın yavrusu, iki elementin de genini taşıyabilir; yetişkin olunca içindeki ikinci element uyandırılır.</p>') +
      '<p class="dip">Uyanış yeni bir yetenek kazandırır, bütün nitelikleri 5 artırır, ocağa 4 ün getirir.</p></div>';
    body.innerHTML = '<div class="defter sk-kitap">' + sol + '<i class="cilt"></i>' + sag + '</div>';
    on(body, '[data-git]', b => { sayfa += +b.dataset.git; render(); });
    on(body, '[data-uyan]', b => uyandir(byId(+b.dataset.uyan)));
  } });
  const NAV = [['defter', 'Görevler'], ['kutuk', 'Soy Kütüğü']]; G.navOf = Object.assign(G.navOf || {}, { defter: NAV, kutuk: NAV });
})();
