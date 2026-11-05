'use strict';
/* ============ EJDER OCAĞI — OCAKTA GEZEN EJDERHALAR ============
   Ejderhalar haritaya çıkartma gibi yapışık durmasın diye:
   - Haritanın içinde, binalarla aynı derinlik sırasında çizilirler (in arkasından geçen ejderha inin arkasında kalır).
   - Yere basarlar: ayağın altında yumuşak bir temas gölgesi, adımda gövde hafifçe kalkar, ayak yere inince çöker (ağırlık).
   - Yavaş kalkıp yavaş dururlar (Arrival steering); birbirlerine 28px'den fazla yaklaşınca yumuşakça ayrılırlar (Separation steering).
   - Aralarında yüksek yakınlık (aff >= 40) veya ebeveyn-yavru bağı olan iki ejderha yan yana geçerken 1.8sn durup birbirine bakar ve neşeyle selamlaşır.
   - Gece ışığına uyarlar: sahnenin karanlığına göre hafif kısılmış, soğuk tonlu renk.
   - Uzaktaki (haritanın arkasındaki) ejderha biraz daha küçük görünür.
   Yürünebilir kareler: açık, boş ya da üstünden geçilebilen yapıların (yuva, yosun, şifa, mezar, kaynak, talim, parkur) olduğu kareler. */

const ROAM = {};
const ROAM_SOFT = new Set(['yuva', 'yosun', 'sifa', 'mezar', 'kaynak', 'talim', 'parkur']);
const roamWalk = i => { const t = S.grid[i]; return t && t.open && (!t.b || ROAM_SOFT.has(t.b)); };
const roamW = () => VB.w * 0.092;             // ejderha çizim kutusunun dünya genişliği
function affOf(a, b) {
  if (typeof getAff === 'function') return getAff(a, b);
  const k = a < b ? `${a}|${b}` : `${b}|${a}`;
  return (S && S.aff && S.aff[k]) || 0;
}
function roamBonded(d1, d2) {
  if (!d1 || !d2 || d1 === d2) return false;
  if (typeof affOf === 'function' && affOf(d1.id, d2.id) >= 40) return true;
  if ((d1.pids && d1.pids.includes(d2.id)) || (d2.pids && d2.pids.includes(d1.id))) return true;
  if ((d1.parents && d1.parents.includes(d2.name)) || (d2.parents && d2.parents.includes(d1.name))) return true;
  return false;
}
function roamPt(i) { // karenin içinde rastgele bir nokta (elmasın iç kısmı)
  const [sx, sy] = isoXY(i), a = Math.random() - .5, b = Math.random() - .5;
  const u = a * .55, v = b * .55; return [sx + (u - v) * TW, sy + (u + v) * TH];
}
function roamTileAt(x, y) { const u = (x / TW + y / TH) / 2, v = (y / TH - x / TW) / 2; const gx = Math.round(u), gy = Math.round(v); return gx >= 0 && gy >= 0 && gx < GW && gy < GH ? gy * GW + gx : -1; }
function roamInit(d, home) {
  let R = ROAM[d.id];
  if (R && R.home === home) {
    if (R.vx == null) R.vx = 0;
    if (R.vy == null) R.vy = 0;
    if (R.socialTimer == null) R.socialTimer = 0;
    if (R.socialCd == null) R.socialCd = 0;
    return R;
  }
  const [sx, sy] = isoXY(home), near = [1, -1, GW, -GW, GW + 1, GW - 1, -GW + 1, -GW - 1].map(o => home + o).filter(i => roamWalk(i));
  R = ROAM[d.id] = {
    home, x: sx - 40, y: sy + 18, tx: 0, ty: 0, vx: 0, vy: 0, v: 0,
    ph: Math.random() * 6, f: Math.random() < .5 ? 1 : -1, ff: 1,
    wait: .5 + Math.random() * 3, socialTimer: 0, socialCd: 2 + Math.random() * 4, socialPartner: null,
    _lastTr: '', _lastSh: '', _lastBd: '', _lastZ: '',
  };
  for (let k = 0; k < 8 && near.length; k++) { // başlangıçta da üst üste binmesinler
    [R.x, R.y] = roamPt(near[Math.floor(Math.random() * near.length)]);
    if (Object.values(ROAM).every(o => o === R || Math.hypot(o.x - R.x, (o.y - R.y) * 2) > 34)) break;
  }
  R.tx = R.x; R.ty = R.y; R.z = R.y; R.ff = R.f; return R;
}
function roamNext(R) { // komşu yürünebilir kareye ya da aynı karenin başka bir köşesine; evden fazla uzaklaşmaz
  const cur = roamTileAt(R.x, R.y), hx = R.home % GW, hy = Math.floor(R.home / GW);
  const cand = [cur, cur + 1, cur - 1, cur + GW, cur - GW].filter(i => i >= 0 && i < GW * GH && roamWalk(i) && Math.abs(i % GW - hx) + Math.abs(Math.floor(i / GW) - hy) <= 2 && (i === cur || Math.abs(i % GW - cur % GW) <= 1));
  // birbirinin içine girmesinler: başka bir ejderhanın durduğu ya da gittiği yere yakın noktayı seçme
  for (let k = 0; k < 6; k++) {
    const t = cand.length ? cand[Math.floor(Math.random() * cand.length)] : cur;
    const [x, y] = t >= 0 ? roamPt(t) : [R.x, R.y];
    if (Object.values(ROAM).every(o => o === R || Math.hypot(o.tx - x, (o.ty - y) * 2) > 34 && Math.hypot(o.x - x, (o.y - y) * 2) > 30) || k === 5) { R.tx = x; R.ty = y; return; }
  }
}
// Haritaya konan işaretleme: ayrıntıları döngü her karede günceller
function roamMarkup(H) {
  let out = '';
  for (const d of S.dragons) {
    const h = H[d.id]; if (h == null || d.dead) continue;
    const R = roamInit(d, h), W = roamW(), Hh = W * 190 / 304;
    R._lastTr = ''; R._lastSh = ''; R._lastBd = ''; R._lastZ = '';
    out += `<g class="roam" data-id="${d.id}" data-z="${R.y.toFixed(1)}" pointer-events="none"><ellipse class="rsh" cx="${(W * .03).toFixed(1)}" cy="1" rx="${(W * .24).toFixed(1)}" ry="${(W * .065).toFixed(1)}" fill="url(#roamsh)"/>`
      + `<g class="rbody"><svg x="${(-W / 2).toFixed(1)}" y="${(-Hh * 179 / 190).toFixed(1)}" width="${W.toFixed(1)}" height="${Hh.toFixed(1)}" viewBox="-44 0 304 190" overflow="visible" filter="url(#roamlit)">${dragonSVG(d, { still: false }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg></g></g>`;
  }
  return out;
}
const ROAM_DEFS = `<radialGradient id="roamsh"><stop offset="0" stop-color="#05060a" stop-opacity=".85"/><stop offset=".55" stop-color="#05060a" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <filter id="roamlit" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".8 .02 0 0 .015  0 .8 .03 0 .015  0 .02 .88 0 .04  0 0 0 1 0"/></filter>`;

let ROAM_T = 0, ROAM_SORT = 0;
const ROAM_SLOW_RADIUS = 26;
const ROAM_SEP_RADIUS = 28;
const ROAM_MAX_FORCE = 44;

function roamTick(now) {
  requestAnimationFrame(roamTick);
  const box = document.getElementById('ents'); if (!box) { ROAM_T = now; return; }
  const dt = Math.min(.05, (now - (ROAM_T || now)) / 1000); ROAM_T = now;
  const calm = typeof REDUCED !== 'undefined' && REDUCED, W = roamW(), y0 = VB.y + VB.h * .2, y1 = VB.y + VB.h * .85;
  const nodes = box.querySelectorAll('.roam');
  for (const g of nodes) {
    const id = +g.dataset.id, R = ROAM[id]; if (!R) continue;
    const d = byId(id), st = d && d.stage || 'yetiskin', resting = d && ((d.task && d.task.t === 'rest') || d.inj);
    const vmax = (st === 'yavru' ? 13 : st === 'genc' ? 17 : 20) * (resting ? .45 : 1), stride = st === 'yavru' ? 5 : st === 'genc' ? 7.5 : 10;
    if (R.socialCd > 0) R.socialCd = Math.max(0, R.socialCd - dt);

    // Separation steering (< 28px) & Social micro-interaction check
    let sepX = 0, sepY = 0;
    for (const oid in ROAM) {
      const oR = ROAM[oid];
      if (!oR || oR === R) continue;
      const rx = R.x - oR.x, ry = R.y - oR.y;
      const sd = Math.hypot(rx, ry);
      if (sd > 0.001 && sd < ROAM_SEP_RADIUS) {
        const push = ((ROAM_SEP_RADIUS - sd) / ROAM_SEP_RADIUS) * vmax * 0.9;
        sepX += (rx / sd) * push;
        sepY += (ry / sd) * push;
      }
      if (!calm && R.socialTimer <= 0 && R.socialCd <= 0 && (oR.socialTimer || 0) <= 0 && (oR.socialCd || 0) <= 0 && sd < 34) {
        const oD = byId(+oid);
        if (d && oD && !d.dead && !oD.dead && roamBonded(d, oD)) {
          R.socialTimer = 1.8; oR.socialTimer = 1.8;
          R.socialCd = 14; oR.socialCd = 14;
          R.socialPartner = oD.id; oR.socialPartner = d.id;
          R.f = oR.x >= R.x ? 1 : -1;
          oR.f = R.x >= oR.x ? 1 : -1;
        }
      }
    }

    let dx = R.tx - R.x, dy = R.ty - R.y; const dist = Math.hypot(dx, dy);
    if (R.socialTimer > 0) {
      R.socialTimer = Math.max(0, R.socialTimer - dt);
      const pR = R.socialPartner != null ? ROAM[R.socialPartner] : null;
      if (pR && Math.abs(pR.x - R.x) > 1) R.f = pR.x >= R.x ? 1 : -1;
      R.vx += (sepX * 0.35 - R.vx) * Math.min(1, 10 * dt);
      R.vy += (sepY * 0.35 - R.vy) * Math.min(1, 10 * dt);
      R.x += R.vx * dt; R.y += R.vy * dt;
      R.v = Math.hypot(R.vx, R.vy);
    } else if (R.wait > 0) {
      R.wait -= dt;
      R.vx += (sepX * 0.45 - R.vx) * Math.min(1, 9 * dt);
      R.vy += (sepY * 0.45 - R.vy) * Math.min(1, 9 * dt);
      R.x += R.vx * dt; R.y += R.vy * dt;
      R.v = Math.hypot(R.vx, R.vy);
      if (R.v < 0.25) { R.vx = 0; R.vy = 0; R.v = 0; }
      if (R.wait <= 0 && !calm) roamNext(R);
    } else if (dist < 1.6 && Math.hypot(sepX, sepY) < 1.5) {
      R.vx = 0; R.vy = 0; R.v = 0;
      R.wait = (resting ? 4 : 1.5) + Math.random() * (resting ? 6 : 4);
    } else {
      // Arrival steering: slowing radius içinde kademeli yavaşlama + Separation vektörü
      const ramped = dist > 0.001 ? Math.max(2.2, vmax * Math.min(dist / ROAM_SLOW_RADIUS, 1.0)) : 0;
      let desX = (dist > 0.001 ? (dx / dist) * ramped : 0) + sepX;
      let desY = (dist > 0.001 ? (dy / dist) * ramped : 0) + sepY;
      const desM = Math.hypot(desX, desY);
      if (desM > vmax) { desX = (desX / desM) * vmax; desY = (desY / desM) * vmax; }
      const stX = desX - (R.vx || 0), stY = desY - (R.vy || 0), stM = Math.hypot(stX, stY);
      const maxDv = ROAM_MAX_FORCE * dt;
      if (stM > 0.001) {
        const sc = Math.min(1, maxDv / stM);
        R.vx = (R.vx || 0) + stX * sc;
        R.vy = (R.vy || 0) + stY * sc;
      }
      R.v = Math.hypot(R.vx, R.vy);
      if (R.v > vmax) { R.vx = (R.vx / R.v) * vmax; R.vy = (R.vy / R.v) * vmax; R.v = vmax; }
      const stepDist = R.v * dt;
      if (stepDist >= dist && Math.hypot(sepX, sepY) < 1.2) {
        R.x = R.tx; R.y = R.ty; R.vx = 0; R.vy = 0; R.v = 0;
      } else {
        R.x += R.vx * dt; R.y += R.vy * dt;
      }
      if (Math.abs(R.vx) > 1.2) R.f = R.vx > 0 ? 1 : -1;
      else if (Math.abs(dx) > 2) R.f = dx > 0 ? 1 : -1;
    }

    R.ff += Math.sign(R.f - R.ff) * Math.min(Math.abs(R.f - R.ff), 6 * dt); // dönüş: bir an daralır
    R.ph += (R.v / stride) * Math.PI * dt;
    const step = Math.abs(Math.sin(R.ph)), moving = R.v > .5, k = moving ? Math.min(1, R.v / vmax) : 0;
    const socPhase = R.socialTimer > 0 ? (1.8 - R.socialTimer) * Math.PI * 3.5 : 0;
    const socBob = R.socialTimer > 0 ? Math.abs(Math.sin(socPhase)) : 0;
    const lift = R.socialTimer > 0 ? socBob * W * 0.032 : step * k * W * (st === 'yavru' ? .045 : .03); // adımda kalkış veya selamlaşma zıplaması
    const land = R.socialTimer > 0 ? Math.pow(1 - socBob, 3) * 0.45 : Math.pow(1 - step, 6) * k;        // ayak yere inince çökme
    const sz = .9 + .14 * Math.max(0, Math.min(1, (R.y - y0) / (y1 - y0)));                             // uzaktaki küçük
    const sx = (Math.abs(R.ff) < .12 ? .12 * Math.sign(R.ff || 1) : R.ff) * sz * (1 + .025 * land), sy = sz * (1 - .04 * land);
    const tilt = R.socialTimer > 0 ? Math.sin(socPhase) * 2.1 : (moving ? Math.sin(R.ph) * 1.4 * k : 0);

    const tr = `translate(${R.x.toFixed(1)},${R.y.toFixed(1)})`;
    const sh = `scale(${(sz * (1 - lift / W * 2.2)).toFixed(3)},${sz.toFixed(3)})`;
    const bd = `translate(0,${(-lift).toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
    if (R._lastTr !== tr) { R._lastTr = tr; g.setAttribute('transform', tr); }
    if (R._lastSh !== sh && g.firstChild) { R._lastSh = sh; g.firstChild.setAttribute('transform', sh); }
    if (R._lastBd !== bd && g.lastChild) { R._lastBd = bd; g.lastChild.setAttribute('transform', bd); }
    const zStr = R.y.toFixed(1);
    if (R._lastZ !== zStr) { R._lastZ = zStr; g.dataset.z = zStr; }
    R.z = R.y;
  }
  // derinlik sırası: binalar ve ejderhalar ayakların bulunduğu yüksekliğe göre (saniyede birkaç kez)
  if (now - ROAM_SORT > 180) {
    ROAM_SORT = now;
    const kids = [...box.children], sorted = [...kids].sort((a, b) => +a.dataset.z - +b.dataset.z);
    if (sorted.some((n, i) => n !== kids[i])) for (const n of sorted) box.appendChild(n);
  }
}
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(roamTick);
