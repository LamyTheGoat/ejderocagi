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
      '<h3>Künye</h3><div class="secim" style="cursor:default"><b>' + (d.origin || 'Ocakta doğdu') + '</b><em>' + d.w + ' G · ' + d.l + ' M</em><span>' + d.gen + '. nesil · ' + d.age + ' haftalık' + (comfort ? ' · konfor: ' + comfort : '') + (d.favKnown ? ' · sevdiği yem: ' + FOODS[d.fav].ad : '') + '</span></div>'; }
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

  /* ================= OCAK ================= */
  const B_IMG = ['buzc', 'direk', 'fener', 'golgetas', 'heykel', 'in', 'kaynak', 'kiler', 'kulucka', 'lab', 'lav', 'magara', 'mezar', 'parkur', 'sifa', 'talim', 'yosun', 'yuva'];
  const bImg = k => B_IMG.includes(k) ? '<img alt="" src="' + OLD + 'img/b-' + k + '.webp">' : '<b style="font-size:.7em;text-align:center">' + BUILD[k].ad + '</b>';
  function ocakSide(i) {
    if (i == null) { const eggs = S.eggs || [];
      return '<h2>Dedenin Ocağı</h2><div class="ej-ic kay"><p>' + S.grid.filter(t => t.open).length + ' açık kare · ' + S.dragons.length + ' / ' + capacity() + ' ejder yeri. Bir kareye dokun: çalılığı aç ya da yapı kur.</p><h3>Yumurtalar</h3>' +
        (eggs.length ? eggs.map(e => '<div class="yumurta"><i></i><div><b>' + (e.origin || 'Yumurta') + '</b><br><small style="color:var(--soluk)">' + (e.inK ? 'Kuluçkada · ' + (e.w || 0) + '. hafta' : 'Soğukta bekliyor') + '</small></div><button type="button" class="gbtn kucuk ' + (e.inK ? '' : 'altin') + '" data-egg="' + e.id + '" ' + (!e.inK && kuluckaFree() <= 0 ? 'disabled title="Boş kuluçka yeri yok"' : '') + '>' + (e.inK ? 'Çıkar' : 'Kuluçkaya koy') + '</button></div>').join('') : '<p class="bos-not">Bekleyen yumurta yok.</p>') + '</div>'; }
    const t = S.grid[i];
    if (!t.open) { const c = clearCost(); return '<h2>Çalılık</h2><div class="ej-ic kay">' + (canClear(i) ? '<p>Dikenleri söküp taşları kenara yığarsan ocak bir kare büyür. Her yeni kare biraz daha pahalı.</p><button type="button" class="gbtn altin" data-clear="1" ' + (S.gold < c ? 'disabled' : '') + '>Araziyi aç · ' + c + ' altın</button>' : '<p>Bu çalılığa ulaşmak için önce yanındaki araziyi açmalısın.</p>') + '</div>'; }
    if (t.b) { const B = BUILD[t.b]; return '<h2>' + B.ad + '</h2><div class="ej-ic kay"><p>' + B.d + '</p><button type="button" class="gbtn kor" data-demolish="1">Yık · ' + Math.floor(B.fiyat / 2) + ' altın geri</button></div>'; }
    return '<h2>Boş arazi</h2><div class="ej-ic kay">' + BUILD_GROUPS.map(([ad, ks]) => '<h3>' + ad + '</h3>' + ks.map(k => '<button type="button" class="secim" data-build="' + k + '" ' + (S.gold < BUILD[k].fiyat ? 'disabled' : '') + '><b>' + BUILD[k].ad + '</b><em class="au">' + BUILD[k].fiyat + ' altın</em><span>' + BUILD[k].d + '</span></button>').join('')).join('') + '</div>'; }
  G.screen('ocak', { k: 'Senin arazin', t: 'Ocak', cls: 'oc', bg: 'bg-orman', enter() { UI.tile = null; }, draw(body) {
    const house = typeof housing === 'function' ? housing() : {}, at = {}; for (const d of S.dragons) if (house[d.id] != null) (at[house[d.id]] = at[house[d.id]] || []).push(d);
    body.innerHTML = '<div class="oc-alan cam"><div class="oc-izgara">' + S.grid.map((t, i) => '<button type="button" class="kare' + (t.open ? '' : ' kapali' + (canClear(i) ? ' acilir' : '')) + '" data-i="' + i + '" aria-pressed="' + (UI.tile === i) + '" aria-label="' + (t.open ? (t.b ? BUILD[t.b].ad : 'Boş arazi') : 'Çalılık') + '">' + (t.b ? bImg(t.b) : '') + (at[i] ? '<img class="ejd" alt="" src="' + G.img(at[i][0]) + '">' : '') + '</button>').join('') + '</div></div><div class="oc-yan cam">' + ocakSide(UI.tile) + '</div>';
    // izometrik arazide tıklama: dik duran yapı görselleri kareyi örtebilir; imlecin altındaki yığından ilk kare seçilir
    body.querySelector('.oc-alan').addEventListener('click', ev => { const k = document.elementsFromPoint(ev.clientX, ev.clientY).find(n => n.classList && n.classList.contains('kare')); if (!k) return; if (EO2.audio) EO2.audio.ui(); const i = +k.dataset.i; UI.tile = UI.tile === i ? null : i; render(); });
    on(body, '[data-clear]', () => { const c = clearCost(); if (S.gold < c) return; S.gold -= c; S.grid[UI.tile].open = true; S.cleared++; UI.tile = null; afterAction(); });
    on(body, '[data-build]', b => { const k = b.dataset.build, B = BUILD[k]; if (S.gold < B.fiyat) return; S.gold -= B.fiyat; S.grid[UI.tile].b = k; chron(B.ad + ' kuruldu.'); if (k === 'kulucka') { for (const e of S.eggs) if (!e.inK && kuluckaFree() > 0) e.inK = true; toast('Bekleyen yumurtalar kuluçkaya yerleştirildi.'); } UI.tile = null; if (EO2.audio) EO2.audio.chime(); afterAction(); });
    on(body, '[data-demolish]', async () => { const t = S.grid[UI.tile], B = BUILD[t.b]; const ok = await G.pen({ k: 'Yıkım', t: B.ad + ' yıkılsın mı?', body: '<p>Bedelinin yarısı (' + Math.floor(B.fiyat / 2) + ' altın) geri gelir.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Yık', cls: 'kor', v: true }] }); if (!ok) return; S.gold += Math.floor(B.fiyat / 2); t.b = null; UI.tile = null; afterAction(); });
    on(body, '[data-egg]', b => { const e = S.eggs.find(x => String(x.id) === b.dataset.egg); if (!e) return; if (e.inK) e.inK = false; else if (kuluckaFree() > 0) e.inK = true; afterAction(); });
  } });
})();
