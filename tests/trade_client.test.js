'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createTradeClient}=require('../js/trade_client');
function setup(){
 let account='a',stateVersion=1,purchases=0,drop=false;const sent=[];const memory=new Map();
 const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 const request=async(url,options={})=>{
  if(url==='/api/session')return{ok:true,json:async()=>({accountId:account,handle:'@'+account})};
  if(options.headers?.['X-Trade-Account']!==account)return{ok:false,status:409,json:async()=>({error:'trade_account_changed'})};
  if(url==='/api/trade/peers')return{ok:true,json:async()=>({peers:[]})};
  if(url==='/api/trade/state')return{ok:true,json:async()=>({accountId:account,trade:{id:'trade',participants:[account,'other'],stateVersion,status:'active'},economy:{version:stateVersion,game:{},gold:420}})};
  sent.push(JSON.parse(options.body));purchases++;if(drop)throw new Error('network');
  return{ok:true,json:async()=>({trade:{id:'trade',stateVersion:0,status:'completed'},replayed:true})};
 };
 const client=createTradeClient({fetch:request,storage,uuid:()=>String(sent.length+1)});
 return{client,sent,storage,request,setAccount:v=>account=v,setVersion:v=>stateVersion=v,setDrop:v=>drop=v};
}
test('old WebSocket messages and replay response cannot manufacture completed UI state',async()=>{
 const f=setup();await f.client.refresh();f.setVersion(8);await f.client.refresh();
 f.setVersion(2);await f.client.notify({type:'trade_state',trade:{status:'completed',stateVersion:2}});
 assert.equal(f.client.state.trade.stateVersion,8);assert.equal(f.client.state.trade.status,'active');
 await f.client.send('confirm',{tradeId:'trade',revision:0});
 assert.equal(f.client.state.trade.status,'active');
});
test('ambiguous response persists exact request; account switch never retries another account command',async()=>{
 const f=setup();await f.client.refresh();f.setDrop(true);
 await assert.rejects(f.client.send('confirm',{tradeId:'trade',revision:0}),/network/);
 assert.ok(f.client.state.pending);const original=f.sent[0];f.setDrop(false);await f.client.retry();assert.deepEqual(f.sent[1],original);
 f.setDrop(true);await assert.rejects(f.client.send('cancel',{tradeId:'trade'}));const count=f.sent.length;
 f.setAccount('b');await f.client.retry();assert.equal(f.sent.length,count);assert.equal(f.client.state.accountId,'b');assert.equal(f.client.state.pending,null);
});
