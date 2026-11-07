'use strict';
// ENG-06 acceptance: pins the server-authoritative guarantees of the existing command set
// and closes REVIEW-001 H-1 (goal rewards laundered through borrowed earned dragons).
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const sources = require('../server/economy_sources');
const { earnedFixture } = require('./helpers/earned_fixture');

const uuid = () => crypto.randomUUID();
// Results built inside the rules VM carry its realm's prototypes; compare plain data.
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng06-')), file = path.join(dir, 'test.sqlite');
  const store = openEconomyStore(file), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const fresh = () => { const id = store.createGuest().accountId; store.executeCommand(id, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} }); return id; };
  const input = (id, type, args) => ({ requestId: uuid(), expectedVersion: store.readEconomy(id).version, type, args });
  const run = (id, type, args) => store.executeCommand(id, input(id, type, args));
  const tr = (a, type, extra) => store.executeTrade(a, { type, requestId: uuid(), ...extra }).trade;
  const give = (from, to, offer) => {
    let t = tr(from, 'invite', { targetId: to }); t = tr(to, 'accept', { tradeId: t.id });
    t = tr(from, 'offer', { tradeId: t.id, revision: t.revision, offer });
    tr(from, 'confirm', { tradeId: t.id, revision: t.revision }); return tr(to, 'confirm', { tradeId: t.id, revision: t.revision });
  };
  return { store, file, load, save, fresh, input, run, give };
}
const env = { accountId: 'acct', seed: 'eng06' };
const started = () => reduceCommand(null, { type: 'game.start' }, env).game;
const step = (game, type, args = {}) => reduceCommand(game, { type, args }, env);

test('ENG06: fabricated battle results and client reward fields cannot reach the server ledger', () => {
  for (const type of ['arena.win', 'duel.result', 'race.finish', 'pageant.score', 'reward.claim', 'week.skip'])
    assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 1, type, args: {} }), /unsupported_command/);
  // ENG06 P-C: week.end is a server command now, but accepts no client week, time or reward fields.
  assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 1, type: 'week.end', args: { week: 9 } }), /invalid_arguments/);
  for (const extra of [{ gold: 999 }, { st: { wins: 1 } }, { result: 'win' }])
    assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 1, type: 'goals.claim', args: extra }), /invalid_arguments/);
  // A claim without a server-validated stat pays nothing.
  const claimed = step(started(), 'goals.claim');
  assert.deepEqual(plain(claimed.result.goals), []);
  assert.equal(claimed.game.gold, 420);
});

test('ENG06: a goal reward is paid once, including request replays and later claims', t => {
  const f = fixture(t), a = f.fresh();
  const tile = f.load(a).grid.findIndex(x => x.open && !x.b);
  const buy = f.input(a, 'building.buy', { kind: 'kulucka', tile });
  const first = f.store.executeCommand(a, buy);
  assert.deepEqual(plain(first.result.goals).map(g => [g.id, g.gold, g.source]), [['kulucka', 40, 'bound']]);
  const gold = first.economy.gold;
  assert.equal(f.store.executeCommand(a, buy).replayed, true);
  assert.equal(f.store.readEconomy(a).gold, gold);
  const again = f.run(a, 'goals.claim', {});
  assert.deepEqual(plain(again.result.goals), []);
  assert.equal(again.economy.gold, gold);
});

test('ENG06: foreign assets cannot be sold or used, and spends beyond the balance are rejected', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const foreign = f.store.readEconomy(b).dragons[0].assetId;
  assert.throws(() => f.run(a, 'dragon.sell', { assetId: foreign }), /asset_not_owned/);
  const egg = f.store.readEconomy(b).eggs[0].assetId;
  assert.throws(() => f.run(a, 'egg.incubate', { assetId: egg, enabled: true }), /asset_not_owned/);
  const g = f.load(a); g.gold = 10; g.funds = { schema: 1, bound: 10, unknown: 0, earned: 0 }; f.save(a, g);
  const before = f.store.readEconomy(a);
  assert.throws(() => f.run(a, 'building.buy', { kind: 'kulucka', tile: g.grid.findIndex(x => x.open && !x.b) }), /insufficient_gold/);
  assert.deepEqual(f.store.readEconomy(a), before);
  assert.equal(f.store.readEconomy(b).dragons[0].assetId, foreign);
});

test('ENG06: two processes racing the same version cannot both spend', async t => {
  const f = fixture(t), a = f.fresh(), { Worker } = require('node:worker_threads');
  const version = f.store.readEconomy(a).version;
  const run = input => new Promise((resolve, reject) => {
    const worker = new Worker(`const {parentPort,workerData:d}=require('node:worker_threads');const s=require(d.module).openEconomyStore(d.file);try{parentPort.postMessage({ok:true,r:s.executeCommand(d.actor,d.input)})}catch(e){parentPort.postMessage({ok:false,error:e.code||e.message})}finally{s.close()}`,
      { eval: true, workerData: { module: require.resolve('../server/economy_store'), file: f.file, actor: a, input } });
    worker.on('message', resolve); worker.on('error', reject);
  });
  const results = await Promise.all([0, 1].map(() => run({ requestId: uuid(), expectedVersion: version, type: 'shop.food', args: { key: 'balik' } })));
  assert.equal(results.filter(r => r.ok).length, 1);
  assert.ok(results.some(r => r.error === 'version_conflict' || r.error === 'database is locked'));
  const after = f.store.readEconomy(a);
  assert.equal(after.gold, 420 - 12);
  assert.equal(after.game.food.balik, 3);
});

test('ENG06 / REVIEW H-1: borrowed earned gen2 or marked dragons do not mint transferable goal rewards', t => {
  const f = fixture(t), main = f.fresh();
  const g = f.load(main); g.dragons[0].gen = 2; g.dragons[0].pers.ces = 45; g.goals.push('mark', 'gen2'); f.save(main, earnedFixture(g));
  const lent = f.store.readEconomy(main).dragons[0].assetId;
  const sybil = f.fresh();
  f.run(sybil, 'dragon.sell', { assetId: f.store.readEconomy(sybil).dragons[0].assetId });
  f.give(main, sybil, { dragons: [lent] });
  const claim = f.run(sybil, 'goals.claim', {});
  // Amounts are unchanged; only the provenance stays restricted.
  assert.deepEqual(plain(claim.result.goals).map(r => [r.id, r.gold, r.source]), [['mark', 60, 'unknown'], ['gen2', 80, 'unknown']]);
  assert.equal(claim.economy.funds.earned, 0);
  assert.throws(() => f.give(sybil, main, { gold: 140 }), /gold_not_transferable/);
  assert.equal(f.store.readEconomy(main).funds.earned, 420);
});

test('ENG06: goal input sources fail closed when no recorded input exists', () => {
  const g = started();
  sources.ensure(g);
  for (const id of ['gen2', 'mark', 'acq', 'un25', 'un45', 'win1', 'train', 'unlisted']) assert.equal(sources.goalInputSource(g, id), 'unknown');
  // Neither a missing building nor a missing hatch record may resolve to earned.
  assert.equal(sources.goalInputSource(g, 'yuva'), 'unknown');
  assert.equal(sources.goalInputSource(g, 'kulucka'), 'unknown');
  // Recorded server inputs still decide the input source.
  g.milestoneSources.acq = 'earned'; assert.equal(sources.goalInputSource(g, 'acq'), 'earned');
  g.grid.find(x => x.open && !x.b).b = 'yuva';
  assert.equal(sources.goalInputSource(g, 'yuva'), 'unknown');
  g.grid.find(x => x.b === 'yuva').funding = 'earned';
  assert.equal(sources.goalInputSource(g, 'yuva'), 'earned');
});

test('ENG06 policy: one-time goal rewards are bound even when every input is earned; unknown stays unknown', () => {
  const g = started();
  sources.ensure(g);
  g.grid.find(x => x.open && !x.b).b = 'yuva';
  g.grid.find(x => x.b === 'yuva').funding = 'earned';
  for (const id of ['acq', 'win1', 'train', 'talk', 'fav', 'aff', 'bred', 'gen2', 'mark', 'kulucka']) g.milestoneSources[id] = 'earned';
  g.milestoneSources.hatch = 'earned'; g.milestoneSources.renown = 'earned';
  for (const id of ['yuva', 'kulucka', 'acq', 'win1', 'train', 'talk', 'fav', 'aff', 'bred', 'gen2', 'mark', 'un25', 'un45'])
    assert.equal(sources.goalSource(g, id), 'bound', id);
  g.milestoneSources.acq = 'unknown';
  assert.equal(sources.goalSource(g, 'acq'), 'unknown');
});

test('ENG06 / REVIEW H-1 residual: borrowed earned gold cannot farm acq, yuva or kulucka rewards on throwaway accounts', t => {
  const f = fixture(t), main = f.fresh();
  const rich = f.load(main); rich.gold = 2000; f.save(main, earnedFixture(rich));
  const sybil = f.fresh(), tile = () => f.load(sybil).grid.findIndex(x => x.open && !x.b);
  // Drain the starter gold into sinks so every later spend uses borrowed earned gold.
  for (const kind of ['in', 'in', 'in', 'fener', 'fener']) f.run(sybil, 'building.buy', { kind, tile: tile() });
  assert.equal(f.store.readEconomy(sybil).gold, 0);
  const offer = f.load(sybil).market.dragons[0];
  f.give(main, sybil, { gold: offer.price + 400 });
  const paid = [], results = [f.run(sybil, 'shop.dragon', { id: offer.id })];
  for (const kind of ['yuva', 'kulucka']) results.push(f.run(sybil, 'building.buy', { kind, tile: tile() }));
  for (const r of results) paid.push(...plain(r.result.goals));
  // Amounts unchanged; every one-time reward is bound and stays on this account.
  assert.deepEqual(paid.map(r => [r.id, r.gold, r.source]), [['acq', 60, 'bound'], ['yuva', 40, 'bound'], ['kulucka', 40, 'bound']]);
  const funds = f.store.readEconomy(sybil).funds;
  const offerOf = gold => ({ gold, items: [], dragons: [], eggs: [], food: {} });
  assert.ok(funds.bound > 0);
  assert.throws(() => sources.tradable(f.load(sybil), offerOf(funds.earned + 1)), /gold_not_transferable/);
  f.give(sybil, main, { gold: funds.earned });
  // No earned gold was minted: the total is the start minus the earned gold actually spent.
  const spentEarned = results.reduce((n, r) => n + r.result.payment.earned, 0);
  const total = f.store.readEconomy(main).funds.earned + f.store.readEconomy(sybil).funds.earned;
  assert.equal(total, 2000 - spentEarned);
  assert.equal(f.store.readEconomy(sybil).funds.earned, 0);
});

test('ENG06: renown that predates source tracking keeps later renown goals restricted', () => {
  const g = started();
  const tile = g.grid.findIndex(x => x.open && !x.b);
  let game = step(g, 'building.buy', { kind: 'kulucka', tile }).game;
  // Legacy-shaped renown with no recorded source, and an earned egg that grants renown on hatch.
  game.un = 24; delete game.milestoneSources.renown;
  const egg = game.eggs[0]; egg.w = 2; egg.funding = 'earned';
  egg.genes.el = ['golge', 'golge'];
  const hatched = step(game, 'egg.hatch', { assetId: egg.assetId });
  assert.ok(hatched.game.un >= 25);
  const un25 = hatched.result.goals.find(r => r.id === 'un25');
  assert.equal(un25.gold, 60);
  assert.equal(un25.source, 'unknown');
  assert.equal(hatched.game.milestoneSources.renown, 'unknown');
});

test('ENG06: renown earned entirely from an earned hatch stays earned', () => {
  const g = started();
  let game = step(g, 'building.buy', { kind: 'kulucka', tile: g.grid.findIndex(x => x.open && !x.b) }).game;
  const egg = game.eggs[0]; egg.w = 2; egg.funding = 'earned'; egg.genes.el = ['golge', 'golge'];
  const hatched = step(game, 'egg.hatch', { assetId: egg.assetId });
  assert.ok(hatched.game.un > 0);
  assert.equal(hatched.game.milestoneSources.renown, 'earned');
  assert.equal(hatched.game.dragons.at(-1).funding, 'earned');
});
