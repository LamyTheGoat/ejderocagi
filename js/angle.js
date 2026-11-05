'use strict';
/* ============ EJDER OCAĞI — AÇI GÖRSELLERİ ============
   Her element için 30 ayrı çizim: yetişkinde önden (front), üç çeyrek (34) ve alttan kahraman açısı (low); gençte önden ve üç çeyrek; yavruda önden.
   Renk genleri pozlardaki gibi maskeyle uygulanır (pul, süs, pigment, ton). Süsler bu çizimlerde gösterilmez.
   Nerede kullanılır:
     önden  → sohbet (ejderha sana bakar), yumurtadan çıkış
     üç çeyrek → pazardaki satılık ejderhalar (vitrin), dövüş öncesi ve sonrası karşılaşma, çizgi romanda yavru ve genç
     alttan → büyüme anı (yetişkin olunca), kariyer sahnelerinde genç yıldızın yetişmesi */
const ANGLE_META = {"ates-genc-34":[760,598],"ates-genc-front":[760,502],"buz-genc-34":[760,485],"buz-genc-front":[760,476],"firtina-genc-34":[760,469],"firtina-genc-front":[760,451],"golge-genc-34":[760,517],"golge-genc-front":[760,509],"toprak-genc-34":[760,477],"toprak-genc-front":[760,456],"ates-yavru-front":[760,946],"buz-yavru-front":[760,1085],"firtina-yavru-front":[760,927],"golge-yavru-front":[760,589],"toprak-yavru-front":[760,1063],"ates-yetiskin-34":[760,553],"ates-yetiskin-front":[760,415],"ates-yetiskin-low":[760,423],"buz-yetiskin-34":[760,552],"buz-yetiskin-front":[760,410],"buz-yetiskin-low":[760,435],"firtina-yetiskin-34":[760,565],"firtina-yetiskin-front":[760,429],"firtina-yetiskin-low":[760,424],"golge-yetiskin-34":[760,561],"golge-yetiskin-front":[760,398],"golge-yetiskin-low":[760,423],"toprak-yetiskin-34":[760,638],"toprak-yetiskin-front":[760,408],"toprak-yetiskin-low":[760,427]};
const ANGLE_FACE = { 'firtina-yetiskin-34': 'l', 'golge-yetiskin-34': 'l', 'toprak-yetiskin-34': 'l' }; // diğer üç çeyrek ve alttan çizimler sağa bakar
for (const k in ANGLE_META) { ASSETS['ang-' + k] = `img/angle/${k}.webp`; ASSETS['ang-m-' + k] = `img/angle/m-${k}.webp`; }
const angleKey = (d, v) => `${d.el}-${d.stage || 'yetiskin'}-${v}`;
const hasAngle = (d, v) => !!(d && ANGLE_META[angleKey(d, v)]);
// İstenen açılardan bu evrede çizimi olan ilkini verir: bestAngle(d, 'low', '34', 'front')
const bestAngle = (d, ...vs) => vs.find(v => hasAngle(d, v)) || null;
function angleSVG(d, v, o = {}) {
  const key = angleKey(d, v), M = ANGLE_META[key];
  if (!M) return dragonSVG(d, { still: true, cls: o.cls, flip: o.face === 'l' });
  const [W, H] = M, u = 'a' + (++SVGUID);
  const pig = !d.dead && typeof pigOf === 'function' ? pigOf(d) : 'N';
  const pigF = { N: '', a: ` url(#${u}alb) brightness(1.08)`, m: ' brightness(.5) saturate(.85) contrast(1.2)', am: ' saturate(.45) brightness(.82)' }[pig];
  const albF = pig === 'a' ? `<filter id="${u}alb" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".07"/><feComponentTransfer><feFuncR type="gamma" exponent=".42" amplitude="1.02"/><feFuncG type="gamma" exponent=".44" amplitude="1"/><feFuncB type="gamma" exponent=".5" amplitude=".97"/></feComponentTransfer></filter>` : '';
  const f = d.dead ? 'grayscale(1) brightness(.55)' : ((d.hue ? `hue-rotate(${d.hue * 1.4}deg)` : '') + pigF + (d.old && !d.retired ? ' saturate(.55) sepia(.18) brightness(1.04)' : '')).trim() || 'none';
  const nat = v === 'front' ? null : (ANGLE_FACE[key] || 'r');
  const flip = o.face && nat && o.face !== nat ? `transform="translate(${W},0) scale(-1,1)"` : '';
  const look = d.dead ? '' : lookLayers(d, 0, 0, W, H, u, pig, { still: o.still, mk: asset('ang-m-' + key), mr: `x="0" y="0" width="${W}" height="${H}"` });
  return `<svg viewBox="0 0 ${W} ${H}" class="angle ang-${v} st-${d.stage || 'yetiskin'} ${o.cls || ''}" role="img" aria-label="${esc(d.name || 'ejderha')}">${albF ? `<defs>${albF}</defs>` : ''}
    <g ${flip}><g style="filter:${f};isolation:isolate"><image href="${asset('ang-' + key)}" x="0" y="0" width="${W}" height="${H}"/>${look}</g></g></svg>`;
}
// Görsel romanda ejderha kutusu: açı çizimi varsa o, yoksa yan çizim
function angleVdr(d, vs, o = {}) {
  const v = bestAngle(d, ...vs);
  return v ? `<div class="vdr vang ang-${v} ${o.cls || ''}">${angleSVG(d, v, { face: o.face, still: o.still })}</div>` : `<div class="vdr ${o.cls || ''}">${dragonSVG(d, { flip: o.face === 'l' })}</div>`;
}
/* --- Büyüme anı: yavru gence, genç yetişkine dönüşünce yeni açısıyla gösterilir --- */
function growModal(d) {
  const v = bestAngle(d, d.stage === 'yetiskin' ? 'low' : '34', '34', 'front');
  showModal(`<div class="growm"><div class="flash"></div><p class="kicker">Büyüme</p><h2>${esc(d.name)} ${d.stage === 'yetiskin' ? 'yetişkin oldu' : 'gençleşti'}</h2>
    <div class="growstage">${v ? angleSVG(d, v, { face: 'r' }) : dragonSVG(d)}</div>
    <p class="vntext">${d.stage === 'yetiskin' ? `${esc(d.name)} artık kanatlarını tam açabiliyor. Turnuvalara, yarışlara ve Kızıl Taç'a katılabilir.` : `${esc(d.name)} yavruluğu geride bıraktı. Kanatları güçlendi, bütün değerleri arttı.`}</p>
    <div class="mbtns center"><button class="btn primary big" data-a="mclose">Devam</button></div></div>`, 'growwrap');
  setTimeout(() => { const r = $('.growstage')?.getBoundingClientRect(); if (r && typeof FX !== 'undefined') FX.burst(r.x + r.width / 2, r.y + r.height / 2, d.el, 50, 1.3); }, 80);
}

/* --- Ek poz anları (P14 yemek, P15 uyku): ekranın üstünde kısa bir çizgi roman karesi --- */
function poseFlash(d, pz, cap, bgKey, ono = '') {
  if (!d || (d.stage || 'yetiskin') !== 'yetiskin' || !hasPose(d, pz) || window.__fastFx || window.__noCuts) return;
  const M = POSE_META[d.el + '-' + pz], ar = (M[1] / M[0]).toFixed(4);
  const el = document.createElement('div'); el.className = `rcut fcut pflash ${pz}`;
  el.innerHTML = `<div class="rcp" style="--vp:50% 50%"><div class="rcbg own" style="background-image:url(${asset(bgKey) || ''})"></div><div class="rctone"></div>
    <div class="rcd mine" data-box="${poseBox(d, pz, pz === 'P15' ? '10,26,80,70,c' : '8,8,84,88,c')}" data-ar="${ar}">${poseSVG(d, pz, { face: 'r', still: true })}${pz === 'P15' ? '<i class="zz">z</i><i class="zz z2">z</i><i class="zz z3">Z</i>' : ''}</div>
    <div class="rccap">${cap}</div>${ono ? `<b class="rcono">${ono}</b>` : ''}</div>`;
  document.body.appendChild(el); cutFit(el.querySelector('.rcp'));
  SFX.play('page', { vol: .6 });
  setTimeout(() => el.classList.add('out'), 1700); setTimeout(() => el.remove(), 2080);
}
