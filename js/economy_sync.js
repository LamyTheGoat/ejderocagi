'use strict';
// ENG-12 · Kayıtlı (X oturumlu, `xVerified`) hesapta ekonomi işlemleri SUNUCUDA.
// İLKELER:
//  - Oyunu yavaşlatma: işlem yerel `S` üzerinde HEMEN görünür (iyimser), sunucu komutu arka planda `requestId`
//    ile gider (ECO_LINK.exec: hafta kuyruğuyla aynı zincir, tek askı, aynı gövdeyle yeniden deneme).
//  - Sunucu altını ve sunucu varlığı yalnız sunucu komutuyla değişir. Yanıt gelince sunucu durumu esas alınır
//    (reconcile): tezgâh (Rüstem/Hatice) sunucu pazarından, bağlı varlıklar assetId ile eşlenir.
//  - ENG-13 TEK KESE (kullanıcı talimatı): kayıtlı hesapta HUD altını (`S.gold`) sunucu kesesinin aynasıdır.
//    `S.gold`'a her yerel yazım bir erişimciyle görülür: sunucu komutu olan akışlar (NPC, satış, bina, hafta, hedef,
//    müzayede, sipariş, teklif, Topçu, ölüm) kendi komutunu gönderir; kalan yerel değişim tavanlı deftere
//    (`gold.local`, sunucu tavanı uygular, `unknown`) gider. Kuyruk boşalınca kese sunucu değerine eşitlenir. İlk
//    etkinleşmede kayıt öncesi yerel altın bir kez, tavanla (`gold.import`, bound) aktarılır. ENG-12'nin iki kesesi ve
//    bağlı ejderha engelleri kalktı. Misafir: eski yerel altın.
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
    // Yerel altına (S.gold) DOKUNULMAZ: tek kese eşitlemesi tarayıcı kısmında (syncGold).
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
    insufficient_gold: 'Kesende yeterli altın yok; kese sunucudaki değere döndü.',
    debt_outstanding: 'Kesende borç var; borç kapanana dek harcama kapalı.',
    dragon_unavailable: 'Bu ejderha sunucu tezgâhında artık yok ya da sunucu ocağında boş in kalmadı. Tezgâh yenilendi.',
    egg_unavailable: 'Bu yumurta sunucu tezgâhında artık yok. Tezgâh yenilendi.',
    food_locked: 'Ziyafet için sunucu ocağında kiler gerekir.',
    building_unavailable: 'Sunucu ocağında bu bina şu an kurulamıyor (yer, ön koşul ya da ün).',
    land_unavailable: 'Sunucu ocağında açılabilecek arazi yok.',
    dragon_busy: 'Bu ejderha sunucuda görevde ya da kilitli; işlem yapılmadı.',
    item_not_sellable: 'Bu eşya satılamaz.',
    asset_not_owned: 'Bu varlık sunucu hesabında yok.',
    market_reserved_asset: 'Bu ejderha Bedesten ilanında; önce ilanı geri çek. Ejderha ocakta kaldı.',
    trade_reserved_asset: 'Bu ejderha açık bir takasta; takası bitir ya da iptal et. Ejderha ocakta kaldı.',
    trade_reserved_dragon: 'Bu ejderha açık bir takasta; takası bitir ya da iptal et. Ejderha ocakta kaldı.',
    trade_reserved_gold: 'Altının açık bir takasta rezerve.',
    rate_limited: 'Çok sık işlem; biraz sonra yeniden dene.',
    auction_weekly_limit: 'Bu sunucu haftasında bir ejderhanı zaten müzayedeye çıkardın.',
    order_unfit: 'Sunucu kaydındaki ejderha bu siparişin şartlarını tutmuyor; ejderha ocakta kaldı.',
    order_limit: 'Bu hafta (ya da bugün) teslim edilebilecek sipariş sınırına ulaştın; ejderha ocakta kaldı.',
    invalid_order: 'Sipariş sunucuda doğrulanamadı; ejderha ocakta kaldı.',
    offer_limit: 'Bu hafta locadan gelen teklif sınırına ulaştın; ejderha ocakta kaldı.',
    topcu_spin_unavailable: 'Çark hakkın sunucuda görünmüyor; önce aşamayı geç.',
    topcu_no_dragon: 'Sunucu ocağında canlı ejderha yok; sefer ödülü yazılmadı.',
  };
  const rejectText = code => REJECT[code] || 'Sunucu bu işlemi onaylamadı; yerel değişiklik geri alındı.';

  // ENG-13 · Tek kese: yerel altın değişiminin hangi oyun akışından geldiği (çağrı yığınındaki ilk oyun dosyası).
  // Sunucu türe göre tavan uygular (server/local_income.js LOCAL_REASONS). Atfedilemeyen → 'other'.
  const FILE_REASON = {
    week: 'arena', ui: 'arena', race: 'race', racestory: 'race', pageant: 'pageant', kiraathane: 'kiraathane',
    endgame: 'dungeon', hub: 'hub', net: 'raid', dragon_duel: 'raid', orders: 'order', auction: 'sale', pazar: 'sale',
    fightev: 'event', content: 'event', arenastory: 'event', comic: 'event', star: 'event', social: 'event', lineage: 'event',
    cosmetic: 'event', chibi: 'event', career: 'event', season: 'event', bag_social: 'event', roam: 'event', care: 'event', bond: 'event',
    minigame: 'topcu', shm_ui: 'topcu', shm_pvp: 'topcu', shm_data: 'topcu',
  };
  function reasonFromStack(stack) {
    for (const line of String(stack || '').split('\n')) {
      const m = /\/js\/(?:minigame\/(?:[a-z_]+\/)*)?([a-z_0-9]+)\.js/.exec(line);
      if (!m || m[1] === 'economy_sync') continue;
      return FILE_REASON[m[1]] || 'other';
    }
    return 'other';
  }
  // Bekleyen defter kayıtlarına yeni değişimi ekler (aynı tür ve işaret birleşir; tek bildirim ±1.000.000 sınırı).
  function pushLedger(list, reason, amount) {
    const last = list[list.length - 1];
    if (last && last.r === reason && Math.sign(last.a) === Math.sign(amount) && Math.abs(last.a + amount) <= 1_000_000) last.a += amount;
    else list.push({ r: reason, a: amount });
    return list;
  }
  // Yerel sipariş → sunucu sipariş tanımı (orders.js orderGen yapısı; altın sunucuda hesaplanır, burada YOK).
  function orderSpec(o) {
    const lv = Number.isSafeInteger(o.lv) ? o.lv : o.reqs.some(([k]) => ['pig', 'eye', 'par'].includes(k)) ? 2 : o.reqs.length > 2 ? 1 : 0;
    const wk = Math.max(1, Math.min(20, (o.by || 1) - (lv === 0 ? 4 : lv === 1 ? 5 : 7)));
    const parts = ['lv=' + lv, 'wk=' + wk];
    for (const [k, v] of o.reqs) parts.push(k + '=' + (Array.isArray(v) ? v[0] + v[1] : v));
    return parts.join(';');
  }
  // amount: başlangıç altını düşülmüş aktarım isteği; start: sunucuda zaten olan başlangıç altını.
  const importText = (amount, credited, cap, start = 420) => `<b>Tek kese.</b> Altının artık sunucuda, tek kesede: Topçu, olaylar, müzayede, sipariş, tezgâhlar, Bedesten ve takas aynı keseyi kullanır.`
    + (amount > 0 ? ` Kayıt öncesi yerel altının ${start} başlangıç payı sunucuda zaten vardı; kalan ${amount} altının <b>${credited}</b>'i hesabına aktarıldı (hesaba bağlı, takas edilemez)${amount > credited ? `; ${cap} tavanını aşan ${amount - credited} altın aktarılmadı` : ''}.` : '');

  // K-1: üstel geri çekilme (2 sn, 4 sn, … en çok 60 sn).
  const nextBackoff = prev => Math.min(60000, prev ? prev * 2 : 2000);
  const api = { nextBackoff, reconcile, noteLocalHatch, linkHatched, newRows, pickNewRow, serverBuildTile, rejectText, dragonKey, eggKey, reasonFromStack, pushLedger, orderSpec, importText, FILE_REASON };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------- Tarayıcı ----------
  const ECO = () => (typeof MP !== 'undefined' && MP.economyClient) || null;
  const eco = () => { const c = ECO(); return c && c.state; };
  function active() {
    const e = eco();
    return !!(typeof MP !== 'undefined' && MP.xVerified === true && typeof ECO_LINK !== 'undefined' && ECO_LINK.linked && e && e.game && e.accountId && typeof S !== 'undefined' && S);
  }
  // Tek kese bu kayıtta benimsendi mi (ilk etkinleşmede bir kez; sonra çevrimdışı da defter tutulur).
  const one = () => !!(typeof S !== 'undefined' && S && S.srvSync && S.srvSync.one === true);
  const say = (html, kind) => { if (typeof toast === 'function') toast(html, kind); };
  const AMBIGUOUS = 'Sunucu yanıtı gecikti; işlem aynı istekle otomatik yeniden denenecek.';
  let applying = false, inflight = 0, coolUntil = 0;
  const LOCAL_START_GOLD = 420;
  const purse = () => { const e = eco(); return e ? Math.max(0, e.gold || 0) : 0; };
  function refreshView() {
    if (typeof modalOn !== 'undefined' && modalOn) { const hudEl = typeof $ === 'function' && $('#hud'); if (hudEl && typeof hud === 'function') hudEl.innerHTML = hud(); }
    else if (typeof render === 'function' && typeof UI !== 'undefined' && UI.view !== 'title') render();
  }

  // ---- Altın erişimcisi: S.gold'a her yazım tek tek görülür (yerel kod değişmeden) ----
  // Bağlam yığını: 'routed' (sunucu komutu ayrıca gönderildi), 'week' (sunucu week.end esas), 'goal' (goal.reach),
  // 'topcu-clear' (topcu.clear; yerel taş ödülü de yazılmaz), 'sale' (bağlı olmayan ejderha satışı). Yoksa çağrı yığını.
  let raw = 0, holder = null, syncing = false;
  const ctx = [], expectAny = { topcu: 0 };
  const getGold = () => raw;
  function setGold(v) {
    const n = Number(v), next = Number.isFinite(n) ? Math.round(n) : raw;
    const delta = next - raw; raw = next;
    if (syncing || !delta) return;
    note(delta);
  }
  function install() {
    if (typeof S === 'undefined' || !S || !one()) return false;
    const d = Object.getOwnPropertyDescriptor(S, 'gold');
    if (holder === S && d && d.get === getGold) return true;
    raw = Math.round(Number(S.gold) || 0); holder = S;
    Object.defineProperty(S, 'gold', { configurable: true, enumerable: true, get: getGold, set: setGold });
    return true;
  }
  const within = (tag, fn) => { ctx.push(tag); try { return fn(); } finally { ctx.pop(); } };
  const ledger = () => { const M = S.srvSync; M.ledger = Array.isArray(M.ledger) ? M.ledger : []; return M.ledger; };
  let flushTimer = null;
  function note(delta) {
    if (holder !== S || !one()) return;
    let tag = ctx.length ? ctx[ctx.length - 1] : reasonFromStack(new Error().stack);
    if (tag === 'routed' || tag === 'goal' || tag === 'topcu-clear') return;
    if (tag === 'week') { if (typeof ECO_LINK !== 'undefined' && ECO_LINK.linked) return; tag = 'other'; } // çevrimdışı hafta: defter
    if (tag === 'topcu') {
      if (delta > 0 && expectAny.topcu > 0) { expectAny.topcu--; return; } // çark altını: topcu.spin zaten yazdı
      tag = 'dungeon'; // sunucuya gitmemiş Topçu altını (çevrimdışı oyun): tavanlı defter
    }
    pushLedger(ledger(), tag, delta);
    clearTimeout(flushTimer); flushTimer = setTimeout(() => { flushLedger(); }, 700);
  }
  function syncGold() {
    if (!one() || !install()) return false;
    const c = ECO(), e = eco();
    if (!e || inflight > 0 || ledger().length || expectAny.topcu > 0 || (c && c.hasPending) || (ECO_LINK.state && ECO_LINK.state.queued > 0)) return false;
    if (raw === e.gold) return false;
    syncing = true; try { S.gold = e.gold; } finally { syncing = false; }
    return true;
  }
  function flushLedger() {
    if (!active() || !one() || Date.now() < coolUntil) return;
    const L = ledger();
    if (!L.length) return;
    const items = L.splice(0, L.length); // devredildi: kuyruğa giren komut ECO istemcisinde kalıcıdır (requestId)
    if (typeof saveGame === 'function') saveGame();
    for (const it of items) {
      if (!it.a) continue;
      send('gold.local', { reason: it.r, amount: it.a }, { soft: true,
        fail: (code, definite) => {
          // Oran sınırı ya da belirsiz yanıt: kayıt kaybolmaz, geri konur ve beklenir (anında yeniden deneme yok).
          if (!definite || code === 'rate_limited') { pushLedger(ledger(), it.r, it.a); coolUntil = Date.now() + (code === 'rate_limited' ? 5000 : 3000); clearTimeout(flushTimer); flushTimer = setTimeout(() => { flushLedger(); }, coolUntil - Date.now()); return; }
          if (code === 'insufficient_gold' || code === 'debt_outstanding') say(rejectText(code), 'warn');
        } });
    }
  }

  // Komutu kuyruğa koy; ok/undo yerel iyimser değişikliği sunucu kararına göre bağlar ya da geri alır.
  function send(type, args, { ok = () => {}, undo = () => {}, fail = () => {}, soft = false } = {}) {
    const before = eco();
    inflight++;
    return ECO_LINK.exec(type, args).then(r => {
      inflight = Math.max(0, inflight - 1);
      if (r.ok) { try { ok(r.data, before); } catch (_) {} }
      else {
        try { fail(r.code, r.definite); } catch (_) {}
        if (r.definite) { if (!soft) { try { undo(r.code); } catch (_) {} say(rejectText(r.code), 'warn'); } }
        else if (r.code !== 'not_linked' && !soft) say(AMBIGUOUS, 'mute');
      }
      apply();
      return r;
    });
  }
  // İlk etkinleşme: tek kese benimsenir, kayıt öncesi yerel altın bir kez sunucuya aktarılır (tavanlı, bound).
  function migrate() {
    const M = S.srvSync;
    if (!M || M.one === true) return false;
    // Yerel yeni oyunun başlangıç altını (week.js newGame: 420) sunucu başlangıcıyla aynıdır; iki kez sayılmaz.
    const amount = Math.max(0, Math.min(1_000_000, Math.round(Number(S.gold) || 0) - LOCAL_START_GOLD));
    M.one = true; M.ledger = []; M.die = Array.isArray(M.die) ? M.die : [];
    delete M.hinted;
    install();
    if (amount > 0) send('gold.import', { amount }, { soft: true, ok: data => { const r = data.result || {}; if (!r.already) say(importText(amount, r.credited || 0, r.cap || 0, LOCAL_START_GOLD), 'goal'); } });
    else say(importText(0, 0, 0, LOCAL_START_GOLD), 'goal'); // tek kese bir kez açıklanır
    return true;
  }
  function apply() {
    if (applying || !active()) return;
    applying = true;
    try {
      lateWrap();
      const r = reconcile(S, eco(), { kuluckaFree: () => (typeof kuluckaFree === 'function' ? kuluckaFree() : 0) });
      let changed = r.changed;
      if (migrate()) changed = true;
      install();
      flushDies(); flushGoals(); flushLedger();
      if (syncGold()) changed = true;
      if (!changed) return;
      if (typeof saveGame === 'function') saveGame();
      refreshView();
    } catch (_) { /* senkron hatası yerel oyunu kilitlemez */ } finally { applying = false; }
  }
  const wrap = (name, fn) => {
    if (typeof ACT === 'undefined' || typeof ACT[name] !== 'function') return;
    const orig = ACT[name];
    ACT[name] = function (el, ev) { if (!active()) return orig.call(this, el, ev); return fn(el2 => orig.call(this, el2, ev), el); };
  };
  const gone = (assetId, on) => { const M = S.srvSync; if (!M) return; M.gone = M.gone.filter(x => x !== assetId); if (on) M.gone.push(assetId); };
  // Yerel eylemi sunucu komutuyla eşler: eylemin altın değişimi yerel kesede iyimser görünür, deftere yazılmaz
  // (komut ayrıca gider); yanıt gelince kese sunucu değerine eşitlenir.
  function routed(orig, el) {
    within('routed', () => orig(el));
    if (typeof saveGame === 'function') saveGame();
    refreshView();
  }

  // Rüstem: NPC'den ejderha sahiplenme → shop.dragon
  wrap('buyD', (orig, el) => {
    const d = S.market.dragons[+el.dataset.i];
    if (!d) return orig(el);
    const srvId = d.id;
    routed(orig, el);
    if (!S.dragons.includes(d)) return; // kese yetmedi ya da yerel kural reddetti (in)
    send('shop.dragon', { id: srvId }, {
      ok: (data, before) => { const row = pickNewRow(S, before, data.economy, 'dragons', d); if (row && !d.assetId) { d.assetId = row.assetId; d.funding = row.data.funding; } },
      undo: () => { S.dragons = S.dragons.filter(x => x !== d); if (S.st && S.st.acq > 0) S.st.acq--; },
    });
  });
  // Hatice: yumurta alma → shop.egg
  wrap('buyEgg', (orig, el) => {
    const e = S.market.egg;
    if (!e) return orig(el);
    const srvId = e.id;
    routed(orig, el);
    if (!S.eggs.includes(e)) return;
    send('shop.egg', { id: srvId }, {
      ok: (data, before) => { const row = pickNewRow(S, before, data.economy, 'eggs', e); if (row && !e.assetId) { e.assetId = row.assetId; e.funding = row.data.funding; } },
      undo: () => { S.eggs = S.eggs.filter(x => x !== e); },
    });
  });
  // Nuri: yem → shop.food
  wrap('buyFood', (orig, el) => {
    const f = el.dataset.f, had = S.food[f] || 0;
    routed(orig, el);
    if ((S.food[f] || 0) !== had + 1) return;
    send('shop.food', { key: f }, { undo: () => { S.food[f] = Math.max(0, (S.food[f] || 0) - 1); } });
  });
  // Rüstem'e satış: bağlı ejderha → dragon.sell; bağlı olmayan → yerel satış (bedel tavanlı defterle keseye, 'sale').
  wrap('sell', (orig, el) => {
    const id = +el.dataset.id, d = typeof byId === 'function' ? byId(id) : null;
    if (!d || !d.assetId) return within('sale', () => orig(el));
    routed(orig, el);
    if (S.dragons.includes(d)) return; // ilk tık yalnız onay ister
    const assetId = d.assetId; gone(assetId, true);
    send('dragon.sell', { assetId }, {
      ok: () => gone(assetId, false),
      undo: () => { gone(assetId, false); if (!S.dragons.includes(d)) S.dragons.push(d); },
    });
  });
  // Kerim'e eşya satışı: bağlı eşya → item.sell; bağlı olmayan → yerel satış.
  wrap('sellI', (orig, el) => {
    const uid = +el.dataset.uid, it = S.inv.find(i => i.uid === uid);
    if (!it || !it.assetId) return within('sale', () => orig(el));
    routed(orig, el);
    if (S.inv.includes(it)) return;
    const assetId = it.assetId; gone(assetId, true);
    send('item.sell', { assetId }, {
      ok: () => gone(assetId, false),
      undo: () => { gone(assetId, false); if (!S.inv.includes(it)) S.inv.push(it); },
    });
  });
  // Bina → building.buy (sunucu arsası ayrıca seçilir).
  wrap('build', (orig, el) => {
    const k = el.dataset.k, tile = UI.tile, t = S.grid[tile], had = t && t.b;
    routed(orig, el);
    if (!t || had || t.b !== k) return;
    send('building.buy', { kind: k, tile: serverBuildTile(eco().game, tile) }, { undo: () => { if (t.b === k) t.b = null; } });
  });
  // Arazi açma → land.clear (sunucuda açılabilir arsa seçilir).
  wrap('clear', (orig, el) => {
    const tile = UI.tile, t = S.grid[tile], was = t && t.open;
    const g = eco().game;
    routed(orig, el);
    if (!t || was || !t.open) return;
    let st = tile;
    if (g && Array.isArray(g.grid) && typeof canClear === 'function') {
      const keep = S.grid;
      try { S.grid = g.grid; if (!canClear(tile)) { const i = g.grid.findIndex((_, j) => canClear(j)); if (i >= 0) st = i; } } catch (_) {} finally { S.grid = keep; }
    }
    send('land.clear', { tile: st }, { undo: () => { if (t.open) { t.open = false; S.cleared = Math.max(0, S.cleared - 1); } } });
  });
  // Kuluçkaya koy/çıkar → egg.incubate (yumuşak).
  for (const name of ['egg-in', 'egg-out']) wrap(name, (orig, el) => {
    const e = S.eggs.find(x => x.id === el.dataset.id), was = e && e.inK;
    orig(el);
    if (!e || !e.assetId || e.inK === was) return;
    send('egg.incubate', { assetId: e.assetId, enabled: !!e.inK }, { soft: true });
  });
  // Hafta: yerel hafta altını yok sayılır; sunucu week.end bakım/geliri hesaplar ve kese ona eşitlenir.
  if (typeof ACT !== 'undefined' && typeof ACT.endweek === 'function') {
    const keepWeek = ACT.endweek;
    ACT.endweek = function () { if (!one()) return keepWeek.apply(this, arguments); return within('week', () => keepWeek.apply(this, arguments)); };
  }
  // Hedefler: yerel ödül yazılmaz; her yeni hedef goal.reach ile sunucuda bir kez ödenir (DÜŞÜK-1).
  if (typeof checkGoals === 'function') {
    const keepGoals = checkGoals;
    root.checkGoals = function () {
      if (!one()) return keepGoals.apply(this, arguments);
      const got = within('goal', () => keepGoals.apply(this, arguments)) || [];
      for (const g of got) queueGoal(g.id);
      return got;
    };
  }
  function queueGoal(id) {
    const M = S.srvSync; M.goalQ = Array.isArray(M.goalQ) ? M.goalQ : [];
    if (!M.goalQ.includes(id)) M.goalQ.push(id);
    // Eylemin kendi komutundan SONRA gönderilir: sunucu önce kendi durumuyla hedefi öder (doğru kaynak), goal.reach
    // yalnız sunucunun göremediği hedefler için kalır (sunucu zaten ödediyse lready).
    setTimeout(() => { if (active()) flushGoals(); }, 0);
  }
  function flushGoals() {
    const M = S.srvSync; if (!M || !Array.isArray(M.goalQ) || !M.goalQ.length || !active()) return;
    for (const id of M.goalQ.splice(0)) send('goal.reach', { id }, { soft: true });
  }

  // ---- A-7 · Ejderha yaşam döngüsü ----
  // Ölüm: yerel oyun kuralıdır (engellenmez). Bağlı ejderha için dragon.die kuyruğa girer; sunucu kaydı kalkar
  // (Sandık ve Bedesten listesi). İlandaysa ilan geri çekilip yeniden denenir; takastaysa takas bitince denenir.
  function queueDie(assetId) {
    const M = S.srvSync; if (!M) return;
    M.die = Array.isArray(M.die) ? M.die : [];
    if (!M.die.includes(assetId)) M.die.push(assetId);
    if (typeof saveGame === 'function') saveGame();
    if (active()) flushDies();
  }
  // K-1 (QA): kesin retten sonra ANINDA yeniden deneme yok. Her ejderha için üstel geri çekilme (2 sn → 60 sn), kayıtta
  // saklanır (yenilemede döngü yeniden başlamaz). Sunucu durumu değişirse (sürüm) bir kez erken denenir. `rate_limited`
  // tüm arka plan gönderimlerini bekletir (cool).
  const dieBusy = new Set();
  let dieTimer = null;
  function scheduleDies(ms) { clearTimeout(dieTimer); dieTimer = setTimeout(() => { dieTimer = null; if (active()) flushDies(); }, Math.max(50, ms)); }
  function flushDies() {
    const M = S.srvSync; if (!M || !Array.isArray(M.die) || !active()) return;
    M.dieWait = M.dieWait && typeof M.dieWait === 'object' ? M.dieWait : {};
    const now = Date.now(), ver = (eco() || {}).version;
    if (now < coolUntil) return scheduleDies(coolUntil - now);
    let soonest = Infinity;
    for (const assetId of M.die) {
      if (dieBusy.has(assetId)) continue;
      const W = M.dieWait[assetId];
      if (W && now < W.next && W.ver === ver) { soonest = Math.min(soonest, W.next - now); continue; }
      dieBusy.add(assetId);
      const done = () => { dieBusy.delete(assetId); M.die = M.die.filter(x => x !== assetId); delete M.dieWait[assetId]; if (typeof saveGame === 'function') saveGame(); };
      const wait = code => {
        const prev = M.dieWait[assetId], delay = nextBackoff(prev && prev.delay);
        M.dieWait[assetId] = { next: Date.now() + delay, delay, ver: (eco() || {}).version, code };
        if (code === 'rate_limited') coolUntil = Date.now() + delay;
        if (typeof saveGame === 'function') saveGame();
        dieBusy.delete(assetId); scheduleDies(delay);
      };
      send('dragon.die', { assetId }, { soft: true, ok: done, fail: (code, definite) => {
        if (definite && code === 'asset_not_owned') return done();
        if (definite && code === 'market_reserved_asset') { wait(code); return withdraw(assetId).finally(() => { const W2 = M.dieWait[assetId]; if (W2) W2.ver = -1; scheduleDies(200); }); }
        if (definite && /^trade_reserved/.test(code) && !(prevCode(assetId))) say('Ölen ejderha açık bir takasta; takas bitince sunucu kaydı kalkacak.', 'warn');
        wait(code); // takas, kilit, oran sınırı ya da belirsiz yanıt: geri çekil
      } });
    }
    if (soonest < Infinity) scheduleDies(soonest);
  }
  const prevCode = assetId => { const W = S.srvSync && S.srvSync.dieWait && S.srvSync.dieWait[assetId]; return W && W.code; };
  // Sandık: yerelde ölmüş ama sunucuda henüz kalkmamış (takas/ilan/kilit) ejderha için sade durum.
  const pendingDeath = assetId => !!(typeof S !== 'undefined' && S && S.srvSync && Array.isArray(S.srvSync.die) && S.srvSync.die.includes(assetId));  async function withdraw(assetId) {
    const MC = typeof MARKET_CLIENT !== 'undefined' ? MARKET_CLIENT : null;
    if (!MC) return;
    try {
      await MC.refresh();
      const L = (MC.state.mine || []).find(l => l.assetId === assetId && l.status === 'open');
      if (L) { await MC.cancel(L.id); say('Ölen ejderhanın Bedesten ilanı geri çekildi.', 'mute'); }
    } catch (_) {}
  }
  if (typeof killDragon === 'function') {
    const keepKill = killDragon;
    root.killDragon = function (d) {
      const assetId = one() && d && d.assetId ? d.assetId : null;
      const out = keepKill.apply(this, arguments);
      if (assetId) queueDie(assetId);
      return out;
    };
  }
  // Çevrimdışıyken bağlı ejderha müzayede, sipariş, teklif ya da Rüstem satışıyla verilemez (sunucu doğrulamalı).
  const OFFLINE_EXIT = 'Bu ejderha sunucu hesabında kayıtlı; vermek ya da satmak için sunucuya bağlı olmalısın.';
  const offlineLinked = d => one() && !active() && d && d.assetId;
  const offlineGuard = (name, pickD) => {
    if (typeof ACT === 'undefined' || typeof ACT[name] !== 'function') return;
    const orig = ACT[name];
    ACT[name] = function (el, ev) {
      if (offlineLinked(pickD(el))) { if (typeof UI !== 'undefined') UI.sellArm = null; if (typeof SFX !== 'undefined') SFX.play('error'); say(OFFLINE_EXIT, 'warn'); return; }
      return orig.call(this, el, ev);
    };
  };
  const byDataId = el => (typeof byId === 'function' && el && el.dataset ? byId(el.dataset.id) : null);
  // Sipariş teslimi → order.deliver (altın sunucuda orders.js formülüyle; ün ve teşekkür yumurtası yerel).
  wrap('orderGive', (orig, el) => {
    const O = typeof orders === 'function' ? orders() : null, o = O && O.list.find(x => x.id === el.dataset.o), d = byDataId(el);
    if (!o || !d || !d.assetId || UI.sellArm !== 'o' + o.id + d.id) return orig(el); // onay tıkı ya da bağlı olmayan
    const snap = { list: O.list.slice(), un: S.un, orders: S.st.orders, eggs: S.eggs.slice() };
    routed(orig, el);
    if (S.dragons.includes(d)) return;
    const assetId = d.assetId; gone(assetId, true);
    send('order.deliver', { assetId, spec: orderSpec(o) }, {
      ok: data => { gone(assetId, false); const g = data.result && data.result.gold; if (g != null && g !== o.gold) say(`Sipariş bedeli sunucuda ${g} altın olarak hesaplandı.`, 'mute'); },
      undo: () => { gone(assetId, false); if (!S.dragons.includes(d)) S.dragons.push(d); O.list = snap.list; S.un = snap.un; S.st.orders = snap.orders; S.eggs = snap.eggs; },
    });
  });
  offlineGuard('orderGive', byDataId);
  offlineGuard('auc-sell', byDataId);
  offlineGuard('sell', byDataId);

  // Müzayede: bağlı ejderhanın satışı sunucuda oynanır (auction.sell). Salon hemen açılır; teklifçiler sunucunun
  // tohumlu sonucunu sırayla oynar (yanıt gecikirse teklifçiler bekler). Bağlı olmayan ejderha eski yerel müzayede.
  if (typeof aucOpen === 'function') {
    const keepOpen = aucOpen;
    root.aucOpen = function (L, sellD) {
      const out = keepOpen.apply(this, arguments);
      if (!(active() && sellD && sellD.assetId) || typeof AUC === 'undefined' || !AUC) return out;
      const A = AUC; A.srv = { pending: true };
      send('auction.sell', { assetId: sellD.assetId }, { soft: true,
        ok: data => {
          const R = data.result || {}, sim = R.auction;
          if (!sim) { A.srv = { failed: true }; return; }
          const base = typeof BIDDERS !== 'undefined' ? BIDDERS : [];
          A.bidders = sim.bidders.map(sb => ({ ...(base.find(b => b.id === sb.id) || { id: sb.id, ad: sb.id, npc: sb.id, says: ['…'] }), max: sb.max, out: false, last: null }));
          A.v = sim.v; A.step = sim.step; A.price = Math.round(sim.v * 0.4 / 5) * 5; A.leader = null;
          A.srv = { log: sim.log, sold: !!R.sold, i: 0 };
          if (AUC === A && !A.over && typeof aucRender === 'function') aucRender();
        },
        fail: (code, definite) => {
          A.srv = { failed: true };
          if (AUC !== A) return;
          clearTimeout(A.timer); AUC = null;
          if (typeof closeModal === 'function') closeModal();
          say(definite ? rejectText(code) : 'Müzayede sunucuda doğrulanamadı; ejderhan ocakta. Sonuç gelirse kese ve ocak kendiliğinden güncellenir.', 'warn');
        } });
      return out;
    };
  }
  if (typeof aucNpcTurn === 'function') {
    const keepTurn = aucNpcTurn;
    root.aucNpcTurn = function () {
      const A = typeof AUC !== 'undefined' ? AUC : null;
      if (!A || !A.srv) return keepTurn.apply(this, arguments);
      if (A.over || A.srv.failed) return;
      if (A.srv.pending) { A.timer = setTimeout(root.aucNpcTurn, 250); return; }
      const R = A.srv;
      if (R.i >= R.log.length) { for (const B of A.bidders) if (B.id !== A.leader) B.out = true; aucRender(); return aucHammer(); }
      const [id, price] = R.log[R.i++];
      const B = A.bidders.find(b => b.id === id);
      for (const X of A.bidders) if (X !== B && !X.out && X.max < price + A.step) X.out = true;
      A.price = price; A.leader = id; A.count = 0; if (B) B.last = price;
      aucRender(); if (B && typeof aucSay === 'function') aucSay(B.id, `<b>${price}!</b> ${typeof pick === 'function' && B.says ? pick(B.says) : ''}`);
      if (typeof SFX !== 'undefined') SFX.play('chatter');
      A.timer = setTimeout(root.aucNpcTurn, root.__fastFx ? 10 : 520);
    };
  }
  if (typeof aucClose === 'function') {
    const keepClose = aucClose;
    root.aucClose = function () {
      const A = typeof AUC !== 'undefined' ? AUC : null;
      if (A && A.srv && A.sellD) {
        if (A.srv.pending || A.srv.failed) return; // sonuç gelmeden tokmak inmez
        if (!A.srv.sold) A.leader = null;
        return within('routed', () => keepClose.apply(this, arguments)); // altın auction.sell ile sunucuda
      }
      if (A && A.sellD && !A.sellD.assetId) return within('sale', () => keepClose.apply(this, arguments));
      return keepClose.apply(this, arguments);
    };
  }
  // Arena "Locadan Bir Teklif": bağlı ejderha → offer.sell (fiyat sunucuda value × 1.4).
  if (typeof FIGHT_POST !== 'undefined' && Array.isArray(FIGHT_POST)) {
    const ev = FIGHT_POST.find(e => e && e.id === 'teklif');
    const sale = ev && ev.opts && ev.opts[0];
    if (sale && typeof sale.fx === 'function') {
      const keepReq = sale.req, keepFx = sale.fx;
      sale.req = c => (offlineLinked(c && c.d) ? 'Sunucuya bağlı değilsin; bu ejderha şimdi satılamaz' : keepReq ? keepReq(c) : null);
      sale.fx = c => {
        const d = c && c.d;
        if (!d || !d.assetId || !one()) return within('sale', () => keepFx(c));
        if (!active()) return `${d.name} sunucu hesabında kayıtlı; bağlantı yokken kâtibe "şimdi olmaz" dedin.`;
        const out = within('routed', () => keepFx(c));
        const assetId = d.assetId; gone(assetId, true);
        send('offer.sell', { assetId }, {
          ok: data => { gone(assetId, false); const p = data.result && data.result.price; if (p != null && p !== c.price) say(`Teklif bedeli sunucuda ${p} altın olarak kesinleşti.`, 'mute'); },
          undo: () => { gone(assetId, false); if (!S.dragons.includes(d)) S.dragons.push(d); },
        });
        return out;
      };
    }
  }

  // ---- Topçu (Şahmeran/Kalgarot/Abra seferleri, kervan, PvP) ----
  // Geçiş ödülü topcu.clear ile sunucuda (sabit tablo + garantili düşüşler sunucu RNG'siyle); yerel altın ve yerel
  // taş/cevher/kalıp ödülü YAZILMAZ, sunucunun ürettiği düşüş yerelde aynen gösterilir. Çark topcu.spin ile sunucuda
  // zarlanır; dilim yerelde gösterilir. Misafir/çevrimdışı: eski yerel akış.
  let keepAward = null, lateDone = false;
  const SHM_ = () => (typeof SHM !== 'undefined' ? SHM : null);
  function topcuMode() {
    const H = SHM_(); if (!H) return 'stage';
    if (H.gameMode === 'caravan') return 'caravan:' + String(H.caravanRouteId || 'kizil_vadi').replace(/[^a-z_]/g, '');
    if (H.gameMode === 'pvp') return 'pvp';
    const sub = String(H.raidId || 'sahmeran').replace(/[^a-z_]/g, '');
    const ex = typeof isExtremeMode === 'function' && isExtremeMode();
    return (H.difficulty === 'normal' ? 'raid_normal' : ex ? 'raid_extreme' : 'raid_hard') + ':' + sub;
  }
  function wheelName() {
    const H = SHM_();
    if (H && H.wheelMode === 'minor') return 'minor' + Math.max(1, Math.min(3, Number(H.selectedStage || H.instanceStage || 1) || 1));
    const ex = typeof isExtremeMode === 'function' && isExtremeMode();
    const hard = H && ['zor', 'agir', 'destansi'].includes(H.difficulty);
    return ex ? 'major_extreme' : hard ? 'major_hard' : 'major_normal';
  }
  function topcuClear(mode) {
    send('topcu.clear', { mode }, { soft: true,
      ok: data => {
        const R = data.result || {}, H = SHM_();
        const labels = R.drops && Object.keys(R.drops).length && keepAward ? keepAward(R.drops) : [];
        if (H && H.stats) {
          H.stats.guaranteedDropsText = [R.gold ? `+${R.gold} Altın` : '', ...(labels || [])].filter(Boolean).join(' · ') || H.stats.guaranteedDropsText;
          if (H.screen === 'victory' && typeof renderSahmeranApp === 'function') renderSahmeranApp();
        }
        if (typeof saveGame === 'function') saveGame();
      },
      fail: (code, definite) => { if (definite) say(rejectText(code), 'warn'); } });
  }
  function lateWrap() {
    if (lateDone) return;
    if (typeof awardChibiStones !== 'function' || typeof completeSahmeranDungeonVictory !== 'function') return;
    lateDone = true;
    keepAward = awardChibiStones;
    root.awardChibiStones = function () { if (ctx[ctx.length - 1] === 'topcu-clear') return []; return keepAward.apply(this, arguments); };
    const keepStage = openStageClearBlessingModal, keepVictory = completeSahmeranDungeonVictory, keepSpin = spinSahmeranLootWheel;
    root.openStageClearBlessingModal = function () {
      if (!active()) return keepStage.apply(this, arguments);
      const out = within('topcu-clear', () => keepStage.apply(this, arguments));
      topcuClear('stage');
      return out;
    };
    root.completeSahmeranDungeonVictory = function () {
      if (!active()) return keepVictory.apply(this, arguments);
      const mode = topcuMode();
      const out = within('topcu-clear', () => keepVictory.apply(this, arguments));
      topcuClear(mode);
      return out;
    };
    root.spinSahmeranLootWheel = function (forced) {
      const H = SHM_();
      if (!active() || forced != null || !H || H.wheelSpinning) return keepSpin.apply(this, arguments);
      const minor = H.wheelMode === 'minor' && H.gameMode !== 'pvp' && H.gameMode !== 'caravan';
      if (minor && (H.wheelSpinsCount || 0) >= 1) return keepSpin.apply(this, arguments); // yerel uyarı
      if (!minor && (H.wheelSpinsCount || 0) > 0 && (S.gold || 0) < 120) return keepSpin.apply(this, arguments); // yerel uyarı
      H.wheelSpinning = true;
      send('topcu.spin', { wheel: wheelName() }, { soft: true,
        ok: data => {
          const R = data.result || {};
          H.wheelSpinning = false;
          if (R.gold > 0 || /gold/.test(R.id || '')) expectAny.topcu++;
          within('routed', () => keepSpin.call(this, R.idx));
        },
        fail: (code, definite) => { H.wheelSpinning = false; say(definite ? rejectText(code) : 'Çark sunucuda doğrulanamadı; biraz sonra yeniden çevir.', 'warn'); if (typeof renderSahmeranApp === 'function') renderSahmeranApp(); } });
    };
  }
  if (root.addEventListener) root.addEventListener('load', () => { try { lateWrap(); } catch (_) {} });
  // Kayıt yeniden yüklenirse (yeni S nesnesi) erişimci yeniden takılır.
  if (typeof setInterval === 'function') setInterval(() => { try { install(); } catch (_) {} }, 1000);

  root.ECO_SYNC = {
    active, apply, send, purse, one: () => one() && active(),
    // Kese adı: kayıtlı hesapta tek kese; misafirde sunucu hesabı ayrı ("Ocak Kesesi").
    purseName: () => (one() && active() ? 'Kese' : 'Ocak Kesesi'),
    onLinkChange() { apply(); },
    localHatched(egg, d) { if (active()) noteLocalHatch(S, egg, d); },
    afterServerWeek(result) {
      if (!active() || !result || !Array.isArray(result.hatchReady)) return;
      for (const assetId of result.hatchReady) {
        send('egg.hatch', { assetId }, { soft: true, ok: (data, before) => { const row = pickNewRow(S, before, data.economy, 'dragons', null); if (row) linkHatched(S, assetId, row); } });
      }
    },
    // Test/teşhis: bekleyen defter ve ölüm kuyruğu.
    pendingDeath,
    get pending() { return { inflight, ledger: one() ? ledger().slice() : [], die: (S && S.srvSync && S.srvSync.die) || [], expect: { ...expectAny } }; },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
