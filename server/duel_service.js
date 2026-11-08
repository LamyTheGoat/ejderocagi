'use strict';
// ENG06 P-D · Ejderha Düellosu: sunucu savaşçısı (D-1), kalıcı maç kaydı (D-2), tek seferlik ödül (D-3).
// Saf kurallar. Depolar (SQLite, Firestore) maç kaydını, ejderha kilidini, hesap durumunu, günlük sayaçları
// ve settlement satırını TEK transaction içinde okur/yazar. İstemci savaşçı istatistiği, kazanan, altın,
// tur sayısı veya kaynak sınıfı gönderemez; hepsi sunucu defterinden ve sunucu tur günlüğünden türetilir.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sources = require('./economy_sources');
const debt = require('./economy_debt');
const DuelEngine = require('../js/duel_engine');
const { DUEL, DUEL_REWARDS, RULE_VERSION } = require('./duel_config');

function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const clone = value => JSON.parse(JSON.stringify(value));
const MAX_GOLD = 2_000_000_000;
const SETTLEMENT_KIND = 'duel.reward';
const MATCH_ID = /^dragon_[a-f0-9]{20}$/;
const ACTION = /^(pence|savun|teslim|nefes|kukre|card:[a-z_]{1,30})$/;

// ---------- D-1: sunucu savaşçısı ----------
// economy_commands.js ile aynı depo-sahipli kural dosyaları; ayrı bağlam, ayrı ifşa listesi
// (economy_commands.js'e dokunulmadan; Codex P-A çakışma riskini küçük tutmak için).
const load = name => new vm.Script(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), { filename: name + '.js' });
const rules = ['data', 'core', 'week', 'social', 'chibi'].map(load);
const expose = new vm.Script(`({
  load(value) { S = value; },
  fighter(d) { return { ...fighterFromDragon(d), seasonMult: seasonMult(d.el) }; },
})`, { filename: 'server_duel_expose.js' });
const FIGHTER_KEYS = ['name', 'el', 'gu', 'ce', 'da', 'ze', 'atk', 'def', 'crit', 'dodge', 'nefesB', 'seasonMult', 'maxHp', 'mood',
  'cesur', 'temkinli', 'demir', 'vahsi', 'bond', 'bondUsed', 'heart', 'saves', 'tired', 'cards'];

// İstemcinin `duelFighter`ı ile aynı formül (js/net.js:318): fighterFromDragon(star) + seasonMult(star.el).
// Savaşçı hesabı rastgelelik kullanmaz; kullanırsa fail-closed.
function fighterFromLedger(game, dragon) {
  const math = Object.create(Math);
  math.random = () => { throw new Error('duel_fighter_random'); };
  const context = vm.createContext({ Math: math, UI: {} }, { codeGeneration: { strings: false, wasm: false } });
  for (const script of rules) script.runInContext(context, { timeout: 1000 });
  const api = expose.runInContext(context, { timeout: 1000 });
  const S = clone(game);
  api.load(S);
  const raw = api.fighter(S.dragons.find(d => d.assetId === dragon.assetId));
  const out = {};
  for (const key of FIGHTER_KEYS) out[key] = key === 'cards' ? [...(raw.cards || [])].map(String) : raw[key];
  return clone(out);
}

// Katılım: ejderha sunucu defterinde bu hesabın olmalı; ölü, görevde, takas kilitli, takas teklifinde,
// Bedesten ilanında ya da başka bir aktif düelloda olmamalı (market_service `unavailable` ve
// economy_commands `dragon.sell` ölçütleriyle aynı aile; yeni kural yok).
function duelEntry(game, dragonAssetId, { tradeLock, hold, duelLock, now }) {
  if (typeof dragonAssetId !== 'string' || !dragonAssetId || dragonAssetId.length > 200) fail('invalid_dragon_asset', 400);
  if (!game) fail('game_not_started');
  const dragon = game.dragons.find(d => d.assetId === dragonAssetId);
  if (!dragon) fail('dragon_not_owned', 403);
  if (dragon.dead || dragon.task || dragon.tradeLocked || dragon.busy) fail('dragon_busy');
  if (tradeLock && tradeLock.expiresAt > now && tradeLock.offer?.dragons?.includes(dragonAssetId)) fail('dragon_trade_reserved');
  if (hold && hold.dragons?.includes(dragonAssetId)) fail('dragon_market_listed');
  if (duelLock && duelLock.expiresAt > now) fail('duel_busy');
  return dragon;
}

// Aktif maç kilidi (guardReservation modeli): kilitli ejderha hesaptan çıkamaz, takas teklifine
// konamaz, Bedesten'e ilan edilemez. İçerik değişimi (yaş, evre) engellenmez; savaşçı başlangıçta
// fotoğraflandı. Kilidin süresi maç ömrüdür; süresi dolan maç ödül üretmez (void).
function guardDuelLock(game, lock, now, { offer = null, hold = null } = {}) {
  if (!lock || !(lock.expiresAt > now)) return;
  const id = lock.dragonAssetId;
  if (game && !game.dragons.some(d => d.assetId === id)) fail('duel_locked_asset');
  if (offer && offer.dragons?.includes(id)) fail('duel_locked_asset');
  if (hold && hold.dragons?.includes(id)) fail('duel_locked_asset');
}

// ---------- D-2: maç kaydı ve tohumlu RNG ----------
function newMatchId() { return 'dragon_' + crypto.randomBytes(10).toString('hex'); }
// Ekonomi VM'indeki HMAC deseni (economy_commands.js makeRuntime) ile aynı: seed + sayaç.
function seededRng(seed) {
  if (typeof seed !== 'string' || !/^[a-f0-9]{64}$/.test(seed)) fail('match_seed_invalid');
  const key = Buffer.from(seed, 'hex');
  let counter = 0;
  return () => crypto.createHmac('sha256', key).update(String(counter++)).digest().readUInt32BE() / 0x100000000;
}

// ctx: { now, matchId, seed, participants:[{accountId, handle, dragonAssetId}], games{id:game|null},
//        tradeLocks{id}, holds{id}, duelLocks{id}, cfg }
function prepareMatch(ctx) {
  const { now, matchId, seed, participants, cfg = DUEL } = ctx;
  if (!MATCH_ID.test(matchId || '')) fail('invalid_match_id', 400);
  seededRng(seed);
  if (!Array.isArray(participants) || participants.length !== 2) fail('invalid_participants', 400);
  const [a, b] = participants;
  if (!a.accountId || !b.accountId) fail('account_required', 401);
  // K9: kendi hesabına karşı ödüllü maç açılmaz.
  if (a.accountId === b.accountId) fail('same_account');
  const rows = participants.map(p => {
    const game = ctx.games[p.accountId];
    const dragon = duelEntry(game, p.dragonAssetId, { tradeLock: ctx.tradeLocks[p.accountId], hold: ctx.holds[p.accountId], duelLock: ctx.duelLocks[p.accountId], now });
    sources.ensure(clone(game));
    return { accountId: p.accountId, handle: String(p.handle || '').slice(0, 40), dragonAssetId: p.dragonAssetId,
      fighter: fighterFromLedger(game, dragon), dragon: clone(dragon) };
  });
  const expiresAt = now + cfg.matchTtlMs;
  const match = { schema: 1, id: matchId, kind: 'dragon_duel', ruleVersion: RULE_VERSION, seed, status: 'active',
    createdAt: now, expiresAt, participants: rows.map(({ dragon, ...p }) => p), result: null, finalAt: null };
  const locks = Object.fromEntries(rows.map(p => [p.accountId, { matchId, dragonAssetId: p.dragonAssetId, expiresAt }]));
  return { match, locks, dragons: rows.map(r => r.dragon) };
}

// Kayıt + tohum + hamle günlüğünden maçı yeniden üretir. Günlükteki her hamle o anda yasal olmalı.
function replayMatch(match) {
  const rng = seededRng(match.seed);
  const F = DuelEngine.createFight(match.participants[0].fighter, match.participants[1].fighter);
  const log = match.result ? match.result.log : [];
  for (const entry of log) {
    if (F.over || !entry || !Array.isArray(entry.actions) || entry.actions.length !== 2) fail('match_log_invalid');
    const [a1, a2] = entry.actions;
    if (entry.round !== F.round + 1 || !DuelEngine.isLegalAction(F.p, a1) || !DuelEngine.isLegalAction(F.e, a2)) fail('match_log_invalid');
    DuelEngine.resolveRound(F, a1, a2, rng);
  }
  return F;
}

// final: { log:[{round, actions:[p1Action, p2Action]}], forfeit: null | { accountId, reason:'leave'|'disconnect' } }
// Kazanan duel sunucusunun bellek durumundan DEĞİL, kayıtlı seed + günlüğün yeniden oynatılmasından çıkar.
function finalizeTransition(match, final, now) {
  if (!match) fail('match_not_found', 404);
  if (match.status !== 'active') fail('match_closed');
  if (!final || !Array.isArray(final.log) || final.log.length > 30) fail('match_log_invalid', 400);
  const log = final.log.map(e => ({ round: e?.round, actions: Array.isArray(e?.actions) ? e.actions.map(String) : null }));
  for (const e of log) if (!Number.isSafeInteger(e.round) || !e.actions || e.actions.length !== 2 || e.actions.some(a => !ACTION.test(a))) fail('match_log_invalid', 400);
  const next = clone(match);
  const ids = next.participants.map(p => p.accountId);
  next.finalAt = now;
  if (now >= match.expiresAt) {
    next.status = 'void';
    next.result = { reason: 'match_expired', log };
    return next;
  }
  next.result = { log };
  const F = replayMatch(next);
  let winner = null, endReason, forfeitBy = [];
  if (F.over) {
    if (final.forfeit) fail('match_log_invalid', 400);
    winner = F.winner === 'p' ? ids[0] : F.winner === 'e' ? ids[1] : null;
    if (F.draw) { endReason = 'draw_surrender'; forfeitBy = [...ids]; }
    else if (F.surrender) { endReason = 'surrender'; forfeitBy = [winner === ids[0] ? ids[1] : ids[0]]; }
    else endReason = F.timeout ? 'timeout' : 'ko';
  } else {
    const f = final.forfeit;
    if (!f || !ids.includes(f.accountId) || !['leave', 'disconnect'].includes(f.reason)) fail('match_not_over', 400);
    endReason = f.reason; forfeitBy = [f.accountId]; winner = ids.find(id => id !== f.accountId);
  }
  const playedRounds = log.filter(e => !e.actions.includes('teslim')).length;
  next.status = 'final';
  next.result = { log, winner, endReason, forfeitBy, rounds: F.round, playedRounds, finalHp: [Math.max(0, F.p.hp), Math.max(0, F.e.hp)] };
  return next;
}

// ---------- D-3: ödül politikası (K7 earned, K9 Sybil, K10 forfeit) ----------
const dayOf = ms => new Date(ms).toISOString().slice(0, 10); // UTC günü
function duelOutcome(match, accountId, cfg = DUEL) {
  const ids = match.participants.map(p => p.accountId);
  if (!ids.includes(accountId)) fail('match_not_participant', 403);
  if (match.status === 'void') return { outcome: 'void', amount: 0, reason: match.result?.reason || 'match_void' };
  if (match.status !== 'final') fail('match_not_final');
  if (ids.length !== 2 || ids[0] === ids[1]) return { outcome: 'none', amount: 0, reason: 'same_account' };
  const r = match.result;
  if (r.forfeitBy.includes(accountId)) return { outcome: 'forfeit', amount: 0, reason: 'forfeit_leaver' };
  if (r.winner === accountId) {
    if (r.forfeitBy.length && r.playedRounds < cfg.forfeitMinRounds) return { outcome: 'win', amount: 0, reason: 'forfeit_too_short' };
    return { outcome: 'win', amount: DUEL_REWARDS.win, reason: null };
  }
  if (r.winner == null) return { outcome: 'draw', amount: DUEL_REWARDS.draw, reason: null };
  return { outcome: 'loss', amount: DUEL_REWARDS.loss, reason: null };
}

function readDaily(row, accountId, day) {
  if (!row) return { schema: 1, accountId, day, total: 0, pairs: {} };
  if (row.schema !== 1 || row.day !== day || !Number.isSafeInteger(row.total) || !row.pairs) fail('gameplay_daily_invalid');
  return clone(row);
}
const dailyId = (accountId, day) => accountId + ':' + day;

// ctx: { match, accountId, game, version, daily(row|null), now, cfg }
// Dönen: { game|null (değiştiyse), version, daily|null (değiştiyse), result }. Hata atarsa depo hiçbir şey yazmaz.
function settleTransition(ctx) {
  const { match, accountId, now, cfg = DUEL } = ctx;
  if (!match) fail('match_not_found', 404);
  const base = duelOutcome(match, accountId, cfg);
  const day = dayOf(match.finalAt || now);
  const opponent = match.participants.map(p => p.accountId).find(id => id !== accountId) || null;
  let { amount, reason } = base, daily = null, game = null, version = ctx.version, paid = { paidDebt: 0, credited: 0 };
  if (amount > 0) {
    const current = readDaily(ctx.daily, accountId, day);
    if (current.total >= cfg.accountDailyLimit) { amount = 0; reason = 'daily_account_limit'; }
    else if ((current.pairs[opponent] || 0) >= cfg.pairDailyLimit) { amount = 0; reason = 'daily_pair_limit'; }
    else {
      if (!ctx.game) fail('game_not_started');
      game = sources.ensure(clone(ctx.game));
      // D4: borçlu hesap ödül alır ama kazanç önce borcu öder (economy_debt.receive, aynen).
      paid = debt.receive(game, amount, 'earned');
      if (!Number.isSafeInteger(game.gold) || game.gold > MAX_GOLD) fail('gold_limit');
      version = ctx.version + 1;
      current.total += 1; current.pairs[opponent] = (current.pairs[opponent] || 0) + 1;
      daily = current;
    }
  }
  const result = { eventId: match.id, accountId, kind: SETTLEMENT_KIND, matchStatus: match.status, outcome: base.outcome,
    status: amount > 0 ? 'paid' : 'no_reward', reason, amount, source: 'earned', paidDebt: paid.paidDebt, credited: paid.credited,
    appliedVersion: version, day, settledAt: now };
  return { game, version, daily, result };
}

module.exports = { SETTLEMENT_KIND, MATCH_ID, fighterFromLedger, duelEntry, guardDuelLock, newMatchId, seededRng, prepareMatch,
  replayMatch, finalizeTransition, duelOutcome, settleTransition, dayOf, dailyId };
