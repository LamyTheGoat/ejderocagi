'use strict';
(function(root){
 function createTradeClient({fetch:request=root.fetch.bind(root),storage=root.localStorage,uuid=()=>root.crypto.randomUUID(),onChange=()=>{}}={}) {
  let accountId=null,handle='',trade=null,economy=null,labels={},peers=[],pending=null,busy=false,error='',epoch=0,refreshing=null,serial=0;
  const emit=()=>onChange(api.state);
  const key=id=>'eo-trade-pending:'+id;
  const persist=()=>{try{if(pending)storage.setItem(key(accountId),JSON.stringify(pending));else storage.removeItem(key(accountId));}catch(_){}};
  async function json(url,options={}) {const r=await request(url,{credentials:'same-origin',...options});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'trade_unavailable'),{status:r.status});return data;}
  async function session(){
   const bootstrap=()=>json('/api/session',{method:'POST'});
   const data=await (root.navigator?.locks?root.navigator.locks.request('eo-guest-bootstrap',bootstrap):bootstrap());
   if(accountId!==data.accountId){epoch++;accountId=data.accountId;handle=data.handle;trade=null;economy=null;labels={};peers=[];pending=null;
    try{const saved=JSON.parse(storage.getItem(key(accountId))||'null');if(saved?.accountId===accountId)pending=saved;}catch(_){}
   }
  }
  async function refresh(){
   if(refreshing)return refreshing;
   refreshing=(async()=>{try{
    await session();const captured=epoch,id=accountId,order=++serial;
    const [data,list]=await Promise.all([json('/api/trade/state',{headers:{'X-Trade-Account':id}}),json('/api/trade/peers',{headers:{'X-Trade-Account':id}})]);
    if(captured!==epoch||order!==serial||data.accountId!==accountId)return;
    if(!trade||!data.trade||trade.id!==data.trade.id||(data.trade.stateVersion||0)>=(trade.stateVersion||0)){trade=data.trade;labels=data.labels||{};}
    if(!economy||(data.economy?.version||0)>=economy.version)economy=data.economy;
    peers=list.peers;error='';
   }catch(e){error=e.message;}finally{refreshing=null;emit();}})();return refreshing;
  }
  async function send(type,extra={}){
   if(busy)throw new Error('trade_busy');
   const expectedAccount=accountId;
   busy=true;error='';emit();
   try{
    await session();if(expectedAccount!==accountId)throw new Error('trade_account_changed');
    if(pending)throw new Error('trade_pending_retry');
    pending={accountId,command:{type,requestId:uuid(),...extra}};persist();
    return await transmit();
   }catch(e){error=e.message;throw e;}finally{busy=false;emit();}
  }
  async function transmit(){
   const captured=epoch,id=accountId,command=pending.command;
   try{
    await json('/api/trade',{method:'POST',headers:{'Content-Type':'application/json','X-Trade-Account':id},body:JSON.stringify(command)});
    if(captured!==epoch)return;
    pending=null;persist();await refresh();
   }catch(e){if(captured===epoch&&e.status>=400&&e.status<500){pending=null;persist();await refresh();}throw e;}
  }
  async function retry(){
   if(busy)return;const expected=accountId;busy=true;emit();
   try{await session();if(expected!==accountId)throw new Error('trade_account_changed');if(!pending)throw new Error('no_pending_command');await transmit();}
   catch(e){error=e.message;}finally{busy=false;emit();}
  }
  async function start(){
   if(busy)return;const expected=accountId;busy=true;emit();
   try{await session();if(expected!==accountId)throw new Error('trade_account_changed');
    if(!economy)throw new Error('economy_unavailable');
    await json('/api/economy/command',{method:'POST',headers:{'Content-Type':'application/json','X-Trade-Account':accountId},body:JSON.stringify({type:'game.start',requestId:uuid(),expectedVersion:economy.version,args:{}})});await refresh();
   }catch(e){error=e.message;await refresh();error=e.message;}finally{busy=false;emit();}
  }
  const api={refresh,send,retry,start,notify(message){if(message?.type==='trade_state'||message?.type==='trade_error')return refresh();},get state(){return{accountId,handle,trade,economy,labels,peers,pending,busy,error};}};return api;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={createTradeClient};else root.createTradeClient=createTradeClient;
})(typeof globalThis!=='undefined'?globalThis:this);
