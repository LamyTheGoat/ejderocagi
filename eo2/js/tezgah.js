/* Ejder Ocağı 2.0 · Hesap tezgâhı (EO2.tezgah): sunucudaki pazar stoğunun Gece Çarşısı'na bağlanması
   Sunucu tarafı: shop.dragon, shop.egg (server/economy_commands.js) ve tezgah.hafta (server/ocak_service.js).
   Bu dosya oyun kuralı içermez: stok, fiyat ve kaynak (kazanılmış / hesaba bağlı) sunucunun hesabıdır.

   NE YAPAR
   1) Yerel hafta ilerleyince sunucuya yalnız hafta numarasını bildirir; stoğu sunucu kendi kuralıyla yeniler.
   2) Pazar'ın ejderha ve yumurta tezgâhına sunucu stoğunu ayrı mallar olarak ekler (pazar.js `wares` buradan alır).
      Alım sunucu kesesinden yapılır; alınan mal defterden Ahır'a ya da Yuva'ya ocak_defteri.js ile iner.
   3) Mühür: alım yalnız kazanılmış altından düşecekse mal Bedesten'de satılabilir olur; hesapta bağlı altın
      duruyorsa sunucu önce onu harcar ve mal hesaba bağlı kalır. Mühür bunu alımdan önce söyler.
   Çevrimdışıyken tezgâhta hesap malı görünmez; oyun aynen sürer. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!G || !AG) return;
  let mesgul = false, bekle = 0;
  const HATA = { insufficient_gold: 'Hesabındaki altın yetmiyor.', dragon_unavailable: 'Bu ejderha az önce satıldı.', egg_unavailable: 'Bu yumurta az önce satıldı.', debt_blocked: 'Borç kapanmadan hesap tezgâhından alım yapılamaz.' };
  const soyle = (html, tur) => { if (typeof toast === 'function') toast(html, tur); };
  const ciz = () => { if (typeof render === 'function') render(); };
  const bagli = eko => !!(eko && eko.game && eko.game.ocak && typeof S !== 'undefined' && S && eko.game.ocak.id === S.ocakId);

  /* ---------- hafta bildirimi ---------- */
  async function hafta() {
    if (mesgul || Date.now() < bekle || !AG.cevrimici() || !G.live || typeof S === 'undefined' || !S || S.over) return;
    const eko = AG.kese(); if (!bagli(eko) || (eko.game.ocak.hafta || 0) >= S.week) return;
    mesgul = true;
    try { await AG.komut('tezgah.hafta', { week: S.week }); if (G.ekran && G.ekran() === 'pazar') ciz(); }
    catch (e) { bekle = Date.now() + (e && e.status && e.status < 500 ? 60000 : 8000); }
    finally { mesgul = false; }
  }
  AG.dinle('kese', () => setTimeout(hafta, 900));
  setInterval(hafta, 5000);

  /* ---------- mallar ---------- */
  function muhur(eko) { const f = eko.funds || {}; return (f.bound || 0) + (f.unknown || 0) > 0 ? ['bagli', 'Hesaba bağlı'] : ['satilir', 'Satılabilir']; }
  function not(eko, fiyat) {
    const f = eko.funds || {}, tutulan = (f.bound || 0) + (f.unknown || 0);
    if (eko.gold < fiyat) return ' Hesap tezgâhı yalnız hesabındaki altını kabul eder: hesabında <b>' + eko.gold + '</b> altın var. Arena kazançların hesabına yazılır.';
    return tutulan > 0 ? ' Hesabında <b>' + tutulan + '</b> bağlı altın duruyor; önce o harcanır. Bağlı altınla alınan mal senindir ama Bedesten\'de satılamaz.'
      : ' Kazanılmış altınla alınır: senindir, dilersen Bedesten\'de satarsın.';
  }
  async function al(tur, id, ad, satici) {
    if (mesgul) return; mesgul = true;
    try {
      await AG.komut(tur, { id });
      if (typeof vSay === 'function') vSay(satici, 'buy'); if (EO2.audio) EO2.audio.chime();
      if (G.fx) G.fx.coins('#scrGold', 7, document.querySelector('.pz-satici img'));
      if (tur === 'shop.dragon' && typeof S !== 'undefined') { S.st.acq = (S.st.acq || 0) + 1; if (typeof chron === 'function') chron(ad + ' hesap tezgâhından alındı.'); }
    } catch (e) { soyle(HATA[e && e.code] || (e && e.status ? 'Alım gerçekleşmedi.' : 'Bağlantı yok; alım yapılmadı.'), 'kotu'); if (e && e.status) AG.yenile().catch(() => { }); }
    finally { mesgul = false; if (typeof afterAction === 'function') afterAction(); else ciz(); if (EO2.ocakDefteri) EO2.ocakDefteri.esle(); }
  }
  /* pazar.js çağırır: tezgâh ('ejder' | 'yumurta') için hesap malları */
  function mallar(stall) {
    const eko = AG.kese(), L = [];
    if (!AG.cevrimici() || !bagli(eko) || !eko.game.market || (stall !== 'ejder' && stall !== 'yumurta')) return L;
    const [cls, yazi] = muhur(eko), yetmez = f => Math.min(S.gold, eko.gold) < f;
    if (stall === 'ejder') for (const d of eko.game.market.dragons || []) L.push({ key: 'h:' + d.id, img: G.img(d), ad: d.name, alt: EL_AD[d.el] + ' · ' + STAGE_AD[d.stage] + ' ' + (d.sex === 'F' ? '♀' : '♂'), el: d.el, fiyat: d.price,
      tier: d.stage === 'yetiskin' ? 3 : d.stage === 'genc' ? 2 : 1, muhur: yazi, muhurCls: cls, yetmez: yetmez(d.price),
      d: STATS.map(s => ST_AD[s] + ' ' + d.st[s]).join(' · ') + (d.traits && d.traits.length ? '. Huy: ' + d.traits.map(t => TRAITS[t] ? TRAITS[t].ad : t).join(', ') : '') + '.' + not(eko, d.price), btn: 'Satın al',
      go() { if (freeSlots() < 1) { if (typeof vSay === 'function') vSay('ejder', 'full'); return ciz(); } al('shop.dragon', d.id, d.name, 'ejder'); } });
    else { const e = eko.game.market.egg; if (e) { const f = eggPrice(e); L.push({ key: 'h:' + e.id, img: G.OLD + 'img/ic-yuva.webp', ad: e.origin || 'Pazar yumurtası', alt: 'Yumurta', fiyat: f, tier: 3, muhur: yazi, muhurCls: cls, yetmez: yetmez(f),
      d: 'İçinden ne çıkacağını Hatice de bilmiyor.' + not(eko, f) + (cls === 'satilir' ? ' Ocağında çatlarsa yavru hesaba bağlı olur.' : ''), btn: 'Satın al', go() { al('shop.egg', e.id, 'Yumurta', 'yumurta'); } }); } }
    return L;
  }
  EO2.tezgah = { mallar, hafta, mesgul: () => mesgul };
})();
