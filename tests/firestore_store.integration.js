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
 // One-time GOALS rewards are bound (ENG-06); seed a repeatable verified gameplay credit instead.
 game.gold+=50;game.funds.earned+=50;await ref.update({gameJson:JSON.stringify(game)});
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

test('ENG06 P-C Firestore: week.end (ENG-12: unlimited, no ticket), concurrency, replay, rollback, egg, debt and season', {timeout:90000},async t=>{
 const {Firestore}=require('@google-cloud/firestore'),db=new Firestore(options);
 let clock=1_800_000_000_000;
 const a=openFirestoreStore({...options,client:db,now:()=>clock}),b=openFirestoreStore({...options,now:()=>clock});
 t.after(async()=>{await a.close();await b.close();});
 const u=await a.createGuest(),ref=db.collection('eo_accounts').doc(u.accountId);
 await a.executeCommand(u.accountId,command('game.start',{},0));
 const load=async()=>JSON.parse((await ref.get()).data().gameJson);
 const save=async g=>ref.update({gameJson:JSON.stringify(g)});
 const tile=(await load()).grid.findIndex(x=>x.open&&!x.b);
 await a.executeCommand(u.accountId,command('building.buy',{kind:'kulucka',tile},1));
 // Two instances, same version: exactly one week closes.
 const attempts=await Promise.allSettled([a.executeCommand(u.accountId,command('week.end',{},2)),b.executeCommand(u.accountId,command('week.end',{},2))]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(attempts.find(x=>x.status==='rejected').reason.code,'version_conflict');
 let g=await load();
 assert.equal(g.week,2);assert.equal(g.weekTickets,undefined);assert.equal(g.eggs[0].w,1);
 // Lost response retried on the other instance: same receipt, the week is not applied twice.
 const req=command('week.end',{},3),first=await a.executeCommand(u.accountId,req),again=await b.executeCommand(u.accountId,req);
 assert.equal(again.replayed,true);assert.deepEqual(again.result,JSON.parse(JSON.stringify(first.result)));
 await assert.rejects(b.executeCommand(u.accountId,{...req,expectedVersion:4}),/request_id_reused/);
 g=await load();assert.equal(g.week,3);
 assert.deepEqual(first.result.hatchReady,[g.eggs[0].assetId]);
 const hatched=await a.executeCommand(u.accountId,command('egg.hatch',{assetId:g.eggs[0].assetId},4));
 assert.equal(hatched.economy.dragons[1].data.name,'Gece');
 let v=5;
 // ENG-12: no ticket limit; a legacy exhausted ticket field is ignored and removed; clock rollback does not matter.
 g=await load();g.weekTickets={schema:1,count:0,at:clock+86400000};await save(g);
 for(let i=0;i<9;i++)await (i%2?a:b).executeCommand(u.accountId,command('week.end',{},v++));
 clock-=7*86400000;
 await b.executeCommand(u.accountId,command('week.end',{},v++));
 g=await load();assert.equal(g.week,13);assert.equal(Object.hasOwn(g,'weekTickets'),false);
 // Debt: upkeep larger than balance stops gold at 0; spending and trade are closed; no bankruptcy.
 g=await load();g.gold=5;g.funds={schema:1,bound:5,unknown:0,earned:0};await save(g);
 const owed=await a.executeCommand(u.accountId,command('week.end',{},v++));
 assert.equal(owed.economy.gold,0);assert.ok(owed.economy.debt>0);assert.equal(owed.economy.game.debtWeeks,1);
 assert.equal(owed.economy.funds.bound+owed.economy.funds.unknown+owed.economy.funds.earned,0);
 assert.equal(owed.economy.game.over,false);assert.equal(owed.economy.game.ending,null);
 await assert.rejects(b.executeCommand(u.accountId,command('shop.food',{key:'balik'},v)),/debt_outstanding/);
 const peer=await b.createGuest();await b.executeCommand(peer.accountId,command('game.start',{},0));
 const c=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 let tr=(await a.executeTrade(u.accountId,c('invite',{targetId:peer.accountId}))).trade;
 tr=(await b.executeTrade(peer.accountId,c('accept',{tradeId:tr.id}))).trade;
 await assert.rejects(a.executeTrade(u.accountId,c('offer',{tradeId:tr.id,revision:tr.revision,offer:{}})),/debt_outstanding/);
 await a.executeTrade(u.accountId,c('cancel',{tradeId:tr.id}));
 // ENG-10 (O-2): week 20 ends the season and starts the next generation (no dead end); assets stay.
 g=await load();g.week=20;const ids=g.dragons.map(d=>d.assetId).sort();await save(g);
 const rolled=await a.executeCommand(u.accountId,command('week.end',{},v));
 assert.equal(rolled.result.season.to,2);g=await load();assert.equal(g.week,1);assert.equal(g.seasonNo,2);assert.equal(g.over,false);
 assert.deepEqual(g.dragons.map(d=>d.assetId).sort(),ids);
});

test('ENG07 Firestore Bedesten: list/cancel, partial and offline sale, concurrency, idempotency, provenance, holds and debt', {timeout:120000}, async t => {
 const {Firestore}=require('@google-cloud/firestore');const raw=new Firestore(options);
 const a=openFirestoreStore(options),b=openFirestoreStore(options);
 t.after(async()=>{await a.close();await b.close();await raw.terminate();});
 const users=[];for(let i=0;i<4;i++){const u=await a.createGuest();await a.executeCommand(u.accountId,command('game.start',{},0));users.push(u.accountId);}
 const [seller,buyer,rival,bound]=users;
 await earnedAccounts(seller,buyer,rival);
 const patch=async(id,fn)=>{const ref=raw.collection('eo_accounts').doc(id),doc=await ref.get(),g=JSON.parse(doc.data().gameJson);fn(g);await ref.update({gameJson:JSON.stringify(g)});};
 await patch(seller,g=>{g.eggs.forEach(e=>{e.inK=false;});g.food.balik=5;g.foodSources.balik={bound:0,unknown:0,earned:5};});
 const op=(name,fields)=>({op:name,requestId:crypto.randomUUID(),...fields});
 const S=await a.readEconomy(seller);
 // bound account cannot list; legacy shape and offer stay closed
 await assert.rejects(b.executeMarket(bound,op('list',{kind:'dragon',assetId:(await a.readEconomy(bound)).dragons[0].assetId,quantity:1,unitPrice:5})),/asset_not_transferable/);
 await assert.rejects(a.executeMarket(seller,{op:'list',listing:{assetId:'x',price:1}}),/unknown_market_field/);
 await assert.rejects(a.executeMarket(seller,{op:'offer'}),/market_settlement_unavailable/);
 // list + cancel
 const temp=(await a.executeMarket(seller,op('list',{kind:'egg',assetId:S.eggs[0].assetId,quantity:1,unitPrice:30}))).listing;
 await assert.rejects(b.executeMarket(buyer,op('cancel',{listingId:temp.id})),/listing_not_owned/);
 assert.equal((await b.executeMarket(seller,op('cancel',{listingId:temp.id}))).listing.status,'cancelled');
 await assert.rejects(a.executeMarket(buyer,op('buy',{listingId:temp.id,quantity:1,unitPrice:30})),/listing_closed/);
 // dragon listing: hold blocks NPC sale and trade offer (other instance)
 const dragon=(await a.executeMarket(seller,op('list',{kind:'dragon',assetId:S.dragons[0].assetId,quantity:1,unitPrice:100}))).listing;
 await assert.rejects(b.executeCommand(seller,command('dragon.sell',{assetId:S.dragons[0].assetId},S.version)),/market_reserved_asset/);
 let tr=(await a.executeTrade(seller,{type:'invite',requestId:crypto.randomUUID(),targetId:buyer})).trade;
 tr=(await b.executeTrade(buyer,{type:'accept',requestId:crypto.randomUUID(),tradeId:tr.id})).trade;
 await assert.rejects(a.executeTrade(seller,{type:'offer',requestId:crypto.randomUUID(),tradeId:tr.id,revision:tr.revision,offer:{dragons:[S.dragons[0].assetId]}}),/market_reserved_asset/);
 await b.executeTrade(buyer,{type:'cancel',requestId:crypto.randomUUID(),tradeId:tr.id});
 // own listing, insufficient gold, then concurrent buyers on two instances: one wins
 await assert.rejects(a.executeMarket(seller,op('buy',{listingId:dragon.id,quantity:1,unitPrice:100})),/own_listing/);
 const buyInput=op('buy',{listingId:dragon.id,quantity:1,unitPrice:100});
 const race=await Promise.allSettled([a.executeMarket(buyer,buyInput),b.executeMarket(rival,op('buy',{listingId:dragon.id,quantity:1,unitPrice:100}))]);
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1,JSON.stringify(race.map(r=>r.reason?.code)));
 assert.match(race.find(r=>r.status==='rejected').reason.code,/listing_closed/);
 const winner=race[0].status==='fulfilled'?buyer:rival;
 // replay on the other instance: same result, single transfer; changed body rejected
 if(winner===buyer){const again=await b.executeMarket(buyer,{...buyInput});assert.equal(again.replayed,true);await assert.rejects(b.executeMarket(buyer,{...buyInput,unitPrice:99}),/request_id_reused/);}
 const W=await b.readEconomy(winner),A1=await a.readEconomy(seller);
 assert.equal(W.gold,320);assert.equal(W.funds.earned,320);assert.equal(A1.gold,520);assert.equal(A1.funds.earned,520);
 assert.equal(W.dragons.find(d=>d.assetId===S.dragons[0].assetId).data.funding,'earned');
 // partial food sale while seller is offline; earned food moves earned→earned
 const food=(await a.executeMarket(seller,op('list',{kind:'food',foodKey:'balik',quantity:4,unitPrice:10}))).listing;
 await assert.rejects(a.executeMarket(seller,op('list',{kind:'food',foodKey:'balik',quantity:2,unitPrice:10})),/food_reserved/);
 const other=winner===buyer?rival:buyer;
 await assert.rejects(b.executeMarket(other,op('buy',{listingId:food.id,quantity:1,unitPrice:10000})),/listing_price_mismatch/);
 assert.equal((await b.executeMarket(other,op('buy',{listingId:food.id,quantity:3,unitPrice:10}))).listing.remaining,1);
 await assert.rejects(a.executeMarket(other,op('buy',{listingId:food.id,quantity:2,unitPrice:10})),/listing_quantity_unavailable/);
 const O=await a.readEconomy(other),A2=await a.readEconomy(seller);
 assert.equal(O.gold,390);assert.equal(A2.gold,550);assert.equal(A2.game.foodSources.balik.earned,2);assert.equal(O.game.foodSources.balik.earned,(O.game.food.balik));
 const view=await b.listMarket(seller);
 assert.ok(view.listings.some(l=>l.id===food.id&&l.mine&&l.remaining===1));
 assert.equal(view.mine.find(l=>l.id===dragon.id).status,'sold');
 const pub=await b.listMarket(other);assert.ok(pub.listings.every(l=>l.assetId===undefined));
 // debtor buyer cannot buy; debtor seller cannot list
 await patch(other,g=>{g.gold=0;g.funds={schema:1,bound:0,unknown:0,earned:0};g.debt=40;});
 const before=[await a.readEconomy(other),await a.readEconomy(seller)];
 await assert.rejects(a.executeMarket(other,op('buy',{listingId:food.id,quantity:1,unitPrice:10})),/debt_outstanding/);
 await assert.rejects(a.executeMarket(other,op('list',{kind:'food',foodKey:'balik',quantity:1,unitPrice:10})),/debt_outstanding/);
 assert.deepEqual([await a.readEconomy(other),await a.readEconomy(seller)],before);
 // cancel releases the remaining food hold
 await a.executeMarket(seller,op('cancel',{listingId:food.id}));
 const hold=JSON.parse((await raw.collection('eo_market_holds').doc(seller).get()).data().json);
 assert.deepEqual(hold,{schema:1,listings:[],items:[],dragons:[],eggs:[],food:{}});
});

test('ENG09 Firestore: market read cache (shared open page, per-account fields, invalidation)', {timeout:60000}, async t => {
 const {createMarketReadCache}=require('../server/market_read_cache');const {publicListing}=require('../server/market_service');
 const a=openFirestoreStore(options),b=openFirestoreStore(options);
 t.after(async()=>{await a.close();await b.close();});
 const seller=await a.createGuest(),viewer=await a.createGuest();
 for(const u of [seller,viewer])await a.executeCommand(u.accountId,command('game.start',{},0));
 await earnedAccounts(seller.accountId);
 const S=await a.readEconomy(seller.accountId);
 let clock=Date.now();
 const cache=createMarketReadCache({store:b,publicListing,ttlMs:60000,now:()=>clock});
 const before=(await cache.view(viewer.accountId)).listings.length;
 const listed=(await a.executeMarket(seller.accountId,{op:'list',requestId:crypto.randomUUID(),kind:'dragon',assetId:S.dragons[0].assetId,quantity:1,unitPrice:7})).listing;
 // Diğer örnekte yazılan ilan en çok TTL kadar gecikir; aynı örnekte marketChanged geçersiz kılar.
 assert.equal((await cache.view(viewer.accountId)).listings.length,before,'cached within TTL');
 cache.invalidate();
 const pub=await cache.view(viewer.accountId),own=await cache.view(seller.accountId),anon=await cache.view(null);
 const p=pub.listings.find(l=>l.id===listed.id),o=own.listings.find(l=>l.id===listed.id),n=anon.listings.find(l=>l.id===listed.id);
 assert.ok(p&&o&&n);
 assert.equal(p.mine,false);assert.equal(p.assetId,undefined);assert.equal(p.sellerId,undefined);assert.equal(n.assetId,undefined);
 assert.equal(o.mine,true);assert.equal(o.assetId,S.dragons[0].assetId);assert.ok(own.mine.some(l=>l.id===listed.id));
 assert.equal(pub.mine.length,0);
 assert.equal(cache.stats.misses,2,'open page read from Firestore only twice for five views');
 await a.executeMarket(seller.accountId,{op:'cancel',requestId:crypto.randomUUID(),listingId:listed.id});cache.invalidate();
 assert.equal((await cache.view(null)).listings.some(l=>l.id===listed.id),false);
});

test('ENG06 P-D Firestore duel: ledger fighter, lock, replay, exactly-once settlement across instances, K9/K10, debt, void', {timeout:120000}, async t => {
 const duel=require('../server/duel_service');const DuelEngine=require('../js/duel_engine');const sources=require('../server/economy_sources');
 let clock=Date.now();
 const a=openFirestoreStore({...options,now:()=>clock}),b=openFirestoreStore({...options,now:()=>clock});
 const {Firestore}=require('@google-cloud/firestore');const raw=new Firestore(options);
 t.after(async()=>{await a.close();await b.close();await raw.terminate();});
 const users=[];for(let i=0;i<3;i++){const u=await a.createGuest();await a.executeCommand(u.accountId,command('game.start',{},0));users.push(u);}
 await earnedAccounts(...users.map(u=>u.accountId));
 for(const u of users)u.dragon=(await a.readEconomy(u.accountId)).dragons[0].assetId;
 const [x,y,z]=users;
 const seed=()=>crypto.randomBytes(32).toString('hex');
 const open=(p,q,extra={})=>a.openMatch({matchId:duel.newMatchId(),seed:seed(),participants:[{accountId:p.accountId,handle:p.handle,dragonAssetId:extra.pd||p.dragon},{accountId:q.accountId,handle:q.handle,dragonAssetId:q.dragon}]}).then(r=>r.match);
 const play=m=>{const rng=duel.seededRng(m.seed),F=DuelEngine.createFight(m.participants[0].fighter,m.participants[1].fighter),log=[];while(!F.over){log.push({round:F.round+1,actions:['pence','pence']});DuelEngine.resolveRound(F,'pence','pence',rng);}return {log,F};};
 const settle=(store,u,m)=>store.settleGameplay(u.accountId,{eventId:m.id,kind:duel.SETTLEMENT_KIND});
 // D-1: başkasının ejderhası ve aynı hesap reddi; savaşçı defterden.
 await assert.rejects(open(x,y,{pd:y.dragon}),/dragon_not_owned/);
 await assert.rejects(a.openMatch({matchId:duel.newMatchId(),seed:seed(),participants:[{accountId:x.accountId,dragonAssetId:x.dragon},{accountId:x.accountId,dragonAssetId:x.dragon}]}),/same_account/);
 await assert.rejects(b.checkDuelEntry(x.accountId,'forged:1'),/dragon_not_owned/);
 const m1=await open(x,y);
 const ledger=JSON.parse((await raw.collection('eo_accounts').doc(x.accountId).get()).data().gameJson);
 assert.deepEqual(m1.participants[0].fighter,duel.fighterFromLedger(ledger,ledger.dragons[0]));
 // D-2 kilit: diğer örnekte satış, takas teklifi ve ilan reddedilir; ikinci maç açılamaz.
 const ver=(await b.readEconomy(x.accountId)).version;
 await assert.rejects(b.executeCommand(x.accountId,command('dragon.sell',{assetId:x.dragon},ver)),/duel_locked_asset/);
 await assert.rejects(b.executeMarket(x.accountId,{op:'list',requestId:crypto.randomUUID(),kind:'dragon',assetId:x.dragon,quantity:1,unitPrice:5}),/duel_locked_asset/);
 let tr=(await b.executeTrade(x.accountId,{type:'invite',requestId:crypto.randomUUID(),targetId:z.accountId})).trade;
 tr=(await b.executeTrade(z.accountId,{type:'accept',requestId:crypto.randomUUID(),tradeId:tr.id})).trade;
 await assert.rejects(b.executeTrade(x.accountId,{type:'offer',requestId:crypto.randomUUID(),tradeId:tr.id,revision:tr.revision,offer:{dragons:[x.dragon]}}),/duel_locked_asset/);
 await b.executeTrade(x.accountId,{type:'cancel',requestId:crypto.randomUUID(),tradeId:tr.id});
 await assert.rejects(open(x,z),/duel_busy/);
 await assert.rejects(settle(a,x,m1),/match_not_final/);
 // D-2 kesinleşme + tekrar üretim; D-3 iki örnekten eşzamanlı settle tek ödeme.
 const {log,F}=play(m1);
 const [f1,f2]=await Promise.allSettled([a.finalizeMatch(m1.id,{log,forfeit:null}),b.finalizeMatch(m1.id,{log,forfeit:null})]);
 assert.equal([f1,f2].filter(r=>r.status==='fulfilled').length,1);
 const final=await b.readMatch(m1.id);
 assert.equal(final.status,'final');assert.equal(duel.replayMatch(final).winner,F.winner);
 const winner=final.result.winner===x.accountId?x:y,loser=winner===x?y:x;
 const gw=(await a.readEconomy(winner.accountId)).gold,gl=(await a.readEconomy(loser.accountId)).gold;
 const both=await Promise.all([settle(a,winner,m1),settle(b,winner,m1),settle(a,loser,m1),settle(b,loser,m1)]);
 assert.equal(both.filter(r=>!r.replayed).length,2);
 assert.equal((await b.readEconomy(winner.accountId)).gold,gw+85);assert.equal((await b.readEconomy(loser.accountId)).gold,gl+20);
 const wg=JSON.parse((await raw.collection('eo_accounts').doc(winner.accountId).get()).data().gameJson);
 assert.equal(wg.funds.bound+wg.funds.unknown+wg.funds.earned,wg.gold);
 assert.doesNotThrow(()=>sources.tradable(wg,{gold:wg.funds.earned,items:[],dragons:[],eggs:[],food:{}}));
 assert.equal((await raw.collection('eo_accounts').doc(winner.accountId).collection('settlements').get()).size,1);
 // Kilit kalktı: ejderha yeniden kullanılabilir.
 assert.equal(await b.checkDuelEntry(x.accountId,x.dragon).then(r=>r.ok),true);
 // K9 çift limiti: aynı çift günde 3 ödüllü maç; 4. maç ödülsüz.
 for(let i=0;i<2;i++){const m=await open(x,y);await a.finalizeMatch(m.id,{log:play(m).log,forfeit:null});for(const u of [x,y])assert.equal((await settle(b,u,m)).result.status,'paid');}
 const m4=await open(x,y);await a.finalizeMatch(m4.id,{log:play(m4).log,forfeit:null});
 assert.equal((await settle(a,x,m4)).result.reason,'daily_pair_limit');
 // K10: 1 tur sonra terk → kimse ödül almaz.
 const m5=await open(x,z);
 await b.finalizeMatch(m5.id,{log:[{round:1,actions:['savun','savun']}],forfeit:{accountId:z.accountId,reason:'leave'}});
 assert.deepEqual([(await settle(a,x,m5)).result.reason,(await settle(a,z,m5)).result.reason],['forfeit_too_short','forfeit_leaver']);
 // D4: borçlu kazanan; ödül önce borcu öder.
 const zr=raw.collection('eo_accounts').doc(z.accountId);const zg=JSON.parse((await zr.get()).data().gameJson);
 zg.gold=0;zg.funds={schema:1,bound:0,unknown:0,earned:0};zg.debt=10;await zr.update({gameJson:JSON.stringify(zg)});
 const m6=await open(z,y);await a.finalizeMatch(m6.id,{log:play(m6).log,forfeit:null});
 const r6=(await settle(b,z,m6)).result;assert.equal(r6.paidDebt,10);
 const z2=JSON.parse((await zr.get()).data().gameJson);assert.equal(z2.debt,0);assert.equal(z2.gold,r6.amount-10);assert.equal(z2.funds.earned,r6.amount-10);
 // Süresi dolan maç void; ödül yok.
 const m7=await open(x,z);clock+=60*60*1000+1;
 assert.equal((await a.finalizeMatch(m7.id,{log:[],forfeit:{accountId:z.accountId,reason:'disconnect'}})).status,'void');
 assert.equal((await settle(b,x,m7)).result.reason,'match_expired');
});

test('ENG-10 Firestore: listing preview refresh in the seller command (O-7) and ocak.rebuild (K5) across instances', {timeout:60000}, async t => {
 const a=openFirestoreStore(options),b=openFirestoreStore(options);t.after(async()=>{await a.close();await b.close();});
 const {Firestore}=require('@google-cloud/firestore');const db=new Firestore(options);t.after(()=>db.terminate());
 const seller=await a.createGuest(),buyer=await a.createGuest();
 for(const u of [seller,buyer])await a.executeCommand(u.accountId,command('game.start',{},0));
 await earnedAccounts(seller.accountId,buyer.accountId);
 const ref=db.collection('eo_accounts').doc(seller.accountId);
 const load=async()=>JSON.parse((await ref.get()).data().gameJson),save=g=>ref.update({gameJson:JSON.stringify(g)});
 const dragon=(await a.readEconomy(seller.accountId)).dragons[0];
 const listed=(await a.executeMarket(seller.accountId,{op:'list',requestId:crypto.randomUUID(),kind:'dragon',assetId:dragon.assetId,quantity:1,unitPrice:40})).listing;
 let g=await load();g.dragons[0].name='Tazelendi';await save(g);
 const v=(await a.readEconomy(seller.accountId)).version;
 const applied=await b.executeCommand(seller.accountId,command('goals.claim',{},v));
 assert.equal(applied.listingsRefreshed,1);
 const doc=JSON.parse((await db.collection('eo_market_listings').doc(listed.id).get()).data().json);
 assert.equal(doc.preview.name,'Tazelendi');assert.equal(doc.stateVersion,2);
 await assert.rejects(a.executeMarket(buyer.accountId,{op:'buy',requestId:crypto.randomUUID(),listingId:listed.id,quantity:1,unitPrice:40,stateVersion:1}),/listing_changed/);
 await a.executeMarket(seller.accountId,{op:'cancel',requestId:crypto.randomUUID(),listingId:listed.id});
 // K5: borç eşiği → yeniden kur; varlıklar kalır, tekrar aynı sonuç.
 g=await load();Object.assign(g,{gold:0,funds:{schema:1,bound:0,unknown:0,earned:0},debt:55,debtWeeks:3});await save(g);
 const v2=(await a.readEconomy(seller.accountId)).version,body=command('ocak.rebuild',{},v2);
 const done=await a.executeCommand(seller.accountId,body);assert.equal(done.result.writtenOff,55);assert.equal(done.economy.debt,0);
 const again=await b.executeCommand(seller.accountId,body);assert.equal(again.replayed,true);
 assert.deepEqual((await b.readEconomy(seller.accountId)).dragons.map(d=>d.assetId),[dragon.assetId]);
});
