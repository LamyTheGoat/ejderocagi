'use strict';
const crypto = require('node:crypto');
const {digest,consume,invitationLimits,RETENTION_MS}=require('./service_security');
const { validateTrade, transition, guardReservation } = require('./trade_service');
const market = require('./market_service');
const duel = require('./duel_service');
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
  const security=db.collection('eo_service_state');
  // ENG-07 Bedesten.
  const listings = db.collection('eo_market_listings'), holds = db.collection('eo_market_holds'), marketReceipts = db.collection('eo_market_receipts');
  const parseHold = doc => (doc.exists ? JSON.parse(doc.data().json) : null);
  // ENG06 P-D düello: maç kaydı, hesap başı aktif maç kilidi, günlük ödül sayacı. Settlement: eo_accounts/{id}/settlements.
  const matches = db.collection('eo_matches'), duelLocks = db.collection('eo_duel_locks'), daily = db.collection('eo_gameplay_daily');
  async function consumeRate(key,limit,windowMs) {
    const ref=security.doc('rate:'+digest(key));
    return db.runTransaction(async tx=>{const doc=await tx.get(ref);const next=consume(doc.exists?doc.data():null,limit,windowMs,now());tx.set(ref,{...next,kind:'rate',expiresAt:next.until});});
  }
  async function publishPresence(id,identity) {
    const ref=security.doc('presence:'+id);
    if(!identity)return ref.delete();
    return ref.set({kind:'presence',accountId:identity.accountId,handle:identity.handle,expiresAt:now()+90000});
  }
  async function listPeers(actor) {
    const docs=await security.where('kind','==','presence').where('expiresAt','>',now()).limit(400).get();
    const peers=new Map();for(const doc of docs.docs){const p=doc.data();if(p.accountId!==actor)peers.set(p.accountId,{accountId:p.accountId,handle:p.handle});}
    return [...peers.values()].slice(0,200);
  }
  async function pruneServiceState(limit=50) {
    const page=await security.where('expiresAt','<=',now()).limit(limit).get();let count=0;
    for(const doc of page.docs) count+=await db.runTransaction(async tx=>{const latest=await tx.get(doc.ref);if(latest.exists&&latest.data().expiresAt<=now()){tx.delete(doc.ref);return 1;}return 0;});
    return count;
  }
  async function compactTradeReceipts(limit=50) {
    const page=await receipts.where('compactAfter','<=',now()).limit(limit).get();let count=0;
    for(const doc of page.docs) {
      count+=await db.runTransaction(async tx=>{
        const latest=await tx.get(doc.ref),r=latest.data();if(!r?.resultJson)return 0;
        const tradeId=JSON.parse(r.resultJson).trade.id,t=await tx.get(trades.doc(tradeId));
        if(!t.exists||['active','invited'].includes(JSON.parse(t.data().json).status))return 0;
        tx.set(doc.ref,{hash:r.hash,tradeId,createdAt:r.createdAt,compactedAt:now(),compactAfter:null});return 1;
      });
    }return count;
  }
  async function executeTrade(actor, input) {
    const { command, hash } = validateTrade(input);
    const id = command.type === 'invite' ? command.requestId : command.tradeId;
    const receiptRef = receipts.doc(actor + ':' + command.requestId), tradeRef = trades.doc(id);
    return db.runTransaction(async tx => {
      const [saved, tradeDoc] = await tx.getAll(receiptRef, tradeRef);
      if (saved.exists) { const receipt = saved.data(); if (receipt.hash !== hash) fail('request_id_reused', 409); const result=receipt.resultJson?JSON.parse(receipt.resultJson):{trade:JSON.parse((await tx.get(trades.doc(receipt.tradeId))).data().json)}; return { ...result, replayed: true }; }
      const trade = tradeDoc.exists ? JSON.parse(tradeDoc.data().json) : null;
      if (command.type !== 'invite' && (!trade || !trade.participants.includes(actor))) fail('trade_not_found', 404);
      const ids = command.type === 'invite' ? [actor, command.targetId] : trade.participants;
      const docs = await tx.getAll(...ids.map(p => accounts.doc(p)), ...ids.map(p => locks.doc(p)), ...ids.map(p => holds.doc(p)), ...ids.map(p => duelLocks.doc(p)));
      const games = {}, reservations = {}, versions = {};
      ids.forEach((p, i) => {
        const record = docs[i].exists ? docs[i].data() : null;
        games[p] = record?.gameJson ? { version: record.version, game: JSON.parse(record.gameJson) } : null;
        versions[p] = record?.version;
        reservations[p] = docs[i + ids.length].exists ? JSON.parse(docs[i + ids.length].data().json) : null;
      });
      const cooldown=command.type==='invite'?await tx.get(security.doc('cooldown:'+actor+':'+command.targetId)):null;
      if(cooldown?.exists&&cooldown.data().expiresAt>now())fail('invitation_cooldown',429);
      const rates=command.type==='invite'?invitationLimits(actor,command.targetId):[];
      const rateDocs=rates.length?await tx.getAll(...rates.map(r=>security.doc('rate:'+digest(r.key)))):[];
      const nextRates=rates.map((r,i)=>consume(rateDocs[i].exists?rateDocs[i].data():null,r.limit,r.windowMs,now()));
      const next = transition(actor, command, trade, games, reservations, now());
      market.guardTradeAgainstHolds(next, games, Object.fromEntries(ids.map((p, i) => [p, parseHold(docs[i + 2 * ids.length])])));
      ids.forEach((p, i) => duel.guardDuelLock(games[p]?.game, parseHold(docs[i + 3 * ids.length]), now(), { offer: next.status === 'active' ? next.offers[p] : null }));
      if(command.type==='reject'&&next.status==='rejected')tx.set(security.doc('cooldown:'+next.participants[0]+':'+actor),{kind:'cooldown',expiresAt:now()+300000});
      rates.forEach((r,i)=>tx.set(rateDocs[i].ref,{...nextRates[i],kind:'rate',expiresAt:nextRates[i].until}));
      ids.forEach(p => {
        if (games[p] && games[p].version !== versions[p]) tx.update(accounts.doc(p), { version: games[p].version, gameJson: JSON.stringify(games[p].game) });
        tx.set(locks.doc(p), { json: JSON.stringify(reservations[p]) });
      });
      tx.set(tradeRef, { json: JSON.stringify(next), expiresAt: ['invited','active'].includes(next.status) ? next.expiresAt : null });
      if(command.type === 'invite') ids.forEach(p => tx.set(inbox.doc(p),{tradeId:id}));
      const result = { trade: next, replayed: false };
      if (command.type !== 'get') tx.create(receiptRef, { hash, resultJson: JSON.stringify(result), createdAt:now(), compactAfter:now()+RETENTION_MS });
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
  // ENG-07: ilan/iptal/satın alma; ilan, iki hesap, iki rezervasyon ve makbuz tek runTransaction'da.
  async function executeMarket(actor, input) {
    const { command, hash } = market.validateMarket(input);
    const listingId = command.op === 'list' ? market.listingIdFor(actor, command.requestId) : command.listingId;
    const receiptRef = marketReceipts.doc(actor + ':' + command.requestId), listingRef = listings.doc(listingId);
    return db.runTransaction(async tx => {
      const [saved, listingDoc] = await tx.getAll(receiptRef, listingRef);
      if (saved.exists) { const receipt = saved.data(); if (receipt.hash !== hash) fail('request_id_reused', 409); return { ...JSON.parse(receipt.resultJson), replayed: true }; }
      const listing = listingDoc.exists ? JSON.parse(listingDoc.data().json) : null;
      const ids = command.op === 'buy' && listing && listing.sellerId !== actor ? [actor, listing.sellerId] : [actor];
      const docs = await tx.getAll(...ids.map(p => accounts.doc(p)), ...ids.map(p => locks.doc(p)), ...ids.map(p => holds.doc(p)), ...ids.map(p => duelLocks.doc(p)));
      const games = {}, versions = {}, handles = {}, tradeLocks = {}, current = {};
      ids.forEach((p, i) => {
        const record = docs[i].exists ? docs[i].data() : null;
        games[p] = record?.gameJson ? { version: record.version, game: JSON.parse(record.gameJson) } : null;
        versions[p] = record?.version; handles[p] = record?.handle || null;
        tradeLocks[p] = docs[i + ids.length].exists ? JSON.parse(docs[i + ids.length].data().json) : null;
        current[p] = parseHold(docs[i + 2 * ids.length]);
      });
      const out = market.marketTransition(actor, command, { now: now(), listingId, listing, games, handles, tradeLocks, holds: current });
      ids.forEach((p, i) => duel.guardDuelLock(out.games[p]?.game, parseHold(docs[i + 3 * ids.length]), now(), { hold: out.holds[p] }));
      ids.forEach(p => {
        const g = out.games[p];
        if (g && g.version !== versions[p]) tx.update(accounts.doc(p), { version: g.version, gameJson: JSON.stringify(g.game) });
        tx.set(holds.doc(p), { json: JSON.stringify(out.holds[p]) });
      });
      const l = out.listing;
      tx.set(listingRef, { json: JSON.stringify(l), status: l.status, sellerId: l.sellerId, createdAt: l.createdAt });
      const result = { ...out.result, replayed: false };
      tx.create(receiptRef, { hash, resultJson: JSON.stringify(result), createdAt: now() });
      return result;
    }, { maxAttempts: 5 });
  }
  // ENG-09 Y-1: ham (sunucu içi) ilanlar; yanıta yalnız publicListing ile çevrilerek çıkar.
  async function listMarketRaw(actor, { open: withOpen = true } = {}) {
    const [open, mine] = await Promise.all([
      withOpen ? listings.where('status', '==', 'open').orderBy('createdAt', 'desc').limit(market.LIMITS.publicPage).get() : null,
      actor ? listings.where('sellerId', '==', actor).orderBy('createdAt', 'desc').limit(market.LIMITS.minePage).get() : null,
    ]);
    const raw = snap => (snap ? snap.docs.map(d => JSON.parse(d.data().json)) : []);
    return { open: raw(open), mine: raw(mine) };
  }
  async function listMarket(actor) {
    const raw = await listMarketRaw(actor);
    return { listings: raw.open.map(l => market.publicListing(l, actor)), mine: raw.mine.map(l => market.publicListing(l, actor)) };
  }
  async function executeCommand(accountId, input) {
    const { command, hash } = validateCommand(input);
    const seed = crypto.randomBytes(32); // Stable across SDK transaction retries.
    const accountRef = accounts.doc(accountId), receiptRef = accountRef.collection('commands').doc(command.requestId);
    return db.runTransaction(async tx => {
      const [account, receipt, reservation, hold, duelLock] = await tx.getAll(accountRef, receiptRef, locks.doc(accountId), holds.doc(accountId), duelLocks.doc(accountId));
      if (!account.exists) fail('account_missing', 404);
      const record = account.data();
      if (receipt.exists) {
        const saved = receipt.data();
        if (saved.hash !== hash) fail('request_id_reused', 409);
        return { replayed: true, appliedVersion: saved.version, result: JSON.parse(saved.resultJson), economy: snapshot(accountId, record) };
      }
      if (record.version !== command.expectedVersion) fail('version_conflict', 409);
      const next = reduceCommand(record.gameJson ? JSON.parse(record.gameJson) : null, command, { accountId, seed, now: now() }); // Sunucu saati; istemci zamanı yok.
      guardReservation(record.gameJson ? JSON.parse(record.gameJson) : null, next.game, reservation.exists ? JSON.parse(reservation.data().json) : null, now());
      const heldNow = parseHold(hold);
      market.guardMarketHold(next.game, heldNow);
      duel.guardDuelLock(next.game, parseHold(duelLock), now());
      // ENG-10 (O-7): ilan önizlemesi aynı transaction'da tazelenir (tüm okumalar yazmalardan önce).
      const listingIds = heldNow?.listings?.length ? heldNow.listings : [];
      const listed = listingIds.length ? (await tx.getAll(...listingIds.map(id => listings.doc(id)))).filter(d => d.exists).map(d => JSON.parse(d.data().json)) : [];
      const refreshed = market.refreshListings(listed, next.game, now());
      const version = record.version + 1;
      tx.update(accountRef, { version, gameJson: JSON.stringify(next.game) });
      for (const l of refreshed) tx.update(listings.doc(l.id), { json: JSON.stringify(l) });
      tx.create(receiptRef, { hash, version, type: command.type, createdAt: now(), resultJson: JSON.stringify(next.result) });
      return { replayed: false, appliedVersion: version, result: next.result, economy: gameEconomy(accountId, version, next.game), listingsRefreshed: refreshed.length };
    }, { maxAttempts: 5 });
  }
  // ENG06 P-D · Düello. Yalnız sunucu içi (js/duel_server.js) çağırır; HTTP/WS komutu olarak açılmaz.
  const gameOf = doc => (doc.exists && doc.data().gameJson ? JSON.parse(doc.data().gameJson) : null);
  const matchOf = doc => (doc.exists ? JSON.parse(doc.data().json) : null);
  const matchDoc = m => ({ json: JSON.stringify(m), status: m.status, createdAt: m.createdAt, expiresAt: m.expiresAt });
  async function checkDuelEntry(accountId, dragonAssetId) {
    const [account, lock, hold, duelLock] = await db.getAll(accounts.doc(accountId), locks.doc(accountId), holds.doc(accountId), duelLocks.doc(accountId));
    const dragon = duel.duelEntry(gameOf(account), dragonAssetId, { tradeLock: parseHold(lock), hold: parseHold(hold), duelLock: parseHold(duelLock), now: now() });
    return { ok: true, dragon: JSON.parse(JSON.stringify(dragon)) };
  }
  async function openMatch(input) {
    const ids = (input.participants || []).map(p => p.accountId);
    if (ids.length !== 2 || ids.some(id => typeof id !== 'string' || !id)) fail('invalid_participants', 400);
    if (!duel.MATCH_ID.test(input.matchId || '')) fail('invalid_match_id', 400);
    const matchRef = matches.doc(input.matchId);
    return db.runTransaction(async tx => {
      const docs = await tx.getAll(matchRef, ...ids.map(p => accounts.doc(p)), ...ids.map(p => locks.doc(p)), ...ids.map(p => holds.doc(p)), ...ids.map(p => duelLocks.doc(p)));
      if (docs[0].exists) fail('match_id_used');
      const pick = offset => Object.fromEntries(ids.map((id, i) => [id, offset === 0 ? gameOf(docs[1 + i]) : parseHold(docs[1 + offset * ids.length + i])]));
      const out = duel.prepareMatch({ ...input, now: now(), games: pick(0), tradeLocks: pick(1), holds: pick(2), duelLocks: pick(3) });
      tx.create(matchRef, matchDoc(out.match));
      for (const [id, lock] of Object.entries(out.locks)) tx.set(duelLocks.doc(id), { json: JSON.stringify(lock) });
      return { match: out.match, dragons: out.dragons };
    }, { maxAttempts: 5 });
  }
  async function finalizeMatch(matchId, final) {
    if (!duel.MATCH_ID.test(matchId || '')) fail('invalid_match_id', 400);
    const matchRef = matches.doc(matchId);
    return db.runTransaction(async tx => {
      const current = matchOf(await tx.get(matchRef));
      const next = duel.finalizeTransition(current, final, now());
      const lockDocs = await tx.getAll(...next.participants.map(p => duelLocks.doc(p.accountId)));
      tx.set(matchRef, matchDoc(next));
      lockDocs.forEach((doc, i) => { if (parseHold(doc)?.matchId === matchId) tx.set(duelLocks.doc(next.participants[i].accountId), { json: 'null' }); });
      return next;
    }, { maxAttempts: 5 });
  }
  async function settleGameplay(accountId, { eventId, kind } = {}) {
    if (kind !== duel.SETTLEMENT_KIND || !duel.MATCH_ID.test(eventId || '')) fail('invalid_settlement', 400);
    const accountRef = accounts.doc(accountId), settlementRef = accountRef.collection('settlements').doc(eventId + ':' + kind);
    return db.runTransaction(async tx => {
      const [saved, matchSnap, account, lock, hold, duelLock] = await tx.getAll(settlementRef, matches.doc(eventId), accountRef, locks.doc(accountId), holds.doc(accountId), duelLocks.doc(accountId));
      if (saved.exists) return { replayed: true, result: JSON.parse(saved.data().resultJson) };
      if (!account.exists) fail('account_missing', 404);
      const match = matchOf(matchSnap), record = account.data(), game = gameOf(account);
      const dailyRef = daily.doc(duel.dailyId(accountId, duel.dayOf(match?.finalAt || now())));
      const dailyDoc = await tx.get(dailyRef);
      const out = duel.settleTransition({ match, accountId, game, version: record.version, daily: parseHold(dailyDoc), now: now() });
      if (out.game) {
        guardReservation(game, out.game, parseHold(lock), now());
        market.guardMarketHold(out.game, parseHold(hold));
        duel.guardDuelLock(out.game, parseHold(duelLock), now());
        tx.update(accountRef, { version: out.version, gameJson: JSON.stringify(out.game) });
      }
      if (out.daily) tx.set(dailyRef, { json: JSON.stringify(out.daily) });
      // tx.create: eşzamanlı ikinci settle çakışır; yeniden denemede kaydı görüp önceki sonucu döndürür.
      tx.create(settlementRef, { eventId, kind, accountId, appliedVersion: out.version, createdAt: now(), resultJson: JSON.stringify(out.result) });
      return { replayed: false, result: out.result };
    }, { maxAttempts: 5 });
  }
  async function readMatch(matchId) { return duel.MATCH_ID.test(matchId || '') ? matchOf(await matches.doc(matchId).get()) : null; }
  return {
    checkDuelEntry, openMatch, finalizeMatch, settleGameplay, readMatch,
    backend: 'firestore', executeMarket, listMarket, listMarketRaw, pruneServiceState, consumeRate, publishPresence, listPeers, compactTradeReceipts, createGuest, resolveSession, readEconomy, executeCommand, executeTrade, currentTrade, expireTrades, migrateTradeExpiry,
    async revokeSession(token) { if (typeof token === 'string') await sessions.doc(hashToken(token)).delete(); },
    async close() { await db.terminate(); },
  };
}
module.exports = { openFirestoreStore };
