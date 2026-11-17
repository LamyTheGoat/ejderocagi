/* Ejder Ocağı 2.0 · Topçu savaş motoru
   Yandan görünüş, sırayla atış, rüzgâr, oyulan arazi. Atış hissi ilk gösterim düellosundan gelir (basılı tut, bırak; yörünge ipucu;
   kamera mermiyi izler). Kurallar eski oyunun Topçu kurallarıdır (js/minigame.js): can, nefes, öfke, beceriler ve bedelleri, zayıf
   nokta kritiği, tehlike bölgesi, boss fazları, düşman ve boss hasarları, zorluk çarpanları. Sayılar oradan aynen alınmıştır.
   Uzaklıklar eski oyunun piksel ölçüsüyle hesaplanır (PX: 1 dünya birimi = 53,125 eski piksel); atışın fiziği motorun kendisidir.

   Her karşılaşma bir ÖRNEKtir: EO2.battle.ac(cfg) bir maç kurar ve sonucu Promise ile verir. Tarafların hepsi aynı arayüzle sürülür:
   kontrol 'yerel' (bu oyuncu), 'yapay' (yerel rakip) ya da 'uzak' (ağdaki rakip; komutları EO2.battle.uzak() ile gelir).
   Ağ kodu burada yoktur; bağlantı noktaları: EO2.battle.dinle(fn) ile giden olaylar, EO2.battle.uzak(komut) ile gelen komutlar.
   Düşman ve boss davranışları ile çizimleri EO2.battle.MOB / EO2.battle.BOSS tablolarına kaydedilir (js/topcu_veri.js).
   Ödül burada yazılmaz (js/topcu.js: odulYaz). Karakterler chibi hattının pişmiş savaş kareleridir; onlara dokunulmaz. */
(function () {
  'use strict';
  const EO2 = window.EO2, $ = id => document.getElementById(id);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k, ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, rnd = (a, b) => a + Math.random() * (b - a);
  const PX = 53.125, FW = 64, FH = 30, TP = 40, MP = 8, MW = FW * MP, MH = FH * MP, G = 14, K = 1.7 / 270, RUZ = 1.3;
  const X_ = px => px / PX, Y_ = py => (1550 - py) / PX + 0.6, u = px => px / PX;      // eski oyunun pikselleri → dünya birimi
  const EL = { ates: [255, 150, 60], buz: [120, 200, 255], firtina: [200, 160, 240], toprak: [150, 210, 70], golge: [255, 120, 110], venom: [130, 220, 110], magma: [255, 110, 30], bluekor: [120, 190, 255], talim: [120, 200, 255] };
  let M = null;                                   // etkin maç (örnek)
  const imgs = {}, dinleyen = [];
  const load = src => imgs[src] ? Promise.resolve(imgs[src]) : new Promise(ok => { const i = new Image(); i.onload = () => { imgs[src] = i; ok(i); }; i.onerror = () => ok(null); i.src = src; });
  const yay = (olay, veri) => { for (const f of dinleyen) { try { f(olay, veri || {}, M); } catch (e) { console.error(e); } } };
  const ses = (k, a) => { const A = EO2.audio; if (A && A[k]) A[k](a); };

  /* ---------- beceriler: adlar, nefes bedelleri ve bekleme süreleri eski oyunla aynı (shm_ui.js toggleTopcuSkill) ---------- */
  const BECERI = {
    plus1: { ad: 'Ek Atış', a: 'Bir mermi daha', m: 25, grup: 1, ik: '<circle cx="9" cy="14" r="4"/><circle cx="17" cy="9" r="3"/>' },
    plus2: { ad: 'Üçlü Seri', a: 'Art arda üç mermi', m: 40, grup: 1, ik: '<circle cx="6" cy="16" r="3.2"/><circle cx="13" cy="11" r="3.2"/><circle cx="19" cy="6" r="2.6"/>' },
    trident: { ad: 'Üçlü Çatal', a: 'Üç yöne saçılır', m: 45, grup: 1, ik: '<path d="M4 20L12 9M12 9L7 4M12 9L12 3M12 9L18 5"/>' },
    heavy: { ad: 'Ağır Gülle', a: 'Hasar yarı yarıya artar', m: 35, ik: '<circle cx="12" cy="13" r="7"/><path d="M12 6V3M9 3h6"/>' },
    crater: { ad: 'Krater Güllesi', a: 'Dev çukur açar, kalkan deler', m: 30, ik: '<path d="M2 15h4l2 4h8l2-4h4"/><path d="M12 3v8M9 8l3 3 3-3"/>' },
    teleport: { ad: 'Kanat Uçuşu', a: 'Merminin düştüğü yere geçersin', m: 50, cd: 2, ik: '<path d="M3 17c5 0 8-3 9-9 1 6 4 9 9 9-4 1-7 0-9-3-2 3-5 4-9 3z"/>' },
    shield: { ad: 'Rün Kalkanı', a: 'İki darbeyi sönümler', m: 40, cd: 2, anlik: 1, ik: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>' },
    heal: { ad: 'Ocak İksiri', a: '450 can verir', m: 45, cd: 3, anlik: 1, ik: '<path d="M9 3h6M10 3v5l-4 8a3 3 0 003 4h6a3 3 0 003-4l-4-8V3"/>' },
    anchor: { ad: 'Demir Çapa', a: 'Dalga seni az iter, isabet artar', m: 20, cd: 2, anlik: 1, yalniz: 'donanma', ik: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M5 13c0 4 3 7 7 7s7-3 7-7M8 10h8"/>' },
    powUlt: { ad: 'Ejder Öfkesi', a: 'Öfke dolunca: üç dalga, büyük patlama', m: 0, ofke: 1, ik: '<path d="M12 2c2 4 6 6 6 11a6 6 0 01-12 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4 0-7 2-10z"/>' },
  };
  const BECERI_SIRA = ['plus1', 'plus2', 'trident', 'heavy', 'crater', 'teleport', 'shield', 'heal', 'anchor', 'powUlt'];

  /* ---------- arazi ---------- */
  const edgeK = x => ss(3, 7.5, x) * ss(61, 56.5, x), midK = x => ss(3, 17, x) * ss(61, 47, x);
  const topH = x => 2.4 + (7.3 + 1.1 * Math.sin(x * 0.21 + 1) + 0.5 * Math.sin(x * 0.63) - 4.4 * Math.exp(-Math.pow((x - 32) / 6.5, 2)) + 2.1 * Math.exp(-Math.pow((x - 21.5) / 3.1, 2)) + 2.5 * Math.exp(-Math.pow((x - 43) / 3.3, 2))) * edgeK(x);
  const botH = x => 7.2 - 5.6 * midK(x) - 1.5 * Math.abs(Math.sin(x * 1.13 + 2)) * midK(x) - 0.5 * Math.abs(Math.sin(x * 3.7));
  const TEMA = {
    talim: { g: ['#c9a383', '#a07e72', '#5d4a63'], bant: ['rgba(70,40,70,.16)', 'rgba(255,230,200,.10)'], cat: 'rgba(58,37,48,.28)', ust: ['#3f7d45', '#58a44e', '#9bdb6c'], ot: ['#8fd064', '#58a44e'], cizgi: '#3a2530', tas: ['#3aa0e8', '#7fd8ff'], duvar: 1, cicek: 1, oyuk: 'rgba(38,20,34,.78)', kirik: '#8a6a5c' },
    sirca: { g: ['#3a7a70', '#22485a', '#131d36'], bant: ['rgba(8,20,40,.22)', 'rgba(160,255,220,.08)'], cat: 'rgba(6,18,30,.4)', ust: ['#174f4a', '#2b9c7c', '#9af5d2'], ot: ['#7ff0c4', '#2b9c7c'], cizgi: '#081822', tas: ['#ffae3d', '#ffe6a6'], damar: 'rgba(110,255,200,.32)', oyuk: 'rgba(4,14,24,.8)', kirik: '#2f6a66' },
    kaldera: { g: ['#5a403a', '#33252a', '#160e14'], bant: ['rgba(0,0,0,.25)', 'rgba(255,170,110,.07)'], cat: 'rgba(10,4,6,.5)', ust: ['#2a1c1e', '#5c3a30', '#ff9a4a'], ot: null, cizgi: '#0c0608', tas: ['#ff6a2a', '#ffd070'], damar: 'rgba(255,120,40,.6)', oyuk: 'rgba(60,14,4,.82)', kirik: '#4a3230' },
    donanma: { g: ['#4a7f86', '#285064', '#10233a'], bant: ['rgba(4,16,34,.22)', 'rgba(180,250,255,.08)'], cat: 'rgba(4,16,30,.4)', ust: ['#1f5a66', '#3fa3a6', '#b4f5e6'], ot: ['#8fe8d8', '#3fa3a6'], cizgi: '#071622', tas: ['#ff7fa0', '#ffd6e0'], damar: 'rgba(120,230,255,.3)', oyuk: 'rgba(4,14,26,.8)', kirik: '#33707a' },
    guverte: { g: ['#8a5e3e', '#5e3d2a', '#2a1a1a'], bant: null, cat: 'rgba(20,8,6,.4)', ust: ['#3a2418', '#8a5e3c', '#e0b072'], ot: null, cizgi: '#180c0a', tahta: 1, oyuk: 'rgba(18,8,6,.85)', kirik: '#7a5236' },
    kervan: { g: ['#d39a62', '#aa7048', '#663c36'], bant: ['rgba(80,30,20,.16)', 'rgba(255,236,190,.12)'], cat: 'rgba(70,30,20,.3)', ust: ['#8a6434', '#bb9a52', '#f0d88e'], ot: ['#e0c878', '#bb9a52'], cizgi: '#3a2018', tas: ['#e8b64c', '#fff0b0'], oyuk: 'rgba(50,22,14,.8)', kirik: '#a06a48' },
  };
  function buildTerrain(spec) {
    if (spec.maske) { const c = document.createElement('canvas'); c.width = FW * TP; c.height = FH * TP; const mask = Uint8Array.from(spec.maske);
      const top = v => { const i = Math.floor(v * MP); if (i < 0 || i >= MW) return NaN; for (let j = MH - 1; j >= 0; j--) if (mask[j * MW + i]) return (j + 1) / MP; return NaN; };
      return { c, x: c.getContext('2d'), mask, top, Tm: TEMA[spec.tema] || TEMA.talim, delik: true }; }
    const Tm = TEMA[spec.tema] || TEMA.talim, ada = !!spec.ada, x0 = ada ? 3 : 0, x1 = ada ? 61 : FW, N = Math.round((x1 - x0) * 10) + 1, raw = new Float32Array(N), hs = new Float32Array(N);
    const tf = spec.top || topH; for (let i = 0; i < N; i++) { const v = tf(x0 + i / 10); raw[i] = v == null ? NaN : v; }
    // dik basamaklar yürünür yamaca döner (eski oyunda birim araziye doğrudan otururdu); boşluklar olduğu gibi kalır
    for (let i = 0; i < N; i++) { if (isNaN(raw[i]) || ada) { hs[i] = raw[i]; continue; } let s = 0, n = 0; for (let j = Math.max(0, i - 7); j <= Math.min(N - 1, i + 7); j++) if (!isNaN(raw[j])) { s += raw[j]; n++; } hs[i] = s / n; }
    const top = v => { const i = Math.round((v - x0) * 10); return i < 0 || i >= N ? NaN : hs[i]; }, bot = v => ada ? Math.min(botH(v), top(v) - 0.2) : -0.6;
    const runs = []; { let a = -1; for (let i = 0; i <= N; i++) { const ok = i < N && !isNaN(hs[i]); if (ok && a < 0) a = i; if (!ok && a >= 0) { runs.push([a, i - 1]); a = -1; } } }
    const c = document.createElement('canvas'); c.width = FW * TP; c.height = FH * TP; const x = c.getContext('2d'), Y = y => (FH - y) * TP, X = v => v * TP, V = i => x0 + i / 10;
    const path = () => { x.beginPath(); for (const [a, b] of runs) { x.moveTo(X(V(a)), Y(hs[a])); for (let i = a + 1; i <= b; i++) x.lineTo(X(V(i)), Y(hs[i])); for (let i = b; i >= a; i--) x.lineTo(X(V(i)), Y(bot(V(i)))); x.closePath(); } };
    const ust = (lw, col, dy) => { x.beginPath(); for (const [a, b] of runs) { x.moveTo(X(V(a)), Y(hs[a] + dy)); for (let i = a + 1; i <= b; i++) x.lineTo(X(V(i)), Y(hs[i] + dy)); } x.lineWidth = lw * TP; x.strokeStyle = col; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(); };
    let seed = spec.tohum || 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, rx = () => { for (let k = 0; k < 20; k++) { const v = x0 + 0.5 + r() * (x1 - x0 - 1); if (!isNaN(top(v))) return v; } return (x0 + x1) / 2; };
    path(); const g = x.createLinearGradient(0, Y(13), 0, Y(1)); g.addColorStop(0, Tm.g[0]); g.addColorStop(0.45, Tm.g[1]); g.addColorStop(1, Tm.g[2]); x.fillStyle = g; x.fill();
    x.save(); path(); x.clip();
    if (Tm.bant) for (let b = 0; b < 9; b++) { x.beginPath(); const y0 = 1.5 + b * 1.25; for (let v = 0; v <= FW; v += 0.5) { const yy = y0 + Math.sin(v * 0.4 + b) * 0.35 + Math.sin(v * 1.3 + b * 2) * 0.12; v === 0 ? x.moveTo(X(v), Y(yy)) : x.lineTo(X(v), Y(yy)); } x.lineWidth = TP * (0.18 + (b % 3) * 0.1); x.strokeStyle = Tm.bant[b % 2]; x.stroke(); }
    if (Tm.tahta) { // gemi güvertesi: kalaslar, ek yerleri, çiviler, bordada lombozlar
      for (let row = 0; row < 26; row++) { const yy = 13.4 - row * 0.5; x.fillStyle = row % 2 ? 'rgba(0,0,0,.10)' : 'rgba(255,220,170,.06)'; x.fillRect(0, Y(yy), FW * TP, 0.5 * TP); x.fillStyle = 'rgba(24,10,8,.55)'; x.fillRect(0, Y(yy) - 1, FW * TP, 2.5);
        for (let v = (row % 2) * 1.3 + r(); v < FW; v += 2.4 + r() * 0.8) { x.fillRect(X(v), Y(yy), 2.5, 0.5 * TP); x.fillStyle = 'rgba(255,220,160,.5)'; x.beginPath(); x.arc(X(v) + 7, Y(yy) + 0.25 * TP, 1.8, 0, 6.3); x.arc(X(v) - 6, Y(yy) + 0.25 * TP, 1.8, 0, 6.3); x.fill(); x.fillStyle = 'rgba(24,10,8,.55)'; } }
      for (const [a, b] of runs) for (let v = V(a) + 1.6; v < V(b) - 1; v += 2.6) { const cy = top(v) - 2.2; x.fillStyle = '#c99a4a'; x.beginPath(); x.arc(X(v), Y(cy), 0.44 * TP, 0, 6.3); x.fill(); x.fillStyle = '#12283c'; x.beginPath(); x.arc(X(v), Y(cy), 0.3 * TP, 0, 6.3); x.fill(); x.fillStyle = 'rgba(140,220,255,.35)'; x.beginPath(); x.arc(X(v) - 3, Y(cy) - 3, 0.1 * TP, 0, 6.3); x.fill(); } }
    x.strokeStyle = Tm.cat; x.lineWidth = 2; for (let i = 0; i < 90; i++) { const bx = x0 + r() * (x1 - x0), by = 1 + r() * 11; x.beginPath(); x.moveTo(X(bx), Y(by)); x.lineTo(X(bx + (r() - 0.5) * 0.5), Y(by - 0.3 - r() * 0.7)); x.lineTo(X(bx + (r() - 0.5) * 0.8), Y(by - 0.9 - r() * 0.6)); x.stroke(); }
    if (Tm.duvar) for (const [wx0, wx1, depth, rows] of [[9, 16.5, 1.2, 3], [27.5, 36, 0.9, 4], [45.5, 53, 1.3, 3], [18, 22, 3.4, 2], [40, 44.5, 3.8, 2]]) for (let row = 0; row < rows; row++) { let bx = wx0 + (row % 2) * 0.45 + r() * 0.2; while (bx < wx1) { const bw = 0.75 + r() * 0.55, by = top(bx + bw / 2) - depth - row * 0.52;
      x.fillStyle = ['#e9dcc6', '#dccbb2', '#efe4d2'][Math.floor(r() * 3)]; x.beginPath(); x.roundRect(X(bx), Y(by), bw * TP - 3, 0.48 * TP, 4); x.fill(); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(X(bx) + 3, Y(by) + 2, bw * TP - 9, 3); x.strokeStyle = 'rgba(58,37,48,.55)'; x.lineWidth = 2; x.beginPath(); x.roundRect(X(bx), Y(by), bw * TP - 3, 0.48 * TP, 4); x.stroke();
      if (r() < 0.12) { const cx = X(bx) + (bw * TP - 3) / 2, cy = Y(by) + 0.24 * TP, s = 0.14 * TP; x.save(); x.translate(cx, cy); x.fillStyle = '#2f7fc8'; x.fillRect(-s, -s, 2 * s, 2 * s); x.rotate(Math.PI / 4); x.fillRect(-s, -s, 2 * s, 2 * s); x.restore(); x.fillStyle = '#f7f1e2'; x.beginPath(); x.arc(cx, cy, s * 0.42, 0, 6.3); x.fill(); } bx += bw; } }
    if (Tm.damar) { x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 12; i++) { let vx = rx(), vy = top(vx) - 0.5 - r() * 2; x.beginPath(); x.moveTo(X(vx), Y(vy)); for (let k = 0; k < 6; k++) { vx += (r() - 0.5) * 1.6; vy -= 0.4 + r() * 0.9; x.lineTo(X(vx), Y(vy)); } x.strokeStyle = Tm.damar; x.lineWidth = 1.5 + r() * 2; x.lineJoin = 'round'; x.globalAlpha = 0.5; x.stroke(); x.lineWidth = 8; x.globalAlpha = 0.08; x.stroke(); x.globalAlpha = 1; } x.globalCompositeOperation = 'source-over'; }
    if (Tm.tas) for (let i = 0; i < 18; i++) { const cx = rx(), cy = Math.max(1.2, top(cx) - 1.2 - r() * 5); for (let k = 0; k < 3; k++) { x.fillStyle = Tm.tas[k ? 1 : 0]; x.beginPath(); const s = (0.16 + r() * 0.2) * TP, ox = (k - 1) * 0.2 * TP; x.moveTo(X(cx) + ox, Y(cy) - s * 1.5); x.lineTo(X(cx) + ox + s * 0.5, Y(cy)); x.lineTo(X(cx) + ox, Y(cy) + s * 0.4); x.lineTo(X(cx) + ox - s * 0.5, Y(cy)); x.closePath(); x.fill(); x.strokeStyle = 'rgba(10,20,50,.6)'; x.lineWidth = 1.5; x.stroke(); } }
    x.fillStyle = 'rgba(10,8,24,.3)'; for (const [a, b] of runs) for (let i = a; i <= b; i += 4) { x.beginPath(); x.arc(X(V(i)), Y(hs[i] - 0.72), 0.36 * TP, 0, 6.3); x.fill(); }
    ust(0.95, Tm.ust[0], 0); x.fillStyle = Tm.ust[0]; for (const [a, b] of runs) for (let i = a; i <= b; i += 4) { x.beginPath(); x.arc(X(V(i) + (r() - 0.5) * 0.1), Y(hs[i] - 0.44 - r() * 0.1), (0.2 + r() * 0.1) * TP, 0, 6.3); x.fill(); }
    ust(0.6, Tm.ust[1], 0.06); ust(0.2, Tm.ust[2], 0.13); x.restore();
    if (Tm.ot) for (const [a, b] of runs) for (let v = V(a) + 0.4; v < V(b) - 0.2; v += 0.16 + r() * 0.22) { const t = top(v), hgt = 0.14 + r() * 0.2; if (isNaN(t)) continue; x.beginPath(); x.moveTo(X(v - 0.07), Y(t - 0.03)); x.lineTo(X(v + (r() - 0.5) * 0.12), Y(t + hgt)); x.lineTo(X(v + 0.07), Y(t - 0.03)); x.closePath(); x.fillStyle = Tm.ot[r() > 0.5 ? 0 : 1]; x.fill();
      if (Tm.cicek && r() < 0.07) { x.fillStyle = ['#f7a8cc', '#fff', '#ffd76a'][Math.floor(r() * 3)]; x.beginPath(); x.arc(X(v), Y(t + hgt + 0.03), 3.6, 0, 6.3); x.fill(); } }
    path(); x.lineWidth = 3.2; x.strokeStyle = Tm.cizgi; x.lineJoin = 'round'; x.stroke();
    const mask = new Uint8Array(MW * MH); for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const wx = (i + 0.5) / MP, wy = (j + 0.5) / MP, t = top(wx); if (!isNaN(t) && wy < t && wy > bot(wx)) mask[j * MW + i] = 1; }
    return { c, x, mask, top, Tm };
  }
  const solid = (T, wx, wy) => { const i = Math.floor(wx * MP), j = Math.floor(wy * MP); return i >= 0 && j >= 0 && i < MW && j < MH && T.mask[j * MW + i] > 0; };
  /* Ortak savaşta (yoldaş varken) zemini yalnız adımın sahibi oyar ve yerini yayınlar ('oyuk'); öteki ekranlar aynı yerden oyar (yoldasOyuk). Böylece zemin her ekranda aynı kalır.
     Adımın sahibi: sırası gelen oyuncu; düşman sırasında düşmanın hedefi. */
  function carve(T, cx, cy, rad, uzak) { if (M && M.cfg && M.cfg.kirilmaz) return;   // kırılmaz zemin (ör. Şahmeran'ın defilesi): gülle çukur açmaz
    if (!uzak && M && M.on && M.cfg.ortak && T === M.T && M.yoldas && Object.keys(M.yoldas).length) { const a = M.aktif, sahip = a === M.ben || (a && a.takim === 1 && !a.yoldas && hedefT() === M.ben); if (!sahip) return;
      const q = v => Math.round(v * 100) / 100; cx = q(cx); cy = q(cy); rad = q(rad); yay('oyuk', { x: cx, y: cy, r: rad }); }
    const r2 = rad * rad; for (let j = Math.max(0, Math.floor((cy - rad) * MP)); j <= Math.min(MH - 1, Math.ceil((cy + rad) * MP)); j++) for (let i = Math.max(0, Math.floor((cx - rad) * MP)); i <= Math.min(MW - 1, Math.ceil((cx + rad) * MP)); i++) { const dx = (i + 0.5) / MP - cx, dy = (j + 0.5) / MP - cy; if (dx * dx + dy * dy < r2 && T.mask[j * MW + i] === 1) { T.mask[j * MW + i] = 0;   // 2 = kırılmaz hücre (blok haritada koyu gri): gülle açamaz
        if (T.delik && !(M.katman && M.katman.some(k => k.cv))) { T.x.fillStyle = 'rgb(9,12,26)'; T.x.beginPath(); T.x.arc((i + 0.5) / MP * TP, (FH - (j + 0.5) / MP) * TP, TP / MP * 0.85, 0, 6.3); T.x.fill(); } } }   // çizimi olmayan (blok haritada kırmızı) zeminde çukur koyu oyuk olarak görünür
    if (T.delik) { const sh = M.cfg.sahne; if (sh && M.katman) for (const k of M.katman) if (k.cv) { const g = k.cv.getContext('2d'); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx * sh.ppu, k.cv.height - (cy - (sh.taban || 0)) * sh.ppu, rad * sh.ppu, 0, 6.3); g.fill(); g.restore(); } return; }   // kırılabilir zemin katmanının resmi oyulur: arkadaki katmanlar görünür
    const x = T.x, px = cx * TP, py = (FH - cy) * TP; x.save(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); for (let a = 0; a <= 6.3; a += 0.3) { const rr = rad * TP * (0.94 + Math.sin(a * 5 + cx) * 0.06); a === 0 ? x.moveTo(px + rr, py) : x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } x.closePath(); x.fill();
    x.globalCompositeOperation = 'source-atop'; const g = x.createRadialGradient(px, py, rad * TP * 0.9, px, py, rad * TP * 1.45); g.addColorStop(0, T.Tm.oyuk); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad * TP * 1.45, 0, 6.3); x.fill();
    x.lineWidth = 3; x.strokeStyle = T.Tm.cizgi; x.beginPath(); x.arc(px, py, rad * TP * 0.99, 0, 6.3); x.stroke(); x.restore();
  }
  const groundBelow = (T, wx, fromY) => { for (let y = fromY; y > -1; y -= 1 / MP) if (solid(T, wx, y)) return (Math.floor(y * MP) + 1) / MP; return null; };
  const yerY = wx => { const g = groundBelow(M.T, wx, FH - 1); return g == null ? 0 : g; };

  /* ---------- talim alanının uzak planı: bir kez çizilir (zindanlarda eski oyunun kendi arka plan çizimi kullanılır) ---------- */
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
  let talimBg = null, talimProps = null, poles = null;

  /* ---------- arayüz ---------- */
  function ensureDom() {
    if ($('tpSavas')) return; const I = EO2.icons || {}, el = document.createElement('div'); el.id = 'tpSavas'; el.hidden = true;
    const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    el.innerHTML = '<canvas id="tpCv" aria-label="Topçu meydanı"></canvas>' +
      '<div class="tp-plk tp-ben cam"><canvas class="tp-yuz" id="tpYuz" width="112" height="112"></canvas><div class="tp-plk-ic"><b id="tpAd"></b><div class="tp-can"><i id="tpCan2"></i><i id="tpCan"></i><em id="tpCanN"></em></div>' +
      '<div class="tp-ince"><span title="Nefes: yürümek ve beceriler bunu harcar"><i id="tpNefes"></i></span><span class="ofke" title="Öfke: dolunca Ejder Öfkesi açılır"><i id="tpOfke"></i></span></div><div class="tp-rozet"><span id="tpKalkan" hidden></span><span id="tpAnka" title="Anka Külü: canın bitince bir kez dirilirsin"></span></div></div></div>' +
      '<div class="tp-plk tp-hedef cam" id="tpHedef"><div class="tp-plk-ic"><b id="tpHAd"></b><small id="tpHAlt"></small><div class="tp-can kirmizi"><i id="tpHCan2"></i><i id="tpHCan"></i><em id="tpHCanN"></em></div><div class="tp-rozet"><span id="tpHKalkan" hidden></span><span id="tpHFaz" hidden></span></div></div><canvas class="tp-yuz" id="tpHYuz" width="112" height="112"></canvas></div>' +
      '<div class="tp-sira cam"><span id="tpTur"></span><b id="tpSure">25</b><span id="tpKim"></span></div>' +
      '<div class="tp-ruzgar cam" title="Rüzgâr"><span class="wi">' + (I.wind || '') + '</span><div id="tpRuzC"><i></i><i></i><i></i><i></i><i></i><i></i></div><b id="tpRuzT"></b></div>' +
      '<div class="tp-asama cam" id="tpAsama" hidden></div><canvas id="tpHarita" class="cam" width="384" height="72" aria-label="Meydan haritası"></canvas>' +
      '<div class="tp-konsol cam"><div class="tp-aci"><svg viewBox="0 0 100 62" aria-hidden="true"><path d="M8 56A42 42 0 0 1 92 56" fill="none" stroke="rgba(195,205,234,.35)" stroke-width="6" stroke-linecap="round"/><line id="tpIbre" x1="50" y1="56" x2="50" y2="18" stroke="#ffe08a" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="56" r="5" fill="#e8b64c"/></svg><b id="tpAci">45°</b></div>' +
      '<div class="tp-guc"><label>Güç <small id="tpIpucu"></small></label><div class="tp-cubuk"><i id="tpGuc"></i><u id="tpSon"></u></div></div>' +
      '<div class="tp-beceri" id="tpBeceri" role="toolbar" aria-label="Beceriler"></div></div>' +
      '<div class="tp-bilgi cam" id="tpBilgi" hidden></div>' +
      '<button type="button" class="tp-cik cam" id="tpCik" title="Ayrıl (Esc)" aria-label="Savaştan ayrıl">' + (I.close || '×') + '</button>' +
      '<div class="tp-pad tp-pad-l"><button type="button" id="tpSol" aria-label="Sola yürü">' + (I.left || '◂') + '</button><button type="button" id="tpSag" aria-label="Sağa yürü" class="cevir">' + (I.left || '▸') + '</button></div>' +
      '<div class="tp-pad tp-pad-r"><div><button type="button" id="tpYuk" aria-label="Açıyı artır" class="yukari">' + (I.left || '▴') + '</button><button type="button" id="tpAsg" aria-label="Açıyı azalt" class="asagi">' + (I.left || '▾') + '</button></div><button type="button" id="tpAtes" aria-label="Basılı tut, bırak: ateş"><b>ATEŞ</b></button></div>' +
      '<div id="tpPankart" aria-live="polite"><b></b><span></span></div>' +
      '<div class="tp-balon cam" id="tpBalon" hidden><small></small><p></p></div>' +
      '<div class="tp-laf cam" id="tpLaf" hidden><p></p><div><button type="button" class="gbtn" data-laf="rage">Öfkeyle kükre<small>+20 öfke</small></button><button type="button" class="gbtn" data-laf="focus">Açığını yakala<small>zayıf noktaya +%50</small></button><button type="button" class="gbtn" data-laf="shield">Siper al<small>+1 kalkan, +25 nefes</small></button></div></div>';
    $('app').appendChild(el);
    $('tpBeceri').innerHTML = BECERI_SIRA.map((k, i) => '<button type="button" data-b="' + k + '" aria-pressed="false" title="' + BECERI[k].ad + ' · ' + BECERI[k].a + (i < 9 ? ' (' + (i + 1) + ')' : ' (0)') + '">' + svg(BECERI[k].ik) + '<em></em></button>').join('');
    $('tpBeceri').querySelectorAll('button').forEach(b => { b.addEventListener('click', () => beceri(M && M.ben, b.dataset.b)); const goster = () => bilgi(b.dataset.b); b.addEventListener('pointerenter', goster); b.addEventListener('focus', goster); b.addEventListener('pointerleave', () => bilgi(null)); b.addEventListener('blur', () => bilgi(null)); });
    $('tpCik').addEventListener('click', () => { if (M && M.on && M.cikis) M.cikis(); });
    const hold = (id, k) => { const b = $(id), dn = e => { e.preventDefault(); if (M) M.keys[k] = true; }, up = () => { if (M) M.keys[k] = false; }; b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); b.addEventListener('contextmenu', e => e.preventDefault()); };
    hold('tpSol', 'left'); hold('tpSag', 'right'); hold('tpYuk', 'up'); hold('tpAsg', 'down'); hold('tpAtes', 'fire');
    $('tpLaf').querySelectorAll('[data-laf]').forEach(b => b.addEventListener('click', () => lafCevap(b.dataset.laf)));
    // dokunarak ya da fareyle nişan: tuvalde sürükle; namlu parmağı izler, karakter o yöne döner
    const cv = $('tpCv'); let nisan = false;
    const nis = e => { if (!M || !M.on || M.faz !== 'nisan' || M.aktif !== M.ben || M.ben.kontrol !== 'yerel' || M.charging) return; const r = cv.getBoundingClientRect(), V = M.view; if (!V) return; const wx = (e.clientX - r.left) / r.width * V.W, wy = (e.clientY - r.top) / r.height * V.H, a = M.ben;
      const dx = (wx - V.X(a.x)) / V.sc, dy = -(wy - V.Y(a.y + 1.0)) / V.sc; if (Math.hypot(dx, dy) < 0.5) return; if (Math.abs(dx) > 0.35) a.face = dx > 0 ? 1 : -1; a.angle = clamp(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI, -10, 70); };
    cv.addEventListener('pointerdown', e => { nisan = true; try { cv.setPointerCapture(e.pointerId); } catch (_) { } nis(e); }); cv.addEventListener('pointermove', e => { if (nisan) nis(e); }); const birak = () => { nisan = false; }; cv.addEventListener('pointerup', birak); cv.addEventListener('pointercancel', birak);
  }
  function bilgi(k) { const el = $('tpBilgi'); el.classList.remove('uzun'); if (M) M.ipucuT = 0; if (!k || !M) { el.hidden = true; return; } const B = BECERI[k], a = M.ben, cd = a.cd[k] || 0; el.hidden = false;
    el.innerHTML = '<b>' + B.ad + '</b><span>' + B.a + '</span><em>' + (B.ofke ? 'Öfke ' + Math.round(a.rage) + ' / 100' : B.m + ' nefes' + (B.cd ? ' · ' + B.cd + ' tur bekler' : '')) + (cd > 0 ? ' · ' + cd + ' tur sonra' : '') + '</em>'; }
  function ipucu(bas, metin) { if (!M) return; const el = $('tpBilgi'); el.hidden = false; el.classList.add('uzun'); el.innerHTML = '<b></b><span></span>'; el.firstChild.textContent = bas; el.lastChild.textContent = metin; M.ipucuT = 7; }
  const pankart = (t, s, cls) => { const el = $('tpPankart'); el.className = cls || ''; el.querySelector('b').textContent = t; el.querySelector('span').textContent = s || ''; void el.offsetWidth; el.classList.add('on'); };
  const yazi = (x, y, v, o) => { M.nums.push(Object.assign({ x, y, t: 0, v }, o || {})); };
  function balon(a, metin, ust, sure) { const el = $('tpBalon'); el.hidden = false; el.querySelector('small').textContent = ust || a.ad; el.querySelector('p').textContent = metin; M.balon = { a, t: sure || 2.6 }; }

  /* ---------- kurulum ---------- */
  const mkTopcu = o => Object.assign({ tur: 'topcu', takim: 0, kontrol: 'yapay', x: 0, y: 0, vy: 0, face: 1, hp: 1350, max: 1350, shown: 1350, angle: 40, set: 'temel', t: 0, ph: 0, fall: false, dead: false, hurtT: 0, fireT: 9, lastPower: -1,
    sta: 125, staMax: 125, rage: 40, shield: 0, revive: 1, dmg: 210, el: 'ates', el2: null, crit: 0, cd: { teleport: 0, shield: 0, heal: 0, anchor: 0 }, mods: {}, capa: 0, ad: '', col: EL.ates }, o);
  const mkYaratik = o => Object.assign({ tur: 'mob', takim: 1, x: 0, y: 0, vy: 0, hp: 600, max: 600, shown: 600, dead: false, olu: 0, hurtT: 0, anim: 'idle', animT: 0, face: -1, chill: 0, ad: '', h: 2.1, lunge: 0 }, o);
  /* karakter görünüşü (saç, göz): katman sayfaları üst üste çizilip hazır olunca topçuya giydirilir (js/gorunum.js savas); özgün görünüşte bir şey yapılmaz */
  function gorGiy(a, kod) { const g = EO2.gorunum; if (!g || !g.savas || !kod || a.gorKod === kod) return; a.gorKod = kod; const m0 = M, set0 = a.set0 || a.set; a.set0 = set0;
    g.savas(set0, kod).then(r => { if (!r || M !== m0 || !M.on || a.gorKod !== kod) return; imgs['assets/battle_' + r.ad + '.webp'] = r.cv; a.set = r.ad; }).catch(() => { }); }
  async function ac(cfg) {
    if (M && M.on) kapat(true); ensureDom(); const api = EO2.api, T = buildTerrain(cfg.arazi);
    const setler = new Set(['temel']); if (cfg.oyuncu && cfg.oyuncu.set) setler.add(cfg.oyuncu.set); if (cfg.rakip && cfg.rakip.set) setler.add(cfg.rakip.set);
    const bek = []; for (const s of setler) bek.push(load('assets/battle_' + s + '.webp')); if (cfg.bg) bek.push(load(cfg.bg)); if (cfg.sahne) for (const k of cfg.sahne.katman) bek.push(load(k.src));
    const tipler = [...(cfg.moblar || []).map(m => MOB[m.tip]), cfg.boss ? BOSS[cfg.boss.tip] : null].filter(Boolean); for (const t of tipler) for (const k in t.spr) if (typeof t.spr[k] === 'string' && /\.webp$/.test(t.spr[k])) bek.push(load(t.spr[k])); for (const p of (cfg.props || [])) if (PROP[p.tip] && PROP[p.tip].im) bek.push(load(PROP[p.tip].im));
    await Promise.all(bek);
    const katman = cfg.sahne ? cfg.sahne.katman.map(k => { const im = imgs[k.src]; if (!im) return null; const o = { im, z: k.z, zemin: k.zemin }; if (k.zemin === 'kirilir') { o.cv = document.createElement('canvas'); o.cv.width = im.naturalWidth; o.cv.height = im.naturalHeight; o.cv.getContext('2d').drawImage(im, 0, 0); } return o; }).filter(Boolean) : null;
    if (!cfg.bg && !cfg.sahne && !talimBg) { talimBg = buildBackdrop(); talimProps = buildProps(); const art = EO2.art, E = api.W.E; poles = [art.bannerPole(E, '#213270').c, art.bannerPole(E, '#bb362f').c]; }
    M = { on: true, cfg, T, katman, time: 0, tur: 1, faz: 'giris', pt: 0, timer: 25, wind: 0, charge: 0, charging: false, shots: [], parts: [], nums: [], bolge: [], lav: [], isin: [], dalga: [], zaman: [], shake: 0, stop: 0, over: false, keys: {}, cam: { x: 32, y: 12, z: 0.5 },
      act: [], props: [], sira: [], si: -1, aktif: null, ist: { hasar: 0, tur: 1, kritik: 0, kombo: 0, enKombo: 0, mob: 0 }, ortam: Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 0.8, p: Math.random() * 6 })), tick: 0 };
    M.sonuc = new Promise(res => { M.bitir = res; }); M.deniz = cfg.deniz != null ? Y_(cfg.deniz) : null; M.cikis = cfg.cikis || null; M.ruzgarSirasi = cfg.ruzgar || null;
    const O = cfg.oyuncu || {}, pset = imgs['assets/battle_' + O.set + '.webp'] ? O.set : 'temel';
    const P = mkTopcu(Object.assign({}, O, { takim: 0, kontrol: 'yerel', set: pset, x: X_(cfg.x0 || 460), face: cfg.yon || 1, ben: true, col: EL[O.el] || EL.ates })); P.shown = P.hp = P.max = O.hp || 1350; P.sta = P.staMax = O.sta || 125; M.ben = P; M.act.push(P); gorGiy(P, O.gor != null ? O.gor : (EO2.gorunum && EO2.gorunum.kod ? EO2.gorunum.kod() : ''));
    if (cfg.rakip) { const R = cfg.rakip, E = mkTopcu(Object.assign({}, R, { takim: 1, set: imgs['assets/battle_' + R.set + '.webp'] ? R.set : 'temel', x: X_(R.x || 2480), face: -(cfg.yon || 1), angle: 45, col: EL[R.el] || EL.talim })); E.shown = E.hp = E.max = R.hp || 1350; M.act.push(E); M.rakip = E; gorGiy(E, R.gor); }
    for (const m of (cfg.moblar || [])) { const D = MOB[m.tip] || {}; const e = mkYaratik(Object.assign({ tip: m.tip, D, h: D.h || 2.1, ucan: !!D.ucan, el: D.el || 'venom' }, m, { x: X_(m.x) })); e.shown = e.hp = e.max = m.hp; M.act.push(e); }
    if (cfg.boss) { const D = BOSS[cfg.boss.tip] || {}; const b = mkYaratik(Object.assign({ tur: 'boss', D, h: D.h || 6.8, faz: 1, kalkan: 0, sersem: 0, kiyamet: 0 }, cfg.boss, { x: X_(cfg.boss.x) })); b.shown = b.hp = b.max = cfg.boss.hp; M.act.push(b); M.boss = b; }
    for (const a of M.act) { if (a.ucan && a.yW != null) a.y = a.yW; else if (a.ucan && a.yuk != null) a.y = Y_(a.yuk); else if (a.tur === 'boss' && a.D.suda) a.y = Y_(a.D.suda); else a.y = groundBelow(T, a.x, FH - 1) || 8; }
    for (const p of (cfg.props || [])) { const x = X_(p.x); M.props.push(Object.assign({ x, y: groundBelow(T, x, FH - 1) || 8, dead: false }, PROP[p.tip] || {}, p, { x })); }
    M.sira = cfg.ilkRakip && M.rakip ? [M.rakip, P] : [P, ...M.act.filter(a => a !== P)]; M.uzakKuyruk = []; M.hedef = M.boss || M.rakip || null;
    if (M.boss && M.boss.D.kur) M.boss.D.kur(M.boss, API);
    $('tpAd').textContent = P.ad || 'Topçu'; api.drawPortrait($('tpYuz'), P.set0 || P.set, 0.66, O.gor != null ? O.gor || undefined : true); kurHedef();
    $('tpBeceri').querySelectorAll('button').forEach(b => { const B = BECERI[b.dataset.b]; b.hidden = !!(B.yalniz && B.yalniz !== cfg.arazi.aile); });
    $('tpAsama').hidden = !cfg.asama; if (cfg.asama) $('tpAsama').innerHTML = '<small>' + cfg.asama.ad + '</small>' + Array.from({ length: cfg.asama.n }, (_, i) => '<i class="' + (i < cfg.asama.i ? 'tamam' : i === cfg.asama.i ? 'simdi' : '') + '"></i>').join('');
    $('tpBalon').hidden = true; $('tpLaf').hidden = true; $('tpBilgi').hidden = true; $('tpIpucu').textContent = matchMedia('(pointer: coarse)').matches ? 'ATEŞ\'e basılı tut, bırak' : 'Space basılı tut, bırak';
    yeniRuzgar(); hudCache = {}; hud(true);
    $('tpSavas').hidden = false; $('tpSavas').className = 'tema-' + (cfg.arazi.aile || cfg.arazi.tema); $('app').classList.add('fight'); ses('battle', true); addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    pankart(cfg.baslik || 'Düello', cfg.alt || '', 'big'); ses('turn'); yay('mac_basla', { kimlik: cfg.kimlik, ruzgar: M.wind });
    if (M.boss) sonra(0.5, () => { M.shake = Math.max(M.shake, 0.5); ses('whoosh'); ses('boom', 0.3); halka(M.boss.x, M.boss.y + M.boss.h * 0.55, 3, EL[M.boss.D.el || 'venom']); if (M.boss.D.giris) balon(M.boss, M.boss.D.giris, null, 3.2); });
    return M.sonuc;
  }
  function kurHedef() { const h = M.hedef, el = $('tpHedef'); el.hidden = !h; if (!h) return; $('tpHAd').textContent = h.ad; $('tpHAlt').textContent = h.unvan || ''; const cv = $('tpHYuz'), x = cv.getContext('2d'); x.clearRect(0, 0, 112, 112);
    if (h.tur === 'topcu') EO2.api.drawPortrait(cv, h.set0 || h.set, 0.66, h.gorKod || undefined); else { const im = imgs[h.D.yuz || h.D.spr.idle]; if (im) { const k = h.D.yuzK || [0.5, 0.22, 0.42], s = im.naturalWidth * k[2]; x.drawImage(im, im.naturalWidth * k[0] - s / 2, im.naturalHeight * k[1] - s / 2, s, s, 0, 0, 112, 112); } } }
  function yeniRuzgar(deger) { M.wind = deger != null ? deger : Math.round((Math.random() * 4.6 - 2.3) * 10) / 10; const n = Math.round(Math.abs(M.wind) * 2.6), bars = $('tpRuzC').children; for (let i = 0; i < 6; i++) bars[i].className = i < n ? 'on' : ''; $('tpRuzC').style.transform = M.wind < 0 ? 'scaleX(-1)' : ''; $('tpRuzT').textContent = Math.abs(M.wind) < 0.05 ? 'Durgun' : Math.abs(M.wind).toFixed(1).replace('.', ',') + (M.wind > 0 ? ' →' : ' ←'); }
  const sonra = (sn, fn) => { M.zaman.push({ t: M.time + sn, fn }); };
  const halka = (x, y, s, col) => { M.parts.push({ k: 'ring', x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, s, col }); };
  const toz = (x, y, n, col) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = 2 + Math.random() * 7; M.parts.push({ k: 'ember', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 2, life: 0.5 + Math.random() * 0.7, max: 1.2, s: 0.07, col: col || EL.ates }); } };

  /* ---------- beceri ---------- */
  function beceri(a, k) {
    if (!M || !a || M.over || M.faz !== 'nisan' || M.aktif !== a || M.charging) return; const B = BECERI[k]; if (!B || (B.yalniz && B.yalniz !== M.cfg.arazi.aile)) return;
    const uyar = t => { yazi(a.x, a.y + 2.6, t, { kucuk: 1, col: '#ffb0a0' }); ses('pop'); };
    if ((a.cd[k] || 0) > 0) return uyar(a.cd[k] + ' tur bekle');
    if (k === 'powUlt') { if (a.rage < 100) return uyar('Öfke dolmadı'); a.mods.powUlt = !a.mods.powUlt; ses(a.mods.powUlt ? 'chime' : 'ui'); if (a.mods.powUlt) pankart('Ejder Öfkesi', 'hazır', 'hit'); return hud(true); }
    if (B.anlik) { if (a.sta < B.m) return uyar('Nefes yetmiyor'); a.sta -= B.m; a.cd[k] = B.cd;
      if (k === 'shield') { a.shield = 2; yazi(a.x, a.y + 2.7, 'Rün Kalkanı', { col: '#ffe08a' }); halka(a.x, a.y + 0.9, 1.1, [255, 224, 138]); ses('chime'); }
      else if (k === 'heal') { a.hp = Math.min(a.max, a.hp + 450); yazi(a.x, a.y + 2.7, '+450', { col: '#8ff0a4', crit: 1 }); toz(a.x, a.y + 1, 14, [143, 240, 164]); ses('chirp'); yay('can', { kim: 0, hp: a.hp, max: a.max }); }
      else if (k === 'anchor') { a.capa = 1; a.capaBonus = 0.25; yazi(a.x, a.y + 2.7, 'Çapa atıldı', { col: '#7fe8d8' }); ses('splash'); }
      return hud(true); }
    if (a.mods[k]) { a.mods[k] = false; a.sta = Math.min(a.staMax, a.sta + B.m); ses('ui'); return hud(true); }
    let iade = 0; if (B.grup) for (const g of BECERI_SIRA) if (BECERI[g].grup === B.grup && g !== k && a.mods[g]) iade += BECERI[g].m;
    if (a.sta + iade < B.m) return uyar('Nefes yetmiyor');
    if (B.grup) for (const g of BECERI_SIRA) if (BECERI[g].grup === B.grup && g !== k) a.mods[g] = false;
    a.sta = Math.min(a.staMax, a.sta + iade) - B.m; a.mods[k] = true; ses('pop'); hud(true);
  }

  /* ---------- atış ---------- */
  function muzzleOf(a) { const m = window.EO2_BATTLE.sets[a.set], q = clamp(Math.round(a.angle / 5) * 5, -10, 70), mz = m.muzzle[q] || [150, 150]; return [a.x + a.face * mz[0] * K, a.y + mz[1] * K]; }
  /* eski firePlayerVolley: dalga sayısı, saçılma, hasar çarpanları ve patlama yarıçapı aynı */
  function ates(a, power, uzak) {
    const md = a.mods, pow = !!md.powUlt, dalga = pow ? 3 : 1 + (md.plus1 ? 1 : 0) + (md.plus2 ? 2 : 0), sac = md.trident ? [-6, 0, 6] : [0], sp = 8.5 + power * 19.5;
    const capaK = 1 + (a.capaBonus || 0), dmg = Math.round(a.dmg * (md.heavy ? 1.5 : 1) * (pow ? 1.65 : 1) * capaK), patlama = Math.round((md.crater ? 88 : 54) * (pow ? 1.35 : 1));
    const fir = a.el === 'firtina' || a.el2 === 'firtina', top = a.el === 'toprak' || a.el2 === 'toprak', isin = { teleport: !!md.teleport, pow, delici: !!md.crater || !!a.parilti, aci: Math.round(a.angle) };
    if (a.capaBonus) { yazi(a.x, a.y + 3, 'Çapa: +%25 isabet', { kucuk: 1, col: '#7fe8d8' }); a.capaBonus = 0; }
    if (md.teleport) a.cd.teleport = 2; if (pow) { a.rage = 0; M.flash = 0.5; pankart('Ejder Öfkesi!', '', 'hit'); ses('whoosh'); }
    const base = a.angle, face = a.face;
    const salla = w => { if (!M || !M.on || a.dead) return; const mz = muzzleOf(a); for (const d of sac) { const ang = (base + d) * Math.PI / 180;
        M.shots.push({ x: mz[0], y: mz[1], vx: Math.cos(ang) * sp * face, vy: Math.sin(ang) * sp, by: a, takim: a.takim, col: a.col, el: a.el, dmg: Math.round(dmg / (md0.trident ? 1.45 : 1)), patlama, r: patlama / 54 * 1.5 * (top ? 1.5 : 1), t: 0, trail: [], ruz: fir ? 0.5 : 1,
          teleport: isin.teleport && w === 0 && d === 0, pow, delici: isin.delici, aci: isin.aci, yildirim: fir && base + d >= 60, lav: a.el === 'ates' || a.el2 === 'ates', ayaz: a.el === 'buz' || a.el2 === 'buz', uzak: !!uzak }); }
      a.fireT = 0; M.shake = Math.max(M.shake, pow ? 0.7 : 0.35);
      M.parts.push({ k: 'flash', x: mz[0], y: mz[1], vx: 0, vy: 0, life: 0.14, max: 0.14, s: pow ? 2.4 : 1.5, col: a.col }, { k: 'ring', x: mz[0], y: mz[1], vx: 0, vy: 0, life: 0.28, max: 0.28, s: pow ? 1.5 : 0.9, col: a.col });
      for (let i = 0; i < 10; i++) M.parts.push({ k: 'smoke', x: mz[0], y: mz[1], vx: face * (1 + Math.random() * 3) + (Math.random() - 0.5), vy: Math.random() * 1.6, life: 0.7 + Math.random() * 0.5, max: 1.2, s: 0.3 + Math.random() * 0.3 });
      M.parts.push({ k: 'flash', x: mz[0], y: mz[1], vx: 0, vy: 0, life: 0.14, max: 0.14, s: pow ? 2.2 : 1.5, col: a.col }); ses('fire'); };
    const md0 = Object.assign({}, md); a.lastPower = power; salla(0); for (let w = 1; w < dalga; w++) sonra(w * 0.18, () => salla(w));
    M.bekle = (dalga - 1) * 0.18 + 0.05; a.mods = {}; M.faz = 'ucus'; M.pt = 0; if (a.takim === 0) { M.ist.tur++; M.ist.kombo = 0; } hud(true);
    if (!uzak) yay('ates', { kim: a.takim, x: a.x, y: a.y, aci: Math.round(base), guc: power, yon: face, el: a.el, hasar: dmg, mod: md0, tur: M.tur });
  }
  /* ortak savaşta (cfg.ortak) düşman hamlelerinin rastgeleliği sunucunun verdiği tohumdan gelir: bütün ekranlarda aynı saçılma */
  const R = () => { if (!M || !M.cfg.ortak || !M.tohum) return Math.random(); let t = (M.tohum = (M.tohum + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hedefT = () => (M.cfg.ortak && M.hedefT && !M.hedefT.dustuKesin ? M.hedefT : M.ben), turNo = () => (M.cfg.ortak ? M.tur : M.ist.tur);
  /* düşman ve boss mermisi: hedefe düşecek biçimde atılır; eski oyundaki saçılma (±47,5 piksel + rüzgâr×12) aynı */
  function nisanliAt(by, sx, sy, tx, ty, dmg, el, patlama, o) {
    o = o || {}; const sac = o.kesin ? 0 : u((R() - 0.5) * 95 + M.wind * 12), Tt = o.sure || 1.2, w = M.wind * RUZ, dx = tx + sac - sx, dy = ty - sy;
    M.shots.push(Object.assign({ x: sx, y: sy, vx: dx / Tt - 0.5 * w * Tt, vy: dy / Tt + 0.5 * G * Tt, by, takim: 1, col: EL[el] || EL.venom, el, dmg, patlama: patlama || 44, r: (patlama || 44) / 54 * 1.3, t: 0, trail: [], ruz: 1, dusman: true }, o)); ses('fire');
  }
  function meteor(b, p, n, dmg, el, patlama) { for (let i = 0; i < n; i++) { const tx = clamp(p.x + u((i - (n - 1) * 0.5) * 105 + (R() - 0.5) * 36), 3, FW - 3), sx = tx + u(b.x > p.x ? 260 : -260), sy = Math.min(FH + 2, p.y + u(680 + i * 55)); nisanliAt(b, sx, sy, tx, p.y + u(24), dmg, el, patlama, { sure: 1.0 + i * 0.14, kesin: true, gok: true }); } }

  /* hasar: oyuncuya (eski detonateProjectile / tehlike bölgesi) */
  function hasarTopcu(a, dmg, o) { if (a.dustuKesin) return 0;   /* ortak savaşta düşmüş oyuncu arenada durur ama hasar almaz */
    o = o || {}; if (a.dead || a.yoldas) return 0;   // yoldaşın canını kendi ekranı hesaplar ve bildirir
    if (a.shield > 0 && !o.delici) { dmg = Math.round(dmg * (o.kalkanK || 0.40)); a.shield--; yazi(a.x, a.y + 3.1, 'Kalkan sönümledi', { kucuk: 1, col: '#ffe08a' }); }
    dmg = Math.max(1, Math.round(dmg)); a.hp = Math.max(0, a.hp - dmg); a.rage = Math.min(100, a.rage + 18); a.hurtT = 0.55; M.shake = Math.max(M.shake, 0.5);
    if (o.it) { a.vy = 3 + o.it * 2; a.fall = true; a.kx = o.yon * (1 + o.it * 2.2); }
    yazi(a.x, a.y + 2.3, dmg, { crit: !!o.crit, col: a.ben ? '#ff9a8a' : null }); ses('hit'); if (a.ben || a.kontrol !== 'uzak') yay('can', { kim: a.takim, hp: a.hp, max: a.max }); return dmg;
  }
  function hasarMob(e, dmg, o) { o = o || {}; dmg = Math.max(1, Math.round(dmg)); if (!M.uzakHasar) yay('dusman_hasar', { i: M.act.indexOf(e), h: Math.min(dmg, Math.max(0, e.hp)) }); e.hp -= dmg; e.hurtT = 0.5; e.anim = 'hit'; e.animT = 0.45; M.stop = Math.max(M.stop, dmg >= 220 || o.crit ? 0.13 : 0.08);
    if (e.hp <= 0) { M.stop = Math.max(M.stop, 0.18); M.flash = Math.max(M.flash, 0.22); toz(e.x, e.y + e.h * 0.5, 26, EL[e.el] || EL.venom); halka(e.x, e.y + e.h * 0.5, e.h * 0.9, [255, 244, 214]); } if (!M.uzakHasar) { M.ist.hasar += dmg; M.ben.rage = Math.min(100, M.ben.rage + 14); } yazi(e.x, e.y + e.h + 0.5, dmg, { crit: dmg >= 220 || o.crit }); if (o.not) yazi(e.x, e.y + e.h + 1.4, o.not, { kucuk: 1, col: o.col || '#ffe08a' }); ses('hit');
    if (e.hp <= 0 && !e.dead) { e.hp = 0; e.dead = true; M.ist.mob++; yazi(e.x, e.y + e.h + 1.2, 'Yıkıldı', { col: '#8ff0a4', crit: 1 }); toz(e.x, e.y + e.h / 2, 18, EL[e.el]); ses('boom', 0.3); } }
  /* eski applyDamageToBoss: kalkan hasarın yarısını emer (delici hariç), faz geçişleri can oranına göre */
  function hasarBoss(b, dmg, delici, not, crit) {
    if (!b || b.dead) return; let h = Math.round(dmg); if (!delici && b.kalkan > 0) { const em = Math.min(b.kalkan, Math.round(h * 0.5)); b.kalkan -= em; h -= em; }
    if (!M.uzakHasar) yay('dusman_hasar', { i: M.act.indexOf(b), h: Math.min(h, b.hp) }); b.hp = Math.max(0, b.hp - h); b.hurtT = 0.5; b.anim = 'hit'; b.animT = 0.5; M.stop = Math.max(M.stop, crit ? 0.15 : 0.09); if (!M.uzakHasar) { M.ist.hasar += h; M.ben.rage = Math.min(100, M.ben.rage + 15); } yazi(b.x, b.y + b.h + 0.6, h, { crit: !!crit }); if (not) yazi(b.x, b.y + b.h + 1.7, not, { kucuk: 1, col: crit ? '#ffd24a' : '#cfe0ff' }); ses('hit');
    const o = b.hp / b.max; if (b.hp > 0) { const D = b.D; if (D.fazlar) { for (const f of D.fazlar) if (b.faz === f.faz - 1 && o <= f.oran) { b.faz = f.faz; b.kalkan = f.kalkan || 0; if (f.kiyamet) b.kiyamet = f.kiyamet; if (f.yap) f.yap(b, API); M.flash = 0.4; M.shake = Math.max(M.shake, 1); ses('whoosh'); ses('boom', 0.5); pankart(f.ad, 'Faz ' + f.faz, 'hit'); if (f.soz) balon(b, f.soz, null, 3); halka(b.x, b.y + b.h * 0.5, 3.4, EL[D.el || 'venom']); break; } } }
    else { b.dead = true; for (const e of M.act) if (e.tur === 'mob' && !e.dead) { e.dead = true; e.hp = 0; } M.shake = 1.2; M.flash = 0.6; toz(b.x, b.y + b.h / 2, 40, EL[b.D.el || 'venom']); ses('boom', 1); if (b.D.veda) balon(b, b.D.veda, null, 3); }
    hud(true);
  }
  function patla(s, x, y, o) {
    o = o || {}; const by = s.by, col = s.col; M.hitX = x; M.hitY = y;
    if (s.teleport && by && !by.dead) { by.x = clamp(x, 1.7, FW - 1.7); by.y = Math.max(y, yerY(by.x)); by.fall = true; by.vy = 0; yazi(by.x, by.y + 2.6, 'Kanat Uçuşu', { col: '#ffe08a' }); toz(by.x, by.y + 0.8, 16, [255, 224, 138]); ses('chime'); return; }
    if (!o.su) carve(M.T, x, y, s.r); M.shake = Math.max(M.shake, s.pow ? 1.1 : 0.7); M.stop = 0.05; ses('boom', s.r / 2.5);
    M.parts.push({ k: 'flash', x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, s: s.r * 1.6, col }, { k: 'ring', x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, s: s.r, col }, { k: 'ring', x, y, vx: 0, vy: 0, life: 0.75, max: 0.75, s: s.r * 1.9, col: [255, 244, 214] });
    toz(x, y + 0.2, s.pow ? 30 : 14, col); if (s.pow) M.flash = Math.max(M.flash, 0.3);   /* vuruş hissi: geniş şok halkası, kıvılcım, öfke atışında parlama */
    if (!o.su) for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI, v = 3 + Math.random() * 8; M.parts.push({ k: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 2, life: 0.9 + Math.random() * 0.8, max: 1.7, s: 0.08 + Math.random() * 0.14, rot: Math.random() * 6 }); }
    for (let i = 0; i < 12; i++) M.parts.push({ k: 'smoke', x: x + (Math.random() - 0.5) * s.r, y: y + (Math.random() - 0.5) * s.r, vx: (Math.random() - 0.5) * 2, vy: 0.6 + Math.random() * 1.6, life: 0.8 + Math.random() * 0.8, max: 1.6, s: 0.5 + Math.random() * 0.6 }); toz(x, y, 14, col);
    const P = M.ben, pd = (ax, ay) => Math.hypot(x - ax, y - ay) * PX;      // uzaklık, eski piksel ölçüsüyle
    if (s.takim === 0 && !s.uzak) {
      let dm = s.dmg; if (s.yildirim) { dm = Math.round(dm * 1.20); M.isin.push({ x1: x, y1: y + 10, x2: x, y2: y, col: [200, 150, 255], t: 0.5, max: 0.5 }); yazi(x, y + 1.8, 'Gök çarpması +%20', { kucuk: 1, col: '#d9b8ff' }); }
      if (s.lav && !o.su && groundBelow(M.T, x, y + 1.5) != null && y - groundBelow(M.T, x, y + 1.5) < 2.2) M.lav.push({ x, y: groundBelow(M.T, x, y + 1.5), r: u(72), tur: 2, dmg: Math.max(45, Math.round(dm * 0.28)) });
      for (const p of M.props) { if (p.dead || !p.patlar && !p.ikmal) continue; if (pd(p.x, p.y + u(28)) > s.patlama + 108) continue; p.dead = true;
        if (p.patlar) { carve(M.T, p.x, p.y, u(98)); toz(p.x, p.y + 0.5, 34, EL.magma); halka(p.x, p.y + 0.5, 3.4, EL.magma); M.shake = 1.2; ses('boom', 1); yazi(p.x, p.y + 2, 'Barut fıçısı patladı', { col: '#ffb060', crit: 1 }); for (const e of M.act) if (e.takim === 1 && !e.dead && Math.hypot(e.x - p.x, e.y - p.y) * PX <= 230) { if (e.tur === 'mob') hasarMob(e, 280, { not: 'Zincirleme patlama' }); else if (e.tur === 'topcu') hasarTopcu(e, 280, { crit: 1 }); } }
        else { by.hp = Math.min(by.max, by.hp + 380); by.rage = Math.min(100, by.rage + 50); toz(p.x, p.y + 0.5, 20, [255, 224, 138]); yazi(p.x, p.y + 2, 'İkmal sandığı: +380 can, +50 öfke', { col: '#8ff0a4', crit: 1 }); ses('chime'); } }
      const rad = s.patlama + 55;
      for (const a of M.act) { if (a.dead || a.takim === 0) continue;
        if (a.tur === 'topcu') { const dH = pd(a.x, a.y + u(82)), dB = pd(a.x, a.y + u(46)); if (dH > 44 && dB > rad + 26) continue; const bas = dH <= 44, k = bas ? 1.75 : Math.max(0.55, 1 - dB / (rad + 75)); let h = Math.round(dm * k);
          if (bas) { M.ist.kritik++; pankart('Tam isabet!', '', 'hit'); } M.ist.kombo++; M.ist.enKombo = Math.max(M.ist.enKombo, M.ist.kombo); by.rage = Math.min(100, by.rage + 18);
          const ham = h; if (a.shield > 0 && !s.delici) { h = Math.round(h * 0.55); a.shield--; } a.hp = Math.max(a.kontrol === 'uzak' || a.yoldas ? 1 : 0, a.hp - h); a.hurtT = 0.55; M.stop = Math.max(M.stop, bas ? 0.15 : 0.09); a.vy = 3 + k * 2; a.fall = true; a.kx = Math.sign(a.x - x || 1) * (1 + k * 2.2); M.ist.hasar += h; yazi(a.x, a.y + 2.3, h, { crit: bas }); ses('hit'); yay('isabet', { kim: a.takim, yid: a.yid, hasar: ham, delici: !!s.delici, bas, it: Math.sign(a.x - x || 1), tur: M.tur }); }
        else if (a.tur === 'boss') { if (s.bossVurdu) continue; const dB = pd(a.x, a.y + u(140)); if (dB > rad + 115) continue; if (a.D.gizli && a.D.gizli(a)) continue; if (s.ayaz) { a.chill = 2; yazi(a.x, a.y + a.h + 2.4, 'Ayaz mührü', { kucuk: 1, col: '#9fe0ff' }); } hasarBoss(a, Math.round(dm * Math.max(0.45, 1 - dB / (rad + 160))), s.delici); }
        else { const d = pd(a.x, a.y + u(48)); if (d > rad + 20) continue; let h = Math.round(dm * Math.max(0.55, 1 - d / (rad + 60))); const not = {}; if (a.D.hasar) h = a.D.hasar(a, s, h, not); if (s.ayaz) a.chill = 2; M.ist.kombo++; M.ist.enKombo = Math.max(M.ist.enKombo, M.ist.kombo); hasarMob(a, h, not); } }
    } else if (s.takim === 1 && !s.uzak) {
      if (s.by && s.by.tur === 'topcu') { const dH = pd(P.x, P.y + u(82)), dB = pd(P.x, P.y + u(46)), rad = s.patlama + 55; if (dH <= 44 || dB <= rad + 26) { const bas = dH <= 44, k = bas ? 1.75 : Math.max(0.55, 1 - dB / (rad + 75)); hasarTopcu(P, s.dmg * k, { kalkanK: 0.55, crit: bas, it: k, yon: Math.sign(P.x - x || 1) }); } }
      else if (pd(P.x, P.y + u(46)) <= s.patlama + 48) hasarTopcu(P, s.dmg, { it: 0.4, yon: Math.sign(P.x - x || 1) });
    }
    hud(true);
  }
  function stepShots(dt) {
    for (let i = M.shots.length - 1; i >= 0; i--) { const s = M.shots[i]; let hit = false, su = false;
      for (let k = 0; k < 4 && !hit; k++) { const h = dt / 4; s.vx += M.wind * RUZ * s.ruz * h; s.vy -= G * h; s.x += s.vx * h; s.y += s.vy * h; s.t += h;
        if (M.cfg.ozel && M.cfg.ozel.ucus) M.cfg.ozel.ucus(s, API);
        if (solid(M.T, s.x, s.y) && !(s.gok && s.t < 0.3)) hit = true;
        else if (M.deniz != null && s.y < M.deniz) { hit = true; su = true; }
        else for (const a of M.act) { if (a.dead || a.yoldas || (a === s.by && s.t < 0.3) || a.takim === s.takim) continue;
          if (a.tur === 'topcu') { if (Math.hypot(a.x - s.x, a.y + 0.85 - s.y) < 0.75) hit = true; }
          else if (a.tur === 'boss') { if (!s.uzak && a.D.vurus && a.D.vurus(s, a, API)) { s.bossVurdu = true; hit = true; } }
          else if (Math.hypot(a.x - s.x, a.y + a.h * 0.5 - s.y) < a.h * 0.42) hit = true;
          if (hit) break; }
        if (s.x < -8 || s.x > FW + 8 || s.y < -6) { M.shots.splice(i, 1); hit = null; break; } }
      if (hit === null) continue; s.trail.push([s.x, s.y]); if (s.trail.length > 26) s.trail.shift();
      if (Math.random() < 0.6) M.parts.push({ k: 'ember', x: s.x, y: s.y, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.2, life: 0.35, max: 0.35, s: 0.06, col: s.col });
      if (hit) { M.shots.splice(i, 1); if (su) { for (let j = 0; j < 14; j++) M.parts.push({ k: 'ember', x: s.x, y: M.deniz, vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 6, life: 0.7, max: 0.7, s: 0.09, col: [200, 240, 255] }); ses('splash'); } patla(s, s.x, s.y, { su }); } }
  }

  /* ---------- yapay rakip (Talimci): fiziğin aynısıyla deneme atışları yapar; ilk atışlarda sapması büyüktür ---------- */
  function simulate(a, angle, power, target) { const ang = angle * Math.PI / 180, sp = 8.5 + power * 19.5; let x = a.x + a.face * 0.9, y = a.y + 1.3, vx = Math.cos(ang) * sp * a.face, vy = Math.sin(ang) * sp;
    for (let t = 0; t < 7; t += 1 / 60) { vx += M.wind * RUZ / 60; vy -= G / 60; x += vx / 60; y += vy / 60; if (t > 0.2 && (solid(M.T, x, y) || Math.hypot(target.x - x, target.y + 0.85 - y) < 0.75)) return [x, y]; if (x < -8 || x > FW + 8 || y < -6) return null; } return null; }
  function aiPlan(me) { const tg = M.ben; me.face = tg.x < me.x ? -1 : 1; let best = null;
    for (let ang = 15; ang <= 70; ang += 2.5) for (let p = 0.25; p <= 1; p += 0.04) { const l = simulate(me, ang, p, tg); if (!l) continue; const d = Math.hypot(l[0] - tg.x, l[1] - tg.y - 0.8) + (Math.hypot(l[0] - me.x, l[1] - me.y) < 4 ? 20 : 0); if (!best || d < best.d) best = { d, ang, p }; }
    if (!best) best = { ang: 45, p: 0.7 }; me.beceri = (me.beceri || 0) + 1; const err = Math.max(2.2, 9 - me.beceri * 1.7);
    return { ang: clamp(best.ang + (Math.random() - 0.5) * 2 * err, 5, 70), p: clamp(best.p + (Math.random() - 0.5) * 0.02 * err, 0.2, 1), t: 0 }; }

  /* ---------- sıra ---------- */
  const dusmanKaldi = () => !!M.cfg.takimSavasi || M.act.some(a => a.takim === 1 && !a.dead);   // takım savaşında sonucu sunucu söyler
  function siradaki() {
    if (M.over) return; if (!dusmanKaldi()) return bitir(true); const onceki = M.aktif;
    if (M.cfg.ortak) { M.aktif = null; M.faz = 'bekle'; M.pt = 0; M.charging = false; M.charge = 0; hud(true); return yay('adim_bitti', { adim: M.adim || 0, ex: M.act.filter(a => a.takim === 1).map(a => Math.round(a.x * 100) / 100), x: M.ben.x, y: M.ben.y }); }   // ortak savaş: sıradakini sunucu söyler (ortakSira)
    for (let k = 0; k <= M.sira.length; k++) { M.si = (M.si + 1) % M.sira.length; const a = M.sira[M.si]; if (M.si === 0) { if (M.aktif) M.tur++; } if (a === M.ben || !a.dead) { if (onceki === M.ben && a !== M.ben && M.cfg.ozel && M.cfg.ozel.dusmanBasi) M.cfg.ozel.dusmanBasi(API); return baslat(a); } }
  }
  function baslat(a) {
    M.aktif = a; M.faz = 'nisan'; M.pt = 0; M.siraNo = (M.siraNo || 0) + (a.tur === 'topcu' ? 1 : 0); M.charge = 0; M.charging = false; M.plan = null; M.hitX = undefined;
    if (a === M.ben) {
      if (a.hp <= 0 || a.dead) { if (a.revive > 0) { a.revive--; a.dead = false; a.hp = Math.round(a.max * 0.65); a.shield = 1; if (a.y < 0.5 || a.dustu) { a.x = X_(M.cfg.x0 || 460); a.dustu = false; } a.y = Math.max(a.y, yerY(a.x)); a.fall = true; a.vy = 0; yazi(a.x, a.y + 3, 'Anka Külü: dirildin', { col: '#ffe08a', crit: 1 }); toz(a.x, a.y + 1, 30, [255, 215, 106]); halka(a.x, a.y + 1, 1.1, [255, 215, 106]); ses('chime'); yay('can', { kim: 0, hp: a.hp, max: a.max }); } else if (M.cfg.ortak) { a.dead = true; a.dustuKesin = true; a.hp = 0; pankart('Düştün', 'Yoldaşlarını izliyorsun', 'kayip'); yay('dustum', {}); return siradaki(); }   // ortak savaş: düşen arenada kalır, savaş sürer; sırası atlanır
        else return bitir(false); }
      for (const k in a.cd) if (a.cd[k] > 0) a.cd[k]--;
      if (M.lav.length) { for (const l of M.lav) { if (l.gorsel) { l.tur--; continue; } if (M.boss && !M.boss.dead && Math.abs(M.boss.x - l.x) <= l.r + u(120)) hasarBoss(M.boss, l.dmg, true, 'Lav havuzu yakıyor'); for (const e of M.act) if (e.tur === 'mob' && !e.dead && Math.abs(e.x - l.x) <= l.r + u(36)) hasarMob(e, l.dmg, { not: 'Lav yanığı', col: '#ffb060' }); l.tur--; } M.lav = M.lav.filter(l => l.tur > 0); if (!dusmanKaldi()) return bitir(true); }
      M.bolge = M.cfg.ortak ? M.bolge.filter(z => z.kim !== a) : []; if (M.boss && !M.boss.dead) { const D = M.boss.D; M.bolge.push({ x: a.x, y: a.y, r: u(130), dmg: D.bolge || 210, el: D.el || 'venom', kim: a }); }
      if (M.boss && M.boss.D.oyuncuSirasi) M.boss.D.oyuncuSirasi(M.boss, API);
      M.timer = 25; yeniRuzgar(M.cfg.ortak ? M.ruzgarGelen : M.ruzgarSirasi ? M.ruzgarSirasi(M.siraNo) : null); a.sta = a.staMax; a.capa = 0;
      pankart('Senin sıran', M.bolge.length ? 'Halkadan çık, sonra ateş et' : 'Tur ' + M.tur, 'me'); ses('turn'); yay('sira', { kim: 0, tur: M.tur, ruzgar: M.wind });
    } else if (a.yoldas) {   // ortak savaş: sıra bir yoldaşta; o kendi ekranında oynar, burada yeri, nişanı ve atışı görünür
      M.timer = 25; yeniRuzgar(M.ruzgarGelen); M.bolge = M.bolge.filter(z => z.kim !== a); if (M.boss && !M.boss.dead) { const D = M.boss.D; M.bolge.push({ x: a.x, y: a.y, r: u(130), dmg: D.bolge || 210, el: D.el || 'venom', kim: a }); }
      pankart(a.ad + ' nişan alıyor', 'Tur ' + M.tur, ''); ses('turn');
    } else if (a.tur === 'topcu') { M.timer = 25; if (M.ruzgarSirasi) yeniRuzgar(M.ruzgarSirasi(M.siraNo)); pankart(a.kontrol === 'uzak' ? 'Rakibin sırası' : a.ad + ' nişan alıyor', 'Tur ' + M.tur, ''); ses('turn'); yay('sira', { kim: 1, tur: M.tur, ruzgar: M.wind }); }
    else if (a.tur === 'mob') mobSira(a); else bossSira(a);
    hud(true);
  }
  /* eski performSingleEnemyTurnAction: yerdekiler oyuncuya 46 piksel yaklaşır (ayazda 24), 135 hasarlık nişanlı atış */
  function mobSira(e) { const p = hedefT(), ayaz = e.chill > 0, ad = M.adim; if (e.chill > 0) e.chill--; M.faz = 'oyun';
    sonra(0.55, () => { if (M.adim !== ad) return; if (e.dead || M.over) return siradaki(); e.face = p.x < e.x ? -1 : 1; if (!e.ucan && !e.D.sabit) { const lim = M.cfg.ozel && M.cfg.ozel.mobSinir || [820, 3050]; e.x = clamp(e.x + e.face * u(ayaz ? 24 : 46), X_(lim[0]), X_(lim[1])); e.yuruT = M.time; }
      e.anim = 'atk'; e.animT = 0.9; e.lunge = 0.35; if (e.D.soz && R() < 0.3) balon(e, e.D.soz, null, 1.6);
      sonra(0.4, () => { if (M.adim !== ad) return; if (e.dead || M.over) return siradaki(); const dm = Math.round(135 * M.cfg.zorluk.dmg * (ayaz ? 0.85 : 1)); nisanliAt(e, e.x + e.face * u(35), e.y + u(58) + (e.ucan ? e.h * 0.2 : 0), p.x + u(R() * 44 - 22), p.y + u(26), dm, e.el, 42, e.D.atis); M.faz = 'ucus'; M.pt = 0; M.bekle = 0; }); });
  }
  /* eski performSingleBossTurnAction: sersemse pas; laf atma turu; değilse hazırlık, tehlike bölgesi, saldırı */
  function bossSira(b) { const hd = hedefT(), ben = M.ben, D = b.D, ad = M.adim, tn = turNo(), sn = fn => () => { if (M.adim === ad) fn(); }; M.faz = 'oyun'; b.face = hd.x < b.x ? -1 : 1;
    if (D.siraBasi && D.siraBasi(b, API)) return sonra(1.0, sn(siradaki));
    if (b.sersem > 0) { b.sersem--; yazi(b.x, b.y + b.h + 1, 'Sersemledi, sırası geçti', { col: '#ffe08a' }); return sonra(1.0, sn(siradaki)); }
    const laf = false && b.sonLaf !== tn && D.laflar && (b.lafZorla || tn === 2 || (!D.lafsiz && tn >= 1 && R() < 0.35));
    let p = ben;   // laf atma herkese: karşılığı her oyuncu kendi ekranında verir
    if (laf) { b.lafZorla = false; b.sonLaf = tn; b.acik = 0.35; p.rage = Math.min(100, p.rage + 25); p.sta = Math.min(p.staMax, p.sta + 25); const soz = D.laflar[(b.lafN = (b.lafN || 0) + 1) % D.laflar.length];
      balon(b, soz, b.ad + ' laf atıyor', 4.4); const L = $('tpLaf'); L.hidden = false; L.querySelector('p').textContent = 'Nasıl karşılık verirsin?'; M.lafT = 4.4; M.lafAdim = ad; hud(true); return; }
    p = hd; const dm = M.cfg.zorluk.dmg * (b.chill > 0 ? 0.85 : 1); if (b.chill > 0) b.chill--;
    const hamle = D.hamle(b, API), H = D.hamleler[hamle] || {}; b.anim = 'atk'; b.animT = 2.4; balon(b, H.soz || '', H.ad || 'Saldırı', 2.2); ses('whoosh');
    sonra(1.35, () => { if (M.adim !== ad) return; if (b.dead || M.over) return siradaki();
      const zl = M.cfg.ortak ? M.bolge.splice(0) : M.bolge.splice(0, 1); for (const z of zl) { if (z.kim && z.kim !== ben && z.kim.dead) continue; const p = z.kim || ben, kacti = Math.abs(p.x - z.x) > z.r, col = EL[z.el] || EL.venom; M.isin.push({ x1: b.x + b.face * 1.5, y1: b.y + b.h * 0.7, x2: z.x, y2: z.y + 0.2, col, t: 0.55, max: 0.55 }); carve(M.T, z.x, z.y, u(68)); toz(z.x, z.y + 0.3, 30, col); halka(z.x, z.y + 0.3, z.r, col); M.shake = Math.max(M.shake, 0.8); ses('boom', 0.7);
        if (kacti) yazi(p.x, p.y + 2.8, p === ben ? 'Tehlikeden kaçtın' : 'Tehlikeden kaçtı', { col: '#8ff0a4', crit: 1 }); else hasarTopcu(p, z.dmg * dm, { kalkanK: 0.35, crit: 1, it: 0.6, yon: Math.sign(p.x - b.x || -1) }); }
      b.lunge = 0.5; D.uygula(b, p, hamle, dm, API); M.faz = 'ucus'; M.pt = 0; M.bekle = 0.6; });
  }
  function lafCevap(k) { if (!M || M.lafT == null) return; const p = M.ben, b = M.boss; M.lafT = null; $('tpLaf').hidden = true; $('tpBalon').hidden = true; M.balon = null;
    if (k === 'rage') { p.rage = Math.min(100, p.rage + 20); yazi(p.x, p.y + 2.8, 'Cesur karşılık: +20 öfke', { col: '#ffb060', crit: 1 }); }
    else if (k === 'focus') { b.acik = 0.50; yazi(p.x, p.y + 2.8, 'Keskin nişan: zayıf noktaya +%50', { col: '#ffe08a', crit: 1 }); }
    else if (k === 'shield') { p.shield = Math.min(3, p.shield + 1); p.sta = Math.min(p.staMax, p.sta + 25); yazi(p.x, p.y + 2.8, 'Siper: +1 kalkan', { col: '#9fe0ff', crit: 1 }); }
    if (k) ses('chime'); hud(true); const ad = M.adim; sonra(0.6, () => { if (M.adim === ad) siradaki(); }); }
  function bitir(zafer, terk) { if (M.over) return; M.over = true; M.faz = 'bitti'; M.lafT = null; $('tpLaf').hidden = true; hud(true); yay('mac_bitti', { zafer, terk: !!terk, ist: M.ist });
    if (terk) return M.bitir({ zafer: false, terk: true, ist: M.ist });
    pankart(zafer ? 'Zafer' : 'Yenildin', '', zafer ? 'big' : 'big kayip'); ses('win', zafer); const m = M; setTimeout(() => { m.bitir({ zafer, terk: false, ist: m.ist, can: m.ben.hp, max: m.ben.max }); }, window.__fastFx ? 60 : 1500); }

  /* ---------- güncelleme ---------- */
  function update(dt) {
    if (M.hayalet && M.hayalet.length && !M.over) stepHayalet(dt);
    M.time += dt; if (M.flash > 0) M.flash -= dt; if (M.stop > 0) { M.stop -= dt; return; } M.pt += dt; M.shake = Math.max(0, M.shake - dt * 2.2);
    for (let i = 0; i < M.zaman.length; i++) if (M.zaman[i].t <= M.time) { const z = M.zaman.splice(i--, 1)[0]; z.fn(); if (!M || !M.on) return; }
    const me = M.aktif, K_ = M.keys;
    if (M.faz === 'giris' && M.pt > 1.7) siradaki();
    if (M.lafT != null) { M.lafT -= dt; if (M.lafT <= 0) lafCevap(null); }
    if (M.ipucuT > 0) { M.ipucuT -= dt; if (M.ipucuT <= 0) $('tpBilgi').hidden = true; }
    if (M.balon) { M.balon.t -= dt; if (M.balon.t <= 0) { M.balon = null; $('tpBalon').hidden = true; } }
    if (M.faz === 'nisan' && me && me.tur === 'topcu' && !M.over) {
      M.timer -= dt; if (M.timer <= 0 && (me.kontrol === 'uzak' || me.yoldas)) M.timer = 0; else if (M.timer <= 0) { M.charging = false; M.charge = 0; me.mods = {}; yay('pas', { kim: me.takim }); siradaki(); return; }
      if (me.kontrol === 'yerel') {
        const mv = (K_.right ? 1 : 0) - (K_.left ? 1 : 0); me.moving = false;
        if (mv && !M.charging && me.sta > 0.5 && !me.fall) { me.face = mv; const nx = clamp(me.x + mv * 2.3 * dt, 1.7, FW - 1.7); if (!solid(M.T, nx, me.y + 0.75)) { const gy = groundBelow(M.T, nx, me.y + 0.7); if (gy !== null && gy - me.y < 0.7) { me.sta = Math.max(0, me.sta - 22 * dt); me.x = nx; if (me.y - gy > 0.9) me.fall = true; else me.y = gy; me.moving = true; me.ph += dt * 1.9; } else if (gy === null) { me.x = nx; me.fall = true; } } }
        const av = (K_.up ? 1 : 0) - (K_.down ? 1 : 0); if (av) me.angle = clamp(me.angle + av * 38 * dt, -10, 70);
        if (K_.fire && !me.fall) { if (!M.charging) { M.charging = true; M.charge = 0; } M.charge = Math.min(1, M.charge + dt / 1.5); if (Math.floor(M.time * 14) !== M.lastTick) { M.lastTick = Math.floor(M.time * 14); ses('charge', M.charge); } }
        else if (M.charging) { M.charging = false; const p = Math.max(0.12, M.charge); M.charge = 0; ates(me, p); }
        if ((M.konumT = (M.konumT || 0) - dt) <= 0) { const iz = Math.round(me.x * 20) + ':' + Math.round(me.angle) + ':' + me.face; if (iz !== M.konumIz) { M.konumIz = iz; M.konumT = 0.15; yay('konum', { x: me.x, y: me.y, aci: Math.round(me.angle), yon: me.face }); } }
      } else if (me.kontrol === 'uzak') { const c = M.uzakKuyruk.shift(); if (c) uzakUygula(c);
      } else if (me.kontrol === 'yapay') {
        if (!M.plan && M.pt > 0.9) M.plan = aiPlan(me);
        if (M.plan) { const p = M.plan; p.t += dt; const d = p.ang - me.angle; if (Math.abs(d) > 0.6 && p.t < 1.6) me.angle += Math.sign(d) * Math.min(Math.abs(d), 42 * dt); else { M.charging = true; M.charge = Math.min(p.p, M.charge + dt / 1.5); if (M.charge >= p.p - 0.001) { M.charging = false; M.charge = 0; ates(me, p.p); } } }
      }   // 'uzak': komutlar EO2.battle.uzak() ile gelir
    } else if (M.faz === 'ucus') { stepShots(dt); if (!M.shots.length && !(M.hayalet && M.hayalet.length) && M.pt > 0.3 + (M.bekle || 0)) { M.faz = 'durul'; M.pt = 0; } }
    else if (M.faz === 'durul' && M.pt > 0.9 && !M.act.some(a => a.fall) && !M.dalga.length) siradaki();
    // dalgalar (Abra): güverte boyunca yürür, oyuncuya çarpınca hasar verir ve iter; çapa itmeyi dörtte bire indirir
    for (let i = M.dalga.length - 1; i >= 0; i--) { const d = M.dalga[i]; d.t += dt; d.x = d.x0 - d.yol * (d.t / d.sure); const p = M.ben; if (!d.vurdu && !p.dead && d.x <= p.x + 0.6) { d.vurdu = true; const it = p.capa ? 0.25 : 1; hasarTopcu(p, d.dmg, { it: 0.5 * it, yon: -1 }); p.kx = -(2.5 + 3 * it) * it; if (p.capa) yazi(p.x, p.y + 3.2, 'Çapa tuttu', { kucuk: 1, col: '#7fe8d8' }); ses('splash'); } if (d.t >= d.sure) M.dalga.splice(i, 1); }
    // gövde fiziği
    for (const a of M.act) { a.fireT = (a.fireT || 0) + dt; if (a.hurtT > 0) a.hurtT -= dt; if (a.animT > 0) { a.animT -= dt; if (a.animT <= 0) a.anim = 'idle'; } if (a.lunge > 0) a.lunge = Math.max(0, a.lunge - dt); a.shown += (a.hp - a.shown) * Math.min(1, dt * 4);
      if (a.dead && a.tur !== 'topcu') { a.olu += dt; continue; }
      if (a.tur !== 'topcu') { if (a.ucan || (a.tur === 'boss' && a.D.suda)) continue; const gy = groundBelow(M.T, a.x, a.y + 0.6); if (gy === null) { a.vy -= G * dt; a.y += a.vy * dt; if (a.y < -3) { a.hp = 0; a.dead = true; yazi(a.x, 2.5, 'Uçuruma düştü', { crit: 1 }); if (a.tur === 'boss') hasarBoss(a, 0, true); } } else if (a.y - gy > 0.05) { a.vy -= G * dt; a.y = Math.max(gy, a.y + a.vy * dt); } else { a.y = gy; a.vy = 0; } continue; }
      if (a.fall) { a.vy -= G * dt; a.y += a.vy * dt; if (a.kx) { const nx = clamp(a.x + a.kx * dt, 1.7, FW - 1.7); if (!solid(M.T, nx, a.y + 0.6)) a.x = nx; a.kx *= Math.pow(0.05, dt); }
        const gy = groundBelow(M.T, a.x, a.y + 0.5); if (a.vy <= 0 && gy !== null && a.y <= gy) { a.y = gy; a.fall = false; a.vy = 0; a.kx = 0; for (let i = 0; i < 5; i++) M.parts.push({ k: 'smoke', x: a.x + (Math.random() - 0.5) * 0.6, y: a.y + 0.1, vx: (Math.random() - 0.5) * 2, vy: 0.5, life: 0.5, max: 0.5, s: 0.25 }); }
        if (a.ben && M.deniz != null && a.y < M.deniz - 1.2) { const kayip = Math.round(a.max * 0.2); a.hp = Math.max(0, a.hp - kayip); a.x = X_(M.cfg.x0 || 460); a.y = yerY(a.x) + 2.5; a.vy = 0; a.kx = 0; a.hurtT = 0.55; yazi(a.x, a.y + 2.6, 'Denize düştün: −' + kayip, { col: '#9fe0ff', crit: 1 }); ses('splash'); yay('can', { kim: 0, hp: a.hp, max: a.max }); }
        else if ((a.kontrol === 'uzak' || a.yoldas) && a.y < -4) { a.fall = false; a.y = -4; a.vy = 0; }      // uzak rakibin düşüşüne kendi ucu karar verir
        else if (a.y < (M.deniz != null ? M.deniz - 1.2 : -4)) { a.hp = 0; a.dead = true; a.dustu = true; a.fall = false; yazi(a.x, Math.max(2.5, (M.deniz || 0) + 1.5), M.deniz != null ? 'Denize düştü' : 'Düştü', { crit: 1 }); if (M.deniz != null) ses('splash'); yay('can', { kim: a.takim, hp: 0, max: a.max }); } }
      else if (!a.dead) { const gy = groundBelow(M.T, a.x, a.y + 0.4); if (gy === null || a.y - gy > 0.25) a.fall = true; else a.y = gy; }
      if (a.hp <= 0 && !a.dead && !a.fall && a.kontrol !== 'uzak' && !a.yoldas) a.dead = true; }      // uzak rakibin öldüğüne sunucu sonucu karar verir
    for (let i = M.parts.length - 1; i >= 0; i--) { const p = M.parts[i]; p.life -= dt; if (p.life <= 0) { M.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'chunk' || p.k === 'ember') p.vy -= G * 0.8 * dt; else if (p.k === 'smoke') { p.vx *= Math.pow(0.2, dt); p.x += M.wind * 0.25 * dt; } }
    for (let i = M.nums.length - 1; i >= 0; i--) { M.nums[i].t += dt; if (M.nums[i].t > 1.5) M.nums.splice(i, 1); }
    for (let i = M.isin.length - 1; i >= 0; i--) { M.isin[i].t -= dt; if (M.isin[i].t <= 0) M.isin.splice(i, 1); }
    // kamera
    const c = M.cam, ben = M.ben; let tx, ty, tz;
    if (M.shots.length || (M.hayalet && M.hayalet.length)) { const s = M.shots[0] || M.hayalet[0]; tx = s.x + s.vx * 0.3; ty = Math.max(7, s.y * 0.55 + 4.5); tz = 0.62; }
    else if (M.faz === 'durul' || M.faz === 'bitti') { tx = M.hitX === undefined ? (me || ben).x : M.hitX; ty = (M.hitY === undefined ? (me || ben).y : M.hitY) + 2.0; tz = 0.9; }
    else if (M.faz === 'giris') { const b = M.boss; tx = b ? lerp(b.x, 32, ss(0.9, 1.7, M.pt)) : 32; ty = b ? b.y + b.h * 0.5 : 11; tz = b ? 0.62 : 0.5; }
    else if (me && me.tur === 'boss') { tx = lerp(me.x, ben.x, 0.3); ty = me.y + me.h * 0.5; tz = 0.6; }
    else if (me && me.tur === 'mob') { tx = me.x; ty = me.y + 2; tz = 0.85; }
    else if (me) { const gor = M.view ? M.view.W / M.view.sc / Math.max(0.5, c.z) : 22; tx = me.x + me.face * Math.min(M.charging ? 7.5 : 5, gor * (M.charging ? 0.3 : 0.22)); ty = me.y + 2.0; tz = M.charging ? 0.84 : 1; } else { tx = 32; ty = 11; tz = 0.5; }
    const k = Math.min(1, dt * (M.shots.length || (M.hayalet && M.hayalet.length) ? 5 : 2.4)); c.x = lerp(c.x, tx, k); c.y = lerp(c.y, ty, k); c.z = lerp(c.z, tz, Math.min(1, dt * 2));
    hud(false); if (((M.tick = M.tick + 1) % 6) === 1) harita();
  }
  function harita() { const cv = $('tpHarita'), x = cv.getContext('2d'), W = cv.width, H = cv.height, X = v => v / FW * W, Y = v => H - 6 - v / 20 * (H - 14); x.clearRect(0, 0, W, H);
    x.beginPath(); let open = false; for (let i = 0; i <= 128; i++) { const wx = 1 + i / 128 * 62, gy = groundBelow(M.T, wx, FH - 1); if (gy === null) { open = false; continue; } open ? x.lineTo(X(wx), Y(gy)) : x.moveTo(X(wx), Y(gy)); open = true; }
    x.strokeStyle = 'rgba(200,220,255,.8)'; x.lineWidth = 3; x.lineJoin = 'round'; x.stroke();
    for (const a of M.act) { if (a.dead) continue; x.fillStyle = a.takim === 0 ? '#58d06a' : a.tur === 'boss' ? '#ffb040' : '#ef5b4d'; x.strokeStyle = '#fff6dc'; x.lineWidth = 2; x.beginPath(); x.arc(X(a.x), Y(Math.min(a.y, 19)) - 5, a.tur === 'boss' ? 8 : 5.5, 0, 6.3); x.fill(); x.stroke(); }
    for (const s of M.shots) { x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(X(s.x), Y(Math.min(s.y, 19)), 3.5, 0, 6.3); x.fill(); } }
  let hudCache = {};
  function hud(force) {
    if (!M) return; if (force) hudCache = {}; const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } }, me = M.ben, h = M.hedef, pct = (a, b) => Math.round(clamp(a / b, 0, 1) * 1000) / 10;
    set('hp', Math.round(me.hp), v => { $('tpCan').style.width = pct(v, me.max) + '%'; $('tpCanN').textContent = v + ' / ' + me.max; }); set('hs', Math.round(me.shown), v => { $('tpCan2').style.width = pct(v, me.max) + '%'; });
    set('st', Math.round(me.sta), v => { $('tpNefes').style.width = pct(v, me.staMax) + '%'; }); set('rg', Math.round(me.rage), v => { $('tpOfke').style.width = v + '%'; $('tpOfke').parentNode.classList.toggle('dolu', v >= 100); });
    set('sh', me.shield, v => { $('tpKalkan').hidden = !v; $('tpKalkan').textContent = 'Kalkan ' + v; }); set('rv', me.revive, v => { $('tpAnka').textContent = 'Anka ' + v; $('tpAnka').classList.toggle('bos', !v); });
    if (h) { set('hhp', Math.round(h.hp), v => { $('tpHCan').style.width = pct(v, h.max) + '%'; $('tpHCanN').textContent = v + ' / ' + h.max; }); set('hhs', Math.round(h.shown), v => { $('tpHCan2').style.width = pct(v, h.max) + '%'; });
      set('hk', h.tur === 'boss' ? Math.round(h.kalkan) : h.shield || 0, v => { $('tpHKalkan').hidden = !v; $('tpHKalkan').textContent = 'Kalkan ' + v; }); set('hf', h.tur === 'boss' && h.D.fazlar ? h.faz : 0, v => { $('tpHFaz').hidden = !v; if (v) $('tpHFaz').textContent = 'Faz ' + v + ' / ' + (h.D.fazlar.length + 1); }); }
    set('tm', Math.max(0, Math.ceil(M.timer)), v => { $('tpSure').textContent = v; $('tpSure').classList.toggle('az', v <= 5); }); set('rd', M.tur, v => { $('tpTur').textContent = 'Tur ' + v; });
    const benim = M.aktif === me && M.faz === 'nisan' && !M.over;
    set('who', M.over ? 'Bitti' : !M.aktif ? (M.cfg.ortak && M.adim ? 'Sıra geçiyor' : 'Hazırlan') : me.dustuKesin ? (M.aktif && M.aktif.yoldas ? M.aktif.ad + ' oynuyor' : 'Düştün · izliyorsun') : M.aktif === me ? 'Senin sıran' : M.aktif.yoldas ? M.aktif.ad + ' oynuyor' : M.aktif.tur === 'topcu' ? 'Rakibin sırası' : M.aktif.ad, v => { $('tpKim').textContent = v; }); set('mine', benim, v => { $('tpSavas').classList.toggle('benim', v); });
    set('ang', Math.round(me.angle) * me.face, v => { $('tpAci').textContent = Math.abs(v) + '°'; const r = Math.abs(v) * Math.PI / 180 * (v < 0 && Math.round(me.angle) < 0 ? -1 : 1), a = Math.round(me.angle) * Math.PI / 180; $('tpIbre').setAttribute('x2', (50 + Math.cos(a) * 38 * me.face).toFixed(1)); $('tpIbre').setAttribute('y2', (56 - Math.sin(a) * 38).toFixed(1)); void r; });
    set('pw', Math.round((M.aktif === me ? M.charge : 0) * 100), v => { $('tpGuc').style.width = v + '%'; }); set('lp', Math.round(me.lastPower * 100), v => { $('tpSon').style.left = v + '%'; $('tpSon').hidden = v < 0; });
    let anahtar = benim ? '1' : '0'; for (const k of BECERI_SIRA) anahtar += (me.mods[k] ? 'a' : '-') + (me.cd[k] || 0) + (BECERI[k].ofke ? (me.rage >= 100 ? 'r' : 'x') : me.sta >= BECERI[k].m ? 'y' : 'n');
    set('bc', anahtar, () => { $('tpBeceri').querySelectorAll('button').forEach(b => { const k = b.dataset.b, B = BECERI[k], cd = me.cd[k] || 0, ok = benim && !cd && (B.ofke ? me.rage >= 100 : me.mods[k] || me.sta >= B.m);
      b.setAttribute('aria-pressed', String(!!me.mods[k] || (k === 'shield' && me.shield > 0 && false))); b.classList.toggle('yok', !ok && !me.mods[k]); b.classList.toggle('hazir', !!B.ofke && me.rage >= 100); b.querySelector('em').textContent = cd ? cd + 'T' : B.ofke ? '' : B.m; }); });
  }

  /* ---------- çizim ---------- */
  function render() {
    const cv = $('tpCv'), app = $('app').getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(app.width * dpr), H = Math.round(app.height * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const x = cv.getContext('2d'), n = M.cfg.bg || M.cfg.sahne ? 0 : (EO2.state ? EO2.state.night : 0), c = M.cam, dik = W / H < 1, kb = !dik && M.cfg.kameraBoy ? M.cfg.kameraBoy * 1.7 : 0, sc = (kb ? H / kb : (W / 22) * (dik ? 1.9 : 1)) * c.z, viewW = W / sc, viewH = H / sc, AE = M.cfg.arenaEn || FW, pay = 2;
    const cx = clamp(c.x, Math.min(AE / 2, viewW / 2 - pay), Math.max(AE / 2, AE - viewW / 2 + pay)) + (Math.random() - 0.5) * M.shake * 0.5, cy = clamp(c.y, viewH / 2 - pay, 40) + (Math.random() - 0.5) * M.shake * 0.5;
    const X = wx => (wx - cx) * sc + W / 2, Y = wy => H / 2 - (wy - cy) * sc + H * 0.02; M.view = { X, Y, sc, W, H };
    x.setTransform(1, 0, 0, 1, 0, 0); const T = M.T, Tm = T.Tm, bgI = M.cfg.bg ? imgs[M.cfg.bg] : null, sh = M.cfg.sahne, shI = sh && M.katman && M.katman.length ? M.katman[0].im : null;
    if (shI) { // dünyaya kilitli sahne resmi (cfg.sahne = { src, ppu: birim başına resim pikseli, ust, alt }): resim dünya boyunca uzanır, zemin çizgisi araziyle çakışır; arazi ayrıca çizilmez
      const kk = sc / sh.ppu, ih = shI.naturalHeight * kk, iy = Y(sh.taban || 0) - ih; x.fillStyle = sh.alt; x.fillRect(0, 0, W, H); x.fillStyle = sh.ust; x.fillRect(0, 0, W, Math.max(0, iy + 2)); for (const k of M.katman) if (k.z <= 0) x.drawImage(k.cv || k.im, X(0), iy, shI.naturalWidth * kk, ih);   // 0 ve altı: oyuncunun arkası (küçük numara daha arkada)   // resmin sol alt köşesi dünyada (0, taban); ölçek blok haritadaki mavi kutudan
    } else if (bgI) { // eski oyunun sahne çizimi: ekranı kaplar, kamerayla hafifçe kayar
      const k = Math.max(W / bgI.naturalWidth, H / bgI.naturalHeight) * 1.14, bw = bgI.naturalWidth * k, bh = bgI.naturalHeight * k, ox = (W - bw) / 2 - (cx - 32) / 32 * (bw - W) * 0.42, oy = (H - bh) / 2 + (cy - 12) * sc * 0.05;
      x.fillStyle = '#060a1c'; x.fillRect(0, 0, W, H); x.drawImage(bgI, ox, clamp(oy, H - bh, 0), bw, bh);
      const sis = x.createLinearGradient(0, H * 0.35, 0, H); sis.addColorStop(0, 'rgba(6,10,30,0)'); sis.addColorStop(1, M.cfg.sis || 'rgba(6,10,30,.55)'); x.fillStyle = sis; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(8,12,34,.18)'; x.fillRect(0, 0, W, H);
    } else { const sky = x.createLinearGradient(0, 0, 0, H); if (n < 0.5) { sky.addColorStop(0, '#3f8fe6'); sky.addColorStop(0.6, '#8dc9f5'); sky.addColorStop(1, '#e4f3fb'); } else { sky.addColorStop(0, '#10163a'); sky.addColorStop(0.55, '#3a2f70'); sky.addColorStop(1, '#d9785f'); }
      x.fillStyle = sky; x.fillRect(0, 0, W, H);
      const sun = x.createRadialGradient(W * 0.74, H * 0.2, 0, W * 0.74, H * 0.2, H * 0.5); sun.addColorStop(0, n < 0.5 ? 'rgba(255,246,214,.9)' : 'rgba(210,220,255,.5)'); sun.addColorStop(0.15, n < 0.5 ? 'rgba(255,240,200,.4)' : 'rgba(190,200,255,.2)'); sun.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = sun; x.fillRect(0, 0, W, H);
      const bg = talimBg; let fx = -((cx * sc * 0.06) % 2400) - 600; const fs = H / 620; for (let i = 0; i < 3; i++) x.drawImage(bg.far, fx * fs + i * 2400 * fs, H * 0.38 + (cy - 12) * sc * 0.04, 2400 * fs, 500 * fs);
      for (let i = 0; i < 5; i++) { const px = (((i * 620 + M.time * (8 + i * 3) - cx * sc * 0.1) % (W + 900)) + W + 900) % (W + 900) - 450, k = i % 3; x.globalAlpha = 0.9; x.drawImage(bg.clouds[k], px, H * (0.04 + (i % 4) * 0.1) + (cy - 12) * sc * 0.05, 640 * fs * (0.8 + (i % 2) * 0.5), 300 * fs * (0.8 + (i % 2) * 0.5)); } x.globalAlpha = 1;
      { const sea = x.createLinearGradient(0, H * 0.5, 0, H); sea.addColorStop(0, 'rgba(255,255,255,0)'); sea.addColorStop(0.45, n < 0.5 ? 'rgba(236,246,255,.85)' : 'rgba(150,130,200,.6)'); sea.addColorStop(1, n < 0.5 ? 'rgba(210,230,250,.95)' : 'rgba(90,80,150,.8)'); x.fillStyle = sea; x.fillRect(0, H * 0.5, W, H * 0.5);
        for (let i = 0; i < 7; i++) { const k = i % 3, w = 640 * fs * 1.5, px = (((i * 410 + M.time * 5 - cx * sc * 0.2) % (W + w)) + W + w) % (W + w) - w; x.drawImage(bg.clouds[k], px, H * (0.56 + (i % 3) * 0.1) + (cy - 12) * sc * 0.12, w, 300 * fs * 1.5); } }
      bg.isles.forEach((im, i) => { const wx = [6, 34, 60][i], wy = [20, 24, 19][i], k = 0.4 + i * 0.07, px = W / 2 + (wx - cx) * sc * k, py = H / 2 - (wy - cy) * sc * k, s = sc * 0.014 * (1 + i * 0.25); x.drawImage(im, px - 260 * s, py - 150 * s + Math.sin(M.time * 0.5 + i) * 6, 520 * s, 420 * s); });
      const pole = (wx, im) => { const gy = groundBelow(T, wx, FH - 1) || topH(wx), w = 1.7 * sc, h = 4.6 * sc; x.drawImage(im, X(wx) - w * 0.2, Y(gy) - h + 4, w, h); }; pole(6.4, poles[0]); pole(57.2, poles[1]);
      for (const wx of [3.9, 60.2]) { const ty = topH(wx + (wx < 30 ? 0.6 : -0.6)) - 0.3; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(X(wx) - 0.35 * sc, Y(ty), 0.7 * sc, H); x.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 9; i++) { const yy = ((M.time * 9 + i * 2.3) % 20); x.fillRect(X(wx) - 0.3 * sc + (i % 3) * 0.2 * sc, Y(ty - yy), 0.09 * sc, 1.1 * sc); } }
      for (const p of talimProps) { const gy = groundBelow(T, p.x, FH - 1); if (gy === null || gy < topH(p.x) - 2.2) continue; x.drawImage(p.im, X(p.x) - p.w * sc / 2, Y(gy) - p.h * sc + 0.12 * sc, p.w * sc, p.h * sc); p.gy = gy; } }
    /* D.sayfa: kare sayfalı canlandırma (ör. Şahmeran V3.1): { src, cw, ch, sutun, px, py, kare(a, t) }; px-py hücredeki ayak noktası, boy = a.h */
    const spr = (a) => { const D = a.D, S = D.spr, P = D.sayfa; let key = P ? P.src : a.anim === 'atk' && S.atk ? S.atk : a.anim === 'hit' && S.hit ? S.hit : (D.durum && D.durum(a)) || (S.idle2 && Math.floor(M.time * 1.6) % 2 ? S.idle2 : S.idle); const im = imgs[key] || imgs[S.idle]; if (!im) return;
      const kr = P ? P.kare(a, M.time) : 0, kk = P ? a.h * sc / P.py : 0, sr = P ? [(kr % P.sutun) * P.cw, Math.floor(kr / P.sutun) * P.ch, P.cw, P.ch] : [0, 0, im.naturalWidth, im.naturalHeight];
      const h = P ? P.ch * kk : a.h * sc * (D.buyut && D.buyut[key] || 1), w = P ? P.cw * kk : h * im.naturalWidth / im.naturalHeight, ox = P ? -P.px * kk : -w * (D.cx || 0.5), oy = P ? -P.py * kk : -h * (D.taban || 0.97), bob = a.ucan ? Math.sin(M.time * 2.2 + a.x) * 0.18 * sc : (P ? 0 : Math.sin(M.time * 1.3 + a.x) * 0.012 * h), f = (a.face || -1) * (D.yon || 1), lg = a.lunge > 0 ? Math.sin(a.lunge / 0.5 * Math.PI) * 0.5 * sc * (a.face || -1) : 0, dal = D.dal ? D.dal(a) : 0;
      x.save(); x.translate(X(a.x) + lg + (a.hurtT > 0.3 ? (Math.random() - 0.5) * 0.14 * sc : 0), Y(a.y) + bob + dal * sc); if (a.dead && !(P && P.ceset)) { x.globalAlpha = Math.max(0, 1 - a.olu / 0.9); x.translate(0, a.olu * 0.9 * sc); } x.scale(f, 1);
      if (!a.ucan && !D.suda && !a.dead) { x.fillStyle = 'rgba(4,6,20,.35)'; x.beginPath(); x.ellipse(0, 2, w * 0.36, 0.2 * sc, 0, 0, 6.3); x.fill(); }
      x.drawImage(im, sr[0], sr[1], sr[2], sr[3], ox, oy, w, h);
      if (a.hurtT > 0.36) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = (a.hurtT - 0.36) / 0.14 * 0.75; x.drawImage(im, sr[0], sr[1], sr[2], sr[3], ox, oy, w, h); x.globalCompositeOperation = 'source-over'; } x.restore();
      if (a.tur === 'boss' && a.kalkan > 0 && !a.dead) { x.strokeStyle = 'rgba(255,224,138,' + (0.5 + 0.2 * Math.sin(M.time * 3)) + ')'; x.lineWidth = 0.08 * sc; x.setLineDash([0.5 * sc, 0.28 * sc]); x.lineDashOffset = -M.time * sc * 0.6; x.beginPath(); x.ellipse(X(a.x), Y(a.y + a.h * 0.5), a.h * 0.42 * sc, a.h * 0.56 * sc, 0, 0, 6.3); x.stroke(); x.setLineDash([]); } };
    if (M.boss && M.boss.D.arkada && (!M.boss.dead || M.boss.olu < 0.9)) { spr(M.boss); if (M.boss.D.cizArka) M.boss.D.cizArka(M.boss, x, M.view, API); }
    if (M.cfg.ozel && M.cfg.ozel.cizArka) M.cfg.ozel.cizArka(x, M.view, API);
    for (const p of M.props) { if (p.dead) continue; const im = imgs[p.im]; const gy = groundBelow(T, p.x, p.y + 1.5); if (gy != null) p.y = gy; if (im) { const h = p.h * sc, w = h * im.naturalWidth / im.naturalHeight; x.drawImage(im, X(p.x) - w / 2, Y(p.y) - h * 0.96, w, h); } else if (p.ciz) p.ciz(x, X(p.x), Y(p.y), sc, M.time); }
    if (!shI || T.delik) x.drawImage(T.c, X(0), Y(FH), FW * sc, FH * sc);
    // yerdeki işaretler: lav havuzları ve tehlike bölgesi (durağan halka; içindeki çizgiler yavaşça döner)
    for (const l of M.lav) { const g = x.createRadialGradient(X(l.x), Y(l.y), 0, X(l.x), Y(l.y), l.r * sc); g.addColorStop(0, 'rgba(255,200,90,.75)'); g.addColorStop(0.6, 'rgba(255,110,30,.45)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(X(l.x), Y(l.y), l.r * sc, l.r * sc * 0.45, 0, 0, 6.3); x.fill(); }
    for (const z of M.bolge) { if (M.boss && M.boss.D.isaretGizli) continue;   /* işareti gizli boss (Şahmeran): bölge yine işler, yalnız çizilmez */
      const col = EL[z.el] || EL.venom, gy = yerY(z.x), rc = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ','; x.fillStyle = rc + '.14)'; x.beginPath(); x.ellipse(X(z.x), Y(gy), z.r * sc, z.r * sc * 0.3, 0, 0, 6.3); x.fill(); x.strokeStyle = rc + '.95)'; x.lineWidth = Math.max(2, 0.07 * sc); x.setLineDash([0.45 * sc, 0.3 * sc]); x.lineDashOffset = -M.time * sc * 0.5; x.stroke(); x.setLineDash([]);
      x.fillStyle = rc + '.9)'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(X(z.x + s * z.r), Y(gy) - 0.9 * sc); x.lineTo(X(z.x + s * z.r) - 0.16 * sc, Y(gy) - 1.3 * sc); x.lineTo(X(z.x + s * z.r) + 0.16 * sc, Y(gy) - 1.3 * sc); x.closePath(); x.fill(); x.fillRect(X(z.x + s * z.r) - 1, Y(gy) - 0.9 * sc, 2, 0.9 * sc); } }
    for (const a of M.act) if (a.tur === 'mob' && (!a.dead || a.olu < 0.9 || (a.D.sayfa && a.D.sayfa.ceset))) spr(a);
    if (M.boss && !M.boss.D.arkada && (!M.boss.dead || M.boss.olu < 0.9)) spr(M.boss);
    // topçular: pişmiş savaş kareleri
    const SETS = window.EO2_BATTLE.sets;
    for (const a of M.act) { if (a.tur !== 'topcu') continue; const m = SETS[a.set], im = imgs['assets/battle_' + a.set + '.webp'], q = clamp(Math.round(a.angle / 5) * 5, -10, 70);
      let key = 'aim_' + q; if (a.dead || a.hurtT > 0) key = a.hurtT > 0.3 ? 'hurt_0' : 'hurt_1'; else if (a.fireT < 0.09) key = 'fire0_' + q; else if (a.fireT < 0.24) key = 'fire1_' + q; else if (a.moving) key = 'walk_' + (Math.floor(a.ph * 16) % 16);
      const i = m.frames[key], sx = (i % m.cols) * m.cw, sy = Math.floor(i / m.cols) * m.ch, s = K * sc;
      if (!a.fall && !a.dead) { x.fillStyle = 'rgba(10,8,30,.34)'; x.beginPath(); x.ellipse(X(a.x), Y(a.y) + 2, 0.75 * sc, 0.16 * sc, 0, 0, 6.3); x.fill(); }
      if (a.shield > 0 && !a.dead) { x.strokeStyle = 'rgba(255,224,138,.7)'; x.fillStyle = 'rgba(255,224,138,.08)'; x.lineWidth = 0.06 * sc; x.beginPath(); x.ellipse(X(a.x), Y(a.y + 0.95), 1.05 * sc, 1.25 * sc, 0, 0, 6.3); x.fill(); x.stroke(); }
      if (a.capa) { x.strokeStyle = 'rgba(127,232,216,.9)'; x.lineWidth = 0.07 * sc; x.beginPath(); x.moveTo(X(a.x - 0.5), Y(a.y + 0.4)); x.lineTo(X(a.x - 0.9), Y(a.y - 0.25)); x.stroke(); }
      x.save(); x.translate(X(a.x), Y(a.y)); if (a.dead) { x.globalAlpha = 0.85; x.rotate(a.face * -0.5); } x.scale(a.face, 1);
      x.drawImage(im, sx, sy, m.cw, m.ch, -m.ax * s, -m.ay * s + 3, m.cw * s, m.ch * s);
      if (a.hurtT > 0.42) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = (a.hurtT - 0.42) / 0.13 * 0.8; x.drawImage(im, sx, sy, m.cw, m.ch, -m.ax * s, -m.ay * s + 3, m.cw * s, m.ch * s); x.globalCompositeOperation = 'source-over'; } x.restore();
      if (a.yoldas && !a.dead) { x.font = '700 ' + Math.max(11, 0.3 * sc) + "px 'Alegreya Sans', sans-serif"; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#06202a'; x.fillStyle = '#9fe8d0'; x.strokeText(a.ad, X(a.x), Y(a.y + 2.55 + (a.cubukKay || 0))); x.fillText(a.ad, X(a.x), Y(a.y + 2.55 + (a.cubukKay || 0))); } }
    if (shI) { const kk = sc / sh.ppu, ih = shI.naturalHeight * kk, iy = Y(sh.taban || 0) - ih; for (const k of M.katman) if (k.z > 0) x.drawImage(k.cv || k.im, X(0), iy, shI.naturalWidth * kk, ih); }   // 1 ve üstü: oyuncunun önü
    // zayıf nokta nişanı: güç toplarken ya da boss açık verdiğinde
    const b = M.boss; if (b && !b.dead && b.D.zayif && !b.D.isaretGizli && (M.charging && M.aktif === M.ben || b.acik)) for (const z of b.D.zayif(b)) { x.strokeStyle = b.acik ? 'rgba(143,255,224,.95)' : 'rgba(255,224,138,.9)'; x.lineWidth = Math.max(2, 0.05 * sc); x.setLineDash([0.16 * sc, 0.16 * sc]); x.beginPath(); x.arc(X(z.x), Y(z.y), z.r * sc, 0, 6.3); x.stroke(); x.setLineDash([]); x.font = '800 ' + Math.max(11, 0.34 * sc) + "px 'Alegreya Sans', sans-serif"; x.textAlign = 'center'; x.fillStyle = '#ffe08a'; x.strokeStyle = '#0f1a40'; x.lineWidth = 3; x.strokeText(z.ad, X(z.x), Y(z.y + z.r) - 6); x.fillText(z.ad, X(z.x), Y(z.y + z.r) - 6); }
    // nişan çizgisi ve yörünge ipucu (yalnız oyuncunun sırası)
    const me = M.ben; if (M.aktif === me && M.faz === 'nisan' && !me.fall && !M.over) { const mz = muzzleOf(me), ang = me.angle * Math.PI / 180, p = M.charging ? Math.max(0.12, M.charge) : (me.lastPower > 0 ? me.lastPower : 0.55), sp = 8.5 + p * 19.5, rz = M.wind * RUZ * (me.el === 'firtina' || me.el2 === 'firtina' ? 0.5 : 1); let px = mz[0], py = mz[1], vx = Math.cos(ang) * sp * me.face, vy = Math.sin(ang) * sp;
      for (let i = 0; i < 16; i++) { for (let k = 0; k < 3; k++) { vx += rz / 60; vy -= G / 60; px += vx / 60; py += vy / 60; } if (solid(T, px, py)) break; const a = (1 - i / 16) * (M.charging ? 0.95 : 0.5); x.fillStyle = 'rgba(255,255,255,' + a + ')'; x.beginPath(); x.arc(X(px), Y(py), Math.max(2, (0.11 - i * 0.004) * sc), 0, 6.3); x.fill(); x.strokeStyle = 'rgba(33,50,112,' + a + ')'; x.lineWidth = 1.5; x.stroke(); } }
    const mermiler = M.hayalet && M.hayalet.length ? M.shots.concat(M.hayalet) : M.shots;
    for (const s of mermiler) { s.trail.forEach((t, i) => { const k = i / s.trail.length; x.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${k * k * 0.75})`; x.beginPath(); x.arc(X(t[0]), Y(t[1]), (0.04 + k * 0.2) * sc, 0, 6.3); x.fill(); if (k > 0.55) { x.fillStyle = `rgba(255,246,214,${(k - 0.55) * 1.6})`; x.beginPath(); x.arc(X(t[0]), Y(t[1]), (k * 0.1) * sc, 0, 6.3); x.fill(); } }); }
    x.globalCompositeOperation = 'lighter';
    for (const s of mermiler) { const rr = (s.pow ? 1.05 : 0.75) * sc, g = x.createRadialGradient(X(s.x), Y(s.y), 0, X(s.x), Y(s.y), rr); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, `rgba(${s.col[0]},${s.col[1]},${s.col[2]},.9)`); g.addColorStop(1, `rgba(${s.col[0]},${s.col[1]},${s.col[2]},0)`); x.fillStyle = g; x.beginPath(); x.arc(X(s.x), Y(s.y), rr, 0, 6.3); x.fill(); }
    for (const l of M.isin) { const k = l.t / l.max; x.strokeStyle = `rgba(${l.col[0]},${l.col[1]},${l.col[2]},${k})`; x.lineWidth = (0.1 + 0.25 * k) * sc; x.lineCap = 'round'; x.beginPath(); x.moveTo(X(l.x1), Y(l.y1)); x.lineTo(X(l.x2), Y(l.y2)); x.stroke(); x.strokeStyle = `rgba(255,255,240,${k})`; x.lineWidth = 0.06 * sc; x.stroke(); }
    for (const p of M.parts) { const k = p.life / p.max; if (p.k === 'flash') { const g = x.createRadialGradient(X(p.x), Y(p.y), 0, X(p.x), Y(p.y), p.s * sc); g.addColorStop(0, `rgba(255,250,225,${k})`); g.addColorStop(0.4, `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${k * 0.8})`); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * sc, 0, 6.3); x.fill(); }
      else if (p.k === 'ember') { x.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${k})`; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * sc, 0, 6.3); x.fill(); }
      else if (p.k === 'ring') { const cl = p.col || [255, 240, 210]; x.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${k * 0.8})`; x.lineWidth = 0.18 * sc * k; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * (1.1 + (1 - k) * 1.3) * sc, 0, 6.3); x.stroke(); } }
    x.globalCompositeOperation = 'source-over';
    for (const p of M.parts) { const k = p.life / p.max; if (p.k === 'smoke') { x.fillStyle = `rgba(245,238,230,${k * 0.5})`; x.beginPath(); x.arc(X(p.x), Y(p.y), p.s * (1.6 - k * 0.6) * sc, 0, 6.3); x.fill(); }
      else if (p.k === 'chunk') { x.save(); x.translate(X(p.x), Y(p.y)); x.rotate(p.rot + p.life * 6); x.fillStyle = Tm.kirik; x.strokeStyle = Tm.cizgi; x.lineWidth = 1.5; x.globalAlpha = Math.min(1, k * 2); x.fillRect(-p.s * sc, -p.s * sc, p.s * 2 * sc, p.s * 2 * sc); x.strokeRect(-p.s * sc, -p.s * sc, p.s * 2 * sc, p.s * 2 * sc); x.restore(); } }
    if (M.cfg.ozel && M.cfg.ozel.cizOn) M.cfg.ozel.cizOn(x, M.view, API);
    // ortam: yaprak (talim), kor (kaldera), spor (sırça), yağmur (donanma), toz (kervan)
    const ort = M.cfg.ortam || 'yaprak';
    for (const p of M.ortam) { const tt = M.time; if (ort === 'yaprak') { const px = ((p.x + tt * 0.02 * p.s + M.wind * tt * 0.004) % 1 + 1) % 1 * W, py = ((p.y + tt * 0.03 * p.s) % 1) * H; x.save(); x.translate(px, py); x.rotate(tt * 2 * p.s + p.p); x.fillStyle = 'rgba(247,168,204,.85)'; x.beginPath(); x.ellipse(0, 0, 7 * p.s * dpr, 3.6 * p.s * dpr, 0, 0, 6.3); x.fill(); x.restore(); }
      else if (ort === 'yagmur') { const px = ((p.x + tt * 0.09 * p.s + M.wind * tt * 0.02) % 1 + 1) % 1 * W, py = ((p.y + tt * 0.9 * p.s) % 1) * H; x.strokeStyle = 'rgba(190,230,255,.35)'; x.lineWidth = 1.2 * dpr; x.beginPath(); x.moveTo(px, py); x.lineTo(px - (4 - M.wind * 3) * dpr, py + 22 * p.s * dpr); x.stroke(); }
      else { const yukari = ort === 'kor' || ort === 'spor', px = ((p.x + Math.sin(tt * 0.4 + p.p) * 0.02 + M.wind * tt * 0.004) % 1 + 1) % 1 * W, py = (((yukari ? 1 - p.y - tt * 0.035 * p.s : p.y + tt * 0.012 * p.s) % 1) + 1) % 1 * H, al = 0.35 + 0.35 * Math.sin(tt * 1.3 + p.p * 3); x.fillStyle = ort === 'kor' ? `rgba(255,${150 + Math.round(60 * p.s)},70,${al + 0.2})` : ort === 'spor' ? `rgba(150,255,210,${al})` : `rgba(255,230,180,${al * 0.6})`; x.beginPath(); x.arc(px, py, (ort === 'toz' ? 1.6 : 2.2) * p.s * dpr, 0, 6.3); x.fill(); } }
    if (n > 0.02) { x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgba(${Math.round(lerp(255, 132, n))},${Math.round(lerp(255, 128, n))},${Math.round(lerp(255, 196, n))},1)`; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
    if (!bgI && n > 0.05) { x.globalCompositeOperation = 'lighter'; for (const p of talimProps) if (p.lamp && p.gy !== undefined) { const lx = X(p.x), ly = Y(p.gy + 2.97), g = x.createRadialGradient(lx, ly, 0, lx, ly, 3.2 * sc); g.addColorStop(0, 'rgba(255,190,90,' + 0.75 * n + ')'); g.addColorStop(0.3, 'rgba(255,150,60,' + 0.3 * n + ')'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; x.beginPath(); x.arc(lx, ly, 3.2 * sc, 0, 6.3); x.fill(); } x.globalCompositeOperation = 'source-over'; }
    if (M.flash > 0) { x.fillStyle = 'rgba(255,244,214,' + Math.min(0.5, M.flash) + ')'; x.fillRect(0, 0, W, H); }
    // ekran dışındaki hedefi gösteren ok
    { const o = M.aktif === M.ben || !M.aktif ? (M.hedef && !M.hedef.dead ? M.hedef : M.act.find(a => a.takim === 1 && !a.dead)) : null; if (o && M.faz === 'nisan') { const ox = X(o.x); if (ox > W - 30 || ox < 30) { const right = ox > W / 2, ex = right ? W - 92 * dpr : 92 * dpr, ey = clamp(Y(o.y + 1), H * 0.24, H * 0.6), d = Math.round(Math.abs(o.x - M.ben.x) * 1.5), bw = 150 * dpr, bh = 40 * dpr;
      x.fillStyle = 'rgba(10,16,46,.86)'; x.strokeStyle = 'rgba(255,215,106,.85)'; x.lineWidth = 1.5 * dpr; x.beginPath(); x.roundRect(ex - bw / 2, ey - bh / 2, bw, bh, bh / 2); x.fill(); x.stroke();
      x.fillStyle = '#fff6dc'; x.font = '700 ' + 16 * dpr + "px 'Alegreya Sans', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((right ? '' : '◀ ') + (o.tur === 'topcu' ? 'Rakip ' : 'Hedef ') + d + ' adım' + (right ? ' ▶' : ''), ex, ey + 1); } } }
    // baş üstü: can çubukları; hasar ve bilgi yazıları
    x.textAlign = 'center'; x.textBaseline = 'middle';
    /* yan yana duran topçuların can çubukları üst üste binmesin: soldan sağa, binen çubuk (adıyla birlikte) bir kat yukarı alınır */
    { const L = M.act.filter(a => a.tur === 'topcu' && !a.dead).sort((p, q) => p.x - q.x); let on = null; for (const a of L) { a.cubukKay = on && a.x - on.x < 1.95 && Math.abs(a.y - on.y) < 0.7 && !on.cubukKay ? 0.8 : 0; on = a; } }
    for (const a of M.act) { if (a.dead || a.tur === 'boss') continue; const px = X(a.x), py = Y(a.y + (a.tur === 'topcu' ? 2.25 + (a.cubukKay || 0) : a.h + 0.25)), w = 1.7 * sc, h = Math.max(7, 0.2 * sc), o = clamp(a.hp / a.max, 0, 1), o2 = clamp(a.shown / a.max, 0, 1);
      x.fillStyle = 'rgba(10,16,46,.85)'; x.beginPath(); x.roundRect(px - w / 2 - 3, py - h / 2 - 3, w + 6, h + 6, h); x.fill(); x.fillStyle = '#f6efe0'; x.beginPath(); x.roundRect(px - w / 2, py - h / 2, w * o2, h, h / 2); x.fill();
      x.fillStyle = a.takim === 0 ? '#58d06a' : '#ef5b4d'; x.beginPath(); x.roundRect(px - w / 2, py - h / 2, w * o, h, h / 2); x.fill(); x.strokeStyle = 'rgba(255,215,106,.8)'; x.lineWidth = 1.5; x.beginPath(); x.roundRect(px - w / 2 - 3, py - h / 2 - 3, w + 6, h + 6, h); x.stroke();
      if (M.aktif === a && M.faz === 'nisan') { const yy = py - h - 0.42 * sc; x.fillStyle = '#ffe08a'; x.strokeStyle = '#0f1a40'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(px - 0.22 * sc, yy - 0.2 * sc); x.lineTo(px + 0.22 * sc, yy - 0.2 * sc); x.lineTo(px, yy + 0.12 * sc); x.closePath(); x.fill(); x.stroke(); } }
    for (const d of M.nums) { const k = d.t / 1.5, py = Y(d.y + k * 1.6), s = Math.max(d.kucuk ? 13 * dpr : 16 * dpr, (d.kucuk ? 0.4 : d.crit ? 0.95 : 0.7) * sc) * (k < 0.12 ? 0.6 + k * 3.4 : 1); x.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; x.font = `800 ${s}px ${d.kucuk ? "'Alegreya Sans', sans-serif" : "'Alegreya SC', Georgia, serif"}`; x.lineWidth = s * 0.18; x.strokeStyle = '#0f1a40'; x.lineJoin = 'round'; const tw = x.measureText(String(d.v)).width / 2 + 10, px = tw * 2 > W ? W / 2 : clamp(X(d.x), tw, W - tw); x.strokeText(String(d.v), px, py); x.fillStyle = d.col || (d.crit ? '#ffd24a' : '#fff'); x.fillText(String(d.v), px, py); } x.globalAlpha = 1;
    // boss konuşma balonu, sahibinin üstünde durur
    if (M.balon) { const a = M.balon.a, el = $('tpBalon'), r = cv.getBoundingClientRect(), bx = clamp(X(a.x) / W, 0.2, 0.8) * r.width, by = clamp(Y(a.y + a.h + 0.6) / H, r.height < 560 ? 0.42 : 0.24, 0.62) * r.height; const yari = el.offsetWidth / 2 + 8; el.style.left = clamp(bx, yari, Math.max(yari, r.width - yari)) + 'px'; el.style.top = by + 'px'; }
  }

  /* ---------- giriş/çıkış ---------- */
  const KEY = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', ' ': 'fire' };
  const onKey = dn => e => { if (!M || !M.on || document.querySelector('.pen-perde, .cizgi')) return; const k = e.key.toLowerCase(), m = KEY[k]; if (m) { M.keys[m] = dn; e.preventDefault(); e.stopPropagation(); } else if (dn && /^[0-9]$/.test(k)) { const i = k === '0' ? 9 : +k - 1; beceri(M.ben, BECERI_SIRA[i]); } else if (dn && k === 'escape') { e.stopPropagation(); if (M.cikis) M.cikis(); } };
  const kd = onKey(true), ku = onKey(false);
  function kapat(sessiz) { if (!M) return; const m = M; M.on = false; removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); const el = $('tpSavas'); if (el) el.hidden = true; $('app').classList.remove('fight'); ses('battle', false); if (!m.over) { m.over = true; m.bitir({ zafer: false, terk: true, ist: m.ist }); } M = null; if (!sessiz) yay('kapandi', {}); }
  /* ağdan gelen rakip komutu (2. aşama): { t: 'ates', x, y, aci, guc, yon, mod } · { t: 'isabet', hasar, it } · { t: 'can', hp } · { t: 'pas' } · { t: 'ruzgar', deger } */
  function uzakUygula(c) { const r = M.rakip; if (c.t === 'ates') { if (c.x != null) r.x = c.x; if (c.y != null) { r.y = c.y; r.fall = false; r.vy = 0; } r.angle = c.aci; r.face = c.yon || -1; r.mods = c.mod || {}; ates(r, c.guc, true); } else if (c.t === 'pas') siradaki(); }
  function uzak(c) { if (!M || !M.on || M.over || !M.rakip || M.rakip.kontrol !== 'uzak') return false; const r = M.rakip, p = M.ben;
    if (c.t === 'ates' || c.t === 'pas') M.uzakKuyruk.push(c);      // rakibin sırası bu uçta başlayınca uygulanır
    else if (c.t === 'isabet') hasarTopcu(p, c.hasar, { delici: !!c.delici, kalkanK: 0.55, crit: !!c.bas, it: 0.5, yon: c.it || -1 });
    else if (c.t === 'can') { if (c.max) r.max = c.max; r.hp = clamp(c.hp, 0, r.max); hud(true); }
    else if (c.t === 'konum') { if (!M.shots.length && !r.fall) { r.x = c.x; if (c.y != null) r.y = c.y; } if (M.aktif === r && M.faz === 'nisan') { r.angle = c.aci; r.face = c.yon || r.face; } }
    else if (c.t === 'ruzgar') yeniRuzgar(c.deger); else return false; return true; }
  /* sunucunun bildirdiği sonuç (pvp_match_end): maç bu uçta da biter */
  function sonlandir(zafer) { if (!M || !M.on || M.over) return; if (M.rakip && zafer) { M.rakip.hp = 0; M.rakip.dead = true; } bitir(!!zafer); }
  /* ---------- ortak sefer (js/zindan_ortak.js): düşman canı sunucuda tektir ----------
     Giden: dinle('dusman_hasar', { i, h }) bu oyuncunun bir düşmana verdiği hasar (i: M.act sırası).
     Gelen: ortakHasar(i, h, ad) bir yoldaşın hasarı (sayı ve ad düşmanın üstünde görünür; bu oyuncunun istatistiğine ve öfkesine yazılmaz);
            ortakCan(i, hp) sunucudaki can (yalnız aşağı doğru eşitler). Son düşman bir yoldaşın elinden düşerse maç burada da zaferle biter. */
  function ortakHasar(i, h, ad) { if (!M || !M.on || M.over) return false; const e = M.act[i]; h = Math.round(h); if (!e || e.takim !== 1 || e.dead || !(h > 0)) return false; M.uzakHasar = true;
    try { if (e.tur === 'boss') hasarBoss(e, h, true, ad || 'Yoldaş'); else hasarMob(e, h, { not: ad || 'Yoldaş', col: '#9fd8ff' }); } finally { M.uzakHasar = false; }
    hud(true); if (!dusmanKaldi()) bitir(true); return true; }
  /* yoldaşlar: aynı seferdeki öteki oyuncuların topçuları bu ekranda da durur, nişan alır ve ateş eder. Yalnız görüntüdür:
     sıraya girmezler, düşman onları hedef almaz, mermileri hasar yazmaz (hasar sunucudan ortakHasar ile gelir). Mermi, atanın
     ekranındaki rüzgârla uçar ki onun gördüğü yere düşsün; düştüğü yerde patlama görünür ve (zemin kırılabiliyorsa) çukur açılır.
       yoldasKoy(kimlik, { ad, set, el, x, y, aci, yon, hp, max, dustu })   topçuyu kurar ya da günceller
       yoldasAtes(kimlik, { x, y, aci, guc, yon, ruz, mod })                atışını gösterir */
  function yoldasKoy(id, o) { if (!M || !M.on) return null; o = o || {}; M.yoldas = M.yoldas || {}; let a = M.yoldas[id];
    if (!a) { const n = Object.keys(M.yoldas).length, set = imgs['assets/battle_' + o.set + '.webp'] ? o.set : M.ben.set, x0 = clamp(M.ben.x + (n % 2 ? 1 : -1) * (1.9 + Math.floor(n / 2) * 1.7), 1.7, FW - 1.7);
      a = mkTopcu({ takim: o.takim === 1 ? 1 : 0, yid: id, kontrol: 'yoldas', yoldas: true, ad: String(o.ad || 'Yoldaş').slice(0, 16), set, x: x0, face: o.takim === 1 ? -M.ben.face : M.ben.face, col: EL[o.el] || EL.ates, revive: 0 }); a.y = yerY(a.x); M.yoldas[id] = a; M.act.push(a); }
    else { if (o.ad) a.ad = String(o.ad).slice(0, 16); if (o.set && !a.gorKod && a.set !== o.set && imgs['assets/battle_' + o.set + '.webp']) a.set = o.set; }   /* yoldaşın yer bildirimi adından önce geldiyse ad ve set sonradan tamamlanır */
    if (o.gor) gorGiy(a, o.gor);
    if (typeof o.x === 'number') { a.moving = Math.abs(o.x - a.x) > 0.02; a.x = clamp(o.x, 1.7, FW - 1.7); a.y = typeof o.y === 'number' ? o.y : yerY(a.x); a.fall = false; a.vy = 0; }
    if (typeof o.aci === 'number') a.angle = clamp(o.aci, -10, 70); if (o.yon === 1 || o.yon === -1) a.face = o.yon;
    if (typeof o.max === 'number' && o.max > 0) { const yeni = clamp(o.hp || 0, 0, o.max), fark = a.canBilindi ? Math.round(a.hp - yeni) : 0; a.max = o.max; a.hp = yeni; if (!a.canBilindi) a.shown = yeni; a.canBilindi = true;
      if (fark >= 1) { a.hurtT = 0.55; yazi(a.x, a.y + 2.3, fark, { col: '#ff9a8a' }); } else if (fark <= -1) yazi(a.x, a.y + 2.7, '+' + (-fark), { col: '#8ff0a4' });
      if (yeni > 0 && a.dead && !a.dustuKesin) { a.dead = false; toz(a.x, a.y + 1, 20, [255, 215, 106]); } else if (yeni <= 0 && !a.dead) a.dead = true; }
    if (o.dustu) { a.dead = true; a.dustuKesin = true; a.hp = 0; } else if (o.dustu === false) { a.dead = false; a.dustuKesin = false; } return a; }
  function yoldasAtes(id, c) { const a = M && M.on && M.yoldas && M.yoldas[id]; if (!a || a.dead || M.over) return false; yoldasKoy(id, c); M.hayalet = M.hayalet || [];
    const md = c.mod || {}, pow = !!md.powUlt, dalga = pow ? 3 : 1 + (md.plus1 ? 1 : 0) + (md.plus2 ? 2 : 0), sac = md.trident ? [-6, 0, 6] : [0], sp = 8.5 + clamp(+c.guc || 0, 0, 1) * 19.5, base = a.angle, face = a.face, r = (md.crater ? 88 : 54) * (pow ? 1.35 : 1) / 54 * 1.5;
    const salla = () => { if (!M || !M.on || M.over) return; const mz = muzzleOf(a); for (const d of sac) { const ang = (base + d) * Math.PI / 180; M.hayalet.push({ x: mz[0], y: mz[1], vx: Math.cos(ang) * sp * face, vy: Math.sin(ang) * sp, col: a.col, r, t: 0, trail: [], ruz: 1, wind: +c.ruz || 0, pow, by: a, lav: c.el === 'ates', teleport: !!md.teleport && d === 0 && !a.isinAtti }); if (md.teleport) a.isinAtti = true; }
      a.fireT = 0; for (let i = 0; i < 8; i++) M.parts.push({ k: 'smoke', x: mz[0], y: mz[1], vx: face * (1 + Math.random() * 3) + (Math.random() - 0.5), vy: Math.random() * 1.6, life: 0.7 + Math.random() * 0.5, max: 1.2, s: 0.3 + Math.random() * 0.3 });
      M.parts.push({ k: 'flash', x: mz[0], y: mz[1], vx: 0, vy: 0, life: 0.14, max: 0.14, s: pow ? 2.2 : 1.5, col: a.col }); ses('fire'); };
    a.isinAtti = false; salla(); for (let w = 1; w < dalga; w++) sonra(w * 0.18, salla);
    if (M.cfg.ortak && M.aktif === a && M.faz === 'nisan') { M.faz = 'ucus'; M.pt = 0; M.bekle = (dalga - 1) * 0.18 + 0.05; hud(true); } return true; }
  /* yoldaşın güllesinin açtığı oyuk: atanın ekranındaki yer (ortak savaş). Yoldaşların düştüğü yer de buna göre düzelir. */
  function yoldasOyuk(o) { if (!M || !M.on || M.over || !o) return; const x = +o.x, y = +o.y, r = clamp(+o.r || 0, 0.2, 6); if (!Number.isFinite(x) || !Number.isFinite(y)) return; carve(M.T, x, y, r, true); for (const a of M.act) if (!a.dead && !a.ucan && Math.abs(a.x - x) < r + 1) a.fall = true; }
  function stepHayalet(dt) { for (let i = M.hayalet.length - 1; i >= 0; i--) { const s = M.hayalet[i]; let hit = false;
      for (let k = 0; k < 4 && !hit; k++) { const h = dt / 4; s.vx += s.wind * RUZ * s.ruz * h; s.vy -= G * h; s.x += s.vx * h; s.y += s.vy * h; s.t += h;
        if (solid(M.T, s.x, s.y)) hit = true; else if (M.deniz != null && s.y < M.deniz) hit = true;
        else for (const a of M.act) { if (a.dead || a.takim !== 1) continue; if (Math.hypot(a.x - s.x, a.y + a.h * 0.5 - s.y) < a.h * (a.tur === 'boss' ? 0.3 : 0.42)) { hit = true; break; } }
        if (s.x < -8 || s.x > FW + 8 || s.y < -6 || s.t > 12) { M.hayalet.splice(i, 1); hit = null; break; } }
      if (hit === null) continue; s.trail.push([s.x, s.y]); if (s.trail.length > 26) s.trail.shift();
      if (hit && s.teleport && s.by && !s.by.dead) { M.hayalet.splice(i, 1); const by = s.by; by.x = clamp(s.x, 1.7, FW - 1.7); by.y = Math.max(s.y, yerY(by.x)); yazi(by.x, by.y + 2.6, 'Kanat Uçuşu', { col: '#ffe08a' }); toz(by.x, by.y + 0.8, 16, [255, 224, 138]); ses('chime'); continue; }
      if (hit) { M.hayalet.splice(i, 1); M.hitX = s.x; M.hitY = s.y; if (!M.cfg.ortak) carve(M.T, s.x, s.y, s.r);
        if (s.lav) { const g = groundBelow(M.T, s.x, s.y + 1.5); if (g != null && s.y - g < 2.2) M.lav.push({ x: s.x, y: g, r: u(72), tur: 2, dmg: 0, gorsel: true }); } M.shake = Math.max(M.shake, 0.3); ses('boom', 0.35);
        M.parts.push({ k: 'flash', x: s.x, y: s.y, vx: 0, vy: 0, life: 0.2, max: 0.2, s: s.r * 1.6, col: s.col }, { k: 'ring', x: s.x, y: s.y, vx: 0, vy: 0, life: 0.45, max: 0.45, s: s.r, col: s.col }); } } }
  /* ortak savaşın sırası sunucudan gelir (server/zindan_ortak.js 'sira' olayı):
       ortakSira({ adim, tur, kim: 'ben' | <yoldaş kimliği> | null, i, hedef: 'ben' | <kimlik>, tohum, ruzgar, ex })
     kim doluysa o oyuncunun sırasıdır; boşsa i numaralı düşman hedef oyuncuya saldırır. ex: düşmanların yeri (eşitleme).
     Bir adım bu ekranda bitince 'adim_bitti' olayı yayılır; ortakPas(kimlik) sırası süren yoldaşın atış yapmadan geçtiğini bildirir. */
  function ortakSira(o) { if (!M || !M.on || M.over || !M.cfg.ortak || !o || !(o.adim > (M.adim || 0))) return false;
    M.adim = o.adim; if (o.tur) M.tur = o.tur; M.lafT = null; $('tpLaf').hidden = true; M.charging = false; M.charge = 0;
    const dus = M.act.filter(a => a.takim === 1); if (Array.isArray(o.ex)) o.ex.forEach((x, j) => { const e = dus[j]; if (e && !e.dead && typeof x === 'number' && Math.abs(e.x - x) > 0.2) e.x = clamp(x, 1, FW - 1); });
    if (o.kim) { const a = o.kim === 'ben' ? M.ben : M.yoldas && M.yoldas[o.kim]; M.ruzgarGelen = +o.ruzgar || 0; if (!a || (a.yoldas && a.dead)) { siradaki(); return true; } baslat(a); return true; }
    const e = dus[o.i]; M.hedefT = o.hedef === 'ben' ? M.ben : (M.yoldas && M.yoldas[o.hedef]) || M.ben; M.tohum = (o.tohum | 0) || 1;
    if (!e || e.dead) { siradaki(); return true; } M.aktif = e; M.pt = 0; M.plan = null; M.hitX = undefined; if (e.tur === 'boss') bossSira(e); else mobSira(e); hud(true); return true; }
  function ortakPas(id) { if (!M || !M.on || M.over || !M.cfg.ortak) return; const a = M.yoldas && M.yoldas[id]; if (a && M.aktif === a && M.faz === 'nisan') siradaki(); }
  /* sırayı atışsız geçmek (süre dolunca olanın aynısı) */
  function pas() { if (!M || !M.on || M.over || M.faz !== 'nisan' || M.aktif !== M.ben) return false; M.charging = false; M.charge = 0; M.ben.mods = {}; yay('pas', { kim: 0 }); siradaki(); return true; }
  function ortakCan(i, hp) { if (!M || !M.on || M.over) return; const e = M.act[i]; if (e && e.takim === 1 && !e.dead && e.hp - hp >= 1) ortakHasar(i, e.hp - hp, ''); }
  const API = { get M() { return M; }, PX, FW, X_, Y_, u, EL, rnd, clamp, sonra, halka, toz, yazi, balon, pankart, ses, nisanliAt, meteor, hasarTopcu, hasarMob, hasarBoss, tur: () => turNo(), carve: (x, y, r) => carve(M.T, x, y, r), yerY, img: k => imgs[k], isin: (x1, y1, x2, y2, col, sure) => M.isin.push({ x1, y1, x2, y2, col, t: sure || 0.6, max: sure || 0.6 }), sars: k => { M.shake = Math.max(M.shake, k); } };
  const MOB = {}, BOSS = {}, PROP = {};
  /* TEK ARENA YÜKLEYİCİSİ (eo2/docs/ZINDAN_YONTEMI.md): eo2/arenalar/<ad> klasöründen derlenen kaydı savaşın kullanacağı biçime çevirir.
     Zindan aşamaları (js/zindan_ortak.js) ve düello meydanı (js/topcu.js) aynı fonksiyonu kullanır. Arena yoksa null döner. */
  const arenaHazir = {};
  function arenaCfg(ad) { const A = (window.EO2_ARENA || {})[ad]; if (!A || A.eski) return null;   /* çizimsiz arena: js/zindan_ortak.js eski aşamadan kurar */ if (arenaHazir[ad]) return arenaHazir[ad];
    const maske = new Uint8Array(MW * MH); let p = 0; for (let i = 0; i < A.maske.length; i += 2) { if (A.maske[i]) maske.fill(A.maske[i], p, p + A.maske[i + 1]); p += A.maske[i + 1]; }
    return (arenaHazir[ad] = { ad: A.ad, alt: A.alt, ipucu: A.ipucu, tema: A.tema, ortam: A.ortam, en: A.en, kameraBoy: A.kamera ? Math.round(A.kamera.h / 1.7 * 100) / 100 : A.kameraBoy, oyuncu: A.oyuncu, maske,
      sahne: { katman: A.katman, ppu: A.ppu, taban: A.taban, ust: A.sahne.ust, alt: A.sahne.alt }, mobSinir: [1.2 * PX, (A.en - 1.2) * PX],
      moblar: A.dusman.map(m => Object.assign({ tip: m.tip, ad: m.ad, x: m.x * PX, h: m.h, hayalet: m.hayalet }, m.fizik ? {} : { ucan: true, yW: m.y })),
      boss: A.boss ? { tip: A.boss.tip, ad: A.boss.ad, unvan: A.boss.unvan, x: A.boss.x * PX, h: A.boss.h } : null }); }
  /* takım savaşında oyuncunun kendi canı da sunucudan gelir */
  function benCan(hp, max, h, bas) { if (!M || !M.on || M.over) return; const a = M.ben; if (max > 0) a.max = max; const once = a.hp; a.hp = clamp(hp, 0, a.max); if (h > 0 && once > a.hp) { a.hurtT = 0.55; a.vy = 3; a.fall = true; yazi(a.x, a.y + 2.3, h, { crit: !!bas }); M.shake = Math.max(M.shake, 0.4); ses('hit'); } yay('can', { kim: 0, hp: a.hp, max: a.max }); hud(true); }
  function benDus() { if (!M || !M.on || M.over) return; const a = M.ben; if (a.dustuKesin) return; a.hp = 0; a.dead = true; a.dustuKesin = true; a.revive = 0; pankart('Düştün', 'Takımını izliyorsun', 'kayip'); if (M.aktif === a) siradaki(); hud(true); }
  EO2.battle = { benCan, benDus, arenaCfg, ac, kapat, uzak, sonlandir, ipucu, ortakHasar, ortakCan, ortakSira, ortakPas, pas, yoldasKoy, yoldasAtes, yoldasOyuk, dinle: fn => { dinleyen.push(fn); return () => { const i = dinleyen.indexOf(fn); if (i >= 0) dinleyen.splice(i, 1); }; }, MOB, BOSS, PROP, BECERI, api: API, active: () => !!(M && M.on), state: () => M,
    start() { if (EO2.topcu) EO2.topcu.baslat('talim'); }, stop() { kapat(); } };
  const wait = setInterval(() => { if (!EO2.api) return; clearInterval(wait); EO2.frameHooks.push(dt => { if (M && M.on && M.T) { if (!M.dur) update(dt); if (M && M.on) render(); } }); }, 80);
})();
