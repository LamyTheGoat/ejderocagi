/* Ejder Ocağı 2.0 · Süs Dolabı
   Ejderha giyinme odasındaki kaidede durur; beş süs yuvası (taban, aura, baş, boyun, kuyruk) madalyon, süsler tezgâhtaki
   kartlardır. Karta dokununca süs ejderhanın üstünde denenir; satın almadan görülür.
   Kurallar oyunun kendisidir (js/cosmetic.js, js/data.js: COSMETICS, COS_SLOTS): fiyatlar, alınan süsün bütün ejderhalarda
   kullanılması, süslü ejderhaya zaferde ün. Süsleri ejderhanın üstüne oyunun kendi çizimi (js/art.js: dragonSVG) yerleştirir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const sahip = id => (S.cosOwned || []).includes(id), ik = id => OLD + 'img/ui/cos-' + id + '.webp';
  let yuva = 'bas', sec = null;
  const perk = n => n >= 5 ? 'Tam takım: zaferden sonra moral +1, ün +1.' : n ? 'Süslü ejderha seyircinin gözdesi: zaferde ün +1.' : 'Bir süs tak: seyirci süslü ejderhaya bayılır.';
  G.screen('sus', { k: 'Giyinme odası', t: 'Süs Dolabı', cls: 'sd', bg: 'a:sus', enter() { sec = null; }, draw(body) {
    const liste = S.dragons.filter(d => !d.dead); let d = byId(UI.sel); if (!d || d.dead) { d = liste[0] || null; UI.sel = d ? d.id : null; }
    if (!d) { body.innerHTML = '<div class="ar-kilit bos" style="left:30%"><p>Süslenecek bir ejderhan yok.</p></div>'; return; }
    d.cos = d.cos || {}; if (sec && COSMETICS[sec].slot !== yuva) sec = null;
    const dene = sec && d.cos[yuva] !== sec, look = dene ? Object.assign({}, d, { cos: Object.assign({}, d.cos, { [yuva]: sec }) }) : d, n = Object.values(d.cos).filter(Boolean).length;
    const mallar = Object.entries(COSMETICS).filter(x => x[1].slot === yuva), c = sec ? COSMETICS[sec] : null, ust = sec && d.cos[yuva] === sec, var_ = sec && sahip(sec);
    body.innerHTML = '<div class="sd-kimlik"><span class="ust">' + EL_AD[d.el] + ' · ' + STAGE_AD[d.stage] + '</span><h2>' + esc(d.name) + '</h2><small>' + n + ' / 5 yuva süslü</small></div>' +
      (liste.length > 1 ? '<div class="sd-kadro">' + liste.map(x => '<button type="button" class="madalyon ejm" data-sel="' + x.id + '" aria-pressed="' + (x.id === d.id) + '" title="' + esc(x.name) + '"><img alt="" src="' + G.img(x) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[x.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(x.name) + '</span></button>').join('') + '</div>' : '') +
      '<div class="sd-sahne" style="--el:' + G.ELC[d.el] + '"><div class="sd-ejder' + (dene ? ' dene' : '') + '">' + dragonSVG(look) + '</div>' + (dene ? '<span class="sd-dene">Deniyorsun</span>' : '') + '</div>' +
      '<div class="sd-raf"><div class="sd-yuvalar" role="tablist">' + Object.entries(COS_SLOTS).map(x => '<button type="button" role="tab" class="madalyon sd-y' + (d.cos[x[0]] ? ' dolu' : '') + '" data-yuva="' + x[0] + '" aria-pressed="' + (x[0] === yuva) + '">' + (d.cos[x[0]] ? '<img alt="" src="' + ik(d.cos[x[0]]) + '">' : '<i class="bos"></i>') + '<span>' + x[1] + '</span></button>').join('') + '</div>' +
        '<div class="pz-mallar sd-mallar">' + mallar.map((x, i) => { const id = x[0], q = x[1], u = d.cos[yuva] === id, s = sahip(id); return '<button type="button" class="mal2 sd-mal' + (u ? ' ustte' : s ? ' dolapta' : '') + '" data-sus="' + id + '" aria-pressed="' + (sec === id) + '" style="animation-delay:' + (i * 0.05) + 's"><span class="res"><img alt="" src="' + ik(id) + '"></span><b>' + q.ad + '</b>' + (u ? '<em class="durum ust">Üstünde</em>' : s ? '<em class="durum">Dolapta</em>' : '<em class="' + (S.gold < q.fiyat ? 'pahali' : '') + '">' + q.fiyat + '</em>') + '</button>'; }).join('') + '</div>' +
        '<div class="pz-kunye sd-kunye"><div><h3>' + (c ? c.ad : COS_SLOTS[yuva] + ' süsleri') + '</h3><p>' + (c ? c.d + (var_ ? '' : ' Satın aldığın süs bütün ejderhalarında kullanılabilir.') : perk(n)) + '</p></div>' +
          (c ? ust ? '<button type="button" class="gbtn buyuk kor" data-cikar="1">Çıkar</button>' : var_ ? '<button type="button" class="gbtn buyuk altin" data-tak="' + sec + '">Tak<small>dolabında</small></button>' : '<button type="button" class="gbtn buyuk altin" data-al="' + sec + '" ' + (S.gold >= c.fiyat ? '' : 'disabled') + '>Satın al<small>' + c.fiyat + ' altın' + (S.gold < c.fiyat ? ' · yetmiyor' : '') + '</small></button>' : '') + '</div></div>';
    const fx = (renk) => { if (G.fx) G.fx.stars('.sd-ejder', 14, renk || '#ffe9a8'); const e = body.querySelector('.sd-ejder'); if (e) { e.classList.remove('hop'); void e.offsetWidth; e.classList.add('hop'); } };
    on(body, '[data-sel]', b => { UI.sel = +b.dataset.sel; sec = null; render(); });
    on(body, '[data-yuva]', b => { yuva = b.dataset.yuva; sec = null; render(); });
    on(body, '[data-sus]', b => { sec = sec === b.dataset.sus ? null : b.dataset.sus; render(); });
    on(body, '[data-al]', b => { const id = b.dataset.al, q = COSMETICS[id]; if (S.gold < q.fiyat || sahip(id)) return; S.gold -= q.fiyat; S.cosOwned = S.cosOwned || []; S.cosOwned.push(id); d.cos[q.slot] = id; if (EO2.audio) EO2.audio.chime(); toast('<b>' + q.ad + '</b> alındı ve ' + esc(d.name) + ' üstünde.'); saveGame(); G.hud(); render(); setTimeout(() => { if (G.fx) G.fx.coins('.sd-kunye .gbtn', 6); fx(); }, 30); });
    on(body, '[data-tak]', b => { const id = b.dataset.tak; d.cos[COSMETICS[id].slot] = id; if (EO2.audio) EO2.audio.chime(); saveGame(); render(); setTimeout(() => fx('#ffc6dc'), 30); });
    on(body, '[data-cikar]', () => { delete d.cos[yuva]; saveGame(); render(); });
  } });
  const NAV = [['ejderhalar', 'Ahır'], ['yuva', 'Yuva'], ['sus', 'Süs Dolabı']]; G.navOf = Object.assign(G.navOf || {}, { ejderhalar: NAV, yuva: NAV, sus: NAV });
})();
