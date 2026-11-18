/* Ejder Ocağı 2.0 · Ocak defteri (EO2.ocakDefteri): yerel ocak ile hesabın sunucu defteri arasındaki eşleme katmanı
   Sunucu tarafı: server/ocak_service.js (`ocak.sync`). Ağ: eo2/js/ag.js. Bu dosya oyun kuralı içermez.

   İKİ YÖN
   1) Yerelden deftere (AYNA): yerel ocaktaki ejderha ve yumurtalar hesabın defterine işlenir. Kimlik = ocak kimliği
      (`S.ocakId`, kayıtla birlikte durur) + yerel kimlik; aynı ejderha kaç kez gönderilirse gönderilsin defterde tek
      satırdır. Yalnız değişenler gider. Sunucu bunları "hesaba bağlı" tutar: satılamaz, takas edilemez.
   2) Defterden yerele (SUNUCU KÖKENLİ): Bedesten'den ya da takasla gelen ejderha, yumurta ve kuşam yerel ocağa
      (Ahır, Yuva, kiler) konur; satılan ya da takasla giden yerelden kalkar. Bu varlıkların gerçeği sunucudadır:
      yerel satır `srv: 1` ve `assetId` taşır, deftere geri GÖNDERİLMEZ (yerel antrenman satılan kopyaya yansımaz).
      Yerelde ocaktan çıkarsa (ölüm, yerel satış, çatlama) deftere "bırakıldı" diye bildirilir. Yem teslim alınır:
      sunucudaki kazanılmış yem kilere geçer.

   Altın bu dosyada taşınmaz: gösterge yerel kese + sunucudaki pay olarak kalır (ag.js).
   Çevrimdışıyken hiçbir şey yapılmaz; bağlanınca kaldığı yerden sürer. Oyuncuya bir kez kısa bilgi verilir. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2 && EO2.game, AG = EO2 && EO2.ag;
  if (!G || !AG) return;
  const PARTI = 20;                                                       // bir istekte en çok bu kadar ejderha
  const ATLA = ['seenTalk', 'task', 'pids', 'equip', 'assetId', 'srv', 'funding'];   // deftere taşınmayan yerel alanlar
  let calisiyor = false, bekle = 0, zaman = 0;
  const ozet = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '.' + s.length.toString(36); };
  const sade = r => { const o = {}; for (const k of Object.keys(r)) if (!ATLA.includes(k)) o[k] = r[k]; return o; };
  const yerelKok = rows => rows.filter(r => !r.srv);
  const soyle = (html, tur) => { if (typeof toast === 'function') toast(html, tur); };
  const tazele = () => { try { saveGame(); } catch (_) { } if (G.live && G.sakin && G.sakin() && !(EO2.arena && EO2.arena.fight && EO2.arena.fight())) { if (G.redraw) G.redraw(); } else if (G.hud) G.hud(); };

  function kayit() {
    if (typeof S.ocakId !== 'string' || !/^[a-z0-9-]{8,40}$/.test(S.ocakId)) S.ocakId = 'o-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)).toLowerCase().slice(0, 30);
    const E = S.ocakEs = S.ocakEs && typeof S.ocakEs === 'object' ? S.ocakEs : {};
    E.h = E.h && typeof E.h === 'object' ? E.h : {}; E.h.ej = E.h.ej || {}; E.h.yu = E.h.yu || {};
    E.var = Array.isArray(E.var) ? E.var : []; E.birak = Array.isArray(E.birak) ? E.birak : [];
    return E;
  }

  /* ---------- defterden yerele ---------- */
  function yerelEkle(alan, r, E) {
    const v = JSON.parse(JSON.stringify(r)); v.srv = 1; delete v.yerel; delete v.yerelId;
    if (alan === 'dragons') { v.id = S.nid++; v.equip = { bas: null, govde: null, pence: null, tilsim: null }; v.task = null; v.pids = null; delete v.role; v.talked = false; v.fed = false; S.dragons.push(v);
      soyle('<b>' + esc(v.name) + '</b> ocağına geldi. Ahır\'da seni bekliyor.', 'goal'); }
    else if (alan === 'eggs') { v.id = 'e' + S.uid++; v.inK = typeof kuluckaFree === 'function' && kuluckaFree() > 0; S.eggs.push(v); soyle('Yeni bir <b>yumurta</b> ocağına geldi. Yuva\'da seni bekliyor.', 'goal'); }
    else { S.inv.push({ uid: S.uid++, id: v.id, assetId: v.assetId, srv: 1 }); soyle('Yeni bir <b>kuşam</b> sandığına girdi.', 'goal'); }
    E.var.push(r.assetId);
  }
  function yerelCikar(alan, row, E) {
    if (alan === 'dragons') { if (typeof clearPartner === 'function') clearPartner(row); S.dragons = S.dragons.filter(d => d !== row); if (S.star === row.id) S.star = (S.dragons.find(d => !d.dead && !d.old) || {}).id ?? null;
      if (UI.sel === row.id) UI.sel = S.dragons[0] ? S.dragons[0].id : null; if (UI.arenaSel === row.id) UI.arenaSel = null;
      soyle('<b>' + esc(row.name) + '</b> artık başka bir ocakta.'); }
    else if (alan === 'eggs') S.eggs = S.eggs.filter(e => e !== row);
    else { for (const d of S.dragons) for (const s of Object.keys(d.equip || {})) if (d.equip[s] === row.uid) d.equip[s] = null; S.inv = S.inv.filter(i => i !== row); }
    E.var = E.var.filter(id => id !== row.assetId);
  }
  function cek(eko, E) {
    const taban = new Set((eko.game.ocak && eko.game.ocak.taban) || []), bekleyen = new Set(E.birak.map(b => b.id)); let degisti = false;
    for (const alan of ['dragons', 'eggs', 'inv']) {
      const sunucu = (eko.game[alan] || []).filter(r => r.assetId && !r.yerel && !taban.has(r.assetId)), ids = new Set(sunucu.map(r => r.assetId));
      for (const row of S[alan].filter(r => r.srv && r.assetId && !ids.has(r.assetId))) { yerelCikar(alan, row, E); degisti = true; }
      const yerel = new Set(S[alan].filter(r => r.srv).map(r => r.assetId));
      for (const r of sunucu) if (!yerel.has(r.assetId) && !bekleyen.has(r.assetId)) { yerelEkle(alan, r, E); degisti = true; }
    }
    return degisti;
  }

  /* ---------- yerelden deftere ---------- */
  async function govde(eko, E, bagli) {
    const O = { ocak: S.ocakId, ej: [], yu: [], ejIds: [], yuIds: [] }, gonderilen = { ej: {}, yu: {} }; let gerek = !bagli || !eko.game.ocak.kese;   // kese: çift başlangıç kesesi henüz sıfırlanmadıysa bir tur gönderilir
    for (const [alan, k] of [['dragons', 'ej'], ['eggs', 'yu']]) {
      const sunucuda = new Set(bagli ? (eko.game[alan] || []).filter(r => r.yerel).map(r => String(r.yerelId)) : []), yerel = yerelKok(S[alan]);
      O[k + 'Ids'] = yerel.map(r => r.id);
      if (bagli && (sunucuda.size !== yerel.length || yerel.some(r => !sunucuda.has(String(r.id))))) gerek = true;      // defterde fazla ya da eksik ayna var
      for (const r of yerel) { const d = sade(r), h = ozet(JSON.stringify(d));
        if ((!bagli || !sunucuda.has(String(r.id)) || E.h[k][r.id] !== h) && O[k].length < PARTI) { O[k].push({ id: r.id, d }); gonderilen[k][r.id] = h; gerek = true; } }
    }
    if (bagli && !Array.isArray(eko.game.ocak.hedef)) { const kuyruk = S.hedefKuyruk || []; O.hedefler = (S.goals || []).filter(id => !kuyruk.includes(id)); gerek = true; }   // yerelde ödenmiş hedefler bir kez bildirilir (js/hedef.js)
    const simdi = Date.now(), birak = E.birak.filter(b => !b.yol && (b.sonra || 0) <= simdi).map(b => b.id);
    if (birak.length) { O.birak = birak; gerek = true; }
    /* kazanılmış yem: ilanda tutulan dışında kalanı kilere teslim al */
    const kaynak = eko.game.foodSources || {}, yemli = Object.keys(kaynak).filter(k => (kaynak[k].earned || 0) > 0);
    if (bagli && yemli.length) { const tutulan = {};
      try { const p = await AG.istek('/api/market'); for (const L of p.mine || []) if (L.kind === 'food' && L.status === 'open') tutulan[L.foodKey] = (tutulan[L.foodKey] || 0) + (L.remaining || 0); } catch (_) { return gerek ? { O, gonderilen } : null; }
      const yem = {}; for (const k of yemli) { const n = Math.min(kaynak[k].earned, eko.game.food[k] || 0) - (tutulan[k] || 0); if (n > 0) yem[k] = n; }
      if (Object.keys(yem).length) { O.yem = yem; gerek = true; } }
    return gerek ? { O, gonderilen } : null;
  }

  async function esle() {
    if (calisiyor || Date.now() < bekle || !AG.cevrimici() || !G.live || typeof S === 'undefined' || !S || S.over) return;
    if ((G.sakin && !G.sakin()) || (EO2.arena && EO2.arena.fight && EO2.arena.fight()) || (EO2.kayit && EO2.kayit.engelli && EO2.kayit.engelli())) return;
    const eko = AG.kese(); if (!eko || !eko.game) return;
    calisiyor = true;
    try {
      const E = kayit(); let degisti = false;
      /* hesap değişti (misafir çerezi gitti): eski hesabın varlıkları bu ocakta yerel kökenli sayılır; hiçbir şey silinmez */
      if (E.acct && E.acct !== eko.accountId) { for (const alan of ['dragons', 'eggs', 'inv']) for (const r of S[alan]) if (r.srv) { delete r.srv; delete r.assetId; } E.var = []; E.birak = []; E.h = { ej: {}, yu: {} }; degisti = true; }
      E.acct = eko.accountId;
      /* yerelde ocaktan çıkan sunucu kökenli varlıklar deftere bildirilecek */
      const eldeki = new Set(['dragons', 'eggs', 'inv'].flatMap(alan => S[alan].filter(r => r.srv && r.assetId).map(r => r.assetId)));
      for (const id of E.var) if (!eldeki.has(id) && !E.birak.some(b => b.id === id)) { E.birak.push({ id }); degisti = true; }
      E.var = [...eldeki];
      const bagli = !!(eko.game.ocak && eko.game.ocak.id === S.ocakId);
      if (bagli && cek(eko, E)) degisti = true;
      const g = await govde(eko, E, bagli);
      if (g) {
        const r = (await AG.komut('ocak.sync', { body: JSON.stringify(g.O) })).result.ocak;
        Object.assign(E.h.ej, g.gonderilen.ej); Object.assign(E.h.yu, g.gonderilen.yu);
        for (const k of ['ej', 'yu']) { const var_ = new Set(g.O[k + 'Ids'].map(String)); for (const id of Object.keys(E.h[k])) if (!var_.has(id)) delete E.h[k][id]; }
        if (g.O.birak) E.birak = E.birak.filter(b => !g.O.birak.includes(b.id));
        for (const [k, n] of Object.entries(r.yem || {})) { S.food[k] = (S.food[k] || 0) + n; soyle('Çarşıdan aldığın yem kilere girdi: <b>' + n + ' ' + esc((typeof FOODS !== 'undefined' && FOODS[k] && FOODS[k].ad) || k) + '</b>.', 'goal'); }
        E.bilgi = true;   // ilk eşlemede bildirim yok: oyuncunun bir şey yapması gerekmiyor
        degisti = true;
        const yeni = AG.kese(); if (yeni && yeni.game && yeni.game.ocak && yeni.game.ocak.id === S.ocakId && cek(yeni, E)) degisti = true;
        if (g.O.ej.length >= PARTI || g.O.yu.length >= PARTI) zamanla(400);                    // kalan parti
      }
      /* locadan teklif satışları: sunucu kendi kopyasının değeriyle öder (offer.sell) */
      for (const b of E.birak.filter(x => x.yol === 'teklif')) {
        try { const r = (await AG.komut('offer.sell', { assetId: b.id })).result; E.birak = E.birak.filter(x => x !== b); degisti = true; soyle('Tüccarın kesesi hesabına yazıldı: <b class="au">+' + r.price + ' altın</b>.', 'iyi'); }
        catch (e) { if (e.status && e.status < 500) { E.birak = E.birak.filter(x => x !== b); degisti = true; soyle('Satış gerçekleşmedi; ejderhan ocağına dönüyor.', 'kotu'); zamanla(300); } }
      }
      if (degisti) tazele();
    } catch (e) {
      const E = S.ocakEs;
      if (e && e.status && e.status < 500 && E && /reserved|locked|busy/.test(e.code || '')) { const t = Date.now(); for (const b of E.birak) if (!b.yol) { b.dene = (b.dene || 0) + 1; b.sonra = t + Math.min(600000, 15000 * Math.pow(2, b.dene)); } zamanla(500); }   // ilandaki/takastaki varlık: bırakma ertelenir, eşleme sürer
      else bekle = Date.now() + (e && e.status && e.status < 500 ? 60000 : 8000);
    } finally { calisiyor = false; }
  }
  function zamanla(ms) { clearTimeout(zaman); zaman = setTimeout(esle, ms == null ? 600 : ms); }

  AG.dinle('kese', () => zamanla(500));
  AG.dinle('durum', d => { if (d === 'cevrimici') zamanla(300); });
  setInterval(esle, 4000);
  /* başka oyuncunun işlemi (ilanın satılması, takas) bu hesabın defterini değiştirebilir: kese arada bir tazelenir */
  setInterval(() => { if (AG.cevrimici() && G.live && !document.hidden && !calisiyor) AG.yenile().catch(() => {}); }, 20000);
  EO2.ocakDefteri = {
    esle,                                                                    // Promise: bir eşleme turu (gerekmiyorsa hiçbir şey yapmaz)
    sunucuKokenli: r => !!(r && r.srv && r.assetId),
    cikti(assetId) { const E = kayit(); E.var = E.var.filter(id => id !== assetId); E.birak = E.birak.filter(b => b.id !== assetId); },   // varlık bir sunucu komutuyla defterden çıktı (sipariş, müzayede): ayrıca bırakma bildirilmez                         // bu satırın gerçeği sunucuda mı (kazanılmış varlık)
    teklif(assetId) { const E = kayit(); if (!E.birak.some(b => b.id === assetId)) E.birak.push({ id: assetId, yol: 'teklif' }); zamanla(200); },
    durum: () => { const E = (typeof S !== 'undefined' && S && S.ocakEs) || {}; return { ocak: typeof S !== 'undefined' && S ? S.ocakId || null : null, hesap: E.acct || null, bekleyenBirakma: (E.birak || []).length, sunucuKokenli: (E.var || []).length }; },
  };
})();
