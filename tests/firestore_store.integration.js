'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { openFirestoreStore } = require('../server/firestore_store');
// Never let an integration test accidentally contact a real Google project.
if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local Firestore emulator required');
const options = { projectId: 'demo-ejder-ocagi', databaseId: 'economy' };
async function earnedAccounts(...ids) {
 const {Firestore}=require('@google-cloud/firestore');const db=new Firestore(options);
 try{for(const id of ids){const ref=db.collection('eo_accounts').doc(id),doc=await ref.get();const game=require('./helpers/earned_fixture').earnedFixture(JSON.parse(doc.data().gameJson));await ref.update({gameJson:JSON.stringify(game)});}}finally{await db.terminate();}
}
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
 await earnedAccounts(x.accountId,y.accountId);
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
 await earnedAccounts(x.accountId,y.accountId);
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

test('Firestore P3 migration, state ordering and concurrent expiry cleanup preserve both reservations', {timeout:60000},async t=>{
 const {Firestore,FieldValue}=require('@google-cloud/firestore');const db=new Firestore(options);let clock=Date.now();
 const a=openFirestoreStore({...options,client:db,now:()=>clock}),b=openFirestoreStore({...options,now:()=>clock});
 t.after(async()=>{await a.close();await b.close();});
 const x=await a.createGuest(),y=await a.createGuest();
 for(const u of [x,y])await a.executeCommand(u.accountId,command('game.start',{},0));
 const c=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 let trade=(await a.executeTrade(x.accountId,c('invite',{targetId:y.accountId}))).trade;
 assert.equal((await b.currentTrade(y.accountId)).id,trade.id);
 trade=(await b.executeTrade(y.accountId,c('accept',{tradeId:trade.id}))).trade;
 const version=trade.stateVersion;
 await assert.rejects(a.executeTrade(x.accountId,c('confirm',{tradeId:trade.id,revision:trade.revision,offerHash:'fake'})),/trade_offer_changed/);
 trade=(await a.executeTrade(x.accountId,c('confirm',{tradeId:trade.id,revision:trade.revision,offerHash:trade.offerHash}))).trade;
 assert.ok(trade.stateVersion>version);
 await db.collection('eo_trades').doc(trade.id).update({expiresAt:FieldValue.delete()});
 let cursor=null;do{cursor=await a.migrateTradeExpiry(cursor);}while(cursor);
 clock+=300001;
 await Promise.all([a.expireTrades(),b.expireTrades()]);
 assert.equal((await a.currentTrade(x.accountId)).status,'expired');
 assert.equal((await b.currentTrade(y.accountId)).status,'expired');
 for(const u of [x,y])assert.equal(JSON.parse((await db.collection('eo_trade_locks').doc(u.accountId).get()).data().json),null);
 assert.equal(await a.expireTrades(),0);
});

test('Firestore rejects locked and heirloom items without writing offers or either economy', {timeout:60000},async t=>{
 const {Firestore}=require('@google-cloud/firestore');const db=new Firestore(options);
 const store=openFirestoreStore({...options,client:db});t.after(()=>store.close());
 const x=await store.createGuest(),y=await store.createGuest();
 for(const u of [x,y])await store.executeCommand(u.accountId,command('game.start',{},0));
 const c=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 let trade=(await store.executeTrade(x.accountId,c('invite',{targetId:y.accountId}))).trade;
 trade=(await store.executeTrade(y.accountId,c('accept',{tradeId:trade.id}))).trade;
 const game=(await store.readEconomy(x.accountId)).game;
 const assetId=x.accountId+':test:item';
 for(const flag of ['tradeLocked','heirloomId']) {
  game.inv=[{uid:game.uid,id:'zirh1',assetId,funding:'earned',[flag]:flag==='heirloomId'?'heirloom-test':true}];
  await db.collection('eo_accounts').doc(x.accountId).update({gameJson:JSON.stringify(game)});
  const before=await Promise.all([store.readEconomy(x.accountId),store.readEconomy(y.accountId)]);
  await assert.rejects(store.executeTrade(x.accountId,c('offer',{tradeId:trade.id,revision:trade.revision,offer:{items:[assetId]}})),{code:'item_unavailable'});
  assert.deepEqual(await Promise.all([store.readEconomy(x.accountId),store.readEconomy(y.accountId)]),before);
  assert.deepEqual(await store.currentTrade(x.accountId),trade);
 }
});

test('ENG05 Firestore: guest farming blocked, earned transfer preserved, shared presence/limits and tombstone replay', {timeout:60000},async t=>{
 const {Firestore}=require('@google-cloud/firestore'),db=new Firestore(options);let clock=Date.now();
 const a=openFirestoreStore({...options,client:db,now:()=>clock}),b=openFirestoreStore({...options,now:()=>clock});
 t.after(async()=>{await a.close();await b.close();});
 const users=await Promise.all([a.createGuest(),b.createGuest(),b.createGuest()]);
 for(const u of users)await a.executeCommand(u.accountId,command('game.start',{},0));
 const [receiver,...donors]=users,c=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 for(const donor of donors){
  let tr=(await a.executeTrade(donor.accountId,c('invite',{targetId:receiver.accountId}))).trade;
  tr=(await b.executeTrade(receiver.accountId,c('accept',{tradeId:tr.id}))).trade;
  await assert.rejects(a.executeTrade(donor.accountId,c('offer',{tradeId:tr.id,revision:tr.revision,offer:{gold:420}})),/gold_not_transferable/);
  await b.executeTrade(receiver.accountId,c('cancel',{tradeId:tr.id}));
 }
 assert.equal((await b.readEconomy(receiver.accountId)).gold,420);
 const donor=donors[0],ref=db.collection('eo_accounts').doc(donor.accountId),doc=await ref.get(),game=JSON.parse(doc.data().gameJson);
 game.st.wins=1;game.milestoneSources.win1='earned';await ref.update({gameJson:JSON.stringify(game)});
 await a.executeCommand(donor.accountId,command('goals.claim',{},1));
 let tr=(await a.executeTrade(donor.accountId,c('invite',{targetId:receiver.accountId}))).trade;
 tr=(await b.executeTrade(receiver.accountId,c('accept',{tradeId:tr.id}))).trade;
 tr=(await a.executeTrade(donor.accountId,c('offer',{tradeId:tr.id,revision:tr.revision,offer:{gold:50}}))).trade;
 await a.executeTrade(donor.accountId,c('confirm',{tradeId:tr.id,revision:tr.revision}));
 const final=c('confirm',{tradeId:tr.id,revision:tr.revision});
 await Promise.all([a.executeTrade(receiver.accountId,final),b.executeTrade(receiver.accountId,final)]);
 assert.equal((await b.readEconomy(receiver.accountId)).funds.earned,50);
 const key='race:'+crypto.randomUUID(),attempts=await Promise.allSettled([a.consumeRate(key,1,60000),b.consumeRate(key,1,60000)]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 const lease=crypto.randomUUID();await a.publishPresence(lease,donor);
 assert.ok((await b.listPeers(receiver.accountId)).some(p=>p.accountId===donor.accountId));
 tr=(await a.executeTrade(donor.accountId,c('invite',{targetId:receiver.accountId}))).trade;
 await b.executeTrade(receiver.accountId,c('reject',{tradeId:tr.id}));
 await assert.rejects(a.executeTrade(donor.accountId,c('invite',{targetId:receiver.accountId})),/invitation_cooldown/);
 clock+=31*86400000;
 await Promise.all([a.compactTradeReceipts(),b.compactTradeReceipts()]);
 assert.equal((await b.executeTrade(receiver.accountId,final)).replayed,true);
 await assert.rejects(a.executeTrade(receiver.accountId,{...final,revision:999}),/request_id_reused/);
 assert.equal((await b.readEconomy(receiver.accountId)).funds.earned,50);
 assert.deepEqual(await b.listPeers(receiver.accountId),[]);
 await a.pruneServiceState();
 // Deny-all client rules apply even though the Admin SDK above is authorized in the emulator.
 const response=await fetch('http://'+process.env.FIRESTORE_EMULATOR_HOST+'/v1/projects/demo-ejder-ocagi/databases/economy/documents/eo_accounts/'+receiver.accountId);
 assert.equal(response.status,403);
});

test('ENG06 Firestore: a borrowed earned gen2/marked dragon yields only restricted goal rewards (REVIEW H-1)', {timeout:60000},async t=>{
 const {Firestore}=require('@google-cloud/firestore'),db=new Firestore(options);
 const a=openFirestoreStore({...options,client:db}),b=openFirestoreStore(options);
 t.after(async()=>{await a.close();await b.close();});
 const [main,sybil]=await Promise.all([a.createGuest(),b.createGuest()]);
 for(const u of [main,sybil])await a.executeCommand(u.accountId,command('game.start',{},0));
 const ref=db.collection('eo_accounts').doc(main.accountId),game=JSON.parse((await ref.get()).data().gameJson);
 game.dragons[0].gen=2;game.dragons[0].pers.ces=45;game.goals.push('mark','gen2');
 await ref.update({gameJson:JSON.stringify(require('./helpers/earned_fixture').earnedFixture(game))});
 const lent=(await a.readEconomy(main.accountId)).dragons[0].assetId,c=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 const kor=(await b.readEconomy(sybil.accountId)).dragons[0].assetId;
 await b.executeCommand(sybil.accountId,command('dragon.sell',{assetId:kor},1));
 let tr=(await a.executeTrade(main.accountId,c('invite',{targetId:sybil.accountId}))).trade;
 tr=(await b.executeTrade(sybil.accountId,c('accept',{tradeId:tr.id}))).trade;
 tr=(await a.executeTrade(main.accountId,c('offer',{tradeId:tr.id,revision:tr.revision,offer:{dragons:[lent]}}))).trade;
 await a.executeTrade(main.accountId,c('confirm',{tradeId:tr.id,revision:tr.revision}));
 assert.equal((await b.executeTrade(sybil.accountId,c('confirm',{tradeId:tr.id,revision:tr.revision}))).trade.status,'completed');
 const claim=await b.executeCommand(sybil.accountId,command('goals.claim',{},3));
 assert.deepEqual(JSON.parse(JSON.stringify(claim.result.goals)).map(g=>[g.id,g.gold,g.source]),[['mark',60,'unknown'],['gen2',80,'unknown']]);
 assert.equal(claim.economy.funds.earned,0);
});
