'use strict';
/* ============ EJDER OCAĞI — SANAT ============
   Ejderha parça parça kurulur: gövde, boyun, kafa, boynuz, kanat, kuyruk, bacak, desen.
   Her parça genlerden ve değerlerden beslenir. ASSETS'e bir görsel eklenirse (ör. Midjourney çıktısı)
   ilgili çizim yerine o görsel kullanılır: asset('bg-pazar'), asset('npc-kerim') gibi. */

const ASSETS = {}; // anahtar: görsel yolu (sonradan doldurulacak)
function asset(k) { return ASSETS[k] || null; }

let SVGUID = 0;
const PAL = {
  ates: { hi: '#f2875a', base: '#c84a2c', dark: '#7a2214', belly: '#f2b46a', wing: '#e8794a', wing2: '#8a2a18', eye: '#ffd25e', pat: '#5a160c', horn: '#f0dcb8', line: '#2a0a05', glow: '#ff9a4a' },
  buz: { hi: '#a8dcf2', base: '#5ea8d0', dark: '#285a80', belly: '#e4f6fc', wing: '#9cd8f0', wing2: '#3a74a0', eye: '#f2fdff', pat: '#245078', horn: '#eaf6ff', line: '#0a2236', glow: '#9fe4ff' },
  firtina: { hi: '#ab98ef', base: '#7360c4', dark: '#352a72', belly: '#d2c6f6', wing: '#a998ec', wing2: '#3e3088', eye: '#f6f08a', pat: '#261c5e', horn: '#f0eacc', line: '#140e34', glow: '#f4ee86' },
  toprak: { hi: '#9cba64', base: '#68883a', dark: '#36501c', belly: '#dccb8e', wing: '#a0b866', wing2: '#3c5a20', eye: '#f0bf48', pat: '#2a3a14', horn: '#e8d8a8', line: '#141e08', glow: '#d8e88a' },
  golge: { hi: '#6c5c8e', base: '#3a3252', dark: '#17121f', belly: '#7e709c', wing: '#5c4a82', wing2: '#1e1630', eye: '#c46cff', pat: '#0a0810', horn: '#2a2236', line: '#05040a', glow: '#c46cff' },
};
function seeded(seed) { let s = (Math.abs(seed | 0) * 9301 + 49297) % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function seedOf(id) { if (typeof id === 'number') return id * 7 + 3; let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
const n1 = v => (+v).toFixed(1);

/* Görselli ejderha: element+evre çizimi, genlere göre ton, boy ve hare */
function dragonImg(d, o, src) {
  const stage = d.stage || 'yetiskin', st = d.st || { gu: 40, ce: 40, da: 40, ze: 40 };
  const boy = typeof boyOf === 'function' ? boyOf(d) : 0;
  const sc = { yavru: 0.6, genc: 0.8, yetiskin: 1 }[stage] * (0.93 + Math.min(st.gu + st.da, 340) / 340 * 0.12) * (1 + boy * 0.055);
  const h = 184 * sc, w = h * 4 / 3, x = 108 - w / 2, y = 179 - h;
  const flip = o.flip ? 'transform="translate(216,0) scale(-1,1)"' : '';
  const pig = typeof pigOf === 'function' && !d.dead ? pigOf(d) : 'N';
  const u = 'i' + (++SVGUID);
  const pigF = { N: '', a: ` url(#${u}alb) brightness(1.08)`, m: ' brightness(.5) saturate(.85) contrast(1.2)', am: ' saturate(.45) brightness(.82)' }[pig];
  const albF = pig === 'a' ? `<defs><filter id="${u}alb" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".07"/><feComponentTransfer><feFuncR type="gamma" exponent=".42" amplitude="1.02"/><feFuncG type="gamma" exponent=".44" amplitude="1"/><feFuncB type="gamma" exponent=".5" amplitude=".97"/></feComponentTransfer></filter></defs>` : '';
  const f = d.dead ? 'grayscale(1) brightness(.55)' : ((d.hue ? `hue-rotate(${d.hue * 1.4}deg)` : '') + pigF + (d.old && !d.retired ? ' saturate(.55) sepia(.18) brightness(1.04)' : '')).trim() || 'none';
  const cos = cosLayers(d, x, y, w, h, u, sc, o, src);
  const halo = d.eye === 'A' && !d.dead ? `<radialGradient id="${u}h"><stop offset="0" stop-color="#ffd76a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient><ellipse cx="108" cy="${n1(y + h * 0.5)}" rx="${n1(w * 0.55)}" ry="${n1(h * 0.6)}" fill="url(#${u}h)" class="${o.still ? '' : 'flick'}"/>` : '';
  return `<svg viewBox="-44 0 304 190" class="dragon dimg ${o.cls || ''}" role="img" aria-label="${d.name || 'ejderha'}">
    ${albF}${o.noShadow ? "" : `<ellipse cx="108" cy="180" rx="${n1(70 * sc)}" ry="${n1(7 * sc)}" fill="#000" opacity=".38"/>`}${cos.under}${halo}
    <g ${flip}><g class="${o.still ? '' : 'dr-breathe'}">${cos.back}<g style="filter:${f};isolation:isolate"><image href="${src}" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" preserveAspectRatio="xMidYMax meet"/>${d.dead ? '' : lookLayers(d, x, y, w, h, u, pig, o)}${eyeLayer(d, src, x, y, w, h, u, pig)}</g>${cos.front}</g>${cos.aura}</g></svg>`;
}
// Göz rengi geni: çizimin kendi göz rengi değilse irisi maskeyle yeniden boyar (parlaklık ve gölge korunur)
/* ---------- Kozmetik çizimleri: her biri (0,0) merkezli, birim ölçekli ---------- */
const COS_ART = {
  bandana: () => `<path d="M-14,-4 Q0,4 14,-4 L4,12 Q0,16 -4,12 Z" fill="#c8323a" stroke="#4a0a10" stroke-width="1.2"/><path d="M-12,-2 Q0,4 12,-2" stroke="#f0d070" stroke-width="1.3" fill="none" stroke-dasharray="2 1.6"/><circle cx="2" cy="6" r="1.3" fill="#f0d070"/><circle cx="-3" cy="3" r="1" fill="#f0d070"/><path d="M12,-4 l6,-3 l-1,6 z" fill="#a82830" stroke="#4a0a10" stroke-width=".8"/>`,
  can: () => `<path d="M-11,-3 Q0,4 11,-3" stroke="#6a3a1a" stroke-width="2.2" fill="none"/><path d="M-5,3 Q-5,-2 0,-2 Q5,-2 5,3 L7,10 L-7,10 Z" fill="#d0803e" stroke="#4a2410" stroke-width="1.2"/><circle cy="11.5" r="2" fill="#4a2410"/><path d="M-3,1 Q-2,-1 0,-1" stroke="#ffe0b0" stroke-width="1.1" fill="none"/>`,
  nazar: () => `<path d="M-11,-3 Q0,4 11,-3" stroke="#e8c070" stroke-width="1.6" fill="none"/><circle cy="8" r="7" fill="#1a4ab8" stroke="#0a1a4a" stroke-width="1"/><circle cy="8" r="4.6" fill="#fff"/><circle cy="8" r="3" fill="#5ab4f0"/><circle cy="8" r="1.5" fill="#0a0a1a"/><circle cx="-2.4" cy="5.2" r="1.1" fill="#fff" opacity=".85"/>`,
  cicektac: () => [-2, -1, 0, 1, 2].map(i => { const x = i * 6.4, y = Math.abs(i) * 1.8, c = i % 2 ? '#e8343a' : '#fffaf0', cc = i % 2 ? '#2a0a0a' : '#f0c030'; return `<g transform="translate(${x},${y})"><ellipse cx="0" cy="4" rx="4" ry="1.6" fill="#4a8a30"/>${[0, 72, 144, 216, 288].map(r => `<ellipse cx="0" cy="-2.4" rx="1.7" ry="2.6" fill="${c}" stroke="#00000033" stroke-width=".5" transform="rotate(${r})"/>`).join('')}<circle r="1.6" fill="${cc}"/></g>`; }).join(''),
  altintac: () => `<path d="M-13,6 L-13,-4 L-7,1 L0,-9 L7,1 L13,-4 L13,6 Z" fill="#f2c444" stroke="#7a4a08" stroke-width="1.3"/><rect x="-13.5" y="4" width="27" height="4.5" rx="1" fill="#d8a020" stroke="#7a4a08" stroke-width="1"/><circle cy="-9" r="1.8" fill="#ffe08a" stroke="#7a4a08" stroke-width=".7"/><circle cx="-13" cy="-4" r="1.5" fill="#ffe08a" stroke="#7a4a08" stroke-width=".6"/><circle cx="13" cy="-4" r="1.5" fill="#ffe08a" stroke="#7a4a08" stroke-width=".6"/><circle cy="0" r="2.5" fill="#d81a30" stroke="#5a0a10" stroke-width=".6"/><circle cx="-7" cy="6.2" r="1.5" fill="#2a8ad8"/><circle cx="7" cy="6.2" r="1.5" fill="#2a8ad8"/><path d="M-10,-1 L-10,4" stroke="#fff6c8" stroke-width="1" opacity=".7"/>`,
  sorguc: () => `<path d="M0,4 C-4,-8 2,-21 9,-29 C6,-18 6,-8 2,4 Z" fill="#f6f2ea" stroke="#8a7a60" stroke-width="1"/><path d="M1,2 C0,-8 4,-18 8,-27" stroke="#c8b890" stroke-width=".8" fill="none"/><path d="M3,-6 l4,-2 M4,-12 l4,-3 M2,-1 l4,-1" stroke="#c8b890" stroke-width=".6"/><ellipse cx="0" cy="5" rx="5.5" ry="3.8" fill="#e8b830" stroke="#7a4a08" stroke-width="1"/><circle cx="0" cy="5" r="2.1" fill="#1aa86a" stroke="#0a3a20" stroke-width=".5"/>`,
  kurdele: () => `<path d="M0,0 C-11,-10 -13,5 0,0 C13,-10 13,5 0,0 Z" fill="#e83a6a" stroke="#6a0a2a" stroke-width="1.1"/><path d="M0,0 L-5,11 M0,0 L5,11" stroke="#e83a6a" stroke-width="3" stroke-linecap="round"/><circle r="2.4" fill="#b81a4a" stroke="#6a0a2a" stroke-width=".7"/>`,
  halka: () => [-5, 1, 7].map(x => `<ellipse cx="${x}" rx="2.4" ry="6.8" fill="none" stroke="#7a4a08" stroke-width="3.6"/><ellipse cx="${x}" rx="2.4" ry="6.8" fill="none" stroke="#f2c444" stroke-width="2.2"/>`).join(''),
};
// Taban ve aura dragonImg koordinatlarında çizilir
function cosTaban(k, sc, u, still) {
  const rx = 76 * sc, ry = 11 * sc, at = `transform="translate(108,180)"`;
  if (k === 'kilim') return `<g ${at}><ellipse rx="${n1(rx)}" ry="${n1(ry)}" fill="#8a2420" stroke="#3a0a08" stroke-width="1.5"/><ellipse rx="${n1(rx * .86)}" ry="${n1(ry * .78)}" fill="none" stroke="#e8b040" stroke-width="1.6" stroke-dasharray="5 3"/><ellipse rx="${n1(rx * .55)}" ry="${n1(ry * .5)}" fill="#c8462a" stroke="#2a1a4a" stroke-width="1.4"/><ellipse rx="${n1(rx * .22)}" ry="${n1(ry * .22)}" fill="#2a3a8a"/></g>`;
  if (k === 'cicekh') return `<g ${at}>${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, x = Math.cos(a) * rx * .92, y = Math.sin(a) * ry * .9, c = ['#e8343a', '#fffaf0', '#f0c030', '#c86ae8'][i % 4]; return `<g transform="translate(${n1(x)},${n1(y)}) scale(${n1(sc * .9)})"><circle r="3.4" fill="#3a7a28"/>${[0, 90, 180, 270].map(r => `<circle cx="0" cy="-2" r="1.8" fill="${c}" transform="rotate(${r + i * 20})"/>`).join('')}<circle r="1.2" fill="#f8d040"/></g>`; }).join('')}</g>`;
  if (k === 'run') return `<g ${at}><g transform="scale(1,${n1(ry / rx)})"><g class="${still ? '' : 'runrot'}"><circle r="${n1(rx)}" fill="#4ad8ff22" stroke="#7ae8ff" stroke-width="${n1(3 * rx / ry * .25)}" filter="url(#${u}rg)"/><circle r="${n1(rx * .8)}" fill="none" stroke="#7ae8ff" stroke-width="${n1(rx / ry * .4)}" stroke-dasharray="${n1(rx * .1)} ${n1(rx * .06)}"/>${Array.from({ length: 8 }, (_, i) => `<path d="M0,${n1(-rx * .9)} l${n1(rx * .04)},${n1(rx * .06)} l${n1(-rx * .08)},0 z" fill="#c8f6ff" transform="rotate(${i * 45})"/>`).join('')}</g></g></g><defs><filter id="${u}rg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  if (k === 'kaide') return `<g ${at}><rect x="${n1(-rx * .9)}" y="0" width="${n1(rx * 1.8)}" height="${n1(9 * sc)}" fill="#b8841c" stroke="#5a3a08" stroke-width="1.2"/><ellipse cy="${n1(9 * sc)}" rx="${n1(rx * .9)}" ry="${n1(ry * .8)}" fill="#8a5a10" stroke="#5a3a08" stroke-width="1.2"/><ellipse rx="${n1(rx * .9)}" ry="${n1(ry * .8)}" fill="#f2c444" stroke="#7a4a08" stroke-width="1.3"/><ellipse rx="${n1(rx * .7)}" ry="${n1(ry * .55)}" fill="none" stroke="#fff3b0" stroke-width="1" opacity=".7"/></g>`;
  return '';
}
function cosAura(k, x, y, w, h, seed, still) {
  const R = seeded(seed), n = { kivilcim: 12, kar: 14, kelebek: 5, yildiz: 12 }[k] || 0;
  return `<g class="aura aura-${k}">${Array.from({ length: n }, (_, i) => {
    const px = x + w * (.1 + R() * .8), py = y + h * (.1 + R() * .8), dl = (R() * 3).toFixed(2), sz = .7 + R() * .7;
    const st = still ? '' : ` style="animation-delay:-${dl}s"`;
    if (k === 'kivilcim') return `<circle cx="${n1(px)}" cy="${n1(py)}" r="${n1(1.6 * sz)}" fill="#ffb04a"${st} class="ak"/>`;
    if (k === 'kar') return `<g transform="translate(${n1(px)},${n1(py)}) scale(${n1(sz)})"><g${st} class="ak"><path d="M-3,0 H3 M0,-3 V3 M-2,-2 L2,2 M-2,2 L2,-2" stroke="#fff" stroke-width=".9" stroke-linecap="round"/></g></g>`;
    if (k === 'kelebek') { const c = ['#f0a030', '#5ab4f0', '#e85a9a', '#f6f0e0'][i % 4]; return `<g transform="translate(${n1(px)},${n1(py)}) scale(${n1(sz * 1.2)})"><g${st} class="ak"><ellipse cx="-2.4" cy="-1" rx="2.6" ry="1.9" fill="${c}" class="wl"/><ellipse cx="2.4" cy="-1" rx="2.6" ry="1.9" fill="${c}" class="wr"/><rect x="-.4" y="-2.5" width=".8" height="4.5" rx=".4" fill="#2a1a0a"/></g></g>`; }
    if (k === 'yildiz') return `<g transform="translate(${n1(px)},${n1(py)}) scale(${n1(sz)})"><path${st} class="ak" d="M0,-4 L1,-1 L4,0 L1,1 L0,4 L-1,1 L-4,0 L-1,-1 Z" fill="#fff6c8"/></g>`;
    return '';
  }).join('')}</g>`;
}
/* Süsler katmanlıdır: arka parça çizimin altında, ön parça üstünde kalır; böylece halka kuyruktan geçer,
   kayış boynu sarar, çiçek tacının arka yarısı başın ardında kalır. Ölçüler COS_GEO'dan (elle okunmuş). */
function cosLayers(d, x, y, w, h, u, sc, o, src) {
  const none = { under: '', back: '', front: '', aura: '' };
  const C = d.cos; if (!C || d.dead) return none;
  const key = d.el + '-' + (d.stage || 'yetiskin'), G = o.geo || COS_GEO[key]; if (!G) return none;
  const P = q => [x + q[0] * w, y + q[1] * h], deg = r => r * 180 / Math.PI, F = n1;
  const box = `x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}"`;
  // silüet maskesi: çizimin kendi alfası; kayış ve kurdele asla dışarı taşmaz
  const mr = o.geo ? `x="${F(x - w * .1)}" y="${F(y - h * .1)}" width="${F(w * 1.2)}" height="${F(h * 1.2)}"` : 'x="-44" y="0" width="304" height="190"';
  let defs = `<mask id="${u}sil" maskUnits="userSpaceOnUse" ${mr} style="mask-type:alpha"><image href="${src}" ${box} preserveAspectRatio="${o.geo ? 'none' : 'xMidYMax meet'}"${o.maskFlip ? ` transform="translate(${F(2 * x + w)},0) scale(-1,1)"` : ''}/></mask>`;
  let back = '', front = '';
  const gold = id => `<linearGradient id="${u}${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#f0c040"/><stop offset="1" stop-color="#8a5a0c"/></linearGradient>`;
  defs += gold('g');
  // ---------- BAŞ: perspektifli taç, arka yarısı başın ardında ----------
  if (C.bas) {
    const [lx, ly] = P(G.L), [rx, ry] = P(G.R), a = deg(Math.atan2(ry - ly, rx - lx)), adult = d.stage !== 'yavru';
    // genç/yetişkinde taç kafatasının tepesine, boynuz dibine doğru oturur ve daha dardır
    // pozlarda (o.geo) noktalar tacın oturacağı yere elle konur: ek kaydırma ve daraltma yok
    const W = Math.hypot(rx - lx, ry - ly) * (o.geo ? 1 : adult ? .78 : .92), cx = (lx + rx) / 2 - (o.geo ? 0 : adult ? .012 * w : 0), cy = (ly + ry) / 2 - (o.geo ? 0 : (adult ? .03 : .012) * h);
    const T = `translate(${F(cx)},${F(cy)}) rotate(${F(a)})`, ex = W * .5, ey = W * .17, hgt = W * .42;
    const ell = (t, dy = 0) => [Math.cos(t) * ex, Math.sin(t) * ey + dy];
    if (C.bas === 'altintac') {
      const band = (t0, t1, fill) => { const N = 14, top = [], bot = []; for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N; top.push(ell(t, -W * .13)); bot.push(ell(t, 0)); } return `<path d="M${top.map(p => p.map(F).join(',')).join(' L')} L${bot.reverse().map(p => p.map(F).join(',')).join(' L')} Z" fill="${fill}" stroke="#5a3404" stroke-width=".9" stroke-linejoin="round"/>`; };
      const prong = (t, big, fill) => { const [bx, by] = ell(t, -W * .12), s = big ? 1 : .72, hw = W * .09 * s; return `<path d="M${F(bx - hw)},${F(by)} L${F(bx)},${F(by - hgt * s)} L${F(bx + hw)},${F(by)} Z" fill="${fill}" stroke="#5a3404" stroke-width=".9" stroke-linejoin="round"/><circle cx="${F(bx)}" cy="${F(by - hgt * s)}" r="${F(W * .045)}" fill="#ffe89a" stroke="#5a3404" stroke-width=".6"/>`; };
      back += `<g transform="${T}">${band(Math.PI, Math.PI * 2, '#9a6a14')}${[1.25, 1.5, 1.75].map((k, i) => prong(Math.PI * k, i === 1, '#b07c18')).join('')}</g>`;
      front += `<g transform="${T}">${[.15, .5, .85].map((k, i) => prong(Math.PI * k, i === 1, `url(#${u}g)`)).join('')}${band(0, Math.PI, `url(#${u}g)`)}`
        + [[.5, '#c8102a', .07], [.25, '#2a7ad0', .045], [.75, '#2a7ad0', .045]].map(([k, c, r]) => { const [gx, gy] = ell(Math.PI * k, -W * .065); return `<circle cx="${F(gx)}" cy="${F(gy)}" r="${F(W * r)}" fill="${c}" stroke="#3a0a10" stroke-width=".5"/><circle cx="${F(gx - W * r * .3)}" cy="${F(gy - W * r * .3)}" r="${F(W * r * .3)}" fill="#fff" opacity=".7"/>`; }).join('') + `</g>`;
    }
    if (C.bas === 'cicektac') {
      const fl = (t, f) => { const [px, py] = ell(t, -W * .04), c = f % 2 ? '#e8343a' : '#fffaf0', cc = f % 2 ? '#3a0a0a' : '#f0c030', s = W / 34; return `<g transform="translate(${F(px)},${F(py)}) scale(${F(s)})"><ellipse cx="0" cy="2.6" rx="3.6" ry="1.5" fill="#4a8a30"/>${[0, 72, 144, 216, 288].map(r => `<ellipse cx="0" cy="-2.3" rx="1.7" ry="2.5" fill="${c}" stroke="#0004" stroke-width=".5" transform="rotate(${r})"/>`).join('')}<circle r="1.5" fill="${cc}"/></g>`; };
      const vine = (t0, t1) => `<path d="${Array.from({ length: 15 }, (_, i) => { const [px, py] = ell(t0 + (t1 - t0) * i / 14, -W * .04); return `${i ? 'L' : 'M'}${F(px)},${F(py)}`; }).join(' ')}" fill="none" stroke="#3a6a24" stroke-width="${F(W / 26)}" stroke-linecap="round"/>`;
      back += `<g transform="${T}">${vine(Math.PI, Math.PI * 2)}${[1.2, 1.45, 1.7].map((k, i) => fl(Math.PI * k, i)).join('')}</g>`;
      front += `<g transform="${T}">${vine(0, Math.PI)}${[.06, .28, .5, .72, .94].map((k, i) => fl(Math.PI * k, i + 1)).join('')}</g>`;
    }
    if (C.bas === 'sorguc') {
      const [bx, by] = ell(Math.PI * .62, -W * .05);
      front += `<g transform="${T} translate(${F(bx)},${F(by)}) rotate(-38) scale(${F(W / 24)}) scale(-1,1)">${COS_ART.sorguc()}</g>`;
    }
  }
  // ---------- BOYUN: enseden boğaza alçalan, silüetle kırpılan kayış ----------
  if (C.boyun) {
    const [ax, ay] = P(G.e1), [bx, by] = P(G.e2), L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux; // n: aşağı-normal
    const sag = L * .1, qx = (ax + bx) / 2 + nx * sag, qy = (ay + by) / 2 + ny * sag;
    const bw = Math.max(2.2, L * (C.boyun === 'bandana' ? .2 : .13));
    const pt = t => [(1 - t) ** 2 * ax + 2 * (1 - t) * t * qx + t * t * bx, (1 - t) ** 2 * ay + 2 * (1 - t) * t * qy + t * t * by];
    const cord = `M${F(ax - ux * L * .15)},${F(ay - uy * L * .15)} L${F(ax)},${F(ay)} Q${F(qx)},${F(qy)} ${F(bx)},${F(by)}`;
    const col = { bandana: ['#c8323a', '#3a0608'], can: ['#7a4422', '#241008'], nazar: ['#6a3a1c', '#1e0c04'] }[C.boyun];
    defs += `<linearGradient id="${u}cs" gradientUnits="userSpaceOnUse" x1="${F(ax)}" y1="${F(ay)}" x2="${F(bx)}" y2="${F(by)}"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#fff" stop-opacity=".12"/></linearGradient>`;
    front += `<g mask="url(#${u}sil)"><path d="${cord}" fill="none" stroke="${col[1]}" stroke-width="${F(bw + 1.6)}"/><path d="${cord}" fill="none" stroke="${col[0]}" stroke-width="${F(bw)}"/>`
      + `<path d="${cord}" fill="none" stroke="url(#${u}cs)" stroke-width="${F(bw)}"/>`
      + (C.boyun !== 'bandana' ? `<path d="${cord}" fill="none" stroke="#e8c090" stroke-opacity=".55" stroke-width="${F(Math.max(.4, bw * .1))}" stroke-dasharray="${F(bw * .45)} ${F(bw * .35)}" transform="translate(${F(-nx * bw * .3)},${F(-ny * bw * .3)})"/><path d="${cord}" fill="none" stroke="#e8c090" stroke-opacity=".55" stroke-width="${F(Math.max(.4, bw * .1))}" stroke-dasharray="${F(bw * .45)} ${F(bw * .35)}" transform="translate(${F(nx * bw * .3)},${F(ny * bw * .3)})"/>` : '')
      + `</g>`;
    const [hx, hy] = pt(.78), hs = Math.max(.45, Math.min(1.5, L / 30));
    if (C.boyun === 'nazar' || C.boyun === 'can') {
      const ring = `<circle cx="${F(hx)}" cy="${F(hy + bw * .35)}" r="${F(bw * .32)}" fill="none" stroke="#e8c070" stroke-width="${F(Math.max(.6, bw * .14))}"/>`;
      const pend = C.boyun === 'nazar'
        ? `<circle cy="9" r="7" fill="#1a4ab8" stroke="#0a1a4a" stroke-width="1"/><circle cy="9" r="4.6" fill="#fff"/><circle cy="9" r="3" fill="#5ab4f0"/><circle cy="9" r="1.5" fill="#0a0a1a"/><circle cx="-2.4" cy="6.2" r="1.2" fill="#fff" opacity=".85"/>`
        : `<path d="M-5,7 Q-5,1.5 0,1.5 Q5,1.5 5,7 L7,14 L-7,14 Z" fill="#d0803e" stroke="#4a2410" stroke-width="1.2"/><circle cy="15.4" r="2" fill="#4a2410"/><path d="M-3,5 Q-2,3 0,3" stroke="#ffe0b0" stroke-width="1.1" fill="none"/>`;
      front += ring + `<g transform="translate(${F(hx)},${F(hy + bw * .55)}) scale(${F(hs * .75)})">${pend}</g>`;
    }
    if (C.boyun === 'bandana') {
      const [p1x, p1y] = pt(.52), [p2x, p2y] = pt(.97), tx = (p1x + p2x) / 2 + L * .015, ty = Math.max(p1y, p2y) + L * .36;
      defs += `<linearGradient id="${u}bd" gradientUnits="userSpaceOnUse" x1="0" y1="${F(p1y)}" x2="0" y2="${F(ty)}"><stop offset="0" stop-color="#e6474e"/><stop offset="1" stop-color="#8a1820"/></linearGradient>`;
      front += `<path d="M${F(p1x)},${F(p1y)} Q${F((p1x + p2x) / 2)},${F((p1y + p2y) / 2 + L * .08)} ${F(p2x)},${F(p2y)} Q${F(p2x - L * .02)},${F((p2y + ty) / 2)} ${F(tx)},${F(ty)} Q${F(p1x + L * .02)},${F((p1y + ty) / 2)} ${F(p1x)},${F(p1y)} Z" fill="url(#${u}bd)" stroke="#3a0608" stroke-width=".9" stroke-linejoin="round"/>`
        + Array.from({ length: 6 }, (_, i) => { const t = (i + .5) / 6; return `<circle cx="${F(p1x + (tx - p1x) * t)}" cy="${F(p1y + (ty - p1y) * t)}" r="${F(L * .016)}" fill="#f6e2a0"/><circle cx="${F(p2x + (tx - p2x) * t)}" cy="${F(p2y + (ty - p2y) * t)}" r="${F(L * .016)}" fill="#f6e2a0"/>`; }).join('');
    }
  }
  // ---------- KUYRUK ----------
  if (C.kuyruk === 'halka' && G.rings) {
    G.rings.forEach((R, i) => {
      const [cx, cy] = P(R.c), r = R.r * h, sw = Math.max(1.1, r * .3);
      const ringFull = `<circle cx="${F(cx)}" cy="${F(cy)}" r="${F(r)}" fill="none" stroke="#5a3606" stroke-width="${F(sw + 1.1)}"/><circle cx="${F(cx)}" cy="${F(cy)}" r="${F(r)}" fill="none" stroke="url(#${u}g)" stroke-width="${F(sw)}"/>`;
      back += ringFull;  // kuyruğun içinden geçen kısım çizimin altında kalır
      // ön geçiş: delikten çıkıp kenara kadar görünen yay
      const a0 = R.a0 * Math.PI / 180, a1 = R.a1 * Math.PI / 180, p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
      let da = ((R.a1 - R.a0) * R.dir + 720) % 360; const sweep = R.dir > 0 ? 1 : 0;
      const arc = `M${F(p0[0])},${F(p0[1])} A${F(r)},${F(r)} 0 ${da > 180 ? 1 : 0} ${sweep} ${F(p1[0])},${F(p1[1])}`;
      front += `<path d="${arc}" fill="none" stroke="#5a3606" stroke-width="${F(sw + 1.1)}" stroke-linecap="round"/><path d="${arc}" fill="none" stroke="url(#${u}g)" stroke-width="${F(sw)}" stroke-linecap="round"/>`;
      front += `<ellipse cx="${F(p1[0])}" cy="${F(p1[1])}" rx="${F(sw * .9)}" ry="${F(sw * .7)}" fill="#1a0a04" opacity=".7"/>`;
      if (i === 1) { const [bx2, by2] = [cx + (cx - P(R.hole)[0]) * .95, cy + (cy - P(R.hole)[1]) * .95]; front += `<circle cx="${F(bx2)}" cy="${F(by2)}" r="${F(sw * .95)}" fill="#c8102a" stroke="#4a0a10" stroke-width=".6"/><circle cx="${F(bx2 - sw * .3)}" cy="${F(by2 - sw * .3)}" r="${F(sw * .3)}" fill="#ffd0d8"/>`; }
    });
  }
  if (C.kuyruk === 'kurdele' && G.P) {
    const thp = Math.min((G.th || .05) * h, h * (d.stage === 'yavru' ? .1 : .055)), [p1x, p1y] = P(G.P), [q1x, q1y] = P(G.Q), [tx, ty] = P(G.top), bw = Math.max(2, thp * .32), s = Math.max(.24, thp / 21);
    defs += `<linearGradient id="${u}kd" x1="0" y1="-8" x2="0" y2="6" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff8ab0"/><stop offset="1" stop-color="#b8204e"/></linearGradient>`;
    front += `<g mask="url(#${u}sil)"><path d="M${F(p1x)},${F(p1y)} L${F(q1x)},${F(q1y)}" stroke="#5a0a24" stroke-width="${F(bw + 1.4)}"/><path d="M${F(p1x)},${F(p1y)} L${F(q1x)},${F(q1y)}" stroke="#e83a6a" stroke-width="${F(bw)}"/><path d="M${F(p1x)},${F(p1y)} L${F(q1x)},${F(q1y)}" stroke="#fff" stroke-opacity=".25" stroke-width="${F(bw * .25)}"/></g>`;
    front += `<g transform="translate(${F(tx)},${F(ty)}) scale(${F(s)})"><path d="M-1,1 C-3,6 -6,10 -5,15 L-2.6,13 L-.6,15.6 C-.4,11 0,6 1,1 Z" fill="url(#${u}kd)" stroke="#5a0a24" stroke-width=".8"/><path d="M1,1 C3,6 7,9 8,14 L5.4,12.6 L4,15.4 C2.6,11 1,6 -.4,1 Z" fill="url(#${u}kd)" stroke="#5a0a24" stroke-width=".8"/><path d="M0,0 C-6,-8 -13,-6 -11,1 C-10,4 -5,3 0,0 Z" fill="url(#${u}kd)" stroke="#5a0a24" stroke-width="1"/><path d="M0,0 C6,-8 13,-6 11,1 C10,4 5,3 0,0 Z" fill="url(#${u}kd)" stroke="#5a0a24" stroke-width="1"/><ellipse rx="2.6" ry="2.2" fill="#d8306a" stroke="#5a0a24" stroke-width=".8"/><circle cx="-.7" cy="-.7" r=".7" fill="#ffd0e0"/></g>`;
  }
  return { under: C.taban ? cosTaban(C.taban, sc, u, o.still) : '', back: `<defs>${defs}</defs>${back}`, front, aura: C.aura ? cosAura(C.aura, x, y, w, h, seedOf(d.id) + 11, o.still) : '' };
}
function cosIcon(id) {
  const a = asset('cos-' + id);
  if (a) return `<img src="${a}" class="cosic cosic-img" alt="">`;
  const c = COSMETICS[id]; let inner;
  if (c.slot === 'taban') inner = `<g transform="translate(-108,-170) scale(1)">${cosTaban(id, .42, 'ci' + (++SVGUID), true)}</g>`;
  else if (c.slot === 'aura') inner = cosAura(id, -26, -22, 52, 44, 7, true);
  else inner = `<g transform="scale(${c.slot === 'bas' && id === 'sorguc' ? 1.1 : 1.5}) translate(0,${id === 'sorguc' ? 10 : c.slot === 'boyun' ? -3 : 0})">${COS_ART[id]()}</g>`;
  if (id === 'halka') inner = `<rect x="-30" y="-5" width="60" height="12" rx="6" fill="#8a6a50"/>` + [-12, 0, 12].map(x => `<circle cx="${x}" cy="10" r="7" fill="none" stroke="#6a4208" stroke-width="3.6"/><circle cx="${x}" cy="10" r="7" fill="none" stroke="#f2c444" stroke-width="2.4"/>`).join('') + `<rect x="-30" y="-5" width="60" height="9" rx="4.5" fill="#a88468"/>` + [-12, 0, 12].map(x => `<circle cx="${x - 5}" cy="5" r="1.2" fill="#f2c444"/><circle cx="${x + 5}" cy="5" r="1.2" fill="#f2c444"/>`).join('');
  return `<svg viewBox="-30 -26 60 52" class="cosic" aria-hidden="true">${inner}</svg>`;
}
/* Renk genleri: pul ve süs bölgelerini maskeyle boyar (ışık ve gölge korunur), deseni ve parıltıyı ekler. */
function lookLayers(d, x, y, w, h, u, pig, o) {
  if (typeof pulOf !== 'function') return '';
  const key = d.el + '-' + (d.stage || 'yetiskin'), mp = o.mk || o.mp || asset('rg-pul-' + key), ms = o.mk || (o.mp ? o.ms : asset('rg-sus-' + key));
  if (!mp) return '';
  const box = `x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"`, img = m => `<image href="${m}" ${box} preserveAspectRatio="${o.mp || o.mk ? 'none' : 'xMidYMax meet'}"/>`;
  const mr = o.mr || 'x="-44" y="0" width="304" height="190"';
  // o.mk: tek görselde iki maske (pul gri kanallarda, süs alfada); süzgeçle ayrılır
  const chF = o.mk ? `<filter id="${u}cP" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1"><feColorMatrix values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1"/></filter><filter id="${u}cS" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1"><feColorMatrix values="0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 1"/></filter>` : '';
  const mk = (id, m) => `<mask id="${u}${id}" maskUnits="userSpaceOnUse" ${mr}>${o.mk ? img(m).replace('<image ', `<image filter="url(#${u}c${id})" `) : img(m)}</mask>`;
  let defs = chF + mk('P', mp) + (ms ? mk('S', ms) : ''), out = '';
  const P = pulOf(d), Sx = susOf(d);
  if (pig === 'N' || pig === 'am') {
    if (!P.native) out += `<rect ${box} fill="${colCss(P)}" mask="url(#${u}P)" style="mix-blend-mode:color" opacity=".9"/>`;
    if (ms && !Sx.native) out += `<rect ${box} fill="${colCss(Sx)}" mask="url(#${u}S)" style="mix-blend-mode:color" opacity=".92"/>`;
  }
  // desen geni (çizgili/benekli) pul bölgesinde koyu bir doku olarak görünür
  if (d.pat && d.pat !== 'd') {
    const pw = w * 0.07, id = u + 'pt';
    const stripes = d.pat.includes('C') ? `<path d="M0,0 L${n1(pw)},${n1(pw)}" stroke="#000" stroke-width="${n1(pw * 0.32)}" stroke-linecap="square"/>` : '';
    const spots = d.pat.includes('B') ? `<ellipse cx="${n1(pw * .28)}" cy="${n1(pw * .66)}" rx="${n1(pw * .16)}" ry="${n1(pw * .11)}"/><ellipse cx="${n1(pw * .8)}" cy="${n1(pw * .22)}" rx="${n1(pw * .09)}" ry="${n1(pw * .07)}"/><circle cx="${n1(pw * .62)}" cy="${n1(pw * .86)}" r="${n1(pw * .05)}"/>` : '';
    defs += `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${n1(pw)}" height="${n1(pw * (d.pat === 'C' ? 1 : 1.37))}" patternTransform="rotate(${d.pat === 'C' ? 28 : 23})">${stripes}${spots}</pattern>`;
    const light = d.el === 'buz' || pig === 'a';
    out += `<rect ${box} fill="url(#${id})" mask="url(#${u}P)" style="mix-blend-mode:multiply" opacity="${light ? .13 : .28}"/>`;
  }
  if (parOf(d)) {
    defs += `<linearGradient id="${u}sh" x1="0" x2="1" y1="0" y2=".35"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff8dc" stop-opacity=".85"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
    out += `<g mask="url(#${u}P)" style="mix-blend-mode:screen"><rect class="${o.still ? '' : 'shim'}" x="${n1(x - w)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" fill="url(#${u}sh)"/></g>`;
  }
  return `<defs>${defs}</defs>${out}`;
}
function eyeLayer(d, src, x, y, w, h, u, pig) {
  const ec = pig === 'a' ? 'kizil' : eyeColor(d), key = 'dr-' + d.el + '-' + (d.stage || 'yetiskin');
  if (d.dead || ec === EL_EYE[d.el] || !asset('eye-' + key.slice(3))) return '';
  const m = asset('eye-' + key.slice(3)), box = `x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"`;
  return `<mask id="${u}m" maskUnits="userSpaceOnUse" x="-44" y="0" width="304" height="190"><image href="${m}" ${box} preserveAspectRatio="xMidYMax meet"/></mask>
    <rect ${box} fill="${EYEC[ec].c}" mask="url(#${u}m)" style="mix-blend-mode:color"/><rect ${box} fill="${EYEC[ec].c}" mask="url(#${u}m)" opacity=".18" style="mix-blend-mode:screen"/>`;
}
function dragonSVG(d, o = {}) {
  const dsrc = asset('dr-' + d.el + '-' + (d.stage || 'yetiskin')); if (dsrc) return dragonImg(d, o, dsrc);
  const u = 'd' + (++SVGUID);
  const P = PAL[d.el] || PAL.ates;
  const st = d.st || { gu: 40, ce: 40, da: 40, ze: 40 };
  const stage = d.stage || 'yetiskin';
  const sc = { yavru: 0.7, genc: 0.85, yetiskin: 1 }[stage];
  const headS = { yavru: 1.42, genc: 1.15, yetiskin: 1 }[stage];
  const nk = { yavru: 0.55, genc: 0.8, yetiskin: 1 }[stage];
  const wingStage = { yavru: 0.5, genc: 0.78, yetiskin: 1 }[stage];
  const bulk = 0.86 + Math.min(st.da, 170) / 170 * 0.3;
  const wingS = (0.8 + Math.min(st.ce, 170) / 170 * 0.45) * wingStage;
  const hornS = (0.75 + Math.min(st.gu, 170) / 170 * 0.65) * (stage === 'yavru' ? 0.5 : stage === 'genc' ? 0.8 : 1);
  const eyeR = 4.6 + Math.min(st.ze, 170) / 170 * 1.6;
  const eye = d.eye === 'A' ? '#ffcf3a' : P.eye;
  const R = seeded(seedOf(d.id));
  const cx = 122, cy = 120, rx = 50 * bulk, ry = 30 * bulk, G = 168;
  const hx = cx + rx * 0.72 + 36 * nk, hy = cy - ry * 0.7 - 52 * nk;
  const L = P.line, sw = 2.1;
  const ol = `stroke="${L}" stroke-width="${sw}" stroke-linejoin="round"`;

  // --- gövde ---
  const torso = `M${n1(cx - rx)},${n1(cy + 2)} C${n1(cx - rx)},${n1(cy - ry * 0.9)} ${n1(cx - rx * 0.2)},${n1(cy - ry * 1.15)} ${n1(cx + rx * 0.45)},${n1(cy - ry * 0.95)} C${n1(cx + rx * 0.85)},${n1(cy - ry * 0.8)} ${n1(cx + rx * 1.08)},${n1(cy - ry * 0.2)} ${n1(cx + rx)},${n1(cy + ry * 0.35)} C${n1(cx + rx * 0.9)},${n1(cy + ry * 0.95)} ${n1(cx + rx * 0.2)},${n1(cy + ry * 1.05)} ${n1(cx - rx * 0.3)},${n1(cy + ry * 0.95)} C${n1(cx - rx * 0.75)},${n1(cy + ry * 0.9)} ${n1(cx - rx)},${n1(cy + ry * 0.6)} ${n1(cx - rx)},${n1(cy + 2)} Z`;
  // --- boyun ---
  const neck = `M${n1(cx + rx * 0.3)},${n1(cy - ry * 0.98)} C${n1(cx + rx * 0.6)},${n1(cy - ry * 1.7)} ${n1(hx - 34)},${n1(hy + 4)} ${n1(hx - 14)},${n1(hy - 9)} L${n1(hx + 2)},${n1(hy + 12)} C${n1(hx - 10)},${n1(hy + 30)} ${n1(cx + rx * 1.06)},${n1(cy - ry * 0.6)} ${n1(cx + rx * 0.98)},${n1(cy + ry * 0.15)} Z`;
  const throat = `M${n1(hx - 3)},${n1(hy + 15)} C${n1(hx - 14)},${n1(hy + 30)} ${n1(cx + rx * 0.98)},${n1(cy - ry * 0.55)} ${n1(cx + rx * 0.9)},${n1(cy + ry * 0.2)}`;
  // --- kuyruk ---
  const tx = cx - rx, tail = `M${n1(cx - rx * 0.85)},${n1(cy - ry * 0.4)} C${n1(tx - 30)},${n1(cy - ry * 0.6)} ${n1(tx - 58)},${n1(cy + 8)} ${n1(tx - 92)},${n1(cy + 34)} L${n1(tx - 96)},${n1(cy + 41)} C${n1(tx - 58)},${n1(cy + 24)} ${n1(tx - 30)},${n1(cy + ry * 0.8)} ${n1(cx - rx * 0.72)},${n1(cy + ry * 0.62)} Z`;
  const tip = `M${n1(tx - 91)},${n1(cy + 33)} L${n1(tx - 116)},${n1(cy + 26)} L${n1(tx - 106)},${n1(cy + 41)} L${n1(tx - 113)},${n1(cy + 54)} L${n1(tx - 94)},${n1(cy + 43)} Z`;
  // --- bacak ---
  const leg = (x, y, front, far) => {
    const c = far ? `url(#${u}gd)` : `url(#${u}g)`;
    const w = (front ? 10 : 14) * bulk, h = (front ? 14 : 19) * bulk;
    const fy = G - 4;
    return `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n1(h)}" fill="${c}" ${ol}/>
      <path d="M${n1(x - w * 0.55)},${n1(y + h * 0.3)} L${n1(x - w * (front ? 0.5 : 0.75))},${fy} L${n1(x + w * 0.65)},${fy} L${n1(x + w * 0.55)},${n1(y + h * 0.45)} Z" fill="${c}" ${ol}/>
      <ellipse cx="${n1(x + 2)}" cy="${fy + 1}" rx="${n1(w * 0.95)}" ry="5" fill="${far ? P.dark : P.base}" ${ol}/>
      <path d="M${n1(x + w * 0.4)},${fy + 3} l5,2 l-6,1 Z M${n1(x + w * 0.85)},${fy + 1} l6,3 l-7,1 Z M${n1(x - w * 0.1)},${fy + 4} l4,2 l-5,0 Z" fill="${P.horn}" stroke="${L}" stroke-width=".8"/>`;
  };
  // --- kanat (yerel: omuz 0,0) ---
  const wingP = 'M0,0 L18,-58 L-58,-62 Q-48,-47 -63,-35 Q-46,-27 -46,-12 Q-24,-10 -12,4 Z';
  const wingB = 'M18,-58 L-58,-62 M18,-58 L-63,-35 M18,-58 L-46,-12';
  const wx = cx + rx * 0.18, wy = cy - ry * 0.88;
  // --- dikenler ---
  let spines = '';
  const nsp = 7;
  for (let i = 0; i < nsp; i++) {
    const t = i / (nsp - 1), x = cx - rx * 0.75 + t * rx * 1.05;
    const k = (x - cx) / (rx * 1.05), yT = cy - ry * 1.02 * Math.sqrt(Math.max(0, 1 - k * k));
    const h = (6 + 5 * Math.sin(t * 3.1)) * hornS;
    spines += `<path d="M${n1(x - 5)},${n1(yT + 3)} L${n1(x - 2)},${n1(yT - h)} L${n1(x + 5)},${n1(yT + 3)} Z" fill="${P.dark}" ${ol}/>`;
  }
  for (let i = 1; i <= 3; i++) { // boyun dikenleri
    const t = i / 4, x0 = cx + rx * 0.3, y0 = cy - ry * 0.98, x3 = hx - 14, y3 = hy - 9, x1 = cx + rx * 0.6, y1 = cy - ry * 1.7, x2 = hx - 34, y2 = hy + 4;
    const bx = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3 * x3, by = (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3 * y3;
    const h = 7 * hornS * (1 - t * 0.3);
    spines += `<path d="M${n1(bx - 4)},${n1(by + 3)} L${n1(bx - 6)},${n1(by - h)} L${n1(bx + 4)},${n1(by)} Z" fill="${P.dark}" ${ol}/>`;
  }
  // --- desen ---
  let pat = '';
  if (d.pat === 'C' || d.pat === 'CB') for (let k = 0; k < 7; k++) pat += `<path d="M${n1(cx - rx + 6 + k * 15)},${n1(cy - ry - 6)} q8,${n1(ry)} 0,${n1(ry * 2 + 10)}" stroke="${P.pat}" stroke-width="6" fill="none" opacity=".5"/>`;
  if (d.pat === 'B' || d.pat === 'CB') for (let k = 0; k < 10; k++) pat += `<circle cx="${n1(cx - rx * 0.8 + R() * rx * 1.6)}" cy="${n1(cy - ry * 0.85 + R() * ry * 0.95)}" r="${n1(2.2 + R() * 3.6)}" fill="${P.pat}" opacity=".5"/>`;
  // karın plakaları
  let plates = '';
  for (let k = 0; k < 7; k++) { const x = cx - rx * 0.45 + k * rx * 0.17; plates += `<path d="M${n1(x)},${n1(cy + ry * 0.35)} q3,${n1(ry * 0.35)} 0,${n1(ry * 0.7)}" stroke="${P.dark}" stroke-width="1" fill="none" opacity=".35"/>`; }

  // --- boynuzlar (kafa yerel) ---
  const hp = {
    d: [['M-6,-11 C-18,-22 -30,-30 -42,-34 C-30,-22 -20,-12 -12,-4 Z', 1], ['M0,-13 C-10,-28 -18,-38 -28,-46 C-20,-30 -12,-18 -6,-8 Z', 0.85]],
    k: [['M-6,-11 C-26,-38 -50,-22 -40,0 C-36,8 -28,8 -26,2 C-34,-14 -22,-22 -12,-4 Z', 1]],
    t: [['M-12,-9 L-20,-34 L-6,-12 Z', 1], ['M-2,-13 L-2,-38 L6,-13 Z', 1], ['M-17,-3 L-40,-17 L-14,2 Z', 1], ['M6,-13 L12,-30 L12,-11 Z', 0.85]],
  }[d.horn || 'd'];
  const hornSvg = hp.map(([p, op]) => `<path d="${p.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, a, b) => `${n1(a * hornS)},${n1(b * hornS)}`)}" fill="url(#${u}h)" ${ol} opacity="${op}"/>`).join('');

  const flip = o.flip ? `transform="translate(216,0) scale(-1,1)"` : '';
  const anim = o.still ? '' : 'class="dr-idle"';
  const filt = d.dead ? 'filter:grayscale(1) brightness(.6)' : d.hue ? `filter:hue-rotate(${d.hue}deg)` : '';

  return `<svg viewBox="-44 0 304 190" class="dragon ${o.cls || ''}" role="img" aria-label="${d.name || 'ejderha'}">
  <defs>
    <linearGradient id="${u}g" x1="0" y1="0" x2=".15" y2="1"><stop offset="0" stop-color="${P.hi}"/><stop offset=".3" stop-color="${P.hi}"/><stop offset=".3" stop-color="${P.base}"/><stop offset=".68" stop-color="${P.base}"/><stop offset=".68" stop-color="${P.dark}"/><stop offset="1" stop-color="${P.dark}"/></linearGradient>
    <linearGradient id="${u}gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.base}"/><stop offset=".5" stop-color="${P.base}"/><stop offset=".5" stop-color="${P.dark}"/><stop offset="1" stop-color="${P.dark}"/></linearGradient>
    <linearGradient id="${u}w" x1="0" y1="1" x2=".4" y2="0"><stop offset="0" stop-color="${P.wing}"/><stop offset=".55" stop-color="${P.wing}"/><stop offset=".55" stop-color="${P.wing2}"/><stop offset="1" stop-color="${P.wing2}"/></linearGradient>
    <linearGradient id="${u}h" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${P.horn}"/><stop offset="1" stop-color="${P.dark}"/></linearGradient>
    <radialGradient id="${u}e"><stop offset="0" stop-color="${eye}" stop-opacity=".9"/><stop offset="1" stop-color="${eye}" stop-opacity="0"/></radialGradient>
    <clipPath id="${u}c"><path d="${torso}"/></clipPath>
  </defs>
  <ellipse cx="${cx}" cy="${G + 2}" rx="${n1(78 * sc)}" ry="${n1(8 * sc)}" fill="#000" opacity=".35"/>
  <g ${flip}><g transform="translate(130,${G}) scale(${sc}) translate(-130,-${G})"><g style="${filt}"><g ${anim}>
    <g transform="translate(${n1(wx - 12)},${n1(wy + 3)}) scale(${n1(wingS * 0.9)}) rotate(-20)"><g class="wing-b"><path d="${wingP}" fill="${P.wing2}" ${ol}/></g></g>
    <path d="${tail}" fill="url(#${u}g)" ${ol}/><path d="${tip}" fill="${P.dark}" ${ol}/>
    ${leg(cx - rx * 0.5 - 10, cy + ry * 0.35, false, true)}${leg(cx + rx * 0.58 - 10, cy + ry * 0.4, true, true)}
    <path d="${torso}" fill="url(#${u}g)" ${ol}/>
    <g clip-path="url(#${u}c)">${pat}<ellipse cx="${n1(cx + rx * 0.12)}" cy="${n1(cy + ry * 0.72)}" rx="${n1(rx * 0.85)}" ry="${n1(ry * 0.5)}" fill="${P.belly}"/>${plates}
      <path d="M${n1(cx - rx)},${n1(cy - ry * 0.55)} Q${n1(cx)},${n1(cy - ry * 1.35)} ${n1(cx + rx)},${n1(cy - ry * 0.55)}" stroke="${P.glow}" stroke-opacity=".45" stroke-width="4" fill="none"/></g>
    ${spines}
    <path d="${neck}" fill="url(#${u}g)" ${ol}/>
    <path d="${throat}" stroke="${P.belly}" stroke-width="${n1(9 * bulk)}" stroke-linecap="round" fill="none"/>
    <path d="${throat}" stroke="${P.dark}" stroke-width="${n1(9 * bulk)}" stroke-dasharray="1.2 6" fill="none" opacity=".35"/>
    ${leg(cx - rx * 0.5, cy + ry * 0.3, false, false)}
    <g transform="translate(${n1(hx)},${n1(hy)}) scale(${headS})">
      ${hornSvg}
      <path d="M-16,0 L-33,7 L-23,-1 L-35,-7 L-18,-8 Z" fill="${P.wing2}" ${ol}/>
      <path d="M-18,-2 C-18,-14 -6,-18 6,-14 C18,-12 30,-8 40,-3 C44,-1 44,4 40,6 L22,9 C14,12 4,14 -4,13 C-14,12 -18,6 -18,-2 Z" fill="url(#${u}g)" ${ol}/>
      <path d="M22,9 C14,13 4,15 -4,13" stroke="${P.belly}" stroke-width="3" fill="none" opacity=".8"/>
      <path d="M40,5 L13,8" stroke="${L}" stroke-width="1.4"/><path d="M30,6 l2,4 l2,-4 Z M20,7.5 l1.6,3.5 l1.8,-3.6 Z" fill="#fff8e8"/>
      <ellipse cx="37" cy="-1" rx="1.9" ry="1.2" fill="${L}"/>
      <path d="M-7,-12 L17,-9" stroke="${P.dark}" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="6" cy="-5" r="${n1(eyeR * 2.2)}" fill="url(#${u}e)" opacity="${d.eye === 'A' ? 0.9 : 0.45}"/>
      <ellipse cx="6" cy="-5" rx="${n1(eyeR)}" ry="${n1(eyeR * 0.82)}" fill="${eye}" stroke="${L}" stroke-width="1.2"/>
      <ellipse class="pupil" cx="6.8" cy="-5" rx="1.3" ry="${n1(eyeR * 0.68)}" fill="#120a08"/>
      <circle cx="4.4" cy="-6.8" r="1.6" fill="#fff"/><circle cx="8" cy="-3.4" r=".8" fill="#fff" opacity=".85"/>
    </g>
    ${leg(cx + rx * 0.58, cy + ry * 0.38, true, false)}
    <g transform="translate(${n1(wx)},${n1(wy)}) scale(${n1(wingS)})"><g class="wing-f">
      <path d="${wingP}" fill="url(#${u}w)" ${ol} opacity=".97"/>
      <path d="${wingB}" stroke="${P.dark}" stroke-width="1.6" fill="none" opacity=".75"/>
      <path d="M0,0 L18,-58" stroke="${P.base}" stroke-width="5" stroke-linecap="round"/><path d="M0,0 L18,-58" stroke="${L}" stroke-width="1" opacity=".5"/>
      <path d="M18,-58 l5,-6 l-1,7 Z" fill="${P.horn}" stroke="${L}" stroke-width=".8"/>
    </g></g>
  </g></g></g></g>
</svg>`;
}

function eggSVG(e, prog = 0, o = {}) {
  const el = e && e.genes && e.genes.el ? expEl(e.genes.el) : (e && e.el) || 'kor'; const P = PAL[el] || PAL.kor; const u = 'g' + (++SVGUID);
  const esrc = asset('egg-' + el);
  const crack = prog >= 0.5 ? `<path d="M34,40 l7,6 l-4,7 l8,5 l-3,8" stroke="${P.line}" stroke-width="2" fill="none"/>` : '';
  const crack2 = prog >= 0.99 ? `<path d="M64,38 l-6,8 l6,5 l-7,7" stroke="${P.line}" stroke-width="2" fill="none"/><path d="M41,46 l-4,7" stroke="${P.glow}" stroke-width="2.2" opacity=".88"/>` : '';
  if (esrc) {
    return `<svg viewBox="0 0 100 110" class="egg egg-nb ${o.cls || ''}" role="img" aria-label="yumurta">
      <defs><radialGradient id="${u}g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient></defs>
      ${o.glow ? `<circle cx="50" cy="58" r="52" fill="url(#${u}g)" class="flick"/>` : ''}
      <ellipse cx="50" cy="102" rx="28" ry="6" fill="#000" opacity=".42"/>
      <image href="${esrc}" x="6" y="4" width="88" height="98" preserveAspectRatio="xMidYMid meet"/>
      ${crack}${crack2}
    </svg>`;
  }
  const R = seeded(seedOf(e.id));
  let sp = '';
  for (let i = 0; i < 13; i++) sp += `<ellipse cx="${n1(30 + R() * 40)}" cy="${n1(28 + R() * 58)}" rx="${n1(1.5 + R() * 4)}" ry="${n1(1.2 + R() * 3)}" fill="${P.dark}" opacity=".55"/>`;
  return `<svg viewBox="0 0 100 110" class="egg ${o.cls || ''}" role="img" aria-label="yumurta">
    <defs><radialGradient id="${u}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${P.hi}"/><stop offset=".55" stop-color="${P.base}"/><stop offset="1" stop-color="${P.dark}"/></radialGradient>
    <radialGradient id="${u}g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient></defs>
    ${o.glow ? `<circle cx="50" cy="58" r="52" fill="url(#${u}g)" class="flick"/>` : ''}
    <ellipse cx="50" cy="102" rx="26" ry="5" fill="#000" opacity=".35"/>
    <path d="M50,14 C70,14 80,48 80,66 C80,86 67,98 50,98 C33,98 20,86 20,66 C20,48 30,14 50,14 Z" fill="url(#${u})" stroke="${P.line}" stroke-width="1.6"/>
    ${sp}<path d="M38,26 C32,34 29,44 28,54" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".35"/>${crack}${crack2}
  </svg>`;
}

/* ---------- İzometrik ocak binaları ----------
   Kare: yarı genişlik TW, yarı yükseklik TH. Yerel (0,0) = karenin ortası. */
const TW = 56, TH = 28;
function isoBox(x, y, hw, h, top, left, right, line = '#140e0a') {
  const hh = hw / 2;
  return `<path d="M${x - hw},${y - h} L${x},${y + hh - h} L${x},${y + hh} L${x - hw},${y} Z" fill="${left}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M${x + hw},${y - h} L${x},${y + hh - h} L${x},${y + hh} L${x + hw},${y} Z" fill="${right}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M${x},${y - hh - h} L${x + hw},${y - h} L${x},${y + hh - h} L${x - hw},${y - h} Z" fill="${top}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>`;
}
function isoRoof(x, y, hw, h, rh, left, right, line = '#140e0a') {
  const hh = hw / 2;
  return `<path d="M${x - hw - 4},${y - h + 2} L${x},${y + hh - h + 4} L${x},${y - h - rh} Z" fill="${left}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M${x + hw + 4},${y - h + 2} L${x},${y + hh - h + 4} L${x},${y - h - rh} Z" fill="${right}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>`;
}
const shadowE = (rx = 40, ry = 14, y = 4) => `<ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="#000" opacity=".3"/>`;
const rock = (x, y, r, c = '#6e665c', c2 = '#4a443c') => `<path d="M${x - r},${y} C${x - r},${y - r * 1.1} ${x - r * 0.3},${y - r * 1.4} ${x + r * 0.3},${y - r * 1.25} C${x + r},${y - r} ${x + r * 1.1},${y - r * 0.3} ${x + r},${y} Z" fill="${c}" stroke="#1a1612" stroke-width="1.2"/><path d="M${x - r * 0.4},${y - r * 1.15} C${x},${y - r * 1.3} ${x + r * 0.5},${y - r} ${x + r * 0.6},${y - r * 0.6}" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none"/><path d="M${x + r * 0.2},${y} C${x + r * 0.8},${y - r * 0.2} ${x + r},${y - r * 0.5} ${x + r},${y - r * 0.2} L${x + r},${y} Z" fill="${c2}" opacity=".6"/>`;
const flameP = (x, y, s = 1) => `<path class="flame" d="M${x},${y - 22 * s} C${x + 9 * s},${y - 12 * s} ${x + 8 * s},${y} ${x},${y} C${x - 8 * s},${y} ${x - 9 * s},${y - 12 * s} ${x},${y - 22 * s} Z" fill="#ffb347"/><path class="flame" d="M${x},${y - 14 * s} C${x + 4 * s},${y - 8 * s} ${x + 4 * s},${y - 1 * s} ${x},${y - 1 * s} C${x - 4 * s},${y - 1 * s} ${x - 4 * s},${y - 8 * s} ${x},${y - 14 * s} Z" fill="#fff1c4"/>`;
const glowC = (x, y, r, c, op = 0.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity="${op}" class="flick" filter="url(#blur8)"/>`;

const BSPR = {
  in: () => `${shadowE(48, 18)}${rock(-26, 6, 26, '#6a5e52')}${rock(26, 8, 24, '#5e544a')}${rock(0, 0, 40, '#7a6c5e')}
    <path d="M-22,6 L-22,-14 Q-6,-38 12,-14 L12,8 Z" fill="#0d0907" stroke="#1a1612" stroke-width="1.5"/>
    <path d="M-18,8 q10,-8 26,0" stroke="#c9a85a" stroke-width="3" fill="none" opacity=".8"/>
    <rect x="22" y="-46" width="2.5" height="30" fill="#3a2a1e"/><path d="M24.5,-46 L42,-41 L24.5,-35 Z" fill="#c4452a" class="sway"/>`,
  kulucka: () => `${shadowE(44, 16)}<ellipse cx="0" cy="2" rx="40" ry="18" fill="#4a3e34" stroke="#1a1612" stroke-width="1.2"/><ellipse cx="0" cy="-6" rx="40" ry="18" fill="#6a5a4c" stroke="#1a1612" stroke-width="1.2"/>
    ${[...Array(10)].map((_, i) => { const a = i / 10 * 6.283; return `<ellipse cx="${n1(Math.cos(a) * 34)}" cy="${n1(-6 + Math.sin(a) * 14)}" rx="8" ry="5" fill="#857262" stroke="#1a1612" stroke-width=".8"/>`; }).join('')}
    <ellipse cx="0" cy="-8" rx="26" ry="10" fill="#2a1408"/>${glowC(0, -14, 30, '#ff8a3a', 0.6)}${flameP(-10, -8, 0.9)}${flameP(8, -6, 1.1)}
    <ellipse cx="-2" cy="-20" rx="9" ry="12" fill="#efe0c0" stroke="#1a1612" stroke-width="1"/><ellipse cx="11" cy="-17" rx="7" ry="9" fill="#d8c8a8" stroke="#1a1612" stroke-width="1"/>`,
  talim: () => `<path d="M0,-24 L48,0 L0,24 L-48,0 Z" fill="#b8925e" stroke="#5a4028" stroke-width="1.2"/><path d="M0,-18 L36,0 L0,18 L-36,0 Z" fill="none" stroke="#e8d0a0" stroke-dasharray="4 4" opacity=".5"/>
    <rect x="-30" y="-46" width="5" height="44" fill="#6a4a30" stroke="#2a1a10"/><rect x="24" y="-46" width="5" height="44" fill="#6a4a30" stroke="#2a1a10"/><rect x="-32" y="-48" width="62" height="6" fill="#8a6a44" stroke="#2a1a10"/>
    <circle cx="0" cy="-26" r="14" fill="#e8d0a0" stroke="#2a1a10"/><circle cx="0" cy="-26" r="9" fill="#c4452a"/><circle cx="0" cy="-26" r="4" fill="#e8d0a0"/>
    <path d="M-38,10 l8,-4 l4,6 Z" fill="#c9a85a"/>`,
  agirlik: () => `${shadowE(46, 16)}${rock(-22, 8, 18, '#7a746a')}${rock(16, 4, 26, '#6e6860')}${rock(-4, -10, 14, '#8a8478')}
    <path d="M-30,-2 Q0,-28 34,-6" stroke="#c9a85a" stroke-width="2.5" fill="none"/><circle cx="34" cy="-6" r="3" fill="#8a6a44"/>`,
  parkur: () => `<path d="M0,-24 L48,0 L0,24 L-48,0 Z" fill="#4a5e3a" stroke="#22301a" stroke-width="1.2"/>
    ${[[-28, 4], [0, -8], [26, 6]].map(([x, y]) => `<rect x="${x - 14}" y="${y - 24}" width="3" height="24" fill="#6a4a30"/><rect x="${x + 11}" y="${y - 24}" width="3" height="24" fill="#6a4a30"/><rect x="${x - 15}" y="${y - 22}" width="30" height="4" fill="#cfa557" stroke="#2a1a10" stroke-width=".8"/>`).join('')}
    <path d="M30,-40 l0,-20 l16,5 l-16,5" fill="#7cc6e6" stroke="#2a1a10" stroke-width=".8" class="sway"/><rect x="29" y="-60" width="2" height="40" fill="#3a2a1e"/>`,
  kaynak: () => `${shadowE(46, 18)}<ellipse cx="0" cy="0" rx="44" ry="20" fill="#5a524a" stroke="#1a1612" stroke-width="1.2"/><ellipse cx="0" cy="-2" rx="36" ry="15" fill="#2a6a7a"/><ellipse cx="-6" cy="-4" rx="24" ry="9" fill="#5ab0c0"/><ellipse cx="-12" cy="-6" rx="9" ry="3" fill="#bfeaf0" opacity=".7"/>
    <g class="steam" fill="none" stroke="#e8f0f0" stroke-width="3" stroke-linecap="round" opacity=".5"><path d="M-14,-12 q-6,-10 0,-20 q6,-10 0,-20"/><path d="M6,-10 q-6,-10 0,-20 q6,-10 0,-22"/><path d="M22,-12 q-5,-8 0,-16"/></g>`,
  magara: () => `${shadowE(46, 16)}<path d="M-46,8 C-46,-40 -20,-62 8,-60 C36,-58 48,-30 46,8 Z" fill="#5a5466" stroke="#1a1612" stroke-width="1.4"/><path d="M-20,-50 C-4,-60 20,-58 32,-44" stroke="#fff" stroke-opacity=".15" stroke-width="4" fill="none"/>
    <path d="M-18,8 L-18,-16 Q0,-38 18,-16 L18,8 Z" fill="#100c16"/>${glowC(0, -8, 22, '#b39cf0', 0.45)}
    <g stroke="#c9b0ff" stroke-width="2" fill="none" class="flick"><path d="M-34,-24 l6,-8 l6,8"/><path d="M26,-30 l0,-10 m-5,5 h10"/><circle cx="-30" cy="-6" r="3"/></g>`,
  kiler: () => `${shadowE(44, 16)}${isoBox(0, 4, 34, 30, '#8a6a44', '#6a4e30', '#4e3820')}${isoRoof(0, 4, 34, 30, 26, '#7a3a24', '#5a2a1a')}
    <rect x="6" y="-20" width="12" height="20" fill="#2a1a10" transform="skewY(-26)"/><g transform="translate(-34,8)"><ellipse cx="0" cy="0" rx="9" ry="4" fill="#5a3e24"/><rect x="-9" y="-16" width="18" height="16" fill="#7a5634" stroke="#2a1a10"/><ellipse cx="0" cy="-16" rx="9" ry="4" fill="#8a6644" stroke="#2a1a10"/><path d="M-9,-8 h18" stroke="#2a1a10"/></g>`,
  yuva: () => `${shadowE(44, 16)}<ellipse cx="0" cy="0" rx="40" ry="18" fill="#6a4a2a" stroke="#2a1a10" stroke-width="1.2"/>
    ${[...Array(14)].map((_, i) => { const a = i / 14 * 6.283; return `<path d="M${n1(Math.cos(a) * 30)},${n1(Math.sin(a) * 12)} l${n1(Math.cos(a + 1) * 14)},${n1(Math.sin(a + 1) * 6)}" stroke="#a8844a" stroke-width="2.5"/>`; }).join('')}
    <ellipse cx="0" cy="-3" rx="26" ry="10" fill="#3a2414"/>
    ${[[-34, -4], [30, -8], [-20, 12], [22, 12], [36, 4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#ffb4c8" stroke="#2a1a10" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="1.8" fill="#ffd27a"/>`).join('')}
    <path d="M0,-18 C-8,-30 -22,-24 -14,-14 L0,-2 L14,-14 C22,-24 8,-30 0,-18 Z" fill="#e86c8f" stroke="#2a1a10" class="beat"/>`,
  sifa: () => `${shadowE(44, 16)}${isoBox(0, 4, 32, 24, '#e8e0cc', '#cfc6b0', '#aaa290')}${isoRoof(0, 4, 32, 24, 34, '#6a8a5a', '#4a6a3a')}
    <path d="M-16,-8 L-16,-26 L-8,-22 L-8,-4 Z" fill="#2a2018"/><g transform="translate(14,-14)"><rect x="-3" y="-8" width="6" height="16" fill="#7fbf6a"/><rect x="-8" y="-3" width="16" height="6" fill="#7fbf6a"/></g>`,
  lab: () => `${shadowE(40, 15)}${isoBox(0, 4, 24, 66, '#6a6478', '#4e485c', '#3a3448')}<path d="M-28,-60 L0,-108 L28,-60 L0,-48 Z" fill="#3a2a5a" stroke="#140e0a" stroke-width="1.2"/><path d="M0,-108 L28,-60 L0,-48 Z" fill="#2a1e44"/>
    ${glowC(-12, -38, 16, '#c46cff', 0.6)}<path d="M-16,-30 L-16,-44 Q-12,-50 -8,-44 L-8,-26 Z" fill="#e0b8ff"/><path d="M8,-20 L8,-32 Q12,-36 16,-32 L16,-16 Z" fill="#b39cf0" opacity=".8"/>
    <circle cx="0" cy="-112" r="3" fill="#c46cff" class="flick"/>`,
  fener: () => `${glowC(0, -50, 40, '#ffcf6a', 0.4)}<ellipse cx="0" cy="2" rx="12" ry="5" fill="#000" opacity=".3"/><rect x="-2" y="-44" width="4" height="46" fill="#3a2e24" stroke="#140e0a"/><path d="M-10,-58 h20 l-3,14 h-14 Z" fill="#3a2e24" stroke="#140e0a"/><rect x="-6" y="-56" width="12" height="10" fill="#ffd27a"/><path d="M-12,-58 L0,-66 L12,-58 Z" fill="#2a2018"/>`,
  heykel: () => `${shadowE(34, 12)}${isoBox(0, 4, 22, 16, '#8a847a', '#6a645a', '#504a42')}
    <g transform="translate(0,-14)"><path d="M-14,0 C-16,-16 -6,-28 6,-32 L14,-46 L12,-30 C18,-24 18,-10 12,0 Z" fill="#a09a90" stroke="#2a2620"/><path d="M-4,-20 L-28,-38 L-14,-14 Z" fill="#8a847a" stroke="#2a2620"/><path d="M14,-46 l8,-6 l-4,8 Z" fill="#a09a90"/></g>`,
  lav: () => `<ellipse cx="0" cy="2" rx="40" ry="17" fill="#2a1a14" stroke="#140a06" stroke-width="1.2"/>${glowC(0, -2, 34, '#ff6a2a', 0.5)}<ellipse cx="0" cy="0" rx="30" ry="12" fill="#e2553a"/><ellipse cx="-6" cy="-2" rx="16" ry="5" fill="#ffb347" class="flick"/><circle cx="12" cy="-2" r="3" fill="#fff1c4" class="bubble"/>${rock(-36, 8, 8, '#3a2a24')}${rock(34, 6, 10, '#3a2a24')}`,
  buzc: () => `${shadowE(34, 12)}${glowC(0, -24, 30, '#9fe4ff', 0.35)}${[[-14, 0, 30], [6, 2, 44], [20, 6, 24], [-4, 8, 18]].map(([x, y, h]) => `<path d="M${x - 7},${y} L${x - 4},${y - h} L${x},${y - h - 8} L${x + 4},${y - h} L${x + 7},${y} Z" fill="#a8e0f4" stroke="#2a5a7a" stroke-width="1"/><path d="M${x},${y - h - 8} L${x},${y}" stroke="#fff" stroke-opacity=".6"/>`).join('')}`,
  direk: () => `<ellipse cx="0" cy="2" rx="14" ry="6" fill="#000" opacity=".3"/><rect x="-3" y="-64" width="6" height="66" fill="#5a5466" stroke="#140e0a"/><circle cx="0" cy="-68" r="6" fill="#b39cf0" stroke="#140e0a"/>${glowC(0, -68, 22, '#f4ee86', 0.4)}<path class="bolt" d="M4,-74 L-6,-86 L4,-86 L-4,-100" stroke="#fffbb0" stroke-width="2.5" fill="none"/>`,
  yosun: () => `${shadowE(34, 12)}${rock(0, 4, 30, '#6e6a62')}<path d="M-26,-6 Q-10,-30 14,-28 Q26,-24 28,-12" stroke="#7aa04a" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="-14" cy="-20" r="3" fill="#a7c070"/><circle cx="16" cy="-24" r="2.5" fill="#a7c070"/>`,
  golgetas: () => `${shadowE(26, 10)}${glowC(0, -40, 30, '#c46cff', 0.35)}<path d="M-12,4 L-9,-62 L0,-74 L9,-62 L12,4 Z" fill="#2a2238" stroke="#05040a" stroke-width="1.2"/><path d="M0,-74 L9,-62 L12,4 L0,4 Z" fill="#1a1426"/><path d="M-4,-48 l4,-6 l4,6 M-4,-30 h8 M0,-36 v12" stroke="#c46cff" stroke-width="1.6" fill="none" class="flick"/>`,
  mezar: () => `${shadowE(26, 10)}<path d="M-14,4 L-14,-26 Q0,-42 14,-26 L14,4 Z" fill="#8a857c" stroke="#2a2620" stroke-width="1.2"/><path d="M0,-30 L0,-10 M-7,-22 H7" stroke="#5b574f" stroke-width="2.5"/>${[[-18, 6], [16, 8], [-8, 10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#e8d0f0"/>`).join('')}`,
};
const SMALL_B = ['fener', 'yosun', 'mezar', 'buzc', 'direk', 'golgetas'];
// Midjourney binaları: kendi zemin karosuyla gelir; alt kenarı karonun alt köşesine oturur
function buildingSprite(k) {
  const a = asset('b-' + k);
  if (a) { const sm = SMALL_B.includes(k), w = sm ? 62 : 104, h = sm ? 90 : 128; return `<image href="${a}" x="${-w / 2}" y="${29 - h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet"/>`; }
  return BSPR[k] ? BSPR[k]() : '';
}
function buildingIcon(k, cls = '') { return `<svg viewBox="${asset('b-' + k) ? '-64 -126 128 160' : '-60 -92 120 120'}" class="bic ${cls}" aria-hidden="true">${SVG_DEFS_SMALL}${buildingSprite(k)}</svg>`; }
const SVG_DEFS_SMALL = `<defs><filter id="blur8" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="6"/></filter><linearGradient id="npcfadeg" x1="0" y1="0" x2="0" y2="1"><stop offset=".75" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="npcfade" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#npcfadeg)"/></mask></defs>`;

/* ---------- Pazar tezgâhları ---------- */
/* satıcısız tezgâhın arka duvarı: sıcak ışık, raf ve asılı mallar */
function stallBack(kind) {
  const id = 'sg-' + kind;
  const glow = { ejder: '#ff9a4a', yumurta: '#ffd08a', yem: '#ffb84a', demir: '#ff7a2a' }[kind];
  const shelf = `<rect x="38" y="150" width="244" height="7" fill="#5a3e26" stroke="#1a100a"/>`;
  const rope = (x, y2) => `<line x1="${x}" y1="98" x2="${x}" y2="${y2}" stroke="#3a2a1a" stroke-width="1.5"/>`;
  const hang = {
    ejder: [70, 250].map(x => `${rope(x, 114)}<path d="M${x - 8},114 h16 l-3,18 h-10 Z" fill="#c9a85a" stroke="#2a1a10"/><ellipse cx="${x}" cy="124" rx="4" ry="6" fill="#ffd07a" class="flick"/>`).join('') +
      `<path d="M120,104 q40,26 80,0" fill="none" stroke="#8a6a3a" stroke-width="3"/><path d="M140,112 l-6,18 M160,116 l0,20 M180,112 l6,18" stroke="#6a4a2a" stroke-width="2"/>` +
      [110, 160, 210].map(x => `<rect x="${x - 14}" y="134" width="28" height="16" rx="3" fill="#6a3a22" stroke="#1a100a"/>`).join(''),
    yumurta: [80, 160, 240].map((x, i) => `${rope(x, 110 + i % 2 * 6)}<path d="M${x - 18},${110 + i % 2 * 6} q18,26 36,0 Z" fill="#a8844a" stroke="#3a2410"/><path d="M${x - 14},${114 + i % 2 * 6} h28 M${x - 10},${120 + i % 2 * 6} h20" stroke="#6a4a24"/>`).join('') +
      [70, 110, 210, 250].map((x, i) => `<ellipse cx="${x}" cy="141" rx="8" ry="10" fill="${['#e8d0a0', '#5ea8d0', '#c84a2c', '#7360c4'][i]}" stroke="#2a1a10"/>`).join(''),
    yem: [60, 92, 228, 260].map((x, i) => `${rope(x, 104)}${[...Array(5)].map((_, j) => `<ellipse cx="${x + (j % 2 ? 2 : -2)}" cy="${108 + j * 7}" rx="3.5" ry="5" fill="${i % 2 ? '#e8e0c8' : '#c4302a'}" stroke="#2a1008" stroke-width=".8"/>`).join('')}`).join('') +
      [130, 160, 190].map((x, i) => `<path d="M${x - 12},150 l3,-16 h18 l3,16 Z" fill="${['#c48a3a', '#8a5a2a', '#a8442a'][i]}" stroke="#1a100a"/><ellipse cx="${x}" cy="134" rx="9" ry="3" fill="${['#e0a040', '#6a8a3a', '#d04020'][i]}"/>`).join(''),
    demir: `<rect x="44" y="102" width="232" height="44" fill="#2a2228" stroke="#120e10"/>` +
      [70, 98, 126].map(x => `<path d="M${x},106 l4,4 v30 l-4,6 l-4,-6 v-30 Z" fill="#b8bec8" stroke="#2a2a30"/><rect x="${x - 7}" y="108" width="14" height="3" fill="#8a6a2a"/>`).join('') +
      `<path d="M168,108 h36 v16 q0,16 -18,22 q-18,-6 -18,-22 Z" fill="#6a6470" stroke="#1a181c" stroke-width="1.5"/><circle cx="186" cy="124" r="5" fill="#c9a85a"/>` +
      `<path d="M226,114 q14,-10 30,0 v14 h-30 Z" fill="#7a7480" stroke="#1a181c"/><rect x="226" y="128" width="30" height="5" fill="#4a4450"/>`,
  }[kind];
  return `<defs><radialGradient id="${id}" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset=".6" stop-color="${glow}" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <rect x="30" y="96" width="260" height="150" fill="url(#${id})" class="sback"/>${hang}${shelf}`;
}
function stallSVG(kind, open = true, showV = true) {
  const C = { ejder: ['#a8322a', '#e8d0a0'], yumurta: ['#3a6a8a', '#e8d0a0'], yem: ['#4a7a3a', '#f0d890'], demir: ['#3a3440', '#c9a85a'] }[kind];
  let stripes = ''; for (let i = 0; i < 8; i++) stripes += `<path d="M${10 + i * 37.5},60 L${47.5 + i * 37.5},60 L${47.5 + i * 37.5 - 4},96 Q${28 + i * 37.5},106 ${14 + i * 37.5 - 4},96 Z" fill="${i % 2 ? C[1] : C[0]}" stroke="#1a100a" stroke-width="1.2"/>`;
  const goods = {
    ejder: `<g stroke="#3a2a1a" stroke-width="3">${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${60 + i * 40}" y1="150" x2="${60 + i * 40}" y2="244"/>`).join('')}<line x1="50" y1="160" x2="270" y2="160"/><line x1="50" y1="240" x2="270" y2="240"/></g>`,
    yumurta: `<ellipse cx="160" cy="226" rx="90" ry="22" fill="#8a6a3a" stroke="#2a1a10" stroke-width="1.5"/>${[[110, '#c84a2c'], [140, '#5ea8d0'], [172, '#7360c4'], [204, '#68883a'], [126, '#e8d0a0'], [188, '#c84a2c']].map(([x, c], i) => `<ellipse cx="${x}" cy="${i > 3 ? 196 : 210}" rx="13" ry="17" fill="${c}" stroke="#1a100a" stroke-width="1.2"/>`).join('')}`,
    yem: `${[[70, '#c4452a'], [130, '#5ea8d0'], [190, '#a796ea'], [250, '#8a6a3a']].map(([x, c]) => `<rect x="${x - 26}" y="196" width="52" height="40" fill="#7a5634" stroke="#2a1a10" stroke-width="1.5"/><path d="M${x - 26},206 h52" stroke="#2a1a10"/>${[...Array(5)].map((_, j) => `<circle cx="${x - 18 + j * 9}" cy="${192 - (j % 2) * 5}" r="6" fill="${c}" stroke="#1a100a"/>`).join('')}`).join('')}<path d="M260,170 q20,-10 30,6 l-8,6 q-10,-8 -22,-2 Z" fill="#8ab0c0" stroke="#1a100a"/>`,
    demir: `<rect x="196" y="190" width="70" height="20" rx="4" fill="#4a4450" stroke="#0a080c" stroke-width="1.5"/><path d="M206,210 h50 l-8,26 h-34 Z" fill="#3a3440" stroke="#0a080c" stroke-width="1.5"/><path d="M180,196 h16 v8 h-16 q-10,-4 0,-8" fill="#4a4450"/>
      <ellipse cx="90" cy="226" rx="44" ry="14" fill="#2a1408"/><circle cx="90" cy="216" r="40" fill="#ff7a2a" fill-opacity=".35" class="flick" filter="url(#blur8)"/>${flameP(78, 228, 1.4)}${flameP(100, 230, 1.1)}
      <g stroke="#5a5260" stroke-width="3"><line x1="60" y1="150" x2="60" y2="186"/><line x1="90" y1="146" x2="90" y2="186"/><line x1="120" y1="150" x2="120" y2="186"/></g><path d="M52,186 l8,8 l8,-8 M82,186 l8,10 l8,-10 M112,186 l8,8 l8,-8" fill="#9aa0aa" stroke="#1a1a20"/>`,
  }[kind];
  const vendor = {
    ejder: npcBust('tuccar', 160, 196, 0.9),
    yumurta: npcBust('yumurtaci', 160, 196, 0.9),
    yem: npcBust('baharatci', 160, 196, 0.9),
    demir: npcBust('kerim', 236, 196, 0.9),
  }[kind];
  const shut = !open ? `<g><rect x="30" y="104" width="260" height="140" fill="#3a2a1e" stroke="#1a100a" stroke-width="2"/>${[...Array(8)].map((_, i) => `<line x1="30" y1="${120 + i * 16}" x2="290" y2="${120 + i * 16}" stroke="#1a100a" stroke-width="2"/>`).join('')}<rect x="120" y="160" width="80" height="28" fill="#e8d0a0" stroke="#1a100a" transform="rotate(-6 160 174)"/><text x="160" y="180" text-anchor="middle" font-family="Grenze Gotisch, serif" font-size="18" fill="#3a1a0a" transform="rotate(-6 160 174)">Kapalı</text></g>` : '';
  return `<svg viewBox="0 0 320 300" class="stall-svg" aria-hidden="true">${SVG_DEFS_SMALL}
    <ellipse cx="160" cy="286" rx="150" ry="14" fill="#000" opacity=".4"/>
    <rect x="22" y="70" width="10" height="210" fill="#4a3424" stroke="#1a100a"/><rect x="288" y="70" width="10" height="210" fill="#4a3424" stroke="#1a100a"/>
    <rect x="30" y="96" width="260" height="150" fill="#1a1210"/>
    ${open && !showV ? stallBack(kind) : ''}
    ${open && showV ? vendor : ''}
    ${goods}
    <rect x="16" y="244" width="288" height="16" fill="#8a6440" stroke="#1a100a" stroke-width="1.5"/><rect x="24" y="260" width="272" height="26" fill="#6a4a2e" stroke="#1a100a" stroke-width="1.5"/>
    ${shut}
    <path d="M6,60 L314,60 L300,40 L20,40 Z" fill="${C[0]}" stroke="#1a100a" stroke-width="1.5"/>${stripes}
    <line x1="40" y1="96" x2="40" y2="122" stroke="#2a1a10" stroke-width="2"/><ellipse cx="40" cy="132" rx="9" ry="12" fill="#ffb347" class="flick"/><circle cx="40" cy="132" r="26" fill="#ffb347" fill-opacity=".25" class="flick" filter="url(#blur8)"/>
  </svg>`;
}

/* ---------- NPC büstleri (silüet + birkaç ayrıntı) ---------- */
const NPCS = {
  dede: { ad: 'Dedenin mektubu', hat: 'none', skin: '#c49a7a', cloth: '#5a4a3a', beard: '#e8e0d0' },
  selin: { ad: 'Haritacı Selin', hat: 'hood', skin: '#c48a6a', cloth: '#4a5a4a', hood: '#3a4a3a' },
  demirhan: { ad: 'Demirhan', hat: 'helm', skin: '#b08068', cloth: '#1a1a22', helm: '#2a2a34', beard: '#1a1210', eyes: '#e0574d' },
  kerim: { ad: 'Usta Kerim', hat: 'band', skin: '#a8705a', cloth: '#5a3a24', beard: '#3a2a1a', apron: '#3a2a1e' },
  tuccar: { ad: 'Ejderha tüccarı Rüstem', hat: 'turban', skin: '#b88a6a', cloth: '#7a2a2a', turban: '#e8d0a0' },
  yumurtaci: { ad: 'Yumurtacı Hatice', hat: 'scarf', skin: '#c89a7a', cloth: '#3a5a7a', scarf: '#c84a6a' },
  baharatci: { ad: 'Baharatçı Nuri', hat: 'fez', skin: '#b8866a', cloth: '#5a6a3a', fez: '#a8322a', beard: '#5a4a3a' },
  kantuccari: { ad: 'Kan tüccarı', hat: 'hood', skin: '#000', cloth: '#1a1220', hood: '#140e1a', eyes: '#c46cff' },
  cukur: { ad: 'Yara izli adam', hat: 'none', skin: '#9a6a5a', cloth: '#2a1a1a', scar: 1, beard: '#2a1a14' },
  muhtar: { ad: 'Muhtar', hat: 'fez', skin: '#c49a7a', cloth: '#3a3a5a', fez: '#5a2a2a', beard: '#c8c0b0' },
  ozan: { ad: 'Gezgin ozan', hat: 'cap', skin: '#c49a7a', cloth: '#6a3a6a', cap: '#3a2a4a' },
  bilge: { ad: 'Bilge ejderha', dragon: 1 },
  anlatici: { ad: 'Ocak', hat: 'none', skin: '#c49a7a', cloth: '#3a3a3a' },
};
function npcBust(k, x = 0, y = 0, s = 1) {
  const a = asset('npc-' + k); if (a) return `<image href="${a}" x="${x - 60 * s}" y="${y - 140 * s}" width="${120 * s}" height="${140 * s}" preserveAspectRatio="xMidYMax meet" mask="url(#npcfade)"/>`;
  const N = NPCS[k] || NPCS.anlatici;
  const head = `<ellipse cx="0" cy="-70" rx="22" ry="26" fill="${N.skin}" stroke="#0a0606" stroke-width="2"/>`;
  const eyes = N.eyes ? `<circle cx="-8" cy="-72" r="3" fill="${N.eyes}"/><circle cx="8" cy="-72" r="3" fill="${N.eyes}"/>` : `<path d="M-11,-73 h6 M5,-73 h6" stroke="#1a0a06" stroke-width="2.5" stroke-linecap="round"/>`;
  const beard = N.beard ? `<path d="M-20,-62 Q-18,-34 0,-30 Q18,-34 20,-62 Q10,-52 0,-54 Q-10,-52 -20,-62 Z" fill="${N.beard}" stroke="#0a0606" stroke-width="1.5"/>` : `<path d="M-6,-56 q6,3 12,0" stroke="#3a1a10" stroke-width="2" fill="none"/>`;
  const scar = N.scar ? `<path d="M6,-88 L14,-60" stroke="#6a2a2a" stroke-width="2.5"/>` : '';
  const hats = {
    hood: `<path d="M-34,-40 C-40,-90 -20,-108 0,-108 C20,-108 40,-90 34,-40 L22,-48 C24,-80 14,-94 0,-94 C-14,-94 -24,-80 -22,-48 Z" fill="${N.hood}" stroke="#0a0606" stroke-width="2"/>`,
    helm: `<path d="M-26,-74 C-26,-104 26,-104 26,-74 L26,-62 L14,-66 L14,-80 L-14,-80 L-14,-66 L-26,-62 Z" fill="${N.helm}" stroke="#0a0606" stroke-width="2"/><path d="M-24,-92 C-40,-100 -48,-118 -40,-130 C-36,-112 -28,-104 -18,-98 Z M24,-92 C40,-100 48,-118 40,-130 C36,-112 28,-104 18,-98 Z" fill="#d8ccb0" stroke="#0a0606" stroke-width="1.5"/>`,
    band: `<path d="M-23,-84 Q0,-94 23,-84 L22,-78 Q0,-86 -22,-78 Z" fill="#a8322a" stroke="#0a0606" stroke-width="1.5"/>`,
    turban: `<path d="M-28,-80 C-30,-110 30,-110 28,-80 Q0,-90 -28,-80 Z" fill="${N.turban}" stroke="#0a0606" stroke-width="2"/><path d="M-24,-92 Q0,-100 24,-92 M-20,-102 Q0,-108 20,-100" stroke="#a89060" stroke-width="2" fill="none"/><circle cx="0" cy="-92" r="4" fill="#c4452a"/>`,
    scarf: `<path d="M-28,-66 C-32,-104 32,-104 28,-66 L22,-70 C22,-90 -22,-90 -22,-70 Z" fill="${N.scarf}" stroke="#0a0606" stroke-width="2"/>`,
    fez: `<path d="M-15,-90 L-12,-112 L12,-112 L15,-90 Z" fill="${N.fez}" stroke="#0a0606" stroke-width="1.8"/><path d="M0,-112 q8,6 6,18" stroke="#1a1a1a" stroke-width="2" fill="none"/>`,
    cap: `<path d="M-24,-84 Q0,-112 24,-84 Q0,-92 -24,-84 Z" fill="${N.cap}" stroke="#0a0606" stroke-width="2"/><path d="M14,-98 q20,-14 30,4" stroke="#e8d0a0" stroke-width="2" fill="none"/>`,
    none: '',
  };
  if (N.dragon) return `<g transform="translate(${x},${y}) scale(${s})"><g transform="translate(-110,-150)">${dragonSVG({ id: 77, el: 'toprak', st: { gu: 90, ce: 60, da: 120, ze: 160 }, stage: 'yetiskin', horn: 'k', pat: 'd', eye: 'N' }, { still: true }).replace('<svg ', '<svg width="220" height="160" ')}</g></g>`;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M-48,0 C-48,-30 -30,-46 0,-46 C30,-46 48,-30 48,0 Z" fill="${N.cloth}" stroke="#0a0606" stroke-width="2"/>
    ${N.apron ? `<path d="M-20,-40 L20,-40 L24,0 L-24,0 Z" fill="${N.apron}" stroke="#0a0606" stroke-width="1.5"/>` : ''}
    <rect x="-8" y="-50" width="16" height="10" fill="${N.skin}"/>
    ${hats[N.hat] && N.hat === 'hood' ? hats.hood : ''}${head}${eyes}${beard}${scar}${N.hat !== 'hood' ? hats[N.hat] || '' : ''}
  </g>`;
}
function npcSVG(k, cls = '') { const a = asset('npc-' + k); if (a) return `<img src="${a}" class="npc ${cls}" alt="">`; return `<svg viewBox="-60 -140 120 140" class="npc ${cls}" aria-hidden="true">${npcBust(k)}</svg>`; }

/* ---------- Eşya ve yemek simgeleri ---------- */
const TIER_C = { 1: ['#9a9aa2', '#5a5a62'], 2: ['#8ab8d8', '#3a6a8a'], 3: ['#f0c86a', '#9a6a2a'] };
function itemIcon(id) {
  const it = ITEMS[id];
  const img = asset('item-' + id) || (it && it.heirloom ? asset('item-yadigar') || asset('item-til4') : null);
  if (img) return `<img src="${img}" class="iic" alt="">`;
  const [a, b] = TIER_C[it.tier];
  const body = {
    pence: `<path d="M12,40 C14,26 22,14 34,10 C30,20 28,30 30,40 Z M24,40 C26,28 32,20 42,18 C38,26 36,34 38,40 Z" fill="${a}" stroke="#141418" stroke-width="1.6"/><rect x="8" y="38" width="34" height="8" rx="3" fill="#5a3a24" stroke="#141418"/>`,
    govde: `<path d="M10,12 L24,8 L38,12 L40,36 Q24,46 8,36 Z" fill="${a}" stroke="#141418" stroke-width="1.6"/><path d="M14,20 Q24,24 34,20 M14,28 Q24,32 34,28" stroke="${b}" stroke-width="2" fill="none"/>`,
    bas: `<path d="M8,32 C8,14 40,14 40,32 L40,36 L8,36 Z" fill="${a}" stroke="#141418" stroke-width="1.6"/><path d="M24,14 L24,36" stroke="${b}" stroke-width="2"/><path d="M10,20 L2,6 L14,16 Z M38,20 L46,6 L34,16 Z" fill="#e8dcc0" stroke="#141418"/>`,
    tilsim: `<path d="M16,6 Q24,16 32,6" stroke="#8a6a3a" stroke-width="2" fill="none"/><circle cx="24" cy="28" r="12" fill="${it.anka ? '#ff7a3a' : it.dodge ? '#9fe4ff' : it.nefes ? '#ff9a4a' : '#cfa557'}" stroke="#141418" stroke-width="1.6"/><circle cx="24" cy="28" r="6" fill="#fff" opacity=".35"/>${it.anka ? '<path d="M24,18 q6,6 0,14 q-6,-8 0,-14" fill="#fff1c4"/>' : ''}`,
  }[it.slot];
  return `<svg viewBox="0 0 48 48" class="iic t${it.tier}" aria-hidden="true">${body}</svg>`;
}
function foodIcon(f) {
  const a = asset('food-' + f); if (a) return `<img src="${a}" class="fic" alt="">`;
  const b = {
    balik: `<path d="M6,24 C14,12 32,12 38,24 C32,36 14,36 6,24 Z" fill="#8ab0c0" stroke="#141418" stroke-width="1.6"/><path d="M38,24 L46,16 L46,32 Z" fill="#6a90a0" stroke="#141418" stroke-width="1.4"/><circle cx="14" cy="22" r="2" fill="#141418"/>`,
    biber: `<path d="M20,10 C34,12 38,28 30,42 C24,34 16,24 20,10 Z" fill="#d9372a" stroke="#141418" stroke-width="1.6"/><path d="M20,10 q-2,-6 6,-6" stroke="#4a7a3a" stroke-width="3" fill="none"/>`,
    kar: `${[[18, 22], [30, 22], [24, 32], [24, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#a8e0f4" stroke="#141418" stroke-width="1.4"/>`).join('')}<circle cx="16" cy="20" r="2" fill="#fff"/>`,
    mantar: `<path d="M8,24 C8,10 40,10 40,24 Z" fill="#a796ea" stroke="#141418" stroke-width="1.6"/><rect x="19" y="24" width="10" height="16" rx="3" fill="#e8dcc0" stroke="#141418"/><path d="M26,14 l-4,6 h4 l-4,6" stroke="#f4ee86" stroke-width="2" fill="none"/>`,
    yumru: `<path d="M8,28 C8,16 24,10 34,16 C44,22 40,38 26,38 C16,38 8,36 8,28 Z" fill="#a8844a" stroke="#141418" stroke-width="1.6"/><path d="M34,16 q4,-8 10,-8" stroke="#6a8a3a" stroke-width="2.5" fill="none"/>`,
    zambak: `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="24" cy="14" rx="5" ry="10" fill="#7a4aa0" stroke="#141418" stroke-width="1.2" transform="rotate(${a} 24 24)"/>`).join('')}<circle cx="24" cy="24" r="4" fill="#ffd27a"/>`,
    ziyafet: `<ellipse cx="24" cy="34" rx="20" ry="7" fill="#d8ccb0" stroke="#141418" stroke-width="1.4"/><path d="M10,30 C10,16 38,16 38,30 Z" fill="#a85a2a" stroke="#141418" stroke-width="1.6"/><path d="M36,22 l8,-8" stroke="#e8dcc0" stroke-width="4" stroke-linecap="round"/>`,
  }[f];
  return `<svg viewBox="0 0 48 48" class="fic" aria-hidden="true">${b}</svg>`;
}

/* ---------- Mekân madalyonları ---------- */
const PLACE_IC = {
  ocak: `<path d="M8,40 L8,22 Q24,4 40,22 L40,40 Z" fill="#6a5a4c" stroke="#140e0a" stroke-width="2"/><path d="M16,40 L16,28 Q24,18 32,28 L32,40 Z" fill="#2a1408"/><path class="flame" d="M24,24 C30,30 29,38 24,40 C19,38 18,30 24,24 Z" fill="#ffb347"/>`,
  ahir: `<path d="M10,32 C10,18 20,10 32,12 L42,8 L38,16 C42,22 40,30 34,34 L30,40 L22,36 Z" fill="#c84a2c" stroke="#2a0a05" stroke-width="2"/><circle cx="30" cy="20" r="2.4" fill="#ffd25e"/><path d="M18,14 L10,4 L22,12 Z" fill="#f0dcb8" stroke="#2a0a05" stroke-width="1.2"/>`,
  yuva: `<ellipse cx="24" cy="34" rx="18" ry="8" fill="#7a5a34" stroke="#140e0a" stroke-width="2"/><path d="M24,26 C16,16 6,22 13,30 L24,38 L35,30 C42,22 32,16 24,26 Z" fill="#e86c8f" stroke="#2a0a14" stroke-width="2"/>`,
  arena: `<path d="M6,36 L6,20 Q24,6 42,20 L42,36 Z" fill="#a8845a" stroke="#140e0a" stroke-width="2"/>${[12, 20, 28, 36].map(x => `<path d="M${x - 3},36 L${x - 3},26 Q${x},22 ${x + 3},26 L${x + 3},36 Z" fill="#3a2a1e"/>`).join('')}<path d="M24,6 L24,14 M24,6 L32,9 L24,12" stroke="#c4452a" stroke-width="2" fill="#c4452a"/>`,
  sefer: `<path d="M6,12 L18,8 L30,12 L42,8 L42,38 L30,42 L18,38 L6,42 Z" fill="#e8d0a0" stroke="#140e0a" stroke-width="2"/><path d="M18,8 V38 M30,12 V42" stroke="#a8844a" stroke-width="1.5"/><path d="M12,30 Q22,18 34,24" stroke="#a8322a" stroke-width="2" stroke-dasharray="2 3" fill="none"/><path d="M34,20 l4,4 m0,-4 l-4,4" stroke="#a8322a" stroke-width="2"/>`,
  zindan: `<path d="M8,42 L8,18 Q24,4 40,18 L40,42 Z" fill="#4a382b" stroke="#140e0a" stroke-width="2"/><path d="M14,42 L14,22 Q24,11 34,22 L34,42 Z" fill="#1c110b" stroke="#d9b062" stroke-width="1.5"/><path d="M19,20 L24,15 L29,20" stroke="#d9b062" stroke-width="1.5" fill="none"/><circle cx="20.5" cy="26" r="2.2" fill="#ef7f3e"/><circle cx="27.5" cy="26" r="2.2" fill="#ef7f3e"/><path d="M18,36 L24,30 L30,36" stroke="#c84a2c" stroke-width="2" fill="none"/>`,
  kasaba: `<path d="M6,38 L16,18 L26,38 Z M22,38 L32,12 L42,38 Z" fill="#5a7a52" stroke="#140e0a" stroke-width="2"/><circle cx="24" cy="12" r="4" fill="#ffd25e"/>`,
  meydan: `<circle cx="24" cy="24" r="16" fill="#7a5a3a" stroke="#140e0a" stroke-width="2"/><circle cx="24" cy="24" r="7" fill="#5ea8d0" stroke="#140e0a" stroke-width="1.5"/>`,
  pazar: `<path d="M4,16 L44,16 L40,8 L8,8 Z" fill="#a8322a" stroke="#140e0a" stroke-width="2"/>${[0, 1, 2, 3].map(i => `<path d="M${4 + i * 10},16 L${14 + i * 10},16 L${13 + i * 10},22 Q${9 + i * 10},25 ${5 + i * 10},22 Z" fill="${i % 2 ? '#e8d0a0' : '#a8322a'}" stroke="#140e0a" stroke-width="1.2"/>`).join('')}<rect x="8" y="22" width="32" height="18" fill="#6a4a2e" stroke="#140e0a" stroke-width="2"/><circle cx="18" cy="30" r="4" fill="#d9372a"/><circle cx="28" cy="31" r="4" fill="#5ea8d0"/>`,
};
function placeIcon(k) { const a = asset('ic-' + k); if (a) return `<img src="${a}" class="pic picimg" alt="">`; return `<svg viewBox="0 0 48 48" class="pic" aria-hidden="true">${PLACE_IC[k]}</svg>`; }

/* küçük arayüz simgeleri */
const UI_IC = {
  gold: '<circle cx="8" cy="8" r="6.5" fill="#e0b24a" stroke="#6a4a14" stroke-width="1"/><circle cx="8" cy="8" r="3.6" fill="none" stroke="#8a6a2a" stroke-width="1.2"/>',
  un: '<path d="M8,1.5 L10,6 L15,6.5 L11.2,9.8 L12.4,14.6 L8,12 L3.6,14.6 L4.8,9.8 L1,6.5 L6,6 Z" fill="#ff9a4a" stroke="#5a2a0a" stroke-width=".8"/>',
  heart: '<path d="M8,14 C2,9 1,5.5 3.5,3.5 C5.5,2 7.5,3 8,5 C8.5,3 10.5,2 12.5,3.5 C15,5.5 14,9 8,14 Z" fill="#e86c8f"/>',
  M: '<circle cx="6.5" cy="9.5" r="4.2" fill="none" stroke="#7cc6e6" stroke-width="1.8"/><path d="M9.5,6.5 L14,2 M10.5,2 H14 V5.5" stroke="#7cc6e6" stroke-width="1.8" fill="none"/>',
  F: '<circle cx="8" cy="6" r="4.2" fill="none" stroke="#e86c8f" stroke-width="1.8"/><path d="M8,10.2 V15 M5.5,12.8 H10.5" stroke="#e86c8f" stroke-width="1.8"/>',
  skull: '<path d="M8,2 C4,2 2,5 2,8 C2,10 3,11 4,11.5 L4,14 L12,14 L12,11.5 C13,11 14,10 14,8 C14,5 12,2 8,2 Z" fill="#d9d0bd"/><circle cx="5.7" cy="8" r="1.6" fill="#1a1512"/><circle cx="10.3" cy="8" r="1.6" fill="#1a1512"/>',
  flame: '<path d="M8,1 C12,5 13,9 11,12 C10,14 6,14 5,12 C3,9 5,6 8,1 Z" fill="#ff8a3a"/><path d="M8,7 C10,9 10,11 8,13 C6,11 6,9 8,7 Z" fill="#ffd27a"/>',
  moon: '<path d="M11,2 A6.5,6.5 0 1 0 14,11 A5,5 0 1 1 11,2 Z" fill="#f3dfb0"/>',
  sound: '<path d="M2,6 H5 L9,2 V14 L5,10 H2 Z" fill="currentColor"/><path d="M11,5 Q13,8 11,11 M12.5,3 Q16,8 12.5,13" stroke="currentColor" stroke-width="1.4" fill="none"/>',
  mute: '<path d="M2,6 H5 L9,2 V14 L5,10 H2 Z" fill="currentColor"/><path d="M11,5 L15,11 M15,5 L11,11" stroke="currentColor" stroke-width="1.6"/>',
  book: '<path d="M2,3 Q5,2 8,4 Q11,2 14,3 V13 Q11,12 8,14 Q5,12 2,13 Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8,4 V14" stroke="currentColor" stroke-width="1.2"/>',
  q: '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6,6 Q6,3.5 8.2,3.6 Q10.4,3.8 10.2,6 Q10,7.6 8,8.4 V10" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="8" cy="12.3" r="1" fill="currentColor"/>',
  left: '<path d="M10,2 L4,8 L10,14" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  right: '<path d="M6,2 L12,8 L6,14" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M3,3 L13,13 M13,3 L3,13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sword: '<path d="M13.5,2.5 L6.5,9.5 L4.5,7.5 L3,9 L5.5,11.5 L2.5,14.5 L4,15.5 L7,12.5 L9.5,15 L11,13.5 L9,11.5 L15,4 Z" fill="#e8dcc0" stroke="#1a1008" stroke-width="1"/>',
  shield: '<path d="M8,1.5 L14,4 C14,9.5 11.5,13 8,15 C4.5,13 2,9.5 2,4 Z" fill="#8ab8d8" stroke="#1a1008" stroke-width="1.2"/><path d="M8,3.2 V13.2" stroke="#1a1008" stroke-width="1"/>',
  scroll: '<rect x="3" y="2" width="10" height="12" rx="1.5" fill="#ead9b4" stroke="#3a2010" stroke-width="1.2"/><path d="M5,5.5 H11 M5,8 H11 M5,10.5 H9" stroke="#5a3418" stroke-width="1.2" stroke-linecap="round"/>',
  crown: '<path d="M2,12 L3,5 L6,8 L8,3 L10,8 L13,5 L14,12 Z" fill="#e0b24a" stroke="#3a2008" stroke-width="1.1"/>',
  anvil: '<path d="M2,6 H14 L12,10 H10 L11,14 H5 L6,10 H4 Z" fill="#9a9aa4" stroke="#1a120c" stroke-width="1.2"/>',
  tree: '<circle cx="8" cy="3.5" r="2.2" fill="#d9b062" stroke="#2a1608" stroke-width="1"/><circle cx="4" cy="12" r="2.2" fill="#9ad07a" stroke="#1a2410" stroke-width="1"/><circle cx="12" cy="12" r="2.2" fill="#9ad07a" stroke="#1a2410" stroke-width="1"/><path d="M8,5.7 V8.5 M8,8.5 L4,9.8 M8,8.5 L12,9.8" stroke="currentColor" stroke-width="1.3" fill="none"/>',
  fast: '<path d="M2.5,3.5 L8,8 L2.5,12.5 Z M8.5,3.5 L14,8 L8.5,12.5 Z" fill="currentColor"/>',
  target: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2.2" fill="#ef7f3e"/><path d="M8,1 V3.5 M8,12.5 V15 M1,8 H3.5 M12.5,8 H15" stroke="currentColor" stroke-width="1.3"/>',
  chat: '<path d="M2.5,3.5 H13.5 V10.5 H7 L4,13.5 V10.5 H2.5 Z" fill="#ead9b4" stroke="#2a1608" stroke-width="1.2"/>',
  check: '<path d="M2.5,8.5 L6.2,12.2 L13.5,4.2" fill="none" stroke="#9ad07a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
};
function ui(k, cls = '') {
  const a = asset('ui-' + k) || asset('ui-' + String(k).toLowerCase());
  if (a) return `<img src="${a}" class="ui-ic ui-ic-img ${cls}" alt="" aria-hidden="true">`;
  return `<svg viewBox="0 0 16 16" class="ui-ic ${cls}" aria-hidden="true">${UI_IC[k] || UI_IC.flame}</svg>`;
}

/* dövüş eylem simgeleri */
const ACT_IC = {
  pence: '<path d="M10,40 C12,24 22,12 36,8 C30,20 28,30 30,40 Z M22,42 C24,30 30,22 42,20 C38,28 36,36 38,42 Z" fill="#e8dcc0" stroke="#141418" stroke-width="2"/>',
  nefes: '<path d="M6,24 C14,18 18,18 24,22 C30,14 38,12 44,14 C38,20 40,26 44,32 C36,34 30,30 24,28 C18,32 12,30 6,24 Z" fill="currentColor" stroke="#141418" stroke-width="2"/>',
  savun: '<path d="M24,6 L40,12 C40,28 34,38 24,44 C14,38 8,28 8,12 Z" fill="#8ab8d8" stroke="#141418" stroke-width="2"/><path d="M24,12 V38" stroke="#3a6a8a" stroke-width="2"/>',
  kukre: '<path d="M8,24 Q14,12 22,24 Q14,36 8,24 Z" fill="#e2763a" stroke="#141418" stroke-width="2"/><path d="M28,14 Q34,24 28,34 M34,10 Q42,24 34,38" stroke="#ffb067" stroke-width="3" fill="none" stroke-linecap="round"/>',
  care: '<path d="M10,20 h28 l-3,22 h-22 Z" fill="#8a5a34" stroke="#141418" stroke-width="2" stroke-linejoin="round"/><path d="M12,26 h24 M13,33 h22" stroke="#5a3820" stroke-width="1.6"/><circle cx="16" cy="15" r="5" fill="#cfe8ff" stroke="#141418" stroke-width="1.2"/><circle cx="26" cy="11" r="6.5" fill="#e8f4ff" stroke="#141418" stroke-width="1.2"/><circle cx="35" cy="15" r="4.5" fill="#cfe8ff" stroke="#141418" stroke-width="1.2"/><path d="M30,34 q8,-4 12,2 q2,6 -6,8 q-8,0 -6,-10 Z" fill="#f0c860" stroke="#141418" stroke-width="1.4"/>',
  train: '<circle cx="24" cy="24" r="17" fill="#e8d0a0" stroke="#141418" stroke-width="2"/><circle cx="24" cy="24" r="11" fill="#c8402a" stroke="#141418" stroke-width="1.5"/><circle cx="24" cy="24" r="5" fill="#e8d0a0" stroke="#141418" stroke-width="1.5"/><path d="M24,24 L42,8" stroke="#3a2a1a" stroke-width="3" stroke-linecap="round"/><path d="M40,4 L46,4 L44,10 Z" fill="#ffb067" stroke="#141418" stroke-width="1.2"/>',
  rest: '<path d="M30,8 A16,16 0 1 0 40,34 A13,13 0 1 1 30,8 Z" fill="#f0d890" stroke="#141418" stroke-width="2"/><path d="M33,10 h8 l-8,8 h8" fill="none" stroke="#9ab8e8" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>',
  walk: '<g fill="#d4a070" stroke="#141418" stroke-width="1.5"><ellipse cx="15" cy="32" rx="6" ry="7"/><circle cx="9" cy="22" r="2.6"/><circle cx="15" cy="20" r="2.6"/><circle cx="21" cy="22" r="2.6"/><ellipse cx="33" cy="18" rx="6" ry="7"/><circle cx="27" cy="8" r="2.6"/><circle cx="33" cy="6" r="2.6"/><circle cx="39" cy="8" r="2.6"/></g><path d="M8,42 Q24,38 40,42" stroke="#ff7aa0" stroke-width="2" fill="none" stroke-dasharray="3 3"/>',
  talk: '<path d="M8,10 h30 a4,4 0 0 1 4,4 v16 a4,4 0 0 1 -4,4 h-16 l-9,8 v-8 h-5 a4,4 0 0 1 -4,-4 v-16 a4,4 0 0 1 4,-4 Z" fill="#ead9b4" stroke="#141418" stroke-width="2"/><circle cx="16" cy="22" r="2.6" fill="#6a2210"/><circle cx="24" cy="22" r="2.6" fill="#6a2210"/><circle cx="32" cy="22" r="2.6" fill="#6a2210"/>',
  feed: '<path d="M30,8 C40,6 44,16 38,24 C33,31 24,30 20,26 C16,22 18,12 30,8 Z" fill="#c8602a" stroke="#141418" stroke-width="2"/><path d="M26,14 C30,12 34,14 33,18" stroke="#ffb067" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M20,26 L10,36" stroke="#e8e0c8" stroke-width="5" stroke-linecap="round"/><circle cx="8" cy="36" r="3.4" fill="#e8e0c8" stroke="#141418" stroke-width="1.5"/><circle cx="11" cy="40" r="3.4" fill="#e8e0c8" stroke="#141418" stroke-width="1.5"/>',
  gear: '<path d="M8,30 C8,14 16,6 24,6 C32,6 40,14 40,30 L40,36 L30,36 L30,28 L18,28 L18,36 L8,36 Z" fill="#9aa4b4" stroke="#141418" stroke-width="2"/><path d="M24,6 L24,28" stroke="#5a6070" stroke-width="2"/><path d="M8,22 L2,10 L12,18 M40,22 L46,10 L36,18" fill="#e8d0a0" stroke="#141418" stroke-width="1.5"/><rect x="18" y="20" width="12" height="4" fill="#2a2a34"/>',
  teslim: '<rect x="12" y="6" width="3" height="38" fill="#8a6a44"/><path d="M15,8 Q26,4 30,10 Q36,16 42,12 L42,28 Q36,32 30,26 Q24,20 15,24 Z" fill="#f0eadc" stroke="#141418" stroke-width="1.6"/>',
};
const ACT_IMG = { train: 'ic-train', rest: 'ic-rest', walk: 'ic-walk', talk: 'ic-talk', feed: 'ic-feed', care: 'ic-care', gear: 'item-bas2', pence: 'ic-pence', nefes: 'ic-nefes', kukre: 'ic-kukre', savun: 'ic-savun', teslim: 'ic-teslim', role: 'ui-un' };
function actIcon(k, color) { const a = ACT_IMG[k] && asset(ACT_IMG[k]); if (a) return `<img src="${a}" class="aic aicimg" alt="">`; return `<svg viewBox="0 0 48 48" class="aic" style="color:${color || '#ff9a4a'}" aria-hidden="true">${ACT_IC[k]}</svg>`; }
