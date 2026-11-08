'use strict';
// ENG-11 · Oyuncular arası takas ekranı (yalnız görünüm ve akış).
// Protokol, komutlar, requestId/idempotency ve sunucu otoritesi js/trade_client.js + sunucuda; burada değişmez.
// Girişler: arkadaş satırı / oyuncu profili [data-trade-with], gelen davet bildirimi (.trade-pop), [data-open-trade].
(function(){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const NPC=new Set(['@kuzey_ruzgari','@leydi_sureyya','@altin_kervan','@firtina_beyi']);
 const KINDS=[['dragons','dragon'],['eggs','egg'],['items','item']];
 const dialog=document.createElement('dialog');dialog.className='trade-panel';dialog.setAttribute('aria-labelledby','trade-title');document.body.append(dialog);
 const pop=document.createElement('div');pop.className='trade-pop';pop.hidden=true;pop.setAttribute('role','status');document.body.append(pop);
 // Görünüm durumu (sunucu durumu client.state içindedir).
 let open=false,target=null,checking=false,returnFocus=null,lastHtml='';
 let tradeId=null,draft=null,ownKey='',step='select',drawer=false,seenOther=null,popKey='',popDismissed='';
 const messages={
  gold_not_transferable:'Başlangıç altını takas edilemez; yalnız oyunda kazandığın altını verebilirsin.',
  asset_not_transferable:'Bu varlık başlangıç hediyesi; takas edilemez.',food_not_transferable:'Bu yiyecek başlangıç hediyesi; takas edilemez.',
  insufficient_gold:'Bu kadar altının yok.',insufficient_food:'Bu kadar yiyeceğin yok.',
  item_equipped:'Bu eşya bir ejderhada takılı. Önce çıkar.',dragon_has_equipment:'Ejderhanın üstündeki eşyaları önce çıkar.',
  dragon_unavailable:'Bu ejderha şu an takasa konamaz.',egg_unavailable:'Bu yumurta şu an takasa konamaz.',item_unavailable:'Bu eşya şu an takasa konamaz.',
  trade_reserved_asset:'Bu varlık açık bir ilanda ya da başka bir takasta.',trade_reserved_food:'Bu yiyecek açık bir ilanda ya da başka bir takasta.',trade_reserved_gold:'Bu altın başka bir işlemde ayrılmış.',
  offer_too_large:'Teklif çok büyük. Birkaç şeyi çıkar.',gold_limit:'Bu kadar altın tek takasta verilemez.',food_limit:'Bu kadar yiyecek tek takasta verilemez.',
  rate_limited:'Biraz hızlı gittin. Birkaç saniye sonra yeniden dene.',trade_account_changed:'Hesabın değişti. Bilgiler yenileniyor.',
  trade_pending_retry:'Önce son işlemin sonucunu kontrol et.',trade_revision_conflict:'Teklif bu arada değişti. Yeni hâlini inceleyip yeniden onayla.',
  trade_offer_changed:'Teklif bu arada değişti. Yeni hâlini inceleyip yeniden onayla.',trade_busy:'Sen ya da karşı taraf başka bir takasta.',
  trade_not_found:'Bu takas artık yok.',invalid_trade_state:'Takas bu aşamada değil; ekran güncellendi.',trade_reservation_lost:'Teklifteki bir şey artık sende değil. Teklifini güncelle.',
  game_not_started:'Karşı tarafın takas hesabı henüz hazır değil.',guest_session_required:'Oturumun doğrulanamadı. Sayfayı yenileyip yeniden dene.',
  trade_unavailable:'Bağlantı koptu. Sonucu birazdan kontrol et.',economy_unavailable:'Takas hesabına ulaşılamadı. Biraz sonra yeniden dene.'};
 const human=code=>messages[code]||(/fetch|network|load failed/i.test(code)?messages.trade_unavailable:'Bir şeyler ters gitti. Biraz sonra yeniden dene.');
 const client=createTradeClient({onChange:render});
 window.TRADE_UI={open:()=>show(null),openWith:handle=>show(handle),isTradeable:handle=>!!handle&&!NPC.has(handle),notify:message=>client.notify(message),reconnect:()=>client.refresh()};

 /* ---------- Katalog: ham kimlik yerine ad ve görsel ---------- */
 const FOOD_EXTRA={genclik:'Ebedi Gençlik İksiri'};
 const foodName=k=>(typeof FOODS!=='undefined'&&FOODS[k]&&FOODS[k].ad)||FOOD_EXTRA[k]||'Yiyecek';
 const itemName=id=>(typeof ITEMS!=='undefined'&&ITEMS[id]&&ITEMS[id].ad)||'Eşya';
 const catalog={itemName,foodName,
  itemSlot:id=>(typeof ITEMS!=='undefined'&&ITEMS[id]&&typeof SLOT_AD!=='undefined'&&SLOT_AD[ITEMS[id].slot])||'',
  elName:el=>(typeof EL_AD!=='undefined'&&EL_AD[el])||'',stageName:s=>(typeof STAGE_AD!=='undefined'&&STAGE_AD[s])||''};
 const glyph=kind=>`<span class="tr-glyph" aria-hidden="true">${{dragon:'🐉',egg:'🥚',item:'🛡️',food:'🍖',gold:'🪙'}[kind]}</span>`;
 function art(kind,{data,itemId,foodKey}={}){
  try{
   if(kind==='dragon'&&data&&typeof dragonSVG==='function')return dragonSVG(data,{still:true});
   if(kind==='egg'&&data&&typeof eggSVG==='function')return eggSVG(data,0.6,{});
   const id=itemId||(data&&data.id);
   if(kind==='item'&&id&&typeof itemIcon==='function'&&typeof ITEMS!=='undefined'&&ITEMS[id])return itemIcon(id);
   if(kind==='food'&&typeof foodIcon==='function'){const s=foodIcon(foodKey);if(s&&!/undefined/.test(s))return s;}
  }catch(_){/* görsel alanı eksik: simgeye düş */}
  return glyph(kind);
 }
 // Uygun olmama nedeni: tek kelime + uzun açıklama (title/aria).
 const SHORT={'Ejderha artık yaşamıyor':'Yaşamıyor','Yaşlılık nedeniyle aktarılamaz':'Yaşlı','Yadigâr eşya aktarılamaz':'Yadigâr','Kilitli':'Kilitli','Bu hafta görevde':'Görevde','Kuluçkada':'Kuluçkada','Üzerinde ekipman var':'Kuşanmış','Bir ejderha kuşanmış':'Takılı','Kayıt eksik':'Kayıtsız'};
 function why(e){
  if(e.kind==='food')return e.split.earned>0?null:e.split.unknown>0?{w:'İncelemede',t:'Kaynağı henüz doğrulanmadı; takas edilemez.'}:{w:'Hediye',t:'Başlangıç hediyesi, takas edilemez.'};
  if(e.source==='bound')return{w:'Hediye',t:'Başlangıç hediyesi ya da hedef ödülü, takas edilemez.'};
  if(e.source!=='earned')return{w:'İncelemede',t:'Kaynağı henüz doğrulanmadı; takas edilemez.'};
  if(e.blocked)return{w:SHORT[e.blocked]||'Meşgul',t:e.blocked+'.'};
  return null;
 }
 // Ocak Sandığı'nın saf katalog mantığı (js/ocak_sandigi.js): sıfır adetli yiyecekleri zaten atar.
 function myEntries(s){
  const O=globalThis.OCAK_SANDIGI;if(!O||!s.economy?.game)return [];
  return O.buildEntries({economy:s.economy,mine:[],trade:null,accountId:s.accountId},catalog);
 }

 /* ---------- Teklif yardımcıları ---------- */
 const emptyOffer=()=>({gold:0,items:[],dragons:[],eggs:[],food:{}});
 const norm=o=>{o=o||emptyOffer();const food={};for(const k of Object.keys(o.food||{}).sort())if(Number(o.food[k])>0)food[k]=Number(o.food[k]);return{gold:Number(o.gold)||0,items:[...(o.items||[])].sort(),dragons:[...(o.dragons||[])].sort(),eggs:[...(o.eggs||[])].sort(),food};};
 const keyOf=o=>JSON.stringify(norm(o));
 const clone=o=>JSON.parse(JSON.stringify(norm(o)));
 const me=s=>s.accountId;
 const otherId=(s,t)=>t&&t.participants.find(id=>id!==s.accountId);
 function partnerHandle(s,t){const id=otherId(s,t);return (id&&s.peers.find(p=>p.accountId===id)?.handle)||(t&&t.participants[0]===s.accountId&&target)||'Karşı oyuncu';}
 // Satır modeli: {kind,key,id,name,sub,count,art}. Önce kendi sunucu envanterinden (tam veri), yoksa sunucunun
 // teklif etiketinden (ejderha adı / eşya katalog kimliği) çözülür. Ham kimlik ve 0 adet ekrana çıkmaz.
 const known=new Map();
 function offerRows(offer,s,entries){
  const o=norm(offer),rows=[],L=s.labels||{};
  if(o.gold)rows.push({kind:'gold',name:o.gold+' altın',art:glyph('gold')});
  for(const [key,kind]of KINDS)for(const id of o[key]){
   const e=entries.find(x=>x.assetId===id);
   if(e){const r={kind,key,id,name:e.name,sub:e.sub,art:art(kind,{data:e.data})};known.set(id,r);rows.push(r);continue;}
   if(known.has(id)){rows.push(known.get(id));continue;} // takas bitince el değiştiren varlığın adı (bu oturumda görüldüyse)
   const ref=L[id];
   if(kind==='item')rows.push({kind,key,id,name:itemName(ref),sub:catalog.itemSlot(ref),art:art('item',{itemId:ref})});
   else if(kind==='dragon')rows.push({kind,key,id,name:ref&&!/^dragons?$/.test(ref)?ref:'Ejderha',sub:'Ejderha',art:glyph('dragon')});
   else rows.push({kind,key,id,name:'Yumurta',art:glyph('egg')});
  }
  for(const [k,n]of Object.entries(o.food))rows.push({kind:'food',key:'food',id:k,name:foodName(k),count:n,art:art('food',{foodKey:k})});
  return rows;
 }
 function chips(rows,{removable=false,empty=''}={}){
  if(!rows.length)return `<p class="tr-empty">${empty}</p>`;
  return `<ul class="tr-chips">${rows.map(r=>`<li class="tr-chip k-${r.kind}"><span class="tr-art">${r.art}</span><span class="tr-nm">${esc(r.name)}${r.sub?`<small>${esc(r.sub)}</small>`:''}</span>${r.count>1?`<b class="tr-qty" aria-label="${r.count} adet">×${r.count}</b>`:''}${removable&&r.kind!=='gold'?`<button type="button" class="tr-x" data-trade="remove" data-key="${esc(r.key)}" data-id="${esc(r.id)}" aria-label="${esc(r.name)} teklifinden çıkar">✕</button>`:''}</li>`).join('')}</ul>`;
 }

 /* ---------- Açma / kapama ---------- */
 function show(handle){
  target=handle||null;open=true;drawer=false;returnFocus=document.activeElement;lastHtml='';
  if(!dialog.open)dialog.showModal();
  checking=true;render();
  dialog.querySelector('#trade-title')?.focus();
  client.refresh().finally(()=>{checking=false;render();});
  if(typeof mpConnect==='function'&&typeof MP!=='undefined'&&!MP.connected)mpConnect();
 }
 dialog.addEventListener('cancel',event=>{if(drawer){event.preventDefault();drawer=false;render();dialog.querySelector('[data-trade="add"]')?.focus();}});
 dialog.addEventListener('close',()=>{open=false;drawer=false;lastHtml='';const back=returnFocus&&returnFocus.isConnected?returnFocus:null;returnFocus=null;back?.focus();render();});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});

 /* ---------- Bildirim: yalnız olay varken (gelen davet / kapalı pencerede açık takas) ---------- */
 function renderPop(s,t){
  const live=!open&&t&&s.accountId&&(t.status==='active'||(t.status==='invited'&&t.participants[1]===s.accountId));
  const key=live?t.id+':'+t.status:'';
  if(!live||key===popDismissed){pop.hidden=true;popKey='';pop.innerHTML='';return;}
  if(key===popKey&&!pop.hidden)return;popKey=key;
  const who=esc(partnerHandle(s,t));
  pop.innerHTML=`<span>${t.status==='invited'?`🤝 <b>${who}</b> sana takas teklif ediyor`:`⇄ <b>${who}</b> ile açık bir takasın var`}</span><button type="button" data-trade-pop="open">${t.status==='invited'?'Gör':'Takasa dön'}</button><button type="button" data-trade-pop="dismiss" aria-label="Bildirimi kapat">✕</button>`;
  pop.hidden=false;
 }
 pop.addEventListener('click',event=>{const b=event.target.closest('[data-trade-pop]');if(!b)return;if(b.dataset.tradePop==='dismiss'){popDismissed=popKey;pop.hidden=true;}else{pop.hidden=true;show(null);}});

 /* ---------- Ekranlar ---------- */
 const btn=(type,label,{cls='',attrs='',dis=false}={})=>`<button type="button" class="tr-btn ${cls}" data-trade="${type}" ${attrs} ${dis?'disabled':''}>${label}</button>`;
 function stepsBar(n){return `<ol class="tr-steps" aria-label="Takas adımları">${['Seç','İncele','Onayla'].map((l,i)=>`<li class="${i+1<n?'done':i+1===n?'on':''}"${i+1===n?' aria-current="step"':''}><b aria-hidden="true">${i+1<n?'✓':i+1}</b>${l}</li>`).join('')}</ol>`;}
 function idleScreen(s,t,locked){
  let html='';
  const result={completed:'Takas tamamlandı! Aldıkların Ocak Sandığı\'nda.',cancelled:'Takas iptal edildi.',rejected:'Davet reddedildi.',expired:'Takasın süresi doldu.'}[t?.status];
  if(t&&result&&!locked)html+=`<p class="trade-result tone-${t.status==='completed'?'ok':'off'}" role="status">${t.status==='completed'?'🎉 ':''}${result}</p>`;
  if(t&&t.status==='completed'&&!locked&&t.offers){const entries=myEntries(s),got=offerRows(t.offers[otherId(s,t)],s,entries),gave=offerRows(t.offers[me(s)],s,entries);
   html+=`<section class="tr-summary" aria-label="Tamamlanan takas"><div class="tr-sum-row get"><span class="tr-sum-k">Aldın</span>${chips(got,{empty:'Hiçbir şey'})}</div><div class="tr-sum-row give"><span class="tr-sum-k">Verdin</span>${chips(gave,{empty:'Hiçbir şey'})}</div></section>`;}
  if(target){
   const peer=s.peers.find(p=>p.handle===target),who=esc(target);
   if(NPC.has(target))return{html:html+`<div class="tr-card tr-center"><p>${who} bir muhafız; onunla oyuncu takası yapılmaz.</p></div>`,foot:btn('close','Tamam',{cls:'primary'})};
   if(peer)return{html:html+`<div class="tr-card tr-center"><span class="tr-big" aria-hidden="true">🤝</span><p><b>${who}</b> ile takas yap.</p><p class="tr-mute">Davetini kabul ederse ikiniz de ne vereceğinizi seçersiniz. İkiniz onaylamadan hiçbir şey el değiştirmez.</p></div>`,
    foot:btn('invite','Takas daveti gönder',{cls:'primary',attrs:`data-target="${esc(peer.accountId)}"`,dis:locked})};
   return{html:html+`<div class="tr-card tr-center"><span class="tr-big" aria-hidden="true">🌙</span><p><b>${who}</b> şu an oyunda değil.</p><p class="tr-mute">Takas için ikinizin de aynı anda oyunda olması gerekir.</p></div>`,foot:btn('close','Tamam',{cls:'primary'})};
  }
  if(!result)html+=`<div class="tr-card tr-center"><span class="tr-big" aria-hidden="true">⇄</span><p>Açık bir takasın yok.</p><p class="tr-mute">Takası arkadaş listendeki bir oyuncudan ya da Meydan'da bir oyuncunun profilinden başlatırsın.</p></div>`;
  return {html,foot:typeof ACT!=='undefined'&&ACT['social-drawer-open']?btn('friends','Arkadaşlarımı aç',{cls:'primary'}):btn('close','Tamam',{cls:'primary'})};
 }
 function invitedScreen(s,t,locked){
  const who=esc(partnerHandle(s,t)),expires=new Date(t.expiresAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  if(t.participants[1]===s.accountId)return{html:`<div class="tr-card tr-center"><span class="tr-big" aria-hidden="true">🤝</span><p><b>${who}</b> seninle takas yapmak istiyor.</p><p class="tr-mute">Kabul edersen ikiniz de ne vereceğinizi seçersiniz. Davet ${esc(expires)} saatine kadar geçerli.</p></div>`,
   foot:btn('reject','Reddet',{cls:'ghost',dis:locked})+btn('accept','Kabul et',{cls:'primary',dis:locked})};
  return{html:`<div class="tr-card tr-center"><span class="tr-big" aria-hidden="true">📨</span><p>Davet gönderildi. <b>${who}</b> yanıt verince takas başlar.</p><p class="tr-mute">Davet ${esc(expires)} saatine kadar geçerli.</p></div>`,
   foot:btn('cancel','Daveti geri çek',{cls:'ghost',dis:locked})};
 }
 function activeScreen(s,t,locked){
  const mine=t.offers[me(s)],theirs=t.offers[otherId(s,t)],who=esc(partnerHandle(s,t));
  const changed=seenOther!==null&&seenOther!==keyOf(theirs);
  const approvedMe=t.approvals.includes(me(s)),approvedThem=t.approvals.some(p=>p!==me(s));
  const entries=myEntries(s),value=draft||mine,dirty=!!draft&&keyOf(draft)!==keyOf(mine);
  const earned=Math.max(0,Number(s.economy.funds?.earned)||0);
  if(approvedMe&&!dirty&&step!=='select')step='done';else if(step==='done')step='review';
  let html=stepsBar(step==='select'?1:step==='review'?2:3);
  if(changed)html+=`<div class="tr-band" role="alert"><span>⚠ <b>${who}</b> teklifini değiştirdi. Yeni hâline bak.</span>${btn('seen','Gördüm',{cls:'sm'})}</div>`;
  if(step==='select'){
   const gold=Number(value.gold)||0;
   html+=`<div class="tr-sides"><section class="tr-side mine" data-testid="trade-mine" aria-labelledby="tr-mine-h"><div class="tr-side-head"><h3 id="tr-mine-h">Sen veriyorsun</h3>${approvedMe&&!dirty?'<span class="tr-ok">✓ Onayladın</span>':''}</div>
    <div class="tr-gold"><label for="trade-gold">${glyph('gold')} Altın</label><div class="tr-stepper">${btn('gold','−',{attrs:'data-d="-10" aria-label="10 altın azalt"',dis:locked||!earned||gold<=0})}<input id="trade-gold" type="number" inputmode="numeric" min="0" max="${earned}" step="1" value="${gold}" ${locked||!earned?'disabled':''} aria-describedby="tr-gold-hint">${btn('gold','+',{attrs:'data-d="10" aria-label="10 altın artır"',dis:locked||!earned||gold>=earned})}</div><small id="tr-gold-hint">${earned?`En çok ${earned} altın verebilirsin.`:'Başlangıç altını takas edilemez.'}</small></div>
    ${chips(offerRows({...norm(value),gold:0},s,entries),{removable:!locked,empty:'Henüz bir şey eklemedin.'})}
    ${btn('add','＋ Ekle',{cls:'tr-add',dis:locked,attrs:'aria-haspopup="dialog"'})}
    ${dirty?'<p class="tr-dirty">Değişikliklerin henüz gönderilmedi.</p>':''}</section>
    <section class="tr-side theirs" data-testid="trade-theirs" aria-labelledby="tr-theirs-h"><div class="tr-side-head"><h3 id="tr-theirs-h">${who} veriyor</h3>${approvedThem?'<span class="tr-ok">✓ Onayladı</span>':''}</div>${chips(offerRows(theirs,s,entries),{empty:`${who} henüz bir şey eklemedi.`})}</section></div>
    <p class="tr-hint">Takasa yalnız oyunda kazandıkların girer.</p>`;
   return{html,foot:btn('cancel','Vazgeç',{cls:'ghost',dis:locked})+btn('review',dirty?'Kaydet ve incele':'İncele',{cls:'primary',dis:locked})};
  }
  html+=`<section class="tr-summary" aria-labelledby="tr-sum-h"><h3 id="tr-sum-h">Takas özeti</h3>
   <div class="tr-sum-row give" data-testid="trade-give"><span class="tr-sum-k">Veriyorsun</span>${chips(offerRows(mine,s,entries),{empty:'Hiçbir şey'})}</div>
   <div class="tr-sum-arrow" aria-hidden="true">⇅</div>
   <div class="tr-sum-row get" data-testid="trade-get"><span class="tr-sum-k">Alıyorsun</span>${chips(offerRows(theirs,s,entries),{empty:'Hiçbir şey'})}</div>
   <p class="tr-state" data-testid="trade-state">${step==='done'?`✓ Onayladın. ${approvedThem?'Takas tamamlanıyor…':`Karşı tarafın onayı bekleniyor.`}`:approvedThem?`<b>${who}</b> onayladı. Sıra sende.`:'İkiniz de onaylayınca takas tamamlanır.'}</p></section>`;
  if(step==='done')return{html,foot:btn('cancel','Vazgeç',{cls:'ghost',dis:locked})+btn('edit','Teklifimi değiştir',{dis:locked})};
  return{html,foot:btn('edit','Değiştir',{cls:'ghost',dis:locked})+btn('confirm','Onayla',{cls:'primary',dis:locked||changed})};
 }
 function drawerHtml(s,t){
  const entries=myEntries(s),value=norm(draft||t.offers[me(s)]);
  const fit=[],unfit=[];
  for(const e of entries){const r=why(e);(r?unfit:fit).push([e,r]);}
  const pick=fit.map(([e])=>{
   if(e.kind==='food'){const n=value.food[e.foodKey]||0,max=e.split.earned;return `<li class="tr-pick food"><span class="tr-art">${art('food',{foodKey:e.foodKey})}</span><span class="tr-nm">${esc(e.name)}<small>Takasa uygun: ${max}</small></span><span class="tr-stepper sm">${btn('food','−',{attrs:`data-k="${esc(e.foodKey)}" data-d="-1" aria-label="${esc(e.name)} bir azalt"`,dis:n<=0})}<output aria-label="${esc(e.name)} adedi">${n}</output>${btn('food','+',{attrs:`data-k="${esc(e.foodKey)}" data-d="1" aria-label="${esc(e.name)} bir artır"`,dis:n>=max})}</span></li>`;}
   const key=KINDS.find(([,k])=>k===e.kind)[0],on=value[key].includes(e.assetId);
   return `<li><button type="button" class="tr-pick ${on?'on':''}" data-trade="toggle" data-key="${key}" data-id="${esc(e.assetId)}" aria-pressed="${on}"><span class="tr-art">${art(e.kind,{data:e.data})}</span><span class="tr-nm">${esc(e.name)}${e.sub?`<small>${esc(e.sub)}</small>`:''}</span><span class="tr-check" aria-hidden="true">${on?'✓':'＋'}</span></button></li>`;
  }).join('');
  const out=unfit.map(([e,r])=>`<li class="tr-pick off" title="${esc(r.t)}"><span class="tr-art">${art(e.kind,{data:e.data,foodKey:e.foodKey})}</span><span class="tr-nm">${esc(e.name)}${e.count>1?` <small>×${e.count}</small>`:''}</span><span class="tr-why" aria-label="${esc(r.t)}">${esc(r.w)}</span></li>`).join('');
  return `<div class="tr-drawer" role="dialog" aria-modal="true" aria-labelledby="tr-drawer-h"><div class="tr-drawer-in">
   <div class="tr-drawer-head"><h3 id="tr-drawer-h">Takasa ekle</h3><button type="button" class="tr-icb" data-trade="drawer-close" aria-label="Seçimi kapat">✕</button></div>
   <div class="tr-drawer-body">${fit.length?`<ul class="tr-picks">${pick}</ul>`:'<p class="tr-empty">Şu an takasa uygun bir şeyin yok. Oyunda kazandıkların burada görünür.</p>'}
   ${unfit.length?`<details class="tr-unfit"><summary>Takasa uygun olmayanlar (${unfit.length})</summary><ul class="tr-picks">${out}</ul></details>`:''}</div>
   <div class="tr-drawer-foot">${btn('drawer-close','Tamam',{cls:'primary'})}</div></div></div>`;
 }

 function render(){
  const s=client.state,t=s.trade;
  renderPop(s,t);
  if(!open)return;
  // Takas değiştiyse görünüm durumunu sıfırla; kendi kayıtlı teklifin taslağa eşitlendiyse taslak düşer.
  if(tradeId!==(t?.id||null)){tradeId=t?.id||null;draft=null;step='select';seenOther=null;drawer=false;}
  const active=!!t&&t.status==='active';
  if(active){const k=keyOf(t.offers[me(s)]);if(k!==ownKey){ownKey=k;if(draft&&keyOf(draft)===k)draft=null;}}
  else drawer=false;
  const locked=s.busy||!!s.pending;
  let screen;
  if(!s.accountId)screen={html:`<div class="tr-card tr-center"><p>${s.error?esc(human(s.error)):'Takas hesabın açılıyor…'}</p></div>`,foot:s.error?btn('refresh','Yeniden dene',{cls:'primary'}):''};
  else if(!s.economy?.game)screen={html:`<div class="tr-card tr-center"><span class="tr-big" aria-hidden="true">🧰</span><p>Takas için önce takas hesabını hazırlaman gerekiyor.</p><p class="tr-mute">Oyunda kazandıkların bu hesaba yazılır; takas ve Bedesten buradan çalışır.</p></div>`,foot:btn('start','Takas hesabımı hazırla',{cls:'primary',dis:locked})};
  else if(t&&t.status==='invited')screen=invitedScreen(s,t,locked);
  else if(active)screen=activeScreen(s,t,locked);
  else if(checking&&target)screen={html:'<div class="tr-card tr-center"><p>Bakılıyor…</p></div>',foot:''};
  else screen=idleScreen(s,t,locked);
  const title=t&&['invited','active'].includes(t.status)?`${esc(partnerHandle(s,t))} ile takas`:target&&!NPC.has(target)?`${esc(target)} ile takas`:'Takas';
  const purse=s.economy?.game?`<small class="tr-purse">Ocak Kesesi <b data-testid="server-gold">${esc(s.economy.gold)} altın</b></small>`:'';
  const band=s.pending?`<div class="tr-band warn" role="alert"><span>Son işlemin sonucu henüz gelmedi.</span>${btn('retry','Sonucu kontrol et',{cls:'sm',dis:s.busy})}</div>`
   :s.error&&s.accountId?`<div class="tr-band err" role="alert"><span>${esc(human(s.error))}</span></div>`:'';
  const html=`<header class="tr-head"><div class="tr-titles"><h2 id="trade-title" tabindex="-1">${title}</h2>${purse}</div>
   <button type="button" class="tr-icb" data-trade="refresh" aria-label="Yenile" ${s.busy?'disabled':''}>⟳</button><button type="button" class="tr-icb" data-trade="close" aria-label="Takas ekranını kapat">✕</button></header>
   <div class="tr-body"><p class="tr-live" aria-live="polite">${s.busy?'Gönderiliyor…':''}</p>${band}${screen.html}</div>
   ${screen.foot?`<footer class="tr-foot">${screen.foot}</footer>`:''}${drawer&&active?drawerHtml(s,t):''}`;
  if(html===lastHtml)return; // aynı içerik: odak, imleç ve kaydırma olduğu gibi kalır
  const ae=document.activeElement;let focusSel='';
  if(ae&&dialog.contains(ae)){if(ae.id)focusSel='#'+CSS.escape(ae.id);else if(ae.dataset.trade)focusSel=`[data-trade="${ae.dataset.trade}"]`+['id','k','d','key'].filter(k=>ae.dataset[k]).map(k=>`[data-${k}="${CSS.escape(ae.dataset[k])}"]`).join('');}
  const caret=ae&&ae.id==='trade-gold'?ae.value.length:null;
  const scrollBody=dialog.querySelector('.tr-body')?.scrollTop||0,scrollDrawer=dialog.querySelector('.tr-drawer-body')?.scrollTop||0;
  const unfitOpen=!!dialog.querySelector('.tr-unfit')?.open;
  lastHtml=html;dialog.innerHTML=html;
  if(unfitOpen)dialog.querySelector('.tr-unfit')?.setAttribute('open','');
  const b=dialog.querySelector('.tr-body');if(b)b.scrollTop=scrollBody;const d=dialog.querySelector('.tr-drawer-body');if(d)d.scrollTop=scrollDrawer;
  if(focusSel){const el=dialog.querySelector(focusSel);if(el&&!el.disabled){el.focus();if(caret!=null)try{el.setSelectionRange(caret,caret);}catch(_){}}else (drawer?dialog.querySelector('.tr-drawer [data-trade="drawer-close"]'):dialog.querySelector('#trade-title'))?.focus();}
 }

 /* ---------- Taslak düzenleme (yalnız istemcide; kaydetme mevcut 'offer' komutudur) ---------- */
 function editDraft(fn){const t=client.state.trade;if(!t)return;draft=clone(draft||t.offers[me(client.state)]);fn(draft);draft=norm(draft);render();}
 const maxGold=()=>Math.max(0,Number(client.state.economy?.funds?.earned)||0);
 dialog.addEventListener('input',event=>{if(event.target.id!=='trade-gold')return;const raw=Math.floor(Number(event.target.value)||0);editDraft(o=>{o.gold=Math.min(maxGold(),Math.max(0,raw));});});
 dialog.addEventListener('click',async event=>{
  const el=event.target.closest('[data-trade]');if(!el||el.disabled)return;
  const type=el.dataset.trade,s=client.state,t=s.trade;
  if(type==='close'){dialog.close();return;}
  if(type==='refresh'){await client.refresh();return;}
  if(type==='start'){await client.start();return;}
  if(type==='retry'){await client.retry();return;}
  if(type==='friends'){dialog.close();ACT['social-drawer-open']();return;}
  if(type==='add'){drawer=true;render();dialog.querySelector('.tr-drawer .tr-pick:not(.off),.tr-drawer [data-trade="drawer-close"]')?.focus();return;}
  if(type==='drawer-close'){drawer=false;render();dialog.querySelector('[data-trade="add"]')?.focus();return;}
  if(type==='invite'){try{await client.send('invite',{targetId:el.dataset.target});}catch(_){}return;}
  if(!t)return;
  if(type==='seen'){seenOther=keyOf(t.offers[otherId(s,t)]);render();return;}
  if(type==='edit'){step='select';render();dialog.querySelector('#trade-gold:not(:disabled)')?.focus();return;}
  if(type==='gold'){const d=Number(el.dataset.d);editDraft(o=>{o.gold=Math.min(maxGold(),Math.max(0,(Number(o.gold)||0)+d));});return;}
  if(type==='toggle'){const {key,id}=el.dataset;editDraft(o=>{o[key]=o[key].includes(id)?o[key].filter(x=>x!==id):[...o[key],id];});return;}
  if(type==='remove'){const {key,id}=el.dataset;editDraft(o=>{if(key==='food')delete o.food[id];else o[key]=o[key].filter(x=>x!==id);});return;}
  if(type==='food'){const k=el.dataset.k,d=Number(el.dataset.d),e=myEntries(s).find(x=>x.kind==='food'&&x.foodKey===k);editDraft(o=>{o.food[k]=Math.min(e?e.split.earned:0,Math.max(0,(o.food[k]||0)+d));});return;}
  if(type==='review'){
   if(draft&&keyOf(draft)!==keyOf(t.offers[me(s)])){try{await client.send('offer',{tradeId:t.id,revision:t.revision,offer:norm(draft)});draft=null;}catch(_){return;}}
   const now=client.state.trade;if(!now||now.status!=='active')return;
   step='review';seenOther=keyOf(now.offers[otherId(client.state,now)]);render();dialog.querySelector('#trade-title')?.focus();return;
  }
  if(['accept','reject','cancel','confirm'].includes(type))try{await client.send(type,{tradeId:t.id,...(type==='confirm'?{revision:t.revision,offerHash:t.offerHash}:{})});}catch(_){}
 });
 // Mobilde klavye açılınca odaktaki alan görünür kalsın.
 dialog.addEventListener('focusin',event=>{if(event.target.matches('input'))setTimeout(()=>event.target.scrollIntoView?.({block:'center'}),250);});
 document.addEventListener('click',event=>{const w=event.target.closest('[data-trade-with]');if(w){event.preventDefault();show(w.dataset.tradeWith);return;}if(event.target.closest('[data-open-trade]'))show(null);});
 setInterval(()=>{if(open)client.refresh();},5000);
})();
