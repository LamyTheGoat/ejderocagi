'use strict';

/**
 * Ocak Bedesteni - güvenli doğrudan takas çekirdeği.
 *
 * Bu modül oyun UI'sinden ve HTTP/WebSocket katmanından bağımsızdır.
 * Girdi olarak sunucunun otorite kabul ettiği iki hesabı alır.
 * Herhangi bir doğrulama başarısız olursa hiçbir hesabı değiştirmez.
 *
 * Hesap şeması:
 * {
 *   handle: "@oyuncu",
 *   gold: 100,
 *   inv: [{ uid: 1, id: "zirh1" }],
 *   dragons: [{ id: "d1", name: "..." }],
 *   eggs: [{ id: "e1", genes: {...}, inK: false }],
 *   food: { balik: 3, mantar: 2 }
 * }
 */

class TradeError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'TradeError';
    this.code = code;
  }
}

const MAX_GOLD = 2_000_000_000;
const MAX_ASSETS_PER_OFFER = 40;
const MAX_FOOD_KEYS = 30;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finiteInt(value, label, min = 0, max = MAX_GOLD) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new TradeError('invalid_' + label, `${label} geçersiz.`);
  }
  return n;
}

function uniqueIds(values, label) {
  if (!Array.isArray(values)) throw new TradeError('invalid_' + label);
  if (values.length > MAX_ASSETS_PER_OFFER) throw new TradeError('offer_too_large');
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== 'string' && !Number.isSafeInteger(value)) {
      throw new TradeError('invalid_' + label);
    }
    const key = String(value);
    if (!key || key.length > 100 || seen.has(key)) {
      throw new TradeError('duplicate_or_invalid_' + label);
    }
    seen.add(key);
  }
  return values.slice();
}

function normalizeOffer(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TradeError('invalid_offer');
  }
  const allowed = new Set(['gold', 'items', 'dragons', 'eggs', 'food']);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) throw new TradeError('unknown_offer_field');
  }

  const food = {};
  const rawFood = raw.food == null ? {} : raw.food;
  if (!rawFood || typeof rawFood !== 'object' || Array.isArray(rawFood)) {
    throw new TradeError('invalid_food_offer');
  }
  const foodKeys = Object.keys(rawFood);
  if (foodKeys.length > MAX_FOOD_KEYS) throw new TradeError('offer_too_large');
  for (const key of foodKeys) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) throw new TradeError('invalid_food_key');
    const qty = finiteInt(rawFood[key], 'food_quantity', 0, 100000);
    if (qty > 0) food[key] = qty;
  }

  return {
    gold: finiteInt(raw.gold == null ? 0 : raw.gold, 'gold'),
    items: uniqueIds(raw.items == null ? [] : raw.items, 'items'),
    dragons: uniqueIds(raw.dragons == null ? [] : raw.dragons, 'dragons'),
    eggs: uniqueIds(raw.eggs == null ? [] : raw.eggs, 'eggs'),
    food,
  };
}

function validateAccount(account, handle) {
  if (!account || typeof account !== 'object') throw new TradeError('account_missing');
  if (account.handle !== handle) throw new TradeError('account_identity_mismatch');
  finiteInt(account.gold, 'account_gold');
  for (const key of ['inv', 'dragons', 'eggs']) {
    if (!Array.isArray(account[key])) throw new TradeError('account_' + key + '_invalid');
  }
  if (!account.food || typeof account.food !== 'object' || Array.isArray(account.food)) {
    throw new TradeError('account_food_invalid');
  }

  const ids = new Set();
  for (const [kind, list, field] of [
    ['item', account.inv, 'uid'],
    ['dragon', account.dragons, 'id'],
    ['egg', account.eggs, 'id'],
  ]) {
    for (const asset of list) {
      if (!asset || asset[field] == null) throw new TradeError('account_asset_invalid');
      const key = `${kind}:${String(asset[field])}`;
      if (ids.has(key)) throw new TradeError('account_duplicate_asset');
      ids.add(key);
    }
  }
}

function findAsset(list, id, field, code) {
  const index = list.findIndex(x => String(x[field]) === String(id));
  if (index < 0) throw new TradeError(code);
  return index;
}

function isItemEquipped(account, uid) {
  return account.dragons.some(dragon =>
    dragon && dragon.equip && Object.values(dragon.equip).some(value => String(value) === String(uid))
  );
}

function validateDragonTransfer(dragon) {
  if (dragon.dead || dragon.old || dragon.tradeLocked || dragon.busy || dragon.task) {
    throw new TradeError('dragon_unavailable', 'Bu ejderha şu anda takas edilemez.');
  }
  if (dragon.equip && Object.values(dragon.equip).some(value => value != null)) {
    throw new TradeError('dragon_has_equipment', 'Üzerinde ekipman bulunan ejderha takas edilemez. Önce ekipmanlarını çıkar.');
  }
}

function validateEggTransfer(egg) {
  if (egg.inK || egg.tradeLocked || egg.hatching) {
    throw new TradeError('egg_unavailable', 'Kuluçkadaki veya kilitli yumurta takas edilemez.');
  }
}

function validateItemTransfer(item) {
  if (item.tradeLocked || item.heirloomId) {
    throw new TradeError('item_unavailable', 'Kilitli veya yadigâr eşya takas edilemez.');
  }
}

function validateOfferAgainstAccount(account, offer) {
  if (offer.gold > account.gold) throw new TradeError('insufficient_gold');

  for (const uid of offer.items) {
    const index = findAsset(account.inv, uid, 'uid', 'item_not_owned');
    validateItemTransfer(account.inv[index]);
    if (isItemEquipped(account, uid)) throw new TradeError('item_equipped');
  }
  for (const id of offer.dragons) {
    const index = findAsset(account.dragons, id, 'id', 'dragon_not_owned');
    validateDragonTransfer(account.dragons[index]);
  }
  for (const id of offer.eggs) {
    const index = findAsset(account.eggs, id, 'id', 'egg_not_owned');
    validateEggTransfer(account.eggs[index]);
  }
  for (const [key, qty] of Object.entries(offer.food)) {
    const have = finiteInt(account.food[key] == null ? 0 : account.food[key], 'food_balance', 0, 1000000);
    if (qty > have) throw new TradeError('insufficient_food');
  }
}

function applyOneDirection(from, to, offer) {
  if (offer.gold > from.gold) throw new TradeError('insufficient_gold');
  from.gold -= offer.gold;
  to.gold += offer.gold;
  if (!Number.isSafeInteger(to.gold) || to.gold > MAX_GOLD) throw new TradeError('gold_limit');

  for (const uid of offer.items) {
    const index = findAsset(from.inv, uid, 'uid', 'item_not_owned');
    validateItemTransfer(from.inv[index]);
    if (isItemEquipped(from, uid)) throw new TradeError('item_equipped');
    const [item] = from.inv.splice(index, 1);
    if (to.inv.some(x => String(x.uid) === String(item.uid))) throw new TradeError('item_id_collision');
    to.inv.push(item);
  }

  for (const id of offer.dragons) {
    const index = findAsset(from.dragons, id, 'id', 'dragon_not_owned');
    const dragon = from.dragons[index];
    validateDragonTransfer(dragon);
    if (to.dragons.some(x => String(x.id) === String(dragon.id))) throw new TradeError('dragon_id_collision');
    from.dragons.splice(index, 1);
    to.dragons.push(dragon);
  }

  for (const id of offer.eggs) {
    const index = findAsset(from.eggs, id, 'id', 'egg_not_owned');
    const egg = from.eggs[index];
    validateEggTransfer(egg);
    if (to.eggs.some(x => String(x.id) === String(egg.id))) throw new TradeError('egg_id_collision');
    from.eggs.splice(index, 1);
    to.eggs.push(egg);
  }

  for (const [key, qty] of Object.entries(offer.food)) {
    const have = finiteInt(from.food[key] == null ? 0 : from.food[key], 'food_balance', 0, 1000000);
    if (qty > have) throw new TradeError('insufficient_food');
    from.food[key] = have - qty;
    to.food[key] = finiteInt(to.food[key] == null ? 0 : to.food[key], 'food_balance', 0, 1000000) + qty;
    if (to.food[key] > 1000000) throw new TradeError('food_limit');
  }
}

function summarize(offer) {
  return {
    gold: offer.gold,
    items: offer.items.length,
    dragons: offer.dragons.length,
    eggs: offer.eggs.length,
    food: Object.values(offer.food).reduce((sum, n) => sum + n, 0),
  };
}

/**
 * Safely applies both sides of a confirmed trade.
 *
 * Important: `accounts` must be the server's canonical account map.
 * The caller must persist the returned `accounts` synchronously/durably
 * before acknowledging success to either player.
 */
function applyTrade(accounts, handleA, handleB, rawOfferA, rawOfferB, metadata = {}) {
  if (!accounts || typeof accounts !== 'object') throw new TradeError('accounts_missing');
  if (!handleA || !handleB || handleA === handleB) throw new TradeError('invalid_participants');

  const originalA = accounts[handleA];
  const originalB = accounts[handleB];
  validateAccount(originalA, handleA);
  validateAccount(originalB, handleB);

  const offerA = normalizeOffer(rawOfferA);
  const offerB = normalizeOffer(rawOfferB);

  // Both offers are checked against pre-trade ownership and balances.
  // A player cannot fund their offer with assets received in this same trade.
  validateOfferAgainstAccount(originalA, offerA);
  validateOfferAgainstAccount(originalB, offerB);

  // Work on private copies. Any thrown error leaves the input map untouched.
  const nextA = clone(originalA);
  const nextB = clone(originalB);

  applyOneDirection(nextA, nextB, offerA);
  applyOneDirection(nextB, nextA, offerB);

  validateAccount(nextA, handleA);
  validateAccount(nextB, handleB);

  const now = Number.isSafeInteger(metadata.ts) ? metadata.ts : Date.now();
  const record = {
    id: String(metadata.tradeId || `trade_${now}`),
    ts: now,
    a: handleA,
    b: handleB,
    aGave: summarize(offerA),
    bGave: summarize(offerB),
  };

  const nextAccounts = { ...accounts, [handleA]: nextA, [handleB]: nextB };
  return { accounts: nextAccounts, record };
}

module.exports = {
  TradeError,
  normalizeOffer,
  validateAccount,
  applyTrade,
};
