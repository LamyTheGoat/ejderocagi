'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=process.env.QA_RULES_ROOT||path.resolve(__dirname,'..');
const {reduceCommand}=require(path.join(root,'server/economy_commands'));
const {openEconomyStore}=require(path.join(root,'server/economy_store'));
const {DatabaseSync}=require('node:sqlite');
const ids=['kulucka','train','win1','talk','acq','fav','mark','yuva','aff','bred','un25','gen2','un45'];
const env={accountId:'qa',seed:'qa-independent'};
function eligible(source){
 const g=reduceCommand(null,{type:'game.start'},env).game;
 g.goals=[];Object.assign(g.st,{hatch:1,train:1,wins:1,talk:1,feed:1,acq:1,fav:1,bred:1});
 g.un=45;g.aff={qa:60};g.dragons[0].gen=2;g.dragons[0].pers.ces=45;
 g.grid.find(t=>t.open&&!t.b).b='yuva';
 for(const t of g.grid)if(t.b)t.funding=source;
 for(const d of g.dragons)d.funding=source;
 g.milestoneSources=Object.fromEntries([...ids,'hatch','renown'].map(id=>[id,source]));
 return g;
}
for(const source of ['earned','bound','unknown'])test('QA independent: all 13 actual payouts and repeated claims, input '+source,()=>{
 const g=eligible(source),before=g.gold,earned=g.funds.earned;
 const r=reduceCommand(g,{type:'goals.claim',args:{}},env);
 assert.deepEqual(Array.from(r.result.goals,x=>x.id),ids);
 assert.equal(r.result.goals.reduce((n,x)=>n+x.gold,0),720);
 for(const reward of r.result.goals)assert.equal(reward.source,source==='unknown'?'unknown':'bound',reward.id);
 assert.equal(r.game.gold,before+720);assert.equal(r.game.funds.earned,earned);
 const again=reduceCommand(r.game,{type:'goals.claim',args:{}},env);
 assert.equal(again.result.goals.length,0);assert.equal(again.game.gold,r.game.gold);
});
test('QA independent: legacy source labels cannot grant earned gold',()=>{
 const g=eligible('earned');delete g.funds;delete g.foodSources;
 const r=reduceCommand(g,{type:'goals.claim',args:{}},env);
 assert.equal(r.result.goals.length,13);assert.equal(r.game.funds.earned,0);
 assert.ok(r.result.goals.every(x=>x.source!=='earned'));
 assert.ok(r.game.dragons.every(d=>d.funding==='unknown'));
});
test('QA independent: simultaneous goal claims commit exactly one payout, then replay safely',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eo-independent-')),file=path.join(dir,'qa.sqlite');
 const store=openEconomyStore(file),db=new DatabaseSync(file);
 t.after(()=>{db.close();store.close();fs.rmSync(dir,{recursive:true,force:true});});
 const actor=store.createGuest().accountId;
 store.executeCommand(actor,{requestId:crypto.randomUUID(),expectedVersion:0,type:'game.start',args:{}});
 db.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(eligible('earned')),actor);
 const inputs=[0,1].map(()=>({requestId:crypto.randomUUID(),expectedVersion:1,type:'goals.claim',args:{}}));
 const {Worker}=require('node:worker_threads');
 const results=await Promise.all(inputs.map(input=>new Promise((resolve,reject)=>{
  const w=new Worker(`const{parentPort,workerData:d}=require('node:worker_threads');const s=require(d.module).openEconomyStore(d.file);try{const r=s.executeCommand(d.actor,d.input);parentPort.postMessage({ok:true,count:r.result.goals.length});}catch(e){parentPort.postMessage({ok:false,error:e.code||e.message});}finally{s.close();}`,{eval:true,workerData:{module:path.join(root,'server/economy_store'),file,actor,input}});
  w.on('message',resolve);w.on('error',reject);
 })));
 assert.equal(results.filter(r=>r.ok).length,1);assert.equal(results.find(r=>r.ok).count,13);
 assert.ok(results.filter(r=>!r.ok).every(r=>['version_conflict','database is locked'].includes(r.error)));
 const winner=results.findIndex(r=>r.ok);assert.equal(store.executeCommand(actor,inputs[winner]).replayed,true);
 const after=store.readEconomy(actor);assert.equal(after.gold,1140);assert.equal(after.funds.earned,0);
 const next=store.executeCommand(actor,{requestId:crypto.randomUUID(),expectedVersion:2,type:'goals.claim',args:{}});
 assert.equal(next.result.goals.length,0);assert.equal(next.economy.gold,1140);
});


test('QA independent: unknown gold survives item/dragon/egg purchase, hatch and resale without promotion',()=>{
 for(const type of ['shop.item','shop.dragon','shop.egg']){
  let g=reduceCommand(null,{type:'game.start'},env).game;
  g.gold=10000;g.funds={schema:1,bound:0,unknown:10000,earned:0};
  g.flags.smith=true;g.smith=['zirh1'];
  const args=type==='shop.item'?{key:'zirh1'}:type==='shop.dragon'?{id:g.market.dragons[0].id}:{id:g.market.egg.id};
  g=reduceCommand(g,{type,args},env).game;
  let asset=type==='shop.item'?g.inv.at(-1):type==='shop.dragon'?g.dragons.at(-1):g.eggs.at(-1);
  assert.equal(asset.funding,'unknown');assert.equal(g.funds.earned,0);
  let sell=type==='shop.item'?'item.sell':'dragon.sell';
  if(type==='shop.egg'){
   const tile=g.grid.findIndex(t=>t.open&&!t.b);
   g=reduceCommand(g,{type:'building.buy',args:{kind:'kulucka',tile}},env).game;
   asset=g.eggs.find(e=>e.assetId===asset.assetId);asset.inK=true;asset.w=2;
   g=reduceCommand(g,{type:'egg.hatch',args:{assetId:asset.assetId}},env).game;
   asset=g.dragons.at(-1);assert.equal(asset.funding,'unknown');
  }
  g=reduceCommand(g,{type:sell,args:{assetId:asset.assetId}},env).game;
  assert.equal(g.funds.earned,0);
  const sources=require(path.join(root,'server/economy_sources'));
  assert.throws(()=>sources.tradable(g,{gold:1,items:[],dragons:[],eggs:[],food:{}}),/gold_not_transferable/);
 }
});

test('QA independent: historical earned goal credits remain earned; claims do not reconcile history',()=>{
 const g=eligible('earned');g.goals=[...ids];g.gold+=60;g.funds.earned+=60;
 const r=reduceCommand(g,{type:'goals.claim',args:{}},env);
 assert.equal(r.result.goals.length,0);assert.equal(r.game.funds.earned,60);
 const sources=require(path.join(root,'server/economy_sources'));
 assert.doesNotThrow(()=>sources.tradable(r.game,{gold:60,items:[],dragons:[],eggs:[],food:{}}));
});
