'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

// Execute only repository-owned rules. No command name, argument or client text
// is interpolated as JavaScript. Each transaction attempt gets its own context.
const rules = ['data', 'core', 'week', 'social', 'chibi'].map(name =>
  new vm.Script(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), { filename: name + '.js' }));
const expose = new vm.Script(`({
  start() { newGame(); ensureChibi(); return S; },
  load(value) { S = value; }, state() { return S; },
  BUILD, ITEMS, FOODS, CHIBI_ITEMS, CHIBI_STONES, CHIBI_ORES, CHIBI_SHARDS,
  countB, freeSlots, kuluckaFree, hasB, canClear, clearCost, checkGoals,
  smithPrice, sellBack, eggPrice, equippedBy, value, linReg,
  getChibiItemCraftRecipe, getChibiRepairCost, syncChibiSlotPlus, hatchEgg, perk,
})`);
const clone = value => JSON.parse(JSON.stringify(value));
function fail(code, status = 400) { throw Object.assign(new Error(code), { code, status }); }
function has(obj, key) { return typeof key === 'string' && Object.hasOwn(obj, key); }

const SHAPES = Object.freeze({
  'game.start': [], 'goals.claim': [],
  'building.buy': ['kind', 'tile'], 'land.clear': ['tile'],
  'shop.food': ['key'], 'shop.item': ['key'], 'shop.dragon': ['id'], 'shop.egg': ['id'],
  'item.sell': ['assetId'], 'dragon.sell': ['assetId'],
  'egg.incubate': ['assetId', 'enabled'], 'egg.hatch': ['assetId'],
  'chibi.craft': ['itemId'], 'chibi.repair': ['itemId'],
  'stone.synthesize': ['key'], 'ore.convert': ['from', 'to'],
  'chibi.transfer': ['from', 'to'],
});
function validateCommand(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_command');
  if (Object.keys(input).some(k => !['requestId', 'expectedVersion', 'type', 'args'].includes(k))) fail('unknown_command_field');
  if (typeof input.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(input.requestId)) fail('invalid_request_id');
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) fail('invalid_version');
  if (!has(SHAPES, input.type)) fail('unsupported_command');
  const args = input.args;
  if (!args || typeof args !== 'object' || Array.isArray(args)) fail('invalid_arguments');
  if (Object.keys(args).length !== SHAPES[input.type].length || SHAPES[input.type].some(k => !Object.hasOwn(args, k))) fail('invalid_arguments');
  for (const [key, value] of Object.entries(args)) {
    if (key === 'enabled') { if (typeof value !== 'boolean') fail('invalid_arguments'); }
    else if (key === 'tile') { if (!Number.isSafeInteger(value) || value < 0) fail('invalid_arguments'); }
    else if (key === 'id') { if (!(typeof value === 'string' || Number.isSafeInteger(value))) fail('invalid_arguments'); }
    else if (typeof value !== 'string' || !value || value.length > 100) fail('invalid_arguments');
  }
  const command = { requestId: input.requestId, expectedVersion: input.expectedVersion, type: input.type, args: Object.fromEntries(Object.entries(args).sort(([a], [b]) => a.localeCompare(b))) };
  const hash = crypto.createHash('sha256').update(JSON.stringify(command)).digest('hex');
  return { command, hash };
}
function makeRuntime(game, seed) {
  const math = Object.create(Math);
  let counter = 0;
  math.random = () => crypto.createHmac('sha256', seed).update(String(counter++)).digest().readUInt32BE() / 0x100000000;
  const context = vm.createContext({ Math: math, UI: {} }, { codeGeneration: { strings: false, wasm: false } });
  for (const script of rules) script.runInContext(context, { timeout: 1000 });
  const api = expose.runInContext(context, { timeout: 1000 });
  if (game) api.load(clone(game));
  return api;
}
function tagAssets(game, accountId) {
  for (const [kind, rows, key] of [['item', game.inv, 'uid'], ['dragon', game.dragons, 'id'], ['egg', game.eggs, 'id']]) {
    for (const row of rows) row.assetId ||= `${accountId}:${kind}:${row[key]}`;
  }
}
function reduceCommand(previous, command, { accountId, seed }) {
  if (!previous && command.type !== 'game.start') fail('game_not_started', 409);
  const api = makeRuntime(previous, seed);
  if (!previous) {
    const game = clone(api.start());
    tagAssets(game, accountId);
    return { game, result: { started: true } };
  }
  const S = api.state(), C = S.chibi, a = command.args;
  if (command.type === 'game.start') return { game: clone(S), result: { started: false } };
  if (S.over) fail('game_finished', 409);
  const spend = amount => { if (!Number.isSafeInteger(amount) || amount < 0) fail('invalid_server_price', 500); if (S.gold < amount) fail('insufficient_gold', 409); S.gold -= amount; };
  const owned = (rows, assetId) => { const asset = rows.find(row => row.assetId === assetId); if (!asset) fail('asset_not_owned', 403); return asset; };
  const payRecipe = recipe => {
    for (const group of ['stones', 'ores', 'shards', 'essences']) {
      for (const [key, qty] of Object.entries(recipe[group] || {})) if ((C[group][key] || 0) < qty) fail('insufficient_' + group, 409);
    }
    spend(recipe.gold);
    for (const group of ['stones', 'ores', 'shards', 'essences']) for (const [key, qty] of Object.entries(recipe[group] || {})) C[group][key] -= qty;
  };
  let result = {};
  switch (command.type) {
    case 'building.buy': {
      if (!has(api.BUILD, a.kind)) fail('unknown_building');
      const b = api.BUILD[a.kind], tile = S.grid[a.tile];
      if (b.hidden || !tile || !tile.open || tile.b || (!b.multi && api.hasB(a.kind)) || S.un < (b.un || 0)) fail('building_unavailable', 409);
      spend(b.fiyat); tile.b = a.kind;
      if (a.kind === 'kulucka') for (const egg of S.eggs) if (!egg.inK && api.kuluckaFree() > 0) egg.inK = true;
      break;
    }
    case 'land.clear': {
      if (!S.grid[a.tile] || S.grid[a.tile].open || !api.canClear(a.tile)) fail('land_unavailable', 409);
      spend(api.clearCost()); S.grid[a.tile].open = true; S.cleared++; break;
    }
    case 'shop.food': {
      if (!has(api.FOODS, a.key)) fail('unknown_food');
      const food = api.FOODS[a.key];
      if (food.kiler && !api.hasB('kiler')) fail('food_locked', 409);
      spend(food.fiyat); S.food[a.key] = (S.food[a.key] || 0) + 1; break;
    }
    case 'shop.item': {
      if (!has(api.ITEMS, a.key) || !S.flags.smith || !S.smith.includes(a.key)) fail('item_unavailable', 409);
      spend(api.smithPrice(a.key)); S.inv.push({ uid: S.uid++, id: a.key }); S.smith.splice(S.smith.indexOf(a.key), 1); break;
    }
    case 'shop.dragon': {
      const dragon = S.market.dragons.find(d => d.id === a.id);
      if (!dragon || api.freeSlots() < 1) fail('dragon_unavailable', 409);
      spend(dragon.price); S.market.dragons = S.market.dragons.filter(d => d !== dragon);
      delete dragon.price; dragon.id = S.nid++; S.dragons.push(dragon); S.st.acq++; break;
    }
    case 'shop.egg': {
      const egg = S.market.egg;
      if (!egg || egg.id !== a.id) fail('egg_unavailable', 409);
      spend(api.eggPrice(egg)); delete egg.price; egg.inK = api.kuluckaFree() > 0; S.eggs.push(egg); S.market.egg = null; break;
    }
    case 'item.sell': {
      const item = owned(S.inv, a.assetId);
      if (item.heirloomId || !has(api.ITEMS, item.id) || api.ITEMS[item.id].heirloom) fail('item_not_sellable', 409);
      const dragon = api.equippedBy(item.uid);
      if (dragon) for (const slot of Object.keys(dragon.equip)) if (dragon.equip[slot] === item.uid) dragon.equip[slot] = null;
      S.gold += api.sellBack(item.id); S.inv = S.inv.filter(i => i !== item); break;
    }
    case 'dragon.sell': {
      const dragon = owned(S.dragons, a.assetId);
      if (dragon.task || dragon.dead || dragon.tradeLocked) fail('dragon_busy', 409);
      S.gold += Math.round(api.value(dragon) * 0.6);
      for (const slot of Object.keys(dragon.equip)) dragon.equip[slot] = null;
      api.linReg(dragon); S.dragons = S.dragons.filter(d => d !== dragon);
      if (S.star === dragon.id) S.star = S.dragons[0]?.id || null;
      break;
    }
    case 'egg.incubate': {
      const egg = owned(S.eggs, a.assetId);
      if (a.enabled && !egg.inK && api.kuluckaFree() < 1) fail('incubator_full', 409);
      egg.inK = a.enabled; break;
    }
    case 'egg.hatch': {
      const egg = owned(S.eggs, a.assetId);
      // w is advanced only by a future validated week command, never by client time.
      if (!egg.inK || egg.w < (api.perk('yumurtaci', 50) ? 1 : 2) || api.freeSlots() < 1) fail('egg_not_ready', 409);
      const hatched = api.hatchEgg(egg); result = { dragonId: hatched.d.id, notes: clone(hatched.notes) }; break;
    }
    case 'chibi.craft': {
      if (!has(api.CHIBI_ITEMS, a.itemId) || C.unlockedItems[a.itemId]) fail('item_unavailable', 409);
      const recipe = api.getChibiItemCraftRecipe(a.itemId);
      if (recipe.ascendFrom && (!C.unlockedItems[recipe.ascendFrom] || C.burnedItems[recipe.ascendFrom] || (C.itemPlus[recipe.ascendFrom] || 0) < recipe.reqPlus)) fail('ascension_locked', 409);
      payRecipe(recipe); C.unlockedItems[a.itemId] = true;
      C.itemPlus[a.itemId] = recipe.ascendFrom ? Math.max(0, (C.itemPlus[recipe.ascendFrom] || 10) - 4) : 0;
      C.eq[api.CHIBI_ITEMS[a.itemId].slot] = a.itemId; break;
    }
    case 'chibi.repair': {
      if (!has(api.CHIBI_ITEMS, a.itemId) || !C.unlockedItems[a.itemId] || !C.burnedItems[a.itemId]) fail('item_not_repairable', 409);
      payRecipe(api.getChibiRepairCost(a.itemId)); delete C.burnedItems[a.itemId]; C.itemPlus[a.itemId] = 0;
      const slot = api.CHIBI_ITEMS[a.itemId].slot; if (!C.eq[slot]) C.eq[slot] = a.itemId; break;
    }
    case 'stone.synthesize': {
      const map = { kor_t1: ['kor_t2', 50], kor_t2: ['kor_t3', 200], kor_t3: ['anka_koruma', 500] };
      if (!has(map, a.key)) fail('unknown_stone');
      const [to, gold] = map[a.key]; payRecipe({ gold, stones: { [a.key]: 5 } }); C.stones[to]++; break;
    }
    case 'ore.convert': {
      if (!has(api.CHIBI_ORES, a.from) || !has(api.CHIBI_ORES, a.to) || a.from === a.to) fail('invalid_ore_conversion');
      payRecipe({ gold: 150, ores: { [a.from]: 5 } }); C.ores[a.to]++; break;
    }
    case 'chibi.transfer': {
      if (!has(api.CHIBI_ITEMS, a.from) || !has(api.CHIBI_ITEMS, a.to) || a.from === a.to || api.CHIBI_ITEMS[a.from].slot !== api.CHIBI_ITEMS[a.to].slot) fail('invalid_transfer');
      if (!C.unlockedItems[a.from] || !C.unlockedItems[a.to] || C.burnedItems[a.from] || C.burnedItems[a.to] || (C.itemPlus[a.from] || 0) < 6) fail('transfer_locked', 409);
      payRecipe({ gold: 500, stones: { kor_t2: 3 } });
      C.itemPlus[a.to] = Math.max(C.itemPlus[a.to] || 0, C.itemPlus[a.from] - 2); C.itemPlus[a.from] = 0;
      C.eq[api.CHIBI_ITEMS[a.to].slot] = a.to; break;
    }
    case 'goals.claim': break;
    default: fail('unsupported_command');
  }
  api.syncChibiSlotPlus(C);
  result.goals = api.checkGoals().map(g => ({ id: g.id, gold: g.r }));
  if (!Number.isSafeInteger(S.gold) || S.gold < -2_000_000_000 || S.gold > 2_000_000_000) fail('gold_limit', 409);
  tagAssets(S, accountId);
  const game = clone(S);
  if (Buffer.byteLength(JSON.stringify(game)) > 700_000) fail('game_size_limit', 409);
  return { game, result };
}
function gameEconomy(accountId, version, game) {
  return { accountId, version, gold: game.gold,
    items: game.inv.map(i => ({ assetId: i.assetId, data: i })),
    dragons: game.dragons.map(d => ({ assetId: d.assetId, data: d })), eggs: game.eggs.map(e => ({ assetId: e.assetId, data: e })),
    stones: clone(game.chibi.stones), ores: clone(game.chibi.ores), chibi: clone(game.chibi), game };
}
module.exports = { validateCommand, reduceCommand, gameEconomy, COMMAND_TYPES: Object.keys(SHAPES), fail };
