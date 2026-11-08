'use strict';
// ENG-12 · Kayıtlı (X oturumlu, `xVerified`) hesapta ekonomi işlemleri SUNUCUDA.
// İLKELER:
//  - Oyunu yavaşlatma: işlem yerel `S` üzerinde HEMEN görünür (iyimser), sunucu komutu arka planda `requestId`
//    ile gider (ECO_LINK.exec: hafta kuyruğuyla aynı zincir, tek askı, aynı gövdeyle yeniden deneme).
//  - Sunucu altını ve sunucu varlığı yalnız sunucu komutuyla değişir. Yanıt gelince sunucu durumu esas alınır
//    (reconcile): tezgâh (Rüstem/Hatice) sunucu pazarından, bağlı varlıklar assetId ile eşlenir.
//  - İKİ KESE (ENG-12 QA, kullanıcı kararı): yerel altın (`S.gold`, HUD) yerelde kalır; Topçu/olay/müzayede/sipariş/
//    hafta gelirleri ve yerel harcamalar eskisi gibi çalışır, kaybolmaz. Sunucu bakiyesi "Ocak Kesesi"dir: NPC
//    tezgâhı, bina, arazi ve satış Ocak Kesesi'nden öder/ona yazar; bu işlemlerde yerel altın değişmez.
//    Sunucuya yerelden hiçbir altın yazılmaz.
//    Kesin ret (4xx) → yerel iyimser değişiklik geri alınır. Belirsiz (ağ/5xx) → askıda kalır, sonra aynen denenir.
//  - Yerel durum sunucuya ASLA taşınmaz (istemci verisine güvenilmez). Sunucuya giden tek şey komut adı ve
//    sunucunun zaten bildiği kimliklerdir (pazar kimliği, assetId, yem anahtarı, bina türü, arsa).
//  - Misafir, çevrimdışı, sunucu hatası ya da sunucu ocağı yoksa bu dosya hiçbir şey yapmaz: eski yerel akış.
// Üst kısım saf mantıktır (DOM'suz; tests/eng12_sync.test.js), alt kısım yalnız tarayıcıda çalışır.
(function (root) {
  const clone = v => JSON.parse(JSON.stringify(v));
  // Aynı ejderha/yumurtanın yerel iyimser kopyası ile sunucu kaydını eşlemek için anahtar (pazar kopyası aynıdır).
  const dragonKey = d => `${d.name || ''}|${JSON.stringify(d.genes || null)}`;
  const eggKey = e => `${JSON.stringify(e.genes || null)}|${e.sex || ''}|${e.origin || ''}`;
  const itemKey = i => `item|${i.id}`;
  const KINDS = [
    { local: 'dragons', server: 'dragons', key: dragonKey },
    { local: 'eggs', server: 'eggs', key: eggKey },
    { local: 'inv', server: 'items', key: itemKey },
  ];
  const serverIds = eco => KINDS.flatMap(k => (eco[k.server] || []).map(r => r.assetId));
  const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // İlk etkinleşmede sunucudaki mevcut varlıklar (başlangıç hediyeleri vb.) "taban" sayılır ve yalnız Ocak
  // Sandığı'nda kalır; yerel ocağa kopyalanmaz (ikinci başlangıç ejderhası oluşmasın). Sonradan sunucuda beliren
  // her varlık (NPC alımı, Bedesten alımı, takas, sunucuda çatlama) yerel ocağa da gelir.
  function meta(S, eco) {
    let M = S.srvSync;
    if (!M || M.schema !== 1 || M.acct !== eco.accountId) {
      M = S.srvSync = { schema: 1, acct: eco.accountId, base: serverIds(eco), gone: [], known: [], hatched: {} };
      return { M, first: true };
    }
    M.gone = Array.isArray(M.gone) ? M.gone : []; M.hatched = M.hatched && typeof M.hatched === 'object' ? M.hatched : {};
    M.base = Array.isArray(M.base) ? M.base : [];
    M.known = Array.isArray(M.known) ? M.known : [];
    delete M.localGold; // ENG-12 ilk sürümünün tek kese kaydı; artık kullanılmaz
    return { M, first: false };
  }
  function removeLocal(S, kind, row) {
    if (kind === 'dragons') {
      S.dragons = S.dragons.filter(d => d !== row);
      if (S.star === row.id) S.star = (S.dragons.find(d => !d.dead && !d.old) || {}).id ?? null;
    } else if (kind === 'eggs') S.eggs = S.eggs.filter(e => e !== row);
    else {
      S.inv = S.inv.filter(i => i !== row);
      for (const d of S.dragons) for (const slot of Object.keys(d.equip || {})) if (d.equip[slot] === row.uid) d.equip[slot] = null;
    }
  }
  function importRow(S, kind, row, ctx) {
    const v = clone(row.data);
    v.assetId = row.assetId;
    if (kind === 'dragons') {
      v.id = S.nid++;
      for (const slot of Object.keys(v.equip || {})) v.equip[slot] = null; // sunucu eşya kimlikleri yerelde geçersiz
      v.task = null; delete v.price;
      if (Array.isArray(v.pids)) v.pids = v.pids.map(p => ctx.dragonByServerId[p]).filter(p => p != null);
      S.dragons.push(v);
    } else if (kind === 'eggs') {
      v.id = 'e' + S.uid++;
      v.inK = !!v.inK && ctx.kuluckaFree() > 0;
      S.eggs.push(v);
    } else { v.uid = S.uid++; S.inv.push(v); }
    return v;
  }
  const serverNumId = assetId => { const m = /:dragon:(.+)$/.exec(assetId || ''); return m ? (Number.isSafeInteger(+m[1]) ? +m[1] : m[1]) : null; };

  // Sunucu durumunu yerel `S`'e uygular. Döner: { changed, first, added:[assetId], removed:[assetId] }.
  function reconcile(S, eco, { kuluckaFree = () => 0 } = {}) {
    const out = { changed: false, first: false, added: [], removed: [] };
    if (!S || !eco || !eco.game || !eco.accountId) return out;
    const { M, first } = meta(S, eco);
    if (first) { out.first = true; out.changed = true; }
    // Yerel altına (S.gold) DOKUNULMAZ: Ocak Kesesi ayrı bir sayaçtır (eco.gold).
    // NPC tezgâhları (Rüstem, Hatice) sunucu pazarını gösterir; alım sunucu kimliğiyle yapılır.
    if (eco.game.market && !sameJson(S.market, eco.game.market)) { S.market = clone(eco.game.market); out.changed = true; }
    const live = new Set(serverIds(eco));
    const base = new Set(M.base.filter(id => live.has(id)));
    const gone = new Set(M.gone.filter(id => live.has(id)));
    for (const id of Object.keys(M.hatched)) if (!live.has(id)) delete M.hatched[id];
    // "Bilinen": bir kez yerelde bağlanmış varlık. Yerelde çıktıysa (öldü, siparişe/müzayedeye verildi, yerelde
    // çatladı, satış onayı bekliyor) sunucuda dursa bile yeniden içe alınmaz: dirilme ve tekrar tekrar verme yok.
    const known = new Set(M.known);
    for (const k of KINDS) for (const x of S[k.local]) if (x.assetId) known.add(x.assetId);
    for (const x of S.dead || []) if (x && x.assetId) known.add(x.assetId);
    for (const id of [...known]) if (!live.has(id)) known.delete(id);
    if (base.size !== M.base.length || gone.size !== M.gone.length || known.size !== M.known.length) out.changed = true;
    M.base = [...base]; M.gone = [...gone]; M.known = [...known];
    const ctx = { kuluckaFree, dragonByServerId: {} };
    for (const d of S.dragons) if (d.assetId) { const n = serverNumId(d.assetId); if (n != null) ctx.dragonByServerId[n] = d.id; }
    for (const k of KINDS) {
      const rows = eco[k.server] || [];
      const byId = new Map(rows.map(r => [r.assetId, r]));
      // Sunucuda artık olmayan bağlı varlık (Bedesten'de satıldı, takasla gitti, çatladı) yerelden de çıkar.
      for (const local of [...S[k.local]]) {
        if (!local.assetId || byId.has(local.assetId)) continue;
        removeLocal(S, k.local, local); out.removed.push(local.assetId); out.changed = true;
      }
      for (const row of rows) {
        const linked = S[k.local].find(x => x.assetId === row.assetId);
        if (linked) {
          if (row.data && linked.funding !== row.data.funding) { linked.funding = row.data.funding; out.changed = true; }
          continue;
        }
        if (base.has(row.assetId) || gone.has(row.assetId) || known.has(row.assetId) || (k.local === 'eggs' && M.hatched[row.assetId] != null)) continue;
        // İyimser yerel kopya (henüz assetId'siz) varsa ona bağlanır; yoksa yeni kayıt olarak gelir.
        const key = k.key(row.data || {});
        const twin = S[k.local].find(x => !x.assetId && !x.dead && k.key(x) === key);
        if (twin) { twin.assetId = row.assetId; twin.funding = row.data.funding; }
        else importRow(S, k.local, row, ctx);
        known.add(row.assetId); M.known = [...known];
        out.added.push(row.assetId); out.changed = true;
      }
    }
    return out;
  }
  // Yerelde çatlayan bağlı yumurta: sunucu yumurtası çatlayınca oluşan sunucu ejderhası bu yerel ejderhaya bağlanır.
  function noteLocalHatch(S, egg, dragon) {
    if (!S || !S.srvSync || !egg || !egg.assetId || !dragon) return false;
    S.srvSync.hatched[egg.assetId] = dragon.id;
    return true;
  }
  function linkHatched(S, eggAssetId, dragonRow) {
    const M = S && S.srvSync;
    if (!M || !dragonRow || M.hatched[eggAssetId] == null) return false;
    const d = S.dragons.find(x => x.id === M.hatched[eggAssetId] && !x.assetId);
    delete M.hatched[eggAssetId];
    if (!d) return false;
    d.assetId = dragonRow.assetId; d.funding = dragonRow.data.funding;
    return true;
  }
  const newRows = (before, after, kind) => {
    const had = new Set((before && before[kind] || []).map(r => r.assetId));
    return ((after && after[kind]) || []).filter(r => !had.has(r.assetId));
  };
  // Komut yanıtında yeni beliren ve yerelde henüz bağlanmamış satırlardan, yerel nesneye en uygun olanı (aynı
  // ad/gen anahtarı önce). Art arda iki alımda yanlış eşleşmeyi önler.
  function pickNewRow(S, before, after, kind, obj) {
    const local = kind === 'items' ? 'inv' : kind;
    const keyFn = kind === 'dragons' ? dragonKey : kind === 'eggs' ? eggKey : itemKey;
    const rows = newRows(before, after, kind).filter(r => !(S[local] || []).some(x => x.assetId === r.assetId));
    return (obj && rows.find(r => keyFn(r.data || {}) === keyFn(obj))) || rows[0] || null;
  }
  // Yerel arsa → sunucu arsası. Aynı arsa uygunsa o, değilse sunucuda uygun ilk arsa (yer yalnız görünümdür).
  function serverBuildTile(game, tile) {
    const g = game && game.grid; if (!Array.isArray(g)) return tile;
    if (g[tile] && g[tile].open && !g[tile].b) return tile;
    const i = g.findIndex(t => t && t.open && !t.b);
    return i >= 0 ? i : tile;
  }
  const REJECT = {
    insufficient_gold: 'Ocak Kesesi\'nde yeterli altın yok.',
    debt_outstanding: 'Ocak Kesesi\'nde borç var; borç kapanana dek harcama kapalı.',
    dragon_unavailable: 'Bu ejderha sunucu tezgâhında artık yok ya da sunucu ocağında boş in kalmadı. Tezgâh yenilendi.',
    egg_unavailable: 'Bu yumurta sunucu tezgâhında artık yok. Tezgâh yenilendi.',
    food_locked: 'Ziyafet için sunucu ocağında kiler gerekir.',
    building_unavailable: 'Sunucu ocağında bu bina şu an kurulamıyor (yer, ön koşul ya da ün).',
    land_unavailable: 'Sunucu ocağında açılabilecek arazi yok.',
    dragon_busy: 'Bu ejderha sunucuda görevde ya da kilitli; satılamadı.',
    item_not_sellable: 'Bu eşya satılamaz.',
    asset_not_owned: 'Bu varlık sunucu hesabında yok.',
    market_reserved_asset: 'Bu varlık Bedesten ilanında; önce ilanı geri çek.',
    trade_reserved_asset: 'Bu varlık açık bir takasta; takası bitir ya da iptal et.',
    trade_reserved_dragon: 'Bu ejderha açık bir takasta; takası bitir ya da iptal et.',
    trade_reserved_gold: 'Altının açık bir takasta rezerve.',
    rate_limited: 'Çok sık işlem; biraz sonra yeniden dene.',
  };
  const rejectText = code => REJECT[code] || 'Sunucu bu işlemi onaylamadı; yerel değişiklik geri alındı.';
  const poorText = (price, have) => `Ocak Kesesi'nde yeterli altın yok (${price} gerekli, kesede ${have}). Yerel altının bu tezgâhta geçmez.`;
  const PURSE_HINT = '<b>İki kese:</b> üstteki altın yerel kesendir (Topçu, olay, müzayede, sipariş). <b>Ocak Kesesi</b> sunucudadır: NPC tezgâhları, bina, Bedesten ve takas ondan öder.';

  const api = { reconcile, noteLocalHatch, linkHatched, newRows, pickNewRow, serverBuildTile, rejectText, poorText, PURSE_HINT, dragonKey, eggKey };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------- Tarayıcı ----------
  const ECO = () => (typeof MP !== 'undefined' && MP.economyClient) || null;
  const eco = () => { const c = ECO(); return c && c.state; };
  function active() {
    const e = eco();
    return !!(typeof MP !== 'undefined' && MP.xVerified === true && typeof ECO_LINK !== 'undefined' && ECO_LINK.linked && e && e.game && e.accountId && typeof S !== 'undefined' && S);
  }
  const say = (html, kind) => { if (typeof toast === 'function') toast(html, kind); };
  const AMBIGUOUS = 'Sunucu yanıtı gecikti; işlem aynı istekle otomatik yeniden denenecek.';
  // Yanıtı beklenen Ocak Kesesi harcamaları: art arda alımda kese iki kez sayılmasın.
  let applying = false, pendingSpend = 0;
  const purse = () => { const e = eco(); return e ? Math.max(0, (e.gold || 0) - pendingSpend) : 0; };
  function refreshView() {
    if (typeof modalOn !== 'undefined' && modalOn) { const hudEl = typeof $ === 'function' && $('#hud'); if (hudEl && typeof hud === 'function') hudEl.innerHTML = hud(); }
    else if (typeof render === 'function' && typeof UI !== 'undefined' && UI.view !== 'title') render();
  }
  function apply() {
    if (applying || !active()) return;
    applying = true;
    try {
      const r = reconcile(S, eco(), { kuluckaFree: () => (typeof kuluckaFree === 'function' ? kuluckaFree() : 0) });
      // Bir kez gösterilen ipucu: yerel kese ile Ocak Kesesi'nin farkı.
      if (S.srvSync && !S.srvSync.hinted) { S.srvSync.hinted = true; r.changed = true; say(PURSE_HINT, 'goal'); }
      if (!r.changed) return;
      if (typeof saveGame === 'function') saveGame();
      refreshView();
    } catch (_) { /* senkron hatası yerel oyunu kilitlemez */ } finally { applying = false; }
  }
  // Komutu kuyruğa koy; ok/undo yerel iyimser değişikliği sunucu kararına göre bağlar ya da geri alır.
  function send(type, args, { ok = () => {}, undo = () => {}, soft = false, spend = 0 } = {}) {
    const before = eco();
    pendingSpend += spend;
    return ECO_LINK.exec(type, args).then(r => {
      pendingSpend = Math.max(0, pendingSpend - spend);
      if (r.ok) { try { ok(r.data, before); } catch (_) {} }
      else if (r.definite) {
        if (!soft) { try { undo(r.code); } catch (_) {} say(rejectText(r.code), 'warn'); }
      } else if (r.code !== 'not_linked') say(AMBIGUOUS, 'mute');
      apply();
      return r;
    });
  }
  // Yerel eylemi Ocak Kesesi ile çalıştırır: eylemin altın kontrolü ve iyimser düşümü Ocak Kesesi üzerinden yapılır,
  // sonra yerel altın eski değerine döner (bu işlemlerde yerel altın değişmez; düşülen fark iade edilir). Eylem
  // sırasında tamamlanan yerel hedeflerin ödülü (yerel kural) yerel kesede kalır. Ocak Kesesi yetmezse açık mesaj.
  function viaPurse(orig, el, price) {
    const have = purse();
    if (price != null && have < price) {
      if (typeof SFX !== 'undefined') SFX.play('error');
      say(poorText(price, have), 'warn');
      return false;
    }
    const g0 = S.gold, keep = root.checkGoals;
    let bonus = 0;
    if (typeof keep === 'function') root.checkGoals = function () { const got = keep.apply(this, arguments) || []; for (const g of got) bonus += g.r || 0; return got; };
    S.gold = have;
    try { orig(el); } finally {
      if (typeof keep === 'function') root.checkGoals = keep;
      S.gold = g0 + bonus;
    }
    if (typeof saveGame === 'function') saveGame();
    refreshView();
    return true;
  }
  const wrap = (name, fn) => {
    if (typeof ACT === 'undefined' || typeof ACT[name] !== 'function') return;
    const orig = ACT[name];
    ACT[name] = function (el, ev) { if (!active()) return orig.call(this, el, ev); return fn(el2 => orig.call(this, el2, ev), el); };
  };
  const gone = (assetId, on) => { const M = S.srvSync; if (!M) return; M.gone = M.gone.filter(x => x !== assetId); if (on) M.gone.push(assetId); };

  // Rüstem: NPC'den ejderha sahiplenme → shop.dragon (Ocak Kesesi öder)
  wrap('buyD', (orig, el) => {
    const d = S.market.dragons[+el.dataset.i];
    if (!d) return orig(el);
    const srvId = d.id, price = d.price;
    if (!viaPurse(orig, el, price) || !S.dragons.includes(d)) return; // kese yetmedi ya da yerel kural reddetti (in)
    send('shop.dragon', { id: srvId }, {
      spend: price,
      ok: (data, before) => { const row = pickNewRow(S, before, data.economy, 'dragons', d); if (row && !d.assetId) { d.assetId = row.assetId; d.funding = row.data.funding; } },
      undo: () => { S.dragons = S.dragons.filter(x => x !== d); if (S.st && S.st.acq > 0) S.st.acq--; },
    });
  });
  // Hatice: yumurta alma → shop.egg
  wrap('buyEgg', (orig, el) => {
    const e = S.market.egg;
    if (!e) return orig(el);
    const srvId = e.id, price = typeof eggPrice === 'function' ? eggPrice(e) : e.price;
    if (!viaPurse(orig, el, price) || !S.eggs.includes(e)) return;
    send('shop.egg', { id: srvId }, {
      spend: price,
      ok: (data, before) => { const row = pickNewRow(S, before, data.economy, 'eggs', e); if (row && !e.assetId) { e.assetId = row.assetId; e.funding = row.data.funding; } },
      undo: () => { S.eggs = S.eggs.filter(x => x !== e); },
    });
  });
  // Nuri: yem → shop.food
  wrap('buyFood', (orig, el) => {
    const f = el.dataset.f, had = S.food[f] || 0, price = typeof FOODS !== 'undefined' && FOODS[f] ? FOODS[f].fiyat : null;
    if (!viaPurse(orig, el, price) || (S.food[f] || 0) !== had + 1) return;
    send('shop.food', { key: f }, { spend: price || 0, undo: () => { S.food[f] = Math.max(0, (S.food[f] || 0) - 1); } });
  });
  // Rüstem'e ejderha satışı: sunucuya bağlı ejderha → dragon.sell (bedel Ocak Kesesi'ne); yerel-only ejderha →
  // eski yerel satış (bedel yerel kesene).
  wrap('sell', (orig, el) => {
    const id = +el.dataset.id, d = typeof byId === 'function' ? byId(id) : null;
    if (!d || !d.assetId) return orig(el);
    viaPurse(orig, el, null);
    if (S.dragons.includes(d)) return; // ilk tık yalnız onay ister
    const assetId = d.assetId; gone(assetId, true);
    send('dragon.sell', { assetId }, {
      ok: () => gone(assetId, false),
      undo: () => { gone(assetId, false); if (!S.dragons.includes(d)) S.dragons.push(d); },
    });
  });
  // Kerim'e eşya satışı: bağlı eşya → item.sell (Ocak Kesesi); yerel-only eşya → yerel satış.
  wrap('sellI', (orig, el) => {
    const uid = +el.dataset.uid, it = S.inv.find(i => i.uid === uid);
    if (!it || !it.assetId) return orig(el);
    viaPurse(orig, el, null);
    if (S.inv.includes(it)) return;
    const assetId = it.assetId; gone(assetId, true);
    send('item.sell', { assetId }, {
      ok: () => gone(assetId, false),
      undo: () => { gone(assetId, false); if (!S.inv.includes(it)) S.inv.push(it); },
    });
  });
  // Bina → building.buy (Ocak Kesesi öder; sunucu arsası ayrıca seçilir).
  wrap('build', (orig, el) => {
    const k = el.dataset.k, tile = UI.tile, t = S.grid[tile], had = t && t.b;
    const price = typeof BUILD !== 'undefined' && BUILD[k] ? BUILD[k].fiyat : null;
    if (!viaPurse(orig, el, price) || !t || had || t.b !== k) return;
    send('building.buy', { kind: k, tile: serverBuildTile(eco().game, tile) }, { spend: price || 0, undo: () => { if (t.b === k) t.b = null; } });
  });
  // Arazi açma → land.clear (Ocak Kesesi öder; sunucuda açılabilir arsa seçilir).
  wrap('clear', (orig, el) => {
    const tile = UI.tile, t = S.grid[tile], was = t && t.open;
    const g = eco().game, srvCost = 40 + 14 * ((g && g.cleared) || 0);
    const price = Math.max(srvCost, typeof clearCost === 'function' ? clearCost() : 0);
    if (!viaPurse(orig, el, price) || !t || was || !t.open) return;
    let st = tile;
    if (g && Array.isArray(g.grid) && typeof canClear === 'function') {
      const keep = S.grid;
      try { S.grid = g.grid; if (!canClear(tile)) { const i = g.grid.findIndex((_, j) => canClear(j)); if (i >= 0) st = i; } } catch (_) {} finally { S.grid = keep; }
    }
    send('land.clear', { tile: st }, { spend: srvCost, undo: () => { if (t.open) { t.open = false; S.cleared = Math.max(0, S.cleared - 1); } } });
  });
  // Kuluçkaya koy/çıkar → egg.incubate (yumuşak: sunucu reddederse yerel kuluçka sürer, yalnız sunucu sayacı ilerlemez).
  for (const name of ['egg-in', 'egg-out']) wrap(name, (orig, el) => {
    const e = S.eggs.find(x => x.id === el.dataset.id), was = e && e.inK;
    orig(el);
    if (!e || !e.assetId || e.inK === was) return;
    send('egg.incubate', { assetId: e.assetId, enabled: !!e.inK }, { soft: true });
  });

  // QA YÜKSEK-2 · Sunucuya bağlı ejderha yerel yollarla (müzayedeye çıkarma, siparişe verme, arena "Locadan Bir
  // Teklif") satılamaz/verilemez: bu yollar yalnız yerel altın yazar ve sunucu kaydı yerinde kalırdı (tekrar tekrar
  // verme). Yerel-only ejderha serbest. Bağlı ejderha Rüstem'e (dragon.sell) ya da Bedesten'e konabilir.
  const LINKED_DRAGON = 'Bu ejderha Ocak Sandığı\'nda (sunucuda) kayıtlı; müzayede, sipariş ya da arena teklifiyle verilemez. Rüstem\'e satabilir ya da Bedesten\'e koyabilirsin.';
  const linkedDragon = id => { const d = typeof byId === 'function' ? byId(id) : null; return d && d.assetId ? d : null; };
  const refuse = () => { if (typeof UI !== 'undefined') UI.sellArm = null; if (typeof SFX !== 'undefined') SFX.play('error'); say(LINKED_DRAGON, 'warn'); };
  wrap('auc-sell', (orig, el) => { if (linkedDragon(el.dataset.id)) { refuse(); return; } return orig(el); });
  wrap('orderGive', (orig, el) => { if (linkedDragon(el.dataset.id)) { refuse(); if (typeof render === 'function') render(); return; } return orig(el); });
  // Müzayede salonu açıkken (eski bir modal) bağlı ejderha satışı kapanırsa da yazılmasın.
  if (typeof aucOpen === 'function') {
    const keepOpen = aucOpen;
    root.aucOpen = function (L, sellD) { if (active() && sellD && sellD.assetId) { refuse(); if (typeof closeModal === 'function') closeModal(); return; } return keepOpen.apply(this, arguments); };
  }
  if (typeof FIGHT_POST !== 'undefined' && Array.isArray(FIGHT_POST)) {
    const ev = FIGHT_POST.find(e => e && e.id === 'teklif');
    const sale = ev && ev.opts && ev.opts[0];
    if (sale && typeof sale.fx === 'function') {
      const keepReq = sale.req, keepFx = sale.fx;
      sale.req = c => (active() && c && c.d && c.d.assetId ? 'Ocak Sandığı\'ndaki ejderha burada satılamaz' : keepReq ? keepReq(c) : null);
      sale.fx = c => (active() && c && c.d && c.d.assetId ? (refuse(), `${c.d.name} sunucu hesabında kayıtlı; kâtibe "satılık değil" dedin.`) : keepFx(c));
    }
  }

  root.ECO_SYNC = {
    active, apply, send, purse,
    onLinkChange() { apply(); },
    // Yerel çatlama (ui.js hatchReveal).
    localHatched(egg, d) { if (active()) noteLocalHatch(S, egg, d); },
    // Sunucu haftası kapandı: sunucuda hazır yumurtalar egg.hatch ile çatlatılır; doğan sunucu ejderhası yerelde
    // aynı yumurtadan çatlamış ejderhaya bağlanır, yoksa yeni kayıt olarak gelir.
    afterServerWeek(result) {
      if (!active() || !result || !Array.isArray(result.hatchReady)) return;
      for (const assetId of result.hatchReady) {
        send('egg.hatch', { assetId }, { soft: true, ok: (data, before) => { const row = pickNewRow(S, before, data.economy, 'dragons', null); if (row) linkHatched(S, assetId, row); } });
      }
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
