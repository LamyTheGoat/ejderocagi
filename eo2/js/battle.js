/* EO2 dikey dilim · Topçu Arenası gösterim düellosu
   Yandan görünüş, sırayla atış, rüzgâr, oyulan arazi. Oyundaki Topçu'nun sade bir gösterimidir: ödül, sıralama ve
   yetenek sayıları yoktur; can, hasar, menzil değerleri yalnız bu gösterim içindir ve oyun dengesini bağlamaz.
   Karakterler chibi hattının gerçek savaş kareleridir (tools/bake_battle.mjs); arazi ve arka plan kodla çizilir. */
(function () {
  'use strict';
  const EO2 = window.EO2, $ = id => document.getElementById(id);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k, ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const FW = 64, FH = 30, TP = 40, MP = 8, MW = FW * MP, MH = FH * MP, G = 14, K = 1.7 / 270;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let B = null;                                   // etkin düello durumu
  const imgs = {}, load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(src)); i.src = src; });

  /* ---------- arazi ---------- */
  const edgeK = x => ss(3, 7.5, x) * ss(61, 56.5, x), midK = x => ss(3, 17, x) * ss(61, 47, x);
  const topH = x => 2.4 + (7.3 + 1.1 * Math.sin(x * 0.21 + 1) + 0.5 * Math.sin(x * 0.63) - 4.4 * Math.exp(-Math.pow((x - 32) / 6.5, 2)) + 2.1 * Math.exp(-Math.pow((x - 21.5) / 3.1, 2)) + 2.5 * Math.exp(-Math.pow((x - 43) / 3.3, 2))) * edgeK(x);
  const botH = x => 7.2 - 5.6 * midK(x) - 1.5 * Math.abs(Math.sin(x * 1.13 + 2)) * midK(x) - 0.5 * Math.abs(Math.sin(x * 3.7));
  function buildTerrain() {
    const c = document.createElement('canvas'); c.width = FW * TP; c.height = FH * TP; const x = c.getContext('2d'), Y = y => (FH - y) * TP, X = v => v * TP;
    const path = () => { x.beginPath(); for (let v = 3; v <= 61; v += 0.1) { const t = topH(v); v === 3 ? x.moveTo(X(v), Y(t)) : x.lineTo(X(v), Y(t)); } for (let v = 61; v >= 3; v -= 0.1) x.lineTo(X(v), Y(Math.min(botH(v), topH(v) - 0.2))); x.closePath(); };
    path(); const g = x.createLinearGradient(0, Y(13), 0, Y(1)); g.addColorStop(0, '#c9a383'); g.addColorStop(0.45, '#a07e72'); g.addColorStop(1, '#5d4a63'); x.fillStyle = g; x.fill();
    x.save(); path(); x.clip();
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let b = 0; b < 9; b++) { x.beginPath(); const y0 = 1.5 + b * 1.25; for (let v = 2; v <= 62; v += 0.5) { const yy = y0 + Math.sin(v * 0.4 + b) * 0.35 + Math.sin(v * 1.3 + b * 2) * 0.12; v === 2 ? x.moveTo(X(v), Y(yy)) : x.lineTo(X(v), Y(yy)); } x.lineWidth = TP * (0.18 + (b % 3) * 0.1); x.strokeStyle = b % 2 ? 'rgba(70,40,70,.16)' : 'rgba(255,230,200,.10)'; x.stroke(); }
    // katman çatlakları
    x.strokeStyle = 'rgba(58,37,48,.28)'; x.lineWidth = 2; for (let i = 0; i < 90; i++) { const bx = 3 + r() * 58, by = 1 + r() * 11; x.beginPath(); x.moveTo(X(bx), Y(by)); x.lineTo(X(bx + (r() - 0.5) * 0.5), Y(by - 0.3 - r() * 0.7)); x.lineTo(X(bx + (r() - 0.5) * 0.8), Y(by - 0.9 - r() * 0.6)); x.stroke(); }
    // gömülü kesme taş duvar kalıntıları (Selçuklu harabesi) ve çini parçaları
    for (const [wx0, wx1, depth, rows] of [[9, 16.5, 1.2, 3], [27.5, 36, 0.9, 4], [45.5, 53, 1.3, 3], [18, 22, 3.4, 2], [40, 44.5, 3.8, 2]]) for (let row = 0; row < rows; row++) { let bx = wx0 + (row % 2) * 0.45 + r() * 0.2; while (bx < wx1) { const bw = 0.75 + r() * 0.55, by = topH(bx + bw / 2) - depth - row * 0.52;
      x.fillStyle = ['#e9dcc6', '#dccbb2', '#efe4d2'][Math.floor(r() * 3)]; x.beginPath(); x.roundRect(X(bx), Y(by), bw * TP - 3, 0.48 * TP, 4); x.fill(); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(X(bx) + 3, Y(by) + 2, bw * TP - 9, 3); x.strokeStyle = 'rgba(58,37,48,.55)'; x.lineWidth = 2; x.beginPath(); x.roundRect(X(bx), Y(by), bw * TP - 3, 0.48 * TP, 4); x.stroke();
      if (r() < 0.12) { const cx = X(bx) + (bw * TP - 3) / 2, cy = Y(by) + 0.24 * TP, s = 0.14 * TP; x.save(); x.translate(cx, cy); x.fillStyle = '#2f7fc8'; x.fillRect(-s, -s, 2 * s, 2 * s); x.rotate(Math.PI / 4); x.fillRect(-s, -s, 2 * s, 2 * s); x.restore(); x.fillStyle = '#f7f1e2'; x.beginPath(); x.arc(cx, cy, s * 0.42, 0, 6.3); x.fill(); } bx += bw; } }
    for (let i = 0; i < 16; i++) { const cx = 5 + r() * 54, cy = 1.6 + r() * 4.5; for (let k = 0; k < 3; k++) { x.fillStyle = k ? '#7fd8ff' : '#3aa0e8'; x.beginPath(); const s = (0.16 + r() * 0.2) * TP, ox = (k - 1) * 0.2 * TP; x.moveTo(X(cx) + ox, Y(cy) - s * 1.5); x.lineTo(X(cx) + ox + s * 0.5, Y(cy)); x.lineTo(X(cx) + ox, Y(cy) + s * 0.4); x.lineTo(X(cx) + ox - s * 0.5, Y(cy)); x.closePath(); x.fill(); x.strokeStyle = 'rgba(20,40,90,.6)'; x.lineWidth = 1.5; x.stroke(); } }
    // çim örtüsü: koyu taban, sarkan saçaklar, üstte ışık
    const top = (lw, col, dy) => { x.beginPath(); for (let v = 3; v <= 61; v += 0.1) { const t = topH(v) + dy; v === 3 ? x.moveTo(X(v), Y(t)) : x.lineTo(X(v), Y(t)); } x.lineWidth = lw * TP; x.strokeStyle = col; x.lineJoin = 'round'; x.stroke(); };
    x.fillStyle = 'rgba(40,24,50,.28)'; for (let v = 3; v < 61; v += 0.4) { x.beginPath(); x.arc(X(v), Y(topH(v) - 0.72), 0.36 * TP, 0, 6.3); x.fill(); }
    top(0.95, '#3f7d45', 0); x.fillStyle = '#3f7d45'; for (let v = 3; v < 61; v += 0.42) { x.beginPath(); x.arc(X(v + (r() - 0.5) * 0.1), Y(topH(v) - 0.44 - r() * 0.1), (0.2 + r() * 0.1) * TP, 0, 6.3); x.fill(); }
    top(0.6, '#58a44e', 0.06); x.fillStyle = '#58a44e'; for (let v = 3.2; v < 61; v += 0.42) { x.beginPath(); x.arc(X(v), Y(topH(v) - 0.26), 0.13 * TP, 0, 6.3); x.fill(); }
    top(0.22, '#9bdb6c', 0.13); x.restore();
    for (let v = 3.4; v < 60.8; v += 0.16 + r() * 0.22) { const t = topH(v), hgt = 0.14 + r() * 0.2; x.beginPath(); x.moveTo(X(v - 0.07), Y(t - 0.03)); x.lineTo(X(v + (r() - 0.5) * 0.12), Y(t + hgt)); x.lineTo(X(v + 0.07), Y(t - 0.03)); x.closePath(); x.fillStyle = r() > 0.5 ? '#8fd064' : '#58a44e'; x.fill();
      if (r() < 0.07) { x.fillStyle = ['#f7a8cc', '#fff', '#ffd76a'][Math.floor(r() * 3)]; x.beginPath(); x.arc(X(v), Y(t + hgt + 0.03), 3.6, 0, 6.3); x.fill(); } }
    path(); x.lineWidth = 3.2; x.strokeStyle = '#3a2530'; x.stroke();
    const mask = new Uint8Array(MW * MH); for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const wx = (i + 0.5) / MP, wy = (j + 0.5) / MP; if (wx >= 3 && wx <= 61 && wy < topH(wx) && wy > Math.min(botH(wx), topH(wx) - 0.2)) mask[j * MW + i] = 1; }
    return { c, x, mask };
  }
  const solid = (T, wx, wy) => { const i = Math.floor(wx * MP), j = Math.floor(wy * MP); return i >= 0 && j >= 0 && i < MW && j < MH && T.mask[j * MW + i] === 1; };
  function carve(T, cx, cy, rad) {
    const r2 = rad * rad; for (let j = Math.max(0, Math.floor((cy - rad) * MP)); j <= Math.min(MH - 1, Math.ceil((cy + rad) * MP)); j++) for (let i = Math.max(0, Math.floor((cx - rad) * MP)); i <= Math.min(MW - 1, Math.ceil((cx + rad) * MP)); i++) { const dx = (i + 0.5) / MP - cx, dy = (j + 0.5) / MP - cy; if (dx * dx + dy * dy < r2) T.mask[j * MW + i] = 0; }
    const x = T.x, px = cx * TP, py = (FH - cy) * TP; x.save(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); for (let a = 0; a <= 6.3; a += 0.3) { const rr = rad * TP * (0.94 + Math.sin(a * 5 + cx) * 0.06); a === 0 ? x.moveTo(px + rr, py) : x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } x.closePath(); x.fill();
    x.globalCompositeOperation = 'source-atop'; const g = x.createRadialGradient(px, py, rad * TP * 0.9, px, py, rad * TP * 1.45); g.addColorStop(0, 'rgba(38,20,34,.78)'); g.addColorStop(0.5, 'rgba(60,34,40,.4)'); g.addColorStop(1, 'rgba(60,34,40,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad * TP * 1.45, 0, 6.3); x.fill();
    x.lineWidth = 3; x.strokeStyle = 'rgba(58,37,48,.9)'; x.beginPath(); x.arc(px, py, rad * TP * 0.99, 0, 6.3); x.stroke(); x.restore();
  }
  const groundBelow = (T, wx, fromY) => { for (let y = fromY; y > -1; y -= 1 / MP) if (solid(T, wx, y)) return (Math.floor(y * MP) + 1) / MP; return null; };

  /* ---------- uzak plan: bir kez çizilir ---------- */
  function buildBackdrop() {
    const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
    const ridge = (x, w, h, base, amp, col, sd) => { x.beginPath(); x.moveTo(0, h); for (let px = 0; px <= w; px += 10) { const t = px / w * 9; x.lineTo(px, base - amp * (Math.sin(t * 2.1 + sd) * 0.5 + Math.sin(t * 5.3 + sd * 2) * 0.3 + Math.sin(t * 11 + sd) * 0.14 + 0.5)); } x.lineTo(w, h); x.closePath(); x.fillStyle = col; x.fill(); };
    const far = mk(2400, 500, (x, w, h) => { ridge(x, w, h, 330, 230, '#a9c6e8', 1.2); ridge(x, w, h, 400, 170, '#8fb4dc', 4.1); });
    const isle = (seed, kumbet) => mk(520, 420, (x) => { let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      x.beginPath(); x.moveTo(30, 150); x.quadraticCurveTo(260, 110 + r() * 20, 490, 150); x.quadraticCurveTo(430, 250, 330 + r() * 40, 330); x.lineTo(280, 400); x.lineTo(240 - r() * 30, 300); x.quadraticCurveTo(90, 250, 30, 150); x.closePath();
      const g = x.createLinearGradient(0, 130, 0, 400); g.addColorStop(0, '#b79a8e'); g.addColorStop(1, '#6b5b80'); x.fillStyle = g; x.fill();
      x.beginPath(); x.moveTo(26, 152); x.quadraticCurveTo(260, 104, 494, 152); x.quadraticCurveTo(260, 176, 26, 152); x.fillStyle = '#6bb45c'; x.fill();
      x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(150 + r() * 60, 162, 9, 190); x.fillRect(176, 170, 5, 150);
      if (kumbet) { x.fillStyle = '#e9dccb'; x.fillRect(300, 86, 58, 62); x.fillStyle = '#3f86c9'; x.beginPath(); x.moveTo(294, 88); x.lineTo(364, 88); x.lineTo(329, 30); x.closePath(); x.fill(); x.fillStyle = '#2a3a66'; x.fillRect(322, 112, 14, 36); }
      for (let i = 0; i < 7; i++) { x.fillStyle = i % 3 ? '#4f9a57' : '#ec93bd'; x.beginPath(); x.arc(70 + r() * 380, 138 - r() * 10, 16 + r() * 14, 0, 6.3); x.fill(); }
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(190,215,245,.42)'; x.fillRect(0, 0, 520, 420); });
    const cloud = seed => mk(640, 300, (x) => { let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, puffs = []; for (let i = 0; i < 11; i++) puffs.push([320 + (r() - 0.5) * 360, 170 + (r() - 0.5) * 50, 44 + r() * 46]);
      x.fillStyle = '#b9d2f2'; for (const p of puffs) { x.beginPath(); x.arc(p[0], p[1] + 16, p[2], 0, 6.3); x.fill(); } x.fillStyle = '#fff'; for (const p of puffs) { x.beginPath(); x.arc(p[0], p[1], p[2], 0, 6.3); x.fill(); }
      const g = x.createLinearGradient(0, 190, 0, 280); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g; x.fillRect(0, 190, 640, 110); });
    return { far, isles: [isle(11, true), isle(29, false), isle(47, true)], clouds: [cloud(5), cloud(23), cloud(71)] };
  }

  function buildProps() {
    const art = EO2.art, col = broken => { const g = art.P(1.3, broken ? 2.4 : 3.7); g.stone(0.3, 0, 0.7, broken ? 1.9 : 3.0, { base: '#eadcc6', seed: broken ? 9 : 3, row: 0.45, bw: 0.7 }); g.rect(0.16, 0, 0.98, 0.22, '#d2bc98', 0.045);
      if (!broken) { g.rect(0.14, 3.0, 1.02, 0.3, '#d2bc98', 0.045); g.cini(0.3, 2.5, 0.7, 0.3); } else g.poly([[0.3, 1.88], [0.5, 2.2], [0.68, 1.98], [0.86, 2.14], [1.0, 1.88]], '#eadcc6', 0.045); return g.c; };
    const cF = col(false), cB = col(true), sel = art.selvi().c, erg = art.erguvan(33).c, erg2 = art.erguvan(55).c, lamp = art.lampPost().c;
    return [[8.6, sel, 1.7, 6.2], [11.2, cF, 1.3, 3.7], [12.9, cB, 1.3, 2.4], [16.4, lamp, 1.0, 3.5, 1], [24.4, erg, 4.4, 4.9], [30.2, cB, 1.3, 2.4], [33.4, cF, 1.3, 3.7], [39.6, erg2, 4.4, 4.9], [47.6, lamp, 1.0, 3.5, 1], [51.2, cB, 1.3, 2.4], [53.0, cF, 1.3, 3.7], [55.6, sel, 1.7, 6.2]].map(p => ({ x: p[0], im: p[1], w: p[2], h: p[3], lamp: !!p[4] }));
  }
  /* ---------- kurulum ---------- */
  function ensureDom() {
    if ($('battle')) return; const I = EO2.api.ICON, el = document.createElement('div'); el.id = 'battle'; el.hidden = true;
    el.innerHTML = '<canvas id="bcv"></canvas>' +
      '<div class="bf bf-l box"><canvas class="bp" id="bpL" width="112" height="112"></canvas><div><b id="bnL"></b><span id="bsL"></span><div class="hp"><i id="bhL2"></i><i id="bhL"></i></div></div><em id="bvL"></em></div>' +
      '<div class="bf bf-r box"><em id="bvR"></em><div><b id="bnR"></b><span id="bsR"></span><div class="hp"><i id="bhR2"></i><i id="bhR"></i></div></div><canvas class="bp" id="bpR" width="112" height="112"></canvas></div>' +
      '<div class="bturn box"><span id="bRound">Tur 1</span><b id="bTimer">25</b><span id="bWho"></span></div>' +
      '<div class="bwind box" title="Rüzgâr"><span class="wi"></span><div id="bWindBars"></div><b id="bWindTxt"></b></div><canvas id="bRadar" class="box" width="384" height="72" aria-label="Arena haritası"></canvas>' +
      '<div class="bconsole box"><div class="bc-move"><label>Adım</label><div class="bar"><i id="bMove"></i></div><small>A · D</small></div>' +
      '<div class="bc-angle"><svg viewBox="0 0 100 62" aria-hidden="true"><path d="M8 56A42 42 0 0 1 92 56" fill="none" stroke="rgba(195,205,234,.35)" stroke-width="6" stroke-linecap="round"/><line id="bNeedle" x1="50" y1="56" x2="50" y2="18" stroke="#ffe08a" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="56" r="5" fill="#e8b64c"/></svg><b id="bAngle">45°</b><small>W · S</small></div>' +
      '<div class="bc-power"><label>Güç</label><div class="bar big"><i id="bPower"></i><u id="bLast"></u></div><small id="bHint">Space basılı tut, bırak</small></div>' +
      '<div class="bc-shots"><button id="bShot0" aria-pressed="true" title="Normal atış (1)"><span></span><b>Atış</b></button><button id="bShot1" aria-pressed="false" title="Üçlü Seri (2)"><span></span><b>Üçlü Seri</b><i id="bTriple">1</i></button></div></div>' +
      '<button class="rb bexit" id="bExit" title="Meydana dön (Esc)" aria-label="Düellodan çık"></button>' +
      '<div class="bpad bpad-l"><button id="bLeft" aria-label="Sola yürü"></button><button id="bRight" aria-label="Sağa yürü"></button></div>' +
      '<div class="bpad bpad-r"><div><button id="bUp" aria-label="Açıyı artır"></button><button id="bDown" aria-label="Açıyı azalt"></button></div><button id="bFire" aria-label="Basılı tut, bırak: ateş"><b>ATEŞ</b></button></div>' +
      '<div id="bBanner" aria-live="polite"><b></b><span></span></div>' +
      '<div id="bResult" class="box" hidden><i class="orn"></i><h2 id="bResT"></h2><p id="bResP"></p><div><button class="primary" id="bAgain">Yeniden</button><button class="ghost" id="bBack">Meydana dön</button></div></div>';
    $('app').appendChild(el);
    $('bExit').innerHTML = I.close; $('bLeft').innerHTML = I.left; $('bRight').innerHTML = I.right; $('bUp').innerHTML = I.up; $('bDown').innerHTML = I.down;
    $('bShot0').querySelector('span').innerHTML = I.flame; $('bShot1').querySelector('span').innerHTML = I.triple; el.querySelector('.wi').innerHTML = I.wind;
    $('bWindBars').innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
    $('bExit').addEventListener('click', () => stop()); $('bBack').addEventListener('click', () => stop()); $('bAgain').addEventListener('click', () => { $('bResult').hidden = true; setup(); });
    $('bShot0').addEventListener('click', () => pick(0)); $('bShot1').addEventListener('click', () => pick(1));
    const hold = (id, k) => { const b = $(id), dn = e => { e.preventDefault(); B && (B.keys[k] = true); }, up = () => { B && (B.keys[k] = false); }; b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); };
    hold('bLeft', 'left'); hold('bRight', 'right'); hold('bUp', 'up'); hold('bDown', 'down'); hold('bFire', 'fire');
  }
  const pick = i => { if (!B || (i === 1 && B.triple <= 0)) return; B.shot = i; $('bShot0').setAttribute('aria-pressed', String(i === 0)); $('bShot1').setAttribute('aria-pressed', String(i === 1)); if (EO2.audio) EO2.audio.ui(); };
  const banner = (t, s, cls) => { const el = $('bBanner'); el.className = cls || ''; el.querySelector('b').textContent = t; el.querySelector('span').textContent = s || ''; void el.offsetWidth; el.classList.add('on'); };
  const mkActor = (o) => Object.assign({ x: 0, y: 0, vy: 0, face: 1, hp: 100, shown: 100, angle: 40, set: 'temel', state: 'aim', t: 0, ph: 0, fall: false, dead: false, hurtT: 0, fireT: 9, lastPower: -1 }, o);

  function setup() {
    const api = EO2.api, T = buildTerrain(), pset = imgs['battle_' + api.player.set] ? api.player.set : 'temel';
    B = Object.assign(B || {}, { T, on: true, time: 0, round: 1, turn: 0, phase: 'intro', pt: 0, timer: 25, wind: 0, shot: 0, triple: 1, charge: 0, charging: false, move: 5, shots: [], parts: [], nums: [], shake: 0, stop: 0, over: false, aiPlan: null, aiSkill: 0,
      keys: B && B.keys || {}, cam: { x: 32, y: 12, z: 0.5 }, bg: B && B.bg || buildBackdrop(), props: B && B.props || buildProps(), petals: Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 0.8, p: Math.random() * 6 })) });
    const P = mkActor({ x: 19, face: 1, set: pset, name: api.player.name, me: true, col: [255, 150, 60] }), E = mkActor({ x: 45, face: -1, set: pset === 'muhafiz' ? 'temel' : 'muhafiz', name: 'Talimci', angle: 45, col: [120, 200, 255] });
    for (const a of [P, E]) a.y = groundBelow(T, a.x, FH - 1) || 10;
    B.act = [P, E]; newWind();
    $('bnL').textContent = P.name; $('bsL').textContent = ({ temel: 'Temel seti', muhafiz: 'Muhafız seti' })[P.set]; $('bnR').textContent = E.name; $('bsR').textContent = 'Arena talimcisi · NPC';
    api.drawPortrait($('bpL'), P.set, 0.66); api.drawPortrait($('bpR'), E.set, 0.66); pick(0); $('bTriple').textContent = '1'; $('bShot1').disabled = false; $('bResult').hidden = true; hud(true);
    banner('Düello!', 'Gösterim · ödül yok', 'big'); if (EO2.audio) EO2.audio.turn();
  }
  function newWind() { B.wind = Math.round((Math.random() * 6 - 3) * 10) / 10; const n = Math.round(Math.abs(B.wind) * 2), bars = $('bWindBars').children; for (let i = 0; i < 6; i++) bars[i].className = i < n ? 'on' : ''; $('bWindBars').style.transform = B.wind < 0 ? 'scaleX(-1)' : ''; $('bWindTxt').textContent = Math.abs(B.wind) < 0.05 ? 'Durgun' : Math.abs(B.wind).toFixed(1).replace('.', ',') + (B.wind > 0 ? ' →' : ' ←'); }

  /* ---------- atış ---------- */
  function muzzleOf(a) { const m = window.EO2_BATTLE.sets[a.set], q = clamp(Math.round(a.angle / 5) * 5, -10, 70), mz = m.muzzle[q] || [150, 150]; return [a.x + a.face * mz[0] * K, a.y + mz[1] * K]; }
  function launch(a, power, kind) {
    const base = a.angle, list = kind === 1 ? [-6, 0, 6] : [0], sp = 8.5 + power * 19.5;
    for (const d of list) { const ang = (base + d) * Math.PI / 180, mz = muzzleOf(a); B.shots.push({ x: mz[0], y: mz[1], vx: Math.cos(ang) * sp * a.face, vy: Math.sin(ang) * sp, by: a, col: a.col, r: kind === 1 ? 1.7 : 2.5, dmg: kind === 1 ? 24 : 46, t: 0, trail: [] }); }
    a.fireT = 0; a.lastPower = power; const mz = muzzleOf(a); B.shake = Math.max(B.shake, 0.35);
    for (let i = 0; i < 10; i++) B.parts.push({ k: 'smoke', x: mz[0], y: mz[1], vx: a.face * (1 + Math.random() * 3) + (Math.random() - 0.5), vy: Math.random() * 1.6, life: 0.7 + Math.random() * 0.5, max: 1.2, s: 0.3 + Math.random() * 0.3 });
    B.parts.push({ k: 'flash', x: mz[0], y: mz[1], vx: 0, vy: 0, life: 0.14, max: 0.14, s: 1.5, col: a.col });
    if (EO2.audio) EO2.audio.fire(); B.phase = 'flight'; B.pt = 0;
  }
  function explode(s, x, y) {
    carve(B.T, x, y, s.r); B.hitX = x; B.shake = Math.max(B.shake, 0.7); B.stop = 0.05; if (EO2.audio) EO2.audio.boom(s.r / 2.5);
    B.parts.push({ k: 'flash', x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, s: s.r * 1.6, col: s.col }, { k: 'ring', x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, s: s.r });
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI, v = 3 + Math.random() * 8; B.parts.push({ k: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 2, life: 0.9 + Math.random() * 0.8, max: 1.7, s: 0.08 + Math.random() * 0.14, rot: Math.random() * 6 }); }
    for (let i = 0; i < 12; i++) B.parts.push({ k: 'smoke', x: x + (Math.random() - 0.5) * s.r, y: y + (Math.random() - 0.5) * s.r, vx: (Math.random() - 0.5) * 2, vy: 0.6 + Math.random() * 1.6, life: 0.8 + Math.random() * 0.8, max: 1.6, s: 0.5 + Math.random() * 0.6 });
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.3, v = 2 + Math.random() * 7; B.parts.push({ k: 'ember', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 2, life: 0.5 + Math.random() * 0.7, max: 1.2, s: 0.07, col: s.col }); }
    for (const a of B.act) { if (a.dead) continue; const d = Math.hypot(a.x - x, a.y + 0.8 - y), k = clamp(1 - d / (s.r + 1.2), 0, 1); if (k <= 0) continue;
      const dmg = Math.max(1, Math.round(s.dmg * (0.35 + 0.65 * k))); a.hp = Math.max(0, a.hp - dmg); a.hurtT = 0.55; a.vy = 4 + k * 3; a.fall = true; a.kx = Math.sign(a.x - x || 1) * (2 + k * 4);
      B.nums.push({ x: a.x, y: a.y + 2.2, t: 0, v: dmg, crit: k > 0.75 }); if (EO2.audio) EO2.audio.hit(); if (k > 0.75 && s.by !== a) banner('Tam isabet!', '', 'hit'); }
  }
  function stepShots(dt) {
    for (let i = B.shots.length - 1; i >= 0; i--) { const s = B.shots[i]; let hit = false;
      for (let k = 0; k < 4 && !hit; k++) { const h = dt / 4; s.vx += B.wind * h; s.vy -= G * h; s.x += s.vx * h; s.y += s.vy * h; s.t += h;
        if (solid(B.T, s.x, s.y)) hit = true; else for (const a of B.act) if (!a.dead && (a !== s.by || s.t > 0.25) && Math.hypot(a.x - s.x, a.y + 0.85 - s.y) < 0.75) hit = true;
        if (s.x < -8 || s.x > FW + 8 || s.y < -6) { B.shots.splice(i, 1); hit = null; break; } }
      if (hit === null) continue; s.trail.push([s.x, s.y]); if (s.trail.length > 26) s.trail.shift();
      if (Math.random() < 0.6) B.parts.push({ k: 'ember', x: s.x, y: s.y, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.2, life: 0.35, max: 0.35, s: 0.06, col: s.col });
      if (hit) { B.shots.splice(i, 1); explode(s, s.x, s.y); } }
  }
  /* Rakip: fiziğin aynısıyla deneme atışları yapar, en yakın düşeni seçer; ilk atışlarda sapması büyüktür. */
  function simulate(a, angle, power, target) { const ang = angle * Math.PI / 180, sp = 8.5 + power * 19.5; let x = a.x + a.face * 0.9, y = a.y + 1.3, vx = Math.cos(ang) * sp * a.face, vy = Math.sin(ang) * sp;
    for (let t = 0; t < 7; t += 1 / 60) { vx += B.wind / 60; vy -= G / 60; x += vx / 60; y += vy / 60; if (t > 0.2 && (solid(B.T, x, y) || Math.hypot(target.x - x, target.y + 0.85 - y) < 0.75)) return [x, y]; if (x < -8 || x > FW + 8 || y < -6) return null; } return null; }
  function aiPlan() { const me = B.act[1], tg = B.act[0]; let best = null;
    for (let ang = 15; ang <= 70; ang += 2.5) for (let p = 0.25; p <= 1; p += 0.04) { const l = simulate(me, ang, p, tg); if (!l) continue; const d = Math.hypot(l[0] - tg.x, l[1] - tg.y - 0.8) + (Math.hypot(l[0] - me.x, l[1] - me.y) < 4 ? 20 : 0); if (!best || d < best.d) best = { d, ang, p }; }
    if (!best) best = { ang: 45, p: 0.7 }; const err = Math.max(2.2, 9 - B.aiSkill * 1.7); B.aiSkill++;
    return { ang: clamp(best.ang + (Math.random() - 0.5) * 2 * err, 5, 70), p: clamp(best.p + (Math.random() - 0.5) * 0.02 * err, 0.2, 1), t: 0 }; }
  function endTurn() { if (B.over) return; const a = B.act; if (a[0].dead || a[1].dead || a[0].hp <= 0 || a[1].hp <= 0) return finish(a[0].hp > 0 && !a[0].dead);
    B.turn = 1 - B.turn; if (B.turn === 0) { B.round++; newWind(); } B.phase = 'aim'; B.pt = 0; B.timer = 25; B.move = 5; B.charge = 0; B.charging = false; B.aiPlan = null;
    banner(B.turn === 0 ? 'Senin sıran' : 'Rakibin sırası', 'Tur ' + B.round, B.turn === 0 ? 'me' : ''); if (EO2.audio) EO2.audio.turn(); hud(true); }
  function finish(win) { B.over = true; B.phase = 'over'; setTimeout(() => { if (!B || !B.on) return; $('bResT').textContent = win ? 'Zafer' : 'Yenilgi'; $('bResP').textContent = win ? 'Talimci başını eğdi. Gösterim düellosuydu; ödül ve sıralama yok.' : 'Talimci bu kez isabetliydi. Gösterim düellosuydu; kaybın yok.'; $('bResult').hidden = false; $('bResult').className = 'box ' + (win ? 'win' : 'lose'); if (EO2.audio) EO2.audio.win(win); }, 1100); }

  /* ---------- güncelleme ---------- */
  function update(dt) {
    B.time += dt; if (B.stop > 0) { B.stop -= dt; return; } B.pt += dt; B.shake = Math.max(0, B.shake - dt * 2.2);
    const me = B.act[B.turn], K_ = B.keys;
    if (B.phase === 'intro' && B.pt > 1.6) { B.phase = 'aim'; B.pt = 0; banner('Senin sıran', 'Tur 1', 'me'); }
    if (B.phase === 'aim') {
      B.timer -= dt; if (B.timer <= 0) { B.charging = false; B.charge = 0; endTurn(); return; }
      if (B.turn === 0) {
        const mv = (K_.right ? 1 : 0) - (K_.left ? 1 : 0); me.moving = false;
        if (mv && !B.charging && B.move > 0 && !me.fall) { const nx = clamp(me.x + mv * 2.3 * dt, 3.6, 60.4); me.face = 1; if (!solid(B.T, nx, me.y + 0.75)) { const gy = groundBelow(B.T, nx, me.y + 0.7); if (gy !== null && gy - me.y < 0.7) { B.move -= Math.abs(nx - me.x); me.x = nx; if (me.y - gy > 0.9) me.fall = true; else me.y = gy; me.moving = true; me.ph += dt * 1.9; } else if (gy === null) { me.x = nx; me.fall = true; } } }
        const av = (K_.up ? 1 : 0) - (K_.down ? 1 : 0); if (av) me.angle = clamp(me.angle + av * 38 * dt, -10, 70);
        if (K_.fire && !me.fall) { if (!B.charging) { B.charging = true; B.charge = 0; } B.charge = Math.min(1, B.charge + dt / 1.5); if (EO2.audio && Math.floor(B.time * 14) !== B.lastTick) { B.lastTick = Math.floor(B.time * 14); EO2.audio.charge(B.charge); } }
        else if (B.charging) { B.charging = false; const p = Math.max(0.12, B.charge), kind = B.shot; if (kind === 1) { B.triple--; $('bTriple').textContent = String(B.triple); $('bShot1').disabled = true; } launch(me, p, kind); B.charge = 0; if (kind === 1) pick(0); }
      } else {
        if (!B.aiPlan && B.pt > 0.9) B.aiPlan = aiPlan();
        if (B.aiPlan) { const p = B.aiPlan; p.t += dt; const d = p.ang - me.angle; if (Math.abs(d) > 0.6 && p.t < 1.6) me.angle += Math.sign(d) * Math.min(Math.abs(d), 42 * dt); else { B.charging = true; B.charge = Math.min(p.p, B.charge + dt / 1.5); if (B.charge >= p.p - 0.001) { B.charging = false; launch(me, p.p, 0); B.charge = 0; } } }
      }
    } else if (B.phase === 'flight') { stepShots(dt); if (!B.shots.length && B.pt > 0.3) { B.phase = 'settle'; B.pt = 0; } }
    else if (B.phase === 'settle' && B.pt > 0.9 && !B.act.some(a => a.fall)) endTurn();
    // gövde fiziği: düşme, savrulma
    for (const a of B.act) { a.fireT += dt; if (a.hurtT > 0) a.hurtT -= dt; a.shown += (a.hp - a.shown) * Math.min(1, dt * 4);
      if (a.fall) { a.vy -= G * dt; a.y += a.vy * dt; if (a.kx) { const nx = clamp(a.x + a.kx * dt, 3.3, 60.7); if (!solid(B.T, nx, a.y + 0.6)) a.x = nx; a.kx *= Math.pow(0.05, dt); }
        const gy = groundBelow(B.T, a.x, a.y + 0.5); if (a.vy <= 0 && gy !== null && a.y <= gy) { a.y = gy; a.fall = false; a.vy = 0; a.kx = 0; for (let i = 0; i < 5; i++) B.parts.push({ k: 'smoke', x: a.x + (Math.random() - 0.5) * 0.6, y: a.y + 0.1, vx: (Math.random() - 0.5) * 2, vy: 0.5, life: 0.5, max: 0.5, s: 0.25 }); }
        if (a.y < -4) { a.hp = 0; a.dead = true; a.fall = false; B.nums.push({ x: a.x, y: 2.5, t: 0, v: 'Düştü', crit: true }); } }
      else if (!a.dead) { const gy = groundBelow(B.T, a.x, a.y + 0.4); if (gy === null || a.y - gy > 0.25) a.fall = true; else a.y = gy; }
      if (a.hp <= 0 && !a.dead && !a.fall) a.dead = true; }
    for (let i = B.parts.length - 1; i >= 0; i--) { const p = B.parts[i]; p.life -= dt; if (p.life <= 0) { B.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'chunk' || p.k === 'ember') p.vy -= G * 0.8 * dt; else if (p.k === 'smoke') { p.vx *= Math.pow(0.2, dt); p.x += B.wind * 0.25 * dt; } }
    for (let i = B.nums.length - 1; i >= 0; i--) { B.nums[i].t += dt; if (B.nums[i].t > 1.4) B.nums.splice(i, 1); }
    // kamera
    const c = B.cam; let tx, ty, tz;
    if (B.shots.length) { const s = B.shots[0]; tx = s.x + s.vx * 0.3; ty = Math.max(7, s.y * 0.55 + 4.5); tz = 0.62; } else if (B.phase === 'settle' || B.phase === 'over') { const o = B.act[1 - B.turn]; tx = (B.hitX === undefined ? o.x : B.hitX); ty = o.y + 2.0; tz = 0.9; }
    else if (B.phase === 'intro') { tx = 32; ty = 11; tz = 0.5; } else { tx = me.x + me.face * (B.charging ? 7.5 : 5); ty = me.y + 2.0; tz = B.charging ? 0.84 : 1; }
    const k = Math.min(1, dt * (B.shots.length ? 5 : 2.4)); c.x = lerp(c.x, tx, k); c.y = lerp(c.y, ty, k); c.z = lerp(c.z, tz, Math.min(1, dt * 2));
    hud(false);
    if (((B.tick = (B.tick || 0) + 1) % 6) === 1) radar();
  }
  function radar() { const cv = $('bRadar'), x = cv.getContext('2d'), W = cv.width, H = cv.height, X = v => v / FW * W, Y = v => H - 6 - v / 15 * (H - 14); x.clearRect(0, 0, W, H);
    x.beginPath(); let open = false; for (let i = 0; i <= 128; i++) { const wx = 3 + i / 128 * 58, gy = groundBelow(B.T, wx, FH - 1); if (gy === null) { open = false; continue; } open ? x.lineTo(X(wx), Y(gy)) : x.moveTo(X(wx), Y(gy)); open = true; }
    x.strokeStyle = '#8fd064'; x.lineWidth = 3; x.lineJoin = 'round'; x.stroke();
    for (const a of B.act) { if (a.dead) continue; x.fillStyle = a.me ? '#58d06a' : '#ef5b4d'; x.strokeStyle = '#fff6dc'; x.lineWidth = 2; x.beginPath(); x.arc(X(a.x), Y(a.y) - 5, 5.5, 0, 6.3); x.fill(); x.stroke(); }
    for (const s of B.shots) { x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(X(s.x), Y(Math.min(s.y, 16)), 3.5, 0, 6.3); x.fill(); } }
  let hudCache = {};
  function hud(force) {
    if (force) hudCache = {}; const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } }, a = B.act, me = a[0];
    set('hpL', Math.round(a[0].hp), v => { $('bhL').style.width = v + '%'; $('bvL').textContent = v; }); set('hpR', Math.round(a[1].hp), v => { $('bhR').style.width = v + '%'; $('bvR').textContent = v; });
    set('hsL', Math.round(a[0].shown), v => { $('bhL2').style.width = v + '%'; }); set('hsR', Math.round(a[1].shown), v => { $('bhR2').style.width = v + '%'; });
    set('tm', Math.max(0, Math.ceil(B.timer)), v => { $('bTimer').textContent = v; $('bTimer').classList.toggle('low', v <= 5); }); set('rd', B.round, v => { $('bRound').textContent = 'Tur ' + v; });
    set('who', B.over ? 2 : B.turn, v => { $('bWho').textContent = v === 2 ? 'Bitti' : v === 0 ? 'Senin sıran' : 'Rakibin sırası'; $('battle').classList.toggle('mine', v === 0 && B.phase !== 'flight'); });
    set('ang', Math.round(me.angle), v => { $('bAngle').textContent = v + '°'; const r = v * Math.PI / 180; $('bNeedle').setAttribute('x2', (50 + Math.cos(r) * 38).toFixed(1)); $('bNeedle').setAttribute('y2', (56 - Math.sin(r) * 38).toFixed(1)); });
    set('pw', Math.round((B.turn === 0 ? B.charge : 0) * 100), v => { $('bPower').style.width = v + '%'; }); set('lp', Math.round(me.lastPower * 100), v => { $('bLast').style.left = v + '%'; $('bLast').hidden = v < 0; });
    set('mv', Math.round(B.move / 5 * 100), v => { $('bMove').style.width = v + '%'; });
  }

  /* ---------- çizim ---------- */
  function render() {
    const cv = $('bcv'), app = $('app').getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(app.width * dpr), H = Math.round(app.height * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const x = cv.getContext('2d'), n = EO2.state.night, c = B.cam, sc = (W / 22) * c.z * (W / H < 1 ? 1.9 : 1), viewW = W / sc, viewH = H / sc;
    const cx = clamp(c.x, viewW / 2 - 4, FW - viewW / 2 + 4) + (Math.random() - 0.5) * B.shake * 0.5, cy = clamp(c.y, viewH / 2 - 2, 40) + (Math.random() - 0.5) * B.shake * 0.5;
    const X = wx => (wx - cx) * sc + W / 2, Y = wy => H / 2 - (wy - cy) * sc + H * 0.02;
    const sky = x.createLinearGradient(0, 0, 0, H); if (n < 0.5) { sky.addColorStop(0, '#3f8fe6'); sky.addColorStop(0.6, '#8dc9f5'); sky.addColorStop(1, '#e4f3fb'); } else { sky.addColorStop(0, '#10163a'); sky.addColorStop(0.55, '#3a2f70'); sky.addColorStop(1, '#d9785f'); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = sky; x.fillRect(0, 0, W, H);
    const sun = x.createRadialGradient(W * 0.74, H * 0.2, 0, W * 0.74, H * 0.2, H * 0.5); sun.addColorStop(0, n < 0.5 ? 'rgba(255,246,214,.9)' : 'rgba(210,220,255,.5)'); sun.addColorStop(0.15, n < 0.5 ? 'rgba(255,240,200,.4)' : 'rgba(190,200,255,.2)'); sun.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = sun; x.fillRect(0, 0, W, H);
    const bg = B.bg, par = (k, ox) => ((-(cx * sc * k) + ox) % 1);
    let fx = -((cx * sc * 0.06) % 2400) - 600; const fs = H / 620; for (let i = 0; i < 3; i++) x.drawImage(bg.far, fx * fs + i * 2400 * fs, H * 0.38 + (cy - 12) * sc * 0.04, 2400 * fs, 500 * fs);
    for (let i = 0; i < 5; i++) { const px = (((i * 620 + B.time * (8 + i * 3) - cx * sc * 0.1) % (W + 900)) + W + 900) % (W + 900) - 450, k = i % 3; x.globalAlpha = 0.9; x.drawImage(bg.clouds[k], px, H * (0.04 + (i % 4) * 0.1) + (cy - 12) * sc * 0.05, 640 * fs * (0.8 + (i % 2) * 0.5), 300 * fs * (0.8 + (i % 2) * 0.5)); } x.globalAlpha = 1;
    { const sea = x.createLinearGradient(0, H * 0.5, 0, H); sea.addColorStop(0, 'rgba(255,255,255,0)'); sea.addColorStop(0.45, n < 0.5 ? 'rgba(236,246,255,.85)' : 'rgba(150,130,200,.6)'); sea.addColorStop(1, n < 0.5 ? 'rgba(210,230,250,.95)' : 'rgba(90,80,150,.8)'); x.fillStyle = sea; x.fillRect(0, H * 0.5, W, H * 0.5);
      for (let i = 0; i < 7; i++) { const k = i % 3, w = 640 * fs * 1.5, px = (((i * 410 + B.time * 5 - cx * sc * 0.2) % (W + w)) + W + w) % (W + w) - w; x.drawImage(bg.clouds[k], px, H * (0.56 + (i % 3) * 0.1) + (cy - 12) * sc * 0.12, w, 300 * fs * 1.5); } }
    bg.isles.forEach((im, i) => { const wx = [6, 34, 60][i], wy = [20, 24, 19][i], k = 0.4 + i * 0.07, px = W / 2 + (wx - cx) * sc * k, py = H / 2 - (wy - cy) * sc * k, s = sc * 0.014 * (1 + i * 0.25); x.drawImage(im, px - 260 * s, py - 150 * s + Math.sin(B.time * 0.5 + i) * 6, 520 * s, 420 * s); });
    // sancaklar ve şelaleler arazinin arkasında
    const pole = (wx, im) => { const gy = groundBelow(B.T, wx, FH - 1) || topH(wx), w = 1.7 * sc, h = 4.6 * sc; x.drawImage(im, X(wx) - w * 0.2, Y(gy) - h + 4, w, h); };
    pole(6.4, B.poleL); pole(57.2, B.poleR);
    for (const wx of [3.9, 60.2]) { const ty = topH(wx + (wx < 30 ? 0.6 : -0.6)) - 0.3; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(X(wx) - 0.35 * sc, Y(ty), 0.7 * sc, H); x.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 9; i++) { const yy = ((B.time * 9 + i * 2.3) % 20); x.fillRect(X(wx) - 0.3 * sc + (i % 3) * 0.2 * sc, Y(ty - yy), 0.09 * sc, 1.1 * sc); } }
    for (const p of B.props) { const gy = groundBelow(B.T, p.x, FH - 1); if (gy === null || gy < topH(p.x) - 2.2) continue; x.drawImage(p.im, X(p.x) - p.w * sc / 2, Y(gy) - p.h * sc + 0.12 * sc, p.w * sc, p.h * sc); p.gy = gy; }
    x.drawImage(B.T.c, X(0), Y(FH), FW * sc, FH * sc);
    // karakterler
    const M = window.EO2_BATTLE.sets;
    for (const a of B.act) { const m = M[a.set], im = imgs['battle_' + a.set], q = clamp(Math.round(a.angle / 5) * 5, -10, 70);
      let key = 'aim_' + q; if (a.dead || a.hurtT > 0) key = a.hurtT > 0.3 ? 'hurt_0' : 'hurt_1'; else if (a.fireT < 0.09) key = 'fire0_' + q; else if (a.fireT < 0.24) key = 'fire1_' + q; else if (a.moving) key = 'walk_' + (Math.floor(a.ph * 16) % 16);
      const i = m.frames[key], sx = (i % m.cols) * m.cw, sy = Math.floor(i / m.cols) * m.ch, s = K * sc;
      if (!a.fall && !a.dead) { x.fillStyle = 'rgba(30,18,50,.3)'; x.beginPath(); x.ellipse(X(a.x), Y(a.y) + 2, 0.75 * sc, 0.16 * sc, 0, 0, 6.3); x.fill(); }
      x.save(); x.translate(X(a.x), Y(a.y)); if (a.dead) { x.globalAlpha = Math.max(0, 1 - (B.time % 1e6) * 0 - 0.15); x.rotate(a.face * -0.5); } x.scale(a.face, 1);
      x.drawImage(im, sx, sy, m.cw, m.ch, -m.ax * s, -m.ay * s + 3, m.cw * s, m.ch * s);
      if (a.hurtT > 0.42) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = (a.hurtT - 0.42) / 0.13 * 0.8; x.drawImage(im, sx, sy, m.cw, m.ch, -m.ax * s, -m.ay * s + 3, m.cw * s, m.ch * s); x.globalCompositeOperation = 'source-over'; } x.restore(); }
    // nişan çizgisi ve yörünge ipucu (yalnız oyuncunun sırası)
    const me = B.act[0]; if (B.turn === 0 && B.phase === 'aim' && !me.fall) { const mz = muzzleOf(me), ang = me.angle * Math.PI / 180, p = B.charging ? Math.max(0.12, B.charge) : (me.lastPower > 0 ? me.lastPower : 0.55), sp = 8.5 + p * 19.5; let px = mz[0], py = mz[1], vx = Math.cos(ang) * sp * me.face, vy = Math.sin(ang) * sp;
      for (let i = 0; i < 16; i++) { for (let k = 0; k < 3; k++) { vx += B.wind / 60; vy -= G / 60; px += vx / 60; py += vy / 60; } if (solid(B.T, px, py)) break; const a = (1 - i / 16) * (B.charging ? 0.95 : 0.5); x.fillStyle = 'rgba(255,255,255,' + a + ')'; x.beginPath(); x.arc(X(px), Y(py), Math.max(2, (0.11 - i * 0.004) * sc), 0, 6.3); x.fill(); x.strokeStyle = 'rgba(33,50,112,' + a + ')'; x.lineWidth = 1.5; x.stroke(); } }
    // mermiler ve parçacıklar
    x.globalCompositeOperation = 'lighter';
    x.globalCompositeOperation = 'source-over';
    for (const s of B.shots) { s.trail.forEach((t, i) => { const k = i / s.trail.length; x.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${k * k * 0.75})`; x.beginPath(); x.arc(X(t[0]), Y(t[1]), (0.04 + k * 0.2) * sc, 0, 6.3); x.fill(); if (k > 0.55) { x.fillStyle = `rgba(255,246,214,${(k - 0.55) * 1.6})`; x.beginPath(); x.arc(X(t[0]), Y(t[1]), (k * 0.1) * sc, 0, 6.3); x.fill(); } }); }
    x.globalCompositeOperation = 'lighter';
    for (const s of B.shots) {
      const g = x.createRadialGradient(X(s.x), Y(s.y), 0, X(s.x), Y(s.y), 0.75 * sc); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, `rgba(${s.col[0]},${s.col[1]},${s.col[2]},.9)`); g.addColorStop(1, `rgba(${s.col[0]},${s.col[1]},${s.col[2]},0)`); x.fillStyle = g; x.beginPath(); x.arc(X(s.x), Y(s.y), 0.75 * sc, 0, 6.3); x.fill(); }
    for (const p of B.parts) { const k = p.life / p.max; if (p.k === 'flash') { const g = x.createRadialGradient(X(p.x), Y(p.y), 0, X(p.x), Y(p.y), p.s * sc); g.addColorStop(0, `rgba(255,250,225,${k})`); g.addColorStop(0.4, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${k * 0.8})`); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * sc, 0, 6.3); x.fill(); }
      else if (p.k === 'ember') { x.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${k})`; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * sc, 0, 6.3); x.fill(); }
      else if (p.k === 'ring') { x.strokeStyle = `rgba(255,240,210,${k * 0.8})`; x.lineWidth = 0.18 * sc * k; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * (1.1 + (1 - k) * 1.3) * sc, 0, 6.3); x.stroke(); } }
    x.globalCompositeOperation = 'source-over';
    for (const p of B.parts) { const k = p.life / p.max; if (p.k === 'smoke') { x.fillStyle = `rgba(245,238,230,${k * 0.5})`; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * (1.6 - k * 0.6) * sc, 0, 6.3); x.fill(); }
      else if (p.k === 'chunk') { x.save(); x.translate(X(p.x), Y(p.y)); x.rotate(p.rot + p.life * 6); x.fillStyle = '#8a6a5c'; x.strokeStyle = '#3a2530'; x.lineWidth = 1.5; x.globalAlpha = Math.min(1, k * 2); x.fillRect(-p.s * sc, -p.s * sc, p.s * 2 * sc, p.s * 2 * sc); x.strokeRect(-p.s * sc, -p.s * sc, p.s * 2 * sc, p.s * 2 * sc); x.restore(); } }
    for (const p of B.petals) { const px = ((p.x + B.time * 0.02 * p.s + B.wind * B.time * 0.004) % 1 + 1) % 1 * W, py = ((p.y + B.time * 0.03 * p.s) % 1) * H, a = B.time * 2 * p.s + p.p; x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = 'rgba(247,168,204,.85)'; x.beginPath(); x.ellipse(0, 0, 7 * p.s * dpr, 3.6 * p.s * dpr, 0, 0, 6.3); x.fill(); x.restore(); }
    if (n > 0.02) { x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgba(${Math.round(lerp(255, 132, n))},${Math.round(lerp(255, 128, n))},${Math.round(lerp(255, 196, n))},1)`; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
    if (n > 0.05) { x.globalCompositeOperation = 'lighter'; for (const p of B.props) if (p.lamp && p.gy !== undefined) { const lx = X(p.x), ly = Y(p.gy + 2.97), g = x.createRadialGradient(lx, ly, 0, lx, ly, 3.2 * sc); g.addColorStop(0, 'rgba(255,190,90,' + 0.75 * n + ')'); g.addColorStop(0.3, 'rgba(255,150,60,' + 0.3 * n + ')'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; x.beginPath(); x.arc(lx, ly, 3.2 * sc, 0, 6.3); x.fill(); } x.globalCompositeOperation = 'source-over'; }
    // ekran dışındaki rakibi gösteren ok
    { const o = B.act[1], ox = X(o.x); if (!o.dead && (ox > W - 30 || ox < 30)) { const right = ox > W / 2, ex = right ? W - 86 * dpr : 86 * dpr, ey = clamp(Y(o.y + 1), H * 0.22, H * 0.72), d = Math.round(Math.abs(o.x - B.act[0].x)), bw = 124 * dpr, bh = 40 * dpr;
      x.fillStyle = 'rgba(15,26,64,.9)'; x.strokeStyle = '#ef8a7a'; x.lineWidth = 2.5 * dpr; x.beginPath(); x.roundRect(ex - bw / 2, ey - bh / 2, bw, bh, bh / 2); x.fill(); x.stroke();
      x.fillStyle = '#fff6dc'; x.font = '700 ' + 17 * dpr + "px 'Alegreya Sans', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((right ? '' : '◀ ') + 'Rakip ' + d + ' m' + (right ? ' ▶' : ''), ex, ey + 1); } }
    // baş üstü: ad ve can; hasar sayıları
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const a of B.act) { if (a.dead) continue; const px = X(a.x), py = Y(a.y + 2.25), w = 1.7 * sc, h = Math.max(7, 0.2 * sc);
      x.fillStyle = 'rgba(15,26,64,.85)'; x.beginPath(); x.roundRect(px - w / 2 - 3, py - h / 2 - 3, w + 6, h + 6, h); x.fill(); x.fillStyle = '#f6efe0'; x.beginPath(); x.roundRect(px - w / 2, py - h / 2, w * a.shown / 100, h, h / 2); x.fill();
      x.fillStyle = a.me ? '#58d06a' : '#ef5b4d'; x.beginPath(); x.roundRect(px - w / 2, py - h / 2, w * a.hp / 100, h, h / 2); x.fill(); x.strokeStyle = '#e8b64c'; x.lineWidth = 2; x.beginPath(); x.roundRect(px - w / 2 - 3, py - h / 2 - 3, w + 6, h + 6, h); x.stroke();
      if (B.act[B.turn] === a && B.phase === 'aim') { const yy = py - h - 0.42 * sc + Math.sin(B.time * 5) * 0.08 * sc; x.fillStyle = '#ffe08a'; x.strokeStyle = '#0f1a40'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(px - 0.22 * sc, yy - 0.2 * sc); x.lineTo(px + 0.22 * sc, yy - 0.2 * sc); x.lineTo(px, yy + 0.12 * sc); x.closePath(); x.fill(); x.stroke(); } }
    for (const d of B.nums) { const k = d.t / 1.4, py = Y(d.y + k * 1.6), s = (d.crit ? 0.95 : 0.7) * sc * (k < 0.12 ? 0.6 + k * 3.4 : 1); x.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; x.font = `800 ${s}px 'Alegreya SC', Georgia, serif`; x.lineWidth = s * 0.16; x.strokeStyle = '#0f1a40'; x.lineJoin = 'round'; x.strokeText(String(d.v), X(d.x), py); x.fillStyle = d.crit ? '#ffd24a' : '#fff'; x.fillText(String(d.v), X(d.x), py); } x.globalAlpha = 1;
  }

  /* ---------- giriş/çıkış ---------- */
  const KEY = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', ' ': 'fire' };
  const onKey = dn => e => { if (!B || !B.on) return; const k = e.key.toLowerCase(), m = KEY[k]; if (m) { B.keys[m] = dn; e.preventDefault(); } else if (dn && k === '1') pick(0); else if (dn && k === '2') pick(1); else if (dn && k === 'escape') stop(); };
  const kd = onKey(true), ku = onKey(false);
  function iris(then) { const el = $('iris'); el.classList.add('on'); setTimeout(() => { then(); setTimeout(() => el.classList.remove('on'), 120); }, 430); }
  async function start() {
    if (B && B.on) return; ensureDom(); const api = EO2.api; if (EO2.dialog) EO2.dialog.close();
    iris(async () => {
      try { for (const s of ['temel', 'muhafiz']) if (!imgs['battle_' + s]) imgs['battle_' + s] = await load('assets/battle_' + s + '.webp'); } catch (e) { api.toast('Savaş kareleri yüklenemedi.'); return; }
      B = { on: true, keys: {} }; const art = EO2.art, E = api.W.E; B.poleL = art.bannerPole(E, '#213270').c; B.poleR = art.bannerPole(E, '#bb362f').c;
      setup(); $('battle').hidden = false; $('app').classList.add('fight'); if (EO2.audio) EO2.audio.battle(true); addEventListener('keydown', kd); addEventListener('keyup', ku);
      api.titleCard('Topçu Arenası', 'Gösterim düellosu');
    });
  }
  function stop() { if (!B || !B.on) return; iris(() => { B.on = false; $('battle').hidden = true; $('app').classList.remove('fight'); if (EO2.audio) EO2.audio.battle(false); removeEventListener('keydown', kd); removeEventListener('keyup', ku); EO2.api.titleCard(EO2.api.L.name, EO2.api.L.sub); }); }
  EO2.battle = { start, stop, active: () => !!(B && B.on), state: () => B };
  const wait = setInterval(() => { if (!EO2.api) return; clearInterval(wait); EO2.frameHooks.push(dt => { if (B && B.on && B.T) { update(dt); render(); } }); }, 80);
})();
