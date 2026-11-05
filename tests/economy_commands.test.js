'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const { openEconomyStore } = require('../server/economy_store');
const { createEconomyStore } = require('../server/store_factory');
const env = { accountId: 'account-a', seed: 'repeatable-server-randomness' };
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env).game;
const run = (state, type, args = {}) => reduceCommand(state, validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command, env);

test('canonical new game preserves gold, Kor, egg, stones and ores; retries cannot reroll', () => {
  const game = start();
  assert.equal(game.gold, 420); assert.equal(game.dragons[0].name, 'Kor'); assert.equal(game.eggs[0].special, 'dede');
  assert.deepEqual(game.chibi.stones, { kor_t1: 12, kor_t2: 2, kor_t3: 0, anka_koruma: 1 });
  assert.deepEqual(game.chibi.ores, { obsidiyen: 0, kehribar: 0, mercan: 0, yildirim: 0 });
  assert.deepEqual(start(), game);
  assert.deepEqual(run(game, 'game.start').game, game);
  assert.ok(game.dragons[0].assetId.startsWith('account-a:dragon:'));
});

test('price, resource and ownership claims are rejected at the command boundary', () => {
  const base = { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'shop.food', args: { key: 'balik' } };
  for (const extra of [{ accountId: 'victim' }, { gold: 999 }, { state: {} }, { reward: {} }]) assert.throws(() => validateCommand({ ...base, ...extra }), /unknown_command_field/);
  assert.throws(() => validateCommand({ ...base, args: { key: 'balik', price: 0 } }), /invalid_arguments/);
  for (const type of ['reward.grant', 'balance.set', '__proto__', 'week.skip']) assert.throws(() => validateCommand({ ...base, type }), /unsupported_command/);
  const state = start();
  assert.throws(() => run(state, 'egg.incubate', { assetId: 'other:egg:e1', enabled: true }), /asset_not_owned/);
  assert.throws(() => run(state, 'shop.food', { key: '__proto__' }), /unknown_food/);
  assert.equal(state.gold, 420);
});

test('building and incubation enforce cost, capacity, maturity and one-time goal reward', () => {
  let game = start();
  const eggId = game.eggs[0].assetId;
  assert.throws(() => run(game, 'egg.incubate', { assetId: eggId, enabled: true }), /incubator_full/);
  const tile = game.grid.findIndex(t => t.open && !t.b);
  const built = run(game, 'building.buy', { kind: 'kulucka', tile }); game = built.game;
  assert.equal(game.gold, 300); // 420 - 160 + existing 40-gold goal.
  assert.equal(game.eggs[0].inK, true); assert.equal(built.result.goals[0].gold, 40);
  assert.equal(run(game, 'goals.claim').game.gold, 300);
  assert.throws(() => run(game, 'egg.hatch', { assetId: eggId }), /egg_not_ready/);
  assert.throws(() => run(game, 'building.buy', { kind: 'kulucka', tile: tile + 1 }), /building_unavailable/);
  // Trusted server fixture models completion of two validated game weeks.
  game.eggs[0].w = 2;
  const hatched = run(game, 'egg.hatch', { assetId: eggId });
  assert.equal(hatched.game.eggs.length, 0); assert.equal(hatched.game.dragons.length, 2);
  assert.equal(hatched.game.dragons[1].name, 'Gece');
  assert.throws(() => run(hatched.game, 'egg.hatch', { assetId: eggId }), /asset_not_owned/);
});

test('crafting and resource conversion retain recipes and reject insufficient funds', () => {
  let game = start();
  const crafted = run(game, 'chibi.craft', { itemId: 'hat_2' }).game;
  assert.equal(crafted.gold, 220); assert.equal(crafted.chibi.stones.kor_t1, 8);
  assert.equal(crafted.chibi.unlockedItems.hat_2, true);
  assert.throws(() => run(crafted, 'chibi.craft', { itemId: 'hat_2' }), /item_unavailable/);
  const synth = run(game, 'stone.synthesize', { key: 'kor_t1' }).game;
  assert.equal(synth.gold, 370); assert.equal(synth.chibi.stones.kor_t1, 7); assert.equal(synth.chibi.stones.kor_t2, 3);
  assert.throws(() => run(game, 'ore.convert', { from: 'obsidiyen', to: 'mercan' }), /insufficient_ores/);
  // Only trusted test setup can grant materials; no API accepts this snapshot.
  game.chibi.ores.obsidiyen = 5;
  const converted = run(game, 'ore.convert', { from: 'obsidiyen', to: 'mercan' }).game;
  assert.equal(converted.gold, 270); assert.equal(converted.chibi.ores.obsidiyen, 0); assert.equal(converted.chibi.ores.mercan, 1);
  game.gold = 0;
  assert.throws(() => run(game, 'chibi.craft', { itemId: 'hat_2' }), /insufficient_gold/);
  assert.equal(game.chibi.stones.kor_t1, 12);
});

test('NPC purchases use server catalog, stock and locks; cannot resell forged items', () => {
  let game = start();
  const food = run(game, 'shop.food', { key: 'balik' }).game;
  assert.ok(food.gold < 420); assert.equal(food.food.balik, game.food.balik + 1);
  assert.throws(() => run(game, 'shop.food', { key: 'ziyafet' }), /food_locked/);
  const egg = run(game, 'shop.egg', { id: game.market.egg.id }).game;
  assert.equal(egg.eggs.length, 2); assert.equal(egg.market.egg, null);
  assert.throws(() => run(egg, 'shop.egg', { id: game.market.egg.id }), /egg_unavailable/);
  assert.throws(() => run(game, 'item.sell', { assetId: 'forged' }), /asset_not_owned/);
  assert.throws(() => run(game, 'shop.item', { key: 'zirh1' }), /item_unavailable/);
});

test('SQLite command receipts provide atomic idempotency and version checks', t => {
  const store = openEconomyStore(':memory:'); t.after(() => store.close());
  const { accountId } = store.createGuest();
  const command = (type, args, version) => ({ type, args, expectedVersion: version, requestId: crypto.randomUUID() });
  store.executeCommand(accountId, command('game.start', {}, 0));
  const buy = command('chibi.craft', { itemId: 'hat_2' }, 1);
  const result = store.executeCommand(accountId, buy);
  assert.equal(result.economy.gold, 220);
  assert.equal(store.executeCommand(accountId, buy).replayed, true);
  assert.equal(store.readEconomy(accountId).gold, 220);
  assert.throws(() => store.executeCommand(accountId, { ...buy, args: { itemId: 'armor_2' } }), /request_id_reused/);
  assert.throws(() => store.executeCommand(accountId, command('shop.food', { key: 'balik' }, 1)), /version_conflict/);
  assert.throws(() => store.transaction(tx => tx.adjustGold(accountId, 100)), /use_game_commands/);
  assert.equal(store.readEconomy(accountId).gold, 220);
});

test('Cloud Run refuses SQLite, emulator and unknown backend instead of falling back', () => {
  assert.throws(() => createEconomyStore({ K_SERVICE: 'ejderocagi', ECONOMY_BACKEND: 'sqlite', DATA_DIR: '/bucket' }), /requires Firestore/);
  assert.throws(() => createEconomyStore({ NODE_ENV: 'production', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8089' }), /forbidden/);
  assert.throws(() => createEconomyStore({ ECONOMY_BACKEND: 'unknown' }), /Unknown/);
});
