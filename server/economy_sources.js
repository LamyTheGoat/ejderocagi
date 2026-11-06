'use strict';
// Server-only provenance. Never accept these fields from command payloads.
const SOURCES = ['bound', 'unknown', 'earned'];
function fail(code) { throw Object.assign(new Error(code), {code, status:409}); }
const counts = n => Number.isSafeInteger(n) && n >= 0;
const bucket = (n, source) => ({bound:0, unknown:0, earned:0, [source]:n});
function check(b, total) {
 if (!b || !SOURCES.every(k=>counts(b[k])) || SOURCES.reduce((s,k)=>s+b[k],0)!==total) fail('source_balance_invalid');
}
function ensure(game, initial = false) {
 const migrating=!game.funds;
 const source=initial?'bound':'unknown';
 if (!game.funds) {
  if (!counts(game.gold)) fail('legacy_balance_review_required');
  game.funds={schema:1,...bucket(game.gold,source)};
  game.foodSources=Object.fromEntries(Object.entries(game.food).map(([k,n])=>[k,bucket(n,source)]));
  game.milestoneSources={};
 }
 if(game.funds.schema!==1)fail('source_schema_invalid');
 check(game.funds,game.gold);
 for(const rows of [game.inv,game.dragons,game.eggs])for(const row of rows){
  if(migrating)row.funding=source;else row.funding ||= source;
  if(!SOURCES.includes(row.funding))fail('asset_source_invalid');
 }
 game.foodSources ||= {};
 for(const [k,n]of Object.entries(game.food)) {
  game.foodSources[k] ||= bucket(n,source);check(game.foodSources[k],n);
 }
 game.milestoneSources ||= {};
 return game;
}
function credit(game, amount, source) {
 if(!counts(amount)||!SOURCES.includes(source))fail('invalid_credit_source');
 game.funds[source]+=amount;game.gold+=amount;check(game.funds,game.gold);
}
function spend(game, amount) {
 if(!counts(amount))fail('invalid_server_price');
 if(game.gold<amount)fail('insufficient_gold');
 const debit=bucket(0,'bound');let left=amount;
 for(const k of SOURCES){debit[k]=Math.min(left,game.funds[k]);game.funds[k]-=debit[k];left-=debit[k];}
 game.gold-=amount;return debit;
}
function sourceOf(debit) {return debit.unknown>0?'unknown':debit.bound>0?'bound':'earned';}
function combine(sources) {return sources.includes('unknown')?'unknown':sources.includes('bound')?'bound':'earned';}
function addFood(game,key,amount,source) {
 game.foodSources[key] ||= bucket(0,'earned');game.foodSources[key][source]+=amount;
 game.food[key]=(game.food[key]||0)+amount;
}
function tradable(game,offer) {
 ensure(game);
 if(offer.gold>game.gold)fail('insufficient_gold');
 if(offer.gold>game.funds.earned)fail('gold_not_transferable');
 for(const [kind,rows]of [['items',game.inv],['dragons',game.dragons],['eggs',game.eggs]])
  for(const id of offer[kind]){const row=rows.find(a=>a.assetId===id);if(row&&row.funding!=='earned')fail('asset_not_transferable');}
 for(const [key,n]of Object.entries(offer.food))if(n>(game.foodSources[key]?.earned||0))fail('food_not_transferable');
}
function goalSource(game,id) {
 if(id==='yuva')return combine(game.grid.filter(t=>t.b==='yuva').map(t=>t.funding||'unknown'));
 if(id==='kulucka')return combine([...game.eggs.filter(e=>e.inK).map(e=>e.funding),...game.grid.filter(t=>t.b==='kulucka').map(t=>t.funding||'unknown'),game.milestoneSources.hatch||'earned']);
 if(id==='acq')return game.milestoneSources.acq||'unknown';
 if(id==='gen2'||id==='mark')return combine(game.dragons.map(d=>d.funding));
 if(id==='un25'||id==='un45')return game.milestoneSources.renown||'unknown';
 // Existing gameplay statistics have no authenticated advancing command yet.
 // A future validated reward producer must record its source explicitly.
 return game.milestoneSources[id]||'unknown';
}
module.exports={ensure,credit,spend,sourceOf,combine,addFood,tradable,goalSource,bucket};
