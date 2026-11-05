'use strict';
const crypto = require('node:crypto');
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
  async function executeCommand(accountId, input) {
    const { command, hash } = validateCommand(input);
    const seed = crypto.randomBytes(32); // Stable across SDK transaction retries.
    const accountRef = accounts.doc(accountId), receiptRef = accountRef.collection('commands').doc(command.requestId);
    return db.runTransaction(async tx => {
      const [account, receipt] = await tx.getAll(accountRef, receiptRef);
      if (!account.exists) fail('account_missing', 404);
      const record = account.data();
      if (receipt.exists) {
        const saved = receipt.data();
        if (saved.hash !== hash) fail('request_id_reused', 409);
        return { replayed: true, appliedVersion: saved.version, result: JSON.parse(saved.resultJson), economy: snapshot(accountId, record) };
      }
      if (record.version !== command.expectedVersion) fail('version_conflict', 409);
      const next = reduceCommand(record.gameJson ? JSON.parse(record.gameJson) : null, command, { accountId, seed });
      const version = record.version + 1;
      tx.update(accountRef, { version, gameJson: JSON.stringify(next.game) });
      tx.create(receiptRef, { hash, version, type: command.type, createdAt: now(), resultJson: JSON.stringify(next.result) });
      return { replayed: false, appliedVersion: version, result: next.result, economy: gameEconomy(accountId, version, next.game) };
    }, { maxAttempts: 5 });
  }
  return {
    backend: 'firestore', createGuest, resolveSession, readEconomy, executeCommand,
    async revokeSession(token) { if (typeof token === 'string') await sessions.doc(hashToken(token)).delete(); },
    async close() { await db.terminate(); },
  };
}
module.exports = { openFirestoreStore };
