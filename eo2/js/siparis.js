/* Ejder Ocağı 2.0 · Sipariş Panosu
   Panoya iğnelenmiş kâğıtlar: her sipariş bir alıcının aradığı ejderhadır. Kurallar oyunun kendisidir (js/orders.js):
   siparişler haftalık gelir ve süresi dolunca gider (ordersWeek), uygunluk orderFits ile sınanır, teslim eski orderGive ile
   aynı sırayla işlenir (ejderha ocaktan ayrılır, altın ve ün gelir, kimi sipariş teşekkür yumurtası bırakır). */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game;
  const on = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (EO2.audio) EO2.audio.ui(); fn(b); }));
  /* Yerel sipariş → sunucu sipariş tarifi (js/economy_sync.js orderSpec ile aynı; altın tarifte YOK, sunucu hesaplar) */
  function tarif(o) { const lv = Number.isSafeInteger(o.lv) ? o.lv : o.reqs.some(([k]) => ['pig', 'eye', 'par'].includes(k)) ? 2 : o.reqs.length > 2 ? 1 : 0, wk = Math.max(1, Math.min(20, (o.by || 1) - (lv === 0 ? 4 : lv === 1 ? 5 : 7)));
    return ['lv=' + lv, 'wk=' + wk].concat(o.reqs.map(([k, v]) => k + '=' + (Array.isArray(v) ? v[0] + v[1] : v))).join(';'); }
  const RED = { order_unfit: 'Alıcı bu ejderhayı almadı: hesabındaki kaydı siparişi tutmuyor.', dragon_busy: 'Bu ejderha şu an ilanda ya da takasta; önce onu geri çek.', market_reserved_asset: 'Bu ejderha Bedesten ilanında; önce ilanı kaldır.', trade_reserved_asset: 'Bu ejderha bir takasta bekliyor.' };
  let mesgul = false;
  async function teslim(o, d, el) { if (!o || !d || !orderFits(o, d)) return;
    const ok = await G.pen({ k: 'Sipariş', t: esc(d.name) + ' teslim edilsin mi?', face: G.img(d), body: '<p><b>' + esc(o.who) + '</b> ' + esc(o.d) + ' arıyor. ' + esc(d.name) + ' ocaktan ayrılır; bu geri alınmaz.</p><p>Karşılığı: <b class="au">' + o.gold + ' altın</b>, +' + o.un + ' ün' + (o.egg ? ', bir de nadir yumurta' : '') + '.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Teslim et', cls: 'kor', v: true }] }); if (!ok) return;
    /* Hesabın defterindeki (kazanılmış) ejderha: teslimi sunucu yapar, altını sunucu hesaplar ve hesaba yazar (order.deliver).
       Ün ve teşekkür yumurtası yerel oyunda kalır. Yerel kökenli ejderhada akış eskisi gibi yereldir. */
    const srv = !!(EO2.ocakDefteri && EO2.ocakDefteri.sunucuKokenli(d)); let altin = o.gold;
    if (srv) { if (mesgul) return; if (!EO2.ag || !EO2.ag.cevrimici()) { toast('Bu ejderha hesabının defterinde; teslim için bağlantı gerekiyor.', 'kotu'); return; }
      mesgul = true;
      try { altin = (await EO2.ag.komut('order.deliver', { assetId: d.assetId, spec: tarif(o) })).result.gold; EO2.ocakDefteri.cikti(d.assetId); }
      catch (e) { toast(RED[e && e.code] || (e && e.status ? 'Teslim gerçekleşmedi.' : 'Bağlantı yok; teslim yapılmadı.'), 'kotu'); return; }
      finally { mesgul = false; }
      if (!S.dragons.includes(d) || !orders().list.includes(o)) { afterAction(); return; } }
    const O = orders(); for (const s in d.equip) d.equip[s] = null; linReg(d); S.dragons = S.dragons.filter(x => x !== d); if (!srv) S.gold += o.gold; S.un += o.un; S.st.orders = (S.st.orders || 0) + 1; O.list = O.list.filter(x => x !== o); let extra = '';
    if (o.egg) { const g = randomGenes({ el: o.reqs[0][1], q: .6 }); if (o.reqs.some(([k]) => k === 'pig')) g.pig = [o.reqs.find(([k]) => k === 'pig')[1], 'N'];
      S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: [], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: o.who + '\'dan teşekkür yumurtası' }); extra = ' Teşekkür olarak nadir bir yumurta bıraktı.'; }
    chron(d.name + ', ' + ek(o.who, 'gen') + ' siparişiyle ocaktan ayrıldı (' + altin + ' altın).'); toast('<b>Sipariş teslim edildi</b> ' + esc(d.name) + ' artık ' + esc(o.who) + ' ile. +' + altin + ' altın' + (srv ? ' (hesabına yazıldı)' : '') + ', +' + o.un + ' ün.' + extra, 'goal');
    if (typeof vSay === 'function') vSay('ejder', 'sell'); if (EO2.audio) EO2.audio.chime(); afterAction(); if (G.fx) G.fx.coins([innerWidth / 2, innerHeight / 2], 10); }
  G.screen('siparis', { k: 'Alıcılar ne arıyor', t: 'Sipariş Panosu', cls: 'sp', bg: 'bg-kasaba', draw(body) { const O = orders();
    body.innerHTML = '<div class="pano">' + (O.list.length ? O.list.map((o, i) => { const fits = S.dragons.filter(d => orderFits(o, d)), wl = o.by - S.week;
      return '<article class="kagit lv' + o.lv + '" style="--egim:' + [-2.2, 1.4, -0.8][i % 3] + 'deg;animation-delay:' + (i * 0.1) + 's"><i class="igne"></i><span class="sure' + (wl <= 1 ? ' son' : '') + '">' + (wl <= 0 ? 'bu hafta son' : wl + ' hafta') + '</span><h3>' + esc(o.who) + '</h3><p class="soz2">“' + esc(o.s) + '”</p><small>' + esc(o.d) + ':</small>' +
        '<ul>' + o.reqs.map(([k, v]) => { const any = S.dragons.some(d => !d.dead && REQ[k].ok(d, v)); return '<li class="' + (any ? 'var' : '') + '">' + REQ[k].t(v) + '</li>'; }).join('') + '</ul>' +
        '<div class="odul"><em>' + o.gold + '</em><span>+' + o.un + ' ün' + (o.egg ? ' · nadir yumurta' : '') + '</span></div>' +
        (fits.length ? '<div class="uyanlar">' + fits.slice(0, 4).map(d => '<button type="button" class="madalyon ejm" data-o="' + o.id + '" data-id="' + d.id + '" title="' + esc(d.name) + ' teslim et"><img alt="" src="' + G.img(d) + '" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ' + G.ELC[d.el] + ' 55%, #151a2c), #151a2c 80%)"><span>' + esc(d.name) + '</span></button>').join('') + '</div>' : '<p class="yok">Ocakta uyan ejderha yok. Çiftleştir, yetiştir.</p>') + '</article>'; }).join('')
      : '<article class="kagit bos" style="--egim:-1deg"><i class="igne"></i><h3>Pano şimdilik boş</h3><p class="soz2">Yeni siparişler birkaç haftada bir asılır.</p></article>') + '</div>';
    on(body, '[data-o]', b => teslim(orders().list.find(x => String(x.id) === b.dataset.o), byId(+b.dataset.id), b));
  } });
  const NAV = [['pazar', 'Gece Çarşısı'], ['muzayede', 'Mermer Salon'], ['siparis', 'Sipariş Panosu']]; G.navOf = Object.assign(G.navOf || {}, { pazar: NAV, muzayede: NAV, siparis: NAV });
})();
