'use strict';
const crypto = require('node:crypto');
const { validateTrade, transition, guardReservation } = require('./trade_service');
const { validateCommand, reduceCommand, gameEconomy, fail } = require('./economy_commands');
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

function openFirestoreStore({ projectId, databaseId = 'economy', client, now = Date.now } = {}) {
  // Application Default Credentials use the Cloud Run service identity. No key file.
  const db = client || new (require('@google-cloud/firestore').Firestore)({ projectId, databaseId });
  const accounts = db.collection('eo_accounts'), sessions = db.collection('eo_sessions');
  async function createGuest() {
    const accountId = crypto.randomUUID(), handle = '@gezgin_' + crypto.randomBytes(6).toString('hex');
    const token = crypto.randomBytes(32).toString('base64url'), expiresAt = now() + SESSION_TTL_MS;
    const batch = db.batch();
    batch.create(accounts.doc(accountId), { accountId, handle, createdAt: now(), version: 0, gameJson: null });
    batch.create(sessions.doc(hashToken(token)), { accountId, handle, expiresAt });
    await batch.commit();
    return { accountId, handle, token, expiresAt };
  }
  async function resolveSession(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const doc = await sessions.doc(hashToken(token)).get();
    if (!doc.exists) return null;
    const session = doc.data();
    return session.expiresAt > now() ? session : null;
  }
  function snapshot(accountId, record) {
    if (!record.gameJson) return { accountId, version: record.version, gold: 0, items: [], dragons: [], eggs: [], stones: {}, ores: {} };
    return gameEconomy(accountId, record.version, JSON.parse(record.gameJson));
  }
  async function readEconomy(accountId) {
    const doc = await accounts.doc(accountId).get();
    return doc.exists ? snapshot(accountId, doc.data()) : null;
  }
  const inbox = db.collection('eo_trade_inbox');
  const trades = db.collection('eo_trades'), locks = db.collection('eo_trade_locks'), receipts = db.collection('eo_trade_receipts');
  async function executeTrade(actor, input) {
    const { command, hash } = validateTrade(input);
    const id = command.type === 'invite' ? command.requestId : command.tradeId;
    const receiptRef = receipts.doc(actor + ':' + command.requestId), tradeRef = trades.doc(id);
    return db.runTransaction(async tx => {
      const [saved, tradeDoc] = await tx.getAll(receiptRef, tradeRef);
      if (saved.exists) { const receipt = saved.data(); if (receipt.hash !== hash) fail('request_id_reused', 409); return { ...JSON.parse(receipt.resultJson), replayed: true }; }
      const trade = tradeDoc.exists ? JSON.parse(tradeDoc.data().json) : null;
      if (command.type !== 'invite' && (!trade || !trade.participants.includes(actor))) fail('trade_not_found', 404);
      const ids = command.type === 'invite' ? [actor, command.targetId] : trade.participants;
      const docs = await tx.getAll(...ids.map(p => accounts.doc(p)), ...ids.map(p => locks.doc(p)));
      const games = {}, reservations = {}, versions = {};
      ids.forEach((p, i) => {
        const record = docs[i].exists ? docs[i].data() : null;
        games[p] = record?.gameJson ? { version: record.version, game: JSON.parse(record.gameJson) } : null;
        versions[p] = record?.version;
        reservations[p] = docs[i + ids.length].exists ? JSON.parse(docs[i + ids.length].data().json) : null;
      });
      const next = transition(actor, command, trade, games, reservations, now());
      ids.forEach(p => {
        if (games[p] && games[p].version !== versions[p]) tx.update(accounts.doc(p), { version: games[p].version, gameJson: JSON.stringify(games[p].game) });
        tx.set(locks.doc(p), { json: JSON.stringify(reservations[p]) });
      });
      tx.set(tradeRef, { json: JSON.stringify(next), expiresAt: ['invited','active'].includes(next.status) ? next.expiresAt : null });
      if(command.type === 'invite') ids.forEach(p => tx.set(inbox.doc(p),{tradeId:id}));
      const result = { trade: next, replayed: false };
      if (command.type !== 'get') tx.create(receiptRef, { hash, resultJson: JSON.stringify(result) });
      return result;
    }, { maxAttempts: 5 });
  }
  async function currentTrade(actor) {
    const [lock, last]=await db.getAll(locks.doc(actor),inbox.doc(actor));
    const pointer=(lock.exists && JSON.parse(lock.data().json)) || (last.exists && last.data());
    return pointer ? (await executeTrade(actor,{type:'get',requestId:crypto.randomUUID(),tradeId:pointer.tradeId})).trade : null;
  }
  async function expireTrades(limit = 50) {
    const due=await trades.where('expiresAt','<=',now()).orderBy('expiresAt').limit(limit).get();
    for(const doc of due.docs) { const t=JSON.parse(doc.data().json); await executeTrade(t.participants[0],{type:'get',requestId:crypto.randomUUID(),tradeId:t.id}); }
    return due.size;
  }
  // Bounded startup backfill for P2 records whose expiry lived only inside JSON.
  async function migrateTradeExpiry(after = null, limit = 50) {
    let query=trades.orderBy('__name__').limit(limit); if(after) query=query.startAfter(after);
    const page=await query.get();
    for(const doc of page.docs) if(doc.data().expiresAt === undefined) {
      await db.runTransaction(async tx => { const latest=await tx.get(doc.ref); if(!latest.exists || latest.data().expiresAt !== undefined)return;
        const t=JSON.parse(latest.data().json);tx.update(doc.ref,{expiresAt:['invited','active'].includes(t.status)?t.expiresAt:null}); });
    }
    return page.size===limit?page.docs.at(-1).id:null;
  }
  async function executeCommand(accountId, input) {
    const { command, hash } = validateCommand(input);
    const seed = crypto.randomBytes(32); // Stable across SDK transaction retries.
    const accountRef = accounts.doc(accountId), receiptRef = accountRef.collection('commands').doc(command.requestId);
    return db.runTransaction(async tx => {
      const [account, receipt, reservation] = await tx.getAll(accountRef, receiptRef, locks.doc(accountId));
      if (!account.exists) fail('account_missing', 404);
      const record = account.data();
      if (receipt.exists) {
        const saved = receipt.data();
        if (saved.hash !== hash) fail('request_id_reused', 409);
        return { replayed: true, appliedVersion: saved.version, result: JSON.parse(saved.resultJson), economy: snapshot(accountId, record) };
      }
      if (record.version !== command.expectedVersion) fail('version_conflict', 409);
      const next = reduceCommand(record.gameJson ? JSON.parse(record.gameJson) : null, command, { accountId, seed });
      guardReservation(record.gameJson ? JSON.parse(record.gameJson) : null, next.game, reservation.exists ? JSON.parse(reservation.data().json) : null, now());
      const version = record.version + 1;
      tx.update(accountRef, { version, gameJson: JSON.stringify(next.game) });
      tx.create(receiptRef, { hash, version, type: command.type, createdAt: now(), resultJson: JSON.stringify(next.result) });
      return { replayed: false, appliedVersion: version, result: next.result, economy: gameEconomy(accountId, version, next.game) };
    }, { maxAttempts: 5 });
  }
  return {
    backend: 'firestore', createGuest, resolveSession, readEconomy, executeCommand, executeTrade, currentTrade, expireTrades, migrateTradeExpiry,
    async revokeSession(token) { if (typeof token === 'string') await sessions.doc(hashToken(token)).delete(); },
    async close() { await db.terminate(); },
  };
}
module.exports = { openFirestoreStore };
