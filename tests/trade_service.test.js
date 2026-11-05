'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Worker } = require('node:worker_threads');
const { openEconomyStore } = require('../server/economy_store');
const cmd = (type, extra = {}) => ({ type, requestId: crypto.randomUUID(), ...extra });
function fixture(t) {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-trade-')), file = path.join(dir, 'db.sqlite');
 let clock = Date.now();
 const store = openEconomyStore(file, { now: () => clock });
 const raw = new DatabaseSync(file);
 const ids = [store.createGuest().accountId, store.createGuest().accountId];
 for (const id of ids) {
  store.executeCommand(id, { ...cmd('game.start'), expectedVersion: 0, args: {} });
  const game = store.readEconomy(id).game;
  game.inv.push({ uid: game.uid++, id: 'zirh1', assetId: id + ':test:item' });
  game.eggs.forEach(e => e.inK = false); game.food.balik = 5;
  raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(game), id);
 }
 t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
 const send = (actor, type, extra) => store.executeTrade(actor, cmd(type, extra));
 const invite = () => send(ids[0], 'invite', { targetId: ids[1] }).trade;
 const active = () => { const trade = invite(); return send(ids[1], 'accept', { tradeId: trade.id }).trade; };
 return { store, raw, ids, file, send, invite, active, advance() { clock += 300001; } };
}
test('SQLite trade transfers every asset kind atomically, remaps local ids and replays lost response', t => {
 const { store, ids: [a,b], send, active } = fixture(t);
 const beforeA = store.readEconomy(a), beforeB = store.readEconomy(b);
 let trade = active();
 const offer = { gold: 100, items: [beforeA.items[0].assetId], dragons: [beforeA.dragons[0].assetId], eggs: [beforeA.eggs[0].assetId], food: { balik: 2 } };
 trade = send(a, 'offer', { tradeId: trade.id, revision: trade.revision, offer }).trade;
 trade = send(b, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { gold: 20 } }).trade;
 send(a, 'confirm', { tradeId: trade.id, revision: trade.revision });
 const last = cmd('confirm', { tradeId: trade.id, revision: trade.revision });
 assert.equal(store.executeTrade(b, last).trade.status, 'completed');
 const afterA = store.readEconomy(a), afterB = store.readEconomy(b);
 assert.equal(afterA.gold, 340); assert.equal(afterB.gold, 500);
 assert.equal(afterA.dragons.length, 0); assert.equal(afterB.dragons.length, 2);
 assert.equal(afterB.items.length, 2); assert.equal(afterB.eggs.length, 2);
 assert.equal(new Set(afterB.dragons.map(d => d.data.id)).size, 2);
 assert.equal(new Set(afterB.items.map(d => d.data.uid)).size, 2);
 assert.equal(afterA.game.food.balik, 3); assert.equal(afterB.game.food.balik, 7);
 assert.equal(afterB.dragons.some(d => d.assetId === beforeA.dragons[0].assetId), true);
 assert.equal(store.executeTrade(b, last).replayed, true);
 assert.equal(send(a, 'cancel', { tradeId: trade.id }).trade.status, 'completed');
 assert.equal(send(a, 'confirm', { tradeId: trade.id, revision: trade.revision }).trade.status, 'completed');
 assert.deepEqual(store.readEconomy(a), afterA); assert.deepEqual(store.readEconomy(b), afterB);
 assert.throws(() => store.executeTrade(b, { ...last, type: 'cancel', revision: undefined }), /invalid_trade_command/);
});
test('ownership, insufficient funds, membership and stale revision fail; changed offers reset both approvals', t => {
 const { store, ids: [a,b], send, active } = fixture(t); let trade = active();
 const offer = input => send(a, 'offer', { tradeId: trade.id, revision: trade.revision, offer: input });
 assert.throws(() => offer({ gold: 421 }), /insufficient_gold/);
 assert.throws(() => offer({ dragons: [store.readEconomy(b).dragons[0].assetId] }), /dragon_not_owned/);
 assert.throws(() => send(crypto.randomUUID(), 'get', { tradeId: trade.id }), /trade_not_found/);
 trade = offer({ gold: 50 }).trade;
 send(a, 'confirm', { tradeId: trade.id, revision: trade.revision });
 const previousRevision = trade.revision;
 trade = send(b, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { food: { balik: 1 } } }).trade;
 assert.deepEqual(trade.approvals, []);
 assert.throws(() => send(a, 'confirm', { tradeId: trade.id, revision: previousRevision }), /trade_revision_conflict/);
});
test('reservations block competing trades and economy mutations; cancellation, rejection and expiry release them', t => {
 const f = fixture(t), { store, ids: [a,b], send } = f;
 let trade = f.active(); const snap = store.readEconomy(a);
 trade = send(a, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { gold: 420, dragons: [snap.dragons[0].assetId], eggs: [snap.eggs[0].assetId], items: [snap.items[0].assetId], food: { balik: 5 } } }).trade;
 assert.throws(() => send(a, 'invite', { targetId: b }), /trade_busy/);
 for (const [type,args] of [['shop.food',{key:'balik'}],['dragon.sell',{assetId:snap.dragons[0].assetId}],['item.sell',{assetId:snap.items[0].assetId}],['egg.incubate',{assetId:snap.eggs[0].assetId,enabled:true}]]) {
  assert.throws(() => store.executeCommand(a, { ...cmd(type), expectedVersion: snap.version, args }), /trade_reserved|incubator_full/);
 }
 assert.deepEqual(store.readEconomy(a), snap);
 assert.equal(send(b, 'cancel', { tradeId: trade.id }).trade.status, 'cancelled');
 trade = f.invite(); assert.equal(send(b, 'reject', {tradeId:trade.id}).trade.status,'rejected');
 trade = f.active(); f.advance(); assert.equal(send(a,'get',{tradeId:trade.id}).trade.status,'expired');
 assert.equal(f.invite().status, 'invited');
});
test('SQLite write error after first account update rolls back accounts, approvals and reservations', t => {
 const { store, raw, ids: [a,b], send, active } = fixture(t); let trade = active();
 trade = send(a,'offer',{tradeId:trade.id,revision:trade.revision,offer:{gold:40}}).trade;
 send(a,'confirm',{tradeId:trade.id,revision:trade.revision});
 const before = [store.readEconomy(a),store.readEconomy(b)];
 raw.exec("CREATE TRIGGER fail_second BEFORE UPDATE ON game_states WHEN NEW.account_id='" + b + "' BEGIN SELECT RAISE(ABORT, 'injected_failure'); END;");
 const confirm = cmd('confirm',{tradeId:trade.id,revision:trade.revision});
 assert.throws(()=>store.executeTrade(b,confirm),/injected_failure/);
 assert.deepEqual([store.readEconomy(a),store.readEconomy(b)],before);
 assert.deepEqual(send(a,'get',{tradeId:trade.id}).trade.approvals,[a]);
 raw.exec('DROP TRIGGER fail_second');
 assert.equal(store.executeTrade(b,confirm).trade.status,'completed');
});
test('independent SQLite workers race confirmation and spending without double transfer', async t => {
 const { store, file, ids:[a,b], send, active } = fixture(t); let trade=active();
 trade=send(a,'offer',{tradeId:trade.id,revision:trade.revision,offer:{gold:420}}).trade;
 send(a,'confirm',{tradeId:trade.id,revision:trade.revision});
 const input=cmd('confirm',{tradeId:trade.id,revision:trade.revision});
 const run=(actor,input,economy=false)=>new Promise((resolve,reject)=>{
  const worker=new Worker(`const {parentPort,workerData:d}=require('node:worker_threads');const s=require(d.module).openEconomyStore(d.file);try{parentPort.postMessage({ok:true,result:s[d.economy?'executeCommand':'executeTrade'](d.actor,d.input)})}catch(e){parentPort.postMessage({ok:false,error:e.message})}finally{s.close()}`,{eval:true,workerData:{module:require.resolve('../server/economy_store'),file,actor,input,economy}});
  worker.on('message',resolve);worker.on('error',reject);
 });
 const outcomes=await Promise.all([run(b,input),run(b,input),run(a,{...cmd('shop.food'),expectedVersion:1,args:{key:'balik'}},true)]);
 assert.equal(outcomes[0].ok,true);assert.equal(outcomes[1].ok,true);assert.equal(outcomes[2].ok,false);
 assert.equal(outcomes.filter(x=>x.result?.replayed).length,1);
 assert.equal(store.readEconomy(a).gold,0);assert.equal(store.readEconomy(b).gold,840);
});
test('reopening independent store recovers accepted trade and idempotency after connection loss', t => {
 const {store,file,ids:[a,b],send,active}=fixture(t); const trade=active();
 const request=cmd('offer',{tradeId:trade.id,revision:trade.revision,offer:{gold:12}});
 const first=store.executeTrade(a,request);
 const other=openEconomyStore(file);
 try {
  assert.equal(other.executeTrade(a,request).replayed,true);
  assert.equal(other.executeTrade(b,cmd('get',{tradeId:trade.id})).trade.revision,first.trade.revision);
  assert.throws(()=>other.executeTrade(a,{...request,offer:{gold:13}}),/request_id_reused/);
 } finally {other.close();}
});

test('reservation guard covers food and mutations to reserved assets for every reduced command', () => {
 const { guardReservation }=require('../server/trade_service');
 const before={gold:100,food:{balik:4},inv:[{uid:1,assetId:'i'}],dragons:[{id:1,assetId:'d',equip:{}}],eggs:[{assetId:'e',inK:false}]};
 const lock={expiresAt:100,offer:{gold:50,food:{balik:3},items:['i'],dragons:['d'],eggs:['e']}};
 for(const mutate of [g=>g.food.balik=2,g=>g.gold=49,g=>g.inv=[],g=>g.dragons[0].equip.head=1,g=>g.eggs[0].inK=true]) {
  const after=structuredClone(before);mutate(after);assert.throws(()=>guardReservation(before,after,lock,1),/trade_reserved/);
 }
 const after=structuredClone(before);after.gold=75;guardReservation(before,after,lock,1);
 after.food.balik=0;guardReservation(before,after,lock,101);
});

test('expired trade cannot release a newer reservation or complete; lineage ids remain unambiguous', t => {
 const f=fixture(t),{store,raw,ids:[a,b],send}=f;
 const game=store.readEconomy(a).game;
 game.dragons[0].pids=[77];game.lineage[77]={name:'Ancestor',pids:null,snap:{name:'Ancestor'}};
 raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(game),a);
 let old=f.active();f.advance();const next=f.invite();
 assert.equal(send(a,'confirm',{tradeId:old.id,revision:old.revision}).trade.status,'expired');
 assert.throws(()=>f.invite(),/trade_busy/);
 let trade=send(b,'accept',{tradeId:next.id}).trade;
 trade=send(a,'offer',{tradeId:trade.id,revision:trade.revision,offer:{dragons:[game.dragons[0].assetId]}}).trade;
 send(a,'confirm',{tradeId:trade.id,revision:trade.revision});send(b,'confirm',{tradeId:trade.id,revision:trade.revision});
 const received=store.readEconomy(b),dragon=received.dragons.find(d=>d.assetId===game.dragons[0].assetId).data;
 assert.equal(received.game.lineage[dragon.pids[0]].name,'Ancestor');
 assert.notEqual(dragon.pids[0],77);
});
