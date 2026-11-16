/* Ejder Ocağı 2.0 · Ocak ziyareti ve birlikte çiftleştirme (EO2.ziyaret)
   Sunucu tarafı: server/ocak_ziyaret.js. Bir terbiyeciyi ocağına çağırırsın; kabul ederse senin arazini (kareler, yapılar,
   ejderhalar) görür, içinde yürür, ikiniz birbirinizi görürsünüz. Misafir hiçbir şeyi değiştiremez.
   Birlikte çiftleştirme mevcut Damızlık kuralıdır (js/diyar.js ile aynı sıra ve bedel): misafir bir ejderhasını sunar, ev sahibi
   kendi ejderhasıyla eşleştirir, bedeli öder, yumurta EV SAHİBİNİN ocağına gelir. Misafir yumurta isterse o da seni çağırır.
   Ocak 2.5D sahnesi (js/ocak25.js) arazinin verisini EO2.ziyaret.tablo() doluysa oradan, değilse oyuncunun kendi kaydından okur. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!G || !AG || !EO2.ocak || typeof inheritGenes !== 'function') return;
  const Z = { ev: null, tablo: null, misafir: new Map(), sonTablo: '', pen: false }, L = EO2.ocak.L, AD0 = [L.name, L.sub];
  const esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cins = s => s === 'F' ? '♀' : '♂', EVRE = { yavru: 'Yavru', genc: 'Genç', yetiskin: 'Yetişkin' }, elAd = e => (typeof EL_AD !== 'undefined' && EL_AD[e]) || e;
  const HATA = { cevrimdisi: 'O terbiyeci çevrimiçi değil.', davet_yok: 'Davetin süresi dolmuş.', kendin: 'Kendi ocağındasın zaten.', misafirsin: 'Önce misafirlikten dön.', misafirin_var: 'Ocağında misafirin var; onu uğurlamadan gidemezsin.', dolu: 'O ocak şu an kalabalık.', misafir_degil: 'O terbiyeci ocağında değil.', bicim: 'Gönderilemedi.' };
  const ad = () => (G.ad ? G.ad() : 'Gezgin'), sahne = () => EO2.api && EO2.api.scene();
  const coz = t => t ? { grid: t.grid.map(q => ({ open: !!q[0], b: q[1] || null })), dragons: t.dragons.map(d => Object.assign({ dead: false }, d)), eggs: Array.from({ length: t.yum || 0 }, () => ({ inK: true })) } : null;

  /* ---------- ev sahibi: arazinin tablosu ---------- */
  function tabloYolla(zorla) { if (typeof S === 'undefined' || !S || !S.grid || !AG.cevrimici()) return;
    const t = { grid: S.grid.map(q => [q.open ? 1 : 0, q.b || 0]), dragons: (S.dragons || []).filter(d => !d.dead).slice(0, 14).map(d => ({ id: d.id, name: d.name, el: d.el, stage: d.stage, sex: d.sex })), yum: (S.eggs || []).filter(e => e.inK).length };
    const j = JSON.stringify(t); if (!zorla && j === Z.sonTablo) return; if (AG.gonder({ type: 'ziyaret_tablo', tablo: t, ad: ad() })) Z.sonTablo = j; }
  setInterval(() => { if (Z.misafir.size && G.live) tabloYolla(false); }, 3000);
  function cagir(h, kimAd) { if (!AG.cevrimici()) return G.toast('Sunucuya ulaşılamıyor.'); if (Z.ev) return G.toast(HATA.misafirsin);
    tabloYolla(true); if (AG.gonder({ type: 'ziyaret_davet', to: h, ad: ad() })) G.toast('Ocağına davetin ' + esc_(kimAd || 'terbiyeciye') + ' gitti.'); }
  function ugurla() { AG.gonder({ type: 'ziyaret_bitir' }); Z.misafir.clear(); G.toast('Misafirlerini uğurladın.'); }

  /* ---------- misafir ---------- */
  function birak(git) { const vardi = !!Z.ev; Z.ev = null; Z.tablo = null; L.name = AD0[0]; L.sub = AD0[1]; L.start.x = 0; EO2.ocak.carp(); if (vardi && git && sahne() === 'ocak' && EO2.api.runAct) EO2.api.runAct('go:meydan'); }
  function basla(m) { Z.ev = { h: m.h, ad: m.ad }; Z.tablo = coz(m.tablo) || { grid: Array.from({ length: 48 }, () => ({ open: false, b: null })), dragons: [], eggs: [] }; L.name = 'Dost Ocağı'; L.sub = m.ad + ' seni ağırlıyor'; L.start.x = 1.5;   // kapıda ev sahibiyle üst üste durmasın
    G.close(); EO2.ocak.kapat(); EO2.ocak.carp(); if (sahne() === 'ocak') { const p = EO2.api.player; p.x = 1.5; p.y = 1.9; if (EO2.api.titleCard) EO2.api.titleCard(L.name, L.sub); } else EO2.api.go('ocak');
    if (EO2.meydanAg && EO2.meydanAg.tazele) setTimeout(EO2.meydanAg.tazele, 400); }
  /* misafir bir ejderhasını sunar */
  async function sun(neden) { if (!Z.ev || Z.pen) return; const aday = S.dragons.filter(d => !d.dead && d.stage !== 'yavru');
    if (!aday.length) return G.toast('Sunabileceğin genç ya da yetişkin bir ejderhan yok.'); Z.pen = true;
    const v = await G.pen({ k: 'Birlikte çiftleştirme', t: 'Hangi ejderhanı sunarsın?', dikey: true, body: '<p>' + (neden ? '<b>' + esc_(Z.ev.ad) + '</b> ejderhalarınızı eşleştirmek istiyor. ' : '') + 'Sunduğun ejderha yerinde kalır, ona bir şey olmaz. <b>Yumurta ' + esc_(Z.ev.ad) + ' ocağına gider</b> (Damızlık kuralı). Sen de yumurta istersen onu kendi ocağına çağır.</p>',
      btns: [...aday.slice(0, 8).map(d => ({ t: esc_(d.name) + ' ' + cins(d.sex), sub: elAd(d.el) + ' · ' + EVRE[d.stage], v: d.id })), { t: 'Şimdi değil', v: false }] }); Z.pen = false;
    const d = v !== false && v != null && S.dragons.find(x => x.id === v); if (!d || !Z.ev) return;
    let kopya; try { kopya = JSON.parse(JSON.stringify(d)); } catch (_) { return; } for (const k of ['task', 'log', 'hist', 'history', 'memo']) delete kopya[k];
    if (AG.gonder({ type: 'ziyaret_teklif', d: kopya, ad: ad() })) G.toast(esc_(d.name) + ' eşleşme için sunuldu. ' + esc_(Z.ev.ad) + ' seçimini yapıyor.'); }
  /* misafir ev sahibinin bir ejderhasına dokununca */
  async function ejder(id) { if (!Z.ev || !Z.tablo || Z.pen) return; const d = Z.tablo.dragons.find(x => String(x.id) === String(id)); if (!d) return; Z.pen = true;
    const v = await G.pen({ k: esc_(Z.ev.ad) + ' ocağı', t: esc_(d.name) + ' ' + cins(d.sex), body: '<p>' + elAd(d.el) + ' · ' + EVRE[d.stage] + '. Bu ejderha ev sahibinindir; ona emir veremezsin.</p>', btns: [{ t: 'Kapat', v: false }, { t: 'Bir ejderhamı eşleşmeye sun', cls: 'altin', v: true }] }); Z.pen = false; if (v) sun(false); }

  /* ---------- ev sahibi: gelen teklifi eşleştirir (js/diyar.js Damızlık ile aynı kural) ---------- */
  async function esle(m) { if (Z.pen || !G.live || !m || !m.d) return; const d = Object.assign({}, m.d, { id: 'm' + String(m.h).replace(/\W/g, '').slice(0, 10) + '-' + m.d.id, pids: null });   // kimlik ev sahibinin soy defteriyle çakışmasın
    const aday = S.dragons.filter(x => !x.dead && x.stage !== 'yavru' && x.sex !== d.sex), bedel = Math.round(95 * ((typeof getPeerAff === 'function' ? getPeerAff(m.h) : 15) >= 30 ? 0.65 : 1));
    Z.pen = true; const olasi = my => { try { const O = offspringOdds(my, d, 75); return Object.entries(O.el).map(x => elAd(x[0]) + ' %' + x[1]).join(' · '); } catch (_) { return ''; } };
    const v = await G.pen({ k: 'Birlikte çiftleştirme', t: esc_(m.ad) + ' bir ejderha sundu', dikey: true,
      body: '<div class="zy-sunu"><img alt="" src="' + G.img(d) + '"><div><b>' + esc_(d.name) + ' ' + cins(d.sex) + '</b><small>' + elAd(d.el) + ' · ' + EVRE[d.stage] + (typeof phenoTitle === 'function' ? ' · ' + esc_(phenoTitle(d)) : '') + '</small></div></div>' +
        (aday.length ? '<p>Eşleştireceğin ejderhayı seç. Bedel <b>' + bedel + ' altın</b>; yumurta senin ocağına gelir.' + (S.gold < bedel ? ' <span class="kotu">Altının yetmiyor.</span>' : '') + '</p>' : '<p>Eşleşme için ' + (d.sex === 'M' ? 'dişi' : 'erkek') + ' bir genç ya da yetişkin ejderhan olmalı.</p>'),
      btns: [...aday.slice(0, 6).map(x => ({ t: esc_(x.name) + ' ' + cins(x.sex) + ' ile eşleştir', sub: olasi(x) || (elAd(x.el) + ' · ' + EVRE[x.stage]), v: x.id, off: S.gold < bedel ? 'Altının yetmiyor' : '' })), { t: 'Şimdi değil', v: false }] }); Z.pen = false;
    const my = v !== false && v != null && S.dragons.find(x => x.id === v); if (!my || S.gold < bedel) return;
    S.gold -= bedel; if (typeof linReg === 'function') linReg(d);
    const g = inheritGenes(my, d), t = inheritTraits(my, d, 80), egg = { id: 'e' + S.uid++, genes: g.genes, sex: pick(['F', 'M']), traits: t.traits, traitMut: t.mut, muts: g.muts, w: 0, inK: kuluckaFree() > 0, gen: Math.max(my.gen || 1, d.gen || 1) + 1, parents: [my.name, d.name + ' (' + m.ad + ')'], pids: [my.id, d.id], origin: m.ad + ' ile ortak damızlık yumurtası' };
    S.eggs.push(egg); S.st.bred++; chron(my.name + ' ile misafir ' + m.ad + ' ocağından ' + d.name + ' eşleşti; ortak bir yumurta alındı!'); toast('<b>Ortak yumurta alındı!</b> ' + (egg.inK ? 'Kuluçka Ocağı\'na yerleştirildi.' : 'Yuva sepetine kondu.'));
    if (EO2.audio) EO2.audio.chime(); if (G.fx && G.fx.hearts) G.fx.hearts(null, 12); saveGame(); afterAction(); tabloYolla(false);
    AG.gonder({ type: 'ziyaret_oldu', to: m.h, benim: my.name, onun: d.name }); }

  /* ---------- sunucudan gelenler ---------- */
  AG.dinle('ziyaret_davet', async m => { if (!G.live || Z.pen || Z.ev || !m || typeof m.h !== 'string') return; Z.pen = true;
    const v = await G.pen({ k: 'Ocak daveti', t: esc_(m.ad) + ' seni ocağına çağırıyor', body: '<p>Arazisini gezer, ejderhalarını görürsün. İsterseniz ejderhalarınızı birlikte çiftleştirirsiniz; yumurta ev sahibinin ocağına gider.</p>', btns: [{ t: 'Şimdi değil', v: false }, { t: 'Ocağına git', cls: 'altin', v: true }] }); Z.pen = false;
    if (v) AG.gonder({ type: 'ziyaret_kabul', ev: m.h, ad: ad() }); });
  AG.dinle('ziyaret_basladi', m => { if (m && typeof m.h === 'string') basla(m); });
  AG.dinle('ziyaret_tablo', m => { if (Z.ev && m && m.tablo) { Z.tablo = coz(m.tablo); EO2.ocak.carp(); } });
  AG.dinle('ziyaret_bitti', m => { if (!Z.ev) return; const kim = Z.ev.ad; birak(true); G.toast(m && m.neden === 'ev_sahibi_cikti' ? esc_(kim) + ' oyundan ayrıldı; meydana döndün.' : m && m.neden === 'ev_sahibi_yolladi' ? esc_(kim) + ' seni uğurladı.' : 'Misafirlik bitti.'); });
  AG.dinle('ziyaret_geldi', m => { if (!m || typeof m.h !== 'string') return; Z.misafir.set(m.h, m.ad); G.toast('<b>' + esc_(m.ad) + '</b> ocağına geldi.', 'goal'); if (EO2.audio && EO2.audio.chime) EO2.audio.chime(); tabloYolla(true); });
  AG.dinle('ziyaret_gitti', m => { if (!m) return; const a = Z.misafir.get(m.h); if (Z.misafir.delete(m.h) && a) G.toast(esc_(a) + ' ocağından ayrıldı.'); });
  AG.dinle('ziyaret_iste', () => sun(true));
  AG.dinle('ziyaret_teklif', m => esle(m));
  AG.dinle('ziyaret_oldu', m => { if (!m) return; G.toast('<b>' + esc_(m.onun) + '</b>, ' + esc_(m.ad) + ' ocağından ' + esc_(m.benim) + ' ile eşleşti. Yumurta onların ocağında.', 'goal'); if (EO2.audio && EO2.audio.chime) EO2.audio.chime(); if (G.fx && G.fx.hearts) G.fx.hearts(null, 12); });
  AG.dinle('ziyaret_hata', m => G.toast(HATA[m && m.kod] || 'İşlem yapılamadı.'));
  AG.dinle('durum', d => { if (d !== 'cevrimici') { Z.misafir.clear(); Z.sonTablo = ''; if (Z.ev) { birak(true); G.toast('Bağlantı koptu; misafirlik bitti.'); } } });
  /* misafir ocaktan çıkınca ziyaret biter */
  (function bagla() { if (!EO2.hooks || !EO2.hooks.act) return setTimeout(bagla, 120); const s0 = EO2.hooks.scene;
    EO2.hooks.scene = id => { if (Z.ev && id !== 'ocak') { AG.gonder({ type: 'ziyaret_bitir' }); birak(false); } if (s0) s0(id); if (EO2.meydanAg && EO2.meydanAg.tazele) EO2.meydanAg.tazele(); }; })();

  EO2.ziyaret = { cagir, ugurla, ejder, sun, tablo: () => Z.tablo, evSahibi: () => Z.ev, misafirMi: h => Z.misafir.has(h), misafirler: () => Z.misafir,
    iste(h) { if (AG.gonder({ type: 'ziyaret_iste', to: h, ad: ad() })) G.toast('Eşleşme isteğin gitti.'); } };
})();
