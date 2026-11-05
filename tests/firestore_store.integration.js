'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { openFirestoreStore } = require('../server/firestore_store');
// Never let an integration test accidentally contact a real Google project.
if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local Firestore emulator required');
const options = { projectId: 'demo-ejder-ocagi', databaseId: 'economy' };
const command = (type, args, expectedVersion) => ({ requestId: crypto.randomUUID(), type, args, expectedVersion });

test('Firestore: two independent instances share durable accounts and command receipts', { timeout: 30000 }, async t => {
  const a = openFirestoreStore(options), b = openFirestoreStore(options);
  t.after(async () => { await a.close(); await b.close(); });
  const guest = await a.createGuest();
  assert.equal((await b.resolveSession(guest.token)).accountId, guest.accountId);
  assert.equal(await b.resolveSession('forged'), null);
  const initial = command('game.start', {}, 0);
  const started = await a.executeCommand(guest.accountId, initial);
  assert.equal(started.economy.gold, 420);
  assert.equal(started.economy.stones.kor_t1, 12);
  assert.equal(started.economy.dragons[0].data.name, 'Kor');
  // Lost response / reconnect to another Cloud Run instance.
  const replay = await b.executeCommand(guest.accountId, initial);
  assert.equal(replay.replayed, true); assert.equal(replay.economy.version, 1);
  const purchase = command('chibi.craft', { itemId: 'hat_2' }, 1);
  const same = await Promise.all([a.executeCommand(guest.accountId, purchase), b.executeCommand(guest.accountId, purchase)]);
  assert.equal(same.filter(r => r.replayed).length, 1);
  assert.equal((await b.readEconomy(guest.accountId)).gold, 220);
  await assert.rejects(b.executeCommand(guest.accountId, { ...purchase, args: { itemId: 'armor_2' } }), /request_id_reused/);
  const before = await b.readEconomy(guest.accountId);
  await assert.rejects(a.executeCommand(guest.accountId, command('chibi.craft', { itemId: 'hat_8' }, 2)));
  assert.deepEqual(await b.readEconomy(guest.accountId), before);
  await b.revokeSession(guest.token);
  assert.equal(await a.resolveSession(guest.token), null);
});

test('Firestore: concurrent spends serialize; ownership and arbitrary rewards cannot bypass rules', { timeout: 30000 }, async t => {
  const a = openFirestoreStore(options), b = openFirestoreStore(options);
  t.after(async () => { await a.close(); await b.close(); });
  const guest = await a.createGuest(), other = await b.createGuest();
  const start = await a.executeCommand(guest.accountId, command('game.start', {}, 0));
  await b.executeCommand(other.accountId, command('game.start', {}, 0));
  const attempts = await Promise.allSettled([
    a.executeCommand(guest.accountId, command('chibi.craft', { itemId: 'hat_2' }, 1)),
    b.executeCommand(guest.accountId, command('chibi.craft', { itemId: 'armor_2' }, 1)),
  ]);
  assert.equal(attempts.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(x => x.status === 'rejected').reason.code, 'version_conflict');
  const after = await a.readEconomy(guest.accountId);
  assert.equal(after.gold, 220); assert.equal(after.version, 2); assert.equal(after.stones.kor_t1, 8);
  await assert.rejects(b.executeCommand(other.accountId, command('egg.incubate', { assetId: start.economy.eggs[0].assetId, enabled: true }, 1)), /asset_not_owned/);
  await assert.rejects(a.executeCommand(guest.accountId, command('reward.grant', { gold: 9999 }, 2)), /unsupported_command/);
  assert.equal((await b.readEconomy(guest.accountId)).gold, 220);
});

test('Firestore trade: atomic transfer, reservations, retries, cancellation and concurrent confirmations', { timeout: 60000 }, async t => {
 const a=openFirestoreStore(options),b=openFirestoreStore(options);
 t.after(async()=>{await a.close();await b.close();});
 const x=await a.createGuest(),y=await b.createGuest();
 for(const u of [x,y]) await a.executeCommand(u.accountId,command('game.start',{},0));
 const tradeCmd=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 const send=(u,type,extra)=>a.executeTrade(u.accountId,tradeCmd(type,extra));
 let trade=(await send(x,'invite',{targetId:y.accountId})).trade;
 trade=(await send(y,'accept',{tradeId:trade.id})).trade;
 const dragon=(await a.readEconomy(x.accountId)).dragons[0].assetId;
 await assert.rejects(send(y,'offer',{tradeId:trade.id,revision:trade.revision,offer:{dragons:[dragon]}}),/dragon_not_owned/);
 trade=(await send(x,'offer',{tradeId:trade.id,revision:trade.revision,offer:{gold:420,dragons:[dragon]}})).trade;
 await assert.rejects(b.executeCommand(x.accountId,command('shop.food',{key:'balik'},1)),/trade_reserved_gold/);
 await assert.rejects(send(x,'invite',{targetId:y.accountId}),/trade_busy/);
 await send(x,'confirm',{tradeId:trade.id,revision:trade.revision});
 const confirm=tradeCmd('confirm',{tradeId:trade.id,revision:trade.revision});
 const results=await Promise.all([a.executeTrade(y.accountId,confirm),b.executeTrade(y.accountId,confirm)]);
 assert.equal(results.filter(r=>r.replayed).length,1);
 assert.equal(results[0].trade.status,'completed');
 assert.equal((await a.readEconomy(x.accountId)).gold,0);assert.equal((await b.readEconomy(y.accountId)).gold,840);
 assert.equal((await b.readEconomy(y.accountId)).dragons.length,2);
 assert.equal((await b.executeTrade(y.accountId,confirm)).replayed,true);
 assert.equal((await send(x,'cancel',{tradeId:trade.id})).trade.status,'completed');
 trade=(await send(y,'invite',{targetId:x.accountId})).trade;
 assert.equal((await send(x,'reject',{tradeId:trade.id})).trade.status,'rejected');
});

test('Firestore transaction abort after staging first account leaves both economies unchanged', { timeout: 60000 }, async t => {
 const {Firestore}=require('@google-cloud/firestore');const db=new Firestore(options);
 const store=openFirestoreStore({...options,client:db});
 t.after(()=>store.close());
 const x=await store.createGuest(),y=await store.createGuest();
 for(const u of [x,y])await store.executeCommand(u.accountId,command('game.start',{},0));
 const c=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 let trade=(await store.executeTrade(x.accountId,c('invite',{targetId:y.accountId}))).trade;
 trade=(await store.executeTrade(y.accountId,c('accept',{tradeId:trade.id}))).trade;
 trade=(await store.executeTrade(x.accountId,c('offer',{tradeId:trade.id,revision:trade.revision,offer:{gold:10}}))).trade;
 await store.executeTrade(x.accountId,c('confirm',{tradeId:trade.id,revision:trade.revision}));
 const before=await Promise.all([store.readEconomy(x.accountId),store.readEconomy(y.accountId)]);
 const run=db.runTransaction.bind(db);
 db.runTransaction=(callback,opts)=>run(tx=>{const update=tx.update.bind(tx);let writes=0;tx.update=(...args)=>{if(++writes===2)throw new Error('injected_failure');return update(...args);};return callback(tx);},opts);
 const request=c('confirm',{tradeId:trade.id,revision:trade.revision});
 await assert.rejects(store.executeTrade(y.accountId,request),/injected_failure/);
 assert.deepEqual(await Promise.all([store.readEconomy(x.accountId),store.readEconomy(y.accountId)]),before);
 db.runTransaction=run;
 assert.equal((await store.executeTrade(y.accountId,request)).trade.status,'completed');
});
