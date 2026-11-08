'use strict';
// ENG06 P-D · Ejderha Düellosu: sunucu savaşçısı (D-1), maç kaydı + tohumlu tekrar (D-2), tek seferlik ödül (D-3).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { validateCommand } = require('../server/economy_commands');
const sources = require('../server/economy_sources');
const duel = require('../server/duel_service');
const { DUEL_REWARDS, PLACEHOLDER_DEFAULTS, readDuelConfig, DUEL } = require('../server/duel_config');
const DuelEngine = require('../js/duel_engine');
const { createDragonDuelServer } = require('../js/duel_server');
const { earnedFixture } = require('./helpers/earned_fixture');
const uuid = () => crypto.randomUUID();

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-pd-')), file = path.join(dir, 'db.sqlite');
  let clock = Date.UTC(2026, 10, 8, 12, 0, 0);
  const store = openEconomyStore(file, { now: () => clock }), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const eco = id => store.readEconomy(id);
  const fresh = ({ earned = false } = {}) => {
    const guest = store.createGuest();
    store.executeCommand(guest.accountId, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
    if (earned) save(guest.accountId, earnedFixture(load(guest.accountId)));
    return { ...guest, dragon: eco(guest.accountId).dragons[0].assetId };
  };
  const run = (id, type, args = {}) => store.executeCommand(id, { requestId: uuid(), expectedVersion: eco(id).version, type, args });
  const trade = (actor, type, extra) => store.executeTrade(actor, { type, requestId: uuid(), ...extra });
  const market = (actor, fields) => store.executeMarket(actor, { requestId: uuid(), ...fields });
  return { store, raw, load, save, eco, fresh, run, trade, market, tick: ms => { clock += ms; }, now: () => clock };
}

// Bütün maçı sunucu kuralıyla oynatır: aynı seed ile hamle günlüğü üretir.
function playToEnd(match, actions = ['pence', 'pence']) {
  const rng = duel.seededRng(match.seed);
  const F = DuelEngine.createFight(match.participants[0].fighter, match.participants[1].fighter);
  const log = [];
  while (!F.over) { log.push({ round: F.round + 1, actions: [...actions] }); DuelEngine.resolveRound(F, actions[0], actions[1], rng); }
  return { log, F };
}
const seed = () => crypto.randomBytes(32).toString('hex');
function open(f, a, b, extra = {}) {
  return f.store.openMatch({ matchId: duel.newMatchId(), seed: seed(), participants: [
    { accountId: a.accountId, handle: a.handle, dragonAssetId: extra.aDragon || a.dragon },
    { accountId: b.accountId, handle: b.handle, dragonAssetId: extra.bDragon || b.dragon },
  ] }).match;
}
function fullMatch(f, a, b) {
  const match = open(f, a, b);
  const final = f.store.finalizeMatch(match.id, { log: playToEnd(match).log, forfeit: null });
  const settle = [a, b].map(u => f.store.settleGameplay(u.accountId, { eventId: match.id, kind: duel.SETTLEMENT_KIND }).result);
  return { match: final, settle };
}
const byAccount = (match, settle, u) => settle.find(s => s.accountId === u.accountId);

// ---------- Duel server harness (gerçek WS mesaj yolu, sahte soket) ----------
function makeSocket(user) {
  return {
    playerInfo: { handle: user.handle, accountId: user.accountId, authenticated: true, xVerified: user.xVerified !== false },
    destroyed: false, messages: [],
    write(frame) { this.messages.push(JSON.parse(frame)); },
    take(type) { return this.messages.filter(m => m.type === type); },
    last(type) { return this.take(type).at(-1); },
  };
}
function harness(f, world = { players: {} }) {
  const clients = new Set();
  const server = createDragonDuelServer({ crypto, WS_CLIENTS: clients, WORLD: world, encodeWsFrame: JSON.stringify, store: f.store, retryDelayMs: 0 });
  const join = user => { const s = makeSocket(user); clients.add(s); return s; };
  return { server, clients, join, world };
}
async function startRanked(h, sa, sb, a, b, { aDragon = a.dragon, bDragon = b.dragon } = {}) {
  h.server.onMessage(sa, { type: 'duel_invite', to: b.handle, dragonAssetId: aDragon });
  await h.server.idle();
  const inv = sb.last('duel_invite');
  assert.ok(inv && inv.ranked, JSON.stringify(sa.last('duel_error')));
  h.server.onMessage(sb, { type: 'duel_invite_reply', inviteId: inv.id, accept: true, dragonAssetId: bDragon });
  await h.server.idle();
  const start = sa.last('duel_room_start');
  assert.ok(start && start.ranked, JSON.stringify(sb.last('duel_error')));
  return start;
}
async function playRounds(h, sa, sb, roomId, n, acts = ['pence', 'pence']) {
  for (let i = 0; i < n; i++) {
    const state = sa.messages.filter(m => m.roomId === roomId && ['duel_room_state', 'duel_room_start'].includes(m.type)).at(-1);
    if (state.fight.over) break;
    const round = state.fight.round + 1;
    h.server.onMessage(sa, { type: 'duel_action', roomId, round, action: acts[0], winner: '@hile', gold: 99999 });
    h.server.onMessage(sb, { type: 'duel_action', roomId, round, action: acts[1] });
  }
  await h.server.idle();
}

// ======================= Birim =======================
test('P-D config: placeholder defaults, env override, invalid values fail closed; reward table is the existing 85/35/20', () => {
  assert.deepEqual(PLACEHOLDER_DEFAULTS, { pairDailyLimit: 3, accountDailyLimit: 10, forfeitMinRounds: 3, matchTtlMs: 3600000 });
  assert.deepEqual({ ...DUEL_REWARDS }, { win: 85, draw: 35, loss: 20 });
  assert.equal(DUEL.pairDailyLimit, 3); assert.equal(DUEL.accountDailyLimit, 10); assert.equal(DUEL.forfeitMinRounds, 3);
  const cfg = readDuelConfig({ EO_DUEL_PAIR_DAILY_LIMIT: '1', EO_DUEL_ACCOUNT_DAILY_LIMIT: '2', EO_DUEL_FORFEIT_MIN_ROUNDS: '5' });
  assert.equal(cfg.pairDailyLimit, 1); assert.equal(cfg.accountDailyLimit, 2); assert.equal(cfg.forfeitMinRounds, 5);
  for (const env of [{ EO_DUEL_PAIR_DAILY_LIMIT: '-1' }, { EO_DUEL_ACCOUNT_DAILY_LIMIT: 'x' }, { EO_DUEL_FORFEIT_MIN_ROUNDS: '31' }, { EO_DUEL_MATCH_TTL_MS: '5' }]) {
    assert.throws(() => readDuelConfig(env), /invalid_EO_DUEL/);
  }
  assert.throws(() => Object.assign(DUEL_REWARDS, { win: 9999 }), TypeError);
  // Settlement is never a client command: the economy command API keeps rejecting duel results.
  for (const type of ['duel.result', 'duel.settle', 'arena.win']) assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 0, type, args: {} }), /unsupported_command/);
});

test('P-D seeded engine: same seed + same log reproduces the fight exactly; default engine still uses Math.random', () => {
  const f1 = { name: 'A', el: 'ates', gu: 60, ce: 55, da: 50, ze: 55, maxHp: 150, cards: ['celik_pence'] };
  const f2 = { name: 'B', el: 'buz', gu: 52, ce: 70, da: 52, ze: 58, maxHp: 150 };
  const s = seed();
  const runOnce = () => { const rng = duel.seededRng(s), F = DuelEngine.createFight(f1, f2), evs = [];
    for (let r = 0; r < 6 && !F.over; r++) evs.push(DuelEngine.resolveRound(F, r === 0 ? 'card:celik_pence' : 'pence', 'nefes', rng)); return { F, evs }; };
  assert.deepEqual(runOnce(), runOnce());
  const other = (() => { const rng = duel.seededRng(seed()), F = DuelEngine.createFight(f1, f2); for (let r = 0; r < 6 && !F.over; r++) DuelEngine.resolveRound(F, 'pence', 'pence', rng); return F; })();
  assert.ok(other.round > 0);
  const F = DuelEngine.createFight(f1, f2); DuelEngine.resolveRound(F, 'pence', 'pence'); assert.equal(F.round, 1);
  assert.throws(() => duel.seededRng('short'), /match_seed_invalid/);
});

test('P-D outcome policy: K10 forfeit and draw rules, K9 same account; client cannot choose the amount', () => {
  const m = (result, status = 'final') => ({ id: 'dragon_' + 'a'.repeat(20), status, finalAt: Date.UTC(2026, 0, 1), participants: [{ accountId: 'A' }, { accountId: 'B' }], result });
  const base = { forfeitBy: [], playedRounds: 5 };
  assert.deepEqual(duel.duelOutcome(m({ ...base, winner: 'A' }), 'A'), { outcome: 'win', amount: 85, reason: null });
  assert.deepEqual(duel.duelOutcome(m({ ...base, winner: 'A' }), 'B'), { outcome: 'loss', amount: 20, reason: null });
  assert.deepEqual(duel.duelOutcome(m({ ...base, winner: null }), 'B'), { outcome: 'draw', amount: 35, reason: null });
  // Terk eden yenilmiş sayılır, ödül almaz; kazanan ödülü en az N oynanmış turla alır.
  assert.equal(duel.duelOutcome(m({ winner: 'A', forfeitBy: ['B'], playedRounds: 2 }), 'A').reason, 'forfeit_too_short');
  assert.equal(duel.duelOutcome(m({ winner: 'A', forfeitBy: ['B'], playedRounds: 3 }), 'A').amount, 85);
  assert.deepEqual(duel.duelOutcome(m({ winner: 'A', forfeitBy: ['B'], playedRounds: 9 }), 'B'), { outcome: 'forfeit', amount: 0, reason: 'forfeit_leaver' });
  // Both surrender (engine draw): both are leavers.
  assert.equal(duel.duelOutcome(m({ winner: null, forfeitBy: ['A', 'B'], playedRounds: 9 }), 'A').reason, 'forfeit_leaver');
  assert.equal(duel.duelOutcome(m({ winner: 'A', forfeitBy: ['B'], playedRounds: 1 }), 'A', { ...DUEL, forfeitMinRounds: 0 }).amount, 85);
  const same = { ...m({ ...base, winner: 'A' }), participants: [{ accountId: 'A' }, { accountId: 'A' }] };
  assert.equal(duel.duelOutcome(same, 'A').reason, 'same_account');
  assert.equal(duel.duelOutcome(m({ reason: 'match_expired' }, 'void'), 'A').reason, 'match_expired');
  assert.throws(() => duel.duelOutcome(m(null, 'active'), 'A'), /match_not_final/);
  assert.throws(() => duel.duelOutcome(m({ ...base, winner: 'A' }), 'C'), /match_not_participant/);
  // K9 account limit with a lowered placeholder (env-equivalent config) and UTC day keys.
  const game = { gold: 0, debt: 0, funds: { schema: 1, bound: 0, unknown: 0, earned: 0 }, food: {}, foodSources: {}, inv: [], dragons: [], eggs: [], milestoneSources: {} };
  const daily = { schema: 1, accountId: 'A', day: '2026-01-01', total: 1, pairs: { C: 1 } };
  const limited = duel.settleTransition({ match: m({ ...base, winner: 'A' }), accountId: 'A', game, version: 4, daily, now: 0, cfg: { ...DUEL, accountDailyLimit: 1 } });
  assert.equal(limited.result.reason, 'daily_account_limit'); assert.equal(limited.game, null); assert.equal(limited.version, 4);
  const paid = duel.settleTransition({ match: m({ ...base, winner: 'A' }), accountId: 'A', game, version: 4, daily, now: 0 });
  assert.equal(paid.game.gold, 85); assert.equal(paid.game.funds.earned, 85); assert.equal(paid.version, 5); assert.deepEqual(paid.daily.pairs, { C: 1, B: 1 });
  assert.equal(duel.dayOf(Date.UTC(2026, 0, 1, 23, 59)), '2026-01-01'); assert.equal(duel.dayOf(Date.UTC(2026, 0, 2, 0, 0)), '2026-01-02');
});

// ======================= SQLite + duel sunucusu =======================
test('P-D D-1: server fighter comes from the ledger dragon; a forged duelFighter has no effect', async t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const forged = { name: 'Hile', el: 'golge', gu: 500, ce: 500, da: 500, ze: 500, atk: 500, def: 500, crit: 100, dodge: 90, maxHp: 5000, cards: ['celik_pence', 'yildirim', 'son_nefes'] };
  const h = harness(f, { players: { [a.handle]: { handle: a.handle, star: { name: 'Hile', st: {} }, duelFighter: forged }, [b.handle]: { handle: b.handle, star: { name: 'X', st: {} }, duelFighter: forged } } });
  const sa = h.join(a), sb = h.join(b);
  const start = await startRanked(h, sa, sb, a, b);
  const expected = duel.fighterFromLedger(f.load(a.accountId), f.load(a.accountId).dragons[0]);
  assert.equal(start.fight.p.gu, expected.gu); assert.equal(start.fight.p.maxHp, expected.maxHp);
  assert.notEqual(start.fight.p.gu, 500); assert.deepEqual(start.fight.p.cards, expected.cards);
  assert.equal(start.players[0].dragon.assetId, a.dragon, 'room shows the ledger dragon, not the client star');
  const match = f.store.readMatch(start.matchId);
  assert.equal(match.status, 'active'); assert.equal(match.participants[0].fighter.gu, expected.gu);
  assert.match(match.seed, /^[a-f0-9]{64}$/);
});

test('P-D D-1: other account dragon, sold dragon, trade-reserved and listed dragons are rejected', async t => {
  const f = fixture(t), a = f.fresh({ earned: true }), b = f.fresh({ earned: true }), c = f.fresh({ earned: true });
  const h = harness(f);
  const sa = h.join(a), sb = h.join(b);
  const tryInvite = async dragonAssetId => { sa.messages.length = 0; h.server.onMessage(sa, { type: 'duel_invite', to: b.handle, dragonAssetId }); await h.server.idle(); return sa.last('duel_error')?.code; };
  assert.equal(await tryInvite(b.dragon), 'dragon_not_owned');
  assert.equal(await tryInvite('forged:dragon:1'), 'dragon_not_owned');
  assert.equal(await tryInvite(12), 'invalid_dragon_asset');
  // Takas teklifindeki ejderha
  let tr = f.trade(a.accountId, 'invite', { targetId: c.accountId }).trade;
  tr = f.trade(c.accountId, 'accept', { tradeId: tr.id }).trade;
  tr = f.trade(a.accountId, 'offer', { tradeId: tr.id, revision: tr.revision, offer: { dragons: [a.dragon] } }).trade;
  assert.equal(await tryInvite(a.dragon), 'dragon_trade_reserved');
  f.trade(a.accountId, 'cancel', { tradeId: tr.id });
  // Bedesten ilanındaki ejderha
  const listing = f.market(a.accountId, { op: 'list', kind: 'dragon', assetId: a.dragon, quantity: 1, unitPrice: 100 }).listing;
  assert.equal(await tryInvite(a.dragon), 'dragon_market_listed');
  f.market(a.accountId, { op: 'cancel', listingId: listing.id });
  // Satılmış ejderha artık defterde yok
  f.run(a.accountId, 'dragon.sell', { assetId: a.dragon });
  assert.equal(await tryInvite(a.dragon), 'dragon_not_owned');
  assert.equal(sb.take('duel_invite').length, 0, 'no invite reached the opponent');
  // Kabul eden taraf da aynı denetimden geçer (atomik openMatch)
  const d = f.fresh(), sd = h.join(d);
  h.server.onMessage(sd, { type: 'duel_invite', to: b.handle, dragonAssetId: d.dragon }); await h.server.idle();
  h.server.onMessage(sb, { type: 'duel_invite_reply', inviteId: sb.last('duel_invite').id, accept: true, dragonAssetId: d.dragon }); await h.server.idle();
  assert.equal(sb.last('duel_error').code, 'dragon_not_owned'); assert.equal(sd.last('duel_invite_result').status, 'failed');
  assert.equal(f.raw.prepare('SELECT count(*) n FROM matches').get().n, 0);
  assert.throws(() => open(f, d, d), /same_account/);
});

test('P-D D-2/D-3: full ranked duel is recorded, replays from seed, pays once (85 winner / 20 loser, earned)', async t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const h = harness(f);
  const sa = h.join(a), sb = h.join(b);
  const before = { a: f.eco(a.accountId), b: f.eco(b.accountId) };
  const start = await startRanked(h, sa, sb, a, b);
  await playRounds(h, sa, sb, start.roomId, 40);
  const final = sa.last('duel_room_state');
  assert.equal(final.fight.over, true);
  const match = f.store.readMatch(start.matchId);
  assert.equal(match.status, 'final');
  assert.equal(match.result.log.length, final.fight.round);
  const replay = duel.replayMatch(match);
  assert.equal(replay.winner, final.fight.winner); assert.equal(replay.p.hp, final.fight.p.hp); assert.equal(replay.e.hp, final.fight.e.hp);
  assert.deepEqual(duel.replayMatch(match), replay, 'replay is deterministic');
  const winnerId = match.result.winner, loserId = winnerId === a.accountId ? b.accountId : a.accountId;
  assert.equal(winnerId, final.fight.winner === 'p' ? a.accountId : b.accountId);
  const sw = winnerId === a.accountId ? sa : sb, sl = sw === sa ? sb : sa;
  assert.equal(sw.last('duel_settlement').amount, 85); assert.equal(sw.last('duel_settlement').status, 'paid');
  assert.equal(sl.last('duel_settlement').amount, 20); assert.equal(sl.last('duel_settlement').outcome, 'loss');
  const after = { [a.accountId]: f.eco(a.accountId), [b.accountId]: f.eco(b.accountId) };
  const was = { [a.accountId]: before.a, [b.accountId]: before.b };
  assert.equal(after[winnerId].gold, was[winnerId].gold + 85); assert.equal(after[loserId].gold, was[loserId].gold + 20);
  assert.equal(after[winnerId].funds.earned, was[winnerId].funds.earned + 85);
  assert.equal(after[winnerId].version, was[winnerId].version + 1);
  for (const id of [a.accountId, b.accountId]) { const g = f.load(id); assert.equal(g.funds.bound + g.funds.unknown + g.funds.earned, g.gold); }
  // Kazanılan altın takas edilebilir (earned); bound başlangıç altını edilemez.
  const g = f.load(winnerId);
  assert.doesNotThrow(() => sources.tradable(g, { gold: 85, items: [], dragons: [], eggs: [], food: {} }));
  assert.throws(() => sources.tradable(g, { gold: 86, items: [], dragons: [], eggs: [], food: {} }), /gold_not_transferable/);
  // Aynı maç ikinci kez (ve eşzamanlı) ödenmez.
  const again = await Promise.all([0, 1].map(() => Promise.resolve().then(() => f.store.settleGameplay(winnerId, { eventId: match.id, kind: duel.SETTLEMENT_KIND }))));
  assert.ok(again.every(r => r.replayed)); assert.equal(f.eco(winnerId).gold, after[winnerId].gold);
  assert.equal(f.raw.prepare('SELECT count(*) n FROM gameplay_settlements WHERE event_id=?').get(match.id).n, 2);
  // Kesinleşmiş kayıt değiştirilemez; istemci winner/gold alanları hiçbir yolda okunmaz.
  assert.throws(() => f.store.finalizeMatch(match.id, { log: [], forfeit: null, winner: b.accountId, gold: 9999 }), /match_closed/);
  assert.throws(() => f.store.settleGameplay(winnerId, { eventId: match.id, kind: 'duel.bonus' }), /invalid_settlement/);
  // Kilit maç bitince kalkar: ejderha yeniden satılabilir.
  assert.equal(f.run(a.accountId, 'dragon.sell', { assetId: a.dragon }).economy.dragons.length, 0);
});

test('P-D concurrency: two settles for the same match and account at once pay exactly once', async t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const match = open(f, a, b);
  f.store.finalizeMatch(match.id, { log: playToEnd(match).log, forfeit: null });
  const gold = f.eco(a.accountId).gold;
  const results = await Promise.allSettled([1, 2, 3].map(() => Promise.resolve().then(() => f.store.settleGameplay(a.accountId, { eventId: match.id, kind: duel.SETTLEMENT_KIND }))));
  assert.ok(results.every(r => r.status === 'fulfilled'));
  assert.equal(results.filter(r => !r.value.replayed).length, 1);
  const paid = results.find(r => !r.value.replayed).value.result.amount;
  assert.equal(f.eco(a.accountId).gold, gold + paid);
});

test('P-D K9: pair limit (3 per UTC day), resets next UTC day; counters never block the opponent of a different pair', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh(), c = f.fresh();
  for (let i = 0; i < 3; i++) assert.ok(fullMatch(f, a, b).settle.every(s => s.status === 'paid'));
  const fourth = fullMatch(f, a, b);
  assert.ok(fourth.settle.every(s => s.status === 'no_reward' && s.reason === 'daily_pair_limit'));
  const gold = f.eco(a.accountId).gold;
  assert.equal(byAccount(null, fullMatch(f, a, c).settle, a).status, 'paid', 'a different pair is still rewarded');
  assert.ok(f.eco(a.accountId).gold > gold);
  f.tick(24 * 60 * 60 * 1000);
  assert.ok(fullMatch(f, a, b).settle.every(s => s.status === 'paid'), 'new UTC day');
});

test('P-D K9: account limit (10 per UTC day) across opponents', t => {
  const f = fixture(t), a = f.fresh();
  const opponents = [f.fresh(), f.fresh(), f.fresh(), f.fresh()];
  let paid = 0;
  for (const o of opponents) for (let i = 0; i < 3; i++) { const s = byAccount(null, fullMatch(f, a, o).settle, a); if (s.status === 'paid') paid++; else assert.equal(s.reason, 'daily_account_limit'); }
  assert.equal(paid, 10);
  const row = JSON.parse(f.raw.prepare('SELECT json FROM gameplay_daily WHERE id LIKE ?').get('gameplay-daily:' + a.accountId + ':%').json);
  assert.equal(row.total, 10); assert.equal(row.day, '2026-11-08');
});

test('P-D K9 legacy/bot rooms: a legacy (unranked) room never creates a match or pays; same account cannot open ranked', async t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const fighter = { name: 'K', el: 'ates', gu: 40, ce: 40, da: 40, ze: 40, maxHp: 120 };
  const h = harness(f, { players: { [a.handle]: { handle: a.handle, star: { name: 'K', st: {} }, duelFighter: fighter }, [b.handle]: { handle: b.handle, star: { name: 'L', st: {} }, duelFighter: fighter } } });
  const sa = h.join(a), sb = h.join(b);
  const gold = [f.eco(a.accountId).gold, f.eco(b.accountId).gold];
  h.server.onMessage(sa, { type: 'duel_invite', to: b.handle });
  h.server.onMessage(sb, { type: 'duel_invite_reply', inviteId: sb.last('duel_invite').id, accept: true });
  const start = sa.last('duel_room_start');
  assert.equal(start.ranked, false);
  await playRounds(h, sa, sb, start.roomId, 40);
  assert.equal(sa.last('duel_room_state').fight.over, true);
  assert.equal(sa.take('duel_settlement').length, 0);
  assert.equal(f.raw.prepare('SELECT count(*) n FROM matches').get().n, 0);
  assert.deepEqual([f.eco(a.accountId).gold, f.eco(b.accountId).gold], gold);
  // Aynı hesabın iki soketi (farklı handle ile) ödüllü oda açamaz.
  const twin = h.join({ handle: '@ikiz_hesap', accountId: a.accountId });
  h.server.onMessage(twin, { type: 'duel_invite', to: a.handle, dragonAssetId: a.dragon });
  await h.server.idle();
  assert.equal(twin.last('duel_error').code, 'same_account');
  // Oturumsuz/hesapsız soket ödüllü oda açamaz.
  const anon = h.join({ handle: '@anon_x', accountId: null });
  h.server.onMessage(anon, { type: 'duel_invite', to: b.handle, dragonAssetId: 'x' });
  assert.equal(anon.last('duel_error').code, 'account_required');
});

test('P-D K10: early leave/surrender pays nobody; leave after N rounds pays only the winner', async t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh(), c = f.fresh();
  const h = harness(f);
  const sa = h.join(a), sb = h.join(b), sc = h.join(c);
  // 1 tur sonra terk
  let start = await startRanked(h, sa, sb, a, b);
  await playRounds(h, sa, sb, start.roomId, 1, ['savun', 'savun']);
  h.server.onMessage(sb, { type: 'duel_leave', roomId: start.roomId }); await h.server.idle();
  assert.deepEqual([sa.last('duel_settlement').reason, sb.last('duel_settlement').reason], ['forfeit_too_short', 'forfeit_leaver']);
  assert.equal(f.store.readMatch(start.matchId).result.endReason, 'leave');
  // İlk turda teslim
  start = await startRanked(h, sa, sc, a, c);
  h.server.onMessage(sa, { type: 'duel_action', roomId: start.roomId, round: 1, action: 'savun' });
  h.server.onMessage(sc, { type: 'duel_action', roomId: start.roomId, round: 1, action: 'teslim' });
  await h.server.idle();
  assert.equal(f.store.readMatch(start.matchId).result.endReason, 'surrender');
  assert.deepEqual([sa.last('duel_settlement').reason, sc.last('duel_settlement').reason], ['forfeit_too_short', 'forfeit_leaver']);
  // 3 tur sonra terk: kazanan 85, terk eden 0
  const goldA = f.eco(a.accountId).gold, goldB = f.eco(b.accountId).gold;
  start = await startRanked(h, sa, sb, a, b);
  await playRounds(h, sa, sb, start.roomId, 3, ['savun', 'savun']);
  h.server.onMessage(sb, { type: 'duel_leave', roomId: start.roomId }); await h.server.idle();
  assert.equal(sa.last('duel_settlement').amount, 85); assert.equal(sb.last('duel_settlement').amount, 0);
  assert.equal(f.eco(a.accountId).gold, goldA + 85); assert.equal(f.eco(b.accountId).gold, goldB);
  const m = f.store.readMatch(start.matchId);
  assert.equal(m.result.playedRounds, 3); assert.deepEqual(m.result.forfeitBy, [b.accountId]); assert.equal(m.result.winner, a.accountId);
  // Kopma yolu (saf geçiş): yalnız tanımlı nedenler kabul edilir.
  const m2 = open(f, a, b);
  assert.throws(() => f.store.finalizeMatch(m2.id, { log: [], forfeit: { accountId: 'zzz', reason: 'disconnect' } }), /match_not_over/);
  assert.equal(f.store.finalizeMatch(m2.id, { log: [], forfeit: { accountId: b.accountId, reason: 'disconnect' } }).result.endReason, 'disconnect');
});

test('P-D D4: indebted winner is paid but the reward pays the debt first (economy_debt.receive)', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const g = f.load(a.accountId); g.gold = 0; g.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g.debt = 50; f.save(a.accountId, g);
  const match = open(f, a, b);
  const { log } = playToEnd(match);
  const final = f.store.finalizeMatch(match.id, { log, forfeit: null });
  const r = f.store.settleGameplay(a.accountId, { eventId: match.id, kind: duel.SETTLEMENT_KIND }).result;
  const amount = final.result.winner === a.accountId ? 85 : 20;
  const paidDebt = Math.min(50, amount);
  assert.equal(r.amount, amount); assert.equal(r.paidDebt, paidDebt); assert.equal(r.credited, amount - paidDebt);
  const after = f.load(a.accountId);
  assert.equal(after.debt, 50 - paidDebt); assert.equal(after.gold, amount - paidDebt); assert.equal(after.funds.earned, amount - paidDebt);
  assert.ok(after.debt === 0 || after.gold === 0, 'debt > 0 implies gold === 0');
  // Borç tutardan büyükse ödül tamamen borca gider, değişmez korunur (debt>0 ⇒ gold=0).
  const g2 = f.load(b.accountId); g2.gold = 0; g2.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g2.debt = 500; f.save(b.accountId, g2);
  f.store.settleGameplay(b.accountId, { eventId: match.id, kind: duel.SETTLEMENT_KIND });
  const b2 = f.load(b.accountId); assert.equal(b2.gold, 0); assert.ok(b2.debt < 500);
});

test('P-D D-2 lock: during an active match the dragon cannot be sold, offered, listed or used in a second match; expiry voids', t => {
  const f = fixture(t), a = f.fresh({ earned: true }), b = f.fresh({ earned: true }), c = f.fresh({ earned: true });
  const match = open(f, a, b);
  assert.throws(() => f.run(a.accountId, 'dragon.sell', { assetId: a.dragon }), /duel_locked_asset/);
  let tr = f.trade(a.accountId, 'invite', { targetId: c.accountId }).trade;
  tr = f.trade(c.accountId, 'accept', { tradeId: tr.id }).trade;
  assert.throws(() => f.trade(a.accountId, 'offer', { tradeId: tr.id, revision: tr.revision, offer: { dragons: [a.dragon] } }), /duel_locked_asset/);
  f.trade(a.accountId, 'cancel', { tradeId: tr.id });
  assert.throws(() => f.market(a.accountId, { op: 'list', kind: 'dragon', assetId: a.dragon, quantity: 1, unitPrice: 100 }), /duel_locked_asset/);
  assert.throws(() => open(f, a, c), /duel_busy/);
  assert.equal(f.eco(a.accountId).dragons.length, 1);
  // Kilit dışı işlemler serbest (yalnız kilitli ejderhayı korur).
  assert.ok(f.run(a.accountId, 'shop.food', { key: 'balik' }).economy);
  // Ömür aşımı: kayıt void, ödül yok, kilit kalkar.
  f.tick(DUEL.matchTtlMs + 1);
  const voided = f.store.finalizeMatch(match.id, { log: playToEnd(match).log, forfeit: null });
  assert.equal(voided.status, 'void');
  const r = f.store.settleGameplay(a.accountId, { eventId: match.id, kind: duel.SETTLEMENT_KIND }).result;
  assert.deepEqual([r.status, r.reason, r.amount], ['no_reward', 'match_expired', 0]);
  assert.equal(f.run(a.accountId, 'dragon.sell', { assetId: a.dragon }).economy.dragons.length, 0);
  // Henüz kesinleşmemiş maç için settlement yok.
  const m3 = open(f, b, c);
  assert.throws(() => f.store.settleGameplay(b.accountId, { eventId: m3.id, kind: duel.SETTLEMENT_KIND }), /match_not_final/);
  assert.equal(f.raw.prepare('SELECT count(*) n FROM gameplay_settlements WHERE event_id=?').get(m3.id).n, 0);
});

test('P-D D-2: a tampered log (illegal action, wrong round) is rejected; log length is bounded', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const match = open(f, a, b);
  assert.throws(() => f.store.finalizeMatch(match.id, { log: [{ round: 1, actions: ['admin_win', 'pence'] }], forfeit: null }), /match_log_invalid/);
  assert.throws(() => f.store.finalizeMatch(match.id, { log: [{ round: 2, actions: ['pence', 'pence'] }], forfeit: null }), /match_log_invalid/);
  assert.throws(() => f.store.finalizeMatch(match.id, { log: [{ round: 1, actions: ['card:yildirim', 'pence'] }], forfeit: null }), /match_log_invalid/);
  assert.throws(() => f.store.finalizeMatch(match.id, { log: Array.from({ length: 31 }, (_, i) => ({ round: i + 1, actions: ['savun', 'savun'] })), forfeit: null }), /match_log_invalid/);
  assert.throws(() => f.store.finalizeMatch(match.id, { log: [{ round: 1, actions: ['savun', 'savun'] }], forfeit: null }), /match_not_over/);
  assert.equal(f.store.readMatch(match.id).status, 'active');
});

test('ENG-10 Y-1 (K9): ödüllü düello yalnız kayıtlı (X oturumlu) hesaplara; davette ve kabulde iki taraf; vitrin misafire açık', async t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const fighter = { name: 'K', el: 'ates', gu: 40, ce: 40, da: 40, ze: 40, maxHp: 120 };
  const h = harness(f, { players: { [a.handle]: { handle: a.handle, star: { name: 'K', st: {} }, duelFighter: fighter }, [b.handle]: { handle: b.handle, star: { name: 'L', st: {} }, duelFighter: fighter } } });
  const ga = h.join({ ...a, xVerified: false }), sb = h.join(b);
  // Misafir davet eden → net mesaj, maç yok.
  h.server.onMessage(ga, { type: 'duel_invite', to: b.handle, dragonAssetId: a.dragon });
  await h.server.idle();
  assert.equal(ga.last('duel_error').code, 'registered_account_required');
  assert.match(ga.last('duel_error').message, /hesap aç/);
  assert.equal(sb.take('duel_invite').length, 0);
  // Kayıtlı davet eden, misafir rakip → reddedilir.
  h.server.onMessage(sb, { type: 'duel_invite', to: a.handle, dragonAssetId: b.dragon });
  await h.server.idle();
  assert.equal(sb.last('duel_error').code, 'opponent_registered_required');
  // Davetten sonra kabul eden oturumunu kaybederse (misafire düşerse) kabulde de reddedilir.
  h.clients.delete(ga); const ra = h.join(a);
  h.server.onMessage(sb, { type: 'duel_invite', to: a.handle, dragonAssetId: b.dragon });
  await h.server.idle();
  const inv = ra.last('duel_invite'); assert.ok(inv && inv.ranked);
  ra.playerInfo.xVerified = false;
  h.server.onMessage(ra, { type: 'duel_invite_reply', inviteId: inv.id, accept: true, dragonAssetId: a.dragon });
  await h.server.idle();
  assert.equal(ra.last('duel_error').code, 'registered_account_required');
  assert.equal(sb.last('duel_invite_result').status, 'failed');
  assert.equal(f.raw.prepare('SELECT count(*) n FROM matches').get().n, 0);
  // Vitrin (ödülsüz) düello misafire açık kalır.
  h.server.onMessage(ra, { type: 'duel_invite', to: b.handle });
  h.server.onMessage(sb, { type: 'duel_invite_reply', inviteId: sb.last('duel_invite').id, accept: true });
  assert.equal(ra.last('duel_room_start').ranked, false);
});
