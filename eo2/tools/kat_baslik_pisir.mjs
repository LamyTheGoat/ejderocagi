// EO2 · Kat Faz 3: başlıkları çizicinin kendisinden Kat hücrelerine pişirir (2026-11-22).
// Kullanıcı (Mehmet, 2026-11-22): "Layerlar zırhlar setler kostümler iyice karıştı orada reliable bir sistem kurmamız lazım."
// Kaynak: prototype/chibi_rig/gate7/social.html (salt okunur). Başlığın saça ne yaptığı (taç kesimi, kapüşonda yalnız perçem, kulak
// başlığın üstünde ya da kapalı) çizicinin kendi kuralıdır (order.js HAT_CLASS); burada yalnız sonucu katman katman çekilir.
// Her başlık için yön başına iki kare (duruş, yürüyüşün ilk karesi) çekilir:
//   baslikArka  başlığın gövde arkasında kalan kısmı (hatBack)       baslik  başlığın kendisi (hatFront, arkadan ense örtüsü hatNape)
//   sac*        başlık takılıyken saçın görünen kısmı, her stil için (beyaz: gri ana çizim için, özgün: kendi rengi)
//   yama        kapüşon ve örtüde kulağın yerini kapatan ten yaması (earPatch)
// Ham çıktı: KAT_HAM klasörüne (varsayılan eo2/tools/dogrulama/kat_baslik_ham) PNG şeritleri + ham.json. Kat düzenine çeviren: kat_baslik_donustur.py.
// Kullanım (depo kökünden): node eo2/tools/kat_baslik_pisir.mjs     env: RIG (çizici klasörü) · BASLIK=fes,kask1 · KANAL=msedge (yoksa paketli Chromium)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..', '..'), require = createRequire(path.join(repo, 'package.json'));
let pw; try { pw = require('playwright-core'); } catch { pw = require('playwright'); }
const rigRoot = path.resolve(process.env.RIG || path.join(repo, 'prototype', 'chibi_rig')), out = path.resolve(process.env.KAT_HAM || path.join(here, 'dogrulama', 'kat_baslik_ham'));
fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]), p = path.join(rigRoot, u); if (!path.resolve(p).startsWith(rigRoot)) { s.writeHead(403); s.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await pw.chromium.launch(Object.assign({ headless: true }, process.env.KANAL ? { channel: process.env.KANAL } : {})), p = await b.newPage({ viewport: { width: 1280, height: 1000 } }), errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/gate7/social.html`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.RIG_READY === true', { timeout: 300000 });
const bilgi = await p.evaluate(() => ({ sapka: window.STYLES_NPC.hatNames, tur: window.STYLES_NPC.hatKinds, sac: window.STYLES.hairNames }));
// Bölge: sayfada ayak noktası (600, 640) çevresi. Ölçek 0.8 (eski pişirimle aynı); çapa tam piksele düşsün diye bölge 5 px'in katı.
const SC = 0.8, BOLGE = { x0: 400, y0: 90, x1: 800, y1: 640 }, CAPA = { ax: (600 - BOLGE.x0) * SC, ay: (640 - BOLGE.y0) * SC };
const KARE = [['down_durus', 'down', false], ['down_yuru', 'down', true], ['up_durus', 'up', false], ['up_yuru', 'up', true], ['right_durus', 'right', false], ['right_yuru', 'right', true]];
await p.evaluate(({ SC, BOLGE, KARE }) => { const S = window.SOC, O = window.CHIBI_ORDER, view = document.getElementById('view'), W = view.width, H = view.height;
  const GORUNUM = { down: 'front', up: 'back', right: 'side' }, asil = { front: O.front.slice(), back: O.back.slice(), side: O.side.slice() };
  const SAC = ['fringeUnder', 'hairFront', 'fringe', 'hairTop', 'hairOverEar', 'hairBackOver'];
  const YUVA = { baslikArka: () => ['hatBack'], baslik: () => ['hatFront', 'hatNape'], yama: () => ['earPatch'], sacUst: () => ['hairTopOver'],
    sacOn: g => g === 'back' ? SAC.concat('hairBack') : SAC, sacArka: g => g === 'back' ? [] : ['hairBack'], yuz: () => ['head', 'earPatch', 'face', 'faceAcc', 'earUnderHair'] };
  const kur = o => { Object.assign(S.st, { bare: true, set: null, scar: true, bald: false, hat: o.hat || null, beard: null }); S.style(o.sac && o.sac !== 'orig' ? o.sac : null, null); S.colour(o.sacRenk || 'orig', 'orig'); };
  const X0 = S.st.x, Y0 = S.st.y; S.film('down', false, [0]); const SY0 = S.st.scrollY;
  const cw = Math.round((BOLGE.x1 - BOLGE.x0) * SC), ch = Math.round((BOLGE.y1 - BOLGE.y0) * SC), g = document.createElement('canvas'); g.width = W; g.height = H; const gx = g.getContext('2d');
  window.__B = { async cek(o, katman) { kur(o); await new Promise(r => setTimeout(r, 30)); const c = document.createElement('canvas'); c.width = cw * KARE.length; c.height = ch; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; let dolu = false;
    KARE.forEach(([ad, dir, moving], i) => { const v = GORUNUM[dir], sec = new Set(YUVA[katman](v)); O[v].length = 0; O[v].push(...asil[v].filter(k => sec.has(k)));
      S.st.face = 'neutral'; S.st.x = X0; S.st.y = Y0; S.st.scrollY = SY0; S.film(dir, moving, [0]); O[v].length = 0; O[v].push(...asil[v]);
      const im = view.getContext('2d').getImageData(0, 0, W, H); for (let k = 3; k < im.data.length; k += 16) if (im.data[k] > 8) { dolu = true; break; }
      gx.putImageData(im, 0, 0); x.drawImage(g, BOLGE.x0, BOLGE.y0, BOLGE.x1 - BOLGE.x0, BOLGE.y1 - BOLGE.y0, i * cw, 0, cw, ch); });
    return dolu ? c.toDataURL('image/png') : null; } }; }, { SC, BOLGE, KARE });
const ham = { tarih: '2026-11-22', sc: SC, bolge: BOLGE, capa: CAPA, hucre: KARE.map(k => k[0]), sapka: bilgi.sapka, tur: bilgi.tur, dosya: {} };
const cek = async (ad, o, katman) => { const url = await p.evaluate(({ o, katman }) => window.__B.cek(o, katman), { o, katman }); if (!url) return; fs.writeFileSync(path.join(out, ad + '.png'), Buffer.from(url.split(',')[1], 'base64')); ham.dosya[ad] = 1; };
const SAPKA = process.env.BASLIK ? process.env.BASLIK.split(',') : Object.keys(bilgi.sapka), STIL = ['orig', ...Object.keys(bilgi.sac)];
// Ayar: başlıksız yüz ve saç (Kat'taki eski kaynaklı dosyalarla hizayı ölçmek için)
await cek('ayar_yuz', {}, 'yuz'); await cek('ayar_sac_orig_white_on', { sacRenk: 'white' }, 'sacOn');
// Özgün saç (stilsiz) her zaman önce: çizici bir kez stil saçı kullandıktan sonra özgün kafaya tam dönmüyor (bake_gorunus.mjs).
for (const st of STIL) for (const h of SAPKA) {
  if (st === 'orig') { await cek(`b_${h}_arka`, { hat: h }, 'baslikArka'); await cek(`b_${h}_on`, { hat: h }, 'baslik'); await cek(`b_${h}_yama`, { hat: h }, 'yama'); }
  for (const r of ['white', 'orig']) for (const k of ['sacArka', 'sacOn', 'sacUst']) await cek(`s_${h}_${st}_${r}_${k}`, { hat: h, sac: st, sacRenk: r }, k);
  console.log(st, h, Object.keys(ham.dosya).length);
}
await cek('ayar_sac_kisa_white_on', { sac: 'kisa', sacRenk: 'white' }, 'sacOn');
fs.writeFileSync(path.join(out, 'ham.json'), JSON.stringify(ham, null, 1));
await b.close(); srv.close();
if (errors.length) { console.error('sayfa hataları:', errors.slice(0, 5)); process.exit(1); }
