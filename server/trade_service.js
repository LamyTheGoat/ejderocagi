'use strict';
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { applyTrade, normalizeOffer } = require('../js/trade_engine');
const { fail } = require('./economy_commands');
const clone = value => JSON.parse(JSON.stringify(value));
const empty = () => ({ gold: 0, items: [], dragons: [], eggs: [], food: {} });
const terminal = t => !['invited', 'active'].includes(t.status);
const uuid = value => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
function validateTrade(input) {
  const shapes = { invite: ['targetId'], accept: ['tradeId'], reject: ['tradeId'], cancel: ['tradeId'], get: ['tradeId'], offer: ['tradeId', 'revision', 'offer'], confirm: ['tradeId', 'revision'] };
  if (!input || !Object.hasOwn(shapes, input.type)) fail('invalid_trade_command');
  const keys = ['type', 'requestId', ...shapes[input.type], ...(input.type === 'confirm' && Object.hasOwn(input, 'offerHash') ? ['offerHash'] : [])];
  if (Object.keys(input).length !== keys.length || keys.some(k => !Object.hasOwn(input, k)) || !uuid(input.requestId)) fail('invalid_trade_command');
  if (!uuid(input.targetId || input.tradeId)) fail('invalid_trade_id');
  if (['offer', 'confirm'].includes(input.type) && (!Number.isSafeInteger(input.revision) || input.revision < 0)) fail('invalid_revision');
  const command = clone(input);
  if (command.type === 'offer') {
    command.offer = normalizeOffer(command.offer);
    for (const key of ['items', 'dragons', 'eggs']) if (command.offer[key].some(id => typeof id !== 'string')) fail('asset_id_required');
  }
  return { command, hash: crypto.createHash('sha256').update(JSON.stringify(command)).digest('hex') };
}
function canonical(game, id) {
  const g = clone(game); g.handle = id;
  const itemIds = new Map(g.inv.map(row => [String(row.uid), row.assetId]));
  for (const [key, field] of [['inv', 'uid'], ['dragons', 'id'], ['eggs', 'id']]) {
    for (const row of g[key]) {
      if (!row.assetId) fail('asset_id_missing', 409);
      row._localId = row[field]; row[field] = row.assetId;
      if (key === 'dragons' && row.equip) for (const slot of Object.keys(row.equip)) {
        if (row.equip[slot] != null) row.equip[slot] = itemIds.get(String(row.equip[slot])) || row.equip[slot];
      }
    }
  }
  return g;
}
function transfer(games, ids, offers, tradeId, now) {
  const originals = clone(games);
  const accounts = Object.fromEntries(ids.map(id => [id, canonical(games[id].game, id)]));
  const result = applyTrade(accounts, ids[0], ids[1], offers[ids[0]], offers[ids[1]], { tradeId, ts: now });
  for (const id of ids) {
    const old = games[id].game, next = result.accounts[id];
    const itemIds = new Map();
    for (const [key, field, counter] of [['inv', 'uid', 'uid'], ['dragons', 'id', 'nid'], ['eggs', 'id', 'nid']]) {
      for (const row of next[key]) {
        const incoming = !old[key].some(x => x.assetId === row.assetId);
        if (incoming && key !== 'inv') {
          const sourceId = ids.find(p => p !== id), source = originals[sourceId].game;
          const visited = new Set();
          next.lineage ||= {};
          const preserveAncestor = ancestor => {
            const local = 'trade-lineage:' + sourceId + ':' + ancestor;
            if (visited.has(local)) return local;
            visited.add(local);
            const record = source.lineage?.[ancestor];
            if (record) {
              next.lineage[local] = clone(record);
              next.lineage[local].pids = record.pids?.map(preserveAncestor) || null;
            }
            return local;
          };
          if (row.pids) row.pids = row.pids.map(preserveAncestor);
        }
        row[field] = incoming ? next[counter]++ : row._localId;
        delete row._localId;
        if (key === 'inv') itemIds.set(row.assetId, row.uid);
        if (incoming && key === 'dragons') {
          next.lineage ||= {};
          next.lineage[row.id] = { name: row.name, sex: row.sex, gen: row.gen, el: row.el, origin: row.origin, pids: row.pids || null, snap: clone(row) };
        }
      }
    }
    for (const d of next.dragons) for (const slot of Object.keys(d.equip || {})) if (itemIds.has(d.equip[slot])) d.equip[slot] = itemIds.get(d.equip[slot]);
    if (!next.dragons.some(d => d.id === next.star)) next.star = next.dragons[0]?.id || null;
    next.handle = old.handle;
    if (Buffer.byteLength(JSON.stringify(next)) > 700000) fail('game_size_limit', 409);
    games[id] = { version: games[id].version + 1, game: next };
  }
}
// Called inside every economy command transaction, after reduction and before writes.
function guardReservation(before, after, lock, now) {
  if (!lock || lock.expiresAt <= now) return;
  const offer = lock.offer;
  if (after.gold < offer.gold) fail('trade_reserved_gold', 409);
  for (const [key, count] of Object.entries(offer.food)) if ((after.food[key] || 0) < count) fail('trade_reserved_food', 409);
  for (const [key, field] of [['items', 'inv'], ['dragons', 'dragons'], ['eggs', 'eggs']]) {
    for (const id of offer[key]) {
      const a = before[field].find(x => x.assetId === id), b = after[field].find(x => x.assetId === id);
      if (!a || !isDeepStrictEqual(a, b)) fail('trade_reserved_asset', 409);
    }
  }
  // Equipping a reserved item changes a dragon, not the item record.
  for (const id of offer.items) {
    const item = after.inv.find(x => x.assetId === id);
    if (after.dragons.some(d => Object.values(d.equip || {}).includes(item.uid))) fail('trade_reserved_asset', 409);
  }
}
// Pure transition: adapters persist trade, both accounts, locks and receipt atomically.
function transition(actor, command, trade, games, locks, now) {
  const previous = JSON.stringify(trade);
  const id = command.type === 'invite' ? command.requestId : command.tradeId;
  if (command.type === 'invite') {
    if (trade) fail('trade_id_used', 409);
    const ids = [actor, command.targetId];
    if (ids[0] === ids[1]) fail('invalid_participants');
    for (const p of ids) {
      if (!games[p]?.game) fail('game_not_started', 409);
      if (locks[p] && locks[p].expiresAt > now) fail('trade_busy', 409);
    }
    trade = { id, participants: ids, status: 'invited', revision: 0, offers: Object.fromEntries(ids.map(p => [p, empty()])), approvals: [], expiresAt: now + 300000 };
  } else {
    if (!trade || !trade.participants.includes(actor)) fail('trade_not_found', 404);
    if (!terminal(trade) && trade.expiresAt <= now) { trade.status = 'expired'; trade.revision++; }
    if (terminal(trade)) { /* Terminal states are immutable, including late cancel/confirm. */ }
    else if (command.type === 'get') { /* Read also performs lazy expiration. */ }
    else if (command.type === 'cancel') { trade.status = 'cancelled'; trade.revision++; }
    else if (command.type === 'reject' || command.type === 'accept') {
      if (trade.status !== 'invited' || trade.participants[1] !== actor) fail('invalid_trade_state', 409);
      trade.status = command.type === 'reject' ? 'rejected' : 'active'; trade.revision++;
    } else {
      if (trade.status !== 'active' || command.revision !== trade.revision) fail('trade_revision_conflict', 409);
      if (command.type === 'offer') {
        const check = clone(games), proposed = { ...trade.offers, [actor]: command.offer };
        transfer(check, trade.participants, proposed, id, now);
        trade.offers = proposed; trade.approvals = []; trade.revision++;
      } else if (command.type === 'confirm') {
        if (command.offerHash !== undefined && command.offerHash !== trade.offerHash) fail('trade_offer_changed', 409);
        if (!trade.approvals.includes(actor)) trade.approvals.push(actor);
        if (trade.approvals.length === 2) {
          for (const p of trade.participants) if (locks[p]?.tradeId !== id) fail('trade_reservation_lost', 409);
          transfer(games, trade.participants, trade.offers, id, now);
          trade.status = 'completed'; trade.completedAt = now; trade.revision++;
        }
      }
    }
  }
  for (const p of trade.participants) {
    if (terminal(trade)) { if (locks[p]?.tradeId === id) locks[p] = null; }
    else locks[p] = { tradeId: id, expiresAt: trade.expiresAt, offer: trade.offers[p] };
  }
  trade.offerHash = crypto.createHash('sha256').update(JSON.stringify({ revision: trade.revision, offers: trade.offers })).digest('hex');
  if (JSON.stringify(trade) !== previous) trade.stateVersion = (trade.stateVersion || 0) + 1;
  return trade;
}
module.exports = { validateTrade, transition, guardReservation };
