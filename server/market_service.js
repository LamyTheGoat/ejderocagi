'use strict';
// ENG-07 · Gerçek oyunculu Bedesten (sunucu otoriteli, serbest fiyat).
// Saf kurallar. Depolar (SQLite, Firestore) ilanı, iki hesabı, rezervasyonu ve makbuzu
// TEK transaction içinde okur/yazar. Kimlik yalnız oturumdan gelir; istemci hesap, satıcı,
// kaynak sınıfı veya varlık verisi gönderemez.
const crypto = require('node:crypto');
const sources = require('./economy_sources');
const { debtOf, assertNoDebt } = require('./economy_debt');
const { transfer, guardReservation } = require('./trade_service');
const { normalizeOffer } = require('../js/trade_engine');

// D7 (komisyon/harç) ONAY BEKLİYOR. Tek yapılandırma noktası; 0 dışı değer açılışta reddedilir.
const MARKET_FEE_BPS = 0;
if (MARKET_FEE_BPS !== 0) throw new Error('market_fee_not_approved');

// Yalnız teknik sınırlar. Fiyat önerisi/formülü yoktur (serbest fiyat, D-016).
const LIMITS = Object.freeze({
  maxUnitPrice: 2_000_000_000, // MAX_GOLD ile aynı
  maxTotal: 2_000_000_000,     // birim fiyat × miktar taşamaz
  maxFoodQuantity: 100_000,    // normalizeOffer yem üst sınırı ile aynı
  maxOpenPerAccount: 20,
  publicPage: 100,
  minePage: 30,
  salesKept: 20,
});
const KINDS = Object.freeze({ dragon: 'dragons', egg: 'eggs', item: 'items', food: 'food' });
const FIELD = Object.freeze({ items: 'inv', dragons: 'dragons', eggs: 'eggs' });

function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const clone = value => JSON.parse(JSON.stringify(value));
const uuid = value => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
const short = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const listingIdFor = (actor, requestId) => 'mk_' + short('listing:' + actor + ':' + requestId);
const saleIdFor = (actor, requestId) => 'ms_' + short('sale:' + actor + ':' + requestId);

const SHAPES = Object.freeze({
  list: ['kind', 'quantity', 'unitPrice'],
  cancel: ['listingId'],
  buy: ['listingId', 'quantity', 'unitPrice'],
});
// Makbuz hash'i yalnız komutun anlamsal içeriğini kapsar: sürüm, saat veya sunucu durumu YOK
// (ENG06_05 bulgusu: `expectedVersion` içeren hash yeniden denemeyi `request_id_reused` yapar).
function validateMarket(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_market_operation', 400);
  // Teklif (offer) ve müzayede kapsam dışı; eski P1 kapısı bu yol için kapalı kalır.
  if (input.op === 'offer') fail('market_settlement_unavailable', 503);
  if (!Object.hasOwn(SHAPES, input.op)) fail('unsupported_market_operation', 400);
  const keys = ['op', 'requestId', ...SHAPES[input.op]];
  if (input.op === 'list') keys.push(input.kind === 'food' ? 'foodKey' : 'assetId');
  if (Object.keys(input).length !== keys.length || keys.some(k => !Object.hasOwn(input, k))) fail('unknown_market_field', 400);
  if (!uuid(input.requestId)) fail('invalid_request_id', 400);
  const qtyMax = input.op === 'list' && input.kind !== 'food' ? 1 : LIMITS.maxFoodQuantity;
  if (Object.hasOwn(input, 'quantity') && (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > qtyMax)) fail('invalid_quantity', 400);
  if (Object.hasOwn(input, 'unitPrice') && (!Number.isSafeInteger(input.unitPrice) || input.unitPrice < 1 || input.unitPrice > LIMITS.maxUnitPrice)) fail('invalid_price', 400);
  if (Object.hasOwn(input, 'unitPrice') && input.unitPrice * input.quantity > LIMITS.maxTotal) fail('invalid_total', 400);
  if (input.op === 'list') {
    if (!Object.hasOwn(KINDS, input.kind)) fail('invalid_listing_kind', 400);
    if (input.kind === 'food' && (typeof input.foodKey !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(input.foodKey))) fail('invalid_food_key', 400);
    if (input.kind !== 'food' && (typeof input.assetId !== 'string' || !input.assetId || input.assetId.length > 200)) fail('invalid_asset_id', 400);
  } else if (typeof input.listingId !== 'string' || !/^mk_[a-f0-9]{32}$/.test(input.listingId)) fail('invalid_listing_id', 400);
  const command = Object.fromEntries(keys.slice().sort().map(k => [k, input[k]]));
  return { command, hash: crypto.createHash('sha256').update(JSON.stringify(command)).digest('hex') };
}

function emptyHold() { return { schema: 1, listings: [], items: [], dragons: [], eggs: [], food: {} }; }
function readHold(hold) {
  if (!hold) return emptyHold();
  if (hold.schema !== 1 || !Array.isArray(hold.listings)) fail('market_hold_invalid');
  return clone(hold);
}
const activeLock = (lock, now) => (lock && lock.expiresAt > now ? lock.offer : null);
function locate(game, assetId) {
  for (const key of ['items', 'dragons', 'eggs']) {
    const row = game[FIELD[key]].find(x => x.assetId === assetId);
    if (row) return { key, row };
  }
  return null;
}
function unavailable(key, row, game) {
  if (row.tradeLocked || row.heirloomId || row.dead || row.old || row.busy || row.task || row.inK || row.hatching) return 'asset_unavailable';
  if (key === 'dragons' && Object.values(row.equip || {}).some(v => v != null)) return 'asset_equipped';
  if (key === 'items' && game.dragons.some(d => Object.values(d.equip || {}).some(v => v != null && String(v) === String(row.uid)))) return 'asset_equipped';
  return null;
}
function preview(key, row, foodKey) {
  const text = (v, n = 40) => (v == null ? null : String(v).slice(0, n));
  // Görünüm alanları sunucu kaydından kopyalanır (istemciden değil); oluşturma anının fotoğrafıdır.
  if (!row) return { foodKey };
  const genes = row.genes && typeof row.genes === 'object' && JSON.stringify(row.genes).length <= 4000 ? clone(row.genes) : null;
  if (key === 'dragons') return { name: text(row.name), el: text(row.el, 20), sex: text(row.sex, 2), stage: text(row.stage, 20), gen: Number.isSafeInteger(row.gen) ? row.gen : null,
    eye: text(row.eye, 10), horn: text(row.horn, 10), pat: text(row.pat, 10), genes };
  if (key === 'eggs') return { el: text(row.genes?.el?.[0], 20), gen: Number.isSafeInteger(row.gen) ? row.gen : null, genes };
  if (key === 'items') return { itemId: text(row.id) };
  return { foodKey };
}

// Rezervasyon sahipliği korur (takasın `guardReservation` modeli, uzun ömre uyarlanmış):
// ilandaki varlık hesaptan çıkamaz, ilandaki yem kazanılmış kovanın altına düşemez.
// İçerik değişimi (yaş, evre) engellenmez; kullanılabilirlik satın almada yeniden denetlenir.
function guardMarketHold(after, hold) {
  if (!hold || !hold.listings?.length || !after) return;
  sources.ensure(after);
  for (const key of ['items', 'dragons', 'eggs']) {
    for (const id of hold[key]) if (!after[FIELD[key]].some(x => x.assetId === id)) fail('market_reserved_asset');
  }
  for (const [k, n] of Object.entries(hold.food)) if ((after.foodSources[k]?.earned || 0) < n) fail('market_reserved_food');
}
// Takas teklifi ilandaki varlığı veya rezerve yemi kapsayamaz; tamamlanan takas rezervasyonu bozamaz.
function guardTradeAgainstHolds(trade, games, holds) {
  for (const p of trade.participants) {
    const hold = holds[p];
    if (!hold || !hold.listings?.length) continue;
    const game = games[p]?.game;
    if (trade.status === 'active' && game) {
      const offer = trade.offers[p];
      for (const key of ['items', 'dragons', 'eggs']) if (offer[key].some(id => hold[key].includes(id))) fail('market_reserved_asset');
      sources.ensure(game);
      for (const [k, n] of Object.entries(offer.food)) if (n + (hold.food[k] || 0) > (game.foodSources[k]?.earned || 0)) fail('market_reserved_food');
    }
    guardMarketHold(game, hold);
  }
}

function publicListing(l, viewer) {
  const mine = l.sellerId === viewer;
  return { id: l.id, kind: l.kind, title: l.title, preview: l.preview, seller: l.sellerHandle, mine,
    quantity: l.quantity, remaining: l.remaining, unitPrice: l.unitPrice, sold: l.sold, status: l.status,
    createdAt: l.createdAt, updatedAt: l.updatedAt, stateVersion: l.stateVersion, foodKey: l.foodKey,
    ...(mine ? { assetId: l.assetId, sales: l.sales } : {}) };
}
function releaseHold(hold, listing, quantity) {
  if (listing.kind === 'food') {
    const left = (hold.food[listing.foodKey] || 0) - quantity;
    if (left < 0) fail('market_hold_invalid');
    if (left) hold.food[listing.foodKey] = left; else delete hold.food[listing.foodKey];
  } else {
    const key = KINDS[listing.kind];
    if (!hold[key].includes(listing.assetId)) fail('market_hold_invalid');
    hold[key] = hold[key].filter(id => id !== listing.assetId);
  }
}

// ctx: { now, listingId, listing|null, games{id:{version,game}|null}, handles{id}, tradeLocks{id}, holds{id} }
// Dönen: { listing, games, holds, result }. Hata atarsa depo hiçbir şey yazmaz.
function marketTransition(actor, command, ctx) {
  const { now } = ctx;
  const games = clone(ctx.games), holds = {};
  for (const id of Object.keys(ctx.games)) holds[id] = readHold(ctx.holds[id]);
  let listing = ctx.listing ? clone(ctx.listing) : null;
  if (command.op === 'list') {
    if (listing) fail('listing_id_used');
    const state = games[actor];
    if (!state?.game) fail('game_not_started');
    const game = state.game;
    sources.ensure(game);
    // Açık karar (en muhafazakâr): borçlu satıcı ilan açamaz.
    assertNoDebt(game);
    const hold = holds[actor];
    if (hold.listings.length >= LIMITS.maxOpenPerAccount) fail('market_listing_limit');
    const lock = activeLock(ctx.tradeLocks[actor], now);
    let key, title, view, assetId = null, foodKey = null;
    if (command.kind === 'food') {
      key = 'food'; foodKey = command.foodKey;
      const q = command.quantity, earned = game.foodSources[foodKey]?.earned || 0;
      if ((game.food[foodKey] || 0) < q) fail('insufficient_food');
      if (earned < q) fail('food_not_transferable');
      if (earned < q + (hold.food[foodKey] || 0) + (lock?.food?.[foodKey] || 0)) fail('food_reserved');
      title = foodKey; view = preview('food', null, foodKey);
    } else {
      const found = locate(game, command.assetId);
      if (!found || found.key !== KINDS[command.kind]) fail('asset_not_owned', 403);
      key = found.key; assetId = command.assetId;
      if (found.row.funding !== 'earned') fail('asset_not_transferable');
      const reason = unavailable(key, found.row, game);
      if (reason) fail(reason);
      if (hold[key].includes(assetId)) fail('asset_already_listed');
      if (lock?.[key]?.includes(assetId)) fail('asset_reserved');
      title = String(found.row.name || found.row.id || command.kind).slice(0, 100);
      view = preview(key, found.row);
    }
    listing = { schema: 1, id: ctx.listingId, status: 'open', sellerId: actor, sellerHandle: ctx.handles[actor] || null,
      kind: command.kind, assetId, foodKey, quantity: command.quantity, remaining: command.quantity,
      unitPrice: command.unitPrice, sold: 0, title, preview: view, sales: [],
      createdAt: now, updatedAt: now, stateVersion: 1 };
    hold.listings.push(listing.id);
    if (key === 'food') hold.food[foodKey] = (hold.food[foodKey] || 0) + command.quantity; else hold[key].push(assetId);
    return { listing, games: ctx.games, holds, result: { listing: publicListing(listing, actor) } };
  }
  if (!listing) fail('listing_not_found', 404);
  if (command.op === 'cancel') {
    if (listing.sellerId !== actor) fail('listing_not_owned', 403);
    if (listing.status !== 'open') fail('listing_closed');
    const hold = holds[actor];
    releaseHold(hold, listing, listing.remaining);
    hold.listings = hold.listings.filter(id => id !== listing.id);
    Object.assign(listing, { status: 'cancelled', updatedAt: now, stateVersion: listing.stateVersion + 1 });
    return { listing, games: ctx.games, holds, result: { listing: publicListing(listing, actor) } };
  }
  // buy
  if (listing.status !== 'open') fail('listing_closed');
  const seller = listing.sellerId;
  if (seller === actor) fail('own_listing');
  if (listing.kind !== 'food' && command.quantity !== 1) fail('invalid_quantity', 400);
  if (command.quantity > listing.remaining) fail('listing_quantity_unavailable');
  if (command.unitPrice !== listing.unitPrice) fail('listing_price_mismatch');
  if (!games[actor]?.game) fail('game_not_started');
  if (!games[seller]?.game) fail('listing_unavailable');
  assertNoDebt(games[actor].game);
  // Açık karar (en muhafazakâr): borçlu satıcının ilanı borç kapanana kadar satılamaz.
  if (debtOf(games[seller].game) > 0) fail('seller_unavailable');
  const total = command.unitPrice * command.quantity;
  if (!Number.isSafeInteger(total) || total > LIMITS.maxTotal) fail('invalid_total', 400);
  const before = { [actor]: clone(games[actor].game), [seller]: clone(games[seller].game) };
  const sale = listing.kind === 'food' ? { food: { [listing.foodKey]: command.quantity } } : { [KINDS[listing.kind]]: [listing.assetId] };
  const saleId = saleIdFor(actor, command.requestId);
  // Takasla aynı aktarım çekirdeği: yalnız earned altın ödenir, satıcıya earned girer, varlığın
  // `funding`'i (earned) korunur, yem kazanılmış kovadan kazanılmış kovaya geçer, soy/kimlik yeniden eşlenir.
  try {
    transfer(games, [actor, seller], { [actor]: normalizeOffer({ gold: total }), [seller]: normalizeOffer(sale) }, saleId, now);
  } catch (error) {
    // trade_engine hataları (TradeError) kodlu ama durumsuzdur: kesin ret → 409, belirsiz 503 değil.
    if (error.name === 'TradeError' && error.code) fail(error.code);
    throw error;
  }
  guardReservation(before[actor], games[actor].game, ctx.tradeLocks[actor], now);
  guardReservation(before[seller], games[seller].game, ctx.tradeLocks[seller], now);
  const hold = holds[seller];
  releaseHold(hold, listing, command.quantity);
  listing.remaining -= command.quantity;
  listing.sold += command.quantity;
  if (!listing.remaining) { listing.status = 'sold'; hold.listings = hold.listings.filter(id => id !== listing.id); }
  listing.sales = [{ id: saleId, at: now, quantity: command.quantity, total, buyer: ctx.handles[actor] || null }, ...listing.sales].slice(0, LIMITS.salesKept);
  listing.updatedAt = now; listing.stateVersion += 1;
  guardMarketHold(games[seller].game, hold);
  guardMarketHold(games[actor].game, holds[actor]);
  return { listing, games, holds, result: {
    sale: { id: saleId, listingId: listing.id, kind: listing.kind, quantity: command.quantity, unitPrice: command.unitPrice, total, fee: 0, at: now,
      assetId: listing.kind === 'food' ? null : listing.assetId, foodKey: listing.foodKey },
    listing: publicListing(listing, actor) } };
}

// Eski arayüz: testler ve olası çağıranlar için ince adaptör. Kimlik oturumdan gelir.
function createMarketService({ store }) {
  async function execute(identity, input) {
    if (!identity?.accountId) fail('guest_session_required', 401);
    return store.executeMarket(identity.accountId, input);
  }
  return { execute };
}

module.exports = { createMarketService, validateMarket, marketTransition, guardMarketHold, guardTradeAgainstHolds,
  publicListing, listingIdFor, emptyHold, LIMITS, MARKET_FEE_BPS };
