'use strict';
/* ============ EJDER OCAĞI — MÜZAYEDE ============
   Her hafta üç nadir lot. Açık artırma gerçek zamanlıdır: rakip teklif verince tokmakçı "Bir… İki…" sayar;
   araya girip artırmazsan "Satıldı!". Kendi ejderhanı da müzayedeye çıkarabilirsin (%10 komisyon). */

const BIDDERS = [
  { id: 'demirhan', ad: 'Demirhan', npc: 'demirhan', hirs: 1.18, eager: .85, like: { dragon: 1.15, egg: .9, item: 1.05 }, says: ['Bu benim olacak.', 'Bir köylüye bırakmam!', 'Artırıyorum.'] },
  { id: 'rustem', ad: 'Çukur Ağası Rüstem', npc: 'cukur', hirs: 1.25, eager: .6, like: { dragon: 1.2, egg: .8, item: 1.15 }, says: ['Çukura yakışır.', 'Param çok, sabrım az.', 'Hah!'] },
  { id: 'muhtar', ad: 'Muhtar', npc: 'muhtar', hirs: .95, eager: .45, like: { dragon: .95, egg: 1.1, item: .9 }, says: ['Köyün hayrına...', 'Biraz daha...', 'Eh, olsun bakalım.'] },
  { id: 'bilge', ad: 'Bilge', npc: 'bilge', hirs: 1.1, eager: .5, like: { dragon: 1, egg: 1.2, item: .85 }, says: ['Kanında bir şey var.', 'Genleri konuşuyor.', '...'] },
];
function lotValue(L) { return L.kind === 'item' ? ITEMS[L.item].fiyat * 1.15 : L.kind === 'egg' ? 120 + S.week * 6 + rareScore({ genes: L.egg.genes, el: expEl(L.egg.genes.el) }) * 60 + potSum({ genes: L.egg.genes }) * 4 : value(L.d); }
function rareDragon() {
  const d = marketDragon(0.35);
  const r = pick(['ak', 'kara', 'parilti', 'karisik', 'dev']);
  if (r === 'ak') d.genes.pig = ['a', 'a']; if (r === 'kara') d.genes.pig = ['m', 'm']; if (r === 'parilti') d.genes.par = ['P', 'p'];
  if (r === 'karisik') d.genes.pul = pick([['gok', 'zumrut'], ['mor', 'gok'], ['gul', 'mor'], ['zumrut', 'mor']]);
  if (r === 'dev') d.genes.boy = ['i', 'i'];
  d.origin = 'Müzayededen alındı'; delete d.price; return d;
}
function rareEgg() {
  const e = marketEgg(); delete e.price; e.origin = 'Müzayede yumurtası';
  const g = e.genes; g.pig = [pick(['a', 'm']), pick(['N', 'a', 'm'])]; if (chance(50)) g.par = ['P', 'p'];
  for (const k of STATS) g.pot[k] = g.pot[k].map(v => Math.min(5, v + (chance(50) ? 1 : 0)));
  return e;
}
function genAuction() {
  const t3 = Object.keys(ITEMS).filter(k => ITEMS[k].tier === 3);
  const lots = [{ kind: 'dragon', d: rareDragon() }, { kind: 'egg', egg: rareEgg() }, { kind: 'item', item: pick(t3) }];
  for (const L of lots) { L.v = Math.round(lotValue(L)); L.done = null; }
  S.auc = { w: S.week, lots, sold: false };
}
function auction() { if (!S.auc || S.auc.w !== S.week) genAuction(); return S.auc; }

function lotArt(L, big) {
  if (L.kind === 'dragon') return dragonSVG(L.d, { still: !big });
  if (L.kind === 'egg') return eggSVG(L.egg, 0, { glow: true });
  return `<div class="lotitem">${itemIcon(L.item)}</div>`;
}
function lotTitle(L) { return L.kind === 'dragon' ? `${esc(L.d.name)} · ${STAGE_AD[L.d.stage]} ${EL_AD[L.d.el]} ejderhası` : L.kind === 'egg' ? 'Mühürlü yumurta' : ITEMS[L.item].ad; }
function lotDesc(L) {
  if (L.kind === 'dragon') return `${lookText(L.d)}. Potansiyel ${STATS.map(k => potLetter(L.d.genes.pot[k][0] + L.d.genes.pot[k][1])).join('/')}.`;
  if (L.kind === 'egg') { const g = L.egg.genes; return `Satıcı soyunda ${g.pig.includes('a') ? '<b>ak</b>' : '<b>kara</b>'} geni olduğuna yemin ediyor${g.par.includes('P') ? ', kabuğu da parıldıyor' : ''}. Element: ${EL_AD[expEl(g.el)]}.`; }
  return itemDesc(ITEMS[L.item]);
}

function aucView() {
  const A = auction();
  const lots = A.lots.map((L, i) => `<div class="lotcard ${L.done ? 'done' : ''}"><span class="lottag">${{ dragon: 'Nadir ejderha', egg: 'Nadir yumurta', item: 'Usta işi' }[L.kind]}</span>
    <div class="lotart">${lotArt(L)}</div><b>${lotTitle(L)}</b><small>${lotDesc(L)}</small>
    <div class="lotfoot"><span>Tahmini ${goldTxt(L.v)}</span>${L.done ? `<span class="lotres">${L.done === 'me' ? 'Senin oldu' : `${esc(L.done)} aldı`}</span>` : `<button class="btn primary sm" data-a="auc-open" data-i="${i}" ${L.kind === 'dragon' && freeSlots() < 1 ? 'disabled title="İnlerde yer yok"' : ''}>Salona gir</button>`}</div></div>`).join('');
  const mine = S.dragons.filter(d => canAct(d) || d.stage === 'yavru');
  const sell = A.sold ? '<p class="mute">Bu hafta bir ejderhanı zaten açık artırmaya çıkardın.</p>' : mine.length > 1 ? `<div class="aucsell">${pager('auc-sell', mine, 4, d => `<button class="fp" data-a="auc-sell" data-id="${d.id}" title="Tahmini ${Math.round(value(d))} altın">${dragonSVG(d, { still: true })}<span>${esc(d.name)}</span></button>`)}</div><p class="mute sm">Bir ejderhaya tıkla: teklifler toplanır, %10 komisyon kesilir.</p>` : '<p class="mute">Satmak için en az iki ejderhan olmalı.</p>';
  return `<div class="aucv"><header class="auchead"><button class="btn ghost sm" data-a="stall-back">‹ Sokağa dön</button><h2>Mermer Salon Müzayedesi</h2><span class="mute">Her hafta yenilenir</span></header>
    <div class="lots">${lots}</div><section class="aucsellbox"><h4>Ejderhanı açık artırmaya çıkar</h4>${sell}</section></div>`;
}

/* ---------- Salon (canlı artırma) ---------- */
let AUC = null;
function aucOpen(L, sellD) {
  const v = sellD ? value(sellD) : L.v;
  const kind = sellD ? 'dragon' : L.kind;
  const bidders = shuffle(BIDDERS.slice()).slice(0, 3).map(B => {
    const rare = sellD ? rareScore(sellD) : L.kind !== 'item' ? rareScore(L.kind === 'dragon' ? L.d : { genes: L.egg.genes, el: expEl(L.egg.genes.el) }) : 0;
    return { ...B, max: Math.round(v * B.hirs * B.like[kind] * rnd(.85, 1.2) * (1 + rare * (B.id === 'bilge' ? .12 : .05))), out: false, last: null };
  });
  AUC = { L, sellD, v, price: Math.round(v * (sellD ? .4 : .5) / 5) * 5, step: Math.max(10, Math.round(v * (sellD ? .09 : .06) / 5) * 5), leader: null, bidders, count: 0, timer: null, over: false, log: [] };
  aucRender(); SFX.play('page');
  if (sellD) setTimeout(() => aucNpcTurn(), 900);
}
function aucRender() {
  const A = AUC; if (!A) return;
  const L = A.L, art = A.sellD ? dragonSVG(A.sellD) : lotArt(L, true), title = A.sellD ? `${esc(A.sellD.name)} · senin ejderhan` : lotTitle(L);
  const next = A.price + A.step, canBid = !A.sellD && !A.over && A.leader !== 'me' && S.gold >= next;
  const bid = A.bidders.map(B => `<div class="bidder ${B.out ? 'out' : ''} ${A.leader === B.id ? 'lead' : ''}" id="bd-${B.id}"><div class="bport">${npcSVG(B.npc)}</div><b>${B.ad}</b><small>${B.out ? 'çekildi' : A.leader === B.id ? 'önde' : B.last ? goldTxt(B.last) : 'bekliyor'}</small><span class="bsay" id="bs-${B.id}"></span></div>`).join('');
  showModal(`<div class="aucm"><div class="aucbg" style="background-image:url(${asset('bg-pazar') || ''})"></div>
    <header class="aucmh"><small>${A.sellD ? 'Senin lotun' : 'Açık artırma'}</small><b>${title}</b>${A.over || A.sellD ? '' : '<button class="btn ghost sm" data-a="auc-leave">Çekil</button>'}</header>
    <div class="aucstage"><div class="aucart">${art}</div>
      <div class="aucmid"><div class="aucprice"><small>Güncel teklif</small><b id="aucp">${goldTxt(A.price)}</b><span class="auclead">${A.leader === 'me' ? 'Sen öndesin' : A.leader ? `${A.bidders.find(b => b.id === A.leader).ad} önde` : 'Açılış'}</span></div>
        <div class="gavel" id="gavel">${A.over ? (A.leader === 'me' ? 'SATILDI · SANA!' : A.leader ? 'SATILDI!' : 'ALICI ÇIKMADI') : ''}</div>
        ${A.sellD ? `<p class="mute sm">Tahmini değer ${goldTxt(Math.round(A.v))}. Teklifler kendiliğinden yükselir.</p>` : `<p class="mute sm">Tahmini değer ${goldTxt(A.v)} · kesende ${goldTxt(S.gold)}</p>`}
        ${A.over ? `<button class="btn primary big" data-a="auc-done">Devam</button>` : A.sellD ? '' : `<button class="btn primary big" data-a="auc-bid" ${canBid ? '' : 'disabled'}>${A.leader === 'me' ? 'Öndesin…' : S.gold < next ? 'Kese yetmiyor' : `Artır · ${goldTxt(next)}`}</button>`}</div>
      <div class="bidders">${bid}</div></div></div>`, 'aucwrap');
}
function aucSay(id, t) { const el = $('#bs-' + id); if (!el) return; el.innerHTML = t; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
function aucHammer() {
  const A = AUC; if (!A || A.over) return;
  clearTimeout(A.timer);
  const steps = ['Bir…', 'İki…'];
  const tick = () => {
    if (!AUC || AUC !== A || A.over) return;
    if (A.count < 2) { const g = $('#gavel'); if (g) { g.textContent = steps[A.count]; g.classList.remove('hit'); void g.offsetWidth; g.classList.add('hit'); } SFX.play('gavel'); A.count++; A.timer = setTimeout(tick, window.__fastFx ? 10 : 1300); }
    else aucClose();
  };
  A.timer = setTimeout(tick, window.__fastFx ? 10 : 1100);
}
function aucNpcTurn() {
  const A = AUC; if (!A || A.over) return;
  const next = A.price + A.step;
  const cands = A.bidders.filter(B => !B.out && A.leader !== B.id);
  for (const B of cands) if (B.max < next) { B.out = true; aucSay(B.id, 'Çekildim.'); }
  const able = cands.filter(B => !B.out);
  if (!able.length) { aucRender(); return aucHammer(); }
  const B = able.sort((a, b) => (b.eager + Math.random() * .3) - (a.eager + Math.random() * .3))[0];
  const jump = B.id === 'rustem' && chance(30) ? A.step * 2 : A.step;
  A.price = Math.min(B.max, A.price + jump); A.leader = B.id; B.last = A.price; A.count = 0;
  aucRender(); aucSay(B.id, `<b>${A.price}!</b> ${pick(B.says)}`); SFX.play('chatter');
  if (A.sellD) A.timer = setTimeout(aucNpcTurn, window.__fastFx ? 10 : 520);
  else aucHammer();
}
function aucClose() {
  const A = AUC; if (!A || A.over) return;
  A.over = true; clearTimeout(A.timer);
  const L = A.L;
  if (A.sellD) {
    const d = A.sellD;
    if (A.leader) {
      const got = Math.round(A.price * .9); S.gold += got; for (const s in d.equip) d.equip[s] = null; linReg(d);
      S.dragons = S.dragons.filter(x => x !== d); auction().sold = true;
      chron(`${d.name} müzayedede ${A.bidders.find(b => b.id === A.leader).ad} adlı alıcıya ${A.price} altına satıldı.`);
      A.result = `${esc(d.name)} ${goldTxt(A.price)} karşılığında satıldı. Komisyondan sonra kesene <b>${goldTxt(got)}</b> girdi.`;
    } else A.result = 'Kimse teklif vermedi. Ejderhan seninle kalıyor.';
  } else if (A.leader === 'me') {
    S.gold -= A.price; L.done = 'me';
    if (L.kind === 'dragon') { const d = L.d; d.id = S.nid++; S.dragons.push(d); linReg(d); S.st.acq++; chron(`${d.name} müzayededen ${A.price} altına alındı.`); snapAlbum('auc', 'Müzayede', `${d.name} tokmağın altından bizim ocağa geldi.`, d); }
    if (L.kind === 'egg') { L.egg.inK = kuluckaFree() > 0; S.eggs.push(L.egg); }
    if (L.kind === 'item') S.inv.push({ uid: S.uid++, id: L.item });
    A.result = `Tokmak indi: <b>${lotTitle(L)}</b> ${goldTxt(A.price)} karşılığında senin.`;
    SFX.play('win');
  } else { L.done = A.leader ? A.bidders.find(b => b.id === A.leader).ad : 'kimse'; A.result = A.leader ? `${L.done} ${goldTxt(A.price)} ile aldı.` : 'Lot satılmadı.'; if (A.leader === 'demirhan' && typeof rivalBeaten === 'function') { } }
  saveGame(); aucRender();
  const g = $('#gavel'); if (g) { g.classList.add('hit'); g.insertAdjacentHTML('afterend', `<p class="aucres">${A.result}</p>`); }
  SFX.play('sold');
}
const AUC_ACT = {
  muz() { UI.stall = 'muz'; SFX.play('page'); render(); },
  'auc-open'(el) { const L = auction().lots[+el.dataset.i]; if (!L || L.done) return; pushModal(() => aucOpen(L, null)); },
  'auc-sell'(el) { const d = byId(el.dataset.id); if (!d || auction().sold) return; pushModal(() => aucOpen(null, d)); },
  'auc-bid'() {
    const A = AUC; if (!A || A.over || A.leader === 'me') return; const next = A.price + A.step; if (S.gold < next) return;
    clearTimeout(A.timer); A.price = next; A.leader = 'me'; A.count = 0; SFX.play('coin'); aucRender();
    const g = $('#gavel'); if (g) g.textContent = '';
    A.timer = setTimeout(aucNpcTurn, window.__fastFx ? 10 : 850);
  },
  'auc-leave'() { const A = AUC; if (!A || A.over) return; clearTimeout(A.timer); if (A.leader === 'me') return; A.bidders.forEach(() => 0); A.leftMe = true; /* oyuncu çekilir: rakipler kendi arasında bitirir */ const run = () => { if (!AUC || AUC.over) return; const before = AUC.price; aucNpcTurnSilent(); if (AUC.price === before) aucClose(); else setTimeout(run, window.__fastFx ? 5 : 350); }; run(); },
  'auc-done'() { clearTimeout(AUC && AUC.timer); AUC = null; closeModal(); afterAction(true); },
};
function aucNpcTurnSilent() {
  const A = AUC, next = A.price + A.step;
  const able = A.bidders.filter(B => !B.out && A.leader !== B.id && B.max >= next);
  A.bidders.forEach(B => { if (!B.out && B.max < next && A.leader !== B.id) B.out = true; });
  if (!able.length) return;
  const B = pick(able); A.price = next; A.leader = B.id; B.last = A.price; aucRender(); aucSay(B.id, `<b>${A.price}!</b>`);
}
