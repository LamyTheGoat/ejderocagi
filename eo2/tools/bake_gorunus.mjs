// 2026-11-22 · KAT SİSTEMİ: meydandaki karakter artık assets/kat/ (katalog.js + js/kat.js) ile kurulur; buradaki saç/yüz/kulak sayfaları
// yalnız eski yol (localStorage eo2.kat = '0') ve Kat vitrinindeki karşılaştırma içindir. Yeni saç ya da göz BURADAN DEĞİL, katalogdan eklenir.
// govde_<set>.webp hâlâ kullanılır (Kat'ın gövde katmanı).
// EO2 · karakter görünüşü katmanlarını pişirir (2026-11-17, kullanıcı: "karakterimin saçını rengini vs ayarlayamıyorum"; chibi tarafına izin verildi).
// Kaynak: prototype/chibi_rig/gate7/social.html (salt okunur; chibi katman sisteminin kendi çizicisi, saç stilleri, renk rampaları ve göz
// renkleri aynen kullanılır). Yöntem: çizicinin katman sırası tablosu (CHIBI_ORDER) çekim sırasında süzülür; böylece gövde, yüz, saç ve
// kulak AYRI AYRI çizdirilir. Oyunda oyuncu bu katmanların üst üste çizilmesiyle kurulur (js/gorunum.js):
//   sac_..._a (gövdenin arkasında kalan saç) → govde_<set> → yuz_<goz>_<renk>_<sablon> → sac_..._o (öndeki saç) → kulak_<sablon>
// Renkler çizicinin kendi boyamasıyla pişirilir: oyunda piksel işlemi yok.
//   govde_<set>.webp                 setin başsız gövdesi (5 set)
//   yuz_<goz>_<gozRenk>_<a|b>.webp   baş + yüz: göz biçimi × göz rengi × kafa şablonu (a: özgün saç, b: stil saçı)
//   kulak_<a|b>.webp                 saçın üstünde duran kulak
//   sac_<stil>_<renk>_<a|o>.webp     saç: arkada kalan ve önde duran kısım (arka kısmı olmayan stilde _a yok)
// Çıktı ayrıca: eo2/assets/gorunus_atlas.js (kare ölçüleri, seçenek adları).
// Kullanım: node eo2/tools/bake_gorunus.mjs      env: YALNIZ=govde|yuz|sac · SAC=kisa,topuz · RENK=black,blue · SC (ölçek, 0.8)
// Özgün saçlı (a şablonu) işler her zaman önce çekilir: çizici bir kez stil saçı kullandıktan sonra özgün kafaya tam dönmüyor.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..'), require = createRequire(path.join(repo, 'package.json')), { chromium } = require('playwright-core');
const rigRoot = path.join(repo, 'prototype', 'chibi_rig'), out = path.join(repo, 'eo2', 'assets', 'gorunus'), hedef = path.join(repo, 'eo2', 'assets', 'gorunus_atlas.js'); fs.mkdirSync(out, { recursive: true });
const SC = +(process.env.SC || 0.8), YALNIZ = process.env.YALNIZ || '', SETLER = ['bare', 'temel', 'muhafiz', 'avci', 'madenci', 'buyucu', 'senlik'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]), p = path.join(rigRoot, u); if (!path.resolve(p).startsWith(rigRoot)) { s.writeHead(403); s.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ channel: 'msedge', headless: true }), p = await b.newPage({ viewport: { width: 1280, height: 1000 } }), errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/gate7/social.html`); await p.waitForFunction('window.RIG_READY === true', { timeout: 120000 });
let meta = { sc: SC, govde: {}, yuz: {}, kulak: {}, sac: {}, ad: {} };
if (fs.existsSync(hedef)) { const w = {}; new Function('window', fs.readFileSync(hedef, 'utf8'))(w); if (w.EO2_GORUNUS && w.EO2_GORUNUS.govde) meta = Object.assign(meta, w.EO2_GORUNUS); }
const sec = await p.evaluate(() => ({ sac: window.STYLES.hairNames, goz: window.STYLES.eyeNames, sacRenk: window.PALETTE.HAIR.map(q => [q[0], q[1]]), gozRenk: window.PALETTE.EYE.map(q => [q[0], q[1]]) }));
meta.ad = { sac: Object.assign({ orig: 'Özgün' }, sec.sac), goz: Object.assign({ orig: 'Özgün' }, sec.goz), sacRenk: Object.fromEntries(sec.sacRenk), gozRenk: Object.fromEntries(sec.gozRenk) };
const yaz = () => fs.writeFileSync(hedef, '// tools/bake_gorunus.mjs üretir; elle düzenleme. govde, yuz, kulak, sac: katman atlaslarının kare ölçüleri · ad: seçenek adları\nwindow.EO2_GORUNUS = ' + JSON.stringify(meta) + ';\n');
await p.evaluate(({ SC }) => { const S = window.SOC, O = window.CHIBI_ORDER, view = document.getElementById('view'), W = view.width, H = view.height, GX = 600, GY = 640, N = 16, cyc = 1 / 1.3, list = [];
  for (const dir of ['down', 'up', 'right']) { for (let i = 0; i < N; i++) list.push({ dir, moving: true, t: i * cyc / N, face: 'neutral', key: dir + '_walk_' + i }); list.push({ dir, moving: false, t: 0, face: 'neutral', key: dir + '_idle' }); if (dir !== 'up') list.push({ dir, moving: false, t: 0, face: 'happy', key: dir + '_happy' }); }
  const GORUNUM = { down: 'front', up: 'back', right: 'side' }, asil = { front: O.front.slice(), back: O.back.slice(), side: O.side.slice() };
  const SAC = ['fringeUnder', 'hairFront', 'fringe', 'hairTop', 'hairOverEar', 'hairBackOver', 'hairTopOver'], YUZ = ['head', 'earPatch', 'face', 'faceAcc', 'earUnderHair'], KULAK = ['ear', 'earTop'], BASLIK = ['hatFront', 'hatBack', 'hatNape', 'beard'];
  /* katman → o görünümde çizilecek yuvalar. Arkadan görünüşte (back) saçın tamamı öndedir; önden ve yandan "hairBack" gövdenin arkasında kalır. */
  const YUVA = { yuz: () => YUZ, kulak: () => KULAK, sacOn: g => g === 'back' ? SAC.concat('hairBack') : SAC, sacArka: g => g === 'back' ? [] : ['hairBack'],
    govde: g => asil[g].filter(k => !SAC.includes(k) && !YUZ.includes(k) && !KULAK.includes(k) && !BASLIK.includes(k) && k !== 'hairBack') };
  const kur = o => { Object.assign(S.st, { bare: true, set: o.set || null, scar: true, bald: false, hat: null, beard: null }); S.style(o.sac && o.sac !== 'orig' ? o.sac : null, o.goz && o.goz !== 'orig' ? o.goz : null); S.colour(o.sacRenk || 'orig', o.gozRenk || 'orig'); };
  const X0 = S.st.x, Y0 = S.st.y; S.film('down', false, [0]); const SY0 = S.st.scrollY;
  const grab = (f, katman) => { const g = GORUNUM[f.dir], sec = new Set(YUVA[katman](g)); O[g].length = 0; O[g].push(...asil[g].filter(k => sec.has(k)));
    S.st.face = f.face; S.st.x = X0; S.st.y = Y0; S.st.scrollY = SY0; S.film(f.dir, f.moving, [f.t]); O[g].length = 0; O[g].push(...asil[g]); return view.getContext('2d').getImageData(0, 0, W, H); };
  window.__B = { async cek(o, katman) { kur(o); await new Promise(r => setTimeout(r, 40)); const kareler = []; let x0 = W, y0 = H, x1 = 0, y1 = 0, dolu = 0;
      for (const f of list) { const im = grab(f, katman), d = im.data; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 8) { dolu++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } kareler.push(im); }
      if (!dolu) return null; x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(W, x1 + 6); y1 = Math.min(H, y1 + 6);
      const cw = Math.ceil((x1 - x0) * SC), ch = Math.ceil((y1 - y0) * SC), cols = 9, rows = Math.ceil(list.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch; const ax = c.getContext('2d'); ax.imageSmoothingQuality = 'high';
      const g = document.createElement('canvas'); g.width = W; g.height = H; const gx = g.getContext('2d'), frames = {};
      kareler.forEach((im, i) => { gx.putImageData(im, 0, 0); ax.drawImage(g, x0, y0, x1 - x0, y1 - y0, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch); frames[list[i].key] = i; });
      return { url: c.toDataURL('image/webp', 0.9), cw, ch, cols, rows, ax: (GX - x0) * SC, ay: (GY - y0) * SC, frames }; } }; }, { SC });
const kaydet = (ad, res) => { const buf = Buffer.from(res.url.split(',')[1], 'base64'); fs.writeFileSync(path.join(out, ad + '.webp'), buf); delete res.url; return (buf.length / 1024 | 0) + ' KB'; };
const cek = async (grup, ad, o, katman) => { const res = await p.evaluate(({ o, katman }) => window.__B.cek(o, katman), { o, katman }); if (!res) { delete meta[grup][ad]; console.log(grup + ' ' + ad + ': boş'); return; } console.log(grup + '_' + ad, kaydet(grup + '_' + ad, res)); meta[grup][ad] = res; yaz(); };
const SAC = process.env.SAC ? process.env.SAC.split(',') : ['orig', ...Object.keys(sec.sac)], RENK = process.env.RENK ? process.env.RENK.split(',') : sec.sacRenk.map(q => q[0]), GOZ = ['orig', ...Object.keys(sec.goz)], ILK = Object.keys(sec.sac)[0];
const is = k => !YALNIZ || YALNIZ === k;
// ---- a şablonu (özgün saç): hiçbir stil kullanılmadan önce
if (is('govde')) for (const set of SETLER) await cek('govde', set, { set: set === 'bare' ? null : set }, 'govde');
if (is('yuz')) { for (const g of GOZ) for (const [r] of sec.gozRenk) await cek('yuz', g + '_' + r + '_a', { goz: g, gozRenk: r }, 'yuz'); await cek('kulak', 'a', {}, 'kulak'); }
if (is('sac') && SAC.includes('orig')) for (const r of RENK) { await cek('sac', 'orig_' + r + '_o', { sacRenk: r }, 'sacOn'); await cek('sac', 'orig_' + r + '_a', { sacRenk: r }, 'sacArka'); }
// ---- b şablonu (stil saçı)
if (is('yuz')) { for (const g of GOZ) for (const [r] of sec.gozRenk) await cek('yuz', g + '_' + r + '_b', { sac: ILK, goz: g, gozRenk: r }, 'yuz'); await cek('kulak', 'b', { sac: ILK }, 'kulak'); }
if (is('sac')) for (const s of SAC) { if (s === 'orig') continue; for (const r of RENK) { await cek('sac', s + '_' + r + '_o', { sac: s, sacRenk: r }, 'sacOn'); await cek('sac', s + '_' + r + '_a', { sac: s, sacRenk: r }, 'sacArka'); } }
await b.close(); srv.close(); yaz();
if (errors.length) { console.error('sayfa hataları:', errors.slice(0, 5)); process.exit(1); }
