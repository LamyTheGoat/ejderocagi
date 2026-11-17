// EO2 · savaş ekranındaki Topçu için karakter görünüşü katmanlarını pişirir (2026-11-17, kullanıcı: eksikleri gider → "savaş ekranında saç ve göz görünmüyor").
// Kaynak: prototype/chibi_rig/gate7/index.html (salt okunur; savaş çizicisi). Çizicinin katman tablosu (window.LAYERS) çekim sırasında süzülür;
// böylece gövde, yüz, saç ve kulak AYRI AYRI çizdirilir. Oyunda katmanlar şu sırayla üst üste çizilir (js/gorunum.js savas()):
//   govde_<set>_1 (top, ejder, uzak kol) → sac_.._a (sırttan sarkan saç) → govde_<set>_2 (gövde, bacak) → sac_.._m (omza düşen saç) → govde_<set>_3 (yakın kol, namlu parlaması)
//   → yuz_<goz>_<renk>_<a|b> → sac_.._o (öndeki saç) → kulak_<a|b>
// GÖVDE sayfaları 70 karenin hepsini taşır (set başına üç sayfa).
// BAŞ PARÇALARI (yüz, saç, kulak) AZ HÜCRELİDİR: bu parçalar kareden kareye biçim değiştirmez, yalnız başla birlikte yer değiştirir ve döner. Her parça,
// çizdiği resimler değiştiği kadar hücreyle pişirilir (saç ve kulak tek hücre; yüz her ifade için bir hücre). Her karede hangi hücrenin, hangi dönüşümle
// çizileceği çizicinin o katman için kurduğu dönüşümden okunur: kutu.hucre[katman][kare] ve set[<set>].don[katman][kare] (hücre içi dönüşüm, altı sayı).
// Başın yeri sete göre biraz değiştiği için dönüşümler set başınadır; hücreler ilk setin duruşunda pişirilir. Öz denetim aynı yolla kurulan resmi tam çizimle karşılaştırır.
// Çıktı: eo2/assets/gorunus_savas/*.webp ve eo2/assets/savas_gorunus_atlas.js.
// Kullanım: node eo2/tools/bake_savas_gorunus.mjs     env: SAC=kisa,topuz · RENK=black,blue (deneme için) · SETS=temel,muhafiz · TALL=270
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const rigRoot = path.join(repo, 'prototype', 'chibi_rig'), out = path.join(repo, 'eo2', 'assets', 'gorunus_savas'), hedef = path.join(repo, 'eo2', 'assets', 'savas_gorunus_atlas.js'); fs.mkdirSync(out, { recursive: true });
const SETS = (process.env.SETS || 'temel,muhafiz').split(','), TALL = +(process.env.TALL || 270);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const p = path.join(rigRoot, decodeURIComponent(q.url.split('?')[0])); if (!path.resolve(p).startsWith(rigRoot)) { s.writeHead(403); s.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage({ viewport: { width: 1400, height: 1100 } }), errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/gate7/index.html`); await p.waitForFunction('window.RIG_READY === true', { timeout: 180000 });
const meta = { kutu: null, set: {}, var: {} };
const yaz = () => fs.writeFileSync(hedef, '// tools/bake_savas_gorunus.mjs üretir; elle düzenleme. kutu: ortak kare düzeni ve baş parçalarının hücreleri · set: namlu noktaları ve dönüşümler · var: pişirilmiş katmanlar\nwindow.EO2_SAVAS_GORUNUS = ' + JSON.stringify(meta) + ';\n');
const sec = await p.evaluate(() => ({ sac: Object.keys(window.STYLES.hair), goz: Object.keys(window.STYLES.eyes), sacRenk: window.PALETTE.HAIR.map(q => q[0]), gozRenk: window.PALETTE.EYE.map(q => q[0]) }));
const setSec = async set => { await p.evaluate(s => { const nm = (window.SET_NAMES || {})[s] || s, bt = [...document.querySelectorAll('#slotSet button')].find(x => x.textContent === nm); if (!bt) throw new Error('set yok: ' + s); bt.click(); }, set); await p.waitForTimeout(2500); };
// arka planı ve yer gölgesini atla, kamera ve namlu noktasını yakala (bake_battle.mjs ile aynı); kare listesi, katman süzgeci, dönüşüm yakalama
await p.evaluate(() => { const TR = window.TRIAL, view = TR.view, c = view.getContext('2d'), fr = c.fillRect.bind(c), fl = c.fill.bind(c), W = view.width, H = view.height; window.__cam = {};
  const ident = () => { const m = c.getTransform(); return m.a === 1 && m.d === 1 && m.e === 0 && m.f === 0; };
  c.fillRect = (x, y, w, h) => { if (ident()) { if (x === 0 && w === c.canvas.width && h < 20) window.__cam.gy = y; return; } fr(x, y, w, h); };
  c.fill = (...a) => { if (c.fillStyle instanceof CanvasGradient) { if (window.__cam.x === undefined) window.__cam.x = c.getTransform().e; return; } fl(...a); };
  const rg = c.createRadialGradient.bind(c); c.createRadialGradient = (x0, y0, r0, x1, y1, r1) => { const m = c.getTransform(); if (m.b !== 0 || m.c !== 0 || Math.abs(m.a - m.d) < 1e-6) { const q = m.transformPoint(new DOMPoint(x0, y0)); window.__cam.muzzle = [q.x, q.y]; } return rg(x0, y0, r0, x1, y1, r1); };
  /* çizilen ilk resmin anındaki dönüşüm ve çizilen resimlerin kimlikleri (aynı kimlik dizisi = aynı hücre) */
  const di = c.drawImage.bind(c), kimlik = new WeakMap(); let sayac = 0, iz = null; c.drawImage = (...a) => { if (iz) { if (!iz.don) { const m = c.getTransform(); iz.don = [m.a, m.b, m.c, m.d, m.e, m.f]; } if (!kimlik.has(a[0])) kimlik.set(a[0], ++sayac); iz.imza.push(kimlik.get(a[0])); } return di(...a); };
  const ANGLES = []; for (let a = -10; a <= 70; a += 5) ANGLES.push(a);
  const cyc = 1 / 1.3, list = [{ key: 'idle', clip: 'idle', t: 0.01 }, { key: 'hurt_0', clip: 'hurt', t: 0.12 }, { key: 'hurt_1', clip: 'hurt', t: 0.34 }];
  for (let i = 0; i < 16; i++) list.push({ key: 'walk_' + i, clip: 'walk', t: i * cyc / 16 + 0.001 });
  for (const a of ANGLES) { list.push({ key: 'aim_' + a, clip: 'fire', t: 0.78, o: { aim: a, face: 'neutral' } }); list.push({ key: 'fire0_' + a, clip: 'fire', t: 0.05, o: { aim: a, face: 'auto' } }); list.push({ key: 'fire1_' + a, clip: 'fire', t: 0.19, o: { aim: a, face: 'auto' }, aim: a }); }
  const SAC = ['hairFront', 'fringe', 'hairTop', 'hairOverEar'], YUZ = ['head', 'earPatch', 'face', 'faceAcc', 'earUnderHair'], KULAK = ['ear', 'earTop'], BASLIK = ['hatFront', 'hatBack', 'beard'], ORTA = ['hairBackOver'], ARKA = ['hairBack'];
  const asil = window.LAYERS.slice(), sira = asil.map(L => L.id), iA = sira.indexOf('hairBack'), iM = sira.indexOf('hairBackOver'), iH = sira.indexOf('head');
  if (iA < 0 || iM < iA || iH < iM) throw new Error('katman sırası beklenen gibi değil: ' + sira.join(','));
  const disi = id => SAC.includes(id) || YUZ.includes(id) || KULAK.includes(id) || BASLIK.includes(id) || ORTA.includes(id) || ARKA.includes(id);
  const YUVA = { tam: () => sira.filter(id => !BASLIK.includes(id)), yuz: () => YUZ, kulak: () => KULAK, sacOn: () => SAC, sacOrta: () => ORTA, sacArka: () => ARKA,
    govde1: () => sira.filter((id, i) => i < iA && !disi(id)), govde2: () => sira.filter((id, i) => i > iA && i < iM && !disi(id)), govde3: () => sira.filter((id, i) => i > iM && !disi(id)) };
  const BAS = ['yuz', 'kulak', 'sacOn', 'sacOrta', 'sacArka'], SIRA = ['govde1', 'sacArka', 'govde2', 'sacOrta', 'govde3', 'yuz', 'sacOn', 'kulak'];
  const grab = (f, katman) => { const sec = new Set(YUVA[katman]()); window.LAYERS.length = 0; window.LAYERS.push(...asil.filter(L => sec.has(L.id)));
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.restore(); window.__cam.muzzle = null; iz = { don: null, imza: [] };
    try { TR.film(f.clip, [f.t], Object.assign({ aim: 8, face: 'auto' }, f.o || {})); } finally { window.LAYERS.length = 0; window.LAYERS.push(...asil); }
    const r = { im: c.getImageData(0, 0, W, H), don: iz.don, imza: iz.imza.join(',') }; iz = null; return r; };
  const kur = async o => { TR.style(o.sac && o.sac !== 'orig' ? o.sac : null, o.goz && o.goz !== 'orig' ? o.goz : null); TR.colour(o.sacRenk || 'orig', o.gozRenk || 'orig'); await new Promise(r => setTimeout(r, 60)); };
  const carp = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
  const ters = m => { const k = m[0] * m[3] - m[1] * m[2]; return [m[3] / k, -m[1] / k, -m[2] / k, m[0] / k, (m[2] * m[5] - m[3] * m[4]) / k, (m[1] * m[4] - m[0] * m[5]) / k]; };
  const B = window.__B = { list, BAS, kutu: null, plan: {},
    /* görünen her şeyin kutusu (ortak kutuyu bulmak için) ve bekleme karesinde başın tepesi */
    async sinir(o) { await kur(o); let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const f of list) { const d = grab(f, 'tam').im.data; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      const d = grab(list[0], 'tam').im.data; let top = H; for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { top = y; break; }
      return { x0, y0, x1, y1, top, gx: window.__cam.x, gy: window.__cam.gy }; },
    /* bir baş parçasının planı: hücreler (resimleri değişen kareler), her karenin hücresi ve o hücrenin duruşuna göre dönüşümü (tuval ölçüsünde).
       ref verilirse (ilk setin hücre duruşları) dönüşümler ona göre ölçülür; hücre eşlemesi ilk setle aynı olmalıdır. */
    async planla(o, katman, ref) { await kur(o); const K = list.map(f => grab(f, katman)); if (K.some(q => !q.don)) return null;
      const imzalar = [], hucre = K.map(q => { let i = imzalar.indexOf(q.imza); if (i < 0) { i = imzalar.length; imzalar.push(q.imza); } return i; }), kare = imzalar.map((_, i) => hucre.indexOf(i)), durus = ref || kare.map(fi => K[fi].don);
      if (durus.length !== kare.length) return null; return { hucre, kare, durus, don: K.map((q, fi) => carp(q.don, ters(durus[hucre[fi]]))) }; },
    async cek(o, katman, kalite) { await kur(o); const K = B.kutu, P = BAS.includes(katman) ? B.plan[katman] : null; if (BAS.includes(katman) && !P) return null;
      const kareler = P ? P.kare.map(i => list[i]) : list, cols = P ? kareler.length : K.cols, c2 = document.createElement('canvas'); c2.width = cols * K.cw; c2.height = (P ? 1 : K.rows) * K.ch; const ax = c2.getContext('2d'); ax.imageSmoothingQuality = 'high';
      const g = document.createElement('canvas'); g.width = W; g.height = H; const gx = g.getContext('2d'), muzzle = {}; let dolu = 0;
      kareler.forEach((f, i) => { const im = grab(f, katman).im, d = im.data; if (!dolu) for (let j = 3; j < d.length; j += 4) if (d[j] > 8) { dolu = 1; break; }
        gx.putImageData(im, 0, 0); ax.drawImage(g, K.x0, K.y0, K.x1 - K.x0, K.y1 - K.y0, (i % cols) * K.cw, Math.floor(i / cols) * K.ch, K.cw, K.ch);
        if (f.aim !== undefined && window.__cam.muzzle) muzzle[f.aim] = [+((window.__cam.muzzle[0] - K.gx) * K.sc).toFixed(1), +((K.gy - window.__cam.muzzle[1]) * K.sc).toFixed(1)]; });
      return dolu ? { url: c2.toDataURL('image/webp', kalite || 0.9), muzzle } : null; },
    /* öz denetim: oyundaki yolla (gövde kare kare, baş parçaları hücre + dönüşüm) kurulan resim tam çizimle aynı mı */
    async kiyas(o, don) { await kur(o); const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'), g = document.createElement('canvas'); g.width = W; g.height = H; const gx = g.getContext('2d'); let enCok = 0;
      for (const fi of [0, 1, 2, 5, 12, 20, 39, 40, 41, 55, 67, 68, 69]) { const f = list[fi], tam = grab(f, 'tam').im.data; tx.clearRect(0, 0, W, H);
        for (const k of SIRA) { const P = B.plan[k]; if (BAS.includes(k) && (!P || !don[k])) continue; gx.putImageData(grab(P ? list[P.kare[P.hucre[fi]]] : f, k).im, 0, 0); tx.save(); if (P) tx.setTransform(...don[k][fi]); tx.drawImage(g, 0, 0); tx.restore(); }
        const d = tx.getImageData(0, 0, W, H).data; let fark = 0, dolu = 0; for (let j = 0; j < d.length; j += 4) { if (tam[j + 3] > 8 || d[j + 3] > 8) { dolu++; if (Math.abs(tam[j] - d[j]) + Math.abs(tam[j + 1] - d[j + 1]) + Math.abs(tam[j + 2] - d[j + 2]) + Math.abs(tam[j + 3] - d[j + 3]) > 150) fark++; } } enCok = Math.max(enCok, fark / Math.max(1, dolu)); }
      return enCok; } }; });
// ---- ortak kutu: iki set ve bütün saç stilleri
{ let K = null, temel = null;
  for (const set of SETS) { await setSec(set); for (const s of ['orig', ...sec.sac]) { const r = await p.evaluate(o => window.__B.sinir(o), { sac: s }); if (set === SETS[0] && s === 'orig') temel = r;
      K = K ? { x0: Math.min(K.x0, r.x0), y0: Math.min(K.y0, r.y0), x1: Math.max(K.x1, r.x1), y1: Math.max(K.y1, r.y1) } : { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 }; } }
  const kareler = await p.evaluate(() => Object.fromEntries(window.__B.list.map((f, i) => [f.key, i]))), n = Object.keys(kareler).length;
  const x0 = Math.max(0, K.x0 - 6), y0 = Math.max(0, K.y0 - 6), x1 = K.x1 + 8, y1 = K.y1 + 8, sc = TALL / (temel.gy - temel.top), cols = 10;
  meta.kutu = { x0, y0, x1, y1, gx: temel.gx, gy: temel.gy, sc, cw: Math.ceil((x1 - x0) * sc), ch: Math.ceil((y1 - y0) * sc), cols, rows: Math.ceil(n / cols), ax: +((temel.gx - x0) * sc).toFixed(1), ay: +((temel.gy - y0) * sc).toFixed(1), tall: TALL, frames: kareler, hucre: {} }; }
await p.evaluate(K => { window.__B.kutu = K; }, meta.kutu);
// ---- baş parçalarının planı (set başına dönüşüm; hücreler ilk setin duruşunda). Özgün saçta çizilmeyen katman için ilk stil denenir.
const BAS = ['yuz', 'kulak', 'sacOn', 'sacOrta', 'sacArka'], planlar = {}, hamDon = {};
for (const set of SETS) { await setSec(set); const don = {}, ham = {};
  for (const k of BAS) { const ilk = planlar[k]; let P = null; for (const o of [{}, ...sec.sac.map(s => ({ sac: s }))]) { P = await p.evaluate(({ o, k, ref }) => window.__B.planla(o, k, ref), { o, k, ref: ilk ? ilk.durus : null }); if (P) break; }
    if (!P) continue; if (!ilk) { planlar[k] = P; meta.kutu.hucre[k] = P.hucre; } else if (JSON.stringify(ilk.hucre) !== JSON.stringify(P.hucre)) throw new Error(k + ': ' + set + ' setinde hücre eşlemesi ilk setten farklı');
    const K = meta.kutu; ham[k] = P.don; don[k] = P.don.map(m => [m[0], m[1], m[2], m[3], (m[0] * K.x0 + m[2] * K.y0 + m[4] - K.x0) * K.sc, (m[1] * K.x0 + m[3] * K.y0 + m[5] - K.y0) * K.sc].map(v => +v.toFixed(4))); }
  meta.set[set] = { muzzle: null, don }; hamDon[set] = ham; }
await p.evaluate(P => { window.__B.plan = P; }, Object.fromEntries(Object.entries(planlar).map(([k, P]) => [k, { hucre: P.hucre, kare: P.kare }])));
console.log('kutu', meta.kutu.cw + '×' + meta.kutu.ch, '· hücre sayıları', JSON.stringify(Object.fromEntries(Object.entries(planlar).map(([k, P]) => [k, P.kare.length]))));
const cek = async (ad, o, katman) => { const res = await p.evaluate(({ o, katman }) => window.__B.cek(o, katman), { o, katman }); if (!res) { delete meta.var[ad]; return null; }
  const buf = Buffer.from(res.url.split(',')[1], 'base64'); fs.writeFileSync(path.join(out, ad + '.webp'), buf); meta.var[ad] = 1; yaz(); console.log(ad, (buf.length / 1024 | 0) + ' KB'); return res; };
const SAC = process.env.SAC ? process.env.SAC.split(',') : ['orig', ...sec.sac], RENK = process.env.RENK ? process.env.RENK.split(',') : sec.sacRenk, GOZ = ['orig', ...sec.goz], ILK = sec.sac[0];
// ---- gövde (set başına üç sayfa) ve öz denetim
for (const set of SETS) { await setSec(set); let muzzle = null; for (const k of [1, 2, 3]) { const r = await cek('govde_' + set + '_' + k, {}, 'govde' + k); if (r && Object.keys(r.muzzle).length) muzzle = r.muzzle; }
  meta.set[set].muzzle = muzzle; const fark = await p.evaluate(d => window.__B.kiyas({}, d), hamDon[set]), fark2 = await p.evaluate(({ o, d }) => window.__B.kiyas(o, d), { o: { sac: ILK, sacRenk: 'blue', goz: sec.goz[0], gozRenk: 'green' }, d: hamDon[set] });
  console.log('öz denetim ' + set + ': katmanlı çizim ile tam çizim farkı  özgün %' + (fark * 100).toFixed(2) + ' · stilli %' + (fark2 * 100).toFixed(2)); if (fark > 0.02 || fark2 > 0.02) errors.push('katmanlı çizim tam çizimden ayrışıyor: ' + set); yaz(); }
// baş parçaları ilk setin duruşunda çekilir
await setSec(SETS[0]);
// ---- a şablonu (özgün saç): hiçbir stil kullanılmadan önce
for (const g of GOZ) for (const r of sec.gozRenk) await cek('yuz_' + g + '_' + r + '_a', { goz: g, gozRenk: r }, 'yuz'); await cek('kulak_a', {}, 'kulak');
const sacCek = async (s, r) => { const o = { sac: s, sacRenk: r }; await cek('sac_' + s + '_' + r + '_o', o, 'sacOn'); await cek('sac_' + s + '_' + r + '_m', o, 'sacOrta'); await cek('sac_' + s + '_' + r + '_a', o, 'sacArka'); };
if (SAC.includes('orig')) for (const r of RENK) await sacCek('orig', r);
// ---- b şablonu (stil saçı)
for (const g of GOZ) for (const r of sec.gozRenk) await cek('yuz_' + g + '_' + r + '_b', { sac: ILK, goz: g, gozRenk: r }, 'yuz'); await cek('kulak_b', { sac: ILK }, 'kulak');
for (const s of SAC) { if (s === 'orig') continue; for (const r of RENK) await sacCek(s, r); }
await b.close(); srv.close(); yaz();
const toplam = fs.readdirSync(out).reduce((t, f) => t + fs.statSync(path.join(out, f)).size, 0); console.log(fs.readdirSync(out).length + ' dosya, ' + (toplam / 1048576).toFixed(1) + ' MB');
if (errors.length) { console.error('hatalar:', errors.slice(0, 5)); process.exit(1); }
