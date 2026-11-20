/* Ejder Ocağı 2.0 · Bedesten (oyuncular arası çarşı) ve Ocak Sandığı (hesabın sandık odası)
   Kurallar sunucudadır (server/market_service.js, economy_sources.js): komisyon, sınır, kaynak sınıfı, fiyat burada TANIMLANMAZ.
   Bu dosya yalnız okur (GET /api/market, /api/economy) ve oyuncunun isteğini iletir (POST /api/market: list, cancel, buy).
   Yerel kayda (S) yazmaz; çarşıda geçen altın ve mallar sunucu hesabındadır.
   Ekranlar sahnedir: ilanlar çarşıdaki tezgâhlardır, sandıktaki varlıklar raflarda durur; tablo ve liste yoktur.
   Açılış: G.open('bedesten'), G.open('sandik'). İsteğe bağlı: G.open('bedesten', { sat: 'dragon:<assetId>' }) satışa çıkarma adımını açar. */
(function () {
  'use strict';
  const EO2 = window.EO2, G = EO2.game, OLD = G.OLD;
  const ses = k => { const a = EO2.audio; if (a && a[k]) a[k](); };
  const sayi = n => Number(n || 0).toLocaleString('tr-TR');
  const kisalt = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  /* ---------- oyuncu dili ---------- */
  const TUR = { dragon: 'Ejderha', egg: 'Yumurta', item: 'Kuşam', food: 'Yem' };
  const TUR_COK = { dragon: 'Ejderhalar', egg: 'Yumurtalar', item: 'Kuşam', food: 'Yem ve iksir' };
  const TUR_SIRA = ['dragon', 'egg', 'item', 'food'];
  /* süzgeç simgeleri madalyon ailesinden (assets/ik/mdl-*.webp) */
  const MDL = n => 'assets/ik/mdl-' + n + '.webp';
  const SUZ = [['hepsi', 'Hepsi', MDL('menu')], ['dragon', 'Ejderha', MDL('ejder')], ['egg', 'Yumurta', MDL('yumurta')], ['item', 'Kuşam', MDL('kusam')], ['food', 'Yem', MDL('besle')]];
  const MUHUR = {
    earned: { ad: 'Kazanılmış', kisa: 'Satılabilir', d: 'Oyunda kazandığın altınla ya da başka bir oyuncudan edindin. Bedesten\'de satabilir, takasa koyabilirsin.' },
    bound: { ad: 'Hesaba bağlı', kisa: 'Satılamaz', d: 'Başlangıç armağanı ya da bir kerelik hedef ödülüyle geldi. Dilediğin gibi kullanırsın; satılamaz, takas edilemez.' },
    unknown: { ad: 'Kaydı inceleniyor', kisa: 'Şimdilik satılamaz', d: 'Kayıt tutulmaya başlamadan önce edinildi. İnceleme bitene dek satılamaz, takas edilemez.' },
  };
  const MUHUR_IK = {
    earned: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.5 6 6.4.5-4.9 4.2 1.5 6.3L12 16.2 6.5 19.6 8 13.3 3.1 9.1l6.4-.5z" fill="currentColor"/></svg>',
    bound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 14.5l5-5M8.2 11.3l-2 2a3.5 3.5 0 005 5l2-2M15.8 12.7l2-2a3.5 3.5 0 00-5-5l-2 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    unknown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  };
  const muhur = (k, yazi) => '<i class="bd-muhur m-' + k + '" title="' + MUHUR[k].ad + '">' + MUHUR_IK[k] + '</i>' + (yazi ? '<span class="bd-muhur-ad m-' + k + '">' + MUHUR[k].ad + '</span>' : '');
  /* Oyuncu adı: misafir kimliği "@gezgin_05c6…" yerine "Gezgin · 05C6"; gerçek ad varsa o gösterilir. */
  function kimAd(handle, benim) {
    if (benim) return 'Sen';
    const h = String(handle || '').trim(); if (!h) return 'Bir gezgin';
    const m = /^@?gezgin_([0-9a-f]{4})/i.exec(h); if (m) return 'Gezgin · ' + m[1].toUpperCase();
    return kisalt(h.replace(/^@/, ''), 18);
  }
  /* Her hata kodu için insan diliyle söz; kodun kendisi oyuncuya gösterilmez. */
  const HATA = {
    insufficient_gold: 'Kesendeki altın buna yetmiyor.',
    gold_not_transferable: 'Çarşıda yalnız oyunda kazandığın altın geçer. Kazanılmış altının bu alışa yetmiyor.',
    asset_not_transferable: 'Bu varlık hesabına bağlı; satışa çıkarılamaz.',
    food_not_transferable: 'Bu yemin o kadarı kazanılmış değil; yalnız kazanılmış olanı satabilirsin.',
    asset_unavailable: 'Bu varlık şu an meşgul: görevde, kuluçkada ya da kilitli.',
    asset_equipped: 'Önce üzerindeki kuşamı çıkar, sonra satışa koy.',
    dragon_has_equipment: 'Ejderhanın üzerinde kuşam var; önce çıkarılmalı.',
    item_equipped: 'Bu kuşamı bir ejderha taşıyor; önce çıkarılmalı.',
    asset_already_listed: 'Bu zaten tezgâhında duruyor.',
    asset_reserved: 'Bu varlık süren bir takasta ayrılmış.', food_reserved: 'Bu yemin bir kısmı başka bir ilanda ya da takasta ayrılmış.',
    market_reserved_asset: 'Bu varlık tezgâhında satışta; önce ilanı geri çek.', market_reserved_food: 'Bu yemin bir kısmı tezgâhında satışta.',
    trade_reserved_asset: 'Bu varlık süren bir takasta ayrılmış.', trade_reserved_food: 'Bu yem süren bir takasta ayrılmış.', trade_reserved_gold: 'Altının bir kısmı süren bir takasta ayrılmış.',
    market_listing_limit: 'Tezgâhın dolu. Yeni ilan için birini geri çek.',
    listing_closed: 'Bu ilan az önce kapandı.', listing_not_found: 'Bu ilan artık çarşıda değil.', listing_unavailable: 'Bu ilan şu an alınamıyor.',
    listing_quantity_unavailable: 'O kadarı kalmamış. Tezgâhı tazeledim.',
    listing_price_mismatch: 'Satıcı fiyatı az önce değiştirdi. Yeni fiyata bak.', listing_changed: 'Satıcı ilanı az önce değiştirdi. Yeni hâline bak.',
    own_listing: 'Bu senin ilanın; kendi malını satın alamazsın.', listing_not_owned: 'Bu ilan senin değil.',
    seller_unavailable: 'Satıcı şu an satış yapamıyor.', asset_not_owned: 'Bu varlık artık sandığında değil.',
    insufficient_food: 'O kadar yemin yok.', invalid_price: 'Fiyat en az 1 altın olmalı.', invalid_total: 'Toplam tutar çok büyük.', invalid_quantity: 'Adet geçerli değil.',
    debt_outstanding: 'Önce ocağın borcunu kapatman gerek.', debt_limit: 'Ocağın borcu sınırda; önce borcu kapat.',
    dragon_unavailable: 'Ahırında yer yok ya da ejderha şu an alınamıyor.', egg_unavailable: 'Bu yumurta şu an alınamıyor.', item_unavailable: 'Bu kuşam şu an alınamıyor.',
    food_limit: 'Kilerin bu yemi daha fazla almıyor.', gold_limit: 'Kesen daha fazla altın almıyor.', game_size_limit: 'Sandığın dolu.',
    rate_limited: 'Biraz yavaş. Bir an bekleyip yeniden dene.', version_conflict: 'Hesabın az önce değişti. Yeniden dene.',
    guest_session_required: 'Oturumun yenilenmeli. Çarşıdan çıkıp yeniden gir.', invalid_guest_session: 'Oturumun yenilenmeli. Çarşıdan çıkıp yeniden gir.',
    game_not_started: 'Hesabın çarşıya henüz kaydolmadı. Yeniden dene.',
    askida: 'Önceki işlemin sonucu bekleniyor. Önce onu doğrula.', mesgul: 'Bir işlem sürüyor.',
    belirsiz: 'İşlemin sonucu doğrulanamadı. Altının ve malların yerinde duruyor; bağlantı gelince “Sonucu doğrula”ya bas.',
    ag: 'Çarşıya ulaşılamadı. Bağlantını denetleyip yeniden dene.',
  };
  const hataSoz = e => HATA[e && e.kod] || 'Bir şey ters gitti. Birazdan yeniden dene.';

  /* ---------- sunucuyla konuşma ---------- */
  /* eline geçen: kesinti oranı sunucudan gelir (/api/market feeBps); burada yalnız gösterilir */
  const elineGecen = t => t - Math.floor(t * (NET.feeBps || 0) / 10000), koyAlt = (f, n) => f > 0 ? sayi(f * n) + ' altın' + (NET.feeBps ? ' · eline ' + sayi(elineGecen(f * n)) + ' geçer' : '') : 'önce fiyat yaz';
  const NET = { durum: 'bos', hesap: null, ad: '', ilanlar: [], benim: [], eco: null, askida: null, mesgul: false, saatFark: 0, sonOku: 0 };
  let okuma = null, baglanma = null;
  const askiAnahtar = () => 'eo2-bedesten-askida:' + NET.hesap;
  const askiYaz = () => { try { if (NET.askida) localStorage.setItem(askiAnahtar(), JSON.stringify(NET.askida)); else localStorage.removeItem(askiAnahtar()); } catch (e) { /* depolama yoksa yalnız bellek */ } };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  async function iste(url, opt) {
    const ctrl = new AbortController(), zaman = setTimeout(() => ctrl.abort(), 12000);
    let r, veri = {};
    try { r = await fetch(url, Object.assign({ credentials: 'same-origin', signal: ctrl.signal }, opt || {})); try { veri = await r.json(); } catch (e) { veri = {}; } }
    catch (e) { throw { kod: 'ag', status: 0 }; } finally { clearTimeout(zaman); }
    if (!r.ok) throw { kod: veri.error || 'bilinmiyor', status: r.status };
    return veri;
  }
  const kesin = e => e && e.status >= 400 && e.status < 500;           // sunucu açıkça reddetti: hiçbir şey yazılmadı
  function ecoAl(d) { if (d && d.economy && (!NET.eco || (d.economy.version || 0) >= (NET.eco.version || 0))) NET.eco = d.economy; }
  function pazarAl(d) { NET.ilanlar = Array.isArray(d.listings) ? d.listings : []; NET.benim = Array.isArray(d.mine) ? d.mine : []; NET.feeBps = Number.isSafeInteger(d.feeBps) ? d.feeBps : 0; if (d.serverNow) NET.saatFark = d.serverNow - Date.now(); }
  function baglan() {
    if (baglanma) return baglanma;
    if (NET.durum !== 'acik') { NET.durum = 'bekle'; ciz(); }
    baglanma = (async () => {
      try {
        /* Oturumu ve sunucu ocağını ortak ağ katmanı (eo2/js/ag.js) açar; burada ikinci bir oturum açılmaz.
           Ağ katmanı yüklü değilse (tek başına deneme) aynı iş doğrudan yapılır. */
        const ag = EO2.ag; let o;
        if (ag) { if (!(await ag.baglan()) || !ag.kimlik()) throw { kod: 'ag', status: 0 }; o = ag.kimlik(); }
        else { const ac = () => iste('/api/session', { method: 'POST' }); o = await (navigator.locks ? navigator.locks.request('eo-guest-bootstrap', ac) : ac()); }
        if (NET.hesap !== o.accountId) { NET.hesap = o.accountId; NET.eco = null; NET.askida = null; try { const a = JSON.parse(localStorage.getItem(askiAnahtar()) || 'null'); if (a && a.requestId) NET.askida = a; } catch (e) { /* yok */ } }
        NET.ad = o.handle || '';
        let e = await iste('/api/economy'); ecoAl(e);
        if (!ag && (!NET.eco || !NET.eco.game)) {                       // hesabın sunucudaki ocağı ilk girişte kurulur (başlangıç armağanı sunucunun kuralıdır)
          const k = await iste('/api/economy/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: uuid(), expectedVersion: NET.eco ? NET.eco.version || 0 : 0, type: 'game.start', args: {} }) });
          ecoAl(k); if (!NET.eco || !NET.eco.game) { e = await iste('/api/economy'); ecoAl(e); }
        }
        pazarAl(await iste('/api/market')); NET.durum = 'acik'; NET.sonOku = Date.now();
      } catch (e) { NET.durum = 'kapali'; }
      finally { baglanma = null; ciz(); }
    })();
    return baglanma;
  }
  function tazele(sessiz) {
    if (NET.durum !== 'acik') return baglan();
    if (okuma) return okuma;
    okuma = (async () => {
      try { const [p, e] = await Promise.all([iste('/api/market'), iste('/api/economy')]); pazarAl(p); ecoAl(e); NET.sonOku = Date.now(); }
      catch (e) { if (!kesin(e) && !sessiz) NET.durum = 'kapali'; else if (e.kod === 'guest_session_required' || e.kod === 'invalid_guest_session') NET.durum = 'bos'; }
      finally { okuma = null; if (!yaziyor()) ciz(); }
    })();
    return okuma;
  }
  /* Çarşı isteği: aynı istek kimliğiyle yeniden gönderilebilir. Yanıt belirsizse (ağ, 5xx) gövde saklanır; başarı gösterilmez. */
  async function gonder() {
    const govde = NET.askida;
    try { const d = await iste('/api/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) }); NET.askida = null; askiYaz(); return d; }
    catch (e) { if (kesin(e)) { NET.askida = null; askiYaz(); throw e; } throw { kod: 'belirsiz', status: e.status }; }
  }
  async function carsiIste(op, alanlar) {
    if (NET.mesgul) throw { kod: 'mesgul' };
    if (NET.askida) throw { kod: 'askida' };
    NET.mesgul = true; ciz();
    try {
      NET.askida = Object.assign({ op, requestId: uuid() }, alanlar); askiYaz();
      let d;
      try { d = await gonder(); }
      catch (e) { if (e.kod !== 'belirsiz') throw e; await new Promise(r => setTimeout(r, 1200)); d = await gonder(); }      // bir kez kendiliğinden yeniden dener
      return d;
    } finally { NET.mesgul = false; await tazele(true); if (EO2.ag && EO2.ag.yenile) EO2.ag.yenile().catch(() => {}); }
  }
  async function askiDogrula() {
    if (!NET.askida || NET.mesgul) return;
    NET.mesgul = true; ciz();
    try { await gonder(); soyle('Tamamdır; işlem çarşı defterine geçmiş.', 'iyi'); G.toast('İşlem doğrulandı.'); }
    catch (e) { soyle(hataSoz(e), 'kotu'); }
    finally { NET.mesgul = false; await tazele(true); }
  }

  /* ---------- görünüş: ilan ve sandık varlığı için resim, ad, künye ---------- */
  const ejderPul = new Map();
  function ejderResim(d) {                                             // gerçek görünüş (eo2/js/gorunus.js); hazır değilse türün düz çizimi
    try { return G.img(d); } catch (e) { return OLD + 'img/dr-' + d.el + '-' + (d.stage || 'yetiskin') + '.webp'; }
  }
  function ilanEjder(L) {                                              // ilan önizlemesinden çizilebilir ejderha (sunucunun kopyaladığı görünüş alanları)
    let d = ejderPul.get(L.id + ':' + L.stateVersion);
    if (!d) { const p = L.preview || {}; d = { name: p.name || L.title || 'Ejderha', el: p.el || 'ates', stage: p.stage || 'yetiskin', sex: p.sex || 'M', gen: p.gen, eye: p.eye || undefined, horn: p.horn || undefined, pat: p.pat || undefined, genes: p.genes || undefined, cos: {} }; ejderPul.set(L.id + ':' + L.stateVersion, d); if (ejderPul.size > 300) ejderPul.delete(ejderPul.keys().next().value); }
    return d;
  }
  const elAd = el => (typeof EL_AD !== 'undefined' && EL_AD[el]) || '';
  const elRenk = el => (G.ELC && G.ELC[el]) || '#ffd76a';
  function yumurtaCizim(e) { return '<img alt="" src="' + G.yumurtaResim(e) + '">'; }   // elementine göre çizilmiş yumurta (assets/ik/yum-*.webp)
  const yemResim = k => OLD + 'img/' + (k === 'genclik' ? 'ic-feed' : 'food-' + k) + '.webp';
  /* Ortak "mal" tarifi: { tur, ad, alt, cizim (html), el, kunye[] } */
  function malDragon(d) {
    const kunye = [['Soy', elAd(d.el) || 'Bilinmiyor'], ['Çağ', (typeof STAGE_AD !== 'undefined' && STAGE_AD[d.stage]) || ''], ['Cinsiyet', d.sex === 'F' ? 'Dişi' : 'Erkek']];
    if (d.gen) kunye.push(['Kuşak', d.gen + '. kuşak']);
    if (d.st && typeof STATS !== 'undefined') kunye.push(['Değerler', STATS.map(s => ST_AD[s] + ' ' + d.st[s]).join(' · ')]);
    if (d.traits && d.traits.length && typeof TRAITS !== 'undefined') kunye.push(['Huy', d.traits.map(t => TRAITS[t] ? TRAITS[t].ad : t).join(', ')]);
    return { tur: 'dragon', ad: d.name || 'Ejderha', alt: [elAd(d.el), (typeof STAGE_AD !== 'undefined' && STAGE_AD[d.stage]) || '', d.sex === 'F' ? '♀' : '♂'].filter(Boolean).join(' · '), el: d.el,
      cizim: '<img alt="" data-ej="1" src="' + ejderResim(d) + '">', ej: d, kunye };
  }
  function malEgg(e) { const el = (e.genes && e.genes.el && (typeof expEl === 'function' ? expEl(e.genes.el) : e.genes.el[0])) || e.el;
    const kunye = [['Soy', elAd(el) || 'Gizemli']]; if (e.gen) kunye.push(['Kuşak', e.gen + '. kuşak']); if (e.origin) kunye.push(['Geldiği yer', e.origin]);
    return { tur: 'egg', ad: (elAd(el) || 'Gizemli') + ' yumurtası', alt: 'Yumurta' + (e.gen ? ' · ' + e.gen + '. kuşak' : ''), el, cizim: yumurtaCizim(e), kunye }; }
  function malItem(id) { const it = (typeof ITEMS !== 'undefined' && ITEMS[id]) || {}, yuva = (G.SLOT_AD && G.SLOT_AD[it.slot]) || '';
    const kunye = []; if (yuva) kunye.push(['Yuva', yuva]); const etki = G.itemInfo ? G.itemInfo(it) : ''; if (etki) kunye.push(['Etki', etki]);
    return { tur: 'item', ad: it.ad || 'Kuşam', alt: yuva ? yuva + ' kuşamı' : 'Kuşam', cizim: '<img alt="" src="' + OLD + 'img/item-' + id + '.webp" onerror="this.onerror=null;this.src=\'' + OLD + 'img/ic-pazar.webp\'">', kunye }; }
  function malFood(k) { const F = (typeof FOODS !== 'undefined' && FOODS[k]) || {};
    const kunye = []; if (F.el) kunye.push(['Seven', elAd(F.el) + ' ejderleri']); if (F.d) kunye.push(['Etki', kisalt(F.d, 90)]);
    return { tur: 'food', ad: F.ad || 'Yem', alt: F.el ? elAd(F.el) + ' yemi' : 'Yem', el: F.el, cizim: '<img alt="" src="' + yemResim(k) + '" onerror="this.onerror=null;this.src=\'' + OLD + 'img/ic-feed.webp\'">', kunye }; }
  function ilanMal(L) { const p = L.preview || {};
    if (L.kind === 'dragon') return malDragon(ilanEjder(L));
    if (L.kind === 'egg') return malEgg({ genes: p.genes || (p.el ? { el: [p.el, p.el] } : null), el: p.el, gen: p.gen });
    if (L.kind === 'item') return malItem(p.itemId);
    return malFood(L.foodKey || p.foodKey); }
  const benzerAnahtar = L => { const p = L.preview || {}; return L.kind + ':' + (L.kind === 'dragon' ? p.el + '/' + p.stage : L.kind === 'egg' ? p.el : L.kind === 'item' ? p.itemId : L.foodKey); };
  function neZaman(t) { const dk = Math.max(0, Math.round((Date.now() + NET.saatFark - t) / 60000)); return dk < 2 ? 'az önce' : dk < 60 ? dk + ' dakika önce' : dk < 1440 ? Math.round(dk / 60) + ' saat önce' : Math.round(dk / 1440) + ' gün önce'; }

  /* ---------- sandık: sunucudaki varlıklar ---------- */
  const MESGUL_AD = { dead: 'Artık yaşamıyor', old: 'Yaşlandı; el değiştiremez', heirloomId: 'Aile yadigârı', tradeLocked: 'Kilitli', task: 'Bu hafta görevde', busy: 'Bu hafta görevde', inK: 'Kuluçkada', hatching: 'Kuluçkada' };
  function sandikListe() {
    const e = NET.eco; if (!e || !e.game) return [];
    const ilanda = new Set(), ilanYem = {};
    for (const L of NET.benim) if (L.status === 'open') { if (L.kind === 'food') ilanYem[L.foodKey] = (ilanYem[L.foodKey] || 0) + (L.remaining || 0); else if (L.assetId) ilanda.add(L.assetId); }
    const out = [];
    const ekle = (tur, row, mal) => { const d = row.data || {}, kaynak = MUHUR[d.funding] ? d.funding : 'unknown';
      let engel = ''; for (const k of Object.keys(MESGUL_AD)) if (d[k]) { engel = MESGUL_AD[k]; break; }
      if (!engel && tur === 'dragon' && Object.values(d.equip || {}).some(v => v != null)) engel = 'Üzerinde kuşam var';
      if (!engel && tur === 'item' && (e.dragons || []).some(x => Object.values((x.data && x.data.equip) || {}).some(v => v != null && String(v) === String(d.uid)))) engel = 'Bir ejderha kuşanmış';
      const tezgahta = ilanda.has(row.assetId);
      out.push({ anahtar: tur + ':' + row.assetId, tur, assetId: row.assetId, mal, kaynak, adet: 1, satAdet: kaynak === 'earned' && !tezgahta && !engel ? 1 : 0, tezgahta, engel }); };
    /* sunucunun kendi başlangıç ejderhası ve yumurtası (ocak.taban) yerel ocaktakilerin ikizidir: oyuncunun elinde tek Kor vardır, sandıkta iki tane görünmemeli.
       Yerel ocaktaki varlıkların yansıları (yerel) gösterilir; ikiz hesaba bağlıdır, satılamaz ve hiçbir yerde kullanılmaz. */
    const ikiz = new Set((e.game.ocak && e.game.ocak.taban) || []);
    (e.dragons || []).filter(r => !ikiz.has(r.assetId)).forEach(r => ekle('dragon', r, malDragon(r.data)));
    (e.eggs || []).filter(r => !ikiz.has(r.assetId)).forEach(r => ekle('egg', r, malEgg(r.data)));
    (e.items || []).forEach(r => ekle('item', r, malItem(r.data.id)));
    const yem = e.game.food || {}, ky = e.game.foodSources || {};
    for (const k of Object.keys(yem)) { const n = yem[k] || 0; if (n < 1) continue; const b = ky[k] || {}, kazan = b.earned || 0, ayrik = ilanYem[k] || 0;
      const kaynak = kazan >= n ? 'earned' : kazan > 0 ? 'earned' : (b.unknown || 0) > 0 && !(b.bound || 0) ? 'unknown' : 'bound';
      out.push({ anahtar: 'food:' + k, tur: 'food', foodKey: k, mal: malFood(k), kaynak, adet: n, kazan, karma: kazan > 0 && kazan < n, satAdet: Math.max(0, kazan - ayrik), tezgahta: ayrik > 0, ayrik, engel: '' }); }
    return out;
  }

  /* ---------- ekran durumu ---------- */
  let ekran = null;                        // 'bedesten' | 'sandik' | null (çizim sırasında belirlenir)
  let suz = 'hepsi', sira = 'yeni', mod = 'carsi', sec = null, adet = 1, satis = null, soz = null, sdSuz = 'hepsi', sdSec = null;
  const acikMi = () => { const b = document.getElementById('scrB'), s = document.getElementById('scr'); return !!(b && s && s.classList.contains('acik') && (b.classList.contains('bd') || b.classList.contains('sd'))); };
  const yaziyor = () => { const a = document.activeElement; return !!(a && a.closest && a.closest('.bd-satis')); };
  function ciz() { if (acikMi() && G.redraw) G.redraw(); }
  function soyle(t, ton) { soz = { t, ton: ton || '' }; }
  const tikla = (root, sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); ses('ui'); fn(b, ev); }));
  /* ejderha görünüşü parçaları sonradan hazır olur: resim adresi yerinde tazelenir (ekranı baştan çizmeden) */
  let gorunusZaman = [];
  function gorunusBekle(body, ejler) {
    gorunusZaman.forEach(clearTimeout); gorunusZaman = [];
    if (!ejler.length) return;
    [160, 500, 1100, 2200].forEach(ms => gorunusZaman.push(setTimeout(() => { body.querySelectorAll('img[data-ejno]').forEach(im => { const d = ejler[+im.dataset.ejno]; if (!d) return; const u = ejderResim(d); if (u && im.getAttribute('src') !== u) im.src = u; }); }, ms)));
  }
  const numarala = (html, ejler, d) => { if (!d) return html; ejler.push(d); return html.replace('data-ej="1"', 'data-ejno="' + (ejler.length - 1) + '"'); };

  /* ---------- ortak parçalar ---------- */
  const altinIk = '<i class="bd-altin" aria-hidden="true"></i>';
  function suzgec(secili, sayilar, ek) {
    return '<nav class="bd-alt" aria-label="Süzgeç">' + SUZ.map(s => '<button type="button" class="bd-madalyon" data-suz="' + s[0] + '" aria-pressed="' + (s[0] === secili) + '"><span class="bd-mres mdl"><img alt="" src="' + s[2] + '"></span>' + (sayilar[s[0]] ? '<b>' + sayilar[s[0]] + '</b>' : '') + '<span class="bd-mad">' + s[1] + '</span></button>').join('') + (ek || '') + '</nav>';
  }
  function kunyeHtml(mal) { return mal.kunye.length ? '<dl class="bd-kunye">' + mal.kunye.map(k => '<div><dt>' + k[0] + '</dt><dd>' + esc(k[1]) + '</dd></div>').join('') + '</dl>' : ''; }
  const kapaliSahne = (baslik, yazi) => '<div class="bd-kapali"><i class="bd-kilit" aria-hidden="true"></i><h2>' + baslik + '</h2><p>' + yazi + '</p><button type="button" class="gbtn altin" data-yeniden="1">Yeniden dene</button></div>';

  /* =====================================================================
     BEDESTEN
     ===================================================================== */
  function tezgahHtml(L, i, ejler) {
    const mal = ilanMal(L), bekle = !!L.unavailable;
    return '<button type="button" class="bd-tezgah t-' + L.kind + (L.mine ? ' benim' : '') + (bekle ? ' bekler' : '') + '" data-ilan="' + L.id + '" style="--el:' + elRenk(mal.el) + ';animation-delay:' + Math.min(i * 0.045, 0.5) + 's" aria-label="' + esc(mal.ad) + ', ' + sayi(L.unitPrice) + ' altın, satıcı ' + esc(kimAd(L.seller, L.mine)) + '">' +
      '<i class="bd-tente"></i><i class="bd-direk sol"></i><i class="bd-direk sag"></i><i class="bd-ic"></i>' +
      '<span class="bd-mal">' + numarala(mal.cizim, ejler, mal.ej) + (L.kind === 'food' && L.remaining > 1 ? '<b class="bd-adet">×' + sayi(L.remaining) + '</b>' : '') + '</span>' +
      '<span class="bd-tabla"><b>' + esc(kisalt(mal.ad, 20)) + '</b><small>' + esc(L.mine ? 'Senin tezgâhın' : kimAd(L.seller)) + '</small></span>' +
      '<em class="bd-fiyat">' + altinIk + sayi(L.unitPrice) + '</em>' + (bekle ? '<span class="bd-serit">Bekliyor</span>' : L.mine ? '<span class="bd-serit sen">Senin</span>' : '') + '</button>';
  }
  const bosTezgah = (i, davet, yazi) => '<button type="button" class="bd-tezgah bos' + (davet ? ' davet' : '') + '" data-yeni="1" style="animation-delay:' + Math.min(i * 0.045, 0.5) + 's" aria-label="Boş tezgâh: satışa çıkar">' +
    '<i class="bd-tente"></i><i class="bd-direk sol"></i><i class="bd-direk sag"></i><i class="bd-ic"></i><span class="bd-arti" aria-hidden="true"></span><span class="bd-tabla"><b>' + (yazi || 'Boş tezgâh') + '</b><small>' + (davet ? 'İlk ilanı sen ver' : 'Satışa çıkar') + '</small></span></button>';
  const kepenkTezgah = i => '<div class="bd-tezgah kepenk" style="animation-delay:' + (i * 0.05) + 's"><i class="bd-tente"></i><i class="bd-direk sol"></i><i class="bd-direk sag"></i><i class="bd-ic"></i><i class="bd-kepenk"></i></div>';

  function vitrinHtml(L, ejler) {
    const mal = ilanMal(L), e = NET.eco || {}, kazan = (e.funds && e.funds.earned) || 0, n = L.kind === 'food' ? Math.max(1, Math.min(adet, L.remaining)) : 1, toplam = L.unitPrice * n;
    const benzer = NET.ilanlar.filter(x => x.id !== L.id && !x.mine && x.status === 'open' && benzerAnahtar(x) === benzerAnahtar(L)).sort((a, b) => a.unitPrice - b.unitPrice).slice(0, 4);
    const enUcuz = !L.mine && benzer.length && L.unitPrice <= benzer[0].unitPrice;
    let eylem;
    if (L.mine) {
      const satislar = (L.sales || []).slice(0, 3).map(s => '<li>' + esc(kimAd(s.buyer)) + ' aldı' + (s.quantity > 1 ? ' · ' + s.quantity + ' tane' : '') + '<b>+' + sayi(s.total) + '</b></li>').join('');
      eylem = (satislar ? '<ul class="bd-fis">' + satislar + '</ul>' : '<p class="bd-not">Emin Ağa sen yokken de satar. Satılınca altın kesene düşer.</p>') +
        '<button type="button" class="gbtn kor buyuk" data-cek="' + L.id + '" ' + (NET.mesgul ? 'disabled' : '') + '>İlanı geri çek<small>' + esc(mal.ad) + ' sandığına döner</small></button>';
    } else {
      const yetmez = kazan < toplam, neden = L.unavailable ? 'Satıcının bu malı şu an meşgul; biraz sonra yeniden bak.' : yetmez ? 'Çarşıda yalnız kazanılmış altın geçer. Kesende ' + sayi(kazan) + ' kazanılmış altın var.' : '';
      eylem = (L.kind === 'food' && L.remaining > 1 ? '<div class="bd-adetsec"><span>Adet</span><button type="button" class="gbtn" data-adet="-1" aria-label="Azalt" ' + (n <= 1 ? 'disabled' : '') + '>−</button><b>' + n + '</b><button type="button" class="gbtn" data-adet="1" aria-label="Artır" ' + (n >= L.remaining ? 'disabled' : '') + '>+</button><small>' + sayi(L.remaining) + ' tane var</small></div>' : '') +
        (neden ? '<p class="bd-not uyari">' + neden + '</p>' : '') +
        '<button type="button" class="gbtn altin buyuk" data-al="' + L.id + '" ' + (yetmez || L.unavailable || NET.mesgul ? 'disabled' : '') + '>Satın al<small>' + sayi(toplam) + ' altın</small></button>';
    }
    return '<div class="bd-vitrin" role="dialog" aria-label="' + esc(mal.ad) + '"><button type="button" class="bd-kapat" data-kapat="1" aria-label="Kapat"></button>' +
      '<div class="bd-kaide" style="--el:' + elRenk(mal.el) + '"><span class="bd-buyuk t-' + L.kind + '">' + numarala(mal.cizim, ejler, mal.ej) + '</span><i class="bd-taban"></i></div>' +
      '<div class="bd-bilgi cam"><small class="bd-ust">' + TUR[L.kind] + (L.kind === 'food' && L.remaining > 1 ? ' · ' + sayi(L.remaining) + ' tane' : '') + '</small><h2>' + esc(mal.ad) + '</h2>' +
        '<p class="bd-satan">' + (L.mine ? 'Senin tezgâhında' : 'Satan: <b>' + esc(kimAd(L.seller)) + '</b>') + ' · ' + neZaman(L.createdAt) + ' kondu</p>' + kunyeHtml(mal) +
        '<div class="bd-etiket">' + altinIk + '<b>' + sayi(L.unitPrice) + '</b><span>altın' + (L.kind === 'food' ? ' / tane' : '') + '</span>' + (enUcuz ? '<em>Benzerlerinin en ucuzu</em>' : '') + '</div>' +
        (benzer.length ? '<div class="bd-benzer"><span>Çarşıdaki benzerleri</span>' + benzer.map(x => '<button type="button" class="gbtn" data-ilan="' + x.id + '">' + altinIk + sayi(x.unitPrice) + '<small>' + esc(kimAd(x.seller)) + '</small></button>').join('') + '</div>' : '') +
        eylem + '</div></div>';
  }

  /* satışa çıkarma: 1) sandıktan seç (yalnız kazanılmış ve boşta olanlar)  2) fiyatını yaz, tezgâha koy */
  function satisHtml(ejler) {
    const hepsi = sandikListe(), satilir = hepsi.filter(x => x.satAdet > 0), bagli = hepsi.filter(x => x.kaynak !== 'earned').length;
    const x = satis.anahtar ? hepsi.find(v => v.anahtar === satis.anahtar) : null;
    if (!x || x.satAdet < 1) {
      satis.anahtar = null;
      return '<div class="bd-satis" role="dialog" aria-label="Satışa çıkar"><button type="button" class="bd-kapat" data-kapat="1" aria-label="Kapat"></button><div class="bd-sergi cam"><small class="bd-ust">Tezgâhına koy</small><h2>Neyi satışa çıkarıyorsun?</h2>' +
        (satilir.length ? '<div class="bd-serili kay">' + satilir.map(v => '<button type="button" class="bd-esya" data-sat="' + esc(v.anahtar) + '" style="--el:' + elRenk(v.mal.el) + '"><span class="bd-eres t-' + v.tur + '">' + numarala(v.mal.cizim, ejler, v.mal.ej) + '</span>' + (v.tur === 'food' ? '<b class="bd-adet">×' + sayi(v.satAdet) + '</b>' : '') + '<span class="bd-ead">' + esc(kisalt(v.mal.ad, 18)) + '</span></button>').join('') + '</div>'
          : '<div class="bd-bossergi"><i class="bd-muhur m-earned buyuk">' + MUHUR_IK.earned + '</i><p>Sandığında satılabilecek bir şey yok. Tezgâha yalnız <b>kazanılmış</b> mühürlü varlıklar konur: oyunda kazandığın altınla aldıkların ve başka oyunculardan edindiklerin.</p></div>') +
        (bagli ? '<p class="bd-not">' + muhur('bound') + ' Hesaba bağlı ' + bagli + ' varlığın burada görünmez; hepsi Ocak Sandığı\'nda durur.</p>' : '') +
        '<div class="bd-dugmeler"><button type="button" class="gbtn" data-sandik="1">Ocak Sandığı\'na bak</button></div></div></div>';
    }
    const cok = x.tur === 'food' && x.satAdet > 1, n = cok ? Math.max(1, Math.min(satis.adet || 1, x.satAdet)) : 1, f = Math.floor(Number(satis.fiyat) || 0);
    const benzer = NET.ilanlar.filter(L => L.status === 'open' && !L.mine && L.kind === x.tur && (x.tur === 'food' ? L.foodKey === x.foodKey : x.tur === 'item' ? (L.preview || {}).itemId === (x.mal && (NET.eco.items.find(r => r.assetId === x.assetId) || { data: {} }).data.id) : x.tur === 'dragon' ? (L.preview || {}).el === x.mal.el : (L.preview || {}).el === x.mal.el)).sort((a, b) => a.unitPrice - b.unitPrice).slice(0, 4);
    return '<div class="bd-satis" role="dialog" aria-label="Fiyat belirle"><button type="button" class="bd-kapat" data-kapat="1" aria-label="Kapat"></button>' +
      '<div class="bd-kaide" style="--el:' + elRenk(x.mal.el) + '"><span class="bd-buyuk t-' + x.tur + '">' + numarala(x.mal.cizim, ejler, x.mal.ej) + '</span><i class="bd-taban"></i></div>' +
      '<div class="bd-bilgi cam"><small class="bd-ust">Tezgâhına koy · ' + TUR[x.tur] + '</small><h2>' + esc(x.mal.ad) + '</h2><p class="bd-satan">' + muhur('earned', true) + '</p>' +
        '<label class="bd-fiyatgir"><span>' + (cok ? 'Tanesi kaç altın?' : 'Kaç altına satacaksın?') + '</span><span class="bd-kutu">' + altinIk + '<input id="bdFiyat" type="number" inputmode="numeric" min="1" max="2000000000" step="1" placeholder="Fiyat" value="' + (f > 0 ? f : '') + '" autocomplete="off"></span></label>' +
        (cok ? '<div class="bd-adetsec"><span>Adet</span><button type="button" class="gbtn" data-sadet="-1" aria-label="Azalt" ' + (n <= 1 ? 'disabled' : '') + '>−</button><b>' + n + '</b><button type="button" class="gbtn" data-sadet="1" aria-label="Artır" ' + (n >= x.satAdet ? 'disabled' : '') + '>+</button><small>' + sayi(x.satAdet) + ' tane satabilirsin</small></div>' : '') +
        (benzer.length ? '<div class="bd-benzer salt"><span>Çarşıdaki benzerleri</span>' + benzer.map(L => '<i>' + altinIk + sayi(L.unitPrice) + '</i>').join('') + '</div>' : '<p class="bd-not">Çarşıda bunun benzeri yok; fiyatı sen belirlersin.</p>') +
        '<p class="bd-not">Emin Ağa malı tezgâhında tutar; satılınca altının tamamı kesene düşer. İstediğin an geri çekebilirsin.</p>' +
        '<div class="bd-dugmeler"><button type="button" class="gbtn" data-geri="1">Başka bir şey seç</button><button type="button" class="gbtn altin buyuk" id="bdKoy" ' + (f < 1 || NET.mesgul ? 'disabled' : '') + '>Tezgâha koy<small id="bdKoyAlt">' + koyAlt(f, n) + '</small></button></div></div></div>';
  }

  async function satinAl(L) {
    const mal = ilanMal(L), n = L.kind === 'food' ? Math.max(1, Math.min(adet, L.remaining)) : 1, toplam = L.unitPrice * n;
    const ok = await G.pen({ k: 'Bedesten', t: 'Satın alınsın mı?', body: '<p><b>' + esc(mal.ad) + '</b>' + (n > 1 ? ' · ' + n + ' tane' : '') + ' için <b class="au">' + sayi(toplam) + ' altın</b> ödenecek. Satıcı: ' + esc(kimAd(L.seller)) + '.</p><p>Aldığın şey Ocak Sandığı\'na girer ve kazanılmış sayılır; dilersen yeniden satabilirsin.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Satın al', sub: sayi(toplam) + ' altın', cls: 'altin', v: true }] });
    if (!ok) return;
    try {
      await carsiIste('buy', Object.assign({ listingId: L.id, quantity: n, unitPrice: L.unitPrice }, Number.isSafeInteger(L.stateVersion) ? { stateVersion: L.stateVersion } : {}));
      sec = null; adet = 1; soyle('Hayırlı olsun. ' + mal.ad + ' sandığına kondu.', 'iyi'); ses('chime');
      G.toast('<b>' + esc(mal.ad) + '</b> artık senin. Ocak Sandığı\'nda duruyor.', 'goal');
    } catch (e) { soyle(hataSoz(e), 'kotu'); if (e.kod !== 'belirsiz') G.toast(hataSoz(e)); if (!NET.ilanlar.some(x => x.id === L.id)) sec = null; }
    ciz();
  }
  async function geriCek(L) {
    const mal = ilanMal(L);
    const ok = await G.pen({ k: 'Tezgâhın', t: 'İlan geri çekilsin mi?', body: '<p><b>' + esc(mal.ad) + '</b> tezgâhtan kalkar ve sandığına döner.</p>', btns: [{ t: 'Vazgeç', v: false }, { t: 'Geri çek', cls: 'kor', v: true }] });
    if (!ok) return;
    try { await carsiIste('cancel', { listingId: L.id }); sec = null; soyle(mal.ad + ' tezgâhtan kalktı; sandığında.', 'iyi'); G.toast('İlan geri çekildi.'); }
    catch (e) { soyle(hataSoz(e), 'kotu'); G.toast(hataSoz(e)); }
    ciz();
  }
  async function tezgahaKoy() {
    const x = sandikListe().find(v => v.anahtar === satis.anahtar), f = Math.floor(Number(satis.fiyat) || 0); if (!x || f < 1) return;
    const n = x.tur === 'food' ? Math.max(1, Math.min(satis.adet || 1, x.satAdet)) : 1;
    try {
      await carsiIste('list', Object.assign({ kind: x.tur, quantity: n, unitPrice: f }, x.tur === 'food' ? { foodKey: x.foodKey } : { assetId: x.assetId }));
      satis = null; mod = 'tezgah'; sec = null; soyle(x.mal.ad + ' tezgâhında. Alıcı çıkınca altın kesene düşer.', 'iyi'); ses('chime'); G.toast('<b>' + esc(x.mal.ad) + '</b> satışa çıktı: ' + sayi(f) + ' altın' + (n > 1 ? ' / tane' : '') + '.');
    } catch (e) { soyle(hataSoz(e), 'kotu'); G.toast(hataSoz(e)); }
    ciz();
  }

  function bedestenCiz(body) {
    ekran = 'bedesten';
    const eskiKay = body.querySelector('.bd-sokak'), kay = eskiKay ? [eskiKay.scrollLeft, eskiKay.scrollTop] : null;
    const odakta = document.activeElement && document.activeElement.id === 'bdFiyat'; if (odakta && satis) satis.fiyat = document.activeElement.value;
    const ejler = [], e = NET.eco || {}, kazan = (e.funds && e.funds.earned) || 0, acik = NET.durum === 'acik';
    const ilanlar = NET.ilanlar.filter(L => L.status === 'open'), benimAcik = NET.benim.filter(L => L.status === 'open');
    const sayilar = { hepsi: ilanlar.length }; for (const L of ilanlar) sayilar[L.kind] = (sayilar[L.kind] || 0) + 1;
    let sokak = '', varsayilanSoz = '';
    if (!acik) {
      sokak = Array.from({ length: 6 }, (_, i) => kepenkTezgah(i)).join('');
      varsayilanSoz = NET.durum === 'kapali' ? 'Kepenkler inik, evlat. Çarşıya şu an ulaşılamıyor; birazdan yeniden uğra.' : 'Kepenkler açılıyor…';
    } else if (mod === 'tezgah') {
      const L = benimAcik.slice().sort((a, b) => b.createdAt - a.createdAt);
      sokak = L.map((x, i) => tezgahHtml(x, i, ejler)).join('') + bosTezgah(L.length, !L.length, 'Boş tezgâh') + (L.length < 3 ? Array.from({ length: 2 - Math.min(2, L.length) }, (_, i) => bosTezgah(L.length + 1 + i)).join('') : '');
      const satilan = NET.benim.filter(x => x.sold > 0).reduce((t, x) => t + (x.sales || []).reduce((a, s) => a + s.total, 0), 0);
      varsayilanSoz = L.length ? 'Tezgâhında ' + L.length + ' mal duruyor. Sen yokken de ben satarım.' + (satilan ? ' Bugüne dek ' + sayi(satilan) + ' altınlık satış yaptın.' : '') : 'Tezgâhın boş. Sandığından kazanılmış bir malı getir, fiyatını sen koy.';
    } else {
      let L = ilanlar.filter(x => suz === 'hepsi' || x.kind === suz);
      L = L.slice().sort(sira === 'ucuz' ? (a, b) => a.unitPrice - b.unitPrice || b.createdAt - a.createdAt : (a, b) => b.createdAt - a.createdAt);
      if (L.length) sokak = L.map((x, i) => tezgahHtml(x, i, ejler)).join('') + Array.from({ length: Math.max(1, 6 - L.length) }, (_, i) => bosTezgah(L.length + i)).join('');      // çarşı hiç çıplak durmaz: en az altı tezgâh
      else sokak = bosTezgah(0, !ilanlar.length, ilanlar.length ? 'Bu türden yok' : 'Boş tezgâh') + Array.from({ length: 5 }, (_, i) => bosTezgah(i + 1)).join('');
      varsayilanSoz = !ilanlar.length ? 'Çarşı bugün sessiz. İlk tezgâhı sen aç; fiyatı sen koyarsın.' : !L.length ? 'Bu türden satan yok şimdilik. Sen çıkarırsan ilk sen olursun.' : 'Hoş geldin. ' + ilanlar.length + ' tezgâh açık; beğendiğine dokun, yakından bak.';
    }
    const S0 = soz || { t: varsayilanSoz, ton: '' };
    const secili = sec ? NET.ilanlar.concat(NET.benim).find(x => x.id === sec && x.status === 'open') : null; if (sec && !secili) sec = null;
    const ek = acik ? '<span class="bd-ayrac" aria-hidden="true"></span><button type="button" class="bd-madalyon tez" data-mod="' + (mod === 'tezgah' ? 'carsi' : 'tezgah') + '" aria-pressed="' + (mod === 'tezgah') + '"><span class="bd-mres"><img alt="" src="' + OLD + 'img/npc-bedesten.webp"></span>' + (benimAcik.length ? '<b>' + benimAcik.length + '</b>' : '') + '<span class="bd-mad">Tezgâhım</span></button>' : '';
    body.innerHTML = '<div class="bd-sahne d-' + NET.durum + (mod === 'tezgah' ? ' m-tezgah' : '') + (secili || satis ? ' odakta' : '') + '">' +
      '<div class="bd-emin"><img alt="Bedesten emini" src="' + OLD + 'img/npc-bedesten.webp"></div>' +
      '<div class="bd-balon ' + S0.ton + '" role="status"><b>Emin Ağa</b>' + esc(S0.t) + (NET.askida && !NET.mesgul ? '<button type="button" class="gbtn altin" data-dogrula="1">Sonucu doğrula</button>' : '') + (NET.durum === 'kapali' ? '<button type="button" class="gbtn altin" data-yeniden="1">Yeniden dene</button>' : '') + '</div>' +
      (acik ? '<div class="bd-ust-sag"><span class="bd-kese" title="Çarşıda yalnız oyunda kazandığın altın geçer.">' + altinIk + '<b>' + sayi(kazan) + '</b><small>çarşıda geçen altının</small></span>' +
        (mod === 'carsi' ? '<button type="button" class="gbtn bd-sira" data-sira="1" aria-label="Sıralama">' + (sira === 'ucuz' ? 'Ucuzdan pahalıya' : 'Yeni konanlar') + '</button>' : '') +
        '<button type="button" class="gbtn altin bd-cikar" data-yeni="1">Satışa çıkar</button></div>' : '') +
      '<div class="bd-sokak kay' + (NET.mesgul ? ' mesgul' : '') + '">' + sokak + '</div>' +
      (acik && !satis && !secili ? (mod === 'carsi' ? suzgec(suz, sayilar, ek) : '<nav class="bd-alt">' + '<button type="button" class="bd-madalyon" data-mod="carsi" aria-pressed="false"><span class="bd-mres mdl"><img alt="" src="' + MDL('carsi') + '"></span><span class="bd-mad">Çarşıya dön</span></button><button type="button" class="bd-madalyon" data-sandik="1" aria-pressed="false"><span class="bd-mres mdl"><img alt="" src="' + MDL('sandik') + '"></span><span class="bd-mad">Ocak Sandığı</span></button></nav>') : '') +
      (acik && satis ? satisHtml(ejler) : acik && secili ? vitrinHtml(secili, ejler) : '') + '</div>';
    const yeniKay = body.querySelector('.bd-sokak'); if (kay && yeniKay) { yeniKay.scrollLeft = kay[0]; yeniKay.scrollTop = kay[1]; }
    const sahne = body.firstChild;
    tikla(body, '.bd-sokak [data-ilan], .bd-benzer [data-ilan]', b => { sec = b.dataset.ilan; adet = 1; soz = null; ciz(); });
    tikla(body, '[data-yeni]', () => { satis = { anahtar: null, fiyat: '', adet: 1 }; sec = null; soz = null; ciz(); });
    tikla(body, '[data-suz]', b => { suz = b.dataset.suz; soz = null; ciz(); const s = document.querySelector('.bd-sokak'); if (s) { s.scrollLeft = 0; s.scrollTop = 0; } });
    tikla(body, '[data-mod]', b => { mod = b.dataset.mod; sec = null; soz = null; ciz(); const s = document.querySelector('.bd-sokak'); if (s) { s.scrollLeft = 0; s.scrollTop = 0; } });
    tikla(body, '[data-sira]', () => { sira = sira === 'ucuz' ? 'yeni' : 'ucuz'; ciz(); });
    tikla(body, '[data-kapat]', () => { sec = null; satis = null; ciz(); });
    tikla(body, '[data-adet]', b => { adet = Math.max(1, adet + +b.dataset.adet); ciz(); });
    tikla(body, '[data-al]', b => { const L = NET.ilanlar.find(x => x.id === b.dataset.al); if (L) satinAl(L); });
    tikla(body, '[data-cek]', b => { const L = NET.benim.find(x => x.id === b.dataset.cek); if (L) geriCek(L); });
    tikla(body, '[data-sat]', b => { satis.anahtar = b.dataset.sat; satis.fiyat = ''; satis.adet = 1; ciz(); const i = document.getElementById('bdFiyat'); if (i && matchMedia('(hover: hover)').matches) i.focus(); });
    tikla(body, '[data-geri]', () => { satis.anahtar = null; ciz(); });
    tikla(body, '[data-sadet]', b => { satis.adet = Math.max(1, (satis.adet || 1) + +b.dataset.sadet); ciz(); });
    tikla(body, '[data-sandik]', () => { satis = null; G.open('sandik'); });
    tikla(body, '[data-dogrula]', () => askiDogrula());
    tikla(body, '[data-yeniden]', () => { soz = null; baglan(); });
    tikla(body, '#bdKoy', () => tezgahaKoy());
    const gir = body.querySelector('#bdFiyat');
    if (gir) {
      const guncel = () => { satis.fiyat = gir.value; const f = Math.floor(Number(gir.value) || 0), x = sandikListe().find(v => v.anahtar === satis.anahtar), n = x && x.tur === 'food' ? Math.max(1, Math.min(satis.adet || 1, x.satAdet)) : 1, k = body.querySelector('#bdKoy'), a = body.querySelector('#bdKoyAlt'); if (k) k.disabled = f < 1 || NET.mesgul; if (a) a.textContent = koyAlt(f, n); };
      gir.addEventListener('input', guncel); gir.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); tezgahaKoy(); } ev.stopPropagation(); });
      if (odakta) { gir.focus(); try { const v = gir.value; gir.value = ''; gir.value = v; } catch (x) { /* imleç sona */ } }
    }
    if (sahne) sahne.addEventListener('click', ev => { if ((sec || satis) && (ev.target.classList.contains('bd-vitrin') || ev.target.classList.contains('bd-satis'))) { sec = null; satis = null; ciz(); } });
    gorunusBekle(body, ejler);
  }

  /* =====================================================================
     OCAK SANDIĞI
     ===================================================================== */
  function esyaHtml(v, i, ejler) {
    return '<button type="button" class="sd-esya t-' + v.tur + (v.tezgahta ? ' tezgahta' : '') + '" data-esya="' + esc(v.anahtar) + '" style="--el:' + elRenk(v.mal.el) + ';animation-delay:' + Math.min(i * 0.035, 0.5) + 's" aria-label="' + esc(v.mal.ad) + ', ' + MUHUR[v.kaynak].ad + '">' +
      '<span class="sd-res">' + numarala(v.mal.cizim, ejler, v.mal.ej) + '</span>' + muhur(v.karma ? 'earned' : v.kaynak) + (v.adet > 1 ? '<b class="bd-adet">×' + sayi(v.adet) + '</b>' : '') +
      '<span class="sd-ad">' + esc(kisalt(v.mal.ad, 20)) + '</span>' + (v.tezgahta ? '<span class="bd-serit sen">Tezgâhta</span>' : '') + '</button>';
  }
  function sdVitrin(v, ejler) {
    const M = MUHUR[v.kaynak], durum = v.tezgahta ? (v.tur === 'food' ? v.ayrik + ' tanesi tezgâhında satışta.' : 'Şu an tezgâhında satışta.') : v.engel ? v.engel + '.' : '';
    const yemNot = v.tur === 'food' ? (v.karma ? '<p class="bd-not">' + v.adet + ' tanenin <b>' + v.kazan + '</b> tanesi kazanılmış; yalnız onlar satılabilir. Kalanı hesabına bağlı.</p>' : '') : '';
    return '<div class="bd-vitrin" role="dialog" aria-label="' + esc(v.mal.ad) + '"><button type="button" class="bd-kapat" data-kapat="1" aria-label="Kapat"></button>' +
      '<div class="bd-kaide" style="--el:' + elRenk(v.mal.el) + '"><span class="bd-buyuk t-' + v.tur + '">' + numarala(v.mal.cizim, ejler, v.mal.ej) + '</span><i class="bd-taban"></i></div>' +
      '<div class="bd-bilgi cam"><small class="bd-ust">' + TUR[v.tur] + (v.adet > 1 ? ' · ' + sayi(v.adet) + ' tane' : '') + '</small><h2>' + esc(v.mal.ad) + '</h2>' + kunyeHtml(v.mal) +
        '<div class="sd-muhur-kutu m-' + v.kaynak + '">' + muhur(v.kaynak) + '<div><b>' + M.ad + ' · ' + M.kisa + '</b><p>' + M.d + '</p></div></div>' + yemNot +
        (durum ? '<p class="bd-not uyari">' + esc(durum) + '</p>' : '') +
        '<div class="bd-dugmeler">' + (v.satAdet > 0 ? '<button type="button" class="gbtn altin buyuk" data-sdsat="' + esc(v.anahtar) + '">Bedesten\'de sat<small>fiyatını sen koyarsın</small></button>' : v.tezgahta ? '<button type="button" class="gbtn" data-tezgahim="1">Tezgâhıma git</button>' : '') + '</div></div></div>';
  }
  function sandikCiz(body) {
    ekran = 'sandik';
    const eskiKay = body.querySelector('.sd-raflar'), kay = eskiKay ? eskiKay.scrollTop : 0;
    const ejler = [], acik = NET.durum === 'acik', e = NET.eco || {}, F = e.funds || {};
    let ic;
    if (!acik) {
      ic = NET.durum === 'kapali' ? kapaliSahne('Sandık odası kilitli', 'Sandığına şu an ulaşılamıyor. İçindekiler yerinde duruyor; birazdan yeniden dene.') : '<div class="bd-kapali bekle"><i class="bd-kilit" aria-hidden="true"></i><h2>Kilit açılıyor…</h2></div>';
    } else {
      const hepsi = sandikListe(), sayilar = { hepsi: hepsi.length }; for (const v of hepsi) sayilar[v.tur] = (sayilar[v.tur] || 0) + 1;
      const secili = sdSec ? hepsi.find(v => v.anahtar === sdSec) : null; if (sdSec && !secili) sdSec = null;
      const raflar = TUR_SIRA.filter(t => sdSuz === 'hepsi' || sdSuz === t).map(t => { const L = hepsi.filter(v => v.tur === t); let n = 0;
        return '<div class="snd-raf"><h3>' + TUR_COK[t] + '</h3><div class="sd-dizi">' + (L.length ? L.map(v => esyaHtml(v, n++, ejler)).join('') : '<span class="sd-bos">Bu raf boş</span>') + '</div><i class="sd-tahta" aria-hidden="true"></i></div>'; }).join('');
      const kese = '<div class="sd-kese cam"><div class="sd-toplam">' + altinIk + '<b>' + sayi(e.gold) + '</b><span>altın kesende</span></div>' +
        '<div class="sd-pay">' + muhur('earned') + '<span><b>' + sayi(F.earned) + '</b> kazanılmış<small>çarşıda ve takasta geçer</small></span></div>' +
        '<div class="sd-pay">' + muhur('bound') + '<span><b>' + sayi(F.bound) + '</b> hesaba bağlı<small>yalnız ocağında harcanır</small></span></div>' +
        (F.unknown ? '<div class="sd-pay">' + muhur('unknown') + '<span><b>' + sayi(F.unknown) + '</b> inceleniyor<small>şimdilik yalnız ocağında</small></span></div>' : '') +
        (e.debt ? '<div class="sd-pay borc"><span><b>' + sayi(e.debt) + '</b> altın borç<small>önce bu kapanır</small></span></div>' : '') + '</div>';
      ic = kese + '<div class="sd-raflar kay">' + raflar + '</div>' +
        (secili ? sdVitrin(secili, ejler) : suzgec(sdSuz, sayilar, '<span class="bd-ayrac" aria-hidden="true"></span><button type="button" class="bd-madalyon tez" data-bedesten="1" aria-pressed="false"><span class="bd-mres"><img alt="" src="' + OLD + 'img/npc-bedesten.webp"></span><span class="bd-mad">Bedesten</span></button>'));
    }
    body.innerHTML = '<div class="sd-oda d-' + NET.durum + (sdSec ? ' odakta' : '') + '">' + ic + '</div>';
    const yeniKay = body.querySelector('.sd-raflar'); if (yeniKay) yeniKay.scrollTop = kay;
    tikla(body, '[data-esya]', b => { sdSec = b.dataset.esya; ciz(); });
    tikla(body, '[data-suz]', b => { sdSuz = b.dataset.suz; ciz(); const s = document.querySelector('.sd-raflar'); if (s) s.scrollTop = 0; });
    tikla(body, '[data-kapat]', () => { sdSec = null; ciz(); });
    tikla(body, '[data-yeniden]', () => baglan());
    tikla(body, '[data-bedesten]', () => G.open('bedesten'));
    tikla(body, '[data-tezgahim]', () => { sdSec = null; G.open('bedesten', { mod: 'tezgah' }); });
    tikla(body, '[data-sdsat]', b => { const a = b.dataset.sdsat; sdSec = null; G.open('bedesten', { sat: a }); });
    const oda = body.firstChild; if (oda) oda.addEventListener('click', ev => { if (sdSec && ev.target.classList.contains('bd-vitrin')) { sdSec = null; ciz(); } });
    gorunusBekle(body, ejler);
  }

  /* ---------- kayıt ---------- */
  G.screen('bedesten', { k: 'Oyuncular arası çarşı', t: 'Bedesten', cls: 'bd', bg: 'a:bd-carsi',
    enter(arg) { sec = null; adet = 1; soz = null; satis = null; mod = arg && arg.mod === 'tezgah' ? 'tezgah' : 'carsi'; if (arg && arg.sat) { satis = { anahtar: arg.sat, fiyat: '', adet: 1 }; mod = 'tezgah'; } if (NET.durum === 'acik') tazele(true); else baglan(); },
    draw: bedestenCiz });
  G.screen('sandik', { k: 'Hesabının hazinesi', t: 'Ocak Sandığı', cls: 'snd',   /* 'sd' Süs Dolabı'nın sınıfıdır (ejder.css); ikisi aynı adı kullanınca Süs Dolabı bozuluyordu */ bg: 'a:bd-sandik',
    enter() { sdSec = null; if (NET.durum === 'acik') tazele(true); else baglan(); },
    draw: sandikCiz });
  G.navOf = Object.assign(G.navOf || {}, { bedesten: [['bedesten', 'Bedesten'], ['sandik', 'Ocak Sandığı']], sandik: [['bedesten', 'Bedesten'], ['sandik', 'Ocak Sandığı']] });
  /* ekran açıkken çarşı on saniyede bir tazelenir (yazı yazılırken ve pencere açıkken beklenir) */
  setInterval(() => { if (acikMi() && !document.hidden && NET.durum === 'acik' && !NET.mesgul && !yaziyor() && (!G.sakin || G.sakin()) && Date.now() - NET.sonOku > 9000) tazele(true); }, 2500);
  addEventListener('online', () => { if (acikMi() && NET.durum === 'kapali') baglan(); });
  if (EO2.ag && EO2.ag.dinle) EO2.ag.dinle('durum', d => { if (d === 'cevrimici' && acikMi() && NET.durum === 'kapali') baglan(); });
  EO2.bedesten = { mal: { dragon: malDragon, egg: malEgg, item: malItem, food: malFood }, tazele: () => tazele(true), baglan, kimAd, get durum() { return NET.durum; }, get veri() { return NET; }, get ekran() { return ekran; } };
})();
