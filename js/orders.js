'use strict';
/* ============ EJDER OCAĞI — SİPARİŞ PANOSU ============
   Müşteriler belirli bir ejderha ister: "buz elementli, dayanıklılığı A, ak bir genç, 900 altın".
   Kolay siparişler (element + evre) ocaktaki ejderhalarla tutturulur; zor olanlar ocakta zaten taşınan
   çekinik genlerden seçilir, yani çiftleştirerek gerçekten elde edilebilir. Genetiğe somut bir hedef verir.
   Teslim edilen ejderha müşteriye gider; karşılığında altın, ün ve bazen nadir bir yumurta gelir. */

const ORDER_WHO = [
  { ad: 'Baron Vasıf', d: 'Altın Ahırlar için gösterişli bir ejderha', s: 'Sergide herkes ağzı açık baksın istiyorum.' },
  { ad: 'Leyla Hatun', d: 'Sedef Ocağı için damızlık', s: 'Soyum sağlam olmalı; gösteriş ikinci planda.' },
  { ad: 'Köy Muhtarı', d: 'tarlaları koruyacak bir ejderha', s: 'Kurtlar sürüye dadandı, sağlam bir bekçi lazım.' },
  { ad: 'Gezgin Sirk', d: 'çadırın yıldızı olacak bir ejderha', s: 'Seyirci rengi, pırıltıyı sever efendim.' },
  { ad: 'Kervan Başı Rıza', d: 'kervana eşlik edecek bir ejderha', s: 'Yol uzun, eşkıya çok. Dayanıklı olsun.' },
  { ad: 'Medrese Hocası', d: 'öğrencilerine ders olacak bir ejderha', s: 'Zeki bir hayvan isterim; sabırlı ve düşünceli.' },
  { ad: 'Sınır Beyi', d: 'kale burçları için bir savaş ejderhası', s: 'Güçlü olsun, korkusuz olsun.' },
];
const STAT_ADX = { gu: 'gücü', ce: 'çevikliği', da: 'dayanıklılığı', ze: 'zekâsı' };

// Ocaktaki ejderha ve yumurtaların taşıdığı aleller (çiftleştirmeyle elde edilebilecekler)
function genePool() {
  const P = { el: new Set(), pig: new Set(), eye: new Set(), pat: new Set(), par: new Set() };
  const src = [...S.dragons.filter(d => !d.dead).map(d => d.genes), ...S.eggs.map(e => e.genes)].filter(Boolean);
  for (const g of src) {
    (g.el || []).forEach(a => P.el.add(a)); (g.pig || []).forEach(a => P.pig.add(a)); (g.eye || []).forEach(a => P.eye.add(a));
    (g.pat || []).forEach(a => P.pat.add(a)); (g.par || []).forEach(a => P.par.add(a));
  }
  return P;
}
const REQ = {
  el: { t: v => `${EL_AD[v]} elementli`, ok: (d, v) => d.el === v, w: 1 },
  stage: { t: v => STAGE_AD[v].toLocaleLowerCase('tr'), ok: (d, v) => d.stage === v, w: 0 },
  sex: { t: v => v === 'F' ? 'dişi' : 'erkek', ok: (d, v) => d.sex === v, w: .5 },
  pot: { t: ([k, g]) => `${STAT_ADX[k]} ${GRADE[g]} ya da üstü`, ok: (d, [k, g]) => Math.floor((d.genes.pot[k][0] + d.genes.pot[k][1]) / 2) >= g, w: 2 },
  stat: { t: ([k, v]) => `${STAT_ADX[k]} en az ${v}`, ok: (d, [k, v]) => d.st[k] >= v, w: 1.5 },
  pig: { t: v => v === 'a' ? 'ak (beyaz pullu)' : 'kara pullu', ok: (d, v) => pigOf(d) === v, w: 4 },
  eye: { t: () => 'parlak (altın hareli) gözlü', ok: d => d.eye === 'A', w: 3 },
  pat: { t: v => v === 'C' ? 'çizgili' : 'benekli', ok: (d, v) => d.pat.includes(v), w: 1 },
  par: { t: () => 'parıltılı pullu', ok: d => parOf(d), w: 4 },
};
function orderGen(level) {
  const P = genePool(), who = pick(ORDER_WHO), reqs = [];
  const els = [...P.el].filter(e => EL_AD[e]); const el = els.length && chance(80) ? pick(els) : rEl();
  reqs.push(['el', el]);
  const stage = level === 0 ? pick(['genc', 'yetiskin']) : pick(['genc', 'yetiskin', 'yetiskin']);
  reqs.push(['stage', stage]);
  if (level >= 1) {
    const k = pick(STATS);
    reqs.push(chance(55) ? ['pot', [k, level >= 2 ? 4 : 3]] : ['stat', [k, Math.round((stage === 'yetiskin' ? 58 : 42) + S.week * 1.6 + level * 6)]]);
    if (chance(40)) reqs.push(['sex', pick(['F', 'M'])]);
  }
  if (level >= 2) {
    const rare = [];
    if (P.pig.has('a')) rare.push(['pig', 'a']); if (P.pig.has('m')) rare.push(['pig', 'm']);
    if (P.eye.has('A')) rare.push(['eye', 'A']); if (P.par.has('P')) rare.push(['par', 'P']);
    if (P.pat.has('C')) rare.push(['pat', 'C']); if (P.pat.has('B')) rare.push(['pat', 'B']);
    reqs.push(rare.length ? pick(rare) : ['pat', pick(['C', 'B'])]);
  }
  const wsum = reqs.reduce((t, [k]) => t + REQ[k].w, 0);
  const gold = Math.round((140 + wsum * 120 + S.week * 12) * (stage === 'yetiskin' ? 1.2 : 1) / 10) * 10;
  return { id: 'o' + (S.uid++), who: who.ad, d: who.d, s: who.s, reqs, gold, un: 1 + level + (wsum >= 6 ? 1 : 0), egg: level >= 2 && chance(60), lv: level,
    by: S.week + (level === 0 ? 4 : level === 1 ? 5 : 7) };
}
function orders() {
  if (!S.orders || !Array.isArray(S.orders.list)) S.orders = { list: [orderGen(0)], last: S.week };
  return S.orders;
}
// Haftalık: süresi geçenler gider, yenileri gelir (en çok 3)
function ordersWeek(gen) {
  const O = orders();
  for (const o of O.list.filter(o => S.week >= o.by)) gen.push(`<span class="mute">${esc(o.who)} siparişinden vazgeçti; başka bir yetiştiriciye gitti.</span>`);
  O.list = O.list.filter(o => S.week < o.by);
  if (O.list.length < 3 && (S.week - O.last >= 2 || !O.list.length)) {
    const lv = S.week < 4 ? (chance(60) ? 0 : 1) : S.week < 10 ? pick([0, 1, 1, 2]) : pick([1, 2, 2]);
    const o = orderGen(lv); O.list.push(o); O.last = S.week;
    gen.push(`<b>Sipariş panosu:</b> ${esc(o.who)} ${esc(o.d)} arıyor (${goldTxt(o.gold)}).`);
  }
}
const orderReqText = o => o.reqs.map(([k, v]) => REQ[k].t(v)).join(', ');
const orderFits = (o, d) => !d.dead && !d.old && !d.inj && o.reqs.every(([k, v]) => REQ[k].ok(d, v));

function ordersTab() {
  const O = orders();
  if (!O.list.length) return `<div class="vempty">Pano şimdilik boş. Yeni siparişler birkaç haftada bir asılır.</div>`;
  return pager('v-sip', O.list, PER(3, 1), o => {
    const fits = S.dragons.filter(d => orderFits(o, d)), wl = o.by - S.week;
    const reqs = o.reqs.map(([k, v]) => { const any = S.dragons.some(d => !d.dead && REQ[k].ok(d, v)); return `<li class="${any ? 'have' : ''}">${REQ[k].t(v)}</li>`; }).join('');
    const btns = fits.length ? fits.slice(0, 3).map(d => `<button class="btn ${UI.sellArm === 'o' + o.id + d.id ? 'danger' : 'primary'} sm" data-a="orderGive" data-o="${o.id}" data-id="${d.id}">${UI.sellArm === 'o' + o.id + d.id ? `${esc(d.name)} gitsin, geri alınamaz` : `${ek(esc(d.name), 'acc')} teslim et`}</button>`).join('') : '<small class="mute">Ocakta uyan ejderha yok. Çiftleştir, yetiştir.</small>';
    return `<div class="gcard order lv${o.lv}" data-hover><div class="otop"><b>${esc(o.who)}</b><span class="owl ${wl <= 1 ? 'hot' : ''}">${wl <= 0 ? 'bu hafta son' : `${wl} hafta`}</span></div>
      <p class="osay">“${esc(o.s)}”</p><small class="mute">${esc(o.d)}:</small><ul class="oreq">${reqs}</ul>
      <div class="orew">${goldTxt(o.gold)} <span>+${o.un} ün</span>${o.egg ? '<span>+ nadir yumurta</span>' : ''}</div><div class="obtn">${btns}</div></div>`;
  });
}
const ORDER_ACT = {
  orderGive(el) {
    const O = orders(), o = O.list.find(x => x.id === el.dataset.o), d = byId(el.dataset.id);
    if (!o || !d || !orderFits(o, d)) return;
    const key = 'o' + o.id + d.id; if (UI.sellArm !== key) { UI.sellArm = key; SFX.play('click'); return render(); }
    UI.sellArm = null; coinsFrom(el);
    for (const s in d.equip) d.equip[s] = null;
    linReg(d); S.dragons = S.dragons.filter(x => x !== d);
    S.gold += o.gold; S.un += o.un; S.st.orders = (S.st.orders || 0) + 1;
    O.list = O.list.filter(x => x !== o);
    let extra = '';
    if (o.egg) {
      const g = randomGenes({ el: o.reqs[0][1], q: .6 });
      if (o.reqs.some(([k]) => k === 'pig')) g.pig = [o.reqs.find(([k]) => k === 'pig')[1], 'N'];
      S.eggs.push({ id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: [], w: 0, inK: kuluckaFree() > 0, gen: 1, parents: null, origin: `${o.who}'dan teşekkür yumurtası` });
      extra = ' Teşekkür olarak nadir bir yumurta bıraktı.';
    }
    chron(`${d.name}, ${ek(o.who, 'gen')} siparişiyle ocaktan ayrıldı (${o.gold} altın).`);
    toast(`<b>Sipariş teslim edildi</b>${esc(d.name)} artık ${esc(o.who)} ile. +${o.gold} altın, +${o.un} ün.${extra}`, 'goal');
    vSay('ejder', 'sell'); SFX.play('sold'); afterAction();
  },
};
