/* Ejder Ocağı 2.0 · ekranlar: Ejderhalar (ahır ve bakım) ve Ocak (arazi, yapılar, kuluçka)
   Eski oyunun aynı eylemleri çağrılır: antrenman ve dinlenme emri, üslup, besleme, sohbet, arazi açma, yapı kurma ve yıkma, yumurta yerleştirme. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD, el = G.el;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  const taskAd = d => d.inj ? 'Sakat · ' + d.inj + ' hafta' : !d.task ? 'Emir bekliyor' : d.task.t === 'train' ? ST_AD[d.task.k] + ' antrenmanı' : d.task.t === 'rest' ? 'Dinleniyor' : d.task.t === 'walk' ? 'Gezintide' : 'Görevde';
  const sexIc = s => s === 'F' ? '♀' : '♂';

  /* ================= EJDERHALAR ================= */
  let tab = 'gorev', lastSel = null;
  async function talk(d) { const ti = pickTalk(d), T = TALKS[ti];
    const i = await G.pen({ k: 'Sohbet', t: esc(d.name), face: G.img(d), body: '<p>' + T.t.replace(/\{ad\}/g, esc(d.name)) + '</p>', dikey: true, btns: T.o.map((o, i) => ({ t: o.t, v: i })) });
    const r = applyTalk(d, ti, i); if (EO2.audio) (r.kind === 'love' ? EO2.audio.chirp : EO2.audio.pop)();
    await G.pen({ k: 'Sohbet', t: esc(d.name), face: G.img(d), body: '<p>' + r.react + '</p><p>' + r.fx.map(([t, c]) => '<span class="etk ' + c + '">' + t + '</span>').join(' ') + '</p>' + r.marks.map(m => '<p class="au">' + m + '</p>').join(''), btns: [{ t: 'Tamam', cls: 'altin' }] });
    afterAction(); }
  function side(d) {
    if (tab === 'gorev') { const hurt = d.inj > 0;
      return '<h3>Bu haftanın emri</h3>' + (hurt ? '<p class="bos-not">' + esc(d.name) + ' sakat; ' + d.inj + ' hafta dinlenmesi gerek.</p>' : STATS.map(k => { const c = trainCalc(d, k), sel = d.task && d.task.t === 'train' && d.task.k === k;
        return '<button type="button" class="secim" data-train="' + k + '" aria-pressed="' + !!sel + '"><b>' + ST_AD[k] + ' antrenmanı</b><em>' + (c.capped ? 'Sınırda' : '+' + c.gain + ' ' + ST_KISA[k]) + '</em><span>' + (c.sec ? ST_KISA[c.sk] + ' +' + c.sec + ' · ' : '') + 'yorgunluk +' + c.fat + (c.fail ? ' · sakatlık riski %' + c.fail : '') + '</span></button>'; }).join('') +
        '<button type="button" class="secim" data-rest="1" aria-pressed="' + !!(d.task && d.task.t === 'rest') + '"><b>Dinlen</b><em></em><span>Yorgunluğu atar, morali toplar.</span></button>') +
        '<h3>Antrenman üslubu</h3>' + Object.keys(STYLES).map(k => '<button type="button" class="secim" data-style="' + k + '" aria-pressed="' + (d.style === k) + '"><b>' + STYLES[k].ad + '</b><em></em><span>' + STYLES[k].d + '</span></button>').join(''); }
    if (tab === 'bakim') { const foods = Object.keys(FOODS).filter(k => S.food[k] > 0);
      return '<h3>Besle</h3>' + (d.fed ? '<p class="bos-not">' + esc(d.name) + ' bu hafta karnını doyurdu.</p>' : foods.length ? foods.map(k => '<button type="button" class="secim" data-feed="' + k + '"><b>' + FOODS[k].ad + '</b><em class="au">× ' + S.food[k] + '</em><span>' + (FOODS[k].el ? EL_AD[FOODS[k].el] + ' ejderlerinin sevdiği yem.' : typeof itemDesc === 'function' && FOODS[k].d ? FOODS[k].d : 'Herkesin yediği yem.') + (d.favKnown && d.fav === k ? ' En sevdiği!' : '') + '</span></button>').join('') : '<p class="bos-not">Kilerde yem kalmadı. Pazar açıldığında yem alınır.</p>') +
        '<h3>Yakınlık</h3><button type="button" class="secim" data-talk="1" ' + (d.talked ? 'disabled' : '') + '><b>Sohbet et</b><em></em><span>' + (d.talked ? 'Bu hafta konuştunuz.' : 'Haftada bir kez; huyunu ve bağını etkiler.') + '</span></button>' +
        '<h3>Kuşam</h3>' + Object.keys(d.equip).map(sl => { const uid = d.equip[sl], cur = uid ? (S.inv.find(i => i.uid === uid) || {}) : null, it = cur ? (ITEMS[cur.id] || {}) : null, pool = S.inv.filter(i => ITEMS[i.id] && ITEMS[i.id].slot === sl && i.uid !== uid);
          return '<div class="kusam"><small>' + ((G.SLOT_AD || {})[sl] || sl) + '</small><div><b>' + (it ? it.ad : 'Boş') + '</b>' + (it && G.itemInfo ? '<span>' + G.itemInfo(it) + '</span>' : '') + '</div>' + (uid ? '<button type="button" class="gbtn kucuk" data-unequip="' + sl + '">Çıkar</button>' : '<span></span>') + '</div>' + pool.map(i => '<button type="button" class="secim" data-equip="' + sl + '" data-uid="' + i.uid + '"><b>' + ITEMS[i.id].ad + '</b><em>Kuşan</em><span>' + (G.itemInfo ? G.itemInfo(ITEMS[i.id]) : '') + '</span></button>').join(''); }).join(''); }
    const comfort = typeof comfortOf === 'function' ? comfortWord(comfortOf(d)) : '';
    return '<h3>Yetenekler</h3>' + STATS.map(k => { const s = d.genes.pot[k][0] + d.genes.pot[k][1], cap = typeof capOf === 'function' ? capOf(d, k) : 100; return '<div class="stat"><span>' + ST_AD[k] + '</span><div class="cubuk"><i style="width:' + Math.min(100, d.st[k] / Math.max(1, cap) * 100) + '%"></i></div><b>' + d.st[k] + '</b><span class="harf g' + Math.floor(s / 2) + '" title="Potansiyel">' + potLetter(s) + '</span></div>'; }).join('') +
      '<h3>Huylar</h3>' + (d.traits.length ? d.traits.map(t => '<div class="secim" style="cursor:default"><b>' + (TRAITS[t] ? TRAITS[t].ad : t) + '</b><em></em><span>' + (TRAITS[t] ? TRAITS[t].d : '') + '</span></div>').join('') : '<p class="bos-not">Belirgin bir huyu yok.</p>') +
      '<h3>Künye</h3><div class="secim" style="cursor:default"><b>' + (d.origin || 'Ocakta doğdu') + '</b><em>' + d.w + ' galibiyet · ' + d.l + ' yenilgi</em><span>' + d.gen + '. nesil · ' + d.age + ' haftalık' + (comfort ? ' · konfor: ' + comfort : '') + (d.favKnown ? ' · sevdiği yem: ' + FOODS[d.fav].ad : '') + '</span></div>'; }
  G.screen('ejderhalar', { k: 'Ahır ve bakım', t: 'Ejderhalar', cls: 'ej', bg: 'bg-ahir', draw(body) {
    const list = S.dragons.filter(d => !d.dead); let d = byId(UI.sel); if (!d || d.dead) { d = list[0]; UI.sel = d ? d.id : null; }
    if (!d) { body.innerHTML = '<div class="cam bos-not" style="grid-column:1/-1">Ocakta ejderha yok.</div>'; return; }
    const fresh = lastSel !== d.id; lastSel = d.id;
    body.innerHTML = '<div class="ej-liste cam kay">' + list.map(x => '<button type="button" class="ej-kart" style="--el:' + G.ELC[x.el] + '" data-id="' + x.id + '" aria-pressed="' + (x.id === d.id) + '"><img alt="" src="' + G.img(x) + '"><div><b>' + esc(x.name) + '</b><span>' + taskAd(x) + '</span></div><i class="nokta' + (x.task || x.inj ? ' tamam' : '') + '"></i></button>').join('') + '</div>' +
      '<div class="ej-sahne cam" style="--el:' + G.ELC[d.el] + '"><div class="ej-ust"><h2>' + esc(d.name) + '</h2><span class="etk el-' + d.el + '">' + EL_AD[d.el] + '</span><span class="etk">' + STAGE_AD[d.stage] + '</span><span class="etk">' + sexIc(d.sex) + '</span>' + d.traits.map(t => '<span class="etk">' + (TRAITS[t] ? TRAITS[t].ad : t) + '</span>').join('') + (d.inj ? '<span class="etk" style="background:rgba(255,120,100,.35)">Sakat</span>' : '') + '</div>' +
      '<div class="ej-res"><img class="' + (fresh ? 'gir' : '') + '" alt="' + esc(d.name) + '" src="' + G.img(d) + '"></div>' +
      '<div class="ej-alt"><div><small>Moral <b>' + MOOD[d.mood] + '</b></small><div class="cubuk sicak"><i style="width:' + ((d.mood + 1) * 20) + '%"></i></div></div><div><small>Bağ <b>' + Math.round(d.bond) + '</b></small><div class="cubuk pembe"><i style="width:' + Math.min(100, d.bond) + '%"></i></div></div><div><small>Yorgunluk <b>' + Math.round(d.fat) + '</b></small><div class="cubuk yorgun"><i style="width:' + Math.min(100, d.fat) + '%"></i></div></div></div></div>' +
      '<div class="ej-yan cam"><div class="sekme" role="tablist">' + [['gorev', 'Görev'], ['bakim', 'Bakım'], ['bilgi', 'Bilgi']].map(t => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>').join('') + '</div><div class="ej-ic kay">' + side(d) + '</div></div>';
    on(body, '.ej-kart', b => { UI.sel = +b.dataset.id; render(); });
    on(body, '[data-tab]', b => { tab = b.dataset.tab; render(); });
    on(body, '[data-train]', b => { const k = b.dataset.train; if (d.task && d.task.t === 'train' && d.task.k === k) d.task = null; else { clearPartner(d); d.task = { t: 'train', k }; } afterAction(); });
    on(body, '[data-rest]', () => { if (d.task && d.task.t === 'rest') d.task = null; else { clearPartner(d); d.task = { t: 'rest' }; } afterAction(); });
    on(body, '[data-style]', b => { d.style = b.dataset.style; afterAction(); });
    on(body, '[data-feed]', b => { const r = feedDragon(d, b.dataset.feed); if (r) { toast('<b>' + esc(d.name) + '</b> ' + r.join(' ')); if (EO2.audio) EO2.audio.chirp(); } afterAction(); });
    on(body, '[data-talk]', () => { if (!d.talked) talk(d); });
    on(body, '[data-equip]', b => { const sl = b.dataset.equip, uid = +b.dataset.uid, o = equippedBy(uid); if (o && o !== d) for (const k in o.equip) if (o.equip[k] === uid) o.equip[k] = null; d.equip[sl] = uid; if (EO2.audio) EO2.audio.chime(); afterAction(); });
    on(body, '[data-unequip]', b => { d.equip[b.dataset.unequip] = null; afterAction(); });
  } });

  /* Ocak: eski ızgara ekranı kaldırıldı (2026-11-16). Ocak artık gezilen bir sahnedir: js/ocak25.js (EO2.ocak.git). */
})();
