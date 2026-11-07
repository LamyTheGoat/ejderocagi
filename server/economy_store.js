'use strict';

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const {digest,consume,invitationLimits,RETENTION_MS}=require('./service_security');
const { validateTrade, transition, guardReservation } = require('./trade_service');
const fs = require('node:fs');
const path = require('node:path');

const { validateCommand, reduceCommand, gameEconomy, fail } = require('./economy_commands');

const MAX_GOLD = 2_000_000_000;
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

// Only trusted server code may call transaction(). Never expose its operations
// as generic HTTP/WS commands or use client snapshots as their input.
function openEconomyStore(filename, { now = Date.now } = {}) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  let inTransaction = false;
  try {
    if (filename !== ':memory:') fs.chmodSync(filename, 0o600);
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version !== 0 && version !== 1) throw new Error('unsupported_economy_schema');
    if (version === 0) db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE accounts (
        account_id TEXT PRIMARY KEY,
        handle TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0)
      ) STRICT;
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(account_id),
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX sessions_account ON sessions(account_id);
      CREATE TABLE balances (
        account_id TEXT PRIMARY KEY REFERENCES accounts(account_id),
        gold INTEGER NOT NULL DEFAULT 0 CHECK(gold BETWEEN 0 AND ${MAX_GOLD})
      ) STRICT;
      CREATE TABLE assets (
        asset_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES accounts(account_id),
        kind TEXT NOT NULL CHECK(kind IN ('item', 'dragon', 'egg')),
        payload TEXT NOT NULL CHECK(json_valid(payload) AND json_type(payload) = 'object')
      ) STRICT;
      CREATE INDEX assets_owner_kind ON assets(owner_id, kind);
      PRAGMA user_version = 1;
      COMMIT;
    `);
  } catch (error) { db.close(); throw error; }

  db.exec(`CREATE TABLE IF NOT EXISTS game_states (account_id TEXT PRIMARY KEY REFERENCES accounts(account_id), version INTEGER NOT NULL, game_json TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS command_receipts (account_id TEXT NOT NULL REFERENCES accounts(account_id), request_id TEXT NOT NULL, hash TEXT NOT NULL, version INTEGER NOT NULL, result_json TEXT NOT NULL, PRIMARY KEY(account_id, request_id)) STRICT;`);

  db.exec("CREATE TABLE IF NOT EXISTS trade_records (id TEXT PRIMARY KEY, json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS trade_locks (id TEXT PRIMARY KEY, json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS trade_receipts (id TEXT PRIMARY KEY, json TEXT NOT NULL);");
  db.exec("CREATE TABLE IF NOT EXISTS trade_inbox (id TEXT PRIMARY KEY, json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS trade_due (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS trade_due_time ON trade_due(expires_at);");
  db.exec("INSERT OR IGNORE INTO trade_due SELECT id, json_extract(json, '$.expiresAt') FROM trade_records WHERE json_extract(json, '$.status') IN ('invited','active');");
  const readTradeRow = (table, id) => { const row = db.prepare('SELECT json FROM ' + table + ' WHERE id = ?').get(id); return row ? JSON.parse(row.json) : null; };
  const writeTradeRow = (table, id, value) => db.prepare('INSERT INTO ' + table + ' VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json=excluded.json').run(id, JSON.stringify(value));
  db.exec('CREATE TABLE IF NOT EXISTS service_state (id TEXT PRIMARY KEY, json TEXT NOT NULL)');
  function rateInTransaction(key,limit,windowMs) {
    const id='rate:'+digest(key);writeTradeRow('service_state',id,consume(readTradeRow('service_state',id),limit,windowMs,now()));
  }
  function consumeRate(key,limit,windowMs) { return atomic(()=>rateInTransaction(key,limit,windowMs)); }
  function publishPresence(id,identity) { return atomic(()=>writeTradeRow('service_state','presence:'+id,identity?{accountId:identity.accountId,handle:identity.handle,expiresAt:now()+90000}:null)); }
  function listPeers(actor) {
    const peers=new Map();
    for(const row of db.prepare("SELECT json FROM service_state WHERE id LIKE 'presence:%'").all()) {
      const p=JSON.parse(row.json);if(p&&p.expiresAt>now()&&p.accountId!==actor)peers.set(p.accountId,{accountId:p.accountId,handle:p.handle});
    }
    return [...peers.values()].slice(0,200);
  }
  function pruneServiceState(limit=50) {
    return atomic(()=>db.prepare("DELETE FROM service_state WHERE id IN (SELECT id FROM service_state WHERE json='null' OR coalesce(json_extract(json,'$.expiresAt'),json_extract(json,'$.until'))<=? LIMIT ?)").run(now(),limit).changes);
  }
  function compactTradeReceipts(limit=50) {
    return atomic(()=>{
      const rows=db.prepare("SELECT id,json FROM trade_receipts WHERE json_extract(json,'$.createdAt')<=? AND json_extract(json,'$.result') IS NOT NULL LIMIT ?").all(now()-RETENTION_MS,limit);
      let count=0;for(const row of rows){const r=JSON.parse(row.json),trade=readTradeRow('trade_records',r.result.trade.id);
        if(trade&&!['active','invited'].includes(trade.status)){writeTradeRow('trade_receipts',row.id,{hash:r.hash,tradeId:trade.id,createdAt:r.createdAt,compactedAt:now()});count++;}}
      return count;
    });
  }
  function executeTrade(actor, input) {
    const { command, hash } = validateTrade(input);
    return atomic(() => {
      const receiptId = actor + ':' + command.requestId;
      const receipt = readTradeRow('trade_receipts', receiptId);
      if (receipt) { if (receipt.hash !== hash) fail('request_id_reused', 409); return { ...(receipt.result || {trade:readTradeRow('trade_records',receipt.tradeId)}), replayed: true }; }
      const id = command.type === 'invite' ? command.requestId : command.tradeId;
      const trade = readTradeRow('trade_records', id);
      if (command.type !== 'invite' && (!trade || !trade.participants.includes(actor))) fail('trade_not_found', 404);
      const ids = command.type === 'invite' ? [actor, command.targetId] : trade.participants;
      const games = {}, locks = {}, versions = {};
      for (const p of ids) {
        const row = db.prepare('SELECT version, game_json FROM game_states WHERE account_id = ?').get(p);
        games[p] = row ? { version: row.version, game: JSON.parse(row.game_json) } : null;
        versions[p] = row?.version;
        locks[p] = readTradeRow('trade_locks', p);
      }
      const cooldownKey='cooldown:'+actor+':'+command.targetId;
      if(command.type==='invite' && readTradeRow('service_state',cooldownKey)?.until>now())fail('invitation_cooldown',429);
      if(command.type==='invite')for(const r of invitationLimits(actor,command.targetId))rateInTransaction(r.key,r.limit,r.windowMs);
      const next = transition(actor, command, trade, games, locks, now());
      if(command.type==='reject' && next.status==='rejected')writeTradeRow('service_state','cooldown:'+next.participants[0]+':'+actor,{until:now()+300000});
      for (const p of ids) {
        if (games[p] && games[p].version !== versions[p]) db.prepare('UPDATE game_states SET version=?, game_json=? WHERE account_id=?').run(games[p].version, JSON.stringify(games[p].game), p);
        writeTradeRow('trade_locks', p, locks[p]);
      }
      writeTradeRow('trade_records', id, next);
      if (['invited', 'active'].includes(next.status)) db.prepare('INSERT INTO trade_due VALUES (?,?) ON CONFLICT(id) DO UPDATE SET expires_at=excluded.expires_at').run(id,next.expiresAt);
      else db.prepare('DELETE FROM trade_due WHERE id=?').run(id);
      if (command.type === 'invite') for (const p of ids) writeTradeRow('trade_inbox',p,{tradeId:id});
      const result = { trade: next, replayed: false };
      if (command.type !== 'get') writeTradeRow('trade_receipts', receiptId, { hash, result, createdAt:now() });
      return result;
    });
  }

  function currentTrade(actor) {
    const pointer = readTradeRow('trade_locks',actor) || readTradeRow('trade_inbox',actor);
    return pointer ? executeTrade(actor,{type:'get',requestId:crypto.randomUUID(),tradeId:pointer.tradeId}).trade : null;
  }
  function expireTrades(limit = 50) {
    const rows=db.prepare('SELECT id FROM trade_due WHERE expires_at<=? ORDER BY expires_at LIMIT ?').all(now(),limit);
    for(const row of rows) { const t=readTradeRow('trade_records',row.id); if(t) executeTrade(t.participants[0],{type:'get',requestId:crypto.randomUUID(),tradeId:t.id}); }
    return rows.length;
  }
  function atomic(fn, mode = 'IMMEDIATE') {
    if (inTransaction) throw new Error('nested_transaction');
    inTransaction = true;
    try {
      db.exec(`BEGIN ${mode}`);
      const result = fn();
      if (result && typeof result.then === 'function') throw new Error('async_transaction_not_allowed');
      db.exec('COMMIT');
      return result;
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw error;
    } finally { inTransaction = false; }
  }

  function transaction(fn) {
    if (typeof fn !== 'function' || fn.constructor.name === 'AsyncFunction') throw new Error('sync_transaction_required');
    return atomic(() => {
      let active = true;
      const checkActive = () => { if (!active) throw new Error('transaction_closed'); };
      const touch = id => {
        if (db.prepare('SELECT 1 FROM game_states WHERE account_id = ?').get(id)) throw new Error('use_game_commands');
        if (db.prepare('UPDATE accounts SET version = version + 1 WHERE account_id = ?').run(id).changes !== 1) throw new Error('account_missing');
      };
      const tx = Object.freeze({
        adjustGold(accountId, delta) {
          checkActive();
          if (!Number.isSafeInteger(delta) || Math.abs(delta) > MAX_GOLD) throw new Error('invalid_gold_delta');
          const result = db.prepare('UPDATE balances SET gold = gold + ? WHERE account_id = ? AND gold + ? BETWEEN 0 AND ?').run(delta, accountId, delta, MAX_GOLD);
          if (result.changes !== 1) throw new Error('invalid_balance');
          touch(accountId);
        },
        createAsset(accountId, kind, payload) {
          checkActive();
          if (!['item', 'dragon', 'egg'].includes(kind) || !payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid_asset');
          const data = JSON.stringify(payload);
          if (Buffer.byteLength(data) > 64 * 1024) throw new Error('asset_too_large');
          const assetId = crypto.randomUUID();
          db.prepare('INSERT INTO assets(asset_id, owner_id, kind, payload) VALUES (?, ?, ?, ?)').run(assetId, accountId, kind, data);
          touch(accountId);
          return assetId;
        },
        moveAsset(assetId, fromAccountId, toAccountId) {
          checkActive();
          if (fromAccountId === toAccountId) throw new Error('same_owner');
          const result = db.prepare('UPDATE assets SET owner_id = ? WHERE asset_id = ? AND owner_id = ?').run(toAccountId, assetId, fromAccountId);
          if (result.changes !== 1) throw new Error('asset_not_owned');
          touch(fromAccountId);
          touch(toAccountId);
        },
      });
      try { return fn(tx); } finally { active = false; }
    });
  }

  function createGuest() {
    return atomic(() => {
      const accountId = crypto.randomUUID();
      const handle = '@gezgin_' + crypto.randomBytes(6).toString('hex');
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = now() + SESSION_TTL_MS;
      db.prepare('INSERT INTO accounts(account_id, handle, created_at) VALUES (?, ?, ?)').run(accountId, handle, now());
      db.prepare('INSERT INTO balances(account_id) VALUES (?)').run(accountId);
      db.prepare('INSERT INTO sessions(token_hash, account_id, expires_at) VALUES (?, ?, ?)').run(hashToken(token), accountId, expiresAt);
      return { accountId, handle, token, expiresAt };
    });
  }

  function resolveSession(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const row = db.prepare(`SELECT a.account_id AS accountId, a.handle, s.expires_at AS expiresAt
      FROM sessions s JOIN accounts a ON a.account_id = s.account_id
      WHERE s.token_hash = ? AND s.expires_at > ?`).get(hashToken(token), now());
    return row ? { ...row } : null;
  }

  function readEconomy(accountId) {
    return atomic(() => {
      const state = db.prepare('SELECT version, game_json FROM game_states WHERE account_id = ?').get(accountId);
      if (state) return gameEconomy(accountId, state.version, JSON.parse(state.game_json));
      const row = db.prepare(`SELECT a.account_id AS accountId, a.version, b.gold
        FROM accounts a JOIN balances b ON b.account_id = a.account_id WHERE a.account_id = ?`).get(accountId);
      if (!row) return null;
      const assets = db.prepare('SELECT asset_id, kind, payload FROM assets WHERE owner_id = ? ORDER BY asset_id').all(accountId);
      const snapshot = { ...row, items: [], dragons: [], eggs: [] };
      for (const asset of assets) {
        const key = { item: 'items', dragon: 'dragons', egg: 'eggs' }[asset.kind];
        snapshot[key].push({ assetId: asset.asset_id, data: JSON.parse(asset.payload) });
      }
      return snapshot;
    }, 'DEFERRED');
  }

  function executeCommand(accountId, input) {
    const { command, hash } = validateCommand(input);
    const seed = crypto.randomBytes(32);
    return atomic(() => {
      const account = db.prepare('SELECT version FROM accounts WHERE account_id = ?').get(accountId);
      if (!account) fail('account_missing', 404);
      const state = db.prepare('SELECT version, game_json FROM game_states WHERE account_id = ?').get(accountId);
      const receipt = db.prepare('SELECT * FROM command_receipts WHERE account_id = ? AND request_id = ?').get(accountId, command.requestId);
      if (receipt) {
        if (receipt.hash !== hash) fail('request_id_reused', 409);
        return { replayed: true, appliedVersion: receipt.version, result: JSON.parse(receipt.result_json), economy: gameEconomy(accountId, state.version, JSON.parse(state.game_json)) };
      }
      const version = state ? state.version : account.version;
      if (version !== command.expectedVersion) fail('version_conflict', 409);
      // Phase-one developer fixtures are not imported into authoritative games.
      const next = reduceCommand(state ? JSON.parse(state.game_json) : null, command, { accountId, seed, now: now() }); // Sunucu saati; istemci zamanı yok.
      guardReservation(state ? JSON.parse(state.game_json) : null, next.game, readTradeRow('trade_locks', accountId), now());
      db.prepare('INSERT INTO game_states VALUES (?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET version=excluded.version, game_json=excluded.game_json').run(accountId, version + 1, JSON.stringify(next.game));
      db.prepare('INSERT INTO command_receipts VALUES (?, ?, ?, ?, ?)').run(accountId, command.requestId, hash, version + 1, JSON.stringify(next.result));
      return { replayed: false, appliedVersion: version + 1, result: next.result, economy: gameEconomy(accountId, version + 1, next.game) };
    });
  }

  return Object.freeze({
    backend: 'sqlite', pruneServiceState, consumeRate, publishPresence, listPeers, compactTradeReceipts, createGuest, resolveSession, readEconomy, transaction, executeCommand, executeTrade, currentTrade, expireTrades,
    revokeSession(token) { if (typeof token === 'string') db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token)); },
    close() { db.close(); },
  });
}

module.exports = { openEconomyStore, SESSION_TTL_MS };
