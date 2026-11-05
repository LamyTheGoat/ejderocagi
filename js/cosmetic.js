'use strict';
/* ============ EJDER OCAĞI — SÜS DOLABI ============
   Mobil oyunlardaki gardırop gibi: solda büyük önizleme, sağda yuva sekmeleri ve eşyalar.
   Eşyanın üzerine gelince önizlemede denenir; satın almadan da görülebilir. */
let WARD = null;
const cosOwned = id => (S.cosOwned || []).includes(id);
function wardModal(d, slot) {
  WARD = { d, slot: slot || (WARD && WARD.d === d ? WARD.slot : 'boyun'), try: null };
  wardRender();
}
function wardRender() {
  const { d, slot } = WARD; d.cos = d.cos || {};
  const look = WARD.try ? { ...d, cos: { ...d.cos, [COSMETICS[WARD.try].slot]: WARD.try } } : d;
  const tabs = Object.entries(COS_SLOTS).map(([k, n]) => `<button class="wtab ${slot === k ? 'on' : ''}" data-a="ward-tab" data-k="${k}">${d.cos[k] ? cosIcon(d.cos[k]) : `<i class="wempty"></i>`}<small>${n}</small></button>`).join('');
  const items = Object.entries(COSMETICS).filter(([, c]) => c.slot === slot).map(([id, c]) => {
    const on = d.cos[slot] === id, own = cosOwned(id), afford = S.gold >= c.fiyat;
    const btn = on ? `<button class="btn sm ghost" data-a="ward-off">Çıkar</button>` : own ? `<button class="btn sm" data-a="ward-on" data-k="${id}">Tak</button>` : `<button class="btn sm primary" data-a="ward-buy" data-k="${id}" ${afford ? '' : 'disabled'}>${goldTxt(c.fiyat)}</button>`;
    return `<div class="witem ${on ? 'on' : ''} ${own ? 'own' : ''}" data-ward-try="${id}"><div class="wic">${cosIcon(id)}</div><b>${c.ad}</b><small>${c.d}</small>${btn}</div>`;
  }).join('');
  const n = Object.values(d.cos).filter(Boolean).length;
  showModal(`<div class="wardm"><header class="whead"><div><small>Süs dolabı</small><b>${esc(d.name)}</b></div><span class="wgold">${goldTxt(S.gold)}</span><button class="icb" data-a="mclose" aria-label="Kapat">${ui('x')}</button></header>
    <div class="wbody"><div class="wstage"><div class="wspot"></div>${dragonSVG(look)}<p class="wperk ${n ? 'on' : ''}">${n >= 5 ? 'Tam takım: zaferden sonra moral +1, ün +1.' : n ? `Süslü ejderha seyircinin gözdesi: zaferde ün +1. <span class="mute">(${n}/5 yuva)</span>` : 'Bir süs tak: seyirci süslü ejderhaya bayılır.'}</p></div>
    <div class="wside"><div class="wtabs">${tabs}</div><div class="witems">${items}</div><p class="mute sm">Satın aldığın süs bütün ejderhalarında kullanılabilir.</p></div></div></div>`, 'wardwrap');
  document.querySelectorAll('[data-ward-try]').forEach(el => {
    el.addEventListener('mouseenter', () => { if (WARD.try !== el.dataset.wardTry) { WARD.try = el.dataset.wardTry; wardPreview(); } });
    el.addEventListener('mouseleave', () => { WARD.try = null; wardPreview(); });
    el.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      WARD.try = WARD.try === el.dataset.wardTry ? null : el.dataset.wardTry;
      wardPreview();
    });
  });
}
function wardPreview() {
  const st = $('.wstage'); if (!st || !WARD) return;
  const d = WARD.d, look = WARD.try ? { ...d, cos: { ...d.cos, [COSMETICS[WARD.try].slot]: WARD.try } } : d;
  const old = st.querySelector('svg.dragon'); if (old) old.outerHTML = dragonSVG(look);
}
const WARD_ACT = {
  ward() { const d = byId(UI.sel); if (d) { WARD = null; pushModal(() => wardModal(d)); } },
  'ward-tab'(el) { SFX.play('tab'); WARD.slot = el.dataset.k; WARD.try = null; wardRender(); },
  'ward-buy'(el) {
    const id = el.dataset.k, c = COSMETICS[id]; if (S.gold < c.fiyat || cosOwned(id)) return;
    S.gold -= c.fiyat; S.cosOwned = S.cosOwned || []; S.cosOwned.push(id); WARD.d.cos[c.slot] = id; WARD.try = null;
    SFX.play('coin'); toast(`<b>${c.ad}</b> alındı ve ${esc(WARD.d.name)} üstünde.`); saveGame(); wardRender();
  },
  'ward-on'(el) { const id = el.dataset.k; WARD.d.cos[COSMETICS[id].slot] = id; WARD.try = null; SFX.play('heart'); saveGame(); wardRender(); },
  'ward-off'() { delete WARD.d.cos[WARD.slot]; WARD.try = null; SFX.play('tab'); saveGame(); wardRender(); },
};
