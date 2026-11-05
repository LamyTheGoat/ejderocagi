'use strict';
/* ============ EJDER OCAĞI — SAHNE ARKA PLANLARI ============
   Her mekân 1600x900 bir tablo; ekranı "slice" ile kaplar. */

function srand(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const f1 = n => n.toFixed(1);

function ridge(seed, base, amp, rough = 0.55, steps = 7, w = 1600, h = 900) {
  const r = srand(seed); let pts = [base, base];
  for (let s = 0; s < steps; s++) {
    const n = []; const a = amp * Math.pow(rough, s);
    for (let i = 0; i < pts.length - 1; i++) { n.push(pts[i]); n.push((pts[i] + pts[i + 1]) / 2 + (r() * 2 - 1) * a); }
    n.push(pts[pts.length - 1]); pts = n;
  }
  const dx = w / (pts.length - 1);
  return `M0,${h} ` + pts.map((y, i) => `L${f1(i * dx)},${f1(y)}`).join(' ') + ` L${w},${h} Z`;
}
function starsSVG(seed, n, maxY, op = 1) {
  const r = srand(seed); let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${f1(r() * 1600)}" cy="${f1(r() * maxY)}" r="${f1(0.5 + r() * 1.5)}" fill="#fff" opacity="${f1((0.25 + r() * 0.75) * op)}"/>`;
  return s;
}
function grad(id, stops, v = true) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
}
function rgrad(id, stops, cx = 0.5, cy = 0.5, r = 0.5) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
}
function glowAt(id, x, y, r, color, op = 0.6, cls = '') {
  return `<defs>${rgrad(id, [[0, color, op], [1, color, 0]])}</defs><circle class="${cls}" cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`;
}
function torchSVG(id, x, y, s = 1) {
  return `${glowAt(id, x, y - 30 * s, 160 * s, '#ff9a3c', 0.45, 'flick')}
  <rect x="${x - 4 * s}" y="${y - 20 * s}" width="${8 * s}" height="${60 * s}" fill="#2a1d14"/>
  <path d="M${x - 12 * s},${y - 20 * s} L${x + 12 * s},${y - 20 * s} L${x + 8 * s},${y - 8 * s} L${x - 8 * s},${y - 8 * s} Z" fill="#4a3424"/>
  <path class="flame" d="M${x},${y - 64 * s} C${x + 14 * s},${y - 44 * s} ${x + 12 * s},${y - 24 * s} ${x},${y - 20 * s} C${x - 12 * s},${y - 24 * s} ${x - 14 * s},${y - 44 * s} ${x},${y - 64 * s} Z" fill="#ffb347"/>
  <path class="flame" d="M${x},${y - 50 * s} C${x + 7 * s},${y - 38 * s} ${x + 6 * s},${y - 26 * s} ${x},${y - 22 * s} C${x - 6 * s},${y - 26 * s} ${x - 7 * s},${y - 38 * s} ${x},${y - 50 * s} Z" fill="#fff1c4"/>`;
}
function sceneOr(key, svg) { const a = asset('bg-' + key); return a ? `<img src="${a}" class="scene-img" alt="">` : svg; }
function wrapScene(inner, cls = '') { return `<svg class="scene-svg ${cls}" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`; }

/* ---- Ocak vadisi, alacakaranlık ---- */
function sceneOcak(week = 1) {
  const late = Math.min(1, (week - 1) / 19); // sezon ilerledikçe gökyüzü ısınır
  return wrapScene(`<defs>
    ${grad('oc-sky', [[0, '#0a0f2a'], [0.38, '#22204a'], [0.62, '#5b2f4f'], [0.8, late > 0.5 ? '#c4553a' : '#a8483f'], [0.9, '#e88a4a']])}
    ${grad('oc-gr', [[0, '#26331f'], [0.5, '#18221a'], [1, '#0b100d']])}
    ${grad('oc-fog', [[0, '#c9867a', 0], [0.5, '#c9867a', 0.22], [1, '#c9867a', 0]])}
    ${rgrad('oc-moon', [[0, '#fff6dc', 1], [0.6, '#f3dfb0', 1], [1, '#f3dfb0', 0]])}
  </defs>
  <rect width="1600" height="900" fill="url(#oc-sky)"/>
  ${starsSVG(11, 140, 380)}
  ${glowAt('oc-mg', 1270, 170, 220, '#ffe9b8', 0.25)}
  <circle cx="1270" cy="170" r="46" fill="url(#oc-moon)"/>
  <path d="${ridge(3, 470, 120)}" fill="#3b2b52" opacity=".9"/>
  ${glowAt('oc-vg', 330, 430, 200, '#ff6a2a', 0.5, 'flick')}
  <path d="M190,560 L300,420 L320,432 L345,418 L460,560 Z" fill="#2b2040"/>
  <path d="M300,420 L320,432 L345,418 L330,450 L312,446 Z" fill="#ff7a3a" opacity=".85"/>
  <path d="${ridge(7, 540, 90)}" fill="#261c38"/>
  <rect y="470" width="1600" height="140" fill="url(#oc-fog)"/>
  <g fill="#ffd27a" opacity=".85">${(() => { const r = srand(5); let s = ''; for (let i = 0; i < 26; i++) s += `<rect x="${f1(1180 + r() * 300)}" y="${f1(560 + r() * 26)}" width="3" height="3"/>`; return s; })()}</g>
  <path d="M1360,575 q60,-46 120,0 Z" fill="#1d1630"/><path d="M1352,577 h136 v10 h-136 Z" fill="#1d1630"/>
  <path d="${ridge(13, 610, 60, 0.5)}" fill="#18171f"/>
  <path d="M0,640 Q800,560 1600,640 L1600,900 L0,900 Z" fill="url(#oc-gr)"/>
  <g fill="#0b0e0c">${(() => { const r = srand(21); let s = ''; for (let i = 0; i < 18; i++) { const x = r() * 1600, side = x < 300 || x > 1300; if (!side) continue; const h = 90 + r() * 120; s += `<path d="M${f1(x)},${f1(700 - h)} L${f1(x + 28)},${f1(700)} L${f1(x - 28)},${f1(700)} Z"/><path d="M${f1(x)},${f1(660 - h)} L${f1(x + 22)},${f1(660 - h * 0.4)} L${f1(x - 22)},${f1(660 - h * 0.4)} Z"/>`; } return s; })()}</g>`);
}

/* ---- Ahır: taş salon, meşaleler, kaide ---- */
function sceneAhir(el = 'ates') {
  const glow = { ates: '#ff7a3a', buz: '#7cc6e6', firtina: '#a796ea', toprak: '#a7c070', golge: '#c46cff' }[el];
  let arches = '';
  for (const x of [200, 800, 1400]) arches += `<path d="M${x - 170},780 L${x - 170},360 Q${x},170 ${x + 170},360 L${x + 170},780 Z" fill="#120d0b"/><path d="M${x - 150},780 L${x - 150},372 Q${x},200 ${x + 150},372 L${x + 150},780 Z" fill="url(#ah-in)"/>`;
  return wrapScene(`<defs>
    ${grad('ah-wall', [[0, '#2a221e'], [1, '#17110f']])}
    ${grad('ah-in', [[0, '#1d1714'], [1, '#0d0908']])}
    ${grad('ah-floor', [[0, '#2c241f'], [1, '#0e0b0a']])}
    ${grad('ah-cone', [[0, '#fff3d6', 0.0], [0.25, '#fff3d6', 0.09], [1, '#fff3d6', 0]])}
    <pattern id="ah-brick" width="120" height="60" patternUnits="userSpaceOnUse"><rect width="120" height="60" fill="none"/><path d="M0,30 H120 M60,0 V30 M0,30 V60 M120,30 V60" stroke="#000" stroke-opacity=".25" stroke-width="2"/></pattern>
    ${rgrad('ah-ped', [[0, glow, 0.55], [1, glow, 0]])}
  </defs>
  <rect width="1600" height="900" fill="url(#ah-wall)"/><rect width="1600" height="780" fill="url(#ah-brick)"/>
  ${arches}
  <path d="M0,780 L1600,780 L1600,900 L0,900 Z" fill="url(#ah-floor)"/>
  <path d="M0,780 L1600,780" stroke="#3b302a" stroke-width="3"/>
  <g stroke="#000" stroke-opacity=".25">${[...Array(9)].map((_, i) => `<line x1="${800 + (i - 4) * 120}" y1="780" x2="${800 + (i - 4) * 420}" y2="900"/>`).join('')}</g>
  ${torchSVG('ah-t1', 470, 470, 1.1)}${torchSVG('ah-t2', 1130, 470, 1.1)}
  <path d="M640,0 L960,0 L1180,860 L420,860 Z" fill="url(#ah-cone)"/>
  <ellipse cx="800" cy="826" rx="420" ry="70" fill="url(#ah-ped)" class="flick"/>
  <ellipse cx="800" cy="822" rx="310" ry="46" fill="#3a302a"/><ellipse cx="800" cy="812" rx="310" ry="46" fill="#4d4038"/>
  <ellipse cx="800" cy="812" rx="270" ry="36" fill="none" stroke="${glow}" stroke-opacity=".5" stroke-width="3"/>
  <g fill="#6b5a3a" opacity=".8"><path d="M60,800 q40,-60 110,-20 q30,50 -20,60 h-80 Z"/><path d="M1440,805 q50,-70 120,-10 q20,40 -30,45 h-90 Z"/></g>`);
}

/* ---- Pazar: gece çarşısı, fener dizileri ---- */
function scenePazar() {
  const r = srand(77);
  let lanterns = '';
  for (const [y0, sag, n, seed] of [[150, 90, 11, 1], [250, 70, 9, 2]]) {
    const rr = srand(seed * 31);
    lanterns += `<path d="M-20,${y0} Q800,${y0 + sag * 2} 1620,${y0}" stroke="#2b1d1a" stroke-width="2" fill="none"/>`;
    for (let i = 1; i < n; i++) {
      const t = i / n, x = -20 + 1640 * t, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0;
      const c = ['#ffb347', '#ff7a5a', '#ffd27a', '#e86c8f', '#7cc6e6'][Math.floor(rr() * 5)];
      lanterns += `<circle cx="${f1(x)}" cy="${f1(y + 22)}" r="30" fill="${c}" fill-opacity=".14" class="flick"/><line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(y + 10)}" stroke="#2b1d1a" stroke-width="2"/><ellipse cx="${f1(x)}" cy="${f1(y + 22)}" rx="11" ry="14" fill="${c}"/><rect x="${f1(x - 6)}" y="${f1(y + 7)}" width="12" height="4" fill="#3a2a1a"/>`;
    }
  }
  let bld = '';
  for (let i = 0; i < 12; i++) {
    const x = i * 140 - 20 + r() * 30, w = 120 + r() * 60, h = 180 + r() * 160, top = 600 - h;
    bld += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(w)}" height="${f1(h + 40)}" fill="#1c1426"/>`;
    if (r() < 0.4) bld += `<path d="M${f1(x)},${f1(top)} Q${f1(x + w / 2)},${f1(top - w * 0.7)} ${f1(x + w)},${f1(top)} Z" fill="#1c1426"/>`;
    else if (r() < 0.5) bld += `<rect x="${f1(x + w / 2 - 8)}" y="${f1(top - 120)}" width="16" height="120" fill="#1c1426"/><path d="M${f1(x + w / 2 - 12)},${f1(top - 120)} L${f1(x + w / 2)},${f1(top - 150)} L${f1(x + w / 2 + 12)},${f1(top - 120)} Z" fill="#1c1426"/>`;
    for (let k = 0; k < 4; k++) if (r() < 0.55) bld += `<path d="M${f1(x + 14 + r() * (w - 40))},${f1(top + 30 + r() * (h - 80))} m0,18 v-12 q8,-10 16,0 v12 Z" fill="#ffc46b" opacity="${f1(0.5 + r() * 0.5)}"/>`;
  }
  return wrapScene(`<defs>
    ${grad('pz-sky', [[0, '#0c0a22'], [0.55, '#2a1740'], [1, '#5a2a46']])}
    ${grad('pz-gr', [[0, '#3a2a24'], [1, '#140e0c']])}
    <pattern id="pz-cob" width="60" height="30" patternUnits="userSpaceOnUse"><ellipse cx="15" cy="8" rx="13" ry="6" fill="#000" opacity=".18"/><ellipse cx="45" cy="23" rx="13" ry="6" fill="#000" opacity=".18"/></pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#pz-sky)"/>${starsSVG(8, 80, 260, 0.7)}
  ${bld}
  <rect y="600" width="1600" height="300" fill="url(#pz-gr)"/><rect y="600" width="1600" height="300" fill="url(#pz-cob)"/>
  ${glowAt('pz-g1', 800, 700, 700, '#ff9a4a', 0.18)}
  ${lanterns}`);
}

/* ---- Arena: kolezyum, kalabalık ---- */
function sceneArena(pit) {
  if (pit) return scenePit();
  const r = srand(9); let crowd = '';
  for (let row = 0; row < 6; row++) {
    const y = 260 + row * 52, n = 70 - row * 4;
    for (let i = 0; i < n; i++) {
      const x = (i + r() * 0.6) * (1600 / n); const c = ['#5a3a2a', '#7a4a32', '#3a2a3a', '#8a6a4a', '#4a3a2a', '#a05a3a'][Math.floor(r() * 6)];
      crowd += `<circle cx="${f1(x)}" cy="${f1(y - 14 + r() * 4)}" r="${f1(7 + row)}" fill="${c}"/><rect x="${f1(x - 9 - row)}" y="${f1(y - 6)}" width="${f1(18 + row * 2)}" height="22" rx="6" fill="${c}"/>`;
    }
    crowd += `<rect y="${y + 12}" width="1600" height="16" fill="#7a5a3e"/><rect y="${y + 26}" width="1600" height="4" fill="#3a2a1e"/>`;
  }
  let banners = '';
  for (let i = 0; i < 8; i++) { const x = 100 + i * 200, c = i % 2 ? '#a8322a' : '#cfa557'; banners += `<line x1="${x}" y1="80" x2="${x}" y2="250" stroke="#3a2a1e" stroke-width="5"/><path d="M${x},88 L${x + 70},100 L${x},140 Z" fill="${c}" class="sway"/>`; }
  return wrapScene(`<defs>
    ${grad('ar-sky', [[0, '#f0b26a'], [0.5, '#e88a4a'], [1, '#b0563a']])}
    ${grad('ar-sand', [[0, '#d6a86a'], [1, '#8a6038']])}
    ${grad('ar-wall', [[0, '#8a6448'], [1, '#5a3e2c']])}
  </defs>
  <rect width="1600" height="900" fill="url(#ar-sky)"/>
  <circle cx="1300" cy="120" r="60" fill="#fff0c4" opacity=".7"/>
  <rect y="210" width="1600" height="360" fill="url(#ar-wall)"/>
  ${banners}${crowd}
  <rect y="560" width="1600" height="40" fill="#4a3424"/>
  <g fill="#3a2a1e">${[...Array(16)].map((_, i) => `<path d="M${i * 100 + 20},600 L${i * 100 + 20},560 Q${i * 100 + 50},530 ${i * 100 + 80},560 L${i * 100 + 80},600 Z"/>`).join('')}</g>
  <path d="M-100,600 Q800,560 1700,600 L1700,900 L-100,900 Z" fill="url(#ar-sand)"/>
  <ellipse cx="800" cy="760" rx="700" ry="120" fill="#000" opacity=".08"/>`, 'arena-scene');
}
function scenePit() {
  const r = srand(41); let rim = '';
  for (let i = 0; i < 46; i++) { const x = i * 36 + r() * 10; rim += `<circle cx="${f1(x)}" cy="${f1(282 + r() * 8)}" r="10" fill="#0a0606"/><rect x="${f1(x - 11)}" y="${f1(288 + r() * 6)}" width="22" height="30" rx="6" fill="#0a0606"/>`; }
  let stal = ''; for (let i = 0; i < 22; i++) { const x = r() * 1600, h = 40 + r() * 120; stal += `<path d="M${f1(x - 18)},0 L${f1(x)},${f1(h)} L${f1(x + 18)},0 Z" fill="#120b0a"/>`; }
  return wrapScene(`<defs>
    ${grad('pt-bg', [[0, '#0d0707'], [0.6, '#2a0f0c'], [1, '#120808']])}
    ${rgrad('pt-glow', [[0, '#e0574d', 0.45], [1, '#e0574d', 0]])}
    ${grad('pt-floor', [[0, '#3a1e16'], [1, '#120a08']])}
  </defs>
  <rect width="1600" height="900" fill="url(#pt-bg)"/>
  ${stal}
  <path d="M0,330 Q800,250 1600,330 L1600,360 L0,360 Z" fill="#1e0f0c"/>
  ${rim}
  <g stroke="#3a2a24" stroke-width="4" fill="none" opacity=".8"><path d="M200,0 Q260,200 220,360"/><path d="M1400,0 Q1340,220 1380,360"/></g>
  ${torchSVG('pt-t1', 150, 520, 1.2)}${torchSVG('pt-t2', 1450, 520, 1.2)}
  <path d="M-100,600 Q800,520 1700,600 L1700,900 L-100,900 Z" fill="url(#pt-floor)"/>
  <ellipse cx="800" cy="720" rx="760" ry="200" fill="url(#pt-glow)" class="flick"/>
  <g fill="#5a1a14" opacity=".5"><ellipse cx="620" cy="760" rx="40" ry="8"/><ellipse cx="1010" cy="700" rx="26" ry="6"/></g>`, 'pit-scene');
}

/* ---- Yuva bahçesi, gün batımı ---- */
function sceneYuva() {
  const r = srand(55); let flowers = '';
  for (let i = 0; i < 90; i++) { const x = r() * 1600, y = 700 + r() * 200; flowers += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 3)}" fill="${['#ffb4c8', '#ffd27a', '#e86c8f', '#fff0d0', '#c9a0ff'][Math.floor(r() * 5)]}" opacity=".85"/>`; }
  const tree = (x, s, flip) => `<g transform="translate(${x},640) scale(${flip ? -s : s},${s})"><path d="M-14,0 C-10,-80 -30,-150 -10,-230 L10,-230 C24,-150 6,-80 14,0 Z" fill="#2a1a20"/>
    <circle cx="-60" cy="-260" r="90" fill="#3a2440"/><circle cx="40" cy="-300" r="110" fill="#462a4a"/><circle cx="110" cy="-230" r="80" fill="#3a2440"/><circle cx="-10" cy="-210" r="70" fill="#52304e"/>
    ${[...Array(14)].map((_, i) => `<circle cx="${f1(-120 + (i * 37) % 240)}" cy="${f1(-330 + (i * 53) % 200)}" r="6" fill="#ffb4c8" opacity=".7"/>`).join('')}</g>`;
  return wrapScene(`<defs>
    ${grad('yv-sky', [[0, '#2a1a4a'], [0.35, '#7a3a6a'], [0.65, '#e0705a'], [0.85, '#ffb067']])}
    ${grad('yv-gr', [[0, '#3a4a2a'], [1, '#141a10']])}
  </defs>
  <rect width="1600" height="900" fill="url(#yv-sky)"/>
  ${glowAt('yv-sun', 800, 560, 420, '#ffd08a', 0.55)}
  <circle cx="800" cy="560" r="80" fill="#ffe3b0" opacity=".9"/>
  <path d="${ridge(31, 560, 70)}" fill="#5a2a4a" opacity=".8"/>
  <path d="${ridge(33, 610, 40)}" fill="#3a1e36"/>
  <path d="M0,640 Q800,600 1600,640 L1600,900 L0,900 Z" fill="url(#yv-gr)"/>
  ${tree(160, 1.1)}${tree(1460, 1, true)}
  ${flowers}`);
}

/* ---- Sefer haritası: parşömen ---- */
const MAP_POS = { ocak: [780, 507], kul: [385, 250], buzul: [900, 235], kayalik: [1400, 330], orman: [1150, 470], bataklik: [210, 700] };
function sceneSefer(flags = {}) {
  const P = MAP_POS;
  const route = Object.keys(P).filter(k => k !== 'ocak').map(k => `<path d="M${P.ocak[0]},${P.ocak[1]} Q${(P.ocak[0] + P[k][0]) / 2 + 60},${(P.ocak[1] + P[k][1]) / 2 - 40} ${P[k][0]},${P[k][1]}" stroke="#7a2415" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" fill="none" opacity="${k === 'bataklik' && !flags.bataklik ? 0.15 : 0.55}"/>`).join('');
  const volcano = (x, y) => `<g transform="translate(${x},${y})"><path d="M-110,40 L-30,-80 L-10,-70 L10,-84 L110,40 Z" fill="#8a5a3e" stroke="#4a2a1a" stroke-width="3"/><path d="M-30,-80 L-10,-70 L10,-84 L0,-50 L-18,-56 Z" fill="#d9573a"/><path d="M-6,-60 Q-20,-30 -40,10 M4,-62 Q20,-20 30,20" stroke="#d9573a" stroke-width="5" fill="none"/><path d="M-10,-100 q-14,-20 6,-34 q20,-6 14,-26" stroke="#6a5a4a" stroke-width="7" fill="none" opacity=".5" stroke-linecap="round"/></g>`;
  const peaks = (x, y) => `<g transform="translate(${x},${y})">${[[-80, 1], [0, 1.3], [80, 0.9]].map(([dx, s]) => `<path d="M${dx - 70 * s},40 L${dx},${-90 * s} L${dx + 70 * s},40 Z" fill="#9aa7a8" stroke="#4a5458" stroke-width="3"/><path d="M${dx - 26 * s},${-50 * s} L${dx},${-90 * s} L${dx + 26 * s},${-50 * s} L${dx + 10 * s},${-40 * s} L${dx},${-52 * s} L${dx - 12 * s},${-40 * s} Z" fill="#fff"/>`).join('')}</g>`;
  const cliffs = (x, y) => `<g transform="translate(${x},${y})"><path d="M-110,40 L-80,-40 L-60,-10 L-30,-90 L0,-20 L30,-70 L60,-10 L90,-60 L110,40 Z" fill="#7a7088" stroke="#3a3048" stroke-width="3"/><path d="M-60,-130 q-30,0 -30,-24 q0,-30 40,-26 q14,-34 60,-20 q44,-10 50,30 q30,4 24,30 Z" fill="#5a5070" opacity=".85"/><path d="M10,-100 L-4,-70 L8,-70 L-6,-40" stroke="#f4ee86" stroke-width="5" fill="none"/></g>`;
  const forest = (x, y) => `<g transform="translate(${x},${y})">${[[-90, 0.9], [-40, 1.2], [20, 1], [70, 1.25], [120, 0.85], [-10, 0.8]].map(([dx, s], i) => `<path d="M${dx},${-90 * s + (i === 5 ? 50 : 0)} L${dx + 34 * s},${30 + (i === 5 ? 30 : 0)} L${dx - 34 * s},${30 + (i === 5 ? 30 : 0)} Z" fill="${i % 2 ? '#4a6a2e' : '#5a7a3a'}" stroke="#2a3a18" stroke-width="3"/>`).join('')}</g>`;
  const swamp = (x, y) => `<g transform="translate(${x},${y})" opacity="${flags.bataklik ? 1 : 0.35}"><ellipse cx="0" cy="20" rx="140" ry="40" fill="#4a4a5a" opacity=".6"/><path d="M-60,30 L-60,-40 M-60,-20 L-80,-50 M-60,-30 L-40,-56 M50,30 L50,-30 M50,-10 L70,-40" stroke="#3a2a3a" stroke-width="5" fill="none"/><path d="M-120,-10 q60,-24 120,0 q60,24 120,0" stroke="#9a8aa8" stroke-width="6" fill="none" opacity=".5"/></g>`;
  const home = `<g transform="translate(${P.ocak[0]},${P.ocak[1]})"><circle r="44" fill="#e9dcc0" stroke="#7a2415" stroke-width="3"/><path d="M-22,14 L-22,-6 Q0,-30 22,-6 L22,14 Z" fill="#5a4030"/><path d="M-8,14 L-8,0 Q0,-10 8,0 L8,14 Z" fill="#1a1210"/><path d="M0,-34 q8,10 0,18 q-8,-8 0,-18" fill="#e5763a"/></g>`;
  return wrapScene(`<defs>
    <filter id="sf-paper"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="4" seed="7"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .42  0 0 0 0 .26  0 0 0 .5 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    ${rgrad('sf-vig', [[0.55, '#000', 0], [1, '#2a1408', 0.85]])}
  </defs>
  <rect width="1600" height="900" fill="#d9c49a"/>
  <rect width="1600" height="900" filter="url(#sf-paper)"/>
  <path d="M0,0 L340,0 Q300,120 180,180 Q80,240 0,230 Z M1600,0 L1600,360 Q1480,300 1440,180 Q1420,60 1300,0 Z M0,900 L0,740 Q120,760 220,840 L280,900 Z" fill="#7aa0a8" opacity=".45"/>
  <g stroke="#6a8a8a" stroke-width="2" fill="none" opacity=".5"><path d="M40,200 q60,-10 100,-60"/><path d="M1480,250 q-40,-40 -40,-110"/></g>
  ${route}
  ${volcano(P.kul[0], P.kul[1])}${peaks(P.buzul[0], P.buzul[1])}${cliffs(P.kayalik[0], P.kayalik[1])}${forest(P.orman[0], P.orman[1])}${swamp(P.bataklik[0], P.bataklik[1])}${home}
  <g transform="translate(1440,760)" opacity=".7"><circle r="60" fill="none" stroke="#5a3a20" stroke-width="2"/><path d="M0,-80 L12,0 L0,80 L-12,0 Z" fill="#7a2415"/><path d="M-80,0 L0,-10 L80,0 L0,10 Z" fill="#5a3a20"/><text y="-90" text-anchor="middle" font-family="serif" font-size="26" fill="#5a3a20">K</text></g>
  <rect width="1600" height="900" fill="url(#sf-vig)"/>`, 'map-scene');
}

/* ---- Sefer bölge arka planları ---- */
function sceneRegion(r) {
  const S = {
    kul: { sky: [['0', '#1a0806'], ['0.6', '#5a1a0e'], ['1', '#c4452a']], far: '#2a0e0a', mid: '#1a0806', near: '#0d0504', extra: `${glowAt('rg-k', 800, 640, 600, '#ff5a2a', 0.4, 'flick')}<path d="M400,900 Q500,760 640,720 Q760,690 820,640" stroke="#ff7a3a" stroke-width="10" fill="none" opacity=".8"/><path d="M1100,900 Q1060,800 980,760" stroke="#ff9a4a" stroke-width="6" fill="none" opacity=".7"/>` },
    buzul: { sky: [['0', '#0a1a2e'], ['0.6', '#2a5a7a'], ['1', '#a8d4e8']], far: '#a8c4d8', mid: '#6a8aa8', near: '#e8f4fa', extra: `<path d="M0,180 Q400,80 800,200 T1600,160" stroke="#7affc4" stroke-width="40" fill="none" opacity=".18"/><path d="M0,230 Q500,140 900,250 T1600,210" stroke="#a87aff" stroke-width="26" fill="none" opacity=".14"/>` },
    kayalik: { sky: [['0', '#0a0a1a'], ['0.6', '#2a2a48'], ['1', '#4a4a6a']], far: '#3a3a5a', mid: '#24243a', near: '#121220', extra: `<path d="M980,0 L940,160 L990,170 L930,360" stroke="#fffbb0" stroke-width="6" fill="none" class="bolt"/>` },
    orman: { sky: [['0', '#0a1a10'], ['0.6', '#1a3a20'], ['1', '#4a6a3a']], far: '#2a4a2a', mid: '#1a3018', near: '#0c180c', extra: [...Array(9)].map((_, i) => `<path d="M${i * 190 - 20},900 L${i * 190},${300 + (i * 97) % 150} L${i * 190 + 30},${300 + (i * 97) % 150} L${i * 190 + 50},900 Z" fill="#0f1c0e"/><path d="M${i * 190 - 80},900 Q${i * 190},700 ${i * 190 + 120},900" fill="none" stroke="#0f1c0e" stroke-width="14"/>`).join('') },
    bataklik: { sky: [['0', '#0c0814'], ['0.6', '#2a1a3a'], ['1', '#4a3a5a']], far: '#2a2038', mid: '#1a1428', near: '#0c0a14', extra: `<rect y="600" width="1600" height="120" fill="#c4a8ff" opacity=".08"/>${[200, 520, 1150, 1400].map(x => `<path d="M${x},760 L${x},520 M${x},600 L${x - 40},540 M${x},580 L${x + 34},520" stroke="#0c0a14" stroke-width="10" fill="none"/>`).join('')}` },
    col: { sky: [['0', '#3a1a08'], ['0.6', '#9a5420'], ['1', '#f4c26a']], far: '#c48a40', mid: '#9a6424', near: '#5a3410', extra: '' },
    mercan: { sky: [['0', '#0a1628'], ['0.6', '#1e4868'], ['1', '#4aa8b8']], far: '#2a5870', mid: '#1a3a50', near: '#0c2030', extra: '' },
    bulut: { sky: [['0', '#18102c'], ['0.6', '#4a3274'], ['1', '#c8a4f0']], far: '#5a4288', mid: '#3a2860', near: '#201438', extra: '' },
    obsidiyen: { sky: [['0', '#08040c'], ['0.6', '#1c0a1e'], ['1', '#4a1028']], far: '#1c0a18', mid: '#120610', near: '#060208', extra: '' },
  }[r] || { sky: [['0', '#1a0806'], ['0.6', '#5a1a0e'], ['1', '#c4452a']], far: '#2a0e0a', mid: '#1a0806', near: '#0d0504', extra: '' };
  return wrapScene(`<defs>${grad('rg-sky-' + r, S.sky.map(([o, c]) => [o, c]))}</defs>
    <rect width="1600" height="900" fill="url(#rg-sky-${r})"/>${r === 'buzul' || r === 'bataklik' ? starsSVG(19, 60, 300, 0.6) : ''}
    <path d="${ridge(r.length * 7, 420, 140)}" fill="${S.far}"/><path d="${ridge(r.length * 13, 560, 100)}" fill="${S.mid}"/>${S.extra}<path d="${ridge(r.length * 17, 720, 60)}" fill="${S.near}"/>`, 'region-scene');
}

/* ---- Başlık ---- */
function sceneTitle() {
  return wrapScene(`<defs>
    ${grad('tt-sky', [[0, '#05070f'], [0.5, '#16142e'], [0.8, '#3a1e30'], [1, '#6a2a2a']])}
    ${rgrad('tt-moon', [[0, '#fff6dc'], [0.7, '#e8d4a8'], [1, '#e8d4a8', 0]])}
  </defs>
  <rect width="1600" height="900" fill="url(#tt-sky)"/>${starsSVG(3, 220, 600)}
  ${glowAt('tt-mg', 1100, 300, 420, '#ffe9b8', 0.22)}
  <circle cx="1100" cy="300" r="190" fill="url(#tt-moon)"/>
  <g class="fly" fill="#0a0812"><path d="M1040,300 q30,-6 50,4 l40,-60 l-10,62 q30,4 50,-8 q-14,24 -50,20 l-26,8 q-40,4 -54,-26 Z"/><path d="M1090,304 l-70,-70 l20,74 Z"/></g>
  <path d="${ridge(5, 600, 140)}" fill="#1a1426"/>
  <path d="${ridge(9, 700, 70)}" fill="#0c0a12"/>
  ${glowAt('tt-f', 420, 740, 260, '#ff7a3a', 0.5, 'flick')}
  <g fill="#07060a"><path d="M300,760 L300,660 L330,660 L330,620 L360,620 L360,680 L420,680 L420,640 Q460,600 500,640 L500,760 Z"/><path d="M430,760 L430,700 Q460,672 490,700 L490,760 Z" fill="#ff8a3a" opacity=".7"/></g>
  <rect y="760" width="1600" height="140" fill="#07060a"/>`);
}
