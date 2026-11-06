'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {openEconomyStore}=require('../server/economy_store');
const {reduceCommand}=require('../server/economy_commands');
const sources=require('../server/economy_sources');
const {createMarketService}=require('../server/market_service');
const cmd=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eo-sources-')),file=path.join(dir,'test.sqlite');let clock=Date.now();
 const store=openEconomyStore(file,{now:()=>clock}),raw=new DatabaseSync(file);
 t.after(()=>{raw.close();store.close();fs.rmSync(dir,{recursive:true,force:true});});
 const fresh=()=>{const id=store.createGuest().accountId;store.executeCommand(id,cmd('game.start',{args:{},expectedVersion:0}));return id;};
 const save=(id,g)=>raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g),id);
 const send=(a,type,extra)=>store.executeTrade(a,cmd(type,extra));
 const active=(a,b)=>{const tr=send(a,'invite',{targetId:b}).trade;return send(b,'accept',{tradeId:tr.id}).trade;};
 return{store,raw,file,fresh,save,send,active,advance:n=>clock+=n};
}
test('ENG05: the 420 -> 840 -> 1260 guest attack is rejected, including starter assets and food',t=>{
 const f=fixture(t),receiver=f.fresh();
 for(let i=0;i<2;i++){
  const donor=f.fresh(),g=f.store.readEconomy(donor).game;g.eggs[0].inK=false;f.save(donor,g);
  const tr=f.active(donor,receiver);
  for(const offer of [{gold:420},{dragons:[g.dragons[0].assetId]},{eggs:[g.eggs[0].assetId]},{food:{balik:1}}])
   assert.throws(()=>f.send(donor,'offer',{tradeId:tr.id,revision:tr.revision,offer}),/not_transferable/);
  f.send(receiver,'cancel',{tradeId:tr.id});
  assert.equal(f.store.readEconomy(receiver).gold,420);assert.equal(f.store.readEconomy(donor).gold,420);
 }
});
test('ENG05: bound purchases, NPC resale, inflated listings and hatch conversion cannot launder gold',async t=>{
 const f=fixture(t),a=f.fresh(),b=f.fresh();let game=f.store.readEconomy(a).game;
 // Trusted fixture unlocks the existing smith; no client API can grant this state.
 game.flags.smith=true;game.smith=['zirh1'];f.save(a,game);
 const run=(type,args)=>f.store.executeCommand(a,cmd(type,{args,expectedVersion:f.store.readEconomy(a).version}));
 const buy=run('shop.item',{key:'zirh1'}),item=buy.economy.items[0];assert.equal(item.data.funding,'bound');
 const tr=f.active(a,b);
 assert.throws(()=>f.send(a,'offer',{tradeId:tr.id,revision:tr.revision,offer:{items:[item.assetId]}}),/asset_not_transferable/);
 const market=createMarketService({store:f.store,world:{marketListings:[]}});
 await assert.rejects(market.execute({accountId:a,handle:'@a'},{op:'list',listing:{assetId:item.assetId,price:2000000000}}),/asset_not_transferable/);
 f.send(a,'cancel',{tradeId:tr.id});
 const sale=cmd('item.sell',{args:{assetId:item.assetId},expectedVersion:f.store.readEconomy(a).version});
 const sold=f.store.executeCommand(a,sale);assert.equal(sold.economy.funds.earned,0);
 assert.equal(f.store.executeCommand(a,sale).replayed,true);assert.deepEqual(f.store.readEconomy(a),sold.economy);
 game=f.store.readEconomy(a).game;const tile=game.grid.findIndex(x=>x.open&&!x.b);
 game=reduceCommand(game,cmd('building.buy',{args:{kind:'kulucka',tile}}),{accountId:a,seed:'test'}).game;
 game.eggs[0].w=2;game=reduceCommand(game,cmd('egg.hatch',{args:{assetId:game.eggs[0].assetId}}),{accountId:a,seed:'test'}).game;
 assert.equal(game.dragons.at(-1).funding,'bound');assert.equal(game.funds.earned,0);
});
test('ENG05: spending order is bound then unknown then earned; mixed assets and refunds remain restricted',()=>{
 const env={accountId:'test',seed:'test'},g=reduceCommand(null,{type:'game.start'},env).game;
 sources.credit(g,80,'unknown');sources.credit(g,100,'earned');
 assert.deepEqual(sources.spend(g,450),{bound:420,unknown:30,earned:0});
 assert.deepEqual(g.funds,{schema:1,bound:0,unknown:50,earned:100});
 // A rollback restores the entire original state; server refunds must credit each debit bucket.
 const debit=sources.spend(g,75);assert.equal(sources.sourceOf(debit),'unknown');
 for(const [source,n]of Object.entries(debit))sources.credit(g,n,source);
 assert.deepEqual(g.funds,{schema:1,bound:0,unknown:50,earned:100});
 assert.equal(sources.sourceOf({bound:1,unknown:0,earned:99}),'bound');
});
test('ENG05: verified gameplay reward trades normally; reserved earned gold cannot be spent, cancellation restores sources',t=>{
 const f=fixture(t),a=f.fresh(),b=f.fresh(),g=f.store.readEconomy(a).game;
 // Models a validated arena result; neither stats nor source can enter through HTTP commands.
 g.st.wins=1;g.milestoneSources.win1='earned';f.save(a,g);
 f.store.executeCommand(a,cmd('goals.claim',{args:{},expectedVersion:1}));
 assert.equal(f.store.readEconomy(a).funds.earned,50);
 let tr=f.active(a,b);tr=f.send(a,'offer',{tradeId:tr.id,revision:tr.revision,offer:{gold:50}}).trade;
 const before=f.store.readEconomy(a);
 f.store.executeCommand(a,cmd('shop.food',{args:{key:'balik'},expectedVersion:before.version}));
 assert.equal(f.store.readEconomy(a).funds.earned,50);
 f.send(a,'confirm',{tradeId:tr.id,revision:tr.revision,offerHash:tr.offerHash});
 const request=cmd('confirm',{tradeId:tr.id,revision:tr.revision,offerHash:tr.offerHash});
 assert.equal(f.store.executeTrade(b,request).trade.status,'completed');
 const other=openEconomyStore(f.file);try{assert.equal(other.executeTrade(b,request).replayed,true);}finally{other.close();}
 assert.equal(f.store.readEconomy(b).funds.earned,50);assert.equal(f.store.readEconomy(b).funds.bound,420);
 const next=f.active(a,b),snapshot=[f.store.readEconomy(a),f.store.readEconomy(b)];
 f.send(b,'cancel',{tradeId:next.id});assert.deepEqual([f.store.readEconomy(a),f.store.readEconomy(b)],snapshot);
});
test('ENG05: legacy balances and assets are quarantined, malformed source accounting fails closed',()=>{
 const g=reduceCommand(null,{type:'game.start'},{accountId:'a',seed:'t'}).game;
 delete g.funds;g.dragons[0].funding='earned';sources.ensure(g);
 assert.equal(g.funds.unknown,420);assert.equal(g.dragons[0].funding,'unknown');
 assert.throws(()=>sources.tradable(g,{gold:1,items:[],dragons:[],eggs:[],food:{}}),/gold_not_transferable/);
 g.funds.earned=1;assert.throws(()=>sources.ensure(g),/source_balance_invalid/);
});

test('ENG05: every NPC asset purchase inherits restricted funding; client source labels are rejected',()=>{
 const {validateCommand}=require('../server/economy_commands'),{validateTrade}=require('../server/trade_service');
 const env={accountId:'test',seed:'purchase-sources'};
 for(const type of ['shop.dragon','shop.egg','shop.food']) {
  const game=reduceCommand(null,{type:'game.start'},env).game;sources.credit(game,10000,'bound');
  const args=type==='shop.dragon'?{id:game.market.dragons[0].id}:type==='shop.egg'?{id:game.market.egg.id}:{key:'balik'};
  const result=reduceCommand(game,{type,args},env).game;
  assert.equal(result.funds.earned,0);
  if(type==='shop.dragon')assert.equal(result.dragons.at(-1).funding,'bound');
  if(type==='shop.egg')assert.equal(result.eggs.at(-1).funding,'bound');
  if(type==='shop.food')assert.equal(result.foodSources.balik.earned,0);
  assert.throws(()=>validateCommand(cmd(type,{expectedVersion:1,args:{...args,funding:'earned'}})),/invalid_arguments/);
 }
 assert.throws(()=>validateCommand(cmd('goals.claim',{expectedVersion:1,args:{},funds:{earned:999}})),/unknown_command_field/);
 assert.throws(()=>validateTrade(cmd('offer',{tradeId:crypto.randomUUID(),revision:1,offer:{gold:1,funding:'earned'}})),/unknown_offer_field/);
});

test('ENG05: simultaneous sale and trade reservation of the same earned asset cannot both succeed',async t=>{
 const f=fixture(t),a=f.fresh(),b=f.fresh(),game=f.store.readEconomy(a).game;
 const assetId=a+':race-item';game.inv.push({uid:game.uid++,id:'zirh1',assetId,funding:'earned'});f.save(a,game);
 const tr=f.active(a,b),{Worker}=require('node:worker_threads');
 const run=(input,economy)=>new Promise((resolve,reject)=>{
  const worker=new Worker(`const {parentPort,workerData:d}=require('node:worker_threads');const s=require(d.module).openEconomyStore(d.file);try{parentPort.postMessage({ok:true,result:s[d.economy?'executeCommand':'executeTrade'](d.actor,d.input)})}catch(e){parentPort.postMessage({ok:false,error:e.code||e.message})}finally{s.close()}`,{eval:true,workerData:{module:require.resolve('../server/economy_store'),file:f.file,actor:a,input,economy}});
  worker.on('message',resolve);worker.on('error',reject);
 });
 const results=await Promise.all([
  run(cmd('offer',{tradeId:tr.id,revision:tr.revision,offer:{items:[assetId]}}),false),
  run(cmd('item.sell',{args:{assetId},expectedVersion:1}),true),
 ]);
 assert.equal(results.filter(r=>r.ok).length,1);
 if(results[0].ok){
  const saved=results[0].result.trade;for(const id of [a,b])f.send(id,'confirm',{tradeId:saved.id,revision:saved.revision});
  assert.equal(f.store.readEconomy(b).items.filter(i=>i.assetId===assetId).length,1);
 }else assert.equal(f.store.readEconomy(b).items.length,0);
 assert.equal(f.store.readEconomy(a).items.length,0);
});
test('ENG05: shared limits, invitation rejection cooldown, presence expiry and receipt compaction keep their guarantees',t=>{
 const f=fixture(t),a=f.fresh(),b=f.fresh(),second=openEconomyStore(f.file);

 f.store.consumeRate('shared',1,60000);assert.throws(()=>second.consumeRate('shared',1,60000),/rate_limited/);
 f.store.publishPresence('lease1',{accountId:a,handle:'@a'});assert.deepEqual(second.listPeers(b),[{accountId:a,handle:'@a'}]);second.close();
 let tr=f.send(a,'invite',{targetId:b}).trade;f.send(b,'reject',{tradeId:tr.id});
 assert.throws(()=>f.send(a,'invite',{targetId:b}),/invitation_cooldown/);
 f.advance(300001);assert.deepEqual(f.store.listPeers(b),[]);tr=f.active(a,b);
 const first=cmd('confirm',{tradeId:tr.id,revision:tr.revision});f.store.executeTrade(a,first);
 const last=cmd('confirm',{tradeId:tr.id,revision:tr.revision});f.store.executeTrade(b,last);
 const before=[f.store.readEconomy(a),f.store.readEconomy(b)];
 f.advance(31*86400000);assert.ok(f.store.compactTradeReceipts()>0);assert.equal(f.store.compactTradeReceipts(),0);
 assert.equal(f.store.executeTrade(b,last).replayed,true);assert.equal(f.store.executeTrade(a,first).trade.status,'completed');
 assert.throws(()=>f.store.executeTrade(b,{...last,revision:999}),/request_id_reused/);
 assert.deepEqual([f.store.readEconomy(a),f.store.readEconomy(b)],before);assert.ok(f.store.pruneServiceState()>0);
});
