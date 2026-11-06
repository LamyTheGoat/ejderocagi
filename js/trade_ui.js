'use strict';
(function(){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dialog=document.createElement('dialog');dialog.className='trade-panel';dialog.setAttribute('aria-label','Oyuncular arası takas');document.body.append(dialog);
 const entry=document.createElement('button');entry.className='trade-entry';entry.textContent='⇄ Takas';entry.type='button';document.body.append(entry);
 let open=false,draft=null,draftRevision=null,returnFocus=null,lastTrade=null;
 const messages={trade_account_changed:'Hesap değişti. Bilgiler yeniden doğrulanıyor.',trade_pending_retry:'Önce bekleyen işlemin sonucunu doğrula.',trade_revision_conflict:'Teklif değişti. Güncel teklifi inceleyip yeniden onayla.',trade_offer_changed:'Teklif içeriği değişti. Yeniden incele.',trade_busy:'Oyunculardan birinin açık takası var.',game_not_started:'İki oyuncu da sunucu hesabını hazırlamalı.',insufficient_gold:'Sunucu hesabında yeterli altın yok.',trade_unavailable:'Sunucuya ulaşılamadı. Sonuç henüz doğrulanmadı.'};
 const client=createTradeClient({onChange:render});window.TRADE_UI={open:show,notify:message=>client.notify(message),reconnect:()=>client.refresh()};
 function show(){open=true;returnFocus=document.activeElement;if(!dialog.open)dialog.showModal();render();dialog.querySelector('button')?.focus();client.refresh();if(typeof mpConnect==='function')mpConnect();}
 entry.addEventListener('click',show);
 dialog.addEventListener('close',()=>{open=false;draft=null;returnFocus?.focus();});
 function offerText(offer,state){return `<b>${offer.gold} altın</b><ul>${['items','dragons','eggs'].flatMap(kind=>offer[kind].map(id=>`<li>${esc(state.labels[id]||id)}</li>`)).join('')}${Object.entries(offer.food).filter(([,n])=>n).map(([key,n])=>`<li>${esc(key)} × ${n}</li>`).join('')}</ul>`;}
 function render(){
  const s=client.state,t=s.trade;
  entry.textContent=t&&['invited','active'].includes(t.status)?'⇄ Takas •':'⇄ Takas';
  if(!open)return;
  if(lastTrade!==t?.id||draftRevision!==t?.revision){draft=null;draftRevision=t?.revision;lastTrade=t?.id;}
  const focus=document.activeElement?.id,selection=document.activeElement?.selectionStart,inventoryOpen=!!dialog.querySelector('#trade-inventory')?.open;
  const disabled=s.busy||!!s.pending||!!s.error;
  let body='';
  if(!s.accountId)body='<p>Sunucu hesabı doğrulanıyor…</p>';
  else if(!s.economy?.game)body='<p>Bu hesabın sunucu envanteri henüz oluşturulmadı.</p><button data-trade="start">Sunucu hesabını hazırla</button>';
  else {
   body+=`<section><h3>Sunucu envanterin</h3><p data-testid="server-gold">${s.economy.gold} altın</p><p>${s.economy.dragons.length} ejderha · ${s.economy.items.length} eşya · ${s.economy.eggs.length} yumurta</p></section>`;
   body+=`<details id="trade-inventory" ${inventoryOpen?'open':''}><summary>Sunucu varlıklarını göster</summary><ul>${['items','dragons','eggs'].flatMap(kind=>s.economy[kind].map(asset=>`<li>${esc(asset.data.name||asset.data.id||kind)}</li>`)).join('')}${Object.entries(s.economy.game.food||{}).map(([key,n])=>`<li>${esc(key)} × ${n}</li>`).join('')}</ul></details>`;
   if(!t||!['invited','active'].includes(t.status)){
    if(t&&!disabled)body+=`<p class="trade-result" role="status">${({completed:'Takas tamamlandı. Sunucu envanterin güncellendi.',cancelled:'Takas iptal edildi.',rejected:'Davet reddedildi.',expired:'Takasın süresi doldu.'})[t.status]||esc(t.status)}</p>`;
    body+=`<h3>Çevrimiçi oyuncular</h3>${s.peers.length?s.peers.map(p=>`<div class="trade-peer"><span>${esc(p.handle)}</span><button data-trade="invite" data-target="${esc(p.accountId)}" ${disabled?'disabled':''}>Takas teklif et</button></div>`).join(''):'<p>Henüz başka bir oyuncu bağlı değil. Diğer oyuncu da Takas ekranını açabilir.</p>'}`;
   } else {
    body+=`<p>Karşı hesap: ${esc(s.peers.find(p=>p.accountId===t.participants.find(id=>id!==s.accountId))?.handle||t.participants.find(id=>id!==s.accountId))}</p><p>Son geçerlilik: ${esc(new Date(t.expiresAt).toLocaleTimeString('tr-TR'))} — sunucu tarafından denetlenir.</p>`;
    if(t.status==='invited')body+=t.participants[1]===s.accountId?'<p>Takas daveti aldın.</p><button data-trade="accept">Kabul et</button><button data-trade="reject">Reddet</button>':'<p>Davet gönderildi; karşı oyuncu bekleniyor.</p>';
    else {
     const own=t.offers[s.accountId],other=t.offers[t.participants.find(p=>p!==s.accountId)];
     body+=`<div class="trade-columns"><section><h3>Kaydedilen teklifin</h3>${offerText(own,s)}<p>${t.approvals.includes(s.accountId)?'Onayladın':'Onayın bekleniyor'}</p></section><section><h3>Karşı teklif</h3>${offerText(other,s)}<p>${t.approvals.some(p=>p!==s.accountId)?'Karşı oyuncu onayladı':'Karşı onay bekleniyor'}</p></section></div>`;
     const value=draft||own;
     body+=`<form id="trade-offer"><fieldset ${disabled?'disabled':''}><legend>Teklifini düzenle</legend><label>Altın <input id="trade-gold" name="gold" type="number" min="0" max="${s.economy.gold}" step="1" value="${value.gold}"></label>`;
     for(const kind of ['items','dragons','eggs'])for(const asset of s.economy[kind]){
      const d=asset.data,unavailable=d.tradeLocked||d.heirloomId||d.dead||d.old||d.task||d.busy||d.inK||d.hatching||(kind==='dragons'&&Object.values(d.equip||{}).some(v=>v!=null))||(kind==='items'&&s.economy.dragons.some(dr=>Object.values(dr.data.equip||{}).includes(d.uid)));
      body+=`<label class="trade-asset"><input type="checkbox" name="${kind}" value="${esc(asset.assetId)}" ${value[kind].includes(asset.assetId)?'checked':''} ${unavailable?'disabled':''}>${esc(d.name||d.id||kind)}${unavailable?' (şu anda aktarılamaz)':''}</label>`;
     }
     for(const [key,count]of Object.entries(s.economy.game.food||{}))if(count>0)body+=`<label>${esc(key)} (${count}) <input id="trade-food-${esc(key)}" name="food:${esc(key)}" type="number" min="0" max="${count}" step="1" value="${value.food[key]||0}"></label>`;
     body+=`<button type="submit">Teklifi kaydet</button></fieldset></form><p>${draft?'Kaydedilmemiş değişikliklerin var.':'Onay, yukarıdaki iki kayıtlı teklifi kapsar.'}</p><button data-trade="confirm" ${disabled||draft||t.approvals.includes(s.accountId)?'disabled':''}>İki teklifi onayla</button>`;
    }
    body+='<button data-trade="cancel">Takası iptal et</button>';
   }
  }
  dialog.innerHTML=`<header><h2>Oyuncular arası takas</h2><button data-trade="close" aria-label="Takas ekranını kapat">✕</button></header><p class="trade-notice">Bu ekran sunucu hesabını kullanır. Yerel oyundaki altın ve varlıklar ayrıdır; otomatik aktarılmaz.</p><small>${esc(s.handle)}</small><div aria-live="polite">${s.busy?'Sunucudan yanıt bekleniyor…':s.error?esc(messages[s.error]||'İşlem doğrulanamadı: '+s.error):''}${s.pending?'<p>Bekleyen işlemin sonucu doğrulanmalı.</p><button data-trade="retry">Sonucu doğrula / yeniden dene</button>':''}</div>${body}<footer><button data-trade="refresh">Sunucudan yenile</button></footer>`;
  dialog.querySelectorAll('button').forEach((button,i)=>{button.id='trade-button-'+(button.dataset.trade||'submit')+'-'+(button.dataset.target||i);});
  if(disabled)dialog.querySelectorAll('[data-trade="confirm"],[data-trade="invite"],[data-trade="accept"],[data-trade="reject"],[data-trade="cancel"]').forEach(el=>el.disabled=true);
  if(focus){const el=document.getElementById(focus);if(el){el.focus();try{el.setSelectionRange(selection,selection);}catch(_){}}}
 }
 function readDraft(){const f=dialog.querySelector('form');if(!f)return null;const data=new FormData(f),offer={gold:Number(data.get('gold')),items:data.getAll('items'),dragons:data.getAll('dragons'),eggs:data.getAll('eggs'),food:{}};for(const [key,v]of data)if(key.startsWith('food:')&&Number(v))offer.food[key.slice(5)]=Number(v);return offer;}
 dialog.addEventListener('input',()=>{draft=readDraft();const confirm=dialog.querySelector('[data-trade="confirm"]');if(confirm)confirm.disabled=true;});
 dialog.addEventListener('submit',async event=>{event.preventDefault();draft=readDraft();try{await client.send('offer',{tradeId:client.state.trade.id,revision:client.state.trade.revision,offer:draft});draft=null;render();}catch(_){}});
 dialog.addEventListener('click',async event=>{const el=event.target.closest('[data-trade]');if(!el)return;const type=el.dataset.trade,t=client.state.trade;
  if(type==='close'){dialog.close();return;}if(type==='refresh'){await client.refresh();return;}if(type==='start'){await client.start();return;}if(type==='retry'){await client.retry();return;}
  try{await client.send(type,type==='invite'?{targetId:el.dataset.target}:{tradeId:t.id,...(type==='confirm'?{revision:t.revision,offerHash:t.offerHash}:{})});}catch(_){}
 });
 document.addEventListener('click',event=>{if(event.target.closest('[data-open-trade]'))show();});
 setInterval(()=>{if(open)client.refresh();},5000);
})();
